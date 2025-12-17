/**
 * 主API服务器 - 修复版本
 * 运行在端口3001，提供主要的API服务
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const dotenv = require('dotenv');
const extendedFeatures = require('./extended-features');

dotenv.config();

const app = express();
const PORT = process.env.MAIN_PORT || 3001;

// 基础中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
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
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// 根路径
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '智慧村庄平台 - 主API服务器',
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    services: {
      api: 'online',
      database: 'disconnected',
      realtime: 'disabled'
    },
    endpoints: {
      health: '/health',
      apiHealth: '/api/health',
      info: '/api/v1/info',
      status: '/api/v1/status',
      announcements: '/api/v1/announcements',
      services: '/api/v1/services'
    }
  });
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '主API服务运行正常',
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    services: {
      api: 'online',
      database: 'disconnected', // 暂时不连接数据库
      realtime: 'disabled' // 暂时禁用复杂功能
    }
  });
});

// API信息端点
app.get('/api/v1/info', (req, res) => {
  res.json({
    success: true,
    message: '智慧村庄平台 API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: {
      authentication: 'disabled',
      realtime: 'disabled',
      database: 'disabled',
      fileUpload: 'disabled'
    }
  });
});

// API健康检查端点
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '村务API服务运行正常',
    timestamp: new Date().toISOString(),
    port: PORT,
    services: {
      api: 'online',
      database: 'disconnected',
      realtime: 'disabled'
    }
  });
});

// 基础API路由
app.get('/api/v1/status', (req, res) => {
  res.json({
    success: true,
    status: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 模拟数据端点
app.get('/api/v1/announcements', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        title: '欢迎使用智慧村庄平台',
        content: '这是一个简化的演示版本',
        type: 'notice',
        timestamp: new Date().toISOString()
      }
    ]
  });
});

app.get('/api/v1/services', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: '村民管理', status: 'active' },
      { id: 2, name: '村务公开', status: 'active' },
      { id: 3, name: '在线办事', status: 'active' },
      { id: 4, name: '信息查询', status: 'active' },
      { id: 5, name: '财务管理', status: 'active' },
      { id: 6, name: '项目管理', status: 'active' },
      { id: 7, name: '农产品管理', status: 'active' },
      { id: 8, name: '应急管理', status: 'active' }
    ]
  });
});

// 登录API端点
app.post('/api/v1/auth/login', (req, res) => {
  const { username, password } = req.body;

  // 模拟用户数据库
  const users = [
    {
      id: 1,
      username: 'admin',
      email: 'admin@smartvillage.com',
      password: 'admin123', // 实际应用中应该是哈希值
      role: 'admin',
      profile: {
        name: '系统管理员',
        phone: '13800138000',
        avatar: ''
      },
      village: {
        id: 'admin',
        name: '系统管理'
      },
      status: 'active'
    },
    {
      id: 2,
      username: 'villager01',
      email: 'villager01@smartvillage.com',
      password: 'user123', // 实际应用中应该是哈希值
      role: 'user',
      profile: {
        name: '张三',
        phone: '13900139000',
        avatar: ''
      },
      village: {
        id: 'village001',
        name: '智慧示范村'
      },
      status: 'active'
    }
  ];

  // 查找用户
  const user = users.find(u =>
    (u.username === username || u.email === username) && u.password === password
  );

  if (user) {
    // 生成简单的JWT token（实际应用中应使用更安全的方法）
    const token = Buffer.from(JSON.stringify({
      userId: user.id,
      username: user.username,
      role: user.role,
      exp: Date.now() + 24 * 60 * 60 * 1000 // 24小时过期
    })).toString('base64');

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          profile: user.profile,
          village: user.village
        }
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: '用户名或密码错误',
      code: 'INVALID_CREDENTIALS'
    });
  }
});

// 用户信息API端点
app.get('/api/v1/auth/profile', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      error: '未提供认证令牌',
      code: 'NO_TOKEN'
    });
  }

  try {
    // 简单的token解码（实际应用中应使用JWT库）
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

    if (decoded.exp < Date.now()) {
      return res.status(401).json({
        success: false,
        error: '认证令牌已过期',
        code: 'TOKEN_EXPIRED'
      });
    }

    // 返回用户信息
    const users = {
      1: {
        id: 1,
        username: 'admin',
        email: 'admin@smartvillage.com',
        role: 'admin',
        profile: {
          name: '系统管理员',
          phone: '13800138000',
          avatar: ''
        },
        village: {
          id: 'admin',
          name: '系统管理'
        }
      },
      2: {
        id: 2,
        username: 'villager01',
        email: 'villager01@smartvillage.com',
        role: 'user',
        profile: {
          name: '张三',
          phone: '13900139000',
          avatar: ''
        },
        village: {
          id: 'village001',
          name: '智慧示范村'
        }
      }
    };

    const userInfo = users[decoded.userId];
    if (userInfo) {
      res.json({
        success: true,
        data: userInfo
      });
    } else {
      res.status(401).json({
        success: false,
        error: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }
  } catch (error) {
    res.status(401).json({
      success: false,
      error: '无效的认证令牌',
      code: 'INVALID_TOKEN'
    });
  }
});

// 挂载扩展功能模块
app.use('/api/v1', extendedFeatures);

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
      '/api/health',
      '/api/v1/info',
      '/api/v1/status',
      '/api/v1/services',
      '/api/v1/announcements',
      '/api/v1/auth/login',
      '/api/v1/auth/profile',
      '/api/v1/finance/*',
      '/api/v1/projects/*',
      '/api/v1/agriculture/*',
      '/api/v1/emergency/*'
    ]
  });
});

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`✅ 主API服务器启动成功`);
  console.log(`🌐 服务地址: http://localhost:${PORT}`);
  console.log(`🏥 健康检查: http://localhost:${PORT}/health`);
  console.log(`📋 API信息: http://localhost:${PORT}/api/v1/info`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('🛑 收到SIGTERM信号，正在关闭主API服务器...');
  server.close(() => {
    console.log('✅ 主API服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 收到SIGINT信号，正在关闭主API服务器...');
  server.close(() => {
    console.log('✅ 主API服务器已关闭');
    process.exit(0);
  });
});