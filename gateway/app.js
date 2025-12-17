/**
 * 智慧乡村平台 - API网关服务
 * 统一入口、路由转发、认证验证、限流控制
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const redis = require('redis');
const winston = require('winston');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.GATEWAY_PORT || 8080;

// 日志配置
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/gateway-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/gateway.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Redis客户端
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  logger.error('Redis客户端错误:', err);
});

// 服务配置
const SERVICES = {
  auth: {
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    timeout: 5000
  },
  village: {
    url: process.env.VILLAGE_SERVICE_URL || 'http://localhost:5000',
    timeout: 5000
  },
  monitoring: {
    url: process.env.MONITORING_SERVICE_URL || 'http://localhost:3099',
    timeout: 5000
  },
  realtime: {
    url: process.env.REALTIME_SERVICE_URL || 'http://localhost:3001',
    timeout: 5000
  }
};

// 基础中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 全局限流
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 每个IP最多1000请求
  message: {
    error: 'API请求过于频繁',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15分钟后重试'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(globalLimiter);

// 严格限流 (敏感操作)
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: '敏感操作请求过于频繁',
    code: 'STRICT_RATE_LIMIT_EXCEEDED'
  }
});

// 请求日志中间件
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('API请求', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });

  next();
});

// JWT验证中间件
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: '缺少访问令牌',
      code: 'MISSING_TOKEN'
    });
  }

  try {
    // 检查token是否在黑名单中
    const blacklisted = await redisClient.get(`blacklist:${token}`);
    if (blacklisted) {
      return res.status(401).json({
        success: false,
        error: '令牌已失效',
        code: 'TOKEN_BLACKLISTED'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('JWT验证失败:', error);
    return res.status(401).json({
      success: false,
      error: '无效的访问令牌',
      code: 'INVALID_TOKEN'
    });
  }
};

// 权限验证中间件
const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: '权限不足',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles
      });
    }
    next();
  };
};

// 健康检查
app.get('/health', async (req, res) => {
  try {
    // 检查各服务健康状态
    const serviceHealth = await Promise.allSettled([
      fetch(`${SERVICES.auth.url}/health`),
      fetch(`${SERVICES.village.url}/health`),
      fetch(`${SERVICES.monitoring.url}/health`),
      fetch(`${SERVICES.realtime.url}/health`)
    ]);

    const services = {
      auth: serviceHealth[0].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      village: serviceHealth[1].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      monitoring: serviceHealth[2].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      realtime: serviceHealth[3].status === 'fulfilled' ? 'healthy' : 'unhealthy'
    };

    const overallHealth = Object.values(services).every(status => status === 'healthy')
      ? 'healthy' : 'degraded';

    res.json({
      success: true,
      data: {
        status: overallHealth,
        services,
        timestamp: new Date().toISOString(),
        gateway: 'healthy'
      }
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

// API版本信息
app.get('/api/v1/info', (req, res) => {
  res.json({
    success: true,
    data: {
      name: '智慧乡村平台API网关',
      version: '1.0.0',
      apiVersion: 'v1',
      services: Object.keys(SERVICES),
      endpoints: {
        auth: '/api/v1/auth/*',
        village: '/api/v1/village/*',
        monitoring: '/api/v1/monitoring/*',
        realtime: '/api/v1/realtime/*',
        dataIntegration: '/api/v1/data-integration/*',
        massiveData: '/api/v1/massive-data/*'
      },
      documentation: '/api/v1/docs'
    }
  });
});

// 认证服务代理 (公开接口，无需认证)
app.use('/api/v1/auth', createProxyMiddleware({
  target: SERVICES.auth.url,
  changeOrigin: true,
  timeout: SERVICES.auth.timeout,
  pathRewrite: {
    '^/api/v1/auth': '/api/auth'
  },
  onError: (err, req, res) => {
    logger.error('认证服务代理错误:', err);
    res.status(503).json({
      success: false,
      error: '认证服务暂时不可用',
      code: 'SERVICE_UNAVAILABLE'
    });
  }
}));

// 村务服务代理 (需要认证)
app.use('/api/v1/village', authenticateToken, createProxyMiddleware({
  target: SERVICES.village.url,
  changeOrigin: true,
  timeout: SERVICES.village.timeout,
  pathRewrite: {
    '^/api/v1/village': '/api'
  },
  onProxyReq: (proxyReq, req, res) => {
    // 转发用户信息到下游服务
    proxyReq.setHeader('X-User-Id', req.user.id);
    proxyReq.setHeader('X-User-Role', req.user.role);
    proxyReq.setHeader('X-Village-Id', req.user.villageId || '');
  },
  onError: (err, req, res) => {
    logger.error('村务服务代理错误:', err);
    res.status(503).json({
      success: false,
      error: '村务服务暂时不可用',
      code: 'SERVICE_UNAVAILABLE'
    });
  }
}));

// 实时计算服务代理 (需要认证)
app.use('/api/v1/realtime', authenticateToken, createProxyMiddleware({
  target: SERVICES.realtime.url,
  changeOrigin: true,
  timeout: SERVICES.realtime.timeout,
  pathRewrite: {
    '^/api/v1/realtime': '/api/v1/realtime'
  },
  onProxyReq: (proxyReq, req, res) => {
    // 转发用户信息到实时服务
    proxyReq.setHeader('X-User-Id', req.user.id);
    proxyReq.setHeader('X-User-Role', req.user.role);
    proxyReq.setHeader('X-Village-Id', req.user.villageId || '');
    proxyReq.setHeader('X-Request-ID', req.id);
  },
  onError: (err, req, res) => {
    logger.error('实时计算服务代理错误:', err);
    res.status(503).json({
      success: false,
      error: '实时计算服务暂时不可用',
      code: 'SERVICE_UNAVAILABLE'
    });
  }
}));

// 数据整合服务代理 (需要认证)
app.use('/api/v1/data-integration', authenticateToken, createProxyMiddleware({
  target: SERVICES.realtime.url,
  changeOrigin: true,
  timeout: SERVICES.realtime.timeout,
  pathRewrite: {
    '^/api/v1/data-integration': '/api/v1/data-integration'
  },
  onProxyReq: (proxyReq, req, res) => {
    // 转发用户信息
    proxyReq.setHeader('X-User-Id', req.user.id);
    proxyReq.setHeader('X-User-Role', req.user.role);
    proxyReq.setHeader('X-Village-Id', req.user.villageId || '');
    proxyReq.setHeader('X-Request-ID', req.id);
  },
  onError: (err, req, res) => {
    logger.error('数据整合服务代理错误:', err);
    res.status(503).json({
      success: false,
      error: '数据整合服务暂时不可用',
      code: 'SERVICE_UNAVAILABLE'
    });
  }
}));

// 海量数据处理服务代理 (需要认证)
app.use('/api/v1/massive-data', authenticateToken, createProxyMiddleware({
  target: SERVICES.realtime.url,
  changeOrigin: true,
  timeout: SERVICES.realtime.timeout,
  pathRewrite: {
    '^/api/v1/massive-data': '/api/v1/massive-data'
  },
  onProxyReq: (proxyReq, req, res) => {
    // 转发用户信息
    proxyReq.setHeader('X-User-Id', req.user.id);
    proxyReq.setHeader('X-User-Role', req.user.role);
    proxyReq.setHeader('X-Village-Id', req.user.villageId || '');
    proxyReq.setHeader('X-Request-ID', req.id);
  },
  onError: (err, req, res) => {
    logger.error('海量数据处理服务代理错误:', err);
    res.status(503).json({
      success: false,
      error: '海量数据处理服务暂时不可用',
      code: 'SERVICE_UNAVAILABLE'
    });
  }
}));

// 监控服务代理 (需要管理员权限)
app.use('/api/v1/monitoring',
  authenticateToken,
  authorizeRole('admin', 'village_admin'),
  createProxyMiddleware({
    target: SERVICES.monitoring.url,
    changeOrigin: true,
    timeout: SERVICES.monitoring.timeout,
    pathRewrite: {
      '^/api/v1/monitoring': ''
    },
    onError: (err, req, res) => {
      logger.error('监控服务代理错误:', err);
      res.status(503).json({
        success: false,
        error: '监控服务暂时不可用',
        code: 'SERVICE_UNAVAILABLE'
      });
    }
  })
);

// 管理员接口 (严格限流)
app.use('/api/v1/admin', strictLimiter);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API接口不存在',
    code: 'ENDPOINT_NOT_FOUND',
    path: req.originalUrl,
    availableEndpoints: [
      '/health',
      '/api/v1/info',
      '/api/v1/auth/*',
      '/api/v1/village/*',
      '/api/v1/monitoring/*',
      '/api/v1/realtime/*',
      '/api/v1/data-integration/*',
      '/api/v1/massive-data/*'
    ]
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  logger.error('网关错误:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  res.status(err.status || 500).json({
    success: false,
    error: '网关内部错误',
    code: 'GATEWAY_ERROR',
    timestamp: new Date().toISOString(),
    requestId: req.id
  });
});

// 启动服务
const startGateway = async () => {
  try {
    // 连接Redis
    await redisClient.connect();
    logger.info('✅ Redis连接成功');

    app.listen(PORT, () => {
      logger.info(`🚀 API网关启动成功`);
      logger.info(`🌐 网关地址: http://localhost:${PORT}`);
      logger.info(`📋 健康检查: http://localhost:${PORT}/health`);
      logger.info(`📖 API信息: http://localhost:${PORT}/api/v1/info`);
      logger.info(`🔧 后端服务:`);
      Object.entries(SERVICES).forEach(([name, config]) => {
        logger.info(`   - ${name}: ${config.url}`);
      });
    });

  } catch (error) {
    logger.error('❌ API网关启动失败:', error);
    process.exit(1);
  }
};

// 优雅关闭
process.on('SIGINT', async () => {
  logger.info('🛑 收到终止信号，正在关闭API网关...');
  try {
    await redisClient.quit();
    logger.info('👋 API网关已关闭');
    process.exit(0);
  } catch (error) {
    logger.error('关闭过程中出错:', error);
    process.exit(1);
  }
});

startGateway();

module.exports = app;