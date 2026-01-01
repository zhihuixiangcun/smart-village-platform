const express = require('express');
const httpProxy = require('http-proxy-middleware');
const { createProxyMiddleware } = require('http-proxy-middleware');
const CircuitBreaker = require('opossum');
const Redis = require('redis');
const { EventEmitter } = require('events');
const winston = require('winston');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

/**
 * 智慧乡村 API 网关
 * 提供统一入口、路由、负载均衡、熔断器、限流等功能
 */
class SmartVillageAPIGateway extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = {
      port: options.port || 8080,
      redis: {
        host: options.redisHost || 'localhost',
        port: options.redisPort || 6379,
        db: options.redisDb || 0
      },
      services: options.services || {},
      rateLimit: {
        windowMs: options.rateLimitWindowMs || 15 * 60 * 1000, // 15分钟
        max: options.rateLimitMax || 1000 // 限制每个IP 1000次请求
      },
      circuitBreaker: {
        timeout: options.circuitTimeout || 5000, // 5秒超时
        errorThresholdPercentage: options.circuitErrorThreshold || 50,
        resetTimeout: options.circuitResetTimeout || 10000 // 10秒重置
      },
      ...options
    };

    this.app = express();
    this.redis = null;
    this.circuitBreakers = new Map();
    this.serviceRegistry = new Map();
    this.requestMetrics = new Map();

    this.setupLogger();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupCircuitBreakers();
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
      transports: [
        new winston.transports.File({ filename: 'logs/gateway-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/gateway.log' }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  /**
   * 设置中间件
   */
  setupMiddleware() {
    // 安全中间件
    this.app.use(helmet());

    // CORS配置
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', this.config.corsOrigin || '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // 请求解析
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 请求ID
    this.app.use((req, res, next) => {
      req.requestId = req.headers['x-request-id'] || this.generateRequestId();
      res.setHeader('X-Request-ID', req.requestId);
      next();
    });

    // 请求日志
    this.app.use((req, res, next) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - start;
        this.logRequest(req, res, duration);
      });

      next();
    });

    // 限流
    const limiter = rateLimit({
      windowMs: this.config.rateLimit.windowMs,
      max: this.config.rateLimit.max,
      message: {
        error: 'Too many requests',
        retryAfter: Math.ceil(this.config.rateLimit.windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    this.app.use(limiter);
  }

  /**
   * 设置路由
   */
  setupRoutes() {
    // 健康检查
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: this.getServiceStatus(),
        metrics: this.getGatewayMetrics()
      });
    });

    // 服务发现端点
    this.app.get('/gateway/services', (req, res) => {
      res.json({
        services: Array.from(this.serviceRegistry.entries()),
        timestamp: new Date().toISOString()
      });
    });

    // 动态路由
    this.app.use('/api/v1/users', this.createServiceProxy('user-service'));
    this.app.use('/api/v1/residents', this.createServiceProxy('resident-service'));
    this.app.use('/api/v1/affairs', this.createServiceProxy('affairs-service'));
    this.app.use('/api/v1/finance', this.createServiceProxy('finance-service'));
    this.app.use('/api/v1/notifications', this.createServiceProxy('notification-service'));
    this.app.use('/api/v1/files', this.createServiceProxy('file-service'));

    // 监控和AIops端点
    this.app.use('/monitoring', this.createServiceProxy('monitoring-service', 3001));
    this.app.use('/aiops', this.createServiceProxy('aiops-service', 7000));

    // 聚合API - 减少前端请求次数
    this.setupAggregatedRoutes();

    // 404处理
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Service not found',
        path: req.originalUrl,
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });
    });

    // 错误处理
    this.app.use((error, req, res, next) => {
      this.logger.error('Gateway error', {
        error: error.message,
        stack: error.stack,
        requestId: req.requestId,
        path: req.originalUrl
      });

      res.status(error.status || 500).json({
        error: 'Internal server error',
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * 创建服务代理
   */
  createServiceProxy(serviceName, defaultPort) {
    const serviceConfig = this.config.services[serviceName] || { port: defaultPort };

    const proxyOptions = {
      target: `http://${serviceConfig.host || 'localhost'}:${serviceConfig.port}`,
      changeOrigin: true,
      pathRewrite: this.getPathRewrite(serviceName),

      // 错误处理
      onError: (err, req, res) => {
        this.logger.error(`Proxy error for ${serviceName}`, {
          error: err.message,
          requestId: req.requestId
        });

        if (!res.headersSent) {
          res.status(503).json({
            error: 'Service unavailable',
            service: serviceName,
            requestId: req.requestId
          });
        }
      },

      // 超时处理
      proxyTimeout: serviceConfig.timeout || 30000,
      timeout: serviceConfig.timeout || 30000,

      // 请求/响应拦截
      onProxyReq: (proxyReq, req, res) => {
        // 添加服务间认证头
        if (this.config.serviceAuthToken) {
          proxyReq.setHeader('X-Service-Token', this.config.serviceAuthToken);
        }

        // 添加追踪头
        proxyReq.setHeader('X-Request-ID', req.requestId);
        proxyReq.setHeader('X-Forwarded-For', req.ip);
        proxyReq.setHeader('X-Forwarded-Proto', req.protocol);
        proxyReq.setHeader('X-Forwarded-Host', req.get('host'));
      },

      onProxyRes: (proxyRes, req, res) => {
        // 记录响应指标
        this.recordResponseMetrics(serviceName, proxyRes.statusCode, req);
      }
    };

    // 使用熔断器包装代理
    const breaker = this.circuitBreakers.get(serviceName);
    if (breaker) {
      const proxyMiddleware = createProxyMiddleware(proxyOptions);

      return (req, res, next) => {
        breaker.fire(req, res)
          .catch(() => {
            res.status(503).json({
              error: 'Circuit breaker open',
              service: serviceName,
              requestId: req.requestId
            });
          });
      };
    }

    return createProxyMiddleware(proxyOptions);
  }

  /**
   * 设置聚合路由
   */
  setupAggregatedRoutes() {
    // 仪表板数据聚合
    this.app.get('/api/v1/dashboard', async (req, res) => {
      try {
        const userId = req.user?.id || req.headers['x-user-id'];

        // 并行请求多个服务
        const [userInfo, notifications, villageStats] = await Promise.all([
          this.callService('user-service', `/users/${userId}`),
          this.callService('notification-service', '/notifications'),
          this.callService('affairs-service', '/village/stats')
        ]);

        res.json({
          user: userInfo,
          notifications: notifications,
          villageStats: villageStats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.logger.error('Dashboard aggregation error', error);
        res.status(500).json({
          error: 'Failed to aggregate dashboard data',
          requestId: req.requestId
        });
      }
    });

    // 村民档案聚合
    this.app.get('/api/v1/residents/profile/:id', async (req, res) => {
      try {
        const residentId = req.params.id;

        const [basicInfo, familyInfo, healthInfo, financeInfo] = await Promise.all([
          this.callService('resident-service', `/residents/${residentId}`),
          this.callService('resident-service', `/residents/${residentId}/family`),
          this.callService('resident-service', `/residents/${residentId}/health`),
          this.callService('finance-service', `/finance/resident/${residentId}`)
        ]);

        res.json({
          basic: basicInfo,
          family: familyInfo,
          health: healthInfo,
          finance: financeInfo,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.logger.error('Resident profile aggregation error', error);
        res.status(500).json({
          error: 'Failed to aggregate resident profile',
          requestId: req.requestId
        });
      }
    });
  }

  /**
   * 设置熔断器
   */
  setupCircuitBreakers() {
    const serviceNames = Object.keys(this.config.services);

    serviceNames.forEach(serviceName => {
      const breaker = new CircuitBreaker(
        async (options) => {
          // 这里应该是实际的服务调用逻辑
          return Promise.resolve('Service call successful');
        },
        {
          timeout: this.config.circuitBreaker.timeout,
          errorThresholdPercentage: this.config.circuitBreaker.errorThresholdPercentage,
          resetTimeout: this.config.circuitBreaker.resetTimeout
        }
      );

      breaker.on('open', () => {
        this.logger.warn(`Circuit breaker opened for ${serviceName}`);
        this.emit('circuit-breaker-open', { service: serviceName });
      });

      breaker.on('halfOpen', () => {
        this.logger.info(`Circuit breaker half-open for ${serviceName}`);
      });

      breaker.on('close', () => {
        this.logger.info(`Circuit breaker closed for ${serviceName}`);
        this.emit('circuit-breaker-close', { service: serviceName });
      });

      this.circuitBreakers.set(serviceName, breaker);
    });
  }

  /**
   * 调用服务
   */
  async callService(serviceName, path, options = {}) {
    const serviceConfig = this.config.services[serviceName];
    if (!serviceConfig) {
      throw new Error(`Service ${serviceName} not configured`);
    }

    const url = `http://${serviceConfig.host || 'localhost'}:${serviceConfig.port}${path}`;

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': options.requestId || this.generateRequestId(),
          'X-Service-Token': this.config.serviceAuthToken,
          ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      if (!response.ok) {
        throw new Error(`Service call failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`Service call error for ${serviceName}`, error);
      throw error;
    }
  }

  /**
   * 获取路径重写规则
   */
  getPathRewrite(serviceName) {
    const rewrites = {
      'user-service': {
        '^/api/v1/users': ''
      },
      'resident-service': {
        '^/api/v1/residents': ''
      },
      'affairs-service': {
        '^/api/v1/affairs': ''
      },
      'finance-service': {
        '^/api/v1/finance': ''
      },
      'notification-service': {
        '^/api/v1/notifications': ''
      },
      'file-service': {
        '^/api/v1/files': ''
      }
    };

    return rewrites[serviceName] || {};
  }

  /**
   * 记录请求日志
   */
  logRequest(req, res, duration) {
    const logData = {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString()
    };

    this.logger.info('Gateway request', logData);

    // 记录指标
    this.recordRequestMetrics(req, res, duration);
  }

  /**
   * 记录请求指标
   */
  recordRequestMetrics(req, res, duration) {
    const key = `${req.method}:${req.route?.path || req.path}`;

    if (!this.requestMetrics.has(key)) {
      this.requestMetrics.set(key, {
        count: 0,
        totalDuration: 0,
        errors: 0,
        lastReset: Date.now()
      });
    }

    const metrics = this.requestMetrics.get(key);
    metrics.count++;
    metrics.totalDuration += duration;

    if (res.statusCode >= 400) {
      metrics.errors++;
    }
  }

  /**
   * 记录响应指标
   */
  recordResponseMetrics(serviceName, statusCode, req) {
    const key = `service:${serviceName}`;

    if (!this.requestMetrics.has(key)) {
      this.requestMetrics.set(key, {
        requests: 0,
        errors: 0,
        lastReset: Date.now()
      });
    }

    const metrics = this.requestMetrics.get(key);
    metrics.requests++;

    if (statusCode >= 400) {
      metrics.errors++;
    }
  }

  /**
   * 获取服务状态
   */
  getServiceStatus() {
    const status = {};

    this.serviceRegistry.forEach((config, name) => {
      const breaker = this.circuitBreakers.get(name);
      status[name] = {
        url: `${config.host || 'localhost'}:${config.port}`,
        status: breaker ? breaker.stats : { state: 'unknown' },
        lastCheck: new Date().toISOString()
      };
    });

    return status;
  }

  /**
   * 获取网关指标
   */
  getGatewayMetrics() {
    const metrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      requests: {}
    };

    this.requestMetrics.forEach((value, key) => {
      metrics.requests[key] = {
        ...value,
        avgDuration: value.count > 0 ? value.totalDuration / value.count : 0,
        errorRate: value.count > 0 ? (value.errors / value.count) * 100 : 0
      };
    });

    return metrics;
  }

  /**
   * 生成请求ID
   */
  generateRequestId() {
    return `gw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 启动网关
   */
  async start() {
    try {
      // 连接Redis
      this.redis = Redis.createClient({
        host: this.config.redis.host,
        port: this.config.redis.port,
        db: this.config.redis.db
      });

      await new Promise((resolve, reject) => {
        this.redis.on('connect', resolve);
        this.redis.on('error', reject);
      });

      // 注册服务
      this.registerServices();

      // 启动服务器
      this.server = this.app.listen(this.config.port, () => {
        this.logger.info(`API Gateway started on port ${this.config.port}`);
        this.emit('started', { port: this.config.port });
      });

    } catch (error) {
      this.logger.error('Failed to start gateway', error);
      throw error;
    }
  }

  /**
   * 注册服务
   */
  registerServices() {
    Object.entries(this.config.services).forEach(([name, config]) => {
      this.serviceRegistry.set(name, {
        ...config,
        registeredAt: new Date().toISOString()
      });
    });

    this.logger.info(`Registered ${this.serviceRegistry.size} services`);
  }

  /**
   * 停止网关
   */
  async stop() {
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(resolve);
      });
    }

    if (this.redis) {
      await this.redis.quit();
    }

    this.logger.info('API Gateway stopped');
    this.emit('stopped');
  }

  /**
   * 添加服务
   */
  addService(name, config) {
    this.config.services[name] = config;
    this.serviceRegistry.set(name, {
      ...config,
      registeredAt: new Date().toISOString()
    });

    // 为新服务创建熔断器
    this.setupCircuitBreakers();

    this.logger.info(`Service ${name} added`);
    this.emit('service-added', { name, config });
  }

  /**
   * 移除服务
   */
  removeService(name) {
    delete this.config.services[name];
    this.serviceRegistry.delete(name);
    this.circuitBreakers.delete(name);

    this.logger.info(`Service ${name} removed`);
    this.emit('service-removed', { name });
  }

  /**
   * 更新服务配置
   */
  updateService(name, config) {
    const existingConfig = this.config.services[name];
    if (!existingConfig) {
      throw new Error(`Service ${name} not found`);
    }

    this.config.services[name] = { ...existingConfig, ...config };
    this.serviceRegistry.set(name, {
      ...this.config.services[name],
      updatedAt: new Date().toISOString()
    });

    this.logger.info(`Service ${name} updated`);
    this.emit('service-updated', { name, config });
  }
}

module.exports = SmartVillageAPIGateway;

// 如果直接运行此文件，启动网关
if (require.main === module) {
  const gateway = new SmartVillageAPIGateway({
    port: process.env.GATEWAY_PORT || 8080,

    services: {
      'user-service': {
        host: process.env.USER_SERVICE_HOST || 'localhost',
        port: process.env.USER_SERVICE_PORT || 3001
      },
      'resident-service': {
        host: process.env.RESIDENT_SERVICE_HOST || 'localhost',
        port: process.env.RESIDENT_SERVICE_PORT || 3002
      },
      'affairs-service': {
        host: process.env.AFFAIRS_SERVICE_HOST || 'localhost',
        port: process.env.AFFAIRS_SERVICE_PORT || 3003
      },
      'finance-service': {
        host: process.env.FINANCE_SERVICE_HOST || 'localhost',
        port: process.env.FINANCE_SERVICE_PORT || 3004
      },
      'notification-service': {
        host: process.env.NOTIFICATION_SERVICE_HOST || 'localhost',
        port: process.env.NOTIFICATION_SERVICE_PORT || 3005
      },
      'file-service': {
        host: process.env.FILE_SERVICE_HOST || 'localhost',
        port: process.env.FILE_SERVICE_PORT || 3006
      },
      'monitoring-service': {
        host: process.env.MONITORING_SERVICE_HOST || 'localhost',
        port: process.env.MONITORING_SERVICE_PORT || 3001
      },
      'aiops-service': {
        host: process.env.AIOPS_SERVICE_HOST || 'localhost',
        port: process.env.AIOPS_SERVICE_PORT || 7000
      }
    },

    rateLimitMax: process.env.RATE_LIMIT_MAX || 1000,
    circuitTimeout: process.env.CIRCUIT_TIMEOUT || 5000,

    serviceAuthToken: process.env.SERVICE_AUTH_TOKEN,
    corsOrigin: process.env.CORS_ORIGIN || '*'
  });

  // 优雅关闭处理
  process.on('SIGINT', async () => {
    console.log('Shutting down API Gateway...');
    await gateway.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Shutting down API Gateway...');
    await gateway.stop();
    process.exit(0);
  });

  // 启动网关
  gateway.start().catch(console.error);
}