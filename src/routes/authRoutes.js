/**
 * 统一认证路由
 * 支持密码登录、人脸识别、微信登录、注册等功能
 */

const express = require('express');
const router = express.Router();
const {
  passwordLogin,
  sendVerifyCode,
  register,
  faceLogin,
  getWechatQrCode,
  checkWechatStatus
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// 登录限流配置
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 每个IP最多5次登录尝试
  message: {
    success: false,
    error: '登录尝试次数过多，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 验证码限流配置
const verifyCodeRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 10, // 每个手机号最多10次
  keyGenerator: (req) => req.body.phone,
  message: {
    success: false,
    error: '验证码发送次数过多，请稍后再试'
  }
});

/**
 * @route   POST /api/v1/auth/login
 * @desc    密码登录
 * @access  Public
 * @body    {string} username - 用户名或手机号
 * @body    {string} password - 密码
 * @body    {string} role - 用户角色 (resident|cadre|official|admin)
 */
router.post('/login',
  loginRateLimit,
  [
    body('username').notEmpty().withMessage('请输入用户名'),
    body('password').isLength({ min: 6 }).withMessage('密码至少6位'),
    body('role').isIn(['resident', 'cadre', 'official', 'admin']).withMessage('无效的用户角色')
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }
    next();
  },
  passwordLogin
);

/**
 * @route   POST /api/v1/auth/verify-code
 * @desc    发送验证码
 * @access  Public
 * @body    {string} phone - 手机号
 * @body    {string} type - 验证码类型 (register|login|reset)
 */
router.post('/verify-code',
  verifyCodeRateLimit,
  [
    body('phone').isMobilePhone('zh-CN').withMessage('请输入有效的手机号'),
    body('type').optional().isIn(['register', 'login', 'reset'])
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }
    next();
  },
  sendVerifyCode
);

/**
 * @route   POST /api/v1/auth/register
 * @desc    用户注册
 * @access  Public
 * @body    {string} phone - 手机号
 * @body    {string} verifyCode - 验证码
 * @body    {string} username - 用户名
 * @body    {string} password - 密码
 * @body    {string} role - 用户角色
 */
router.post('/register',
  [
    body('phone').isMobilePhone('zh-CN').withMessage('请输入有效的手机号'),
    body('verifyCode').isLength({ min: 6, max: 6 }).withMessage('验证码格式错误'),
    body('username').isLength({ min: 2, max: 20 }).withMessage('用户名长度为2-20个字符'),
    body('password').isLength({ min: 6, max: 20 }).withMessage('密码长度为6-20个字符'),
    body('role').isIn(['resident', 'cadre', 'official', 'admin']).withMessage('无效的用户角色')
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }
    next();
  },
  register
);

/**
 * @route   POST /api/v1/auth/face-login
 * @desc    人脸识别登录
 * @access  Public
 * @body    {string} image - 人脸图像数据
 * @body    {string} role - 用户角色
 */
router.post('/face-login',
  loginRateLimit,
  [
    body('image').notEmpty().withMessage('请提供人脸图像'),
    body('role').isIn(['resident', 'cadre', 'official', 'admin']).withMessage('无效的用户角色')
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }
    next();
  },
  faceLogin
);

/**
 * @route   GET /api/v1/auth/wechat/qrcode
 * @desc    获取微信登录二维码
 * @access  Public
 */
router.get('/wechat/qrcode', getWechatQrCode);

/**
 * @route   GET /api/v1/auth/wechat/status
 * @desc    检查微信扫码状态
 * @access  Public
 * @query   {string} sessionId - 会话ID
 */
router.get('/wechat/status', checkWechatStatus);

/**
 * @route   GET /api/v1/auth/me
 * @desc    获取当前用户信息
 * @access  Private
 */
router.get('/me',
  authenticateToken,
  async (req, res) => {
    try {
      // req.user 由 authenticateToken 中间件设置
      res.json({
        success: true,
        data: req.user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: '获取用户信息失败'
      });
    }
  }
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    退出登录
 * @access  Private
 */
router.post('/logout',
  authenticateToken,
  async (req, res) => {
    try {
      // 客户端需要删除本地存储的 token
      // 这里可以添加服务器端的 token 黑名单逻辑（如果需要）
      res.json({
        success: true,
        message: '退出成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: '退出失败'
      });
    }
  }
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    刷新Token
 * @access  Private
 */
router.post('/refresh',
  authenticateToken,
  async (req, res) => {
    try {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'smart-village-secret-key-2024';
      const JWT_EXPIRES_IN = '7d';

      // 生成新token
      const newToken = jwt.sign(
        { id: req.user.id, phone: req.user.phone, role: req.user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        success: true,
        data: { token: newToken }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: '刷新Token失败'
      });
    }
  }
);

module.exports = router;
