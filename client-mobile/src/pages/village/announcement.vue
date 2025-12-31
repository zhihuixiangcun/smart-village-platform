<template>
  <view class="announcement-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-back" @click="handleBack">
        <text class="icon">←</text>
      </view>
      <view class="navbar-title">村务公告</view>
      <view class="navbar-filter" @click="handleFilter">
        <text class="icon">🔍</text>
      </view>
    </view>

    <!-- 筛选标签 -->
    <view class="filter-tabs">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        :class="['tab-item', { 'tab-item--active': currentTab === tab.value }]"
        @click="handleTabChange(tab.value)"
      >
        {{ tab.label }}
        <text v-if="tab.count > 0" class="tab-count">({{ tab.count }})</text>
      </view>
    </view>

    <!-- 公告列表 -->
    <scroll-view class="page-content" scroll-y @scrolltolower="handleLoadMore">
      <view class="announcement-list">
        <view
          v-for="item in displayList"
          :key="item.id"
          :class="['announcement-card', { 'announcement-card--unread': !item.read }]"
          @click="handleAnnouncementClick(item)"
        >
          <!-- 公告头部 -->
          <view class="card-header">
            <view class="header-left">
              <view :class="['tag', `tag-${item.type}`]">{{ item.typeLabel }}</view>
              <text v-if="item.top" class="top-badge">置顶</text>
            </view>
            <text v-if="!item.read" class="unread-dot"></text>
          </view>

          <!-- 公告标题 -->
          <view class="card-title">{{ item.title }}</view>

          <!-- 公告摘要 -->
          <view class="card-summary">{{ item.summary }}</view>

          <!-- 公告内容（支持展开） -->
          <view v-if="item.expanded" class="card-content">
            <rich-text :nodes="item.content"></rich-text>
          </view>

          <!-- 公告附件 -->
          <view v-if="item.attachments && item.attachments.length > 0" class="card-attachments">
            <view class="attachment-title">📎 附件</view>
            <view
              v-for="(file, index) in item.attachments"
              :key="index"
              class="attachment-item"
              @click.stop="handleAttachmentClick(file)"
            >
              <text class="file-icon">📄</text>
              <text class="file-name">{{ file.name }}</text>
            </view>
          </view>

          <!-- 公告底部 -->
          <view class="card-footer">
            <view class="footer-info">
              <text class="info-item">📅 {{ item.publishDate }}</text>
              <text class="info-item">👁️ {{ item.viewCount }}次阅读</text>
            </view>
            <view class="footer-actions">
              <view class="action-btn" @click.stop="handleExpand(item)">
                <text>{{ item.expanded ? '收起' : '展开' }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载状态 -->
      <view class="load-more">
        <uni-load-more :status="loadStatus" />
      </view>

      <!-- 空状态 -->
      <view v-if="displayList.length === 0 && !loading" class="empty-state">
        <text class="empty-icon">📭</text>
        <text class="empty-text">暂无公告</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useElderlyStore } from '@/store/elderly'
import { useNetworkStore } from '@/store/network'

/**
 * 村务公告列表页
 */

const elderlyStore = useElderlyStore()
const networkStore = useNetworkStore()

// 筛选标签
const tabs = [
  { label: '全部', value: 'all', count: 0 },
  { label: '重要', value: 'important', count: 2 },
  { label: '通知', value: 'notice', count: 5 },
  { label: '会议', value: 'meeting', count: 1 },
  { label: '公示', value: 'public', count: 3 }
]

const currentTab = ref('all')

// 加载状态
const loading = ref(false)
const loadStatus = ref('more')

// 公告列表
const announcementList = ref([
  {
    id: 1,
    type: 'important',
    typeLabel: '重要',
    title: '关于2024年度村财务公示的通知',
    summary: '为保障村民知情权和监督权，现将2024年度村级财务收支情况公示如下...',
    content: '<p>为保障村民知情权和监督权，现将2024年度村级财务收支情况公示如下：</p><p>一、收入情况：共计XXX元</p><p>二、支出情况：共计XXX元</p><p>三、结余情况：共计XXX元</p>',
    publishDate: '2024-12-28',
    viewCount: 328,
    top: true,
    read: false,
    expanded: false,
    attachments: [
      { name: '2024年度财务报表.pdf', url: '' }
    ]
  },
  {
    id: 2,
    type: 'notice',
    typeLabel: '通知',
    title: '村内道路维修通知',
    summary: '因村内主道路破损严重，村委会决定于2025年1月5日起进行维修施工...',
    content: '',
    publishDate: '2024-12-25',
    viewCount: 156,
    top: false,
    read: false,
    expanded: false,
    attachments: []
  },
  {
    id: 3,
    type: 'meeting',
    typeLabel: '会议',
    title: '村民代表大会会议纪要',
    summary: '2024年12月20日，村委召开村民代表大会，讨论并通过了以下事项...',
    content: '',
    publishDate: '2024-12-20',
    viewCount: 89,
    top: false,
    read: true,
    expanded: false,
    attachments: []
  },
  {
    id: 4,
    type: 'public',
    typeLabel: '公示',
    title: '关于2025年度农业补贴发放的公示',
    summary: '根据上级政策，现将2025年度农业补贴发放名单公示如下，如有异议请于公示期内反馈...',
    content: '',
    publishDate: '2024-12-18',
    viewCount: 245,
    top: false,
    read: true,
    expanded: false,
    attachments: [
      { name: '补贴发放名单.xlsx', url: '' }
    ]
  }
])

// 显示的列表（根据筛选）
const displayList = computed(() => {
  if (currentTab.value === 'all') {
    return announcementList.value
  }
  return announcementList.value.filter(item => item.type === currentTab.value)
})

// 返回
const handleBack = () => {
  elderlyStore.vibrate('short')
  uni.navigateBack()
}

// 筛选
const handleFilter = () => {
  elderlyStore.vibrate('short')
  uni.showActionSheet({
    itemList: ['按时间排序', '按阅读量排序'],
    success: (res) => {
      console.log('选择了排序方式:', res.tapIndex)
    }
  })
}

// 切换标签
const handleTabChange = (value) => {
  elderlyStore.vibrate('short')
  currentTab.value = value
}

// 公告点击
const handleAnnouncementClick = (item) => {
  elderlyStore.vibrate('short')

  // 标记为已读
  if (!item.read) {
    item.read = true

    // 如果离线，添加到同步队列
    if (!networkStore.isOnline) {
      networkStore.addToOfflineQueue({
        type: 'announcement_read',
        data: { id: item.id }
      })
    }
  }

  // 跳转详情
  uni.navigateTo({
    url: `/pages/village/announcement/detail?id=${item.id}`
  })
}

// 展开/收起
const handleExpand = (item) => {
  elderlyStore.vibrate('short')
  item.expanded = !item.expanded
}

// 附件点击
const handleAttachmentClick = (file) => {
  elderlyStore.vibrate('short')
  uni.showModal({
    title: file.name,
    content: '是否下载此附件？',
    success: (res) => {
      if (res.confirm) {
        // 下载文件
        console.log('下载文件:', file)
        uni.showToast({
          title: '开始下载',
          icon: 'loading'
        })
      }
    }
  })
}

// 加载更多
const handleLoadMore = () => {
  if (loadStatus.value === 'loading' || loadStatus.value === 'noMore') return

  loadStatus.value = 'loading'

  // 模拟加载
  setTimeout(() => {
    loadStatus.value = 'noMore'
  }, 1000)
}

// 页面加载
onMounted(() => {
  // 更新标签计数
  updateTabCounts()
})

// 更新标签计数
const updateTabCounts = () => {
  tabs.forEach(tab => {
    if (tab.value === 'all') {
      tab.count = announcementList.value.length
    } else {
      tab.count = announcementList.value.filter(item => item.type === tab.value).length
    }
  })
}
</script>

<style lang="scss" scoped>
.announcement-page {
  min-height: 100vh;
  background-color: var(--color-bg-page, #F7FAFC);
}

.custom-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 32rpx;
  background-color: #FFFFFF;
  border-bottom: 1rpx solid var(--color-border-primary, #E2E8F0);

  .navbar-back,
  .navbar-filter {
    width: 64rpx;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40rpx;
  }

  .navbar-title {
    flex: 1;
    text-align: center;
    font-size: 36rpx;
    font-weight: 700;
    color: var(--color-text-primary, #1A202C);
  }
}

.filter-tabs {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 32rpx;
  background-color: #FFFFFF;
  border-bottom: 1rpx solid var(--color-border-primary, #E2E8F0);
  overflow-x: auto;
  white-space: nowrap;

  &::-webkit-scrollbar {
    display: none;
  }

  .tab-item {
    display: inline-flex;
    align-items: center;
    padding: 16rpx 32rpx;
    background-color: var(--color-bg-disabled, #F1F5F9);
    border-radius: 48rpx;
    font-size: 28rpx;
    color: var(--color-text-secondary, #4A5568);
    transition: all 0.3s ease;

    &--active {
      background-color: var(--color-primary, #2F855A);
      color: #FFFFFF;
    }

    .tab-count {
      margin-left: 4rpx;
      font-size: 24rpx;
    }
  }
}

.page-content {
  height: calc(100vh - 88rpx - 100rpx);
  padding: 32rpx;
}

.announcement-list {
  .announcement-card {
    padding: 32rpx;
    margin-bottom: 24rpx;
    background-color: #FFFFFF;
    border-radius: 20rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);

    &--unread {
      position: relative;
      border-left: 8rpx solid var(--color-primary, #2F855A);
    }

    &:active {
      background-color: var(--color-bg-hover, #EDF2F7);
    }
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16rpx;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  .tag {
    padding: 8rpx 16rpx;
    border-radius: 8rpx;
    font-size: 24rpx;

    &.tag-important {
      background-color: rgba(245, 101, 101, 0.1);
      color: #F56565;
    }

    &.tag-notice {
      background-color: rgba(66, 153, 225, 0.1);
      color: #4299E1;
    }

    &.tag-meeting {
      background-color: rgba(236, 201, 75, 0.1);
      color: #ECC94B;
    }

    &.tag-public {
      background-color: rgba(72, 187, 120, 0.1);
      color: #48BB78;
    }
  }

  .top-badge {
    padding: 4rpx 12rpx;
    background-color: #F56565;
    color: #FFFFFF;
    border-radius: 6rpx;
    font-size: 20rpx;
  }

  .unread-dot {
    width: 16rpx;
    height: 16rpx;
    background-color: #F56565;
    border-radius: 50%;
  }

  .card-title {
    font-size: 36rpx;
    font-weight: 700;
    color: var(--color-text-primary, #1A202C);
    margin-bottom: 16rpx;
    line-height: 1.5;
  }

  .card-summary {
    font-size: 28rpx;
    color: var(--color-text-secondary, #4A5568);
    line-height: 1.6;
    margin-bottom: 16rpx;
  }

  .card-content {
    padding: 24rpx;
    background-color: var(--color-bg-card, #F7FAFC);
    border-radius: 12rpx;
    font-size: 28rpx;
    color: var(--color-text-primary, #1A202C);
    line-height: 1.8;
    margin-bottom: 16rpx;
  }

  .card-attachments {
    margin-bottom: 16rpx;
  }

  .attachment-title {
    font-size: 28rpx;
    color: var(--color-text-secondary, #4A5568);
    margin-bottom: 12rpx;
  }

  .attachment-item {
    display: flex;
    align-items: center;
    gap: 12rpx;
    padding: 16rpx;
    background-color: var(--color-bg-card, #F7FAFC);
    border-radius: 12rpx;
    margin-bottom: 8rpx;

    &:active {
      background-color: var(--color-bg-hover, #EDF2F7);
    }
  }

  .file-icon {
    font-size: 40rpx;
  }

  .file-name {
    flex: 1;
    font-size: 28rpx;
    color: var(--color-primary, #2F855A);
  }

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 16rpx;
    border-top: 1rpx solid var(--color-border-primary, #E2E8F0);
  }

  .footer-info {
    display: flex;
    align-items: center;
    gap: 24rpx;
  }

  .info-item {
    font-size: 24rpx;
    color: var(--color-text-tertiary, #718096);
  }

  .action-btn {
    padding: 12rpx 24rpx;
    background-color: var(--color-primary, #2F855A);
    color: #FFFFFF;
    border-radius: 8rpx;
    font-size: 28rpx;
  }
}

.load-more {
  padding: 32rpx 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  gap: 24rpx;
}

.empty-icon {
  font-size: 120rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 32rpx;
  color: var(--color-text-tertiary, #718096);
}

// 适老化模式
:global(.elderly-mode-large) {
  .card-title {
    font-size: 40rpx;
  }

  .card-summary {
    font-size: 32rpx;
  }

  .card-content {
    font-size: 32rpx;
  }
}

:global(.elderly-mode-xl) {
  .card-title {
    font-size: 48rpx;
  }

  .card-summary {
    font-size: 40rpx;
  }

  .card-content {
    font-size: 40rpx;
  }
}
</style>