/**
 * 优化的数据库连接池配置
 * 支持读写分离、连接池监控、故障转移
 */

const mongoose = require('mongoose');
const EventEmitter = require('events');

class DatabaseManager extends EventEmitter {
  constructor() {
    super();
    this.connections = {
      write: null,
      read: null
    };
    this.config = this.getDatabaseConfig();
    this.stats = {
      write: {
        totalConnections: 0,
        activeConnections: 0,
        readyState: 0,
        lastActivity: null
      },
      read: {
        totalConnections: 0,
        activeConnections: 0,
        readyState: 0,
        lastActivity: null
      }
    };
    this.healthCheckInterval = null;
  }

  getDatabaseConfig() {
    return {
      // 写连接配置（主库）
      write: {
        uri: process.env.MONGO_WRITE_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/smart_village',
        options: {
          maxPoolSize: parseInt(process.env.DB_POOL_MAX_SIZE) || 20,
          minPoolSize: parseInt(process.env.DB_POOL_MIN_SIZE) || 5,
          maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME) || 30000,
          serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT) || 5000,
          socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000,
          connectTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT) || 10000,
          heartbeatFrequencyMS: parseInt(process.env.DB_HEARTBEAT_FREQUENCY) || 10000,
          bufferMaxEntries: 0,
          bufferCommands: false,
          retryWrites: true,
          retryReads: true,
          readPreference: 'primary',
          writeConcern: {
            w: 'majority',
            j: true,
            wtimeout: 5000
          },
          readConcern: {
            level: 'majority'
          },
          appName: 'smart-village-write',
          compressors: ['snappy', 'zstd', 'zlib']
        }
      },

      // 读连接配置（从库）
      read: {
        uri: process.env.MONGO_READ_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/smart_village',
        options: {
          maxPoolSize: parseInt(process.env.DB_READ_POOL_MAX_SIZE) || 15,
          minPoolSize: parseInt(process.env.DB_READ_POOL_MIN_SIZE) || 3,
          maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME) || 30000,
          serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT) || 5000,
          socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000,
          connectTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT) || 10000,
          heartbeatFrequencyMS: parseInt(process.env.DB_HEARTBEAT_FREQUENCY) || 10000,
          bufferMaxEntries: 0,
          bufferCommands: false,
          retryWrites: true,
          retryReads: true,
          readPreference: 'secondaryPreferred',
          writeConcern: {
            w: 1,
            j: true
          },
          readConcern: {
            level: 'available'
          },
          appName: 'smart-village-read',
          compressors: ['snappy', 'zstd', 'zlib']
        }
      }
    };
  }

  /**
   * 初始化数据库连接
   */
  async initialize() {
    try {
      console.log('🔌 开始初始化数据库连接池...');

      // 创建写连接
      await this.createWriteConnection();

      // 创建读连接
      await this.createReadConnection();

      // 设置连接事件监听
      this.setupConnectionListeners();

      // 启动健康检查
      this.startHealthCheck();

      console.log('✅ 数据库连接池初始化完成');
      this.emit('initialized');

    } catch (error) {
      console.error('❌ 数据库连接池初始化失败:', error);
      this.emit('error', error);
      throw error;
    }
  }

  async createWriteConnection() {
    const { uri, options } = this.config.write;

    console.log('📝 创建写连接...');
    this.connections.write = mongoose.createConnection(uri, options);

    // 等待连接就绪
    await this.waitForConnection(this.connections.write, 'write');

    console.log('✅ 写连接创建成功');
  }

  async createReadConnection() {
    const { uri, options } = this.config.read;

    console.log('📖 创建读连接...');
    this.connections.read = mongoose.createConnection(uri, options);

    // 等待连接就绪
    await this.waitForConnection(this.connections.read, 'read');

    console.log('✅ 读连接创建成功');
  }

  async waitForConnection(connection, type) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`${type}连接超时`));
      }, 30000);

      connection.once('connected', () => {
        clearTimeout(timeout);
        resolve();
      });

      connection.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  setupConnectionListeners() {
    this.setupConnectionListener(this.connections.write, 'write');
    this.setupConnectionListener(this.connections.read, 'read');
  }

  setupConnectionListener(connection, type) {
    connection.on('connected', () => {
      console.log(`✅ ${type}数据库连接成功`);
      this.updateConnectionStats(type, { readyState: 1 });
      this.emit('connection:connected', { type });
    });

    connection.on('disconnected', () => {
      console.warn(`⚠️  ${type}数据库连接断开`);
      this.updateConnectionStats(type, { readyState: 0 });
      this.emit('connection:disconnected', { type });
    });

    connection.on('error', (error) => {
      console.error(`❌ ${type}数据库连接错误:`, error);
      this.emit('connection:error', { type, error });
    });

    connection.on('reconnected', () => {
      console.log(`🔄 ${type}数据库重连成功`);
      this.emit('connection:reconnected', { type });
    });

    // 监听连接池事件
    connection.on('open', () => {
      this.updateConnectionStats(type, { lastActivity: new Date() });
    });

    // 监控查询性能
    connection.set('debug', (collectionName, method, query, doc) => {
      // 在开发环境中记录调试信息
      if (process.env.NODE_ENV === 'development') {
        console.log(`DB Debug: ${collectionName}.${method}`, JSON.stringify(query));
      }
    });
  }

  /**
   * 获取写连接
   */
  getWriteConnection() {
    if (!this.connections.write) {
      throw new Error('写连接未初始化');
    }
    this.updateConnectionStats('write', { lastActivity: new Date() });
    return this.connections.write;
  }

  /**
   * 获取读连接
   */
  getReadConnection() {
    if (!this.connections.read) {
      throw new Error('读连接未初始化');
    }
    this.updateConnectionStats('read', { lastActivity: new Date() });
    return this.connections.read;
  }

  /**
   * 智能路由查询到合适的连接
   */
  getConnection(operation) {
    const readOperations = [
      'find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete',
      'countDocuments', 'distinct', 'aggregate'
    ];

    const operationType = operation.toLowerCase();

    if (readOperations.includes(operationType)) {
      return this.getReadConnection();
    }

    return this.getWriteConnection();
  }

  /**
   * 执行查询并自动选择连接
   */
  async executeQuery(model, operation, query, options = {}) {
    const connection = this.getConnection(operation);
    const startTime = Date.now();

    try {
      let result;

      switch (operation) {
        case 'find':
          result = await connection.model(model.modelName).find(query, options.projection, options);
          break;
        case 'findOne':
          result = await connection.model(model.modelName).findOne(query, options.projection, options);
          break;
        case 'aggregate':
          result = await connection.model(model.modelName).aggregate(query, options);
          break;
        case 'countDocuments':
          result = await connection.model(model.modelName).countDocuments(query, options);
          break;
        case 'insertOne':
        case 'insertMany':
        case 'updateOne':
        case 'updateMany':
        case 'deleteOne':
        case 'deleteMany':
          // 写操作使用写连接
          result = await this.getWriteConnection().model(model.modelName)[operation](query, options);
          break;
        default:
          throw new Error(`不支持的操作: ${operation}`);
      }

      const duration = Date.now() - startTime;

      // 记录慢查询
      if (duration > 1000) {
        console.warn('🐌 慢查询检测:', {
          model: model.modelName,
          operation,
          duration: `${duration}ms`,
          query: JSON.stringify(query)
        });
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ 查询失败 (${duration}ms):`, {
        model: model.modelName,
        operation,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 更新连接统计信息
   */
  updateConnectionStats(type, updates) {
    if (this.stats[type]) {
      Object.assign(this.stats[type], updates);
    }
  }

  /**
   * 获取连接池统计信息
   */
  async getConnectionStats() {
    const stats = { ...this.stats };

    // 获取实际的连接池信息
    try {
      if (this.connections.write) {
        stats.write.poolInfo = await this.getPoolInfo(this.connections.write);
      }

      if (this.connections.read) {
        stats.read.poolInfo = await this.getPoolInfo(this.connections.read);
      }
    } catch (error) {
      console.warn('获取连接池信息失败:', error.message);
    }

    return stats;
  }

  async getPoolInfo(connection) {
    try {
      const admin = connection.db.admin();
      const serverStatus = await admin.serverStatus();

      return {
        connections: serverStatus.connections,
        network: serverStatus.network,
        opcounters: serverStatus.opcounters,
        mem: serverStatus.mem,
        extra_info: serverStatus.extra_info
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      connections: {},
      timestamp: new Date()
    };

    try {
      // 检查写连接
      if (this.connections.write && this.connections.write.readyState === 1) {
        await this.connections.write.db.admin().ping();
        health.connections.write = { status: 'healthy', readyState: 1 };
      } else {
        health.connections.write = { status: 'unhealthy', readyState: this.connections.write?.readyState };
        health.status = 'degraded';
      }

      // 检查读连接
      if (this.connections.read && this.connections.read.readyState === 1) {
        await this.connections.read.db.admin().ping();
        health.connections.read = { status: 'healthy', readyState: 1 };
      } else {
        health.connections.read = { status: 'unhealthy', readyState: this.connections.read?.readyState };
        health.status = 'degraded';
      }

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }

  /**
   * 启动健康检查
   */
  startHealthCheck() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.healthCheck();

        if (health.status !== 'healthy') {
          console.warn('⚠️  数据库健康检查异常:', health);
          this.emit('health:warning', health);
        }

        // 更新连接统计
        this.stats.write.readyState = this.connections.write?.readyState || 0;
        this.stats.read.readyState = this.connections.read?.readyState || 0;

      } catch (error) {
        console.error('健康检查失败:', error);
        this.emit('health:error', error);
      }
    }, 30000); // 每30秒检查一次
  }

  /**
   * 停止健康检查
   */
  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * 关闭所有连接
   */
  async close() {
    console.log('🔌 关闭数据库连接池...');

    this.stopHealthCheck();

    const promises = [];

    if (this.connections.write) {
      promises.push(this.connections.write.close());
    }

    if (this.connections.read) {
      promises.push(this.connections.read.close());
    }

    try {
      await Promise.all(promises);
      console.log('✅ 数据库连接池已关闭');
    } catch (error) {
      console.error('❌ 关闭连接池时出错:', error);
    }

    this.connections.write = null;
    this.connections.read = null;
    this.removeAllListeners();
  }

  /**
   * 优雅关闭
   */
  async gracefulShutdown() {
    console.log('🔄 开始优雅关闭数据库连接...');

    try {
      // 停止接受新连接
      this.stopHealthCheck();

      // 等待现有操作完成
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 关闭连接
      await this.close();

      console.log('✅ 数据库连接优雅关闭完成');
    } catch (error) {
      console.error('❌ 优雅关闭失败:', error);
    }
  }
}

// 创建单例实例
const databaseManager = new DatabaseManager();

// 进程退出时优雅关闭
process.on('SIGINT', async () => {
  console.log('\n收到SIGINT信号，开始优雅关闭...');
  await databaseManager.gracefulShutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n收到SIGTERM信号，开始优雅关闭...');
  await databaseManager.gracefulShutdown();
  process.exit(0);
});

module.exports = databaseManager;