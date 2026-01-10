/**
 * 离线同步操作模型
 * 记录所有待同步或已同步的操作
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const syncOperationSchema = new mongoose.Schema({
  // 操作唯一标识 (用于幂等性)
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

  // 设备标识 (用于区分不同设备)
  deviceId: {
    type: String,
    required: true,
    index: true
  },

  // 操作类型
  operationType: {
    type: String,
    enum: ['create', 'update', 'delete', 'batch'],
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
      'Voting'
    ]
  },

  // 目标记录ID (如果是更新或删除)
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },

  // 操作数据 (JSON序列化的数据)
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  // 数据版本 (用于冲突检测)
  clientVersion: {
    type: Number,
    required: true,
    default: 1
  },

  serverVersion: {
    type: Number,
    default: null
  },

  // 同步状态
  syncStatus: {
    type: String,
    enum: ['pending', 'syncing', 'synced', 'conflict', 'failed', 'cancelled'],
    required: true,
    default: 'pending',
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
      enum: ['version_mismatch', 'data_modified', 'deleted', 'unknown']
    },
    serverData: mongoose.Schema.Types.Mixed,
    resolution: {
      type: String,
      enum: ['client_wins', 'server_wins', 'merge', 'pending']
    }
  },

  // 同步统计
  syncStats: {
    attemptCount: {
      type: Number,
      default: 0
    },
    lastAttemptAt: Date,
    completedAt: Date,
    errorCount: {
      type: Number,
      default: 0
    }
  },

  // 错误信息
  errorLog: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    code: String,
    message: String,
    stack: String,
    retryable: {
      type: Boolean,
      default: true
    }
  }],

  // 优先级 (0-9, 9最高)
  priority: {
    type: Number,
    min: 0,
    max: 9,
    default: 5,
    index: true
  },

  // 元数据
  metadata: {
    ipAddress: String,
    userAgent: String,
    platform: String,
    offlineDuration: Number, // 离线时长(秒)
    dataSize: Number // 数据大小(字节)
  },

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
  collection: 'sync_operations'
});

// 复合索引
syncOperationSchema.index({ userId: 1, syncStatus: 1, createdAt: -1 });
syncOperationSchema.index({ villageId: 1, syncStatus: 1, priority: -1 });
syncOperationSchema.index({ deviceId: 1, syncStatus: 1 });
syncOperationSchema.index({ targetModel: 1, targetId: 1, syncStatus: 1 });
syncOperationSchema.index({ operationId: 1, syncStatus: 1 });

// 虚拟字段
syncOperationSchema.virtual('isPending').get(function() {
  return this.syncStatus === 'pending';
});

syncOperationSchema.virtual('isFailed').get(function() {
  return this.syncStatus === 'failed';
});

syncOperationSchema.virtual('hasConflict').get(function() {
  return this.syncStatus === 'conflict' || this.conflictInfo?.hasConflict;
});

syncOperationSchema.virtual('canRetry').get(function() {
  if (this.syncStatus === 'synced' || this.syncStatus === 'cancelled') {
    return false;
  }
  if (this.syncStats.attemptCount >= 5) {
    return false;
  }
  const lastError = this.errorLog[this.errorLog.length - 1];
  return !lastError || lastError.retryable;
});

// 实例方法
/**
 * 标记为同步中
 */
syncOperationSchema.methods.markSyncing = function() {
  this.syncStatus = 'syncing';
  this.syncStats.attemptCount += 1;
  this.syncStats.lastAttemptAt = new Date();
  return this.save();
};

/**
 * 标记为同步成功
 */
syncOperationSchema.methods.markSynced = function(serverVersion) {
  this.syncStatus = 'synced';
  this.syncStats.completedAt = new Date();
  if (serverVersion) {
    this.serverVersion = serverVersion;
  }
  return this.save();
};

/**
 * 标记为失败
 */
syncOperationSchema.methods.markFailed = function(error) {
  this.syncStatus = 'failed';
  this.syncStats.errorCount += 1;
  this.errorLog.push({
    timestamp: new Date(),
    code: error.code || 'SYNC_ERROR',
    message: error.message,
    stack: error.stack,
    retryable: error.retryable !== false
  });
  return this.save();
};

/**
 * 标记为冲突
 */
syncOperationSchema.methods.markConflict = function(conflictData) {
  this.syncStatus = 'conflict';
  this.conflictInfo = {
    hasConflict: true,
    conflictType: conflictData.type || 'unknown',
    serverData: conflictData.serverData,
    resolution: 'pending'
  };
  return this.save();
};

/**
 * 解决冲突
 */
syncOperationSchema.methods.resolveConflict = function(resolution) {
  if (this.syncStatus !== 'conflict') {
    throw new Error('Operation is not in conflict state');
  }

  this.conflictInfo.resolution = resolution;
  if (resolution !== 'pending') {
    this.syncStatus = 'pending';
  }
  return this.save();
};

/**
 * 取消操作
 */
syncOperationSchema.methods.cancel = function() {
  this.syncStatus = 'cancelled';
  return this.save();
};

/**
 * 添加错误日志
 */
syncOperationSchema.methods.addError = function(error) {
  this.errorLog.push({
    timestamp: new Date(),
    code: error.code || 'ERROR',
    message: error.message,
    stack: error.stack,
    retryable: error.retryable !== false
  });
  return this.save();
};

/**
 * 获取最新错误
 */
syncOperationSchema.methods.getLastError = function() {
  return this.errorLog[this.errorLog.length - 1];
};

// 静态方法
/**
 * 获取用户的待同步操作
 */
syncOperationSchema.statics.getPendingOperations = function(userId, deviceId) {
  const query = { userId, syncStatus: 'pending' };
  if (deviceId) {
    query.deviceId = deviceId;
  }
  return this.find(query)
    .sort({ priority: -1, createdAt: 1 })
    .limit(100);
};

/**
 * 获取村庄的所有同步操作
 */
syncOperationSchema.statics.getVillageOperations = function(villageId, options = {}) {
  const {
    status,
    limit = 50,
    skip = 0,
    startDate,
    endDate
  } = options;

  const query = { villageId };
  if (status) {
    query.syncStatus = status;
  }
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'username name')
    .lean();
};

/**
 * 获取冲突操作
 */
syncOperationSchema.statics.getConflictOperations = function(villageId) {
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
 * 获取统计信息
 */
syncOperationSchema.statics.getStats = function(villageId) {
  return this.aggregate([
    {
      $match: { villageId: mongoose.Types.ObjectId(villageId) }
    },
    {
      $group: {
        _id: '$syncStatus',
        count: { $sum: 1 },
        avgAttempts: { $avg: '$syncStats.attemptCount' }
      }
    }
  ]);
};

/**
 * 批量创建同步操作
 */
syncOperationSchema.statics.createBatch = function(operations) {
  return this.insertMany(operations, { ordered: false });
};

/**
 * 清理已同步的旧记录
 */
syncOperationSchema.statics.cleanupOldSynced = function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    syncStatus: 'synced',
    updatedAt: { $lt: cutoffDate }
  });
};

/**
 * 重置失败操作为待同步
 */
syncOperationSchema.statics.resetFailedOperations = function(userId) {
  return this.updateMany(
    {
      userId,
      syncStatus: 'failed',
      'syncStats.attemptCount': { $lt: 5 }
    },
    {
      $set: { syncStatus: 'pending' },
      $push: {
        errorLog: {
          timestamp: new Date(),
          code: 'MANUAL_RETRY',
          message: 'Operation manually reset for retry',
          retryable: true
        }
      }
    }
  );
};

// 中间件
syncOperationSchema.pre('save', function(next) {
  // 计算数据大小
  if (this.payload) {
    const dataStr = JSON.stringify(this.payload);
    this.metadata = this.metadata || {};
    this.metadata.dataSize = Buffer.byteLength(dataStr, 'utf8');
  }
  next();
});

syncOperationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 2592000, partialFilterExpression: { syncStatus: 'synced' } }
);

module.exports = mongoose.model('SyncOperation', syncOperationSchema);
