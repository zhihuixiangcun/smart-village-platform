/**
 * 智慧村庄平台 - 主应用服务器
 * 集成实时计算引擎的核心服务
 */

// ============================================
// 全局错误处理 - 必须在任何代码之前设置
// ============================================
process.on('uncaughtException', (error) => {
  console.error('\n========================================');
  console.error('UNCAUGHT EXCEPTION - Server Crashing!');
  console.error('========================================');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  console.error('========================================\n');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n========================================');
  console.error('UNHANDLED PROMISE REJECTION');
  console.error('========================================');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  console.error('Stack:', reason?.stack || 'No stack trace');
  console.error('========================================\n');
});

// ============================================
// 首先加载环境变量 - 必须在任何其他模块之前
// ============================================
const dotenv = require('dotenv');
dotenv.config();

// ============================================
// 初始化数据库连接 - 必须在加载模型之前
// ============================================
const database = require('./config/database');
console.log('[DEBUG] Initializing database connection...');
database.connect().then(() => {
  console.log('[DEBUG] ✅ Database connected successfully');
}).catch(err => {
  console.error('[DEBUG] ❌ Database connection failed:', err.message);
  // 继续执行，因为模型会在需要时自动连接
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose');

// ============================================
// 禁用Mongoose自动索引以加快启动速度
// ============================================
mongoose.set('autoIndex', false);
mongoose.set('strictQuery', false); // 宽松查询模式

// 禁用Mongoose警告(临时)
mongoose.set('strict', false);

// ============================================
// 模型初始化管理器 - 必须首先加载
// 确保User模型先于其他模型加载，解决ref引用问题
// ============================================
console.log('[DEBUG] About to load models...');
require('./models');
console.log('[DEBUG] Models loaded successfully');

// 导入实时计算组件
console.log('[DEBUG] Loading realtime components...');
const realtimeIntegrator = require('./integrator/realtimeIntegrator');
console.log('[DEBUG] realtimeIntegrator loaded');
const realtimeTracker = require('./middleware/realtimeTracker');
console.log('[DEBUG] realtimeTracker loaded');
const behaviorTracker = require('./middleware/behaviorTracker');
console.log('[DEBUG] behaviorTracker loaded');

// 导入路由（必须在模型加载之后）
console.log('[DEBUG] Loading routes...');
const realtimeRoutes = require('./routes/realtimeRoutes');
console.log('[DEBUG] realtimeRoutes loaded');
const dataIntegrationRoutes = require('./routes/dataIntegrationRoutes');
console.log('[DEBUG] dataIntegrationRoutes loaded');
// TEMPORARILY DISABLED - causes startup hang
// const massiveDataRoutes = require('./routes/massiveDataRoutes');
// console.log('[DEBUG] massiveDataRoutes loaded');
console.log('[DEBUG] massiveDataRoutes DISABLED (causes startup hang)');
// const apiV1Routes = require('./routes/apiV1'); // Temporarily disabled - missing userController and villageController

// 导入模块路由
// Load minimal auth routes (full auth.js has missing controller methods)
const authRoutes = require('./routes/authMinimal');
console.log('[DEBUG] authMinimalRoutes loaded');
// const residentsRoutes = require('./routes/residents');
// console.log('[DEBUG] residentsRoutes loaded');
// Temporarily disabled - missing residentValidator dependency
// const enhancedResidentsRoutes = require('./routes/enhancedResidents');
// console.log('[DEBUG] enhancedResidentsRoutes loaded');
// Temporarily disabled - missing TaskSchedule model dependency
// const governanceRoutes = require('./routes/governance');
// console.log('[DEBUG] governanceRoutes loaded');
// Temporarily disabled - dependency issues
// const enhancedGovernanceRoutes = require('./routes/enhancedGovernance');
// console.log('[DEBUG] enhancedGovernanceRoutes loaded');
// Temporarily disabled - has undefined callback issue
// const financeRoutes = require('./routes/finance');
// console.log('[DEBUG] financeRoutes loaded');
// Emergency management routes - TEMPORARILY DISABLED due to loading issue
console.log('[DEBUG] emergencyManagementRoutes DISABLED (investigating loading issue)');
// const emergencyManagementRoutes = require('./routes/emergencyManagement');
// const enhancedEmergencyRoutes = require('./routes/enhancedEmergency');
// const ecommerceRoutes = require('./routes/ecommerce');
console.log('[DEBUG] ecommerceRoutes DISABLED (has undefined callbacks)');
// AI chat routes
const aiChatRoutes = require('./routes/aiChat');
console.log('[DEBUG] aiChatRoutes loaded');

// 导入村民管理路由
// TODO: familyRoutes causing startup crash - temporarily disabled
// const familyRoutes = require('./routes/familyRoutes');
// console.log('[DEBUG] familyRoutes loaded');
const familyRoutes = null;
console.log('[DEBUG] About to load residentProfileRoutes...');
// const residentProfileRoutes = require('./routes/residentProfileRoutes');
console.log('[DEBUG] residentProfileRoutes temporarily disabled');
// TEMPORARILY DISABLED - documentController missing functions
// const documentRoutes = require('./routes/documentRoutes');
const documentRoutes = null;
console.log('[DEBUG] documentRoutes DISABLED');
const batchImportRoutes = require('./routes/batchImport');
console.log('[DEBUG] batchImportRoutes loaded');
// TEMPORARILY DISABLED - complex routes causing issues
// const cadreTaskRoutes = require('./routes/cadreTaskRoutes');
console.log('[DEBUG] cadreTaskRoutes DISABLED (troubleshooting)');
// const contentReviewRoutes = require('./routes/contentReviewRoutes');
console.log('[DEBUG] contentReviewRoutes DISABLED (troubleshooting)');
// authRoutes already loaded above
console.log('[DEBUG] authRoutes loaded');
// 用户注册审批系统路由
// const registrationRoutes = require('./routes/registrationRoutes');
console.log('[DEBUG] registrationRoutes temporarily disabled');
// const idCardOCRRoutes = require('./routes/idCardOCRRoutes');
console.log('[DEBUG] idCardOCRRoutes temporarily disabled');
// 采购商路由
// const purchaserRoutes = require('./routes/purchaserRoutes');
console.log('[DEBUG] purchaserRoutes temporarily disabled');

// 导入村务管理路由
// const villageManagementRoutes = require('./routes/villageManagement');
console.log('[DEBUG] villageManagementRoutes temporarily disabled');
// const villageUserRoutes = require('./routes/villageUser');
console.log('[DEBUG] villageUserRoutes temporarily disabled');

// 导入离线数据同步路由 - temporarily disabled
// const syncRoutes = require('./routes/sync.routes');
console.log('[DEBUG] syncRoutes temporarily disabled');

// 导入API文档生成器
console.log('[DEBUG] Loading apiDocumentation...');
const { apiDocGenerator } = require('./utils/apiDocumentation');
console.log('[DEBUG] apiDocumentation loaded');

// 导入工具
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');

dotenv.config();

// MongoDB 连接配置
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart_village';
console.log('[DEBUG] Attempting to connect to MongoDB...');
console.log('[DEBUG] MongoDB URI:', MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')); // 隐藏密码

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // 10 second timeout
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('[DEBUG] MongoDB connected successfully');
  console.log('[DEBUG] Database name:', mongoose.connection.name);
  console.log('[DEBUG] Database host:', mongoose.connection.host);
  console.log('[DEBUG] Database port:', mongoose.connection.port);
})
.catch((err) => {
  console.error('[DEBUG] MongoDB connection error:', err.message);
  console.log('[DEBUG] Application will continue without database connection');
  // Don't exit - allow app to run without DB for development
});

// 监听连接事件
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose 已连接到 MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose 连接错误:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ Mongoose 已断开连接');
});

const app = express();
const PORT = process.env.MAIN_PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 添加全局错误处理来捕获进程退出原因
process.on('uncaughtException', (err) => {
  console.error('[FATAL] 未捕获的异常:', err);
  console.error('[FATAL] 堆栈:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] 未处理的Promise拒绝:', reason);
  console.error('[FATAL] Promise:', promise);
  process.exit(1);
});

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
    'http://localhost:3007',
    'http://localhost:3008',
    'http://localhost:3009',
    'http://localhost:3010',
    'http://localhost:3011',
    'http://localhost:3012',
    'http://127.0.0.1:3006',
    'http://127.0.0.1:3007',
    'http://127.0.0.1:3008',
    'http://127.0.0.1:3009',
    'http://127.0.0.1:3010',
    'http://127.0.0.1:3011',
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

// 请求体大小限制配置 - 安全配置防止 DoS 攻击
// 默认 1MB，可根据环境变量调整
const MAX_BODY_SIZE = process.env.MAX_BODY_SIZE || '1mb';
const MAX_URL_ENCODED_SIZE = process.env.MAX_URL_ENCODED_SIZE || '1mb';

app.use(express.json({
  limit: MAX_BODY_SIZE,
  strict: true  // 严格模式，只接受数组和对象
}));

app.use(express.urlencoded({
  extended: true,
  limit: MAX_URL_ENCODED_SIZE
}));

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
    logger.info('🚀 正在初始化实时计算系统...');

    // 启用实时计算系统
    await realtimeIntegrator.initialize();
    await realtimeIntegrator.start();
    realtimeInitialized = true;
    logger.info('✅ 实时计算系统启动成功');
    setupRealtimeEventListeners();

  } catch (error) {
    logger.error('❌ 实时计算系统初始化失败:', error);
    // 初始化失败时优雅降级，不影响主应用启动
    realtimeInitialized = false;
    logger.warn('⚠️ 实时计算功能已禁用，应用将继续运行');
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

    // Check if all services are healthy or disabled (disabled is acceptable)
    const isHealthy = Object.values(health.services).every(status =>
      status === 'healthy' || status === 'disabled'
    );

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
        massiveDataProcessing: true,
        residents: true,
        governance: true,
        finance: true,
        emergency: true,
        ecommerce: true,
        ai: true
      },
      endpoints: {
        realtime: '/api/v1/realtime/*',
        dataIntegration: '/api/v1/data-integration/*',
        massiveData: '/api/v1/massive-data/*',
        residents: '/api/v1/residents/*',
        governance: '/api/v1/governance/*',
        finance: '/api/v1/finance/*',
        emergency: '/api/v1/emergency/*',
        ecommerce: '/api/v1/ecommerce/*',
        batchImport: '/api/v1/batch-import/*',
        ai: '/api/v1/ai/*'
      },
      modules: {
        residents: {
          name: '村民管理',
          description: '村民档案、家庭关系、统计分析',
          features: ['档案管理', '批量导入', '家庭网络', '统计分析', '照片管理']
        },
        governance: {
          name: '村务治理',
          description: '公告发布、会议管理、任务调度、反馈处理',
          features: ['公告管理', '会议安排', '任务调度', '意见反馈', '工作台']
        },
        finance: {
          name: '财务管理',
          description: '财务记录、预算管理、发票识别、财务报表',
          features: ['收支记录', '预算编制', '发票OCR', '报表生成', '审批流程']
        },
        emergency: {
          name: '应急响应',
          description: '紧急上报、资源调度、应急预案、统计分析',
          features: ['事件上报', '应急预案', '资源管理', '快速响应', '指挥调度']
        },
        ecommerce: {
          name: '电子商务',
          description: '农产品销售、农资采购、团购交易、便民服务',
          features: ['商品管理', '订单处理', '团购活动', '评价系统', '统计分析']
        },
        ai: {
          name: 'AI智能',
          description: '智能问答、语音交互、政策计算、AI填表',
          features: ['智能问答', '语音识别', '方言支持', '政策计算器', 'AI填表']
        }
      }
    }
  });
});

// 导入监控模块
console.log('[DEBUG] Loading monitoring modules...');
const realtimeMonitor = require('./monitoring/realtimeMonitor');
console.log('[DEBUG] realtimeMonitor loaded');
const alertSystem = require('./monitoring/alertSystem');
console.log('[DEBUG] alertSystem loaded');

// API路由
console.log('[DEBUG] Setting up API routes...');
app.use('/api/v1/realtime', realtimeRoutes);
console.log('[DEBUG] realtimeRoutes registered');
app.use('/api/v1/data-integration', dataIntegrationRoutes);
console.log('[DEBUG] dataIntegrationRoutes registered');
// app.use('/api/v1/massive-data', massiveDataRoutes);
console.log('[DEBUG] massiveDataRoutes DISABLED (causes startup hang)');
// app.use('/api/v1', apiV1Routes); // Temporarily disabled - missing userController and villageController

// 认证路由（无需token验证）
app.use('/api/v1/auth', authRoutes);
console.log('[DEBUG] authRoutes registered');

// 智慧村庄模块路由 - TEMPORARILY DISABLED to debug startup
console.log('[DEBUG] About to load residentsRoutes...');
// app.use('/api/v1/residents', residentsRoutes);
console.log('[DEBUG] residentsRoutes TEMPORARILY DISABLED - causing server to hang');
// app.use('/api/v1/residents/enhanced', enhancedResidentsRoutes); // Temporarily disabled
// app.use('/api/v1/governance', governanceRoutes); // Temporarily disabled - TaskSchedule model dependency issue
// console.log('[DEBUG] governanceRoutes registered');
// app.use('/api/v1/governance/enhanced', enhancedGovernanceRoutes); // Temporarily disabled - dependency issues
// console.log('[DEBUG] enhancedGovernanceRoutes registered');
// app.use('/api/v1/finance', financeRoutes); // Temporarily disabled - syntax error in route
// Emergency management routes - TEMPORARILY DISABLED due to loading issue
console.log('[DEBUG] emergencyManagementRoutes DISABLED (investigating loading issue)');
// app.use('/api/v1/emergency', emergencyManagementRoutes);
// app.use('/api/v1/emergency/enhanced', enhancedEmergencyRoutes);
// app.use('/api/v1/ecommerce', ecommerceRoutes);
console.log('[DEBUG] ecommerceRoutes DISABLED (has undefined callbacks)');
// AI chat routes
if (aiChatRoutes) {
  app.use('/api/v1/ai', aiChatRoutes);
  console.log('[DEBUG] aiChatRoutes registered at /api/v1/ai');
}

// 村民管理系统路由 - Temporarily disabled (familyRoutes is null)
// app.use('/api/v1/families', familyRoutes);

// 批量导入路由
if (batchImportRoutes) {
  app.use('/api/v1/batch-import', batchImportRoutes);
  console.log('[DEBUG] batchImportRoutes registered at /api/v1/batch-import');
}

// Dashboard统计路由 - TEMPORARILY DISABLED
console.log('[DEBUG] dashboardRoutes DISABLED (troubleshooting)');
// const dashboardRoutes = require('./routes/dashboard');
// console.log('[DEBUG] dashboardRoutes loaded');
// if (dashboardRoutes) {
//   app.use('/api/v1/dashboard', dashboardRoutes);
//   console.log('[DEBUG] dashboardRoutes registered at /api/v1/dashboard');
// }

// 聊天和好友路由
const chatRoutes = require('./routes/chatRoutes');
const friendRoutes = require('./routes/friendRoutes');
console.log('[DEBUG] chatRoutes and friendRoutes loaded');
app.use('/api/v1/chat', chatRoutes);
console.log('[DEBUG] chatRoutes registered at /api/v1/chat');
app.use('/api/v1/friends', friendRoutes);
console.log('[DEBUG] friendRoutes registered at /api/v1/friends');

// 村干部管理路由 - 新增
const committeeManagementRoutes = require('./routes/committeeManagement');
console.log('[DEBUG] committeeManagementRoutes loaded');
app.use('/api/committee', committeeManagementRoutes);
console.log('[DEBUG] committeeManagementRoutes registered at /api/committee');

// 人口管理路由 - 新增 (村民分组、人口变动)
const populationManagementRoutes = require('./routes/populationManagement');
console.log('[DEBUG] populationManagementRoutes loaded');
app.use('/api/population', populationManagementRoutes);
console.log('[DEBUG] populationManagementRoutes registered at /api/population');

// app.use('/api/v1/resident-profiles', residentProfileRoutes);
console.log('[DEBUG] residentProfileRoutes temporarily disabled');
// app.use('/api/v1/documents', documentRoutes);
// app.use('/api/v1/documents', documentRoutes);
// console.log('[DEBUG] documentRoutes registered at /api/v1/documents');

// 村务管理系统路由 - TEMPORARILY DISABLED
// app.use('/api/village-management', villageManagementRoutes);
console.log('[DEBUG] villageManagementRoutes temporarily disabled');

// 村民用户系统路由 - TEMPORARILY DISABLED
// app.use('/api/village-users', villageUserRoutes);
console.log('[DEBUG] villageUserRoutes temporarily disabled');

// 政策计算器系统路由 - Temporarily disabled due to missing pdfkit module
// app.use('/api/v1/policy-calculator', require('./routes/policyCalculator'));

// OCR票据识别系统路由 - Temporarily disabled due to TensorFlow native addon issue
// app.use('/api/v1/ocr', require('./routes/ocr'));

// 家庭代理系统路由 - Temporarily disabled due to undefined function error
// app.use('/api/v1/family-proxy', require('./routes/familyProxy'));

// 实时计算引擎路由 - Temporarily disabled due to undefined callback error
// app.use('/api/v1/realtime-computation', require('./routes/realtimeComputation'));

// 离线数据同步路由 - RE-ENABLED
// console.log('[DEBUG] syncRoutes temporarily disabled');

// 村干部任务管理路由 - 四象限任务管理 - DISABLED (variable not defined)
// console.log('[DEBUG] cadreTaskRoutes DISABLED (troubleshooting)');

// 内容审核路由 - DISABLED (variable not defined)
// console.log('[DEBUG] contentReviewRoutes DISABLED (troubleshooting)');

// 统一认证路由 - 密码登录、人脸识别、微信登录、注册
if (authRoutes) {
  app.use('/api/v1/auth', authRoutes);
  console.log('[DEBUG] authRoutes registered at /api/v1/auth');
}

// 用户注册审批系统路由 - DISABLED (variable not defined)
// if (registrationRoutes) {
//   app.use('/api/v1/registration', registrationRoutes);
//   console.log('[DEBUG] registrationRoutes registered at /api/v1/registration');
// }
// if (idCardOCRRoutes) {
//   app.use('/api/v1/ocr', idCardOCRRoutes);
//   console.log('[DEBUG] idCardOCRRoutes registered at /api/v1/ocr');
// }

// 采购商路由 - DISABLED (variable not defined)
// if (purchaserRoutes) {
//   app.use('/api/v1/purchaser', purchaserRoutes);
//   console.log('[DEBUG] purchaserRoutes registered at /api/v1/purchaser');
// }
console.log('[DEBUG] registrationRoutes, idCardOCRRoutes, purchaserRoutes DISABLED (troubleshooting)');

// 安全中间件集成 - Temporarily disabled to debug startup issue
console.log('[DEBUG] Skipping security middleware for now...');
console.log('[DEBUG] After skipping security middleware');
// const SecurityMiddleware = require('./security/securityMiddleware');
// console.log('[DEBUG] SecurityMiddleware loaded');
// const securityMiddleware = new SecurityMiddleware();
// console.log('[DEBUG] SecurityMiddleware instance created');

// 应用安全中间件
// console.log('[DEBUG] Applying security middleware...');
// securityMiddleware.applySecurity(app);
// console.log('[DEBUG] Security middleware applied');
console.log('[DEBUG] About to continue with API endpoints...');

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

// 监控系统路由 - 新的仪表板
app.get('/monitoring', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'monitoring-dashboard.html'));
});

// 监控仪表板
app.get('/monitoring-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'monitoring-dashboard.html'));
});

// API监控状态
app.get('/api/monitoring/status', (req, res) => {
  res.json({
    success: true,
    data: realtimeMonitor.getMonitoringReport(),
    message: '监控数据获取成功'
  });
});

// 获取实时指标
app.get('/api/monitoring/metrics', (req, res) => {
  res.json({
    success: true,
    data: realtimeMonitor.getMetrics(),
    message: '实时指标获取成功'
  });
});

// 获取历史数据
app.get('/api/monitoring/history', (req, res) => {
  const { type = 'all', limit = 100 } = req.query;
  res.json({
    success: true,
    data: realtimeMonitor.getRecentHistory({ type, limit: parseInt(limit) }),
    message: '历史数据获取成功'
  });
});

// 告警系统API
app.get('/api/monitoring/alerts', (req, res) => {
  const { level, activeOnly = 'false' } = req.query;

  let alerts = alertSystem.getActiveAlerts();

  // 过滤告警级别
  if (level) {
    alerts = alerts.filter(alert => alert.level === level);
  }

  // 过滤活跃告警
  if (activeOnly === 'true') {
    const now = Date.now();
    alerts = alerts.filter(alert =>
      !alert.resolvedAt || alert.resolvedAt > now
    );
  }

  res.json({
    success: true,
    data: alerts,
    count: alerts.length,
    message: '告警数据获取成功'
  });
});

// 创建告警规则
app.post('/api/monitoring/alerts/rules', (req, res) => {
  try {
    const ruleData = req.body;
    const ruleId = alertSystem.addRule(ruleData);

    res.json({
      success: true,
      data: { ruleId },
      message: '告警规则创建成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      message: '告警规则创建失败'
    });
  }
});

// 获取告警规则
app.get('/api/monitoring/alerts/rules', (req, res) => {
  const rules = alertSystem.getRules();

  res.json({
    success: true,
    data: rules,
    count: rules.length,
    message: '告警规则获取成功'
  });
});

// 删除告警规则
app.delete('/api/monitoring/alerts/rules/:ruleId', (req, res) => {
  const { ruleId } = req.params;

  try {
    alertSystem.removeRule(ruleId);
    res.json({
      success: true,
      message: '告警规则删除成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      message: '告警规则删除失败'
    });
  }
});

// 手动触发告警测试
app.post('/api/monitoring/alerts/test', (req, res) => {
  try {
    const { level, message, metric, value } = req.body;

    alertSystem.checkThresholds({
      [metric]: value
    }, {
      timestamp: new Date(),
      metric,
      value
    });

    res.json({
      success: true,
      message: '告警测试触发成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      message: '告警测试触发失败'
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
console.error('[DEBUG] Before 404 handler');
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
      '/api/v1/auth/*',
      '/api/v1/realtime/*',
      '/api/v1/data-integration/*',
      '/api/v1/massive-data/*',
      '/api/v1/residents/*',
      '/api/v1/governance/*',
      '/api/v1/finance/*',
      '/api/v1/emergency/*',
      '/api/v1/ecommerce/*',
      '/api/v1/ai/*',
      '/api/v1/performance',
      '/api/committee/*',
      '/api/population/*'
    ],
    requestId: req.id
  });
});

console.error('[DEBUG] After 404 handler');
// 全局错误处理
app.use(errorHandler);
console.error('[DEBUG] After error handler');

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
console.error('[DEBUG] Before checking if main module');
console.log('[DEBUG] Checking if main module:', require.main === module);
if (require.main === module) {
  console.log('[DEBUG] About to call startServer()');
  startServer();
} else {
  console.log('[DEBUG] Not main module, skipping startServer()');
}

module.exports = app;