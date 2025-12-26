/**
 * 认证控制器
 * 处理用户登录、注册、令牌刷新等功能
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const { FamilyRelation } = require('../models/FaceRecognition');
const { AuditLog } = require('../models/Permission');
const { generateTokens } = require('../middleware/auth');
const logger = require('../utils/logger');
const { AuditUtil } = require('../utils/audit');
const cloudCommunicationService = require('../services/cloudCommunicationService');

class AuthController {
  /**
   * 用户注册
   */
  async register(req, res) {
    try {
      const {
        username,
        password,
        name,
        phone,
        idCard,
        role = 'resident',
        villageId,
        email
      } = req.body;

      // 检查用户名是否已存在
      const existingUser = await User.findOne({
        $or: [{ username }, { phone }, { idCard }]
      });

      if (existingUser) {
        let field = '';
        if (existingUser.username === username) field = '用户名';
        else if (existingUser.phone === phone) field = '手机号';
        else if (existingUser.idCard === idCard) field = '身份证号';

        return res.status(409).json({
          success: false,
          error: '注册失败',
          message: `${field}已被使用`
        });
      }

      // 加密密码
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);

      // 创建用户
      const user = new User({
        username,
        password: hashedPassword,
        name,
        phone,
        idCard,
        role,
        villageId,
        email,
        status: 'active',
        permissions: this.getDefaultPermissions(role),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await user.save();

      // 生成令牌
      const deviceInfo = {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        deviceId: req.get('X-Device-ID') || 'unknown',
        platform: req.get('X-Platform') || 'unknown'
      };

      const tokens = generateTokens(user, deviceInfo);

      // 记录审计日志
      await AuditUtil.logOperation('CREATE', 'user', {
        userId: user._id,
        username: user.username,
        name: user.name,
        role: user.role
      }, {
        target: {
          id: user._id,
          type: 'User',
          name: username
        },
        result: 'SUCCESS',
        details: {
          description: `用户注册成功: ${username}`,
          changes: {
            before: null,
            after: { username, name, role, status: 'active' }
          }
        },
        riskLevel: 'MEDIUM',
        sessionId: tokens.sessionId
      });

      logger.info(`用户注册成功: ${username}`);

      // 返回用户信息（不包含密码）
      const userResponse = {
        _id: user._id,
        username: user.username,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        villageId: user.villageId,
        status: user.status,
        createdAt: user.createdAt
      };

      res.status(201).json({
        success: true,
        data: {
          user: userResponse,
          ...tokens
        },
        message: '注册成功'
      });

    } catch (error) {
      logger.error('用户注册失败:', error);
      res.status(500).json({
        success: false,
        error: '注册失败',
        message: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
      });
    }
  }

  /**
   * 用户登录
   */
  async login(req, res) {
    try {
      const { username, password, deviceInfo = {} } = req.body;

      // 查找用户
      const user = await User.findOne({
        $or: [{ username }, { phone }, { email: username }]
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: '登录失败',
          message: '用户名或密码错误'
        });
      }

      // 检查用户状态
      if (user.status !== 'active') {
        return res.status(403).json({
          success: false,
          error: '登录失败',
          message: '用户账户已被禁用，请联系管理员'
        });
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        // 记录失败的登录尝试
        await this.recordFailedLogin(user._id, req.ip, req.get('User-Agent'));

        return res.status(401).json({
          success: false,
          error: '登录失败',
          message: '用户名或密码错误'
        });
      }

      // 检查是否需要多因子认证
      if (user.mfaEnabled && !req.body.mfaCode) {
        return res.status(202).json({
          success: false,
          error: '需要多因子认证',
          message: '请输入验证码',
          requiresMFA: true
        });
      }

      // 验证多因子认证码
      if (user.mfaEnabled && req.body.mfaCode) {
        const isValidMFA = await this.verifyMFACode(user, req.body.mfaCode);
        if (!isValidMFA) {
          return res.status(401).json({
            success: false,
            error: '验证失败',
            message: '验证码错误'
          });
        }
      }

      // 生成令牌
      const fullDeviceInfo = {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        deviceId: deviceInfo.deviceId || req.get('X-Device-ID') || 'unknown',
        platform: deviceInfo.platform || req.get('X-Platform') || 'unknown',
        ...deviceInfo
      };

      const tokens = generateTokens(user, fullDeviceInfo);

      // 更新最后登录时间和设备信息
      user.lastLoginAt = new Date();
      user.lastLoginIP = req.ip;
      user.lastLoginDevice = fullDeviceInfo;
      user.loginCount = (user.loginCount || 0) + 1;
      await user.save();

      // 记录审计日志
      await AuditUtil.logOperation('LOGIN', 'user', {
        userId: user._id,
        username: user.username,
        name: user.name,
        role: user.role
      }, {
        target: {
          id: user._id,
          type: 'User',
          name: username
        },
        result: 'SUCCESS',
        details: {
          description: `用户登录成功: ${username}`,
          deviceInfo: fullDeviceInfo
        },
        riskLevel: 'LOW',
        sessionId: tokens.sessionId
      });

      logger.info(`用户登录成功: ${username} from ${req.ip}`);

      // 返回用户信息
      const userResponse = {
        _id: user._id,
        userId: user._id,
        username: user.username,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        villageId: user.villageId,
        status: user.status,
        loginCount: user.loginCount,
        lastLoginAt: user.lastLoginAt
      };

      res.json({
        success: true,
        data: {
          user: userResponse,
          ...tokens
        },
        message: '登录成功'
      });

    } catch (error) {
      logger.error('用户登录失败:', error);
      res.status(500).json({
        success: false,
        error: '登录失败',
        message: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
      });
    }
  }

  /**
   * 刷新令牌
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: '令牌刷新失败',
          message: '缺少刷新令牌'
        });
      }

      // 验证刷新令牌
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          error: '令牌刷新失败',
          message: '无效的刷新令牌'
        });
      }

      // 获取用户信息
      const user = await User.findById(decoded.userId).select('-password');
      if (!user || user.status !== 'active') {
        return res.status(401).json({
          success: false,
          error: '令牌刷新失败',
          message: '用户不存在或已被禁用'
        });
      }

      // 生成新的令牌
      const deviceInfo = {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        deviceId: req.get('X-Device-ID') || 'unknown',
        platform: req.get('X-Platform') || 'unknown'
      };

      const tokens = generateTokens(user, deviceInfo);

      // 记录审计日志
      await AuditUtil.logOperation('REFRESH_TOKEN', 'user', {
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
          description: `刷新令牌成功: ${user.username}`
        },
        riskLevel: 'LOW',
        sessionId: tokens.sessionId
      });

      res.json({
        success: true,
        data: tokens,
        message: '令牌刷新成功'
      });

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: '令牌刷新失败',
          message: '刷新令牌已过期，请重新登录'
        });
      }

      logger.error('令牌刷新失败:', error);
      res.status(500).json({
        success: false,
        error: '令牌刷新失败',
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 用户登出
   */
  async logout(req, res) {
    try {
      const { refreshToken, sessionId } = req.body;

      // 撤销会话
      if (sessionId) {
        const authMiddleware = require('../middleware/auth');
        authMiddleware.revokeSession(sessionId);
      }

      // 记录审计日志
      if (req.user) {
        await AuditUtil.logOperation('LOGOUT', 'user', {
          userId: req.user._id,
          username: req.user.username,
          name: req.user.name,
          role: req.user.role
        }, {
          target: {
            id: req.user._id,
            type: 'User',
            name: req.user.username
          },
          result: 'SUCCESS',
          details: {
            description: `用户登出: ${req.user.username}`
          },
          riskLevel: 'LOW',
          sessionId: sessionId
        });
      }

      logger.info(`用户登出成功: ${req.user?.username || 'unknown'}`);

      res.json({
        success: true,
        message: '登出成功'
      });

    } catch (error) {
      logger.error('用户登出失败:', error);
      res.status(500).json({
        success: false,
        error: '登出失败',
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(req, res) {
    try {
      const user = await User.findById(req.user._id)
        .select('-password')
        .populate('villageId', 'name code');

      if (!user) {
        return res.status(404).json({
          success: false,
          error: '用户不存在'
        });
      }

      // 获取用户权限和代理关系
      const proxyRelations = await FamilyRelation.find({
        agentUserId: user._id,
        status: 'active',
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      }).populate('principalUserId', 'name phone');

      res.json({
        success: true,
        data: {
          user,
          proxyRelations: proxyRelations.map(relation => ({
            id: relation._id,
            principalUser: relation.principalUserId,
            permissions: relation.permissions,
            expiresAt: relation.expiresAt
          }))
        }
      });

    } catch (error) {
      logger.error('获取用户信息失败:', error);
      res.status(500).json({
        success: false,
        error: '获取用户信息失败',
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 修改密码
   */
  async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user._id;

      // 获取用户
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: '用户不存在'
        });
      }

      // 验证旧密码
      const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isOldPasswordValid) {
        return res.status(401).json({
          success: false,
          error: '密码修改失败',
          message: '原密码错误'
        });
      }

      // 加密新密码
      const salt = await bcrypt.genSalt(12);
      const hashedNewPassword = await bcrypt.hash(newPassword, salt);

      // 更新密码
      user.password = hashedNewPassword;
      user.passwordChangedAt = new Date();
      user.mustChangePassword = false;
      await user.save();

      // 撤销所有会话（强制重新登录）
      const authMiddleware = require('../middleware/auth');
      // 注意：这里应该实现撤销用户所有会话的方法

      // 记录审计日志
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
          description: `用户修改密码: ${user.username}`
        },
        riskLevel: 'HIGH',
        villageId: user.villageId,
        sessionId: req.session?.sessionId
      });

      logger.info(`用户修改密码成功: ${user.username}`);

      res.json({
        success: true,
        message: '密码修改成功，请重新登录'
      });

    } catch (error) {
      logger.error('修改密码失败:', error);
      res.status(500).json({
        success: false,
        error: '修改密码失败',
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 启用多因子认证
   */
  async enableMFA(req, res) {
    try {
      const { phone, type = 'sms' } = req.body;
      const userId = req.user._id;

      // 生成验证码
      const mfaCode = this.generateMFACode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟后过期

      // 保存验证码（实际应该发送到用户手机）
      await User.findByIdAndUpdate(userId, {
        mfaCode: {
          code: mfaCode,
          expiresAt,
          type
        }
      });

      // 发送短信验证码
      try {
        await cloudCommunicationService.sendVerificationCode(phone, 'sms');
      } catch (smsError) {
        logger.error('发送短信验证码失败:', smsError);
        // 继续执行，开发环境下可以使用 debugCode
      }

      res.json({
        success: true,
        message: '验证码已发送',
        // 开发环境下返回验证码
        debugCode: process.env.NODE_ENV === 'development' ? mfaCode : undefined
      });

    } catch (error) {
      logger.error('启用MFA失败:', error);
      res.status(500).json({
        success: false,
        error: '启用多因子认证失败',
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 验证多因子认证并启用
   */
  async verifyAndEnableMFA(req, res) {
    try {
      const { code } = req.body;
      const userId = req.user._id;

      const user = await User.findById(userId);
      if (!user || !user.mfaCode || !user.mfaCode.code) {
        return res.status(400).json({
          success: false,
          error: '验证失败',
          message: '请先获取验证码'
        });
      }

      // 检查验证码是否过期
      if (new Date() > user.mfaCode.expiresAt) {
        return res.status(400).json({
          success: false,
          error: '验证失败',
          message: '验证码已过期'
        });
      }

      // 验证码
      if (user.mfaCode.code !== code) {
        return res.status(400).json({
          success: false,
          error: '验证失败',
          message: '验证码错误'
        });
      }

      // 启用MFA
      user.mfaEnabled = true;
      user.mfaCode = undefined; // 清除验证码
      await user.save();

      // 记录审计日志
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
          description: `用户启用多因子认证: ${user.username}`
        },
        riskLevel: 'MEDIUM',
        villageId: user.villageId,
        sessionId: req.session?.sessionId
      });

      res.json({
        success: true,
        message: '多因子认证已启用'
      });

    } catch (error) {
      logger.error('验证MFA失败:', error);
      res.status(500).json({
        success: false,
        error: '验证失败',
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 辅助方法
   */

  /**
   * 获取默认权限
   */
  getDefaultPermissions(role) {
    const permissions = {
      admin: [
        'user.read', 'user.write', 'user.delete',
        'resident.read', 'resident.write', 'resident.delete',
        'governance.read', 'governance.write', 'governance.delete',
        'finance.read', 'finance.write', 'finance.delete',
        'emergency.read', 'emergency.write', 'emergency.delete',
        'ecommerce.read', 'ecommerce.write', 'ecommerce.delete',
        'system.read', 'system.write'
      ],
      village_admin: [
        'resident.read', 'resident.write',
        'governance.read', 'governance.write',
        'finance.read', 'finance.write',
        'emergency.read', 'emergency.write',
        'ecommerce.read', 'ecommerce.write'
      ],
      village_official: [
        'resident.read',
        'governance.read', 'governance.write',
        'emergency.read', 'emergency.write'
      ],
      resident: [
        'resident.read',
        'governance.read',
        'ecommerce.read'
      ]
    };

    return permissions[role] || permissions.resident;
  }

  /**
   * 记录失败的登录尝试
   */
  async recordFailedLogin(userId, ipAddress, userAgent) {
    try {
      await User.findByIdAndUpdate(userId, {
        $push: {
          failedLogins: {
            timestamp: new Date(),
            ipAddress,
            userAgent
          }
        },
        $inc: { failedLoginCount: 1 }
      });

      // 检查是否需要锁定账户
      const user = await User.findById(userId);
      if (user.failedLoginCount >= 5) {
        user.status = 'locked';
        user.lockedAt = new Date();
        user.lockReason = '多次登录失败';
        await user.save();

        logger.warn(`用户账户已锁定: ${user.username}`);
      }
    } catch (error) {
      logger.error('记录失败登录尝试失败:', error);
    }
  }

  /**
   * 生成MFA验证码
   */
  generateMFACode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 验证MFA验证码
   */
  async verifyMFACode(user, code) {
    if (!user.mfaCode || !user.mfaCode.code) {
      return false;
    }

    if (new Date() > user.mfaCode.expiresAt) {
      return false;
    }

    return user.mfaCode.code === code;
  }

  /**
   * 发送短信验证码
   * POST /api/v1/auth/send-sms
   */
  async sendSmsCode(req, res) {
    try {
      const { phone, type = 'login' } = req.body; // type: login, register, reset

      // 验证手机号格式
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_PHONE',
          message: '手机号格式不正确'
        });
      }

      // 如果是注册类型，检查手机号是否已注册
      if (type === 'register') {
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            error: 'PHONE_EXISTS',
            message: '该手机号已注册'
          });
        }
      }

      // 如果是登录类型，检查手机号是否已注册
      if (type === 'login') {
        const existingUser = await User.findOne({ phone });
        if (!existingUser) {
          return res.status(400).json({
            success: false,
            error: 'PHONE_NOT_FOUND',
            message: '该手机号未注册'
          });
        }
      }

      // 发送验证码
      const result = await cloudCommunicationService.sendVerificationCode(phone, 'sms');

      // 记录审计日志
      await AuditLog.logOperation({
        operation: {
          type: 'CREATE',
          resource: 'verification_code',
          action: 'send_sms_code',
          description: `发送${type === 'login' ? '登录' : type === 'register' ? '注册' : '重置密码'}短信验证码到 ${phone}`
        },
        actor: {
          userId: req.user?._id || null,
          userName: req.user?.username || 'anonymous',
          userRole: req.user?.role || 'guest',
          userPhone: phone,
          userVillageId: req.user?.villageId || null
        },
        result: {
          status: 'SUCCESS'
        },
        privacy: {
          sensitiveLevel: 'internal',
          accessReason: `用户请求${type}验证码`,
          legalBasis: 'consent'
        },
        system: {
          platform: req.get('X-Platform') || 'unknown',
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip
        }
      });

      res.json({
        success: true,
        message: '验证码已发送',
        expireTime: result.expireTime,
        // 开发环境下返回验证码
        debugCode: process.env.NODE_ENV === 'development' ? result.code : undefined
      });

    } catch (error) {
      logger.error('发送短信验证码失败:', error);

      // 记录错误审计日志
      await AuditLog.logOperation({
        operation: {
          type: 'CREATE',
          resource: 'verification_code',
          action: 'send_sms_code',
          description: `发送短信验证码失败: ${error.message}`
        },
        actor: {
          userId: req.user?._id || null,
          userName: req.user?.username || 'anonymous',
          userRole: req.user?.role || 'guest',
          userPhone: req.body?.phone
        },
        result: {
          status: 'FAILURE',
          errorMessage: error.message
        },
        privacy: {
          sensitiveLevel: 'internal',
          accessReason: '用户请求验证码',
          legalBasis: 'consent'
        },
        system: {
          platform: req.get('X-Platform') || 'unknown',
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip
        }
      });

      res.status(500).json({
        success: false,
        error: 'SMS_SEND_FAILED',
        message: '发送验证码失败，请稍后重试'
      });
    }
  }

  /**
   * 短信验证码登录
   * POST /api/v1/auth/login-sms
   */
  async loginWithSms(req, res) {
    try {
      const { phone, code } = req.body;

      // 验证手机号格式
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_PHONE',
          message: '手机号格式不正确'
        });
      }

      // 验证验证码格式
      if (!code || !/^\d{6}$/.test(code)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_CODE',
          message: '验证码格式不正确'
        });
      }

      // 查找用户
      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'USER_NOT_FOUND',
          message: '该手机号未注册'
        });
      }

      // 检查用户状态
      if (user.status === 'locked') {
        return res.status(403).json({
          success: false,
          error: 'ACCOUNT_LOCKED',
          message: '账户已被锁定，请联系管理员'
        });
      }

      if (user.status === 'inactive') {
        return res.status(403).json({
          success: false,
          error: 'ACCOUNT_INACTIVE',
          message: '账户未激活'
        });
      }

      // 验证短信验证码
      const verifyResult = cloudCommunicationService.verifyCode(phone, code);
      if (!verifyResult.success) {
        // 记录失败的登录尝试
        await this.recordFailedLogin(user._id, req.ip, req.get('User-Agent'));

        return res.status(400).json({
          success: false,
          error: verifyResult.message === '验证码已过期或不存在' ? 'CODE_EXPIRED' : 'CODE_INVALID',
          message: verifyResult.message
        });
      }

      // 重置失败登录计数
      user.failedLoginCount = 0;
      user.lastLoginAt = new Date();
      user.lastLoginIP = req.ip;
      await user.save();

      // 生成令牌
      const deviceInfo = {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        deviceId: req.get('X-Device-ID') || 'unknown',
        platform: req.get('X-Platform') || 'unknown'
      };

      const tokens = generateTokens(user, deviceInfo);

      // 记录审计日志
      await AuditLog.logOperation({
        operation: {
          type: 'LOGIN',
          resource: 'user',
          action: 'sms_login',
          description: `用户通过短信验证码登录: ${user.username}`
        },
        actor: {
          userId: user._id,
          userName: user.username,
          userRole: user.role,
          userPhone: user.phone,
          userEmail: user.email,
          userVillageId: user.villageId
        },
        result: {
          status: 'SUCCESS'
        },
        privacy: {
          sensitiveLevel: 'sensitive',
          accessReason: '用户登录',
          legalBasis: 'contract'
        },
        system: {
          platform: deviceInfo.platform,
          userAgent: deviceInfo.userAgent,
          ipAddress: deviceInfo.ipAddress
        }
      });

      res.json({
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user._id,
            username: user.username,
            name: user.name,
            phone: user.phone,
            email: user.email,
            role: user.role,
            villageId: user.villageId,
            permissions: user.permissions
          },
          tokens
        }
      });

    } catch (error) {
      logger.error('短信验证码登录失败:', error);

      res.status(500).json({
        success: false,
        error: 'LOGIN_FAILED',
        message: '登录失败，请稍后重试'
      });
    }
  }

  /**
   * 短信验证码注册
   * POST /api/v1/auth/register-sms
   */
  async registerWithSms(req, res) {
    try {
      const {
        phone,
        code,
        name,
        password,
        villageId,
        role = 'resident',
        email
      } = req.body;

      // 验证手机号格式
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_PHONE',
          message: '手机号格式不正确'
        });
      }

      // 验证验证码格式
      if (!code || !/^\d{6}$/.test(code)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_CODE',
          message: '验证码格式不正确'
        });
      }

      // 验证短信验证码
      const verifyResult = cloudCommunicationService.verifyCode(phone, code);
      if (!verifyResult.success) {
        return res.status(400).json({
          success: false,
          error: verifyResult.message === '验证码已过期或不存在' ? 'CODE_EXPIRED' : 'CODE_INVALID',
          message: verifyResult.message
        });
      }

      // 检查手机号是否已注册
      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'PHONE_EXISTS',
          message: '该手机号已注册'
        });
      }

      // 验证必填字段
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'NAME_REQUIRED',
          message: '姓名不能为空'
        });
      }

      // 加密密码
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = password ? await bcrypt.hash(password, salt) : null;

      // 创建用户
      const user = new User({
        username: phone, // 默认使用手机号作为用户名
        password: hashedPassword,
        name,
        phone,
        villageId,
        role,
        email,
        status: 'active',
        permissions: this.getDefaultPermissions(role),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await user.save();

      // 生成令牌
      const deviceInfo = {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        deviceId: req.get('X-Device-ID') || 'unknown',
        platform: req.get('X-Platform') || 'unknown'
      };

      const tokens = generateTokens(user, deviceInfo);

      // 记录审计日志
      await AuditLog.logOperation({
        operation: {
          type: 'CREATE',
          resource: 'user',
          action: 'sms_register',
          description: `用户通过短信验证码注册: ${user.username}`
        },
        actor: {
          userId: user._id,
          userName: user.username,
          userRole: user.role,
          userPhone: user.phone,
          userVillageId: user.villageId
        },
        target: {
          userId: user._id,
          userName: user.name,
          targetResource: 'User',
          targetResourceId: user._id
        },
        result: {
          status: 'SUCCESS',
          affectedRecords: 1
        },
        dataChange: {
          oldValue: null,
          newValue: { username: user.username, name, phone, role, status: 'active' },
          changeType: 'create'
        },
        privacy: {
          sensitiveLevel: 'sensitive',
          accessReason: '用户注册',
          legalBasis: 'consent'
        },
        system: {
          platform: deviceInfo.platform,
          userAgent: deviceInfo.userAgent,
          ipAddress: deviceInfo.ipAddress
        }
      });

      res.json({
        success: true,
        message: '注册成功',
        data: {
          user: {
            id: user._id,
            username: user.username,
            name: user.name,
            phone: user.phone,
            email: user.email,
            role: user.role,
            villageId: user.villageId,
            permissions: user.permissions
          },
          tokens
        }
      });

    } catch (error) {
      logger.error('短信验证码注册失败:', error);

      res.status(500).json({
        success: false,
        error: 'REGISTER_FAILED',
        message: '注册失败，请稍后重试'
      });
    }
  }

  /**
   * 重置密码 - 发送验证码
   * POST /api/v1/auth/reset-password/send-code
   */
  async sendResetPasswordCode(req, res) {
    try {
      const { phone } = req.body;

      // 验证手机号格式
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_PHONE',
          message: '手机号格式不正确'
        });
      }

      // 检查手机号是否已注册
      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'USER_NOT_FOUND',
          message: '该手机号未注册'
        });
      }

      // 发送验证码
      const result = await cloudCommunicationService.sendVerificationCode(phone, 'sms');

      // 记录审计日志
      await AuditLog.logOperation({
        operation: {
          type: 'CREATE',
          resource: 'password_reset',
          action: 'send_reset_code',
          description: `发送密码重置验证码到 ${phone}`
        },
        actor: {
          userId: user._id,
          userName: user.username,
          userRole: user.role,
          userPhone: phone
        },
        target: {
          userId: user._id,
          userName: user.name
        },
        result: {
          status: 'SUCCESS'
        },
        privacy: {
          sensitiveLevel: 'sensitive',
          accessReason: '用户请求重置密码',
          legalBasis: 'contract'
        },
        system: {
          platform: req.get('X-Platform') || 'unknown',
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip
        }
      });

      res.json({
        success: true,
        message: '验证码已发送',
        expireTime: result.expireTime,
        // 开发环境下返回验证码
        debugCode: process.env.NODE_ENV === 'development' ? result.code : undefined
      });

    } catch (error) {
      logger.error('发送密码重置验证码失败:', error);

      res.status(500).json({
        success: false,
        error: 'SEND_CODE_FAILED',
        message: '发送验证码失败，请稍后重试'
      });
    }
  }

  /**
   * 重置密码 - 验证码确认
   * POST /api/v1/auth/reset-password/confirm
   */
  async resetPasswordWithCode(req, res) {
    try {
      const { phone, code, newPassword } = req.body;

      // 验证手机号格式
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_PHONE',
          message: '手机号格式不正确'
        });
      }

      // 验证密码格式
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_PASSWORD',
          message: '新密码长度必须至少6个字符'
        });
      }

      // 查找用户
      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'USER_NOT_FOUND',
          message: '该手机号未注册'
        });
      }

      // 验证短信验证码
      const verifyResult = cloudCommunicationService.verifyCode(phone, code);
      if (!verifyResult.success) {
        return res.status(400).json({
          success: false,
          error: verifyResult.message === '验证码已过期或不存在' ? 'CODE_EXPIRED' : 'CODE_INVALID',
          message: verifyResult.message
        });
      }

      // 加密新密码
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // 保存旧密码用于审计
      const oldPassword = user.password;

      // 更新密码
      user.password = hashedPassword;
      user.updatedAt = new Date();
      user.passwordChangedAt = new Date();
      await user.save();

      // 记录审计日志
      await AuditLog.logOperation({
        operation: {
          type: 'UPDATE',
          resource: 'user_password',
          action: 'reset_password',
          description: `用户 ${user.username} 重置密码`
        },
        actor: {
          userId: user._id,
          userName: user.username,
          userRole: user.role,
          userPhone: user.phone
        },
        target: {
          userId: user._id,
          userName: user.name
        },
        result: {
          status: 'SUCCESS',
          affectedRecords: 1
        },
        dataChange: {
          oldValue: { password: '***' },
          newValue: { password: '***' },
          sensitiveFields: ['password'],
          changeType: 'update'
        },
        privacy: {
          sensitiveLevel: 'confidential',
          accessReason: '用户重置密码',
          legalBasis: 'contract'
        },
        system: {
          platform: req.get('X-Platform') || 'unknown',
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip
        },
        risk: {
          level: 'medium',
          score: 50,
          indicators: ['password_reset']
        }
      });

      res.json({
        success: true,
        message: '密码重置成功，请使用新密码登录'
      });

    } catch (error) {
      logger.error('密码重置失败:', error);

      res.status(500).json({
        success: false,
        error: 'RESET_FAILED',
        message: '密码重置失败，请稍后重试'
      });
    }
  }
}

module.exports = new AuthController();