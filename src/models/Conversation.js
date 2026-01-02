/**
 * Conversation 模型
 * 聊天会话/对话数据模型
 * 支持私聊和群聊
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const conversationSchema = new Schema({
  // 会话类型: private(私聊) | group(群聊)
  type: {
    type: String,
    enum: ['private', 'group'],
    default: 'private',
    required: true
  },

  // 参与者（私聊为两人，群聊为多人）
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],

  // 群聊信息（仅群聊）
  groupInfo: {
    // 群名称
    name: {
      type: String,
      maxlength: 50
    },
    // 群头像
    avatar: String,
    // 群描述
    description: {
      type: String,
      maxlength: 200
    },
    // 群主
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    // 管理员
    admins: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    // 最大成员数
    maxMembers: {
      type: Number,
      default: 500,
      min: 3,
      max: 1000
    },
    // 入群验证: none(不需要) | approve(需要审批) | question(需要回答问题)
    joinApproval: {
      type: String,
      enum: ['none', 'approve', 'question'],
      default: 'none'
    },
    // 入群问题
    joinQuestion: {
      question: String,
      answer: String
    }
  },

  // 最后一条消息引用
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },

  // 最后消息时间（用于排序）
  lastMessageAt: {
    type: Date,
    default: Date.now
  },

  // 未读消息数 (Map: userId -> count)
  unreadCount: {
    type: Map,
    of: Number,
    default: new Map()
  },

  // 静音用户列表
  mutedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],

  // 置顶会话列表
  pinnedBy: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // 会话状态: active(活跃) | archived(已归档) | deleted(已删除)
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },

  // 所属乡村
  villageId: {
    type: Schema.Types.ObjectId,
    ref: 'Village'
  }
}, {
  timestamps: true,
  // 添加虚拟字段
  toObject: { virtuals: true },
  toJSON: { virtuals: true }
});

// 索引
conversationSchema.index({ participants: 1, lastMessageAt: -1 });
conversationSchema.index({ type: 1, villageId: 1 });
conversationSchema.index({ status: 1, lastMessageAt: -1 });
conversationSchema.index({ 'pinnedBy.user': 1 });

// 虚拟字段：获取显示名称
conversationSchema.virtual('displayName').get(function() {
  if (this.type === 'group') {
    return this.groupInfo?.name || '群聊';
  }
  // 私聊时显示对方名称（需要在前端处理）
  return '';
});

// 虚拟字段：获取显示头像
conversationSchema.virtual('displayAvatar').get(function() {
  if (this.type === 'group') {
    return this.groupInfo?.avatar;
  }
  // 私聊时显示对方头像（需要在前端处理）
  return null;
});

// 实例方法：获取用户在此会话中的未读数
conversationSchema.methods.getUnreadCount = function(userId) {
  return this.unreadCount.get(userId.toString()) || 0;
};

// 实例方法：增加未读数
conversationSchema.methods.incrementUnread = function(userId) {
  const currentCount = this.getUnreadCount(userId);
  this.unreadCount.set(userId.toString(), currentCount + 1);
  return this.save();
};

// 实例方法：清空未读数
conversationSchema.methods.clearUnread = function(userId) {
  this.unreadCount.set(userId.toString(), 0);
  return this.save();
};

// 实例方法：检查用户是否在会话中
conversationSchema.methods.hasParticipant = function(userId) {
  return this.participants.some(p => p.toString() === userId.toString());
};

// 实例方法：检查用户是否是群主
conversationSchema.methods.isOwner = function(userId) {
  return this.type === 'group' &&
    this.groupInfo?.owner?.toString() === userId.toString();
};

// 实例方法：检查用户是否是管理员
conversationSchema.methods.isAdmin = function(userId) {
  if (this.type !== 'group') return false;
  if (this.isOwner(userId)) return true;
  return this.groupInfo?.admins?.some(
    admin => admin.toString() === userId.toString()
  );
};

// 实例方法：检查用户是否已静音
conversationSchema.methods.isMuted = function(userId) {
  return this.mutedBy.some(id => id.toString() === userId.toString());
};

// 实例方法：检查会话是否被用户置顶
conversationSchema.methods.isPinned = function(userId) {
  return this.pinnedBy.some(p => p.user.toString() === userId.toString());
};

// 静态方法：查找两个用户之间的私聊会话
conversationSchema.statics.findPrivateConversation = function(user1Id, user2Id) {
  return this.findOne({
    type: 'private',
    participants: { $all: [user1Id, user2Id], $size: 2 },
    status: { $ne: 'deleted' }
  }).populate('participants', 'username profile.avatar profile.nickName');
};

// 静态方法：获取用户的所有会话
conversationSchema.statics.getUserConversations = function(userId, options = {}) {
  const query = {
    participants: userId,
    status: { $ne: 'deleted' }
  };

  if (options.type) {
    query.type = options.type;
  }

  let sortOption = {};
  if (options.pinnedFirst) {
    // 置顶的排在前面
    sortOption = { 'pinnedBy.timestamp': -1, lastMessageAt: -1 };
  } else {
    sortOption = { lastMessageAt: -1 };
  }

  return this.find(query)
    .populate('participants', 'username profile.avatar profile.nickName profile.phone')
    .populate('lastMessage')
    .sort(sortOption)
    .limit(options.limit || 50);
};

// 中间件：保存前更新最后消息时间
conversationSchema.pre('save', function(next) {
  if (this.isModified('lastMessage')) {
    this.lastMessageAt = new Date();
  }
  next();
});

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
