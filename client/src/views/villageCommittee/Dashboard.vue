<template>
  <div class="dashboard-container">
    <!-- 欢迎栏 -->
    <el-card class="welcome-card" shadow="never">
      <div class="welcome-content">
        <div class="welcome-info">
          <h1 class="welcome-title">欢迎回来，{{ userInfo.name }}</h1>
          <p class="welcome-subtitle">{{ getCurrentTime() }}，今天是 {{ formatDate(new Date()) }}</p>
        </div>
        <div class="welcome-weather" v-if="weather">
          <el-icon class="weather-icon" :size="30">
            <component :is="weatherIcon" />
          </el-icon>
          <span class="weather-text">{{ weather.temperature }}°C {{ weather.condition }}</span>
        </div>
      </div>
    </el-card>

    <!-- 数据概览卡片 -->
    <el-row :gutter="20" class="overview-row">
      <el-col :xs="12" :sm="6" :md="4" v-for="item in overviewData" :key="item.key">
        <el-card class="overview-card" shadow="hover" @click="navigateToModule(item.route)">
          <div class="overview-content">
            <div class="overview-icon" :style="{ backgroundColor: item.bgColor }">
              <el-icon :size="30" :color="item.color">
                <component :is="item.icon" />
              </el-icon>
            </div>
            <div class="overview-info">
              <div class="overview-value">{{ item.value }}</div>
              <div class="overview-label">{{ item.label }}</div>
              <div class="overview-trend" :class="item.trend">
                <el-icon size="12">
                  <component :is="item.trendIcon" />
                </el-icon>
                <span>{{ item.change }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 主要内容区域 -->
    <el-row :gutter="20" class="content-row">
      <!-- 左侧内容 -->
      <el-col :xs="24" :sm="24" :md="16" :lg="16" :xl="16">
        <!-- 今日值班 -->
        <el-card class="duty-card" shadow="never" v-if="onDutyToday.length">
          <template #header>
            <div class="card-header">
              <span class="card-title">今日值班</span>
              <el-tag type="success">{{ formatDate(new Date()) }}</el-tag>
            </div>
          </template>
          <el-carousel :interval="0" arrow="hover" height="120px">
            <el-carousel-item v-for="duty in onDutyToday" :key="duty.id">
              <div class="duty-item">
                <el-avatar :size="60" :src="duty.avatar">
                  {{ duty.memberName?.charAt(0) }}
                </el-avatar>
                <div class="duty-info">
                  <h4>{{ duty.memberName }} - {{ duty.period }}</h4>
                  <p>{{ duty.position }}</p>
                  <ContactButton
                    :phone-number="duty.contact"
                    contact-type="phone"
                    size="small"
                    :confirm-before-call="true"
                  />
                </div>
              </div>
            </el-carousel-item>
          </el-carousel>
        </el-card>

        <!-- 工作台快捷入口 -->
        <el-card class="workspace-card" shadow="never">
          <template #header>
            <span class="card-title">工作台</span>
          </template>
          <el-row :gutter="20">
            <el-col :xs="12" :sm="8" :md="6" v-for="tool in workspaceTools" :key="tool.key">
              <div class="tool-item" @click="handleToolClick(tool)">
                <el-icon class="tool-icon" :size="40" :color="tool.color">
                  <component :is="tool.icon" />
                </el-icon>
                <span class="tool-label">{{ tool.label }}</span>
                <el-badge v-if="tool.badge" :value="tool.badge" type="danger" />
              </div>
            </el-col>
          </el-row>
        </el-card>

        <!-- 待办事项 -->
        <el-card class="todo-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span class="card-title">待办事项</span>
              <el-button text @click="viewAllTodos">查看全部</el-button>
            </div>
          </template>
          <el-table :data="todoList" style="width: 100%">
            <el-table-column prop="title" label="事项" />
            <el-table-column prop="type" label="类型" width="100">
              <template #default="scope">
                <el-tag :type="getTodoTypeTagType(scope.row.type)" size="small">
                  {{ scope.row.type }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="deadline" label="截止时间" width="150">
              <template #default="scope">
                <span :class="{ 'text-danger': isOverdue(scope.row.deadline) }">
                  {{ formatDate(scope.row.deadline) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="scope">
                <el-button type="primary" size="small" @click="handleTodo(scope.row)">
                  处理
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 右侧内容 -->
      <el-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
        <!-- 公告通知 -->
        <el-card class="notice-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span class="card-title">公告通知</span>
              <el-button text @click="viewAllNotices">更多</el-button>
            </div>
          </template>
          <div class="notice-list">
            <div
              class="notice-item"
              v-for="notice in noticeList"
              :key="notice.id"
              @click="viewNotice(notice)"
            >
              <el-tag :type="getNoticeTagType(notice.level)" size="small">
                {{ notice.level }}
              </el-tag>
              <div class="notice-content">
                <h4>{{ notice.title }}</h4>
                <p>{{ formatDate(notice.createdAt) }}</p>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 快速操作 -->
        <el-card class="quick-action-card" shadow="never">
          <template #header>
            <span class="card-title">快速操作</span>
          </template>
          <div class="quick-actions">
            <el-button type="primary" @click="showEmergencyDialog = true" class="quick-btn">
              <el-icon><Bell /></el-icon>
              紧急通知
            </el-button>
            <el-button type="success" @click="handleQuickAdd('member')" class="quick-btn">
              <el-icon><Plus /></el-icon>
              添加人员
            </el-button>
            <el-button type="warning" @click="handleQuickAdd('schedule')" class="quick-btn">
              <el-icon><Calendar /></el-icon>
              添加值班
            </el-button>
            <el-button type="info" @click="handleExportReport" class="quick-btn">
              <el-icon><Download /></el-icon>
              导出报表
            </el-button>
          </div>
        </el-card>

        <!-- 系统消息 -->
        <el-card class="message-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span class="card-title">系统消息</span>
              <el-badge :value="unreadMessages" type="danger" />
            </div>
          </template>
          <div class="message-list">
            <div
              class="message-item"
              v-for="message in messageList"
              :key="message.id"
              :class="{ 'unread': !message.read }"
              @click="viewMessage(message)"
            >
              <el-icon class="message-icon" :color="message.color">
                <component :is="message.icon" />
              </el-icon>
              <div class="message-content">
                <p>{{ message.content }}</p>
                <span>{{ formatRelativeTime(message.createdAt) }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 紧急通知对话框 -->
    <el-dialog
      v-model="showEmergencyDialog"
      title="发送紧急通知"
      width="500px"
      :fullscreen="isMobile"
    >
      <el-form :model="emergencyForm" label-width="100px">
        <el-form-item label="通知类型">
          <el-select v-model="emergencyForm.type" placeholder="请选择通知类型">
            <el-option label="紧急事件" value="emergency" />
            <el-option label="自然灾害" value="disaster" />
            <el-option label="公共卫生" value="health" />
            <el-option label="安全事故" value="safety" />
          </el-select>
        </el-form-item>
        <el-form-item label="通知标题">
          <el-input v-model="emergencyForm.title" placeholder="请输入通知标题" />
        </el-form-item>
        <el-form-item label="通知内容">
          <el-input
            v-model="emergencyForm.content"
            type="textarea"
            :rows="4"
            placeholder="请输入通知内容"
          />
        </el-form-item>
        <el-form-item label="通知范围">
          <el-checkbox-group v-model="emergencyForm.targets">
            <el-checkbox label="all">全体村民</el-checkbox>
            <el-checkbox label="members">村委人员</el-checkbox>
            <el-checkbox label="party">党员同志</el-checkbox>
            <el-checkbox label="volunteers">志愿者</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEmergencyDialog = false">取消</el-button>
        <el-button type="primary" @click="sendEmergencyNotification">发送</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCommitteeStore } from '@/stores/villageCommittee/committeeStore'
import { useResponsive } from '@/composables/useResponsive'
import { ContactButton } from '@/components/villageCommittee/ContactButton.vue'
import {
  formatDate,
  formatRelativeTime
} from '@/utils/format'
import {
  Bell,
  Plus,
  Calendar,
  Download,
  User,
  UserFilled,
  House,
  MapLocation,
  DataAnalysis,
  Setting,
  Warning,
  Sunny,
  Cloudy
} from '@element-plus/icons-vue'

const router = useRouter()
const committeeStore = useCommitteeStore()
const { isMobile } = useResponsive()

// 响应式数据
const showEmergencyDialog = ref(false)
const emergencyForm = ref({
  type: '',
  title: '',
  content: '',
  targets: []
})

const userInfo = ref({
  name: '张三',
  position: '村支书'
})

const weather = ref({
  temperature: 25,
  condition: '晴朗',
  icon: 'Sunny'
})

// 概览数据
const overviewData = ref([
  {
    key: 'members',
    label: '村委人员',
    value: '12',
    icon: 'User',
    color: '#409eff',
    bgColor: '#ecf5ff',
    change: '+2',
    trend: 'up',
    trendIcon: 'ArrowUp',
    route: '/village-committee/members'
  },
  {
    key: 'party',
    label: '党员人数',
    value: '156',
    icon: 'UserFilled',
    color: '#f56c6c',
    bgColor: '#fef0f0',
    change: '+5',
    trend: 'up',
    trendIcon: 'ArrowUp',
    route: '/village-committee/party-members'
  },
  {
    key: 'households',
    label: '住户总数',
    value: '486',
    icon: 'House',
    color: '#67c23a',
    bgColor: '#f0f9ff',
    change: '+3',
    trend: 'up',
    trendIcon: 'ArrowUp',
    route: '/village-committee/household-code'
  },
  {
    key: 'events',
    label: '本月事件',
    value: '8',
    icon: 'Warning',
    color: '#e6a23c',
    bgColor: '#fdf6ec',
    change: '-2',
    trend: 'down',
    trendIcon: 'ArrowDown',
    route: '/village-committee/village-map'
  }
])

// 工作台工具
const workspaceTools = ref([
  {
    key: 'member',
    label: '人员管理',
    icon: 'User',
    color: '#409eff',
    route: '/village-committee/members'
  },
  {
    key: 'party',
    label: '党员信息',
    icon: 'UserFilled',
    color: '#f56c6c',
    route: '/village-committee/party-members'
  },
  {
    key: 'schedule',
    label: '值班表',
    icon: 'Calendar',
    color: '#67c23a',
    route: '/village-committee/duty-schedule'
  },
  {
    key: 'map',
    label: '村情地图',
    icon: 'MapLocation',
    color: '#e6a23c',
    route: '/village-committee/village-map'
  },
  {
    key: 'code',
    label: '一户一码',
    icon: 'House',
    color: '#909399',
    route: '/village-committee/household-code'
  },
  {
    key: 'transfer',
    label: '人员调任',
    icon: 'Setting',
    color: '#606266',
    route: '/village-committee/transfer'
  }
])

// 待办事项
const todoList = ref([
  {
    id: 1,
    title: '审批张三的调任申请',
    type: '人事',
    deadline: '2024-12-20'
  },
  {
    id: 2,
    title: '完善党员档案信息',
    type: '党务',
    deadline: '2024-12-22'
  },
  {
    id: 3,
    title: '提交本月工作总结',
    type: '行政',
    deadline: '2024-12-25'
  }
])

// 公告通知
const noticeList = ref([
  {
    id: 1,
    title: '关于召开村委会议的通知',
    level: '重要',
    createdAt: '2024-12-18'
  },
  {
    id: 2,
    title: '冬季防火安全提示',
    level: '一般',
    createdAt: '2024-12-17'
  },
  {
    id: 3,
    title: '关于开展主题党日活动的通知',
    level: '通知',
    createdAt: '2024-12-16'
  }
])

// 系统消息
const messageList = ref([
  {
    id: 1,
    content: '您有一个新的调任申请需要审批',
    icon: 'Bell',
    color: '#e6a23c',
    createdAt: '2024-12-19 09:00',
    read: false
  },
  {
    id: 2,
    content: '系统将在今晚进行维护升级',
    icon: 'Warning',
    color: '#f56c6c',
    createdAt: '2024-12-18 18:00',
    read: true
  }
])

// 计算属性
const onDutyToday = computed(() => committeeStore.onDutyToday)

const unreadMessages = computed(() => {
  return messageList.value.filter(m => !m.read).length
})

const weatherIcon = computed(() => {
  const iconMap = {
    '晴朗': 'Sunny',
    '多云': 'Cloudy'
  }
  return iconMap[weather.value.icon] || 'Sunny'
})

// 方法
const getCurrentTime = () => {
  const hour = new Date().getHours()
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

const navigateToModule = (route) => {
  router.push(route)
}

const handleToolClick = (tool) => {
  if (tool.route) {
    router.push(tool.route)
  } else {
    // 处理其他工具点击
    ElMessage.info(`${tool.label}功能开发中...`)
  }
}

const viewAllTodos = () => {
  ElMessage.info('查看全部待办事项')
}

const handleTodo = (todo) => {
  ElMessage.info(`处理: ${todo.title}`)
}

const viewAllNotices = () => {
  ElMessage.info('查看全部公告通知')
}

const viewNotice = (notice) => {
  ElMessage.info(`查看公告: ${notice.title}`)
}

const handleQuickAdd = (type) => {
  const routeMap = {
    member: '/village-committee/members',
    schedule: '/village-committee/duty-schedule'
  }

  if (routeMap[type]) {
    router.push(routeMap[type])
  }
}

const handleExportReport = () => {
  ElMessage.success('报表导出中...')
}

const viewMessage = (message) => {
  message.read = true
  ElMessage.info(message.content)
}

const sendEmergencyNotification = () => {
  ElMessage.success('紧急通知发送成功')
  showEmergencyDialog.value = false
}

// 辅助函数
const getTodoTypeTagType = (type) => {
  const typeMap = {
    '人事': 'primary',
    '党务': 'danger',
    '行政': 'warning',
    '财务': 'success'
  }
  return typeMap[type] || ''
}

const getNoticeTagType = (level) => {
  const typeMap = {
    '重要': 'danger',
    '紧急': 'danger',
    '一般': 'info',
    '通知': 'primary'
  }
  return typeMap[level] || ''
}

const isOverdue = (deadline) => {
  return new Date(deadline) < new Date()
}

// 生命周期
onMounted(async () => {
  try {
    // 加载必要的数据
    await Promise.all([
      committeeStore.fetchDutySchedule(),
      committeeStore.fetchMembers()
    ])
  } catch (error) {
    console.error('加载仪表盘数据失败:', error)
  }
})
</script>

<style lang="scss" scoped>
.dashboard-container {
  padding: 20px;

  @media (max-width: 768px) {
    padding: 10px;
  }
}

.welcome-card {
  margin-bottom: 20px;

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
        margin: 0;
        font-size: 24px;
        color: #303133;
        font-weight: 600;

        @media (max-width: 768px) {
          font-size: 20px;
        }
      }

      .welcome-subtitle {
        margin: 5px 0 0 0;
        color: #909399;
        font-size: 14px;
      }
    }

    .welcome-weather {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #606266;

      .weather-text {
        font-size: 16px;
        font-weight: 500;
      }
    }
  }
}

.overview-row {
  margin-bottom: 20px;

  .overview-card {
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .overview-content {
      display: flex;
      align-items: center;
      gap: 15px;

      .overview-icon {
        width: 60px;
        height: 60px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .overview-info {
        flex: 1;

        .overview-value {
          font-size: 28px;
          font-weight: 600;
          color: #303133;
          line-height: 1;
        }

        .overview-label {
          font-size: 14px;
          color: #909399;
          margin: 5px 0;
        }

        .overview-trend {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;

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

.content-row {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .card-title {
      font-weight: 600;
      color: #303133;
    }
  }
}

.duty-card {
  margin-bottom: 20px;

  .duty-item {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 20px;

    .duty-info {
      flex: 1;

      h4 {
        margin: 0 0 5px 0;
        color: #303133;
      }

      p {
        margin: 0 0 10px 0;
        color: #909399;
        font-size: 14px;
      }
    }
  }
}

.workspace-card {
  margin-bottom: 20px;

  .tool-item {
    text-align: center;
    padding: 20px;
    cursor: pointer;
    transition: all 0.3s;
    position: relative;

    &:hover {
      background: #f5f7fa;
      border-radius: 8px;
    }

    .tool-icon {
      margin-bottom: 10px;
    }

    .tool-label {
      display: block;
      color: #606266;
      font-size: 14px;
    }
  }
}

.todo-card {
  margin-bottom: 20px;

  .text-danger {
    color: #f56c6c;
  }
}

.notice-card,
.message-card {
  margin-bottom: 20px;

  .notice-list,
  .message-list {
    .notice-item,
    .message-item {
      padding: 12px 0;
      border-bottom: 1px solid #ebeef5;
      cursor: pointer;
      transition: all 0.3s;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: #f5f7fa;
        margin: 0 -20px;
        padding: 12px 20px;
      }

      .notice-content {
        display: inline-block;
        margin-left: 10px;

        h4 {
          margin: 0 0 5px 0;
          font-size: 14px;
          color: #303133;
        }

        p {
          margin: 0;
          font-size: 12px;
          color: #909399;
        }
      }

      &.unread {
        font-weight: 600;
      }
    }

    .message-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;

      .message-content {
        flex: 1;

        p {
          margin: 0 0 5px 0;
          color: #303133;
          font-size: 14px;
        }

        span {
          font-size: 12px;
          color: #909399;
        }
      }
    }
  }
}

.quick-action-card {
  margin-bottom: 20px;

  .quick-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;

    .quick-btn {
      height: 60px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 5px;
    }
  }
}

// 响应式调整
@media (max-width: 768px) {
  .overview-row {
    .el-col {
      margin-bottom: 10px;
    }
  }

  .workspace-row {
    .el-col {
      margin-bottom: 10px;
    }
  }

  .quick-actions {
    grid-template-columns: 1fr;
  }
}
</style>