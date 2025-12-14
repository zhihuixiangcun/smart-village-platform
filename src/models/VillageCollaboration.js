/**
 * 村务协同平台数据模型
 * 支持在线讨论、任务调度、村民反馈等功能
 */

const mongoose = require('mongoose');

// 讨论主题类型
const DiscussionTypes = {
  ANNOUNCEMENT: 'announcement',    // 公告讨论
  POLICY: 'policy',               // 政策讨论
  PROJECT: 'project',             // 项目讨论
  COMPLAINT: 'complaint',         // 投诉建议
  SUGGESTION: 'suggestion',       // 民生建议
  EMERGENCY: 'emergency',         // 应急事务
  DAILY_LIFE: 'daily_life'        // 日常生活
};

// 任务优先级
const TaskPriority = {
  URGENT: 'urgent',      // 紧急
  HIGH: 'high',          // 高
  MEDIUM: 'medium',      // 中等
  LOW: 'low'             // 低
};

// 任务状态
const TaskStatus = {
  PENDING: 'pending',        // 待处理
  IN_PROGRESS: 'in_progress', // 进行中
  COMPLETED: 'completed',    // 已完成
  CANCELLED: 'cancelled',    // 已取消
  OVERDUE: 'overdue'         // 已逾期
};

// 参与者角色
const ParticipantRole = {
  INITIATOR: 'initiator',     // 发起人
  MODERATOR: 'moderator',     // 主持人
  EXPERT: 'expert',          // 专家
  INTERESTED: 'interested'    // 关注者
};

/**
 * 村务讨论模型
 */
const VillageDiscussionSchema = new mongoose.Schema({
  // 基本信息
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: Object.values(DiscussionTypes),
    required: true,
    index: true
  },
  villageId: {
    type: String,
    required: true,
    ref: 'Village',
    index: true
  },

  // 发起人信息
  initiator: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: { type: String, required: true },
    userRole: { type: String, required: true },
    avatar: String
  },

  // 讨论标签
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],

  // 附件
  attachments: [{
    type: { type: String, enum: ['image', 'document', 'video', 'audio'] },
    url: { type: String, required: true },
    name: { type: String, required: true },
    size: Number,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // 参与者管理
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(ParticipantRole),
      default: ParticipantRole.INTERESTED
    },
    joinedAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now },
    notificationEnabled: { type: Boolean, default: true }
  }],

  // 回复内容
  replies: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    content: { type: String, required: true, maxlength: 1000 },
    author: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      userName: { type: String, required: true },
      avatar: String
    },
    attachments: [{
      type: { type: String, enum: ['image', 'document'] },
      url: { type: String, required: true },
      name: { type: String, required: true }
    }],
    parentReply: { type: mongoose.Schema.Types.ObjectId, ref: 'VillageDiscussion.replies' },
    likes: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      likedAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false }
  }],

  // 投票功能
  voting: {
    enabled: { type: Boolean, default: false },
    question: String,
    options: [{
      text: { type: String, required: true },
      votes: { type: Number, default: 0 },
      voters: [{
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        votedAt: { type: Date, default: Date.now }
      }]
    }],
    deadline: Date,
    isAnonymous: { type: Boolean, default: false },
    allowMultipleChoice: { type: Boolean, default: false }
  },

  // 状态管理
  status: {
    type: String,
    enum: ['active', 'closed', 'archived', 'locked'],
    default: 'active',
    index: true
  },
  priority: {
    type: String,
    enum: Object.values(TaskPriority),
    default: TaskPriority.MEDIUM
  },

  // 统计信息
  statistics: {
    viewCount: { type: Number, default: 0 },
    replyCount: { type: Number, default: 0 },
    participantCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 }
  },

  // 处理结果
  resolution: {
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'resolved', 'rejected']
    },
    result: String,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date,
    resolutionDetails: String
  },

  // 设置
  settings: {
    allowAnonymousReply: { type: Boolean, default: false },
    requireApproval: { type: Boolean, default: false },
    autoCloseAfterDays: { type: Number, default: 30 },
    notifyOnReply: { type: Boolean, default: true }
  },

  // 地理位置信息
  location: {
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    address: String,
    radius: Number // 影响范围（米）
  },

  // 元数据
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastRepliedAt: Date,
    pinned: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    moderated: { type: Boolean, default: false },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    moderatedAt: Date,
    moderatorNotes: String
  }
}, {
  timestamps: true,
  collection: 'village_discussions'
});

/**
 * 村务任务模型
 */
const VillageTaskSchema = new mongoose.Schema({
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
    enum: ['governance', 'infrastructure', 'public_service', 'emergency', 'daily_management'],
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  villageId: {
    type: String,
    required: true,
    ref: 'Village',
    index: true
  },

  // 任务发起人
  creator: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: { type: String, required: true },
    department: String,
    position: String
  },

  // 任务负责人
  assignees: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: { type: String, required: true },
    role: String,
    assignedAt: { type: Date, default: Date.now },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isPrimary: { type: Boolean, default: false }
  }],

  // 时间管理
  schedule: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    estimatedHours: Number,
    actualHours: { type: Number, default: 0 },
    milestones: [{
      name: { type: String, required: true },
      description: String,
      dueDate: { type: Date, required: true },
      status: {
        type: String,
        enum: ['pending', 'completed', 'delayed'],
        default: 'pending'
      },
      completedAt: Date
    }]
  },

  // 优先级和状态
  priority: {
    type: String,
    enum: Object.values(TaskPriority),
    required: true,
    default: TaskPriority.MEDIUM,
    index: true
  },
  status: {
    type: String,
    enum: Object.values(TaskStatus),
    default: TaskStatus.PENDING,
    index: true
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  // 资源管理
  resources: {
    budget: {
      allocated: Number,
      spent: { type: Number, default: 0 },
      currency: { type: String, default: 'CNY' }
    },
    personnel: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      name: String,
      role: String,
      workload: Number,
      cost: Number
    }],
    equipment: [{
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      unit: String,
      cost: Number
    }],
    materials: [{
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      unit: String,
      supplier: String,
      cost: Number
    }]
  },

  // 协作团队
  collaborators: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: { type: String, required: true },
    role: String,
    permissions: [{
      type: String,
      enum: ['view', 'edit', 'comment', 'assign', 'approve']
    }],
    joinedAt: { type: Date, default: Date.now }
  }],

  // 任务标签
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],

  // 附件和文档
  attachments: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, enum: ['document', 'image', 'video', 'other'] },
    size: Number,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: { type: Date, default: Date.now },
    description: String
  }],

  // 任务评论和更新
  updates: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    type: {
      type: String,
      enum: ['progress', 'status', 'comment', 'attachment', 'milestone'],
      required: true
    },
    content: { type: String, required: true },
    author: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      userName: { type: String, required: true },
      avatar: String
    },
    attachments: [{
      name: String,
      url: String
    }],
    createdAt: { type: Date, default: Date.now }
  }],

  // 依赖关系
  dependencies: {
    dependsOn: [{
      taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VillageTask'
      },
      taskTitle: String,
      critical: { type: Boolean, default: false }
    }],
    blocks: [{
      taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VillageTask'
      },
      taskTitle: String
    }]
  },

  // 风险管理
  risks: [{
    description: { type: String, required: true },
    probability: {
      type: Number,
      min: 0,
      max: 1,
      required: true
    },
    impact: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    mitigation: String,
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['active', 'mitigated', 'closed'],
      default: 'active'
    }
  }],

  // 地理位置
  location: {
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    address: String,
    area: String
  },

  // 审批流程
  approval: {
    required: { type: Boolean, default: false },
    workflow: [{
      step: { type: Number, required: true },
      name: { type: String, required: true },
      approver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      approverName: { type: String, required: true },
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      decisionAt: Date,
      comments: String
    }],
    currentStep: { type: Number, default: 0 }
  },

  // 完成报告
  completion: {
    summary: String,
    outcomes: [String],
    lessons: String,
    attachments: [{
      name: String,
      url: String,
      type: String
    }],
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    completedAt: Date,
    qualityScore: {
      type: Number,
      min: 1,
      max: 5
    }
  },

  // 统计信息
  statistics: {
    totalUpdates: { type: Number, default: 0 },
    totalComments: { type: Number, default: 0 },
    totalAttachments: { type: Number, default: 0 },
    collaborationScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  }
}, {
  timestamps: true,
  collection: 'village_tasks'
});

// 村务讨论索引
VillageDiscussionSchema.index({ villageId: 1, status: 1, createdAt: -1 });
VillageDiscussionSchema.index({ villageId: 1, type: 1, createdAt: -1 });
VillageDiscussionSchema.index({ 'initiator.userId': 1, createdAt: -1 });
VillageDiscussionSchema.index({ tags: 1 });

// 村务任务索引
VillageTaskSchema.index({ villageId: 1, status: 1, priority: 1, createdAt: -1 });
VillageTaskSchema.index({ 'assignees.userId': 1, status: 1 });
VillageTaskSchema.index({ 'creator.userId': 1, createdAt: -1 });
VillageTaskSchema.index({ 'schedule.endDate': 1, status: 1 });

// 虚拟字段
VillageDiscussionSchema.virtual('replyCount').get(function() {
  return this.replies ? this.replies.filter(r => !r.isDeleted).length : 0;
});

VillageTaskSchema.virtual('overdue').get(function() {
  if (this.status === TaskStatus.COMPLETED) return false;
  return new Date() > this.schedule.endDate;
});

// 中间件 - 更新统计信息
VillageDiscussionSchema.pre('save', function(next) {
  if (this.isModified('replies')) {
    this.statistics.replyCount = this.replyCount;
  }
  if (this.isModified('participants')) {
    this.statistics.participantCount = this.participants.length;
  }
  this.metadata.updatedAt = new Date();
  next();
});

VillageTaskSchema.pre('save', function(next) {
  if (this.isModified('updates')) {
    this.statistics.totalUpdates = this.updates.length;
  }
  if (this.isModified('attachments')) {
    this.statistics.totalAttachments = this.attachments.length;
  }
  next();
});

// 静态方法 - 获取热门讨论
VillageDiscussionSchema.statics.getHotDiscussions = function(villageId, limit = 10) {
  return this.find({
    villageId,
    status: 'active',
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 最近7天
  })
  .sort({
    'statistics.viewCount': -1,
    'statistics.replyCount': -1,
    'statistics.likeCount': -1
  })
  .limit(limit)
  .populate('initiator.userId', 'userName avatar');
};

// 静态方法 - 获取待处理任务
VillageTaskSchema.statics.getPendingTasks = function(villageId, userId = null) {
  const query = {
    villageId,
    status: { $in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] }
  };

  if (userId) {
    query.$or = [
      { 'creator.userId': userId },
      { 'assignees.userId': userId },
      { 'collaborators.userId': userId }
    ];
  }

  return this.find(query)
    .sort({ priority: -1, 'schedule.endDate': 1 })
    .populate('assignees.userId', 'userName avatar')
    .populate('creator.userId', 'userName avatar');
};

module.exports = {
  VillageDiscussion: mongoose.model('VillageDiscussion', VillageDiscussionSchema),
  VillageTask: mongoose.model('VillageTask', VillageTaskSchema),
  DiscussionTypes,
  TaskPriority,
  TaskStatus,
  ParticipantRole
};