import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref([]);
  const unreadCount = computed(() => notifications.value.filter(n => !n.read).length);

  const addNotification = notification => {
    notifications.value.unshift({
      id: Date.now(),
      ...notification,
      read: false,
      createdAt: new Date(),
    });
  };

  const markAsRead = id => {
    const notification = notifications.value.find(n => n.id === id);
    if (notification) {
      notification.read = true;
    }
  };

  const markAllAsRead = () => {
    notifications.value.forEach(n => (n.read = true));
  };

  const removeNotification = id => {
    notifications.value = notifications.value.filter(n => n.id !== id);
  };

  const clearAll = () => {
    notifications.value = [];
  };

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  };
});
