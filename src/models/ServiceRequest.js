/**
 * 服务请求模型
 * 管理村民服务请求、在线办事、咨询投诉等服务事项
 */

const mongoose = require('mongoose');

// 服务类型
const ServiceTypes = {
  // 证件办理
  ID_CARD: 'id_card',                   // 身份证办理
  RESIDENCE_PERMIT: 'residence_permit', // 居住证办理
  HOUSEHOLD_REGISTER: 'household_register', // 户口办理
  MARRIAGE_CERTIFICATE: 'marriage_certificate', // 婚姻证明
  BIRTH_CERTIFICATE: 'birth_certificate', // 出生证明

  // 福利申请
  SUBSIDY_APPLICATION: 'subsidy_application', // 补贴申请
  LOW_INCOME: 'low_income',             // 低保申请
  DISABILITY_BENEFIT: 'disability_benefit', // 残疾补助
  ELDERLY_ALLOWANCE: 'elderly_allowance', // 老年津贴

  // 农业服务
  AGRICULTURAL_SUBSIDY: 'agricultural_subsidy', // 农业补贴
  LAND_USE: 'land_use',                 // 土地使用
  CROP_INSURANCE: 'crop_insurance',     // 农作物保险
  TECHNICAL_GUIDANCE: 'technical_guidance', // 技术指导

  // 医疗健康
  MEDICAL_INSURANCE: 'medical_insurance', // 医疗保险
  HEALTH_CHECKUP: 'health_checkup',     // 健康体检
  VACCINATION: 'vaccination',           // 疫苗接种
  CHRONIC_DISEASE: 'chronic_disease',   // 慢性病管理

  // 教育服务
  ENROLLMENT: 'enrollment',             // 入学申请
  STUDENT_AID: 'student_aid',           // 助学申请
  VOCATIONAL_TRAINING: 'vocational_training', // 职业培训

  // 基础设施
  REPAIR_REQUEST: 'repair_request',     // 维修请求
  UTILITY_SERVICE: 'utility_service',   // 公用事业服务
  ROAD_MAINTENANCE: 'road_maintenance', // 道路维护
  SANITATION: 'sanitation',             // 环境卫生

  // 法律咨询
  LEGAL_CONSULTATION: 'legal_consultation', // 法律咨询
  DISPUTE_MEDIATION: 'dispute_mediation', // 纠纷调解
  RIGHTS_PROTECTION: 'rights_protection', // 权益保护

  // 信息咨询
  POLICY_INQUIRY: 'policy_inquiry',     // 政策咨询
  GENERAL_INQUIRY: 'general_inquiry',   // 一般咨询
  COMPLAINT: 'complaint',               // 投诉建议
  SUGGESTION: 'suggestion',             // 意见建议

  // 其他服务
  VOLUNTEER_SERVICE: 'volunteer_service', // 志愿服务
  EMERGENCY_ASSISTANCE: 'emergency_assistance', // 紧急救助
  OTHER: 'other'                        // 其他
};

// 请求状态
const RequestStatus = {
  PENDING: 'pending',                   // 待处理
  PROCESSING: 'processing',             // 处理中
  UNDER_REVIEW: 'under_review',         // 审核中
  AWAITING_INFO: 'awaiting_info',       // 等待补充信息
  APPROVED: 'approved',                 // 已批准
  REJECTED: 'rejected',                 // 已拒绝
  COMPLETED: 'completed',               // 已完成
  CANCELLED: 'cancelled',               // 已取消
  ON_HOLD: 'on_hold'                    // 暂停
};

// 优先级
const PriorityLevels = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
  EMERGENCY: 'emergency'
};

// 提交方式
const SubmissionMethods = {
  ONLINE: 'online',                     // 网上提交
  MOBILE_APP: 'mobile_app',             // 手机APP
  WECHAT: 'wechat',                     // 微信小程序
  OFFLINE: 'offline',                   // 线下办理
  PHONE: 'phone',                       // 电话
  PROXY: 'proxy'                        // 他人代办
};

/**
 * 服务请求主模型
 */
const ServiceRequestSchema = new mongoose.Schema({
  // 请求标识
  requestId: {
    type: String,
    required: true,
    unique: true,
    description: '请求编号'
  },

  // 基本信息
  serviceType: {
    type: String,
    enum: Object.values(ServiceTypes),
    required: true,
    index: true,
    description: '服务类型'
  },
  subType: {
    type: String,
    description: '服务子类型'
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
    description: '请求标题'
  },
  description: {
    type: String,
    required: true,
    maxlength: 5000,
    description: '详细描述'
  },

  // 状态和优先级
  status: {
    type: String,
    enum: Object.values(RequestStatus),
    default: 'pending',
    index: true,
    description: '请求状态'
  },
  priority: {
    type: String,
    enum: Object.values(PriorityLevels),
    default: 'normal',
    index: true,
    description: '优先级'
  },

  // 申请人信息
  applicant: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    idCard: String,
    phone: String,
    email: String,
    address: String,
    isProxy: {
      type: Boolean,
      default: false
    },
    proxyInfo: {
      proxyName: String,
      proxyPhone: String,
      proxyIdCard: String,
      relationship: String,
      authorizationFile: String
    }
  },

  // 提交信息
  submission: {
    method: {
      type: String,
      enum: Object.values(SubmissionMethods),
      default: 'online'
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String,
    deviceInfo: String,
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number]
    }
  },

  // 处理信息
  processing: {
    assignedTo: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      userName: String,
      department: String,
      assignedAt: Date
    },
    assignedTeam: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      userName: String,
      role: String
    }],
    estimatedCompletionDate: Date,
    actualCompletionDate: Date,
    workingHours: {
      type: Number,
      default: 0
    }
  },

  // 处理进度
  progress: {
    currentStep: String,
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    steps: [{
      stepName: String,
      description: String,
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'skipped']
      },
      completedAt: Date,
      completedBy: {
        userId: { type: mongoose.Schema.Types.ObjectId },
        userName: String
      },
      notes: String
    }]
  },

  // 审批流程
  approval: {
    required: {
      type: Boolean,
      default: false
    },
    currentStage: String,
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
      }
    }]
  },

  // 所需材料
  requiredDocuments: [{
    documentName: String,
    documentType: String,
    description: String,
    isRequired: {
      type: Boolean,
      default: true
    },
    received: {
      type: Boolean,
      default: false
    },
    fileUrl: String,
    uploadedAt: Date,
    verified: {
      type: Boolean,
      default: false
    },
    verificationNotes: String
  }],

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
    category: {
      type: String,
      enum: ['application', 'identity', 'proof', 'photo', 'other']
    }
  }],

  // 反馈和沟通
  communications: [{
    sender: {
      userId: { type: mongoose.Schema.Types.ObjectId },
      userName: String,
      role: {
        type: String,
        enum: ['applicant', 'staff', 'system']
      }
    },
    message: String,
    messageType: {
      type: String,
      enum: ['inquiry', 'response', 'notification', 'request_info']
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    attachments: [{
      fileName: String,
      fileUrl: String
    }],
    isInternal: {
      type: Boolean,
      default: false
    }
  }],

  // 费用信息
  fees: {
    totalFee: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'CNY'
    },
    feeBreakdown: [{
      itemName: String,
      amount: Number,
      description: String,
      isPaid: {
        type: Boolean,
        default: false
      },
      paidAt: Date,
      paymentMethod: String,
      receiptNumber: String
    }],
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid', 'waived', 'refunded'],
      default: 'unpaid'
    }
  },

  // 处理结果
  result: {
    decision: {
      type: String,
      enum: ['approved', 'rejected', 'approved_with_conditions', 'deferred']
    },
    decisionDate: Date,
    decisionBy: {
      userId: { type: mongoose.Schema.Types.ObjectId },
      userName: String
    },
    reason: String,
    conditions: [String],
    outputDocuments: [{
      documentName: String,
      documentNumber: String,
      issueDate: Date,
      expiryDate: Date,
      fileUrl: String,
      deliveredMethod: String,
      deliveredAt: Date
    }]
  },

  // 评价和反馈
  satisfaction: {
    rated: {
      type: Boolean,
      default: false
    },
    overallRating: {
      type: Number,
      min: 1,
      max: 5
    },
    serviceRating: {
      type: Number,
      min: 1,
      max: 5
    },
    efficiencyRating: {
      type: Number,
      min: 1,
      max: 5
    },
    attitudeRating: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: String,
    ratedAt: Date
  },

  // 超时和催办
  urgency: {
    isOverdue: {
      type: Boolean,
      default: false
    },
    overdueSince: Date,
    reminderCount: {
      type: Number,
      default: 0
    },
    lastReminderAt: Date,
    escalated: {
      type: Boolean,
      default: false
    },
    escalatedAt: Date,
    escalatedTo: {
      userId: { type: mongoose.Schema.Types.ObjectId },
      userName: String
    }
  },

  // 关联信息
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },
  householdId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Household'
  },
  relatedRequests: [{
    requestId: {
      type: mongoose.Schema.Types.ObjectId
    },
    relationType: {
      type: String,
      enum: ['duplicate', 'related', 'follow_up', 'reopened']
    },
    description: String
  }],

  // 标签
  tags: [{
    type: String,
    trim: true
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
  closedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId },
    userName: String,
    closedAt: Date
  }
}, {
  timestamps: true,
  collection: 'service_requests'
});

// 索引定义
ServiceRequestSchema.index({ requestId: 1 });
ServiceRequestSchema.index({ villageId: 1, status: 1 });
ServiceRequestSchema.index({ villageId: 1, serviceType: 1 });
ServiceRequestSchema.index({ villageId: 1, priority: 1 });
ServiceRequestSchema.index({ 'applicant.userId': 1 });
ServiceRequestSchema.index({ 'processing.assignedTo.userId': 1 });
ServiceRequestSchema.index({ createdAt: -1 });
ServiceRequestSchema.index({ 'submission.submittedAt': -1 });
ServiceRequestSchema.index({ status: 1, priority: 1 });

// 静态方法 - 生成请求编号
ServiceRequestSchema.statics.generateRequestId = async function(villageId, serviceType) {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
                 (date.getMonth() + 1).toString().padStart(2, '0') +
                 date.getDate().toString().padStart(2, '0');

  const typeCode = {
    [ServiceTypes.ID_CARD]: 'ID',
    [ServiceTypes.RESIDENCE_PERMIT]: 'RP',
    [ServiceTypes.HOUSEHOLD_REGISTER]: 'HR',
    [ServiceTypes.MARRIAGE_CERTIFICATE]: 'MC',
    [ServiceTypes.BIRTH_CERTIFICATE]: 'BC',
    [ServiceTypes.SUBSIDY_APPLICATION]: 'SA',
    [ServiceTypes.LOW_INCOME]: 'LI',
    [ServiceTypes.DISABILITY_BENEFIT]: 'DB',
    [ServiceTypes.ELDERLY_ALLOWANCE]: 'EA',
    [ServiceTypes.AGRICULTURAL_SUBSIDY]: 'AS',
    [ServiceTypes.LAND_USE]: 'LU',
    [ServiceTypes.CROP_INSURANCE]: 'CI',
    [ServiceTypes.TECHNICAL_GUIDANCE]: 'TG',
    [ServiceTypes.MEDICAL_INSURANCE]: 'MI',
    [ServiceTypes.HEALTH_CHECKUP]: 'HC',
    [ServiceTypes.VACCINATION]: 'VC',
    [ServiceTypes.CHRONIC_DISEASE]: 'CD',
    [ServiceTypes.ENROLLMENT]: 'EN',
    [ServiceTypes.STUDENT_AID]: 'ST',
    [ServiceTypes.VOCATIONAL_TRAINING]: 'VT',
    [ServiceTypes.REPAIR_REQUEST]: 'RR',
    [ServiceTypes.UTILITY_SERVICE]: 'US',
    [ServiceTypes.ROAD_MAINTENANCE]: 'RM',
    [ServiceTypes.SANITATION]: 'SN',
    [ServiceTypes.LEGAL_CONSULTATION]: 'LC',
    [ServiceTypes.DISPUTE_MEDIATION]: 'DM',
    [ServiceTypes.RIGHTS_PROTECTION]: 'RP',
    [ServiceTypes.POLICY_INQUIRY]: 'PI',
    [ServiceTypes.GENERAL_INQUIRY]: 'GI',
    [ServiceTypes.COMPLAINT]: 'CP',
    [ServiceTypes.SUGGESTION]: 'SG',
    [ServiceTypes.VOLUNTEER_SERVICE]: 'VS',
    [ServiceTypes.EMERGENCY_ASSISTANCE]: 'EA',
    [ServiceTypes.OTHER]: 'OT'
  }[serviceType] || 'SV';

  const villageCode = villageId ? villageId.toString().slice(-4) : '0000';

  // 获取当天的计数
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const count = await this.countDocuments({
    villageId,
    createdAt: { $gte: startOfDay }
  });

  const sequenceStr = (count + 1).toString().padStart(5, '0');

  return `SRV${dateStr}${villageCode}${typeCode}${sequenceStr}`;
};

// 虚拟字段 - 处理时长
ServiceRequestSchema.virtual('processingDuration').get(function() {
  const start = this.submission.submittedAt;
  const end = this.processing.actualCompletionDate || new Date();
  return Math.floor((end - start) / (1000 * 60 * 60)); // 小时
});

// 虚拟字段 - 是否超时
ServiceRequestSchema.virtual('isOverdue').get(function() {
  if (!this.processing.estimatedCompletionDate) return false;
  return this.processing.estimatedCompletionDate < new Date() &&
         !['completed', 'cancelled', 'rejected'].includes(this.status);
});

// 实例方法 - 添加沟通记录
ServiceRequestSchema.methods.addCommunication = function(sender, message, messageType = 'response', attachments = []) => {
  this.communications.push({
    sender,
    message,
    messageType,
    sentAt: new Date(),
    attachments
  });
  return this.save();
};

// 实例方法 - 更新处理进度
ServiceRequestSchema.methods.updateProgress = function(stepName, status, notes = '') => {
  const existingStep = this.progress.steps.find(s => s.stepName === stepName);

  if (existingStep) {
    existingStep.status = status;
    existingStep.notes = notes;
    if (status === 'completed') {
      existingStep.completedAt = new Date();
    }
  } else {
    this.progress.steps.push({
      stepName,
      description: notes,
      status,
      completedAt: status === 'completed' ? new Date() : undefined
    });
  }

  // 更新总进度百分比
  const completedSteps = this.progress.steps.filter(s => s.status === 'completed').length;
  this.progress.percentage = Math.floor((completedSteps / this.progress.steps.length) * 100) || 0;

  return this.save();
};

// 实例方法 - 分配处理人
ServiceRequestSchema.methods.assignTo = function(userId, userName, department, estimatedDays = 7) => {
  this.processing.assignedTo = {
    userId,
    userName,
    department,
    assignedAt: new Date()
  };

  if (estimatedDays > 0) {
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + estimatedDays);
    this.processing.estimatedCompletionDate = estimatedDate;
  }

  this.status = 'processing';
  return this.save();
};

// 实例方法 - 提交评价
ServiceRequestSchema.methods.submitRating = function(ratings, comments = '') => {
  this.satisfaction = {
    rated: true,
    overallRating: ratings.overall || 0,
    serviceRating: ratings.service || 0,
    efficiencyRating: ratings.efficiency || 0,
    attitudeRating: ratings.attitude || 0,
    comments,
    ratedAt: new Date()
  };
  return this.save();
};

module.exports = {
  ServiceRequest: mongoose.model('ServiceRequest', ServiceRequestSchema),
  ServiceTypes,
  RequestStatus,
  PriorityLevels,
  SubmissionMethods
};
