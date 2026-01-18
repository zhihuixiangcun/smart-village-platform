const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  // 会话类型：private | group
  type: {
    type: String,
    enum: ['private', 'group'],
    required: true,
    default: 'private',
    index: true
  },

  // 会话名称（群组需要）
  name: {
    type: String,
    required: true
  },

  // 会话头像（emoji或图片URL）
  avatar: {
    type: String,
    default: '👥'
  },

  // 参与者列表
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // 群主（群组会话）
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // 管理员列表（群组会话）
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // 最后一条消息内容（摘要）
  lastMessage: {
    type: String,
    default: ''
  },

  // 最后一条消息时间
  lastMessageTime: {
    type: Date,
    default: Date.now,
    index: true
  },

  // 未读消息数（按用户存储）
  unreadCount: {
    type: Map,
    of: Number,
    default: new Map()
  },

  // 创建者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // 成员数量（群组会话）
  memberCount: {
    type: Number,
    default: 0
  },

  // 是否置顶
  isPinned: {
    type: Boolean,
    default: false
  },

  // 是否免打扰
  isMuted: {
    type: Boolean,
    default: false
  },

  // 群组公告（群组会话）
  announcement: {
    type: String,
    default: ''
  },

  // 是否解散
  isDissolved: {
    type: Boolean,
    default: false
  },

  // 解散时间
  dissolvedAt: {
    type: Date
  },

  // 群组描述（群组会话）
  description: {
    type: String,
    default: ''
  },

  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  },

  // 更新时间
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

// 索引
conversationSchema.index({ participants: 1, lastMessageTime: -1 });
conversationSchema.index({ isPinned: -1, lastMessageTime: -1 });

// 实例方法 - 检查用户是否在会话中
conversationSchema.methods.hasParticipant = function(userId) {
  return this.participants.some(p => p.toString() === userId.toString());
};

// 实例方法 - 获取未读数
conversationSchema.methods.getUnreadCount = function(userId) {
  return this.unreadCount.get(userId.toString()) || 0;
};

// 实例方法 - 增加未读数
conversationSchema.methods.incrementUnread = function(userId) {
  const key = userId.toString();
  const currentCount = this.unreadCount.get(key) || 0;
  this.unreadCount.set(key, currentCount + 1);
  return this;
};

// 实例方法 - 清空未读数
conversationSchema.methods.clearUnread = function(userId) {
  this.unreadCount.set(userId.toString(), 0);
  return this;
};

// 静态方法 - 获取用户的会话列表
conversationSchema.statics.getUserConversations = async function(userId, options = {}) {
  const { type, limit = 50, skip = 0, pinnedFirst = true } = options;

  const query = { participants: userId };

  if (type) {
    query.type = type;
  }

  // 排序：置顶优先，然后按最后消息时间倒序
  const sort = pinnedFirst
    ? { isPinned: -1, lastMessageTime: -1 }
    : { lastMessageTime: -1 };

  let conversations = await this.find(query)
    .populate('participants', 'username profile.nickName profile.avatar')
    .populate('ownerId', 'username profile.nickName')
    .populate('admins', 'username profile.nickName')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  // 格式化会话
  conversations = conversations.map(conv => {
    const formatted = conv.toObject();

    // 添加memberCount
    formatted.memberCount = formatted.participants.length;

    // 格式化participants
    formatted.participants = formatted.participants.map(p => ({
      id: p._id,
      name: p.username || p.profile?.nickName || '未知用户',
      avatar: p.profile?.avatar || '👤'
    }));

    // 添加未读数
    formatted.unreadCount = conv.getUnreadCount(userId);

    // 添加name（私聊显示对方名字，群聊显示群名）
    if (formatted.type === 'private') {
      const otherParticipant = formatted.participants.find(p => p.id.toString() !== userId.toString());
      formatted.name = otherParticipant?.name || '未知用户';
      formatted.avatar = otherParticipant?.avatar || '👤';
    }

    return formatted;
  });

  return conversations;
};

// 静态方法 - 查找私聊会话
conversationSchema.statics.findPrivateConversation = async function(userId1, userId2) {
  return await this.findOne({
    type: 'private',
    participants: { $all: [userId1, userId2], $size: 2 }
  });
};

module.exports = mongoose.model('Conversation', conversationSchema);
