/**
 * 服务器启动脚本 - 等待数据库连接完成
 */

async function start() {
  console.log('=== 启动智慧乡村平台服务器 ===\n');
  
  try {
    // 加载环境变量
    const dotenv = require('dotenv');
    dotenv.config();
    
    // 初始化数据库连接
    const database = require('./src/config/database');
    console.log('[INFO] 正在连接数据库...');
    await database.connect();
    console.log('[INFO] ✅ 数据库连接成功');
    
    // 加载并启动app
    console.log('[INFO] 正在启动应用服务器...');
    const app = require('./src/app');
    
    const PORT = process.env.PORT || 3001;
    const server = app.listen(PORT, () => {
      console.log('[INFO] ✅ 服务器启动成功');
      console.log(`[INFO] 🌐 服务地址: http://localhost:${PORT}`);
      console.log(`[INFO] 🏥 健康检查: http://localhost:${PORT}/health`);
    });
    
    // 优雅关闭
    process.on('SIGINT', async () => {
      console.log('\n[INFO] 正在关闭服务器...');
      server.close(async () => {
        await database.close();
        console.log('[INFO] 服务器已关闭');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('[ERROR] 启动失败:', error);
    process.exit(1);
  }
}

start();
