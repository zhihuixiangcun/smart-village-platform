/**
 * 政务管理系统模型
 * 处理村民档案、证件办理、福利申请等政务服务
 */

const mongoose = require('mongoose');

// ==================== 村民数字档案模型 ====================

/**
 * 村民数字档案
 */
const VillagerDigitalProfileSchema = new mongoose.Schema({
  // 基础信息
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: true,
    unique: true,
    index: true
  },
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 个人身份信息
  personalInfo: {
    name: { type: String, required: true },
    idNumber: { type: String, required: true, index: true },
    gender: { type: String, enum: ['male', 'female'] },
    ethnicity: String,
    birthDate: Date,
    birthPlace: String,
    phoneNumber: String,
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    }
  },

  // 家庭关系
  familyInfo: {
    maritalStatus: {
      type: String,
      enum: ['single', 'married', 'divorced', 'widowed'],
      default: 'single'
    },
    spouseName: String,
    spouseIdNumber: String,
    childrenCount: { type: Number, default: 0 },
    dependents: [{
      name: String,
      idNumber: String,
      relationship: String,
      birthDate: Date,
      isStudent: Boolean
    }]
  },

  // 居住信息
  residenceInfo: {
    address: String,
    houseNumber: String,
    propertyType: {
      type: String,
      enum: ['self_owned', 'rented', 'shared', 'other'],
      default: 'self_owned'
    },
    livingArea: Number,  // 居住面积（平方米）
    moveInDate: Date,
    isRegistered: { type: Boolean, default: true }  // 是否户籍在册
  },

  // 教育信息
  educationInfo: {
    highestDegree: {
      type: String,
      enum: ['primary', 'junior_high', 'senior_high', 'college', 'bachelor', 'master', 'doctor', 'other']
    },
    graduateSchool: String,
    major: String,
    graduationYear: Number,
    qualifications: [String]  // 资格证书
  },

  // 就业信息
  employmentInfo: {
    employmentStatus: {
      type: String,
      enum: ['employed', 'self_employed', 'unemployed', 'retired', 'student', 'other'],
      default: 'other'
    },
    employer: String,
    position: String,
    industry: String,
    monthlyIncome: Number,
    socialSecurity: {
      pension: { type: Boolean, default: false },
      medical: { type: Boolean, default: false },
      unemployment: { type: Boolean, default: false },
      employmentInjury: { type: Boolean, default: false },
      maternity: { type: Boolean, default: false }
    }
  },

  // 土地与资产
  assetInfo: {
    farmland: {
      contractedArea: Number,  // 承包地面积
      allocatedArea: Number,    // 分配地面积
      landCode: String,         // 土地确权证号
      contractExpiry: Date
    },
    housing: {
      area: Number,
      builtArea: Number,
      houseNumber: String,
      propertyCertificate: String
    },
    forestry: {
      area: Number,
      forestRightNumber: String
    },
    grassland: {
      area: Number,
      useRightCertificate: String
    }
  },

  // 健康信息
  healthInfo: {
    bloodType: {
      type: String,
      enum: ['A', 'B', 'AB', 'O', 'unknown']
    },
    allergies: [String],
    chronicDiseases: [String],
    disability: {
      hasDisability: { type: Boolean, default: false },
      level: { type: String, enum: ['1', '2', '3', '4'] },
      certificateNumber: String
    },
    medicalInsurance: {
      enrolled: { type: Boolean, default: true },
      insuranceType: {
        type: String,
        enum: ['urban_employee', 'urban_resident', 'rural_cooperative', 'commercial']
      },
      insuranceNumber: String
    }
  },

  // 特殊群体标识
  specialGroups: {
    isLowIncome: { type: Boolean, default: false },           // 低保户
    isFiveGuarantee: { type: Boolean, default: false },       // 五保户
    isLeftBehind: { type: Boolean, default: false },         // 留守人员
    isDisabled: { type: Boolean, default: false },           // 残疾人
    isMartyrFamily: { type: Boolean, default: false },       // 烈属
    isSingleParent: { type: Boolean, default: false },       // 单亲家庭
    isElderlyLivingAlone: { type: Boolean, default: false }, // 独居老人
    tags: [String]  // 其他标签
  },

  // 政策享受情况
  policyBenefits: [{
    policyName: String,
    policyCode: String,
    startDate: Date,
    endDate: Date,
    monthlyAmount: Number,
    status: {
      type: String,
      enum: ['active', 'suspended', 'terminated'],
      default: 'active'
    }
  }],

  // 数字化服务记录
  digitalServices: {
    lastLogin: Date,
    loginCount: { type: Number, default: 0 },
    boundPhone: String,
    boundWechat: String,
    faceId: String
  },

  // 档案状态
  status: {
    type: String,
    enum: ['draft', 'active', 'frozen', 'deleted'],
    default: 'active',
    index: true
  },

  // 审核信息
  verification: {
    isVerified: { type: Boolean, default: false },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  },

  // 创建和更新
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
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
  collection: 'villager_digital_profiles'
});

// ==================== 证件办理申请模型 ====================

/**
 * 证件类型枚举
 */
const DocumentType = {
  ID_CARD: 'id_card',                    // 身份证
  RESIDENCE_PERMIT: 'residence_permit',   // 居住证
  HOUSEHOLD_REGISTER: 'household_register', // 户口
  MARRIAGE_CERTIFICATE: 'marriage_certificate', // 结婚证
  BIRTH_CERTIFICATE: 'birth_certificate',     // 出生证明
  DEATH_CERTIFICATE: 'death_certificate',     // 死亡证明
  DIVORCE_CERTIFICATE: 'divorce_certificate', // 离婚证
  SOCIAL_SECURITY_CARD: 'social_security_card', // 社保卡
  MEDICAL_INSURANCE_CARD: 'medical_insurance_card', // 医保卡
  DISABILITY_CERTIFICATE: 'disability_certificate',   // 残疾证
  LAND_USE_CERTIFICATE: 'land_use_certificate',      // 土地使用证
  PROPERTY_OWNERSHIP: 'property_ownership',          // 房产证
  BUSINESS_LICENSE: 'business_license',              // 营业执照
  PASSPORT: 'passport',                              // 护照
  OTHER: 'other'
};

/**
 * 申请状态
 */
const ApplicationStatus = {
  DRAFT: 'draft',           // 草稿
  SUBMITTED: 'submitted',   // 已提交
  UNDER_REVIEW: 'under_review', // 审核中
  ADDITIONAL_INFO: 'additional_info', // 需补充材料
  APPROVED: 'approved',     // 已批准
  REJECTED: 'rejected',     // 已拒绝
  PROCESSING: 'processing', // 办理中
  COMPLETED: 'completed',   // 已完成
  CANCELLED: 'cancelled'    // 已取消
};

/**
 * 证件办理申请
 */
const DocumentApplicationSchema = new mongoose.Schema({
  // 申请编号
  applicationNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // 申请人信息
  applicantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: true,
    index: true
  },
  applicantName: String,
  applicantIdNumber: String,
  applicantPhone: String,
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 证件信息
  documentType: {
    type: String,
    enum: Object.values(DocumentType),
    required: true
  },
  documentName: { type: String, required: true },

  // 申请原因
  reason: {
    type: String,
    enum: ['new', 'renewal', 'loss', 'damage', 'change', 'other'],
    required: true
  },
  reasonDescription: String,

  // 办理方式
  processingMethod: {
    type: String,
    enum: ['online', 'offline', 'proxy'],
    default: 'offline'
  },

  // 代理人信息（代办）
  proxyInfo: {
    name: String,
    idNumber: String,
    phone: String,
    relationship: String,
    authorizationLetter: String  // 授权委托书URL
  },

  // 申请材料
  materials: [{
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['id_card', 'photo', 'household_register', 'proof', 'other']
    },
    fileUrl: String,
    uploadTime: Date,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    remark: String
  }],

  // 审核流程
  reviewProcess: [{
    step: {
      type: String,
      enum: ['village_review', 'town_review', 'bureau_review', 'final_approval']
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewerName: String,
    reviewerRole: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    comment: String,
    reviewedAt: Date,
    attachments: [String]
  }],

  // 当前审核阶段
  currentReviewStep: {
    type: String,
    enum: ['village_review', 'town_review', 'bureau_review', 'final_approval', 'completed'],
    default: 'village_review'
  },

  // 审批结果
  approvalResult: {
    status: {
      type: String,
      enum: Object.values(ApplicationStatus),
      default: 'draft'
    },
    approvedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectionReason: String,
    certificateNumber: String,  // 证件号码
    validFrom: Date,
    validUntil: Date,
    issueDate: Date,
    issuingAuthority: String
  },

  // 领取方式
  pickupMethod: {
    type: String,
    enum: ['mail', 'pickup', 'delivery'],
    default: 'pickup'
  },
  pickupAddress: {
    recipient: String,
    phone: String,
    address: String,
    postalCode: String
  },

  // 费用信息
  fees: {
    applicationFee: { type: Number, default: 0 },
    processingFee: { type: Number, default: 0 },
    totalFee: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid', 'refunded'],
      default: 'unpaid'
    },
    paymentId: String,
    paidAt: Date
  },

  // 进度通知
  notifications: {
    sms: { type: Boolean, default: true },
    email: String,
    wechat: { type: Boolean, default: true }
  },

  // 备注
  notes: String,

  // 状态
  status: {
    type: String,
    enum: Object.values(ApplicationStatus),
    default: 'draft',
    index: true
  },

  // 时间戳
  submittedAt: Date,
  completedAt: Date,
  expectedCompletionDate: Date,

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
  }
}, {
  timestamps: true,
  collection: 'document_applications'
});

// ==================== 福利申请模型 ====================

/**
 * 福利类型
 */
const WelfareType = {
  // 低保类
  SUBSISTENCE_ALLOWANCE: 'subsistence_allowance',        // 低保金
  EXTREME_POVERTY: 'extreme_poverty',                    // 特困供养
  // 医疗类
  MEDICAL_AID: 'medical_aid',                           // 医疗救助
  SERIOUS_DISEASE: 'serious_disease',                   // 大病救助
  // 教育类
  EDUCATION_GRANT: 'education_grant',                   // 教育助学金
  POOR_STUDENT_AID: 'poor_student_aid',                // 困难学生资助
  VOCATIONAL_TRAINING: 'vocational_training',          // 职业培训补贴
  // 住房类
  HOUSING_SUBSIDY: 'housing_subsidy',                   // 住房补贴
  RURAL_RENOVATION: 'rural_renovation',                // 农房改造
  DISASTER_RELOCATION: 'disaster_relocation',          // 灾后重建
  // 老年类
  ELDERLY_ALLOWANCE: 'elderly_allowance',               // 老年津贴
  HOME_BASED_CARE: 'home_based_care',                   // 居家养老服务
  NURSING_HOME_SUBSIDY: 'nursing_home_subsidy',        // 养老机构补贴
  // 残疾类
  DISABILITY_ALLOWANCE: 'disability_allowance',         // 残疾人补贴
  REHABILITATION_SUBSIDY: 'rehabilitation_subsidy',     // 康复补贴
  // 就业类
  EMPLOYMENT_SUBSIDY: 'employment_subsidy',             // 就业补贴
  ENTREPRENEURSHIP_GRANT: 'entrepreneurship_grant',     // 创业补贴
  PUBLIC_WELFARE_JOB: 'public_welfare_job',             // 公益性岗位
  // 其他
  ONE_CHILD_POLICY: 'one_child_policy',                 // 独生子女奖励
  FUNERAL_ASSISTANCE: 'funeral_assistance',             // 殡理补助
  EMERGENCY_RELIEF: 'emergency_relief',                 // 临时救助
  OTHER: 'other'
};

/**
 * 福利申请
 */
const WelfareApplicationSchema = new mongoose.Schema({
  // 申请编号
  applicationNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // 申请人信息
  applicantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: true,
    index: true
  },
  applicantName: String,
  applicantIdNumber: String,
  applicantPhone: String,
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 家庭信息
  householdInfo: {
    householdSize: { type: Number, required: true },
    householdIncome: { type: Number, required: true },  // 家庭年收入
    perCapitaIncome: Number,  // 人均收入
    housingArea: Number,      // 人均住房面积
    hasDisability: Boolean,
    hasChronicDisease: Boolean,
    hasStudent: Boolean,
    specialCircumstances: [String]  // 特殊情况
  },

  // 福利类型
  welfareType: {
    type: String,
    enum: Object.values(WelfareType),
    required: true
  },
  welfareName: { type: String, required: True },

  // 申请理由
  applicationReason: {
    type: String,
    required: true
  },
  detailedDescription: String,

  // 申请金额
  appliedAmount: Number,
  approvedAmount: Number,
  actualReceivedAmount: Number,

  // 申请材料
  materials: [{
    name: { type: String, required: true },
    fileUrl: String,
    uploadTime: Date,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    remark: String
  }],

  // 家庭成员情况
  householdMembers: [{
    name: String,
    idNumber: String,
    relationship: String,
    age: Number,
    occupation: String,
    monthlyIncome: Number,
    healthStatus: String
  }],

  // 资产情况
  assets: {
    housing: {
      count: Number,
      totalArea: Number,
      description: String
    },
    land: {
      farmlandArea: Number,
      forestryArea: Number,
      grasslandArea: Number
    },
    vehicles: [{
      type: String,
      licensePlate: String,
      value: Number
    }],
    deposits: Number,  // 银行存款
    otherAssets: String
  },

  // 审核流程
  reviewProcess: [{
    level: {
      type: String,
      enum: ['village', 'town', 'county', 'city']
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewerName: String,
    reviewerRole: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'returned'],
      default: 'pending'
    },
    comment: String,
    reviewedAt: Date,
    attachments: [String]
  }],

  // 当前审核级别
  currentReviewLevel: {
    type: String,
    enum: ['village', 'town', 'county', 'city', 'completed'],
    default: 'village'
  },

  // 村级初审
  villageReview: {
    interviewer: String,
    interviewDate: Date,
    interviewNotes: String,
    householdVisitDate: Date,
    householdVisitMembers: [String],
    householdVisitPhotos: [String],
    preliminaryOpinion: {
      type: String,
      enum: ['qualified', 'not_qualified', 'need_investigation'],
      default: 'need_investigation'
    },
    opinionReason: String
  },

  // 公示信息
  publicity: {
    required: { type: Boolean, default: true },
    startDate: Date,
    endDate: Date,
    location: String,
    objectionPeriod: { type: Number, default: 7 },  // 异议期（天）
    objections: [{
      objectorName: String,
      objectorPhone: String,
      objectionContent: String,
      submittedAt: Date,
      investigated: Boolean,
      investigationResult: String
    }],
    publicityResult: {
      type: String,
      enum: ['no_objection', 'objection_resolved', 'objection_confirmed'],
      default: 'no_objection'
    }
  },

  // 审批结果
  approvalResult: {
    status: {
      type: String,
      enum: Object.values(ApplicationStatus),
      default: 'draft'
    },
    approvedAmount: Number,
    paymentFrequency: {
      type: String,
      enum: ['one_time', 'monthly', 'quarterly', 'annually'],
      default: 'one_time'
    },
    startDate: Date,
    endDate: Date,
    paymentMethod: String,
    bankAccount: {
      accountNumber: String,
      accountName: String,
      bankName: String,
      branch: String
    },
    approvedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectionReason: String
  },

  // 发放记录
  paymentRecords: [{
    paymentDate: Date,
    amount: Number,
    paymentMethod: String,
    transactionId: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed'
    },
    remark: String
  }],

  // 年审信息
  annualReview: {
    lastReviewDate: Date,
    nextReviewDate: Date,
    reviewRequired: { type: Boolean, default: true },
    reviewResult: {
      type: String,
      enum: ['continue', 'adjust', 'suspend', 'terminate'],
      default: 'continue'
    }
  },

  // 状态
  status: {
    type: String,
    enum: Object.values(ApplicationStatus),
    default: 'draft',
    index: true
  },

  // 备注
  notes: String,

  // 时间戳
  submittedAt: Date,
  completedAt: Date,
  expectedCompletionDate: Date,

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
  }
}, {
  timestamps: true,
  collection: 'welfare_applications'
});

// ==================== 政务服务目录模型 ====================

/**
 * 政务服务目录
 */
const GovernmentServiceSchema = new mongoose.Schema({
  // 服务基本信息
  serviceCode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  serviceName: {
    type: String,
    required: true
  },
  serviceCategory: {
    type: String,
    enum: ['document', 'welfare', 'approval', 'certificate', 'inquiry', 'other'],
    required: true
  },
  subCategory: String,

  // 服务描述
  description: String,
  serviceGuide: String,    // 办事指南
  policyBasis: String,     // 政策依据

  // 办理信息
  processingInfo: {
    processingMethod: {
      type: String,
      enum: ['online', 'offline', 'both'],
      default: 'offline'
    },
    processingPeriod: String,  // 办理时限
    requiredMaterials: [String],  // 所需材料
    conditions: [String],         // 办理条件
    fees: [{
      name: String,
      amount: Number,
      description: String
    }],
    freeOfCharge: { type: Boolean, default: false }
  },

  // 流程信息
  processFlow: [{
    step: Number,
    stepName: String,
    description: String,
    responsibleUnit: String,
    expectedDuration: Number  // 预计工作日
  }],

  // 服务对象
  targetAudience: {
    eligibility: [String],  // 适用对象
    restrictions: [String]  // 限制条件
  },

  // 负责部门
  responsibleDepartment: {
    village: String,
    town: String,
    county: String,
    contactInfo: {
      phone: String,
      email: String,
      address: String,
      officeHours: String
    }
  },

  // 表单模板
  formTemplates: [{
    name: String,
    fileUrl: String,
    required: Boolean
  }],

  // 常见问题
  faqs: [{
    question: String,
    answer: String
  }],

  // 状态
  status: {
    type: String,
    enum: ['active', 'suspended', 'deprecated'],
    default: 'active',
    index: true
  },

  // 村庄关联
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    index: true
  },

  // 排序
  sortOrder: {
    type: Number,
    default: 0
  },

  // 统计
  statistics: {
    totalApplications: { type: Number, default: 0 },
    completedApplications: { type: Number, default: 0 },
    averageProcessingTime: Number
  },

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
  collection: 'government_services'
});

// ==================== 索引定义 ====================

VillagerDigitalProfileSchema.index({ residentId: 1 });
VillagerDigitalProfileSchema.index({ villageId: 1, status: 1 });
VillagerDigitalProfileSchema.index({ 'personalInfo.idNumber': 1 });
VillagerDigitalProfileSchema.index({ 'specialGroups.isLowIncome': 1 });
VillagerDigitalProfileSchema.index({ 'specialGroups.isLeftBehind': 1 });
VillagerDigitalProfileSchema.index({ 'specialGroups.isDisabled': 1 });

DocumentApplicationSchema.index({ applicantId: 1 });
DocumentApplicationSchema.index({ villageId: 1, status: 1 });
DocumentApplicationSchema.index({ documentType: 1 });
DocumentApplicationSchema.index({ createdAt: -1 });
DocumentApplicationSchema.index({ submittedAt: -1 });

WelfareApplicationSchema.index({ applicantId: 1 });
WelfareApplicationSchema.index({ villageId: 1, status: 1 });
WelfareApplicationSchema.index({ welfareType: 1 });
WelfareApplicationSchema.index({ createdAt: -1 });
WelfareApplicationSchema.index({ submittedAt: -1 });

GovernmentServiceSchema.index({ serviceCode: 1 });
GovernmentServiceSchema.index({ serviceCategory: 1 });
GovernmentServiceSchema.index({ villageId: 1, status: 1 });
GovernmentServiceSchema.index({ sortOrder: 1 });

// ==================== 静态方法 ====================

/**
 * 生成申请编号
 */
DocumentApplicationSchema.statics.generateApplicationNumber = async function(prefix = 'DOC') {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
                 (date.getMonth() + 1).toString().padStart(2, '0') +
                 date.getDate().toString().padStart(2, '0');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${dateStr}${randomStr}`;
};

WelfareApplicationSchema.statics.generateApplicationNumber = async function(prefix = 'WEL') {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
                 (date.getMonth() + 1).toString().padStart(2, '0') +
                 date.getDate().toString().padStart(2, '0');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${dateStr}${randomStr}`;
};

// ==================== 虚拟字段 ====================

VillagerDigitalProfileSchema.virtual('age').get(function() {
  if (this.personalInfo.birthDate) {
    const today = new Date();
    const birthDate = new Date(this.personalInfo.birthDate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
  return null;
});

DocumentApplicationSchema.virtual('processingDays').get(function() {
  if (this.submittedAt) {
    const now = this.completedAt || new Date();
    return Math.ceil((now - this.submittedAt) / (1000 * 60 * 60 * 24));
  }
  return null;
});

WelfareApplicationSchema.virtual('totalPaidAmount').get(function() {
  return this.paymentRecords?.reduce((sum, record) => {
    return record.status === 'completed' ? sum + record.amount : sum;
  }, 0) || 0;
});

// ==================== 导出模型 ====================

module.exports = {
  VillagerDigitalProfile: mongoose.model('VillagerDigitalProfile', VillagerDigitalProfileSchema),
  DocumentApplication: mongoose.model('DocumentApplication', DocumentApplicationSchema),
  WelfareApplication: mongoose.model('WelfareApplication', WelfareApplicationSchema),
  GovernmentService: mongoose.model('GovernmentService', GovernmentServiceSchema),
  DocumentType,
  ApplicationStatus,
  WelfareType
};
