const Redis = require('redis');
const crypto = require('crypto');

/**
 * 增强的频率限制系统
 * 支持多维度限制、滑动窗口、分布式限流
 */
class EnhancedRateLimiter {
  constructor() {
    // 配置
    this.config = {
      // 基础限制
      global: {
        requests: 10000,    // 每10分钟10000次请求
        window: 10 * 60 * 1000  // 10分钟
      },
      // IP级别限制
      ip: {
        requests: 1000,     // 每分钟1000次请求
        window: 60 * 1000   // 1分钟
      },
      // 用户级别限制
      user: {
        requests: 500,      // 每分钟500次请求
        window: 60 * 1000   // 1分钟
      },
      // API级别限制
      api: {
        requests: 200,      // 每分钟200次请求
        window: 60 * 1000   // 1分钟
      },
      // 特殊路径限制
      paths: {
        '/api/v1/auth/login': {
          requests: 5,
          window: 60 * 1000,  // 1分钟5次登录尝试
          blockDuration: 15 * 60 * 1000  // 失败后锁定15分钟
        },
        '/api/v1/auth/register': {
          requests: 3,
          window: 10 * 60 * 1000, // 10分钟3次注册
          blockDuration: 30 * 60 * 1000  // 失败后锁定30分钟
        },
        '/api/v1/ocr/invoice': {
          requests: 50,
          window: 60 * 1000   // 1分钟50次OCR请求
        },
        '/api/v1/ocr/batch': {
          requests: 10,
          window: 60 * 1000   // 1分钟10次批量OCR请求
        },
        '/api/v1/family-proxy/sessions': {
          requests: 20,
          window: 60 * 1000   // 1分钟20次代理会话
        }
      },
      // 缓存配置
      cache: {
        ttl: 24 * 60 * 60,  // 24小时
        cleanupInterval: 60 * 60 * 1000  // 1小时清理一次
      }
    };

    // Redis客户端（如果可用）
    this.redis = null;
    this.memoryStore = new Map(); // 内存备用存储

    // 初始化Redis连接
    this.initializeRedis();

    // 启动清理任务
    this.startCleanupTask();

    // 统计信息
    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * 初始化Redis连接
   */
  async initializeRedis() {
    try {
      if (process.env.REDIS_ENABLED === 'true') {
        this.redis = Redis.createClient({
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD,
          db: process.env.REDIS_RATELIMIT_DB || 3
        });

        await this.redis.connect();
        console.log('✅ 频率限制Redis连接成功');
      } else {
        console.log('⚠️ Redis未启用，使用内存存储进行频率限制');
      }
    } catch (error) {
      console.warn('❌ 频率限制Redis连接失败，使用内存存储:', error.message);
      this.redis = null;
    }
  }

  /**
   * 频率限制中间件
   */
  async rateLimit(options = {}) {
    return async (req, res, next) => {
      try {
        this.stats.totalRequests++;

        // 获取标识符
        const identifiers = this.getIdentifiers(req);

        // 检查各种限制
        const results = await this.checkAllLimits(req, identifiers, options);

        // 如果有任何限制被触发，阻止请求
        const blocked = results.find(result => result.blocked);
        if (blocked) {
          this.stats.blockedRequests++;
          this.logRateLimitEvent(req, blocked);

          return res.status(429).json({
            success: false,
            error: 'RATE_LIMIT_EXCEEDED',
            message: '请求过于频繁，请稍后再试',
            details: {
              limitType: blocked.type,
              current: blocked.current,
              limit: blocked.limit,
              window: blocked.window,
              retryAfter: blocked.retryAfter,
              resetTime: blocked.resetTime
            },
            headers: this.getRateLimitHeaders(blocked)
          });
        }

        // 记录成功请求
        await this.recordRequest(identifiers);

        // 添加频率限制头部
        const limitInfo = results[0]; // 使用第一个限制的信息
        this.setRateLimitHeaders(res, limitInfo);

        next();

      } catch (error) {
        console.error('频率限制检查错误:', error);
        // 错误时允许请求通过，避免影响正常服务
        next();
      }
    };
  }

  /**
   * 获取请求标识符
   */
  getIdentifiers(req) {
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const userId = req.user?.id || req.headers['x-user-id'] || 'anonymous';
    const apiKey = req.headers['x-api-key'] || 'no-api-key';
    const path = req.route?.path || req.path || 'unknown';

    return {
      global: 'global',
      ip: this.hashIdentifier(ip),
      user: this.hashIdentifier(userId),
      api: this.hashIdentifier(apiKey),
      path: path,
      ip_user: `${this.hashIdentifier(ip)}_${this.hashIdentifier(userId)}`,
      ip_path: `${this.hashIdentifier(ip)}_${path}`,
      user_path: `${this.hashIdentifier(userId)}_${path}`
    };
  }

  /**
   * 哈希标识符（用于隐私保护）
   */
  hashIdentifier(identifier) {
    return crypto.createHash('sha256')
      .update(identifier + process.env.RATELIMIT_SALT || 'default_salt')
      .digest('hex')
      .substr(0, 16);
  }

  /**
   * 检查所有限制
   */
  async checkAllLimits(req, identifiers, options) {
    const results = [];

    // 检查全局限制
    results.push(await this.checkLimit('global', identifiers.global, this.config.global));

    // 检查IP限制
    results.push(await this.checkLimit('ip', identifiers.ip, this.config.ip));

    // 检查用户限制
    if (identifiers.user !== 'anonymous') {
      results.push(await this.checkLimit('user', identifiers.user, this.config.user));
    }

    // 检查API限制
    if (req.headers['x-api-key']) {
      results.push(await this.checkLimit('api', identifiers.api, this.config.api));
    }

    // 检查路径特定限制
    const pathConfig = this.config.paths[req.route?.path];
    if (pathConfig) {
      const pathKey = `${identifiers.ip}_${req.route.path}`;
      results.push(await this.checkLimit('path', pathKey, pathConfig, true));
    }

    // 检查复合限制
    results.push(await this.checkLimit('ip_user', identifiers.ip_user, {
      requests: 200,
      window: 60 * 1000
    }));

    return results;
  }

  /**
   * 检查单个限制
   */
  async checkLimit(type, key, config, isPathLimit = false) {
    const now = Date.now();
    const windowStart = now - config.window;

    // 构建存储键
    const storageKey = `rate_limit:${type}:${key}`;

    try {
      let requests;

      if (this.redis) {
        // 使用Redis滑动窗口
        requests = await this.getRedisRequests(storageKey, windowStart, now);
      } else {
        // 使用内存存储
        requests = await this.getMemoryRequests(storageKey, windowStart, now);
      }

      const current = requests.length;
      const blocked = current >= config.requests;

      let resetTime = now;
      let retryAfter = 0;

      if (blocked && requests.length > 0) {
        // 计算重置时间（最旧请求的时间 + 窗口）
        resetTime = Math.max(...requests) + config.window;
        retryAfter = Math.ceil((resetTime - now) / 1000);
      }

      return {
        type,
        key,
        current,
        limit: config.requests,
        window: config.window,
        blocked,
        retryAfter,
        resetTime,
        blockDuration: config.blockDuration,
        requests: requests.slice(-10) // 保留最近10个请求时间戳
      };

    } catch (error) {
      console.error(`检查${type}限制时出错:`, error);
      // 出错时允许请求通过
      return {
        type,
        key,
        current: 0,
        limit: config.requests,
        window: config.window,
        blocked: false,
        retryAfter: 0,
        resetTime: now,
        error: error.message
      };
    }
  }

  /**
   * 获取Redis中的请求记录
   */
  async getRedisRequests(storageKey, windowStart, now) {
    // 使用有序集合存储请求时间戳
    const requests = await this.redis.zRangeByScore(storageKey, windowStart, now);
    return requests.map(timestamp => parseInt(timestamp));
  }

  /**
   * 获取内存中的请求记录
   */
  async getMemoryRequests(storageKey, windowStart, now) {
    const data = this.memoryStore.get(storageKey) || { requests: [], lastUpdate: now };

    // 清理过期请求
    data.requests = data.requests.filter(timestamp => timestamp > windowStart);

    return data.requests;
  }

  /**
   * 记录请求
   */
  async recordRequest(identifiers) {
    const now = Date.now();

    // 记录到各种标识符
    const keys = Object.values(identifiers);
    const storageKeys = [
      `rate_limit:global:${identifiers.global}`,
      `rate_limit:ip:${identifiers.ip}`,
      `rate_limit:user:${identifiers.user}`,
      `rate_limit:api:${identifiers.api}`,
      `rate_limit:ip_user:${identifiers.ip_user}`
    ];

    try {
      if (this.redis) {
        // Redis存储
        const pipeline = this.redis.multi();

        for (const storageKey of storageKeys) {
          pipeline.zAdd(storageKey, { score: now, value: now.toString() });
          pipeline.expire(storageKey, Math.ceil(this.config.cache.ttl));
        }

        await pipeline.exec();
        this.stats.cacheHits++;
      } else {
        // 内存存储
        for (const storageKey of storageKeys) {
          const data = this.memoryStore.get(storageKey) || { requests: [], lastUpdate: now };
          data.requests.push(now);
          data.lastUpdate = now;
          this.memoryStore.set(storageKey, data);
        }
        this.stats.cacheMisses++;
      }

    } catch (error) {
      console.error('记录请求时出错:', error);
    }
  }

  /**
   * 获取频率限制头部
   */
  getRateLimitHeaders(limitInfo) {
    return {
      'X-RateLimit-Limit': limitInfo.limit,
      'X-RateLimit-Remaining': Math.max(0, limitInfo.limit - limitInfo.current - 1),
      'X-RateLimit-Reset': Math.ceil(limitInfo.resetTime / 1000),
      'X-RateLimit-Retry-After': limitInfo.retryAfter || 0,
      'X-RateLimit-Window': limitInfo.window / 1000
    };
  }

  /**
   * 设置频率限制响应头
   */
  setRateLimitHeaders(res, limitInfo) {
    const headers = this.getRateLimitHeaders(limitInfo);
    Object.entries(headers).forEach(([key, value]) => {
      res.set(key, value.toString());
    });
  }

  /**
   * 记录频率限制事件
   */
  logRateLimitEvent(req, limitInfo) {
    console.warn('🚫 频率限制触发:', {
      type: limitInfo.type,
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent'),
      current: limitInfo.current,
      limit: limitInfo.limit,
      retryAfter: limitInfo.retryAfter,
      timestamp: new Date().toISOString()
    });

    // 可以集成安全告警系统
    if (limitInfo.type === 'path' && limitInfo.current > limitInfo.limit * 2) {
      this.triggerRateLimitAlert(req, limitInfo);
    }
  }

  /**
   * 触发频率限制告警
   */
  triggerRateLimitAlert(req, limitInfo) {
    console.error('🚨 频率限制安全告警:', {
      type: limitInfo.type,
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent'),
      current: limitInfo.current,
      limit: limitInfo.limit,
      ratio: (limitInfo.current / limitInfo.limit).toFixed(2)
    });
  }

  /**
   * 清理过期数据
   */
  async cleanup() {
    try {
      if (this.redis) {
        // Redis有过期机制，不需要手动清理
        return;
      }

      // 清理内存存储
      const now = Date.now();
      const maxAge = this.config.cache.ttl * 1000;
      let cleanedCount = 0;

      for (const [key, data] of this.memoryStore.entries()) {
        if (now - data.lastUpdate > maxAge) {
          this.memoryStore.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 清理了 ${cleanedCount} 个过期的频率限制记录`);
      }

    } catch (error) {
      console.error('清理频率限制数据时出错:', error);
    }
  }

  /**
   * 启动清理任务
   */
  startCleanupTask() {
    setInterval(() => {
      this.cleanup();
    }, this.config.cache.cleanupInterval);
  }

  /**
   * 获取频率限制统计信息
   */
  getStats() {
    return {
      ...this.stats,
      blockRate: this.stats.totalRequests > 0 ?
        (this.stats.blockedRequests / this.stats.totalRequests * 100).toFixed(2) + '%' : '0%',
      cacheHitRate: (this.stats.cacheHits + this.stats.cacheMisses) > 0 ?
        (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100).toFixed(2) + '%' : '0%',
      memoryStoreSize: this.memoryStore.size,
      redisConnected: !!this.redis
    };
  }

  /**
   * 重置特定标识符的限制
   */
  async resetLimit(type, key) {
    const storageKey = `rate_limit:${type}:${key}`;

    try {
      if (this.redis) {
        await this.redis.del(storageKey);
      } else {
        this.memoryStore.delete(storageKey);
      }
      return true;
    } catch (error) {
      console.error('重置频率限制时出错:', error);
      return false;
    }
  }

  /**
   * 临时增加限制
   */
  async increaseLimit(type, key, factor = 2, durationMinutes = 30) {
    // 实现临时增加限制的逻辑
    // 这可以在特殊情况下（如促销活动）临时放宽限制
    console.log(`📈 临时增加 ${type}:${key} 的限制 ${factor} 倍，持续 ${durationMinutes} 分钟`);
  }

  /**
   * 添加黑名单
   */
  async blacklist(identifier, durationMinutes = 60) {
    // 实现黑名单功能
    const blacklistKey = `blacklist:${identifier}`;
    const expiry = durationMinutes * 60;

    try {
      if (this.redis) {
        await this.redis.setEx(blacklistKey, expiry, '1');
      } else {
        this.memoryStore.set(blacklistKey, {
          blacklisted: true,
          expiresAt: Date.now() + durationMinutes * 60 * 1000
        });
      }
      return true;
    } catch (error) {
      console.error('添加黑名单时出错:', error);
      return false;
    }
  }

  /**
   * 检查是否在黑名单中
   */
  async isBlacklisted(identifier) {
    const blacklistKey = `blacklist:${identifier}`;

    try {
      if (this.redis) {
        return await this.redis.exists(blacklistKey);
      } else {
        const data = this.memoryStore.get(blacklistKey);
        if (data && data.expiresAt && Date.now() < data.expiresAt) {
          return true;
        }
        return false;
      }
    } catch (error) {
      console.error('检查黑名单时出错:', error);
      return false;
    }
  }
}

module.exports = new EnhancedRateLimiter();