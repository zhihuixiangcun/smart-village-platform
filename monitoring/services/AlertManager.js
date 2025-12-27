/**
 * 告警管理器
 * 负责智慧乡村平台的监控告警、通知发送和告警规则管理
 */

const EventEmitter = require('events');
const nodemailer = require('nodemailer');
const axios = require('axios');
const logger = require('./../../src/services/performanceMonitor').logger;

class AlertManager extends EventEmitter {
  constructor() {
    super();
    this.alertRules = new Map();
    this.alertHistory = new Map();
    this.suppressionRules = new Map();
    this.notificationChannels = new Map();
    this.isRunning = false;

    // 初始化告警规则
    this.initDefaultRules();
    this.initNotificationChannels();
  }

  /**
   * 初始化默认告警规则
   */
  initDefaultRules() {
    // 系统性能告警规则
    this.addAlertRule('high_response_time', {
      name: '响应时间过高',
      metric: 'responseTime',
      operator: '>',
      threshold: 1000,
      duration: 300000, // 5分钟
      severity: 'warning',
      description: '系统响应时间超过1000ms，影响用户体验',
      tags: ['performance', 'response_time']
    });

    this.addAlertRule('high_error_rate', {
      name: '错误率过高',
      metric: 'errorRate',
      operator: '>',
      threshold: 5,
      duration: 180000, // 3分钟
      severity: 'critical',
      description: '系统错误率超过5%，需要立即处理',
      tags: ['performance', 'error_rate']
    });

    this.addAlertRule('low_active_users', {
      name: '活跃用户数过低',
      metric: 'activeUsers',
      operator: '<',
      threshold: 10,
      duration: 600000, // 10分钟
      severity: 'warning',
      description: '活跃用户数低于10，可能存在系统问题',
      tags: ['user', 'activity']
    });

    // 业务告警规则
    this.addAlertRule('low_transaction_rate', {
      name: '交易速率过低',
      metric: 'transactionRate',
      operator: '<',
      threshold: 1,
      duration: 300000,
      severity: 'warning',
      description: '交易处理速率过低，影响业务运营',
      tags: ['business', 'transaction']
    });

    this.addAlertRule('high_transaction_failure', {
      name: '交易失败率过高',
      metric: 'transactionFailureRate',
      operator: '>',
      threshold: 10,
      duration: 120000,
      severity: 'critical',
      description: '交易失败率超过10%，需要立即处理',
      tags: ['business', 'transaction']
    });

    // 服务可用性告警
    this.addAlertRule('service_down', {
      name: '服务不可用',
      metric: 'serviceAvailability',
      operator: '<',
      threshold: 99,
      duration: 60000,
      severity: 'critical',
      description: '服务可用性低于99%',
      tags: ['availability', 'service']
    });

    // 数据库告警
    this.addAlertRule('database_connection_high', {
      name: '数据库连接数过高',
      metric: 'dbConnections',
      operator: '>',
      threshold: 80,
      duration: 180000,
      severity: 'warning',
      description: '数据库连接使用率超过80%',
      tags: ['database', 'connection']
    });

    this.addAlertRule('database_slow_query', {
      name: '数据库慢查询',
      metric: 'slowQueryRate',
      operator: '>',
      threshold: 5,
      duration: 300000,
      severity: 'warning',
      description: '慢查询率超过5%',
      tags: ['database', 'performance']
    });

    // 村务特定告警
    this.addAlertRule('emergency_event', {
      name: '紧急事件',
      metric: 'emergencyEvents',
      operator: '>',
      threshold: 0,
      duration: 0,
      severity: 'critical',
      description: '检测到紧急事件，需要立即响应',
      tags: ['emergency', 'village']
    });

    this.addAlertRule('task_overdue', {
      name: '任务逾期',
      metric: 'overdueTaskRate',
      operator: '>',
      threshold: 10,
      duration: 600000,
      severity: 'warning',
      description: '任务逾期率超过10%',
      tags: ['task', 'management']
    });
  }

  /**
   * 初始化通知渠道
   */
  initNotificationChannels() {
    // 邮件通知
    this.notificationChannels.set('email', {
      enabled: process.env.EMAIL_NOTIFICATIONS === 'true',
      config: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      }
    });

    // 短信通知
    this.notificationChannels.set('sms', {
      enabled: process.env.SMS_NOTIFICATIONS === 'true',
      config: {
        apiKey: process.env.SMS_API_KEY,
        apiSecret: process.env.SMS_API_SECRET,
        apiEndpoint: process.env.SMS_API_ENDPOINT
      }
    });

    // 微信通知
    this.notificationChannels.set('wechat', {
      enabled: process.env.WECHAT_NOTIFICATIONS === 'true',
      config: {
        corpId: process.env.WECHAT_CORP_ID,
        corpSecret: process.env.WECHAT_CORP_SECRET,
        agentId: process.env.WECHAT_AGENT_ID
      }
    });

    // 钉钉通知
    this.notificationChannels.set('dingtalk', {
      enabled: process.env.DINGTALK_NOTIFICATIONS === 'true',
      config: {
        accessToken: process.env.DINGTALK_ACCESS_TOKEN,
        secret: process.env.DINGTALK_SECRET
      }
    });

    // Webhook通知
    this.notificationChannels.set('webhook', {
      enabled: process.env.WEBHOOK_NOTIFICATIONS === 'true',
      config: {
        url: process.env.WEBHOOK_URL,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    });
  }

  /**
   * 启动告警管理器
   */
  async start() {
    if (this.isRunning) {
      logger.warn('告警管理器已在运行');
      return;
    }

    this.isRunning = true;
    logger.info('启动告警管理器');

    // 初始化邮件传输器
    if (this.notificationChannels.get('email').enabled) {
      this.emailTransporter = nodemailer.createTransporter(
        this.notificationChannels.get('email').config
      );
    }

    // 监听指标事件
    this.on('metric', this.evaluateAlerts.bind(this));

    // 定期检查告警抑制规则
    this.startSuppressionCheck();
  }

  /**
   * 停止告警管理器
   */
  async stop() {
    this.isRunning = false;
    logger.info('告警管理器已停止');
  }

  /**
   * 添加告警规则
   */
  addAlertRule(ruleId, rule) {
    this.alertRules.set(ruleId, {
      id: ruleId,
      name: rule.name,
      metric: rule.metric,
      operator: rule.operator,
      threshold: rule.threshold,
      duration: rule.duration || 0,
      severity: rule.severity || 'warning',
      description: rule.description,
      tags: rule.tags || [],
      enabled: rule.enabled !== false,
      lastEvaluation: null,
      triggeredCount: 0,
      lastTriggered: null
    });

    logger.info(`添加告警规则: ${ruleId} - ${rule.name}`);
  }

  /**
   * 移除告警规则
   */
  removeAlertRule(ruleId) {
    const removed = this.alertRules.delete(ruleId);
    if (removed) {
      logger.info(`移除告警规则: ${ruleId}`);
    }
    return removed;
  }

  /**
   * 添加告警抑制规则
   */
  addSuppressionRule(ruleId, rule) {
    this.suppressionRules.set(ruleId, {
      id: ruleId,
      name: rule.name,
      condition: rule.condition,
      startTime: new Date(rule.startTime),
      endTime: new Date(rule.endTime),
      reason: rule.reason,
      createdBy: rule.createdBy
    });

    logger.info(`添加告警抑制规则: ${ruleId} - ${rule.name}`);
  }

  /**
   * 评估告警规则
   */
  async evaluateAlerts(metricData) {
    if (!this.isRunning) return;

    const { metric, value, timestamp } = metricData;

    // 找到相关的告警规则
    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled || rule.metric !== metric) continue;

      // 检查是否被抑制
      if (this.isSuppressed(ruleId, timestamp)) {
        continue;
      }

      // 评估告警条件
      const triggered = this.evaluateCondition(value, rule.operator, rule.threshold);

      if (triggered) {
        await this.triggerAlert(ruleId, rule, value, timestamp);
      } else {
        await this.resolveAlert(ruleId, rule, timestamp);
      }
    }
  }

  /**
   * 评估告警条件
   */
  evaluateCondition(value, operator, threshold) {
    switch (operator) {
      case '>':
        return value > threshold;
      case '>=':
        return value >= threshold;
      case '<':
        return value < threshold;
      case '<=':
        return value <= threshold;
      case '==':
        return value === threshold;
      case '!=':
        return value !== threshold;
      case 'in':
        return Array.isArray(threshold) && threshold.includes(value);
      case 'not_in':
        return Array.isArray(threshold) && !threshold.includes(value);
      default:
        return false;
    }
  }

  /**
   * 触发告警
   */
  async triggerAlert(ruleId, rule, value, timestamp) {
    const now = Date.now();
    const ruleIdKey = `${ruleId}:${Math.floor(timestamp / 60000)}`; // 按分钟分组

    // 检查是否已经在相同规则下触发过
    if (this.alertHistory.has(ruleIdKey)) {
      return;
    }

    // 检查持续时间要求
    if (rule.duration > 0) {
      const startTime = now - rule.duration;
      const hasPersisted = await this.checkAlertPersistence(rule, value, startTime, now);
      if (!hasPersisted) {
        return;
      }
    }

    // 创建告警实例
    const alert = {
      id: this.generateAlertId(),
      ruleId: ruleId,
      name: rule.name,
      severity: rule.severity,
      description: rule.description,
      metric: rule.metric,
      value: value,
      threshold: rule.threshold,
      operator: rule.operator,
      triggeredAt: new Date(timestamp),
      status: 'firing',
      tags: rule.tags,
      fingerprint: this.generateFingerprint(ruleId, value)
    };

    // 记录告警历史
    this.alertHistory.set(ruleIdKey, alert);
    rule.triggeredCount++;
    rule.lastTriggered = new Date(timestamp);
    rule.lastEvaluation = new Date(timestamp);

    // 发送通知
    await this.sendNotification(alert);

    // 发出告警事件
    this.emit('alert', alert);

    logger.warn(`告警触发: ${rule.name}`, {
      ruleId,
      value,
      threshold,
      severity: rule.severity
    });
  }

  /**
   * 解决告警
   */
  async resolveAlert(ruleId, rule, timestamp) {
    // 查找并移除相关的告警
    for (const [key, alert] of this.alertHistory) {
      if (key.startsWith(ruleId) && alert.status === 'firing') {
        alert.status = 'resolved';
        alert.resolvedAt = new Date(timestamp);
        alert.duration = alert.resolvedAt - alert.triggeredAt;

        // 发送解决通知
        await this.sendResolutionNotification(alert);

        // 移除历史记录
        this.alertHistory.delete(key);

        // 发出解决事件
        this.emit('alert_resolved', alert);

        logger.info(`告警解决: ${rule.name}`, {
          ruleId,
          duration: alert.duration
        });

        break;
      }
    }

    rule.lastEvaluation = new Date(timestamp);
  }

  /**
   * 检查告警是否被抑制
   */
  isSuppressed(ruleId, timestamp) {
    for (const [suppressionId, suppression] of this.suppressionRules) {
      if (timestamp >= suppression.startTime && timestamp <= suppression.endTime) {
        if (this.matchSuppressionCondition(ruleId, suppression.condition)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 匹配抑制条件
   */
  matchSuppressionCondition(ruleId, condition) {
    try {
      // 简单的条件匹配，可以扩展为更复杂的规则
      if (typeof condition === 'string') {
        return ruleId.includes(condition);
      } else if (Array.isArray(condition)) {
        return condition.includes(ruleId);
      } else if (typeof condition === 'function') {
        return condition(ruleId);
      }
      return false;
    } catch (error) {
      logger.error('匹配抑制条件失败:', error);
      return false;
    }
  }

  /**
   * 检查告警持续性
   */
  async checkAlertPersistence(rule, value, startTime, endTime) {
    try {
      // 这里应该检查在指定时间范围内指标是否持续超过阈值
      // 简化实现，实际应该查询历史指标数据
      return true;
    } catch (error) {
      logger.error('检查告警持续性失败:', error);
      return false;
    }
  }

  /**
   * 发送通知
   */
  async sendNotification(alert) {
    const notifications = this.getNotificationConfig(alert.severity);

    for (const channel of notifications) {
      try {
        await this.sendNotificationToChannel(channel, alert);
      } catch (error) {
        logger.error(`发送通知失败 (${channel}):`, error);
      }
    }
  }

  /**
   * 发送解决通知
   */
  async sendResolutionNotification(alert) {
    const notifications = this.getNotificationConfig(alert.severity, true);

    for (const channel of notifications) {
      try {
        await this.sendResolutionNotificationToChannel(channel, alert);
      } catch (error) {
        logger.error(`发送解决通知失败 (${channel}):`, error);
      }
    }
  }

  /**
   * 根据严重程度获取通知渠道配置
   */
  getNotificationConfig(severity, isResolution = false) {
    const config = {
      critical: ['email', 'sms', 'wechat', 'dingtalk'],
      warning: ['email', 'wechat', 'dingtalk'],
      info: ['email']
    };

    // 解决通知通常只发送邮件
    if (isResolution) {
      return config.info;
    }

    return config[severity] || config.warning;
  }

  /**
   * 向指定渠道发送通知
   */
  async sendNotificationToChannel(channel, alert) {
    const channelConfig = this.notificationChannels.get(channel);
    if (!channelConfig || !channelConfig.enabled) {
      return;
    }

    switch (channel) {
      case 'email':
        await this.sendEmailNotification(alert);
        break;
      case 'sms':
        await this.sendSMSNotification(alert);
        break;
      case 'wechat':
        await this.sendWechatNotification(alert);
        break;
      case 'dingtalk':
        await this.sendDingtalkNotification(alert);
        break;
      case 'webhook':
        await this.sendWebhookNotification(alert);
        break;
      default:
        logger.warn(`未知的通知渠道: ${channel}`);
    }
  }

  /**
   * 发送邮件通知
   */
  async sendEmailNotification(alert) {
    if (!this.emailTransporter) return;

    const subject = `[${alert.severity.toUpperCase()}] ${alert.name}`;
    const html = this.generateEmailTemplate(alert);

    await this.emailTransporter.sendMail({
      from: process.env.ALERT_EMAIL_FROM || 'monitoring@smartvillage.com',
      to: process.env.ALERT_EMAIL_TO || 'admin@smartvillage.com',
      subject,
      html
    });
  }

  /**
   * 发送短信通知
   */
  async sendSMSNotification(alert) {
    const config = this.notificationChannels.get('sms').config;
    const message = `[${alert.severity.toUpperCase()}] ${alert.name}: ${alert.description}`;

    // 调用短信API
    await axios.post(config.apiEndpoint, {
      message,
      phone: process.env.ALERT_PHONE,
      apiKey: config.apiKey,
      apiSecret: config.apiSecret
    });
  }

  /**
   * 发送微信通知
   */
  async sendWechatNotification(alert) {
    const config = this.notificationChannels.get('wechat').config;

    // 获取access_token
    const tokenResponse = await axios.get(
      `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${config.corpId}&corpsecret=${config.corpSecret}`
    );

    const accessToken = tokenResponse.data.access_token;

    // 发送应用消息
    await axios.post(
      `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`,
      {
        touser: '@all',
        agentid: config.agentId,
        msgtype: 'textcard',
        textcard: {
          title: alert.name,
          description: alert.description,
          url: `${process.env.DASHBOARD_URL}/alerts/${alert.id}`,
          btntxt: '查看详情'
        }
      }
    );
  }

  /**
   * 发送钉钉通知
   */
  async sendDingtalkNotification(alert) {
    const config = this.notificationChannels.get('dingtalk').config;

    const message = {
      msgtype: 'markdown',
      markdown: {
        title: alert.name,
        text: this.generateDingtalkTemplate(alert)
      }
    };

    // 计算签名
    const timestamp = Date.now();
    const sign = this.generateDingtalkSign(timestamp, config.secret);

    await axios.post(
      `https://oapi.dingtalk.com/robot/send?access_token=${config.accessToken}&timestamp=${timestamp}&sign=${sign}`,
      message
    );
  }

  /**
   * 发送Webhook通知
   */
  async sendWebhookNotification(alert) {
    const config = this.notificationChannels.get('webhook').config;

    await axios.post(config.url, {
      alert,
      timestamp: Date.now()
    }, {
      headers: config.headers
    });
  }

  /**
   * 生成邮件模板
   */
  generateEmailTemplate(alert) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${this.getSeverityColor(alert.severity)}; color: white; padding: 20px; text-align: center;">
          <h1>${alert.name}</h1>
          <p>严重程度: ${alert.severity.toUpperCase()}</p>
        </div>

        <div style="padding: 20px; background-color: #f9f9f9;">
          <h2>告警详情</h2>
          <p><strong>描述:</strong> ${alert.description}</p>
          <p><strong>指标:</strong> ${alert.metric}</p>
          <p><strong>当前值:</strong> ${alert.value}</p>
          <p><strong>阈值:</strong> ${alert.operator} ${alert.threshold}</p>
          <p><strong>触发时间:</strong> ${alert.triggeredAt.toLocaleString()}</p>
          <p><strong>标签:</strong> ${alert.tags.join(', ')}</p>
        </div>

        <div style="padding: 20px; text-align: center;">
          <a href="${process.env.DASHBOARD_URL}/alerts/${alert.id}"
             style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            查看详情
          </a>
        </div>
      </div>
    `;
  }

  /**
   * 生成钉钉模板
   */
  generateDingtalkTemplate(alert) {
    return `
      ### ${alert.name}

      **严重程度**: ${alert.severity.toUpperCase()}

      **描述**: ${alert.description}

      **指标**: ${alert.metric}

      **当前值**: ${alert.value}

      **阈值**: ${alert.operator} ${alert.threshold}

      **触发时间**: ${alert.triggeredAt.toLocaleString()}

      **标签**: ${alert.tags.join(', ')}

      [查看详情](${process.env.DASHBOARD_URL}/alerts/${alert.id})
    `;
  }

  /**
   * 获取严重程度对应的颜色
   */
  getSeverityColor(severity) {
    const colors = {
      critical: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8'
    };
    return colors[severity] || '#6c757d';
  }

  /**
   * 生成告警ID
   */
  generateAlertId() {
    return 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 生成指纹
   */
  generateFingerprint(ruleId, value) {
    return ruleId + '_' + Math.round(value).toString();
  }

  /**
   * 生成钉钉签名
   */
  generateDingtalkSign(timestamp, secret) {
    const crypto = require('crypto');
    const stringToSign = timestamp + '\n' + secret;
    return crypto.createHmac('sha256', secret).update(stringToSign).digest('base64');
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts() {
    const activeAlerts = [];
    for (const alert of this.alertHistory.values()) {
      if (alert.status === 'firing') {
        activeAlerts.push(alert);
      }
    }
    return activeAlerts;
  }

  /**
   * 获取告警统计
   */
  getAlertStats() {
    const stats = {
      total: this.alertHistory.size,
      active: 0,
      resolved: 0,
      bySeverity: {
        critical: 0,
        warning: 0,
        info: 0
      },
      byRule: {}
    };

    for (const [ruleId, rule] of this.alertRules) {
      stats.byRule[ruleId] = {
        name: rule.name,
        triggeredCount: rule.triggeredCount,
        lastTriggered: rule.lastTriggered
      };
    }

    for (const alert of this.alertHistory.values()) {
      if (alert.status === 'firing') {
        stats.active++;
        stats.bySeverity[alert.severity]++;
      } else {
        stats.resolved++;
      }
    }

    return stats;
  }

  /**
   * 启动抑制规则检查
   */
  startSuppressionCheck() {
    // 每小时检查一次过期的抑制规则
    setInterval(() => {
      const now = new Date();
      for (const [ruleId, rule] of this.suppressionRules) {
        if (now > rule.endTime) {
          this.suppressionRules.delete(ruleId);
          logger.info(`移除过期的告警抑制规则: ${ruleId}`);
        }
      }
    }, 3600000); // 1小时
  }
}

module.exports = AlertManager;