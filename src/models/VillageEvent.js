/**
 * 乡村活动模型
 * 支持活动组织、志愿者召集、活动签到等功能
 */

const mongoose = require('mongoose');

// 活动类型
const EventType = {
  CULTURAL: 'cultural',           // 文化活动（文艺演出、节庆活动等）
  SPORTS: 'sports',               // 体育活动（运动会、比赛等）
  VOLUNTEER: 'volunteer',         // 志愿活动（环境整治、助老服务等）
  EDUCATION: 'education',         // 教育培训（技能培训、讲座等）
  MEETING: 'meeting',             // 会议活动（村民大会、代表会议等）
  WELFARE: 'welfare',             // 福利活动（慰问、帮扶等）
  AGRICULTURE: 'agriculture',     // 农业活动（种植、收割等）
  EMERGENCY: 'emergency',         // 应急活动（抢险救灾等）
  ENTERTAINMENT: 'entertainment', // 娱乐活动（电影、游戏等）
  OTHER: 'other'                  // 其他
};

// 活动状态
const EventStatus = {
  DRAFT: 'draft',           // 草稿
  PUBLISHED: 'published',   // 已发布
  RECRUITING: 'recruiting', // 招募中
  FULL: 'full',             // 人员已满
  ONGOING: 'ongoing',       // 进行中
  COMPLETED: 'completed',   // 已结束
  CANCELLED: 'cancelled',   // 已取消
  POSTPONED: 'postponed'    // 已延期
};

// 报名状态
const RegistrationStatus = {
  PENDING: 'pending',     // 待审核
  APPROVED: 'approved',   // 已通过
  REJECTED: 'rejected',   // 已拒绝
  CHECKED_IN: 'checked_in', // 已签到
  ABSENT: 'absent',       // 缺席
  CANCELLED: 'cancelled'  // 已取消
};

// 志愿者类型
const VolunteerRole = {
  ORGANIZER: 'organizer',     // 组织者
  COORDINATOR: 'coordinator', // 协调员
  STAFF: 'staff',             // 工作人员
  PARTICIPANT: 'participant'  // 参与者
};

const VillageEventSchema = new mongoose.Schema({
  // 基础信息
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    maxlength: 500
  },
  richContent: {
    type: mongoose.Schema.Types.Mixed
  },

  // 分类信息
  eventType: {
    type: String,
    enum: Object.values(EventType),
    required: true,
    index: true
  },
  category: String,
  tags: [String],

  // 状态
  status: {
    type: String,
    enum: Object.values(EventStatus),
    default: 'draft',
    index: true
  },

  // 优先级
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // 村庄关联
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 活动时间
  scheduledStart: {
    type: Date,
    required: true,
    index: true
  },
  scheduledEnd: {
    type: Date,
    required: true
  },
  actualStart: Date,
  actualEnd: Date,

  // 活动地点
  location: {
    type: String,
    required: true
  },
  locationDetail: {
    address: String,
    latitude: Number,
    longitude: Number,
    roomId: String
  },

  // 人员限制
  maxParticipants: {
    type: Number,
    default: 0
  },
  minParticipants: {
    type: Number,
    default: 0
  },
  currentParticipants: {
    type: Number,
    default: 0
  },
  allowWaitlist: {
    type: Boolean,
    default: true
  },

  // 组织者信息
  organizerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizerName: String,
  organizerPhone: String,
  organizerAvatar: String,

  // ==================== 志愿者召集 ====================

  // 志愿者招募
  volunteerRecruitment: {
    enabled: {
      type: Boolean,
      default: false
    },
    roles: [{
      role: {
        type: String,
        enum: Object.values(VolunteerRole)
      },
      title: String,
      description: String,
      required: Number,
      recruited: {
        type: Number,
        default: 0
      },
      responsibilities: [String],
      requirements: [String],
      benefits: [String]  // 志愿者福利（积分、证书等）
    }],
    requirements: {
      minAge: Number,
      maxAge: Number,
      skills: [String],
      physicalRequirements: String,
      availability: String
    },
    deadline: Date
  },

  // 志愿者报名记录
  volunteers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    userPhone: String,
    userAvatar: String,
    role: {
      type: String,
      enum: Object.values(VolunteerRole)
    },
    status: {
      type: String,
      enum: Object.values(RegistrationStatus),
      default: 'pending'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    approvedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String,
    skills: [String],
    experience: String,

    // 签到信息
    checkInAt: Date,
    checkInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    checkOutAt: Date,
    checkOutBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    workHours: Number,  // 服务时长（小时）
    performance: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String
    }
  }],

  // ==================== 活动报名 ====================

  // 参与者报名
  registrations: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    userPhone: String,
    userAvatar: String,
    status: {
      type: String,
      enum: Object.values(RegistrationStatus),
      default: 'approved'
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },

    // 签到信息
    checkInAt: Date,
    checkInMethod: String,  // qrcode, manual, face, etc.
    checkInLocation: {
      latitude: Number,
      longitude: Number
    },
    checkOutAt: Date,
    attendance: String,  // full, partial, absent

    // 备注
    notes: String,
    feedback: String,
    rating: {
      type: Number,
      min: 1,
      max: 5
    }
  }],

  // ==================== 活动签到 ====================

  // 签到配置
  checkInConfig: {
    enabled: {
      type: Boolean,
      default: true
    },
    methods: [{
      type: String,
      enum: ['qrcode', 'nfc', 'face', 'manual', 'location']
    }],
    checkInRadius: Number,  // 签到允许范围（米）
    earlyCheckInMinutes: Number,  // 允许提前签到分钟数
    lateCheckInMinutes: Number,   // 允许迟到签到分钟数
    requirePhoto: Boolean,   // 是否需要拍照签到
    autoCheckOut: Boolean    // 是否自动签退
  },

  // 签到统计
  checkInStats: {
    totalVolunteers: Number,
    checkedInVolunteers: Number,
    totalParticipants: Number,
    checkedInParticipants: Number,
    lastCheckInAt: Date
  },

  // ==================== 活动资源 ====================

  // 所需物资
  resources: [{
    name: String,
    quantity: Number,
    unit: String,
    category: String,
    status: {
      type: String,
      enum: ['pending', 'prepared', 'distributed', 'returned']
    },
    notes: String
  }],

  // 所需资金
  budget: {
    estimated: Number,
    actual: Number,
    items: [{
      category: String,
      description: String,
      amount: Number,
      status: {
        type: String,
        enum: ['planned', 'approved', 'spent', 'settled']
      }
    }]
  },

  // ==================== 活动媒体 ====================

  // 活动图片
  images: [{
    url: String,
    thumbnail: String,
    caption: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 活动视频
  videos: [{
    url: String,
    thumbnail: String,
    caption: String,
    duration: Number
  }],

  // 附件
  attachments: [{
    filename: String,
    originalName: String,
    url: String,
    type: String,
    size: Number
  }],

  // ==================== 互动功能 ====================

  // 点赞
  likeCount: {
    type: Number,
    default: 0
  },
  likes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 评论
  commentCount: {
    type: Number,
    default: 0
  },
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    userAvatar: String,
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 分享
  shareCount: {
    type: Number,
    default: 0
  },

  // 收藏
  bookmarkCount: {
    type: Number,
    default: 0
  },
  bookmarks: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    bookmarkedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // ==================== 活动结果 ====================

  // 活动总结
  summary: {
    content: String,
    attendance: Number,
    volunteerHours: Number,
    achievements: [String],
    challenges: [String],
    photos: [String],
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    submittedAt: Date
  },

  // 活动反馈
  feedbacks: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    content: String,
    suggestions: String,
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // ==================== 通知设置 ====================

  // 通知发送记录
  notifications: {
    published: {
      type: Boolean,
      default: false
    },
    publishedAt: Date,
    reminded: {
      type: Boolean,
      default: false
    },
    remindedAt: Date,
    channels: [{
      type: String,
      enum: ['app', 'sms', 'wechat', 'email']
    }]
  },

  // ==================== 创建和更新信息 ====================

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

  // 软删除
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'villageEvents'
});

// ==================== 索引定义 ====================

VillageEventSchema.index({ villageId: 1, status: 1, scheduledStart: -1 });
VillageEventSchema.index({ eventType: 1, status: 1 });
VillageEventSchema.index({ scheduledStart: 1, scheduledEnd: 1 });
VillageEventSchema.index({ 'volunteers.userId': 1 });
VillageEventSchema.index({ 'registrations.userId': 1 });
VillageEventSchema.index({ status: 1, priority: -1 });

// 全文搜索索引
VillageEventSchema.index({
  title: 'text',
  description: 'text',
  summary: 'text',
  tags: 'text'
});

// ==================== 实例方法 ====================

/**
 * 发布活动
 */
VillageEventSchema.methods.publish = function() {
  if (this.status !== 'draft') {
    throw new Error('只有草稿状态的活动才能发布');
  }

  this.status = 'published';
  this.publishedAt = new Date();

  return this.save();
};

/**
 * 开始招募
 */
VillageEventSchema.methods.startRecruiting = function() {
  if (this.status !== 'published') {
    throw new Error('只有已发布的活动才能开始招募');
  }

  this.status = 'recruiting';

  return this.save();
};

/**
 * 开始活动
 */
VillageEventSchema.methods.start = function() {
  if (this.status !== 'recruiting' && this.status !== 'full') {
    throw new Error('当前状态无法开始活动');
  }

  this.status = 'ongoing';
  this.actualStart = new Date();

  return this.save();
};

/**
 * 结束活动
 */
VillageEventSchema.methods.complete = function() {
  if (this.status !== 'ongoing') {
    throw new Error('只有进行中的活动才能结束');
  }

  this.status = 'completed';
  this.actualEnd = new Date();

  return this.save();
};

/**
 * 志愿者报名
 */
VillageEventSchema.methods.registerVolunteer = function(volunteerData) {
  // 检查是否已报名
  const existing = this.volunteers.find(
    v => v.userId.toString() === volunteerData.userId.toString()
  );

  if (existing) {
    throw new Error('已经报名过了');
  }

  // 检查该角色是否已满
  const roleRecruitment = this.volunteerRecruitment.roles.find(
    r => r.role === volunteerData.role
  );

  if (roleRecruitment && roleRecruitment.recruited >= roleRecruitment.required) {
    throw new Error('该角色名额已满');
  }

  this.volunteers.push({
    ...volunteerData,
    status: 'pending',
    appliedAt: new Date()
  });

  if (roleRecruitment) {
    roleRecruitment.recruited += 1;
  }

  return this.save();
};

/**
 * 审核志愿者
 */
VillageEventSchema.methods.approveVolunteer = function(volunteerId, approverId, approved) {
  const volunteer = this.volunteers.id(volunteerId);

  if (!volunteer) {
    throw new Error('志愿者记录不存在');
  }

  volunteer.status = approved ? 'approved' : 'rejected';
  volunteer.approvedAt = new Date();
  volunteer.approvedBy = approverId;

  if (!approved) {
    // 减少招募计数
    const roleRecruitment = this.volunteerRecruitment.roles.find(
      r => r.role === volunteer.role
    );
    if (roleRecruitment) {
      roleRecruitment.recruited = Math.max(0, roleRecruitment.recruited - 1);
    }
  }

  return this.save();
};

/**
 * 参与者报名
 */
VillageEventSchema.methods.registerParticipant = function(participantData) {
  // 检查是否已报名
  const existing = this.registrations.find(
    r => r.userId.toString() === participantData.userId.toString()
  );

  if (existing) {
    throw new Error('已经报名过了');
  }

  // 检查人数限制
  if (this.maxParticipants > 0) {
    const approvedCount = this.registrations.filter(
      r => r.status === 'approved' || r.status === 'checked_in'
    ).length;

    if (approvedCount >= this.maxParticipants) {
      if (this.allowWaitlist) {
        participantData.status = 'pending';
      } else {
        throw new Error('活动名额已满');
      }
    }
  }

  this.registrations.push({
    ...participantData,
    registeredAt: new Date()
  });

  this.currentParticipants = this.registrations.filter(
    r => r.status === 'approved' || r.status === 'checked_in'
  ).length;

  return this.save();
};

/**
 * 志愿者签到
 */
VillageEventSchema.methods.checkInVolunteer = function(volunteerId, checkInData) {
  const volunteer = this.volunteers.id(volunteerId);

  if (!volunteer) {
    throw new Error('志愿者记录不存在');
  }

  if (volunteer.status === 'checked_in') {
    throw new Error('已经签到过了');
  }

  volunteer.checkInAt = new Date();
  volunteer.checkInBy = checkInData.checkedBy;
  volunteer.checkInLocation = checkInData.location;
  volunteer.status = 'checked_in';

  // 更新签到统计
  if (!this.checkInStats) this.checkInStats = {};
  this.checkInStats.checkedInVolunteers = (this.checkInStats.checkedInVolunteers || 0) + 1;
  this.checkInStats.lastCheckInAt = new Date();

  return this.save();
};

/**
 * 志愿者签退
 */
VillageEventSchema.methods.checkOutVolunteer = function(volunteerId, checkOutData) {
  const volunteer = this.volunteers.id(volunteerId);

  if (!volunteer) {
    throw new Error('志愿者记录不存在');
  }

  if (!volunteer.checkInAt) {
    throw new Error('尚未签到');
  }

  volunteer.checkOutAt = new Date();
  volunteer.checkOutBy = checkOutData.checkedBy;

  // 计算服务时长
  if (volunteer.checkInAt && volunteer.checkOutAt) {
    const diffMs = volunteer.checkOutAt - volunteer.checkInAt;
    volunteer.workHours = Math.round(diffMs / (1000 * 60 * 60) * 10) / 10; // 保留一位小数
  }

  return this.save();
};

/**
 * 参与者签到
 */
VillageEventSchema.methods.checkInParticipant = function(userId, checkInData) {
  const registration = this.registrations.find(
    r => r.userId.toString() === userId.toString()
  );

  if (!registration) {
    throw new Error('报名记录不存在');
  }

  if (registration.checkInAt) {
    throw new Error('已经签到过了');
  }

  registration.checkInAt = new Date();
  registration.checkInMethod = checkInData.method;
  registration.checkInLocation = checkInData.location;

  // 更新签到统计
  if (!this.checkInStats) this.checkInStats = {};
  this.checkInStats.checkedInParticipants = (this.checkInStats.checkedInParticipants || 0) + 1;
  this.checkInStats.lastCheckInAt = new Date();

  return this.save();
};

/**
 * 批量签到
 */
VillageEventSchema.methods.batchCheckIn = function(checkInList) {
  const results = {
    success: [],
    failed: []
  };

  for (const item of checkInList) {
    try {
      if (item.type === 'volunteer') {
        this.checkInVolunteer(item.id, item.data);
        results.success.push({ id: item.id, type: 'volunteer' });
      } else {
        this.checkInParticipant(item.id, item.data);
        results.success.push({ id: item.id, type: 'participant' });
      }
    } catch (error) {
      results.failed.push({ id: item.id, error: error.message });
    }
  }

  return this.save().then(() => results);
};

/**
 * 点赞
 */
VillageEventSchema.methods.toggleLike = function(userId) {
  const existingIndex = this.likes.findIndex(
    l => l.userId.toString() === userId.toString()
  );

  if (existingIndex >= 0) {
    this.likes.splice(existingIndex, 1);
    this.likeCount = Math.max(0, this.likeCount - 1);
  } else {
    this.likes.push({ userId, likedAt: new Date() });
    this.likeCount += 1;
  }

  return this.save();
};

/**
 * 收藏
 */
VillageEventSchema.methods.toggleBookmark = function(userId) {
  const existingIndex = this.bookmarks.findIndex(
    b => b.userId.toString() === userId.toString()
  );

  if (existingIndex >= 0) {
    this.bookmarks.splice(existingIndex, 1);
    this.bookmarkCount = Math.max(0, this.bookmarkCount - 1);
  } else {
    this.bookmarks.push({ userId, bookmarkedAt: new Date() });
    this.bookmarkCount += 1;
  }

  return this.save();
};

/**
 * 添加评论
 */
VillageEventSchema.methods.addComment = function(commentData) {
  this.comments.push({
    ...commentData,
    createdAt: new Date()
  });
  this.commentCount += 1;

  return this.save();
};

/**
 * 添加反馈
 */
VillageEventSchema.methods.addFeedback = function(feedbackData) {
  this.feedbacks.push({
    ...feedbackData,
    submittedAt: new Date()
  });

  return this.save();
};

/**
 * 添加活动总结
 */
VillageEventSchema.methods.addSummary = function(summaryData) {
  this.summary = {
    ...summaryData,
    submittedAt: new Date()
  };

  return this.save();
};

// ==================== 静态方法 ====================

/**
 * 获取村庄活动列表
 */
VillageEventSchema.statics.getVillageEvents = function(villageId, options = {}) {
  const {
    limit = 20,
    skip = 0,
    status,
    eventType,
    upcoming = false,
    past = false
  } = options;

  const query = {
    villageId,
    deleted: false
  };

  if (status) query.status = status;
  if (eventType) query.eventType = eventType;

  if (upcoming) {
    query.scheduledStart = { $gte: new Date() };
  } else if (past) {
    query.scheduledStart = { $lt: new Date() };
  }

  return this.find(query)
    .sort({ scheduledStart: -1, priority: -1 })
    .skip(skip)
    .limit(limit)
    .populate('organizerId', 'name avatar')
    .lean();
};

/**
 * 获取热门活动
 */
VillageEventSchema.statics.getPopularEvents = function(villageId, limit = 10) {
  return this.aggregate([
    {
      $match: {
        villageId: new mongoose.Types.ObjectId(villageId),
        deleted: false,
        status: { $in: ['recruiting', 'ongoing', 'completed'] }
      }
    },
    {
      $addFields: {
        popularityScore: {
          $add: [
            { $multiply: ['$likeCount', 3] },
            { $multiply: ['$bookmarkCount', 2] },
            '$currentParticipants',
            '$shareCount'
          ]
        }
      }
    },
    {
      $sort: { popularityScore: -1, scheduledStart: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

/**
 * 获取用户的志愿者活动
 */
VillageEventSchema.statics.getUserVolunteerEvents = function(userId, options = {}) {
  const { limit = 20, skip = 0, status } = options;

  const query = {
    'volunteers.userId': new mongoose.Types.ObjectId(userId),
    deleted: false
  };

  if (status) query.status = status;

  return this.find(query)
    .sort({ scheduledStart: -1 })
    .skip(skip)
    .limit(limit)
    .populate('organizerId', 'name avatar')
    .lean();
};

/**
 * 获取用户参与的活动
 */
VillageEventSchema.statics.getUserParticipatedEvents = function(userId, options = {}) {
  const { limit = 20, skip = 0 } = options;

  return this.find({
    'registrations.userId': new mongoose.Types.ObjectId(userId),
    deleted: false
  })
    .sort({ scheduledStart: -1 })
    .skip(skip)
    .limit(limit)
    .populate('organizerId', 'name avatar')
    .lean();
};

/**
 * 获取需要签到的活动
 */
VillageEventSchema.statics.getCheckInRequiredEvents = function(options = {}) {
  const { date } = options;
  const startDate = date ? new Date(date) : new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1);

  return this.find({
    status: 'ongoing',
    deleted: false,
    'checkInConfig.enabled': true,
    scheduledStart: { $gte: startDate, $lt: endDate }
  })
    .sort({ scheduledStart: 1 })
    .populate('organizerId', 'name avatar')
    .lean();
};

/**
 * 获取活动统计
 */
VillageEventSchema.statics.getVillageStats = function(villageId) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  return this.aggregate([
    {
      $match: {
        villageId: new mongoose.Types.ObjectId(villageId),
        deleted: false
      }
    },
    {
      $facet: {
        total: [
          { $count: 'count' }
        ],
        byStatus: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ],
        byType: [
          {
            $group: {
              _id: '$eventType',
              count: { $sum: 1 }
            }
          }
        ],
        thisMonth: [
          {
            $match: {
              scheduledStart: { $gte: monthStart }
            }
          },
          { $count: 'count' }
        ],
        totalVolunteers: [
          {
            $group: {
              _id: null,
              total: { $sum: { $size: '$volunteers' } },
              checkedIn: {
                $sum: {
                  $size: {
                    $filter: {
                      input: '$volunteers',
                      cond: { $eq: ['$$this.status', 'checked_in'] }
                    }
                  }
                }
              }
            }
          }
        ],
        totalParticipants: [
          {
            $group: {
              _id: null,
              total: { $sum: { $size: '$registrations' } },
              checkedIn: {
                $sum: {
                  $size: {
                    $filter: {
                      input: '$registrations',
                      cond: { $ifNull: ['$$this.checkInAt', false] }
                    }
                  }
                }
              }
            }
          }
        ]
      }
    }
  ]);
};

// ==================== 中间件 ====================

VillageEventSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('VillageEvent', VillageEventSchema);
module.exports.EventType = EventType;
module.exports.EventStatus = EventStatus;
module.exports.RegistrationStatus = RegistrationStatus;
module.exports.VolunteerRole = VolunteerRole;
