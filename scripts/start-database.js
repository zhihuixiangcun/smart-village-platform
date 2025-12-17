#!/usr/bin/env node

/**
 * 数据库服务启动脚本
 * 支持Docker和本地安装两种方式
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🗄️  智慧乡村平台数据库启动脚本\n');

// 检查Docker是否可用
function checkDocker() {
  try {
    execSync('docker --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

// 启动Docker数据库服务
function startDockerDatabase() {
  console.log('🐳 使用Docker启动数据库服务...');

  const dockerComposePath = path.join(__dirname, '..', 'docker-compose.dev.yml');

  if (!fs.existsSync(dockerComposePath)) {
    console.log('❌ Docker Compose配置文件不存在');
    process.exit(1);
  }

  try {
    console.log('📋 启动MongoDB、Redis和管理界面...');
    execSync('docker-compose -f docker-compose.dev.yml up -d', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    console.log('\n⏳ 等待数据库服务启动...');
    setTimeout(() => {
      console.log('\n✅ 数据库服务启动成功！');
      console.log('\n📊 服务访问地址:');
      console.log('  MongoDB: mongodb://localhost:27017');
      console.log('  Redis: redis://localhost:6379');
      console.log('  MongoDB管理界面: http://localhost:8081 (admin/admin123)');
      console.log('  Redis管理界面: http://localhost:8082');
      console.log('\n💡 提示：首次启动可能需要1-2分钟初始化时间');
    }, 5000);

  } catch (error) {
    console.log('❌ Docker启动失败:', error.message);
    process.exit(1);
  }
}

// 启动本地数据库服务（如果已安装）
function startLocalDatabase() {
  console.log('💻 尝试启动本地数据库服务...');

  // 检查MongoDB
  try {
    execSync('mongod --version', { stdio: 'pipe' });
    console.log('✅ MongoDB已安装');

    // 启动MongoDB（Windows）
    if (process.platform === 'win32') {
      try {
        execSync('net start MongoDB', { stdio: 'pipe' });
        console.log('✅ MongoDB服务已启动');
      } catch (error) {
        console.log('⚠️  请手动启动MongoDB服务');
      }
    }
  } catch (error) {
    console.log('❌ MongoDB未安装');
  }

  // 检查Redis
  try {
    execSync('redis-server --version', { stdio: 'pipe' });
    console.log('✅ Redis已安装');

    // 启动Redis
    console.log('⚠️  请手动启动Redis服务：redis-server');
  } catch (error) {
    console.log('❌ Redis未安装');
  }
}

// 主程序
console.log('🔍 检查系统环境...');

if (checkDocker()) {
  console.log('✅ Docker可用，推荐使用Docker方式');

  // 询问用户选择
  const args = process.argv.slice(2);
  if (args.includes('--local')) {
    startLocalDatabase();
  } else {
    startDockerDatabase();
  }
} else {
  console.log('❌ Docker不可用，请安装Docker或使用本地数据库');
  startLocalDatabase();
}

// 创建数据库初始化说明
const initInstructions = `
📚 数据库初始化说明:

1. Docker方式（推荐）:
   npm run database:start

2. 停止数据库服务:
   npm run database:stop

3. 查看服务状态:
   npm run database:status

4. 重置数据库:
   npm run database:reset

5. 连接字符串:
   MongoDB: mongodb://village_app:app_password_2024@localhost:27017/smart_village
   Redis: redis://:redis123@localhost:6379

6. 管理界面:
   MongoDB: http://localhost:8081
   Redis: http://localhost:8082
`;

console.log(initInstructions);

// 将说明写入文件
fs.writeFileSync(path.join(__dirname, '..', 'DATABASE_SETUP.md'), initInstructions);