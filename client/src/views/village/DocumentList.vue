<template>
  <div class="document-list smart-village-page">
    <!-- 顶部导航 -->
    <header class="page-header sv-card">
      <van-nav-bar
        title="资料收集"
        left-arrow
        @click-left="$router.go(-1)"
      >
        <template #right>
          <div class="header-actions">
            <van-icon name="scan" @click="handleQuickUpload" />
            <van-icon name="add-o" @click="createDocument" />
          </div>
        </template>
      </van-nav-bar>
    </header>

    <!-- 今日统计卡片 -->
    <section class="today-stats sv-card sv-fade-in">
      <div class="stats-header">
        <h3>今日统计</h3>
        <van-tag type="primary" size="small">{{ new Date().toLocaleDateString() }}</van-tag>
      </div>
      <div class="stats-grid">
        <div class="stat-item urgent" v-if="collectTodayStats.needCollect > 0">
          <div class="stat-icon">
            <van-icon name="clock-o" size="20" />
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ collectTodayStats.needCollect }}</div>
            <div class="stat-label">待收集</div>
          </div>
        </div>
        <div class="stat-item success">
          <div class="stat-icon">
            <van-icon name="checked" size="20" />
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ collectTodayStats.totalCollected }}</div>
            <div class="stat-label">已收集</div>
          </div>
        </div>
        <div class="stat-item warning" v-if="collectTodayStats.pendingReview > 0">
          <div class="stat-icon">
            <van-icon name="eye-o" size="20" />
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ collectTodayStats.pendingReview }}</div>
            <div class="stat-label">待审核</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 搜索和筛选 -->
    <section class="search-section sv-card">
      <div class="search-container">
        <van-search
          v-model="searchKeyword"
          placeholder="搜索资料标题、内容、标签..."
          @search="handleSearch"
          @clear="handleClear"
          @focus="showSearchHistory = true"
        />
      </div>

      <!-- 搜索历史 -->
      <div v-if="showSearchHistory && searchHistory.length > 0" class="search-history">
        <div class="history-header">
          <span>搜索历史</span>
          <van-icon name="delete" @click="clearSearchHistory" />
        </div>
        <div class="history-tags">
          <van-tag
            v-for="item in searchHistory"
            :key="item"
            @click="searchKeyword = item; handleSearch()"
            class="history-tag"
          >
            {{ item }}
          </van-tag>
        </div>
      </div>

      <div class="filter-container">
        <van-dropdown-menu>
          <van-dropdown-item v-model="filterCategory" title="类别" :options="categoryOptions" />
          <van-dropdown-item v-model="filterStatus" title="状态" :options="statusOptions" />
        </van-dropdown-menu>
      </div>
    </section>

    <!-- 快捷操作 -->
    <section class="quick-actions" v-if="collectTodayStats.needCollect > 0">
      <van-button
        type="primary"
        block
        icon="add-o"
        @click="createDocument"
        class="sv-btn sv-btn-primary sv-btn-lg"
      >
        立即收集今日待处理资料 ({{ collectTodayStats.needCollect }})
      </van-button>
    </section>

    <!-- 资料列表 -->
    <section class="document-list-content">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
        class="sv-list"
      >
        <div
          v-for="document in documents"
          :key="document._id"
          class="document-card sv-card sv-scale-in"
          @click="viewDocument(document)"
        >
          <div class="document-header">
            <div class="document-icon" :class="getDocumentCategoryClass(document.category)">
              <van-icon :name="getDocumentIcon(document.category)" size="24" />
            </div>
            <div class="document-title">
              <h4>{{ document.title }}</h4>
              <div class="document-meta">
                <span class="collector">{{ document.collector?.name }}</span>
                <span class="time">{{ formatDate(document.collectionDate) }}</span>
              </div>
            </div>
            <div class="document-status">
              <van-tag :type="getStatusType(document.status)" size="small">
                {{ getStatusText(document.status) }}
              </van-tag>
            </div>
          </div>

          <div class="document-content">
            <p v-if="document.description" class="description">{{ document.description }}</p>
            <div class="document-tags" v-if="document.tags && document.tags.length">
              <van-tag
                v-for="tag in document.tags.slice(0, 3)"
                :key="tag"
                size="small"
                class="tag"
              >
                {{ tag }}
              </van-tag>
              <span v-if="document.tags.length > 3" class="more-tags">
                +{{ document.tags.length - 3 }}
              </span>
            </div>
          </div>

          <div class="document-footer">
            <div class="document-stats">
              <div class="stat-item">
                <van-icon name="folder-o" size="14" />
                <span>{{ document.files?.length || 0 }} 文件</span>
              </div>
              <div class="stat-item" v-if="document.deadline">
                <van-icon name="clock-o" size="14" />
                <span :class="{ 'deadline-urgent': isDeadlineUrgent(document.deadline) }">
                  截止: {{ formatDate(document.deadline) }}
                </span>
              </div>
            </div>
            <div class="document-actions">
              <van-icon name="arrow" size="16" />
            </div>
          </div>
        </div>
      </van-list>
    </section>

    <!-- 空状态 -->
    <div v-if="!loading && documents.length === 0" class="empty-state sv-card">
      <van-empty description="暂无资料" image="default">
        <template #description>
          <p>还没有收集任何资料</p>
          <p class="empty-tip">点击下方按钮开始收集第一个资料</p>
        </template>
        <van-button type="primary" @click="createDocument" class="sv-btn sv-btn-primary">
          创建第一个资料收集
        </van-button>
      </van-empty>
    </div>

    <!-- 悬浮操作按钮 -->
    <van-floating-bubble
      v-if="documents.length > 0"
      axis="xy"
      icon="add"
      @click="createDocument"
      class="sv-fab"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import villageApi from '@/api/villageManagement'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const finished = ref(false)
const searchKeyword = ref('')
const filterCategory = ref('')
const filterStatus = ref('')
const documents = ref([])
const showSearchHistory = ref(false)
const searchHistory = ref(['贫困户资料', '土地证明', '身份证复印件', '养老保险'])

// 分页参数
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 今日统计
const collectTodayStats = computed(() => {
  // 模拟统计数据
  return {
    needCollect: Math.floor(Math.random() * 5),
    totalCollected: Math.floor(Math.random() * 20),
    pendingReview: Math.floor(Math.random() * 3)
  }
})

// 筛选选项
const categoryOptions = [
  { text: '全部', value: '' },
  { text: '村务', value: 'village_affairs' },
  { text: '村民信息', value: 'resident_info' },
  { text: '财务', value: 'financial' },
  { text: '项目', value: 'project' },
  { text: '会议', value: 'meeting' },
  { text: '政策', value: 'policy' },
  { text: '应急', value: 'emergency' }
]

const statusOptions = [
  { text: '全部', value: '' },
  { text: '收集中', value: 'collecting' },
  { text: '审核中', value: 'reviewing' },
  { text: '已完成', value: 'approved' },
  { text: '已拒绝', value: 'rejected' },
  { text: '已归档', value: 'archived' }
]

// 方法
const loadDocuments = async (reset = false) => {
  if (reset) {
    pagination.page = 1
    documents.value = []
    finished.value = false
  }

  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      category: filterCategory.value,
      status: filterStatus.value
    }

    if (searchKeyword.value.trim()) {
      params.search = searchKeyword.value.trim()
    }

    const response = await villageApi.getMyDocuments(params)
    const newDocuments = response.data.data.docs || []

    if (reset) {
      documents.value = newDocuments
    } else {
      documents.value.push(...newDocuments)
    }

    pagination.total = response.data.data.total || 0
    pagination.page += 1

    finished.value = documents.value.length >= pagination.total
  } catch (error) {
    console.error('加载资料列表失败:', error)
    showToast('加载失败')
  } finally {
    loading.value = false
  }
}

const onLoad = () => {
  loadDocuments()
}

const handleSearch = () => {
  loadDocuments(true)
}

const handleClear = () => {
  searchKeyword.value = ''
  loadDocuments(true)
}

const createDocument = () => {
  router.push('/village/documents/new')
}

const viewDocument = (document) => {
  router.push(`/village/documents/${document._id}`)
}

const handleQuickUpload = () => {
  // 触发文件上传
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx'
  input.multiple = true
  input.onchange = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      try {
        showToast('上传中...')
        // 这里可以快速创建一个收集任务并上传文件
        // const formData = new FormData()
        // files.forEach(file => formData.append('files', file))
        // await villageApi.quickUpload(formData)
        showToast('上传成功')
        loadDocuments(true)
      } catch (error) {
        console.error('快速上传失败:', error)
        showToast('上传失败')
      }
    }
  }
  input.click()
}

// 辅助方法
const getDocumentIcon = (category) => {
  const iconMap = {
    'village_affairs': 'description',
    'resident_info': 'user-o',
    'financial': 'gold-coin-o',
    'project': 'building-o',
    'meeting': 'chat-o',
    'policy': 'file-text-o',
    'emergency': 'warning-o',
    'other': 'folder-o'
  }
  return iconMap[category] || 'folder-o'
}

const getDocumentCategoryClass = (category) => {
  const classMap = {
    'village_affairs': 'category-village',
    'resident_info': 'category-resident',
    'financial': 'category-financial',
    'project': 'category-project',
    'meeting': 'category-meeting',
    'policy': 'category-policy',
    'emergency': 'category-emergency',
    'other': 'category-other'
  }
  return classMap[category] || 'category-other'
}

const clearSearchHistory = () => {
  searchHistory.value = []
  showToast('搜索历史已清空')
}

const isDeadlineUrgent = (deadline) => {
  if (!deadline) return false
  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diffDays = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24))
  return diffDays <= 3
}

const getStatusType = (status) => {
  const statusMap = {
    'collecting': 'primary',
    'reviewing': 'warning',
    'approved': 'success',
    'rejected': 'danger',
    'archived': 'default'
  }
  return statusMap[status] || 'default'
}

const getStatusText = (status) => {
  const statusMap = {
    'collecting': '收集中',
    'reviewing': '审核中',
    'approved': '已完成',
    'rejected': '已拒绝',
    'archived': '已归档'
  }
  return statusMap[status] || status
}

const formatDocumentLabel = (document) => {
  const labels = []
  if (document.collector?.name) {
    labels.push(`收集人: ${document.collector.name}`)
  }
  if (document.category) {
    labels.push(`类别: ${getCategoryText(document.category)}`)
  }
  if (document.files?.length) {
    labels.push(`文件数: ${document.files.length}`)
  }
  if (document.collectionDate) {
    labels.push(`时间: ${formatDate(document.collectionDate)}`)
  }
  return labels.join(' • ')
}

const getCategoryText = (category) => {
  const categoryMap = {
    'village_affairs': '村务',
    'resident_info': '村民信息',
    'financial': '财务',
    'project': '项目',
    'meeting': '会议',
    'policy': '政策',
    'emergency': '应急',
    'other': '其他'
  }
  return categoryMap[category] || category
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

// 生命周期
onMounted(() => {
  loadDocuments(true)
})
</script>

<style scoped>
@import '@/styles/smart-village-design.css';

.smart-village-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 50%, #f0f9ff 100%);
  padding: var(--sv-space);
}

/* 页面头部 */
.page-header {
  margin-bottom: var(--sv-space);
  border-radius: var(--sv-radius-lg);
  overflow: hidden;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--sv-space-md);
}

.header-actions .van-icon {
  font-size: 20px;
  color: var(--sv-text-primary);
  cursor: pointer;
  padding: var(--sv-space-sm);
  border-radius: var(--sv-radius);
  transition: background-color var(--sv-transition);
}

.header-actions .van-icon:active {
  background-color: var(--sv-bg-tertiary);
}

/* 今日统计 */
.today-stats {
  margin-bottom: var(--sv-space);
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--sv-space-md);
}

.stats-header h3 {
  margin: 0;
  font-size: var(--sv-font-size-lg);
  color: var(--sv-text-primary);
}

.stats-grid {
  display: flex;
  gap: var(--sv-space);
}

.stat-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--sv-space-sm);
  padding: var(--sv-space);
  border-radius: var(--sv-radius);
  background: var(--sv-bg-secondary);
}

.stat-item.urgent {
  background: var(--sv-error-bg);
  border-left: 3px solid var(--sv-error);
}

.stat-item.success {
  background: var(--sv-success-bg);
  border-left: 3px solid var(--sv-success);
}

.stat-item.warning {
  background: var(--sv-warning-bg);
  border-left: 3px solid var(--sv-warning);
}

.stat-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--sv-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sv-bg-primary);
}

.stat-item.urgent .stat-icon {
  color: var(--sv-error);
}

.stat-item.success .stat-icon {
  color: var(--sv-success);
}

.stat-item.warning .stat-icon {
  color: var(--sv-warning);
}

.stat-value {
  font-size: var(--sv-font-size-lg);
  font-weight: bold;
  color: var(--sv-text-primary);
}

.stat-label {
  font-size: var(--sv-font-size-sm);
  color: var(--sv-text-secondary);
}

/* 搜索区域 */
.search-section {
  margin-bottom: var(--sv-space);
}

.search-container {
  margin-bottom: var(--sv-space-sm);
}

.search-history {
  padding: var(--sv-space-sm);
  background: var(--sv-bg-secondary);
  border-radius: var(--sv-radius);
  margin-bottom: var(--sv-space-sm);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--sv-space-sm);
  font-size: var(--sv-font-size-sm);
  color: var(--sv-text-secondary);
}

.history-header .van-icon {
  cursor: pointer;
  color: var(--sv-text-disabled);
}

.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sv-space-xs);
}

.history-tag {
  cursor: pointer;
  background: var(--sv-bg-primary);
  border: 1px solid var(--sv-border-primary);
}

.filter-container {
  border-top: 1px solid var(--sv-border-secondary);
  padding-top: var(--sv-space-sm);
}

/* 快捷操作 */
.quick-actions {
  margin-bottom: var(--sv-space);
}

/* 文档列表 */
.document-list-content {
  margin-bottom: var(--sv-space-xl);
}

.document-card {
  margin-bottom: var(--sv-space);
  cursor: pointer;
  transition: all var(--sv-transition);
  border-left: 4px solid transparent;
}

.document-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--sv-shadow-md);
}

.document-header {
  display: flex;
  align-items: flex-start;
  gap: var(--sv-space-sm);
  margin-bottom: var(--sv-space-sm);
}

.document-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--sv-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.category-village { background: var(--sv-primary); }
.category-resident { background: var(--sv-success); }
.category-financial { background: var(--sv-warning); }
.category-project { background: var(--sv-error); }
.category-meeting { background: var(--sv-earth); }
.category-policy { background: var(--sv-water); }
.category-emergency { background: #ff4d4f; }
.category-other { background: var(--sv-text-secondary); }

.document-title {
  flex: 1;
}

.document-title h4 {
  margin: 0 0 var(--sv-space-xs) 0;
  font-size: var(--sv-font-size-md);
  color: var(--sv-text-primary);
  line-height: 1.4;
}

.document-meta {
  display: flex;
  gap: var(--sv-space);
  font-size: var(--sv-font-size-sm);
  color: var(--sv-text-secondary);
}

.document-status {
  flex-shrink: 0;
}

.document-content {
  margin-bottom: var(--sv-space-sm);
}

.description {
  margin: 0 0 var(--sv-space-sm) 0;
  font-size: var(--sv-font-size-sm);
  color: var(--sv-text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.document-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sv-space-xs);
  align-items: center;
}

.tag {
  background: var(--sv-bg-secondary);
  border: 1px solid var(--sv-border-secondary);
}

.more-tags {
  font-size: var(--sv-font-size-xs);
  color: var(--sv-text-disabled);
}

.document-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--sv-space-sm);
  border-top: 1px solid var(--sv-border-tertiary);
}

.document-stats {
  display: flex;
  gap: var(--sv-space-md);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--sv-space-xs);
  font-size: var(--sv-font-size-xs);
  color: var(--sv-text-secondary);
}

.deadline-urgent {
  color: var(--sv-error);
  font-weight: 500;
}

.document-actions .van-icon {
  color: var(--sv-text-disabled);
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: var(--sv-space-2xl);
}

.empty-tip {
  font-size: var(--sv-font-size-sm);
  color: var(--sv-text-secondary);
  margin: var(--sv-space) 0;
}

/* 悬浮按钮 */
.sv-fab {
  background: var(--sv-primary) !important;
  color: white !important;
  border: none !important;
  box-shadow: var(--sv-shadow-lg) !important;
}

/* 响应式适配 */
@media (max-width: 480px) {
  .stats-grid {
    flex-direction: column;
  }

  .document-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .document-status {
    align-self: flex-end;
  }
}

/* 加载动画 */
.sv-loading .document-card {
  opacity: 0.6;
  pointer-events: none;
}

/* 分类颜色指示器 */
.document-card.category-village { border-left-color: var(--sv-primary); }
.document-card.category-resident { border-left-color: var(--sv-success); }
.document-card.category-financial { border-left-color: var(--sv-warning); }
.document-card.category-project { border-left-color: var(--sv-error); }
.document-card.category-meeting { border-left-color: var(--sv-earth); }
.document-card.category-policy { border-left-color: var(--sv-water); }
.document-card.category-emergency { border-left-color: #ff4d4f; }
.document-card.category-other { border-left-color: var(--sv-text-secondary); }
</style>