/**
 * 实时通知模型
 * 支持多种通知类型、多端推送、优先级管理
 */

const mongoose = require('mongoose');

const realtimeNotificationSchema = new mongoose.Schema({
  // 接收者
  recipient: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    villageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Village',
      index: true
    },
    // 角色广播（可选，用于群发）
    roles: [{
      type: String,
      enum: ['admin', 'village_admin', 'committee', 'member', 'guest']
    }]
  },

  // 通知类型
  type: {
    type: String,
    enum: [
      'system',              // 系统通知
      'announcement',        // 公告通知
      'financial',           // 财务通知
      'reimbursement',       // 报销通知
      'approval',            // 审批通知
      'emergency',           // 紧急通知
      'task',                // 任务通知
      'meeting',             // 会议通知
      'document',            // 文档通知
      'chat',                // 聊天消息
      'social',              // 社交通知
      'voting',              // 投票通知
      'reminder'             // 提醒通知
    ],
    required: true,
    index: true
  },

  // 通知标题和内容
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },

  // 富文本内容（支持HTML）
  richContent: {
    type: String
  },

  // 优先级
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },

  // 通知数据（扩展信息）
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // 关联对象
  related: {
    model: String,          // 关联模型名称
    id: mongoose.Schema.Types.ObjectId,  // 关联对象ID
    // 特殊字段
    action: String,         // 点击后执行的操作
    route: String          // 跳转路由
  },

  // 发送者
  sender: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    avatar: String
  },

  // 推送渠道配置
  channels: {
    websocket: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: false
    },
    email: {
      type: Boolean,
      default: false
    },
    wechat: {
      type: Boolean,
      default: false
    }
  },

  // 推送状态
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending',
    index: true
  },

  // 各渠道发送状态
  deliveryStatus: {
    websocket: {
      sent: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      failed: { type: Boolean, default: false },
      error: String
    },
    push: {
      sent: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      failed: { type: Boolean, default: false },
      error: String
    },
    sms: {
      sent: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      failed: { type: Boolean, default: false },
      error: String
    },
    email: {
      sent: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      failed: { type: Boolean, default: false },
      error: String
    }
  },

  // 阅读状态
  readStatus: {
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date
    }
  },

  // 过期时间
  expiresAt: {
    type: Date,
    default: function() {
      // 默认30天后过期
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date;
    },
    index: true
  },

  // 延迟发送
  scheduledAt: {
    type: Date,
    default: null
  },

  // 重试配置
  retry: {
    count: {
      type: Number,
      default: 0
    },
    maxRetries: {
      type: Number,
      default: 3
    },
    nextRetryAt: {
      type: Date
    }
  },

  // 模板ID（用于预定义通知）
  templateId: {
    type: String
  },

  // 标签（用于分类和筛选）
  tags: [{
    type: String
  }],

  // 统计信息
  stats: {
    viewCount: {
      type: Number,
      default: 0
    },
    clickCount: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// 索引
realtimeNotificationSchema.index({ recipient: { userId: 1, villageId: 1 }, status: 1, createdAt: -1 });
realtimeNotificationSchema.index({ 'recipient.userId': 1, 'readStatus.isRead': 1, createdAt: -1 });
realtimeNotificationSchema.index({ type: 1, status: 1, createdAt: -1 });
realtimeNotificationSchema.index({ priority: 1, status: 1, createdAt: -1 });
realtimeNotificationSchema.index({ scheduledAt: 1 }, { sparse: true });
realtimeNotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 2592000 }); // 30天TTL

// 虚拟字段
realtimeNotificationSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

realtimeNotificationSchema.virtual('isPending').get(function() {
  return this.status === 'pending';
});

realtimeNotificationSchema.virtual('isDelivered').get(function() {
  return this.status === 'delivered';
});

realtimeNotificationSchema.virtual('canRetry').get(function() {
  return this.status === 'failed' && this.retry.count < this.retry.maxRetries;
});

// 实例方法
realtimeNotificationSchema.methods.markAsRead = async function() {
  this.readStatus.isRead = true;
  this.readStatus.readAt = new Date();
  this.status = 'read';
  return this.save();
};

realtimeNotificationSchema.methods.markAsDelivered = async function(channel = 'push') {
  if (this.deliveryStatus[channel]) {
    this.deliveryStatus[channel].delivered = true;
    this.deliveryStatus[channel].deliveredAt = new Date();

    // 检查所有启用的渠道是否都已送达
    const allChannels = ['websocket', 'push', 'sms', 'email'];
    const enabledChannels = allChannels.filter(c => this.channels[c]);
    const allDelivered = enabledChannels.every(c =>
      this.deliveryStatus[c] && this.deliveryStatus[c].delivered
    );

    if (allDelivered) {
      this.status = 'delivered';
    }
  }
  return this.save();
};

realtimeNotificationSchema.methods.incrementRetry = async function() {
  this.retry.count++;
  this.retry.nextRetryAt = new Date(Date.now() + Math.pow(2, this.retry.count) * 60000);
  return this.save();
};

realtimeNotificationSchema.methods.recordView = async function() {
  this.stats.viewCount++;
  return this.save();
};

realtimeNotificationSchema.methods.recordClick = async function() {
  this.stats.clickCount++;
  return this.save();
};

// 静态方法
realtimeNotificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const {
    limit = 20,
    skip = 0,
    unreadOnly = false,
    type = null,
    villageId = null
  } = options;

  const query = { 'recipient.userId': userId };

  if (unreadOnly) {
    query['readStatus.isRead'] = false;
  }

  if (type) {
    query.type = type;
  }

  if (villageId) {
    query['recipient.villageId'] = villageId;
  }

  // 排除过期的通知
  query.expiresAt = { $gt: new Date() };

  return this.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('recipient.userId', 'username name phone')
    .populate('sender.userId', 'username name')
    .populate('related.id');
};

realtimeNotificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    'recipient.userId': userId,
    'readStatus.isRead': false,
    expiresAt: { $gt: new Date() }
  });
};

realtimeNotificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    {
      'recipient.userId': userId,
      'readStatus.isRead': false
    },
    {
      'readStatus.isRead': true,
      'readStatus.readAt': new Date(),
      status: 'read'
    }
  );
};

realtimeNotificationSchema.statics.getPendingNotifications = function(limit = 100) {
  const now = new Date();
  return this.find({
    status: 'pending',
    $or: [
      { scheduledAt: { $lte: now } },
      { scheduledAt: null }
    ],
    expiresAt: { $gt: now }
  })
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit);
};

realtimeNotificationSchema.statics.getByType = function(type, status = null, limit = 20) {
  const query = { type, expiresAt: { $gt: new Date() } };
  if (status) query.status = status;

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit);
};

realtimeNotificationSchema.statics.getFailedNotifications = function(limit = 20) {
  return this.find({
    status: 'failed',
    $expr: { $lt: ['$retry.count', '$retry.maxRetries'] }
  })
    .sort({ createdAt: 1 })
    .limit(limit);
};

realtimeNotificationSchema.statics.cleanupExpired = function() {
  const now = new Date();
  return this.deleteMany({
    expiresAt: { $lt: now },
    status: { $in: ['read', 'delivered'] }
  });
};

// 中间件：发送前验证
realtimeNotificationSchema.pre('save', function(next) {
  // 紧急通知默认启用所有渠道
  if (this.priority === 'urgent' && this.isNew) {
    this.channels.push = true;
    this.channels.sms = true;
    this.channels.wechat = true;
  }

  // 系统通知和公告默认推送到所有村民
  if ((this.type === 'system' || this.type === 'announcement') && this.isNew) {
    this.roles = ['admin', 'village_admin', 'committee', 'member', 'guest'];
  }

  next();
});

module.exports = mongoose.model('RealtimeNotification', realtimeNotificationSchema);
