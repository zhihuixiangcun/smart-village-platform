<template>
  <div class="chat-page">
    <!-- 顶部导航栏 -->
    <div class="chat-header">
      <div class="header-title">消息</div>
      <div class="header-actions">
        <!-- 好友申请入口（带红点） -->
        <button class="icon-btn relative" @click="goToFriendRequests">
          <span class="icon">👥</span>
          <span v-if="pendingRequestsCount > 0" class="action-badge">
            {{ pendingRequestsCount > 99 ? '99+' : pendingRequestsCount }}
          </span>
        </button>
        <button class="icon-btn" @click="goToAddFriend">
          <span class="icon">➕</span>
        </button>
      </div>
    </div>

    <!-- 搜索框 -->
    <div class="search-bar">
      <div class="search-input-wrapper">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchText"
          type="text"
          class="search-input"
          placeholder="搜索联系人或群聊"
          :class="{ 'large-text': isElderlyMode }"
        />
      </div>
    </div>

    <!-- 会话列表 -->
    <div class="conversation-list" :class="{ 'large-text': isElderlyMode }">
      <div
        v-for="conversation in filteredConversations"
        :key="conversation.id"
        class="conversation-item"
        @click="openChat(conversation)"
      >
        <!-- 头像 -->
        <div class="avatar-wrapper">
          <div class="avatar">{{ conversation.avatar }}</div>
          <div v-if="conversation.online" class="online-indicator"></div>
        </div>

        <!-- 会话信息 -->
        <div class="conversation-info">
          <div class="conversation-top">
            <span class="name">{{ conversation.name }}</span>
            <span class="time">{{ formatTime(conversation.lastMessageTime) }}</span>
          </div>
          <div class="conversation-bottom">
            <span class="last-message">{{ conversation.lastMessage || '暂无消息' }}</span>
            <span v-if="conversation.unreadCount > 0" class="unread-badge">
              {{ conversation.unreadCount > 99 ? '99+' : conversation.unreadCount }}
            </span>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredConversations.length === 0" class="empty-state">
        <div class="empty-icon">💬</div>
        <div class="empty-text">暂无会话</div>
        <div class="empty-hint">点击右下角按钮开始新对话</div>
      </div>
    </div>

    <!-- 添加新会话按钮 -->
    <button class="fab-button" @click="showNewChatMenu">
      <span class="fab-icon">✏️</span>
    </button>

    <!-- 新建聊天菜单 -->
    <div v-if="showMenu" class="menu-overlay" @click="hideNewChatMenu">
      <div class="menu-content" @click.stop>
        <div class="menu-item" @click="startNewChat">
          <span class="menu-icon">👤</span>
          <span class="menu-text">发起私聊</span>
        </div>
        <div class="menu-item" @click="createGroup">
          <span class="menu-icon">👥</span>
          <span class="menu-text">创建群聊</span>
        </div>
        <div class="menu-item" @click="scanToChat">
          <span class="menu-icon">📱</span>
          <span class="menu-text">扫码加好友</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/store/chat'
import { useElderlyStore } from '@/store/elderly'

const router = useRouter()
const chatStore = useChatStore()
const elderlyStore = useElderlyStore()

// 搜索文本
const searchText = ref('')

// 新建聊天菜单显示状态
const showMenu = ref(false)

// 是否适老化模式
const isElderlyMode = computed(() => elderlyStore.isElderlyMode)

// 待处理的好友申请数量
const pendingRequestsCount = computed(() => chatStore.pendingRequestsCount)

// 过滤后的会话列表
const filteredConversations = computed(() => {
  if (!searchText.value) {
    return chatStore.conversations
  }
  const keyword = searchText.value.toLowerCase()
  return chatStore.conversations.filter(conv =>
    conv.name.toLowerCase().includes(keyword)
  )
})

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  // 小于1分钟
  if (diff < 60000) {
    return '刚刚'
  }
  // 小于1小时
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`
  }
  // 今天
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  // 昨天
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return '昨天'
  }
  // 更早
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

// 打开聊天详情
const openChat = (conversation) => {
  chatStore.setActiveConversation(conversation.id)
  router.push(`/chat/detail/${conversation.id}`)
}

// 前往好友申请页面
const goToFriendRequests = () => {
  router.push('/chat/friend-requests')
}

// 前往添加好友页面
const goToAddFriend = () => {
  router.push('/chat/add-friend')
}

// 前往联系人列表
const goToContacts = () => {
  router.push('/chat/contacts')
}

// 前往群聊列表
const goToGroups = () => {
  router.push('/chat/groups')
}

// 显示新建聊天菜单
const showNewChatMenu = () => {
  showMenu.value = true
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

// 隐藏新建聊天菜单
const hideNewChatMenu = () => {
  showMenu.value = false
}

// 发起新私聊
const startNewChat = () => {
  hideNewChatMenu()
  router.push('/chat/new?type=private')
}

// 创建群聊
const createGroup = () => {
  hideNewChatMenu()
  router.push('/chat/new?type=group')
}

// 扫码加好友
const scanToChat = () => {
  hideNewChatMenu()
  // TODO: 实现扫码功能
  console.log('扫码加好友')
}

// 初始化
onMounted(async () => {
  await chatStore.fetchConversations()
})
</script>

<style lang="scss" scoped>
.chat-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #eee;

  .header-title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }

  .header-actions {
    display: flex;
    gap: 12px;

    .icon-btn {
      background: none;
      border: none;
      font-size: 20px;
      padding: 8px;
      cursor: pointer;

      &.relative {
        position: relative;
      }

      .icon {
        display: block;
      }

      .action-badge {
        position: absolute;
        top: 4px;
        right: 4px;
        min-width: 16px;
        height: 16px;
        padding: 0 4px;
        background: #ff4d4f;
        color: #fff;
        font-size: 10px;
        line-height: 16px;
        text-align: center;
        border-radius: 8px;
        transform: scale(1);
        animation: badge-bounce 0.3s ease;
      }
    }
  }
}

.search-bar {
  padding: 12px 16px;
  background: #fff;

  .search-input-wrapper {
    display: flex;
    align-items: center;
    background: #f5f5f5;
    border-radius: 20px;
    padding: 8px 16px;

    .search-icon {
      font-size: 16px;
      margin-right: 8px;
      opacity: 0.5;
    }

    .search-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 14px;
      outline: none;

      &.large-text {
        font-size: 18px;
      }
    }
  }
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;

  &.large-text {
    font-size: 18px;
  }

  .conversation-item {
    display: flex;
    padding: 12px 16px;
    background: #fff;
    border-bottom: 1px solid #f5f5f5;
    cursor: pointer;
    transition: background 0.2s;

    &:active {
      background: #f5f5f5;
    }

    .avatar-wrapper {
      position: relative;
      margin-right: 12px;

      .avatar {
        width: 48px;
        height: 48px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        background: #f0f0f0;
      }

      .online-indicator {
        position: absolute;
        bottom: 2px;
        right: 2px;
        width: 12px;
        height: 12px;
        background: #52c41a;
        border: 2px solid #fff;
        border-radius: 50%;
      }
    }

    .conversation-info {
      flex: 1;
      min-width: 0;

      .conversation-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;

        .name {
          font-size: 16px;
          font-weight: 500;
          color: #333;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .time {
          font-size: 12px;
          color: #999;
          flex-shrink: 0;
          margin-left: 8px;
        }
      }

      .conversation-bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .last-message {
          font-size: 14px;
          color: #999;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }

        .unread-badge {
          background: #ff4d4f;
          color: #fff;
          font-size: 12px;
          min-width: 18px;
          height: 18px;
          line-height: 18px;
          text-align: center;
          border-radius: 9px;
          padding: 0 6px;
          flex-shrink: 0;
          margin-left: 8px;
        }
      }
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;

    .empty-icon {
      font-size: 64px;
      margin-bottom: 16px;
      opacity: 0.3;
    }

    .empty-text {
      font-size: 16px;
      color: #999;
      margin-bottom: 8px;
    }

    .empty-hint {
      font-size: 14px;
      color: #bbb;
    }
  }
}

.fab-button {
  position: fixed;
  right: 20px;
  bottom: 80px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #1890ff;
  border: none;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;

  .fab-icon {
    font-size: 24px;
    color: #fff;
  }
}

.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;

  .menu-content {
    width: 100%;
    background: #fff;
    border-radius: 16px 16px 0 0;
    padding: 12px 0 24px;

    .menu-item {
      display: flex;
      align-items: center;
      padding: 16px 24px;
      cursor: pointer;

      &:active {
        background: #f5f5f5;
      }

      .menu-icon {
        font-size: 24px;
        margin-right: 16px;
      }

      .menu-text {
        font-size: 16px;
        color: #333;
      }
    }
  }
}

// 适老化模式样式
:deep(.elderly-mode-large) {
  .chat-header .header-title {
    font-size: 22px;
  }

  .conversation-item {
    padding: 16px;

    .avatar-wrapper .avatar {
      width: 56px;
      height: 56px;
      font-size: 28px;
    }

    .conversation-info .conversation-top .name {
      font-size: 20px;
    }
  }
}

:deep(.elderly-mode-xl) {
  .chat-header .header-title {
    font-size: 28px;
  }

  .conversation-item {
    padding: 20px;

    .avatar-wrapper .avatar {
      width: 64px;
      height: 64px;
      font-size: 32px;
    }

    .conversation-info .conversation-top .name {
      font-size: 24px;
    }
  }
}

@keyframes badge-bounce {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
</style>
