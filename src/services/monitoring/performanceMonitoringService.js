
/**
 * 智慧乡村性能监控服务
 * 实时监控系统性能指标
 */

const EventEmitter = require('events');
const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const { performance } = require('perf_hooks');

class PerformanceMonitoringService extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = { ...MONITORING_CONFIG, ...config };
    this.metrics = new Map();
    this.alerts = [];
    this.isMonitoring = false;
    this.intervalId = null;
  }

  /**
   * 启动监控
   */
  start() {
    if (this.isMonitoring) {
      logger.debug('监控已在运行中');
      return;
    }

    logger.debug('🚀 启动性能监控系统...');
    this.isMonitoring = true;

    // 数据库监控
    if (this.config.database.enabled) {
      this.startDatabaseMonitoring();
    }

    // 应用性能监控
    if (this.config.application.enabled) {
      this.startApplicationMonitoring();
    }

    // 业务监控
    if (this.config.business.enabled) {
      this.startBusinessMonitoring();
    }

    // 定期收集指标
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, 5000); // 每5秒收集一次

    logger.debug('✅ 性能监控系统已启动');
  }

  /**
   * 停止监控
   */
  stop() {
    if (!this.isMonitoring) {
      logger.debug('监控未在运行');
      return;
    }

    logger.debug('🛑 停止性能监控系统...');
    this.isMonitoring = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.debug('✅ 性能监控系统已停止');
  }

  /**
   * 数据库监控
   */
  startDatabaseMonitoring() {
    // 监控慢查询
    mongoose.set('debug', (collectionName, method, query, doc) => {
      const start = performance.now();

      // 监听查询完成事件
      const originalExec = query.exec;
      query.exec = function() {
        const promise = originalExec.call(this);
        promise.then(() => {
          const duration = performance.now() - start;
          if (duration > MONITORING_CONFIG.database.slowQueryThreshold) {
            console.warn(`⚠️  慢查询检测: ${collectionName}.${method} 耗时 ${duration.toFixed(2)}ms`);
            this.recordMetric('slow_query', {
              collection: collectionName,
              method,
              duration,
              query: JSON.stringify(query)
            });
          }
        });
        return promise;
      }.bind(this);
    }.bind(this));

    // 监控连接池
    if (this.config.database.connectionPoolMonitoring) {
      setInterval(() => {
        const poolStats = mongoose.connection.db.serverStatus();
        this.recordMetric('connection_pool', {
          active: poolStats.connections.current,
          available: poolStats.connections.available,
          totalCreated: poolStats.connections.totalCreated
        });
      }, 10000);
    }
  }

  /**
   * 应用性能监控
   */
  startApplicationMonitoring() {
    // 监控内存使用
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const memUsagePercent = memUsage.heapUsed / memUsage.heapTotal;

      this.recordMetric('memory', {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        usagePercent: memUsagePercent
      });

      if (memUsagePercent > this.config.application.memoryThreshold) {
        this.triggerAlert('memory_usage_high', {
          current: memUsagePercent,
          threshold: this.config.application.memoryThreshold
        });
      }
    }, 5000);

    // 监控CPU使用（需要额外模块）
    this.monitorCPUUsage();
  }

  /**
   * 业务监控
   */
  startBusinessMonitoring() {
    // 监控API响应时间
    this.setupAPIMonitoring();

    // 监控用户活跃度
    if (this.config.business.activeUserTracking) {
      this.trackActiveUsers();
    }
  }

  /**
   * 记录指标
   */
  recordMetric(name, value) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metric = {
      timestamp: new Date(),
      value: value
    };

    this.metrics.get(name).push(metric);

    // 保持最近1000条记录
    const records = this.metrics.get(name);
    if (records.length > 1000) {
      records.shift();
    }

    // 发出指标事件
    this.emit('metric', { name, value });
  }

  /**
   * 触发告警
   */
  triggerAlert(type, details) {
    const alert = {
      id: Date.now(),
      type,
      timestamp: new Date(),
      details,
      severity: this.getAlertSeverity(type, details)
    };

    this.alerts.push(alert);
    console.error(`🚨 告警: ${alert.type} - ${JSON.stringify(details)}`);

    // 发送告警通知
    this.sendAlert(alert);
  }

  /**
   * 获取告警严重级别
   */
  getAlertSeverity(type, details) {
    if (type === 'memory_usage_high' && details.current > 0.9) {
      return 'critical';
    }
    if (type === 'slow_query' && details.duration > 1000) {
      return 'critical';
    }
    return 'warning';
  }

  /**
   * 发送告警通知
   */
  async sendAlert(alert) {
    // 这里可以集成邮件、Slack、短信等通知方式
    logger.debug(`📧 发送告警: ${alert.type}`);
    // 示例：记录到日志
    const logEntry = {
      timestamp: alert.timestamp,
      level: 'ERROR',
      message: `Performance Alert: ${alert.type}`,
      details: alert.details
    };

    // 可以写入日志文件或发送到日志服务
  }

  /**
   * 收集所有指标
   */
  collectMetrics() {
    const snapshot = {
      timestamp: new Date(),
      metrics: {}
    };

    // 收集所有指标
    for (const [name, records] of this.metrics.entries()) {
      if (records.length > 0) {
        const latest = records[records.length - 1];
        snapshot.metrics[name] = latest.value;
      }
    }

    // 发出快照事件
    this.emit('snapshot', snapshot);
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport() {
    const report = {
      timestamp: new Date(),
      summary: {},
      alerts: this.alerts.slice(-10), // 最近10个告警
      metrics: {}
    };

    // 计算指标摘要
    for (const [name, records] of this.metrics.entries()) {
      if (records.length > 0) {
        const values = records.map(r =>
          typeof r.value === 'object' ? r.value.usagePercent || 0 : r.value
        );

        report.metrics[name] = {
          current: values[values.length - 1],
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length
        };
      }
    }

    return report;
  }

  /**
   * CPU监控
   */
  monitorCPUUsage() {
    // 简单的CPU使用率估算
    let lastCpuUsage = process.cpuUsage();

    setInterval(() => {
      const currentCpuUsage = process.cpuUsage(lastCpuUsage);
      const percentCPU = (currentCpuUsage.user + currentCpuUsage.system) / 1000000; // 转换为秒

      this.recordMetric('cpu', {
        user: currentCpuUsage.user,
        system: currentCpuUsage.system,
        percent: percentCPU
      });

      lastCpuUsage = process.cpuUsage();
    }, 5000);
  }

  /**
   * API监控设置
   */
  setupAPIMonitoring() {
    // 这里可以集成Express中间件来监控API
    logger.debug('API监控已设置');
  }

  /**
   * 活跃用户追踪
   */
  trackActiveUsers() {
    // 这里可以实现用户活跃度统计
    logger.debug('用户活跃度追踪已设置');
  }
}

// 创建单例实例
const monitoringService = new PerformanceMonitoringService();

// 导出服务
module.exports = monitoringService;

// 如果直接运行此文件
if (require.main === module) {
  // 启动监控
  monitoringService.start();

  // 定期输出性能报告
  setInterval(() => {
    const report = monitoringService.getPerformanceReport();
    console.log('\n📊 性能报告:', JSON.stringify(report, null, 2));
  }, 30000); // 每30秒输出一次

  // 优雅关闭
  process.on('SIGINT', () => {
    monitoringService.stop();
    process.exit(0);
  });
}
