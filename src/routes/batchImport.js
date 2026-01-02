/**
 * 村民批量导入路由
 */

const express = require('express');
const router = express.Router();
const batchImportController = require('../controllers/batchImportController');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');

/**
 * @route   POST /api/v1/batch-import/residents
 * @desc    批量导入村民数据（前端API调用）
 * @access  Private
 */
router.post('/residents',
  authenticateToken,
  batchImportController.upload,
  asyncHandler(batchImportController.importResidents)
);

/**
 * @route   POST /api/v1/batch-import/upload
 * @desc    上传文件并创建导入任务（旧版兼容）
 * @access  Private
 */
router.post('/upload',
  authenticateToken,
  batchImportController.upload,
  asyncHandler(batchImportController.uploadAndCreateTask)
);

/**
 * @route   GET /api/v1/batch-import/status/:taskId
 * @desc    获取导入任务状态（前端API调用）
 * @access  Private
 */
router.get('/status/:taskId',
  authenticateToken,
  asyncHandler(batchImportController.getTaskStatus)
);

/**
 * @route   GET /api/v1/batch-import/task/:taskId
 * @desc    获取任务状态（旧版兼容）
 * @access  Private
 */
router.get('/task/:taskId',
  authenticateToken,
  asyncHandler(batchImportController.getTaskStatus)
);

/**
 * @route   GET /api/v1/batch-import/history
 * @desc    获取导入历史记录（前端API调用）
 * @access  Private
 */
router.get('/history',
  authenticateToken,
  asyncHandler(batchImportController.getAllTasks)
);

/**
 * @route   GET /api/v1/batch-import/tasks
 * @desc    获取所有任务列表（旧版兼容）
 * @access  Private
 */
router.get('/tasks',
  authenticateToken,
  asyncHandler(batchImportController.getAllTasks)
);

/**
 * @route   POST /api/v1/batch-import/cancel/:taskId
 * @desc    取消导入任务（前端API调用）
 * @access  Private
 */
router.post('/cancel/:taskId',
  authenticateToken,
  asyncHandler(batchImportController.cancelTask)
);

/**
 * @route   POST /api/v1/batch-import/task/:taskId/cancel
 * @desc    取消任务（旧版兼容）
 * @access  Private
 */
router.post('/task/:taskId/cancel',
  authenticateToken,
  asyncHandler(batchImportController.cancelTask)
);

/**
 * @route   GET /api/v1/batch-import/template/:type
 * @desc    下载导入模板（前端API调用）
 * @access  Private
 */
router.get('/template/:type',
  authenticateToken,
  asyncHandler(batchImportController.downloadTemplate)
);

/**
 * @route   GET /api/v1/batch-import/template
 * @desc    下载导入模板（旧版兼容，默认村民模板）
 * @access  Private
 */
router.get('/template',
  authenticateToken,
  asyncHandler(batchImportController.downloadTemplate)
);

/**
 * @route   GET /api/v1/batch-import/report/:taskId
 * @desc    下载导入报告（前端API调用）
 * @access  Private
 */
router.get('/report/:taskId',
  authenticateToken,
  asyncHandler(batchImportController.downloadReport)
);

/**
 * @route   POST /api/v1/batch-import/validate
 * @desc    验证数据格式（前端API调用）
 * @access  Private
 */
router.post('/validate',
  authenticateToken,
  batchImportController.upload,
  asyncHandler(batchImportController.validateData)
);

/**
 * @route   GET /api/v1/batch-import/stats
 * @desc    获取导入统计信息
 * @access  Private
 */
router.get('/stats',
  authenticateToken,
  asyncHandler(batchImportController.getImportStats)
);

module.exports = router;
