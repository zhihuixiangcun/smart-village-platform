/**
 * 离线同步组合函数 - useOfflineSync
 *
 * 功能：
 * - 离线数据管理
 * - 自动同步
 * - 冲突处理
 * - 状态追踪
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import offlineStorage, { SYNC_STATUS, OPERATION_TYPES } from '@/utils/offlineStorage';
import { ElMessage } from 'element-plus';

export function useOfflineSync(options = {}) {
  const {
    apiBaseUrl = '/api/sync',
    autoSync = true,
    syncInterval = 30000, // 30秒
    deviceId = getDeviceId()
  } = options;

  // 状态
  const isOnline = ref(navigator.onLine);
  const isSyncing = ref(false);
  const syncProgress = ref(0);
  const pendingSyncs = ref(0);
  const lastSyncTime = ref(null);
  const syncErrors = ref([]);

  let syncTimer = null;

  /**
   * 获取设备ID
   */
  function getDeviceId() {
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = `device_${  Date.now()  }_${  Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', id);
    }
    return id;
  }

  /**
   * 初始化
   */
  onMounted(() => {
    // 监听网络状态
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 更新待同步数量
    updatePendingCount();

    // 启动自动同步
    if (autoSync && isOnline.value) {
      startAutoSync();
    }
  });

  /**
   * 清理
   */
  onUnmounted(() => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    stopAutoSync();
  });

  /**
   * 处理在线事件
   */
  const handleOnline = () => {
    isOnline.value = true;
    ElMessage.success('网络已连接');

    // 立即同步
    if (autoSync) {
      syncAll();
    }
  };

  /**
   * 处理离线事件
   */
  const handleOffline = () => {
    isOnline.value = false;
    ElMessage.warning('网络已断开，进入离线模式');
  };

  /**
   * 更新待同步数量
   */
  const updatePendingCount = async () => {
    try {
      const stats = await offlineStorage.getSyncStats();
      pendingSyncs.value = stats.pending;
    } catch (error) {
      console.error('获取同步统计失败:', error);
    }
  };

  /**
   * 启动自动同步
   */
  const startAutoSync = () => {
    if (syncTimer) return;

    syncTimer = setInterval(async () => {
      await updatePendingCount();
      if (pendingSyncs.value > 0 && isOnline.value) {
        await syncAll();
      }
    }, syncInterval);
  };

  /**
   * 停止自动同步
   */
  const stopAutoSync = () => {
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
  };

  /**
   * 添加离线操作
   */
  const addOfflineOperation = async (data) => {
    try {
      const record = {
        entityType: data.entityType,
        entityId: data.entityId,
        operation: data.operation || OPERATION_TYPES.CREATE,
        data: data.data,
        userId: data.userId,
        deviceId
      };

      await offlineStorage.addToSyncQueue(record);
      await updatePendingCount();

      ElMessage.success('已添加到离线队列');

      // 如果在线，立即同步
      if (isOnline.value) {
        await syncData(record);
      }

      return record;
    } catch (error) {
      console.error('添加离线操作失败:', error);
      ElMessage.error(`添加失败: ${  error.message}`);
      throw error;
    }
  };

  /**
   * 同步单条数据
   */
  const syncData = async (record) => {
    try {
      // 更新状态为同步中
      await offlineStorage.updateSyncStatus(record.id, SYNC_STATUS.SYNCING);

      const response = await axios.post(`${apiBaseUrl}/push`, {
        deviceId,
        records: [record]
      }, {
        headers: {
          'X-Device-ID': deviceId
        }
      });

      if (response.data.success) {
        // 同步成功，删除记录
        await offlineStorage.deleteSyncRecord(record.id);
        await updatePendingCount();

        return {
          success: true,
          data: response.data.data
        };
      } else {
        throw new Error(response.data.message || '同步失败');
      }
    } catch (error) {
      console.error('同步失败:', error);

      // 更新状态为失败
      if (record.id) {
        await offlineStorage.updateSyncStatus(record.id, SYNC_STATUS.FAILED);
      }

      // 记录错误
      syncErrors.value.push({
        recordId: record.id,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  };

  /**
   * 同步所有待同步数据
   */
  const syncAll = async () => {
    if (isSyncing.value || !isOnline.value) {
      return;
    }

    isSyncing.value = true;
    syncProgress.value = 0;
    syncErrors.value = [];

    try {
      // 获取待同步记录
      const records = await offlineStorage.getPendingSyncs({ limit: 100 });

      if (records.length === 0) {
        ElMessage.info('没有待同步的数据');
        return;
      }

      const total = records.length;
      let synced = 0;
      let failed = 0;

      // 批量同步
      const response = await axios.post(`${apiBaseUrl}/push`, {
        deviceId,
        records
      }, {
        headers: {
          'X-Device-ID': deviceId
        }
      });

      if (response.data.success) {
        const { synced: syncedCount, failed: failedCount } = response.data.data;
        synced = syncedCount || 0;
        failed = failedCount || 0;

        // 清理已同步的记录
        for (const record of records) {
          if (synced > 0) {
            await offlineStorage.deleteSyncRecord(record.id);
          }
        }

        await updatePendingCount();

        lastSyncTime.value = new Date();

        if (failed === 0) {
          ElMessage.success(`同步完成，共同步 ${synced} 条数据`);
        } else {
          ElMessage.warning(`同步完成，成功 ${synced} 条，失败 ${failed} 条`);
        }
      } else {
        throw new Error(response.data.message || '同步失败');
      }
    } catch (error) {
      console.error('批量同步失败:', error);
      ElMessage.error(`同步失败: ${  error.message}`);
    } finally {
      isSyncing.value = false;
      syncProgress.value = 0;
    }
  };

  /**
   * 拉取服务器数据
   */
  const pullData = async (entityTypes = null) => {
    if (!isOnline.value) {
      ElMessage.warning('当前离线，无法拉取数据');
      return;
    }

    try {
      const response = await axios.post(`${apiBaseUrl}/pull`, {
        lastSyncTime: lastSyncTime.value,
        entityTypes
      }, {
        headers: {
          'X-Device-ID': deviceId
        }
      });

      if (response.data.success) {
        const { timestamp, versions, ...data } = response.data.data;

        // 缓存数据
        for (const [entityType, items] of Object.entries(data)) {
          if (Array.isArray(items) && items.length > 0) {
            await offlineStorage.cacheData(entityType, items, {
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24小时
            });
          }
        }

        lastSyncTime.value = new Date(timestamp);

        return data;
      }
    } catch (error) {
      console.error('拉取数据失败:', error);
      ElMessage.error(`拉取失败: ${  error.message}`);
      throw error;
    }
  };

  /**
   * 获取缓存数据
   */
  const getCachedData = async (entityType) => {
    try {
      const data = await offlineStorage.getCachedData(entityType);
      return data;
    } catch (error) {
      console.error('获取缓存失败:', error);
      return null;
    }
  };

  /**
   * 解决同步冲突
   */
  const resolveConflict = async (syncLogId, resolution) => {
    try {
      const response = await axios.post(`${apiBaseUrl}/resolve-conflict`, {
        syncLogId,
        resolution
      });

      if (response.data.success) {
        await offlineStorage.deleteSyncRecord(syncLogId);
        await updatePendingCount();

        ElMessage.success('冲突已解决');
        return response.data.data;
      }
    } catch (error) {
      console.error('解决冲突失败:', error);
      ElMessage.error(`解决失败: ${  error.message}`);
      throw error;
    }
  };

  /**
   * 清理错误日志
   */
  const clearErrors = () => {
    syncErrors.value = [];
  };

  /**
   * 计算属性
   */
  const canSync = computed(() => {
    return isOnline.value && !isSyncing.value && pendingSyncs.value > 0;
  });

  const syncStatusText = computed(() => {
    if (isSyncing.value) return '正在同步...';
    if (!isOnline.value) return '离线模式';
    if (pendingSyncs.value > 0) return `待同步: ${pendingSyncs.value} 条`;
    return '已同步';
  });

  return {
    // 状态
    isOnline,
    isSyncing,
    syncProgress,
    pendingSyncs,
    lastSyncTime,
    syncErrors,

    // 计算属性
    canSync,
    syncStatusText,

    // 方法
    addOfflineOperation,
    syncData,
    syncAll,
    pullData,
    getCachedData,
    resolveConflict,
    updatePendingCount,
    clearErrors,
    startAutoSync,
    stopAutoSync,

    // 常量
    SYNC_STATUS,
    OPERATION_TYPES
  };
}
