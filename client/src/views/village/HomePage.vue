<template>
  <div class="smart-village-home">
    <!-- 顶部状态栏 -->
    <header class="home-header">
      <div class="village-info">
        <h2>{{ currentVillage.name }}</h2>
        <p class="weather-info">
          <van-icon name="cloud-o" />
          {{ weather }} {{ temperature }}°C
        </p>
      </div>
      <div class="user-avatar" @click="showUserPanel">
        <van-image
          :src="userInfo.avatar || '/default-avatar.png'"
          round
          width="40"
          height="40"
        />
        <span class="user-name">{{ userInfo.name }}</span>
      </div>
    </header>

    <!-- 核心功能区 -->
    <section class="core-functions">
      <div class="section-title">
        <h3>核心功能</h3>
        <van-tag type="primary" size="small">每日必用</van-tag>
      </div>
      <van-grid :column-num="2" :gutter="16">
        <van-grid-item
          v-for="func in coreFunctions"
          :key="func.id"
          @click="navigateTo(func.path)"
        >
          <div class="function-card" :class="func.type">
            <div class="function-icon">
              <van-icon :name="func.icon" size="32" />
            </div>
            <div class="function-info">
              <h4>{{ func.title }}</h4>
              <p>{{ func.desc }}</p>
              <van-tag
                v-if="func.badge"
                :type="func.badgeType"
                size="small"
              >
                {{ func.badge }}
              </van-tag>
            </div>
          </div>
        </van-grid-item>
      </van-grid>
    </section>

    <!-- 今日任务 -->
    <section class="today-tasks">
      <div class="section-header">
        <div class="section-title">
          <h3>今日任务</h3>
          <van-tag :type="taskStats.urgent > 0 ? 'danger' : 'success'" size="small">
            {{ taskStats.urgent > 0 ? '有紧急任务' : '暂无紧急' }}
          </van-tag>
        </div>
        <van-button size="small" @click="viewAllTasks">查看全部</van-button>
      </div>

      <div class="task-cards">
        <div
          v-for="task in todayTasks"
          :key="task.id"
          class="task-card"
          :class="[task.priority, { completed: task.completed }]"
          @click="handleTask(task)"
        >
          <div class="task-time">{{ task.time }}</div>
          <div class="task-content">
            <h4>{{ task.title }}</h4>
            <p>{{ task.location }} · {{ task.assignee }}</p>
          </div>
          <div class="task-status">
            <van-icon
              :name="task.completed ? 'checked' : 'arrow'"
              :class="{ completed: task.completed }"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- 数据概览 -->
    <section class="data-overview">
      <div class="section-title">
        <h3>工作概览</h3>
        <span class="update-time">{{ lastUpdateTime }}更新</span>
      </div>

      <div class="stats-cards">
        <div class="stat-card" v-for="stat in statsData" :key="stat.key">
          <div class="stat-icon" :style="{ backgroundColor: stat.color }">
            <van-icon :name="stat.icon" color="white" size="20" />
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
            <div class="stat-trend" :class="stat.trend">
              <van-icon :name="getTrendIcon(stat.trend)" size="12" />
              {{ stat.change }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 快速操作 -->
    <section class="quick-actions">
      <van-grid :column-num="4" :gutter="12">
        <van-grid-item
          v-for="action in quickActions"
          :key="action.id"
          @click="quickAction(action)"
        >
          <div class="action-item">
            <van-icon :name="action.icon" size="24" />
            <span>{{ action.name }}</span>
          </div>
        </van-grid-item>
      </van-grid>
    </section>

    <!-- 村务动态 -->
    <section class="village-news">
      <div class="section-header">
        <div class="section-title">
          <h3>村务动态</h3>
          <van-circle
            :rate="newsReadRate"
            :speed="100"
            :text="newsReadRate + '%'"
            size="20"
          />
        </div>
        <van-button size="small" @click="refreshNews">
          <van-icon name="replay" />
          刷新
        </van-button>
      </div>

      <van-notice-bar
        v-for="news in villageNews"
        :key="news.id"
        :text="news.title"
        :type="news.type"
        mode="closeable"
        @click="viewNews(news)"
      />
    </section>

    <!-- 底部导航栏 -->
    <van-tabbar v-model="activeTab" @change="onTabChange">
      <van-tabbar-item
        v-for="tab in tabBar"
        :key="tab.name"
        :icon="tab.icon"
        :name="tab.name"
      >
        {{ tab.label }}
      </van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 响应式数据
const activeTab = ref('home')
const currentVillage = ref({
  name: '智慧村务管理系统',
  code: 'ZH-001'
})

const userInfo = ref({
  name: '张主任',
  avatar: '',
  role: 'village_director'
})

const weather = ref('晴')
const temperature = ref(23)

const taskStats = reactive({
  total: 8,
  completed: 3,
  urgent: 2
})

const todayTasks = ref([
  {
    id: 1,
    time: '09:00',
    title: '整理贫困户资料',
    location: '村委办公室',
    assignee: '李会计',
    priority: 'urgent',
    completed: false
  },
  {
    id: 2,
    time: '14:00',
    title: '更新人口统计报表',
    location: '档案室',
    assignee: '王干事',
    priority: 'normal',
    completed: true
  }
])

const statsData = ref([
  {
    key: 'documents',
    label: '本月收集资料',
    value: '156',
    change: '+12%',
    trend: 'up',
    icon: 'description',
    color: '#1890ff'
  },
  {
    key: 'tasks',
    label: '今日完成任务',
    value: '3/8',
    change: '+25%',
    trend: 'up',
    icon: 'checked',
    color: '#52c41a'
  },
  {
    key: 'users',
    label: '在线村民',
    value: '234',
    change: '-5%',
    trend: 'down',
    icon: 'friends',
    color: '#faad14'
  }
])

const quickActions = ref([
  { id: 1, name: '扫码上传', icon: 'scan' },
  { id: 2, name: '语音输入', icon: 'volume' },
  { id: 3, name: '紧急呼叫', icon: 'phone-o' },
  { id: 4, name: '数据导出', icon: 'down' }
])

const villageNews = ref([
  {
    id: 1,
    title: '明天上午9点召开村委会，请准时参加',
    type: 'primary'
  },
  {
    id: 2,
    title: '养老保险认证开始了，请村民们及时办理',
    type: 'warning'
  }
])

const coreFunctions = ref([
  {
    id: 1,
    title: '资料收集',
    desc: '文档、证件、照片上传',
    icon: 'description',
    path: '/village/documents',
    type: 'primary',
    badge: '5个待处理',
    badgeType: 'warning'
  },
  {
    id: 2,
    title: '值班管理',
    desc: '排班、考勤、紧急呼叫',
    icon: 'calendar',
    path: '/village/duty',
    type: 'success',
    badge: '今日值班',
    badgeType: 'success'
  },
  {
    id: 3,
    title: '数据统计',
    desc: '图表、报表、趋势分析',
    icon: 'chart-trending-o',
    path: '/village/statistics',
    type: 'warning'
  },
  {
    id: 4,
    title: '智能搜索',
    desc: '文件、记录、快速查找',
    icon: 'search',
    path: '/village/search',
    type: 'danger'
  }
])

const tabBar = ref([
  { name: 'home', label: '首页', icon: 'home-o' },
  { name: 'documents', label: '资料', icon: 'description' },
  { name: 'duty', label: '值班', icon: 'calendar-o' },
  { name: 'statistics', label: '统计', icon: 'chart-trending-o' },
  { name: 'profile', label: '我的', icon: 'user-o' }
])

// 计算属性
const lastUpdateTime = computed(() => {
  return new Date().toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
})

const newsReadRate = computed(() => {
  return Math.floor(Math.random() * 30) + 70
})

// 方法
const navigateTo = (path) => {
  router.push(path)
}

const showUserPanel = () => {
  router.push('/profile')
}

const viewAllTasks = () => {
  router.push('/village/duty')
}

const handleTask = (task) => {
  // 处理任务点击
  router.push(`/village/duty/task/${task.id}`)
}

const quickAction = (action) => {
  switch (action.id) {
    case 1:
      router.push('/village/documents/scan')
      break
    case 2:
      startVoiceInput()
      break
    case 3:
      makeEmergencyCall()
      break
    case 4:
      exportData()
      break
  }
}

const startVoiceInput = () => {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'zh-CN'
    recognition.start()

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      console.log('语音输入结果:', transcript)
    }
  }
}

const makeEmergencyCall = () => {
  router.push('/village/emergency')
}

const exportData = () => {
  router.push('/village/statistics/export')
}

const refreshNews = () => {
  // 刷新村务动态
}

const viewNews = (news) => {
  router.push(`/village/news/${news.id}`)
}

const onTabChange = (name) => {
  const routes = {
    home: '/village/home',
    documents: '/village/documents',
    duty: '/village/duty',
    statistics: '/village/statistics',
    profile: '/profile'
  }

  if (routes[name]) {
    router.push(routes[name])
  }
}

const getTrendIcon = (trend) => {
  return trend === 'up' ? 'arrow-up' : 'arrow-down'
}

// 生命周期
onMounted(() => {
  // 获取初始数据
})
</script>

<style scoped>
.smart-village-home {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 50%, #f0f9ff 100%);
  padding-bottom: 50px;
}

.home-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.village-info h2 {
  margin: 0;
  font-size: 18px;
  color: #1a1a1a;
}

.weather-info {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #666;
  font-size: 14px;
  margin-top: 4px;
}

.user-avatar {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.user-name {
  font-size: 14px;
  color: #333;
}

section {
  margin: 16px;
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.core-functions .function-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.function-card.primary {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  color: white;
}

.function-card.success {
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
  color: white;
}

.function-card.warning {
  background: linear-gradient(135deg, #faad14 0%, #ffc53d 100%);
  color: white;
}

.function-card.danger {
  background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
  color: white;
}

.function-icon {
  margin-bottom: 12px;
}

.function-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: bold;
}

.function-info p {
  margin: 0 0 8px 0;
  font-size: 12px;
  opacity: 0.9;
}

.task-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-card {
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #ddd;
  background: #f9f9f9;
  cursor: pointer;
  transition: all 0.2s ease;
}

.task-card.urgent {
  border-left-color: #ff4d4f;
  background: #fff2f0;
}

.task-card.normal {
  border-left-color: #1890ff;
  background: #f0f9ff;
}

.task-card.completed {
  opacity: 0.6;
}

.task-time {
  font-size: 12px;
  color: #666;
  margin-right: 12px;
}

.task-content {
  flex: 1;
}

.task-content h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #333;
}

.task-content p {
  margin: 0;
  font-size: 12px;
  color: #666;
}

.task-status .van-icon {
  color: #999;
  font-size: 16px;
}

.task-status .van-icon.completed {
  color: #52c41a;
}

.stats-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  background: #f9f9f9;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
}

.stat-trend.up {
  color: #52c41a;
}

.stat-trend.down {
  color: #ff4d4f;
}

.quick-actions .action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-radius: 8px;
  background: #f9f9f9;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-actions .action-item:active {
  transform: scale(0.95);
  background: #e6f7ff;
}

.action-item span {
  font-size: 12px;
  color: #333;
}

.village-news {
  margin-bottom: 16px;
}

.update-time {
  font-size: 12px;
  color: #999;
}
</style>