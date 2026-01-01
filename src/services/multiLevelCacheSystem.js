/**
 * 多级缓存系统
 * 实现L1(内存) -> L2(Redis) -> L3(数据库)的三级缓存架构
 */

const Redis = require('ioredis');
const NodeCache = require('node-cache');
const crypto = require('crypto');

class MultiLevelCacheSystem {
  constructor(options = {}) {
    this.options = {
      // L1缓存配置（内存）
      l1: {
        maxSize: options.l1?.maxSize || 1000,           // 最大条目数
        ttl: options.l1?.ttl || 300,                    // 5分钟TTL
        checkPeriod: options.l1?.checkPeriod || 60,     // 清理周期
        useClones: false                                // 使用引用而非克隆
      },

      // L2缓存配置（Redis）
      l2: {
        host: options.l2?.host || 'localhost',
        port: options.l2?.port || 6379,
        password: options.l2?.password,
        db: options.l2?.db || 0,
        keyPrefix: options.l2?.keyPrefix || 'smartvillage:',
        ttl: options.l2?.ttl || 3600,                   // 1小时TTL
        maxRetriesPerRequest: options.l2?.maxRetriesPerRequest || 3,
        retryDelayOnFailover: options.l2?.retryDelayOnFailover || 100,
        lazyConnect: true
      },

      // L3缓存配置（数据库连接池）
      l3: {
        queryCacheSize: options.l3?.queryCacheSize || 5000,
        slowQueryThreshold: options.l3?.slowQueryThreshold || 100
      },

      // 缓存策略
      strategy: {
        eviction: options.strategy?.eviction || 'lru',    // lru, lfu, fifo
        writeThrough: options.strategy?.writeThrough || true,
        writeBack: options.strategy?.writeBack || false,
        writeBehind: options.strategy?.writeBehind || {
          enabled: false,
          bufferSize: 100,
          flushInterval: 5000
        }
      },

      // 性能优化
      performance: {
        enableCompression: options.performance?.enableCompression || false,
        enableMetrics: options.performance?.enableMetrics !== false,
        batchSize: options.performance?.batchSize || 100
      }
    };

    // 初始化L1缓存
    this.l1Cache = new NodeCache({
      max: this.options.l1.maxSize,
      ttl: this.options.l1.ttl * 1000, // 转换为毫秒
      checkperiod: this.options.l1.checkPeriod * 1000,
      useClones: this.options.l1.useClones
    });

    // 初始化L2缓存（Redis）
    this.l2Cache = new Redis(this.options.l2);

    // 缓存统计
    this.stats = {
      hits: { l1: 0, l2: 0, l3: 0 },
      misses: { l1: 0, l2: 0, l3: 0 },
      sets: { l1: 0, l2: 0 },
      deletes: { l1: 0, l2: 0 },
      evictions: { l1: 0, l2: 0 },
      errors: { l1: 0, l2: 0, l3: 0 },
      totalRequests: 0,
      totalLatency: 0
    };

    // 写入缓冲区（用于write-behind策略）
    this.writeBuffer = [];
    this.writeBufferTimer = null;

    // 预热队列
    this.preloadQueue = [];

    this.initialize();
  }

  /**
   * 初始化缓存系统
   */
  async initialize() {
    try {
      // 连接Redis
      await this.l2Cache.connect();
      logger.debug('Redis连接成功');
      // 设置事件监听
      this.setupEventListeners();

      // 启动写入缓冲区定时器
      if (this.options.strategy.writeBehind.enabled) {
        this.startWriteBufferTimer();
      }

      // 启动预热任务
      this.startPreloadTask();

      logger.debug('多级缓存系统初始化完成');
    } catch (error) {
      logger.error('缓存系统初始化失败:', error);
    }
  }

  /**
   * 获取缓存值
   */
  async get(key, options = {}) {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      // L1缓存查询
      let value = this.l1Cache.get(key);
      if (value !== undefined) {
        this.stats.hits.l1++;
        this.updateLatency(startTime);
        return value;
      }
      this.stats.misses.l1++;

      // L2缓存查询
      const l2Key = this.getL2Key(key);
      const l2Value = await this.l2Cache.get(l2Key);

      if (l2Value !== null) {
        // 解压缩（如果启用）
        value = this.options.performance.enableCompression
          ? await this.decompress(l2Value)
          : JSON.parse(l2Value);

        // 回填到L1缓存
        this.setL1(key, value);

        this.stats.hits.l2++;
        this.updateLatency(startTime);
        return value;
      }
      this.stats.misses.l2++;

      // L3数据库查询
      if (options.fetchFromDB) {
        value = await options.fetchFromDB(key);
        if (value !== null && value !== undefined) {
          // 缓存到L1和L2
          await this.set(key, value);

          this.stats.hits.l3++;
          this.updateLatency(startTime);
          return value;
        }
      }

      this.stats.misses.l3++;
      this.updateLatency(startTime);
      return null;

    } catch (error) {
      this.stats.errors.l1++;
      logger.error('缓存获取失败:', error);
      return null;
    }
  }

  /**
   * 设置缓存值
   */
  async set(key, value, options = {}) {
    const l1TTL = options.ttl || this.options.l1.ttl;
    const l2TTL = options.l2TTL || this.options.l2.ttl;

    try {
      // 写入策略
      if (this.options.strategy.writeThrough) {
        // 写透策略：同时写入L1、L2和数据库
        await Promise.all([
          this.setL1(key, value, l1TTL),
          this.setL2(key, value, l2TTL),
          options.writeToDB ? options.writeToDB(key, value) : Promise.resolve()
        ]);
      } else if (this.options.strategy.writeBack && options.writeToDB) {
        // 写回策略：先写入缓存，异步写入数据库
        await Promise.all([
          this.setL1(key, value, l1TTL),
          this.setL2(key, value, l2TTL)
        ]);

        // 添加到写入缓冲区
        if (this.options.strategy.writeBehind.enabled) {
          this.addToWriteBuffer(key, value, options.writeToDB);
        }
      } else {
        // 普通缓存写入
        await Promise.all([
          this.setL1(key, value, l1TTL),
          this.setL2(key, value, l2TTL)
        ]);
      }

      return true;
    } catch (error) {
      this.stats.errors.l1++;
      logger.error('缓存设置失败:', error);
      return false;
    }
  }

  /**
   * 删除缓存值
   */
  async delete(key, options = {}) {
    try {
      await Promise.all([
        this.deleteL1(key),
        this.deleteL2(key)
      ]);

      // 同时删除相关模式（如前缀匹配）
      if (options.pattern) {
        await this.deleteByPattern(options.pattern);
      }

      return true;
    } catch (error) {
      this.stats.errors.l1++;
      logger.error('缓存删除失败:', error);
      return false;
    }
  }

  /**
   * 批量获取
   */
  async mget(keys, options = {}) {
    const results = new Map();
    const missingKeys = [];

    // 先从L1获取
    for (const key of keys) {
      const value = this.l1Cache.get(key);
      if (value !== undefined) {
        results.set(key, value);
        this.stats.hits.l1++;
      } else {
        missingKeys.push(key);
        this.stats.misses.l1++;
      }
    }

    // 从L2获取缺失的键
    if (missingKeys.length > 0) {
      const l2Keys = missingKeys.map(k => this.getL2Key(k));
      const l2Values = await this.l2Cache.mget(l2Keys);

      for (let i = 0; i < missingKeys.length; i++) {
        const key = missingKeys[i];
        const l2Value = l2Values[i];

        if (l2Value !== null) {
          const value = this.options.performance.enableCompression
            ? await this.decompress(l2Value)
            : JSON.parse(l2Value);

          results.set(key, value);
          this.setL1(key, value); // 回填L1
          this.stats.hits.l2++;
        } else {
          this.stats.misses.l2++;
        }
      }
    }

    return results;
  }

  /**
   * 批量设置
   */
  async mset(keyValuePairs, options = {}) {
    const l1TTL = options.ttl || this.options.l1.ttl;
    const l2TTL = options.l2TTL || this.options.l2.ttl;

    // 准备L2数据
    const l2Data = {};
    for (const [key, value] of keyValuePairs) {
      const l2Key = this.getL2Key(key);
      l2Data[l2Key] = this.options.performance.enableCompression
        ? await this.compress(JSON.stringify(value))
        : JSON.stringify(value);
    }

    try {
      // 批量写入L1和L2
      await Promise.all([
        // L1写入
        (async () => {
          for (const [key, value] of keyValuePairs) {
            this.l1Cache.set(key, value, l1TTL);
          }
        })(),
        // L2写入
        this.l2Cache.mset(l2Data),
        // 设置L2过期时间
        (async () => {
          const pipeline = this.l2Cache.pipeline();
          for (const key of keyValuePairs.keys()) {
            pipeline.expire(this.getL2Key(key), l2TTL);
          }
          await pipeline.exec();
        })()
      ]);

      return true;
    } catch (error) {
      this.stats.errors.l1++;
      logger.error('批量缓存设置失败:', error);
      return false;
    }
  }

  /**
   * 预加载热点数据
   */
  async preload(preloadConfig) {
    const { pattern, fetchFunc, priority = 'normal' } = preloadConfig;

    this.preloadQueue.push({
      pattern,
      fetchFunc,
      priority,
      timestamp: Date.now()
    });

    // 按优先级排序
    this.preloadQueue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 缓存失效
   */
  async invalidate(pattern, options = {}) {
    try {
      // 支持通配符模式
      if (pattern.includes('*')) {
        return await this.deleteByPattern(pattern);
      }

      // 单个键失效
      return await this.delete(pattern, options);
    } catch (error) {
      logger.error('缓存失效失败:', error);
      return false;
    }
  }

  /**
   * 缓存预热
   */
  async warmUp(warmUpConfig) {
    const { keys, fetchFunc, batchSize = this.options.performance.batchSize } = warmUpConfig;

    logger.debug(`开始预热缓存，共 ${keys.length} 个键`);
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);

      try {
        // 批量获取数据
        const promises = batch.map(async (key) => {
          const value = await fetchFunc(key);
          if (value !== null && value !== undefined) {
            return this.set(key, value);
          }
          return false;
        });

        await Promise.all(promises);

        console.log(`预热进度: ${Math.min(i + batchSize, keys.length)}/${keys.length}`);
      } catch (error) {
        console.error(`批次预热失败 (${i}-${i + batchSize}):`, error);
      }
    }

    logger.debug('缓存预热完成');
  }

  /**
   * 获取缓存统计
   */
  getStatistics() {
    const totalHits = this.stats.hits.l1 + this.stats.hits.l2 + this.stats.hits.l3;
    const totalRequests = this.stats.totalRequests;
    const hitRate = totalRequests > 0 ? (totalHits / totalRequests * 100).toFixed(2) : 0;
    const avgLatency = totalRequests > 0 ? (this.stats.totalLatency / totalRequests).toFixed(2) : 0;

    return {
      hitRate: `${hitRate}%`,
      avgLatency: `${avgLatency}ms`,
      l1: {
        hits: this.stats.hits.l1,
        misses: this.stats.misses.l1,
        size: this.l1Cache.getStats().keys,
        hitRate: `${(this.stats.hits.l1 / (this.stats.hits.l1 + this.stats.misses.l1) * 100).toFixed(2)}%`
      },
      l2: {
        hits: this.stats.hits.l2,
        misses: this.stats.misses.l2,
        hitRate: `${(this.stats.hits.l2 / (this.stats.hits.l2 + this.stats.misses.l2) * 100).toFixed(2)}%`
      },
      l3: {
        hits: this.stats.hits.l3,
        misses: this.stats.misses.l3
      },
      operations: {
        sets: this.stats.sets.l1 + this.stats.sets.l2,
        deletes: this.stats.deletes.l1 + this.stats.deletes.l2,
        evictions: this.stats.evictions.l1 + this.stats.evictions.l2
      },
      errors: {
        l1: this.stats.errors.l1,
        l2: this.stats.errors.l2,
        l3: this.stats.errors.l3
      }
    };
  }

  /**
   * 重置统计
   */
  resetStatistics() {
    this.stats = {
      hits: { l1: 0, l2: 0, l3: 0 },
      misses: { l1: 0, l2: 0, l3: 0 },
      sets: { l1: 0, l2: 0 },
      deletes: { l1: 0, l2: 0 },
      evictions: { l1: 0, l2: 0 },
      errors: { l1: 0, l2: 0, l3: 0 },
      totalRequests: 0,
      totalLatency: 0
    };
  }

  /**
   * 清空所有缓存
   */
  async flushAll() {
    try {
      await Promise.all([
        // 清空L1
        new Promise(resolve => {
          this.l1Cache.flushAll();
          resolve();
        }),
        // 清空L2
        this.l2Cache.flushdb()
      ]);

      logger.debug('所有缓存已清空');
      return true;
    } catch (error) {
      logger.error('清空缓存失败:', error);
      return false;
    }
  }

  // 私有方法

  async setL1(key, value, ttl) {
    this.l1Cache.set(key, value, ttl || this.options.l1.ttl);
    this.stats.sets.l1++;
  }

  async setL2(key, value, ttl) {
    const l2Key = this.getL2Key(key);
    const serialized = this.options.performance.enableCompression
      ? await this.compress(JSON.stringify(value))
      : JSON.stringify(value);

    await this.l2Cache.setex(l2Key, ttl || this.options.l2.ttl, serialized);
    this.stats.sets.l2++;
  }

  async deleteL1(key) {
    const deleted = this.l1Cache.del(key);
    if (deleted > 0) {
      this.stats.deletes.l1++;
    }
    return deleted > 0;
  }

  async deleteL2(key) {
    const l2Key = this.getL2Key(key);
    const result = await this.l2Cache.del(l2Key);
    if (result > 0) {
      this.stats.deletes.l2++;
    }
    return result > 0;
  }

  getL2Key(key) {
    return `${this.options.l2.keyPrefix}${key}`;
  }

  async compress(data) {
    if (!this.options.performance.enableCompression) {
      return data;
    }

    try {
      const zlib = require('zlib');
      return zlib.gzipSync(data).toString('base64');
    } catch (error) {
      logger.error('压缩失败:', error);
      return data;
    }
  }

  async decompress(compressedData) {
    try {
      const zlib = require('zlib');
      const logger = require('../utils/logger');
      return JSON.parse(zlib.gunzipSync(Buffer.from(compressedData, 'base64')).toString());
    } catch (error) {
      logger.error('解压缩失败:', error);
      return JSON.parse(compressedData);
    }
  }

  async deleteByPattern(pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const keys = this.l1Cache.keys();

    // 删除L1中匹配的键
    for (const key of keys) {
      if (regex.test(key)) {
        this.l1Cache.del(key);
      }
    }

    // 删除L2中匹配的键
    const l2Pattern = this.getL2Key(pattern);
    const stream = this.l2Cache.scanStream({
      match: l2Pattern,
      count: 100
    });

    for await (const l2Keys of stream) {
      if (l2Keys.length > 0) {
        await this.l2Cache.del(...l2Keys);
      }
    }

    return true;
  }

  addToWriteBuffer(key, value, writeFunc) {
    this.writeBuffer.push({ key, value, writeFunc, timestamp: Date.now() });

    // 缓冲区满时立即刷新
    if (this.writeBuffer.length >= this.options.strategy.writeBehind.bufferSize) {
      this.flushWriteBuffer();
    }
  }

  async flushWriteBuffer() {
    if (this.writeBuffer.length === 0) return;

    const buffer = [...this.writeBuffer];
    this.writeBuffer = [];

    try {
      const promises = buffer.map(item =>
        item.writeFunc(item.key, item.value).catch(error => {
          logger.error(`写入失败 ${item.key}:`, error);
          // 重新加入缓冲区重试
          this.writeBuffer.push(item);
        })
      );

      await Promise.all(promises);
      logger.debug(`写入缓冲区刷新完成，处理了 ${buffer.length} 个项目`);
    } catch (error) {
      logger.error('写入缓冲区刷新失败:', error);
    }
  }

  startWriteBufferTimer() {
    if (this.writeBufferTimer) return;

    this.writeBufferTimer = setInterval(() => {
      this.flushWriteBuffer();
    }, this.options.strategy.writeBehind.flushInterval);
  }

  async startPreloadTask() {
    setInterval(async () => {
      if (this.preloadQueue.length === 0) return;

      const task = this.preloadQueue.shift();

      try {
        logger.debug(`执行预加载任务: ${task.pattern}`);
        await task.fetchFunc();
      } catch (error) {
        logger.error('预加载任务执行失败:', error);
      }
    }, 1000); // 每秒检查一次
  }

  setupEventListeners() {
    // L1缓存事件
    this.l1Cache.on('expired', (key, value) => {
      this.stats.evictions.l1++;
    });

    this.l1Cache.on('del', (key, value) => {
      // 可选：通知L2缓存删除
    });

    // Redis事件
    this.l2Cache.on('error', (error) => {
      this.stats.errors.l2++;
      logger.error('Redis错误:', error);
    });

    this.l2Cache.on('connect', () => {
      logger.debug('Redis重新连接');
    });
  }

  updateLatency(startTime) {
    const latency = Date.now() - startTime;
    this.stats.totalLatency += latency;
  }

  /**
   * 生成缓存键
   */
  generateKey(namespace, identifier) {
    return `${namespace}:${crypto.createHash('md5').update(identifier).digest('hex')}`;
  }

  /**
   * 锁定缓存键（防止缓存击穿）
   */
  async lock(key, ttl = 30) {
    const lockKey = `${key}:lock`;
    const lockValue = Date.now().toString();

    const result = await this.l2Cache.set(lockKey, lockValue, 'EX', ttl, 'NX');
    return result === 'OK' ? lockValue : null;
  }

  /**
   * 释放锁
   */
  async unlock(key, lockValue) {
    const lockKey = `${key}:lock`;

    // Lua脚本确保原子性
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await this.l2Cache.eval(script, 1, lockKey, lockValue);
    return result === 1;
  }
}

module.exports = MultiLevelCacheSystem;