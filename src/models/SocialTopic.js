/**
 * 话题模型
 * 功能：话题聚合、热门趋势、参与统计
 */

const mongoose = require('mongoose');

const socialTopicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 50
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  coverImage: String,

  // 分类
  category: {
    type: String,
    enum: ['agriculture', 'life', 'news', 'help', 'trade', 'activity'],
    default: 'life'
  },

  // 统计
  postsCount: {
    type: Number,
    default: 0
  },
  participantsCount: {
    type: Number,
    default: 0
  },

  // 热度
  trendingScore: {
    type: Number,
    default: 0
  },
  hot: {
    type: Boolean,
    default: false
  },

  // 管理
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village'
  },

  // 状态
  status: {
    type: String,
    enum: ['active', 'locked', 'archived'],
    default: 'active'
  },

  // 封面图信息
  banner: {
    image: String,
    color: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============== 索引 ==============
socialTopicSchema.index({ name: 'text', description: 'text' });
socialTopicSchema.index({ hot: -1, trendingScore: -1 });
socialTopicSchema.index({ category: 1 });
socialTopicSchema.index({ villageId: 1 });

// ============== 虚拟字段 ==============
socialTopicSchema.virtual('displayName').get(function() {
  return `#${this.name}`;
});

// ============== 静态方法 ==============
// 获取热门话题
socialTopicSchema.statics.getTrending = function(limit = 10, villageId = null) {
  const query = { hot: true, status: 'active' };
  if (villageId) {
    query.$or = [
      { villageId },
      { villageId: { $exists: false } }  // 全局话题
    ];
  }
  return this.find(query)
    .sort({ trendingScore: -1 })
    .limit(limit);
};

// 生成slug
socialTopicSchema.methods.generateSlug = function() {
  this.slug = this.name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return this.slug;
};

// 增加帖子数
socialTopicSchema.methods.incrementPosts = function() {
  this.postsCount++;
  this.updateTrendingScore();
  return this.save();
};

// 更新热度分数
socialTopicSchema.methods.updateTrendingScore = function() {
  // 热度计算公式：最近帖子数 * 2 + 参与者数 + 时间衰减
  const recentPostsBoost = Math.min(this.postsCount * 2, 100);
  const participantsBoost = Math.min(this.participantsCount, 50);
  const timeDecay = Math.max(0, 1 - (Date.now() - this.updatedAt) / (7 * 24 * 60 * 60 * 1000));

  this.trendingScore = Math.floor((recentPostsBoost + participantsBoost) * timeDecay);
  this.hot = this.trendingScore > 50;

  return this.trendingScore;
};

// ============== 中间件 ==============
socialTopicSchema.pre('save', function(next) {
  if (!this.slug) {
    this.generateSlug();
  }
  next();
});

module.exports = mongoose.model('SocialTopic', socialTopicSchema);
