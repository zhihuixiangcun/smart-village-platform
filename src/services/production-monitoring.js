/**
 * 智慧乡村平台 - 生产环境监控服务
 * 实时监控、告警、性能分析
 */

const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const os = require('os');
const winston = require('winston');
const redis = require('redis');
const mongoose = require('mongoose');
const { exec } = require('child_process');
const prometheus = require('prom-client');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 配置
const MONITORING_PORT = process.env.MONITORING_PORT || 3099;
const NODE_ENV = process.env.NODE_ENV || 'production';

// Winston日志配置
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/monitoring-error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 10
    }),
    new winston.transports.File({
      filename: 'logs/monitoring.log',
      maxsize: 5242880,
      maxFiles: 10
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Prometheus指标收集
const register = new prometheus.Registry();
prometheus.collectDefaultMetrics({ register });

// 自定义指标
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const systemCpuUsage = new prometheus.Gauge({
  name: 'system_cpu_usage_percent',
  help: 'Current CPU usage percentage',
  registers: [register]
});

const systemMemoryUsage = new prometheus.Gauge({
  name: 'system_memory_usage_percent',
  help: 'Current memory usage percentage',
  registers: [register]
});

const activeConnections = new prometheus.Gauge({
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections',
  registers: [register]
});

const databaseConnections = new prometheus.Gauge({
  name: 'database_active_connections',
  help: 'Number of active database connections',
  registers: [register]
});

// Redis客户端
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      logger.error('Redis服务器连接被拒绝');
      return new Error('Redis服务器连接被拒绝');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      logger.error('Redis重试超时');
      return new Error('重试时间已用完');
    }
    if (options.attempt > 10) {
      logger.error('Redis重试次数已用完');
      return undefined;
    }
    // 重试间隔：min(正在尝试 * 100, 3000)
    return Math.min(options.attempt * 100, 3000);
  }
});

redisClient.on('error', (err) => {
  logger.error('Redis连接错误:', err);
});

redisClient.on('connect', () => {
  logger.info('✅ Redis监控连接成功');
});

// 系统监控数据收集器
class SystemMonitor {
  constructor() {
    this.metrics = {
      cpu: 0,
      memory: 0,
      disk: 0,
      network: { in: 0, out: 0 },
      uptime: 0,
      loadAverage: [],
      timestamp: Date.now()
    };

    this.alerts = [];
    this.thresholds = {
      cpu: 80,
      memory: 85,
      disk: 90,
      responseTime: 5000,
      errorRate: 5
    };
  }

  async initialize() {
    try {
      await redisClient.connect();
      this.startMonitoring();
      logger.info('🚀 系统监控服务启动成功');
    } catch (error) {
      logger.error('❌ 系统监控服务启动失败:', error);
      throw error;
    }
  }

  startMonitoring() {
    // 每5秒收集系统指标
    setInterval(() => {
      this.collectSystemMetrics();
    }, 5000);

    // 每30秒检查告警
    setInterval(() => {
      this.checkAlerts();
    }, 30000);

    // 每小时生成报告
    setInterval(() => {
      this.generateHourlyReport();
    }, 3600000);
  }

  collectSystemMetrics() {
    try {
      // CPU使用率
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });

      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      this.metrics.cpu = 100 - (idle / total) * 100;

      // 内存使用率
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      this.metrics.memory = ((totalMemory - freeMemory) / totalMemory) * 100;

      // 系统负载
      this.metrics.loadAverage = os.loadavg();

      // 系统运行时间
      this.metrics.uptime = os.uptime();

      // 更新Prometheus指标
      systemCpuUsage.set(this.metrics.cpu);
      systemMemoryUsage.set(this.metrics.memory);

      // 缓存到Redis
      redisClient.setEx(
        'system:metrics:current',
        300,
        JSON.stringify(this.metrics)
      );

      // 广播给WebSocket客户端
      this.broadcastToClients({
        type: 'system_metrics',
        data: this.metrics
      });

    } catch (error) {
      logger.error('收集系统指标失败:', error);
    }
  }

  async checkAlerts() {
    const alerts = [];

    // CPU告警
    if (this.metrics.cpu > this.thresholds.cpu) {
      alerts.push({
        type: 'cpu',
        level: 'warning',
        message: `CPU使用率过高: ${this.metrics.cpu.toFixed(2)}%`,
        value: this.metrics.cpu,
        threshold: this.thresholds.cpu,
        timestamp: Date.now()
      });
    }

    // 内存告警
    if (this.metrics.memory > this.thresholds.memory) {
      alerts.push({
        type: 'memory',
        level: 'warning',
        message: `内存使用率过高: ${this.metrics.memory.toFixed(2)}%`,
        value: this.metrics.memory,
        threshold: this.thresholds.memory,
        timestamp: Date.now()
      });
    }

    // 数据库连接检查
    const dbStatus = mongoose.connection.readyState;
    if (dbStatus !== 1) {
      alerts.push({
        type: 'database',
        level: 'critical',
        message: '数据库连接异常',
        value: dbStatus,
        timestamp: Date.now()
      });
    }

    // Redis连接检查
    if (!redisClient.isOpen) {
      alerts.push({
        type: 'redis',
        level: 'critical',
        message: 'Redis连接异常',
        timestamp: Date.now()
      });
    }

    // 发送告警
    if (alerts.length > 0) {
      alerts.forEach(alert => {
        this.sendAlert(alert);
      });
    }

    return alerts;
  }

  async sendAlert(alert) {
    try {
      // 记录告警到日志
      logger.warn('系统告警:', alert);

      // 缓存告警信息
      await redisClient.lPush(
        'alerts:history',
        JSON.stringify(alert)
      );

      // 只保留最近100条告警记录
      await redisClient.lTrim('alerts:history', 0, 99);

      // 广播给WebSocket客户端
      this.broadcastToClients({
        type: 'alert',
        data: alert
      });

      // 发送邮件/短信通知 (可扩展)
      if (alert.level === 'critical') {
        await this.sendEmergencyNotification(alert);
      }

    } catch (error) {
      logger.error('发送告警失败:', error);
    }
  }

  async sendEmergencyNotification(alert) {
    // 紧急通知逻辑 (邮件、短信、钉钉等)
    logger.error('🚨 紧急告警通知:', alert);
    // TODO: 集成邮件服务、短信服务
  }

  async generateHourlyReport() {
    try {
      const report = {
        timestamp: Date.now(),
        period: 'hourly',
        metrics: this.metrics,
        alerts: await this.getRecentAlerts(3600), // 最近1小时告警
        performance: await this.getPerformanceStats()
      };

      // 保存报告
      await redisClient.lPush(
        'reports:hourly',
        JSON.stringify(report)
      );

      // 只保留最近24份报告
      await redisClient.lTrim('reports:hourly', 0, 23);

      logger.info('📊 生成小时报告完成');
      return report;

    } catch (error) {
      logger.error('生成小时报告失败:', error);
    }
  }

  async getRecentAlerts(seconds = 3600) {
    try {
      const alerts = await redisClient.lRange('alerts:history', 0, -1);
      return alerts
        .map(alert => JSON.parse(alert))
        .filter(alert => Date.now() - alert.timestamp < seconds * 1000);
    } catch (error) {
      logger.error('获取告警历史失败:', error);
      return [];
    }
  }

  async getPerformanceStats() {
    try {
      // 获取API性能统计
      const apiStats = await redisClient.hGetAll('api:stats');

      // 获取数据库性能
      const dbStats = {
        connections: mongoose.connection.readyState,
        collections: mongoose.connection.collections ? Object.keys(mongoose.connection.collections).length : 0
      };

      return {
        api: apiStats,
        database: dbStats,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      };
    } catch (error) {
      logger.error('获取性能统计失败:', error);
      return {};
    }
  }

  broadcastToClients(data) {
    const message = JSON.stringify(data);
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // API请求中间件
  trackRequest(req, res, next) {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;

      // 记录到Prometheus
      httpRequestDuration
        .labels(req.method, req.route?.path || req.path, res.statusCode)
        .observe(duration / 1000);

      // 记录到Redis
      const key = `api:stats:${req.method}:${req.route?.path || req.path}`;
      redisClient.hIncrBy(key, 'count', 1);
      redisClient.hIncrByFloat(key, 'total_duration', duration);
      redisClient.hSet(key, 'last_access', Date.now());
      redisClient.expire(key, 3600); // 1小时过期

      // 慢请求告警
      if (duration > this.thresholds.responseTime) {
        this.sendAlert({
          type: 'slow_request',
          level: 'warning',
          message: `慢请求告警: ${req.method} ${req.path} - ${duration}ms`,
          value: duration,
          threshold: this.thresholds.responseTime,
          timestamp: Date.now()
        });
      }
    });

    next();
  }

  getMetrics() {
    return {
      system: this.metrics,
      alerts: this.alerts,
      websocket: {
        activeConnections: wss.clients.size
      },
      database: {
        status: mongoose.connection.readyState,
        collections: mongoose.connection.collections ? Object.keys(mongoose.connection.collections).length : 0
      }
    };
  }
}

// 创建监控实例
const monitor = new SystemMonitor();

// WebSocket连接管理
wss.on('connection', (ws, req) => {
  logger.info(`🔗 WebSocket连接: ${req.socket.remoteAddress}`);

  // 更新活跃连接数
  activeConnections.set(wss.clients.size);

  // 发送初始数据
  ws.send(JSON.stringify({
    type: 'welcome',
    data: {
      message: '连接成功',
      timestamp: Date.now(),
      metrics: monitor.getMetrics()
    }
  }));

  // 定期发送心跳
  const heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(heartbeat);
    }
  }, 30000);

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
      case 'get_metrics':
        ws.send(JSON.stringify({
          type: 'metrics_response',
          data: monitor.getMetrics()
        }));
        break;

      case 'get_alerts':
        const alerts = await monitor.getRecentAlerts(data.data?.seconds || 3600);
        ws.send(JSON.stringify({
          type: 'alerts_response',
          data: alerts
        }));
        break;

      default:
        logger.warn('未知WebSocket消息类型:', data.type);
      }
    } catch (error) {
      logger.error('处理WebSocket消息失败:', error);
    }
  });

  ws.on('close', () => {
    logger.info('❌ WebSocket连接断开');
    activeConnections.set(wss.clients.size);
    clearInterval(heartbeat);
  });

  ws.on('error', (error) => {
    logger.error('WebSocket连接错误:', error);
  });
});

// REST API路由
app.use(express.json());

// 请求监控中间件
app.use(monitor.trackRequest.bind(monitor));

// 健康检查
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: require('./package.json').version,
    services: {
      redis: redisClient.isOpen ? 'connected' : 'disconnected',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      websocket: `${wss.clients.size  } active connections`
    }
  };

  const isHealthy = health.services.redis === 'connected' &&
                   health.services.database === 'connected';

  res.status(isHealthy ? 200 : 503).json(health);
});

// Prometheus指标端点
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('获取Prometheus指标失败:', error);
    res.status(500).json({ error: '指标获取失败' });
  }
});

// 获取当前监控数据
app.get('/api/dashboard', (req, res) => {
  try {
    res.json({
      success: true,
      data: monitor.getMetrics()
    });
  } catch (error) {
    logger.error('获取仪表板数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取数据失败'
    });
  }
});

// 获取告警历史
app.get('/api/alerts', async (req, res) => {
  try {
    const seconds = parseInt(req.query.hours) * 3600 || 3600;
    const alerts = await monitor.getRecentAlerts(seconds);

    res.json({
      success: true,
      data: alerts,
      count: alerts.length
    });
  } catch (error) {
    logger.error('获取告警历史失败:', error);
    res.status(500).json({
      success: false,
      error: '获取告警失败'
    });
  }
});

// 获取性能报告
app.get('/api/reports', async (req, res) => {
  try {
    const reports = await redisClient.lRange('reports:hourly', 0, -1);
    const parsedReports = reports.map(report => JSON.parse(report));

    res.json({
      success: true,
      data: parsedReports.reverse(), // 最新的在前
      count: parsedReports.length
    });
  } catch (error) {
    logger.error('获取性能报告失败:', error);
    res.status(500).json({
      success: false,
      error: '获取报告失败'
    });
  }
});

// 静态文件服务 - 监控仪表板
app.use('/monitoring', express.static('monitoring/dashboard'));

// 启动监控服务
const startMonitoringService = async () => {
  try {
    // 初始化监控
    await monitor.initialize();

    // 启动HTTP服务器
    server.listen(MONITORING_PORT, () => {
      logger.info('🚀 生产环境监控服务启动成功');
      logger.info(`🌐 监控服务地址: http://localhost:${MONITORING_PORT}`);
      logger.info(`📊 仪表板地址: http://localhost:${MONITORING_PORT}/monitoring`);
      logger.info(`📈 Prometheus指标: http://localhost:${MONITORING_PORT}/metrics`);
      logger.info(`💚 健康检查: http://localhost:${MONITORING_PORT}/health`);
    });

  } catch (error) {
    logger.error('❌ 监控服务启动失败:', error);
    process.exit(1);
  }
};

// 优雅关闭
const gracefulShutdown = async (signal) => {
  logger.info(`🛑 收到${signal}信号，正在关闭监控服务...`);

  try {
    // 关闭HTTP服务器
    server.close(() => {
      logger.info('📡 HTTP服务器已关闭');
    });

    // 关闭WebSocket服务器
    wss.close(() => {
      logger.info('🔌 WebSocket服务器已关闭');
    });

    // 关闭Redis连接
    if (redisClient.isOpen) {
      await redisClient.quit();
      logger.info('👋 Redis连接已关闭');
    }

    // 关闭数据库连接
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      logger.info('🗄️ 数据库连接已关闭');
    }

    logger.info('✅ 监控服务已安全关闭');
    process.exit(0);

  } catch (error) {
    logger.error('关闭过程中出错:', error);
    process.exit(1);
  }
};

// 监听关闭信号
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// 错误处理
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  monitor.sendAlert({
    type: 'system_error',
    level: 'critical',
    message: '系统未捕获异常',
    error: error.message,
    stack: error.stack,
    timestamp: Date.now()
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', reason);
  monitor.sendAlert({
    type: 'promise_rejection',
    level: 'critical',
    message: '系统未处理的Promise拒绝',
    reason,
    promise,
    timestamp: Date.now()
  });
});

// 启动服务
if (require.main === module) {
  startMonitoringService();
}

module.exports = { app, monitor, startMonitoringService };