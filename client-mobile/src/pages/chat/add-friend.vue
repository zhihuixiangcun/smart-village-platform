<template>
  <div class="add-friend-page">
    <!-- 顶部导航栏 -->
    <div class="page-header">
      <button class="back-btn" @click="goBack">
        <span class="icon">←</span>
      </button>
      <span class="header-title">添加朋友</span>
      <div class="placeholder"></div>
    </div>

    <!-- 搜索方式切换 -->
    <div class="search-tabs">
      <div
        v-for="tab in searchTabs"
        :key="tab.key"
        :class="['tab-item', { 'tab-item--active': searchType === tab.key }]"
        @click="switchSearchType(tab.key)"
      >
        <span class="tab-text">{{ tab.label }}</span>
      </div>
    </div>

    <!-- 搜索区域 -->
    <div class="search-section">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchKeyword"
          type="text"
          class="search-input"
          :placeholder="searchPlaceholder"
          :class="{ 'large-text': isElderlyMode }"
          @keydown.enter="handleSearch"
        />
        <button v-if="searchKeyword" class="clear-btn" @click="searchKeyword = ''">
          <span class="clear-icon">×</span>
        </button>
      </div>
      <button class="search-btn" :disabled="!searchKeyword" @click="handleSearch">
        <span class="search-btn-text">搜索</span>
      </button>
    </div>

    <!-- 快捷入口 -->
    <div class="quick-actions">
      <div class="action-item" @click="openQRScanner">
        <div class="action-icon">📱</div>
        <div class="action-text">
          <span class="action-title">扫一扫</span>
          <span class="action-desc">扫描二维码名片</span>
        </div>
        <span class="action-arrow">→</span>
      </div>
      <div class="action-item" @click="importContacts">
        <div class="action-icon">📋</div>
        <div class="action-text">
          <span class="action-title">手机通讯录</span>
          <span class="action-desc">导入手机联系人</span>
        </div>
        <span class="action-arrow">→</span>
      </div>
      <div class="action-item" @click="showNearby">
        <div class="action-icon">📍</div>
        <div class="action-text">
          <span class="action-title">附近的人</span>
          <span class="action-desc">发现附近的村民</span>
        </div>
        <span class="action-arrow">→</span>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div v-if="searchResult" class="search-result">
      <div class="result-header">
        <span class="result-title">搜索结果</span>
      </div>

      <!-- 找到用户 -->
      <div v-if="searchResult.user" class="user-card">
        <div class="user-avatar">{{ searchResult.user.avatar }}</div>
        <div class="user-info">
          <div class="user-name">
            {{ searchResult.user.name }}
            <span v-if="searchResult.user.verified" class="verified-badge">✓</span>
          </div>
          <div class="user-meta">
            <span class="village-name">{{ searchResult.user.villageName }}</span>
            <span class="divider">|</span>
            <span class="user-role">{{ getRoleText(searchResult.user.role) }}</span>
          </div>
          <div v-if="searchResult.user.remark" class="user-remark">
            备注：{{ searchResult.user.remark }}
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="user-actions">
          <button
            v-if="searchResult.user.status === 'stranger'"
            class="action-btn primary"
            @click="sendFriendRequest(searchResult.user)"
          >
            <span class="btn-text">添加到通讯录</span>
          </button>
          <button
            v-else-if="searchResult.user.status === 'pending'"
            class="action-btn disabled"
            disabled
          >
            <span class="btn-text">等待验证</span>
          </button>
          <button
            v-else-if="searchResult.user.status === 'friend'"
            class="action-btn secondary"
            @click="startChat(searchResult.user)"
          >
            <span class="btn-text">发消息</span>
          </button>
        </div>
      </div>

      <!-- 未找到用户 -->
      <div v-else class="empty-result">
        <div class="empty-icon">🔍</div>
        <div class="empty-text">未找到相关用户</div>
        <div class="empty-hint">请检查手机号或乡村号是否正确</div>
      </div>
    </div>

    <!-- 好友申请弹窗 -->
    <div v-if="showRequestDialog" class="dialog-overlay" @click="showRequestDialog = false">
      <div class="dialog-content" @click.stop>
        <div class="dialog-header">
          <span class="dialog-title">朋友验证请求</span>
          <button class="dialog-close" @click="showRequestDialog = false">×</button>
        </div>

        <div class="dialog-body">
          <div class="request-user">
            <div class="request-avatar">{{ selectedUser?.avatar }}</div>
            <span class="request-name">{{ selectedUser?.name }}</span>
          </div>

          <div class="form-item">
            <label class="form-label">验证申请</label>
            <textarea
              v-model="requestMessage"
              class="form-textarea"
              placeholder="我是..."
              rows="3"
              :class="{ 'large-text': isElderlyMode }"
            />
          </div>

          <div class="form-item">
            <label class="form-label">备注</label>
            <input
              v-model="requestRemark"
              type="text"
              class="form-input"
              placeholder="填写备注信息（可选）"
              :class="{ 'large-text': isElderlyMode }"
            />
          </div>

          <div class="form-item">
            <label class="friend-group">
              <input v-model="addToGroup" type="checkbox" class="checkbox" />
              <span class="checkbox-label">添加到分组</span>
            </label>
            <input
              v-if="addToGroup"
              v-model="groupName"
              type="text"
              class="form-input"
              placeholder="分组名称"
              :class="{ 'large-text': isElderlyMode }"
            />
          </div>
        </div>

        <div class="dialog-footer">
          <button class="dialog-btn cancel" @click="showRequestDialog = false">
            <span>取消</span>
          </button>
          <button class="dialog-btn primary" @click="submitFriendRequest">
            <span>发送</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/store/chat'
import { useElderlyStore } from '@/store/elderly'

const router = useRouter()
const chatStore = useChatStore()
const elderlyStore = useElderlyStore()

// 搜索方式
const searchTabs = [
  { key: 'phone', label: '手机号' },
  { key: 'villageId', label: '乡村号' },
  { key: 'name', label: '姓名' }
]

const searchType = ref('phone')
const searchKeyword = ref('')
const searchResult = ref(null)

// 好友申请
const showRequestDialog = ref(false)
const selectedUser = ref(null)
const requestMessage = ref('')
const requestRemark = ref('')
const addToGroup = ref(false)
const groupName = ref('')

// 是否适老化模式
const isElderlyMode = computed(() => elderlyStore.isElderlyMode)

// 搜索提示文字
const searchPlaceholder = computed(() => {
  const placeholders = {
    phone: '请输入手机号',
    villageId: '请输入乡村号',
    name: '请输入姓名'
  }
  return placeholders[searchType.value]
})

// 角色文本映射
const getRoleText = (role) => {
  const roleMap = {
    'villager': '村民',
    'cadre': '村干部',
    'official': '官员',
    'admin': '管理员'
  }
  return roleMap[role] || '村民'
}

// 切换搜索类型
const switchSearchType = (type) => {
  searchType.value = type
  searchResult.value = null
  searchKeyword.value = ''

  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

// 执行搜索
const handleSearch = () => {
  if (!searchKeyword.value.trim()) return

  // 模拟搜索用户
  const mockUsers = [
    {
      id: 'user_search_001',
      phone: '13800138000',
      villageId: 'DZ2024001',
      name: '李小红',
      avatar: '👩',
      villageName: '东村',
      role: 'villager',
      verified: true,
      status: 'stranger',
      remark: ''
    },
    {
      id: 'user_search_002',
      phone: '13900139000',
      villageId: 'DZ2024002',
      name: '王大明',
      avatar: '👨',
      villageName: '西村',
      role: 'cadre',
      verified: true,
      status: 'pending',
      remark: ''
    },
    {
      id: 'user_search_003',
      phone: '13700137000',
      villageId: 'DZ2024003',
      name: '张美丽',
      avatar: '👩‍🦰',
      villageName: '东村',
      role: 'villager',
      verified: false,
      status: 'friend',
      remark: '邻居'
    }
  ]

  // 根据搜索类型和关键词匹配
  const keyword = searchKeyword.value.trim().toLowerCase()
  let foundUser = null

  if (searchType.value === 'phone') {
    foundUser = mockUsers.find(u => u.phone === keyword)
  } else if (searchType.value === 'villageId') {
    foundUser = mockUsers.find(u => u.villageId.toLowerCase() === keyword)
  } else if (searchType.value === 'name') {
    foundUser = mockUsers.find(u => u.name.includes(keyword))
  }

  searchResult.value = foundUser ? { user: foundUser } : { user: null }

  // 震动反馈
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

// 打开二维码扫描
const openQRScanner = () => {
  // TODO: 实现二维码扫描
  console.log('打开二维码扫描')
}

// 导入通讯录
const importContacts = () => {
  router.push('/chat/import-contacts')
}

// 显示附近的人
const showNearby = () => {
  // TODO: 实现附近的人功能
  console.log('显示附近的人')
}

// 发送好友请求
const sendFriendRequest = (user) => {
  selectedUser.value = user
  requestMessage.value = `你好，我是${getCurrentUserName()}`
  showRequestDialog.value = true
}

// 获取当前用户名（模拟）
const getCurrentUserName = () => {
  return localStorage.getItem('user_name') || '张大山'
}

// 提交好友请求
const submitFriendRequest = () => {
  // TODO: 调用API发送好友请求
  console.log('发送好友请求:', {
    userId: selectedUser.value.id,
    message: requestMessage.value,
    remark: requestRemark.value,
    group: addToGroup.value ? groupName.value : null
  })

  showRequestDialog.value = false
  searchResult.value.user.status = 'pending'

  // 震动反馈
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }

  // 显示成功提示
  alert('好友请求已发送')
}

// 开始聊天
const startChat = (user) => {
  router.push(`/chat/detail/${user.id}`)
}

// 返回
const goBack = () => {
  router.back()
}
</script>

<style lang="scss" scoped>
.add-friend-page {
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

.search-tabs {
  display: flex;
  background: #fff;
  border-bottom: 1px solid #eee;

  .tab-item {
    flex: 1;
    text-align: center;
    padding: 14px 0;
    cursor: pointer;
    position: relative;

    .tab-text {
      font-size: 14px;
      color: #666;
    }

    &--active {
      .tab-text {
        color: #1890ff;
        font-weight: 600;
      }

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 40px;
        height: 2px;
        background: #1890ff;
        border-radius: 2px;
      }
    }
  }
}

.search-section {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  gap: 12px;

  .search-box {
    flex: 1;
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

    .clear-btn {
      width: 20px;
      height: 20px;
      border: none;
      background: #ccc;
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 16px;
      padding: 0;

      .clear-icon {
        line-height: 1;
      }
    }
  }

  .search-btn {
    padding: 10px 20px;
    border: none;
    background: #1890ff;
    color: #fff;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;

    &:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
  }
}

.quick-actions {
  margin-top: 8px;
  background: #fff;

  .action-item {
    display: flex;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #f5f5f5;
    cursor: pointer;

    &:active {
      background: #f5f5f5;
    }

    &:last-child {
      border-bottom: none;
    }

    .action-icon {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      background: #f0f0f0;
      border-radius: 8px;
      margin-right: 12px;
    }

    .action-text {
      flex: 1;

      .action-title {
        display: block;
        font-size: 15px;
        color: #333;
        margin-bottom: 4px;
      }

      .action-desc {
        display: block;
        font-size: 12px;
        color: #999;
      }
    }

    .action-arrow {
      font-size: 18px;
      color: #ccc;
    }
  }
}

.search-result {
  margin-top: 8px;
  background: #fff;

  .result-header {
    padding: 12px 16px;
    border-bottom: 1px solid #f5f5f5;

    .result-title {
      font-size: 14px;
      color: #999;
    }
  }

  .user-card {
    display: flex;
    flex-direction: column;
    padding: 16px;

    .user-avatar {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      background: #f0f0f0;
      margin: 0 auto 16px;
    }

    .user-info {
      text-align: center;
      margin-bottom: 20px;

      .user-name {
        font-size: 18px;
        font-weight: 600;
        color: #333;
        margin-bottom: 8px;
        display: inline-flex;
        align-items: center;
        gap: 4px;

        .verified-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          background: #1890ff;
          color: #fff;
          border-radius: 50%;
          font-size: 10px;
        }
      }

      .user-meta {
        font-size: 14px;
        color: #999;
        margin-bottom: 8px;

        .divider {
          margin: 0 8px;
        }
      }

      .user-remark {
        font-size: 14px;
        color: #1890ff;
      }
    }

    .user-actions {
      .action-btn {
        width: 100%;
        height: 44px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        cursor: pointer;

        &.primary {
          background: #1890ff;
          color: #fff;
        }

        &.secondary {
          background: #fff;
          color: #1890ff;
          border: 1px solid #1890ff;
        }

        &.disabled {
          background: #f5f5f5;
          color: #999;
          cursor: not-allowed;
        }
      }
    }
  }

  .empty-result {
    display: flex;
    flex-direction: column;
    align-items: center;
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
    max-width: 400px;
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

      .request-user {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
        padding: 12px;
        background: #f9f9f9;
        border-radius: 8px;

        .request-avatar {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          background: #f0f0f0;
        }

        .request-name {
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }
      }

      .form-item {
        margin-bottom: 16px;

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

        .friend-group {
          display: flex;
          align-items: center;
          margin-bottom: 8px;

          .checkbox {
            width: 18px;
            height: 18px;
            margin-right: 8px;
          }

          .checkbox-label {
            font-size: 14px;
            color: #666;
          }
        }
      }
    }

    .dialog-footer {
      display: flex;
      border-top: 1px solid #eee;

      .dialog-btn {
        flex: 1;
        height: 48px;
        border: none;
        font-size: 16px;
        cursor: pointer;

        &.cancel {
          background: #fff;
          color: #666;
          border-right: 1px solid #eee;
        }

        &.primary {
          background: #fff;
          color: #1890ff;
        }

        &:active {
          background: #f5f5f5;
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

  .search-tabs .tab-item .tab-text {
    font-size: 16px;
  }

  .user-card .user-info .user-name {
    font-size: 20px;
  }
}

:deep(.elderly-mode-xl) {
  .page-header .header-title {
    font-size: 28px;
  }

  .search-tabs .tab-item .tab-text {
    font-size: 18px;
  }

  .user-card .user-info .user-name {
    font-size: 24px;
  }
}
</style>
