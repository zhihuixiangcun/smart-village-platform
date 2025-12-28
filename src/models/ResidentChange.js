/**
 * 村民变动记录模型
 * 记录村民的各种状态变动：务农、务工、新生、死亡、婚入、婚出、迁入、迁出、返乡、其他
 */

const mongoose = require('mongoose');

// 变动类型枚举
const ChangeTypes = {
  FARMING: 'farming',           // 务农
  MIGRANT_WORK: 'migrant_work', // 务工
  BIRTH: 'birth',               // 新生
  DEATH: 'death',               // 死亡
  MARRIAGE_IN: 'marriage_in',   // 婚入
  MARRIAGE_OUT: 'marriage_out', // 婚出
  MOVE_IN: 'move_in',           // 迁入
  MOVE_OUT: 'move_out',         // 迁出
  RETURN: 'return',             // 返乡
  OTHER: 'other'                // 其他
};

// 变动状态枚举
const ChangeStatus = {
  PENDING: 'pending',    // 待审核
  APPROVED: 'approved',  // 已通过
  REJECTED: 'rejected',  // 已拒绝
  CANCELLED: 'cancelled' // 已取消
};

// 审批级别枚举
const ApprovalLevel = {
  VILLAGE: 'village',   // 村级审批
  TOWN: 'town',         // 乡镇审批
  COUNTY: 'county'      // 县级审批
};

const residentChangeSchema = new mongoose.Schema({
  // 关联村民
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: true,
    index: true
  },

  // 关联村庄
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 关联家庭（如果适用）
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family'
  },

  // 变动类型
  changeType: {
    type: String,
    enum: Object.values(ChangeTypes),
    required: true,
    index: true
  },

  // 变动类型名称（中文显示）
  changeTypeName: {
    type: String,
    required: true
  },

  // 变动状态
  status: {
    type: String,
    enum: Object.values(ChangeStatus),
    default: ChangeStatus.PENDING,
    index: true
  },

  // 审批级别
  approvalLevel: {
    type: String,
    enum: Object.values(ApprovalLevel),
    default: ApprovalLevel.VILLAGE
  },

  // 时间管理
  changeDate: {
    type: Date,
    required: true,
    description: '变动发生时间（实际事件发生日期）'
  },
  registerDate: {
    type: Date,
    default: Date.now,
    description: '变动登记时间（录入系统的时间）'
  },
  effectiveDate: {
    type: Date,
    description: '变动生效时间（变动正式生效的日期）'
  },
  approveDate: {
    type: Date,
    description: '变动审核通过时间'
  },

  // 变动原因
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },

  // 变动前状态
  previousStatus: {
    type: String,
    description: '变动前的村民状态'
  },

  // 变动后状态
  newStatus: {
    type: String,
    description: '变动后的村民状态'
  },

  // 证明材料文件列表
  proofFiles: [{
    fileName: {
      type: String,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      enum: ['image', 'pdf', 'doc', 'docx', 'other']
    },
    fileSize: {
      type: Number // 字节
    },
    uploadDate: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // 审核信息
  approverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approverName: {
    type: String
  },
  approvalRemark: {
    type: String,
    maxlength: 500
  },

  // 备注信息
  remark: {
    type: String,
    maxlength: 500
  },

  // 关联村民（如婚入婚出的配偶、新生儿的父母等）
  relatedResidents: [{
    residentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resident'
    },
    name: String,
    relationship: String,
    idCard: String
  }],

  // 务工详细信息（仅变动类型为务工时填写）
  migrantWorkInfo: {
    workProvince: String,
    workCity: String,
    workCompany: String,
    industry: String,
    monthlyIncome: Number,
    workAddress: String,
    workPhone: String
  },

  // 死亡详细信息（仅变动类型为死亡时填写）
  deathInfo: {
    deathCause: String,
    deathPlace: String,
    funeralDate: Date,
    deathCertificateNumber: String
  },

  // 婚姻详细信息（仅变动类型为婚入/婚出时填写）
  marriageInfo: {
    spouseName: {
      type: String,
      required: function() {
        return ['marriage_in', 'marriage_out'].includes(this.changeType);
      }
    },
    spouseIdCard: String,
    marriageCertificateNumber: String,
    marriageDate: Date,
    originalLocation: String,    // 原户籍地（婚入）或 迁入地（婚出）
    newLocation: String          // 新户籍地
  },

  // 迁移详细信息（仅变动类型为迁入/迁出时填写）
  migrationInfo: {
    fromLocation: String,         // 迁出地
    toLocation: String,           // 迁入地
    approvalNumber: String,       // 审批文号
    approvalAuthority: String,    // 审批机关
    migrationReason: String       // 迁移原因
  },

  // 新生儿详细信息（仅变动类型为新生时填写）
  birthInfo: {
    fatherName: String,
    fatherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resident'
    },
    motherName: String,
    motherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resident'
    },
    birthPlace: String,
    birthCertificateNumber: String
  },

  // 返乡详细信息（仅变动类型为返乡时填写）
  returnInfo: {
    previousWorkLocation: String,
    previousWorkCompany: String,
    returnReason: String,
    plannedActivity: String       // 返乡后计划从事的活动
  },

  // 预警标记
  alertFlags: {
    isFrequentChange: {
      type: Boolean,
      default: false,
      description: '短时间内频繁变动'
    },
    isMissingDocuments: {
      type: Boolean,
      default: false,
      description: '缺少必要证明材料'
    },
    isExpiringSoon: {
      type: Boolean,
      default: false,
      description: '证明材料即将过期'
    },
    requiresAttention: {
      type: Boolean,
      default: false,
      description: '需要特别关注'
    }
  },

  // 变动来源
  source: {
    type: String,
    enum: ['admin', 'self', 'family', 'system', 'other'],
    default: 'admin',
    description: '变动记录的来源'
  },

  // 操作人信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  creatorName: {
    type: String,
    required: true
  },

  // 最后修改人
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updaterName: String,

  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'residentChanges'
});

// 复合索引
residentChangeSchema.index({ villageId: 1, status: 1, createdAt: -1 });
residentChangeSchema.index({ residentId: 1, changeDate: -1 });
residentChangeSchema.index({ changeType: 1, status: 1 });
residentChangeSchema.index({ createdAt: -1 });
residentChangeSchema.index({ changeDate: -1 });

// 虚拟字段 - 是否已完成审批
residentChangeSchema.virtual('isApproved').get(function() {
  return this.status === ChangeStatus.APPROVED;
});

// 虚拟字段 - 是否待处理
residentChangeSchema.virtual('isPending').get(function() {
  return this.status === ChangeStatus.PENDING;
});

// 虚拟字段 - 审批进度百分比
residentChangeSchema.virtual('approvalProgress').get(function() {
  switch (this.status) {
    case ChangeStatus.PENDING:
      return 50;
    case ChangeStatus.APPROVED:
      return 100;
    case ChangeStatus.REJECTED:
    case ChangeStatus.CANCELLED:
      return 0;
    default:
      return 0;
  }
});

// 虚拟字段 - 处理时长（天数）
residentChangeSchema.virtual('processingDays').get(function() {
  if (this.approveDate && this.registerDate) {
    return Math.ceil((this.approveDate - this.registerDate) / (1000 * 60 * 60 * 24));
  }
  if (this.registerDate) {
    return Math.ceil((new Date() - this.registerDate) / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// 实例方法 - 审批变动
residentChangeSchema.methods.approve = function(approverId, approverName, remark = '') {
  this.status = ChangeStatus.APPROVED;
  this.approverId = approverId;
  this.approverName = approverName;
  this.approvalRemark = remark;
  this.approveDate = new Date();

  // 如果没有设置生效时间，默认为审批通过后立即生效
  if (!this.effectiveDate) {
    this.effectiveDate = new Date();
  }

  return this.save();
};

// 实例方法 - 拒绝变动
residentChangeSchema.methods.reject = function(approverId, approverName, reason) {
  this.status = ChangeStatus.REJECTED;
  this.approverId = approverId;
  this.approverName = approverName;
  this.approvalRemark = reason;
  return this.save();
};

// 实例方法 - 取消变动
residentChangeSchema.methods.cancel = function(reason = '') {
  this.status = ChangeStatus.CANCELLED;
  this.remark = reason;
  return this.save();
};

// 实例方法 - 添加证明材料
residentChangeSchema.methods.addProofFile = function(fileData) {
  this.proofFiles.push({
    ...fileData,
    uploadDate: new Date()
  });
  return this.save();
};

// 实例方法 - 检查是否需要高级审批
residentChangeSchema.methods.requiresHighLevelApproval = function() {
  const highLevelTypes = [ChangeTypes.MOVE_IN, ChangeTypes.MOVE_OUT];
  return highLevelTypes.includes(this.changeType);
};

// 实例方法 - 设置预警标记
residentChangeSchema.methods.setAlertFlag = function(flag, value = true) {
  if (this.alertFlags.hasOwnProperty(flag)) {
    this.alertFlags[flag] = value;
    return this.save();
  }
  throw new Error(`Invalid alert flag: ${flag}`);
};

// 静态方法 - 根据村民ID获取变动历史
residentChangeSchema.statics.getResidentChangeHistory = function(residentId, options = {}) {
  const {
    limit = 50,
    skip = 0,
    sortBy = 'changeDate',
    sortOrder = -1
  } = options;

  return this.find({ residentId })
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .populate('approverId', 'name')
    .populate('createdBy', 'name');
};

// 静态方法 - 获取待审核变动列表
residentChangeSchema.statics.getPendingChanges = function(villageId, options = {}) {
  const {
    changeType,
    limit = 20,
    skip = 0
  } = options;

  const query = {
    villageId,
    status: ChangeStatus.PENDING
  };

  if (changeType) {
    query.changeType = changeType;
  }

  return this.find(query)
    .sort({ registerDate: 1 }) // 先登记的先处理
    .skip(skip)
    .limit(limit)
    .populate('residentId', 'name idCard phone')
    .populate('createdBy', 'name');
};

// 静态方法 - 获取村庄变动统计
residentChangeSchema.statics.getVillageChangeStats = function(villageId, startDate, endDate) {
  const matchStage = {
    villageId: new mongoose.Types.ObjectId(villageId)
  };

  if (startDate || endDate) {
    matchStage.changeDate = {};
    if (startDate) matchStage.changeDate.$gte = new Date(startDate);
    if (endDate) matchStage.changeDate.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$changeType',
        count: { $sum: 1 },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', ChangeStatus.PENDING] }, 1, 0] }
        },
        approved: {
          $sum: { $cond: [{ $eq: ['$status', ChangeStatus.APPROVED] }, 1, 0] }
        },
        rejected: {
          $sum: { $cond: [{ $eq: ['$status', ChangeStatus.REJECTED] }, 1, 0] }
        }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// 静态方法 - 检测频繁变动
residentChangeSchema.statics.detectFrequentChanges = function(residentId, days = 30, threshold = 3) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.countDocuments({
    residentId,
    changeDate: { $gte: startDate },
    status: { $ne: ChangeStatus.CANCELLED }
  }).then(count => {
    return count >= threshold;
  });
};

// 静态方法 - 获取变动趋势数据
residentChangeSchema.statics.getChangeTrends = function(villageId, months = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  return this.aggregate([
    {
      $match: {
        villageId: new mongoose.Types.ObjectId(villageId),
        changeDate: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$changeDate' },
          month: { $month: '$changeDate' },
          changeType: '$changeType'
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);
};

// 中间件 - 保存前更新时间
residentChangeSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 中间件 - 保存后触发通知
residentChangeSchema.post('save', function(doc) {
  // 这里可以触发通知逻辑
  // 例如：发送短信、推送通知等
  if (doc.status === ChangeStatus.APPROVED && !doc.wasApproved) {
    // 变动被审批通过，发送通知
    console.log(`变动 ${doc._id} 已审批通过，应发送通知给村民`);
  }
});

// 导出模型和枚举
const ResidentChange = mongoose.model('ResidentChange', residentChangeSchema);

module.exports = {
  ResidentChange,
  ChangeTypes,
  ChangeStatus,
  ApprovalLevel
};
