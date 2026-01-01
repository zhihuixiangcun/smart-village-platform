const Redis = require('redis');
const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

/**
 * 服务发现与负载均衡
 * 提供服务注册、发现、健康检查和负载均衡功能
 */
class ServiceDiscovery extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = {
      serviceName: options.serviceName || 'unknown-service',
      serviceId: options.serviceId || `${options.serviceName || 'service'}-${uuidv4()}`,
      redis: {
        host: options.redisHost || 'localhost',
        port: options.redisPort || 6379,
        db: options.redisDb || 0
      },
      healthCheck: {
        interval: options.healthCheckInterval || 30000, // 30秒
        timeout: options.healthCheckTimeout || 5000,   // 5秒
        retries: options.healthCheckRetries || 3
      },
      loadBalancing: {
        strategy: options.loadBalancingStrategy || 'round-robin', // round-robin, least-connections, random, weighted
        healthCheckTimeout: options.lbHealthCheckTimeout || 3000
      },
      serviceTTL: options.serviceTTL || 60000, // 1分钟
      ...options
    };

    this.redis = null;
    this.serviceRegistry = new Map();
    this.loadBalancers = new Map();
    this.healthCheckers = new Map();
    this.serviceStats = new Map();
    this.isRunning = false;

    this.setupLogger();
  }

  /**
   * 设置日志记录器
   */
  setupLogger() {
    this.logger = winston.createLogger({
      level: this.config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: this.config.serviceName },
      transports: [
        new winston.transports.File({
          filename: `logs/${this.config.serviceName}-discovery.log`
        }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  /**
   * 初始化服务发现
   */
  async initialize() {
    try {
      await this.connectRedis();
      await this.startHealthChecking();
      await this.startServiceCleanup();

      this.isRunning = true;
      this.logger.info('Service discovery initialized');
      this.emit('initialized');

    } catch (error) {
      this.logger.error('Failed to initialize service discovery', error);
      throw error;
    }
  }

  /**
   * 连接Redis
   */
  async connectRedis() {
    this.redis = Redis.createClient({
      host: this.config.redis.host,
      port: this.config.redis.port,
      db: this.config.redis.db
    });

    await new Promise((resolve, reject) => {
      this.redis.on('connect', resolve);
      this.redis.on('error', reject);
    });

    this.logger.info('Redis connected for service discovery');
  }

  /**
   * 注册服务
   */
  async registerService(serviceInfo) {
    try {
      const service = {
        id: serviceInfo.id || uuidv4(),
        name: serviceInfo.name,
        host: serviceInfo.host,
        port: serviceInfo.port,
        protocol: serviceInfo.protocol || 'http',
        version: serviceInfo.version || '1.0.0',
        weight: serviceInfo.weight || 1,
        capabilities: serviceInfo.capabilities || [],
        metadata: serviceInfo.metadata || {},
        registeredAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        status: 'healthy',
        stats: {
          requests: 0,
          connections: 0,
          errors: 0,
          avgResponseTime: 0
        }
      };

      // 存储到Redis
      await this.redis.hset(
        'services',
        service.id,
        JSON.stringify(service)
      );

      // 设置过期时间
      await this.redis.expire('services', Math.ceil(this.config.serviceTTL / 1000));

      // 缓存到本地
      this.serviceRegistry.set(service.id, service);

      // 初始化负载均衡器
      this.initializeLoadBalancer(service.name);

      this.logger.info(`Service registered: ${service.name} (${service.id})`);
      this.emit('service-registered', service);

      return service;

    } catch (error) {
      this.logger.error('Failed to register service', error);
      throw error;
    }
  }

  /**
   * 注销服务
   */
  async unregisterService(serviceId) {
    try {
      const service = this.serviceRegistry.get(serviceId);
      if (!service) {
        return false;
      }

      // 从Redis删除
      await this.redis.hdel('services', serviceId);

      // 从本地删除
      this.serviceRegistry.delete(serviceId);

      // 清理负载均衡器
      this.cleanupLoadBalancer(service.name);

      this.logger.info(`Service unregistered: ${service.name} (${serviceId})`);
      this.emit('service-unregistered', { id: serviceId, name: service.name });

      return true;

    } catch (error) {
      this.logger.error('Failed to unregister service', error);
      return false;
    }
  }

  /**
   * 发送心跳
   */
  async sendHeartbeat(serviceId, status = 'healthy') {
    try {
      const serviceStr = await this.redis.hget('services', serviceId);
      if (!serviceStr) {
        return false;
      }

      const service = JSON.parse(serviceStr);
      service.lastHeartbeat = new Date().toISOString();
      service.status = status;

      // 更新Redis
      await this.redis.hset('services', serviceId, JSON.stringify(service));
      await this.redis.expire('services', Math.ceil(this.config.serviceTTL / 1000));

      // 更新本地缓存
      this.serviceRegistry.set(serviceId, service);

      return true;

    } catch (error) {
      this.logger.error('Failed to send heartbeat', error);
      return false;
    }
  }

  /**
   * 发现服务
   */
  async discoverServices(serviceName, healthyOnly = true) {
    try {
      const services = await this.getAllServices();
      let filteredServices = services.filter(s => s.name === serviceName);

      if (healthyOnly) {
        filteredServices = filteredServices.filter(s => s.status === 'healthy');
      }

      return filteredServices;

    } catch (error) {
      this.logger.error('Failed to discover services', error);
      return [];
    }
  }

  /**
   * 获取单个服务实例（负载均衡）
   */
  async getServiceInstance(serviceName, strategy = null) {
    try {
      const loadBalancingStrategy = strategy || this.config.loadBalancing.strategy;
      const services = await this.discoverServices(serviceName, true);

      if (services.length === 0) {
        return null;
      }

      const instance = this.selectServiceInstance(services, loadBalancingStrategy);

      // 更新统计信息
      this.updateServiceStats(instance.id, 'requests', 1);

      return instance;

    } catch (error) {
      this.logger.error('Failed to get service instance', error);
      return null;
    }
  }

  /**
   * 选择服务实例（负载均衡）
   */
  selectServiceInstance(services, strategy) {
    switch (strategy) {
      case 'round-robin':
        return this.roundRobinSelect(services);
      case 'least-connections':
        return this.leastConnectionsSelect(services);
      case 'random':
        return this.randomSelect(services);
      case 'weighted':
        return this.weightedSelect(services);
      default:
        return this.roundRobinSelect(services);
    }
  }

  /**
   * 轮询选择
   */
  roundRobinSelect(services) {
    const serviceName = services[0].name;

    if (!this.loadBalancers.has(serviceName)) {
      this.initializeLoadBalancer(serviceName);
    }

    const lb = this.loadBalancers.get(serviceName);
    const index = lb.roundRobinIndex++ % services.length;

    return services[index];
  }

  /**
   * 最少连接选择
   */
  leastConnectionsSelect(services) {
    return services.reduce((min, service) => {
      return service.stats.connections < min.stats.connections ? service : min;
    });
  }

  /**
   * 随机选择
   */
  randomSelect(services) {
    const index = Math.floor(Math.random() * services.length);
    return services[index];
  }

  /**
   * 加权选择
   */
  weightedSelect(services) {
    const totalWeight = services.reduce((sum, service) => sum + (service.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const service of services) {
      random -= service.weight || 1;
      if (random <= 0) {
        return service;
      }
    }

    return services[0];
  }

  /**
   * 初始化负载均衡器
   */
  initializeLoadBalancer(serviceName) {
    if (!this.loadBalancers.has(serviceName)) {
      this.loadBalancers.set(serviceName, {
        roundRobinIndex: 0,
        stats: {
          totalRequests: 0,
          activeConnections: 0,
          totalErrors: 0
        }
      });
    }
  }

  /**
   * 清理负载均衡器
   */
  cleanupLoadBalancer(serviceName) {
    this.loadBalancers.delete(serviceName);
  }

  /**
   * 更新服务统计
   */
  async updateServiceStats(serviceId, metric, value) {
    try {
      const serviceStr = await this.redis.hget('services', serviceId);
      if (!serviceStr) {
        return;
      }

      const service = JSON.parse(serviceStr);

      switch (metric) {
        case 'requests':
          service.stats.requests += value;
          break;
        case 'connections':
          service.stats.connections += value;
          break;
        case 'errors':
          service.stats.errors += value;
          break;
        case 'responseTime':
          const total = service.stats.avgResponseTime * (service.stats.requests - 1) + value;
          service.stats.avgResponseTime = total / service.stats.requests;
          break;
      }

      await this.redis.hset('services', serviceId, JSON.stringify(service));
      this.serviceRegistry.set(serviceId, service);

    } catch (error) {
      this.logger.error('Failed to update service stats', error);
    }
  }

  /**
   * 开始健康检查
   */
  async startHealthChecking() {
    if (this.isRunning) {
      return;
    }

    setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        this.logger.error('Health check failed', error);
      }
    }, this.config.healthCheck.interval);

    this.logger.info('Health checking started');
  }

  /**
   * 执行健康检查
   */
  async performHealthChecks() {
    const services = await this.getAllServices();
    const healthCheckPromises = services.map(service =>
      this.checkServiceHealth(service)
    );

    await Promise.allSettled(healthCheckPromises);
  }

  /**
   * 检查单个服务健康状态
   */
  async checkServiceHealth(service) {
    try {
      const healthUrl = `${service.protocol}://${service.host}:${service.port}/health`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.healthCheck.timeout);

      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Service-Discovery-Health-Check'
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        if (service.status !== 'healthy') {
          await this.sendHeartbeat(service.id, 'healthy');
          this.logger.info(`Service recovered: ${service.name} (${service.id})`);
          this.emit('service-recovered', service);
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }

    } catch (error) {
      if (service.status === 'healthy') {
        await this.sendHeartbeat(service.id, 'unhealthy');
        this.logger.warn(`Service unhealthy: ${service.name} (${service.id}) - ${error.message}`);
        this.emit('service-unhealthy', service);
      }
    }
  }

  /**
   * 开始服务清理
   */
  async startServiceCleanup() {
    setInterval(async () => {
      try {
        await this.cleanupExpiredServices();
      } catch (error) {
        this.logger.error('Service cleanup failed', error);
      }
    }, this.config.serviceTTL);

    this.logger.info('Service cleanup started');
  }

  /**
   * 清理过期服务
   */
  async cleanupExpiredServices() {
    const services = await this.getAllServices();
    const now = Date.now();
    const expiredThreshold = this.config.serviceTTL;

    for (const service of services) {
      const lastHeartbeat = new Date(service.lastHeartbeat).getTime();
      const timeSinceHeartbeat = now - lastHeartbeat;

      if (timeSinceHeartbeat > expiredThreshold) {
        await this.unregisterService(service.id);
        this.logger.info(`Service expired: ${service.name} (${service.id})`);
        this.emit('service-expired', service);
      }
    }
  }

  /**
   * 获取所有服务
   */
  async getAllServices() {
    try {
      const services = await this.redis.hgetall('services');
      const result = [];

      for (const [id, info] of Object.entries(services)) {
        try {
          result.push(JSON.parse(info));
        } catch (error) {
          this.logger.warn(`Invalid service info for ${id}`, error);
        }
      }

      return result;

    } catch (error) {
      this.logger.error('Failed to get all services', error);
      return [];
    }
  }

  /**
   * 获取服务统计信息
   */
  async getServiceStats(serviceId) {
    const service = this.serviceRegistry.get(serviceId);
    return service ? service.stats : null;
  }

  /**
   * 获取负载均衡器统计
   */
  getLoadBalancerStats(serviceName) {
    const lb = this.loadBalancers.get(serviceName);
    return lb ? lb.stats : null;
  }

  /**
   * 重置服务统计
   */
  async resetServiceStats(serviceId) {
    try {
      const serviceStr = await this.redis.hget('services', serviceId);
      if (!serviceStr) {
        return;
      }

      const service = JSON.parse(serviceStr);
      service.stats = {
        requests: 0,
        connections: 0,
        errors: 0,
        avgResponseTime: 0
      };

      await this.redis.hset('services', serviceId, JSON.stringify(service));
      this.serviceRegistry.set(serviceId, service);

    } catch (error) {
      this.logger.error('Failed to reset service stats', error);
    }
  }

  /**
   * 获取服务拓扑
   */
  async getServiceTopology() {
    const services = await this.getAllServices();
    const topology = {
      nodes: [],
      edges: []
    };

    // 添加节点
    services.forEach(service => {
      topology.nodes.push({
        id: service.id,
        name: service.name,
        host: service.host,
        port: service.port,
        status: service.status,
        version: service.version,
        capabilities: service.capabilities
      });
    });

    // TODO: 添加服务间依赖关系（edges）

    return topology;
  }

  /**
   * 停止服务发现
   */
  async shutdown() {
    this.isRunning = false;

    if (this.redis) {
      await this.redis.quit();
    }

    this.logger.info('Service discovery shut down');
    this.emit('shutdown');
  }
}

module.exports = ServiceDiscovery;

// 使用示例
if (require.main === module) {
  const discovery = new ServiceDiscovery({
    serviceName: process.env.SERVICE_NAME || 'example-service',
    redisHost: process.env.REDIS_HOST || 'localhost',
    redisPort: process.env.REDIS_PORT || 6379
  });

  // 启动服务发现
  discovery.initialize().then(() => {
    console.log('Service discovery started');

    // 注册服务示例
    discovery.registerService({
      name: 'user-service',
      host: 'localhost',
      port: 3001,
      version: '1.0.0',
      capabilities: ['user-management', 'authentication']
    });

  }).catch(console.error);

  // 优雅关闭
  process.on('SIGINT', async () => {
    console.log('Shutting down service discovery...');
    await discovery.shutdown();
    process.exit(0);
  });
}