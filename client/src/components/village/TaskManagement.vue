<template>
  <div class="task-management">
    <div class="toolbar">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-input
            v-model="searchQuery"
            placeholder="搜索任务标题..."
            :size="largeTextMode ? 'large' : 'default'"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select
            v-model="statusFilter"
            placeholder="状态筛选"
            :size="largeTextMode ? 'large' : 'default'"
            clearable
          >
            <el-option label="全部" value="" />
            <el-option label="待分配" value="pending" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select
            v-model="priorityFilter"
            placeholder="优先级"
            :size="largeTextMode ? 'large' : 'default'"
            clearable
          >
            <el-option label="全部" value="" />
            <el-option label="高" value="high" />
            <el-option label="中" value="medium" />
            <el-option label="低" value="low" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select
            v-model="categoryFilter"
            placeholder="任务分类"
            :size="largeTextMode ? 'large' : 'default'"
            clearable
          >
            <el-option label="全部分类" value="" />
            <el-option label="安全生产" value="安全生产" />
            <el-option label="疫情防控" value="疫情防控" />
            <el-option label="环境整治" value="环境整治" />
            <el-option label="村务服务" value="村务服务" />
            <el-option label="应急响应" value="应急响应" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <div class="toolbar-actions">
            <el-button type="primary" @click="$emit('refresh')" :loading="loading">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
            <el-button type="success" @click="showStatsDialog">
              <el-icon><TrendCharts /></el-icon>
              统计分析
            </el-button>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="task-list" v-loading="loading">
      <div
        v-for="task in filteredTasks"
        :key="task.id"
        class="task-item"
        :class="getTaskItemClass(task)"
      >
        <div class="task-header">
          <div class="task-title">
            <div class="priority-indicator" :class="task.priority"></div>
            <span>{{ task.title }}</span>
            <el-tag :type="getPriorityType(task.priority)" size="small">
              {{ getPriorityLabel(task.priority) }}
            </el-tag>
            <el-tag :type="getStatusType(task.status)" size="small">
              {{ getStatusLabel(task.status) }}
            </el-tag>
          </div>
          <div class="task-time">{{ task.createTime }}</div>
        </div>

        <div class="task-content">
          <div class="task-description">{{ task.description }}</div>
          <div class="task-meta">
            <div class="meta-item">
              <el-icon><User /></el-icon>
              <span>{{ task.assignee || '未分配' }}</span>
            </div>
            <div class="meta-item">
              <el-icon><Clock /></el-icon>
              <span>截止：{{ task.deadline }}</span>
            </div>
            <div class="meta-item">
              <el-icon><Folder /></el-icon>
              <span>{{ task.category }}</span>
            </div>
          </div>
        </div>

        <div class="task-progress" v-if="task.status === 'in_progress'">
          <div class="progress-label">完成进度</div>
          <el-progress :percentage="task.progress || 0" :stroke-width="8" :show-text="true" />
        </div>

        <div class="task-actions">
          <el-button
            v-if="task.status === 'pending'"
            size="small"
            type="primary"
            @click="handleAssignTask(task)"
          >
            <el-icon><User /></el-icon>
            分配任务
          </el-button>
          <el-button
            v-if="task.status === 'in_progress'"
            size="small"
            type="success"
            @click="handleUpdateProgress(task)"
          >
            <el-icon><Edit /></el-icon>
            更新进度
          </el-button>
          <el-button
            v-if="task.status === 'in_progress'"
            size="small"
            type="warning"
            @click="handleCompleteTask(task)"
          >
            <el-icon><Check /></el-icon>
            完成任务
          </el-button>
          <el-dropdown @command="handleTaskCommand" trigger="click">
            <el-button size="small">
              更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :command="{ action: 'view', task }"> 查看详情 </el-dropdown-item>
                <el-dropdown-item :command="{ action: 'edit', task }"> 编辑任务 </el-dropdown-item>
                <el-dropdown-item :command="{ action: 'reminder', task }">
                  发送提醒
                </el-dropdown-item>
                <el-dropdown-item :command="{ action: 'cancel', task }" divided>
                  取消任务
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <el-empty v-if="filteredTasks.length === 0" description="暂无任务" />
    </div>

    <!-- 任务分配对话框 -->
    <el-dialog v-model="assignDialogVisible" title="分配任务" width="500px">
      <el-form :model="assignForm" label-width="100px">
        <el-form-item label="任务标题">
          <el-input v-model="assignForm.title" disabled />
        </el-form-item>
        <el-form-item label="分配给">
          <el-select v-model="assignForm.assigneeId" placeholder="选择执行人" style="width: 100%">
            <el-option
              v-for="personnel in personnelList"
              :key="personnel.id"
              :label="personnel.name"
              :value="personnel.id"
            >
              <div class="personnel-option">
                <el-avatar :size="24">{{ personnel.name.charAt(0) }}</el-avatar>
                <span>{{ personnel.name }}</span>
                <el-tag size="small">{{ personnel.role }}</el-tag>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="截止时间">
          <el-date-picker
            v-model="assignForm.deadline"
            type="datetime"
            placeholder="选择截止时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="assignForm.note"
            type="textarea"
            :rows="3"
            placeholder="分配备注（可选）"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAssign" :loading="assigning"> 确认分配 </el-button>
      </template>
    </el-dialog>

    <!-- 进度更新对话框 -->
    <el-dialog v-model="progressDialogVisible" title="更新任务进度" width="400px">
      <el-form :model="progressForm" label-width="80px">
        <el-form-item label="任务">
          <el-input v-model="progressForm.title" disabled />
        </el-form-item>
        <el-form-item label="进度">
          <el-slider v-model="progressForm.progress" :min="0" :max="100" :step="5" show-input />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="progressForm.status" style="width: 100%">
            <el-option label="进行中" value="in_progress" />
            <el-option label="已完成" value="completed" />
            <el-option label="遇到问题" value="blocked" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="progressForm.note" type="textarea" :rows="3" placeholder="进度说明" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="progressDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmUpdateProgress" :loading="updating">
          确认更新
        </el-button>
      </template>
    </el-dialog>

    <!-- 统计分析对话框 -->
    <el-dialog v-model="statsDialogVisible" title="任务统计分析" width="800px">
      <div class="stats-content">
        <el-row :gutter="24">
          <el-col :span="8" v-for="stat in taskStats" :key="stat.key">
            <div class="stat-card">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </el-col>
        </el-row>

        <div class="chart-section">
          <div class="chart-title">任务完成趋势</div>
          <div class="chart-placeholder">
            <el-empty description="图表加载中..." />
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Search,
  Refresh,
  TrendCharts,
  User,
  Clock,
  Folder,
  Edit,
  Check,
  ArrowDown,
} from '@element-plus/icons-vue';

const props = defineProps({
  tasks: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['refresh', 'assign', 'update']);

const largeTextMode = ref(false);
const searchQuery = ref('');
const statusFilter = ref('');
const priorityFilter = ref('');
const categoryFilter = ref('');

// 对话框状态
const assignDialogVisible = ref(false);
const progressDialogVisible = ref(false);
const statsDialogVisible = ref(false);
const assigning = ref(false);
const updating = ref(false);

// 表单数据
const assignForm = ref({
  taskId: '',
  title: '',
  assigneeId: '',
  deadline: '',
  note: '',
});

const progressForm = ref({
  taskId: '',
  title: '',
  progress: 0,
  status: '',
  note: '',
});

// 人员列表
const personnelList = ref([
  { id: 'wangwu', name: '王五', role: '网格员' },
  { id: 'zhaoliu', name: '赵六', role: '志愿者' },
  { id: 'sunqi', name: '孙七', role: '村干部' },
  { id: 'zhouba', name: '周八', role: '党员' },
]);

const filteredTasks = computed(() => {
  let filtered = props.tasks;

  // 搜索筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      task =>
        task.title.toLowerCase().includes(query) || task.description.toLowerCase().includes(query)
    );
  }

  // 状态筛选
  if (statusFilter.value) {
    filtered = filtered.filter(task => task.status === statusFilter.value);
  }

  // 优先级筛选
  if (priorityFilter.value) {
    filtered = filtered.filter(task => task.priority === priorityFilter.value);
  }

  // 分类筛选
  if (categoryFilter.value) {
    filtered = filtered.filter(task => task.category === categoryFilter.value);
  }

  return filtered;
});

const taskStats = computed(() => {
  const total = props.tasks.length;
  const completed = props.tasks.filter(t => t.status === 'completed').length;
  const inProgress = props.tasks.filter(t => t.status === 'in_progress').length;
  const pending = props.tasks.filter(t => t.status === 'pending').length;

  return [
    { key: 'total', label: '总任务数', value: total },
    { key: 'completed', label: '已完成', value: completed },
    { key: 'in_progress', label: '进行中', value: inProgress },
    { key: 'pending', label: '待分配', value: pending },
  ];
});

const getTaskItemClass = task => {
  return {
    'high-priority': task.priority === 'high',
    'medium-priority': task.priority === 'medium',
    'low-priority': task.priority === 'low',
    'task-completed': task.status === 'completed',
    'task-cancelled': task.status === 'cancelled',
  };
};

const getPriorityType = priority => {
  switch (priority) {
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    case 'low':
      return 'success';
    default:
      return 'info';
  }
};

const getPriorityLabel = priority => {
  switch (priority) {
    case 'high':
      return '高';
    case 'medium':
      return '中';
    case 'low':
      return '低';
    default:
      return '未知';
  }
};

const getStatusType = status => {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'in_progress':
      return 'primary';
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'danger';
    default:
      return 'info';
  }
};

const getStatusLabel = status => {
  switch (status) {
    case 'pending':
      return '待分配';
    case 'in_progress':
      return '进行中';
    case 'completed':
      return '已完成';
    case 'cancelled':
      return '已取消';
    default:
      return '未知';
  }
};

const handleAssignTask = task => {
  assignForm.value = {
    taskId: task.id,
    title: task.title,
    assigneeId: '',
    deadline: task.deadline,
    note: '',
  };
  assignDialogVisible.value = true;
};

const handleUpdateProgress = task => {
  progressForm.value = {
    taskId: task.id,
    title: task.title,
    progress: task.progress || 0,
    status: task.status,
    note: '',
  };
  progressDialogVisible.value = true;
};

const handleCompleteTask = task => {
  ElMessageBox.confirm(`确定要完成任务 "${task.title}" 吗？`, '确认完成', {
    type: 'success',
    confirmButtonText: '确定完成',
    cancelButtonText: '取消',
  })
    .then(() => {
      emit('update', task.id, { status: 'completed', progress: 100 });
      ElMessage.success('任务已完成');
    })
    .catch(() => {
      // 用户取消
    });
};

const handleTaskCommand = ({ action, task }) => {
  switch (action) {
    case 'view':
      ElMessage.info(`查看任务详情: ${task.title}`);
      break;
    case 'edit':
      ElMessage.info(`编辑任务: ${task.title}`);
      break;
    case 'reminder':
      ElMessage.success(`已发送提醒给: ${task.assignee || '未分配'}`);
      break;
    case 'cancel':
      handleCancelTask(task);
      break;
  }
};

const handleCancelTask = task => {
  ElMessageBox.confirm(`确定要取消任务 "${task.title}" 吗？`, '确认取消', {
    type: 'warning',
    confirmButtonText: '确定取消',
    cancelButtonText: '返回',
  })
    .then(() => {
      emit('update', task.id, { status: 'cancelled' });
      ElMessage.success('任务已取消');
    })
    .catch(() => {
      // 用户取消
    });
};

const confirmAssign = async () => {
  if (!assignForm.value.assigneeId) {
    ElMessage.warning('请选择执行人');
    return;
  }

  assigning.value = true;
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const personnel = personnelList.value.find(p => p.id === assignForm.value.assigneeId);
    emit('assign', assignForm.value.taskId, assignForm.value.assigneeId);

    ElMessage.success(`任务已分配给 ${personnel.name}`);
    assignDialogVisible.value = false;
  } catch (error) {
    ElMessage.error('分配失败');
  } finally {
    assigning.value = false;
  }
};

const confirmUpdateProgress = async () => {
  updating.value = true;
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));

    emit('update', progressForm.value.taskId, {
      progress: progressForm.value.progress,
      status: progressForm.value.status,
      note: progressForm.value.note,
    });

    ElMessage.success('进度已更新');
    progressDialogVisible.value = false;
  } catch (error) {
    ElMessage.error('更新失败');
  } finally {
    updating.value = false;
  }
};

const showStatsDialog = () => {
  statsDialogVisible.value = true;
};
</script>

<style scoped>
.task-management {
  margin: -20px;
}

.toolbar {
  padding: 20px;
  background-color: #fafafa;
  border-bottom: 1px solid #ebeef5;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  float: right;
}

.task-list {
  padding: 20px;
}

.task-item {
  background: white;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  margin-bottom: 16px;
  padding: 20px;
  transition: all 0.3s ease;
}

.task-item:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.task-item.high-priority {
  border-left: 4px solid #f56c6c;
}

.task-item.medium-priority {
  border-left: 4px solid #e6a23c;
}

.task-item.low-priority {
  border-left: 4px solid #67c23a;
}

.task-item.task-completed {
  opacity: 0.8;
  background-color: #f0f9ff;
}

.task-item.task-cancelled {
  opacity: 0.6;
  background-color: #fef0f0;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.task-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  flex: 1;
}

.priority-indicator {
  width: 4px;
  height: 20px;
  border-radius: 2px;
}

.priority-indicator.high {
  background-color: #f56c6c;
}

.priority-indicator.medium {
  background-color: #e6a23c;
}

.priority-indicator.low {
  background-color: #67c23a;
}

.task-time {
  color: #909399;
  font-size: 14px;
}

.task-content {
  margin-bottom: 16px;
}

.task-description {
  color: #606266;
  line-height: 1.6;
  margin-bottom: 12px;
}

.task-meta {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #909399;
  font-size: 14px;
}

.task-progress {
  margin-bottom: 16px;
}

.progress-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.task-actions {
  display: flex;
  gap: 8px;
}

.personnel-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats-content {
  padding: 20px 0;
}

.stat-card {
  text-align: center;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  color: white;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
}

.chart-section {
  margin-top: 24px;
  padding: 20px;
  background-color: #fafafa;
  border-radius: 8px;
}

.chart-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 16px;
  text-align: center;
}

.chart-placeholder {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .toolbar .el-col {
    margin-bottom: 12px;
  }

  .toolbar-actions {
    float: none;
    justify-content: center;
  }

  .task-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .task-meta {
    flex-direction: column;
    gap: 8px;
  }

  .task-actions {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
