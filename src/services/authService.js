/**
 * 认证服务
 * 处理用户认证、授权、会话管理等功能
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { User } = require('../models/User');
const { AuditUtil } = require('../utils/audit');
const { CacheUtil } = require('../utils/cache');

class AuthService {
  constructor() {
    this.tokenBlacklist = new Set();
    this.maxLoginAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15分钟
    this.failedAttempts = new Map(); // 存储失败登录尝试
  }

  /**
   * 用户注册
   * @param {Object} userData - 用户数据
   * @returns {Promise<Object>} 注册结果
   */
  async register(userData) {
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
      } = userData;

      // 检查用户名是否已存在
      const existingUser = await User.findOne({
        $or: [{ username }, { phone }, { email }]
      });

      if (existingUser) {
        return {
          success: false,
          error: '用户名、手机号或邮箱已存在',
          code: 'USER_EXISTS'
        };
      }

      // 密码加密
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
        isEmailVerified: false,
        isPhoneVerified: false,
        createdAt: new Date(),
        lastLoginAt: null
      });

      await user.save();

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
          name: user.username
        },
        result: 'SUCCESS',
        details: {
          description: `用户注册成功: ${user.username}`,
          role: user.role
        },
        riskLevel: 'LOW',
        villageId: user.villageId
      });

      // 清除相关缓存
      await CacheUtil.delPattern(`users:${role}:*`);

      logger.info('用户注册成功', {
        userId: user._id,
        username: user.username,
        role: user.role,
        villageId: user.villageId
      });

      return {
        success: true,
        message: '注册成功',
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          role: user.role,
          phone: this.maskPhone(user.phone),
          email: user.email
        }
      };

    } catch (error) {
      logger.error('用户注册失败:', error);
      return {
        success: false,
        error: '注册失败',
        message: error.message
      };
    }
  }

  /**
   * 用户登录
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @param {Object} deviceInfo - 设备信息
   * @param {string} mfaCode - MFA验证码（可选）
   * @returns {Promise<Object>} 登录结果
   */
  async login(username, password, deviceInfo = {}, mfaCode = null) {
    try {
      // 检查是否被锁定
      const lockoutCheck = this.checkLockout(username);
      if (!lockoutCheck.allowed) {
        return {
          success: false,
          error: '账户已被锁定',
          code: 'ACCOUNT_LOCKED',
          lockoutTime: lockoutCheck.remainingTime
        };
      }

      // 查找用户
      const user = await User.findOne({
        $or: [{ username }, { email: username }, { phone: username }]
      }).populate('villageId', 'name code');

      if (!user) {
        this.recordFailedAttempt(username);
        return {
          success: false,
          error: '用户名或密码错误',
          code: 'INVALID_CREDENTIALS'
        };
      }

      // 检查账户状态
      if (user.status !== 'active') {
        return {
          success: false,
          error: '账户已被禁用',
          code: 'ACCOUNT_DISABLED'
        };
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        this.recordFailedAttempt(username);
        await AuditUtil.logOperation('LOGIN', 'user', {
          userId: user._id,
          username: user.username
        }, {
          target: {
            id: user._id,
            type: 'User',
            name: user.username
          },
          result: 'FAILED',
          details: {
            description: `登录失败: 密码错误`,
            ip: deviceInfo.ipAddress
          },
          riskLevel: 'MEDIUM',
          villageId: user.villageId
        });

        return {
          success: false,
          error: '用户名或密码错误',
          code: 'INVALID_CREDENTIALS'
        };
      }

      // 检查MFA
      if (user.mfaEnabled && !mfaCode) {
        return {
          success: false,
          error: '需要多因子认证',
          code: 'MFA_REQUIRED',
          requiresMFA: true
        };
      }

      if (user.mfaEnabled && mfaCode) {
        const isMFAValid = await this.verifyMFACode(user, mfaCode);
        if (!isMFAValid) {
          return {
            success: false,
            error: '验证码错误或已过期',
            code: 'INVALID_MFA'
          };
        }
      }

      // 清除失败尝试记录
      this.clearFailedAttempts(username);

      // 生成令牌
      const tokens = await this.generateTokens(user);

      // 更新最后登录时间
      user.lastLoginAt = new Date();
      await user.save();

      // 记录登录审计日志
      await AuditUtil.logOperation('LOGIN', 'user', {
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
          description: `用户登录成功: ${user.username}`,
          deviceInfo: deviceInfo.platform,
          ip: deviceInfo.ipAddress
        },
        riskLevel: 'LOW',
        villageId: user.villageId
      });

      logger.info('用户登录成功', {
        userId: user._id,
        username: user.username,
        role: user.role,
        deviceInfo: deviceInfo.platform
      });

      return {
        success: true,
        message: '登录成功',
        tokens,
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          role: user.role,
          permissions: user.permissions,
          villageId: user.villageId,
          villageName: user.villageId?.name,
          lastLoginAt: user.lastLoginAt,
          mfaEnabled: user.mfaEnabled
        }
      };

    } catch (error) {
      logger.error('用户登录失败:', error);
      return {
        success: false,
        error: '登录失败',
        message: error.message
      };
    }
  }

  /**
   * 生成访问令牌和刷新令牌
   * @param {Object} user - 用户对象
   * @returns {Promise<Object>} 令牌对象
   */
  async generateTokens(user) {
    const payload = {
      userId: user._id,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
      villageId: user.villageId
    };

    // 访问令牌（短期）
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      issuer: 'smart-village-platform',
      audience: 'smart-village-users'
    });

    // 刷新令牌（长期）
    const refreshToken = jwt.sign(
      { userId: user._id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 存储刷新令牌到Redis
    const tokenKey = `refresh_token:${user._id}`;
    await CacheUtil.set(tokenKey, refreshToken, 7 * 24 * 60 * 60); // 7天

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15分钟
      tokenType: 'Bearer'
    };
  }

  /**
   * 刷新访问令牌
   * @param {string} refreshToken - 刷新令牌
   * @returns {Promise<Object>} 刷新结果
   */
  async refreshToken(refreshToken) {
    try {
      // 验证刷新令牌
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      );

      if (decoded.type !== 'refresh') {
        return {
          success: false,
          error: '无效的刷新令牌',
          code: 'INVALID_REFRESH_TOKEN'
        };
      }

      // 检查令牌是否在Redis中
      const tokenKey = `refresh_token:${decoded.userId}`;
      const storedToken = await CacheUtil.get(tokenKey);

      if (storedToken !== refreshToken) {
        return {
          success: false,
          error: '刷新令牌已失效',
          code: 'TOKEN_EXPIRED'
        };
      }

      // 获取用户信息
      const user = await User.findById(decoded.userId);
      if (!user || user.status !== 'active') {
        return {
          success: false,
          error: '用户不存在或已被禁用',
          code: 'USER_INACTIVE'
        };
      }

      // 生成新的令牌
      const tokens = await this.generateTokens(user);

      // 记录令牌刷新日志
      logger.info('令牌刷新成功', {
        userId: user._id,
        username: user.username
      });

      return {
        success: true,
        message: '令牌刷新成功',
        tokens
      };

    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return {
          success: false,
          error: '无效的刷新令牌',
          code: 'INVALID_REFRESH_TOKEN'
        };
      }

      if (error.name === 'TokenExpiredError') {
        return {
          success: false,
          error: '刷新令牌已过期',
          code: 'TOKEN_EXPIRED'
        };
      }

      logger.error('令牌刷新失败:', error);
      return {
        success: false,
        error: '令牌刷新失败',
        message: error.message
      };
    }
  }

  /**
   * 用户登出
   * @param {string} userId - 用户ID
   * @param {string} refreshToken - 刷新令牌
   * @param {string} sessionId - 会话ID
   * @returns {Promise<Object>} 登出结果
   */
  async logout(userId, refreshToken = null, sessionId = null) {
    try {
      // 删除刷新令牌
      if (refreshToken) {
        const tokenKey = `refresh_token:${userId}`;
        await CacheUtil.del(tokenKey);
      }

      // 撤销会话
      if (sessionId) {
        const authMiddleware = require('../middleware/auth');
        authMiddleware.revokeSession(sessionId);
      }

      // 记录登出审计日志
      await AuditUtil.logOperation('LOGOUT', 'user', {
        userId
      }, {
        target: {
          id: userId,
          type: 'User'
        },
        result: 'SUCCESS',
        details: {
          description: `用户登出`
        },
        riskLevel: 'LOW'
      });

      logger.info('用户登出成功', { userId });

      return {
        success: true,
        message: '登出成功'
      };

    } catch (error) {
      logger.error('用户登出失败:', error);
      return {
        success: false,
        error: '登出失败',
        message: error.message
      };
    }
  }

  /**
   * 修改密码
   * @param {string} userId - 用户ID
   * @param {string} oldPassword - 旧密码
   * @param {string} newPassword - 新密码
   * @returns {Promise<Object>} 修改结果
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      // 获取用户
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          error: '用户不存在',
          code: 'USER_NOT_FOUND'
        };
      }

      // 验证旧密码
      const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isOldPasswordValid) {
        return {
          success: false,
          error: '旧密码错误',
          code: 'INVALID_OLD_PASSWORD'
        };
      }

      // 加密新密码
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // 更新密码
      user.password = hashedPassword;
      user.passwordChangedAt = new Date();
      await user.save();

      // 撤销所有刷新令牌（强制重新登录）
      const tokenKey = `refresh_token:${userId}`;
      await CacheUtil.del(tokenKey);

      // 记录审计日志
      await AuditUtil.logOperation('UPDATE', 'user', {
        userId: user._id,
        username: user.username
      }, {
        target: {
          id: user._id,
          type: 'User',
          name: user.username
        },
        result: 'SUCCESS',
        details: {
          description: `用户修改密码`
        },
        riskLevel: 'MEDIUM',
        villageId: user.villageId
      });

      logger.info('用户密码修改成功', {
        userId: user._id,
        username: user.username
      });

      return {
        success: true,
        message: '密码修改成功'
      };

    } catch (error) {
      logger.error('修改密码失败:', error);
      return {
        success: false,
        error: '修改密码失败',
        message: error.message
      };
    }
  }

  /**
   * 启用多因子认证
   * @param {string} userId - 用户ID
   * @param {string} phone - 手机号
   * @param {string} type - MFA类型（sms/email/totp）
   * @returns {Promise<Object>} 启用结果
   */
  async enableMFA(userId, phone, type = 'sms') {
    try {
      // 生成验证码
      const mfaCode = crypto.randomInt(100000, 999999).toString();

      // 存储验证码（5分钟有效期）
      const mfaKey = `mfa:${userId}`;
      await CacheUtil.set(mfaKey, {
        code: mfaCode,
        type,
        phone,
        createdAt: new Date()
      }, 5 * 60);

      // 发送验证码
      if (type === 'sms') {
        // 这里应该调用短信服务
        logger.info('MFA验证码已发送', {
          userId,
          phone: this.maskPhone(phone),
          code: mfaCode
        });
      }

      return {
        success: true,
        message: '验证码已发送',
        mfaType: type
      };

    } catch (error) {
      logger.error('启用MFA失败:', error);
      return {
        success: false,
        error: '启用多因子认证失败',
        message: error.message
      };
    }
  }

  /**
   * 验证MFA码
   * @param {Object} user - 用户对象
   * @param {string} mfaCode - MFA验证码
   * @returns {Promise<boolean>} 验证结果
   */
  async verifyMFACode(user, mfaCode) {
    try {
      const mfaKey = `mfa:${user._id}`;
      const storedMFA = await CacheUtil.get(mfaKey);

      if (!storedMFA) {
        return false;
      }

      // 验证码有效期检查（5分钟）
      const createdAt = new Date(storedMFA.createdAt);
      const now = new Date();
      const diffMinutes = (now - createdAt) / (1000 * 60);

      if (diffMinutes > 5) {
        await CacheUtil.del(mfaKey);
        return false;
      }

      // 验证码匹配
      const isValid = storedMFA.code === mfaCode;

      if (isValid) {
        // 删除已使用的验证码
        await CacheUtil.del(mfaKey);
      }

      return isValid;

    } catch (error) {
      logger.error('验证MFA码失败:', error);
      return false;
    }
  }

  /**
   * 检查账户锁定状态
   * @param {string} username - 用户名
   * @returns {Object} 锁定状态
   */
  checkLockout(username) {
    const attempts = this.failedAttempts.get(username);
    if (!attempts) {
      return { allowed: true };
    }

    const now = Date.now();
    if (attempts.count >= this.maxLoginAttempts) {
      const timeSinceLastAttempt = now - attempts.lastAttempt;
      if (timeSinceLastAttempt < this.lockoutDuration) {
        const remainingTime = Math.ceil(
          (this.lockoutDuration - timeSinceLastAttempt) / 1000 / 60
        );
        return {
          allowed: false,
          remainingTime
        };
      } else {
        // 锁定时间已过，清除记录
        this.failedAttempts.delete(username);
      }
    }

    return { allowed: true };
  }

  /**
   * 记录失败登录尝试
   * @param {string} username - 用户名
   */
  recordFailedAttempt(username) {
    const attempts = this.failedAttempts.get(username) || {
      count: 0,
      lastAttempt: 0
    };

    attempts.count++;
    attempts.lastAttempt = Date.now();
    this.failedAttempts.set(username, attempts);

    // 设置自动清理（锁定时间过后）
    setTimeout(() => {
      this.checkLockout(username);
    }, this.lockoutDuration);
  }

  /**
   * 清除失败登录尝试
   * @param {string} username - 用户名
   */
  clearFailedAttempts(username) {
    this.failedAttempts.delete(username);
  }

  /**
   * 验证访问令牌
   * @param {string} token - 访问令牌
   * @returns {Object} 验证结果
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 检查令牌是否在黑名单中
      if (this.tokenBlacklist.has(token)) {
        return {
          valid: false,
          error: '令牌已失效',
          code: 'TOKEN_BLACKLISTED'
        };
      }

      return {
        valid: true,
        user: decoded
      };

    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return {
          valid: false,
          error: '无效的令牌',
          code: 'INVALID_TOKEN'
        };
      }

      if (error.name === 'TokenExpiredError') {
        return {
          valid: false,
          error: '令牌已过期',
          code: 'TOKEN_EXPIRED'
        };
      }

      return {
        valid: false,
        error: '令牌验证失败',
        code: 'VERIFICATION_FAILED'
      };
    }
  }

  /**
   * 撤销访问令牌
   * @param {string} token - 访问令牌
   */
  revokeToken(token) {
    this.tokenBlacklist.add(token);

    // 设置黑名单清理（令牌过期后）
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        const ttl = decoded.exp * 1000 - Date.now();
        if (ttl > 0) {
          setTimeout(() => {
            this.tokenBlacklist.delete(token);
          }, ttl);
        }
      }
    } catch (error) {
      // 忽略解析错误
    }
  }

  /**
   * 脱敏处理手机号
   * @param {string} phone - 手机号
   * @returns {string} 脱敏后的手机号
   */
  maskPhone(phone) {
    if (!phone || phone.length < 7) return phone;
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }

  /**
   * 获取用户权限列表
   * @param {Object} user - 用户对象
   * @returns {Array} 权限列表
   */
  getUserPermissions(user) {
    const basePermissions = ['profile:view', 'profile:edit'];

    switch (user.role) {
      case 'admin':
        return [
          ...basePermissions,
          'system:manage',
          'user:create',
          'user:edit',
          'user:delete',
          'village:create',
          'village:edit',
          'village:delete',
          'audit:view',
          'system:monitor'
        ];

      case 'village_admin':
        return [
          ...basePermissions,
          'resident:create',
          'resident:edit',
          'resident:view',
          'governance:manage',
          'finance:view',
          'finance:create',
          'finance:edit',
          'emergency:manage',
          'ecommerce:manage'
        ];

      case 'village_official':
        return [
          ...basePermissions,
          'resident:view',
          'governance:create',
          'governance:edit',
          'finance:view',
          'emergency:create',
          'emergency:edit',
          'ecommerce:view'
        ];

      default:
        return basePermissions;
    }
  }
}

module.exports = new AuthService();