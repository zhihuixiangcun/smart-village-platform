<template>
  <div class="village-affairs" :class="{ 'large-text-mode': largeTextMode }">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-bg"></div>
      <div class="header-content">
        <div class="header-info">
          <h1 class="page-title">村务管理</h1>
          <p class="page-description">高效管理村务，服务全体村民</p>
          <div class="user-greeting">
            <span>欢迎，{{ userInfo.name || '管理员' }}</span>
            <el-tag :type="getUserRoleType()" size="small">{{ getRoleLabel() }}</el-tag>
          </div>
        </div>
        <div class="header-actions">
          <el-button
            @click="showAnnouncementDialog"
            :size="largeTextMode ? 'large' : 'default'"
            type="primary"
          >
            <el-icon><Plus /></el-icon>
            发布公告
          </el-button>
          <el-button @click="showTaskDialog" :size="largeTextMode ? 'large' : 'default'">
            <el-icon><List /></el-icon>
            创建任务
          </el-button>
          <el-button
            @click="refreshData"
            :size="largeTextMode ? 'large' : 'default'"
            :loading="refreshing"
          >
            <el-icon><Refresh /></el-icon>
          </el-button>
          <el-button
            @click="toggleLargeTextMode"
            :size="largeTextMode ? 'large' : 'default'"
            :type="largeTextMode ? 'primary' : 'default'"
          >
            <el-icon><Edit /></el-icon>
            {{ largeTextMode ? '正常' : '大字' }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- 数据概览仪表板 -->
    <div class="dashboard-section">
      <el-row :gutter="24">
        <el-col :xs="24" :sm="12" :md="6" v-for="stat in dashboardStats" :key="stat.key">
          <el-card class="stat-card" :class="stat.type">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon :size="32"><component :is="stat.icon" /></el-icon>
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
        </el-col>
      </el-row>
    </div>

    <!-- 快速操作 -->
    <div class="quick-actions-section">
      <el-card>
        <template #header>
          <div class="card-header">
            <el-icon><Operation /></el-icon>
            <span>快速操作</span>
          </div>
        </template>
        <el-row :gutter="16">
          <el-col :xs="12" :sm="8" :md="6" v-for="action in quickActions" :key="action.key">
            <div class="action-item" @click="handleQuickAction(action)">
              <div class="action-icon" :style="{ backgroundColor: action.color }">
                <el-icon :size="24"><component :is="action.icon" /></el-icon>
              </div>
              <div class="action-label">{{ action.label }}</div>
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
          <el-card class="content-tabs">
            <el-tabs v-model="activeTab" @tab-change="handleTabChange">
              <el-tab-pane label="公告管理" name="announcements">
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

              <el-tab-pane label="村民管理" name="residents">
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

              <el-tab-pane label="任务调度" name="tasks">
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
          <el-card class="notifications-card">
            <template #header>
              <div class="card-header">
                <el-icon><Notification /></el-icon>
                <span>实时通知</span>
                <el-button size="small" text @click="clearAllNotifications">清空</el-button>
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
          <el-card class="timeline-card">
            <template #header>
              <div class="card-header">
                <el-icon><Clock /></el-icon>
                <span>村务动态</span>
              </div>
            </template>
            <el-timeline>
              <el-timeline-item
                v-for="event in recentEvents"
                :key="event.id"
                :timestamp="formatTime(event.time)"
                :type="event.type"
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
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">
                <el-icon><TrendCharts /></el-icon>
                <span>数据统计</span>
              </div>
            </template>
            <div class="chart-container">
              <div class="chart-item">
                <div class="chart-label">任务完成率</div>
                <el-progress :percentage="taskStats.completionRate" :stroke-width="8" />
              </div>
              <div class="chart-item">
                <div class="chart-label">公告阅读率</div>
                <el-progress
                  :percentage="announcementStats.readRate"
                  :stroke-width="8"
                  color="#67c23a"
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
.village-affairs {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.village-affairs.large-text-mode {
  font-size: 18px;
}

.village-affairs.large-text-mode .el-button {
  font-size: 16px;
  padding: 12px 20px;
}

.village-affairs.large-text-mode .el-card__body {
  padding: 24px;
}

/* 页面头部样式 */
.page-header {
  position: relative;
  margin-bottom: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
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

.header-content {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32px;
  color: white;
}

.header-info .page-title {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.header-info .page-description {
  font-size: 16px;
  opacity: 0.9;
  margin: 0 0 16px 0;
}

.user-greeting {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 数据概览样式 */
.dashboard-section {
  margin-bottom: 24px;
}

.stat-card {
  transition: all 0.3s ease;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
}

.stat-card.primary {
  border-left: 4px solid #409eff;
}

.stat-card.success {
  border-left: 4px solid #67c23a;
}

.stat-card.danger {
  border-left: 4px solid #f56c6c;
}

.stat-card.warning {
  border-left: 4px solid #e6a23c;
}

.stat-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f9ff;
  color: #409eff;
}

.stat-info {
  flex: 1;
  margin-left: 16px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.stat-trend.up {
  color: #67c23a;
}

.stat-trend.down {
  color: #f56c6c;
}

.stat-trend.stable {
  color: #909399;
}

/* 快速操作样式 */
.quick-actions-section {
  margin-bottom: 24px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.action-item:hover {
  background-color: #f8f9ff;
  transform: translateY(-2px);
}

.action-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-bottom: 12px;
  transition: all 0.3s ease;
}

.action-item:hover .action-icon {
  transform: scale(1.1);
}

.action-label {
  font-size: 14px;
  color: #606266;
  text-align: center;
}

/* 主要内容样式 */
.main-content {
  margin-bottom: 24px;
}

.content-tabs .card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab-badge {
  margin-left: 4px;
}

/* 通知样式 */
.notifications-card {
  margin-bottom: 24px;
  max-height: 400px;
}

.notifications-list {
  max-height: 300px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 8px;
}

.notification-item:hover {
  background-color: #f8f9ff;
}

.notification-item.unread {
  background-color: #f0f9ff;
  border-left: 3px solid #409eff;
}

.notification-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
  margin-right: 12px;
}

.notification-content {
  flex: 1;
}

.notification-title {
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
}

.notification-time {
  font-size: 12px;
  color: #909399;
}

.notification-status {
  width: 8px;
  height: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #409eff;
}

/* 时间线样式 */
.timeline-card {
  margin-bottom: 24px;
}

.event-content {
  padding-left: 8px;
}

.event-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.event-description {
  font-size: 13px;
  color: #606266;
  margin-bottom: 4px;
}

.event-user {
  font-size: 12px;
  color: #909399;
}

/* 图表样式 */
.chart-card {
  margin-bottom: 24px;
}

.chart-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-item {
  margin-bottom: 20px;
}

.chart-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .village-affairs {
    padding: 12px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 20px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
    overflow-x: auto;
  }

  .stat-content {
    flex-direction: column;
    text-align: center;
  }

  .stat-info {
    margin-left: 0;
    margin-top: 12px;
  }

  .action-item {
    padding: 16px 12px;
  }

  .action-icon {
    width: 48px;
    height: 48px;
  }
}

/* 大字模式增强样式 */
.village-affairs.large-text-mode .page-title {
  font-size: 32px;
}

.village-affairs.large-text-mode .page-description {
  font-size: 18px;
}

.village-affairs.large-text-mode .stat-value {
  font-size: 28px;
}

.village-affairs.large-text-mode .action-label {
  font-size: 16px;
}

.village-affairs.large-text-mode .notification-title,
.village-affairs.large-text-mode .event-title {
  font-size: 16px;
}

.village-affairs.large-text-mode .chart-label {
  font-size: 16px;
}
</style>
