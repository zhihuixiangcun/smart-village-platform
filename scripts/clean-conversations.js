/**
 * 清空会话和消息数据
 */
const mongoose = require('mongoose');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');

const MONGODB_URI = 'mongodb://localhost:27017/smart_village';

async function cleanConversations() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('========================================');
    console.log('🧹 清空会话和消息数据');
    console.log('========================================\n');

    // 统计数据量
    const convCount = await Conversation.countDocuments();
    const msgCount = await Message.countDocuments();

    console.log(`💬 当前会话数: ${convCount}`);
    console.log(`📝 当前消息数: ${msgCount}\n`);

    // 删除所有会话
    const deleteConvsResult = await Conversation.deleteMany({});
    console.log(`✅ 已删除 ${deleteConvsResult.deletedCount} 个会话`);

    // 删除所有消息
    const deleteMsgsResult = await Message.deleteMany({});
    console.log(`✅ 已删除 ${deleteMsgsResult.deletedCount} 条消息\n`);

    console.log('========================================');
    console.log('✅ 清空完成');
    console.log('========================================\n');
    console.log('💡 提示：运行 node scripts/seed-conversations-fixed.js 重新创建测试数据\n');

    return true;

  } catch (error) {
    console.error('❌ 清空失败:', error);
    return false;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 数据库连接已关闭\n');
  }
}

cleanConversations().then(success => {
  if (success) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});
