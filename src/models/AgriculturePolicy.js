/**
 * 农业政策模型 (AgriculturePolicy)
 * 用于存储农业相关政策信息
 */

const mongoose = require('mongoose');

const agriculturePolicySchema = new mongoose.Schema({
  // 政策标题
  title: {
    type: String,
    required: true,
    trim: true
  },

  // 政策编号
  policyNumber: {
    type: String,
    unique: true,
    trim: true,
    index: true
  },

  // 政策分类
  category: {
    type: String,
    enum: ['subsidy', 'loan', 'insurance', 'technology', 'infrastructure', 'environment', 'market', 'other'],
    required: true,
    index: true
  },

  // 政策类型
  type: {
    type: String,
    enum: ['national', 'provincial', 'municipal', 'county', 'township'],
    required: true,
    index: true
  },

  // 发布机构
  publisher: {
    name: String,
    level: String,
    department: String
  },

  // 政策内容摘要
  summary: {
    type: String,
    required: true
  },

  // 详细内容
  content: {
    type: String,
    required: true
  },

  // 适用对象
  eligibleApplicants: [{
    type: String
  }],

  // 申请条件
  conditions: [{
    title: String,
    description: String,
    required: { type: Boolean, default: false }
  }],

  // 补贴标准/金额
  subsidyStandard: {
    minAmount: Number,
    maxAmount: Number,
    unit: String,
    calculation: String
  },

  // 申请材料
  requiredDocuments: [{
    name: String,
    description: String,
    required: { type: Boolean, default: true }
  }],

  // 申请流程
  applicationProcess: [{
    step: Number,
    action: String,
    description: String,
    expectedDuration: String
  }],

  // 政策有效期
  validityPeriod: {
    startDate: Date,
    endDate: Date,
    ongoing: { type: Boolean, default: false }
  },

  // 申请截止日期
  applicationDeadline: Date,

  // 关联的村庄
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    index: true
  },

  // 适用地区
  applicableRegions: [{
    province: String,
    city: String,
    district: String
  }],

  // 相关作物
  relatedCrops: [String],

  // 状态
  status: {
    type: String,
    enum: ['draft', 'active', 'expired', 'archived'],
    default: 'active',
    index: true
  },

  // 浏览次数
  viewCount: {
    type: Number,
    default: 0
  },

  // 收藏次数
  favoriteCount: {
    type: Number,
    default: 0
  },

  // 标签
  tags: [{
    type: String,
    trim: true
  }],

  // 附件
  attachments: [{
    filename: String,
    url: String,
    fileType: String,
    fileSize: Number
  }],

  // 相关政策
  relatedPolicies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgriculturePolicy'
  }],

  // 常见问题
  faqs: [{
    question: String,
    answer: String
  }],

  // 联系方式
  contactInfo: {
    department: String,
    phone: String,
    email: String,
    address: String,
    officeHours: String
  },

  // 创建者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // 最后更新者
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

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
  collection: 'agriculturepolicies'
});

// 复合索引
agriculturePolicySchema.index({ category: 1, type: 1, status: 1 });
agriculturePolicySchema.index({ villageId: 1, status: 1, createdAt: -1 });
agriculturePolicySchema.index({ 'validityPeriod.endDate': 1, status: 1 });
agriculturePolicySchema.index({ tags: 1 });

// 虚拟字段
agriculturePolicySchema.virtual('isValid').get(function() {
  if (this.status !== 'active') return false;
  if (this.validityPeriod.ongoing) return true;
  if (!this.validityPeriod.endDate) return true;
  return new Date() <= this.validityPeriod.endDate;
});

agriculturePolicySchema.virtual('isUrgent').get(function() {
  if (!this.applicationDeadline) return false;
  const daysUntilDeadline = Math.ceil((this.applicationDeadline - new Date()) / (1000 * 60 * 60 * 24));
  return daysUntilDeadline <= 30 && daysUntilDeadline >= 0;
});

// 实例方法
agriculturePolicySchema.methods.incrementView = function() {
  this.viewCount += 1;
  return this.save();
};

agriculturePolicySchema.methods.addFavorite = function() {
  this.favoriteCount += 1;
  return this.save();
};

// 静态方法
agriculturePolicySchema.statics.findActive = function(options = {}) {
  const { limit = 20, skip = 0, villageId, category } = options;
  const query = {
    status: 'active',
    $or: [
      { 'validityPeriod.ongoing': true },
      { 'validityPeriod.endDate': { $gte: new Date() } },
      { 'validityPeriod.endDate': { $exists: false } }
    ]
  };

  if (villageId) query.villageId = villageId;
  if (category) query.category = category;

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('createdBy', 'username name');
};

agriculturePolicySchema.statics.findUrgent = function(options = {}) {
  const { limit = 10, villageId } = options;
  const query = {
    status: 'active',
    applicationDeadline: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
  };

  if (villageId) query.villageId = villageId;

  return this.find(query)
    .sort({ applicationDeadline: 1 })
    .limit(limit)
    .populate('createdBy', 'username name');
};

agriculturePolicySchema.statics.findByCategory = function(category, options = {}) {
  const { limit = 20, skip = 0, villageId } = options;
  const query = {
    category,
    status: 'active',
    $or: [
      { 'validityPeriod.ongoing': true },
      { 'validityPeriod.endDate': { $gte: new Date() } },
      { 'validityPeriod.endDate': { $exists: false } }
    ]
  };

  if (villageId) query.villageId = villageId;

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('createdBy', 'username name');
};

agriculturePolicySchema.statics.search = function(keyword, options = {}) {
  const { limit = 20, villageId } = options;
  const query = {
    status: 'active',
    $or: [
      { title: { $regex: keyword, $options: 'i' } },
      { summary: { $regex: keyword, $options: 'i' } },
      { content: { $regex: keyword, $options: 'i' } },
      { tags: { $in: [new RegExp(keyword, 'i')] } }
    ]
  };

  if (villageId) query.villageId = villageId;

  return this.find(query)
    .sort({ viewCount: -1, createdAt: -1 })
    .limit(limit)
    .populate('createdBy', 'username name');
};

module.exports = mongoose.model('AgriculturePolicy', agriculturePolicySchema);
