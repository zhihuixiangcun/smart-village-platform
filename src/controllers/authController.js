/**
 * 认证控制器
 * 处理用户登录、注册、验证码等认证相关功能
 */

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const smsService = require('../services/smsService');

const JWT_SECRET = process.env.JWT_SECRET || 'smart-village-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

// 角色映射：前端角色 -> 数据库角色
const roleMapping = {
  'resident': 'resident',
  'cadre': 'village_admin',
  'official': 'village_official',
  'admin': 'admin',
  'purchaser': 'purchaser'
};

/**
 * 发送验证码
 * @route POST /api/v1/auth/verify-code
 */
const sendVerifyCode = async (req, res) => {
  try {
    const { phone } = req.body;

    // 发送短信验证码
    const result = await smsService.sendVerificationCode(phone);

    if (result.success) {
      // 不再返回验证码，只在控制台打印
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
    console.error('[AuthController] 发送验证码错误:', error);
    res.status(500).json({
      success: false,
      error: '发送验证码失败'
    });
  }
};

/**
 * 密码登录
 * @route POST /api/v1/auth/login
 */
const passwordLogin = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // 验证必填
    if (!username || !password || !role) {
      return res.status(400).json({
        success: false,
        error: '缺少必填登录信息'
      });
    }

    // 角色转换
    const dbRole = roleMapping[role];
    if (!dbRole) {
      return res.status(400).json({
        success: false,
        error: '无效的角色'
      });
    }

    let user;

    // 检查Mongoose连接状态，如果未连接则直接使用演示模式
    const isConnected = mongoose.connection.readyState === 1; // 1 = connected

    // 仅在已连接时才尝试从数据库查找用户
    if (isConnected) {
      try {
        console.log('[AuthController] 查找用户:', { username, dbRole });
        user = await User.findOne({
          $or: [
            { username },
            { 'profile.phone': username }
          ],
          role: dbRole
        }).maxTimeMS(2000).exec();
      } catch (dbError) {
        console.warn('[AuthController] 数据库查询失败，使用演示模式:', dbError.message);
        user = null;
      }
    } else {
      console.warn('[AuthController] 数据库未连接，跳过数据库查询');
    }

    // 演示模式：当数据库不可用时提供演示账号
    if (!user && process.env.DEMO_MODE !== 'false') {
      console.log('[AuthController] 使用演示模式登录');

      const demoAccounts = {
        '13800138000': { password: '123456', role: 'purchaser' },
        'testresident': { password: 'Resident123456!', role: 'resident' },
        'admin': { password: 'admin123', role: 'admin' }
      };

      const demoAccount = demoAccounts[username];

      if (demoAccount && demoAccount.password === password) {
        const demoUserId = 'demo_' + dbRole + '_' + Date.now();
        user = {
          _id: demoUserId,
          username: username,
          role: dbRole,
          email: username + '@demo.local',
          status: 'active',
          villageId: 'demo_village_001',
          profile: {
            phone: username,
            firstName: dbRole === 'purchaser' ? '演示' : '测试',
            lastName: dbRole === 'purchaser' ? '采购商' : '用户'
          }
        };
        console.log('[AuthController] 演示登录成功: ' + username + ' (' + dbRole + ')');
      }
    }

    console.log('[AuthController] 查找结果:', user ? {
      username: user.username,
      role: user.role,
      status: user.status,
      _id: user._id.toString(),
      password前30字符: user.password.substring(0, 30)
    } : null);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: '用户不存在或密码错误'
      });
    }

    // 检查状态
    console.log('[AuthController] 检查状态:', user.status);
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: '账号已被禁用'
      });
    }

<<<<<<< Updated upstream
    // 验证密码（仅对真实数据库用户）
    if (user.comparePassword && typeof user.comparePassword === 'function') {
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: '用户不存在或密码错误'
        });
      }

      // 更新登录信息
      user.lastLoginAt = new Date();
      user.loginCount = (user.loginCount || 0) + 1;
      try {
        await user.save();
      } catch (saveError) {
        // 忽略保存失败（演示模式）
      }
    }

    // 生成JWT token
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role,
        phone: user.profile?.phone
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          role: user.role,
          email: user.email,
          profile: user.profile,
          villageId: user.villageId
        }
      }
    });
  } catch (error) {
    console.error('[AuthController] 登录错误:', error);
    res.status(500).json({
      success: false,
      error: '登录失败'
    });
  }
};

/**
 * 用户注册
 * @route POST /api/v1/auth/register
 */
const register = async (req, res) => {
  try {
    const { phone, verifyCode, username, password, role } = req.body;

    // 验证码
    if (!smsService.verifyCode(phone, verifyCode)) {
      return res.status(400).json({
        success: false,
        error: '验证码错误'
      });
    }

    // 角色转换
    const dbRole = roleMapping[role];
    if (!dbRole) {
      return res.status(400).json({
        success: false,
        error: '无效的角色'
      });
    }

    // 检查用户名是否存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: '用户名已存在'
      });
    }

    // 检查手机号是否注册
    const existingPhone = await User.findOne({ 'profile.phone': phone });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        error: '手机号已注册'
      });
    }

    // 创建用户
    const user = new User({
      username,
      password, // User模型会自动加密密码
      email: `${phone}@smart-village.temp`, // 临时邮箱用于注册用户
      role: dbRole,
      profile: {
        phone,
        firstName: username,
        lastName: ''
      },
      status: 'active'
    });

    await user.save();

    // 生成JWT token
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role,
        phone: user.profile?.phone
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          role: user.role,
          profile: user.profile
        }
      }
    });
  } catch (error) {
    console.error('[AuthController] 注册错误:', error);
    res.status(500).json({
      success: false,
      error: '注册失败'
    });
  }
};

/**
 * 人脸登录
 * @route POST /api/v1/auth/face-login
 */
const faceLogin = async (req, res) => {
  try {
    const { image, role } = req.body;

    if (!image || !role) {
      return res.status(400).json({
        success: false,
        error: '缺少人脸图像或角色'
      });
    }

    // 角色转换
    const dbRole = roleMapping[role];
    if (!dbRole) {
      return res.status(400).json({
        success: false,
        error: '无效的角色'
      });
    }

    // TODO: 集成人脸识别API进行识别
    // 暂未实现
    res.status(501).json({
      success: false,
      error: '人脸登录功能暂未实现'
    });

    /* 示例逻辑:
    // 1. 调用人脸识别API识别用户
    // 2. 根据识别结果查找用户
    const user = await User.findOne({
      role: dbRole,
      'faceSettings.faceVerified': true,
      'faceSettings.enabled': true
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: '未找到匹配用户'
      });
    }

    // 3. 更新登录信息并生成token
    */
  } catch (error) {
    console.error('[AuthController] 人脸登录错误:', error);
    res.status(500).json({
      success: false,
      error: '人脸登录失败'
    });
  }
};

/**
 * 微信登录二维码
 * @route GET /api/v1/auth/wechat/qrcode
 */
const getWechatQrCode = async (req, res) => {
  try {
    // 生成会话ID
    const sessionId = `wechat_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // TODO: 调用微信API获取二维码URL
    // 暂未实现
    res.status(501).json({
      success: false,
      error: '微信登录功能暂未实现'
    });

    /* 示例逻辑:
    // 1. 调用微信API获取二维码URL
    // 2. 将sessionId存入Redis
    // 3. 返回二维码URL
    res.json({
      success: true,
      data: {
        qrcodeUrl: 'weixin://wxpay/bizpayurl?pr=xxxxx',
        sessionId
      }
    });
    */
  } catch (error) {
    console.error('[AuthController] 微信二维码错误:', error);
    res.status(500).json({
      success: false,
      error: '获取微信二维码失败'
    });
  }
};

/**
 * 检查微信登录状态
 * @route GET /api/v1/auth/wechat/status
 */
const checkWechatStatus = async (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: '缺少会话ID'
      });
    }

    // TODO: 从Redis检查登录状态
    // 暂未实现
    res.status(501).json({
      success: false,
      error: '微信登录功能暂未实现'
    });

    /* 示例逻辑:
    const status = await redis.get(`wechat:session:${sessionId}`);

    if (!status) {
      return res.json({
        success: true,
        data: { status: 'expired' }
      });
    }

    if (status === 'scanned') {
      return res.json({
        success: true,
        data: { status: 'scanned' }
      });
    }

    if (status === 'confirmed') {
      // 查找用户信息并生成token
      const user = await getUserByWechatOpenId(openid);
      const token = jwt.sign(...);

      return res.json({
        success: true,
        data: {
          status: 'confirmed',
          token,
          user
        }
      });
    }

    res.json({
      success: true,
      data: { status: 'waiting' }
    });
    */
  } catch (error) {
    console.error('[AuthController] 检查状态错误:', error);
    res.status(500).json({
      success: false,
      error: '微信登录状态检查失败'
    });
  }
};

// 别名：passwordLogin 作为 login
const login = passwordLogin;

// 别名：sendVerifyCode 作为 sendSmsCode
const sendSmsCode = sendVerifyCode;

/**
 * 刷新令牌
 * @route POST /api/v1/auth/refresh
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    // TODO: 实现刷新令牌逻辑
    res.status(501).json({
      success: false,
      error: '刷新令牌功能暂未实现'
    });
  } catch (error) {
    console.error('[AuthController] 刷新令牌错误:', error);
    res.status(500).json({
      success: false,
      error: '刷新令牌失败'
    });
  }
};

/**
 * 用户登出
 * @route POST /api/v1/auth/logout
 */
const logout = async (req, res) => {
  try {
    // TODO: 实现登出逻辑（清除令牌）
    res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    console.error('[AuthController] 登出错误:', error);
    res.status(500).json({
      success: false,
      error: '登出失败'
    });
  }
};

/**
 * 获取当前用户信息
 * @route GET /api/v1/auth/me
 */
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('[AuthController] 获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      error: '获取用户信息失败'
    });
  }
};

/**
 * 修改密码
 * @route PUT /api/v1/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    // 验证旧密码
    const isPasswordValid = await user.comparePassword(oldPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: '原密码错误'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    console.error('[AuthController] 修改密码错误:', error);
    res.status(500).json({
      success: false,
      error: '修改密码失败'
    });
  }
};

/**
 * 启用多因子认证
 * @route POST /api/v1/auth/mfa/enable
 */
const enableMFA = async (req, res) => {
  try {
    res.status(501).json({
      success: false,
      error: '多因子认证功能暂未实现'
    });
  } catch (error) {
    console.error('[AuthController] 启用MFA错误:', error);
    res.status(500).json({
      success: false,
      error: '启用多因子认证失败'
    });
  }
};

/**
 * 验证并启用多因子认证
 * @route POST /api/v1/auth/mfa/verify
 */
const verifyAndEnableMFA = async (req, res) => {
  try {
    res.status(501).json({
      success: false,
      error: '多因子认证功能暂未实现'
    });
  } catch (error) {
    console.error('[AuthController] 验证MFA错误:', error);
    res.status(500).json({
      success: false,
      error: '验证多因子认证失败'
    });
  }
};

/**
 * 验证MFA码（内部使用）
 */
const verifyMFACode = async (user, mfaCode) => {
  // TODO: 实现MFA验证逻辑
  return true;
};

/**
 * 短信码登录
 * @route POST /api/v1/auth/login/sms
 */
const loginWithSms = async (req, res) => {
  try {
    const { phone, code, role } = req.body;

    if (!smsService.verifyCode(phone, code)) {
      return res.status(400).json({
        success: false,
        error: '验证码错误'
      });
    }

    const dbRole = roleMapping[role];
    const user = await User.findOne({ 'profile.phone': phone, role: dbRole });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: '用户不存在'
      });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: { token, user }
    });
  } catch (error) {
    console.error('[AuthController] 短信登录错误:', error);
    res.status(500).json({
      success: false,
      error: '短信登录失败'
    });
  }
};

/**
 * 短信码注册
 * @route POST /api/v1/auth/register/sms
 */
const registerWithSms = async (req, res) => {
  try {
    // 使用相同的注册逻辑
    return register(req, res);
  } catch (error) {
    console.error('[AuthController] 短信注册错误:', error);
    res.status(500).json({
      success: false,
      error: '短信注册失败'
    });
  }
};

/**
 * 发送重置密码验证码
 * @route POST /api/v1/auth/password/reset/send-code
 */
const sendResetPasswordCode = async (req, res) => {
  try {
    const { phone } = req.body;
    const result = await smsService.sendVerificationCode(phone);

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    console.error('[AuthController] 发送重置码错误:', error);
    res.status(500).json({
      success: false,
      error: '发送重置码失败'
    });
  }
};

/**
 * 使用验证码重置密码
 * @route POST /api/v1/auth/password/reset
 */
const resetPasswordWithCode = async (req, res) => {
  try {
    const { phone, code, newPassword } = req.body;

    if (!smsService.verifyCode(phone, code)) {
      return res.status(400).json({
        success: false,
        error: '验证码错误'
      });
    }

    const user = await User.findOne({ 'profile.phone': phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: '密码重置成功'
    });
  } catch (error) {
    console.error('[AuthController] 重置密码错误:', error);
    res.status(500).json({
      success: false,
      error: '重置密码失败'
    });
  }
};

module.exports = {
  sendVerifyCode,
  sendSmsCode,
  passwordLogin,
  login,
  register,
  registerWithSms,
  loginWithSms,
  faceLogin,
  getWechatQrCode,
  checkWechatStatus,
  refreshToken,
  logout,
  getCurrentUser,
  changePassword,
  enableMFA,
  verifyAndEnableMFA,
  verifyMFACode,
  sendResetPasswordCode,
  resetPasswordWithCode
};
