const express = require('express');
const { body, param, query } = require('express-validator');
const policyCalculatorController = require('../controllers/policyCalculatorController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/apiValidation');
const router = express.Router();

// 验证中间件
const createPolicyCalculatorValidation = [
  body('name').notEmpty().withMessage('政策名称不能为空'),
  body('description').optional().isString(),
  body('policyType').isIn(['subsidy', 'benefit', 'allowance', 'compensation', 'tax_relief'])
    .withMessage('政策类型无效'),
  body('villageId').isMongoId().withMessage('村庄ID格式无效'),
  body('targetGroup').isArray().withMessage('目标群体必须是数组'),
  body('eligibilityCriteria.minAge').optional().isInt({ min: 0, max: 150 }),
  body('eligibilityCriteria.maxAge').optional().isInt({ min: 0, max: 150 }),
  body('calculationRules.baseAmount').optional().isFloat({ min: 0 }),
  body('calculationRules.calculationType').isIn(['fixed', 'percentage', 'tiered', 'formula'])
    .withMessage('计算类型无效')
];

const updatePolicyCalculatorValidation = [
  param('id').isMongoId().withMessage('计算器ID格式无效'),
  body('name').optional().notEmpty().withMessage('政策名称不能为空'),
  body('policyType').optional().isIn(['subsidy', 'benefit', 'allowance', 'compensation', 'tax_relief']),
  body('eligibilityCriteria.minAge').optional().isInt({ min: 0, max: 150 }),
  body('eligibilityCriteria.maxAge').optional().isInt({ min: 0, max: 150 }),
  body('calculationRules.baseAmount').optional().isFloat({ min: 0 })
];

const calculateSubsidyValidation = [
  param('id').isMongoId().withMessage('计算器ID格式无效'),
  body('applicantInfo.name').notEmpty().withMessage('申请人姓名不能为空'),
  body('applicantInfo.idNumber').isLength({ min: 15, max: 18 })
    .withMessage('身份证号格式无效'),
  body('householdInfo.registeredHouseholdSize').optional().isInt({ min: 0 }),
  body('landInfo.totalLandArea').optional().isFloat({ min: 0 })
];

const batchCalculateValidation = [
  param('id').isMongoId().withMessage('计算器ID格式无效'),
  body('applicationsData').isArray({ min: 1 }).withMessage('申请数据不能为空')
];

const createApplicationValidation = [
  body('villageId').isMongoId().withMessage('村庄ID格式无效'),
  body('calculatorId').isMongoId().withMessage('计算器ID格式无效'),
  body('applicantId').isMongoId().withMessage('申请人ID格式无效'),
  body('applicantInfo.name').notEmpty().withMessage('申请人姓名不能为空'),
  body('applicantInfo.idNumber').isLength({ min: 15, max: 18 })
    .withMessage('身份证号格式无效')
];

const reviewApplicationValidation = [
  param('id').isMongoId().withMessage('申请ID格式无效'),
  body('reviewDecision').isIn(['approve', 'request_changes', 'reject', 'requires_further_review'])
    .withMessage('审核决定无效'),
  body('reviewComments').optional().isString()
];

const processPaymentValidation = [
  param('id').isMongoId().withMessage('申请ID格式无效'),
  body('paymentId').notEmpty().withMessage('支付ID不能为空'),
  body('paymentAmount').isFloat({ min: 0 }).withMessage('支付金额必须大于等于0'),
  body('paymentMethod').isIn(['bank_transfer', 'cash', 'check', 'mobile_payment'])
    .withMessage('支付方式无效')
];

const sendNotificationValidation = [
  param('id').isMongoId().withMessage('申请ID格式无效'),
  body('notificationType').isIn([
    'application_submitted', 'under_review', 'additional_info_required',
    'approved', 'rejected', 'payment_scheduled', 'payment_completed'
  ]).withMessage('通知类型无效'),
  body('content').notEmpty().withMessage('通知内容不能为空')
];

/**
 * @route   GET /api/v1/policy-calculator
 * @desc    获取政策计算器列表
 * @access  Public
 */
router.get('/', policyCalculatorController.getPolicyCalculators);

/**
 * @route   GET /api/v1/policy-calculator/:id
 * @desc    获取政策计算器详情
 * @access  Public
 */
router.get('/:id',
  [param('id').isMongoId().withMessage('计算器ID格式无效')],
  validateRequest,
  policyCalculatorController.getPolicyCalculatorById
);

/**
 * @route   POST /api/v1/policy-calculator
 * @desc    创建政策计算器
 * @access  Private (Admin/Village Manager)
 */
router.post('/',
  authenticate,
  authorize(['admin', 'village_manager']),
  createPolicyCalculatorValidation,
  validateRequest,
  policyCalculatorController.createPolicyCalculator
);

/**
 * @route   PUT /api/v1/policy-calculator/:id
 * @desc    更新政策计算器
 * @access  Private (Admin/Village Manager)
 */
router.put('/:id',
  authenticate,
  authorize(['admin', 'village_manager']),
  updatePolicyCalculatorValidation,
  validateRequest,
  policyCalculatorController.updatePolicyCalculator
);

/**
 * @route   DELETE /api/v1/policy-calculator/:id
 * @desc    删除政策计算器
 * @access  Private (Admin)
 */
router.delete('/:id',
  authenticate,
  authorize(['admin']),
  [param('id').isMongoId().withMessage('计算器ID格式无效')],
  validateRequest,
  policyCalculatorController.deletePolicyCalculator
);

/**
 * @route   POST /api/v1/policy-calculator/:id/calculate
 * @desc    计算补贴金额
 * @access  Public
 */
router.post('/:id/calculate',
  calculateSubsidyValidation,
  validateRequest,
  policyCalculatorController.calculateSubsidy
);

/**
 * @route   POST /api/v1/policy-calculator/:id/batch-calculate
 * @desc    批量计算补贴
 * @access  Private (Village Manager)
 */
router.post('/:id/batch-calculate',
  authenticate,
  authorize(['village_manager', 'admin']),
  batchCalculateValidation,
  validateRequest,
  policyCalculatorController.batchCalculate
);

/**
 * @route   GET /api/v1/policy-calculator/:id/form
 * @desc    生成申请表单
 * @access  Public
 */
router.get('/:id/form',
  [param('id').isMongoId().withMessage('计算器ID格式无效')],
  validateRequest,
  policyCalculatorController.generateApplicationForm
);

// ==================== 补贴申请相关路由 ====================

/**
 * @route   GET /api/v1/policy-calculator/applications
 * @desc    获取申请列表
 * @access  Private (Village Manager/Applicant)
 */
router.get('/applications',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('villageId').optional().isMongoId(),
    query('applicationStatus').optional().isIn([
      'draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid', 'completed', 'cancelled'
    ])
  ],
  validateRequest,
  policyCalculatorController.getApplications
);

/**
 * @route   GET /api/v1/policy-calculator/applications/statistics
 * @desc    获取申请统计
 * @access  Private (Village Manager/Admin)
 */
router.get('/applications/statistics',
  authenticate,
  authorize(['village_manager', 'admin']),
  [
    query('villageId').optional().isMongoId(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validateRequest,
  policyCalculatorController.getApplicationStatistics
);

/**
 * @route   POST /api/v1/policy-calculator/applications
 * @desc    创建补贴申请
 * @access  Private
 */
router.post('/applications',
  authenticate,
  createApplicationValidation,
  validateRequest,
  policyCalculatorController.createSubsidyApplication
);

/**
 * @route   GET /api/v1/policy-calculator/applications/:id
 * @desc    获取申请详情
 * @access  Private (Applicant/Village Manager/Admin)
 */
router.get('/applications/:id',
  authenticate,
  [param('id').isMongoId().withMessage('申请ID格式无效')],
  validateRequest,
  policyCalculatorController.getApplicationById
);

/**
 * @route   POST /api/v1/policy-calculator/applications/:id/submit
 * @desc    提交申请
 * @access  Private (Applicant)
 */
router.post('/applications/:id/submit',
  authenticate,
  [param('id').isMongoId().withMessage('申请ID格式无效')],
  validateRequest,
  policyCalculatorController.submitApplication
);

/**
 * @route   POST /api/v1/policy-calculator/applications/:id/review
 * @desc    审核申请
 * @access  Private (Village Manager)
 */
router.post('/applications/:id/review',
  authenticate,
  authorize(['village_manager', 'admin']),
  reviewApplicationValidation,
  validateRequest,
  policyCalculatorController.reviewApplication
);

/**
 * @route   POST /api/v1/policy-calculator/applications/:id/payment
 * @desc    处理支付
 * @access  Private (Finance Officer/Admin)
 */
router.post('/applications/:id/payment',
  authenticate,
  authorize(['finance', 'admin']),
  processPaymentValidation,
  validateRequest,
  policyCalculatorController.processPayment
);

/**
 * @route   POST /api/v1/policy-calculator/applications/:id/certificate
 * @desc    生成证书
 * @access  Private (Village Manager)
 */
router.post('/applications/:id/certificate',
  authenticate,
  authorize(['village_manager', 'admin']),
  [param('id').isMongoId().withMessage('申请ID格式无效')],
  validateRequest,
  policyCalculatorController.generateCertificate
);

/**
 * @route   POST /api/v1/policy-calculator/applications/:id/notify
 * @desc    发送通知
 * @access  Private (Village Manager)
 */
router.post('/applications/:id/notify',
  authenticate,
  authorize(['village_manager', 'admin']),
  sendNotificationValidation,
  validateRequest,
  policyCalculatorController.sendNotification
);

// ==================== 政府政策同步相关路由 ====================

/**
 * @route   POST /api/v1/policy-calculator/sync
 * @desc    同步政府政策数据
 * @tags: [Policy Calculator Admin]
 * @access  Private (Admin/Village Manager)
 */
router.post('/sync',
  authenticate,
  authorize(['admin', 'village_manager']),
  policyCalculatorController.syncGovernmentPolicies
);

/**
 * @route   GET /api/v1/policy-calculator/sync/status
 * @desc    获取同步状态
 * @tags: [Policy Calculator]
 * @access  Private
 */
router.get('/sync/status',
  authenticate,
  policyCalculatorController.getSyncStatus
);

module.exports = router;