/**
 * 智慧乡村微服务演示程序
 * 展示微服务架构的核心功能和通信机制
 */

const express = require('express');
const { EventEmitter } = require('events');
const http = require('http');

// 模拟微服务基础类
class MicroService extends EventEmitter {
  constructor(name, port) {
    super();
    this.name = name;
    this.port = port;
    this.app = express();
    this.server = null;
    this.status = 'stopped';
    this.metrics = {
      requests: 0,
      errors: 0,
      startTime: null
    };

    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json());

    // 请求日志中间件
    this.app.use((req, res, next) => {
      this.metrics.requests++;
      console.log(`[${this.name}] ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // 健康检查端点
    this.app.get('/health', (req, res) => {
      res.json({
        service: this.name,
        status: this.status,
        port: this.port,
        uptime: this.metrics.startTime ? Date.now() - this.metrics.startTime : 0,
        metrics: this.metrics
      });
    });

    // 服务信息端点
    this.app.get('/info', (req, res) => {
      res.json({
        service: this.name,
        version: '1.0.0',
        description: `${this.name} 微服务演示`,
        capabilities: this.getCapabilities()
      });
    });
  }

  getCapabilities() {
    return [];
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, (err) => {
        if (err) {
          reject(err);
          return;
        }

        this.status = 'running';
        this.metrics.startTime = Date.now();
        console.log(`✅ ${this.name} 服务启动成功，端口: ${this.port}`);
        this.emit('started', { name: this.name, port: this.port });
        resolve();
      });
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.status = 'stopped';
          console.log(`🛑 ${this.name} 服务已停止`);
          this.emit('stopped', { name: this.name });
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// API网关服务
class APIGateway extends MicroService {
  constructor() {
    super('API网关', 8080);
    this.services = new Map();
    this.loadBalancer = {
      index: 0,
      strategy: 'round-robin'
    };
  }

  setupRoutes() {
    super.setupRoutes();

    // 服务注册端点
    this.app.post('/register', (req, res) => {
      const { name, url, health } = req.body;
      this.services.set(name, { url, health, registeredAt: new Date() });
      console.log(`📝 服务注册: ${name} -> ${url}`);
      res.json({ success: true, message: `${name} 注册成功` });
    });

    // 服务发现端点
    this.app.get('/services', (req, res) => {
      const services = Array.from(this.services.entries()).map(([name, info]) => ({
        name,
        ...info
      }));
      res.json({ services });
    });

    // 路由转发
    this.app.use('/api/*', async (req, res) => {
      const serviceName = this.extractServiceName(req.path);
      const service = this.services.get(serviceName);

      if (!service) {
        res.status(404).json({ error: `服务 ${serviceName} 未找到` });
        return;
      }

      try {
        // 模拟请求转发
        console.log(`🔄 转发请求: ${req.method} ${req.path} -> ${service.url}`);
        res.json({
          message: `请求已转发到 ${serviceName}`,
          service: serviceName,
          originalPath: req.path,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.metrics.errors++;
        res.status(500).json({ error: '服务调用失败' });
      }
    });
  }

  extractServiceName(path) {
    // 简单的服务名提取逻辑
    if (path.includes('/users')) return 'user-service';
    if (path.includes('/residents')) return 'resident-service';
    if (path.includes('/affairs')) return 'affairs-service';
    if (path.includes('/monitoring')) return 'monitoring-service';
    return 'unknown-service';
  }

  getCapabilities() {
    return ['路由转发', '负载均衡', '服务发现', '健康检查'];
  }
}

// 监控服务
class MonitoringService extends MicroService {
  constructor() {
    super('监控服务', 3001);
    this.metrics = {
      services: new Map(),
      alerts: [],
      systemStats: {
        cpu: 0,
        memory: 0,
        disk: 0
      }
    };
  }

  setupRoutes() {
    super.setupRoutes();

    // 获取系统指标
    this.app.get('/metrics', (req, res) => {
      this.updateSystemStats();
      res.json({
        timestamp: new Date().toISOString(),
        services: Array.from(this.metrics.services.entries()),
        systemStats: this.metrics.systemStats,
        alerts: this.metrics.alerts.slice(-10) // 最近10个告警
      });
    });

    // 注册服务指标
    this.app.post('/metrics/register', (req, res) => {
      const { serviceName, metrics } = req.body;
      this.metrics.services.set(serviceName, {
        ...metrics,
        lastUpdate: new Date()
      });

      // 检查告警条件
      this.checkAlerts(serviceName, metrics);

      res.json({ success: true });
    });

    // 告警列表
    this.app.get('/alerts', (req, res) => {
      res.json(this.metrics.alerts);
    });
  }

  updateSystemStats() {
    // 模拟系统统计数据
    this.metrics.systemStats = {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100
    };
  }

  checkAlerts(serviceName, metrics) {
    if (metrics.cpu && metrics.cpu > 80) {
      this.addAlert('HIGH_CPU', `${serviceName} CPU使用率过高: ${metrics.cpu.toFixed(1)}%`);
    }
    if (metrics.memory && metrics.memory > 85) {
      this.addAlert('HIGH_MEMORY', `${serviceName} 内存使用率过高: ${metrics.memory.toFixed(1)}%`);
    }
    if (metrics.errorRate && metrics.errorRate > 5) {
      this.addAlert('HIGH_ERROR_RATE', `${serviceName} 错误率过高: ${metrics.errorRate.toFixed(1)}%`);
    }
  }

  addAlert(type, message) {
    const alert = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date(),
      severity: type.includes('HIGH') ? 'critical' : 'warning'
    };

    this.metrics.alerts.push(alert);
    console.log(`🚨 告警: ${message}`);
    this.emit('alert', alert);
  }

  getCapabilities() {
    return ['性能监控', '告警管理', '系统统计', '服务指标收集'];
  }
}

// AIOps服务
class AIOpsService extends MicroService {
  constructor() {
    super('AIOps服务', 7000);
    this.anomalyDetection = {
      thresholds: {
        responseTime: 1000,
        errorRate: 5,
        cpu: 80
      }
    };
    this.scalingDecisions = [];
    this.healingActions = [];
  }

  setupRoutes() {
    super.setupRoutes();

    // 异常检测
    this.app.post('/anomaly/detect', (req, res) => {
      const { metricName, value, serviceName } = req.body;
      const anomaly = this.detectAnomaly(metricName, value);

      res.json({
        anomaly,
        metricName,
        value,
        serviceName,
        threshold: this.anomalyDetection.thresholds[metricName],
        timestamp: new Date().toISOString()
      });
    });

    // 预测扩容
    this.app.post('/scaling/predict', (req, res) => {
      const { serviceName, currentLoad, history } = req.body;
      const prediction = this.predictScaling(serviceName, currentLoad, history);

      res.json({
        serviceName,
        prediction,
        recommendation: this.getScalingRecommendation(prediction),
        timestamp: new Date().toISOString()
      });
    });

    // 自动恢复
    this.app.post('/healing/trigger', (req, res) => {
      const { serviceName, issueType } = req.body;
      const action = this.triggerAutoHealing(serviceName, issueType);

      res.json({
        serviceName,
        issueType,
        action,
        timestamp: new Date().toISOString()
      });
    });

    // 获取历史记录
    this.app.get('/history', (req, res) => {
      res.json({
        scalingDecisions: this.scalingDecisions.slice(-20),
        healingActions: this.healingActions.slice(-20)
      });
    });
  }

  detectAnomaly(metricName, value) {
    const threshold = this.anomalyDetection.thresholds[metricName];
    if (!threshold) return false;

    return value > threshold;
  }

  predictScaling(serviceName, currentLoad, history = []) {
    // 简单的线性预测
    const trend = history.length > 0 ?
      (history[history.length - 1] - history[0]) / history.length : 0;

    const prediction = currentLoad + (trend * 10); // 预测10个时间单位后的负载

    return {
      current: currentLoad,
      predicted: Math.max(0, prediction),
      trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable'
    };
  }

  getScalingRecommendation(prediction) {
    if (prediction.predicted > 80) {
      return { action: 'scale-up', instances: '+2', reason: '高负载预测' };
    } else if (prediction.predicted < 20) {
      return { action: 'scale-down', instances: '-1', reason: '低负载预测' };
    } else {
      return { action: 'maintain', instances: '0', reason: '负载稳定' };
    }
  }

  triggerAutoHealing(serviceName, issueType) {
    const action = {
      id: Date.now(),
      serviceName,
      issueType,
      action: this.getHealingAction(issueType),
      timestamp: new Date(),
      status: 'executed'
    };

    this.healingActions.push(action);
    return action;
  }

  getHealingAction(issueType) {
    const actions = {
      'service_down': '重启服务',
      'high_memory': '清理缓存',
      'high_cpu': '扩展实例',
      'network_error': '检查网络连接'
    };

    return actions[issueType] || '执行标准恢复流程';
  }

  getCapabilities() {
    return ['异常检测', '预测扩容', '自动恢复', '容量规划'];
  }
}

// 演示管理器
class MicroservicesDemo {
  constructor() {
    this.gateway = new APIGateway();
    this.monitoring = new MonitoringService();
    this.aiops = new AIOpsService();
    this.simulationInterval = null;
  }

  async start() {
    console.log('🚀 启动智慧乡村微服务演示');
    console.log('=========================================');

    try {
      // 启动所有服务
      await this.gateway.start();
      await this.monitoring.start();
      await this.aiops.start();

      // 注册服务到网关
      this.registerServices();

      // 启动模拟
      this.startSimulation();

      console.log('=========================================');
      console.log('✅ 所有微服务启动成功！');
      console.log('📊 服务访问地址:');
      console.log('   API网关: http://localhost:8080/health');
      console.log('   监控服务: http://localhost:3001/health');
      console.log('   AIOps服务: http://localhost:7000/health');
      console.log('=========================================');
      console.log('💡 演示命令:');
      console.log('   # 查看服务状态');
      console.log('   curl http://localhost:8080/services');
      console.log('   ');
      console.log('   # 查看系统监控');
      console.log('   curl http://localhost:3001/metrics');
      console.log('   ');
      console.log('   # 测试异常检测');
      console.log('   curl -X POST http://localhost:7000/anomaly/detect \\');
      console.log('        -H "Content-Type: application/json" \\');
      console.log('        -d \'{"metricName":"cpu","value":90,"serviceName":"demo-service"}\'');
      console.log('=========================================');

    } catch (error) {
      console.error('❌ 启动失败:', error);
      await this.stop();
      process.exit(1);
    }
  }

  registerServices() {
    // 模拟服务注册
    const services = [
      { name: 'user-service', url: 'http://localhost:3002' },
      { name: 'resident-service', url: 'http://localhost:3003' },
      { name: 'affairs-service', url: 'http://localhost:3004' },
      { name: 'monitoring-service', url: 'http://localhost:3001' },
      { name: 'aiops-service', url: 'http://localhost:7000' }
    ];

    services.forEach(service => {
      this.gateway.emit('service-registered', service);
    });
  }

  startSimulation() {
    // 模拟服务指标上报
    this.simulationInterval = setInterval(() => {
      this.simulateMetrics();
    }, 5000); // 每5秒上报一次指标

    console.log('📈 开始模拟服务指标上报...');
  }

  simulateMetrics() {
    const metrics = {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100,
      requests: Math.floor(Math.random() * 1000),
      errorRate: Math.random() * 10,
      responseTime: Math.random() * 2000
    };

    // 随机选择一个服务上报指标
    const services = ['user-service', 'resident-service', 'affairs-service'];
    const serviceName = services[Math.floor(Math.random() * services.length)];

    this.monitoring.emit('metrics-updated', { serviceName, metrics });
  }

  async stop() {
    console.log('\n🛑 正在停止所有服务...');

    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }

    await Promise.all([
      this.gateway.stop(),
      this.monitoring.stop(),
      this.aiops.stop()
    ]);

    console.log('✅ 所有服务已停止');
  }
}

// 启动演示
async function main() {
  const demo = new MicroservicesDemo();

  // 优雅关闭处理
  process.on('SIGINT', async () => {
    console.log('\n收到关闭信号...');
    await demo.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n收到终止信号...');
    await demo.stop();
    process.exit(0);
  });

  try {
    await demo.start();
  } catch (error) {
    console.error('演示启动失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，启动演示
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { MicroService, APIGateway, MonitoringService, AIOpsService, MicroservicesDemo };