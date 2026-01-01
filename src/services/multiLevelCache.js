/**
 * 多级缓存系统
 * L1: 内存缓存 (最快)
 * L2: Redis缓存 (快速分布式)
 * L3: 数据库查询结果缓存 (持久化)
 */

const Redis = require('ioredis');
const LRU = require('lru-cache');

class MultiLevelCache {
  constructor(options = {}) {
    // L1 内存缓存配置
    this.l1Options = {
      max: options.l1Max || 1000, // 最大缓存项数
      maxSize: options.l1MaxSize || 100 * 1024 * 1024, // 最大内存100MB
      ttl: options.l1TTL || 1000 * 60 * 5, // 5分钟
      allowStale: true,
      updateAgeOnGet: true,
      sizeCalculation: (value, key) => {
        return JSON.stringify(value).length + key.length;
      }
    };

    // L2 Redis配置
    this.l2Options = {
      host: options.redisHost || 'localhost',
      port: options.redisPort || 6379,
      password: options.redisPassword,
      db: options.redisDb || 0,
      keyPrefix: options.redisPrefix || 'village:',
      ttl: options.l2TTL || 1000 * 60 * 30, // 30分钟
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    };

    // L3 持久化缓存配置
    this.l3Options = {
      ttl: options.l3TTL || 1000 * 60 * 60 * 24, // 24小时
      compressionEnabled: true,
      encryptionEnabled: options.encryptionEnabled || false
    };

    // 初始化各级缓存
    this._initializeCache();

    // 缓存统计
    this.stats = {
      l1: { hits: 0, misses: 0, sets: 0, evictions: 0 },
      l2: { hits: 0, misses: 0, sets: 0, errors: 0 },
      l3: { hits: 0, misses: 0, sets: 0 },
      total: { requests: 0, totalTime: 0 }
    };

    // 缓存策略配置
    this.strategies = {
      user_profile: { l1: true, l2: true, l3: true, priority: 'high' },
      product_list: { l1: true, l2: true, l3: false, priority: 'medium' },
      village_data: { l1: false, l2: true, l3: true, priority: 'high' },
      system_config: { l1: true, l2: true, l3: true, priority: 'high' },
      search_result: { l1: true, l2: true, l3: false, priority: 'low' },
      analytics_data: { l1: false, l2: true, l3: true, priority: 'medium' }
    };
  }

  /**
   * 初始化缓存
   */
  async _initializeCache() {
    // L1 内存缓存
    this.l1Cache = new LRU(this.l1Options);

    // L2 Redis缓存
    try {
      this.l2Cache = new Redis(this.l2Options);
      this.l2Cache.on('connect', () => {
        logger.debug('Redis连接成功');
      });
      this.l2Cache.on('error', (error) => {
        logger.error('Redis连接错误:', error);
        this.stats.l2.errors++;
      });
    } catch (error) {
      logger.error('Redis初始化失败:', error);
      this.l2Cache = null;
    }

    // 预热关键缓存
    await this._warmupCriticalCache();
  }

  /**
   * 预热关键缓存
   */
  async _warmupCriticalCache() {
    try {
      // 预加载系统配置
      const systemConfig = await this._getFromL3('system_config:global');
      if (systemConfig) {
        await this.set('system_config', 'global', systemConfig);
      }

      // 预加载热门用户资料
      const activeUsers = await this._getActiveUsers();
      for (const userId of activeUsers) {
        const userProfile = await this._getFromL3(`user_profile:${userId}`);
        if (userProfile) {
          await this.set('user_profile', userId, userProfile);
        }
      }
    } catch (error) {
      logger.error('缓存预热失败:', error);
    }
  }

  /**
   * 获取活跃用户列表
   */
  async _getActiveUsers() {
    // 这里可以从数据库获取活跃用户，或者从日志中分析
    return ['admin001', 'villager001', 'villager002'];
  }

  /**
   * 获取缓存值
   */
  async get(type, key, options = {}) {
    const startTime = Date.now();
    this.stats.total.requests++;

    try {
      // 检查缓存策略
      const strategy = this.strategies[type];
      if (!strategy) {
        return null;
      }

      const cacheKey = `${type}:${key}`;
      let result = null;
      let cacheHit = false;

      // L1 缓存查找
      if (strategy.l1) {
        result = this._getFromL1(cacheKey);
        if (result !== null) {
          this.stats.l1.hits++;
          cacheHit = 'L1';
        } else {
          this.stats.l1.misses++;
        }
      }

      // L2 缓存查找
      if (!result && strategy.l2 && this.l2Cache) {
        result = await this._getFromL2(cacheKey);
        if (result !== null) {
          this.stats.l2.hits++;
          cacheHit = 'L2';
          // 回填到L1
          if (strategy.l1) {
            this._setToL1(cacheKey, result, strategy.priority);
          }
        } else {
          this.stats.l2.misses++;
        }
      }

      // L3 缓存查找
      if (!result && strategy.l3) {
        result = await this._getFromL3(cacheKey);
        if (result !== null) {
          this.stats.l3.hits++;
          cacheHit = 'L3';
          // 回填到L1和L2
          if (strategy.l1) {
            this._setToL1(cacheKey, result, strategy.priority);
          }
          if (strategy.l2 && this.l2Cache) {
            await this._setToL2(cacheKey, result);
          }
        } else {
          this.stats.l3.misses++;
        }
      }

      // 记录统计信息
      const executionTime = Date.now() - startTime;
      this.stats.total.totalTime += executionTime;

      if (result !== null && options.onHit) {
        options.onHit(result, cacheHit);
      }

      if (result === null && options.onMiss) {
        options.onMiss(cacheKey);
      }

      return result;
    } catch (error) {
      logger.error(`缓存获取失败 [${type}:${key}]:`, error);
      return null;
    }
  }

  /**
   * 设置缓存值
   */
  async set(type, key, value, options = {}) {
    try {
      const strategy = this.strategies[type];
      if (!strategy) {
        return false;
      }

      const cacheKey = `${type}:${key}`;
      const ttl = options.ttl || this._getTTLForType(type);

      // 设置L1缓存
      if (strategy.l1) {
        this._setToL1(cacheKey, value, strategy.priority, ttl);
      }

      // 设置L2缓存
      if (strategy.l2 && this.l2Cache) {
        await this._setToL2(cacheKey, value, ttl);
      }

      // 设置L3缓存
      if (strategy.l3) {
        await this._setToL3(cacheKey, value, ttl);
      }

      return true;
    } catch (error) {
      logger.error(`缓存设置失败 [${type}:${key}]:`, error);
      return false;
    }
  }

  /**
   * 删除缓存
   */
  async delete(type, key) {
    try {
      const cacheKey = `${type}:${key}`;

      // 删除各级缓存
      this.l1Cache.delete(cacheKey);

      if (this.l2Cache) {
        await this.l2Cache.del(cacheKey);
      }

      await this._deleteFromL3(cacheKey);

      return true;
    } catch (error) {
      logger.error(`缓存删除失败 [${type}:${key}]:`, error);
      return false;
    }
  }

  /**
   * 批量删除
   */
  async deletePattern(pattern) {
    try {
      // 删除L1缓存
      for (const key of this.l1Cache.keys()) {
        if (key.includes(pattern)) {
          this.l1Cache.delete(key);
        }
      }

      // 删除L2缓存
      if (this.l2Cache) {
        const keys = await this.l2Cache.keys(`*${pattern}*`);
        if (keys.length > 0) {
          await this.l2Cache.del(...keys);
        }
      }

      // 删除L3缓存
      await this._deleteFromL3Pattern(pattern);

      return true;
    } catch (error) {
      logger.error(`批量删除缓存失败 [${pattern}]:`, error);
      return false;
    }
  }

  /**
   * 清空所有缓存
   */
  async clear() {
    try {
      // 清空L1缓存
      this.l1Cache.clear();

      // 清空L2缓存
      if (this.l2Cache) {
        await this.l2Cache.flushdb();
      }

      // 清空L3缓存
      await this._clearL3();

      // 重置统计
      this._resetStats();

      return true;
    } catch (error) {
      logger.error('清空缓存失败:', error);
      return false;
    }
  }

  /**
   * L1 缓存操作
   */
  _getFromL1(key) {
    return this.l1Cache.get(key);
  }

  _setToL1(key, value, priority = 'normal', ttl = null) {
    const options = { priority };
    if (ttl) {
      options.ttl = ttl;
    }

    this.l1Cache.set(key, value, options);
    this.stats.l1.sets++;
  }

  /**
   * L2 缓存操作
   */
  async _getFromL2(key) {
    if (!this.l2Cache) return null;

    try {
      const value = await this.l2Cache.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.stats.l2.errors++;
      return null;
    }
  }

  async _setToL2(key, value, ttl = null) {
    if (!this.l2Cache) return false;

    try {
      const serializedValue = JSON.stringify(value);
      const options = ttl ? { EX: Math.floor(ttl / 1000) } : {};
      await this.l2Cache.set(key, serializedValue, options);
      this.stats.l2.sets++;
      return true;
    } catch (error) {
      this.stats.l2.errors++;
      return false;
    }
  }

  /**
   * L3 缓存操作 (持久化到数据库)
   */
  async _getFromL3(key) {
    try {
      const mongoose = require('mongoose');
      const CacheEntry = mongoose.model('CacheEntry') || mongoose.model('CacheEntry', new mongoose.Schema({
        key: { type: String, unique: true },
        value: mongoose.Schema.Types.Mixed,
        expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
        compressed: Boolean
      }));

      const entry = await CacheEntry.findOne({ key }).lean();
      if (!entry) return null;

      // 检查是否过期
      if (entry.expiresAt && entry.expiresAt < new Date()) {
        await CacheEntry.deleteOne({ key });
        return null;
      }

      // 解压缩
      let value = entry.value;
      if (entry.compressed) {
        value = this._decompress(value);
      }

      return value;
    } catch (error) {
      logger.error('L3缓存获取失败:', error);
      return null;
    }
  }

  async _setToL3(key, value, ttl = null) {
    try {
      const mongoose = require('mongoose');
      const CacheEntry = mongoose.model('CacheEntry') || mongoose.model('CacheEntry', new mongoose.Schema({
        key: { type: String, unique: true },
        value: mongoose.Schema.Types.Mixed,
        expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
        compressed: Boolean
      }));

      const expiresAt = ttl ? new Date(Date.now() + ttl) : new Date(Date.now() + this.l3Options.ttl);

      // 压缩大数据
      let compressed = false;
      let processedValue = value;
      if (this.l3Options.compressionEnabled && JSON.stringify(value).length > 1024) {
        processedValue = this._compress(value);
        compressed = true;
      }

      await CacheEntry.replaceOne(
        { key },
        {
          key,
          value: processedValue,
          expiresAt,
          compressed
        },
        { upsert: true }
      );

      this.stats.l3.sets++;
      return true;
    } catch (error) {
      logger.error('L3缓存设置失败:', error);
      return false;
    }
  }

  async _deleteFromL3(key) {
    try {
      const mongoose = require('mongoose');
      const CacheEntry = mongoose.model('CacheEntry') || mongoose.model('CacheEntry', new mongoose.Schema({
        key: { type: String, unique: true },
        value: mongoose.Schema.Types.Mixed,
        expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }
      }));

      await CacheEntry.deleteOne({ key });
      return true;
    } catch (error) {
      logger.error('L3缓存删除失败:', error);
      return false;
    }
  }

  async _deleteFromL3Pattern(pattern) {
    try {
      const mongoose = require('mongoose');
      const CacheEntry = mongoose.model('CacheEntry') || mongoose.model('CacheEntry', new mongoose.Schema({
        key: { type: String, unique: true },
        value: mongoose.Schema.Types.Mixed,
        expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }
      }));

      await CacheEntry.deleteMany({ key: { $regex: pattern } });
      return true;
    } catch (error) {
      logger.error('L3批量删除失败:', error);
      return false;
    }
  }

  async _clearL3() {
    try {
      const mongoose = require('mongoose');
      const CacheEntry = mongoose.model('CacheEntry') || mongoose.model('CacheEntry', new mongoose.Schema({
        key: { type: String, unique: true },
        value: mongoose.Schema.Types.Mixed,
        expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }
      }));

      await CacheEntry.deleteMany({});
      return true;
    } catch (error) {
      logger.error('清空L3缓存失败:', error);
      return false;
    }
  }

  /**
   * 压缩和解压缩
   */
  _compress(value) {
    // 简单的压缩实现，实际可以使用zlib
    return Buffer.from(JSON.stringify(value)).toString('base64');
  }

  _decompress(compressedValue) {
    return JSON.parse(Buffer.from(compressedValue, 'base64').toString());
  }

  /**
   * 获取类型的TTL
   */
  _getTTLForType(type) {
    const ttlMap = {
      'user_profile': this.l1Options.ttl,
      'product_list': this.l1Options.ttl * 2,
      'village_data': this.l2Options.ttl,
      'system_config': this.l2Options.ttl * 2,
      'search_result': this.l1Options.ttl / 2,
      'analytics_data': this.l3Options.ttl
    };

    return ttlMap[type] || this.l1Options.ttl;
  }

  /**
   * 重置统计信息
   */
  _resetStats() {
    this.stats = {
      l1: { hits: 0, misses: 0, sets: 0, evictions: 0 },
      l2: { hits: 0, misses: 0, sets: 0, errors: 0 },
      l3: { hits: 0, misses: 0, sets: 0 },
      total: { requests: 0, totalTime: 0 }
    };
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const stats = {
      ...this.stats,
      l1: {
        ...this.stats.l1,
        size: this.l1Cache.size,
        itemCount: this.l1Cache.itemCount,
        hitRate: this.stats.l1.hits / (this.stats.l1.hits + this.stats.l1.misses) * 100 || 0
      },
      l2: {
        ...this.stats.l2,
        hitRate: this.stats.l2.hits / (this.stats.l2.hits + this.stats.l2.misses) * 100 || 0,
        connected: this.l2Cache ? this.l2Cache.status === 'ready' : false
      },
      l3: {
        ...this.stats.l3,
        hitRate: this.stats.l3.hits / (this.stats.l3.hits + this.stats.l3.misses) * 100 || 0
      },
      overall: {
        totalRequests: this.stats.total.requests,
        averageResponseTime: this.stats.total.requests > 0 ? this.stats.total.totalTime / this.stats.total.requests : 0,
        overallHitRate: (this.stats.l1.hits + this.stats.l2.hits + this.stats.l3.hits) / this.stats.total.requests * 100 || 0
      }
    };

    return stats;
  }

  /**
   * 缓存健康检查
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      components: {},
      issues: []
    };

    // 检查L1缓存
    const l1Size = this.l1Cache.size;
    const l1ItemCount = this.l1Cache.itemCount;
    health.components.l1 = {
      status: 'healthy',
      size: l1Size,
      itemCount: l1ItemCount
    };

    // 检查L2缓存
    if (this.l2Cache) {
      try {
        await this.l2Cache.ping();
        health.components.l2 = {
          status: 'healthy',
          connected: true
        };
      } catch (error) {
        health.components.l2 = {
          status: 'unhealthy',
          connected: false,
          error: error.message
        };
        health.issues.push('Redis连接失败');
        health.status = 'degraded';
      }
    } else {
      health.components.l2 = {
        status: 'disabled'
      };
    }

    // 检查L3缓存
    try {
      const mongoose = require('mongoose');
      const logger = require('../utils/logger');
      if (mongoose.connection.readyState === 1) {
        health.components.l3 = {
          status: 'healthy',
          connected: true
        };
      } else {
        health.components.l3 = {
          status: 'unhealthy',
          connected: false
        };
        health.issues.push('数据库连接失败');
        health.status = 'degraded';
      }
    } catch (error) {
      health.components.l3 = {
        status: 'error',
        error: error.message
      };
      health.issues.push('L3缓存检查失败');
      health.status = 'degraded';
    }

    // 检查内存使用
    const memoryUsage = process.memoryUsage();
    const cacheMemoryUsage = (l1Size / (1024 * 1024)).toFixed(2); // MB

    health.memory = {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      cacheMemory: cacheMemoryUsage
    };

    if (parseFloat(cacheMemoryUsage) > this.l1Options.maxSize / (1024 * 1024) * 0.9) {
      health.issues.push('内存使用率过高');
      health.status = 'warning';
    }

    return health;
  }

  /**
   * 优雅关闭
   */
  async shutdown() {
    try {
      if (this.l2Cache) {
        await this.l2Cache.quit();
      }
      logger.debug('缓存系统已优雅关闭');
    } catch (error) {
      logger.error('缓存系统关闭失败:', error);
    }
  }
}

// 单例模式
const multiLevelCache = new MultiLevelCache();

module.exports = multiLevelCache;