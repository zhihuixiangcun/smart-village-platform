/**
 * 村委工作文档路由
 *
 * 功能：
 * - 文档上传（单个/批量）
 * - 文档查询（列表/详情/搜索）
 * - 文档更新/删除
 * - 文档下载
 * - 操作历史查询
 * - 统计数据获取
 *
 * @author Smart Village Platform
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const CommitteeDocumentController = require('../controllers/committeeDocumentController');
const auth = require('../middleware/auth');
const { param, query } = require('express-validator');
const rateLimit = require('express-rate-limit');

// 限流配置
const uploadLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 50, // 最多50次上传
  message: {
    success: false,
    message: '上传次数过多，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const downloadLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 100, // 最多100次下载
  message: {
    success: false,
    message: '下载次数过多，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const searchLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 30, // 最多30次搜索
  message: {
    success: false,
    message: '搜索次数过多，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

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

// ==================== 文档上传 ====================

/**
 * @route   POST /api/v1/committee-documents/upload
 * @desc    上传单个文档
 * @access  Private (村委成员及以上)
 */
router.post('/upload',
  auth.authenticate,
  uploadLimit,
  CommitteeDocumentController.uploadDocument
);

/**
 * @route   POST /api/v1/committee-documents/upload/batch
 * @desc    批量上传文档
 * @access  Private (村委成员及以上)
 */
router.post('/upload/batch',
  auth.authenticate,
  uploadLimit,
  CommitteeDocumentController.batchUploadDocuments
);

// ==================== 文档查询 ====================

/**
 * @route   GET /api/v1/committee-documents
 * @desc    获取文档列表（支持搜索和筛选）
 * @access  Private (村委成员及以上)
 */
router.get('/',
  auth.authenticate,
  [
    query('villageId').optional().isMongoId().withMessage('村庄ID格式不正确'),
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    handleValidationErrors
  ],
  CommitteeDocumentController.getDocumentList
);

/**
 * @route   GET /api/v1/committee-documents/search/fulltext
 * @desc    全文搜索文档
 * @access  Private (村委成员及以上)
 */
router.get('/search/fulltext',
  auth.authenticate,
  searchLimit,
  [
    query('villageId').notEmpty().withMessage('村庄ID不能为空'),
    query('q').notEmpty().withMessage('搜索关键词不能为空'),
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    handleValidationErrors
  ],
  CommitteeDocumentController.fullTextSearch
);

/**
 * @route   POST /api/v1/committee-documents/search/advanced
 * @desc    高级搜索文档（多条件筛选）
 * @access  Private (村委成员及以上)
 */
router.post('/search/advanced',
  auth.authenticate,
  searchLimit,
  CommitteeDocumentController.advancedSearch
);

// ==================== 文档详情 ====================

/**
 * @route   GET /api/v1/committee-documents/:id
 * @desc    获取文档详情
 * @access  Private (村委成员及以上)
 */
router.get('/:id',
  auth.authenticate,
  [
    param('id').isMongoId().withMessage('文档ID格式不正确'),
    handleValidationErrors
  ],
  CommitteeDocumentController.getDocumentById
);

/**
 * @route   GET /api/v1/committee-documents/:id/history
 * @desc    获取文档操作历史
 * @access  Private (村委成员及以上)
 */
router.get('/:id/history',
  auth.authenticate,
  [
    param('id').isMongoId().withMessage('文档ID格式不正确'),
    handleValidationErrors
  ],
  CommitteeDocumentController.getDocumentHistory
);

/**
 * @route   GET /api/v1/committee-documents/:id/download
 * @desc    下载文档
 * @access  Private (村委成员及以上)
 */
router.get('/:id/download',
  auth.authenticate,
  downloadLimit,
  [
    param('id').isMongoId().withMessage('文档ID格式不正确'),
    handleValidationErrors
  ],
  CommitteeDocumentController.downloadDocument
);

// ==================== 文档操作 ====================

/**
 * @route   PUT /api/v1/committee-documents/:id
 * @desc    更新文档
 * @access  Private (创建者或村支书/村主任)
 */
router.put('/:id',
  auth.authenticate,
  [
    param('id').isMongoId().withMessage('文档ID格式不正确'),
    handleValidationErrors
  ],
  CommitteeDocumentController.updateDocument
);

/**
 * @route   DELETE /api/v1/committee-documents/:id
 * @desc    删除文档
 * @access  Private (创建者或村支书)
 */
router.delete('/:id',
  auth.authenticate,
  [
    param('id').isMongoId().withMessage('文档ID格式不正确'),
    handleValidationErrors
  ],
  CommitteeDocumentController.deleteDocument
);

/**
 * @route   POST /api/v1/committee-documents/:id/archive
 * @desc    归档文档
 * @access  Private (村支书/村主任)
 */
router.post('/:id/archive',
  auth.authenticate,
  [
    param('id').isMongoId().withMessage('文档ID格式不正确'),
    handleValidationErrors
  ],
  CommitteeDocumentController.archiveDocument
);

// ==================== 统计数据 ====================

/**
 * @route   GET /api/v1/committee-documents/stats/summary
 * @desc    获取文档统计概览
 * @access  Private (村委成员及以上)
 */
router.get('/stats/summary',
  auth.authenticate,
  [
    query('villageId').notEmpty().withMessage('村庄ID不能为空'),
    handleValidationErrors
  ],
  CommitteeDocumentController.getStatistics
);

/**
 * @route   GET /api/v1/committee-documents/tags/popular
 * @desc    获取热门标签
 * @access  Private (村委成员及以上)
 */
router.get('/tags/popular',
  auth.authenticate,
  [
    query('villageId').notEmpty().withMessage('村庄ID不能为空'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('数量必须在1-100之间'),
    handleValidationErrors
  ],
  CommitteeDocumentController.getPopularTags
);

// ==================== 元数据接口 ====================

/**
 * @route   GET /api/v1/committee-documents/meta/categories
 * @desc    获取文档分类枚举
 * @access  Private
 */
router.get('/meta/categories',
  auth.authenticate,
  CommitteeDocumentController.getDocumentCategories
);

/**
 * @route   GET /api/v1/committee-documents/meta/status
 * @desc    获取文档状态枚举
 * @access  Private
 */
router.get('/meta/status',
  auth.authenticate,
  CommitteeDocumentController.getDocumentStatus
);

module.exports = router;
