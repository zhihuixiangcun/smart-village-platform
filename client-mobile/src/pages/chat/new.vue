<template>
  <div class="new-chat-page">
    <!-- 顶部导航栏 -->
    <div class="page-header">
      <button class="back-btn" @click="goBack">
        <span class="icon">←</span>
      </button>
      <span class="header-title">{{ pageTitle }}</span>
      <div class="placeholder"></div>
    </div>

    <!-- 发起私聊 -->
    <div v-if="chatType === 'private'" class="content">
      <div class="search-section">
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

      <div class="section-title">选择联系人</div>

      <div class="contacts-list" :class="{ 'large-text': isElderlyMode }">
        <div
          v-for="contact in filteredContacts"
          :key="contact.id"
          class="contact-item"
          @click="selectContact(contact)"
        >
          <div class="avatar-wrapper">
            <div class="avatar">{{ contact.avatar }}</div>
            <div v-if="contact.online" class="online-indicator"></div>
          </div>

          <div class="contact-info">
            <div class="name">{{ contact.name }}</div>
            <div class="role">{{ contact.role }}</div>
          </div>

          <div class="select-indicator">
            <span v-if="selectedContact?.id === contact.id" class="check-icon">✓</span>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="filteredContacts.length === 0" class="empty-state">
          <div class="empty-text">未找到联系人</div>
        </div>
      </div>
    </div>

    <!-- 创建群聊 -->
    <div v-else-if="chatType === 'group'" class="content">
      <div class="form-section">
        <div class="form-item">
          <label class="form-label">群名称</label>
          <input
            v-model="groupName"
            type="text"
            class="form-input"
            placeholder="请输入群名称"
            :class="{ 'large-text': isElderlyMode }"
          />
        </div>

        <div class="form-item">
          <label class="form-label">群描述</label>
          <textarea
            v-model="groupDescription"
            class="form-textarea"
            placeholder="请输入群描述（可选）"
            rows="3"
            :class="{ 'large-text': isElderlyMode }"
          />
        </div>
      </div>

      <div class="section-title">选择成员</div>

      <div class="search-section">
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

      <div class="contacts-list" :class="{ 'large-text': isElderlyMode }">
        <div
          v-for="contact in filteredContacts"
          :key="contact.id"
          class="contact-item"
          @click="toggleMember(contact)"
        >
          <div class="avatar-wrapper">
            <div class="avatar">{{ contact.avatar }}</div>
          </div>

          <div class="contact-info">
            <div class="name">{{ contact.name }}</div>
            <div class="role">{{ contact.role }}</div>
          </div>

          <div class="select-indicator">
            <span v-if="isMemberSelected(contact)" class="check-icon">✓</span>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="filteredContacts.length === 0" class="empty-state">
          <div class="empty-text">未找到联系人</div>
        </div>
      </div>
    </div>

    <!-- 底部操作按钮 -->
    <div class="footer-actions">
      <button
        v-if="chatType === 'private'"
        class="action-btn primary"
        :disabled="!selectedContact"
        @click="startPrivateChat"
      >
        <span class="btn-text">开始聊天</span>
      </button>

      <button
        v-else-if="chatType === 'group'"
        class="action-btn primary"
        :disabled="!groupName || selectedMembers.length === 0"
        @click="createGroupChat"
      >
        <span class="btn-text">创建群聊 ({{ selectedMembers.length }}人)</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useChatStore } from '@/store/chat'
import { useElderlyStore } from '@/store/elderly'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const elderlyStore = useElderlyStore()

// 聊天类型
const chatType = ref(route.query.type || 'private')

// 搜索文本
const searchText = ref('')

// 选中的联系人（私聊）
const selectedContact = ref(null)

// 群名称
const groupName = ref('')

// 群描述
const groupDescription = ref('')

// 选中的成员（群聊）
const selectedMembers = ref([])

// 是否适老化模式
const isElderlyMode = computed(() => elderlyStore.isElderlyMode)

// 页面标题
const pageTitle = computed(() => {
  return chatType.value === 'private' ? '发起私聊' : '创建群聊'
})

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

// 选择联系人（私聊）
const selectContact = (contact) => {
  selectedContact.value = contact
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

// 切换成员选中状态（群聊）
const toggleMember = (contact) => {
  const index = selectedMembers.value.findIndex(m => m.id === contact.id)
  if (index > -1) {
    selectedMembers.value.splice(index, 1)
  } else {
    selectedMembers.value.push(contact)
  }
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

// 检查成员是否被选中
const isMemberSelected = (contact) => {
  return selectedMembers.value.some(m => m.id === contact.id)
}

// 发起私聊
const startPrivateChat = async () => {
  if (!selectedContact.value) return

  // 查找是否已有会话
  const existingConv = chatStore.conversations.find(
    c => c.type === 'private' && c.name === selectedContact.value.name
  )

  if (existingConv) {
    router.replace(`/chat/detail/${existingConv.id}`)
  } else {
    // 创建新会话
    const newConv = await chatStore.createConversation('private', selectedContact.value)
    if (newConv) {
      router.replace(`/chat/detail/${newConv.id}`)
    }
  }
}

// 创建群聊
const createGroupChat = async () => {
  if (!groupName.value || selectedMembers.value.length === 0) return

  // TODO: 实现创建群聊的逻辑
  console.log('创建群聊:', {
    name: groupName.value,
    description: groupDescription.value,
    members: selectedMembers.value
  })

  // 模拟创建成功
  const newConv = await chatStore.createConversation('group', {
    name: groupName.value,
    avatar: '👥',
    memberCount: selectedMembers.value.length + 1
  })

  if (newConv) {
    router.replace(`/chat/detail/${newConv.id}`)
  }
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
.new-chat-page {
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

  .back-btn {
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

  .placeholder {
    width: 40px;
  }
}

.content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.search-section {
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

.form-section {
  padding: 16px;
  background: #fff;
  margin-bottom: 8px;

  .form-item {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }

    .form-label {
      display: block;
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
    }

    .form-input,
    .form-textarea {
      width: 100%;
      border: 1px solid #e8e8e8;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 14px;
      outline: none;

      &.large-text {
        font-size: 18px;
      }

      &:focus {
        border-color: #1890ff;
      }
    }

    .form-textarea {
      resize: none;
      font-family: inherit;
    }
  }
}

.section-title {
  padding: 12px 16px;
  font-size: 14px;
  color: #999;
  background: #f5f5f5;
}

.contacts-list {
  background: #fff;

  &.large-text {
    font-size: 18px;
  }

  .contact-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
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

    .select-indicator {
      width: 24px;
      height: 24px;

      .check-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        background: #1890ff;
        color: #fff;
        border-radius: 50%;
        font-size: 12px;
      }
    }
  }

  .empty-state {
    display: flex;
    justify-content: center;
    padding: 40px 20px;

    .empty-text {
      font-size: 14px;
      color: #999;
    }
  }
}

.footer-actions {
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #eee;

  .action-btn {
    width: 100%;
    height: 48px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;

    &.primary {
      background: #1890ff;
      color: #fff;

      &:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
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

  .footer-actions .action-btn {
    height: 56px;
    font-size: 18px;
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

  .footer-actions .action-btn {
    height: 64px;
    font-size: 20px;
  }
}
</style>
