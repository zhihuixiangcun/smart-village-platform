/**
 * 智慧乡村综合服务平台 - 认证路由
 * 提供完整的认证API接口
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const auth = require('../api/smartVillageAuth');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const router = express.Router();

// 配置文件上传
const upload = multer({
  dest: 'temp/',
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG、JPEG、PNG 格式的图片'), false);
    }
  }
});

/**
 * 密码登录
 * POST /api/auth/login
 */
router.post('/login', auth.authLimiter, auth.passwordLogin);

/**
 * 人脸识别登录
 * POST /api/auth/login/face
 */
router.post('/login/face', upload.single('faceImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传人脸照片'
      });
    }

    // 读取图片文件并转换为base64
    const imageBuffer = fs.readFileSync(req.file.path);
    const imageBase64 = `data:${req.file.mimetype};base64,${imageBuffer.toString('base64')}`;

    // 构造请求数据
    const requestData = {
      image: imageBase64,
      villageId: req.body.villageId,
      deviceInfo: {
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        timestamp: new Date().toISOString()
      }
    };

    // 调用人脸登录函数
    req.body = requestData;
    await auth.faceLogin(req, res);

    // 清理临时文件
    try {
      fs.unlinkSync(req.file.path);
    } catch (error) {
      logger.error('清理临时文件失败:', error);
    }

  } catch (error) {
    logger.error('人脸登录处理错误:', error);
    // 清理临时文件
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        logger.error('清理临时文件失败:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: '人脸识别服务异常'
    });
  }
});

/**
 * 语音登录
 * POST /api/auth/login/voice
 */
router.post('/login/voice', auth.voiceLogin);

/**
 * 发送验证码
 * POST /api/auth/send-code
 */
router.post('/send-code', auth.sendVerificationCode);

/**
 * 重置密码
 * POST /api/auth/reset-password
 */
router.post('/reset-password', auth.resetPassword);

/**
 * 用户注册
 * POST /api/auth/register
 */
router.post('/register', auth.registerUser);

/**
 * 刷新Token
 * POST /api/auth/refresh
 */
router.post('/refresh', auth.refreshToken);

/**
 * 登出
 * POST /api/auth/logout
 */
router.post('/logout', authenticateToken, auth.logout);

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const VillageUser = require('../models/VillageUser');

    const user = await VillageUser.findById(req.user.userId)
      .populate('villageId', 'name code')
      .populate('residentProfileId', 'idCard address');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      user: auth.formatUserInfo(user)
    });

  } catch (error) {
    logger.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

/**
 * 更新用户资料
 * PUT /api/auth/profile
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, avatar } = req.body;
    const VillageUser = require('../models/VillageUser');

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (avatar) updateData.avatar = avatar;

    await VillageUser.updateOne(
      { _id: req.user.userId },
      { $set: updateData }
    );

    res.json({
      success: true,
      message: '资料更新成功'
    });

  } catch (error) {
    logger.error('更新用户资料错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

/**
 * 修改密码
 * PUT /api/auth/change-password
 */
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const bcrypt = require('bcryptjs');
    const VillageUser = require('../models/VillageUser');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '请输入当前密码和新密码'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码长度不能少于6位'
      });
    }

    // 获取用户当前信息
    const user = await VillageUser.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 验证当前密码
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: '当前密码错误'
      });
    }

    // 加密新密码
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await VillageUser.updateOne(
      { _id: req.user.userId },
      {
        $set: {
          password: hashedNewPassword,
          passwordChangedAt: new Date(),
          requirePasswordChange: false
        }
      }
    );

    // 记录审计日志
    const AuditLog = require('../models/AuditLog');
    await new AuditLog({
      event: 'password_changed',
      userId: req.user.userId,
      timestamp: new Date(),
      ip: req.ip
    }).save();

    res.json({
      success: true,
      message: '密码修改成功'
    });

  } catch (error) {
    logger.error('修改密码错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

/**
 * 注册人脸信息
 * POST /api/auth/register-face
 */
router.post('/register-face', authenticateToken, upload.single('faceImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传人脸照片'
      });
    }

    const { name, description } = req.body;

    // 读取图片文件
    const imageBuffer = fs.readFileSync(req.file.path);
    const imageBase64 = `data:${req.file.mimetype};base64,${imageBuffer.toString('base64')}`;

    // 调用人脸注册服务
    const axios = require('axios');
    const FACE_RECOGNITION_CONFIG = {
      endpoint: process.env.FACE_RECOGNITION_ENDPOINT || 'http://localhost:5001',
      apiKey: process.env.FACE_RECOGNITION_API_KEY || 'face_api_key'
    };

    try {
      const response = await axios.post(`${FACE_RECOGNITION_CONFIG.endpoint}/register`, {
        user_id: req.user.userId,
        image: imageBase64,
        name,
        description,
        village_id: req.user.villageId
      }, {
        headers: {
          'Authorization': `Bearer ${FACE_RECOGNITION_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      // 更新用户的人脸注册状态
      const VillageUser = require('../models/VillageUser');
      await VillageUser.updateOne(
        { _id: req.user.userId },
        {
          $set: {
            faceRegistered: true,
            faceRegisteredAt: new Date()
          }
        }
      );

      // 记录审计日志
      const AuditLog = require('../models/AuditLog');
      await new AuditLog({
        event: 'face_registered',
        userId: req.user.userId,
        timestamp: new Date(),
        ip: req.ip
      }).save();

      res.json({
        success: true,
        message: '人脸信息注册成功',
        faceId: response.data.face_id
      });

    } catch (faceError) {
      logger.error('人脸注册服务错误:', faceError);
      res.status(500).json({
        success: false,
        message: '人脸注册服务异常，请稍后重试'
      });
    }

    // 清理临时文件
    try {
      fs.unlinkSync(req.file.path);
    } catch (error) {
      logger.error('清理临时文件失败:', error);
    }

  } catch (error) {
    logger.error('注册人脸信息错误:', error);
    // 清理临时文件
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        logger.error('清理临时文件失败:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

/**
 * 检查人脸注册状态
 * GET /api/auth/face-status
 */
router.get('/face-status', authenticateToken, async (req, res) => {
  try {
    const VillageUser = require('../models/VillageUser');

    const user = await VillageUser.findById(req.user.userId, 'faceRegistered faceRegisteredAt');

    res.json({
      success: true,
      faceRegistered: user?.faceRegistered || false,
      faceRegisteredAt: user?.faceRegisteredAt || null
    });

  } catch (error) {
    logger.error('检查人脸注册状态错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

/**
 * 获取登录历史
 * GET /api/auth/login-history
 */
router.get('/login-history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const VillageUser = require('../models/VillageUser');
    const logger = require('../utils/logger');

    const user = await VillageUser.findById(
      req.user.userId,
      'loginHistory'
    ).populate('loginHistory.deviceInfo.agent', 'type brand');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const loginHistory = user.loginHistory || [];
    const total = loginHistory.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedHistory = loginHistory.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        history: paginatedHistory.reverse(), // 最新的在前面
        pagination: {
          current: parseInt(page),
          pageSize: parseInt(limit),
          total
        }
      }
    });

  } catch (error) {
    logger.error('获取登录历史错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

/**
 * 检查Token有效性
 * GET /api/auth/verify
 */
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token有效',
    user: req.user
  });
});

/**
 * 获取用户权限列表
 * GET /api/auth/permissions
 */
router.get('/permissions', authenticateToken, (req, res) => {
  res.json({
    success: true,
    permissions: req.user.permissions
  });
});

/**
 * 检查特定权限
 * POST /api/auth/check-permission
 */
router.post('/check-permission', authenticateToken, (req, res) => {
  const { permission } = req.body;

  if (!permission) {
    return res.status(400).json({
      success: false,
      message: '请提供要检查的权限'
    });
  }

  const hasPermission = req.user.permissions.includes('*') ||
                      req.user.permissions.includes(permission);

  res.json({
    success: true,
    hasPermission,
    permission
  });
});

/**
 * 健康检查
 * GET /api/auth/health
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '认证服务运行正常',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;