/**
 * 消息队列服务
 * 统一的消息队列管理接口
 */

const MessageQueueManager = require('./MessageQueueManager');
const MessageProducer = require('./MessageProducer');
const MessageConsumer = require('./MessageConsumer');
const VillageEventHandler = require('./handlers/VillageEventHandler');
const TaskHandler = require('./handlers/TaskHandler');
const Logger = require('../utils/logger');

class MessagingService {
  constructor() {
    this.queueManager = null;
    this.producer = null;
    this.consumer = null;
    this.villageEventHandler = null;
    this.taskHandler = null;
    this.isInitialized = false;
    this.config = {
      url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
      enableReconnect: true,
      maxRetries: 3,
      timeout: 30000
    };
  }

  /**
   * 初始化消息队列服务
   */
  async initialize() {
    try {
      Logger.info('正在初始化消息队列服务...');

      // 创建队列管理器
      this.queueManager = new MessageQueueManager();
      this.queueManager.config = { ...this.config };
      await this.queueManager.connect();

      // 创建消息生产者
      this.producer = new MessageProducer(this.queueManager);
      await this.producer.initialize();

      // 创建消息消费者
      this.consumer = new MessageConsumer(this.queueManager);
      await this.consumer.initialize();

      // 创建事件处理器
      this.villageEventHandler = new VillageEventHandler();
      this.taskHandler = new TaskHandler();

      // 注册消息处理器
      this.registerHandlers();

      // 启动消费
      await this.consumer.startConsuming();

      this.isInitialized = true;

      Logger.info('消息队列服务初始化完成');
      return true;
    } catch (error) {
      Logger.error('消息队列服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 注册消息处理器
   */
  registerHandlers() {
    // 注册村庄事件处理器
    this.consumer.registerHandler('village_events', async (messageData) => {
      return await this.villageEventHandler.handle(messageData);
    }, {
      maxConcurrency: 5,
      retryAttempts: 3,
      timeout: 30000
    });

    // 注册通知处理器
    this.consumer.registerHandler('notifications', async (messageData) => {
      return await this.handleNotification(messageData);
    }, {
      maxConcurrency: 10,
      retryAttempts: 2,
      timeout: 15000
    });

    // 注册任务处理器
    this.consumer.registerHandler('tasks', async (messageData) => {
      return await this.taskHandler.handle(messageData);
    }, {
      maxConcurrency: 3,
      retryAttempts: 5,
      timeout: 60000
    });

    // 注册分析事件处理器
    this.consumer.registerHandler('analytics', async (messageData) => {
      return await this.handleAnalyticsEvent(messageData);
    }, {
      maxConcurrency: 10,
      retryAttempts: 1,
      timeout: 10000
    });

    // 注册审计日志处理器
    this.consumer.registerHandler('audit', async (messageData) => {
      return await this.handleAuditLog(messageData);
    }, {
      maxConcurrency: 20,
      retryAttempts: 1,
      timeout: 5000
    });

    Logger.info('消息处理器注册完成');
  }

  /**
   * 发送村庄事件
   */
  async sendVillageEvent(eventType, eventData, options = {}) {
    if (!this.isInitialized) {
      throw new Error('消息队列服务未初始化');
    }

    return await this.producer.sendVillageEvent(eventType, eventData, options);
  }

  /**
   * 发送通知
   */
  async sendNotification(notificationType, notificationData, options = {}) {
    if (!this.isInitialized) {
      throw new Error('消息队列服务未初始化');
    }

    return await this.producer.sendNotification(notificationType, notificationData, options);
  }

  /**
   * 发送异步任务
   */
  async sendTask(taskType, taskData, options = {}) {
    if (!this.isInitialized) {
      throw new Error('消息队列服务未初始化');
    }

    return await this.producer.sendTask(taskType, taskData, options);
  }

  /**
   * 发送分析事件
   */
  async sendAnalyticsEvent(analyticsType, analyticsData, options = {}) {
    if (!this.isInitialized) {
      throw new Error('消息队列服务未初始化');
    }

    return await this.producer.sendAnalyticsEvent(analyticsType, analyticsData, options);
  }

  /**
   * 发送审计日志
   */
  async sendAuditLog(action, entity, entityData, options = {}) {
    if (!this.isInitialized) {
      throw new Error('消息队列服务未初始化');
    }

    return await this.producer.sendAuditLog(action, entity, entityData, options);
  }

  /**
   * 批量发送消息
   */
  async sendBatchMessages(messages, options = {}) {
    if (!this.isInitialized) {
      throw new Error('消息队列服务未初始化');
    }

    return await this.producer.sendBatchMessages(messages, options);
  }

  /**
   * 发送延迟消息
   */
  async sendDelayedMessage(type, data, delayMs, options = {}) {
    if (!this.isInitialized) {
      throw new Error('消息队列服务未初始化');
    }

    return await this.producer.sendDelayedMessage(type, data, delayMs, options);
  }

  /**
   * 发送高优先级消息
   */
  async sendHighPriorityMessage(type, data, options = {}) {
    if (!this.isInitialized) {
      throw new Error('消息队列服务未初始化');
    }

    return await this.producer.sendHighPriorityMessage(type, data, options);
  }

  /**
   * 发送紧急消息
   */
  async sendUrgentMessage(type, data, options = {}) {
    if (!this.isInitialized) {
      throw new Error('消息队列服务未初始化');
    }

    return await this.producer.sendUrgentMessage(type, data, options);
  }

  /**
   * 处理通知消息
   */
  async handleNotification(messageData) {
    const { content } = messageData;
    const { type, data, priority } = content;

    Logger.debug('处理通知消息', {
      type,
      priority,
      messageId: messageData.properties.messageId
    });

    // 这里可以调用外部通知服务
    // 例如：邮件服务、短信服务、推送服务等

    return {
      handled: true,
      action: 'notification_processed',
      type,
      messageId: messageData.properties.messageId,
      processedAt: new Date().toISOString()
    };
  }

  /**
   * 处理分析事件
   */
  async handleAnalyticsEvent(messageData) {
    const { content } = messageData;
    const { type, data, sessionId, userId } = content;

    Logger.debug('处理分析事件', {
      type,
      sessionId,
      userId,
      messageId: messageData.properties.messageId
    });

    // 这里可以调用分析服务记录事件
    // 例如：用户行为分析、系统性能分析等

    return {
      handled: true,
      action: 'analytics_event_processed',
      type,
      messageId: messageData.properties.messageId,
      processedAt: new Date().toISOString()
    };
  }

  /**
   * 处理审计日志
   */
  async handleAuditLog(messageData) {
    const { content } = messageData;
    const { action, entity, userId, timestamp } = content;

    Logger.debug('处理审计日志', {
      action,
      entity,
      userId,
      messageId: messageData.properties.messageId
    });

    // 这里可以调用审计服务记录日志
    // 例如：数据库操作日志、敏感操作记录等

    return {
      handled: true,
      action: 'audit_log_processed',
      auditId: messageData.properties.messageId,
      processedAt: new Date().toISOString()
    };
  }

  /**
   * 获取队列状态
   */
  async getQueueStatus() {
    if (!this.isInitialized) {
      return { status: 'not_initialized' };
    }

    try {
      const queueInfo = await this.consumer.getQueueInfo();
      const connectionStatus = this.queueManager.getConnectionStatus();
      const producerStats = this.producer.getStatistics();
      const consumerStats = this.consumer.getConsumerStats();

      return {
        status: 'running',
        connection: connectionStatus,
        producer: producerStats,
        consumer: consumerStats,
        queues: queueInfo
      };
    } catch (error) {
      Logger.error('获取队列状态失败:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * 获取性能指标
   */
  async getMetrics() {
    if (!this.isInitialized) {
      return null;
    }

    const queueStatus = await this.getQueueStatus();

    return {
      timestamp: new Date().toISOString(),
      connection: {
        connected: queueStatus.connection.connected,
        channels: queueStatus.connection.channels,
        uptime: process.uptime()
      },
      queues: Object.keys(queueStatus.queues).map(queueName => ({
        name: queueName,
        messageCount: queueStatus.queues[queueName].messageCount,
        consumerCount: queueStatus.queues[queueName].consumerCount
      })),
      consumer: {
        isRunning: queueStatus.consumer.isRunning,
        activeHandlers: queueStatus.consumer.registeredHandlers,
        activeConsumers: queueStatus.consumer.activeConsumers
      }
    };
  }

  /**
   * 清空指定队列
   */
  async purgeQueue(queueName) {
    if (!this.isInitialized) {
      throw new Error('消息队列服务未初始化');
    }

    return await this.consumer.purgeQueue(queueName);
  }

  /**
   * 停止消息队列服务
   */
  async shutdown() {
    try {
      Logger.info('正在关闭消息队列服务...');

      if (this.consumer) {
        await this.consumer.stopConsuming();
      }

      if (this.queueManager) {
        await this.queueManager.close();
      }

      this.isInitialized = false;

      Logger.info('消息队列服务已关闭');
      return true;
    } catch (error) {
      Logger.error('关闭消息队列服务失败:', error);
      throw error;
    }
  }

  /**
   * 重启消息队列服务
   */
  async restart() {
    try {
      Logger.info('正在重启消息队列服务...');

      await this.shutdown();
      await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒
      await this.initialize();

      Logger.info('消息队列服务重启完成');
      return true;
    } catch (error) {
      Logger.error('重启消息队列服务失败:', error);
      throw error;
    }
  }

  /**
   * 设置服务依赖
   */
  setServiceDependencies(services) {
    if (this.villageEventHandler) {
      this.villageEventHandler.initialize(services);
    }

    if (this.taskHandler) {
      this.taskHandler.initialize(services);
    }

    Logger.info('消息队列服务依赖设置完成');
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      if (!this.isInitialized) {
        return {
          status: 'unhealthy',
          message: '服务未初始化'
        };
      }

      const queueStatus = await this.getQueueStatus();

      if (queueStatus.status === 'running' && queueStatus.connection.connected) {
        return {
          status: 'healthy',
          message: '消息队列服务运行正常',
          details: {
            connected: queueStatus.connection.connected,
            activeConsumers: queueStatus.consumer.activeConsumers,
            totalQueues: Object.keys(queueStatus.queues).length
          }
        };
      } else {
        return {
          status: 'degraded',
          message: '消息队列服务部分功能异常',
          details: queueStatus
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message
      };
    }
  }
}

module.exports = MessagingService;