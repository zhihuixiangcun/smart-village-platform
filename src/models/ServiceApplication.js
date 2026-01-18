/**
 * ServiceApplication Model
 * 服务申请数据模型
 *
 * 功能：
 * - 管理村民在线办事申请
 * - 支持多种服务类型（证明、证件、补贴等）
 * - 跟踪申请状态和审批流程
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * 服务类型枚举
 */
const ServiceTypes = {
  IDENTITY_CERTIFICATE: 'identity_certificate',    // 身份证明
  RESIDENCE_CERTIFICATE: 'residence_certificate',  // 居住证明
  INCOME_CERTIFICATE: 'income_certificate',        // 收入证明
  MARRIAGE_CERTIFICATE: 'marriage_certificate',    // 婚姻证明
  BIRTH_CERTIFICATE: 'birth_certificate',          // 出生证明
  PROPERTY_CERTIFICATE: 'property_certificate',    // 财产证明
  AGRICULTURE_SUBSIDY: 'agriculture_subsidy',      // 农业补贴
  POVERTY_AID: 'poverty_aid',                      // 困难救助
  HOUSING_APPLICATION: 'housing_application',      // 住房申请
  LAND_USE: 'land_use',                            // 土地使用
  BUSINESS_LICENSE: 'business_license',            // 营业执照
  OTHER: 'other'                                   // 其他
};

/**
 * 申请状态枚举
 */
const ApplicationStatus = {
  DRAFT: 'draft',              // 草稿
  SUBMITTED: 'submitted',      // 已提交
  UNDER_REVIEW: 'under_review', // 审核中
  APPROVED: 'approved',        // 已批准
  REJECTED: 'rejected',        // 已拒绝
  PROCESSING: 'processing',    // 处理中
  COMPLETED: 'completed',      // 已完成
  CANCELLED: 'cancelled'       // 已取消
};

/**
 * 服务申请Schema
 */
const serviceApplicationSchema = new Schema({
  // 申请编号（自动生成）
  applicationNumber: {
    type: String,
    unique: true,
    required: true,
    index: true
  },

  // 申请人信息
  applicant: {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    idCard: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },

  // 服务类型
  serviceType: {
    type: String,
    required: true,
    enum: Object.values(ServiceTypes),
    index: true
  },

  // 服务标题
  title: {
    type: String,
    required: true
  },

  // 申请详情
  description: {
    type: String,
    required: true
  },

  // 申请数据（JSON格式，灵活存储不同类型的数据）
  formData: {
    type: Schema.Types.Mixed,
    default: {}
  },

  // 附件列表
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 申请状态
  status: {
    type: String,
    required: true,
    enum: Object.values(ApplicationStatus),
    default: ApplicationStatus.DRAFT,
    index: true
  },

  // 审批信息
  approval: {
    // 审批人
    reviewer: {
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      name: String
    },
    // 审批意见
    comments: String,
    // 审批时间
    reviewedAt: Date,
    // 预计完成时间
    expectedCompletionDate: Date,
    // 实际完成时间
    completedAt: Date
  },

  // 处理记录
  processHistory: [{
    action: {
      type: String,
      enum: ['created', 'submitted', 'approved', 'rejected', 'cancelled', 'completed', 'commented']
    },
    actor: {
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      name: String,
      role: String
    },
    comment: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // 村庄信息
  villageId: {
    type: Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 优先级
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  // 是否需要费用
  fee: {
    amount: {
      type: Number,
      default: 0
    },
    paid: {
      type: Boolean,
      default: false
    },
    transactionId: String
  },

  // 元数据
  metadata: {
    ipAddress: String,
    userAgent: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'wechat', 'offline'],
      default: 'web'
    }
  },

  // 软删除
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/**
 * 索引优化
 */
serviceApplicationSchema.index({ applicant: 1, status: 1 });
serviceApplicationSchema.index({ villageId: 1, status: 1 });
serviceApplicationSchema.index({ serviceType: 1, createdAt: -1 });
serviceApplicationSchema.index({ 'applicant.userId': 1, createdAt: -1 });

/**
 * 生成申请编号
 */
serviceApplicationSchema.pre('save', async function(next) {
  if (this.isNew && !this.applicationNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // 获取当天申请数量
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999))
      }
    });

    const sequence = String(count + 1).padStart(4, '0');
    this.applicationNumber = `SA${year}${month}${day}${sequence}`;
  }
  next();
});

/**
 * 虚拟字段：处理天数
 */
serviceApplicationSchema.virtual('processingDays').get(function() {
  const created = new Date(this.createdAt);
  const now = this.approval.completedAt ? new Date(this.approval.completedAt) : new Date();
  return Math.floor((now - created) / (1000 * 60 * 60 * 24));
});

/**
 * 虚拟字段：是否逾期
 */
serviceApplicationSchema.virtual('isOverdue').get(function() {
  if (!this.approval.expectedCompletionDate) return false;
  if (this.status === ApplicationStatus.COMPLETED) return false;
  return new Date() > this.approval.expectedCompletionDate;
});

/**
 * 实例方法：添加处理记录
 */
serviceApplicationSchema.methods.addProcessHistory = function(action, actor, comment) {
  this.processHistory.push({
    action,
    actor: {
      userId: actor.userId,
      name: actor.name,
      role: actor.role
    },
    comment,
    timestamp: new Date()
  });
  return this.save();
};

/**
 * 实例方法：更新状态
 */
serviceApplicationSchema.methods.updateStatus = function(newStatus, reviewer, comment) {
  this.status = newStatus;

  if (reviewer) {
    this.approval.reviewer = {
      userId: reviewer.userId,
      name: reviewer.name
    };
    this.approval.reviewedAt = new Date();
    this.approval.comments = comment;
  }

  if (newStatus === ApplicationStatus.COMPLETED) {
    this.approval.completedAt = new Date();
  }

  return this.addProcessHistory(
    newStatus,
    reviewer || { userId: this.applicant.userId, name: this.applicant.name, role: 'applicant' },
    comment
  );
};

/**
 * 静态方法：获取申请人统计
 */
serviceApplicationSchema.statics.getApplicantStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { 'applicant.userId': mongoose.Types.ObjectId(userId), isDeleted: false } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  return stats.reduce((acc, stat) => {
    acc[stat._id] = stat.count;
    return acc;
  }, {});
};

/**
 * 静态方法：获取村庄统计
 */
serviceApplicationSchema.statics.getVillageStats = async function(villageId, startDate, endDate) {
  const matchCondition = {
    villageId: mongoose.Types.ObjectId(villageId),
    isDeleted: false
  };

  if (startDate && endDate) {
    matchCondition.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const stats = await this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: '$serviceType',
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', ApplicationStatus.COMPLETED] }, 1, 0] }
        },
        pending: {
          $sum: { $cond: [{ $in: ['$status', [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW]] }, 1, 0] }
        }
      }
    }
  ]);

  return stats;
};

/**
 * 静态方法：获取待处理申请
 */
serviceApplicationSchema.statics.getPendingApplications = function(villageId, limit = 50) {
  return this.find({
    villageId,
    status: { $in: [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW] },
    isDeleted: false
  })
    .sort({ createdAt: 1, priority: -1 })
    .limit(limit)
    .populate('applicant.userId', 'name phone')
    .lean();
};

/**
 * 静态方法：搜索申请
 */
serviceApplicationSchema.statics.searchApplications = function(filters, options = {}) {
  const {
    villageId,
    userId,
    serviceType,
    status,
    keyword,
    startDate,
    endDate,
    priority,
    page = 1,
    limit = 20
  } = filters;

  const query = { isDeleted: false };

  if (villageId) query.villageId = villageId;
  if (userId) query['applicant.userId'] = userId;
  if (serviceType) query.serviceType = serviceType;
  if (status) query.status = status;
  if (priority) query.priority = priority;

  if (keyword) {
    query.$or = [
      { title: { $regex: keyword, $options: 'i' } },
      { applicationNumber: { $regex: keyword, $options: 'i' } },
      { 'applicant.name': { $regex: keyword, $options: 'i' } },
      { 'applicant.phone': { $regex: keyword, $options: 'i' } }
    ];
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  return Promise.all([
    this.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('applicant.userId', 'name phone')
      .populate('approval.reviewer.userId', 'name')
      .lean(),
    this.countDocuments(query)
  ]).then(([results, total]) => ({
    results,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  }));
};

const ServiceApplication = mongoose.model('ServiceApplication', serviceApplicationSchema);

module.exports = ServiceApplication;
module.exports.ServiceTypes = ServiceTypes;
module.exports.ApplicationStatus = ApplicationStatus;
