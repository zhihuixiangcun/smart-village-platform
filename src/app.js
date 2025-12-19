/**
 * 智慧村庄平台 - 主应用服务器
 * 集成实时计算引擎的核心服务
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// 导入实时计算组件
const realtimeIntegrator = require('./integrator/realtimeIntegrator');
const realtimeTracker = require('./middleware/realtimeTracker');
const behaviorTracker = require('./middleware/behaviorTracker');

// 导入路由
const realtimeRoutes = require('./routes/realtimeRoutes');
const dataIntegrationRoutes = require('./routes/dataIntegrationRoutes');
const massiveDataRoutes = require('./routes/massiveDataRoutes');
const apiV1Routes = require('./routes/apiV1');
const enhancedPermissionRoutes = require('./routes/enhancedPermission');
const userFeedbackRoutes = require('./routes/userFeedback');

// 导入API文档生成器
const { apiDocGenerator } = require('./utils/apiDocumentation');

// 导入工具
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

dotenv.config();

const app = express();
const PORT = process.env.MAIN_PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 信任代理（用于负载均衡器）
app.set('trust proxy', 1);

// 基础中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
      scriptSrc: ['\'self\'', '\'unsafe-inline\''],
      imgSrc: ['\'self\'', 'data:', 'https:', 'blob:'],
      fontSrc: ['\'self\'', 'https://fonts.gstatic.com'],
      connectSrc: ['\'self\'', 'ws:', 'wss:']
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(compression());
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'http://localhost:3006',
    'http://localhost:3012',
    'http://127.0.0.1:3006',
    'http://127.0.0.1:3012'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-User-Id',
    'X-Village-Id',
    'X-Session-Id'
  ]
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 日志中间件
if (NODE_ENV === 'production') {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
} else {
  app.use(morgan('dev'));
}

// 静态文件服务
app.use('/static', express.static(path.join(__dirname, '../public'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// 实时计算引擎初始化
let realtimeInitialized = false;

/**
 * 初始化实时计算系统
 */
async function initializeRealtimeSystem() {
  try {
    logger.info('🚀 实时计算系统已禁用（开发模式）');

    // 临时禁用实时计算系统
    realtimeInitialized = false;

    // 原代码：
    // await realtimeIntegrator.initialize();
    // await realtimeIntegrator.start();
    // realtimeInitialized = true;
    // logger.info('✅ 实时计算系统启动成功');
    // setupRealtimeEventListeners();

  } catch (error) {
    logger.error('❌ 实时计算系统初始化失败:', error);
    realtimeInitialized = false;
  }
}

/**
 * 设置实时系统事件监听
 */
function setupRealtimeEventListeners() {
  // 数据处理完成事件
  realtimeIntegrator.on('dataProcessed', (event) => {
    logger.debug('📝 实时数据处理完成', {
      dataType: event.dataType,
      timestamp: event.timestamp
    });
  });

  // 预警触发事件
  realtimeIntegrator.on('alertTriggered', (alert) => {
    logger.warn('⚠️ 实时预警触发', {
      rule: alert.ruleName,
      severity: alert.severity,
      message: alert.message
    });

    // 这里可以集成通知系统
    if (alert.severity === 'critical') {
      // 发送紧急通知
      sendEmergencyNotification(alert);
    }
  });

  // 系统健康状态变化
  realtimeIntegrator.on('healthCheckFailed', (checks) => {
    logger.error('❌ 实时系统健康检查失败', checks);
  });

  // 指标更新事件
  realtimeIntegrator.on('metricUpdated', (event) => {
    // 记录关键指标变化
    if (event.metricName === 'system_error_rate' && event.value > 0.05) {
      logger.warn('🚨 系统错误率过高', {
        metric: event.metricName,
        value: event.value
      });
    }
  });
}

/**
 * 发送紧急通知
 */
async function sendEmergencyNotification(alert) {
  try {
    // 这里可以集成短信、邮件、钉钉等通知服务
    logger.error('🚨 紧急通知发送', {
      alert: alert.ruleName,
      message: alert.message,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('发送紧急通知失败:', error);
  }
}

// 应用级中间件

// 请求标识符
app.use((req, res, next) => {
  req.id = require('crypto').randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// 实时跟踪中间件（如果已初始化）
app.use((req, res, next) => {
  if (realtimeInitialized) {
    return realtimeTracker.middleware()(req, res, next);
  }
  next();
});

// 用户行为跟踪中间件
app.use((req, res, next) => {
  if (realtimeInitialized && req.path.startsWith('/api/')) {
    return behaviorTracker.middleware()(req, res, next);
  }
  next();
});

// 健康检查端点
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: NODE_ENV,
      services: {
        realtime: realtimeInitialized ? 'healthy' : 'disabled',
        main: 'healthy'
      },
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };

    // 如果实时系统已初始化，添加其健康状态
    if (realtimeInitialized) {
      const realtimeStatus = realtimeIntegrator.getSystemStatus();
      health.services.realtime = realtimeStatus.status.healthy ? 'healthy' : 'unhealthy';
      health.realtime = realtimeStatus;
    }

    const isHealthy = Object.values(health.services).every(status => status === 'healthy');

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      data: health
    });

  } catch (error) {
    logger.error('健康检查失败:', error);
    res.status(500).json({
      success: false,
      error: '健康检查失败',
      timestamp: new Date().toISOString()
    });
  }
});

// API信息端点
app.get('/api/v1/info', (req, res) => {
  res.json({
    success: true,
    data: {
      name: '智慧村庄平台主服务',
      version: '1.0.0',
      environment: NODE_ENV,
      features: {
        realtime: realtimeInitialized,
        monitoring: true,
        dataIntegration: true,
        massiveDataProcessing: true
      },
      endpoints: {
        realtime: '/api/v1/realtime/*',
        dataIntegration: '/api/v1/data-integration/*',
        massiveData: '/api/v1/massive-data/*'
      },
      documentation: {
        realtime: '/docs/realtime',
        dataIntegration: '/docs/data-integration',
        massiveData: '/docs/massive-data'
      }
    }
  });
});

// API路由
app.use('/api/v1/realtime', realtimeRoutes);
app.use('/api/v1/data-integration', dataIntegrationRoutes);
app.use('/api/v1/massive-data', massiveDataRoutes);
app.use('/api/v1', apiV1Routes);
app.use('/api/v1/enhanced-permissions', enhancedPermissionRoutes);
app.use('/api/v1/feedback', userFeedbackRoutes);

// 实时计算状态API
app.get('/api/v1/realtime/status', (req, res) => {
  try {
    if (!realtimeInitialized) {
      return res.status(503).json({
        success: false,
        error: '实时计算系统未初始化',
        code: 'REALTIME_NOT_INITIALIZED'
      });
    }

    const status = realtimeIntegrator.getSystemStatus();
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('获取实时系统状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取实时系统状态失败',
      message: error.message
    });
  }
});

// 实时订阅端点 (Server-Sent Events)
app.get('/api/v1/realtime/subscribe', (req, res) => {
  try {
    if (!realtimeInitialized) {
      return res.status(503).json({
        success: false,
        error: '实时计算系统未初始化'
      });
    }

    // 设置SSE响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // 心跳机制
    const heartbeat = setInterval(() => {
      res.write('event: heartbeat\n');
      res.write(`data: ${JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString(),
        status: 'connected'
      })}\n\n`);
    }, 30000);

    // 发送连接确认
    res.write('event: connected\n');
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      message: '实时事件订阅成功',
      timestamp: new Date().toISOString(),
      id: req.id
    })}\n\n`);

    // 事件监听器
    const listeners = {
      dataProcessed: (event) => {
        res.write('event: dataProcessed\n');
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      },
      alertTriggered: (alert) => {
        res.write('event: alertTriggered\n');
        res.write(`data: ${JSON.stringify(alert)}\n\n`);
      },
      metricUpdated: (event) => {
        res.write('event: metricUpdated\n');
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    };

    // 注册事件监听器
    Object.entries(listeners).forEach(([event, listener]) => {
      realtimeIntegrator.on(event, listener);
    });

    // 客户端断开连接时清理
    req.on('close', () => {
      clearInterval(heartbeat);
      Object.entries(listeners).forEach(([event, listener]) => {
        realtimeIntegrator.removeListener(event, listener);
      });
      logger.info('客户端断开实时订阅', { requestId: req.id });
    });

    // 错误处理
    req.on('error', (error) => {
      logger.error('实时订阅连接错误:', error);
      clearInterval(heartbeat);
      res.end();
    });

  } catch (error) {
    logger.error('实时订阅设置失败:', error);
    res.status(500).json({
      success: false,
      error: '实时订阅设置失败',
      message: error.message
    });
  }
});

// 性能监控端点
app.get('/api/v1/performance', (req, res) => {
  try {
    const performance = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      realtime: realtimeInitialized ? realtimeIntegrator.getSystemStatus().metrics : null
    };

    res.json({
      success: true,
      data: performance
    });

  } catch (error) {
    logger.error('获取性能信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取性能信息失败',
      message: error.message
    });
  }
});

// API文档端点
app.get('/api/v1/docs', (req, res) => {
  try {
    const openAPIDoc = apiDocGenerator.generateOpenAPIDocument();

    res.setHeader('Content-Type', 'application/json');
    res.json(openAPIDoc);
  } catch (error) {
    logger.error('生成API文档失败:', error);
    res.status(500).json({
      success: false,
      error: '生成API文档失败',
      code: 'DOC_GENERATION_ERROR'
    });
  }
});

// HTML API文档
app.get('/api/v1/docs.html', (req, res) => {
  try {
    const htmlDoc = apiDocGenerator.generateHTMLDocumentation();

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlDoc);
  } catch (error) {
    logger.error('生成HTML API文档失败:', error);
    res.status(500).json({
      success: false,
      error: '生成HTML API文档失败',
      code: 'HTML_DOC_GENERATION_ERROR'
    });
  }
});

// Postman集合
app.get('/api/v1/postman', (req, res) => {
  try {
    const postmanCollection = apiDocGenerator.generatePostmanCollection();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="smart-village-api.postman_collection.json"');
    res.json(postmanCollection);
  } catch (error) {
    logger.error('生成Postman集合失败:', error);
    res.status(500).json({
      success: false,
      error: '生成Postman集合失败',
      code: 'POSTMAN_GENERATION_ERROR'
    });
  }
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API接口不存在',
    code: 'ENDPOINT_NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      '/health',
      '/api/v1/info',
      '/api/v1/realtime/*',
      '/api/v1/data-integration/*',
      '/api/v1/massive-data/*',
      '/api/v1/performance'
    ],
    requestId: req.id
  });
});

// 全局错误处理
app.use(errorHandler);

/**
 * 启动应用服务器
 */
async function startServer() {
  try {
    logger.info('🚀 启动智慧村庄平台主服务...');

    // 初始化实时计算系统
    await initializeRealtimeSystem();

    // 启动HTTP服务器
    const server = app.listen(PORT, () => {
      logger.info('✅ 智慧村庄平台主服务启动成功');
      logger.info(`🌐 服务地址: http://localhost:${PORT}`);
      logger.info(`🏥 健康检查: http://localhost:${PORT}/health`);
      logger.info(`📊 实时状态: http://localhost:${PORT}/api/v1/realtime/status`);
      logger.info(`🔗 实时订阅: http://localhost:${PORT}/api/v1/realtime/subscribe`);
      logger.info(`📋 API信息: http://localhost:${PORT}/api/v1/info`);
      logger.info(`📈 性能监控: http://localhost:${PORT}/api/v1/performance`);
      logger.info(`🔄 实时计算引擎: ${realtimeInitialized ? '已启用' : '已禁用'}`);

      // 显示服务特性
      logger.info('🌟 服务特性:');
      logger.info(`   - 实时数据流处理: ${realtimeInitialized ? '✅' : '❌'}`);
      logger.info('   - 多源数据整合: ✅');
      logger.info('   - 海量数据处理: ✅');
      logger.info(`   - 动态阈值监控: ${realtimeInitialized ? '✅' : '❌'}`);
      logger.info(`   - 智能预警系统: ${realtimeInitialized ? '✅' : '❌'}`);
    });

    // 设置服务器超时
    server.timeout = 30000; // 30秒
    server.keepAliveTimeout = 65000; // 65秒
    server.headersTimeout = 66000; // 66秒

    // 优雅关闭处理
    const gracefulShutdown = async (signal) => {
      logger.info(`🛑 收到${signal}信号，正在优雅关闭服务器...`);

      server.close(async () => {
        logger.info('📡 HTTP服务器已关闭');

        try {
          // 关闭实时计算系统
          if (realtimeInitialized) {
            await realtimeIntegrator.stop();
            logger.info('⚡ 实时计算系统已关闭');
          }

          logger.info('✅ 智慧村庄平台主服务已安全关闭');
          process.exit(0);

        } catch (error) {
          logger.error('❌ 关闭过程中出错:', error);
          process.exit(1);
        }
      });

      // 强制关闭超时
      setTimeout(() => {
        logger.error('⚠️ 强制关闭服务器');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // 未捕获异常处理
    process.on('uncaughtException', (error) => {
      logger.error('❌ 未捕获的异常:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('❌ 未处理的Promise拒绝:', { reason, promise });
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    logger.error('❌ 智慧村庄平台主服务启动失败:', error);
    process.exit(1);
  }
}

// 启动服务器
if (require.main === module) {
  startServer();
}

module.exports = app;