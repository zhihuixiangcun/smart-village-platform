/**
 * 乡村活动管理API路由
 * 处理活动组织、志愿者召集、活动签到等功能的RESTful接口
 */

const express = require('express');
const router = express.Router();
const villageEventController = require('../controllers/villageEventController');
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

// ==================== 活动组织 ====================

/**
 * @route   POST /api/v1/villages/:villageId/events
 * @desc    创建活动
 * @access  Private
 */
router.post(
  '/villages/:villageId/events',
  authenticate,
  param('villageId').isMongoId().withMessage('villageId无效'),
  body('title').notEmpty().withMessage('title不能为空'),
  body('description').notEmpty().withMessage('description不能为空'),
  body('eventType').isIn(['cultural', 'sports', 'volunteer', 'education', 'meeting', 'welfare', 'agriculture', 'emergency', 'entertainment', 'other']).withMessage('eventType无效'),
  body('scheduledStart').isISO8601().withMessage('scheduledStart格式无效'),
  body('scheduledEnd').isISO8601().withMessage('scheduledEnd格式无效'),
  body('location').notEmpty().withMessage('location不能为空'),
  validate,
  villageEventController.createEvent
);

/**
 * @route   POST /api/v1/events/:eventId/publish
 * @desc    发布活动
 * @access  Private
 */
router.post(
  '/events/:eventId/publish',
  authenticate,
  param('eventId').isMongoId().withMessage('eventId无效'),
  validate,
  villageEventController.publishEvent
);

/**
 * @route   POST /api/v1/events/:eventId/start-recruiting
 * @desc    开始招募
 * @access  Private
 */
router.post(
  '/events/:eventId/start-recruiting',
  authenticate,
  param('eventId').isMongoId().withMessage('eventId无效'),
  validate,
  villageEventController.startRecruiting
);

/**
 * @route   POST /api/v1/events/:eventId/start
 * @desc    开始活动
 * @access  Private
 */
router.post(
  '/events/:eventId/start',
  authenticate,
  param('eventId').isMongoId().withMessage('eventId无效'),
  validate,
  villageEventController.startEvent
);

/**
 * @route   POST /api/v1/events/:eventId/complete
 * @desc    结束活动
 * @access  Private
 */
router.post(
  '/events/:eventId/complete',
  authenticate,
  param('eventId').isMongoId().withMessage('eventId无效'),
  validate,
  villageEventController.completeEvent
);

/**
 * @route   PUT /api/v1/events/:eventId
 * @desc    更新活动
 * @access  Private
 */
router.put(
  '/events/:eventId',
  authenticate,
  param('eventId').isMongoId().withMessage('eventId无效'),
  validate,
  villageEventController.updateEvent
);

/**
 * @route   POST /api/v1/events/:eventId/cancel
 * @desc    取消活动
 * @access  Private
 */
router.post(
  '/events/:eventId/cancel',
  authenticate,
  param('eventId').isMongoId().withMessage('eventId无效'),
  body('reason').notEmpty().withMessage('reason不能为空'),
  validate,
  villageEventController.cancelEvent
);

/**
 * @route   GET /api/v1/events/:eventId
 * @desc    获取活动详情
 * @access  Private/Public
 */
router.get(
  '/events/:eventId',
  param('eventId').isMongoId().withMessage('eventId无效'),
  validate,
  villageEventController.getEventDetail
);

/**
 * @route   GET /api/v1/villages/:villageId/events
 * @desc    获取村庄活动列表
 * @access  Private/Public
 */
router.get(
  '/villages/:villageId/events',
  param('villageId').isMongoId().withMessage('villageId无效'),
  validate,
  villageEventController.getVillageEvents
);

/**
 * @route   GET /api/v1/villages/:villageId/events/popular
 * @desc    获取热门活动
 * @access  Private/Public
 */
router.get(
  '/villages/:villageId/events/popular',
  param('villageId').isMongoId().withMessage('villageId无效'),
  validate,
  villageEventController.getPopularEvents
);

/**
 * @route   GET /api/v1/villages/:villageId/events/search
 * @desc    搜索活动
 * @access  Private/Public
 */
router.get(
  '/villages/:villageId/events/search',
  param('villageId').isMongoId().withMessage('villageId无效'),
  validate,
  villageEventController.searchEvents
);

// ==================== 志愿者召集 ====================

/**
 * @route   POST /api/v1/events/:eventId/volunteers
 * @desc    志愿者报名
 * @access  Private
 */
router.post(
  '/events/:eventId/volunteers',
  authenticate,
  param('eventId').isMongoId().withMessage('eventId无效'),
  body('role').isIn(['organizer', 'coordinator', 'staff', 'participant']).withMessage('role无效'),
  validate,
  villageEventController.registerVolunteer
);

/**
 * @route   PUT /api/v1/events/:eventId/volunteers/:volunteerId/approve
 * @desc    审核志愿者
 * @access  Private
 */
router.put(
  '/events/:eventId/volunteers/:volunteerId/approve',
  authenticate,
  param('eventId').isMongoId().withMessage('eventId无效'),
  param('volunteerId').isMongoId().withMessage('volunteerId无效'),
  body('approved').isBoolean().withMessage('approved必须是布尔值'),
  validate,
  villageEventController.approveVolunteer
);

/**
 * @route   GET /api/v1/events/:eventId/volunteers
 * @desc    获取志愿者列表
 * @access  Private
 */
router.get(
  '/events/:eventId/volunteers',
  param('eventId').isMongoId().withMessage('eventId无效'),
  validate,
  villageEventController.getVolunteers
);

/**
 * @route   GET /api/v1/users/me/volunteer-events
 * @desc    获取我的志愿活动
 * @access  Private
 */
router.get(
  '/users/me/volunteer-events',
  authenticate,
  villageEventController.getMyVolunteerEvents
);

// ==================== 活动报名 ====================

/**
 * @route   POST /api/v1/events/:eventId/participants
 * @desc    参与者报名
 * @access  Private
 */
router.post(
  '/events/:eventId/participants',
  authenticate,
  param('eventId').isMongoId().withMessage('eventId无效'),
  validate,
  villageEventController.registerParticipant
);

/**
 * @route   GET /api/v1/events/:eventId/participants
 * @desc    获取参与者列表
 * @access  Private
 */
router.get(
  '/events/:eventId/participants',
  param('eventId').isMongoId().withMessage('eventId无效'),
  validate,
  villageEventController.getParticipants
);

// ==================== 活动签到 ====================

/**
 * @route   POST /api/v1/events/:eventId/volunteers/:volunteerId/check-in
 * @desc    志愿者签到
 * @access  Private
 */
router.post(
  '/events/:eventId/volunteers/:volunteerId/check-in',
  authenticate,
  param('eventId').isMongoId().withMessage('eventId无效'),
  param('volunteerId').isMongoId().withMessage('volunteerId无效'),
  validate,
  villageEventController.checkInVolunteer
);

/**
 * @route   POST /api/v1/events/:eventId/volunteers/:volunteerId/check-out
 * @desc    志愿者签退
 * @access  Private
 */
router.post(
  '/events/:eventId/volunteers/:volunteerId/check-out',
  authenticate,
  param('eventId').isMongoId().withMessage('eventId无效'),
  param('volunteerId').isMongoId().withMessage('volunteerId无效'),
  validate,
  villageEventController.checkOutVolunteer
);

/**
 * @route   POST /api/v1/events/:eventId/check-in
 * @desc    参与者签到
 * @access  Private
 */
router.post(
  '/events/:eventId/check-in',
  authenticate,
  param('eventId').isMongoId().withMessage('eventId无效'),
  validate,
  villageEventController.checkInParticipant
);

/**
 * @route   POST /api/v1/events/:eventId/batch-check-in
 * @desc    批量签到
 * @access  Private
 */
router.post(
  '/events/:eventId/batch-check-in',
  authenticate,
  param('eventId').isMongoId().withMessage('eventId无效'),
  body('checkInList').isArray().withMessage('checkInList必须是数组'),
  validate,
  villageEventController.batchCheckIn
);

/**
 * @route   GET /api/v1/events/:eventId/check-in-stats
 * @desc    获取签到统计
 * @access  Private
 */
router.get(
  '/events/:eventId/check-in-stats',
  param('eventId').isMongoId().withMessage('eventId无效'),
  validate,
  villageEventController.getCheckInStats
);

/**
 * @route   GET /api/v1/events/check-in-required
 * @desc    获取需要签到的活动
 * @access  Private
 */
router.get(
  '/events/check-in-required',
  authenticate,
  villageEventController.getCheckInRequiredEvents
);

// ==================== 互动功能 ====================

/**
 * @route   POST /api/v1/events/:eventId/like
 * @desc    点赞活动
 * @access  Private
 */
router.post(
  '/events/:eventId/like',
  authenticate,
  param('eventId').isMongoId().withMessage('eventId无效'),
  validate,
  villageEventController.toggleLike
);

/**
 * @route   POST /api/v1/events/:eventId/bookmark
 * @desc    收藏活动
 * @access  Private
 */
router.post(
  '/events/:eventId/bookmark',
  authenticate,
  param('eventId').isMongoId().withMessage('eventId无效'),
  validate,
  villageEventController.toggleBookmark
);

/**
 * @route   POST /api/v1/events/:eventId/comments
 * @desc    添加评论
 * @access  Private
 */
router.post(
  '/events/:eventId/comments',
  authenticate,
  param('eventId').isMongoId().withMessage('eventId无效'),
  body('content').notEmpty().withMessage('content不能为空'),
  validate,
  villageEventController.addComment
);

/**
 * @route   POST /api/v1/events/:eventId/feedbacks
 * @desc    添加活动反馈
 * @access  Private
 */
router.post(
  '/events/:eventId/feedbacks',
  authenticate,
  param('eventId').isMongoId().withMessage('eventId无效'),
  validate,
  villageEventController.addFeedback
);

/**
 * @route   POST /api/v1/events/:eventId/summary
 * @desc    添加活动总结
 * @access  Private
 */
router.post(
  '/events/:eventId/summary',
  authenticate,
  param('eventId').isMongoId().withMessage('eventId无效'),
  validate,
  villageEventController.addEventSummary
);

// ==================== 统计信息 ====================

/**
 * @route   GET /api/v1/villages/:villageId/events/stats
 * @desc    获取村庄活动统计
 * @access  Private/Public
 */
router.get(
  '/villages/:villageId/events/stats',
  param('villageId').isMongoId().withMessage('villageId无效'),
  validate,
  villageEventController.getVillageStats
);

// ==================== 定时任务（仅管理员） ====================

/**
 * @route   POST /api/v1/admin/events/check-status
 * @desc    检查并更新活动状态
 * @access  Admin
 */
router.post(
  '/admin/events/check-status',
  authenticate,
  villageEventController.checkEventStatus
);

/**
 * @route   POST /api/v1/admin/events/send-reminders
 * @desc    发送活动提醒
 * @access  Admin
 */
router.post(
  '/admin/events/send-reminders',
  authenticate,
  villageEventController.sendEventReminders
);

module.exports = router;
