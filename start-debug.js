/**
 * 调试启动脚本 - 捕获详细错误信息
 */

process.on('uncaughtException', (error) => {
  console.error('\n❌ 未捕获的异常:');
  console.error('错误名称:', error.name);
  console.error('错误消息:', error.message);
  console.error('错误堆栈:\n', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ 未处理的Promise拒绝:');
  console.error('原因:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

console.log('=== 启动智慧乡村平台服务器 ===\n');

try {
  console.log('加载app.js...');
  require('./src/app.js');
} catch (error) {
  console.error('\n❌ 启动失败:');
  console.error('错误名称:', error.name);
  console.error('错误消息:', error.message);
  console.error('\n错误堆栈:\n', error.stack);

  // 提供解决建议
  console.error('\n🔧 可能的解决方案:');
  if (error.message.includes('Cannot find module')) {
    console.error('1. 运行: npm install <缺失的模块>');
  } else if (error.message.includes('EADDRINUSE')) {
    console.error('1. 端口已被占用，请关闭占用端口的进程');
    console.error('2. 或修改.env文件中的PORT配置');
  } else if (error.message.includes('MongooseError') || error.message.includes('MongoServerError')) {
    console.error('1. 检查MongoDB服务是否启动: net start MongoDB');
    console.error('2. 检查MongoDB连接字符串是否正确');
  }

  process.exit(1);
}
