/**
 * 数据同步历史模型
 */

const mongoose = require('mongoose');

const syncHistorySchema = new mongoose.Schema({
  // 关联村庄
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 同步类型
  syncType: {
    type: String,
    enum: ['household', 'socialSecurity', 'statistics', 'all'],
    required: true,
    index: true
  },

  // 同步状态
  status: {
    type: String,
    enum: ['pending', 'processing', 'success', 'failed', 'partial'],
    required: true,
    index: true
  },

  // 同步统计
  totalRecords: {
    type: Number,
    default: 0
  },

  processedRecords: {
    type: Number,
    default: 0
  },

  failedRecords: {
    type: Number,
    default: 0
  },

  // 耗时（毫秒）
  duration: {
    type: Number,
    default: 0
  },

  // 同步详情
  details: {
    syncMode: {
      type: String,
      enum: ['manual', 'auto', 'scheduled'],
      default: 'manual'
    },
    batchSize: {
      type: Number,
      default: 100
    },
    retryCount: {
      type: Number,
      default: 0
    }
  },

  // 错误信息
  errors: [{
    batch: Number,
    error: String,
    records: Number,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // 同步时间范围
  timeRange: {
    startTime: Date,
    endTime: Date
  },

  // 平台信息
  platform: {
    type: String,
    enum: ['provincial', 'municipal', 'both'],
    default: 'provincial'
  },

  // 操作人
  operator: {
    type: String,
    required: true
  },

  // 同步时间
  syncTime: {
    type: Date,
    default: Date.now,
    index: true
  },

  // 创建和更新时间
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 索引
syncHistorySchema.index({ villageId: 1, syncType: 1, syncTime: -1 });
syncHistorySchema.index({ syncType: 1, status: 1, syncTime: -1 });
syncHistorySchema.index({ operator: 1, syncTime: -1 });

// 虚拟字段
syncHistorySchema.virtual('successRate').get(function() {
  if (this.totalRecords === 0) return 0;
  return Math.round((this.processedRecords / this.totalRecords) * 100);
});

syncHistorySchema.virtual('isSuccess').get(function() {
  return this.status === 'success' && this.failedRecords === 0;
});

// 实例方法
syncHistorySchema.methods.addError = function(error) {
  this.errors.push({
    batch: error.batch || 0,
    error: error.error || error.message,
    records: error.records || 0,
    timestamp: new Date()
  });
  return this.save();
};

syncHistorySchema.methods.updateStatus = function(status, stats = {}) {
  this.status = status;

  if (stats.totalRecords !== undefined) {
    this.totalRecords = stats.totalRecords;
  }
  if (stats.processedRecords !== undefined) {
    this.processedRecords = stats.processedRecords;
  }
  if (stats.failedRecords !== undefined) {
    this.failedRecords = stats.failedRecords;
  }
  if (stats.duration !== undefined) {
    this.duration = stats.duration;
  }

  return this.save();
};

// 静态方法
syncHistorySchema.statics.getLatestSync = function(villageId, syncType) {
  return this.findOne({ villageId, syncType })
    .sort({ syncTime: -1 })
    .populate('villageId', 'name');
};

syncHistorySchema.statics.getSyncStats = function(villageId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        villageId: mongoose.Types.ObjectId(villageId),
        syncTime: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$syncType',
        totalSyncs: { $sum: 1 },
        successCount: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
        },
        totalRecords: { $sum: '$totalRecords' },
        avgDuration: { $avg: '$duration' },
        lastSyncTime: { $max: '$syncTime' }
      }
    }
  ]);
};

syncHistorySchema.statics.getFailedSyncs = function(limit = 10) {
  return this.find({ status: 'failed' })
    .sort({ syncTime: -1 })
    .limit(limit)
    .populate('villageId', 'name')
    .populate('operator', 'username');
};

module.exports = mongoose.model('SyncHistory', syncHistorySchema);