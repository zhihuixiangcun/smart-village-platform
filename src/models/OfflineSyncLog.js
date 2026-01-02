/**
 * 离线同步日志模型
 * 记录离线数据同步操作的详细日志
 */

const mongoose = require('mongoose');

const offlineSyncLogSchema = new mongoose.Schema({
  // 同步会话ID（一次同步操作的唯一标识）
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

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

  // 同步类型
  syncType: {
    type: String,
    enum: ['manual', 'auto', 'scheduled', 'background'],
    default: 'manual',
    index: true
  },

  // 同步触发原因
  triggerReason: {
    type: String,
    enum: [
      'user_request',
      'network_restored',
      'scheduled_sync',
      'app_background',
      'app_foreground',
      'push_notification',
      'server_initiated'
    ],
    default: 'user_request'
  },

  // 同步状态
  status: {
    type: String,
    enum: ['started', 'in_progress', 'completed', 'failed', 'cancelled', 'partial'],
    required: true,
    index: true
  },

  // 网络信息
  networkInfo: {
    isConnected: Boolean,
    networkType: {
      type: String,
      enum: ['wifi', 'cellular', 'ethernet', 'unknown', 'offline']
    },
    effectiveType: String, // 'slow-2g', '2g', '3g', '4g'
    signalStrength: Number, // 0-100
    estimatedBandwidth: Number, // Mbps
    rtt: Number, // 往返时间 ms
    ip: String
  },

  // 同步统计
  stats: {
    totalItems: { type: Number, default: 0 },
    successfulItems: { type: Number, default: 0 },
    failedItems: { type: Number, default: 0 },
    skippedItems: { type: Number, default: 0 },
    retriedItems: { type: Number, default: 0 },

    // 数据量统计
    totalBytesSent: { type: Number, default: 0 },
    totalBytesReceived: { type: Number, default: 0 },

    // 文件统计
    totalFiles: { type: Number, default: 0 },
    uploadedFiles: { type: Number, default: 0 },
    failedFiles: { type: Number, default: 0 }
  },

  // 同步进度
  progress: {
    current: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    lastUpdateTime: Date
  },

  // 时间统计
  timeStats: {
    startedAt: { type: Date, required: true },
    completedAt: Date,
    duration: Number, // 毫秒
    averageItemTime: Number, // 每项平均处理时间 ms
    uploadTime: Number, // 上传耗时 ms
    downloadTime: Number, // 下载耗时 ms
    processingTime: Number // 本地处理耗时 ms
  },

  // 同步的队列项
  queueItems: [{
    queueItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OfflineQueue'
    },
    status: {
      type: String,
      enum: ['pending', 'synced', 'failed', 'skipped']
    },
    attemptNumber: Number,
    startTime: Date,
    endTime: Date,
    duration: Number,
    serverResponse: mongoose.Schema.Types.Mixed,
    error: {
      code: String,
      message: String,
      retryable: Boolean
    }
  }],

  // 冲突解决记录
  conflicts: [{
    queueItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OfflineQueue'
    },
    resourceType: String,
    resourceId: mongoose.Schema.Types.ObjectId,
    conflictType: {
      type: String,
      enum: ['version_mismatch', 'duplicate', 'dependency_failed', 'validation_error']
    },
    resolution: {
      type: String,
      enum: ['client_wins', 'server_wins', 'merge', 'manual', 'skip']
    },
    resolvedAt: Date,
    resolvedBy: mongoose.Schema.Types.ObjectId // 管理员或系统
  }],

  // 错误汇总
  errors: [{
    code: String,
    message: String,
    queueItemId: mongoose.Schema.Types.ObjectId,
    count: Number,
    firstOccurrence: Date,
    lastOccurrence: Date
  }],

  // 警告信息
  warnings: [{
    code: String,
    message: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high']
    }
  }],

  // 同步范围
  syncScope: {
    resourceTypes: [String], // 要同步的资源类型
    dateRange: {
      from: Date,
      to: Date
    },
    limit: Number,
    skip: Number
  },

  // 客户端信息
  clientInfo: {
    deviceId: String,
    platform: String,
    appVersion: String,
    osVersion: String,
    deviceModel: String,
    userAgent: String,
    timezone: String,
    locale: String
  },

  // 服务器信息
  serverInfo: {
    version: String,
    node: String,
    region: String
  },

  // 附加数据
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },

  // 下次同步建议
  nextSync: {
    recommendedAt: Date,
    reason: String,
    pendingItemCount: Number
  }
}, {
  timestamps: true
});

// 索引
offlineSyncLogSchema.index({ userId: 1, createdAt: -1 });
offlineSyncLogSchema.index({ villageId: 1, status: 1, createdAt: -1 });
offlineSyncLogSchema.index({ sessionId: 1 }, { unique: true });
offlineSyncLogSchema.index({ status: 1, createdAt: -1 });
offlineSyncLogSchema.index({ 'timeStats.startedAt': -1 });

// 虚拟字段
offlineSyncLogSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

offlineSyncLogSchema.virtual('isFailed').get(function() {
  return this.status === 'failed';
});

offlineSyncLogSchema.virtual('isInProgress').get(function() {
  return this.status === 'in_progress';
});

offlineSyncLogSchema.virtual('successRate').get(function() {
  if (this.stats.totalItems === 0) return 0;
  return Math.round((this.stats.successfulItems / this.stats.totalItems) * 100);
});

offlineSyncLogSchema.virtual('hasConflicts').get(function() {
  return this.conflicts && this.conflicts.length > 0;
});

// 实例方法
offlineSyncLogSchema.methods.startSync = function() {
  this.status = 'in_progress';
  this.timeStats.startedAt = new Date();
  return this.save();
};

offlineSyncLogSchema.methods.completeSync = function() {
  this.status = 'completed';
  this.timeStats.completedAt = new Date();
  this.timeStats.duration = this.timeStats.completedAt - this.timeStats.startedAt;

  if (this.stats.totalItems > 0) {
    this.timeStats.averageItemTime = Math.round(
      this.timeStats.duration / this.stats.totalItems
    );
  }
  return this.save();
};

offlineSyncLogSchema.methods.failSync = function(error) {
  this.status = 'failed';
  this.timeStats.completedAt = new Date();
  this.timeStats.duration = this.timeStats.completedAt - this.timeStats.startedAt;

  if (error) {
    this.errors.push({
      code: error.code || 'SYNC_ERROR',
      message: error.message,
      count: 1,
      firstOccurrence: new Date(),
      lastOccurrence: new Date()
    });
  }
  return this.save();
};

offlineSyncLogSchema.methods.updateProgress = function(current, total) {
  this.progress.current = current;
  this.progress.total = total;
  this.progress.percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  this.progress.lastUpdateTime = new Date();
  return this.save();
};

offlineSyncLogSchema.methods.addQueueItem = function(itemData) {
  this.queueItems.push({
    queueItemId: itemData.queueItemId,
    status: itemData.status || 'pending',
    attemptNumber: itemData.attemptNumber || 1,
    startTime: itemData.startTime || new Date(),
    serverResponse: itemData.serverResponse,
    error: itemData.error
  });
  return this.save();
};

offlineSyncLogSchema.methods.addConflict = function(conflictData) {
  this.conflicts.push({
    queueItemId: conflictData.queueItemId,
    resourceType: conflictData.resourceType,
    resourceId: conflictData.resourceId,
    conflictType: conflictData.conflictType,
    resolution: conflictData.resolution,
    resolvedAt: conflictData.resolvedAt || new Date(),
    resolvedBy: conflictData.resolvedBy
  });
  return this.save();
};

// 静态方法
offlineSyncLogSchema.statics.getUserSyncHistory = function(userId, limit = 20) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('villageId', 'name');
};

offlineSyncLogSchema.statics.getActiveSyncSessions = function() {
  return this.find({
    status: { $in: ['started', 'in_progress'] }
  })
    .sort({ 'timeStats.startedAt': -1 })
    .populate('userId', 'username name');
};

offlineSyncLogSchema.statics.getFailedSyncSessions = function(limit = 10) {
  return this.find({ status: 'failed' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username name')
    .populate('villageId', 'name');
};

offlineSyncLogSchema.statics.getSyncStatsByUser = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$userId',
        totalSyncs: { $sum: 1 },
        successfulSyncs: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        failedSyncs: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        totalItems: { $sum: '$stats.totalItems' },
        successfulItems: { $sum: '$stats.successfulItems' },
        totalBytes: { $sum: '$stats.totalBytesSent' },
        avgDuration: { $avg: '$timeStats.duration' },
        lastSyncAt: { $max: '$timeStats.completedAt' }
      }
    }
  ]);
};

offlineSyncLogSchema.statics.getSyncStatsByVillage = function(villageId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        villageId: mongoose.Types.ObjectId(villageId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$villageId',
        totalSyncs: { $sum: 1 },
        successfulSyncs: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        totalUsers: { $addToSet: '$userId' },
        totalItems: { $sum: '$stats.totalItems' },
        totalBytes: { $sum: '$stats.totalBytesSent' }
      }
    },
    {
      $addFields: {
        userCount: { $size: '$totalUsers' }
      }
    }
  ]);
};

offlineSyncLogSchema.statics.getSessionBySessionId = function(sessionId) {
  return this.findOne({ sessionId })
    .populate('userId', 'username name phone')
    .populate('villageId', 'name')
    .populate('queueItems.queueItemId');
};

// 生成会话ID
offlineSyncLogSchema.statics.generateSessionId = function() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `sync_${timestamp}_${random}`;
};

// 清理旧日志
offlineSyncLogSchema.statics.cleanupOldLogs = function(daysOld = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    status: { $in: ['completed', 'failed', 'cancelled'] }
  });
};

module.exports = mongoose.model('OfflineSyncLog', offlineSyncLogSchema);
