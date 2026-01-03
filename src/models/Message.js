/**
 * Message 模型
 * 聊天消息数据模型
 * 支持文本、图片、语音、视频、文件、位置等多种消息类型
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
  // 所属会话
  conversation: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },

  // 发送者
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 消息类型
  type: {
    type: String,
    enum: [
      'text',        // 文本消息
      'image',       // 图片消息
      'voice',       // 语音消息
      'video',       // 视频消息
      'file',        // 文件消息
      'location',    // 位置消息
      'system',      // 系统消息
      'recall'       // 撤回消息
    ],
    default: 'text',
    required: true
  },

  // 消息内容（根据类型不同，内容结构不同）
  content: {
    // 文本内容
    text: String,

    // 图片内容
    image: {
      url: String,
      width: Number,
      height: Number,
      thumbnail: String,
      size: Number
    },

    // 语音内容
    voice: {
      url: String,
      duration: Number,  // 秒
      size: Number,
      format: String     // mp3, aac, etc.
    },

    // 视频内容
    video: {
      url: String,
      duration: Number,  // 秒
      thumbnail: String,
      size: Number,
      width: Number,
      height: Number
    },

    // 文件内容
    file: {
      url: String,
      name: String,
      size: Number,
      mimeType: String
    },

    // 位置内容
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
      name: String
    },

    // 系统消息内容
    system: {
      text: String,        // 系统消息文本
      action: String,      // 动作类型: user_joined, user_left, etc.
      relatedUsers: [{     // 相关用户
        type: Schema.Types.ObjectId,
        ref: 'User'
      }]
    },

    // 撤回消息内容
    recall: {
      originalType: String,  // 原始消息类型
      originalContent: Schema.Types.Mixed  // 原始消息内容（用于显示"撤回了一条消息"）
    }
  },

  // 回复的消息
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },

  // @提及的用户（群聊时使用）
  mentions: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],

  // 是否@所有人
  mentionAll: {
    type: Boolean,
    default: false
  },

  // 已读状态（readBy数组中记录已读用户和阅读时间）
  readBy: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 消息状态: sending(发送中) | sent(已发送) | delivered(已送达) | read(已读) | failed(发送失败)
  status: {
    type: String,
    enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },

  // 是否已撤回
  isRecalled: {
    type: Boolean,
    default: false
  },

  // 撤回时间
  recalledAt: Date,

  // 对哪些用户删除了此消息（软删除）
  deletedFor: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],

  // 消息是否被pin（置顶）
  isPinned: {
    type: Boolean,
    default: false
  },

  // 所属乡村
  villageId: {
    type: Schema.Types.ObjectId,
    ref: 'Village'
  }
}, {
  timestamps: true,
  toObject: { virtuals: true },
  toJSON: { virtuals: true }
});

// 索引
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, 'readBy.user': 1 });
// createdAt索引已由timestamps: true自动创建,无需手动指定

// 虚拟字段：获取实际内容（根据消息类型）
messageSchema.virtual('actualContent').get(function() {
  if (this.type === 'text') return this.content.text;
  if (this.type === 'image') return this.content.image;
  if (this.type === 'voice') return this.content.voice;
  if (this.type === 'video') return this.content.video;
  if (this.type === 'file') return this.content.file;
  if (this.type === 'location') return this.content.location;
  if (this.type === 'system') return this.content.system;
  if (this.type === 'recall') return this.content.recall;
  return null;
});

// 实例方法：检查用户是否已读
messageSchema.methods.isReadBy = function(userId) {
  return this.readBy.some(
    r => r.user.toString() === userId.toString()
  );
};

// 实例方法：标记为已读
messageSchema.methods.markAsRead = function(userId) {
  if (!this.isReadBy(userId)) {
    this.readBy.push({ user: userId, readAt: new Date() });
    this.status = 'read';
    return this.save();
  }
  return Promise.resolve(this);
};

// 实例方法：批量标记已读
messageSchema.methods.markAsReadByUsers = function(userIds) {
  userIds.forEach(userId => {
    if (!this.isReadBy(userId)) {
      this.readBy.push({ user: userId, readAt: new Date() });
    }
  });
  return this.save();
};

// 实例方法：检查是否对用户可见
messageSchema.methods.isVisibleTo = function(userId) {
  return !this.deletedFor.some(
    id => id.toString() === userId.toString()
  );
};

// 实例方法：删除给指定用户
messageSchema.methods.deleteFor = function(userId) {
  if (!this.deletedFor.some(id => id.toString() === userId.toString())) {
    this.deletedFor.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};

// 实例方法：撤回消息（2分钟内）
messageSchema.methods.recall = function() {
  const now = new Date();
  const twoMinutes = 2 * 60 * 1000;

  if (now - this.createdAt > twoMinutes) {
    return Promise.reject(new Error('消息发送超过2分钟，无法撤回'));
  }

  if (this.isRecalled) {
    return Promise.reject(new Error('消息已被撤回'));
  }

  // 保存原始内容用于显示
  this.content.recall = {
    originalType: this.type,
    originalContent: this.content
  };

  this.type = 'recall';
  this.isRecalled = true;
  this.recalledAt = now;

  return this.save();
};

// 静态方法：获取会话的消息列表
messageSchema.statics.getConversationMessages = function(conversationId, options = {}) {
  const query = { conversation: conversationId };

  // 排除对当前用户删除的消息
  if (options.userId) {
    query.deletedFor = { $ne: options.userId };
  }

  // 限制查询范围
  let cursor = this.find(query)
    .populate('sender', 'username profile.avatar profile.nickName')
    .populate('replyTo')
    .populate('mentions', 'username profile.nickName')
    .sort({ createdAt: -1 });  // 最新的在前面

  // 分页
  if (options.limit) {
    cursor = cursor.limit(options.limit);
  }
  if (options.skip) {
    cursor = cursor.skip(options.skip);
  }

  // 时间范围
  if (options.before) {
    query.createdAt = { ...query.createdAt, $lt: options.before };
  }
  if (options.after) {
    query.createdAt = { ...query.createdAt, $gt: options.after };
  }

  return cursor.exec();
};

// 静态方法：获取未读消息数
messageSchema.statics.getUnreadCount = function(conversationId, userId) {
  return this.countDocuments({
    conversation: conversationId,
    sender: { $ne: userId },  // 排除自己发送的消息
    'readBy.user': { $ne: userId },  // 未读
    deletedFor: { $ne: userId }
  });
};

// 静态方法：批量标记会话消息为已读
messageSchema.statics.markConversationAsRead = async function(conversationId, userId, beforeDate = new Date()) {
  const result = await this.updateMany(
    {
      conversation: conversationId,
      'readBy.user': { $ne: userId },
      createdAt: { $lte: beforeDate }
    },
    {
      $push: {
        readBy: { user: userId, readAt: new Date() }
      },
      $set: { status: 'read' }
    }
  );
  return result.modifiedCount;
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
