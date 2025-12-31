<template>
  <view class="household-qr-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-back" @click="handleBack">
        <text class="icon">←</text>
      </view>
      <view class="navbar-title">一户一码</view>
      <view class="navbar-icon" @click="handleShare">
        <text class="icon">📤</text>
      </view>
    </view>

    <!-- 页面内容 -->
    <scroll-view class="page-content" scroll-y>
      <!-- 二维码卡片 -->
      <view class="qr-card">
        <view class="qr-header">
          <text class="qr-icon">🏠</text>
          <view class="qr-title-group">
            <text class="qr-title">我的家庭二维码</text>
            <text class="qr-subtitle">扫码查看家庭信息</text>
          </view>
        </view>

        <!-- 二维码显示区 -->
        <view class="qr-display">
          <view class="qr-code">
            <image
              v-if="qrCodeUrl"
              :src="qrCodeUrl"
              class="qr-image"
              mode="aspectFit"
              @click="handleQRClick"
            />
            <view v-else class="qr-placeholder">
              <text class="placeholder-icon">⏳</text>
              <text class="placeholder-text">加载中...</text>
            </view>
          </view>

          <!-- 刷新按钮 -->
          <view class="refresh-btn" @click="handleRefreshQR">
            <text class="refresh-icon">🔄</text>
            <text class="refresh-text">刷新二维码</text>
          </view>
        </view>

        <!-- 使用说明 -->
        <view class="qr-notice">
          <view class="notice-item">
            <text class="notice-icon">✓</text>
            <text class="notice-text">村干部扫码可验证家庭成员信息</text>
          </view>
          <view class="notice-item">
            <text class="notice-icon">✓</text>
            <text class="notice-text">可用于村内办事身份验证</text>
          </view>
          <view class="notice-item">
            <text class="notice-icon">✓</text>
            <text class="notice-text">请妥善保管，勿随意展示给他人</text>
          </view>
        </view>
      </view>

      <!-- 家庭信息卡片 -->
      <view class="family-card">
        <view class="card-title">家庭成员</view>

        <view class="member-list">
          <view
            v-for="member in familyMembers"
            :key="member.id"
            class="member-item"
          >
            <view class="member-avatar">{{ member.avatar }}</view>
            <view class="member-info">
              <view class="member-name">
                {{ member.name }}
                <text v-if="member.isPrimary" class="primary-badge">户主</text>
              </view>
              <view class="member-relation">{{ member.relation }}</view>
            </view>
            <view class="member-status" :class="`status-${member.status}`">
              {{ member.statusText }}
            </view>
          </view>
        </view>
      </view>

      <!-- 快捷操作 -->
      <view class="quick-actions">
        <view class="action-item" @click="handleAddMember">
          <text class="action-icon">➕</text>
          <text class="action-text">添加成员</text>
        </view>
        <view class="action-item" @click="handleUpdateInfo">
          <text class="action-icon">✏️</text>
          <text class="action-text">更新信息</text>
        </view>
        <view class="action-item" @click="handleHistory">
          <text class="action-icon">📋</text>
          <text class="action-text">扫码记录</text>
        </view>
      </view>

      <!-- 扫码识别功能 -->
      <view class="scan-section">
        <view class="section-title">扫一扫</view>
        <view class="scan-actions">
          <view class="scan-item" @click="handleScanOther">
            <text class="scan-icon">📱</text>
            <text class="scan-text">扫描他人</text>
          </view>
          <view class="scan-item" @click="handleMyQRCode">
            <text class="scan-icon">👁️</text>
            <text class="scan-text">查看我的码</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { useElderlyStore } from '@/store/elderly'

/**
 * 一户一码页面
 */

const userStore = useUserStore()
const elderlyStore = useElderlyStore()

// 二维码URL
const qrCodeUrl = ref('')

// 家庭成员
const familyMembers = ref([
  {
    id: 1,
    avatar: '👨',
    name: '张大山',
    relation: '本人',
    isPrimary: true,
    status: 'in-village',
    statusText: '在村'
  },
  {
    id: 2,
    avatar: '👩',
    name: '李桂花',
    relation: '配偶',
    isPrimary: false,
    status: 'in-village',
    statusText: '在村'
  },
  {
    id: 3,
    avatar: '👦',
    name: '张小明',
    relation: '儿子',
    isPrimary: false,
    status: 'working-outside',
    statusText: '外出务工'
  },
  {
    id: 4,
    avatar: '👧',
    name: '张小花',
    relation: '女儿',
    isPrimary: false,
    status: 'studying-outside',
    statusText: '外地求学'
  }
])

// 返回
const handleBack = () => {
  elderlyStore.vibrate('short')
  uni.navigateBack()
}

// 分享
const handleShare = () => {
  elderlyStore.vibrate('short')
  uni.showActionSheet({
    itemList: ['保存图片', '分享给微信好友'],
    success: (res) => {
      if (res.tapIndex === 0) {
        handleSaveImage()
      } else {
        handleShareToWechat()
      }
    }
  })
}

// 保存图片
const handleSaveImage = () => {
  uni.showLoading({
    title: '保存中...'
  })

  // 模拟保存
  setTimeout(() => {
    uni.hideLoading()
    uni.showToast({
      title: '保存成功',
      icon: 'success'
    })
  }, 1000)
}

// 分享到微信
const handleShareToWechat = () => {
  // #ifdef MP-WEIXIN
  uni.share({
    provider: 'weixin',
    type: 0,
    success: () => {
      uni.showToast({
        title: '分享成功',
        icon: 'success'
      })
    }
  })
  // #endif

  // #ifndef MP-WEIXIN
  uni.showToast({
    title: '仅在小程序中支持',
    icon: 'none'
  })
  // #endif
}

// 二维码点击
const handleQRClick = () => {
  elderlyStore.vibrate('short')
  // 放大显示
  uni.previewImage({
    urls: [qrCodeUrl.value],
    current: qrCodeUrl.value
  })
}

// 刷新二维码
const handleRefreshQR = () => {
  elderlyStore.vibrate('short')

  uni.showLoading({
    title: '刷新中...'
  })

  // 模拟刷新
  setTimeout(() => {
    // 生成新的二维码URL（添加时间戳）
    qrCodeUrl.value = `https://api.smartvillage.com/qr/household/${userStore.villagerId}?t=${Date.now()}`

    uni.hideLoading()
    uni.showToast({
      title: '刷新成功',
      icon: 'success'
    })

    // 语音播报
    if (elderlyStore.isElderlyMode) {
      elderlyStore.speak('二维码已刷新')
    }
  }, 1000)
}

// 添加成员
const handleAddMember = () => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: '/pages/services/member/add'
  })
}

// 更新信息
const handleUpdateInfo = () => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: '/pages/services/family/update'
  })
}

// 扫码记录
const handleHistory = () => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: '/pages/services/qr/history'
  })
}

// 扫描他人
const handleScanOther = () => {
  elderlyStore.vibrate('short')

  // #ifdef MP-WEIXIN
  uni.scanCode({
    success: (res) => {
      console.log('扫码结果:', res)
      uni.navigateTo({
        url: `/pages/services/household-qr/result?qr=${encodeURIComponent(res.result)}`
      })
    },
    fail: () => {
      uni.showToast({
        title: '扫码失败',
        icon: 'none'
      })
    }
  })
  // #endif

  // #ifndef MP-WEIXIN
  uni.showToast({
    title: '仅在小程序中支持',
    icon: 'none'
  })
  // #endif
}

// 查看我的码
const handleMyQRCode = () => {
  elderlyStore.vibrate('short')
  // 放大显示当前二维码
  uni.previewImage({
    urls: [qrCodeUrl.value],
    current: qrCodeUrl.value
  })
}

// 生成二维码
const generateQRCode = async () => {
  try {
    // 调用API生成二维码
    // const result = await api.services.getHouseholdQR()
    // qrCodeUrl.value = result.data.qrCodeUrl

    // 模拟生成
    qrCodeUrl.value = `https://api.smartvillage.com/qr/household/${userStore.villagerId || '12345'}?t=${Date.now()}`

  } catch (error) {
    console.error('生成二维码失败:', error)
    uni.showToast({
      title: '生成失败，请重试',
      icon: 'none'
    })
  }
}

// 页面加载
onMounted(() => {
  generateQRCode()
})
</script>

<style lang="scss" scoped>
.household-qr-page {
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
  .navbar-icon {
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

.page-content {
  height: calc(100vh - 88rpx);
  padding: 32rpx;
}

.qr-card {
  padding: 40rpx;
  background: linear-gradient(135deg, #48BB78 0%, #38A169 100%);
  border-radius: 24rpx;
  margin-bottom: 32rpx;
}

.qr-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.qr-icon {
  font-size: 64rpx;
}

.qr-title-group {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.qr-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.qr-subtitle {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.qr-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 32rpx;
}

.qr-code {
  width: 400rpx;
  height: 400rpx;
  padding: 24rpx;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-image {
  width: 100%;
  height: 100%;
}

.qr-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.placeholder-icon {
  font-size: 80rpx;
  opacity: 0.5;
}

.placeholder-text {
  font-size: 28rpx;
  color: var(--color-text-tertiary, #718096);
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 32rpx;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 48rpx;
}

.refresh-icon {
  font-size: 32rpx;
}

.refresh-text {
  font-size: 28rpx;
  color: #FFFFFF;
}

.qr-notice {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.notice-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.notice-icon {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  font-size: 24rpx;
  color: #FFFFFF;
  flex-shrink: 0;
}

.notice-text {
  flex: 1;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
}

.family-card {
  padding: 32rpx;
  background-color: #FFFFFF;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  margin-bottom: 32rpx;
}

.card-title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--color-text-primary, #1A202C);
  margin-bottom: 24rpx;
}

.member-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx;
  background-color: var(--color-bg-card, #F7FAFC);
  border-radius: 12rpx;
}

.member-avatar {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-disabled, #F1F5F9);
  border-radius: 50%;
  font-size: 48rpx;
  flex-shrink: 0;
}

.member-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.member-name {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--color-text-primary, #1A202C);
}

.primary-badge {
  margin-left: 8rpx;
  padding: 4rpx 12rpx;
  background-color: var(--color-primary, #2F855A);
  color: #FFFFFF;
  border-radius: 8rpx;
  font-size: 24rpx;
}

.member-relation {
  font-size: 28rpx;
  color: var(--color-text-tertiary, #718096);
}

.member-status {
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  font-size: 24rpx;

  &.status-in-village {
    background-color: rgba(72, 187, 120, 0.1);
    color: #48BB78;
  }

  &.status-working-outside {
    background-color: rgba(66, 153, 225, 0.1);
    color: #4299E1;
  }

  &.status-studying-outside {
    background-color: rgba(236, 201, 75, 0.1);
    color: #ECC94B;
  }
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 32rpx 16rpx;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

  &:active {
    transform: scale(0.95);
  }
}

.action-icon {
  font-size: 56rpx;
}

.action-text {
  font-size: 28rpx;
  color: var(--color-text-primary, #1A202C);
}

.scan-section {
  padding: 32rpx;
  background-color: #FFFFFF;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.section-title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--color-text-primary, #1A202C);
  margin-bottom: 24rpx;
}

.scan-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.scan-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 40rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16rpx;

  &:active {
    transform: scale(0.98);
  }
}

.scan-icon {
  font-size: 64rpx;
}

.scan-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
}

// 适老化模式
:global(.elderly-mode-large) {
  .quick-actions {
    grid-template-columns: 1fr;
  }

  .action-item {
    flex-direction: row;
    justify-content: center;
    padding: 40rpx 32rpx;
  }

  .action-text {
    font-size: 32rpx;
  }
}

:global(.elderly-mode-xl) {
  .quick-actions {
    grid-template-columns: 1fr;
  }

  .action-text {
    font-size: 40rpx;
  }

  .member-name {
    font-size: 40rpx;
  }
}
</style>