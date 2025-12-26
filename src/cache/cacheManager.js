/**
 * 智慧乡村缓存管理器
 * 统一管理多级缓存系统，提供高级缓存功能
 */

const EnhancedMultiLevelCache = require('./enhancedMultiLevelCache');
const CacheStrategyOptimizer = require('./cacheStrategyOptimizer');
const CacheAnalytics = require('./cacheAnalytics');
const { EventEmitter } = require('events');
const logger = require('../utils/logger');

class SmartVillageCacheManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = {
      // 缓存管理配置
      enabled: options.enabled !== false,
      defaultTtl: options.defaultTtl || 1000 * 60 * 30,        // 30分钟
      analytics: options.analytics !== false,
      autoOptimization: options.autoOptimization !== false,
      optimizationInterval: options.optimizationInterval || 1000 * 60 * 10, // 10分钟

      // 业务相关配置
      villageTtl: options.villageTtl || 1000 * 60 * 60 * 2,    // 村庄信息2小时
      announcementTtl: options.announcementTtl || 1000 * 60 * 15, // 公告15分钟
      policyTtl: options.policyTtl || 1000 * 60 * 60 * 24,     // 政策24小时
      emergencyTtl: options.emergencyTtl || 1000 * 60,          // 紧急信息1分钟

      // 特殊处理配置
      compressionThreshold: options.compressionThreshold || 1024 * 10, // 10KB以上压缩
      encryptionEnabled: options.encryptionEnabled || false,
      cacheKeyPrefix: options.cacheKeyPrefix || 'sv:',

      // 性能配置
      maxConcurrentOperations: options.maxConcurrentOperations || 100,
      operationTimeout: options.operationTimeout || 5000,
      circuitBreakerThreshold: options.circuitBreakerThreshold || 10
    };

    // 初始化组件
    this.multiLevelCache = new EnhancedMultiLevelCache(options);
    this.strategyOptimizer = new CacheStrategyOptimizer(options);
    this.analytics = this.config.analytics ? new CacheAnalytics(options) : null;

    // 业务缓存规则
    this.businessRules = {
      // 村庄信息缓存
      village: {
        ttl: this.config.villageTtl,
        strategy: 'high_frequency',
        preload: true,
        dependencies: ['village_residents', 'village_announcements']
      },

      // 公告信息缓存
      announcement: {
        ttl: this.config.announcementTtl,
        strategy: 'medium_frequency',
        invalidateOn: ['new_announcement', 'announcement_update']
      },

      // 政策信息缓存
      policy: {
        ttl: this.config.policyTtl,
        strategy: 'low_frequency',
        compression: true,
        versioning: true
      },

      // 紧急信息缓存
      emergency: {
        ttl: this.config.emergencyTtl,
        strategy: 'realtime',
        broadcast: true,
        priority: 'critical'
      },

      // 用户信息缓存
      user: {
        ttl: 1000 * 60 * 30,
        strategy: 'medium_frequency',
        encryption: this.config.encryptionEnabled,
        gdprCompliant: true
      },

      // 静态资源缓存
      static: {
        ttl: 1000 * 60 * 60 * 24 * 7,
        strategy: 'static_resource',
        cdnOnly: true,
        compression: true
      }
    };

    // 性能监控
    this.performanceMetrics = {
      operations: 0,
      successRate: 0,
      avgResponseTime: 0,
      errors: 0,
      cacheHitRate: 0
    };

    // 操作队列
    this.operationQueue = [];
    this.processingOperations = 0;

    // 熔断器状态
    this.circuitBreaker = {
      failures: 0,
      lastFailure: 0,
      state: 'closed' // closed, open, half-open
    };

    // 启动后台任务
    this.startBackgroundTasks();
  }

  /**
   * 智能获取缓存
   * @param {string} type - 业务类型
   * @param {string} key - 缓存键
   * @param {Object} options - 选项
   * @returns {Promise} 缓存值
   */
  async smartGet(type, key, options = {}) {
    const startTime = Date.now();
    const fullKey = this.buildCacheKey(type, key);

    try {
      // 检查熔断器
      if (this.isCircuitBreakerOpen()) {
        throw new Error('Circuit breaker is open');
      }

      // 记录操作
      this.recordOperation('get', type, key);

      // 应用业务规则
      const businessRule = this.businessRules[type] || {};
      const enhancedOptions = { ...businessRule, ...options };

      // 获取数据
      const value = await this.multiLevelCache.get(fullKey, enhancedOptions);

      // 记录访问模式
      this.strategyOptimizer.recordAccess(fullKey, {
        type,
        hit: value !== null,
        responseTime: Date.now() - startTime,
        size: this.calculateSize(value)
      });

      // 更新性能指标
      this.updatePerformanceMetrics('get', true, Date.now() - startTime);

      this.emit('cache:get', { type, key, hit: value !== null });
      return value;

    } catch (error) {
      this.handleOperationError('get', error, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * 智能设置缓存
   * @param {string} type - 业务类型
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {Object} options - 选项
   * @returns {Promise} 设置结果
   */
  async smartSet(type, key, value, options = {}) {
    const startTime = Date.now();
    const fullKey = this.buildCacheKey(type, key);

    try {
      // 检查熔断器
      if (this.isCircuitBreakerOpen()) {
        throw new Error('Circuit breaker is open');
      }

      // 记录操作
      this.recordOperation('set', type, key);

      // 应用业务规则
      const businessRule = this.businessRules[type] || {};
      const optimizedStrategy = this.strategyOptimizer.getOptimizedStrategy(fullKey, {
        type,
        size: this.calculateSize(value)
      });

      const enhancedOptions = {
        ...businessRule,
        ...options,
        ...optimizedStrategy
      };

      // 数据处理
      const processedValue = await this.processValueForStorage(value, type, enhancedOptions);

      // 设置缓存
      const result = await this.multiLevelCache.set(fullKey, processedValue, enhancedOptions);

      // 更新性能指标
      this.updatePerformanceMetrics('set', result, Date.now() - startTime);

      // 处理依赖关系
      if (result && businessRule.dependencies) {
        await this.handleDependencies(type, key, businessRule.dependencies);
      }

      this.emit('cache:set', { type, key, success: result });
      return result;

    } catch (error) {
      this.handleOperationError('set', error, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * 批量获取缓存
   * @param {Array} requests - 请求列表 [{type, key, options}]
   * @returns {Promise} 结果数组
   */
  async smartMget(requests) {
    const startTime = Date.now();
    const results = [];

    try {
      // 分批处理
      const batches = this.chunkArray(requests, 10);
      for (const batch of batches) {
        const batchPromises = batch.map(async (request) => {
          try {
            const value = await this.smartGet(request.type, request.key, request.options);
            return { request, value, success: true };
          } catch (error) {
            return { request, error: error.message, success: false };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults.map(r => r.value));
      }

      this.updatePerformanceMetrics('mget', true, Date.now() - startTime);
      return results;

    } catch (error) {
      this.handleOperationError('mget', error, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * 智能失效缓存
   * @param {string} type - 业务类型
   * @param {string} pattern - 失效模式
   * @param {Object} options - 选项
   * @returns {Promise} 失效结果
   */
  async smartInvalidate(type, pattern, options = {}) {
    const startTime = Date.now();

    try {
      const businessRule = this.businessRules[type] || {};
      const fullPattern = this.buildCacheKey(type, pattern);

      // 执行失效
      const result = await this.multiLevelCache.invalidate(fullPattern, options);

      // 处理相关失效
      if (businessRule.invalidateOn) {
        for (const trigger of businessRule.invalidateOn) {
          await this.triggerInvalidation(type, trigger);
        }
      }

      // 广播失效事件
      if (businessRule.broadcast) {
        this.broadcastInvalidation(type, pattern);
      }

      this.updatePerformanceMetrics('invalidate', true, Date.now() - startTime);
      this.emit('cache:invalidated', { type, pattern, result });

      return result;

    } catch (error) {
      this.handleOperationError('invalidate', error, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * 预热缓存
   * @param {Array} warmupItems - 预热项目
   * @returns {Promise} 预热结果
   */
  async warmupCache(warmupItems = []) {
    logger.info('开始缓存预热', { count: warmupItems.length });

    // 准备预热数据
    const preparedItems = warmupItems.map(item => ({
      key: this.buildCacheKey(item.type, item.key),
      loader: item.loader,
      priority: item.priority || 0
    }));

    // 执行智能预热
    const result = await this.multiLevelCache.intelligentWarmup(preparedItems);

    // 更新统计
    this.analytics?.recordWarmup({
      items: warmupItems.length,
      success: result.success || warmupItems.length
    });

    logger.info('缓存预热完成', result);
    return result;
  }

  /**
   * 获取缓存管理报告
   * @returns {Object} 详细报告
   */
  getComprehensiveReport() {
    const multiLevelReport = this.multiLevelCache.getAnalyticsReport();
    const optimizerReport = this.strategyOptimizer.getPerformanceReport();
    const hotData = this.strategyOptimizer.getHotData(20);
    const coldData = this.strategyOptimizer.getColdData(20);

    return {
      timestamp: Date.now(),
      cacheArchitecture: {
        L1: 'application_cache',
        L2: 'redis_cluster',
        L3: 'cdn_edge_cache'
      },
      performance: {
        ...this.performanceMetrics,
        multiLevel: multiLevelReport.performance
      },
      business: {
        rules: Object.keys(this.businessRules).length,
        hotData: hotData.length,
        coldData: coldData.length
      },
      optimization: {
        strategyOptimizer: optimizerReport,
        recommendations: optimizerReport.recommendations
      },
      health: {
        circuitBreaker: this.circuitBreaker.state,
        errors: this.performanceMetrics.errors,
        successRate: `${(this.performanceMetrics.successRate * 100).toFixed(2)}%`
      }
    };
  }

  /**
   * 动态更新业务规则
   * @param {string} type - 业务类型
   * @param {Object} rule - 新规则
   */
  updateBusinessRule(type, rule) {
    this.businessRules[type] = { ...this.businessRules[type], ...rule };
    logger.info('业务规则已更新', { type, rule });

    this.emit('rule:updated', { type, rule });
  }

  /**
   * 缓存健康检查
   * @returns {Object} 健康状态
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      checks: {},
      timestamp: Date.now()
    };

    try {
      // L1缓存检查
      health.checks.l1 = {
        status: 'healthy',
        size: this.multiLevelCache.caches?.l1?.size || 0,
        maxSize: this.multiLevelCache.config?.l1?.maxSize || 0
      };

      // L2缓存检查
      if (this.multiLevelCache.caches?.l2) {
        try {
          await this.multiLevelCache.caches.l2.ping();
          health.checks.l2 = {
            status: 'healthy',
            clusterStatus: this.multiLevelCache.stats.l2.clusterStatus
          };
        } catch (error) {
          health.checks.l2 = {
            status: 'unhealthy',
            error: error.message
          };
          health.status = 'degraded';
        }
      }

      // L3缓存检查
      if (this.multiLevelCache.config?.l3?.enabled) {
        health.checks.l3 = {
          status: 'healthy',
          provider: this.multiLevelCache.config.l3.provider,
          edgeHits: this.multiLevelCache.stats.l3.edgeHits
        };
      }

      // 策略优化器检查
      health.checks.optimizer = {
        status: 'healthy',
        patterns: this.strategyOptimizer.accessPatterns.size,
        accuracy: this.strategyOptimizer.mlModel.accuracy
      };

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }

  // 私有方法

  /**
   * 构建缓存键
   */
  buildCacheKey(type, key) {
    return `${this.config.cacheKeyPrefix}${type}:${key}`;
  }

  /**
   * 处理存储值
   */
  async processValueForStorage(value, type, options) {
    let processedValue = value;

    // 压缩
    if (options.compression && this.calculateSize(value) > this.config.compressionThreshold) {
      processedValue = await this.compressValue(value);
    }

    // 加密
    if (options.encryption && this.config.encryptionEnabled) {
      processedValue = await this.encryptValue(processedValue);
    }

    // 版本控制
    if (options.versioning) {
      processedValue = {
        version: Date.now(),
        data: processedValue
      };
    }

    return processedValue;
  }

  /**
   * 记录操作
   */
  recordOperation(operation, type, key) {
    if (this.processingOperations >= this.config.maxConcurrentOperations) {
      throw new Error('Too many concurrent operations');
    }

    this.processingOperations++;
    this.performanceMetrics.operations++;
  }

  /**
   * 更新性能指标
   */
  updatePerformanceMetrics(operation, success, responseTime) {
    this.processingOperations = Math.max(0, this.processingOperations - 1);

    // 更新平均响应时间
    this.performanceMetrics.avgResponseTime =
      (this.performanceMetrics.avgResponseTime + responseTime) / 2;

    // 更新成功率
    const totalSuccess = success ? 1 : 0;
    this.performanceMetrics.successRate =
      (this.performanceMetrics.successRate * 0.9) + (totalSuccess * 0.1);

    // 更新错误计数
    if (!success) {
      this.performanceMetrics.errors++;
    }
  }

  /**
   * 处理操作错误
   */
  handleOperationError(operation, error, responseTime) {
    this.processingOperations = Math.max(0, this.processingOperations - 1);
    this.updatePerformanceMetrics(operation, false, responseTime);

    // 更新熔断器
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailure = Date.now();

    if (this.circuitBreaker.failures >= this.config.circuitBreakerThreshold) {
      this.circuitBreaker.state = 'open';
      logger.warn('熔断器已打开', { operation, error: error.message });
    }

    logger.error('缓存操作失败', { operation, error: error.message });
    this.emit('cache:error', { operation, error });
  }

  /**
   * 检查熔断器是否开启
   */
  isCircuitBreakerOpen() {
    if (this.circuitBreaker.state === 'open') {
      // 5秒后尝试半开状态
      if (Date.now() - this.circuitBreaker.lastFailure > 5000) {
        this.circuitBreaker.state = 'half-open';
        return false;
      }
      return true;
    }

    if (this.circuitBreaker.state === 'half-open') {
      // 半开状态下允许少量请求通过
      return Math.random() < 0.5;
    }

    return false;
  }

  /**
   * 处理依赖关系
   */
  async handleDependencies(type, key, dependencies) {
    for (const dependency of dependencies) {
      // 失效相关缓存
      await this.smartInvalidate(dependency, `*${key}*`);
    }
  }

  /**
   * 触发失效
   */
  async triggerInvalidation(type, trigger) {
    // 根据触发器执行相应的失效逻辑
    logger.debug('触发缓存失效', { type, trigger });
  }

  /**
   * 广播失效事件
   */
  broadcastInvalidation(type, pattern) {
    // 通过WebSocket或消息队列广播失效事件
    this.emit('broadcast:invalidation', { type, pattern });
  }

  /**
   * 计算数据大小
   */
  calculateSize(value) {
    if (!value) return 0;
    return JSON.stringify(value).length * 2; // 粗略估算
  }

  /**
   * 压缩值
   */
  async compressValue(value) {
    // 实现压缩逻辑
    return value; // 简化实现
  }

  /**
   * 加密值
   */
  async encryptValue(value) {
    // 实现加密逻辑
    return value; // 简化实现
  }

  /**
   * 分块数组
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 启动后台任务
   */
  startBackgroundTasks() {
    // 定期优化任务
    if (this.config.autoOptimization) {
      setInterval(() => {
        this.strategyOptimizer.optimizeAllStrategies();
      }, this.config.optimizationInterval);
    }

    // 定期健康检查
    setInterval(async () => {
      const health = await this.healthCheck();
      this.emit('health:check', health);

      if (health.status !== 'healthy') {
        logger.warn('缓存健康检查异常', health);
      }
    }, 1000 * 60 * 5); // 5分钟检查一次

    // 定期报告生成
    if (this.config.analytics) {
      setInterval(() => {
        const report = this.getComprehensiveReport();
        this.emit('analytics:report', report);
      }, 1000 * 60 * 15); // 15分钟生成一次报告
    }
  }

  /**
   * 关闭缓存管理器
   */
  async shutdown() {
    logger.info('关闭缓存管理器');

    // 关闭多级缓存
    await this.multiLevelCache.close();

    // 清理资源
    this.removeAllListeners();

    logger.info('缓存管理器已关闭');
  }
}

// 单例模式
const smartVillageCacheManager = new SmartVillageCacheManager();

module.exports = smartVillageCacheManager;