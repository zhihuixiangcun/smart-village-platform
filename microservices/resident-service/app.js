/**
 * 智慧乡村平台 - 村民服务
 * 负责村民档案、家庭管理、统计分析
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// 导入服务组件
const ResidentService = require('./src/services/ResidentService');
const FamilyService = require('./src/services/FamilyService');
const StatisticsService = require('./src/services/StatisticsService');
const ServiceRegistry = require('./src/utils/ServiceRegistry');
const Logger = require('./src/utils/Logger');
const ErrorHandler = require('./src/middleware/ErrorHandler');

// 导入路由
const residentRoutes = require('./src/routes/residents');
const familyRoutes = require('./src/routes/families');
const statisticsRoutes = require('./src/routes/statistics');
const documentRoutes = require('./src/routes/documents');

// 导入中间件
const authMiddleware = require('./src/middleware/auth');
const rateLimit = require('./src/middleware/rateLimit');

dotenv.config();

const app = express();
const PORT = process.env.RESIDENT_SERVICE_PORT || 3003;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 信任代理（用于负载均衡器）
app.set('trust proxy', 1);

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\''],
      scriptSrc: ['\'self\''],
      imgSrc: ['\'self\'', 'data:', 'https:'],
      connectSrc: ['\'self\'', 'ws:', 'wss:']
    }
  }
}));

app.use(compression());
app.use(cors({
  origin: [
    process.env.API_GATEWAY_URL || 'http://localhost:3000',
    process.env.CLIENT_URL || 'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'X-Service-Token',
    'X-User-Id'
  ]
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 日志中间件
if (NODE_ENV === 'production') {
  app.use(morgan('combined', {
    stream: { write: message => Logger.info(message.trim()) }
  }));
} else {
  app.use(morgan('dev'));
}

// 请求ID中间件
app.use((req, res, next) => {
  req.id = require('crypto').randomUUID();
  res.setHeader('X-Request-ID', req.id);
  Logger.info(`[${req.id}] ${req.method} ${req.path}`, {
    requestId: req.id,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  next();
});

// 速率限制
app.use(rateLimit.globalLimiter);

// 服务初始化
let residentService;
let familyService;
let statisticsService;
let serviceRegistry;

/**
 * 初始化服务
 */
async function initializeServices() {
  try {
    Logger.info('🚀 正在初始化村民服务...');

    // 初始化服务
    residentService = new ResidentService();
    familyService = new FamilyService();
    statisticsService = new StatisticsService();

    // 连接数据库
    await residentService.connect();
    await familyService.connect();

    // 初始化服务注册
    serviceRegistry = new ServiceRegistry();
    await serviceRegistry.register({
      name: 'resident-service',
      port: PORT,
      health: '/health',
      endpoints: {
        residents: '/api/v1/residents',
        families: '/api/v1/families',
        statistics: '/api/v1/statistics',
        documents: '/api/v1/documents'
      }
    });

    Logger.info('✅ 村民服务初始化完成');

  } catch (error) {
    Logger.error('❌ 村民服务初始化失败:', error);
    process.exit(1);
  }
}

// 健康检查端点
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: NODE_ENV,
      service: 'resident-service',
      port: PORT,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      database: await residentService?.checkHealth() || 'unknown',
      redis: await statisticsService?.checkRedisHealth() || 'unknown',
      serviceRegistry: await serviceRegistry?.checkHealth() || 'unknown'
    };

    const isHealthy = health.status === 'healthy' &&
                      health.database === 'connected';

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      data: health,
      requestId: req.id
    });

  } catch (error) {
    Logger.error('健康检查失败:', error);
    res.status(500).json({
      success: false,
      error: '健康检查失败',
      requestId: req.id,
      timestamp: new Date().toISOString()
    });
  }
});

// 服务信息端点
app.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      name: '智慧乡村村民服务',
      version: '1.0.0',
      description: '负责村民档案、家庭管理、统计分析',
      features: [
        '村民档案管理',
        '家庭关系管理',
        '统计分析报表',
        '文档管理',
        '批量导入导出',
        '人口统计分析',
        '家庭结构分析',
        '数据可视化'
      ],
      endpoints: {
        residents: '/api/v1/residents',
        families: '/api/v1/families',
        statistics: '/api/v1/statistics',
        documents: '/api/v1/documents'
      },
      technologies: {
        framework: 'Express.js',
        database: 'MongoDB',
        cache: 'Redis',
        analytics: 'Custom Statistics Engine',
        serviceDiscovery: 'Consul'
      }
    },
    requestId: req.id
  });
});

// API路由
app.use('/api/v1/residents', authMiddleware.verifyToken, residentRoutes);
app.use('/api/v1/families', authMiddleware.verifyToken, familyRoutes);
app.use('/api/v1/statistics', authMiddleware.verifyToken, statisticsRoutes);
app.use('/api/v1/documents', authMiddleware.verifyToken, documentRoutes);

// 服务间通信端点
app.post('/internal/get-resident', async (req, res) => {
  try {
    const { residentId, userId } = req.body;

    if (!residentId && !userId) {
      return res.status(400).json({
        success: false,
        error: 'residentId or userId is required'
      });
    }

    const resident = await residentService.getResidentById(residentId, userId);

    if (!resident) {
      return res.status(404).json({
        success: false,
        error: 'Resident not found'
      });
    }

    res.json({
      success: true,
      data: resident,
      requestId: req.id
    });

  } catch (error) {
    Logger.error('获取村民信息失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get resident info',
      requestId: req.id
    });
  }
});

// 获取家庭成员
app.post('/internal/get-family-members', async (req, res) => {
  try {
    const { familyId } = req.body;

    if (!familyId) {
      return res.status(400).json({
        success: false,
        error: 'familyId is required'
      });
    }

    const members = await residentService.getFamilyMembers(familyId);

    res.json({
      success: true,
      data: members,
      requestId: req.id
    });

  } catch (error) {
    Logger.error('获取家庭成员失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get family members',
      requestId: req.id
    });
  }
});

// 统计数据查询
app.post('/internal/get-statistics', async (req, res) => {
  try {
    const { villageId, type, timeRange } = req.body;

    const statistics = await statisticsService.getStatistics({
      villageId,
      type,
      timeRange
    });

    res.json({
      success: true,
      data: statistics,
      requestId: req.id
    });

  } catch (error) {
    Logger.error('获取统计数据失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      requestId: req.id
    });
  }
});

// 数据导出
app.post('/internal/export-data', async (req, res) => {
  try {
    const { villageId, dataType, format, filters } = req.body;

    const exportData = await statisticsService.exportData({
      villageId,
      dataType,
      format: format || 'json',
      filters
    });

    res.json({
      success: true,
      data: exportData,
      requestId: req.id
    });

  } catch (error) {
    Logger.error('数据导出失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export data',
      requestId: req.id
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
      '/info',
      '/api/v1/residents/*',
      '/api/v1/families/*',
      '/api/v1/statistics/*',
      '/api/v1/documents/*',
      '/internal/*'
    ],
    requestId: req.id
  });
});

// 全局错误处理
app.use(ErrorHandler.handle);

/**
 * 启动村民服务
 */
async function startResidentService() {
  try {
    Logger.info('🚀 启动智慧乡村村民服务...');

    // 初始化服务
    await initializeServices();

    // 启动HTTP服务器
    const server = app.listen(PORT, () => {
      Logger.info('✅ 智慧乡村村民服务启动成功');
      Logger.info(`🌐 服务地址: http://localhost:${PORT}`);
      Logger.info(`🏥 健康检查: http://localhost:${PORT}/health`);
      Logger.info(`📋 服务信息: http://localhost:${PORT}/info`);
      Logger.info(`👥 村民管理: http://localhost:${PORT}/api/v1/residents`);
      Logger.info(`👨‍👩‍👧‍👦 家庭管理: http://localhost:${PORT}/api/v1/families`);
      Logger.info(`📊 统计分析: http://localhost:${PORT}/api/v1/statistics`);
      Logger.info(`📄 文档管理: http://localhost:${PORT}/api/v1/documents`);

      Logger.info('🌟 服务特性:');
      Logger.info('   - 村民档案管理: ✅');
      Logger.info('   - 家庭关系管理: ✅');
      Logger.info('   - 人口统计分析: ✅');
      Logger.info('   - 批量导入导出: ✅');
      Logger.info('   - 数据可视化: ✅');
      Logger.info('   - 智能搜索: ✅');
    });

    // 设置服务器超时
    server.timeout = 30000;
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;

    // 优雅关闭处理
    const gracefulShutdown = async (signal) => {
      Logger.info(`🛑 收到${signal}信号，正在优雅关闭村民服务...`);

      server.close(async () => {
        Logger.info('📡 HTTP服务器已关闭');

        try {
          // 注销服务
          if (serviceRegistry) {
            await serviceRegistry.deregister();
            Logger.info('🔄 服务注册已取消');
          }

          // 关闭数据库连接
          if (residentService) {
            await residentService.disconnect();
            Logger.info('🗄️ 数据库连接已关闭');
          }

          Logger.info('✅ 智慧乡村村民服务已安全关闭');
          process.exit(0);

        } catch (error) {
          Logger.error('❌ 关闭过程中出错:', error);
          process.exit(1);
        }
      });

      // 强制关闭超时
      setTimeout(() => {
        Logger.error('⚠️ 强制关闭村民服务');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // 未捕获异常处理
    process.on('uncaughtException', (error) => {
      Logger.error('❌ 未捕获的异常:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      Logger.error('❌ 未处理的Promise拒绝:', { reason, promise });
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    Logger.error('❌ 智慧乡村村民服务启动失败:', error);
    process.exit(1);
  }
}

// 启动服务
if (require.main === module) {
  startResidentService();
}

module.exports = app;