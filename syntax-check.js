// 语法检查脚本
console.log('检查语法...');

try {
  // 检查主要文件的语法
  console.log('检查 src/app.js...');
  require('./src/app.js');
  console.log('✅ src/app.js 语法正确');
} catch (error) {
  console.log('❌ src/app.js 语法错误:', error.message);
  process.exit(1);
}

try {
  console.log('检查 src/routes/notifications.js...');
  require('./src/routes/notifications');
  console.log('✅ src/routes/notifications.js 语法正确');
} catch (error) {
  console.log('❌ src/routes/notifications.js 语法错误:', error.message);
  process.exit(1);
}

try {
  console.log('检查 server/services/notificationsService.js...');
  require('./server/services/notificationsService');
  console.log('✅ server/services/notificationsService.js 语法正确');
} catch (error) {
  console.log('❌ server/services/notificationsService.js 语法错误:', error.message);
  process.exit(1);
}

console.log('\n🎉 所有文件语法检查通过！');
console.log('API服务器可以正常启动。');