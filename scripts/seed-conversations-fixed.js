/**
 * 创建测试会话数据（修复版）
 */
const mongoose = require('mongoose');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');
const User = require('../src/models/User');

// MongoDB连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_village';

async function seedConversations() {
  try {
    console.log('========================================');
    console.log('🌱 创建测试会话数据（修复版）');
    console.log('========================================\n');

    // 连接数据库
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    // 1. 清空现有会话和消息（可选）
    // await Conversation.deleteMany({});
    // await Message.deleteMany({});
    // console.log('🗑️  已清空现有会话和消息\n');

    // 2. 获取测试用户
    const users = await User.find().limit(5);
    console.log(`👥 找到 ${users.length} 个用户\n`);

    if (users.length < 2) {
      console.log('❌ 需要至少2个用户来创建会话\n');
      return false;
    }

    // 3. 创建测试会话
    const testConversations = [];

    // 私聊会话1：admin <-> test
    const privateConv1 = new Conversation({
      type: 'private',
      participants: [users[0]._id, users[1]._id],
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 5) // 5分钟前
    });
    testConversations.push(privateConv1);

    // 私聊会话2：admin <-> testadmin
    const privateConv2 = new Conversation({
      type: 'private',
      participants: [users[0]._id, users[2]._id],
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 30) // 30分钟前
    });
    testConversations.push(privateConv2);

    // 群聊会话：admin, test, testadmin, testcadre
    if (users.length >= 4) {
      const groupConv = new Conversation({
        type: 'group',
        groupInfo: {
          name: '村委会工作群',
          avatar: '🏛️',
          description: '村委会日常工作交流群'
        },
        participants: [users[0]._id, users[1]._id, users[2]._id, users[3]._id],
        ownerId: users[0]._id,
        admins: [users[0]._id],
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 60) // 1小时前
      });
      testConversations.push(groupConv);
    }

    // 保存会话
    console.log('💬 创建会话...');
    for (const conv of testConversations) {
      await conv.save();
      const displayName = conv.groupInfo?.name || '私聊';
      console.log(`  ✅ [${conv.type}] ${displayName} (${conv._id})`);
    }
    console.log('');

    // 4. 创建测试消息
    const testMessages = [];

    // 为私聊1创建消息
    testMessages.push({
      conversation: testConversations[0]._id,
      sender: users[0]._id,
      content: { text: '你好，最近怎么样？' },
      type: 'text',
      status: 'sent',
      read: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 5)
    });

    testMessages.push({
      conversation: testConversations[0]._id,
      sender: users[1]._id,
      content: { text: '挺好的，谢谢关心！' },
      type: 'text',
      status: 'sent',
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 3)
    });

    testMessages.push({
      conversation: testConversations[0]._id,
      sender: users[1]._id,
      content: { text: '最近村里有什么新政策吗？' },
      type: 'text',
      status: 'sent',
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 1)
    });

    // 为私聊2创建语音消息
    testMessages.push({
      conversation: testConversations[1]._id,
      sender: users[1]._id,
      content: {
        voice: {
          url: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
          duration: 3
        }
      },
      type: 'voice',
      status: 'sent',
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 30)
    });

    // 为群聊创建消息
    if (testConversations.length >= 3) {
      testMessages.push({
        conversation: testConversations[2]._id,
        sender: users[0]._id,
        content: { text: '大家好，明天开会讨论村务公开事宜' },
        type: 'text',
        status: 'sent',
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60)
      });

      testMessages.push({
        conversation: testConversations[2]._id,
        sender: users[1]._id,
        content: { text: '好的，我会准时参加' },
        type: 'text',
        status: 'sent',
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 50)
      });
    }

    // 保存消息
    console.log('📝 创建消息...');
    const savedMessages = [];
    for (const msgData of testMessages) {
      const message = new Message(msgData);
      await message.save();
      savedMessages.push(message);

      // 格式化消息内容用于显示
      let contentPreview = '';
      if (message.type === 'text') {
        contentPreview = message.content?.text || '';
      } else if (message.type === 'voice') {
        contentPreview = '[语音]';
      } else if (message.type === 'image') {
        contentPreview = '[图片]';
      } else {
        contentPreview = '[其他]';
      }

      const previewText = contentPreview.length > 30 ? contentPreview.substring(0, 30) + '...' : contentPreview;
      console.log(`  ✅ [${message.type}] ${previewText}`);
    }
    console.log('');

    // 5. 更新会话的lastMessage引用
    console.log('🔄 更新会话的lastMessage引用...');
    for (let i = 0; i < testConversations.length; i++) {
      const conv = testConversations[i];
      const convMessages = savedMessages.filter(m => m.conversation.toString() === conv._id.toString());

      if (convMessages.length > 0) {
        // 获取最后一条消息
        const lastMsg = convMessages[convMessages.length - 1];

        // 更新会话的lastMessage和lastMessageAt
        await Conversation.findByIdAndUpdate(conv._id, {
          lastMessage: lastMsg._id,
          lastMessageAt: lastMsg.createdAt
        });

        // 计算未读数
        const unreadCount = new Map();
        convMessages.forEach(msg => {
          if (!msg.read) {
            const senderId = msg.sender.toString();

            // 除了发送者之外的所有参与者都未读
            conv.participants.forEach(pId => {
              const participantId = pId.toString();
              if (participantId !== senderId) {
                unreadCount.set(participantId, (unreadCount.get(participantId) || 0) + 1);
              }
            });
          }
        });

        // 设置未读数
        await Conversation.findByIdAndUpdate(conv._id, {
          unreadCount: unreadCount
        });

        const displayName = conv.groupInfo?.name || '私聊';
        console.log(`  ✅ [${conv.type}] ${displayName}: 更新了lastMessage和unreadCount`);
      }
    }
    console.log('');

    console.log('========================================');
    console.log('✅ 测试数据创建完成');
    console.log('========================================');
    console.log(`💬 会话数: ${testConversations.length}`);
    console.log(`📝 消息数: ${savedMessages.length}\n`);

    return true;

  } catch (error) {
    console.error('❌ 创建测试数据失败:', error);
    return false;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 数据库连接已关闭\n');
  }
}

// 执行种子数据创建
seedConversations().then(success => {
  if (success) {
    console.log('🎉 测试数据创建成功！\n');
    console.log('💡 提示：刷新前端页面即可看到会话列表\n');
    process.exit(0);
  } else {
    console.log('❌ 测试数据创建失败\n');
    process.exit(1);
  }
});
