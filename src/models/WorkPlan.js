/**
 * 村干部工作规划模型
 * 基于四象限法则的每日工作规划、执行跟踪、汇总系统
 */

const mongoose = require('mongoose');

// 四象限类型
const QuadrantType = {
  Q1: 'Q1', // 重要且紧急 - 立即处理
  Q2: 'Q2', // 重要不紧急 - 规划安排
  Q3: 'Q3', // 紧急不重要 - 委托他人
  Q4: 'Q4'  // 不重要不紧急 - 减少或取消
};

// 规划状态
const PlanStatus = {
  DRAFT: 'draft',           // 草稿
  CONFIRMED: 'confirmed',   // 已确认
  IN_PROGRESS: 'in_progress', // 执行中
  COMPLETED: 'completed',   // 已完成
  CANCELLED: 'cancelled'    // 已取消
};

// 任务状态
const TaskStatus = {
  NOT_STARTED: 'not_started', // 未开始
  IN_PROGRESS: 'in_progress', // 进行中
  COMPLETED: 'completed',     // 已完成
  CANCELLED: 'cancelled',     // 已取消
  POSTPONED: 'postponed'      // 已延期
};

// 执行记录子schema
const executionNoteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  progress: {
    type: Number,
    min: 0,
    max: 100
  },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileSize: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// 任务子schema
const dailyTaskSchema = new mongoose.Schema({
  // 任务基本信息
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 1000
  },

  // 四象限分类
  quadrant: {
    type: String,
    enum: Object.values(QuadrantType),
    required: true
  },

  // 重要性评分 (1-5)
  importance: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },

  // 紧急性评分 (1-5)
  urgency: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },

  // 时间预估（分钟）
  estimatedTime: {
    type: Number,
    min: 0,
    default: 30
  },

  // 实际耗时（分钟）
  actualTime: {
    type: Number,
    min: 0,
    default: 0
  },

  // 任务状态
  status: {
    type: String,
    enum: Object.values(TaskStatus),
    default: TaskStatus.NOT_STARTED
  },

  // 执行优先级 (1-10, 同象限内排序)
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },

  // 时间记录
  startTime: Date,
  endTime: Date,

  // 完成进度 (0-100)
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  // 执行记录
  executionNotes: [executionNoteSchema],

  // 完成总结
  completionSummary: {
    type: String,
    maxlength: 2000
  },

  // 关联村民
  relatedResidents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident'
  }],

  // 附件列表
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 任务标签
  tags: [{
    type: String,
    maxlength: 20
  }],

  // 是否私密任务
  isPrivate: {
    type: Boolean,
    default: false
  },

  // 创建信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },

  // 更新信息
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true, timestamps: false });

// 工作汇总子schema
const dailySummarySchema = new mongoose.Schema({
  // 已完成任务
  completedTasks: {
    Q1: [{ type: mongoose.Schema.Types.ObjectId }],
    Q2: [{ type: mongoose.Schema.Types.ObjectId }],
    Q3: [{ type: mongoose.Schema.Types.ObjectId }],
    Q4: [{ type: mongoose.Schema.Types.ObjectId }]
  },

  // 未完成任务
  incompleteTasks: [{
    taskId: {
      type: mongoose.Schema.Types.ObjectId
    },
    reason: String,
    plannedTime: Date
  }],

  // 今日工作感悟
  insights: [{
    type: String,
    maxlength: 500
  }],

  // 工作数据统计
  statistics: {
    totalTasks: Number,
    completedTasks: Number,
    completionRate: Number,
    timeByQuadrant: {
      Q1: Number,
      Q2: Number,
      Q3: Number,
      Q4: Number
    },
    totalTime: Number
  },

  // AI优化建议
  aiSuggestions: [{
    type: String,
    maxlength: 500
  }],

  // 汇总方式（auto_generated/manual_edit/voice_input）
  summaryType: {
    type: String,
    enum: ['auto_generated', 'manual_edit', 'voice_input'],
    default: 'auto_generated'
  },

  // 汇总时间
  summarizedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// 主schema
const workPlanSchema = new mongoose.Schema({
  // 所属村庄
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 村干部用户
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  userName: {
    type: String,
    required: true
  },

  // 规划日期
  planDate: {
    type: Date,
    required: true,
    index: true
  },

  // 规划状态
  planStatus: {
    type: String,
    enum: Object.values(PlanStatus),
    default: PlanStatus.DRAFT
  },

  // 任务列表（按象限组织）
  tasks: {
    Q1: [dailyTaskSchema], // 重要且紧急
    Q2: [dailyTaskSchema], // 重要不紧急
    Q3: [dailyTaskSchema], // 紧急不重要
    Q4: [dailyTaskSchema]  // 不重要不紧急
  },

  // 当日工作汇总
  dailySummary: dailySummarySchema,

  // 次日工作规划
  nextDayPlan: {
    tasks: [{
      title: String,
      description: String,
      quadrant: String,
      estimatedTime: Number
    }],
    notes: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  },

  // 工作统计数据
  statistics: {
    // 任务统计
    totalTasks: {
      type: Number,
      default: 0
    },
    completedTasks: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0
    },

    // 象限分布
    quadrantDistribution: {
      Q1: { type: Number, default: 0 },
      Q2: { type: Number, default: 0 },
      Q3: { type: Number, default: 0 },
      Q4: { type: Number, default: 0 }
    },

    // 时间统计
    totalEstimatedTime: {
      type: Number,
      default: 0
    },
    totalActualTime: {
      type: Number,
      default: 0
    },

    // 象限时间分布
    timeByQuadrant: {
      Q1: { type: Number, default: 0 },
      Q2: { type: Number, default: 0 },
      Q3: { type: Number, default: 0 },
      Q4: { type: Number, default: 0 }
    }
  },

  // 工作开始时间
  workStartTime: Date,

  // 工作结束时间
  workEndTime: Date,

  // 备注
  notes: {
    type: String,
    maxlength: 1000
  },

  // AI分析结果
  aiAnalysis: {
    workload: {
      type: String,
      enum: ['light', 'moderate', 'heavy', 'overloaded']
    },
    suggestions: [String],
    riskAlerts: [String]
  }
}, {
  timestamps: true,
  collection: 'workPlans'
});

// ==================== 复合索引 ====================
workPlanSchema.index({ villageId: 1, userId: 1, planDate: 1 }, { unique: true });
workPlanSchema.index({ userId: 1, planDate: -1 });
workPlanSchema.index({ villageId: 1, planDate: -1 });
workPlanSchema.index({ planStatus: 1, planDate: -1 });

// 文本搜索索引
workPlanSchema.index({ 'tasks.Q1.title': 'text', 'tasks.Q2.title': 'text', 'tasks.Q3.title': 'text', 'tasks.Q4.title': 'text' });

// ==================== 实例方法 ====================

// 确认工作规划
workPlanSchema.methods.confirm = function() {
  if (this.planStatus !== PlanStatus.DRAFT) {
    throw new Error('只有草稿状态的工作规划可以确认');
  }

  this.planStatus = PlanStatus.CONFIRMED;

  // 计算统计数据
  this.recalculateStatistics();

  return this.save();
};

// 开始执行工作规划
workPlanSchema.methods.start = function() {
  if (this.planStatus !== PlanStatus.CONFIRMED) {
    throw new Error('只有已确认的工作规划可以开始执行');
  }

  this.planStatus = PlanStatus.IN_PROGRESS;
  this.workStartTime = new Date();

  return this.save();
};

// 完成工作规划
workPlanSchema.methods.complete = function(summaryData) {
  if (this.planStatus !== PlanStatus.IN_PROGRESS) {
    throw new Error('只有执行中的工作规划可以完成');
  }

  this.planStatus = PlanStatus.COMPLETED;
  this.workEndTime = new Date();

  // 更新工作汇总
  if (summaryData) {
    this.dailySummary = {
      ...this.dailySummary,
      ...summaryData,
      summarizedAt: new Date()
    };
  }

  // 重新计算统计数据
  this.recalculateStatistics();

  return this.save();
};

// 取消工作规划
workPlanSchema.methods.cancel = function(reason) {
  if (this.planStatus === PlanStatus.COMPLETED) {
    throw new Error('已完成的工作规划不能取消');
  }

  this.planStatus = PlanStatus.CANCELLED;
  this.notes = reason || '工作规划已取消';

  return this.save();
};

// 添加任务
workPlanSchema.methods.addTask = function(taskData) {
  const quadrant = taskData.quadrant;

  if (!this.tasks[quadrant]) {
    throw new Error('无效的象限分类');
  }

  const task = {
    ...taskData,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  this.tasks[quadrant].push(task);
  this.recalculateStatistics();

  return this.save();
};

// 更新任务
workPlanSchema.methods.updateTask = function(quadrant, taskId, updates) {
  const quadrantTasks = this.tasks[quadrant];

  if (!quadrantTasks) {
    throw new Error('无效的象限分类');
  }

  const task = quadrantTasks.id(taskId);

  if (!task) {
    throw new Error('任务不存在');
  }

  Object.assign(task, {
    ...updates,
    updatedAt: new Date()
  });

  this.recalculateStatistics();

  return this.save();
};

// 开始任务
workPlanSchema.methods.startTask = function(quadrant, taskId) {
  const task = this.tasks[quadrant].id(taskId);

  if (!task) {
    throw new Error('任务不存在');
  }

  if (task.status !== TaskStatus.NOT_STARTED) {
    throw new Error('任务已开始或已完成');
  }

  task.status = TaskStatus.IN_PROGRESS;
  task.startTime = new Date();

  // 如果工作规划未开始，自动开始
  if (this.planStatus === PlanStatus.CONFIRMED) {
    this.planStatus = PlanStatus.IN_PROGRESS;
    this.workStartTime = new Date();
  }

  return this.save();
};

// 更新任务进度
workPlanSchema.methods.updateTaskProgress = function(quadrant, taskId, progress, note, userId, attachments = []) {
  const task = this.tasks[quadrant].id(taskId);

  if (!task) {
    throw new Error('任务不存在');
  }

  if (progress < 0 || progress > 100) {
    throw new Error('进度必须在0-100之间');
  }

  task.progress = progress;

  // 添加执行记录
  if (note) {
    task.executionNotes.push({
      userId,
      content: note,
      progress,
      attachments,
      createdAt: new Date()
    });
  }

  // 如果进度100%，自动完成任务
  if (progress === 100) {
    task.status = TaskStatus.COMPLETED;
    task.endTime = new Date();
    task.actualTime = task.startTime
      ? Math.round((new Date() - task.startTime) / 60000)
      : task.estimatedTime;
  }

  task.updatedAt = new Date();
  this.recalculateStatistics();

  return this.save();
};

// 完成任务
workPlanSchema.methods.completeTask = function(quadrant, taskId, summary, userId) {
  const task = this.tasks[quadrant].id(taskId);

  if (!task) {
    throw new Error('任务不存在');
  }

  task.status = TaskStatus.COMPLETED;
  task.progress = 100;
  task.endTime = new Date();
  task.completionSummary = summary;

  // 计算实际耗时
  if (task.startTime) {
    task.actualTime = Math.round((task.endTime - task.startTime) / 60000);
  }

  // 添加完成记录
  task.executionNotes.push({
    userId,
    content: '任务已完成',
    progress: 100,
    createdAt: new Date()
  });

  task.updatedAt = new Date();
  this.recalculateStatistics();

  return this.save();
};

// 延期任务
workPlanSchema.methods.postponeTask = function(quadrant, taskId, reason, plannedTime) {
  const task = this.tasks[quadrant].id(taskId);

  if (!task) {
    throw new Error('任务不存在');
  }

  task.status = TaskStatus.POSTPONED;

  // 添加到未完成任务列表
  if (!this.dailySummary) {
    this.dailySummary = {};
  }

  if (!this.dailySummary.incompleteTasks) {
    this.dailySummary.incompleteTasks = [];
  }

  this.dailySummary.incompleteTasks.push({
    taskId: task._id,
    reason: reason || '任务已延期',
    plannedTime: plannedTime || new Date()
  });

  task.updatedAt = new Date();
  this.recalculateStatistics();

  return this.save();
};

// 删除任务
workPlanSchema.methods.deleteTask = function(quadrant, taskId) {
  const quadrantTasks = this.tasks[quadrant];

  if (!quadrantTasks) {
    throw new Error('无效的象限分类');
  }

  const task = quadrantTasks.id(taskId);

  if (!task) {
    throw new Error('任务不存在');
  }

  if (task.status === TaskStatus.IN_PROGRESS) {
    throw new Error('进行中的任务不能删除');
  }

  quadrantTasks.pull(taskId);
  this.recalculateStatistics();

  return this.save();
};

// 计算统计数据
workPlanSchema.methods.recalculateStatistics = function() {
  const allTasks = [
    ...this.tasks.Q1,
    ...this.tasks.Q2,
    ...this.tasks.Q3,
    ...this.tasks.Q4
  ];

  // 任务统计
  this.statistics.totalTasks = allTasks.length;
  this.statistics.completedTasks = allTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
  this.statistics.completionRate = this.statistics.totalTasks > 0
    ? Math.round((this.statistics.completedTasks / this.statistics.totalTasks) * 100)
    : 0;

  // 象限分布
  this.statistics.quadrantDistribution = {
    Q1: this.tasks.Q1.length,
    Q2: this.tasks.Q2.length,
    Q3: this.tasks.Q3.length,
    Q4: this.tasks.Q4.length
  };

  // 时间统计
  this.statistics.totalEstimatedTime = allTasks.reduce((sum, t) => sum + (t.estimatedTime || 0), 0);
  this.statistics.totalActualTime = allTasks.reduce((sum, t) => sum + (t.actualTime || 0), 0);

  // 象限时间分布
  const timeByQuadrant = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };

  for (const quadrant of ['Q1', 'Q2', 'Q3', 'Q4']) {
    timeByQuadrant[quadrant] = this.tasks[quadrant].reduce((sum, t) => {
      return sum + (t.actualTime || t.estimatedTime || 0);
    }, 0);
  }

  this.statistics.timeByQuadrant = timeByQuadrant;
};

// 生成工作汇总
workPlanSchema.methods.generateDailySummary = function() {
  const allTasks = {
    Q1: this.tasks.Q1 || [],
    Q2: this.tasks.Q2 || [],
    Q3: this.tasks.Q3 || [],
    Q4: this.tasks.Q4 || []
  };

  // 按象限分类已完成和未完成任务
  const completedTasks = { Q1: [], Q2: [], Q3: [], Q4: [] };
  const incompleteTasks = [];

  for (const quadrant of ['Q1', 'Q2', 'Q3', 'Q4']) {
    for (const task of allTasks[quadrant]) {
      if (task.status === TaskStatus.COMPLETED) {
        completedTasks[quadrant].push(task._id);
      } else if (task.status !== TaskStatus.CANCELLED) {
        incompleteTasks.push({
          taskId: task._id,
          title: task.title,
          quadrant: task.quadrant,
          reason: '任务未完成',
          plannedTime: null
        });
      }
    }
  }

  // 计算统计
  const totalTasks = Object.values(allTasks).flat().length;
  const completedCount = Object.values(completedTasks).flat().length;
  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  // 计算时间分布
  const timeByQuadrant = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };

  for (const quadrant of ['Q1', 'Q2', 'Q3', 'Q4']) {
    timeByQuadrant[quadrant] = allTasks[quadrant].reduce((sum, t) => {
      return sum + (t.actualTime || 0);
    }, 0);
  }

  const totalTime = Object.values(timeByQuadrant).reduce((sum, t) => sum + t, 0);

  this.dailySummary = {
    completedTasks,
    incompleteTasks,
    statistics: {
      totalTasks,
      completedTasks: completedCount,
      completionRate,
      timeByQuadrant,
      totalTime
    },
    summaryType: 'auto_generated',
    summarizedAt: new Date()
  };

  // 生成AI建议
  this.generateAISuggestions();

  return this.save();
};

// 生成AI建议
workPlanSchema.methods.generateAISuggestions = function() {
  const suggestions = [];
  const riskAlerts = [];

  // 分析工作量
  const totalTasks = this.statistics.totalTasks;
  const q1Tasks = this.tasks.Q1.length;

  if (totalTasks > 15) {
    this.aiAnalysis.workload = 'overloaded';
    riskAlerts.push('今日任务数量过多，建议适当减少或延期部分任务');
  } else if (totalTasks > 10) {
    this.aiAnalysis.workload = 'heavy';
    suggestions.push('今日任务较重，注意合理安排时间');
  } else if (totalTasks > 5) {
    this.aiAnalysis.workload = 'moderate';
  } else {
    this.aiAnalysis.workload = 'light';
    suggestions.push('今日任务较轻，可以安排一些重要不紧急的长期工作');
  }

  // 分析第一象限任务
  if (q1Tasks > 3) {
    riskAlerts.push('重要且紧急任务过多，建议委托或寻求协助');
  }

  // 分析第二象限任务占比
  const q2Tasks = this.tasks.Q2.length;
  const q2Ratio = totalTasks > 0 ? q2Tasks / totalTasks : 0;

  if (q2Ratio < 0.3) {
    suggestions.push('重要不紧急的任务占比较少，建议增加长期规划性工作');
  }

  // 分析时间分配
  const q1Time = this.statistics.timeByQuadrant.Q1;
  const totalTime = this.statistics.totalActualTime || this.statistics.totalEstimatedTime;

  if (totalTime > 0 && q1Time / totalTime > 0.6) {
    suggestions.push('第一象限任务耗时过多，建议优化应急响应机制');
  }

  this.aiAnalysis.suggestions = suggestions;
  this.aiAnalysis.riskAlerts = riskAlerts;
};

// 创建次日规划
workPlanSchema.methods.createNextDayPlan = function(nextDayTasks, notes) {
  this.nextDayPlan = {
    tasks: nextDayTasks,
    notes,
    createdAt: new Date()
  };

  return this.save();
};

// ==================== 静态方法 ====================

// 获取用户今日工作规划
workPlanSchema.statics.getTodayPlan = function(userId, villageId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.findOne({
    userId,
    villageId,
    planDate: { $gte: today, $lt: tomorrow }
  }).lean();
};

// 获取用户工作规划历史
workPlanSchema.statics.getUserHistory = function(userId, options = {}) {
  const {
    villageId,
    startDate,
    endDate,
    status,
    limit = 30,
    skip = 0
  } = options;

  const query = { userId };

  if (villageId) query.villageId = villageId;
  if (status) query.planStatus = status;

  if (startDate || endDate) {
    query.planDate = {};
    if (startDate) query.planDate.$gte = new Date(startDate);
    if (endDate) query.planDate.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ planDate: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// 获取工作统计数据
workPlanSchema.statics.getStatistics = function(userId, options = {}) {
  const {
    villageId,
    startDate,
    endDate
  } = options;

  const matchQuery = { userId };

  if (villageId) matchQuery.villageId = new mongoose.Types.ObjectId(villageId);

  if (startDate || endDate) {
    matchQuery.planDate = {};
    if (startDate) matchQuery.planDate.$gte = new Date(startDate);
    if (endDate) matchQuery.planDate.$lte = new Date(endDate);
  }

  return this.aggregate([
    {
      $match: matchQuery
    },
    {
      $group: {
        _id: '$userId',
        totalPlans: { $sum: 1 },
        completedPlans: {
          $sum: { $cond: [{ $eq: ['$planStatus', 'completed'] }, 1, 0] }
        },
        totalTasks: { $sum: '$statistics.totalTasks' },
        completedTasks: { $sum: '$statistics.completedTasks' },
        totalEstimatedTime: { $sum: '$statistics.totalEstimatedTime' },
        totalActualTime: { $sum: '$statistics.totalActualTime' },
        quadrantDistribution: {
          Q1: { $avg: '$statistics.quadrantDistribution.Q1' },
          Q2: { $avg: '$statistics.quadrantDistribution.Q2' },
          Q3: { $avg: '$statistics.quadrantDistribution.Q3' },
          Q4: { $avg: '$statistics.quadrantDistribution.Q4' }
        },
        timeByQuadrant: {
          Q1: { $sum: '$statistics.timeByQuadrant.Q1' },
          Q2: { $sum: '$statistics.timeByQuadrant.Q2' },
          Q3: { $sum: '$statistics.timeByQuadrant.Q3' },
          Q4: { $sum: '$statistics.timeByQuadrant.Q4' }
        }
      }
    },
    {
      $project: {
        _id: 0,
        userId: '$_id',
        totalPlans: 1,
        completedPlans: 1,
        planCompletionRate: {
          $multiply: [
            { $divide: ['$completedPlans', '$totalPlans'] },
            100
          ]
        },
        totalTasks: 1,
        completedTasks: 1,
        taskCompletionRate: {
          $multiply: [
            { $divide: ['$completedTasks', '$totalTasks'] },
            100
          ]
        },
        totalEstimatedTime: 1,
        totalActualTime: 1,
        quadrantDistribution: 1,
        timeByQuadrant: 1
      }
    }
  ]);
};

// 获取团队工作统计（村支书视角）
workPlanSchema.statics.getTeamStatistics = function(villageId, options = {}) {
  const {
    startDate,
    endDate
  } = options;

  const matchQuery = { villageId: new mongoose.Types.ObjectId(villageId) };

  if (startDate || endDate) {
    matchQuery.planDate = {};
    if (startDate) matchQuery.planDate.$gte = new Date(startDate);
    if (endDate) matchQuery.planDate.$lte = new Date(endDate);
  }

  return this.aggregate([
    {
      $match: matchQuery
    },
    {
      $group: {
        _id: '$userId',
        userName: { $first: '$userName' },
        totalPlans: { $sum: 1 },
        completedPlans: {
          $sum: { $cond: [{ $eq: ['$planStatus', 'completed'] }, 1, 0] }
        },
        totalTasks: { $sum: '$statistics.totalTasks' },
        completedTasks: { $sum: '$statistics.completedTasks' },
        totalActualTime: { $sum: '$statistics.totalActualTime' },
        quadrantDistribution: {
          Q1: { $avg: '$statistics.quadrantDistribution.Q1' },
          Q2: { $avg: '$statistics.quadrantDistribution.Q2' },
          Q3: { $avg: '$statistics.quadrantDistribution.Q3' },
          Q4: { $avg: '$statistics.quadrantDistribution.Q4' }
        }
      }
    },
    {
      $sort: { completedTasks: -1 }
    }
  ]);
};

// 获取月度报告
workPlanSchema.statics.getMonthlyReport = function(userId, year, month, villageId) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const matchQuery = {
    userId: new mongoose.Types.ObjectId(userId),
    planDate: { $gte: startDate, $lte: endDate }
  };

  if (villageId) {
    matchQuery.villageId = new mongoose.Types.ObjectId(villageId);
  }

  return this.aggregate([
    {
      $match: matchQuery
    },
    {
      $group: {
        _id: {
          year: { $year: '$planDate' },
          week: { $week: '$planDate' }
        },
        plans: { $push: '$$ROOT' },
        totalTasks: { $sum: '$statistics.totalTasks' },
        completedTasks: { $sum: '$statistics.completedTasks' },
        totalActualTime: { $sum: '$statistics.totalActualTime' },
        quadrantDistribution: {
          Q1: { $sum: '$statistics.quadrantDistribution.Q1' },
          Q2: { $sum: '$statistics.quadrantDistribution.Q2' },
          Q3: { $sum: '$statistics.quadrantDistribution.Q3' },
          Q4: { $sum: '$statistics.quadrantDistribution.Q4' }
        }
      }
    },
    {
      $sort: { '_id.week': 1 }
    }
  ]);
};

const WorkPlan = mongoose.model('WorkPlan', workPlanSchema);

module.exports = {
  WorkPlan,
  QuadrantType,
  PlanStatus,
  TaskStatus
};
