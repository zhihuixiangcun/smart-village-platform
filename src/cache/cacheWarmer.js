/**
 * 缓存预热器
 * 实现智能缓存预热和热点数据识别
 */

const EventEmitter = require('events');
const { performance } = require('perf_hooks');
const multiLevelCache = require('./multiLevelCache');
const smartCache = require('./smartCache');
const { CacheUtil } = require('../../utils/cache');
const logger = require('../utils/logger');

class CacheWarmer extends EventEmitter {
  constructor() {
    super();

    // 预热配置
    this.config = {
      // 预热策略
      strategy: process.env.CACHE_WARMER_STRATEGY || 'intelligent', // 'aggressive', 'conservative', 'intelligent'
      // 预热深度
      depth: parseInt(process.env.CACHE_WARMER_DEPTH) || 3,
      // 并发数
      concurrency: parseInt(process.env.CACHE_WARMER_CONCURRENCY) || 10,
      // 预热间隔（小时）
      interval: parseInt(process.env.CACHE_WARMER_INTERVAL) || 6,
      // 单次预热限制
      limit: parseInt(process.env.CACHE_WARMER_LIMIT) || 1000,
      // 热点数据阈值
      hotThreshold: parseInt(process.env.CACHE_WARMER_HOT_THRESHOLD) || 10
    };

    // 预热任务队列
    this.warmupQueue = [];
    this.isWarming = false;

    // 热点数据模式
    this.hotPatterns = new Map();

    // 预热统计
    this.stats = {
      totalWarmed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      lastRun: null
    };

    // 数据源
    this.dataSources = new Map();

    // 启动定时预热
    this.startScheduledWarmup();
  }

  /**
   * 注册数据源
   * @param {string} name - 数据源名称
   * @param {Function} fetchFn - 获取数据的函数
   * @param {Object} options - 选项
   */
  registerDataSource(name, fetchFn, options = {}) {
    this.dataSources.set(name, {
      fetchFn,
      priority: options.priority || 1,
      dependencies: options.dependencies || [],
      ttl: options.ttl || 3600,
      batchSize: options.batchSize || 100,
      enabled: options.enabled !== false
    });

    logger.debug('注册数据源', { name, priority: options.priority });
  }

  /**
   * 执行缓存预热
   * @param {Object} options - 预热选项
   */
  async warmupCache(options = {}) {
    if (this.isWarming) {
      logger.warn('缓存预热正在进行中，跳过本次预热');
      return;
    }

    this.isWarming = true;
    const startTime = performance.now();

    try {
      logger.info('开始缓存预热', {
        strategy: this.config.strategy,
        depth: this.config.depth,
        limit: this.config.limit
      });

      // 重置统计
      this.resetStats();

      // 根据策略执行预热
      switch (this.config.strategy) {
        case 'aggressive':
          await this.aggressiveWarmup(options);
          break;
        case 'conservative':
          await this.conservativeWarmup(options);
          break;
        case 'intelligent':
          await this.intelligentWarmup(options);
          break;
        default:
          await this.intelligentWarmup(options);
      }

      const duration = performance.now() - startTime;
      this.stats.duration = duration;
      this.stats.lastRun = new Date();

      logger.info('缓存预热完成', {
        total: this.stats.totalWarmed,
        successful: this.stats.successful,
        failed: this.stats.failed,
        skipped: this.stats.skipped,
        duration: `${duration.toFixed(2)}ms`
      });

      this.emit('warmupComplete', {
        stats: this.stats,
        duration
      });

    } catch (error) {
      logger.error('缓存预热失败', error);
      this.emit('warmupError', error);
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * 激进式预热（预热所有可能的数据）
   */
  async aggressiveWarmup(options) {
    logger.info('执行激进式缓存预热');

    const dataSources = Array.from(this.dataSources.entries())
      .filter(([_, source]) => source.enabled)
      .sort(([_, a], [__, b]) => b.priority - a.priority);

    for (const [name, source] of dataSources) {
      try {
        await this.warmupDataSource(name, source, {
          depth: this.config.depth,
          limit: this.config.limit,
          aggressive: true
        });
      } catch (error) {
        logger.error(`预热数据源 ${name} 失败`, error);
        this.stats.failed++;
      }
    }
  }

  /**
   * 保守式预热（只预热核心数据）
   */
  async conservativeWarmup(options) {
    logger.info('执行保守式缓存预热');

    // 只预热高优先级数据源
    const highPrioritySources = Array.from(this.dataSources.entries())
      .filter(([_, source]) => source.enabled && source.priority >= 5)
      .sort(([_, a], [__, b]) => b.priority - a.priority)
      .slice(0, 5); // 最多预热5个高优先级数据源

    for (const [name, source] of highPrioritySources) {
      try {
        await this.warmupDataSource(name, source, {
          depth: Math.min(this.config.depth, 2),
          limit: Math.min(this.config.limit, 100),
          aggressive: false
        });
      } catch (error) {
        logger.error(`预热数据源 ${name} 失败`, error);
        this.stats.failed++;
      }
    }
  }

  /**
   * 智能式预热（基于访问模式预热）
   */
  async intelligentWarmup(options) {
    logger.info('执行智能式缓存预热');

    // 分析热点数据模式
    await this.analyzeHotPatterns();

    // 获取热点数据源
    const hotDataSources = this.getHotDataSources();

    // 并发预热热点数据
    const warmupPromises = hotDataSources.map(({ name, source, priority }) =>
      this.warmupDataSource(name, source, {
        depth: Math.min(this.config.depth, priority ? 3 : 2),
        limit: Math.min(this.config.limit, priority ? 500 : 100),
        aggressive: false,
        intelligent: true
      })
    );

    await this.executeConcurrently(warmupPromises, this.config.concurrency);
  }

  /**
   * 预热单个数据源
   * @param {string} name - 数据源名称
   * @param {Object} source - 数据源配置
   * @param {Object} options - 预热选项
   */
  async warmupDataSource(name, source, options = {}) {
    const { depth = 2, limit = 100, aggressive = false, intelligent = false } = options;

    logger.debug(`预热数据源: ${name}`, {
      depth,
      limit,
      aggressive,
      intelligent
    });

    try {
      // 预热依赖
      if (source.dependencies.length > 0) {
        for (const dep of source.dependencies) {
          const depSource = this.dataSources.get(dep);
          if (depSource) {
            await this.warmupDataSource(dep, depSource, {
              depth: depth - 1,
              limit: Math.min(limit / 2, 50)
            });
          }
        }
      }

      // 获取数据
      const data = await source.fetchFn({
        limit,
        depth,
        warmup: true,
        intelligent
      });

      if (!data || data.length === 0) {
        logger.debug(`数据源 ${name} 无数据可预热`);
        this.stats.skipped++;
        return;
      }

      // 处理数据
      const processedData = this.processDataForWarmup(data, {
        source: name,
        depth,
        intelligent
      });

      // 预热到缓存
      await this.preheatToCache(name, processedData, source.ttl);

      this.stats.totalWarmed += processedData.length;
      this.stats.successful++;

      logger.debug(`数据源 ${name} 预热完成`, {
        items: processedData.length,
        ttl: source.ttl
      });

    } catch (error) {
      logger.error(`预热数据源 ${name} 失败`, error);
      this.stats.failed++;
      throw error;
    }
  }

  /**
   * 处理预热数据
   * @param {Array} data - 原始数据
   * @param {Object} options - 处理选项
   * @returns {Array} 处理后的数据
   */
  processDataForWarmup(data, options) {
    const { source, depth, intelligent } = options;

    if (!Array.isArray(data)) {
      data = [data];
    }

    const processed = [];

    for (const item of data) {
      if (!item) continue;

      // 生成缓存键
      const cacheKey = this.generateCacheKey(source, item);

      // 评估数据热度
      const hotness = intelligent ? this.evaluateHotness(item, source) : 1;

      processed.push({
        key: cacheKey,
        data: item,
        hotness,
        source,
        depth
      });

      // 深度预热关联数据
      if (depth > 0 && item.relatedData) {
        const relatedData = this.processDataForWarmup(item.relatedData, {
          source: `${source}_related`,
          depth: depth - 1,
          intelligent
        });
        processed.push(...relatedData);
      }
    }

    return processed;
  }

  /**
   * 生成缓存键
   * @param {string} source - 数据源名称
   * @param {*} data - 数据项
   * @returns {string} 缓存键
   */
  generateCacheKey(source, data) {
    const id = data._id || data.id || data.code || 'unknown';
    return `${source}:${id}`;
  }

  /**
   * 评估数据热度
   * @param {*} data - 数据项
   * @param {string} source - 数据源名称
   * @returns {number} 热度值
   */
  evaluateHotness(data, source) {
    let hotness = 1;

    // 基于访问次数
    if (data.accessCount) {
      hotness += Math.log(data.accessCount + 1);
    }

    // 基于最近访问时间
    if (data.lastAccessed) {
      const hoursSinceAccess = (Date.now() - new Date(data.lastAccessed)) / (1000 * 60 * 60);
      hotness += Math.max(0, 24 - hoursSinceAccess) / 24;
    }

    // 基于数据源热度
    const sourceHotness = this.hotPatterns.get(source) || 0;
    hotness += sourceHotness * 0.5;

    // 基于数据重要性
    if (data.priority === 'high') {
      hotness += 2;
    } else if (data.priority === 'urgent') {
      hotness += 5;
    }

    return Math.round(hotness * 10) / 10;
  }

  /**
   * 预热到缓存
   * @param {string} source - 数据源名称
   * @param {Array} processedData - 处理后的数据
   * @param {number} ttl - 生存时间
   */
  async preheatToCache(source, processedData, ttl) {
    const cachePromises = processedData.map(({ key, data, hotness }) => {
      // 根据热度调整TTL
      const adjustedTtl = hotness > 2 ? ttl * 2 : ttl;

      return multiLevelCache.set(key, data, {
        l1Ttl: Math.min(adjustedTtl * 0.2, 600000), // L1最多10分钟
        l2Ttl: adjustedTtl,
        l3Ttl: adjustedTtl * 2,
        priority: hotness > this.config.hotThreshold ? 'high' : 'normal'
      });
    });

    await Promise.allSettled(cachePromises);
  }

  /**
   * 分析热点数据模式
   */
  async analyzeHotPatterns() {
    try {
      // 获取智能缓存的访问统计
      const report = smartCache.getReport();

      // 更新热点模式
      report.topHotKeys.forEach(({ key, frequency }) => {
        const source = key.split(':')[0];
        const currentPattern = this.hotPatterns.get(source) || 0;
        this.hotPatterns.set(source, currentPattern + frequency);
      });

      logger.debug('热点数据模式分析完成', {
        patterns: Object.fromEntries(this.hotPatterns)
      });

    } catch (error) {
      logger.warn('分析热点数据模式失败', error);
    }
  }

  /**
   * 获取热点数据源
   * @returns {Array} 热点数据源列表
   */
  getHotDataSources() {
    const sources = [];

    for (const [name, source] of this.dataSources.entries()) {
      if (!source.enabled) continue;

      const hotness = this.hotPatterns.get(name) || 0;
      const priority = source.priority;

      sources.push({
        name,
        source,
        hotness,
        priority: priority + hotness
      });
    }

    return sources.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 并发执行任务
   * @param {Array} promises - Promise数组
   * @param {number} concurrency - 并发数
   */
  async executeConcurrently(promises, concurrency = 10) {
    const results = [];
    const executing = [];

    for (const promise of promises) {
      const p = Promise.resolve(promise).then(result => {
        executing.splice(executing.indexOf(p), 1);
        return result;
      });

      results.push(p);

      if (promises.length >= concurrency) {
        executing.push(p);

        if (executing.length >= concurrency) {
          await Promise.race(executing);
        }
      }
    }

    return Promise.all(results);
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalWarmed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      lastRun: null
    };
  }

  /**
   * 启动定时预热
   */
  startScheduledWarmup() {
    const intervalMs = this.config.interval * 60 * 60 * 1000;

    setInterval(async () => {
      try {
        await this.warmupCache();
      } catch (error) {
        logger.error('定时缓存预热失败', error);
      }
    }, intervalMs);

    logger.info(`定时缓存预热已启动，间隔: ${this.config.interval}小时`);
  }

  /**
   * 手动预热特定数据
   * @param {string} key - 缓存键
   * @param {Function} fetchFn - 获取数据的函数
   * @param {Object} options - 选项
   */
  async warmupKey(key, fetchFn, options = {}) {
    try {
      const { ttl = 3600, priority = 'normal' } = options;

      // 检查缓存是否存在
      const exists = await multiLevelCache.get(key);
      if (exists) {
        logger.debug('缓存键已存在，跳过预热', { key });
        return;
      }

      // 获取数据
      const data = await fetchFn();

      // 预热到缓存
      await multiLevelCache.set(key, data, {
        l1Ttl: Math.min(ttl * 0.2, 600000),
        l2Ttl: ttl,
        l3Ttl: ttl * 2,
        priority
      });

      logger.debug('缓存键预热完成', { key, ttl });

    } catch (error) {
      logger.error('预热缓存键失败', { key, error: error.message });
      throw error;
    }
  }

  /**
   * 预热相关数据
   * @param {string} primaryKey - 主键
   * @param {Array} relatedKeys - 相关键列表
   * @param {Object} options - 选项
   */
  async warmupRelatedData(primaryKey, relatedKeys, options = {}) {
    const { concurrency = 5, ttl = 3600 } = options;

    logger.debug('预热相关数据', {
      primaryKey,
      relatedKeys: relatedKeys.length
    });

    const warmupPromises = relatedKeys.map(key =>
      this.warmupKey(key, async () => {
        // 这里应该有获取关联数据的逻辑
        // 简化处理，实际使用时需要传入获取函数
        return null;
      }, { ttl })
    );

    await this.executeConcurrently(warmupPromises, concurrency);
  }

  /**
   * 获取预热统计
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      isWarming: this.isWarming,
      config: this.config,
      dataSources: this.dataSources.size,
      hotPatterns: Object.fromEntries(this.hotPatterns)
    };
  }

  /**
   * 获取预热报告
   * @returns {Object} 预热报告
   */
  getWarmupReport() {
    const now = Date.now();
    const timeSinceLastRun = this.stats.lastRun ? now - this.stats.lastRun.getTime() : null;

    return {
      timestamp: new Date(),
      stats: this.stats,
      timeSinceLastRun,
      timeSinceLastRunFormatted: timeSinceLastRun ?
        `${Math.round(timeSinceLastRun / 60000)}分钟前` : '从未运行',
      config: this.config,
      dataSources: Array.from(this.dataSources.entries()).map(([name, source]) => ({
        name,
        priority: source.priority,
        enabled: source.enabled,
        dependencies: source.dependencies
      })),
      hotPatterns: Array.from(this.hotPatterns.entries())
        .map(([source, hotness]) => ({ source, hotness }))
        .sort((a, b) => b.hotness - a.hotness)
        .slice(0, 10)
    };
  }

  /**
   * 更新预热配置
   * @param {Object} newConfig - 新配置
   */
  updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    logger.info('预热配置已更新', {
      old: oldConfig,
      new: this.config
    });

    this.emit('configUpdated', { oldConfig, newConfig: this.config });
  }
}

// 单例模式
const cacheWarmer = new CacheWarmer();

module.exports = cacheWarmer;