<template>
  <div class="messages-panel">
    <el-card>
      <template #header>
        <div class="panel-header">
          <div class="header-left">
            <el-icon><ChatDotRound /></el-icon>
            <span>消息中心</span>
          </div>
          <el-button type="primary" text @click="markAllRead">
            全部标为已读
          </el-button>
        </div>
      </template>

      <div v-if="messages.length === 0" class="empty-container">
        <el-empty description="暂无消息" />
      </div>

      <div v-else class="messages-list">
        <div
          v-for="message in messages"
          :key="message._id"
          class="message-item"
          :class="{ unread: !message.read }"
          @click="handleClickMessage(message)"
        >
          <div class="message-avatar">
            <el-avatar :src="message.sender?.avatar || defaultAvatar">
              <el-icon><User /></el-icon>
            </el-avatar>
          </div>
          <div class="message-content">
            <div class="message-header">
              <span class="sender-name">{{ message.sender?.name || '系统通知' }}</span>
              <span class="message-time">{{ formatTime(message.createdAt) }}</span>
            </div>
            <div class="message-body">
              <h5 class="message-title">{{ message.title }}</h5>
              <p class="message-text">{{ message.content }}</p>
            </div>
            <div v-if="message.type" class="message-type">
              <el-tag :type="getMessageType(message.type)" size="small">
                {{ getMessageTypeLabel(message.type) }}
              </el-tag>
            </div>
          </div>
          <div class="message-status">
            <el-badge v-if="!message.read" is-dot />
          </div>
        </div>
      </div>
    </el-card>

    <!-- 消息详情对话框 -->
    <el-dialog v-model="detailDialogVisible" :title="currentMessage?.title" width="500px">
      <div class="message-detail">
        <div class="detail-sender">
          <el-avatar :src="currentMessage?.sender?.avatar || defaultAvatar" />
          <div class="sender-info">
            <div class="sender-name">{{ currentMessage?.sender?.name || '系统通知' }}</div>
            <div class="send-time">{{ formatTime(currentMessage?.createdAt) }}</div>
          </div>
        </div>
        <div class="detail-content">
          {{ currentMessage?.content }}
        </div>
      </div>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button
          v-if="currentMessage?.actionUrl"
          type="primary"
          @click="handleAction"
        >
          查看详情
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ChatDotRound, User } from '@element-plus/icons-vue'
import api from '@/api'

const props = defineProps({
  messages: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['mark-read'])

const detailDialogVisible = ref(false)
const currentMessage = ref(null)

const defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23e0e0e0"/%3E%3C/svg%3E'

const formatTime = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diff = now - d

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`

  return d.toLocaleDateString('zh-CN')
}

const getMessageType = (type) => {
  const types = {
    order: 'warning',
    system: 'info',
    supplier: 'success',
    promotion: 'danger'
  }
  return types[type] || 'info'
}

const getMessageTypeLabel = (type) => {
  const labels = {
    order: '订单通知',
    system: '系统通知',
    supplier: '供应商消息',
    promotion: '促销活动'
  }
  return labels[type] || type
}

const handleClickMessage = (message) => {
  currentMessage.value = message
  detailDialogVisible.value = true
  if (!message.read) {
    emit('mark-read', message)
  }
}

const handleAction = () => {
  if (currentMessage.value?.actionUrl) {
    window.location.href = currentMessage.value.actionUrl
  }
}

const markAllRead = async () => {
  try {
    const response = await api.put('/api/v1/purchaser/messages/read-all')
    if (response.success) {
      ElMessage.success('已全部标记为已读')
    }
  } catch (error) {
    console.error('操作失败', error)
    ElMessage.error('操作失败')
  }
}
</script>

<style scoped>
.messages-panel {
  height: 100%;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.empty-container {
  padding: 40px;
}

.messages-list {
  display: flex;
  flex-direction: column;
}

.message-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #f5f7fa;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.message-item:last-child {
  border-bottom: none;
}

.message-item:hover {
  background: #f5f7fa;
}

.message-item.unread {
  background: #ecf5ff;
}

.message-item.unread::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #409eff;
}

.message-avatar {
  flex-shrink: 0;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.sender-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.message-time {
  font-size: 12px;
  color: #909399;
}

.message-body {
  margin-bottom: 8px;
}

.message-title {
  font-size: 14px;
  color: #303133;
  margin: 0 0 4px;
}

.message-text {
  font-size: 13px;
  color: #606266;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.message-type {
  display: flex;
}

.message-status {
  flex-shrink: 0;
}

.message-detail {
  padding: 16px;
}

.detail-sender {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f5f7fa;
}

.sender-info {
  display: flex;
  flex-direction: column;
}

.sender-name {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}

.send-time {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.detail-content {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
}

@media (max-width: 768px) {
  .message-item {
    flex-wrap: wrap;
  }

  .message-status {
    position: absolute;
    top: 16px;
    right: 16px;
  }
}
</style>
