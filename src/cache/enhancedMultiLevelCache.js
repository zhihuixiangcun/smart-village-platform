/**
 * 增强版多级缓存架构
 * 实现 L1内存 -> L2Redis集群 -> L3CDN边缘缓存 的三级架构
 */

const LRUCache = require('lru-cache');
const Redis = require('ioredis');
const CloudFront = require('aws-cloudfront-signer');
const CDNHelper = require('./cdnHelper');
const CacheAnalytics = require('./cacheAnalytics');
const { EventEmitter } = require('events');
const crypto = require('crypto');
const logger = require('../utils/logger');

class EnhancedMultiLevelCache extends EventEmitter {
  constructor(options = {}) {
    super();

    // 缓存架构配置
    this.cacheArchitecture = {
      L1: 'application_cache',    // 应用内存缓存
      L2: 'redis_cluster',       // Redis分布式缓存
      L3: 'cdn_edge_cache'        // CDN边缘缓存
    };

    // L1 应用内存缓存配置
    this.config = {
      l1: {
        maxSize: options.l1MaxSize || 10000,          // 增加到10K条
        ttl: options.l1Ttl || 1000 * 60 * 5,         // 5分钟
        updateAgeOnGet: true,
        maxLoadTime: options.l1MaxLoadTime || 100     // 最大加载时间100ms
      },

      // L2 Redis集群配置
      l2: {
        // Redis集群配置
        cluster: {
          nodes: options.redisClusterNodes || [
            { host: 'redis-node1', port: 6379 },
            { host: 'redis-node2', port: 6379 },
            { host: 'redis-node3', port: 6379 }
          ],
          options: {
            redisOptions: {
              password: options.redisPassword,
              enableOfflineQueue: false,
              maxRetriesPerRequest: 3,
              retryDelayOnFailover: 100,
              lazyConnect: true
            },
            enableReadyCheck: true,
            maxRedirections: 16,
            retryDelayOnClusterDown: 300,
            refreshOfflineAfter: 5000
          }
        },
        // 单Redis实例配置（备用）
        standalone: {
          host: options.redisHost || 'localhost',
          port: options.redisPort || 6379,
          password: options.redisPassword,
          db: options.redisDb || 0
        },
        keyPrefix: options.redisKeyPrefix || 'smartvillage:',
        ttl: options.l2Ttl || 1000 * 60 * 30,        // 30分钟
        compression: options.redisCompression !== false
      },

      // L3 CDN边缘缓存配置
      l3: {
        enabled: options.cdnEnabled !== false,
        provider: options.cdnProvider || 'aws_cloudfront', // aws_cloudfront, aliyun_cdn, tencent_cdn
        distributionDomain: options.cdnDomain,
        keyPairId: options.cdnKeyPairId,
        privateKey: options.cdnPrivateKey,
        ttl: options.l3Ttl || 1000 * 60 * 60 * 24,  // 24小时
        edgeTtl: options.edgeTtl || 1000 * 60 * 60, // 边缘节点1小时
        signedUrlTtl: options.signedUrlTtl || 1000 * 60 * 15, // 签名URL 15分钟
        cacheBehaviors: {
          'api/v1/villages/*': { ttl: 1000 * 60 * 60 },        // 村庄信息1小时
          'api/v1/announcements/*': { ttl: 1000 * 60 * 30 },  // 公告30分钟
          'api/v1/policies/*': { ttl: 1000 * 60 * 60 * 2 },   // 政策2小时
          'api/v1/emergency/*': { ttl: 1000 * 60 * 5 },        // 紧急信息5分钟
          'static/*': { ttl: 1000 * 60 * 60 * 24 * 7 }        // 静态资源7天
        }
      },

      // 通用配置
      analytics: {
        enabled: options.analyticsEnabled !== false,
        samplingRate: options.analyticsSamplingRate || 0.1, // 10%采样率
        reportInterval: options.reportInterval || 1000 * 60 * 5 // 5分钟报告间隔
      }
    };

    // 缓存统计
    this.stats = {
      l1: { hits: 0, misses: 0, sets: 0, errors: 0, avgLoadTime: 0 },
      l2: { hits: 0, misses: 0, sets: 0, errors: 0, clusterStatus: 'unknown' },
      l3: { hits: 0, misses: 0, sets: 0, errors: 0, edgeHits: 0 },
      total: { requests: 0, responses: 0, bandwidth: 0, errors: 0 }
    };

    // 缓存策略
    this.strategies = {
      // 热点数据策略
      hotData: {
        threshold: options.hotDataThreshold || 100,      // 访问100次以上为热点
        l1Multiplier: 2,                                 // L1 TTL翻倍
        preload: true                                    // 预加载到L1
      },

      // 大数据策略
      bigData: {
        threshold: options.bigDataThreshold || 1024 * 1024, // 1MB以上
        skipL1: true,                                    // 跳过L1缓存
        compressL2: true,                                // L2压缩
        cdnOnly: true                                    // 只使用CDN
      },

      // 实时数据策略
      realtimeData: {
        patterns: options.realtimePatterns || [/emergency/, /notification/, /realtime/],
        l1Ttl: 1000 * 30,                              // L1 30秒
        l2Ttl: 1000 * 60 * 2,                           // L2 2分钟
        skipL3: true                                     // 跳过L3
      }
    };

    // 初始化各级缓存
    this.caches = {};
    this.initCaches();

    // 初始化分析系统
    if (this.config.analytics.enabled) {
      this.analytics = new CacheAnalytics(this.config.analytics);
    }

    // 启动维护任务
    this.startMaintenanceTasks();
  }

  /**
   * 初始化各级缓存
   */
  async initCaches() {
    try {
      // 初始化L1应用内存缓存
      this.caches.l1 = new LRUCache({
        max: this.config.l1.maxSize,
        ttl: this.config.l1.ttl,
        updateAgeOnGet: this.config.l1.updateAgeOnGet,
        dispose: (value, key) => {
          // L1淘汰时的回调
          this.emit('l1:evicted', { key, value });

          // 热点数据回写L2
          if (value.accessCount >= this.strategies.hotData.threshold) {
            this.setL2(key, value);
          }
        }
      });

      // 初始化L2 Redis集群
      await this.initL2Cluster();

      // 初始化L3 CDN边缘缓存
      if (this.config.l3.enabled) {
        this.caches.l3 = new CDNHelper(this.config.l3);
      }

      logger.info('增强版多级缓存系统初始化完成', {
        architecture: this.cacheArchitecture,
        l1Size: this.config.l1.maxSize,
        l2Cluster: this.config.l2.cluster.nodes.length,
        l3Enabled: this.config.l3.enabled
      });

      this.emit('initialized');

    } catch (error) {
      logger.error('多级缓存初始化失败', error);
      throw error;
    }
  }

  /**
   * 初始化L2 Redis集群
   */
  async initL2Cluster() {
    try {
      // 尝试使用集群模式
      if (this.config.l2.cluster.nodes.length > 1) {
        this.caches.l2 = new Redis.Cluster(
          this.config.l2.cluster.nodes,
          this.config.l2.cluster.options
        );

        this.caches.l2.on('connect', () => {
          logger.info('Redis集群连接成功');
          this.stats.l2.clusterStatus = 'connected';
          this.emit('l2:connected');
        });

        this.caches.l2.on('error', (err) => {
          logger.error('Redis集群连接错误', err);
          this.stats.l2.clusterStatus = 'error';
          this.stats.l2.errors++;
          this.emit('l2:error', err);
        });

        this.caches.l2.on('node error', (err, node) => {
          logger.error('Redis集群节点错误', { node: node.options.host + ':' + node.options.port, error: err.message });
        });

        // 集群健康检查
        this.startL2HealthCheck();

      } else {
        // 单Redis实例
        const standaloneConfig = this.config.l2.standalone;
        this.caches.l2 = new Redis({
          host: standaloneConfig.host,
          port: standaloneConfig.port,
          password: standaloneConfig.password,
          db: standaloneConfig.db,
          keyPrefix: this.config.l2.keyPrefix,
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 100
        });

        this.caches.l2.on('connect', () => {
          logger.info('Redis单实例连接成功');
          this.stats.l2.clusterStatus = 'connected';
          this.emit('l2:connected');
        });
      }

      // 测试连接
      await this.caches.l2.ping();

    } catch (error) {
      logger.error('L2 Redis初始化失败', error);
      // 备用方案：降级到仅L1缓存
      this.caches.l2 = null;
      this.stats.l2.clusterStatus = 'failed';
    }
  }

  /**
   * 获取缓存 - 增强版
   * @param {string} key - 缓存键
   * @param {Object} options - 选项
   * @returns {Promise} 缓存值
   */
  async get(key, options = {}) {
    const startTime = Date.now();
    this.stats.total.requests++;

    try {
      // 检查是否为实时数据
      const isRealtime = this.isRealtimeData(key);

      // L1 查询
      if (!this.shouldSkipL1(key, options)) {
        const l1Value = this.caches.l1.get(key);
        if (l1Value !== undefined) {
          this.updateL1Stats(l1Value, startTime);
          this.stats.l1.hits++;
          return this.deserializeValue(l1Value);
        }
        this.stats.l1.misses++;
      }

      // L2 Redis查询
      if (this.caches.l2 && !isRealtime) {
        try {
          const l2Value = await this.caches.l2.get(key);
          if (l2Value !== null) {
            const value = this.deserializeValue(JSON.parse(l2Value));

            // 回填L1（如果适合）
            if (this.shouldCacheInL1(key, value)) {
              this.setL1(key, value, options);
            }

            this.stats.l2.hits++;
            return value;
          }
          this.stats.l2.misses++;
        } catch (error) {
          logger.error('L2缓存查询失败', { key, error: error.message });
          this.stats.l2.errors++;
        }
      }

      // L3 CDN边缘缓存查询
      if (this.config.l3.enabled && this.caches.l3 && this.shouldUseCDN(key)) {
        try {
          const l3Value = await this.caches.l3.get(key);
          if (l3Value !== null) {
            // 回填L1和L2
            if (this.shouldCacheInL1(key, l3Value)) {
              this.setL1(key, l3Value, options);
            }
            if (this.caches.l2 && !isRealtime) {
              await this.setL2(key, l3Value);
            }

            this.stats.l3.hits++;
            return l3Value;
          }
          this.stats.l3.misses++;
        } catch (error) {
          logger.error('L3 CDN缓存查询失败', { key, error: error.message });
          this.stats.l3.errors++;
        }
      }

      // 缓存未命中
      this.stats.total.responses++;
      return null;

    } catch (error) {
      this.stats.total.errors++;
      logger.error('获取缓存失败', { key, error: error.message });
      return null;
    }
  }

  /**
   * 设置缓存 - 增强版
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {Object} options - 选项
   */
  async set(key, value, options = {}) {
    try {
      const startTime = Date.now();

      // 数据大小检查
      const dataSize = this.calculateDataSize(value);

      // 应用缓存策略
      const strategy = this.getCacheStrategy(key, value, dataSize);

      // L1 缓存
      if (strategy.cacheInL1) {
        this.setL1(key, value, strategy.l1Options);
      }

      // L2 Redis缓存
      if (this.caches.l2 && strategy.cacheInL2) {
        await this.setL2(key, value, strategy.l2Options);
      }

      // L3 CDN缓存
      if (this.config.l3.enabled && strategy.cacheInL3) {
        await this.setL3(key, value, strategy.l3Options);
      }

      // 更新统计
      this.updateSetStats(key, value, dataSize, Date.now() - startTime);

      // 发送事件
      this.emit('cache:set', { key, strategy, dataSize });

      return true;

    } catch (error) {
      logger.error('设置缓存失败', { key, error: error.message });
      this.stats.total.errors++;
      return false;
    }
  }

  /**
   * 智能预热策略
   * @param {Array} warmupItems - 预热项目
   */
  async intelligentWarmup(warmupItems = []) {
    logger.info('开始智能缓存预热', { count: warmupItems.length });

    // 分析预热项目优先级
    const prioritizedItems = this.prioritizeWarmupItems(warmupItems);

    // 分批预热
    const batchSize = 10;
    const batches = this.chunkArray(prioritizedItems, batchSize);

    for (const batch of batches) {
      const promises = batch.map(async (item) => {
        try {
          const { key, loader, priority } = item;

          // 并行加载到各级缓存
          const value = await loader();
          if (value !== null) {
            await Promise.all([
              this.setL1(key, value),
              this.caches.l2 ? this.setL2(key, value) : Promise.resolve(),
              this.config.l3.enabled ? this.setL3(key, value) : Promise.resolve()
            ]);
          }

          logger.debug('预热项目完成', { key, priority });

        } catch (error) {
          logger.warn('预热项目失败', { key: item.key, error: error.message });
        }
      });

      await Promise.allSettled(promises);

      // 防止过载，批次间暂停
      await this.sleep(100);
    }

    logger.info('智能缓存预热完成');
    this.emit('warmup:completed');
  }

  /**
   * 缓存失效策略
   * @param {string} pattern - 失效模式
   * @param {Object} options - 选项
   */
  async invalidate(pattern, options = {}) {
    const { levels = ['l1', 'l2', 'l3'], reason = 'manual' } = options;

    logger.info('开始缓存失效', { pattern, levels, reason });

    try {
      const results = {};

      // L1失效
      if (levels.includes('l1')) {
        const l1Keys = Array.from(this.caches.l1.keys()).filter(key =>
          key.includes(pattern) || new RegExp(pattern).test(key)
        );

        l1Keys.forEach(key => this.caches.l1.delete(key));
        results.l1 = { deleted: l1Keys.length };
      }

      // L2失效
      if (levels.includes('l2') && this.caches.l2) {
        const l2Keys = await this.caches.l2.keys(`${this.config.l2.keyPrefix}*${pattern}*`);
        if (l2Keys.length > 0) {
          await this.caches.l2.del(...l2Keys);
          results.l2 = { deleted: l2Keys.length };
        }
      }

      // L3失效
      if (levels.includes('l3') && this.config.l3.enabled) {
        results.l3 = await this.caches.l3.invalidate(pattern);
      }

      this.emit('cache:invalidated', { pattern, levels, results });

      logger.info('缓存失效完成', results);
      return results;

    } catch (error) {
      logger.error('缓存失效失败', { pattern, error: error.message });
      throw error;
    }
  }

  /**
   * 获取缓存统计报告
   * @returns {Object} 详细统计报告
   */
  getAnalyticsReport() {
    const now = Date.now();
    const totalRequests = this.stats.total.requests;
    const totalHits = this.stats.l1.hits + this.stats.l2.hits + this.stats.l3.hits;
    const hitRate = totalRequests > 0 ? (totalHits / totalRequests * 100).toFixed(2) : 0;

    return {
      timestamp: now,
      architecture: this.cacheArchitecture,
      performance: {
        hitRate: `${hitRate}%`,
        totalRequests,
        totalHits,
        l1HitRate: totalRequests > 0 ? (this.stats.l1.hits / totalRequests * 100).toFixed(2) : 0,
        l2HitRate: totalRequests > 0 ? (this.stats.l2.hits / totalRequests * 100).toFixed(2) : 0,
        l3HitRate: totalRequests > 0 ? (this.stats.l3.hits / totalRequests * 100).toFixed(2) : 0,
        avgLoadTime: this.stats.l1.avgLoadTime
      },
      cacheStatus: {
        l1: {
          size: this.caches.l1.size,
          maxSize: this.config.l1.maxSize,
          utilization: `${(this.caches.l1.size / this.config.l1.maxSize * 100).toFixed(2)}%`
        },
        l2: {
          clusterStatus: this.stats.l2.clusterStatus,
          connected: this.caches.l2 ? this.caches.l2.status === 'ready' : false
        },
        l3: {
          enabled: this.config.l3.enabled,
          edgeHits: this.stats.l3.edgeHits
        }
      },
      errors: {
        total: this.stats.total.errors,
        l1: this.stats.l1.errors,
        l2: this.stats.l2.errors,
        l3: this.stats.l3.errors
      }
    };
  }

  // 私有方法

  /**
   * 判断是否应该跳过L1缓存
   */
  shouldSkipL1(key, options) {
    if (options.skipL1) return true;

    const dataSize = this.getDataSize(key);
    return dataSize >= this.strategies.bigData.threshold;
  }

  /**
   * 判断是否应该使用CDN
   */
  shouldUseCDN(key) {
    // 静态资源和大文件优先使用CDN
    return key.includes('static') || key.includes('images') ||
           key.includes('documents') || this.getDataSize(key) > 512 * 1024; // 512KB
  }

  /**
   * 判断是否为实时数据
   */
  isRealtimeData(key) {
    return this.strategies.realtimeData.patterns.some(pattern =>
      pattern instanceof RegExp ? pattern.test(key) : key.includes(pattern)
    );
  }

  /**
   * 获取缓存策略
   */
  getCacheStrategy(key, value, dataSize) {
    const strategy = {
      cacheInL1: true,
      cacheInL2: true,
      cacheInL3: true,
      l1Options: {},
      l2Options: {},
      l3Options: {}
    };

    // 实时数据策略
    if (this.isRealtimeData(key)) {
      strategy.l1Options.ttl = this.strategies.realtimeData.l1Ttl;
      strategy.l2Options.ttl = this.strategies.realtimeData.l2Ttl;
      strategy.cacheInL3 = false;
    }

    // 大数据策略
    if (dataSize >= this.strategies.bigData.threshold) {
      strategy.cacheInL1 = false;
      strategy.l2Options.compress = true;
      strategy.cacheInL3 = true;
      strategy.l3Options.edgeOnly = true;
    }

    // 热点数据策略
    if (value.accessCount >= this.strategies.hotData.threshold) {
      strategy.l1Options.ttl = this.config.l1.ttl * this.strategies.hotData.l1Multiplier;
    }

    return strategy;
  }

  /**
   * 启动L2健康检查
   */
  startL2HealthCheck() {
    setInterval(async () => {
      try {
        if (this.caches.l2) {
          const result = await this.caches.l2.ping();
          this.stats.l2.clusterStatus = 'healthy';
        }
      } catch (error) {
        this.stats.l2.clusterStatus = 'unhealthy';
        logger.warn('L2健康检查失败', error.message);
      }
    }, 30000); // 30秒检查一次
  }

  /**
   * 启动维护任务
   */
  startMaintenanceTasks() {
    // 统计报告
    if (this.config.analytics.enabled) {
      setInterval(() => {
        this.emit('analytics:report', this.getAnalyticsReport());
      }, this.config.analytics.reportInterval);
    }

    // L1缓存清理
    setInterval(() => {
      this.cleanupL1();
    }, 1000 * 60 * 10); // 10分钟

    // L2连接检查
    setInterval(() => {
      this.checkL2Connection();
    }, 1000 * 60 * 5); // 5分钟
  }

  /**
   * 计算数据大小
   */
  calculateDataSize(value) {
    return JSON.stringify(value).length * 2; // 粗略估算
  }

  /**
   * 序列化值
   */
  serializeValue(value) {
    return {
      data: value,
      timestamp: Date.now(),
      accessCount: 0
    };
  }

  /**
   * 反序列化值
   */
  deserializeValue(serialized) {
    if (serialized && serialized.data !== undefined) {
      return serialized.data;
    }
    return serialized;
  }

  /**
   * 工具方法
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 其他辅助方法...
  setL1(key, value, options = {}) {
    const serializedValue = this.serializeValue(value);
    this.caches.l1.set(key, serializedValue, options);
  }

  async setL2(key, value, options = {}) {
    if (!this.caches.l2) return;

    const serializedValue = JSON.stringify(this.serializeValue(value));
    const ttl = options.ttl || this.config.l2.ttl;

    if (ttl > 0) {
      await this.caches.l2.setex(key, Math.floor(ttl / 1000), serializedValue);
    } else {
      await this.caches.l2.set(key, serializedValue);
    }
  }

  async setL3(key, value, options = {}) {
    if (!this.config.l3.enabled || !this.caches.l3) return;

    await this.caches.l3.set(key, value, options);
  }

  shouldCacheInL1(key, value) {
    const dataSize = this.calculateDataSize(value);
    return dataSize < this.strategies.bigData.threshold;
  }

  updateL1Stats(value, startTime) {
    const loadTime = Date.now() - startTime;
    value.accessCount = (value.accessCount || 0) + 1;

    // 更新平均加载时间
    this.stats.l1.avgLoadTime =
      (this.stats.l1.avgLoadTime + loadTime) / 2;
  }

  updateSetStats(key, value, dataSize, duration) {
    this.stats.total.responses++;
    this.stats.total.bandwidth += dataSize;
  }

  cleanupL1() {
    // L1会自动清理，这里可以添加额外逻辑
  }

  checkL2Connection() {
    if (!this.caches.l2) return;

    // 连接检查逻辑
    if (this.caches.l2.status !== 'ready') {
      logger.warn('L2连接异常，尝试重连');
    }
  }

  prioritizeWarmupItems(items) {
    // 根据访问频率、大小等指标排序
    return items.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  getDataSize(key) {
    // 获取数据大小的方法
    return 0;
  }
}

// 单例模式
const enhancedMultiLevelCache = new EnhancedMultiLevelCache();

module.exports = enhancedMultiLevelCache;