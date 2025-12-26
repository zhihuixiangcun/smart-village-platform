/**
 * 缓存管理系统
 * 统一缓存键命名规范和TTL管理
 */

const logger = require('../utils/logger');

/**
 * 缓存键前缀常量
 */
const CACHE_PREFIX = {
  USER: 'user:',
  VILLAGE: 'village:',
  RESIDENT: 'resident:',
  FAMILY: 'family:',
  ANNOUNCEMENT: 'announcement:',
  DOCUMENT: 'document:',
  EMERGENCY: 'emergency:',
  FINANCE: 'finance:',
  POLICY: 'policy:',
  SESSION: 'session:',
  STATS: 'stats:',
  SEARCH: 'search:',
  API: 'api:'
};

/**
 * 缓存TTL配置（秒）
 */
const CACHE_TTL = {
  // 极短缓存 - 30秒
  VERY_SHORT: 30,

  // 短期缓存 - 5分钟
  SHORT: 300,

  // 中等缓存 - 30分钟
  MEDIUM: 1800,

  // 长期缓存 - 2小时
  LONG: 7200,

  // 极长缓存 - 24小时
  VERY_LONG: 86400,

  // 永久缓存 - 7天
  PERMANENT: 604800
};

/**
 * 缓存管理器类
 */
class CacheManager {
  constructor(redisClient) {
    this.redis = redisClient;
    this.memoryCache = new Map();
    this.memoryCacheMaxSize = 1000;
    this.enabled = !!redisClient;
  }

  /**
   * 生成标准化的缓存键
   * @param {string} prefix - 键前缀
   * @param {string} identifier - 标识符
   * @param {Object} params - 额外参数
   * @returns {string} 缓存键
   */
  static buildKey(prefix, identifier, params = {}) {
    const parts = [prefix, identifier];

    // 添加参数
    const sortedParams = Object.keys(params).sort();
    for (const key of sortedParams) {
      const value = params[key];
      if (value !== undefined && value !== null) {
        parts.push(`${key}=${value}`);
      }
    }

    return parts.join(':');
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {number} ttl - 过期时间（秒）
   * @returns {Promise<boolean>} 是否设置成功
   */
  async set(key, value, ttl = CACHE_TTL.MEDIUM) {
    try {
      const serialized = JSON.stringify(value);

      if (this.enabled && this.redis) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        // 内存缓存回退
        this._setMemoryCache(key, value, ttl);
      }

      return true;
    } catch (error) {
      logger.error('缓存设置失败:', { key, error: error.message });
      return false;
    }
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {Promise<*>} 缓存值
   */
  async get(key) {
    try {
      if (this.enabled && this.redis) {
        const value = await this.redis.get(key);
        if (value) {
          return JSON.parse(value);
        }
      } else {
        // 从内存缓存获取
        return this._getMemoryCache(key);
      }

      return null;
    } catch (error) {
      logger.error('缓存获取失败:', { key, error: error.message });
      return null;
    }
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   * @returns {Promise<boolean>} 是否删除成功
   */
  async del(key) {
    try {
      if (this.enabled && this.redis) {
        await this.redis.del(key);
      }

      this._deleteMemoryCache(key);
      return true;
    } catch (error) {
      logger.error('缓存删除失败:', { key, error: error.message });
      return false;
    }
  }

  /**
   * 批量删除缓存
   * @param {string} pattern - 键模式
   * @returns {Promise<number>} 删除数量
   */
  async delPattern(pattern) {
    try {
      let count = 0;

      if (this.enabled && this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          count = await this.redis.del(...keys);
        }
      }

      // 清除匹配的内存缓存
      for (const key of this.memoryCache.keys()) {
        if (this._matchPattern(key, pattern)) {
          this.memoryCache.delete(key);
          count++;
        }
      }

      return count;
    } catch (error) {
      logger.error('批量删除缓存失败:', { pattern, error: error.message });
      return 0;
    }
  }

  /**
   * 原子递增操作
   * @param {string} key - 缓存键
   * @param {number} increment - 递增量
   * @param {number} ttl - 过期时间
   * @returns {Promise<number>} 递增后的值
   */
  async incr(key, increment = 1, ttl = CACHE_TTL.MEDIUM) {
    try {
      let value;

      if (this.enabled && this.redis) {
        value = await this.redis.incrby(key, increment);

        // 如果是首次设置，添加过期时间
        if (value === increment) {
          await this.redis.expire(key, ttl);
        }
      } else {
        const current = this.memoryCache.get(key) || 0;
        value = current + increment;
        this._setMemoryCache(key, value, ttl);
      }

      return value;
    } catch (error) {
      logger.error('缓存递增失败:', { key, error: error.message });
      return 0;
    }
  }

  /**
   * 检查缓存是否存在
   * @param {string} key - 缓存键
   * @returns {Promise<boolean>} 是否存在
   */
  async exists(key) {
    try {
      if (this.enabled && this.redis) {
        return await this.redis.exists(key) === 1;
      }

      return this.memoryCache.has(key);
    } catch (error) {
      logger.error('缓存检查失败:', { key, error: error.message });
      return false;
    }
  }

  /**
   * 设置内存缓存
   * @private
   */
  _setMemoryCache(key, value, ttl) {
    // 如果缓存已满，删除最旧的条目
    if (this.memoryCache.size >= this.memoryCacheMaxSize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }

    const expiry = Date.now() + ttl * 1000;
    this.memoryCache.set(key, { value, expiry });
  }

  /**
   * 获取内存缓存
   * @private
   */
  _getMemoryCache(key) {
    const cached = this.memoryCache.get(key);
    if (cached) {
      // 检查是否过期
      if (cached.expiry > Date.now()) {
        return cached.value;
      }
      // 过期则删除
      this.memoryCache.delete(key);
    }
    return null;
  }

  /**
   * 删除内存缓存
   * @private
   */
  _deleteMemoryCache(key) {
    this.memoryCache.delete(key);
  }

  /**
   * 匹配键模式
   * @private
   */
  _matchPattern(key, pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(key);
  }

  /**
   * 清空所有缓存
   * @returns {Promise<boolean>}
   */
  async flush() {
    try {
      if (this.enabled && this.redis) {
        await this.redis.flushdb();
      }

      this.memoryCache.clear();
      return true;
    } catch (error) {
      logger.error('清空缓存失败:', { error: error.message });
      return false;
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {Promise<Object>}
   */
  async getStats() {
    try {
      let info = {};

      if (this.enabled && this.redis) {
        info = await this.redis.info('stats');
      }

      return {
        ...info,
        memoryCacheSize: this.memoryCache.size,
        memoryCacheMaxSize: this.memoryCacheMaxSize
      };
    } catch (error) {
      logger.error('获取缓存统计失败:', { error: error.message });
      return {};
    }
  }
}

/**
 * 缓存装饰器工厂
 * 用于自动缓存方法结果
 */
function cacheable(prefix, ttl = CACHE_TTL.MEDIUM) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      // 生成缓存键
      const key = CacheManager.buildKey(
        prefix,
        propertyKey,
        { args: JSON.stringify(args) }
      );

      // 尝试从缓存获取
      const cacheManager = this.cacheManager || global.cacheManager;
      if (cacheManager) {
        const cached = await cacheManager.get(key);
        if (cached !== null) {
          logger.debug('缓存命中:', { key });
          return cached;
        }
      }

      // 执行原方法
      const result = await originalMethod.apply(this, args);

      // 存入缓存
      if (cacheManager) {
        await cacheManager.set(key, result, ttl);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * 缓存失效装饰器
 * 用于在数据更新时自动失效相关缓存
 */
function cacheInvalidate(pattern) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      // 先执行原方法
      const result = await originalMethod.apply(this, args);

      // 失效相关缓存
      const cacheManager = this.cacheManager || global.cacheManager;
      if (cacheManager) {
        await cacheManager.delPattern(pattern);
        logger.info('缓存已失效:', { pattern });
      }

      return result;
    };

    return descriptor;
  };
}

module.exports = {
  CACHE_PREFIX,
  CACHE_TTL,
  CacheManager,
  cacheable,
  cacheInvalidate
};
