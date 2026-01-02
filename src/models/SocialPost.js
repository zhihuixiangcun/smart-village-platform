/**
 * 朋友圈动态模型
 * 功能：支持图文、视频、文章发布，点赞评论分享，内容审核
 */

const mongoose = require('mongoose');

const socialPostSchema = new mongoose.Schema({
  // 基础信息
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 内容类型
  postType: {
    type: String,
    enum: ['text', 'image', 'video', 'article', 'live', 'share'],
    required: true
  },

  // 内容数据
  content: {
    text: {
      type: String,
      maxlength: 5000,
      trim: true
    },
    images: [{
      url: { type: String, required: true },
      thumbnail: String,
      width: Number,
      height: Number,
      size: Number,
      format: String,
      cdnUrl: String
    }],
    videos: [{
      url: { type: String, required: true },
      thumbnail: String,
      duration: Number,
      size: Number,
      quality: String,
      format: String,
      cdnUrl: String
    }],
    article: {
      title: { type: String, maxlength: 200 },
      content: String,
      coverImage: String,
      readingTime: Number
    },
    share: {
      originalPostId: { type: mongoose.Schema.Types.ObjectId, ref: 'SocialPost' },
      comment: String
    }
  },

  // 互动数据
  interactions: {
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    bookmarks: { type: Number, default: 0 }
  },

  // 标签与分类
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  category: {
    type: String,
    enum: ['daily', 'agriculture', 'news', 'help', 'trade', 'activity', 'other'],
    default: 'daily'
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // 位置信息
  location: {
    name: String,
    address: String,
    coordinates: {
      type: [Number],
      index: '2dsphere'
    },
    poi: String
  },

  // 状态管理
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'deleted'],
    default: 'published'
  },

  // 内容审核
  moderation: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'flagged'],
      default: 'approved'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    reason: String,
    sensitiveWords: [String],
    aiScore: Number,
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    }
  },

  // 可见性控制
  visibility: {
    type: String,
    enum: ['public', 'village_only', 'friends', 'custom', 'private'],
    default: 'public'
  },
  allowedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  excludedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // 话题关联
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SocialTopic'
  },

  // 推广信息
  promotion: {
    isPromoted: Boolean,
    promotedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    promoExpiresAt: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============== 虚拟字段 ==============
socialPostSchema.virtual('engagementRate').get(function() {
  const total = this.interactions.likes + this.interactions.comments + this.interactions.shares;
  return this.interactions.views > 0 ? (total / this.interactions.views * 100).toFixed(2) : 0;
});

// ============== 索引 ==============
socialPostSchema.index({ villageId: -1, createdAt: -1 });
socialPostSchema.index({ author: -1, createdAt: -1 });
socialPostSchema.index({ tags: 1 });
socialPostSchema.index({ 'interactions.likes': -1 });
socialPostSchema.index({ 'interactions.views': -1 });
socialPostSchema.index({ category: 1, createdAt: -1 });
socialPostSchema.index({ 'moderation.status': 1, createdAt: -1 });
socialPostSchema.index({ location: '2dsphere' });
socialPostSchema.index({ 'content.text': 'text', tags: 'text' });

// ============== 方法 ==============
socialPostSchema.methods.incrementView = async function() {
  this.interactions.views += 1;
  return this.save();
};

socialPostSchema.methods.addTag = function(tag) {
  const normalizedTag = tag.toLowerCase().trim();
  if (!this.tags.includes(normalizedTag)) {
    this.tags.push(normalizedTag);
  }
  return this.save();
};

// 递增互动计数
socialPostSchema.methods.incrementInteraction = function(type) {
  const validTypes = ['likes', 'comments', 'shares', 'bookmarks'];
  if (validTypes.includes(type)) {
    this.interactions[type] = (this.interactions[type] || 0) + 1;
  }
  return this.save();
};

// 递减互动计数
socialPostSchema.methods.decrementInteraction = function(type) {
  const validTypes = ['likes', 'comments', 'shares', 'bookmarks'];
  if (validTypes.includes(type) && this.interactions[type] > 0) {
    this.interactions[type]--;
  }
  return this.save();
};

module.exports = mongoose.model('SocialPost', socialPostSchema);
