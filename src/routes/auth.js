/**
 * 认证路由
 * 处理用户注册、登录、令牌管理等相关接口
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { handleValidationErrors } = require('../middleware/apiValidation');

/**
 * 用户注册
 * POST /api/v1/auth/register
 */
router.post('/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('用户名长度必须在3-50个字符之间')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('用户名只能包含字母、数字和下划线'),

    body('password')
      .isLength({ min: 6, max: 128 })
      .withMessage('密码长度必须在6-128个字符之间')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('密码必须包含至少一个大写字母、一个小写字母和一个数字'),

    body('name')
      .trim()
      .notEmpty()
      .withMessage('姓名不能为空')
      .isLength({ min: 2, max: 50 })
      .withMessage('姓名长度必须在2-50个字符之间'),

    body('phone')
      .trim()
      .matches(/^1[3-9]\d{9}$/)
      .withMessage('手机号格式不正确'),

    body('idCard')
      .optional()
      .matches(/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/)
      .withMessage('身份证号格式不正确'),

    body('role')
      .optional()
      .isIn(['admin', 'village_admin', 'village_official', 'resident'])
      .withMessage('角色不正确'),

    body('villageId')
      .optional()
      .isMongoId()
      .withMessage('村庄ID格式不正确'),

    body('email')
      .optional()
      .isEmail()
      .withMessage('邮箱格式不正确')
      .normalizeEmail()
  ],
  handleValidationErrors,
  authController.register
);

/**
 * 用户登录
 * POST /api/v1/auth/login
 */
router.post('/login',
  [
    body('username')
      .trim()
      .notEmpty()
      .withMessage('用户名不能为空'),

    body('password')
      .notEmpty()
      .withMessage('密码不能为空'),

    body('mfaCode')
      .optional()
      .isLength({ min: 6, max: 6 })
      .withMessage('验证码必须是6位数字'),

    body('deviceInfo')
      .optional()
      .isObject()
      .withMessage('设备信息必须是对象'),

    body('deviceInfo.deviceId')
      .if(body('deviceInfo').exists())
      .trim()
      .notEmpty()
      .withMessage('设备ID不能为空'),

    body('deviceInfo.platform')
      .if(body('deviceInfo').exists())
      .isIn(['ios', 'android', 'web', 'desktop'])
      .withMessage('平台类型不正确')
  ],
  handleValidationErrors,
  authController.login
);

/**
 * 刷新令牌
 * POST /api/v1/auth/refresh
 */
router.post('/refresh',
  [
    body('refreshToken')
      .notEmpty()
      .withMessage('刷新令牌不能为空')
  ],
  handleValidationErrors,
  authController.refreshToken
);

/**
 * 用户登出
 * POST /api/v1/auth/logout
 */
router.post('/logout',
  [
    body('refreshToken')
      .optional()
      .notEmpty()
      .withMessage('刷新令牌不能为空'),

    body('sessionId')
      .optional()
      .notEmpty()
      .withMessage('会话ID不能为空')
  ],
  handleValidationErrors,
  authController.logout
);

/**
 * 获取当前用户信息
 * GET /api/v1/auth/me
 */
router.get('/me',
  authMiddleware.authenticate,
  authController.getCurrentUser
);

/**
 * 修改密码
 * PUT /api/v1/auth/change-password
 */
router.put('/change-password',
  authMiddleware.authenticate,
  [
    body('oldPassword')
      .notEmpty()
      .withMessage('原密码不能为空'),

    body('newPassword')
      .isLength({ min: 6, max: 128 })
      .withMessage('新密码长度必须在6-128个字符之间')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('新密码必须包含至少一个大写字母、一个小写字母和一个数字'),

    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('确认密码与新密码不匹配');
        }
        return true;
      })
  ],
  handleValidationErrors,
  authController.changePassword
);

/**
 * 启用多因子认证
 * POST /api/v1/auth/mfa/enable
 */
router.post('/mfa/enable',
  authMiddleware.authenticate,
  [
    body('phone')
      .trim()
      .matches(/^1[3-9]\d{9}$/)
      .withMessage('手机号格式不正确'),

    body('type')
      .optional()
      .isIn(['sms', 'email', 'totp'])
      .withMessage('MFA类型不正确')
  ],
  handleValidationErrors,
  authController.enableMFA
);

/**
 * 验证多因子认证并启用
 * POST /api/v1/auth/mfa/verify
 */
router.post('/mfa/verify',
  authMiddleware.authenticate,
  [
    body('code')
      .isLength({ min: 6, max: 6 })
      .withMessage('验证码必须是6位数字')
  ],
  handleValidationErrors,
  authController.verifyAndEnableMFA
);

/**
 * 禁用多因子认证
 * POST /api/v1/auth/mfa/disable
 */
router.post('/mfa/disable',
  authMiddleware.authenticate,
  [
    body('password')
      .notEmpty()
      .withMessage('密码不能为空'),

    body('mfaCode')
      .optional()
      .isLength({ min: 6, max: 6 })
      .withMessage('验证码必须是6位数字')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { password, mfaCode } = req.body;
      const userId = req.user._id;

      // 获取用户
      const User = require('../models/User');
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: '用户不存在'
        });
      }

      // 验证密码
      const bcrypt = require('bcryptjs');
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: '密码错误'
        });
      }

      // 如果启用了MFA，需要验证码
      if (user.mfaEnabled) {
        if (!mfaCode) {
          return res.status(400).json({
            success: false,
            error: '需要提供验证码'
          });
        }

        // 验证MFA码
        const isValidMFA = await authController.verifyMFACode(user, mfaCode);
        if (!isValidMFA) {
          return res.status(400).json({
            success: false,
            error: '验证码错误或已过期'
          });
        }
      }

      // 禁用MFA
      user.mfaEnabled = false;
      user.mfaCode = undefined;
      await user.save();

      // 记录审计日志
      const { AuditUtil } = require('../utils/audit');
      await AuditUtil.logOperation('UPDATE', 'user', {
        userId: user._id,
        username: user.username,
        name: user.name,
        role: user.role
      }, {
        target: {
          id: user._id,
          type: 'User',
          name: user.username
        },
        result: 'SUCCESS',
        details: {
          description: `用户禁用多因子认证: ${user.username}`
        },
        riskLevel: 'MEDIUM',
        villageId: user.villageId,
        sessionId: req.session?.sessionId
      });

      res.json({
        success: true,
        message: '多因子认证已禁用'
      });

    } catch (error) {
      const logger = require('../utils/logger');
      logger.error('禁用MFA失败:', error);
      res.status(500).json({
        success: false,
        error: '禁用多因子认证失败',
        message: '服务器内部错误'
      });
    }
  }
);

/**
 * 获取用户会话列表
 * GET /api/v1/auth/sessions
 */
router.get('/sessions',
  authMiddleware.authenticate,
  authMiddleware.requireRoles(['admin', 'village_admin']),
  async (req, res) => {
    try {
      // 获取活跃会话列表
      const authMiddleware = require('../middleware/auth');
      const sessions = Array.from(authMiddleware.activeSessions.values())
        .filter(session => session.status === 'active')
        .map(session => ({
          sessionId: session.sessionId,
          userId: session.userId,
          loginTime: session.loginTime,
          lastActivity: session.lastActivity,
          deviceInfo: session.deviceInfo,
          ipAddress: session.deviceInfo.ipAddress
        }));

      res.json({
        success: true,
        data: sessions,
        total: sessions.length
      });

    } catch (error) {
      const logger = require('../utils/logger');
      logger.error('获取会话列表失败:', error);
      res.status(500).json({
        success: false,
        error: '获取会话列表失败',
        message: '服务器内部错误'
      });
    }
  }
);

/**
 * 撤销指定会话
 * DELETE /api/v1/auth/sessions/:sessionId
 */
router.delete('/sessions/:sessionId',
  authMiddleware.authenticate,
  authMiddleware.requireRoles(['admin', 'village_admin']),
  async (req, res) => {
    try {
      const { sessionId } = req.params;

      // 撤销会话
      const authMiddleware = require('../middleware/auth');
      const success = authMiddleware.revokeSession(sessionId);

      if (success) {
        res.json({
          success: true,
          message: '会话已撤销'
        });
      } else {
        res.status(404).json({
          success: false,
          error: '会话不存在'
        });
      }

    } catch (error) {
      const logger = require('../utils/logger');
      logger.error('撤销会话失败:', error);
      res.status(500).json({
        success: false,
        error: '撤销会话失败',
        message: '服务器内部错误'
      });
    }
  }
);

/**
 * 撤销用户所有会话（除了当前会话）
 * POST /api/v1/auth/revoke-all-sessions
 */
router.post('/revoke-all-sessions', authMiddleware.authenticate, async (req, res) => {
    try {
      const userId = req.user._id;
      const currentSessionId = req.session?.sessionId;

      // 撤销用户的所有其他会话
      const authMiddleware = require('../middleware/auth');
      let revokedCount = 0;

      for (const [sessionId, session] of authMiddleware.activeSessions) {
        if (session.userId.toString() === userId &&
            session.status === 'active' &&
            sessionId !== currentSessionId) {
          authMiddleware.revokeSession(sessionId);
          revokedCount++;
        }
      }

      res.json({
        success: true,
        message: `已撤销${revokedCount}个会话`,
        revokedCount
      });

    } catch (error) {
      const logger = require('../utils/logger');
      logger.error('撤销所有会话失败:', error);
      res.status(500).json({
        success: false,
        error: '撤销会话失败',
        message: '服务器内部错误'
      });
    }
  }
);

/**
 * 验证令牌有效性
 * POST /api/v1/auth/verify
 */
router.post('/verify',
  authMiddleware.authenticate,
  (req, res) => {
    res.json({
      success: true,
      data: {
        valid: true,
        user: {
          id: req.user._id,
          username: req.user.username,
          role: req.user.role,
          permissions: req.user.permissions
        }
      }
    });
  }
);

// ==================== 短信验证码相关接口 ====================

/**
 * 发送短信验证码
 * POST /api/v1/auth/send-sms
 * 用于登录、注册、重置密码等场景
 */
router.post('/send-sms',
  [
    body('phone')
      .trim()
      .matches(/^1[3-9]\d{9}$/)
      .withMessage('手机号格式不正确'),

    body('type')
      .optional()
      .isIn(['login', 'register', 'reset'])
      .withMessage('类型必须是 login、register 或 reset 之一')
  ],
  handleValidationErrors,
  authController.sendSmsCode
);

/**
 * 发送验证码（前端兼容路由）
 * POST /api/v1/auth/send-code
 * 与 /send-sms 功能相同，用于前端兼容
 */
router.post('/send-code',
  [
    body('phone')
      .trim()
      .matches(/^1[3-9]\d{9}$/)
      .withMessage('手机号格式不正确'),

    body('type')
      .optional()
      .isIn(['login', 'register', 'reset'])
      .withMessage('类型必须是 login、register 或 reset 之一')
  ],
  handleValidationErrors,
  authController.sendSmsCode
);

/**
 * 短信验证码登录
 * POST /api/v1/auth/login-sms
 */
router.post('/login-sms',
  [
    body('phone')
      .trim()
      .matches(/^1[3-9]\d{9}$/)
      .withMessage('手机号格式不正确'),

    body('code')
      .isLength({ min: 6, max: 6 })
      .withMessage('验证码必须是6位数字')
  ],
  handleValidationErrors,
  authController.loginWithSms
);

/**
 * 短信验证码注册
 * POST /api/v1/auth/register-sms
 */
router.post('/register-sms',
  [
    body('phone')
      .trim()
      .matches(/^1[3-9]\d{9}$/)
      .withMessage('手机号格式不正确'),

    body('code')
      .isLength({ min: 6, max: 6 })
      .withMessage('验证码必须是6位数字'),

    body('name')
      .trim()
      .notEmpty()
      .withMessage('姓名不能为空')
      .isLength({ min: 2, max: 50 })
      .withMessage('姓名长度必须在2-50个字符之间'),

    body('password')
      .optional()
      .isLength({ min: 6, max: 128 })
      .withMessage('密码长度必须在6-128个字符之间'),

    body('villageId')
      .optional()
      .isMongoId()
      .withMessage('村庄ID格式不正确'),

    body('role')
      .optional()
      .isIn(['admin', 'village_admin', 'village_official', 'resident'])
      .withMessage('角色不正确'),

    body('email')
      .optional()
      .isEmail()
      .withMessage('邮箱格式不正确')
      .normalizeEmail()
  ],
  handleValidationErrors,
  authController.registerWithSms
);

/**
 * 重置密码 - 发送验证码
 * POST /api/v1/auth/reset-password/send-code
 */
router.post('/reset-password/send-code',
  [
    body('phone')
      .trim()
      .matches(/^1[3-9]\d{9}$/)
      .withMessage('手机号格式不正确')
  ],
  handleValidationErrors,
  authController.sendResetPasswordCode
);

/**
 * 重置密码 - 验证码确认
 * POST /api/v1/auth/reset-password/confirm
 */
router.post('/reset-password/confirm',
  [
    body('phone')
      .trim()
      .matches(/^1[3-9]\d{9}$/)
      .withMessage('手机号格式不正确'),

    body('code')
      .isLength({ min: 6, max: 6 })
      .withMessage('验证码必须是6位数字'),

    body('newPassword')
      .isLength({ min: 6, max: 128 })
      .withMessage('新密码长度必须在6-128个字符之间')
  ],
  handleValidationErrors,
  authController.resetPasswordWithCode
);

module.exports = router;