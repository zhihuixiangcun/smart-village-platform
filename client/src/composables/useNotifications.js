/**
 * 消息通知 Composable
 */
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { ElMessage } from 'element-plus';
import { useUserStore } from '@/stores/userStore';
import axios from 'axios';

export const useNotifications = () => {
  const userStore = useUserStore();
  const notifications = ref([]);
  const unreadCount = ref(0);
  const loading = ref(false);

  let pollingTimer = null;
  let eventSource = null;

  /**
   * 获取通知列表
   */
  const fetchNotifications = async () => {
    const userId = userStore.userInfo?.id;
    if (!userId) return;

    loading.value = true;
    try {
      const { data } = await axios.get('/api/notifications', {
        params: { userId },
      });

      if (data.success) {
        notifications.value = data.data || [];
        unreadCount.value = notifications.value.filter(n => !n.isRead).length;
      }
    } catch (error) {
      console.error('获取通知失败:', error);
    } finally {
      loading.value = false;
    }
  };

  /**
   * 标记为已读
   */
  const markAsRead = async notificationId => {
    try {
      const { data } = await axios.put(`/api/notifications/${notificationId}/read`);

      if (data.success) {
        const notification = notifications.value.find(n => n.id === notificationId);
        if (notification) {
          notification.isRead = true;
          unreadCount.value = Math.max(0, unreadCount.value - 1);
        }
      }
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };

  /**
   * 全部标记为已读
   */
  const markAllAsRead = async () => {
    const userId = userStore.userInfo?.id;
    if (!userId) return;

    try {
      const { data } = await axios.put('/api/notifications/read-all', {
        userId,
      });

      if (data.success) {
        notifications.value.forEach(n => (n.isRead = true));
        unreadCount.value = 0;
        ElMessage.success('全部已标记为已读');
      }
    } catch (error) {
      console.error('标记全部已读失败:', error);
    }
  };

  /**
   * 删除通知
   */
  const deleteNotification = async notificationId => {
    try {
      const { data } = await axios.delete(`/api/notifications/${notificationId}`);

      if (data.success) {
        const notification = notifications.value.find(n => n.id === notificationId);
        if (notification && !notification.isRead) {
          unreadCount.value = Math.max(0, unreadCount.value - 1);
        }

        notifications.value = notifications.value.filter(n => n.id !== notificationId);
        ElMessage.success('通知已删除');
      }
    } catch (error) {
      console.error('删除通知失败:', error);
    }
  };

  /**
   * 发送拼车预订通知
   */
  const sendCarpoolNotification = async (carpoolId, driverId, passengerInfo) => {
    try {
      await axios.post('/api/notifications/carpool', {
        type: 'carpool',
        carpoolId,
        driverId,
        passengerInfo,
        title: '新的拼车预订',
        content: `${passengerInfo.name} 预订了您的拼车服务`,
      });
    } catch (error) {
      console.error('发送拼车通知失败:', error);
    }
  };

  /**
   * 发送系统通知
   */
  const sendSystemNotification = async (userId, title, content, data = null) => {
    try {
      await axios.post('/api/notifications/system', {
        userId,
        type: 'system',
        title,
        content,
        data,
      });
    } catch (error) {
      console.error('发送系统通知失败:', error);
    }
  };

  /**
   * 初始化实时通知（Server-Sent Events）
   */
  const initRealtimeNotifications = () => {
    const userId = userStore.userInfo?.id;
    if (!userId) return;

    // 使用 Server-Sent Events
    eventSource = new EventSource(`/api/notifications/stream?userId=${userId}`);

    eventSource.onmessage = event => {
      try {
        const notification = JSON.parse(event.data);

        // 添加到通知列表
        notifications.value.unshift(notification);

        // 更新未读数
        if (!notification.isRead) {
          unreadCount.value++;
        }

        // 显示桌面通知
        showDesktopNotification(notification);

        // 显示页面内通知
        showPageNotification(notification);
      } catch (error) {
        console.error('解析通知失败:', error);
      }
    };

    eventSource.onerror = error => {
      console.error('SSE连接错误:', error);

      // 降级到轮询
      if (eventSource.readyState === EventSource.CLOSED) {
        startPolling();
      }
    };
  };

  /**
   * 开始轮询（降级方案）
   */
  const startPolling = () => {
    if (pollingTimer) return;

    pollingTimer = setInterval(async () => {
      await fetchNotifications();
    }, 30000); // 每30秒轮询一次
  };

  /**
   * 停止轮询
   */
  const stopPolling = () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  };

  /**
   * 显示桌面通知
   */
  const showDesktopNotification = notification => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.content,
        icon: '/logo.png',
        tag: notification.id,
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(notification.title, {
            body: notification.content,
            icon: '/logo.png',
          });
        }
      });
    }
  };

  /**
   * 显示页面内通知
   */
  const showPageNotification = notification => {
    const typeMap = {
      carpool: 'info',
      order: 'success',
      review: 'warning',
      system: 'info',
    };

    ElNotification({
      title: notification.title,
      message: notification.content,
      type: typeMap[notification.type] || 'info',
      duration: 5000,
      onClick: () => {
        markAsRead(notification.id);
        // 可以根据通知类型跳转到相应页面
        handleNotificationClick(notification);
      },
    });
  };

  /**
   * 处理通知点击
   */
  const handleNotificationClick = notification => {
    switch (notification.type) {
    case 'carpool':
      // 跳转到拼车详情
      console.log('跳转到拼车详情:', notification.data?.carpoolId);
      break;
    case 'order':
      // 跳转到订单详情
      console.log('跳转到订单详情:', notification.data?.orderId);
      break;
    case 'review':
      // 跳转到评价页面
      console.log('跳转到评价页面:', notification.data?.targetId);
      break;
    default:
      break;
    }
  };

  /**
   * 清理资源
   */
  const cleanup = () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    stopPolling();
  };

  // 生命周期
  onMounted(() => {
    fetchNotifications();
    initRealtimeNotifications();
  });

  onBeforeUnmount(() => {
    cleanup();
  });

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    sendCarpoolNotification,
    sendSystemNotification,
    cleanup,
  };
};

export default useNotifications;
