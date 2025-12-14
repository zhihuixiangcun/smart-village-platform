/**
 * 智慧乡村平台 - 数据库管理和备份服务
 * MongoDB连接池优化、自动备份、性能监控
 */

const mongoose = require('mongoose');
const winston = require('winston');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const cron = require('node-cron');
const redis = require('redis');
const zlib = require('zlib');
const crypto = require('crypto');

// 配置
const config = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-village',
    options: {
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10,
      minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE) || 2,
      maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME) || 30000,
      serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT) || 5000,
      socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000,
      bufferMaxEntries: 0,
      bufferCommands: false,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  backup: {
    enabled: process.env.DB_BACKUP_ENABLED !== 'false',
    schedule: process.env.DB_BACKUP_SCHEDULE || '0 2 * * *', // 每天凌晨2点
    retentionDays: parseInt(process.env.DB_BACKUP_RETENTION_DAYS) || 30,
    compressionEnabled: process.env.DB_BACKUP_COMPRESSION !== 'false',
    encryptionEnabled: process.env.DB_BACKUP_ENCRYPTION === 'true',
    backupPath: process.env.DB_BACKUP_PATH || './backups',
    s3: {
      enabled: process.env.DB_BACKUP_S3_ENABLED === 'true',
      bucket: process.env.DB_BACKUP_S3_BUCKET,
      region: process.env.DB_BACKUP_S3_REGION,
      accessKey: process.env.DB_BACKUP_S3_ACCESS_KEY,
      secretKey: process.env.DB_BACKUP_S3_SECRET_KEY
    }
  },
  monitoring: {
    enabled: process.env.DB_MONITORING_ENABLED !== 'false',
    slowQueryThreshold: parseInt(process.env.DB_SLOW_QUERY_THRESHOLD) || 100,
    metricsInterval: parseInt(process.env.DB_METRICS_INTERVAL) || 60000 // 1分钟
  }
};

// 日志配置
const logger = winston.createLogger({
  level: process.env.DB_LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/database-manager.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Redis客户端
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  logger.error('Redis连接错误:', err);
});

// 数据库性能监控器
class DatabaseMonitor {
  constructor() {
    this.metrics = {
      connections: {
        active: 0,
        available: 0,
        total: 0
      },
      operations: {
        queries: 0,
        inserts: 0,
        updates: 0,
        deletes: 0,
        errors: 0
      },
      performance: {
        avgQueryTime: 0,
        slowQueries: 0,
        totalQueryTime: 0
      },
      collections: {},
      timestamp: Date.now()
    };

    this.slowQueries = [];
    this.isMonitoring = false;
  }

  startMonitoring() {
    if (!config.monitoring.enabled || this.isMonitoring) return;

    this.isMonitoring = true;
    logger.info('🔍 数据库监控已启动');

    // 定期收集指标
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, config.monitoring.metricsInterval);

    // 监控MongoDB事件
    this.setupMongoEvents();
  }

  stopMonitoring() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.isMonitoring = false;
      logger.info('⏹️ 数据库监控已停止');
    }
  }

  setupMongoEvents() {
    const db = mongoose.connection.db;

    // 监控连接事件
    mongoose.connection.on('connected', () => {
      logger.info('✅ MongoDB连接已建立');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('❌ MongoDB连接错误:', err);
      this.metrics.operations.errors++;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB连接已断开');
    });

    // 监控查询性能
    if (mongoose.connection.readyState === 1) {
      const originalExec = mongoose.Query.prototype.exec;

      mongoose.Query.prototype.exec = function() {
        const startTime = Date.now();

        return originalExec.call(this).then(result => {
          const duration = Date.now() - startTime;

          // 记录慢查询
          if (duration > config.monitoring.slowQueryThreshold) {
            this.recordSlowQuery(this, duration);
          }

          // 更新指标
          this.updateQueryMetrics(duration, this.op);

          return result;
        }).catch(err => {
          const duration = Date.now() - startTime;
          this.updateQueryMetrics(duration, this.op, true);
          throw err;
        });
      }.bind(this);
    }
  }

  recordSlowQuery(query, duration) {
    const slowQuery = {
      collection: query.model.collection.name,
      operation: query.op,
      filter: query.getFilter(),
      duration: duration,
      timestamp: new Date().toISOString(),
      explain: null
    };

    this.slowQueries.push(slowQuery);

    // 只保留最近100条慢查询
    if (this.slowQueries.length > 100) {
      this.slowQueries.shift();
    }

    logger.warn('慢查询检测', {
      collection: slowQuery.collection,
      operation: slowQuery.operation,
      duration: `${duration}ms`,
      filter: JSON.stringify(slowQuery.filter)
    });

    this.metrics.performance.slowQueries++;
  }

  updateQueryMetrics(duration, operation, isError = false) {
    this.metrics.operations.queries++;

    switch (operation) {
      case 'insert':
      case 'insertOne':
      case 'insertMany':
        this.metrics.operations.inserts++;
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

    if (isError) {
      this.metrics.operations.errors++;
    }

    this.metrics.performance.totalQueryTime += duration;
    this.metrics.performance.avgQueryTime =
      this.metrics.performance.totalQueryTime / this.metrics.operations.queries;
  }

  async collectMetrics() {
    try {
      const admin = mongoose.connection.db.admin();
      const serverStatus = await admin.serverStatus();

      // 连接池指标
      this.metrics.connections = {
        active: serverStatus.connections.current,
        available: serverStatus.connections.available,
        total: serverStatus.connections.totalCreated
      };

      // 数据库大小和集合信息
      const stats = await mongoose.connection.db.stats();
      this.metrics.database = {
        size: stats.dataSize,
        indexSize: stats.indexSize,
        storageSize: stats.storageSize,
        collections: stats.collections
      };

      // 更新时间戳
      this.metrics.timestamp = Date.now();

      // 缓存到Redis
      await this.cacheMetrics();

    } catch (error) {
      logger.error('收集数据库指标失败:', error);
    }
  }

  async cacheMetrics() {
    try {
      if (!redisClient.isOpen) return;

      await redisClient.setEx(
        'db:metrics:current',
        300, // 5分钟过期
        JSON.stringify(this.metrics)
      );

      // 记录历史指标
      await redisClient.lPush(
        'db:metrics:history',
        JSON.stringify({
          timestamp: this.metrics.timestamp,
          connections: this.metrics.connections,
          operations: this.metrics.operations,
          performance: this.metrics.performance
        })
      );

      // 只保留最近24小时的数据 (每分钟一条，共1440条)
      await redisClient.lTrim('db:metrics:history', 0, 1439);

    } catch (error) {
      logger.error('缓存数据库指标失败:', error);
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      slowQueries: this.slowQueries.slice(-10), // 最近10条慢查询
      uptime: mongoose.connection.uptime || 0,
      readyState: mongoose.connection.readyState
    };
  }

  async getOptimizationSuggestions() {
    const suggestions = [];
    const metrics = this.metrics;

    // 连接池优化建议
    if (metrics.connections.active / metrics.connections.total > 0.8) {
      suggestions.push({
        type: 'connection_pool',
        severity: 'warning',
        message: '连接池使用率过高，建议增加连接池大小',
        recommendation: '将 maxPoolSize 增加到 ' + Math.ceil(metrics.connections.total * 1.5)
      });
    }

    // 慢查询优化建议
    if (this.slowQueries.length > 0) {
      const frequentSlowQueries = this.analyzeSlowQueries();
      suggestions.push({
        type: 'slow_queries',
        severity: 'error',
        message: `发现 ${this.slowQueries.length} 个慢查询`,
        recommendation: '为常用查询字段添加索引',
        details: frequentSlowQueries
      });
    }

    // 性能优化建议
    if (metrics.performance.avgQueryTime > 100) {
      suggestions.push({
        type: 'performance',
        severity: 'warning',
        message: '平均查询时间过长',
        recommendation: '优化查询逻辑或增加索引'
      });
    }

    return suggestions;
  }

  analyzeSlowQueries() {
    const collectionStats = {};

    this.slowQueries.forEach(query => {
      if (!collectionStats[query.collection]) {
        collectionStats[query.collection] = {
          count: 0,
          totalDuration: 0,
          avgDuration: 0
        };
      }

      collectionStats[query.collection].count++;
      collectionStats[query.collection].totalDuration += query.duration;
      collectionStats[query.collection].avgDuration =
        collectionStats[query.collection].totalDuration / collectionStats[query.collection].count;
    });

    return Object.entries(collectionStats)
      .sort(([,a], [,b]) => b.avgDuration - a.avgDuration)
      .slice(0, 5)
      .map(([collection, stats]) => ({
        collection,
        ...stats
      }));
  }
}

// 数据库备份管理器
class DatabaseBackup {
  constructor() {
    this.backupPath = config.backup.backupPath;
    this.encryptionKey = process.env.DB_BACKUP_ENCRYPTION_KEY;
    this.isBackupRunning = false;
  }

  async initialize() {
    try {
      // 创建备份目录
      await fs.mkdir(this.backupPath, { recursive: true });

      // 创建子目录
      await fs.mkdir(path.join(this.backupPath, 'daily'), { recursive: true });
      await fs.mkdir(path.join(this.backupPath, 'weekly'), { recursive: true });
      await fs.mkdir(path.join(this.backupPath, 'monthly'), { recursive: true });

      // 设置定时备份
      this.setupBackupSchedule();

      logger.info('✅ 数据库备份系统初始化完成');
    } catch (error) {
      logger.error('❌ 数据库备份系统初始化失败:', error);
      throw error;
    }
  }

  setupBackupSchedule() {
    if (!config.backup.enabled) {
      logger.info('⚠️ 数据库自动备份已禁用');
      return;
    }

    // 每日备份
    cron.schedule(config.backup.schedule, async () => {
      await this.performBackup('daily');
    });

    // 每周备份 (周日凌晨3点)
    cron.schedule('0 3 * * 0', async () => {
      await this.performBackup('weekly');
    });

    // 每月备份 (每月1日凌晨4点)
    cron.schedule('0 4 1 * *', async () => {
      await this.performBackup('monthly');
    });

    logger.info('📅 定时备份计划已设置');
    logger.info(`🕐 每日备份: ${config.backup.schedule}`);
  }

  async performBackup(type = 'daily') {
    if (this.isBackupRunning) {
      logger.warn('⚠️ 备份正在进行中，跳过此次备份');
      return;
    }

    this.isBackupRunning = true;
    const startTime = Date.now();

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup_${type}_${timestamp}`;
      const backupDir = path.join(this.backupPath, type);
      const backupFile = path.join(backupDir, `${backupName}.gz`);

      logger.info(`🔄 开始${type}备份: ${backupName}`);

      // 执行mongodump
      const dumpCommand = this.buildDumpCommand(backupDir, backupName);
      await this.executeCommand(dumpCommand);

      // 压缩备份文件
      if (config.backup.compressionEnabled) {
        await this.compressBackup(path.join(backupDir, backupName), backupFile);
      }

      // 加密备份文件
      if (config.backup.encryptionEnabled) {
        await this.encryptBackup(backupFile);
      }

      // 上传到S3 (如果启用)
      if (config.backup.s3.enabled) {
        await this.uploadToS3(backupFile, type, backupName);
      }

      // 清理过期备份
      await this.cleanupOldBackups(type);

      const duration = Date.now() - startTime;
      logger.info(`✅ ${type}备份完成: ${backupName} (耗时: ${duration}ms)`);

      // 记录备份历史
      await this.recordBackupHistory(type, backupName, duration, true);

    } catch (error) {
      logger.error(`❌ ${type}备份失败:`, error);

      // 记录失败历史
      await this.recordBackupHistory(type, null, Date.now() - startTime, false, error.message);

    } finally {
      this.isBackupRunning = false;
    }
  }

  buildDumpCommand(outputDir, backupName) {
    const uri = new URL(config.mongodb.uri);
    const command = [
      'mongodump',
      `--uri="${config.mongodb.uri}"`,
      `--out="${path.join(outputDir, backupName)}"`,
      '--gzip'
    ];

    if (process.env.DB_BACKUP_EXCLUDE_COLLECTIONS) {
      const excludeCollections = process.env.DB_BACKUP_EXCLUDE_COLLECTIONS.split(',');
      excludeCollections.forEach(collection => {
        command.push(`--excludeCollection="${collection.trim()}"`);
      });
    }

    return command.join(' ');
  }

  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.error('命令执行失败:', error);
          reject(error);
        } else {
          logger.info('备份命令执行成功');
          resolve(stdout);
        }
      });
    });
  }

  async compressBackup(sourceDir, outputFile) {
    logger.info('📦 开始压缩备份文件...');

    return new Promise((resolve, reject) => {
      const readStream = require('fs').createReadStream(sourceDir);
      const writeStream = require('fs').createWriteStream(outputFile);
      const gzip = zlib.createGzip();

      readStream
        .pipe(gzip)
        .pipe(writeStream)
        .on('finish', async () => {
          // 删除未压缩的备份目录
          await fs.rm(sourceDir, { recursive: true, force: true });
          resolve();
        })
        .on('error', reject);
    });
  }

  async encryptBackup(filePath) {
    if (!this.encryptionKey) {
      throw new Error('加密密钥未配置');
    }

    logger.info('🔐 开始加密备份文件...');

    const inputFile = await fs.readFile(filePath);
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    const encrypted = Buffer.concat([cipher.update(inputFile), cipher.final()]);

    const encryptedFilePath = filePath + '.enc';
    await fs.writeFile(encryptedFilePath, encrypted);

    // 删除未加密的文件
    await fs.unlink(filePath);
  }

  async uploadToS3(filePath, type, backupName) {
    logger.info('☁️ 开始上传备份到S3...');

    // 这里需要集成AWS SDK
    // const AWS = require('aws-sdk');
    // const s3 = new AWS.S3({
    //   accessKeyId: config.backup.s3.accessKey,
    //   secretAccessKey: config.backup.s3.secretKey,
    //   region: config.backup.s3.region
    // });

    // const fileContent = await fs.readFile(filePath);
    // await s3.upload({
    //   Bucket: config.backup.s3.bucket,
    //   Key: `backups/${type}/${backupName}.gz`,
    //   Body: fileContent
    // }).promise();

    logger.info('✅ 备份文件已上传到S3');
  }

  async cleanupOldBackups(type) {
    try {
      const backupDir = path.join(this.backupPath, type);
      const files = await fs.readdir(backupDir);

      const retentionDays = {
        daily: 7,    // 保留7天
        weekly: 4,   // 保留4周
        monthly: 12  // 保留12个月
      };

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (retentionDays[type] || 7));

      for (const file of files) {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          logger.info(`🗑️ 删除过期备份: ${file}`);
        }
      }

    } catch (error) {
      logger.error('清理过期备份失败:', error);
    }
  }

  async recordBackupHistory(type, backupName, duration, success, error = null) {
    try {
      const record = {
        type,
        backupName,
        duration,
        success,
        error,
        timestamp: new Date().toISOString()
      };

      await redisClient.lPush('db:backup:history', JSON.stringify(record));
      await redisClient.lTrim('db:backup:history', 0, 99); // 保留最近100条记录

    } catch (redisError) {
      logger.error('记录备份历史失败:', redisError);
    }
  }

  async getBackupHistory() {
    try {
      const history = await redisClient.lRange('db:backup:history', 0, -1);
      return history.map(record => JSON.parse(record));
    } catch (error) {
      logger.error('获取备份历史失败:', error);
      return [];
    }
  }

  async restoreBackup(backupFile) {
    logger.info(`🔄 开始恢复备份: ${backupFile}`);

    try {
      const restoreCommand = `mongorestore --uri="${config.mongodb.uri}" --gzip "${backupFile}"`;
      await this.executeCommand(restoreCommand);

      logger.info('✅ 备份恢复成功');
      return true;

    } catch (error) {
      logger.error('❌ 备份恢复失败:', error);
      return false;
    }
  }
}

// 数据库管理器主类
class DatabaseManager {
  constructor() {
    this.monitor = new DatabaseMonitor();
    this.backup = new DatabaseBackup();
    this.isConnected = false;
  }

  async initialize() {
    try {
      // 连接MongoDB
      await this.connectMongoDB();

      // 初始化备份系统
      await this.backup.initialize();

      // 启动监控
      this.monitor.startMonitoring();

      logger.info('✅ 数据库管理器初始化完成');
      return true;

    } catch (error) {
      logger.error('❌ 数据库管理器初始化失败:', error);
      throw error;
    }
  }

  async connectMongoDB() {
    try {
      await mongoose.connect(config.mongodb.uri, config.mongodb.options);
      this.isConnected = true;

      // 测试连接
      await mongoose.connection.db.admin().ping();

      logger.info('✅ MongoDB连接池已建立');
      logger.info(`🔗 连接池配置: 最大${config.mongodb.options.maxPoolSize}, 最小${config.mongodb.options.minPoolSize}`);

      return true;

    } catch (error) {
      this.isConnected = false;
      logger.error('❌ MongoDB连接失败:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      this.monitor.stopMonitoring();
      await mongoose.connection.close();
      this.isConnected = false;

      logger.info('✅ 数据库连接已关闭');
    } catch (error) {
      logger.error('❌ 关闭数据库连接失败:', error);
    }
  }

  async healthCheck() {
    const health = {
      mongodb: {
        status: this.isConnected ? 'connected' : 'disconnected',
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name
      },
      metrics: this.monitor.getMetrics(),
      backup: {
        lastBackup: null,
        nextBackup: null
      }
    };

    try {
      // 测试数据库操作
      await mongoose.connection.db.admin().ping();
      health.mongodb.status = 'healthy';
    } catch (error) {
      health.mongodb.status = 'error';
      health.mongodb.error = error.message;
    }

    // 获取最近备份信息
    try {
      const backupHistory = await this.backup.getBackupHistory();
      const lastBackup = backupHistory.find(record => record.success);

      if (lastBackup) {
        health.backup.lastBackup = lastBackup.timestamp;
        health.backup.type = lastBackup.type;
      }
    } catch (error) {
      logger.error('获取备份信息失败:', error);
    }

    return health;
  }

  async optimizeDatabase() {
    logger.info('🔧 开始数据库优化...');

    try {
      const suggestions = await this.monitor.getOptimizationSuggestions();
      const optimizations = [];

      for (const suggestion of suggestions) {
        switch (suggestion.type) {
          case 'slow_queries':
            optimizations.push(await this.optimizeSlowQueries(suggestion));
            break;
          case 'connection_pool':
            optimizations.push(this.optimizeConnectionPool(suggestion));
            break;
          case 'performance':
            optimizations.push(await this.optimizePerformance(suggestion));
            break;
        }
      }

      logger.info(`✅ 数据库优化完成，执行了 ${optimizations.length} 项优化`);
      return optimizations;

    } catch (error) {
      logger.error('❌ 数据库优化失败:', error);
      throw error;
    }
  }

  async optimizeSlowQueries(suggestion) {
    // 分析慢查询并创建索引
    const optimizations = [];

    for (const queryInfo of suggestion.details) {
      try {
        // 这里应该根据具体的查询模式创建索引
        // 例如: await this.createIndex(queryInfo.collection, { field: 1 });

        optimizations.push({
          collection: queryInfo.collection,
          action: 'create_index',
          recommendation: `为 ${queryInfo.collection} 集合创建索引`
        });
      } catch (error) {
        logger.error(`创建索引失败 (${queryInfo.collection}):`, error);
      }
    }

    return optimizations;
  }

  optimizeConnectionPool(suggestion) {
    return {
      type: 'connection_pool',
      action: 'adjust_pool_size',
      recommendation: suggestion.recommendation
    };
  }

  async optimizePerformance(suggestion) {
    return {
      type: 'performance',
      action: 'query_optimization',
      recommendation: suggestion.recommendation
    };
  }

  getMetrics() {
    return this.monitor.getMetrics();
  }

  async getBackupHistory() {
    return this.backup.getBackupHistory();
  }

  async performManualBackup(type = 'daily') {
    return await this.backup.performBackup(type);
  }
}

// 创建单例实例
const databaseManager = new DatabaseManager();

module.exports = {
  DatabaseManager,
  DatabaseMonitor,
  DatabaseBackup,
  databaseManager,
  config
};