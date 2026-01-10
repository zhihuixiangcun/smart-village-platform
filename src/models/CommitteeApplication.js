/**
 * CommitteeApplication.js - 村干部审核申请模型
 *
 * 管理村干部账号申请、角色变更、权限分配等审核流程
 * 支持多级审批和完整的审计跟踪
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * 申请Schema
 */
const committeeApplicationSchema = new Schema({
  // 申请ID（唯一标识）
  applicationId: {
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
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    idCard: {
      type: String,
      required: true,
      set(value) {
        // 存储加密的身份证号
        const { encryptData } = require('../utils/encryption');
        if (value && !value.startsWith('encrypted:')) {
          return `encrypted:${encryptData(value)}`;
        }
        return value;
      }
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator(v) {
          return /^1[3-9]\d{9}$/.test(v);
        },
        message: '手机号格式不正确'
      }
    },
    photo: {
      type: String,
      default: null
    },
    currentRole: {
      type: String,
      enum: [null, 'secretary', 'village_head', 'accountant',
        'population_admin', 'security_director', 'resident'],
      default: null
    }
  },

  // 申请类型
  applicationType: {
    type: String,
    enum: ['new_account', 'role_change', 'permission_grant', 'role_resign'],
    required: true,
    index: true
  },

  // 目标角色
  targetRole: {
    type: String,
    enum: ['secretary', 'village_head', 'accountant',
      'population_admin', 'security_director'],
    required() {
      return ['new_account', 'role_change'].includes(this.applicationType);
    }
  },

  // 目标权限（用于权限申请）
  targetPermissions: [{
    type: String
  }],

  // 附件材料
  documents: [{
    type: {
      type: String,
      enum: ['id_card_front', 'id_card_back', 'appointment_letter',
        'resignation_letter', 'other'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    fileName: String,
    fileSize: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    ocrData: Schema.Types.Mixed  // OCR识别的数据
  }],

  // 审核工作流
  approvalWorkflow: [{
    step: {
      type: Number,
      required: true
    },
    role: {
      type: String,
      enum: ['secretary', 'village_head'],
      required: true
    },
    approverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approverName: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'skipped'],
      default: 'pending'
    },
    comment: {
      type: String,
      default: null
    },
    timestamp: {
      type: Date,
      default: null
    },
    // 审核附件（如审批文件）
    attachments: [{
      url: String,
      fileName: String
    }]
  }],

  // 当前状态
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
  },

  // 村庄ID
  villageId: {
    type: Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 审计字段
  submittedAt: {
    type: Date,
    default: Date.now
  },
  submittedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  completedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },

  // 撤销信息
  cancelledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancelReason: {
    type: String,
    default: null
  },

  // 备注
  notes: {
    type: String,
    default: null
  },

  // 元数据
  metadata: {
    ipAddress: String,
    userAgent: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'api', 'admin'],
      default: 'web'
    }
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==================== 索引 ====================

// 复合索引：村庄 + 状态 + 提交时间
committeeApplicationSchema.index({ villageId: 1, status: 1, submittedAt: -1 });

// 复合索引：申请人 + 状态
committeeApplicationSchema.index({ 'applicant.userId': 1, status: 1 });

// 复合索引：申请类型 + 状态
committeeApplicationSchema.index({ applicationType: 1, status: 1 });

// ==================== 虚拟字段 ====================

// 虚拟字段：当前审批步骤
committeeApplicationSchema.virtual('currentStep').get(function() {
  if (!this.approvalWorkflow || this.approvalWorkflow.length === 0) {
    return 0;
  }
  const pendingStep = this.approvalWorkflow.findIndex(step => step.status === 'pending');
  return pendingStep >= 0 ? pendingStep + 1 : this.approvalWorkflow.length;
});

// 虚拟字段：是否可以撤销
committeeApplicationSchema.virtual('canCancel').get(function() {
  return ['pending', 'under_review'].includes(this.status);
});

// 虚拟字段：进度百分比
committeeApplicationSchema.virtual('progress').get(function() {
  if (!this.approvalWorkflow || this.approvalWorkflow.length === 0) {
    return 0;
  }
  const completed = this.approvalWorkflow.filter(
    step => step.status === 'approved' || step.status === 'skipped'
  ).length;
  return Math.round((completed / this.approvalWorkflow.length) * 100);
});

// ==================== 实例方法 ====================

/**
 * 初始化审批工作流
 * @returns {Promise<Document>}
 */
committeeApplicationSchema.methods.initWorkflow = function() {
  // 根据申请类型设置审批流程
  const workflowSteps = [];

  switch (this.applicationType) {
  case 'new_account':
    // 新账号申请：村支书审批
    workflowSteps.push({
      step: 1,
      role: 'secretary',
      status: 'pending'
    });
    break;

  case 'role_change':
    // 角色变更：村支书审批
    workflowSteps.push({
      step: 1,
      role: 'secretary',
      status: 'pending'
    });
    break;

  case 'permission_grant':
    // 权限授予：村支书审批
    workflowSteps.push({
      step: 1,
      role: 'secretary',
      status: 'pending'
    });
    break;

  case 'role_resign':
    // 离职申请：村支书审批
    workflowSteps.push({
      step: 1,
      role: 'secretary',
      status: 'pending'
    });
    break;
  }

  this.approvalWorkflow = workflowSteps;
  return this.save();
};

/**
 * 处理审批步骤
 * @param {number} step - 步骤编号
 * @param {string} action - 操作（approve/reject）
 * @param {string} approverId - 审批人ID
 * @param {string} comment - 审批意见
 * @returns {Promise<Document>}
 */
committeeApplicationSchema.methods.processApproval = async function(step, action, approverId, comment = '') {
  const workflowStep = this.approvalWorkflow.find(s => s.step === step);

  if (!workflowStep) {
    throw new Error('审批步骤不存在');
  }

  if (workflowStep.status !== 'pending') {
    throw new Error('该步骤已处理');
  }

  // 更新步骤状态
  workflowStep.status = action === 'approve' ? 'approved' : 'rejected';
  workflowStep.approverId = approverId;
  workflowStep.comment = comment;
  workflowStep.timestamp = new Date();

  // 获取审批人姓名
  const User = mongoose.model('User');
  const approver = await User.findById(approverId);
  if (approver) {
    workflowStep.approverName = approver.name;
  }

  // 更新申请状态
  if (action === 'reject') {
    this.status = 'rejected';
    this.rejectionReason = comment;
    this.completedAt = new Date();
  } else {
    // 检查是否所有步骤都已完成
    const allApproved = this.approvalWorkflow.every(
      s => s.status === 'approved' || s.status === 'skipped'
    );

    if (allApproved) {
      this.status = 'approved';
      this.completedAt = new Date();
    } else {
      this.status = 'under_review';
    }
  }

  return this.save();
};

/**
 * 撤销申请
 * @param {string} userId - 撤销人ID
 * @param {string} reason - 撤销原因
 * @returns {Promise<Document>}
 */
committeeApplicationSchema.methods.cancel = function(userId, reason = '') {
  if (!this.canCancel) {
    throw new Error('当前状态不允许撤销申请');
  }

  this.status = 'cancelled';
  this.cancelledBy = userId;
  this.cancelledAt = new Date();
  this.cancelReason = reason;

  return this.save();
};

/**
 * 添加文档
 * @param {Object} doc - 文档信息
 * @returns {Promise<Document>}
 */
committeeApplicationSchema.methods.addDocument = function(doc) {
  this.documents.push({
    ...doc,
    uploadDate: new Date()
  });
  return this.save();
};

/**
 * 获取脱敏的申请人身份证号
 * @returns {string}
 */
committeeApplicationSchema.methods.getMaskedIdCard = function() {
  if (this.applicant.idCard && this.applicant.idCard.startsWith('encrypted:')) {
    const { decryptData } = require('../utils/encryption');
    const decrypted = decryptData(this.applicant.idCard.replace('encrypted:', ''));
    return decrypted.replace(/^(.{6})(.*)(.{4})$/, '$1********$3');
  }
  return '**************';
};

// ==================== 静态方法 ====================

/**
 * 生成申请ID
 * @returns {string}
 */
committeeApplicationSchema.statics.generateApplicationId = function() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `APP${year}${month}${day}${random}`;
};

/**
 * 获取村庄的待处理申请
 * @param {string} villageId - 村庄ID
 * @param {string} role - 审批角色
 * @returns {Promise<Document[]>}
 */
committeeApplicationSchema.statics.getPendingApplications = function(villageId, role) {
  return this.find({
    villageId,
    status: { $in: ['pending', 'under_review'] },
    'approvalWorkflow.role': role,
    'approvalWorkflow.status': 'pending'
  }).sort({ submittedAt: 1 });
};

/**
 * 获取用户的申请历史
 * @param {string} userId - 用户ID
 * @returns {Promise<Document[]>}
 */
committeeApplicationSchema.statics.getUserApplications = function(userId) {
  return this.find({
    'applicant.userId': userId
  }).sort({ submittedAt: -1 });
};

/**
 * 获取统计数据
 * @param {string} villageId - 村庄ID
 * @returns {Promise<Object>}
 */
committeeApplicationSchema.statics.getStatistics = async function(villageId) {
  const stats = await this.aggregate([
    {
      $match: { villageId: mongoose.Types.ObjectId(villageId) }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    pending: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    total: 0
  };

  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

/**
 * 清理过期的待处理申请
 * @param {number} days - 天数
 * @returns {Promise<number>}
 */
committeeApplicationSchema.statics.cleanupExpiredApplications = async function(days = 30) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() - days);

  const result = await this.updateMany(
    {
      status: { $in: ['pending', 'under_review'] },
      submittedAt: { $lt: expiryDate }
    },
    {
      $set: {
        status: 'cancelled',
        cancelReason: '申请超时自动取消',
        cancelledAt: new Date()
      }
    }
  );

  return result.modifiedCount;
};

// ==================== 中间件 ====================

// 保存前生成申请ID
committeeApplicationSchema.pre('save', function(next) {
  if (!this.applicationId) {
    this.applicationId = this.constructor.generateApplicationId();
  }
  next();
});

// 保存后初始化工作流
committeeApplicationSchema.post('save', async function(doc) {
  if (doc.approvalWorkflow.length === 0 && ['pending', 'under_review'].includes(doc.status)) {
    await doc.initWorkflow();
  }
});

module.exports = mongoose.model('CommitteeApplication', committeeApplicationSchema);
