/**
 * 增强版认证中间件
 * 处理JWT认证、权限验证、会话管理和亲属代理
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { FamilyRelation } = require('../models/FaceRecognition');
const crypto = require('crypto');
const logger = require('../utils/logger');

class AuthMiddleware {
  constructor() {
    // 强制要求 JWT_SECRET 环境变量，不允许使用默认弱密钥
    if (!process.env.JWT_SECRET) {
      throw new Error(
        'FATAL: JWT_SECRET environment variable is required. ' +
        'Please set a strong, random secret key (at least 32 characters). ' +
        'You can generate one using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }

    // 验证 JWT_SECRET 强度
    if (process.env.JWT_SECRET.length < 32) {
      throw new Error(
        'FATAL: JWT_SECRET must be at least 32 characters long for security. ' +
        `Current length: ${process.env.JWT_SECRET.length} characters.`
      );
    }

    // 检查是否使用了示例密钥
    const weakSecrets = ['your-secret-key', 'secret', 'jwt-secret', 'change-me', 'demo-secret'];
    if (weakSecrets.includes(process.env.JWT_SECRET.toLowerCase())) {
      throw new Error(
        'FATAL: JWT_SECRET cannot be a weak/common value. ' +
        'Please generate a secure random secret key.'
      );
    }

    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtAlgorithm = 'HS256';
    // 安全改进: 访问令牌默认过期时间设置为2小时
    // 可以通过环境变量 JWT_ACCESS_EXPIRES_IN 或 JWT_EXPIRES_IN 覆盖
    this.jwtExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '2h';
    // 刷新令牌过期时间保持7天（合理范围）
    this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

    // 会话管理
    this.activeSessions = new Map();
    this.maxSessionsPerUser = parseInt(process.env.MAX_SESSIONS_PER_USER) || 5;

    // 记录安全配置
    logger.info('AuthMiddleware initialized with secure JWT configuration', {
      algorithm: this.jwtAlgorithm,
      accessTokenExpiry: this.jwtExpiresIn,
      refreshTokenExpiry: this.refreshTokenExpiresIn,
      maxSessionsPerUser: this.maxSessionsPerUser
    });
  }

  /**
   * 主认证中间件
   */
  authenticate = async (req, res, next) => {
    try {
      // 获取token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: '认证失败',
          message: '缺少认证令牌'
        });
      }

      const token = authHeader.substring(7);

       // 验证token
       const decoded = jwt.verify(token, this.jwtSecret, {
         algorithm: this.jwtAlgorithm
       });

      //  TODO: 暂时移除会话验证，待实现完整的会话管理
      // const session = this.activeSessions.get(decoded.sessionId);
      // if (!session || session.status !== 'active') {
      //   return res.status(401).json({
      //     error: '认证失败',
      //     message: '会话已过期或无效'
      //   });
      // }

      // 获取用户信息
      const user = await User.findById(decoded.userId).select('-password');
      if (!user || user.status !== 'active') {
        return res.status(401).json({
          error: '认证失败',
          message: '用户不存在或已被禁用'
        });
      }

      // 检查用户权限是否变更（兼容 undefined 和空数组）
      const userPerms = user.permissions || [];
      const decodedPerms = decoded.permissions || [];
      if (JSON.stringify(userPerms) !== JSON.stringify(decodedPerms)) {
        // 权限变更，需要重新登录
        this.revokeSession(decoded.sessionId);
        return res.status(401).json({
          error: '认证失败',
          message: '用户权限已变更，请重新登录'
        });
      }

      // 更新会话活动时间
      session.lastActivity = new Date();
      this.activeSessions.set(decoded.sessionId, session);

      // 将用户信息添加到请求对象
      req.user = user;
      req.session = {
        sessionId: decoded.sessionId,
        loginTime: session.loginTime,
        lastActivity: session.lastActivity,
        deviceInfo: session.deviceInfo
      };

      next();

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: '认证失败',
          message: '令牌已过期'
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: '认证失败',
          message: '无效的令牌'
        });
      }

      logger.error('认证中间件错误:', error);
      return res.status(500).json({
        error: '认证失败',
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 权限验证中间件
   */
  requirePermissions = (requiredPermissions) => {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            error: '认证失败',
            message: '请先登录'
          });
        }

        const userPermissions = req.user.permissions || [];

        // 检查是否拥有所需权限
        const hasPermission = requiredPermissions.every(permission =>
          userPermissions.includes(permission)
        );

        if (!hasPermission) {
          return res.status(403).json({
            error: '权限不足',
            message: '您没有执行此操作的权限',
            required: requiredPermissions,
            current: userPermissions
          });
        }

        next();

      } catch (error) {
        logger.error('权限验证错误:', error);
        return res.status(500).json({
          error: '权限验证失败',
          message: '服务器内部错误'
        });
      }
    };
  };

  /**
   * 角色验证中间件
   */
  requireRoles = (requiredRoles) => {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            error: '认证失败',
            message: '请先登录'
          });
        }

        const userRole = req.user.role;

        if (!requiredRoles.includes(userRole)) {
          return res.status(403).json({
            error: '权限不足',
            message: '您的角色无权执行此操作',
            required: requiredRoles,
            current: [userRole]
          });
        }

        next();

      } catch (error) {
        logger.error('角色验证错误:', error);
        return res.status(500).json({
          error: '角色验证失败',
          message: '服务器内部错误'
        });
      }
    };
  };

  /**
   * 亲属代理权限验证中间件
   */
  requireProxyPermission = (permission, targetUserIdParam = 'targetUserId') => {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            error: '认证失败',
            message: '请先登录'
          });
        }

        const targetUserId = req.params[targetUserIdParam] || req.body[targetUserIdParam];
        if (!targetUserId) {
          return res.status(400).json({
            error: '参数错误',
            message: '缺少目标用户ID'
          });
        }

        // 检查是否是用户自己
        if (req.user._id.toString() === targetUserId) {
          return next();
        }

        // 检查代理权限
        const hasProxyPermission = await this.checkProxyPermission(
          req.user._id.toString(),
          targetUserId,
          permission,
          req.body.villageId
        );

        if (!hasProxyPermission) {
          return res.status(403).json({
            error: '权限不足',
            message: '您没有代理操作此用户的权限',
            suggestion: '请联系管理员或创建代理关系'
          });
        }

        // 添加代理操作标记
        req.isProxyOperation = true;
        req.proxyTargetUserId = targetUserId;

        next();

      } catch (error) {
        logger.error('代理权限验证错误:', error);
        return res.status(500).json({
          error: '代理权限验证失败',
          message: '服务器内部错误'
        });
      }
    };
  };

  /**
   * 多因子认证验证中间件
   */
  requireMFA = (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: '认证失败',
          message: '请先登录'
        });
      }

      // 检查是否启用了MFA
      if (!req.user.mfaEnabled) {
        return next();
      }

      // 检查MFA验证状态
      const mfaVerified = req.headers['x-mfa-verified'] === 'true';

      if (!mfaVerified) {
        return res.status(403).json({
          error: '多因子认证失败',
          message: '此操作需要多因子认证',
          requiredAction: 'mfa_verification'
        });
      }

      next();

    } catch (error) {
      logger.error('MFA验证错误:', error);
      return res.status(500).json({
        error: '多因子认证失败',
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 设备信任验证中间件
   */
  requireTrustedDevice = (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: '认证失败',
          message: '请先登录'
        });
      }

      const deviceId = req.get('X-Device-ID');

      // 检查是否为信任设备
      const isTrustedDevice = req.user.trustedDevices?.includes(deviceId);

      if (!isTrustedDevice) {
        return res.status(403).json({
          error: '设备未授权',
          message: '此操作需要在信任设备上执行',
          requiredAction: 'device_trust_verification'
        });
      }

      next();

    } catch (error) {
      logger.error('设备信任验证错误:', error);
      return res.status(500).json({
        error: '设备信任验证失败',
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 检查代理权限
   */
  async checkProxyPermission(agentUserId, principalUserId, permission, villageId) {
    try {
      // 查找有效的代理关系
      const relation = await FamilyRelation.findOne({
        agentUserId,
        principalUserId,
        villageId,
        status: 'active',
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      });

      if (!relation) {
        return false;
      }

      // 检查时间限制
      if (relation.permissions.restrictions?.timeRestrictions) {
        const now = new Date();
        const timeRestrictions = relation.permissions.restrictions.timeRestrictions;

        // 检查日期限制
        if (timeRestrictions.startDate && now < new Date(timeRestrictions.startDate)) {
          return false;
        }

        if (timeRestrictions.endDate && now > new Date(timeRestrictions.endDate)) {
          return false;
        }

        // 检查时间段限制
        if (timeRestrictions.allowedHours) {
          const currentHour = now.getHours();
          const [startHour, endHour] = timeRestrictions.allowedHours
            .split('-')
            .map(h => parseInt(h));

          if (currentHour < startHour || currentHour > endHour) {
            return false;
          }
        }

        // 检查星期限制
        if (timeRestrictions.allowedDays) {
          const currentDay = now.getDay();
          if (!timeRestrictions.allowedDays.includes(currentDay)) {
            return false;
          }
        }
      }

      // 检查权限类型
      if (permission.startsWith('query_')) {
        const permissionName = permission.replace('query_', '');
        return relation.permissions.queryPermissions.includes(permissionName);
      } else if (permission.startsWith('action_')) {
        const permissionName = permission.replace('action_', '');
        return relation.permissions.actionPermissions.includes(permissionName);
      }

      return false;

    } catch (error) {
      logger.error('检查代理权限失败:', error);
      return false;
    }
  }

  /**
   * 生成JWT令牌
   */
  generateTokens(user, deviceInfo = {}) {
    const sessionId = crypto.randomUUID();

    // 生成访问令牌
    const accessToken = jwt.sign(
      {
        userId: user._id,
        sessionId,
        permissions: user.permissions,
        role: user.role,
        type: 'access'
      },
      this.jwtSecret,
      {
        algorithm: this.jwtAlgorithm,
        expiresIn: this.jwtExpiresIn
      }
    );

    // 生成刷新令牌
    const refreshToken = jwt.sign(
      {
        userId: user._id,
        sessionId,
        type: 'refresh'
      },
      this.jwtSecret,
      {
        algorithm: this.jwtAlgorithm,
        expiresIn: this.refreshTokenExpiresIn
      }
    );

    // 创建会话
    const session = {
      sessionId,
      userId: user._id,
      status: 'active',
      loginTime: new Date(),
      lastActivity: new Date(),
      deviceInfo: {
        userAgent: deviceInfo.userAgent,
        ipAddress: deviceInfo.ipAddress,
        deviceId: deviceInfo.deviceId,
        platform: deviceInfo.platform
      }
    };

    // 清理旧会话
    this.cleanupOldSessions(user._id.toString());

    // 添加会话
    this.activeSessions.set(sessionId, session);

    return {
      accessToken,
      refreshToken,
      sessionId,
      expiresIn: this.parseExpiresIn(this.jwtExpiresIn)
    };
  }

  /**
   * 撤销会话
   */
  revokeSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'revoked';
      session.revokedAt = new Date();
      this.activeSessions.set(sessionId, session);
    }
  }

  /**
   * 清理旧会话
   */
  cleanupOldSessions(userId) {
    const userSessions = [];

    // 收集用户的所有活跃会话
    for (const [sessionId, session] of this.activeSessions) {
      if (session.userId.toString() === userId && session.status === 'active') {
        userSessions.push({ sessionId, session });
      }
    }

    // 如果会话数超过限制，撤销最旧的会话
    if (userSessions.length >= this.maxSessionsPerUser) {
      userSessions.sort((a, b) => a.session.loginTime - b.session.loginTime);

      const toRevoke = userSessions.slice(0, userSessions.length - this.maxSessionsPerUser + 1);
      toRevoke.forEach(({ sessionId }) => {
        this.revokeSession(sessionId);
      });
    }
  }

  /**
   * 解析过期时间
   */
  parseExpiresIn(expiresIn) {
    const match = expiresIn.match(/(\d+)([smhd])/);
    if (!match) return 3600; // 默认1小时

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 3600;
    }
  }
}

// 创建单例实例
const authMiddleware = new AuthMiddleware();

// 导出所有中间件和工具
module.exports = {
  // 主认证中间件（向后兼容）
  authenticate: authMiddleware.authenticate,
  authenticateToken: authMiddleware.authenticate,  // 别名
  requirePermissions: authMiddleware.requirePermissions,
  requireRoles: authMiddleware.requireRoles,
  requireProxyPermission: authMiddleware.requireProxyPermission,
  requireMFA: authMiddleware.requireMFA,
  requireTrustedDevice: authMiddleware.requireTrustedDevice,
  generateTokens: authMiddleware.generateTokens.bind(authMiddleware),
  revokeSession: authMiddleware.revokeSession.bind(authMiddleware)
};

/**
 * 可选认证中间件
 * 允许未认证用户访问，但如果提供了token则尝试验证
 */
const optional = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // 没有token，继续处理但不设置req.user
      return next();
    }

    const token = authHeader.substring(7);

    // 验证token
    const decoded = jwt.verify(token, authMiddleware.jwtSecret, {
      algorithm: authMiddleware.jwtAlgorithm
    });

    // 检查会话是否有效
    const session = authMiddleware.activeSessions.get(decoded.sessionId);
    if (!session || session.status !== 'active') {
      // 会话无效，继续处理但不设置req.user
      return next();
    }

    // 获取用户信息
    const user = await User.findById(decoded.userId).select('-password');
    if (!user || user.status !== 'active') {
      // 用户不存在或已禁用，继续处理但不设置req.user
      return next();
    }

    // 检查用户权限是否变更（兼容 undefined 和空数组）
    const userPerms = user.permissions || [];
    const decodedPerms = decoded.permissions || [];
    if (JSON.stringify(userPerms) !== JSON.stringify(decodedPerms)) {
      authMiddleware.revokeSession(decoded.sessionId);
      return next();
    }

    // 更新会话活动时间
    session.lastActivity = new Date();
    authMiddleware.activeSessions.set(decoded.sessionId, session);

    // 将用户信息添加到请求对象
    req.user = user;
    req.session = {
      sessionId: decoded.sessionId,
      loginTime: session.loginTime,
      lastActivity: session.lastActivity,
      deviceInfo: session.deviceInfo
    };

    next();

  } catch (error) {
    // 忽略认证错误，继续处理但不设置req.user
    if (error.name !== 'TokenExpiredError' && error.name !== 'JsonWebTokenError') {
      logger.warn('Optional authentication warning:', error.message);
    }
    next();
  }
};

module.exports.optional = optional;