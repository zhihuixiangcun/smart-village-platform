/**
 * Kafka消息队列管理器
 * 智慧乡村平台实时数据流处理核心组件
 */

const { Kafka } = require('kafkajs');
const EventEmitter = require('events');
const logger = require('../utils/logger');
const crypto = require('crypto');

class KafkaManager extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      // Kafka集群配置
      clientId: config.clientId || 'smartvillage-streaming',
      brokers: config.brokers || ['localhost:9092', 'localhost:9093', 'localhost:9094'],
      ssl: config.ssl || false,
      sasl: config.sasl || null,

      // 生产者配置
      producer: {
        maxMessages: config.maxMessages || 100,
        lingerMs: config.lingerMs || 10,
        compressionType: config.compressionType || 'gzip',
        enableIdempotence: config.enableIdempotence !== false,
        transactionTimeout: config.transactionTimeout || 30000
      },

      // 消费者配置
      consumer: {
        groupId: config.groupId || 'smartvillage-consumers',
        sessionTimeout: config.sessionTimeout || 30000,
        heartbeatInterval: config.heartbeatInterval || 3000,
        maxWaitTimeInMs: config.maxWaitTimeInMs || 5000,
        allowAutoTopicCreation: config.allowAutoTopicCreation !== false,
        fromBeginning: config.fromBeginning || false
      },

      // 主题配置
      topics: {
        // 实时数据流主题
        'village-events': {
          partitions: 6,
          replicationFactor: 3,
          config: {
            'cleanup.policy': 'delete',
            'retention.ms': 60 * 60 * 1000, // 1小时
            'segment.ms': 30 * 60 * 1000     // 30分钟分段
          }
        },

        // 紧急事件主题
        'emergency-events': {
          partitions: 3,
          replicationFactor: 3,
          config: {
            'cleanup.policy': 'delete',
            'retention.ms': 24 * 60 * 60 * 1000, // 24小时
            'max.message.bytes': 1048576      // 1MB
          }
        },

        // 用户行为主题
        'user-behavior': {
          partitions: 8,
          replicationFactor: 3,
          config: {
            'cleanup.policy': 'delete',
            'retention.ms': 7 * 24 * 60 * 60 * 1000, // 7天
            'compression.type': 'gzip'
          }
        },

        // IoT传感器数据主题
        'iot-sensor-data': {
          partitions: 12,
          replicationFactor: 3,
          config: {
            'cleanup.policy': 'delete',
            'retention.ms': 2 * 60 * 60 * 1000, // 2小时
            'segment.bytes': 1073741824        // 1GB分段
          }
        },

        // 政策更新主题
        'policy-updates': {
          partitions: 3,
          replicationFactor: 3,
          config: {
            'cleanup.policy': 'compact',
            'min.cleanable.dirty.ratio': 0.1
          }
        },

        // 系统监控主题
        'system-metrics': {
          partitions: 4,
          replicationFactor: 3,
          config: {
            'cleanup.policy': 'delete',
            'retention.ms': 6 * 60 * 60 * 1000, // 6小时
            'segment.ms': 60 * 60 * 1000       // 1小时分段
          }
        }
      },

      // 性能配置
      performance: {
        throughputThrottle: config.throughputThrottle || 1000, // 每秒消息数
        batchSize: config.batchSize || 100,
        queueBufferingMaxMs: config.queueBufferingMaxMs || 10,
        compressionLevel: config.compressionLevel || 6
      }
    };

    // Kafka客户端实例
    this.kafka = new Kafka({
      clientId: this.config.clientId,
      brokers: this.config.brokers,
      ssl: this.config.ssl,
      sasl: this.config.sasl
    });

    this.producer = null;
    this.consumers = new Map();
    this.topics = new Map();

    // 性能统计
    this.stats = {
      messagesProduced: 0,
      messagesConsumed: 0,
      bytesProduced: 0,
      bytesConsumed: 0,
      errors: 0,
      lastProduceTime: 0,
      lastConsumeTime: 0,
      throughput: 0
    };

    // 消息缓冲区
    this.messageBuffer = {
      emergency: [],      // 紧急消息缓冲区
      normal: [],         // 普通消息缓冲区
      batch: []          // 批量消息缓冲区
    };

    // 初始化Kafka连接
    this.initKafka();
  }

  /**
   * 初始化Kafka连接
   */
  async initKafka() {
    try {
      // 创建生产者
      this.producer = this.kafka.producer(this.config.producer);

      // 连接生产者
      await this.producer.connect();
      logger.info('Kafka生产者连接成功');

      // 创建主题
      await this.createTopics();

      // 启动后台任务
      this.startBackgroundTasks();

      // 启动消息缓冲区处理
      this.startBufferProcessor();

      logger.info('Kafka管理器初始化完成', {
        brokers: this.config.brokers,
        topics: Object.keys(this.config.topics).length
      });

      this.emit('connected');

    } catch (error) {
      logger.error('Kafka初始化失败', error);
      throw error;
    }
  }

  /**
   * 创建主题
   */
  async createTopics() {
    const admin = this.kafka.admin();
    await admin.connect();

    try {
      // 获取现有主题
      const existingTopics = await admin.listTopics();

      // 创建新主题
      const topicsToCreate = [];
      for (const [topicName, topicConfig] of Object.entries(this.config.topics)) {
        if (!existingTopics.includes(topicName)) {
          topicsToCreate.push({
            topic: topicName,
            numPartitions: topicConfig.partitions,
            replicationFactor: topicConfig.replicationFactor,
            configEntries: Object.entries(topicConfig.config).map(([key, value]) => ({
              name: key,
              value: value.toString()
            }))
          });
        }
      }

      if (topicsToCreate.length > 0) {
        await admin.createTopics({ topics: topicsToCreate });
        logger.info('Kafka主题创建成功', {
          count: topicsToCreate.length,
          topics: topicsToCreate.map(t => t.topic)
        });
      }

    } catch (error) {
      logger.error('创建Kafka主题失败', error);
    } finally {
      await admin.disconnect();
    }
  }

  /**
   * 发送消息
   * @param {string} topic - 主题名称
   * @param {Object|Array} messages - 消息或消息数组
   * @param {Object} options - 选项
   */
  async sendMessages(topic, messages, options = {}) {
    try {
      if (!this.producer) {
        throw new Error('Kafka生产者未初始化');
      }

      // 标准化消息格式
      const standardMessages = this.standardizeMessages(messages, options);

      // 根据优先级处理
      if (options.priority === 'emergency') {
        return await this.sendEmergencyMessage(topic, standardMessages, options);
      } else if (options.batch === true) {
        return await this.sendBatchMessage(topic, standardMessages, options);
      } else {
        return await this.sendSingleMessage(topic, standardMessages, options);
      }

    } catch (error) {
      this.stats.errors++;
      logger.error('发送Kafka消息失败', { topic, error: error.message });
      throw error;
    }
  }

  /**
   * 创建消费者
   * @param {string} groupId - 消费者组ID
   * @param {Array} topics - 主题列表
   * @param {Object} options - 消费者选项
   */
  async createConsumer(groupId, topics, options = {}) {
    try {
      const consumerConfig = {
        ...this.config.consumer,
        groupId: groupId
      };

      const consumer = this.kafka.consumer(consumerConfig);

      // 连接消费者
      await consumer.connect();

      // 订阅主题
      await consumer.subscribe({ topics, fromBeginning: options.fromBeginning });

      // 存储消费者实例
      this.consumers.set(groupId, {
        consumer,
        topics,
        options,
        stats: {
          messagesConsumed: 0,
          lastConsumeTime: 0
        }
      });

      logger.info('Kafka消费者创建成功', { groupId, topics });

      return consumer;

    } catch (error) {
      logger.error('创建Kafka消费者失败', { groupId, error: error.message });
      throw error;
    }
  }

  /**
   * 开始消费消息
   * @param {string} groupId - 消费者组ID
   * @param {Function} messageHandler - 消息处理函数
   * @param {Object} options - 选项
   */
  async startConsuming(groupId, messageHandler, options = {}) {
    try {
      const consumerInfo = this.consumers.get(groupId);
      if (!consumerInfo) {
        throw new Error(`消费者组 ${groupId} 不存在`);
      }

      const { consumer } = consumerInfo;

      // 开始消费
      await consumer.run({
        eachMessage: async ({ topic, partition, message, heartbeat }) => {
          try {
            const startTime = Date.now();

            // 解析消息
            const parsedMessage = this.parseMessage(message);

            // 调用处理函数
            await messageHandler({
              topic,
              partition,
              offset: message.offset,
              key: message.key?.toString(),
              value: parsedMessage,
              timestamp: message.timestamp,
              headers: message.headers,
              heartbeat
            });

            // 更新统计
            const processingTime = Date.now() - startTime;
            this.updateConsumeStats(groupId, message.value.length, processingTime);

            logger.debug('消息处理完成', {
              groupId,
              topic,
              offset: message.offset,
              processingTime
            });

          } catch (error) {
            logger.error('消息处理失败', {
              groupId,
              topic,
              offset: message.offset,
              error: error.message
            });

            // 根据配置决定是否继续处理
            if (options.stopOnError) {
              throw error;
            }
          }
        }
      });

      logger.info('开始消费消息', { groupId });

      // 设置错误处理
      consumer.on('consumer.crash', (error) => {
        logger.error('消费者崩溃', { groupId, error: error.message });
        this.emit('consumer:crash', { groupId, error });
      });

      consumer.on('consumer.stop', () => {
        logger.info('消费者停止', { groupId });
        this.emit('consumer:stop', { groupId });
      });

    } catch (error) {
      logger.error('开始消费失败', { groupId, error: error.message });
      throw error;
    }
  }

  /**
   * 停止消费者
   * @param {string} groupId - 消费者组ID
   */
  async stopConsumer(groupId) {
    try {
      const consumerInfo = this.consumers.get(groupId);
      if (consumerInfo) {
        await consumerInfo.consumer.disconnect();
        this.consumers.delete(groupId);
        logger.info('消费者已停止', { groupId });
      }
    } catch (error) {
      logger.error('停止消费者失败', { groupId, error: error.message });
      throw error;
    }
  }

  /**
   * 获取主题信息
   * @param {string} topic - 主题名称
   */
  async getTopicMetadata(topic) {
    try {
      const admin = this.kafka.admin();
      await admin.connect();

      const metadata = await admin.fetchTopicMetadata({ topics: [topic] });
      await admin.disconnect();

      return metadata.topics[0];

    } catch (error) {
      logger.error('获取主题元数据失败', { topic, error: error.message });
      throw error;
    }
  }

  /**
   * 获取消费者组信息
   * @param {string} groupId - 消费者组ID
   */
  async getConsumerGroupInfo(groupId) {
    try {
      const admin = this.kafka.admin();
      await admin.connect();

      const groupDescription = await admin.describeConsumerGroups([groupId]);
      await admin.disconnect();

      return groupDescription.groups[0];

    } catch (error) {
      logger.error('获取消费者组信息失败', { groupId, error: error.message });
      throw error;
    }
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    const now = Date.now();
    const timeWindow = 60000; // 1分钟窗口

    return {
      messagesProduced: this.stats.messagesProduced,
      messagesConsumed: this.stats.messagesConsumed,
      bytesProduced: this.stats.bytesProduced,
      bytesConsumed: this.stats.bytesConsumed,
      errors: this.stats.errors,
      throughput: this.calculateThroughput(timeWindow),
      producer: {
        connected: this.producer ? true : false,
        lastProduceTime: this.stats.lastProduceTime
      },
      consumers: Array.from(this.consumers.entries()).map(([groupId, info]) => ({
        groupId,
        topics: info.topics,
        messagesConsumed: info.stats.messagesConsumed,
        lastConsumeTime: info.stats.lastConsumeTime
      }))
    };
  }

  // 私有方法

  /**
   * 标准化消息格式
   */
  standardizeMessages(messages, options) {
    const messagesArray = Array.isArray(messages) ? messages : [messages];
    const timestamp = Date.now();
    const messageId = crypto.randomUUID();

    return messagesArray.map(msg => ({
      key: options.key || null,
      value: JSON.stringify({
        id: messageId,
        timestamp,
        type: options.type || 'data',
        source: options.source || 'smartvillage',
        data: msg
      }),
      headers: {
        'message-id': messageId,
        'message-type': options.type || 'data',
        'source': options.source || 'smartvillage',
        'priority': options.priority || 'normal',
        'content-type': 'application/json'
      },
      partition: options.partition || null
    }));
  }

  /**
   * 发送紧急消息
   */
  async sendEmergencyMessage(topic, messages, options) {
    // 紧急消息优先处理，跳过缓冲区
    const result = await this.producer.send({
      topic,
      messages: messages.map(msg => ({
        ...msg,
        headers: {
          ...msg.headers,
          'priority': 'emergency'
        }
      })),
      acks: -1, // 等待所有副本确认
      timeout: options.timeout || 5000
    });

    this.updateProduceStats(messages);
    logger.info('紧急消息发送成功', { topic, count: messages.length });

    return result;
  }

  /**
   * 发送批量消息
   */
  async sendBatchMessage(topic, messages, options) {
    // 添加到批量缓冲区
    this.messageBuffer.batch.push({
      topic,
      messages,
      timestamp: Date.now()
    });

    return { status: 'buffered', count: messages.length };
  }

  /**
   * 发送单个消息
   */
  async sendSingleMessage(topic, messages, options) {
    const result = await this.producer.send({
      topic,
      messages,
      acks: 1, // 等待leader确认
      timeout: options.timeout || 30000
    });

    this.updateProduceStats(messages);
    return result;
  }

  /**
   * 解析消息
   */
  parseMessage(message) {
    try {
      const value = message.value.toString();
      return JSON.parse(value);
    } catch (error) {
      return message.value.toString();
    }
  }

  /**
   * 更新生产统计
   */
  updateProduceStats(messages) {
    this.stats.messagesProduced += messages.length;
    this.stats.bytesProduced += messages.reduce((sum, msg) =>
      sum + (msg.value ? msg.value.length : 0), 0
    );
    this.stats.lastProduceTime = Date.now();
  }

  /**
   * 更新消费统计
   */
  updateConsumeStats(groupId, messageSize, processingTime) {
    this.stats.messagesConsumed++;
    this.stats.bytesConsumed += messageSize;
    this.stats.lastConsumeTime = Date.now();

    const consumerInfo = this.consumers.get(groupId);
    if (consumerInfo) {
      consumerInfo.stats.messagesConsumed++;
      consumerInfo.stats.lastConsumeTime = Date.now();
    }
  }

  /**
   * 计算吞吐量
   */
  calculateThroughput(timeWindow) {
    // 简化的吞吐量计算
    const messagesPerSecond = this.stats.messagesProduced / (timeWindow / 1000);
    this.stats.throughput = messagesPerSecond;
    return messagesPerSecond;
  }

  /**
   * 启动后台任务
   */
  startBackgroundTasks() {
    // 定期统计报告
    setInterval(() => {
      const stats = this.getPerformanceStats();
      this.emit('stats:updated', stats);

      // 记录关键指标
      if (stats.throughput > this.config.performance.throughputThrottle) {
        logger.warn('Kafka吞吐量过高', {
          throughput: stats.throughput,
          threshold: this.config.performance.throughputThrottle
        });
      }
    }, 10000); // 每10秒报告一次

    // 连接健康检查
    setInterval(async () => {
      try {
        if (this.producer) {
          await this.producer.ping();
        }
      } catch (error) {
        logger.error('Kafka连接检查失败', error.message);
        this.emit('connection:error', error);
      }
    }, 30000); // 每30秒检查一次
  }

  /**
   * 启动缓冲区处理器
   */
  startBufferProcessor() {
    setInterval(() => {
      this.processBatchBuffer();
    }, this.config.performance.queueBufferingMaxMs || 10);
  }

  /**
   * 处理批量缓冲区
   */
  async processBatchBuffer() {
    if (this.messageBuffer.batch.length === 0) return;

    const batch = this.messageBuffer.batch.splice(0, this.config.performance.batchSize);

    try {
      // 按主题分组
      const messagesByTopic = batch.reduce((acc, item) => {
        if (!acc[item.topic]) {
          acc[item.topic] = [];
        }
        acc[item.topic].push(...item.messages);
        return acc;
      }, {});

      // 发送各主题的消息
      for (const [topic, messages] of Object.entries(messagesByTopic)) {
        await this.producer.send({
          topic,
          messages,
          acks: 1
        });

        this.updateProduceStats(messages);
      }

      logger.debug('批量消息处理完成', {
        batches: batch.length,
        messages: batch.reduce((sum, item) => sum + item.messages.length, 0)
      });

    } catch (error) {
      logger.error('批量消息处理失败', error);
      this.stats.errors++;
    }
  }

  /**
   * 关闭Kafka管理器
   */
  async shutdown() {
    try {
      logger.info('关闭Kafka管理器');

      // 停止所有消费者
      const consumerPromises = Array.from(this.consumers.keys()).map(
        groupId => this.stopConsumer(groupId)
      );
      await Promise.allSettled(consumerPromises);

      // 关闭生产者
      if (this.producer) {
        await this.producer.flush();
        await this.producer.disconnect();
      }

      logger.info('Kafka管理器已关闭');

    } catch (error) {
      logger.error('关闭Kafka管理器失败', error);
    }
  }
}

// 单例模式
const kafkaManager = new KafkaManager();

module.exports = kafkaManager;