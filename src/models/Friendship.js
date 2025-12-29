/**
 * 好友关系模型
 * 管理用户之间的好友关系
 */

const mongoose = require('mongoose');

// 好友状态枚举
const FriendshipStatus = {
  PENDING: 'pending',       // 待验证
  ACCEPTED: 'accepted',     // 已是好友
  BLOCKED: 'blocked',       // 已拉黑
  DELETED: 'deleted'        // 已删除
};

const friendshipSchema = new mongoose.Schema({
  // 用户ID
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 好友ID
  friendId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 好友状态
  status: {
    type: String,
    enum: Object.values(FriendshipStatus),
    default: FriendshipStatus.PENDING,
    index: true
  },

  // 备注名称
  remark: {
    type: String,
    default: '',
    maxlength: 50
  },

  // 分组名称
  group: {
    type: String,
    default: '默认分组',
    enum: ['默认分组', '家人', '亲戚', '邻居', '朋友', '同事', '其他']
  },

  // 标签
  tags: [{
    type: String,
    maxlength: 20
  }],

  // 隐私设置
  privacy: {
    canSeeMyMoments: {
      type: Boolean,
      default: true
    },
    canSeeMyOnlineStatus: {
      type: Boolean,
      default: true
    },
    canCallMe: {
      type: Boolean,
      default: true
    }
  },

  // 特殊备注
  specialNote: {
    type: String,
    maxlength: 200
  },

  // 乡村号（好友的乡村号）
  villageCode: {
    type: String,
    description: '好友的乡村号，用于搜索'
  },

  // 手机号（加密存储）
  phone: {
    type: String,
    description: '好友的手机号（加密）'
  },

  // 关联的村庄
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village'
  },

  // 申请备注（待验证时记录）
  requestMessage: {
    type: String,
    maxlength: 200
  },

  // 申请时间
  requestedAt: {
    type: Date,
    default: Date.now
  },

  // 接受时间
  acceptedAt: {
    type: Date
  },

  // 最后互动时间
  lastInteractionAt: {
    type: Date,
    default: Date.now
  },

  // 互动次数
  interactionCount: {
    type: Number,
    default: 0
  },

  // 是否置顶
  isPinned: {
    type: Boolean,
    default: false
  },

  // 是否免打扰
  isMuted: {
    type: Boolean,
    default: false
  },

  // 自定义排序
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'friendships'
});

// 复合索引
friendshipSchema.index({ userId: 1, status: 1 });
friendshipSchema.index({ userId: 1, group: 1 });
friendshipSchema.index({ villageId: 1, userId: 1 });

// 唯一索引（防止重复添加）
friendshipSchema.index({ userId: 1, friendId: 1 }, { unique: true });

// 实例方法 - 接受好友请求
friendshipSchema.methods.accept = function() {
  this.status = FriendshipStatus.ACCEPTED;
  this.acceptedAt = new Date();
  this.lastInteractionAt = new Date();
  return this.save();
};

// 实例方法 - 拉黑好友
friendshipSchema.methods.block = function() {
  this.status = FriendshipStatus.BLOCKED;
  return this.save();
};

// 实例方法 - 删除好友
friendshipSchema.methods.deleteFriend = function() {
  this.status = FriendshipStatus.DELETED;
  return this.save();
};

// 实例方法 - 更新最后互动时间
friendshipSchema.methods.updateInteraction = function() {
  this.lastInteractionAt = new Date();
  this.interactionCount += 1;
  return this.save();
};

// 实例方法 - 设置备注
friendshipSchema.methods.setRemark = function(remark) {
  this.remark = remark;
  return this.save();
};

// 实例方法 - 设置分组
friendshipSchema.methods.setGroup = function(group) {
  this.group = group;
  return this.save();
};

// 实例方法 - 切换置顶
friendshipSchema.methods.togglePin = function() {
  this.isPinned = !this.isPinned;
  return this.save();
};

// 实例方法 - 切换免打扰
friendshipSchema.methods.toggleMute = function() {
  this.isMuted = !this.isMuted;
  return this.save();
};

// 静态方法 - 获取好友列表
friendshipSchema.statics.getFriendList = function(userId, options = {}) {
  const {
    status = FriendshipStatus.ACCEPTED,
    group,
    keyword,
    limit = 50,
    skip = 0
  } = options;

  const query = { userId };

  if (status) query.status = status;
  if (group) query.group = group;

  return this.find(query)
    .populate('friendId', 'name phone avatar villageCode')
    .sort({ isPinned: -1, sortOrder: 1, lastInteractionAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// 静态方法 - 获取好友请求列表
friendshipSchema.statics.getPendingRequests = function(userId) {
  return this.find({
    friendId: userId,
    status: FriendshipStatus.PENDING
  })
    .populate('userId', 'name phone avatar villageCode')
    .sort({ requestedAt: -1 })
    .lean();
};

// 静态方法 - 搜索好友
friendshipSchema.statics.searchFriends = function(userId, keyword) {
  const query = {
    userId,
    status: FriendshipStatus.ACCEPTED
  };

  if (keyword) {
    return this.find(query)
      .populate({
        path: 'friendId',
        match: {
          $or: [
            { name: { $regex: keyword, $options: 'i' } },
            { villageCode: { $regex: keyword, $options: 'i' } }
          ]
        }
      })
      .sort({ lastInteractionAt: -1 })
      .lean();
  }

  return this.find(query)
    .populate('friendId', 'name phone avatar villageCode')
    .sort({ lastInteractionAt: -1 })
    .lean();
};

// 静态方法 - 检查是否是好友
friendshipSchema.statics.areFriends = function(userId1, userId2) {
  return this.findOne({
    $or: [
      { userId: userId1, friendId: userId2 },
      { userId: userId2, friendId: userId1 }
    ],
    status: FriendshipStatus.ACCEPTED
  }).lean();
};

// 静态方法 - 获取统计信息
friendshipSchema.statics.getStats = function(userId) {
  return this.aggregate([
    {
      $match: { userId: new mongoose.Types.ObjectId(userId) }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

const Friendship = mongoose.model('Friendship', friendshipSchema);

module.exports = {
  Friendship,
  FriendshipStatus
};
