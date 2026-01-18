<template>
  <div class="admin-home">
    <!-- Loading Skeleton State -->
    <div v-if="loading" class="loading-container">
      <div class="skeleton-header"></div>
      <div class="skeleton-content">
        <div class="skeleton-user"></div>
        <div class="skeleton-stats"></div>
        <div class="skeleton-section"></div>
        <div class="skeleton-section"></div>
      </div>
    </div>

    <!-- Main Content -->
    <template v-else>
      <header class="header">
        <div class="header-title">管理后台</div>
        <div class="header-actions">
          <button class="settings-btn" aria-label="设置">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </header>

      <main class="main-content">
        <div class="user-info">
          <div class="avatar">
            <svg v-if="!userStore.user?.avatar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span v-else>{{ userStore.user?.avatar }}</span>
          </div>
          <div class="info">
            <div class="name">{{ userStore.user?.name || '管理员' }}</div>
            <div class="role">系统管理员</div>
          </div>
        </div>

        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-value">1,234</div>
            <div class="stat-label">用户总数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">56</div>
            <div class="stat-label">今日活跃</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">12</div>
            <div class="stat-label">待处理</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">系统管理</div>
          <div class="manage-grid">
            <div class="manage-item" @click="goTo('/user-management')">
              <svg class="manage-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span class="manage-text">用户管理</span>
            </div>
          <div class="manage-item" @click="goTo('/permission-management')">
            <svg class="manage-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span class="manage-text">权限管理</span>
          </div>
            <div class="manage-item" @click="goTo('/data-analytics')">
              <svg class="manage-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              <span class="manage-text">数据统计</span>
            </div>
            <div class="manage-item" @click="goTo('system-settings')">
              <svg class="manage-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2-2v-.09A1.65 1.65 0 0 0-1.82-.33 1.65 1.51V3a2 2 0 0 1-2-2 2-2z"/>
              </svg>
              <span class="manage-text">系统设置</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">快捷功能</div>
          <div class="feature-grid">
            <div class="feature-item" @click="goTo('/chat')">
              <svg class="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span class="feature-text">消息</span>
            </div>
            <div class="feature-item" @click="goTo('/ai-assistant')">
              <svg class="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="10" rx="2"/>
                <circle cx="12" cy="5" r="2"/>
                <path d="M12 7v4"/>
                <line x1="8" y1="16" x2="8" y2="16"/>
                <line x1="16" y1="16" x2="16" y2="16"/>
              </svg>
              <span class="feature-text">AI助手</span>
            </div>
            <div class="feature-item" @click="goTo('/profile')">
              <svg class="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span class="feature-text">个人中心</span>
            </div>
          </div>
        </div>
      </main>

      <nav class="bottom-nav">
        <div class="nav-item nav-item--active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
          </svg>
          <span class="nav-text">首页</span>
        </div>
        <div class="nav-item" @click="goTo('/village')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 21h18"/>
            <path d="M5 21V7l8-4 8 4v14"/>
            <path d="M9 10a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v11H9V10z"/>
          </svg>
          <span class="nav-text">村务</span>
        </div>
        <div class="nav-item" @click="goTo('/chat')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span class="nav-text">消息</span>
        </div>
        <div class="nav-item" @click="goTo('/profile')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span class="nav-text">我的</span>
        </div>
      </nav>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { useRouter } from 'vue-router'

defineOptions({
  name: 'AdminHome'
})

const userStore = useUserStore()
const router = useRouter()
const loading = ref(true)

// Simulate loading state
onMounted(() => {
  setTimeout(() => {
    loading.value = false
  }, 500)
})

const goTo = (path) => {
  router.push(path)
}
</script>

<style scoped>
/* Base Styles */
.admin-home {
  min-height: 100vh;
  min-height: 100dvh;
  background: #f5f5f5;
  padding-bottom: calc(70px + env(safe-area-inset-bottom));
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 16px calc(16px + env(safe-area-inset-left));
  background: linear-gradient(135deg, #fa8c16 0%, #d46b08 100%);
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(250, 140, 22, 0.2);
}

.header-title {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.4;
}

.settings-btn {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #fff;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.settings-btn:active {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(0.95);
}

.settings-btn svg {
  width: 24px;
  height: 24px;
}

/* Main Content */
.main-content {
  padding: 16px 16px 0 calc(16px + env(safe-area-inset-left));
}

/* User Info Card */
.user-info {
  display: flex;
  align-items: center;
  padding: 20px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease;
}

.avatar {
  width: 60px;
  height: 60px;
  min-width: 60px;
  min-height: 60px;
  background: linear-gradient(135deg, #fa8c16 0%, #d46b08 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  color: #fff;
  flex-shrink: 0;
}

.avatar svg {
  width: 32px;
  height: 32px;
}

.avatar span {
  font-size: 30px;
}

.info {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role {
  font-size: 14px;
  color: #fa8c16;
  margin-top: 6px;
  line-height: 1.3;
  font-weight: 500;
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  background: #fff;
  padding: 20px 12px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:active {
  transform: scale(0.97);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #fa8c16;
  line-height: 1.2;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

/* Section Styles */
.section {
  background: #fff;
  border-radius: 12px;
  padding: 20px 16px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
  margin-bottom: 16px;
  padding-left: 4px;
}

/* Manage Grid - Responsive: 4 cols → 2 cols on small screens */
.manage-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.manage-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 8px;
  min-height: 88px;
  background: #fafafa;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  overflow: hidden;
}

.manage-item::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(250, 140, 22, 0.1);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.3s ease, height 0.3s ease;
}

.manage-item:active::before {
  width: 200%;
  height: 200%;
}

.manage-item:active {
  background: #f0f0f0;
  transform: scale(0.96);
}

.manage-icon {
  width: 32px;
  height: 32px;
  color: #fa8c16;
  margin-bottom: 10px;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.manage-item:active .manage-icon {
  transform: scale(0.9);
}

.manage-text {
  font-size: 12px;
  color: #333;
  line-height: 1.3;
  text-align: center;
  font-weight: 500;
}

/* Feature Grid */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 12px;
  min-height: 96px;
  background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.feature-item:active {
  background: linear-gradient(135deg, #f0f0f0 0%, #ebebeb 100%);
  transform: scale(0.96);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  width: 36px;
  height: 36px;
  color: #fa8c16;
  margin-bottom: 10px;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.feature-item:active .feature-icon {
  transform: scale(0.9);
}

.feature-text {
  font-size: 13px;
  color: #333;
  line-height: 1.3;
  text-align: center;
  font-weight: 500;
}

/* Bottom Navigation */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: #fff;
  padding: 8px 0 calc(8px + env(safe-area-inset-bottom)) 0;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.08);
  z-index: 100;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  min-height: 60px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #999;
  position: relative;
  -webkit-tap-highlight-color: transparent;
}

.nav-item--active {
  color: #fa8c16;
}

.nav-item--active::after {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 3px;
  background: linear-gradient(90deg, #fa8c16 0%, #d46b08 100%);
  border-radius: 0 0 2px 2px;
}

.nav-item:active {
  background: rgba(250, 140, 22, 0.06);
  transform: scale(0.95);
}

.nav-item svg {
  width: 24px;
  height: 24px;
  margin-bottom: 4px;
  transition: transform 0.2s ease;
}

.nav-item:active svg {
  transform: scale(0.9);
}

.nav-text {
  font-size: 11px;
  color: #999;
  line-height: 1.3;
  font-weight: 500;
}

.nav-item--active .nav-text {
  color: #fa8c16;
}

/* Loading Skeleton */
.loading-container {
  padding: 16px;
}

.skeleton-header {
  width: 100%;
  height: 56px;
  background: linear-gradient(135deg, #fa8c16 0%, #d46b08 100%);
  border-radius: 0;
  margin: -16px -16px 16px -16px;
}

.skeleton-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-user {
  width: 100%;
  height: 96px;
  background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  border-radius: 12px;
  animation: shimmer 1.5s infinite;
}

.skeleton-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.skeleton-stats > div {
  height: 96px;
  background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  border-radius: 12px;
  animation: shimmer 1.5s infinite;
}

.skeleton-section {
  width: 100%;
  height: 140px;
  background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  border-radius: 12px;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Media Queries - Small Screens */
@media (max-width: 375px) {
  .header {
    padding: 14px 12px 14px calc(12px + env(safe-area-inset-left));
  }

  .header-title {
    font-size: 18px;
  }

  .main-content {
    padding: 14px 12px 0 calc(12px + env(safe-area-inset-left));
  }

  .user-info {
    padding: 16px;
    margin-bottom: 14px;
  }

  .avatar {
    width: 52px;
    height: 52px;
    min-width: 52px;
    min-height: 52px;
    margin-right: 14px;
  }

  .avatar svg {
    width: 28px;
    height: 28px;
  }

  .name {
    font-size: 16px;
  }

  .role {
    font-size: 13px;
  }

  .stats-row {
    gap: 10px;
    margin-bottom: 16px;
  }

  .stat-card {
    padding: 16px 8px;
  }

  .stat-value {
    font-size: 20px;
  }

  .stat-label {
    font-size: 11px;
  }

  .section {
    padding: 16px 12px;
    margin-bottom: 16px;
  }

  .section-title {
    font-size: 16px;
    margin-bottom: 14px;
  }

  /* Change from 4 columns to 2 columns on screens < 375px */
  .manage-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .manage-item {
    padding: 16px 12px;
    min-height: 80px;
  }

  .manage-icon {
    width: 28px;
    height: 28px;
    margin-bottom: 8px;
  }

  .manage-text {
    font-size: 12px;
  }

  .feature-grid {
    gap: 10px;
  }

  .feature-item {
    padding: 20px 10px;
    min-height: 88px;
  }

  .feature-icon {
    width: 32px;
    height: 32px;
    margin-bottom: 8px;
  }

  .feature-text {
    font-size: 12px;
  }

  .nav-text {
    font-size: 10px;
  }

  .skeleton-user {
    height: 88px;
  }

  .skeleton-stats > div {
    height: 88px;
  }

  .skeleton-section {
    height: 120px;
  }
}

/* Extra Small Screens (320px) */
@media (max-width: 320px) {
  .header {
    padding: 12px 10px 12px calc(10px + env(safe-area-inset-left));
  }

  .header-title {
    font-size: 17px;
  }

  .main-content {
    padding: 12px 10px 0 calc(10px + env(safe-area-inset-left));
  }

  .user-info {
    padding: 14px;
  }

  .avatar {
    width: 48px;
    height: 48px;
    min-width: 48px;
    min-height: 48px;
  }

  .avatar svg {
    width: 26px;
    height: 26px;
  }

  .name {
    font-size: 15px;
  }

  .role {
    font-size: 12px;
  }

  .stats-row {
    gap: 8px;
  }

  .stat-card {
    padding: 14px 6px;
  }

  .stat-value {
    font-size: 18px;
  }

  .section {
    padding: 14px 10px;
  }

  .section-title {
    font-size: 15px;
  }

  .manage-grid {
    gap: 8px;
  }

  .manage-item {
    padding: 14px 8px;
    min-height: 76px;
  }

  .manage-icon {
    width: 26px;
    height: 26px;
  }

  .manage-text {
    font-size: 11px;
  }

  .feature-item {
    padding: 18px 8px;
    min-height: 84px;
  }

  .feature-icon {
    width: 30px;
    height: 30px;
  }

  .feature-text {
    font-size: 11px;
  }

  .bottom-nav {
    padding: 6px 0 calc(6px + env(safe-area-inset-bottom)) 0;
  }

  .nav-item {
    min-height: 56px;
  }
}

/* Landscape Mode */
@media (orientation: landscape) and (max-height: 500px) {
  .admin-home {
    padding-bottom: 60px;
  }

  .user-info {
    padding: 12px 16px;
    margin-bottom: 12px;
  }

  .avatar {
    width: 48px;
    height: 48px;
    min-width: 48px;
    min-height: 48px;
  }

  .stats-row {
    gap: 8px;
    margin-bottom: 12px;
  }

  .stat-card {
    padding: 12px 8px;
  }

  .section {
    padding: 12px 16px;
    margin-bottom: 12px;
  }

  .manage-item,
  .feature-item {
    padding: 12px 8px;
    min-height: 72px;
  }
}

/* High DPI Displays */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .admin-home {
    -webkit-font-smoothing: antialiased;
  }
}
</style>
