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
const mongoose = require('mongoose');

// ============================================
// 禁用Mongoose自动索引以加快启动速度
// ============================================
mongoose.set('autoIndex', false);
mongoose.set('strictQuery', false); // 宽松查询模式

// 禁用Mongoose警告（临时）
mongoose.set('strict', false);

// ============================================
// 模型初始化管理器 - 必须首先加载
// 确保User模型先于其他模型加载，解决ref引用问题
// ============================================
require('./models');

// 重要：首先加载所有Mongoose模型，确保正确的加载顺序
require('./models');

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
const massiveDataRoutes = require('./routes/massiveDataRoutes');
console.log('[DEBUG] massiveDataRoutes loaded');
// const apiV1Routes = require('./routes/apiV1'); // Temporarily disabled - missing userController and villageController

// 导入模块路由
const authRoutes = require('./routes/auth');
console.log('[DEBUG] authRoutes loaded');
const residentsRoutes = require('./routes/residents');
console.log('[DEBUG] residentsRoutes loaded');
const enhancedResidentsRoutes = require('./routes/enhancedResidents');
console.log('[DEBUG] enhancedResidentsRoutes loaded');
const governanceRoutes = require('./routes/governance');
console.log('[DEBUG] governanceRoutes loaded');
const enhancedGovernanceRoutes = require('./routes/enhancedGovernance');
console.log('[DEBUG] enhancedGovernanceRoutes loaded');
const financeRoutes = require('./routes/finance');
console.log('[DEBUG] financeRoutes loaded');
const emergencyManagementRoutes = require('./routes/emergencyManagement');
console.log('[DEBUG] emergencyManagementRoutes loaded');
const enhancedEmergencyRoutes = require('./routes/enhancedEmergency');
console.log('[DEBUG] enhancedEmergencyRoutes loaded');
const ecommerceRoutes = require('./routes/ecommerce');
console.log('[DEBUG] ecommerceRoutes loaded');
const aiChatRoutes = require('./routes/aiChat');
console.log('[DEBUG] aiChatRoutes loaded');

// 导入村民管理路由
const familyRoutes = require('./routes/familyRoutes');
console.log('[DEBUG] familyRoutes loaded');
const residentProfileRoutes = require('./routes/residentProfileRoutes');
console.log('[DEBUG] residentProfileRoutes loaded');
const documentRoutes = require('./routes/documentRoutes');
const batchImportRoutes = require('./routes/batchImport');
console.log('[DEBUG] batchImportRoutes loaded');
const pointsRoutes = require('./routes/points');
console.log('[DEBUG] pointsRoutes loaded');
console.log('[DEBUG] documentRoutes loaded');

// 导入村务管理路由
const villageManagementRoutes = require('./routes/villageManagement');
console.log('[DEBUG] villageManagementRoutes loaded');
const villageUserRoutes = require('./routes/villageUser');
console.log('[DEBUG] villageUserRoutes loaded');

// 导入村委管理路由
const committeeRoutes = require('./routes/committee');
console.log('[DEBUG] committeeRoutes loaded');
const dutyScheduleRoutes = require('./routes/dutySchedule');
console.log('[DEBUG] dutyScheduleRoutes loaded');
const villageMapRoutes = require('./routes/villageMap');
console.log('[DEBUG] villageMapRoutes loaded');
const committeeDocumentsRoutes = require('./routes/committeeDocuments');
console.log('[DEBUG] committeeDocumentsRoutes loaded');

// 导入API文档生成器
console.log('[DEBUG] Loading apiDocumentation...');
const { apiDocGenerator } = require('./utils/apiDocumentation');
console.log('[DEBUG] apiDocumentation loaded');

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
        points: '/api/v1/points/*',
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
const realtimeMonitor = require('./monitoring/realtimeMonitor');
const alertSystem = require('./monitoring/alertSystem');

// API路由
app.use('/api/v1/realtime', realtimeRoutes);
app.use('/api/v1/data-integration', dataIntegrationRoutes);
app.use('/api/v1/massive-data', massiveDataRoutes);
// app.use('/api/v1', apiV1Routes); // Temporarily disabled - missing userController and villageController

// 认证路由（无需token验证）
app.use('/api/v1/auth', authRoutes);

// 智慧村庄模块路由
app.use('/api/v1/residents', residentsRoutes);
app.use('/api/v1/residents/enhanced', enhancedResidentsRoutes);
app.use('/api/v1/governance', governanceRoutes);
app.use('/api/v1/governance/enhanced', enhancedGovernanceRoutes);
app.use('/api/v1/finance', financeRoutes);
app.use('/api/v1/emergency', emergencyManagementRoutes);
app.use('/api/v1/emergency/enhanced', enhancedEmergencyRoutes);
app.use('/api/v1/ecommerce', ecommerceRoutes);
app.use('/api/v1/ai', aiChatRoutes);

// 村民管理系统路由
app.use('/api/v1/families', familyRoutes);
// 批量导入路由
app.use('/api/v1/batch-import', batchImportRoutes);
// 积分系统路由
app.use('/api/v1/points', pointsRoutes);
app.use('/api/v1/resident-profiles', residentProfileRoutes);
app.use('/api/v1/documents', documentRoutes);

// 村务管理系统路由
app.use('/api/village-management', villageManagementRoutes);

// 村民用户系统路由
app.use('/api/village-users', villageUserRoutes);

// 村委管理系统路由
app.use('/api/v1/committee', committeeRoutes);
app.use('/api/v1/duty-schedule', dutyScheduleRoutes);
app.use('/api/v1/village-map', villageMapRoutes);
app.use('/api/v1/committee-documents', committeeDocumentsRoutes);

// 政策计算器系统路由
app.use('/api/v1/policy-calculator', require('./routes/policyCalculator'));

// OCR票据识别系统路由
app.use('/api/v1/ocr', require('./routes/ocr'));

// 家庭代理系统路由
app.use('/api/v1/family-proxy', require('./routes/familyProxy'));

// 实时计算引擎路由
app.use('/api/v1/realtime-computation', require('./routes/realtimeComputation'));

// 安全中间件集成
const SecurityMiddleware = require('./security/securityMiddleware');
const securityMiddleware = new SecurityMiddleware();

// 应用安全中间件
securityMiddleware.applySecurity(app);

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
      '/api/v1/residents/*',
      '/api/v1/governance/*',
      '/api/v1/finance/*',
      '/api/v1/emergency/*',
      '/api/v1/ecommerce/*',
      '/api/v1/ai/*',
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