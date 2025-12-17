/**
 * API性能优化和错误处理中间件
 * 生产环境专用
 */

const redis = require('redis');
const winston = require('winston');
const { promisify } = require('util');
const crypto = require('crypto');

// 配置
const config = {
  // 缓存配置
  cache: {
    enabled: process.env.CACHE_ENABLED !== 'false',
    defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL) || 300, // 5分钟
    maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 1000,
    keyPrefix: process.env.CACHE_KEY_PREFIX || 'api:cache:',
  },
  // 压缩配置
  compression: {
    enabled: process.env.COMPRESSION_ENABLED !== 'false',
    threshold: parseInt(process.env.COMPRESSION_THRESHOLD) || 1024, // 1KB
    level: parseInt(process.env.COMPRESSION_LEVEL) || 6,
  },
  // 限流配置
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15分钟
    max: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  // 重试配置
  retry: {
    enabled: process.env.RETRY_ENABLED !== 'false',
    maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS) || 3,
    initialDelay: parseInt(process.env.RETRY_INITIAL_DELAY) || 1000,
    maxDelay: parseInt(process.env.RETRY_MAX_DELAY) || 10000,
    backoffMultiplier: parseInt(process.env.RETRY_BACKOFF_MULTIPLIER) || 2,
  },
};

// 日志配置
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/api-optimization.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Redis客户端
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      logger.error('Redis连接被拒绝，禁用缓存功能');
      return null; // 禁用重试
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Redis重试超时');
    }
    if (options.attempt > 5) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  }
});

redisClient.on('error', (err) => {
  logger.error('Redis缓存服务错误:', err);
});

// 缓存管理类
class CacheManager {
  constructor() {
    this.enabled = config.cache.enabled;
    this.defaultTTL = config.cache.defaultTTL;
    this.keyPrefix = config.cache.keyPrefix;
  }

  async initialize() {
    try {
      if (this.enabled) {
        await redisClient.connect();
        logger.info('✅ 缓存服务启动成功');
      } else {
        logger.warn('⚠️ 缓存功能已禁用');
      }
    } catch (error) {
      logger.error('❌ 缓存服务启动失败:', error);
      this.enabled = false;
    }
  }

  generateKey(req) {
    const keyData = {
      method: req.method,
      url: req.originalUrl || req.url,
      query: req.query,
      user: req.user?.id || 'anonymous',
      role: req.user?.role || 'guest'
    };

    const keyString = JSON.stringify(keyData);
    const hash = crypto.createHash('md5').update(keyString).digest('hex');
    return this.keyPrefix + hash;
  }

  async get(key) {
    if (!this.enabled || !redisClient.isOpen) return null;

    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('缓存读取失败:', error);
      return null;
    }
  }

  async set(key, data, ttl = this.defaultTTL) {
    if (!this.enabled || !redisClient.isOpen) return false;

    try {
      const serialized = JSON.stringify(data);
      await redisClient.setEx(key, ttl, serialized);
      return true;
    } catch (error) {
      logger.error('缓存写入失败:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.enabled || !redisClient.isOpen) return false;

    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error('缓存删除失败:', error);
      return false;
    }
  }

  async clear(pattern = `${this.keyPrefix  }*`) {
    if (!this.enabled || !redisClient.isOpen) return false;

    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.info(`清除缓存: ${keys.length} 个项目`);
      }
      return true;
    } catch (error) {
      logger.error('缓存清除失败:', error);
      return false;
    }
  }
}

// 性能监控类
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      totalTime: 0,
      slowRequests: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  recordRequest(duration, isError = false, isSlow = false, cacheHit = false) {
    this.metrics.requests++;
    this.metrics.totalTime += duration;

    if (isError) this.metrics.errors++;
    if (isSlow) this.metrics.slowRequests++;
    if (cacheHit) this.metrics.cacheHits++;
    else this.metrics.cacheMisses++;

    // 记录到Redis
    this.recordMetricsToRedis();
  }

  async recordMetricsToRedis() {
    try {
      const key = 'api:metrics:current';
      await redisClient.hSet(key, this.metrics);
      await redisClient.expire(key, 3600); // 1小时过期
    } catch (error) {
      logger.error('性能指标记录失败:', error);
    }
  }

  getStats() {
    const avgTime = this.metrics.requests > 0 ? this.metrics.totalTime / this.metrics.requests : 0;
    const errorRate = this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests) * 100 : 0;
    const slowRate = this.metrics.requests > 0 ? (this.metrics.slowRequests / this.metrics.requests) * 100 : 0;
    const cacheHitRate = (this.metrics.cacheHits + this.metrics.cacheMisses) > 0 ?
      (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 : 0;

    return {
      ...this.metrics,
      avgTime: Math.round(avgTime * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      slowRate: Math.round(slowRate * 100) / 100,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100
    };
  }
}

// 重试管理器
class RetryManager {
  constructor() {
    this.enabled = config.retry.enabled;
    this.maxAttempts = config.retry.maxAttempts;
    this.initialDelay = config.retry.initialDelay;
    this.maxDelay = config.retry.maxDelay;
    this.backoffMultiplier = config.retry.backoffMultiplier;
  }

  async execute(fn, context = {}) {
    if (!this.enabled) {
      return await fn();
    }

    let lastError;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // 不重试的错误类型
        if (this.shouldNotRetry(error)) {
          throw error;
        }

        // 最后一次尝试，直接抛出错误
        if (attempt === this.maxAttempts) {
          logger.error(`重试失败，已达到最大尝试次数: ${this.maxAttempts}`, {
            error: error.message,
            attempts: attempt,
            context
          });
          throw error;
        }

        // 计算延迟时间
        const delay = Math.min(
          this.initialDelay * Math.pow(this.backoffMultiplier, attempt - 1),
          this.maxDelay
        );

        logger.warn(`第${attempt}次尝试失败，${delay}ms后重试: ${error.message}`);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  shouldNotRetry(error) {
    // 认证错误、权限错误等不重试
    const nonRetryableErrors = [
      'UNAUTHORIZED',
      'FORBIDDEN',
      'NOT_FOUND',
      'VALIDATION_ERROR',
      'RATE_LIMIT_EXCEEDED'
    ];

    return nonRetryableErrors.includes(error.code) ||
           error.statusCode >= 400 && error.statusCode < 500;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 创建实例
const cacheManager = new CacheManager();
const performanceMonitor = new PerformanceMonitor();
const retryManager = new RetryManager();

// 中间件工厂函数
function createApiOptimizationMiddleware(options = {}) {
  const {
    enableCache = true,
    enableCompression = true,
    enableRateLimit = true,
    enableRetry = true,
    customCacheKey = null,
    cacheTTL = config.cache.defaultTTL,
    slowRequestThreshold = 1000 // 1秒
  } = options;

  return {
    // 缓存中间件
    cache: (req, res, next) => {
      if (!enableCache || req.method !== 'GET') {
        return next();
      }

      const key = customCacheKey ? customCacheKey(req) : cacheManager.generateKey(req);

      // 检查缓存
      cacheManager.get(key).then(cached => {
        if (cached) {
          performanceMonitor.recordRequest(0, false, false, true);

          // 设置缓存头
          res.set({
            'X-Cache': 'HIT',
            'X-Cache-TTL': cached.ttl || cacheTTL
          });

          return res.json(cached.data);
        }

        // 拦截res.json来缓存响应
        const originalJson = res.json;
        res.json = function(data) {
          // 只缓存成功响应
          if (res.statusCode >= 200 && res.statusCode < 300) {
            cacheManager.set(key, { data, ttl: cacheTTL }, cacheTTL);
          }

          res.set('X-Cache', 'MISS');
          return originalJson.call(this, data);
        };

        next();
      }).catch(next);
    },

    // 响应时间监控中间件
    performance: (req, res, next) => {
      const startTime = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const isError = res.statusCode >= 400;
        const isSlow = duration > slowRequestThreshold;

        performanceMonitor.recordRequest(duration, isError, isSlow, false);

        // 记录慢请求
        if (isSlow) {
          logger.warn('慢请求检测', {
            method: req.method,
            url: req.originalUrl,
            duration: `${duration}ms`,
            statusCode: res.statusCode,
            userAgent: req.get('User-Agent'),
            ip: req.ip
          });
        }

        // 设置性能头
        res.set({
          'X-Response-Time': `${duration}ms`,
          'X-Request-ID': req.id || crypto.randomUUID()
        });
      });

      next();
    },

    // 错误处理中间件
    errorHandler: (err, req, res, next) => {
      const correlationId = req.id || crypto.randomUUID();

      logger.error('API错误', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        correlationId,
        user: req.user?.id
      });

      // 标准化错误响应
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = '服务器内部错误';

      if (err.isJoi) {
        // 验证错误
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
        message = '请求参数验证失败';
      } else if (err.name === 'UnauthorizedError') {
        // 认证错误
        statusCode = 401;
        errorCode = 'UNAUTHORIZED';
        message = '未授权访问';
      } else if (err.code === 'FORBIDDEN') {
        // 权限错误
        statusCode = 403;
        errorCode = 'FORBIDDEN';
        message = '权限不足';
      } else if (err.code === 'NOT_FOUND') {
        // 资源不存在
        statusCode = 404;
        errorCode = 'NOT_FOUND';
        message = '资源不存在';
      } else if (err.code === 'RATE_LIMIT_EXCEEDED') {
        // 限流错误
        statusCode = 429;
        errorCode = 'RATE_LIMIT_EXCEEDED';
        message = '请求过于频繁';
      }

      // 开发环境返回详细错误
      const errorData = {
        success: false,
        error: {
          code: errorCode,
          message,
          correlationId,
          timestamp: new Date().toISOString()
        }
      };

      if (process.env.NODE_ENV === 'development') {
        errorData.error.details = err.message;
        errorData.error.stack = err.stack;
      }

      res.status(statusCode).json(errorData);
    },

    // 健康检查增强
    healthCheck: async (req, res) => {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {},
        performance: performanceMonitor.getStats()
      };

      try {
        // 检查Redis
        if (redisClient.isOpen) {
          await redisClient.ping();
          health.services.redis = 'connected';
        } else {
          health.services.redis = 'disconnected';
          health.status = 'degraded';
        }
      } catch (error) {
        health.services.redis = 'error';
        health.status = 'degraded';
      }

      try {
        // 检查数据库
        if (require('mongoose').connection.readyState === 1) {
          health.services.database = 'connected';
        } else {
          health.services.database = 'disconnected';
          health.status = 'degraded';
        }
      } catch (error) {
        health.services.database = 'error';
        health.status = 'unhealthy';
      }

      const statusCode = health.status === 'healthy' ? 200 :
        health.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json(health);
    },

    // 缓存清理API
    clearCache: async (req, res) => {
      try {
        const pattern = req.query.pattern || '*';
        const success = await cacheManager.clear(pattern);

        res.json({
          success,
          message: success ? '缓存清理成功' : '缓存清理失败',
          pattern
        });
      } catch (error) {
        logger.error('缓存清理失败:', error);
        res.status(500).json({
          success: false,
          error: '缓存清理失败'
        });
      }
    },

    // 性能统计API
    getPerformanceStats: (req, res) => {
      try {
        const stats = performanceMonitor.getStats();
        res.json({
          success: true,
          data: stats
        });
      } catch (error) {
        logger.error('获取性能统计失败:', error);
        res.status(500).json({
          success: false,
          error: '获取性能统计失败'
        });
      }
    },

    // 重试装饰器
    retry: (target, propertyName, descriptor) => {
      if (!enableRetry) return descriptor;

      const originalMethod = descriptor.value;

      descriptor.value = async function(...args) {
        const context = {
          target: target.constructor.name,
          method: propertyName,
          args: args.length
        };

        return retryManager.execute(() => originalMethod.apply(this, args), context);
      };

      return descriptor;
    }
  };
}

// 初始化
async function initialize() {
  try {
    await cacheManager.initialize();
    logger.info('✅ API优化中间件初始化完成');
  } catch (error) {
    logger.error('❌ API优化中间件初始化失败:', error);
    throw error;
  }
}

module.exports = {
  createApiOptimizationMiddleware,
  CacheManager,
  PerformanceMonitor,
  RetryManager,
  initialize,
  config,
  cacheManager,
  performanceMonitor,
  retryManager
};