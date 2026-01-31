#!/usr/bin/env node

/**
 * 开发环境启动脚本
 * 同时启动主服务器和村务服务器
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 启动智慧乡村平台开发服务器...\n');

// 启动主服务器
const mainServer = spawn('node', ['src/app.js'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

// 启动村务服务器
const villageServer = spawn('node', ['server/app.js'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

let mainServerExited = false;
let villageServerExited = false;

mainServer.on('close', (code) => {
  console.log(`主服务器退出，代码: ${code}`);
  mainServerExited = true;

  // 如果另一个服务器已经退出，才退出整个进程
  if (villageServerExited) {
    process.exit(code);
  }
});

villageServer.on('close', (code) => {
  console.log(`村务服务器退出，代码: ${code}`);
  villageServerExited = true;

  // 如果另一个服务器已经退出，才退出整个进程
  if (mainServerExited) {
    process.exit(code);
  }
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭服务器...');
  mainServer.kill();
  villageServer.kill();
});
