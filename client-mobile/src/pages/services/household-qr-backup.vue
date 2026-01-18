<template>
  <view class="household-qr-page">
    <!-- 优化的导航栏 - 渐变+阴影 -->
    <view class="custom-navbar">
      <view class="navbar-back" @click="handleBack" :active-class="'navbar-back--active'">
        <text class="icon">←</text>
      </view>
      <view class="navbar-title">一户一码</view>
      <view class="navbar-icon" @click="handleShare" :active-class="'navbar-icon--active'">
        <text class="icon">📤</text>
      </view>
    </view>

    <!-- 页面内容 -->
    <scroll-view class="page-content" scroll-y>
      <!-- 增强的二维码卡片 - 多层渐变+动画 -->
      <view class="qr-card" :class="{ 'qr-card--elderly': elderlyStore.isElderlyMode }">
        <view class="qr-card-glow"></view>
        <view class="qr-header">
          <view class="qr-icon-wrapper">
            <text class="qr-icon">🏠</text>
            <view class="qr-icon-badge"></view>
          </view>
          <view class="qr-title-group">
            <text class="qr-title">我的家庭二维码</text>
            <text class="qr-subtitle">扫码查看家庭信息</text>
          </view>
          <view class="qr-status-badge" :class="`status-${qrStatus}`">
            <text class="status-icon">{{ getStatusIcon(qrStatus) }}</text>
            <text class="status-text">{{ getStatusText(qrStatus) }}</text>
          </view>
        </view>

        <!-- 二维码显示区 - 优化布局和动画 -->
        <view class="qr-display">
          <view class="qr-code-wrapper" @click="handleQRClick" :active-class="'qr-code-wrapper--active'">
            <view class="qr-code-border">
              <view class="qr-code">
                <image
                  v-if="qrCodeUrl"
                  :src="qrCodeUrl"
                  class="qr-image"
                  mode="aspectFit"
                  :loading="'lazy'"
                />
                <view v-else class="qr-placeholder">
                  <view class="placeholder-spinner"></view>
                  <text class="placeholder-text">加载中...</text>
                </view>
              </view>
            </view>
            <view class="qr-hint">
              <text class="hint-icon">👆</text>
              <text class="hint-text">点击放大查看</text>
            </view>
          </view>

          <!-- 优化的刷新按钮 -->
          <view class="refresh-btn" @click="handleRefreshQR" :active-class="'refresh-btn--active'" :class="{ 'loading': refreshing }">
            <text class="refresh-icon" :class="{ 'rotating': refreshing }">🔄</text>
            <text class="refresh-text">{{ refreshing ? '刷新中...' : '刷新二维码' }}</text>
          </view>
        </view>

        <!-- 改进的使用说明 - 卡片化设计 -->
        <view class="qr-notice">
          <view class="notice-header">
            <text class="notice-title">使用说明</text>
            <text class="notice-subtitle">3项重要提示</text>
          </view>
          <view class="notice-list">
            <view class="notice-item" :class="{ 'notice-item--elderly': elderlyStore.isElderlyMode }">
              <view class="notice-icon-wrapper">
                <text class="notice-icon">✓</text>
              </view>
              <view class="notice-content">
                <text class="notice-text">村干部扫码可验证家庭成员信息</text>
              </view>
            </view>
            <view class="notice-item" :class="{ 'notice-item--elderly': elderlyStore.isElderlyMode }">
              <view class="notice-icon-wrapper">
                <text class="notice-icon">✓</text>
              </view>
              <view class="notice-content">
                <text class="notice-text">可用于村内办事身份验证</text>
              </view>
            </view>
            <view class="notice-item" :class="{ 'notice-item--elderly': elderlyStore.isElderlyMode }">
              <view class="notice-icon-wrapper notice-icon-wrapper--warning">
                <text class="notice-icon">⚠️</text>
              </view>
              <view class="notice-content">
                <text class="notice-text notice-text--warning">请妥善保管，勿随意展示给他人</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 优化的家庭信息卡片 -->
      <view class="family-card" :class="{ 'family-card--elderly': elderlyStore.isElderlyMode }">
        <view class="card-header">
          <view class="card-title-group">
            <text class="card-title">家庭成员</text>
            <view class="card-count">
              <text class="count-number">{{ familyMembers.length }}</text>
              <text class="count-unit">人</text>
            </view>
          </view>
          <view class="card-action" @click="handleAddMember" :active-class="'card-action--active'">
            <text class="action-icon">➕</text>
          </view>
        </view>

        <view class="member-list">
          <view
            v-for="member in familyMembers"
            :key="member.id"
            class="member-item"
            :class="{
              'member-item--primary': member.isPrimary,
              'member-item--elderly': elderlyStore.isElderlyMode
            }"
            @click="handleMemberClick(member)"
          >
            <view class="member-avatar-wrapper">
              <view class="member-avatar">{{ member.avatar }}</view>
              <view v-if="member.isPrimary" class="avatar-badge">
                <text class="badge-icon">👑</text>
              </view>
            </view>
            <view class="member-info">
              <view class="member-name">
                <text class="name-text">{{ member.name }}</text>
                <text v-if="member.isPrimary" class="primary-badge">户主</text>
              </view>
              <view class="member-relation">{{ member.relation }}</view>
            </view>
            <view class="member-status" :class="`status-${member.status}`">
              <text class="status-icon">{{ getMemberStatusIcon(member.status) }}</text>
              <text class="status-text">{{ member.statusText }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 优化的快捷操作 -->
      <view class="quick-actions" :class="{ 'quick-actions--elderly': elderlyStore.isElderlyMode }">
        <view
          class="action-item"
          @click="handleAddMember"
          :active-class="'action-item--active'"
        >
          <view class="action-icon-wrapper action-icon-wrapper--add">
            <text class="action-icon">➕</text>
          </view>
          <text class="action-text">添加成员</text>
          <view class="action-badge">3</view>
        </view>
        <view
          class="action-item"
          @click="handleUpdateInfo"
          :active-class="'action-item--active'"
        >
          <view class="action-icon-wrapper action-icon-wrapper--update">
            <text class="action-icon">✏️</text>
          </view>
          <text class="action-text">更新信息</text>
        </view>
        <view
          class="action-item"
          @click="handleHistory"
          :active-class="'action-item--active'"
        >
          <view class="action-icon-wrapper action-icon-wrapper--history">
            <text class="action-icon">📋</text>
          </view>
          <text class="action-text">扫码记录</text>
          <view class="action-dot"></view>
        </view>
      </view>

      <!-- 增强的扫码识别功能 -->
      <view class="scan-section" :class="{ 'scan-section--elderly': elderlyStore.isElderlyMode }">
        <view class="section-header">
          <text class="section-title">扫一扫</text>
          <view class="section-subtitle">快捷操作</view>
        </view>
        <view class="scan-actions">
          <view
            class="scan-item"
            @click="handleScanOther"
            :active-class="'scan-item--active'"
          >
            <view class="scan-icon-wrapper scan-icon-wrapper--scan">
              <text class="scan-icon">📱</text>
            </view>
            <text class="scan-text">扫描他人</text>
            <view class="scan-hint">验证身份</view>
          </view>
          <view
            class="scan-item"
            @click="handleMyQRCode"
            :active-class="'scan-item--active'"
          >
            <view class="scan-icon-wrapper scan-icon-wrapper--view">
              <text class="scan-icon">👁️</text>
            </view>
            <text class="scan-text">查看我的码</text>
            <view class="scan-hint">大图展示</view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '@/store/user'
import { useElderlyStore } from '@/store/elderly'

/**
 * 一户一码页面 - 优化版本
 * 增强UI/UX、适老化设计、流畅交互
 */

const userStore = useUserStore()
const elderlyStore = useElderlyStore()

// 二维码URL
const qrCodeUrl = ref('')

// 二维码状态
const qrStatus = ref('active') // active, expired, suspended
const refreshing = ref(false)

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

// 获取状态图标
const getStatusIcon = (status) => {
  const icons = {
    active: '✅',
    expired: '⏰',
    suspended: '🔒'
  }
  return icons[status] || '⚪'
}

// 获取状态文字
const getStatusText = (status) => {
  const texts = {
    active: '有效',
    expired: '已过期',
    suspended: '已停用'
  }
  return texts[status] || '未知'
}

// 获取成员状态图标
const getMemberStatusIcon = (status) => {
  const icons = {
    'in-village': '🏠',
    'working-outside': '💼',
    'studying-outside': '📚'
  }
  return icons[status] || '👤'
}

// 返回
const handleBack = () => {
  elderlyStore.vibrate('short')
  uni.navigateBack()
}

// 分享 - 增强选项
const handleShare = () => {
  elderlyStore.vibrate('short')
  uni.showActionSheet({
    itemList: ['保存图片到相册', '分享给微信好友', '分享到朋友圈', '复制链接'],
    success: (res) => {
      elderlyStore.vibrate('light')
      switch (res.tapIndex) {
        case 0:
          handleSaveImage()
          break
        case 1:
          handleShareToWechat()
          break
        case 2:
          handleShareToMoments()
          break
        case 3:
          handleCopyLink()
          break
      }
    }
  })
}

// 保存图片
const handleSaveImage = () => {
  elderlyStore.vibrate('light')
  uni.showLoading({
    title: '保存中...',
    mask: true
  })

  // 模拟保存
  setTimeout(() => {
    uni.hideLoading()
    elderlyStore.vibrate('success')
    uni.showToast({
      title: '保存成功',
      icon: 'success',
      duration: 2000
    })

    // 语音播报
    if (elderlyStore.isElderlyMode) {
      elderlyStore.speak('二维码已保存到相册')
    }
  }, 1000)
}

// 分享到微信
const handleShareToWechat = () => {
  // #ifdef MP-WEIXIN
  uni.share({
    provider: 'weixin',
    type: 0,
    success: () => {
      elderlyStore.vibrate('success')
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
    icon: 'none',
    duration: 2000
  })
  // #endif
}

// 分享到朋友圈
const handleShareToMoments = () => {
  // #ifdef MP-WEIXIN
  uni.share({
    provider: 'weixin',
    type: 1,
    success: () => {
      elderlyStore.vibrate('success')
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
    icon: 'none',
    duration: 2000
  })
  // #endif
}

// 复制链接
const handleCopyLink = () => {
  uni.setClipboardData({
    data: qrCodeUrl.value,
    success: () => {
      elderlyStore.vibrate('success')
      uni.showToast({
        title: '链接已复制',
        icon: 'success',
        duration: 2000
      })

      if (elderlyStore.isElderlyMode) {
        elderlyStore.speak('链接已复制到剪贴板')
      }
    }
  })
}

// 二维码点击 - 增强反馈
const handleQRClick = () => {
  elderlyStore.vibrate('light')
  // 放大显示
  uni.previewImage({
    urls: [qrCodeUrl.value],
    current: qrCodeUrl.value,
    longPressActions: {
      itemList: ['保存图片', '重新生成'],
      success: (res) => {
        if (res.tapIndex === 0) {
          handleSaveImage()
        } else {
          handleRefreshQR()
        }
      }
    }
  })
}

// 刷新二维码 - 优化体验
const handleRefreshQR = () => {
  elderlyStore.vibrate('light')

  if (refreshing.value) {
    return
  }

  refreshing.value = true
  uni.showLoading({
    title: '刷新中...',
    mask: true
  })

  // 模拟刷新
  setTimeout(() => {
    // 生成新的二维码URL（添加时间戳）
    qrCodeUrl.value = `https://api.smartvillage.com/qr/household/${userStore.villagerId || '12345'}?t=${Date.now()}`
    qrStatus.value = 'active'

    refreshing.value = false
    uni.hideLoading()
    elderlyStore.vibrate('success')
    uni.showToast({
      title: '刷新成功',
      icon: 'success',
      duration: 2000
    })

    // 语音播报
    if (elderlyStore.isElderlyMode) {
      setTimeout(() => {
        elderlyStore.speak('二维码已刷新')
      }, 500)
    }
  }, 1500)
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

// 成员点击
const handleMemberClick = (member) => {
  elderlyStore.vibrate('short')
  uni.navigateTo({
    url: `/pages/services/member/detail?id=${member.id}`
  })
}

// 扫描他人
const handleScanOther = () => {
  elderlyStore.vibrate('short')

  // #ifdef MP-WEIXIN
  uni.scanCode({
    success: (res) => {
      elderlyStore.vibrate('success')
      console.log('扫码结果:', res)
      uni.navigateTo({
        url: `/pages/services/household-qr/result?qr=${encodeURIComponent(res.result)}`
      })
    },
    fail: (err) => {
      elderlyStore.vibrate('warning')
      console.error('扫码失败:', err)
      uni.showToast({
        title: '扫码失败，请重试',
        icon: 'none',
        duration: 2000
      })
    }
  })
  // #endif

  // #ifndef MP-WEIXIN
  elderlyStore.vibrate('warning')
  uni.showToast({
    title: '仅在小程序中支持',
    icon: 'none',
    duration: 2000
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
    elderlyStore.vibrate('light')
    // 调用API生成二维码
    // const result = await api.services.getHouseholdQR()
    // qrCodeUrl.value = result.data.qrCodeUrl

    // 模拟生成
    setTimeout(() => {
      qrCodeUrl.value = `https://api.smartvillage.com/qr/household/${userStore.villagerId || '12345'}?t=${Date.now()}`
    }, 500)

  } catch (error) {
    console.error('生成二维码失败:', error)
    elderlyStore.vibrate('error')
    uni.showToast({
      title: '生成失败，请重试',
      icon: 'none',
      duration: 2000
    })
  }
}

// 页面加载
onMounted(() => {
  generateQRCode()

  // 适老化模式下自动语音提示
  if (elderlyStore.isElderlyMode) {
    setTimeout(() => {
      elderlyStore.speak('这是您的家庭二维码，村干部可以扫码验证您的信息')
    }, 1000)
  }
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