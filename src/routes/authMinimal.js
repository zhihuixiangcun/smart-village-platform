/**
 * 认证路由 - 最小化版本
 * 仅包含已实现的端点用于测试
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { body, validationResult } = require('express-validator');
const { handleValidationErrors } = require('../middleware/apiValidation');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// 配置文件上传
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/temp');
    await fs.mkdir(uploadDir, { recursive: true }).catch(() => {});
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()  }-${  Math.round(Math.random() * 1E9)}`;
    cb(null, `${file.fieldname  }-${  uniqueSuffix  }${path.extname(file.originalname)}`);
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
        sessionId,  // 会话ID
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
 * 发送验证码（前端兼容路由）
 * POST /api/v1/auth/send-code
 * 与 /verify-code 功能相同，用于前端兼容
 */
router.post('/send-code', async (req, res) => {
  console.log('[AuthMinimal] /send-code called, body:', JSON.stringify(req.body));
  console.log('[AuthMinimal] req.body exists:', !!req.body);

  try {
    const smsService = require('../services/smsService');
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: '手机号不能为空'
      });
    }

    const result = await smsService.sendVerificationCode(phone);

    if (result.success) {
      res.json({
        success: true,
        message: '验证码已发送'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    console.error('[AuthMinimal] Send code error:', error);
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

/**
 * 文件上传（通用接口）
 * POST /api/v1/auth/upload
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  console.log('[AuthMinimal] ===== FILE UPLOAD START =====');
  console.log('[AuthMinimal] File:', req.file);

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请选择要上传的文件'
      });
    }

    // 返回文件信息
    res.json({
      success: true,
      message: '文件上传成功',
      data: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: `/uploads/temp/${req.file.filename}`,
        url: `/uploads/temp/${req.file.filename}`
      }
    });

    console.log('[AuthMinimal] ===== FILE UPLOAD SUCCESS =====');
  } catch (error) {
    console.error('[AuthMinimal] Upload error:', error);
    res.status(500).json({
      success: false,
      error: '文件上传失败',
      details: error.message
    });
  }
});

/**
 * 身份证上传（批量接口）
 * POST /api/v1/auth/upload/idcard
 */
router.post('/upload/idcard', upload.fields([
  { name: 'idCardFront', maxCount: 1 },
  { name: 'idCardBack', maxCount: 1 }
]), async (req, res) => {
  console.log('[AuthMinimal] ===== ID CARD UPLOAD START =====');
  console.log('[AuthMinimal] Files:', req.files);

  try {
    if (!req.files || (!req.files.idCardFront && !req.files.idCardBack)) {
      return res.status(400).json({
        success: false,
        error: '请上传身份证照片'
      });
    }

    const result = {
      success: true,
      message: '身份证上传成功',
      data: {}
    };

    if (req.files.idCardFront) {
      result.data.idCardFront = {
        filename: req.files.idCardFront[0].filename,
        originalname: req.files.idCardFront[0].originalname,
        path: `/uploads/temp/${req.files.idCardFront[0].filename}`,
        url: `/uploads/temp/${req.files.idCardFront[0].filename}`
      };
    }

    if (req.files.idCardBack) {
      result.data.idCardBack = {
        filename: req.files.idCardBack[0].filename,
        originalname: req.files.idCardBack[0].originalname,
        path: `/uploads/temp/${req.files.idCardBack[0].filename}`,
        url: `/uploads/temp/${req.files.idCardBack[0].filename}`
      };
    }

    console.log('[AuthMinimal] ===== ID CARD UPLOAD SUCCESS =====');
    res.json(result);
  } catch (error) {
    console.error('[AuthMinimal] ID card upload error:', error);
    res.status(500).json({
      success: false,
      error: '身份证上传失败',
      details: error.message
    });
  }
});

module.exports = router;
