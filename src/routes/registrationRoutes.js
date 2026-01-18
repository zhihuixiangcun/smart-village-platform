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

// 安全改进：文件类型白名单
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/pdf'
];

const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', 
  '.pdf'
];

// 安全改进：文件名清理函数
const sanitizeFilename = (filename) => {
  // 移除路径遍历字符
  const sanitized = filename.replace(/[\/\\]/g, '');
  
  // 移除危险字符
  const safeName = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, '');
  
  // 限制长度
  const ext = path.extname(safeName);
  const baseName = path.basename(safeName, ext).substring(0, 100);
  
  return `${baseName}${ext}`;
};

// 安全改进：验证文件类型
const validateFileType = (file) => {
  // 检查MIME类型
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return false;
  }
  
  // 检查文件扩展名
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return false;
  }
  
  // 检查MIME类型和扩展名是否匹配
  const mimeToExtMap = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'application/pdf': '.pdf'
  };
  
  const expectedExt = mimeToExtMap[file.mimetype];
  if (expectedExt && ext !== expectedExt) {
    return false;
  }
  
  return true;
};

// 配置文件上传
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/registration');
    await fs.mkdir(uploadDir, { recursive: true }).catch(() => {});
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()  }-${  Math.round(Math.random() * 1E9)}`;
    cb(null, `${file.fieldname  }-${  uniqueSuffix  }${path.extname(file.originalname)}`);
  }
});

// 安全改进：增强的multer配置
const secureUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 4
  },
  fileFilter: (req, file, cb) => {
    // 验证文件类型
    if (!validateFileType(file)) {
      return cb(new Error('不支持的文件类型，仅支持: JPG, PNG, GIF, PDF'), false);
    }
    
    // 验证文件名
    const sanitized = sanitizeFilename(file.originalname);
    if (sanitized !== file.originalname) {
      return cb(new Error('文件名包含非法字符'), false);
    }
    
    cb(null, true);
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
  secureUpload.fields([
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
