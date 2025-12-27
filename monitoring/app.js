/**
 * 监控服务主应用
 * 整合业务指标收集、告警管理、链路追踪和监控仪表板
 */

require('dotenv').config();
const BusinessMetricsCollector = require('./services/BusinessMetricsCollector');
const AlertManager = require('./services/AlertManager');
const DistributedTracing = require('./services/DistributedTracing');
const MetricsDashboard = require('./dashboards/MetricsDashboard');
const logger = require('./../src/services/performanceMonitor').logger;

class MonitoringService {
  constructor() {
    this.metricsCollector = new BusinessMetricsCollector();
    this.alertManager = new AlertManager();
    this.tracing = new DistributedTracing();
    this.dashboard = new MetricsDashboard();
    this.isRunning = false;
    this.startTime = Date.now();

    // 服务配置
    this.config = {
      serviceName: 'monitoring-service',
      version: process.env.MONITORING_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * 启动监控服务
   */
  async start() {
    if (this.isRunning) {
      logger.warn('监控服务已在运行');
      return;
    }

    try {
      logger.info('启动监控服务...', {
        service: this.config.serviceName,
        version: this.config.version,
        environment: this.config.environment
      });

      // 启动各个组件
      await this.startMetricsCollector();
      await this.startAlertManager();
      await this.startDistributedTracing();
      await this.startMetricsDashboard();

      // 设置组件间的事件通信
      this.setupEventHandlers();

      // 启动健康检查
      this.startHealthCheck();

      this.isRunning = true;
      this.startTime = Date.now();

      logger.info('监控服务启动成功', {
        uptime: 0,
        components: ['metrics', 'alerts', 'tracing', 'dashboard'].length
      });

      // 发出启动完成事件
      this.emit('started');

    } catch (error) {
      logger.error('启动监控服务失败:', error);
      throw error;
    }
  }

  /**
   * 停止监控服务
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    try {
      logger.info('正在停止监控服务...');

      // 停止各个组件
      await this.dashboard.stop();
      await this.tracing.stop();
      await this.alertManager.stop();
      await this.metricsCollector.stop();

      logger.info('监控服务已停止');

      // 发出停止完成事件
      this.emit('stopped');

    } catch (error) {
      logger.error('停止监控服务失败:', error);
    }
  }

  /**
   * 启动指标收集器
   */
  async startMetricsCollector() {
    await this.metricsCollector.start();
    logger.info('业务指标收集器启动成功');
  }

  /**
   * 启动告警管理器
   */
  async startAlertManager() {
    await this.alertManager.start();
    logger.info('告警管理器启动成功');
  }

  /**
   * 启动分布式链路追踪
   */
  async startDistributedTracing() {
    await this.tracing.start();
    logger.info('分布式链路追踪启动成功');
  }

  /**
   * 启动监控仪表板
   */
  async startMetricsDashboard() {
    await this.dashboard.start();
    logger.info('监控仪表板启动成功');
  }

  /**
   * 设置组件间的事件通信
   */
  setupEventHandlers() {
    // 指标更新事件转发给告警管理器
    this.metricsCollector.on('metric', (metricData) => {
      this.alertManager.emit('metric', metricData);
    });

    // 告警事件转发给仪表板
    this.alertManager.on('alert', (alert) => {
      this.dashboard.emit('alert', alert);
    });

    this.alertManager.on('alert_resolved', (alert) => {
      this.dashboard.emit('alert_resolved', alert);
    });

    // 链路追踪事件
    this.tracing.on('trace_finished', (trace) => {
      logger.debug('链路完成:', {
        traceId: trace.traceId,
        duration: trace.duration,
        spanCount: trace.spans.length
      });
    });

    this.tracing.on('span_finished', (span) => {
      // 记录性能指标
      if (span.tags['http.status_code']) {
        this.metricsCollector.recordResponseTime(span.duration);
        this.metricsCollector.recordRequest();

        if (span.tags['http.status_code'] >= 400) {
          // 记录错误指标
        }
      }
    });
  }

  /**
   * 启动健康检查
   */
  startHealthCheck() {
    setInterval(async () => {
      if (!this.isRunning) return;

      try {
        const health = await this.getHealthStatus();

        // 检查组件健康状态
        const issues = [];
        if (health.metrics.status !== 'healthy') {
          issues.push('指标收集器异常');
        }
        if (health.alerts.status !== 'healthy') {
          issues.push('告警管理器异常');
        }
        if (health.tracing.status !== 'healthy') {
          issues.push('链路追踪异常');
        }
        if (health.dashboard.status !== 'healthy') {
          issues.push('监控仪表板异常');
        }

        if (issues.length > 0) {
          logger.warn('监控服务健康检查发现问题:', issues);
          this.emit('health_issue', issues);
        }

      } catch (error) {
        logger.error('健康检查失败:', error);
      }
    }, 30000); // 30秒检查一次
  }

  /**
   * 获取服务健康状态
   */
  async getHealthStatus() {
    try {
      const metrics = await this.metricsCollector.getAllMetrics();
      const alerts = this.alertManager.getActiveAlerts();
      const tracing = this.tracing.getTraceStats();
      const dashboard = this.dashboard.getDashboardStats();

      return {
        service: {
          name: this.config.serviceName,
          version: this.config.version,
          environment: this.config.environment,
          status: this.isRunning ? 'healthy' : 'stopped',
          uptime: this.isRunning ? Date.now() - this.startTime : 0
        },
        metrics: {
          status: 'healthy',
          count: Object.keys(metrics).length,
          lastUpdate: Date.now()
        },
        alerts: {
          status: alerts.length === 0 ? 'healthy' : 'warning',
          active: alerts.length,
          critical: alerts.filter(a => a.severity === 'critical').length
        },
        tracing: {
          status: 'healthy',
          activeTraces: tracing.activeTraces,
          activeSpans: tracing.activeSpans,
          samplingRate: tracing.samplingRate
        },
        dashboard: {
          status: dashboard.connectedClients > 0 ? 'healthy' : 'warning',
          connectedClients: dashboard.connectedClients,
          activeSubscriptions: dashboard.activeSubscriptions
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('获取健康状态失败:', error);
      return {
        service: {
          name: this.config.serviceName,
          status: 'error',
          error: error.message
        }
      };
    }
  }

  /**
   * 获取监控概览
   */
  async getMonitoringOverview() {
    try {
      const [
        metrics,
        alerts,
        tracingStats,
        dashboardStats,
        health
      ] = await Promise.all([
        this.metricsCollector.getAllMetrics(),
        this.alertManager.getAlertStats(),
        Promise.resolve(this.tracing.getTraceStats()),
        Promise.resolve(this.dashboard.getDashboardStats()),
        this.getHealthStatus()
      ]);

      return {
        health,
        metrics,
        alerts,
        tracing: tracingStats,
        dashboard: dashboardStats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('获取监控概览失败:', error);
      throw error;
    }
  }

  /**
   * 创建中间件
   */
  createMiddleware() {
    const monitoring = this;

    return {
      // 链路追踪中间件
      tracing: this.tracing.middleware(),

      // 指标记录中间件
      metrics: (req, res, next) => {
        const startTime = Date.now();

        // 记录请求开始
        monitoring.metricsCollector.recordUserActivity(req.user?.id, 'api_request');

        res.on('finish', () => {
          const duration = Date.now() - startTime;
          monitoring.metricsCollector.recordResponseTime(duration);
          monitoring.metricsCollector.recordRequest();

          // 记录用户活动
          if (req.user) {
            monitoring.metricsCollector.recordUserActivity(req.user.id, 'api_response');
          }
        });

        next();
      },

      // 错误记录中间件
      errorLogging: (error, req, res, next) => {
        logger.error('API错误:', {
          error: error.message,
          stack: error.stack,
          url: req.url,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        // 记录错误到告警系统
        monitoring.metricsCollector.recordRequest();

        next(error);
      },

      // 综合中间件（包含所有功能）
      all: (req, res, next) => {
        // 链路追踪
        const traceContext = monitoring.tracing.getTraceContext(req);
        if (traceContext.sampled) {
          const span = monitoring.tracing.createHttpSpan(req, res, {
            traceId: traceContext.traceId,
            parentSpanId: traceContext.parentSpanId
          });
          req.traceContext = { ...traceContext, span };
        }

        // 指标记录
        const startTime = Date.now();
        monitoring.metricsCollector.recordRequest();

        res.on('finish', () => {
          const duration = Date.now() - startTime;
          monitoring.metricsCollector.recordResponseTime(duration);

          if (traceContext.sampled && req.traceContext?.span) {
            req.traceContext.span.finish({
              tags: {
                'http.status_code': res.statusCode,
                'response.size': res.get('content-length') || 0
              }
            });
          }
        });

        next();
      }
    };
  }

  /**
   * 工具函数
   */
  wrapFunction(fn, options = {}) {
    return this.tracing.wrapFunction(fn, {
      component: 'monitoring',
      ...options
    });
  }

  /**
   * 记录业务事件
   */
  recordBusinessEvent(eventName, data, userId = null) {
    this.metricsCollector.recordUserActivity(userId, eventName);

    // 发出业务事件
    this.emit('business_event', {
      eventName,
      data,
      userId,
      timestamp: Date.now()
    });
  }

  /**
   * 记录性能指标
   */
  recordPerformanceMetrics(operation, duration, tags = {}) {
    this.metricsCollector.recordResponseTime(duration);

    // 创建链路追踪Span
    if (this.tracing.isRunning) {
      const span = this.tracing.createSpan(operation, {
        kind: 'internal',
        component: 'performance',
        tags: {
          duration,
          ...tags
        }
      });
      span.finish();
    }
  }

  /**
   * 自定义告警规则
   */
  addCustomAlertRule(ruleId, rule) {
    this.alertManager.addAlertRule(ruleId, rule);
  }

  /**
   * 设置告警抑制
   */
  suppressAlerts(ruleId, startTime, endTime, reason) {
    this.alertManager.addSuppressionRule(`suppression_${ruleId}`, {
      name: `抑制规则: ${ruleId}`,
      condition: ruleId,
      startTime,
      endTime,
      reason,
      createdBy: 'system'
    });
  }
}

// 创建单例实例
const monitoringService = new MonitoringService();

// 导出服务实例和类
module.exports = {
  MonitoringService,
  monitoringService
};

// 如果直接运行此文件，启动监控服务
if (require.main === module) {
  monitoringService.start().catch(error => {
    logger.error('启动监控服务失败:', error);
    process.exit(1);
  });

  // 优雅关闭
  process.on('SIGINT', async () => {
    logger.info('收到SIGINT信号，正在关闭监控服务...');
    await monitoringService.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('收到SIGTERM信号，正在关闭监控服务...');
    await monitoringService.stop();
    process.exit(0);
  });
}