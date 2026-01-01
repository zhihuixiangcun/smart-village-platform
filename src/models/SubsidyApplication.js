const mongoose = require('mongoose');

const subsidyApplicationSchema = new mongoose.Schema({
  // 基础信息
  applicationId: {
    type: String,
    required: true,
    unique: true
  },
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },
  applicantId: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true,
    index: true
  },
  calculatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PolicyCalculator',
    required: true
  },
  applicationStatus: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid', 'completed', 'cancelled'],
    default: 'draft'
  },
  submissionDate: Date,
  reviewDate: Date,
  decisionDate: Date,
  completedDate: Date,

  // 申请人信息
  applicantInfo: {
    name: {
      type: String,
      required: true
    },
    idNumber: String,
    phone: String,
    email: String,
    address: String,
    maritalStatus: {
      type: String,
      enum: ['single', 'married', 'divorced', 'widowed']
    },
    education: {
      type: String,
      enum: ['primary', 'junior', 'senior', 'high_school', 'vocational', 'college', 'university', 'master', 'phd', 'other']
    },
    employment: {
      type: String,
      enum: ['employed', 'unemployed', 'self_employed', 'student', 'retired', 'disabled', 'other']
    },
    annualIncome: {
      type: Number,
      min: 0
    },
    isPovertyHousehold: {
      type: Boolean,
      default: false
    },
    hasDisability: {
      type: Boolean,
      default: false
    },
    isVeteran: {
      type: Boolean,
      default: false
    },
    isPartyMember: {
      type: Boolean,
      default: false
    }
  },

  // 家庭信息
  householdInfo: {
    registeredHouseholdSize: {
      type: Number,
      default: 1
    },
    actualHouseholdSize: {
      type: Number,
      default: 1
    },
    householderName: String,
    householdType: {
      type: String,
      enum: ['single_person', 'couple', 'single_parent', 'extended_family', 'other']
    },
    houseProperty: {
      type: String,
      enum: ['owned', 'rented', 'provided', 'other']
    },
    housingArea: Number, // 平方米
    hasAgriculturalIncome: {
      type: Boolean,
      default: false
    }
  },

  // 家庭成员信息
  householdMembers: [{
    sequence: Number,
    name: String,
    relationship: {
      type: String,
      enum: ['self', 'spouse', 'child', 'parent', 'grandparent', 'grandchild', 'sibling', 'other_relative', 'non_relative']
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    birthDate: Date,
    idNumber: String,
    education: {
      type: String,
      enum: ['primary', 'junior', 'senior', 'high_school', 'vocational', 'college', 'university', 'master', 'phd', 'other']
    },
    employment: {
      type: String,
      enum: ['employed', 'unemployed', 'self_employed', 'student', 'retired', 'disabled', 'other']
    },
    annualIncome: Number,
    maritalStatus: String,
    disabilityType: String,
    isStudent: Boolean,
    healthInsurance: {
      type: String,
      enum: ['urban_employee', 'urban_resident', 'new_rural_cooperative', 'commercial', 'uninsured']
    },
    specialConditions: [String] // 特殊情况（如残疾、重大疾病等）
  }],

  // 土地信息
  landInfo: {
    hasLand: {
      type: Boolean,
      default: false
    },
    landParcels: [{
      parcelId: String,
      parcelNumber: String,
      landType: {
        type: String,
        enum: ['cultivated', 'forest', 'grassland', 'water_body', 'homestead', 'construction', 'waste', 'other']
      },
      area: Number, // 面积
      areaUnit: {
        type: String,
        enum: ['mu', 'hectare', 'square_meter', 'acre'],
        default: 'mu'
      },
      ownership: {
        type: String,
        enum: ['contracted', 'owned', 'shared', 'leased', 'other']
      },
      contractNumber: String,
      contractPeriod: String,
      landCertificate: String,
      location: {
        address: String,
        coordinates: {
          type: {
            type: String,
            enum: ['Point', 'Polygon'],
            default: 'Point'
          },
          coordinates: [Number]
        }
      },
      usage: {
        type: String,
        enum: ['rice', 'wheat', 'corn', 'vegetables', 'fruits', 'aquaculture', 'livestock', 'other']
      },
      productivity: Number, // 亩产
      lastYearIncome: Number
    }],
    totalLandArea: Number,
    totalLandUnit: {
      type: String,
      enum: ['mu', 'hectare', 'square_meter', 'acre'],
      default: 'mu'
    }
  },

  // 农业生产经营信息
  agriculturalInfo: {
    mainCrops: [{
      cropType: String,
      area: Number,
      yield: Number,
      income: Number,
      plantingSeason: String,
      harvestSeason: String
    }],
    livestock: [{
      animalType: String,
      quantity: Number,
      breed: String,
      value: Number
    }],
    aquaculture: [{
      species: String,
      area: Number,
      yield: Number,
      income: Number
    }],
    otherIncome: {
      type: String,
      amount: Number,
      description: String
    },
    totalAgriculturalIncome: Number,
    hasModernEquipment: Boolean,
    equipmentList: [String]
  },

  // 申请材料
  documents: [{
    docType: String,
    docName: String,
    docNumber: String,
    issueDate: Date,
    expiryDate: Date,
    issuingAuthority: String,
    fileUrl: String,
    fileSize: Number,
    uploadDate: Date,
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'requires_review'],
      default: 'pending'
    },
    verificationNotes: String,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date
  }],

  // 计算结果
  calculationResult: {
    subsidyAmount: {
      type: Number,
      default: 0
    },
    householdSize: {
      type: Number,
      default: 0
    },
    landArea: {
      type: Number,
      default: 0
    },
    eligibilityScore: {
      type: Number,
      min: 0,
      max: 1
    },
    calculationDetails: {
      baseAmount: Number,
      appliedRates: [Object],
      adjustments: [{
        type: String,
        amount: Number,
        reason: String
      }],
      breakdown: Object
    },
    aiAdjustment: {
      applied: Boolean,
      originalAmount: Number,
      adjustedAmount: Number,
      confidenceScore: Number
    },
    confidenceLevel: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.8
    },
    recommendations: [Object],
    estimatedPaymentDate: Date,
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'cash', 'check', 'mobile_payment'],
      default: 'bank_transfer'
    }
  },

  // 审核记录
  reviewRecords: [{
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewDate: {
      type: Date,
      default: Date.now
    },
    reviewType: {
      type: String,
      enum: ['initial_review', 'document_verification', 'field_visit', 'final_review'],
      default: 'initial_review'
    },
    reviewDecision: {
      type: String,
      enum: ['approve', 'request_changes', 'reject', 'requires_further_review'],
      default: 'requires_further_review'
    },
    reviewComments: String,
    reviewScore: {
      type: Number,
      min: 0,
      max: 100
    },
    checkedFields: [String],
    outstandingIssues: [Object],
    nextAction: String,
    nextActionDate: Date
  }],

  // 支付记录
  paymentRecords: [{
    paymentId: {
      type: String,
      required: true
    },
    paymentDate: Date,
    paymentAmount: Number,
    paymentMethod: String,
    transactionId: String,
    paymentChannel: String,
    paymentStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
      default: 'pending'
    },
    payeeInfo: {
      name: String,
      accountNumber: String,
      bankName: String,
      bankBranch: String
    },
    receiptNumber: String,
    receiptDate: Date,
    notes: String
  }],

  // 变更历史
  changeHistory: [{
    changeType: {
      type: String,
      enum: ['created', 'updated', 'submitted', 'reviewed', 'approved', 'rejected', 'paid', 'cancelled'],
      required: true
    },
    changeDate: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    reason: String
  }],

  // 通知记录
  notifications: [{
    notificationType: {
      type: String,
      enum: ['application_submitted', 'under_review', 'additional_info_required', 'approved', 'rejected', 'payment_scheduled', 'payment_completed'],
      required: true
    },
    sentDate: {
      type: Date,
      default: Date.now
    },
    sentMethod: {
      type: String,
      enum: ['sms', 'email', 'wechat', 'phone', 'mail'],
      default: 'sms'
    },
    recipient: String,
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed'],
      default: 'sent'
    },
    content: String,
    metadata: Object
  }],

  // 元数据
  metadata: {
    userAgent: String,
    ipAddress: String,
    platform: String,
    appVersion: String,
    submissionChannel: {
      type: String,
      enum: ['web', 'mobile_app', 'wechat_mini_program', 'offline', 'staff_assisted'],
      default: 'web'
    },
    referenceNumber: String, // 业务参考号
    batchNumber: String, // 批次号
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    tags: [String],
    notes: String
  },

  // 系统字段
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
subsidyApplicationSchema.index({ villageId: 1, applicationStatus: 1 });
subsidyApplicationSchema.index({ applicantId: 1, applicationStatus: 1 });
subsidyApplicationSchema.index({ calculatorId: 1, applicationStatus: 1 });
subsidyApplicationSchema.index({ submissionDate: -1 });
subsidyApplicationSchema.index({ 'metadata.priority': 1, submissionDate: -1 });
subsidyApplicationSchema.index({ 'landInfo.landParcels.coordinates': '2dsphere' });
subsidyApplicationSchema.index({ applicationId: 1 }, { unique: true });

// 虚拟字段：处理时间
subsidyApplicationSchema.virtual('processingTime').get(function() {
  if (this.submissionDate && this.decisionDate) {
    return this.decisionDate - this.submissionDate;
  }
  return null;
});

// 虚拟字段：是否可以修改
subsidyApplicationSchema.virtual('isEditable').get(function() {
  return ['draft', 'under_review'].includes(this.applicationStatus);
});

// 虚拟字段：是否需要审核
subsidyApplicationSchema.virtual('requiresReview').get(function() {
  return this.applicationStatus === 'submitted';
});

// 虚拟字段：完成度
subsidyApplicationSchema.virtual('completionPercentage').get(function() {
  let completed = 0;
  const total = 4; // 基础信息、家庭信息、土地信息、申请材料

  if (this.applicantInfo && Object.keys(this.applicantInfo).length > 5) completed++;
  if (this.householdInfo && Object.keys(this.householdInfo).length > 3) completed++;
  if (this.landInfo && this.landInfo.hasLand && this.landInfo.landParcels.length > 0) completed++;
  if (this.documents && this.documents.length > 0) completed++;

  return Math.round((completed / total) * 100);
});

// 实例方法：提交申请
subsidyApplicationSchema.methods.submit = function() {
  this.applicationStatus = 'submitted';
  this.submissionDate = new Date();

  // 添加变更记录
  this.changeHistory.push({
    changeType: 'submitted',
    changeDate: new Date(),
    field: 'applicationStatus',
    oldValue: 'draft',
    newValue: 'submitted'
  });

  return this.save();
};

// 实例方法：开始审核
subsidyApplicationSchema.methods.startReview = function(reviewerId, reviewType) {
  this.applicationStatus = 'under_review';
  this.reviewRecords.push({
    reviewerId,
    reviewType,
    reviewDecision: 'requires_further_review'
  });

  return this.save();
};

// 审核记录
subsidyApplicationSchema.methods.addReviewRecord = function(reviewData) {
  this.reviewRecords.push({
    ...reviewData,
    reviewDate: new Date()
  });

  return this.save();
};

// 实例方法：批准申请
subsidyApplicationSchema.methods.approve = function(reviewerId, approvedAmount, comments) {
  this.applicationStatus = 'approved';
  this.decisionDate = new Date();
  this.calculationResult.subsidyAmount = approvedAmount;

  this.reviewRecords.push({
    reviewerId,
    reviewType: 'final_review',
    reviewDecision: 'approve',
    reviewComments: comments,
    reviewScore: 100
  });

  // 发送通知
  this.addNotification('approved', `您的补贴申请已通过，金额：${approvedAmount}元`);

  return this.save();
};

// 实例方法：拒绝申请
subsidyApplicationSchema.methods.reject = function(reviewerId, reason, comments) {
  this.applicationStatus = 'rejected';
  this.decisionDate = new Date();

  this.reviewRecords.push({
    reviewerId,
    reviewType: 'final_review',
    reviewDecision: 'reject',
    reviewComments: comments,
    reviewScore: 0
  });

  // 发送通知
  this.addNotification('rejected', `您的补贴申请已被拒绝，原因：${reason}`);

  return this.save();
};

// 实例方法：添加通知记录
subsidyApplicationSchema.methods.addNotification = function(notificationType, content, metadata = {}) {
  this.notifications.push({
    notificationType,
    content,
    metadata
  });

  return this.save();
};

// 实例方法：添加支付记录
subsidyApplicationSchema.methods.addPaymentRecord = function(paymentData) {
  this.paymentRecords.push({
    ...paymentData,
    paymentDate: paymentData.paymentDate || new Date()
  });

  if (paymentData.paymentStatus === 'completed') {
    this.applicationStatus = 'paid';
    this.completedDate = new Date();
  }

  return this.save();
};

// 实例方法：计算完成度
subsidyApplicationSchema.methods.calculateCompletion = function() {
  let score = 0;
  const total = 100;

  // 基础信息 (30分)
  if (this.applicantInfo && this.applicantInfo.name && this.applicantInfo.idNumber) {
    score += 30;
  }

  // 家庭信息 (25分)
  if (this.householdInfo && this.householdInfo.registeredHouseholdSize > 0) {
    score += 25;
  }

  // 土地信息 (25分)
  if (this.landInfo && this.landInfo.hasLand && this.landInfo.landParcels.length > 0) {
    score += 25;
  }

  // 申请材料 (20分)
  if (this.documents && this.documents.length > 0) {
    score += Math.min(20, this.documents.length * 5);
  }

  return Math.round(score);
};

// 静态方法：生成申请ID
subsidyApplicationSchema.statics.generateApplicationId = async function(villageId) {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substr(2, 6);
  const sequence = await this.countDocuments({
    villageId,
    submissionDate: {
      $gte: new Date(date.setHours(0, 0, 0, 0)),
      $lt: new Date(date.setHours(23, 59, 59, 999))
    }
  });

  const sequenceStr = String(sequence).padStart(4, '0');
  return `${villageId.toString().slice(-6)}${dateStr}${sequenceStr}${random}`;
};

// 静态方法：获取待审核申请
subsidyApplicationSchema.statics.getPendingReviews = function(villageId, limit = 20) {
  return this.find({
    villageId,
    applicationStatus: 'under_review'
  })
    .populate('applicantId', 'name phone')
    .populate('reviewRecords.reviewerId', 'name')
    .sort({ submissionDate: -1 })
    .limit(limit);
};

// 静态方法：获取统计数据
subsidyApplicationSchema.statics.getStatistics = async function(villageId, startDate, endDate) {
  const matchStage = {
    villageId,
    submissionDate: {}
  };

  if (startDate) {
    matchStage.submissionDate.$gte = new Date(startDate);
  }
  if (endDate) {
    matchStage.submissionDate.$lte = new Date(endDate);
  }

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$applicationStatus',
        count: { $sum: 1 },
        totalAmount: { $sum: '$calculationResult.subsidyAmount' }
      }
    }
  ];

  const results = await this.aggregate(pipeline);

  const statistics = {
    total: 0,
    draft: 0,
    submitted: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
    paid: 0,
    completed: 0,
    totalSubsidyAmount: 0
  };

  results.forEach(result => {
    statistics.total += result.count;
    statistics[result._id] = result.count;
    statistics.totalSubsidyAmount += result.totalAmount || 0;
  });

  return statistics;
};

// 静态方法：获取热门政策
subsidyApplicationSchema.statics.getPopularPolicies = async function(villageId, limit = 10) {
  const pipeline = [
    { $match: { villageId, applicationStatus: 'approved' } },
    {
      $group: {
        _id: '$calculatorId',
        count: { $sum: 1 },
        totalAmount: { $sum: '$calculationResult.subsidyAmount' }
      }
    },
    {
      $lookup: {
        from: 'policycalculators',
        localField: '_id',
        foreignField: '_id',
        as: 'calculator'
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: limit
    }
  ];

  return this.aggregate(pipeline);
};

module.exports = mongoose.model('SubsidyApplication', subsidyApplicationSchema);