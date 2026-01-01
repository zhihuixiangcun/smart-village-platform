/**
 * 认证服务层
 */

const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const redis = require('redis');
const User = require('../models/User');
const Logger = require('../utils/Logger');

class AuthService {
  constructor() {
    this.redisClient = null;
    this.blacklistPrefix = 'token:blacklist:';
    this.refreshTokenPrefix = 'refresh_token:';
  }

  /**
   * 初始化Redis连接
   */
  async initRedis() {
    try {
      this.redisClient = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0
      });

      await this.redisClient.connect();
      Logger.info('认证服务Redis连接成功');
      return true;
    } catch (error) {
      Logger.error('认证服务Redis连接失败:', error);
      throw error;
    }
  }

  /**
   * 检查Redis健康状态
   */
  async checkRedisHealth() {
    try {
      if (!this.redisClient) {
        await this.initRedis();
      }

      await this.redisClient.ping();
      return 'connected';
    } catch (error) {
      return 'error';
    }
  }

  /**
   * 用户登录
   */
  async login(identifier, password, deviceInfo = {}) {
    try {
      // 查找用户
      const user = await User.findByEmailOrUsername(identifier);
      if (!user) {
        throw new Error('用户名或密码错误');
      }

      // 验证密码
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('用户名或密码错误');
      }

      // 检查用户状态
      if (!user.isActive) {
        throw new Error('账户已被禁用');
      }

      // 检查邮箱验证
      if (!user.isEmailVerified && process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
        throw new Error('请先验证邮箱');
      }

      // 检查双因子认证
      if (user.twoFactorAuth.enabled) {
        return {
          requiresTwoFactor: true,
          userId: user._id,
          message: '请输入双因子认证码'
        };
      }

      // 生成令牌
      const tokens = await this.generateTokens(user, deviceInfo);

      // 更新登录信息
      await this.updateLoginInfo(user, deviceInfo);

      // 清理过期会话
      await user.cleanExpiredSessions();

      Logger.info('用户登录成功', {
        userId: user._id,
        username: user.username,
        ip: deviceInfo.ip,
        userAgent: deviceInfo.userAgent
      });

      return {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          avatar: user.profile.avatar,
          roles: user.roles,
          permissions: user.permissions,
          villageId: user.villageId,
          isEmailVerified: user.isEmailVerified,
          twoFactorEnabled: user.twoFactorAuth.enabled
        },
        tokens
      };
    } catch (error) {
      Logger.error('用户登录失败:', {
        identifier,
        error: error.message,
        ip: deviceInfo.ip
      });
      throw error;
    }
  }

  /**
   * 双因子认证验证
   */
  async verifyTwoFactor(userId, token, deviceInfo = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      if (!user.twoFactorAuth.enabled) {
        throw new Error('双因子认证未启用');
      }

      // 验证双因子认证码
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorAuth.secret,
        encoding: 'base32',
        token: token,
        window: 2 // 允许时间窗口
      });

      if (!verified) {
        throw new Error('双因子认证码错误');
      }

      // 生成令牌
      const tokens = await this.generateTokens(user, deviceInfo);

      // 更新登录信息
      await this.updateLoginInfo(user, deviceInfo);

      Logger.info('双因子认证验证成功', {
        userId: user._id,
        ip: deviceInfo.ip
      });

      return {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          avatar: user.profile.avatar,
          roles: user.roles,
          permissions: user.permissions,
          villageId: user.villageId
        },
        tokens
      };
    } catch (error) {
      Logger.error('双因子认证验证失败:', error);
      throw error;
    }
  }

  /**
   * 生成访问令牌和刷新令牌
   */
  async generateTokens(user, deviceInfo = {}) {
    try {
      // 生成访问令牌
      const accessTokenPayload = {
        userId: user._id,
        username: user.username,
        email: user.email,
        villageId: user.villageId,
        roles: user.roles,
        permissions: user.permissions,
        type: 'access'
      };

      const accessToken = jwt.sign(accessTokenPayload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        issuer: 'smart-village-user-service',
        audience: user.villageId.toString()
      });

      // 生成刷新令牌
      const refreshTokenPayload = {
        userId: user._id,
        type: 'refresh',
        sessionId: require('crypto').randomUUID()
      };

      const refreshToken = jwt.sign(refreshTokenPayload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        issuer: 'smart-village-user-service'
      });

      // 存储刷新令牌到Redis
      if (this.redisClient) {
        await this.redisClient.setEx(
          `${this.refreshTokenPrefix}${refreshToken}`,
          7 * 24 * 60 * 60, // 7天
          JSON.stringify({
            userId: user._id,
            deviceId: deviceInfo.deviceId,
            createdAt: new Date().toISOString()
          })
        );
      }

      return {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60, // 15分钟
        tokenType: 'Bearer'
      };
    } catch (error) {
      Logger.error('生成令牌失败:', error);
      throw error;
    }
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(refreshToken) {
    try {
      // 验证刷新令牌
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);

      if (decoded.type !== 'refresh') {
        throw new Error('无效的刷新令牌');
      }

      // 检查刷新令牌是否在黑名单中
      if (this.redisClient) {
        const isBlacklisted = await this.redisClient.get(`${this.blacklistPrefix}${refreshToken}`);
        if (isBlacklisted) {
          throw new Error('刷新令牌已失效');
        }

        // 检查刷新令牌是否存在
        const tokenData = await this.redisClient.get(`${this.refreshTokenPrefix}${refreshToken}`);
        if (!tokenData) {
          throw new Error('刷新令牌不存在');
        }
      }

      // 获取用户信息
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('用户不存在或已禁用');
      }

      // 生成新的令牌对
      const tokens = await this.generateTokens(user);

      // 将旧的刷新令牌加入黑名单
      if (this.redisClient) {
        await this.redisClient.setEx(
          `${this.blacklistPrefix}${refreshToken}`,
          7 * 24 * 60 * 60, // 7天
          'true'
        );

        // 删除旧的刷新令牌
        await this.redisClient.del(`${this.refreshTokenPrefix}${refreshToken}`);
      }

      Logger.info('访问令牌刷新成功', {
        userId: user._id
      });

      return tokens;
    } catch (error) {
      Logger.error('刷新令牌失败:', error);
      throw error;
    }
  }

  /**
   * 用户登出
   */
  async logout(accessToken, refreshToken = null) {
    try {
      // 将访问令牌加入黑名单
      if (accessToken) {
        const decoded = jwt.decode(accessToken);
        if (decoded) {
          const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
          if (expiresIn > 0 && this.redisClient) {
            await this.redisClient.setEx(
              `${this.blacklistPrefix}${accessToken}`,
              expiresIn,
              'true'
            );
          }
        }
      }

      // 将刷新令牌加入黑名单
      if (refreshToken && this.redisClient) {
        await this.redisClient.setEx(
          `${this.blacklistPrefix}${refreshToken}`,
          7 * 24 * 60 * 60, // 7天
          'true'
        );

        await this.redisClient.del(`${this.refreshTokenPrefix}${refreshToken}`);
      }

      return true;
    } catch (error) {
      Logger.error('用户登出失败:', error);
      throw error;
    }
  }

  /**
   * 用户登出所有设备
   */
  async logoutAll(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 清理用户会话
      await user.logoutAll();

      // 清理Redis中的刷新令牌
      if (this.redisClient) {
        const keys = await this.redisClient.keys(`${this.refreshTokenPrefix}*`);
        for (const key of keys) {
          const tokenData = await this.redisClient.get(key);
          if (tokenData) {
            const data = JSON.parse(tokenData);
            if (data.userId === userId.toString()) {
              await this.redisClient.del(key);
            }
          }
        }
      }

      Logger.info('用户登出所有设备成功', {
        userId
      });

      return true;
    } catch (error) {
      Logger.error('登出所有设备失败:', error);
      throw error;
    }
  }

  /**
   * 验证令牌
   */
  async validateToken(token) {
    try {
      // 检查令牌是否在黑名单中
      if (this.redisClient) {
        const isBlacklisted = await this.redisClient.get(`${this.blacklistPrefix}${token}`);
        if (isBlacklisted) {
          throw new Error('令牌已失效');
        }
      }

      // 验证JWT令牌
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 获取最新用户信息
      const user = await User.findById(decoded.userId)
        .populate('roles')
        .lean();

      if (!user || !user.isActive) {
        throw new Error('用户不存在或已禁用');
      }

      return {
        valid: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          roles: user.roles,
          permissions: user.permissions,
          villageId: user.villageId
        },
        decoded
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * 启用双因子认证
   */
  async enableTwoFactor(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      if (user.twoFactorAuth.enabled) {
        throw new Error('双因子认证已启用');
      }

      // 生成密钥
      const secret = speakeasy.generateSecret({
        name: `SmartVillage-${user.username}`,
        issuer: 'Smart Village Platform'
      });

      // 生成二维码
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

      // 生成备用码
      const backupCodes = [];
      for (let i = 0; i < 10; i++) {
        backupCodes.push({
          code: speakeasy.generateSecret({ length: 20 }).base32,
          used: false,
          usedAt: null
        });
      }

      // 保存密钥（不启用）
      user.twoFactorAuth.secret = secret.base32;
      user.twoFactorAuth.backupCodes = backupCodes;

      await user.save();

      Logger.info('双因子认证设置完成', {
        userId: user._id
      });

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        backupCodes: backupCodes.map(bc => bc.code)
      };
    } catch (error) {
      Logger.error('启用双因子认证失败:', error);
      throw error;
    }
  }

  /**
   * 确认启用双因子认证
   */
  async confirmTwoFactor(userId, verificationCode) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      if (!user.twoFactorAuth.secret) {
        throw new Error('双因子认证未设置');
      }

      if (user.twoFactorAuth.enabled) {
        throw new Error('双因子认证已启用');
      }

      // 验证认证码
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorAuth.secret,
        encoding: 'base32',
        token: verificationCode,
        window: 2
      });

      if (!verified) {
        throw new Error('认证码错误');
      }

      // 启用双因子认证
      user.twoFactorAuth.enabled = true;
      await user.save();

      Logger.info('双因子认证启用成功', {
        userId: user._id
      });

      return true;
    } catch (error) {
      Logger.error('确认双因子认证失败:', error);
      throw error;
    }
  }

  /**
   * 禁用双因子认证
   */
  async disableTwoFactor(userId, password) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      if (!user.twoFactorAuth.enabled) {
        throw new Error('双因子认证未启用');
      }

      // 验证密码
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('密码错误');
      }

      // 禁用双因子认证
      user.twoFactorAuth.enabled = false;
      user.twoFactorAuth.secret = null;
      user.twoFactorAuth.backupCodes = [];

      await user.save();

      Logger.info('双因子认证禁用成功', {
        userId: user._id
      });

      return true;
    } catch (error) {
      Logger.error('禁用双因子认证失败:', error);
      throw error;
    }
  }

  /**
   * 更新登录信息
   */
  async updateLoginInfo(user, deviceInfo) {
    user.lastLoginAt = new Date();
    user.lastLoginIP = deviceInfo.ip || null;
    await user.save();
  }

  /**
   * 获取用户会话列表
   */
  async getUserSessions(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      return user.sessions
        .filter(session => session.isActive)
        .map(session => ({
          deviceId: session.deviceId,
          deviceName: session.deviceName,
          ip: session.ip,
          createdAt: session.createdAt,
          lastActiveAt: session.lastActiveAt
        }));
    } catch (error) {
      Logger.error('获取用户会话失败:', error);
      throw error;
    }
  }
}

module.exports = AuthService;