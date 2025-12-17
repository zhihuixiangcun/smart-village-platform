/**
 * Socket.IO实时通信演示脚本
 * 演示WebSocket连接和实时消息功能
 */

const io = require('socket.io-client');

// 演示Socket.IO功能
function demonstrateSocketIO() {
  console.log('🔌 Socket.IO实时通信演示开始\n');

  // 连接到Socket.IO服务器
  const socket = io('http://localhost:5000');

  socket.on('connect', () => {
    console.log('✅ Socket.IO连接成功!');
    console.log('🔗 连接ID:', socket.id);
    console.log('');

    // 演示1: 加入村庄房间
    console.log('🏘️ 演示1: 加入村庄房间');
    console.log('=' .repeat(40));

    socket.emit('join-village', '智慧示范村');

    // 演示2: 发送普通消息
    console.log('💬 演示2: 发送普通消息');
    console.log('=' .repeat(40));

    setTimeout(() => {
      socket.emit('send-message', {
        villageId: '智慧示范村',
        message: '这是一条测试消息，用于演示实时通信功能',
        type: 'info'
      });
    }, 1000);

    // 演示3: 发送紧急广播
    console.log('🚨 演示3: 发送紧急广播');
    console.log('=' .repeat(40));

    setTimeout(() => {
      socket.emit('emergency-broadcast', {
        villageId: '智慧示范村',
        message: '紧急通知：今晚7点召开村民代表大会',
        severity: 'high'
      });
    }, 2000);

    // 演示4: 多客户端模拟
    console.log('👥 演示4: 模拟多客户端通信');
    console.log('=' .repeat(40));

    // 创建第二个客户端
    const socket2 = io('http://localhost:5000');

    socket2.on('connect', () => {
      console.log('📱 第二个客户端连接成功:', socket2.id);
      socket2.emit('join-village', '智慧示范村');
    });

    // 监听消息
    socket2.on('new-message', (data) => {
      console.log('📨 客户端2收到消息:', data.message);
    });

    socket2.on('emergency-alert', (data) => {
      console.log('🚨 客户端2收到紧急广播:', data.message);
      console.log('⚠️ 严重程度:', data.severity);
    });

    socket2.on('joined-village', (data) => {
      console.log('✅ 客户端2加入村庄:', data.message);
    });

    // 5秒后断开连接
    setTimeout(() => {
      socket2.disconnect();
      console.log('📱 第二个客户端已断开连接');
    }, 5000);

  });

  // 监听事件
  socket.on('joined-village', (data) => {
    console.log('✅ 成功加入村庄:', data.message);
    console.log('🏘️ 村庄ID:', data.villageId);
    console.log('');
  });

  socket.on('new-message', (data) => {
    console.log('📨 收到新消息:', data.message);
    console.log('🆔 发送者ID:', data.userId);
    console.log('🏷️ 消息类型:', data.type);
    console.log('⏰ 时间:', data.timestamp);
    console.log('');
  });

  socket.on('emergency-alert', (data) => {
    console.log('🚨 收到紧急广播:', data.message);
    console.log('⚠️ 严重程度:', data.severity);
    console.log('⏰ 时间:', data.timestamp);
    console.log('');
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket.IO连接已断开');
  });

  // 监听连接错误
  socket.on('connect_error', (error) => {
    console.error('❌ Socket.IO连接失败:', error.message);
  });

  // 10秒后断开连接
  setTimeout(() => {
    socket.disconnect();
    console.log('\n🎉 Socket.IO演示完成!');
    console.log('\n💡 实时通信功能说明:');
    console.log('1. 支持房间-based消息传递');
    console.log('2. 紧急广播功能');
    console.log('3. 多客户端实时通信');
    console.log('4. 消息类型和严重程度标记');
    console.log('\n🔧 技术特点:');
    console.log('- WebSocket协议提供低延迟通信');
    console.log('- 支持房间管理和权限控制');
    console.log('- 自动重连和错误处理');
    console.log('- 跨域安全配置');
  }, 10000);
}

// 运行演示
if (require.main === module) {
  demonstrateSocketIO();
}

module.exports = demonstrateSocketIO;