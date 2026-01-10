<!-- 用户反馈管理主界面 -->
<template>
  <div class="feedback-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1>用户反馈管理</h1>
        <div class="header-actions">
          <el-button type="primary" @click="exportFeedback" :loading="exportLoading">
            <el-icon><Download /></el-icon>
            导出数据
          </el-button>
          <el-button
            type="success"
            @click="showBatchProcess = true"
            :disabled="!selectedFeedbacks.length"
          >
            <el-icon><Operation /></el-icon>
            批量处理 ({{ selectedFeedbacks.length }})
          </el-button>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="6" v-for="stat in statsData" :key="stat.key">
          <el-card class="stat-card" :class="stat.type">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon :size="32"><component :is="stat.icon" /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stat.value }}</div>
                <div class="stat-label">{{ stat.label }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 筛选和搜索 -->
    <el-card class="filter-card">
      <el-form :model="filters" inline>
        <el-form-item label="反馈分类">
          <el-select
            v-model="filters.category"
            placeholder="选择分类"
            clearable
            style="width: 150px"
          >
            <el-option
              v-for="cat in categoryOptions"
              :key="cat.value"
              :label="cat.label"
              :value="cat.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="处理状态">
          <el-select v-model="filters.status" placeholder="选择状态" clearable style="width: 130px">
            <el-option
              v-for="status in statusOptions"
              :key="status.value"
              :label="status.label"
              :value="status.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="优先级">
          <el-select
            v-model="filters.priority"
            placeholder="选择优先级"
            clearable
            style="width: 120px"
          >
            <el-option
              v-for="priority in priorityOptions"
              :key="priority.value"
              :label="priority.label"
              :value="priority.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="分配团队">
          <el-select
            v-model="filters.assignedTeam"
            placeholder="选择团队"
            clearable
            style="width: 150px"
          >
            <el-option
              v-for="team in teamOptions"
              :key="team.value"
              :label="team.label"
              :value="team.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
        </el-form-item>

        <el-form-item>
          <el-input
            v-model="filters.keyword"
            placeholder="搜索标题、描述"
            clearable
            style="width: 200px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="loadFeedbackList">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 反馈列表 -->
    <el-card class="feedback-list">
      <div class="list-header">
        <span class="list-title">反馈列表</span>
        <span class="list-count">共 {{ pagination.total }} 条</span>
      </div>

      <el-table
        v-loading="loading"
        :data="feedbackList"
        @selection-change="handleSelectionChange"
        stripe
        style="width: 100%"
      >
        <el-table-column type="selection" width="55" />

        <el-table-column prop="feedbackId" label="反馈ID" width="120" show-overflow-tooltip />

        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link type="primary" @click="viewFeedbackDetail(row)">
              {{ row.title }}
            </el-link>
          </template>
        </el-table-column>

        <el-table-column prop="category" label="分类" width="120">
          <template #default="{ row }">
            <el-tag :type="getCategoryTagType(row.category)" size="small">
              {{ getCategoryLabel(row.category) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="priority" label="优先级" width="100">
          <template #default="{ row }">
            <el-tag :type="getPriorityTagType(row.priority)" size="small">
              {{ getPriorityLabel(row.priority) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="userId" label="提交用户" width="120">
          <template #default="{ row }">
            <div v-if="row.userId" class="user-info">
              <el-avatar :size="24" :src="row.userId.avatar" />
              <span class="user-name">{{ row.userId.profile?.displayName || '匿名用户' }}</span>
            </div>
            <span v-else>匿名用户</span>
          </template>
        </el-table-column>

        <el-table-column prop="assignedTo" label="处理人" width="120">
          <template #default="{ row }">
            <div v-if="row.assignedTo" class="user-info">
              <el-avatar :size="24" :src="row.assignedTo.profile?.avatar" />
              <span class="user-name">{{ row.assignedTo.profile?.displayName }}</span>
            </div>
            <span v-else class="text-muted">未分配</span>
          </template>
        </el-table-column>

        <el-table-column prop="createdAt" label="提交时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="viewFeedbackDetail(row)">
              查看
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              type="success"
              size="small"
              @click="processFeedback(row)"
            >
              处理
            </el-button>
            <el-dropdown trigger="click">
              <el-button type="info" size="small">
                更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="assignFeedback(row)">
                    <el-icon><User /></el-icon>
                    分配处理人
                  </el-dropdown-item>
                  <el-dropdown-item @click="updateStatus(row)">
                    <el-icon><Edit /></el-icon>
                    更新状态
                  </el-dropdown-item>
                  <el-dropdown-item @click="addInternalNote(row)">
                    <el-icon><Document /></el-icon>
                    添加内部备注
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 反馈详情抽屉 -->
    <FeedbackDetailDrawer
      v-model="showDetailDrawer"
      :feedback-id="currentFeedbackId"
      @refresh="loadFeedbackList"
    />

    <!-- 批量处理对话框 -->
    <BatchProcessDialog
      v-model="showBatchProcess"
      :feedback-ids="selectedFeedbacks"
      @success="loadFeedbackList"
    />

    <!-- 分配处理人对话框 -->
    <AssignDialog
      v-model="showAssignDialog"
      :feedback="currentFeedback"
      @success="loadFeedbackList"
    />

    <!-- 更新状态对话框 -->
    <StatusUpdateDialog
      v-model="showStatusDialog"
      :feedback="currentFeedback"
      @success="loadFeedbackList"
    />

    <!-- 内部备注对话框 -->
    <InternalNoteDialog
      v-model="showNoteDialog"
      :feedback="currentFeedback"
      @success="loadFeedbackList"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Download,
  Operation,
  Search,
  User,
  Edit,
  Document,
  ArrowDown,
  Message,
  Warning,
  SuccessFilled,
  Clock,
  Star,
} from '@element-plus/icons-vue';
import { feedbackApi } from '@/api/feedbackApi';
import FeedbackDetailDrawer from './components/FeedbackDetailDrawer.vue';
import BatchProcessDialog from './components/BatchProcessDialog.vue';
import AssignDialog from './components/AssignDialog.vue';
import StatusUpdateDialog from './components/StatusUpdateDialog.vue';
import InternalNoteDialog from './components/InternalNoteDialog.vue';
import { formatDate } from '@/utils/dateUtils';

// 响应式数据
const loading = ref(false);
const exportLoading = ref(false);
const feedbackList = ref([]);
const selectedFeedbacks = ref([]);
const showDetailDrawer = ref(false);
const showBatchProcess = ref(false);
const showAssignDialog = ref(false);
const showStatusDialog = ref(false);
const showNoteDialog = ref(false);
const currentFeedbackId = ref('');
const currentFeedback = ref(null);

// 筛选条件
const filters = reactive({
  category: '',
  status: '',
  priority: '',
  assignedTeam: '',
  dateRange: [],
  keyword: '',
});

// 分页数据
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
});

// 统计数据
const statsData = ref([
  { key: 'total', label: '总反馈数', value: 0, icon: Message, type: 'primary' },
  { key: 'pending', label: '待处理', value: 0, icon: Clock, type: 'warning' },
  { key: 'resolved', label: '已解决', value: 0, icon: SuccessFilled, type: 'success' },
  { key: 'satisfaction', label: '满意度', value: '0%', icon: Star, type: 'info' },
]);

// 选项数据
const categoryOptions = [
  { label: 'Bug报告', value: 'bug_report' },
  { label: '功能请求', value: 'feature_request' },
  { label: '改进建议', value: 'improvement' },
  { label: '投诉', value: 'complaint' },
  { label: '表扬', value: 'compliment' },
  { label: '问题咨询', value: 'question' },
  { label: '使用困难', value: 'usage_difficulty' },
];

const statusOptions = [
  { label: '待处理', value: 'pending' },
  { label: '审核中', value: 'in_review' },
  { label: '处理中', value: 'in_progress' },
  { label: '已解决', value: 'resolved' },
  { label: '已关闭', value: 'closed' },
  { label: '已拒绝', value: 'rejected' },
];

const priorityOptions = [
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' },
  { label: '紧急', value: 'urgent' },
];

const teamOptions = [
  { label: '技术团队', value: 'tech' },
  { label: '产品团队', value: 'product' },
  { label: '运营团队', value: 'operation' },
  { label: '客服团队', value: 'support' },
];

// 计算属性
const formatDateTime = computed(() => {
  return dateStr => {
    if (!dateStr) return '-';
    return formatDate(new Date(dateStr), 'YYYY-MM-DD HH:mm');
  };
});

// 方法
const loadFeedbackList = async () => {
  try {
    loading.value = true;
    const params = {
      ...filters,
      dateRange: filters.dateRange.length ? JSON.stringify(filters.dateRange) : undefined,
      page: pagination.page,
      limit: pagination.limit,
    };

    const response = await feedbackApi.getFeedbackList(params);
    feedbackList.value = response.data.feedbacks;
    pagination.total = response.data.pagination.total;
  } catch (error) {
    ElMessage.error('加载反馈列表失败');
    console.error('加载反馈列表失败:', error);
  } finally {
    loading.value = false;
  }
};

const loadStatsData = async () => {
  try {
    const response = await feedbackApi.getFeedbackStats();
    const stats = response.data;

    statsData.value = [
      { key: 'total', label: '总反馈数', value: stats.total, icon: Message, type: 'primary' },
      { key: 'pending', label: '待处理', value: stats.pending, icon: Clock, type: 'warning' },
      {
        key: 'resolved',
        label: '已解决',
        value: stats.resolved,
        icon: SuccessFilled,
        type: 'success',
      },
      {
        key: 'satisfaction',
        label: '满意度',
        value: `${stats.avgSatisfaction}%`,
        icon: Star,
        type: 'info',
      },
    ];
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
};

const handleSelectionChange = selection => {
  selectedFeedbacks.value = selection.map(item => item.feedbackId);
};

const handleSizeChange = size => {
  pagination.limit = size;
  pagination.page = 1;
  loadFeedbackList();
};

const handleCurrentChange = page => {
  pagination.page = page;
  loadFeedbackList();
};

const viewFeedbackDetail = feedback => {
  currentFeedbackId.value = feedback.feedbackId;
  showDetailDrawer.value = true;
};

const processFeedback = feedback => {
  currentFeedback.value = feedback;
  showStatusDialog.value = true;
};

const assignFeedback = feedback => {
  currentFeedback.value = feedback;
  showAssignDialog.value = true;
};

const updateStatus = feedback => {
  currentFeedback.value = feedback;
  showStatusDialog.value = true;
};

const addInternalNote = feedback => {
  currentFeedback.value = feedback;
  showNoteDialog.value = true;
};

const exportFeedback = async () => {
  try {
    exportLoading.value = true;
    const params = {
      ...filters,
      dateRange: filters.dateRange.length ? JSON.stringify(filters.dateRange) : undefined,
    };

    const response = await feedbackApi.exportFeedbackData(params);

    // 创建下载链接
    const blob = new Blob([response]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `feedback_export_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);

    ElMessage.success('导出成功');
  } catch (error) {
    ElMessage.error('导出失败');
    console.error('导出失败:', error);
  } finally {
    exportLoading.value = false;
  }
};

const resetFilters = () => {
  Object.assign(filters, {
    category: '',
    status: '',
    priority: '',
    assignedTeam: '',
    dateRange: [],
    keyword: '',
  });
  pagination.page = 1;
  loadFeedbackList();
};

// 辅助方法
const getCategoryLabel = category => {
  const option = categoryOptions.find(opt => opt.value === category);
  return option ? option.label : category;
};

const getCategoryTagType = category => {
  const typeMap = {
    bug_report: 'danger',
    feature_request: 'primary',
    improvement: 'success',
    complaint: 'warning',
    compliment: 'success',
    question: 'info',
    usage_difficulty: 'warning',
  };
  return typeMap[category] || 'info';
};

const getStatusLabel = status => {
  const option = statusOptions.find(opt => opt.value === status);
  return option ? option.label : status;
};

const getStatusTagType = status => {
  const typeMap = {
    pending: 'warning',
    in_review: 'primary',
    in_progress: 'primary',
    resolved: 'success',
    closed: 'info',
    rejected: 'danger',
  };
  return typeMap[status] || 'info';
};

const getPriorityLabel = priority => {
  const option = priorityOptions.find(opt => opt.value === priority);
  return option ? option.label : priority;
};

const getPriorityTagType = priority => {
  const typeMap = {
    low: 'info',
    medium: 'primary',
    high: 'warning',
    urgent: 'danger',
  };
  return typeMap[priority] || 'info';
};

// 生命周期
onMounted(() => {
  loadFeedbackList();
  loadStatsData();
});
</script>

<style lang="scss" scoped>
.feedback-management {
  padding: 20px;

  .page-header {
    margin-bottom: 20px;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;

      h1 {
        margin: 0;
        font-size: 24px;
        color: #303133;
      }

      .header-actions {
        display: flex;
        gap: 12px;
      }
    }
  }

  .stats-cards {
    margin-bottom: 20px;

    .stat-card {
      :deep(.el-card__body) {
        padding: 20px;
      }

      .stat-content {
        display: flex;
        align-items: center;
        gap: 16px;

        .stat-icon {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--el-color-primary-light-9);
          color: var(--el-color-primary);
        }

        .stat-info {
          flex: 1;

          .stat-value {
            font-size: 28px;
            font-weight: bold;
            color: #303133;
            line-height: 1;
            margin-bottom: 4px;
          }

          .stat-label {
            font-size: 14px;
            color: #909399;
          }
        }
      }

      &.primary .stat-icon {
        background: var(--el-color-primary-light-9);
        color: var(--el-color-primary);
      }

      &.warning .stat-icon {
        background: var(--el-color-warning-light-9);
        color: var(--el-color-warning);
      }

      &.success .stat-icon {
        background: var(--el-color-success-light-9);
        color: var(--el-color-success);
      }

      &.info .stat-icon {
        background: var(--el-color-info-light-9);
        color: var(--el-color-info);
      }
    }
  }

  .filter-card {
    margin-bottom: 20px;

    :deep(.el-form-item) {
      margin-bottom: 0;
    }
  }

  .feedback-list {
    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      .list-title {
        font-size: 16px;
        font-weight: 500;
        color: #303133;
      }

      .list-count {
        color: #909399;
        font-size: 14px;
      }
    }

    .pagination-wrapper {
      margin-top: 20px;
      display: flex;
      justify-content: center;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;

      .user-name {
        font-size: 14px;
        color: #606266;
      }
    }

    .text-muted {
      color: #909399;
      font-size: 14px;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .feedback-management {
    padding: 10px;

    .page-header .header-content {
      flex-direction: column;
      align-items: flex-start;

      h1 {
        font-size: 20px;
      }

      .header-actions {
        width: 100%;
        justify-content: flex-end;
      }
    }

    .stats-cards {
      :deep(.el-col) {
        margin-bottom: 12px;
      }
    }

    .filter-card {
      :deep(.el-form) {
        .el-form-item {
          width: 100%;
          margin-bottom: 12px;

          .el-form-item__content {
            width: 100%;
          }
        }
      }
    }

    .feedback-list {
      :deep(.el-table) {
        font-size: 12px;
      }
    }
  }
}
</style>
