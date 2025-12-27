const amqp = require('amqplib');
const Redis = require('redis');
const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

/**
 * 微服务间通信管理器
 * 支持消息队列、事件驱动、RPC调用等通信模式
 */
class ServiceCommunication extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = {
      serviceName: options.serviceName || 'unknown-service',
      serviceId: options.serviceId || `${options.serviceName || 'service'}-${uuidv4()}`,
      redis: {
        host: options.redisHost || 'localhost',
        port: options.redisPort || 6379,
        db: options.redisDb || 0
      },
      rabbitmq: {
        url: options.rabbitmqUrl || 'amqp://localhost:5672',
        exchanges: {
          events: 'service.events',
          commands: 'service.commands',
          responses: 'service.responses'
        },
        queues: {
          direct: `${options.serviceName || 'service'}.commands`,
          events: `${options.serviceName || 'service'}.events`
        }
      },
      rpc: {
        timeout: options.rpcTimeout || 30000,
        retries: options.rpcRetries || 3
      },
      ...options
    };

    this.redis = null;
    this.connection = null;
    this.channel = null;
    this.responseHandlers = new Map();
    this.eventHandlers = new Map();
    this.commandHandlers = new Map();
    this.serviceRegistry = new Map();

    this.setupLogger();
    this.setupHeartbeat();
  }

  /**
   * 设置日志记录器
   */
  setupLogger() {
    this.logger = winston.createLogger({
      level: this.config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: this.config.serviceName },
      transports: [
        new winston.transports.File({
          filename: `logs/${this.config.serviceName}-communication.log`
        }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  /**
   * 初始化通信服务
   */
  async initialize() {
    try {
      await Promise.all([
        this.connectRedis(),
        this.connectRabbitMQ()
      ]);

      await this.registerService();
      await this.setupQueues();

      this.logger.info('Service communication initialized');
      this.emit('initialized');

    } catch (error) {
      this.logger.error('Failed to initialize communication', error);
      throw error;
    }
  }

  /**
   * 连接Redis
   */
  async connectRedis() {
    this.redis = Redis.createClient({
      host: this.config.redis.host,
      port: this.config.redis.port,
      db: this.config.redis.db
    });

    await new Promise((resolve, reject) => {
      this.redis.on('connect', resolve);
      this.redis.on('error', reject);
    });

    // 设置服务健康状态
    await this.setServiceHealth(true);

    this.logger.info('Redis connected for service communication');
  }

  /**
   * 连接RabbitMQ
   */
  async connectRabbitMQ() {
    this.connection = await amqp.connect(this.config.rabbitmq.url);
    this.channel = await this.connection.createChannel();

    // 声明交换机
    await this.channel.assertExchange(
      this.config.rabbitmq.exchanges.events,
      'topic',
      { durable: true }
    );

    await this.channel.assertExchange(
      this.config.rabbitmq.exchanges.commands,
      'direct',
      { durable: true }
    );

    await this.channel.assertExchange(
      this.config.rabbitmq.exchanges.responses,
      'direct',
      { durable: true }
    );

    this.logger.info('RabbitMQ connected for service communication');
  }

  /**
   * 设置队列
   */
  async setupQueues() {
    // 命令队列
    const commandQueue = await this.channel.assertQueue(
      this.config.rabbitmq.queues.direct,
      {
        durable: true,
        arguments: {
          'x-message-ttl': 60000, // 1分钟TTL
          'x-dead-letter-exchange': this.config.rabbitmq.exchanges.commands,
          'x-dead-letter-routing-key': 'dead-letter'
        }
      }
    );

    await this.channel.bindQueue(
      commandQueue.queue,
      this.config.rabbitmq.exchanges.commands,
      this.config.serviceName
    );

    // 事件队列
    const eventQueue = await this.channel.assertQueue(
      this.config.rabbitmq.queues.events,
      {
        durable: true,
        arguments: {
          'x-message-ttl': 30000 // 30秒TTL
        }
      }
    );

    await this.channel.bindQueue(
      eventQueue.queue,
      this.config.rabbitmq.exchanges.events,
      `${this.config.serviceName}.*`
    );

    // 开始消费消息
    await this.channel.consume(commandQueue.queue, this.handleCommand.bind(this));
    await this.channel.consume(eventQueue.queue, this.handleEvent.bind(this));

    this.logger.info('Queues setup completed');
  }

  /**
   * 注册服务
   */
  async registerService() {
    const serviceInfo = {
      id: this.config.serviceId,
      name: this.config.serviceName,
      host: this.config.serviceHost || 'localhost',
      port: this.config.servicePort || 3000,
      version: this.config.serviceVersion || '1.0.0',
      capabilities: this.config.capabilities || [],
      registeredAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString()
    };

    await this.redis.hset(
      'services',
      this.config.serviceId,
      JSON.stringify(serviceInfo)
    );

    await this.redis.expire('services', 300); // 5分钟过期

    this.logger.info(`Service ${this.config.serviceName} registered`);
  }

  /**
   * 设置心跳
   */
  setupHeartbeat() {
    setInterval(async () => {
      try {
        if (this.redis) {
          await this.setServiceHealth(true);
          await this.updateLastHeartbeat();
        }
      } catch (error) {
        this.logger.error('Heartbeat failed', error);
      }
    }, 30000); // 每30秒一次心跳
  }

  /**
   * 设置服务健康状态
   */
  async setServiceHealth(healthy) {
    const healthKey = `service:health:${this.config.serviceId}`;

    if (healthy) {
      await this.redis.set(healthKey, 'healthy', 'EX', 60);
    } else {
      await this.redis.del(healthKey);
    }
  }

  /**
   * 更新最后心跳时间
   */
  async updateLastHeartbeat() {
    const serviceInfo = await this.getServiceInfo();
    if (serviceInfo) {
      serviceInfo.lastHeartbeat = new Date().toISOString();
      await this.redis.hset(
        'services',
        this.config.serviceId,
        JSON.stringify(serviceInfo)
      );
    }
  }

  /**
   * 发布事件
   */
  async publishEvent(eventName, data, options = {}) {
    try {
      const event = {
        id: uuidv4(),
        name: eventName,
        source: this.config.serviceName,
        sourceId: this.config.serviceId,
        data,
        timestamp: new Date().toISOString(),
        correlationId: options.correlationId || uuidv4(),
        ...options
      };

      const routingKey = `${this.config.serviceName}.${eventName}`;

      await this.channel.publish(
        this.config.rabbitmq.exchanges.events,
        routingKey,
        Buffer.from(JSON.stringify(event)),
        {
          persistent: true,
          messageId: event.id,
          timestamp: Date.now(),
          headers: {
            source: this.config.serviceName,
            sourceId: this.config.serviceId,
            correlationId: event.correlationId
          }
        }
      );

      this.logger.debug(`Event published: ${eventName}`, event);
      return event;

    } catch (error) {
      this.logger.error('Failed to publish event', { eventName, error });
      throw error;
    }
  }

  /**
   * 发送命令
   */
  async sendCommand(targetService, commandName, data, options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const command = {
          id: uuidv4(),
          name: commandName,
          source: this.config.serviceName,
          sourceId: this.config.serviceId,
          target: targetService,
          data,
          timestamp: new Date().toISOString(),
          correlationId: options.correlationId || uuidv4(),
          ...options
        };

        // 设置响应处理器
        const timeout = setTimeout(() => {
          this.responseHandlers.delete(command.correlationId);
          reject(new Error(`Command timeout: ${commandName}`));
        }, options.timeout || this.config.rpc.timeout);

        this.responseHandlers.set(command.correlationId, {
          resolve,
          reject,
          timeout,
          timestamp: Date.now()
        });

        // 发送命令
        await this.channel.publish(
          this.config.rabbitmq.exchanges.commands,
          targetService,
          Buffer.from(JSON.stringify(command)),
          {
            persistent: true,
            messageId: command.id,
            timestamp: Date.now(),
            expiration: options.timeout || this.config.rpc.timeout,
            headers: {
              source: this.config.serviceName,
              sourceId: this.config.serviceId,
              correlationId: command.correlationId,
              replyTo: `${this.config.serviceName}.responses`
            }
          }
        );

        this.logger.debug(`Command sent: ${commandName} to ${targetService}`, command);

      } catch (error) {
        this.logger.error('Failed to send command', { targetService, commandName, error });
        reject(error);
      }
    });
  }

  /**
   * 发送响应
   */
  async sendResponse(correlationId, response, isError = false) {
    try {
      const message = {
        correlationId,
        source: this.config.serviceName,
        sourceId: this.config.serviceId,
        response,
        isError,
        timestamp: new Date().toISOString()
      };

      await this.channel.publish(
        this.config.rabbitmq.exchanges.responses,
        `${this.config.serviceName}.responses`,
        Buffer.from(JSON.stringify(message)),
        {
          persistent: false,
          headers: {
            source: this.config.serviceName,
            sourceId: this.config.serviceId,
            correlationId
          }
        }
      );

      this.logger.debug(`Response sent for correlationId: ${correlationId}`);

    } catch (error) {
      this.logger.error('Failed to send response', { correlationId, error });
    }
  }

  /**
   * 处理命令
   */
  async handleCommand(msg) {
    if (!msg) return;

    const command = JSON.parse(msg.content.toString());

    this.logger.debug(`Command received: ${command.name}`, command);

    try {
      const handler = this.commandHandlers.get(command.name);

      if (handler) {
        const result = await handler(command.data, command);
        await this.sendResponse(command.correlationId, result);
      } else {
        this.logger.warn(`No handler for command: ${command.name}`);
        await this.sendResponse(
          command.correlationId,
          { error: `Unknown command: ${command.name}` },
          true
        );
      }

    } catch (error) {
      this.logger.error('Command handling failed', { command: command.name, error });
      await this.sendResponse(
        command.correlationId,
        { error: error.message },
        true
      );
    }

    this.channel.ack(msg);
  }

  /**
   * 处理事件
   */
  async handleEvent(msg) {
    if (!msg) return;

    const event = JSON.parse(msg.content.toString());

    this.logger.debug(`Event received: ${event.name}`, event);

    try {
      const handlers = this.eventHandlers.get(event.name) || [];

      await Promise.all(
        handlers.map(handler =>
          handler(event.data, event).catch(error =>
            this.logger.error('Event handler failed', { event: event.name, error })
          )
        )
      );

    } catch (error) {
      this.logger.error('Event processing failed', { event: event.name, error });
    }

    this.channel.ack(msg);
  }

  /**
   * 处理响应
   */
  async handleResponse(correlationId, response, isError = false) {
    const handler = this.responseHandlers.get(correlationId);

    if (handler) {
      clearTimeout(handler.timeout);
      this.responseHandlers.delete(correlationId);

      if (isError) {
        handler.reject(new Error(response.error || 'Unknown error'));
      } else {
        handler.resolve(response);
      }
    }
  }

  /**
   * 注册命令处理器
   */
  onCommand(commandName, handler) {
    if (!this.commandHandlers.has(commandName)) {
      this.commandHandlers.set(commandName, []);
    }

    this.commandHandlers.set(commandName, handler);
    this.logger.debug(`Command handler registered: ${commandName}`);
  }

  /**
   * 注册事件监听器
   */
  onEvent(eventName, handler) {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }

    this.eventHandlers.get(eventName).push(handler);
    this.logger.debug(`Event handler registered: ${eventName}`);
  }

  /**
   * 取消事件监听器
   */
  offEvent(eventName, handler) {
    const handlers = this.eventHandlers.get(eventName);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * RPC调用
   */
  async callRPC(targetService, method, params, options = {}) {
    return await this.sendCommand(targetService, method, params, options);
  }

  /**
   * 获取服务信息
   */
  async getServiceInfo() {
    const serviceStr = await this.redis.hget('services', this.config.serviceId);
    return serviceStr ? JSON.parse(serviceStr) : null;
  }

  /**
   * 获取所有服务
   */
  async getAllServices() {
    const services = await this.redis.hgetall('services');
    const result = {};

    for (const [id, info] of Object.entries(services)) {
      try {
        result[id] = JSON.parse(info);
      } catch (error) {
        this.logger.warn(`Invalid service info for ${id}`, error);
      }
    }

    return result;
  }

  /**
   * 获取健康服务
   */
  async getHealthyServices() {
    const services = await this.getAllServices();
    const healthyServices = [];

    for (const [id, info] of Object.entries(services)) {
      const healthKey = `service:health:${id}`;
      const health = await this.redis.get(healthKey);

      if (health === 'healthy') {
        healthyServices.push(info);
      }
    }

    return healthyServices;
  }

  /**
   * 广播事件
   */
  async broadcast(eventName, data, options = {}) {
    return await this.publishEvent(eventName, data, {
      ...options,
      broadcast: true
    });
  }

  /**
   * 请求重试
   */
  async retryRequest(targetService, commandName, data, options = {}) {
    const retries = options.retries || this.config.rpc.retries;
    let lastError;

    for (let i = 0; i <= retries; i++) {
      try {
        return await this.sendCommand(targetService, commandName, data, {
          ...options,
          timeout: options.timeout || (this.config.rpc.timeout * (i + 1))
        });
      } catch (error) {
        lastError = error;

        if (i < retries) {
          const delay = Math.pow(2, i) * 1000; // 指数退避
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * 创建分布式锁
   */
  async acquireLock(key, ttl = 30000) {
    const lockKey = `lock:${key}`;
    const lockValue = `${this.config.serviceId}:${Date.now()}`;

    const result = await this.redis.set(
      lockKey,
      lockValue,
      'PX',
      ttl,
      'NX'
    );

    return result === 'OK' ? lockValue : null;
  }

  /**
   * 释放分布式锁
   */
  async releaseLock(key, lockValue) {
    const lockKey = `lock:${key}`;

    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await this.redis.eval(script, 1, lockKey, lockValue);
    return result === 1;
  }

  /**
   * 优雅关闭
   */
  async shutdown() {
    try {
      // 设置服务为不健康
      await this.setServiceHealth(false);

      // 关闭RabbitMQ连接
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }

      // 关闭Redis连接
      if (this.redis) {
        await this.redis.quit();
      }

      // 清理响应处理器
      this.responseHandlers.forEach(handler => {
        clearTimeout(handler.timeout);
        handler.reject(new Error('Service shutting down'));
      });
      this.responseHandlers.clear();

      this.logger.info('Service communication shut down');
      this.emit('shutdown');

    } catch (error) {
      this.logger.error('Error during shutdown', error);
    }
  }
}

module.exports = ServiceCommunication;

// 使用示例
if (require.main === module) {
  const communication = new ServiceCommunication({
    serviceName: process.env.SERVICE_NAME || 'example-service',
    servicePort: process.env.SERVICE_PORT || 3000,
    rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    redisHost: process.env.REDIS_HOST || 'localhost',
    redisPort: process.env.REDIS_PORT || 6379
  });

  // 注册命令处理器
  communication.onCommand('ping', async (data) => {
    return { message: 'pong', timestamp: new Date().toISOString() };
  });

  // 注册事件监听器
  communication.onEvent('user.created', async (data) => {
    console.log('User created event received:', data);
  });

  // 启动服务
  communication.initialize().then(() => {
    console.log('Service communication started');

    // 示例：发送事件
    setTimeout(async () => {
      await communication.publishEvent('service.started', {
        service: communication.config.serviceName,
        timestamp: new Date().toISOString()
      });
    }, 1000);

  }).catch(console.error);

  // 优雅关闭
  process.on('SIGINT', async () => {
    console.log('Shutting down service communication...');
    await communication.shutdown();
    process.exit(0);
  });
}