/**
 * MongoDB数据库配置
 * 基础数据库连接配置
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// 数据库配置
const config = {
  // 主数据库
  uri: process.env.MONGO_URI || 'mongodb://localhost:27017/smart_village',

  // 连接选项
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // 连接池配置
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,

    // 其他选项
    bufferCommands: false,
    bufferMaxEntries: 0,

    // 临时禁用自动索引创建以加快启动速度
    // 生产环境中应该手动创建索引或在首次启动时启用
    autoIndex: false,
  }
};

/**
 * 数据库连接管理
 */
class Database {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  /**
   * 连接数据库
   */
  async connect() {
    try {
      // mongoose.set('debug', process.env.NODE_ENV === 'development');

      // 监听连接事件
      mongoose.connection.on('connected', () => {
        logger.info('MongoDB连接成功');
        this.isConnected = true;
      });

      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB连接错误:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB连接断开');
        this.isConnected = false;
      });

      // 应用关闭时断开数据库连接
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

      // 连接数据库
      await mongoose.connect(config.uri, config.options);
      this.connection = mongoose.connection;

      logger.info('数据库初始化完成');

    } catch (error) {
      logger.error('数据库连接失败:', error);
      throw error;
    }
  }

  /**
   * 断开数据库连接
   */
  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        logger.info('数据库连接已关闭');
        this.isConnected = false;
      }
    } catch (error) {
      logger.error('关闭数据库连接失败:', error);
      throw error;
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const status = this.getConnectionStatus();

      if (status.isConnected) {
        // 执行简单查询测试连接
        await mongoose.connection.db.admin().ping();
        return {
          status: 'healthy',
          ...status,
          responseTime: Date.now()
        };
      } else {
        return {
          status: 'unhealthy',
          ...status,
          error: '数据库未连接'
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

module.exports = new Database();