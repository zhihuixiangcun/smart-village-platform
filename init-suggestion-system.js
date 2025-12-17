const mongoose = require('mongoose');
const dotenv = require('dotenv');
const createSuggestionTestData = require('./scripts/create-suggestion-test-data');

dotenv.config();

async function initDatabase() {
  try {
    console.log('🔌 连接数据库...');
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village';
    await mongoose.connect(mongoURI);
    console.log('✅ 数据库连接成功');

    // 创建建议征集系统测试数据
    await createSuggestionTestData();

    console.log('🎉 数据库初始化完成！');
    process.exit(0);

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };