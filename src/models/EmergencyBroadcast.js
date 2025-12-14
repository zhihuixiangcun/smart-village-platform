/**
 * 应急广播模型
 */

const mongoose = require('mongoose');

const emergencyBroadcastSchema = new mongoose.Schema({
  // 村庄ID
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 广播内容
  message: {
    type: String,
    required: true
  },

  // 广播类型
  type: {
    type: String,
    enum: ['natural_disaster', 'public_safety', 'health_emergency', 'infrastructure', 'weather_warning', 'other'],
    default: 'other'
  },

  // 紧急程度
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },

  // 发送渠道
  channels: [{
    type: String,
    enum: ['sms', 'voice', 'push', 'email', 'wechat', 'broadcast']
  }],

  // 发送结果
  results: {
    sms: {
      success: { type: Boolean, default: false },
      recipientCount: { type: Number, default: 0 },
      successCount: { type: Number, default: 0 },
      failedCount: { type: Number, default: 0 },
      error: String,
      bizId: String
    },
    voice: {
      success: { type: Boolean, default: false },
      recipientCount: { type: Number, default: 0 },
      successCount: { type: Number, default: 0 },
      failedCount: { type: Number, default: 0 },
      error: String,
      callId: String
    },
    push: {
      success: { type: Boolean, default: false },
      recipientCount: { type: Number, default: 0 },
      successCount: { type: Number, default: 0 },
      failedCount: { type: Number, default: 0 },
      error: String,
      msgId: String
    },
    email: {
      success: { type: Boolean, default: false },
      recipientCount: { type: Number, default: 0 },
      successCount: { type: Number, default: 0 },
      failedCount: { type: Number, default: 0 },
      error: String,
      messageId: String
    },
    wechat: {
      success: { type: Boolean, default: false },
      recipientCount: { type: Number, default: 0 },
      successCount: { type: Number, default: 0 },
      failedCount: { type: Number, default: 0 },
      error: String
    },
    broadcast: {
      success: { type: Boolean, default: false },
      duration: Number, // 播放时长（秒）
      volume: Number, // 播放音量
      error: String
    }
  },

  // 发送者
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // 发送时间
  sentAt: {
    type: Date,
    default: Date.now
  },

  // 预计结束时间
  expireAt: {
    type: Date
  },

  // 状态
  status: {
    type: String,
    enum: ['draft', 'sending', 'sent', 'expired', 'cancelled'],
    default: 'draft',
    index: true
  },

  // 目标人群
  targetGroups: [{
    type: String,
    enum: ['all', 'elderly', 'children', 'disabled', 'poverty', 'party_members', 'committee_members']
  }],

  // 地理范围
  geoScope: {
    type: String,
    enum: ['entire_village', 'specific_areas', 'households'],
    default: 'entire_village'
  },

  // 指定区域（如果地理范围不是全村）
  areas: [{
    name: String,
    coordinates: [Number], // [longitude, latitude]
    radius: Number // 米
  }],

  // 指定户（如果地理范围是指定户）
  households: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Household'
  }],

  // 联系方式
  contactInfo: {
    emergencyContacts: [{
      name: String,
      role: String,
      phone: String
    }],
    evacuationRoutes: [String],
    shelterLocations: [String]
  },

  // 附件
  attachments: [{
    type: String,
    url: String,
    filename: String,
    size: Number,
    description: String
  }],

  // 反馈信息
  feedback: [{
    residentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resident'
    },
    phone: String,
    status: {
      type: String,
      enum: ['received', 'acknowledged', 'need_help', 'safe']
    },
    message: String,
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number]
    },
    timestamp: { type: Date, default: Date.now }
  }],

  // 统计信息
  statistics: {
    totalRecipients: { type: Number, default: 0 },
    successfulDeliveries: { type: Number, default: 0 },
    failedDeliveries: { type: Number, default: 0 },
    acknowledgments: { type: Number, default: 0 },
    helpRequests: { type: Number, default: 0 }
  },

  // 成本信息
  cost: {
    sms: Number,
    voice: Number,
    push: Number,
    email: Number,
    total: Number
  },

  // 审核信息
  approval: {
    approved: { type: Boolean, default: false },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    comments: String
  },

  // 重复发送设置
  repeat: {
    enabled: { type: Boolean, default: false },
    interval: Number, // 分钟
    maxCount: { type: Number, default: 3 },
    currentCount: { type: Number, default: 0 },
    nextSendAt: Date
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
emergencyBroadcastSchema.index({ villageId: 1, status: 1, createdAt: -1 });
emergencyBroadcastSchema.index({ type: 1, urgency: 1, createdAt: -1 });
emergencyBroadcastSchema.index({ sender: 1, createdAt: -1 });
emergencyBroadcastSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 }); // TTL索引，过期自动删除

// 虚拟字段
emergencyBroadcastSchema.virtual('isExpired').get(function() {
  return this.expireAt && new Date() > this.expireAt;
});

emergencyBroadcastSchema.virtual('totalRecipients').get(function() {
  return Object.values(this.results).reduce((sum, channel) => sum + channel.recipientCount, 0);
});

emergencyBroadcastSchema.virtual('totalSuccessCount').get(function() {
  return Object.values(this.results).reduce((sum, channel) => sum + channel.successCount, 0);
});

emergencyBroadcastSchema.virtual('totalFailedCount').get(function() {
  return Object.values(this.results).reduce((sum, channel) => sum + channel.failedCount, 0);
});

emergencyBroadcastSchema.virtual('deliveryRate').get(function() {
  const total = this.totalRecipients;
  return total > 0 ? (this.totalSuccessCount / total * 100).toFixed(2) : 0;
});

// 实例方法
emergencyBroadcastSchema.methods.markAsSent = function() {
  this.status = 'sent';
  this.sentAt = new Date();
  this.updateStatistics();
  return this.save();
};

emergencyBroadcastSchema.methods.cancel = function() {
  this.status = 'cancelled';
  this.updatedAt = new Date();
  return this.save();
};

emergencyBroadcastSchema.methods.addFeedback = function(residentId, phone, status, message, location) {
  this.feedback.push({
    residentId,
    phone,
    status,
    message,
    location,
    timestamp: new Date()
  });

  this.updateStatistics();
  return this.save();
};

emergencyBroadcastSchema.methods.updateStatistics = function() {
  this.statistics = {
    totalRecipients: this.totalRecipients,
    successfulDeliveries: this.totalSuccessCount,
    failedDeliveries: this.totalFailedCount,
    acknowledgments: this.feedback.filter(f => f.status === 'acknowledged').length,
    helpRequests: this.feedback.filter(f => f.status === 'need_help').length
  };
};

emergencyBroadcastSchema.methods.canRepeat = function() {
  return this.repeat.enabled &&
         this.repeat.currentCount < this.repeat.maxCount &&
         (!this.repeat.nextSendAt || new Date() >= this.repeat.nextSendAt);
};

emergencyBroadcastSchema.methods.incrementRepeatCount = function() {
  this.repeat.currentCount += 1;
  if (this.canRepeat()) {
    this.repeat.nextSendAt = new Date(Date.now() + this.repeat.interval * 60 * 1000);
  }
  return this.save();
};

// 静态方法
emergencyBroadcastSchema.statics.findByVillage = function(villageId, options = {}) {
  const {
    status,
    type,
    urgency,
    startDate,
    endDate,
    page = 1,
    limit = 20
  } = options;

  const query = { villageId };

  if (status) query.status = status;
  if (type) query.type = type;
  if (urgency) query.urgency = urgency;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('sender', 'name')
    .populate('villageId', 'name');
};

emergencyBroadcastSchema.statics.findActiveByVillage = function(villageId) {
  return this.find({
    villageId,
    status: 'sent',
    $or: [
      { expireAt: { $gt: new Date() } },
      { expireAt: { $exists: false } }
    ]
  })
    .sort({ urgency: -1, createdAt: -1 })
    .populate('sender', 'name');
};

emergencyBroadcastSchema.statics.findByUrgency = function(urgency, villageId = null) {
  const query = { urgency };

  if (villageId) {
    query.villageId = villageId;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .populate('villageId', 'name')
    .populate('sender', 'name');
};

emergencyBroadcastSchema.statics.getStats = function(villageId = null, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const matchCondition = {
    createdAt: { $gte: startDate }
  };

  if (villageId) {
    matchCondition.villageId = villageId;
  }

  return this.aggregate([
    {
      $match: matchCondition
    },
    {
      $group: {
        _id: {
          type: '$type',
          urgency: '$urgency',
          status: '$status'
        },
        count: { $sum: 1 },
        totalRecipients: { $sum: '$statistics.totalRecipients' },
        successfulDeliveries: { $sum: '$statistics.successfulDeliveries' },
        acknowledgments: { $sum: '$statistics.acknowledgments' }
      }
    },
    {
      $group: {
        _id: {
          type: '$_id.type',
          urgency: '$_id.urgency'
        },
        stats: {
          $push: {
            status: '$_id.status',
            count: '$count'
          }
        },
        totalCount: { $sum: '$count' },
        totalRecipients: { $sum: '$totalRecipients' },
        successfulDeliveries: { $sum: '$successfulDeliveries' },
        acknowledgments: { $sum: '$acknowledgments' }
      }
    },
    {
      $sort: { totalCount: -1 }
    }
  ]);
};

emergencyBroadcastSchema.statics.getRecentFeedback = function(villageId = null, hours = 24) {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - hours);

  const matchCondition = {
    'feedback.timestamp': { $gte: startDate }
  };

  if (villageId) {
    matchCondition.villageId = villageId;
  }

  return this.aggregate([
    {
      $match: matchCondition
    },
    { $unwind: '$feedback' },
    {
      $match: {
        'feedback.timestamp': { $gte: startDate }
      }
    },
    {
      $project: {
        broadcastId: '$_id',
        villageId: 1,
        message: 1,
        type: 1,
        urgency: 1,
        feedback: 1,
        createdAt: 1
      }
    },
    {
      $sort: { 'feedback.timestamp': -1 }
    },
    {
      $lookup: {
        from: 'residents',
        localField: 'feedback.residentId',
        foreignField: '_id',
        as: 'resident'
      }
    },
    {
      $lookup: {
        from: 'villages',
        localField: 'villageId',
        foreignField: '_id',
        as: 'village'
      }
    }
  ]);
};

emergencyBroadcastSchema.statics.findRepeatableBroadcasts = function() {
  return this.find({
    'repeat.enabled': true,
    status: 'sent',
    $or: [
      { 'repeat.nextSendAt': { $lte: new Date() } },
      {
        'repeat.nextSendAt': { $exists: false },
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    ]
  })
    .sort({ 'repeat.nextSendAt': 1 })
    .populate('villageId', 'name')
    .populate('sender', 'name');
};

emergencyBroadcastSchema.statics.getTopBroadcasters = function(days = 30, limit = 10) {
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
        _id: '$sender',
        totalBroadcasts: { $sum: 1 },
        totalRecipients: { $sum: '$statistics.totalRecipients' },
        successfulDeliveries: { $sum: '$statistics.successfulDeliveries' }
      }
    },
    {
      $sort: { totalBroadcasts: -1 }
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
        totalBroadcasts: 1,
        totalRecipients: 1,
        successfulDeliveries: 1,
        user: { $arrayElemAt: ['$user', 0] }
      }
    }
  ]);
};

// 导出模型
module.exports = mongoose.model('EmergencyBroadcast', emergencyBroadcastSchema);