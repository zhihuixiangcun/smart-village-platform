/**
 * 缴费管理系统API路由
 * 处理医疗保险、养老保险、水电费、物业费等便民缴费功能的RESTful接口
 */

const express = require('express');
const router = express.Router();
const paymentManagementController = require('../controllers/paymentManagementController');
const { authenticate } = require('../middleware/auth');
const { body, param } = require('express-validator');

// 验证中间件
const validate = (req, res, next) => {
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

// ==================== 账单管理 ====================

/**
 * @route   POST /api/v1/villages/:villageId/bills
 * @desc    生成账单
 * @access  Private
 */
router.post(
  '/villages/:villageId/bills',
  authenticate,
  param('villageId').isMongoId().withMessage('villageId无效'),
  body('payerId').isMongoId().withMessage('payerId无效'),
  body('billInfo.category').isIn(['insurance', 'utilities', 'property', 'communication', 'government', 'education', 'other']).withMessage('category无效'),
  body('billInfo.type').notEmpty().withMessage('type不能为空'),
  validate,
  paymentManagementController.createBill
);

/**
 * @route   GET /api/v1/villages/:villageId/bills
 * @desc    获取账单列表
 * @access  Private
 */
router.get(
  '/villages/:villageId/bills',
  authenticate,
  param('villageId').isMongoId().withMessage('villageId无效'),
  validate,
  paymentManagementController.getBills
);

/**
 * @route   GET /api/v1/bills/:billId
 * @desc    获取账单详情
 * @access  Private
 */
router.get(
  '/bills/:billId',
  authenticate,
  param('billId').isMongoId().withMessage('billId无效'),
  validate,
  paymentManagementController.getBillDetail
);

/**
 * @route   POST /api/v1/bills/:billId/pay
 * @desc    支付账单
 * @access  Private
 */
router.post(
  '/bills/:billId/pay',
  authenticate,
  param('billId').isMongoId().withMessage('billId无效'),
  body('amount').isNumeric().withMessage('amount必须是数字'),
  body('method').isIn(['wechat', 'alipay', 'bank', 'cash', 'pos', 'auto_debit', 'other']).withMessage('method无效'),
  validate,
  paymentManagementController.payBill
);

/**
 * @route   POST /api/v1/bill-templates/:templateId/generate
 * @desc    批量生成账单（从模板）
 * @access  Private
 */
router.post(
  '/bill-templates/:templateId/generate',
  authenticate,
  param('templateId').isMongoId().withMessage('templateId无效'),
  body('startDate').isISO8601().withMessage('startDate格式无效'),
  body('endDate').isISO8601().withMessage('endDate格式无效'),
  body('dueDate').isISO8601().withMessage('dueDate格式无效'),
  validate,
  paymentManagementController.generateBillsFromTemplate
);

// ==================== 水电抄表 ====================

/**
 * @route   POST /api/v1/meter-readings
 * @desc    创建抄表记录
 * @access  Private
 */
router.post(
  '/meter-readings',
  authenticate,
  body('residentId').isMongoId().withMessage('residentId无效'),
  body('villageId').isMongoId().withMessage('villageId无效'),
  body('meterInfo.type').isIn(['water', 'electricity', 'gas']).withMessage('type无效'),
  body('meterInfo.meterNumber').notEmpty().withMessage('meterNumber不能为空'),
  body('reading.currentReading').isNumeric().withMessage('currentReading必须是数字'),
  validate,
  paymentManagementController.createMeterReading
);

/**
 * @route   POST /api/v1/meter-readings/:readingId/confirm
 * @desc    确认抄表记录
 * @access  Private
 */
router.post(
  '/meter-readings/:readingId/confirm',
  authenticate,
  param('readingId').isMongoId().withMessage('readingId无效'),
  validate,
  paymentManagementController.confirmMeterReading
);

// ==================== 代缴配置 ====================

/**
 * @route   GET /api/v1/payers/:payerId/auto-payment-config
 * @desc    获取代缴配置
 * @access  Private
 */
router.get(
  '/payers/:payerId/auto-payment-config',
  authenticate,
  param('payerId').isMongoId().withMessage('payerId无效'),
  validate,
  paymentManagementController.getAutoPaymentConfig
);

/**
 * @route   PUT /api/v1/payers/:payerId/auto-payment-config
 * @desc    更新代缴配置
 * @access  Private
 */
router.put(
  '/payers/:payerId/auto-payment-config',
  authenticate,
  param('payerId').isMongoId().withMessage('payerId无效'),
  validate,
  paymentManagementController.updateAutoPaymentConfig
);

/**
 * @route   POST /api/v1/payers/:payerId/bind-account
 * @desc    绑定支付账户
 * @access  Private
 */
router.post(
  '/payers/:payerId/bind-account',
  authenticate,
  param('payerId').isMongoId().withMessage('payerId无效'),
  body('accountType').isIn(['wechat', 'alipay', 'bank']).withMessage('accountType无效'),
  validate,
  paymentManagementController.bindPaymentAccount
);

// ==================== 支付记录 ====================

/**
 * @route   GET /api/v1/villages/:villageId/payment-records
 * @desc    获取支付记录列表
 * @access  Private
 */
router.get(
  '/villages/:villageId/payment-records',
  authenticate,
  param('villageId').isMongoId().withMessage('villageId无效'),
  validate,
  paymentManagementController.getPaymentRecords
);

/**
 * @route   POST /api/v1/payment-records/:paymentId/refund
 * @desc    申请退款
 * @access  Private
 */
router.post(
  '/payment-records/:paymentId/refund',
  authenticate,
  param('paymentId').isMongoId().withMessage('paymentId无效'),
  body('amount').isNumeric().withMessage('amount必须是数字'),
  body('reason').notEmpty().withMessage('reason不能为空'),
  validate,
  paymentManagementController.requestRefund
);

// ==================== 账单模板 ====================

/**
 * @route   GET /api/v1/villages/:villageId/bill-templates
 * @desc    获取账单模板列表
 * @access  Private
 */
router.get(
  '/villages/:villageId/bill-templates',
  authenticate,
  param('villageId').isMongoId().withMessage('villageId无效'),
  validate,
  paymentManagementController.getBillTemplates
);

/**
 * @route   POST /api/v1/bill-templates
 * @desc    创建账单模板
 * @access  Private
 */
router.post(
  '/bill-templates',
  authenticate,
  body('villageId').isMongoId().withMessage('villageId无效'),
  body('templateCode').notEmpty().withMessage('templateCode不能为空'),
  body('templateInfo.name').notEmpty().withMessage('模板名称不能为空'),
  body('templateInfo.category').isIn(['insurance', 'utilities', 'property', 'communication', 'government', 'education', 'other']).withMessage('category无效'),
  body('templateInfo.type').notEmpty().withMessage('type不能为空'),
  validate,
  paymentManagementController.createBillTemplate
);

// ==================== 统计信息 ====================

/**
 * @route   GET /api/v1/villages/:villageId/payment-statistics
 * @desc    获取缴费统计
 * @access  Private
 */
router.get(
  '/villages/:villageId/payment-statistics',
  authenticate,
  param('villageId').isMongoId().withMessage('villageId无效'),
  validate,
  paymentManagementController.getPaymentStatistics
);

/**
 * @route   GET /api/v1/payers/:payerId/payment-summary
 * @desc    获取用户缴费概况
 * @access  Private
 */
router.get(
  '/payers/:payerId/payment-summary',
  authenticate,
  param('payerId').isMongoId().withMessage('payerId无效'),
  validate,
  paymentManagementController.getUserPaymentSummary
);

module.exports = router;
