/**
 * 任务模型
 */

const mongoose = require('mongoose');

// 任务类型
const TaskTypes = {
  PATROL: 'patrol',           // 巡查任务
  MAINTENANCE: 'maintenance', // 维护任务
  SAFETY: 'safety',          // 安全检查
  ENVIRONMENT: 'environment', // 环境卫生
  SERVICE: 'service',        // 便民服务
  EMERGENCY: 'emergency',    // 应急处理
  OTHER: 'other'            // 其他
};

// 任务状态
const TaskStatus = {
  PENDING: 'pending',         // 待处理
  IN_PROGRESS: 'in_progress', // 进行中
  COMPLETED: 'completed',     // 已完成
  CANCELLED: 'cancelled',     // 已取消
  OVERDUE: 'overdue'          // 已逾期
};

// 任务优先级
const TaskPriority = {
  LOW: 'low',       // 低
  MEDIUM: 'medium', // 中
  HIGH: 'high',     // 高
  URGENT: 'urgent'  // 紧急
};

const TaskSchema = new mongoose.Schema({
  // 基础信息
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  instructions: String,

  // 分类信息
  type: {
    type: String,
    enum: Object.values(TaskTypes),
    required: true,
    index: true
  },
  category: String,
  tags: [String],

  // 优先级和状态
  priority: {
    type: String,
    enum: Object.values(TaskPriority),
    default: 'medium',
    index: true
  },
  status: {
    type: String,
    enum: Object.values(TaskStatus),
    default: 'pending',
    index: true
  },

  // 时间安排
  scheduledDate: {
    type: Date,
    required: true,
    index: true
  },
  startTime: Date,
  dueDate: {
    type: Date,
    required: true
  },
  estimatedDuration: Number, // 预估时长（分钟）
  actualDuration: Number,      // 实际时长（分钟）

  // 执行位置
  location: {
    address: String,
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number]
    },
    area: String,
    description: String
  },

  // 责任人员
  assignedTo: [{
    residentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resident'
    },
    name: String,
    phone: String,
    role: String,
    assignedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['assigned', 'accepted', 'started', 'completed', 'rejected'],
      default: 'assigned'
    },
    rejectedReason: String
  }],
  supervisor: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String
  },

  // 任务要求
  requirements: [{
    description: String,
    type: {
      type: String,
      enum: ['equipment', 'skill', 'certification', 'other']
    },
    mandatory: {
      type: Boolean,
      default: false
    }
  }],

  // 所需资源
  resources: [{
    type: String,
    name: String,
    quantity: Number,
    specification: String,
    assigned: {
      type: Boolean,
      default: false
    }
  }],

  // 执行记录
  executionLog: [{
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
      path: String,
      type: String
    }],
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number]
    },
    status: String
  }],

  // 完成报告
  completionReport: {
    summary: String,
    results: [String],
    issues: [String],
    recommendations: [String],
    photos: [{
      filename: String,
      path: String,
      description: String,
      takenAt: Date
    }],
    signedOff: {
      by: {
        userId: { type: mongoose.Schema.Types.ObjectId },
        name: String
      },
      at: Date,
      signature: String
    }
  },

  // 评价信息
  evaluation: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    evaluator: {
      userId: { type: mongoose.Schema.Types.ObjectId },
      name: String
    },
    evaluatedAt: Date
  },

  // 任务关联
  relatedEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Emergency'
  },
  parentTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  subtasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],

  // 关联信息
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 创建和更新信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
}, {
  timestamps: true,
  collection: 'tasks'
});

// 任务调度模型
const TaskScheduleSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    index: true
  },

  // 调度信息
  scheduleType: {
    type: String,
    enum: ['single', 'recurring'],
    required: true
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
    },
    interval: Number, // 间隔数
    dayOfWeek: Number, // 星期几 (0-6)
    dayOfMonth: Number, // 月份第几天
    month: Number, // 月份 (1-12)
    endDate: Date
  },

  // 调度时间
  scheduledTime: Date,
  nextExecution: Date,

  // 调度状态
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'cancelled'],
    default: 'active'
  },

  // 执行历史
  executionHistory: [{
    executionDate: Date,
    status: String,
    notes: String
  }],

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
  collection: 'task_schedules'
});

// 索引定义
TaskSchema.index({ villageId: 1, status: 1 });
TaskSchema.index({ assignedTo: 1, status: 1 });
TaskSchema.index({ type: 1, status: 1 });
TaskSchema.index({ priority: -1, dueDate: 1 });
// scheduledDate 已有 index: true，无需重复
TaskSchema.index({ dueDate: 1 });

// taskId 已有 index: true，无需重复
TaskScheduleSchema.index({ nextExecution: 1 });
TaskScheduleSchema.index({ status: 1 });

// 虚拟字段
TaskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status === 'completed') return false;
  return new Date() > this.dueDate;
});

TaskSchema.virtual('daysUntilDue').get(function() {
  if (!this.dueDate) return null;
  const now = new Date();
  const diff = this.dueDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// 静态方法
TaskSchema.statics.createRecurringTask = async function(taskData, scheduleData) {
  // 创建任务
  const task = new this(taskData);
  await task.save();

  // 创建调度
  const schedule = new TaskScheduleSchema({
    taskId: task._id,
    ...scheduleData,
    scheduledTime: taskData.scheduledDate,
    nextExecution: taskData.scheduledDate
  });
  await schedule.save();

  return { task, schedule };
};

module.exports = {
  Task: mongoose.model('Task', TaskSchema),
  TaskSchedule: mongoose.model('TaskSchedule', TaskScheduleSchema),
  TaskTypes,
  TaskStatus,
  TaskPriority
};