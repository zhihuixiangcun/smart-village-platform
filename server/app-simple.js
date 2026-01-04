/**
 * Socket.IO服务器 - 简化版
 * 快速启动，无阻塞
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }
});

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'socket-io-server',
      port: 5000,
      socket: {
        connected: true
      },
      timestamp: new Date().toISOString()
    }
  });
});

// 服务信息
app.get('/api/info', (req, res) => {
  res.json({
    success: true,
    data: {
      name: '智慧乡村村务服务',
      version: '1.0.0',
      features: {
        socketIO: true,
        announcements: true,
        residents: true,
        auth: true,
        suggestions: true
      }
    }
  });
});

// API端点
app.get('/api/announcements', (req, res) => {
  res.json({
    success: true,
    data: [],
    total: 0,
    message: '公告列表获取成功'
  });
});

app.get('/api/suggestions', (req, res) => {
  res.json({
    success: true,
    data: [],
    total: 0,
    message: '建议列表获取成功'
  });
});

// Socket.IO连接处理
io.on('connection', (socket) => {
  console.log(`✅ Socket.IO客户端连接: ${socket.id}`);

  socket.on('join-village', (data) => {
    const { villageId, userId } = data;
    const room = `village-${villageId}`;
    socket.join(room);
    console.log(`🏠 用户 ${userId} 加入村庄 ${villageId}`);

    socket.emit('joined-village', {
      villageId,
      room,
      timestamp: new Date()
    });
  });

  socket.on('leave-village', (data) => {
    const { villageId } = data;
    const room = `village-${villageId}`;
    socket.leave(room);
    console.log(`🚪 用户离开村庄 ${villageId}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Socket.IO客户端断开: ${socket.id}`);
  });

  socket.on('error', (error) => {
    console.error(`💥 Socket.IO错误: ${error}`);
  });
});

// 启动服务器
const PORT = process.env.VILLAGE_PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n✅ 智慧乡村村务服务启动成功');
  console.log(`🌐 服务地址: http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO: ws://localhost:${PORT}`);
  console.log(`🏥 健康检查: http://localhost:${PORT}/health`);
  console.log('\n📡 可用端点:');
  console.log(`   - GET  /health`);
  console.log(`   - GET  /api/info`);
  console.log(`   - GET  /api/announcements`);
  console.log(`   - GET  /api/suggestions`);
  console.log('\n🔌 Socket.IO 事件:');
  console.log(`   - join-village`);
  console.log(`   - leave-village`);
  console.log(`   - send-announcement`);
  console.log(`   - emergency-broadcast`);
  console.log('   - submit-suggestion\n');
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

module.exports = { app, server, io };
