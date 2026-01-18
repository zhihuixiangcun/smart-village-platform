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
          <el-select
            v-model="filters.todoStatus"
            placeholder="待办状态"
            clearable
            size="small"
            style="width: 120px"
          >
            <el-option label="全部" value="" />
            <el-option label="待处理" value="pending" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="已完成" value="completed" />
          </el-select>
          <el-select
            v-model="filters.todoType"
            placeholder="待办类型"
            clearable
            size="small"
            style="width: 120px"
          >
            <el-option label="全部" value="" />
            <el-option label="人事" value="人事" />
            <el-option label="党务" value="党务" />
            <el-option label="行政" value="行政" />
            <el-option label="财务" value="财务" />
            <el-option label="应急" value="应急" />
          </el-select>
          <el-select
            v-model="filters.noticeLevel"
            placeholder="通知级别"
            clearable
            size="small"
            style="width: 120px"
          >
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
            <div ref="chartRef" style="height: 300px"></div>
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
              :class="{ urgent: isUrgent(todo.deadline), completed: todo.completed }"
            >
              <div class="todo-content">
                <el-checkbox v-model="todo.completed" @change="toggleTodoStatus(todo)">
                  <span class="todo-title">{{ todo.title }}</span>
                </el-checkbox>
                <div class="todo-meta">
                  <el-tag :type="getTodoTypeTag(todo.type)" size="small">{{ todo.type }}</el-tag>
                  <span class="todo-deadline" :class="{ overdue: isOverdue(todo.deadline) }">
                    <el-icon><Clock /></el-icon>
                    {{ formatDeadline(todo.deadline) }}
                  </span>
                </div>
              </div>
              <div class="todo-actions">
                <el-button type="primary" size="small" @click="handleTodo(todo)"> 处理 </el-button>
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
            <el-button
              type="danger"
              @click="showEmergencyDialog = true"
              class="quick-btn emergency"
            >
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
              :class="{ unread: !notice.read }"
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
      <el-form
        :model="emergencyForm"
        :rules="emergencyRules"
        ref="emergencyFormRef"
        label-width="100px"
      >
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
          <el-input
            v-model="emergencyForm.title"
            placeholder="请输入通知标题"
            maxlength="100"
            show-word-limit
          />
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
  </div>
</template>

<script setup>
 import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
 import { useRouter } from 'vue-router';
 import { useUserStore } from '@/stores/userStore';
 import { ElMessage, ElMessageBox } from 'element-plus';
 import * as echarts from 'echarts';
 import draggable from 'vuedraggable';
 import dashboardApi from '@/api/dashboard';
 import ContactButton from '@/components/villageCommittee/ContactButton.vue';
 import NotificationDetailDialog from '@/components/villageCommittee/NotificationDetailDialog.vue';
 import { useDashboardRealtime } from '@/composables/useDashboardRealtime';
 import { useDashboardData } from '@/composables/useDashboardData';
import {
  Trophy,
  CircleCheck,
  Calendar,
  Phone,
  List,
  ArrowRight,
  Bell,
  Grid,
  Plus, // Plus 替代 UserPlus
  Promotion,
  Download,
  Location,
  Notification,
  ChatDotRound,
  Clock,
  DataAnalysis,
  ArrowUp,
  ArrowDown,
  Connection,
  Filter,
  Search,
  RefreshLeft,
  ArrowDown as DropdownArrow,
  Document,
  Tickets,
  Files,
  Setting,
  Rank,
  User,
  FolderOpened,
  Upload,
  ShoppingCart,
} from '@element-plus/icons-vue';

/**
 * 村干部主页组件
 * @description 提供数据概览、快捷操作、待办事项、通知和村民动态等功能
 */
const router = useRouter();
const userStore = useUserStore();

const dashboardDataManager = useDashboardData();

// 实时更新连接
const realtime = useDashboardRealtime({
  onNotificationUpdate: async data => {
    if (data.action === 'created' || !data.action) {
      const villageId = userStore.villageId || 'default';
      try {
        const response = await dashboardApi.getNotifications({ limit: 10 });
        if (response.data?.notifications) {
          noticeList.value = response.data.notifications.map(n => ({
            _id: n._id || n.id,
            title: n.title,
            level: n.priority || n.level || '一般',
            content: n.content,
            createdAt: n.createdAt || n.created_at,
            read: n.read || false,
          }));
        }
      } catch (error) {
        console.error('刷新通知列表失败:', error);
      }
    }

    if (data.action === 'deleted' && data.notificationId) {
      noticeList.value = noticeList.value.filter(n => n._id !== data.notificationId);
    }

    if (data.action === 'read' && data.notificationId) {
      const notice = noticeList.value.find(n => n._id === data.notificationId);
      if (notice) {
        notice.read = true;
      }
    }
  },

  onTodoUpdate: async data => {
    try {
      const response = await dashboardApi.getTodos({ limit: 10, status: 'pending' });
      if (response.data?.tasks) {
        todoList.value = response.data.tasks.map(task => ({
          _id: task._id || task.id,
          title: task.title,
          type: task.category || task.type || '待办',
          deadline: task.dueDate || task.deadline,
          completed: task.status === 'completed',
          status: task.status || 'pending',
        }));
      }
    } catch (error) {
      console.error('刷新待办列表失败:', error);
    }
  },

  onDutyUpdate: async data => {
    try {
      const villageId = userStore.villageId || 'default';
      const response = await dashboardApi.getTodayDuty(villageId);
      if (response.data?.schedule) {
        todayDuty.value = response.data.schedule;
      }
    } catch (error) {
      console.error('刷新值班表失败:', error);
    }
  },

  onStatisticsUpdate: data => {
    if (data.statistics) {
      statisticsCards.value.forEach(card => {
        if (data.statistics[card.key] !== undefined) {
          card.value = data.statistics[card.key];
        }
      });
    }
  },

  onEmergencyAlert: data => {
    ElMessage.error({
      message: data.message || '收到紧急通知',
      duration: 0,
      showClose: true,
    });
  },
});

// ==================== 响应式状态 ====================
const chartRef = ref(null);
const chartPeriod = ref('week');
const chartInstance = ref(null);
const showEmergencyDialog = ref(false);
const showNotificationDialog = ref(false);
const showCustomActionDialog = ref(false);
const sendingEmergency = ref(false);
const isMobile = ref(window.innerWidth < 768);
const selectedNotice = ref(null);
const loading = ref(false);
const chartLoading = ref(false);

// 数据筛选
const filters = ref({
  todoStatus: '',
  todoType: '',
  noticeLevel: '',
  dateRange: null,
});

// 筛选状态
const todoFilter = ref('all');
const noticeFilter = ref('all');
const activityTimeRange = ref('today');

// ==================== 计算属性 ====================
/**
 * 当前用户信息
 */
const currentUser = computed(() => userStore.userInfo || {});

/**
 * 积分和待处理任务数
 */
const monthlyPoints = ref(0);
const pendingTasks = ref(0);

/**
 * 统计卡片数据
 */
const statisticsCards = ref([]);

// ==================== 数据列表 ====================
const todayDuty = ref([]);
const todoList = ref([]);
const noticeList = ref([]);
const activityList = ref([]);

/**
 * 筛选后的待办列表
 */
const filteredTodoList = computed(() => {
  let list = [...todoList.value];
  if (todoFilter.value === 'pending') {
    list = list.filter(t => !t.completed);
  } else if (todoFilter.value === 'completed') {
    list = list.filter(t => t.completed);
  } else if (todoFilter.value === 'urgent') {
    list = list.filter(t => isUrgent(t.deadline));
  }
  return list;
});

/**
 * 筛选后的通知列表
 */
const filteredNoticeList = computed(() => {
  let list = [...noticeList.value];
  if (noticeFilter.value !== 'all') {
    list = list.filter(n => {
      const levelMap = { urgent: '紧急', important: '重要', general: '一般' };
      return n.level === levelMap[noticeFilter.value];
    });
  }
  return list;
});

/**
 * 筛选后的活动列表
 */
const filteredActivityList = computed(() => {
  const now = Date.now();
  let list = [...activityList.value];

  if (activityTimeRange.value === 'today') {
    const oneDay = 24 * 60 * 60 * 1000;
    list = list.filter(a => now - new Date(a.createdAt).getTime() < oneDay);
  } else if (activityTimeRange.value === 'week') {
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    list = list.filter(a => now - new Date(a.createdAt).getTime() < oneWeek);
  }
  return list;
});

/**
 * 活动时间范围标签
 */
const activityTimeRangeLabel = computed(() => {
  const labels = { today: '今天', week: '本周', month: '本月' };
  return labels[activityTimeRange.value] || '本月';
});

/**
 * 未读通知数量
 */
const unreadNotices = computed(() => {
  return noticeList.value.filter(n => !n.read).length;
});

// ==================== 快捷操作配置 ====================
// 所有可用的快捷操作
const allQuickActions = ref([
  {
    id: 'committee-manage',
    label: '村委管理',
    icon: 'UserFilled',
    route: '/village/committee-management',
    default: true,
    color: '#67c23a',
  },
  {
    id: 'population-manage',
    label: '人口管理',
    icon: 'Users',
    route: '/village/population-management',
    default: true,
    color: '#409eff',
  },
  {
    id: 'add-member',
    label: '添加人员',
    icon: 'User',
    route: '/village-committee/members',
    default: true,
  },
  {
    id: 'add-schedule',
    label: '添加值班',
    icon: 'Calendar',
    route: '/village-committee/duty-schedule',
    default: true,
  },
  {
    id: 'publish-notice',
    label: '发布公告',
    icon: 'Promotion',
    route: '/announcements/create',
    default: true,
  },
  { id: 'export-report', label: '导出报表', icon: 'Download', action: 'export', default: true },
  {
    id: 'view-map',
    label: '村情地图',
    icon: 'Location',
    route: '/village-committee/village-map',
    default: true,
  },
  {
    id: 'data-collection',
    label: '资料收集',
    icon: 'FolderOpened',
    route: '/village-committee/data-collection',
    default: true,
  },
  {
    id: 'data-submission',
    label: '资料上交',
    icon: 'Upload',
    route: '/village-committee/data-submission',
    default: true,
  },
  {
    id: 'product-publish',
    label: '产品发布',
    icon: 'ShoppingCart',
    route: '/village-committee/product-management',
    default: true,
  },
]);

// 选中的快捷操作ID
const selectedQuickActions = ref([]);

/**
 * 显示的快捷操作列表
 */
const quickActionsList = computed(() => {
  return allQuickActions.value.filter(action => selectedQuickActions.value.includes(action.id));
});

// ==================== 表单数据 ====================
const emergencyForm = ref({
  type: '',
  title: '',
  content: '',
  targets: [],
  channels: ['app'],
});

const emergencyRules = {
  type: [{ required: true, message: '请选择通知类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入通知标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入通知内容', trigger: 'blur' }],
  targets: [{ type: 'array', min: 1, message: '请选择通知范围', trigger: 'change' }],
};

// ==================== 工具函数 ====================

/**
 * 根据当前时间获取问候语
 * @returns {string} 问候语
 */
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 6) return '凌晨好';
  if (hour < 9) return '早上好';
  if (hour < 12) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  if (hour < 22) return '晚上好';
  return '夜深了';
};

/**
 * 格式化日期
 * @param {Date|string} date - 日期对象或日期字符串
 * @returns {string} 格式化后的日期 (YYYY-MM-DD)
 */
const formatDate = date => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 格式化相对时间
 * @param {Date|string} date - 日期
 * @returns {string} 相对时间描述
 */
const formatRelativeTime = date => {
  if (!date) return '';
  const now = new Date();
  const target = new Date(date);
  const diff = now - target;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return formatDate(date);
};

/**
 * 格式化截止时间
 * @param {Date|string} date - 日期
 * @returns {string} 格式化的截止时间
 */
const formatDeadline = date => {
  if (!date) return '无截止日期';
  const deadline = new Date(date);
  const now = new Date();
  const diff = deadline - now;
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (diff < 0) return '已过期';
  if (hours < 24) return `${hours}小时后到期`;
  if (days < 7) return `${days}天后到期`;
  return formatDate(date);
};

/**
 * 判断任务是否紧急（24小时内）
 * @param {Date|string} deadline - 截止日期
 * @returns {boolean} 是否紧急
 */
const isUrgent = deadline => {
  if (!deadline) return false;
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diff = deadlineDate - now;
  return diff > 0 && diff < 24 * 60 * 60 * 1000;
};

/**
 * 判断任务是否过期
 * @param {Date|string} deadline - 截止日期
 * @returns {boolean} 是否过期
 */
const isOverdue = deadline => {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
};

/**
 * 获取待办类型标签颜色
 * @param {string} type - 待办类型
 * @returns {string} Element Plus 标签类型
 */
const getTodoTypeTag = type => {
  const typeMap = {
    人事: 'primary',
    党务: 'danger',
    行政: 'warning',
    财务: 'success',
    应急: 'danger',
  };
  return typeMap[type] || 'info';
};

/**
 * 获取通知级别标签颜色
 * @param {string} level - 通知级别
 * @returns {string} Element Plus 标签类型
 */
const getNoticeTypeTag = level => {
  const typeMap = {
    紧急: 'danger',
    重要: 'warning',
    一般: 'info',
    通知: 'primary',
  };
  return typeMap[level] || 'info';
};

// ==================== 交互处理函数 ====================

/**
 * 导航到指定路由
 * @param {string} route - 路由路径
 */
const navigateTo = route => {
  if (route) {
    router.push(route);
  }
};

/**
 * 切换待办事项状态
 * @param {Object} todo - 待办事项对象
 */
const toggleTodoStatus = async todo => {
  try {
    const status = todo.completed ? 'completed' : 'pending';
    await dashboardDataManager.toggleTodoStatus(todo._id, status);
    todo.status = status;
    ElMessage.success(todo.completed ? '已标记为完成' : '已标记为未完成');
  } catch (error) {
    console.error('更新待办状态失败:', error);
    ElMessage.error('操作失败');
    todo.completed = !todo.completed;
  }
};

/**
 * 处理待办事项
 * @param {Object} todo - 待办事项对象
 */
const handleTodo = todo => {
  ElMessage.info(`处理待办: ${todo.title}`);
  // TODO: 跳转到待办详情页面
  // router.push(`/tasks/${todo._id}`)
};

/**
 * 查看所有待办事项
 */
const viewAllTodos = () => {
  router.push('/tasks');
};

const viewNotice = async notice => {
  try {
    // 设置选中的通知
    selectedNotice.value = notice;

    // 打开通知详情对话框
    showNotificationDialog.value = true;

    // 标记为已读
    if (!notice.read) {
      await dashboardApi.markNotificationRead(notice._id);
      notice.read = true;
    }
  } catch (error) {
    console.error('标记通知已读失败:', error);
  }
};

const handleNotificationMarkedRead = async notice => {
  try {
    await dashboardApi.markNotificationRead(notice._id);
    // 更新列表中的通知状态
    const targetNotice = noticeList.value.find(n => n._id === notice._id);
    if (targetNotice) {
      targetNotice.read = true;
    }
  } catch (error) {
    console.error('标记通知已读失败:', error);
  }
};

const handleNotificationDeleted = async notice => {
  try {
    await dashboardApi.deleteNotification(notice._id);
    // 从列表中移除通知
    noticeList.value = noticeList.value.filter(n => n._id !== notice._id);
  } catch (error) {
    console.error('删除通知失败:', error);
  }
};

const handleDutyContact = ({ contact, success }) => {
  if (success) {
    ElMessage.success(`已联系值班人员: ${contact}`);
  }
};

/**
 * 快捷操作处理
 * @param {string} action - 操作类型
 */
const quickAction = action => {
  const actionConfig = allQuickActions.value.find(a => a.id === action);

  if (!actionConfig) {
    ElMessage.info('功能开发中...');
    return;
  }

  if (actionConfig.action === 'export') {
    showCustomActionDialog.value = true;
  } else if (actionConfig.route) {
    router.push(actionConfig.route);
  } else {
    ElMessage.info('功能开发中...');
  }
};

// ========== 数据筛选功能 ==========

// 应用筛选
const applyFilters = async () => {
  try {
    ElMessage.info('正在应用筛选条件...');

    const villageId = userStore.villageId || 'default';

    const params = {
      villageId,
      limit: 50,
    };

    if (filters.value.todoStatus) {
      params.status = filters.value.todoStatus;
    }
    if (filters.value.todoType) {
      params.type = filters.value.todoType;
    }
    if (filters.value.noticeLevel) {
      params.level = filters.value.noticeLevel;
    }
    if (filters.value.dateRange && filters.value.dateRange.length === 2) {
      params.startDate = formatDate(filters.value.dateRange[0]);
      params.endDate = formatDate(filters.value.dateRange[1]);
    }

    const [todosResponse, noticesResponse] = await Promise.allSettled([
      dashboardDataManager.fetchTodos(params),
      dashboardApi.getNotifications(params),
    ]);

    if (todosResponse.status === 'fulfilled' && todosResponse.value) {
      const tasks = todosResponse.value.tasks || todosResponse.value.data || [];
      todoList.value = Array.isArray(tasks)
        ? tasks.map(task => ({
            _id: task._id || task.id,
            title: task.title,
            type: task.category || task.type || '待办',
            deadline: task.dueDate || task.deadline,
            completed: task.status === 'completed',
            status: task.status || 'pending',
          }))
        : [];
    }

    if (noticesResponse.status === 'fulfilled' && noticesResponse.value?.data) {
      const noticesData = noticesResponse.value.data.notifications || noticesResponse.value.data;
      noticeList.value = Array.isArray(noticesData)
        ? noticesData.map(notice => ({
            _id: notice._id || notice.id,
            title: notice.title,
            level: notice.priority || notice.level || '一般',
            content: notice.content,
            createdAt: notice.createdAt || notice.created_at,
            read: notice.read || false,
          }))
        : [];
    }

    await autoSaveConfig();
    ElMessage.success('筛选完成');
  } catch (error) {
    console.error('应用筛选失败:', error);
    ElMessage.error('筛选失败，请重试');
  }
};

// 重置筛选
const resetFilters = async () => {
  filters.value = {
    todoStatus: '',
    todoType: '',
    noticeLevel: '',
    dateRange: null,
  };

  // 重新加载所有数据
  await loadData();
  ElMessage.success('筛选已重置');
};

// ========== 数据导出功能 ==========

// 处理导出
const handleExport = async command => {
  try {
    const villageId = userStore.villageId || 'default';

    if (command === 'all') {
      // 导出全部数据
      ElMessage.info('正在准备全部数据导出...');
      await exportAllData();
    } else {
      // 导出特定格式
      const formatMap = {
        excel: 'Excel',
        pdf: 'PDF',
        csv: 'CSV',
      };

      ElMessage.info(`正在生成 ${formatMap[command]} 报表...`);

      // 调用导出 API
      const response = await dashboardApi.exportReport({
        type: command,
        filters: {
          todoStatus: filters.value.todoStatus,
          todoType: filters.value.todoType,
          noticeLevel: filters.value.noticeLevel,
          dateRange: filters.value.dateRange
            ? [formatDate(filters.value.dateRange[0]), formatDate(filters.value.dateRange[1])]
            : null,
        },
        villageId,
      });

      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `村委仪表板报表_${formatDate(new Date())}.${command}`);
      document.body.appendChild(link);
      link.click();

      // 清理
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      ElMessage.success(`${formatMap[command]} 报表导出成功！`);
    }
  } catch (error) {
    console.error('导出失败:', error);
    ElMessage.error('导出失败，请重试');
  }
};

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
      activities: activityList.value,
    };

    // 创建 Blob 并下载
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `仪表板完整数据_${formatDate(new Date())}.json`);
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);

    ElMessage.success('完整数据导出成功！');
  } catch (error) {
    console.error('导出全部数据失败:', error);
    throw error;
  }
};

/**
 * 发送紧急通知
 */
const sendEmergencyNotice = async () => {
  // 手动验证表单
  if (!emergencyForm.value.type) {
    ElMessage.warning('请选择通知类型');
    return;
  }
  if (!emergencyForm.value.title) {
    ElMessage.warning('请输入通知标题');
    return;
  }
  if (!emergencyForm.value.content) {
    ElMessage.warning('请输入通知内容');
    return;
  }
  if (emergencyForm.value.targets.length === 0) {
    ElMessage.warning('请选择通知范围');
    return;
  }

  sendingEmergency.value = true;

  try {
    await dashboardApi.sendEmergencyNotification({
      type: emergencyForm.value.type,
      title: emergencyForm.value.title,
      content: emergencyForm.value.content,
      targets: emergencyForm.value.targets,
      channels: emergencyForm.value.channels,
    });

    ElMessage.success('紧急通知发送成功！');
    showEmergencyDialog.value = false;

    // 重置表单
    emergencyForm.value = {
      type: '',
      title: '',
      content: '',
      targets: [],
      channels: ['app'],
    };
  } catch (error) {
    console.error('发送紧急通知失败:', error);
    ElMessage.error(error.response?.data?.message || '发送失败，请重试');
  } finally {
    sendingEmergency.value = false;
  }
};

/**
 * 筛选待办事项
 * @param {string} filter - 筛选类型
 */
const filterTodos = filter => {
  todoFilter.value = filter;
};

/**
 * 筛选通知
 * @param {string} filter - 筛选类型
 */
const filterNotices = filter => {
  noticeFilter.value = filter;
};

/**
 * 筛选活动
 * @param {string} range - 时间范围
 */
const filterActivities = range => {
  activityTimeRange.value = range;
};

/**
 * 保存自定义快捷操作
 */
const saveCustomActions = async () => {
  try {
    await saveDashboardConfig({});
    localStorage.setItem('quickActions', JSON.stringify(selectedQuickActions.value));
    ElMessage.success('保存成功');
    showCustomActionDialog.value = false;
  } catch (error) {
    ElMessage.error('保存失败');
  }
};

/**
 * 图表周期变化处理
 */
const handleChartPeriodChange = async () => {
  chartLoading.value = true;
  try {
    const villageId = userStore.villageId || 'default';
    const stats = await dashboardDataManager.fetchStatistics({ villageId, period: chartPeriod.value });
    updateChart(stats);
    await autoSaveConfig();
  } catch (error) {
    console.error('加载图表数据失败:', error);
    updateChart();
  } finally {
    chartLoading.value = false;
  }
};

// ==================== 图表相关函数 ====================

/**
 * 初始化图表
 */
const initChart = async () => {
  await nextTick();
  if (!chartRef.value) return;

  chartInstance.value = echarts.init(chartRef.value);

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    legend: {
      data: ['新增村民', '处理事务', '发布公告'],
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: '新增村民',
        type: 'bar',
        data: [2, 4, 6, 3, 5, 8, 4],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#667eea' },
            { offset: 1, color: '#764ba2' },
          ]),
        },
      },
      {
        name: '处理事务',
        type: 'bar',
        data: [8, 12, 15, 10, 14, 18, 12],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#4facfe' },
            { offset: 1, color: '#00f2fe' },
          ]),
        },
      },
      {
        name: '发布公告',
        type: 'bar',
        data: [3, 5, 4, 6, 5, 8, 6],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#43e97b' },
            { offset: 1, color: '#38f9d7' },
          ]),
        },
      },
    ],
  };

  chartInstance.value.setOption(option);
};

/**
 * 更新图表数据
 * @param {Object} statsData - 从API获取的统计数据
 */
const updateChart = (statsData = null) => {
  if (!chartInstance.value) return;

  let data;

  if (statsData && statsData.data) {
    const apiData = statsData.data;
    data = {
      xAxis: apiData.labels || apiData.xAxis || [],
      series1: apiData.datasets?.[0]?.data || apiData.series1 || [],
      series2: apiData.datasets?.[1]?.data || apiData.series2 || [],
      series3: apiData.datasets?.[2]?.data || apiData.series3 || [],
    };
  } else {
    const dataMap = {
      week: {
        xAxis: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
        series1: [2, 4, 6, 3, 5, 8, 4],
        series2: [8, 12, 15, 10, 14, 18, 12],
        series3: [3, 5, 4, 6, 5, 8, 6],
      },
      month: {
        xAxis: ['第一周', '第二周', '第三周', '第四周'],
        series1: [15, 22, 18, 25],
        series2: [45, 52, 48, 55],
        series3: [12, 18, 15, 20],
      },
      year: {
        xAxis: [
          '1月',
          '2月',
          '3月',
          '4月',
          '5月',
          '6月',
          '7月',
          '8月',
          '9月',
          '10月',
          '11月',
          '12月',
        ],
        series1: [20, 25, 30, 28, 35, 40, 38, 42, 45, 50, 48, 55],
        series2: [50, 55, 60, 58, 65, 70, 68, 72, 75, 80, 78, 85],
        series3: [15, 18, 20, 22, 25, 28, 26, 30, 32, 35, 33, 38],
      },
    };
    data = dataMap[chartPeriod.value];
  }

  if (!data) return;

  chartInstance.value.setOption({
    xAxis: {
      data: data.xAxis,
    },
    series: [{ data: data.series1 }, { data: data.series2 }, { data: data.series3 }],
  });
};

/**
 * 加载仪表盘数据（使用useDashboardData）
 */
const loadDashboardData = async () => {
  try {
    const villageId = userStore.villageId || 'default';

    const [overviewData, todosData, statisticsData, settingsData, dutyResponse, noticesResponse, activitiesResponse] =
      await Promise.allSettled([
        dashboardDataManager.fetchOverview({ villageId }),
        dashboardDataManager.fetchTodos({ limit: 10, status: 'pending' }),
        dashboardDataManager.fetchStatistics({ villageId, period: 'month' }),
        dashboardDataManager.fetchSettings(userStore.userInfo?.id),
        dashboardApi.getTodayDuty(villageId),
        dashboardApi.getNotifications({ limit: 10 }),
        dashboardApi.getActivities({ limit: 10, villageId }),
      ]);

    if (overviewData.status === 'fulfilled' && overviewData.value) {
      const overview = overviewData.value;
      if (overview.statistics) {
        statisticsCards.value = [
          {
            key: 'residents',
            label: '村民总数',
            value: overview.statistics.residentCount?.toString() || '0',
            icon: 'UserFilled',
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            change: overview.statistics.residentsChange || '+0 本月',
            trendClass: overview.statistics.residentsTrend || 'up',
            trendIcon: ArrowUp,
            route: '/residents',
          },
          {
            key: 'households',
            label: '住户总数',
            value: overview.statistics.householdCount?.toString() || '0',
            icon: 'House',
            gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            change: overview.statistics.householdsChange || '+0 本月',
            trendClass: overview.statistics.householdsTrend || 'up',
            trendIcon: ArrowUp,
            route: '/household-codes',
          },
          {
            key: 'notices',
            label: '本月公告',
            value: overview.statistics.noticesCount?.toString() || '0',
            icon: 'ChatLineSquare',
            gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            change: overview.statistics.noticesChange || '+0 环比',
            trendClass: overview.statistics.noticesTrend || 'up',
            trendIcon: ArrowUp,
            route: '/announcements',
          },
          {
            key: 'tasks',
            label: '待办事项',
            value: overview.statistics.tasksCount?.toString() || '0',
            icon: List,
            gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            change: overview.statistics.tasksChange || '+0 较昨日',
            trendClass: overview.statistics.tasksTrend || 'down',
            trendIcon: ArrowDown,
            route: '/tasks',
          },
        ];
      }
      if (overview.monthlyPoints !== undefined) {
        monthlyPoints.value = overview.monthlyPoints;
      }
      if (overview.pendingTasks !== undefined) {
        pendingTasks.value = overview.pendingTasks;
      }
    }

    if (todosData.status === 'fulfilled' && todosData.value) {
      const tasks = todosData.value.tasks || todosData.value.data || [];
      todoList.value = Array.isArray(tasks)
        ? tasks.map(task => ({
            _id: task._id || task.id,
            title: task.title,
            type: task.category || task.type || '待办',
            deadline: task.dueDate || task.deadline,
            completed: task.status === 'completed',
            status: task.status || 'pending',
            priority: task.priority || 'medium',
          }))
        : [];
    }

    if (dutyResponse.status === 'fulfilled' && dutyResponse.value?.data) {
      const dutyData = dutyResponse.value.data;
      todayDuty.value = dutyData.schedule || dutyData || [];
    } else {
      todayDuty.value = [
        {
          _id: '1',
          memberName: '张三',
          position: '村支书',
          period: '上午 08:00-12:00',
          contact: '13800138000',
          avatar: '',
        },
        {
          _id: '2',
          memberName: '李四',
          position: '村主任',
          period: '下午 14:00-18:00',
          contact: '13800138001',
          avatar: '',
        },
      ];
    }

    if (noticesResponse.status === 'fulfilled' && noticesResponse.value?.data) {
      const noticesData = noticesResponse.value.data.notifications || noticesResponse.value.data;
      noticeList.value = Array.isArray(noticesData)
        ? noticesData.map(notice => ({
            _id: notice._id || notice.id,
            title: notice.title,
            level: notice.priority || notice.level || '一般',
            content: notice.content,
            createdAt: notice.createdAt || notice.created_at,
            read: notice.read || false,
          }))
        : [];
    } else {
      noticeList.value = [
        {
          _id: '1',
          title: '关于召开村委会议的通知',
          level: '重要',
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          read: false,
        },
        {
          _id: '2',
          title: '冬季防火安全提示',
          level: '一般',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          read: false,
        },
        {
          _id: '3',
          title: '关于开展主题党日活动的通知',
          level: '通知',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          read: true,
        },
      ];
    }

    if (activitiesResponse.status === 'fulfilled' && activitiesResponse.value?.data) {
      const activitiesData = activitiesResponse.value.data.activities || activitiesResponse.value.data;
      activityList.value = Array.isArray(activitiesData)
        ? activitiesData.map(activity => ({
            _id: activity._id || activity.id,
            userName: activity.userName || activity.user_name,
            userAvatar: activity.userAvatar || activity.avatar,
            action: activity.action || activity.description,
            createdAt: activity.createdAt || activity.created_at,
          }))
        : [];
    } else {
      activityList.value = [
        {
          _id: '1',
          userName: '王五',
          userAvatar: '',
          action: '提交了低保申请',
          createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        },
        {
          _id: '2',
          userName: '赵六',
          userAvatar: '',
          action: '咨询了医保政策',
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        },
        {
          _id: '3',
          userName: '孙七',
          userAvatar: '',
          action: '反馈了道路问题',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
      ];
    }

    if (settingsData.status === 'fulfilled' && settingsData.value) {
      const settings = settingsData.value;
      if (settings.widgets) {
        selectedQuickActions.value = settings.widgets || [];
      }
    }
  } catch (error) {
    console.warn('API加载失败，使用模拟数据:', error);
    await loadMockData();
  }
};

/**
 * 加载模拟数据（API失败时的备用方案）
 */
const loadMockData = async () => {
  await new Promise(resolve => setTimeout(resolve, 500));

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
      route: '/residents',
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
      route: '/household-codes',
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
      route: '/announcements',
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
      route: '/tasks',
    },
  ];

  monthlyPoints.value = 1250;
  pendingTasks.value = 8;
};

const loadData = loadDashboardData;

// ==================== Dashboard 数据保存功能 ====================

/**
 * 创建待办事项
 * @param {Object} todoData - 待办事项数据
 * @returns {Promise<Object>} 创建的待办事项
 */
const createTodoItem = async todoData => {
  try {
    const todo = {
      title: todoData.title,
      description: todoData.description || '',
      type: todoData.type || '待办',
      priority: todoData.priority || 'medium',
      status: 'pending',
      dueDate: todoData.dueDate || null,
    };

    const result = await dashboardDataManager.saveTodo(todo);
    todoList.value.push({
      _id: result._id || result.id,
      title: result.title,
      type: result.type || '待办',
      deadline: result.dueDate,
      completed: result.status === 'completed',
      status: result.status,
      priority: result.priority,
    });

    return result;
  } catch (error) {
    console.error('创建待办事项失败:', error);
    throw error;
  }
};

/**
 * 批量保存待办事项
 * @param {Array<Object>} todos - 待办事项数组
 * @returns {Promise<Object>} 保存结果
 */
const batchSaveTodoItems = async todos => {
  try {
    const result = await dashboardDataManager.batchSaveTodos(todos);

    const formattedTodos = todos.map(todo => ({
      _id: todo._id || todo.id,
      title: todo.title,
      type: todo.type || '待办',
      deadline: todo.dueDate,
      completed: todo.status === 'completed',
      status: todo.status || 'pending',
      priority: todo.priority || 'medium',
    }));

    todoList.value = [...todoList.value, ...formattedTodos];

    return result;
  } catch (error) {
    console.error('批量保存待办事项失败:', error);
    throw error;
  }
};

/**
 * 删除待办事项
 * @param {string} todoId - 待办事项ID
 * @returns {Promise<Object>} 删除结果
 */
const deleteTodoItem = async todoId => {
  try {
    await dashboardDataManager.deleteTodo(todoId);
    todoList.value = todoList.value.filter(t => t._id !== todoId);
  } catch (error) {
    console.error('删除待办事项失败:', error);
    throw error;
  }
};

/**
 * 批量删除待办事项
 * @param {Array<string>} todoIds - 待办事项ID数组
 * @returns {Promise<Object>} 删除结果
 */
const batchDeleteTodoItems = async todoIds => {
  try {
    await dashboardDataManager.batchDeleteTodos(todoIds);
    todoList.value = todoList.value.filter(t => !todoIds.includes(t._id));
  } catch (error) {
    console.error('批量删除待办事项失败:', error);
    throw error;
  }
};

/**
 * 更新待办事项
 * @param {string} todoId - 待办事项ID
 * @param {Object} updates - 更新数据
 * @returns {Promise<Object>} 更新结果
 */
const updateTodoItem = async (todoId, updates) => {
  try {
    const result = await dashboardDataManager.saveTodo({ id: todoId, ...updates });
    const index = todoList.value.findIndex(t => t._id === todoId);
    if (index !== -1) {
      todoList.value[index] = {
        ...todoList.value[index],
        ...updates,
        completed: updates.status === 'completed',
      };
    }
    return result;
  } catch (error) {
    console.error('更新待办事项失败:', error);
    throw error;
  }
};

/**
 * 保存Dashboard配置
 * @param {Object} config - Dashboard配置
 * @returns {Promise<Object>} 保存结果
 */
const saveDashboardConfig = async config => {
  try {
    const dashboardConfig = {
      widgets: selectedQuickActions.value,
      filters: filters.value,
      theme: '',
      layout: {
        chartPeriod: chartPeriod.value,
        ...config,
      },
    };

    const result = await dashboardDataManager.saveSettings(dashboardConfig);
    return result;
  } catch (error) {
    console.error('保存Dashboard配置失败:', error);
    throw error;
  }
};

/**
 * 保存图表配置
 * @param {string} chartId - 图表ID
 * @param {Object} config - 图表配置
 * @returns {Promise<Object>} 保存结果
 */
const saveChartSettings = async (chartId, config) => {
  try {
    const chartConfig = {
      chartId,
      period: chartPeriod.value,
      options: config,
    };

    const result = await dashboardDataManager.saveChartConfig(chartConfig);
    return result;
  } catch (error) {
    console.error('保存图表配置失败:', error);
    throw error;
  }
};

/**
 * 刷新Dashboard数据
 * @param {string} type - 数据类型 (all/overview/todos/statistics/settings)
 * @returns {Promise<Object>} 刷新后的数据
 */
const refreshDashboardData = async (type = 'all') => {
  try {
    loading.value = true;
    const villageId = userStore.villageId || 'default';

    const params = {
      overview: { villageId },
      todos: { limit: 10, status: 'pending' },
      statistics: { villageId, period: chartPeriod.value },
      userId: userStore.userInfo?.id,
    };

    const result = await dashboardDataManager.refreshData(type, params);

    if (type === 'all' || type === 'overview') {
      if (result.overview?.statistics) {
        const overview = result.overview;
        if (overview.statistics.residentCount !== undefined) {
          statisticsCards.value[0].value = overview.statistics.residentCount.toString();
        }
        if (overview.statistics.householdCount !== undefined) {
          statisticsCards.value[1].value = overview.statistics.householdCount.toString();
        }
        if (overview.statistics.noticesCount !== undefined) {
          statisticsCards.value[2].value = overview.statistics.noticesCount.toString();
        }
        if (overview.statistics.tasksCount !== undefined) {
          statisticsCards.value[3].value = overview.statistics.tasksCount.toString();
        }
        if (overview.monthlyPoints !== undefined) {
          monthlyPoints.value = overview.monthlyPoints;
        }
        if (overview.pendingTasks !== undefined) {
          pendingTasks.value = overview.pendingTasks;
        }
      }
    }

    if (type === 'all' || type === 'todos') {
      const todos = result.todos?.tasks || result.todos?.data || [];
      todoList.value = Array.isArray(todos)
        ? todos.map(task => ({
            _id: task._id || task.id,
            title: task.title,
            type: task.category || task.type || '待办',
            deadline: task.dueDate || task.deadline,
            completed: task.status === 'completed',
            status: task.status || 'pending',
            priority: task.priority || 'medium',
          }))
        : [];
    }

    if (type === 'all' || type === 'statistics') {
      await handleChartPeriodChange();
    }

    ElMessage.success('数据刷新成功');
    return result;
  } catch (error) {
    console.error('刷新数据失败:', error);
    ElMessage.error('刷新失败，请稍后重试');
    throw error;
  } finally {
    loading.value = false;
  }
};

/**
 * 自动保存配置（防抖）
 */
let autoSaveTimer = null;
const autoSaveConfig = async () => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }

  autoSaveTimer = setTimeout(async () => {
    try {
      await saveDashboardConfig({});
    } catch (error) {
      console.warn('自动保存失败:', error);
    }
  }, 2000);
};

/**
 * 清除所有缓存
 * @returns {Promise<void>}
 */
const clearAllCache = async () => {
  try {
    await dashboardDataManager.clearCache();
    ElMessage.success('缓存已清除');
  } catch (error) {
    console.error('清除缓存失败:', error);
    ElMessage.error('清除缓存失败');
  }
};

/**
 * 初始化快捷操作配置
 */
const initQuickActions = () => {
  // 从本地存储加载配置
  const saved = localStorage.getItem('quickActions');
  if (saved) {
    selectedQuickActions.value = JSON.parse(saved);
  } else {
    // 默认选中所有默认操作
    selectedQuickActions.value = allQuickActions.value.filter(a => a.default).map(a => a.id);
  }
};

/**
 * 窗口大小改变处理
 */
const handleResize = () => {
  isMobile.value = window.innerWidth < 768;
  if (chartInstance.value) {
    chartInstance.value.resize();
  }
};

// ==================== 生命周期钩子 ====================

onMounted(async () => {
  initQuickActions();
  await loadDashboardData();
  await nextTick();
  initChart();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  if (chartInstance.value) {
    chartInstance.value.dispose();
  }
  window.removeEventListener('resize', handleResize);
});

// ==================== 监听器 ====================

/**
 * 监听图表周期变化
 */
watch(chartPeriod, () => {
  handleChartPeriodChange();
});
</script>

<style lang="scss" scoped>
// ==================== 主容器样式 ====================
.cadre-dashboard {
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  min-height: 100vh;
  position: relative;

  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: radial-gradient(circle at 20% 30%, rgba(102, 126, 234, 0.03) 0%, transparent 50%),
                      radial-gradient(circle at 80% 70%, rgba(118, 75, 162, 0.03) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }

  @media (max-width: 768px) {
    padding: 12px;
  }

  > * {
    position: relative;
    z-index: 1;
  }
}

// ==================== 欢迎卡片样式 ====================
.welcome-card {
  margin-bottom: 24px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #5a3d7a 100%);
  color: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3),
              0 2px 8px rgba(0, 0, 0, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
  overflow: hidden;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 60%);
    animation: shimmer 15s infinite linear;
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.1), transparent);
    pointer-events: none;
  }

  :deep(.el-card__body) {
    padding: 32px 36px;
    position: relative;
    z-index: 1;

    @media (max-width: 768px) {
      padding: 24px;
    }
  }

  .welcome-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 24px;

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: flex-start;
    }

    .welcome-info {
      .welcome-title {
        margin: 0 0 12px 0;
        font-size: 32px;
        font-weight: 700;
        color: white;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        letter-spacing: -0.5px;
        animation: slideInLeft 0.6s ease-out;

        @media (max-width: 768px) {
          font-size: 24px;
        }
      }

      .welcome-subtitle {
        margin: 0 0 16px 0;
        font-size: 16px;
        opacity: 0.95;
        font-weight: 400;
        letter-spacing: 0.2px;
      }

      .welcome-position {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;

        .el-tag {
          border: none;
          background: rgba(255, 255, 255, 0.25);
          color: white;
          font-weight: 500;
          padding: 6px 14px;
          backdrop-filter: blur(10px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

          &:hover {
            background: rgba(255, 255, 255, 0.35);
            transform: translateY(-2px);
          }
        }
      }
    }

    .welcome-stats {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;

      .stat-item {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 15px;
        font-weight: 600;
        background: rgba(255, 255, 255, 0.18);
        padding: 14px 22px;
        border-radius: 14px;
        backdrop-filter: blur(12px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.15);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        animation: fadeInUp 0.6s ease-out;
        animation-fill-mode: both;

        &:nth-child(1) { animation-delay: 0.1s; }
        &:nth-child(2) { animation-delay: 0.2s; }
        &:nth-child(3) { animation-delay: 0.3s; }

        &.connection-status {
          &.connected {
            background: rgba(103, 194, 58, 0.22);
            border-color: rgba(103, 194, 58, 0.3);
          }

          &.disconnected {
            background: rgba(245, 108, 108, 0.22);
            border-color: rgba(245, 108, 108, 0.3);
          }

          &.connecting {
            background: rgba(230, 162, 60, 0.22);
            border-color: rgba(230, 162, 60, 0.3);
            animation: pulse 1.5s infinite;
          }

          &.error {
            background: rgba(245, 108, 108, 0.22);
            border-color: rgba(245, 108, 108, 0.3);
          }
        }

        &:hover {
          background: rgba(255, 255, 255, 0.28);
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }
      }
    }
  }
}

@keyframes shimmer {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// ==================== 统计卡片样式 ====================
.stats-row {
  margin-bottom: 24px;

  .stat-card {
    border: none;
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    background: white;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04),
                0 1px 3px rgba(0, 0, 0, 0.02);
    position: relative;
    overflow: hidden;
    animation: fadeInUp 0.6s ease-out;
    animation-fill-mode: both;

    &:nth-child(1) { animation-delay: 0.2s; }
    &:nth-child(2) { animation-delay: 0.3s; }
    &:nth-child(3) { animation-delay: 0.4s; }
    &:nth-child(4) { animation-delay: 0.5s; }

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
      opacity: 0;
      transition: opacity 0.3s;
    }

    &:hover {
      transform: translateY(-8px);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12),
                  0 8px 20px rgba(0, 0, 0, 0.06);
    }

    &:hover::before {
      opacity: 1;
    }

    .stat-content {
      display: flex;
      align-items: center;
      gap: 18px;
      padding: 8px 4px;

      .stat-icon {
        width: 72px;
        height: 72px;
        border-radius: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3);
        position: relative;
        overflow: hidden;

        &::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          transform: rotate(45deg);
          animation: iconShine 3s infinite;
        }
      }

      .stat-info {
        flex: 1;
        min-width: 0;

        .stat-value {
          font-size: 36px;
          font-weight: 800;
          color: #1a1a2e;
          line-height: 1.1;
          margin-bottom: 6px;
          letter-spacing: -1px;
          background: linear-gradient(135deg, #1a1a2e 0%, #2d3436 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;

          @media (max-width: 768px) {
            font-size: 28px;
          }
        }

        .stat-label {
          font-size: 14px;
          color: #6c757d;
          margin: 6px 0;
          font-weight: 500;
          letter-spacing: 0.3px;
        }

        .stat-trend {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 20px;
          transition: all 0.3s;

          &.up {
            color: #27ae60;
            background: rgba(39, 174, 96, 0.08);
          }

          &.down {
            color: #e74c3c;
            background: rgba(231, 76, 60, 0.08);
          }
        }
      }
    }
  }
}

@keyframes iconShine {
  0% { transform: translateX(-100%) rotate(45deg); }
  100% { transform: translateX(100%) rotate(45deg); }
}

// 筛选和导出工具栏
.toolbar-card {
  margin-bottom: 24px;
  border: none;
  border-radius: 16px;
  background: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04),
              0 1px 3px rgba(0, 0, 0, 0.02);

  :deep(.el-card__body) {
    padding: 18px 24px;
  }

  .toolbar-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: stretch;
      gap: 16px;
    }

    .filter-section {
      display: flex;
      align-items: center;
      gap: 14px;
      flex: 1;
      flex-wrap: wrap;

      @media (max-width: 768px) {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 600;
        color: #495057;
        white-space: nowrap;
        padding: 8px 12px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
      }

      :deep(.el-select),
      :deep(.el-date-picker) {
        flex-shrink: 0;
        transition: all 0.3s;

        &:hover {
          transform: translateY(-1px);
        }

        .el-input__wrapper {
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          transition: all 0.3s;
        }
      }

      :deep(.el-button) {
        border-radius: 10px;
        font-weight: 500;
        transition: all 0.3s;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
      }
    }

    .export-section {
      flex-shrink: 0;

      @media (max-width: 768px) {
        width: 100%;

        .el-button {
          width: 100%;
          height: 44px;
          font-weight: 600;
          border-radius: 12px;
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
    gap: 12px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e9ecef;

    .card-title {
      font-weight: 700;
      font-size: 17px;
      color: #2d3436;
      display: flex;
      align-items: center;
      gap: 10px;
      letter-spacing: -0.3px;

      .el-icon {
        color: #667eea;
        font-size: 20px;
      }
    }

    .card-actions {
      display: flex;
      align-items: center;
      gap: 8px;

      :deep(.el-button) {
        border-radius: 10px;
        font-weight: 500;
        transition: all 0.3s;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }
      }
    }
  }

  // ==================== 图表卡片 ====================
  .chart-card {
    margin-bottom: 24px;
    border: none;
    border-radius: 16px;
    background: white;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04),
                0 1px 3px rgba(0, 0, 0, 0.02);

    :deep(.el-card__body) {
      padding: 20px 24px;
    }

    .chart-container {
      padding: 16px 0;
    }

    :deep(.el-radio-group) {
      .el-radio-button {
        .el-radio-button__inner {
          border-radius: 8px;
          border: none;
          font-weight: 500;
          transition: all 0.3s;

          &:hover {
            transform: translateY(-1px);
          }
        }

        &.is-active {
          .el-radio-button__inner {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          }
        }
      }
    }
  }

  // ==================== 今日值班卡片 ====================
  .duty-card {
    margin-bottom: 24px;
    border: none;
    border-radius: 16px;
    background: white;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04),
                0 1px 3px rgba(0, 0, 0, 0.02);

    :deep(.el-card__header) {
      padding: 20px 24px 16px;
      border-bottom: 1px solid #e9ecef;
    }

    :deep(.el-card__body) {
      padding: 20px 24px;
    }

    .duty-list {
      display: flex;
      flex-direction: column;
      gap: 18px;

      .duty-item {
        display: flex;
        align-items: center;
        gap: 18px;
        padding: 20px;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border-radius: 14px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid transparent;
        position: relative;
        overflow: hidden;

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
          opacity: 0;
          transition: opacity 0.3s;
        }

        &:hover {
          background: linear-gradient(135deg, #e3e6ea 0%, #d1d5db 100%);
          transform: translateX(6px);
          border-color: rgba(102, 126, 234, 0.2);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        }

        &:hover::before {
          opacity: 1;
        }

        @media (max-width: 768px) {
          flex-wrap: wrap;
        }

        :deep(.el-avatar) {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border: 3px solid white;
        }

        .duty-info {
          flex: 1;

          h4 {
            margin: 0 0 6px 0;
            font-size: 18px;
            color: #2d3436;
            font-weight: 700;
            letter-spacing: -0.3px;
          }

          p {
            margin: 0;
            font-size: 14px;
            color: #6c757d;

            &.duty-period {
              color: #667eea;
              font-weight: 600;
              font-size: 13px;
              background: rgba(102, 126, 234, 0.1);
              padding: 4px 10px;
              border-radius: 20px;
              display: inline-block;
              margin-top: 6px;
            }
          }
        }

        .duty-actions {
          :deep(.el-button) {
            border-radius: 10px;
            font-weight: 600;
            transition: all 0.3s;

            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }
          }
        }
      }
    }
  }

  // ==================== 待办事项卡片 ====================
  .todo-card {
    margin-bottom: 24px;
    border: none;
    border-radius: 16px;
    background: white;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04),
                0 1px 3px rgba(0, 0, 0, 0.02);

    :deep(.el-card__header) {
      padding: 20px 24px 16px;
      border-bottom: 1px solid #e9ecef;
    }

    :deep(.el-card__body) {
      padding: 20px 24px;
    }

    .todo-badge {
      margin-left: 10px;
    }

    .todo-list {
      .todo-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 18px 20px;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border-radius: 12px;
        margin-bottom: 14px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid transparent;
        position: relative;
        overflow: hidden;

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
          opacity: 0;
          transition: opacity 0.3s;
        }

        &:hover {
          background: linear-gradient(135deg, #e3e6ea 0%, #d1d5db 100%);
          transform: translateX(4px);
          border-color: rgba(102, 126, 234, 0.2);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        }

        &:hover::before {
          opacity: 1;
        }

        &.urgent {
          &::before {
            background: linear-gradient(180deg, #f56c6c 0%, #e74c3c 100%);
          }

          border-left: 4px solid #f56c6c;
          background: linear-gradient(135deg, #fef0f0 0%, #fee2e2 100%);

          &:hover {
            background: linear-gradient(135deg, #fde2e2 0%, #fecaca 100%);
            border-color: rgba(245, 108, 108, 0.4);
          }
        }

        &.completed {
          opacity: 0.5;

          &::before {
            opacity: 0.3;
          }

          .todo-title {
            text-decoration: line-through;
            color: #adb5bd;
          }
        }

        @media (max-width: 768px) {
          flex-direction: column;
          align-items: flex-start;
          gap: 14px;
        }

        .todo-content {
          flex: 1;

          .todo-title {
            font-size: 16px;
            color: #2d3436;
            font-weight: 600;
            letter-spacing: -0.2px;
          }

          .todo-meta {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-top: 10px;
            flex-wrap: wrap;

            :deep(.el-tag) {
              border-radius: 20px;
              font-weight: 500;
              padding: 4px 12px;
              border: none;
            }

            .todo-deadline {
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 13px;
              color: #6c757d;
              font-weight: 500;
              background: white;
              padding: 4px 10px;
              border-radius: 20px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);

              &.overdue {
                color: #e74c3c;
                font-weight: 700;
                background: rgba(231, 76, 60, 0.1);
              }
            }
          }
        }

        .todo-actions {
          :deep(.el-button) {
            border-radius: 10px;
            font-weight: 600;
            padding: 10px 20px;
            transition: all 0.3s;

            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }
          }

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
  margin-bottom: 24px;
  border: none;
  border-radius: 16px;
  background: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04),
              0 1px 3px rgba(0, 0, 0, 0.02);

  :deep(.el-card__header) {
    padding: 20px 24px 16px;
    border-bottom: 1px solid #e9ecef;
  }

  :deep(.el-card__body) {
    padding: 20px 24px;
  }

  .quick-actions {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }

    .quick-btn {
      height: 88px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 10px;
      border-radius: 14px;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid transparent;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      color: #495057;
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
        transition: left 0.5s;
      }

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
        border-color: rgba(102, 126, 234, 0.3);

        &::before {
          left: 100%;
        }
      }

      &:active {
        transform: translateY(-2px);
      }

      .el-icon {
        font-size: 28px;
        transition: transform 0.3s;
      }

      &:hover .el-icon {
        transform: scale(1.1);
      }

      &.emergency {
        grid-column: 1 / -1;
        height: 64px;
        flex-direction: row;
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        border: none;
        color: white;
        font-size: 16px;
        box-shadow: 0 4px 16px rgba(231, 76, 60, 0.3);

        .el-icon {
          font-size: 24px;
        }

        &:hover {
          box-shadow: 0 8px 28px rgba(231, 76, 60, 0.5);
          background: linear-gradient(135deg, #c0392b 0%, #922b21 100%);
          transform: translateY(-4px) scale(1.02);
        }
      }
    }
  }
}

// ==================== 通知和动态卡片 ====================
.notice-card,
.activity-card {
  margin-bottom: 24px;
  border: none;
  border-radius: 16px;
  background: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04),
              0 1px 3px rgba(0, 0, 0, 0.02);

  :deep(.el-card__header) {
    padding: 20px 24px 16px;
    border-bottom: 1px solid #e9ecef;
  }

  :deep(.el-card__body) {
    padding: 20px 24px;
  }

  .notice-list,
  .activity-list {
    .notice-item,
    .activity-item {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 16px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      margin-bottom: 12px;
      border: 1px solid transparent;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
        opacity: 0;
        transition: opacity 0.3s;
      }

      &:hover {
        background: linear-gradient(135deg, #e3e6ea 0%, #d1d5db 100%);
        transform: translateX(6px);
        border-color: rgba(102, 126, 234, 0.2);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      }

      &:hover::before {
        opacity: 1;
      }

      &.unread {
        background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
        border-color: rgba(33, 150, 243, 0.3);

        &::before {
          background: linear-gradient(180deg, #2196f3 0%, #1976d2 100%);
          opacity: 1;
        }

        &:hover {
          background: linear-gradient(135deg, #bbdefb 0%, #90caf9 100%);
        }

        .notice-title {
          font-weight: 700;
          color: #0d47a1;
        }
      }

      .notice-tag {
        flex-shrink: 0;
        border-radius: 20px;
        font-weight: 500;
        padding: 4px 12px;
        border: none;
      }

      :deep(.el-avatar) {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        border: 2px solid white;
      }

      .notice-content {
        flex: 1;
        min-width: 0;

        .notice-title {
          margin: 0 0 6px 0;
          font-size: 15px;
          color: #2d3436;
          font-weight: 600;
          letter-spacing: -0.2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .notice-time {
          margin: 0;
          font-size: 12px;
          color: #6c757d;
          font-weight: 500;
        }
      }

      .activity-content {
        flex: 1;
        min-width: 0;

        p {
          margin: 0 0 6px 0;
          font-size: 15px;
          color: #2d3436;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.5;

          strong {
            color: #667eea;
            font-weight: 600;
          }
        }

        .activity-time {
          font-size: 12px;
          color: #6c757d;
          font-weight: 500;
        }
      }
    }
  }
}

// ==================== 自定义操作对话框 ====================
.custom-actions-content {
  .tip {
    margin: 0 0 20px 0;
    font-size: 14px;
    color: #6c757d;
    font-weight: 500;
    padding: 12px 16px;
    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
    border-radius: 10px;
    border-left: 4px solid #2196f3;
  }

  .action-item {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
    padding: 14px 16px;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 12px;
    transition: all 0.3s;
    border: 1px solid transparent;

    &:hover {
      background: linear-gradient(135deg, #e3e6ea 0%, #d1d5db 100%);
      transform: translateX(4px);
      border-color: rgba(102, 126, 234, 0.2);
    }

    .drag-handle {
      cursor: move;
      color: #6c757d;
      transition: color 0.3s;

      &:hover {
        color: #667eea;
      }
    }

    :deep(.el-checkbox) {
      width: 100%;
      margin-right: 0;
      font-weight: 500;

      .el-checkbox__label {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 8px;
        transition: all 0.3s;

        &:hover {
          background: rgba(102, 126, 234, 0.05);
        }
      }

      .el-checkbox__inner {
        width: 18px;
        height: 18px;
        border-radius: 4px;
        border: 2px solid #adb5bd;
      }

      &.is-checked .el-checkbox__inner {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-color: #667eea;
      }
    }
  }
}

// ==================== 加载状态优化 ====================
:deep(.el-loading-mask) {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
}

:deep(.el-loading-spinner) {
  .path {
    stroke: #667eea;
    stroke-width: 3;
  }
}

// ==================== 弹窗样式优化 ====================
:deep(.el-dialog) {
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);

  .el-dialog__header {
    padding: 24px 28px 20px;
    border-bottom: 1px solid #e9ecef;

    .el-dialog__title {
      font-size: 20px;
      font-weight: 700;
      color: #2d3436;
      letter-spacing: -0.5px;
    }

    .el-dialog__headerbtn {
      top: 24px;
      right: 24px;
      width: 36px;
      height: 36px;

      .el-dialog__close {
        font-size: 20px;
        color: #6c757d;
        transition: all 0.3s;

        &:hover {
          color: #e74c3c;
          transform: rotate(90deg);
        }
      }
    }
  }

  .el-dialog__body {
    padding: 24px 28px;
  }

  .el-dialog__footer {
    padding: 20px 28px 24px;
    border-top: 1px solid #e9ecef;

    .el-button {
      border-radius: 10px;
      font-weight: 600;
      padding: 12px 24px;
      transition: all 0.3s;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
      }
    }
  }
}

// ==================== 空状态优化 ====================
:deep(.el-empty) {
  padding: 40px 20px;

  .el-empty__image {
    width: 160px;
    opacity: 0.6;
  }

  .el-empty__description {
    color: #6c757d;
    font-size: 15px;
    font-weight: 500;
    margin-top: 16px;
  }
}

// ==================== 响应式优化 ====================
@media (max-width: 992px) {
  .cadre-dashboard {
    padding: 20px;
  }

  .stats-row {
    .stat-card {
      .stat-content {
        .stat-icon {
          width: 64px;
          height: 64px;
        }

        .stat-value {
          font-size: 32px;
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .cadre-dashboard {
    padding: 16px;
  }

  .welcome-card {
    margin-bottom: 20px;

    :deep(.el-card__body) {
      padding: 24px;
    }

    .welcome-title {
      font-size: 26px !important;
    }

    .welcome-stats {
      width: 100%;

      .stat-item {
        flex: 1;
        min-width: 140px;
        justify-content: center;
        font-size: 14px;
        padding: 12px 16px;
      }
    }
  }

  .stat-card {
    .stat-content {
      .stat-icon {
        width: 56px;
        height: 56px;
      }

      .stat-value {
        font-size: 28px !important;
      }
    }
  }

  .toolbar-card {
    .toolbar-content {
      .filter-label {
        width: 100%;
        justify-content: center;
        margin-bottom: 12px;
      }
    }
  }
}

@media (max-width: 576px) {
  .cadre-dashboard {
    padding: 12px;
  }

  .welcome-card {
    :deep(.el-card__body) {
      padding: 20px;
    }

    .welcome-title {
      font-size: 22px !important;
    }

    .welcome-subtitle {
      font-size: 14px;
    }

    .welcome-stats {
      gap: 12px;

      .stat-item {
        font-size: 13px;
        padding: 10px 14px;
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

      .stat-label {
        font-size: 13px;
      }

      .stat-trend {
        font-size: 11px;
      }
    }
  }

  .quick-actions {
    gap: 10px;

    .quick-btn {
      height: 76px;
      font-size: 13px;
    }
  }

  .notice-item,
  .activity-item {
    padding: 14px;
    gap: 12px;

    .notice-title,
    p {
      font-size: 14px;
    }
  }
}

// ==================== 深色模式兼容 ====================
@media (prefers-color-scheme: dark) {
  .cadre-dashboard {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  }

  .stat-card,
  .chart-card,
  .duty-card,
  .todo-card,
  .quick-actions-card,
  .notice-card,
  .activity-card,
  .toolbar-card {
    background: #1e293b;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);

    .card-header {
      border-bottom-color: #334155;
    }

    .card-title {
      color: #e2e8f0;
    }
  }

  .duty-item,
  .todo-item,
  .notice-item,
  .activity-item,
  .quick-btn {
    background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
    color: #e2e8f0;
  }

  .notice-title,
  .activity-content p {
    color: #e2e8f0;
  }

  .todo-title {
    color: #e2e8f0;
  }
}
</style>
