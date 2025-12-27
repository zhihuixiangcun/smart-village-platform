/**
 * 数据库配置
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/governance_db';

      this.connection = await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        bufferMaxEntries: 0
      });

      logger.info('MongoDB连接成功', {
        host: this.connection.connection.host,
        port: this.connection.connection.port,
        database: this.connection.connection.name
      });

      // 监听连接事件
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB连接错误:', error);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB连接断开');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB重新连接成功');
      });

    } catch (error) {
      logger.error('MongoDB连接失败:', error);
      process.exit(1);
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        logger.info('MongoDB连接已关闭');
      }
    } catch (error) {
      logger.error('关闭MongoDB连接失败:', error);
    }
  }

  getConnection() {
    return this.connection;
  }

  async healthCheck() {
    try {
      const state = mongoose.connection.readyState;
      const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };

      return {
        status: states[state],
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        database: mongoose.connection.name
      };
    } catch (error) {
      logger.error('数据库健康检查失败:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

module.exports = new Database();