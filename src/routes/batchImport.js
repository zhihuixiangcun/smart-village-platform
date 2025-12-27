/**
 * 村民批量导入路由
 */

const express = require('express');
const router = express.Router();
const batchImportController = require('../../controllers/batchImportController');
const { authenticate } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/asyncHandler');

/**
 * @route   POST /api/v1/batch-import/upload
 * @desc    上传文件并创建导入任务
 * @access  Private
 */
router.post('/upload',
  authenticate,
  batchImportController.upload,
  asyncHandler(batchImportController.uploadAndCreateTask)
);

/**
 * @route   GET /api/v1/batch-import/task/:taskId
 * @desc    获取任务状态
 * @access  Private
 */
router.get('/task/:taskId',
  authenticate,
  asyncHandler(batchImportController.getTaskStatus)
);

/**
 * @route   GET /api/v1/batch-import/tasks
 * @desc    获取所有任务列表
 * @access  Private
 */
router.get('/tasks',
  authenticate,
  asyncHandler(batchImportController.getAllTasks)
);

/**
 * @route   POST /api/v1/batch-import/task/:taskId/cancel
 * @desc    取消任务
 * @access  Private
 */
router.post('/task/:taskId/cancel',
  authenticate,
  asyncHandler(batchImportController.cancelTask)
);

/**
 * @route   GET /api/v1/batch-import/template
 * @desc    下载导入模板
 * @access  Private
 */
router.get('/template',
  authenticate,
  batchImportController.downloadTemplate
);

/**
 * @route   GET /api/v1/batch-import/stats
 * @desc    获取导入统计信息
 * @access  Private
 */
router.get('/stats',
  authenticate,
  asyncHandler(batchImportController.getImportStats)
);

module.exports = router;
