/**
 * 性能监控协调器
 * 统一管理应用性能监控、分析和优化建议
 */

const EventEmitter = require('events');
const logger = require('../../utils/logger');

class PerformanceOrchestrator extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = {
      enabled: options.enabled !== false,
      samplingRate: options.samplingRate || 1.0, // 采样率
      alertThresholds: {
        apiResponseTime: options.alertThresholds?.apiResponseTime || 2000,
        dbQueryTime: options.alertThresholds?.dbQueryTime || 1000,
        cacheHitRate: options.alertThresholds?.cacheHitRate || 0.7,
        memoryUsage: options.alertThresholds?.memoryUsage || 0.8, // 80%
        cpuUsage: options.alertThresholds?.cpuUsage || 0.7 // 70%
      },
      retentionDays: options.retentionDays || 7,
      aggregationInterval: options.aggregationInterval || 60000 // 1分钟
    };

    // 性能指标存储
    this.metrics = {
      api: new Map(),
      database: new Map(),
      cache: new Map(),
      system: new Map(),
      frontend: new Map()
    };

    // 实时统计
    this.stats = {
      totalRequests: 0,
      totalErrors: 0,
      avgResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      cacheHitRate: 0,
      dbSlowQueries: 0
    };

    // 启动聚合任务
    this.startAggregation();
  }

  /**
   * 记录 API 性能指标
   */
  recordApiMetric(metric) {
    if (!this.config.enabled || Math.random() > this.config.samplingRate) return;

    const key = `${metric.method}:${metric.path}`;
    const now = Date.now();

    if (!this.metrics.api.has(key)) {
      this.metrics.api.set(key, {
        count: 0,
        totalTime: 0,
        errors: 0,
        minTime: Infinity,
        maxTime: 0,
        times: [],
        lastUpdate: now
      });
    }

    const apiMetric = this.metrics.api.get(key);
    apiMetric.count++;
    apiMetric.totalTime += metric.duration;
    apiMetric.lastUpdate = now;

    if (metric.error) {
      apiMetric.errors++;
      this.stats.totalErrors++;
    }

    apiMetric.minTime = Math.min(apiMetric.minTime, metric.duration);
    apiMetric.maxTime = Math.max(apiMetric.maxTime, metric.duration);

    // 保留最近1000个样本用于百分位计算
    apiMetric.times.push(metric.duration);
    if (apiMetric.times.length > 1000) {
      apiMetric.times.shift();
    }

    this.stats.totalRequests++;
    this.updatePercentiles();

    // 检查告警
    if (metric.duration > this.config.alertThresholds.apiResponseTime) {
      this.emit('alert', {
        type: 'slow_api',
        path: metric.path,
        duration: metric.duration,
        threshold: this.config.alertThresholds.apiResponseTime
      });
    }

    this.emit('metric:api', { key, metric: apiMetric });
  }

  /**
   * 记录数据库性能指标
   */
  recordDbMetric(metric) {
    if (!this.config.enabled || Math.random() > this.config.samplingRate) return;

    const key = `${metric.collection}:${metric.operation}`;
    const now = Date.now();

    if (!this.metrics.database.has(key)) {
      this.metrics.database.set(key, {
        count: 0,
        totalTime: 0,
        slowQueries: 0,
        minTime: Infinity,
        maxTime: 0,
        times: [],
        lastUpdate: now
      });
    }

    const dbMetric = this.metrics.database.get(key);
    dbMetric.count++;
    dbMetric.totalTime += metric.duration;
    dbMetric.lastUpdate = now;

    if (metric.duration > this.config.alertThresholds.dbQueryTime) {
      dbMetric.slowQueries++;
      this.stats.dbSlowQueries++;

      this.emit('alert', {
        type: 'slow_query',
        collection: metric.collection,
        operation: metric.operation,
        duration: metric.duration,
        query: metric.query
      });
    }

    dbMetric.minTime = Math.min(dbMetric.minTime, metric.duration);
    dbMetric.maxTime = Math.max(dbMetric.maxTime, metric.duration);

    dbMetric.times.push(metric.duration);
    if (dbMetric.times.length > 1000) {
      dbMetric.times.shift();
    }

    this.emit('metric:database', { key, metric: dbMetric });
  }

  /**
   * 记录缓存性能指标
   */
  recordCacheMetric(metric) {
    if (!this.config.enabled || Math.random() > this.config.samplingRate) return;

    const key = metric.cacheKey || 'all';
    const now = Date.now();

    if (!this.metrics.cache.has(key)) {
      this.metrics.cache.set(key, {
        hits: 0,
        misses: 0,
        totalRequests: 0,
        evictions: 0,
        size: 0,
        lastUpdate: now
      });
    }

    const cacheMetric = this.metrics.cache.get(key);
    cacheMetric.lastUpdate = now;

    switch (metric.action) {
    case 'hit':
      cacheMetric.hits++;
      cacheMetric.totalRequests++;
      break;
    case 'miss':
      cacheMetric.misses++;
      cacheMetric.totalRequests++;
      break;
    case 'eviction':
      cacheMetric.evictions++;
      break;
    case 'size':
      cacheMetric.size = metric.size;
      break;
    }

    // 更新全局命中率
    this.updateCacheHitRate();

    // 检查命中率告警
    const hitRate = this.getCacheHitRate();
    if (hitRate < this.config.alertThresholds.cacheHitRate) {
      this.emit('alert', {
        type: 'low_cache_hit_rate',
        hitRate,
        threshold: this.config.alertThresholds.cacheHitRate
      });
    }

    this.emit('metric:cache', { key, metric: cacheMetric });
  }

  /**
   * 记录系统资源指标
   */
  recordSystemMetric(metric) {
    if (!this.config.enabled) return;

    const key = metric.type || 'system';
    const now = Date.now();

    if (!this.metrics.system.has(key)) {
      this.metrics.system.set(key, {
        cpu: [],
        memory: [],
        disk: [],
        eventLoopDelay: [],
        lastUpdate: now
      });
    }

    const systemMetric = this.metrics.system.get(key);
    systemMetric.lastUpdate = now;

    if (metric.cpu !== undefined) {
      systemMetric.cpu.push({ time: now, value: metric.cpu });
      if (systemMetric.cpu.length > 1000) systemMetric.cpu.shift();

      if (metric.cpu > this.config.alertThresholds.cpuUsage) {
        this.emit('alert', {
          type: 'high_cpu',
          value: metric.cpu,
          threshold: this.config.alertThresholds.cpuUsage
        });
      }
    }

    if (metric.memory !== undefined) {
      systemMetric.memory.push({ time: now, value: metric.memory });
      if (systemMetric.memory.length > 1000) systemMetric.memory.shift();

      if (metric.memory > this.config.alertThresholds.memoryUsage) {
        this.emit('alert', {
          type: 'high_memory',
          value: metric.memory,
          threshold: this.config.alertThresholds.memoryUsage
        });
      }
    }

    if (metric.eventLoopDelay !== undefined) {
      systemMetric.eventLoopDelay.push({ time: now, value: metric.eventLoopDelay });
      if (systemMetric.eventLoopDelay.length > 1000) systemMetric.eventLoopDelay.shift();
    }

    this.emit('metric:system', { key, metric: systemMetric });
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(options = {}) {
    const { includeDetails = false, timeRange = 3600000 } = options; // 默认1小时
    const now = Date.now();
    const cutoff = now - timeRange;

    return {
      timestamp: now,
      summary: this.getSummary(),
      api: this.getApiReport(cutoff, includeDetails),
      database: this.getDatabaseReport(cutoff, includeDetails),
      cache: this.getCacheReport(includeDetails),
      system: this.getSystemReport(includeDetails),
      alerts: this.getRecentAlerts(timeRange),
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * 获取摘要统计
   */
  getSummary() {
    return {
      totalRequests: this.stats.totalRequests,
      totalErrors: this.stats.totalErrors,
      errorRate: this.stats.totalRequests > 0
        ? this.stats.totalErrors / this.stats.totalRequests
        : 0,
      avgResponseTime: this.stats.avgResponseTime,
      p95ResponseTime: this.stats.p95ResponseTime,
      p99ResponseTime: this.stats.p99ResponseTime,
      cacheHitRate: this.stats.cacheHitRate,
      slowQueries: this.stats.dbSlowQueries
    };
  }

  /**
   * 获取 API 报告
   */
  getApiReport(cutoff, includeDetails) {
    const report = {
      totalEndpoints: this.metrics.api.size,
      slowEndpoints: [],
      topErrors: []
    };

    if (includeDetails) {
      const details = [];
      for (const [key, metric] of this.metrics.api.entries()) {
        if (metric.lastUpdate < cutoff) continue;

        const avgTime = metric.totalTime / metric.count;
        details.push({
          endpoint: key,
          requests: metric.count,
          avgTime: avgTime.toFixed(2),
          minTime: metric.minTime,
          maxTime: metric.maxTime,
          errors: metric.errors,
          errorRate: metric.errors / metric.count
        });

        if (avgTime > this.config.alertThresholds.apiResponseTime) {
          report.slowEndpoints.push({ endpoint: key, avgTime });
        }
      }

      details.sort((a, b) => b.requests - a.requests);
      report.topEndpoints = details.slice(0, 20);
      report.topErrors = details
        .filter(d => d.errors > 0)
        .sort((a, b) => b.errors - a.errors)
        .slice(0, 10);
    }

    return report;
  }

  /**
   * 获取数据库报告
   */
  getDatabaseReport(cutoff, includeDetails) {
    const report = {
      totalCollections: this.metrics.database.size,
      slowQueries: this.stats.dbSlowQueries
    };

    if (includeDetails) {
      const details = [];
      for (const [key, metric] of this.metrics.database.entries()) {
        if (metric.lastUpdate < cutoff) continue;

        const avgTime = metric.totalTime / metric.count;
        details.push({
          collection: key,
          operations: metric.count,
          avgTime: avgTime.toFixed(2),
          minTime: metric.minTime,
          maxTime: metric.maxTime,
          slowQueries: metric.slowQueries
        });
      }

      details.sort((a, b) => b.slowQueries - a.slowQueries);
      report.slowestCollections = details.slice(0, 10);
    }

    return report;
  }

  /**
   * 获取缓存报告
   */
  getCacheReport(includeDetails) {
    const report = {
      overallHitRate: this.stats.cacheHitRate,
      totalKeys: this.metrics.cache.size
    };

    if (includeDetails) {
      const details = [];
      for (const [key, metric] of this.metrics.cache.entries()) {
        const hitRate = metric.totalRequests > 0
          ? metric.hits / metric.totalRequests
          : 0;

        details.push({
          key,
          hitRate: hitRate.toFixed(3),
          hits: metric.hits,
          misses: metric.misses,
          evictions: metric.evictions,
          size: metric.size
        });
      }

      details.sort((a, b) => b.misses - a.misses);
      report.worstPerforming = details.slice(0, 10);
    }

    return report;
  }

  /**
   * 获取系统报告
   */
  getSystemReport(includeDetails) {
    const report = {};

    for (const [key, metric] of this.metrics.system.entries()) {
      if (metric.cpu.length > 0) {
        const latestCpu = metric.cpu[metric.cpu.length - 1].value;
        const avgCpu = metric.cpu.reduce((sum, m) => sum + m.value, 0) / metric.cpu.length;
        report[key] = {
          cpu: {
            current: latestCpu.toFixed(2),
            average: avgCpu.toFixed(2),
            max: Math.max(...metric.cpu.map(m => m.value)).toFixed(2)
          }
        };
      }

      if (metric.memory.length > 0) {
        const latestMem = metric.memory[metric.memory.length - 1].value;
        const avgMem = metric.memory.reduce((sum, m) => sum + m.value, 0) / metric.memory.length;
        report[key] = report[key] || {};
        report[key].memory = {
          current: latestMem.toFixed(2),
          average: avgMem.toFixed(2),
          max: Math.max(...metric.memory.map(m => m.value)).toFixed(2)
        };
      }

      if (metric.eventLoopDelay.length > 0) {
        const avgDelay = metric.eventLoopDelay.reduce((sum, m) => sum + m.value, 0) / metric.eventLoopDelay.length;
        report[key] = report[key] || {};
        report[key].eventLoopDelay = {
          average: avgDelay.toFixed(2),
          max: Math.max(...metric.eventLoopDelay.map(m => m.value)).toFixed(2)
        };
      }
    }

    return report;
  }

  /**
   * 更新百分位响应时间
   */
  updatePercentiles() {
    const allTimes = [];

    for (const metric of this.metrics.api.values()) {
      allTimes.push(...metric.times);
    }

    if (allTimes.length === 0) return;

    allTimes.sort((a, b) => a - b);

    this.stats.avgResponseTime =
      allTimes.reduce((sum, t) => sum + t, 0) / allTimes.length;
    this.stats.p95ResponseTime = allTimes[Math.floor(allTimes.length * 0.95)];
    this.stats.p99ResponseTime = allTimes[Math.floor(allTimes.length * 0.99)];
  }

  /**
   * 更新缓存命中率
   */
  updateCacheHitRate() {
    let totalHits = 0;
    let totalRequests = 0;

    for (const metric of this.metrics.cache.values()) {
      totalHits += metric.hits;
      totalRequests += metric.totalRequests;
    }

    this.stats.cacheHitRate = totalRequests > 0 ? totalHits / totalRequests : 0;
  }

  /**
   * 获取缓存命中率
   */
  getCacheHitRate() {
    return this.stats.cacheHitRate;
  }

  /**
   * 生成优化建议
   */
  generateRecommendations() {
    const recommendations = [];

    // API 优化建议
    for (const [key, metric] of this.metrics.api.entries()) {
      const avgTime = metric.totalTime / metric.count;

      if (avgTime > this.config.alertThresholds.apiResponseTime) {
        recommendations.push({
          type: 'api',
          priority: 'high',
          endpoint: key,
          issue: `平均响应时间 ${avgTime.toFixed(0)}ms 超过阈值`,
          suggestion: '考虑添加缓存或优化查询逻辑'
        });
      }

      if (metric.errors / metric.count > 0.05) {
        recommendations.push({
          type: 'api',
          priority: 'high',
          endpoint: key,
          issue: `错误率 ${((metric.errors / metric.count) * 100).toFixed(1)}% 过高`,
          suggestion: '检查错误日志并修复异常处理'
        });
      }
    }

    // 数据库优化建议
    for (const [key, metric] of this.metrics.database.entries()) {
      if (metric.slowQueries > 100) {
        recommendations.push({
          type: 'database',
          priority: 'high',
          collection: key,
          issue: `${metric.slowQueries} 个慢查询`,
          suggestion: '检查索引并优化查询语句'
        });
      }
    }

    // 缓存优化建议
    if (this.stats.cacheHitRate < this.config.alertThresholds.cacheHitRate) {
      recommendations.push({
        type: 'cache',
        priority: 'medium',
        issue: `缓存命中率 ${((this.stats.cacheHitRate) * 100).toFixed(1)}% 偏低`,
        suggestion: '调整缓存策略或增加缓存容量'
      });
    }

    return recommendations;
  }

  /**
   * 启动聚合任务
   */
  startAggregation() {
    this.aggregationTimer = setInterval(() => {
      this.aggregateMetrics();
      this.cleanupOldData();
    }, this.config.aggregationInterval);
  }

  /**
   * 聚合指标
   */
  aggregateMetrics() {
    const report = this.getPerformanceReport({ includeDetails: false });
    this.emit('aggregated', report);
  }

  /**
   * 清理过期数据
   */
  cleanupOldData() {
    const cutoff = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);

    for (const [key, metric] of this.metrics.api.entries()) {
      if (metric.lastUpdate < cutoff) {
        this.metrics.api.delete(key);
      }
    }

    for (const [key, metric] of this.metrics.database.entries()) {
      if (metric.lastUpdate < cutoff) {
        this.metrics.database.delete(key);
      }
    }
  }

  /**
   * 关闭监控器
   */
  shutdown() {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
    }

    this.removeAllListeners();
    logger.info('性能监控协调器已关闭');
  }
}

// 单例模式
const performanceOrchestrator = new PerformanceOrchestrator();

module.exports = performanceOrchestrator;
