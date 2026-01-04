<template>
  <div class="cadre-dashboard">
    <!-- 欢迎栏 -->
    <el-card class="welcome-card" shadow="never">
      <div class="welcome-content">
        <div class="welcome-info">
          <h1 class="welcome-title">欢迎回来，{{ currentUser.name || '村干部' }}</h1>
          <p class="welcome-subtitle">{{ getGreeting() }}，今天是 {{ formatDate(new Date()) }}</p>
          <p class="welcome-position">
            <el-tag type="primary">{{ currentUser.position || '村干部' }}</el-tag>
            <el-tag type="success" v-if="currentUser.village">{{ currentUser.village }}</el-tag>
          </p>
        </div>
        <div class="welcome-stats">
          <div class="stat-item">
            <el-icon color="#409eff"><Trophy /></el-icon>
            <span>本月积分: {{ monthlyPoints }}</span>
          </div>
          <div class="stat-item">
            <el-icon color="#67c23a"><CircleCheck /></el-icon>
            <span>待处理: {{ pendingTasks }}</span>
          </div>
          <div class="stat-item connection-status" :class="realtime.connectionStatus">
            <el-icon :color="realtime.isConnected ? '#67c23a' : '#f56c6c'">
              <Connection />
            </el-icon>
            <span>{{ realtime.isConnected ? '实时连接' : '连接断开' }}</span>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 数据统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="12" :md="6" v-for="stat in statisticsCards" :key="stat.key">
        <el-card class="stat-card" shadow="hover" @click="navigateTo(stat.route)">
          <div class="stat-content">
            <div class="stat-icon" :style="{ background: stat.gradient }">
              <el-icon :size="32" color="white">
                <component :is="stat.icon" />
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
              <div class="stat-trend" :class="stat.trendClass">
                <el-icon size="14">
                  <component :is="stat.trendIcon" />
                </el-icon>
                <span>{{ stat.change }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 数据筛选和导出工具栏 -->
    <el-card class="toolbar-card" shadow="never">
      <div class="toolbar-content">
        <!-- 筛选区域 -->
        <div class="filter-section">
          <span class="filter-label">
            <el-icon><Filter /></el-icon>
            数据筛选
          </span>
          <el-select v-model="filters.todoStatus" placeholder="待办状态" clearable size="small" style="width: 120px">
            <el-option label="全部" value="" />
            <el-option label="待处理" value="pending" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="已完成" value="completed" />
          </el-select>
          <el-select v-model="filters.todoType" placeholder="待办类型" clearable size="small" style="width: 120px">
            <el-option label="全部" value="" />
            <el-option label="人事" value="人事" />
            <el-option label="党务" value="党务" />
            <el-option label="行政" value="行政" />
            <el-option label="财务" value="财务" />
            <el-option label="应急" value="应急" />
          </el-select>
          <el-select v-model="filters.noticeLevel" placeholder="通知级别" clearable size="small" style="width: 120px">
            <el-option label="全部" value="" />
            <el-option label="紧急" value="紧急" />
            <el-option label="重要" value="重要" />
            <el-option label="一般" value="一般" />
            <el-option label="通知" value="通知" />
          </el-select>
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            size="small"
            style="width: 240px"
            :clearable="true"
          />
          <el-button type="primary" size="small" @click="applyFilters">
            <el-icon><Search /></el-icon>
            筛选
          </el-button>
          <el-button size="small" @click="resetFilters">
            <el-icon><RefreshLeft /></el-icon>
            重置
          </el-button>
        </div>

        <!-- 导出区域 -->
        <div class="export-section">
          <el-dropdown @command="handleExport" trigger="click">
            <el-button type="success" size="small">
              <el-icon><Download /></el-icon>
              导出报表
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="excel">
                  <el-icon><Document /></el-icon>
                  导出为 Excel
                </el-dropdown-item>
                <el-dropdown-item command="pdf">
                  <el-icon><Document /></el-icon>
                  导出为 PDF
                </el-dropdown-item>
                <el-dropdown-item command="csv">
                  <el-icon><Tickets /></el-icon>
                  导出为 CSV
                </el-dropdown-item>
                <el-dropdown-item divided command="all">
                  <el-icon><Files /></el-icon>
                  导出全部数据
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </el-card>

    <!-- 主内容区 -->
    <el-row :gutter="20" class="main-content">
      <!-- 左侧主栏 -->
      <el-col :xs="24" :sm="24" :md="16" :lg="16">
        <!-- 数据图表 -->
        <el-card class="chart-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span class="card-title">
                <el-icon><DataAnalysis /></el-icon>
                数据概览
              </span>
              <el-radio-group v-model="chartPeriod" size="small">
                <el-radio-button label="week">本周</el-radio-button>
                <el-radio-button label="month">本月</el-radio-button>
                <el-radio-button label="year">全年</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-container">
            <div ref="chartRef" style="height: 300px;"></div>
          </div>
        </el-card>

        <!-- 今日值班 -->
        <el-card class="duty-card" shadow="never" v-if="todayDuty.length > 0">
          <template #header>
            <div class="card-header">
              <span class="card-title">
                <el-icon><Calendar /></el-icon>
                今日值班
              </span>
              <el-tag type="success">{{ formatDate(new Date()) }}</el-tag>
            </div>
          </template>
          <div class="duty-list">
            <div class="duty-item" v-for="duty in todayDuty" :key="duty._id">
              <el-avatar :size="60" :src="duty.avatar">
                {{ duty.memberName?.charAt(0) || '值' }}
              </el-avatar>
              <div class="duty-info">
                <h4>{{ duty.memberName }}</h4>
                <p>{{ duty.position }}</p>
                <p class="duty-period">{{ duty.period }}</p>
              </div>
              <div class="duty-actions">
                <ContactButton
                  :phone="duty.contact"
                  button-text="联系"
                  type="primary"
                  size="small"
                  :custom-name="duty.memberName"
                  :confirm-before-call="true"
                  @contact="handleDutyContact"
                />
              </div>
            </div>
          </div>
        </el-card>

        <!-- 待办事项 -->
        <el-card class="todo-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span class="card-title">
                <el-icon><List /></el-icon>
                待办事项
                <el-badge :value="todoList.length" :max="99" class="todo-badge" />
              </span>
              <el-button text type="primary" @click="viewAllTodos">
                查看全部
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </template>
          <div class="todo-list">
            <div
              class="todo-item"
              v-for="todo in todoList"
              :key="todo._id"
              :class="{ 'urgent': isUrgent(todo.deadline), 'completed': todo.status === 'completed' }"
            >
              <div class="todo-content">
                <el-checkbox v-model="todo.completed" @change="toggleTodoStatus(todo)">
                  <span class="todo-title">{{ todo.title }}</span>
                </el-checkbox>
                <div class="todo-meta">
                  <el-tag :type="getTodoTypeTag(todo.type)" size="small">{{ todo.type }}</el-tag>
                  <span class="todo-deadline" :class="{ 'overdue': isOverdue(todo.deadline) }">
                    <el-icon><Clock /></el-icon>
                    {{ formatDate(todo.deadline) }}
                  </span>
                </div>
              </div>
              <div class="todo-actions">
                <el-button type="primary" size="small" @click="handleTodo(todo)">
                  处理
                </el-button>
              </div>
            </div>
            <el-empty v-if="todoList.length === 0" description="暂无待办事项" />
          </div>
        </el-card>
      </el-col>

      <!-- 右侧边栏 -->
      <el-col :xs="24" :sm="24" :md="8" :lg="8">
        <!-- 快捷操作 -->
        <el-card class="quick-actions-card" shadow="never">
          <template #header>
            <span class="card-title">
              <el-icon><Grid /></el-icon>
              快捷操作
            </span>
          </template>
          <div class="quick-actions">
            <el-button type="danger" @click="showEmergencyDialog = true" class="quick-btn emergency">
              <el-icon><Bell /></el-icon>
              <span>紧急通知</span>
            </el-button>
            <el-button type="primary" @click="quickAction('add-member')" class="quick-btn">
              <el-icon><UserPlus /></el-icon>
              <span>添加人员</span>
            </el-button>
            <el-button type="success" @click="quickAction('add-schedule')" class="quick-btn">
              <el-icon><CalendarPlus /></el-icon>
              <span>添加值班</span>
            </el-button>
            <el-button type="warning" @click="quickAction('publish-notice')" class="quick-btn">
              <el-icon><Promotion /></el-icon>
              <span>发布公告</span>
            </el-button>
            <el-button type="info" @click="quickAction('export-report')" class="quick-btn">
              <el-icon><Download /></el-icon>
              <span>导出报表</span>
            </el-button>
            <el-button @click="quickAction('view-map')" class="quick-btn">
              <el-icon><Location /></el-icon>
              <span>村情地图</span>
            </el-button>
          </div>
        </el-card>

        <!-- 最新通知 -->
        <el-card class="notice-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span class="card-title">
                <el-icon><Notification /></el-icon>
                最新通知
              </span>
              <el-badge :value="unreadNotices" type="danger" />
            </div>
          </template>
          <div class="notice-list">
            <div
              class="notice-item"
              v-for="notice in noticeList"
              :key="notice._id"
              :class="{ 'unread': !notice.read }"
              @click="viewNotice(notice)"
            >
              <el-tag :type="getNoticeTypeTag(notice.level)" size="small" class="notice-tag">
                {{ notice.level }}
              </el-tag>
              <div class="notice-content">
                <h4 class="notice-title">{{ notice.title }}</h4>
                <p class="notice-time">{{ formatRelativeTime(notice.createdAt) }}</p>
              </div>
            </div>
            <el-empty v-if="noticeList.length === 0" description="暂无通知" />
          </div>
        </el-card>

        <!-- 村民动态 -->
        <el-card class="activity-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span class="card-title">
                <el-icon><ChatDotRound /></el-icon>
                村民动态
              </span>
              <el-button text type="primary" size="small" @click="viewAllActivities">
                更多
              </el-button>
            </div>
          </template>
          <div class="activity-list">
            <div class="activity-item" v-for="activity in activityList" :key="activity._id">
              <el-avatar :size="40" :src="activity.userAvatar">
                {{ activity.userName?.charAt(0) }}
              </el-avatar>
              <div class="activity-content">
                <p>
                  <strong>{{ activity.userName }}</strong>
                  {{ activity.action }}
                </p>
                <span class="activity-time">{{ formatRelativeTime(activity.createdAt) }}</span>
              </div>
            </div>
            <el-empty v-if="activityList.length === 0" description="暂无动态" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 紧急通知对话框 -->
    <el-dialog
      v-model="showEmergencyDialog"
      title="发送紧急通知"
      width="600px"
      :fullscreen="isMobile"
      destroy-on-close
    >
      <el-form :model="emergencyForm" :rules="emergencyRules" ref="emergencyFormRef" label-width="100px">
        <el-form-item label="通知类型" prop="type">
          <el-select v-model="emergencyForm.type" placeholder="请选择通知类型" style="width: 100%">
            <el-option label="🚨 紧急事件" value="emergency" />
            <el-option label="🌪️ 自然灾害" value="disaster" />
            <el-option label="🏥 公共卫生" value="health" />
            <el-option label="⚠️ 安全事故" value="safety" />
            <el-option label="📢 重要通知" value="important" />
          </el-select>
        </el-form-item>
        <el-form-item label="通知标题" prop="title">
          <el-input v-model="emergencyForm.title" placeholder="请输入通知标题" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="通知内容" prop="content">
          <el-input
            v-model="emergencyForm.content"
            type="textarea"
            :rows="5"
            placeholder="请输入通知内容"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="通知范围" prop="targets">
          <el-checkbox-group v-model="emergencyForm.targets">
            <el-checkbox label="all">全体村民</el-checkbox>
            <el-checkbox label="members">村委人员</el-checkbox>
            <el-checkbox label="party">党员同志</el-checkbox>
            <el-checkbox label="volunteers">志愿者</el-checkbox>
            <el-checkbox label="special">特殊群体</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="发送方式">
          <el-checkbox-group v-model="emergencyForm.channels">
            <el-checkbox label="app">APP推送</el-checkbox>
            <el-checkbox label="sms">短信通知</el-checkbox>
            <el-checkbox label="wechat">微信通知</el-checkbox>
            <el-checkbox label="call">电话通知</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEmergencyDialog = false">取消</el-button>
        <el-button type="primary" :loading="sendingEmergency" @click="sendEmergencyNotice">
          发送通知
        </el-button>
      </template>
    </el-dialog>

    <!-- 通知详情对话框 -->
    <NotificationDetailDialog
      v-model="showNotificationDialog"
      :notice="selectedNotice"
      @marked-read="handleNotificationMarkedRead"
      @deleted="handleNotificationDeleted"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import dashboardApi from '@/api/dashboard'
import ContactButton from '@/components/villageCommittee/ContactButton.vue'
import NotificationDetailDialog from '@/components/villageCommittee/NotificationDetailDialog.vue'
import { useDashboardRealtime } from '@/composables/useDashboardRealtime'
import {
  Trophy, CircleCheck, Calendar, Phone, List, ArrowRight, Bell, Grid, UserPlus,
  CalendarPlus, Promotion, Download, Location, Notification, ChatDotRound, Clock,
  DataAnalysis, ArrowUp, ArrowDown, Connection, Filter, Search, RefreshLeft,
  ArrowDown as DropdownArrow, Document, Tickets, Files
} from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

// 实时更新连接
const realtime = useDashboardRealtime({
  // 新通知或通知状态变化时
  onNotificationUpdate: async (data) => {
    console.log('[Dashboard] 收到通知更新:', data)

    // 如果是新通知，添加到列表
    if (data.action === 'created' || !data.action) {
      const villageId = userStore.villageId || 'default'
      try {
        const response = await dashboardApi.getNotifications({ limit: 10 })
        if (response.data?.notifications) {
          noticeList.value = response.data.notifications.map(n => ({
            _id: n._id || n.id,
            title: n.title,
            level: n.priority || n.level || '一般',
            content: n.content,
            createdAt: n.createdAt || n.created_at,
            read: n.read || false
          }))
        }
      } catch (error) {
        console.error('刷新通知列表失败:', error)
      }
    }

    // 如果是删除操作，从列表中移除
    if (data.action === 'deleted' && data.notificationId) {
      noticeList.value = noticeList.value.filter(n => n._id !== data.notificationId)
    }

    // 如果是已读操作，更新状态
    if (data.action === 'read' && data.notificationId) {
      const notice = noticeList.value.find(n => n._id === data.notificationId)
      if (notice) {
        notice.read = true
      }
    }
  },

  // 待办事项更新时
  onTodoUpdate: async (data) => {
    console.log('[Dashboard] 收到待办更新:', data)

    // 刷新待办列表
    try {
      const response = await dashboardApi.getTodos({ limit: 10, status: 'pending' })
      if (response.data?.tasks) {
        todoList.value = response.data.tasks.map(task => ({
          _id: task._id || task.id,
          title: task.title,
          type: task.category || task.type || '待办',
          deadline: task.dueDate || task.deadline,
          completed: task.status === 'completed',
          status: task.status || 'pending'
        }))
      }
    } catch (error) {
      console.error('刷新待办列表失败:', error)
    }
  },

  // 值班表更新时
  onDutyUpdate: async (data) => {
    console.log('[Dashboard] 收到值班表更新:', data)

    // 刷新值班数据
    try {
      const villageId = userStore.villageId || 'default'
      const response = await dashboardApi.getTodayDuty(villageId)
      if (response.data?.schedule) {
        todayDuty.value = response.data.schedule
      }
    } catch (error) {
      console.error('刷新值班表失败:', error)
    }
  },

  // 统计数据更新时
  onStatisticsUpdate: (data) => {
    console.log('[Dashboard] 收到统计数据更新:', data)
    // 可以更新统计卡片数据
    if (data.statistics) {
      statisticsCards.value.forEach(card => {
        if (data.statistics[card.key] !== undefined) {
          card.value = data.statistics[card.key]
        }
      })
    }
  },

  // 紧急通知时
  onEmergencyAlert: (data) => {
    console.log('[Dashboard] 收到紧急通知:', data)
    ElMessage.error({
      message: data.message || '收到紧急通知',
      duration: 0,
      showClose: true
    })
  }
})

// 响应式数据
const chartRef = ref(null)
const chartPeriod = ref('week')
const chartInstance = ref(null)
const showEmergencyDialog = ref(false)
const showNotificationDialog = ref(false)
const sendingEmergency = ref(false)
const isMobile = ref(window.innerWidth < 768)
const selectedNotice = ref(null)

// 数据筛选
const filters = ref({
  todoStatus: '',
  todoType: '',
  noticeLevel: '',
  dateRange: null
})

// 导出加载状态
const exporting = ref(false)

// 当前用户信息
const currentUser = computed(() => userStore.userInfo || {})

// 积分和待处理
const monthlyPoints = ref(1250)
const pendingTasks = ref(8)

// 统计卡片数据
const statisticsCards = ref([
  {
    key: 'residents',
    label: '村民总数',
    value: '1,234',
    icon: 'UserFilled',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    change: '+12 本月',
    trendClass: 'up',
    trendIcon: 'ArrowUp',
    route: '/residents'
  },
  {
    key: 'households',
    label: '住户总数',
    value: '486',
    icon: 'House',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    change: '+3 本月',
    trendClass: 'up',
    trendIcon: 'ArrowUp',
    route: '/household-codes'
  },
  {
    key: 'notices',
    label: '本月公告',
    value: '28',
    icon: 'ChatLineSquare',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    change: '+5 环比',
    trendClass: 'up',
    trendIcon: 'ArrowUp',
    route: '/announcements'
  },
  {
    key: 'tasks',
    label: '待办事项',
    value: '15',
    icon: 'List',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    change: '-2 较昨日',
    trendClass: 'down',
    trendIcon: 'ArrowDown',
    route: '/tasks'
  }
])

// 今日值班
const todayDuty = ref([])

// 待办事项
const todoList = ref([])

// 最新通知
const noticeList = ref([])

// 村民动态
const activityList = ref([])

// 计算属性
const unreadNotices = computed(() => {
  return noticeList.value.filter(n => !n.read).length
})

// 紧急通知表单
const emergencyForm = ref({
  type: '',
  title: '',
  content: '',
  targets: [],
  channels: ['app']
})

const emergencyRules = {
  type: [{ required: true, message: '请选择通知类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入通知标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入通知内容', trigger: 'blur' }],
  targets: [{ type: 'array', min: 1, message: '请选择通知范围', trigger: 'change' }]
}

// 方法
const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 6) return '凌晨好'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  if (hour < 22) return '晚上好'
  return '夜深了'
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatRelativeTime = (date) => {
  if (!date) return ''
  const now = new Date()
  const target = new Date(date)
  const diff = now - target
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return formatDate(date)
}

const navigateTo = (route) => {
  if (route) {
    router.push(route)
  }
}

const isUrgent = (deadline) => {
  if (!deadline) return false
  const deadlineDate = new Date(deadline)
  const now = new Date()
  const diff = deadlineDate - now
  return diff > 0 && diff < 24 * 60 * 60 * 1000 // 24小时内
}

const isOverdue = (deadline) => {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

const getTodoTypeTag = (type) => {
  const typeMap = {
    '人事': 'primary',
    '党务': 'danger',
    '行政': 'warning',
    '财务': 'success',
    '应急': 'danger'
  }
  return typeMap[type] || 'info'
}

const getNoticeTypeTag = (level) => {
  const typeMap = {
    '紧急': 'danger',
    '重要': 'warning',
    '一般': 'info',
    '通知': 'primary'
  }
  return typeMap[level] || 'info'
}

const toggleTodoStatus = async (todo) => {
  try {
    const status = todo.completed ? 'completed' : 'pending'
    await dashboardApi.updateTodoStatus(todo._id, {
      status,
      progress: todo.completed ? 100 : 0
    })
    ElMessage.success(todo.completed ? '已标记为完成' : '已标记为未完成')
  } catch (error) {
    console.error('更新待办状态失败:', error)
    ElMessage.error('操作失败')
    // 回滚状态
    todo.completed = !todo.completed
  }
}

const handleTodo = (todo) => {
  ElMessage.info(`处理待办: ${todo.title}`)
  // TODO: 跳转到待办详情页面
}

const viewAllTodos = () => {
  router.push('/tasks')
}

const viewNotice = async (notice) => {
  try {
    // 设置选中的通知
    selectedNotice.value = notice

    // 打开通知详情对话框
    showNotificationDialog.value = true

    // 标记为已读
    if (!notice.read) {
      await dashboardApi.markNotificationRead(notice._id)
      notice.read = true
    }
  } catch (error) {
    console.error('标记通知已读失败:', error)
  }
}

const handleNotificationMarkedRead = async (notice) => {
  try {
    await dashboardApi.markNotificationRead(notice._id)
    // 更新列表中的通知状态
    const targetNotice = noticeList.value.find(n => n._id === notice._id)
    if (targetNotice) {
      targetNotice.read = true
    }
  } catch (error) {
    console.error('标记通知已读失败:', error)
  }
}

const handleNotificationDeleted = async (notice) => {
  try {
    await dashboardApi.deleteNotification(notice._id)
    // 从列表中移除通知
    noticeList.value = noticeList.value.filter(n => n._id !== notice._id)
  } catch (error) {
    console.error('删除通知失败:', error)
  }
}

const viewAllActivities = () => {
  router.push('/activities')
}

const callDutyMember = async (duty) => {
  try {
    await ElMessageBox.confirm(
      `确定要拨打 ${duty.memberName} 的电话 (${duty.contact}) 吗？`,
      '联系值班人员',
      {
        confirmButtonText: '拨打',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    // 调用电话拨打 API
    await dashboardApi.makeCall(duty.contact)

    ElMessage.success(`正在拨打 ${duty.memberName} 的电话...`)

    // 如果在移动端，可以直接调用拨号功能
    if (/mobile/i.test(navigator.userAgent)) {
      window.location.href = `tel:${duty.contact}`
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('拨打电话失败:', error)
      ElMessage.error('拨打失败，请重试')
    }
  }
}

const handleDutyContact = ({ contact, success }) => {
  if (success) {
    ElMessage.success(`已联系值班人员: ${contact}`)
  }
}

const quickAction = (action) => {
  const routeMap = {
    'add-member': '/village-committee/members',
    'add-schedule': '/village-committee/duty-schedule',
    'publish-notice': '/announcements/create',
    'export-report': '/reports/export',
    'view-map': '/village-committee/village-map'
  }

  if (routeMap[action]) {
    router.push(routeMap[action])
  } else {
    ElMessage.info('功能开发中...')
  }
}

// ========== 数据筛选功能 ==========

// 应用筛选
const applyFilters = async () => {
  try {
    ElMessage.info('正在应用筛选条件...')

    const villageId = userStore.villageId || 'default'

    // 构建查询参数
    const params = {
      villageId,
      limit: 50
    }

    // 添加筛选条件
    if (filters.value.todoStatus) {
      params.status = filters.value.todoStatus
    }
    if (filters.value.todoType) {
      params.type = filters.value.todoType
    }
    if (filters.value.noticeLevel) {
      params.level = filters.value.noticeLevel
    }
    if (filters.value.dateRange && filters.value.dateRange.length === 2) {
      params.startDate = formatDate(filters.value.dateRange[0])
      params.endDate = formatDate(filters.value.dateRange[1])
    }

    // 并行加载筛选后的数据
    const [todosResponse, noticesResponse] = await Promise.allSettled([
      dashboardApi.getTodos(params),
      dashboardApi.getNotifications(params)
    ])

    // 更新待办事项
    if (todosResponse.status === 'fulfilled' && todosResponse.value?.data) {
      const tasksData = todosResponse.value.data.tasks || todosResponse.value.data
      todoList.value = Array.isArray(tasksData) ? tasksData.map(task => ({
        _id: task._id || task.id,
        title: task.title,
        type: task.category || task.type || '待办',
        deadline: task.dueDate || task.deadline,
        completed: task.status === 'completed',
        status: task.status || 'pending'
      })) : []
    }

    // 更新通知列表
    if (noticesResponse.status === 'fulfilled' && noticesResponse.value?.data) {
      const noticesData = noticesResponse.value.data.notifications || noticesResponse.value.data
      noticeList.value = Array.isArray(noticesData) ? noticesData.map(notice => ({
        _id: notice._id || notice.id,
        title: notice.title,
        level: notice.priority || notice.level || '一般',
        content: notice.content,
        createdAt: notice.createdAt || notice.created_at,
        read: notice.read || false
      })) : []
    }

    ElMessage.success('筛选完成')
  } catch (error) {
    console.error('应用筛选失败:', error)
    ElMessage.error('筛选失败，请重试')
  }
}

// 重置筛选
const resetFilters = async () => {
  filters.value = {
    todoStatus: '',
    todoType: '',
    noticeLevel: '',
    dateRange: null
  }

  // 重新加载所有数据
  await loadData()
  ElMessage.success('筛选已重置')
}

// ========== 数据导出功能 ==========

// 处理导出
const handleExport = async (command) => {
  try {
    exporting.value = true

    const villageId = userStore.villageId || 'default'

    if (command === 'all') {
      // 导出全部数据
      ElMessage.info('正在准备全部数据导出...')
      await exportAllData()
    } else {
      // 导出特定格式
      const formatMap = {
        'excel': 'Excel',
        'pdf': 'PDF',
        'csv': 'CSV'
      }

      ElMessage.info(`正在生成 ${formatMap[command]} 报表...`)

      // 调用导出 API
      const response = await dashboardApi.exportReport({
        type: command,
        filters: {
          todoStatus: filters.value.todoStatus,
          todoType: filters.value.todoType,
          noticeLevel: filters.value.noticeLevel,
          dateRange: filters.value.dateRange ? [
            formatDate(filters.value.dateRange[0]),
            formatDate(filters.value.dateRange[1])
          ] : null
        },
        villageId
      })

      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `村委仪表板报表_${formatDate(new Date())}.${command}`)
      document.body.appendChild(link)
      link.click()

      // 清理
      window.URL.revokeObjectURL(url)
      document.body.removeChild(link)

      ElMessage.success(`${formatMap[command]} 报表导出成功！`)
    }
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请重试')
  } finally {
    exporting.value = false
  }
}

// 导出全部数据
const exportAllData = async () => {
  try {
    // 生成 JSON 格式的完整数据
    const data = {
      exportDate: new Date().toISOString(),
      villageId: userStore.villageId,
      statistics: statisticsCards.value,
      todos: todoList.value,
      notices: noticeList.value,
      dutySchedule: todayDuty.value,
      activities: activityList.value
    }

    // 创建 Blob 并下载
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `仪表板完整数据_${formatDate(new Date())}.json`)
    document.body.appendChild(link)
    link.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(link)

    ElMessage.success('完整数据导出成功！')
  } catch (error) {
    console.error('导出全部数据失败:', error)
    throw error
  }
}

const sendEmergencyNotice = async () => {
  // 表单验证
  if (!emergencyForm.value.type) {
    ElMessage.warning('请选择通知类型')
    return
  }
  if (!emergencyForm.value.title) {
    ElMessage.warning('请输入通知标题')
    return
  }
  if (!emergencyForm.value.content) {
    ElMessage.warning('请输入通知内容')
    return
  }
  if (emergencyForm.value.targets.length === 0) {
    ElMessage.warning('请选择通知范围')
    return
  }

  sendingEmergency.value = true

  try {
    await dashboardApi.sendEmergencyNotification({
      type: emergencyForm.value.type,
      title: emergencyForm.value.title,
      content: emergencyForm.value.content,
      targets: emergencyForm.value.targets,
      channels: emergencyForm.value.channels
    })

    ElMessage.success('紧急通知发送成功！')
    showEmergencyDialog.value = false

    // 重置表单
    emergencyForm.value = {
      type: '',
      title: '',
      content: '',
      targets: [],
      channels: ['app']
    }
  } catch (error) {
    console.error('发送紧急通知失败:', error)
    ElMessage.error(error.response?.data?.message || '发送失败，请重试')
  } finally {
    sendingEmergency.value = false
  }
}

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return

  chartInstance.value = echarts.init(chartRef.value)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['新增村民', '处理事务', '发布公告']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '新增村民',
        type: 'bar',
        data: [2, 4, 6, 3, 5, 8, 4],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#667eea' },
            { offset: 1, color: '#764ba2' }
          ])
        }
      },
      {
        name: '处理事务',
        type: 'bar',
        data: [8, 12, 15, 10, 14, 18, 12],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#4facfe' },
            { offset: 1, color: '#00f2fe' }
          ])
        }
      },
      {
        name: '发布公告',
        type: 'bar',
        data: [3, 5, 4, 6, 5, 8, 6],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#43e97b' },
            { offset: 1, color: '#38f9d7' }
          ])
        }
      }
    ]
  }

  chartInstance.value.setOption(option)
}

// 更新图表数据
const updateChart = () => {
  if (!chartInstance.value) return

  // TODO: 根据chartPeriod获取不同时间段的数据
  const dataMap = {
    week: {
      xAxis: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      series1: [2, 4, 6, 3, 5, 8, 4],
      series2: [8, 12, 15, 10, 14, 18, 12],
      series3: [3, 5, 4, 6, 5, 8, 6]
    },
    month: {
      xAxis: ['第一周', '第二周', '第三周', '第四周'],
      series1: [15, 22, 18, 25],
      series2: [45, 52, 48, 55],
      series3: [12, 18, 15, 20]
    },
    year: {
      xAxis: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
      series1: [20, 25, 30, 28, 35, 40, 38, 42, 45, 50, 48, 55],
      series2: [50, 55, 60, 58, 65, 70, 68, 72, 75, 80, 78, 85],
      series3: [15, 18, 20, 22, 25, 28, 26, 30, 32, 35, 33, 38]
    }
  }

  const data = dataMap[chartPeriod.value]

  chartInstance.value.setOption({
    xAxis: {
      data: data.xAxis
    },
    series: [
      { data: data.series1 },
      { data: data.series2 },
      { data: data.series3 }
    ]
  })
}

// 加载数据
const loadData = async () => {
  try {
    const villageId = userStore.villageId || 'default'

    // 并行加载所有数据
    const [dutyResponse, todosResponse, noticesResponse, activitiesResponse] = await Promise.allSettled([
      dashboardApi.getTodayDuty(villageId),
      dashboardApi.getTodos({ limit: 10, status: 'pending' }),
      dashboardApi.getNotifications({ limit: 10 }),
      dashboardApi.getActivities({ limit: 10, villageId })
    ])

    // 处理今日值班数据
    if (dutyResponse.status === 'fulfilled' && dutyResponse.value?.data) {
      const dutyData = dutyResponse.value.data
      todayDuty.value = dutyData.schedule || dutyData || []
    } else {
      // 使用模拟数据作为后备
      todayDuty.value = [
        {
          _id: '1',
          memberName: '张三',
          position: '村支书',
          period: '上午 08:00-12:00',
          contact: '13800138000',
          avatar: ''
        },
        {
          _id: '2',
          memberName: '李四',
          position: '村主任',
          period: '下午 14:00-18:00',
          contact: '13800138001',
          avatar: ''
        }
      ]
    }

    // 处理待办事项数据
    if (todosResponse.status === 'fulfilled' && todosResponse.value?.data) {
      const tasksData = todosResponse.value.data.tasks || todosResponse.value.data
      todoList.value = Array.isArray(tasksData) ? tasksData.map(task => ({
        _id: task._id || task.id,
        title: task.title,
        type: task.category || task.type || '待办',
        deadline: task.dueDate || task.deadline,
        completed: task.status === 'completed',
        status: task.status || 'pending'
      })) : []
    } else {
      // 使用模拟数据作为后备
      todoList.value = [
        {
          _id: '1',
          title: '审批张三的调任申请',
          type: '人事',
          deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          completed: false,
          status: 'pending'
        },
        {
          _id: '2',
          title: '完善党员档案信息',
          type: '党务',
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          completed: false,
          status: 'pending'
        },
        {
          _id: '3',
          title: '提交本月工作总结',
          type: '行政',
          deadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          completed: false,
          status: 'pending'
        }
      ]
    }

    // 处理通知数据
    if (noticesResponse.status === 'fulfilled' && noticesResponse.value?.data) {
      const noticesData = noticesResponse.value.data.notifications || noticesResponse.value.data
      noticeList.value = Array.isArray(noticesData) ? noticesData.map(notice => ({
        _id: notice._id || notice.id,
        title: notice.title,
        level: notice.priority || notice.level || '一般',
        content: notice.content,
        createdAt: notice.createdAt || notice.created_at,
        read: notice.read || false
      })) : []
    } else {
      // 使用模拟数据作为后备
      noticeList.value = [
        {
          _id: '1',
          title: '关于召开村委会议的通知',
          level: '重要',
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          read: false
        },
        {
          _id: '2',
          title: '冬季防火安全提示',
          level: '一般',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          read: false
        },
        {
          _id: '3',
          title: '关于开展主题党日活动的通知',
          level: '通知',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          read: true
        }
      ]
    }

    // 处理村民动态数据
    if (activitiesResponse.status === 'fulfilled' && activitiesResponse.value?.data) {
      const activitiesData = activitiesResponse.value.data.activities || activitiesResponse.value.data
      activityList.value = Array.isArray(activitiesData) ? activitiesData.map(activity => ({
        _id: activity._id || activity.id,
        userName: activity.userName || activity.user_name,
        userAvatar: activity.userAvatar || activity.avatar,
        action: activity.action || activity.description,
        createdAt: activity.createdAt || activity.created_at
      })) : []
    } else {
      // 使用模拟数据作为后备
      activityList.value = [
        {
          _id: '1',
          userName: '王五',
          userAvatar: '',
          action: '提交了低保申请',
          createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString()
        },
        {
          _id: '2',
          userName: '赵六',
          userAvatar: '',
          action: '咨询了医保政策',
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        },
        {
          _id: '3',
          userName: '孙七',
          userAvatar: '',
          action: '反馈了道路问题',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        }
      ]
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  }
}

// 窗口大小改变时重新渲染图表
const handleResize = () => {
  isMobile.value = window.innerWidth < 768
  if (chartInstance.value) {
    chartInstance.value.resize()
  }
}

// 生命周期
onMounted(async () => {
  await loadData()
  await nextTick()
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (chartInstance.value) {
    chartInstance.value.dispose()
  }
  window.removeEventListener('resize', handleResize)
})

// 监听图表周期变化
watch(chartPeriod, () => {
  updateChart()
})
</script>

<style lang="scss" scoped>
.cadre-dashboard {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: 10px;
  }
}

.welcome-card {
  margin-bottom: 20px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;

  :deep(.el-card__body) {
    padding: 30px;
  }

  .welcome-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: flex-start;
    }

    .welcome-info {
      .welcome-title {
        margin: 0 0 8px 0;
        font-size: 28px;
        font-weight: 700;
        color: white;

        @media (max-width: 768px) {
          font-size: 22px;
        }
      }

      .welcome-subtitle {
        margin: 0 0 12px 0;
        font-size: 16px;
        opacity: 0.9;
      }

      .welcome-position {
        display: flex;
        gap: 8px;

        .el-tag {
          border: none;
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }
      }
    }

    .welcome-stats {
      display: flex;
      gap: 20px;

      .stat-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px;
        font-weight: 600;
        background: rgba(255, 255, 255, 0.15);
        padding: 12px 20px;
        border-radius: 12px;
        backdrop-filter: blur(10px);

        &.connection-status {
          transition: all 0.3s ease;

          &.connected {
            background: rgba(103, 194, 58, 0.2);
          }

          &.disconnected {
            background: rgba(245, 108, 108, 0.2);
          }

          &.connecting {
            background: rgba(230, 162, 60, 0.2);
            animation: pulse 1.5s infinite;
          }

          &.error {
            background: rgba(245, 108, 108, 0.2);
          }
        }
      }
    }
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.stats-row {
  margin-bottom: 20px;

  .stat-card {
    border: none;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
    }

    .stat-content {
      display: flex;
      align-items: center;
      gap: 16px;

      .stat-icon {
        width: 64px;
        height: 64px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .stat-info {
        flex: 1;

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #303133;
          line-height: 1.2;
        }

        .stat-label {
          font-size: 14px;
          color: #909399;
          margin: 4px 0;
        }

        .stat-trend {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;

          &.up {
            color: #67c23a;
          }

          &.down {
            color: #f56c6c;
          }
        }
      }
    }
  }
}

// 筛选和导出工具栏
.toolbar-card {
  margin-bottom: 20px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);

  :deep(.el-card__body) {
    padding: 16px 20px;
  }

  .toolbar-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: stretch;
    }

    .filter-section {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      flex-wrap: wrap;

      @media (max-width: 768px) {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        font-weight: 600;
        color: #606266;
        white-space: nowrap;
      }

      :deep(.el-select),
      :deep(.el-date-picker) {
        flex-shrink: 0;
      }
    }

    .export-section {
      flex-shrink: 0;

      @media (max-width: 768px) {
        width: 100%;

        .el-button {
          width: 100%;
        }
      }
    }
  }
}

.main-content {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .card-title {
      font-weight: 600;
      font-size: 16px;
      color: #303133;
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .chart-card {
    margin-bottom: 20px;
    border: none;

    .chart-container {
      padding: 10px 0;
    }
  }

  .duty-card {
    margin-bottom: 20px;
    border: none;

    .duty-list {
      display: flex;
      flex-direction: column;
      gap: 16px;

      .duty-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background: #f5f7fa;
        border-radius: 12px;
        transition: all 0.3s;

        &:hover {
          background: #e8ebf0;
        }

        .duty-info {
          flex: 1;

          h4 {
            margin: 0 0 4px 0;
            font-size: 16px;
            color: #303133;
          }

          p {
            margin: 0;
            font-size: 14px;
            color: #909399;

            &.duty-period {
              color: #409eff;
              font-weight: 600;
            }
          }
        }
      }
    }
  }

  .todo-card {
    margin-bottom: 20px;
    border: none;

    .todo-badge {
      margin-left: 8px;
    }

    .todo-list {
      .todo-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        background: #f5f7fa;
        border-radius: 12px;
        margin-bottom: 12px;
        transition: all 0.3s;
        border-left: 3px solid transparent;

        &:hover {
          background: #e8ebf0;
        }

        &.urgent {
          border-left-color: #f56c6c;
          background: #fef0f0;
        }

        &.completed {
          opacity: 0.6;

          .todo-title {
            text-decoration: line-through;
          }
        }

        .todo-content {
          flex: 1;

          .todo-title {
            font-size: 15px;
            color: #303133;
            font-weight: 500;
          }

          .todo-meta {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-top: 8px;

            .todo-deadline {
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: 13px;
              color: #909399;

              &.overdue {
                color: #f56c6c;
                font-weight: 600;
              }
            }
          }
        }
      }
    }
  }
}

.quick-actions-card {
  margin-bottom: 20px;
  border: none;

  .quick-actions {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }

    .quick-btn {
      height: 80px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 8px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.3s;

      &:hover {
        transform: translateY(-2px);
      }

      &.emergency {
        grid-column: 1 / -1;
        height: 60px;
        flex-direction: row;
        background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
        border: none;
        color: white;
      }
    }
  }
}

.notice-card,
.activity-card {
  margin-bottom: 20px;
  border: none;

  .notice-list,
  .activity-list {
    .notice-item,
    .activity-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      margin-bottom: 8px;

      &:hover {
        background: #f5f7fa;
      }

      &.unread {
        background: #ecf5ff;

        .notice-title {
          font-weight: 600;
        }
      }

      .notice-content {
        flex: 1;

        .notice-title {
          margin: 0 0 4px 0;
          font-size: 14px;
          color: #303133;
        }

        .notice-time {
          margin: 0;
          font-size: 12px;
          color: #909399;
        }
      }

      .activity-content {
        flex: 1;

        p {
          margin: 0 0 4px 0;
          font-size: 14px;
          color: #303133;
        }

        .activity-time {
          font-size: 12px;
          color: #909399;
        }
      }
    }
  }
}
</style>
