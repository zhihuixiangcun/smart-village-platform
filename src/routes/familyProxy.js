const express = require('express');
const { body, param, query } = require('express-validator');
const familyProxyController = require('../controllers/familyProxyController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/apiValidation');
const router = express.Router();

// 配置文件上传
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/family-proxy');
    fs.mkdir(uploadDir, { recursive: true }).catch(() => {});
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5 // 最多5个文件
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|bmp|tiff|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('不支持的文件类型。只允许图片和PDF文件。'));
    }
  }
});

// 单文件上传中间件
// 多文件上传中间件
const uploadMultiple = upload.array('files', 5);

/**
 * @route   POST /api/v1/family-proxy/authenticate-relation
 * @desc    认证家庭关系
 * @access  Private
 */
router.post('/authenticate-relation',
  authenticate,
  upload.single('image'),
  [
    body('principalUserId')
      .notEmpty()
      .withMessage('被代理人用户ID不能为空'),
    body('relationship')
      .isIn(['spouse', 'parent', 'child', 'sibling', 'grandparent', 'grandchild', 'guardian', 'other'])
      .withMessage('关系类型无效'),
    body('verificationMethod')
      .isIn(['household_registration', 'village_committee', 'documents', 'witnesses', 'multi_method'])
      .withMessage('验证方法无效'),
    body('notes')
      .optional()
      .isString()
      .withMessage('备注必须是字符串')
  ],
  validateRequest,
  familyProxyController.authenticateRelation
);

/**
 * @route   POST /api/v1/family-proxy/sessions
 * @desc    创建代理会话
 * @access  Private
 */
router.post('/sessions',
  authenticate,
  [
    body('principalUserId')
      .notEmpty()
      .withMessage('被代理人用户ID不能为空'),
    body('purpose')
      .notEmpty()
      .withMessage('代理目的不能为空')
      .isLength({ min: 5, max: 200 })
      .withMessage('代理目的长度必须在5-200之间'),
    body('validMinutes')
      .optional()
      .isInt({ min: 5, max: 1440 })
      .withMessage('有效期必须在5-1440分钟之间'),
    body('maxOperations')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('最大操作次数必须在1-100之间')
  ],
  validateRequest,
  familyProxyController.createProxySession
);

/**
 * @route   POST /api/v1/family-proxy/sessions/:sessionId/execute
 * @desc    执行代理操作
 * @access  Private
 */
router.post('/sessions/:sessionId/execute',
  authenticate,
  [
    param('sessionId')
      .notEmpty()
      .withMessage('会话ID不能为空'),
    body('operationType')
      .isIn(['VIEW', 'EDIT', 'SUBMIT', 'APPROVE', 'FINANCIAL', 'PERSONAL', 'REPRESENTATIVE'])
      .withMessage('操作类型无效'),
    body('operationData')
      .optional()
      .isObject()
      .withMessage('操作数据必须是对象'),
    body('notes')
      .optional()
      .isString()
      .withMessage('备注必须是字符串')
  ],
  validateRequest,
  familyProxyController.executeProxyOperation
);

/**
 * @route   DELETE /api/v1/family-proxy/sessions/:sessionId
 * @desc    终止代理会话
 * @access  Private
 */
router.delete('/sessions/:sessionId',
  authenticate,
  [
    param('sessionId')
      .notEmpty()
      .withMessage('会话ID不能为空'),
    body('reason')
      .optional()
      .isIn(['user_logout', 'timeout', 'operation_limit', 'security_risk', 'admin_action', 'other'])
      .withMessage('终止原因无效')
  ],
  validateRequest,
  familyProxyController.terminateProxySession
);

/**
 * @route   GET /api/v1/family-proxy/relations
 * @desc    获取代理关系列表
 * @access  Private
 */
router.get('/relations',
  authenticate,
  [
    query('status')
      .optional()
      .isIn(['pending', 'approved', 'rejected', 'expired'])
      .withMessage('状态无效'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('页码必须是正整数'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('每页数量必须在1-100之间')
  ],
  validateRequest,
  familyProxyController.getProxyRelations
);

/**
 * @route   GET /api/v1/family-proxy/users/:userId/sessions
 * @desc    获取活动代理会话
 * @access  Private
 */
router.get('/users/:userId/sessions',
  authenticate,
  [
    param('userId')
      .notEmpty()
      .withMessage('用户ID不能为空')
  ],
  validateRequest,
  familyProxyController.getActiveProxySessions
);

/**
 * @route   GET /api/v1/family-proxy/sessions/:sessionId/logs
 * @desc    获取代理操作日志
 * @access  Private
 */
router.get('/sessions/:sessionId/logs',
  authenticate,
  [
    param('sessionId')
      .notEmpty()
      .withMessage('会话ID不能为空'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('页码必须是正整数'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('每页数量必须在1-100之间'),
    query('operationType')
      .optional()
      .isIn(['VIEW', 'EDIT', 'SUBMIT', 'APPROVE', 'FINANCIAL', 'PERSONAL', 'REPRESENTATIVE'])
      .withMessage('操作类型无效'),
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
  familyProxyController.getProxyOperationLogs
);

/**
 * @route   GET /api/v1/family-proxy/statistics
 * @desc    获取代理系统统计
 * @access  Private
 */
router.get('/statistics',
  authenticate,
  [
    query('period')
      .optional()
      .isIn(['7d', '30d', '90d', '1y'])
      .withMessage('统计周期无效')
  ],
  validateRequest,
  familyProxyController.getProxyStatistics
);

/**
 * @route   POST /api/v1/family-proxy/sessions/:sessionId/verify-permission
 * @desc    验证代理权限
 * @access  Private
 */
router.post('/sessions/:sessionId/verify-permission',
  authenticate,
  [
    param('sessionId')
      .notEmpty()
      .withMessage('会话ID不能为空'),
    body('operationType')
      .isIn(['VIEW', 'EDIT', 'SUBMIT', 'APPROVE', 'FINANCIAL', 'PERSONAL', 'REPRESENTATIVE'])
      .withMessage('操作类型无效'),
    body('dataContext')
      .optional()
      .isObject()
      .withMessage('数据上下文必须是对象')
  ],
  validateRequest,
  familyProxyController.verifyProxyPermission
);

/**
 * @route   GET /api/v1/family-proxy/privacy-settings
 * @desc    获取隐私设置
 * @access  Private
 */
router.get('/privacy-settings',
  authenticate,
  familyProxyController.getPrivacySettings
);

/**
 * @route   PUT /api/v1/family-proxy/privacy-settings
 * @desc    更新隐私设置
 * @access  Private
 */
router.put('/privacy-settings',
  authenticate,
  [
    body('settings')
      .isObject()
      .withMessage('设置必须是对象'),
    body('settings.allowProxyAccess')
      .optional()
      .isBoolean()
      .withMessage('允许代理访问必须是布尔值'),
    body('settings.requireBiometric')
      .optional()
      .isBoolean()
      .withMessage('需要生物识别必须是布尔值'),
    body('settings.maxSessionDuration')
      .optional()
      .isInt({ min: 5, max: 1440 })
      .withMessage('最大会话时长必须在5-1440分钟之间'),
    body('settings.allowedOperations')
      .optional()
      .isArray()
      .withMessage('允许操作列表必须是数组'),
    body('settings.restrictedDataTypes')
      .optional()
      .isArray()
      .withMessage('受限数据类型必须是数组'),
    body('settings.accessNotifications')
      .optional()
      .isBoolean()
      .withMessage('访问通知必须是布尔值'),
    body('settings.twoFactorRequired')
      .optional()
      .isBoolean()
      .withMessage('双因子认证必须是布尔值')
  ],
  validateRequest,
  familyProxyController.updatePrivacySettings
);

/**
 * @route   GET /api/v1/family-proxy/access-history
 * @desc    获取数据访问历史
 * @access  Private
 */
router.get('/access-history',
  authenticate,
  [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('开始日期格式无效'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('结束日期格式无效'),
    query('dataType')
      .optional()
      .isIn(['personal', 'financial', 'health', 'contact', 'document'])
      .withMessage('数据类型无效'),
    query('accessType')
      .optional()
      .isIn(['proxy', 'direct', 'system'])
      .withMessage('访问类型无效')
  ],
  validateRequest,
  familyProxyController.getDataAccessHistory
);

/**
 * @route   POST /api/v1/family-proxy/privacy-requests/:requestId/respond
 * @desc    响应隐私访问请求
 * @access  Private
 */
router.post('/privacy-requests/:requestId/respond',
  authenticate,
  [
    param('requestId')
      .notEmpty()
      .withMessage('请求ID不能为空'),
    body('action')
      .isIn(['approve', 'reject'])
      .withMessage('操作类型无效'),
    body('reason')
      .optional()
      .isString()
      .withMessage('原因必须是字符串')
  ],
  validateRequest,
  familyProxyController.respondToPrivacyRequest
);

/**
 * @route   GET /api/v1/family-proxy/family-members
 * @desc    获取家庭成员信息
 * @access  Private
 */
router.get('/family-members',
  authenticate,
  [
    query('includeExtended')
      .optional()
      .isBoolean()
      .withMessage('包含扩展家庭成员必须是布尔值')
  ],
  validateRequest,
  familyProxyController.getFamilyMembers
);

/**
 * @route   POST /api/v1/family-proxy/admin/terminate-session
 * @desc    管理员强制终止代理会话
 * @access  Private (Admin only)
 */
router.post('/admin/terminate-session',
  authenticate,
  authorize(['admin', 'village_manager']),
  [
    body('sessionId')
      .notEmpty()
      .withMessage('会话ID不能为空'),
    body('reason')
      .isIn(['security_risk', 'abuse_detected', 'admin_action', 'other'])
      .withMessage('终止原因无效'),
    body('notes')
      .optional()
      .isString()
      .withMessage('备注必须是字符串')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { sessionId, reason, notes } = req.body;
      const familyProxyService = require('../services/familyProxyService');
      const result = await familyProxyService.terminateProxySession(
        sessionId,
        `${reason}${notes ? ': ' + notes : ''}`
      );

      res.json({
        success: true,
        message: '代理会话已由管理员强制终止',
        data: result.data
      });

    } catch (error) {
      logger.error('管理员终止代理会话失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '终止代理会话失败',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/v1/family-proxy/admin/audit-logs
 * @desc    管理员获取审计日志
 * @access  Private (Admin only)
 */
router.get('/admin/audit-logs',
  authenticate,
  authorize(['admin', 'village_manager']),
  [
    query('userId')
      .optional()
      .notEmpty()
      .withMessage('用户ID不能为空'),
    query('action')
      .optional()
      .isIn(['RELATION_CREATED', 'RELATION_VERIFIED', 'SESSION_CREATED', 'OPERATION_EXECUTED', 'SESSION_TERMINATED'])
      .withMessage('操作类型无效'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('开始日期格式无效'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('结束日期格式无效'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('页码必须是正整数'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('每页数量必须在1-100之间')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId, action, startDate, endDate, page = 1, limit = 50 } = req.query;

      const AuditLog = require('../models/FamilyProxyAuditLog');
const logger = require('../utils/logger');
      const query = {};

      if (userId) {
        query.$or = [
          { userId },
          { agentUserId: userId },
          { principalUserId: userId }
        ];
      }

      if (action) {
        query.action = action;
      }

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const logs = await AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('userId agentUserId principalUserId sessionId', 'name email phone');

      const total = await AuditLog.countDocuments(query);

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      logger.error('获取审计日志失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取审计日志失败',
        error: error.message
      });
    }
  }
);

module.exports = router;