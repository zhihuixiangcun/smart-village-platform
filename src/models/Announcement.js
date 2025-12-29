/**
 * 公告模型 - 村务公告互动功能
 * 支持发布、评论、@提醒、点赞等互动功能
 */

const mongoose = require('mongoose');

// 公告类型
const AnnouncementTypes = {
  NOTICE: 'notice',        // 通知公告
  POLICY: 'policy',        // 政策宣传
  ACTIVITY: 'activity',    // 活动通知
  MEETING: 'meeting',      // 会议通知
  EMERGENCY: 'emergency',  // 紧急通知
  OTHER: 'other'          // 其他
};

// 公告状态
const AnnouncementStatus = {
  DRAFT: 'draft',         // 草稿
  PUBLISHED: 'published',   // 已发布
  EXPIRED: 'expired',       // 已过期
  CANCELLED: 'cancelled',   // 已取消
  ARCHIVED: 'archived'      // 已归档
};

// 互动类型
const InteractionType = {
  LIKE: 'like',
  COMMENT: 'comment',
  SHARE: 'share',
  BOOKMARK: 'bookmark',
  MENTION: 'mention'
};

const AnnouncementSchema = new mongoose.Schema({
  // 基础信息
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    maxlength: 500
  },
  richContent: {
    // 富文本内容，支持图片、视频等
    type: mongoose.Schema.Types.Mixed
  },

  // 分类信息
  type: {
    type: String,
    enum: Object.values(AnnouncementTypes),
    required: true,
    index: true
  },
  category: String,
  tags: [String],

  // 状态
  status: {
    type: String,
    enum: Object.values(AnnouncementStatus),
    default: 'draft',
    index: true
  },

  // 优先级
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // 村庄关联
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 发布信息
  publishedAt: Date,
  expiresAt: Date,
  pinned: {
    type: Boolean,
    default: false
  },
  pinnedUntil: Date,

  // 目标受众
  targetAudience: [{
    type: String,
    enum: ['all', 'residents', 'village_committee', 'party_members', 'elderly', 'children', 'women', 'low_income', 'disabled']
  }],
  targetVillages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village'
  }],

  // 附件
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    url: String,
    type: String,
    size: Number,
    description: String
  }],

  // 图片列表（用于展示）
  images: [{
    url: String,
    thumbnail: String,
    caption: String,
    width: Number,
    height: Number
  }],

  // 视频列表
  videos: [{
    url: String,
    thumbnail: String,
    duration: Number,
    caption: String
  }],

  // ==================== 互动功能 ====================

  // 阅读统计
  readCount: {
    type: Number,
    default: 0
  },
  readers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    },
    readDuration: Number  // 阅读时长（秒）
  }],

  // 点赞
  likeCount: {
    type: Number,
    default: 0
  },
  likes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    },
    cancelled: {
      type: Boolean,
      default: false
    }
  }],

  // 评论（支持嵌套回复）
  commentCount: {
    type: Number,
    default: 0
  },
  comments: [{
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      auto: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: String,
    userAvatar: String,
    content: {
      type: String,
      required: true,
      maxlength: 1000
    },
    richContent: mongoose.Schema.Types.Mixed,
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'comments'
    },
    replyToUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    replyToUserName: String,

    // @提醒的用户
    mentionedUsers: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      userName: String,
      notified: {
        type: Boolean,
        default: false
      }
    }],

    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    likeCount: {
      type: Number,
      default: 0
    },

    // 子回复
    replies: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'comments'
    }],

    // 状态
    deleted: {
      type: Boolean,
      default: false
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    // 管理操作
    pinned: {
      type: Boolean,
      default: false
    },
    highlighted: {
      type: Boolean,
      default: false
    },

    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 分享
  shareCount: {
    type: Number,
    default: 0
  },
  shares: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    platform: String,  // wechat, moments, etc.
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 收藏
  bookmarkCount: {
    type: Number,
    default: 0
  },
  bookmarks: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    bookmarkedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // @提醒记录
  mentions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    mentionedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    mentionedIn: {
      type: String,
      enum: ['announcement', 'comment']
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'comments'
    },
    notified: {
      type: Boolean,
      default: false
    },
    mentionedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 互动统计
  interactionStats: {
    totalInteractions: {
      type: Number,
      default: 0
    },
    uniqueInteractUsers: {
      type: Number,
      default: 0
    },
    topInteractions: [{
      type: {
        type: String,
        enum: Object.values(InteractionType)
      },
      count: Number
    }]
  },

  // 通知发送记录
  notificationSent: {
    type: Boolean,
    default: false
  },
  notificationSentAt: Date,
  notificationChannels: [{
    type: String,
    enum: ['app', 'sms', 'wechat', 'email']
  }],

  // ==================== 创建和更新信息 ====================

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  creatorName: String,
  creatorAvatar: String,
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updaterName: String,

  // 发布者信息（可能与创建者不同）
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  publisherName: String,

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },

  // 软删除
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'announcements'
});

// ==================== 索引定义 ====================

AnnouncementSchema.index({ villageId: 1, status: 1, publishedAt: -1 });
AnnouncementSchema.index({ status: 1, publishedAt: -1 });
AnnouncementSchema.index({ type: 1, status: 1 });
AnnouncementSchema.index({ priority: -1, publishedAt: -1 });
AnnouncementSchema.index({ expiresAt: 1 });
AnnouncementSchema.index({ pinned: -1, publishedAt: -1 });
AnnouncementSchema.index({ 'comments.userId': 1 });
AnnouncementSchema.index({ 'mentions.userId': 1 });

// 全文搜索索引
AnnouncementSchema.index({
  title: 'text',
  content: 'text',
  summary: 'text',
  tags: 'text'
});

// ==================== 实例方法 ====================

/**
 * 发布公告
 */
AnnouncementSchema.methods.publish = function(publisherId) {
  if (this.status !== 'draft') {
    throw new Error('只有草稿状态的公告才能发布');
  }

  this.status = 'published';
  this.publishedAt = new Date();
  this.publishedBy = publisherId;
  this.notificationSent = false;

  return this.save();
};

/**
 * 标记为已过期
 */
AnnouncementSchema.methods.markAsExpired = function() {
  this.status = 'expired';
  return this.save();
};

/**
 * 记录阅读
 */
AnnouncementSchema.methods.recordRead = function(userId, readDuration = 0) {
  const existingReader = this.readers.find(
    r => r.userId.toString() === userId.toString()
  );

  if (!existingReader) {
    this.readers.push({ userId, readAt: new Date(), readDuration });
    this.readCount += 1;
  }

  return this.save();
};

/**
 * 点赞/取消点赞
 */
AnnouncementSchema.methods.toggleLike = function(userId) {
  const existingLike = this.likes.findIndex(
    l => l.userId.toString() === userId.toString() && !l.cancelled
  );

  if (existingLike >= 0) {
    // 取消点赞
    this.likes[existingLike].cancelled = true;
    this.likeCount = Math.max(0, this.likeCount - 1);
  } else {
    // 点赞
    this.likes.push({ userId, likedAt: new Date(), cancelled: false });
    this.likeCount += 1;
  }

  this._updateInteractionStats();
  return this.save();
};

/**
 * 添加评论
 */
AnnouncementSchema.methods.addComment = function(commentData) {
  const comment = {
    userId: commentData.userId,
    userName: commentData.userName,
    userAvatar: commentData.userAvatar,
    content: commentData.content,
    richContent: commentData.richContent,
    parentCommentId: commentData.parentCommentId,
    replyToUserId: commentData.replyToUserId,
    replyToUserName: commentData.replyToUserName,
    mentionedUsers: commentData.mentionedUsers || [],
    createdAt: new Date()
  };

  this.comments.push(comment);
  this.commentCount += 1;

  // 如果是回复评论，更新父评论的replies
  if (commentData.parentCommentId) {
    const parentComment = this.comments.id(commentData.parentCommentId);
    if (parentComment) {
      parentComment.replies.push(this.comments[this.comments.length - 1]._id);
    }
  }

  this._updateInteractionStats();
  return this.save();
};

/**
 * 删除评论
 */
AnnouncementSchema.methods.deleteComment = function(commentId, userId, isAdmin = false) {
  const comment = this.comments.id(commentId);

  if (!comment) {
    throw new Error('评论不存在');
  }

  // 只有评论作者或管理员可以删除
  if (!isAdmin && comment.userId.toString() !== userId.toString()) {
    throw new Error('无权删除此评论');
  }

  comment.deleted = true;
  comment.deletedAt = new Date();
  comment.deletedBy = userId;
  this.commentCount = Math.max(0, this.commentCount - 1);

  return this.save();
};

/**
 * 点赞评论
 */
AnnouncementSchema.methods.toggleCommentLike = function(commentId, userId) {
  const comment = this.comments.id(commentId);

  if (!comment) {
    throw new Error('评论不存在');
  }

  const existingLikeIndex = comment.likes.findIndex(
    id => id.toString() === userId.toString()
  );

  if (existingLikeIndex >= 0) {
    comment.likes.splice(existingLikeIndex, 1);
    comment.likeCount = Math.max(0, comment.likeCount - 1);
  } else {
    comment.likes.push(userId);
    comment.likeCount += 1;
  }

  return this.save();
};

/**
 * 收藏/取消收藏
 */
AnnouncementSchema.methods.toggleBookmark = function(userId) {
  const existingIndex = this.bookmarks.findIndex(
    b => b.userId.toString() === userId.toString()
  );

  if (existingIndex >= 0) {
    this.bookmarks.splice(existingIndex, 1);
    this.bookmarkCount = Math.max(0, this.bookmarkCount - 1);
  } else {
    this.bookmarks.push({ userId, bookmarkedAt: new Date() });
    this.bookmarkCount += 1;
  }

  this._updateInteractionStats();
  return this.save();
};

/**
 * 添加分享记录
 */
AnnouncementSchema.methods.addShare = function(userId, platform) {
  this.shares.push({ userId, platform, sharedAt: new Date() });
  this.shareCount += 1;
  this._updateInteractionStats();
  return this.save();
};

/**
 * 添加@提醒
 */
AnnouncementSchema.methods.addMention = function(mentionData) {
  this.mentions.push({
    userId: mentionData.userId,
    userName: mentionData.userName,
    mentionedBy: mentionData.mentionedBy,
    mentionedIn: mentionData.mentionedIn || 'announcement',
    commentId: mentionData.commentId,
    mentionedAt: new Date()
  });

  return this.save();
};

/**
 * 标记提醒已通知
 */
AnnouncementSchema.methods.markMentionNotified = function(mentionId) {
  const mention = this.mentions.id(mentionId);
  if (mention) {
    mention.notified = true;
  }
  return this.save();
};

/**
 * 更新互动统计
 */
AnnouncementSchema.methods._updateInteractionStats = function() {
  const totalInteractions = this.likeCount + this.commentCount + this.shareCount + this.bookmarkCount;

  const uniqueUsers = new Set([
    ...this.likes.filter(l => !l.cancelled).map(l => l.userId.toString()),
    ...this.comments.filter(c => !c.deleted).map(c => c.userId.toString()),
    ...this.shares.map(s => s.userId.toString()),
    ...this.bookmarks.map(b => b.userId.toString())
  ]);

  this.interactionStats = {
    totalInteractions,
    uniqueInteractUsers: uniqueUsers.size,
    topInteractions: [
      { type: InteractionType.LIKE, count: this.likeCount },
      { type: InteractionType.COMMENT, count: this.commentCount },
      { type: InteractionType.SHARE, count: this.shareCount },
      { type: InteractionType.BOOKMARK, count: this.bookmarkCount }
    ].sort((a, b) => b.count - a.count)
  };
};

// ==================== 静态方法 ====================

/**
 * 获取村庄的已发布公告
 */
AnnouncementSchema.statics.getPublishedByVillage = function(villageId, options = {}) {
  const {
    limit = 20,
    skip = 0,
    type,
    priority,
    pinnedOnly = false
  } = options;

  const query = {
    villageId,
    status: 'published',
    deleted: false
  };

  if (type) query.type = type;
  if (priority) query.priority = priority;
  if (pinnedOnly) {
    query.pinned = true;
    query.$or = [
      { pinnedUntil: { $gte: new Date() } },
      { pinnedUntil: null }
    ];
  } else {
    // 检查过期
    query.$or = [
      { expiresAt: { $gte: new Date() } },
      { expiresAt: null }
    ];
  }

  return this.find(query)
    .sort({ pinned: -1, priority: -1, publishedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('createdBy', 'name avatar')
    .lean();
};

/**
 * 获取热门公告
 */
AnnouncementSchema.statics.getPopularByVillage = function(villageId, limit = 10) {
  return this.aggregate([
    {
      $match: {
        villageId: new mongoose.Types.ObjectId(villageId),
        status: 'published',
        deleted: false
      }
    },
    {
      $addFields: {
        popularityScore: {
          $add: [
            { $multiply: ['$likeCount', 3] },
            { $multiply: ['$commentCount', 2] },
            '$shareCount',
            '$readCount'
          ]
        }
      }
    },
    {
      $sort: { popularityScore: -1, publishedAt: -1 }
    },
    {
      $limit: limit
    },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'creator'
      }
    },
    {
      $addFields: {
        createdBy: { $arrayElemAt: ['$creator', 0] }
      }
    }
  ]);
};

/**
 * 获取用户互动的公告
 */
AnnouncementSchema.statics.getUserInteracted = function(userId, options = {}) {
  const { limit = 20, skip = 0 } = options;

  return this.aggregate([
    {
      $match: {
        deleted: false,
        status: 'published'
      }
    },
    {
      $addFields: {
        hasLiked: {
          $in: [new mongoose.Types.ObjectId(userId), '$likes.userId']
        },
        hasCommented: {
          $in: [new mongoose.Types.ObjectId(userId), '$comments.userId']
        },
        hasBookmarked: {
          $in: [new mongoose.Types.ObjectId(userId), '$bookmarks.userId']
        }
      }
    },
    {
      $match: {
        $or: [
          { hasLiked: true },
          { hasCommented: true },
          { hasBookmarked: true }
        ]
      }
    },
    {
      $sort: { updatedAt: -1 }
    },
    {
      $skip: skip
    },
    {
      $limit: limit
    }
  ]);
};

/**
 * 获取@用户的所有公告
 */
AnnouncementSchema.statics.getMentionsByUser = function(userId, options = {}) {
  const { limit = 20, skip = 0, unreadOnly = false } = options;

  const query = {
    'mentions.userId': new mongoose.Types.ObjectId(userId)
  };

  if (unreadOnly) {
    query['mentions.notified'] = false;
  }

  return this.find(query)
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('createdBy', 'name avatar')
    .lean();
};

/**
 * 搜索公告
 */
AnnouncementSchema.statics.searchAnnouncements = function(villageId, keyword, options = {}) {
  const {
    limit = 20,
    skip = 0,
    type,
    tags
  } = options;

  const query = {
    villageId,
    status: 'published',
    deleted: false,
    $text: { $search: keyword }
  };

  if (type) query.type = type;
  if (tags && tags.length > 0) query.tags = { $in: tags };

  return this.find(query)
    .sort({ score: { $meta: 'textScore' }, publishedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('createdBy', 'name avatar')
    .lean();
};

/**
 * 获取统计信息
 */
AnnouncementSchema.statics.getVillageStats = function(villageId) {
  const now = new Date();
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const weekStart = new Date(now.setDate(now.getDate() - 7));

  return this.aggregate([
    {
      $match: {
        villageId: new mongoose.Types.ObjectId(villageId),
        deleted: false
      }
    },
    {
      $facet: {
        total: [
          { $count: 'count' }
        ],
        byStatus: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ],
        byType: [
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 }
            }
          }
        ],
        todayPublished: [
          {
            $match: {
              publishedAt: { $gte: todayStart }
            }
          },
          { $count: 'count' }
        ],
        weekPublished: [
          {
            $match: {
              publishedAt: { $gte: weekStart }
            }
          },
          { $count: 'count' }
        ],
        totalInteractions: [
          {
            $group: {
              _id: null,
              totalLikes: { $sum: '$likeCount' },
              totalComments: { $sum: '$commentCount' },
              totalShares: { $sum: '$shareCount' },
              totalReads: { $sum: '$readCount' }
            }
          }
        ]
      }
    }
  ]);
};

// ==================== 中间件 ====================

// 保存前更新时间
AnnouncementSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 自动标记过期公告
AnnouncementSchema.pre('find', function(next) {
  // 自动将过期的公告标记为expired
  this.where('expiresAt').lt(new Date());
  next();
});

module.exports = mongoose.model('Announcement', AnnouncementSchema);
module.exports.AnnouncementTypes = AnnouncementTypes;
module.exports.AnnouncementStatus = AnnouncementStatus;
module.exports.InteractionType = InteractionType;
