/**
 * 社交关系模型（关注系统）
 * 功能：关注、好友、拉黑、分组、亲密度计算
 */

const mongoose = require('mongoose');

const socialFollowSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  following: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // 关系类型
  relationType: {
    type: String,
    enum: ['follow', 'friend', 'block'],
    default: 'follow'
  },

  // 好友状态（双向关注）
  friendshipStatus: {
    type: String,
    enum: ['none', 'pending', 'accepted', 'declined'],
    default: 'none'
  },

  // 分组（自定义列表）
  lists: [{
    name: String,
    color: String,
    emoji: String
  }],

  // 备注
  alias: String,
  notes: String,

  // 特别关注
  isSpecial: Boolean,
  isMuted: Boolean,

  // 亲密关系
  closenessScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  // 统计
  interactionCount: {
    type: Number,
    default: 0
  },
  lastInteractionAt: Date

}, {
  timestamps: true
});

// ============== 复合唯一索引 ==============
socialFollowSchema.index({ follower: 1, following: 1 }, { unique: true });
socialFollowSchema.index({ following: 1 });

// ============== 静态方法 ==============
// 获取关注列表
socialFollowSchema.statics.getFollowing = function(userId, options = {}) {
  const query = { follower: userId, relationType: 'follow' };
  if (options.list) {
    query['lists.name'] = options.list;
  }
  return this.find(query)
    .populate('following', 'username profile.firstName profile.lastName profile.avatar')
    .sort({ createdAt: -1 });
};

// 获取粉丝列表
socialFollowSchema.statics.getFollowers = function(userId) {
  return this.find({ following: userId, relationType: 'follow' })
    .populate('follower', 'username profile.firstName profile.lastName profile.avatar')
    .sort({ createdAt: -1 });
};

// 获取好友列表
socialFollowSchema.statics.getFriends = function(userId) {
  return this.find({
    $or: [
      { follower: userId, relationType: 'friend', friendshipStatus: 'accepted' },
      { following: userId, relationType: 'friend', friendshipStatus: 'accepted' }
    ]
  }).populate('following follower', 'username profile.firstName profile.lastName profile.avatar');
};

// 检查是否关注
socialFollowSchema.statics.isFollowing = function(followerId, followingId) {
  return this.findOne({
    follower: followerId,
    following: followingId,
    relationType: { $in: ['follow', 'friend'] }
  });
};

// 更新亲密度
socialFollowSchema.statics.updateCloseness = function(userId1, userId2, delta = 1) {
  return this.findOneAndUpdate(
    {
      $or: [
        { follower: userId1, following: userId2 },
        { follower: userId2, following: userId1 }
      ]
    },
    {
      $inc: {
        closenessScore: Math.min(delta, 100),
        interactionCount: 1
      },
      $set: { lastInteractionAt: new Date() }
    },
    { upsert: true }
  );
};

// ============== 验证 ==============
socialFollowSchema.pre('save', function(next) {
  if (this.follower.equals(this.following)) {
    next(new Error('不能关注自己'));
  } else {
    next();
  }
});

module.exports = mongoose.model('SocialFollow', socialFollowSchema);
