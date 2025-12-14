/**
 * 消息日志模型
 */

const mongoose = require('mongoose');

const messageLogSchema = new mongoose.Schema({
  // 消息类型
  type: {
    type: String,
    enum: ['sms', 'voice', 'email', 'push'],
    required: true,
    index: true
  },

  // 服务提供商
  provider: {
    type: String,
    enum: ['aliyun', 'tencent', 'huawei', 'jiguang', 'xiaomi', 'local'],
    required: true,
    index: true
  },

  // 接收者
  recipients: {
    type: [String],
    required: true,
    index: true
  },

  // 消息内容
  content: {
    text: String,
    html: String,
    subject: String,
    attachments: [{
      filename: String,
      path: String,
      size: Number
    }]
  },

  // 模板信息
  template: {
    code: String,
    id: String,
    params: mongoose.Schema.Types.Mixed
  },

  // 发送状态
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'partial'],
    required: true,
    index: true
  },

  // 发送结果
  result: {
    bizId: String,
    msgId: String,
    requestId: String,
    messageId: String,
    response: mongoose.Schema.Types.Mixed,
    sendCount: {
      type: Number,
      default: 0
    },
    successCount: {
      type: Number,
      default: 0
    },
    failedCount: {
      type: Number,
      default: 0
    }
  },

  // 错误信息
  error: {
    code: String,
    message: String,
    details: mongoose.Schema.Types.Mixed
  },

  // 发送者
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  // 发送时间
  sentAt: {
    type: Date,
    index: true
  },

  // 关联业务
  business: {
    type: String,
    enum: ['verification', 'notification', 'broadcast', 'greeting', 'reminder', 'other'],
    default: 'other'
  },

  // 业务ID
  businessId: {
    type: String,
    index: true
  },

  // 村庄ID（村务相关消息）
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    index: true
  },

  // 村民ID（个人消息）
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    index: true
  },

  // 优先级
  priority: {
    type: Number,
    min: 0,
    max: 5,
    default: 1
  },

  // 重试次数
  retryCount: {
    type: Number,
    default: 0
  },

  // 成本信息
  cost: {
    amount: Number,
    currency: {
      type: String,
      default: 'CNY'
    },
    unit: {
      type: String,
      default: 'message'
    }
  },

  // 扩展数据
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },

  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 索引
messageLogSchema.index({ type: 1, status: 1, createdAt: -1 });
messageLogSchema.index({ provider: 1, createdAt: -1 });
messageLogSchema.index({ business: 1, createdAt: -1 });
messageLogSchema.index({ villageId: 1, type: 1, createdAt: -1 });
messageLogSchema.index({ residentId: 1, type: 1, createdAt: -1 });
messageLogSchema.index({ sender: 1, createdAt: -1 });

// 虚拟字段
messageLogSchema.virtual('isSuccess').get(function() {
  return this.status === 'success';
});

messageLogSchema.virtual('isFailed').get(function() {
  return this.status === 'failed';
});

messageLogSchema.virtual('isPending').get(function() {
  return this.status === 'pending';
});

messageLogSchema.virtual('recipientCount').get(function() {
  return this.recipients ? this.recipients.length : 0;
});

// 实例方法
messageLogSchema.methods.markAsSuccess = function(result) {
  this.status = 'success';
  this.sentAt = new Date();
  if (result) {
    this.result = { ...this.result, ...result };
  }
  return this.save();
};

messageLogSchema.methods.markAsFailed = function(error) {
  this.status = 'failed';
  if (error) {
    this.error = {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || '发送失败',
      details: error.details
    };
  }
  return this.save();
};

messageLogSchema.methods.incrementRetry = function() {
  this.retryCount += 1;
  this.updatedAt = new Date();
  return this.save();
};

// 静态方法
messageLogSchema.statics.findByType = function(type, options = {}) {
  const {
    status,
    startDate,
    endDate,
    page = 1,
    limit = 20
  } = options;

  const query = { type };

  if (status) query.status = status;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('sender', 'name');
};

messageLogSchema.statics.findByProvider = function(provider, options = {}) {
  const {
    status,
    startDate,
    endDate,
    page = 1,
    limit = 20
  } = options;

  const query = { provider };

  if (status) query.status = status;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('sender', 'name');
};

messageLogSchema.statics.findByVillage = function(villageId, options = {}) {
  const {
    type,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 20
  } = options;

  const query = { villageId };

  if (type) query.type = type;
  if (status) query.status = status;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('sender', 'name');
};

messageLogSchema.statics.findByResident = function(residentId, options = {}) {
  const {
    type,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 20
  } = options;

  const query = { residentId };

  if (type) query.type = type;
  if (status) query.status = status;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('sender', 'name');
};

messageLogSchema.statics.getStats = function(filters = {}) {
  const {
    type,
    provider,
    villageId,
    residentId,
    startDate,
    endDate
  } = filters;

  const matchCondition = {};

  if (type) matchCondition.type = type;
  if (provider) matchCondition.provider = provider;
  if (villageId) matchCondition.villageId = villageId;
  if (residentId) matchCondition.residentId = residentId;

  if (startDate || endDate) {
    matchCondition.createdAt = {};
    if (startDate) matchCondition.createdAt.$gte = new Date(startDate);
    if (endDate) matchCondition.createdAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    {
      $match: matchCondition
    },
    {
      $group: {
        _id: {
          type: '$type',
          provider: '$provider',
          status: '$status'
        },
        count: { $sum: 1 },
        totalCost: { $sum: '$cost.amount' },
        totalRecipients: { $sum: { $size: '$recipients' } },
        avgCost: { $avg: '$cost.amount' }
      }
    },
    {
      $group: {
        _id: {
          type: '$_id.type',
          provider: '$_id.provider'
        },
        stats: {
          $push: {
            status: '$_id.status',
            count: '$count'
          }
        },
        totalCount: { $sum: '$count' },
        totalCost: { $sum: '$totalCost' },
        totalRecipients: { $sum: '$totalRecipients' }
      }
    },
    {
      $sort: { totalCount: -1 }
    }
  ]);
};

messageLogSchema.statics.getDailyStats = function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          type: '$type'
        },
        count: { $sum: 1 },
        successCount: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
        },
        failedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        totalCost: { $sum: '$cost.amount' }
      }
    },
    {
      $group: {
        _id: {
          year: '$_id.year',
          month: '$_id.month',
          day: '$_id.day'
        },
        types: {
          $push: {
            type: '$_id.type',
            count: '$count',
            successCount: '$successCount',
            failedCount: '$failedCount'
          }
        },
        totalCount: { $sum: '$count' },
        totalSuccess: { $sum: '$successCount' },
        totalFailed: { $sum: '$failedCount' },
        totalCost: { $sum: '$totalCost' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);
};

messageLogSchema.statics.getTopSenders = function(days = 7, limit = 10) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        sender: { $exists: true }
      }
    },
    {
      $group: {
        _id: '$sender',
        totalSent: { $sum: 1 },
        successfulSent: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
        },
        totalCost: { $sum: '$cost.amount' }
      }
    },
    {
      $sort: { totalSent: -1 }
    },
    {
      $limit: limit
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $project: {
        userId: '$_id',
        totalSent: 1,
        successfulSent: 1,
        totalCost: 1,
        user: { $arrayElemAt: ['$user', 0] }
      }
    }
  ]);
};

messageLogSchema.statics.getFailedMessages = function(hours = 24) {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - hours);

  return this.find({
    status: 'failed',
    createdAt: { $gte: startDate }
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('sender', 'name');
};

messageLogSchema.statics.cleanupOldLogs = function(days = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    status: { $in: ['success', 'failed'] }
  });
};

// 导出模型
module.exports = mongoose.model('MessageLog', messageLogSchema);