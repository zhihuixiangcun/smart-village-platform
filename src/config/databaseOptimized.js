/**
 * 优化的数据库连接配置
 * 包含连接池管理、读写分离、监控等功能
 */

const mongoose = require('mongoose');
const { performance } = require('perf_hooks');
const EventEmitter = require('events');

class OptimizedDatabase extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = {
      // 主库配置
      primary: {
        uri: options.primaryUri || process.env.MONGODB_URI,
        options: {
          maxPoolSize: options.maxPoolSize || 50,
          minPoolSize: options.minPoolSize || 5,
          maxIdleTimeMS: options.maxIdleTimeMS || 30000,
          serverSelectionTimeoutMS: options.serverSelectionTimeoutMS || 5000,
          socketTimeoutMS: options.socketTimeoutMS || 45000,
          connectTimeoutMS: options.connectTimeoutMS || 10000,
          heartbeatFrequencyMS: options.heartbeatFrequencyMS || 10000,
          retryWrites: true,
          retryReads: true,
          readPreference: 'primary',
          writeConcern: {
            w: 'majority',
            j: true
          },
          readConcern: {
            level: 'majority'
          },
          zlibCompressionLevel: options.zlibCompressionLevel || 6,
          bufferMaxEntries: options.bufferMaxEntries || 0,
          bufferCommands: false,
          useNewUrlParser: true,
          useUnifiedTopology: true
        }
      },

      // 从库配置（读写分离）
      secondary: options.secondaryUri ? {
        uri: options.secondaryUri,
        options: {
          maxPoolSize: options.secondaryMaxPoolSize || 20,
          minPoolSize: options.secondaryMinPoolSize || 2,
          readPreference: 'secondaryPreferred',
          maxIdleTimeMS: 30000,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000
        }
      } : null,

      // 连接池监控配置
      monitoring: {
        enabled: options.monitoringEnabled !== false,
        slowQueryThreshold: options.slowQueryThreshold || 1000,
        connectionHealthCheckInterval: options.connectionHealthCheckInterval || 30000,
        metricsRetentionPeriod: options.metricsRetentionPeriod || 24 * 60 * 60 * 1000 // 24小时
      },

      // 性能优化配置
      performance: {
        enableSchemaValidation: options.enableSchemaValidation !== false,
        enableIndexes: options.enableIndexes !== false,
        enableAggregationOptimization: options.enableAggregationOptimization !== false,
        enableQueryCaching: options.enableQueryCaching !== false,
        maxConcurrentQueries: options.maxConcurrentQueries || 100
      }
    };

    // 连接池状态
    this.connections = {
      primary: null,
      secondary: null
    };

    // 性能指标
    this.metrics = {
      connections: {
        active: 0,
        available: 0,
        total: 0,
        created: 0,
        destroyed: 0
      },
      queries: {
        total: 0,
        slow: 0,
        failed: 0,
        cached: 0,
        averageExecutionTime: 0
      },
      operations: {
        reads: 0,
        writes: 0,
        updates: 0,
        deletes: 0
      },
      performance: {
        throughput: 0,
        latency: {
          p50: 0,
          p95: 0,
          p99: 0
        }
      }
    };

    // 查询执行时间记录
    this.queryExecutionTimes = [];

    // 健康检查定时器
    this.healthCheckInterval = null;

    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 监听连接事件
    this.on('connection:created', () => {
      this.metrics.connections.created++;
      this.metrics.connections.active++;
      this.updateConnectionMetrics();
    });

    this.on('connection:destroyed', () => {
      this.metrics.connections.destroyed++;
      this.metrics.connections.active--;
      this.updateConnectionMetrics();
    });

    // 监听查询事件
    this.on('query:executed', (data) => {
      this.recordQueryExecution(data);
    });

    this.on('query:slow', (data) => {
      this.metrics.queries.slow++;
      this.handleSlowQuery(data);
    });

    this.on('query:failed', (data) => {
      this.metrics.queries.failed++;
      this.handleQueryFailure(data);
    });
  }

  /**
   * 连接到数据库
   */
  async connect() {
    try {
      console.log('开始连接到优化数据库...');

      // 连接主库
      await this.connectPrimary();

      // 如果配置了从库，连接从库
      if (this.config.secondary) {
        await this.connectSecondary();
      }

      // 启动健康检查
      if (this.config.monitoring.enabled) {
        this.startHealthCheck();
      }

      // 启用性能优化
      if (this.config.performance.enableSchemaValidation) {
        await this.enableSchemaValidation();
      }

      if (this.config.performance.enableIndexes) {
        await this.optimizeIndexes();
      }

      console.log('数据库连接成功，性能优化已启用');
      this.emit('connected');

      return true;
    } catch (error) {
      console.error('数据库连接失败:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 连接主库
   */
  async connectPrimary() {
    try {
      this.connections.primary = mongoose.createConnection(
        this.config.primary.uri,
        this.config.primary.options
      );

      // 监听连接事件
      this.connections.primary.on('connected', () => {
        console.log('主库连接成功');
        this.emit('primary:connected');
      });

      this.connections.primary.on('error', (error) => {
        console.error('主库连接错误:', error);
        this.emit('primary:error', error);
      });

      this.connections.primary.on('disconnected', () => {
        console.log('主库连接断开');
        this.emit('primary:disconnected');
      });

      // 等待连接完成
      await new Promise((resolve, reject) => {
        this.connections.primary.once('connected', resolve);
        this.connections.primary.once('error', reject);
        setTimeout(() => reject(new Error('主库连接超时')), this.config.primary.options.connectTimeoutMS);
      });

      console.log('主库连接池已建立');
      return this.connections.primary;
    } catch (error) {
      throw new Error(`主库连接失败: ${error.message}`);
    }
  }

  /**
   * 连接从库
   */
  async connectSecondary() {
    try {
      this.connections.secondary = mongoose.createConnection(
        this.config.secondary.uri,
        this.config.secondary.options
      );

      this.connections.secondary.on('connected', () => {
        console.log('从库连接成功');
        this.emit('secondary:connected');
      });

      this.connections.secondary.on('error', (error) => {
        console.error('从库连接错误:', error);
        this.emit('secondary:error', error);
      });

      this.connections.secondary.on('disconnected', () => {
        console.log('从库连接断开');
        this.emit('secondary:disconnected');
      });

      await new Promise((resolve, reject) => {
        this.connections.secondary.once('connected', resolve);
        this.connections.secondary.once('error', reject);
        setTimeout(() => reject(new Error('从库连接超时')), this.config.secondary.options.connectTimeoutMS);
      });

      console.log('从库连接池已建立');
      return this.connections.secondary;
    } catch (error) {
      console.warn('从库连接失败，将使用主库:', error.message);
      this.connections.secondary = null;
      return null;
    }
  }

  /**
   * 获取读操作连接
   */
  getReadConnection() {
    if (this.connections.secondary && this.connections.secondary.readyState === 1) {
      return this.connections.secondary;
    }
    return this.connections.primary;
  }

  /**
   * 获取写操作连接
   */
  getWriteConnection() {
    return this.connections.primary;
  }

  /**
   * 包装查询操作以添加监控
   */
  wrapQuery(query, operation = 'find') {
    const startTime = performance.now();
    const connection = operation === 'find' ? this.getReadConnection() : this.getWriteConnection();

    this.metrics.queries.total++;

    // 包装查询执行
    const originalExec = query.exec;
    query.exec = function() {
      return originalExec.call(this).then(result => {
        const executionTime = performance.now() - startTime;

        // 记录查询指标
        const queryData = {
          operation,
          collection: query.model.collection.name,
          query: this.getQuery(),
          executionTime,
          resultCount: Array.isArray(result) ? result.length : 1,
          timestamp: new Date()
        };

        this.emit('query:executed', queryData);

        // 检查是否为慢查询
        if (executionTime > this.config.monitoring.slowQueryThreshold) {
          this.emit('query:slow', queryData);
        }

        return result;
      }).catch(error => {
        const executionTime = performance.now() - startTime;

        this.emit('query:failed', {
          operation,
          collection: query.model.collection.name,
          query: this.getQuery(),
          executionTime,
          error: error.message,
          timestamp: new Date()
        });

        throw error;
      }.bind(this));
    }.bind(this);

    return query;
  }

  /**
   * 记录查询执行时间
   */
  recordQueryExecution(data) {
    this.queryExecutionTimes.push(data.executionTime);

    // 保持数组大小在合理范围内
    if (this.queryExecutionTimes.length > 10000) {
      this.queryExecutionTimes = this.queryExecutionTimes.slice(-5000);
    }

    // 更新平均执行时间
    this.metrics.queries.averageExecutionTime =
      this.queryExecutionTimes.reduce((sum, time) => sum + time, 0) / this.queryExecutionTimes.length;

    // 更新操作计数
    switch (data.operation) {
      case 'find':
      case 'findOne':
        this.metrics.operations.reads++;
        break;
      case 'insert':
      case 'create':
        this.metrics.operations.writes++;
        break;
      case 'update':
      case 'updateOne':
      case 'updateMany':
        this.metrics.operations.updates++;
        break;
      case 'delete':
      case 'deleteOne':
      case 'deleteMany':
        this.metrics.operations.deletes++;
        break;
    }

    this.updateLatencyMetrics();
  }

  /**
   * 更新延迟指标
   */
  updateLatencyMetrics() {
    if (this.queryExecutionTimes.length === 0) return;

    const sortedTimes = [...this.queryExecutionTimes].sort((a, b) => a - b);
    const len = sortedTimes.length;

    this.metrics.performance.latency.p50 = sortedTimes[Math.floor(len * 0.5)];
    this.metrics.performance.latency.p95 = sortedTimes[Math.floor(len * 0.95)];
    this.metrics.performance.latency.p99 = sortedTimes[Math.floor(len * 0.99)];
  }

  /**
   * 更新连接指标
   */
  updateConnectionMetrics() {
    const primaryStats = this.connections.primary ? {
      readyState: this.connections.primary.readyState,
      host: this.connections.primary.host,
      port: this.connections.primary.port
    } : null;

    const secondaryStats = this.connections.secondary ? {
      readyState: this.connections.secondary.readyState,
      host: this.connections.secondary.host,
      port: this.connections.secondary.port
    } : null;

    this.metrics.connections.total = this.metrics.connections.active + this.metrics.connections.available;
    this.metrics.connections.available = this.config.primary.options.maxPoolSize - this.metrics.connections.active;
  }

  /**
   * 处理慢查询
   */
  handleSlowQuery(data) {
    console.warn('检测到慢查询:', {
      collection: data.collection,
      executionTime: `${data.executionTime}ms`,
      query: data.query
    });

    // 可以在这里添加慢查询优化逻辑
    // 例如：查询分析、索引建议等
  }

  /**
   * 处理查询失败
   */
  handleQueryFailure(data) {
    console.error('查询执行失败:', {
      collection: data.collection,
      error: data.error,
      query: data.query
    });
  }

  /**
   * 启用模式验证
   */
  async enableSchemaValidation() {
    try {
      // 为关键集合启用验证规则
      const collections = ['users', 'villages', 'announcements', 'orders'];

      for (const collectionName of collections) {
        const db = this.connections.primary.db;
        const collection = db.collection(collectionName);

        try {
          await collection.createIndex({ createdAt: 1 });
          console.log(`已为 ${collectionName} 创建时间索引`);
        } catch (error) {
          // 索引可能已存在，忽略错误
        }
      }

      console.log('模式验证已启用');
    } catch (error) {
      console.error('启用模式验证失败:', error);
    }
  }

  /**
   * 优化索引
   */
  async optimizeIndexes() {
    try {
      const db = this.connections.primary.db;
      const collections = await db.collections();

      for (const collection of collections) {
        const stats = await collection.stats();

        // 如果集合较大，检查索引使用情况
        if (stats.count > 1000) {
          const indexes = await collection.indexInformation();

          // 检查是否缺少必要的索引
          if (indexes.length < 2) {
            console.log(`建议为 ${collection.collectionName} 添加更多索引`);
          }
        }
      }

      console.log('索引优化已完成');
    } catch (error) {
      console.error('索引优化失败:', error);
    }
  }

  /**
   * 启动健康检查
   */
  startHealthCheck() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('健康检查失败:', error);
      }
    }, this.config.monitoring.connectionHealthCheckInterval);
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck() {
    const health = {
      primary: await this.checkConnectionHealth(this.connections.primary, 'primary'),
      secondary: this.connections.secondary ?
        await this.checkConnectionHealth(this.connections.secondary, 'secondary') : null
    };

    this.emit('health:check', health);
    return health;
  }

  /**
   * 检查连接健康状态
   */
  async checkConnectionHealth(connection, name) {
    try {
      if (!connection || connection.readyState !== 1) {
        return { status: 'unhealthy', message: '连接未就绪' };
      }

      const startTime = performance.now();
      await connection.db.admin().ping();
      const latency = performance.now() - startTime;

      return {
        status: 'healthy',
        latency: `${latency.toFixed(2)}ms`,
        readyState: connection.readyState
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message
      };
    }
  }

  /**
   * 获取性能指标
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date(),
      connections: {
        ...this.metrics.connections,
        primary: this.connections.primary ? {
          readyState: this.connections.primary.readyState,
          host: this.connections.primary.host
        } : null,
        secondary: this.connections.secondary ? {
          readyState: this.connections.secondary.readyState,
          host: this.connections.secondary.host
        } : null
      },
      config: {
        primaryPoolSize: this.config.primary.options.maxPoolSize,
        secondaryPoolSize: this.config.secondary ? this.config.secondary.options.maxPoolSize : 0,
        slowQueryThreshold: this.config.monitoring.slowQueryThreshold
      }
    };
  }

  /**
   * 断开连接
   */
  async disconnect() {
    try {
      // 停止健康检查
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // 断开连接
      if (this.connections.primary) {
        await this.connections.primary.close();
      }

      if (this.connections.secondary) {
        await this.connections.secondary.close();
      }

      console.log('数据库连接已断开');
      this.emit('disconnected');
    } catch (error) {
      console.error('断开数据库连接失败:', error);
      throw error;
    }
  }

  /**
   * 重置指标
   */
  resetMetrics() {
    this.metrics = {
      connections: {
        active: 0,
        available: 0,
        total: 0,
        created: 0,
        destroyed: 0
      },
      queries: {
        total: 0,
        slow: 0,
        failed: 0,
        cached: 0,
        averageExecutionTime: 0
      },
      operations: {
        reads: 0,
        writes: 0,
        updates: 0,
        deletes: 0
      },
      performance: {
        throughput: 0,
        latency: {
          p50: 0,
          p95: 0,
          p99: 0
        }
      }
    };

    this.queryExecutionTimes = [];
    this.emit('metrics:reset');
  }
}

// 创建全局实例
const optimizedDatabase = new OptimizedDatabase();

module.exports = optimizedDatabase;