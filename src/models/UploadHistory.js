/**
 * 上传统计报表历史模型
 */

const mongoose = require('mongoose');

const uploadHistorySchema = new mongoose.Schema({
  // 报表类型
  reportType: {
    type: String,
    enum: ['population', 'economic', 'social', 'agricultural', 'financial', 'infrastructure'],
    required: true,
    index: true
  },

  // 报表日期
  reportDate: {
    type: Date,
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

  // 上传平台
  platform: {
    type: String,
    enum: ['provincial', 'municipal', 'county', 'both'],
    required: true
  },

  // 上传状态
  status: {
    type: String,
    enum: ['pending', 'uploading', 'success', 'failed', 'rejected'],
    default: 'pending',
    index: true
  },

  // 文件信息
  fileInfo: {
    fileName: String,
    fileSize: Number,
    fileHash: String,
    uploadUrl: String,
    localPath: String
  },

  // 报表数据摘要
  reportSummary: {
    totalRecords: Number,
    dataPoints: Number,
    keyMetrics: mongoose.Schema.Types.Mixed
  },

  // 上传结果
  uploadResult: {
    reportId: String,
    platformReportId: String,
    confirmationNumber: String,
    uploadTime: Date,
    reviewStatus: String,
    reviewNotes: String,
    approvedTime: Date
  },

  // 错误信息
  error: {
    code: String,
    message: String,
    details: String,
    retryCount: {
      type: Number,
      default: 0
    }
  },

  // 处理日志
  processingLog: [{
    action: String,
    status: String,
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // 审核信息
  reviewInfo: {
    reviewerId: String,
    reviewerName: String,
    reviewTime: Date,
    reviewComments: String,
    approvedBy: String,
    approvedTime: Date
  },

  // 版本信息
  version: {
    type: String,
    default: '1.0'
  },

  // 上传人
  uploader: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    role: String
  },

  // 自动上传配置
  autoUpload: {
    enabled: {
      type: Boolean,
      default: false
    },
    schedule: String, // cron表达式
    lastAutoUpload: Date
  },

  // 时间戳
  uploadTime: {
    type: Date,
    default: Date.now,
    index: true
  },

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
uploadHistorySchema.index({ villageId: 1, reportType: 1, reportDate: -1 });
uploadHistorySchema.index({ reportType: 1, status: 1, uploadTime: -1 });
uploadHistorySchema.index({ platform: 1, status: 1, uploadTime: -1 });
uploadHistorySchema.index({ uploader: 1, uploadTime: -1 });

// 虚拟字段
uploadHistorySchema.virtual('isSuccessful').get(function() {
  return this.status === 'success';
});

uploadHistorySchema.virtual('isPending').get(function() {
  return ['pending', 'uploading'].includes(this.status);
});

uploadHistorySchema.virtual('hasError').get(function() {
  return this.status === 'failed';
});

uploadHistorySchema.virtual('uploadDuration').get(function() {
  if (!this.uploadResult?.uploadTime) {
    return null;
  }
  return this.uploadResult.uploadTime - this.uploadTime;
});

// 实例方法
uploadHistorySchema.methods.addProcessingLog = function(action, status, message) {
  this.processingLog.push({
    action,
    status,
    message,
    timestamp: new Date()
  });
  this.updatedAt = new Date();
  return this.save();
};

uploadHistorySchema.methods.markAsUploading = function() {
  this.status = 'uploading';
  this.addProcessingLog('start_upload', 'uploading', '开始上传报表');
  return this.save();
};

uploadHistorySchema.methods.markAsSuccess = function(reportId, platformReportId = '') {
  this.status = 'success';
  this.uploadResult = {
    reportId,
    platformReportId,
    uploadTime: new Date(),
    reviewStatus: 'pending'
  };
  this.addProcessingLog('upload_success', 'success', `报表上传成功，报告ID: ${reportId}`);
  return this.save();
};

uploadHistorySchema.methods.markAsFailed = function(error) {
  this.status = 'failed';
  this.error = {
    code: error.code || 'UPLOAD_FAILED',
    message: error.message,
    details: error.details || '',
    retryCount: (this.error?.retryCount || 0) + 1
  };
  this.addProcessingLog('upload_failed', 'failed', error.message);
  return this.save();
};

uploadHistorySchema.methods.setReviewStatus = function(reviewStatus, reviewerId, reviewerName, comments = '') {
  this.uploadResult.reviewStatus = reviewStatus;
  this.reviewInfo = {
    reviewerId,
    reviewerName,
    reviewTime: new Date(),
    reviewComments: comments
  };

  if (reviewStatus === 'approved') {
    this.status = 'success';
    this.uploadResult.approvedTime = new Date();
  } else if (reviewStatus === 'rejected') {
    this.status = 'rejected';
  }

  this.addProcessingLog(`review_${reviewStatus}`, reviewStatus, comments);
  return this.save();
};

uploadHistorySchema.methods.canRetry = function() {
  return this.status === 'failed' && this.error.retryCount < 3;
};

uploadHistorySchema.methods.incrementRetryCount = function() {
  this.error.retryCount = (this.error.retryCount || 0) + 1;
  this.status = 'pending';
  return this.save();
};

// 静态方法
uploadHistorySchema.statics.getUploadStats = function(villageId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        villageId: mongoose.Types.ObjectId(villageId),
        uploadTime: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$reportType',
        totalUploads: { $sum: 1 },
        successfulUploads: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
        },
        failedUploads: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        avgFileSize: { $avg: '$fileInfo.fileSize' },
        lastUploadTime: { $max: '$uploadTime' }
      }
    }
  ]);
};

uploadHistorySchema.statics.getRecentUploads = function(villageId = null, limit = 10) {
  const matchCondition = {};
  if (villageId) {
    matchCondition.villageId = mongoose.Types.ObjectId(villageId);
  }

  return this.find(matchCondition)
    .sort({ uploadTime: -1 })
    .limit(limit)
    .populate('villageId', 'name')
    .populate('uploader.userId', 'username')
    .lean();
};

uploadHistorySchema.statics.getFailedUploads = function(villageId = null, limit = 20) {
  const matchCondition = { status: 'failed' };
  if (villageId) {
    matchCondition.villageId = mongoose.Types.ObjectId(villageId);
  }

  return this.find(matchCondition)
    .sort({ uploadTime: -1 })
    .limit(limit)
    .populate('villageId', 'name')
    .populate('uploader.userId', 'username')
    .lean();
};

uploadHistorySchema.statics.getPendingUploads = function() {
  return this.find({ status: { $in: ['pending', 'uploading'] } })
    .sort({ uploadTime: 1 })
    .populate('villageId', 'name')
    .populate('uploader.userId', 'username')
    .lean();
};

uploadHistorySchema.statics.getMonthlyReport = function(year, month, villageId = null) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const matchCondition = {
    uploadTime: { $gte: startDate, $lte: endDate }
  };

  if (villageId) {
    matchCondition.villageId = mongoose.Types.ObjectId(villageId);
  }

  return this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: {
          reportType: '$reportType',
          platform: '$platform'
        },
        totalUploads: { $sum: 1 },
        successfulUploads: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
        },
        totalFileSize: { $sum: '$fileInfo.fileSize' },
        avgDuration: { $avg: '$uploadDuration' }
      }
    },
    {
      $group: {
        _id: '$_id.reportType',
        platforms: {
          $push: {
            platform: '$_id.platform',
            totalUploads: '$totalUploads',
            successfulUploads: '$successfulUploads',
            totalFileSize: '$totalFileSize',
            avgDuration: '$avgDuration'
          }
        },
        totalUploads: { $sum: '$totalUploads' },
        totalSuccessful: { $sum: '$successfulUploads' }
      }
    }
  ]);
};

uploadHistorySchema.statics.getUploadTrend = function(villageId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        villageId: mongoose.Types.ObjectId(villageId),
        uploadTime: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$uploadTime' },
          month: { $month: '$uploadTime' },
          day: { $dayOfMonth: '$uploadTime' }
        },
        uploadCount: { $sum: 1 },
        successfulCount: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
        },
        totalFileSize: { $sum: '$fileInfo.fileSize' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);
};

module.exports = mongoose.model('UploadHistory', uploadHistorySchema);