/**
 * 消息队列管理器
 * 负责RabbitMQ连接、通道管理、队列和交换机管理
 */

const amqp = require('amqplib');
const EventEmitter = require('events');
const Logger = require('../utils/logger');

class MessageQueueManager extends EventEmitter {
  constructor() {
    super();
    this.connection = null;
    this.channels = new Map();
    this.queues = new Map();
    this.exchanges = new Map();
    this.config = {
      url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
      heartbeat: 60,
      reconnect: true,
      reconnectBackoffStrategy: 'linear',
      reconnectBackoffTime: 5000,
      maxReconnectAttempts: 10
    };
    this.reconnectAttempts = 0;
    this.isShuttingDown = false;
  }

  /**
   * 连接到RabbitMQ服务器
   */
  async connect() {
    try {
      Logger.info('正在连接到RabbitMQ服务器...', {
        url: this.config.url.replace(/\/\/.*@/, '//***@')
      });

      this.connection = await amqp.connect(this.config.url, {
        heartbeat: this.config.heartbeat
      });

      // 设置连接事件监听
      this.setupConnectionEvents();

      Logger.info('RabbitMQ连接成功');

      // 连接成功后重置重连计数
      this.reconnectAttempts = 0;

      return this.connection;
    } catch (error) {
      Logger.error('RabbitMQ连接失败:', error);

      if (this.config.reconnect && !this.isShuttingDown) {
        await this.handleReconnect();
      }

      throw error;
    }
  }

  /**
   * 设置连接事件监听
   */
  setupConnectionEvents() {
    this.connection.on('error', (err) => {
      Logger.error('RabbitMQ连接错误:', err);
      this.emit('connection:error', err);
    });

    this.connection.on('close', () => {
      Logger.warn('RabbitMQ连接已关闭');
      this.emit('connection:close');

      if (this.config.reconnect && !this.isShuttingDown) {
        this.handleReconnect();
      }
    });

    this.connection.on('blocked', (reason) => {
      Logger.warn('RabbitMQ连接被阻塞:', reason);
      this.emit('connection:blocked', reason);
    });

    this.connection.on('unblocked', () => {
      Logger.info('RabbitMQ连接已解除阻塞');
      this.emit('connection:unblocked');
    });
  }

  /**
   * 处理重连
   */
  async handleReconnect() {
    if (this.isShuttingDown || this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      Logger.error('达到最大重连次数，停止重连');
      this.emit('reconnect:failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectBackoffTime * this.reconnectAttempts;

    Logger.info(`准备第${this.reconnectAttempts}次重连，${delay}ms后执行...`);

    setTimeout(async () => {
      try {
        await this.connect();
        this.emit('reconnect:success');
        Logger.info('RabbitMQ重连成功');
      } catch (error) {
        Logger.error('RabbitMQ重连失败:', error);
        await this.handleReconnect();
      }
    }, delay);
  }

  /**
   * 创建通道
   */
  async createChannel(channelName = 'default', options = {}) {
    try {
      if (!this.connection) {
        await this.connect();
      }

      const channel = await this.connection.createChannel(options);

      // 设置通道选项
      await channel.prefetch(10); // 预取消息数量
      await channel.assertQueue('', { exclusive: true }); // 创建临时队列用于回复

      this.channels.set(channelName, channel);

      // 设置通道事件监听
      channel.on('error', (err) => {
        Logger.error(`通道 ${channelName} 错误:`, err);
        this.emit('channel:error', { channelName, error: err });
      });

      channel.on('close', () => {
        Logger.warn(`通道 ${channelName} 已关闭`);
        this.channels.delete(channelName);
        this.emit('channel:close', { channelName });
      });

      Logger.info(`通道 ${channelName} 创建成功`);
      return channel;
    } catch (error) {
      Logger.error(`创建通道 ${channelName} 失败:`, error);
      throw error;
    }
  }

  /**
   * 获取通道
   */
  getChannel(channelName = 'default') {
    return this.channels.get(channelName);
  }

  /**
   * 创建交换机
   */
  async createExchange(exchangeName, type = 'direct', options = {}) {
    try {
      const channel = await this.createChannel('exchange');

      const defaultOptions = {
        durable: true,
        autoDelete: false,
        internal: false
      };

      const exchangeOptions = { ...defaultOptions, ...options };

      await channel.assertExchange(exchangeName, type, exchangeOptions);

      this.exchanges.set(exchangeName, {
        name: exchangeName,
        type,
        options: exchangeOptions,
        channel: 'exchange'
      });

      Logger.info(`交换机 ${exchangeName} (${type}) 创建成功`);
      return channel;
    } catch (error) {
      Logger.error(`创建交换机 ${exchangeName} 失败:`, error);
      throw error;
    }
  }

  /**
   * 创建队列
   */
  async createQueue(queueName, options = {}) {
    try {
      const channel = await this.createChannel('queue');

      const defaultOptions = {
        durable: true,
        exclusive: false,
        autoDelete: false,
        arguments: null
      };

      const queueOptions = { ...defaultOptions, ...options };

      const result = await channel.assertQueue(queueName, queueOptions);

      this.queues.set(queueName, {
        name: result.queue,
        options: queueOptions,
        channel: 'queue'
      });

      Logger.info(`队列 ${queueName} 创建成功`);
      return { channel, queue: result.queue };
    } catch (error) {
      Logger.error(`创建队列 ${queueName} 失败:`, error);
      throw error;
    }
  }

  /**
   * 绑定队列到交换机
   */
  async bindQueue(queueName, exchangeName, routingKey = '', options = {}) {
    try {
      const queue = this.queues.get(queueName);
      const exchange = this.exchanges.get(exchangeName);

      if (!queue) {
        throw new Error(`队列 ${queueName} 不存在`);
      }

      if (!exchange) {
        throw new Error(`交换机 ${exchangeName} 不存在`);
      }

      const queueChannel = this.channels.get(queue.channel);
      if (!queueChannel) {
        throw new Error(`队列 ${queueName} 的通道不存在`);
      }

      await queueChannel.bindQueue(queue.name, exchange.name, routingKey, options);

      Logger.info(`队列 ${queueName} 绑定到交换机 ${exchangeName} (routingKey: ${routingKey})`);
      return true;
    } catch (error) {
      Logger.error(`绑定队列失败:`, error);
      throw error;
    }
  }

  /**
   * 发送消息
   */
  async publish(exchangeName, routingKey, message, options = {}) {
    try {
      const exchange = this.exchanges.get(exchangeName);

      if (!exchange) {
        throw new Error(`交换机 ${exchangeName} 不存在`);
      }

      const channel = this.channels.get(exchange.channel);
      if (!channel) {
        throw new Error(`交换机 ${exchangeName} 的通道不存在`);
      }

      const defaultOptions = {
        persistent: true,
        mandatory: false,
        immediate: false,
        timestamp: Date.now(),
        messageId: this.generateMessageId(),
        headers: {}
      };

      const publishOptions = { ...defaultOptions, ...options };

      // 序列化消息
      let serializedMessage;
      if (typeof message === 'string') {
        serializedMessage = message;
      } else {
        serializedMessage = JSON.stringify(message);
        publishOptions.headers['Content-Type'] = 'application/json';
      }

      // 添加消息元数据
      publishOptions.headers['source-service'] = process.env.SERVICE_NAME || 'unknown';
      publishOptions.headers['message-type'] = 'business-message';

      const published = channel.publish(
        exchange.name,
        routingKey,
        Buffer.from(serializedMessage),
        publishOptions
      );

      if (published) {
        Logger.debug('消息发布成功', {
          exchange: exchange.name,
          routingKey,
          messageId: publishOptions.messageId
        });

        this.emit('message:published', {
          exchange: exchange.name,
          routingKey,
          messageId: publishOptions.messageId,
          size: serializedMessage.length
        });

        return publishOptions.messageId;
      } else {
        throw new Error('消息发布失败');
      }
    } catch (error) {
      Logger.error('发布消息失败:', error);
      this.emit('message:publish-failed', { exchangeName, routingKey, error });
      throw error;
    }
  }

  /**
   * 发送到队列（直接队列模式）
   */
  async sendToQueue(queueName, message, options = {}) {
    try {
      const queue = this.queues.get(queueName);

      if (!queue) {
        throw new Error(`队列 ${queueName} 不存在`);
      }

      const channel = this.channels.get(queue.channel);
      if (!channel) {
        throw new Error(`队列 ${queueName} 的通道不存在`);
      }

      const defaultOptions = {
        persistent: true,
        mandatory: false,
        immediate: false,
        timestamp: Date.now(),
        messageId: this.generateMessageId(),
        headers: {}
      };

      const sendOptions = { ...defaultOptions, ...options };

      // 序列化消息
      let serializedMessage;
      if (typeof message === 'string') {
        serializedMessage = message;
      } else {
        serializedMessage = JSON.stringify(message);
        sendOptions.headers['Content-Type'] = 'application/json';
      }

      const sent = channel.sendToQueue(
        queue.name,
        Buffer.from(serializedMessage),
        sendOptions
      );

      if (sent) {
        Logger.debug('消息发送到队列成功', {
          queue: queue.name,
          messageId: sendOptions.messageId
        });

        this.emit('message:sent', {
          queue: queue.name,
          messageId: sendOptions.messageId,
          size: serializedMessage.length
        });

        return sendOptions.messageId;
      } else {
        throw new Error('消息发送到队列失败');
      }
    } catch (error) {
      Logger.error('发送消息到队列失败:', error);
      throw error;
    }
  }

  /**
   * 消费消息
   */
  async consume(queueName, handler, options = {}) {
    try {
      const queue = this.queues.get(queueName);

      if (!queue) {
        throw new Error(`队列 ${queueName} 不存在`);
      }

      const channel = this.channels.get(queue.channel);
      if (!channel) {
        throw new Error(`队列 ${queueName} 的通道不存在`);
      }

      const defaultOptions = {
        noAck: false,
        exclusive: false,
        priority: 0,
        consumerTag: '',
        arguments: null
      };

      const consumeOptions = { ...defaultOptions, ...options };

      const { consumerTag } = await channel.consume(queue.name, async (msg) => {
        if (!msg) {
          Logger.warn(`队列 ${queueName} 接收到空消息`);
          return;
        }

        const messageId = msg.properties.messageId;
        const timestamp = msg.properties.timestamp;
        const headers = msg.properties.headers || {};

        try {
          // 解析消息
          let content;
          if (headers['Content-Type'] === 'application/json') {
            content = JSON.parse(msg.content.toString());
          } else {
            content = msg.content.toString();
          }

          const messageData = {
            content,
            properties: msg.properties,
            fields: msg.fields,
            headers
          };

          Logger.debug('处理消息', {
            queue: queueName,
            messageId,
            timestamp,
            size: msg.content.length
          });

          // 调用处理函数
          const result = await handler(messageData);

          // 确认消息处理成功
          channel.ack(msg);

          this.emit('message:processed', {
            queue: queueName,
            messageId,
            result
          });

          Logger.debug('消息处理成功', {
            queue: queueName,
            messageId
          });

        } catch (error) {
          Logger.error('消息处理失败:', {
            queue: queueName,
            messageId,
            error: error.message,
            stack: error.stack
          });

          // 拒绝消息并重新入队（根据配置）
          const shouldRequeue = options.requeueOnFailure !== false;
          channel.nack(msg, false, shouldRequeue);

          this.emit('message:processing-failed', {
            queue: queueName,
            messageId,
            error,
            requeue: shouldRequeue
          });
        }
      }, consumeOptions);

      Logger.info(`开始消费队列 ${queueName} (consumerTag: ${consumerTag})`);

      return consumerTag;
    } catch (error) {
      Logger.error(`消费队列 ${queueName} 失败:`, error);
      throw error;
    }
  }

  /**
   * 取消消费
   */
  async cancelConsumer(consumerTag) {
    try {
      const channel = this.channels.get('default');
      if (!channel) {
        throw new Error('默认通道不存在');
      }

      await channel.cancel(consumerTag);
      Logger.info(`消费者 ${consumerTag} 已取消`);
      return true;
    } catch (error) {
      Logger.error(`取消消费者失败:`, error);
      throw error;
    }
  }

  /**
   * 获取队列信息
   */
  async getQueueInfo(queueName) {
    try {
      const queue = this.queues.get(queueName);

      if (!queue) {
        throw new Error(`队列 ${queueName} 不存在`);
      }

      const channel = this.channels.get(queue.channel);
      if (!channel) {
        throw new Error(`队列 ${queueName} 的通道不存在`);
      }

      const info = await channel.checkQueue(queue.name);

      return {
        name: info.queue,
        messageCount: info.messageCount,
        consumerCount: info.consumerCount
      };
    } catch (error) {
      Logger.error(`获取队列信息失败:`, error);
      throw error;
    }
  }

  /**
   * 清空队列
   */
  async purgeQueue(queueName) {
    try {
      const queue = this.queues.get(queueName);

      if (!queue) {
        throw new Error(`队列 ${queueName} 不存在`);
      }

      const channel = this.channels.get(queue.channel);
      if (!channel) {
        throw new Error(`队列 ${queueName} 的通道不存在`);
      }

      await channel.purgeQueue(queue.name);
      Logger.info(`队列 ${queueName} 已清空`);
      return true;
    } catch (error) {
      Logger.error(`清空队列失败:`, error);
      throw error;
    }
  }

  /**
   * 删除队列
   */
  async deleteQueue(queueName, options = {}) {
    try {
      const queue = this.queues.get(queueName);

      if (!queue) {
        return true;
      }

      const channel = this.channels.get(queue.channel);
      if (!channel) {
        throw new Error(`队列 ${queueName} 的通道不存在`);
      }

      await channel.deleteQueue(queue.name, options);
      this.queues.delete(queueName);

      Logger.info(`队列 ${queueName} 已删除`);
      return true;
    } catch (error) {
      Logger.error(`删除队列失败:`, error);
      throw error;
    }
  }

  /**
   * 生成消息ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus() {
    return {
      connected: this.connection !== null,
      channels: this.channels.size,
      queues: this.queues.size,
      exchanges: this.exchanges.size,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * 关闭连接
   */
  async close() {
    this.isShuttingDown = true;
    Logger.info('正在关闭RabbitMQ连接...');

    try {
      // 关闭所有通道
      for (const [channelName, channel] of this.channels) {
        try {
          await channel.close();
          Logger.debug(`通道 ${channelName} 已关闭`);
        } catch (error) {
          Logger.error(`关闭通道 ${channelName} 失败:`, error);
        }
      }

      this.channels.clear();

      // 关闭连接
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
        Logger.info('RabbitMQ连接已关闭');
      }

      // 清空缓存
      this.queues.clear();
      this.exchanges.clear();

      Logger.info('RabbitMQ管理器已关闭');
    } catch (error) {
      Logger.error('关闭RabbitMQ连接失败:', error);
      throw error;
    }
  }
}

module.exports = MessageQueueManager;