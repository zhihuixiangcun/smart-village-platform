/**
 * 仪表板实时数据更新 Composable
 * 基于 Socket.IO 的仪表板数据实时同步
 * @module composables/useDashboardRealtime
 */
import { ref, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '@/stores/user';
import socketService from '@/services/socket';

/**
 * 仪表板实时更新 Hook
 * @param {Object} options - 配置选项
 * @param {Function} options.onNotificationUpdate - 通知更新回调
 * @param {Function} options.onTodoUpdate - 待办事项更新回调
 * @param {Function} options.onDutyUpdate - 值班表更新回调
 * @param {Function} options.onStatisticsUpdate - 统计数据更新回调
 * @param {Function} options.onEmergencyAlert - 紧急通知回调
 * @returns {Object} 实时更新相关的状态和方法
 */
export function useDashboardRealtime(options = {}) {
  const userStore = useUserStore();

  // 状态
  const isConnected = ref(false);
  const isConnecting = ref(false);
  const lastUpdate = ref(null);
  const connectionStatus = ref('disconnected');

  // 事件处理器映射
  const handlers = {
    // 新通知
    'new-notification': (data) => {
      console.log('[Dashboard] 新通知:', data);
      lastUpdate.value = { type: 'notification', data, timestamp: Date.now() };
      options.onNotificationUpdate?.(data);
    },

    // 通知已读
    'notification-read': (data) => {
      console.log('[Dashboard] 通知已读:', data);
      options.onNotificationUpdate?.(data);
    },

    // 通知删除
    'notification-deleted': (data) => {
      console.log('[Dashboard] 通知已删除:', data);
      options.onNotificationUpdate?.(data);
    },

    // 新待办事项
    'new-todo': (data) => {
      console.log('[Dashboard] 新待办事项:', data);
      lastUpdate.value = { type: 'todo', data, timestamp: Date.now() };
      options.onTodoUpdate?.(data);
    },

    // 待办事项状态更新
    'todo-updated': (data) => {
      console.log('[Dashboard] 待办事项更新:', data);
      options.onTodoUpdate?.(data);
    },

    // 待办事项完成
    'todo-completed': (data) => {
      console.log('[Dashboard] 待办事项完成:', data);
      options.onTodoUpdate?.(data);
    },

    // 值班表更新
    'duty-schedule-updated': (data) => {
      console.log('[Dashboard] 值班表更新:', data);
      lastUpdate.value = { type: 'duty', data, timestamp: Date.now() };
      options.onDutyUpdate?.(data);
    },

    // 统计数据更新
    'statistics-updated': (data) => {
      console.log('[Dashboard] 统计数据更新:', data);
      options.onStatisticsUpdate?.(data);
    },

    // 村民动态更新
    'activity-new': (data) => {
      console.log('[Dashboard] 新村民动态:', data);
      // 可选：添加村民动态更新回调
    },

    // 紧急广播
    'emergency-alert': (data) => {
      console.log('[Dashboard] 紧急广播:', data);
      lastUpdate.value = { type: 'emergency', data, timestamp: Date.now() };
      options.onEmergencyAlert?.(data);
    },

    // 系统通知
    'system-notification': (data) => {
      console.log('[Dashboard] 系统通知:', data);
      options.onSystemNotification?.(data);
    },

    // 村务更新
    'village-update': (data) => {
      console.log('[Dashboard] 村务更新:', data);
      options.onVillageUpdate?.(data);
    }
  };

  /**
   * 连接到 Socket.IO 服务器
   */
  function connect() {
    if (isConnected.value || isConnecting.value) {
      console.log('[Dashboard] Socket 已连接或正在连接');
      return;
    }

    isConnecting.value = true;
    connectionStatus.value = 'connecting';

    try {
      // 如果 socketService 还未连接，则连接
      if (!socketService.socket) {
        socketService.connect();
      }

      // 等待连接成功
      const checkConnection = setInterval(() => {
        if (socketService.isConnected) {
          clearInterval(checkConnection);
          setupEventListeners();
        }
      }, 100);

      // 超时处理
      setTimeout(() => {
        clearInterval(checkConnection);
        if (isConnecting.value) {
          isConnecting.value = false;
          connectionStatus.value = 'error';
        }
      }, 5000);

    } catch (error) {
      console.error('[Dashboard] Socket 连接失败:', error);
      isConnecting.value = false;
      connectionStatus.value = 'error';
    }
  }

  /**
   * 设置事件监听器
   */
  function setupEventListeners() {
    if (!socketService.socket) {
      console.error('[Dashboard] Socket 实例不存在');
      return;
    }

    const socket = socketService.socket;

    // 监听所有仪表板相关事件
    Object.keys(handlers).forEach(event => {
      socket.on(event, handlers[event]);
    });

    // 监听连接状态变化
    socket.on('connect', () => {
      console.log('[Dashboard] Socket 已连接:', socket.id);
      isConnected.value = true;
      isConnecting.value = false;
      connectionStatus.value = 'connected';

      // 加入村庄房间
      joinVillageRoom();
    });

    socket.on('disconnect', () => {
      console.log('[Dashboard] Socket 已断开');
      isConnected.value = false;
      connectionStatus.value = 'disconnected';
    });

    // 如果已经连接，直接设置状态
    if (socketService.isConnected) {
      isConnected.value = true;
      isConnecting.value = false;
      connectionStatus.value = 'connected';
      joinVillageRoom();
    }
  }

  /**
   * 移除事件监听器
   */
  function removeEventListeners() {
    if (!socketService.socket) return;

    const socket = socketService.socket;

    Object.keys(handlers).forEach(event => {
      socket.off(event, handlers[event]);
    });
  }

  /**
   * 加入村庄房间
   */
  function joinVillageRoom() {
    const villageId = userStore.villageId || userStore.user?.villageId || 'default';
    socketService.joinVillage(villageId);
    console.log('[Dashboard] 已加入村庄房间:', villageId);
  }

  /**
   * 断开连接
   */
  function disconnect() {
    console.log('[Dashboard] 断开 Socket 连接');
    removeEventListeners();
    isConnected.value = false;
    connectionStatus.value = 'disconnected';
  }

  /**
   * 手动刷新数据
   * @param {string} dataType - 数据类型 (notifications|todos|duty|statistics)
   */
  function refreshData(dataType) {
    if (!socketService.socket || !isConnected.value) {
      console.warn('[Dashboard] Socket 未连接，无法刷新数据');
      return false;
    }

    // 发送刷新请求到服务器
    socketService.socket.emit('dashboard-refresh', {
      villageId: userStore.villageId,
      dataType,
      userId: userStore.user?.id || userStore.user?._id
    });

    console.log('[Dashboard] 请求刷新数据:', dataType);
    return true;
  }

  /**
   * 发送心跳
   */
  function sendHeartbeat() {
    if (!socketService.socket || !isConnected.value) return;

    socketService.socket.emit('dashboard-heartbeat', {
      userId: userStore.user?.id || userStore.user?._id,
      villageId: userStore.villageId,
      timestamp: Date.now()
    });
  }

  /**
   * 获取连接信息
   */
  function getConnectionInfo() {
    return {
      isConnected: isConnected.value,
      isConnecting: isConnecting.value,
      status: connectionStatus.value,
      socketId: socketService.socket?.id || null,
      lastUpdate: lastUpdate.value
    };
  }

  // 生命周期管理
  onMounted(() => {
    connect();
  });

  onUnmounted(() => {
    disconnect();
  });

  return {
    // 状态
    isConnected,
    isConnecting,
    connectionStatus,
    lastUpdate,

    // 连接管理
    connect,
    disconnect,
    refreshData,
    sendHeartbeat,
    getConnectionInfo,

    // Socket 服务实例（供高级使用）
    socketService
  };
}

/**
 * 自动连接的仪表板实时更新 Hook
 * 在组件挂载时自动连接，卸载时自动断开
 */
export function useDashboardRealtimeAuto(options = {}) {
  return useDashboardRealtime(options);
}

export default useDashboardRealtime;
