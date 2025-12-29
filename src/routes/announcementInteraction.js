/**
 * 村务公告互动API路由
 * 处理公告发布、评论、@提醒、点赞等互动功能的RESTful接口
 */

const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementInteractionController');
const { authenticate } = require('../middleware/auth');
const { body, param } = require('express-validator');

// 验证中间件
const validate = (req, res, next) => {
  const errors = require('express-validator').validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '参数验证失败',
      errors: errors.array()
    });
  }
  next();
};

// ==================== 公告发布与管理 ====================

/**
 * @route   POST /api/v1/announcements
 * @desc    创建公告
 * @access  Private
 */
router.post(
  '/announcements',
  authenticate,
  body('villageId').notEmpty().withMessage('villageId不能为空'),
  body('title').notEmpty().withMessage('title不能为空'),
  body('content').notEmpty().withMessage('content不能为空'),
  body('type').isIn(['notice', 'policy', 'activity', 'meeting', 'emergency', 'other']).withMessage('type无效'),
  validate,
  announcementController.createAnnouncement
);

/**
 * @route   POST /api/v1/announcements/:announcementId/publish
 * @desc    发布公告
 * @access  Private
 */
router.post(
  '/announcements/:announcementId/publish',
  authenticate,
  param('announcementId').isMongoId().withMessage('announcementId无效'),
  validate,
  announcementController.publishAnnouncement
);

/**
 * @route   PUT /api/v1/announcements/:announcementId
 * @desc    更新公告
 * @access  Private
 */
router.put(
  '/announcements/:announcementId',
  authenticate,
  param('announcementId').isMongoId().withMessage('announcementId无效'),
  validate,
  announcementController.updateAnnouncement
);

/**
 * @route   DELETE /api/v1/announcements/:announcementId
 * @desc    删除公告
 * @access  Private
 */
router.delete(
  '/announcements/:announcementId',
  authenticate,
  param('announcementId').isMongoId().withMessage('announcementId无效'),
  validate,
  announcementController.deleteAnnouncement
);

/**
 * @route   GET /api/v1/announcements/:announcementId
 * @desc    获取公告详情
 * @access  Private/Public
 */
router.get(
  '/announcements/:announcementId',
  param('announcementId').isMongoId().withMessage('announcementId无效'),
  validate,
  announcementController.getAnnouncementDetail
);

/**
 * @route   GET /api/v1/villages/:villageId/announcements
 * @desc    获取村庄公告列表
 * @access  Private/Public
 */
router.get(
  '/villages/:villageId/announcements',
  param('villageId').isMongoId().withMessage('villageId无效'),
  validate,
  announcementController.getVillageAnnouncements
);

/**
 * @route   GET /api/v1/villages/:villageId/announcements/popular
 * @desc    获取热门公告
 * @access  Private/Public
 */
router.get(
  '/villages/:villageId/announcements/popular',
  param('villageId').isMongoId().withMessage('villageId无效'),
  validate,
  announcementController.getPopularAnnouncements
);

/**
 * @route   GET /api/v1/villages/:villageId/announcements/search
 * @desc    搜索公告
 * @access  Private/Public
 */
router.get(
  '/villages/:villageId/announcements/search',
  param('villageId').isMongoId().withMessage('villageId无效'),
  validate,
  announcementController.searchAnnouncements
);

// ==================== 评论功能 ====================

/**
 * @route   POST /api/v1/announcements/:announcementId/comments
 * @desc    添加评论
 * @access  Private
 */
router.post(
  '/announcements/:announcementId/comments',
  authenticate,
  param('announcementId').isMongoId().withMessage('announcementId无效'),
  body('content').notEmpty().withMessage('content不能为空'),
  validate,
  announcementController.addComment
);

/**
 * @route   DELETE /api/v1/announcements/:announcementId/comments/:commentId
 * @desc    删除评论
 * @access  Private
 */
router.delete(
  '/announcements/:announcementId/comments/:commentId',
  authenticate,
  param('announcementId').isMongoId().withMessage('announcementId无效'),
  param('commentId').isMongoId().withMessage('commentId无效'),
  validate,
  announcementController.deleteComment
);

/**
 * @route   POST /api/v1/announcements/:announcementId/comments/:commentId/like
 * @desc    点赞评论
 * @access  Private
 */
router.post(
  '/announcements/:announcementId/comments/:commentId/like',
  authenticate,
  param('announcementId').isMongoId().withMessage('announcementId无效'),
  param('commentId').isMongoId().withMessage('commentId无效'),
  validate,
  announcementController.toggleCommentLike
);

/**
 * @route   GET /api/v1/announcements/:announcementId/comments
 * @desc    获取评论列表
 * @access  Private/Public
 */
router.get(
  '/announcements/:announcementId/comments',
  param('announcementId').isMongoId().withMessage('announcementId无效'),
  validate,
  announcementController.getComments
);

/**
 * @route   GET /api/v1/announcements/:announcementId/comments/:commentId/replies
 * @desc    获取评论的回复
 * @access  Private/Public
 */
router.get(
  '/announcements/:announcementId/comments/:commentId/replies',
  param('announcementId').isMongoId().withMessage('announcementId无效'),
  param('commentId').isMongoId().withMessage('commentId无效'),
  validate,
  announcementController.getCommentReplies
);

// ==================== 点赞功能 ====================

/**
 * @route   POST /api/v1/announcements/:announcementId/like
 * @desc    点赞/取消点赞公告
 * @access  Private
 */
router.post(
  '/announcements/:announcementId/like',
  authenticate,
  param('announcementId').isMongoId().withMessage('announcementId无效'),
  validate,
  announcementController.toggleLike
);

/**
 * @route   GET /api/v1/announcements/:announcementId/likes
 * @desc    获取点赞用户列表
 * @access  Private/Public
 */
router.get(
  '/announcements/:announcementId/likes',
  param('announcementId').isMongoId().withMessage('announcementId无效'),
  validate,
  announcementController.getLikes
);

// ==================== 收藏功能 ====================

/**
 * @route   POST /api/v1/announcements/:announcementId/bookmark
 * @desc    收藏/取消收藏公告
 * @access  Private
 */
router.post(
  '/announcements/:announcementId/bookmark',
  authenticate,
  param('announcementId').isMongoId().withMessage('announcementId无效'),
  validate,
  announcementController.toggleBookmark
);

/**
 * @route   GET /api/v1/users/me/bookmarks
 * @desc    获取用户收藏的公告
 * @access  Private
 */
router.get(
  '/users/me/bookmarks',
  authenticate,
  announcementController.getUserBookmarks
);

// ==================== 分享功能 ====================

/**
 * @route   POST /api/v1/announcements/:announcementId/share
 * @desc    记录分享
 * @access  Private
 */
router.post(
  '/announcements/:announcementId/share',
  authenticate,
  param('announcementId').isMongoId().withMessage('announcementId无效'),
  body('platform').isIn(['wechat', 'moments', 'qq', 'weibo', 'other']).withMessage('platform无效'),
  validate,
  announcementController.recordShare
);

// ==================== 阅读记录 ====================

/**
 * @route   POST /api/v1/announcements/:announcementId/read
 * @desc    记录阅读
 * @access  Private
 */
router.post(
  '/announcements/:announcementId/read',
  authenticate,
  param('announcementId').isMongoId().withMessage('announcementId无效'),
  validate,
  announcementController.recordRead
);

// ==================== @提醒功能 ====================

/**
 * @route   GET /api/v1/users/me/mentions
 * @desc    获取@我的公告
 * @access  Private
 */
router.get(
  '/users/me/mentions',
  authenticate,
  announcementController.getUserMentions
);

// ==================== 互动查询 ====================

/**
 * @route   GET /api/v1/users/me/interacted-announcements
 * @desc    获取我互动的公告
 * @access  Private
 */
router.get(
  '/users/me/interacted-announcements',
  authenticate,
  announcementController.getMyInteractedAnnouncements
);

// ==================== 统计信息 ====================

/**
 * @route   GET /api/v1/villages/:villageId/announcements/stats
 * @desc    获取村庄公告统计
 * @access  Private/Public
 */
router.get(
  '/villages/:villageId/announcements/stats',
  param('villageId').isMongoId().withMessage('villageId无效'),
  validate,
  announcementController.getVillageStats
);

// ==================== 定时任务（仅管理员） ====================

/**
 * @route   POST /api/v1/admin/announcements/check-expired
 * @desc    检查并标记过期公告
 * @access  Admin
 */
router.post(
  '/admin/announcements/check-expired',
  authenticate,
  announcementController.checkExpiredAnnouncements
);

/**
 * @route   POST /api/v1/admin/announcements/cancel-pins
 * @desc    取消过期的置顶
 * @access  Admin
 */
router.post(
  '/admin/announcements/cancel-pins',
  authenticate,
  announcementController.cancelExpiredPins
);

module.exports = router;
