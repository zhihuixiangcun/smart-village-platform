/**
 * 缴费管理系统模型
 * 处理医疗保险、养老保险、水电费、物业费等便民缴费功能
 */

const mongoose = require('mongoose');

// ==================== 费用类型枚举 ====================

const FeeCategory = {
  INSURANCE: 'insurance',           // 保险
  UTILITIES: 'utilities',           // 水电费
  PROPERTY: 'property',            // 物业费
  COMMUNICATION: 'communication',   // 通信费
  GOVERNMENT: 'government',         // 政府费用
  EDUCATION: 'education',          // 教育费用
  OTHER: 'other'                   // 其他费用
};

const FeeType = {
  // 保险类
  MEDICAL_INSURANCE: 'medical_insurance',       // 医疗保险
  PENSION_INSURANCE: 'pension_insurance',       // 养老保险
  UNEMPLOYMENT_INSURANCE: 'unemployment_insurance', // 失业保险
  EMPLOYMENT_INJURY: 'employment_injury',       // 工伤保险
  MATERNITY: 'maternity',                       // 生育保险
  COMMERCIAL_INSURANCE: 'commercial_insurance', // 商业保险
  // 水电类
  WATER: 'water',                               // 水费
  ELECTRICITY: 'electricity',                   // 电费
  GAS: 'gas',                                   // 燃气费
  // 物业类
  PROPERTY_FEE: 'property_fee',                 // 物业费
  PARKING: 'parking',                           // 停车费
  MAINTENANCE: 'maintenance',                   // 维修基金
  // 通信类
  PHONE: 'phone',                               // 电话费
  INTERNET: 'internet',                         // 宽带费
  TV: 'tv',                                     // 电视费
  // 政府类
  SOCIAL_SECURITY: 'social_security',           // 社保
  HOUSING_FUND: 'housing_fund',                 // 公积金
  TAX: 'tax',                                   // 税费
  FINE: 'fine',                                 // 罚款
  // 教育类
  TUITION: 'tuition',                           // 学费
  BOOKS: 'books',                               // 教材费
  ACCOMMODATION: 'accommodation',               // 住宿费
  // 其他
  SANITATION: 'sanitation',                     // 卫生费
  VEHICLE: 'vehicle',                           // 车辆费用
  OTHER: 'other'                                // 其他
};

// ==================== 账单模型 ====================

/**
 * 账单模型
 */
const BillSchema = new mongoose.Schema({
  // 账单编号
  billNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // 用户信息
  payerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: true,
    index: true
  },
  payerName: String,
  payerPhone: String,
  payerIdNumber: String,
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 账单基本信息
  billInfo: {
    category: {
      type: String,
      enum: Object.values(FeeCategory),
      required: true
    },
    type: {
      type: String,
      enum: Object.values(FeeType),
      required: true
    },
    title: { type: String, required: true },
    description: String,
    period: {
      type: String,
      enum: ['monthly', 'quarterly', 'annually', 'one_time', 'custom'],
      default: 'one_time'
    },
    periodStart: Date,
    periodEnd: Date,
    billingCycle: String  // 账单周期，如 "2024-01"
  },

  // 收款单位信息
  payeeInfo: {
    name: { type: String, required: true },
    type: { type: String, enum: ['government', 'utility', 'property', 'commercial', 'other'] },
    accountNumber: String,
    bankName: String,
    taxNumber: String,
    contactPhone: String,
    address: String
  },

  // 费用明细
  charges: [{
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, default: 1 },
    unit: String,
    amount: { type: Number, required: true },
    description: String
  }],

  // 金额信息
  amount: {
    subtotal: { type: Number, required: true },    // 小计
    discount: { type: Number, default: 0 },        // 折扣
    lateFee: { type: Number, default: 0 },         // 滞纳金
    otherFees: { type: Number, default: 0 },       // 其他费用
    totalAmount: { type: Number, required: true }, // 总金额
    paidAmount: { type: Number, default: 0 },      // 已付金额
    outstandingAmount: Number                      // 未付金额
  },

  // 账单状态
  status: {
    type: String,
    enum: ['draft', 'issued', 'overdue', 'paid', 'cancelled', 'refunded'],
    default: 'issued',
    index: true
  },

  // 时间信息
  issueDate: { type: Date, required: true },       // 出账日期
  dueDate: Date,                                   // 到期日期
  paidDate: Date,                                  // 支付日期
  overdueDate: Date,                               // 逾期日期

  // 使用量数据（水电等）
  usageData: {
    previousReading: Number,
    currentReading: Number,
    usage: Number,
    unit: String
  },

  // 优惠政策
  discountPolicy: {
    applicable: { type: Boolean, default: false },
    type: String,
    description: String,
    discountAmount: Number
  },

  // 提醒设置
  reminders: {
    enabled: { type: Boolean, default: true },
    advanceDays: { type: Number, default: 3 },  // 提前几天提醒
    sent: { type: Boolean, default: false }
  },

  // 附加信息
  attachments: [String],  // 附件（如发票、详情单）
  notes: String,
  customFields: mongoose.Schema.Types.Mixed,

  // 创建信息
  createdBy: {
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
  collection: 'bills'
});

// ==================== 缴费记录模型 ====================

/**
 * 缴费记录模型
 */
const PaymentRecordSchema = new mongoose.Schema({
  // 支付编号
  paymentNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // 关联账单
  billId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill',
    required: true,
    index: true
  },
  billNumber: String,

  // 用户信息
  payerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: true,
    index: true
  },
  payerName: String,
  payerPhone: String,
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },

  // 支付信息
  payment: {
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ['wechat', 'alipay', 'bank', 'cash', 'pos', 'auto_debit', 'other'],
      required: true
    },
    channel: String,        // 支付渠道
    transactionId: String,  // 第三方交易号
    status: {
      type: String,
      enum: ['pending', 'processing', 'success', 'failed', 'refunded', 'partial_refunded'],
      default: 'pending'
    }
  },

  // 支付时间
  initTime: { type: Date, default: Date.now },    // 发起时间
  successTime: Date,                                 // 完成时间
  failureTime: Date,                                // 失败时间

  // 退款信息
  refund: {
    applied: { type: Boolean, default: false },
    amount: Number,
    reason: String,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    transactionId: String
  },

  // 回调信息
  callback: {
    received: { type: Boolean, default: false },
    data: mongoose.Schema.Types.Mixed,
    receivedAt: Date
  },

  // 备注
  notes: String,

  // 创建信息
  createdBy: {
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
  collection: 'payment_records'
});

// ==================== 代缴配置模型 ====================

/**
 * 代缴配置模型
 */
const AutoPaymentConfigSchema = new mongoose.Schema({
  // 用户信息
  payerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: true,
    unique: true,
    index: true
  },
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },

  // 支付方式配置
  paymentMethod: {
    type: String,
    enum: ['wechat', 'alipay', 'bank', 'balance'],
    default: 'wechat'
  },
  accountId: String,  // 支付账户ID

  // 代缴项目配置
  autoPaymentItems: [{
    feeType: {
      type: String,
      enum: Object.values(FeeType),
      required: true
    },
    enabled: { type: Boolean, default: true },
    autoPay: { type: Boolean, default: false },    // 是否自动扣款
    balanceThreshold: Number,                     // 余额阈值提醒
    notification: {
      sms: { type: Boolean, default: true },
      wechat: { type: Boolean, default: true }
    }
  }],

  // 账户绑定
  accounts: {
    wechat: {
      openId: String,
      nickname: String,
      bound: { type: Boolean, default: false }
    },
    alipay: {
      userId: String,
      nickname: String,
      bound: { type: Boolean, default: false }
    },
    bank: {
      bankName: String,
      cardNumber: String,
      cardHolder: String,
      bound: { type: Boolean, default: false }
    }
  },

  // 安全设置
  security: {
    password: String,           // 支付密码
    dailyLimit: Number,         // 每日限额
    monthlyLimit: Number,        // 每月限额
    requireConfirmation: {
      type: Boolean,
      default: true
    }  // 大额需确认
  },

  // 状态
  status: {
    type: String,
    enum: ['active', 'suspended', 'cancelled'],
    default: 'active'
  },

  // 创建信息
  createdBy: {
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
  collection: 'auto_payment_configs'
});

// ==================== 账单模板模型 ====================

/**
 * 账单模板模型
 */
const BillTemplateSchema = new mongoose.Schema({
  // 模板编码
  templateCode: {
    type: String,
    required: true,
    unique: true
  },

  // 模板信息
  templateInfo: {
    name: { type: String, required: true },
    category: {
      type: String,
      enum: Object.values(FeeCategory),
      required: true
    },
    type: {
      type: String,
      enum: Object.values(FeeType),
      required: true
    },
    description: String,
    version: String
  },

  // 收款单位信息
  payeeInfo: {
    name: { type: String, required: true },
    type: { type: String, enum: ['government', 'utility', 'property', 'commercial', 'other'] },
    accountNumber: String,
    bankName: String,
    taxNumber: String,
    contactPhone: String,
    address: String
  },

  // 费用规则
  feeRules: [{
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    unit: String,
    calculation: String,  // 计算方式说明
    applicable: mongoose.Schema.Types.Mixed  // 适用条件
  }],

  // 账单周期
  billingCycle: {
    type: { type: String, enum: ['monthly', 'quarterly', 'annually', 'one_time'] },
    billingDay: Number,      // 账单日
    advanceDays: Number      // 提前多少天出账
  },

  // 模板状态
  status: {
    type: String,
    enum: ['active', 'inactive', 'deprecated'],
    default: 'active'
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

  // 创建信息
  createdBy: {
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
  collection: 'bill_templates'
});

// ==================== 水电抄表记录模型 ====================

/**
 * 抄表记录模型
 */
const MeterReadingSchema = new mongoose.Schema({
  // 用户信息
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: true,
    index: true
  },
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },

  // 表计信息
  meterInfo: {
    type: {
      type: String,
      enum: ['water', 'electricity', 'gas'],
      required: true
    },
    meterNumber: { type: String, required: true },
    location: String,
    installationDate: Date
  },

  // 抄表信息
  reading: {
    previousReading: Number,
    currentReading: Number,
    usage: Number,
    readingDate: { type: Date, required: true },
    readerName: String,
    remarks: String,
    photos: [String]  // 现场照片
  },

  // 费用计算
  charge: {
    unitPrice: Number,
    tier1: { limit: Number, price: Number },      // 阶梯价格
    tier2: { limit: Number, price: Number },
    tier3: { limit: Number, price: Number },
    totalAmount: Number
  },

  // 状态
  status: {
    type: String,
    enum: ['draft', 'confirmed', 'billed'],
    default: 'draft'
  },

  // 关联账单
  billId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill'
  },

  // 创建信息
  createdBy: {
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
  collection: 'meter_readings'
});

// ==================== 缴费统计模型 ====================

/**
 * 缴费统计模型
 */
const PaymentStatisticsSchema = new mongoose.Schema({
  // 统计周期
  period: {
    year: Number,
    month: Number,
    quarter: Number,
    type: {
      type: String,
      enum: ['monthly', 'quarterly', 'annually'],
      required: true
    }
  },

  // 村庄信息
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 分类统计
  statistics: [{
    category: {
      type: String,
      enum: Object.values(FeeCategory)
    },
    type: {
      type: String,
      enum: Object.values(FeeType)
    },
    billCount: Number,
    totalAmount: Number,
    paidAmount: Number,
    outstandingAmount: Number,
    overdueAmount: Number,
    paymentRate: Number  // 缴费率
  }],

  // 汇总统计
  summary: {
    totalBills: Number,
    totalAmount: Number,
    totalPaid: Number,
    totalOutstanding: Number,
    totalOverdue: Number,
    overallPaymentRate: Number
  },

  // 创建时间
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
  collection: 'payment_statistics'
});

// ==================== 索引定义 ====================

BillSchema.index({ billNumber: 1 });
BillSchema.index({ payerId: 1, status: 1 });
BillSchema.index({ villageId: 1, status: 1 });
BillSchema.index({ 'billInfo.category': 1 });
BillSchema.index({ 'billInfo.type': 1 });
BillSchema.index({ issueDate: -1 });
BillSchema.index({ dueDate: -1 });
BillSchema.index({ status: 1, dueDate: 1 });

PaymentRecordSchema.index({ paymentNumber: 1 });
PaymentRecordSchema.index({ billId: 1 });
PaymentRecordSchema.index({ payerId: 1 });
PaymentRecordSchema.index({ createdAt: -1 });
PaymentRecordSchema.index({ 'payment.status': 1 });

AutoPaymentConfigSchema.index({ payerId: 1 });
AutoPaymentConfigSchema.index({ villageId: 1, status: 1 });

BillTemplateSchema.index({ templateCode: 1 });
BillTemplateSchema.index({ villageId: 1, status: 1 });
BillTemplateSchema.index({ 'templateInfo.category': 1 });

MeterReadingSchema.index({ residentId: 1 });
MeterReadingSchema.index({ 'meterInfo.meterNumber': 1 });
MeterReadingSchema.index({ 'reading.readingDate': -1 });

PaymentStatisticsSchema.index({ villageId: 1, 'period.year': 1, 'period.month': 1 });

// ==================== 静态方法 ====================

/**
 * 生成账单编号
 */
BillSchema.statics.generateBillNumber = async function(prefix = 'BILL') {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
                 (date.getMonth() + 1).toString().padStart(2, '0') +
                 date.getDate().toString().padStart(2, '0');
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${dateStr}${randomStr}`;
};

/**
 * 生成支付编号
 */
PaymentRecordSchema.statics.generatePaymentNumber = async function(prefix = 'PAY') {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
                 (date.getMonth() + 1).toString().padStart(2, '0') +
                 date.getDate().toString().padStart(2, '0');
  const timeStr = Date.now().toString().slice(-6);
  const randomStr = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${prefix}${dateStr}${timeStr}${randomStr}`;
};

// ==================== 虚拟字段 ====================

BillSchema.virtual('isOverdue').get(function() {
  if (this.status === 'paid' || this.status === 'cancelled') {
    return false;
  }
  if (this.dueDate && new Date() > this.dueDate) {
    return true;
  }
  return false;
});

BillSchema.virtual('isPaid').get(function() {
  return this.status === 'paid' || this.amount.outstandingAmount <= 0;
});

BillSchema.virtual('paymentProgress').get(function() {
  if (this.amount.totalAmount > 0) {
    return ((this.amount.paidAmount / this.amount.totalAmount) * 100).toFixed(2);
  }
  return '0';
});

PaymentRecordSchema.virtual('duration').get(function() {
  if (this.successTime) {
    return this.successTime - this.initTime;
  }
  return null;
});

// ==================== 实例方法 ====================

/**
 * 支付账单
 */
BillSchema.methods.pay = function(amount, paymentData) {
  if (this.status === 'paid') {
    throw new Error('账单已支付');
  }

  this.amount.paidAmount += amount;
  this.amount.outstandingAmount = this.amount.totalAmount - this.amount.paidAmount;

  if (this.amount.outstandingAmount <= 0) {
    this.status = 'paid';
    this.paidDate = new Date();
  }

  return this.save();
};

/**
 * 取消账单
 */
BillSchema.methods.cancel = function(reason, userId) {
  if (this.status === 'paid') {
    throw new Error('已支付的账单不能取消');
  }

  this.status = 'cancelled';
  this.notes = reason;

  return this.save();
};

// ==================== 导出模型 ====================

module.exports = {
  Bill: mongoose.model('Bill', BillSchema),
  PaymentRecord: mongoose.model('PaymentRecord', PaymentRecordSchema),
  AutoPaymentConfig: mongoose.model('AutoPaymentConfig', AutoPaymentConfigSchema),
  BillTemplate: mongoose.model('BillTemplate', BillTemplateSchema),
  MeterReading: mongoose.model('MeterReading', MeterReadingSchema),
  PaymentStatistics: mongoose.model('PaymentStatistics', PaymentStatisticsSchema),
  FeeCategory,
  FeeType
};
