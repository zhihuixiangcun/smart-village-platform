/**
 * 统一认证控制器
 * 支持密码登录、人脸识别、微信登录、注册等功能
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Resident = require('../models/Resident');
const User = require('../models/User');
const logger = require('../utils/logger');

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'smart-village-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

/**
 * 密码登录
 */
const passwordLogin = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({
        success: false,
        error: '请填写完整信息'
      });
    }

    // 根据角色查找用户
    let user;
    switch (role) {
      case 'resident':
        user = await Resident.findOne({
          $or: [{ phone: username }, { idCard: username }]
        });
        break;
      default:
        user = await User.findOne({
          $or: [{ username }, { phone: username }],
          role
        });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      });
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password || user.hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      });
    }

    // 生成token
    const token = jwt.sign(
      { id: user._id, phone: user.phone, role: user.role || role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    user.lastLoginAt = new Date();
    await user.save();

    logger.info(\`用户登录成功: \${user.phone} (\${role})\`);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          role: user.role || role
        }
      }
    });
  } catch (error) {
    logger.error('密码登录失败:', error);
    res.status(500).json({
      success: false,
      error: '登录失败'
    });
  }
};

/**
 * 发送验证码
 */
const sendVerifyCode = async (req, res) => {
  try {
    const { phone, type = 'register' } = req.body;
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // TODO: 实际发送短信
    logger.info(\`发送验证码: \${phone} - \${code}\`);

    res.json({
      success: true,
      data: { code }, // 开发环境返回验证码
      message: '验证码已发送'
    });
  } catch (error) {
    logger.error('发送验证码失败:', error);
    res.status(500).json({
      success: false,
      error: '发送验证码失败'
    });
  }
};

/**
 * 用户注册
 */
const register = async (req, res) => {
  try {
    const { phone, verifyCode, username, password, role } = req.body;

    if (!phone || !verifyCode || !username || !password || !role) {
      return res.status(400).json({
        success: false,
        error: '请填写完整信息'
      });
    }

    // 加密密码
    const hash = await bcrypt.hash(password, 10);

    let user;
    if (role === 'resident') {
      user = new Resident({
        phone,
        name: username,
        password: hash,
        status: 'active'
      });
    } else {
      user = new User({
        phone,
        username,
        name: username,
        password: hash,
        role,
        status: 'pending'
      });
    }

    await user.save();

    const token = jwt.sign(
      { id: user._id, phone: user.phone, role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: { token },
      message: '注册成功'
    });
  } catch (error) {
    logger.error('用户注册失败:', error);
    res.status(500).json({
      success: false,
      error: '注册失败'
    });
  }
};

/**
 * 人脸识别登录（简化版）
 */
const faceLogin = async (req, res) => {
  try {
    const { image, role } = req.body;

    // TODO: 实际调用人脸识别API
    logger.info(\`人脸识别登录请求: role=\${role}\`);

    res.status(501).json({
      success: false,
      error: '人脸识别功能待实现'
    });
  } catch (error) {
    logger.error('人脸识别登录失败:', error);
    res.status(500).json({
      success: false,
      error: '人脸识别失败'
    });
  }
};

/**
 * 获取微信登录二维码
 */
const getWechatQrCode = async (req, res) => {
  try {
    // TODO: 实际生成微信登录二维码
    res.status(501).json({
      success: false,
      error: '微信登录功能待实现'
    });
  } catch (error) {
    logger.error('获取微信二维码失败:', error);
    res.status(500).json({
      success: false,
      error: '生成二维码失败'
    });
  }
};

/**
 * 检查微信扫码状态
 */
const checkWechatStatus = async (req, res) => {
  try {
    // TODO: 实际检查微信扫码状态
    res.json({
      success: true,
      data: { status: 'waiting' }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '检查状态失败'
    });
  }
};

module.exports = {
  passwordLogin,
  sendVerifyCode,
  register,
  faceLogin,
  getWechatQrCode,
  checkWechatStatus
};
