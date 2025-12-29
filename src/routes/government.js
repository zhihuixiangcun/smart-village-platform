/**
 * 政务管理API路由
 * 处理村民档案、证件办理、福利申请等RESTful接口
 */

const express = require('express');
const router = express.Router();
const governmentController = require('../controllers/governmentController');
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

// ==================== 村民数字档案 ====================

/**
 * @route   GET /api/v1/villagers/:residentId/profile
 * @desc    获取村民数字档案
 * @access  Private
 */
router.get(
  '/villagers/:residentId/profile',
  authenticate,
  param('residentId').isMongoId().withMessage('residentId无效'),
  validate,
  governmentController.getVillagerProfile
);

/**
 * @route   POST /api/v1/villagers/:residentId/profile
 * @desc    创建村民数字档案
 * @access  Private
 */
router.post(
  '/villagers/:residentId/profile',
  authenticate,
  param('residentId').isMongoId().withMessage('residentId无效'),
  body('villageId').isMongoId().withMessage('villageId无效'),
  body('personalInfo.name').notEmpty().withMessage('姓名不能为空'),
  body('personalInfo.idNumber').notEmpty().withMessage('身份证号不能为空'),
  validate,
  governmentController.createVillagerProfile
);

/**
 * @route   PUT /api/v1/villagers/:residentId/profile
 * @desc    更新村民数字档案
 * @access  Private
 */
router.put(
  '/villagers/:residentId/profile',
  authenticate,
  param('residentId').isMongoId().withMessage('residentId无效'),
  validate,
  governmentController.updateVillagerProfile
);

/**
 * @route   POST /api/v1/villagers/:residentId/profile/verify
 * @desc    验证村民档案
 * @access  Private
 */
router.post(
  '/villagers/:residentId/profile/verify',
  authenticate,
  param('residentId').isMongoId().withMessage('residentId无效'),
  body('notes').optional(),
  validate,
  governmentController.verifyVillagerProfile
);

/**
 * @route   GET /api/v1/villages/:villageId/villager-profiles
 * @desc    获取村民档案列表
 * @access  Private
 */
router.get(
  '/villages/:villageId/villager-profiles',
  authenticate,
  param('villageId').isMongoId().withMessage('villageId无效'),
  validate,
  governmentController.getVillagerProfiles
);

// ==================== 证件办理 ====================

/**
 * @route   POST /api/v1/document-applications
 * @desc    创建证件办理申请
 * @access  Private
 */
router.post(
  '/document-applications',
  authenticate,
  body('applicantId').isMongoId().withMessage('applicantId无效'),
  body('documentType').isIn([
    'id_card', 'residence_permit', 'household_register', 'marriage_certificate',
    'birth_certificate', 'death_certificate', 'divorce_certificate',
    'social_security_card', 'medical_insurance_card', 'disability_certificate',
    'land_use_certificate', 'property_ownership', 'business_license',
    'passport', 'other'
  ]).withMessage('documentType无效'),
  body('villageId').isMongoId().withMessage('villageId无效'),
  body('reason').isIn(['new', 'renewal', 'loss', 'damage', 'change', 'other']).withMessage('reason无效'),
  validate,
  governmentController.createDocumentApplication
);

/**
 * @route   POST /api/v1/document-applications/:applicationId/submit
 * @desc    提交证件办理申请
 * @access  Private
 */
router.post(
  '/document-applications/:applicationId/submit',
  authenticate,
  param('applicationId').isMongoId().withMessage('applicationId无效'),
  validate,
  governmentController.submitDocumentApplication
);

/**
 * @route   PUT /api/v1/document-applications/:applicationId/review
 * @desc    审核证件申请
 * @access  Private
 */
router.put(
  '/document-applications/:applicationId/review',
  authenticate,
  param('applicationId').isMongoId().withMessage('applicationId无效'),
  body('approved').isBoolean().withMessage('approved必须是布尔值'),
  validate,
  governmentController.reviewDocumentApplication
);

/**
 * @route   GET /api/v1/villages/:villageId/document-applications
 * @desc    获取证件申请列表
 * @access  Private
 */
router.get(
  '/villages/:villageId/document-applications',
  authenticate,
  param('villageId').isMongoId().withMessage('villageId无效'),
  validate,
  governmentController.getDocumentApplications
);

/**
 * @route   GET /api/v1/document-applications/:applicationId
 * @desc    获取证件申请详情
 * @access  Private
 */
router.get(
  '/document-applications/:applicationId',
  authenticate,
  param('applicationId').isMongoId().withMessage('applicationId无效'),
  validate,
  governmentController.getDocumentApplicationDetail
);

// ==================== 福利申请 ====================

/**
 * @route   POST /api/v1/welfare-applications
 * @desc    创建福利申请
 * @access  Private
 */
router.post(
  '/welfare-applications',
  authenticate,
  body('applicantId').isMongoId().withMessage('applicantId无效'),
  body('welfareType').isIn([
    'subsistence_allowance', 'extreme_poverty', 'medical_aid', 'serious_disease',
    'education_grant', 'poor_student_aid', 'vocational_training',
    'housing_subsidy', 'rural_renovation', 'disaster_relocation',
    'elderly_allowance', 'home_based_care', 'nursing_home_subsidy',
    'disability_allowance', 'rehabilitation_subsidy',
    'employment_subsidy', 'entrepreneurship_grant', 'public_welfare_job',
    'one_child_policy', 'funeral_assistance', 'emergency_relief', 'other'
  ]).withMessage('welfareType无效'),
  body('villageId').isMongoId().withMessage('villageId无效'),
  body('householdInfo.householdSize').isInt({ min: 1 }).withMessage('householdSize必须大于0'),
  body('householdInfo.householdIncome').isFloat({ min: 0 }).withMessage('householdIncome必须大于等于0'),
  body('applicationReason').notEmpty().withMessage('applicationReason不能为空'),
  validate,
  governmentController.createWelfareApplication
);

/**
 * @route   POST /api/v1/welfare-applications/:applicationId/submit
 * @desc    提交福利申请
 * @access  Private
 */
router.post(
  '/welfare-applications/:applicationId/submit',
  authenticate,
  param('applicationId').isMongoId().withMessage('applicationId无效'),
  validate,
  governmentController.submitWelfareApplication
);

/**
 * @route   POST /api/v1/welfare-applications/:applicationId/village-review
 * @desc    村级初审
 * @access  Private
 */
router.post(
  '/welfare-applications/:applicationId/village-review',
  authenticate,
  param('applicationId').isMongoId().withMessage('applicationId无效'),
  validate,
  governmentController.villageReviewWelfare
);

/**
 * @route   PUT /api/v1/welfare-applications/:applicationId/review
 * @desc    审核福利申请
 * @access  Private
 */
router.put(
  '/welfare-applications/:applicationId/review',
  authenticate,
  param('applicationId').isMongoId().withMessage('applicationId无效'),
  body('approved').isBoolean().withMessage('approved必须是布尔值'),
  validate,
  governmentController.reviewWelfareApplication
);

/**
 * @route   POST /api/v1/welfare-applications/:applicationId/objection
 * @desc    提出异议
 * @access  Public
 */
router.post(
  '/welfare-applications/:applicationId/objection',
  param('applicationId').isMongoId().withMessage('applicationId无效'),
  body('objectorName').notEmpty().withMessage('objectorName不能为空'),
  body('objectorPhone').notEmpty().withMessage('objectorPhone不能为空'),
  body('objectionContent').notEmpty().withMessage('objectionContent不能为空'),
  validate,
  governmentController.submitObjection
);

/**
 * @route   POST /api/v1/welfare-applications/:applicationId/publicity-result
 * @desc    处理公示结果
 * @access  Private
 */
router.post(
  '/welfare-applications/:applicationId/publicity-result',
  authenticate,
  param('applicationId').isMongoId().withMessage('applicationId无效'),
  body('result').isIn(['no_objection', 'objection_resolved', 'objection_confirmed']).withMessage('result无效'),
  validate,
  governmentController.processPublicityResult
);

/**
 * @route   POST /api/v1/welfare-applications/:applicationId/disburse
 * @desc    发放福利金
 * @access  Private
 */
router.post(
  '/welfare-applications/:applicationId/disburse',
  authenticate,
  param('applicationId').isMongoId().withMessage('applicationId无效'),
  body('amount').isFloat({ min: 0 }).withMessage('amount必须大于等于0'),
  body('paymentMethod').notEmpty().withMessage('paymentMethod不能为空'),
  validate,
  governmentController.disburseWelfare
);

/**
 * @route   GET /api/v1/villages/:villageId/welfare-applications
 * @desc    获取福利申请列表
 * @access  Private
 */
router.get(
  '/villages/:villageId/welfare-applications',
  authenticate,
  param('villageId').isMongoId().withMessage('villageId无效'),
  validate,
  governmentController.getWelfareApplications
);

/**
 * @route   GET /api/v1/welfare-applications/:applicationId
 * @desc    获取福利申请详情
 * @access  Private
 */
router.get(
  '/welfare-applications/:applicationId',
  authenticate,
  param('applicationId').isMongoId().withMessage('applicationId无效'),
  validate,
  governmentController.getWelfareApplicationDetail
);

// ==================== 政务服务目录 ====================

/**
 * @route   GET /api/v1/villages/:villageId/government-services
 * @desc    获取服务目录
 * @access  Public
 */
router.get(
  '/villages/:villageId/government-services',
  param('villageId').isMongoId().withMessage('villageId无效'),
  validate,
  governmentController.getGovernmentServices
);

/**
 * @route   GET /api/v1/government-services/:serviceId
 * @desc    获取服务详情
 * @access  Public
 */
router.get(
  '/government-services/:serviceId',
  param('serviceId').isMongoId().withMessage('serviceId无效'),
  validate,
  governmentController.getGovernmentServiceDetail
);

/**
 * @route   POST /api/v1/government-services
 * @desc    创建服务目录
 * @access  Private
 */
router.post(
  '/government-services',
  authenticate,
  body('serviceCode').notEmpty().withMessage('serviceCode不能为空'),
  body('serviceName').notEmpty().withMessage('serviceName不能为空'),
  body('serviceCategory').isIn(['document', 'welfare', 'approval', 'certificate', 'inquiry', 'other']).withMessage('serviceCategory无效'),
  validate,
  governmentController.createGovernmentService
);

// ==================== 统计信息 ====================

/**
 * @route   GET /api/v1/villages/:villageId/government-statistics
 * @desc    获取政务服务统计数据
 * @access  Private
 */
router.get(
  '/villages/:villageId/government-statistics',
  authenticate,
  param('villageId').isMongoId().withMessage('villageId无效'),
  validate,
  governmentController.getStatistics
);

module.exports = router;
