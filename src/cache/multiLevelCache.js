/**
 * 多级缓存系统
 * 实现L1内存 -> L2 Redis -> L3文件的三级缓存架构
 */

const LRUCache = require('lru-cache');
const Redis = require('ioredis');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');
const logger = require('../utils/logger');

class MultiLevelCache extends EventEmitter {
  constructor(options = {}) {
    super();

    // 缓存配置
    this.config = {
      // L1 内存缓存配置
      l1: {
        maxSize: options.l1MaxSize || 1000,
        ttl: options.l1Ttl || 1000 * 60 * 5, // 5分钟
        updateAgeOnGet: true
      },
      // L2 Redis缓存配置
      l2: {
        host: options.redisHost || 'localhost',
        port: options.redisPort || 6379,
        password: options.redisPassword,
        db: options.redisDb || 0,
        keyPrefix: options.redisKeyPrefix || 'cache:',
        ttl: options.l2Ttl || 1000 * 60 * 30, // 30分钟
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100
      },
      // L3 文件缓存配置
      l3: {
        dir: options.cacheDir || './cache',
        ttl: options.l3Ttl || 1000 * 60 * 60 * 2, // 2小时
        maxFiles: options.maxCacheFiles || 10000,
        compressionEnabled: options.compressionEnabled !== false
      }
    };

    // 统计信息
    this.stats = {
      l1Hits: 0,
      l2Hits: 0,
      l3Hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };

    // 初始化各级缓存
    this.initCaches();

    // 启动清理任务
    this.startCleanupTasks();
  }

  /**
   * 初始化各级缓存
   */
  async initCaches() {
    try {
      // 初始化L1内存缓存
      this.l1Cache = new LRUCache({
        max: this.config.l1.maxSize,
        ttl: this.config.l1.ttl,
        updateAgeOnGet: this.config.l1.updateAgeOnGet,
        dispose: (value, key) => {
          // L1淘汰时，可选地写入L2
          if (value.persistent !== false) {
            this.setL2(key, value);
          }
        }
      });

      // 初始化L2 Redis缓存
      this.l2Redis = new Redis({
        host: this.config.l2.host,
        port: this.config.l2.port,
        password: this.config.l2.password,
        db: this.config.l2.db,
        keyPrefix: this.config.l2.keyPrefix,
        maxRetriesPerRequest: this.config.l2.maxRetriesPerRequest,
        retryDelayOnFailover: this.config.l2.retryDelayOnFailover
      });

      this.l2Redis.on('connect', () => {
        logger.info('Redis连接成功');
        this.emit('redis:connected');
      });

      this.l2Redis.on('error', (err) => {
        logger.error('Redis连接错误', err);
        this.stats.errors++;
        this.emit('redis:error', err);
      });

      // 初始化L3文件缓存
      await this.initL3Cache();

      logger.info('多级缓存系统初始化完成', {
        l1Size: this.config.l1.maxSize,
        l2Ttl: this.config.l2.ttl,
        l3Dir: this.config.l3.dir
      });

    } catch (error) {
      logger.error('多级缓存初始化失败', error);
      throw error;
    }
  }

  /**
   * 初始化L3文件缓存
   */
  async initL3Cache() {
    const cacheDir = path.resolve(this.config.l3.dir);

    // 创建缓存目录
    try {
      await fs.mkdir(cacheDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }

    this.l3CacheDir = cacheDir;

    // 创建子目录
    const subdirs = ['data', 'meta', 'temp'];
    for (const subdir of subdirs) {
      await fs.mkdir(path.join(cacheDir, subdir), { recursive: true });
    }
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {Promise} 缓存值
   */
  async get(key) {
    try {
      // L1 查询
      let value = this.l1Cache.get(key);
      if (value !== undefined) {
        this.stats.l1Hits++;
        return this.deserializeValue(value);
      }

      // L2 查询
      const l2Value = await this.l2Redis.get(key);
      if (l2Value !== null) {
        value = this.deserializeValue(JSON.parse(l2Value));
        // 回填到L1
        this.l1Cache.set(key, value);
        this.stats.l2Hits++;
        return value;
      }

      // L3 查询
      const l3Value = await this.getL3(key);
      if (l3Value !== null) {
        value = l3Value;
        // 回填到L1和L2
        this.l1Cache.set(key, value);
        await this.setL2(key, value);
        this.stats.l3Hits++;
        return value;
      }

      // 未命中
      this.stats.misses++;
      return null;

    } catch (error) {
      this.stats.errors++;
      logger.error('获取缓存失败', { key, error: error.message });
      return null;
    }
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {Object} options - 选项
   */
  async set(key, value, options = {}) {
    try {
      const {
        l1Ttl = this.config.l1.ttl,
        l2Ttl = this.config.l2.ttl,
        l3Ttl = this.config.l3.ttl,
        persistent = true,
        compress = this.config.l3.compressionEnabled
      } = options;

      // 序列化值
      const serializedValue = this.serializeValue(value, { persistent });

      // 设置L1缓存
      if (l1Ttl > 0) {
        this.l1Cache.set(key, serializedValue, { ttl: l1Ttl });
      }

      // 设置L2缓存
      if (l2Ttl > 0) {
        await this.setL2(key, serializedValue, l2Ttl);
      }

      // 设置L3缓存
      if (l3Ttl > 0 && persistent) {
        await this.setL3(key, serializedValue, l3Ttl, compress);
      }

      this.stats.sets++;
      return true;

    } catch (error) {
      this.stats.errors++;
      logger.error('设置缓存失败', { key, error: error.message });
      return false;
    }
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  async delete(key) {
    try {
      // 删除L1缓存
      this.l1Cache.delete(key);

      // 删除L2缓存
      await this.l2Redis.del(key);

      // 删除L3缓存
      await this.deleteL3(key);

      this.stats.deletes++;
      return true;

    } catch (error) {
      this.stats.errors++;
      logger.error('删除缓存失败', { key, error: error.message });
      return false;
    }
  }

  /**
   * 批量获取
   * @param {Array} keys - 缓存键数组
   * @returns {Promise} 键值对对象
   */
  async mget(keys) {
    const results = {};
    const remainingKeys = [];
    const l2Keys = [];

    // 先从L1获取
    keys.forEach(key => {
      const value = this.l1Cache.get(key);
      if (value !== undefined) {
        results[key] = this.deserializeValue(value);
        this.stats.l1Hits++;
      } else {
        remainingKeys.push(key);
        l2Keys.push(key);
      }
    });

    // 批量从L2获取
    if (l2Keys.length > 0) {
      try {
        const l2Values = await this.l2Redis.mget(...l2Keys);
        const stillRemainingKeys = [];

        l2Keys.forEach((key, index) => {
          const value = l2Values[index];
          if (value !== null) {
            const deserializedValue = this.deserializeValue(JSON.parse(value));
            results[key] = deserializedValue;
            this.l1Cache.set(key, deserializedValue);
            this.stats.l2Hits++;
          } else {
            stillRemainingKeys.push(key);
          }
        });

        // 从L3获取剩余的键
        if (stillRemainingKeys.length > 0) {
          for (const key of stillRemainingKeys) {
            const l3Value = await this.getL3(key);
            if (l3Value !== null) {
              results[key] = l3Value;
              this.l1Cache.set(key, l3Value);
              await this.setL2(key, l3Value);
              this.stats.l3Hits++;
            } else {
              this.stats.misses++;
            }
          }
        }

      } catch (error) {
        logger.error('批量获取L2缓存失败', error);
        remainingKeys.forEach(key => {
          this.stats.misses++;
        });
      }
    }

    return results;
  }

  /**
   * 设置L2缓存
   * @param {string} key - 键
   * @param {*} value - 值
   * @param {number} ttl - 过期时间
   */
  async setL2(key, value, ttl = this.config.l2.ttl) {
    try {
      if (ttl > 0) {
        await this.l2Redis.setex(key, Math.floor(ttl / 1000), JSON.stringify(value));
      } else {
        await this.l2Redis.set(key, JSON.stringify(value));
      }
    } catch (error) {
      logger.error('设置L2缓存失败', { key, error: error.message });
    }
  }

  /**
   * 获取L3缓存
   * @param {string} key - 键
   * @returns {*} 缓存值
   */
  async getL3(key) {
    try {
      const filePath = this.getL3FilePath(key);
      const metaPath = this.getL3MetaPath(key);

      // 检查文件是否存在
      try {
        await fs.access(filePath);
        await fs.access(metaPath);
      } catch {
        return null;
      }

      // 读取元数据
      const metaContent = await fs.readFile(metaPath, 'utf8');
      const meta = JSON.parse(metaContent);

      // 检查是否过期
      if (Date.now() > meta.expiresAt) {
        await this.deleteL3(key);
        return null;
      }

      // 读取数据
      const data = await fs.readFile(filePath);

      // 如果是压缩的，需要解压
      if (meta.compressed) {
        // 这里应该使用 zlib 解压，简化处理
        // data = await gunzip(data);
      }

      return this.deserializeValue(JSON.parse(data.toString()));

    } catch (error) {
      logger.debug('获取L3缓存失败', { key, error: error.message });
      return null;
    }
  }

  /**
   * 设置L3缓存
   * @param {string} key - 键
   * @param {*} value - 值
   * @param {number} ttl - 过期时间
   * @param {boolean} compress - 是否压缩
   */
  async setL3(key, value, ttl = this.config.l3.ttl, compress = false) {
    try {
      const filePath = this.getL3FilePath(key);
      const metaPath = this.getL3MetaPath(key);

      // 准备数据
      const data = JSON.stringify(value);

      // 压缩处理
      if (compress) {
        // 这里应该使用 zlib 压缩，简化处理
        // data = await gzip(data);
      }

      // 准备元数据
      const meta = {
        createdAt: Date.now(),
        expiresAt: Date.now() + ttl,
        compressed: compress,
        size: data.length
      };

      // 写入临时文件
      const tempDataPath = path.join(this.l3CacheDir, 'temp', `${key}.tmp`);
      const tempMetaPath = path.join(this.l3CacheDir, 'temp', `${key}.meta.tmp`);

      await fs.writeFile(tempDataPath, data);
      await fs.writeFile(tempMetaPath, JSON.stringify(meta));

      // 原子性重命名
      await fs.rename(tempDataPath, filePath);
      await fs.rename(tempMetaPath, metaPath);

      // 检查文件数量限制
      await this.checkL3Limit();

    } catch (error) {
      logger.error('设置L3缓存失败', { key, error: error.message });
    }
  }

  /**
   * 删除L3缓存
   * @param {string} key - 键
   */
  async deleteL3(key) {
    try {
      const filePath = this.getL3FilePath(key);
      const metaPath = this.getL3MetaPath(key);

      await fs.unlink(filePath).catch(() => {});
      await fs.unlink(metaPath).catch(() => {});

    } catch (error) {
      logger.debug('删除L3缓存失败', { key, error: error.message });
    }
  }

  /**
   * 获取L3文件路径
   * @param {string} key - 键
   * @returns {string} 文件路径
   */
  getL3FilePath(key) {
    const hash = crypto.createHash('md5').update(key).digest('hex');
    const subPath = hash.substring(0, 2);
    const dir = path.join(this.l3CacheDir, 'data', subPath);
    return path.join(dir, `${hash}.cache`);
  }

  /**
   * 获取L3元数据路径
   * @param {string} key - 键
   * @returns {string} 元数据路径
   */
  getL3MetaPath(key) {
    const hash = crypto.createHash('md5').update(key).digest('hex');
    const subPath = hash.substring(0, 2);
    const dir = path.join(this.l3CacheDir, 'meta', subPath);
    return path.join(dir, `${hash}.meta`);
  }

  /**
   * 序列化值
   * @param {*} value - 值
   * @param {Object} options - 选项
   * @returns {Object} 序列化后的值
   */
  serializeValue(value, options = {}) {
    return {
      data: value,
      timestamp: Date.now(),
      persistent: options.persistent !== false
    };
  }

  /**
   * 反序列化值
   * @param {Object} serialized - 序列化的值
   * @returns {*} 原始值
   */
  deserializeValue(serialized) {
    if (serialized && serialized.data !== undefined) {
      return serialized.data;
    }
    return serialized;
  }

  /**
   * 检查L3缓存限制
   */
  async checkL3Limit() {
    try {
      const dataDir = path.join(this.l3CacheDir, 'data');
      const files = await fs.readdir(dataDir, { recursive: true });
      const cacheFiles = files.filter(file => file.endsWith('.cache'));

      if (cacheFiles.length > this.config.l3.maxFiles) {
        // 删除最旧的文件
        const fileStats = await Promise.all(
          cacheFiles.map(async (file) => {
            const filePath = path.join(dataDir, file);
            const stats = await fs.stat(filePath);
            return { file, mtime: stats.mtime };
          })
        );

        fileStats.sort((a, b) => a.mtime - b.mtime);
        const toDelete = fileStats.slice(0, cacheFiles.length - this.config.l3.maxFiles);

        for (const { file } of toDelete) {
          const filePath = path.join(dataDir, file);
          const hash = path.basename(file, '.cache');
          await this.deleteL3(hash);
        }

        logger.info('L3缓存清理完成', {
          deleted: toDelete.length,
          remaining: cacheFiles.length - toDelete.length
        });
      }
    } catch (error) {
      logger.error('检查L3缓存限制失败', error);
    }
  }

  /**
   * 缓存预热
   * @param {Array} hotKeys - 热点键列表
   */
  async warmup(hotKeys) {
    logger.info('开始缓存预热', { count: hotKeys.length });

    const promises = hotKeys.map(async (key) => {
      try {
        // 从L3或数据源加载
        const value = await this.getL3(key);
        if (value !== null) {
          // 预热到L1和L2
          this.l1Cache.set(key, value);
          await this.setL2(key, value);
        }
      } catch (error) {
        logger.warn('预热单个缓存失败', { key, error: error.message });
      }
    });

    await Promise.allSettled(promises);

    logger.info('缓存预热完成');
  }

  /**
   * 启动清理任务
   */
  startCleanupTasks() {
    // 每10分钟清理过期的L3缓存
    setInterval(async () => {
      await this.cleanupExpiredL3();
    }, 10 * 60 * 1000);

    // 每小时输出统计信息
    setInterval(() => {
      this.logStats();
    }, 60 * 60 * 1000);
  }

  /**
   * 清理过期的L3缓存
   */
  async cleanupExpiredL3() {
    try {
      const metaDir = path.join(this.l3CacheDir, 'meta');
      const metaFiles = await fs.readdir(metaDir, { recursive: true });
      const expiredFiles = [];

      for (const metaFile of metaFiles) {
        if (!metaFile.endsWith('.meta')) continue;

        try {
          const metaPath = path.join(metaDir, metaFile);
          const metaContent = await fs.readFile(metaPath, 'utf8');
          const meta = JSON.parse(metaContent);

          if (Date.now() > meta.expiresAt) {
            const hash = path.basename(metaFile, '.meta');
            expiredFiles.push(hash);
          }
        } catch (error) {
          // 删除损坏的元数据文件
          const hash = path.basename(metaFile, '.meta');
          expiredFiles.push(hash);
        }
      }

      // 删除过期的文件
      for (const hash of expiredFiles) {
        await this.deleteL3(hash);
      }

      if (expiredFiles.length > 0) {
        logger.info('L3缓存过期清理完成', { deleted: expiredFiles.length });
      }

    } catch (error) {
      logger.error('清理过期L3缓存失败', error);
    }
  }

  /**
   * 记录统计信息
   */
  logStats() {
    const total = this.stats.l1Hits + this.stats.l2Hits + this.stats.l3Hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.l1Hits + this.stats.l2Hits + this.stats.l3Hits) / total : 0;

    logger.info('多级缓存统计', {
      l1Hits: this.stats.l1Hits,
      l2Hits: this.stats.l2Hits,
      l3Hits: this.stats.l3Hits,
      misses: this.stats.misses,
      hitRate: `${(hitRate * 100).toFixed(2)}%`,
      l1Size: this.l1Cache.size,
      errors: this.stats.errors
    });
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const total = this.stats.l1Hits + this.stats.l2Hits + this.stats.l3Hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.l1Hits + this.stats.l2Hits + this.stats.l3Hits) / total : 0;

    return {
      ...this.stats,
      total,
      hitRate: `${(hitRate * 100).toFixed(2)}%`,
      l1Size: this.l1Cache.size,
      l2Connected: this.l2Redis.status === 'ready'
    };
  }

  /**
   * 清空所有缓存
   */
  async clear() {
    try {
      // 清空L1
      this.l1Cache.clear();

      // 清空L2
      await this.l2Redis.flushdb();

      // 清空L3
      await fs.rm(this.l3CacheDir, { recursive: true, force: true });
      await this.initL3Cache();

      // 重置统计
      this.stats = {
        l1Hits: 0,
        l2Hits: 0,
        l3Hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0
      };

      logger.info('所有缓存已清空');

    } catch (error) {
      logger.error('清空缓存失败', error);
    }
  }

  /**
   * 关闭缓存系统
   */
  async close() {
    try {
      // 关闭Redis连接
      if (this.l2Redis) {
        await this.l2Redis.quit();
      }

      logger.info('多级缓存系统已关闭');

    } catch (error) {
      logger.error('关闭缓存系统失败', error);
    }
  }
}

// 单例模式
const multiLevelCache = new MultiLevelCache();

module.exports = multiLevelCache;