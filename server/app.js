/**
 * 智慧乡村平台 - 村务服务 (Village Service)
 * Port 5000: Handles village-specific operations, Socket.IO real-time communication
 */

// ============================================
// 第一步：必须首先加载环境变量
// ============================================
const dotenv = require('dotenv');
dotenv.config(); // 加载环境变量，包括 JWT_SECRET

// ============================================
// 第二步：验证必需的环境变量
// ============================================
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is required.');
  console.error('请确保 .env 文件中设置了 JWT_SECRET');
  process.exit(1);
}

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

// ============================================
// 第三步：加载模型（在环境变量之后）
// ============================================
require('../src/models');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL || 'http://localhost:3000',
      'http://localhost:3006',
      'http://localhost:3007',
      'http://localhost:3012',
      'http://127.0.0.1:3006',
      'http://127.0.0.1:3007',
      'http://127.0.0.1:3012'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

const PORT = process.env.VILLAGE_PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village';

// Trust proxy
app.set('trust proxy', 1);

// Basic middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'http://localhost:3006',
    'http://localhost:3007',
    'http://localhost:3012',
    'http://127.0.0.1:3006',
    'http://127.0.0.1:3007',
    'http://127.0.0.1:3012'
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
if (NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Request ID middleware
app.use((req, res, next) => {
  req.id = require('crypto').randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Make io accessible to routes
app.set('io', io);

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: NODE_ENV,
    service: 'village-service',
    port: PORT,
    socket: {
      // Handle Socket.IO version compatibility
      connected: typeof io.engine.clientsCount === 'function'
        ? io.engine.clientsCount()
        : (io._nsps.get('/')?.adapter?.sockets?.size || 0),
      rooms: Object.keys(io.sockets.adapter.rooms).length
    },
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  };

  res.status(200).json({
    success: true,
    data: health
  });
});

// Service info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    success: true,
    data: {
      name: '智慧乡村村务服务',
      version: '1.0.0',
      environment: NODE_ENV,
      port: PORT,
      features: {
        socketIO: true,
        announcements: true,
        residents: true,
        auth: true,
        suggestions: true,
        qrcode: true
      }
    }
  });
});

// Import routes - 暂时禁用复杂路由，只使用内置的简化实现
// const authRoutes = require('../src/routes/auth');
// const residentRoutes = require('../src/routes/residents');
// const governanceRoutes = require('../src/routes/governance');
// const speechRoutes = require('./api/speech');
// const syncRoutes = require('./api/sync');

// Apply routes - 使用内置实现，不加载外部路由文件
// app.use('/api/auth', authRoutes);
// app.use('/api/residents', residentRoutes);
// app.use('/api/announcements', governanceRoutes);
// app.use('/api/suggestions', governanceRoutes);
// app.use('/api/qrcode', require('../src/routes/villageMap'));
// app.use('/api/speech', speechRoutes);
// app.use('/api/sync', syncRoutes);

console.log('⚠️ 村务服务器使用简化模式，未加载外部路由（auth/residents/governance）');

// In-memory data for village operations
const announcements = [];
const suggestions = [];
const onlineUsers = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Socket.IO client connected: ${socket.id}`);

  // Join village room
  socket.on('join-village', (data) => {
    const { villageId, userId } = data;
    const room = `village-${villageId}`;
    socket.join(room);

    onlineUsers.set(socket.id, { villageId, userId, joinedAt: new Date() });

    // Notify others in the village
    socket.to(room).emit('user-joined', {
      userId,
      socketId: socket.id,
      timestamp: new Date()
    });

    // Send confirmation
    socket.emit('joined-village', {
      villageId,
      room,
      onlineCount: onlineUsers.size
    });

    console.log(`User ${userId} joined village ${villageId}, room: ${room}`);
  });

  // Leave village room
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

  // Send announcement to village
  socket.on('send-announcement', (data) => {
    const { villageId, announcement } = data;
    const room = `village-${villageId}`;

    announcements.push({
      id: require('crypto').randomUUID(),
      ...announcement,
      villageId,
      createdAt: new Date()
    });

    // Broadcast to village
    io.to(room).emit('new-announcement', {
      id: require('crypto').randomUUID(),
      ...announcement,
      villageId,
      createdAt: new Date()
    });

    console.log(`Announcement sent to village ${villageId}`);
  });

  // Emergency broadcast
  socket.on('emergency-broadcast', (data) => {
    const { villageId, emergency } = data;

    // Broadcast to all clients in the village
    io.to(`village-${villageId}`).emit('emergency-alert', {
      id: require('crypto').randomUUID(),
      ...emergency,
      villageId,
      timestamp: new Date()
    });

    // Also broadcast to general room for admin monitoring
    io.emit('emergency-admin-alert', {
      id: require('crypto').randomUUID(),
      ...emergency,
      villageId,
      timestamp: new Date()
    });

    console.log(`Emergency broadcast sent to village ${villageId}:`, emergency.type);
  });

  // Submit suggestion
  socket.on('submit-suggestion', (data) => {
    const { villageId, suggestion } = data;

    suggestions.push({
      id: require('crypto').randomUUID(),
      ...suggestion,
      villageId,
      createdAt: new Date(),
      status: 'pending'
    });

    // Notify village admins
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

  // Village chat/message
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

  // Typing indicator
  socket.on('typing', (data) => {
    const { villageId, userId } = data;
    const room = `village-${villageId}`;
    socket.to(room).emit('user-typing', { userId, socketId: socket.id });
  });

  // Disconnect handling
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

  // Error handling
  socket.on('error', (error) => {
    console.error(`Socket.IO error for ${socket.id}:`, error);
  });
});

// API Routes for announcements
app.get('/api/announcements', (req, res) => {
  const { villageId, limit = 20 } = req.query;
  let filtered = announcements;

  if (villageId) {
    filtered = announcements.filter(a => a.villageId === villageId);
  }

  res.json({
    success: true,
    data: filtered.slice(-parseInt(limit)).reverse(),
    total: filtered.length
  });
});

app.post('/api/announcements', (req, res) => {
  const { villageId, title, content, priority = 'normal', author } = req.body;

  const announcement = {
    id: require('crypto').randomUUID(),
    villageId,
    title,
    content,
    priority,
    author,
    createdAt: new Date(),
    status: 'published'
  };

  announcements.push(announcement);

  // Broadcast to village
  io.to(`village-${villageId}`).emit('new-announcement', announcement);

  res.status(201).json({
    success: true,
    data: announcement,
    message: '公告发布成功'
  });
});

// API Routes for suggestions
app.get('/api/suggestions', (req, res) => {
  const { villageId, status, limit = 20 } = req.query;
  let filtered = suggestions;

  if (villageId) {
    filtered = filtered.filter(s => s.villageId === villageId);
  }
  if (status) {
    filtered = filtered.filter(s => s.status === status);
  }

  res.json({
    success: true,
    data: filtered.slice(-parseInt(limit)).reverse(),
    total: filtered.length
  });
});

app.post('/api/suggestions', (req, res) => {
  const { villageId, content, category, author } = req.body;

  const suggestion = {
    id: require('crypto').randomUUID(),
    villageId,
    content,
    category,
    author,
    createdAt: new Date(),
    status: 'pending'
  };

  suggestions.push(suggestion);

  res.status(201).json({
    success: true,
    data: suggestion,
    message: '建议已提交'
  });
});

app.patch('/api/suggestions/:id', (req, res) => {
  const { id } = req.params;
  const { status, response } = req.body;

  const index = suggestions.findIndex(s => s.id === id);
  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: '建议不存在'
    });
  }

  suggestions[index] = {
    ...suggestions[index],
    status,
    response,
    updatedAt: new Date()
  };

  res.json({
    success: true,
    data: suggestions[index],
    message: '建议状态已更新'
  });
});

// API Route for QR code generation (basic implementation)
app.get('/api/qrcode/village/:villageId', (req, res) => {
  const { villageId } = req.params;

  res.json({
    success: true,
    data: {
      villageId,
      qrCode: `village:${villageId}`,
      createdAt: new Date()
    }
  });
});

// API Route for Household QR - 获取用户户码信息
app.post('/api/v1/household-qr/generate/:householdId', async (req, res) => {
  try {
    const { householdId } = req.params;
    const { includeImage = false } = req.query;

    console.log('[户码API] 收到请求:', {
      householdId,
      includeImage,
      method: req.method,
      url: req.url,
      headers: {
        authorization: req.headers.authorization ? 'Bearer ***' : 'none',
        'content-type': req.headers['content-type']
      }
    });

    // 从数据库中查找户码信息
    const Household = mongoose.model('Household');
    const household = await Household.findOne({
      $or: [
        { _id: householdId },
        { 'householder.userId': householdId },
        { codeId: householdId }
      ]
    }).populate('householder.userId', 'username phone').lean();

    if (!household) {
      return res.status(404).json({
        success: false,
        error: '户码不存在'
      });
    }

    // 生成模拟二维码图片URL（使用在线API）
    const qrImageUrl = includeImage
      ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(household.codeId)}`
      : null;

    res.json({
      success: true,
      data: {
        codeId: household.codeId,
        household: {
          ...household,
          householder: household.householder.userId || household.householder
        },
        qrImageUrl: qrImageUrl,
        qrData: {
          codeId: household.codeId,
          qrImageUrl: qrImageUrl
        }
      }
    });
  } catch (error) {
    console.error('获取户码失败:', error);
    res.status(500).json({
      success: false,
      error: '获取户码失败: ' + error.message
    });
  }
});

// API Route for scanning QR code (公开接口，无需登录)
app.post('/api/v1/household-qr/public/scan', async (req, res) => {
  try {
    const { codeId } = req.body;

    if (!codeId) {
      return res.status(400).json({
        success: false,
        error: '户码不能为空'
      });
    }

    // 从数据库中查找户码信息
    const Household = mongoose.model('Household');
    const household = await Household.findOne({ codeId }).lean();

    if (!household) {
      return res.status(404).json({
        success: false,
        error: '户码不存在'
      });
    }

    // 返回公开信息（不包含敏感数据）
    res.json({
      success: true,
      data: {
        codeId: household.codeId,
        householder: {
          name: household.householder.name,
          isPartyMember: household.householder.isPartyMember,
          occupation: household.householder.occupation
        },
        address: household.address,
        memberCount: household.memberCount,
        status: household.status
      }
    });
  } catch (error) {
    console.error('扫码失败:', error);
    res.status(500).json({
      success: false,
      error: '扫码失败: ' + error.message
    });
  }
});

// API Route for validating QR code
app.post('/api/v1/household-qr/validate', async (req, res) => {
  try {
    const { codeId } = req.body;

    if (!codeId) {
      return res.status(400).json({
        success: false,
        error: '户码不能为空'
      });
    }

    // 从数据库中查找户码
    const Household = mongoose.model('Household');
    const household = await Household.findOne({ codeId }).lean();

    if (!household) {
      return res.json({
        success: false,
        valid: false,
        error: '户码不存在'
      });
    }

    res.json({
      success: true,
      valid: true,
      data: {
        codeId: household.codeId,
        status: household.status
      }
    });
  } catch (error) {
    console.error('验证户码失败:', error);
    res.status(500).json({
      success: false,
      error: '验证失败: ' + error.message
    });
  }
});

// API Route for residents (basic implementation)
app.get('/api/residents', (req, res) => {
  const { villageId, page = 1, limit = 20 } = req.query;

  res.json({
    success: true,
    data: [],
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: 0
    }
  });
});

// API Route for auth (basic implementation)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  // Basic mock auth - should be replaced with real auth
  if (username && password) {
    res.json({
      success: true,
      data: {
        token: 'mock-token-' + Date.now(),
        user: {
          id: 'user-' + Date.now(),
          username,
          villageId: 'default-village'
        }
      },
      message: '登录成功'
    });
  } else {
    res.status(401).json({
      success: false,
      error: '用户名或密码错误'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
    path: req.originalUrl,
    method: req.method,
    service: 'village-service',
    requestId: req.id
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || '服务器内部错误',
    requestId: req.id
  });
});

// Database connection and server start
async function startServer() {
  try {
    console.log('🚀 启动智慧乡村村务服务...');

    // Connect to MongoDB (optional for village service)
    try {
      await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 5000
      });
      console.log('✅ MongoDB connected');
    } catch (dbError) {
      console.warn('⚠️ MongoDB connection failed, running without database:', dbError.message);
    }

    // Start server
    server.listen(PORT, () => {
      console.log('✅ 智慧乡村村务服务启动成功');
      console.log(`🌐 服务地址: http://localhost:${PORT}`);
      console.log(`🏥 健康检查: http://localhost:${PORT}/health`);
      console.log(`🔌 Socket.IO: ws://localhost:${PORT}`);
      console.log('📡 可用端点:');
      console.log(`   - GET  /health`);
      console.log(`   - GET  /api/info`);
      console.log(`   - GET  /api/announcements`);
      console.log(`   - POST /api/announcements`);
      console.log(`   - GET  /api/suggestions`);
      console.log(`   - POST /api/suggestions`);
      console.log(`   - GET  /api/residents`);
      console.log(`   - POST /api/auth/login`);
      console.log('🔌 Socket.IO 事件:');
      console.log(`   - join-village`);
      console.log(`   - leave-village`);
      console.log(`   - send-announcement`);
      console.log(`   - emergency-broadcast`);
      console.log(`   - submit-suggestion`);
      console.log(`   - village-message`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`🛑 收到${signal}信号，正在关闭服务器...`);

      server.close(() => {
        console.log('📡 HTTP服务器已关闭');
        mongoose.connection.close(false, () => {
          console.log('🗄️  MongoDB连接已关闭');
          process.exit(0);
        });
      });

      setTimeout(() => {
        console.error('⚠️ 强制关闭服务器');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ 智慧乡村村务服务启动失败:', error);
    process.exit(1);
  }
}

// Start server if running directly
if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };
