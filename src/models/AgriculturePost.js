/**
 * 农业知识分享模型
 * 用于农业技术教程、作物种植经验、病虫害防治等知识分享
 */

const mongoose = require('mongoose');

const agriculturePostSchema = new mongoose.Schema({
  // 基本信息
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // 内容类型
  postType: {
    type: String,
    enum: ['article', 'video', 'image', 'qa', 'tutorial'],
    default: 'article'
  },

  // 分类
  category: {
    type: String,
    enum: [
      'crop_farming',      // 粮食种植
      'vegetable',         // 蔬菜种植
      'fruit',             // 果树种植
      'livestock',         // 畜牧养殖
      'pest_control',      // 病虫害防治
      'fertilizer',        // 施肥技术
      'irrigation',        // 灌溉技术
      'machinery',         // 农机使用
      'processing',        // 农产品加工
      'market_info',       // 市场信息
      'policy'             // 政策解读
    ],
    required: true
  },

  // 作物类型（适用于种植类）
  cropType: {
    type: String,
    enum: [
      'rice', 'wheat', 'corn', 'soybean', 'potato',
      'tomato', 'cucumber', 'pepper', 'eggplant',
      'apple', 'orange', 'grape', 'peach',
      'pig', 'chicken', 'duck', 'cow', 'sheep',
      'other'
    ]
  },

  // 内容
  content: {
    text: {
      type: String,
      required: true
    },
    images: [{
      url: String,
      caption: String,
      order: Number
    }],
    videos: [{
      url: String,
      thumbnail: String,
      duration: Number // 秒
    }],
    attachments: [{
      name: String,
      url: String,
      size: Number,
      fileType: String
    }]
  },

  // 技术要点
  techniques: [{
    name: String,
    description: String,
    step: Number
  }],

  // 季节性标签
  season: {
    type: String,
    enum: ['spring', 'summer', 'autumn', 'winter', 'all_season']
  },

  // 适用地区
  region: {
    province: String,
    city: String,
    climate: {
      type: String,
      enum: ['tropical', 'subtropical', 'temperate', 'cold']
    }
  },

  // 标签
  tags: [{
    type: String,
    trim: true
  }],

  // 专家认证
  expertVerified: {
    isVerified: {
      type: Boolean,
      default: false
    },
    expertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date,
    comments: String
  },

  // 实用性评分
  usefulness: {
    totalVotes: {
      type: Number,
      default: 0
    },
    usefulCount: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    }
  },

  // 互动统计
  interactions: {
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    bookmarks: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    }
  },

  // 难度等级
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },

  // 预计成本
  estimatedCost: {
    min: Number,
    max: Number,
    unit: String,
    description: String
  },

  // 预期收益
  expectedYield: {
    amount: Number,
    unit: String,
    period: String
  },

  // 状态
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    index: true
  },

  // 审核状态
  moderation: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    reason: String
  },

  // 相关推荐
  relatedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgriculturePost'
  }],

  // 来源
  source: {
    type: String,
    enum: ['original', 'shared', 'official'],
    default: 'original'
  },
  sourceUrl: String,

  // 引用
  references: [{
    title: String,
    author: String,
    url: String,
    publishedAt: Date
  }],

  // 发布时间
  publishedAt: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
agriculturePostSchema.index({ villageId: 1, category: 1, status: 1 });
agriculturePostSchema.index({ author: 1, status: 1 });
agriculturePostSchema.index({ 'expertVerified.isVerified': -1, createdAt: -1 });
agriculturePostSchema.index({ tags: 1 });
agriculturePostSchema.index({ cropType: 1 });

// 虚拟字段：实用性百分比
agriculturePostSchema.virtual('usefulnessPercentage').get(function() {
  if (this.usefulness.totalVotes === 0) return 0;
  return Math.round((this.usefulness.usefulCount / this.usefulness.totalVotes) * 100);
});

// 虚拟字段：是否视频
agriculturePostSchema.virtual('isVideo').get(function() {
  return this.postType === 'video' && this.content.video && this.content.video.url;
});

// 实例方法：增加浏览量
agriculturePostSchema.methods.incrementView = async function() {
  this.interactions.views += 1;
  return this.save();
};

// 实例方法：点赞
agriculturePostSchema.methods.like = async function(userId) {
  this.interactions.likes += 1;
  return this.save();
};

// 实例方法：标记有用
agriculturePostSchema.methods.markUseful = async function(useful) {
  this.usefulness.totalVotes += 1;
  if (useful) {
    this.usefulness.usefulCount += 1;
  }
  // 重新计算平均评分
  this.usefulness.averageRating = (this.usefulness.usefulCount / this.usefulness.totalVotes) * 5;
  return this.save();
};

// 实例方法：添加评论
agriculturePostSchema.methods.addComment = async function() {
  this.interactions.comments += 1;
  return this.save();
};

// 实例方法：发布
agriculturePostSchema.methods.publish = async function() {
  this.status = 'published';
  this.publishedAt = new Date();
  return this.save();
};

// 静态方法：获取热门帖子
agriculturePostSchema.statics.getPopularPosts = function(villageId, limit = 10) {
  return this.find({
    villageId,
    status: 'published',
    'moderation.status': 'approved'
  })
    .sort({ 'interactions.views': -1, 'interactions.likes': -1 })
    .limit(limit)
    .populate('author', 'username profile.firstName profile.lastName profile.avatar')
    .populate('expertVerified.expertId', 'username profile.firstName profile.lastName');
};

// 静态方法：获取专家认证帖子
agriculturePostSchema.statics.getExpertVerifiedPosts = function(villageId, limit = 10) {
  return this.find({
    villageId,
    status: 'published',
    'expertVerified.isVerified': true,
    'moderation.status': 'approved'
  })
    .sort({ 'expertVerified.verifiedAt': -1 })
    .limit(limit)
    .populate('author', 'username profile.firstName profile.lastName profile.avatar')
    .populate('expertVerified.expertId', 'username profile.firstName profile.lastName');
};

// 静态方法：按分类获取帖子
agriculturePostSchema.statics.getByCategory = function(villageId, category, options = {}) {
  const {
    cropType,
    season,
    difficulty,
    page = 1,
    limit = 20
  } = options;

  const query = {
    villageId,
    status: 'published',
    'moderation.status': 'approved'
  };

  if (category) query.category = category;
  if (cropType) query.cropType = cropType;
  if (season) query.season = season;
  if (difficulty) query.difficulty = difficulty;

  return this.find(query)
    .sort({ publishedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('author', 'username profile.firstName profile.lastName profile.avatar');
};

// 静态方法：搜索帖子
agriculturePostSchema.statics.searchPosts = function(villageId, keyword, options = {}) {
  const {
    category,
    cropType,
    page = 1,
    limit = 20
  } = options;

  const query = {
    villageId,
    status: 'published',
    'moderation.status': 'approved',
    $or: [
      { title: { $regex: keyword, $options: 'i' } },
      { 'content.text': { $regex: keyword, $options: 'i' } },
      { tags: { $regex: keyword, $options: 'i' } }
    ]
  };

  if (category) query.category = category;
  if (cropType) query.cropType = cropType;

  return this.find(query)
    .sort({ publishedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('author', 'username profile.firstName profile.lastName profile.avatar');
};

// 静态方法：获取标签云
agriculturePostSchema.statics.getTagCloud = function(villageId, limit = 50) {
  return this.aggregate([
    {
      $match: {
        villageId: mongoose.Types.ObjectId(villageId),
        status: 'published',
        'moderation.status': 'approved'
      }
    },
    {
      $unwind: '$tags'
    },
    {
      $group: {
        _id: '$tags',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

// 静态方法：获取统计
agriculturePostSchema.statics.getStatistics = function(villageId) {
  return this.aggregate([
    {
      $match: {
        villageId: mongoose.Types.ObjectId(villageId),
        status: 'published'
      }
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalViews: { $sum: '$interactions.views' },
        totalLikes: { $sum: '$interactions.likes' }
      }
    }
  ]);
};

module.exports = mongoose.model('AgriculturePost', agriculturePostSchema);
