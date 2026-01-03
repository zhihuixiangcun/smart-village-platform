/**
 * 离线操作模型
 * 记录客户端离线状态下产生的操作，用于后续同步
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const pendingOperationSchema = new mongoose.Schema({
  // 操作唯一标识 (用于幂等性保证)
  operationId: {
    type: String,
    required: true,
    unique: true,
    default: () => crypto.randomUUID()
  },

  // 关联用户
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 关联村庄
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 设备标识 (用于区分不同客户端设备)
  deviceId: {
    type: String,
    required: true,
    index: true
  },

  // 操作类型
  operationType: {
    type: String,
    enum: ['create', 'update', 'delete', 'batch_create', 'batch_update'],
    required: true
  },

  // 目标数据模型
  targetModel: {
    type: String,
    required: true,
    enum: [
      'Resident',
      'Household',
      'Family',
      'Announcement',
      'Task',
      'Finance',
      'Emergency',
      'Document',
      'Feedback',
      'Voting',
      'CommitteeMember',
      'DutySchedule'
    ]
  },

  // 目标记录ID (更新/删除操作必需)
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },

  // 操作数据 (JSON序列化的完整数据)
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  // 客户端数据版本
  clientVersion: {
    type: Number,
    required: true,
    default: 1
  },

  // 服务器数据版本 (同步时由服务器填充)
  serverVersion: {
    type: Number,
    default: null
  },

  // 同步状态
  syncStatus: {
    type: String,
    enum: ['pending', 'processing', 'synced', 'conflict', 'failed', 'cancelled'],
    required: true,
    default: 'pending',
    index: true
  },

  // 同步优先级 (0-9, 9最高，紧急操作优先级高)
  priority: {
    type: Number,
    min: 0,
    max: 9,
    default: 5,
    index: true
  },

  // 冲突信息
  conflictInfo: {
    hasConflict: {
      type: Boolean,
      default: false
    },
    conflictType: {
      type: String,
      enum: ['version_mismatch', 'data_modified', 'record_deleted', 'dependency_error', 'unknown']
    },
    serverData: mongoose.Schema.Types.Mixed,
    clientData: mongoose.Schema.Types.Mixed,
    resolution: {
      type: String,
      enum: ['client_wins', 'server_wins', 'merge', 'pending'],
      default: 'pending'
    }
  },

  // 同步统计
  syncStats: {
    attemptCount: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 5
    },
    lastAttemptAt: Date,
    completedAt: Date,
    errorCount: {
      type: Number,
      default: 0
    }
  },

  // 错误记录
  errors: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    code: String,
    message: String,
    retryable: {
      type: Boolean,
      default: true
    },
    context: mongoose.Schema.Types.Mixed
  }],

  // 客户端元数据
  clientMetadata: {
    platform: {
      type: String,
      enum: ['web', 'mobile', 'desktop']
    },
    appVersion: String,
    userAgent: String,
    ipAddress: String,
    // 离线时长(秒)
    offlineDuration: Number,
    // 数据大小(字节)
    dataSize: Number,
    // 地理位置
    location: {
      type: { type: String },
      coordinates: [Number]
    }
  },

  // 附件信息 (文件上传等操作)
  attachments: [{
    fileId: String,
    fileName: String,
    fileType: String,
    fileSize: Number,
    uploadStatus: {
      type: String,
      enum: ['pending', 'uploaded', 'failed'],
      default: 'pending'
    },
    serverFileId: String
  }],

  // 依赖操作 (批量操作的依赖关系)
  dependencies: [{
    operationId: String,
    targetModel: String,
    targetId: mongoose.Schema.Types.ObjectId
  }],

  // 创建时间 (客户端时间)
  clientCreatedAt: {
    type: Date,
    required: true
  },

  // 更新时间 (客户端时间)
  clientUpdatedAt: {
    type: Date,
    required: true
  },

  // 服务器时间
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
  timestamps: true,
  collection: 'pending_operations'
});

// 复合索引优化查询性能
pendingOperationSchema.index({ userId: 1, syncStatus: 1, priority: -1, createdAt: 1 });
pendingOperationSchema.index({ villageId: 1, syncStatus: 1, createdAt: 1 });
pendingOperationSchema.index({ deviceId: 1, syncStatus: 1, createdAt: 1 });
pendingOperationSchema.index({ targetModel: 1, targetId: 1, syncStatus: 1 });
// operationId 已有 unique: true，无需重复索引
pendingOperationSchema.index({ syncStatus: 1, 'syncStats.attemptCount': 1 });

// 地理位置索引
pendingOperationSchema.index({ 'clientMetadata.location': '2dsphere' });

// 虚拟字段
pendingOperationSchema.virtual('isPending').get(function() {
  return this.syncStatus === 'pending';
});

pendingOperationSchema.virtual('isFailed').get(function() {
  return this.syncStatus === 'failed';
});

pendingOperationSchema.virtual('hasConflict').get(function() {
  return this.syncStatus === 'conflict' || this.conflictInfo?.hasConflict;
});

pendingOperationSchema.virtual('canRetry').get(function() {
  if (this.syncStatus === 'synced' || this.syncStatus === 'cancelled') {
    return false;
  }
  if (this.syncStats.attemptCount >= this.syncStats.maxAttempts) {
    return false;
  }
  const lastError = this.errors[this.errors.length - 1];
  return !lastError || lastError.retryable;
});

pendingOperationSchema.virtual('isExpired').get(function() {
  // 离线操作超过30天视为过期
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - this.clientCreatedAt.getTime() > thirtyDaysInMs;
});

// 实例方法
/**
 * 标记为处理中
 */
pendingOperationSchema.methods.markProcessing = function() {
  this.syncStatus = 'processing';
  this.syncStats.attemptCount += 1;
  this.syncStats.lastAttemptAt = new Date();
  return this.save();
};

/**
 * 标记为同步成功
 */
pendingOperationSchema.methods.markSynced = function(serverVersion, serverData = null) {
  this.syncStatus = 'synced';
  this.syncStats.completedAt = new Date();
  if (serverVersion) {
    this.serverVersion = serverVersion;
  }
  if (serverData) {
    this.payload = serverData;
  }
  return this.save();
};

/**
 * 标记为失败
 */
pendingOperationSchema.methods.markFailed = function(error) {
  this.syncStatus = 'failed';
  this.syncStats.errorCount += 1;
  this.errors.push({
    timestamp: new Date(),
    code: error.code || 'SYNC_ERROR',
    message: error.message,
    retryable: error.retryable !== false,
    context: error.context
  });
  return this.save();
};

/**
 * 标记为冲突
 */
pendingOperationSchema.methods.markConflict = function(conflictData) {
  this.syncStatus = 'conflict';
  this.conflictInfo = {
    hasConflict: true,
    conflictType: conflictData.type || 'unknown',
    serverData: conflictData.serverData,
    clientData: this.payload,
    resolution: 'pending'
  };
  return this.save();
};

/**
 * 解决冲突
 */
pendingOperationSchema.methods.resolveConflict = function(resolution, mergedData = null) {
  if (this.syncStatus !== 'conflict') {
    throw new Error('Operation is not in conflict state');
  }

  this.conflictInfo.resolution = resolution;
  if (resolution !== 'pending') {
    this.syncStatus = 'pending';
    if (mergedData) {
      this.payload = mergedData;
    }
  }
  return this.save();
};

/**
 * 取消操作
 */
pendingOperationSchema.methods.cancel = function(reason) {
  this.syncStatus = 'cancelled';
  this.errors.push({
    timestamp: new Date(),
    code: 'CANCELLED',
    message: reason || 'Operation cancelled by user',
    retryable: false
  });
  return this.save();
};

/**
 * 添加错误日志
 */
pendingOperationSchema.methods.addError = function(error) {
  this.errors.push({
    timestamp: new Date(),
    code: error.code || 'ERROR',
    message: error.message,
    retryable: error.retryable !== false,
    context: error.context
  });
  return this.save();
};

/**
 * 获取最新错误
 */
pendingOperationSchema.methods.getLastError = function() {
  return this.errors.length > 0 ? this.errors[this.errors.length - 1] : null;
};

/**
 * 检查附件是否全部上传完成
 */
pendingOperationSchema.methods.checkAttachmentsUploaded = function() {
  if (!this.attachments || this.attachments.length === 0) {
    return true;
  }
  return this.attachments.every(att => att.uploadStatus === 'uploaded');
};

/**
 * 添加附件信息
 */
pendingOperationSchema.methods.addAttachment = function(attachmentInfo) {
  this.attachments = this.attachments || [];
  this.attachments.push({
    ...attachmentInfo,
    uploadStatus: 'pending'
  });
  return this.save();
};

/**
 * 更新附件上传状态
 */
pendingOperationSchema.methods.updateAttachmentStatus = function(fileId, serverFileId, status) {
  if (!this.attachments) return Promise.resolve(this);

  const attachment = this.attachments.find(att => att.fileId === fileId);
  if (attachment) {
    attachment.uploadStatus = status;
    attachment.serverFileId = serverFileId;
  }
  return this.save();
};

// 静态方法
/**
 * 获取用户的待同步操作
 */
pendingOperationSchema.statics.getPendingOperations = function(userId, deviceId) {
  const query = {
    userId,
    syncStatus: 'pending'
  };
  if (deviceId) {
    query.deviceId = deviceId;
  }
  return this.find(query)
    .sort({ priority: -1, clientCreatedAt: 1 })
    .limit(100);
};

/**
 * 获取批次的待同步操作
 */
pendingOperationSchema.statics.getBatchOperations = function(options = {}) {
  const {
    userId,
    villageId,
    deviceId,
    limit = 50,
    skip = 0,
    targetModel
  } = options;

  const query = { syncStatus: 'pending' };
  if (userId) query.userId = userId;
  if (villageId) query.villageId = villageId;
  if (deviceId) query.deviceId = deviceId;
  if (targetModel) query.targetModel = targetModel;

  return this.find(query)
    .sort({ priority: -1, clientCreatedAt: 1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

/**
 * 获取冲突操作
 */
pendingOperationSchema.statics.getConflictOperations = function(villageId) {
  return this.find({
    villageId,
    $or: [
      { syncStatus: 'conflict' },
      { 'conflictInfo.hasConflict': true }
    ]
  })
  .sort({ createdAt: -1 })
  .populate('userId', 'username name');
};

/**
 * 获取失败但可重试的操作
 */
pendingOperationSchema.statics.getRetryableOperations = function() {
  return this.find({
    syncStatus: 'failed',
    'syncStats.attemptCount': { $lt: 5 }
  })
  .sort({ priority: -1, createdAt: 1 })
  .lean();
};

/**
 * 获取统计信息
 */
pendingOperationSchema.statics.getStats = function(villageId, userId = null) {
  const matchQuery = villageId ? { villageId: mongoose.Types.ObjectId(villageId) } : {};
  if (userId) {
    matchQuery.userId = mongoose.Types.ObjectId(userId);
  }

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$syncStatus',
        count: { $sum: 1 },
        avgAttempts: { $avg: '$syncStats.attemptCount' },
        totalDataSize: { $sum: '$clientMetadata.dataSize' }
      }
    }
  ]);
};

/**
 * 批量创建操作
 */
pendingOperationSchema.statics.createBatch = function(operations) {
  return this.insertMany(operations, { ordered: false });
};

/**
 * 清理已同步的旧记录
 */
pendingOperationSchema.statics.cleanupOldSynced = function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    syncStatus: 'synced',
    updatedAt: { $lt: cutoffDate }
  });
};

/**
 * 清理过期的待同步操作
 */
pendingOperationSchema.statics.cleanupExpiredPending = function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return this.updateMany(
    {
      syncStatus: 'pending',
      clientCreatedAt: { $lt: thirtyDaysAgo }
    },
    {
      $set: {
        syncStatus: 'cancelled'
      }
    }
  );
};

/**
 * 重置失败操作为待同步
 */
pendingOperationSchema.statics.resetFailedOperations = function(userId) {
  const query = {
    syncStatus: 'failed',
    'syncStats.attemptCount': { $lt: 5 }
  };
  if (userId) {
    query.userId = userId;
  }

  return this.updateMany(
    query,
    {
      $set: { syncStatus: 'pending' },
      $push: {
        errors: {
          timestamp: new Date(),
          code: 'MANUAL_RETRY',
          message: 'Operation manually reset for retry',
          retryable: true
        }
      }
    }
  );
};

/**
 * 获取设备的同步队列长度
 */
pendingOperationSchema.statics.getQueueLength = function(deviceId) {
  return this.countDocuments({
    deviceId,
    syncStatus: 'pending'
  });
};

/**
 * 检查操作是否存在 (幂等性检查)
 */
pendingOperationSchema.statics.operationExists = function(operationId) {
  return this.findOne({ operationId }).lean();
};

// 中间件
pendingOperationSchema.pre('save', function(next) {
  // 计算数据大小
  if (this.payload && !this.clientMetadata?.dataSize) {
    const dataStr = JSON.stringify(this.payload);
    this.clientMetadata = this.clientMetadata || {};
    this.clientMetadata.dataSize = Buffer.byteLength(dataStr, 'utf8');
  }

  // 验证目标操作必须有targetId
  if ((this.operationType === 'update' || this.operationType === 'delete') && !this.targetId) {
    return next(new Error('Update and delete operations require targetId'));
  }

  next();
});

// TTL索引：已同步记录30天后自动删除
pendingOperationSchema.index(
  { updatedAt: 1 },
  { expireAfterSeconds: 2592000, partialFilterExpression: { syncStatus: 'synced' } }
);

// 取消记录90天后自动删除
pendingOperationSchema.index(
  { updatedAt: 1 },
  { expireAfterSeconds: 7776000, partialFilterExpression: { syncStatus: 'cancelled' } }
);

module.exports = mongoose.model('PendingOperation', pendingOperationSchema);
