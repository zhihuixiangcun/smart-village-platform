/**
 * 缓存分析器
 * 实现缓存命中率分析和性能监控
 */

const EventEmitter = require('events');
const { performance } = require('perf_hooks');
const multiLevelCache = require('./multiLevelCache');
const smartCache = require('./smartCache');
const logger = require('../utils/logger');

class CacheAnalytics extends EventEmitter {
  constructor() {
    super();

    // 分析配置
    this.config = {
      // 分析窗口（分钟）
      windowSize: parseInt(process.env.CACHE_ANALYTICS_WINDOW) || 60,
      // 采样率
      sampleRate: parseFloat(process.env.CACHE_ANALYTICS_SAMPLE_RATE) || 1.0,
      // 报告间隔（分钟）
      reportInterval: parseInt(process.env.CACHE_ANALYTICS_REPORT_INTERVAL) || 5,
      // 告警阈值
      alertThresholds: {
        hitRate: parseFloat(process.env.CACHE_HIT_RATE_ALERT) || 0.7,
        responseTime: parseInt(process.env.CACHE_RESPONSE_TIME_ALERT) || 100,
        errorRate: parseFloat(process.env.CACHE_ERROR_RATE_ALERT) || 0.05
      }
    };

    // 实时指标
    this.realtimeMetrics = {
      requests: 0,
      hits: 0,
      misses: 0,
      errors: 0,
      responseTime: [],
      lastReset: Date.now()
    };

    // 历史数据
    this.historicalData = new Map();

    // 命中率趋势
    this.hitRateTrend = [];

    // 性能基线
    this.performanceBaseline = null;

    // 告警状态
    this.alerts = new Set();

    // 启动监控
    this.startMonitoring();
  }

  /**
   * 记录缓存访问
   * @param {string} key - 缓存键
   * @param {boolean} hit - 是否命中
   * @param {string} level - 缓存级别 (l1/l2/l3)
   * @param {number} responseTime - 响应时间
   * @param {Object} metadata - 元数据
   */
  recordAccess(key, hit, level = 'unknown', responseTime = 0, metadata = {}) {
    // 采样处理
    if (Math.random() > this.config.sampleRate) {
      return;
    }

    const now = Date.now();
    const windowStart = now - (this.config.windowSize * 60 * 1000);

    // 更新实时指标
    this.realtimeMetrics.requests++;
    if (hit) {
      this.realtimeMetrics.hits++;
    } else {
      this.realtimeMetrics.misses++;
    }

    if (responseTime > 0) {
      this.realtimeMetrics.responseTime.push(responseTime);
      // 保留最近1000个响应时间
      if (this.realtimeMetrics.responseTime.length > 1000) {
        this.realtimeMetrics.responseTime.shift();
      }
    }

    // 记录详细信息
    const record = {
      timestamp: now,
      key,
      hit,
      level,
      responseTime,
      metadata
    };

    // 按时间窗口分组
    const windowKey = Math.floor(now / (60 * 1000)) * (60 * 1000);
    if (!this.historicalData.has(windowKey)) {
      this.historicalData.set(windowKey, []);
    }

    this.historicalData.get(windowKey).push(record);

    // 清理过期数据
    this.cleanupOldData(windowStart);

    // 检查告警条件
    this.checkAlerts();

    // 发出事件
    this.emit('accessRecorded', record);
  }

  /**
   * 获取实时指标
   * @returns {Object} 实时指标
   */
  getRealtimeMetrics() {
    const now = Date.now();
    const windowStart = now - (this.config.windowSize * 60 * 1000);

    // 过滤窗口内的数据
    const windowRecords = [];
    for (const [timestamp, records] of this.historicalData.entries()) {
      if (timestamp >= windowStart) {
        windowRecords.push(...records);
      }
    }

    // 计算窗口指标
    const windowMetrics = this.calculateWindowMetrics(windowRecords);

    // 计算响应时间统计
    const responseTimes = this.realtimeMetrics.responseTime;
    const avgResponseTime = responseTimes.length > 0 ?
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;

    const sortedResponseTimes = [...responseTimes].sort((a, b) => a - b);
    const p95ResponseTime = sortedResponseTimes.length > 0 ?
      sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.95)] : 0;

    const p99ResponseTime = sortedResponseTimes.length > 0 ?
      sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.99)] : 0;

    return {
      // 累计指标
      total: this.realtimeMetrics.requests,
      hits: this.realtimeMetrics.hits,
      misses: this.realtimeMetrics.misses,
      errors: this.realtimeMetrics.errors,

      // 窗口指标
      window: windowMetrics,

      // 响应时间
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      p95ResponseTime: Math.round(p95ResponseTime * 100) / 100,
      p99ResponseTime: Math.round(p99ResponseTime * 100) / 100,

      // 命中率
      hitRate: windowMetrics.requests > 0 ?
        `${(windowMetrics.hits / windowMetrics.requests * 100).toFixed(2)  }%` : '0%',

      // 时间信息
      windowSize: this.config.windowSize,
      lastReset: new Date(this.realtimeMetrics.lastReset)
    };
  }

  /**
   * 计算窗口指标
   * @param {Array} records - 记录数组
   * @returns {Object} 窗口指标
   */
  calculateWindowMetrics(records) {
    const metrics = {
      requests: records.length,
      hits: 0,
      misses: 0,
      errors: 0,
      l1Hits: 0,
      l2Hits: 0,
      l3Hits: 0,
      avgResponseTime: 0,
      totalResponseTime: 0,
      keys: new Set(),
      levels: new Set()
    };

    let totalResponseTime = 0;

    for (const record of records) {
      if (record.hit) {
        metrics.hits++;
        if (record.level === 'l1') metrics.l1Hits++;
        else if (record.level === 'l2') metrics.l2Hits++;
        else if (record.level === 'l3') metrics.l3Hits++;
      } else {
        metrics.misses++;
      }

      if (record.responseTime > 0) {
        totalResponseTime += record.responseTime;
      }

      metrics.keys.add(record.key);
      metrics.levels.add(record.level);
    }

    metrics.avgResponseTime = records.length > 0 ? totalResponseTime / records.length : 0;
    metrics.totalResponseTime = totalResponseTime;
    metrics.uniqueKeys = metrics.keys.size;
    metrics.uniqueLevels = Array.from(metrics.levels);

    return metrics;
  }

  /**
   * 获取命中率趋势
   * @param {number} points - 数据点数
   * @returns {Array} 命中率趋势
   */
  getHitRateTrend(points = 24) {
    const trend = [];
    const now = Date.now();
    const interval = this.config.windowSize * 60 * 1000;

    for (let i = points - 1; i >= 0; i--) {
      const windowStart = now - (i + 1) * interval;
      const windowEnd = now - i * interval;

      let hits = 0;
      let requests = 0;

      for (const [timestamp, records] of this.historicalData.entries()) {
        if (timestamp >= windowStart && timestamp < windowEnd) {
          records.forEach(record => {
            requests++;
            if (record.hit) hits++;
          });
        }
      }

      trend.push({
        timestamp: new Date(windowEnd),
        hitRate: requests > 0 ? (hits / requests) : 0,
        hits,
        requests
      });
    }

    // 更新内部趋势数据
    this.hitRateTrend = trend;

    return trend;
  }

  /**
   * 分析缓存性能
   * @returns {Object} 性能分析报告
   */
  analyzePerformance() {
    const realtime = this.getRealtimeMetrics();
    const trend = this.getHitRateTrend();

    // 计算性能指标
    const performance = {
      // 整体性能
      overall: {
        hitRate: parseFloat(realtime.hitRate) / 100,
        avgResponseTime: realtime.avgResponseTime,
        p95ResponseTime: realtime.p95ResponseTime,
        qps: realtime.window.requests / (this.config.windowSize * 60)
      },

      // 分级性能
      byLevel: {
        l1: {
          hits: realtime.window.l1Hits,
          hitRate: realtime.window.requests > 0 ?
            realtime.window.l1Hits / realtime.window.requests : 0
        },
        l2: {
          hits: realtime.window.l2Hits,
          hitRate: realtime.window.requests > 0 ?
            realtime.window.l2Hits / realtime.window.requests : 0
        },
        l3: {
          hits: realtime.window.l3Hits,
          hitRate: realtime.window.requests > 0 ?
            realtime.window.l3Hits / realtime.window.requests : 0
        }
      },

      // 趋势分析
      trend: {
        currentHitRate: trend[trend.length - 1]?.hitRate || 0,
        avgHitRate: trend.reduce((sum, t) => sum + t.hitRate, 0) / trend.length,
        hitRateTrend: this.calculateTrend(trend.map(t => t.hitRate)),
        stability: this.calculateStability(trend.map(t => t.hitRate))
      },

      // 热点分析
      hotKeys: this.analyzeHotKeys(),

      // 性能问题
      issues: this.identifyPerformanceIssues(realtime)
    };

    return performance;
  }

  /**
   * 分析热点键
   * @returns {Array} 热点键列表
   */
  analyzeHotKeys() {
    const keyStats = new Map();
    const windowStart = Date.now() - (this.config.windowSize * 60 * 1000);

    for (const [timestamp, records] of this.historicalData.entries()) {
      if (timestamp < windowStart) continue;

      records.forEach(record => {
        const stats = keyStats.get(record.key) || {
          requests: 0,
          hits: 0,
          avgResponseTime: 0,
          levels: new Set()
        };

        stats.requests++;
        if (record.hit) stats.hits++;
        if (record.responseTime > 0) {
          stats.avgResponseTime = (stats.avgResponseTime + record.responseTime) / 2;
        }
        stats.levels.add(record.level);

        keyStats.set(record.key, stats);
      });
    }

    // 转换为数组并排序
    return Array.from(keyStats.entries())
      .map(([key, stats]) => ({
        key,
        requests: stats.requests,
        hits: stats.hits,
        hitRate: stats.requests > 0 ? stats.hits / stats.requests : 0,
        avgResponseTime: Math.round(stats.avgResponseTime * 100) / 100,
        levels: Array.from(stats.levels)
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 20); // 返回前20个热点键
  }

  /**
   * 识别性能问题
   * @param {Object} metrics - 指标
   * @returns {Array} 性能问题列表
   */
  identifyPerformanceIssues(metrics) {
    const issues = [];

    // 命中率过低
    const hitRate = parseFloat(metrics.hitRate) / 100;
    if (hitRate < this.config.alertThresholds.hitRate) {
      issues.push({
        type: 'low_hit_rate',
        severity: 'high',
        message: `缓存命中率过低: ${metrics.hitRate} (阈值: ${(this.config.alertThresholds.hitRate * 100).toFixed(1)}%)`,
        suggestion: '检查缓存键生成策略，考虑增加预热或调整TTL'
      });
    }

    // 响应时间过长
    if (metrics.avgResponseTime > this.config.alertThresholds.responseTime) {
      issues.push({
        type: 'high_response_time',
        severity: 'medium',
        message: `平均响应时间过长: ${metrics.avgResponseTime}ms (阈值: ${this.config.alertThresholds.responseTime}ms)`,
        suggestion: '检查缓存系统负载，考虑优化查询或增加缓存层级'
      });
    }

    // P95响应时间过长
    if (metrics.p95ResponseTime > this.config.alertThresholds.responseTime * 2) {
      issues.push({
        type: 'high_p95_response_time',
        severity: 'medium',
        message: `P95响应时间过长: ${metrics.p95ResponseTime}ms`,
        suggestion: '分析慢请求，优化缓存策略或增加缓存预加载'
      });
    }

    // 错误率过高
    const errorRate = metrics.window.errors / metrics.window.requests;
    if (errorRate > this.config.alertThresholds.errorRate) {
      issues.push({
        type: 'high_error_rate',
        severity: 'high',
        message: `错误率过高: ${(errorRate * 100).toFixed(2)}%`,
        suggestion: '检查缓存系统稳定性，排查错误原因'
      });
    }

    // L1命中率过低
    const l1HitRate = metrics.window.requests > 0 ?
      metrics.window.l1Hits / metrics.window.requests : 0;
    if (l1HitRate < 0.3) {
      issues.push({
        type: 'low_l1_hit_rate',
        severity: 'low',
        message: `L1缓存命中率过低: ${(l1HitRate * 100).toFixed(1)}%`,
        suggestion: '调整L1缓存大小或TTL，优化热点数据识别'
      });
    }

    return issues;
  }

  /**
   * 检查告警条件
   */
  checkAlerts() {
    const metrics = this.getRealtimeMetrics();
    const issues = this.identifyPerformanceIssues(metrics);

    // 处理高严重性问题
    issues.forEach(issue => {
      if (issue.severity === 'high') {
        const alertKey = `${issue.type}_${Date.now()}`;

        if (!this.alerts.has(alertKey)) {
          this.alerts.add(alertKey);

          logger.error('缓存性能告警', {
            type: issue.type,
            message: issue.message,
            suggestion: issue.suggestion
          });

          this.emit('alert', {
            type: issue.type,
            severity: issue.severity,
            message: issue.message,
            suggestion: issue.suggestion,
            timestamp: new Date()
          });
        }
      }
    });

    // 清理过期告警（10分钟）
    const alertExpiry = Date.now() - 10 * 60 * 1000;
    for (const alert of this.alerts) {
      if (alert.includes('_') && parseInt(alert.split('_')[1]) < alertExpiry) {
        this.alerts.delete(alert);
      }
    }
  }

  /**
   * 计算趋势
   * @param {Array} values - 数值数组
   * @returns {string} 趋势描述
   */
  calculateTrend(values) {
    if (values.length < 2) return 'stable';

    const first = values[0];
    const last = values[values.length - 1];
    const change = (last - first) / first;

    if (change > 0.05) return 'improving';
    if (change < -0.05) return 'declining';
    return 'stable';
  }

  /**
   * 计算稳定性
   * @param {Array} values - 数值数组
   * @returns {number} 稳定性分数（0-1）
   */
  calculateStability(values) {
    if (values.length < 2) return 1;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // 标准差越小，稳定性越高
    return Math.max(0, 1 - stdDev);
  }

  /**
   * 清理过期数据
   * @param {number} cutoff - 截止时间
   */
  cleanupOldData(cutoff) {
    for (const [timestamp] of this.historicalData.entries()) {
      if (timestamp < cutoff) {
        this.historicalData.delete(timestamp);
      }
    }
  }

  /**
   * 启动监控
   */
  startMonitoring() {
    // 定期生成报告
    setInterval(() => {
      try {
        const report = this.generateReport();
        this.emit('report', report);
      } catch (error) {
        logger.error('生成缓存分析报告失败', error);
      }
    }, this.config.reportInterval * 60 * 1000);

    logger.info('缓存分析监控已启动', {
      windowSize: this.config.windowSize,
      reportInterval: this.config.reportInterval,
      sampleRate: this.config.sampleRate
    });
  }

  /**
   * 生成分析报告
   * @returns {Object} 分析报告
   */
  generateReport() {
    const performance = this.analyzePerformance();
    const realtime = this.getRealtimeMetrics();
    const hotKeys = this.analyzeHotKeys();

    const report = {
      timestamp: new Date(),
      summary: {
        hitRate: performance.overall.hitRate,
        avgResponseTime: performance.overall.avgResponseTime,
        qps: performance.overall.qps,
        totalRequests: realtime.total,
        activeAlerts: this.alerts.size
      },
      performance,
      realtime,
      hotKeys: hotKeys.slice(0, 10),
      alerts: Array.from(this.alerts).map(alert => ({
        id: alert,
        type: alert.split('_')[0],
        timestamp: new Date(parseInt(alert.split('_')[1]))
      })),
      recommendations: this.generateRecommendations(performance)
    };

    return report;
  }

  /**
   * 生成优化建议
   * @param {Object} performance - 性能数据
   * @returns {Array} 优化建议列表
   */
  generateRecommendations(performance) {
    const recommendations = [];

    // 基于命中率的建议
    if (performance.overall.hitRate < 0.8) {
      recommendations.push({
        priority: 'high',
        type: 'hit_rate_optimization',
        title: '优化缓存命中率',
        description: '当前命中率较低，建议优化缓存策略',
        actions: [
          '增加缓存预热',
          '调整TTL策略',
          '优化缓存键设计',
          '分析缓存未命中的原因'
        ]
      });
    }

    // 基于响应时间的建议
    if (performance.overall.avgResponseTime > 100) {
      recommendations.push({
        priority: 'medium',
        type: 'response_time_optimization',
        title: '优化缓存响应时间',
        description: '平均响应时间较长，建议优化缓存层级',
        actions: [
          '增加L1缓存大小',
          '优化Redis配置',
          '考虑使用更快的存储介质',
          '分析慢查询原因'
        ]
      });
    }

    // 基于L1命中率的建议
    if (performance.byLevel.l1.hitRate < 0.4) {
      recommendations.push({
        priority: 'medium',
        type: 'l1_optimization',
        title: '优化L1内存缓存',
        description: 'L1缓存命中率偏低，建议优化内存缓存策略',
        actions: [
          '增加L1缓存容量',
          '优化热点数据识别',
          '调整LRU策略参数',
          '考虑缓存分片'
        ]
      });
    }

    // 基于趋势的建议
    if (performance.trend.hitRateTrend === 'declining') {
      recommendations.push({
        priority: 'high',
        type: 'trend_analysis',
        title: '关注缓存性能下降趋势',
        description: '缓存命中率呈下降趋势，需要及时干预',
        actions: [
          '分析访问模式变化',
          '检查缓存污染问题',
          '调整缓存策略',
          '加强监控和告警'
        ]
      });
    }

    return recommendations;
  }

  /**
   * 重置统计数据
   */
  reset() {
    this.realtimeMetrics = {
      requests: 0,
      hits: 0,
      misses: 0,
      errors: 0,
      responseTime: [],
      lastReset: Date.now()
    };

    this.historicalData.clear();
    this.hitRateTrend = [];
    this.alerts.clear();

    logger.info('缓存分析统计数据已重置');
  }

  /**
   * 设置性能基线
   */
  setPerformanceBaseline() {
    const current = this.getRealtimeMetrics();

    this.performanceBaseline = {
      hitRate: parseFloat(current.hitRate) / 100,
      avgResponseTime: current.avgResponseTime,
      p95ResponseTime: current.p95ResponseTime,
      qps: current.window.requests / (this.config.windowSize * 60),
      timestamp: new Date()
    };

    logger.info('缓存性能基线已设置', this.performanceBaseline);
  }

  /**
   * 与基线对比
   * @returns {Object} 对比结果
   */
  compareWithBaseline() {
    if (!this.performanceBaseline) {
      return { error: '未设置性能基线' };
    }

    const current = this.getRealtimeMetrics();
    const currentHitRate = parseFloat(current.hitRate) / 100;
    const currentQps = current.window.requests / (this.config.windowSize * 60);

    return {
      baseline: this.performanceBaseline,
      current: {
        hitRate: currentHitRate,
        avgResponseTime: current.avgResponseTime,
        p95ResponseTime: current.p95ResponseTime,
        qps: currentQps
      },
      comparison: {
        hitRateChange: `${((currentHitRate - this.performanceBaseline.hitRate) / this.performanceBaseline.hitRate * 100).toFixed(2)  }%`,
        responseTimeChange: `${((current.avgResponseTime - this.performanceBaseline.avgResponseTime) / this.performanceBaseline.avgResponseTime * 100).toFixed(2)  }%`,
        qpsChange: `${((currentQps - this.performanceBaseline.qps) / this.performanceBaseline.qps * 100).toFixed(2)  }%`
      }
    };
  }
}

// 单例模式
const cacheAnalytics = new CacheAnalytics();

module.exports = cacheAnalytics;