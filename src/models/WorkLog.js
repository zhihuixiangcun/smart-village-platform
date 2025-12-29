/**
 * 工作日志模型
 * 村委会成员工作日志记录
 */

const mongoose = require('mongoose');

// 日志类型
const WorkLogType = {
  DAILY: 'daily',         // 日报
  WEEKLY: 'weekly',       // 周报
  MONTHLY: 'monthly',     // 月报
  PROJECT: 'project',     // 项目总结
  INCIDENT: 'incident',   // 事件报告
  OTHER: 'other'         // 其他
};

// 日志状态
const WorkLogStatus = {
  DRAFT: 'draft',         // 草稿
  SUBMITTED: 'submitted', // 已提交
  REVIEWED: 'reviewed',   // 已审核
  APPROVED: 'approved',   // 已批准
  REJECTED: 'rejected'    // 已拒绝
};

const workLogSchema = new mongoose.Schema({
  // 所属协作空间
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CollabWorkspace',
    required: true,
    index: true
  },

  // 关联的村庄
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 日志作者
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  committeeMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommitteeMember'
  },

  // 日志标题
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },

  // 日志类型
  logType: {
    type: String,
    enum: Object.values(WorkLogType),
    default: WorkLogType.DAILY
  },

  // 日志状态
  status: {
    type: String,
    enum: Object.values(WorkLogStatus),
    default: WorkLogStatus.DRAFT,
    index: true
  },

  // 日志周期
  period: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },

  // 工作内容
  content: {
    // 本周期工作总结
    summary: {
      type: String,
      maxlength: 5000
    },
    // 完成的工作事项
    completedTasks: [{
      task: { type: String, required: true },
      result: String,
      progress: { type: Number, min: 0, max: 100 }
    }],
    // 进行中的工作
    ongoingTasks: [{
      task: { type: String, required: true },
      progress: { type: Number, min: 0, max: 100 },
      nextStep: String
    }],
    // 遇到的问题
    issues: [{
      issue: { type: String, required: true },
      solution: String,
      status: { type: String, enum: ['pending', 'resolved', 'escalated'] }
    }],
    // 下期计划
    nextPlan: {
      type: String,
      maxlength: 3000
    }
  },

  // 工作统计
  statistics: {
    hoursWorked: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    tasksInProgress: { type: Number, default: 0 },
    meetingsAttended: { type: Number, default: 0 },
    villageVisits: { type: Number, default: 0 }
  },

  // 附件
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number,
    uploadedAt: { type: Date, default: Date.now }
  }],

  // 审核信息
  review: {
    required: { type: Boolean, default: false },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    comments: String,
    approved: Boolean
  },

  // 关联会议
  relatedMeetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting'
  },

  // 标签
  tags: [{ type: String, maxlength: 20 }],

  // 可见范围
  visibility: {
    type: String,
    enum: ['private', 'workspace', 'public'],
    default: 'workspace'
  }
}, {
  timestamps: true,
  collection: 'workLogs'
});

// 复合索引
workLogSchema.index({ workspaceId: 1, status: 1 });
workLogSchema.index({ authorId: 1, createdAt: -1 });
workLogSchema.index({ period: 1, authorId: 1 });

// ==================== 实例方法 ====================

workLogSchema.methods.submit = function() {
  if (this.status !== WorkLogStatus.DRAFT) {
    throw new Error('只有草稿状态的日志可以提交');
  }

  this.status = WorkLogStatus.SUBMITTED;
  return this.save();
};

workLogSchema.methods.review = function(reviewerId, comments, approved) {
  if (this.status !== WorkLogStatus.SUBMITTED && this.status !== WorkLogStatus.REVIEWED) {
    throw new Error('只有已提交的日志可以审核');
  }

  this.review.required = true;
  this.review.reviewerId = reviewerId;
  this.review.reviewedAt = new Date();
  this.review.comments = comments;
  this.review.approved = approved;

  this.status = approved ? WorkLogStatus.APPROVED : WorkLogStatus.REJECTED;

  return this.save();
};

// ==================== 静态方法 ====================

workLogSchema.statics.getWorkspaceLogs = function(workspaceId, options = {}) {
  const { status, authorId, logType, limit = 50, skip = 0 } = options;
  const query = { workspaceId };

  if (status) query.status = status;
  if (authorId) query.authorId = authorId;
  if (logType) query.logType = logType;

  return this.find(query)
    .populate('authorId', 'name avatar')
    .populate('committeeMemberId', 'position')
    .populate('review.reviewerId', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

workLogSchema.statics.getUserLogs = function(userId, options = {}) {
  const { status, logType, limit = 20, skip = 0 } = options;
  const query = { authorId: userId };

  if (status) query.status = status;
  if (logType) query.logType = logType;

  return this.find(query)
    .populate('workspaceId', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

workLogSchema.statics.getPendingReviewLogs = function(workspaceId) {
  return this.find({
    workspaceId,
    status: WorkLogStatus.SUBMITTED
  })
    .populate('authorId', 'name avatar')
    .sort({ createdAt: 1 })
    .lean();
};

const WorkLog = mongoose.model('WorkLog', workLogSchema);

module.exports = { WorkLog, WorkLogType, WorkLogStatus };
