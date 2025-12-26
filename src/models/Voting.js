/**
 * 村务投票数据模型
 * 支持在线投票、结果统计、投票记录管理
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// 投票类型
const VotingTypes = {
  GENERAL: 'general',           // 普通投票
  DECISION: 'decision',         // 决策投票
  ELECTION: 'election',         // 选举投票
  BUDGET: 'budget',            // 预算投票
  POLICY: 'policy',            // 政策投票
  PROJECT: 'project',          // 项目投票
  EMERGENCY: 'emergency'       // 紧急投票
};

// 投票状态
const VotingStatus = {
  DRAFT: 'draft',              // 草稿
  ACTIVE: 'active',            // 进行中
  PAUSED: 'paused',            // 暂停
  COMPLETED: 'completed',      // 已完成
  CANCELLED: 'cancelled',      // 已取消
  ARCHIVED: 'archived'         // 已归档
};

// 投票选项类型
const OptionTypes = {
  SINGLE_CHOICE: 'single_choice',     // 单选
  MULTIPLE_CHOICE: 'multiple_choice', // 多选
  RANKING: 'ranking',                 // 排序
  SCORE: 'score',                     // 评分
  TEXT: 'text'                        // 文本
};

// 投票权限
const VotingPermissions = {
  ALL_VILLAGERS: 'all_villagers',     // 全体村民
  COMMITTEE_MEMBERS: 'committee_members', // 村委成员
  PROPERTY_OWNERS: 'property_owners',   // 产权所有人
  REGISTERED_VOTERS: 'registered_voters', // 登记选民
  CUSTOM: 'custom'                     // 自定义
};

/**
 * 投票项目模型
 */
const VotingItemSchema = new mongoose.Schema({
  // 基本信息
  title: {
    type: String,
    required: true,
    maxlength: 200,
    description: '投票标题'
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000,
    description: '投票描述'
  },
  votingType: {
    type: String,
    enum: Object.values(VotingTypes),
    required: true,
    default: VotingTypes.GENERAL
  },
  status: {
    type: String,
    enum: Object.values(VotingStatus),
    default: VotingStatus.DRAFT
  },

  // 组织者信息
  organizer: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: String,
    department: String,
    role: String
  },

  // 时间设置
  timeSettings: {
    startTime: {
      type: Date,
      required: true,
      description: '开始时间'
    },
    endTime: {
      type: Date,
      required: true,
      description: '结束时间'
    },
    duration: {
      type: Number, // 投票持续天数
      default: 7
    },
    reminderTimes: [{
      type: Date,
      description: '提醒时间点'
    }]
  },

  // 参与权限
  permissions: {
    type: {
      type: String,
      enum: Object.values(VotingPermissions),
      default: VotingPermissions.ALL_VILLAGERS
    },
    customEligibility: [{
      criteria: String,
      value: mongoose.Schema.Types.Mixed,
      description: String
    }],
    minimumVoters: {
      type: Number,
      default: 1,
      description: '最低参与人数'
    },
    quorumRequired: {
      type: Boolean,
      default: false,
      description: '是否需要法定人数'
    },
    quorumRatio: {
      type: Number,
      default: 0.5,
      min: 0,
      max: 1,
      description: '法定人数比例'
    }
  },

  // 投票选项
  options: [{
    id: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 500
    },
    description: String,
    imageUrl: String,
    optionType: {
      type: String,
      enum: Object.values(OptionTypes),
      default: OptionTypes.SINGLE_CHOICE
    },
    sortOrder: {
      type: Number,
      default: 0
    },
    maxSelections: {
      type: Number,
      default: 1,
      description: '最多选择数量'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],

  // 投票规则
  rules: {
    isAnonymous: {
      type: Boolean,
      default: false,
      description: '是否匿名投票'
    },
    allowChangeVote: {
      type: Boolean,
      default: false,
      description: '是否允许修改投票'
    },
    showResultsBeforeEnd: {
      type: Boolean,
      default: false,
      description: '是否在结束前显示结果'
    },
    requireRealName: {
      type: Boolean,
      default: false,
      description: '是否需要实名投票'
    },
    minimumVotesPerOption: {
      type: Number,
      default: 0,
      description: '每个选项最低投票数'
    },
    maxVotesPerVoter: {
      type: Number,
      default: 1,
      description: '每个选民最多投票数'
    }
  },

  // 附加材料
  attachments: [{
    fileName: String,
    originalName: String,
    fileUrl: String,
    fileSize: Number,
    fileType: String,
    uploadedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      userName: String
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 投票统计
  statistics: {
    totalVoters: {
      type: Number,
      default: 0
    },
    votedCount: {
      type: Number,
      default: 0
    },
    validVotesCount: {
      type: Number,
      default: 0
    },
    invalidVotesCount: {
      type: Number,
      default: 0
    },
    abstainCount: {
      type: Number,
      default: 0
    },
    participationRate: {
      type: Number,
      default: 0
    }
  },

  // 投票选项统计
  optionStats: [{
    optionId: String,
    voteCount: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    voters: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      votedAt: { type: Date, default: Date.now }
    }]
  }],

  // 结果计算
  resultCalculation: {
    winnerOption: String,
    winningCondition: String,
    marginOfVictory: Number,
    isTie: {
      type: Boolean,
      default: false
    },
    needsRunoff: {
      type: Boolean,
      default: false
    }
  },

  // 审核和发布
  approval: {
    isApproved: {
      type: Boolean,
      default: false
    },
    approvedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      userName: String
    },
    approvedAt: Date,
    approvalComments: String,
    rejectionReason: String
  },

  // 创建和修改时间
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
  collection: 'voting_items'
});

/**
 * 投票记录模型
 */
const VotingRecordSchema = new mongoose.Schema({
  // 关联投票项目
  votingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VotingItem',
    required: true,
    index: true
  },

  // 投票者信息
  voter: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    userName: String,
    realName: String,
    idCard: String,
    phone: String,
    address: String,
    isAnonymous: {
      type: Boolean,
      default: false
    }
  },

  // 投票内容
  votes: [{
    optionId: {
      type: String,
      required: true
    },
    optionContent: String,
    rank: Number,
    score: Number,
    weight: {
      type: Number,
      default: 1
    },
    customText: String
  }],

  // 投票元数据
  metadata: {
    ipAddress: String,
    userAgent: String,
    deviceInfo: String,
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    votingMethod: {
      type: String,
      enum: ['online', 'offline', 'mobile', 'wechat'],
      default: 'online'
    },
    votingChannel: String,
    referendum: String
  },

  // 投票时间
  votedAt: {
    type: Date,
    default: Date.now,
    required: true
  },

  // 验证信息
  verification: {
    isValid: {
      type: Boolean,
      default: true
    },
    verifiedAt: Date,
    verifiedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      userName: String
    },
    verificationMethod: String,
    digitalSignature: String,
    blockchainHash: String
  },

  // 状态
  status: {
    type: String,
    enum: ['valid', 'invalid', 'pending', 'cancelled'],
    default: 'valid'
  },

  // 备注
  notes: String,

  // 修改历史
  modificationHistory: [{
    modifiedAt: { type: Date, default: Date.now },
    modifiedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      userName: String
    },
    reason: String,
    oldVotes: [mongoose.Schema.Types.Mixed],
    newVotes: [mongoose.Schema.Types.Mixed]
  }]
}, {
  timestamps: true,
  collection: 'voting_records'
});

// 投票项目索引
VotingItemSchema.index({ 'organizer.userId': 1 });
VotingItemSchema.index({ status: 1 });
VotingItemSchema.index({ votingType: 1 });
VotingItemSchema.index({ 'timeSettings.startTime': 1 });
VotingItemSchema.index({ 'timeSettings.endTime': 1 });
VotingItemSchema.index({ createdAt: -1 });
VotingItemSchema.index({ 'permissions.type': 1 });

// 投票记录索引
VotingRecordSchema.index({ votingId: 1, 'voter.userId': 1 });
VotingRecordSchema.index({ votingId: 1, votedAt: -1 });
VotingRecordSchema.index({ 'voter.userId': 1, votedAt: -1 });
VotingRecordSchema.index({ status: 1 });

// 虚拟字段
VotingItemSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === VotingStatus.ACTIVE &&
         this.timeSettings.startTime <= now &&
         this.timeSettings.endTime >= now;
});

VotingItemSchema.virtual('isOverdue').get(function() {
  return this.timeSettings.endTime < new Date();
});

VotingItemSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  const endTime = new Date(this.timeSettings.endTime);
  return Math.max(0, endTime - now);
});

// 实例方法 - 更新统计信息
VotingItemSchema.methods.updateStatistics = async function() {
  try {
    // 计算投票统计
    const totalRecords = await mongoose.model('VotingRecord').countDocuments({
      votingId: this._id,
      status: 'valid'
    });

    // 更新投票统计
    this.statistics.votedCount = totalRecords;
    this.statistics.participationRate = this.statistics.totalVoters > 0
      ? (totalRecords / this.statistics.totalVoters * 100).toFixed(2)
      : 0;

    // 计算选项统计
    for (const option of this.options) {
      const optionVotes = await mongoose.model('VotingRecord').countDocuments({
        votingId: this._id,
        status: 'valid',
        'votes.optionId': option.id
      });

      const optionStat = this.optionStats.find(stat => stat.optionId === option.id);
      if (optionStat) {
        optionStat.voteCount = optionVotes;
        optionStat.percentage = totalRecords > 0
          ? (optionVotes / totalRecords * 100).toFixed(2)
          : 0;
      }
    }

    await this.save();
    return this.statistics;
  } catch (error) {
    logger.error('更新投票统计失败:', error);
    throw error;
  }
};

// 实例方法 - 检查用户是否已投票
VotingItemSchema.methods.hasUserVoted = async function(userId) {
  const record = await mongoose.model('VotingRecord').findOne({
    votingId: this._id,
    'voter.userId': userId,
    status: 'valid'
  });
  return !!record;
};

// 实例方法 - 获取用户投票记录
VotingItemSchema.methods.getUserVote = async function(userId) {
  return await mongoose.model('VotingRecord').findOne({
    votingId: this._id,
    'voter.userId': userId,
    status: 'valid'
  });
};

// 静态方法 - 获取活跃投票
VotingItemSchema.statics.getActiveVotings = function(filters = {}) {
  const query = {
    status: VotingStatus.ACTIVE,
    'timeSettings.startTime': { $lte: new Date() },
    'timeSettings.endTime': { $gte: new Date() },
    'approval.isApproved': true
  };

  if (filters.votingType) {
    query.votingType = filters.votingType;
  }

  if (filters.organizerId) {
    query['organizer.userId'] = filters.organizerId;
  }

  return this.find(query).sort({ 'timeSettings.endTime': 1 });
};

// 静态方法 - 获取用户可参与投票
VotingItemSchema.statics.getUserEligibleVotings = function(userId, userRole = 'villager') {
  const query = {
    status: VotingStatus.ACTIVE,
    'timeSettings.startTime': { $lte: new Date() },
    'timeSettings.endTime': { $gte: new Date() },
    'approval.isApproved': true
  };

  // 根据权限过滤
  query.$or = [
    { 'permissions.type': VotingPermissions.ALL_VILLAGERS },
    { 'permissions.type': VotingPermissions.COMMITTEE_MEMBERS, 'permissions.type': userRole },
    { 'permissions.type': VotingPermissions.REGISTERED_VOTERS }
  ];

  return this.find(query).sort({ 'timeSettings.endTime': 1 });
};

// 静态方法 - 统计投票数据
VotingItemSchema.statics.getVotingStatistics = function(filters = {}) {
  const matchStage = {
    'approval.isApproved': true
  };

  if (filters.startDate || filters.endDate) {
    matchStage.createdAt = {};
    if (filters.startDate) matchStage.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) matchStage.createdAt.$lte = new Date(filters.endDate);
  }

  if (filters.votingType) {
    matchStage.votingType = filters.votingType;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$votingType',
        totalCount: { $sum: 1 },
        completedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        activeCount: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        totalParticipants: { $sum: '$statistics.votedCount' },
        averageParticipation: { $avg: '$statistics.participationRate' }
      }
    }
  ]);
};

module.exports = {
  VotingItem: mongoose.model('VotingItem', VotingItemSchema),
  VotingRecord: mongoose.model('VotingRecord', VotingRecordSchema),
  VotingTypes,
  VotingStatus,
  OptionTypes,
  VotingPermissions
};