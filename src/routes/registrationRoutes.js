/**
 * 用户注册申请路由
 *
 * 处理注册申请的HTTP请求：
 * - 提交注册申请
 * - 查询申请状态
 * - 审批申请（管理员）
 * - 获取待审批列表
 */

const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// 配置文件上传
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/registration');
    await fs.mkdir(uploadDir, { recursive: true }).catch(() => {});
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持图片和PDF文件'));
    }
  }
});

// 申请限流配置
const submitRateLimit = require('express-rate-limit')({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 3, // 每个IP最多3次申请
  message: { success: false, message: '申请提交次数过多，请稍后再试' }
});

/**
 * @route   POST /api/v1/registration/submit
 * @desc    提交注册申请
 * @access  Public
 */
router.post('/submit',
  submitRateLimit,
  upload.fields([
    { name: 'idCardFront', maxCount: 1 },
    { name: 'idCardBack', maxCount: 1 },
    { name: 'householdBook', maxCount: 1 },
    { name: 'appointmentLetter', maxCount: 1 }
  ]),
  [
    body('applicationType').isIn(['resident', 'village_admin', 'township_admin']).withMessage('无效的申请类型'),
    body('applicant.name').notEmpty().withMessage('请输入姓名'),
    body('applicant.phone').isMobilePhone('zh-CN').withMessage('请输入有效的手机号'),
    body('applicant.idCard').notEmpty().withMessage('请输入身份证号')
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }
    next();
  },
  registrationController.submitApplication
);

/**
 * @route   GET /api/v1/registration/status/:id
 * @desc    获取申请状态
 * @access  Public
 */
router.get('/status/:id',
  registrationController.getApplicationStatus
);

/**
 * @route   GET /api/v1/registration/my-applications
 * @desc    获取我的申请列表
 * @access  Private
 */
router.get('/my-applications',
  authenticateToken,
  registrationController.getMyApplications
);

/**
 * @route   GET /api/v1/registration/pending
 * @desc    获取待审批列表（管理员）
 * @access  Private (Admin)
 */
router.get('/pending',
  authenticateToken,
  registrationController.getPendingApplications
);

/**
 * @route   GET /api/v1/registration/:id/details
 * @desc    获取申请详情（管理员）
 * @access  Private (Admin)
 */
router.get('/:id/details',
  authenticateToken,
  registrationController.getApplicationDetails
);

/**
 * @route   POST /api/v1/registration/:id/review
 * @desc    审批申请（管理员）
 * @access  Private (Admin)
 */
router.post('/:id/review',
  authenticateToken,
  [
    body('decision').isIn(['approved', 'rejected', 'request_info']).withMessage('无效的审批决策')
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }
    next();
  },
  registrationController.reviewApplication
);

/**
 * @route   POST /api/v1/registration/:id/supplement
 * @desc    补充申请信息
 * @access  Private
 */
router.post('/:id/supplement',
  authenticateToken,
  registrationController.supplementApplication
);

/**
 * @route   DELETE /api/v1/registration/:id
 * @desc    撤销申请
 * @access  Private
 */
router.delete('/:id',
  authenticateToken,
  registrationController.cancelApplication
);

module.exports = router;
