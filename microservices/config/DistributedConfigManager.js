const Redis = require('redis');
const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const crypto = require('crypto');

/**
 * 分布式配置管理器
 * 提供配置的集中管理、动态更新、版本控制和加密存储
 */
class DistributedConfigManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = {
      serviceName: options.serviceName || 'unknown-service',
      redis: {
        host: options.redisHost || 'localhost',
        port: options.redisPort || 6379,
        db: options.redisDb || 0
      },
      encryption: {
        enabled: options.encryptionEnabled || false,
        algorithm: options.encryptionAlgorithm || 'aes-256-gcm',
        key: options.encryptionKey || null
      },
      cache: {
        ttl: options.cacheTTL || 300000, // 5分钟
        maxSize: options.cacheMaxSize || 1000
      },
      versioning: {
        enabled: options.versioningEnabled || true,
        maxVersions: options.maxVersions || 10
      },
      validation: {
        enabled: options.validationEnabled || true,
        schemas: options.schemas || {}
      },
      watch: {
        enabled: options.watchEnabled || true,
        pollInterval: options.watchPollInterval || 5000 // 5秒
      },
      ...options
    };

    this.redis = null;
    this.localCache = new Map();
    this.watchers = new Map();
    this.configVersions = new Map();
    this.encryptionKey = this.getEncryptionKey();
    this.isWatching = false;

    this.setupLogger();
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
          filename: `logs/${this.config.serviceName}-config.log`
        }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  /**
   * 初始化配置管理器
   */
  async initialize() {
    try {
      await this.connectRedis();
      await this.initializeCache();

      if (this.config.watch.enabled) {
        await this.startWatching();
      }

      this.logger.info('Distributed configuration manager initialized');
      this.emit('initialized');

    } catch (error) {
      this.logger.error('Failed to initialize configuration manager', error);
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

    this.logger.info('Redis connected for configuration management');
  }

  /**
   * 获取加密密钥
   */
  getEncryptionKey() {
    if (!this.config.encryption.enabled || !this.config.encryption.key) {
      return null;
    }

    // 如果是环境变量或文件路径，可以在这里处理
    return Buffer.from(this.config.encryption.key, 'base64');
  }

  /**
   * 初始化缓存
   */
  async initializeCache() {
    try {
      const keys = await this.redis.keys('config:*');

      for (const key of keys) {
        const configData = await this.redis.get(key);
        if (configData) {
          const { namespace, config } = JSON.parse(configData);
          const cacheKey = `${namespace}:${config.key}`;

          this.localCache.set(cacheKey, {
            ...config,
            cachedAt: Date.now()
          });
        }
      }

      this.logger.info(`Initialized cache with ${this.localCache.size} configurations`);

    } catch (error) {
      this.logger.error('Failed to initialize cache', error);
    }
  }

  /**
   * 设置配置
   */
  async setConfig(namespace, key, value, options = {}) {
    try {
      const configId = uuidv4();
      const timestamp = new Date().toISOString();

      // 验证配置
      if (this.config.validation.enabled && options.schema) {
        this.validateConfig(value, options.schema);
      }

      // 加密敏感配置
      let encryptedValue = value;
      if (this.config.encryption.enabled && options.encrypted) {
        encryptedValue = await this.encryptValue(value);
      }

      const config = {
        id: configId,
        namespace,
        key,
        value: encryptedValue,
        encrypted: options.encrypted || false,
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: this.config.serviceName,
        metadata: options.metadata || {}
      };

      // 获取现有配置版本
      const existingConfig = await this.getConfig(namespace, key, { skipCache: true });
      if (existingConfig) {
        config.version = (existingConfig.version || 1) + 1;
        config.previousVersions = existingConfig.previousVersions || [];
        config.previousVersions.push({
          version: existingConfig.version,
          value: existingConfig.value,
          updatedAt: existingConfig.updatedAt
        });

        // 限制版本数量
        if (config.previousVersions.length > this.config.versioning.maxVersions) {
          config.previousVersions = config.previousVersions.slice(-this.config.versioning.maxVersions);
        }
      }

      // 存储到Redis
      const redisKey = `config:${namespace}:${key}`;
      await this.redis.set(redisKey, JSON.stringify(config));

      // 更新缓存
      const cacheKey = `${namespace}:${key}`;
      this.localCache.set(cacheKey, {
        ...config,
        cachedAt: Date.now()
      });

      // 记录版本
      this.configVersions.set(cacheKey, config.version);

      this.logger.info(`Configuration set: ${namespace}:${key} (v${config.version})`);
      this.emit('config-set', { namespace, key, config });

      return config;

    } catch (error) {
      this.logger.error('Failed to set configuration', { namespace, key, error });
      throw error;
    }
  }

  /**
   * 获取配置
   */
  async getConfig(namespace, key, options = {}) {
    try {
      const cacheKey = `${namespace}:${key}`;

      // 从缓存获取
      if (!options.skipCache) {
        const cached = this.localCache.get(cacheKey);
        if (cached && !this.isCacheExpired(cached)) {
          // 解密配置
          if (cached.encrypted && cached.value) {
            return {
              ...cached,
              value: await this.decryptValue(cached.value)
            };
          }
          return cached;
        }
      }

      // 从Redis获取
      const redisKey = `config:${namespace}:${key}`;
      const configStr = await this.redis.get(redisKey);

      if (!configStr) {
        return null;
      }

      const config = JSON.parse(configStr);

      // 更新缓存
      this.localCache.set(cacheKey, {
        ...config,
        cachedAt: Date.now()
      });

      // 解密配置
      if (config.encrypted && config.value) {
        return {
          ...config,
          value: await this.decryptValue(config.value)
        };
      }

      return config;

    } catch (error) {
      this.logger.error('Failed to get configuration', { namespace, key, error });
      throw error;
    }
  }

  /**
   * 获取命名空间下所有配置
   */
  async getAllConfigs(namespace, options = {}) {
    try {
      const pattern = `config:${namespace}:*`;
      const keys = await this.redis.keys(pattern);
      const configs = {};

      for (const key of keys) {
        const configStr = await this.redis.get(key);
        if (configStr) {
          const config = JSON.parse(configStr);

          // 解密配置
          if (config.encrypted && config.value && !options.keepEncrypted) {
            config.value = await this.decryptValue(config.value);
          }

          configs[config.key] = config;
        }
      }

      return configs;

    } catch (error) {
      this.logger.error('Failed to get all configurations', { namespace, error });
      throw error;
    }
  }

  /**
   * 删除配置
   */
  async deleteConfig(namespace, key) {
    try {
      const redisKey = `config:${namespace}:${key}`;
      const config = await this.getConfig(namespace, key);

      if (!config) {
        return false;
      }

      // 从Redis删除
      await this.redis.del(redisKey);

      // 从缓存删除
      const cacheKey = `${namespace}:${key}`;
      this.localCache.delete(cacheKey);
      this.configVersions.delete(cacheKey);

      this.logger.info(`Configuration deleted: ${namespace}:${key}`);
      this.emit('config-deleted', { namespace, key, config });

      return true;

    } catch (error) {
      this.logger.error('Failed to delete configuration', { namespace, key, error });
      throw error;
    }
  }

  /**
   * 监听配置变化
   */
  async watchConfig(namespace, key, callback) {
    if (!this.config.watch.enabled) {
      throw new Error('Config watching is not enabled');
    }

    const watchKey = `${namespace}:${key}`;

    if (!this.watchers.has(watchKey)) {
      this.watchers.set(watchKey, new Set());
    }

    this.watchers.get(watchKey).add(callback);

    this.logger.info(`Started watching configuration: ${namespace}:${key}`);
  }

  /**
   * 停止监听配置变化
   */
  async unwatchConfig(namespace, key, callback) {
    const watchKey = `${namespace}:${key}`;
    const callbacks = this.watchers.get(watchKey);

    if (callbacks) {
      callbacks.delete(callback);

      if (callbacks.size === 0) {
        this.watchers.delete(watchKey);
      }
    }

    this.logger.info(`Stopped watching configuration: ${namespace}:${key}`);
  }

  /**
   * 开始监听配置变化
   */
  async startWatching() {
    if (this.isWatching) {
      return;
    }

    this.isWatching = true;

    const checkForChanges = async () => {
      if (!this.isWatching) {
        return;
      }

      try {
        const keys = await this.redis.keys('config:*');

        for (const redisKey of keys) {
          const configStr = await this.redis.get(redisKey);
          if (configStr) {
            const config = JSON.parse(configStr);
            const cacheKey = `${config.namespace}:${config.key}`;

            // 检查是否有变化
            const cached = this.localCache.get(cacheKey);
            if (!cached || cached.updatedAt !== config.updatedAt) {

              // 通知监听器
              const callbacks = this.watchers.get(cacheKey);
              if (callbacks) {
                for (const callback of callbacks) {
                  try {
                    let value = config.value;
                    if (config.encrypted && value) {
                      value = await this.decryptValue(value);
                    }

                    callback({
                      namespace: config.namespace,
                      key: config.key,
                      value,
                      config
                    });
                  } catch (error) {
                    this.logger.error('Config watch callback failed', error);
                  }
                }
              }

              // 更新缓存
              this.localCache.set(cacheKey, {
                ...config,
                cachedAt: Date.now()
              });
            }
          }
        }

      } catch (error) {
        this.logger.error('Config watch check failed', error);
      }

      // 继续下一次检查
      setTimeout(checkForChanges, this.config.watch.pollInterval);
    };

    // 开始检查
    setTimeout(checkForChanges, this.config.watch.pollInterval);

    this.logger.info('Configuration watching started');
  }

  /**
   * 停止监听配置变化
   */
  stopWatching() {
    this.isWatching = false;
    this.watchers.clear();
    this.logger.info('Configuration watching stopped');
  }

  /**
   * 加密值
   */
  async encryptValue(value) {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.config.encryption.algorithm, this.encryptionKey);
    cipher.setAAD(Buffer.from('config-data'));

    let encrypted = cipher.update(JSON.stringify(value), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  /**
   * 解密值
   */
  async decryptValue(encryptedData) {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const decipher = crypto.createDecipher(this.config.encryption.algorithm, this.encryptionKey);
    decipher.setAAD(Buffer.from('config-data'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  /**
   * 验证配置
   */
  validateConfig(value, schema) {
    // 简单的JSON Schema验证
    // 在实际项目中可以使用ajv等专业库
    if (typeof schema === 'object') {
      for (const [key, rules] of Object.entries(schema)) {
        if (value[key] !== undefined) {
          if (rules.type && typeof value[key] !== rules.type) {
            throw new Error(`Invalid type for ${key}: expected ${rules.type}, got ${typeof value[key]}`);
          }
          if (rules.required && (value[key] === null || value[key] === undefined)) {
            throw new Error(`Required field ${key} is missing`);
          }
          if (rules.enum && !rules.enum.includes(value[key])) {
            throw new Error(`Invalid value for ${key}: must be one of ${rules.enum.join(', ')}`);
          }
        }
      }
    }
  }

  /**
   * 检查缓存是否过期
   */
  isCacheExpired(cached) {
    return Date.now() - cached.cachedAt > this.config.cache.ttl;
  }

  /**
   * 清理过期缓存
   */
  cleanupExpiredCache() {
    const now = Date.now();

    for (const [key, cached] of this.localCache.entries()) {
      if (now - cached.cachedAt > this.config.cache.ttl) {
        this.localCache.delete(key);
      }
    }

    // 限制缓存大小
    if (this.localCache.size > this.config.cache.maxSize) {
      const entries = Array.from(this.localCache.entries())
        .sort((a, b) => a[1].cachedAt - b[1].cachedAt);

      const toDelete = entries.slice(0, entries.length - this.config.cache.maxSize);

      for (const [key] of toDelete) {
        this.localCache.delete(key);
      }
    }
  }

  /**
   * 获取配置历史版本
   */
  async getConfigHistory(namespace, key) {
    try {
      const config = await this.getConfig(namespace, key, { skipCache: true });
      return config ? config.previousVersions || [] : [];

    } catch (error) {
      this.logger.error('Failed to get configuration history', { namespace, key, error });
      throw error;
    }
  }

  /**
   * 回滚到指定版本
   */
  async rollbackConfig(namespace, key, version) {
    try {
      const config = await this.getConfig(namespace, key, { skipCache: true });

      if (!config || !config.previousVersions) {
        throw new Error('No previous versions found');
      }

      const targetVersion = config.previousVersions.find(v => v.version === version);
      if (!targetVersion) {
        throw new Error(`Version ${version} not found`);
      }

      return await this.setConfig(namespace, key, targetVersion.value, {
        metadata: {
          rollback: true,
          rollbackFrom: config.version,
          rollbackTo: version
        }
      });

    } catch (error) {
      this.logger.error('Failed to rollback configuration', { namespace, key, version, error });
      throw error;
    }
  }

  /**
   * 导出配置
   */
  async exportConfigs(namespace, options = {}) {
    try {
      const configs = await this.getAllConfigs(namespace, { keepEncrypted: true });

      const exportData = {
        namespace,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        configs: {}
      };

      for (const [key, config] of Object.entries(configs)) {
        exportData.configs[key] = {
          version: config.version,
          value: config.value,
          encrypted: config.encrypted,
          updatedAt: config.updatedAt
        };
      }

      return exportData;

    } catch (error) {
      this.logger.error('Failed to export configurations', { namespace, error });
      throw error;
    }
  }

  /**
   * 导入配置
   */
  async importConfigs(exportData, options = {}) {
    try {
      const { namespace, configs } = exportData;

      for (const [key, configData] of Object.entries(configs)) {
        if (!options.skipExisting || !(await this.getConfig(namespace, key))) {
          await this.setConfig(namespace, key, configData.value, {
            encrypted: configData.encrypted,
            metadata: {
              imported: true,
              importedAt: new Date().toISOString(),
              originalVersion: configData.version,
              originalUpdatedAt: configData.updatedAt
            }
          });
        }
      }

      this.logger.info(`Imported ${Object.keys(configs).length} configurations for namespace: ${namespace}`);
      this.emit('configs-imported', { namespace, count: Object.keys(configs).length });

    } catch (error) {
      this.logger.error('Failed to import configurations', error);
      throw error;
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      cacheSize: this.localCache.size,
      watchers: this.watchers.size,
      isWatching: this.isWatching,
      redisConnected: this.redis ? true : false,
      encryptionEnabled: this.config.encryption.enabled
    };
  }

  /**
   * 停止配置管理器
   */
  async shutdown() {
    this.stopWatching();

    if (this.redis) {
      await this.redis.quit();
    }

    this.localCache.clear();
    this.watchers.clear();
    this.configVersions.clear();

    this.logger.info('Distributed configuration manager shut down');
    this.emit('shutdown');
  }
}

module.exports = DistributedConfigManager;

// 使用示例
if (require.main === module) {
  const configManager = new DistributedConfigManager({
    serviceName: process.env.SERVICE_NAME || 'example-service',
    redisHost: process.env.REDIS_HOST || 'localhost',
    redisPort: process.env.REDIS_PORT || 6379,
    encryptionEnabled: process.env.CONFIG_ENCRYPTION === 'true',
    encryptionKey: process.env.CONFIG_ENCRYPTION_KEY
  });

  // 启动配置管理器
  configManager.initialize().then(() => {
    console.log('Configuration manager started');

    // 设置配置示例
    configManager.setConfig('database', 'host', 'localhost', {
      encrypted: false,
      metadata: { description: 'Database host' }
    });

    // 监听配置变化
    configManager.watchConfig('database', 'host', (change) => {
      console.log('Database host changed:', change.value);
    });

  }).catch(console.error);

  // 优雅关闭
  process.on('SIGINT', async () => {
    console.log('Shutting down configuration manager...');
    await configManager.shutdown();
    process.exit(0);
  });
}