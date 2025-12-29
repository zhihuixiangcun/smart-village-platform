/**
 * 任务分配模型
 * 村干部工作任务分配与跟踪
 */

const mongoose = require('mongoose');

// 任务类型
const TaskType = {
  ROUTINE: 'routine',       // 常规工作
  EMERGENCY: 'emergency',   // 紧急任务
  PROJECT: 'project',       // 项目工作
  INSPECTION: 'inspection', // 检查巡查
  OTHER: 'other'           // 其他
};

// 任务优先级
const TaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// 任务状态
const TaskStatus = {
  DRAFT: 'draft',           // 草稿
  ASSIGNED: 'assigned',     // 已分配
  IN_PROGRESS: 'in_progress', // 进行中
  REVIEW: 'review',         // 审核中
  COMPLETED: 'completed',   // 已完成
  CANCELLED: 'cancelled'    // 已取消
};

const taskAssignmentSchema = new mongoose.Schema({
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

  // 任务基本信息
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },

  description: {
    type: String,
    maxlength: 2000
  },

  // 任务类型
  taskType: {
    type: String,
    enum: Object.values(TaskType),
    default: TaskType.ROUTINE
  },

  // 优先级
  priority: {
    type: String,
    enum: Object.values(TaskPriority),
    default: TaskPriority.MEDIUM,
    index: true
  },

  // 责任人
  assignerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  assigneeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 关注人（抄送）
  watchers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // 时间管理
  deadline: {
    type: Date,
    index: true
  },

  estimatedHours: {
    type: Number,
    default: 0,
    min: 0
  },

  actualHours: {
    type: Number,
    default: 0,
    min: 0
  },

  startedAt: {
    type: Date
  },

  completedAt: {
    type: Date
  },

  // 任务状态
  status: {
    type: String,
    enum: Object.values(TaskStatus),
    default: TaskStatus.DRAFT,
    index: true
  },

  // 进度 (0-100)
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // 关联资源
  attachments: [{
    fileId: String,
    fileName: String,
    fileSize: Number,
    fileType: String,
    fileUrl: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 关联会议
  relatedMeetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting'
  },

  // 父任务（支持任务分解）
  parentTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TaskAssignment',
    index: true
  },

  // 子任务列表
  subtaskIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TaskAssignment'
  }],

  // 检查点（里程碑）
  checkpoints: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      maxlength: 500
    },
    dueDate: {
      type: Date
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date
    },
    order: {
      type: Number,
      default: 0
    }
  }],

  // 反馈记录
  feedbacks: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    attachments: [String],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 标签
  tags: [{
    type: String,
    maxlength: 20
  }],

  // 地理位置任务（如巡查路线）
  location: {
    type: {
      type: String,
      enum: ['point', 'route', 'area']
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      validate: {
        validator: function(v) {
          return v && v.length === 2;
        },
        message: '坐标必须是经纬度数组 [lng, lat]'
      }
    },
    address: String,
    radius: {
      type: Number, // 范围（米）
      min: 0
    }
  },

  // 重复设置（循环任务）
  recurrence: {
    enabled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      required: function() {
        return this.enabled;
      }
    },
    interval: {
      type: Number, // 间隔数量
      default: 1
    },
    endDate: Date,
    lastGeneratedAt: Date
  },

  // 提醒设置
  reminders: [{
    type: {
      type: String,
      enum: ['deadline', 'custom']
    },
    minutesBefore: {
      type: Number,
      default: 60
    },
    customDate: Date,
    sent: {
      type: Boolean,
      default: false
    }
  }],

  // 审核信息
  review: {
    required: {
      type: Boolean,
      default: false
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    comments: String,
    approved: Boolean
  }
}, {
  timestamps: true,
  collection: 'taskAssignments'
});

// 复合索引
taskAssignmentSchema.index({ workspaceId: 1, status: 1 });
taskAssignmentSchema.index({ workspaceId: 1, deadline: 1 });
taskAssignmentSchema.index({ assigneeId: 1, status: 1 });
taskAssignmentSchema.index({ parentTaskId: 1 });
taskAssignmentSchema.index({ villageId: 1, status: 1 });
taskAssignmentSchema.index({ priority: 1, status: 1, deadline: 1 });

// 文本搜索索引
taskAssignmentSchema.index({ title: 'text', description: 'text', tags: 'text' });

// ==================== 实例方法 ====================

// 分配任务
taskAssignmentSchema.methods.assign = function(assigneeId, assignerId) {
  this.assigneeId = assigneeId;
  this.assignerId = assignerId;
  this.status = TaskStatus.ASSIGNED;

  return this.save();
};

// 开始任务
taskAssignmentSchema.methods.start = function() {
  if (this.status !== TaskStatus.ASSIGNED) {
    throw new Error('只有已分配的任务才能开始');
  }

  this.status = TaskStatus.IN_PROGRESS;
  this.startedAt = new Date();

  return this.save();
};

// 更新进度
taskAssignmentSchema.methods.updateProgress = function(progress, userId) {
  if (progress < 0 || progress > 100) {
    throw new Error('进度必须在0-100之间');
  }

  this.progress = progress;

  // 如果进度100%，自动完成任务
  if (progress === 100) {
    this.status = TaskStatus.COMPLETED;
    this.completedAt = new Date();
  }

  // 添加进度更新反馈
  this.feedbacks.push({
    userId,
    content: `进度更新为 ${progress}%`
  });

  return this.save();
};

// 完成任务
taskAssignmentSchema.methods.complete = function(actualHours, userId) {
  if (actualHours) {
    this.actualHours = actualHours;
  }

  this.status = TaskStatus.COMPLETED;
  this.progress = 100;
  this.completedAt = new Date();

  this.feedbacks.push({
    userId,
    content: '任务已完成'
  });

  return this.save();
};

// 取消任务
taskAssignmentSchema.methods.cancel = function(reason, userId) {
  if (this.status === TaskStatus.COMPLETED) {
    throw new Error('已完成的任务不能取消');
  }

  this.status = TaskStatus.CANCELLED;

  this.feedbacks.push({
    userId,
    content: `任务已取消: ${reason || '无原因'}`
  });

  return this.save();
};

// 添加检查点
taskAssignmentSchema.methods.addCheckpoint = function(checkpoint) {
  const order = this.checkpoints.length > 0
    ? this.checkpoints[this.checkpoints.length - 1].order + 1
    : 1;

  this.checkpoints.push({
    ...checkpoint,
    order
  });

  return this.save();
};

// 更新检查点
taskAssignmentSchema.methods.updateCheckpoint = function(checkpointId, updates) {
  const checkpoint = this.checkpoints.id(checkpointId);
  if (!checkpoint) {
    throw new Error('检查点不存在');
  }

  Object.assign(checkpoint, updates);
  return this.save();
};

// 完成检查点
taskAssignmentSchema.methods.completeCheckpoint = function(checkpointId) {
  const checkpoint = this.checkpoints.id(checkpointId);
  if (!checkpoint) {
    throw new Error('检查点不存在');
  }

  checkpoint.completed = true;
  checkpoint.completedAt = new Date();

  // 计算整体进度
  const totalCheckpoints = this.checkpoints.length;
  const completedCheckpoints = this.checkpoints.filter(cp => cp.completed).length;
  const newProgress = totalCheckpoints > 0
    ? Math.round((completedCheckpoints / totalCheckpoints) * 100)
    : 0;

  this.progress = newProgress;

  return this.save();
};

// 添加反馈
taskAssignmentSchema.methods.addFeedback = function(userId, content, attachments = []) {
  this.feedbacks.push({
    userId,
    content,
    attachments
  });

  return this.save();
};

// 添加关注人
taskAssignmentSchema.methods.addWatcher = function(userId) {
  if (!this.watchers.includes(userId)) {
    this.watchers.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};

// 移除关注人
taskAssignmentSchema.methods.removeWatcher = function(userId) {
  this.watchers = this.watchers.filter(
    id => id.toString() !== userId.toString()
  );
  return this.save();
};

// 创建子任务
taskAssignmentSchema.methods.createSubtask = function(subtaskData) {
  const TaskAssignment = mongoose.model('TaskAssignment');

  const subtask = new TaskAssignment({
    ...subtaskData,
    workspaceId: this.workspaceId,
    villageId: this.villageId,
    parentTaskId: this._id,
    taskType: this.taskType,
    priority: this.priority
  });

  return subtask.save();
};

// 获取所有子任务
taskAssignmentSchema.methods.getSubtasks = function() {
  const TaskAssignment = mongoose.model('TaskAssignment');
  return TaskAssignment.find({ parentTaskId: this._id })
    .populate('assigneeId', 'name avatar')
    .populate('assignerId', 'name avatar')
    .lean();
};

// 提交审核
taskAssignmentSchema.methods.submitForReview = function(reviewerId) {
  if (this.status === TaskStatus.COMPLETED) {
    this.status = TaskStatus.REVIEW;
    this.review.required = true;
    this.review.reviewerId = reviewerId;
    return this.save();
  }
  throw new Error('只有已完成的任务才能提交审核');
};

// 审核任务
taskAssignmentSchema.methods.review = function(approved, comments, reviewerId) {
  this.review.approved = approved;
  this.review.comments = comments;
  this.review.reviewedAt = new Date();
  this.review.reviewerId = reviewerId;

  if (approved) {
    // 审核通过，保持完成状态
    this.status = TaskStatus.COMPLETED;
  } else {
    // 审核拒绝，退回到进行中
    this.status = TaskStatus.IN_PROGRESS;
  }

  return this.save();
};

// ==================== 静态方法 ====================

// 获取工作空间的任务列表
taskAssignmentSchema.statics.getWorkspaceTasks = function(workspaceId, options = {}) {
  const {
    status,
    assigneeId,
    priority,
    taskType,
    deadlineBefore,
    deadlineAfter,
    limit = 50,
    skip = 0,
    sortBy = 'createdAt',
    sortOrder = -1
  } = options;

  const query = { workspaceId };

  if (status) query.status = status;
  if (assigneeId) query.assigneeId = assigneeId;
  if (priority) query.priority = priority;
  if (taskType) query.taskType = taskType;

  if (deadlineBefore || deadlineAfter) {
    query.deadline = {};
    if (deadlineBefore) query.deadline.$lte = new Date(deadlineBefore);
    if (deadlineAfter) query.deadline.$gte = new Date(deadlineAfter);
  }

  const sort = {};
  sort[sortBy] = sortOrder;

  return this.find(query)
    .populate('assigneeId', 'name avatar')
    .populate('assignerId', 'name avatar')
    .populate('parentTaskId', 'title status')
    .populate('relatedMeetingId', 'title scheduledStart')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();
};

// 获取用户的任务列表
taskAssignmentSchema.statics.getUserTasks = function(userId, options = {}) {
  const {
    status,
    priority,
    deadlineBefore,
    limit = 20,
    skip = 0
  } = options;

  const query = {
    $or: [
      { assigneeId: userId },
      { watchers: userId }
    ]
  };

  if (status) query.status = status;
  if (priority) query.priority = priority;

  if (deadlineBefore) {
    query.deadline = { $lte: new Date(deadlineBefore) };
  }

  return this.find(query)
    .populate('workspaceId', 'name')
    .populate('assignerId', 'name avatar')
    .populate('assigneeId', 'name avatar')
    .sort({ priority: -1, deadline: 1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// 获取逾期任务
taskAssignmentSchema.statics.getOverdueTasks = function(workspaceId) {
  const now = new Date();

  return this.find({
    workspaceId,
    status: { $in: [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS] },
    deadline: { $lt: now }
  })
    .populate('assigneeId', 'name avatar')
    .populate('assignerId', 'name avatar')
    .sort({ deadline: 1 })
    .lean();
};

// 获取今日到期任务
taskAssignmentSchema.statics.getTodayDueTasks = function(workspaceId) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  return this.find({
    workspaceId,
    status: { $in: [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS] },
    deadline: { $gte: today, $lte: endOfToday }
  })
    .populate('assigneeId', 'name avatar')
    .sort({ deadline: 1 })
    .lean();
};

// 获取任务统计
taskAssignmentSchema.statics.getStatistics = function(workspaceId) {
  return this.aggregate([
    {
      $match: { workspaceId: new mongoose.Types.ObjectId(workspaceId) }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// 获取任务日历视图
taskAssignmentSchema.statics.getCalendarView = function(workspaceId, startDate, endDate) {
  return this.find({
    workspaceId,
    deadline: { $gte: new Date(startDate), $lte: new Date(endDate) },
    status: { $in: [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW] }
  })
    .populate('assigneeId', 'name avatar')
    .populate('assignerId', 'name avatar')
    .sort({ deadline: 1 })
    .lean();
};

// 搜索任务
taskAssignmentSchema.statics.searchTasks = function(workspaceId, keyword, options = {}) {
  const {
    status,
    assigneeId,
    priority,
    taskType,
    tags,
    limit = 20,
    skip = 0
  } = options;

  const query = {
    workspaceId,
    $or: [
      { title: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } },
      { tags: { $in: [new RegExp(keyword, 'i')] } }
    ]
  };

  if (status) query.status = status;
  if (assigneeId) query.assigneeId = assigneeId;
  if (priority) query.priority = priority;
  if (taskType) query.taskType = taskType;
  if (tags) query.tags = { $in: tags };

  return this.find(query)
    .populate('assigneeId', 'name avatar')
    .sort({ priority: -1, deadline: 1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

const TaskAssignment = mongoose.model('TaskAssignment', taskAssignmentSchema);

module.exports = {
  TaskAssignment,
  TaskType,
  TaskPriority,
  TaskStatus
};
