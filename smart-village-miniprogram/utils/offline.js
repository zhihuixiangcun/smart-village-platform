/**
 * 离线缓存系统
 * 支持数据缓存、离线队列、自动同步
 */

const app = getApp();

class OfflineCacheService {
  constructor() {
    this.cachePrefix = 'offline_cache_';
    this.queuePrefix = 'offline_queue_';
    this.maxCacheSize = 50 * 1024 * 1024; // 50MB
    this.defaultExpireTime = 7 * 24 * 60 * 60 * 1000; // 7天
    this.syncQueue = [];
    this.isSyncing = false;
    this.syncTimer = null;

    // 初始化时检查存储空间
    this.checkStorageSpace();

    // 启动自动同步
    this.startAutoSync();
  }

  /**
   * 设置缓存
   */
  setCache(key, data, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const cacheKey = this.getCacheKey(key);
        const expireTime = options.expireTime || this.defaultExpireTime;
        const priority = options.priority || 'normal'; // high, normal, low

        const cacheData = {
          key: key,
          data: data,
          timestamp: Date.now(),
          expireTime: Date.now() + expireTime,
          priority: priority,
          size: this.calculateSize(data),
          version: options.version || 1
        };

        // 检查存储空间
        this.ensureSpaceAvailable(cacheData.size)
          .then(() => {
            wx.setStorageSync(cacheKey, cacheData);

            // 更新缓存索引
            this.updateCacheIndex(cacheKey, cacheData);

            console.log(`缓存设置成功: ${key}, 大小: ${cacheData.size} bytes`);
            resolve(cacheData);
          })
          .catch(reject);
      } catch (error) {
        console.error('设置缓存失败:', error);
        reject(error);
      }
    });
  }

  /**
   * 获取缓存
   */
  getCache(key) {
    try {
      const cacheKey = this.getCacheKey(key);
      const cached = wx.getStorageSync(cacheKey);

      if (!cached) {
        return null;
      }

      // 检查是否过期
      if (Date.now() > cached.expireTime) {
        this.removeCache(key);
        return null;
      }

      // 更新访问时间
      cached.lastAccess = Date.now();
      wx.setStorageSync(cacheKey, cached);

      console.log(`缓存命中: ${key}`);
      return cached.data;
    } catch (error) {
      console.error('获取缓存失败:', error);
      return null;
    }
  }

  /**
   * 删除缓存
   */
  removeCache(key) {
    try {
      const cacheKey = this.getCacheKey(key);
      wx.removeStorageSync(cacheKey);

      // 更新缓存索引
      this.removeFromCacheIndex(cacheKey);

      console.log(`缓存删除成功: ${key}`);
      return true;
    } catch (error) {
      console.error('删除缓存失败:', error);
      return false;
    }
  }

  /**
   * 清空所有缓存
   */
  clearCache() {
    try {
      const keys = wx.getStorageInfoSync().keys;
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));

      cacheKeys.forEach(key => {
        wx.removeStorageSync(key);
      });

      // 清空缓存索引
      wx.removeStorageSync('cache_index');

      console.log('所有缓存已清空');
      return true;
    } catch (error) {
      console.error('清空缓存失败:', error);
      return false;
    }
  }

  /**
   * 添加离线队列
   */
  addToQueue(request) {
    return new Promise((resolve, reject) => {
      try {
        const queueItem = {
          id: this.generateId(),
          method: request.method || 'POST',
          url: request.url,
          data: request.data || {},
          headers: request.headers || {},
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: request.maxRetries || 3,
          priority: request.priority || 'normal'
        };

        // 检查队列大小
        this.checkQueueSize()
          .then(() => {
            const queueKey = this.getQueueKey(queueItem.id);
            wx.setStorageSync(queueKey, queueItem);

            // 更新队列索引
            this.updateQueueIndex(queueItem);

            console.log(`离线请求已添加到队列: ${queueItem.url}`);
            resolve(queueItem);
          })
          .catch(reject);
      } catch (error) {
        console.error('添加离线队列失败:', error);
        reject(error);
      }
    });
  }

  /**
   * 同步离线队列
   */
  async syncQueue() {
    if (this.isSyncing) {
      console.log('队列正在同步中...');
      return;
    }

    if (app.globalData.networkStatus !== 'online') {
      console.log('网络不可用，跳过同步');
      return;
    }

    this.isSyncing = true;

    try {
      const queueItems = this.getQueueItems();

      if (queueItems.length === 0) {
        console.log('离线队列为空');
        return;
      }

      console.log(`开始同步离线队列，共 ${queueItems.length} 项`);

      // 按优先级和时间排序
      queueItems.sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
        return a.timestamp - b.timestamp;
      });

      // 逐项同步
      for (const item of queueItems) {
        await this.syncQueueItem(item);
      }

      console.log('离线队列同步完成');
    } catch (error) {
      console.error('同步离线队列失败:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * 同步单个队列项
   */
  async syncQueueItem(item) {
    try {
      console.log(`同步队列项: ${item.method} ${item.url}`);

      const request = require('./request');
      const response = await request[item.method.toLowerCase()](
        item.url,
        item.data,
        {
          header: item.headers,
          timeout: 15000
        }
      );

      // 同步成功，从队列中移除
      this.removeFromQueue(item.id);
      console.log(`队列项同步成功: ${item.url}`);

      // 触发同步成功事件
      this.onSyncSuccess && this.onSyncSuccess(item, response);
    } catch (error) {
      console.error(`队列项同步失败: ${item.url}`, error);

      // 增加重试次数
      item.retryCount++;
      item.lastError = error.message;
      item.lastRetryTime = Date.now();

      if (item.retryCount >= item.maxRetries) {
        // 超过最大重试次数，从队列中移除
        this.removeFromQueue(item.id);
        console.log(`队列项重试次数超限，已移除: ${item.url}`);

        // 触发同步失败事件
        this.onSyncFailed && this.onSyncFailed(item, error);
      } else {
        // 更新队列项状态
        const queueKey = this.getQueueKey(item.id);
        wx.setStorageSync(queueKey, item);

        // 指数退避
        const delay = Math.min(1000 * Math.pow(2, item.retryCount), 30000);
        setTimeout(() => {
          this.syncQueueItem(item);
        }, delay);
      }
    }
  }

  /**
   * 获取队列项
   */
  getQueueItems() {
    try {
      const queueIndex = wx.getStorageSync('queue_index') || [];
      const items = [];

      queueIndex.forEach(indexItem => {
        try {
          const queueKey = this.getQueueKey(indexItem.id);
          const item = wx.getStorageSync(queueKey);
          if (item) {
            items.push(item);
          }
        } catch (error) {
          console.error('获取队列项失败:', error);
          // 移除损坏的队列项索引
          this.removeFromQueueIndex(indexItem.id);
        }
      });

      return items;
    } catch (error) {
      console.error('获取离线队列失败:', error);
      return [];
    }
  }

  /**
   * 从队列中移除
   */
  removeFromQueue(id) {
    try {
      const queueKey = this.getQueueKey(id);
      wx.removeStorageSync(queueKey);
      this.removeFromQueueIndex(id);
    } catch (error) {
      console.error('移除队列项失败:', error);
    }
  }

  /**
   * 预加载常用数据
   */
  async preloadCommonData() {
    try {
      const userInfo = app.globalData.userInfo;

      if (!userInfo) {
        return;
      }

      console.log('开始预加载常用数据...');

      // 预加载公告列表
      await this.preloadAnnouncements();

      // 预加载服务列表
      await this.preloadServices();

      // 预加载办事指南
      await this.preloadGuides();

      // 预加载村庄信息
      await this.preloadVillageInfo();

      console.log('常用数据预加载完成');
    } catch (error) {
      console.error('预加载常用数据失败:', error);
    }
  }

  /**
   * 预加载公告
   */
  async preloadAnnouncements() {
    try {
      const request = require('./request');
      const announcements = await request.get('/announcements', {
        limit: 20,
        villageId: app.globalData.userInfo?.villageId
      });

      if (announcements.success) {
        await this.setCache('announcements_list', announcements.data, {
          expireTime: 30 * 60 * 1000, // 30分钟
          priority: 'high'
        });
      }
    } catch (error) {
      console.error('预加载公告失败:', error);
    }
  }

  /**
   * 预加载服务
   */
  async preloadServices() {
    try {
      const request = require('./request');
      const services = await request.get('/services', {
        limit: 10,
        category: 'common'
      });

      if (services.success) {
        await this.setCache('services_list', services.data, {
          expireTime: 60 * 60 * 1000, // 1小时
          priority: 'normal'
        });
      }
    } catch (error) {
      console.error('预加载服务失败:', error);
    }
  }

  /**
   * 预加载指南
   */
  async preloadGuides() {
    try {
      const request = require('./request');
      const guides = await request.get('/guides', {
        limit: 15,
        popular: true
      });

      if (guides.success) {
        await this.setCache('guides_list', guides.data, {
          expireTime: 24 * 60 * 60 * 1000, // 24小时
          priority: 'low'
        });
      }
    } catch (error) {
      console.error('预加载指南失败:', error);
    }
  }

  /**
   * 预加载村庄信息
   */
  async preloadVillageInfo() {
    try {
      const request = require('./request');
      const villageInfo = await request.get(`/village/${app.globalData.userInfo?.villageId}`);

      if (villageInfo.success) {
        await this.setCache('village_info', villageInfo.data, {
          expireTime: 2 * 60 * 60 * 1000, // 2小时
          priority: 'high'
        });
      }
    } catch (error) {
      console.error('预加载村庄信息失败:', error);
    }
  }

  /**
   * 检查存储空间
   */
  checkStorageSpace() {
    try {
      const storageInfo = wx.getStorageInfoSync();
      const usedSpace = storageInfo.currentSize;
      const totalSpace = storageInfo.limitSize;
      const availableSpace = totalSpace - usedSpace;

      console.log(`存储空间使用情况: ${usedSpace}/${totalSpace}KB, 可用: ${availableSpace}KB`);

      if (availableSpace < 1024) { // 小于1MB
        this.performCleanup();
      }
    } catch (error) {
      console.error('检查存储空间失败:', error);
    }
  }

  /**
   * 确保有足够的存储空间
   */
  async ensureSpaceAvailable(requiredSize) {
    try {
      const storageInfo = wx.getStorageInfoSync();
      const availableSpace = (storageInfo.limitSize - storageInfo.currentSize) * 1024;

      if (availableSpace < requiredSize * 2) {
        await this.performCleanup();
      }
    } catch (error) {
      console.error('确保存储空间失败:', error);
    }
  }

  /**
   * 执行清理
   */
  async performCleanup() {
    try {
      console.log('开始清理过期缓存...');

      // 清理过期缓存
      await this.cleanExpiredCache();

      // 清理过期的队列项
      await this.cleanExpiredQueue();

      // 按LRU策略清理
      await this.cleanupLRU();

      console.log('缓存清理完成');
    } catch (error) {
      console.error('清理缓存失败:', error);
    }
  }

  /**
   * 清理过期缓存
   */
  async cleanExpiredCache() {
    try {
      const now = Date.now();
      const keys = wx.getStorageInfoSync().keys;
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));

      let cleanedCount = 0;

      for (const key of cacheKeys) {
        try {
          const cached = wx.getStorageSync(key);
          if (cached && now > cached.expireTime) {
            wx.removeStorageSync(key);
            this.removeFromCacheIndex(key);
            cleanedCount++;
          }
        } catch (error) {
          // 清理损坏的缓存
          wx.removeStorageSync(key);
          this.removeFromCacheIndex(key);
          cleanedCount++;
        }
      }

      console.log(`清理过期缓存: ${cleanedCount} 项`);
    } catch (error) {
      console.error('清理过期缓存失败:', error);
    }
  }

  /**
   * 清理过期队列
   */
  async cleanExpiredQueue() {
    try {
      const now = Date.now();
      const maxQueueAge = 7 * 24 * 60 * 60 * 1000; // 7天
      const queueItems = this.getQueueItems();

      let cleanedCount = 0;

      for (const item of queueItems) {
        if (now - item.timestamp > maxQueueAge) {
          this.removeFromQueue(item.id);
          cleanedCount++;
        }
      }

      console.log(`清理过期队列: ${cleanedCount} 项`);
    } catch (error) {
      console.error('清理过期队列失败:', error);
    }
  }

  /**
   * LRU清理
   */
  async cleanupLRU() {
    try {
      const cacheIndex = wx.getStorageSync('cache_index') || [];
      const now = Date.now();

      // 按最后访问时间排序
      cacheIndex.sort((a, b) => {
        const aTime = a.lastAccess || a.timestamp;
        const bTime = b.lastAccess || b.timestamp;
        return aTime - bTime;
      });

      let cleanedSize = 0;
      const targetCleanSize = this.maxCacheSize * 0.2; // 清理20%的空间

      for (const indexItem of cacheIndex) {
        if (cleanedSize >= targetCleanSize) {
          break;
        }

        const cacheKey = this.getCacheKey(indexItem.key);
        try {
          const cached = wx.getStorageSync(cacheKey);
          if (cached && cached.priority !== 'high') {
            wx.removeStorageSync(cacheKey);
            this.removeFromCacheIndex(cacheKey);
            cleanedSize += cached.size;
          }
        } catch (error) {
          // 清理损坏的缓存
          wx.removeStorageSync(cacheKey);
          this.removeFromCacheIndex(cacheKey);
        }
      }

      console.log(`LRU清理: ${cleanedSize} bytes`);
    } catch (error) {
      console.error('LRU清理失败:', error);
    }
  }

  /**
   * 检查队列大小
   */
  async checkQueueSize() {
    try {
      const queueItems = this.getQueueItems();
      const maxQueueSize = 100;

      if (queueItems.length >= maxQueueSize) {
        // 移除最旧的低优先级项目
        queueItems.sort((a, b) => {
          const priorityOrder = { high: 3, normal: 2, low: 1 };
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          if (priorityDiff !== 0) {
            return priorityDiff;
          }
          return a.timestamp - b.timestamp;
        });

        const toRemove = queueItems.slice(0, queueItems.length - maxQueueSize + 1);
        for (const item of toRemove) {
          this.removeFromQueue(item.id);
        }

        console.log(`队列大小超限，移除 ${toRemove.length} 项`);
      }
    } catch (error) {
      console.error('检查队列大小失败:', error);
    }
  }

  /**
   * 启动自动同步
   */
  startAutoSync() {
    // 清理之前的定时器
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    // 每30秒检查一次网络状态并同步
    this.syncTimer = setInterval(() => {
      if (app.globalData.networkStatus === 'online' && !this.isSyncing) {
        this.syncQueue();
      }
    }, 30000);

    // 监听网络状态变化
    wx.onNetworkStatusChange((res) => {
      if (res.isConnected && !this.isSyncing) {
        // 网络恢复时立即同步
        setTimeout(() => {
          this.syncQueue();
        }, 1000);
      }
    });
  }

  /**
   * 停止自动同步
   */
  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    try {
      const keys = wx.getStorageInfoSync().keys;
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));

      let totalSize = 0;
      let totalCount = 0;
      let expiredCount = 0;
      const now = Date.now();

      for (const key of cacheKeys) {
        try {
          const cached = wx.getStorageSync(key);
          if (cached) {
            totalCount++;
            totalSize += cached.size;
            if (now > cached.expireTime) {
              expiredCount++;
            }
          }
        } catch (error) {
          // 忽略损坏的缓存
        }
      }

      return {
        totalCount,
        totalSize,
        expiredCount,
        activeCount: totalCount - expiredCount
      };
    } catch (error) {
      console.error('获取缓存统计失败:', error);
      return {
        totalCount: 0,
        totalSize: 0,
        expiredCount: 0,
        activeCount: 0
      };
    }
  }

  /**
   * 获取队列统计
   */
  getQueueStats() {
    try {
      const queueItems = this.getQueueItems();
      const now = Date.now();

      const stats = {
        totalCount: queueItems.length,
        pendingCount: 0,
        retryCount: 0,
        priorityCounts: { high: 0, normal: 0, low: 0 }
      };

      for (const item of queueItems) {
        if (item.retryCount === 0) {
          stats.pendingCount++;
        } else {
          stats.retryCount++;
        }

        stats.priorityCounts[item.priority]++;
      }

      return stats;
    } catch (error) {
      console.error('获取队列统计失败:', error);
      return {
        totalCount: 0,
        pendingCount: 0,
        retryCount: 0,
        priorityCounts: { high: 0, normal: 0, low: 0 }
      };
    }
  }

  // 辅助方法
  getCacheKey(key) {
    return `${this.cachePrefix}${key}`;
  }

  getQueueKey(id) {
    return `${this.queuePrefix}${id}`;
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  calculateSize(data) {
    try {
      return JSON.stringify(data).length;
    } catch (error) {
      return 1000; // 默认大小
    }
  }

  updateCacheIndex(cacheKey, cacheData) {
    try {
      const index = wx.getStorageSync('cache_index') || [];
      const existingIndex = index.findIndex(item => item.key === cacheKey);

      const indexItem = {
        key: cacheKey,
        timestamp: cacheData.timestamp,
        size: cacheData.size,
        priority: cacheData.priority,
        version: cacheData.version
      };

      if (existingIndex >= 0) {
        index[existingIndex] = indexItem;
      } else {
        index.push(indexItem);
      }

      wx.setStorageSync('cache_index', index);
    } catch (error) {
      console.error('更新缓存索引失败:', error);
    }
  }

  removeFromCacheIndex(cacheKey) {
    try {
      const index = wx.getStorageSync('cache_index') || [];
      const filteredIndex = index.filter(item => item.key !== cacheKey);
      wx.setStorageSync('cache_index', filteredIndex);
    } catch (error) {
      console.error('移除缓存索引失败:', error);
    }
  }

  updateQueueIndex(queueItem) {
    try {
      const index = wx.getStorageSync('queue_index') || [];
      const existingIndex = index.findIndex(item => item.id === queueItem.id);

      const indexItem = {
        id: queueItem.id,
        timestamp: queueItem.timestamp,
        priority: queueItem.priority,
        retryCount: queueItem.retryCount
      };

      if (existingIndex >= 0) {
        index[existingIndex] = indexItem;
      } else {
        index.push(indexItem);
      }

      wx.setStorageSync('queue_index', index);
    } catch (error) {
      console.error('更新队列索引失败:', error);
    }
  }

  removeFromQueueIndex(id) {
    try {
      const index = wx.getStorageSync('queue_index') || [];
      const filteredIndex = index.filter(item => item.id !== id);
      wx.setStorageSync('queue_index', filteredIndex);
    } catch (error) {
      console.error('移除队列索引失败:', error);
    }
  }
}

// 创建实例
const offlineCacheService = new OfflineCacheService();

module.exports = offlineCacheService;