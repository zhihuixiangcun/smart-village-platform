/**
 * 缓存中间件
 * 为Express应用提供智能缓存功能
 */

const cacheManager = require('../cache/cacheManager');
const logger = require('../utils/logger');

/**
 * 智能缓存中间件
 * @param {string} type - 业务类型
 * @param {Object} options - 缓存选项
 */
const smartCache = (type, options = {}) => {
  return async (req, res, next) => {
    // 生成缓存键
    const cacheKey = generateCacheKey(req, type);

    try {
      // 尝试从缓存获取数据
      const cachedData = await cacheManager.smartGet(type, cacheKey, options);

      if (cachedData !== null) {
        // 缓存命中，直接返回
        logger.debug('缓存命中', { type, key: cacheKey });

        // 设置缓存响应头
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Type': type,
          'X-Cache-Key': cacheKey
        });

        return res.json(cachedData);
      }

      // 缓存未命中，继续处理请求
      logger.debug('缓存未命中', { type, key: cacheKey });

      // 重写res.json以缓存响应
      const originalJson = res.json;
      res.json = function(data) {
        // 只缓存成功的响应
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 异步缓存数据
          cacheManager.smartSet(type, cacheKey, data, options)
            .catch(error => {
              logger.error('缓存数据失败', {
                type,
                key: cacheKey,
                error: error.message
              });
            });
        }

        // 设置缓存响应头
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Type': type,
          'X-Cache-Key': cacheKey
        });

        return originalJson.call(this, data);
      };

      next();

    } catch (error) {
      logger.error('缓存中间件错误', {
        type,
        key: cacheKey,
        error: error.message
      });

      // 缓存错误时继续处理请求
      next();
    }
  };
};

/**
 * 缓存失效中间件
 * @param {string} type - 业务类型
 * @param {string} pattern - 失效模式
 */
const cacheInvalidation = (type, pattern) => {
  return async (req, res, next) => {
    try {
      // 生成失效键
      let invalidationKey = pattern;
      if (typeof pattern === 'function') {
        invalidationKey = pattern(req);
      }

      // 执行失效
      await cacheManager.smartInvalidate(type, invalidationKey);

      logger.debug('缓存失效完成', { type, pattern: invalidationKey });

      // 设置失效响应头
      res.set('X-Cache-Invalidated': 'true');

    } catch (error) {
      logger.error('缓存失效失败', {
        type,
        pattern,
        error: error.message
      });
    }

    next();
  };
};

/**
 * 缓存预热中间件
 * @param {Array} warmupItems - 预热项目
 */
const cacheWarmup = (warmupItems = []) => {
  return async (req, res, next) => {
    try {
      // 在后台执行预热
      setImmediate(async () => {
        await cacheManager.warmupCache(warmupItems);
      });

      logger.debug('缓存预热已启动', { count: warmupItems.length });

    } catch (error) {
      logger.error('缓存预热失败', { error: error.message });
    }

    next();
  };
};

/**
 * 缓存统计中间件
 */
const cacheStats = (req, res, next) => {
  // 获取缓存统计信息
  const stats = cacheManager.getComprehensiveReport();

  // 添加到请求对象
  req.cacheStats = stats;

  next();
};

/**
 * 缓存健康检查中间件
 */
const cacheHealthCheck = async (req, res, next) => {
  try {
    const health = await cacheManager.healthCheck();

    // 如果缓存系统不健康，记录警告
    if (health.status !== 'healthy') {
      logger.warn('缓存系统健康检查异常', health);
    }

    // 添加到请求对象
    req.cacheHealth = health;

  } catch (error) {
    logger.error('缓存健康检查失败', { error: error.message });
    req.cacheHealth = {
      status: 'unhealthy',
      error: error.message
    };
  }

  next();
};

/**
 * API专用缓存配置
 */
const apiCacheConfig = {
  // 村庄信息
  village: {
    ttl: 1000 * 60 * 60 * 2, // 2小时
    strategy: 'high_frequency',
    vary: ['query'] // 根据查询参数变化
  },

  // 公告信息
  announcement: {
    ttl: 1000 * 60 * 15, // 15分钟
    strategy: 'medium_frequency',
    invalidateOn: ['POST', 'PUT', 'DELETE']
  },

  // 政策信息
  policy: {
    ttl: 1000 * 60 * 60 * 24, // 24小时
    strategy: 'low_frequency',
    compression: true
  },

  // 紧急信息
  emergency: {
    ttl: 1000 * 60, // 1分钟
    strategy: 'realtime',
    broadcast: true
  },

  // 用户信息
  user: {
    ttl: 1000 * 60 * 30, // 30分钟
    strategy: 'medium_frequency',
    encryption: true,
    vary: ['headers.authorization'] // 根据用户变化
  }
};

/**
 * 基于API路径的智能缓存中间件
 */
const smartApiCache = (req, res, next) => {
  // 解析API路径
  const pathParts = req.path.split('/').filter(Boolean);

  if (pathParts.length >= 2 && pathParts[0] === 'api' && pathParts[1] === 'v1') {
    const apiType = pathParts[2]; // v1/[type]/...
    const config = apiCacheConfig[apiType];

    if (config) {
      // 应用对应的缓存配置
      return smartCache(apiType, config)(req, res, next);
    }
  }

  // 没有匹配的缓存配置，直接继续
  next();
};

/**
 * 预定义的缓存中间件
 */
const cacheMiddleware = {
  // 村庄相关缓存
  village: smartCache('village', apiCacheConfig.village),
  villageInvalidate: cacheInvalidation('village', '*'),

  // 公告相关缓存
  announcement: smartCache('announcement', apiCacheConfig.announcement),
  announcementInvalidate: cacheInvalidation('announcement', '*'),

  // 政策相关缓存
  policy: smartCache('policy', apiCacheConfig.policy),
  policyInvalidate: cacheInvalidation('policy', '*'),

  // 紧急信息缓存
  emergency: smartCache('emergency', apiCacheConfig.emergency),
  emergencyInvalidate: cacheInvalidation('emergency', '*'),

  // 用户信息缓存
  user: smartCache('user', apiCacheConfig.user),
  userInvalidate: cacheInvalidation('user', '*'),

  // 通用中间件
  stats: cacheStats,
  health: cacheHealthCheck,
  smartApi: smartApiCache,
  warmup: cacheWarmup
};

// 私有辅助函数

/**
 * 生成缓存键
 */
function generateCacheKey(req, type) {
  const parts = [
    req.method,
    req.path,
    type
  ];

  // 添加查询参数
  if (Object.keys(req.query).length > 0) {
    parts.push('query', JSON.stringify(req.query));
  }

  // 添加请求头（如果配置了vary）
  const varyHeaders = getVaryHeaders(req, type);
  if (varyHeaders.length > 0) {
    const headerValues = varyHeaders.map(header => req.get(header) || '').join(':');
    parts.push('headers', headerValues);
  }

  // 添加用户信息（如果是用户相关缓存）
  if (type === 'user' && req.user) {
    parts.push('user', req.user.id);
  }

  // 生成最终键
  const keyString = parts.join(':');
  return Buffer.from(keyString).toString('base64');
}

/**
 * 获取变化的请求头
 */
function getVaryHeaders(req, type) {
  const config = apiCacheConfig[type];
  if (config && config.vary) {
    return config.vary;
  }
  return [];
}

module.exports = {
  smartCache,
  cacheInvalidation,
  cacheWarmup,
  cacheStats,
  cacheHealthCheck,
  smartApiCache,
  cacheMiddleware,
  apiCacheConfig
};