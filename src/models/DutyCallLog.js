/**
 * DutyCallLog Model - 村民呼叫值班人员记录
 *
 * @module models/DutyCallLog
 * @description 村民扫码呼叫值班人员的记录
 */

const mongoose = require('mongoose');

const dutyCallLogSchema = new mongoose.Schema({
  // 基础信息
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DutySchedule',
    required: true,
    index: true
  },
  
  // 被呼叫的值班人员信息
  dutyOfficer: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    userName: {
      type: String,
      required: true
    },
    userPhone: {
      type: String,
      required: true
    },
    userRole: String
  },
  
  // 呼叫人信息
  caller: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    userPhone: {
      type: String,
      required: true
    },
    isAnonymous: {
      type: Boolean,
      default: false
    },
    userAddress: String
  },
  
  // 呼叫类型
  callType: {
    type: String,
    enum: ['QR_CODE', 'PHONE', 'ONLINE'],
    required: true
  },
  
  // 紧急程度
  urgency: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'],
    default: 'LOW'
  },
  
  // 呼叫内容
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  // 附件（图片等）
  attachments: [{
    url: String,
    type: {
      type: String,
      enum: ['IMAGE', 'VIDEO', 'AUDIO']
    },
    size: Number
  }],
  
  // 响应时间
  responseTime: Date,
  
  // 解决时间
  resolvedTime: Date,
  
  // 处理结果
  resolution: {
    type: String,
    maxlength: 1000
  },
  
  // 满意度评分 (1-5)
  satisfaction: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  
  // 反馈意见
  feedback: {
    type: String,
    maxlength: 500
  },
  
  // 状态
  status: {
    type: String,
    enum: ['PENDING', 'RESPONDING', 'RESOLVED', 'CLOSED', 'ESCALATED'],
    default: 'PENDING',
    index: true
  },
  
  // 升级信息
  escalation: {
    escalatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    escalatedAt: Date,
    reason: String
  },
  
  // 响应时长（秒）
  responseDuration: {
    type: Number,
    default: null
  },
  
  // 解决时长（秒）
  resolutionDuration: {
    type: Number,
    default: null
  },
  
  // 二维码信息（如果是扫码呼叫）
  qrCode: {
    code: String,
    scannedAt: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引优化
dutyCallLogSchema.index({ villageId: 1, createdAt: -1 });
dutyCallLogSchema.index({ 'dutyOfficer.userId': 1, status: 1, createdAt: -1 });
dutyCallLogSchema.index({ 'caller.userId': 1, createdAt: -1 });
dutyCallLogSchema.index({ status: 1, urgency: 1, createdAt: -1 });

// 虚拟字段：响应状态文本
dutyCallLogSchema.virtual('statusText').get(function() {
  const statusMap = {
    'PENDING': '未响应',
    'RESPONDING': '处理中',
    'RESOLVED': '已解决',
    'CLOSED': '已关闭',
    'ESCALATED': '已升级'
  };
  return statusMap[this.status] || '未知';
});

// 虚拟字段：是否超时
dutyCallLogSchema.virtual('isTimeout').get(function() {
  if (this.responseTime) return false;
  
  const timeoutMap = {
    'LOW': 24 * 60 * 60 * 1000,
    'MEDIUM': 4 * 60 * 60 * 1000,
    'HIGH': 60 * 60 * 1000,
    'EMERGENCY': 10 * 60 * 1000
  };
  
  const timeout = timeoutMap[this.urgency] || timeoutMap.LOW;
  return Date.now() - this.createdAt.getTime() > timeout;
});

// 虚拟字段：紧急程度文本
dutyCallLogSchema.virtual('urgencyText').get(function() {
  const urgencyMap = {
    'LOW': '一般',
    'MEDIUM': '紧急',
    'HIGH': '特急',
    'EMERGENCY': '特大紧急'
  };
  return urgencyMap[this.urgency] || '一般';
});

// 实例方法：响应呼叫
dutyCallLogSchema.methods.respond = async function(note = '') {
  this.status = 'RESPONDING';
  this.responseTime = new Date();
  this.responseDuration = Math.floor((this.responseTime - this.createdAt) / 1000);
  if (note) this.resolution = note;
  await this.save();
  return this;
};

// 实例方法：解决问题
dutyCallLogSchema.methods.resolve = async function(resolutionText = '') {
  this.status = 'RESOLVED';
  this.resolvedTime = new Date();
  this.resolutionDuration = Math.floor((this.resolvedTime - this.createdAt) / 1000);
  if (resolutionText) this.resolution = resolutionText;
  await this.save();
  return this;
};

// 实例方法：关闭记录
dutyCallLogSchema.methods.close = async function() {
  this.status = 'CLOSED';
  await this.save();
  return this;
};

// 实例方法：评价满意度
dutyCallLogSchema.methods.rate = async function(rating, feedbackText = '') {
  this.satisfaction = rating;
  this.feedback = feedbackText;
  if (this.status === 'RESOLVED') {
    this.status = 'CLOSED';
  }
  await this.save();
  return this;
};

// 实例方法：升级处理
dutyCallLogSchema.methods.escalate = async function(escalateToId, reason = '') {
  this.status = 'ESCALATED';
  this.escalation = {
    escalatedTo: escalateToId,
    escalatedAt: new Date(),
    reason
  };
  await this.save();
  return this;
};

// 静态方法：检查呼叫频率限制
dutyCallLogSchema.statics.checkRateLimit = async function(callerId, villageId, minutes = 10) {
  const since = new Date(Date.now() - minutes * 60 * 1000);
  
  const count = await this.countDocuments({
    'caller.userId': callerId,
    villageId,
    createdAt: { $gte: since }
  });
  
  const limit = 3;
  return { allowed: count < limit, count, limit };
};

// 静态方法：获取超时未响应的呼叫
dutyCallLogSchema.statics.getTimeoutCalls = async function(villageId) {
  const timeoutThreshold = new Date(Date.now() - 4 * 60 * 60 * 1000);
  
  return this.find({
    villageId,
    status: 'PENDING',
    createdAt: { $lt: timeoutThreshold }
  }).populate('dutyOfficer.userId', 'name phone');
};

// 静态方法：统计呼叫数据
dutyCallLogSchema.statics.getStatistics = async function(villageId, startDate, endDate) {
  const pipeline = [
    {
      $match: {
        villageId,
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }
    },
    {
      $group: {
        _id: null,
        totalCalls: { $sum: 1 },
        pendingCalls: {
          $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] }
        },
        resolvedCalls: {
          $sum: { $cond: [{ $in: ['$status', ['RESOLVED', 'CLOSED']] }, 1, 0] }
        },
        avgResponseTime: {
          $avg: '$responseDuration'
        },
        avgResolutionTime: {
          $avg: '$resolutionDuration'
        },
        avgSatisfaction: {
          $avg: { $ifNull: ['$satisfaction', 0] }
        },
        urgentCalls: {
          $sum: { $cond: [{ $in: ['$urgency', ['HIGH', 'EMERGENCY']] }, 1, 0] }
        },
        qrCodeCalls: {
          $sum: { $cond: [{ $eq: ['$callType', 'QR_CODE'] }, 1, 0] }
        }
      }
    }
  ];
  
  const [stats] = await this.aggregate(pipeline);
  return stats || {
    totalCalls: 0,
    pendingCalls: 0,
    resolvedCalls: 0,
    avgResponseTime: 0,
    avgResolutionTime: 0,
    avgSatisfaction: 0,
    urgentCalls: 0,
    qrCodeCalls: 0
  };
};

module.exports = mongoose.model('DutyCallLog', dutyCallLogSchema);
