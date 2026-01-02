<template>
  <div class="friend-requests-page">
    <!-- 顶部导航栏 -->
    <div class="page-header">
      <button class="back-btn" @click="goBack">
        <span class="icon">←</span>
      </button>
      <span class="header-title">好友申请</span>
      <div class="placeholder"></div>
    </div>

    <!-- 标签切换 -->
    <div class="tabs">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab-item', { 'tab-item--active': activeTab === tab.key }]"
        @click="switchTab(tab.key)"
      >
        <span class="tab-text">{{ tab.label }}</span>
        <span v-if="tab.count > 0" class="tab-badge">{{ tab.count }}</span>
      </div>
    </div>

    <!-- 列表内容 -->
    <div class="content">
      <!-- 收到的申请 -->
      <div v-if="activeTab === 'received'" class="request-list">
        <div
          v-for="request in receivedRequests"
          :key="request.id"
          class="request-card"
        >
          <div class="request-avatar">{{ request.avatar }}</div>

          <div class="request-info">
            <div class="request-top">
              <span class="request-name">{{ request.name }}</span>
              <span class="request-time">{{ formatTime(request.timestamp) }}</span>
            </div>
            <div class="request-message">
              <span class="message-label">验证申请：</span>
              <span class="message-text">{{ request.message }}</span>
            </div>
            <div class="request-meta">
              <span class="meta-item">{{ request.villageName }}</span>
              <span class="meta-divider">|</span>
              <span class="meta-item">{{ request.phone }}</span>
            </div>

            <!-- 操作按钮 -->
            <div v-if="request.status === 'pending'" class="request-actions">
              <button
                class="action-btn reject"
                :disabled="request.processing"
                @click="handleRequest(request, 'reject')"
              >
                <span class="btn-text">拒绝</span>
              </button>
              <button
                class="action-btn accept"
                :disabled="request.processing"
                @click="handleRequest(request, 'accept')"
              >
                <span class="btn-text">接受</span>
              </button>
            </div>
            <div v-else-if="request.status === 'accepted'" class="request-status accepted">
              <span class="status-icon">✓</span>
              <span class="status-text">已添加</span>
            </div>
            <div v-else-if="request.status === 'rejected'" class="request-status rejected">
              <span class="status-icon">×</span>
              <span class="status-text">已拒绝</span>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="receivedRequests.length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-text">暂无好友申请</div>
        </div>
      </div>

      <!-- 发出的申请 -->
      <div v-else-if="activeTab === 'sent'" class="request-list">
        <div
          v-for="request in sentRequests"
          :key="request.id"
          class="request-card"
        >
          <div class="request-avatar">{{ request.avatar }}</div>

          <div class="request-info">
            <div class="request-top">
              <span class="request-name">{{ request.name }}</span>
              <span class="request-time">{{ formatTime(request.timestamp) }}</span>
            </div>
            <div class="request-message">
              <span class="message-label">验证申请：</span>
              <span class="message-text">{{ request.message }}</span>
            </div>
            <div class="request-meta">
              <span class="meta-item">{{ request.villageName }}</span>
            </div>

            <!-- 状态显示 -->
            <div v-if="request.status === 'pending'" class="request-status pending">
              <span class="status-icon">⏳</span>
              <span class="status-text">等待验证</span>
            </div>
            <div v-else-if="request.status === 'accepted'" class="request-status accepted">
              <span class="status-icon">✓</span>
              <span class="status-text">已通过</span>
            </div>
            <div v-else-if="request.status === 'rejected'" class="request-status rejected">
              <span class="status-icon">×</span>
              <span class="status-text">已拒绝</span>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="sentRequests.length === 0" class="empty-state">
          <div class="empty-icon">📤</div>
          <div class="empty-text">暂无发出的申请</div>
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

// 标签配置
const tabs = ref([
  { key: 'received', label: '收到的', count: 0 },
  { key: 'sent', label: '发出的', count: 0 }
])

const activeTab = ref('received')

// 收到的申请列表
const receivedRequests = ref([])

// 发出的申请列表
const sentRequests = ref([])

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

// 切换标签
const switchTab = (tab) => {
  activeTab.value = tab
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

// 处理好友申请
const handleRequest = async (request, action) => {
  request.processing = true

  // 模拟处理延迟
  await new Promise(resolve => setTimeout(resolve, 500))

  // TODO: 调用API处理申请
  console.log(`${action} friend request:`, request.id)

  request.status = action === 'accept' ? 'accepted' : 'rejected'
  request.processing = false

  // 更新计数
  updateTabCounts()

  // 震动反馈
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }

  // 显示提示
  alert(action === 'accept' ? '已添加为好友' : '已拒绝申请')
}

// 更新标签计数
const updateTabCounts = () => {
  tabs.value[0].count = receivedRequests.value.filter(r => r.status === 'pending').length
  tabs.value[1].count = 0
}

// 返回
const goBack = () => {
  router.back()
}

// 初始化
onMounted(() => {
  // 模拟数据 - 收到的申请
  receivedRequests.value = [
    {
      id: 'req_001',
      userId: 'user_001',
      name: '李小红',
      avatar: '👩',
      phone: '138****1234',
      villageName: '东村',
      message: '你好，我是东村的李小红',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      status: 'pending',
      processing: false
    },
    {
      id: 'req_002',
      userId: 'user_002',
      name: '王大明',
      avatar: '👨',
      phone: '139****5678',
      villageName: '西村',
      message: '请通过一下好友验证',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      status: 'pending',
      processing: false
    },
    {
      id: 'req_003',
      userId: 'user_003',
      name: '张美丽',
      avatar: '👩‍🦰',
      phone: '137****9012',
      villageName: '东村',
      message: '邻居你好',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      status: 'accepted',
      processing: false
    }
  ]

  // 模拟数据 - 发出的申请
  sentRequests.value = [
    {
      id: 'req_sent_001',
      userId: 'user_004',
      name: '赵强',
      avatar: '👨‍🌾',
      villageName: '南村',
      message: '你好，我是张大山',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      status: 'pending'
    },
    {
      id: 'req_sent_002',
      userId: 'user_005',
      name: '孙芳',
      avatar: '👩‍🌾',
      villageName: '北村',
      message: '请加为好友',
      timestamp: new Date(Date.now() - 172800000).toISOString(),
      status: 'rejected'
    }
  ]

  updateTabCounts()
})
</script>

<style lang="scss" scoped>
.friend-requests-page {
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

.tabs {
  display: flex;
  background: #fff;
  border-bottom: 1px solid #eee;

  .tab-item {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 14px 0;
    cursor: pointer;
    position: relative;

    .tab-text {
      font-size: 14px;
      color: #666;
    }

    .tab-badge {
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      background: #ff4d4f;
      color: #fff;
      font-size: 10px;
      line-height: 16px;
      text-align: center;
      border-radius: 8px;
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

.content {
  flex: 1;
  overflow-y: auto;
}

.request-list {
  padding: 8px 0;

  .request-card {
    display: flex;
    padding: 16px;
    background: #fff;
    border-bottom: 1px solid #f5f5f5;

    .request-avatar {
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

    .request-info {
      flex: 1;

      .request-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .request-name {
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .request-time {
          font-size: 12px;
          color: #999;
        }
      }

      .request-message {
        font-size: 14px;
        color: #666;
        margin-bottom: 8px;
        line-height: 1.5;

        .message-label {
          color: #999;
        }

        .message-text {
          color: #333;
        }
      }

      .request-meta {
        font-size: 12px;
        color: #999;
        margin-bottom: 12px;

        .meta-divider {
          margin: 0 8px;
        }
      }

      .request-actions {
        display: flex;
        gap: 8px;

        .action-btn {
          flex: 1;
          height: 36px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;

          &.reject {
            background: #f5f5f5;
            color: #666;
          }

          &.accept {
            background: #1890ff;
            color: #fff;
          }

          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        }
      }

      .request-status {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 14px;

        .status-icon {
          font-size: 16px;
        }

        &.pending {
          color: #999;
        }

        &.accepted {
          color: #52c41a;
        }

        &.rejected {
          color: #999;
        }
      }
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 20px;

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

  .request-card .request-info .request-top .request-name {
    font-size: 18px;
  }
}

:deep(.elderly-mode-xl) {
  .page-header .header-title {
    font-size: 28px;
  }

  .request-card .request-info .request-top .request-name {
    font-size: 20px;
  }
}
</style>
