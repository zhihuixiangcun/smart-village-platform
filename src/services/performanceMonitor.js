/**
 * 性能监控服务
 * 实时监控系统性能、数据库性能、缓存性能
 */

const EventEmitter = require('events');
const os = require('os');
const databaseManager = require('../config/database-optimized');
const cacheService = require('./cacheService');

class PerformanceMonitor extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.alerts = [];
    this.baseline = null;
    this.isMonitoring = false;
    this.intervals = new Map();

    // 配置
    this.config = {
      collectionInterval: parseInt(process.env.METRICS_COLLECTION_INTERVAL) || 60000, // 1分钟
      alertCheckInterval: parseInt(process.env.ALERT_CHECK_INTERVAL) || 300000, // 5分钟
      baselineUpdateInterval: parseInt(process.env.BASELINE_UPDATE_INTERVAL) || 3600000, // 1小时
      metricsRetentionPeriod: parseInt(process.env.METRICS_RETENTION_PERIOD) || 86400000, // 24小时
      alertThresholds: {
        memoryUsage: 80, // 百分比
        cpuUsage: 75, // 百分比
        errorRate: 5, // 百分比
        responseTime: 1000, // 毫秒
        cacheHitRate: 70 // 百分比
      }
    };
  }

  /**
   * 启动监控
   */
  async start() {
    if (this.isMonitoring) {
      logger.debug('⚠️  性能监控已在运行');
      return;
    }

    logger.debug('🚀 启动性能监控服务...');
    try {
      // 等待依赖服务就绪
      await this.waitForDependencies();

      // 启动指标收集
      this.startMetricsCollection();

      // 启动告警检查
      this.startAlertChecking();

      // 启动基线更新
      this.startBaselineUpdate();

      // 设置优雅关闭
      this.setupGracefulShutdown();

      this.isMonitoring = true;
      logger.debug('✅ 性能监控服务启动成功');
      this.emit('started');

    } catch (error) {
      logger.error('❌ 性能监控服务启动失败:', error);
      this.emit('error', error);
      throw error;
    }
  }

  async waitForDependencies() {
    // 等待数据库连接
    let retries = 0;
    while (retries < 30) {
      const dbHealth = await databaseManager.healthCheck();
      if (dbHealth.status === 'healthy') {
        logger.debug('✅ 数据库连接就绪');
        break;
      }
      retries++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 等待缓存服务
    try {
      await cacheService.initialize();
      logger.debug('✅ 缓存服务就绪');
    } catch (error) {
      logger.warn('⚠️  缓存服务未就绪:', error.message);
    }
  }

  startMetricsCollection() {
    const interval = setInterval(async () => {
      try {
        const metrics = await this.collectAllMetrics();
        const timestamp = Date.now();

        this.metrics.set(timestamp, metrics);
        this.cleanupOldMetrics();

        this.emit('metrics:collected', metrics);

      } catch (error) {
        logger.error('❌ 指标收集失败:', error);
        this.emit('error', error);
      }
    }, this.config.collectionInterval);

    this.intervals.set('metrics', interval);
    console.log(`📊 指标收集已启动 (间隔: ${this.config.collectionInterval / 1000}秒)`);
  }

  startAlertChecking() {
    const interval = setInterval(async () => {
      try {
        await this.checkAlerts();
      } catch (error) {
        logger.error('❌ 告警检查失败:', error);
      }
    }, this.config.alertCheckInterval);

    this.intervals.set('alerts', interval);
    console.log(`🚨 告警检查已启动 (间隔: ${this.config.alertCheckInterval / 1000}秒)`);
  }

  startBaselineUpdate() {
    const interval = setInterval(async () => {
      try {
        await this.updateBaseline();
      } catch (error) {
        logger.error('❌ 基线更新失败:', error);
      }
    }, this.config.baselineUpdateInterval);

    this.intervals.set('baseline', interval);
    console.log(`📈 基线更新已启动 (间隔: ${this.config.baselineUpdateInterval / 1000}秒)`);
  }

  /**
   * 收集所有指标
   */
  async collectAllMetrics() {
    const timestamp = Date.now();

    const metrics = {
      timestamp,
      system: await this.getSystemMetrics(),
      database: await this.getDatabaseMetrics(),
      cache: await this.getCacheMetrics(),
      application: await this.getApplicationMetrics(),
      custom: {}
    };

    // 获取自定义指标
    metrics.custom = await this.getCustomMetrics();

    return metrics;
  }

  async getSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const loadAvg = os.loadavg();

    return {
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024) // MB
      },
      cpu: {
        user: Math.round(cpuUsage.user / 1000000), // 秒
        system: Math.round(cpuUsage.system / 1000000), // 秒
        loadAverage: loadAvg.map(load => Math.round(load * 100) / 100),
        cpuCount: os.cpus().length
      },
      system: {
        uptime: os.uptime(),
        freeMemory: Math.round(os.freemem() / 1024 / 1024), // MB
        totalMemory: Math.round(os.totalmem() / 1024 / 1024), // MB
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version
      }
    };
  }

  async getDatabaseMetrics() {
    try {
      const connectionStats = await databaseManager.getConnectionStats();
      const health = await databaseManager.healthCheck();

      return {
        health: health.status,
        connections: connectionStats,
        queryStats: await this.getDatabaseQueryStats()
      };
    } catch (error) {
      return {
        health: 'error',
        error: error.message
      };
    }
  }

  async getDatabaseQueryStats() {
    // 这里可以实现查询统计逻辑
    return {
      slowQueries: 0,
      avgQueryTime: 0,
      totalQueries: 0
    };
  }

  async getCacheMetrics() {
    try {
      const cacheStats = cacheService.getStats();
      const health = await cacheService.healthCheck();

      return {
        health: health.status,
        l1: {
          hitRate: cacheStats.l1.hitRate,
          hits: cacheStats.l1.hits,
          misses: cacheStats.l1.misses,
          errors: cacheStats.l1.errors
        },
        l2: {
          hitRate: cacheStats.l2.hitRate,
          hits: cacheStats.l2.hits,
          misses: cacheStats.l2.misses,
          errors: cacheStats.l2.errors
        },
        total: {
          hitRate: cacheStats.total.hitRate,
          hits: cacheStats.total.hits,
          misses: cacheStats.total.misses,
          operations: cacheStats.total.operations
        }
      };
    } catch (error) {
      return {
        health: 'error',
        error: error.message
      };
    }
  }

  async getApplicationMetrics() {
    // 获取应用级别的指标
    return {
      activeConnections: this.getActiveConnections(),
      requestRate: this.getRequestRate(),
      errorRate: this.getErrorRate(),
      avgResponseTime: this.getAverageResponseTime()
    };
  }

  async getCustomMetrics() {
    // 可以在这里添加自定义业务指标
    return {
      registeredUsers: await this.getRegisteredUsersCount(),
      activeVillages: await this.getActiveVillagesCount(),
      todayTransactions: await this.getTodayTransactionsCount()
    };
  }

  // 自定义指标获取方法
  async getRegisteredUsersCount() {
    try {
      const User = require('../models/User');
      return await User.countDocuments({ status: 'active' });
    } catch (error) {
      return 0;
    }
  }

  async getActiveVillagesCount() {
    try {
      const Village = require('../models/Village');
      return await Village.countDocuments({ status: 'active' });
    } catch (error) {
      return 0;
    }
  }

  async getTodayTransactionsCount() {
    try {
      const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return await Transaction.countDocuments({
        createdAt: { $gte: today }
      });
    } catch (error) {
      return 0;
    }
  }

  getActiveConnections() {
    // 实现获取活跃连接数
    return 0;
  }

  getRequestRate() {
    // 计算请求率
    const recentMetrics = Array.from(this.metrics.values()).slice(-10);
    if (recentMetrics.length < 2) return 0;

    const timeSpan = recentMetrics[recentMetrics.length - 1].timestamp - recentMetrics[0].timestamp;
    return Math.round((recentMetrics.length * 60000) / timeSpan); // 请求/分钟
  }

  getErrorRate() {
    // 计算错误率
    return 0; // 实际实现中应该基于错误日志计算
  }

  getAverageResponseTime() {
    // 计算平均响应时间
    return 0; // 实际实现中应该基于请求日志计算
  }

  /**
   * 清理旧指标
   */
  cleanupOldMetrics() {
    const cutoff = Date.now() - this.config.metricsRetentionPeriod;
    for (const [timestamp] of this.metrics.entries()) {
      if (timestamp < cutoff) {
        this.metrics.delete(timestamp);
      }
    }
  }

  /**
   * 检查告警
   */
  async checkAlerts() {
    const latestMetrics = this.metrics.get(Math.max(...this.metrics.keys()));
    if (!latestMetrics) return;

    // 检查内存使用率
    const memoryUsage = (latestMetrics.system.memory.heapUsed / latestMetrics.system.memory.heapTotal) * 100;
    if (memoryUsage > this.config.alertThresholds.memoryUsage) {
      this.addAlert('HIGH_MEMORY_USAGE', `内存使用率过高: ${memoryUsage.toFixed(2)}%`);
    }

    // 检查CPU负载
    const cpuLoad = latestMetrics.system.cpu.loadAverage[0];
    const cpuCount = latestMetrics.system.cpu.cpuCount;
    const cpuUsage = (cpuLoad / cpuCount) * 100;
    if (cpuUsage > this.config.alertThresholds.cpuUsage) {
      this.addAlert('HIGH_CPU_USAGE', `CPU使用率过高: ${cpuUsage.toFixed(2)}%`);
    }

    // 检查缓存命中率
    if (latestMetrics.cache.total.hitRate < this.config.alertThresholds.cacheHitRate) {
      this.addAlert('LOW_CACHE_HIT_RATE', `缓存命中率过低: ${latestMetrics.cache.total.hitRate.toFixed(2)}%`);
    }

    // 检查数据库连接
    if (latestMetrics.database.health !== 'healthy') {
      this.addAlert('DATABASE_UNHEALTHY', '数据库连接异常');
    }

    // 检查应用错误率
    if (latestMetrics.application.errorRate > this.config.alertThresholds.errorRate) {
      this.addAlert('HIGH_ERROR_RATE', `错误率过高: ${latestMetrics.application.errorRate.toFixed(2)}%`);
    }
  }

  addAlert(type, message) {
    const alert = {
      id: Date.now(),
      type,
      message,
      severity: this.getAlertSeverity(type),
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(alert);
    this.emit('alert', alert);

    console.warn(`🚨 性能告警 [${alert.severity.toUpperCase()}]: ${message}`);
  }

  getAlertSeverity(type) {
    const severityMap = {
      'HIGH_MEMORY_USAGE': 'critical',
      'HIGH_CPU_USAGE': 'warning',
      'LOW_CACHE_HIT_RATE': 'warning',
      'DATABASE_UNHEALTHY': 'critical',
      'HIGH_ERROR_RATE': 'critical'
    };
    return severityMap[type] || 'info';
  }

  /**
   * 更新性能基线
   */
  async updateBaseline() {
    const recentMetrics = Array.from(this.metrics.values()).slice(-60); // 最近1小时

    if (recentMetrics.length < 30) {
      logger.debug('⚠️  数据不足，跳过基线更新');
      return;
    }

    const baseline = {
      timestamp: Date.now(),
      system: {
        memory: {
          avg: this.average(recentMetrics.map(m => m.system.memory.heapUsed)),
          max: Math.max(...recentMetrics.map(m => m.system.memory.heapUsed))
        },
        cpu: {
          avg: this.average(recentMetrics.map(m => m.system.cpu.loadAverage[0]))
        }
      },
      cache: {
        avgHitRate: this.average(recentMetrics.map(m => m.cache.total.hitRate))
      },
      application: {
        avgRequestRate: this.average(recentMetrics.map(m => m.application.requestRate))
      }
    };

    this.baseline = baseline;
    logger.debug('📈 性能基线已更新');
    this.emit('baseline:updated', baseline);
  }

  average(arr) {
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  /**
   * 获取性能报告
   */
  async getPerformanceReport() {
    const latestMetrics = this.metrics.get(Math.max(...this.metrics.keys()));
    const recentMetrics = Array.from(this.metrics.values()).slice(-24); // 最近24个数据点

    return {
      timestamp: new Date(),
      current: latestMetrics,
      trends: this.calculateTrends(recentMetrics),
      baseline: this.baseline,
      alerts: this.alerts.filter(a => !a.resolved).slice(-10),
      summary: this.generateSummary(latestMetrics, recentMetrics)
    };
  }

  calculateTrends(metrics) {
    if (metrics.length < 2) return {};

    const half = Math.floor(metrics.length / 2);
    const firstHalf = metrics.slice(0, half);
    const secondHalf = metrics.slice(half);

    return {
      memory: this.calculateTrend(firstHalf.map(m => m.system.memory.heapUsed), secondHalf.map(m => m.system.memory.heapUsed)),
      cpu: this.calculateTrend(firstHalf.map(m => m.system.cpu.loadAverage[0]), secondHalf.map(m => m.system.cpu.loadAverage[0])),
      cacheHitRate: this.calculateTrend(firstHalf.map(m => m.cache.total.hitRate), secondHalf.map(m => m.cache.total.hitRate))
    };
  }

  calculateTrend(firstHalf, secondHalf) {
    const firstAvg = this.average(firstHalf);
    const secondAvg = this.average(secondHalf);
    const trend = ((secondAvg - firstAvg) / firstAvg) * 100;

    return {
      trend: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable',
      percentage: Math.abs(trend),
      values: [firstAvg, secondAvg]
    };
  }

  generateSummary(current, recent) {
    return {
      status: this.getOverallStatus(current),
      recommendations: this.getRecommendations(current),
      healthScore: this.calculateHealthScore(current)
    };
  }

  getOverallStatus(metrics) {
    if (!metrics) return 'unknown';

    let issues = 0;

    if (metrics.database.health !== 'healthy') issues++;
    if (metrics.cache.health !== 'healthy') issues++;

    const memoryUsage = (metrics.system.memory.heapUsed / metrics.system.memory.heapTotal) * 100;
    if (memoryUsage > 80) issues++;

    const cpuLoad = metrics.system.cpu.loadAverage[0] / metrics.system.cpu.cpuCount;
    if (cpuLoad > 0.8) issues++;

    if (issues === 0) return 'healthy';
    if (issues <= 2) return 'warning';
    return 'critical';
  }

  getRecommendations(metrics) {
    const recommendations = [];

    if (metrics && metrics.system) {
      const memoryUsage = (metrics.system.memory.heapUsed / metrics.system.memory.heapTotal) * 100;
      if (memoryUsage > 70) {
        recommendations.push('考虑增加内存或优化内存使用');
      }

      const cpuLoad = metrics.system.cpu.loadAverage[0] / metrics.system.cpu.cpuCount;
      if (cpuLoad > 0.7) {
        recommendations.push('考虑增加CPU或优化CPU使用');
      }
    }

    if (metrics && metrics.cache && metrics.cache.total.hitRate < 70) {
      recommendations.push('优化缓存策略以提高命中率');
    }

    return recommendations;
  }

  calculateHealthScore(metrics) {
    if (!metrics) return 0;

    let score = 100;

    // 数据库健康 (30%)
    if (metrics.database.health === 'healthy') {
      score -= 0;
    } else {
      score -= 30;
    }

    // 缓存健康 (20%)
    if (metrics.cache.health === 'healthy') {
      score -= 0;
    } else {
      score -= 20;
    }

    // 内存使用 (20%)
    const memoryUsage = (metrics.system.memory.heapUsed / metrics.system.memory.heapTotal) * 100;
    if (memoryUsage > 90) {
      score -= 20;
    } else if (memoryUsage > 70) {
      score -= 10;
    }

    // CPU使用 (15%)
    const cpuLoad = metrics.system.cpu.loadAverage[0] / metrics.system.cpu.cpuCount;
    if (cpuLoad > 0.9) {
      score -= 15;
    } else if (cpuLoad > 0.7) {
      score -= 7;
    }

    // 缓存命中率 (15%)
    if (metrics.cache.total.hitRate < 50) {
      score -= 15;
    } else if (metrics.cache.total.hitRate < 70) {
      score -= 7;
    }

    return Math.max(0, score);
  }

  /**
   * 设置优雅关闭
   */
  setupGracefulShutdown() {
    const shutdown = async () => {
      logger.debug('🔄 关闭性能监控服务...');
      this.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  /**
   * 停止监控
   */
  stop() {
    if (!this.isMonitoring) return;

    // 清理定时器
    for (const [name, interval] of this.intervals.entries()) {
      clearInterval(interval);
    }
    this.intervals.clear();

    // 清理数据
    this.metrics.clear();
    this.alerts = [];

    this.isMonitoring = false;
    logger.debug('✅ 性能监控服务已停止');
    this.emit('stopped');
  }
}

// 创建单例实例
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;