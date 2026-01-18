/**
 * 村务公告列表页 - 重构版本
 * 使用独立的Store管理状态 + 可复用组件
 */
<template>
  <div class="announcement-page">
    <!-- 自定义导航栏 -->
    <div class="custom-navbar">
      <div class="navbar-action" @click="handleBack" aria-label="返回">
        <span class="back-icon">←</span>
      </div>
      <div class="navbar-title">村务公告</div>
      <div class="navbar-actions">
        <div class="navbar-action" @click="toggleSearch" aria-label="搜索">
          <span class="search-icon">🔍</span>
        </div>
      </div>
    </div>

    <!-- 搜索栏 -->
    <transition name="slide-down">
      <div v-if="showSearch" class="search-bar-wrapper">
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="搜索公告标题、内容"
          class="search-input"
          @input="handleSearch"
        />
      </div>
    </transition>

    <!-- 筛选标签 -->
    <div class="filter-tabs">
      <button
        v-for="tab in filterTabs"
        :key="tab.value"
        class="filter-tab"
        :class="{ active: store.currentFilter.type === tab.value }"
        @click="handleTypeChange(tab.value)"
      >
        {{ tab.label }}
        <span v-if="tab.count > 0" class="tab-count">({{ tab.count }})</span>
      </button>
    </div>

    <!-- 下拉刷新提示 -->
    <div v-if="store.refreshing" class="refreshing-hint">
      <div class="spinner-small"></div>
      <span>刷新中...</span>
    </div>

    <!-- 骨架屏加载 -->
    <div v-if="store.loading && !store.refreshing" class="skeleton-container">
      <div v-for="i in 3" :key="i" class="skeleton-card">
        <div class="skeleton-tag"></div>
        <div class="skeleton-title"></div>
        <div class="skeleton-summary"></div>
        <div class="skeleton-footer"></div>
      </div>
    </div>

    <!-- 公告列表 -->
    <div v-else class="page-content" @scroll="handleScroll">
      <div class="announcement-list">
        <!-- 公告卡片 -->
        <div
          v-for="item in displayList"
          :key="item.id"
          class="announcement-card"
          @click="handleCardClick(item)"
        >
          <div class="card-header">
            <span class="tag" :class="item.type">{{ item.typeLabel || item.type }}</span>
            <span class="date">{{ formatDate(item.publishDate) }}</span>
          </div>
          <h3 class="card-title">{{ item.title }}</h3>
          <p v-if="item.summary" class="card-summary">{{ item.summary }}</p>
          <div class="card-footer">
            <span class="publisher">{{ item.publisher || '村委会' }}</span>
            <div class="stats">
              <span v-if="item.viewCount" class="stat">👁 {{ item.viewCount }}</span>
              <span v-if="item.likeCount" class="stat">❤ {{ item.likeCount }}</span>
              <span v-if="item.commentCount" class="stat">💬 {{ item.commentCount }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div class="load-more">
        <span v-if="store.loadingMore" class="loading-text">加载中...</span>
        <span v-else-if="!store.pagination.hasMore" class="loading-text">没有更多了</span>
        <button v-else class="load-more-btn" @click="handleLoadMore">加载更多</button>
      </div>

      <!-- 空状态 -->
      <div v-if="displayList.length === 0 && !store.loading" class="empty-state">
        <div class="empty-icon">📄</div>
        <p class="empty-title">{{ emptyTitle }}</p>
        <p class="empty-desc">{{ emptyDesc }}</p>
        <button v-if="showResetButton" class="empty-action" @click="handleResetFilter">
          {{ resetButtonText }}
        </button>
      </div>
    </div>

    <!-- 语音播报悬浮按钮 -->
    <view v-if="currentPlayingItem" class="voice-fab">
      <VoicePlayer
        :text="currentPlayingItem.title + '，' + currentPlayingItem.summary"
        :floating="true"
        :auto-play="true"
        @end="handleVoiceEnd"
        @error="handleVoiceError"
      />
    </view>

    <!-- 图片预览 -->
    <div v-if="imagePreviewVisible" class="image-preview-modal" @click="imagePreviewVisible = false">
      <img :src="previewImages[previewIndex]" class="preview-image" @click.stop />
      <button class="save-btn" @click="handleImageSave">保存图片</button>
    </div>

    <!-- 屏幕阅读器专用 -->
    <div class="sr-only" role="status" aria-live="polite">
      当前有 {{ store.unreadCount }} 条未读公告
      {{ searchKeyword ? `搜索关键词：${searchKeyword}，找到 ${displayList.length} 条结果` : '' }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useElderlyStore } from '@/store/elderly'
import { useNetworkStore } from '@/store/network'
import { useAnnouncementStore } from '@/store/announcement'

/**
 * 路由
 */
const router = useRouter()

/**
 * Store实例
 */
const elderlyStore = useElderlyStore()
const networkStore = useNetworkStore()
const store = useAnnouncementStore()

/**
 * 搜索状态
 */
const showSearch = ref(false)
const searchKeyword = ref('')
const hasAdvancedFilter = ref(false)

/**
 * 图片预览
 */
const imagePreviewVisible = ref(false)
const previewImages = ref([])
const previewIndex = ref(0)

/**
 * 语音播报
 */
const currentPlayingItem = ref(null)

/**
 * 下拉刷新相关
 */
let touchStartY = 0
let currentScrollTop = 0
const PULL_THRESHOLD = 80

/**
 * 筛选标签（带计数）
 */
const filterTabs = computed(() => {
  const stats = store.typeStats
  return [
    { label: '全部', value: 'all', count: stats.all },
    { label: '重要', value: 'important', count: stats.important },
    { label: '通知', value: 'notice', count: stats.notice },
    { label: '会议', value: 'meeting', count: stats.meeting },
    { label: '公示', value: 'public', count: stats.public }
  ]
})

/**
 * 显示的列表（根据筛选条件）
 */
const displayList = computed(() => {
  return store.filteredAnnouncements
})

/**
 * 加载状态
 */
const loadStatus = computed(() => {
  if (store.loadingMore) return 'loading'
  if (!store.pagination.hasMore) return 'noMore'
  return 'more'
})

/**
 * 空状态
 */
const emptyTitle = computed(() => {
  return searchKeyword.value ? '未找到相关公告' : '暂无公告'
})

const emptyDesc = computed(() => {
  return searchKeyword.value ? '请尝试其他关键词' : '当前筛选条件下没有公告'
})

const showResetButton = computed(() => {
  return searchKeyword.value !== '' || store.currentFilter.type !== 'all'
})

const resetButtonText = computed(() => {
  return searchKeyword.value ? '清除搜索' : '查看全部公告'
})

/**
 * 返回
 */
const handleBack = () => {
  elderlyStore.vibrate('short')
  router.back()
}

/**
 * 切换搜索
 */
const toggleSearch = () => {
  showSearch.value = !showSearch.value
  if (showSearch.value) {
    nextTick(() => {
      // 聚焦搜索输入框
    })
  }
}

/**
 * 搜索
 */
const handleSearch = (keyword) => {
  elderlyStore.vibrate('short')
  store.updateFilter({ keyword })
}

/**
 * 清除搜索
 */
const handleClearSearch = () => {
  searchKeyword.value = ''
  store.updateFilter({ keyword: '' })
  elderlyStore.vibrate('short')
}

/**
 * 重置筛选
 */
const handleResetFilter = () => {
  elderlyStore.vibrate('short')
  searchKeyword.value = ''
  store.resetFilter()
}

/**
 * 切换高级筛选面板
 */
const toggleAdvancedFilter = () => {
  hasAdvancedFilter.value = !hasAdvancedFilter.value
  // TODO: 显示高级筛选面板（日期范围等）
}

/**
 * 类型筛选
 */
const handleTypeChange = (type) => {
  elderlyStore.vibrate('short')
  store.updateFilter({ type })
}

/**
 * 卡片点击
 */
const handleCardClick = (item) => {
  elderlyStore.vibrate('short')

  // 标记为已读
  store.markAsRead(item.id).catch(error => {
    console.error('标记已读失败:', error)
  })

  // 如果离线，添加到同步队列
  if (!networkStore.isOnline) {
    networkStore.addToOfflineQueue({
      type: 'announcement_read',
      data: { id: item.id }
    })
  }

  // 跳转详情
  router.push(`/village/announcement/${item.id}`)
}

/**
 * 展开/收起
 */
const handleExpand = (expanded, item) => {
  elderlyStore.vibrate('short')
}

/**
 * 点赞
 */
const handleLike = async (item) => {
  elderlyStore.vibrate('short')
  try {
    await store.toggleLike(item.id)
    showToast('操作成功', 'success')
  } catch (error) {
    console.error('点赞失败:', error)
    showToast('操作失败', 'error')
  }
}

/**
 * 收藏
 */
const handleCollect = async (item) => {
  elderlyStore.vibrate('short')
  try {
    await store.toggleCollect(item.id)
    showToast('操作成功', 'success')
  } catch (error) {
    console.error('收藏失败:', error)
    showToast('操作失败', 'error')
  }
}

/**
 * 评论
 */
const handleComment = (item) => {
  elderlyStore.vibrate('short')
  // 跳转到详情页的评论区
  router.push(`/village/announcement/${item.id}?focus=comment`)
}

/**
 * 更多操作
 */
const handleMore = (item) => {
  elderlyStore.vibrate('short')
  if (confirm('是否要分享给好友？')) {
    // 分享功能
  }
}

/**
 * 显示Toast提示
 */
const showToast = (message, type = 'info') => {
  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 2000)
}

/**
 * 语音播报切换
 */
const handleVoiceToggle = (playing, item) => {
  elderlyStore.vibrate('short')
  currentPlayingItem.value = playing ? item : null
}

/**
 * 语音结束
 */
const handleVoiceEnd = () => {
  if (currentPlayingItem.value) {
    currentPlayingItem.value = null
  }
}

/**
 * 语音错误
 */
const handleVoiceError = (error) => {
  console.error('语音播报错误:', error)
  showToast('语音播报失败', 'error')
  currentPlayingItem.value = null
}

/**
 * 图片保存
 */
const handleImageSave = () => {
  showToast('图片保存功能开发中', 'info')
}

/**
 * 下拉刷新 - 触摸开始
 */
const handleTouchStart = (e) => {
  touchStartY = e.touches[0].clientY
}

/**
 * 下拉刷新 - 触摸移动
 */
const handleTouchMove = (e) => {
  currentScrollTop = e.currentTarget.scrollTop
}

/**
 * 下拉刷新 - 触摸结束
 */
const handleTouchEnd = (e) => {
  const touchEndY = e.changedTouches[0].clientY
  const pullDistance = touchEndY - touchStartY

  // 只有在顶部且下拉距离足够时才触发刷新
  if (currentScrollTop === 0 && pullDistance > PULL_THRESHOLD) {
    handleRefresh()
  }
}

/**
 * 刷新数据
 */
const handleRefresh = async () => {
  if (store.refreshing) return

  elderlyStore.vibrate('short')

  try {
    await store.fetchAnnouncements({}, true)
    showToast('刷新成功', 'success')
  } catch (error) {
    console.error('刷新失败:', error)
    showToast('刷新失败', 'error')
  }
}

/**
 * 加载更多
 */
const handleLoadMore = async () => {
  if (store.loadingMore || !store.pagination.hasMore) return

  try {
    await store.loadMore()
  } catch (error) {
    console.error('加载更多失败:', error)
  }
}

/**
 * 格式化日期
 */
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

/**
 * 滚动事件
 */
const handleScroll = (e) => {
  const scrollTop = e.target.scrollTop
  const scrollHeight = e.target.scrollHeight
  const clientHeight = e.target.clientHeight

  // 接近底部时加载更多
  if (scrollTop + clientHeight >= scrollHeight - 50) {
    handleLoadMore()
  }
}

/**
 * 页面加载
 */
onMounted(async () => {
  try {
    await store.fetchAnnouncements()
  } catch (error) {
    console.error('加载公告列表失败:', error)
  }
})

/**
 * 组件卸载
 */
onUnmounted(() => {
  currentPlayingItem.value = null
})
</script>

<style lang="scss" scoped>
.announcement-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

// 导航栏
.custom-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  background-color: #fff;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-action {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s;

  &:active {
    background-color: #f5f5f5;
  }

  .back-icon,
  .search-icon {
    font-size: 20px;
  }
}

.navbar-title {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

// 搜索栏
.search-bar-wrapper {
  padding: 12px 16px;
  background-color: #fff;

  .search-input {
    width: 100%;
    padding: 10px 16px;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    font-size: 14px;
    outline: none;

    &:focus {
      border-color: #1890ff;
    }
  }
}

// 筛选标签
.filter-tabs {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background-color: #fff;
  border-bottom: 1px solid #eee;
  overflow-x: auto;
  white-space: nowrap;
}

.filter-tab {
  padding: 6px 16px;
  border: 1px solid #e8e8e8;
  border-radius: 16px;
  background-color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &.active {
    background-color: #1890ff;
    color: #fff;
    border-color: #1890ff;
  }

  .tab-count {
    margin-left: 4px;
    font-size: 12px;
    opacity: 0.8;
  }
}

// 刷新提示
.refreshing-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background-color: #fff;
  color: #999;
  font-size: 14px;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid #e8e8e8;
  border-top-color: #1890ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

// 骨架屏
.skeleton-container {
  padding: 16px;
}

.skeleton-card {
  padding: 16px;
  margin-bottom: 16px;
  background-color: #fff;
  border-radius: 8px;
}

.skeleton-tag {
  width: 60px;
  height: 24px;
  margin-bottom: 12px;
  background: linear-gradient(90deg, #f0f0f0 0%, #e8e8e8 50%, #f0f0f0 100%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 4px;
}

.skeleton-title {
  width: 70%;
  height: 24px;
  margin-bottom: 12px;
  background: linear-gradient(90deg, #f0f0f0 0%, #e8e8e8 50%, #f0f0f0 100%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 4px;
}

.skeleton-summary {
  width: 100%;
  height: 20px;
  margin-bottom: 8px;
  background: linear-gradient(90deg, #f0f0f0 0%, #e8e8e8 50%, #f0f0f0 100%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 4px;

  &:last-of-type {
    width: 60%;
    margin-bottom: 16px;
  }
}

.skeleton-footer {
  display: flex;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid #eee;

  &::before,
  &::after {
    content: '';
    width: 72px;
    height: 18px;
    background: linear-gradient(90deg, #f0f0f0 0%, #e8e8e8 50%, #f0f0f0 100%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s ease-in-out infinite;
    border-radius: 4px;
  }
}

@keyframes skeleton-loading {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

// 页面内容
.page-content {
  height: calc(100vh - 96px);
  overflow-y: auto;
}

.announcement-list {
  padding: 16px;
}

// 公告卡片
.announcement-card {
  padding: 16px;
  margin-bottom: 16px;
  background-color: #fff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: scale(0.98);
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;

    .tag {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;

      &.important {
        background-color: #fff1f0;
        color: #ff4d4f;
      }

      &.notice {
        background-color: #e6f7ff;
        color: #1890ff;
      }

      &.meeting {
        background-color: #f0f5ff;
        color: #597ef7;
      }

      &.public {
        background-color: #f6ffed;
        color: #52c41a;
      }
    }

    .date {
      font-size: 12px;
      color: #999;
    }
  }

  .card-title {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 600;
    color: #333;
    line-height: 1.4;
  }

  .card-summary {
    margin: 0 0 12px;
    font-size: 14px;
    color: #666;
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 12px;
    border-top: 1px solid #eee;

    .publisher {
      font-size: 12px;
      color: #999;
    }

    .stats {
      display: flex;
      gap: 12px;
      font-size: 12px;
      color: #999;

      .stat {
        display: flex;
        align-items: center;
        gap: 2px;
      }
    }
  }
}

// 加载更多
.load-more {
  padding: 16px;
  text-align: center;

  .loading-text {
    color: #999;
    font-size: 14px;
  }

  .load-more-btn {
    padding: 8px 24px;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    background-color: #fff;
    color: #1890ff;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background-color: #1890ff;
      color: #fff;
    }
  }
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 16px;
  text-align: center;

  .empty-icon {
    font-size: 60px;
    margin-bottom: 16px;
  }

  .empty-title {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }

  .empty-desc {
    margin: 0 0 16px;
    font-size: 14px;
    color: #999;
  }

  .empty-action {
    padding: 8px 24px;
    background-color: #1890ff;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.9;
    }
  }
}

// 图片预览
.image-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  .preview-image {
    max-width: 90%;
    max-height: 80%;
    object-fit: contain;
  }

  .save-btn {
    margin-top: 16px;
    padding: 10px 24px;
    background-color: #1890ff;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
  }
}

// Toast
.toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 2000;
  animation: fadeIn 0.3s ease;

  &.toast-success {
    background-color: #f6ffed;
    color: #52c41a;
  }

  &.toast-error {
    background-color: #fff2f0;
    color: #ff4d4f;
  }

  &.toast-info {
    background-color: #e6f7ff;
    color: #1890ff;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

// 屏幕阅读器专用
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>

