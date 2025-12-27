/**
 * 服务注册与发现
 */

const consul = require('consul');
const Logger = require('./Logger');

class ServiceRegistry {
  constructor() {
    this.consulClient = null;
    this.serviceId = null;
    this.serviceConfig = null;
  }

  /**
   * 初始化Consul客户端
   */
  async init() {
    try {
      this.consulClient = consul({
        host: process.env.CONSUL_HOST || 'localhost',
        port: process.env.CONSUL_PORT || 8500,
        promisify: true
      });

      Logger.info('服务注册中心连接成功');
      return true;
    } catch (error) {
      Logger.error('服务注册中心连接失败:', error);
      throw error;
    }
  }

  /**
   * 注册服务
   */
  async register(config) {
    try {
      if (!this.consulClient) {
        await this.init();
      }

      this.serviceConfig = config;
      this.serviceId = `${config.name}-${config.port}-${Date.now()}`;

      const serviceDefinition = {
        id: this.serviceId,
        name: config.name,
        address: process.env.SERVICE_HOST || 'localhost',
        port: config.port,
        tags: config.tags || ['smart-village', 'microservice'],
        check: {
          http: `http://${process.env.SERVICE_HOST || 'localhost'}:${config.port}${config.health}`,
          interval: '10s',
          timeout: '5s',
          deregistercriticalserviceafter: '30s'
        }
      };

      await this.consulClient.agent.service.register(serviceDefinition);

      Logger.info('服务注册成功', {
        serviceId: this.serviceId,
        serviceName: config.name,
        port: config.port
      });

      // 启动健康检查
      this.startHealthCheck();

      return this.serviceId;
    } catch (error) {
      Logger.error('服务注册失败:', error);
      throw error;
    }
  }

  /**
   * 注销服务
   */
  async deregister() {
    try {
      if (!this.consulClient || !this.serviceId) {
        return true;
      }

      await this.consulClient.agent.service.deregister(this.serviceId);

      Logger.info('服务注销成功', {
        serviceId: this.serviceId
      });

      this.serviceId = null;
      this.serviceConfig = null;

      return true;
    } catch (error) {
      Logger.error('服务注销失败:', error);
      throw error;
    }
  }

  /**
   * 发现服务
   */
  async discover(serviceName) {
    try {
      if (!this.consulClient) {
        await this.init();
      }

      const services = await this.consulClient.health.service({
        service: serviceName,
        passing: true
      });

      const instances = services.map(service => ({
        id: service.Service.ID,
        name: service.Service.Service,
        address: service.Service.Address,
        port: service.Service.Port,
        tags: service.Service.Tags,
        health: service.Checks.map(check => ({
          status: check.Status,
          output: check.Output
        }))
      }));

      return instances;
    } catch (error) {
      Logger.error('服务发现失败:', error);
      return [];
    }
  }

  /**
   * 获取服务实例
   */
  async getServiceInstance(serviceName) {
    try {
      const instances = await this.discover(serviceName);

      if (instances.length === 0) {
        throw new Error(`服务 ${serviceName} 没有可用实例`);
      }

      // 简单的负载均衡 - 随机选择
      const randomIndex = Math.floor(Math.random() * instances.length);
      return instances[randomIndex];
    } catch (error) {
      Logger.error('获取服务实例失败:', error);
      throw error;
    }
  }

  /**
   * 监控服务变化
   */
  async watchService(serviceName, callback) {
    try {
      if (!this.consulClient) {
        await this.init();
      }

      const watch = this.consulClient.watch({
        method: this.consulClient.health.service,
        options: {
          service: serviceName,
          passing: true,
          index: 0
        }
      });

      watch.on('change', (data) => {
        const instances = data.map(service => ({
          id: service.Service.ID,
          name: service.Service.Service,
          address: service.Service.Address,
          port: service.Service.Port,
          tags: service.Service.Tags
        }));

        callback(instances);
      });

      watch.on('error', (error) => {
        Logger.error('服务监控出错:', error);
      });

      return watch;
    } catch (error) {
      Logger.error('监控服务失败:', error);
      throw error;
    }
  }

  /**
   * 启动健康检查
   */
  startHealthCheck() {
    // 发送心跳
    setInterval(async () => {
      try {
        if (this.consulClient && this.serviceId) {
          await this.consulClient.agent.check.pass({
            id: `service:${this.serviceId}`
          });
        }
      } catch (error) {
        Logger.error('健康检查失败:', error);
      }
    }, 10000); // 10秒
  }

  /**
   * 检查健康状态
   */
  async checkHealth() {
    try {
      if (!this.consulClient) {
        return 'disconnected';
      }

      const leader = await this.consulClient.status.leader();
      return leader ? 'connected' : 'no_leader';
    } catch (error) {
      return 'error';
    }
  }

  /**
   * 获取所有服务
   */
  async getAllServices() {
    try {
      if (!this.consulClient) {
        await this.init();
      }

      const services = await this.consulClient.agent.service.list();

      const serviceList = [];
      for (const [serviceId, service] of Object.entries(services)) {
        if (service.Service.startsWith('smart-village')) {
          serviceList.push({
            id: serviceId,
            name: service.Service,
            address: service.Address,
            port: service.Port,
            tags: service.Tags
          });
        }
      }

      return serviceList;
    } catch (error) {
      Logger.error('获取所有服务失败:', error);
      return [];
    }
  }

  /**
   * 获取服务拓扑
   */
  async getServiceTopology() {
    try {
      const services = await this.getAllServices();
      const topology = {
        nodes: [],
        edges: []
      };

      services.forEach(service => {
        topology.nodes.push({
          id: service.id,
          name: service.name,
          address: `${service.address}:${service.port}`,
          type: this.getServiceType(service.name),
          status: 'active'
        });
      });

      // 添加服务间的依赖关系（基于业务逻辑）
      topology.edges = [
        { from: 'api-gateway', to: 'user-service', type: 'depends' },
        { from: 'api-gateway', to: 'resident-service', type: 'depends' },
        { from: 'api-gateway', to: 'governance-service', type: 'depends' },
        { from: 'api-gateway', to: 'finance-service', type: 'depends' },
        { from: 'user-service', to: 'user-db', type: 'connects' },
        { from: 'resident-service', to: 'resident-db', type: 'connects' },
        { from: 'governance-service', to: 'governance-db', type: 'connects' },
        { from: 'finance-service', to: 'finance-db', type: 'connects' }
      ];

      return topology;
    } catch (error) {
      Logger.error('获取服务拓扑失败:', error);
      return { nodes: [], edges: [] };
    }
  }

  /**
   * 获取服务类型
   */
  getServiceType(serviceName) {
    if (serviceName === 'api-gateway') return 'gateway';
    if (serviceName.endsWith('-service')) return 'service';
    if (serviceName.endsWith('-db')) return 'database';
    return 'unknown';
  }
}

module.exports = ServiceRegistry;