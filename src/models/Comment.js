/**
 * 评论模型
 * 功能：支持楼中楼回复、表情回应、@提及
 */

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SocialPost',
    required: true,
    index: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true
  },

  // 回复评论（支持楼中楼）
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  replyToUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // 点赞
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likesCount: {
    type: Number,
    default: 0
  },

  // 状态
  status: {
    type: String,
    enum: ['active', 'deleted', 'hidden'],
    default: 'active'
  },

  // 审核
  moderation: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved'
    },
    reviewedAt: Date
  },

  // 表情回应
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['like', 'love', 'laugh', 'surprised', 'sad', 'angry']
    }
  }],

  // @提及
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// ============== 索引 ==============
commentSchema.index({ postId: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ author: 1 });

// ============== 方法 ==============
// 添加点赞
commentSchema.methods.addLike = function(userId) {
  if (!this.likes.includes(userId)) {
    this.likes.push(userId);
    this.likesCount = this.likes.length;
  }
  return this.save();
};

// 取消点赞
commentSchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(id => !id.equals(userId));
  this.likesCount = this.likes.length;
  return this.save();
};

// 添加表情回应
commentSchema.methods.addReaction = function(userId, reactionType) {
  // 移除该用户的其他反应
  this.reactions = this.reactions.filter(r => !r.user.equals(userId));
  // 添加新反应
  this.reactions.push({ user: userId, type: reactionType });
  return this.save();
};

// 获取子评论
commentSchema.methods.getReplies = async function() {
  return this.model('Comment').find({ parentComment: this._id })
    .populate('author', 'username profile.firstName profile.lastName profile.avatar')
    .sort({ createdAt: 1 });
};

// 级联删除：删除评论时，删除所有子评论
commentSchema.pre('deleteOne', { document: true, query: false }, async function() {
  await this.model('Comment').deleteMany({ parentComment: this._id });
});

module.exports = mongoose.model('Comment', commentSchema);
