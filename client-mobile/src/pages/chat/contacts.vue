<template>
  <div class="contacts-page">
    <!-- 顶部导航栏 -->
    <div class="page-header">
      <button class="back-btn" @click="goBack">
        <span class="icon">←</span>
      </button>
      <span class="header-title">通讯录</span>
      <button class="add-btn" @click="addNewContact">
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
          placeholder="搜索联系人"
          :class="{ 'large-text': isElderlyMode }"
        />
      </div>
    </div>

    <!-- 联系人列表 -->
    <div class="contacts-list" :class="{ 'large-text': isElderlyMode }">
      <div
        v-for="contact in filteredContacts"
        :key="contact.id"
        class="contact-item"
        @click="openChat(contact)"
      >
        <div class="avatar-wrapper">
          <div class="avatar">{{ contact.avatar }}</div>
          <div v-if="contact.online" class="online-indicator"></div>
        </div>

        <div class="contact-info">
          <div class="name">{{ contact.name }}</div>
          <div class="role">{{ contact.role }}</div>
        </div>

        <button class="chat-btn" @click.stop="openChat(contact)">
          <span class="chat-icon">💬</span>
        </button>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredContacts.length === 0" class="empty-state">
        <div class="empty-icon">👤</div>
        <div class="empty-text">暂无联系人</div>
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

// 过滤后的联系人列表
const filteredContacts = computed(() => {
  if (!searchText.value) {
    return chatStore.contacts
  }
  const keyword = searchText.value.toLowerCase()
  return chatStore.contacts.filter(contact =>
    contact.name.toLowerCase().includes(keyword) ||
    contact.role.toLowerCase().includes(keyword)
  )
})

// 打开聊天
const openChat = async (contact) => {
  // 查找是否已有会话
  const existingConv = chatStore.conversations.find(
    c => c.type === 'private' && c.name === contact.name
  )

  if (existingConv) {
    router.push(`/chat/detail/${existingConv.id}`)
  } else {
    // 创建新会话
    const newConv = await chatStore.createConversation('private', contact)
    if (newConv) {
      router.push(`/chat/detail/${newConv.id}`)
    }
  }

  // 震动反馈
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

// 添加新联系人
const addNewContact = () => {
  // TODO: 实现添加联系人功能
  console.log('添加新联系人')
}

// 返回
const goBack = () => {
  router.back()
}

// 初始化
onMounted(async () => {
  await chatStore.fetchContacts()
})
</script>

<style lang="scss" scoped>
.contacts-page {
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
  .add-btn {
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

.contacts-list {
  flex: 1;
  overflow-y: auto;

  &.large-text {
    font-size: 18px;
  }

  .contact-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: #fff;
    border-bottom: 1px solid #f5f5f5;
    cursor: pointer;

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

    .contact-info {
      flex: 1;

      .name {
        font-size: 16px;
        font-weight: 500;
        color: #333;
        margin-bottom: 4px;
      }

      .role {
        font-size: 14px;
        color: #999;
      }
    }

    .chat-btn {
      width: 40px;
      height: 40px;
      border: none;
      background: none;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;

      &:active {
        background: #f5f5f5;
      }

      .chat-icon {
        font-size: 20px;
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
    }
  }
}

// 适老化模式样式
:deep(.elderly-mode-large) {
  .page-header .header-title {
    font-size: 22px;
  }

  .contact-item .avatar-wrapper .avatar {
    width: 56px;
    height: 56px;
    font-size: 28px;
  }

  .contact-item .contact-info .name {
    font-size: 20px;
  }
}

:deep(.elderly-mode-xl) {
  .page-header .header-title {
    font-size: 28px;
  }

  .contact-item .avatar-wrapper .avatar {
    width: 64px;
    height: 64px;
    font-size: 32px;
  }

  .contact-item .contact-info .name {
    font-size: 24px;
  }
}
</style>
