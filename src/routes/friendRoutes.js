/**
 * Friend Routes
 * 好友关系路由
 */

const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const mediaService = require('../services/mediaService');

// 配置头像上传中间件
const avatarUpload = mediaService.configureMulter('image').single('avatar');

// 所有好友路由需要认证
router.use(authenticate);

/**
 * @route   GET /api/v1/friends/search/phone/:phone
 * @desc    通过手机号搜索用户
 * @access  Private
 */
router.get('/search/phone/:phone',
  asyncHandler(friendController.searchByPhone)
);

/**
 * @route   GET /api/v1/friends/search/qrcode/:qrcode
 * @desc    通过乡村号/二维码搜索用户
 * @access  Private
 */
router.get('/search/qrcode/:qrcode',
  asyncHandler(friendController.searchByQRCode)
);

/**
 * @route   POST /api/v1/friends/requests
 * @desc    发送好友请求
 * @access  Private
 */
router.post('/requests',
  asyncHandler(friendController.sendFriendRequest)
);

/**
 * @route   GET /api/v1/friends/requests/pending
 * @desc    获取收到的好友请求列表
 * @access  Private
 */
router.get('/requests/pending',
  asyncHandler(friendController.getPendingRequests)
);

/**
 * @route   GET /api/v1/friends/requests/sent
 * @desc    获取发送的好友请求列表
 * @access  Private
 */
router.get('/requests/sent',
  asyncHandler(friendController.getSentRequests)
);

/**
 * @route   PUT /api/v1/friends/requests/:id/accept
 * @desc    接受好友请求
 * @access  Private
 */
router.put('/requests/:id/accept',
  asyncHandler(friendController.acceptFriendRequest)
);

/**
 * @route   PUT /api/v1/friends/requests/:id/decline
 * @desc    拒绝好友请求
 * @access  Private
 */
router.put('/requests/:id/decline',
  asyncHandler(friendController.declineFriendRequest)
);

/**
 * @route   GET /api/v1/friends
 * @desc    获取好友列表
 * @access  Private
 */
router.get('/',
  asyncHandler(friendController.getFriends)
);

/**
 * @route   GET /api/v1/friends/stats
 * @desc    获取好友统计信息
 * @access  Private
 */
router.get('/stats',
  asyncHandler(friendController.getFriendStats)
);

/**
 * @route   PUT /api/v1/friends/:friendId/alias
 * @desc    修改好友备注
 * @access  Private
 */
router.put('/:friendId/alias',
  asyncHandler(friendController.updateFriendAlias)
);

/**
 * @route   POST /api/v1/friends/avatar
 * @desc    上传用户头像
 * @access  Private
 */
router.post('/avatar',
  asyncHandler(friendController.uploadAvatar)
);

/**
 * @route   DELETE /api/v1/friends/:friendId
 * @desc    删除好友
 * @access  Private
 */
router.delete('/:friendId',
  asyncHandler(friendController.deleteFriend)
);

module.exports = router;
