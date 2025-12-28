/**
 * 村民变动管理路由
 */

const express = require('express');
const router = express.Router();
const residentChangeController = require('../controllers/residentChangeController');
const { body, param, query } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 配置文件上传
const uploadDir = path.join(__dirname, '../../uploads/proofs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || /application\/pdf/.test(file.mimetype);

    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error('只支持上传图片、PDF或Word文档'));
  }
});

// 验证规则
const createChangeValidation = [
  body('residentId').notEmpty().withMessage('村民ID不能为空'),
  body('changeType').isIn(['farming', 'migrant_work', 'birth', 'death', 'marriage_in', 'marriage_out', 'move_in', 'move_out', 'return', 'other']).withMessage('变动类型无效'),
  body('changeDate').isISO8601().withMessage('变动日期格式错误'),
  body('reason').trim().notEmpty().withMessage('变动原因不能为空').isLength({ max: 500 }).withMessage('变动原因不能超过500字')
];

const changeIdValidation = [
  param('id').isMongoId().withMessage('变动记录ID格式错误')
];

// ==================== 基础 CRUD ====================

/**
 * @route   POST /api/v1/resident-changes
 * @desc    创建村民变动记录
 * @access  Private
 */
router.post('/', createChangeValidation, residentChangeController.createChange);

/**
 * @route   POST /api/v1/resident-changes/batch
 * @desc    批量创建村民变动记录
 * @access  Private
 */
router.post('/batch', residentChangeController.batchCreateChanges);

/**
 * @route   GET /api/v1/resident-changes/config
 * @desc    获取变动类型配置
 * @access  Private
 */
router.get('/config', residentChangeController.getChangeTypeConfig);

/**
 * @route   GET /api/v1/resident-changes/village/:villageId/overview
 * @desc    获取村庄变动概览
 * @access  Private
 */
router.get('/village/:villageId/overview', [
  param('villageId').isMongoId().withMessage('村庄ID格式错误')
], residentChangeController.getVillageOverview);

/**
 * @route   GET /api/v1/resident-changes/village/:villageId/pending
 * @desc    获取待审核变动列表
 * @access  Private
 */
router.get('/village/:villageId/pending', [
  param('villageId').isMongoId().withMessage('村庄ID格式错误'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit必须在1-100之间'),
  query('skip').optional().isInt({ min: 0 }).withMessage('skip不能为负数')
], residentChangeController.getPendingList);

/**
 * @route   GET /api/v1/resident-changes/village/:villageId/statistics
 * @desc    获取变动统计
 * @access  Private
 */
router.get('/village/:villageId/statistics', [
  param('villageId').isMongoId().withMessage('村庄ID格式错误')
], residentChangeController.getStatistics);

/**
 * @route   GET /api/v1/resident-changes/village/:villageId/trends
 * @desc    获取变动趋势
 * @access  Private
 */
router.get('/village/:villageId/trends', [
  param('villageId').isMongoId().withMessage('村庄ID格式错误'),
  query('months').optional().isInt({ min: 1, max: 24 }).withMessage('months必须在1-24之间')
], residentChangeController.getTrends);

/**
 * @route   GET /api/v1/resident-changes/village/:villageId/population-flow
 * @desc    获取人口流动分析
 * @access  Private
 */
router.get('/village/:villageId/population-flow', [
  param('villageId').isMongoId().withMessage('村庄ID格式错误')
], residentChangeController.getPopulationFlow);

/**
 * @route   GET /api/v1/resident-changes/village/:villageId/labor-analysis
 * @desc    获取劳动力分析
 * @access  Private
 */
router.get('/village/:villageId/labor-analysis', [
  param('villageId').isMongoId().withMessage('村庄ID格式错误')
], residentChangeController.getLaborAnalysis);

/**
 * @route   GET /api/v1/resident-changes/village/:villageId/alerts
 * @desc    获取预警信息
 * @access  Private
 */
router.get('/village/:villageId/alerts', [
  param('villageId').isMongoId().withMessage('村庄ID格式错误')
], residentChangeController.getAlerts);

/**
 * @route   GET /api/v1/resident-changes/village/:villageId/search
 * @desc    搜索变动记录
 * @access  Private
 */
router.get('/village/:villageId/search', [
  param('villageId').isMongoId().withMessage('村庄ID格式错误'),
  query('page').optional().isInt({ min: 1 }).withMessage('page必须大于0'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit必须在1-100之间')
], residentChangeController.searchChanges);

/**
 * @route   GET /api/v1/resident-changes/village/:villageId/export
 * @desc    导出变动记录
 * @access  Private
 */
router.get('/village/:villageId/export', [
  param('villageId').isMongoId().withMessage('村庄ID格式错误')
], residentChangeController.exportChanges);

// ==================== 村民相关 ====================

/**
 * @route   GET /api/v1/resident-changes/resident/:residentId/history
 * @desc    获取村民变动历史
 * @access  Private
 */
router.get('/resident/:residentId/history', [
  param('residentId').isMongoId().withMessage('村民ID格式错误'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit必须在1-100之间'),
  query('skip').optional().isInt({ min: 0 }).withMessage('skip不能为负数')
], residentChangeController.getResidentHistory);

// ==================== 变动记录操作 ====================

/**
 * @route   GET /api/v1/resident-changes/:id
 * @desc    获取变动记录详情
 * @access  Private
 */
router.get('/:id', changeIdValidation, residentChangeController.getChangeDetail);

/**
 * @route   PUT /api/v1/resident-changes/:id/approve
 * @desc    审批通过变动记录
 * @access  Private
 */
router.put('/:id/approve', changeIdValidation, residentChangeController.approveChange);

/**
 * @route   PUT /api/v1/resident-changes/:id/reject
 * @desc    拒绝变动记录
 * @access  Private
 */
router.put('/:id/reject', [
  ...changeIdValidation,
  body('reason').trim().notEmpty().withMessage('请填写拒绝原因')
], residentChangeController.rejectChange);

/**
 * @route   PUT /api/v1/resident-changes/:id/cancel
 * @desc    取消变动记录
 * @access  Private
 */
router.put('/:id/cancel', changeIdValidation, residentChangeController.cancelChange);

// ==================== 批量操作 ====================

/**
 * @route   POST /api/v1/resident-changes/batch/approve
 * @desc    批量审批通过
 * @access  Private
 */
router.post('/batch/approve', [
  body('ids').isArray({ min: 1 }).withMessage('请选择要审批的记录'),
  body('ids.*').isMongoId().withMessage('ID格式错误')
], residentChangeController.batchApprove);

/**
 * @route   POST /api/v1/resident-changes/batch/reject
 * @desc    批量拒绝
 * @access  Private
 */
router.post('/batch/reject', [
  body('ids').isArray({ min: 1 }).withMessage('请选择要拒绝的记录'),
  body('ids.*').isMongoId().withMessage('ID格式错误'),
  body('reason').trim().notEmpty().withMessage('请填写拒绝原因')
], residentChangeController.batchReject);

// ==================== 文件上传 ====================

/**
 * @route   POST /api/v1/resident-changes/upload-proof
 * @desc    上传证明材料
 * @access  Private
 */
router.post('/upload-proof', upload.single('file'), residentChangeController.uploadProofFile);

// ==================== 错误处理 ====================

// 验证错误处理中间件
router.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: '参数验证失败',
      errors: err.errors
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: '文件大小超过限制（最大10MB）'
    });
  }

  if (err.message === '只支持上传图片、PDF或Word文档') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  next(err);
});

module.exports = router;
