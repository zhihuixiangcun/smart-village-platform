/**
 * 离线队列模型
 * 用于存储在网络不可用时的待同步数据
 */

const mongoose = require('mongoose');

const offlineQueueSchema = new mongoose.Schema({
  // 用户ID
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 村庄ID
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    index: true
  },

  // 操作类型
  operationType: {
    type: String,
    enum: [
      'create', 'update', 'delete',
      'upload', 'submit', 'approve',
      'comment', 'feedback', 'report',
      'emergency', 'announcement', 'payment'
    ],
    required: true,
    index: true
  },

  // 目标资源类型
  resourceType: {
    type: String,
    enum: [
      'resident', 'family', 'document', 'announcement',
      'emergency', 'finance', 'reimbursement', 'subsidy',
      'village', 'event', 'post', 'comment', 'product',
      'payment', 'application', 'report'
    ],
    required: true
  },

  // 资源ID（如果存在）
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },

  // 请求方法
  method: {
    type: String,
    enum: ['POST', 'PUT', 'PATCH', 'DELETE'],
    required: true
  },

  // API端点路径
  endpoint: {
    type: String,
    required: true
  },

  // 请求数据
  requestData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // 文件信息（如果有上传）
  files: [{
    fieldName: String,
    originalName: String,
    mimeType: String,
    size: Number,
    localPath: String,      // 本地存储路径
    tempUrl: String,         // 临时URL（用于同步后上传）
    checksum: String         // 文件校验和
  }],

  // 优先级
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },

  // 队列状态
  status: {
    type: String,
    enum: ['pending', 'processing', 'synced', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },

  // 同步重试次数
  retryCount: {
    type: Number,
    default: 0,
    index: true
  },

  // 最大重试次数
  maxRetries: {
    type: Number,
    default: 5
  },

  // 错误信息
  error: {
    message: String,
    code: String,
    stack: String,
    timestamp: Date
  },

  // 同步结果
  syncResult: {
    success: Boolean,
    serverResponse: mongoose.Schema.Types.Mixed,
    syncedResourceId: mongoose.Schema.Types.ObjectId,
    syncedAt: Date
  },

  // 离线时的时间戳
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  // 首次尝试同步时间
  firstSyncAttemptAt: {
    type: Date
  },

  // 成功同步时间
  syncedAt: {
    type: Date,
    index: true
  },

  // 客户端元数据
  clientMeta: {
    deviceId: String,
    platform: String,
    appVersion: String,
    ipAddress: String,
    userAgent: String,
    location: {
      type: { type: String },
      coordinates: [Number]
    }
  },

  // 数据校验
  validation: {
    isValid: { type: Boolean, default: true },
    errors: [{ field: String, message: String }],
    validatedAt: Date
  },

  // 是否需要确认（对于重要操作）
  requiresConfirmation: {
    type: Boolean,
    default: false
  },

  // 确认状态
  confirmation: {
    confirmed: Boolean,
    confirmedAt: Date,
    confirmedBy: mongoose.Schema.Types.ObjectId,
    method: String // 'biometric', 'password', 'sms'
  },

  // 依赖的其他队列项（用于保证操作顺序）
  dependsOn: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OfflineQueue'
  }],

  // TTL - 自动清理已同步的记录
  ttl: {
    type: Date,
    default: function() {
      // 默认30天后自动清理
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date;
    }
  }
}, {
  timestamps: true
});

// 索引
offlineQueueSchema.index({ userId: 1, status: 1, createdAt: -1 });
offlineQueueSchema.index({ villageId: 1, status: 1, priority: 1 });
offlineQueueSchema.index({ status: 1, priority: 1, createdAt: 1 });
offlineQueueSchema.index({ operationType: 1, status: 1 });
offlineQueueSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30天TTL索引

// 虚拟字段
offlineQueueSchema.virtual('isPending').get(function() {
  return this.status === 'pending';
});

offlineQueueSchema.virtual('isFailed').get(function() {
  return this.status === 'failed';
});

offlineQueueSchema.virtual('canRetry').get(function() {
  return this.status === 'failed' && this.retryCount < this.maxRetries;
});

offlineQueueSchema.virtual('hasFiles').get(function() {
  return this.files && this.files.length > 0;
});

// 实例方法
offlineQueueSchema.methods.markAsProcessing = function() {
  this.status = 'processing';
  if (!this.firstSyncAttemptAt) {
    this.firstSyncAttemptAt = new Date();
  }
  return this.save();
};

offlineQueueSchema.methods.markAsSynced = function(result) {
  this.status = 'synced';
  this.syncedAt = new Date();
  if (result) {
    this.syncResult = result;
  }
  return this.save();
};

offlineQueueSchema.methods.markAsFailed = function(error) {
  this.status = 'failed';
  this.retryCount += 1;
  this.error = {
    message: error.message,
    code: error.code,
    stack: error.stack,
    timestamp: new Date()
  };
  return this.save();
};

offlineQueueSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

// 静态方法
offlineQueueSchema.statics.getUserPendingItems = function(userId, limit = 50) {
  return this.find({ userId, status: 'pending' })
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit)
    .populate('villageId', 'name')
    .populate('dependsOn');
};

offlineQueueSchema.statics.getRetryableItems = function(maxRetries = 5) {
  return this.find({
    status: 'failed',
    retryCount: { $lt: maxRetries }
  })
    .sort({ priority: -1, createdAt: 1 })
    .limit(100);
};

offlineQueueSchema.statics.getFailedItems = function(limit = 20) {
  return this.find({ status: 'failed' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username name')
    .populate('villageId', 'name');
};

offlineQueueSchema.statics.getQueueStats = function(userId = null, villageId = null) {
  const match = {};
  if (userId) match.userId = userId;
  if (villageId) match.villageId = villageId;

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        processing: { $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] } },
        synced: { $sum: { $cond: [{ $eq: ['$status', 'synced'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        total: { $sum: 1 },
        urgentCount: {
          $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] }
        },
        avgRetryCount: { $avg: '$retryCount' }
      }
    }
  ]);
};

offlineQueueSchema.statics.getByOperationType = function(operationType, status = 'pending') {
  return this.find({ operationType, status })
    .sort({ priority: -1, createdAt: 1 })
    .populate('userId', 'username name phone')
    .populate('villageId', 'name');
};

offlineQueueSchema.statics.getItemsWithFiles = function(status = 'pending') {
  return this.find({ status, files: { $exists: true, $ne: [] } })
    .sort({ priority: -1, createdAt: 1 });
};

// 清理已同步的旧记录
offlineQueueSchema.statics.cleanupOldSynced = function(daysOld = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    status: 'synced',
    syncedAt: { $lt: cutoffDate }
  });
};

// 中间件
offlineQueueSchema.pre('save', function(next) {
  // 自动设置紧急状态为高优先级
  if (this.operationType === 'emergency' && this.priority === 'normal') {
    this.priority = 'urgent';
  }
  next();
});

module.exports = mongoose.model('OfflineQueue', offlineQueueSchema);
