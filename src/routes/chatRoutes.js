/**
 * Chat Routes
 * 聊天会话和消息路由
 */

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');

// 所有聊天路由需要认证
router.use(authenticate);

/**
 * @route   GET /api/v1/chat/conversations
 * @desc    获取用户的会话列表
 * @access  Private
 */
router.get('/conversations',
  asyncHandler(chatController.getConversations)
);

/**
 * @route   GET /api/v1/chat/conversations/:id
 * @desc    获取会话详情
 * @access  Private
 */
router.get('/conversations/:id',
  asyncHandler(chatController.getConversationById)
);

/**
 * @route   POST /api/v1/chat/conversations
 * @desc    创建会话（私聊或群聊）
 * @access  Private
 */
router.post('/conversations',
  asyncHandler(chatController.createConversation)
);

/**
 * @route   GET /api/v1/chat/conversations/:id/messages
 * @desc    获取会话的消息列表
 * @access  Private
 */
router.get('/conversations/:id/messages',
  asyncHandler(chatController.getMessages)
);

/**
 * @route   POST /api/v1/chat/conversations/:id/messages
 * @desc    发送消息
 * @access  Private
 */
router.post('/conversations/:id/messages',
  asyncHandler(chatController.sendMessage)
);

/**
 * @route   PUT /api/v1/chat/conversations/:id/messages/:messageId/recall
 * @desc    撤回消息
 * @access  Private
 */
router.put('/conversations/:id/messages/:messageId/recall',
  asyncHandler(chatController.recallMessage)
);

/**
 * @route   POST /api/v1/chat/conversations/:id/read
 * @desc    标记消息为已读
 * @access  Private
 */
router.post('/conversations/:id/read',
  asyncHandler(chatController.markAsRead)
);

/**
 * @route   POST /api/v1/chat/upload/image
 * @desc    上传聊天图片
 * @access  Private
 */
router.post('/upload/image',
  asyncHandler(chatController.uploadImage)
);

/**
 * @route   GET /api/v1/chat/unread-count
 * @desc    获取未读消息数
 * @access  Private
 */
router.get('/unread-count',
  asyncHandler(chatController.getUnreadCount)
);

/**
 * @route   PUT /api/v1/chat/conversations/:id/pin
 * @desc    置顶/取消置顶会话
 * @access  Private
 */
router.put('/conversations/:id/pin',
  asyncHandler(chatController.togglePin)
);

/**
 * @route   PUT /api/v1/chat/conversations/:id/mute
 * @desc    静音/取消静音会话
 * @access  Private
 */
router.put('/conversations/:id/mute',
  asyncHandler(chatController.toggleMute)
);

/**
 * @route   DELETE /api/v1/chat/conversations/:id/messages
 * @desc    清空聊天记录
 * @access  Private
 */
router.delete('/conversations/:id/messages',
  asyncHandler(chatController.clearConversationMessages)
);

module.exports = router;
