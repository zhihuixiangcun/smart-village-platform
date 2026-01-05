import { ref, reactive, computed, nextTick } from 'vue';
import { ElNotification, ElMessage } from 'element-plus';

/**
 * 实时通知系统组合式函数
 */
export function useNotificationSystem() {
  // 通知队列
  const notifications = ref([]);
  const maxNotifications = 5;
  const defaultDuration = 4500;

  // 通知音效设置
  const soundEnabled = ref(true);
  const vibrationEnabled = ref(true);

  // 通知类型配置
  const notificationTypes = {
    approval: {
      icon: '📋',
      color: '#409eff',
      sound: 'notification',
      title: '审批通知'
    },
    budget: {
      icon: '💰',
      color: '#e6a23c',
      sound: 'warning',
      title: '预算提醒'
    },
    expense: {
      icon: '💸',
      color: '#f56c6c',
      sound: 'alert',
      title: '支出提醒'
    },
    system: {
      icon: '⚙️',
      color: '#909399',
      sound: 'info',
      title: '系统通知'
    },
    emergency: {
      icon: '🚨',
      color: '#f56c6c',
      sound: 'emergency',
      title: '紧急通知'
    },
    success: {
      icon: '✅',
      color: '#67c23a',
      sound: 'success',
      title: '操作成功'
    }
  };

  // 通知优先级
  const notificationPriority = {
    low: 1,
    normal: 2,
    high: 3,
    urgent: 4,
    emergency: 5
  };

  /**
   * 显示通知
   * @param {Object} options - 通知选项
   */
  const showNotification = async (options) => {
    const {
      type = 'system',
      title,
      message,
      priority = 'normal',
      duration = defaultDuration,
      actions = [],
      persistent = false,
      customIcon,
      customColor,
      data = {}
    } = options;

    const config = notificationTypes[type] || notificationTypes.system;
    const notificationId = generateNotificationId();

    const notification = {
      id: notificationId,
      type,
      title: title || config.title,
      message,
      priority: notificationPriority[priority],
      icon: customIcon || config.icon,
      color: customColor || config.color,
      timestamp: new Date(),
      duration: persistent ? 0 : duration,
      actions,
      data,
      read: false,
      dismissed: false
    };

    // 添加到通知队列
    addToQueue(notification);

    // 播放通知音效
    if (soundEnabled.value) {
      playNotificationSound(config.sound, priority);
    }

    // 触觉反馈
    if (vibrationEnabled.value) {
      triggerVibration(priority);
    }

    // 显示桌面通知
    if (shouldShowDesktopNotification(priority)) {
      showDesktopNotification(notification);
    }

    // 显示ElementPlus通知
    showElementNotification(notification);

    return notificationId;
  };

  /**
   * 添加通知到队列
   */
  const addToQueue = (notification) => {
    // 移除超出限制的通知
    if (notifications.value.length >= maxNotifications) {
      notifications.value.splice(0, notifications.value.length - maxNotifications + 1);
    }

    // 按优先级插入
    const insertIndex = notifications.value.findIndex(
      n => n.priority < notification.priority
    );

    if (insertIndex === -1) {
      notifications.value.push(notification);
    } else {
      notifications.value.splice(insertIndex, 0, notification);
    }
  };

  /**
   * 播放通知音效
   */
  const playNotificationSound = (soundType, priority) => {
    try {
      // 根据优先级选择音效
      const soundMap = {
        emergency: '/sounds/emergency.mp3',
        warning: '/sounds/warning.mp3',
        alert: '/sounds/alert.mp3',
        notification: '/sounds/notification.mp3',
        success: '/sounds/success.mp3',
        info: '/sounds/info.mp3'
      };

      const soundFile = soundMap[soundType] || soundMap.notification;
      const audio = new Audio(soundFile);

      // 根据优先级调整音量
      audio.volume = priority === 'emergency' ? 0.8 : 0.5;
      audio.play().catch(() => {
        // 静默处理音频播放失败
      });
    } catch (error) {
      console.warn('音效播放失败:', error);
    }
  };

  /**
   * 触觉反馈
   */
  const triggerVibration = (priority) => {
    if ('vibrate' in navigator) {
      const patterns = {
        low: [50],
        normal: [100],
        high: [150],
        urgent: [100, 50, 100],
        emergency: [200, 100, 200, 100, 200]
      };
      navigator.vibrate(patterns[priority] || patterns.normal);
    }
  };

  /**
   * 显示桌面通知
   */
  const showDesktopNotification = async (notification) => {
    if ('Notification' in window) {
      // 请求权限
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      if (Notification.permission === 'granted') {
        const desktopNotification = new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          badge: '/badge.png',
          tag: notification.id,
          requireInteraction: notification.priority >= 4,
          silent: false,
          timestamp: notification.timestamp.getTime()
        });

        // 处理点击事件
        desktopNotification.onclick = () => {
          window.focus();
          handleNotificationClick(notification);
        };

        // 自动关闭
        if (notification.duration > 0) {
          setTimeout(() => {
            desktopNotification.close();
          }, notification.duration);
        }
      }
    }
  };

  /**
   * 显示ElementPlus通知
   */
  const showElementNotification = (notification) => {
    const elementType = getElementNotificationType(notification.type);

    ElNotification({
      title: notification.title,
      message: notification.message,
      type: elementType,
      duration: notification.duration,
      position: 'top-right',
      showClose: true,
      dangerouslyUseHTMLString: false,
      onClick: () => handleNotificationClick(notification),
      onClose: () => markNotificationRead(notification.id)
    });
  };

  /**
   * 获取ElementPlus通知类型
   */
  const getElementNotificationType = (type) => {
    const typeMap = {
      success: 'success',
      approval: 'info',
      budget: 'warning',
      expense: 'warning',
      emergency: 'error',
      system: 'info'
    };
    return typeMap[type] || 'info';
  };

  /**
   * 处理通知点击
   */
  const handleNotificationClick = (notification) => {
    markNotificationRead(notification.id);

    // 根据通知类型执行相应操作
    switch (notification.type) {
    case 'approval':
      // 跳转到审批页面
      if (notification.data.approvalId) {
        window.location.href = `/finance/approval/${notification.data.approvalId}`;
      }
      break;
    case 'budget':
      // 跳转到预算页面
      window.location.href = '/finance/budget';
      break;
    case 'expense':
      // 跳转到支出页面
      if (notification.data.expenseId) {
        window.location.href = `/finance/expenses/${notification.data.expenseId}`;
      }
      break;
    default:
      // 默认操作
      break;
    }
  };

  /**
   * 标记通知为已读
   */
  const markNotificationRead = (notificationId) => {
    const notification = notifications.value.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  };

  /**
   * 标记所有通知为已读
   */
  const markAllRead = () => {
    notifications.value.forEach(notification => {
      notification.read = true;
    });
  };

  /**
   * 清除通知
   */
  const dismissNotification = (notificationId) => {
    const index = notifications.value.findIndex(n => n.id === notificationId);
    if (index > -1) {
      notifications.value.splice(index, 1);
    }
  };

  /**
   * 清除所有通知
   */
  const clearAllNotifications = () => {
    notifications.value.splice(0);
  };

  /**
   * 判断是否应该显示桌面通知
   */
  const shouldShowDesktopNotification = (priority) => {
    return priority === 'urgent' || priority === 'emergency';
  };

  /**
   * 生成通知ID
   */
  const generateNotificationId = () => {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * 预定义的通知类型方法
   */
  const showApprovalNotification = (options) => {
    return showNotification({
      type: 'approval',
      priority: 'high',
      ...options
    });
  };

  const showBudgetWarning = (options) => {
    return showNotification({
      type: 'budget',
      priority: 'high',
      ...options
    });
  };

  const showExpenseAlert = (options) => {
    return showNotification({
      type: 'expense',
      priority: 'normal',
      ...options
    });
  };

  const showEmergencyAlert = (options) => {
    return showNotification({
      type: 'emergency',
      priority: 'emergency',
      persistent: true,
      ...options
    });
  };

  const showSuccessNotification = (options) => {
    return showNotification({
      type: 'success',
      priority: 'normal',
      duration: 3000,
      ...options
    });
  };

  // 计算属性
  const unreadCount = computed(() => {
    return notifications.value.filter(n => !n.read && !n.dismissed).length;
  });

  const hasUnread = computed(() => {
    return unreadCount.value > 0;
  });

  const sortedNotifications = computed(() => {
    return [...notifications.value].sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return b.timestamp - a.timestamp;
    });
  });

  // 通知设置
  const updateNotificationSettings = (settings) => {
    if (settings.hasOwnProperty('sound')) {
      soundEnabled.value = settings.sound;
    }
    if (settings.hasOwnProperty('vibration')) {
      vibrationEnabled.value = settings.vibration;
    }
  };

  return {
    // 数据
    notifications,
    unreadCount,
    hasUnread,
    sortedNotifications,
    soundEnabled,
    vibrationEnabled,

    // 方法
    showNotification,
    showApprovalNotification,
    showBudgetWarning,
    showExpenseAlert,
    showEmergencyAlert,
    showSuccessNotification,
    markNotificationRead,
    markAllRead,
    dismissNotification,
    clearAllNotifications,
    updateNotificationSettings
  };
}

/**
 * 通知中心组合式函数
 */
export function useNotificationCenter() {
  const {
    notifications,
    unreadCount,
    hasUnread,
    sortedNotifications,
    markNotificationRead,
    markAllRead,
    dismissNotification,
    clearAllNotifications
  } = useNotificationSystem();

  const centerVisible = ref(false);

  const showNotificationCenter = () => {
    centerVisible.value = true;
  };

  const hideNotificationCenter = () => {
    centerVisible.value = false;
  };

  const toggleNotificationCenter = () => {
    centerVisible.value = !centerVisible.value;
  };

  return {
    centerVisible,
    notifications,
    unreadCount,
    hasUnread,
    sortedNotifications,
    showNotificationCenter,
    hideNotificationCenter,
    toggleNotificationCenter,
    markNotificationRead,
    markAllRead,
    dismissNotification,
    clearAllNotifications
  };
}