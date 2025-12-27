/**
 * 会议模型
 * 用于管理村务会议、党员会议、村民代表会议等
 */

const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  // 基本信息
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000
  },
  type: {
    type: String,
    required: true,
    enum: ['村委会议', '党员会议', '村民代表会议', '村民大会', '专题会议', '紧急会议', '听证会'],
    default: '村委会议'
  },

  // 会议时间和地点
  scheduledTime: {
    type: Date,
    required: true
  },
  estimatedDuration: {
    type: Number, // 分钟
    required: true,
    default: 120
  },
  actualStartTime: Date,
  actualEndTime: Date,

  location: {
    type: {
      type: String,
      enum: ['会议室', '广场', '线上会议', '其他'],
      required: true
    },
    name: {
      type: String,
      required: true
    },
    address: String,
    capacity: Number,
    facilities: [String], // 投影、音响、网络等
    coordinates: {
      lat: Number,
      lng: Number
    },
    onlineMeeting: {
      platform: {
        type: String,
        enum: ['腾讯会议', '钉钉', 'Zoom', 'Teams', '其他']
      },
      meetingId: String,
      password: String,
      joinUrl: String,
      hostKey: String
    }
  },

  // 组织者信息
  organizer: {
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
    contact: {
      phone: String,
      email: String
    }
  },

  // 参会人员
  participants: {
    required: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
      },
      name: String,
      role: {
        type: String,
        enum: ['主持人', '记录员', '发言人', '普通参会者', '列席人员'],
        default: '普通参会者'
      },
      department: String,
      contact: String,
      mustAttend: {
        type: Boolean,
        default: false
      }
    }],
    optional: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      name: String,
      role: String,
      department: String,
      reason: String // 邀请原因
    }],
    public: {
      type: Boolean,
      default: false
    },
    maxParticipants: Number,
    registrationRequired: {
      type: Boolean,
      default: false
    },
    registrationDeadline: Date
  },

  // 会议议程
  agenda: [{
    order: {
      type: Number,
      required: true
    },
    title: {
      type: String,
      required: true,
      maxlength: 200
    },
    description: String,
    type: {
      type: String,
      enum: ['报告', '讨论', '表决', '选举', '培训', '其他'],
      default: '讨论'
    },
    presenter: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      name: String,
      department: String
    },
    estimatedTime: Number, // 分钟
    attachments: [{
      name: String,
      url: String,
      type: String
    }],
    required: {
      type: Boolean,
      default: true
    }
  }],

  // 会议材料
  materials: [{
    type: {
      type: String,
      enum: ['会议议程', '会议资料', '发言稿', '表决票', '会议纪要模板', '其他'],
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
    version: {
      type: Number,
      default: 1
    }
  }],

  // 状态管理
  status: {
    type: String,
    enum: ['筹备中', '待召开', '进行中', '已结束', '已取消'],
    default: '筹备中'
  },
  priority: {
    type: String,
    enum: ['低', '中', '高', '紧急'],
    default: '中'
  },

  // 通知设置
  notifications: {
    firstReminder: {
      enabled: {
        type: Boolean,
        default: true
      },
      time: Number, // 会议开始前多少分钟
      sent: {
        type: Boolean,
        default: false
      }
    },
    secondReminder: {
      enabled: {
        type: Boolean,
        default: true
      },
      time: Number,
      sent: {
        type: Boolean,
        default: false
      }
    },
    cancellationNotice: {
      sent: {
        type: Boolean,
        default: false
      },
      reason: String
    }
  },

  // 参会记录
  attendance: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    },
    name: String,
    status: {
      type: String,
      enum: ['已签到', '请假', '缺席', '迟到', '早退'],
      required: true
    },
    checkInTime: Date,
    checkOutTime: Date,
    checkInMethod: {
      type: String,
      enum: ['人脸识别', '二维码', '手动签到', 'GPS定位'],
      default: '手动签到'
    },
    leaveReason: String,
    note: String
  }],

  // 会议记录
  minutes: {
    recorder: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      name: String
    },
    content: String,
    summary: String,
    keyDecisions: [{
      decision: String,
      responsible: {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        name: String
      },
      deadline: Date,
      priority: {
        type: String,
        enum: ['低', '中', '高', '紧急'],
        default: '中'
      }
    }],
    actionItems: [{
      task: String,
      assignee: {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        name: String
      },
      dueDate: Date,
      status: {
        type: String,
        enum: ['待处理', '进行中', '已完成', '已取消'],
        default: '待处理'
      },
      priority: {
        type: String,
        enum: ['低', '中', '高', '紧急'],
        default: '中'
      }
    }],
    attachments: [{
      name: String,
      url: String,
      type: String
    }],
    completedAt: Date,
    approvedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      name: String,
      approvedAt: Date
    }
  },

  // 表决信息
  voting: [{
    agendaItem: Number, // 对应议程项的order
    title: String,
    description: String,
    type: {
      type: String,
      enum: ['举手表决', '无记名投票', '记名投票'],
      default: '举手表决'
    },
    options: [String], // 表决选项
    results: [{
      option: String,
      votes: Number,
      percentage: Number
    }],
    voters: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      name: String,
      vote: String,
      votedAt: Date
    }],
    totalVoters: Number,
    abstainVotes: Number,
    invalidVotes: Number,
    passed: Boolean,
    createdAt: Date
  }],

  // 会议记录
  recordings: [{
    type: {
      type: String,
      enum: ['音频', '视频', '屏幕共享'],
      required: true
    },
    url: String,
    duration: Number, // 秒
    size: Number,
    format: String,
    quality: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    accessibility: {
      type: String,
      enum: ['公开', '参会人员', '仅管理员'],
      default: '参会人员'
    },
    transcriptions: [{
      language: String,
      content: String,
      speaker: String,
      timestamp: Number
    }]
  }],

  // 费用信息
  expenses: [{
    category: {
      type: String,
      enum: ['场地费', '设备费', '材料费', '餐饮费', '交通费', '其他'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    description: String,
    receipt: {
      url: String,
      number: String
    },
    approvedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      name: String
    },
    reimbursed: {
      type: Boolean,
      default: false
    },
    reimbursedAt: Date,
    reimbursedAmount: Number
  }],

  // 评价和反馈
  feedback: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: String,
    suggestions: String,
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 相关项目
  relatedProjects: [{
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    title: String,
    relationship: {
      type: String,
      enum: ['讨论', '决策', '启动', '汇报', '其他'],
      default: '讨论'
    }
  }],

  // 重复会议设置
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
      default: 1 // 每N个周期
    },
    daysOfWeek: [Number], // 0-6, 0为周日
    dayOfMonth: Number,
    endDate: Date,
    maxOccurrences: Number,
    nextOccurrence: Date
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
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
meetingSchema.index({ scheduledTime: 1, status: 1 });
meetingSchema.index({ 'organizer.userId': 1, scheduledTime: -1 });
meetingSchema.index({ type: 1, scheduledTime: -1 });
meetingSchema.index({ status: 1, priority: -1 });
meetingSchema.index({ 'participants.required.userId': 1 });
meetingSchema.index({ tags: 1 });

// 虚拟字段
meetingSchema.virtual('isOverdue').get(function() {
  return this.scheduledTime < new Date() && this.status !== '已结束' && this.status !== '已取消';
});

meetingSchema.virtual('duration').get(function() {
  if (this.actualStartTime && this.actualEndTime) {
    return Math.round((this.actualEndTime - this.actualStartTime) / 60000); // 分钟
  }
  return this.estimatedDuration;
});

meetingSchema.virtual('attendanceRate').get(function() {
  const totalRequired = this.participants.required.length;
  const attended = this.attendance.filter(a => a.status === '已签到').length;
  return totalRequired > 0 ? (attended / totalRequired) * 100 : 0;
});

// 中间件
meetingSchema.pre('save', function(next) {
  // 自动设置会议状态
  const now = new Date();
  if (this.status === '待召开' && this.scheduledTime <= now) {
    this.status = '进行中';
    this.actualStartTime = this.actualStartTime || now;
  }

  // 生成下次重复会议时间
  if (this.recurrence.enabled && !this.recurrence.nextOccurrence) {
    this.calculateNextOccurrence();
  }

  next();
});

// 静态方法
meetingSchema.statics.findUpcomingMeetings = function(userId, options = {}) {
  const now = new Date();
  const query = {
    scheduledTime: { $gt: now },
    status: { $in: ['筹备中', '待召开'] }
  };

  // 如果指定用户，只查找用户参与的会议
  if (userId) {
    query.$or = [
      { 'organizer.userId': userId },
      { 'participants.required.userId': userId },
      { 'participants.optional.userId': userId }
    ];
  }

  return this.find(query)
    .sort({ scheduledTime: 1 })
    .limit(options.limit || 10);
};

meetingSchema.statics.findTodayMeetings = function() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  return this.find({
    scheduledTime: { $gte: startOfDay, $lt: endOfDay },
    status: { $in: ['待召开', '进行中'] }
  }).sort({ scheduledTime: 1 });
};

// 实例方法
meetingSchema.methods.checkIn = function(userId, name, method = '手动签到') {
  const existingRecord = this.attendance.find(record =>
    record.userId.toString() === userId.toString()
  );

  if (existingRecord) {
    existingRecord.status = '已签到';
    existingRecord.checkInTime = new Date();
    existingRecord.checkInMethod = method;
  } else {
    this.attendance.push({
      userId,
      name,
      status: '已签到',
      checkInTime: new Date(),
      checkInMethod: method
    });
  }

  return this.save();
};

meetingSchema.methods.vote = function(userId, agendaItem, voteOption) {
  const votingRecord = this.voting.find(v => v.agendaItem === agendaItem);

  if (!votingRecord) {
    throw new Error('表决项不存在');
  }

  const existingVote = votingRecord.voters.find(v =>
    v.userId.toString() === userId.toString()
  );

  if (existingVote) {
    existingVote.vote = voteOption;
    existingVote.votedAt = new Date();
  } else {
    votingRecord.voters.push({
      userId,
      vote: voteOption,
      votedAt: new Date()
    });
  }

  // 重新计算投票结果
  this.calculateVotingResults(agendaItem);
  return this.save();
};

meetingSchema.methods.calculateVotingResults = function(agendaItem) {
  const votingRecord = this.voting.find(v => v.agendaItem === agendaItem);
  if (!votingRecord) return;

  const votes = {};
  votingRecord.voters.forEach(voter => {
    votes[voter.vote] = (votes[voter.vote] || 0) + 1;
  });

  votingRecord.results = votingRecord.options.map(option => ({
    option,
    votes: votes[option] || 0,
    percentage: votingRecord.voters.length > 0 ?
      ((votes[option] || 0) / votingRecord.voters.length) * 100 : 0
  }));

  votingRecord.totalVoters = votingRecord.voters.length;

  // 判断是否通过
  const majorityThreshold = votingRecord.totalVoters / 2;
  const majorityVote = votingRecord.results.find(r => r.votes > majorityThreshold);
  votingRecord.passed = !!majorityVote;
};

meetingSchema.methods.calculateNextOccurrence = function() {
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

  this.recurrence.nextOccurrence = nextDate;
};

module.exports = mongoose.model('Meeting', meetingSchema);