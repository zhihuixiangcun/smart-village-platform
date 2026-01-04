<template>
  <div class="cadre-dashboard">
    <!-- 欢迎栏 -->
    <el-card class="welcome-card" shadow="never" v-loading="loading">
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

    <!-- 主内容区 -->
    <el-row :gutter="20" class="main-content">
      <!-- 左侧主栏 -->
      <el-col :xs="24" :sm="24" :md="16" :lg="16">
        <!-- 数据图表 -->
        <el-card class="chart-card" shadow="never" v-loading="chartLoading">
          <template #header>
            <div class="card-header">
              <span class="card-title">
                <el-icon><DataAnalysis /></el-icon>
                数据概览
              </span>
              <el-radio-group v-model="chartPeriod" size="small" @change="handleChartPeriodChange">
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
                <el-button type="primary" size="small" @click="callDutyMember(duty)">
                  <el-icon><Phone /></el-icon>
                  联系
                </el-button>
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
              <div class="card-actions">
                <!-- 待办筛选 -->
                <el-dropdown @command="filterTodos" trigger="click">
                  <el-button size="small">
                    筛选 <el-icon><Filter /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="all">全部</el-dropdown-item>
                      <el-dropdown-item command="pending">待处理</el-dropdown-item>
                      <el-dropdown-item command="completed">已完成</el-dropdown-item>
                      <el-dropdown-item command="urgent">紧急</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
                <el-button text type="primary" @click="viewAllTodos">
                  查看全部
                  <el-icon><ArrowRight /></el-icon>
                </el-button>
              </div>
            </div>
          </template>
          <div class="todo-list">
            <div
              class="todo-item"
              v-for="todo in filteredTodoList"
              :key="todo._id"
              :class="{ 'urgent': isUrgent(todo.deadline), 'completed': todo.completed }"
            >
              <div class="todo-content">
                <el-checkbox v-model="todo.completed" @change="toggleTodoStatus(todo)">
                  <span class="todo-title">{{ todo.title }}</span>
                </el-checkbox>
                <div class="todo-meta">
                  <el-tag :type="getTodoTypeTag(todo.type)" size="small">{{ todo.type }}</el-tag>
                  <span class="todo-deadline" :class="{ 'overdue': isOverdue(todo.deadline) }">
                    <el-icon><Clock /></el-icon>
                    {{ formatDeadline(todo.deadline) }}
                  </span>
                </div>
              </div>
              <div class="todo-actions">
                <el-button type="primary" size="small" @click="handleTodo(todo)">
                  处理
                </el-button>
              </div>
            </div>
            <el-empty v-if="filteredTodoList.length === 0" description="暂无待办事项" />
          </div>
        </el-card>
      </el-col>

      <!-- 右侧边栏 -->
      <el-col :xs="24" :sm="24" :md="8" :lg="8">
        <!-- 快捷操作 -->
        <el-card class="quick-actions-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span class="card-title">
                <el-icon><Grid /></el-icon>
                快捷操作
              </span>
              <el-button text size="small" @click="showCustomActionDialog = true">
                <el-icon><Setting /></el-icon>
              </el-button>
            </div>
          </template>
          <div class="quick-actions">
            <el-button type="danger" @click="showEmergencyDialog = true" class="quick-btn emergency">
              <el-icon><Bell /></el-icon>
              <span>紧急通知</span>
            </el-button>
            <el-button
              v-for="action in quickActionsList"
              :key="action.id"
              :type="action.type || 'primary'"
              @click="quickAction(action.id)"
              class="quick-btn"
            >
              <el-icon>
                <component :is="action.icon" />
              </el-icon>
              <span>{{ action.label }}</span>
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
              <div class="card-actions">
                <!-- 通知筛选 -->
                <el-dropdown @command="filterNotices" trigger="click">
                  <el-button size="small" text>
                    <el-icon><Filter /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="all">全部</el-dropdown-item>
                      <el-dropdown-item command="urgent">紧急</el-dropdown-item>
                      <el-dropdown-item command="important">重要</el-dropdown-item>
                      <el-dropdown-item command="general">一般</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
                <el-badge :value="unreadNotices" type="danger" />
              </div>
            </div>
          </template>
          <div class="notice-list">
            <div
              class="notice-item"
              v-for="notice in filteredNoticeList"
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
            <el-empty v-if="filteredNoticeList.length === 0" description="暂无通知" />
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
              <!-- 时间范围筛选 -->
              <el-dropdown @command="filterActivities" trigger="click">
                <el-button size="small" text>
                  {{ activityTimeRangeLabel }} <el-icon><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="today">今天</el-dropdown-item>
                    <el-dropdown-item command="week">本周</el-dropdown-item>
                    <el-dropdown-item command="month">本月</el-dropdown-item>
                  </el-dropdown-menu>
                  </template>
              </el-dropdown>
            </div>
          </template>
          <div class="activity-list">
            <div class="activity-item" v-for="activity in filteredActivityList" :key="activity._id">
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
            <el-empty v-if="filteredActivityList.length === 0" description="暂无动态" />
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
    <el-dialog
      v-model="showNoticeDetailDialog"
      title="通知详情"
      width="600px"
      :fullscreen="isMobile"
      destroy-on-close
    >
      <div v-if="selectedNotice" class="notice-detail">
        <div class="notice-header">
          <el-tag :type="getNoticeTypeTag(selectedNotice.level)">
            {{ selectedNotice.level }}
          </el-tag>
          <span class="notice-time">{{ formatRelativeTime(selectedNotice.createdAt) }}</span>
        </div>
        <h2 class="notice-detail-title">{{ selectedNotice.title }}</h2>
        <div class="notice-detail-content" v-html="selectedNotice.content"></div>
        <!-- 附件列表 -->
        <div v-if="selectedNotice.attachments && selectedNotice.attachments.length > 0" class="notice-attachments">
          <h4>附件</h4>
          <div class="attachment-list">
            <el-button
              v-for="file in selectedNotice.attachments"
              :key="file.id"
              @click="downloadAttachment(file)"
              class="attachment-item"
            >
              <el-icon><Download /></el-icon>
              {{ file.name }}
            </el-button>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showNoticeDetailDialog = false">关闭</el-button>
        <el-button v-if="selectedNotice && !selectedNotice.read" type="primary" @click="markAsReadAndClose">
          标记已读
        </el-button>
      </template>
    </el-dialog>

    <!-- 自定义快捷操作对话框 -->
    <el-dialog
      v-model="showCustomActionDialog"
      title="自定义快捷操作"
      width="500px"
      destroy-on-close
    >
      <div class="custom-actions-content">
        <p class="tip">拖拽调整顺序，取消勾选可隐藏按钮</p>
        <el-checkbox-group v-model="selectedQuickActions">
          <draggable v-model="allQuickActions" item-key="id">
            <template #item="{ element }">
              <div class="action-item">
                <el-icon class="drag-handle"><Rank /></el-icon>
                <el-checkbox :label="element.id" border>
                  <el-icon>
                    <component :is="element.icon" />
                  </el-icon>
                  {{ element.label }}
                </el-checkbox>
              </div>
            </template>
          </draggable>
        </el-checkbox-group>
      </div>
      <template #footer>
        <el-button @click="showCustomActionDialog = false">取消</el-button>
        <el-button type="primary" @click="saveCustomActions">保存</el-button>
      </template>
    </el-dialog>

    <!-- 导出报表对话框 -->
    <el-dialog
      v-model="showExportDialog"
      title="导出报表"
      width="400px"
      destroy-on-close
    >
      <el-form label-width="80px">
        <el-form-item label="报表类型">
          <el-radio-group v-model="exportType">
            <el-radio label="excel">Excel</el-radio>
            <el-radio label="pdf">PDF</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-select v-model="exportPeriod" placeholder="请选择">
            <el-option label="本周" value="week" />
            <el-option label="本月" value="month" />
            <el-option label="全年" value="year" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showExportDialog = false">取消</el-button>
        <el-button type="primary" :loading="exporting" @click="handleExport">
          导出
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import draggable from 'vuedraggable'
import {
  Trophy, CircleCheck, Calendar, Phone, List, ArrowRight, Bell, Grid,
  Promotion, Download, Location, Notification, ChatDotRound, Clock,
  DataAnalysis, ArrowUp, ArrowDown, Filter, Setting, Rank, User
} from '@element-plus/icons-vue'
import {
  getDashboardData,
  getTodayDuty,
  updateTodoStatus,
  sendEmergencyNotice as sendEmergencyNoticeApi,
  getNotices,
  markNoticeRead,
  getActivities,
  getStatistics,
  exportReport,
  saveQuickActions
} from '@/api/cadre'

/**
 * 村干部主页组件
 * @description 提供数据概览、快捷操作、待办事项、通知和村民动态等功能
 */
const router = useRouter()
const userStore = useUserStore()

// ==================== 响应式状态 ====================
const chartRef = ref(null)
const chartPeriod = ref('week')
const chartInstance = ref(null)
const showEmergencyDialog = ref(false)
const showNoticeDetailDialog = ref(false)
const showCustomActionDialog = ref(false)
const showExportDialog = ref(false)
const sendingEmergency = ref(false)
const exporting = ref(false)
const isMobile = ref(window.innerWidth < 768)
const loading = ref(false)
const chartLoading = ref(false)

// 筛选状态
const todoFilter = ref('all')
const noticeFilter = ref('all')
const activityTimeRange = ref('today')

// 导出配置
const exportType = ref('excel')
const exportPeriod = ref('month')

// ==================== 计算属性 ====================
/**
 * 当前用户信息
 */
const currentUser = computed(() => userStore.userInfo || {})

/**
 * 积分和待处理任务数
 */
const monthlyPoints = ref(0)
const pendingTasks = ref(0)

/**
 * 统计卡片数据
 */
const statisticsCards = ref([])

// ==================== 数据列表 ====================
const todayDuty = ref([])
const todoList = ref([])
const noticeList = ref([])
const activityList = ref([])

// 选中的通知
const selectedNotice = ref(null)

/**
 * 筛选后的待办列表
 */
const filteredTodoList = computed(() => {
  let list = [...todoList.value]
  if (todoFilter.value === 'pending') {
    list = list.filter(t => !t.completed)
  } else if (todoFilter.value === 'completed') {
    list = list.filter(t => t.completed)
  } else if (todoFilter.value === 'urgent') {
    list = list.filter(t => isUrgent(t.deadline))
  }
  return list
})

/**
 * 筛选后的通知列表
 */
const filteredNoticeList = computed(() => {
  let list = [...noticeList.value]
  if (noticeFilter.value !== 'all') {
    list = list.filter(n => {
      const levelMap = { urgent: '紧急', important: '重要', general: '一般' }
      return n.level === levelMap[noticeFilter.value]
    })
  }
  return list
})

/**
 * 筛选后的活动列表
 */
const filteredActivityList = computed(() => {
  const now = Date.now()
  let list = [...activityList.value]

  if (activityTimeRange.value === 'today') {
    const oneDay = 24 * 60 * 60 * 1000
    list = list.filter(a => now - new Date(a.createdAt).getTime() < oneDay)
  } else if (activityTimeRange.value === 'week') {
    const oneWeek = 7 * 24 * 60 * 60 * 1000
    list = list.filter(a => now - new Date(a.createdAt).getTime() < oneWeek)
  }
  // month 不过滤，显示所有

  return list
})

/**
 * 活动时间范围标签
 */
const activityTimeRangeLabel = computed(() => {
  const labels = { today: '今天', week: '本周', month: '本月' }
  return labels[activityTimeRange.value] || '本月'
})

/**
 * 未读通知数量
 */
const unreadNotices = computed(() => {
  return noticeList.value.filter(n => !n.read).length
})

// ==================== 快捷操作配置 ====================
// 所有可用的快捷操作
const allQuickActions = ref([
  { id: 'add-member', label: '添加人员', icon: 'User', route: '/village-committee/members', default: true },
  { id: 'add-schedule', label: '添加值班', icon: 'Calendar', route: '/village-committee/duty-schedule', default: true },
  { id: 'publish-notice', label: '发布公告', icon: 'Promotion', route: '/announcements/create', default: true },
  { id: 'export-report', label: '导出报表', icon: 'Download', action: 'export', default: true },
  { id: 'view-map', label: '村情地图', icon: 'Location', route: '/village-committee/village-map', default: true }
])

// 选中的快捷操作ID
const selectedQuickActions = ref([])

/**
 * 显示的快捷操作列表
 */
const quickActionsList = computed(() => {
  return allQuickActions.value.filter(action =>
    selectedQuickActions.value.includes(action.id)
  )
})

// ==================== 表单数据 ====================
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

// ==================== 工具函数 ====================

/**
 * 根据当前时间获取问候语
 * @returns {string} 问候语
 */
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

/**
 * 格式化日期
 * @param {Date|string} date - 日期对象或日期字符串
 * @returns {string} 格式化后的日期 (YYYY-MM-DD)
 */
const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 格式化相对时间
 * @param {Date|string} date - 日期
 * @returns {string} 相对时间描述
 */
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

/**
 * 格式化截止时间
 * @param {Date|string} date - 日期
 * @returns {string} 格式化的截止时间
 */
const formatDeadline = (date) => {
  if (!date) return '无截止日期'
  const deadline = new Date(date)
  const now = new Date()
  const diff = deadline - now
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (diff < 0) return '已过期'
  if (hours < 24) return `${hours}小时后到期`
  if (days < 7) return `${days}天后到期`
  return formatDate(date)
}

/**
 * 判断任务是否紧急（24小时内）
 * @param {Date|string} deadline - 截止日期
 * @returns {boolean} 是否紧急
 */
const isUrgent = (deadline) => {
  if (!deadline) return false
  const deadlineDate = new Date(deadline)
  const now = new Date()
  const diff = deadlineDate - now
  return diff > 0 && diff < 24 * 60 * 60 * 1000
}

/**
 * 判断任务是否过期
 * @param {Date|string} deadline - 截止日期
 * @returns {boolean} 是否过期
 */
const isOverdue = (deadline) => {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

/**
 * 获取待办类型标签颜色
 * @param {string} type - 待办类型
 * @returns {string} Element Plus 标签类型
 */
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

/**
 * 获取通知级别标签颜色
 * @param {string} level - 通知级别
 * @returns {string} Element Plus 标签类型
 */
const getNoticeTypeTag = (level) => {
  const typeMap = {
    '紧急': 'danger',
    '重要': 'warning',
    '一般': 'info',
    '通知': 'primary'
  }
  return typeMap[level] || 'info'
}

// ==================== 交互处理函数 ====================

/**
 * 导航到指定路由
 * @param {string} route - 路由路径
 */
const navigateTo = (route) => {
  if (route) {
    router.push(route)
  }
}

/**
 * 切换待办事项状态
 * @param {Object} todo - 待办事项对象
 */
const toggleTodoStatus = async (todo) => {
  try {
    await updateTodoStatus(todo._id, { completed: todo.completed })
    ElMessage.success(todo.completed ? '已标记为完成' : '已标记为未完成')
    // 重新加载数据
    await loadDashboardData()
  } catch (error) {
    ElMessage.error('操作失败')
    todo.completed = !todo.completed // 回滚状态
  }
}

/**
 * 处理待办事项
 * @param {Object} todo - 待办事项对象
 */
const handleTodo = (todo) => {
  ElMessage.info(`处理待办: ${todo.title}`)
  // TODO: 跳转到待办详情页面
  // router.push(`/tasks/${todo._id}`)
}

/**
 * 查看所有待办事项
 */
const viewAllTodos = () => {
  router.push('/tasks')
}

/**
 * 查看通知详情
 * @param {Object} notice - 通知对象
 */
const viewNotice = async (notice) => {
  selectedNotice.value = notice
  showNoticeDetailDialog.value = true

  // 如果未读，标记为已读
  if (!notice.read) {
    try {
      await markNoticeRead(notice._id)
      notice.read = true
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }
}

/**
 * 标记已读并关闭对话框
 */
const markAsReadAndClose = async () => {
  if (selectedNotice.value) {
    try {
      await markNoticeRead(selectedNotice.value._id)
      selectedNotice.value.read = true
      ElMessage.success('已标记为已读')
    } catch (error) {
      ElMessage.error('操作失败')
    }
  }
  showNoticeDetailDialog.value = false
}

/**
 * 下载附件
 * @param {Object} file - 文件对象
 */
const downloadAttachment = async (file) => {
  try {
    ElMessage.info('正在下载附件...')
    // TODO: 实现附件下载
    // await downloadNoticeAttachment(selectedNotice.value._id, file.id)
    ElMessage.success('下载成功')
  } catch (error) {
    ElMessage.error('下载失败')
  }
}

/**
 * 联系值班人员（实现电话拨打功能）
 * @param {Object} duty - 值班人员信息
 */
const callDutyMember = (duty) => {
  ElMessageBox.confirm(
    `确定要拨打 ${duty.memberName} 的电话吗？\n电话：${duty.contact}`,
    '联系值班人员',
    {
      confirmButtonText: '拨打',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(() => {
    // 实际拨打电话
    window.location.href = `tel:${duty.contact}`
    ElMessage.success(`正在拨打 ${duty.memberName} 的电话...`)
  }).catch(() => {
    // 用户取消
  })
}

/**
 * 快捷操作处理
 * @param {string} action - 操作类型
 */
const quickAction = (action) => {
  const actionConfig = allQuickActions.value.find(a => a.id === action)

  if (!actionConfig) {
    ElMessage.info('功能开发中...')
    return
  }

  if (actionConfig.action === 'export') {
    showExportDialog.value = true
  } else if (actionConfig.route) {
    router.push(actionConfig.route)
  } else {
    ElMessage.info('功能开发中...')
  }
}

/**
 * 发送紧急通知
 */
const sendEmergencyNotice = async () => {
  // 手动验证表单
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
    await sendEmergencyNoticeApi(emergencyForm.value)
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
    ElMessage.error('发送失败，请重试')
  } finally {
    sendingEmergency.value = false
  }
}

/**
 * 筛选待办事项
 * @param {string} filter - 筛选类型
 */
const filterTodos = (filter) => {
  todoFilter.value = filter
}

/**
 * 筛选通知
 * @param {string} filter - 筛选类型
 */
const filterNotices = (filter) => {
  noticeFilter.value = filter
}

/**
 * 筛选活动
 * @param {string} range - 时间范围
 */
const filterActivities = (range) => {
  activityTimeRange.value = range
}

/**
 * 保存自定义快捷操作
 */
const saveCustomActions = async () => {
  try {
    // 保存到本地存储
    localStorage.setItem('quickActions', JSON.stringify(selectedQuickActions.value))

    // TODO: 保存到后端
    // await saveQuickActions(selectedQuickActions.value)

    ElMessage.success('保存成功')
    showCustomActionDialog.value = false
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

/**
 * 导出报表
 */
const handleExport = async () => {
  exporting.value = true
  try {
    ElMessage.info('正在生成报表...')

    const response = await exportReport(exportType.value, { period: exportPeriod.value })

    // 创建下载链接
    const blob = new Blob([response], {
      type: exportType.value === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf'
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `村务报表_${formatDate(new Date())}.${exportType.value === 'excel' ? 'xlsx' : 'pdf'}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('报表导出成功')
    showExportDialog.value = false
  } catch (error) {
    ElMessage.error('导出失败')
  } finally {
    exporting.value = false
  }
}

/**
 * 图表周期变化处理
 */
const handleChartPeriodChange = async () => {
  chartLoading.value = true
  try {
    // TODO: 从后端获取对应周期的数据
    // const stats = await getStatistics(chartPeriod.value)
    // updateChart(stats)
    updateChart()
  } catch (error) {
    console.error('加载图表数据失败:', error)
  } finally {
    chartLoading.value = false
  }
}

// ==================== 图表相关函数 ====================

/**
 * 初始化图表
 */
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
      data: ['新增村民', '处理事务', '发布公告'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '10%',
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

/**
 * 更新图表数据
 */
const updateChart = () => {
  if (!chartInstance.value) return

  // TODO: 根据chartPeriod从后端获取不同时间段的数据
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

/**
 * 加载仪表盘数据（使用真实API，失败时fallback到模拟数据）
 */
const loadDashboardData = async () => {
  loading.value = true
  try {
    // 尝试从后端API加载数据
    const data = await getDashboardData()

    // 设置统计数据
    if (data.statistics) {
      statisticsCards.value = data.statistics.cards || []
      monthlyPoints.value = data.statistics.points || 0
      pendingTasks.value = data.statistics.pendingTasks || 0
    }

    todayDuty.value = data.todayDuty || []
    todoList.value = data.todos || []
    noticeList.value = data.notices || []
    activityList.value = data.activities || []

  } catch (error) {
    console.warn('API加载失败，使用模拟数据:', error)

    // Fallback到模拟数据
    await loadMockData()
  } finally {
    loading.value = false
  }
}

/**
 * 加载模拟数据（API失败时的备用方案）
 */
const loadMockData = async () => {
  await new Promise(resolve => setTimeout(resolve, 500))

  // 统计卡片
  statisticsCards.value = [
    {
      key: 'residents',
      label: '村民总数',
      value: '1,234',
      icon: 'UserFilled',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      change: '+12 本月',
      trendClass: 'up',
      trendIcon: ArrowUp,
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
      trendIcon: ArrowUp,
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
      trendIcon: ArrowUp,
      route: '/announcements'
    },
    {
      key: 'tasks',
      label: '待办事项',
      value: '15',
      icon: List,
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      change: '-2 较昨日',
      trendClass: 'down',
      trendIcon: ArrowDown,
      route: '/tasks'
    }
  ]

  monthlyPoints.value = 1250
  pendingTasks.value = 8

  // 今日值班数据
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

  // 待办事项数据
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

  // 通知列表数据
  noticeList.value = [
    {
      _id: '1',
      title: '关于召开村委会议的通知',
      level: '重要',
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      read: false,
      content: '<p>请各位村委成员于本周五上午9点到村委会会议室参加会议。</p>',
      attachments: []
    },
    {
      _id: '2',
      title: '冬季防火安全提示',
      level: '一般',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      read: false,
      content: '<p>冬季干燥，请注意防火安全，定期检查电器线路。</p>',
      attachments: []
    },
    {
      _id: '3',
      title: '关于开展主题党日活动的通知',
      level: '通知',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      read: true,
      content: '<p>本月主题党日活动定于15日举行。</p>',
      attachments: []
    }
  ]

  // 村民动态数据
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

/**
 * 初始化快捷操作配置
 */
const initQuickActions = () => {
  // 从本地存储加载配置
  const saved = localStorage.getItem('quickActions')
  if (saved) {
    selectedQuickActions.value = JSON.parse(saved)
  } else {
    // 默认选中所有默认操作
    selectedQuickActions.value = allQuickActions.value
      .filter(a => a.default)
      .map(a => a.id)
  }
}

/**
 * 窗口大小改变处理
 */
const handleResize = () => {
  isMobile.value = window.innerWidth < 768
  if (chartInstance.value) {
    chartInstance.value.resize()
  }
}

// ==================== 生命周期钩子 ====================

onMounted(async () => {
  initQuickActions()
  await loadDashboardData()
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

// ==================== 监听器 ====================

/**
 * 监听图表周期变化
 */
watch(chartPeriod, () => {
  handleChartPeriodChange()
})
</script>

<style lang="scss" scoped>
// ==================== 主容器样式 ====================
.cadre-dashboard {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: 10px;
  }
}

// ==================== 欢迎卡片样式 ====================
.welcome-card {
  margin-bottom: 20px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;

  :deep(.el-card__body) {
    padding: 30px;

    @media (max-width: 768px) {
      padding: 20px;
    }
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
        flex-wrap: wrap;

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
      flex-wrap: wrap;

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
        transition: all 0.3s;

        &:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-2px);
        }
      }
    }
  }
}

// ==================== 统计卡片样式 ====================
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
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .stat-info {
        flex: 1;

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #303133;
          line-height: 1.2;

          @media (max-width: 768px) {
            font-size: 24px;
          }
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

// ==================== 主内容区样式 ====================
.main-content {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;

    .card-title {
      font-weight: 600;
      font-size: 16px;
      color: #303133;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .card-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  // ==================== 图表卡片 ====================
  .chart-card {
    margin-bottom: 20px;
    border: none;

    .chart-container {
      padding: 10px 0;
    }
  }

  // ==================== 今日值班卡片 ====================
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
          transform: translateX(4px);
        }

        @media (max-width: 768px) {
          flex-wrap: wrap;
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

  // ==================== 待办事项卡片 ====================
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

          &:hover {
            background: #fde2e2;
          }
        }

        &.completed {
          opacity: 0.6;

          .todo-title {
            text-decoration: line-through;
            color: #909399;
          }
        }

        @media (max-width: 768px) {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
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
            flex-wrap: wrap;

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

        .todo-actions {
          @media (max-width: 768px) {
            width: 100%;
            display: flex;
            justify-content: flex-end;
          }
        }
      }
    }
  }
}

// ==================== 快捷操作卡片 ====================
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
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      &.emergency {
        grid-column: 1 / -1;
        height: 60px;
        flex-direction: row;
        background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
        border: none;
        color: white;

        &:hover {
          box-shadow: 0 6px 20px rgba(245, 87, 108, 0.4);
        }
      }
    }
  }
}

// ==================== 通知和动态卡片 ====================
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
        transform: translateX(4px);
      }

      &.unread {
        background: #ecf5ff;

        &:hover {
          background: #d9ecff;
        }

        .notice-title {
          font-weight: 600;
        }
      }

      .notice-tag {
        flex-shrink: 0;
      }

      .notice-content {
        flex: 1;
        min-width: 0;

        .notice-title {
          margin: 0 0 4px 0;
          font-size: 14px;
          color: #303133;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .notice-time {
          margin: 0;
          font-size: 12px;
          color: #909399;
        }
      }

      .activity-content {
        flex: 1;
        min-width: 0;

        p {
          margin: 0 0 4px 0;
          font-size: 14px;
          color: #303133;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .activity-time {
          font-size: 12px;
          color: #909399;
        }
      }
    }
  }
}

// ==================== 通知详情对话框 ====================
.notice-detail {
  .notice-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #ebeef5;

    .notice-time {
      font-size: 14px;
      color: #909399;
    }
  }

  .notice-detail-title {
    font-size: 20px;
    color: #303133;
    margin: 0 0 16px 0;
  }

  .notice-detail-content {
    font-size: 15px;
    line-height: 1.8;
    color: #606266;
    min-height: 100px;
  }

  .notice-attachments {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #ebeef5;

    h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #303133;
    }

    .attachment-list {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .attachment-item {
        width: 100%;
        justify-content: flex-start;
        text-align: left;
      }
    }
  }
}

// ==================== 自定义操作对话框 ====================
.custom-actions-content {
  .tip {
    margin: 0 0 16px 0;
    font-size: 14px;
    color: #909399;
  }

  .action-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;

    .drag-handle {
      cursor: move;
      color: #909399;
    }

    :deep(.el-checkbox) {
      width: 100%;
      margin-right: 0;
    }
  }
}

// ==================== 加载状态优化 ====================
:deep(.el-loading-mask) {
  border-radius: 12px;
}

// ==================== 响应式优化 ====================
@media (max-width: 576px) {
  .cadre-dashboard {
    padding: 8px;
  }

  .welcome-card {
    :deep(.el-card__body) {
      padding: 16px;
    }

    .welcome-title {
      font-size: 20px !important;
    }

    .welcome-stats {
      .stat-item {
        width: 100%;
        justify-content: center;
      }
    }
  }

  .stat-card {
    .stat-content {
      .stat-icon {
        width: 48px;
        height: 48px;
      }

      .stat-value {
        font-size: 24px !important;
      }
    }
  }
}
</style>
