/**
 * 简单的Socket.IO服务器
 * 运行在端口5000，为前端提供实时通信功能
 */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 中间件
app.use(cors());
app.use(express.json());

// 根路径
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Socket.IO实时通信服务器',
    timestamp: new Date().toISOString(),
    port: 5000,
    services: {
      socketio: 'online',
      realtime: 'active'
    }
  });
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Socket.IO服务器运行正常',
    timestamp: new Date().toISOString(),
    port: 5000
  });
});

// Socket.IO连接处理
io.on('connection', (socket) => {
  console.log(`🔌 用户连接: ${socket.id}`);

  // 加入村庄房间
  socket.on('join-village', (villageId) => {
    socket.join(villageId);
    console.log(`🏘️ 用户 ${socket.id} 加入村庄 ${villageId}`);
    socket.emit('joined-village', { villageId, message: '成功加入村庄' });
  });

  // 紧急广播
  socket.on('emergency-broadcast', (data) => {
    console.log('🚨 收到紧急广播:', data);
    io.to(data.villageId).emit('emergency-alert', {
      type: 'emergency',
      message: data.message,
      timestamp: new Date().toISOString(),
      severity: data.severity || 'high'
    });
  });

  // 通用消息
  socket.on('send-message', (data) => {
    console.log('💬 收到消息:', data);
    io.to(data.villageId).emit('new-message', {
      id: Date.now(),
      userId: socket.id,
      message: data.message,
      timestamp: new Date().toISOString(),
      type: data.type || 'info'
    });
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.log(`🔌 用户断开连接: ${socket.id}`);
  });
});

// 启动服务器
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`✅ Socket.IO服务器启动成功`);
  console.log(`🌐 服务地址: http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO地址: http://localhost:${PORT}/socket.io`);
  console.log(`🏥 健康检查: http://localhost:${PORT}/health`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('🛑 收到SIGTERM信号，正在关闭Socket.IO服务器...');
  server.close(() => {
    console.log('✅ Socket.IO服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 收到SIGINT信号，正在关闭Socket.IO服务器...');
  server.close(() => {
    console.log('✅ Socket.IO服务器已关闭');
    process.exit(0);
  });
});