/**
 * 朋友圈路由
 * 定义所有朋友圈相关的API端点
 */

const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialController');
const mediaService = require('../services/mediaService');
const { authenticate } = require('../middleware/auth');

// ============== 中间件 ==============

// 认证中间件（所有路由都需要认证）
router.use(authenticate);

// ============== 文件上传 ==============

/**
 * @route   POST /api/v1/social/upload/images
 * @desc    上传图片
 * @access  Private
 */
router.post('/upload/images', mediaService.handleImageUpload.bind(mediaService), (req, res) => {
  res.json({
    success: true,
    data: req.processedFiles,
    message: '图片上传成功'
  });
});

/**
 * @route   POST /api/v1/social/upload/video
 * @desc    上传视频
 * @access  Private
 */
router.post('/upload/video', mediaService.handleVideoUpload.bind(mediaService), (req, res) => {
  res.json({
    success: true,
    data: req.processedFile,
    message: '视频上传成功'
  });
});

// ============== 动态管理 ==============

/**
 * @route   POST /api/v1/social/posts
 * @desc    创建动态
 * @access  Private
 */
router.post('/posts', socialController.createPost);

/**
 * @route   GET /api/v1/social/posts
 * @desc    获取动态列表
 * @query   villageId - 村庄ID
 * @query   userId - 用户ID
 * @query   category - 分类
 * @query   tags - 标签（逗号分隔）
 * @query   topicId - 话题ID
 * @query   visibility - 可见性
 * @query   page - 页码
 * @query   limit - 每页数量
 * @query   sort - 排序方式
 * @access  Private
 */
router.get('/posts', socialController.getPosts);

/**
 * @route   GET /api/v1/social/feed
 * @desc    获取个性化推荐流
 * @access  Private
 */
router.get('/feed', socialController.getPersonalizedFeed);

/**
 * @route   GET /api/v1/social/posts/:id
 * @desc    获取动态详情
 * @access  Private
 */
router.get('/posts/:id', socialController.getPostById);

/**
 * @route   PUT /api/v1/social/posts/:id
 * @desc    更新动态
 * @access  Private (作者或管理员)
 */
router.put('/posts/:id', socialController.updatePost);

/**
 * @route   DELETE /api/v1/social/posts/:id
 * @desc    删除动态
 * @access  Private (作者或管理员)
 */
router.delete('/posts/:id', socialController.deletePost);

// ============== 互动操作 ==============

/**
 * @route   POST /api/v1/social/posts/:id/like
 * @desc    点赞动态
 * @access  Private
 */
router.post('/posts/:id/like', socialController.likePost);

/**
 * @route   DELETE /api/v1/social/posts/:id/like
 * @desc    取消点赞
 * @access  Private
 */
router.delete('/posts/:id/like', socialController.unlikePost);

/**
 * @route   POST /api/v1/social/posts/:id/share
 * @desc    分享动态
 * @access  Private
 */
router.post('/posts/:id/share', socialController.sharePost);

// ============== 评论管理 ==============

/**
 * @route   POST /api/v1/social/posts/:id/comments
 * @desc    添加评论
 * @body    content - 评论内容
 * @body    parentCommentId - 父评论ID（楼中楼）
 * @body    replyToUserId - 回复的用户ID
 * @access  Private
 */
router.post('/posts/:id/comments', socialController.addComment);

/**
 * @route   GET /api/v1/social/posts/:id/comments
 * @desc    获取评论列表
 * @access  Private
 */
router.get('/posts/:id/comments', socialController.getComments);

/**
 * @route   DELETE /api/v1/social/posts/:postId/comments/:commentId
 * @desc    删除评论
 * @access  Private (评论作者或管理员)
 */
router.delete('/posts/:postId/comments/:commentId', socialController.deleteComment);

// ============== 话题管理 ==============

/**
 * @route   GET /api/v1/social/topics/trending
 * @desc    获取热门话题
 * @query   limit - 数量限制
 * @query   villageId - 村庄ID
 * @access  Private
 */
router.get('/topics/trending', socialController.getTrendingTopics);

/**
 * @route   POST /api/v1/social/topics
 * @desc    创建话题
 * @access  Private
 */
router.post('/topics', socialController.createTopic);

// ============== 关注管理 ==============

/**
 * @route   POST /api/v1/social/follow/:userId
 * @desc    关注用户
 * @access  Private
 */
router.post('/follow/:userId', socialController.followUser);

/**
 * @route   DELETE /api/v1/social/follow/:userId
 * @desc    取消关注
 * @access  Private
 */
router.delete('/follow/:userId', socialController.unfollowUser);

/**
 * @route   GET /api/v1/social/:userId/following
 * @desc    获取关注列表
 * @query   list - 分组名称
 * @access  Private
 */
router.get('/:userId/following', socialController.getFollowing);

/**
 * @route   GET /api/v1/social/:userId/followers
 * @desc    获取粉丝列表
 * @access  Private
 */
router.get('/:userId/followers', socialController.getFollowers);

/**
 * @route   GET /api/v1/social/:userId/friends
 * @desc    获取好友列表
 * @access  Private
 */
router.get('/:userId/friends', socialController.getFriends);

module.exports = router;
