<template>
  <div class="data-collection-page">
    <!-- 顶部导航栏 -->
    <div class="page-header">
      <button class="back-btn" @click="goBack">
        <span class="icon">←</span>
      </button>
      <span class="header-title">资料收集</span>
      <button class="add-btn" @click="createCollection">
        <span class="icon">+</span>
      </button>
    </div>

    <!-- 筛选标签 -->
    <div class="filter-tabs">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab-item', { 'tab-item--active': activeTab === tab.key }]"
        @click="switchTab(tab.key)"
      >
        <span class="tab-text">{{ tab.label }}</span>
        <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
      </div>
    </div>

    <!-- 收集列表 -->
    <div class="collection-list">
      <div
        v-for="collection in filteredCollections"
        :key="collection.id"
        class="collection-card"
        @click="viewCollection(collection)"
      >
        <div class="card-header">
          <div class="card-title">{{ collection.title }}</div>
          <div class="card-status" :class="collection.status">
            {{ getStatusText(collection.status) }}
          </div>
        </div>

        <div class="card-desc">{{ collection.description }}</div>

        <div class="card-meta">
          <div class="meta-item">
            <span class="meta-icon">📋</span>
            <span class="meta-text">表单项：{{ collection.fieldCount }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">👥</span>
            <span class="meta-text">已提交：{{ collection.submittedCount }}/{{ collection.targetCount }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">⏰</span>
            <span class="meta-text">{{ formatDate(collection.deadline) }}</span>
          </div>
        </div>

        <div class="card-footer">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: collection.progress + '%' }"></div>
          </div>
          <div class="progress-text">
            <span>完成进度</span>
            <span>{{ collection.progress }}%</span>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredCollections.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-text">暂无收集任务</div>
        <div class="empty-hint">点击右上角创建新的收集任务</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { useElderlyStore } from '@/store/elderly'

const router = useRouter()
const userStore = useUserStore()
const elderlyStore = useElderlyStore()

// 是否是村干部
const isOfficial = computed(() => userStore.isOfficial)

// 标签配置
const tabs = ref([
  { key: 'all', label: '全部', count: 0 },
  { key: 'active', label: '进行中', count: 0 },
  { key: 'pending', label: '待审核', count: 0 },
  { key: 'completed', label: '已完成', count: 0 }
])

const activeTab = ref('all')

// 收集任务列表
const collections = ref([
  {
    id: 'col_001',
    title: '2024年村民基本信息统计',
    description: '收集全村村民的基本信息，包括姓名、身份证号、联系方式等',
    status: 'active',
    fieldCount: 12,
    submittedCount: 156,
    targetCount: 200,
    deadline: '2024-03-31',
    progress: 78,
    createdAt: '2024-01-15'
  },
  {
    id: 'col_002',
    title: '农业补贴申请资料',
    description: '收集农业补贴申请所需的证明材料',
    status: 'pending',
    fieldCount: 8,
    submittedCount: 45,
    targetCount: 50,
    deadline: '2024-02-28',
    progress: 90,
    createdAt: '2024-01-20'
  },
  {
    id: 'col_003',
    title: '困难家庭情况摸底',
    description: '摸底排查困难家庭的基本情况，为帮扶工作提供依据',
    status: 'completed',
    fieldCount: 15,
    submittedCount: 30,
    targetCount: 30,
    deadline: '2024-01-31',
    progress: 100,
    createdAt: '2024-01-01'
  },
  {
    id: 'col_004',
    title: '疫苗接种情况统计',
    description: '统计全村各类疫苗接种情况',
    status: 'active',
    fieldCount: 6,
    submittedCount: 180,
    targetCount: 200,
    deadline: '2024-04-30',
    progress: 90,
    createdAt: '2024-02-01'
  }
])

// 是否适老化模式
const isElderlyMode = computed(() => elderlyStore.isElderlyMode)

// 过滤后的列表
const filteredCollections = computed(() => {
  if (activeTab.value === 'all') {
    return collections.value
  }
  return collections.value.filter(c => c.status === activeTab.value)
})

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '无截止时间'
  const date = new Date(dateStr)
  const now = new Date()
  const diff = date - now
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (days < 0) {
    return '已截止'
  } else if (days === 0) {
    return '今天截止'
  } else if (days <= 7) {
    return `${days}天后截止`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    active: '进行中',
    pending: '待审核',
    completed: '已完成'
  }
  return statusMap[status] || '未知'
}

// 切换标签
const switchTab = (key) => {
  activeTab.value = key
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

// 查看收集详情
const viewCollection = (collection) => {
  router.push(`/services/collection-detail/${collection.id}`)
}

// 创建收集任务
const createCollection = () => {
  router.push('/services/create-collection')
}

// 返回
const goBack = () => {
  router.back()
}
</script>

<style lang="scss" scoped>
.data-collection-page {
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
    font-size: 24px;
    color: #1890ff;

    &:active {
      background: #f5f5f5;
    }
  }
}

.filter-tabs {
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

    .tab-count {
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

.collection-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;

  .collection-card {
    background: #fff;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
    cursor: pointer;
    transition: box-shadow 0.2s;

    &:active {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;

      .card-title {
        flex: 1;
        font-size: 16px;
        font-weight: 600;
        color: #333;
        line-height: 1.4;
      }

      .card-status {
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 4px;
        flex-shrink: 0;
        margin-left: 12px;

        &.active {
          background: #e6f7ff;
          color: #1890ff;
        }

        &.pending {
          background: #fffbe6;
          color: #faad14;
        }

        &.completed {
          background: #f6ffed;
          color: #52c41a;
        }
      }
    }

    .card-desc {
      font-size: 14px;
      color: #666;
      line-height: 1.6;
      margin-bottom: 16px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 16px;

      .meta-item {
        display: flex;
        align-items: center;
        gap: 4px;

        .meta-icon {
          font-size: 14px;
        }

        .meta-text {
          font-size: 13px;
          color: #999;
        }
      }
    }

    .card-footer {
      .progress-bar {
        height: 6px;
        background: #f0f0f0;
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 8px;

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #1890ff, #52c41a);
          transition: width 0.3s ease;
        }
      }

      .progress-text {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #999;
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

  .collection-card .card-header .card-title {
    font-size: 18px;
  }
}

:deep(.elderly-mode-xl) {
  .page-header .header-title {
    font-size: 28px;
  }

  .collection-card {
    padding: 20px;

    .card-header .card-title {
      font-size: 20px;
    }

    .card-desc {
      font-size: 16px;
    }

    .card-meta .meta-item .meta-text {
      font-size: 14px;
    }
  }
}
</style>
