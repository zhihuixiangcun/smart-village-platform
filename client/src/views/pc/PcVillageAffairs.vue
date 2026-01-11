<!--
  PC端村务管理页面
  智慧乡村综合服务平台 - PC端村务管理
-->
<template>
  <div class="pc-village-affairs">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <h1>村务管理</h1>
        <p>村务公开、公告发布、任务管理、会议记录、投票管理</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showPublishNotice">
          <el-icon><Edit /></el-icon>
          发布公告
        </el-button>
        <el-button @click="showCreateTask">
          <el-icon><Plus /></el-icon>
          创建任务
        </el-button>
      </div>
    </header>

    <!-- 统计概览 -->
    <section class="stats-section">
      <el-row :gutter="20">
        <el-col :xs="12" :sm="8" :md="4" v-for="stat in statistics" :key="stat.key">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon" :style="{ background: stat.gradient }">
                <el-icon :size="24" color="white">
                  <component :is="stat.icon" />
                </el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stat.value }}</div>
                <div class="stat-label">{{ stat.label }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </section>

    <!-- 主内容区域 -->
    <section class="main-section">
      <el-row :gutter="20">
        <!-- 左侧主内容 -->
        <el-col :xs="24" :sm="24" :md="16" :lg="16">
          <!-- 标签页 -->
          <el-card class="content-card" shadow="never">
            <el-tabs v-model="activeTab" class="affairs-tabs">
              <!-- 公告管理 -->
              <el-tab-pane label="公告管理" name="notice">
                <div class="tab-header">
                  <el-input
                    v-model="noticeSearch"
                    placeholder="搜索公告..."
                    prefix-icon="Search"
                    clearable
                    class="search-input"
                  />
                  <el-select v-model="noticeFilter" placeholder="筛选状态" clearable>
                    <el-option label="全部" value="" />
                    <el-option label="已发布" value="published" />
                    <el-option label="草稿" value="draft" />
                    <el-option label="已过期" value="expired" />
                  </el-select>
                </div>
                <div class="notice-list">
                  <div
                    v-for="notice in filteredNotices"
                    :key="notice.id"
                    class="notice-item"
                    @click="viewNotice(notice)"
                  >
                    <div class="notice-header">
                      <el-tag :type="getNoticeType(notice.level)" size="small">
                        {{ notice.level }}
                      </el-tag>
                      <span class="notice-title">{{ notice.title }}</span>
                    </div>
                    <p class="notice-summary">{{ notice.summary }}</p>
                    <div class="notice-footer">
                      <span class="notice-author">{{ notice.author }}</span>
                      <span class="notice-time">{{ formatTime(notice.time) }}</span>
                      <div class="notice-actions">
                        <el-button size="small" text @click.stop="editNotice(notice)"
                          >编辑</el-button
                        >
                        <el-button
                          size="small"
                          text
                          type="danger"
                          @click.stop="deleteNotice(notice)"
                          >删除</el-button
                        >
                      </div>
                    </div>
                  </div>
                  <el-empty v-if="filteredNotices.length === 0" description="暂无公告" />
                </div>
              </el-tab-pane>

              <!-- 任务管理 -->
              <el-tab-pane label="任务管理" name="task">
                <div class="tab-header">
                  <el-input
                    v-model="taskSearch"
                    placeholder="搜索任务..."
                    prefix-icon="Search"
                    clearable
                    class="search-input"
                  />
                  <el-select v-model="taskFilter" placeholder="筛选状态" clearable>
                    <el-option label="全部" value="" />
                    <el-option label="待处理" value="pending" />
                    <el-option label="进行中" value="in_progress" />
                    <el-option label="已完成" value="completed" />
                    <el-option label="已过期" value="overdue" />
                  </el-select>
                </div>
                <div class="task-board">
                  <div v-for="column in taskColumns" :key="column.key" class="task-column">
                    <div class="column-header">
                      <span class="column-title">{{ column.title }}</span>
                      <el-badge :value="column.tasks.length" type="primary" />
                    </div>
                    <div class="column-content">
                      <div
                        v-for="task in column.tasks"
                        :key="task.id"
                        class="task-card"
                        @click="viewTask(task)"
                      >
                        <div class="task-priority" :class="task.priority"></div>
                        <div class="task-content">
                          <h4>{{ task.title }}</h4>
                          <p>{{ task.description }}</p>
                          <div class="task-meta">
                            <el-avatar :size="24" :src="task.assignee?.avatar">
                              {{ task.assignee?.name?.charAt(0) }}
                            </el-avatar>
                            <span class="task-deadline">
                              <el-icon><Clock /></el-icon>
                              {{ formatDate(task.deadline) }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </el-tab-pane>

              <!-- 会议记录 -->
              <el-tab-pane label="会议记录" name="meeting">
                <div class="tab-header">
                  <el-input
                    v-model="meetingSearch"
                    placeholder="搜索会议..."
                    prefix-icon="Search"
                    clearable
                    class="search-input"
                  />
                  <el-button type="primary" @click="showCreateMeeting">
                    <el-icon><Plus /></el-icon>
                    创建会议
                  </el-button>
                </div>
                <div class="meeting-list">
                  <el-table :data="meetings" style="width: 100%">
                    <el-table-column prop="title" label="会议主题" min-width="200">
                      <template #default="{ row }">
                        <span class="meeting-title">{{ row.title }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column prop="time" label="会议时间" width="180">
                      <template #default="{ row }">
                        {{ formatDateTime(row.time) }}
                      </template>
                    </el-table-column>
                    <el-table-column prop="location" label="会议地点" width="120" />
                    <el-table-column prop="host" label="主持人" width="100" />
                    <el-table-column prop="participants" label="参与人" width="100">
                      <template #default="{ row }">
                        {{ row.participants?.length || 0 }}人
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="200">
                      <template #default="{ row }">
                        <el-button size="small" @click="viewMeeting(row)">查看</el-button>
                        <el-button size="small" @click="editMeeting(row)">编辑</el-button>
                        <el-button size="small" type="danger" text @click="deleteMeeting(row)"
                          >删除</el-button
                        >
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </el-tab-pane>

              <!-- 投票管理 -->
              <el-tab-pane label="投票管理" name="vote">
                <div class="tab-header">
                  <el-input
                    v-model="voteSearch"
                    placeholder="搜索投票..."
                    prefix-icon="Search"
                    clearable
                    class="search-input"
                  />
                  <el-button type="primary" @click="showCreateVote">
                    <el-icon><Plus /></el-icon>
                    创建投票
                  </el-button>
                </div>
                <div class="vote-list">
                  <div v-for="vote in filteredVotes" :key="vote.id" class="vote-card">
                    <div class="vote-header">
                      <span class="vote-title">{{ vote.title }}</span>
                      <el-tag :type="getVoteStatusType(vote.status)" size="small">
                        {{ getVoteStatusLabel(vote.status) }}
                      </el-tag>
                    </div>
                    <p class="vote-description">{{ vote.description }}</p>
                    <div class="vote-progress">
                      <div class="progress-info">
                        <span>参与人数: {{ vote.participated }}</span>
                        <span>截止时间: {{ formatDate(vote.endTime) }}</span>
                      </div>
                      <div class="progress-bar">
                        <div
                          class="progress-fill"
                          :style="{ width: `${(vote.participated / vote.total) * 100}%` }"
                        ></div>
                      </div>
                    </div>
                    <div class="vote-actions">
                      <el-button size="small" @click="viewVoteDetail(vote)">查看详情</el-button>
                      <el-button
                        v-if="vote.status === 'active'"
                        size="small"
                        type="primary"
                        @click="endVote(vote)"
                      >
                        结束投票
                      </el-button>
                    </div>
                  </div>
                  <el-empty v-if="filteredVotes.length === 0" description="暂无投票" />
                </div>
              </el-tab-pane>
            </el-tabs>
          </el-card>
        </el-col>

        <!-- 右侧侧边栏 -->
        <el-col :xs="24" :sm="24" :md="8" :lg="8">
          <!-- 待办事项 -->
          <el-card class="sidebar-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><Clock /></el-icon>
                  待办事项
                </span>
                <el-badge :value="pendingTasks.length" type="danger" />
              </div>
            </template>
            <div class="pending-list">
              <div v-for="task in pendingTasks" :key="task.id" class="pending-item">
                <el-checkbox v-model="task.completed" @change="completeTask(task)">
                  <div class="pending-content">
                    <span :class="{ completed: task.completed }">{{ task.title }}</span>
                    <el-tag :type="getPriorityType(task.priority)" size="small">
                      {{ task.priority }}
                    </el-tag>
                  </div>
                </el-checkbox>
              </div>
              <el-empty v-if="pendingTasks.length === 0" description="暂无待办" />
            </div>
          </el-card>

          <!-- 近期活动 -->
          <el-card class="sidebar-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><ChatDotRound /></el-icon>
                  近期活动
                </span>
              </div>
            </template>
            <div class="activity-timeline">
              <div v-for="activity in recentActivities" :key="activity.id" class="timeline-item">
                <div class="timeline-dot" :class="activity.type"></div>
                <div class="timeline-content">
                  <p>{{ activity.description }}</p>
                  <span class="timeline-time">{{ formatTime(activity.time) }}</span>
                </div>
              </div>
              <el-empty v-if="recentActivities.length === 0" description="暂无活动" />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </section>

    <!-- 发布公告对话框 -->
    <el-dialog v-model="showNoticeDialog" title="发布公告" width="700px" destroy-on-close>
      <el-form :model="noticeForm" label-width="80px">
        <el-form-item label="公告标题" required>
          <el-input v-model="noticeForm.title" placeholder="请输入公告标题" />
        </el-form-item>
        <el-form-item label="公告级别" required>
          <el-select v-model="noticeForm.level" placeholder="请选择">
            <el-option label="普通" value="general" />
            <el-option label="重要" value="important" />
            <el-option label="紧急" value="urgent" />
          </el-select>
        </el-form-item>
        <el-form-item label="公告内容" required>
          <el-input
            v-model="noticeForm.content"
            type="textarea"
            :rows="6"
            placeholder="请输入公告内容"
          />
        </el-form-item>
        <el-form-item label="有效期">
          <el-date-picker v-model="noticeForm.expiryDate" type="date" placeholder="选择过期日期" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showNoticeDialog = false">取消</el-button>
        <el-button @click="saveNoticeDraft">保存草稿</el-button>
        <el-button type="primary" @click="publishNotice">立即发布</el-button>
      </template>
    </el-dialog>

    <!-- 创建任务对话框 -->
    <el-dialog v-model="showTaskDialog" title="创建任务" width="600px" destroy-on-close>
      <el-form :model="taskForm" label-width="80px">
        <el-form-item label="任务标题" required>
          <el-input v-model="taskForm.title" placeholder="请输入任务标题" />
        </el-form-item>
        <el-form-item label="任务描述">
          <el-input
            v-model="taskForm.description"
            type="textarea"
            :rows="4"
            placeholder="请输入任务描述"
          />
        </el-form-item>
        <el-form-item label="优先级" required>
          <el-select v-model="taskForm.priority" placeholder="请选择">
            <el-option label="高" value="high" />
            <el-option label="中" value="medium" />
            <el-option label="低" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item label="截止日期" required>
          <el-date-picker v-model="taskForm.deadline" type="date" placeholder="选择截止日期" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-select v-model="taskForm.assigneeId" placeholder="选择负责人">
            <el-option label="张三" value="1" />
            <el-option label="李四" value="2" />
            <el-option label="王五" value="3" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showTaskDialog = false">取消</el-button>
        <el-button type="primary" @click="createTask">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Edit, Plus, Search, Clock, ChatDotRound, Grid } from '@element-plus/icons-vue';

interface Notice {
  id: string;
  title: string;
  summary: string;
  content: string;
  level: 'general' | 'important' | 'urgent';
  author: string;
  time: Date;
  status: 'published' | 'draft' | 'expired';
}

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  deadline: Date;
  assignee?: { name: string; avatar?: string };
}

interface Meeting {
  id: string;
  title: string;
  time: Date;
  location: string;
  host: string;
  participants: string[];
  content: string;
}

interface Vote {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'ended' | 'draft';
  startTime: Date;
  endTime: Date;
  participated: number;
  total: number;
}

interface PendingTask {
  id: string;
  title: string;
  priority: string;
  completed: boolean;
}

interface Activity {
  id: string;
  description: string;
  time: Date;
  type: 'notice' | 'task' | 'meeting' | 'vote';
}

const router = useRouter();

const activeTab = ref('notice');
const noticeSearch = ref('');
const noticeFilter = ref('');
const taskSearch = ref('');
const taskFilter = ref('');
const meetingSearch = ref('');
const voteSearch = ref('');

const showNoticeDialog = ref(false);
const showTaskDialog = ref(false);

const statistics = ref([
  {
    key: 'notices',
    label: '公告总数',
    value: 24,
    icon: 'Edit',
    gradient: 'linear-gradient(135deg, #0369A1 0%, #0ea5e9 100%)',
  },
  {
    key: 'tasks',
    label: '任务总数',
    value: 18,
    icon: 'List',
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
  },
  {
    key: 'meetings',
    label: '会议次数',
    value: 8,
    icon: 'Calendar',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
  },
  {
    key: 'votes',
    label: '投票活动',
    value: 5,
    icon: 'PieChart',
    gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
  },
  {
    key: 'pending',
    label: '待办事项',
    value: 6,
    icon: 'Clock',
    gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
  },
]);

const notices = ref<Notice[]>([
  {
    id: '1',
    title: '关于召开村民大会的通知',
    summary: '定于本月15日召开村民大会，讨论村集体经济发展计划。',
    content: '',
    level: 'important',
    author: '村委会',
    time: new Date(),
    status: 'published',
  },
  {
    id: '2',
    title: '夏季防火安全提示',
    summary: '夏季高温，请各位村民注意用火用电安全。',
    content: '',
    level: 'general',
    author: '村委会',
    time: new Date(Date.now() - 86400000),
    status: 'published',
  },
  {
    id: '3',
    title: '医保缴费通知',
    summary: '2024年度城乡居民医保缴费工作已开始。',
    content: '',
    level: 'urgent',
    author: '村委会',
    time: new Date(Date.now() - 172800000),
    status: 'published',
  },
]);

const taskColumns = ref([
  {
    key: 'pending',
    title: '待处理',
    tasks: [
      {
        id: '1',
        title: '审批低保申请',
        description: '审批张三的低保申请材料',
        priority: 'high',
        status: 'pending',
        deadline: new Date(Date.now() + 86400000),
      },
      {
        id: '2',
        title: '整理党员档案',
        description: '完善村内党员信息档案',
        priority: 'medium',
        status: 'pending',
        deadline: new Date(Date.now() + 172800000),
      },
    ],
  },
  {
    key: 'in_progress',
    title: '进行中',
    tasks: [
      {
        id: '3',
        title: '环境整治工作',
        description: '村内环境卫生整治行动',
        priority: 'medium',
        status: 'in_progress',
        deadline: new Date(Date.now() + 432000000),
      },
    ],
  },
  {
    key: 'completed',
    title: '已完成',
    tasks: [
      {
        id: '4',
        title: '发放补贴',
        description: '发放农业补贴款项',
        priority: 'low',
        status: 'completed',
        deadline: new Date(Date.now() - 86400000),
      },
    ],
  },
]);

const meetings = ref<Meeting[]>([
  {
    id: '1',
    title: '村委例会',
    time: new Date(Date.now() + 86400000),
    location: '村委会会议室',
    host: '村支书',
    participants: ['村支书', '村主任', '副主任'],
    content: '',
  },
  {
    id: '2',
    title: '村民大会',
    time: new Date(Date.now() + 604800000),
    location: '村委会大院',
    host: '村支书',
    participants: ['全体村民'],
    content: '',
  },
]);

const votes = ref<Vote[]>([
  {
    id: '1',
    title: '村集体经济项目投票',
    description: '选择村集体经济发展项目',
    status: 'active',
    startTime: new Date(),
    endTime: new Date(Date.now() + 604800000),
    participated: 156,
    total: 500,
  },
  {
    id: '2',
    title: '村规民约修订',
    description: '修订村规民约条款',
    status: 'ended',
    startTime: new Date(Date.now() - 604800000),
    endTime: new Date(Date.now() - 86400000),
    participated: 312,
    total: 456,
  },
]);

const pendingTasks = ref<PendingTask[]>([
  { id: '1', title: '审批低保申请', priority: '高', completed: false },
  { id: '2', title: '整理党员档案', priority: '中', completed: false },
  { id: '3', title: '环境整治检查', priority: '中', completed: false },
]);

const recentActivities = ref<Activity[]>([
  {
    id: '1',
    description: '发布了新公告《关于召开村民大会的通知》',
    time: new Date(),
    type: 'notice',
  },
  {
    id: '2',
    description: '创建了新任务《环境整治工作》',
    time: new Date(Date.now() - 3600000),
    type: 'task',
  },
  {
    id: '3',
    description: '村委例会已结束',
    time: new Date(Date.now() - 86400000),
    type: 'meeting',
  },
]);

const noticeForm = ref({
  title: '',
  level: 'general',
  content: '',
  expiryDate: null as Date | null,
});

const taskForm = ref({
  title: '',
  description: '',
  priority: 'medium',
  deadline: null as Date | null,
  assigneeId: '',
});

const filteredNotices = computed(() => {
  return notices.value.filter(notice => {
    const matchSearch = !noticeSearch.value || notice.title.includes(noticeSearch.value);
    const matchFilter = !noticeFilter.value || notice.status === noticeFilter.value;
    return matchSearch && matchFilter;
  });
});

const filteredVotes = computed(() => {
  return votes.value.filter(vote => {
    return !voteSearch.value || vote.title.includes(voteSearch.value);
  });
});

const formatTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString();
};

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

const getVoteStatusType = (status: string): string => {
  const typeMap: Record<string, string> = {
    active: 'success',
    ended: 'info',
    draft: 'warning',
  };
  return typeMap[status] || 'info';
};

const getVoteStatusLabel = (status: string): string => {
  const labelMap: Record<string, string> = {
    active: '进行中',
    ended: '已结束',
    draft: '草稿',
  };
  return labelMap[status] || status;
};

const getPriorityType = (priority: string): string => {
  const typeMap: Record<string, string> = {
    high: 'danger',
    medium: 'warning',
    low: 'info',
  };
  return typeMap[priority] || 'info';
};

const showPublishNotice = () => {
  noticeForm.value = { title: '', level: 'general', content: '', expiryDate: null };
  showNoticeDialog.value = true;
};

const showCreateTask = () => {
  taskForm.value = {
    title: '',
    description: '',
    priority: 'medium',
    deadline: null,
    assigneeId: '',
  };
  showTaskDialog.value = true;
};

const showCreateMeeting = () => {
  ElMessage.info('创建会议功能开发中');
};

const showCreateVote = () => {
  ElMessage.info('创建投票功能开发中');
};

const viewNotice = (notice: Notice) => {
  ElMessage.info(`查看公告: ${notice.title}`);
};

const editNotice = (notice: Notice) => {
  ElMessage.info(`编辑公告: ${notice.title}`);
};

const deleteNotice = async (notice: Notice) => {
  try {
    await ElMessageBox.confirm(`确定要删除公告"${notice.title}"吗？`, '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
    notices.value = notices.value.filter(n => n.id !== notice.id);
    ElMessage.success('删除成功');
  } catch {}
};

const viewTask = (task: Task) => {
  ElMessage.info(`查看任务: ${task.title}`);
};

const viewMeeting = (meeting: Meeting) => {
  ElMessage.info(`查看会议: ${meeting.title}`);
};

const editMeeting = (meeting: Meeting) => {
  ElMessage.info(`编辑会议: ${meeting.title}`);
};

const deleteMeeting = async (meeting: Meeting) => {
  try {
    await ElMessageBox.confirm(`确定要删除会议"${meeting.title}"吗？`, '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
    meetings.value = meetings.value.filter(m => m.id !== meeting.id);
    ElMessage.success('删除成功');
  } catch {}
};

const viewVoteDetail = (vote: Vote) => {
  ElMessage.info(`查看投票: ${vote.title}`);
};

const endVote = async (vote: Vote) => {
  try {
    await ElMessageBox.confirm(`确定要结束投票"${vote.title}"吗？`, '结束投票确认', {
      confirmButtonText: '确定结束',
      cancelButtonText: '取消',
      type: 'warning',
    });
    vote.status = 'ended';
    ElMessage.success('投票已结束');
  } catch {}
};

const completeTask = (task: PendingTask) => {
  ElMessage.success(task.completed ? '任务已完成' : '已取消完成');
};

const saveNoticeDraft = () => {
  ElMessage.success('草稿保存成功');
  showNoticeDialog.value = false;
};

const publishNotice = () => {
  if (!noticeForm.value.title) {
    ElMessage.warning('请输入公告标题');
    return;
  }
  ElMessage.success('公告发布成功');
  showNoticeDialog.value = false;
};

const createTask = () => {
  if (!taskForm.value.title) {
    ElMessage.warning('请输入任务标题');
    return;
  }
  ElMessage.success('任务创建成功');
  showTaskDialog.value = false;
};
</script>

<style lang="scss" scoped>
.pc-village-affairs {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);

  .header-content {
    h1 {
      margin: 0 0 8px;
      font-size: 24px;
      font-weight: 600;
      color: #303133;
    }

    p {
      margin: 0;
      font-size: 14px;
      color: #909399;
    }
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }
}

.stats-section {
  margin-bottom: 24px;
}

.stat-card {
  margin-bottom: 20px;

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
    .stat-value {
      font-size: 28px;
      font-weight: 600;
      color: #303133;
    }

    .stat-label {
      font-size: 13px;
      color: #909399;
    }
  }
}

.content-card {
  .tab-header {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;

    .search-input {
      width: 280px;
    }
  }
}

.affairs-tabs {
  :deep(.el-tabs__content) {
    padding: 0 20px 20px;
  }
}

.notice-list {
  .notice-item {
    padding: 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.3s;
    margin-bottom: 12px;
    border: 1px solid #ebeef5;

    &:hover {
      background-color: #f5f7fa;
    }

    .notice-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;

      .notice-title {
        font-size: 16px;
        font-weight: 500;
        color: #303133;
      }
    }

    .notice-summary {
      font-size: 14px;
      color: #606266;
      margin: 0 0 12px;
      line-height: 1.5;
    }

    .notice-footer {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 13px;
      color: #909399;

      .notice-actions {
        margin-left: auto;
        display: flex;
        gap: 8px;
      }
    }
  }
}

.task-board {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 16px;
}

.task-column {
  flex: 1;
  min-width: 200px;
  background: #f5f7fa;
  border-radius: 8px;
  padding: 12px;

  .column-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;

    .column-title {
      font-size: 14px;
      font-weight: 500;
      color: #303133;
    }
  }

  .column-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
}

.task-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: box-shadow 0.3s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .task-priority {
    height: 3px;
    border-radius: 2px;
    margin-bottom: 8px;

    &.high {
      background: #f56c6c;
    }

    &.medium {
      background: #e6a23c;
    }

    &.low {
      background: #67c23a;
    }
  }

  .task-content {
    h4 {
      margin: 0 0 4px;
      font-size: 14px;
      font-weight: 500;
      color: #303133;
    }

    p {
      margin: 0 0 8px;
      font-size: 12px;
      color: #909399;
    }

    .task-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .task-deadline {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: #909399;
      }
    }
  }
}

.meeting-list {
  .meeting-title {
    font-weight: 500;
    color: #303133;
  }
}

.vote-list {
  .vote-card {
    background: #fff;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;

    .vote-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;

      .vote-title {
        font-size: 16px;
        font-weight: 500;
        color: #303133;
      }
    }

    .vote-description {
      font-size: 14px;
      color: #606266;
      margin: 0 0 16px;
    }

    .vote-progress {
      margin-bottom: 16px;

      .progress-info {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        color: #909399;
        margin-bottom: 8px;
      }

      .progress-bar {
        height: 8px;
        background: #e4e7ed;
        border-radius: 4px;
        overflow: hidden;

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #409eff 0%, #67c23a 100%);
          border-radius: 4px;
          transition: width 0.3s;
        }
      }
    }

    .vote-actions {
      display: flex;
      gap: 8px;
    }
  }
}

.sidebar-card {
  margin-bottom: 20px;

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 500;
      color: #303133;
    }
  }
}

.pending-list {
  .pending-item {
    padding: 12px 0;
    border-bottom: 1px solid #ebeef5;

    &:last-child {
      border-bottom: none;
    }

    .pending-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;

      span.completed {
        text-decoration: line-through;
        color: #909399;
      }
    }
  }
}

.activity-timeline {
  .timeline-item {
    display: flex;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #ebeef5;

    &:last-child {
      border-bottom: none;
    }

    .timeline-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-top: 6px;
      flex-shrink: 0;

      &.notice {
        background: #409eff;
      }

      &.task {
        background: #e6a23c;
      }

      &.meeting {
        background: #67c23a;
      }

      &.vote {
        background: #909399;
      }
    }

    .timeline-content {
      flex: 1;

      p {
        margin: 0 0 4px;
        font-size: 14px;
        color: #606266;
      }

      .timeline-time {
        font-size: 12px;
        color: #909399;
      }
    }
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .task-board {
    flex-direction: column;
  }

  .tab-header {
    flex-direction: column;

    .search-input {
      width: 100%;
    }
  }
}
</style>
