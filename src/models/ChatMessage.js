/**
 * 聊天消息模型
 * 管理用户之间的聊天消息
 */

const mongoose = require('mongoose');

// 消息类型枚举
const MessageType = {
  TEXT: 'text',                    // 文字消息
  IMAGE: 'image',                  // 图片消息
  VOICE: 'voice',                  // 语音消息
  VIDEO: 'video',                  // 视频消息
  FILE: 'file',                    // 文件消息
  LOCATION: 'location',            // 位置消息
  LINK: 'link',                    // 链接分享
  SYSTEM: 'system',                // 系统消息
  NOTICE: 'notice',                // 通知消息
  CALL: 'call',                    // 通话消息
  // 协作消息类型
  TASK_ASSIGNED: 'task_assigned',      // 任务分配
  TASK_UPDATED: 'task_updated',        // 任务更新
  TASK_COMPLETED: 'task_completed',    // 任务完成
  TASK_REMINDER: 'task_reminder',       // 任务提醒
  MEETING_CREATED: 'meeting_created',   // 会议创建
  MEETING_REMINDER: 'meeting_reminder', // 会议提醒
  APPROVAL_PENDING: 'approval_pending', // 待审批
  WORKSPACE_NOTIF: 'workspace_notif'    // 工作空间通知
};

// 消息状态枚举
const MessageStatus = {
  SENDING: 'sending',              // 发送中
  SENT: 'sent',                    // 已发送
  DELIVERED: 'delivered',          // 已送达
  READ: 'read',                    // 已读
  REVOKED: 'revoked',              // 已撤回
  FAILED: 'failed'                 // 发送失败
};

// 通话类型枚举
const CallType = {
  VOICE: 'voice',                  // 语音通话
  VIDEO: 'video'                   // 视频通话
};

// 通话状态枚举
const CallStatus = {
  CALLING: 'calling',              // 呼叫中
  ACCEPTED: 'accepted',            // 已接听
  REJECTED: 'rejected',            // 已拒绝
  MISSED: 'missed',                // 未接听
  ENDED: 'ended',                  // 已结束
  CANCELLED: 'cancelled'           // 已取消
};

const chatMessageSchema = new mongoose.Schema({
  // 会话ID（单聊为userId1-userId2，群聊为group-groupId）
  conversationId: {
    type: String,
    required: true,
    index: true
  },

  // 发送者ID
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 接收者ID（单聊时使用）
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // 群组ID（群聊时使用）
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatGroup'
  },

  // 消息类型
  messageType: {
    type: String,
    enum: Object.values(MessageType),
    required: true
  },

  // 消息内容（根据类型不同，结构不同）
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  // 消息状态
  status: {
    type: String,
    enum: Object.values(MessageStatus),
    default: MessageStatus.SENT
  },

  // 是否已撤回
  isRevoked: {
    type: Boolean,
    default: false
  },

  // 撤回时间
  revokedAt: {
    type: Date
  },

  // 引用消息（回复某条消息）
  quotedMessage: {
    messageId: mongoose.Schema.Types.ObjectId,
    senderId: mongoose.Schema.Types.ObjectId,
    senderName: String,
    content: String,
    messageType: String
  },

  // 是否被@（群聊）
  mentioned: {
    type: Boolean,
    default: false
  },

  // 被@的用户ID列表
  mentionedUserIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // 是否@全体成员
  mentionedAll: {
    type: Boolean,
    default: false
  },

  // 已读用户列表（群聊）
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 文件信息（文件、图片、视频、语音）
  fileInfo: {
    fileName: String,
    fileSize: Number,              // 字节
    fileType: String,              // MIME类型
    fileUrl: String,                // 文件URL
    thumbnailUrl: String,          // 缩略图URL
    duration: Number,               // 时长（秒，音视频）
    width: Number,                  // 宽度（像素）
    height: Number                  // 高度（像素）
  },

  // 位置信息
  locationInfo: {
    latitude: Number,
    longitude: Number,
    address: String,
    name: String                    // 地点名称
  },

  // 链接信息
  linkInfo: {
    title: String,
    description: String,
    url: String,
    imageUrl: String,
    domain: String
  },

  // 通话信息
  callInfo: {
    callType: {
      type: String,
      enum: Object.values(CallType)
    },
    callStatus: {
      type: String,
      enum: Object.values(CallStatus)
    },
    duration: Number,               // 通话时长（秒）
    startTime: Date,
    endTime: Date,
    rejectedReason: String
  },

  // 敏感词检测结果
  moderationResult: {
    isSensitive: {
      type: Boolean,
      default: false
    },
    sensitiveWords: [String],      // 检测到的敏感词
    filteredContent: String,        // 过滤后的内容
    confidence: Number              // 置信度 0-1
  },

  // 举报信息
  reports: [{
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reporterName: String,
    reason: String,
    reportDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'processed', 'dismissed'],
      default: 'pending'
    }
  }],

  // ==================== 协作相关字段 ====================

  // 关联的协作空间ID
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CollabWorkspace'
  },

  // 关联的任务ID
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TaskAssignment'
  },

  // 关联的会议ID
  meetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting'
  },

  // 关联的审批ID
  approvalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApprovalRequest'
  },

  // 任务分配信息
  taskAssignment: {
    title: String,
    description: String,
    priority: String,
    dueDate: Date,
    assigneeName: String,
    status: String
  },

  // 会议邀请信息
  meetingInvitation: {
    title: String,
    scheduledStart: Date,
    scheduledEnd: Date,
    location: String,
    agenda: [String]
  },

  // 审批通知信息
  approvalNotification: {
    title: String,
    approvalType: String,
    amount: Number,
    applicantName: String,
    status: String
  },

  // 快捷操作按钮
  quickActions: [{
    actionId: String,
    text: String,
    type: {
      type: String,
      enum: ['accept_task', 'decline_task', 'view_task', 'accept_meeting', 'decline_meeting', 'approve', 'reject', 'view_detail']
    },
    data: mongoose.Schema.Types.Mixed
  }],

  // 发送时间
  sentAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  // 已读时间
  readAt: {
    type: Date
  },

  // 已送达时间
  deliveredAt: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'chatMessages'
});

// 复合索引
chatMessageSchema.index({ conversationId: 1, sentAt: -1 });
chatMessageSchema.index({ senderId: 1, sentAt: -1 });
chatMessageSchema.index({ receiverId: 1, sentAt: -1 });
chatMessageSchema.index({ groupId: 1, sentAt: -1 });
chatMessageSchema.index({ sentAt: -1 });

// 全文搜索索引
chatMessageSchema.index({
  'content.text': 'text',
  'content.system': 'text'
});

// 虚拟字段 - 会话类型
chatMessageSchema.virtual('conversationType').get(function() {
  if (this.groupId) return 'group';
  if (this.receiverId) return 'private';
  return 'unknown';
});

// 实例方法 - 标记为已读
chatMessageSchema.methods.markAsRead = function(userId) {
  if (!this.readBy) this.readBy = [];

  // 检查是否已读
  const alreadyRead = this.readBy.some(r => r.userId.toString() === userId.toString());
  if (alreadyRead) return Promise.resolve(this);

  this.readBy.push({ userId, readAt: new Date() });
  this.status = MessageStatus.READ;
  this.readAt = new Date();

  return this.save();
};

// 实例方法 - 标记为已送达
chatMessageSchema.methods.markAsDelivered = function() {
  this.status = MessageStatus.DELIVERED;
  this.deliveredAt = new Date();
  return this.save();
};

// 实例方法 - 撤回消息
chatMessageSchema.methods.revoke = function() {
  const now = new Date();
  const sentTime = this.sentAt;
  const twoMinutes = 2 * 60 * 1000;

  if (now - sentTime > twoMinutes) {
    throw new Error('消息发送超过2分钟，无法撤回');
  }

  this.isRevoked = true;
  this.revokedAt = now;
  return this.save();
};

// 实例方法 - 添加举报
chatMessageSchema.methods.addReport = function(reporterId, reporterName, reason) {
  this.reports.push({
    reporterId,
    reporterName,
    reason,
    reportDate: new Date()
  });

  return this.save();
};

// 静态方法 - 获取会话消息列表
chatMessageSchema.statics.getConversationMessages = function(conversationId, options = {}) {
  const {
    limit = 50,
    skip = 0,
    beforeTime,
    afterTime
  } = options;

  const query = { conversationId };

  if (beforeTime) {
    query.sentAt = { $lt: new Date(beforeTime) };
  } else if (afterTime) {
    query.sentAt = { $gt: new Date(afterTime) };
  }

  return this.find(query)
    .sort({ sentAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('senderId', 'name avatar')
    .populate('quotedMessage.senderId', 'name avatar')
    .lean();
};

// 静态方法 - 获取未读消息数
chatMessageSchema.statics.getUnreadCount = function(userId, conversationId) {
  return this.countDocuments({
    conversationId,
    senderId: { $ne: userId },
    status: { $ne: MessageStatus.READ },
    isRevoked: false
  });
};

// 静态方法 - 获取所有未读消息数
chatMessageSchema.statics.getTotalUnreadCount = function(userId) {
  return this.aggregate([
    {
      $match: {
        $or: [
          { receiverId: new mongoose.Types.ObjectId(userId) },
          { groupId: { $in: [] } }
        ],
        senderId: { $ne: new mongoose.Types.ObjectId(userId) },
        status: { $ne: MessageStatus.READ },
        isRevoked: false
      }
    },
    {
      $group: {
        _id: '$conversationId',
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$count' }
      }
    }
  ]);
};

// 静态方法 - 搜索消息
chatMessageSchema.statics.searchMessages = function(userId, keyword, options = {}) {
  const {
    conversationId,
    messageType,
    limit = 20,
    skip = 0
  } = options;

  const query = {
    $or: [
      { senderId: new mongoose.Types.ObjectId(userId) },
      { receiverId: new mongoose.Types.ObjectId(userId) }
    ],
    isRevoked: false
  };

  if (conversationId) query.conversationId = conversationId;
  if (messageType) query.messageType = messageType;

  if (keyword) {
    query.$and = [
      {
        $or: [
          { 'content.text': { $regex: keyword, $options: 'i' } },
          { 'content.system': { $regex: keyword, $options: 'i' } }
        ]
      }
    ];
  }

  return this.find(query)
    .sort({ sentAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('senderId', 'name avatar')
    .lean();
};

// 静态方法 - 获取最近的消息
chatMessageSchema.statics.getRecentMessages = function(userId, conversationIds, limit = 5) {
  return this.aggregate([
    {
      $match: {
        conversationId: { $in: conversationIds },
        isRevoked: false
      }
    },
    {
      $sort: { sentAt: -1 }
    },
    {
      $group: {
        _id: '$conversationId',
        message: { $first: '$$ROOT' }
      }
    },
    {
      $sort: { 'message.sentAt': -1 }
    },
    {
      $limit: limit
    }
  ]);
};

// 中间件 - 保存前进行敏感词检测
chatMessageSchema.pre('save', async function(next) {
  if (this.messageType === MessageType.TEXT && this.content && this.content.text) {
    // 这里可以调用敏感词检测服务
    // const moderationResult = await moderationService.check(this.content.text);
    // if (moderationResult.isSensitive) {
    //   this.moderationResult = moderationResult;
    // }
  }
  next();
});

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = {
  ChatMessage,
  MessageType,
  MessageStatus,
  CallType,
  CallStatus
};
