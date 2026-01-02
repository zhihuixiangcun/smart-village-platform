/**
 * FriendRequest 模型
 * 好友请求/添加好友数据模型
 * 支持通过手机号、乡村号、二维码等方式添加好友
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const friendRequestSchema = new Schema({
  // 发起请求的用户
  from: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 接收请求的用户
  to: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 请求附言
  message: {
    type: String,
    maxlength: 200,
    default: ''
  },

  // 请求来源: phone_search(手机号搜索) | qrcode_search(二维码/乡村号) |
  //         recommendation(推荐) | nearby(附近的人) | share(名片分享)
  source: {
    type: String,
    enum: ['phone_search', 'qrcode_search', 'recommendation', 'nearby', 'share', 'other'],
    default: 'other'
  },

  // 来源详情（可选）
  sourceDetail: {
    type: Schema.Types.Mixed
    // 例如：{ phone: '138****1234' } 或 { qrcode: '乡村号123' }
  },

  // 请求状态: pending(待处理) | accepted(已接受) | declined(已拒绝) | expired(已过期)
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired'],
    default: 'pending',
    index: true
  },

  // 拒绝原因（当status为declined时）
  declineReason: {
    type: String,
    maxlength: 200
  },

  // 响应时间
  respondedAt: Date,

  // 过期时间（7天后自动过期）
  expiresAt: {
    type: Date,
    default: function() {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date;
    },
    index: true
  },

  // 备注（接受后可以添加）
  alias: String,

  // 分组标签（接受后可以设置）
  tags: [String],

  // 所属乡村
  villageId: {
    type: Schema.Types.ObjectId,
    ref: 'Village'
  }
}, {
  timestamps: true,
  toObject: { virtuals: true },
  toJSON: { virtuals: true }
});

// 复合索引：from + to 唯一（同一对用户只能有一个pending请求）
friendRequestSchema.index(
  { from: 1, to: 1 },
  { unique: true,
    partialFilterExpression: { status: 'pending' }
  }
);

// 索引：查找接收到的待处理请求
friendRequestSchema.index({ to: 1, status: 1, createdAt: -1 });

// 索引：查找发送的请求
friendRequestSchema.index({ from: 1, createdAt: -1 });

// 虚拟字段：是否已过期
friendRequestSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// 实例方法：接受请求
friendRequestSchema.methods.accept = function() {
  if (this.status !== 'pending') {
    return Promise.reject(new Error('请求状态不正确，无法接受'));
  }
  if (this.isExpired) {
    return Promise.reject(new Error('请求已过期'));
  }

  this.status = 'accepted';
  this.respondedAt = new Date();
  return this.save();
};

// 实例方法：拒绝请求
friendRequestSchema.methods.decline = function(reason) {
  if (this.status !== 'pending') {
    return Promise.reject(new Error('请求状态不正确，无法拒绝'));
  }

  this.status = 'declined';
  this.declineReason = reason || '';
  this.respondedAt = new Date();
  return this.save();
};

// 实例方法：设置过期
friendRequestSchema.methods.expire = function() {
  if (this.status !== 'pending') {
    return Promise.reject(new Error('请求状态不正确'));
  }

  this.status = 'expired';
  return this.save();
};

// 静态方法：创建好友请求
friendRequestSchema.statics.createRequest = async function(fromId, toId, options = {}) {
  // 检查是否已存在pending请求
  const existing = await this.findOne({
    from: fromId,
    to: toId,
    status: 'pending'
  });

  if (existing) {
    throw new Error('已存在待处理的请求');
  }

  // 检查是否已经是好友（通过SocialFollow模型检查）
  const SocialFollow = mongoose.model('SocialFollow');
  const areFriends = await SocialFollow.findOne({
    $or: [
      { follower: fromId, following: toId, relationType: 'friend' },
      { follower: toId, following: fromId, relationType: 'friend' }
    ]
  });

  if (areFriends) {
    throw new Error('已经是好友关系');
  }

  const request = new this({
    from: fromId,
    to: toId,
    message: options.message || '',
    source: options.source || 'other',
    sourceDetail: options.sourceDetail,
    villageId: options.villageId
  });

  return request.save();
};

// 静态方法：获取用户收到的待处理请求
friendRequestSchema.statics.getPendingRequests = function(userId) {
  return this.find({
    to: userId,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  })
    .populate('from', 'username profile.avatar profile.nickName profile.phone committeeProfile.qrCode')
    .sort({ createdAt: -1 });
};

// 静态方法：获取用户发送的请求
friendRequestSchema.statics.getSentRequests = function(userId, options = {}) {
  const query = { from: userId };
  if (options.status) {
    query.status = options.status;
  }

  return this.find(query)
    .populate('to', 'username profile.avatar profile.nickName')
    .sort({ createdAt: -1 })
    .limit(options.limit || 20);
};

// 静态方法：检查两个用户之间是否存在pending请求
friendRequestSchema.statics.hasPendingRequest = function(user1Id, user2Id) {
  return this.findOne({
    $or: [
      { from: user1Id, to: user2Id },
      { from: user2Id, to: user1Id }
    ],
    status: 'pending'
  });
};

// 静态方法：获取好友关系列表（接受过的请求）
friendRequestSchema.statics.getFriendList = function(userId) {
  return this.find({
    $or: [{ from: userId }, { to: userId }],
    status: 'accepted'
  })
    .populate('from', 'username profile.avatar profile.nickName profile.phone')
    .populate('to', 'username profile.avatar profile.nickName profile.phone')
    .sort({ respondedAt: -1 });
};

// 中间件：过期检查
friendRequestSchema.pre('save', function(next) {
  if (this.status === 'pending' && this.isExpired) {
    this.status = 'expired';
  }
  next();
});

// 静态方法：自动过期所有过期的pending请求
friendRequestSchema.expireOldRequests = async function() {
  const result = await this.updateMany(
    {
      status: 'pending',
      expiresAt: { $lt: new Date() }
    },
    { status: 'expired' }
  );
  return result.modifiedCount;
};

const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);

module.exports = FriendRequest;
