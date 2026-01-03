/**
 * 离线存储工具 - Offline Storage Utility
 *
 * 功能：
 * 1. IndexedDB封装
 * 2. 数据队列管理
 * 3. 同步机制
 * 4. 存储配额管理
 * 5. 数据版本控制
 */

/**
 * 数据库配置
 */
const DB_CONFIG = {
  name: 'SmartVillageDB',
  version: 1,
  stores: {
    syncQueue: { keyPath: 'id', autoIncrement: true },
    cache: { keyPath: 'key' },
    forms: { keyPath: 'id' },
    announcements: { keyPath: 'id' },
    residents: { keyPath: 'id' }
  }
};

/**
 * 同步状态
 */
export const SYNC_STATUS = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  SUCCESS: 'success',
  FAILED: 'failed'
};

/**
 * 操作类型
 */
export const OPERATION_TYPES = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete'
};

class OfflineStorage {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.initPromise = null;
  }

  /**
   * 初始化数据库
   */
  async init() {
    if (this.isInitialized) {
      return this.db;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

      request.onerror = () => {
        console.error('IndexedDB打开失败:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('IndexedDB初始化成功');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 创建对象存储
        Object.entries(DB_CONFIG.stores).forEach(([name, config]) => {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, config);
            // 创建索引
            store.createIndex('status', 'status', { unique: false });
            store.createIndex('entityType', 'entityType', { unique: false });
            store.createIndex('createdAt', 'createdAt', { unique: false });
            console.log(`创建对象存储: ${name}`);
          }
        });
      };
    });

    return this.initPromise;
  }

  /**
   * 添加到同步队列
   * @param {Object} data - 数据对象
   * @returns {Promise}
   */
  async addToSyncQueue(data) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');

      const record = {
        ...data,
        status: SYNC_STATUS.PENDING,
        createdAt: new Date().toISOString(),
        retryCount: 0
      };

      const request = store.add(record);

      request.onsuccess = () => {
        console.log('添加到同步队列:', record);
        resolve(record);
      };

      request.onerror = () => {
        console.error('添加到同步队列失败:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 批量添加到同步队列
   * @param {Array} dataArray - 数据数组
   * @returns {Promise}
   */
  async addBatchToSyncQueue(dataArray) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');

      const records = dataArray.map(data => ({
        ...data,
        status: SYNC_STATUS.PENDING,
        createdAt: new Date().toISOString(),
        retryCount: 0
      }));

      let completed = 0;
      const results = [];

      records.forEach(record => {
        const request = store.add(record);
        request.onsuccess = () => {
          results.push(record);
          completed++;
          if (completed === records.length) {
            resolve(results);
          }
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    });
  }

  /**
   * 获取待同步记录
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array>}
   */
  async getPendingSyncs(filters = {}) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const index = store.index('status');

      const request = index.getAll(SYNC_STATUS.PENDING);

      request.onsuccess = () => {
        let results = request.result || [];

        // 应用过滤条件
        if (filters.entityType) {
          results = results.filter(r => r.entityType === filters.entityType);
        }
        if (filters.limit) {
          results = results.slice(0, filters.limit);
        }

        resolve(results);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 更新同步记录状态
   * @param {number} id - 记录ID
   * @param {string} status - 新状态
   * @returns {Promise}
   */
  async updateSyncStatus(id, status) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');

      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (!record) {
          reject(new Error('记录不存在'));
          return;
        }

        record.status = status;
        if (status === SYNC_STATUS.SUCCESS) {
          record.syncedAt = new Date().toISOString();
        }

        const putRequest = store.put(record);
        putRequest.onsuccess = () => resolve(record);
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * 删除同步记录
   * @param {number} id - 记录ID
   * @returns {Promise}
   */
  async deleteSyncRecord(id) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');

      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 缓存数据
   * @param {string} key - 键
   * @param {*} value - 值
   * @param {Object} metadata - 元数据
   * @returns {Promise}
   */
  async cacheData(key, value, metadata = {}) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');

      const record = {
        key,
        value,
        metadata: {
          ...metadata,
          createdAt: new Date().toISOString(),
          expiresAt: metadata.expiresAt || null
        }
      };

      const request = store.put(record);

      request.onsuccess = () => resolve(record);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取缓存数据
   * @param {string} key - 键
   * @returns {Promise<*>}
   */
  async getCachedData(key) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');

      const request = store.get(key);

      request.onsuccess = () => {
        const record = request.result;
        if (!record) {
          resolve(null);
          return;
        }

        // 检查是否过期
        if (record.metadata.expiresAt) {
          const expiresAt = new Date(record.metadata.expiresAt);
          if (expiresAt < new Date()) {
            this.deleteCachedData(key);
            resolve(null);
            return;
          }
        }

        resolve(record.value);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除缓存数据
   * @param {string} key - 键
   * @returns {Promise}
   */
  async deleteCachedData(key) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');

      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 清理过期缓存
   * @returns {Promise<number>}
   */
  async cleanExpiredCache() {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.openCursor();

      let deletedCount = 0;
      const now = new Date();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const record = cursor.value;
          if (record.metadata.expiresAt) {
            const expiresAt = new Date(record.metadata.expiresAt);
            if (expiresAt < now) {
              cursor.delete();
              deletedCount++;
            }
          }
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 保存表单数据
   * @param {string} formId - 表单ID
   * @param {Object} data - 表单数据
   * @returns {Promise}
   */
  async saveForm(formId, data) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['forms'], 'readwrite');
      const store = transaction.objectStore('forms');

      const record = {
        id: formId,
        data,
        updatedAt: new Date().toISOString()
      };

      const request = store.put(record);

      request.onsuccess = () => resolve(record);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取表单数据
   * @param {string} formId - 表单ID
   * @returns {Promise<Object>}
   */
  async getForm(formId) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['forms'], 'readonly');
      const store = transaction.objectStore('forms');

      const request = store.get(formId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除表单数据
   * @param {string} formId - 表单ID
   * @returns {Promise}
   */
  async deleteForm(formId) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['forms'], 'readwrite');
      const store = transaction.objectStore('forms');

      const request = store.delete(formId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取存储配额
   * @returns {Promise<Object>}
   */
  async getStorageQuota() {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
          usagePercent: estimate.quota ? ((estimate.usage / estimate.quota) * 100).toFixed(2) : 0
        };
      } catch (error) {
        console.error('获取存储配额失败:', error);
      }
    }
    return {
      usage: 0,
      quota: 0,
      usagePercent: 0
    };
  }

  /**
   * 清空所有数据
   * @returns {Promise}
   */
  async clearAll() {
    await this.init();

    const stores = Object.keys(DB_CONFIG.stores);
    const promises = stores.map(storeName => {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    return Promise.all(promises);
  }

  /**
   * 获取同步统计
   * @returns {Promise<Object>}
   */
  async getSyncStats() {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');

      const stats = {
        total: 0,
        pending: 0,
        syncing: 0,
        success: 0,
        failed: 0
      };

      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          stats.total++;
          stats[cursor.value.status]++;
          cursor.continue();
        } else {
          resolve(stats);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }
}

// 导出单例
const offlineStorage = new OfflineStorage();

export default offlineStorage;
export { DB_CONFIG, OfflineStorage };
