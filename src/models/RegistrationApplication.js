/**
 * 用户注册申请模型
 *
 * 支持三种类型的注册申请：
 * - resident: 村民注册
 * - village_admin: 村管理员注册
 * - township_admin: 乡镇管理员注册
 *
 * @module models/RegistrationApplication
 */

const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

const registrationApplicationSchema = new mongoose.Schema({
  // 申请类型
  applicationType: {
    type: String,
    enum: ['resident', 'village_admin', 'township_admin'],
    required: true,
    index: true
  },

  // 申请人基本信息
  applicant: {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true,
      validate: {
        validator(v) {
          return /^1[3-9]\d{9}$/.test(v);
        },
        message: '手机号格式不正确'
      }
    },
    idCard: {
      type: String,
      required: true,
      set(v) {
        // 加密存储身份证号
        try {
          return encrypt(v);
        } catch (error) {
          logger.error('身份证号加密失败:', error);
          return v;
        }
      },
      select: false // 默认不返回，需要显式查询
    },
    idCardFront: {
      fileName: String,
      fileUrl: String,
      ocrResult: mongoose.Schema.Types.Mixed
    },
    idCardBack: {
      fileName: String,
      fileUrl: String,
      ocrResult: mongoose.Schema.Types.Mixed
    }
  },

  // 村民专属信息
  residentInfo: {
    villageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Village'
    },
    householdBookUrl: String,
    isNonLocal: {
      type: Boolean,
      default: false
    },
    nonLocalReason: {
      type: String,
      enum: ['newborn', 'marriage', 'migration', 'other']
    },
    otherReasonDetails: {
      purpose: String,
      hasFixedResidence: Boolean,
      yearsOfResidence: Number,
      residenceLocation: String,
      contactPhone: String
    }
  },

  // 村管理员专属信息
  villageAdminInfo: {
    villageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Village',
      required() {
        return this.applicationType === 'village_admin';
      }
    },
    position: {
      type: String,
      enum: ['村支书', '村委会主任', '村委委员', '会计', '妇女主任'],
      required() {
        return this.applicationType === 'village_admin';
      }
    },
    appointmentLetterUrl: {
      type: String,
      required() {
        return this.applicationType === 'village_admin';
      }
    }
  },

  // 乡镇管理员专属信息
  townshipAdminInfo: {
    townshipId: String,
    position: String,
    appointmentLetterUrl: {
      type: String,
      required() {
        return this.applicationType === 'township_admin';
      }
    }
  },

  // OCR验证结果
  ocrVerification: {
    idCardVerified: {
      type: Boolean,
      default: false
    },
    extractedInfo: {
      name: String,
      idCard: String,
      gender: String,
      ethnicity: String,
      birthDate: Date,
      address: String,
      issuingAuthority: String,
      validDate: String
    },
    confidenceScore: Number,
    verifiedAt: Date
  },

  // 审批流程
  approval: {
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected', 'requires_info'],
      default: 'pending',
      index: true
    },
    currentStage: {
      type: String,
      enum: ['village_review', 'township_review', 'super_admin_review'],
      default() {
        // 根据申请类型设置初始阶段
        if (this.applicationType === 'resident') {
          return 'village_review';
        } else if (this.applicationType === 'village_admin') {
          return 'village_review';
        } else {
          return 'township_review';
        }
      }
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    reviewedBy: [{
      reviewerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reviewerName: String,
      reviewerRole: String,
      decision: {
        type: String,
        enum: ['approved', 'rejected', 'forwarded', 'request_info']
      },
      comments: String,
      reviewedAt: {
        type: Date,
        default: Date.now
      }
    }],
    finalDecision: {
      decision: String,
      decisionBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      decisionAt: Date,
      notes: String
    }
  },

  // 状态追踪历史
  statusHistory: [{
    status: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    comments: String
  }],

  // 附件列表
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],

  // 元数据
  metadata: {
    ipAddress: String,
    userAgent: String,
    submittedFrom: {
      type: String,
      enum: ['web', 'mobile', 'admin'],
      default: 'web'
    },
    sessionId: String
  },

  // 关联用户（批准后创建）
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// 索引
registrationApplicationSchema.index({ applicationType: 1, 'approval.status': 1 });
registrationApplicationSchema.index({ 'applicant.phone': 1 });
// createdAt索引已由timestamps: true自动创建,无需手动指定
registrationApplicationSchema.index({ 'approval.status': 1, 'approval.currentStage': 1 });

// 虚拟字段：获取解密后的身份证号
registrationApplicationSchema.virtual('applicant.idCardDecrypted').get(function() {
  if (!this.applicant.idCard) return null;
  try {
    return decrypt(this.applicant.idCard);
  } catch (error) {
    logger.error('身份证号解密失败:', error);
    return null;
  }
});

// 实例方法：更新审批状态
registrationApplicationSchema.methods.updateApprovalStatus = function(status, reviewerId, comments) {
  this.approval.status = status;
  this.statusHistory.push({
    status,
    changedBy: reviewerId,
    comments
  });
  return this.save();
};

// 实例方法：添加审批记录
registrationApplicationSchema.methods.addReview = function(reviewerData) {
  this.approval.reviewedBy.push({
    reviewerId: reviewerData.reviewerId,
    reviewerName: reviewerData.reviewerName,
    reviewerRole: reviewerData.reviewerRole,
    decision: reviewerData.decision,
    comments: reviewerData.comments,
    reviewedAt: new Date()
  });
  return this.save();
};

// 静态方法：检查重复申请
registrationApplicationSchema.statics.checkDuplicateApplication = async function(phone, idCard) {
  return this.findOne({
    $or: [
      { 'applicant.phone': phone },
      { 'applicant.idCard': idCard }
    ],
    'approval.status': { $in: ['pending', 'under_review'] }
  });
};

// 静态方法：获取待审批列表
registrationApplicationSchema.statics.getPendingApplications = async function(filters = {}) {
  const query = {
    'approval.status': { $in: ['pending', 'under_review'] }
  };

  if (filters.applicationType) {
    query.applicationType = filters.applicationType;
  }

  if (filters.villageId) {
    query.$or = [
      { 'residentInfo.villageId': filters.villageId },
      { 'villageAdminInfo.villageId': filters.villageId }
    ];
  }

  if (filters.currentStage) {
    query['approval.currentStage'] = filters.currentStage;
  }

  return this.find(query)
    .populate('residentInfo.villageId', 'name')
    .populate('villageAdminInfo.villageId', 'name')
    .sort({ createdAt: -1 });
};

// 中间件：保存前验证
registrationApplicationSchema.pre('save', function(next) {
  // 验证必填字段
  if (this.applicationType === 'resident') {
    if (!this.residentInfo?.villageId) {
      return next(new Error('村民注册必须指定村庄'));
    }
  } else if (this.applicationType === 'village_admin') {
    if (!this.villageAdminInfo?.villageId || !this.villageAdminInfo?.position) {
      return next(new Error('村管理员注册必须指定村庄和职务'));
    }
  } else if (this.applicationType === 'township_admin') {
    if (!this.townshipAdminInfo?.townshipId) {
      return next(new Error('乡镇管理员注册必须指定乡镇'));
    }
  }

  // 验证外村村民必须填写详细信息
  if (this.residentInfo?.isNonLocal && this.residentInfo?.nonLocalReason === 'other') {
    const details = this.residentInfo.otherReasonDetails;
    if (!details?.purpose || details?.hasFixedResidence === undefined) {
      return next(new Error('外村村民选择"其他"时必须填写详细信息'));
    }
  }

  next();
});

// 中间件：保存后记录审计日志
registrationApplicationSchema.post('save', function(doc) {
  if (doc.wasNew || doc.modifiedPaths().includes('approval.status')) {
    logger.info(`注册申请${doc.wasNew ? '创建' : '更新'}:`, {
      applicationId: doc._id,
      type: doc.applicationType,
      status: doc.approval.status,
      phone: doc.applicant.phone
    });
  }
});

const RegistrationApplication = mongoose.model('RegistrationApplication', registrationApplicationSchema);

module.exports = RegistrationApplication;
