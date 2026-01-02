/**
 * 实时通知路由
 * 处理通知相关的API请求
 */

const express = require('express');
const router = express.Router();
const realtimeNotificationController = require('../controllers/realtimeNotificationController');
const { authenticate } = require('../middleware/auth');

// 所有路由需要身份验证
router.use(authenticate);

/**
 * @route   POST /api/notifications
 * @desc    创建并发送通知
 * @access  Private
 */
router.post('/', realtimeNotificationController.createNotification);

/**
 * @route   POST /api/notifications/bulk
 * @desc    批量创建通知
 * @access  Private
 */
router.post('/bulk', realtimeNotificationController.createBulkNotifications);

/**
 * @route   GET /api/notifications
 * @desc    获取用户通知列表
 * @query   unreadOnly - 是否只获取未读通知
 * @query   limit - 每页数量 (默认20)
 * @query   skip - 跳过数量 (默认0)
 * @query   type - 通知类型筛选
 * @access  Private
 */
router.get('/', realtimeNotificationController.getUserNotifications);

/**
 * @route   GET /api/notifications/unread/count
 * @desc    获取未读通知数量
 * @access  Private
 */
router.get('/unread/count', realtimeNotificationController.getUnreadCount);

/**
 * @route   GET /api/notifications/websocket/status
 * @desc    获取WebSocket连接状态
 * @access  Private
 */
router.get('/websocket/status', realtimeNotificationController.getWebSocketStatus);

/**
 * @route   GET /api/notifications/config
 * @desc    获取推送配置
 * @access  Private
 */
router.get('/config', realtimeNotificationController.getPushConfig);

/**
 * @route   POST /api/notifications/test
 * @desc    发送测试通知
 * @access  Private
 */
router.post('/test', realtimeNotificationController.sendTestNotification);

/**
 * @route   GET /api/notifications/:id
 * @desc    获取通知详情
 * @access  Private
 */
router.get('/:id', realtimeNotificationController.getNotification);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    标记通知已读
 * @access  Private
 */
router.put('/:id/read', realtimeNotificationController.markAsRead);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    标记所有通知已读
 * @access  Private
 */
router.put('/read-all', realtimeNotificationController.markAllAsRead);

/**
 * @route   POST /api/notifications/:id/click
 * @desc    处理通知点击
 * @access  Private
 */
router.post('/:id/click', realtimeNotificationController.handleNotificationClick);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    删除通知
 * @access  Private
 */
router.delete('/:id', realtimeNotificationController.deleteNotification);

/**
 * @route   DELETE /api/notifications/bulk
 * @desc    批量删除通知
 * @access  Private
 */
router.delete('/bulk', realtimeNotificationController.deleteBulkNotifications);

module.exports = router;
