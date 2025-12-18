/**
 * 通知数据模型
 * 存储系统通知消息
 */

const mongoose = require('mongoose');

// 通知类型
const NotificationTypes = {
  APPROVAL_REQUEST: 'approval_request',
  APPROVAL_RESULT: 'approval_result',
  APPROVAL_FORWARD: 'approval_forward',
  APPROVAL_OVERDUE: 'approval_overdue',
  SYSTEM_NOTICE: 'system_notice',
  FINANCE_REPORT: 'finance_report',
  MAINTENANCE: 'maintenance',
  EMERGENCY: 'emergency'
};

// 通知状态
const NotificationStatus = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
};

// 通知渠道
const NotificationChannels = {
  SMS: 'sms',
  EMAIL: 'email',
  PUSH: 'push',
  WEBSOCKET: 'websocket',
  SYSTEM: 'system'
};

/**
 * 通知模型
 */
const NotificationSchema = new mongoose.Schema({
  // 接收者
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 通知类型
  type: {
    type: String,
    enum: Object.values(NotificationTypes),
    required: true,
    index: true
  },

  // 通知标题
  title: {
    type: String,
    required: true,
    maxlength: 200
  },

  // 通知内容
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },

  // 附加数据
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // 通知渠道
  channels: [{
    type: String,
    enum: Object.values(NotificationChannels)
  }],

  // 通知优先级
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium',
    index: true
  },

  // 发送状态
  status: {
    type: String,
    enum: Object.values(NotificationStatus),
    default: NotificationStatus.SENT
  },

  // 发送时间
  sentAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  // 阅读时间
  readAt: Date,

  // 送达时间
  deliveredAt: Date,

  // 重试次数
  retryCount: {
    type: Number,
    default: 0
  },

  // 错误信息
  error: String,

  // 关联对象（如交易ID）
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },

  // 关联对象类型
  relatedType: {
    type: String,
    enum: ['transaction', 'budget', 'announcement', 'user']
  },

  // 是否已读
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },

  // 过期时间
  expiresAt: Date,

  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  // 更新时间
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'notifications'
});

// 复合索引
NotificationSchema.index({ recipientId: 1, isRead: 1 });
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, sentAt: -1 });
NotificationSchema.index({ priority: 1, status: 1 });

// 虚拟字段
NotificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt;
});

NotificationSchema.virtual('daysSinceSent').get(function() {
  return Math.floor((Date.now() - this.sentAt) / (1000 * 60 * 60 * 24));
});

// 实例方法 - 标记为已读
NotificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  this.status = NotificationStatus.READ;
  return this.save();
};

// 实例方法 - 标记为已送达
NotificationSchema.methods.markAsDelivered = function() {
  this.deliveredAt = new Date();
  if (this.status === NotificationStatus.SENT) {
    this.status = NotificationStatus.DELIVERED;
  }
  return this.save();
};

// 实例方法 - 标记为失败
NotificationSchema.methods.markAsFailed = function(error) {
  this.status = NotificationStatus.FAILED;
  this.error = error;
  return this.save();
};

// 静态方法 - 获取用户未读通知数量
NotificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    recipientId: userId,
    isRead: false,
    status: { $ne: NotificationStatus.FAILED }
  });
};

// 静态方法 - 获取用户通知列表
NotificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    isRead,
    type,
    priority,
    startDate,
    endDate
  } = options;

  const query = {
    recipientId: userId,
    status: { $ne: NotificationStatus.FAILED }
  };

  if (typeof isRead === 'boolean') {
    query.isRead = isRead;
  }

  if (type) {
    query.type = type;
  }

  if (priority) {
    query.priority = priority;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      query.createdAt.$lte = new Date(endDate);
    }
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
};

// 静态方法 - 批量标记为已读
NotificationSchema.statics.markAsReadBatch = function(userId, notificationIds) {
  return this.updateMany(
    {
      _id: { $in: notificationIds },
      recipientId: userId,
      isRead: false
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
        status: NotificationStatus.READ
      }
    }
  );
};

// 静态方法 - 清理过期通知
NotificationSchema.statics.cleanupExpiredNotifications = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

// 静态方法 - 获取通知统计
NotificationSchema.statics.getNotificationStats = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        recipientId: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          type: '$type',
          priority: '$priority'
        },
        count: { $sum: 1 },
        unreadCount: {
          $sum: { $cond: ['$isRead', 0, 1] }
        }
      }
    },
    {
      $group: {
        _id: '$_id.type',
        totalCount: { $sum: '$count' },
        totalUnread: { $sum: '$unreadCount' },
        priorities: {
          $push: {
            priority: '$_id.priority',
            count: '$count',
            unreadCount: '$unreadCount'
          }
        }
      }
    }
  ]);
};

// 中间件 - 保存前更新时间
NotificationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 中间件 - 删除前清理
NotificationSchema.pre('remove', function(next) {
  // 可以在这里添加清理逻辑
  next();
});

module.exports = mongoose.model('Notification', NotificationSchema);
module.exports.NotificationTypes = NotificationTypes;
module.exports.NotificationStatus = NotificationStatus;
module.exports.NotificationChannels = NotificationChannels;