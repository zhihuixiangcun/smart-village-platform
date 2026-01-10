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
    'new-notification': data => {
      lastUpdate.value = { type: 'notification', data, timestamp: Date.now() };
      options.onNotificationUpdate?.(data);
    },

    'notification-read': data => {
      options.onNotificationUpdate?.(data);
    },

    'notification-deleted': data => {
      options.onNotificationUpdate?.(data);
    },

    'new-todo': data => {
      lastUpdate.value = { type: 'todo', data, timestamp: Date.now() };
      options.onTodoUpdate?.(data);
    },

    'todo-updated': data => {
      options.onTodoUpdate?.(data);
    },

    'todo-completed': data => {
      options.onTodoUpdate?.(data);
    },

    'duty-schedule-updated': data => {
      lastUpdate.value = { type: 'duty', data, timestamp: Date.now() };
      options.onDutyUpdate?.(data);
    },

    'statistics-updated': data => {
      options.onStatisticsUpdate?.(data);
    },

    'activity-new': data => {},

    'emergency-alert': data => {
      lastUpdate.value = { type: 'emergency', data, timestamp: Date.now() };
      options.onEmergencyAlert?.(data);
    },

    'system-notification': data => {
      options.onSystemNotification?.(data);
    },

    'village-update': data => {
      options.onVillageUpdate?.(data);
    },
  };

  /**
   * 连接到 Socket.IO 服务器
   */
  function connect() {
    if (isConnected.value || isConnecting.value) {
      return;
    }

    isConnecting.value = true;
    connectionStatus.value = 'connecting';

    try {
      if (!socketService.socket) {
        socketService.connect();
      }

      const checkConnection = setInterval(() => {
        if (socketService.isConnected) {
          clearInterval(checkConnection);
          setupEventListeners();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkConnection);
        if (isConnecting.value) {
          isConnecting.value = false;
          connectionStatus.value = 'error';
        }
      }, 5000);
    } catch (error) {
      isConnecting.value = false;
      connectionStatus.value = 'error';
    }
  }

  /**
   * 设置事件监听器
   */
  function setupEventListeners() {
    if (!socketService.socket) {
      return;
    }

    const socket = socketService.socket;

    Object.keys(handlers).forEach(event => {
      socket.on(event, handlers[event]);
    });

    socket.on('connect', () => {
      isConnected.value = true;
      isConnecting.value = false;
      connectionStatus.value = 'connected';

      joinVillageRoom();
    });

    socket.on('disconnect', () => {
      isConnected.value = false;
      connectionStatus.value = 'disconnected';
    });

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
  }

  /**
   * 断开连接
   */
  function disconnect() {
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
      return false;
    }

    socketService.socket.emit('dashboard-refresh', {
      villageId: userStore.villageId,
      dataType,
      userId: userStore.user?.id || userStore.user?._id,
    });

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
      timestamp: Date.now(),
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
      lastUpdate: lastUpdate.value,
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
    socketService,
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
