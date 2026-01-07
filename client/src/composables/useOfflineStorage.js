import { ref, reactive, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';

/**
 * 离线存储管理Hook
 * 支持数据同步、冲突解决、版本控制
 */
export function useOfflineStorage(options = {}) {
  const {
    keyPrefix = 'village_app',
    version = '1.0.0',
    maxRetries = 3,
    syncInterval = 30000, // 30秒
    autoSync = true
  } = options;

  // 状态管理
  const isOnline = ref(navigator.onLine);
  const isSyncing = ref(false);
  const lastSyncTime = ref(null);
  const pendingOperations = ref([]);
  const conflictQueue = ref([]);
  const syncProgress = ref(0);

  // 统计信息
  const stats = reactive({
    totalItems: 0,
    syncedItems: 0,
    pendingItems: 0,
    errorItems: 0,
    cacheSize: 0
  });

  // 数据库连接
  let db = null;
  let syncTimer = null;

  /**
   * 初始化IndexedDB
   */
  const initDB = async () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(`${keyPrefix}_db`, 1);

      request.onerror = () => {
        reject(new Error('IndexedDB初始化失败'));
      };

      request.onsuccess = (event) => {
        db = event.target.result;
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;

        // 创建主数据表
        if (!database.objectStoreNames.contains('data')) {
          const dataStore = database.createObjectStore('data', { keyPath: 'id' });
          dataStore.createIndex('collection', 'collection', { unique: false });
          dataStore.createIndex('lastModified', 'lastModified', { unique: false });
          dataStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // 创建操作队列表
        if (!database.objectStoreNames.contains('operations')) {
          const opsStore = database.createObjectStore('operations', { keyPath: 'id', autoIncrement: true });
          opsStore.createIndex('timestamp', 'timestamp', { unique: false });
          opsStore.createIndex('type', 'type', { unique: false });
        }

        // 创建冲突表
        if (!database.objectStoreNames.contains('conflicts')) {
          const conflictStore = database.createObjectStore('conflicts', { keyPath: 'id', autoIncrement: true });
          conflictStore.createIndex('dataId', 'dataId', { unique: false });
          conflictStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 创建元数据表
        if (!database.objectStoreNames.contains('metadata')) {
          database.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  };

  /**
   * 保存数据到离线存储
   */
  const saveToOfflineStorage = async (collection, data, operation = 'create') => {
    if (!db) await initDB();

    const transaction = db.transaction(['data', 'operations'], 'readwrite');
    const dataStore = transaction.objectStore('data');
    const opsStore = transaction.objectStore('operations');

    const timestamp = Date.now();
    const id = data.id || generateId();

    // 准备数据对象
    const dataObject = {
      id,
      collection,
      data: { ...data, id },
      lastModified: timestamp,
      syncStatus: isOnline.value ? 'pending' : 'offline',
      version: 1,
      operation
    };

    // 检查是否存在冲突
    const existingData = await getFromStore(dataStore, id);
    if (existingData && existingData.lastModified > timestamp) {
      await handleConflict(existingData, dataObject);
      return;
    }

    // 保存数据
    await putToStore(dataStore, dataObject);

    // 记录操作
    const operationObject = {
      timestamp,
      type: operation,
      collection,
      dataId: id,
      data: dataObject.data,
      retryCount: 0
    };

    await putToStore(opsStore, operationObject);

    // 更新统计
    updateStats();

    // 触发同步
    if (isOnline.value && autoSync) {
      schedulSync();
    }

    return dataObject;
  };

  /**
   * 从离线存储获取数据
   */
  const getFromOfflineStorage = async (collection, id = null) => {
    if (!db) await initDB();

    const transaction = db.transaction(['data'], 'readonly');
    const store = transaction.objectStore('data');

    if (id) {
      const data = await getFromStore(store, id);
      return data?.data || null;
    }

    // 获取整个集合
    const index = store.index('collection');
    const request = index.getAll(collection);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const results = request.result.map(item => item.data);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  };

  /**
   * 删除离线数据
   */
  const deleteFromOfflineStorage = async (collection, id) => {
    if (!db) await initDB();

    const transaction = db.transaction(['data', 'operations'], 'readwrite');
    const dataStore = transaction.objectStore('data');
    const opsStore = transaction.objectStore('operations');

    // 标记为删除而不是真正删除
    const existingData = await getFromStore(dataStore, id);
    if (existingData) {
      existingData.operation = 'delete';
      existingData.lastModified = Date.now();
      existingData.syncStatus = isOnline.value ? 'pending' : 'offline';
      await putToStore(dataStore, existingData);

      // 记录删除操作
      const operationObject = {
        timestamp: Date.now(),
        type: 'delete',
        collection,
        dataId: id,
        retryCount: 0
      };
      await putToStore(opsStore, operationObject);
    }

    updateStats();

    if (isOnline.value && autoSync) {
      schedulSync();
    }
  };

  /**
   * 数据同步
   */
  const syncData = async () => {
    if (!isOnline.value || isSyncing.value) return;

    isSyncing.value = true;
    syncProgress.value = 0;

    try {
      // 获取待同步操作
      const operations = await getPendingOperations();
      const total = operations.length;

      if (total === 0) {
        lastSyncTime.value = new Date();
        return;
      }

      let completed = 0;

      for (const operation of operations) {
        try {
          await syncOperation(operation);
          await markOperationCompleted(operation.id);
          completed++;
          syncProgress.value = Math.round((completed / total) * 100);
        } catch (error) {
          await handleSyncError(operation, error);
        }
      }

      lastSyncTime.value = new Date();
      updateStats();
      ElMessage.success(`同步完成：${completed}/${total} 项`);

    } catch (error) {
      ElMessage.error(`同步失败：${  error.message}`);
    } finally {
      isSyncing.value = false;
      syncProgress.value = 0;
    }
  };

  /**
   * 同步单个操作
   */
  const syncOperation = async (operation) => {
    const { type, collection, dataId, data } = operation;

    let response;
    switch (type) {
    case 'create':
      response = await apiRequest('POST', `/${collection}`, data);
      break;
    case 'update':
      response = await apiRequest('PUT', `/${collection}/${dataId}`, data);
      break;
    case 'delete':
      response = await apiRequest('DELETE', `/${collection}/${dataId}`);
      break;
    default:
      throw new Error(`未知操作类型: ${type}`);
    }

    // 更新本地数据的同步状态
    await updateSyncStatus(dataId, 'synced', response.data);
  };

  /**
   * 处理同步冲突
   */
  const handleConflict = async (localData, serverData) => {
    const conflict = {
      dataId: localData.id,
      localData,
      serverData,
      timestamp: Date.now(),
      status: 'pending'
    };

    const transaction = db.transaction(['conflicts'], 'readwrite');
    const store = transaction.objectStore('conflicts');
    await putToStore(store, conflict);

    conflictQueue.value.push(conflict);
  };

  /**
   * 解决冲突
   */
  const resolveConflict = async (conflictId, resolution, mergedData = null) => {
    const transaction = db.transaction(['conflicts', 'data'], 'readwrite');
    const conflictStore = transaction.objectStore('conflicts');
    const dataStore = transaction.objectStore('data');

    const conflict = await getFromStore(conflictStore, conflictId);
    if (!conflict) return;

    let finalData;
    switch (resolution) {
    case 'use_local':
      finalData = conflict.localData;
      break;
    case 'use_server':
      finalData = conflict.serverData;
      break;
    case 'merge':
      finalData = mergedData || mergeData(conflict.localData, conflict.serverData);
      break;
    default:
      throw new Error(`未知冲突解决方案: ${resolution}`);
    }

    // 更新数据
    await putToStore(dataStore, finalData);

    // 删除冲突记录
    await deleteFromStore(conflictStore, conflictId);

    // 从冲突队列移除
    const index = conflictQueue.value.findIndex(c => c.id === conflictId);
    if (index > -1) {
      conflictQueue.value.splice(index, 1);
    }
  };

  /**
   * 数据合并策略
   */
  const mergeData = (localData, serverData) => {
    // 简单的最后修改时间优先策略
    if (localData.lastModified > serverData.lastModified) {
      return { ...serverData, ...localData, lastModified: Date.now() };
    }
    return { ...localData, ...serverData, lastModified: Date.now() };
  };

  /**
   * 清除过期缓存
   */
  const clearExpiredCache = async (maxAge = 7 * 24 * 60 * 60 * 1000) => {
    if (!db) await initDB();

    const cutoffTime = Date.now() - maxAge;
    const transaction = db.transaction(['data'], 'readwrite');
    const store = transaction.objectStore('data');
    const index = store.index('lastModified');

    const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));

    return new Promise((resolve, reject) => {
      const toDelete = [];
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.syncStatus === 'synced') {
            toDelete.push(cursor.value.id);
          }
          cursor.continue();
        } else {
          // 批量删除
          Promise.all(toDelete.map(id => deleteFromStore(store, id)))
            .then(() => {
              updateStats();
              resolve(toDelete.length);
            })
            .catch(reject);
        }
      };
      request.onerror = () => reject(request.error);
    });
  };

  /**
   * 获取存储统计信息
   */
  const getStorageStats = async () => {
    if (!db) await initDB();

    const transaction = db.transaction(['data', 'operations', 'conflicts'], 'readonly');
    const dataStore = transaction.objectStore('data');
    const opsStore = transaction.objectStore('operations');
    const conflictStore = transaction.objectStore('conflicts');

    const [dataCount, opsCount, conflictCount] = await Promise.all([
      countRecords(dataStore),
      countRecords(opsStore),
      countRecords(conflictStore)
    ]);

    // 计算存储大小（近似值）
    const estimate = await navigator.storage?.estimate?.() || {};
    const cacheSize = estimate.usage || 0;

    return {
      totalItems: dataCount,
      pendingOperations: opsCount,
      conflicts: conflictCount,
      cacheSize: Math.round(cacheSize / 1024 / 1024), // MB
      quota: Math.round((estimate.quota || 0) / 1024 / 1024) // MB
    };
  };

  // 工具函数
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const getFromStore = (store, key) => {
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const putToStore = (store, data) => {
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const deleteFromStore = (store, key) => {
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const countRecords = (store) => {
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const getPendingOperations = async () => {
    const transaction = db.transaction(['operations'], 'readonly');
    const store = transaction.objectStore('operations');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const markOperationCompleted = async (operationId) => {
    const transaction = db.transaction(['operations'], 'readwrite');
    const store = transaction.objectStore('operations');
    await deleteFromStore(store, operationId);
  };

  const updateSyncStatus = async (dataId, status, serverData = null) => {
    const transaction = db.transaction(['data'], 'readwrite');
    const store = transaction.objectStore('data');
    const data = await getFromStore(store, dataId);

    if (data) {
      data.syncStatus = status;
      if (serverData) {
        data.data = serverData;
        data.version = serverData.version || data.version;
      }
      await putToStore(store, data);
    }
  };

  const handleSyncError = async (operation, error) => {
    operation.retryCount = (operation.retryCount || 0) + 1;
    operation.lastError = error.message;

    if (operation.retryCount < maxRetries) {
      // 重新加入队列
      const transaction = db.transaction(['operations'], 'readwrite');
      const store = transaction.objectStore('operations');
      await putToStore(store, operation);
    } else {
      // 标记为错误
      operation.status = 'error';
      stats.errorItems++;
    }
  };

  const updateStats = async () => {
    const newStats = await getStorageStats();
    Object.assign(stats, newStats);
  };

  const schedulSync = () => {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(syncData, 1000);
  };

  const apiRequest = async (method, url, data = null) => {
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(`/api${url}`, config);
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    return response.json();
  };

  // 网络状态监听
  const handleOnline = () => {
    isOnline.value = true;
    if (autoSync) {
      syncData();
    }
  };

  const handleOffline = () => {
    isOnline.value = false;
  };

  // 监听网络状态
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // 定期同步
  if (autoSync && syncInterval > 0) {
    const intervalTimer = setInterval(() => {
      if (isOnline.value && !isSyncing.value) {
        syncData();
      }
    }, syncInterval);

    // 清理函数
    const cleanup = () => {
      clearInterval(intervalTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (syncTimer) clearTimeout(syncTimer);
    };

    // 页面卸载时清理
    window.addEventListener('beforeunload', cleanup);
  }

  return {
    // 状态
    isOnline,
    isSyncing,
    lastSyncTime,
    pendingOperations,
    conflictQueue,
    syncProgress,
    stats,

    // 方法
    initDB,
    saveToOfflineStorage,
    getFromOfflineStorage,
    deleteFromOfflineStorage,
    syncData,
    resolveConflict,
    clearExpiredCache,
    getStorageStats,

    // 计算属性
    isOfflineMode: computed(() => !isOnline.value),
    hasPendingOperations: computed(() => pendingOperations.value.length > 0),
    hasConflicts: computed(() => conflictQueue.value.length > 0),
    canSync: computed(() => isOnline.value && !isSyncing.value)
  };
}