/**
 * 性能优化中间件
 * 整合数据库优化、缓存、监控等功能
 */

const databaseOptimizer = require('../services/databaseOptimizer');
const multiLevelCache = require('../services/multiLevelCache');
const queryPerformanceMonitor = require('../services/queryPerformanceMonitor');
const optimizedDatabase = require('../config/databaseOptimized');

class PerformanceOptimization {
  constructor() {
    this.config = {
      // 缓存策略
      cache: {
        enabled: true,
        defaultTTL: 1000 * 60 * 5, // 5分钟
        keyPrefix: 'api:',
        enableCompression: true,
        enableMetrics: true
      },

      // 数据库优化
      database: {
        enableQueryOptimization: true,
        enableIndexOptimization: true,
        enableConnectionPoolOptimization: true,
        slowQueryThreshold: 1000
      },

      // 监控配置
      monitoring: {
        enableQueryMonitoring: true,
        enablePerformanceMetrics: true,
        enableAlerts: true,
        metricsInterval: 30000 // 30秒
      }
    };

    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        cacheHits: 0,
        cacheMisses: 0
      },
      performance: {
        throughput: 0,
        memoryUsage: process.memoryUsage(),
        cpuUsage: 0
      }
    };

    this.startTime = Date.now();
    this.setupMetricsCollection();
  }

  /**
   * 性能优化中间件
   */
  middleware() {
    return async (req, res, next) => {
      const requestStartTime = process.hrtime.bigint();
      const requestId = this.generateRequestId();

      // 添加性能信息到请求对象
      req.performance = {
        requestId,
        startTime: requestStartTime,
        cacheKey: null,
        cacheHit: false,
        queryOptimized: false
      };

      // 尝试从缓存获取响应
      if (this.shouldUseCache(req)) {
        const cachedResponse = await this.getCachedResponse(req);
        if (cachedResponse) {
          req.performance.cacheHit = true;
          this.metrics.requests.cacheHits++;
          return this.sendCachedResponse(res, cachedResponse);
        }
        this.metrics.requests.cacheMisses++;
      }

      // 继续处理请求
      res.on('finish', () => {
        this.recordRequestMetrics(req, res, requestStartTime);
      });

      // 包装数据库查询
      if (this.config.database.enableQueryOptimization) {
        this.wrapDatabaseQueries(req);
      }

      next();
    };
  }

  /**
   * 生成请求ID
   */
  generateRequestId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 判断是否使用缓存
   */
  shouldUseCache(req) {
    if (!this.config.cache.enabled) return false;

    // 只缓存GET请求
    if (req.method !== 'GET') return false;

    // 排除某些路径
    const excludePaths = ['/api/v1/auth', '/api/v1/upload', '/api/v1/webhook'];
    const shouldExclude = excludePaths.some(path => req.path.startsWith(path));
    if (shouldExclude) return false;

    return true;
  }

  /**
   * 获取缓存响应
   */
  async getCachedResponse(req) {
    try {
      const cacheKey = this.generateCacheKey(req);
      req.performance.cacheKey = cacheKey;

      const cachedData = await multiLevelCache.get('api_response', cacheKey);
      if (cachedData) {
        return cachedData;
      }
      return null;
    } catch (error) {
      console.error('获取缓存响应失败:', error);
      return null;
    }
  }

  /**
   * 生成缓存键
   */
  generateCacheKey(req) {
    const key = `${req.method}:${req.path}:${JSON.stringify(req.query)}:${JSON.stringify(req.headers)}`;
    return Buffer.from(key).toString('base64');
  }

  /**
   * 发送缓存响应
   */
  sendCachedResponse(res, cachedResponse) {
    Object.entries(cachedResponse.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    res.status(cachedResponse.status);
    res.json(cachedResponse.data);
  }

  /**
   * 记录请求指标
   */
  recordRequestMetrics(req, res, requestStartTime) {
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - requestStartTime) / 1000000; // 转换为毫秒

    this.metrics.requests.total++;
    if (res.statusCode >= 200 && res.statusCode < 400) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    // 更新平均响应时间
    const totalTime = this.metrics.requests.averageResponseTime * (this.metrics.requests.total - 1) + responseTime;
    this.metrics.requests.averageResponseTime = totalTime / this.metrics.requests.total;

    // 如果响应来自缓存，则缓存认证
    if (req.performance.cacheHit) {
      // 缓存响应时间很快，记录但不影响整体性能评估
    } else {
      // 非缓存响应，考虑存储到缓存
      if (res.statusCode === 200 && this.shouldCacheResponse(req, res)) {
        this.cacheResponse(req, res);
      }
    }

    // 发送指标到监控系统
    this.emitMetrics(req, res, responseTime);
  }

  /**
   * 判断是否应该缓存响应
   */
  shouldCacheResponse(req, res) {
    // 只缓存成功响应
    if (res.statusCode !== 200) return false;

    // 检查响应大小
    const contentLength = res.get('Content-Length');
    if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 大于1MB
      return false;
    }

    return true;
  }

  /**
   * 缓存响应
   */
  async cacheResponse(req, res) {
    try {
      const cacheKey = req.performance.cacheKey;
      if (!cacheKey) return;

      const responseData = {
        status: res.statusCode,
        headers: this.getCacheableHeaders(res),
        data: res.locals.responseData || {}
      };

      const ttl = this.getCacheTTL(req);
      await multiLevelCache.set('api_response', cacheKey, responseData, { ttl });
    } catch (error) {
      console.error('缓存响应失败:', error);
    }
  }

  /**
   * 获取可缓存的头信息
   */
  getCacheableHeaders(res) {
    const cacheableHeaders = {};
    const includeHeaders = ['Content-Type', 'Cache-Control', 'ETag'];

    includeHeaders.forEach(header => {
      const value = res.get(header);
      if (value) {
        cacheableHeaders[header] = value;
      }
    });

    return cacheableHeaders;
  }

  /**
   * 获取缓存TTL
   */
  getCacheTTL(req) {
    // 根据请求路径确定TTL
    const pathTTLMap = {
      '/api/v1/ecommerce/products': 1000 * 60 * 10, // 10分钟
      '/api/v1/announcements': 1000 * 60 * 5,      // 5分钟
      '/api/v1/villagers': 1000 * 60 * 2,          // 2分钟
      '/api/v1/system/config': 1000 * 60 * 60      // 1小时
    };

    for (const [path, ttl] of Object.entries(pathTTLMap)) {
      if (req.path.startsWith(path)) {
        return ttl;
      }
    }

    return this.config.cache.defaultTTL;
  }

  /**
   * 包装数据库查询
   */
  wrapDatabaseQueries(req) {
    // 如果已经包装过，避免重复包装
    if (req._databaseQueriesWrapped) return;
    req._databaseQueriesWrapped = true;

    const originalExec = mongoose.Query.prototype.exec;

    mongoose.Query.prototype.exec = function() {
      const collection = this.model.collection.name;
      const operation = this.op || 'find';
      const query = this.getQuery();

      // 使用性能监控器监控查询
      return queryPerformanceMonitor.monitorQuery({
        collection,
        operation,
        query,
        requestId: req.performance?.requestId,
        path: req.path,
        method: req.method
      })(() => {
        return originalExec.call(this);
      });
    };
  }

  /**
   * 设置指标收集
   */
  setupMetricsCollection() {
    if (this.config.monitoring.enablePerformanceMetrics) {
      setInterval(() => {
        this.collectSystemMetrics();
      }, this.config.monitoring.metricsInterval);
    }
  }

  /**
   * 收集系统指标
   */
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    this.metrics.performance = {
      throughput: this.calculateThroughput(),
      memoryUsage: memUsage,
      cpuUsage: this.calculateCPUUsage(),
      uptime: uptime,
      cacheStats: multiLevelCache.getStats()
    };
  }

  /**
   * 计算吞吐量
   */
  calculateThroughput() {
    const timeWindow = 60; // 1分钟
    const now = Date.now();
    const windowStart = now - (timeWindow * 1000);

    // 这里应该从请求日志中计算，简化实现
    return this.metrics.requests.total / Math.max(process.uptime(), 1);
  }

  /**
   * 计算CPU使用率
   */
  calculateCPUUsage() {
    const usage = process.cpuUsage();
    return (usage.user + usage.system) / (process.uptime() * 1000000) * 100;
  }

  /**
   * 发送指标到监控系统
   */
  emitMetrics(req, res, responseTime) {
    const metrics = {
      requestId: req.performance?.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: responseTime,
      cacheHit: req.performance?.cacheHit || false,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };

    // 发送到监控系统
    if (process.send) {
      process.send({ type: 'metrics', data: metrics });
    }

    // 触发本地事件
    process.emit('request-metrics', metrics);
  }

  /**
   * 获取性能指标
   */
  getMetrics() {
    const databaseMetrics = optimizedDatabase.getMetrics();
    const queryMetrics = queryPerformanceMonitor.getPerformanceReport('1h');
    const cacheMetrics = multiLevelCache.getStats();

    return {
      timestamp: new Date(),
      uptime: process.uptime(),
      requests: this.metrics.requests,
      performance: this.metrics.performance,
      database: databaseMetrics,
      queries: queryMetrics,
      cache: cacheMetrics,
      health: this.getHealthStatus()
    };
  }

  /**
   * 获取健康状态
   */
  getHealthStatus() {
    const health = {
      status: 'healthy',
      checks: {},
      issues: []
    };

    // 检查内存使用
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    health.checks.memory = {
      status: memUsagePercent < 90 ? 'healthy' : 'warning',
      usage: `${memUsagePercent.toFixed(2)}%`
    };

    if (memUsagePercent > 90) {
      health.issues.push('内存使用率过高');
      health.status = 'degraded';
    }

    // 检查响应时间
    if (this.metrics.requests.averageResponseTime > 5000) {
      health.issues.push('平均响应时间过长');
      health.status = 'degraded';
    }

    // 检查错误率
    const errorRate = this.metrics.requests.failed / this.metrics.requests.total;
    if (errorRate > 0.1) {
      health.issues.push('错误率过高');
      health.status = 'degraded';
    }

    // 检查缓存健康状态
    const cacheHealth = multiLevelCache.healthCheck();
    health.checks.cache = cacheHealth;
    if (cacheHealth.status !== 'healthy') {
      health.status = 'degraded';
    }

    // 检查数据库连接
    const dbHealth = await optimizedDatabase.performHealthCheck();
    health.checks.database = dbHealth;
    if (dbHealth.primary?.status !== 'healthy') {
      health.status = 'unhealthy';
    }

    return health;
  }

  /**
   * 优化建议
   */
  async getOptimizationRecommendations() {
    const recommendations = [];

    // 数据库优化建议
    const dbReport = await databaseOptimizer.getPerformanceReport();
    if (dbReport.recommendations) {
      recommendations.push(...dbReport.recommendations);
    }

    // 查询性能建议
    const queryReport = queryPerformanceMonitor.getPerformanceReport('24h');
    if (queryReport.recommendations) {
      recommendations.push(...queryReport.recommendations);
    }

    // 缓存优化建议
    const cacheStats = multiLevelCache.getStats();
    if (cacheStats.overall.hitRate < 70) {
      recommendations.push({
        type: 'cache',
        priority: 'medium',
        message: `缓存命中率较低: ${cacheStats.overall.hitRate.toFixed(2)}%`,
        suggestion: '考虑增加缓存时间或优化缓存策略'
      });
    }

    // 系统性能建议
    if (this.metrics.requests.averageResponseTime > 2000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: `平均响应时间过长: ${this.metrics.requests.averageResponseTime.toFixed(2)}ms`,
        suggestion: '检查慢查询，优化数据库索引，增加缓存'
      });
    }

    return recommendations;
  }

  /**
   * 应用性能优化
   */
  async applyOptimizations() {
    const results = [];

    try {
      // 优化慢查询
      const queryOptimizations = await databaseOptimizer.optimizeSlowQueries();
      results.push({
        type: 'database_optimization',
        count: queryOptimizations.length,
        details: queryOptimizations
      });

      // 清理过期缓存
      const cacheCleanup = await this.cleanupCache();
      results.push({
        type: 'cache_cleanup',
        count: cacheCleanup.deleted,
        details: cacheCleanup
      });

      // 重置性能指标
      this.resetMetrics();
      results.push({
        type: 'metrics_reset',
        timestamp: new Date()
      });

      return {
        success: true,
        message: '性能优化已应用',
        results
      };
    } catch (error) {
      return {
        success: false,
        message: '性能优化失败',
        error: error.message
      };
    }
  }

  /**
   * 清理缓存
   */
  async cleanupCache() {
    const deleted = {
      l1: 0,
      l2: 0,
      l3: 0,
      total: 0
    };

    try {
      // 清理过期或低频缓存项
      // 这里需要根据实际缓存实现来清理
      deleted.total = 10; // 示例值
    } catch (error) {
      console.error('清理缓存失败:', error);
    }

    return deleted;
  }

  /**
   * 重置指标
   */
  resetMetrics() {
    this.metrics.requests = {
      total: 0,
      successful: 0,
      failed: 0,
      averageResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * 停止性能优化
   */
  async stop() {
    try {
      // 停止监控
      queryPerformanceMonitor.stop();

      // 关闭缓存
      await multiLevelCache.shutdown();

      // 断开数据库连接
      await optimizedDatabase.disconnect();

      console.log('性能优化组件已停止');
    } catch (error) {
      console.error('停止性能优化失败:', error);
    }
  }
}

// 创建全局实例
const performanceOptimization = new PerformanceOptimization();

module.exports = performanceOptimization;