/**
 * 修复 email 索引
 * 将非稀疏索引改为稀疏索引，允许多个 null 值
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart_village';

async function fixEmailIndex() {
  try {
    console.log('连接MongoDB:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB连接成功');

    const db = mongoose.connection.db;
    const collection = db.collection('users');

    // 查看当前所有索引
    console.log('\n当前索引:');
    const indexes = await collection.indexes();
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, JSON.stringify(idx.key));
    });

    // 删除旧的 email 索引
    console.log('\n删除旧的 email_1 索引...');
    try {
      await collection.dropIndex('email_1');
      console.log('✅ 旧索引删除成功');
    } catch (error) {
      if (error.code === 27) {
        console.log('⚠️  索引不存在，跳过删除');
      } else {
        throw error;
      }
    }

    // 创建新的稀疏索引
    console.log('\n创建新的稀疏 email 索引...');
    await collection.createIndex(
      { email: 1 },
      { sparse: true, unique: true, background: true }
    );
    console.log('✅ 稀疏索引创建成功');

    // 验证新索引
    console.log('\n更新后的索引:');
    const newIndexes = await collection.indexes();
    newIndexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, JSON.stringify(idx.key));
      if (idx.name === 'email_1') {
        console.log(`    稀疏: ${idx.sparse}, 唯一: ${idx.unique}`);
      }
    });

    await mongoose.disconnect();
    console.log('\n✅ 索引修复完成');
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

fixEmailIndex();
