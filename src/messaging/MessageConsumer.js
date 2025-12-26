/**
 * 消息消费者
 * 负责消费各类业务消息并处理
 */

const MessageQueueManager = require('./MessageQueueManager');
const Logger = require('../utils/logger');

class MessageConsumer {
  constructor(queueManager) {
    this.queueManager = queueManager || new MessageQueueManager();
    this.handlers = new Map();
    this.consumers = new Map();
    this.queues = {
      village_events: 'smart.village.events.queue',
      notifications: 'smart.village.notifications.queue',
      tasks: 'smart.village.tasks.queue',
      analytics: 'smart.village.analytics.queue',
      audit: 'smart.village.audit.queue'
    };
    this.isRunning = false;
  }

  /**
   * 初始化消费者
   */
  async initialize() {
    try {
      Logger.info('正在初始化消息消费者...');

      // 创建队列
      await this.queueManager.createQueue(this.queues.village_events, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'smart.village.dlx',
          'x-dead-letter-routing-key': 'village_events.dlq',
          'x-message-ttl': 86400000 // 24小时
        }
      });

      await this.queueManager.createQueue(this.queues.notifications, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'smart.village.dlx',
          'x-dead-letter-routing-key': 'notifications.dlq',
          'x-message-ttl': 86400000 // 24小时
        }
      });

      await this.queueManager.createQueue(this.queues.tasks, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'smart.village.dlx',
          'x-dead-letter-routing-key': 'tasks.dlq',
          'x-message-ttl': 259200000 // 3天
        }
      });

      await this.queueManager.createQueue(this.queues.analytics, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'smart.village.dlx',
          'x-dead-letter-routing-key': 'analytics.dlq',
          'x-message-ttl': 604800000 // 7天
        }
      });

      await this.queueManager.createQueue(this.queues.audit, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'smart.village.dlx',
          'x-dead-letter-routing-key': 'audit.dlq',
          'x-message-ttl': 2592000000 // 30天
        }
      });

      // 创建死信队列和交换机
      await this.createDeadLetterInfrastructure();

      Logger.info('消息消费者初始化完成');
      return true;
    } catch (error) {
      Logger.error('消息消费者初始化失败:', error);
      throw error;
    }
  }

  /**
   * 创建死信队列基础设施
   */
  async createDeadLetterInfrastructure() {
    try {
      // 创建死信交换机
      await this.queueManager.createExchange('smart.village.dlx', 'direct', {
        durable: true
      });

      // 创建死信队列
      const dlqQueues = [
        'village_events.dlq',
        'notifications.dlq',
        'tasks.dlq',
        'analytics.dlq',
        'audit.dlq'
      ];

      for (const dlqQueue of dlqQueues) {
        await this.queueManager.createQueue(dlqQueue, {
          durable: true,
          arguments: {
            'x-message-ttl': 604800000 // 7天
          }
        });

        // 绑定死信队列到死信交换机
        await this.queueManager.bindQueue(dlqQueue, 'smart.village.dlx', dlqQueue);
      }

      Logger.info('死信队列基础设施创建完成');
    } catch (error) {
      Logger.error('创建死信队列基础设施失败:', error);
      throw error;
    }
  }

  /**
   * 注册消息处理器
   */
  registerHandler(queueName, handler, options = {}) {
    try {
      const defaultOptions = {
        maxConcurrency: 1,
        retryAttempts: 3,
        retryDelay: 5000,
        timeout: 30000
      };

      const handlerOptions = { ...defaultOptions, ...options };

      this.handlers.set(queueName, {
        handler,
        options: handlerOptions
      });

      Logger.info(`消息处理器注册成功: ${queueName}`);
      return true;
    } catch (error) {
      Logger.error(`注册消息处理器失败: ${queueName}`, error);
      throw error;
    }
  }

  /**
   * 启动消费
   */
  async startConsuming() {
    try {
      if (this.isRunning) {
        Logger.warn('消费者已在运行中');
        return;
      }

      Logger.info('启动消息消费...');

      // 启动村庄事件消费
      await this.startVillageEventsConsuming();

      // 启动通知消息消费
      await this.startNotificationsConsuming();

      // 启动任务消息消费
      await this.startTasksConsuming();

      // 启动分析事件消费
      await this.startAnalyticsConsuming();

      // 启动审计日志消费
      await this.startAuditConsuming();

      this.isRunning = true;
      Logger.info('所有消息消费者启动成功');
    } catch (error) {
      Logger.error('启动消息消费失败:', error);
      throw error;
    }
  }

  /**
   * 启动村庄事件消费
   */
  async startVillageEventsConsuming() {
    try {
      const queueName = this.queues.village_events;
      const handlerConfig = this.handlers.get('village_events');

      if (!handlerConfig) {
        Logger.warn('未找到村庄事件处理器，跳过启动');
        return;
      }

      const consumerTag = await this.queueManager.consume(queueName, async (messageData) => {
        await this.handleMessage('village_events', messageData, handlerConfig);
      }, {
        requeueOnFailure: false
      });

      this.consumers.set('village_events', consumerTag);
      Logger.info(`村庄事件消费者启动成功 (consumerTag: ${consumerTag})`);
    } catch (error) {
      Logger.error('启动村庄事件消费者失败:', error);
      throw error;
    }
  }

  /**
   * 启动通知消息消费
   */
  async startNotificationsConsuming() {
    try {
      const queueName = this.queues.notifications;
      const handlerConfig = this.handlers.get('notifications');

      if (!handlerConfig) {
        Logger.warn('未找到通知消息处理器，跳过启动');
        return;
      }

      const consumerTag = await this.queueManager.consume(queueName, async (messageData) => {
        await this.handleMessage('notifications', messageData, handlerConfig);
      }, {
        requeueOnFailure: false
      });

      this.consumers.set('notifications', consumerTag);
      Logger.info(`通知消息消费者启动成功 (consumerTag: ${consumerTag})`);
    } catch (error) {
      Logger.error('启动通知消息消费者失败:', error);
      throw error;
    }
  }

  /**
   * 启动任务消息消费
   */
  async startTasksConsuming() {
    try {
      const queueName = this.queues.tasks;
      const handlerConfig = this.handlers.get('tasks');

      if (!handlerConfig) {
        Logger.warn('未找到任务消息处理器，跳过启动');
        return;
      }

      const consumerTag = await this.queueManager.consume(queueName, async (messageData) => {
        await this.handleMessage('tasks', messageData, handlerConfig);
      }, {
        requeueOnFailure: false
      });

      this.consumers.set('tasks', consumerTag);
      Logger.info(`任务消息消费者启动成功 (consumerTag: ${consumerTag})`);
    } catch (error) {
      Logger.error('启动任务消息消费者失败:', error);
      throw error;
    }
  }

  /**
   * 启动分析事件消费
   */
  async startAnalyticsConsuming() {
    try {
      const queueName = this.queues.analytics;
      const handlerConfig = this.handlers.get('analytics');

      if (!handlerConfig) {
        Logger.warn('未找到分析事件处理器，跳过启动');
        return;
      }

      const consumerTag = await this.queueManager.consume(queueName, async (messageData) => {
        await this.handleMessage('analytics', messageData, handlerConfig);
      }, {
        requeueOnFailure: false
      });

      this.consumers.set('analytics', consumerTag);
      Logger.info(`分析事件消费者启动成功 (consumerTag: ${consumerTag})`);
    } catch (error) {
      Logger.error('启动分析事件消费者失败:', error);
      throw error;
    }
  }

  /**
   * 启动审计日志消费
   */
  async startAuditConsuming() {
    try {
      const queueName = this.queues.audit;
      const handlerConfig = this.handlers.get('audit');

      if (!handlerConfig) {
        Logger.warn('未找到审计日志处理器，跳过启动');
        return;
      }

      const consumerTag = await this.queueManager.consume(queueName, async (messageData) => {
        await this.handleMessage('audit', messageData, handlerConfig);
      }, {
        requeueOnFailure: false
      });

      this.consumers.set('audit', consumerTag);
      Logger.info(`审计日志消费者启动成功 (consumerTag: ${consumerTag})`);
    } catch (error) {
      Logger.error('启动审计日志消费者失败:', error);
      throw error;
    }
  }

  /**
   * 处理消息
   */
  async handleMessage(queueName, messageData, handlerConfig) {
    const { handler, options } = handlerConfig;
    const messageId = messageData.properties.messageId;
    const startTime = Date.now();

    try {
      Logger.debug(`开始处理消息 (${queueName})`, {
        messageId,
        queueName
      });

      // 设置超时
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('消息处理超时')), options.timeout);
      });

      // 处理消息
      const processPromise = handler(messageData);

      // 等待处理完成或超时
      const result = await Promise.race([processPromise, timeoutPromise]);

      const processingTime = Date.now() - startTime;

      Logger.info(`消息处理成功 (${queueName})`, {
        messageId,
        processingTime,
        result: result ? 'success' : 'no-result'
      });

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      Logger.error(`消息处理失败 (${queueName})`, {
        messageId,
        error: error.message,
        stack: error.stack,
        processingTime
      });

      // 处理重试逻辑
      if (this.shouldRetry(messageData, options)) {
        await this.retryMessage(queueName, messageData, options);
      } else {
        Logger.error(`消息重试次数达到上限，移至死信队列 (${queueName})`, {
          messageId
        });
        throw error; // 不重试，消息将进入死信队列
      }
    }
  }

  /**
   * 判断是否应该重试
   */
  shouldRetry(messageData, options) {
    const retryCount = messageData.content.retryCount || 0;
    return retryCount < options.retryAttempts;
  }

  /**
   * 重试消息
   */
  async retryMessage(queueName, messageData, options) {
    try {
      const retryCount = (messageData.content.retryCount || 0) + 1;
      const delay = options.retryDelay * Math.pow(2, retryCount - 1); // 指数退避

      Logger.info(`准备重试消息 (${queueName})`, {
        messageId: messageData.properties.messageId,
        retryCount,
        delay
      });

      // 等待延迟时间
      await new Promise(resolve => setTimeout(resolve, delay));

      // 更新重试次数
      const updatedContent = {
        ...messageData.content,
        retryCount
      };

      // 重新发送到队列
      const producer = require('./MessageProducer');
      const messageProducer = new producer(this.queueManager);

      await messageProducer.sendMessage(queueName, updatedContent, {
        delayUntil: new Date(Date.now() + delay).toISOString()
      });

      Logger.info(`消息重试发送成功 (${queueName})`, {
        messageId: messageData.properties.messageId,
        retryCount
      });
    } catch (error) {
      Logger.error(`消息重试失败 (${queueName})`, {
        messageId: messageData.properties.messageId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 停止消费
   */
  async stopConsuming() {
    try {
      if (!this.isRunning) {
        Logger.warn('消费者未在运行');
        return;
      }

      Logger.info('正在停止消息消费...');

      // 取消所有消费者
      for (const [queueName, consumerTag] of this.consumers) {
        try {
          await this.queueManager.cancelConsumer(consumerTag);
          Logger.info(`消费者已停止: ${queueName} (${consumerTag})`);
        } catch (error) {
          Logger.error(`停止消费者失败: ${queueName}`, error);
        }
      }

      this.consumers.clear();
      this.isRunning = false;

      Logger.info('所有消息消费者已停止');
    } catch (error) {
      Logger.error('停止消息消费失败:', error);
      throw error;
    }
  }

  /**
   * 获取队列信息
   */
  async getQueueInfo() {
    try {
      const queueInfo = {};

      for (const [name, queue] of Object.entries(this.queues)) {
        try {
          queueInfo[name] = await this.queueManager.getQueueInfo(queue);
        } catch (error) {
          queueInfo[name] = {
            error: error.message,
            queue: queue
          };
        }
      }

      return queueInfo;
    } catch (error) {
      Logger.error('获取队列信息失败:', error);
      throw error;
    }
  }

  /**
   * 清空队列
   */
  async purgeQueue(queueName) {
    try {
      const queue = this.queues[queueName];
      if (!queue) {
        throw new Error(`队列 ${queueName} 不存在`);
      }

      await this.queueManager.purgeQueue(queue);
      Logger.info(`队列已清空: ${queueName}`);
      return true;
    } catch (error) {
      Logger.error(`清空队列失败: ${queueName}`, error);
      throw error;
    }
  }

  /**
   * 获取消费统计
   */
  getConsumerStats() {
    return {
      isRunning: this.isRunning,
      registeredHandlers: this.handlers.size,
      activeConsumers: this.consumers.size,
      queueStatus: Object.keys(this.queues),
      uptime: process.uptime()
    };
  }
}

module.exports = MessageConsumer;