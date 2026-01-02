<template>
  <div class="import-contacts-page">
    <!-- 顶部导航栏 -->
    <div class="page-header">
      <button class="back-btn" @click="goBack">
        <span class="icon">←</span>
      </button>
      <span class="header-title">手机通讯录</span>
      <div class="placeholder"></div>
    </div>

    <!-- 导入说明 -->
    <div class="import-notice">
      <div class="notice-icon">ℹ️</div>
      <div class="notice-text">
        <span class="notice-title">导入说明</span>
        <span class="notice-desc">仅匹配已注册智慧乡村平台的联系人，不会上传您的通讯录</span>
      </div>
    </div>

    <!-- 搜索区域 -->
    <div class="search-section">
      <div class="search-box">
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

    <!-- 批量操作栏 -->
    <div v-if="filteredContacts.length > 0" class="batch-bar">
      <label class="select-all">
        <input v-model="selectAll" type="checkbox" class="checkbox" @change="handleSelectAll" />
        <span class="checkbox-label">全选</span>
      </label>
      <span class="selected-count">已选择 {{ selectedContacts.length }} 人</span>
    </div>

    <!-- 联系人列表 -->
    <div class="contacts-list">
      <!-- 已注册用户 -->
      <div v-if="registeredContacts.length > 0" class="contact-section">
        <div class="section-header">
          <span class="section-title">已注册用户 ({{ registeredContacts.length }})</span>
        </div>

        <div
          v-for="contact in registeredContacts"
          :key="contact.id"
          class="contact-item registered"
        >
          <input
            v-model="contact.selected"
            type="checkbox"
            class="contact-checkbox"
            @change="updateSelectedCount"
          />

          <div class="contact-avatar">{{ contact.avatar }}</div>

          <div class="contact-info">
            <div class="contact-name">
              {{ contact.name }}
              <span v-if="contact.isFriend" class="friend-badge">好友</span>
            </div>
            <div class="contact-phone">{{ contact.phone }}</div>
            <div class="contact-village">{{ contact.villageName }}</div>
          </div>

          <button
            v-if="!contact.isFriend"
            class="add-btn"
            :class="{ 'added': contact.added }"
            @click="toggleAddFriend(contact)"
          >
            <span class="add-text">{{ contact.added ? '已添加' : '添加' }}</span>
          </button>
        </div>
      </div>

      <!-- 未注册用户 -->
      <div v-if="unregisteredContacts.length > 0" class="contact-section">
        <div class="section-header">
          <span class="section-title">未注册用户 ({{ unregisteredContacts.length }})</span>
        </div>

        <div
          v-for="contact in unregisteredContacts"
          :key="contact.id"
          class="contact-item unregistered"
        >
          <div class="contact-avatar gray">{{ contact.avatar }}</div>

          <div class="contact-info">
            <div class="contact-name">{{ contact.name }}</div>
            <div class="contact-phone">{{ contact.phone }}</div>
          </div>

          <button class="invite-btn" @click="inviteContact(contact)">
            <span class="invite-text">邀请</span>
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredContacts.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-text">
          {{ searchText ? '未找到相关联系人' : '暂无通讯录数据' }}
        </div>
        <div v-if="!searchText" class="empty-action">
          <button class="import-btn" @click="loadContacts">
            <span class="btn-text">加载通讯录</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div v-if="selectedContacts.length > 0" class="footer-actions">
      <button class="action-btn primary" @click="batchAddFriends">
        <span class="btn-text">添加选中的 {{ selectedContacts.length }} 位好友</span>
      </button>
    </div>

    <!-- 邀请弹窗 -->
    <div v-if="showInviteDialog" class="dialog-overlay" @click="showInviteDialog = false">
      <div class="dialog-content" @click.stop>
        <div class="dialog-header">
          <span class="dialog-title">邀请好友</span>
          <button class="dialog-close" @click="showInviteDialog = false">×</button>
        </div>

        <div class="dialog-body">
          <div class="invite-user">
            <div class="invite-avatar">{{ inviteTarget?.avatar }}</div>
            <div class="invite-info">
              <span class="invite-name">{{ inviteTarget?.name }}</span>
              <span class="invite-phone">{{ inviteTarget?.phone }}</span>
            </div>
          </div>

          <div class="invite-methods">
            <div class="method-item" @click="inviteBySMS">
              <div class="method-icon">📩</div>
              <span class="method-text">短信邀请</span>
            </div>
            <div class="method-item" @click="inviteByWeChat">
              <div class="method-icon">💬</div>
              <span class="method-text">微信邀请</span>
            </div>
            <div class="method-item" @click="copyInviteLink">
              <div class="method-icon">🔗</div>
              <span class="method-text">复制链接</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useElderlyStore } from '@/store/elderly'

const router = useRouter()
const elderlyStore = useElderlyStore()

// 搜索文本
const searchText = ref('')

// 联系人列表
const contacts = ref([])

// 全选状态
const selectAll = ref(false)

// 选中的联系人
const selectedContacts = computed(() => {
  return contacts.value.filter(c => c.selected && !c.isFriend)
})

// 邀请弹窗
const showInviteDialog = ref(false)
const inviteTarget = ref(null)

// 是否适老化模式
const isElderlyMode = computed(() => elderlyStore.isElderlyMode)

// 过滤后的联系人
const filteredContacts = computed(() => {
  if (!searchText.value) {
    return contacts.value
  }
  const keyword = searchText.value.toLowerCase()
  return contacts.value.filter(c =>
    c.name.toLowerCase().includes(keyword) ||
    c.phone.includes(keyword)
  )
})

// 已注册用户
const registeredContacts = computed(() => {
  return filteredContacts.value.filter(c => c.registered)
})

// 未注册用户
const unregisteredContacts = computed(() => {
  return filteredContacts.value.filter(c => !c.registered)
})

// 加载通讯录
const loadContacts = async () => {
  // 模拟加载通讯录数据
  await new Promise(resolve => setTimeout(resolve, 500))

  // 模拟数据
  contacts.value = [
    {
      id: 'contact_001',
      name: '李小红',
      phone: '13800138001',
      avatar: '👩',
      registered: true,
      isFriend: true,
      villageName: '东村',
      selected: false,
      added: false
    },
    {
      id: 'contact_002',
      name: '王大明',
      phone: '13800138002',
      avatar: '👨',
      registered: true,
      isFriend: false,
      villageName: '西村',
      selected: false,
      added: false
    },
    {
      id: 'contact_003',
      name: '张美丽',
      phone: '13800138003',
      avatar: '👩‍🦰',
      registered: true,
      isFriend: false,
      villageName: '东村',
      selected: false,
      added: false
    },
    {
      id: 'contact_004',
      name: '赵强',
      phone: '13800138004',
      avatar: '👨‍🌾',
      registered: false,
      isFriend: false,
      selected: false,
      added: false
    },
    {
      id: 'contact_005',
      name: '孙芳',
      phone: '13800138005',
      avatar: '👩‍🌾',
      registered: true,
      isFriend: false,
      villageName: '南村',
      selected: false,
      added: false
    },
    {
      id: 'contact_006',
      name: '周杰',
      phone: '13800138006',
      avatar: '👨',
      registered: false,
      isFriend: false,
      selected: false,
      added: false
    },
    {
      id: 'contact_007',
      name: '吴婷',
      phone: '13800138007',
      avatar: '👩',
      registered: true,
      isFriend: false,
      villageName: '北村',
      selected: false,
      added: false
    }
  ]

  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

// 全选/取消全选
const handleSelectAll = () => {
  contacts.value.forEach(c => {
    if (!c.isFriend && c.registered) {
      c.selected = selectAll.value
    }
  })
}

// 更新选中数量
const updateSelectedCount = () => {
  // 更新全选状态
  const allSelected = contacts.value
    .filter(c => !c.isFriend && c.registered)
    .every(c => c.selected)

  selectAll.value = allSelected && contacts.value.some(c => !c.isFriend && c.registered)
}

// 切换添加好友状态
const toggleAddFriend = (contact) => {
  contact.added = !contact.added
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

// 批量添加好友
const batchAddFriends = async () => {
  const toAdd = contacts.value.filter(c => c.selected && !c.isFriend && c.registered)

  // TODO: 调用API批量添加好友
  console.log('批量添加好友:', toAdd)

  // 模拟添加
  toAdd.forEach(c => c.added = true)
  selectAll.value = false
  contacts.value.forEach(c => c.selected = false)

  alert(`已发送 ${toAdd.length} 个好友申请`)

  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

// 邀请联系人
const inviteContact = (contact) => {
  inviteTarget.value = contact
  showInviteDialog.value = true
}

// 短信邀请
const inviteBySMS = () => {
  const phone = inviteTarget.value.phone
  const message = `【智慧乡村】${inviteTarget.value.name}，我正在使用智慧乡村平台，快来加入吧！`
  // TODO: 调用短信功能
  console.log('短信邀请:', phone, message)
  showInviteDialog.value = false
  alert('短信已发送')
}

// 微信邀请
const inviteByWeChat = () => {
  // TODO: 调用微信分享
  console.log('微信邀请:', inviteTarget.value)
  showInviteDialog.value = false
  alert('已分享到微信')
}

// 复制邀请链接
const copyInviteLink = () => {
  const link = 'https://smartvillage.com/download'
  navigator.clipboard.writeText(link).then(() => {
    showInviteDialog.value = false
    alert('链接已复制')
  })
}

// 返回
const goBack = () => {
  router.back()
}

// 初始化
onMounted(() => {
  loadContacts()
})
</script>

<style lang="scss" scoped>
.import-contacts-page {
  min-height: 100vh;
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

.import-notice {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  background: #e6f7ff;
  border-bottom: 1px solid #91d5ff;

  .notice-icon {
    font-size: 16px;
    margin-right: 8px;
    flex-shrink: 0;
  }

  .notice-text {
    flex: 1;

    .notice-title {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #1890ff;
      margin-bottom: 4px;
    }

    .notice-desc {
      display: block;
      font-size: 12px;
      color: #666;
      line-height: 1.5;
    }
  }
}

.search-section {
  padding: 12px 16px;
  background: #fff;

  .search-box {
    display: flex;
    align-items: center;
    background: #f5f5f5;
    border-radius: 8px;
    padding: 10px 12px;

    .search-icon {
      font-size: 16px;
      opacity: 0.5;
      margin-right: 8px;
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

.batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #f5f5f5;

  .select-all {
    display: flex;
    align-items: center;

    .checkbox {
      width: 18px;
      height: 18px;
      margin-right: 8px;
    }

    .checkbox-label {
      font-size: 14px;
      color: #333;
    }
  }

  .selected-count {
    font-size: 14px;
    color: #1890ff;
  }
}

.contacts-list {
  flex: 1;
  overflow-y: auto;

  .contact-section {
    margin-bottom: 8px;

    .section-header {
      padding: 12px 16px;
      background: #f5f5f5;

      .section-title {
        font-size: 12px;
        color: #999;
      }
    }

    .contact-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: #fff;
      border-bottom: 1px solid #f5f5f5;

      .contact-checkbox {
        width: 18px;
        height: 18px;
        margin-right: 12px;
        flex-shrink: 0;
      }

      .contact-avatar {
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

        &.gray {
          filter: grayscale(100%);
          opacity: 0.5;
        }
      }

      .contact-info {
        flex: 1;
        min-width: 0;

        .contact-name {
          font-size: 16px;
          font-weight: 500;
          color: #333;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 8px;

          .friend-badge {
            font-size: 10px;
            color: #52c41a;
            border: 1px solid #52c41a;
            padding: 1px 4px;
            border-radius: 4px;
          }
        }

        .contact-phone {
          font-size: 14px;
          color: #666;
          margin-bottom: 2px;
        }

        .contact-village {
          font-size: 12px;
          color: #999;
        }
      }

      .add-btn {
        padding: 6px 16px;
        border: 1px solid #1890ff;
        background: #fff;
        color: #1890ff;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        flex-shrink: 0;

        &.added {
          background: #f5f5f5;
          border-color: #ccc;
          color: #999;
        }
      }

      .invite-btn {
        padding: 6px 16px;
        border: 1px solid #52c41a;
        background: #fff;
        color: #52c41a;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        flex-shrink: 0;
      }
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 80px 20px;

    .empty-icon {
      font-size: 64px;
      margin-bottom: 16px;
      opacity: 0.3;
    }

    .empty-text {
      font-size: 16px;
      color: #999;
      margin-bottom: 20px;
    }

    .import-btn {
      padding: 10px 24px;
      border: none;
      background: #1890ff;
      color: #fff;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
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

    &.primary {
      background: #1890ff;
      color: #fff;
    }
  }
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;

  .dialog-content {
    width: 100%;
    max-width: 360px;
    background: #fff;
    border-radius: 12px;
    overflow: hidden;

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid #eee;

      .dialog-title {
        font-size: 16px;
        font-weight: 600;
        color: #333;
      }

      .dialog-close {
        width: 32px;
        height: 32px;
        border: none;
        background: none;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 24px;
        color: #999;

        &:active {
          background: #f5f5f5;
        }
      }
    }

    .dialog-body {
      padding: 20px 16px;

      .invite-user {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: #f9f9f9;
        border-radius: 8px;
        margin-bottom: 20px;

        .invite-avatar {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          background: #f0f0f0;
        }

        .invite-info {
          display: flex;
          flex-direction: column;

          .invite-name {
            font-size: 16px;
            font-weight: 600;
            color: #333;
            margin-bottom: 4px;
          }

          .invite-phone {
            font-size: 14px;
            color: #999;
          }
        }
      }

      .invite-methods {
        display: flex;
        gap: 12px;

        .method-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px 8px;
          background: #f9f9f9;
          border-radius: 8px;
          cursor: pointer;

          &:active {
            background: #f0f0f0;
          }

          .method-icon {
            font-size: 24px;
            margin-bottom: 8px;
          }

          .method-text {
            font-size: 12px;
            color: #666;
          }
        }
      }
    }
  }
}

// 适老化模式样式
:deep(.elderly-mode-large) {
  .page-header .header-title {
    font-size: 22px;
  }

  .contact-item .contact-info .contact-name {
    font-size: 18px;
  }
}

:deep(.elderly-mode-xl) {
  .page-header .header-title {
    font-size: 28px;
  }

  .contact-item .contact-info .contact-name {
    font-size: 20px;
  }
}
</style>
