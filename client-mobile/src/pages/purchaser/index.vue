<template>
  <div class="purchaser-home">
    <header class="header">
      <div class="header-left">
        <span class="back-btn" @click="goBack">←</span>
      </div>
      <h1 class="header-title">采购商工作台</h1>
      <div class="header-right">
        <span class="notification-btn">🔔</span>
      </div>
    </header>

    <main class="main-content">
      <div class="user-info">
        <div class="avatar">{{ userStore.user?.avatar || '🏪' }}</div>
        <div class="info">
          <div class="name">{{ userStore.user?.name || '采购商' }}</div>
          <div class="role">采购商</div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">12</div>
          <div class="stat-label">待处理订单</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">8</div>
          <div class="stat-label">今日采购</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">¥5,680</div>
          <div class="stat-label">今日支出</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">5</div>
          <div class="stat-label">供应商</div>
        </div>
      </div>

      <div class="menu-grid">
        <div class="menu-item" @click="goTo('/purchaser/orders')">
          <span class="menu-icon">📦</span>
          <span class="menu-text">订单管理</span>
        </div>
        <div class="menu-item" @click="goTo('/purchaser/products')">
          <span class="menu-icon">🥬</span>
          <span class="menu-text">产品采购</span>
        </div>
        <div class="menu-item" @click="goTo('/purchaser/suppliers')">
          <span class="menu-icon">🚜</span>
          <span class="menu-text">供应商</span>
        </div>
        <div class="menu-item" @click="goTo('/purchaser/history')">
          <span class="menu-icon">📋</span>
          <span class="menu-text">采购记录</span>
        </div>
        <div class="menu-item" @click="goTo('/chat')">
          <span class="menu-icon">💬</span>
          <span class="menu-text">消息</span>
        </div>
        <div class="menu-item" @click="goTo('/profile')">
          <span class="menu-icon">👤</span>
          <span class="menu-text">我的</span>
        </div>
       </div>
    </main>
    
    <!-- 底部导航栏 -->
    <nav class="bottom-nav">
      <div class="nav-item nav-item--active">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12l2 2 4-4m6 2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2z"/>
        </svg>
        <span class="nav-text">工作台</span>
      </div>
      <div class="nav-item" @click="goTo('/purchaser/orders')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 7l-9 9 3.41L21 17l-9 9-3.41"/>
        </svg>
        <span class="nav-text">订单</span>
      </div>
      <div class="nav-item" @click="goTo('/purchaser/suppliers')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span class="nav-text">供应商</span>
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
import { useUserStore } from '@/store/user'
import { useRouter } from 'vue-router'

defineOptions({
  name: 'PurchaserHome'
})

const userStore = useUserStore()
const router = useRouter()

const goBack = () => {
  router.back()
}

const goTo = (path) => {
  router.push(path)
}
</script>

<style scoped>
.purchaser-home {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 80px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: linear-gradient(135deg, #eb2f96 0%, #f53192 100%);
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left, .header-right {
  width: 40px;
}

.back-btn, .notification-btn {
  font-size: 20px;
  cursor: pointer;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
}

.main-content {
  padding: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 16px;
}

.avatar {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #eb2f96 0%, #f53192 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  margin-right: 16px;
}

.info {
  flex: 1;
}

.name {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.role {
  font-size: 14px;
  color: #eb2f96;
  margin-top: 4px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: #fff;
  padding: 16px;
  border-radius: 12px;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #eb2f96;
}

.stat-label {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.menu-item {
  background: #fff;
  padding: 20px 12px;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s;
}

.menu-item:active {
  transform: scale(0.95);
}

.menu-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 8px;
}

.menu-text {
    font-size: 12px;
    color: #333;
  }
  
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    background: #fff;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.12);
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
    color: #eb2f96;
    background: rgba(235, 47, 150, 0.06);
  }
  
  .nav-item:active {
    background: rgba(235, 47, 150, 0.1);
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
</style>
