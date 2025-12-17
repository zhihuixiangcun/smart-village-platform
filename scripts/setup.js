#!/usr/bin/env node

/**
 * 智慧乡村平台开发环境设置脚本
 * 自动创建必要的目录结构和初始配置
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 开始设置智慧乡村平台开发环境...\n');

// 创建必要的目录结构
const directories = [
  'logs',
  'uploads',
  'uploads/avatars',
  'uploads/documents',
  'uploads/images',
  'uploads/temp',
  'data',
  'data/backup',
  'data/exports',
  'src/i18n/locales/zh-CN',
  'src/i18n/locales/pcc',
  'src/i18n/locales/pcc-qn',
  'src/services',
  'src/middleware',
  'src/utils',
  'src/security',
  'tests/unit',
  'tests/integration',
  'tests/e2e',
  'tests/edge-cases',
];

console.log('📁 创建目录结构...');
directories.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ 创建目录: ${dir}`);
  } else {
    console.log(`ℹ️  目录已存在: ${dir}`);
  }
});

// 创建基础的日志配置
console.log('\n📝 创建日志配置...');
const logConfig = {
  level: 'info',
  format: 'combined',
  filename: 'logs/app.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d'
};

const logConfigPath = path.join(__dirname, '..', 'src/config', 'logging.json');
if (!fs.existsSync(path.dirname(logConfigPath))) {
  fs.mkdirSync(path.dirname(logConfigPath), { recursive: true });
}
fs.writeFileSync(logConfigPath, JSON.stringify(logConfig, null, 2));
console.log('✅ 日志配置已创建');

// 创建基础的监控配置
console.log('\n📊 创建监控配置...');
const monitoringConfig = {
  enabled: true,
  interval: 30000, // 30秒
  metrics: {
    cpu: true,
    memory: true,
    requests: true,
    responseTime: true
  },
  alerts: {
    cpuThreshold: 80,
    memoryThreshold: 85,
    responseTimeThreshold: 2000
  }
};

const monitoringConfigPath = path.join(__dirname, '..', 'src/config', 'monitoring.json');
fs.writeFileSync(monitoringConfigPath, JSON.stringify(monitoringConfig, null, 2));
console.log('✅ 监控配置已创建');

// 创建开发服务器启动脚本
console.log('\n🔧 创建开发服务器脚本...');
const devScript = `#!/usr/bin/env node

/**
 * 开发环境启动脚本
 * 同时启动主服务器和村务服务器
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 启动智慧乡村平台开发服务器...\\n');

// 启动主服务器
const mainServer = spawn('nodemon', ['src/app.js'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit'
});

// 启动村务服务器
const villageServer = spawn('nodemon', ['server/app.js'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit'
});

mainServer.on('close', (code) => {
  console.log(\`主服务器退出，代码: \${code}\`);
  process.exit(code);
});

villageServer.on('close', (code) => {
  console.log(\`村务服务器退出，代码: \${code}\`);
  process.exit(code);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\\n🛑 正在关闭服务器...');
  mainServer.kill();
  villageServer.kill();
});
`;

const devScriptPath = path.join(__dirname, '..', 'scripts', 'dev-servers.js');
fs.writeFileSync(devScriptPath, devScript);

// 在Windows上创建启动批处理文件
const batchScript = `@echo off
echo 🚀 启动智慧乡村平台开发服务器...
echo.
echo 正在启动主服务器 (端口 3001)...
start "主服务器" cmd /k "nodemon src/app.js"

echo 正在启动村务服务器 (端口 5000)...
start "村务服务器" cmd /k "nodemon server/app.js"

echo 正在启动前端开发服务器 (端口 3000)...
timeout /t 3 /nobreak >nul
start "前端服务器" cmd /k "cd client && npm run dev"

echo.
echo ✅ 所有服务器已启动
echo 📱 前端: http://localhost:3000
echo 🔗 主API: http://localhost:3001
echo 🏛️  村务API: http://localhost:5000
echo 📊 监控面板: http://localhost:3001/monitoring
echo.
pause
`;

const batchScriptPath = path.join(__dirname, '..', 'start-dev.bat');
fs.writeFileSync(batchScriptPath, batchScript);

console.log('✅ 开发脚本已创建');

// 更新package.json，添加开发服务器脚本
console.log('\n📦 更新package.json...');
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (!packageJson.scripts['dev:servers']) {
  packageJson.scripts['dev:servers'] = 'node scripts/dev-servers.js';
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ package.json已更新');
}

console.log('\n🎉 开发环境设置完成！');
console.log('\n📋 快速开始命令:');
console.log('  npm run dev:servers    # 启动后端服务器');
console.log('  npm run client         # 启动前端服务器');
console.log('  start-dev.bat          # Windows一键启动所有服务');
console.log('\n🌐 访问地址:');
console.log('  前端应用: http://localhost:3000');
console.log('  主API: http://localhost:3001');
console.log('  村务API: http://localhost:5000');
console.log('  监控面板: http://localhost:3001/monitoring');
console.log('\n✨ 祝您开发愉快！');