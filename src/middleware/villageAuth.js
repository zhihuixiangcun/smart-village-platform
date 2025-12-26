const jwt = require('jsonwebtoken');
const VillageUser = require('../models/VillageUser');
const logger = require('../utils/logger');

// 认证中间件
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '访问被拒绝，未提供认证令牌'
      });
    }

    // 验证令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 查找用户
    const user = await VillageUser.findById(decoded.userId).select('-password -faceFeatures');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '令牌无效，用户不存在'
      });
    }

    // 检查用户状态
    if (!user.isActive || user.workStatus !== 'active') {
      return res.status(401).json({
        success: false,
        message: '用户账号已被禁用'
      });
    }

    // 将用户信息添加到请求对象
    req.user = {
      userId: user._id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      level: user.level,
      villageId: user.villageId,
      villageName: user.villageName,
      permissions: user.permissions
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '令牌无效'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '令牌已过期'
      });
    } else {
      logger.error('认证中间件错误:', error);
      return res.status(500).json({
        success: false,
        message: '认证失败'
      });
    }
  }
};

// 权限检查中间件
const authorize = (module, action) => {
  return (req, res, next) => {
    try {
      // 检查用户是否有执行该操作的权限
      const hasPermission = req.user.level === 'admin' ||
        req.user.permissions.some(perm =>
          perm.module === module && perm.actions.includes(action)
        );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: '权限不足，无法执行此操作'
        });
      }

      next();
    } catch (error) {
      logger.error('权限检查错误:', error);
      return res.status(500).json({
        success: false,
        message: '权限检查失败'
      });
    }
  };
};

// 村庄权限检查
const checkVillageAccess = (req, res, next) => {
  try {
    const { villageId } = req.params;

    // 管理员可以访问所有村庄
    if (req.user.level === 'admin') {
      return next();
    }

    // 检查用户是否属于该村庄
    if (req.user.villageId.toString() !== villageId) {
      return res.status(403).json({
        success: false,
        message: '无权访问该村庄的数据'
      });
    }

    next();
  } catch (error) {
    logger.error('村庄权限检查错误:', error);
    return res.status(500).json({
      success: false,
      message: '权限检查失败'
    });
  }
};

// 角色检查中间件
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!allowedRoles.includes(req.user.role) && req.user.level !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '角色权限不足'
        });
      }

      next();
    } catch (error) {
      logger.error('角色检查错误:', error);
      return res.status(500).json({
        success: false,
        message: '角色检查失败'
      });
    }
  };
};

// 可选认证中间件（不强制要求登录）
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await VillageUser.findById(decoded.userId).select('-password -faceFeatures');

      if (user && user.isActive && user.workStatus === 'active') {
        req.user = {
          userId: user._id,
          phone: user.phone,
          name: user.name,
          role: user.role,
          level: user.level,
          villageId: user.villageId,
          villageName: user.villageName,
          permissions: user.permissions
        };
      }
    }

    next();
  } catch (error) {
    // 忽略认证错误，继续执行
    next();
  }
};

// API访问限制中间件
const rateLimitByUser = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.userId;
    const now = Date.now();
    const windowStart = now - windowMs;

    // 获取用户请求记录
    const userRequests = requests.get(userId) || [];

    // 清理过期的请求记录
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart);

    // 检查是否超过限制
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: '请求过于频繁，请稍后再试',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // 记录当前请求
    validRequests.push(now);
    requests.set(userId, validRequests);

    next();
  };
};

// 设备信任检查
const checkTrustedDevice = async (req, res, next) => {
  try {
    const deviceId = req.header('X-Device-ID');

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: '缺少设备标识'
      });
    }

    const user = await VillageUser.findById(req.user.userId);
    const device = user.devices.find(d => d.deviceId === deviceId);

    if (!device) {
      return res.status(403).json({
        success: false,
        message: '设备未注册，请先在信任设备上登录'
      });
    }

    // 更新设备最后活动时间
    device.lastActive = new Date();
    await user.save();

    req.device = device;
    next();
  } catch (error) {
    logger.error('设备信任检查错误:', error);
    return res.status(500).json({
      success: false,
      message: '设备验证失败'
    });
  }
};

module.exports = {
  authenticate,
  authorize,
  checkVillageAccess,
  checkRole,
  optionalAuth,
  rateLimitByUser,
  checkTrustedDevice
};