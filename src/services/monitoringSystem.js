/**
 * 智慧村庄运维监控系统
 * Smart Village Operations Monitoring System
 *
 * 功能：提供全方位的系统监控、告警、分析和运维管理
 * Features: Comprehensive system monitoring, alerting, analytics, and operations management
 */

const EventEmitter = require('events');
const cron = require('node-cron');
const winston = require('winston');
const mongoose = require('mongoose');
const { promisify } = require('util');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// 监控指标模型
const MonitoringMetricSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  metricName: { type: String, required: true, index: true },
  metricType: {
    type: String,
    required: true,
    enum: ['counter', 'gauge', 'histogram', 'summary'],
    index: true
  },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  labels: { type: mongoose.Schema.Types.Mixed, default: {} },
  unit: { type: String },
  description: { type: String },
  source: {
    service: String,
    instance: String,
    environment: String
  },
  tags: [String]
}, {
  collection: 'monitoring_metrics',
  timestamps: false
});

// 告警规则模型
const AlertRuleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  enabled: { type: Boolean, default: true },
  severity: {
    type: String,
    required: true,
    enum: ['info', 'warning', 'critical', 'emergency']
  },
  conditions: [{
    metric: { type: String, required: true },
    operator: {
      type: String,
      required: true,
      enum: ['gt', 'lt', 'eq', 'ne', 'gte', 'lte', 'contains', 'regex']
    },
    threshold: { type: mongoose.Schema.Types.Mixed, required: true },
    duration: { type: Number, default: 300 } // 持续时间（秒）
  }],
  filters: [{
    field: String,
    operator: String,
    value: mongoose.Schema.Types.Mixed
  }],
  actions: [{
    type: {
      type: String,
      required: true,
      enum: ['email', 'sms', 'webhook', 'slack', 'dingtalk']
    },
    config: { type: mongoose.Schema.Types.Mixed, required: true },
    enabled: { type: Boolean, default: true }
  }],
  schedule: {
    enabled: { type: Boolean, default: true },
    cron: { type: String, default: '*/1 * * * *' } // 每分钟检查
  },
  cooldown: { type: Number, default: 300 }, // 冷却时间（秒）
  lastTriggered: { type: Date },
  triggerCount: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'alert_rules'
});

// 告警事件模型
const AlertEventSchema = new mongoose.Schema({
  ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'AlertRule', required: true },
  ruleName: { type: String, required: true },
  severity: { type: String, required: true },
  status: {
    type: String,
    required: true,
    enum: ['firing', 'resolved', 'suppressed'],
    default: 'firing'
  },
  message: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed },
  labels: { type: mongoose.Schema.Types.Mixed, default: {} },
  annotations: { type: mongoose.Schema.Types.Mixed, default: {} },
  startsAt: { type: Date, default: Date.now },
  endsAt: { type: Date },
  duration: { type: Number }, // 持续时间（秒）
  fingerprint: { type: String, required: true, index: true },
  notificationsSent: [{
    type: String,
    sentAt: { type: Date, default: Date.now },
    success: { type: Boolean, default: true },
    error: String
  }],
  acknowledged: {
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date },
    comment: String
  }
}, {
  collection: 'alert_events',
  timestamps: true
});

// 系统健康状态模型
const SystemHealthSchema = new mongoose.Schema({
  component: { type: String, required: true, index: true },
  status: {
    type: String,
    required: true,
    enum: ['healthy', 'degraded', 'unhealthy', 'unknown']
  },
  lastCheck: { type: Date, default: Date.now },
  responseTime: { type: Number }, // 响应时间（毫秒）
  errorRate: { type: Number, default: 0 }, // 错误率（百分比）
  availability: { type: Number, default: 100 }, // 可用性（百分比）
  details: { type: mongoose.Schema.Types.Mixed },
  checks: [{
    name: String,
    status: { type: String, enum: ['pass', 'fail', 'warn'] },
    message: String,
    timestamp: { type: Date, default: Date.now }
  }]
}, {
  collection: 'system_health',
  timestamps: true
});

class MonitoringSystem extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      metricsRetention: {
        raw: config.metricsRetention?.raw || 7 * 24 * 60 * 60 * 1000, // 7天
        aggregated: config.metricsRetention?.aggregated || 30 * 24 * 60 * 60 * 1000 // 30天
      },
      alertCheckInterval: config.alertCheckInterval || 60000, // 1分钟
      healthCheckInterval: config.healthCheckInterval || 30000, // 30秒
      maxAlertEvents: config.maxAlertEvents || 10000,
      notificationTimeout: config.notificationTimeout || 10000,
      aggregationWindow: config.aggregationWindow || 60000, // 1分钟
      ...config
    };

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'monitoring-system' },
      transports: [
        new winston.transports.File({ filename: 'logs/monitoring.log' }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });

    this.metricsBuffer = new Map(); // 指标缓冲区
    this.alertStates = new Map(); // 告警状态
    this.healthChecks = new Map(); // 健康检查
    this.notificationQueue = []; // 通知队列

    this.initializeModels();
    this.startScheduler();
    this.initializeHealthChecks();
  }

  /**
   * 初始化数据模型
   */
  initializeModels() {
    try {
      this.MonitoringMetric = mongoose.model('MonitoringMetric', MonitoringMetricSchema);
      this.AlertRule = mongoose.model('AlertRule', AlertRuleSchema);
      this.AlertEvent = mongoose.model('AlertEvent', AlertEventSchema);
      this.SystemHealth = mongoose.model('SystemHealth', SystemHealthSchema);
    } catch (error) {
      // 模型可能已经存在
      this.MonitoringMetric = mongoose.model('MonitoringMetric');
      this.AlertRule = mongoose.model('AlertRule');
      this.AlertEvent = mongoose.model('AlertEvent');
      this.SystemHealth = mongoose.model('SystemHealth');
    }
  }

  /**
   * 启动调度器
   */
  startScheduler() {
    // 定期检查告警规则
    cron.schedule('*/1 * * * *', () => {
      this.checkAlertRules().catch(error => {
        this.logger.error('Alert rule check failed:', error);
      });
    });

    // 定期执行健康检查
    cron.schedule('*/1 * * * *', () => {
      this.performHealthChecks().catch(error => {
        this.logger.error('Health check failed:', error);
      });
    });

    // 定期聚合指标
    cron.schedule('*/5 * * * *', () => {
      this.aggregateMetrics().catch(error => {
        this.logger.error('Metrics aggregation failed:', error);
      });
    });

    // 定期清理过期数据
    cron.schedule('0 2 * * *', () => {
      this.cleanupOldData().catch(error => {
        this.logger.error('Data cleanup failed:', error);
      });
    });

    // 定期发送通知
    setInterval(() => {
      this.processNotificationQueue().catch(error => {
        this.logger.error('Notification processing failed:', error);
      });
    }, 5000);

    this.logger.info('Monitoring system scheduler started');
  }

  /**
   * 初始化健康检查
   */
  async initializeHealthChecks() {
    // 注册系统组件健康检查
    this.healthChecks.set('database', {
      name: '数据库连接',
      check: this.checkDatabaseHealth.bind(this),
      timeout: 5000,
      interval: 30000
    });

    this.healthChecks.set('redis', {
      name: 'Redis缓存',
      check: this.checkRedisHealth.bind(this),
      timeout: 3000,
      interval: 30000
    });

    this.healthChecks.set('api-server', {
      name: 'API服务器',
      check: this.checkApiServerHealth.bind(this),
      timeout: 5000,
      interval: 30000
    });

    this.healthChecks.set('village-server', {
      name: '村务服务器',
      check: this.checkVillageServerHealth.bind(this),
      timeout: 5000,
      interval: 30000
    });

    this.healthChecks.set('disk-space', {
      name: '磁盘空间',
      check: this.checkDiskSpace.bind(this),
      timeout: 2000,
      interval: 60000
    });

    this.healthChecks.set('memory-usage', {
      name: '内存使用',
      check: this.checkMemoryUsage.bind(this),
      timeout: 2000,
      interval: 60000
    });

    this.logger.info('Health checks initialized');
  }

  /**
   * 记录指标
   */
  async recordMetric(metricName, value, options = {}) {
    try {
      const metric = {
        metricName,
        metricType: options.metricType || 'gauge',
        value,
        labels: options.labels || {},
        unit: options.unit || '',
        description: options.description || '',
        source: {
          service: options.source?.service || 'unknown',
          instance: options.source?.instance || process.env.HOSTNAME || 'localhost',
          environment: options.source?.environment || process.env.NODE_ENV || 'development'
        },
        tags: options.tags || []
      };

      // 缓存指标用于实时查询
      const bufferKey = `${metricName}:${JSON.stringify(metric.labels)}`;
      this.metricsBuffer.set(bufferKey, metric);

      // 批量写入数据库（每100个指标或每分钟）
      if (this.metricsBuffer.size >= 100) {
        await this.flushMetricsBuffer();
      }

      this.emit('metric:recorded', metric);
      return metric;
    } catch (error) {
      this.logger.error('Failed to record metric:', error);
      throw error;
    }
  }

  /**
   * 批量记录指标
   */
  async recordMetrics(metrics) {
    const recordedMetrics = [];

    for (const metricData of metrics) {
      try {
        const metric = await this.recordMetric(
          metricData.metricName,
          metricData.value,
          metricData.options || {}
        );
        recordedMetrics.push(metric);
      } catch (error) {
        this.logger.error(`Failed to record metric ${metricData.metricName}:`, error);
      }
    }

    return recordedMetrics;
  }

  /**
   * 刷新指标缓冲区
   */
  async flushMetricsBuffer() {
    if (this.metricsBuffer.size === 0) {
      return;
    }

    try {
      const metrics = Array.from(this.metricsBuffer.values());
      await this.MonitoringMetric.insertMany(metrics);
      this.metricsBuffer.clear();

      this.logger.debug(`Flushed ${metrics.length} metrics to database`);
    } catch (error) {
      this.logger.error('Failed to flush metrics buffer:', error);
    }
  }

  /**
   * 查询指标
   */
  async queryMetrics(query = {}) {
    try {
      const {
        metricNames,
        metricType,
        labels,
        startTime,
        endTime,
        aggregation,
        limit = 1000
      } = query;

      const filter = {};

      if (metricNames && metricNames.length > 0) {
        filter.metricName = { $in: metricNames };
      }

      if (metricType) {
        filter.metricType = metricType;
      }

      if (labels) {
        for (const [key, value] of Object.entries(labels)) {
          filter[`labels.${key}`] = value;
        }
      }

      if (startTime || endTime) {
        filter.timestamp = {};
        if (startTime) filter.timestamp.$gte = new Date(startTime);
        if (endTime) filter.timestamp.$lte = new Date(endTime);
      }

      // 基础查询
      let pipeline = [
        { $match: filter },
        { $sort: { timestamp: -1 } },
        { $limit: limit }
      ];

      // 聚合处理
      if (aggregation) {
        const { interval = '1m', functions = ['avg', 'max', 'min'] } = aggregation;

        pipeline = [
          { $match: filter },
          {
            $group: {
              _id: {
                metricName: '$metricName',
                timeInterval: {
                  $dateTrunc: {
                    date: '$timestamp',
                    unit: interval.endsWith('m') ? 'minute' :
                      interval.endsWith('h') ? 'hour' : 'second',
                    binSize: parseInt(interval)
                  }
                }
              },
              avg: { $avg: '$value' },
              max: { $max: '$value' },
              min: { $min: '$value' },
              count: { $sum: 1 },
              first: { $first: '$value' },
              last: { $last: '$value' }
            }
          },
          { $sort: { '_id.timeInterval': -1 } }
        ];
      }

      const results = await this.MonitoringMetric.aggregate(pipeline);
      return results;
    } catch (error) {
      this.logger.error('Failed to query metrics:', error);
      throw error;
    }
  }

  /**
   * 创建告警规则
   */
  async createAlertRule(ruleData) {
    try {
      const rule = new this.AlertRule(ruleData);
      await rule.save();

      this.logger.info(`Alert rule created: ${rule.name}`);
      this.emit('alert:rule:created', rule);

      return rule;
    } catch (error) {
      this.logger.error('Failed to create alert rule:', error);
      throw error;
    }
  }

  /**
   * 更新告警规则
   */
  async updateAlertRule(ruleId, updateData) {
    try {
      const rule = await this.AlertRule.findByIdAndUpdate(
        ruleId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!rule) {
        throw new Error('Alert rule not found');
      }

      this.logger.info(`Alert rule updated: ${rule.name}`);
      this.emit('alert:rule:updated', rule);

      return rule;
    } catch (error) {
      this.logger.error('Failed to update alert rule:', error);
      throw error;
    }
  }

  /**
   * 删除告警规则
   */
  async deleteAlertRule(ruleId) {
    try {
      const rule = await this.AlertRule.findByIdAndDelete(ruleId);

      if (!rule) {
        throw new Error('Alert rule not found');
      }

      this.logger.info(`Alert rule deleted: ${rule.name}`);
      this.emit('alert:rule:deleted', rule);

      return rule;
    } catch (error) {
      this.logger.error('Failed to delete alert rule:', error);
      throw error;
    }
  }

  /**
   * 检查告警规则
   */
  async checkAlertRules() {
    try {
      const rules = await this.AlertRule.find({ enabled: true });

      for (const rule of rules) {
        await this.evaluateAlertRule(rule);
      }
    } catch (error) {
      this.logger.error('Failed to check alert rules:', error);
    }
  }

  /**
   * 评估告警规则
   */
  async evaluateAlertRule(rule) {
    try {
      const now = new Date();

      // 检查冷却时间
      if (rule.lastTriggered && rule.cooldown > 0) {
        const timeSinceLastTrigger = now - rule.lastTriggered;
        if (timeSinceLastTrigger < rule.cooldown * 1000) {
          return; // 在冷却期内，跳过检查
        }
      }

      // 获取最新指标数据
      const endTime = now;
      const startTime = new Date(now.getTime() - Math.max(...rule.conditions.map(c => c.duration || 300)) * 1000);

      let isTriggered = false;
      const evaluationResults = [];

      for (const condition of rule.conditions) {
        const metrics = await this.MonitoringMetric.find({
          metricName: condition.metric,
          timestamp: { $gte: startTime, $lte: endTime },
          ...this.buildMetricFilters(rule.filters)
        }).sort({ timestamp: -1 }).limit(100);

        const evaluation = await this.evaluateCondition(condition, metrics);
        evaluationResults.push(evaluation);

        if (evaluation.triggered) {
          isTriggered = true;
        }
      }

      // 生成告警指纹
      const fingerprint = this.generateAlertFingerprint(rule, evaluationResults);

      // 检查是否已有活跃的告警事件
      const existingAlert = await this.AlertEvent.findOne({
        fingerprint,
        status: 'firing'
      });

      if (isTriggered && !existingAlert) {
        // 创建新的告警事件
        await this.createAlertEvent(rule, evaluationResults, fingerprint);
      } else if (!isTriggered && existingAlert) {
        // 解决告警事件
        await this.resolveAlertEvent(existingAlert);
      }

      return {
        rule: rule.name,
        triggered: isTriggered,
        evaluation: evaluationResults
      };
    } catch (error) {
      this.logger.error(`Failed to evaluate alert rule ${rule.name}:`, error);
    }
  }

  /**
   * 评估单个条件
   */
  async evaluateCondition(condition, metrics) {
    if (metrics.length === 0) {
      return { triggered: false, reason: 'No metrics found' };
    }

    const duration = condition.duration || 300; // 默认5分钟
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - duration * 1000);

    // 过滤时间范围内的指标
    const recentMetrics = metrics.filter(m => m.timestamp >= startTime);

    if (recentMetrics.length === 0) {
      return { triggered: false, reason: 'No recent metrics' };
    }

    // 根据操作符评估条件
    let triggered = false;
    let actualValue;

    switch (condition.operator) {
    case 'gt':
      actualValue = Math.max(...recentMetrics.map(m => m.value));
      triggered = actualValue > condition.threshold;
      break;
    case 'lt':
      actualValue = Math.min(...recentMetrics.map(m => m.value));
      triggered = actualValue < condition.threshold;
      break;
    case 'gte':
      actualValue = Math.max(...recentMetrics.map(m => m.value));
      triggered = actualValue >= condition.threshold;
      break;
    case 'lte':
      actualValue = Math.min(...recentMetrics.map(m => m.value));
      triggered = actualValue <= condition.threshold;
      break;
    case 'eq':
      actualValue = recentMetrics[recentMetrics.length - 1].value;
      triggered = actualValue === condition.threshold;
      break;
    case 'ne':
      actualValue = recentMetrics[recentMetrics.length - 1].value;
      triggered = actualValue !== condition.threshold;
      break;
    case 'avg':
      actualValue = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;
      triggered = condition.operator === 'gt' ? actualValue > condition.threshold :
        condition.operator === 'lt' ? actualValue < condition.threshold :
          actualValue === condition.threshold;
      break;
    default:
      return { triggered: false, reason: 'Unknown operator' };
    }

    return {
      triggered,
      actualValue,
      threshold: condition.threshold,
      operator: condition.operator,
      metricCount: recentMetrics.length,
      timeRange: { startTime, endTime }
    };
  }

  /**
   * 创建告警事件
   */
  async createAlertEvent(rule, evaluationResults, fingerprint) {
    try {
      const alertEvent = new this.AlertEvent({
        ruleId: rule._id,
        ruleName: rule.name,
        severity: rule.severity,
        status: 'firing',
        message: this.generateAlertMessage(rule, evaluationResults),
        details: {
          conditions: evaluationResults,
          rule: rule.toObject()
        },
        labels: {
          alertname: rule.name,
          severity: rule.severity,
          component: rule.conditions[0]?.metric || 'unknown'
        },
        annotations: {
          summary: `${rule.name} 告警触发`,
          description: rule.description
        },
        fingerprint
      });

      await alertEvent.save();

      // 更新规则最后触发时间
      await this.AlertRule.findByIdAndUpdate(rule._id, {
        lastTriggered: new Date(),
        $inc: { triggerCount: 1 }
      });

      // 排队发送通知
      await this.queueAlertNotifications(alertEvent, rule);

      this.logger.warn(`Alert event created: ${rule.name} (${rule.severity})`);
      this.emit('alert:fired', alertEvent);

      return alertEvent;
    } catch (error) {
      this.logger.error('Failed to create alert event:', error);
      throw error;
    }
  }

  /**
   * 解决告警事件
   */
  async resolveAlertEvent(alertEvent) {
    try {
      const resolvedEvent = await this.AlertEvent.findByIdAndUpdate(
        alertEvent._id,
        {
          status: 'resolved',
          endsAt: new Date(),
          duration: Math.floor((new Date() - alertEvent.startsAt) / 1000)
        },
        { new: true }
      );

      this.logger.info(`Alert event resolved: ${alertEvent.ruleName}`);
      this.emit('alert:resolved', resolvedEvent);

      return resolvedEvent;
    } catch (error) {
      this.logger.error('Failed to resolve alert event:', error);
      throw error;
    }
  }

  /**
   * 排队告警通知
   */
  async queueAlertNotifications(alertEvent, rule) {
    for (const action of rule.actions) {
      if (!action.enabled) {
        continue;
      }

      this.notificationQueue.push({
        type: action.type,
        config: action.config,
        alertEvent,
        rule,
        timestamp: new Date()
      });
    }
  }

  /**
   * 处理通知队列
   */
  async processNotificationQueue() {
    if (this.notificationQueue.length === 0) {
      return;
    }

    const notifications = this.notificationQueue.splice(0, 10); // 每次处理10个通知

    for (const notification of notifications) {
      try {
        await this.sendNotification(notification);
      } catch (error) {
        this.logger.error(`Failed to send ${notification.type} notification:`, error);
      }
    }
  }

  /**
   * 发送通知
   */
  async sendNotification(notification) {
    const { type, config, alertEvent } = notification;

    const notificationRecord = {
      type,
      sentAt: new Date(),
      success: false,
      error: null
    };

    try {
      switch (type) {
      case 'email':
        await this.sendEmailNotification(config, alertEvent);
        break;
      case 'sms':
        await this.sendSmsNotification(config, alertEvent);
        break;
      case 'webhook':
        await this.sendWebhookNotification(config, alertEvent);
        break;
      case 'slack':
        await this.sendSlackNotification(config, alertEvent);
        break;
      case 'dingtalk':
        await this.sendDingtalkNotification(config, alertEvent);
        break;
      default:
        throw new Error(`Unknown notification type: ${type}`);
      }

      notificationRecord.success = true;
    } catch (error) {
      notificationRecord.error = error.message;
      throw error;
    } finally {
      // 记录通知状态
      await this.AlertEvent.findByIdAndUpdate(alertEvent._id, {
        $push: { notificationsSent: notificationRecord }
      });
    }
  }

  /**
   * 发送邮件通知
   */
  async sendEmailNotification(config, alertEvent) {
    // 这里应该集成实际的邮件服务
    this.logger.info(`Email notification sent for alert: ${alertEvent.ruleName}`);
  }

  /**
   * 发送短信通知
   */
  async sendSmsNotification(config, alertEvent) {
    // 这里应该集成实际的短信服务
    this.logger.info(`SMS notification sent for alert: ${alertEvent.ruleName}`);
  }

  /**
   * 发送Webhook通知
   */
  async sendWebhookNotification(config, alertEvent) {
    const payload = {
      alert: alertEvent.toObject(),
      timestamp: new Date(),
      source: 'smart-village-monitoring'
    };

    await axios.post(config.url, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      timeout: this.config.notificationTimeout
    });
  }

  /**
   * 发送Slack通知
   */
  async sendSlackNotification(config, alertEvent) {
    const color = this.getSlackColor(alertEvent.severity);
    const payload = {
      text: `🚨 ${alertEvent.ruleName}`,
      attachments: [{
        color,
        fields: [
          {
            title: '严重程度',
            value: alertEvent.severity,
            short: true
          },
          {
            title: '时间',
            value: alertEvent.startsAt.toLocaleString('zh-CN'),
            short: true
          },
          {
            title: '描述',
            value: alertEvent.message,
            short: false
          }
        ]
      }]
    };

    await axios.post(config.webhook, payload, {
      timeout: this.config.notificationTimeout
    });
  }

  /**
   * 发送钉钉通知
   */
  async sendDingtalkNotification(config, alertEvent) {
    const payload = {
      msgtype: 'markdown',
      markdown: {
        title: '智慧村庄监控告警',
        text: `## 🚨 ${alertEvent.ruleName}\n\n` +
              `- **严重程度**: ${alertEvent.severity}\n` +
              `- **时间**: ${alertEvent.startsAt.toLocaleString('zh-CN')}\n` +
              `- **描述**: ${alertEvent.message}\n`
      }
    };

    await axios.post(config.webhook, payload, {
      timeout: this.config.notificationTimeout
    });
  }

  /**
   * 获取Slack颜色
   */
  getSlackColor(severity) {
    const colors = {
      info: '#36a64f',
      warning: '#ff9500',
      critical: '#ff0000',
      emergency: '#8b0000'
    };
    return colors[severity] || '#36a64f';
  }

  /**
   * 执行健康检查
   */
  async performHealthChecks() {
    const healthResults = {};

    for (const [componentId, healthCheck] of this.healthChecks) {
      try {
        const result = await this.performHealthCheck(componentId, healthCheck);
        healthResults[componentId] = result;
      } catch (error) {
        this.logger.error(`Health check failed for ${componentId}:`, error);
        healthResults[componentId] = {
          status: 'unhealthy',
          error: error.message,
          lastCheck: new Date()
        };
      }
    }

    // 计算整体系统健康状态
    const systemHealth = this.calculateSystemHealth(healthResults);

    // 保存健康状态
    await this.saveHealthStatus(healthResults, systemHealth);

    return {
      components: healthResults,
      system: systemHealth
    };
  }

  /**
   * 执行单个健康检查
   */
  async performHealthCheck(componentId, healthCheck) {
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        healthCheck.check(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), healthCheck.timeout)
        )
      ]);

      const responseTime = Date.now() - startTime;

      return {
        ...result,
        responseTime,
        lastCheck: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - startTime,
        lastCheck: new Date()
      };
    }
  }

  /**
   * 数据库健康检查
   */
  async checkDatabaseHealth() {
    try {
      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      const responseTime = Date.now() - startTime;

      // 检查数据库连接
      const stats = await mongoose.connection.db.stats();

      return {
        status: 'healthy',
        responseTime,
        details: {
          collections: stats.collections,
          dataSize: stats.dataSize,
          indexes: stats.indexes,
          indexSize: stats.indexSize
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Redis健康检查
   */
  async checkRedisHealth() {
    try {
      const redis = require('redis');
      const client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      await client.connect();
      const startTime = Date.now();
      const pong = await client.ping();
      const responseTime = Date.now() - startTime;
      await client.disconnect();

      if (pong === 'PONG') {
        const info = await client.info('memory');
        return {
          status: 'healthy',
          responseTime,
          details: {
            memory: info
          }
        };
      } else {
        return {
          status: 'unhealthy',
          error: 'Invalid response'
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * API服务器健康检查
   */
  async checkApiServerHealth() {
    try {
      const response = await axios.get(
        `${process.env.API_URL || 'http://localhost:3001'}/health`,
        { timeout: 5000 }
      );

      return {
        status: response.data.status === 'ok' ? 'healthy' : 'degraded',
        responseTime: response.headers['x-response-time'] || 0,
        details: response.data
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * 村务服务器健康检查
   */
  async checkVillageServerHealth() {
    try {
      const response = await axios.get(
        `${process.env.VILLAGE_URL || 'http://localhost:5000'}/health`,
        { timeout: 5000 }
      );

      return {
        status: response.data.status === 'ok' ? 'healthy' : 'degraded',
        responseTime: response.headers['x-response-time'] || 0,
        details: response.data
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * 磁盘空间检查
   */
  async checkDiskSpace() {
    try {
      const execAsync = promisify(exec);
      const { stdout } = await execAsync('df -h /');

      const lines = stdout.split('\n');
      const dataLine = lines[1];
      const parts = dataLine.split(/\s+/);
      const usage = parseInt(parts[4].replace('%', ''));

      const status = usage > 90 ? 'critical' : usage > 80 ? 'warning' : 'healthy';

      return {
        status: status === 'healthy' ? 'healthy' : 'degraded',
        details: {
          usage,
          available: parts[3],
          total: parts[1]
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * 内存使用检查
   */
  async checkMemoryUsage() {
    try {
      const memUsage = process.memoryUsage();
      const totalMem = require('os').totalmem();
      const freeMem = require('os').freemem();
      const usedMem = totalMem - freeMem;
      const usagePercent = (usedMem / totalMem) * 100;

      const status = usagePercent > 90 ? 'critical' : usagePercent > 80 ? 'warning' : 'healthy';

      return {
        status: status === 'healthy' ? 'healthy' : 'degraded',
        details: {
          processMemory: memUsage,
          systemMemory: {
            total: totalMem,
            free: freeMem,
            used: usedMem,
            usagePercent
          }
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * 计算系统健康状态
   */
  calculateSystemHealth(healthResults) {
    const statuses = Object.values(healthResults).map(r => r.status);

    const healthyCount = statuses.filter(s => s === 'healthy').length;
    const unhealthyCount = statuses.filter(s => s === 'unhealthy').length;
    const degradedCount = statuses.filter(s => s === 'degraded').length;
    const totalCount = statuses.length;

    let systemStatus;
    if (unhealthyCount > 0) {
      systemStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      systemStatus = 'degraded';
    } else {
      systemStatus = 'healthy';
    }

    const availability = (healthyCount / totalCount) * 100;

    return {
      status: systemStatus,
      availability: Math.round(availability * 100) / 100,
      healthyComponents: healthyCount,
      degradedComponents: degradedCount,
      unhealthyComponents: unhealthyCount,
      totalComponents: totalCount
    };
  }

  /**
   * 保存健康状态
   */
  async saveHealthStatus(healthResults, systemHealth) {
    try {
      // 保存各组件健康状态
      for (const [componentId, result] of Object.entries(healthResults)) {
        await this.SystemHealth.findOneAndUpdate(
          { component: componentId },
          {
            ...result,
            component: componentId
          },
          { upsert: true, new: true }
        );
      }

      // 保存系统整体健康状态
      await this.SystemHealth.findOneAndUpdate(
        { component: 'system' },
        {
          component: 'system',
          ...systemHealth,
          lastCheck: new Date()
        },
        { upsert: true, new: true }
      );

      this.logger.info('Health status saved');
    } catch (error) {
      this.logger.error('Failed to save health status:', error);
    }
  }

  /**
   * 获取系统健康状态
   */
  async getSystemHealth() {
    try {
      const healthStatuses = await this.SystemHealth.find({}).sort({ component: 1 });

      const systemStatus = healthStatuses.find(s => s.component === 'system');
      const componentStatuses = healthStatuses.filter(s => s.component !== 'system');

      return {
        system: systemStatus,
        components: componentStatuses,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to get system health:', error);
      throw error;
    }
  }

  /**
   * 获取告警事件
   */
  async getAlertEvents(options = {}) {
    try {
      const {
        status,
        severity,
        startTime,
        endTime,
        limit = 100,
        page = 1
      } = options;

      const filter = {};

      if (status) {
        filter.status = status;
      }

      if (severity) {
        filter.severity = severity;
      }

      if (startTime || endTime) {
        filter.startsAt = {};
        if (startTime) filter.startsAt.$gte = new Date(startTime);
        if (endTime) filter.startsAt.$lte = new Date(endTime);
      }

      const events = await this.AlertEvent.find(filter)
        .sort({ startsAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('ruleId', 'name description')
        .populate('acknowledged.by', 'username email');

      const total = await this.AlertEvent.countDocuments(filter);

      return {
        events,
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      this.logger.error('Failed to get alert events:', error);
      throw error;
    }
  }

  /**
   * 确认告警事件
   */
  async acknowledgeAlertEvent(eventId, userId, comment = '') {
    try {
      const event = await this.AlertEvent.findByIdAndUpdate(
        eventId,
        {
          'acknowledged.by': userId,
          'acknowledged.at': new Date(),
          'acknowledged.comment': comment
        },
        { new: true }
      );

      if (!event) {
        throw new Error('Alert event not found');
      }

      this.logger.info(`Alert event acknowledged: ${event.ruleName} by user ${userId}`);
      this.emit('alert:acknowledged', event);

      return event;
    } catch (error) {
      this.logger.error('Failed to acknowledge alert event:', error);
      throw error;
    }
  }

  /**
   * 聚合指标
   */
  async aggregateMetrics() {
    try {
      // 这里可以实现指标的预聚合，如按分钟、小时、天聚合
      // 用于提高查询性能和减少存储空间
      this.logger.debug('Metrics aggregation completed');
    } catch (error) {
      this.logger.error('Failed to aggregate metrics:', error);
    }
  }

  /**
   * 清理过期数据
   */
  async cleanupOldData() {
    try {
      const now = new Date();
      const retentionTime = this.config.metricsRetention.raw;
      const cutoffDate = new Date(now.getTime() - retentionTime);

      // 删除过期的原始指标数据
      const deleteResult = await this.MonitoringMetric.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      // 删除过期的已解决告警事件
      const alertCutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30天
      const alertDeleteResult = await this.AlertEvent.deleteMany({
        status: 'resolved',
        endsAt: { $lt: alertCutoffDate }
      });

      this.logger.info(`Cleanup completed: deleted ${deleteResult.deletedCount} metrics and ${alertDeleteResult.deletedCount} alert events`);
    } catch (error) {
      this.logger.error('Failed to cleanup old data:', error);
    }
  }

  /**
   * 生成告警消息
   */
  generateAlertMessage(rule, evaluationResults) {
    const conditions = evaluationResults.map(r => {
      return `${r.triggered ? '触发' : '未触发'}: ${r.actualValue} ${r.operator} ${r.threshold}`;
    });

    return `${rule.description || rule.name}\n条件检查: ${conditions.join(', ')}`;
  }

  /**
   * 生成告警指纹
   */
  generateAlertFingerprint(rule, evaluationResults) {
    const keyData = {
      ruleId: rule._id.toString(),
      conditions: evaluationResults.map(r => ({
        metric: r.metric,
        threshold: r.threshold,
        operator: r.operator
      }))
    };

    return require('crypto')
      .createHash('md5')
      .update(JSON.stringify(keyData))
      .digest('hex');
  }

  /**
   * 构建指标过滤器
   */
  buildMetricFilters(filters) {
    const query = {};

    if (!filters || filters.length === 0) {
      return query;
    }

    for (const filter of filters) {
      const fieldPath = filter.field.startsWith('labels.') ? filter.field : `labels.${filter.field}`;

      switch (filter.operator) {
      case 'eq':
        query[fieldPath] = filter.value;
        break;
      case 'ne':
        query[fieldPath] = { $ne: filter.value };
        break;
      case 'in':
        query[fieldPath] = { $in: filter.value };
        break;
      case 'regex':
        query[fieldPath] = { $regex: filter.value, $options: 'i' };
        break;
      }
    }

    return query;
  }

  /**
   * 获取监控仪表板数据
   */
  async getDashboardData() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // 获取系统健康状态
      const systemHealth = await this.getSystemHealth();

      // 获取活跃告警
      const activeAlerts = await this.AlertEvent.find({
        status: 'firing'
      }).sort({ startsAt: -1 });

      // 获取最近1小时的指标统计
      const recentMetrics = await this.queryMetrics({
        startTime: oneHourAgo,
        endTime: now
      });

      // 获取24小时告警统计
      const dailyAlertStats = await this.AlertEvent.aggregate([
        {
          $match: {
            startsAt: { $gte: oneDayAgo }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$startsAt' } },
              severity: '$severity'
            },
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        systemHealth,
        activeAlerts,
        recentMetrics,
        dailyAlertStats,
        timestamp: now
      };
    } catch (error) {
      this.logger.error('Failed to get dashboard data:', error);
      throw error;
    }
  }

  /**
   * 清理资源
   */
  async cleanup() {
    try {
      this.logger.info('Cleaning up monitoring system...');

      // 刷新指标缓冲区
      await this.flushMetricsBuffer();

      // 处理剩余通知
      await this.processNotificationQueue();

      this.logger.info('Monitoring system cleanup completed');
    } catch (error) {
      this.logger.error('Cleanup failed:', error);
    }
  }
}

module.exports = MonitoringSystem;