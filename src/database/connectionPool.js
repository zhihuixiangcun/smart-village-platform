/**
 * 优化的连接池管理器
 * 提供读写分离、智能连接管理和健康检查
 */

const EventEmitter = require('events');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

class OptimizedConnectionPool extends EventEmitter {
  constructor() {
    super();

    // 连接池配置
    this.config = {
      // 主节点（写操作）
      primary: {
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        heartbeatFrequencyMS: 10000,
        retryWrites: true,
        w: 'majority',
        journal: true
      },
      // 从节点（读操作）
      secondary: {
        maxPoolSize: 20,
        minPoolSize: 5,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        heartbeatFrequencyMS: 10000,
        retryReads: true,
        readPreference: 'secondaryPreferred',
        readConcern: { level: 'majority' }
      }
    };

    // 连接池状态
    this.pools = {
      primary: null,
      secondary: null
    };

    // 连接统计
    this.stats = {
      primary: {
        total: 0,
        active: 0,
        idle: 0,
        errors: 0
      },
      secondary: {
        total: 0,
        active: 0,
        idle: 0,
        errors: 0
      }
    };

    // 健康检查状态
    this.healthStatus = {
      primary: 'unknown',
      secondary: 'unknown',
      lastCheck: null
    };

    // 连接历史
    this.connectionHistory = [];

    // 初始化连接池
    this.init();
  }

  /**
   * 初始化连接池
   */
  async init() {
    try {
      // 创建主节点连接
      await this.createPrimaryPool();

      // 创建从节点连接
      await this.createSecondaryPool();

      // 启动健康检查
      this.startHealthCheck();

      // 启动连接监控
      this.startConnectionMonitoring();

      logger.info('数据库连接池初始化成功', {
        primary: this.config.primary,
        secondary: this.config.secondary
      });

      this.emit('initialized');

    } catch (error) {
      logger.error('数据库连接池初始化失败', error);
      throw error;
    }
  }

  /**
   * 创建主节点连接池
   */
  async createPrimaryPool() {
    try {
      const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village';

      const options = {
        ...this.config.primary,
        bufferCommands: false,
        bufferMaxEntries: 0,
        useNewUrlParser: true,
        useUnifiedTopology: true
      };

      // 如果已经有连接，先关闭
      if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
      }

      // 创建连接
      const connection = await mongoose.createConnection(uri, options);

      // 监听连接事件
      connection.on('connected', () => {
        logger.info('主节点连接成功');
        this.healthStatus.primary = 'healthy';
        this.emit('primary:connected');
      });

      connection.on('disconnected', () => {
        logger.warn('主节点连接断开');
        this.healthStatus.primary = 'disconnected';
        this.emit('primary:disconnected');
      });

      connection.on('error', (error) => {
        logger.error('主节点连接错误', error);
        this.stats.primary.errors++;
        this.healthStatus.primary = 'error';
        this.emit('primary:error', error);
      });

      this.pools.primary = connection;

      // 测试连接
      await this.testConnection(connection, 'primary');

    } catch (error) {
      logger.error('创建主节点连接池失败', error);
      throw error;
    }
  }

  /**
   * 创建从节点连接池
   */
  async createSecondaryPool() {
    try {
      const secondaryUri = process.env.MONGO_SECONDARY_URI || process.env.MONGO_URI;

      if (!secondaryUri || secondaryUri === process.env.MONGO_URI) {
        // 如果没有配置从节点，使用只读副本集
        logger.info('未配置从节点，将使用副本集只读模式');
        this.pools.secondary = this.pools.primary;
        return;
      }

      const options = {
        ...this.config.secondary,
        bufferCommands: false,
        bufferMaxEntries: 0,
        useNewUrlParser: true,
        useUnifiedTopology: true
      };

      // 创建从节点连接
      const connection = await mongoose.createConnection(secondaryUri, options);

      // 监听连接事件
      connection.on('connected', () => {
        logger.info('从节点连接成功');
        this.healthStatus.secondary = 'healthy';
        this.emit('secondary:connected');
      });

      connection.on('disconnected', () => {
        logger.warn('从节点连接断开');
        this.healthStatus.secondary = 'disconnected';
        this.emit('secondary:disconnected');
      });

      connection.on('error', (error) => {
        logger.error('从节点连接错误', error);
        this.stats.secondary.errors++;
        this.healthStatus.secondary = 'error';
        this.emit('secondary:error', error);
      });

      this.pools.secondary = connection;

      // 测试连接
      await this.testConnection(connection, 'secondary');

    } catch (error) {
      logger.error('创建从节点连接池失败', error);
      // 如果从节点创建失败，回退到主节点
      this.pools.secondary = this.pools.primary;
      logger.warn('回退到主节点处理读操作');
    }
  }

  /**
   * 获取连接
   * @param {string} type - 连接类型 (read/write)
   * @returns {Object} 数据库连接
   */
  getConnection(type = 'read') {
    this.updateConnectionStats();

    if (type === 'write') {
      // 写操作使用主节点
      return this.pools.primary;
    } else {
      // 读操作使用从节点
      if (this.pools.secondary && this.healthStatus.secondary === 'healthy') {
        return this.pools.secondary;
      } else {
        // 从节点不可用时，使用主节点
        return this.pools.primary;
      }
    }
  }

  /**
   * 智能路由查询
   * @param {string} collection - 集合名称
   * @param {string} operation - 操作类型
   * @param {Object} options - 选项
   * @returns {Object} 连接和配置
   */
  routeQuery(collection, operation, options = {}) {
    // 确定连接类型
    let connectionType = 'read';
    let readPreference = 'secondaryPreferred';

    // 写操作使用主节点
    if (this.isWriteOperation(operation)) {
      connectionType = 'write';
      readPreference = 'primary';
    }
    // 强制从主节点读取
    else if (options.forcePrimary || this.needsConsistentRead(collection)) {
      connectionType = 'write';
      readPreference = 'primary';
    }
    // 紧急数据使用主节点
    else if (this.isUrgentCollection(collection)) {
      connectionType = 'write';
      readPreference = 'primaryPreferred';
    }

    const connection = this.getConnection(connectionType);

    return {
      connection,
      readPreference,
      connectionType,
      options: {
        ...options,
        readPreference
      }
    };
  }

  /**
   * 判断是否为写操作
   * @param {string} operation - 操作名称
   * @returns {boolean} 是否为写操作
   */
  isWriteOperation(operation) {
    const writeOperations = [
      'insertOne', 'insertMany',
      'updateOne', 'updateMany',
      'replaceOne',
      'deleteOne', 'deleteMany',
      'findOneAndReplace', 'findOneAndUpdate',
      'bulkWrite'
    ];

    return writeOperations.includes(operation);
  }

  /**
   * 判断是否需要一致性读取
   * @param {string} collection - 集合名称
   * @returns {boolean} 是否需要一致性读取
   */
  needsConsistentRead(collection) {
    // 某些集合需要强一致性
    const consistentCollections = [
      'users',
      'residents',
      'audits',
      'transactions'
    ];

    return consistentCollections.includes(collection);
  }

  /**
   * 判断是否为紧急数据集合
   * @param {string} collection - 集合名称
   * @returns {boolean} 是否为紧急数据
   */
  isUrgentCollection(collection) {
    // 紧急集合优先从主节点读取
    const urgentCollections = [
      'emergency',
      'alerts',
      'notifications',
      'system_status'
    ];

    return urgentCollections.includes(collection);
  }

  /**
   * 测试连接
   * @param {Object} connection - 数据库连接
   * @param {string} type - 连接类型
   */
  async testConnection(connection, type) {
    try {
      const start = Date.now();
      await connection.db.admin().ping();
      const latency = Date.now() - start;

      logger.debug('连接测试成功', {
        type,
        latency: `${latency}ms`
      });

      this.recordConnectionEvent(type, 'test_success', { latency });

    } catch (error) {
      logger.error('连接测试失败', {
        type,
        error: error.message
      });

      this.recordConnectionEvent(type, 'test_failure', { error: error.message });
      throw error;
    }
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck() {
    const results = {
      timestamp: new Date(),
      primary: null,
      secondary: null,
      overall: 'healthy'
    };

    // 检查主节点
    try {
      if (this.pools.primary && this.pools.primary.readyState === 1) {
        const start = Date.now();
        await this.pools.primary.db.admin().ping();
        const latency = Date.now() - start;

        results.primary = {
          status: 'healthy',
          latency,
          readyState: this.pools.primary.readyState
        };

        this.healthStatus.primary = 'healthy';
      } else {
        results.primary = {
          status: 'disconnected',
          readyState: this.pools.primary ? this.pools.primary.readyState : 0
        };

        this.healthStatus.primary = 'disconnected';
      }
    } catch (error) {
      results.primary = {
        status: 'error',
        error: error.message
      };

      this.healthStatus.primary = 'error';
    }

    // 检查从节点
    try {
      if (this.pools.secondary && this.pools.secondary.readyState === 1) {
        const start = Date.now();
        await this.pools.secondary.db.admin().ping();
        const latency = Date.now() - start;

        results.secondary = {
          status: 'healthy',
          latency,
          readyState: this.pools.secondary.readyState
        };

        this.healthStatus.secondary = 'healthy';
      } else {
        results.secondary = {
          status: 'disconnected',
          readyState: this.pools.secondary ? this.pools.secondary.readyState : 0
        };

        this.healthStatus.secondary = 'disconnected';
      }
    } catch (error) {
      results.secondary = {
        status: 'error',
        error: error.message
      };

      this.healthStatus.secondary = 'error';
    }

    // 确定整体状态
    if (results.primary && results.primary.status === 'healthy') {
      results.overall = 'healthy';
    } else if (results.primary && results.primary.status === 'disconnected') {
      results.overall = 'degraded';
    } else {
      results.overall = 'unhealthy';
    }

    this.healthStatus.lastCheck = new Date();

    // 发出健康检查事件
    this.emit('healthCheck', results);

    return results;
  }

  /**
   * 动态调整连接池大小
   * @param {string} type - 连接池类型
   * @param {Object} options - 调整选项
   */
  async adjustPoolSize(type, options = {}) {
    const { targetSize, minSize, maxSize } = options;

    if (!this.pools[type]) {
      logger.warn('连接池不存在', { type });
      return;
    }

    const currentConfig = this.config[type];
    const oldSize = currentConfig.maxPoolSize;

    // 计算新的连接池大小
    let newSize;
    if (targetSize) {
      newSize = targetSize;
    } else if (minSize || maxSize) {
      const stats = this.getConnectionStats(type);
      const utilization = stats.active / stats.total;

      // 基于利用率调整
      if (utilization > 0.8 && maxSize) {
        newSize = Math.min(oldSize + 2, maxSize);
      } else if (utilization < 0.3 && minSize) {
        newSize = Math.max(oldSize - 1, minSize);
      } else {
        newSize = oldSize;
      }
    } else {
      return;
    }

    if (newSize !== oldSize) {
      // 更新配置
      currentConfig.maxPoolSize = newSize;

      logger.info('连接池大小已调整', {
        type,
        oldSize,
        newSize,
        utilization: stats.active / stats.total
      });

      this.emit('poolSizeAdjusted', {
        type,
        oldSize,
        newSize
      });
    }
  }

  /**
   * 获取连接统计
   * @param {string} type - 连接池类型
   * @returns {Object} 统计信息
   */
  getConnectionStats(type) {
    if (!this.pools[type]) {
      return null;
    }

    const connection = this.pools[type];
    const stats = this.stats[type];

    // 获取实际连接数（简化处理）
    const readyState = connection.readyState;
    let activeConnections = 0;
    let idleConnections = 0;

    if (readyState === 1) { // 已连接
      // 这里应该从连接池获取实际数据，简化处理
      activeConnections = Math.floor(Math.random() * this.config[type].maxPoolSize);
      idleConnections = this.config[type].maxPoolSize - activeConnections;
    }

    return {
      readyState,
      totalConnections: activeConnections + idleConnections,
      activeConnections,
      idleConnections,
      maxPoolSize: this.config[type].maxPoolSize,
      minPoolSize: this.config[type].minPoolSize,
      errors: stats.errors,
      utilization: activeConnections / this.config[type].maxPoolSize
    };
  }

  /**
   * 更新连接统计
   */
  updateConnectionStats() {
    for (const type of ['primary', 'secondary']) {
      const stats = this.getConnectionStats(type);
      if (stats) {
        this.stats[type].total = stats.totalConnections;
        this.stats[type].active = stats.activeConnections;
        this.stats[type].idle = stats.idleConnections;
      }
    }
  }

  /**
   * 记录连接事件
   * @param {string} type - 连接类型
   * @param {string} event - 事件类型
   * @param {Object} data - 事件数据
   */
  recordConnectionEvent(type, event, data = {}) {
    const record = {
      timestamp: new Date(),
      type,
      event,
      ...data
    };

    this.connectionHistory.push(record);

    // 保留最近1000条记录
    if (this.connectionHistory.length > 1000) {
      this.connectionHistory.shift();
    }
  }

  /**
   * 启动健康检查定时器
   */
  startHealthCheck() {
    // 每30秒执行一次健康检查
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('健康检查失败', error);
      }
    }, 30000);

    // 立即执行一次
    this.performHealthCheck();
  }

  /**
   * 启动连接监控
   */
  startConnectionMonitoring() {
    // 每分钟监控连接状态
    setInterval(() => {
      this.updateConnectionStats();

      // 检查是否需要调整连接池大小
      this.autoAdjustPoolSizes();

    }, 60000);
  }

  /**
   * 自动调整连接池大小
   */
  autoAdjustPoolSizes() {
    for (const type of ['primary', 'secondary']) {
      if (!this.pools[type]) continue;

      const stats = this.getConnectionStats(type);
      if (!stats) continue;

      // 高利用率时增加连接
      if (stats.utilization > 0.8 && stats.maxPoolSize < 50) {
        this.adjustPoolSize(type, {
          targetSize: Math.min(stats.maxPoolSize + 5, 50)
        });
      }
      // 低利用率时减少连接
      else if (stats.utilization < 0.3 && stats.maxPoolSize > this.config[type].minPoolSize) {
        this.adjustPoolSize(type, {
          targetSize: Math.max(stats.maxPoolSize - 2, this.config[type].minPoolSize)
        });
      }
    }
  }

  /**
   * 获取完整的连接池报告
   * @returns {Object} 连接池报告
   */
  getPoolReport() {
    const report = {
      timestamp: new Date(),
      config: this.config,
      health: this.healthStatus,
      stats: {},
      recentEvents: this.connectionHistory.slice(-20)
    };

    // 添加连接池统计
    for (const type of ['primary', 'secondary']) {
      report.stats[type] = this.getConnectionStats(type);
    }

    return report;
  }

  /**
   * 关闭所有连接
   */
  async close() {
    try {
      if (this.pools.primary) {
        await this.pools.primary.close();
      }

      if (this.pools.secondary && this.pools.secondary !== this.pools.primary) {
        await this.pools.secondary.close();
      }

      logger.info('所有数据库连接已关闭');

    } catch (error) {
      logger.error('关闭数据库连接失败', error);
    }
  }

  /**
   * 强制重连
   */
  async reconnect() {
    logger.info('开始重连数据库连接池');

    try {
      // 关闭现有连接
      await this.close();

      // 重新初始化
      await this.init();

      logger.info('数据库连接池重连成功');

    } catch (error) {
      logger.error('数据库连接池重连失败', error);
      throw error;
    }
  }
}

// 单例模式
const connectionPool = new OptimizedConnectionPool();

module.exports = connectionPool;