/**
 * 聊天群组模型
 * 管理群聊信息、成员管理、群组设置
 */

const mongoose = require('mongoose');

// 群组类型枚举
const GroupType = {
  NORMAL: 'normal',           // 普通群
  VILLAGE: 'village',         // 村民群
  COMMITTEE: 'committee',     // 村委群
  INTEREST: 'interest',       // 兴趣群
  TEMPORARY: 'temporary'      // 临时群
};

// 群组成员角色
const MemberRole = {
  OWNER: 'owner',             // 群主
  ADMIN: 'admin',             // 管理员
  MEMBER: 'member'            // 普通成员
};

// 加群方式枚举
const JoinMethod = {
  OPEN: 'open',               // 开放加入（无需审核）
  INVITE: 'invite',           // 仅限邀请
  APPROVAL: 'approval',       // 需要审核
  CODE: 'code'                // 群码加入
};

// 群组状态
const GroupStatus = {
  ACTIVE: 'active',           // 正常
  ARCHIVED: 'archived',       // 已归档
  BANNED: 'banned',           // 已封禁
  DELETED: 'deleted'          // 已删除
};

const chatGroupSchema = new mongoose.Schema({
  // 群组名称
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },

  // 群组头像
  avatar: {
    type: String,
    default: ''
  },

  // 群组描述
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },

  // 群组类型
  groupType: {
    type: String,
    enum: Object.values(GroupType),
    default: GroupType.NORMAL
  },

  // 群组状态
  status: {
    type: String,
    enum: Object.values(GroupStatus),
    default: GroupStatus.ACTIVE,
    index: true
  },

  // 关联的村庄ID（村民群/村委群）
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    index: true
  },

  // 群主ID
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 管理员ID列表
  adminIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // 成员列表
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    nickname: {
      type: String,
      default: ''
    },
    role: {
      type: String,
      enum: Object.values(MemberRole),
      default: MemberRole.MEMBER
    },
    joinMethod: {
      type: String,
      enum: Object.values(JoinMethod)
    },
    joinAt: {
      type: Date,
      default: Date.now
    },
    lastReadAt: {
      type: Date,
      default: Date.now
    },
    isMuted: {
      type: Boolean,
      default: false
    }
  }],

  // 群成员数量（缓存字段）
  memberCount: {
    type: Number,
    default: 1,
    index: true
  },

  // 最大成员数量
  maxMembers: {
    type: Number,
    default: 500,
    min: 3,
    max: 2000
  },

  // 加群方式
  joinMethod: {
    type: String,
    enum: Object.values(JoinMethod),
    default: JoinMethod.APPROVAL
  },

  // 群二维码
  qrcode: {
    type: String
  },

  // 群邀请码
  inviteCode: {
    type: String,
    unique: true,
    sparse: true
  },

  // 入群问题（审核时使用）
  joinQuestion: {
    type: String,
    maxlength: 200
  },

  // 群公告
  announcement: {
    content: {
      type: String,
      maxlength: 1000,
      default: ''
    },
    publisherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    publisherName: {
      type: String
    },
    updatedAt: {
      type: Date
    }
  },

  // 群设置
  settings: {
    // 全员禁言
    allMuted: {
      type: Boolean,
      default: false
    },
    // 允许成员邀请好友
    allowMemberInvite: {
      type: Boolean,
      default: false
    },
    // 仅管理员可发言
    adminOnly: {
      type: Boolean,
      default: false
    },
    // 显示成员列表
    showMemberList: {
      type: Boolean,
      default: true
    },
    // 允许上传文件
    allowFileUpload: {
      type: Boolean,
      default: true
    },
    // 消息自动撤回时间（秒）
    autoRevokeTime: {
      type: Number,
      default: 0
    },
    // 新消息提醒
    newMessageNotify: {
      type: Boolean,
      default: true
    }
  },

  // 群标签
  tags: [{
    type: String,
    maxlength: 20
  }],

  // 群分类
  category: {
    type: String,
    maxlength: 50
  },

  // 最后消息时间
  lastMessageAt: {
    type: Date,
    index: true
  },

  // 最后消息内容
  lastMessage: {
    messageType: String,
    content: String,
    senderId: mongoose.Schema.Types.ObjectId,
    senderName: String
  },

  // 最后活跃时间
  lastActiveAt: {
    type: Date,
    default: Date.now
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

  // 解散时间
  dismissedAt: {
    type: Date
  },

  // 封禁信息
  bannedInfo: {
    reason: String,
    operatorId: mongoose.Schema.Types.ObjectId,
    operatorName: String,
    bannedAt: Date
  }
}, {
  timestamps: true,
  collection: 'chatGroups'
});

// 复合索引
chatGroupSchema.index({ ownerId: 1, status: 1 });
chatGroupSchema.index({ villageId: 1, groupType: 1 });
chatGroupSchema.index({ 'members.userId': 1 });
chatGroupSchema.index({ lastMessageAt: -1 });
chatGroupSchema.index({ memberCount: -1 });

// 文本搜索索引
chatGroupSchema.index({ name: 'text', description: 'text' });

// ==================== 实例方法 ====================

// 添加成员
chatGroupSchema.methods.addMember = function(userId, options = {}) {
  const {
    nickname = '',
    role = MemberRole.MEMBER,
    joinMethod = JoinMethod.INVITE
  } = options;

  // 检查是否已是成员
  const existingMember = this.members.find(
    m => m.userId.toString() === userId.toString()
  );

  if (existingMember) {
    throw new Error('用户已是群成员');
  }

  // 检查群人数限制
  if (this.members.length >= this.maxMembers) {
    throw new Error('群成员已满');
  }

  this.members.push({
    userId,
    nickname,
    role,
    joinMethod,
    joinAt: new Date()
  });

  this.memberCount = this.members.length;
  this.lastActiveAt = new Date();

  return this.save();
};

// 移除成员
chatGroupSchema.methods.removeMember = function(userId) {
  const memberIndex = this.members.findIndex(
    m => m.userId.toString() === userId.toString()
  );

  if (memberIndex === -1) {
    throw new Error('用户不是群成员');
  }

  // 不能移除群主
  if (this.members[memberIndex].userId.toString() === this.ownerId.toString()) {
    throw new Error('不能移除群主');
  }

  this.members.splice(memberIndex, 1);
  this.memberCount = this.members.length;
  this.lastActiveAt = new Date();

  return this.save();
};

// 设置管理员
chatGroupSchema.methods.setAdmin = function(userId, isAdmin = true) {
  const member = this.members.find(
    m => m.userId.toString() === userId.toString()
  );

  if (!member) {
    throw new Error('用户不是群成员');
  }

  if (isAdmin) {
    member.role = MemberRole.ADMIN;
    if (!this.adminIds.includes(userId)) {
      this.adminIds.push(userId);
    }
  } else {
    member.role = MemberRole.MEMBER;
    this.adminIds = this.adminIds.filter(id => id.toString() !== userId.toString());
  }

  return this.save();
};

// 转让群主
chatGroupSchema.methods.transferOwner = function(newOwnerId, operatorId) {
  const newOwner = this.members.find(
    m => m.userId.toString() === newOwnerId.toString()
  );

  if (!newOwner) {
    throw new Error('新群主不是群成员');
  }

  // 旧群主变为管理员
  const oldOwner = this.members.find(
    m => m.userId.toString() === this.ownerId.toString()
  );

  if (oldOwner) {
    oldOwner.role = MemberRole.ADMIN;
  }

  // 新群主
  this.ownerId = newOwnerId;
  newOwner.role = MemberRole.OWNER;

  // 确保新群主在管理员列表中
  if (!this.adminIds.includes(newOwnerId)) {
    this.adminIds.push(newOwnerId);
  }

  this.lastActiveAt = new Date();

  return this.save();
};

// 设置成员昵称
chatGroupSchema.methods.setMemberNickname = function(userId, nickname) {
  const member = this.members.find(
    m => m.userId.toString() === userId.toString()
  );

  if (!member) {
    throw new Error('用户不是群成员');
  }

  member.nickname = nickname;
  return this.save();
};

// 设置成员禁言状态
chatGroupSchema.methods.setMemberMute = function(userId, isMuted) {
  const member = this.members.find(
    m => m.userId.toString() === userId.toString()
  );

  if (!member) {
    throw new Error('用户不是群成员');
  }

  member.isMuted = isMuted;
  return this.save();
};

// 更新群公告
chatGroupSchema.methods.updateAnnouncement = function(content, publisherId, publisherName) {
  this.announcement = {
    content,
    publisherId,
    publisherName,
    updatedAt: new Date()
  };

  return this.save();
};

// 生成邀请码
chatGroupSchema.methods.generateInviteCode = function() {
  const code = require('crypto').randomBytes(6).toString('hex').toUpperCase();
  this.inviteCode = code;
  return this.save();
};

// 更新最后消息
chatGroupSchema.methods.updateLastMessage = function(messageType, content, senderId, senderName) {
  this.lastMessageAt = new Date();
  this.lastActiveAt = new Date();
  this.lastMessage = {
    messageType,
    content: typeof content === 'string' ? content.substring(0, 100) : '',
    senderId,
    senderName
  };

  return this.save();
};

// 标记成员已读
chatGroupSchema.methods.markMemberRead = function(userId) {
  const member = this.members.find(
    m => m.userId.toString() === userId.toString()
  );

  if (member) {
    member.lastReadAt = new Date();
    return this.save();
  }

  return Promise.resolve(this);
};

// 获取成员未读消息数
chatGroupSchema.methods.getMemberUnreadCount = function(userId) {
  const member = this.members.find(
    m => m.userId.toString() === userId.toString()
  );

  if (!member) return 0;

  const ChatMessage = mongoose.model('ChatMessage');
  return ChatMessage.countDocuments({
    conversationId: `group-${this._id}`,
    sentAt: { $gt: member.lastReadAt },
    senderId: { $ne: userId }
  });
};

// 解散群组
chatGroupSchema.methods.dismiss = function() {
  this.status = GroupStatus.DELETED;
  this.dismissedAt = new Date();
  return this.save();
};

// 封禁群组
chatGroupSchema.methods.ban = function(reason, operatorId, operatorName) {
  this.status = GroupStatus.BANNED;
  this.bannedInfo = {
    reason,
    operatorId,
    operatorName,
    bannedAt: new Date()
  };

  return this.save();
};

// ==================== 静态方法 ====================

// 获取用户加入的群组列表
chatGroupSchema.statics.getUserGroups = function(userId, options = {}) {
  const {
    status = GroupStatus.ACTIVE,
    limit = 50,
    skip = 0,
    keyword
  } = options;

  const query = {
    status,
    'members.userId': userId
  };

  if (keyword) {
    query.$or = [
      { name: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } }
    ];
  }

  return this.find(query)
    .sort({ isPinned: -1, lastMessageAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('ownerId', 'name avatar')
    .populate('members.userId', 'name avatar')
    .lean();
};

// 通过邀请码获取群组
chatGroupSchema.statics.getByInviteCode = function(inviteCode) {
  return this.findOne({
    inviteCode,
    status: GroupStatus.ACTIVE
  }).lean();
};

// 搜索群组
chatGroupSchema.statics.searchGroups = function(keyword, villageId, options = {}) {
  const {
    groupType,
    limit = 20,
    skip = 0
  } = options;

  const query = {
    status: GroupStatus.ACTIVE,
    joinMethod: { $in: [JoinMethod.OPEN, JoinMethod.CODE] }
  };

  if (keyword) {
    query.$or = [
      { name: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } },
      { tags: { $in: [new RegExp(keyword, 'i')] } }
    ];
  }

  if (villageId) {
    query.villageId = villageId;
  }

  if (groupType) {
    query.groupType = groupType;
  }

  return this.find(query)
    .sort({ memberCount: -1, lastMessageAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('ownerId', 'name avatar')
    .lean();
};

// 获取热门群组
chatGroupSchema.statics.getPopularGroups = function(villageId, limit = 10) {
  const query = {
    status: GroupStatus.ACTIVE,
    memberCount: { $gte: 10 }
  };

  if (villageId) {
    query.villageId = villageId;
  }

  return this.find(query)
    .sort({ memberCount: -1, lastMessageAt: -1 })
    .limit(limit)
    .populate('ownerId', 'name avatar')
    .lean();
};

// 获取群组统计
chatGroupSchema.statics.getStatistics = function(villageId) {
  const matchQuery = {};

  if (villageId) {
    matchQuery.villageId = new mongoose.Types.ObjectId(villageId);
  }

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalMembers: { $sum: '$memberCount' }
      }
    }
  ]);
};

// 获取用户创建的群组
chatGroupSchema.statics.getUserCreatedGroups = function(userId, options = {}) {
  const {
    status = GroupStatus.ACTIVE,
    limit = 20,
    skip = 0
  } = options;

  return this.find({ ownerId: userId, status })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

const ChatGroup = mongoose.model('ChatGroup', chatGroupSchema);

module.exports = {
  ChatGroup,
  GroupType,
  MemberRole,
  JoinMethod,
  GroupStatus
};
