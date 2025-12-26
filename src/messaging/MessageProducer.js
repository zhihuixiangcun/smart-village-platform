/**
 * 消息生产者
 * 负责发送各类业务消息到消息队列
 */

const MessageQueueManager = require('./MessageQueueManager');
const Logger = require('../utils/logger');

class MessageProducer {
  constructor(queueManager) {
    this.queueManager = queueManager || new MessageQueueManager();
    this.exchanges = {
      village_events: 'smart.village.events',
      notifications: 'smart.village.notifications',
      tasks: 'smart.village.tasks',
      analytics: 'smart.village.analytics',
      audit: 'smart.village.audit'
    };
  }

  /**
   * 初始化交换机
   */
  async initialize() {
    try {
      Logger.info('正在初始化消息生产者...');

      // 创建事件交换机
      await this.queueManager.createExchange(this.exchanges.village_events, 'topic', {
        durable: true,
        autoDelete: false
      });

      // 创建通知交换机
      await this.queueManager.createExchange(this.exchanges.notifications, 'fanout', {
        durable: true,
        autoDelete: false
      });

      // 创建任务交换机
      await this.queueManager.createExchange(this.exchanges.tasks, 'direct', {
        durable: true,
        autoDelete: false
      });

      // 创建分析交换机
      await this.queueManager.createExchange(this.exchanges.analytics, 'topic', {
        durable: true,
        autoDelete: false
      });

      // 创建审计交换机
      await this.queueManager.createExchange(this.exchanges.audit, 'direct', {
        durable: true,
        autoDelete: false
      });

      Logger.info('消息生产者初始化完成');
      return true;
    } catch (error) {
      Logger.error('消息生产者初始化失败:', error);
      throw error;
    }
  }

  /**
   * 发送村庄事件
   */
  async sendVillageEvent(eventType, eventData, options = {}) {
    try {
      const message = {
        eventType,
        timestamp: new Date().toISOString(),
        data: eventData,
        source: process.env.SERVICE_NAME || 'unknown-service',
        messageId: this.queueManager.generateMessageId(),
        version: '1.0'
      };

      const routingKey = `village.${eventType}`;

      await this.queueManager.publish(
        this.exchanges.village_events,
        routingKey,
        message,
        {
          persistent: true,
          messageId: message.messageId,
          headers: {
            event_type: eventType,
            source_service: process.env.SERVICE_NAME,
            message_version: '1.0'
          }
        }
      );

      Logger.info('村庄事件消息发送成功', {
        eventType,
        messageId: message.messageId,
        routingKey
      });

      return message.messageId;
    } catch (error) {
      Logger.error('发送村庄事件失败:', error);
      throw error;
    }
  }

  /**
   * 发送通知消息
   */
  async sendNotification(notificationType, notificationData, options = {}) {
    try {
      const message = {
        type: notificationType,
        timestamp: new Date().toISOString(),
        data: notificationData,
        source: process.env.SERVICE_NAME || 'unknown-service',
        priority: options.priority || 'normal',
        messageId: this.queueManager.generateMessageId(),
        version: '1.0'
      };

      // 根据优先级设置不同的路由键
      let routingKey = 'notification.all';
      if (notificationData.targetUsers) {
        routingKey = `notification.users.${notificationData.targetUsers.length}`;
      } else if (notificationData.targetRoles) {
        routingKey = `notification.roles.${notificationData.targetRoles.join(',')}`;
      } else if (notificationData.villageId) {
        routingKey = `notification.village.${notificationData.villageId}`;
      }

      await this.queueManager.publish(
        this.exchanges.notifications,
        routingKey,
        message,
        {
          persistent: notificationType !== 'urgent',
          messageId: message.messageId,
          headers: {
            notification_type: notificationType,
            priority: message.priority,
            source_service: process.env.SERVICE_NAME,
            target_users: notificationData.targetUsers?.length || 0,
            target_village: notificationData.villageId
          }
        }
      );

      Logger.info('通知消息发送成功', {
        notificationType,
        priority: message.priority,
        messageId: message.messageId,
        routingKey
      });

      return message.messageId;
    } catch (error) {
      Logger.error('发送通知消息失败:', error);
      throw error;
    }
  }

  /**
   * 发送异步任务
   */
  async sendTask(taskType, taskData, options = {}) {
    try {
      const message = {
        taskType,
        timestamp: new Date().toISOString(),
        data: taskData,
        source: process.env.SERVICE_NAME || 'unknown-service',
        priority: options.priority || 'normal',
        messageId: this.queueManager.generateMessageId(),
        version: '1.0',
        retryCount: 0,
        maxRetries: options.maxRetries || 3
      };

      const routingKey = taskType;

      await this.queueManager.publish(
        this.exchanges.tasks,
        routingKey,
        message,
        {
          persistent: true,
          messageId: message.messageId,
          headers: {
            task_type: taskType,
            priority: message.priority,
            source_service: process.env.SERVICE_NAME,
            max_retries: message.maxRetries,
            delay_until: options.delayUntil
          }
        }
      );

      Logger.info('任务消息发送成功', {
        taskType,
        priority: message.priority,
        messageId: message.messageId,
        routingKey
      });

      return message.messageId;
    } catch (error) {
      Logger.error('发送任务消息失败:', error);
      throw error;
    }
  }

  /**
   * 发送分析数据
   */
  async sendAnalyticsEvent(analyticsType, analyticsData, options = {}) {
    try {
      const message = {
        type: analyticsType,
        timestamp: new Date().toISOString(),
        data: analyticsData,
        source: process.env.SERVICE_NAME || 'unknown-service',
        sessionId: options.sessionId || null,
        userId: options.userId || null,
        villageId: options.villageId || null,
        messageId: this.queueManager.generateMessageId(),
        version: '1.0'
      };

      const routingKey = `analytics.${analyticsType}`;

      await this.queueManager.publish(
        this.exchanges.analytics,
        routingKey,
        message,
        {
          persistent: true,
          messageId: message.messageId,
          headers: {
            analytics_type: analyticsType,
            source_service: process.env.SERVICE_NAME,
            session_id: options.sessionId,
            user_id: options.userId,
            village_id: options.villageId
          }
        }
      );

      Logger.debug('分析事件消息发送成功', {
        analyticsType,
        messageId: message.messageId,
        routingKey
      });

      return message.messageId;
    } catch (error) {
      Logger.error('发送分析事件失败:', error);
      throw error;
    }
  }

  /**
   * 发送审计日志
   */
  async sendAuditLog(action, entity, entityData, options = {}) {
    try {
      const message = {
        action,
        entity,
        timestamp: new Date().toISOString(),
        data: entityData,
        source: process.env.SERVICE_NAME || 'unknown-service',
        userId: options.userId || null,
        villageId: options.villageId || null,
        ip: options.ip || null,
        userAgent: options.userAgent || null,
        messageId: this.queueManager.generateMessageId(),
        version: '1.0'
      };

      const routingKey = 'audit.log';

      await this.queueManager.publish(
        this.exchanges.audit,
        routingKey,
        message,
        {
          persistent: true,
          messageId: message.messageId,
          headers: {
            audit_action: action,
            audit_entity: entity,
            source_service: process.env.SERVICE_NAME,
            user_id: options.userId,
            village_id: options.villageId,
            ip_address: options.ip
          }
        }
      );

      Logger.debug('审计日志消息发送成功', {
        action,
        entity,
        messageId: message.messageId
      });

      return message.messageId;
    } catch (error) {
      Logger.error('发送审计日志失败:', error);
      throw error;
    }
  }

  /**
   * 发送批量消息
   */
  async sendBatchMessages(messages, options = {}) {
    try {
      const results = [];
      const batchSize = options.batchSize || 100;
      const delay = options.delay || 100;

      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);

        for (const msg of batch) {
          try {
            const messageId = await this.sendMessage(msg.type, msg.data, msg.options);
            results.push({ success: true, messageId, index: i + batch.indexOf(msg) });
          } catch (error) {
            results.push({
              success: false,
              error: error.message,
              index: i + batch.indexOf(msg)
            });
          }
        }

        // 批次间延迟
        if (i + batchSize < messages.length && delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      Logger.info('批量消息发送完成', {
        total: messages.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });

      return results;
    } catch (error) {
      Logger.error('发送批量消息失败:', error);
      throw error;
    }
  }

  /**
   * 统一发送消息接口
   */
  async sendMessage(type, data, options = {}) {
    try {
      switch (type) {
        case 'village_event':
          return await this.sendVillageEvent(data.eventType, data.eventData, options);

        case 'notification':
          return await this.sendNotification(data.notificationType, data.notificationData, options);

        case 'task':
          return await this.sendTask(data.taskType, data.taskData, options);

        case 'analytics':
          return await this.sendAnalyticsEvent(data.analyticsType, data.analyticsData, options);

        case 'audit':
          return await this.sendAuditLog(data.action, data.entity, data.entityData, options);

        default:
          throw new Error(`未知的消息类型: ${type}`);
      }
    } catch (error) {
      Logger.error(`发送消息失败 (${type}):`, error);
      throw error;
    }
  }

  /**
   * 发送延迟消息
   */
  async sendDelayedMessage(type, data, delayMs, options = {}) {
    try {
      const delayUntil = new Date(Date.now() + delayMs);
      options.delayUntil = delayUntil.toISOString();

      return await this.sendMessage(type, data, options);
    } catch (error) {
      Logger.error('发送延迟消息失败:', error);
      throw error;
    }
  }

  /**
   * 发送高优先级消息
   */
  async sendHighPriorityMessage(type, data, options = {}) {
    try {
      options.priority = 'high';
      return await this.sendMessage(type, data, options);
    } catch (error) {
      Logger.error('发送高优先级消息失败:', error);
      throw error;
    }
  }

  /**
   * 发送紧急消息
   */
  async sendUrgentMessage(type, data, options = {}) {
    try {
      options.priority = 'urgent';
      return await this.sendMessage(type, data, options);
    } catch (error) {
      Logger.error('发送紧急消息失败:', error);
      throw error;
    }
  }

  /**
   * 获取消息统计
   */
  getStatistics() {
    return {
      exchanges: Object.keys(this.exchanges).length,
      connectionStatus: this.queueManager.getConnectionStatus(),
      uptime: process.uptime()
    };
  }
}

module.exports = MessageProducer;