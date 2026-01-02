/**
 * 内容审核路由
 * 处理农业知识、朋友圈动态、公告、村务、财务等内容的审核流程
 */

const express = require('express');
const router = express.Router();
const {
  getPendingItems,
  approveContent,
  rejectContent,
  batchReview,
  getReviewStats,
  getReviewHistory
} = require('../controllers/contentReviewController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissionMiddleware');
const rateLimit = require('express-rate-limit');

// 身份验证中间件
router.use(authenticateToken);

// 权限检查辅助函数
function checkPermission(action) {
  return requirePermission('content_review', action, 'any');
}

// 限流配置
const reviewRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个用户最多100个请求
  message: {
    success: false,
    error: '请求过于频繁，请稍后再试'
  }
});

router.use(reviewRateLimit);

/**
 * @route   GET /api/v1/content-review/pending
 * @desc    获取待审核内容列表
 * @access  Private (需要内容审核权限)
 */
router.get('/pending',
  checkPermission('read'),
  getPendingItems
);

/**
 * @route   POST /api/v1/content-review/:type/:id/approve
 * @desc    审核通过内容
 * @access  Private (需要内容审核权限)
 * @param   {string} type - 内容类型 (agriculture|social|announcement|governance|finance)
 * @param   {string} id - 内容ID
 */
router.post('/:type/:id/approve',
  checkPermission('approve'),
  approveContent
);

/**
 * @route   POST /api/v1/content-review/:type/:id/reject
 * @desc    审核拒绝内容
 * @access  Private (需要内容审核权限)
 * @param   {string} type - 内容类型 (agriculture|social|announcement|governance|finance)
 * @param   {string} id - 内容ID
 * @body    {string} reason - 拒绝原因
 */
router.post('/:type/:id/reject',
  checkPermission('approve'),
  rejectContent
);

/**
 * @route   POST /api/v1/content-review/batch
 * @desc    批量审核内容
 * @access  Private (需要内容审核权限)
 * @body    {Array} items - 待审核内容列表 [{ type, id, action, reason }]
 */
router.post('/batch',
  checkPermission('approve'),
  batchReview
);

/**
 * @route   GET /api/v1/content-review/stats
 * @desc    获取审核统计数据
 * @access  Private (需要内容审核权限)
 */
router.get('/stats',
  checkPermission('read'),
  getReviewStats
);

/**
 * @route   GET /api/v1/content-review/history
 * @desc    获取审核历史记录
 * @access  Private (需要内容审核权限)
 */
router.get('/history',
  checkPermission('read'),
  getReviewHistory
);

module.exports = router;
