/**
 * 查询admin参与的会话
 */
const mongoose = require('mongoose');
const Conversation = require('../src/models/Conversation');

const MONGODB_URI = 'mongodb://localhost:27017/smart_village';

async function checkAdminConversations() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const adminId = new mongoose.Types.ObjectId('695a5a09aff959537acf60b');
    console.log(`🔍 查询用户 ${adminId} 参与的会话...\n`);

    const convs = await Conversation.find({ participants: adminId })
      .populate('participants', 'username')
      .sort({ lastMessageAt: -1 })
      .limit(5);

    console.log(`找到 ${convs.length} 个会话\n`);
    convs.forEach((conv, index) => {
      const displayName = conv.groupInfo?.name || '私聊';
      const participants = conv.participants.map(p => p.username).join(', ');
      const lastMessageTime = conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleString('zh-CN') : '无';

      console.log(`${index + 1}. [${conv.type}] ${displayName}`);
      console.log(`   ID: ${conv._id}`);
      console.log(`   参与者: ${participants}`);
      console.log(`   最后消息时间: ${lastMessageTime}`);
      console.log(`   最后消息引用: ${conv.lastMessage || '无'}`);
      console.log(`   未读数: ${conv.unreadCount ? conv.unreadCount.size : 0}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 数据库连接已关闭\n');
  }
}

checkAdminConversations();
