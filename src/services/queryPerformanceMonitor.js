/**
 * 查询性能监控系统
 * 实时监控、分析、优化数据库查询性能
 */

const EventEmitter = require('events');
const { performance } = require('perf_hooks');

class QueryPerformanceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = {
      // 监控配置
      enabled: options.enabled !== false,
      slowQueryThreshold: options.slowQueryThreshold || 1000,
      verySlowQueryThreshold: options.verySlowQueryThreshold || 5000,
      criticalQueryThreshold: options.criticalQueryThreshold || 10000,

      // 数据收集配置
      maxQueryHistory: options.maxQueryHistory || 10000,
      maxSlowQueryHistory: options.maxSlowQueryHistory || 1000,
      aggregationWindow: options.aggregationWindow || 60000, // 1分钟

      // 告警配置
      alerting: {
        enabled: options.alertingEnabled !== false,
        slowQueryCountThreshold: options.slowQueryCountThreshold || 10,
        averageResponseTimeThreshold: options.averageResponseTimeThreshold || 2000,
        errorRateThreshold: options.errorRateThreshold || 0.05
      },

      // 优化建议配置
      optimization: {
        enabled: options.optimizationEnabled !== false,
        autoIndexCreation: options.autoIndexCreation || false,
        minQueryFrequency: options.minQueryFrequency || 100,
        indexEfficiencyThreshold: options.indexEfficiencyThreshold || 0.8
      }
    };

    // 查询数据存储
    this.queryHistory = [];
    this.slowQueries = [];
    this.queryPatterns = new Map();
    this.queryStats = {
      totalQueries: 0,
      totalExecutionTime: 0,
      slowQueries: 0,
      failedQueries: 0,
      averageResponseTime: 0,
      queriesPerSecond: 0,
      errorRate: 0
    };

    // 聚合数据
    this.aggregatedData = {
      currentWindow: null,
      windows: [],
      realtime: {
        qps: 0,
        avgResponseTime: 0,
        errorRate: 0,
        slowQueryRate: 0
      }
    };

    // 性能基线
    this.baseline = {
      averageResponseTime: 0,
      queriesPerSecond: 0,
      errorRate: 0
    };

    // 告警状态
    this.alerts = [];
    this.alertThresholds = new Map();

    // 定时器
    this.aggregationTimer = null;
    this.cleanupTimer = null;

    this.setupTimers();
  }

  /**
   * 设置定时器
   */
  setupTimers() {
    // 聚合数据定时器
    this.aggregationTimer = setInterval(() => {
      this.aggregateData();
    }, this.config.aggregationWindow);

    // 数据清理定时器
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldData();
    }, 60000 * 60); // 每小时清理一次
  }

  /**
   * 监控查询执行
   */
  monitorQuery(queryInfo) {
    if (!this.config.enabled) return;

    const startTime = performance.now();

    // 返回执行函数
    return async (executeFn) => {
      const queryStartTime = Date.now();
      let result = null;
      let error = null;

      try {
        result = await executeFn();
        this.recordQuery({
          ...queryInfo,
          startTime: queryStartTime,
          endTime: Date.now(),
          executionTime: performance.now() - startTime,
          status: 'success',
          resultSize: this.calculateResultSize(result)
        });
        return result;
      } catch (err) {
        error = err;
        this.recordQuery({
          ...queryInfo,
          startTime: queryStartTime,
          endTime: Date.now(),
          executionTime: performance.now() - startTime,
          status: 'error',
          error: err.message
        });
        throw err;
      }
    };
  }

  /**
   * 记录查询信息
   */
  recordQuery(queryData) {
    // 更新统计信息
    this.updateQueryStats(queryData);

    // 添加到历史记录
    this.queryHistory.push(queryData);

    // 检查是否为慢查询
    if (queryData.executionTime > this.config.slowQueryThreshold) {
      this.handleSlowQuery(queryData);
    }

    // 分析查询模式
    this.analyzeQueryPattern(queryData);

    // 检查告警条件
    if (this.config.alerting.enabled) {
      this.checkAlerts();
    }

    // 保持历史记录在合理范围内
    if (this.queryHistory.length > this.config.maxQueryHistory) {
      this.queryHistory = this.queryHistory.slice(-this.config.maxQueryHistory * 0.8);
    }

    // 触发事件
    this.emit('query:recorded', queryData);
  }

  /**
   * 更新查询统计
   */
  updateQueryStats(queryData) {
    this.queryStats.totalQueries++;
    this.queryStats.totalExecutionTime += queryData.executionTime;
    this.queryStats.averageResponseTime = this.queryStats.totalExecutionTime / this.queryStats.totalQueries;

    if (queryData.status === 'error') {
      this.queryStats.failedQueries++;
    }

    if (queryData.executionTime > this.config.slowQueryThreshold) {
      this.queryStats.slowQueries++;
    }

    this.queryStats.errorRate = this.queryStats.failedQueries / this.queryStats.totalQueries;
    this.queryStats.queriesPerSecond = this.calculateQPS();
  }

  /**
   * 处理慢查询
   */
  handleSlowQuery(queryData) {
    const severity = this.getQuerySeverity(queryData.executionTime);

    this.slowQueries.push({
      ...queryData,
      severity,
      timestamp: new Date(),
      recommendations: this.generateRecommendations(queryData)
    });

    // 保持慢查询记录在合理范围内
    if (this.slowQueries.length > this.config.maxSlowQueryHistory) {
      this.slowQueries = this.slowQueries.slice(-this.config.maxSlowQueryHistory * 0.8);
    }

    // 触发慢查询事件
    this.emit('query:slow', {
      query: queryData,
      severity
    });

    // 如果是严重慢查询，立即告警
    if (severity === 'critical') {
      this.triggerAlert('critical_slow_query', queryData);
    }
  }

  /**
   * 获取查询严重程度
   */
  getQuerySeverity(executionTime) {
    if (executionTime > this.config.criticalQueryThreshold) return 'critical';
    if (executionTime > this.config.verySlowQueryThreshold) return 'very_slow';
    if (executionTime > this.config.slowQueryThreshold) return 'slow';
    return 'normal';
  }

  /**
   * 分析查询模式
   */
  analyzeQueryPattern(queryData) {
    const pattern = this.extractPattern(queryData);
    const key = pattern.collection + ':' + pattern.operation;

    if (!this.queryPatterns.has(key)) {
      this.queryPatterns.set(key, {
        collection: pattern.collection,
        operation: pattern.operation,
        queryFields: pattern.fields,
        count: 0,
        totalExecutionTime: 0,
        averageExecutionTime: 0,
        slowCount: 0,
        lastExecuted: null,
        frequency: 0
      });
    }

    const stats = this.queryPatterns.get(key);
    stats.count++;
    stats.totalExecutionTime += queryData.executionTime;
    stats.averageExecutionTime = stats.totalExecutionTime / stats.count;
    stats.lastExecuted = queryData.startTime;

    if (queryData.executionTime > this.config.slowQueryThreshold) {
      stats.slowCount++;
    }

    // 计算频率（每分钟执行次数）
    const oneMinuteAgo = Date.now() - 60000;
    const recentQueries = this.queryHistory.filter(q =>
      q.collection === pattern.collection &&
      q.operation === pattern.operation &&
      q.startTime >= oneMinuteAgo
    );
    stats.frequency = recentQueries.length;

    // 如果频率高且性能差，生成优化建议
    if (this.config.optimization.enabled &&
        stats.count > this.config.optimization.minQueryFrequency &&
        stats.slowCount / stats.count > 0.3) {
      this.generatePatternOptimization(stats);
    }
  }

  /**
   * 提取查询模式
   */
  extractPattern(queryData) {
    return {
      collection: queryData.collection,
      operation: queryData.operation,
      fields: this.extractQueryFields(queryData.query || {}),
      hasIndex: queryData.explainPlan?.indexName !== 'COLLSCAN'
    };
  }

  /**
   * 提取查询字段
   */
  extractQueryFields(query) {
    const fields = [];
    const extractFields = (obj, prefix = '') => {
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          if (key.startsWith('$')) {
            fields.push(prefix + key);
          } else {
            extractFields(obj[key], prefix + key + '.');
          }
        } else {
          fields.push(prefix + key);
        }
      }
    };
    extractFields(query);
    return fields;
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(queryData) {
    const recommendations = [];

    // 检查执行计划
    if (queryData.explainPlan) {
      const { executionStats, executionStages } = queryData.explainPlan;

      // 集合扫描
      if (executionStages?.stage === 'COLLSCAN') {
        recommendations.push({
          type: 'index',
          priority: 'high',
          message: '查询执行了集合扫描，建议创建索引',
          suggestion: `为 ${queryData.collection} 集合的查询字段创建索引`
        });
      }

      // 效率低
      const efficiency = executionStats?.totalDocsReturned / executionStats?.totalDocsExamined;
      if (efficiency < 0.1) {
        recommendations.push({
          type: 'efficiency',
          priority: 'medium',
          message: '查询效率较低，扫描了过多文档',
          suggestion: '优化查询条件或创建复合索引'
        });
      }

      // 内存使用过多
      if (executionStats?.totalDocsExamined > 10000) {
        recommendations.push({
          type: 'memory',
          priority: 'medium',
          message: '查询扫描文档过多，可能消耗大量内存',
          suggestion: '考虑使用分页或限制返回字段'
        });
      }
    }

    // 基于执行时间的建议
    if (queryData.executionTime > this.config.verySlowQueryThreshold) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: '查询执行时间过长',
        suggestion: '检查查询条件、索引使用情况，或考虑使用聚合管道优化'
      });
    }

    return recommendations;
  }

  /**
   * 生成模式优化
   */
  generatePatternOptimization(pattern) {
    // 基于模式统计生成优化建议
    if (pattern.slowCount / pattern.count > 0.5) {
      this.emit('pattern:optimization', {
        pattern,
        suggestions: [
          {
            type: 'index',
            message: `为 ${pattern.collection} 的 ${pattern.operation} 操作创建索引`,
            fields: pattern.queryFields
          }
        ]
      });
    }
  }

  /**
   * 检查告警
   */
  checkAlerts() {
    const recentQueries = this.queryHistory.filter(q =>
      Date.now() - q.startTime < 60000 // 最近1分钟
    );

    // 慢查询数量告警
    const slowQueryCount = recentQueries.filter(q =>
      q.executionTime > this.config.slowQueryThreshold
    ).length;

    if (slowQueryCount > this.config.alerting.slowQueryCountThreshold) {
      this.triggerAlert('slow_query_count', {
        count: slowQueryCount,
        threshold: this.config.alerting.slowQueryCountThreshold
      });
    }

    // 平均响应时间告警
    const avgResponseTime = recentQueries.length > 0
      ? recentQueries.reduce((sum, q) => sum + q.executionTime, 0) / recentQueries.length
      : 0;

    if (avgResponseTime > this.config.alerting.averageResponseTimeThreshold) {
      this.triggerAlert('high_response_time', {
        average: avgResponseTime,
        threshold: this.config.alerting.averageResponseTimeThreshold
      });
    }

    // 错误率告警
    const errorRate = recentQueries.length > 0
      ? recentQueries.filter(q => q.status === 'error').length / recentQueries.length
      : 0;

    if (errorRate > this.config.alerting.errorRateThreshold) {
      this.triggerAlert('high_error_rate', {
        rate: errorRate,
        threshold: this.config.alerting.errorRateThreshold
      });
    }
  }

  /**
   * 触发告警
   */
  triggerAlert(type, data) {
    const alert = {
      id: Date.now(),
      type,
      timestamp: new Date(),
      data,
      severity: this.getAlertSeverity(type),
      acknowledged: false
    };

    this.alerts.push(alert);
    this.emit('alert', alert);

    // 保持告警记录在合理范围内
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-500);
    }
  }

  /**
   * 获取告警严重程度
   */
  getAlertSeverity(type) {
    const severityMap = {
      'critical_slow_query': 'critical',
      'high_response_time': 'high',
      'high_error_rate': 'high',
      'slow_query_count': 'medium'
    };
    return severityMap[type] || 'medium';
  }

  /**
   * 聚合数据
   */
  aggregateData() {
    const now = Date.now();
    const windowStart = now - this.config.aggregationWindow;

    const windowQueries = this.queryHistory.filter(q =>
      q.startTime >= windowStart && q.startTime < now
    );

    if (windowQueries.length === 0) return;

    const windowData = {
      startTime: windowStart,
      endTime: now,
      queryCount: windowQueries.length,
      totalExecutionTime: windowQueries.reduce((sum, q) => sum + q.executionTime, 0),
      averageExecutionTime: 0,
      slowQueryCount: windowQueries.filter(q => q.executionTime > this.config.slowQueryThreshold).length,
      errorCount: windowQueries.filter(q => q.status === 'error').length,
      qps: 0,
      errorRate: 0,
      slowQueryRate: 0
    };

    windowData.averageExecutionTime = windowData.totalExecutionTime / windowData.queryCount;
    windowData.qps = windowData.queryCount / (this.config.aggregationWindow / 1000);
    windowData.errorRate = windowData.errorCount / windowData.queryCount;
    windowData.slowQueryRate = windowData.slowQueryCount / windowData.queryCount;

    this.aggregatedData.windows.push(windowData);
    this.aggregatedData.currentWindow = windowData;

    // 更新实时数据
    this.aggregatedData.realtime = {
      qps: windowData.qps,
      avgResponseTime: windowData.averageExecutionTime,
      errorRate: windowData.errorRate,
      slowQueryRate: windowData.slowQueryRate
    };

    // 保持窗口历史在合理范围内
    if (this.aggregatedData.windows.length > 1440) { // 24小时
      this.aggregatedData.windows = this.aggregatedData.windows.slice(-720); // 12小时
    }

    this.emit('data:aggregated', windowData);
  }

  /**
   * 清理旧数据
   */
  cleanupOldData() {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24小时前

    // 清理查询历史
    this.queryHistory = this.queryHistory.filter(q => q.startTime > cutoffTime);

    // 清理慢查询历史
    this.slowQueries = this.slowQueries.filter(q => q.timestamp > cutoffTime);

    // 清理聚合窗口
    this.aggregatedData.windows = this.aggregatedData.windows.filter(w => w.endTime > cutoffTime);

    // 清理已确认的告警
    this.alerts = this.alerts.filter(a => !a.acknowledged && a.timestamp > cutoffTime);

    this.emit('data:cleaned');
  }

  /**
   * 计算QPS
   */
  calculateQPS() {
    const oneSecondAgo = Date.now() - 1000;
    const recentQueries = this.queryHistory.filter(q => q.startTime >= oneSecondAgo);
    return recentQueries.length;
  }

  /**
   * 计算结果大小
   */
  calculateResultSize(result) {
    if (!result) return 0;
    if (Array.isArray(result)) return result.length;
    return 1;
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(timeRange = '1h') {
    const timeRangeMs = this.parseTimeRange(timeRange);
    const cutoffTime = Date.now() - timeRangeMs;

    const relevantQueries = this.queryHistory.filter(q => q.startTime > cutoffTime);
    const relevantSlowQueries = this.slowQueries.filter(q => q.timestamp > cutoffTime);

    return {
      timeRange,
      summary: {
        totalQueries: relevantQueries.length,
        slowQueries: relevantSlowQueries.length,
        failedQueries: relevantQueries.filter(q => q.status === 'error').length,
        averageResponseTime: relevantQueries.length > 0
          ? relevantQueries.reduce((sum, q) => sum + q.executionTime, 0) / relevantQueries.length
          : 0,
        queriesPerSecond: this.calculateQPS(),
        errorRate: relevantQueries.length > 0
          ? relevantQueries.filter(q => q.status === 'error').length / relevantQueries.length
          : 0
      },
      slowQueries: relevantSlowQueries.slice(0, 20), // 前20个慢查询
      queryPatterns: Array.from(this.queryPatterns.values()).slice(0, 10), // 前10个查询模式
      alerts: this.alerts.filter(a => a.timestamp > cutoffTime && !a.acknowledged),
      recommendations: this.generateOverallRecommendations(relevantQueries, relevantSlowQueries)
    };
  }

  /**
   * 生成整体优化建议
   */
  generateOverallRecommendations(queries, slowQueries) {
    const recommendations = [];

    // 分析慢查询模式
    const slowQueryCollections = {};
    slowQueries.forEach(q => {
      if (!slowQueryCollections[q.collection]) {
        slowQueryCollections[q.collection] = 0;
      }
      slowQueryCollections[q.collection]++;
    });

    Object.entries(slowQueryCollections).forEach(([collection, count]) => {
      if (count > 5) {
        recommendations.push({
          type: 'index',
          priority: 'high',
          collection,
          message: `${collection} 集合有 ${count} 个慢查询，建议优化索引`,
          suggestion: '分析常用查询模式，创建合适的复合索引'
        });
      }
    });

    // 分析错误率
    const errorRate = queries.length > 0 ? queries.filter(q => q.status === 'error').length / queries.length : 0;
    if (errorRate > 0.05) {
      recommendations.push({
        type: 'error_handling',
        priority: 'high',
        message: `错误率过高: ${(errorRate * 100).toFixed(2)}%`,
        suggestion: '检查查询逻辑，增加错误处理和重试机制'
      });
    }

    // 分析查询频率
    const highFrequencyPatterns = Array.from(this.queryPatterns.values())
      .filter(p => p.frequency > 10 && p.averageExecutionTime > 500);

    highFrequencyPatterns.forEach(pattern => {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        collection: pattern.collection,
        operation: pattern.operation,
        message: `高频查询 ${pattern.collection}:${pattern.operation} 性能不佳`,
        suggestion: '考虑缓存或优化查询逻辑'
      });
    });

    return recommendations;
  }

  /**
   * 解析时间范围
   */
  parseTimeRange(range) {
    const unit = range.slice(-1);
    const value = parseInt(range.slice(0, -1));

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000; // 默认1小时
    }
  }

  /**
   * 重置监控数据
   */
  reset() {
    this.queryHistory = [];
    this.slowQueries = [];
    this.queryPatterns.clear();
    this.alerts = [];
    this.queryStats = {
      totalQueries: 0,
      totalExecutionTime: 0,
      slowQueries: 0,
      failedQueries: 0,
      averageResponseTime: 0,
      queriesPerSecond: 0,
      errorRate: 0
    };
    this.aggregatedData.windows = [];
    this.aggregatedData.currentWindow = null;

    this.emit('reset');
  }

  /**
   * 停止监控
   */
  stop() {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.emit('stopped');
  }
}

// 创建全局实例
const queryPerformanceMonitor = new QueryPerformanceMonitor();

module.exports = queryPerformanceMonitor;