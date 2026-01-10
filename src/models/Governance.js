/**
 * 村务治理模型
 * 管理村委会决策、投票、项目、会议等村务治理事项
 */

const mongoose = require('mongoose');

// 治理事项类型
const GovernanceTypes = {
  DECISION: 'decision',           // 决策事项
  VOTING: 'voting',               // 投票事项
  PROJECT: 'project',             // 项目管理
  MEETING: 'meeting',             // 会议记录
  POLICY: 'policy',               // 政策制定
  PROCUREMENT: 'procurement',     // 采购事项
  CONTRACT: 'contract',           // 合同管理
  AUDIT: 'audit',                 // 审计事项
  OTHER: 'other'                  // 其他
};

// 治理事项状态
const GovernanceStatus = {
  PENDING: 'pending',             // 待处理
  IN_PROGRESS: 'in_progress',     // 进行中
  UNDER_REVIEW: 'under_review',   // 审核中
  APPROVED: 'approved',           // 已批准
  REJECTED: 'rejected',           // 已拒绝
  COMPLETED: 'completed',         // 已完成
  ARCHIVED: 'archived',           // 已归档
  CANCELLED: 'cancelled'          // 已取消
};

// 优先级
const PriorityLevels = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

/**
 * 村务治理主模型
 */
const GovernanceSchema = new mongoose.Schema({
  // 事项标识
  governanceNumber: {
    type: String,
    required: true,
    unique: true,
    description: '治理事项编号'
  },

  // 基本信息
  type: {
    type: String,
    enum: Object.values(GovernanceTypes),
    required: true,
    index: true,
    description: '治理事项类型'
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
    description: '事项标题'
  },
  description: {
    type: String,
    required: true,
    maxlength: 5000,
    description: '详细描述'
  },
  summary: {
    type: String,
    maxlength: 500,
    description: '摘要'
  },

  // 状态和优先级
  status: {
    type: String,
    enum: Object.values(GovernanceStatus),
    default: 'pending',
    index: true,
    description: '事项状态'
  },
  priority: {
    type: String,
    enum: Object.values(PriorityLevels),
    default: 'medium',
    index: true,
    description: '优先级'
  },

  // 时间信息
  startDate: {
    type: Date,
    description: '开始日期'
  },
  endDate: {
    type: Date,
    description: '结束日期'
  },
  deadline: {
    type: Date,
    index: true,
    description: '截止日期'
  },

  // 负责人和参与者
  sponsor: {
    // 发起人
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: String,
    department: String,
    position: String
  },
  assignee: {
    // 负责人
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    department: String
  },
  participants: [{
    // 参与人员
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    role: String,
    department: String,
    joinDate: {
      type: Date,
      default: Date.now
    }
  }],
  supervisors: [{
    // 监督人员
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    role: String
  }],

  // 决策和投票相关
  voting: {
    enabled: {
      type: Boolean,
      default: false
    },
    votingType: {
      type: String,
      enum: ['simple_majority', 'two_thirds', 'unanimous', 'weighted'],
      description: '投票类型'
    },
    startDate: Date,
    endDate: Date,
    totalVotes: {
      type: Number,
      default: 0
    },
    votes: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      userName: String,
      decision: {
        type: String,
        enum: ['approve', 'reject', 'abstain']
      },
      weight: {
        type: Number,
        default: 1
      },
      votedAt: {
        type: Date,
        default: Date.now
      },
      comment: String
    }],
    result: {
      approved: {
        type: Number,
        default: 0
      },
      rejected: {
        type: Number,
        default: 0
      },
      abstained: {
        type: Number,
        default: 0
      },
      totalWeight: {
        type: Number,
        default: 0
      },
      passed: Boolean
    }
  },

  // 项目管理相关
  project: {
    budget: {
      total: Number,
      currency: {
        type: String,
        default: 'CNY'
      },
      allocated: Number,
      spent: Number,
      remaining: Number
    },
    phases: [{
      phaseName: String,
      description: String,
      startDate: Date,
      endDate: Date,
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'delayed']
      },
      progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      },
      responsiblePerson: {
        userId: { type: mongoose.Schema.Types.ObjectId },
        userName: String
      },
      deliverables: [String],
      notes: String
    }],
    milestones: [{
      name: String,
      description: String,
      targetDate: Date,
      completedDate: Date,
      status: {
        type: String,
        enum: ['pending', 'completed', 'overdue']
      }
    }]
  },

  // 会议记录相关
  meeting: {
    meetingType: {
      type: String,
      enum: ['regular', 'special', 'emergency', 'annual']
    },
    location: String,
    agenda: [String],
    attendees: [{
      userId: { type: mongoose.Schema.Types.ObjectId },
      userName: String,
      role: String,
      checkInTime: Date,
      checkOutTime: Date
    }],
    absentees: [{
      userId: { type: mongoose.Schema.Types.ObjectId },
      userName: String,
      reason: String
    }],
    minutes: String,
    resolutions: [{
      resolution: String,
      proposedBy: String,
      votesFor: Number,
      votesAgainst: Number,
      votesAbstain: Number,
      passed: Boolean
    }],
    nextMeeting: {
      date: Date,
      location: String,
      agenda: [String]
    }
  },

  // 审批流程
  approval: {
    currentStage: {
      type: String,
      enum: ['draft', 'department_review', 'committee_review', 'final_approval', 'approved', 'rejected'],
      default: 'draft'
    },
    approvalHistory: [{
      stage: String,
      approver: {
        userId: { type: mongoose.Schema.Types.ObjectId },
        userName: String,
        role: String
      },
      decision: {
        type: String,
        enum: ['approved', 'rejected', 'returned']
      },
      comments: String,
      approvalDate: {
        type: Date,
        default: Date.now
      },
      attachments: [{
        fileName: String,
        fileUrl: String
      }]
    }],
    requiredApprovals: [{
      role: String,
      department: String,
      order: Number,
      completed: {
        type: Boolean,
        default: false
      }
    }]
  },

  // 进度跟踪
  progress: {
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    statusReport: String,
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    completedTasks: {
      type: Number,
      default: 0
    },
    totalTasks: {
      type: Number,
      default: 0
    }
  },

  // 附件
  attachments: [{
    fileName: String,
    originalName: String,
    fileUrl: String,
    fileSize: Number,
    fileType: String,
    uploadedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId },
      userName: String
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    description: String
  }],

  // 评论和反馈
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    content: String,
    commentedAt: {
      type: Date,
      default: Date.now
    },
    isPublic: {
      type: Boolean,
      default: true
    }
  }],

  // 风险评估
  risks: [{
    riskDescription: String,
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    probability: {
      type: Number,
      min: 0,
      max: 100
    },
    impact: String,
    mitigation: String,
    owner: {
      userId: { type: mongoose.Schema.Types.ObjectId },
      userName: String
    }
  }],

  // 关联信息
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },
  relatedItems: [{
    itemType: {
      type: String,
      enum: ['governance', 'project', 'finance', 'emergency', 'service']
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId
    },
    relationType: {
      type: String,
      enum: ['parent', 'child', 'related', 'dependency']
    },
    description: String
  }],

  // 审计信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedAt: Date,
  completedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId },
    userName: String
  }
}, {
  timestamps: true,
  collection: 'governance'
});

// 索引定义
GovernanceSchema.index({ governanceNumber: 1 });
GovernanceSchema.index({ villageId: 1, status: 1 });
GovernanceSchema.index({ villageId: 1, type: 1 });
GovernanceSchema.index({ villageId: 1, priority: 1 });
GovernanceSchema.index({ deadline: 1 });
GovernanceSchema.index({ 'sponsor.userId': 1 });
GovernanceSchema.index({ 'assignee.userId': 1 });
GovernanceSchema.index({ createdAt: -1 });

// 静态方法 - 生成事项编号
GovernanceSchema.statics.generateGovernanceNumber = async function(villageId, type) {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
                 (date.getMonth() + 1).toString().padStart(2, '0') +
                 date.getDate().toString().padStart(2, '0');

  const typeCode = {
    [GovernanceTypes.DECISION]: 'DEC',
    [GovernanceTypes.VOTING]: 'VOT',
    [GovernanceTypes.PROJECT]: 'PRJ',
    [GovernanceTypes.MEETING]: 'MTG',
    [GovernanceTypes.POLICY]: 'POL',
    [GovernanceTypes.PROCUREMENT]: 'PRC',
    [GovernanceTypes.CONTRACT]: 'CNT',
    [GovernanceTypes.AUDIT]: 'AUD',
    [GovernanceTypes.OTHER]: 'OTH'
  }[type] || 'GEN';

  const villageCode = villageId ? villageId.toString().slice(-4) : '0000';

  // 获取当天的计数
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const count = await this.countDocuments({
    villageId,
    createdAt: { $gte: startOfDay }
  });

  const sequenceStr = (count + 1).toString().padStart(4, '0');

  return `GOV${dateStr}${villageCode}${typeCode}${sequenceStr}`;
};

// 虚拟字段 - 判断是否逾期
GovernanceSchema.virtual('isOverdue').get(function() {
  if (!this.deadline) return false;
  return this.deadline < new Date() && !['completed', 'archived', 'cancelled'].includes(this.status);
});

// 虚拟字段 - 投票进度
GovernanceSchema.virtual('votingProgress').get(function() {
  if (!this.voting.enabled || this.voting.votes.length === 0) return null;
  const totalVotes = this.voting.votes.length;
  const approved = this.voting.votes.filter(v => v.decision === 'approve').length;
  return {
    total: totalVotes,
    approved,
    percentage: ((approved / totalVotes) * 100).toFixed(1)
  };
});

// 实例方法 - 添加投票
GovernanceSchema.methods.addVote = function(userId, userName, decision, comment = '') {
  if (!this.voting.enabled) {
    throw new Error('Voting is not enabled for this governance item');
  }

  // 检查是否已投票
  const existingVoteIndex = this.voting.votes.findIndex(
    v => v.userId.toString() === userId.toString()
  );

  if (existingVoteIndex !== -1) {
    // 更新现有投票
    this.voting.votes[existingVoteIndex] = {
      userId,
      userName,
      decision,
      votedAt: new Date(),
      comment
    };
  } else {
    // 添加新投票
    this.voting.votes.push({
      userId,
      userName,
      decision,
      votedAt: new Date(),
      comment
    });
  }

  this.voting.totalVotes = this.voting.votes.length;
  return this.save();
};

// 实例方法 - 计算投票结果
GovernanceSchema.methods.calculateVotingResult = function() {
  const result = {
    approved: 0,
    rejected: 0,
    abstained: 0,
    totalWeight: 0,
    passed: false
  };

  this.voting.votes.forEach(vote => {
    const weight = vote.weight || 1;
    result.totalWeight += weight;

    if (vote.decision === 'approve') result.approved += weight;
    else if (vote.decision === 'reject') result.rejected += weight;
    else if (vote.decision === 'abstain') result.abstained += weight;
  });

  // 根据投票类型判断是否通过
  switch (this.voting.votingType) {
  case 'simple_majority':
    result.passed = result.approved > result.totalWeight / 2;
    break;
  case 'two_thirds':
    result.passed = result.approved >= result.totalWeight * 2 / 3;
    break;
  case 'unanimous':
    result.passed = result.rejected === 0;
    break;
  default:
    result.passed = result.approved > result.rejected;
  }

  this.voting.result = result;
  return this.save();
};

module.exports = {
  Governance: mongoose.model('Governance', GovernanceSchema),
  GovernanceTypes,
  GovernanceStatus,
  PriorityLevels
};
