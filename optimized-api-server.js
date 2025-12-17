/**
 * 智慧村庄平台优化版API服务器
 * 集成缓存、负载均衡、性能监控等功能
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const PerformanceOptimizer = require('./performance-optimization');

// 创建Express应用
const app = express();

// 初始化性能优化器
const optimizer = new PerformanceOptimizer();
optimizer.startSystemMonitoring();

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

// CORS配置
app.use(cors({
  origin: process.env.CLIENT_URL || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 基础中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 性能优化中间件
app.use(optimizer.responseTimeMiddleware());
app.use(optimizer.setupRateLimiting());
optimizer.setupStaticOptimization(app);

// MongoDB连接配置
const mongoConfig = optimizer.getMongoDBConfig();
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village', {
  maxPoolSize: mongoConfig.maxPoolSize,
  minPoolSize: mongoConfig.minPoolSize,
  maxIdleTimeMS: mongoConfig.maxIdleTimeMS,
  serverSelectionTimeoutMS: mongoConfig.serverSelectionTimeoutMS,
  socketTimeoutMS: mongoConfig.socketTimeoutMS
});

// 定义数据模型（简化版）
const User = mongoose.model('SimpleUser', new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: String,
  profile: {
    name: String,
    phone: String,
    address: String
  },
  village: {
    id: String,
    name: String,
    address: String
  },
  isActive: Boolean
}));

const Village = mongoose.model('SimpleVillage', new mongoose.Schema({
  name: String,
  code: String,
  address: String,
  province: String,
  city: String,
  county: String,
  township: String,
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  area: Number,
  population: Number,
  households: Number,
  basicInfo: {
    establishedYear: Number,
    mainIndustries: [String],
    naturalResources: [String],
    culturalSites: [String]
  },
  governance: {
    partyMembers: Number,
    cadres: Number,
    volunteers: Number,
    gridWorkers: Number
  },
  economy: {
    totalIncome: Number,
    perCapitaIncome: Number,
    mainProducts: [String],
    enterprises: Number
  },
  isActive: Boolean
}));

// === 路由定义 ===

// 健康检查（带缓存）
app.get('/health', optimizer.cacheMiddleware, (req, res) => {
  res.json({
    success: true,
    message: '智慧村庄平台 - 优化版API服务器运行正常',
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
    features: ['缓存系统', '负载均衡', '性能监控', '安全防护']
  });
});

// API健康检查
app.get('/api/health', optimizer.cacheMiddleware, (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      cache: optimizer.isRedisAvailable ? 'redis' : 'memory',
      optimization: 'enabled'
    }
  });
});

// 性能指标API
app.get('/api/metrics', (req, res) => {
  const metrics = optimizer.getMetrics();
  res.json({
    success: true,
    data: metrics
  });
});

// 缓存管理API
app.post('/api/cache/clear', async (req, res) => {
  try {
    await optimizer.clearCache();
    res.json({
      success: true,
      message: '缓存已清空'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '清空缓存失败'
    });
  }
});

// 用户认证API（带缓存）
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 使用缓存查询用户
    const cacheKey = `user:${username}`;
    let user = await optimizer.getCache(cacheKey);

    if (!user) {
      user = await User.findOne({ username, isActive: true });
      if (user) {
        // 缓存用户信息15分钟
        await optimizer.setCache(cacheKey, user, 900);
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      });
    }

    // 这里应该验证密码，简化处理
    res.json({
      success: true,
      data: {
        user: {
          username: user.username,
          name: user.profile.name,
          role: user.role,
          village: user.village
        },
        token: 'mock-jwt-token-' + Date.now()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '登录失败'
    });
  }
});

// 村庄列表API（带缓存）
app.get('/api/v1/villages', optimizer.cacheMiddleware, async (req, res) => {
  try {
    const villages = await Village.find({ isActive: true });
    res.json({
      success: true,
      data: villages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取村庄列表失败'
    });
  }
});

// 村民列表API（带缓存和分页）
app.get('/api/v1/residents', optimizer.cacheMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const villageId = req.query.villageId;

    const query = villageId ? { 'village.id': villageId, isActive: true } : { isActive: true };

    const total = await User.countDocuments(query);
    const residents = await User.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-password');

    res.json({
      success: true,
      data: {
        residents,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取村民列表失败'
    });
  }
});

// 项目管理API（带缓存）
app.get('/api/v1/projects', optimizer.cacheMiddleware, async (req, res) => {
  try {
    // 模拟项目数据
    const mockProjects = [
      {
        id: 1,
        name: '智慧农业大棚建设',
        type: 'infrastructure',
        description: '建设现代化智能农业大棚，提升农业生产效率',
        status: 'in_progress',
        progress: 65,
        budget: 300000,
        spent: 195000,
        manager: '张工程师',
        expectedEndDate: '2025-03-31'
      },
      {
        id: 2,
        name: '村民技能培训计划',
        type: 'education',
        description: '组织村民参加电商、农业技术等技能培训',
        status: 'planning',
        progress: 15,
        budget: 50000,
        spent: 7500,
        manager: '李老师',
        expectedEndDate: '2025-06-30'
      }
    ];

    const summary = {
      total: mockProjects.length,
      byStatus: {
        planning: 1,
        in_progress: 1,
        completed: 0
      },
      byType: {
        infrastructure: 1,
        education: 1,
        welfare: 0
      }
    };

    res.json({
      success: true,
      data: {
        summary,
        projects: mockProjects
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取项目列表失败'
    });
  }
});

// 财务管理API（带缓存）
app.get('/api/v1/finance/overview', optimizer.cacheMiddleware, async (req, res) => {
  try {
    const mockFinance = {
      budget: {
        total: 1000000,
        spent: 350000,
        remaining: 650000
      },
      monthlyStats: {
        income: 150000,
        expense: 80000,
        balance: 70000
      },
      alerts: [
        '基础设施项目支出接近预算上限',
        '下季度需要增加公共服务投入'
      ]
    };

    res.json({
      success: true,
      data: mockFinance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取财务概览失败'
    });
  }
});

// 农产品管理API（带缓存）
app.get('/api/v1/agriculture/products', optimizer.cacheMiddleware, async (req, res) => {
  try {
    const mockProducts = [
      {
        id: 1,
        name: '有机茶叶',
        category: '茶叶',
        quality: 'premium',
        price: 280,
        unit: '斤',
        stock: 500,
        sold: 320,
        farmer: '王茶农',
        contact: '13812345678'
      },
      {
        id: 2,
        name: '山核桃',
        category: '坚果',
        quality: 'fresh',
        price: 120,
        unit: '斤',
        stock: 800,
        sold: 450,
        farmer: '李果农',
        contact: '13823456789'
      },
      {
        id: 3,
        name: '土鸡蛋',
        category: '蛋类',
        quality: 'standard',
        price: 2.5,
        unit: '个',
        stock: 2000,
        sold: 1500,
        farmer: '张养殖户',
        contact: '13834567890'
      }
    ];

    const stats = {
      totalProducts: mockProducts.length,
      totalStock: mockProducts.reduce((sum, p) => sum + p.stock, 0),
      totalSold: mockProducts.reduce((sum, p) => sum + p.sold, 0),
      totalValue: mockProducts.reduce((sum, p) => sum + (p.sold * p.price), 0)
    };

    res.json({
      success: true,
      data: {
        stats,
        products: mockProducts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取农产品列表失败'
    });
  }
});

// 应急管理API（带缓存）
app.get('/api/v1/emergency/events', optimizer.cacheMiddleware, async (req, res) => {
  try {
    const mockEvents = [
      {
        id: 1,
        title: '道路安全隐患报告',
        type: 'safety',
        level: 'medium',
        status: 'active',
        description: '村西头路段出现坑洼，存在安全隐患',
        affectedArea: '村西头主干道',
        reporter: '李四',
        reportedTime: '2025-12-14 10:30:00'
      },
      {
        id: 2,
        title: '暴雨预警通知',
        type: 'weather',
        level: 'high',
        status: 'monitoring',
        description: '气象部门发布暴雨预警，请村民注意安全',
        affectedArea: '全村范围',
        reporter: '村委会',
        reportedTime: '2025-12-14 08:00:00'
      }
    ];

    const stats = {
      active: 1,
      monitoring: 1,
      resolved: 0,
      highLevel: 1
    };

    res.json({
      success: true,
      data: {
        stats,
        events: mockEvents
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取应急事件列表失败'
    });
  }
});

// 系统服务API（带缓存）
app.get('/api/v1/services', optimizer.cacheMiddleware, async (req, res) => {
  try {
    const services = [
      {
        id: 1,
        name: '村民管理',
        description: '管理村民基本信息和档案',
        status: 'active',
        endpoint: '/api/v1/residents'
      },
      {
        id: 2,
        name: '村务公开',
        description: '发布和管理村务信息',
        status: 'active',
        endpoint: '/api/v1/announcements'
      },
      {
        id: 3,
        name: '财务管理',
        description: '管理村庄财务收支',
        status: 'active',
        endpoint: '/api/v1/finance'
      },
      {
        id: 4,
        name: '项目管理',
        description: '管理村庄建设项目',
        status: 'active',
        endpoint: '/api/v1/projects'
      },
      {
        id: 5,
        name: '农产品管理',
        description: '管理农产品信息和销售',
        status: 'active',
        endpoint: '/api/v1/agriculture'
      },
      {
        id: 6,
        name: '应急管理',
        description: '处理应急事件上报',
        status: 'active',
        endpoint: '/api/v1/emergency'
      },
      {
        id: 7,
        name: '通知服务',
        description: '发送各类通知消息',
        status: 'active',
        endpoint: '/api/v1/notifications'
      },
      {
        id: 8,
        name: '数据统计',
        description: '提供数据分析和报表',
        status: 'active',
        endpoint: '/api/v1/analytics'
      }
    ];

    res.json({
      success: true,
      data: services
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取服务列表失败'
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
    method: req.method
  });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('❌ 服务器错误:', error);
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    code: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'development' ? error.message : '请稍后再试'
  });
});

// 启动服务器
const PORT = process.env.PORT || 3001;

// 如果启用集群模式
if (process.env.CLUSTER_MODE === 'true') {
  optimizer.startCluster(app);
} else {
  app.listen(PORT, () => {
    console.log('\n🚀 智慧村庄平台 - 优化版API服务器');
    console.log('📍 服务地址:', `http://localhost:${PORT}`);
    console.log('\n✨ 优化功能:');
    console.log('   🔄 智能缓存系统 (Redis + Memory)');
    console.log('   ⚖️ 负载均衡支持 (Cluster Mode)');
    console.log('   📊 性能实时监控');
    console.log('   🛡️ 安全防护增强');
    console.log('   🚀 API响应优化');
    console.log('   📈 数据库连接池');
    console.log('\n🔧 性能指标:', `http://localhost:${PORT}/api/metrics`);
    console.log('🧹 缓存管理:', `http://localhost:${PORT}/api/cache/clear`);
    console.log('💚 健康检查:', `http://localhost:${PORT}/health`);
    console.log('\n🎯 缓存状态:', optimizer.isRedisAvailable ? '🔴 Redis' : '🟡 Memory');
    console.log('⚡ 系统负载:', `CPU核心: ${require('os').cpus().length}`);
    console.log('🔋 内存使用:', `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    console.log('');
  });
}

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('📴 收到SIGTERM信号，正在优雅关闭服务器...');
  mongoose.connection.close(() => {
    console.log('🔌 数据库连接已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n📴 收到SIGINT信号，正在优雅关闭服务器...');
  mongoose.connection.close(() => {
    console.log('🔌 数据库连接已关闭');
    process.exit(0);
  });
});

module.exports = app;