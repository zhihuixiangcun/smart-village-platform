/**
 * 高性能缓存服务
 * 支持多级缓存、智能失效、响应时间<200ms
 */

const NodeCache = require('node-cache');
const Redis = require('ioredis');
const LRU = require('lru-cache');
const crypto = require('crypto');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    // L1缓存 - 内存缓存（最热数据）
    this.l1Cache = new LRU({
      max: 1000, // 最大缓存项数
      ttl: 1000 * 60 * 5, // 5分钟TTL
      updateAgeOnGet: true,
      allowStale: false
    });

    // L2缓存 - Node.js进程缓存（热数据）
    this.l2Cache = new NodeCache({
      stdTTL: 1000 * 60 * 15, // 15分钟TTL
      checkperiod: 60, // 每分钟检查过期
      useClones: false,
      deleteOnExpire: true,
      enableLegacyCallbacks: false,
      maxKeys: 5000
    });

    // L3缓存 - Redis缓存（温数据）
    this.l3Cache = null;
    this.redisConnected = false;

    // 缓存统计
    this.stats = {
      hits: { l1: 0, l2: 0, l3: 0, total: 0 },
      misses: { l1: 0, l2: 0, l3: 0, total: 0 },
      sets: { l1: 0, l2: 0, l3: 0, total: 0 },
      deletes: { l1: 0, l2: 0, l3: 0, total: 0 },
      evictions: { l1: 0, l2: 0, l3: 0, total: 0 },
      errors: { l1: 0, l2: 0, l3: 0, total: 0 }
    };

    // 配置
    this.config = {
      l1TTL: 1000 * 60 * 5, // 5分钟
      l2TTL: 1000 * 60 * 15, // 15分钟
      l3TTL: 1000 * 60 * 60, // 1小时
      maxSize: 10 * 1024 * 1024, // 10MB
      compressionThreshold: 1024, // 1KB以上压缩
      enableCompression: true,
      enableMetrics: true,
      enableDebug: false
    };

    this.initializeRedis();
    this.setupEventHandlers();
  }

  /**
   * 初始化Redis连接
   */
  async initializeRedis() {
    try {
      this.l3Cache = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0,
        keyPrefix: 'smartvillage:cache:',
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4,
        connectTimeout: 10000,
        commandTimeout: 5000
      });

      this.l3Cache.on('connect', () => {
        this.redisConnected = true;
        logger.debug('Redis缓存连接成功');
      });

      this.l3Cache.on('error', (error) => {
        this.redisConnected = false;
        logger.error('Redis缓存连接错误:', error);
        this.stats.errors.l3++;
        this.stats.errors.total++;
      });

      this.l3Cache.on('close', () => {
        this.redisConnected = false;
        logger.debug('Redis缓存连接关闭');
      });

      await this.l3Cache.connect();

    } catch (error) {
      logger.error('初始化Redis缓存失败:', error);
      this.redisConnected = false;
    }
  }

  /**
   * 设置事件处理器
   */
  setupEventHandlers() {
    // L2缓存事件
    this.l2Cache.on('set', (key, value) => {
      this.stats.sets.l2++;
      this.stats.sets.total++;
    });

    this.l2Cache.on('del', (key, value) => {
      this.stats.deletes.l2++;
      this.stats.deletes.total++;
    });

    this.l2Cache.on('expired', (key, value) => {
      if (this.config.enableDebug) {
        logger.debug(`L2缓存过期: ${key}`);
      }
    });

    this.l2Cache.on('evicted', (key, value) => {
      this.stats.evictions.l2++;
      this.stats.evictions.total++;
      if (this.config.enableDebug) {
        logger.debug(`L2缓存驱逐: ${key}`);
      }
    });

    // 进程退出时清理
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

  /**
   * 生成缓存键
   */
  generateKey(namespace, keyParts = []) {
    const keyString = Array.isArray(keyParts) ? keyParts.join(':') : keyParts;
    const hash = crypto.createHash('md5').update(keyString).digest('hex');
    return `${namespace}:${hash}`;
  }

  /**
   * 获取缓存
   */
  async get(key, options = {}) {
    const startTime = process.hrtime.bigint();

    try {
      // L1缓存查找
      let value = this.l1Cache.get(key);
      if (value !== undefined) {
        this.stats.hits.l1++;
        this.stats.hits.total++;
        this.recordResponseTime(startTime);
        return value;
      }
      this.stats.misses.l1++;

      // L2缓存查找
      value = this.l2Cache.get(key);
      if (value !== undefined) {
        this.stats.hits.l2++;
        this.stats.hits.total++;
        // 提升到L1缓存
        this.l1Cache.set(key, value, options.l1TTL || this.config.l1TTL);
        this.recordResponseTime(startTime);
        return value;
      }
      this.stats.misses.l2++;

      // L3缓存查找
      if (this.redisConnected && options.useRedis !== false) {
        try {
          const redisValue = await this.l3Cache.get(key);
          if (redisValue !== null) {
            value = this.deserialize(redisValue);
            this.stats.hits.l3++;
            this.stats.hits.total++;
            // 提升到L2和L1缓存
            this.l2Cache.set(key, value, options.l2TTL || this.config.l2TTL);
            this.l1Cache.set(key, value, options.l1TTL || this.config.l1TTL);
            this.recordResponseTime(startTime);
            return value;
          }
        } catch (error) {
          this.stats.errors.l3++;
          this.stats.errors.total++;
          logger.error('Redis获取缓存失败:', error);
        }
      }
      this.stats.misses.l3++;
      this.stats.misses.total++;

      this.recordResponseTime(startTime);
      return null;

    } catch (error) {
      this.stats.errors.l1++;
      this.stats.errors.total++;
      logger.error('获取缓存失败:', error);
      this.recordResponseTime(startTime);
      return null;
    }
  }

  /**
   * 设置缓存
   */
  async set(key, value, options = {}) {
    const startTime = process.hrtime.bigint();

    try {
      // 检查数据大小
      const serialized = this.serialize(value);
      const size = Buffer.byteLength(serialized, 'utf8');

      if (size > this.config.maxSize) {
        console.warn(`数据过大，跳过缓存: ${key} (${size} bytes)`);
        return false;
      }

      const l1TTL = options.l1TTL || this.config.l1TTL;
      const l2TTL = options.l2TTL || this.config.l2TTL;
      const l3TTL = options.l3TTL || this.config.l3TTL;

      // 设置到L1缓存
      this.l1Cache.set(key, value, l1TTL);
      this.stats.sets.l1++;

      // 设置到L2缓存
      this.l2Cache.set(key, value, l2TTL);
      this.stats.sets.l2++;

      // 设置到L3缓存
      if (this.redisConnected && options.useRedis !== false) {
        try {
          await this.l3Cache.setex(key, Math.floor(l3TTL / 1000), serialized);
          this.stats.sets.l3++;
        } catch (error) {
          this.stats.errors.l3++;
          logger.error('Redis设置缓存失败:', error);
        }
      }

      this.stats.sets.total++;
      this.recordResponseTime(startTime);
      return true;

    } catch (error) {
      this.stats.errors.l1++;
      this.stats.errors.total++;
      logger.error('设置缓存失败:', error);
      this.recordResponseTime(startTime);
      return false;
    }
  }

  /**
   * 删除缓存
   */
  async del(key) {
    const startTime = process.hrtime.bigint();

    try {
      // 从L1缓存删除
      const l1Deleted = this.l1Cache.delete(key);
      if (l1Deleted) this.stats.deletes.l1++;

      // 从L2缓存删除
      const l2Deleted = this.l2Cache.del(key);
      if (l2Deleted > 0) this.stats.deletes.l2++;

      // 从L3缓存删除
      if (this.redisConnected) {
        try {
          const l3Deleted = await this.l3Cache.del(key);
          if (l3Deleted > 0) this.stats.deletes.l3++;
        } catch (error) {
          this.stats.errors.l3++;
          logger.error('Redis删除缓存失败:', error);
        }
      }

      this.stats.deletes.total++;
      this.recordResponseTime(startTime);
      return l1Deleted || l2Deleted > 0;

    } catch (error) {
      this.stats.errors.l1++;
      this.stats.errors.total++;
      logger.error('删除缓存失败:', error);
      this.recordResponseTime(startTime);
      return false;
    }
  }

  /**
   * 批量获取
   */
  async mget(keys, options = {}) {
    const startTime = process.hrtime.bigint();
    const results = new Map();

    try {
      const missKeys = [];

      // 从L1缓存获取
      for (const key of keys) {
        const value = this.l1Cache.get(key);
        if (value !== undefined) {
          results.set(key, value);
          this.stats.hits.l1++;
        } else {
          missKeys.push(key);
          this.stats.misses.l1++;
        }
      }

      // 从L2缓存获取缺失的
      const remainingKeys = [];
      for (const key of missKeys) {
        const value = this.l2Cache.get(key);
        if (value !== undefined) {
          results.set(key, value);
          this.stats.hits.l2++;
          this.l1Cache.set(key, value, options.l1TTL || this.config.l1TTL);
        } else {
          remainingKeys.push(key);
          this.stats.misses.l2++;
        }
      }

      // 从L3缓存获取剩余的
      if (this.redisConnected && remainingKeys.length > 0) {
        try {
          const redisValues = await this.l3Cache.mget(...remainingKeys);

          for (let i = 0; i < remainingKeys.length; i++) {
            const key = remainingKeys[i];
            const value = redisValues[i];

            if (value !== null) {
              const deserialized = this.deserialize(value);
              results.set(key, deserialized);
              this.stats.hits.l3++;
              this.l2Cache.set(key, deserialized, options.l2TTL || this.config.l2TTL);
              this.l1Cache.set(key, deserialized, options.l1TTL || this.config.l1TTL);
            } else {
              this.stats.misses.l3++;
            }
          }
        } catch (error) {
          this.stats.errors.l3++;
          logger.error('Redis批量获取缓存失败:', error);
        }
      }

      this.stats.hits.total += results.size;
      this.stats.misses.total += (keys.length - results.size);
      this.recordResponseTime(startTime);

      return results;

    } catch (error) {
      this.stats.errors.l1++;
      this.stats.errors.total++;
      logger.error('批量获取缓存失败:', error);
      this.recordResponseTime(startTime);
      return new Map();
    }
  }

  /**
   * 批量设置
   */
  async mset(keyValuePairs, options = {}) {
    const startTime = process.hrtime.bigint();
    const results = new Map();

    try {
      const redisPairs = [];

      for (const [key, value] of keyValuePairs) {
        const serialized = this.serialize(value);
        const size = Buffer.byteLength(serialized, 'utf8');

        if (size > this.config.maxSize) {
          console.warn(`数据过大，跳过缓存: ${key} (${size} bytes)`);
          results.set(key, false);
          continue;
        }

        // 设置到L1缓存
        this.l1Cache.set(key, value, options.l1TTL || this.config.l1TTL);
        this.stats.sets.l1++;

        // 设置到L2缓存
        this.l2Cache.set(key, value, options.l2TTL || this.config.l2TTL);
        this.stats.sets.l2++;

        // 准备Redis批量设置
        if (this.redisConnected && options.useRedis !== false) {
          redisPairs.push(key, serialized);
        }

        results.set(key, true);
      }

      // 批量设置到Redis
      if (this.redisConnected && redisPairs.length > 0) {
        try {
          const l3TTL = options.l3TTL || this.config.l3TTL;
          const pipeline = this.l3Cache.pipeline();

          for (let i = 0; i < redisPairs.length; i += 2) {
            pipeline.setex(redisPairs[i], Math.floor(l3TTL / 1000), redisPairs[i + 1]);
          }

          await pipeline.exec();
          this.stats.sets.l3 += redisPairs.length / 2;
        } catch (error) {
          this.stats.errors.l3++;
          logger.error('Redis批量设置缓存失败:', error);
        }
      }

      this.stats.sets.total += keyValuePairs.size;
      this.recordResponseTime(startTime);
      return results;

    } catch (error) {
      this.stats.errors.l1++;
      this.stats.errors.total++;
      logger.error('批量设置缓存失败:', error);
      this.recordResponseTime(startTime);
      return new Map();
    }
  }

  /**
   * 缓存装饰器
   */
  decorate(ttl = this.config.l2TTL, keyGenerator = null) {
    return (target, propertyName, descriptor) => {
      const method = descriptor.value;

      descriptor.value = async function (...args) {
        const cacheKey = keyGenerator
          ? keyGenerator(...args)
          : `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;

        // 尝试从缓存获取
        const cached = await this.cache.get(cacheKey);
        if (cached !== null) {
          return cached;
        }

        // 执行原方法
        const result = await method.apply(this, args);

        // 设置到缓存
        if (result !== null && result !== undefined) {
          await this.cache.set(cacheKey, result, { l2TTL: ttl });
        }

        return result;
      };
    };
  }

  /**
   * 序列化数据
   */
  serialize(value) {
    try {
      const data = JSON.stringify(value);

      if (this.config.enableCompression &&
          data.length > this.config.compressionThreshold) {
        // 这里可以添加压缩逻辑
        return data;
      }

      return data;
    } catch (error) {
      logger.error('序列化失败:', error);
      return null;
    }
  }

  /**
   * 反序列化数据
   */
  deserialize(data) {
    try {
      if (typeof data === 'string') {
        // 这里可以添加解压缩逻辑
        return JSON.parse(data);
      }
      return data;
    } catch (error) {
      logger.error('反序列化失败:', error);
      return null;
    }
  }

  /**
   * 记录响应时间
   */
  recordResponseTime(startTime) {
    if (!this.config.enableMetrics) return;

    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1000000; // 转换为毫秒

    // 如果响应时间超过200ms，记录警告
    if (responseTime > 200) {
      console.warn(`缓存响应时间过长: ${responseTime.toFixed(2)}ms`);
    }

    return responseTime;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const hitRate = {
      l1: this.stats.hits.l1 / (this.stats.hits.l1 + this.stats.misses.l1) || 0,
      l2: this.stats.hits.l2 / (this.stats.hits.l2 + this.stats.misses.l2) || 0,
      l3: this.stats.hits.l3 / (this.stats.hits.l3 + this.stats.misses.l3) || 0,
      total: this.stats.hits.total / (this.stats.hits.total + this.stats.misses.total) || 0
    };

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
      evictions: this.stats.evictions,
      errors: this.stats.errors,
      hitRate,
      redisConnected: this.redisConnected,
      l1Size: this.l1Cache.size,
      l2Size: this.l2Cache.keys().length
    };
  }

  /**
   * 清空所有缓存
   */
  async clear() {
    try {
      // 清空L1缓存
      this.l1Cache.clear();

      // 清空L2缓存
      this.l2Cache.flushAll();

      // 清空L3缓存
      if (this.redisConnected) {
        await this.l3Cache.flushdb();
      }

      logger.debug('所有缓存已清空');
      return true;

    } catch (error) {
      logger.error('清空缓存失败:', error);
      return false;
    }
  }

  /**
   * 清理过期数据
   */
  async cleanup() {
    try {
      // 清理L1缓存
      this.l1Cache.purgeStale();

      // 清理L2缓存
      this.l2Cache.keys().forEach(key => {
        const ttl = this.l2Cache.getTtl(key);
        if (ttl === -1) { // 永不过期的键也要清理
          this.l2Cache.del(key);
        }
      });

      // Redis会自动清理过期键

      logger.debug('缓存清理完成');
    } catch (error) {
      logger.error('缓存清理失败:', error);
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    const testKey = 'health:check';
    const testValue = { timestamp: Date.now(), status: 'ok' };

    try {
      // 测试L1缓存
      this.l1Cache.set(testKey, testValue, 1000);
      const l1Result = this.l1Cache.get(testKey);
      if (l1Result?.status !== 'ok') {
        return { status: 'unhealthy', message: 'L1缓存测试失败' };
      }

      // 测试L2缓存
      this.l2Cache.set(testKey, testValue, 1000);
      const l2Result = this.l2Cache.get(testKey);
      if (l2Result?.status !== 'ok') {
        return { status: 'unhealthy', message: 'L2缓存测试失败' };
      }

      // 测试L3缓存
      if (this.redisConnected) {
        await this.l3Cache.setex(testKey, 1, JSON.stringify(testValue));
        const l3Result = await this.l3Cache.get(testKey);
        if (!l3Result) {
          return { status: 'unhealthy', message: 'L3缓存测试失败' };
        }
      }

      // 清理测试数据
      this.l1Cache.delete(testKey);
      this.l2Cache.del(testKey);
      if (this.redisConnected) {
        await this.l3Cache.del(testKey);
      }

      return {
        status: 'healthy',
        message: '所有缓存层级正常工作',
        redisConnected: this.redisConnected
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message
      };
    }
  }

  /**
   * 关闭服务
   */
  async close() {
    try {
      if (this.l3Cache) {
        await this.l3Cache.quit();
        this.l3Cache = null;
      }
      logger.debug('缓存服务已关闭');
    } catch (error) {
      logger.error('关闭缓存服务失败:', error);
    }
  }
}

module.exports = new CacheService();