/**
 * 审批通知服务
 * 专门处理财务审批流程中的通知推送
 * 支持短信、邮件、应用内通知、WebSocket实时推送
 */

const cloudCommunicationService = require('./cloudCommunicationService');
const logger = require('../config/logger');
const NotificationModel = require('../models/Notification');

class ApprovalNotificationService {
  constructor() {
    // 通知模板配置
    this.templates = {
      // 审批请求通知
      approval_request: {
        sms: {
          templateCode: 'SMS_APPROVAL_REQUEST',
          content: '【智慧乡村】您有新的财务审批任务：{transactionNumber}，金额：{amount}，请及时处理。'
        },
        email: {
          subject: '财务审批通知 - {transactionNumber}',
          template: 'approval_request.html'
        },
        push: {
          title: '财务审批通知',
          content: '您有新的财务审批任务',
          data: { type: 'approval_request' }
        }
      },

      // 审批结果通知
      approval_result: {
        sms: {
          templateCode: 'SMS_APPROVAL_RESULT',
          content: '【智慧乡村】您的财务申请{transactionNumber}已{decision}，原因：{comments}'
        },
        email: {
          subject: '审批结果通知 - {transactionNumber}',
          template: 'approval_result.html'
        },
        push: {
          title: '审批结果通知',
          content: '您的财务申请{decision}',
          data: { type: 'approval_result' }
        }
      },

      // 审批转交通知
      approval_forward: {
        sms: {
          templateCode: 'SMS_APPROVAL_FORWARD',
          content: '【智慧乡村】财务申请{transactionNumber}已转至{nextStage}，请及时处理。'
        },
        email: {
          subject: '审批转交通知 - {transactionNumber}',
          template: 'approval_forward.html'
        },
        push: {
          title: '审批转交通知',
          content: '有财务申请需要您审批',
          data: { type: 'approval_forward' }
        }
      },

      // 逾期提醒通知
      approval_overdue: {
        sms: {
          templateCode: 'SMS_APPROVAL_OVERDUE',
          content: '【智慧乡村】您有{overdueCount}个审批任务已逾期，请尽快处理。'
        },
        email: {
          subject: '审批逾期提醒',
          template: 'approval_overdue.html'
        },
        push: {
          title: '审批逾期提醒',
          content: '您有审批任务已逾期',
          data: { type: 'approval_overdue' }
        }
      }
    };

    // 通知优先级配置
    this.priorityConfig = {
      high: {
        channels: ['sms', 'email', 'push', 'websocket'],
        delay: 0,
        retry: 3
      },
      medium: {
        channels: ['email', 'push', 'websocket'],
        delay: 0,
        retry: 2
      },
      low: {
        channels: ['push', 'websocket'],
        delay: 300, // 5分钟延迟
        retry: 1
      }
    };

    // 批量发送队列
    this.batchQueue = [];
    this.batchSize = 100;
    this.batchTimeout = 5000; // 5秒
    this.initBatchProcessor();
  }

  /**
   * 发送审批通知
   * @param {string|Array} recipients - 接收者ID或接收者数组
   * @param {Object} notificationData - 通知数据
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 发送结果
   */
  async sendNotification(recipients, notificationData, options = {}) {
    try {
      // 规范化接收者
      const recipientList = Array.isArray(recipients) ? recipients : [recipients];

      // 获取通知模板
      const template = this.getTemplate(notificationData.type);

      // 确定通知优先级
      const priority = this.determinePriority(notificationData, options);

      // 获取通知渠道
      const channels = this.priorityConfig[priority].channels;

      // 处理每个接收者
      const results = [];
      for (const recipientId of recipientList) {
        const recipient = await this.getRecipientInfo(recipientId);
        if (!recipient) {
          results.push({
            recipientId,
            success: false,
            error: 'RECIPIENT_NOT_FOUND'
          });
          continue;
        }

        // 检查通知偏好设置
        const preferredChannels = await this.getNotificationPreferences(recipientId);
        const activeChannels = this.intersectChannels(channels, preferredChannels);

        // 为每个渠道准备通知内容
        const notificationContent = this.prepareNotificationContent(
          template,
          notificationData,
          recipient
        );

        // 并行发送到各个渠道
        const channelResults = await Promise.allSettled(
          activeChannels.map(channel =>
            this.sendToChannel(channel, recipient, notificationContent, notificationData)
          )
        );

        // 记录发送结果
        const result = await this.recordNotification({
          recipientId,
          recipient,
          notificationData,
          channels: activeChannels,
          results: channelResults,
          priority
        });

        results.push(result);
      }

      // 发送WebSocket实时通知
      await this.sendWebSocketNotification(recipientList, notificationData);

      logger.info(`审批通知发送完成: ${notificationData.type}, 接收者: ${recipientList.length}`);

      return {
        success: true,
        totalCount: recipientList.length,
        successCount: results.filter(r => r.success).length,
        results
      };

    } catch (error) {
      logger.error('发送审批通知失败:', error);
      throw error;
    }
  }

  /**
   * 发送到特定渠道
   * @param {string} channel - 渠道名称
   * @param {Object} recipient - 接收者信息
   * @param {Object} content - 通知内容
   * @param {Object} notificationData - 通知数据
   * @returns {Promise<Object>} 发送结果
   */
  async sendToChannel(channel, recipient, content, notificationData) {
    try {
      switch (channel) {
      case 'sms':
        return await this.sendSMS(recipient, content);
      case 'email':
        return await this.sendEmail(recipient, content);
      case 'push':
        return await this.sendPushNotification(recipient, content, notificationData);
      case 'websocket':
        return await this.sendWebSocketSingle(recipient, content);
      default:
        throw new Error(`不支持的通知渠道: ${channel}`);
      }
    } catch (error) {
      logger.error(`发送${channel}通知失败:`, error);
      return {
        channel,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 发送短信通知
   * @param {Object} recipient - 接收者信息
   * @param {Object} content - 通知内容
   * @returns {Promise<Object>} 发送结果
   */
  async sendSMS(recipient, content) {
    try {
      const phoneNumber = recipient.phone || recipient.profile?.phone;
      if (!phoneNumber) {
        throw new Error('接收者没有手机号码');
      }

      const result = await cloudCommunicationService.sendSMSByAliyun(
        phoneNumber,
        content.sms.templateCode,
        content.sms.templateParam
      );

      return {
        channel: 'sms',
        success: true,
        result
      };
    } catch (error) {
      return {
        channel: 'sms',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 发送邮件通知
   * @param {Object} recipient - 接收者信息
   * @param {Object} content - 通知内容
   * @returns {Promise<Object>} 发送结果
   */
  async sendEmail(recipient, content) {
    try {
      const emailAddress = recipient.email || recipient.profile?.email;
      if (!emailAddress) {
        throw new Error('接收者没有邮箱地址');
      }

      const result = await cloudCommunicationService.sendEmail({
        to: emailAddress,
        subject: content.email.subject,
        html: content.email.html,
        text: content.email.text
      });

      return {
        channel: 'email',
        success: true,
        result
      };
    } catch (error) {
      return {
        channel: 'email',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 发送推送通知
   * @param {Object} recipient - 接收者信息
   * @param {Object} content - 通知内容
   * @param {Object} notificationData - 通知数据
   * @returns {Promise<Object>} 发送结果
   */
  async sendPushNotification(recipient, content, notificationData) {
    try {
      // 获取用户的设备token
      const deviceTokens = await this.getUserDeviceTokens(recipient._id);
      if (deviceTokens.length === 0) {
        throw new Error('用户没有注册的设备');
      }

      const pushPayload = {
        title: content.push.title,
        content: content.push.content,
        data: {
          ...content.push.data,
          ...notificationData.data,
          userId: recipient._id
        },
        sound: 'default',
        badge: 1
      };

      const result = await cloudCommunicationService.sendPushNotification(
        deviceTokens,
        pushPayload
      );

      return {
        channel: 'push',
        success: true,
        result
      };
    } catch (error) {
      return {
        channel: 'push',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 发送WebSocket实时通知
   * @param {Array} recipientIds - 接收者ID列表
   * @param {Object} notificationData - 通知数据
   * @returns {Promise<void>}
   */
  async sendWebSocketNotification(recipientIds, notificationData) {
    try {
      const webSocketService = require('./webSocketService');

      // 向每个用户发送通知
      recipientIds.forEach(recipientId => {
        webSocketService.broadcastToUser(recipientId, {
          type: 'approval_notification',
          data: notificationData
        }, this.determinePriority(notificationData));
      });

      // 向管理员发送通知（用于监控）
      webSocketService.broadcastToRole('admin', {
        type: 'admin_approval_notification',
        data: {
          ...notificationData,
          recipients: recipientIds
        }
      }, 'medium');

    } catch (error) {
      logger.error('发送WebSocket通知失败:', error);
    }
  }

  /**
   * 发送单个WebSocket通知
   * @param {Object} recipient - 接收者信息
   * @param {Object} content - 通知内容
   * @returns {Promise<Object>} 发送结果
   */
  async sendWebSocketSingle(recipient, content) {
    try {
      const io = require('../app').getIO();
      if (!io) {
        return {
          channel: 'websocket',
          success: false,
          error: 'WebSocket服务未启动'
        };
      }

      const wsPayload = {
        type: 'approval_notification',
        content: content.websocket,
        timestamp: new Date(),
        id: this.generateNotificationId()
      };

      io.to(`user_${recipient._id}`).emit('notification', wsPayload);

      return {
        channel: 'websocket',
        success: true
      };
    } catch (error) {
      return {
        channel: 'websocket',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取通知模板
   * @param {string} type - 通知类型
   * @returns {Object} 模板配置
   */
  getTemplate(type) {
    const template = this.templates[type];
    if (!template) {
      throw new Error(`不支持的通知类型: ${type}`);
    }
    return template;
  }

  /**
   * 确定通知优先级
   * @param {Object} notificationData - 通知数据
   * @param {Object} options - 选项
   * @returns {string} 优先级
   */
  determinePriority(notificationData, options) {
    // 如果明确指定了优先级
    if (options.priority) {
      return options.priority;
    }

    // 根据通知类型和数据确定优先级
    switch (notificationData.type) {
    case 'approval_request':
      // 根据金额确定优先级
      const amount = parseFloat(notificationData.data?.amount || 0);
      if (amount > 100000) return 'high';
      if (amount > 50000) return 'medium';
      return 'low';

    case 'approval_overdue':
      return 'high';

    case 'approval_result':
    case 'approval_forward':
      return 'medium';

    default:
      return 'medium';
    }
  }

  /**
   * 准备通知内容
   * @param {Object} template - 模板配置
   * @param {Object} notificationData - 通知数据
   * @param {Object} recipient - 接收者信息
   * @returns {Object} 准备好的内容
   */
  prepareNotificationContent(template, notificationData, recipient) {
    const data = {
      ...notificationData.data,
      recipientName: recipient.profile?.displayName || recipient.userName,
      currentTime: new Date().toLocaleString()
    };

    const content = {};

    // 准备短信内容
    if (template.sms) {
      content.sms = {
        templateCode: template.sms.templateCode,
        templateParam: data,
        content: this.replaceTemplateVariables(template.sms.content, data)
      };
    }

    // 准备邮件内容
    if (template.email) {
      content.email = {
        subject: this.replaceTemplateVariables(template.email.subject, data),
        html: this.generateEmailHTML(template.email.template, data),
        text: this.generateEmailText(template.email.template, data)
      };
    }

    // 准备推送内容
    if (template.push) {
      content.push = {
        title: this.replaceTemplateVariables(template.push.title, data),
        content: this.replaceTemplateVariables(template.push.content, data),
        data: template.push.data
      };
    }

    // 准备WebSocket内容
    content.websocket = {
      type: notificationData.type,
      title: content.push?.title || '通知',
      content: content.push?.content || '您有新消息',
      data: notificationData.data
    };

    return content;
  }

  /**
   * 替换模板变量
   * @param {string} template - 模板字符串
   * @param {Object} data - 数据对象
   * @returns {string} 替换后的字符串
   */
  replaceTemplateVariables(template, data) {
    let result = template;
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, data[key]);
    });
    return result;
  }

  /**
   * 生成邮件HTML内容
   * @param {string} templateName - 模板名称
   * @param {Object} data - 数据对象
   * @returns {string} HTML内容
   */
  generateEmailHTML(templateName, data) {
    // 这里应该从文件系统或数据库加载邮件模板
    // 简化实现，返回基本HTML
    return `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>审批通知</title>
          <style>
            body { font-family: Arial, sans-serif; }
            .header { background: #f5f5f5; padding: 20px; }
            .content { padding: 20px; }
            .footer { background: #f5f5f5; padding: 10px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>智慧乡村财务审批通知</h2>
          </div>
          <div class="content">
            <p>亲爱的${data.recipientName}：</p>
            <p>您有新的财务审批任务需要处理。</p>
            <ul>
              <li>交易编号：${data.transactionNumber}</li>
              <li>交易金额：${data.amount}</li>
              <li>提交时间：${data.currentTime}</li>
            </ul>
            <p>请及时登录系统进行处理。</p>
          </div>
          <div class="footer">
            <p>智慧乡村综合服务平台</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * 生成邮件文本内容
   * @param {string} templateName - 模板名称
   * @param {Object} data - 数据对象
   * @returns {string} 文本内容
   */
  generateEmailText(templateName, data) {
    return `
      智慧乡村财务审批通知

      亲爱的${data.recipientName}：

      您有新的财务审批任务需要处理。

      交易编号：${data.transactionNumber}
      交易金额：${data.amount}
      提交时间：${data.currentTime}

      请及时登录系统进行处理。

      智慧乡村综合服务平台
    `;
  }

  /**
   * 获取接收者信息
   * @param {string} recipientId - 接收者ID
   * @returns {Promise<Object>} 接收者信息
   */
  async getRecipientInfo(recipientId) {
    try {
      const User = require('../models/User');
      return await User.findById(recipientId).select('profile displayName email phone');
    } catch (error) {
      logger.error('获取接收者信息失败:', error);
      return null;
    }
  }

  /**
   * 获取用户通知偏好设置
   * @param {string} userId - 用户ID
   * @returns {Promise<Array>} 偏好的通知渠道
   */
  async getNotificationPreferences(userId) {
    try {
      // 这里应该从用户设置中获取通知偏好
      // 简化实现，返回默认偏好
      return ['email', 'push', 'websocket'];
    } catch (error) {
      logger.error('获取通知偏好失败:', error);
      return ['email']; // 默认至少邮件通知
    }
  }

  /**
   * 获取渠道交集
   * @param {Array} channels - 系统渠道
   * @param {Array} preferredChannels - 用户偏好渠道
   * @returns {Array} 交集渠道
   */
  intersectChannels(channels, preferredChannels) {
    return channels.filter(channel => preferredChannels.includes(channel));
  }

  /**
   * 获取用户设备token
   * @param {string} userId - 用户ID
   * @returns {Promise<Array>} 设备token列表
   */
  async getUserDeviceTokens(userId) {
    try {
      // 这里应该从设备注册表中获取token
      // 简化实现，返回空数组
      return [];
    } catch (error) {
      logger.error('获取设备token失败:', error);
      return [];
    }
  }

  /**
   * 记录通知
   * @param {Object} notificationData - 通知数据
   * @returns {Promise<Object>} 记录结果
   */
  async recordNotification(notificationData) {
    try {
      const notification = new NotificationModel({
        recipientId: notificationData.recipientId,
        type: notificationData.notificationData.type,
        title: notificationData.content.push?.title || '通知',
        content: notificationData.content.push?.content || '',
        data: notificationData.notificationData,
        channels: notificationData.channels,
        priority: notificationData.priority,
        status: 'sent'
      });

      await notification.save();

      return {
        recipientId: notificationData.recipientId,
        success: true,
        notificationId: notification._id,
        channels: notificationData.channels
      };
    } catch (error) {
      logger.error('记录通知失败:', error);
      return {
        recipientId: notificationData.recipientId,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 生成通知ID
   * @returns {string} 通知ID
   */
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 初始化批量处理器
   */
  initBatchProcessor() {
    setInterval(() => {
      if (this.batchQueue.length > 0) {
        this.processBatch();
      }
    }, this.batchTimeout);
  }

  /**
   * 处理批量通知
   */
  async processBatch() {
    if (this.isProcessingQueue) return;

    this.isProcessingQueue = true;
    const batch = this.batchQueue.splice(0, this.batchSize);

    try {
      // 按通知类型分组
      const grouped = batch.reduce((acc, item) => {
        if (!acc[item.notificationData.type]) {
          acc[item.notificationData.type] = [];
        }
        acc[item.notificationData.type].push(item);
        return acc;
      }, {});

      // 并行处理各类型
      await Promise.all(
        Object.keys(grouped).map(type =>
          this.processBatchGroup(type, grouped[type])
        )
      );

    } catch (error) {
      logger.error('批量处理通知失败:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * 处理批量组
   * @param {string} type - 通知类型
   * @param {Array} items - 通知项目列表
   */
  async processBatchGroup(type, items) {
    // 合并接收者
    const recipientMap = new Map();
    items.forEach(item => {
      const key = item.recipientId.toString();
      if (!recipientMap.has(key)) {
        recipientMap.set(key, {
          recipientId: item.recipientId,
          notificationData: item.notificationData,
          options: item.options
        });
      }
    });

    // 批量发送
    for (const [, item] of recipientMap) {
      try {
        await this.sendNotification(item.recipientId, item.notificationData, item.options);
      } catch (error) {
        logger.error('批量发送通知失败:', error);
      }
    }
  }

  /**
   * 发送逾期提醒
   * @param {string} userId - 用户ID
   * @param {Array} overdueTasks - 逾期任务列表
   * @returns {Promise<void>}
   */
  async sendOverdueReminder(userId, overdueTasks) {
    await this.sendNotification(userId, {
      type: 'approval_overdue',
      data: {
        overdueCount: overdueTasks.length,
        tasks: overdueTasks.map(task => ({
          transactionNumber: task.transactionNumber,
          amount: task.amount,
          overdueDays: task.overdueDays
        }))
      }
    }, { priority: 'high' });
  }
}

module.exports = ApprovalNotificationService;