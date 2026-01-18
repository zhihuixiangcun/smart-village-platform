<template>
  <div class="cadre-home" :class="{ 'elderly-mode': isElderlyMode }">
    <!-- 顶部Header -->
    <header class="header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="header-title">村干部工作台</h1>
          <div class="header-subtitle">{{ userStore.user?.villageName || '智慧乡村平台' }}</div>
        </div>
        <div class="header-actions">
          <button class="notification-btn" @click="showNotifications" aria-label="通知">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              <circle cx="18" cy="8" r="3" fill="currentColor" stroke="none" class="notification-dot"/>
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
          <div v-else class="avatar-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="40" height="40">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
        </div>
        <div class="user-info">
          <div class="user-name">{{ userStore.user?.name || '村干部' }}</div>
          <div class="user-role">{{ userStore.user?.role || '村干部' }}</div>
        </div>
        <div class="work-stats">
          <div class="stat-item">
            <span class="stat-value">{{ pendingTasks }}</span>
            <span class="stat-label">待办</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">{{ completedTasks }}</span>
            <span class="stat-label">已处理</span>
          </div>
        </div>
      </div>

      <!-- 快速工作区 -->
      <div class="section quick-actions">
        <div class="section-header">
          <h2 class="section-title">快速操作</h2>
        </div>
        <div class="actions-grid">
          <div class="action-card" @click="goTo('/services/publish')">
            <div class="action-icon" style="--icon-color: #1890ff;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <div class="action-content">
              <div class="action-title">发布公告</div>
              <div class="action-desc">发布村务通知</div>
            </div>
          </div>
          <div class="action-card" @click="goTo('/services/data-collection')">
            <div class="action-icon" style="--icon-color: #52c41a;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div class="action-content">
              <div class="action-title">资料收集</div>
              <div class="action-desc">村民信息采集</div>
            </div>
          </div>
          <div class="action-card" @click="goTo('/profile/approvals')">
            <div class="action-icon" style="--icon-color: #faad14;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div class="action-content">
              <div class="action-title">审核中心</div>
              <div class="action-desc">待办事项审核</div>
            </div>
          </div>
          <div class="action-card" @click="goTo('/profile/quadrant')">
            <div class="action-icon" style="--icon-color: #722ed1;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            </div>
            <div class="action-content">
              <div class="action-title">四象限</div>
              <div class="action-desc">工作台管理</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 待办事项区 -->
      <div class="section todo-section">
        <div class="section-header">
          <h2 class="section-title">待办事项</h2>
          <div class="section-more" @click="goTo('/profile/approvals')">
            全部
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
        <div class="todo-list">
          <div v-for="(todo, index) in todoList" :key="index" class="todo-card" @click="handleTodoClick(todo)">
            <div class="todo-checkbox">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
            <div class="todo-content">
              <div class="todo-title">{{ todo.title }}</div>
              <div class="todo-meta">
                <span class="todo-applicant">{{ todo.applicant }}</span>
                <span class="todo-time">{{ todo.time }}</span>
              </div>
            </div>
            <div class="todo-tag" :class="`todo-tag--${todo.priority}`">
              {{ todo.priority === 'high' ? '紧急' : todo.priority === 'medium' ? '重要' : '普通' }}
            </div>
          </div>
        </div>
      </div>

      <!-- 快捷功能区 -->
      <div class="section features">
        <div class="section-header">
          <h2 class="section-title">快捷功能</h2>
        </div>
        <div class="features-grid">
          <div class="feature-item" @click="goTo('/village')">
            <div class="feature-icon" style="--icon-color: #1890ff;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div class="feature-info">
              <div class="feature-title">村务管理</div>
              <div class="feature-desc">村务信息管理</div>
            </div>
          </div>
          <div class="feature-item" @click="goTo('/chat')">
            <div class="feature-icon" style="--icon-color: #52c41a;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div class="feature-info">
              <div class="feature-title">消息通知</div>
              <div class="feature-desc">聊天与通知</div>
            </div>
          </div>
          <div class="feature-item" @click="goTo('/ai-assistant')">
            <div class="feature-icon" style="--icon-color: #722ed1;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
            </div>
            <div class="feature-info">
              <div class="feature-title">AI助手</div>
              <div class="feature-desc">智能问答</div>
            </div>
          </div>
          <div class="feature-item" @click="goTo('/profile')">
            <div class="feature-icon" style="--icon-color: #faad14;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div class="feature-info">
              <div class="feature-title">个人中心</div>
              <div class="feature-desc">账户设置</div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 底部导航栏 -->
    <nav class="bottom-nav">
      <div class="nav-item nav-item--active" @click="goTo('/home/cadre')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
        <span class="nav-text">工作台</span>
      </div>
      <div class="nav-item" @click="goTo('/village')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
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
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { useElderlyStore } from '@/store/elderly'

defineOptions({
  name: 'CadreHome'
})

const router = useRouter()
const userStore = useUserStore()
const elderlyStore = useElderlyStore()

const isElderlyMode = computed(() => elderlyStore.isElderlyMode)

// 待办和已完成任务数
const pendingTasks = ref(5)
const completedTasks = ref(12)

// 待办事项列表
const todoList = ref([
  {
    title: '审批村民申请',
    applicant: '张三',
    time: '2024-01-15',
    priority: 'high'
  },
  {
    title: '审核补贴资格',
    applicant: '李四',
    time: '2024-01-14',
    priority: 'medium'
  },
  {
    title: '处理投诉反馈',
    applicant: '王五',
    time: '2024-01-13',
    priority: 'low'
  }
])

const goTo = (path) => {
  router.push(path)

  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

const handleTodoClick = (todo) => {
  console.log('点击待办事项:', todo)
  // TODO: 跳转到详情页或打开弹窗
}

const showNotifications = () => {
  console.log('显示通知列表')
  // TODO: 实现通知弹窗
}

onMounted(() => {
  console.log('村干部首页加载')
})
</script>

<style scoped>
.cadre-home {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0f2f5 0%, #ffffff 100%);
  padding-bottom: 80px;
}

/* ========== 顶部Header ========== */
.header {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  color: #fff;
  padding: 16px 20px 20px;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  flex: 1;
}

.header-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px 0;
  color: #fff;
}

.header-subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
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

.notification-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.notification-btn:active {
  transform: scale(0.95);
}

.notification-dot {
  fill: #ff4d4f;
}

/* ========== 主内容区 ========== */
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
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.section-more {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #1890ff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 20px;
  transition: all 0.2s ease;
}

.section-more:hover {
  background: rgba(24, 144, 255, 0.08);
}

.section-more:active {
  transform: scale(0.95);
}

/* ========== 用户信息卡片 ========== */
.user-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
}

.user-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
}

.avatar-image {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.user-role {
  font-size: 14px;
  color: #1890ff;
  font-weight: 600;
}

.work-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-left: 16px;
  border-left: 1px solid #e8e8e8;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #1890ff;
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: #e8e8e8;
}

/* ========== 快速操作区 ========== */
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
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
  border-color: var(--icon-color);
}

.action-card:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.action-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(24, 144, 255, 0.08);
  border-radius: 14px;
  color: var(--icon-color);
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.action-card:hover .action-icon {
  background: var(--icon-color);
  color: #fff;
}

.action-icon svg {
  width: 28px;
  height: 28px;
}

.action-content {
  flex: 1;
  min-width: 0;
}

.action-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.action-desc {
  font-size: 13px;
  color: #8c8c8c;
}

/* ========== 待办事项区 ========== */
.todo-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.todo-card {
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.todo-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #1890ff;
}

.todo-card:active {
  transform: scale(0.98);
}

.todo-checkbox {
  width: 24px;
  height: 24px;
  color: #d9d9d9;
  flex-shrink: 0;
}

.todo-content {
  flex: 1;
  min-width: 0;
}

.todo-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 6px;
}

.todo-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.todo-applicant {
  font-size: 13px;
  color: #595959;
  font-weight: 500;
}

.todo-time {
  font-size: 12px;
  color: #8c8c8c;
}

.todo-tag {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.todo-tag--high {
  background: #fff1f0;
  color: #ff4d4f;
}

.todo-tag--medium {
  background: #fffbe6;
  color: #faad14;
}

.todo-tag--low {
  background: #f6ffed;
  color: #52c41a;
}

/* ========== 快捷功能区 ========== */
.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.feature-item {
  background: #fff;
  border-radius: 14px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.feature-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--icon-color);
}

.feature-item:active {
  transform: translateY(0);
}

.feature-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(24, 144, 255, 0.08);
  border-radius: 12px;
  color: var(--icon-color);
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.feature-item:hover .feature-icon {
  background: var(--icon-color);
  color: #fff;
}

.feature-icon svg {
  width: 24px;
  height: 24px;
}

.feature-info {
  flex: 1;
  min-width: 0;
}

.feature-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 2px;
}

.feature-desc {
  font-size: 12px;
  color: #8c8c8c;
}

/* ========== 底部导航栏 ========== */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom);
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #8c8c8c;
}

.nav-item--active {
  color: #1890ff;
}

.nav-item--active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 3px;
  background: #1890ff;
  border-radius: 0 0 3px 3px;
}

.nav-item:active {
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

/* ========== 适老化模式 ========== */
.elderly-mode {
  padding-bottom: 90px;
}

.elderly-mode .header-title {
  font-size: 26px;
}

.elderly-mode .header-subtitle {
  font-size: 16px;
}

.elderly-mode .section-title {
  font-size: 22px;
}

.elderly-mode .action-title,
.elderly-mode .feature-title,
.elderly-mode .todo-title {
  font-size: 20px;
}

.elderly-mode .action-desc,
.elderly-mode .feature-desc {
  font-size: 18px;
}

.elderly-mode .todo-time,
.elderly-mode .feature-desc {
  font-size: 16px;
}

.elderly-mode .nav-text {
  font-size: 16px;
}

.elderly-mode .user-name {
  font-size: 26px;
}

.elderly-mode .stat-value {
  font-size: 28px;
}

.elderly-mode .stat-label {
  font-size: 16px;
}

.elderly-mode .user-card {
  padding: 28px;
}

.elderly-mode .action-card,
.elderly-mode .feature-item,
.elderly-mode .todo-card {
  padding: 22px;
}

/* ========== 响应式设计 ========== */
@media (max-width: 640px) {
  .main-content {
    padding: 16px 12px;
  }

  .user-card {
    flex-direction: column;
    text-align: center;
    padding: 20px;
  }

  .work-stats {
    padding-left: 0;
    border-left: none;
    border-top: 1px solid #e8e8e8;
    padding-top: 16px;
    width: 100%;
    justify-content: space-around;
  }

  .stat-divider {
    display: block;
    width: 1px;
    height: 32px;
  }
}
</style>
