<template>
  <view class="services-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-content">
        <view class="navbar-title">村民服务</view>
        <view class="navbar-icon" @click="handleNotification">
          <text class="icon">🔔</text>
          <view v-if="unreadCount > 0" class="badge">{{ unreadCount }}</view>
        </view>
      </view>
    </view>

    <!-- 页面内容 -->
    <scroll-view class="page-content" scroll-y>
      <!-- 用户卡片 -->
      <view class="user-card">
        <view class="user-avatar">👤</view>
        <view class="user-info">
          <view class="user-name">{{ userName }}</view>
          <view class="user-village">{{ villageName }}</view>
        </view>
        <view class="user-points">
          <text class="points-icon">⭐</text>
          <text class="points-text">{{ userPoints }}分</text>
        </view>
      </view>

      <!-- 一户一码 -->
      <view class="qr-section" @click="navigateTo('/pages/services/household-qr')">
        <view class="qr-card">
          <view class="qr-left">
            <text class="qr-icon">🏠</text>
            <view class="qr-info">
              <view class="qr-title">一户一码</view>
              <view class="qr-desc">扫码查看/更新家庭信息</view>
            </view>
          </view>
          <view class="qr-arrow">→</view>
        </view>
      </view>

      <!-- 快捷服务 -->
      <view class="quick-services">
        <view class="section-title">快捷服务</view>
        <view class="service-grid">
          <view
            v-for="service in quickServices"
            :key="service.id"
            class="service-item"
            @click="handleServiceClick(service)"
          >
            <view class="service-icon">{{ service.icon }}</view>
            <view class="service-name">{{ service.name }}</view>
            <view v-if="service.badge" class="service-badge">{{ service.badge }}</view>
          </view>
        </view>
      </view>

      <!-- 我的办事 -->
      <view class="my-applications">
        <view class="section-header">
          <text class="section-title">我的办事</text>
          <text class="section-more" @click="handleViewAll">全部 ></text>
        </view>

        <view class="application-list">
          <view
            v-for="app in applications"
            :key="app.id"
            class="application-item"
            @click="handleApplicationClick(app)"
          >
            <view class="app-icon">{{ app.icon }}</view>
            <view class="app-content">
              <view class="app-title">{{ app.title }}</view>
              <view class="app-meta">
                <text class="meta-item">{{ app.date }}</text>
                <view :class="['app-status', `status-${app.status}`]">
                  {{ app.statusText }}
                </view>
              </view>
            </view>
            <view class="app-arrow">→</view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-if="applications.length === 0" class="empty-state">
          <text class="empty-icon">📋</text>
          <text class="empty-text">暂无办事记录</text>
        </view>
      </view>

      <!-- 政策计算器 -->
      <view class="calculator-section">
        <view class="section-title">政策计算器</view>
        <view class="calculator-grid">
          <view
            v-for="calc in calculators"
            :key="calc.id"
            class="calculator-item"
            @click="handleCalculatorClick(calc)"
          >
            <text class="calculator-icon">{{ calc.icon }}</text>
            <text class="calculator-name">{{ calc.name }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部导航 -->
    <TabBar :current="1" />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { useElderlyStore } from '@/store/elderly'
import TabBar from '@/components/common/TabBar.vue'

/**
 * 村民服务首页
 */

const userStore = useUserStore()
const elderlyStore = useElderlyStore()

// 用户信息
const userName = computed(() => userStore.userInfo?.name || '村民')
const villageName = computed(() => userStore.userInfo?.villageName || '东村')
const userPoints = ref(126)

// 未读数量
const unreadCount = ref(3)

// 快捷服务
const quickServices = ref([
  { id: 1, icon: '📝', name: '在线办事', badge: null, path: '/pages/services/application' },
  { id: 2, icon: '🪪', name: '证件办理', badge: null, path: '/pages/services/certificate' },
  { id: 3, icon: '💰', name: '福利申请', badge: '2', path: '/pages/services/welfare' },
  { id: 4, icon: '🏥', name: '医保社保', badge: null, path: '/pages/services/insurance' },
  { id: 5, icon: '🌾', name: '农业补贴', badge: null, path: '/pages/services/agriculture' },
  { id: 6, icon: '🎓', name: '教育资助', badge: null, path: '/pages/services/education' },
  { id: 7, icon: '🏘️', name: '住房保障', badge: null, path: '/pages/services/housing' },
  { id: 8, icon: '📞', name: '便民电话', badge: null, path: '/pages/services/contacts' }
])

// 办事记录
const applications = ref([
  {
    id: 1,
    icon: '📝',
    title: '生育登记申请',
    date: '2024-12-25',
    status: 'pending',
    statusText: '待审核'
  },
  {
    id: 2,
    icon: '🪪',
    title: '临时身份证办理',
    date: '2024-12-20',
    status: 'approved',
    statusText: '已通过'
  },
  {
    id: 3,
    icon: '💰',
    title: '低保申请',
    date: '2024-12-15',
    status: 'processing',
    statusText: '办理中'
  }
])

// 政策计算器
const calculators = ref([
  { id: 1, icon: '🌾', name: '耕地补贴' },
  { id: 2, icon: '👶', name: '生育津贴' },
  { id: 3, icon: '👵', name: '养老金' },
  { id: 4, icon: '🏠', name: '住房补助' }
])

// 通知点击
const handleNotification = () => {
  elderlyStore.vibrate('short')
  navigateTo('/pages/profile/notification')
}

// 服务点击
const handleServiceClick = (service) => {
  elderlyStore.vibrate('short')

  // 语音播报（适老化模式）
  if (elderlyStore.isElderlyMode) {
    elderlyStore.speak(service.name)
  }

  navigateTo(service.path)
}

// 办事记录点击
const handleApplicationClick = (app) => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: `/pages/services/application/detail?id=${app.id}`
  })
}

// 查看全部
const handleViewAll = () => {
  elderlyStore.vibrate('short')
  navigateTo('/pages/services/application/list')
}

// 计算器点击
const handleCalculatorClick = (calc) => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: `/pages/services/calculator?type=${calc.id}`
  })
}

// 页面跳转
const navigateTo = (url) => {
  uni.navigateTo({ url })
}

// 页面加载
onMounted(() => {
  console.log('村民服务页面加载')
})
</script>

<style lang="scss" scoped>
.services-page {
  min-height: 100vh;
  background-color: var(--color-bg-page, #F7FAFC);
}

.custom-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: linear-gradient(135deg, #4299E1 0%, #3182CE 100%);
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

.user-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin: 32rpx;
  padding: 32rpx;
  background: linear-gradient(135deg, #4299E1 0%, #3182CE 100%);
  border-radius: 24rpx;

  .user-avatar {
    width: 120rpx;
    height: 120rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    font-size: 64rpx;
  }

  .user-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }

  .user-name {
    font-size: 40rpx;
    font-weight: 700;
    color: #FFFFFF;
  }

  .user-village {
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.8);
  }

  .user-points {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4rpx;
    padding: 16rpx 24rpx;
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 16rpx;
  }

  .points-icon {
    font-size: 32rpx;
  }

  .points-text {
    font-size: 28rpx;
    font-weight: 700;
    color: #FFFFFF;
  }
}

.qr-section {
  padding: 0 32rpx 32rpx;
}

.qr-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  background: linear-gradient(135deg, #48BB78 0%, #38A169 100%);
  border-radius: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(72, 187, 120, 0.3);

  &:active {
    transform: scale(0.98);
  }
}

.qr-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.qr-icon {
  font-size: 64rpx;
}

.qr-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.qr-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.qr-desc {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.qr-arrow {
  font-size: 48rpx;
  color: #FFFFFF;
}

.quick-services {
  padding: 0 32rpx 32rpx;
}

.section-title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--color-text-primary, #1A202C);
  margin-bottom: 24rpx;
}

.service-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24rpx;
}

.service-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx 16rpx;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;

  &:active {
    transform: scale(0.95);
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  }
}

.service-icon {
  font-size: 56rpx;
}

.service-name {
  font-size: 24rpx;
  color: var(--color-text-primary, #1A202C);
  text-align: center;
}

.service-badge {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
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

.my-applications {
  padding: 0 32rpx 32rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.section-more {
  font-size: 28rpx;
  color: var(--color-text-tertiary, #718096);
}

.application-list {
  .application-item {
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

  .app-icon {
    font-size: 56rpx;
    flex-shrink: 0;
  }

  .app-content {
    flex: 1;
    min-width: 0;
  }

  .app-title {
    font-size: 32rpx;
    font-weight: 600;
    color: var(--color-text-primary, #1A202C);
    margin-bottom: 8rpx;
  }

  .app-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .meta-item {
    font-size: 24rpx;
    color: var(--color-text-tertiary, #718096);
  }

  .app-status {
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
    font-size: 24rpx;

    &.status-pending {
      background-color: rgba(236, 201, 75, 0.1);
      color: #ECC94B;
    }

    &.status-processing {
      background-color: rgba(66, 153, 225, 0.1);
      color: #4299E1;
    }

    &.status-approved {
      background-color: rgba(72, 187, 120, 0.1);
      color: #48BB78;
    }

    &.status-rejected {
      background-color: rgba(245, 101, 101, 0.1);
      color: #F56565;
    }
  }

  .app-arrow {
    font-size: 32rpx;
    color: var(--color-text-tertiary, #718096);
    flex-shrink: 0;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
  gap: 16rpx;
}

.empty-icon {
  font-size: 96rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 28rpx;
  color: var(--color-text-tertiary, #718096);
}

.calculator-section {
  padding: 0 32rpx 32rpx;
}

.calculator-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.calculator-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 32rpx;
  background: linear-gradient(135deg, #F6E05E 0%, #ECC94B 100%);
  border-radius: 16rpx;

  &:active {
    transform: scale(0.98);
  }
}

.calculator-icon {
  font-size: 64rpx;
}

.calculator-name {
  font-size: 32rpx;
  font-weight: 700;
  color: #1A202C;
}

// 适老化模式
:global(.elderly-mode-large) {
  .service-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .service-name {
    font-size: 28rpx;
  }
}

:global(.elderly-mode-xl) {
  .service-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .service-name {
    font-size: 32rpx;
  }

  .calculator-name {
    font-size: 40rpx;
  }
}
</style>