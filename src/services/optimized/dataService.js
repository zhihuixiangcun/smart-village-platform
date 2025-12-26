/**
 * 优化的数据服务
 * 提供高性能的数据访问和批处理能力
 */

const DataLoader = require('dataloader');
const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const { CacheUtil } = require('../../utils/cache');
const logger = require('../utils/logger');

class OptimizedDataService extends EventEmitter {
  constructor() {
    super();

    // 批量加载器配置
    this.batchLoaders = new Map();

    // 热数据缓存
    this.hotDataCache = new Map();

    // 访问统计
    this.accessStats = new Map();

    // 预加载队列
    this.preloadQueue = [];

    // 批处理配置
    this.batchConfig = {
      maxBatchSize: 100,
      batchScheduleFn: (cb) => setTimeout(cb, 50), // 50ms批处理窗口
      cache: true
    };

    // 初始化批量加载器
    this.initBatchLoaders();

    // 启动预加载定时器
    this.startPreloadScheduler();
  }

  /**
   * 初始化批量加载器
   */
  initBatchLoaders() {
    // 村民数据批量加载器
    this.batchLoaders.set('residents', new DataLoader(
      async (ids) => {
        const start = performance.now();
        const { Resident } = require('../../models/Resident');

        // 批量查询村民数据
        const residents = await Resident.find({ _id: { $in: ids } })
          .populate('villageId', 'name code')
          .lean();

        // 构建结果映射
        const residentMap = new Map();
        residents.forEach(resident => {
          residentMap.set(resident._id.toString(), resident);
        });

        // 按照输入顺序返回结果
        const results = ids.map(id => residentMap.get(id) || null);

        const duration = performance.now() - start;
        this.logBatchPerformance('residents', ids.length, duration);

        return results;
      },
      this.batchConfig
    ));

    // 村庄数据批量加载器
    this.batchLoaders.set('villages', new DataLoader(
      async (ids) => {
        const start = performance.now();
        const { Village } = require('../../models/Village');

        const villages = await Village.find({ _id: { $in: ids } })
          .populate('administratorId', 'name phone')
          .lean();

        const villageMap = new Map();
        villages.forEach(village => {
          villageMap.set(village._id.toString(), village);
        });

        const results = ids.map(id => villageMap.get(id) || null);

        const duration = performance.now() - start;
        this.logBatchPerformance('villages', ids.length, duration);

        return results;
      },
      this.batchConfig
    ));

    // 公告数据批量加载器
    this.batchLoaders.set('announcements', new DataLoader(
      async (ids) => {
        const start = performance.now();
        const { Announcement } = require('../../models/Announcement');

        const announcements = await Announcement.find({ _id: { $in: ids } })
          .populate('authorId', 'name')
          .populate('villageId', 'name')
          .lean();

        const announcementMap = new Map();
        announcements.forEach(announcement => {
          announcementMap.set(announcement._id.toString(), announcement);
        });

        const results = ids.map(id => announcementMap.get(id) || null);

        const duration = performance.now() - start;
        this.logBatchPerformance('announcements', ids.length, duration);

        return results;
      },
      this.batchConfig
    ));
  }

  /**
   * 批量获取数据
   * @param {string} type - 数据类型
   * @param {string|Array} ids - ID或ID数组
   * @returns {Promise} 数据结果
   */
  async batchGet(type, ids) {
    const loader = this.batchLoaders.get(type);
    if (!loader) {
      throw new Error(`未找到类型 ${type} 的批量加载器`);
    }

    const idArray = Array.isArray(ids) ? ids : [ids];
    const results = await loader.loadMany(idArray);

    // 更新访问统计
    this.updateAccessStats(type, idArray.length);

    // 如果是单个ID，返回单个结果
    return Array.isArray(ids) ? results : results[0];
  }

  /**
   * 预加载热门数据
   */
  async preloadHotData() {
    const start = performance.now();

    try {
      const preloadTasks = [
        this.preloadVillageStats(),
        this.preloadRecentAnnouncements(),
        this.preloadEmergencyContacts(),
        this.preloadServiceCategories(),
        this.preloadPopularResidents()
      ];

      await Promise.allSettled(preloadTasks);

      const duration = performance.now() - start;
      logger.info('热数据预加载完成', { duration });

      this.emit('preloadComplete', { duration });

    } catch (error) {
      logger.error('热数据预加载失败', error);
      this.emit('preloadError', error);
    }
  }

  /**
   * 预加载村庄统计
   */
  async preloadVillageStats() {
    const cacheKey = 'village:stats:hot';

    // 检查缓存
    let stats = await CacheUtil.get(cacheKey);
    if (stats) return stats;

    const { Village } = require('../../models/Village');
    const { Resident } = require('../../models/Resident');

    // 获取村庄列表和统计
    const villages = await Village.find({ status: 'active' }).lean();
    const statsData = await Promise.all(
      villages.map(async (village) => {
        const residentCount = await Resident.countDocuments({
          villageId: village._id,
          status: 'active'
        });

        return {
          villageId: village._id,
          villageName: village.name,
          residentCount,
          lastUpdate: new Date()
        };
      })
    );

    // 缓存10分钟
    await CacheUtil.set(cacheKey, statsData, 600);

    return statsData;
  }

  /**
   * 预加载最近公告
   */
  async preloadRecentAnnouncements() {
    const cacheKey = 'announcements:recent:hot';

    let announcements = await CacheUtil.get(cacheKey);
    if (announcements) return announcements;

    const { Announcement } = require('../../models/Announcement');

    const recentAnnouncements = await Announcement.find({
      status: 'published',
      priority: { $in: ['high', 'urgent'] }
    })
    .populate('villageId', 'name')
    .populate('authorId', 'name')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

    await CacheUtil.set(cacheKey, recentAnnouncements, 300); // 5分钟

    return recentAnnouncements;
  }

  /**
   * 预加载紧急联系人
   */
  async preloadEmergencyContacts() {
    const cacheKey = 'emergency:contacts:hot';

    let contacts = await CacheUtil.get(cacheKey);
    if (contacts) return contacts;

    const { User } = require('../../models/User');

    const emergencyContacts = await User.find({
      roles: { $in: ['admin', 'manager', 'emergency'] },
      status: 'active'
    })
    .select('name phone email villageId roles')
    .populate('villageId', 'name')
    .lean();

    await CacheUtil.set(cacheKey, emergencyContacts, 1800); // 30分钟

    return emergencyContacts;
  }

  /**
   * 预加载服务分类
   */
  async preloadServiceCategories() {
    const cacheKey = 'services:categories:hot';

    let categories = await CacheUtil.get(cacheKey);
    if (categories) return categories;

    // 服务分类数据
    const categoriesData = [
      {
        id: 'gov_service',
        name: '政务服务',
        icon: 'government',
        services: ['证件办理', '户籍管理', '社保服务', '公积金服务']
      },
      {
        id: 'life_service',
        name: '生活服务',
        icon: 'life',
        services: ['水电缴费', '燃气缴费', '宽带办理', '快递服务']
      },
      {
        id: 'medical_service',
        name: '医疗服务',
        icon: 'medical',
        services: ['预约挂号', '健康档案', '医保报销', '体检服务']
      },
      {
        id: 'education_service',
        name: '教育服务',
        icon: 'education',
        services: ['学历认证', '职业培训', '学生资助', '继续教育']
      }
    ];

    await CacheUtil.set(cacheKey, categoriesData, 3600); // 1小时

    return categoriesData;
  }

  /**
   * 预加载热门村民数据
   */
  async preloadPopularResidents() {
    const cacheKey = 'residents:popular:hot';

    let residents = await CacheUtil.get(cacheKey);
    if (residents) return residents;

    const { Resident } = require('../../models/Resident');

    // 获取最近活跃的村民
    const popularResidents = await Resident.find({
      status: 'active',
      lastLoginAt: { $exists: true }
    })
    .populate('villageId', 'name')
    .sort({ lastLoginAt: -1 })
    .limit(100)
    .select('name phone age villageId lastLoginAt')
    .lean();

    await CacheUtil.set(cacheKey, popularResidents, 600); // 10分钟

    return popularResidents;
  }

  /**
   * 智能缓存策略
   * @param {string} key - 缓存键
   * @param {Function} fetchFn - 获取数据的函数
   * @param {Object} options - 缓存选项
   * @returns {Promise} 缓存的数据
   */
  async getWithCache(key, fetchFn, options = {}) {
    const {
      ttl = 300, // 默认5分钟
      refreshThreshold = 0.8, // 80%时间后刷新
      priority = 'normal' // 优先级
    } = options;

    // 尝试从缓存获取
    let data = await CacheUtil.get(key);

    if (data) {
      // 检查是否需要异步刷新
      const cacheInfo = await CacheUtil.getInfo(key);
      if (cacheInfo && cacheInfo.ttl / cacheInfo.maxTtl < refreshThreshold) {
        // 异步刷新缓存
        this.refreshCacheAsync(key, fetchFn, ttl);
      }

      return data;
    }

    // 从数据源获取
    data = await fetchFn();

    // 设置缓存
    await CacheUtil.set(key, data, ttl);

    return data;
  }

  /**
   * 异步刷新缓存
   * @param {string} key - 缓存键
   * @param {Function} fetchFn - 获取数据的函数
   * @param {number} ttl - 缓存时间
   */
  async refreshCacheAsync(key, fetchFn, ttl) {
    // 使用setImmediate避免阻塞当前请求
    setImmediate(async () => {
      try {
        const newData = await fetchFn();
        await CacheUtil.set(key, newData, ttl);
        logger.debug('缓存异步刷新完成', { key });
      } catch (error) {
        logger.warn('缓存异步刷新失败', { key, error: error.message });
      }
    });
  }

  /**
   * 获取访问统计
   * @param {string} type - 数据类型
   * @returns {Object} 统计信息
   */
  getAccessStats(type) {
    return this.accessStats.get(type) || {
      totalRequests: 0,
      cacheHits: 0,
      batchRequests: 0,
      avgResponseTime: 0
    };
  }

  /**
   * 更新访问统计
   * @param {string} type - 数据类型
   * @param {number} count - 请求次数
   * @param {number} duration - 响应时间
   * @param {boolean} cacheHit - 是否命中缓存
   */
  updateAccessStats(type, count = 1, duration = 0, cacheHit = false) {
    const stats = this.getAccessStats(type);

    stats.totalRequests += count;
    if (cacheHit) stats.cacheHits += count;
    if (count > 1) stats.batchRequests++;

    if (duration > 0) {
      // 计算平均响应时间
      stats.avgResponseTime = (stats.avgResponseTime + duration) / 2;
    }

    this.accessStats.set(type, stats);
  }

  /**
   * 记录批处理性能
   * @param {string} type - 数据类型
   * @param {number} batchSize - 批处理大小
   * @param {number} duration - 处理时间
   */
  logBatchPerformance(type, batchSize, duration) {
    const efficiency = batchSize / (duration / 1000); // 每秒处理数

    logger.debug('批处理性能', {
      type,
      batchSize,
      duration,
      efficiency: `${efficiency.toFixed(2)} items/sec`
    });

    // 记录慢查询
    if (duration > 1000) {
      logger.warn('慢批处理查询', {
        type,
        batchSize,
        duration,
        threshold: '1000ms'
      });
    }
  }

  /**
   * 启动预加载调度器
   */
  startPreloadScheduler() {
    // 每5分钟预加载一次热数据
    setInterval(async () => {
      try {
        await this.preloadHotData();
      } catch (error) {
        logger.error('定时预加载失败', error);
      }
    }, 5 * 60 * 1000);

    // 初始预加载
    this.preloadHotData();
  }

  /**
   * 清理批量加载器缓存
   * @param {string} type - 数据类型，不传则清理所有
   */
  clearBatchCache(type) {
    if (type) {
      const loader = this.batchLoaders.get(type);
      if (loader) {
        loader.clearAll();
        logger.debug(`清理 ${type} 批量加载器缓存`);
      }
    } else {
      this.batchLoaders.forEach(loader => loader.clearAll());
      logger.debug('清理所有批量加载器缓存');
    }
  }

  /**
   * 获取性能报告
   * @returns {Object} 性能报告
   */
  getPerformanceReport() {
    const report = {
      timestamp: new Date(),
      batchLoaders: {},
      accessStats: {},
      cacheStats: {}
    };

    // 批量加载器统计
    this.batchLoaders.forEach((loader, type) => {
      report.batchLoaders[type] = {
        cacheSize: loader._cache ? loader._cache.size : 0,
        batchSize: loader._options ? loader._options.maxBatchSize : 0
      };
    });

    // 访问统计
    this.accessStats.forEach((stats, type) => {
      report.accessStats[type] = {
        ...stats,
        cacheHitRate: stats.totalRequests > 0 ?
          (stats.cacheHits / stats.totalRequests * 100).toFixed(2) + '%' : '0%'
      };
    });

    return report;
  }

  /**
   * 动态调整批处理大小
   * @param {string} type - 数据类型
   * @param {number} newSize - 新的批处理大小
   */
  adjustBatchSize(type, newSize) {
    const loader = this.batchLoaders.get(type);
    if (loader) {
      loader._options = loader._options || {};
      loader._options.maxBatchSize = newSize;

      logger.info('调整批处理大小', {
        type,
        oldSize: loader._options.maxBatchSize,
        newSize
      });
    }
  }

  /**
   * 销毁服务
   */
  destroy() {
    // 清理所有批量加载器
    this.batchLoaders.forEach(loader => loader.clearAll());
    this.batchLoaders.clear();

    // 清理缓存
    this.hotDataCache.clear();
    this.accessStats.clear();

    // 移除所有监听器
    this.removeAllListeners();

    logger.info('优化的数据服务已销毁');
  }
}

// 单例模式
const optimizedDataService = new OptimizedDataService();

module.exports = optimizedDataService;