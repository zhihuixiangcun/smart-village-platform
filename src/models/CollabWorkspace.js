/**
 * 村干部协作空间模型
 * 村干部内部协作的工作空间，隔离于普通村民聊天
 */

const mongoose = require('mongoose');

// 协作空间类型
const WorkspaceType = {
  GENERAL: 'general',       // 通用办公
  DEPARTMENT: 'department', // 部门专用
  PROJECT: 'project',       // 项目协作
  EMERGENCY: 'emergency'    // 应急指挥
};

// 成员角色
const MemberRole = {
  SECRETARY: 'secretary',   // 村支书
  ADMIN: 'admin',          // 管理员
  MEMBER: 'member'         // 普通成员
};

// 协作空间状态
const WorkspaceStatus = {
  ACTIVE: 'active',         // 活跃
  ARCHIVED: 'archived',     // 已归档
  SUSPENDED: 'suspended'    // 已暂停
};

const collabWorkspaceSchema = new mongoose.Schema({
  // 协作空间名称
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },

  // 协作空间描述
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },

  // 关联的村庄
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 协作空间类型
  workspaceType: {
    type: String,
    enum: Object.values(WorkspaceType),
    default: WorkspaceType.GENERAL
  },

  // 关联的聊天群组
  chatGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatGroup'
  },

  // 成员管理
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    committeeMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommitteeMember'
    },
    role: {
      type: String,
      enum: Object.values(MemberRole),
      default: MemberRole.MEMBER
    },
    // 权限列表（继承自 CommitteeMember.roles）
    permissions: [{
      type: String
    }],
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastActiveAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 成员数量缓存
  memberCount: {
    type: Number,
    default: 1,
    index: true
  },

  // 工作配置
  settings: {
    // 功能开关
    enableTaskAssignment: {
      type: Boolean,
      default: true
    },
    enableMeeting: {
      type: Boolean,
      default: true
    },
    enableApproval: {
      type: Boolean,
      default: true
    },
    enableWorkLog: {
      type: Boolean,
      default: true
    },
    // 自动归档天数
    autoArchiveDays: {
      type: Number,
      default: 90,
      min: 30,
      max: 365
    }
  },

  // 统计信息
  stats: {
    activeTasks: {
      type: Number,
      default: 0
    },
    pendingApprovals: {
      type: Number,
      default: 0
    },
    upcomingMeetings: {
      type: Number,
      default: 0
    },
    weeklyMessages: {
      type: Number,
      default: 0
    },
    lastStatsUpdate: {
      type: Date,
      default: Date.now
    }
  },

  // 协作空间状态
  status: {
    type: String,
    enum: Object.values(WorkspaceStatus),
    default: WorkspaceStatus.ACTIVE,
    index: true
  },

  // 归档时间
  archivedAt: {
    type: Date
  },

  // 创建者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // 标签
  tags: [{
    type: String,
    maxlength: 20
  }],

  // 封面图
  avatar: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  collection: 'collabWorkspaces'
});

// 复合索引
collabWorkspaceSchema.index({ villageId: 1, status: 1 });
collabWorkspaceSchema.index({ 'members.userId': 1, status: 1 });
collabWorkspaceSchema.index({ createdAt: -1 });

// 文本搜索索引
collabWorkspaceSchema.index({ name: 'text', description: 'text' });

// ==================== 实例方法 ====================

// 添加成员
collabWorkspaceSchema.methods.addMember = function(userId, committeeMemberId, role = MemberRole.MEMBER, permissions = []) {
  // 检查是否已是成员
  const existingMember = this.members.find(
    m => m.userId.toString() === userId.toString()
  );

  if (existingMember) {
    throw new Error('用户已是协作空间成员');
  }

  this.members.push({
    userId,
    committeeMemberId,
    role,
    permissions,
    joinedAt: new Date(),
    lastActiveAt: new Date()
  });

  this.memberCount = this.members.length;

  return this.save();
};

// 移除成员
collabWorkspaceSchema.methods.removeMember = function(userId) {
  const memberIndex = this.members.findIndex(
    m => m.userId.toString() === userId.toString()
  );

  if (memberIndex === -1) {
    throw new Error('用户不是协作空间成员');
  }

  // 不能移除创建者
  if (this.members[memberIndex].userId.toString() === this.createdBy.toString()) {
    throw new Error('不能移除协作空间创建者');
  }

  this.members.splice(memberIndex, 1);
  this.memberCount = this.members.length;

  return this.save();
};

// 更新成员角色
collabWorkspaceSchema.methods.updateMemberRole = function(userId, role, permissions) {
  const member = this.members.find(
    m => m.userId.toString() === userId.toString()
  );

  if (!member) {
    throw new Error('用户不是协作空间成员');
  }

  member.role = role;
  if (permissions && permissions.length > 0) {
    member.permissions = permissions;
  }

  return this.save();
};

// 更新成员活跃时间
collabWorkspaceSchema.methods.updateMemberActivity = function(userId) {
  const member = this.members.find(
    m => m.userId.toString() === userId.toString()
  );

  if (member) {
    member.lastActiveAt = new Date();
    return this.save();
  }

  return Promise.resolve(this);
};

// 检查成员权限
collabWorkspaceSchema.methods.checkPermission = function(userId, permission) {
  const member = this.members.find(
    m => m.userId.toString() === userId.toString()
  );

  if (!member) {
    return false;
  }

  // 检查是否有特定权限或全部权限
  return member.permissions.includes(permission) ||
         member.permissions.includes('all') ||
         member.role === MemberRole.SECRETARY;
};

// 归档协作空间
collabWorkspaceSchema.methods.archive = function() {
  this.status = WorkspaceStatus.ARCHIVED;
  this.archivedAt = new Date();
  return this.save();
};

// 更新统计信息
collabWorkspaceSchema.methods.updateStats = async function() {
  const TaskAssignment = mongoose.model('TaskAssignment');
  const Meeting = mongoose.model('Meeting');
  const ChatMessage = mongoose.model('ChatMessage');

  // 统计活跃任务
  this.stats.activeTasks = await TaskAssignment.countDocuments({
    workspaceId: this._id,
    status: { $in: ['assigned', 'in_progress'] }
  });

  // 统计待审批
  this.stats.pendingApprovals = await TaskAssignment.countDocuments({
    workspaceId: this._id,
    status: 'review'
  });

  // 统计即将到来的会议（7天内）
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

  this.stats.upcomingMeetings = await Meeting.countDocuments({
    workspaceId: this._id,
    status: 'scheduled',
    scheduledStart: { $gte: new Date(), $lte: sevenDaysLater }
  });

  // 统计本周消息数
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  this.stats.weeklyMessages = await ChatMessage.countDocuments({
    conversationId: `group-${this.chatGroupId}`,
    sentAt: { $gte: oneWeekAgo }
  });

  this.stats.lastStatsUpdate = new Date();

  await this.save();

  return this.stats;
};

// ==================== 静态方法 ====================

// 获取用户的协作空间列表
collabWorkspaceSchema.statics.getUserWorkspaces = function(userId, options = {}) {
  const {
    status = WorkspaceStatus.ACTIVE,
    limit = 20,
    skip = 0,
    keyword
  } = options;

  const query = {
    'members.userId': userId,
    status
  };

  if (keyword) {
    query.$or = [
      { name: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } }
    ];
  }

  return this.find(query)
    .populate('createdBy', 'name avatar')
    .populate('chatGroupId', 'name memberCount')
    .populate('members.userId', 'name avatar')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// 获取村庄的协作空间列表
collabWorkspaceSchema.statics.getVillageWorkspaces = function(villageId, options = {}) {
  const {
    status = WorkspaceStatus.ACTIVE,
    workspaceType,
    limit = 20,
    skip = 0
  } = options;

  const query = { villageId, status };

  if (workspaceType) {
    query.workspaceType = workspaceType;
  }

  return this.find(query)
    .populate('createdBy', 'name avatar')
    .populate('chatGroupId')
    .sort({ memberCount: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// 根据聊天群组获取协作空间
collabWorkspaceSchema.statics.getByChatGroup = function(chatGroupId) {
  return this.findOne({ chatGroupId })
    .populate('members.userId', 'name avatar')
    .populate('members.committeeMemberId', 'position current')
    .lean();
};

// 检查用户是否是成员
collabWorkspaceSchema.statics.isMember = function(workspaceId, userId) {
  return this.findOne({
    _id: workspaceId,
    'members.userId': userId,
    status: WorkspaceStatus.ACTIVE
  }).lean();
};

// 获取统计信息
collabWorkspaceSchema.statics.getStatistics = function(villageId) {
  return this.aggregate([
    {
      $match: { villageId: new mongoose.Types.ObjectId(villageId) }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalMembers: { $sum: '$memberCount' }
      }
    }
  ]);
};

const CollabWorkspace = mongoose.model('CollabWorkspace', collabWorkspaceSchema);

module.exports = {
  CollabWorkspace,
  WorkspaceType,
  MemberRole,
  WorkspaceStatus
};
