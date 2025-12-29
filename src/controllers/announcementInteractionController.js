/**
 * 村务公告互动控制器
 * 处理公告发布、评论、@提醒、点赞等互动功能的HTTP请求
 */

const announcementService = require('../services/announcementInteractionService');
const { successResponse, errorResponse } = require('../utils/response');

// ==================== 公告发布与管理 ====================

/**
 * 创建公告
 */
exports.createAnnouncement = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const announcement = await announcementService.createAnnouncement(req.body, creatorId);

    return successResponse(res, announcement, '公告创建成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 发布公告
 */
exports.publishAnnouncement = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const publisherId = req.user.id;

    const announcement = await announcementService.publishAnnouncement(announcementId, publisherId);

    return successResponse(res, announcement, '公告发布成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 更新公告
 */
exports.updateAnnouncement = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const announcement = await announcementService.updateAnnouncement(announcementId, updates, userId);

    return successResponse(res, announcement, '公告更新成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 删除公告
 */
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const userId = req.user.id;

    const result = await announcementService.deleteAnnouncement(announcementId, userId);

    return successResponse(res, result, '公告删除成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取公告详情
 */
exports.getAnnouncementDetail = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const userId = req.user?.id;

    const announcement = await announcementService.getAnnouncementDetail(announcementId, userId);

    return successResponse(res, announcement);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取村庄公告列表
 */
exports.getVillageAnnouncements = async (req, res) => {
  try {
    const { villageId } = req.params;
    const options = {
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0,
      type: req.query.type,
      priority: req.query.priority,
      status: req.query.status,
      pinnedOnly: req.query.pinnedOnly === 'true'
    };

    const result = await announcementService.getVillageAnnouncements(villageId, options);

    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取热门公告
 */
exports.getPopularAnnouncements = async (req, res) => {
  try {
    const { villageId } = req.params;
    const { limit = 10 } = req.query;

    const announcements = await announcementService.getPopularAnnouncements(
      villageId,
      parseInt(limit)
    );

    return successResponse(res, announcements);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 搜索公告
 */
exports.searchAnnouncements = async (req, res) => {
  try {
    const { villageId } = req.params;
    const { keyword } = req.query;
    const options = {
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0,
      type: req.query.type,
      tags: req.query.tags ? req.query.tags.split(',') : undefined
    };

    const announcements = await announcementService.searchAnnouncements(
      villageId,
      keyword,
      options
    );

    return successResponse(res, announcements);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 评论功能 ====================

/**
 * 添加评论
 */
exports.addComment = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const userId = req.user.id;
    const commentData = {
      ...req.body,
      userId
    };

    const comment = await announcementService.addComment(announcementId, commentData, userId);

    return successResponse(res, comment, '评论添加成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 删除评论
 */
exports.deleteComment = async (req, res) => {
  try {
    const { announcementId, commentId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user?.role === 'admin';

    const result = await announcementService.deleteComment(announcementId, commentId, userId, isAdmin);

    return successResponse(res, result, '评论删除成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 点赞评论
 */
exports.toggleCommentLike = async (req, res) => {
  try {
    const { announcementId, commentId } = req.params;
    const userId = req.user.id;

    const result = await announcementService.toggleCommentLike(announcementId, commentId, userId);

    return successResponse(res, result, '操作成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取评论列表
 */
exports.getComments = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const options = {
      limit: parseInt(req.query.limit) || 50,
      skip: parseInt(req.query.skip) || 0,
      parentOnly: req.query.parentOnly !== 'false'
    };

    const result = await announcementService.getComments(announcementId, options);

    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取评论的回复
 */
exports.getCommentReplies = async (req, res) => {
  try {
    const { announcementId, commentId } = req.params;

    const replies = await announcementService.getCommentReplies(announcementId, commentId);

    return successResponse(res, replies);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 点赞功能 ====================

/**
 * 点赞/取消点赞公告
 */
exports.toggleLike = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const userId = req.user.id;

    const result = await announcementService.toggleLike(announcementId, userId);

    return successResponse(res, result, '操作成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取点赞用户列表
 */
exports.getLikes = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const options = {
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0
    };

    const result = await announcementService.getLikes(announcementId, options);

    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 收藏功能 ====================

/**
 * 收藏/取消收藏公告
 */
exports.toggleBookmark = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const userId = req.user.id;

    const result = await announcementService.toggleBookmark(announcementId, userId);

    return successResponse(res, result, '操作成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取用户收藏的公告
 */
exports.getUserBookmarks = async (req, res) => {
  try {
    const userId = req.user.id;
    const options = {
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0
    };

    const announcements = await announcementService.getUserBookmarks(userId, options);

    return successResponse(res, announcements);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 分享功能 ====================

/**
 * 记录分享
 */
exports.recordShare = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const userId = req.user.id;
    const { platform } = req.body;

    const result = await announcementService.recordShare(announcementId, userId, platform);

    return successResponse(res, result, '分享记录成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 阅读记录 ====================

/**
 * 记录阅读
 */
exports.recordRead = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const userId = req.user.id;
    const { readDuration } = req.body;

    const result = await announcementService.recordRead(announcementId, userId, readDuration);

    return successResponse(res, result, '阅读记录成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== @提醒功能 ====================

/**
 * 获取@我的公告
 */
exports.getUserMentions = async (req, res) => {
  try {
    const userId = req.user.id;
    const options = {
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0,
      unreadOnly: req.query.unreadOnly === 'true'
    };

    const announcements = await announcementService.getUserMentions(userId, options);

    return successResponse(res, announcements);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 互动查询 ====================

/**
 * 获取我互动的公告
 */
exports.getMyInteractedAnnouncements = async (req, res) => {
  try {
    const userId = req.user.id;
    const options = {
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0
    };

    const announcements = await announcementService.getUserInteractedAnnouncements(userId, options);

    return successResponse(res, announcements);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 统计信息 ====================

/**
 * 获取村庄公告统计
 */
exports.getVillageStats = async (req, res) => {
  try {
    const { villageId } = req.params;

    const stats = await announcementService.getVillageStats(villageId);

    return successResponse(res, stats);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 定时任务（仅管理员） ====================

/**
 * 检查并标记过期公告
 */
exports.checkExpiredAnnouncements = async (req, res) => {
  try {
    // 验证管理员权限
    if (req.user?.role !== 'admin') {
      return errorResponse(res, '需要管理员权限', 403);
    }

    const result = await announcementService.checkExpiredAnnouncements();

    return successResponse(res, result, '过期公告检查完成');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 取消过期的置顶
 */
exports.cancelExpiredPins = async (req, res) => {
  try {
    // 验证管理员权限
    if (req.user?.role !== 'admin') {
      return errorResponse(res, '需要管理员权限', 403);
    }

    const result = await announcementService.cancelExpiredPins();

    return successResponse(res, result, '过期置顶取消完成');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};
