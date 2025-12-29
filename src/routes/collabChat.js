/**
 * 协作群聊API路由
 * 处理村干部之间的协作沟通、任务分配、会议通知等群聊功能的RESTful接口
 */

const express = require('express');
const router = express.Router();
const collabChatController = require('../controllers/collabChatController');
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

// ==================== 协作空间群聊管理 ====================

/**
 * @route   POST /api/v1/collab-chat/workspaces/:workspaceId/group
 * @desc    创建协作空间群聊
 * @access  Private
 */
router.post(
  '/workspaces/:workspaceId/group',
  authenticate,
  validate,
  collabChatController.createWorkspaceGroup
);

/**
 * @route   GET /api/v1/collab-chat/workspaces/:workspaceId/group
 * @desc    获取协作空间群聊
 * @access  Private
 */
router.get(
  '/workspaces/:workspaceId/group',
  authenticate,
  validate,
  collabChatController.getWorkspaceGroup
);

// ==================== 协作消息发送 ====================

/**
 * @route   POST /api/v1/collab-chat/tasks/:taskId/notify-assigned
 * @desc    发送任务分配消息
 * @access  Private
 */
router.post(
  '/tasks/:taskId/notify-assigned',
  authenticate,
  body('workspaceId').notEmpty().withMessage('workspaceId不能为空'),
  validate,
  collabChatController.sendTaskAssignedMessage
);

/**
 * @route   POST /api/v1/collab-chat/tasks/:taskId/notify-updated
 * @desc    发送任务更新消息
 * @access  Private
 */
router.post(
  '/tasks/:taskId/notify-updated',
  authenticate,
  body('updateType').isIn(['started', 'progress', 'completed', 'cancelled', 'overdue']).withMessage('updateType无效'),
  validate,
  collabChatController.sendTaskUpdatedMessage
);

/**
 * @route   POST /api/v1/collab-chat/tasks/:taskId/notify-reminder
 * @desc    发送任务提醒消息
 * @access  Private
 */
router.post(
  '/tasks/:taskId/notify-reminder',
  authenticate,
  body('reminderType').isIn(['deadline', 'overdue', 'today']).withMessage('reminderType无效'),
  validate,
  collabChatController.sendTaskReminderMessage
);

/**
 * @route   POST /api/v1/collab-chat/meetings/:meetingId/notify-created
 * @desc    发送会议创建消息
 * @access  Private
 */
router.post(
  '/meetings/:meetingId/notify-created',
  authenticate,
  body('workspaceId').notEmpty().withMessage('workspaceId不能为空'),
  validate,
  collabChatController.sendMeetingCreatedMessage
);

/**
 * @route   POST /api/v1/collab-chat/meetings/:meetingId/notify-reminder
 * @desc    发送会议提醒消息
 * @access  Private
 */
router.post(
  '/meetings/:meetingId/notify-reminder',
  authenticate,
  body('minutesBefore').isInt({ min: 0 }).withMessage('minutesBefore必须是非负整数'),
  validate,
  collabChatController.sendMeetingReminderMessage
);

/**
 * @route   POST /api/v1/collab-chat/approvals/:approvalId/notify-pending
 * @desc    发送审批待处理消息
 * @access  Private
 */
router.post(
  '/approvals/:approvalId/notify-pending',
  authenticate,
  body('workspaceId').notEmpty().withMessage('workspaceId不能为空'),
  validate,
  collabChatController.sendApprovalPendingMessage
);

/**
 * @route   POST /api/v1/collab-chat/workspaces/:workspaceId/notify
 * @desc    发送工作空间通知
 * @access  Private
 */
router.post(
  '/workspaces/:workspaceId/notify',
  authenticate,
  body('notificationType').notEmpty().withMessage('notificationType不能为空'),
  body('content').notEmpty().withMessage('content不能为空'),
  validate,
  collabChatController.sendWorkspaceNotification
);

/**
 * @route   POST /api/v1/collab-chat/groups/:groupId/system-message
 * @desc    发送系统消息
 * @access  Private
 */
router.post(
  '/groups/:groupId/system-message',
  authenticate,
  body('content').notEmpty().withMessage('content不能为空'),
  validate,
  collabChatController.sendSystemMessage
);

// ==================== 快速操作处理 ====================

/**
 * @route   POST /api/v1/collab-chat/messages/:messageId/quick-action
 * @desc    处理快速操作响应
 * @access  Private
 */
router.post(
  '/messages/:messageId/quick-action',
  authenticate,
  body('actionId').notEmpty().withMessage('actionId不能为空'),
  validate,
  collabChatController.handleQuickAction
);

// ==================== 消息查询 ====================

/**
 * @route   GET /api/v1/collab-chat/groups/:groupId/messages
 * @desc    获取群聊消息列表
 * @access  Private
 */
router.get(
  '/groups/:groupId/messages',
  authenticate,
  validate,
  collabChatController.getGroupMessages
);

/**
 * @route   GET /api/v1/collab-chat/groups/:groupId/unread-count
 * @desc    获取群聊未读消息数
 * @access  Private
 */
router.get(
  '/groups/:groupId/unread-count',
  authenticate,
  validate,
  collabChatController.getGroupUnreadCount
);

/**
 * @route   GET /api/v1/collab-chat/workspaces/:workspaceId/messages
 * @desc    获取协作空间群聊消息列表
 * @access  Private
 */
router.get(
  '/workspaces/:workspaceId/messages',
  authenticate,
  validate,
  collabChatController.getWorkspaceGroupMessages
);

// ==================== 批量操作 ====================

/**
 * @route   POST /api/v1/collab-chat/workspaces/:workspaceId/summary
 * @desc    批量发送工作空间摘要
 * @access  Private
 */
router.post(
  '/workspaces/:workspaceId/summary',
  authenticate,
  body('summaryType').isIn(['daily', 'weekly']).withMessage('summaryType无效'),
  validate,
  collabChatController.sendWorkspaceSummary
);

// ==================== 综合操作 ====================

/**
 * @route   POST /api/v1/collab-chat/workspaces/:workspaceId/tasks-with-notify
 * @desc    创建任务并发送群聊通知
 * @access  Private
 */
router.post(
  '/workspaces/:workspaceId/tasks-with-notify',
  authenticate,
  collabChatController.createTaskWithNotification
);

/**
 * @route   POST /api/v1/collab-chat/workspaces/:workspaceId/meetings-with-notify
 * @desc    创建会议并发送群聊通知
 * @access  Private
 */
router.post(
  '/workspaces/:workspaceId/meetings-with-notify',
  authenticate,
  collabChatController.createMeetingWithNotification
);

/**
 * @route   POST /api/v1/collab-chat/workspaces/:workspaceId/approvals-with-notify
 * @desc    创建审批请求并发送群聊通知
 * @access  Private
 */
router.post(
  '/workspaces/:workspaceId/approvals-with-notify',
  authenticate,
  collabChatController.createApprovalWithNotification
);

// ==================== 统计信息 ====================

/**
 * @route   GET /api/v1/collab-chat/workspaces/:workspaceId/chat-stats
 * @desc    获取协作空间群聊统计
 * @access  Private
 */
router.get(
  '/workspaces/:workspaceId/chat-stats',
  authenticate,
  validate,
  collabChatController.getWorkspaceChatStats
);

module.exports = router;
