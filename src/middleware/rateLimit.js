/**
 * 人脸识别API频率限制中间件
 * 根据操作类型设置不同的访问频率限制
 */

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// 基础配置（使用内存存储，适合单服务器部署）
const baseConfig = {
  standardHeaders: true, // 返回标准的 `RateLimit` 头
  legacyHeaders: false,  // 禁用 `X-RateLimit-*` 头
  keyGenerator: (req) => {
    // 使用用户ID + IP作为限制键
    return req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: '请求过于频繁',
      message: '您的请求过于频繁，请稍后再试',
      retryAfter: res.get('Retry-After')
    });
  }
};

// 人脸检测限制 - 每分钟30次
const faceDetection = rateLimit({
  ...baseConfig,
  windowMs: 60 * 1000, // 1分钟
  max: 30,
  message: {
    error: '人脸检测请求过于频繁',
    message: '每分钟最多可进行30次人脸检测'
  }
});

// 人脸注册限制 - 每小时5次
const faceRegister = rateLimit({
  ...baseConfig,
  windowMs: 60 * 60 * 1000, // 1小时
  max: 5,
  message: {
    error: '人脸注册请求过于频繁',
    message: '每小时最多可注册5次人脸'
  }
});

// 人脸验证限制 - 每分钟20次
const faceVerify = rateLimit({
  ...baseConfig,
  windowMs: 60 * 1000, // 1分钟
  max: 20,
  message: {
    error: '人脸验证请求过于频繁',
    message: '每分钟最多可进行20次人脸验证'
  }
});

// 人脸识别限制 - 每分钟10次
const faceIdentify = rateLimit({
  ...baseConfig,
  windowMs: 60 * 1000, // 1分钟
  max: 10,
  message: {
    error: '人脸识别请求过于频繁',
    message: '每分钟最多可进行10次人脸识别'
  }
});

// 活体检测限制 - 每分钟15次
const livenessDetection = rateLimit({
  ...baseConfig,
  windowMs: 60 * 1000, // 1分钟
  max: 15,
  message: {
    error: '活体检测请求过于频繁',
    message: '每分钟最多可进行15次活体检测'
  }
});

// 亲属关系操作限制 - 每小时10次
const familyRelation = rateLimit({
  ...baseConfig,
  windowMs: 60 * 60 * 1000, // 1小时
  max: 10,
  message: {
    error: '亲属关系操作过于频繁',
    message: '每小时最多可进行10次亲属关系操作'
  }
});

// 人脸删除限制 - 每小时3次
const faceDelete = rateLimit({
  ...baseConfig,
  windowMs: 60 * 60 * 1000, // 1小时
  max: 3,
  message: {
    error: '人脸删除请求过于频繁',
    message: '每小时最多可删除3次人脸数据'
  }
});

// 批量操作限制 - 每分钟5次
const batchOperation = rateLimit({
  ...baseConfig,
  windowMs: 60 * 1000, // 1分钟
  max: 5,
  message: {
    error: '批量操作请求过于频繁',
    message: '每分钟最多可进行5次批量操作'
  }
});

// 一般操作限制 - 每分钟100次
const general = rateLimit({
  ...baseConfig,
  windowMs: 60 * 1000, // 1分钟
  max: 100,
  message: {
    error: '请求过于频繁',
    message: '每分钟最多可进行100次一般操作'
  }
});

// 基于IP的严格限制（用于未认证请求）
const strictIP = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 10,
  keyGenerator: (req) => `ip:${req.ip}`,
  message: {
    error: '来自该IP的请求过于频繁',
    message: '请稍后再试或联系我们'
  }
});

// 基于用户的自适应限制
const adaptiveRateLimit = (baseLimit, multiplier = 1) => {
  return rateLimit({
    ...baseConfig,
    windowMs: 60 * 1000, // 1分钟
    max: (req) => {
      // 根据用户权限动态调整限制
      if (!req.user) return baseLimit.max * 0.1; // 未认证用户只能使用10%的额度

      let limit = baseLimit.max;

      // 管理员增加限制
      if (req.user.permissions?.includes('admin')) {
        limit *= 3;
      }

      // VIP用户增加限制
      if (req.user.userType === 'vip') {
        limit *= 2;
      }

      // 新用户减少限制（注册少于7天）
      if (req.user.createdAt && (Date.now() - req.user.createdAt.getTime()) < 7 * 24 * 60 * 60 * 1000) {
        limit *= 0.5;
      }

      return Math.floor(limit * multiplier);
    },
    skip: (req) => {
      // 跳过系统管理员
      return req.user?.permissions?.includes('system_admin');
    }
  });
};

// 错误记录中间件
const logRateLimitViolations = (req, res, next) => {
  const originalSend = res.send;

  res.send = function(data) {
    if (res.statusCode === 429) {
      // 记录频率限制违规
      console.warn('频率限制违规:', {
        ip: req.ip,
        userId: req.user?.id,
        path: req.path,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      // 可以在这里添加告警逻辑
      // alertService.sendRateLimitAlert(req.ip, req.path);
    }

    return originalSend.call(this, data);
  };

  next();
};

// 清理过期数据的定时任务
const cleanupExpiredData = () => {
  // 每小时清理一次过期的限制数据
  setInterval(async () => {
    try {
      // Redis的TTL会自动清理过期数据
      // 这里可以添加额外的清理逻辑
      logger.debug('检查过期限制数据...');
    } catch (error) {
      logger.error('清理过期限制数据失败:', error);
    }
  }, 60 * 60 * 1000); // 1小时
};

// 启动清理任务
cleanupExpiredData();

// Factory function to create custom rate limiters
const create = (config) => {
  return rateLimit({
    ...baseConfig,
    windowMs: config.windowMs || 60 * 1000,
    max: config.max || 100,
    message: config.message || 'Too many requests'
  });
};

module.exports = {
  faceDetection,
  faceRegister,
  faceVerify,
  faceIdentify,
  livenessDetection,
  familyRelation,
  faceDelete,
  batchOperation,
  general,
  strictIP,
  adaptiveRateLimit,
  logRateLimitViolations,
  create
};