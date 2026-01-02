<template>
  <div class="groups-page">
    <!-- 顶部导航栏 -->
    <div class="page-header">
      <button class="back-btn" @click="goBack">
        <span class="icon">←</span>
      </button>
      <span class="header-title">群聊</span>
      <button class="create-btn" @click="createNewGroup">
        <span class="icon">+</span>
      </button>
    </div>

    <!-- 搜索框 -->
    <div class="search-bar">
      <div class="search-input-wrapper">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchText"
          type="text"
          class="search-input"
          placeholder="搜索群聊"
          :class="{ 'large-text': isElderlyMode }"
        />
      </div>
    </div>

    <!-- 群组列表 -->
    <div class="groups-list" :class="{ 'large-text': isElderlyMode }">
      <div
        v-for="group in filteredGroups"
        :key="group.id"
        class="group-item"
        @click="openGroupChat(group)"
      >
        <div class="avatar">{{ group.avatar }}</div>

        <div class="group-info">
          <div class="name">{{ group.name }}</div>
          <div class="description">{{ group.description }}</div>
          <div class="meta">
            <span class="member-count">{{ group.memberCount }}人</span>
            <span v-if="group.isAdmin" class="admin-badge">群主</span>
          </div>
        </div>

        <button class="enter-btn">
          <span class="enter-icon">→</span>
        </button>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredGroups.length === 0" class="empty-state">
        <div class="empty-icon">👥</div>
        <div class="empty-text">暂无群聊</div>
        <div class="empty-hint">点击右上角创建新群聊</div>
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

// 是否适老化模式
const isElderlyMode = computed(() => elderlyStore.isElderlyMode)

// 过滤后的群组列表
const filteredGroups = computed(() => {
  if (!searchText.value) {
    return chatStore.groups
  }
  const keyword = searchText.value.toLowerCase()
  return chatStore.groups.filter(group =>
    group.name.toLowerCase().includes(keyword) ||
    group.description.toLowerCase().includes(keyword)
  )
})

// 打开群聊
const openGroupChat = async (group) => {
  // 查找是否已有会话
  const existingConv = chatStore.conversations.find(
    c => c.type === 'group' && c.name === group.name
  )

  if (existingConv) {
    router.push(`/chat/detail/${existingConv.id}`)
  } else {
    // 创建新群聊会话
    const newConv = await chatStore.createConversation('group', {
      name: group.name,
      avatar: group.avatar,
      memberCount: group.memberCount
    })
    if (newConv) {
      router.push(`/chat/detail/${newConv.id}`)
    }
  }

  // 震动反馈
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

// 创建新群聊
const createNewGroup = () => {
  // TODO: 实现创建群聊功能
  console.log('创建新群聊')
}

// 返回
const goBack = () => {
  router.back()
}

// 初始化
onMounted(async () => {
  await chatStore.fetchGroups()
})
</script>

<style lang="scss" scoped>
.groups-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.page-header {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #eee;

  .back-btn,
  .create-btn {
    width: 40px;
    height: 40px;
    border: none;
    background: none;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 20px;

    &:active {
      background: #f5f5f5;
    }
  }

  .header-title {
    flex: 1;
    font-size: 18px;
    font-weight: 600;
    color: #333;
    text-align: center;
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

.groups-list {
  flex: 1;
  overflow-y: auto;

  &.large-text {
    font-size: 18px;
  }

  .group-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: #fff;
    border-bottom: 1px solid #f5f5f5;
    cursor: pointer;

    &:active {
      background: #f5f5f5;
    }

    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      background: #f0f0f0;
      margin-right: 12px;
      flex-shrink: 0;
    }

    .group-info {
      flex: 1;

      .name {
        font-size: 16px;
        font-weight: 500;
        color: #333;
        margin-bottom: 4px;
      }

      .description {
        font-size: 14px;
        color: #666;
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .meta {
        display: flex;
        align-items: center;
        gap: 8px;

        .member-count {
          font-size: 12px;
          color: #999;
        }

        .admin-badge {
          font-size: 10px;
          color: #fff;
          background: #1890ff;
          padding: 2px 6px;
          border-radius: 4px;
        }
      }
    }

    .enter-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: none;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #999;

      &:active {
        background: #f5f5f5;
      }

      .enter-icon {
        font-size: 18px;
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

// 适老化模式样式
:deep(.elderly-mode-large) {
  .page-header .header-title {
    font-size: 22px;
  }

  .group-item .avatar {
    width: 56px;
    height: 56px;
    font-size: 28px;
  }

  .group-item .group-info .name {
    font-size: 20px;
  }
}

:deep(.elderly-mode-xl) {
  .page-header .header-title {
    font-size: 28px;
  }

  .group-item .avatar {
    width: 64px;
    height: 64px;
    font-size: 32px;
  }

  .group-item .group-info .name {
    font-size: 24px;
  }
}
</style>
