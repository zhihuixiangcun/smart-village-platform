/**
 * 聊天路由
 * 定义好友、消息、群组、通话相关的API端点
 */

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { body, param, query } = require('express-validator');

// ==================== 好友管理 ====================

/**
 * @route   POST /api/v1/chat/friends/request
 * @desc    发送好友请求
 * @access  Private
 */
router.post('/friends/request', [
  body('friendId').isMongoId().withMessage('好友ID格式错误'),
  body('requestMessage').optional().isLength({ max: 200 }).withMessage('请求消息不能超过200字')
], chatController.sendFriendRequest);

/**
 * @route   POST /api/v1/chat/friends/accept
 * @desc    接受好友请求
 * @access  Private
 */
router.post('/friends/accept', [
  body('requesterId').isMongoId().withMessage('请求者ID格式错误')
], chatController.acceptFriendRequest);

/**
 * @route   POST /api/v1/chat/friends/reject
 * @desc    拒绝好友请求
 * @access  Private
 */
router.post('/friends/reject', [
  body('requesterId').isMongoId().withMessage('请求者ID格式错误')
], chatController.rejectFriendRequest);

/**
 * @route   DELETE /api/v1/chat/friends/:friendId
 * @desc    删除好友
 * @access  Private
 */
router.delete('/friends/:friendId', [
  param('friendId').isMongoId().withMessage('好友ID格式错误')
], chatController.deleteFriend);

/**
 * @route   POST /api/v1/chat/friends/:friendId/block
 * @desc    拉黑好友
 * @access  Private
 */
router.post('/friends/:friendId/block', [
  param('friendId').isMongoId().withMessage('好友ID格式错误')
], chatController.blockFriend);

/**
 * @route   PUT /api/v1/chat/friends/:friendId/remark
 * @desc    设置好友备注
 * @access  Private
 */
router.put('/friends/:friendId/remark', [
  param('friendId').isMongoId().withMessage('好友ID格式错误'),
  body('remark').optional().isLength({ max: 50 }).withMessage('备注不能超过50字')
], chatController.setFriendRemark);

/**
 * @route   PUT /api/v1/chat/friends/:friendId/group
 * @desc    设置好友分组
 * @access  Private
 */
router.put('/friends/:friendId/group', [
  param('friendId').isMongoId().withMessage('好友ID格式错误'),
  body('group').isIn(['默认分组', '家人', '亲戚', '邻居', '朋友', '同事', '其他']).withMessage('分组名称无效')
], chatController.setFriendGroup);

/**
 * @route   GET /api/v1/chat/friends
 * @desc    获取好友列表
 * @access  Private
 */
router.get('/friends', [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('skip').optional().isInt({ min: 0 })
], chatController.getFriendList);

/**
 * @route   GET /api/v1/chat/friends/pending
 * @desc    获取待处理好友请求
 * @access  Private
 */
router.get('/friends/pending', chatController.getPendingRequests);

/**
 * @route   GET /api/v1/chat/friends/search
 * @desc    搜索好友
 * @access  Private
 */
router.get('/friends/search', [
  query('keyword').notEmpty().withMessage('请输入搜索关键词')
], chatController.searchFriends);

// ==================== 消息管理 ====================

/**
 * @route   POST /api/v1/chat/messages/private
 * @desc    发送单聊消息
 * @access  Private
 */
router.post('/messages/private', [
  body('receiverId').isMongoId().withMessage('接收者ID格式错误'),
  body('messageType').isIn(['text', 'image', 'voice', 'video', 'file', 'location', 'link']).withMessage('消息类型无效'),
  body('content').notEmpty().withMessage('消息内容不能为空')
], chatController.sendPrivateMessage);

/**
 * @route   POST /api/v1/chat/messages/group
 * @desc    发送群聊消息
 * @access  Private
 */
router.post('/messages/group', [
  body('groupId').isMongoId().withMessage('群组ID格式错误'),
  body('messageType').isIn(['text', 'image', 'voice', 'video', 'file', 'location', 'link']).withMessage('消息类型无效'),
  body('content').notEmpty().withMessage('消息内容不能为空'),
  body('mentionedUserIds').optional().isArray(),
  body('mentionedAll').optional().isBoolean()
], chatController.sendGroupMessage);

/**
 * @route   GET /api/v1/chat/conversations/:conversationId/messages
 * @desc    获取会话消息列表
 * @access  Private
 */
router.get('/conversations/:conversationId/messages', [
  param('conversationId').notEmpty().withMessage('会话ID不能为空'),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('skip').optional().isInt({ min: 0 })
], chatController.getConversationMessages);

/**
 * @route   PUT /api/v1/chat/messages/:messageId/read
 * @desc    标记消息已读
 * @access  Private
 */
router.put('/messages/:messageId/read', [
  param('messageId').isMongoId().withMessage('消息ID格式错误')
], chatController.markMessageAsRead);

/**
 * @route   PUT /api/v1/chat/conversations/:conversationId/read
 * @desc    标记会话所有消息已读
 * @access  Private
 */
router.put('/conversations/:conversationId/read', [
  param('conversationId').notEmpty().withMessage('会话ID不能为空')
], chatController.markConversationAsRead);

/**
 * @route   PUT /api/v1/chat/messages/:messageId/revoke
 * @desc    撤回消息
 * @access  Private
 */
router.put('/messages/:messageId/revoke', [
  param('messageId').isMongoId().withMessage('消息ID格式错误')
], chatController.revokeMessage);

/**
 * @route   GET /api/v1/chat/conversations/:conversationId/unread
 * @desc    获取会话未读消息数
 * @access  Private
 */
router.get('/conversations/:conversationId/unread', [
  param('conversationId').notEmpty().withMessage('会话ID不能为空')
], chatController.getUnreadCount);

/**
 * @route   GET /api/v1/chat/messages/unread/total
 * @desc    获取所有未读消息数
 * @access  Private
 */
router.get('/messages/unread/total', chatController.getTotalUnreadCount);

/**
 * @route   GET /api/v1/chat/messages/search
 * @desc    搜索消息
 * @access  Private
 */
router.get('/messages/search', [
  query('keyword').notEmpty().withMessage('请输入搜索关键词'),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('skip').optional().isInt({ min: 0 })
], chatController.searchMessages);

/**
 * @route   POST /api/v1/chat/messages/:messageId/report
 * @desc    举报消息
 * @access  Private
 */
router.post('/messages/:messageId/report', [
  param('messageId').isMongoId().withMessage('消息ID格式错误'),
  body('reason').isIn(['虚假信息', '诈骗', '骚扰', '不良内容', '违规内容', '其他']).withMessage('请选择举报原因')
], chatController.reportMessage);

// ==================== 群组管理 ====================

/**
 * @route   POST /api/v1/chat/groups
 * @desc    创建群组
 * @access  Private
 */
router.post('/groups', [
  body('name').trim().notEmpty().withMessage('群组名称不能为空').isLength({ max: 50 }).withMessage('群组名称不能超过50字'),
  body('description').optional().isLength({ max: 500 }).withMessage('群组描述不能超过500字'),
  body('groupType').optional().isIn(['normal', 'village', 'committee', 'interest', 'temporary']),
  body('maxMembers').optional().isInt({ min: 3, max: 2000 }),
  body('joinMethod').optional().isIn(['open', 'invite', 'approval', 'code']),
  body('memberIds').optional().isArray()
], chatController.createGroup);

/**
 * @route   PUT /api/v1/chat/groups/:groupId
 * @desc    更新群组信息
 * @access  Private
 */
router.put('/groups/:groupId', [
  param('groupId').isMongoId().withMessage('群组ID格式错误')
], chatController.updateGroup);

/**
 * @route   PUT /api/v1/chat/groups/:groupId/settings
 * @desc    更新群设置
 * @access  Private
 */
router.put('/groups/:groupId/settings', [
  param('groupId').isMongoId().withMessage('群组ID格式错误')
], chatController.updateGroupSettings);

/**
 * @route   POST /api/v1/chat/groups/:groupId/members
 * @desc    添加群成员
 * @access  Private
 */
router.post('/groups/:groupId/members', [
  param('groupId').isMongoId().withMessage('群组ID格式错误'),
  body('memberId').isMongoId().withMessage('成员ID格式错误'),
  body('joinMethod').optional().isIn(['invite', 'approval', 'code'])
], chatController.addGroupMember);

/**
 * @route   DELETE /api/v1/chat/groups/:groupId/members/:memberId
 * @desc    移除群成员
 * @access  Private
 */
router.delete('/groups/:groupId/members/:memberId', [
  param('groupId').isMongoId().withMessage('群组ID格式错误'),
  param('memberId').isMongoId().withMessage('成员ID格式错误')
], chatController.removeGroupMember);

/**
 * @route   PUT /api/v1/chat/groups/:groupId/admins/:memberId
 * @desc    设置/取消群管理员
 * @access  Private
 */
router.put('/groups/:groupId/admins/:memberId', [
  param('groupId').isMongoId().withMessage('群组ID格式错误'),
  param('memberId').isMongoId().withMessage('成员ID格式错误'),
  body('isAdmin').isBoolean().withMessage('isAdmin必须是布尔值')
], chatController.setGroupAdmin);

/**
 * @route   PUT /api/v1/chat/groups/:groupId/owner
 * @desc    转让群主
 * @access  Private
 */
router.put('/groups/:groupId/owner', [
  param('groupId').isMongoId().withMessage('群组ID格式错误'),
  body('newOwnerId').isMongoId().withMessage('新群主ID格式错误')
], chatController.transferGroupOwner);

/**
 * @route   PUT /api/v1/chat/groups/:groupId/announcement
 * @desc    更新群公告
 * @access  Private
 */
router.put('/groups/:groupId/announcement', [
  param('groupId').isMongoId().withMessage('群组ID格式错误'),
  body('content').optional().isLength({ max: 1000 }).withMessage('群公告不能超过1000字')
], chatController.updateGroupAnnouncement);

/**
 * @route   POST /api/v1/chat/groups/:groupId/invite-code
 * @desc    生成群邀请码
 * @access  Private
 */
router.post('/groups/:groupId/invite-code', [
  param('groupId').isMongoId().withMessage('群组ID格式错误')
], chatController.generateGroupInviteCode);

/**
 * @route   POST /api/v1/chat/groups/join-by-code
 * @desc    通过邀请码加入群组
 * @access  Private
 */
router.post('/groups/join-by-code', [
  body('inviteCode').notEmpty().withMessage('邀请码不能为空')
], chatController.joinGroupByCode);

/**
 * @route   POST /api/v1/chat/groups/:groupId/leave
 * @desc    退出群组
 * @access  Private
 */
router.post('/groups/:groupId/leave', [
  param('groupId').isMongoId().withMessage('群组ID格式错误')
], chatController.leaveGroup);

/**
 * @route   DELETE /api/v1/chat/groups/:groupId
 * @desc    解散群组
 * @access  Private
 */
router.delete('/groups/:groupId', [
  param('groupId').isMongoId().withMessage('群组ID格式错误')
], chatController.dismissGroup);

/**
 * @route   GET /api/v1/chat/groups
 * @desc    获取用户群组列表
 * @access  Private
 */
router.get('/groups', [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('skip').optional().isInt({ min: 0 })
], chatController.getUserGroups);

/**
 * @route   GET /api/v1/chat/groups/search
 * @desc    搜索群组
 * @access  Private
 */
router.get('/groups/search', [
  query('keyword').notEmpty().withMessage('请输入搜索关键词'),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('skip').optional().isInt({ min: 0 })
], chatController.searchGroups);

/**
 * @route   GET /api/v1/chat/groups/popular
 * @desc    获取热门群组
 * @access  Private
 */
router.get('/groups/popular', [
  query('limit').optional().isInt({ min: 1, max: 50 })
], chatController.getPopularGroups);

/**
 * @route   GET /api/v1/chat/groups/:groupId
 * @desc    获取群详情
 * @access  Private
 */
router.get('/groups/:groupId', [
  param('groupId').isMongoId().withMessage('群组ID格式错误')
], chatController.getGroupDetail);

// ==================== 通话管理 ====================

/**
 * @route   POST /api/v1/chat/calls/initiate
 * @desc    发起通话
 * @access  Private
 */
router.post('/calls/initiate', [
  body('receiverId').isMongoId().withMessage('接收者ID格式错误'),
  body('callType').isIn(['voice', 'video']).withMessage('通话类型无效')
], chatController.initiateCall);

/**
 * @route   POST /api/v1/chat/calls/:messageId/answer
 * @desc    接听通话
 * @access  Private
 */
router.post('/calls/:messageId/answer', [
  param('messageId').isMongoId().withMessage('消息ID格式错误')
], chatController.answerCall);

/**
 * @route   POST /api/v1/chat/calls/:messageId/reject
 * @desc    拒绝通话
 * @access  Private
 */
router.post('/calls/:messageId/reject', [
  param('messageId').isMongoId().withMessage('消息ID格式错误'),
  body('reason').optional()
], chatController.rejectCall);

/**
 * @route   POST /api/v1/chat/calls/:messageId/end
 * @desc    结束通话
 * @access  Private
 */
router.post('/calls/:messageId/end', [
  param('messageId').isMongoId().withMessage('消息ID格式错误')
], chatController.endCall);

module.exports = router;
