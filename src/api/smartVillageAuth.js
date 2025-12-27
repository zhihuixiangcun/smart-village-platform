/**
 * 智慧乡村综合服务平台 - 认证API服务
 * 支持多种登录方式：密码登录、人脸识别、语音识别
 * 提供村委、村民、管理员权限管理
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// 引入模型
const VillageUser = require('../models/VillageUser');
const ResidentProfile = require('../models/ResidentProfile');
const AuditLog = require('../models/AuditLog');

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'smart_village_secret_key_2024';
const JWT_EXPIRE = '24h';

// 人脸识别API配置
const FACE_RECOGNITION_CONFIG = {
  endpoint: process.env.FACE_RECOGNITION_ENDPOINT || 'http://localhost:5001',
  apiKey: process.env.FACE_RECOGNITION_API_KEY || 'face_api_key'
};

// 语音识别API配置
const VOICE_RECOGNITION_CONFIG = {
  endpoint: process.env.VOICE_RECOGNITION_ENDPOINT || 'http://localhost:5002',
  apiKey: process.env.VOICE_RECOGNITION_API_KEY || 'voice_api_key'
};

// 短信服务配置
const SMS_CONFIG = {
  endpoint: process.env.SMS_ENDPOINT,
  apiKey: process.env.SMS_API_KEY,
  template: process.env.SMS_TEMPLATE || 'SMS_123456789'
};

/**
 * 访问频率限制中间件
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10, // 最多10次尝试
  message: {
    success: false,
    message: '登录尝试次数过多，请15分钟后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * 密码登录处理
 */
async function passwordLogin(req, res) {
  try {
    const { phone, password, userType, villageId, remember, deviceInfo } = req.body;

    // 输入验证
    const validationError = validateLoginInput(phone, password, userType, villageId);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    // 查找用户
    const user = await findUserByPhoneAndType(phone, userType, villageId);
    if (!user) {
      await logAuditEvent('login_failed', {
        phone,
        userType,
        villageId,
        reason: 'user_not_found'
      });
      return res.status(401).json({
        success: false,
        message: '用户不存在或账号密码错误'
      });
    }

    // 检查账户状态
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: getAccountStatusMessage(user.status)
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await logAuditEvent('login_failed', {
        userId: user._id,
        phone,
        reason: 'wrong_password'
      });
      return res.status(401).json({
        success: false,
        message: '用户不存在或账号密码错误'
      });
    }

    // 生成JWT token
    const token = generateJWTToken(user, remember);

    // 更新最后登录时间和设备信息
    await updateUserLoginInfo(user._id, {
      lastLogin: new Date(),
      deviceInfo,
      loginMethod: 'password'
    });

    // 记录成功登录
    await logAuditEvent('login_success', {
      userId: user._id,
      phone,
      userType,
      villageId,
      method: 'password'
    });

    // 构造用户信息
    const userInfo = formatUserInfo(user);

    res.json({
      success: true,
      message: '登录成功',
      token,
      user: userInfo
    });

  } catch (error) {
    console.error('密码登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    });
  }
}

/**
 * 人脸识别登录处理
 */
async function faceLogin(req, res) {
  try {
    const { image, villageId, deviceInfo } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: '请提供人脸图像'
      });
    }

    // 临时保存人脸图像
    const tempImagePath = await saveTempImage(image, 'face_login');

    try {
      // 调用人脸识别服务
      const faceResult = await recognizeFace(tempImagePath, villageId);

      if (!faceResult.success || !faceResult.userId) {
        return res.status(401).json({
          success: false,
          message: faceResult.message || '人脸识别失败'
        });
      }

      // 查找用户
      const user = await VillageUser.findById(faceResult.userId)
        .populate('villageId', 'name code');

      if (!user || user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: '用户不存在或账号已禁用'
        });
      }

      // 生成JWT token
      const token = generateJWTToken(user);

      // 更新登录信息
      await updateUserLoginInfo(user._id, {
        lastLogin: new Date(),
        deviceInfo,
        loginMethod: 'face',
        faceData: faceResult.faceData
      });

      // 记录审计日志
      await logAuditEvent('login_success', {
        userId: user._id,
        method: 'face',
        villageId,
        confidence: faceResult.confidence
      });

      const userInfo = formatUserInfo(user);

      res.json({
        success: true,
        message: '人脸识别登录成功',
        token,
        user: userInfo,
        confidence: faceResult.confidence
      });

    } finally {
      // 删除临时图像
      await cleanupTempFile(tempImagePath);
    }

  } catch (error) {
    console.error('人脸登录错误:', error);
    res.status(500).json({
      success: false,
      message: '人脸识别服务异常，请稍后重试'
    });
  }
}

/**
 * 语音识别登录处理
 */
async function voiceLogin(req, res) {
  try {
    const { voiceText, language = 'zh-CN', villageId, deviceInfo } = req.body;

    if (!voiceText) {
      return res.status(400).json({
        success: false,
        message: '请提供语音文本'
      });
    }

    // 语音文本分析，提取手机号和姓名
    const voiceAnalysis = await analyzeVoiceText(voiceText, language);

    if (!voiceAnalysis.success) {
      return res.status(400).json({
        success: false,
        message: voiceAnalysis.message || '语音识别失败'
      });
    }

    const { phone, name, confidence } = voiceAnalysis;

    // 查找用户
    const user = await VillageUser.findOne({
      phone,
      villageId,
      status: 'active'
    }).populate('villageId', 'name code');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '未找到匹配的用户信息'
      });
    }

    // 姓名匹配验证（可选）
    if (name && !isNameMatch(name, user.name)) {
      await logAuditEvent('login_failed', {
        userId: user._id,
        phone,
        method: 'voice',
        reason: 'name_mismatch',
        voiceName: name,
        userName: user.name
      });

      return res.status(401).json({
        success: false,
        message: '用户信息不匹配'
      });
    }

    // 生成JWT token
    const token = generateJWTToken(user);

    // 更新登录信息
    await updateUserLoginInfo(user._id, {
      lastLogin: new Date(),
      deviceInfo,
      loginMethod: 'voice',
      voiceData: {
        language,
        confidence,
        voiceText: voiceText.substring(0, 100) // 只保存前100个字符
      }
    });

    // 记录审计日志
    await logAuditEvent('login_success', {
      userId: user._id,
      method: 'voice',
      villageId,
      language,
      confidence
    });

    const userInfo = formatUserInfo(user);

    res.json({
      success: true,
      message: '语音登录成功',
      token,
      user: userInfo,
      confidence
    });

  } catch (error) {
    console.error('语音登录错误:', error);
    res.status(500).json({
      success: false,
      message: '语音识别服务异常，请稍后重试'
    });
  }
}

/**
 * 发送验证码
 */
async function sendVerificationCode(req, res) {
  try {
    const { phone, type = 'reset' } = req.body;

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: '请输入正确的手机号'
      });
    }

    // 检查发送频率限制
    const lastSent = await getLastVerificationCodeTime(phone);
    if (lastSent && (Date.now() - lastSent.getTime()) < 60000) {
      return res.status(429).json({
        success: false,
        message: '验证码发送过于频繁，请1分钟后再试'
      });
    }

    // 生成验证码
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟后过期

    // 保存验证码
    await saveVerificationCode(phone, code, expiresAt, type);

    // 发送短信
    const smsResult = await sendSMS(phone, code, type);

    if (!smsResult.success) {
      return res.status(500).json({
        success: false,
        message: '验证码发送失败，请稍后重试'
      });
    }

    // 记录审计日志
    await logAuditEvent('verification_code_sent', {
      phone,
      type,
      ip: req.ip
    });

    res.json({
      success: true,
      message: '验证码已发送',
      expiresIn: 300 // 5分钟
    });

  } catch (error) {
    console.error('发送验证码错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    });
  }
}

/**
 * 重置密码
 */
async function resetPassword(req, res) {
  try {
    const { phone, code, newPassword } = req.body;

    // 输入验证
    if (!phone || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '请填写完整信息'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码长度不能少于6位'
      });
    }

    // 验证验证码
    const isValidCode = await verifyCode(phone, code, 'reset');
    if (!isValidCode) {
      return res.status(400).json({
        success: false,
        message: '验证码错误或已过期'
      });
    }

    // 查找用户
    const user = await VillageUser.findOne({ phone, status: 'active' });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await VillageUser.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          passwordResetAt: new Date(),
          requirePasswordChange: false
        }
      }
    );

    // 删除验证码
    await deleteVerificationCode(phone);

    // 记录审计日志
    await logAuditEvent('password_reset', {
      userId: user._id,
      phone,
      ip: req.ip
    });

    res.json({
      success: true,
      message: '密码重置成功'
    });

  } catch (error) {
    console.error('重置密码错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    });
  }
}

/**
 * 用户注册（需要管理员审批）
 */
async function registerUser(req, res) {
  try {
    const {
      name,
      phone,
      idCard,
      password,
      userType = 'villager',
      villageId,
      email,
      address,
      avatar
    } = req.body;

    // 输入验证
    const validationError = validateRegistrationInput(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    // 检查手机号是否已存在
    const existingUser = await VillageUser.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '手机号已注册'
      });
    }

    // 检查身份证号是否已存在
    const existingIdCard = await ResidentProfile.findOne({ idCard });
    if (existingIdCard) {
      return res.status(400).json({
        success: false,
        message: '身份证号已注册'
      });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建村民档案
    const residentProfile = new ResidentProfile({
      name,
      idCard,
      phone,
      email,
      address,
      villageId,
      userType,
      avatar,
      registrationDate: new Date(),
      status: 'pending_approval'
    });

    await residentProfile.save();

    // 创建用户账号
    const user = new VillageUser({
      name,
      phone,
      password: hashedPassword,
      userType,
      villageId,
      residentProfileId: residentProfile._id,
      status: 'pending_approval',
      registrationDate: new Date(),
      requirePasswordChange: true
    });

    await user.save();

    // 关联档案和用户
    residentProfile.userId = user._id;
    await residentProfile.save();

    // 记录审计日志
    await logAuditEvent('user_registered', {
      userId: user._id,
      phone,
      userType,
      villageId,
      status: 'pending_approval'
    });

    // 通知管理员审批
    await notifyAdminsForApproval(user);

    res.status(201).json({
      success: true,
      message: '注册成功，等待管理员审批',
      data: {
        userId: user._id,
        phone,
        status: 'pending_approval'
      }
    });

  } catch (error) {
    console.error('用户注册错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    });
  }
}

/**
 * 刷新Token
 */
async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: '缺少刷新令牌'
      });
    }

    // 验证刷新令牌
    const decoded = jwt.verify(refreshToken, `${JWT_SECRET  }_refresh`);

    const user = await VillageUser.findById(decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: '用户不存在或已禁用'
      });
    }

    // 生成新的访问令牌
    const newToken = generateJWTToken(user);

    res.json({
      success: true,
      token: newToken,
      user: formatUserInfo(user)
    });

  } catch (error) {
    console.error('刷新令牌错误:', error);
    res.status(401).json({
      success: false,
      message: '刷新令牌无效或已过期'
    });
  }
}

/**
 * 登出处理
 */
async function logout(req, res) {
  try {
    const userId = req.user?.id;

    if (userId) {
      // 记录登出审计日志
      await logAuditEvent('logout', {
        userId,
        ip: req.ip
      });
    }

    res.json({
      success: true,
      message: '退出登录成功'
    });

  } catch (error) {
    console.error('登出错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
}

// ==================== 工具函数 ====================

/**
 * 生成JWT Token
 */
function generateJWTToken(user, remember = false) {
  const payload = {
    userId: user._id,
    phone: user.phone,
    userType: user.userType,
    villageId: user.villageId,
    permissions: getPermissionsForUserType(user.userType)
  };

  const options = {
    expiresIn: remember ? '7d' : JWT_EXPIRE
  };

  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * 根据用户类型获取权限
 */
function getPermissionsForUserType(userType) {
  const permissions = {
    villager: [
      'village:read',
      'document:read',
      'service:read',
      'announcement:read'
    ],
    committee: [
      'village:read', 'village:write',
      'document:read', 'document:write',
      'service:read', 'service:write',
      'announcement:read', 'announcement:write',
      'resident:read', 'resident:write'
    ],
    admin: ['*'] // 所有权限
  };

  return permissions[userType] || [];
}

/**
 * 格式化用户信息
 */
function formatUserInfo(user) {
  return {
    id: user._id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    avatar: user.avatar,
    userType: user.userType,
    villageId: user.villageId,
    villageName: user.villageId?.name,
    permissions: getPermissionsForUserType(user.userType),
    lastLogin: user.lastLogin
  };
}

/**
 * 验证登录输入
 */
function validateLoginInput(phone, password, userType, villageId) {
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    return '请输入正确的手机号';
  }

  if (!password || password.length < 6) {
    return '密码长度不能少于6位';
  }

  if (!userType || !['villager', 'committee', 'admin'].includes(userType)) {
    return '请选择正确的用户类型';
  }

  if (!villageId) {
    return '请选择所属村庄';
  }

  return null;
}

/**
 * 验证注册输入
 */
function validateRegistrationInput(data) {
  const { name, phone, idCard, password, villageId } = data;

  if (!name || name.length < 2) {
    return '请输入真实姓名';
  }

  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    return '请输入正确的手机号';
  }

  if (!idCard || !/^\d{17}[\dX]$/.test(idCard)) {
    return '请输入正确的身份证号';
  }

  if (!password || password.length < 6) {
    return '密码长度不能少于6位';
  }

  if (!villageId) {
    return '请选择所属村庄';
  }

  return null;
}

/**
 * 查找用户
 */
async function findUserByPhoneAndType(phone, userType, villageId) {
  return await VillageUser.findOne({
    phone,
    userType,
    villageId
  }).populate('villageId', 'name code');
}

/**
 * 获取账户状态消息
 */
function getAccountStatusMessage(status) {
  const statusMessages = {
    'pending_approval': '账号正在审批中，请联系管理员',
    'suspended': '账号已被暂停，请联系管理员',
    'disabled': '账号已禁用，无法登录'
  };

  return statusMessages[status] || '账号状态异常';
}

/**
 * 保存临时图像
 */
async function saveTempImage(base64Data, prefix) {
  const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  const filename = `${prefix}_${Date.now()}.jpg`;
  const filepath = path.join(__dirname, '../../temp', filename);

  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, buffer);

  return filepath;
}

/**
 * 人脸识别
 */
async function recognizeFace(imagePath, villageId) {
  try {
    const response = await axios.post(`${FACE_RECOGNITION_CONFIG.endpoint}/recognize`, {
      image_path: imagePath,
      village_id: villageId,
      threshold: 0.8
    }, {
      headers: {
        'Authorization': `Bearer ${FACE_RECOGNITION_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return response.data;

  } catch (error) {
    console.error('人脸识别服务错误:', error);
    return {
      success: false,
      message: '人脸识别服务暂时不可用'
    };
  }
}

/**
 * 语音文本分析
 */
async function analyzeVoiceText(voiceText, language) {
  try {
    const response = await axios.post(`${VOICE_RECOGNITION_CONFIG.endpoint}/analyze`, {
      text: voiceText,
      language,
      extract_info: ['phone', 'name']
    }, {
      headers: {
        'Authorization': `Bearer ${VOICE_RECOGNITION_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return response.data;

  } catch (error) {
    console.error('语音识别服务错误:', error);
    return {
      success: false,
      message: '语音识别服务暂时不可用'
    };
  }
}

/**
 * 姓名匹配验证
 */
function isNameMatch(inputName, realName) {
  // 移除空格和转换为小写进行比较
  const normalizeName = (name) => name.replace(/\s/g, '').toLowerCase();

  const inputNormalized = normalizeName(inputName);
  const realNormalized = normalizeName(realName);

  // 完全匹配或包含关系
  return inputNormalized === realNormalized ||
         inputNormalized.includes(realNormalized) ||
         realNormalized.includes(inputNormalized);
}

/**
 * 生成验证码
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 保存验证码
 */
async function saveVerificationCode(phone, code, expiresAt, type) {
  // 这里应该使用Redis等缓存服务
  // 简化实现，实际项目中需要更安全的存储方式
  const codeData = {
    phone,
    code,
    type,
    expiresAt,
    createdAt: new Date()
  };

  // 保存到内存或数据库（示例）
  // await redis.setex(`verification_code_${phone}`, 300, JSON.stringify(codeData));
}

/**
 * 验证验证码
 */
async function verifyCode(phone, code, type) {
  // 从缓存中获取验证码并验证
  // const storedCode = await redis.get(`verification_code_${phone}`);
  // return storedCode && JSON.parse(storedCode).code === code;

  // 简化实现
  return code === '123456'; // 测试用
}

/**
 * 发送短信
 */
async function sendSMS(phone, code, type) {
  try {
    const templates = {
      'reset': `您的密码重置验证码是：${code}，5分钟内有效。`,
      'register': `您的注册验证码是：${code}，5分钟内有效。`,
      'login': `您的登录验证码是：${code}，5分钟内有效。`
    };

    const message = templates[type] || templates['reset'];

    // 调用短信服务API
    if (SMS_CONFIG.endpoint) {
      const response = await axios.post(SMS_CONFIG.endpoint, {
        phone,
        message,
        template: SMS_CONFIG.template
      }, {
        headers: {
          'Authorization': `Bearer ${SMS_CONFIG.apiKey}`
        }
      });

      return { success: true };
    } else {
      // 开发环境打印到控制台
      console.log(`SMS to ${phone}: ${message}`);
      return { success: true };
    }

  } catch (error) {
    console.error('发送短信错误:', error);
    return { success: false };
  }
}

/**
 * 记录审计日志
 */
async function logAuditEvent(event, data) {
  try {
    const auditLog = new AuditLog({
      event,
      data,
      timestamp: new Date(),
      ip: data.ip || null,
      userId: data.userId || null
    });

    await auditLog.save();

  } catch (error) {
    console.error('记录审计日志错误:', error);
  }
}

/**
 * 更新用户登录信息
 */
async function updateUserLoginInfo(userId, loginInfo) {
  await VillageUser.updateOne(
    { _id: userId },
    {
      $set: {
        lastLogin: loginInfo.lastLogin,
        lastDeviceInfo: loginInfo.deviceInfo,
        lastLoginMethod: loginInfo.loginMethod
      },
      $push: {
        loginHistory: {
          timestamp: loginInfo.lastLogin,
          method: loginInfo.loginMethod,
          deviceInfo: loginInfo.deviceInfo
        }
      }
    }
  );
}

/**
 * 清理临时文件
 */
async function cleanupTempFile(filepath) {
  try {
    await fs.unlink(filepath);
  } catch (error) {
    console.error('删除临时文件失败:', error);
  }
}

/**
 * 获取上次验证码发送时间
 */
async function getLastVerificationCodeTime(phone) {
  // 实际实现应该从Redis或数据库获取
  return null;
}

/**
 * 删除验证码
 */
async function deleteVerificationCode(phone) {
  // 实际实现应该删除Redis中的验证码
}

/**
 * 通知管理员审批
 */
async function notifyAdminsForApproval(user) {
  // 发送通知给村委管理员进行审批
  // 可以是短信、邮件、站内消息等方式
}

module.exports = {
  authLimiter,
  passwordLogin,
  faceLogin,
  voiceLogin,
  sendVerificationCode,
  resetPassword,
  registerUser,
  refreshToken,
  logout,
  generateJWTToken,
  getPermissionsForUserType,
  formatUserInfo
};