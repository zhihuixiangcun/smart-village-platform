/**
 * 便民服务申请历史模型
 */

const mongoose = require('mongoose');

const applicationHistorySchema = new mongoose.Schema({
  // 申请ID
  applicationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // 关联服务
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GovernmentService',
    required: true,
    index: true
  },

  // 申请人信息
  applicantId: {
    type: String,
    required: true,
    index: true
  },

  applicantName: {
    type: String,
    required: true
  },

  applicantPhone: {
    type: String,
    required: true
  },

  // 申请信息
  applicationData: {
    villageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Village',
      required: true
    },
    address: String,
    formData: mongoose.Schema.Types.Mixed,
    attachments: [{
      fileName: String,
      fileUrl: String,
      fileSize: Number,
      uploadTime: {
        type: Date,
        default: Date.now
      }
    }]
  },

  // 申请状态
  status: {
    type: String,
    enum: ['draft', 'submitted', 'processing', 'reviewing', 'approved', 'rejected', 'cancelled', 'completed'],
    default: 'draft',
    index: true
  },

  // 处理信息
  processingInfo: {
    processorId: String,
    processorName: String,
    processingNotes: String,
    expectedCompletionTime: Date,
    actualCompletionTime: Date
  },

  // 审核结果
  reviewResult: {
    approved: Boolean,
    reviewerId: String,
    reviewerName: String,
    reviewNotes: String,
    reviewTime: Date,
    attachments: [{
      fileName: String,
      fileUrl: String
    }]
  },

  // 服务结果
  serviceResult: {
    resultType: String,
    resultData: mongoose.Schema.Types.Mixed,
    certificateUrl: String,
    referenceNumber: String,
    issuedDate: Date,
    expiryDate: Date
  },

  // 时间跟踪
  timeline: [{
    action: String,
    actor: String,
    actorName: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String,
    attachments: [String]
  }],

  // 反馈评价
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    submitTime: Date
  },

  // 申请时间
  applyTime: {
    type: Date,
    default: Date.now,
    index: true
  },

  // 最后更新时间
  lastUpdated: {
    type: Date,
    default: Date.now
  },

  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 索引
applicationHistorySchema.index({ applicantId: 1, applyTime: -1 });
applicationHistorySchema.index({ serviceId: 1, status: 1 });
applicationHistorySchema.index({ status: 1, applyTime: -1 });
applicationHistorySchema.index({ 'applicationData.villageId': 1, applyTime: -1 });

// 虚拟字段
applicationHistorySchema.virtual('isCompleted').get(function() {
  return ['approved', 'completed'].includes(this.status);
});

applicationHistorySchema.virtual('isPending').get(function() {
  return ['submitted', 'processing', 'reviewing'].includes(this.status);
});

applicationHistorySchema.virtual('isFailed').get(function() {
  return ['rejected', 'cancelled'].includes(this.status);
});

applicationHistorySchema.virtual('processingDuration').get(function() {
  if (!this.processingInfo.actualCompletionTime) {
    return null;
  }
  return this.processingInfo.actualCompletionTime - this.applyTime;
});

// 实例方法
applicationHistorySchema.methods.addTimeline = function(action, actor, actorName, notes = '', attachments = []) {
  this.timeline.push({
    action,
    actor,
    actorName,
    notes,
    attachments
  });
  this.lastUpdated = new Date();
  return this.save();
};

applicationHistorySchema.methods.updateStatus = function(status, processorId, processorName, notes = '') {
  this.status = status;
  this.processingInfo.processorId = processorId;
  this.processingInfo.processorName = processorName;
  this.processingInfo.processingNotes = notes;
  this.lastUpdated = new Date();

  // 添加时间线记录
  this.addTimeline(`status_changed_to_${status}`, processorId, processorName, notes);
  return this.save();
};

applicationHistorySchema.methods.setReviewResult = function(approved, reviewerId, reviewerName, notes = '', attachments = []) {
  this.reviewResult = {
    approved,
    reviewerId,
    reviewerName,
    reviewNotes: notes,
    reviewTime: new Date(),
    attachments
  };

  this.status = approved ? 'approved' : 'rejected';
  this.lastUpdated = new Date();

  // 添加时间线记录
  this.addTimeline(
    approved ? 'approved' : 'rejected',
    reviewerId,
    reviewerName,
    notes,
    attachments
  );

  return this.save();
};

applicationHistorySchema.methods.completeService = function(resultType, resultData, certificateUrl = '', referenceNumber = '') {
  this.status = 'completed';
  this.serviceResult = {
    resultType,
    resultData,
    certificateUrl,
    referenceNumber,
    issuedDate: new Date()
  };
  this.processingInfo.actualCompletionTime = new Date();
  this.lastUpdated = new Date();

  return this.save();
};

applicationHistorySchema.methods.cancelApplication = function(reason = '') {
  this.status = 'cancelled';
  this.lastUpdated = new Date();
  this.addTimeline('cancelled', 'system', '系统', reason);
  return this.save();
};

applicationHistorySchema.methods.submitFeedback = function(rating, comment = '') {
  this.feedback = {
    rating,
    comment,
    submitTime: new Date()
  };
  this.lastUpdated = new Date();
  return this.save();
};

// 静态方法
applicationHistorySchema.statics.getApplicantStats = function(applicantId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        applicantId,
        applyTime: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        lastApplyTime: { $max: '$applyTime' }
      }
    }
  ]);
};

applicationHistorySchema.statics.getServiceStats = function(villageId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        'applicationData.villageId': mongoose.Types.ObjectId(villageId),
        applyTime: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$serviceId',
        totalApplications: { $sum: 1 },
        approvedApplications: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        completedApplications: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        avgProcessingTime: { $avg: '$processingInfo.actualCompletionTime' }
      }
    },
    {
      $lookup: {
        from: 'governmentservices',
        localField: '_id',
        foreignField: '_id',
        as: 'service'
      }
    }
  ]);
};

applicationHistorySchema.statics.getPendingApplications = function(villageId = null) {
  const matchCondition = {
    status: { $in: ['submitted', 'processing', 'reviewing'] }
  };

  if (villageId) {
    matchCondition['applicationData.villageId'] = mongoose.Types.ObjectId(villageId);
  }

  return this.find(matchCondition)
    .sort({ applyTime: 1 })
    .populate('serviceId', 'name type category')
    .populate('applicantId', 'name phone')
    .populate('applicationData.villageId', 'name');
};

applicationHistorySchema.statics.getApplicationsByStatus = function(status, page = 1, limit = 20) {
  return this.find({ status })
    .sort({ applyTime: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('serviceId', 'name type category')
    .populate('applicantId', 'name phone')
    .populate('applicationData.villageId', 'name');
};

module.exports = mongoose.model('ApplicationHistory', applicationHistorySchema);