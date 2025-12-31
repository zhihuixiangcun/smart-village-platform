<template>
  <view class="profile-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-content">
        <view class="navbar-title">我的</view>
        <view class="navbar-icon" @click="handleSettings">
          <text class="icon">⚙️</text>
        </view>
      </view>
    </view>

    <!-- 页面内容 -->
    <scroll-view class="page-content" scroll-y>
      <!-- 用户信息卡片 -->
      <view class="user-card">
        <view class="user-avatar" @click="handleAvatarClick">
          <image v-if="userInfo.avatar" :src="userInfo.avatar" class="avatar-image" mode="aspectFill" />
          <text v-else class="avatar-placeholder">👤</text>
        </view>
        <view class="user-info">
          <view class="user-name">{{ userInfo.name || '村民' }}</view>
          <view class="user-village">{{ userInfo.villageName || '东村' }}</view>
          <view v-if="userInfo.verified" class="user-verified">
            <text class="verified-icon">✓</text>
            <text class="verified-text">已实名认证</text>
          </view>
        </view>
        <view class="user-edit" @click="handleEditProfile">
          <text class="edit-icon">✏️</text>
        </view>
      </view>

      <!-- 积分卡片 -->
      <view class="points-card">
        <view class="points-item">
          <text class="points-icon">⭐</text>
          <view class="points-info">
            <text class="points-value">{{ userPoints }}</text>
            <text class="points-label">我的积分</text>
          </view>
        </view>
        <view class="points-divider" />
        <view class="points-item" @click="handlePointsHistory">
          <text class="points-icon">📜</text>
          <view class="points-info">
            <text class="points-label">积分明细</text>
            <text class="points-arrow">→</text>
          </view>
        </view>
      </view>

      <!-- 功能菜单 -->
      <view class="menu-section">
        <view class="menu-title">我的服务</view>
        <view class="menu-list">
          <view class="menu-item" @click="handleMenuClick('household')">
            <view class="menu-left">
              <text class="menu-icon">🏠</text>
              <text class="menu-name">我的家庭</text>
            </view>
            <text class="menu-arrow">→</text>
          </view>
          <view class="menu-item" @click="handleMenuClick('application')">
            <view class="menu-left">
              <text class="menu-icon">📝</text>
              <text class="menu-name">我的办事</text>
            </view>
            <view class="menu-right">
              <text v-if="pendingCount > 0" class="menu-badge">{{ pendingCount }}</text>
              <text class="menu-arrow">→</text>
            </view>
          </view>
          <view class="menu-item" @click="handleMenuClick('certificate')">
            <view class="menu-left">
              <text class="menu-icon">🪪</text>
              <text class="menu-name">我的证件</text>
            </view>
            <text class="menu-arrow">→</text>
          </view>
          <view class="menu-item" @click="handleMenuClick('welfare')">
            <view class="menu-left">
              <text class="menu-icon">💰</text>
              <text class="menu-name">福利申请</text>
            </view>
            <text class="menu-arrow">→</text>
          </view>
        </view>
      </view>

      <view class="menu-section">
        <view class="menu-title">应用设置</view>
        <view class="menu-list">
          <view class="menu-item" @click="handleMenuClick('elderly')">
            <view class="menu-left">
              <text class="menu-icon">Aa</text>
              <text class="menu-name">适老化设置</text>
            </view>
            <view class="menu-right">
              <text class="menu-value">{{ modeLabel }}</text>
              <text class="menu-arrow">→</text>
            </view>
          </view>
          <view class="menu-item" @click="handleMenuClick('voice')">
            <view class="menu-left">
              <text class="menu-icon">🎤</text>
              <text class="menu-name">语音设置</text>
            </view>
            <view class="menu-right">
              <text class="menu-value">{{ voiceEnabled ? '已开启' : '已关闭' }}</text>
              <text class="menu-arrow">→</text>
            </view>
          </view>
          <view class="menu-item" @click="handleMenuClick('notification')">
            <view class="menu-left">
              <text class="menu-icon">🔔</text>
              <text class="menu-name">消息通知</text>
            </view>
            <view class="menu-right">
              <text v-if="notificationEnabled" class="menu-badge">开</text>
              <text class="menu-value">{{ notificationEnabled ? '已开启' : '已关闭' }}</text>
              <text class="menu-arrow">→</text>
            </view>
          </view>
          <view class="menu-item" @click="handleMenuClick('privacy')">
            <view class="menu-left">
              <text class="menu-icon">🔒</text>
              <text class="menu-name">隐私设置</text>
            </view>
            <text class="menu-arrow">→</text>
          </view>
        </view>
      </view>

      <view class="menu-section">
        <view class="menu-title">其他</view>
        <view class="menu-list">
          <view class="menu-item" @click="handleMenuClick('help')">
            <view class="menu-left">
              <text class="menu-icon">❓</text>
              <text class="menu-name">帮助中心</text>
            </view>
            <text class="menu-arrow">→</text>
          </view>
          <view class="menu-item" @click="handleMenuClick('about')">
            <view class="menu-left">
              <text class="menu-icon">ℹ️</text>
              <text class="menu-name">关于我们</text>
            </view>
            <text class="menu-arrow">→</text>
          </view>
          <view class="menu-item" @click="handleMenuClick('feedback')">
            <view class="menu-left">
              <text class="menu-icon">💬</text>
              <text class="menu-name">意见反馈</text>
            </view>
            <text class="menu-arrow">→</text>
          </view>
        </view>
      </view>

      <!-- 退出登录 -->
      <view class="logout-section">
        <view class="logout-btn" @click="handleLogout">
          <text>退出登录</text>
        </view>
      </view>

      <!-- 版本信息 -->
      <view class="version-info">
        <text>智慧乡村 v1.0.0</text>
      </view>
    </scroll-view>

    <!-- 底部导航 -->
    <TabBar :current="4" />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { useElderlyStore } from '@/store/elderly'
import TabBar from '@/components/common/TabBar.vue'

/**
 * 个人中心页面
 */

const userStore = useUserStore()
const elderlyStore = useElderlyStore()

// 用户信息
const userInfo = ref({
  name: '张大山',
  villageName: '东村',
  avatar: '',
  verified: true
})

// 用户积分
const userPoints = ref(126)

// 待办数量
const pendingCount = ref(2)

// 通知状态
const notificationEnabled = ref(true)

// 适老化模式标签
const modeLabel = computed(() => {
  const modeMap = {
    standard: '标准',
    large: '大字',
    xl: '超大字'
  }
  return modeMap[elderlyStore.mode] || '标准'
})

// 语音状态
const voiceEnabled = computed(() => elderlyStore.voiceEnabled)

// 头像点击
const handleAvatarClick = () => {
  elderlyStore.vibrate('short')
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      // 上传头像
      userStore.uploadAvatar(res.tempFilePaths[0])
    }
  })
}

// 编辑资料
const handleEditProfile = () => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: '/pages/profile/edit'
  })
}

// 积分明细
const handlePointsHistory = () => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: '/pages/profile/points'
  })
}

// 设置
const handleSettings = () => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: '/pages/profile/settings'
  })
}

// 菜单点击
const handleMenuClick = (type) => {
  elderlyStore.vibrate('short')

  // 语音播报（适老化模式）
  if (elderlyStore.isElderlyMode) {
    const nameMap = {
      household: '我的家庭',
      application: '我的办事',
      certificate: '我的证件',
      welfare: '福利申请',
      elderly: '适老化设置',
      voice: '语音设置',
      notification: '消息通知',
      privacy: '隐私设置',
      help: '帮助中心',
      about: '关于我们',
      feedback: '意见反馈'
    }
    elderlyStore.speak(nameMap[type])
  }

  const urlMap = {
    household: '/pages/profile/household',
    application: '/pages/profile/application',
    certificate: '/pages/profile/certificate',
    welfare: '/pages/profile/welfare',
    elderly: '/pages/profile/elderly',
    voice: '/pages/profile/voice',
    notification: '/pages/profile/notification',
    privacy: '/pages/profile/privacy',
    help: '/pages/profile/help',
    about: '/pages/profile/about',
    feedback: '/pages/profile/feedback'
  }

  uni.navigateTo({
    url: urlMap[type]
  })
}

// 退出登录
const handleLogout = () => {
  elderlyStore.vibrate('long')

  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
      }
    }
  })
}

// 页面加载
onMounted(() => {
  console.log('个人中心页面加载')
})
</script>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  background-color: var(--color-bg-page, #F7FAFC);
}

.custom-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: #FFFFFF;
  border-bottom: 1rpx solid var(--color-border-primary, #E2E8F0);
  padding-top: env(safe-area-inset-top, 0);

  .navbar-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 88rpx;
    padding: 0 32rpx;
  }

  .navbar-title {
    flex: 1;
    text-align: center;
    font-size: 36rpx;
    font-weight: 700;
    color: var(--color-text-primary, #1A202C);
  }

  .navbar-icon {
    font-size: 48rpx;
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
  padding: 40rpx 32rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24rpx;
}

.user-avatar {
  width: 120rpx;
  height: 120rpx;
  flex-shrink: 0;
}

.avatar-image {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
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

.user-verified {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  background-color: rgba(72, 187, 120, 0.2);
  border-radius: 16rpx;
  align-self: flex-start;
}

.verified-icon {
  width: 32rpx;
  height: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #48BB78;
  color: #FFFFFF;
  border-radius: 50%;
  font-size: 20rpx;
  font-weight: 700;
}

.verified-text {
  font-size: 24rpx;
  color: #FFFFFF;
}

.user-edit {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
}

.edit-icon {
  font-size: 32rpx;
}

.points-card {
  display: flex;
  align-items: center;
  margin: 0 32rpx 32rpx;
  padding: 32rpx;
  background-color: #FFFFFF;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.points-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.points-icon {
  font-size: 48rpx;
}

.points-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.points-value {
  font-size: 48rpx;
  font-weight: 700;
  background: linear-gradient(135deg, #F6E05E 0%, #ECC94B 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.points-label {
  font-size: 24rpx;
  color: var(--color-text-tertiary, #718096);
}

.points-arrow {
  font-size: 24rpx;
  color: var(--color-text-tertiary, #718096);
}

.points-divider {
  width: 1rpx;
  height: 60rpx;
  background-color: var(--color-border-primary, #E2E8F0);
}

.menu-section {
  margin: 0 32rpx 32rpx;
}

.menu-title {
  font-size: 28rpx;
  color: var(--color-text-tertiary, #718096);
  margin-bottom: 16rpx;
  padding-left: 8rpx;
}

.menu-list {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid var(--color-border-primary, #E2E8F0);

  &:last-child {
    border-bottom: none;
  }

  &:active {
    background-color: var(--color-bg-hover, #EDF2F7);
  }
}

.menu-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.menu-icon {
  font-size: 40rpx;
}

.menu-name {
  font-size: 32rpx;
  color: var(--color-text-primary, #1A202C);
}

.menu-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.menu-value {
  font-size: 28rpx;
  color: var(--color-text-tertiary, #718096);
}

.menu-badge {
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 8rpx;
  background-color: #F56565;
  color: #FFFFFF;
  border-radius: 18rpx;
  font-size: 20rpx;
  text-align: center;
  line-height: 36rpx;
}

.menu-arrow {
  font-size: 24rpx;
  color: var(--color-text-tertiary, #718096);
}

.logout-section {
  margin: 32rpx;
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  font-size: 32rpx;
  color: #F56565;

  &:active {
    background-color: var(--color-bg-hover, #EDF2F7);
  }
}

.version-info {
  padding: 32rpx;
  text-align: center;
  font-size: 24rpx;
  color: var(--color-text-tertiary, #718096);
}

// 适老化模式
:global(.elderly-mode-large) {
  .user-name {
    font-size: 44rpx;
  }

  .menu-name {
    font-size: 36rpx;
  }
}

:global(.elderly-mode-xl) {
  .user-name {
    font-size: 52rpx;
  }

  .menu-name {
    font-size: 44rpx;
  }

  .points-value {
    font-size: 56rpx;
  }
}
</style>
