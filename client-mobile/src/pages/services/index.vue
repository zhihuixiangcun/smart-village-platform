<template>
  <div class="services-page">
    <!-- 自定义导航栏 -->
    <div class="custom-navbar">
      <div class="navbar-content">
        <div class="navbar-title">村民服务</div>
        <div class="navbar-icon" @click="handleNotification">
          <span class="icon">🔔</span>
          <div v-if="unreadCount > 0" class="badge">{{ unreadCount }}</div>
        </div>
      </div>
    </div>

    <!-- 页面内容 -->
    <scroll-view class="page-content" scroll-y>
      <!-- 用户卡片 -->
      <div class="user-card">
        <div class="user-avatar">👤</div>
        <div class="user-info">
          <div class="user-name">{{ userName }}</div>
          <div class="user-village">{{ villageName }}</div>
        </div>
        <div class="user-points">
          <span class="points-icon">⭐</span>
          <span class="points-text">{{ userPoints }}分</span>
        </div>
      </div>

      <!-- 一户一码 -->
      <div class="qr-section" @click="navigateTo('/services/household-qr')">
        <div class="qr-card">
          <div class="qr-left">
            <span class="qr-icon">🏠</span>
            <div class="qr-info">
              <div class="qr-title">一户一码</div>
              <div class="qr-desc">扫码查看/更新家庭信息</div>
            </div>
          </div>
          <div class="qr-arrow">→</div>
        </div>
      </div>

      <!-- 快捷服务 -->
      <div class="quick-services">
        <div class="section-title">快捷服务</div>
        <div class="service-grid">
          <div
            v-for="service in quickServices"
            :key="service.id"
            class="service-item"
            @click="handleServiceClick(service)"
          >
            <div class="service-icon">{{ service.icon }}</div>
            <div class="service-name">{{ service.name }}</div>
            <div v-if="service.badge" class="service-badge">{{ service.badge }}</div>
          </div>
        </div>
      </div>

      <!-- 我的办事 -->
      <div class="my-applications">
        <div class="section-header">
          <span class="section-title">我的办事</span>
          <span class="section-more" @click="handleViewAll">全部 ></span>
        </div>

        <div class="application-list">
          <div
            v-for="app in applications"
            :key="app.id"
            class="application-item"
            @click="handleApplicationClick(app)"
          >
            <div class="app-icon">{{ app.icon }}</div>
            <div class="app-content">
              <div class="app-title">{{ app.title }}</div>
              <div class="app-meta">
                <span class="meta-item">{{ app.date }}</span>
                <div :class="['app-status', `status-${app.status}`]">
                  {{ app.statusText }}
                </div>
              </div>
            </div>
            <div class="app-arrow">→</div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="applications.length === 0" class="empty-state">
          <span class="empty-icon">📋</span>
          <span class="empty-text">暂无办事记录</span>
        </div>
      </div>

      <!-- 政策计算器 -->
      <div class="calculator-section">
        <div class="section-title">政策计算器</div>
        <div class="calculator-grid">
          <div
            v-for="calc in calculators"
            :key="calc.id"
            class="calculator-item"
            @click="handleCalculatorClick(calc)"
          >
            <span class="calculator-icon">{{ calc.icon }}</span>
            <span class="calculator-name">{{ calc.name }}</span>
          </div>
        </div>
      </div>
    </scroll-view>

    <!-- 底部导航 -->
    <TabBar :current="1" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { useElderlyStore } from '@/store/elderly'
import TabBar from '@/components/common/TabBar.vue'

/**
 * 村民服务首页
 */

const router = useRouter()
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
  { id: 1, icon: '🤖', name: 'AI助手', badge: null },
  { id: 2, icon: '📝', name: '在线办事', badge: null },
  { id: 3, icon: '🪪', name: '证件办理', badge: null },
  { id: 4, icon: '💰', name: '福利申请', badge: '2' },
  { id: 5, icon: '🏥', name: '医保社保', badge: null },
  { id: 6, icon: '🌾', name: '农业补贴', badge: null },
  { id: 7, icon: '🎓', name: '教育资助', badge: null },
  { id: 8, icon: '🏘️', name: '住房保障', badge: null },
  { id: 9, icon: '📞', name: '便民电话', badge: null },
  { id: 10, icon: '👛', name: '我的证件', badge: null },
  { id: 11, icon: '📊', name: '资料收集', badge: null, adminOnly: true },
  { id: 12, icon: '📢', name: '发布公告', badge: null, adminOnly: true }
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
  router.push('/profile/notification')
}

// 服务点击
const handleServiceClick = (service) => {
  elderlyStore.vibrate('short')

  // 语音播报（适老化模式）
  if (elderlyStore.isElderlyMode) {
    elderlyStore.speak(service.name)
  }

  // 根据服务类型跳转到对应页面
  switch (service.id) {
    case 1: // AI助手
      router.push('/ai-assistant')
      break
    case 10: // 我的证件
      router.push('/services/documents')
      break
    case 11: // 资料收集
      // 检查是否为村干部
      if (service.adminOnly && !isAdmin()) {
        alert('此功能仅限村干部使用')
        return
      }
      router.push('/services/data-collection')
      break
    case 12: // 发布公告
      // 检查是否为村干部
      if (service.adminOnly && !isAdmin()) {
        alert('此功能仅限村干部使用')
        return
      }
      router.push('/services/publish')
      break
    default:
      console.log('点击服务:', service.name)
      // TODO: 添加其他服务的跳转
      break
  }
}

// 检查是否为管理员
const isAdmin = () => {
  const role = userStore.userInfo?.role
  return role === 'admin' || role === 'cadre' || role === 'official'
}

// 办事记录点击
const handleApplicationClick = (app) => {
  elderlyStore.vibrate('short')
  console.log('点击办事记录:', app.title)
  // TODO: 跳转到详情页
}

// 查看全部
const handleViewAll = () => {
  elderlyStore.vibrate('short')
  console.log('查看全部办事记录')
  // TODO: 跳转到列表页
}

// 计算器点击
const handleCalculatorClick = (calc) => {
  elderlyStore.vibrate('short')
  console.log('点击计算器:', calc.name)
  // TODO: 跳转到计算器页面
}

// 页面跳转
const navigateTo = (url) => {
  router.push(url)
}

// 页面加载
onMounted(() => {
  console.log('村民服务页面加载')
})
</script>

<style lang="scss" scoped>
.services-page {
  min-height: 100vh;
  background-color: #F7FAFC;
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

.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #4299E1 0%, #3182CE 100%);
  border-radius: 12px;

  .user-avatar {
    width: 60px;
    height: 60px;
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

  .user-points {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 12px;
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 8px;
  }

  .points-icon {
    font-size: 16px;
  }

  .points-text {
    font-size: 14px;
    font-weight: 700;
    color: #FFFFFF;
  }
}

.qr-section {
  padding: 0 16px 16px;
}

.qr-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: linear-gradient(135deg, #48BB78 0%, #38A169 100%);
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(72, 187, 120, 0.3);
  cursor: pointer;

  &:active {
    transform: scale(0.98);
  }
}

.qr-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.qr-icon {
  font-size: 32px;
}

.qr-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.qr-title {
  font-size: 18px;
  font-weight: 700;
  color: #FFFFFF;
}

.qr-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.qr-arrow {
  font-size: 24px;
  color: #FFFFFF;
}

.quick-services {
  padding: 0 16px 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #1A202C;
  margin-bottom: 12px;
}

.service-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.service-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background-color: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
  cursor: pointer;

  &:active {
    transform: scale(0.95);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }
}

.service-icon {
  font-size: 28px;
}

.service-name {
  font-size: 12px;
  color: #1A202C;
  text-align: center;
}

.service-badge {
  position: absolute;
  top: 6px;
  right: 6px;
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

.my-applications {
  padding: 0 16px 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-more {
  font-size: 14px;
  color: #718096;
  cursor: pointer;
}

.application-list {
  .application-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    margin-bottom: 8px;
    background-color: #FFFFFF;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    cursor: pointer;

    &:active {
      background-color: #EDF2F7;
    }
  }

  .app-icon {
    font-size: 28px;
    flex-shrink: 0;
  }

  .app-content {
    flex: 1;
    min-width: 0;
  }

  .app-title {
    font-size: 16px;
    font-weight: 600;
    color: #1A202C;
    margin-bottom: 4px;
  }

  .app-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .meta-item {
    font-size: 12px;
    color: #718096;
  }

  .app-status {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;

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
    font-size: 16px;
    color: #718096;
    flex-shrink: 0;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  gap: 8px;
}

.empty-icon {
  font-size: 48px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
  color: #718096;
}

.calculator-section {
  padding: 0 16px 16px;
}

.calculator-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.calculator-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px;
  background: linear-gradient(135deg, #F6E05E 0%, #ECC94B 100%);
  border-radius: 8px;
  cursor: pointer;

  &:active {
    transform: scale(0.98);
  }
}

.calculator-icon {
  font-size: 32px;
}

.calculator-name {
  font-size: 16px;
  font-weight: 700;
  color: #1A202C;
}

// 适老化模式
[data-elderly-mode="large"] {
  .service-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .service-name {
    font-size: 14px;
  }
}

[data-elderly-mode="xl"] {
  .service-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .service-name {
    font-size: 16px;
  }

  .calculator-name {
    font-size: 20px;
  }
}
</style>
