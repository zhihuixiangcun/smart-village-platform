<template>
  <div class="notification-list">
    <!-- 通知项列表 -->
    <div
      v-for="notification in notifications"
      :key="notification.id"
      class="notification-item"
      :class="{ unread: !notification.read, urgent: notification.priority === 'high' }"
      @click="handleNotificationClick(notification)"
    >
      <div class="notification-avatar">
        <van-icon
          :name="getNotificationIcon(notification.type)"
          :color="getNotificationColor(notification)"
          size="24"
        />
      </div>

      <div class="notification-content">
        <div class="notification-header">
          <h4 class="notification-title">{{ notification.title }}</h4>
          <span class="notification-time">{{ formatTime(notification.time) }}</span>
        </div>
        <p class="notification-message">{{ notification.content }}</p>

        <!-- 操作按钮 -->
        <div class="notification-actions" v-if="notification.action">
          <van-button size="mini" type="primary" @click.stop="handleAction(notification)">
            {{ notification.actionText || '查看' }}
          </van-button>
        </div>
      </div>

      <div class="notification-meta">
        <div class="status-indicator" :class="{ read: notification.read }"></div>
        <van-icon
          name="delete-o"
          size="16"
          color="#999"
          @click.stop="deleteNotification(notification.id)"
        />
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-more">
      <van-loading size="16px" />
      <span>加载中...</span>
    </div>

    <!-- 没有更多 -->
    <div v-if="!loading && notifications.length === 0" class="empty-state">
      <van-empty description="暂无通知" />
    </div>

    <!-- 加载更多按钮 -->
    <div
      v-if="!loading && notifications.length > 0 && hasMore"
      class="load-more"
      @click="$emit('loadMore')"
    >
      加载更多
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';

const props = defineProps({
  notifications: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  hasMore: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['markRead', 'delete', 'loadMore']);

const router = useRouter();

// 方法
const handleNotificationClick = notification => {
  // 标记为已读
  if (!notification.read) {
    emit('markRead', notification.id);
  }

  // 处理点击事件
  handleNotificationAction(notification);
};

const handleAction = notification => {
  handleNotificationAction(notification);
};

const handleNotificationAction = notification => {
  switch (notification.action) {
    case 'handle_emergency':
      router.push('/village/emergency');
      break;
    case 'view_document':
      if (notification.data?.collectionId) {
        router.push(`/village/documents/${notification.data.collectionId}`);
      }
      break;
    case 'view_user':
      if (notification.data?.userId) {
        router.push(`/village/users/${notification.data.userId}`);
      }
      break;
    default:
      // 默认跳转到相关页面
      if (notification.data?.url) {
        router.push(notification.data.url);
      }
  }
};

const deleteNotification = notificationId => {
  emit('delete', notificationId);
};

const getNotificationIcon = type => {
  const iconMap = {
    document_created: 'add-o',
    document_updated: 'edit',
    document_approved: 'passed',
    document_rejected: 'close',
    emergency_call: 'warning-o',
    duty_assigned: 'calendar-o',
    user_registered: 'user-o',
    system: 'info-o',
    permission_update: 'shield-o',
    task_completed: 'checked',
    reminder: 'clock-o',
  };
  return iconMap[type] || 'info-o';
};

const getNotificationColor = notification => {
  if (notification.priority === 'high') {
    return '#ff4d4f';
  } else if (notification.type?.includes('document')) {
    return '#1890ff';
  } else if (notification.type?.includes('emergency')) {
    return '#ff4d4f';
  } else if (notification.type === 'system') {
    return '#52c41a';
  }
  return '#666';
};

const formatTime = time => {
  const now = new Date();
  const notificationTime = new Date(time);
  const diff = now - notificationTime;

  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`;
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`;
  } else if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)}天前`;
  } else {
    return notificationTime.toLocaleDateString();
  }
};
</script>

<style scoped>
.notification-list {
  height: 100%;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  background: white;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.notification-item:hover {
  background: #f9f9f9;
}

.notification-item.unread {
  background: #f6ffed;
  border-left: 3px solid #52c41a;
}

.notification-item.urgent {
  background: #fff2f0;
  border-left: 3px solid #ff4d4f;
}

.notification-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
}

.notification-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
  flex: 1;
  min-width: 0;
}

.notification-time {
  color: #999;
  font-size: 12px;
  white-space: nowrap;
  margin-left: 8px;
}

.notification-message {
  margin: 0;
  font-size: 14px;
  color: #666;
  line-height: 1.4;
  word-break: break-word;
}

.notification-actions {
  margin-top: 8px;
}

.notification-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-left: 12px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #52c41a;
}

.status-indicator.read {
  background: #d9d9d9;
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: #999;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
}

.load-more {
  text-align: center;
  padding: 16px;
  color: #1890ff;
  cursor: pointer;
  font-size: 14px;
}

.load-more:hover {
  background: #f9f9f9;
}
</style>
