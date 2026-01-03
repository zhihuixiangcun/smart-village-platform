/**
 * 农业知识分享路由
 *
 * 功能：
 * - 农业技术教程发布与浏览
 * - 专家认证与推荐
 * - 搜索与标签云
 * - 统计分析
 */

const express = require('express');
const router = express.Router();
const agricultureController = require('../controllers/agricultureController');
const auth = require('../middleware/auth');
const { body, param, query } = require('express-validator');

// 验证中间件
const handleValidationErrors = (req, res, next) => {
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

// ==================== 帖子管理 ====================

/**
 * @route   POST /api/v1/agriculture/posts
 * @desc    创建农业知识帖子
 * @access  Private
 */
router.post('/posts',
  auth.authenticate,
  [
    body('title').trim().notEmpty().withMessage('标题不能为空'),
    body('villageId').isMongoId().withMessage('村庄ID格式不正确'),
    body('category').isIn([
      'crop_farming', 'vegetable', 'fruit', 'livestock',
      'pest_control', 'fertilizer', 'irrigation', 'machinery',
      'processing', 'market_info', 'policy'
    ]).withMessage('分类不正确'),
    body('content.text').trim().notEmpty().withMessage('内容不能为空'),
    body('postType').optional().isIn(['article', 'video', 'image', 'qa', 'tutorial']),
    body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced'])
  ],
  handleValidationErrors,
  agricultureController.createPost
);

/**
 * @route   PUT /api/v1/agriculture/posts/:id/publish
 * @desc    发布帖子
 * @access  Private
 */
router.put('/posts/:id/publish',
  auth.authenticate,
  [
    param('id').isMongoId().withMessage('帖子ID格式不正确')
  ],
  handleValidationErrors,
  agricultureController.publishPost
);

/**
 * @route   GET /api/v1/agriculture/posts
 * @desc    获取帖子列表
 * @access  Public
 */
router.get('/posts',
  [
    query('villageId').optional().isMongoId(),
    query('category').optional(),
    query('cropType').optional(),
    query('season').optional().isIn(['spring', 'summer', 'autumn', 'winter', 'all_season']),
    query('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
    query('expertVerified').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sort').optional()
  ],
  handleValidationErrors,
  agricultureController.getPosts
);

/**
 * @route   GET /api/v1/agriculture/posts/:id
 * @desc    获取帖子详情
 * @access  Public
 */
router.get('/posts/:id',
  [
    param('id').isMongoId().withMessage('帖子ID格式不正确')
  ],
  handleValidationErrors,
  agricultureController.getPostById
);

/**
 * @route   PUT /api/v1/agriculture/posts/:id
 * @desc    更新帖子
 * @access  Private
 */
router.put('/posts/:id',
  auth.authenticate,
  [
    param('id').isMongoId().withMessage('帖子ID格式不正确')
  ],
  handleValidationErrors,
  agricultureController.updatePost
);

/**
 * @route   DELETE /api/v1/agriculture/posts/:id
 * @desc    删除帖子
 * @access  Private
 */
router.delete('/posts/:id',
  auth.authenticate,
  [
    param('id').isMongoId().withMessage('帖子ID格式不正确')
  ],
  handleValidationErrors,
  agricultureController.deletePost
);

// ==================== 互动功能 ====================

/**
 * @route   POST /api/v1/agriculture/posts/:id/like
 * @desc    点赞帖子
 * @access  Private
 */
router.post('/posts/:id/like',
  auth.authenticate,
  [
    param('id').isMongoId().withMessage('帖子ID格式不正确')
  ],
  handleValidationErrors,
  agricultureController.likePost
);

/**
 * @route   POST /api/v1/agriculture/posts/:id/useful
 * @desc    标记有用
 * @access  Private
 */
router.post('/posts/:id/useful',
  auth.authenticate,
  [
    param('id').isMongoId().withMessage('帖子ID格式不正确'),
    body('useful').optional().isBoolean()
  ],
  handleValidationErrors,
  agricultureController.markUseful
);

// ==================== 专家认证 ====================

/**
 * @route   POST /api/v1/agriculture/posts/:id/verify
 * @desc    专家认证帖子
 * @access  Private (Expert only)
 */
router.post('/posts/:id/verify',
  auth.authenticate,
  [
    param('id').isMongoId().withMessage('帖子ID格式不正确'),
    body('comments').optional().trim()
  ],
  handleValidationErrors,
  agricultureController.verifyPost
);

// ==================== 发现与推荐 ====================

/**
 * @route   GET /api/v1/agriculture/popular
 * @desc    获取热门帖子
 * @access  Public
 */
router.get('/popular',
  [
    query('villageId').isMongoId().withMessage('村庄ID格式不正确'),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  handleValidationErrors,
  agricultureController.getPopularPosts
);

/**
 * @route   GET /api/v1/agriculture/expert-verified
 * @desc    获取专家认证帖子
 * @access  Public
 */
router.get('/expert-verified',
  [
    query('villageId').isMongoId().withMessage('村庄ID格式不正确'),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  handleValidationErrors,
  agricultureController.getExpertVerifiedPosts
);

/**
 * @route   GET /api/v1/agriculture/search
 * @desc    搜索帖子
 * @access  Public
 */
router.get('/search',
  [
    query('villageId').isMongoId().withMessage('村庄ID格式不正确'),
    query('keyword').trim().notEmpty().withMessage('搜索关键词不能为空'),
    query('category').optional(),
    query('cropType').optional(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  handleValidationErrors,
  agricultureController.searchPosts
);

/**
 * @route   GET /api/v1/agriculture/tags
 * @desc    获取标签云
 * @access  Public
 */
router.get('/tags',
  [
    query('villageId').isMongoId().withMessage('村庄ID格式不正确'),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  handleValidationErrors,
  agricultureController.getTagCloud
);

/**
 * @route   GET /api/v1/agriculture/statistics
 * @desc    获取统计数据
 * @access  Private
 */
router.get('/statistics',
  auth.authenticate,
  [
    query('villageId').isMongoId().withMessage('村庄ID格式不正确')
  ],
  handleValidationErrors,
  agricultureController.getStatistics
);

module.exports = router;
