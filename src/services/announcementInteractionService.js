/**
 * 村务公告互动服务
 * 处理公告的发布、评论、@提醒、点赞等互动功能
 */

const { Announcement, AnnouncementTypes, AnnouncementStatus } = require('../models/Announcement');
const { User } = require('../models/User');
const webSocketService = require('./webSocketService');

// ==================== 公告发布与管理 ====================

/**
 * 创建公告
 */
exports.createAnnouncement = async (announcementData, creatorId) => {
  const {
    villageId,
    title,
    content,
    summary,
    richContent,
    type,
    category,
    tags,
    priority,
    targetAudience,
    targetVillages,
    attachments,
    images,
    videos,
    expiresAt,
    pinned,
    pinnedUntil,
    mentionedUsers
  } = announcementData;

  // 验证村庄
  const { Village } = require('../models/Village');
  const village = await Village.findById(villageId);
  if (!village) {
    throw new Error('村庄不存在');
  }

  // 获取创建者信息
  const creator = await User.findById(creatorId);
  if (!creator) {
    throw new Error('用户不存在');
  }

  // 解析@用户
  const mentions = [];
  if (mentionedUsers && mentionedUsers.length > 0) {
    for (const mentionedUser of mentionedUsers) {
      const user = await User.findById(mentionedUser.userId);
      if (user) {
        mentions.push({
          userId: user._id,
          userName: user.name,
          mentionedBy: creatorId,
          mentionedIn: 'announcement',
          notified: false
        });
      }
    }
  }

  const announcement = new Announcement({
    villageId,
    title,
    content,
    summary,
    richContent,
    type,
    category,
    tags,
    priority,
    targetAudience,
    targetVillages,
    attachments,
    images,
    videos,
    expiresAt,
    pinned,
    pinnedUntil,
    createdBy: creatorId,
    creatorName: creator.name,
    creatorAvatar: creator.avatar,
    mentions
  });

  await announcement.save();

  return announcement.populate('createdBy mentions.userId');
};

/**
 * 发布公告
 */
exports.publishAnnouncement = async (announcementId, publisherId) => {
  const announcement = await Announcement.findById(announcementId);

  if (!announcement) {
    throw new Error('公告不存在');
  }

  await announcement.publish(publisherId);

  // 发送通知给目标受众
  await this._notifyAnnouncementPublished(announcement);

  // 发送@提醒通知
  for (const mention of announcement.mentions) {
    await this._notifyMentionedUser(announcement, mention);
  }

  return announcement.populate('createdBy mentions.userId');
};

/**
 * 更新公告
 */
exports.updateAnnouncement = async (announcementId, updates, userId) => {
  const announcement = await Announcement.findById(announcementId);

  if (!announcement) {
    throw new Error('公告不存在');
  }

  // 只有创建者可以更新
  if (announcement.createdBy.toString() !== userId.toString()) {
    throw new Error('无权修改此公告');
  }

  // 已发布的公告不能修改内容
  if (announcement.status === 'published') {
    throw new Error('已发布的公告不能修改');
  }

  Object.keys(updates).forEach(key => {
    if (key !== 'createdBy' && key !== 'createdAt') {
      announcement[key] = updates[key];
    }
  });

  announcement.updatedBy = userId;
  await announcement.save();

  return announcement.populate('createdBy');
};

/**
 * 删除公告（软删除）
 */
exports.deleteAnnouncement = async (announcementId, userId) => {
  const announcement = await Announcement.findById(announcementId);

  if (!announcement) {
    throw new Error('公告不存在');
  }

  // 只有创建者可以删除
  if (announcement.createdBy.toString() !== userId.toString()) {
    throw new Error('无权删除此公告');
  }

  announcement.deleted = true;
  announcement.deletedAt = new Date();
  announcement.deletedBy = userId;
  await announcement.save();

  return { success: true, message: '公告已删除' };
};

// ==================== 评论功能 ====================

/**
 * 添加评论
 */
exports.addComment = async (announcementId, commentData, userId) => {
  const announcement = await Announcement.findById(announcementId);

  if (!announcement) {
    throw new Error('公告不存在');
  }

  if (announcement.status !== 'published') {
    throw new Error('只能评论已发布的公告');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  // 解析@用户
  const mentionedUsers = [];
  const mentionRegex = /@(\w+)/g;
  const mentions = commentData.content.match(mentionRegex);

  if (mentions) {
    const uniqueUsernames = [...new Set(mentions.map(m => m.substring(1)))];
    for (const username of uniqueUsernames) {
      const mentionedUser = await User.findOne({ name: username });
      if (mentionedUser) {
        mentionedUsers.push({
          userId: mentionedUser._id,
          userName: mentionedUser.name,
          notified: false
        });

        // 添加到公告的mentions记录
        await announcement.addMention({
          userId: mentionedUser._id,
          userName: mentionedUser.name,
          mentionedBy: userId,
          mentionedIn: 'comment',
          commentId: null // 会在保存后更新
        });
      }
    }
  }

  const newComment = {
    userId,
    userName: user.name,
    userAvatar: user.avatar,
    content: commentData.content,
    richContent: commentData.richContent,
    parentCommentId: commentData.parentCommentId,
    replyToUserId: commentData.replyToUserId,
    replyToUserName: commentData.replyToUserName,
    mentionedUsers
  };

  await announcement.addComment(newComment);

  // 获取新添加的评论（最新的一个）
  const addedComment = announcement.comments[announcement.comments.length - 1];

  // 更新mentions中的commentId
  if (mentionedUsers.length > 0) {
    for (const mention of announcement.mentions) {
      if (!mention.commentId && mention.mentionedIn === 'comment') {
        mention.commentId = addedComment._id;
      }
    }
    await announcement.save();
  }

  // 发送通知
  await this._notifyNewComment(announcement, addedComment);

  return announcement.comments[announcement.comments.length - 1];
};

/**
 * 删除评论
 */
exports.deleteComment = async (announcementId, commentId, userId, isAdmin = false) => {
  const announcement = await Announcement.findById(announcementId);

  if (!announcement) {
    throw new Error('公告不存在');
  }

  await announcement.deleteComment(commentId, userId, isAdmin);

  return { success: true, message: '评论已删除' };
};

/**
 * 点赞评论
 */
exports.toggleCommentLike = async (announcementId, commentId, userId) => {
  const announcement = await Announcement.findById(announcementId);

  if (!announcement) {
    throw new Error('公告不存在');
  }

  await announcement.toggleCommentLike(commentId, userId);

  const comment = announcement.comments.id(commentId);
  return {
    liked: comment.likes.includes(userId),
    likeCount: comment.likeCount
  };
};

/**
 * 获取评论列表
 */
exports.getComments = async (announcementId, options = {}) => {
  const { limit = 50, skip = 0, parentOnly = true } = options;

  const announcement = await Announcement.findById(announcementId)
    .populate('comments.userId', 'name avatar')
    .populate('comments.replyToUserId', 'name avatar')
    .populate('comments.mentionedUsers.userId', 'name avatar')
    .lean();

  if (!announcement) {
    throw new Error('公告不存在');
  }

  let comments = announcement.comments.filter(c => !c.deleted);

  if (parentOnly) {
    comments = comments.filter(c => !c.parentCommentId);
  }

  // 按创建时间倒序
  comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    total: comments.length,
    comments: comments.slice(skip, skip + limit)
  };
};

/**
 * 获取评论的回复
 */
exports.getCommentReplies = async (announcementId, parentCommentId) => {
  const announcement = await Announcement.findById(announcementId)
    .populate('comments.userId', 'name avatar')
    .populate('comments.replyToUserId', 'name avatar')
    .lean();

  if (!announcement) {
    throw new Error('公告不存在');
  }

  const parentComment = announcement.comments.find(c => c._id.toString() === parentCommentId.toString());
  if (!parentComment) {
    throw new Error('父评论不存在');
  }

  const replies = announcement.comments.filter(c =>
    c.parentCommentId && c.parentCommentId.toString() === parentCommentId.toString() && !c.deleted
  );

  return replies;
};

// ==================== 点赞功能 ====================

/**
 * 点赞/取消点赞公告
 */
exports.toggleLike = async (announcementId, userId) => {
  const announcement = await Announcement.findById(announcementId);

  if (!announcement) {
    throw new Error('公告不存在');
  }

  await announcement.toggleLike(userId);

  const liked = announcement.likes.some(
    l => l.userId.toString() === userId.toString() && !l.cancelled
  );

  // 如果是首次点赞，发送通知
  if (liked && announcement.createdBy.toString() !== userId.toString()) {
    await this._notifyLike(announcement, userId);
  }

  return { liked, likeCount: announcement.likeCount };
};

/**
 * 获取点赞用户列表
 */
exports.getLikes = async (announcementId, options = {}) => {
  const { limit = 20, skip = 0 } = options;

  const announcement = await Announcement.findById(announcementId)
    .populate({
      path: 'likes.userId',
      select: 'name avatar',
      options: { limit, skip }
    })
    .lean();

  if (!announcement) {
    throw new Error('公告不存在');
  }

  const activeLikes = announcement.likes.filter(l => !l.cancelled);

  return {
    total: activeLikes.length,
    users: activeLikes.slice(skip, skip + limit).map(l => l.userId)
  };
};

// ==================== 收藏功能 ====================

/**
 * 收藏/取消收藏公告
 */
exports.toggleBookmark = async (announcementId, userId) => {
  const announcement = await Announcement.findById(announcementId);

  if (!announcement) {
    throw new Error('公告不存在');
  }

  await announcement.toggleBookmark(userId);

  const bookmarked = announcement.bookmarks.some(
    b => b.userId.toString() === userId.toString()
  );

  return { bookmarked, bookmarkCount: announcement.bookmarkCount };
};

/**
 * 获取用户收藏的公告
 */
exports.getUserBookmarks = async (userId, options = {}) => {
  const { limit = 20, skip = 0 } = options;

  const announcements = await Announcement.find({
    'bookmarks.userId': userId,
    deleted: false,
    status: 'published'
  })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('createdBy', 'name avatar')
    .lean();

  return announcements;
};

// ==================== 分享功能 ====================

/**
 * 记录分享
 */
exports.recordShare = async (announcementId, userId, platform) => {
  const announcement = await Announcement.findById(announcementId);

  if (!announcement) {
    throw new Error('公告不存在');
  }

  await announcement.addShare(userId, platform);

  return { shareCount: announcement.shareCount };
};

// ==================== 阅读记录 ====================

/**
 * 记录阅读
 */
exports.recordRead = async (announcementId, userId, readDuration = 0) => {
  const announcement = await Announcement.findById(announcementId);

  if (!announcement) {
    throw new Error('公告不存在');
  }

  await announcement.recordRead(userId, readDuration);

  return { readCount: announcement.readCount };
};

// ==================== 查询功能 ====================

/**
 * 获取公告详情
 */
exports.getAnnouncementDetail = async (announcementId, userId) => {
  const announcement = await Announcement.findById(announcementId)
    .populate('createdBy', 'name avatar')
    .populate('updatedBy', 'name avatar')
    .populate('comments.userId', 'name avatar')
    .populate('comments.replyToUserId', 'name avatar')
    .populate('comments.mentionedUsers.userId', 'name avatar')
    .populate('mentions.userId', 'name avatar')
    .lean();

  if (!announcement || announcement.deleted) {
    throw new Error('公告不存在');
  }

  // 记录阅读
  if (userId) {
    await this.recordRead(announcementId, userId);
  }

  // 添加用户互动状态
  if (userId) {
    const userIdStr = userId.toString();
    announcement.userInteractions = {
      liked: announcement.likes.some(l => l.userId.toString() === userIdStr && !l.cancelled),
      bookmarked: announcement.bookmarks.some(b => b.userId.toString() === userIdStr),
      read: announcement.readers.some(r => r.userId.toString() === userIdStr)
    };
  }

  return announcement;
};

/**
 * 获取村庄公告列表
 */
exports.getVillageAnnouncements = async (villageId, options = {}) => {
  const {
    limit = 20,
    skip = 0,
    type,
    priority,
    status = 'published',
    pinnedOnly = false
  } = options;

  const query = { villageId, deleted: false };

  if (status) query.status = status;
  if (type) query.type = type;
  if (priority) query.priority = priority;
  if (pinnedOnly) {
    query.pinned = true;
    query.$or = [
      { pinnedUntil: { $gte: new Date() } },
      { pinnedUntil: null }
    ];
  }

  const announcements = await Announcement.find(query)
    .sort({ pinned: -1, priority: -1, publishedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('createdBy', 'name avatar')
    .lean();

  const total = await Announcement.countDocuments(query);

  return {
    announcements,
    total,
    limit,
    skip
  };
};

/**
 * 获取热门公告
 */
exports.getPopularAnnouncements = async (villageId, limit = 10) => {
  return await Announcement.getPopularByVillage(villageId, limit);
};

/**
 * 搜索公告
 */
exports.searchAnnouncements = async (villageId, keyword, options = {}) => {
  return await Announcement.searchAnnouncements(villageId, keyword, options);
};

/**
 * 获取@用户的公告
 */
exports.getUserMentions = async (userId, options = {}) => {
  return await Announcement.getMentionsByUser(userId, options);
};

/**
 * 获取用户互动的公告
 */
exports.getUserInteractedAnnouncements = async (userId, options = {}) => {
  return await Announcement.getUserInteracted(userId, options);
};

/**
 * 获取统计信息
 */
exports.getVillageStats = async (villageId) => {
  return await Announcement.getVillageStats(villageId);
};

// ==================== 通知功能 ====================

/**
 * 通知公告已发布
 */
exports._notifyAnnouncementPublished = async (announcement) => {
  if (!webSocketService) return;

  const notification = {
    type: 'announcement_published',
    data: {
      announcementId: announcement._id,
      title: announcement.title,
      type: announcement.type,
      priority: announcement.priority,
      villageId: announcement.villageId
    }
  };

  // 发送到村庄房间
  webSocketService.notifyVillage(announcement.villageId.toString(), notification);
};

/**
 * 通知新评论
 */
exports._notifyNewComment = async (announcement, comment) => {
  if (!webSocketService) return;

  // 通知公告作者
  if (announcement.createdBy.toString() !== comment.userId.toString()) {
    webSocketService.broadcastToUser(announcement.createdBy.toString(), {
      type: 'new_comment',
      data: {
        announcementId: announcement._id,
        title: announcement.title,
        commentId: comment._id,
        commenterName: comment.userName,
        content: comment.content.substring(0, 100)
      }
    });
  }

  // 通知被回复的用户
  if (comment.replyToUserId && comment.replyToUserId.toString() !== comment.userId.toString()) {
    webSocketService.broadcastToUser(comment.replyToUserId.toString(), {
      type: 'comment_reply',
      data: {
        announcementId: announcement._id,
        title: announcement.title,
        commentId: comment._id,
        replierName: comment.userName,
        content: comment.content.substring(0, 100)
      }
    });
  }

  // 通知@的用户
  for (const mention of comment.mentionedUsers) {
    if (mention.userId.toString() !== comment.userId.toString()) {
      webSocketService.broadcastToUser(mention.userId.toString(), {
        type: 'comment_mention',
        data: {
          announcementId: announcement._id,
          title: announcement.title,
          commentId: comment._id,
          commenterName: comment.userName,
          content: comment.content.substring(0, 100)
        }
      });

      // 标记为已通知
      mention.notified = true;
    }
  }
};

/**
 * 通知点赞
 */
exports._notifyLike = async (announcement, userId) => {
  if (!webSocketService) return;

  const user = await User.findById(userId);
  if (!user) return;

  webSocketService.broadcastToUser(announcement.createdBy.toString(), {
    type: 'announcement_liked',
    data: {
      announcementId: announcement._id,
      title: announcement.title,
      likerName: user.name,
      likeCount: announcement.likeCount
    }
  });
};

/**
 * 通知@用户
 */
exports._notifyMentionedUser = async (announcement, mention) => {
  if (!webSocketService) return;

  webSocketService.broadcastToUser(mention.userId.toString(), {
    type: 'announcement_mention',
    data: {
      announcementId: announcement._id,
      title: announcement.title,
      mentionedBy: mention.mentionedBy
    }
  });

  // 标记为已通知
  await announcement.markMentionNotified(mention._id);
};

// ==================== 定时任务 ====================

/**
 * 检查并标记过期公告（定时任务）
 */
exports.checkExpiredAnnouncements = async () => {
  const now = new Date();

  const expiredAnnouncements = await Announcement.find({
    status: 'published',
    expiresAt: { $lt: now },
    deleted: false
  });

  const results = [];

  for (const announcement of expiredAnnouncements) {
    await announcement.markAsExpired();
    results.push({
      announcementId: announcement._id,
      title: announcement.title
    });
  }

  return {
    checked: expiredAnnouncements.length,
    expired: results.length,
    results
  };
};

/**
 * 取消过期的置顶（定时任务）
 */
exports.cancelExpiredPins = async () => {
  const now = new Date();

  const announcements = await Announcement.find({
    pinned: true,
    pinnedUntil: { $lt: now },
    deleted: false
  });

  const results = [];

  for (const announcement of announcements) {
    announcement.pinned = false;
    await announcement.save();
    results.push({
      announcementId: announcement._id,
      title: announcement.title
    });
  }

  return {
    checked: announcements.length,
    unpinned: results.length,
    results
  };
};
