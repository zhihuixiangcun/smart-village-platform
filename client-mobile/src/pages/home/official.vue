<template>
  <div class="official-home" :class="{ 'elderly-mode': isElderlyMode }">
    <!-- 顶部Header -->
    <header class="header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="header-title">乡镇工作台</h1>
          <div class="header-subtitle">{{ userStore.user?.deptName || '镇人民政府' }}</div>
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
              <path d="M3 21v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8"/>
              <path d="M5 11l7-7 7 7"/>
              <path d="M12 4v8"/>
            </svg>
          </div>
        </div>
        <div class="user-info">
          <div class="user-name">{{ userStore.user?.name || '乡镇干部' }}</div>
          <div class="user-role">{{ userStore.user?.position || '办公室主任' }}</div>
        </div>
        <div class="dept-badge">{{ userStore.user?.deptName || '政府办公室' }}</div>
      </div>

      <!-- 统计卡片行 -->
      <div class="stats-row">
        <div class="stat-card" @click="goToApprovals">
          <div class="stat-icon" style="--stat-color: #ff4d4f;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <circle cx="12" cy="14" r="3"/>
              <path d="M12 11v6"/>
            </svg>
          </div>
          <div class="stat-value">{{ pendingApprovals }}</div>
          <div class="stat-label">待审批</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="--stat-color: #52c41a;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22 11.08 22 11.08 12 21.08 2 11.08"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="stat-value">{{ todayProcessed }}</div>
          <div class="stat-label">今日处理</div>
        </div>
        <div class="stat-card" @click="goToVillages">
          <div class="stat-icon" style="--stat-color: #1890ff;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div class="stat-value">{{ villageCount }}</div>
          <div class="stat-label">管辖村</div>
        </div>
      </div>

      <!-- 待办审批区 -->
      <div class="section approval-section">
        <div class="section-header">
          <h2 class="section-title">待办审批</h2>
          <div class="section-more" @click="goToApprovals">
            全部
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
        <div class="approval-list">
          <div v-for="(item, index) in approvalList" :key="index" class="approval-card" @click="handleApproval(item)">
            <div class="approval-icon" :style="`--icon-color: ${item.color}`">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path v-if="item.type === 'fund'" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <path v-if="item.type === 'fund'" d="M12 18v-6l-2 2-2-2"/>
                <path v-if="item.type === 'fund'" d="M12 2v6"/>
                <path v-if="item.type === 'project'" d="M2 22l10-10 10 10"/>
                <path v-if="item.type === 'project'" d="M12 2v20"/>
                <rect v-if="item.type === 'document'" x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line v-if="item.type === 'document'" x1="9" y1="9" x2="15" y2="9"/>
                <line v-if="item.type === 'document'" x1="9" y1="13" x2="15" y2="13"/>
                <line v-if="item.type === 'document'" x1="9" y1="17" x2="15" y2="17"/>
              </svg>
            </div>
            <div class="approval-content">
              <div class="approval-title">{{ item.title }}</div>
              <div class="approval-meta">
                <span class="approval-village">{{ item.village }}</span>
                <span class="approval-applicant">{{ item.applicant }}</span>
                <span class="approval-date">{{ item.date }}</span>
              </div>
            </div>
            <button class="approval-btn" @click.stop="quickApprove(item)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              审批
            </button>
          </div>
        </div>
      </div>

      <!-- 快捷功能区 -->
      <div class="section features">
        <div class="section-header">
          <h2 class="section-title">快捷功能</h2>
        </div>
        <div class="features-grid">
          <div class="feature-item" @click="goTo('/services')">
            <div class="feature-icon" style="--icon-color: #1890ff;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div class="feature-info">
              <div class="feature-title">服务管理</div>
              <div class="feature-desc">便民服务</div>
            </div>
          </div>
          <div class="feature-item" @click="goTo('/village')">
            <div class="feature-icon" style="--icon-color: #52c41a;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div class="feature-info">
              <div class="feature-title">村务管理</div>
              <div class="feature-desc">村级事务</div>
            </div>
          </div>
          <div class="feature-item" @click="goTo('/chat')">
            <div class="feature-icon" style="--icon-color: #722ed1;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div class="feature-info">
              <div class="feature-title">消息通知</div>
              <div class="feature-desc">通知公告</div>
            </div>
          </div>
          <div class="feature-item" @click="goTo('/ai-assistant')">
            <div class="feature-icon" style="--icon-color: #faad14;">
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
        </div>
      </div>

      <!-- 数据概览区 -->
      <div class="section data-overview">
        <div class="section-header">
          <h2 class="section-title">数据概览</h2>
        </div>
        <div class="data-grid">
          <div class="data-item">
            <div class="data-icon" style="--icon-color: #1890ff;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div class="data-content">
              <div class="data-value">12,458</div>
              <div class="data-label">总人口</div>
            </div>
          </div>
          <div class="data-item">
            <div class="data-icon" style="--icon-color: #52c41a;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </div>
            <div class="data-content">
              <div class="data-value">856</div>
              <div class="data-label">本月办件</div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 底部导航栏 -->
    <nav class="bottom-nav">
      <div class="nav-item nav-item--active" @click="goTo('/home/official')">
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
  name: 'OfficialHome'
})

const router = useRouter()
const userStore = useUserStore()
const elderlyStore = useElderlyStore()

const isElderlyMode = computed(() => elderlyStore.isElderlyMode)

// 统计数据
const pendingApprovals = ref(15)
const todayProcessed = ref(28)
const villageCount = ref(156)

// 审批列表
const approvalList = ref([
  {
    type: 'fund',
    title: '村级经费申请 - 东村',
    village: '东村',
    applicant: '李村长',
    date: '2024-01-15',
    color: '#ff4d4f'
  },
  {
    type: 'project',
    title: '村路修建项目审批 - 西村',
    village: '西村',
    applicant: '王主任',
    date: '2024-01-14',
    color: '#faad14'
  },
  {
    type: 'document',
    title: '人事任免报告 - 南村',
    village: '南村',
    applicant: '张书记',
    date: '2024-01-13',
    color: '#1890ff'
  }
])

const goTo = (path) => {
  router.push(path)

  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

const goToApprovals = () => {
  console.log('跳转到审批中心')
  // TODO: 跳转到审批中心页面
}

const goToVillages = () => {
  console.log('跳转到管辖村列表')
  // TODO: 跳转到管辖村列表
}

const handleApproval = (item) => {
  console.log('查看审批详情:', item)
  // TODO: 打开审批详情弹窗
}

const quickApprove = (item) => {
  console.log('快速审批:', item)
  // TODO: 快速审批操作
}

const showNotifications = () => {
  console.log('显示通知列表')
  // TODO: 实现通知弹窗
}

onMounted(() => {
  console.log('乡镇干部首页加载')
})
</script>

<style scoped>
.official-home {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0f2f5 0%, #ffffff 100%);
  padding-bottom: 80px;
}

/* ========== 顶部Header ========== */
.header {
  background: linear-gradient(135deg, #722ed1 0%, #531dab 100%);
  color: #fff;
  padding: 16px 20px 20px;
  box-shadow: 0 4px 12px rgba(114, 46, 209, 0.15);
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
  color: #722ed1;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 20px;
  transition: all 0.2s ease;
}

.section-more:hover {
  background: rgba(114, 46, 209, 0.08);
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
  background: linear-gradient(135deg, #722ed1 0%, #531dab 100%);
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
  color: #722ed1;
  font-weight: 600;
}

.dept-badge {
  padding: 6px 14px;
  background: linear-gradient(135deg, #722ed1 0%, #531dab 100%);
  color: #fff;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

/* ========== 统计卡片行 ========== */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 14px;
  padding: 20px 16px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
  border-color: var(--stat-color);
}

.stat-card:active {
  transform: translateY(-2px);
}

.stat-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  background: rgba(114, 46, 209, 0.08);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--stat-color);
  transition: all 0.3s ease;
}

.stat-card:hover .stat-icon {
  background: var(--stat-color);
  color: #fff;
}

.stat-icon svg {
  width: 24px;
  height: 24px;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.2;
  margin-bottom: 6px;
}

.stat-label {
  font-size: 13px;
  color: #8c8c8c;
}

/* ========== 审批列表 ========== */
.approval-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.approval-card {
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

.approval-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #722ed1;
}

.approval-card:active {
  transform: scale(0.98);
}

.approval-icon {
  width: 44px;
  height: 44px;
  background: rgba(114, 46, 209, 0.08);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--icon-color);
  flex-shrink: 0;
}

.approval-icon svg {
  width: 22px;
  height: 22px;
}

.approval-content {
  flex: 1;
  min-width: 0;
}

.approval-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 6px;
}

.approval-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

.approval-village {
  color: #722ed1;
  font-weight: 600;
}

.approval-applicant {
  color: #595959;
}

.approval-date {
  color: #8c8c8c;
}

.approval-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: #722ed1;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.approval-btn:hover {
  background: #531dab;
}

.approval-btn:active {
  transform: scale(0.95);
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
  background: rgba(114, 46, 209, 0.08);
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

/* ========== 数据概览区 ========== */
.data-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.data-item {
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.data-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(114, 46, 209, 0.08);
  border-radius: 12px;
  color: var(--icon-color);
  flex-shrink: 0;
}

.data-icon svg {
  width: 26px;
  height: 26px;
}

.data-content {
  flex: 1;
}

.data-value {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.2;
}

.data-label {
  font-size: 13px;
  color: #8c8c8c;
  margin-top: 4px;
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
  color: #722ed1;
}

.nav-item--active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 3px;
  background: #722ed1;
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

.elderly-mode .user-name {
  font-size: 26px;
}

.elderly-mode .user-role {
  font-size: 18px;
}

.elderly-mode .dept-badge {
  font-size: 16px;
  padding: 8px 18px;
}

.elderly-mode .stat-value {
  font-size: 30px;
}

.elderly-mode .stat-label {
  font-size: 16px;
}

.elderly-mode .approval-title,
.elderly-mode .feature-title {
  font-size: 20px;
}

.elderly-mode .approval-meta,
.elderly-mode .feature-desc {
  font-size: 16px;
}

.elderly-mode .approval-btn {
  padding: 10px 20px;
  font-size: 16px;
}

.elderly-mode .nav-text {
  font-size: 16px;
}

.elderly-mode .data-value {
  font-size: 26px;
}

.elderly-mode .data-label {
  font-size: 16px;
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

  .stats-row {
    gap: 8px;
  }

  .stat-card {
    padding: 16px 12px;
  }

  .stat-icon {
    width: 40px;
    height: 40px;
  }

  .stat-value {
    font-size: 22px;
  }

  .features-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .feature-item {
    padding: 16px;
  }
}
</style>
