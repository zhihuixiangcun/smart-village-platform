<template>
  <div class="villager-home" :class="{ 'elderly-mode': isElderlyMode }">
    <!-- 顶部Header -->
    <header class="header">
      <div class="header-content">
        <div class="header-title">智慧乡村</div>
        <div class="header-actions">
          <button class="notification-btn" @click="showNotifications" aria-label="通知">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <path d="M18 8A6 6 0 0 0-6 6v12a6 6 0 0 0 6-6 6"/>
              <circle cx="18" cy="8" r="3" fill="#fff" stroke="none"/>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 用户信息卡片 -->
      <div class="user-card">
        <div class="user-avatar">
          <div v-if="userStore.user?.avatar" class="avatar-image" :style="{ backgroundImage: `url(${userStore.user?.avatar})` }"></div>
          <div v-else class="avatar-placeholder">👨‍🌾</div>
        </div>
        <div class="user-info">
          <div class="user-name">{{ userStore.user?.name || '张大山' }}</div>
          <div class="user-village">{{ userStore.user?.villageName || '东村' }}</div>
          <div class="role-badge">村民</div>
        </div>
        <div class="user-points">
          <span class="points-label">积分</span>
          <span class="points-value">{{ userStore.user?.points || 126 }}</span>
        </div>
      </div>

      <!-- 快速操作区 -->
      <div class="section quick-actions">
        <div class="section-header">
          <div class="section-title">快速操作</div>
        </div>
        <div class="actions-grid">
          <div class="action-card" @click="goTo('/village/announcement')">
            <div class="action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm0 2h12v2H6v-2z"/>
                <path d="M12 7a1 1 0 1 1 1v10a1 1 0 0 1-1 1h4a1 1 0 0 1-1-1V8a1 1 0 0 1 1z"/>
              </svg>
            </div>
            <div class="action-content">
              <div class="action-title">村务公告</div>
              <div class="action-desc">查看最新通知</div>
            </div>
          </div>
          <div class="action-card" @click="goTo('/village/vote')">
            <div class="action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4m6 2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2"/>
                <path d="M12 16c5.523 0 10-4.477 10-10S6.477 0 12 4.477 0 10 10 10 0zm5-3a1 1 0 0 0-2 0h-2a1 1 0 0 0-2 0v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1 1v-2a1 1 0 0 0-1 1h-2"/>
              </svg>
            </div>
            <div class="action-content">
              <div class="action-title">村民投票</div>
              <div class="action-desc">参与民主决策</div>
            </div>
          </div>
          <div class="action-card" @click="goTo('/village/finance')">
            <div class="action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 1-3.5 3.5v14a3.5 3.5 0 0 1 3.5 3.5h-7a3.5 3.5 0 0 1 3.5-3.5v-14a3.5 3.5 0 0 1-3.5-3.5zM6 20h12v2H6v-2zm8-2H6v2h8v-2z"/>
                <path d="M12 7v-2h-2v2h4V7zm-8 6h-2v-2h2v4H8z"/>
              </svg>
            </div>
            <div class="action-content">
              <div class="action-title">村务财务</div>
              <div class="action-desc">财务信息公开</div>
            </div>
          </div>
          <div class="action-card" @click="goTo('/services/household-qr')">
            <div class="action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="none"/>
                <path d="M7 7h10M7 10H7M17 10H7M7 13h10M7 16H7" stroke-width="2"/>
                <path d="M9 9h6M9 12h6" stroke-width="2"/>
              </svg>
            </div>
            <div class="action-content">
              <div class="action-title">一户一码</div>
              <div class="action-desc">家庭信息管理</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 常用服务区 -->
      <div class="section services">
        <div class="section-header">
          <div class="section-title">常用服务</div>
          <div class="section-more" @click="goTo('/services')">
            更多
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 12 6"/>
            </svg>
          </div>
        </div>
        <div class="services-grid">
          <div class="service-card" @click="goTo('/services/documents')">
            <div class="service-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm0 2h12v2H6v-2z"/>
                <path d="M12 7a1 1 0 1 1 1v10a1 1 0 0 1-1 1h4a1 1 0 0 0 1 1v-2a1 1 0 0 0-1 1h-2"/>
              </svg>
            </div>
            <div class="service-info">
              <div class="service-title">我的证件</div>
              <div class="service-desc">身份证、户口本</div>
            </div>
          </div>
          <div class="service-card" @click="goTo('/agriculture')">
            <div class="service-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s-8-4-8-8 0 0 0-8 8v11.32a8 8 0 0 0 8 8v-8a8 8 0 0 0-8-8z"/>
                <path d="M12 6c-1.1 0-2 .9-2 2v1.72c2.11 0 3.7 1.89 5.28 4.72V13a2 2 0 0 0-2 2h4a2 2 0 0 0 2-2v-1.72c-.06-1.72-.06-1.72 2.28-3.89 4.72-4.72 4.72-2.28.1.89H10a2 2 0 0 0-2-2V8c0-1.1-.9-2-2-2.72z"/>
              </svg>
            </div>
            <div class="service-info">
              <div class="service-title">三农圈</div>
              <div class="service-desc">农业技术交流</div>
            </div>
          </div>
          <div class="service-card" @click="goTo('/life')">
            <div class="service-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3h2l3 3-3 3v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2 2v-10a2 2 0 0 0-2-2H5a2 2 0 0 0-2-2v-1h14a2 2 0 0 0 2 2h-2v1h-2z"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M20 8l-6 6"/>
                <path d="M17 5l-.815-.814a2 2 0 0 0-2.828 0L12 8.828V10.5c0-.062.062-.162 0-.162-.234l-2-2A2 2 0 0 0-.051-.102.015-.034L8.027 5.515A2 2 0 0 0-2.342-.234-.342-.342H4a2 2 0 0 0-2 2V5a2 2 0 0 0 2-2z"/>
              </svg>
            </div>
            <div class="service-info">
              <div class="service-title">生活服务</div>
              <div class="service-desc">便民服务</div>
            </div>
          </div>
          <div class="service-card" @click="goTo('/ai-assistant')">
            <div class="service-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16a2 2 0 0 0 2-2h-4a2 2 0 0 0-2 2v-4a2 2 0 0 0 2-2h4a2 2 0 0 0 2-2v4a2 2 0 0 0 2 2z"/>
                <circle cx="12" cy="12" r="3" fill="currentColor"/>
                <path d="M12 14a2 2 0 0 1 2-2V8a2 2 0 0 1-2-2h-4a2 2 0 0 1-2-2V6z"/>
                <path d="M8 10h8M8 13h8" stroke-width="2"/>
              </svg>
            </div>
            <div class="service-info">
              <div class="service-title">AI助手</div>
              <div class="service-desc">智能问答</div>
            </div>
          </div>
          <div class="service-card" @click="goTo('/chat')">
            <div class="service-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 0 4 0H9a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zm-2 0h4v-2h-4v2zM7 14c0-1.1-.9-2-2-2.72V4h-2v-1.72c.06-.062.062-.162 0-.162-.234l-2-2A2 2 0 0 0-.051-.102.015-.034L2.027 5.515A2 2 0 0 0-2.342-.234-.342-.342H4a2 2 0 0 0-2 2V5a2 2 0 0 0 2-2z"/>
                <path d="M20 9l-6 6"/>
              </svg>
            </div>
            <div class="service-info">
              <div class="service-title">消息</div>
              <div class="service-desc">聊天通讯</div>
            </div>
          </div>
          <div class="service-card" @click="goTo('/profile')">
            <div class="service-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 12c2.21 0 4 1.79 4 4 4 0 0 0 4-1.79-4-4-4H4c-2.21 0-4 1.79-4 4-4 0 0-0-4 1.79-4 4zM12 14c-2.21 0-4-1.79-4-4-4 0 0-0-4 1.79 4 4 4 4H4c-2.21 0-4 1.79-4 4-4 0 0-0 4 1.79 4 4z"/>
                <circle cx="12" cy="10" r="1.5" stroke-width="2"/>
                <path d="M12 16v4"/>
              </svg>
            </div>
            <div class="service-info">
              <div class="service-title">个人中心</div>
              <div class="service-desc">账户设置</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 最新公告区 -->
      <div class="section announcements">
        <div class="section-header">
          <div class="section-title">最新公告</div>
          <div class="section-more" @click="goTo('/village/announcement')">
            全部
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 12 6"/>
            </svg>
          </div>
        </div>
        <div class="announcement-list">
          <div v-for="(item, index) in announcements" :key="index" class="announcement-card" @click="goTo('/village/announcement')">
            <div class="announcement-header">
              <div class="announcement-tag">重要</div>
              <div class="announcement-date">{{ item.date }}</div>
            </div>
            <div class="announcement-title">{{ item.title }}</div>
            <div class="announcement-preview">{{ item.preview }}</div>
          </div>
        </div>
      </div>
    </main>
    
    <!-- 底部导航栏 -->
    <nav class="bottom-nav">
      <div class="nav-item nav-item--active" @click="goTo('/village')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 7l-9 9 3.41L21 17l-9 9-3.41"/>
        </svg>
        <span class="nav-text">村务</span>
      </div>
      <div class="nav-item" @click="goTo('/services')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm0 2h12v2H6v-2z"/>
          <path d="M12 7a1 1 0 1 1 1v10a1 1 0 0 1-1 1h4a1 1 0 0 1 1v-2a1 1 0 0 0-1 1h-2"/>
        </svg>
        <span class="nav-text">服务</span>
      </div>
      <div class="nav-item" @click="goTo('/life')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3h2l3 3-3 3v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-10a2 2 0 0 0-2-2H5a2 2 0 0 0-2-2v-1h14a2 2 0 0 0 2 2h-2v1h-2z"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="M20 8l-6 6"/>
          <path d="M17 5l-.815-.814a2 2 0 0 0-2.828 0L12 8.828V10.5c0-.062.062-.162 0-.162-.234l-2-2A2 2 0 0 0-.051-.102.015-.034L8.027 5.515A2 2 0 0 0-2.342-.234-.342-.342H4a2 2 0 0 0-2 2V5a2 2 0 0 0 2-2z"/>
        </svg>
        <span class="nav-text">生活</span>
      </div>
      <div class="nav-item" @click="goTo('/chat')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 0 4 0H9a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zm-2 0h4v-2h-4v2zM7 14c0-1.1-.9-2-2-2.72V4h-2v-1.72c.06-.062.062-.162 0-.162-.234l-2-2A2 2 0 0 0-.051-.102.015-.034L2.027 5.515A2 2 0 0 0-2.342-.234-.342-.342H4a2 2 0 0 0-2 2V5a2 2 0 0 0 2-2z"/>
          <path d="M20 9l-6 6"/>
        </svg>
        <span class="nav-text">消息</span>
      </div>
      <div class="nav-item" @click="goTo('/profile')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 12c2.21 0 4 1.79 4 4 0 0 0 4-1.79-4-4-4H4c-2.21 0-4 1.79-4 4-4 0 0-0-4 1.79-4 4zM12 14c-2.21 0-4-1.79-4-4-4 0 0-0-4 1.79-4 4 4 4H4c-2.21 0-4 1.79-4 4-4 0 0-0-4 1.79-4 4z"/>
          <circle cx="12" cy="10" r="1.5" stroke-width="2"/>
          <path d="M12 16v4"/>
        </svg>
        <span class="nav-text">我的</span>
      </div>
    </nav>


  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { useElderlyStore } from '@/store/elderly'

defineOptions({
  name: 'VillagerHome'
})

const router = useRouter()
const userStore = useUserStore()
const elderlyStore = useElderlyStore()

const isElderlyMode = computed(() => elderlyStore.isElderlyMode)

// 模拟公告数据
const announcements = [
  {
    date: '2024-01-15',
    title: '关于2024年春节村务安排的通知',
    preview: '各位村民请注意，春节期间村委会有以下安排...'
  },
  {
    date: '2024-01-14',
    title: '村务公开财务信息公示',
    preview: '本月村务收支明细如下，欢迎各位村民查阅...'
  },
  {
    date: '2024-01-13',
    title: '关于开展人居环境整治行动的通知',
    preview: '为改善我村人居环境，村委会决定...'
  }
]

const goTo = (path) => {
  router.push(path)
  
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

const showNotifications = () => {
  console.log('显示通知列表')
  // TODO: 实现通知弹窗
}

onMounted(() => {
  console.log('村民首页加载')
})
</script>

<style scoped>
.villager-home {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 80px;
}

/* 顶部Header */
.header {
  background: linear-gradient(135deg, #52c41a 0%, #38a169 100%);
  color: #fff;
  padding: 16px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 768px;
  margin: 0 auto;
}

.header-title {
  font-size: 20px;
  font-weight: 700;
}

.notification-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  border: none;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
}

.notification-btn:active {
  background: rgba(255, 255,  255, 0.3);
  transform: scale(0.95);
}

/* 主内容区 */
.main-content {
  padding: 20px 16px;
  max-width: 768px;
  margin: 0 auto;
}

.section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.section-more {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #52c41a;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 20px;
  transition: all 0.3s ease;
}

.section-more:hover {
  background: rgba(82, 196, 26, 0.08);
}

/* 用户信息卡片 */
.user-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 24px;
}

.user-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 16px;
  flex-shrink: 0;
}

.avatar-image {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #52c41a 0%, #38a169 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.user-village {
  font-size: 16px;
  color: #666;
  margin-bottom: 12px;
}

.role-badge {
  display: inline-block;
  padding: 4px 12px;
  background: #52c41a;
  color: #fff;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.user-points {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 12px;
}

.points-label {
  font-size: 14px;
  color: #666;
}

.points-value {
  font-size: 20px;
  font-weight: 700;
  color: #52c41a;
}

/* 快速操作区 */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.action-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  border-color: #52c41a;
}

.action-card:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.action-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 12px;
  color: #52c41a;
  flex-shrink: 0;
}

.action-icon svg {
  width: 28px;
  height: 28px;
}

.action-content {
  flex: 1;
}

.action-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.action-desc {
  font-size: 14px;
  color: #666;
}

/* 常用服务区 */
.services-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.service-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.service-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  border-color: #52c41a;
}

.service-card:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.service-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 12px;
  background: #f5f7fa;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #52c41a;
}

.service-icon svg {
  width: 32px;
  height: 32px;
}

.service-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.service-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.service-desc {
  font-size: 14px;
  color: #666;
}

/* 最新公告区 */
.announcement-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.announcement-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.announcement-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  border-color: #52c41a;
}

.announcement-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.announcement-tag {
  padding: 4px 12px;
  background: #fff3f82;
  color: #fff;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.announcement-date {
  font-size: 14px;
  color: #999;
}

.announcement-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.announcement-preview {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  }
  
  /* 底部导航栏 */
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #fff;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.12);
    display: flex;
    z-index: 100;
  }
  
  .nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 8px;
    border: none;
    background: transparent;
    cursor: pointer;
    transition: all 0.3s ease;
    color: #666;
  }
  
  .nav-item--active {
    color: #52c41a;
    background: rgba(82, 196, 26, 0.06);
  }
  
  .nav-item:active {
    background: rgba(82, 196, 26, 0.1);
    transform: scale(0.95);
  }
  
  .nav-item svg {
    width: 24px;
    height: 24px;
    margin-bottom: 4px;
  }
  
  .nav-text {
    font-size: 12px;
    font-weight: 500;
  }
  
  /* 适老化模式 */
  .elderly-mode {
    padding-bottom: 80px;
  }
  
  .elderly-mode .nav-text {
    font-size: 16px;
  }

.elderly-mode .header-title {
  font-size: 26px;
}

.elderly-mode .section-title {
  font-size: 22px;
}

.elderly-mode .action-title,
.elderly-mode .service-title {
  font-size: 20px;
}

.elderly-mode .action-desc,
.elderly-mode .service-desc {
  font-size: 18px;
}

.elderly-mode .announcement-title {
  font-size: 20px;
}

.elderly-mode .announcement-preview {
    font-size: 18px;
    line-height: 1.8;
  }
  
  .elderly-mode .user-name {
    font-size: 28px;
  }

.elderly-mode .user-village {
  font-size: 20px;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .main-content {
    padding: 16px 12px;
  }

  .user-card {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }

  .user-avatar {
    margin-right: 0;
    margin-bottom: 12px;
  }

  .user-points {
    width: 100%;
    justify-content: center;
  }

  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .services-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .action-card {
    padding: 16px;
    gap: 12px;
  }

  .action-icon {
    width: 40px;
    height: 40px;
  }

  .service-card {
    padding: 16px;
  }
}
</style>
