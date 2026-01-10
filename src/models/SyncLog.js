/**
 * 同步日志模型
 * 记录离线数据同步的详细日志，用于追踪、审计和问题诊断
 */

const mongoose = require('mongoose');

const syncLogSchema = new mongoose.Schema({
  // 同步会话ID (一次批量同步的唯一标识)
  syncSessionId: {
    type: String,
    required: true,
    unique: true,
    default: () => `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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

  // 设备标识
  deviceId: {
    type: String,
    required: true,
    index: true
  },

  // 同步类型
  syncType: {
    type: String,
    enum: ['full', 'incremental', 'manual', 'auto', 'conflict_resolution'],
    required: true
  },

  // 同步方向
  syncDirection: {
    type: String,
    enum: ['client_to_server', 'server_to_client', 'bidirectional'],
    required: true
  },

  // 同步状态
  status: {
    type: String,
    enum: ['started', 'in_progress', 'completed', 'failed', 'partial', 'cancelled'],
    required: true,
    default: 'started',
    index: true
  },

  // 同步统计
  statistics: {
    // 总操作数
    totalOperations: {
      type: Number,
      default: 0
    },
    // 成功操作数
    successfulOperations: {
      type: Number,
      default: 0
    },
    // 失败操作数
    failedOperations: {
      type: Number,
      default: 0
    },
    // 冲突操作数
    conflictOperations: {
      type: Number,
      default: 0
    },
    // 跳过操作数
    skippedOperations: {
      type: Number,
      default: 0
    },
    // 数据总大小(字节)
    totalDataSize: {
      type: Number,
      default: 0
    },
    // 上传数据大小
    uploadedDataSize: {
      type: Number,
      default: 0
    },
    // 下载数据大小
    downloadedDataSize: {
      type: Number,
      default: 0
    }
  },

  // 同步的模型类型
  syncedModels: [{
    model: String,
    count: Number,
    successCount: Number,
    failedCount: Number
  }],

  // 时间统计
  timing: {
    startTime: {
      type: Date,
      required: true
    },
    endTime: Date,
    duration: Number, // 毫秒
    estimatedTimeRemaining: Number,
    averageOperationTime: Number
  },

  // 网络信息
  networkInfo: {
    networkType: {
      type: String,
      enum: ['wifi', 'cellular', 'ethernet', 'unknown']
    },
    connectionQuality: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor']
    },
    signalStrength: Number, // 0-100
    bandwidth: Number, // Kbps
    latency: Number // ms
  },

  // 客户端信息
  clientInfo: {
    platform: {
      type: String,
      enum: ['web', 'mobile_ios', 'mobile_android', 'desktop']
    },
    appVersion: String,
    osVersion: String,
    deviceModel: String,
    userAgent: String,
    ipAddress: String
  },

  // 同步进度
  progress: {
    currentStep: String,
    completedSteps: [String],
    totalSteps: Number,
    percentage: Number,
    message: String
  },

  // 冲突解决记录
  conflictResolutions: [{
    operationId: String,
    targetModel: String,
    targetId: mongoose.Schema.Types.ObjectId,
    conflictType: String,
    resolution: String,
    resolvedBy: {
      type: String,
      enum: ['auto', 'user', 'admin', 'system']
    },
    resolvedAt: Date
  }],

  // 错误记录
  errors: [{
    step: String,
    operationId: String,
    code: String,
    message: String,
    details: mongoose.Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now
    },
    recoverable: {
      type: Boolean,
      default: true
    }
  }],

  // 警告记录
  warnings: [{
    step: String,
    message: String,
    code: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // 操作详情 (详细记录每个操作的执行情况)
  operationDetails: [{
    operationId: String,
    operationType: String,
    targetModel: String,
    targetId: mongoose.Schema.Types.ObjectId,
    status: String,
    duration: Number,
    dataSize: Number,
    timestamp: Date,
    errorMessage: String
  }],

  // 性能指标
  performance: {
    cpuUsage: Number,
    memoryUsage: Number,
    databaseQueries: Number,
    cacheHits: Number,
    cacheMisses: Number
  },

  // 元数据
  metadata: {
    initiatedBy: {
      type: String,
      enum: ['user', 'system', 'admin', 'schedule']
    },
    triggerReason: String,
    tags: [String],
    correlationId: String,
    parentSessionId: String
  },

  // 结果摘要
  summary: {
    message: String,
    recommendations: [String],
    nextActions: [String]
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
  collection: 'sync_logs'
});

// 复合索引
syncLogSchema.index({ userId: 1, status: 1, createdAt: -1 });
syncLogSchema.index({ villageId: 1, status: 1, createdAt: -1 });
syncLogSchema.index({ deviceId: 1, createdAt: -1 });
// syncSessionId 已有 unique: true，无需重复索引
syncLogSchema.index({ status: 1, 'timing.startTime': -1 });
syncLogSchema.index({ 'metadata.initiatedBy': 1, createdAt: -1 });

// 虚拟字段
syncLogSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

syncLogSchema.virtual('isFailed').get(function() {
  return this.status === 'failed';
});

syncLogSchema.virtual('isInProgress').get(function() {
  return this.status === 'in_progress';
});

syncLogSchema.virtual('successRate').get(function() {
  if (this.statistics.totalOperations === 0) return 0;
  return Math.round((this.statistics.successfulOperations / this.statistics.totalOperations) * 100);
});

syncLogSchema.virtual('hasErrors').get(function() {
  return this.errors && this.errors.length > 0;
});

syncLogSchema.virtual('hasWarnings').get(function() {
  return this.warnings && this.warnings.length > 0;
});

syncLogSchema.virtual('duration').get(function() {
  if (this.timing.endTime && this.timing.startTime) {
    return this.timing.endTime.getTime() - this.timing.startTime.getTime();
  }
  if (this.status === 'in_progress' && this.timing.startTime) {
    return Date.now() - this.timing.startTime.getTime();
  }
  return null;
});

// 实例方法
/**
 * 标记为进行中
 */
syncLogSchema.methods.markInProgress = function(step, message) {
  this.status = 'in_progress';
  this.progress = this.progress || {};
  this.progress.currentStep = step;
  this.progress.message = message;
  if (!this.progress.completedSteps.includes(step)) {
    this.progress.completedSteps.push(step);
  }
  return this.save();
};

/**
 * 标记为完成
 */
syncLogSchema.methods.markCompleted = function(summary) {
  this.status = 'completed';
  this.timing.endTime = new Date();
  this.timing.duration = this.timing.endTime.getTime() - this.timing.startTime.getTime();
  if (summary) {
    this.summary = summary;
  }
  return this.save();
};

/**
 * 标记为失败
 */
syncLogSchema.methods.markFailed = function(error) {
  this.status = 'failed';
  this.timing.endTime = new Date();
  this.timing.duration = this.timing.endTime.getTime() - this.timing.startTime.getTime();
  this.addError(null, error);
  return this.save();
};

/**
 * 标记为部分完成
 */
syncLogSchema.methods.markPartial = function(summary) {
  this.status = 'partial';
  this.timing.endTime = new Date();
  this.timing.duration = this.timing.endTime.getTime() - this.timing.startTime.getTime();
  if (summary) {
    this.summary = summary;
  }
  return this.save();
};

/**
 * 更新统计
 */
syncLogSchema.methods.updateStatistics = function(stats) {
  Object.assign(this.statistics, stats);
  return this.save();
};

/**
 * 更新进度
 */
syncLogSchema.methods.updateProgress = function(percentage, message) {
  this.progress = this.progress || {};
  this.progress.percentage = percentage;
  if (message) {
    this.progress.message = message;
  }
  return this.save();
};

/**
 * 添加错误
 */
syncLogSchema.methods.addError = function(step, error) {
  this.errors = this.errors || [];
  this.errors.push({
    step,
    code: error.code || 'SYNC_ERROR',
    message: error.message,
    details: error.details,
    recoverable: error.recoverable !== false,
    timestamp: new Date()
  });
  return this.save();
};

/**
 * 添加警告
 */
syncLogSchema.methods.addWarning = function(step, message, code = null) {
  this.warnings = this.warnings || [];
  this.warnings.push({
    step,
    message,
    code,
    timestamp: new Date()
  });
  return this.save();
};

/**
 * 添加操作详情
 */
syncLogSchema.methods.addOperationDetail = function(detail) {
  this.operationDetails = this.operationDetails || [];
  this.operationDetails.push({
    ...detail,
    timestamp: new Date()
  });
  return this.save();
};

/**
 * 添加冲突解决记录
 */
syncLogSchema.methods.addConflictResolution = function(resolution) {
  this.conflictResolutions = this.conflictResolutions || [];
  this.conflictResolutions.push({
    ...resolution,
    resolvedAt: new Date()
  });
  return this.save();
};

/**
 * 计算成功率
 */
syncLogSchema.methods.calculateSuccessRate = function() {
  if (this.statistics.totalOperations === 0) return 0;
  return Math.round((this.statistics.successfulOperations / this.statistics.totalOperations) * 100);
};

/**
 * 获取错误摘要
 */
syncLogSchema.methods.getErrorSummary = function() {
  if (!this.errors || this.errors.length === 0) {
    return null;
  }
  const errorCounts = {};
  this.errors.forEach(error => {
    const key = error.code || 'UNKNOWN';
    errorCounts[key] = (errorCounts[key] || 0) + 1;
  });
  return errorCounts;
};

/**
 * 添加模型同步统计
 */
syncLogSchema.methods.addModelStats = function(model, count, successCount, failedCount) {
  this.syncedModels = this.syncedModels || [];
  const existing = this.syncedModels.find(m => m.model === model);
  if (existing) {
    existing.count += count;
    existing.successCount += successCount;
    existing.failedCount += failedCount;
  } else {
    this.syncedModels.push({ model, count, successCount, failedCount });
  }
  return this.save();
};

// 静态方法
/**
 * 获取用户的同步历史
 */
syncLogSchema.statics.getUserSyncHistory = function(userId, options = {}) {
  const {
    limit = 20,
    skip = 0,
    status,
    startDate,
    endDate
  } = options;

  const query = { userId };
  if (status) query.status = status;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

/**
 * 获取设备的同步历史
 */
syncLogSchema.statics.getDeviceSyncHistory = function(deviceId, options = {}) {
  const {
    limit = 20,
    skip = 0,
    status
  } = options;

  const query = { deviceId };
  if (status) query.status = status;

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

/**
 * 获取村庄的同步统计
 */
syncLogSchema.statics.getVillageSyncStats = function(villageId, days = 30) {
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
        _id: '$status',
        count: { $sum: 1 },
        avgDuration: { $avg: '$timing.duration' },
        avgSuccessRate: { $avg: {
          $cond: [
            { $gt: ['$statistics.totalOperations', 0] },
            { $multiply: [
              { $divide: ['$statistics.successfulOperations', '$statistics.totalOperations'] },
              100
            ]},
            0
          ]
        }},
        totalOperations: { $sum: '$statistics.totalOperations' },
        totalDataSize: { $sum: '$statistics.totalDataSize' }
      }
    }
  ]);
};

/**
 * 获取最近的失败同步
 */
syncLogSchema.statics.getRecentFailures = function(limit = 10) {
  return this.find({ status: 'failed' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username name')
    .populate('villageId', 'name')
    .lean();
};

/**
 * 获取同步性能报告
 */
syncLogSchema.statics.getPerformanceReport = function(villageId, days = 7) {
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
        _id: null,
        totalSyncs: { $sum: 1 },
        successfulSyncs: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        failedSyncs: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        avgDuration: { $avg: '$timing.duration' },
        totalDataTransferred: { $sum: '$statistics.totalDataSize' },
        avgSuccessRate: { $avg: {
          $cond: [
            { $gt: ['$statistics.totalOperations', 0] },
            { $multiply: [
              { $divide: ['$statistics.successfulOperations', '$statistics.totalOperations'] },
              100
            ]},
            0
          ]
        }}
      }
    }
  ]);
};

/**
 * 清理旧的同步日志
 */
syncLogSchema.statics.cleanupOldLogs = function(daysOld = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    status: { $in: ['completed', 'failed', 'cancelled', 'partial'] }
  });
};

/**
 * 获取活跃同步会话
 */
syncLogSchema.statics.getActiveSessions = function() {
  return this.find({
    status: { $in: ['started', 'in_progress'] }
  })
    .sort({ 'timing.startTime': -1 })
    .populate('userId', 'username name')
    .lean();
};

/**
 * 取消用户的所有活跃同步
 */
syncLogSchema.statics.cancelUserActiveSyncs = function(userId) {
  return this.updateMany(
    {
      userId,
      status: { $in: ['started', 'in_progress'] }
    },
    {
      $set: {
        status: 'cancelled',
        'timing.endTime': new Date()
      }
    }
  );
};

// 中间件
syncLogSchema.pre('save', function(next) {
  // 计算持续时间
  if (this.timing.startTime && this.timing.endTime && !this.timing.duration) {
    this.timing.duration = this.timing.endTime.getTime() - this.timing.startTime.getTime();
  }

  // 计算平均操作时间
  if (this.timing.duration && this.statistics.totalOperations > 0) {
    this.timing.averageOperationTime = Math.round(this.timing.duration / this.statistics.totalOperations);
  }

  // 更新进度百分比
  if (this.progress && this.progress.totalSteps && this.progress.completedSteps) {
    this.progress.percentage = Math.round(
      (this.progress.completedSteps.length / this.progress.totalSteps) * 100
    );
  }

  next();
});

// TTL索引：90天后自动删除已完成的日志
syncLogSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 7776000,
    partialFilterExpression: {
      status: { $in: ['completed', 'failed', 'cancelled', 'partial'] }
    }
  }
);

module.exports = mongoose.model('SyncLog', syncLogSchema);
