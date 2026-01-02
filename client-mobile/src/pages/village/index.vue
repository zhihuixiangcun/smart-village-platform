<template>
  <div class="village-page">
    <!-- 自定义导航栏 -->
    <div class="custom-navbar">
      <div class="navbar-content">
        <div class="navbar-title">村务治理</div>
        <div class="navbar-icon" @click="handleNotification">
          <span class="icon">🔔</span>
          <div v-if="unreadCount > 0" class="badge">{{ unreadCount }}</div>
        </div>
      </div>
    </div>

    <!-- 页面内容 -->
    <scroll-view class="page-content" scroll-y @scrolltolower="handleLoadMore">
      <!-- 欢迎卡片 -->
      <div class="welcome-card">
        <div class="welcome-icon">👋</div>
        <div class="welcome-text">
          <span class="greeting">{{ greeting }}</span>
          <span class="name">{{ userName }}</span>
        </div>
        <div class="welcome-date">{{ currentDate }}</div>
      </div>

      <!-- 快捷入口 -->
      <div class="quick-actions">
        <div class="quick-item" @click="navigateTo('/village/announcement')">
          <div class="quick-icon">📢</div>
          <div class="quick-text">村务公告</div>
          <div class="quick-badge" v-if="announcementUnread > 0">{{ announcementUnread }}</div>
        </div>
        <div class="quick-item" @click="navigateTo('/village/meeting')">
          <div class="quick-icon">📅</div>
          <div class="quick-text">会议通知</div>
          <div class="quick-badge" v-if="meetingUpcoming > 0">{{ meetingUpcoming }}</div>
        </div>
        <div class="quick-item" @click="navigateTo('/village/vote')">
          <div class="quick-icon">🗳️</div>
          <div class="quick-text">在线投票</div>
          <div class="quick-badge" v-if="voteActive > 0">{{ voteActive }}</div>
        </div>
        <div class="quick-item" @click="navigateTo('/village/finance')">
          <div class="quick-icon">💰</div>
          <div class="quick-text">财务公示</div>
        </div>
      </div>

      <!-- 最新公告 -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">最新公告</span>
          <span class="section-more" @click="navigateTo('/village/announcement')">更多 ></span>
        </div>
        <div class="announcement-list">
          <div
            v-for="item in announcements"
            :key="item.id"
            class="announcement-item"
            @click="handleAnnouncementClick(item)"
          >
            <div class="announcement-tag" :class="`tag-${item.type}`">{{ item.typeLabel }}</div>
            <div class="announcement-content">
              <div class="announcement-title">{{ item.title }}</div>
              <div class="announcement-meta">
                <span class="meta-item">📅 {{ item.publishDate }}</span>
                <span class="meta-item" v-if="item.read === false">未读</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 待办事项 -->
      <div class="section" v-if="pendingTasks.length > 0">
        <div class="section-header">
          <span class="section-title">待办事项</span>
        </div>
        <div class="task-list">
          <div
            v-for="task in pendingTasks"
            :key="task.id"
            class="task-item"
            @click="handleTaskClick(task)"
          >
            <div class="task-icon">{{ task.icon }}</div>
            <div class="task-content">
              <div class="task-title">{{ task.title }}</div>
              <div class="task-desc">{{ task.description }}</div>
            </div>
            <div class="task-action">
              <span class="action-btn">处理</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div class="load-more" v-if="hasMore">
        <uni-load-more :status="loadStatus" />
      </div>
    </scroll-view>

    <!-- 底部导航 -->
    <TabBar :current="0" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { useElderlyStore } from '@/store/elderly'
import TabBar from '@/components/common/TabBar.vue'

/**
 * 村务治理首页
 */

const router = useRouter()
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
  router.push('/profile/notification')
}

// 公告点击
const handleAnnouncementClick = (item) => {
  elderlyStore.vibrate('short')
  // 标记为已读
  item.read = true
  router.push(`/village/announcement/${item.id}`)
}

// 任务点击
const handleTaskClick = (task) => {
  elderlyStore.vibrate('short')
  // 根据任务类型跳转
  if (task.title.includes('投票')) {
    router.push('/village/vote')
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
  router.push(url)
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
  background-color: #F7FAFC;
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
    height: 44px;
    padding: 0 16px;
  }

  .navbar-title {
    font-size: 18px;
    font-weight: 700;
    color: #FFFFFF;
  }

  .navbar-icon {
    position: relative;
    font-size: 24px;

    .badge {
      position: absolute;
      top: -2px;
      right: -2px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      background-color: #F56565;
      border-radius: 8px;
      font-size: 10px;
      color: #FFFFFF;
      text-align: center;
      line-height: 16px;
    }
  }
}

.page-content {
  height: 100vh;
  padding-top: calc(44px + env(safe-area-inset-top, 0));
  padding-bottom: calc(50px + env(safe-area-inset-bottom, 0));
}

.welcome-card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px;
  padding: 20px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;

  .welcome-icon {
    font-size: 40px;
  }

  .welcome-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .greeting {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
    }

    .name {
      font-size: 20px;
      font-weight: 700;
      color: #FFFFFF;
    }
  }

  .welcome-date {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 0 16px 16px;

  .quick-item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px 8px;
    background-color: #FFFFFF;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    transition: all 0.3s ease;

    &:active {
      transform: scale(0.95);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
    }
  }

  .quick-icon {
    font-size: 32px;
  }

  .quick-text {
    font-size: 14px;
    color: #1A202C;
    text-align: center;
  }

  .quick-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    background-color: #F56565;
    border-radius: 9px;
    font-size: 10px;
    color: #FFFFFF;
    text-align: center;
    line-height: 18px;
  }
}

.section {
  margin: 0 16px 16px;

  &-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  &-title {
    font-size: 18px;
    font-weight: 700;
    color: #1A202C;
  }

  &-more {
    font-size: 14px;
    color: #718096;
  }
}

.announcement-list {
  .announcement-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    margin-bottom: 8px;
    background-color: #FFFFFF;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);

    &:last-child {
      margin-bottom: 0;
    }

    &:active {
      background-color: #EDF2F7;
    }
  }

  .announcement-tag {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
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
    font-size: 16px;
    color: #1A202C;
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .announcement-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: #718096;
  }
}

.task-list {
  .task-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    margin-bottom: 8px;
    background-color: #FFFFFF;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);

    &:active {
      background-color: #EDF2F7;
    }
  }

  .task-icon {
    font-size: 28px;
    flex-shrink: 0;
  }

  .task-content {
    flex: 1;
    min-width: 0;
  }

  .task-title {
    font-size: 16px;
    color: #1A202C;
    margin-bottom: 4px;
  }

  .task-desc {
    font-size: 14px;
    color: #718096;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .task-action {
    flex-shrink: 0;
  }

  .action-btn {
    display: inline-block;
    padding: 6px 12px;
    background-color: #2F855A;
    color: #FFFFFF;
    border-radius: 4px;
    font-size: 14px;
  }
}

.load-more {
  padding: 16px;
}

// 适老化模式
[data-elderly-mode="large"] {
  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
  }

  .quick-text {
    font-size: 16px;
  }
}

[data-elderly-mode="xl"] {
  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
  }

  .quick-text {
    font-size: 18px;
  }
}
</style>
