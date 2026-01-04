/**
 * 农业问答模型 (AgriQA)
 * 用于存储农业相关的问答数据
 */

const mongoose = require('mongoose');

const agriQASchema = new mongoose.Schema({
  // 问题信息
  question: {
    type: String,
    required: true,
    trim: true
  },

  // 问题分类
  category: {
    type: String,
    enum: ['crop_farming', 'vegetable', 'fruit', 'livestock', 'pest_control', 'fertilizer', 'irrigation', 'machinery', 'processing', 'market_info', 'policy', 'other'],
    required: true,
    index: true
  },

  // 作物类型
  cropType: {
    type: String,
    index: true
  },

  // 问题难度
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },

  // 答案
  answer: {
    type: String,
    required: true
  },

  // 答案详细说明
  explanation: String,

  // 关联的村庄
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    index: true
  },

  // 提问者/作者
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // 专家认证状态
  expertVerified: {
    type: Boolean,
    default: false,
    index: true
  },

  // 专家信息
  verifiedBy: {
    expertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date,
    comments: String
  },

  // 标签
  tags: [{
    type: String,
    trim: true
  }],

  // 季节相关性
  season: {
    type: String,
    enum: ['spring', 'summer', 'autumn', 'winter', 'all_season']
  },

  // 地区
  region: String,

  // 相关技术
  techniques: [String],

  // 预估成本
  estimatedCost: {
    amount: Number,
    currency: { type: String, default: 'CNY' }
  },

  // 预期收益
  expectedYield: String,

  // 参考资料
  references: [{
    title: String,
    url: String,
    source: String
  }],

  // 浏览次数
  viewCount: {
    type: Number,
    default: 0
  },

  // 有用投票
  usefulCount: {
    type: Number,
    default: 0
  },

  // 点赞数
  likesCount: {
    type: Number,
    default: 0
  },

  // 状态
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published',
    index: true
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
  collection: 'agriqas'
});

// 复合索引
agriQASchema.index({ category: 1, cropType: 1, status: 1 });
agriQASchema.index({ villageId: 1, status: 1, createdAt: -1 });
agriQASchema.index({ author: 1, status: 1 });
agriQASchema.index({ tags: 1 });
agriQASchema.index({ expertVerified: 1, usefulCount: -1 });

// 虚拟字段
agriQASchema.virtual('isPopular').get(function() {
  return this.usefulCount > 10 || this.likesCount > 20;
});

// 实例方法
agriQASchema.methods.incrementView = function() {
  this.viewCount += 1;
  return this.save();
};

agriQASchema.methods.markUseful = function() {
  this.usefulCount += 1;
  return this.save();
};

// 静态方法
agriQASchema.statics.findByCategory = function(category, options = {}) {
  const { limit = 20, skip = 0, villageId } = options;
  const query = { category, status: 'published' };
  if (villageId) query.villageId = villageId;

  return this.find(query)
    .sort({ usefulCount: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('author', 'username name')
    .populate('verifiedBy.expertId', 'username name');
};

agriQASchema.statics.findPopular = function(options = {}) {
  const { limit = 10, villageId } = options;
  const query = { status: 'published' };
  if (villageId) query.villageId = villageId;

  return this.find(query)
    .sort({ usefulCount: -1, viewCount: -1 })
    .limit(limit)
    .populate('author', 'username name');
};

agriQASchema.statics.search = function(keyword, options = {}) {
  const { limit = 20, villageId, category } = options;
  const query = {
    status: 'published',
    $or: [
      { question: { $regex: keyword, $options: 'i' } },
      { answer: { $regex: keyword, $options: 'i' } },
      { tags: { $in: [new RegExp(keyword, 'i')] } }
    ]
  };

  if (villageId) query.villageId = villageId;
  if (category) query.category = category;

  return this.find(query)
    .sort({ usefulCount: -1, createdAt: -1 })
    .limit(limit)
    .populate('author', 'username name');
};

module.exports = mongoose.model('AgriQA', agriQASchema);
