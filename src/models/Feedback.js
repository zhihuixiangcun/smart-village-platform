/**
 * 反馈模型
 */

const mongoose = require('mongoose');

// 反馈类型
const FeedbackTypes = {
  COMPLAINT: 'complaint',     // 投诉建议
  REPORT: 'report',         // 问题上报
  CONSULT: 'consult',       // 咨询求助
  PRAISE: 'praise',         // 表扬感谢
  SUGGESTION: 'suggestion', // 改进建议
  OTHER: 'other'           // 其他
};

// 反馈状态
const FeedbackStatus = {
  SUBMITTED: 'submitted',   // 已提交
  REVIEWING: 'reviewing',   // 审核中
  PROCESSING: 'processing', // 处理中
  RESOLVED: 'resolved',     // 已解决
  CLOSED: 'closed',         // 已关闭
  REJECTED: 'rejected'      // 已拒绝
};

const FeedbackSchema = new mongoose.Schema({
  // 基础信息
  type: {
    type: String,
    enum: Object.values(FeedbackTypes),
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },

  // 反馈人信息
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: true,
    index: true
  },
  reporter: {
    name: String,
    phone: String,
    email: String,
    isAnonymous: {
      type: Boolean,
      default: false
    }
  },

  // 问题分类
  category: String,
  subcategory: String,
  tags: [String],

  // 紧急程度
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // 状态
  status: {
    type: String,
    enum: Object.values(FeedbackStatus),
    default: 'submitted',
    index: true
  },

  // 位置信息
  location: {
    address: String,
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number]
    },
    description: String
  },

  // 附件
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    type: String,
    size: Number,
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 处理信息
  handler: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    department: String,
    assignedAt: Date
  },

  // 处理记录
  handlingLog: [{
    action: String,
    description: String,
    performedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId },
      name: String
    },
    performedAt: {
      type: Date,
      default: Date.now
    },
    attachments: [{
      filename: String,
      path: String
    }],
    nextAction: String,
    dueDate: Date
  }],

  // 处理结果
  resolution: {
    summary: String,
    details: String,
    solution: String,
    preventive: String,
    satisfaction: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  resolvedAt: Date,
  closedAt: Date,
  closeReason: String,

  // 评价
  evaluation: {
    responseTime: {
      type: Number,
      min: 1,
      max: 5
    },
    professionalism: {
      type: Number,
      min: 1,
      max: 5
    },
    effectiveness: {
      type: Number,
      min: 1,
      max: 5
    },
    overall: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String
  },

  // 关联信息
  relatedTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  relatedMeeting: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting'
  },

  // 村庄信息
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 统计信息
  readStatus: {
    type: Boolean,
    default: false
  },
  readBy: {
    userId: { type: mongoose.Schema.Types.ObjectId },
    readAt: Date
  },

  // 创建时间
  submittedAt: {
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
  timestamps: true,
  collection: 'feedbacks'
});

// 索引定义
FeedbackSchema.index({ villageId: 1, status: 1 });
FeedbackSchema.index({ residentId: 1, status: 1 });
FeedbackSchema.index({ type: 1, status: 1 });
FeedbackSchema.index({ urgency: -1, submittedAt: -1 });
FeedbackSchema.index({ handler: 1, status: 1 });

module.exports = mongoose.model('Feedback', FeedbackSchema);