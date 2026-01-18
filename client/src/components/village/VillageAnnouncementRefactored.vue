<!--
  VillageAnnouncementRefactored.vue
  重构后的村务公告管理组件

  设计原则:
  - 风格: 极简主义 + 可访问性 + 政府服务专业风格
  - 颜色: 深蓝主色调 + 清新绿色辅助 (保留项目主题)
  - 字体: Noto Sans SC (中文优化)
  - 可访问性: WCAG 2.1 AA 级标准
-->
<template>
  <div class="village-announcement-refactored">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-container">
        <div class="header-left">
          <div class="header-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 5.882V19.24a1.76 1.76 0 0 1-3.417.592l-2.147-6.15M18 13a3 3 0 1 0 0-6M7.436 6.878L10.5 2"/>
            </svg>
          </div>
          <div class="header-content">
            <h1 class="page-title">村务公告</h1>
            <p class="page-subtitle">发布和管理村务公告，服务全体村民</p>
          </div>
        </div>
        <div class="header-actions">
          <button
            class="btn btn-primary"
            @click="handleCreateAnnouncement"
            aria-label="创建新公告"
          >
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>发布公告</span>
          </button>
          <button
            class="btn btn-secondary"
            @click="handleExport"
            aria-label="导出公告列表"
          >
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>导出</span>
          </button>
        </div>
      </div>
    </header>

    <!-- 统计概览卡片 -->
    <section class="stats-section" aria-label="公告统计">
      <div class="stats-grid">
        <div class="stat-card" v-for="stat in stats" :key="stat.key">
          <div class="stat-icon" :class="stat.color">
            <svg v-if="stat.icon === 'bell'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <svg v-else-if="stat.icon === 'eye'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <svg v-else-if="stat.icon === 'check'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
            <svg v-else-if="stat.icon === 'archive'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <polyline points="21,8 21,21 3,21 3,8"/>
              <rect x="1" y="3" width="22" height="5"/>
              <line x1="10" y1="12" x2="14" y2="12"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
          <div class="stat-change" :class="stat.trend">
            <span class="trend-icon">{{ stat.trend === 'up' ? '↑' : stat.trend === 'down' ? '↓' : '−' }}</span>
            <span class="trend-value">{{ stat.change }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 筛选和搜索区域 -->
    <section class="filter-section" aria-label="筛选和搜索">
      <div class="filter-container">
        <!-- 快速筛选标签 -->
        <div class="filter-tags">
          <button
            v-for="filter in quickFilters"
            :key="filter.key"
            class="filter-tag"
            :class="{ active: activeFilter === filter.key }"
            @click="handleFilterChange(filter.key)"
            :aria-label="`筛选${filter.label}`"
            :aria-pressed="activeFilter === filter.key"
          >
            <span class="filter-label">{{ filter.label }}</span>
            <span class="filter-count">{{ filter.count }}</span>
          </button>
        </div>

        <!-- 搜索栏 -->
        <div class="search-bar">
          <div class="search-input-wrapper">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              v-model="searchQuery"
              type="search"
              class="search-input"
              placeholder="搜索公告标题或内容..."
              @input="handleSearch"
              aria-label="搜索公告"
            />
            <button
              v-if="searchQuery"
              class="search-clear"
              @click="clearSearch"
              aria-label="清除搜索"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 公告列表 -->
    <main class="announcements-main" aria-label="公告列表">
      <div v-if="loading" class="loading-state" role="status" aria-live="polite">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>

      <div v-else-if="filteredAnnouncements.length === 0" class="empty-state">
        <div class="empty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
          </svg>
        </div>
        <h3 class="empty-title">暂无公告</h3>
        <p class="empty-description">{{ searchQuery ? '未找到匹配的公告' : '点击上方按钮发布第一条公告' }}</p>
        <button
          v-if="!searchQuery"
          class="btn btn-primary"
          @click="handleCreateAnnouncement"
        >
          发布公告
        </button>
      </div>

      <div v-else class="announcement-list">
        <article
          v-for="announcement in filteredAnnouncements"
          :key="announcement.id"
          class="announcement-card"
          :class="{ 'is-urgent': announcement.priority === 'urgent' }"
        >
          <!-- 优先级指示器 -->
          <div
            v-if="announcement.priority === 'urgent'"
            class="priority-indicator"
            aria-label="紧急公告"
          ></div>

          <div class="card-header">
            <div class="card-meta">
              <span
                class="category-tag"
                :class="getCategoryClass(announcement.category)"
              >
                {{ getCategoryLabel(announcement.category) }}
              </span>
              <span
                class="priority-badge"
                :class="getPriorityClass(announcement.priority)"
              >
                <svg v-if="announcement.priority === 'urgent'" class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                {{ getPriorityLabel(announcement.priority) }}
              </span>
            </div>
            <span class="publish-date">
              <svg class="date-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {{ formatDate(announcement.publishedAt) }}
            </span>
          </div>

          <h3 class="card-title">
            <button
              class="title-link"
              @click="handleView(announcement)"
              :aria-label="`查看公告: ${announcement.title}`"
            >
              {{ announcement.title }}
            </button>
          </h3>

          <p class="card-summary">{{ getSummary(announcement.content) }}</p>

          <div class="card-footer">
            <div class="card-stats">
              <span class="stat-item" title="阅读量">
                <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                {{ announcement.readCount || 0 }}
              </span>
              <span v-if="announcement.attachments?.length" class="stat-item" title="附件数量">
                <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
                {{ announcement.attachments.length }}
              </span>
            </div>

            <div class="card-actions">
              <button
                class="action-btn"
                @click="handleEdit(announcement)"
                :aria-label="`编辑公告: ${announcement.title}`"
                v-if="canEdit(announcement)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button
                class="action-btn action-btn-danger"
                @click="handleDelete(announcement)"
                :aria-label="`删除公告: ${announcement.title}`"
                v-if="canDelete(announcement)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <polyline points="3,6 5,6 21,6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
              <button
                class="action-btn"
                @click="handleShare(announcement)"
                :aria-label="`分享公告: ${announcement.title}`"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </button>
            </div>
          </div>
        </article>
      </div>

      <!-- 分页 -->
      <nav v-if="pagination.total > pagination.limit" class="pagination" aria-label="分页导航">
        <button
          class="pagination-btn"
          :disabled="pagination.page === 1"
          @click="handlePageChange(pagination.page - 1)"
          aria-label="上一页"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
        </button>
        <span class="pagination-info">
          第 {{ pagination.page }} 页，共 {{ totalPages }} 页
        </span>
        <button
          class="pagination-btn"
          :disabled="pagination.page >= totalPages"
          @click="handlePageChange(pagination.page + 1)"
          aria-label="下一页"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="9,18 15,12 9,6"/>
          </svg>
        </button>
      </nav>
    </main>

    <!-- 公告详情对话框 -->
    <div
      v-if="detailDialog.visible"
      class="modal-overlay"
      @click="handleCloseDetailDialog"
      @keydown.esc="handleCloseDetailDialog"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="detailDialog.data?.title"
    >
      <div
        class="modal-content"
        @click.stop
        role="document"
      >
        <div class="modal-header">
          <h2 id="detail-title">{{ detailDialog.data?.title }}</h2>
          <button
            class="modal-close"
            @click="handleCloseDetailDialog"
            aria-label="关闭对话框"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="detail-meta">
            <span class="detail-tag">{{ getCategoryLabel(detailDialog.data?.category) }}</span>
            <span class="detail-date">{{ formatDate(detailDialog.data?.publishedAt) }}</span>
          </div>
          <div class="detail-content" v-html="detailDialog.data?.content"></div>
          <div v-if="detailDialog.data?.attachments?.length" class="detail-attachments">
            <h4>附件</h4>
            <div class="attachment-list">
              <a
                v-for="attachment in detailDialog.data.attachments"
                :key="attachment.id"
                :href="attachment.url"
                class="attachment-item"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                  <polyline points="13,2 13,9 20,9"/>
                </svg>
                <span>{{ attachment.name }}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// 响应式数据
const loading = ref(false)
const searchQuery = ref('')
const activeFilter = ref('all')

// 统计数据
const stats = ref([
  { key: 'total', label: '全部公告', value: '24', icon: 'bell', color: 'blue', trend: 'up', change: '+3' },
  { key: 'published', label: '已发布', value: '18', icon: 'check', color: 'green', trend: 'up', change: '+2' },
  { key: 'draft', label: '草稿', value: '4', icon: 'archive', color: 'gray', trend: 'stable', change: '0' },
  { key: 'views', label: '总阅读', value: '1.2k', icon: 'eye', color: 'purple', trend: 'up', change: '+15%' }
])

// 快速筛选
const quickFilters = ref([
  { key: 'all', label: '全部', count: 24 },
  { key: 'published', label: '已发布', count: 18 },
  { key: 'draft', label: '草稿', count: 4 },
  { key: 'urgent', label: '紧急', count: 2 }
])

// 分页
const pagination = ref({
  page: 1,
  limit: 10,
  total: 24
})

// 详情对话框
const detailDialog = ref({
  visible: false,
  data: null
})

// 模拟公告数据
const announcements = ref([
  {
    id: '1',
    title: '关于开展2024年度村民体检的通知',
    content: '为保障村民身体健康，村委会决定于2024年3月1日至3月15日组织全体村民进行年度体检。请各位村民携带身份证到村委会登记预约。',
    category: 'notice',
    priority: 'urgent',
    status: 'published',
    publishedAt: '2024-02-20T10:00:00',
    readCount: 156,
    attachments: [
      { id: 'a1', name: '体检安排表.pdf', url: '#' }
    ]
  },
  {
    id: '2',
    title: '村道路硬化工程公告',
    content: '为改善村民出行条件，经村委会研究决定，将于近期对村内主要道路进行硬化改造，工期预计30天。',
    category: 'policy',
    priority: 'high',
    status: 'published',
    publishedAt: '2024-02-18T14:30:00',
    readCount: 89,
    attachments: []
  },
  {
    id: '3',
    title: '2024年春节文化活动安排',
    content: '为丰富村民文化生活，村委会计划在春节期间举办系列文化活动，包括文艺演出、体育比赛等。',
    category: 'activity',
    priority: 'medium',
    status: 'published',
    publishedAt: '2024-02-10T09:00:00',
    readCount: 234,
    attachments: [
      { id: 'a2', name: '活动日程表.docx', url: '#' },
      { id: 'a3', name: '活动海报.jpg', url: '#' }
    ]
  }
])

// 计算属性
const filteredAnnouncements = computed(() => {
  let result = announcements.value

  // 按筛选条件过滤
  if (activeFilter.value !== 'all') {
    if (activeFilter.value === 'urgent') {
      result = result.filter(a => a.priority === 'urgent')
    } else {
      result = result.filter(a => a.status === activeFilter.value)
    }
  }

  // 按搜索关键词过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(a =>
      a.title.toLowerCase().includes(query) ||
      a.content.toLowerCase().includes(query)
    )
  }

  return result
})

const totalPages = computed(() => {
  return Math.ceil(pagination.value.total / pagination.value.limit)
})

// 当前用户
const currentUser = ref({ role: 'admin' })

// 方法
const getCategoryLabel = (category) => {
  const labels = {
    notice: '通知',
    policy: '政策',
    activity: '活动',
    general: '公告'
  }
  return labels[category] || category
}

const getPriorityLabel = (priority) => {
  const labels = {
    urgent: '紧急',
    high: '重要',
    medium: '一般',
    low: '普通'
  }
  return labels[priority] || priority
}

const getCategoryClass = (category) => {
  const classes = {
    notice: 'tag-notice',
    policy: 'tag-policy',
    activity: 'tag-activity',
    general: 'tag-general'
  }
  return classes[category] || 'tag-general'
}

const getPriorityClass = (priority) => {
  const classes = {
    urgent: 'priority-urgent',
    high: 'priority-high',
    medium: 'priority-medium',
    low: 'priority-low'
  }
  return classes[priority] || 'priority-medium'
}

const getSummary = (content) => {
  return content.length > 100 ? content.substring(0, 100) + '...' : content
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`

  return date.toLocaleDateString('zh-CN')
}

const handleFilterChange = (filter) => {
  activeFilter.value = filter
}

const handleSearch = () => {
  // 搜索逻辑已在 computed 中实现
}

const clearSearch = () => {
  searchQuery.value = ''
}

const handleView = (announcement) => {
  detailDialog.value.data = announcement
  detailDialog.value.visible = true
}

const handleEdit = (announcement) => {
  console.log('编辑公告:', announcement.title)
}

const handleDelete = (announcement) => {
  if (confirm(`确定要删除公告"${announcement.title}"吗？`)) {
    console.log('删除公告:', announcement.title)
  }
}

const handleShare = (announcement) => {
  console.log('分享公告:', announcement.title)
}

const handleCreateAnnouncement = () => {
  console.log('创建新公告')
}

const handleExport = () => {
  console.log('导出公告列表')
}

const handlePageChange = (page) => {
  pagination.value.page = page
}

const handleCloseDetailDialog = () => {
  detailDialog.value.visible = false
  detailDialog.value.data = null
}

const canEdit = (announcement) => {
  return currentUser.value?.role === 'admin'
}

const canDelete = (announcement) => {
  return currentUser.value?.role === 'admin'
}

onMounted(() => {
  // 初始化数据加载
})
</script>

<style scoped>
/* ==================== CSS 变量 ==================== */
:root {
  /* 颜色系统 - 政府服务风格 */
  --color-primary: #0F172A;
  --color-primary-light: #334155;
  --color-primary-dark: #020617;

  /* 项目主题色 */
  --color-success: #10b981;
  --color-success-light: #34d399;
  --color-success-dark: #059669;

  /* 语义颜色 */
  --color-danger: #ef4444;
  --color-warning: #f59e0b;
  --color-info: #3b82f6;

  /* 中性色 */
  --color-bg-primary: #F8FAFC;
  --color-bg-secondary: #ffffff;
  --color-bg-tertiary: #f1f5f9;

  --color-text-primary: #020617;
  --color-text-secondary: #475569;
  --color-text-tertiary: #94a3b8;

  --color-border: #e2e8f0;
  --color-border-light: #f1f5f9;

  /* 阴影 */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

  /* 圆角 */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* 过渡 */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* ==================== 全局样式 ==================== */
.village-announcement-refactored {
  min-height: 100vh;
  background-color: var(--color-bg-primary);
  font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: var(--color-text-primary);
  line-height: 1.5;
}

/* ==================== 页面头部 ==================== */
.page-header {
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  padding: 24px 32px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-success), var(--color-success-dark));
  color: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.header-icon svg {
  width: 24px;
  height: 24px;
}

.header-content h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: var(--color-text-primary);
}

.header-content p {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* ==================== 按钮 ==================== */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 500;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn:focus {
  outline: 2px solid var(--color-success);
  outline-offset: 2px;
}

.btn-icon {
  width: 18px;
  height: 18px;
}

.btn-primary {
  background-color: var(--color-success);
  color: white;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.btn-primary:hover {
  background-color: var(--color-success-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.btn-secondary {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background-color: var(--color-border-light);
  border-color: var(--color-text-tertiary);
}

/* ==================== 统计卡片 ==================== */
.stats-section {
  padding: 24px 32px;
}

.stats-grid {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.stat-card {
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid var(--color-border);
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);
}

.stat-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.stat-icon svg {
  width: 24px;
  height: 24px;
}

.stat-icon.blue {
  background-color: rgba(59, 130, 246, 0.1);
  color: var(--color-info);
}

.stat-icon.green {
  background-color: rgba(16, 185, 129, 0.1);
  color: var(--color-success);
}

.stat-icon.gray {
  background-color: rgba(148, 163, 184, 0.1);
  color: var(--color-text-tertiary);
}

.stat-icon.purple {
  background-color: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.stat-change {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: var(--radius-full);
}

.stat-change.up {
  background-color: rgba(16, 185, 129, 0.1);
  color: var(--color-success);
}

.stat-change.down {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--color-danger);
}

.stat-change.stable {
  background-color: rgba(148, 163, 184, 0.1);
  color: var(--color-text-tertiary);
}

/* ==================== 筛选区域 ==================== */
.filter-section {
  padding: 0 32px 24px;
}

.filter-container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: 14px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
}

.filter-tag:hover {
  border-color: var(--color-text-tertiary);
  background-color: var(--color-bg-tertiary);
}

.filter-tag.active {
  background-color: var(--color-success);
  border-color: var(--color-success);
  color: white;
}

.filter-count {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 2px 6px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
}

.filter-tag.active .filter-count {
  background-color: rgba(255, 255, 255, 0.2);
}

.search-bar {
  width: 100%;
  max-width: 480px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 14px;
  width: 18px;
  height: 18px;
  color: var(--color-text-tertiary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 10px 14px 10px 42px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  transition: all var(--transition-base);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-success);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

.search-clear {
  position: absolute;
  right: 8px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.search-clear:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
}

.search-clear svg {
  width: 16px;
  height: 16px;
}

/* ==================== 主要内容区域 ==================== */
.announcements-main {
  padding: 0 32px 32px;
}

.announcement-list {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ==================== 公告卡片 ==================== */
.announcement-card {
  position: relative;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);
}

.announcement-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background-color: var(--color-border);
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
  transition: background-color var(--transition-base);
}

.announcement-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-text-tertiary);
}

.announcement-card:hover::before {
  background-color: var(--color-success);
}

.announcement-card.is-urgent::before {
  background-color: var(--color-danger);
}

.priority-indicator {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 8px;
  height: 8px;
  background-color: var(--color-danger);
  border-radius: var(--radius-full);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
}

.card-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.category-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-sm);
}

.tag-notice {
  background-color: rgba(59, 130, 246, 0.1);
  color: var(--color-info);
}

.tag-policy {
  background-color: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.tag-activity {
  background-color: rgba(16, 185, 129, 0.1);
  color: var(--color-success);
}

.tag-general {
  background-color: rgba(148, 163, 184, 0.1);
  color: var(--color-text-secondary);
}

.priority-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-sm);
}

.priority-urgent {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--color-danger);
}

.priority-high {
  background-color: rgba(245, 158, 11, 0.1);
  color: var(--color-warning);
}

.priority-medium {
  background-color: rgba(148, 163, 184, 0.1);
  color: var(--color-text-secondary);
}

.priority-low {
  background-color: rgba(16, 185, 129, 0.1);
  color: var(--color-success);
}

.badge-icon {
  width: 14px;
  height: 14px;
}

.publish-date {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.date-icon {
  width: 14px;
  height: 14px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.title-link {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: var(--color-text-primary);
  cursor: pointer;
  text-align: left;
  transition: color var(--transition-fast);
}

.title-link:hover {
  color: var(--color-success);
}

.title-link:focus {
  outline: 2px solid var(--color-success);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

.card-summary {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 16px 0;
  line-height: 1.6;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-light);
}

.card-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.stat-icon {
  width: 16px;
  height: 16px;
}

.card-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn svg {
  width: 18px;
  height: 18px;
}

.action-btn:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
}

.action-btn:focus {
  outline: 2px solid var(--color-success);
  outline-offset: 2px;
}

.action-btn-danger:hover {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--color-danger);
}

/* ==================== 加载和空状态 ==================== */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-success);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-state p {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: var(--color-text-tertiary);
  margin-bottom: 16px;
}

.empty-icon svg {
  width: 100%;
  height: 100%;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 8px 0;
}

.empty-description {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 24px 0;
}

/* ==================== 分页 ==================== */
.pagination {
  max-width: 1400px;
  margin: 24px auto 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.pagination-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
}

.pagination-btn:hover:not(:disabled) {
  border-color: var(--color-success);
  color: var(--color-success);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-btn svg {
  width: 18px;
  height: 18px;
}

.pagination-info {
  font-size: 14px;
  color: var(--color-text-secondary);
}

/* ==================== 模态对话框 ==================== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 700px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;
  box-shadow: var(--shadow-xl);
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--color-text-primary);
  flex: 1;
  padding-right: 16px;
}

.modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.modal-close:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.modal-close svg {
  width: 20px;
  height: 20px;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
}

.detail-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.detail-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
}

.detail-date {
  font-size: 13px;
  color: var(--color-text-tertiary);
  display: inline-flex;
  align-items: center;
}

.detail-content {
  font-size: 15px;
  line-height: 1.7;
  color: var(--color-text-primary);
}

.detail-attachments {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border-light);
}

.detail-attachments h4 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: var(--color-text-primary);
}

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment-item {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--color-text-primary);
  font-size: 14px;
  transition: all var(--transition-base);
}

.attachment-item:hover {
  border-color: var(--color-success);
  background-color: rgba(16, 185, 129, 0.05);
}

.attachment-item svg {
  width: 18px;
  height: 18px;
  color: var(--color-text-tertiary);
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 1024px) {
  .header-container {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .page-header,
  .stats-section,
  .filter-section,
  .announcements-main {
    padding-left: 20px;
    padding-right: 20px;
  }

  .header-left {
    gap: 12px;
  }

  .header-icon {
    width: 40px;
    height: 40px;
  }

  .header-content h1 {
    font-size: 20px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .filter-tags {
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 4px;
  }

  .filter-tag {
    flex-shrink: 0;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .card-footer {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .card-actions {
    width: 100%;
    justify-content: flex-end;
  }
}

/* ==================== 可访问性增强 ==================== */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* 焦点可见性 */
*:focus-visible {
  outline: 2px solid var(--color-success);
  outline-offset: 2px;
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .announcement-card {
    border-width: 2px;
  }

  .btn {
    border-width: 2px;
  }
}
</style>
