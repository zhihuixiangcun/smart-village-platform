<template>
  <div class="documents-page">
    <!-- 顶部导航栏 -->
    <div class="page-header">
      <button class="back-btn" @click="goBack">
        <span class="icon">←</span>
      </button>
      <span class="header-title">我的证件</span>
      <button class="add-btn" @click="addDocument">
        <span class="icon">+</span>
      </button>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-card">
      <div class="stat-item">
        <span class="stat-value">{{ documents.length }}</span>
        <span class="stat-label">全部证件</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ expiredCount }}</span>
        <span class="stat-label">即将过期</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ expiringCount }}</span>
        <span class="stat-label">已过期</span>
      </div>
    </div>

    <!-- 筛选标签 -->
    <div class="filter-tabs">
      <div
        v-for="tab in filterTabs"
        :key="tab.key"
        :class="['tab-item', { 'tab-item--active': activeFilter === tab.key }]"
        @click="switchFilter(tab.key)"
      >
        <span class="tab-text">{{ tab.label }}</span>
        <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
      </div>
    </div>

    <!-- 证件列表 -->
    <div class="documents-list">
      <div
        v-for="doc in filteredDocuments"
        :key="doc.id"
        class="document-card"
        :class="{ 'expiring': doc.status === 'expiring', 'expired': doc.status === 'expired' }"
        @click="viewDocument(doc)"
      >
        <!-- 证件图标 -->
        <div class="doc-icon">{{ doc.icon }}</div>

        <!-- 证件信息 -->
        <div class="doc-info">
          <div class="doc-top">
            <span class="doc-name">{{ doc.name }}</span>
            <span class="doc-status" :class="doc.status">{{ getStatusText(doc.status) }}</span>
          </div>
          <div class="doc-number">编号：{{ doc.number }}</div>
          <div class="doc-date">
            <span class="date-label">有效期至：</span>
            <span class="date-value">{{ formatDate(doc.expiryDate) }}</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="doc-actions" @click.stop>
          <button class="action-btn" @click="showDocumentMenu(doc)">
            <span class="action-icon">⋯</span>
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredDocuments.length === 0" class="empty-state">
        <div class="empty-icon">📄</div>
        <div class="empty-text">暂无证件</div>
        <div class="empty-hint">点击右上角添加证件</div>
      </div>
    </div>

    <!-- 证件菜单弹窗 -->
    <div v-if="showMenu" class="menu-overlay" @click="showMenu = false">
      <div class="menu-content" @click.stop>
        <div class="menu-item" @click="viewDocumentDetail">
          <span class="menu-icon">👁️</span>
          <span class="menu-text">查看详情</span>
        </div>
        <div class="menu-item" @click="editDocument">
          <span class="menu-icon">✏️</span>
          <span class="menu-text">编辑信息</span>
        </div>
        <div class="menu-item" @click="shareDocument">
          <span class="menu-icon">📤</span>
          <span class="menu-text">分享证件</span>
        </div>
        <div class="menu-item danger" @click="deleteDocument">
          <span class="menu-icon">🗑️</span>
          <span class="menu-text">删除证件</span>
        </div>
      </div>
    </div>

    <!-- 证件详情弹窗 -->
    <div v-if="showDetail" class="detail-overlay" @click="showDetail = false">
      <div class="detail-content" @click.stop>
        <div class="detail-header">
          <span class="detail-title">{{ selectedDocument?.name }}</span>
          <button class="detail-close" @click="showDetail = false">×</button>
        </div>

        <div class="detail-body">
          <!-- 证件图片 -->
          <div class="doc-image">
            <div class="image-placeholder">{{ selectedDocument?.icon }}</div>
          </div>

          <!-- 证件信息 -->
          <div class="info-section">
            <div class="info-item">
              <span class="info-label">证件名称</span>
              <span class="info-value">{{ selectedDocument?.name }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">证件号码</span>
              <span class="info-value">{{ selectedDocument?.number }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">发证机关</span>
              <span class="info-value">{{ selectedDocument?.issuer }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">发证日期</span>
              <span class="info-value">{{ formatDate(selectedDocument?.issueDate) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">有效期至</span>
              <span class="info-value" :class="{ 'text-danger': isExpired(selectedDocument) }">
                {{ formatDate(selectedDocument?.expiryDate) }}
              </span>
            </div>
          </div>

          <!-- 备注 -->
          <div v-if="selectedDocument?.remark" class="remark-section">
            <div class="remark-label">备注</div>
            <div class="remark-text">{{ selectedDocument.remark }}</div>
          </div>
        </div>

        <div class="detail-footer">
          <button class="detail-btn secondary" @click="showDetail = false">
            <span>关闭</span>
          </button>
          <button class="detail-btn primary" @click="shareFromDetail">
            <span>分享</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useElderlyStore } from '@/store/elderly'

const router = useRouter()
const elderlyStore = useElderlyStore()

// 筛选标签
const filterTabs = ref([
  { key: 'all', label: '全部', count: 0 },
  { key: 'id_card', label: '身份证', count: 0 },
  { key: 'social', label: '社保卡', count: 0 },
  { key: 'medical', label: '医保卡', count: 0 },
  { key: 'household', label: '户口本', count: 0 },
  { key: 'other', label: '其他', count: 0 }
])

// 当前筛选
const activeFilter = ref('all')

// 菜单显示状态
const showMenu = ref(false)

// 详情显示状态
const showDetail = ref(false)

// 选中的证件
const selectedDocument = ref(null)

// 证件列表（模拟）
const documents = ref([
  {
    id: 'doc_001',
    type: 'id_card',
    name: '居民身份证',
    icon: '🪪',
    number: '110101199001011234',
    issuer: '东市公安局',
    issueDate: '2010-01-01',
    expiryDate: '2030-01-01',
    status: 'valid',
    remark: ''
  },
  {
    id: 'doc_002',
    type: 'social',
    name: '社会保障卡',
    icon: '💳',
    number: '1234567890123456',
    issuer: '东市社保局',
    issueDate: '2015-06-01',
    expiryDate: '2025-12-31',
    status: 'expiring',
    remark: ''
  },
  {
    id: 'doc_003',
    type: 'medical',
    name: '医疗保险证',
    icon: '🏥',
    number: 'YY9876543210',
    issuer: '东市医保局',
    issueDate: '2018-03-15',
    expiryDate: '2024-03-14',
    status: 'expired',
    remark: '需要重新办理'
  },
  {
    id: 'doc_004',
    type: 'household',
    name: '户口本',
    icon: '📕',
    number: '东户字第001号',
    issuer: '东市公安局',
    issueDate: '2000-05-20',
    expiryDate: '',
    status: 'valid',
    remark: '户主：张大山'
  },
  {
    id: 'doc_005',
    type: 'other',
    name: '农村土地承包经营权证',
    icon: '📜',
    number: 'DB2020001',
    issuer: '东市农业农村局',
    issueDate: '2020-01-01',
    expiryDate: '2050-12-31',
    status: 'valid',
    remark: '承包地面积：5亩'
  }
])

// 是否适老化模式
const isElderlyMode = computed(() => elderlyStore.isElderlyMode)

// 过滤后的证件
const filteredDocuments = computed(() => {
  if (activeFilter.value === 'all') {
    return documents.value
  }
  return documents.value.filter(doc => doc.type === activeFilter.value)
})

// 即将过期数量（30天内）
const expiringCount = computed(() => {
  const now = new Date()
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  return documents.value.filter(doc => {
    if (!doc.expiryDate || doc.status === 'expired') return false
    const expiryDate = new Date(doc.expiryDate)
    return expiryDate <= thirtyDaysLater && expiryDate > now
  }).length
})

// 已过期数量
const expiredCount = computed(() => {
  return documents.value.filter(doc => doc.status === 'expired').length
})

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '长期有效'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    valid: '有效',
    expiring: '即将过期',
    expired: '已过期'
  }
  return statusMap[status] || '未知'
}

// 判断是否过期
const isExpired = (doc) => {
  if (!doc?.expiryDate) return false
  const expiryDate = new Date(doc.expiryDate)
  return expiryDate < new Date()
}

// 切换筛选
const switchFilter = (key) => {
  activeFilter.value = key
  // 更新筛选标签的计数
  updateFilterCounts()
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

// 更新筛选标签计数
const updateFilterCounts = () => {
  filterTabs.value.forEach(tab => {
    if (tab.key === 'all') {
      tab.count = documents.value.length
    } else {
      tab.count = documents.value.filter(doc => doc.type === tab.key).length
    }
  })
}

// 查看证件
const viewDocument = (doc) => {
  selectedDocument.value = doc
  showDetail.value = true
}

// 显示证件菜单
const showDocumentMenu = (doc) => {
  selectedDocument.value = doc
  showMenu.value = true
}

// 查看证件详情
const viewDocumentDetail = () => {
  showMenu.value = false
  showDetail.value = true
}

// 添加证件
const addDocument = () => {
  // TODO: 跳转到添加证件页面
  console.log('添加证件')
}

// 编辑证件
const editDocument = () => {
  showMenu.value = false
  // TODO: 跳转到编辑证件页面
  console.log('编辑证件:', selectedDocument.value)
}

// 分享证件
const shareDocument = () => {
  showMenu.value = false
  // TODO: 实现分享功能
  console.log('分享证件:', selectedDocument.value)
}

// 从详情页分享
const shareFromDetail = () => {
  console.log('从详情分享证件:', selectedDocument.value)
}

// 删除证件
const deleteDocument = () => {
  showMenu.value = false
  if (confirm('确定要删除该证件吗？')) {
    const index = documents.value.findIndex(d => d.id === selectedDocument.value.id)
    if (index > -1) {
      documents.value.splice(index, 1)
      updateFilterCounts()
    }
  }
}

// 返回
const goBack = () => {
  router.back()
}

// 初始化
updateFilterCounts()
</script>

<style lang="scss" scoped>
.documents-page {
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

.stats-card {
  display: flex;
  padding: 20px;
  background: #fff;
  border-bottom: 1px solid #eee;

  .stat-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;

    .stat-value {
      font-size: 24px;
      font-weight: 600;
      color: #1890ff;
      margin-bottom: 8px;
    }

    .stat-label {
      font-size: 12px;
      color: #999;
    }
  }
}

.filter-tabs {
  display: flex;
  overflow-x: auto;
  background: #fff;
  border-bottom: 1px solid #eee;
  padding: 12px 16px;
  gap: 12px;

  &::-webkit-scrollbar {
    display: none;
  }

  .tab-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 16px;
    background: #f5f5f5;
    border-radius: 20px;
    white-space: nowrap;
    cursor: pointer;

    .tab-text {
      font-size: 14px;
      color: #666;
    }

    .tab-count {
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      background: #999;
      color: #fff;
      font-size: 10px;
      line-height: 16px;
      text-align: center;
      border-radius: 8px;
    }

    &--active {
      background: #1890ff;

      .tab-text {
        color: #fff;
      }

      .tab-count {
        background: #fff;
        color: #1890ff;
      }
    }
  }
}

.documents-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;

  .document-card {
    display: flex;
    align-items: center;
    padding: 16px;
    background: #fff;
    border-radius: 8px;
    margin-bottom: 8px;
    cursor: pointer;

    &:active {
      background: #f9f9f9;
    }

    &.expiring {
      border-left: 3px solid #faad14;
    }

    &.expired {
      border-left: 3px solid #ff4d4f;
      opacity: 0.7;
    }

    .doc-icon {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      background: #f0f0f0;
      margin-right: 12px;
    }

    .doc-info {
      flex: 1;

      .doc-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;

        .doc-name {
          font-size: 16px;
          font-weight: 500;
          color: #333;
        }

        .doc-status {
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 4px;

          &.valid {
            background: #f6ffed;
            color: #52c41a;
          }

          &.expiring {
            background: #fffbe6;
            color: #faad14;
          }

          &.expired {
            background: #fff1f0;
            color: #ff4d4f;
          }
        }
      }

      .doc-number {
        font-size: 13px;
        color: #666;
        margin-bottom: 4px;
      }

      .doc-date {
        font-size: 12px;
        color: #999;

        .date-label {
          margin-right: 4px;
        }
      }
    }

    .doc-actions {
      .action-btn {
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

        .action-icon {
          font-size: 18px;
        }
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

.menu-overlay,
.detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 2000;

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

      &.danger {
        .menu-text {
          color: #ff4d4f;
        }
      }

      .menu-icon {
        font-size: 20px;
        margin-right: 16px;
      }

      .menu-text {
        font-size: 16px;
        color: #333;
      }
    }
  }

  .detail-content {
    width: 100%;
    max-height: 80vh;
    background: #fff;
    border-radius: 16px 16px 0 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    .detail-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid #eee;

      .detail-title {
        font-size: 18px;
        font-weight: 600;
        color: #333;
      }

      .detail-close {
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
      }
    }

    .detail-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;

      .doc-image {
        display: flex;
        justify-content: center;
        margin-bottom: 24px;

        .image-placeholder {
          width: 200px;
          height: 140px;
          background: #f0f0f0;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
        }
      }

      .info-section {
        margin-bottom: 20px;

        .info-item {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #f5f5f5;

          &:last-child {
            border-bottom: none;
          }

          .info-label {
            font-size: 14px;
            color: #666;
          }

          .info-value {
            font-size: 14px;
            color: #333;
            text-align: right;

            &.text-danger {
              color: #ff4d4f;
            }
          }
        }
      }

      .remark-section {
        padding: 16px;
        background: #f9f9f9;
        border-radius: 8px;

        .remark-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }

        .remark-text {
          font-size: 14px;
          color: #333;
          line-height: 1.6;
        }
      }
    }

    .detail-footer {
      display: flex;
      border-top: 1px solid #eee;
      padding: 12px;

      .detail-btn {
        flex: 1;
        height: 44px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        cursor: pointer;

        &.secondary {
          background: #fff;
          color: #666;
          border: 1px solid #ddd;
          margin-right: 12px;
        }

        &.primary {
          background: #1890ff;
          color: #fff;
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

  .document-card .doc-info .doc-top .doc-name {
    font-size: 18px;
  }

  .detail-content .detail-header .detail-title {
    font-size: 22px;
  }
}

:deep(.elderly-mode-xl) {
  .page-header .header-title {
    font-size: 28px;
  }

  .document-card {
    padding: 20px;

    .doc-icon {
      width: 56px;
      height: 56px;
      font-size: 28px;
    }

    .doc-info .doc-top .doc-name {
      font-size: 20px;
    }
  }

  .detail-content .detail-header .detail-title {
    font-size: 28px;
  }
}
</style>
