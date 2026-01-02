<template>
  <div class="dashboard">
    <div class="welcome-header">
      <h1>🏘️ 欢迎使用智慧村庄管理系统</h1>
      <p>{{ isAdmin ? '管理员控制台 - 全功能管理平台' : '村民服务门户 - 便民服务平台' }}</p>
    </div>

    <div class="feature-grid">
      <!-- 管理员专有功能 -->
      <template v-if="isAdmin">
        <div class="feature-card" @click="router.push('/residents')">
          <div class="card-icon">👥</div>
          <h3>村民管理</h3>
          <p>数字档案、隐私保护、人脸识别</p>
          <button class="card-btn">管理村民</button>
        </div>

        <div class="feature-card" @click="router.push('/system/users')">
          <div class="card-icon">🏛️</div>
          <h3>村委管理</h3>
          <p>人员管理、权限控制、值班调度</p>
          <button class="card-btn">管理人员</button>
        </div>

        <div class="feature-card" @click="router.push('/affairs')">
          <div class="card-icon">📢</div>
          <h3>村务协同</h3>
          <p>公告发布、投票系统、会议管理</p>
          <button class="card-btn">村务管理</button>
        </div>

        <div class="feature-card" @click="router.push('/finance')">
          <div class="card-icon">💰</div>
          <h3>财务管理</h3>
          <p>预算控制、审批流程、财务透明</p>
          <button class="card-btn">财务管理</button>
        </div>

        <div class="feature-card" @click="openMonitoring">
          <div class="card-icon">📊</div>
          <h3>实时监控</h3>
          <p>系统性能、运营指标、健康状态</p>
          <button class="card-btn">查看监控</button>
        </div>

        <div class="feature-card" @click="router.push('/system/notifications')">
          <div class="card-icon">🔔</div>
          <h3>通知系统</h3>
          <p>多渠道通知、模板管理、批量发送</p>
          <button class="card-btn">管理通知</button>
        </div>
      </template>

      <!-- 村民功能 -->
      <template v-else>
        <div class="feature-card" @click="router.push('/profile')">
          <div class="card-icon">👤</div>
          <h3>个人中心</h3>
          <p>个人信息、档案管理、账户设置</p>
          <button class="card-btn">个人中心</button>
        </div>

        <div class="feature-card" @click="router.push('/village-affairs')">
          <div class="card-icon">📢</div>
          <h3>村务公开</h3>
          <p>公告通知、村务信息、意见反馈</p>
          <button class="card-btn">查看公告</button>
        </div>

        <div class="feature-card" @click="router.push('/services')">
          <div class="card-icon">🏠</div>
          <h3>生活服务</h3>
          <p>便民服务、在线办事、生活指南</p>
          <button class="card-btn">生活服务</button>
        </div>

        <div class="feature-card" @click="router.push('/finance/overview')">
          <div class="card-icon">💰</div>
          <h3>财务公开</h3>
          <p>村财务公示、资金使用透明化</p>
          <button class="card-btn">查看财务</button>
        </div>

        <div class="feature-card" @click="router.push('/proposals')">
          <div class="card-icon">💡</div>
          <h3>建议提案</h3>
          <p>提出建议、参与村务决策</p>
          <button class="card-btn">提交建议</button>
        </div>

        <div class="feature-card" @click="router.push('/profile')">
          <div class="card-icon">🔔</div>
          <h3>消息通知</h3>
          <p>接收村务通知、重要消息提醒</p>
          <button class="card-btn">查看消息</button>
        </div>
      </template>
    </div>

    <div class="stats-section">
      <div class="stat-item">
        <h3>系统状态</h3>
        <div :class="['status-indicator', statusClass]">{{ statusText }}</div>
      </div>
      <div class="stat-item">
        <h3>在线用户</h3>
        <div class="user-count" v-if="!loading">{{ onlineUsers }}</div>
        <div v-else class="skeleton">--</div>
      </div>
      <div class="stat-item">
        <h3>今日访问</h3>
        <div class="visit-count" v-if="!loading">{{ dailyVisits }}</div>
        <div v-else class="skeleton">--</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { dashboardApi } from '@/api'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

// 数据状态
const loading = ref(true)
const onlineUsers = ref(0)
const dailyVisits = ref(0)
const systemStatus = ref({ status: 'unknown' })

// 统计数据
const stats = ref({
  residents: { total: 0, online: 0 },
  announcements: { total: 0, unread: 0 },
  services: { total: 0, pending: 0 },
  finance: { balance: 0, transactions: 0 },
  emergency: { active: 0, resolved: 0 }
})

// 根据用户角色显示不同的功能卡片
const userRole = computed(() => userStore.userInfo?.role || 'villager')
const isAdmin = computed(() => userRole.value === 'admin')

// 系统状态显示
const statusText = computed(() => {
  switch (systemStatus.value.status) {
    case 'healthy': return '🟢 正常运行'
    case 'degraded': return '🟡 部分服务异常'
    case 'error': return '🔴 系统异常'
    default: return '⚪ 检测中...'
  }
})

const statusClass = computed(() => {
  switch (systemStatus.value.status) {
    case 'healthy': return 'online'
    case 'degraded': return 'warning'
    case 'error': return 'offline'
    default: return 'checking'
  }
})

// 获取系统状态
const fetchSystemStatus = async () => {
  try {
    const health = await dashboardApi.getHealthStatus()
    systemStatus.value = health
  } catch (error) {
    console.warn('系统健康检查失败:', error)
    systemStatus.value = { status: 'error' }
  }
}

// 获取统计数据
const fetchStatistics = async () => {
  try {
    loading.value = true

    // 并行请求所有统计数据
    const results = await Promise.allSettled([
      dashboardApi.getResidentStats().catch(() => ({ data: { total: 0, online: 0 } })),
      dashboardApi.getAnnouncementStats().catch(() => ({ data: { total: 0, unread: 0 } })),
      dashboardApi.getServiceStats().catch(() => ({ data: { total: 0, pending: 0 } })),
      dashboardApi.getFinanceStats().catch(() => ({ data: { balance: 0, transactions: 0 } })),
      dashboardApi.getEmergencyStats().catch(() => ({ data: { active: 0, resolved: 0 } }))
    ])

    // 处理结果
    if (results[0].status === 'fulfilled') {
      stats.value.residents = results[0].value.data || { total: 0, online: 0 }
    }
    if (results[1].status === 'fulfilled') {
      stats.value.announcements = results[1].value.data || { total: 0, unread: 0 }
    }
    if (results[2].status === 'fulfilled') {
      stats.value.services = results[2].value.data || { total: 0, pending: 0 }
    }
    if (results[3].status === 'fulfilled') {
      stats.value.finance = results[3].value.data || { balance: 0, transactions: 0 }
    }
    if (results[4].status === 'fulfilled') {
      stats.value.emergency = results[4].value.data || { active: 0, resolved: 0 }
    }

    // 模拟在线用户和访问数据（实际项目中需要从监控API获取）
    onlineUsers.value = Math.floor(Math.random() * 20) + 5
    dailyVisits.value = Math.floor(Math.random() * 200) + 100

  } catch (error) {
    console.error('获取统计数据失败:', error)
    ElMessage.warning('部分数据加载失败，显示默认值')
  } finally {
    loading.value = false
  }
}

const openMonitoring = () => {
  window.open('http://localhost:3001/monitoring', '_blank')
}

onMounted(async () => {
  console.log('智慧村庄仪表板加载完成，用户角色:', userRole.value)

  // 获取数据
  await Promise.all([
    fetchSystemStatus(),
    fetchStatistics()
  ])
})
</script>

<style scoped>
.dashboard {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.welcome-header {
  text-align: center;
  margin-bottom: 40px;
  padding: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
}

.welcome-header h1 {
  margin: 0 0 10px 0;
  font-size: 2.5em;
}

.welcome-header p {
  margin: 0;
  font-size: 1.2em;
  opacity: 0.9;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.feature-card {
  background: white;
  border-radius: 12px;
  padding: 25px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
  background: #f8f9fa;
}

.card-icon {
  font-size: 3em;
  margin-bottom: 15px;
}

.feature-card h3 {
  color: #333;
  margin: 0 0 10px 0;
}

.feature-card p {
  color: #666;
  margin: 0 0 20px 0;
}

.card-btn {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s ease;
}

.card-btn:hover {
  background: #45a049;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 30px;
}

.stat-item {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
}

.stat-item h3 {
  margin: 0 0 15px 0;
  color: #333;
}

.status-indicator {
  font-weight: bold;
  font-size: 1.1em;
}

.status-indicator.online {
  color: #28a745;
}

.status-indicator.warning {
  color: #ffc107;
}

.status-indicator.offline {
  color: #dc3545;
}

.status-indicator.checking {
  color: #6c757d;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.skeleton {
  font-size: 2em;
  font-weight: bold;
  color: #ccc;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

@keyframes skeleton-loading {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}

.user-count, .visit-count {
  font-size: 2em;
  font-weight: bold;
  color: #007bff;
}
</style>