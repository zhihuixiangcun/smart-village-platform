/**
 * 智慧乡村平台 - 统一应用服务器
 * 整合原 src/app.js 和 server/app.js 的所有功能
 *
 * 功能整合：
 * - 主API服务（实时计算引擎、监控、API文档）
 * - Socket.IO实时通信（村庄房间、应急广播）
 * - 统一数据库连接和模型加载
 * - 统一路由和中间件
 */

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

// ============================================
// 禁用Mongoose自动索引以加快启动速度
// ============================================
mongoose.set('autoIndex', false);
mongoose.set('strictQuery', false);
mongoose.set('strict', false);

// ============================================
// 模型初始化管理器 - 必须首先加载
// ============================================
require('./models');

// ============================================
// 导入实时计算组件
// ============================================
console.log('[DEBUG] Loading realtime components...');
const realtimeIntegrator = require('./integrator/realtimeIntegrator');
const realtimeTracker = require('./middleware/realtimeTracker');
const behaviorTracker = require('./middleware/behaviorTracker');

// ============================================
// 导入路由
// ============================================
console.log('[DEBUG] Loading routes...');
const realtimeRoutes = require('./routes/realtimeRoutes');
const dataIntegrationRoutes = require('./routes/dataIntegrationRoutes');
const massiveDataRoutes = require('./routes/massiveDataRoutes');

const authRoutes = require('./routes/auth');
const residentsRoutes = require('./routes/residents');
const enhancedResidentsRoutes = require('./routes/enhancedResidents');
const governanceRoutes = require('./routes/governance');
const enhancedGovernanceRoutes = require('./routes/enhancedGovernance');
const financeRoutes = require('./routes/finance');
const emergencyManagementRoutes = require('./routes/emergencyManagement');
const enhancedEmergencyRoutes = require('./routes/enhancedEmergency');
const ecommerceRoutes = require('./routes/ecommerce');
const aiChatRoutes = require('./routes/aiChat');

const familyRoutes = require('./routes/familyRoutes');
const residentProfileRoutes = require('./routes/residentProfileRoutes');
const documentRoutes = require('./routes/documentRoutes');
const villageManagementRoutes = require('./routes/villageManagement');
const villageUserRoutes = require('./routes/villageUser');
const villageMapRoutes = require('./routes/villageMap');

// 额外的核心路由
const userFeedbackRoutes = require('./routes/userFeedback');

// ============================================
// 导入API文档和工具
// ============================================
const { apiDocGenerator } = require('./utils/apiDocumentation');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// ============================================
// 导入监控模块
// ============================================
const realtimeMonitor = require('./monitoring/realtimeMonitor');
const alertSystem = require('./monitoring/alertSystem');

// ============================================
// 导入安全中间件
// ============================================
const SecurityMiddleware = require('./security/securityMiddleware');
const securityMiddleware = new SecurityMiddleware();

// ============================================
// 导入i18n国际化中间件
// ============================================
const { i18n, i18nMiddleware } = require('./middleware/i18nMiddleware');

dotenv.config();

const app = express();
const server = http.createServer(app);

// ============================================
// Socket.IO 设置
// ============================================
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL || 'http://localhost:3000',
      'http://localhost:3006',
      'http://localhost:3012',
      'http://127.0.0.1:3006',
      'http://127.0.0.1:3012'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// 使 io 可被路由访问
app.set('io', io);

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 信任代理
app.set('trust proxy', 1);

// ============================================
// 基础中间件
// ============================================
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

// 统一请求体大小限制
const MAX_BODY_SIZE = process.env.MAX_BODY_SIZE || '10mb';
app.use(express.json({ limit: MAX_BODY_SIZE, strict: true }));
app.use(express.urlencoded({ extended: true, limit: MAX_BODY_SIZE }));

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

// ============================================
// 实时计算系统初始化
// ============================================
let realtimeInitialized = false;

async function initializeRealtimeSystem() {
  try {
    logger.info('🚀 正在初始化实时计算系统...');
    await realtimeIntegrator.initialize();
    await realtimeIntegrator.start();
    realtimeInitialized = true;
    logger.info('✅ 实时计算系统启动成功');
    setupRealtimeEventListeners();
  } catch (error) {
    logger.error('❌ 实时计算系统初始化失败:', error);
    realtimeInitialized = false;
    logger.warn('⚠️ 实时计算功能已禁用，应用将继续运行');
  }
}

function setupRealtimeEventListeners() {
  realtimeIntegrator.on('dataProcessed', (event) => {
    logger.debug('📝 实时数据处理完成', {
      dataType: event.dataType,
      timestamp: event.timestamp
    });
  });

  realtimeIntegrator.on('alertTriggered', (alert) => {
    logger.warn('⚠️ 实时预警触发', {
      rule: alert.ruleName,
      severity: alert.severity,
      message: alert.message
    });

    // 通过Socket.IO广播紧急告警
    io.emit('system-alert', alert);

    if (alert.severity === 'critical') {
      sendEmergencyNotification(alert);
    }
  });

  realtimeIntegrator.on('healthCheckFailed', (checks) => {
    logger.error('❌ 实时系统健康检查失败', checks);
  });

  realtimeIntegrator.on('metricUpdated', (event) => {
    if (event.metricName === 'system_error_rate' && event.value > 0.05) {
      logger.warn('🚨 系统错误率过高', {
        metric: event.metricName,
        value: event.value
      });
    }
  });
}

async function sendEmergencyNotification(alert) {
  try {
    logger.error('🚨 紧急通知发送', {
      alert: alert.ruleName,
      message: alert.message,
      timestamp: new Date().toISOString()
    });
    // 这里可以集成短信、邮件、钉钉等通知服务
  } catch (error) {
    logger.error('发送紧急通知失败:', error);
  }
}

// ============================================
// 应用级中间件
// ============================================
app.use((req, res, next) => {
  req.id = require('crypto').randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// 实时跟踪中间件
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

// i18n 国际化中间件 - 自动语言检测和翻译
app.use(i18n());

// ============================================
// Socket.IO 连接处理
// ============================================
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log(`Socket.IO client connected: ${socket.id}`);

  // 加入村庄房间
  socket.on('join-village', (data) => {
    const { villageId, userId } = data;
    const room = `village-${villageId}`;
    socket.join(room);

    onlineUsers.set(socket.id, { villageId, userId, joinedAt: new Date() });

    // 通知房间内其他人
    socket.to(room).emit('user-joined', {
      userId,
      socketId: socket.id,
      timestamp: new Date()
    });

    // 发送确认
    socket.emit('joined-village', {
      villageId,
      room,
      onlineCount: onlineUsers.size
    });

    console.log(`User ${userId} joined village ${villageId}, room: ${room}`);
  });

  // 离开村庄房间
  socket.on('leave-village', (data) => {
    const { villageId } = data;
    const room = `village-${villageId}`;
    socket.leave(room);

    const user = onlineUsers.get(socket.id);
    if (user) {
      socket.to(room).emit('user-left', {
        userId: user.userId,
        socketId: socket.id,
        timestamp: new Date()
      });
      onlineUsers.delete(socket.id);
    }

    console.log(`User left village ${villageId}`);
  });

  // 发送公告到村庄
  socket.on('send-announcement', (data) => {
    const { villageId, announcement } = data;
    const room = `village-${villageId}`;

    // 广播到村庄
    io.to(room).emit('new-announcement', {
      id: require('crypto').randomUUID(),
      ...announcement,
      villageId,
      createdAt: new Date()
    });

    console.log(`Announcement sent to village ${villageId}`);
  });

  // 应急广播
  socket.on('emergency-broadcast', (data) => {
    const { villageId, emergency } = data;

    // 广播到村庄所有客户端
    io.to(`village-${villageId}`).emit('emergency-alert', {
      id: require('crypto').randomUUID(),
      ...emergency,
      villageId,
      timestamp: new Date()
    });

    // 同时广播到管理监控室
    io.emit('emergency-admin-alert', {
      id: require('crypto').randomUUID(),
      ...emergency,
      villageId,
      timestamp: new Date()
    });

    console.log(`Emergency broadcast sent to village ${villageId}:`, emergency.type);
  });

  // 提交建议
  socket.on('submit-suggestion', (data) => {
    const { villageId, suggestion } = data;

    // 通知村庄管理员
    io.to(`village-${villageId}`).emit('new-suggestion', {
      id: require('crypto').randomUUID(),
      ...suggestion,
      villageId,
      createdAt: new Date()
    });

    socket.emit('suggestion-submitted', {
      success: true,
      message: '建议已提交'
    });

    console.log(`Suggestion submitted for village ${villageId}`);
  });

  // 村庄聊天/消息
  socket.on('village-message', (data) => {
    const { villageId, userId, message } = data;
    const room = `village-${villageId}`;

    io.to(room).emit('village-message-broadcast', {
      id: require('crypto').randomUUID(),
      villageId,
      userId,
      message,
      timestamp: new Date()
    });
  });

  // 输入状态指示
  socket.on('typing', (data) => {
    const { villageId, userId } = data;
    const room = `village-${villageId}`;
    socket.to(room).emit('user-typing', { userId, socketId: socket.id });
  });

  // 断开连接处理
  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      const room = `village-${user.villageId}`;
      socket.to(room).emit('user-left', {
        userId: user.userId,
        socketId: socket.id,
        timestamp: new Date()
      });
      onlineUsers.delete(socket.id);
    }
    console.log(`Socket.IO client disconnected: ${socket.id}`);
  });

  // 错误处理
  socket.on('error', (error) => {
    console.error(`Socket.IO error for ${socket.id}:`, error);
  });
});

// ============================================
// 健康检查端点
// ============================================
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '2.0.0',
      environment: NODE_ENV,
      services: {
        realtime: realtimeInitialized ? 'healthy' : 'disabled',
        main: 'healthy',
        socket: 'healthy'
      },
      socket: {
        connected: io.engine.clientsCount(),
        rooms: Object.keys(io.sockets.adapter.rooms).length
      },
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };

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

// ============================================
// API信息端点
// ============================================
app.get('/api/v1/info', (req, res) => {
  res.json({
    success: true,
    data: {
      name: '智慧乡村平台统一服务',
      version: '2.0.0',
      environment: NODE_ENV,
      features: {
        realtime: realtimeInitialized,
        monitoring: true,
        socketIO: true,
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
        ai: '/api/v1/ai/*'
      },
      socketIO: {
        url: `ws://localhost:${PORT}`,
        events: [
          'join-village',
          'leave-village',
          'send-announcement',
          'emergency-broadcast',
          'submit-suggestion',
          'village-message',
          'typing'
        ]
      }
    }
  });
});

// ============================================
// API 路由
// ============================================
// 实时计算引擎路由
app.use('/api/v1/realtime', realtimeRoutes);
app.use('/api/v1/data-integration', dataIntegrationRoutes);
app.use('/api/v1/massive-data', massiveDataRoutes);

// 认证路由（无需token验证）
app.use('/api/v1/auth', authRoutes);

// i18n 国际化路由
app.get('/api/v1/i18n/languages', (req, res) => {
  res.json({
    success: true,
    languages: i18nMiddleware.getSupportedLanguagesInfo()
  });
});

app.post('/api/v1/i18n/switch', i18nMiddleware.createLanguageSwitchHandler());

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
app.use('/api/v1/resident-profiles', residentProfileRoutes);
app.use('/api/v1/documents', documentRoutes);

// 村务管理系统路由
app.use('/api/v1/village-management', villageManagementRoutes);
app.use('/api/v1/village-users', villageUserRoutes);

// 村庄地图路由
app.use('/api/v1/village-map', villageMapRoutes);

// 政策计算器系统路由
app.use('/api/v1/policy-calculator', require('./routes/policyCalculator'));

// OCR票据识别系统路由
app.use('/api/v1/ocr', require('./routes/ocr'));

// 家庭代理系统路由
app.use('/api/v1/family-proxy', require('./routes/familyProxy'));

// 实时计算引擎路由
app.use('/api/v1/realtime-computation', require('./routes/realtimeComputation'));

// ============================================
// 新增核心路由
// ============================================
// 用户反馈系统
app.use('/api/v1/feedback', userFeedbackRoutes);

// 已修复的路由（现已启用）
app.use('/api/v1/duty-schedule', require('./routes/dutySchedule'));
app.use('/api/v1/face-recognition', require('./routes/faceRecognition'));
app.use('/api/v1/analytics', require('./routes/analyticsRoutes'));
app.use('/api/v1/household', require('./routes/household'));
app.use('/api/v1/household-qr', require('./routes/householdQR'));
app.use('/api/v1/permissions', require('./routes/permission'));
app.use('/api/v1/speech', require('./routes/speech'));
app.use('/api/v1/voting', require('./routes/voting'));

// ============================================
// 安全中间件集成
// ============================================
securityMiddleware.applySecurity(app);

// ============================================
// 实时计算状态API
// ============================================
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

// ============================================
// 实时订阅端点 (Server-Sent Events)
// ============================================
app.get('/api/v1/realtime/subscribe', (req, res) => {
  try {
    if (!realtimeInitialized) {
      return res.status(503).json({
        success: false,
        error: '实时计算系统未初始化'
      });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const heartbeat = setInterval(() => {
      res.write('event: heartbeat\n');
      res.write(`data: ${JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString(),
        status: 'connected'
      })}\n\n`);
    }, 30000);

    res.write('event: connected\n');
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      message: '实时事件订阅成功',
      timestamp: new Date().toISOString(),
      id: req.id
    })}\n\n`);

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

    Object.entries(listeners).forEach(([event, listener]) => {
      realtimeIntegrator.on(event, listener);
    });

    req.on('close', () => {
      clearInterval(heartbeat);
      Object.entries(listeners).forEach(([event, listener]) => {
        realtimeIntegrator.removeListener(event, listener);
      });
      logger.info('客户端断开实时订阅', { requestId: req.id });
    });

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

// ============================================
// 性能监控端点
// ============================================
app.get('/api/v1/performance', (req, res) => {
  try {
    const performance = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      realtime: realtimeInitialized ? realtimeIntegrator.getSystemStatus().metrics : null,
      socket: {
        connected: io.engine.clientsCount(),
        rooms: Object.keys(io.sockets.adapter.rooms).length
      }
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

// ============================================
// 监控系统路由
// ============================================
app.get('/monitoring', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'monitoring-dashboard.html'));
});

app.get('/monitoring-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'monitoring-dashboard.html'));
});

app.get('/api/monitoring/status', (req, res) => {
  res.json({
    success: true,
    data: realtimeMonitor.getMonitoringReport(),
    message: '监控数据获取成功'
  });
});

app.get('/api/monitoring/metrics', (req, res) => {
  res.json({
    success: true,
    data: realtimeMonitor.getMetrics(),
    message: '实时指标获取成功'
  });
});

app.get('/api/monitoring/history', (req, res) => {
  const { type = 'all', limit = 100 } = req.query;
  res.json({
    success: true,
    data: realtimeMonitor.getRecentHistory({ type, limit: parseInt(limit) }),
    message: '历史数据获取成功'
  });
});

app.get('/api/monitoring/alerts', (req, res) => {
  const { level, activeOnly = 'false' } = req.query;

  let alerts = alertSystem.getActiveAlerts();

  if (level) {
    alerts = alerts.filter(alert => alert.level === level);
  }

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

app.get('/api/monitoring/alerts/rules', (req, res) => {
  const rules = alertSystem.getRules();

  res.json({
    success: true,
    data: rules,
    count: rules.length,
    message: '告警规则获取成功'
  });
});

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

// ============================================
// API文档端点
// ============================================
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

// ============================================
// Socket.IO 状态API
// ============================================
app.get('/api/v1/socket/status', (req, res) => {
  res.json({
    success: true,
    data: {
      connected: io.engine.clientsCount(),
      rooms: Object.keys(io.sockets.adapter.rooms).length,
      onlineUsers: onlineUsers.size
    }
  });
});

// ============================================
// 404处理
// ============================================
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
      '/api/v1/performance',
      '/api/v1/socket/status'
    ],
    requestId: req.id
  });
});

// ============================================
// 全局错误处理
// ============================================
app.use(errorHandler);

// ============================================
// 数据库连接和服务器启动
// ============================================
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village';

async function connectDatabase() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 50,
      minPoolSize: 10,
      socketTimeoutMS: 45000,
      family: 4
    });
    logger.info('✅ MongoDB 连接成功');
    logger.info(`📊 数据库: ${MONGO_URI}`);
  } catch (error) {
    logger.error('❌ MongoDB 连接失败:', error);
    throw error;
  }
}

async function startServer() {
  try {
    logger.info('🚀 启动智慧乡村平台统一服务...');

    // 连接数据库
    await connectDatabase();

    // 初始化实时计算系统
    await initializeRealtimeSystem();

    // 启动HTTP服务器
    server.listen(PORT, () => {
      logger.info('✅ 智慧乡村平台统一服务启动成功');
      logger.info(`🌐 服务地址: http://localhost:${PORT}`);
      logger.info(`🏥 健康检查: http://localhost:${PORT}/health`);
      logger.info(`📋 API信息: http://localhost:${PORT}/api/v1/info`);
      logger.info(`📊 监控看板: http://localhost:${PORT}/monitoring`);
      logger.info(`🔌 Socket.IO: ws://localhost:${PORT}`);
      logger.info(`🔄 实时计算: ${realtimeInitialized ? '已启用' : '已禁用'}`);

      logger.info('🌟 服务特性:');
      logger.info(`   - 实时数据流: ${realtimeInitialized ? '✅' : '❌'}`);
      logger.info('   - Socket.IO通信: ✅');
      logger.info('   - 多源数据整合: ✅');
      logger.info('   - 海量数据处理: ✅');
      logger.info(`   - 动态阈值监控: ${realtimeInitialized ? '✅' : '❌'}`);
      logger.info(`   - 智能预警系统: ${realtimeInitialized ? '✅' : '❌'}`);
    });

    // 设置服务器超时
    server.timeout = 30000;
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;

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

          // 关闭Socket.IO
          io.close();
          logger.info('🔌 Socket.IO已关闭');

          // 关闭数据库连接
          await mongoose.connection.close();
          logger.info('🗄️  MongoDB连接已关闭');

          logger.info('✅ 智慧乡村平台统一服务已安全关闭');
          process.exit(0);
        } catch (error) {
          logger.error('❌ 关闭过程中出错:', error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        logger.error('⚠️ 强制关闭服务器');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      logger.error('❌ 未捕获的异常:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('❌ 未处理的Promise拒绝:', { reason, promise });
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    logger.error('❌ 智慧乡村平台统一服务启动失败:', error);
    process.exit(1);
  }
}

// 启动服务器
if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };
