/**
 * 财务透明化管理数据模型
 * 支持区块链存证、智能票据OCR识别、村民财务查询权限、预算审批流程
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

// 财务交易类型
const TransactionTypes = {
  INCOME: 'income',           // 收入
  EXPENSE: 'expense',         // 支出
  TRANSFER: 'transfer',       // 转账
  BUDGET: 'budget',          // 预算
  REFUND: 'refund',          // 退款
  SUBSIDY: 'subsidy'         // 补贴
};

// 交易状态
const TransactionStatus = {
  DRAFT: 'draft',            // 草稿
  PENDING: 'pending',        // 待审批
  APPROVED: 'approved',      // 已批准
  REJECTED: 'rejected',      // 已拒绝
  COMPLETED: 'completed',    // 已完成
  CANCELLED: 'cancelled'     // 已取消
};

// 支出类别
const ExpenseCategories = {
  INFRASTRUCTURE: 'infrastructure',     // 基础设施
  PUBLIC_SERVICES: 'public_services',   // 公共服务
  ADMINISTRATION: 'administration',     // 行政管理
  WELFARE: 'welfare',                   // 福利支出
  AGRICULTURE: 'agriculture',           // 农业支持
  EDUCATION: 'education',               // 教育支出
  HEALTHCARE: 'healthcare',             // 医疗健康
  EMERGENCY: 'emergency',               // 应急支出
  OTHER: 'other'                        // 其他
};

// 收入类别
const IncomeCategories = {
  GOVERNMENT_GRANT: 'government_grant',  // 政府拨款
  VILLAGE_ENTERPRISE: 'village_enterprise', // 村集体企业收入
  LAND_LEASE: 'land_lease',             // 土地租赁收入
  SERVICE_FEES: 'service_fees',         // 服务费收入
  DONATIONS: 'donations',               // 捐赠收入
  INVESTMENT: 'investment',             // 投资收益
  OTHER: 'other'                        // 其他收入
};

/**
 * 区块链存证记录模型
 */
const BlockchainRecordSchema = new mongoose.Schema({
  // 区块链信息
  blockchain: {
    type: String,
    required: true,
    enum: ['ethereum', 'hyperledger', 'bitcoin', 'custom'],
    description: '区块链类型'
  },

  // 交易哈希
  transactionHash: {
    type: String,
    required: true,
    unique: true,
    // unique: true 已自动创建索引，无需 index: true
    description: '区块链交易哈希'
  },

  // 区块号
  blockNumber: {
    type: Number,
    required: true,
    description: '区块号'
  },

  // 智能合约地址
  contractAddress: {
    type: String,
    description: '智能合约地址'
  },

  // 上链时间
  blockTimestamp: {
    type: Date,
    required: true,
    description: '区块时间戳'
  },

  // 数据指纹
  dataFingerprint: {
    type: String,
    required: true,
    description: '原始数据的SHA256指纹'
  },

  // 验证状态
  verification: {
    isVerified: { type: Boolean, default: false },
    verifiedAt: Date,
    verificationAttempts: { type: Number, default: 0 },
    lastVerificationAt: Date
  },

  // 元数据
  metadata: {
    gasUsed: Number,
    gasPrice: String,
    confirmations: { type: Number, default: 0 },
    networkId: String,
    description: String
  },

  // 创建时间
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: false,
  collection: 'blockchain_records'
});

/**
 * 智能票据OCR识别记录模型
 */
const InvoiceOCRSchema = new mongoose.Schema({
  // 票据基本信息
  invoiceInfo: {
    invoiceNumber: {
      type: String,
      description: '发票号码'
    },
    invoiceCode: {
      type: String,
      description: '发票代码'
    },
    invoiceDate: {
      type: Date,
      description: '开票日期'
    },
    sellerName: {
      type: String,
      required: true,
      description: '销售方名称'
    },
    sellerTaxNumber: {
      type: String,
      description: '销售方税号'
    },
    buyerName: {
      type: String,
      required: true,
      description: '购买方名称'
    },
    buyerTaxNumber: {
      type: String,
      description: '购买方税号'
    },
    totalAmount: {
      type: Number,
      required: true,
      description: '价税合计'
    },
    taxAmount: {
      type: Number,
      description: '税额'
    },
    amountWithoutTax: {
      type: Number,
      description: '不含税金额'
    }
  },

  // OCR识别结果
  ocrResult: {
    // 识别置信度
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },

    // 识别的文本
    extractedText: {
      type: String,
      description: 'OCR提取的完整文本'
    },

    // 识别的字段
    extractedFields: [{
      fieldName: String,
      fieldValue: String,
      confidence: Number,
      boundingBox: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
      }
    }],

    // 识别引擎
    engine: {
      type: String,
      enum: ['tesseract', 'baidu', 'tencent', 'alibaba', 'google'],
      required: true
    },

    // 处理时间
    processingTime: {
      type: Number,
      description: 'OCR处理耗时（毫秒）'
    }
  },

  // 票据图片信息
  imageInfo: {
    originalImageUrl: String,
    processedImageUrl: String,
    thumbnailUrl: String,
    fileSize: Number,
    imageFormat: String,
    resolution: {
      width: Number,
      height: Number
    }
  },

  // 验证结果
  verification: {
    // 税务局验证
    taxAuthorityVerified: {
      type: Boolean,
      default: false
    },
    taxAuthorityVerifyDate: Date,
    taxAuthorityResult: String,

    // 重复性检查
    duplicateCheck: {
      isDuplicate: { type: Boolean, default: false },
      duplicateInvoices: [String], // 重复的发票号码
      checkDate: Date
    },

    // 真实性评估
    authenticityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    // 风险标记
    riskFlags: [{
      type: String,
      enum: ['fake_invoice', 'altered_amount', 'invalid_date', 'duplicate', 'suspicious_seller']
    }]
  },

  // 人工审核
  manualReview: {
    required: { type: Boolean, default: false },
    reviewedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      userName: String,
      reviewDate: Date,
      reviewDecision: {
        type: String,
        enum: ['approved', 'rejected', 'needs_more_info']
      },
      reviewComments: String
    }
  },

  // 创建和修改时间
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: false,
  collection: 'invoice_ocr_records'
});

/**
 * 预算审批流程模型
 */
const BudgetApprovalSchema = new mongoose.Schema({
  // 预算基本信息
  budgetInfo: {
    budgetYear: {
      type: Number,
      required: true,
      description: '预算年度'
    },
    budgetType: {
      type: String,
      enum: ['annual', 'quarterly', 'project', 'emergency'],
      required: true,
      description: '预算类型'
    },
    budgetName: {
      type: String,
      required: true,
      maxlength: 200,
      description: '预算名称'
    },
    description: {
      type: String,
      maxlength: 2000,
      description: '预算描述'
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      description: '预算总金额'
    },
    currency: {
      type: String,
      default: 'CNY',
      description: '货币类型'
    }
  },

  // 预算明细
  budgetItems: [{
    itemName: {
      type: String,
      required: true,
      description: '预算项目名称'
    },
    category: {
      type: String,
      enum: Object.values(ExpenseCategories),
      required: true,
      description: '支出类别'
    },
    estimatedAmount: {
      type: Number,
      required: true,
      min: 0,
      description: '预估金额'
    },
    actualAmount: {
      type: Number,
      min: 0,
      description: '实际金额'
    },
    quantity: {
      type: Number,
      min: 0,
      default: 1,
      description: '数量'
    },
    unitPrice: {
      type: Number,
      min: 0,
      description: '单价'
    },
    description: {
      type: String,
      maxlength: 500,
      description: '项目描述'
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
      description: '优先级'
    },
    startDate: Date,
    endDate: Date,
    responsiblePerson: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      userName: String,
      department: String
    }
  }],

  // 审批流程
  approvalWorkflow: {
    // 当前审批阶段
    currentStage: {
      type: String,
      enum: ['draft', 'village_committee', 'township_government', 'financial_audit', 'final_approval'],
      default: 'draft',
      description: '当前审批阶段'
    },

    // 审批记录
    approvalHistory: [{
      stage: {
        type: String,
        enum: ['draft', 'village_committee', 'township_government', 'financial_audit', 'final_approval']
      },
      approver: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: String,
        role: String,
        department: String
      },
      decision: {
        type: String,
        enum: ['approved', 'rejected', 'returned', 'forwarded'],
        required: true
      },
      comments: String,
      approvalDate: { type: Date, default: Date.now },
      nextStage: String,
      attachments: [{
        fileName: String,
        fileUrl: String,
        fileSize: Number
      }]
    }],

    // 审批配置
    configuration: {
      requiredApprovers: [{
        stage: String,
        roles: [String],
        minApprovers: { type: Number, default: 1 },
        maxApprovers: Number,
        timeoutDays: { type: Number, default: 7 }
      }],
      parallelApproval: {
        type: Boolean,
        default: false
      },
      autoForward: {
        type: Boolean,
        default: true
      }
    }
  },

  // 执行状态
  execution: {
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'suspended', 'cancelled'],
      default: 'not_started'
    },
    progressPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    spentAmount: {
      type: Number,
      default: 0,
      description: '已执行金额'
    },
    remainingAmount: {
      type: Number,
      description: '剩余金额'
    },
    actualTransactions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinancialTransaction'
    }],
    lastUpdated: { type: Date, default: Date.now }
  },

  // 监督和检查
  supervision: {
    supervisors: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      userName: String,
      role: String,
      assignedDate: Date
    }],
    inspections: [{
      inspectionDate: Date,
      inspector: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: String
      },
      findings: String,
      recommendations: String,
      followUpRequired: { type: Boolean, default: false }
    }]
  },

  // 创建和修改信息
  createdBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: String,
    department: String
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: false,
  collection: 'budget_approvals'
});

/**
 * 财务交易主模型
 */
const FinancialTransactionSchema = new mongoose.Schema({
  // 交易基本信息
  transactionInfo: {
    transactionNumber: {
      type: String,
      required: true,
      unique: true,
      // unique: true 已自动创建索引，无需 index: true
      description: '交易编号'
    },
    transactionType: {
      type: String,
      enum: Object.values(TransactionTypes),
      required: true,
      description: '交易类型'
    },
    category: {
      type: String,
      enum: [...Object.values(ExpenseCategories), ...Object.values(IncomeCategories)],
      required: true,
      description: '交易类别'
    },
    amount: {
      type: Number,
      required: true,
      description: '交易金额'
    },
    currency: {
      type: String,
      default: 'CNY',
      description: '货币类型'
    },
    transactionDate: {
      type: Date,
      required: true,
      description: '交易日期'
    },
    description: {
      type: String,
      maxlength: 1000,
      description: '交易描述'
    }
  },

  // 相关方信息
  parties: {
    payer: {
      name: { type: String, required: true },
      accountNumber: String,
      bankName: String,
      contactPerson: String,
      contactPhone: String
    },
    payee: {
      name: { type: String, required: true },
      accountNumber: String,
      bankName: String,
      contactPerson: String,
      contactPhone: String
    }
  },

  // 审批状态
  status: {
    type: String,
    enum: Object.values(TransactionStatus),
    default: 'draft',
    description: '交易状态'
  },

  // 审批流程
  approval: {
    submittedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      userName: String,
      submitDate: { type: Date, default: Date.now }
    },
    reviewedBy: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      userName: String,
      role: String,
      decision: {
        type: String,
        enum: ['approved', 'rejected', 'returned']
      },
      comments: String,
      reviewDate: { type: Date, default: Date.now }
    }],
    finalApprover: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      userName: String,
      approvalDate: Date
    }
  },

  // 票据信息
  invoices: [{
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'InvoiceOCR' },
    invoiceNumber: String,
    invoiceAmount: Number,
    description: String,
    isAttached: { type: Boolean, default: false }
  }],

  // 附件信息
  attachments: [{
    fileName: String,
    originalName: String,
    fileUrl: String,
    fileSize: Number,
    fileType: String,
    uploadDate: { type: Date, default: Date.now },
    uploadedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      userName: String
    }
  }],

  // 区块链存证
  blockchainRecord: {
    recordId: { type: mongoose.Schema.Types.ObjectId, ref: 'BlockchainRecord' },
    isOnChain: { type: Boolean, default: false },
    transactionHash: String,
    blockNumber: Number,
    uploadDate: Date
  },

  // 村民查看权限
  publicAccess: {
    isPublic: { type: Boolean, default: false },
    publicDate: Date,
    accessLevel: {
      type: String,
      enum: ['basic', 'detailed', 'full'],
      default: 'basic'
    },
    restrictions: [{
      type: String,
      enum: ['amount_masked', 'party_hidden', 'details_limited']
    }]
  },

  // 关联信息
  relatedBudget: {
    budgetId: { type: mongoose.Schema.Types.ObjectId, ref: 'BudgetApproval' },
    budgetName: String,
    budgetItem: String
  },

  relatedProject: {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    projectName: String
  },

  // 创建和修改信息
  createdBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: String,
    department: String
  },
  lastModifiedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: String,
    modifyDate: { type: Date, default: Date.now }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: false,
  collection: 'financial_transactions'
});

/**
 * 村民财务查询权限模型
 */
const VillageFinanceAccessSchema = new mongoose.Schema({
  // 村民信息
  villager: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: String,
    householdId: { type: mongoose.Schema.Types.ObjectId, ref: 'Household' },
    villageId: { type: String, required: true }
    // 索引在 schema.index() 中定义，避免重复
  },

  // 访问权限配置
  accessPermissions: {
    // 基础权限
    basicAccess: {
      canViewSummary: { type: Boolean, default: true },
      canViewIncome: { type: Boolean, default: true },
      canViewExpense: { type: Boolean, default: true },
      canViewBudget: { type: Boolean, default: false }
    },

    // 详细权限
    detailedAccess: {
      canViewTransactionDetails: { type: Boolean, default: false },
      canViewInvoiceDetails: { type: Boolean, default: false },
      canViewApprovalProcess: { type: Boolean, default: false },
      canDownloadReports: { type: Boolean, default: false }
    },

    // 特殊权限
    specialAccess: {
      canAskQuestions: { type: Boolean, default: true },
      canRequestClarification: { type: Boolean, default: true },
      canReportIssues: { type: Boolean, default: true },
      canParticipateInMeetings: { type: Boolean, default: false }
    },

    // 数据范围限制
    dataScope: {
      timeRange: {
        startDate: { type: Date, default: () => new Date(new Date().getFullYear(), 0, 1) },
        endDate: { type: Date, default: () => new Date() }
      },
      amountThreshold: {
        minAmount: { type: Number, default: 0 },
        maxAmount: { type: Number, default: Infinity }
      },
      categoryFilter: [{
        type: String,
        enum: [...Object.values(ExpenseCategories), ...Object.values(IncomeCategories)]
      }]
    }
  },

  // 访问记录
  accessHistory: [{
    accessDate: { type: Date, default: Date.now },
    accessType: {
      type: String,
      enum: ['view_summary', 'view_details', 'download_report', 'ask_question', 'report_issue']
    },
    ipAddress: String,
    userAgent: String,
    dataViewed: String,
    duration: Number // 访问时长（秒）
  }],

  // 提问和反馈
  questions: [{
    questionId: { type: String, required: true },
    questionText: { type: String, required: true, maxlength: 1000 },
    category: {
      type: String,
      enum: ['general', 'specific_transaction', 'budget', 'policy', 'other']
    },
    askedDate: { type: Date, default: Date.now },
    response: {
      responseText: String,
      respondedBy: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: String,
        role: String
      },
      responseDate: Date,
      isPublic: { type: Boolean, default: false }
    },
    status: {
      type: String,
      enum: ['pending', 'answered', 'closed'],
      default: 'pending'
    }
  }],

  // 权限状态
  status: {
    type: String,
    enum: ['active', 'suspended', 'revoked'],
    default: 'active'
  },

  // 权限授予信息
  grantedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: String,
    role: String,
    grantDate: { type: Date, default: Date.now },
    reason: String
  },

  // 有效期
  validityPeriod: {
    startDate: { type: Date, default: Date.now },
    endDate: Date,
    isPermanent: { type: Boolean, default: true }
  },

  // 创建和修改时间
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: false,
  collection: 'village_finance_access'
});

// 索引定义
// transactionHash 的 unique 索引已在字段定义中创建，无需重复
BlockchainRecordSchema.index({ dataFingerprint: 1 });
BlockchainRecordSchema.index({ blockTimestamp: -1 });

InvoiceOCRSchema.index({ 'invoiceInfo.invoiceNumber': 1 });
InvoiceOCRSchema.index({ 'invoiceInfo.sellerName': 1 });
InvoiceOCRSchema.index({ 'verification.authenticityScore': -1 });
InvoiceOCRSchema.index({ createdAt: -1 });

BudgetApprovalSchema.index({ 'budgetInfo.budgetYear': 1 });
BudgetApprovalSchema.index({ 'approvalWorkflow.currentStage': 1 });
BudgetApprovalSchema.index({ 'execution.status': 1 });
BudgetApprovalSchema.index({ createdBy: 1 });

// transactionNumber 的 unique 索引已在字段定义中创建，无需重复
FinancialTransactionSchema.index({ 'transactionInfo.transactionType': 1 });
FinancialTransactionSchema.index({ 'transactionInfo.transactionDate': -1 });
FinancialTransactionSchema.index({ status: 1 });
FinancialTransactionSchema.index({ createdBy: 1 });

VillageFinanceAccessSchema.index({ 'villager.userId': 1 });
VillageFinanceAccessSchema.index({ 'villager.villageId': 1 });
VillageFinanceAccessSchema.index({ status: 1 });
VillageFinanceAccessSchema.index({ 'accessHistory.accessDate': -1 });

// 虚拟字段
FinancialTransactionSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: this.transactionInfo.currency || 'CNY'
  }).format(this.transactionInfo.amount);
});

FinancialTransactionSchema.virtual('isOverdue').get(function() {
  if (this.approval.reviewedBy.length === 0) return false;
  const lastReview = this.approval.reviewedBy[this.approval.reviewedBy.length - 1];
  const daysSinceReview = Math.floor((Date.now() - lastReview.reviewDate) / (1000 * 60 * 60 * 24));
  return daysSinceReview > 30; // 超过30天未处理视为逾期
});

// 静态方法 - 生成交易编号
FinancialTransactionSchema.statics.generateTransactionNumber = async function(transactionType, villageId) {
  const prefix = {
    [TransactionTypes.INCOME]: 'INC',
    [TransactionTypes.EXPENSE]: 'EXP',
    [TransactionTypes.TRANSFER]: 'TRF',
    [TransactionTypes.BUDGET]: 'BDG',
    [TransactionTypes.REFUND]: 'REF',
    [TransactionTypes.SUBSIDY]: 'SUB'
  }[transactionType];

  const date = new Date();
  const dateStr = date.getFullYear().toString() +
                 (date.getMonth() + 1).toString().padStart(2, '0') +
                 date.getDate().toString().padStart(2, '0');

  const sequence = await this.countDocuments({
    'transactionInfo.transactionDate': {
      $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
    }
  });

  const sequenceStr = (sequence + 1).toString().padStart(4, '0');
  const villageCode = villageId ? villageId.slice(-4) : '0000';

  return `${prefix}${dateStr}${villageCode}${sequenceStr}`;
};

// 静态方法 - 创建区块链存证
BlockchainRecordSchema.statics.createBlockchainRecord = async function(data, blockchainConfig) {
  try {
    // 生成数据指纹
    const dataFingerprint = crypto.createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');

    // 检查是否已存在相同的存证记录
    const existingRecord = await this.findOne({ dataFingerprint });
    if (existingRecord) {
      return existingRecord;
    }

    // 调用区块链服务存证（这里需要集成实际的区块链服务）
    const blockchainResult = await this.uploadToBlockchain(data, blockchainConfig);

    // 创建存证记录
    const record = new this({
      blockchain: blockchainConfig.blockchainType,
      transactionHash: blockchainResult.transactionHash,
      blockNumber: blockchainResult.blockNumber,
      contractAddress: blockchainResult.contractAddress,
      blockTimestamp: blockchainResult.timestamp,
      dataFingerprint,
      metadata: {
        gasUsed: blockchainResult.gasUsed,
        gasPrice: blockchainResult.gasPrice,
        confirmations: blockchainResult.confirmations,
        networkId: blockchainConfig.networkId
      }
    });

    await record.save();
    return record;

  } catch (error) {
    console.error('创建区块链存证失败:', error);
    throw error;
  }
};

// 实例方法 - 检查村民访问权限
VillageFinanceAccessSchema.methods.hasAccess = function(accessType, dataInfo = {}) {
  if (this.status !== 'active') return false;

  // 检查有效期
  if (!this.validityPeriod.isPermanent && this.validityPeriod.endDate) {
    if (new Date() > this.validityPeriod.endDate) return false;
  }

  // 检查具体权限
  switch (accessType) {
  case 'view_summary':
    return this.accessPermissions.basicAccess.canViewSummary;

  case 'view_details':
    return this.accessPermissions.detailedAccess.canViewTransactionDetails;

  case 'download_report':
    return this.accessPermissions.detailedAccess.canDownloadReports;

  case 'ask_question':
    return this.accessPermissions.specialAccess.canAskQuestions;

  default:
    return false;
  }
};

// 实例方法 - 记录访问历史
VillageFinanceAccessSchema.methods.recordAccess = function(accessType, reqInfo, dataViewed = '') {
  this.accessHistory.push({
    accessDate: new Date(),
    accessType,
    ipAddress: reqInfo.ipAddress,
    userAgent: reqInfo.userAgent,
    dataViewed,
    duration: reqInfo.duration || 0
  });

  return this.save();
};

module.exports = {
  FinancialTransaction: mongoose.model('FinancialTransaction', FinancialTransactionSchema),
  BlockchainRecord: mongoose.model('BlockchainRecord', BlockchainRecordSchema),
  InvoiceOCR: mongoose.model('InvoiceOCR', InvoiceOCRSchema),
  BudgetApproval: mongoose.model('BudgetApproval', BudgetApprovalSchema),
  VillageFinanceAccess: mongoose.model('VillageFinanceAccess', VillageFinanceAccessSchema),
  TransactionTypes,
  TransactionStatus,
  ExpenseCategories,
  IncomeCategories
};