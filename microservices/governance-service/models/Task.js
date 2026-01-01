/**
 * 任务模型
 * 用于管理村务任务调度、工作安排、网格员任务等
 */

const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  // 基本信息
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  type: {
    type: String,
    required: true,
    enum: [
      '安全生产检查',
      '疫情防控',
      '环境整治',
      '民生服务',
      '政策宣传',
      '数据收集',
      '应急响应',
      '设施维护',
      '财务管理',
      '项目监督',
      '其他'
    ],
    default: '民生服务'
  },

  // 任务分类
  category: {
    type: String,
    required: true,
    enum: ['日常工作', '专项任务', '紧急任务', '临时任务', '长期任务'],
    default: '日常工作'
  },
  subtype: {
    type: String,
    maxlength: 100
  },

  // 优先级和紧急程度
  priority: {
    type: String,
    required: true,
    enum: ['低', '中', '高', '紧急'],
    default: '中'
  },
  urgency: {
    type: String,
    enum: ['不紧急', '一般', '较紧急', '非常紧急'],
    default: '不紧急'
  },

  // 时间安排
  scheduledTime: {
    type: Date,
    required: true
  },
  deadline: {
    type: Date,
    required: true
  },
  estimatedDuration: {
    type: Number, // 分钟
    required: true,
    default: 60
  },
  actualStartTime: Date,
  actualEndTime: Date,

  // 任务创建者
  creator: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    },
    name: {
      type: String,
      required: true
    },
    position: {
      type: String,
      required: true
    },
    department: String,
    contact: {
      phone: String,
      email: String
    }
  },

  // 执行人员
  assignees: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    },
    name: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['主要负责人', '协作人员', '监督人员', '报告人员'],
      default: '协作人员'
    },
    department: String,
    contact: {
      phone: String,
      email: String
    },
    workload: {
      type: Number,
      default: 100 // 百分比
    },
    skills: [String],
    assignedAt: {
      type: Date,
      default: Date.now
    }
  }],
  backupAssignees: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    reason: String
  }],

  // 任务位置
  locations: [{
    type: {
      type: String,
      enum: ['村委会', '自然村', '具体地址', '线上'],
      required: true
    },
    name: {
      type: String,
      required: true
    },
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    radius: Number, // 作业半径（米）
    description: String,
    required: {
      type: Boolean,
      default: true
    }
  }],

  // 任务内容和要求
  requirements: {
    objectives: [String],
    deliverables: [{
      name: String,
      type: {
        type: String,
        enum: ['报告', '照片', '视频', '文档', '数据', '其他'],
        required: true
      },
      format: String,
      quantity: Number,
      description: String,
      required: {
        type: Boolean,
        default: true
      }
    }],
    standards: [String],
    constraints: [String],
    risks: [{
      risk: String,
      probability: {
        type: String,
        enum: ['低', '中', '高'],
        default: '中'
      },
      impact: {
        type: String,
        enum: ['低', '中', '高'],
        default: '中'
      },
      mitigation: String
    }]
  },

  // 资源需求
  resources: {
    personnel: [{
      role: String,
      number: Number,
      skills: [String]
    }],
    equipment: [{
      name: String,
      type: {
        type: String,
        enum: ['检测设备', '安全装备', '通讯设备', '交通工具', '办公设备', '其他']
      },
      quantity: Number,
      specifications: String,
      source: String // 来源
    }],
    materials: [{
      name: String,
      quantity: Number,
      unit: String,
      specifications: String
    }],
    budget: {
      total: Number,
      breakdown: [{
        category: String,
        amount: Number,
        description: String
      }]
    }
  },

  // 工作流程
  workflow: [{
    step: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    description: String,
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    estimatedTime: Number, // 分钟
    dependencies: [Number], // 依赖的前置步骤
    deliverables: [String],
    status: {
      type: String,
      enum: ['未开始', '进行中', '已完成', '已跳过'],
      default: '未开始'
    },
    startTime: Date,
    endTime: Date,
    notes: String
  }],

  // 任务状态
  status: {
    type: String,
    required: true,
    enum: ['待分配', '已分配', '进行中', '暂停', '已完成', '已取消', '已超时'],
    default: '待分配'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  // 检查点
  checkpoints: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    scheduledTime: Date,
    completedTime: Date,
    status: {
      type: String,
      enum: ['待完成', '已完成', '已跳过'],
      default: '待完成'
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String,
    attachments: [{
      name: String,
      url: String,
      type: String
    }]
  }],

  // 任务日志
  logs: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    action: {
      type: String,
      enum: ['创建', '分配', '开始', '更新', '暂停', '完成', '取消', '备注'],
      required: true
    },
    description: {
      type: String,
      required: true
    },
    attachments: [{
      name: String,
      url: String,
      type: String
    }],
    location: {
      coordinates: {
        lat: Number,
        lng: Number
      },
      address: String
    },
    metadata: mongoose.Schema.Types.Mixed
  }],

  // 附件和资料
  attachments: [{
    type: {
      type: String,
      enum: ['工作方案', '检查表', '照片', '视频', '音频', '文档', '其他'],
      required: true
    },
    name: String,
    description: String,
    url: String,
    size: Number,
    mimeType: String,
    uploader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadTime: {
      type: Date,
      default: Date.now
    },
    category: {
      type: String,
      enum: ['输入资料', '过程记录', '成果输出', '其他'],
      default: '其他'
    }
  }],

  // 任务结果
  result: {
    summary: String,
    completion: {
      type: String,
      enum: ['全部完成', '部分完成', '未完成'],
      required: true
    },
    quality: {
      type: String,
      enum: ['优秀', '良好', '合格', '需改进'],
      required: true
    },
    deliverables: [{
      name: String,
      url: String,
      type: String,
      completed: {
        type: Boolean,
        default: false
      },
      completedAt: Date,
      quality: String
    }],
    metrics: [{
      name: String,
      value: Number,
      unit: String,
      target: Number,
      achieved: Boolean
    }],
    issues: [{
      issue: String,
      severity: {
        type: String,
        enum: ['低', '中', '高', '紧急'],
        default: '中'
      },
      resolution: String,
      resolvedAt: Date
    }],
    lessons: [String],
    recommendations: [String]
  },

  // 评价和反馈
  evaluation: {
    self: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      submittedAt: Date
    },
    supervisor: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      submittedAt: Date
    },
    peer: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      submittedAt: Date
    }]
  },

  // 网格管理
  gridManagement: {
    gridId: String,
    gridName: String,
    gridOfficer: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      name: String,
      contact: String
    },
    area: {
      type: String,
      enum: ['全村', '自然村', '小组', '片区'],
      default: '全村'
    },
    coverage: String,
    specialNotes: String
  },

  // 重复任务设置
  recurrence: {
    enabled: {
      type: Boolean,
      default: false
    },
    pattern: {
      type: String,
      enum: ['每日', '每周', '每月', '每季度', '每年', '自定义'],
      default: '每周'
    },
    interval: {
      type: Number,
      default: 1
    },
    daysOfWeek: [Number], // 0-6
    dayOfMonth: Number,
    endDate: Date,
    maxOccurrences: Number,
    nextCreation: Date
  },

  // 通知设置
  notifications: {
    assignees: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: [{
        type: String,
        enum: ['系统通知', '短信', '电话', '微信', '邮件']
      }],
      beforeStart: Number // 提前多少分钟通知
    },
    creator: {
      enabled: {
        type: Boolean,
        default: true
      },
      events: [{
        type: String,
        enum: ['任务开始', '任务完成', '任务延期', '任务取消', '检查点到达'],
        enabled: {
          type: Boolean,
          default: true
        }
      }]
    },
    deadline: {
      reminder1: {
        enabled: {
          type: Boolean,
          default: true
        },
        time: Number // 截止前多少分钟
      },
      reminder2: {
        enabled: {
          type: Boolean,
          default: true
        },
        time: Number
      }
    }
  },

  // 标签和关键词
  tags: [String],
  keywords: [String],

  // 审批流程
  approvalProcess: [{
    approverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approverName: String,
    action: {
      type: String,
      enum: ['提交', '审核', '批准', '驳回', '撤回']
    },
    comment: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // 成本追踪
  costTracking: {
    budget: Number,
    actualCost: Number,
    breakdown: [{
      category: String,
      budgeted: Number,
      actual: Number,
      description: String,
      receipts: [{
        url: String,
        amount: Number,
        date: Date,
        description: String
      }]
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
taskSchema.index({ status: 1, priority: -1, deadline: 1 });
taskSchema.index({ 'assignees.userId': 1, status: 1 });
taskSchema.index({ 'creator.userId': 1, createdAt: -1 });
taskSchema.index({ scheduledTime: 1, deadline: 1 });
taskSchema.index({ type: 1, status: 1 });
taskSchema.index({ 'gridManagement.gridId': 1 });
taskSchema.index({ tags: 1 });

// 虚拟字段
taskSchema.virtual('isOverdue').get(function() {
  return this.deadline < new Date() && !['已完成', '已取消'].includes(this.status);
});

taskSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  if (this.deadline <= now) return 0;
  return Math.round((this.deadline - now) / (1000 * 60 * 60 * 24)); // 天数
});

taskSchema.virtual('actualDuration').get(function() {
  if (this.actualStartTime && this.actualEndTime) {
    return Math.round((this.actualEndTime - this.actualStartTime) / (1000 * 60)); // 分钟
  }
  return null;
});

taskSchema.virtual('efficiency').get(function() {
  if (this.actualDuration && this.estimatedDuration) {
    return (this.estimatedDuration / this.actualDuration) * 100;
  }
  return null;
});

// 中间件
taskSchema.pre('save', function(next) {
  // 自动更新进度
  if (this.status === '已完成') {
    this.progress = 100;
    this.actualEndTime = this.actualEndTime || new Date();
  } else if (this.status === '进行中' && !this.actualStartTime) {
    this.actualStartTime = new Date();
  }

  // 检查是否超时
  if (this.isOverdue && this.status === '进行中') {
    this.status = '已超时';
  }

  // 生成下次重复任务时间
  if (this.recurrence.enabled && !this.recurrence.nextCreation) {
    this.calculateNextCreation();
  }

  next();
});

// 静态方法
taskSchema.statics.findOverdueTasks = function() {
  const now = new Date();
  return this.find({
    deadline: { $lt: now },
    status: { $in: ['进行中', '暂停'] }
  }).sort({ deadline: 1 });
};

taskSchema.statics.findTodayTasks = function(userId) {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const query = {
    scheduledTime: { $gte: startOfDay, $lt: endOfDay },
    status: { $in: ['已分配', '进行中'] }
  };

  if (userId) {
    query['assignees.userId'] = userId;
  }

  return this.find(query).sort({ priority: -1, scheduledTime: 1 });
};

taskSchema.statics.findUpcomingTasks = function(userId, days = 7) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const query = {
    scheduledTime: { $gte: now, $lte: futureDate },
    status: { $in: ['已分配', '进行中'] }
  };

  if (userId) {
    query['assignees.userId'] = userId;
  }

  return this.find(query).sort({ scheduledTime: 1 });
};

// 实例方法
taskSchema.methods.addLog = function(userId, userName, action, description, attachments = []) {
  this.logs.push({
    userId,
    userName,
    action,
    description,
    attachments,
    timestamp: new Date()
  });
  return this.save();
};

taskSchema.methods.updateProgress = function(progress, userId, note = '') {
  this.progress = Math.min(100, Math.max(0, progress));

  if (progress >= 100) {
    this.status = '已完成';
    this.actualEndTime = new Date();
  } else if (progress > 0 && this.status === '已分配') {
    this.status = '进行中';
    this.actualStartTime = this.actualStartTime || new Date();
  }

  return this.addLog(userId, '', '更新', `进度更新至 ${progress}%。${note}`);
};

taskSchema.methods.completeCheckpoint = function(checkpointId, userId, notes = '') {
  const checkpoint = this.checkpoints.id(checkpointId);
  if (checkpoint) {
    checkpoint.status = '已完成';
    checkpoint.completedTime = new Date();
    checkpoint.reporter = userId;
    checkpoint.notes = notes;

    // 更新整体进度
    const completedCheckpoints = this.checkpoints.filter(cp => cp.status === '已完成').length;
    this.progress = (completedCheckpoints / this.checkpoints.length) * 100;
  }

  return this.save();
};

taskSchema.methods.assignTo = function(assignees, userId) {
  this.assignees = assignees;
  this.status = '已分配';

  return this.addLog(userId, '', '分配', `任务分配给 ${assignees.map(a => a.name).join(', ')}`);
};

taskSchema.methods.calculateNextCreation = function() {
  if (!this.recurrence.enabled) return;

  const nextDate = new Date(this.scheduledTime);
  const pattern = this.recurrence.pattern;

  switch (pattern) {
    case '每日':
      nextDate.setDate(nextDate.getDate() + this.recurrence.interval);
      break;
    case '每周':
      nextDate.setDate(nextDate.getDate() + (7 * this.recurrence.interval));
      break;
    case '每月':
      nextDate.setMonth(nextDate.getMonth() + this.recurrence.interval);
      break;
    // 其他模式可以继续扩展
  }

  this.recurrence.nextCreation = nextDate;
};

taskSchema.methods.getEstimatedBudget = function() {
  if (this.resources && this.resources.budget) {
    return this.resources.budget.total;
  }
  return 0;
};

taskSchema.methods.getActualCost = function() {
  if (this.costTracking) {
    return this.costTracking.actualCost;
  }
  return 0;
};

module.exports = mongoose.model('Task', taskSchema);