<template>
  <view class="village-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-content">
        <view class="navbar-title">村务治理</view>
        <view class="navbar-icon" @click="handleNotification">
          <text class="icon">🔔</text>
          <view v-if="unreadCount > 0" class="badge">{{ unreadCount }}</view>
        </view>
      </view>
    </view>

    <!-- 页面内容 -->
    <scroll-view class="page-content" scroll-y @scrolltolower="handleLoadMore">
      <!-- 欢迎卡片 -->
      <view class="welcome-card">
        <view class="welcome-icon">👋</view>
        <view class="welcome-text">
          <text class="greeting">{{ greeting }}</text>
          <text class="name">{{ userName }}</text>
        </view>
        <view class="welcome-date">{{ currentDate }}</view>
      </view>

      <!-- 快捷入口 -->
      <view class="quick-actions">
        <view class="quick-item" @click="navigateTo('/pages/village/announcement')">
          <view class="quick-icon">📢</view>
          <view class="quick-text">村务公告</view>
          <view class="quick-badge" v-if="announcementUnread > 0">{{ announcementUnread }}</view>
        </view>
        <view class="quick-item" @click="navigateTo('/pages/village/meeting')">
          <view class="quick-icon">📅</view>
          <view class="quick-text">会议通知</view>
          <view class="quick-badge" v-if="meetingUpcoming > 0">{{ meetingUpcoming }}</view>
        </view>
        <view class="quick-item" @click="navigateTo('/pages/village/vote')">
          <view class="quick-icon">🗳️</view>
          <view class="quick-text">在线投票</view>
          <view class="quick-badge" v-if="voteActive > 0">{{ voteActive }}</view>
        </view>
        <view class="quick-item" @click="navigateTo('/pages/village/finance')">
          <view class="quick-icon">💰</view>
          <view class="quick-text">财务公示</view>
        </view>
      </view>

      <!-- 最新公告 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">最新公告</text>
          <text class="section-more" @click="navigateTo('/pages/village/announcement')">更多 ></text>
        </view>
        <view class="announcement-list">
          <view
            v-for="item in announcements"
            :key="item.id"
            class="announcement-item"
            @click="handleAnnouncementClick(item)"
          >
            <view class="announcement-tag" :class="`tag-${item.type}`">{{ item.typeLabel }}</view>
            <view class="announcement-content">
              <view class="announcement-title">{{ item.title }}</view>
              <view class="announcement-meta">
                <text class="meta-item">📅 {{ item.publishDate }}</text>
                <text class="meta-item" v-if="item.read === false">未读</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 待办事项 -->
      <view class="section" v-if="pendingTasks.length > 0">
        <view class="section-header">
          <text class="section-title">待办事项</text>
        </view>
        <view class="task-list">
          <view
            v-for="task in pendingTasks"
            :key="task.id"
            class="task-item"
            @click="handleTaskClick(task)"
          >
            <view class="task-icon">{{ task.icon }}</view>
            <view class="task-content">
              <view class="task-title">{{ task.title }}</view>
              <view class="task-desc">{{ task.description }}</view>
            </view>
            <view class="task-action">
              <text class="action-btn">处理</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载状态 -->
      <view class="load-more" v-if="hasMore">
        <uni-load-more :status="loadStatus" />
      </view>
    </scroll-view>

    <!-- 底部导航 -->
    <TabBar :current="0" />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { useElderlyStore } from '@/store/elderly'
import TabBar from '@/components/common/TabBar.vue'

/**
 * 村务治理首页
 */

const userStore = useUserStore()
const elderlyStore = useElderlyStore()

// 用户信息
const userName = computed(() => userStore.userInfo?.name || '村民')

// 问候语
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  if (hour < 22) return '晚上好'
  return '夜深了'
})

// 当前日期
const currentDate = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const week = weekDays[now.getDay()]
  return `${year}年${month}月${day}日 星期${week}`
})

// 未读数量
const unreadCount = ref(5)
const announcementUnread = ref(3)
const meetingUpcoming = ref(2)
const voteActive = ref(1)

// 最新公告列表
const announcements = ref([
  {
    id: 1,
    title: '关于2024年度村财务公示的通知',
    type: 'important',
    typeLabel: '重要',
    publishDate: '2024-12-28',
    read: false
  },
  {
    id: 2,
    title: '村内道路维修通知',
    type: 'notice',
    typeLabel: '通知',
    publishDate: '2024-12-25',
    read: false
  },
  {
    id: 3,
    title: '村民代表大会会议纪要',
    type: 'meeting',
    typeLabel: '会议',
    publishDate: '2024-12-20',
    read: true
  }
])

// 待办事项
const pendingTasks = ref([
  {
    id: 1,
    icon: '🗳️',
    title: '参与村务投票',
    description: '关于村内基础设施建设的意见征集'
  },
  {
    id: 2,
    icon: '📋',
    title: '填写问卷调查',
    description: '村民生活满意度调查'
  }
])

// 加载状态
const loadStatus = ref('more')
const hasMore = ref(true)

// 通知点击
const handleNotification = () => {
  elderlyStore.vibrate('short')
  navigateTo('/pages/profile/notification')
}

// 公告点击
const handleAnnouncementClick = (item) => {
  elderlyStore.vibrate('short')
  // 标记为已读
  item.read = true
  navigateTo(`/pages/village/announcement/detail?id=${item.id}`)
}

// 任务点击
const handleTaskClick = (task) => {
  elderlyStore.vibrate('short')
  // 根据任务类型跳转
  if (task.title.includes('投票')) {
    navigateTo('/pages/village/vote')
  }
}

// 加载更多
const handleLoadMore = () => {
  if (loadStatus.value === 'loading' || loadStatus.value === 'noMore') return

  loadStatus.value = 'loading'

  // 模拟加载
  setTimeout(() => {
    loadStatus.value = 'noMore'
    hasMore.value = false
  }, 1000)
}

// 页面跳转
const navigateTo = (url) => {
  elderlyStore.vibrate('short')
  uni.navigateTo({ url })
}

// 页面加载
onMounted(() => {
  // 加载数据
  loadData()
})

// 加载数据
const loadData = async () => {
  // TODO: 从API加载数据
  console.log('加载村务数据')
}
</script>

<style lang="scss" scoped>
.village-page {
  min-height: 100vh;
  background-color: var(--color-bg-page, #F7FAFC);
}

.custom-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: linear-gradient(135deg, #2F855A 0%, #38A169 100%);
  padding-top: env(safe-area-inset-top, 0);

  .navbar-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 88rpx;
    padding: 0 32rpx;
  }

  .navbar-title {
    font-size: 36rpx;
    font-weight: 700;
    color: #FFFFFF;
  }

  .navbar-icon {
    position: relative;
    font-size: 48rpx;

    .badge {
      position: absolute;
      top: -4rpx;
      right: -4rpx;
      min-width: 32rpx;
      height: 32rpx;
      padding: 0 8rpx;
      background-color: #F56565;
      border-radius: 16rpx;
      font-size: 20rpx;
      color: #FFFFFF;
      text-align: center;
      line-height: 32rpx;
    }
  }
}

.page-content {
  height: 100vh;
  padding-top: calc(88rpx + env(safe-area-inset-top, 0));
  padding-bottom: calc(100rpx + env(safe-area-inset-bottom, 0));
}

.welcome-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin: 32rpx;
  padding: 40rpx 32rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24rpx;

  .welcome-icon {
    font-size: 80rpx;
  }

  .welcome-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;

    .greeting {
      font-size: 28rpx;
      color: rgba(255, 255, 255, 0.8);
    }

    .name {
      font-size: 40rpx;
      font-weight: 700;
      color: #FFFFFF;
    }
  }

  .welcome-date {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.6);
  }
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24rpx;
  padding: 0 32rpx 32rpx;

  .quick-item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16rpx;
    padding: 32rpx 16rpx;
    background-color: #FFFFFF;
    border-radius: 20rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
    transition: all 0.3s ease;

    &:active {
      transform: scale(0.95);
      box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
    }
  }

  .quick-icon {
    font-size: 64rpx;
  }

  .quick-text {
    font-size: 28rpx;
    color: var(--color-text-primary, #1A202C);
    text-align: center;
  }

  .quick-badge {
    position: absolute;
    top: 16rpx;
    right: 16rpx;
    min-width: 36rpx;
    height: 36rpx;
    padding: 0 8rpx;
    background-color: #F56565;
    border-radius: 18rpx;
    font-size: 20rpx;
    color: #FFFFFF;
    text-align: center;
    line-height: 36rpx;
  }
}

.section {
  margin: 0 32rpx 32rpx;

  &-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24rpx;
  }

  &-title {
    font-size: 36rpx;
    font-weight: 700;
    color: var(--color-text-primary, #1A202C);
  }

  &-more {
    font-size: 28rpx;
    color: var(--color-text-tertiary, #718096);
  }
}

.announcement-list {
  .announcement-item {
    display: flex;
    align-items: center;
    gap: 16rpx;
    padding: 24rpx;
    margin-bottom: 16rpx;
    background-color: #FFFFFF;
    border-radius: 16rpx;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

    &:last-child {
      margin-bottom: 0;
    }

    &:active {
      background-color: var(--color-bg-hover, #EDF2F7);
    }
  }

  .announcement-tag {
    padding: 8rpx 16rpx;
    border-radius: 8rpx;
    font-size: 24rpx;
    flex-shrink: 0;

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
  }

  .announcement-content {
    flex: 1;
    min-width: 0;
  }

  .announcement-title {
    font-size: 32rpx;
    color: var(--color-text-primary, #1A202C);
    margin-bottom: 8rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .announcement-meta {
    display: flex;
    align-items: center;
    gap: 24rpx;
    font-size: 24rpx;
    color: var(--color-text-tertiary, #718096);
  }
}

.task-list {
  .task-item {
    display: flex;
    align-items: center;
    gap: 16rpx;
    padding: 24rpx;
    margin-bottom: 16rpx;
    background-color: #FFFFFF;
    border-radius: 16rpx;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

    &:active {
      background-color: var(--color-bg-hover, #EDF2F7);
    }
  }

  .task-icon {
    font-size: 56rpx;
    flex-shrink: 0;
  }

  .task-content {
    flex: 1;
    min-width: 0;
  }

  .task-title {
    font-size: 32rpx;
    color: var(--color-text-primary, #1A202C);
    margin-bottom: 8rpx;
  }

  .task-desc {
    font-size: 28rpx;
    color: var(--color-text-tertiary, #718096);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .task-action {
    flex-shrink: 0;
  }

  .action-btn {
    display: inline-block;
    padding: 12rpx 24rpx;
    background-color: var(--color-primary, #2F855A);
    color: #FFFFFF;
    border-radius: 8rpx;
    font-size: 28rpx;
  }
}

.load-more {
  padding: 32rpx;
}

// 适老化模式
:global(.elderly-mode-large) {
  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
  }

  .quick-text {
    font-size: 32rpx;
  }
}

:global(.elderly-mode-xl) {
  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
  }

  .quick-text {
    font-size: 36rpx;
  }
}
</style>