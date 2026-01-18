<template>
  <div class="village-affairs" :class="{ 'large-text-mode': largeTextMode }">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-bg"></div>
      <div class="header-particles"></div>
      <div class="header-content">
        <div class="header-info">
          <div class="title-wrapper">
            <h1 class="page-title">村务管理</h1>
            <div class="title-badge">
              <el-tag type="success" size="small" effect="dark">智慧乡村</el-tag>
            </div>
          </div>
          <p class="page-description">高效管理村务，服务全体村民，共建美好家园</p>
          <div class="user-greeting">
            <div class="greeting-icon">
              <el-icon><UserFilled /></el-icon>
            </div>
            <div class="greeting-text">
              <span class="welcome-text">欢迎回来，</span>
              <span class="user-name">{{ userInfo.name || '管理员' }}</span>
            </div>
            <el-tag :type="getUserRoleType()" size="large" effect="light" class="role-tag">
              {{ getRoleLabel() }}
            </el-tag>
          </div>
        </div>
        <div class="header-actions">
          <el-button
            @click="showAnnouncementDialog"
            :size="largeTextMode ? 'large' : 'default'"
            type="primary"
            class="action-btn primary-action"
          >
            <el-icon><Plus /></el-icon>
            <span>发布公告</span>
          </el-button>
          <el-button @click="showTaskDialog" :size="largeTextMode ? 'large' : 'default'" class="action-btn">
            <el-icon><List /></el-icon>
            <span>创建任务</span>
          </el-button>
          <el-button
            @click="refreshData"
            :size="largeTextMode ? 'large' : 'default'"
            :loading="refreshing"
            class="action-btn"
          >
            <el-icon><Refresh /></el-icon>
          </el-button>
          <el-button
            @click="toggleLargeTextMode"
            :size="largeTextMode ? 'large' : 'default'"
            class="action-btn text-mode-btn"
            :class="{ active: largeTextMode }"
          >
            <el-icon><Edit /></el-icon>
            <span>{{ largeTextMode ? '正常' : '大字' }}</span>
          </el-button>
        </div>
      </div>
    </div>

    <!-- 数据概览仪表板 -->
    <div class="dashboard-section">
      <el-row :gutter="24">
        <el-col :xs="24" :sm="12" :md="6" v-for="stat in dashboardStats" :key="stat.key">
          <div class="stat-card-wrapper">
            <el-card class="stat-card" :class="stat.type" shadow="hover">
              <div class="stat-content">
                <div class="stat-icon-wrapper">
                  <div class="stat-icon">
                    <el-icon :size="32"><component :is="stat.icon" /></el-icon>
                  </div>
                  <div class="stat-icon-bg"></div>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ stat.value }}</div>
                  <div class="stat-label">{{ stat.label }}</div>
                </div>
                <div class="stat-trend" :class="stat.trend">
                  <el-icon><component :is="getTrendIcon(stat.trend)" /></el-icon>
                  <span>{{ stat.change }}</span>
                </div>
              </div>
            </el-card>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 快速操作 -->
    <div class="quick-actions-section">
      <el-card class="quick-actions-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <div class="header-left">
              <div class="header-icon">
                <el-icon><Operation /></el-icon>
              </div>
              <span class="header-title">快速操作</span>
            </div>
          </div>
        </template>
        <el-row :gutter="20">
          <el-col :xs="12" :sm="8" :md="6" v-for="action in quickActions" :key="action.key">
            <div class="action-item" @click="handleQuickAction(action)">
              <div class="action-icon" :class="action.key">
                <el-icon :size="28"><component :is="action.icon" /></el-icon>
                <div class="icon-glow"></div>
              </div>
              <div class="action-label">{{ action.label }}</div>
              <div class="action-arrow">
                <el-icon><ArrowRight /></el-icon>
              </div>
            </div>
          </el-col>
        </el-row>
      </el-card>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <el-row :gutter="24">
        <!-- 左侧内容 -->
        <el-col :xs="24" :lg="16">
          <!-- 标签页导航 -->
          <el-card class="content-tabs" shadow="hover">
            <template #header>
              <div class="card-header">
                <div class="header-left">
                  <div class="header-icon">
                    <el-icon><Document /></el-icon>
                  </div>
                  <span class="header-title">工作台</span>
                </div>
              </div>
            </template>
            <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="custom-tabs">
              <el-tab-pane name="announcements">
                <template #label>
                  <div class="tab-label">
                    <el-icon><Bell /></el-icon>
                    <span>公告管理</span>
                    <el-badge :value="announcementStats.total" class="tab-badge" />
                  </div>
                </template>
                <AnnouncementManagement
                  :announcements="announcements"
                  :loading="announcementsLoading"
                  @refresh="loadAnnouncements"
                  @edit="editAnnouncement"
                  @delete="deleteAnnouncement"
                  @publish="publishAnnouncement"
                />
              </el-tab-pane>

              <el-tab-pane name="residents">
                <template #label>
                  <div class="tab-label">
                    <el-icon><User /></el-icon>
                    <span>村民管理</span>
                    <el-badge :value="residentStats.total" class="tab-badge" />
                  </div>
                </template>
                <ResidentManagement
                  :residents="residents"
                  :loading="residentsLoading"
                  @refresh="loadResidents"
                  @edit="editResident"
                  @view="viewResident"
                />
              </el-tab-pane>

              <el-tab-pane name="tasks">
                <template #label>
                  <div class="tab-label">
                    <el-icon><List /></el-icon>
                    <span>任务调度</span>
                    <el-badge :value="taskStats.total" class="tab-badge" />
                  </div>
                </template>
                <TaskManagement
                  :tasks="tasks"
                  :loading="tasksLoading"
                  @refresh="loadTasks"
                  @assign="assignTask"
                  @update="updateTaskStatus"
                />
              </el-tab-pane>
            </el-tabs>
          </el-card>
        </el-col>

        <!-- 右侧边栏 -->
        <el-col :xs="24" :lg="8">
          <!-- 实时通知 -->
          <el-card class="notifications-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <div class="header-left">
                  <div class="header-icon">
                    <el-icon><Notification /></el-icon>
                  </div>
                  <span class="header-title">实时通知</span>
                </div>
                <el-button size="small" text @click="clearAllNotifications" class="clear-btn">
                  <el-icon><Delete /></el-icon>
                  清空
                </el-button>
              </div>
            </template>
            <div class="notifications-list" v-loading="notificationsLoading">
              <div
                v-for="notification in notifications"
                :key="notification.id"
                class="notification-item"
                :class="[notification.type, { unread: !notification.read }]"
                @click="viewNotification(notification)"
              >
                <div class="notification-icon">
                  <el-icon><component :is="getNotificationIcon(notification.type)" /></el-icon>
                </div>
                <div class="notification-content">
                  <div class="notification-title">{{ notification.title }}</div>
                  <div class="notification-time">{{ formatTime(notification.time) }}</div>
                </div>
                <div class="notification-status" v-if="!notification.read">
                  <div class="status-dot"></div>
                </div>
              </div>
              <el-empty v-if="notifications.length === 0" description="暂无通知" />
            </div>
          </el-card>

          <!-- 村务动态时间线 -->
          <el-card class="timeline-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <div class="header-left">
                  <div class="header-icon">
                    <el-icon><Clock /></el-icon>
                  </div>
                  <span class="header-title">村务动态</span>
                </div>
              </div>
            </template>
            <el-timeline>
              <el-timeline-item
                v-for="event in recentEvents"
                :key="event.id"
                :timestamp="formatTime(event.time)"
                :type="event.type"
                :hollow="true"
              >
                <div class="event-content">
                  <div class="event-title">{{ event.title }}</div>
                  <div class="event-description">{{ event.description }}</div>
                  <div class="event-user">{{ event.user }}</div>
                </div>
              </el-timeline-item>
            </el-timeline>
          </el-card>

          <!-- 统计图表 -->
          <el-card class="chart-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <div class="header-left">
                  <div class="header-icon">
                    <el-icon><TrendCharts /></el-icon>
                  </div>
                  <span class="header-title">数据统计</span>
                </div>
              </div>
            </template>
            <div class="chart-container">
              <div class="chart-item">
                <div class="chart-label">
                  <span>任务完成率</span>
                  <span class="chart-value">{{ taskStats.completionRate }}%</span>
                </div>
                <el-progress
                  :percentage="taskStats.completionRate"
                  :stroke-width="10"
                  :show-text="false"
                  class="custom-progress"
                />
              </div>
              <div class="chart-item">
                <div class="chart-label">
                  <span>公告阅读率</span>
                  <span class="chart-value">{{ announcementStats.readRate }}%</span>
                </div>
                <el-progress
                  :percentage="announcementStats.readRate"
                  :stroke-width="10"
                  :show-text="false"
                  color="#10b981"
                  class="custom-progress"
                />
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 公告发布对话框 -->
    <AnnouncementDialog
      v-model="announcementDialogVisible"
      :announcement="currentAnnouncement"
      @submit="handleAnnouncementSubmit"
    />

    <!-- 任务创建对话框 -->
    <TaskDialog v-model="taskDialogVisible" :task="currentTask" @submit="handleTaskSubmit" />

    <!-- 村民详情对话框 -->
    <ResidentDetailDialog v-model="residentDetailVisible" :resident="currentResident" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, defineAsyncComponent } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Plus,
  List,
  Refresh,
  Edit,
  Operation,
  Bell,
  User,
  Notification,
  Clock,
  TrendCharts,
  UserFilled,
  Document,
  ChatDotRound,
  Warning,
  SuccessFilled,
  ArrowUp,
  ArrowDown,
  Minus,
  ArrowRight,
  Delete,
} from '@element-plus/icons-vue';

const AnnouncementManagement = defineAsyncComponent(
  () => import('@/components/village/AnnouncementManagement.vue')
);
const ResidentManagement = defineAsyncComponent(
  () => import('@/components/village/ResidentManagement.vue')
);
const TaskManagement = defineAsyncComponent(
  () => import('@/components/village/TaskManagement.vue')
);
const AnnouncementDialog = defineAsyncComponent(
  () => import('@/components/village/AnnouncementDialog.vue')
);
const TaskDialog = defineAsyncComponent(() => import('@/components/village/TaskDialog.vue'));
const ResidentDetailDialog = defineAsyncComponent(
  () => import('@/components/village/ResidentDetailDialog.vue')
);

const router = useRouter();
const userStore = useUserStore();

// API 调用示例（实际项目中替换为真实 API）
import * as villageApi from '@/api/village';

// 用户信息
const userInfo = computed(() => {
  const user = userStore.userInfo || {};
  return {
    name: user.profile?.firstName || user.username || '管理员',
    role: user.role || 'admin',
  };
});

// 响应式数据
const largeTextMode = ref(false);
const refreshing = ref(false);
const activeTab = ref('announcements');
const announcementsLoading = ref(false);
const residentsLoading = ref(false);
const tasksLoading = ref(false);
const notificationsLoading = ref(false);
const error = ref(null);

// 对话框状态
const announcementDialogVisible = ref(false);
const taskDialogVisible = ref(false);
const residentDetailVisible = ref(false);

// 当前编辑的项目
const currentAnnouncement = ref(null);
const currentTask = ref(null);
const currentResident = ref(null);

// 仪表板统计数据（使用 ref 而非 reactive 优化性能）
const dashboardStats = ref([
  {
    key: 'residents',
    label: '村民总数',
    value: '0',
    icon: 'UserFilled',
    type: 'primary',
    trend: 'up',
    change: '+0',
  },
  {
    key: 'tasks',
    label: '今日任务',
    value: '0',
    icon: 'List',
    type: 'success',
    trend: 'up',
    change: '+0',
  },
  {
    key: 'emergencies',
    label: '紧急事件',
    value: '0',
    icon: 'Warning',
    type: 'danger',
    trend: 'down',
    change: '-0',
  },
  {
    key: 'announcements',
    label: '新公告',
    value: '0',
    icon: 'Bell',
    type: 'warning',
    trend: 'stable',
    change: '0',
  },
]);

// 快速操作
const quickActions = ref([
  {
    key: 'announcement',
    label: '发布公告',
    icon: 'Bell',
    color: '#409eff',
    action: 'announcement',
  },
  {
    key: 'task',
    label: '创建任务',
    icon: 'List',
    color: '#67c23a',
    action: 'task',
  },
  {
    key: 'resident',
    label: '村民管理',
    icon: 'User',
    color: '#e6a23c',
    action: 'resident',
  },
  {
    key: 'finance',
    label: '财务管理',
    icon: 'Document',
    color: '#f56c6c',
    action: 'finance',
  },
]);

// 数据存储
const announcements = ref([]);
const residents = ref([]);
const tasks = ref([]);
const notifications = ref([]);
const recentEvents = ref([]);

// 统计数据
const announcementStats = reactive({
  total: announcements.length,
  published: announcements.filter(a => a.status === 'published').length,
  draft: announcements.filter(a => a.status === 'draft').length,
  readRate: 85,
});

const residentStats = reactive({
  total: residents.length,
  active: residents.filter(r => r.status === 'active').length,
  specialGroups: 15,
});

const taskStats = reactive({
  total: tasks.length,
  pending: tasks.filter(t => t.status === 'pending').length,
  inProgress: tasks.filter(t => t.status === 'in_progress').length,
  completed: tasks.filter(t => t.status === 'completed').length,
  completionRate: 75,
});

// 方法定义
const getUserRoleType = () => {
  const role = userInfo.value.role;
  switch (role) {
    case 'admin':
      return 'danger';
    case 'manager':
      return 'warning';
    case 'staff':
      return 'primary';
    default:
      return 'info';
  }
};

const getRoleLabel = () => {
  const role = userInfo.value.role;
  switch (role) {
    case 'admin':
      return '管理员';
    case 'manager':
      return '村主任';
    case 'staff':
      return '工作人员';
    default:
      return '村民';
  }
};

const getTrendIcon = trend => {
  switch (trend) {
    case 'up':
      return 'ArrowUp';
    case 'down':
      return 'ArrowDown';
    default:
      return 'Minus';
  }
};

const getNotificationIcon = type => {
  switch (type) {
    case 'task':
      return 'List';
    case 'success':
      return 'SuccessFilled';
    case 'warning':
      return 'Warning';
    default:
      return 'ChatDotRound';
  }
};

const toggleLargeTextMode = () => {
  largeTextMode.value = !largeTextMode.value;
  localStorage.setItem('largeTextMode', largeTextMode.value.toString());
};

const handleQuickAction = action => {
  switch (action.action) {
    case 'announcement':
      showAnnouncementDialog();
      break;
    case 'task':
      showTaskDialog();
      break;
    case 'resident':
      activeTab.value = 'residents';
      break;
    case 'finance':
      router.push('/finance');
      break;
  }
};

const handleTabChange = tab => {
  activeTab.value = tab;
  // 根据标签页加载对应数据
  switch (tab) {
    case 'announcements':
      loadAnnouncements();
      break;
    case 'residents':
      loadResidents();
      break;
    case 'tasks':
      loadTasks();
      break;
  }
};

const showAnnouncementDialog = () => {
  currentAnnouncement.value = null;
  announcementDialogVisible.value = true;
};

const showTaskDialog = () => {
  currentTask.value = null;
  taskDialogVisible.value = true;
};

const editAnnouncement = announcement => {
  currentAnnouncement.value = { ...announcement };
  announcementDialogVisible.value = true;
};

const editResident = resident => {
  currentResident.value = { ...resident };
  residentDetailVisible.value = true;
};

const viewResident = resident => {
  currentResident.value = { ...resident };
  residentDetailVisible.value = true;
};

const handleAnnouncementSubmit = async formData => {
  try {
    announcementsLoading.value = true;

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newAnnouncement = {
      id: Date.now().toString(),
      ...formData,
      publishTime: new Date().toLocaleString(),
      readCount: 0,
      status: 'published',
    };

    if (currentAnnouncement.value) {
      // 编辑模式
      const index = announcements.findIndex(a => a.id === currentAnnouncement.value.id);
      if (index !== -1) {
        announcements[index] = { ...announcements[index], ...formData };
      }
    } else {
      // 新增模式
      announcements.unshift(newAnnouncement);
    }

    ElMessage.success(currentAnnouncement.value ? '公告更新成功' : '公告发布成功');
    announcementDialogVisible.value = false;
    loadAnnouncements();
  } catch (error) {
    ElMessage.error('操作失败，请重试');
  } finally {
    announcementsLoading.value = false;
  }
};

const handleTaskSubmit = async formData => {
  try {
    tasksLoading.value = true;

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newTask = {
      id: Date.now().toString(),
      ...formData,
      status: 'pending',
      createTime: new Date().toLocaleString(),
    };

    if (currentTask.value) {
      // 编辑模式
      const index = tasks.findIndex(t => t.id === currentTask.value.id);
      if (index !== -1) {
        tasks[index] = { ...tasks[index], ...formData };
      }
    } else {
      // 新增模式
      tasks.unshift(newTask);
    }

    ElMessage.success(currentTask.value ? '任务更新成功' : '任务创建成功');
    taskDialogVisible.value = false;
    loadTasks();
  } catch (error) {
    ElMessage.error('操作失败，请重试');
  } finally {
    tasksLoading.value = false;
  }
};

const assignTask = async (taskId, assigneeId) => {
  try {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.assigneeId = assigneeId;
      task.status = 'assigned';
      ElMessage.success('任务分配成功');
    }
  } catch (error) {
    ElMessage.error('任务分配失败');
  }
};

const updateTaskStatus = async (taskId, status) => {
  try {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.status = status;
      ElMessage.success('任务状态更新成功');
    }
  } catch (error) {
    ElMessage.error('状态更新失败');
  }
};

const deleteAnnouncement = async announcementId => {
  try {
    await ElMessageBox.confirm('确定要删除这个公告吗？', '确认删除', {
      type: 'warning',
    });

    const index = announcements.findIndex(a => a.id === announcementId);
    if (index !== -1) {
      announcements.splice(index, 1);
      ElMessage.success('公告删除成功');
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

const publishAnnouncement = async announcementId => {
  try {
    const announcement = announcements.find(a => a.id === announcementId);
    if (announcement) {
      announcement.status = 'published';
      announcement.publishTime = new Date().toLocaleString();
      ElMessage.success('公告发布成功');
    }
  } catch (error) {
    ElMessage.error('发布失败');
  }
};

const loadAnnouncements = async () => {
  announcementsLoading.value = true;
  error.value = null;
  try {
    const response = await villageApi.getAnnouncements({
      page: 1,
      pageSize: 20,
    });
    if (response.success) {
      announcements.value = response.data.items;
      updateAnnouncementStats();
    } else {
      throw new Error(response.error || '加载公告失败');
    }
  } catch (err) {
    error.value = err.message;
    ElMessage.error('加载公告失败，请检查网络连接');
    console.error('[loadAnnouncements] Error:', err);
  } finally {
    announcementsLoading.value = false;
  }
};

const loadResidents = async () => {
  residentsLoading.value = true;
  error.value = null;
  try {
    const response = await villageApi.getResidents({
      page: 1,
      pageSize: 20,
    });
    if (response.success) {
      residents.value = response.data.items;
      updateResidentStats();
    } else {
      throw new Error(response.error || '加载村民失败');
    }
  } catch (err) {
    error.value = err.message;
    ElMessage.error('加载村民失败，请检查网络连接');
    console.error('[loadResidents] Error:', err);
  } finally {
    residentsLoading.value = false;
  }
};

const loadTasks = async () => {
  tasksLoading.value = true;
  error.value = null;
  try {
    const response = await villageApi.getTasks({
      page: 1,
      pageSize: 20,
      status: activeTab.value,
    });
    if (response.success) {
      tasks.value = response.data.items;
      updateTaskStats();
    } else {
      throw new Error(response.error || '加载任务失败');
    }
  } catch (err) {
    error.value = err.message;
    ElMessage.error('加载任务失败，请检查网络连接');
    console.error('[loadTasks] Error:', err);
  } finally {
    tasksLoading.value = false;
  }
};

const loadNotifications = async () => {
  notificationsLoading.value = true;
  try {
    const response = await villageApi.getNotifications();
    if (response.success) {
      notifications.value = response.data.items;
    }
  } catch (err) {
    console.error('[loadNotifications] Error:', err);
  } finally {
    notificationsLoading.value = false;
  }
};

const loadDashboardStats = async () => {
  try {
    const response = await villageApi.getDashboardStats();
    if (response.success) {
      dashboardStats.value = [
        {
          key: 'residents',
          label: '村民总数',
          value: response.data.totalResidents.toLocaleString(),
          icon: 'UserFilled',
          type: 'primary',
          trend: response.data.residentsTrend,
          change: response.data.residentsChange,
        },
        {
          key: 'tasks',
          label: '今日任务',
          value: response.data.todayTasks.toString(),
          icon: 'List',
          type: 'success',
          trend: response.data.tasksTrend,
          change: response.data.tasksChange,
        },
        {
          key: 'emergencies',
          label: '紧急事件',
          value: response.data.emergencies.toString(),
          icon: 'Warning',
          type: 'danger',
          trend: response.data.emergenciesTrend,
          change: response.data.emergenciesChange,
        },
        {
          key: 'announcements',
          label: '新公告',
          value: response.data.newAnnouncements.toString(),
          icon: 'Bell',
          type: 'warning',
          trend: 'stable',
          change: '0',
        },
      ];
    }
  } catch (err) {
    console.error('[loadDashboardStats] Error:', err);
  }
};

const updateAnnouncementStats = () => {
  announcementStats.total = announcements.value.length;
  announcementStats.published = announcements.value.filter(a => a.status === 'published').length;
  announcementStats.draft = announcements.value.filter(a => a.status === 'draft').length;
};

const updateResidentStats = () => {
  residentStats.total = residents.value.length;
  residentStats.active = residents.value.filter(r => r.status === 'active').length;
};

const updateTaskStats = () => {
  taskStats.total = tasks.value.length;
  taskStats.pending = tasks.value.filter(t => t.status === 'pending').length;
  taskStats.inProgress = tasks.value.filter(t => t.status === 'in_progress').length;
  taskStats.completed = tasks.value.filter(t => t.status === 'completed').length;
  taskStats.completionRate =
    taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;
};

const refreshData = async () => {
  refreshing.value = true;
  try {
    await Promise.all([loadAnnouncements(), loadResidents(), loadTasks()]);
    ElMessage.success('数据刷新成功');
  } catch (error) {
    ElMessage.error('刷新失败');
  } finally {
    refreshing.value = false;
  }
};

const clearAllNotifications = () => {
  notifications.splice(0, notifications.length);
  ElMessage.success('通知已清空');
};

const viewNotification = notification => {
  notification.read = true;
  ElMessage.info(`查看通知: ${notification.title}`);
};

const formatTime = time => {
  const date = new Date(time);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`;
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`;
  } else {
    return date.toLocaleDateString();
  }
};

// 生命周期
onMounted(async () => {
  // 恢复大字模式设置
  const savedMode = localStorage.getItem('largeTextMode');
  if (savedMode === 'true') {
    largeTextMode.value = true;
  }

  // 初始加载数据
  await refreshData();
});
</script>

<style scoped>
/* ==================== CSS 变量定义 ==================== */
:root {
  --primary-color: #10b981;
  --primary-light: #34d399;
  --primary-dark: #059669;
  --primary-gradient: linear-gradient(135deg, #10b981 0%, #059669 100%);
  --secondary-color: #f0fdf4;
  --accent-color: #f59e0b;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  --bg-primary: #ffffff;
  --bg-secondary: #f3f4f6;
  --bg-tertiary: #e5e7eb;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --border-radius-sm: 8px;
  --border-radius-md: 12px;
  --border-radius-lg: 16px;
  --transition-fast: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ==================== 全局样式 ==================== */
.village-affairs {
  padding: 24px;
  background-color: #f8fafc;
  background-image:
    radial-gradient(at 0% 0%, rgba(16, 185, 129, 0.05) 0px, transparent 50%),
    radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.05) 0px, transparent 50%);
  background-attachment: fixed;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

.village-affairs.large-text-mode {
  font-size: 18px;
}

.village-affairs.large-text-mode .el-button {
  font-size: 16px;
  padding: 12px 24px;
}

.village-affairs.large-text-mode .el-card__body {
  padding: 24px;
}

/* ==================== 卡片通用样式 ==================== */
:deep(.el-card) {
  border: none;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
  background: var(--bg-primary);
}

:deep(.el-card:hover) {
  box-shadow: var(--shadow-lg);
}

:deep(.el-card__header) {
  border-bottom: 1px solid var(--bg-tertiary);
  padding: 20px 24px;
}

:deep(.el-card__body) {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--border-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
  color: white;
  font-size: 18px;
  box-shadow: var(--shadow-sm);
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.clear-btn {
  color: var(--text-tertiary);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: 4px;
}

.clear-btn:hover {
  color: var(--primary-color);
  background-color: rgba(16, 185, 129, 0.1);
}

/* ==================== 页面头部样式 ==================== */
.page-header {
  position: relative;
  margin-bottom: 28px;
  background: var(--primary-gradient);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}

.header-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120"><path fill="rgba(255,255,255,0.1)" d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25"/><path fill="rgba(255,255,255,0.1)" d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5"/></svg>')
    no-repeat;
  background-size: cover;
}

.header-particles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
    radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
    radial-gradient(circle at 40% 80%, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
  background-size: 60px 60px, 80px 80px, 100px 100px;
  animation: particleFloat 20s linear infinite;
}

@keyframes particleFloat {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-60px);
  }
}

.header-content {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 40px;
  color: white;
}

.header-info {
  flex: 1;
}

.title-wrapper {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.9) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 1px;
}

.title-badge {
  animation: badgeGlow 2s ease-in-out infinite;
}

@keyframes badgeGlow {
  0%, 100% {
    opacity: 0.9;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}

.page-description {
  font-size: 16px;
  opacity: 0.95;
  margin: 0 0 20px 0;
  font-weight: 300;
  letter-spacing: 0.5px;
}

.user-greeting {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: var(--border-radius-md);
  border: 1px solid rgba(255, 255, 255, 0.2);
  max-width: fit-content;
}

.greeting-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.greeting-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.welcome-text {
  font-size: 13px;
  opacity: 0.85;
}

.user-name {
  font-size: 16px;
  font-weight: 600;
}

.role-tag {
  border-radius: var(--border-radius-sm);
  padding: 8px 16px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.action-btn {
  border-radius: var(--border-radius-md);
  font-weight: 500;
  transition: all var(--transition-base);
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.primary-action {
  background: linear-gradient(135deg, #f59e0b, #d97706) !important;
  border-color: #d97706 !important;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
}

.primary-action:hover {
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.5);
  transform: translateY(-2px) scale(1.02);
}

.text-mode-btn {
  background: rgba(255, 255, 255, 0.15) !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
  color: white !important;
}

.text-mode-btn.active {
  background: rgba(255, 255, 255, 0.3) !important;
  border-color: rgba(255, 255, 255, 0.5) !important;
}

/* ==================== 数据概览样式 ==================== */
.dashboard-section {
  margin-bottom: 28px;
}

.stat-card-wrapper {
  margin-bottom: 20px;
}

.stat-card {
  border: none;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
  background: var(--bg-primary);
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--stat-color, #10b981);
  opacity: 0;
  transition: opacity var(--transition-base);
}

.stat-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-xl);
}

.stat-card:hover::before {
  opacity: 1;
}

.stat-card.primary {
  --stat-color: #10b981;
}

.stat-card.success {
  --stat-color: #f59e0b;
}

.stat-card.danger {
  --stat-color: #ef4444;
}

.stat-card.warning {
  --stat-color: #6366f1;
}

.stat-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.stat-icon-wrapper {
  position: relative;
  width: 70px;
  height: 70px;
  flex-shrink: 0;
}

.stat-icon {
  position: relative;
  z-index: 2;
  width: 70px;
  height: 70px;
  border-radius: var(--border-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--secondary-color), #dcfce7);
  color: var(--primary-color);
  transition: all var(--transition-base);
}

.stat-icon-wrapper:hover .stat-icon {
  transform: scale(1.1) rotate(5deg);
}

.stat-icon-bg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  opacity: 0.1;
  animation: iconPulse 3s ease-in-out infinite;
}

@keyframes iconPulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.1;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 0.05;
  }
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
  line-height: 1.2;
  background: linear-gradient(135deg, var(--text-primary), var(--text-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: var(--border-radius-sm);
  background-color: var(--bg-secondary);
  transition: all var(--transition-fast);
}

.stat-trend:hover {
  transform: scale(1.1);
}

.stat-trend.up {
  color: #10b981;
  background-color: rgba(16, 185, 129, 0.1);
}

.stat-trend.down {
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
}

.stat-trend.stable {
  color: var(--text-tertiary);
  background-color: rgba(156, 163, 175, 0.1);
}

/* ==================== 快速操作样式 ==================== */
.quick-actions-section {
  margin-bottom: 28px;
}

.quick-actions-card {
  background: linear-gradient(135deg, var(--bg-primary) 0%, rgba(16, 185, 129, 0.02) 100%);
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  cursor: pointer;
  border-radius: var(--border-radius-md);
  transition: all var(--transition-base);
  background: transparent;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

.action-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(16, 185, 129, 0.02));
  opacity: 0;
  transition: opacity var(--transition-base);
}

.action-item:hover {
  background: rgba(16, 185, 129, 0.05);
  border-color: rgba(16, 185, 129, 0.2);
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.action-item:hover::before {
  opacity: 1;
}

.action-item:hover .action-icon {
  transform: scale(1.15) rotate(-5deg);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.action-item:active {
  transform: translateY(-2px);
}

.action-icon {
  position: relative;
  z-index: 2;
  width: 64px;
  height: 64px;
  border-radius: var(--border-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-bottom: 14px;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);
}

.action-icon.announcement {
  background: linear-gradient(135deg, #10b981, #059669);
}

.action-icon.task {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.action-icon.resident {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
}

.action-icon.finance {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

.icon-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: inherit;
  filter: blur(20px);
  opacity: 0;
  transition: opacity var(--transition-base);
  z-index: 1;
}

.action-item:hover .icon-glow {
  opacity: 0.4;
  animation: glowPulse 2s ease-in-out infinite;
}

@keyframes glowPulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.4;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.3);
    opacity: 0.2;
  }
}

.action-label {
  position: relative;
  z-index: 2;
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 600;
  text-align: center;
  letter-spacing: 0.3px;
  transition: color var(--transition-fast);
}

.action-item:hover .action-label {
  color: var(--primary-color);
}

.action-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  opacity: 0;
  transition: all var(--transition-base);
}

.action-item:hover .action-arrow {
  opacity: 1;
  right: 16px;
  color: var(--primary-color);
}

/* ==================== 主要内容样式 ==================== */
.main-content {
  margin-bottom: 28px;
}

.content-tabs {
  background: var(--bg-primary);
}

.content-tabs :deep(.el-tabs__header) {
  margin: 0 0 20px 0;
  border-bottom: 2px solid var(--bg-tertiary);
}

.content-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.custom-tabs :deep(.el-tabs__item) {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 0 24px;
  height: 48px;
  line-height: 48px;
  transition: all var(--transition-fast);
}

.custom-tabs :deep(.el-tabs__item:hover) {
  color: var(--primary-color);
}

.custom-tabs :deep(.el-tabs__item.is-active) {
  color: var(--primary-color);
  font-weight: 600;
}

.custom-tabs :deep(.el-tabs__active-bar) {
  background-color: var(--primary-color);
  height: 3px;
  border-radius: 3px 3px 0 0;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all var(--transition-fast);
}

.tab-label .el-icon {
  font-size: 16px;
}

.tab-badge {
  margin-left: 4px;
  transform: scale(0.9);
  transition: transform var(--transition-fast);
}

.tab-label:hover .tab-badge {
  transform: scale(1);
}

/* ==================== 通知样式 ==================== */
.notifications-card {
  margin-bottom: 24px;
}

.notifications-list {
  max-height: 350px;
  overflow-y: auto;
  padding: 4px;
}

.notifications-list::-webkit-scrollbar {
  width: 6px;
}

.notifications-list::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 3px;
}

.notifications-list::-webkit-scrollbar-thumb {
  background: var(--bg-tertiary);
  border-radius: 3px;
}

.notifications-list::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

.notification-item {
  display: flex;
  align-items: center;
  padding: 14px;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
  margin-bottom: 10px;
  background: transparent;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

.notification-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--primary-color);
  border-radius: 4px 0 0 4px;
  opacity: 0;
  transition: opacity var(--transition-base);
}

.notification-item:hover {
  background: rgba(16, 185, 129, 0.05);
  border-color: rgba(16, 185, 129, 0.2);
  transform: translateX(4px);
}

.notification-item:hover::before {
  opacity: 0.5;
}

.notification-item.unread {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.02));
  border-left-color: var(--primary-color);
  border-left-width: 4px;
}

.notification-item.unread::before {
  opacity: 1;
}

.notification-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--border-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--secondary-color), #dcfce7);
  color: var(--primary-color);
  margin-right: 14px;
  flex-shrink: 0;
  transition: all var(--transition-base);
}

.notification-item:hover .notification-icon {
  transform: scale(1.1) rotate(-5deg);
  box-shadow: var(--shadow-sm);
}

.notification-item.task .notification-icon {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #f59e0b;
}

.notification-item.success .notification-icon {
  background: linear-gradient(135deg, #dcfce7, #bbf7d0);
  color: #10b981;
}

.notification-item.warning .notification-icon {
  background: linear-gradient(135deg, #fee2e2, #fecaca);
  color: #ef4444;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  line-height: 1.4;
  transition: color var(--transition-fast);
}

.notification-item:hover .notification-title {
  color: var(--primary-color);
}

.notification-time {
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 400;
}

.notification-status {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--primary-color);
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);
  animation: statusPulse 2s ease-in-out infinite;
}

@keyframes statusPulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);
  }
  50% {
    transform: scale(1.2);
    box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.1);
  }
}

/* ==================== 时间线样式 ==================== */
.timeline-card {
  margin-bottom: 24px;
}

:deep(.el-timeline) {
  padding-left: 0;
}

:deep(.el-timeline-item__timestamp) {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 8px;
}

:deep(.el-timeline-item__node) {
  background: var(--primary-color);
  border: 3px solid var(--bg-primary);
}

:deep(.el-timeline-item__node--primary) {
  background: var(--primary-color);
}

:deep(.el-timeline-item__node--success) {
  background: #10b981;
}

:deep(.el-timeline-item__node--warning) {
  background: #f59e0b;
}

:deep(.el-timeline-item__node--danger) {
  background: #ef4444;
}

:deep(.el-timeline-item__node--info) {
  background: #6366f1;
}

.event-content {
  padding: 12px 14px;
  background: linear-gradient(135deg, var(--bg-secondary), rgba(16, 185, 129, 0.03));
  border-radius: var(--border-radius-md);
  transition: all var(--transition-base);
  border-left: 3px solid transparent;
}

.event-content:hover {
  transform: translateX(4px);
  box-shadow: var(--shadow-sm);
  border-left-color: var(--primary-color);
}

.event-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
  line-height: 1.4;
}

.event-description {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  line-height: 1.5;
}

.event-user {
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 400;
}

/* ==================== 图表样式 ==================== */
.chart-card {
  margin-bottom: 24px;
}

.chart-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 8px;
}

.chart-item {
  padding: 16px;
  background: linear-gradient(135deg, var(--bg-secondary), rgba(16, 185, 129, 0.02));
  border-radius: var(--border-radius-md);
  transition: all var(--transition-base);
}

.chart-item:hover {
  transform: translateX(4px);
  box-shadow: var(--shadow-sm);
}

.chart-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.chart-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--primary-color);
}

.custom-progress :deep(.el-progress-bar__outer) {
  background-color: var(--bg-tertiary);
  border-radius: 10px;
  overflow: hidden;
}

.custom-progress :deep(.el-progress-bar__inner) {
  border-radius: 10px;
  transition: all var(--transition-slow);
  background: linear-gradient(90deg, var(--primary-color), var(--primary-light));
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 1024px) {
  .village-affairs {
    padding: 20px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 24px;
    padding: 32px;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
    gap: 10px;
  }

  .action-btn {
    flex: 1;
    min-width: 120px;
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .village-affairs {
    padding: 16px;
  }

  .header-content {
    padding: 24px;
  }

  .page-title {
    font-size: 24px;
  }

  .page-description {
    font-size: 14px;
  }

  .user-greeting {
    width: 100%;
    padding: 10px 16px;
  }

  .header-actions {
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .action-btn {
    flex: 0 0 auto;
    padding: 10px 16px;
  }

  .stat-content {
    flex-direction: column;
    text-align: center;
    padding: 16px;
  }

  .stat-icon-wrapper {
    margin-bottom: 12px;
  }

  .stat-info {
    width: 100%;
  }

  .stat-value {
    font-size: 24px;
  }

  .action-item {
    padding: 20px 12px;
  }

  .action-icon {
    width: 56px;
    height: 56px;
  }

  .action-label {
    font-size: 13px;
  }

  .notifications-list {
    max-height: 300px;
  }

  .notification-item {
    padding: 12px;
  }
}

@media (max-width: 480px) {
  .village-affairs {
    padding: 12px;
  }

  .dashboard-section :deep(.el-col) {
    margin-bottom: 16px;
  }

  .quick-actions-section :deep(.el-col) {
    margin-bottom: 12px;
  }

  .content-tabs :deep(.el-tabs__item) {
    padding: 0 16px;
    font-size: 14px;
  }

  .tab-label span {
    display: none;
  }

  .tab-label .el-icon {
    font-size: 18px;
  }
}

/* ==================== 大字模式增强样式 ==================== */
.village-affairs.large-text-mode .page-title {
  font-size: 36px;
}

.village-affairs.large-text-mode .page-description {
  font-size: 18px;
}

.village-affairs.large-text-mode .stat-value {
  font-size: 32px;
}

.village-affairs.large-text-mode .stat-label {
  font-size: 16px;
}

.village-affairs.large-text-mode .action-label {
  font-size: 16px;
}

.village-affairs.large-text-mode .notification-title,
.village-affairs.large-text-mode .event-title {
  font-size: 16px;
}

.village-affairs.large-text-mode .notification-time,
.village-affairs.large-text-mode .event-description {
  font-size: 14px;
}

.village-affairs.large-text-mode .chart-label {
  font-size: 16px;
}

.village-affairs.large-text-mode .chart-value {
  font-size: 18px;
}

/* ==================== 加载和过渡动画 ==================== */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.village-affairs > * {
  animation: fadeInUp 0.6s ease-out backwards;
}

.village-affairs > *:nth-child(1) {
  animation-delay: 0.1s;
}

.village-affairs > *:nth-child(2) {
  animation-delay: 0.2s;
}

.village-affairs > *:nth-child(3) {
  animation-delay: 0.3s;
}

.village-affairs > *:nth-child(4) {
  animation-delay: 0.4s;
}
</style>
