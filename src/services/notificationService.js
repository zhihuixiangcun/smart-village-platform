/**
 * 通知服务
 */

const EventEmitter = require('events');
const logger = require('../utils/logger');

class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.emailQueue = [];
    this.smsQueue = [];
    this.pushQueue = [];
    this.isProcessing = false;

    // 启动队列处理
    this.startProcessing();
  }

  /**
   * 发送邮件通知
   */
  async sendEmail(options) {
    const {
      to,
      subject,
      text,
      html,
      template,
      data = {}
    } = options;

    try {
      const emailData = {
        to: Array.isArray(to) ? to : [to],
        subject,
        text,
        html,
        template,
        data,
        type: 'email',
        timestamp: new Date()
      };

      // 添加到队列
      this.emailQueue.push(emailData);

      logger.info(`邮件通知已加入队列: ${subject}`, { to });

      return {
        success: true,
        message: '邮件通知已发送',
        queueId: emailQueue.length
      };
    } catch (error) {
      logger.error('发送邮件通知失败:', error);
      throw error;
    }
  }

  /**
   * 发送短信通知
   */
  async sendSMS(options) {
    const {
      phone,
      message,
      template,
      params = {}
    } = options;

    try {
      const smsData = {
        phone,
        message,
        template,
        params,
        type: 'sms',
        timestamp: new Date()
      };

      // 添加到队列
      this.smsQueue.push(smsData);

      logger.info(`短信通知已加入队列`, { phone });

      return {
        success: true,
        message: '短信通知已发送',
        queueId: this.smsQueue.length
      };
    } catch (error) {
      logger.error('发送短信通知失败:', error);
      throw error;
    }
  }

  /**
   * 发送推送通知
   */
  async sendPushNotification(options) {
    const {
      userIds,
      title,
      body,
      data = {},
      priority = 'normal'
    } = options;

    try {
      const pushData = {
        userIds: Array.isArray(userIds) ? userIds : [userIds],
        title,
        body,
        data,
        priority,
        type: 'push',
        timestamp: new Date()
      };

      // 添加到队列
      this.pushQueue.push(pushData);

      logger.info(`推送通知已加入队列: ${title}`, { userIds });

      return {
        success: true,
        message: '推送通知已发送',
        queueId: this.pushQueue.length
      };
    } catch (error) {
      logger.error('发送推送通知失败:', error);
      throw error;
    }
  }

  /**
   * 发送紧急通知
   */
  async sendEmergencyNotification(options) {
    const {
      type,
      title,
      message,
      data = {},
      channels = ['email', 'sms', 'push'],
      priority = 'high'
    } = options;

    try {
      // 紧急通知立即发送
      const notifications = [];

      // 根据配置的渠道发送
      if (channels.includes('email')) {
        notifications.push(this.sendEmail({
          to: data.email || 'admin@village.com',
          subject: `[紧急] ${title}`,
          text: message,
          priority: 'high'
        }));
      }

      if (channels.includes('sms')) {
        notifications.push(this.sendSMS({
          phone: data.phone,
          message,
          priority: 'high'
        }));
      }

      if (channels.includes('push')) {
        notifications.push(this.sendPushNotification({
          userIds: data.userIds || [],
          title: `[紧急] ${title}`,
          body: message,
          data: { ...data, type: 'emergency' },
          priority: 'high'
        }));
      }

      // 发送系统事件
      this.emit('emergency_notification', {
        type,
        title,
        message,
        data,
        channels,
        timestamp: new Date()
      });

      logger.warn(`紧急通知已发送: ${type}`, { title });

      return {
        success: true,
        message: '紧急通知已发送',
        notifications
      };
    } catch (error) {
      logger.error('发送紧急通知失败:', error);
      throw error;
    }
  }

  /**
   * 发送批量通知
   */
  async sendBulkNotification(options) {
    const {
      type,
      recipients,
      subject,
      message,
      channels = ['email'],
      data = {}
    } = options;

    try {
      const results = [];

      for (const recipient of recipients) {
        const notificationOptions = {
          ...recipient,
          subject,
          message,
          data: { ...data, type, recipientId: recipient.id },
          channels
        };

        const notifications = [];

        if (channels.includes('email')) {
          notifications.push(this.sendEmail({
            to: recipient.email,
            subject,
            text: message,
            data: notificationOptions.data
          }));
        }

        if (channels.includes('sms')) {
          notifications.push(this.sendSMS({
            phone: recipient.phone,
            message,
            data: notificationOptions.data
          }));
        }

        if (channels.includes('push')) {
          notifications.push(this.sendPushNotification({
            userIds: recipient.userId,
            title: subject,
            body: message,
            data: notificationOptions.data
          }));
        }

        results.push({
          recipientId: recipient.id,
          notifications
        });
      }

      logger.info(`批量通知已发送: ${type}`, {
        recipientCount: recipients.length
      });

      return {
        success: true,
        message: '批量通知已发送',
        results
      };
    } catch (error) {
      logger.error('发送批量通知失败:', error);
      throw error;
    }
  }

  /**
   * 启动队列处理
   */
  startProcessing() {
    if (this.isProcessing) return;

    this.isProcessing = true;

    // 处理邮件队列
    setInterval(() => {
      this.processEmailQueue();
    }, 5000);

    // 处理短信队列
    setInterval(() => {
      this.processSMSQueue();
    }, 3000);

    // 处理推送队列
    setInterval(() => {
      this.processPushQueue();
    }, 2000);

    logger.info('通知服务队列处理已启动');
  }

  /**
   * 处理邮件队列
   */
  async processEmailQueue() {
    if (this.emailQueue.length === 0) return;

    const email = this.emailQueue.shift();

    try {
      // 这里集成实际的邮件服务
      await this._sendEmailReal(email);

      this.emit('email_sent', email);
      logger.debug('邮件已发送', { subject: email.subject });
    } catch (error) {
      logger.error('邮件发送失败:', error);

      // 重试逻辑
      if (email.retryCount < 3) {
        email.retryCount = (email.retryCount || 0) + 1;
        this.emailQueue.unshift(email);
      } else {
        this.emit('email_failed', email);
      }
    }
  }

  /**
   * 处理短信队列
   */
  async processSMSQueue() {
    if (this.smsQueue.length === 0) return;

    const sms = this.smsQueue.shift();

    try {
      // 这里集成实际的短信服务
      await this._sendSMSReal(sms);

      this.emit('sms_sent', sms);
      logger.debug('短信已发送', { phone: sms.phone });
    } catch (error) {
      logger.error('短信发送失败:', error);

      // 重试逻辑
      if (sms.retryCount < 3) {
        sms.retryCount = (sms.retryCount || 0) + 1;
        this.smsQueue.unshift(sms);
      } else {
        this.emit('sms_failed', sms);
      }
    }
  }

  /**
   * 处理推送队列
   */
  async processPushQueue() {
    if (this.pushQueue.length === 0) return;

    const push = this.pushQueue.shift();

    try {
      // 这里集成实际的推送服务
      await this._sendPushReal(push);

      this.emit('push_sent', push);
      logger.debug('推送通知已发送', { title: push.title });
    } catch (error) {
      logger.error('推送通知发送失败:', error);

      // 重试逻辑
      if (push.retryCount < 3) {
        push.retryCount = (push.retryCount || 0) + 1;
        this.pushQueue.unshift(push);
      } else {
        this.emit('push_failed', push);
      }
    }
  }

  /**
   * 实际发送邮件
   */
  async _sendEmailReal(emailData) {
    // 示例实现 - 需要替换为实际的邮件服务
    logger.info('发送邮件:', {
      to: emailData.to,
      subject: emailData.subject
    });

    // 模拟发送延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    return { success: true, messageId: `email_${Date.now()}` };
  }

  /**
   * 实际发送短信
   */
  async _sendSMSReal(smsData) {
    // 示例实现 - 需要替换为实际的短信服务
    logger.info('发送短信:', {
      phone: smsData.phone,
      message: smsData.message
    });

    // 模拟发送延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    return { success: true, messageId: `sms_${Date.now()}` };
  }

  /**
   * 实际发送推送
   */
  async _sendPushReal(pushData) {
    // 示例实现 - 需要替换为实际的推送服务
    logger.info('发送推送通知:', {
      title: pushData.title,
      userIds: pushData.userIds
    });

    // 模拟发送延迟
    await new Promise(resolve => setTimeout(resolve, 300));

    return { success: true, messageId: `push_${Date.now()}` };
  }

  /**
   * 获取队列状态
   */
  getQueueStatus() {
    return {
      emailQueueLength: this.emailQueue.length,
      smsQueueLength: this.smsQueue.length,
      pushQueueLength: this.pushQueue.length,
      isProcessing: this.isProcessing
    };
  }

  /**
   * 清空队列
   */
  clearQueues() {
    this.emailQueue = [];
    this.smsQueue = [];
    this.pushQueue = [];

    logger.info('通知队列已清空');
  }

  /**
   * 停止处理
   */
  stopProcessing() {
    this.isProcessing = false;
    logger.info('通知队列处理已停止');
  }
}

// 创建单例实例
const notificationService = new NotificationService();

module.exports = notificationService;