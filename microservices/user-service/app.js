/**
 * 智慧乡村平台 - 用户服务
 * 负责用户认证、授权、权限管理
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// 导入服务组件
const UserService = require('./src/services/UserService');
const AuthService = require('./src/services/AuthService');
const PermissionService = require('./src/services/PermissionService');
const ServiceRegistry = require('./src/utils/ServiceRegistry');
const Logger = require('./src/utils/Logger');
const ErrorHandler = require('./src/middleware/ErrorHandler');

// 导入路由
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const permissionRoutes = require('./src/routes/permissions');
const roleRoutes = require('./src/routes/roles');

// 导入中间件
const authMiddleware = require('./src/middleware/auth');
const rateLimit = require('./src/middleware/rateLimit');

dotenv.config();

const app = express();
const PORT = process.env.USER_SERVICE_PORT || 3002;
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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
let userService;
let authService;
let permissionService;
let serviceRegistry;

/**
 * 初始化服务
 */
async function initializeServices() {
  try {
    Logger.info('🚀 正在初始化用户服务...');

    // 初始化服务
    userService = new UserService();
    authService = new AuthService();
    permissionService = new PermissionService();

    // 连接数据库
    await userService.connect();
    await permissionService.connect();

    // 初始化服务注册
    serviceRegistry = new ServiceRegistry();
    await serviceRegistry.register({
      name: 'user-service',
      port: PORT,
      health: '/health',
      endpoints: {
        auth: '/api/v1/auth',
        users: '/api/v1/users',
        permissions: '/api/v1/permissions',
        roles: '/api/v1/roles'
      }
    });

    Logger.info('✅ 用户服务初始化完成');

  } catch (error) {
    Logger.error('❌ 用户服务初始化失败:', error);
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
      service: 'user-service',
      port: PORT,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      database: await userService?.checkHealth() || 'unknown',
      redis: await authService?.checkRedisHealth() || 'unknown',
      serviceRegistry: await serviceRegistry?.checkHealth() || 'unknown'
    };

    const isHealthy = health.status === 'healthy' &&
                      health.database === 'connected' &&
                      health.redis !== 'error';

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
      name: '智慧乡村用户服务',
      version: '1.0.0',
      description: '负责用户认证、授权、权限管理',
      features: [
        '用户认证与授权',
        'JWT Token管理',
        '角色权限管理',
        '密码安全策略',
        '双因子认证',
        '用户会话管理',
        '审计日志',
        'API访问控制'
      ],
      endpoints: {
        auth: '/api/v1/auth',
        users: '/api/v1/users',
        permissions: '/api/v1/permissions',
        roles: '/api/v1/roles'
      },
      technologies: {
        framework: 'Express.js',
        database: 'MongoDB',
        cache: 'Redis',
        authentication: 'JWT + bcrypt',
        serviceDiscovery: 'Consul'
      }
    },
    requestId: req.id
  });
});

// API路由
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', authMiddleware.verifyToken, userRoutes);
app.use('/api/v1/permissions', authMiddleware.verifyToken, permissionRoutes);
app.use('/api/v1/roles', authMiddleware.verifyToken, roleRoutes);

// 服务间通信端点
app.post('/internal/validate-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    const validation = await authService.validateToken(token);

    res.json({
      success: true,
      data: validation,
      requestId: req.id
    });

  } catch (error) {
    Logger.error('Token验证失败:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token',
      requestId: req.id
    });
  }
});

// 权限验证端点
app.post('/internal/check-permission', async (req, res) => {
  try {
    const { userId, resource, action } = req.body;

    if (!userId || !resource || !action) {
      return res.status(400).json({
        success: false,
        error: 'userId, resource, and action are required'
      });
    }

    const hasPermission = await permissionService.checkPermission(
      userId,
      resource,
      action
    );

    res.json({
      success: true,
      data: { hasPermission },
      requestId: req.id
    });

  } catch (error) {
    Logger.error('权限检查失败:', error);
    res.status(500).json({
      success: false,
      error: 'Permission check failed',
      requestId: req.id
    });
  }
});

// 用户信息查询端点
app.post('/internal/get-user', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const user = await userService.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions,
        villageId: user.villageId,
        isActive: user.isActive
      },
      requestId: req.id
    });

  } catch (error) {
    Logger.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user info',
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
      '/api/v1/auth/*',
      '/api/v1/users/*',
      '/api/v1/permissions/*',
      '/api/v1/roles/*',
      '/internal/*'
    ],
    requestId: req.id
  });
});

// 全局错误处理
app.use(ErrorHandler.handle);

/**
 * 启动用户服务
 */
async function startUserService() {
  try {
    Logger.info('🚀 启动智慧乡村用户服务...');

    // 初始化服务
    await initializeServices();

    // 启动HTTP服务器
    const server = app.listen(PORT, () => {
      Logger.info('✅ 智慧乡村用户服务启动成功');
      Logger.info(`🌐 服务地址: http://localhost:${PORT}`);
      Logger.info(`🏥 健康检查: http://localhost:${PORT}/health`);
      Logger.info(`📋 服务信息: http://localhost:${PORT}/info`);
      Logger.info(`🔐 认证服务: http://localhost:${PORT}/api/v1/auth`);
      Logger.info(`👥 用户管理: http://localhost:${PORT}/api/v1/users`);

      Logger.info('🌟 服务特性:');
      Logger.info('   - JWT Token认证: ✅');
      Logger.info('   - 角色权限管理: ✅');
      Logger.info('   - 双因子认证: ✅');
      Logger.info('   - 密码安全策略: ✅');
      Logger.info('   - 会话管理: ✅');
      Logger.info('   - 审计日志: ✅');
    });

    // 设置服务器超时
    server.timeout = 30000;
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;

    // 优雅关闭处理
    const gracefulShutdown = async (signal) => {
      Logger.info(`🛑 收到${signal}信号，正在优雅关闭用户服务...`);

      server.close(async () => {
        Logger.info('📡 HTTP服务器已关闭');

        try {
          // 注销服务
          if (serviceRegistry) {
            await serviceRegistry.deregister();
            Logger.info('🔄 服务注册已取消');
          }

          // 关闭数据库连接
          if (userService) {
            await userService.disconnect();
            Logger.info('🗄️ 数据库连接已关闭');
          }

          Logger.info('✅ 智慧乡村用户服务已安全关闭');
          process.exit(0);

        } catch (error) {
          Logger.error('❌ 关闭过程中出错:', error);
          process.exit(1);
        }
      });

      // 强制关闭超时
      setTimeout(() => {
        Logger.error('⚠️ 强制关闭用户服务');
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
    Logger.error('❌ 智慧乡村用户服务启动失败:', error);
    process.exit(1);
  }
}

// 启动服务
if (require.main === module) {
  startUserService();
}

module.exports = app;