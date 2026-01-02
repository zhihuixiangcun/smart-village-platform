<template>
  <div
    class="conversation-item"
    :class="{ active: isActive, muted: isMuted }"
    @click="$emit('click')"
  >
    <div class="avatar">
      <el-avatar
        v-if="conversation.type === 'private'"
        :src="otherUser?.profile?.avatar"
        :size="50"
      >
        {{ otherUser?.profile?.nickName?.charAt(0) || otherUser?.username?.charAt(0) }}
      </el-avatar>
      <el-avatar v-else :size="50">
        {{ conversation.groupInfo?.name?.charAt(0) }}
      </el-avatar>
    </div>

    <div class="content">
      <div class="top-row">
        <span class="name">{{ displayName }}</span>
        <span class="time">{{ formattedTime }}</span>
      </div>
      <div class="bottom-row">
        <span class="last-message">{{ lastMessagePreview }}</span>
        <div class="badges">
          <el-badge v-if="unreadCount > 0" :value="unreadCount" :max="99" />
          <el-icon v-if="isPinned" class="pinned-icon"><Top /></el-icon>
          <el-icon v-if="isMuted" class="muted-icon"><Bell /></el-icon>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Top, Bell } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  conversation: {
    type: Object,
    required: true
  },
  currentId: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])

const userStore = useUserStore()
const currentUserId = userStore.user?.id

// 获取私聊对方的用户信息
const otherUser = computed(() => {
  if (props.conversation.type === 'private') {
    return props.conversation.participants.find(p => p._id !== currentUserId)
  }
  return null
})

// 显示名称
const displayName = computed(() => {
  if (props.conversation.type === 'group') {
    return props.conversation.groupInfo?.name || '群聊'
  } else {
    return otherUser.value?.profile?.nickName || otherUser.value?.username || '未知用户'
  }
})

// 格式化时间
const formattedTime = computed(() => {
  const lastMessageAt = props.conversation.lastMessageAt
  if (!lastMessageAt) return ''

  const now = new Date()
  const msgDate = new Date(lastMessageAt)
  const diffMs = now - msgDate
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`

  // 超过一周显示具体日期
  return msgDate.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
})

// 最后一条消息预览
const lastMessagePreview = computed(() => {
  const lastMessage = props.conversation.lastMessage
  if (!lastMessage) return '暂无消息'

  // 根据消息类型返回不同预览
  switch (lastMessage.type) {
    case 'text':
      return lastMessage.content?.text || '[文本]'
    case 'image':
      return '[图片]'
    case 'voice':
      return '[语音]'
    case 'video':
      return '[视频]'
    case 'file':
      return '[文件]'
    case 'location':
      return '[位置]'
    case 'system':
      return '[系统消息]'
    case 'recall':
      return '[撤回了一条消息]'
    default:
      return '[消息]'
  }
})

// 未读数
const unreadCount = computed(() => {
  return props.conversation.getUnreadCount?.(currentUserId) || 0
})

// 是否置顶
const isPinned = computed(() => {
  return props.conversation.pinnedBy?.some(p => p.user === currentUserId)
})

// 是否静音
const isMuted = computed(() => {
  return props.conversation.mutedBy?.includes(currentUserId)
})
</script>

<style scoped>
.conversation-item {
  display: flex;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
}

.conversation-item:hover {
  background-color: #f5f5f5;
}

.conversation-item.active {
  background-color: #e6f7ff;
}

.conversation-item.muted {
  opacity: 0.6;
}

.avatar {
  margin-right: 12px;
  flex-shrink: 0;
}

.content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.name {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.time {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
  flex-shrink: 0;
}

.bottom-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.last-message {
  font-size: 13px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.badges {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  flex-shrink: 0;
}

.pinned-icon,
.muted-icon {
  font-size: 14px;
  color: #999;
}

/* 微信绿色主题 */
.conversation-item.active .name {
  color: #07c160;
}
</style>
