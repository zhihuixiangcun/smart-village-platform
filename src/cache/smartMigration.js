/**
 * 智能缓存迁移系统
 * 实现缓存层级之间的智能数据迁移
 */

const EventEmitter = require('events');
const { performance } = require('perf_hooks');
const multiLevelCache = require('./multiLevelCache');
const smartCache = require('./smartCache');
const cacheAnalytics = require('./cacheAnalytics');
const logger = require('../utils/logger');

class SmartCacheMigration extends EventEmitter {
  constructor() {
    super();

    // 迁移配置
    this.config = {
      // 迁移策略
      strategy: process.env.CACHE_MIGRATION_STRATEGY || 'adaptive', // 'aggressive', 'conservative', 'adaptive'
      // 迁移阈值
      thresholds: {
        l1ToL2: {
          accessCount: parseInt(process.env.MIGRATION_L1_L2_ACCESS) || 10,
          timeSinceLastAccess: parseInt(process.env.MIGRATION_L1_L2_TIME) || 300000, // 5分钟
          hitRate: parseFloat(process.env.MIGRATION_L1_L2_HIT_RATE) || 0.8
        },
        l2ToL3: {
          accessCount: parseInt(process.env.MIGRATION_L2_L3_ACCESS) || 5,
          timeSinceLastAccess: parseInt(process.env.MIGRATION_L2_L3_TIME) || 600000, // 10分钟
          hitRate: parseFloat(process.env.MIGRATION_L2_L3_HIT_RATE) || 0.6
        },
        l3ToL2: {
          hotness: parseFloat(process.env.MIGRATION_L3_L2_HOTNESS) || 5.0,
          recentAccess: parseInt(process.env.MIGRATION_L3_L2_RECENT) || 1800000 // 30分钟
        },
        l2ToL1: {
          hotness: parseFloat(process.env.MIGRATION_L2_L1_HOTNESS) || 10.0,
          accessFrequency: parseInt(process.env.MIGRATION_L2_L1_FREQ) || 50 // 访问频率（次/小时）
        }
      },
      // 批处理大小
      batchSize: parseInt(process.env.MIGRATION_BATCH_SIZE) || 100,
      // 迁移间隔（秒）
      interval: parseInt(process.env.MIGRATION_INTERVAL) || 60,
      // 并发数
      concurrency: parseInt(process.env.MIGRATION_CONCURRENCY) || 5
    };

    // 数据访问跟踪
    this.accessTracker = new Map();

    // 迁移统计
    this.stats = {
      totalMigrations: 0,
      l1ToL2: 0,
      l2ToL3: 0,
      l3ToL2: 0,
      l2ToL1: 0,
      promotions: 0,
      demotions: 0,
      errors: 0,
      duration: 0
    };

    // 迁移队列
    this.migrationQueue = [];

    // 是否正在迁移
    this.isMigrating = false;

    // 启动定期迁移
    this.startPeriodicMigration();
  }

  /**
   * 记录数据访问
   * @param {string} key - 缓存键
   * @param {string} fromLevel - 来源层级
   * @param {boolean} hit - 是否命中
   * @param {Object} metadata - 元数据
   */
  recordAccess(key, fromLevel, hit = false, metadata = {}) {
    const now = Date.now();

    // 获取或创建访问记录
    if (!this.accessTracker.has(key)) {
      this.accessTracker.set(key, {
        firstAccess: now,
        lastAccess: now,
        accessCount: 0,
        hitCount: 0,
        missCount: 0,
        l1Accesses: 0,
        l2Accesses: 0,
        l3Accesses: 0,
        levels: new Set([fromLevel]),
        migrations: [],
        hotness: 1
      });
    }

    const track = this.accessTracker.get(key);
    track.lastAccess = now;
    track.accessCount++;
    track.levels.add(fromLevel);

    // 更新层级访问计数
    if (fromLevel === 'l1') track.l1Accesses++;
    else if (fromLevel === 'l2') track.l2Accesses++;
    else if (fromLevel === 'l3') track.l3Accesses++;

    // 更新命中计数
    if (hit) {
      track.hitCount++;
    } else {
      track.missCount++;
    }

    // 计算热度
    this.updateHotness(key, track);

    // 检查是否需要迁移
    this.checkMigrationNeeds(key, track);

    // 清理过期记录
    this.cleanupOldAccessRecords();
  }

  /**
   * 更新数据热度
   * @param {string} key - 缓存键
   * @param {Object} track - 访问记录
   */
  updateHotness(key, track) {
    const now = Date.now();
    const timeSinceFirst = now - track.firstAccess;
    const timeSinceLast = now - track.lastAccess;

    // 基于访问频率的热度
    const accessFrequency = track.accessCount / (timeSinceFirst / (1000 * 60)); // 每分钟访问次数

    // 基于命中率的热度
    const hitRate = track.accessCount > 0 ? track.hitCount / track.accessCount : 0;

    // 基于最近性的热度
    const recency = Math.max(0, 1 - timeSinceLast / (1000 * 60 * 60)); // 1小时内访问为满分

    // 综合热度计算
    track.hotness = (accessFrequency * 2 + hitRate * 3 + recency * 2) / 7;
  }

  /**
   * 检查迁移需求
   * @param {string} key - 缓存键
   * @param {Object} track - 访问记录
   */
  checkMigrationNeeds(key, track) {
    const now = Date.now();
    const timeSinceLastAccess = now - track.lastAccess;

    // 检查L1到L2的迁移（降级）
    if (track.l1Accesses > 0 &&
        track.l1Accesses > this.config.thresholds.l1ToL2.accessCount &&
        timeSinceLastAccess > this.config.thresholds.l1ToL2.timeSinceLastAccess &&
        track.l1Accesses / track.accessCount < this.config.thresholds.l1ToL2.hitRate) {

      this.scheduleMigration({
        type: 'demote',
        from: 'l1',
        to: 'l2',
        key,
        reason: 'l1_access_low',
        track
      });
    }

    // 检查L2到L3的迁移（降级）
    if (track.l2Accesses > 0 &&
        track.l2Accesses > this.config.thresholds.l2ToL3.accessCount &&
        timeSinceLastAccess > this.config.thresholds.l2ToL3.timeSinceLastAccess &&
        track.l2Accesses / track.accessCount < this.config.thresholds.l2ToL3.hitRate) {

      this.scheduleMigration({
        type: 'demote',
        from: 'l2',
        to: 'l3',
        key,
        reason: 'l2_access_low',
        track
      });
    }

    // 检查L3到L2的迁移（升级）
    if (track.l3Accesses > 0 &&
        track.hotness > this.config.thresholds.l3ToL2.hotness &&
        timeSinceLastAccess < this.config.thresholds.l3ToL2.recentAccess) {

      this.scheduleMigration({
        type: 'promote',
        from: 'l3',
        to: 'l2',
        key,
        reason: 'l3_hot_data',
        track
      });
    }

    // 检查L2到L1的迁移（升级）
    const accessFrequency = track.accessCount / ((now - track.firstAccess) / (1000 * 60 * 60)); // 每小时访问次数
    if (track.l2Accesses > 0 &&
        track.hotness > this.config.thresholds.l2ToL1.hotness &&
        accessFrequency > this.config.thresholds.l2ToL1.accessFrequency) {

      this.scheduleMigration({
        type: 'promote',
        from: 'l2',
        to: 'l1',
        key,
        reason: 'l2_hot_frequent',
        track
      });
    }
  }

  /**
   * 调度迁移任务
   * @param {Object} migration - 迁移任务
   */
  scheduleMigration(migration) {
    // 检查是否已有相同的迁移任务
    const existingIndex = this.migrationQueue.findIndex(m =>
      m.key === migration.key && m.from === migration.from && m.to === migration.to
    );

    if (existingIndex !== -1) {
      // 更新现有任务
      this.migrationQueue[existingIndex] = migration;
    } else {
      // 添加新任务
      this.migrationQueue.push(migration);
    }

    // 限制队列大小
    if (this.migrationQueue.length > 1000) {
      this.migrationQueue.shift();
    }
  }

  /**
   * 执行迁移
   */
  async performMigration() {
    if (this.isMigrating || this.migrationQueue.length === 0) {
      return;
    }

    this.isMigrating = true;
    const startTime = performance.now();

    try {
      logger.info('开始执行缓存迁移', {
        queueSize: this.migrationQueue.length,
        batchSize: this.config.batchSize
      });

      // 按优先级排序
      this.migrationQueue.sort((a, b) => {
        // 升级优先于降级
        if (a.type === 'promote' && b.type === 'demote') return -1;
        if (a.type === 'demote' && b.type === 'promote') return 1;

        // 按热度排序
        return (b.track?.hotness || 0) - (a.track?.hotness || 0);
      });

      // 批量处理迁移
      const batch = this.migrationQueue.splice(0, this.config.batchSize);

      const migrationPromises = batch.map(migration =>
        this.executeSingleMigration(migration)
      );

      await Promise.allSettled(migrationPromises);

      const duration = performance.now() - startTime;
      this.stats.duration += duration;

      logger.info('缓存迁移完成', {
        processed: batch.length,
        duration: `${duration.toFixed(2)}ms`,
        stats: this.getMigrationStats()
      });

      this.emit('migrationComplete', {
        processed: batch.length,
        duration,
        stats: this.getMigrationStats()
      });

    } catch (error) {
      logger.error('缓存迁移失败', error);
      this.stats.errors++;
      this.emit('migrationError', error);
    } finally {
      this.isMigrating = false;
    }
  }

  /**
   * 执行单个迁移
   * @param {Object} migration - 迁移任务
   */
  async executeSingleMigration(migration) {
    const { type, from, to, key, reason, track } = migration;

    try {
      // 获取数据
      const data = await this.getDataFromLevel(key, from);
      if (!data) {
        logger.debug('迁移数据不存在', { key, from });
        return;
      }

      // 计算新的TTL
      const newTtl = this.calculateNewTTL(migration, data);

      // 迁移到目标层级
      await this.migrateToLevel(key, data, to, newTtl);

      // 更新统计
      if (type === 'promote') {
        this.stats.promotions++;
        if (from === 'l2' && to === 'l1') this.stats.l2ToL1++;
        else if (from === 'l3' && to === 'l2') this.stats.l3ToL2++;
      } else {
        this.stats.demotions++;
        if (from === 'l1' && to === 'l2') this.stats.l1ToL2++;
        else if (from === 'l2' && to === 'l3') this.stats.l2ToL3++;
      }

      // 记录迁移历史
      if (track) {
        track.migrations.push({
          timestamp: Date.now(),
          type,
          from,
          to,
          reason,
          hotness: track.hotness
        });

        // 保留最近10次迁移记录
        if (track.migrations.length > 10) {
          track.migrations.shift();
        }
      }

      this.stats.totalMigrations++;

      logger.debug('数据迁移成功', {
        key,
        type,
        from,
        to,
        reason,
        newTtl
      });

    } catch (error) {
      logger.error('数据迁移失败', {
        key,
        type,
        from,
        to,
        error: error.message
      });

      this.stats.errors++;
      throw error;
    }
  }

  /**
   * 从指定层级获取数据
   * @param {string} key - 缓存键
   * @param {string} level - 缓存层级
   * @returns {*} 数据
   */
  async getDataFromLevel(key, level) {
    // 这里应该直接从指定层级获取数据
    // 由于multiLevelCache的get方法是自动查找的，我们需要特殊处理
    try {
      // 简化处理，直接从多级缓存获取
      return await multiLevelCache.get(key);
    } catch (error) {
      logger.error('获取缓存数据失败', { key, level, error: error.message });
      return null;
    }
  }

  /**
   * 迁移数据到指定层级
   * @param {string} key - 缓存键
   * @param {*} data - 数据
   * @param {string} level - 目标层级
   * @param {number} ttl - TTL
   */
  async migrateToLevel(key, data, level, ttl) {
    const options = {
      // 根据层级设置不同的TTL
      l1Ttl: level === 'l1' ? Math.min(ttl, 600000) : 0, // L1最多10分钟
      l2Ttl: level === 'l2' ? ttl : 0,
      l3Ttl: level === 'l3' ? ttl : 0
    };

    await multiLevelCache.set(key, data, options);
  }

  /**
   * 计算新的TTL
   * @param {Object} migration - 迁移任务
   * @param {*} data - 数据
   * @returns {number} 新的TTL
   */
  calculateNewTTL(migration, data) {
    const { type, track } = migration;
    let baseTTL = 3600; // 默认1小时

    // 根据迁移类型调整TTL
    if (type === 'promote') {
      // 升级时延长TTL
      baseTTL *= track?.hotness || 1;
    } else {
      // 降级时缩短TTL
      baseTTL *= 0.5;
    }

    // 根据数据大小调整TTL
    if (data && typeof data === 'object') {
      const dataSize = JSON.stringify(data).length;
      if (dataSize > 1024 * 100) { // 100KB
        baseTTL *= 0.7; // 大数据减少TTL
      }
    }

    // 限制TTL范围
    return Math.max(60, Math.min(baseTTL, 86400 * 7)); // 1分钟到7天
  }

  /**
   * 清理过期的访问记录
   */
  cleanupOldAccessRecords() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24小时

    for (const [key, track] of this.accessTracker.entries()) {
      if (now - track.lastAccess > maxAge) {
        this.accessTracker.delete(key);
      }
    }
  }

  /**
   * 获取迁移统计
   * @returns {Object} 迁移统计
   */
  getMigrationStats() {
    return {
      ...this.stats,
      queueSize: this.migrationQueue.length,
      trackedKeys: this.accessTracker.size,
      avgMigrationsPerHour: this.stats.totalMigrations / ((Date.now() - (this.stats.firstMigration || Date.now())) / (1000 * 60 * 60))
    };
  }

  /**
   * 获取迁移报告
   * @returns {Object} 迁移报告
   */
  getMigrationReport() {
    const now = Date.now();
    const recentMigrations = [];

    // 收集最近的迁移记录
    for (const [key, track] of this.accessTracker.entries()) {
      if (track.migrations.length > 0) {
        const lastMigration = track.migrations[track.migrations.length - 1];
        if (now - lastMigration.timestamp < 60 * 60 * 1000) { // 最近1小时
          recentMigrations.push({
            key,
            ...lastMigration,
            hotness: track.hotness,
            accessCount: track.accessCount
          });
        }
      }
    }

    return {
      timestamp: new Date(),
      stats: this.getMigrationStats(),
      recentMigrations: recentMigrations.slice(0, 20),
      hotKeys: this.getHotKeys(),
      coldKeys: this.getColdKeys(),
      config: this.config
    };
  }

  /**
   * 获取热点键
   * @returns {Array} 热点键列表
   */
  getHotKeys() {
    return Array.from(this.accessTracker.entries())
      .map(([key, track]) => ({
        key,
        hotness: track.hotness,
        accessCount: track.accessCount,
        hitRate: track.accessCount > 0 ? track.hitCount / track.accessCount : 0,
        lastAccess: track.lastAccess,
        levels: Array.from(track.levels)
      }))
      .sort((a, b) => b.hotness - a.hotness)
      .slice(0, 20);
  }

  /**
   * 获取冷点键
   * @returns {Array} 冷点键列表
   */
  getColdKeys() {
    const now = Date.now();

    return Array.from(this.accessTracker.entries())
      .filter(([_, track]) => now - track.lastAccess > 60 * 60 * 1000) // 1小时未访问
      .map(([key, track]) => ({
        key,
        hotness: track.hotness,
        accessCount: track.accessCount,
        lastAccess: track.lastAccess,
        timeSinceLastAccess: now - track.lastAccess
      }))
      .sort((a, b) => a.hotness - b.hotness)
      .slice(0, 20);
  }

  /**
   * 启动定期迁移
   */
  startPeriodicMigration() {
    setInterval(() => {
      if (!this.isMigrating && this.migrationQueue.length > 0) {
        this.performMigration();
      }
    }, this.config.interval * 1000);

    logger.info('定期缓存迁移已启动', {
      interval: this.config.interval,
      batchSize: this.config.batchSize
    });
  }

  /**
   * 手动触发迁移
   * @param {Object} options - 选项
   */
  async triggerMigration(options = {}) {
    const {
      type = 'all', // 'promote', 'demote', 'all'
      hotnessThreshold = 5,
      accessThreshold = 10
    } = options;

    logger.info('手动触发缓存迁移', options);

    // 生成迁移任务
    for (const [key, track] of this.accessTracker.entries()) {
      let shouldMigrate = false;
      let migrationType = null;

      if (type === 'promote' || type === 'all') {
        if (track.hotness >= hotnessThreshold) {
          shouldMigrate = true;
          migrationType = 'promote';
        }
      }

      if (type === 'demote' || type === 'all') {
        if (track.accessCount >= accessThreshold &&
            track.hotness < hotnessThreshold) {
          shouldMigrate = true;
          migrationType = 'demote';
        }
      }

      if (shouldMigrate && migrationType) {
        // 确定目标层级
        let from = 'l2';
        let to = migrationType === 'promote' ? 'l1' : 'l3';

        if (track.levels.has('l3') && migrationType === 'promote') {
          from = 'l3';
          to = 'l2';
        } else if (track.levels.has('l1') && migrationType === 'demote') {
          from = 'l1';
          to = 'l2';
        }

        this.scheduleMigration({
          type: migrationType,
          from,
          to,
          key,
          reason: 'manual_trigger',
          track
        });
      }
    }

    // 执行迁移
    await this.performMigration();
  }

  /**
   * 更新迁移配置
   * @param {Object} newConfig - 新配置
   */
  updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    logger.info('缓存迁移配置已更新', {
      old: oldConfig,
      new: this.config
    });

    this.emit('configUpdated', { oldConfig, newConfig: this.config });
  }

  /**
   * 重置统计数据
   */
  reset() {
    this.stats = {
      totalMigrations: 0,
      l1ToL2: 0,
      l2ToL3: 0,
      l3ToL2: 0,
      l2ToL1: 0,
      promotions: 0,
      demotions: 0,
      errors: 0,
      duration: 0
    };

    this.migrationQueue = [];
    this.stats.firstMigration = Date.now();

    logger.info('缓存迁移统计数据已重置');
  }
}

// 单例模式
const smartCacheMigration = new SmartCacheMigration();

module.exports = smartCacheMigration;