const express = require('express');
const { body, param, query } = require('express-validator');
const ocrController = require('../controllers/ocrController');
const logger = require('../utils/logger');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/apiValidation');
const router = express.Router();

// 单文件上传中间件
const upload = ocrController.upload;
// 多文件上传中间件
const uploadMultiple = ocrController.upload.array('files', 50);

/**
 * @route   POST /api/v1/ocr/invoice
 * @desc    单张发票识别
 * @access  Private
 */
router.post('/invoice',
  authenticate,
  upload.single('image'),
  [
    body('invoiceType')
      .optional()
      .isIn(['auto', 'vat', 'receipt', 'electronic'])
      .withMessage('发票类型无效'),
    body('provider')
      .optional()
      .isIn(['auto', 'baidu', 'tencent', 'ali', 'tesseract'])
      .withMessage('OCR提供商无效'),
    body('enablePreprocessing')
      .optional()
      .isBoolean()
      .withMessage('预处理选项必须是布尔值'),
    body('enableValidation')
      .optional()
      .isBoolean()
      .withMessage('验证选项必须是布尔值'),
    body('enableClassification')
      .optional()
      .isBoolean()
      .withMessage('分类选项必须是布尔值')
  ],
  validateRequest,
  ocrController.recognizeInvoice
);

/**
 * @route   POST /api/v1/ocr/batch
 * @desc    批量发票识别（同步）
 * @access  Private
 */
router.post('/batch',
  authenticate,
  authorize(['admin', 'finance_manager']),
  uploadMultiple,
  [
    body('maxConcurrency')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('并发数必须在1-20之间'),
    body('enableParallel')
      .optional()
      .isBoolean()
      .withMessage('并行处理选项必须是布尔值'),
    body('skipDuplicates')
      .optional()
      .isBoolean()
      .withMessage('去重选项必须是布尔值')
  ],
  validateRequest,
  ocrController.batchRecognize
);

/**
 * @route   POST /api/v1/ocr/batch-job
 * @desc    提交批量处理任务（异步）
 * @access  Private
 */
router.post('/batch-job',
  authenticate,
  authorize(['admin', 'finance_manager']),
  uploadMultiple,
  [
    body('ocrProvider')
      .optional()
      .isIn(['auto', 'baidu', 'tencent', 'ali', 'tesseract'])
      .withMessage('OCR提供商无效'),
    body('enablePreprocessing')
      .optional()
      .isBoolean()
      .withMessage('预处理选项必须是布尔值'),
    body('enableValidation')
      .optional()
      .isBoolean()
      .withMessage('验证选项必须是布尔值'),
    body('enableClassification')
      .optional()
      .isBoolean()
      .withMessage('分类选项必须是布尔值'),
    body('enableRiskAssessment')
      .optional()
      .isBoolean()
      .withMessage('风险评估选项必须是布尔值'),
    body('outputFormat')
      .optional()
      .isIn(['json', 'xml', 'csv'])
      .withMessage('输出格式无效'),
    body('includeImages')
      .optional()
      .isBoolean()
      .withMessage('包含图片选项必须是布尔值'),
    body('includeMetadata')
      .optional()
      .isBoolean()
      .withMessage('包含元数据选项必须是布尔值'),
    body('maxRetries')
      .optional()
      .isInt({ min: 0, max: 10 })
      .withMessage('重试次数必须在0-10之间'),
    body('retryDelay')
      .optional()
      .isInt({ min: 100, max: 30000 })
      .withMessage('重试延迟必须在100-30000ms之间')
  ],
  validateRequest,
  ocrController.submitBatchJob
);

/**
 * @route   GET /api/v1/ocr/batch/:batchId/status
 * @desc    获取批量任务状态
 * @access  Private
 */
router.get('/batch/:batchId/status',
  authenticate,
  [
    param('batchId')
      .notEmpty()
      .withMessage('批次ID不能为空')
      .isLength({ min: 10, max: 100 })
      .withMessage('批次ID长度必须在10-100之间')
  ],
  validateRequest,
  ocrController.getBatchStatus
);

/**
 * @route   DELETE /api/v1/ocr/batch/:batchId
 * @desc    取消批量任务
 * @access  Private
 */
router.delete('/batch/:batchId',
  authenticate,
  authorize(['admin', 'finance_manager']),
  [
    param('batchId')
      .notEmpty()
      .withMessage('批次ID不能为空')
      .isLength({ min: 10, max: 100 })
      .withMessage('批次ID长度必须在10-100之间')
  ],
  validateRequest,
  ocrController.cancelBatch
);

/**
 * @route   POST /api/v1/ocr/classify
 * @desc    财务凭证分类
 * @access  Private
 */
router.post('/classify',
  authenticate,
  upload.single('document'),
  [
    body('documentType')
      .optional()
      .isIn(['auto', 'invoice', 'receipt', 'contract', 'bank_statement'])
      .withMessage('文档类型无效'),
    body('category')
      .optional()
      .isIn(['auto', 'income', 'expense', 'asset', 'liability'])
      .withMessage('分类类型无效'),
    body('enableDetailAnalysis')
      .optional()
      .isBoolean()
      .withMessage('详细分析选项必须是布尔值')
  ],
  validateRequest,
  ocrController.classifyDocument
);

/**
 * @route   GET /api/v1/ocr/status
 * @desc    获取OCR服务状态
 * @access  Private
 */
router.get('/status',
  authenticate,
  ocrController.getServiceStatus
);

/**
 * @route   GET /api/v1/ocr/statistics
 * @desc    获取处理统计信息
 * @access  Private
 */
router.get('/statistics',
  authenticate,
  authorize(['admin', 'finance_manager']),
  [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('开始日期格式无效'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('结束日期格式无效')
  ],
  validateRequest,
  ocrController.getStatistics
);

// WebSocket事件处理（用于实时进度更新）
router.on('connection', (socket) => {
  logger.debug('OCR WebSocket连接建立:', socket.id);
  // 加入用户房间
  socket.on('join', (userId) => {
    socket.join(userId);
    logger.debug(`用户 ${userId} 加入OCR房间`);
  });

  // 监听进度查询
  socket.on('get_progress', (batchId) => {
    // 获取批量处理进度并发送
    batchDocumentProcessor.getBatchStatus(batchId)
      .then(status => {
        socket.emit('progress_update', status);
      })
      .catch(error => {
        socket.emit('error', { message: error.message });
      });
  });

  socket.on('disconnect', () => {
    logger.debug('OCR WebSocket连接断开:', socket.id);
  });
});

module.exports = router;