<template>
  <div class="realtime-notifications">
    <!-- 通知中心入口 -->
    <van-badge
      :content="unreadCount > 0 ? unreadCount : ''"
      :dot="unreadCount > 99"
      @click="showNotifications = true"
      class="notification-bell"
    >
      <van-icon name="bell" size="24" />
    </van-badge>

    <!-- 通知中心弹窗 -->
    <van-popup
      v-model:show="showNotifications"
      position="right"
      :style="{ width: '100%', height: '100%' }"
      class="notification-drawer"
    >
      <div class="notification-header">
        <h3>通知中心</h3>
        <div class="header-actions">
          <span
            v-if="unreadCount > 0"
            class="mark-all-read"
            @click="markAllAsRead"
          >
            全部已读
          </span>
          <van-icon name="cross" @click="showNotifications = false" />
        </div>
      </div>

      <!-- 通知分类标签 -->
      <van-tabs v-model:active="activeTab" class="notification-tabs">
        <van-tab title="全部" name="all">
          <NotificationList
            :notifications="allNotifications"
            :loading="loading"
            @load-more="loadMore"
            @mark-read="markAsRead"
            @delete="deleteNotification"
          />
        </van-tab>
        <van-tab title="未读" name="unread">
          <NotificationList
            :notifications="unreadNotifications"
            :loading="loading"
            @load-more="loadMore"
            @mark-read="markAsRead"
            @delete="deleteNotification"
          />
        </van-tab>
        <van-tab title="紧急" name="urgent">
          <NotificationList
            :notifications="urgentNotifications"
            :loading="loading"
            @load-more="loadMore"
            @mark-read="markAsRead"
            @delete="deleteNotification"
          />
        </van-tab>
      </van-tabs>
    </van-popup>

    <!-- 实时通知弹窗 -->
    <van-popup
      v-model:show="showRealtimeAlert"
      position="top"
      :style="{ top: '20%' }"
      class="realtime-alert"
    >
      <div class="alert-content" :class="currentAlert?.type">
        <div class="alert-icon">
          <van-icon :name="getAlertIcon(currentAlert?.type)" />
        </div>
        <div class="alert-info">
          <div class="alert-title">{{ currentAlert?.title }}</div>
          <div class="alert-message">{{ currentAlert?.content }}</div>
        </div>
        <div class="alert-actions">
          <van-button
            v-if="currentAlert?.action"
            size="small"
            type="primary"
            @click="handleAlertAction"
          >
            {{ currentAlert.actionText || '查看' }}
          </van-button>
          <van-button size="small" @click="dismissAlert">关闭</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 连接状态指示器 -->
    <div
      v-if="showConnectionStatus"
      class="connection-status"
      :class="{ 'connected': isConnected }"
    >
      <van-icon :name="isConnected ? 'passed' : 'close'" />
      <span>{{ isConnected ? '已连接' : '连接中...' }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue'
import { showToast } from 'vant'
import realtimeNotification from '@/services/realtimeNotification'
import NotificationList from './NotificationList.vue'

// 响应式数据
const showNotifications = ref(false)
const showRealtimeAlert = ref(false)
const showConnectionStatus = ref(false)
const activeTab = ref('all')
const loading = ref(false)
const isConnected = ref(false)

const notifications = ref([])
const currentAlert = ref(null)

// 计算属性
const unreadCount = computed(() => {
  return notifications.value.filter(n => !n.read).length
})

const allNotifications = computed(() => {
  return notifications.value
})

const unreadNotifications = computed(() => {
  return notifications.value.filter(n => !n.read)
})

const urgentNotifications = computed(() => {
  return notifications.value.filter(n => n.priority === 'high')
})

// 方法
const loadNotifications = async () => {
  loading.value = true
  try {
    // 这里调用获取通知列表的API
    // const response = await notificationApi.getNotifications()
    // notifications.value = response.data.data

    // 模拟数据
    notifications.value = [
      {
        id: '1',
        type: 'document_created',
        title: '新的资料收集任务',
        content: '张三 创建了资料收集任务: 2024年度村民信息统计',
        time: new Date(Date.now() - 1000 * 60 * 5),
        read: false,
        priority: 'normal',
        data: { collectionId: '123' }
      },
      {
        id: '2',
        type: 'emergency_call',
        title: '🚨 紧急呼叫',
        content: '李四 发起紧急呼叫: 办公室设备故障',
        time: new Date(Date.now() - 1000 * 60 * 30),
        read: false,
        priority: 'high',
        action: 'handle_emergency',
        actionText: '处理'
      },
      {
        id: '3',
        type: 'system',
        title: '系统维护通知',
        content: '系统将于今晚22:00进行维护升级',
        time: new Date(Date.now() - 1000 * 60 * 60),
        read: true,
        priority: 'normal'
      }
    ]
  } catch (error) {
    console.error('加载通知失败:', error)
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  // 加载更多通知
  console.log('加载更多通知')
}

const markAsRead = async (notificationId) => {
  try {
    const notification = notifications.value.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
      // await notificationApi.markAsRead(notificationId)
    }
  } catch (error) {
    console.error('标记已读失败:', error)
  }
}

const markAllAsRead = async () => {
  try {
    notifications.value.forEach(n => n.read = true)
    // await notificationApi.markAllAsRead()
    showToast('已全部标记为已读')
  } catch (error) {
    console.error('标记全部已读失败:', error)
  }
}

const deleteNotification = async (notificationId) => {
  try {
    const index = notifications.value.findIndex(n => n.id === notificationId)
    if (index > -1) {
      notifications.value.splice(index, 1)
      // await notificationApi.deleteNotification(notificationId)
    }
  } catch (error) {
    console.error('删除通知失败:', error)
  }
}

const handleRealtimeNotification = (notification) => {
  // 添加到通知列表
  notifications.value.unshift({
    id: Date.now().toString(),
    ...notification,
    time: new Date(),
    read: false
  })

  // 如果是紧急通知，显示弹窗
  if (notification.priority === 'high') {
    currentAlert.value = notification
    showRealtimeAlert.value = true
  }
}

const getAlertIcon = (type) => {
  const iconMap = {
    'document_created': 'add-o',
    'document_updated': 'edit',
    'emergency_call': 'warning-o',
    'system': 'info-o',
    'permission_update': 'shield-o'
  }
  return iconMap[type] || 'info-o'
}

const handleAlertAction = () => {
  if (currentAlert.value?.action) {
    // 处理通知动作
    switch (currentAlert.value.action) {
      case 'handle_emergency':
        // 跳转到紧急处理页面
        const router = require('@/router').default
        router.push('/village/emergency')
        break
      case 'view_document':
        // 跳转到文档详情
        router.push(`/village/documents/${currentAlert.value.data.collectionId}`)
        break
    }
  }

  dismissAlert()
}

const dismissAlert = () => {
  showRealtimeAlert.value = false
  currentAlert.value = null
}

const updateConnectionStatus = (status) => {
  isConnected.value = status.connected

  // 显示连接状态提示
  if (!status.connected) {
    showConnectionStatus.value = true
    setTimeout(() => {
      showConnectionStatus.value = false
    }, 3000)
  }
}

// 监听通知数量变化
watch(unreadCount, (count) => {
  // 更新应用角标（如果支持）
  if ('setAppBadge' in navigator) {
    if (count > 0) {
      navigator.setAppBadge(count)
    } else {
      navigator.setAppBadge(0)
    }
  }
})

// 生命周期
onMounted(() => {
  // 加载通知列表
  loadNotifications()

  // 监听实时通知
  realtimeNotification.on('notification', handleRealtimeNotification)
  realtimeNotification.on('emergency', handleRealtimeNotification)
  realtimeNotification.on('system', handleRealtimeNotification)

  // 监听连接状态
  realtimeNotification.on('connection', updateConnectionStatus)

  // 初始化连接状态
  const status = realtimeNotification.getConnectionStatus()
  isConnected.value = status.connected
})

onUnmounted(() => {
  // 移除事件监听
  realtimeNotification.off('notification', handleRealtimeNotification)
  realtimeNotification.off('emergency', handleRealtimeNotification)
  realtimeNotification.off('system', handleRealtimeNotification)
  realtimeNotification.off('connection', updateConnectionStatus)
})
</script>

<style scoped>
.realtime-notifications {
  position: relative;
}

.notification-bell {
  position: relative;
  cursor: pointer;
  padding: 8px;
}

.notification-bell:hover {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 50%;
}

.notification-drawer {
  background: white;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.notification-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.mark-all-read {
  color: #1989fa;
  font-size: 14px;
  cursor: pointer;
}

.notification-tabs {
  height: calc(100% - 60px);
}

.realtime-alert {
  background: transparent;
}

.alert-content {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin: 0 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 12px;
}

.alert-content.emergency {
  border-left: 4px solid #ff4d4f;
}

.alert-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  color: #666;
}

.alert-content.emergency .alert-icon {
  background: #fff2f0;
  color: #ff4d4f;
}

.alert-info {
  flex: 1;
}

.alert-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.alert-message {
  font-size: 14px;
  color: #666;
  line-height: 1.4;
}

.alert-actions {
  display: flex;
  gap: 8px;
}

.connection-status {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  z-index: 9999;
  transition: all 0.3s ease;
}

.connection-status.connected {
  background: rgba(82, 196, 26, 0.8);
}

.connection-status .van-icon {
  font-size: 14px;
}
</style>