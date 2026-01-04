/**
 * 认证路由 - 最小化版本
 * 仅包含已实现的端点用于测试
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { body, validationResult } = require('express-validator');
const { handleValidationErrors } = require('../middleware/apiValidation');

// 测试端点
router.get('/test', (req, res) => {
  console.log('[AuthMinimal] Test endpoint called!');
  res.json({
    success: true,
    message: 'Auth routes are working!',
    timestamp: new Date().toISOString()
  });
});

// 最简单的登录测试端点（无验证）
router.post('/login-test', async (req, res) => {
  console.log('[AuthMinimal] ===== LOGIN TEST START =====');
  console.log('[AuthMinimal] Request body:', JSON.stringify(req.body));

  try {
    const { username, password, role } = req.body;
    const User = require('../models/User');
    const jwt = require('jsonwebtoken');
    const { v4: uuidv4 } = require('uuid');
    const authMiddleware = require('../middleware/auth');

    // 查找用户
    const user = await User.findOne({ username, role });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // 验证密码
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password'
      });
    }

    // 生成sessionId和创建会话
    const sessionId = uuidv4();
    const sessionData = {
      sessionId,
      userId: user._id,
      username: user.username,
      role: user.role,
      loginTime: new Date(),
      lastActivity: new Date(),
      deviceInfo: {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      },
      status: 'active'
    };

    // 将会话添加到auth中间件的activeSessions
    const auth = require('../middleware/auth');
    auth.activeSessions.set(sessionId, sessionData);

    // 生成符合auth中间件要求的token
    // 必须使用与auth中间件相同的JWT_SECRET，否则验证会失败
    const token = jwt.sign(
      {
        userId: user._id.toString(),  // 必须是字符串
        username: user.username,
        role: user.role,
        sessionId: sessionId,  // 会话ID
        permissions: user.permissions || []  // 用户权限
      },
      auth.jwtSecret,  // 使用auth中间件的密钥（已在上面require）
      { expiresIn: '7d' }
    );

    console.log('[AuthMinimal] ===== LOGIN SUCCESS =====');
    console.log('[AuthMinimal] Session created:', sessionId);
    res.json({
      success: true,
      data: {
        token,
        sessionId,
        user: {
          id: user._id,
          username: user.username,
          role: user.role,
          email: user.email,
          permissions: user.permissions || []
        }
      }
    });
  } catch (error) {
    console.error('[AuthMinimal] Login-test error:', error);
    res.status(500).json({
      success: false,
      error: 'Login test failed',
      details: error.message
    });
  }
});

/**
 * 发送验证码
 * POST /api/v1/auth/verify-code
 */
router.post('/verify-code', async (req, res) => {
  try {
    const { phone } = req.body;
    const result = await authController.sendVerifyCode(phone);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        ...(process.env.NODE_ENV === 'development' && { code: result.code })
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    console.error('[AuthRoutes] Send code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send verification code'
    });
  }
});

/**
 * 密码登录
 * POST /api/v1/auth/login
 */
router.post('/login',
  [
    body('username').trim().notEmpty().withMessage('用户名不能为空'),
    body('password').notEmpty().withMessage('密码不能为空'),
    body('role').notEmpty().withMessage('角色不能为空')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    console.log('[AuthMinimal] ===== LOGIN ATTEMPT START =====');
    console.log('[AuthMinimal] Request body:', JSON.stringify(req.body));
    try {
      console.log('[AuthMinimal] Calling authController.passwordLogin...');
      await authController.passwordLogin(req, res);
      console.log('[AuthMinimal] ===== LOGIN ATTEMPT END =====');
    } catch (error) {
      console.error('[AuthMinimal] Login error:', error);
      console.error('[AuthMinimal] Error stack:', error.stack);
      res.status(500).json({
        success: false,
        error: 'Login failed',
        details: error.message
      });
    }
  }
);

/**
 * 用户注册
 * POST /api/v1/auth/register
 */
router.post('/register',
  [
    body('phone').trim().notEmpty().withMessage('手机号不能为空'),
    body('verifyCode').isLength({ min: 6, max: 6 }).withMessage('验证码必须是6位数字'),
    body('username').trim().isLength({ min: 3, max: 50 }).withMessage('用户名长度必须在3-50个字符之间'),
    body('password').isLength({ min: 6, max: 128 }).withMessage('密码长度必须在6-128个字符之间'),
    body('role').optional().isIn(['resident', 'cadre', 'official', 'admin']).withMessage('角色不正确')
  ],
  handleValidationErrors,
  authController.register
);

module.exports = router;
