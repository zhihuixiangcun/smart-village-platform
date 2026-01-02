const nodemailer = require('nodemailer');
const axios = require('axios');
const logger = require('../utils/logger');
const redis = require('redis');

class NotificationService {
  constructor() {
    this.redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.redisClient.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });

    this.redisClient.connect();

    // 邮件服务配置
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // 通知队列
    this.queue = [];
    this.processing = false;
    this.startQueueProcessor();
  }

  /**
   * 发送短信通知
   * @param {string} phoneNumber - 手机号
   * @param {Object} options - 短信选项
   */
  async sendSMS(phoneNumber, options) {
    try {
      const template = await this.getSMSTemplate(options.template);
      const message = this.renderTemplate(template, options.data || {});

      // 阿里云短信服务
      if (process.env.SMS_PROVIDER === 'aliyun') {
        return await this.sendAliyunSMS(phoneNumber, message, options.template);
      }
      // 腾讯云短信服务
      else if (process.env.SMS_PROVIDER === 'tencent') {
        return await this.sendTencentSMS(phoneNumber, message, options.template);
      }
      // 模拟短信发送（开发环境）
      else {
        logger.info('SMS sent (mock)', { to: phoneNumber, message });
        return { success: true, messageId: 'mock_' + Date.now() };
      }
    } catch (error) {
      logger.error('Error sending SMS:', error);
      throw error;
    }
  }

  /**
   * 发送邮件通知
   * @param {string} to - 收件人邮箱
   * @param {Object} options - 邮件选项
   */
  async sendEmail(to, options) {
    try {
      const template = await this.getEmailTemplate(options.template);
      const html = this.renderTemplate(template, options.data || {});

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: to,
        subject: options.subject || template.subject,
        html: html
      };

      const result = await this.emailTransporter.sendMail(mailOptions);

      logger.info('Email sent', {
        to: to,
        messageId: result.messageId,
        template: options.template
      });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * 发送推送通知
   * @param {string} userId - 用户ID
   * @param {Object} notification - 通知数据
   */
  async sendPushNotification(userId, notification) {
    try {
      // 获取用户的设备token
      const deviceTokens = await this.getUserDeviceTokens(userId);

      if (!deviceTokens || deviceTokens.length === 0) {
        logger.warn('No device tokens found for user', { userId });
        return { success: false, reason: 'No device tokens' };
      }

      // Firebase推送
      if (process.env.PUSH_PROVIDER === 'firebase') {
        return await this.sendFirebasePush(deviceTokens, notification);
      }
      // 个推
      else if (process.env.PUSH_PROVIDER === 'getui') {
        return await this.sendGetuiPush(deviceTokens, notification);
      }
      // 模拟推送（开发环境）
      else {
        logger.info('Push notification sent (mock)', {
          userId,
          title: notification.title,
          body: notification.body
        });
        return { success: true };
      }
    } catch (error) {
      logger.error('Error sending push notification:', error);
      throw error;
    }
  }

  /**
   * 微信小程序订阅消息
   * @param {string} openId - 微信OpenID
   * @param {Object} options - 订阅消息选项
   */
  async sendWechatMessage(openId, options) {
    try {
      const accessToken = await this.getWechatAccessToken();

      const message = {
        touser: openId,
        template_id: options.templateId,
        page: options.page || 'pages/index/index',
        data: options.data
      };

      const response = await axios.post(
        `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
        message
      );

      if (response.data.errcode === 0) {
        logger.info('Wechat message sent', { openId, templateId: options.templateId });
        return { success: true };
      } else {
        throw new Error(response.data.errmsg);
      }
    } catch (error) {
      logger.error('Error sending wechat message:', error);
      throw error;
    }
  }

  /**
   * 批量发送通知
   * @param {Array} recipients - 接收者列表
   * @param {Object} notification - 通知内容
   * @param {Object} options - 发送选项
   */
  async sendBulkNotification(recipients, notification, options = {}) {
    const results = {
      total: recipients.length,
      success: 0,
      failed: 0,
      details: []
    };

    // 分批处理，避免触发频率限制
    const batchSize = options.batchSize || 100;
    const batches = this.chunkArray(recipients, batchSize);

    for (const batch of batches) {
      const promises = batch.map(async (recipient) => {
        try {
          const result = await this.sendNotification(recipient, notification, options);
          results.success++;
          results.details.push({
            recipient: recipient.id || recipient.phone || recipient.email,
            status: 'success',
            messageId: result.messageId
          });
        } catch (error) {
          results.failed++;
          results.details.push({
            recipient: recipient.id || recipient.phone || recipient.email,
            status: 'failed',
            error: error.message
          });
        }
      });

      await Promise.allSettled(promises);

      // 批次间延迟
      if (options.batchDelay && batches.indexOf(batch) < batches.length - 1) {
        await this.sleep(options.batchDelay);
      }
    }

    return results;
  }

  /**
   * 添加到通知队列
   * @param {Object} notification - 通知对象
   */
  async addToQueue(notification) {
    const queueItem = {
      id: this.generateId(),
      ...notification,
      attempts: 0,
      createdAt: new Date(),
      nextRetryAt: new Date()
    };

    this.queue.push(queueItem);

    // 按优先级排序
    this.queue.sort((a, b) => (a.priority || 5) - (b.priority || 5));

    logger.info('Notification added to queue', {
      id: queueItem.id,
      type: notification.type,
      priority: notification.priority
    });

    return queueItem.id;
  }

  /**
   * 处理通知队列
   */
  async startQueueProcessor() {
    if (this.processing) return;

    this.processing = true;

    setInterval(async () => {
      if (this.queue.length === 0) return;

      const now = new Date();
      const readyItems = this.queue.filter(item => item.nextRetryAt <= now);

      if (readyItems.length === 0) return;

      for (const item of readyItems) {
        try {
          await this.processQueueItem(item);

          // 成功处理后移除
          const index = this.queue.indexOf(item);
          if (index > -1) {
            this.queue.splice(index, 1);
          }
        } catch (error) {
          await this.handleQueueItemError(item, error);
        }
      }
    }, 1000); // 每秒检查一次
  }

  /**
   * 处理队列项
   * @param {Object} item - 队列项
   */
  async processQueueItem(item) {
    const maxRetries = item.maxRetries || 3;

    if (item.attempts >= maxRetries) {
      logger.error('Max retries exceeded for notification', {
        id: item.id,
        attempts: item.attempts
      });

      // 移除超出重试次数的项目
      const index = this.queue.indexOf(item);
      if (index > -1) {
        this.queue.splice(index, 1);
      }
      return;
    }

    item.attempts++;

    // 发送通知
    await this.sendNotification(item.recipient, item.notification, item.options);

    logger.info('Notification processed from queue', {
      id: item.id,
      attempts: item.attempts
    });
  }

  /**
   * 处理队列项错误
   * @param {Object} item - 队列项
   * @param {Error} error - 错误
   */
  async handleQueueItemError(item, error) {
    logger.error('Queue item error', {
      id: item.id,
      attempts: item.attempts,
      error: error.message
    });

    // 计算下次重试时间（指数退避）
    const retryDelay = Math.min(
      Math.pow(2, item.attempts) * 1000, // 2^n 秒
      60000 // 最大1分钟
    );

    item.nextRetryAt = new Date(Date.now() + retryDelay);
  }

  /**
   * 获取短信模板
   * @param {string} templateId - 模板ID
   */
  async getSMSTemplate(templateId) {
    const templates = {
      emergency_call: '紧急呼叫：{emergencyType}，地点：{location}，请立即响应！呼叫编号：{callId}',
      emergency_escalation: '紧急升级通知：{emergencyType}，地点：{location}，当前无值班人员响应！',
      duty_reminder: '值班提醒：您今天的值班时间是{time}，请按时到岗。',
      meeting_notice: '会议通知：{title}将于{time}在{location}召开，请准时参加。'
    };

    return templates[templateId] || templateId;
  }

  /**
   * 获取邮件模板
   * @param {string} templateId - 模板ID
   */
  async getEmailTemplate(templateId) {
    const templates = {
      emergency_report: {
        subject: '紧急事件报告',
        html: `
          <h2>紧急事件报告</h2>
          <p><strong>事件类型：</strong>{emergencyType}</p>
          <p><strong>发生时间：</strong>{time}</p>
          <p><strong>地点：</strong>{location}</p>
          <p><strong>描述：</strong>{description}</p>
          <p><strong>处理人员：</strong>{responder}</p>
        `
      },
      daily_report: {
        subject: '每日工作报告',
        html: `
          <h2>每日工作报告</h2>
          <p><strong>日期：</strong>{date}</p>
          <p><strong>处理事件数：</strong>{eventCount}</p>
          <p><strong>待处理事项：</strong>{pendingCount}</p>
        `
      }
    };

    return templates[templateId] || { subject: '通知', html: templateId };
  }

  /**
   * 渲染模板
   * @param {string} template - 模板内容
   * @param {Object} data - 数据
   */
  renderTemplate(template, data) {
    let rendered = template;

    for (const [key, value] of Object.entries(data)) {
      rendered = rendered.replace(
        new RegExp(`\\{${key}\\}`, 'g'),
        value || ''
      );
    }

    return rendered;
  }

  /**
   * 阿里云短信发送
   * @param {string} phone - 手机号
   * @param {string} message - 消息内容
   * @param {string} templateCode - 模板代码
   */
  async sendAliyunSMS(phone, message, templateCode) {
    // TODO: 实现阿里云短信API调用
    logger.info('Aliyun SMS', { phone, templateCode });
    return { success: true };
  }

  /**
   * 腾讯云短信发送
   * @param {string} phone - 手机号
   * @param {string} message - 消息内容
   * @param {string} templateId - 模板ID
   */
  async sendTencentSMS(phone, message, templateId) {
    // TODO: 实现腾讯云短信API调用
    logger.info('Tencent SMS', { phone, templateId });
    return { success: true };
  }

  /**
   * Firebase推送
   * @param {Array} tokens - 设备token列表
   * @param {Object} notification - 通知内容
   */
  async sendFirebasePush(tokens, notification) {
    // TODO: 实现Firebase推送
    logger.info('Firebase push', { tokenCount: tokens.length, notification });
    return { success: true };
  }

  /**
   * 个推
   * @param {Array} tokens - 设备token列表
   * @param {Object} notification - 通知内容
   */
  async sendGetuiPush(tokens, notification) {
    // TODO: 实现个推API调用
    logger.info('Getui push', { tokenCount: tokens.length, notification });
    return { success: true };
  }

  /**
   * 获取用户设备token
   * @param {string} userId - 用户ID
   */
  async getUserDeviceTokens(userId) {
    try {
      const tokens = await this.redisClient.get(`device_tokens:${userId}`);
      return tokens ? JSON.parse(tokens) : [];
    } catch (error) {
      logger.error('Error getting user device tokens:', error);
      return [];
    }
  }

  /**
   * 保存用户设备token
   * @param {string} userId - 用户ID
   * @param {string} token - 设备token
   */
  async saveUserDeviceToken(userId, token) {
    try {
      const tokens = await this.getUserDeviceTokens(userId);

      if (!tokens.includes(token)) {
        tokens.push(token);
        await this.redisClient.setEx(
          `device_tokens:${userId}`,
          86400 * 30, // 30天过期
          JSON.stringify(tokens)
        );
      }
    } catch (error) {
      logger.error('Error saving user device token:', error);
    }
  }

  /**
   * 获取微信访问令牌
   */
  async getWechatAccessToken() {
    try {
      const cached = await this.redisClient.get('wechat_access_token');

      if (cached) {
        return cached;
      }

      const response = await axios.get(
        `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${process.env.WECHAT_APPID}&secret=${process.env.WECHAT_SECRET}`
      );

      if (response.data.access_token) {
        const token = response.data.access_token;
        const expiresIn = response.data.expires_in || 7200;

        await this.redisClient.setEx(
          'wechat_access_token',
          expiresIn - 60, // 提前1分钟过期
          token
        );

        return token;
      } else {
        throw new Error(response.data.errmsg || 'Failed to get access token');
      }
    } catch (error) {
      logger.error('Error getting WeChat access token:', error);
      throw error;
    }
  }

  /**
   * 发送通知（统一入口）
   * @param {Object} recipient - 接收者
   * @param {Object} notification - 通知内容
   * @param {Object} options - 选项
   */
  async sendNotification(recipient, notification, options = {}) {
    const promises = [];

    // 短信
    if (notification.sms && recipient.phone) {
      promises.push(this.sendSMS(recipient.phone, notification.sms));
    }

    // 邮件
    if (notification.email && recipient.email) {
      promises.push(this.sendEmail(recipient.email, notification.email));
    }

    // 推送
    if (notification.push && recipient.id) {
      promises.push(this.sendPushNotification(recipient.id, notification.push));
    }

    // 微信
    if (notification.wechat && recipient.openId) {
      promises.push(this.sendWechatMessage(recipient.openId, notification.wechat));
    }

    const results = await Promise.allSettled(promises);

    // 检查是否有失败
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0 && failures.length === results.length) {
      // 全部失败
      throw new Error('All notification channels failed');
    }

    return {
      success: failures.length < results.length,
      channels: results.length,
      failures: failures.length
    };
  }

  /**
   * 工具函数：数组分块
   * @param {Array} array - 数组
   * @param {number} size - 块大小
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 工具函数：睡眠
   * @param {number} ms - 毫秒数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 生成ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 获取通知统计
   * @param {Object} filters - 过滤条件
   */
  async getNotificationStats(filters = {}) {
    try {
      // TODO: 实现通知统计查询
      return {
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0
      };
    } catch (error) {
      logger.error('Error getting notification stats:', error);
      return null;
    }
  }
}

module.exports = new NotificationService();