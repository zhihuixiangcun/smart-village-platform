<template>
  <div class="profile-page">
    <!-- 自定义导航栏 -->
    <div class="custom-navbar">
      <div class="navbar-content">
        <div class="navbar-title">我的</div>
        <div class="navbar-icon" @click="handleSettings">
          <span class="icon">⚙️</span>
        </div>
      </div>
    </div>

    <!-- 页面内容 -->
    <div class="page-content">
      <!-- 用户信息卡片 -->
      <div class="user-card">
        <div class="user-avatar" @click="handleAvatarClick">
          <img v-if="userInfo.avatar" :src="userInfo.avatar" class="avatar-image" alt="avatar" />
          <span v-else class="avatar-placeholder">👤</span>
        </div>
        <div class="user-info">
          <div class="user-name">{{ userInfo.name || '村民' }}</div>
          <div class="user-village">{{ userInfo.villageName || '东村' }}</div>
          <div v-if="userInfo.verified" class="user-verified">
            <span class="verified-icon">✓</span>
            <span class="verified-text">已实名认证</span>
          </div>
        </div>
        <div class="user-edit" @click="handleEditProfile">
          <span class="edit-icon">✏️</span>
        </div>
      </div>

      <!-- 积分卡片 -->
      <div class="points-card">
        <div class="points-item">
          <span class="points-icon">⭐</span>
          <div class="points-info">
            <span class="points-value">{{ userPoints }}</span>
            <span class="points-label">我的积分</span>
          </div>
        </div>
        <div class="points-divider" />
        <div class="points-item" @click="handlePointsHistory">
          <span class="points-icon">📜</span>
          <div class="points-info">
            <span class="points-label">积分明细</span>
            <span class="points-arrow">→</span>
          </div>
        </div>
      </div>

      <!-- 功能菜单 -->
      <div class="menu-section">
        <div class="menu-title">我的服务</div>
        <div class="menu-list">
          <div class="menu-item" @click="handleMenuClick('household')">
            <div class="menu-left">
              <span class="menu-icon">🏠</span>
              <span class="menu-name">我的家庭</span>
            </div>
            <span class="menu-arrow">→</span>
          </div>
          <div class="menu-item" @click="handleMenuClick('application')">
            <div class="menu-left">
              <span class="menu-icon">📝</span>
              <span class="menu-name">我的办事</span>
            </div>
            <div class="menu-right">
              <span v-if="pendingCount > 0" class="menu-badge">{{ pendingCount }}</span>
              <span class="menu-arrow">→</span>
            </div>
          </div>
          <div class="menu-item" @click="handleMenuClick('certificate')">
            <div class="menu-left">
              <span class="menu-icon">🪪</span>
              <span class="menu-name">我的证件</span>
            </div>
            <span class="menu-arrow">→</span>
          </div>
          <div class="menu-item" @click="handleMenuClick('welfare')">
            <div class="menu-left">
              <span class="menu-icon">💰</span>
              <span class="menu-name">福利申请</span>
            </div>
            <span class="menu-arrow">→</span>
          </div>
          <!-- 村干部专属：四象限工作台 -->
          <div v-if="userStore.isOfficial" class="menu-item" @click="handleMenuClick('quadrant')">
            <div class="menu-left">
              <span class="menu-icon">📊</span>
              <span class="menu-name">四象限工作台</span>
            </div>
            <span class="menu-badge">4</span>
            <span class="menu-arrow">→</span>
          </div>
          <!-- 管理员专属：村干部审核 -->
          <div v-if="canApprove" class="menu-item" @click="handleMenuClick('approvals')">
            <div class="menu-left">
              <span class="menu-icon">✅</span>
              <span class="menu-name">村干部审核</span>
            </div>
            <div class="menu-right">
              <span v-if="pendingApprovals > 0" class="menu-badge">{{ pendingApprovals }}</span>
              <span class="menu-arrow">→</span>
            </div>
          </div>
        </div>
      </div>

      <div class="menu-section">
        <div class="menu-title">应用设置</div>
        <div class="menu-list">
          <div class="menu-item" @click="handleMenuClick('elderly')">
            <div class="menu-left">
              <span class="menu-icon">Aa</span>
              <span class="menu-name">适老化设置</span>
            </div>
            <div class="menu-right">
              <span class="menu-value">{{ modeLabel }}</span>
              <span class="menu-arrow">→</span>
            </div>
          </div>
          <div class="menu-item" @click="handleMenuClick('voice')">
            <div class="menu-left">
              <span class="menu-icon">🎤</span>
              <span class="menu-name">语音设置</span>
            </div>
            <div class="menu-right">
              <span class="menu-value">{{ voiceEnabled ? '已开启' : '已关闭' }}</span>
              <span class="menu-arrow">→</span>
            </div>
          </div>
          <div class="menu-item" @click="handleMenuClick('notification')">
            <div class="menu-left">
              <span class="menu-icon">🔔</span>
              <span class="menu-name">消息通知</span>
            </div>
            <div class="menu-right">
              <span v-if="notificationEnabled" class="menu-badge">开</span>
              <span class="menu-value">{{ notificationEnabled ? '已开启' : '已关闭' }}</span>
              <span class="menu-arrow">→</span>
            </div>
          </div>
          <div class="menu-item" @click="handleMenuClick('privacy')">
            <div class="menu-left">
              <span class="menu-icon">🔒</span>
              <span class="menu-name">隐私设置</span>
            </div>
            <span class="menu-arrow">→</span>
          </div>
        </div>
      </div>

      <div class="menu-section">
        <div class="menu-title">其他</div>
        <div class="menu-list">
          <div class="menu-item" @click="handleMenuClick('help')">
            <div class="menu-left">
              <span class="menu-icon">❓</span>
              <span class="menu-name">帮助中心</span>
            </div>
            <span class="menu-arrow">→</span>
          </div>
          <div class="menu-item" @click="handleMenuClick('about')">
            <div class="menu-left">
              <span class="menu-icon">ℹ️</span>
              <span class="menu-name">关于我们</span>
            </div>
            <span class="menu-arrow">→</span>
          </div>
          <div class="menu-item" @click="handleMenuClick('feedback')">
            <div class="menu-left">
              <span class="menu-icon">💬</span>
              <span class="menu-name">意见反馈</span>
            </div>
            <span class="menu-arrow">→</span>
          </div>
        </div>
      </div>

      <!-- 退出登录 -->
      <div class="logout-section">
        <div class="logout-btn" @click="handleLogout">
          <span>退出登录</span>
        </div>
      </div>

      <!-- 版本信息 -->
      <div class="version-info">
        <span>智慧乡村 v1.0.0</span>
      </div>
    </div>

    <!-- 底部导航 -->
    <TabBar :current="4" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { useElderlyStore } from '@/store/elderly'
import TabBar from '@/components/common/TabBar.vue'

/**
 * 个人中心页面
 */

const router = useRouter()
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

// 待审核村干部数量
const pendingApprovals = computed(() => {
  try {
    const pendingData = localStorage.getItem('pending_registrations')
    if (pendingData) {
      const registrations = JSON.parse(pendingData)
      return registrations.filter(r => r.status === 'pending').length
    }
    return 0
  } catch (error) {
    console.error('获取待审核数量失败:', error)
    return 0
  }
})

// 是否有审核权限（村支书和管理员）
const canApprove = computed(() => {
  if (!userStore.userInfo) return false
  const role = userStore.userRole
  const position = userStore.userInfo.position
  return role === 'admin' || position === '村支书'
})

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
  alert('上传头像功能开发中')
}

// 编辑资料
const handleEditProfile = () => {
  elderlyStore.vibrate('short')
  router.push('/profile/edit')
}

// 积分明细
const handlePointsHistory = () => {
  elderlyStore.vibrate('short')
  router.push('/profile/points')
}

// 设置
const handleSettings = () => {
  elderlyStore.vibrate('short')
  router.push('/profile/settings')
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
      quadrant: '四象限工作台',
      approvals: '村干部审核',
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
    household: '/profile/household',
    application: '/profile/application',
    certificate: '/services/documents',
    welfare: '/profile/welfare',
    quadrant: '/profile/quadrant',
    approvals: '/profile/approvals',
    elderly: '/profile/elderly',
    voice: '/profile/voice',
    notification: '/profile/notification',
    privacy: '/profile/privacy',
    help: '/profile/help',
    about: '/profile/about',
    feedback: '/profile/feedback'
  }

  // 特殊处理
  if (type === 'quadrant') {
    router.push('/profile/quadrant')
    return
  }

  if (type === 'approvals') {
    router.push('/profile/approvals')
    return
  }

  if (type === 'certificate') {
    router.push('/services/documents')
    return
  }

  const url = urlMap[type]
  if (url) {
    router.push(url)
  }
}

// 退出登录
const handleLogout = () => {
  elderlyStore.vibrate('long')

  if (confirm('确定要退出登录吗？')) {
    userStore.logout()
    alert('已退出登录')
    router.replace('/auth/login')
  }
}

// 页面加载
onMounted(() => {
  console.log('个人中心页面加载')
})
</script>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  background-color: #F7FAFC;
}

.custom-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: #FFFFFF;
  border-bottom: 1px solid #E2E8F0;
  padding-top: env(safe-area-inset-top, 0);

  .navbar-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 44px;
    padding: 0 16px;
  }

  .navbar-title {
    flex: 1;
    text-align: center;
    font-size: 18px;
    font-weight: 700;
    color: #1A202C;
  }

  .navbar-icon {
    font-size: 24px;
  }
}

.page-content {
  height: 100vh;
  padding-top: calc(44px + env(safe-area-inset-top, 0));
  padding-bottom: calc(50px + env(safe-area-inset-bottom, 0));
  overflow-y: auto;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px;
  padding: 20px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
}

.user-avatar {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  cursor: pointer;
}

.avatar-image {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  font-size: 32px;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-name {
  font-size: 20px;
  font-weight: 700;
  color: #FFFFFF;
}

.user-village {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.user-verified {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background-color: rgba(72, 187, 120, 0.2);
  border-radius: 8px;
  align-self: flex-start;
}

.verified-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #48BB78;
  color: #FFFFFF;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 700;
}

.verified-text {
  font-size: 12px;
  color: #FFFFFF;
}

.user-edit {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  cursor: pointer;
}

.edit-icon {
  font-size: 16px;
}

.points-card {
  display: flex;
  align-items: center;
  margin: 0 16px 16px;
  padding: 16px;
  background-color: #FFFFFF;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.points-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.points-icon {
  font-size: 24px;
}

.points-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.points-value {
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #F6E05E 0%, #ECC94B 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.points-label {
  font-size: 12px;
  color: #718096;
}

.points-arrow {
  font-size: 12px;
  color: #718096;
}

.points-divider {
  width: 1px;
  height: 30px;
  background-color: #E2E8F0;
}

.menu-section {
  margin: 0 16px 16px;
}

.menu-title {
  font-size: 14px;
  color: #718096;
  margin-bottom: 8px;
  padding-left: 4px;
}

.menu-list {
  background-color: #FFFFFF;
  border-radius: 8px;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #E2E8F0;
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }

  &:active {
    background-color: #EDF2F7;
  }
}

.menu-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-icon {
  font-size: 20px;
}

.menu-name {
  font-size: 16px;
  color: #1A202C;
}

.menu-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.menu-value {
  font-size: 14px;
  color: #718096;
}

.menu-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  background-color: #F56565;
  color: #FFFFFF;
  border-radius: 9px;
  font-size: 10px;
  text-align: center;
  line-height: 18px;
}

.menu-arrow {
  font-size: 12px;
  color: #718096;
}

.logout-section {
  margin: 16px;
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background-color: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  font-size: 16px;
  color: #F56565;
  cursor: pointer;

  &:active {
    background-color: #EDF2F7;
  }
}

.version-info {
  padding: 16px;
  text-align: center;
  font-size: 12px;
  color: #718096;
}

// 适老化模式
[data-elderly-mode="large"] {
  .user-name {
    font-size: 22px;
  }

  .menu-name {
    font-size: 18px;
  }
}

[data-elderly-mode="xl"] {
  .user-name {
    font-size: 26px;
  }

  .menu-name {
    font-size: 22px;
  }

  .points-value {
    font-size: 28px;
  }
}
</style>
