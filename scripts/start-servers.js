/**
 * 启动脚本 - 同时运行两个服务器
 * 端口3001: 主API服务器
 * 端口5000: Socket.IO村务服务器
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 启动智慧乡村平台...\n');

// 启动主API服务器 (端口3001)
const mainServer = spawn('node', ['src/app.js'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

// 启动Socket.IO服务器 (端口5000) - 使用简化版本避免启动阻塞
const socketServer = spawn('node', ['server/app-simple.js'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

mainServer.on('error', (err) => {
  console.error('❌ 主服务器启动失败:', err);
  process.exit(1);
});

socketServer.on('error', (err) => {
  console.error('❌ Socket.IO服务器启动失败:', err);
  process.exit(1);
});

// 优雅退出
const shutdown = () => {
  console.log('\n🛑 正在关闭服务器...');

  mainServer.kill('SIGTERM');
  socketServer.kill('SIGTERM');

  setTimeout(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  }, 5000);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('✅ 服务器启动中...\n');
console.log('📡 主服务器: http://localhost:3001');
console.log('🔌 Socket.IO服务器: http://localhost:5000');
console.log('\n按 Ctrl+C 停止服务器\n');
