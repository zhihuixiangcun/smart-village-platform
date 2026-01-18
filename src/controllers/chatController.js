/**
 * Chat Controller
 * 聊天控制器 - 处理会话和消息相关的业务逻辑
 */

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const logger = require('../utils/logger');

// WebSocket服务（用于实时推送）
let webSocketService = null;
try {
  webSocketService = require('../services/webSocketService');
} catch (e) {
  logger.warn('WebSocket service not available for chat controller');
}

/**
 * 获取用户的会话列表
 */
async function getConversations(req, res) {
  try {
    const userId = req.user.id;
    const { type, limit = 50, skip = 0 } = req.query;

    const conversations = await Conversation.getUserConversations(userId, {
      type,
      limit: parseInt(limit),
      skip: parseInt(skip),
      pinnedFirst: true
    });

    // 获取总未读数
    let totalUnread = 0;
    conversations.forEach(conv => {
      totalUnread += conv.getUnreadCount(userId);
    });

    res.json({
      success: true,
      data: {
        conversations,
        totalUnread
      }
    });
  } catch (error) {
    logger.error('获取会话列表失败:', error);
    res.status(500).json({
      success: false,
      message: `获取会话列表失败: ${  error.message}`
    });
  }
}

/**
 * 获取会话详情
 */
async function getConversationById(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findById(id)
      .populate('participants', 'username profile.avatar profile.nickName profile.phone')
      .populate('lastMessage')
      .populate('groupInfo.owner', 'username profile.nickName')
      .populate('groupInfo.admins', 'username profile.nickName');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: '会话不存在'
      });
    }

    // 检查用户是否在会话中
    if (!conversation.hasParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: '无权访问此会话'
      });
    }

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    logger.error('获取会话详情失败:', error);
    res.status(500).json({
      success: false,
      message: `获取会话详情失败: ${  error.message}`
    });
  }
}

/**
 * 创建会话（私聊或群聊）
 */
async function createConversation(req, res) {
  try {
    const userId = req.user.id;
    const { type, participants, groupInfo } = req.body;

    if (type === 'private') {
      // 私聊：检查是否已存在
      const otherUserId = participants.find(p => p !== userId);
      if (!otherUserId) {
        return res.status(400).json({
          success: false,
          message: '私聊需要指定另一个用户'
        });
      }

      // 验证对方用户存在
      const otherUser = await User.findById(otherUserId);
      if (!otherUser) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 查找现有会话
      let conversation = await Conversation.findPrivateConversation(userId, otherUserId);

      if (!conversation) {
        // 创建新会话
        conversation = new Conversation({
          type: 'private',
          name: otherUser.profile?.nickName || otherUser.username || '未知用户',
          participants: [userId, otherUserId],
          lastMessageTime: new Date()
        });
        await conversation.save();
      }

      // 返回完整的会话信息
      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'username profile.avatar profile.nickName');

      res.json({
        success: true,
        data: conversation
      });
    } else if (type === 'group') {
      // 群聊
      if (!participants || participants.length < 3) {
        return res.status(400).json({
          success: false,
          message: '群聊至少需要3个成员'
        });
      }

      if (!groupInfo || !groupInfo.name) {
        return res.status(400).json({
          success: false,
          message: '群聊需要设置名称'
        });
      }

      // 验证所有用户存在
      const users = await User.find({ _id: { $in: participants } });
      if (users.length !== participants.length) {
        return res.status(400).json({
          success: false,
          message: '部分用户不存在'
        });
      }

      const conversation = new Conversation({
        type: 'group',
        name: groupInfo.name,
        avatar: groupInfo.avatar || '👥',
        participants,
        ownerId: userId,
        admins: [userId], // 创建者默认为管理员
        description: groupInfo.description || '',
        announcement: groupInfo.announcement || '',
        lastMessageTime: new Date()
      });

      await conversation.save();

      // 返回完整的会话信息
      const populatedConversation = await Conversation.findById(conversation._id)
        .populate('participants', 'username profile.avatar profile.nickName')
        .populate('ownerId', 'username profile.nickName')
        .populate('admins', 'username profile.nickName');

      // 通过WebSocket通知所有参与者
      if (webSocketService) {
        participants.forEach(pid => {
          webSocketService.sendToUser(pid, {
            type: 'new_conversation',
            data: populatedConversation
          });
        });
      }

      res.json({
        success: true,
        data: populatedConversation
      });
    } else {
      res.status(400).json({
        success: false,
        message: '无效的会话类型'
      });
    }
  } catch (error) {
    logger.error('创建会话失败:', error);
    res.status(500).json({
      success: false,
      message: `创建会话失败: ${  error.message}`
    });
  }
}

/**
 * 获取会话的消息列表
 */
async function getMessages(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { limit = 50, before, after } = req.query;

    // 验证会话存在且用户有权访问
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: '会话不存在'
      });
    }

    if (!conversation.hasParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: '无权访问此会话'
      });
    }

    const messages = await Message.getConversationMessages(id, {
      userId,
      limit: parseInt(limit),
      before: before ? new Date(before) : null,
      after: after ? new Date(after) : null
    });

    res.json({
      success: true,
      data: messages.reverse() // 按时间正序返回
    });
  } catch (error) {
    logger.error('获取消息列表失败:', error);
    res.status(500).json({
      success: false,
      message: `获取消息列表失败: ${  error.message}`
    });
  }
}

/**
 * 发送消息
 */
async function sendMessage(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { type, content, file, duration, location, redPacket, gift, transfer, coupon } = req.body;

    // 验证会话存在且用户有权访问
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: '会话不存在'
      });
    }

    if (!conversation.hasParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: '无权访问此会话'
      });
    }

    // 获取发送者信息
    const user = await User.findById(userId);

    // 构建消息内容
    let messageContent = content || '';
    if (type === 'location' && location) {
      messageContent = JSON.stringify(location);
    } else if (type === 'redpacket' && redPacket) {
      messageContent = JSON.stringify(redPacket);
    } else if (type === 'gift' && gift) {
      messageContent = JSON.stringify(gift);
    } else if (type === 'transfer' && transfer) {
      messageContent = JSON.stringify(transfer);
    } else if (type === 'coupon' && coupon) {
      messageContent = JSON.stringify(coupon);
    }

    // 创建消息
    const message = new Message({
      conversationId: id,
      senderId: userId,
      senderName: user.profile?.nickName || user.username || '未知用户',
      senderAvatar: user.profile?.avatar || '👤',
      content: messageContent,
      type: type || 'text',
      status: 'sent',
      file,
      duration,
      location,
      redPacket,
      gift,
      transfer,
      coupon
    });

    await message.save();

    // 更新会话的最后消息和时间
    let lastMessageText = messageContent;
    if (type === 'image') {
      lastMessageText = '[图片]';
    } else if (type === 'voice') {
      lastMessageText = '[语音]';
    } else if (type === 'video') {
      lastMessageText = '[视频]';
    } else if (type === 'location') {
      lastMessageText = '[位置]';
    } else if (type === 'redpacket') {
      lastMessageText = '[红包]';
    } else if (type === 'gift') {
      lastMessageText = '[礼物]';
    } else if (type === 'transfer') {
      lastMessageText = '[转账]';
    } else if (type === 'coupon') {
      lastMessageText = '[卡券]';
    }

    conversation.lastMessage = lastMessageText;
    conversation.lastMessageTime = new Date();

    // 增加其他参与者的未读数
    for (const participantId of conversation.participants) {
      if (participantId.toString() !== userId.toString()) {
        conversation.incrementUnread(participantId);
      }
    }
    await conversation.save();

    // 格式化返回的消息
    const formattedMessage = {
      id: message._id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName: message.senderName,
      senderAvatar: message.senderAvatar,
      content: messageContent,
      type: message.type,
      status: message.status,
      read: message.read,
      isSelf: true,
      timestamp: message.createdAt.toISOString(),
      duration: message.duration,
      file: message.file,
      location: message.location,
      redPacket: message.redPacket,
      gift: message.gift,
      transfer: message.transfer,
      coupon: message.coupon
    };

    // 通过WebSocket通知会话中的所有参与者
    if (webSocketService) {
      const roomName = `conversation_${id}`;
      webSocketService.sendToRoom(roomName, {
        type: 'new_message',
        data: {
          message: formattedMessage,
          conversation: {
            _id: conversation._id,
            lastMessage: conversation.lastMessage,
            lastMessageTime: conversation.lastMessageTime
          }
        }
      });

      // 发送未读数更新
      conversation.participants.forEach(participantId => {
        if (participantId.toString() !== userId.toString()) {
          webSocketService.sendToUser(participantId, {
            type: 'conversation_updated',
            data: {
              conversationId: conversation._id,
              lastMessage: conversation.lastMessage,
              lastMessageTime: conversation.lastMessageTime,
              unreadCount: conversation.getUnreadCount(participantId)
            }
          });
        }
      });
    }

    res.json({
      success: true,
      data: formattedMessage
    });
  } catch (error) {
    logger.error('发送消息失败:', error);
    res.status(500).json({
      success: false,
      message: `发送消息失败: ${  error.message}`
    });
  }
}

/**
 * 撤回消息
 */
async function recallMessage(req, res) {
  try {
    const { id, messageId } = req.params;
    const userId = req.user.id;

    // 验证会话存在且用户有权访问
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: '会话不存在'
      });
    }

    if (!conversation.hasParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: '无权访问此会话'
      });
    }

    // 获取消息
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: '消息不存在'
      });
    }

    // 验证消息属于此会话
    if (message.conversationId.toString() !== id) {
      return res.status(400).json({
        success: false,
        message: '消息不属于此会话'
      });
    }

    // 只有发送者可以撤回
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: '只能撤回自己发送的消息'
      });
    }

    // 执行撤回
    await message.recall();

    // 通过WebSocket通知会话中的所有参与者
    if (webSocketService) {
      const roomName = `conversation_${id}`;
      webSocketService.sendToRoom(roomName, {
        type: 'message_recalled',
        data: {
          messageId: message._id,
          conversationId: id
        }
      });
    }

    res.json({
      success: true,
      data: { message: '消息已撤回' }
    });
  } catch (error) {
    logger.error('撤回消息失败:', error);
    res.status(500).json({
      success: false,
      message: `撤回消息失败: ${  error.message}`
    });
  }
}

/**
 * 标记消息为已读
 */
async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { before } = req.body;

    // 验证会话存在
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: '会话不存在'
      });
    }

    if (!conversation.hasParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: '无权访问此会话'
      });
    }

    // 批量标记已读
    const beforeDate = before ? new Date(before) : new Date();
    const modifiedCount = await Message.markConversationAsRead(id, userId, beforeDate);

    // 清空会话的未读数
    await conversation.clearUnread(userId);

    // 通过WebSocket通知发送者（消息已读）
    if (webSocketService && modifiedCount > 0) {
      // 查找会话中的其他用户并通知
      conversation.participants.forEach(participantId => {
        if (participantId.toString() !== userId.toString()) {
          webSocketService.sendToUser(participantId, {
            type: 'messages_read',
            data: {
              conversationId: id,
              readerId: userId,
              readAt: beforeDate
            }
          });
        }
      });
    }

    res.json({
      success: true,
      data: {
        markedCount: modifiedCount
      }
    });
  } catch (error) {
    logger.error('标记已读失败:', error);
    res.status(500).json({
      success: false,
      message: `标记已读失败: ${  error.message}`
    });
  }
}

/**
 * 上传图片
 */
async function uploadImage(req, res) {
  try {
    // 图片上传逻辑（使用现有的文件上传服务）
    // TODO: 实现图片上传功能
    res.json({
      success: true,
      data: {
        url: '/uploads/chat/images/xxx.jpg'
      }
    });
  } catch (error) {
    logger.error('上传图片失败:', error);
    res.status(500).json({
      success: false,
      message: `上传图片失败: ${  error.message}`
    });
  }
}

/**
 * 获取未读消息数
 */
async function getUnreadCount(req, res) {
  try {
    const userId = req.user.id;

    const conversations = await Conversation.getUserConversations(userId);
    let totalUnread = 0;
    const unreadByConversation = {};

    conversations.forEach(conv => {
      const count = conv.getUnreadCount(userId);
      if (count > 0) {
        totalUnread += count;
        unreadByConversation[conv._id] = count;
      }
    });

    res.json({
      success: true,
      data: {
        total: totalUnread,
        byConversation: unreadByConversation
      }
    });
  } catch (error) {
    logger.error('获取未读数失败:', error);
    res.status(500).json({
      success: false,
      message: `获取未读数失败: ${  error.message}`
    });
  }
}

/**
 * 置顶/取消置顶会话
 */
async function togglePin(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: '会话不存在'
      });
    }

    if (!conversation.hasParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: '无权操作此会话'
      });
    }

    const existingPinIndex = conversation.pinnedBy.findIndex(
      p => p.user.toString() === userId.toString()
    );

    if (existingPinIndex >= 0) {
      // 取消置顶
      conversation.pinnedBy.splice(existingPinIndex, 1);
    } else {
      // 添加置顶
      conversation.pinnedBy.push({ user: userId, timestamp: new Date() });
    }

    await conversation.save();

    res.json({
      success: true,
      data: {
        isPinned: existingPinIndex < 0
      }
    });
  } catch (error) {
    logger.error('切换置顶状态失败:', error);
    res.status(500).json({
      success: false,
      message: `切换置顶状态失败: ${  error.message}`
    });
  }
}

/**
 * 静音/取消静音会话
 */
async function toggleMute(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: '会话不存在'
      });
    }

    if (!conversation.hasParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: '无权操作此会话'
      });
    }

    const existingMuteIndex = conversation.mutedBy.findIndex(
      id => id.toString() === userId.toString()
    );

    if (existingMuteIndex >= 0) {
      // 取消静音
      conversation.mutedBy.splice(existingMuteIndex, 1);
    } else {
      // 添加静音
      conversation.mutedBy.push(userId);
    }

    await conversation.save();

    res.json({
      success: true,
      data: {
        isMuted: existingMuteIndex < 0
      }
    });
  } catch (error) {
    logger.error('切换静音状态失败:', error);
    res.status(500).json({
      success: false,
      message: `切换静音状态失败: ${  error.message}`
    });
  }
}

/**
 * 清空聊天记录
 */
async function clearConversationMessages(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { timeRange, messageTypes, clearAllConversations } = req.body;

    // 清空所有会话（管理员权限）
    if (clearAllConversations) {
      // 检查管理员权限
      const user = await User.findById(userId);
      if (!user || !user.profile?.roles?.includes('admin')) {
        return res.status(403).json({
          success: false,
          message: '需要管理员权限才能清空所有会话'
        });
      }

      // 清空所有消息
      const deleteResult = await Message.deleteMany({
        type: { $nin: ['recall'] } // 保留撤回消息
      });

      // 更新所有会话
      await Conversation.updateMany({}, {
        $unset: {
          lastMessage: 1,
          lastMessageTime: 1
        }
      });

      logger.info(`管理员 ${userId} 清空了所有聊天记录，删除 ${deleteResult.deletedCount} 条消息`);

      // 通过WebSocket通知所有用户
      if (webSocketService) {
        webSocketService.broadcastToAll({
          type: 'all_conversations_cleared',
          data: {
            clearedAt: new Date()
          }
        });
      }

      return res.json({
        success: true,
        data: {
          deletedCount: deleteResult.deletedCount,
          message: '已清空所有聊天记录'
        }
      });
    }

    // 清空单个会话
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: '会话不存在'
      });
    }

    if (!conversation.hasParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: '无权操作此会话'
      });
    }

    // 构建查询条件
    const query = {
      conversationId: id,
      type: { $nin: ['recall'] } // 保留撤回消息
    };

    // 按时间范围过滤
    if (timeRange && timeRange !== 'all') {
      const now = new Date();
      let startDate;

      switch (timeRange) {
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
      }

      query.createdAt = {
        $gte: startDate,
        $lte: now
      };
    }

    // 按消息类型过滤
    if (messageTypes && messageTypes.length > 0 && !messageTypes.includes('all')) {
      query.type = { $in: messageTypes };
    }

    // 删除消息
    const deleteResult = await Message.deleteMany(query);

    // 更新会话的最后消息信息
    conversation.lastMessage = '';
    conversation.lastMessageTime = null;
    await conversation.save();

    // 清空未读数
    conversation.participants.forEach(participantId => {
      conversation.clearUnread(participantId);
    });
    await conversation.save();

    logger.info(`用户 ${userId} 清空会话 ${id} 的消息，删除 ${deleteResult.deletedCount} 条消息`);

    // 通过WebSocket通知会话中的所有参与者
    if (webSocketService) {
      const roomName = `conversation_${id}`;
      webSocketService.sendToRoom(roomName, {
        type: 'conversation_messages_cleared',
        data: {
          conversationId: id,
          deletedCount: deleteResult.deletedCount,
          clearedBy: userId,
          clearedAt: new Date()
        }
      });

      // 通知所有参与者更新未读数
      conversation.participants.forEach(participantId => {
        webSocketService.sendToUser(participantId, {
          type: 'conversation_updated',
          data: {
            conversationId: id,
            lastMessage: '',
            lastMessageTime: null,
            unreadCount: 0
          }
        });
      });
    }

    res.json({
      success: true,
      data: {
        deletedCount: deleteResult.deletedCount,
        message: '聊天记录已清空'
      }
    });
  } catch (error) {
    logger.error('清空聊天记录失败:', error);
    res.status(500).json({
      success: false,
      message: `清空聊天记录失败: ${  error.message}`
    });
  }
}

module.exports = {
  getConversations,
  getConversationById,
  createConversation,
  getMessages,
  sendMessage,
  recallMessage,
  markAsRead,
  uploadImage,
  getUnreadCount,
  togglePin,
  toggleMute,
  clearConversationMessages
};
