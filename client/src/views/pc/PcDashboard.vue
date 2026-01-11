<!--
  PC端仪表板页面
  智慧乡村综合服务平台 - PC端首页
-->
<template>
  <div class="pc-dashboard">
    <!-- 欢迎区域 -->
    <section class="welcome-section">
      <el-card class="welcome-card" shadow="never">
        <div class="welcome-content">
          <div class="welcome-info">
            <h1 class="welcome-title">{{ getGreeting() }}，{{ userInfo.name || '村干部' }}</h1>
            <p class="welcome-subtitle">
              今天是 {{ formatDate(new Date()) }} {{ getWeekday() }}，祝您工作顺利！
            </p>
            <div class="welcome-tags">
              <el-tag type="primary">{{ userInfo.position || '村干部' }}</el-tag>
              <el-tag v-if="userInfo.village" type="success">{{ userInfo.village }}</el-tag>
            </div>
          </div>
          <div class="welcome-stats">
            <div class="stat-item">
              <el-icon :size="24" color="#409eff"><DataAnalysis /></el-icon>
              <div class="stat-text">
                <span class="stat-value">{{ dashboardData.pendingTasks }}</span>
                <span class="stat-label">待办事项</span>
              </div>
            </div>
            <div class="stat-item">
              <el-icon :size="24" color="#67c23a"><CircleCheck /></el-icon>
              <div class="stat-text">
                <span class="stat-value">{{ dashboardData.completedTasks }}</span>
                <span class="stat-label">已完成</span>
              </div>
            </div>
            <div class="stat-item">
              <el-icon :size="24" color="#e6a23c"><Clock /></el-icon>
              <div class="stat-text">
                <span class="stat-value">{{ dashboardData.notifications }}</span>
                <span class="stat-label">未读通知</span>
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </section>

    <!-- 统计卡片区域 -->
    <section class="stats-section">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="8" :lg="4" v-for="stat in statisticsCards" :key="stat.key">
          <el-card class="stat-card" shadow="hover" @click="handleStatClick(stat)">
            <div class="stat-content">
              <div class="stat-icon" :style="{ background: stat.gradient }">
                <el-icon :size="28" color="white">
                  <component :is="stat.icon" />
                </el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stat.value }}</div>
                <div class="stat-label">{{ stat.label }}</div>
                <div class="stat-change" :class="stat.changeClass">
                  <el-icon size="12">
                    <component :is="stat.changeIcon" />
                  </el-icon>
                  <span>{{ stat.change }}</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </section>

    <!-- 主内容区域 -->
    <section class="main-section">
      <el-row :gutter="20">
        <!-- 左侧内容 -->
        <el-col :xs="24" :sm="24" :md="16" :lg="16">
          <!-- 数据图表 -->
          <el-card class="chart-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><DataAnalysis /></el-icon>
                  数据概览
                </span>
                <el-radio-group
                  v-model="chartPeriod"
                  size="small"
                  @change="handleChartPeriodChange"
                >
                  <el-radio-button label="week">本周</el-radio-button>
                  <el-radio-button label="month">本月</el-radio-button>
                  <el-radio-button label="year">全年</el-radio-button>
                </el-radio-group>
              </div>
            </template>
            <div ref="chartRef" class="chart-container"></div>
          </el-card>

          <!-- 快捷操作 -->
          <el-card class="quick-actions-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><Grid /></el-icon>
                  快捷操作
                </span>
              </div>
            </template>
            <div class="quick-actions-grid">
              <div
                v-for="action in quickActions"
                :key="action.id"
                class="quick-action-item"
                @click="handleQuickAction(action)"
              >
                <div class="action-icon" :style="{ background: action.gradient }">
                  <el-icon :size="24" color="white">
                    <component :is="action.icon" />
                  </el-icon>
                </div>
                <span class="action-label">{{ action.label }}</span>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 右侧内容 -->
        <el-col :xs="24" :sm="24" :md="8" :lg="8">
          <!-- 通知公告 -->
          <el-card class="notice-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><Notification /></el-icon>
                  通知公告
                </span>
                <el-badge :value="unreadNoticeCount" type="danger" />
              </div>
            </template>
            <div class="notice-list">
              <div
                v-for="notice in recentNotices"
                :key="notice.id"
                class="notice-item"
                :class="{ unread: !notice.read }"
                @click="handleNoticeClick(notice)"
              >
                <el-tag :type="getNoticeType(notice.level)" size="small" class="notice-tag">
                  {{ notice.level }}
                </el-tag>
                <div class="notice-content">
                  <h4>{{ notice.title }}</h4>
                  <p>{{ notice.summary }}</p>
                  <span class="notice-time">{{ formatRelativeTime(notice.time) }}</span>
                </div>
              </div>
              <el-empty v-if="recentNotices.length === 0" description="暂无通知" />
            </div>
          </el-card>

          <!-- 最近活动 -->
          <el-card class="activity-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><ChatDotRound /></el-icon>
                  最近活动
                </span>
              </div>
            </template>
            <div class="activity-list">
              <div v-for="activity in recentActivities" :key="activity.id" class="activity-item">
                <el-avatar :size="40" :src="activity.avatar">
                  {{ activity.user.charAt(0) }}
                </el-avatar>
                <div class="activity-content">
                  <p>
                    <strong>{{ activity.user }}</strong>
                    {{ activity.action }}
                  </p>
                  <span class="activity-time">{{ formatRelativeTime(activity.time) }}</span>
                </div>
              </div>
              <el-empty v-if="recentActivities.length === 0" description="暂无活动" />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </section>

    <!-- 通知详情对话框 -->
    <el-dialog
      v-model="showNoticeDialog"
      :title="selectedNotice?.title"
      width="600px"
      destroy-on-close
    >
      <div class="notice-detail" v-if="selectedNotice">
        <div class="notice-meta">
          <el-tag :type="getNoticeType(selectedNotice.level)" size="small">
            {{ selectedNotice.level }}
          </el-tag>
          <span class="notice-date">{{ formatDateTime(selectedNotice.time) }}</span>
        </div>
        <div class="notice-body">
          <p>{{ selectedNotice.content }}</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="showNoticeDialog = false">关闭</el-button>
        <el-button type="primary" @click="markNoticeRead">标记已读</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { ElMessage } from 'element-plus';
import * as echarts from 'echarts';
import {
  DataAnalysis,
  CircleCheck,
  Clock,
  Users,
  OfficeBuilding,
  Money,
  Service,
  UserFilled,
  Grid,
  Notification,
  ChatDotRound,
  Bell,
  Plus,
  Edit,
  Document,
  Setting,
  TrendCharts,
  House,
} from '@element-plus/icons-vue';
import dashboardApi from '@/api/dashboard';

interface StatCard {
  key: string;
  label: string;
  value: number;
  icon: string;
  gradient: string;
  change: string;
  changeClass: string;
  changeIcon: string;
  route?: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  gradient: string;
  route?: string;
}

interface Notice {
  id: string;
  title: string;
  content: string;
  summary: string;
  level: 'urgent' | 'important' | 'general';
  time: Date;
  read: boolean;
}

interface Activity {
  id: string;
  user: string;
  avatar?: string;
  action: string;
  time: Date;
}

const router = useRouter();
const userStore = useUserStore();

const chartRef = ref<HTMLDivElement | null>(null);
const chartPeriod = ref('week');
const chartInstance = ref<echarts.ECharts | null>(null);

const showNoticeDialog = ref(false);
const selectedNotice = ref<Notice | null>(null);

const userInfo = computed(() => userStore.userInfo || {});

const dashboardData = ref({
  pendingTasks: 5,
  completedTasks: 23,
  notifications: 3,
});

const statisticsCards = ref<StatCard[]>([
  {
    key: 'residents',
    label: '村民总数',
    value: 1256,
    icon: 'Users',
    gradient: 'linear-gradient(135deg, #0369A1 0%, #0ea5e9 100%)',
    change: '+12%',
    changeClass: 'positive',
    changeIcon: 'ArrowUp',
    route: '/pc/residents',
  },
  {
    key: 'households',
    label: '家庭户数',
    value: 456,
    icon: 'OfficeBuilding',
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    change: '+5%',
    changeClass: 'positive',
    changeIcon: 'ArrowUp',
  },
  {
    key: 'finance',
    label: '财务收入',
    value: 156.8,
    icon: 'Money',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
    change: '+8.2%',
    changeClass: 'positive',
    changeIcon: 'ArrowUp',
    route: '/pc/finance',
  },
  {
    key: 'services',
    label: '服务次数',
    value: 328,
    icon: 'Service',
    gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
    change: '+15%',
    changeClass: 'positive',
    changeIcon: 'ArrowUp',
    route: '/pc/services',
  },
  {
    key: 'members',
    label: '村委成员',
    value: 12,
    icon: 'UserFilled',
    gradient: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)',
    change: '0%',
    changeClass: 'neutral',
    changeIcon: 'Minus',
  },
  {
    key: 'tasks',
    label: '待办任务',
    value: 8,
    icon: 'TrendCharts',
    gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
    change: '-3%',
    changeClass: 'negative',
    changeIcon: 'ArrowDown',
    route: '/pc/affairs',
  },
]);

const quickActions = ref<QuickAction[]>([
  {
    id: 'addResident',
    label: '添加村民',
    icon: 'Plus',
    gradient: 'linear-gradient(135deg, #0369A1 0%, #0ea5e9 100%)',
    route: '/pc/residents?action=add',
  },
  {
    id: 'publishNotice',
    label: '发布公告',
    icon: 'Edit',
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    route: '/pc/affairs?action=notice',
  },
  {
    id: 'viewReport',
    label: '查看报表',
    icon: 'Document',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
    route: '/pc/affairs?action=report',
  },
  {
    id: 'dutySchedule',
    label: '值班管理',
    icon: 'Bell',
    gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
  },
  {
    id: 'settings',
    label: '系统设置',
    icon: 'Setting',
    gradient: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)',
    route: '/pc/settings',
  },
  {
    id: 'homepage',
    label: '返回首页',
    icon: 'House',
    gradient: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
    route: '/',
  },
]);

const recentNotices = ref<Notice[]>([
  {
    id: '1',
    title: '关于召开村委会议的通知',
    content: '定于本周五下午2点召开村委会议，讨论年度工作计划。',
    summary: '讨论年度工作计划',
    level: 'important',
    time: new Date(Date.now() - 1800000),
    read: false,
  },
  {
    id: '2',
    title: '冬季防火安全提示',
    content: '请各位村民注意冬季用火安全，防范火灾发生。',
    summary: '用火安全提示',
    level: 'general',
    time: new Date(Date.now() - 7200000),
    read: false,
  },
  {
    id: '3',
    title: '医保缴费提醒',
    content: '2024年度城乡居民医疗保险缴费工作已开始。',
    summary: '医保缴费提醒',
    level: 'urgent',
    time: new Date(Date.now() - 86400000),
    read: true,
  },
]);

const recentActivities = ref<Activity[]>([
  {
    id: '1',
    user: '张三',
    action: '提交了低保申请',
    time: new Date(Date.now() - 600000),
  },
  {
    id: '2',
    user: '李四',
    action: '完成了户籍信息变更',
    time: new Date(Date.now() - 1800000),
  },
  {
    id: '3',
    user: '王五',
    action: '咨询了医保政策',
    time: new Date(Date.now() - 3600000),
  },
  {
    id: '4',
    user: '赵六',
    action: '提交了建房申请',
    time: new Date(Date.now() - 7200000),
  },
]);

const unreadNoticeCount = computed(() => {
  return recentNotices.value.filter(n => !n.read).length;
});

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 6) return '凌晨好';
  if (hour < 9) return '早上好';
  if (hour < 12) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  if (hour < 22) return '晚上好';
  return '夜深了';
};

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekday = (): string => {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return weekdays[new Date().getDay()];
};

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return formatDate(date);
};

const formatDateTime = (date: Date): string => {
  return `${formatDate(date)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const getNoticeType = (level: string): string => {
  const typeMap: Record<string, string> = {
    urgent: 'danger',
    important: 'warning',
    general: 'info',
  };
  return typeMap[level] || 'info';
};

const handleStatClick = (stat: StatCard) => {
  if (stat.route) {
    router.push(stat.route);
  }
};

const handleQuickAction = (action: QuickAction) => {
  if (action.route) {
    router.push(action.route);
  } else {
    ElMessage.info(`${action.label}功能开发中`);
  }
};

const handleNoticeClick = (notice: Notice) => {
  selectedNotice.value = notice;
  showNoticeDialog.value = true;
};

const markNoticeRead = () => {
  if (selectedNotice.value) {
    selectedNotice.value.read = true;
    ElMessage.success('已标记为已读');
    showNoticeDialog.value = false;
  }
};

const handleChartPeriodChange = () => {
  updateChart();
};

const initChart = () => {
  if (!chartRef.value) return;

  chartInstance.value = echarts.init(chartRef.value);

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
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
    yAxis: { type: 'value' },
    series: [
      {
        name: '新增村民',
        type: 'bar',
        data: [2, 4, 6, 3, 5, 8, 4],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#0369A1' },
            { offset: 1, color: '#0ea5e9' },
          ]),
        },
      },
      {
        name: '处理事务',
        type: 'bar',
        data: [8, 12, 15, 10, 14, 18, 12],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#059669' },
            { offset: 1, color: '#10b981' },
          ]),
        },
      },
      {
        name: '发布公告',
        type: 'bar',
        data: [3, 5, 4, 6, 5, 8, 6],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#7c3aed' },
            { offset: 1, color: '#a78bfa' },
          ]),
        },
      },
    ],
  };

  chartInstance.value.setOption(option);
};

const updateChart = () => {
  if (!chartInstance.value) return;

  const dataMap: Record<
    string,
    { xAxis: string[]; data1: number[]; data2: number[]; data3: number[] }
  > = {
    week: {
      xAxis: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      data1: [2, 4, 6, 3, 5, 8, 4],
      data2: [8, 12, 15, 10, 14, 18, 12],
      data3: [3, 5, 4, 6, 5, 8, 6],
    },
    month: {
      xAxis: ['第一周', '第二周', '第三周', '第四周'],
      data1: [15, 22, 18, 25],
      data2: [45, 52, 48, 55],
      data3: [12, 18, 15, 20],
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
      data1: [20, 25, 30, 28, 35, 40, 38, 42, 45, 50, 48, 55],
      data2: [50, 55, 60, 58, 65, 70, 68, 72, 75, 80, 78, 85],
      data3: [15, 18, 20, 22, 25, 28, 26, 30, 32, 35, 33, 38],
    },
  };

  const data = dataMap[chartPeriod.value];

  chartInstance.value.setOption({
    xAxis: { data: data.xAxis },
    series: [{ data: data.data1 }, { data: data.data2 }, { data: data.data3 }],
  });
};

const loadDashboardData = async () => {
  try {
    const villageId = userStore.villageId || 'default';
    const response = await dashboardApi.getDashboardData(villageId);
    if (response.success && response.data) {
      dashboardData.value = response.data;
    }
  } catch (error) {
    console.error('加载仪表板数据失败:', error);
  }
};

onMounted(async () => {
  await loadDashboardData();
  await nextTick();
  initChart();

  window.addEventListener('resize', () => {
    chartInstance.value?.resize();
  });
});
</script>

<style lang="scss" scoped>
.pc-dashboard {
  padding: 0;
}

.welcome-section {
  margin-bottom: 24px;
}

.welcome-card {
  :deep(.el-card__body) {
    padding: 24px;
  }
}

.welcome-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.welcome-info {
  .welcome-title {
    font-size: 28px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 8px;
  }

  .welcome-subtitle {
    font-size: 14px;
    color: #909399;
    margin: 0 0 16px;
  }

  .welcome-tags {
    display: flex;
    gap: 8px;
  }
}

.welcome-stats {
  display: flex;
  gap: 32px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-text {
  display: flex;
  flex-direction: column;

  .stat-value {
    font-size: 24px;
    font-weight: 600;
    color: #303133;
  }

  .stat-label {
    font-size: 12px;
    color: #909399;
  }
}

.stats-section {
  margin-bottom: 24px;
}

.stat-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition:
    transform 0.3s,
    box-shadow 0.3s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }

  :deep(.el-card__body) {
    padding: 20px;
  }
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-info {
  flex: 1;

  .stat-value {
    font-size: 24px;
    font-weight: 600;
    color: #303133;
  }

  .stat-label {
    font-size: 13px;
    color: #909399;
    margin-bottom: 4px;
  }

  .stat-change {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;

    &.positive {
      color: #67c23a;
    }

    &.negative {
      color: #f56c6c;
    }

    &.neutral {
      color: #909399;
    }
  }
}

.main-section {
  .el-card {
    margin-bottom: 20px;
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.chart-card {
  .chart-container {
    height: 300px;
  }
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.quick-action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border-radius: 12px;
  cursor: pointer;
  transition:
    transform 0.3s,
    box-shadow 0.3s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }

  .action-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .action-label {
    font-size: 14px;
    color: #606266;
  }
}

.notice-list {
  max-height: 360px;
  overflow-y: auto;
}

.notice-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-bottom: 8px;

  &:hover {
    background-color: #f5f7fa;
  }

  &.unread {
    background-color: #ecf5ff;

    &:hover {
      background-color: #d9ecff;
    }
  }

  .notice-tag {
    flex-shrink: 0;
  }

  .notice-content {
    flex: 1;
    min-width: 0;

    h4 {
      margin: 0 0 4px;
      font-size: 14px;
      font-weight: 500;
      color: #303133;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    p {
      margin: 0 0 8px;
      font-size: 13px;
      color: #606266;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .notice-time {
      font-size: 12px;
      color: #909399;
    }
  }
}

.activity-list {
  max-height: 360px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #ebeef5;

  &:last-child {
    border-bottom: none;
  }

  .activity-content {
    flex: 1;

    p {
      margin: 0 0 4px;
      font-size: 14px;
      color: #606266;

      strong {
        color: #303133;
      }
    }

    .activity-time {
      font-size: 12px;
      color: #909399;
    }
  }
}

.notice-detail {
  .notice-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #ebeef5;

    .notice-date {
      font-size: 13px;
      color: #909399;
    }
  }

  .notice-body {
    p {
      font-size: 14px;
      line-height: 1.8;
      color: #606266;
    }
  }
}

@media (max-width: 768px) {
  .welcome-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 24px;
  }

  .welcome-stats {
    width: 100%;
    justify-content: space-between;
  }

  .quick-actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .stat-item {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
}
</style>
