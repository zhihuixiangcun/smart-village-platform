/**
 * 多级告警系统
 * 提供智能阈值检测和多渠道通知
 */

const EventEmitter = require('events');
const { performance } = require('perf_hooks');
const logger = require('../utils/logger');

class AlertSystem extends EventEmitter {
  constructor() {
    super();

    // 告警配置
    this.config = {
      // 告警级别
      levels: ['info', 'warning', 'critical', 'emergency'],
      // 默认阈值
      defaultThresholds: {
        responseTime: {
          warning: 500,
          critical: 1000,
          emergency: 2000
        },
        errorRate: {
          warning: 0.05,  // 5%
          critical: 0.1,  // 10%
          emergency: 0.2   // 20%
        },
        throughput: {
          warning: 50,
          critical: 20,
          emergency: 10
        },
        cpuUsage: {
          warning: 70,
          critical: 85,
          emergency: 95
        },
        memoryUsage: {
          warning: 2048,  // 2GB
          critical: 4096, // 4GB
          emergency: 6144  // 6GB
        },
        cacheHitRate: {
          warning: 0.8,  // 80%
          critical: 0.6,  // 60%
          emergency: 0.4   // 40%
        }
      },
      // 告警抑制
      suppression: {
        duration: 300000,    // 5分钟
        maxAlerts: 10,       // 最大告警数
        cooldown: 60000       // 冷却时间
      },
      // 通知渠道
      channels: {
        webhook: {
          enabled: process.env.ALERT_WEBHOOK_ENABLED === 'true',
          url: process.env.ALERT_WEBHOOK_URL,
          timeout: 10000
        },
        email: {
          enabled: process.env.ALERT_EMAIL_ENABLED === 'true',
          smtp: {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            }
          },
          recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || []
        },
        sms: {
          enabled: process.env.ALERT_SMS_ENABLED === 'true',
          provider: process.env.SMS_PROVIDER || 'tencent',
          apiKey: process.env.SMS_API_KEY,
          phones: process.env.ALERT_SMS_PHONES?.split(',') || []
        },
        dingtalk: {
          enabled: process.env.ALERT_DINGTALK_ENABLED === 'true',
          webhook: process.env.DINGTALK_WEBHOOK,
          secret: process.env.DINGTALK_SECRET
        }
      }
    };

    // 告警规则
    this.rules = new Map();

    // 告警状态
    this.alertState = new Map();

    // 告警历史
    this.alertHistory = [];

    // 抑制记录
    this.suppression = new Map();

    // 初始化告警规则
    this.initAlertRules();

    // 启动告警检查
    this.startAlertChecking();
  }

  /**
   * 初始化告警规则
   */
  initAlertRules() {
    // 响应时间告警
    this.addRule('response_time', {
      name: '响应时间告警',
      level: 'critical',
      condition: (metrics) => {
        return metrics.avgResponseTime > this.config.defaultThresholds.responseTime.critical;
      },
      message: (metrics) => `平均响应时间过高: ${metrics.avgResponseTime.toFixed(2)}ms`,
      suggestion: '优化查询性能或增加缓存',
      channels: ['webhook', 'email', 'dingtalk']
    });

    // 错误率告警
    this.addRule('error_rate', {
      name: '错误率告警',
      level: 'critical',
      condition: (metrics) => {
        return metrics.errorRate > this.config.defaultThresholds.errorRate.critical;
      },
      message: (metrics) => `错误率过高: ${(metrics.errorRate * 100).toFixed(2)}%`,
      suggestion: '检查应用程序错误日志，排查问题原因',
      channels: ['webhook', 'email', 'dingtalk', 'sms']
    });

    // 吞吐量告警
    this.addRule('throughput', {
      name: '吞吐量告警',
      level: 'warning',
      condition: (metrics) => {
        return metrics.requestsPerSecond < this.config.defaultThresholds.throughput.critical;
      },
      message: (metrics) => `吞吐量过低: ${metrics.requestsPerSecond} QPS`,
      suggestion: '检查系统负载，可能需要扩容',
      channels: ['webhook', 'email']
    });

    // CPU使用率告警
    this.addRule('cpu_usage', {
      name: 'CPU使用率告警',
      level: 'critical',
      condition: (metrics) => {
        return metrics.system.cpu > this.config.defaultThresholds.cpuUsage.critical;
      },
      message: (metrics) => `CPU使用率过高: ${metrics.system.cpu.toFixed(1)}%`,
      suggestion: '优化CPU密集型操作或增加计算资源',
      channels: ['webhook', 'email', 'dingtalk']
    });

    // 内存使用告警
    this.addRule('memory_usage', {
      name: '内存使用告警',
      level: 'warning',
      condition: (metrics) => {
        return metrics.system.memory > this.config.defaultThresholds.memoryUsage.warning;
      },
      message: (metrics) => `内存使用过高: ${metrics.system.memory.toFixed(2)}MB`,
      suggestion: '检查内存泄漏，考虑增加内存或优化程序',
      channels: ['webhook', 'email']
    });

    // 缓存命中率告警
    this.addRule('cache_hit_rate', {
      name: '缓存命中率告警',
      level: 'warning',
      condition: (metrics) => {
        if (metrics.cache && metrics.cache.hitRate) {
          return metrics.cache.hitRate < this.config.defaultThresholds.cacheHitRate.warning;
        }
        return false;
      },
      message: (metrics) => `缓存命中率过低: ${(metrics.cache.hitRate * 100).toFixed(1)}%`,
      suggestion: '检查缓存策略，优化热点数据识别',
      channels: ['webhook', 'email']
    });

    // 连接池告警
    this.addRule('connection_pool', {
      name: '连接池告警',
      level: 'critical',
      condition: (metrics) => {
        if (metrics.database && metrics.database.connectionUtilization) {
          return metrics.database.connectionUtilization > 0.9;
        }
        return false;
      },
      message: (metrics) => `数据库连接池使用率过高: ${(metrics.database.connectionUtilization * 100).toFixed(1)}%`,
      suggestion: '优化数据库查询或增加连接池大小',
      channels: ['webhook', 'email', 'dingtalk']
    });

    // 活跃请求告警
    this.addRule('active_requests', {
      name: '活跃请求告警',
      level: 'emergency',
      condition: (metrics) => {
        return metrics.activeRequests > 1000;
      },
      message: (metrics) => `活跃请求数量过多: ${metrics.activeRequests}`,
      suggestion: '检查系统负载，可能需要限流或扩容',
      channels: ['webhook', 'email', 'dingtalk', 'sms']
    });
  }

  /**
   * 添加告警规则
   * @param {string} id - 规则ID
   * @param {Object} rule - 告警规则
   */
  addRule(id, rule) {
    this.rules.set(id, {
      ...rule,
      id,
      enabled: rule.enabled !== false,
      created: Date.now(),
      lastTriggered: null,
      triggerCount: 0,
      suppressedUntil: null
    });
  }

  /**
   * 删除告警规则
   * @param {string} id - 规则ID
   */
  removeRule(id) {
    this.rules.delete(id);
  }

  /**
   * 启用/禁用告警规则
   * @param {string} id - 规则ID
   * @param {boolean} enabled - 是否启用
   */
  toggleRule(id, enabled) {
    const rule = this.rules.get(id);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * 检查告警
   * @param {Object} metrics - 监控指标
   * @returns {Array} 触发的告警列表
   */
  checkAlerts(metrics) {
    const alerts = [];
    const now = Date.now();

    for (const [id, rule] of this.rules.entries()) {
      if (!rule.enabled) {
        continue;
      }

      try {
        // 检查条件
        const shouldAlert = rule.condition(metrics);

        if (shouldAlert) {
          // 检查抑制
          if (this.isSuppressed(id, rule, now)) {
            continue;
          }

          // 确定告警级别
          let level = rule.level;
          if (typeof level === 'function') {
            level = level(metrics);
          }

          // 创建告警
          const alert = {
            id: `${id}_${Date.now()}`,
            ruleId: id,
            ruleName: rule.name,
            level,
            message: rule.message(metrics),
            suggestion: rule.suggestion,
            metrics: this.extractRelevantMetrics(metrics, rule),
            timestamp: new Date(),
            channels: rule.channels || ['webhook']
          };

          alerts.push(alert);

          // 更新规则状态
          rule.lastTriggered = now;
          rule.triggerCount++;

          // 设置抑制
          this.setSuppression(id, rule);

          // 发送通知
          this.sendNotifications(alert);

          // 记录告警历史
          this.alertHistory.push(alert);

          // 发出事件
          this.emit('alert', alert);
        }
      } catch (error) {
        logger.error(`检查告警规则 ${id} 失败`, error);
      }
    }

    // 限制历史记录大小
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(-1000);
    }

    return alerts;
  }

  /**
   * 提取相关指标
   * @param {Object} metrics - 监控指标
   * @param {Object} rule - 告警规则
   * @returns {Object} 相关指标
   */
  extractRelevantMetrics(metrics, rule) {
    const relevant = {};

    // 根据规则类型提取相关指标
    if (rule.id.includes('response_time')) {
      relevant.avgResponseTime = metrics.avgResponseTime;
      relevant.p95ResponseTime = metrics.p95ResponseTime;
      relevant.p99ResponseTime = metrics.p99ResponseTime;
    }

    if (rule.id.includes('error_rate')) {
      relevant.errorRate = metrics.errorRate;
      relevant.totalRequests = metrics.totalRequests;
      relevant.totalErrors = metrics.totalErrors;
    }

    if (rule.id.includes('throughput')) {
      relevant.requestsPerSecond = metrics.requestsPerSecond;
      relevant.qps = metrics.qps;
    }

    if (rule.id.includes('cpu_usage') || rule.id.includes('memory_usage')) {
      relevant.system = metrics.system;
    }

    if (rule.id.includes('cache')) {
      relevant.cache = metrics.cache;
    }

    if (rule.id.includes('connection_pool')) {
      relevant.database = metrics.database;
    }

    if (rule.id.includes('active_requests')) {
      relevant.activeRequests = metrics.activeRequests;
    }

    return relevant;
  }

  /**
   * 检查是否被抑制
   * @param {string} id - 规则ID
   * @param {Object} rule - 告警规则
   * @param {number} now - 当前时间
   * @returns {boolean} 是否被抑制
   */
  isSuppressed(id, rule, now) {
    const suppression = this.suppression.get(id);

    if (!suppression) {
      return false;
    }

    // 检查抑制是否过期
    if (now > suppression.until) {
      this.suppression.delete(id);
      return false;
    }

    // 检查是否超过最大告警次数
    if (rule.triggerCount >= this.config.suppression.maxAlerts) {
      return true;
    }

    return true;
  }

  /**
   * 设置抑制
   * @param {string} id - 规则ID
   * @param {Object} rule - 告警规则
   */
  setSuppression(id, rule) {
    this.suppression.set(id, {
      until: Date.now() + this.config.suppression.duration,
      rule: rule.id,
      count: (this.suppression.get(id)?.count || 0) + 1
    });
  }

  /**
   * 发送通知
   * @param {Object} alert - 告警信息
   */
  async sendNotifications(alert) {
    const channels = alert.channels || ['webhook'];

    for (const channel of channels) {
      try {
        await this.sendNotification(alert, channel);
      } catch (error) {
        logger.error(`发送${channel}通知失败`, {
          alertId: alert.id,
          error: error.message
        });
      }
    }
  }

  /**
   * 发送单个通知
   * @param {Object} alert - 告警信息
   * @param {string} channel - 通知渠道
   */
  async sendNotification(alert, channel) {
    switch (channel) {
      case 'webhook':
        await this.sendWebhookNotification(alert);
        break;
      case 'email':
        await this.sendEmailNotification(alert);
        break;
      case 'sms':
        await this.sendSMSNotification(alert);
        break;
      case 'dingtalk':
        await this.sendDingTalkNotification(alert);
        break;
      default:
        logger.warn(`未知的通知渠道: ${channel}`);
    }
  }

  /**
   * 发送Webhook通知
   * @param {Object} alert - 告警信息
   */
  async sendWebhookNotification(alert) {
    const { enabled, url, timeout } = this.config.channels.webhook;

    if (!enabled || !url) {
      return;
    }

    const payload = {
      alert_id: alert.id,
      rule_id: alert.ruleId,
      rule_name: alert.ruleName,
      level: alert.level,
      message: alert.message,
      suggestion: alert.suggestion,
      metrics: alert.metrics,
      timestamp: alert.timestamp,
      service: 'smart-village-api',
      environment: process.env.NODE_ENV || 'development'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SmartVillage-Monitor/1.0'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeout)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    logger.info('Webhook通知已发送', { alertId: alert.id });
  }

  /**
   * 发送邮件通知
   * @param {Object} alert - 告警信息
   */
  async sendEmailNotification(alert) {
    const { enabled, smtp, recipients } = this.config.channels.email;

    if (!enabled || !recipients.length || !smtp) {
      return;
    }

    // 这里应该使用邮件发送库，简化处理
    const nodemailer = require('nodemailer');

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.auth
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@smartvillage.com',
      to: recipients,
      subject: `[${alert.level.toUpperCase()}] ${alert.ruleName}`,
      html: this.generateEmailTemplate(alert)
    };

    await transporter.sendMail(mailOptions);

    logger.info('邮件通知已发送', { alertId: alert.id, recipients });
  }

  /**
   * 发送短信通知
   * @param {Object} alert - 告警信息
   */
  async sendSMSNotification(alert) {
    const { enabled, provider, phones } = this.config.channels.sms;

    if (!enabled || !phones.length) {
      return;
    }

    // 根据不同的短信提供商发送
    switch (provider) {
      case 'tencent':
        await this.sendTencentSMS(alert, phones);
        break;
      // 添加其他短信提供商
      default:
        logger.warn(`不支持的短信提供商: ${provider}`);
    }
  }

  /**
   * 发送腾讯云短信
   * @param {Object} alert - 告警信息
   * @param {Array} phones - 电话号码列表
   */
  async sendTencentSMS(alert, phones) {
    // 这里应该调用腾讯云短信API
    // 简化处理
    const message = `[${alert.level.toUpperCase()}] ${alert.message}`;

    for (const phone of phones) {
      logger.info(`模拟发送短信到 ${phone}: ${message}`);
    }
  }

  /**
   * 发送钉钉通知
   * @param {Object} alert - 告警信息
   */
  async sendDingTalkNotification(alert) {
    const { enabled, webhook, secret } = this.config.channels.dingtalk;

    if (!enabled || !webhook) {
      return;
    }

    const timestamp = alert.timestamp.getTime();

    // 计算签名
    const sign = this.generateDingTalkSign(timestamp, secret);

    const payload = {
      msgtype: 2,
      timestamp,
      sign,
      text: alert.message,
      at: {
        atMobiles: process.env.DINGTALK_AT_MOBILES?.split(',') || [],
        atUserIds: process.env.DINGTALK_AT_USERIDS?.split(',') || []
      }
    };

    const response = await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.errcode !== 0) {
      throw new Error(`钉钉通知失败: ${result.errmsg}`);
    }

    logger.info('钉钉通知已发送', { alertId: alert.id });
  }

  /**
   * 生成钉钉签名
   * @param {number} timestamp - 时间戳
   * @param {string} secret - 密钥
   * @returns {string} 签名
   */
  generateDingTalkSign(timestamp, secret) {
    const crypto = require('crypto');
    const stringToSign = `${timestamp}\n${secret}`;
    return crypto.createHash('sha256').update(stringToSign).digest('hex');
  }

  /**
   * 生成邮件模板
   * @param {Object} alert - 告警信息
   * @returns {string} HTML内容
   */
  generateEmailTemplate(alert) {
    const levelColors = {
      info: '#17a2b8',
      warning: '#f39c12',
      critical: '#dc3545',
      emergency: '#721c24'
    };

    const levelColor = levelColors[alert.level] || levelColors.info;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>系统告警 - ${alert.ruleName}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 30px;
          }
          .header {
            border-bottom: 3px solid ${levelColor};
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .title {
            color: #333;
            font-size: 24px;
            margin: 0;
          }
          .level {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            margin-left: 10px;
            color: white;
            background-color: ${levelColor};
          }
          .content {
            margin-bottom: 20px;
          }
          .metrics {
            background: #f8f9fa;
            border-radius: 4px;
            padding: 15px;
            margin-top: 20px;
          }
          .metric {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
          }
          .footer {
            color: #666;
            font-size: 12px;
            text-align: center;
            margin-top: 30px;
            border-top: 1px solid #eee;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="title">
              系统告警
              <span class="level">${alert.level}</span>
            </h1>
          </div>

          <div class="content">
            <h2>${alert.ruleName}</h2>
            <p><strong>告警级别：</strong>${alert.level.toUpperCase()}</p>
            <p><strong>告警信息：</strong>${alert.message}</p>
            <p><strong>时间：</strong>${alert.timestamp.toLocaleString()}</p>

            <p><strong>建议措施：</strong>${alert.suggestion}</p>
          </div>

          <div class="metrics">
            <h3>相关指标</h3>
            ${Object.entries(alert.metrics).map(([key, value]) => `
              <div class="metric">
                <span>${key}:</span>
                <strong>${typeof value === 'number' ? value.toFixed(2) : value}</strong>
              </div>
            `).join('')}
          </div>

          <div class="footer">
            <p>此邮件由智慧乡村监控系统自动发送</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 启动告警检查
   */
  startAlertChecking() {
    // 每30秒检查一次
    setInterval(() => {
      this.performAlertCheck();
    }, 30000);

    logger.info('告警检查已启动', { interval: '30s' });
  }

  /**
   * 执行告警检查
   */
  async performAlertCheck() {
    try {
      // 这里应该获取实际的监控指标
      // 简化处理，使用模拟数据
      const mockMetrics = this.generateMockMetrics();

      const alerts = this.checkAlerts(mockMetrics);

      if (alerts.length > 0) {
        logger.warn('检测到告警', {
          count: alerts.length,
          alerts: alerts.map(a => ({
            ruleId: a.ruleId,
            level: a.level,
            message: a.message
          }))
        });
      }
    } catch (error) {
      logger.error('告警检查失败', error);
    }
  }

  /**
   * 生成模拟监控指标
   * @returns {Object} 模拟指标
   */
  generateMockMetrics() {
    const cpuUsage = 40 + Math.random() * 40;
    const memoryUsage = 1024 + Math.random() * 2048;
    const errorRate = Math.random() * 0.1;
    const responseTime = 100 + Math.random() * 400;
    const cacheHitRate = 0.7 + Math.random() * 0.25;

    return {
      avgResponseTime: responseTime,
      p95ResponseTime: responseTime * 1.5,
      p99ResponseTime: responseTime * 2,
      errorRate: errorRate,
      requestsPerSecond: 100 + Math.random() * 400,
      totalRequests: 10000 + Math.random() * 50000,
      totalErrors: Math.floor(errorRate * 10000),
      system: {
        cpu: cpuUsage,
        memory: memoryUsage,
        heapUsed: memoryUsage * 0.8,
        heapTotal: memoryUsage,
        uptime: process.uptime()
      },
      cache: {
        hitRate: cacheHitRate
      },
      activeRequests: 50 + Math.floor(Math.random() * 200)
    };
  }

  /**
   * 获取告警统计
   * @returns {Object} 告警统计
   */
  getAlertStats() {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;

    const recentAlerts = this.alertHistory.filter(a => a.timestamp.getTime() > last24h);

    const levelCounts = {
      info: 0,
      warning: 0,
      critical: 0,
      emergency: 0
    };

    recentAlerts.forEach(alert => {
      levelCounts[alert.level]++;
    });

    return {
      total: this.alertHistory.length,
      recent24h: recentAlerts.length,
      byLevel: levelCounts,
      rulesActive: Array.from(this.rules.values()).filter(r => r.enabled).length,
      suppressed: this.suppression.size,
      channelsEnabled: Object.values(this.config.channels).filter(ch => ch.enabled).length,
      lastCheck: now
    };
  }

  /**
   * 获取告警历史
   * @param {Object} options - 选项
   * @returns {Array} 告警历史
   */
  getAlertHistory(options = {}) {
    const { limit = 100, level, since } = options;

    let history = [...this.alertHistory];

    // 按级别过滤
    if (level && level !== 'all') {
      history = history.filter(a => a.level === level);
    }

    // 按时间过滤
    if (since) {
      const sinceTime = new Date(since);
      history = history.filter(a => a.timestamp > sinceTime);
    }

    // 排序和限制
    history.sort((a, b) => b.timestamp - a.timestamp);
    return history.slice(0, limit);
  }

  /**
   * 获取告警规则
   * @returns {Object} 告警规则列表
   */
  getRules() {
    const rules = {};

    for (const [id, rule] of this.rules.entries()) {
      rules[id] = {
        name: rule.name,
        level: rule.level,
        enabled: rule.enabled,
        created: rule.created,
        lastTriggered: rule.lastTriggered,
        triggerCount: rule.triggerCount,
        channels: rule.channels
      };
    }

    return rules;
  }

  /**
   * 更新告警阈值
   * @param {string} ruleId - 规则ID
   * @param {Object} thresholds - 新阈值
   */
  updateThresholds(ruleId, thresholds) {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.thresholds = { ...this.config.defaultThresholds, ...thresholds };
      logger.info('更新告警阈值', { ruleId, thresholds });
    }
  }

  /**
   * 测试告警
   * @param {string} ruleId - 规则ID
   * @param {Object} metrics - 测试指标
   */
  testAlert(ruleId, metrics) {
    const rule = this.rules.get(ruleId);
    if (rule && rule.enabled) {
      const shouldAlert = rule.condition(metrics);
      if (shouldAlert) {
        const alert = {
          id: `test_${ruleId}_${Date.now()}`,
          ruleId,
          ruleName: rule.name,
          level: rule.level,
          message: rule.message(metrics),
          suggestion: rule.suggestion,
          metrics: metrics,
          timestamp: new Date(),
          channels: ['webhook'],
          test: true
        };

        this.sendNotifications(alert);
        this.alertHistory.push(alert);

        return alert;
      }
    }
    return null;
  }
}

// 单例模式
const alertSystem = new AlertSystem();

module.exports = alertSystem;