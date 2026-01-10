<template>
  <div class="project-list">
    <!-- 搜索和筛选区域 -->
    <div class="search-filter-section">
      <el-card class="search-card">
        <div class="search-header">
          <h3>项目管理</h3>
          <el-button type="primary" @click="showCreateDialog = true" v-if="canCreateProject">
            <el-icon><Plus /></el-icon>
            新建项目
          </el-button>
        </div>

        <div class="search-filters">
          <el-row :gutter="16">
            <el-col :span="6">
              <el-input
                v-model="filters.keyword"
                placeholder="搜索项目名称"
                @keyup.enter="searchProjects"
                clearable
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </el-col>

            <el-col :span="4">
              <el-select v-model="filters.projectType" placeholder="项目类型" clearable>
                <el-option label="基础设施" value="infrastructure" />
                <el-option label="公共服务" value="public_service" />
                <el-option label="环境治理" value="environmental" />
                <el-option label="农业发展" value="agricultural" />
                <el-option label="文化建设" value="cultural" />
                <el-option label="民生福利" value="welfare" />
                <el-option label="经济发展" value="economic" />
                <el-option label="数字化建设" value="digital" />
              </el-select>
            </el-col>

            <el-col :span="4">
              <el-select v-model="filters.status" placeholder="项目状态" clearable>
                <el-option label="草稿" value="draft" />
                <el-option label="已提交" value="submitted" />
                <el-option label="审核中" value="under_review" />
                <el-option label="已批准" value="approved" />
                <el-option label="进行中" value="in_progress" />
                <el-option label="已完成" value="completed" />
                <el-option label="已取消" value="cancelled" />
              </el-select>
            </el-col>

            <el-col :span="4">
              <el-select v-model="filters.priority" placeholder="优先级" clearable>
                <el-option label="低" value="low" />
                <el-option label="中" value="medium" />
                <el-option label="高" value="high" />
                <el-option label="紧急" value="urgent" />
              </el-select>
            </el-col>

            <el-col :span="6">
              <el-date-picker
                v-model="filters.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </el-col>
          </el-row>

          <div class="search-actions">
            <el-button @click="searchProjects" type="primary">搜索</el-button>
            <el-button @click="resetFilters">重置</el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 项目列表 -->
    <div class="project-list-section">
      <el-card>
        <div class="list-header">
          <div class="list-info">
            <span>共 {{ pagination.total }} 个项目</span>
          </div>
          <div class="view-toggle">
            <el-radio-group v-model="viewMode">
              <el-radio-button label="card">卡片视图</el-radio-button>
              <el-radio-button label="table">表格视图</el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <!-- 卡片视图 -->
        <div v-if="viewMode === 'card'" class="card-view">
          <el-row :gutter="16">
            <el-col :span="8" v-for="project in projects" :key="project._id">
              <project-card
                :project="project"
                @view="viewProject"
                @edit="editProject"
                @delete="deleteProject"
                @start="startProject"
                @submit="submitProject"
              />
            </el-col>
          </el-row>
        </div>

        <!-- 表格视图 -->
        <div v-else class="table-view">
          <el-table :data="projects" v-loading="loading">
            <el-table-column prop="projectCode" label="项目编号" width="120" />
            <el-table-column prop="projectName" label="项目名称" min-width="200" />
            <el-table-column prop="projectType" label="类型" width="120">
              <template #default="{ row }">
                <el-tag :type="getProjectTypeColor(row.projectType)">
                  {{ getProjectTypeName(row.projectType) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusColor(row.status)">
                  {{ getStatusName(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="priority" label="优先级" width="80">
              <template #default="{ row }">
                <el-tag :type="getPriorityColor(row.priority)" size="small">
                  {{ getPriorityName(row.priority) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="budgetInfo.totalBudget" label="预算(万元)" width="120">
              <template #default="{ row }">
                ¥{{ (row.budgetInfo.totalBudget / 10000).toFixed(1) }}
              </template>
            </el-table-column>
            <el-table-column prop="progress.overallProgress" label="进度" width="120">
              <template #default="{ row }">
                <el-progress
                  :percentage="row.progress.overallProgress"
                  :color="getProgressColor(row.progress.overallProgress)"
                  :show-text="false"
                />
                <span class="progress-text">{{ row.progress.overallProgress }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="timeline.plannedStartDate" label="计划开始" width="120">
              <template #default="{ row }">
                {{ formatDate(row.timeline.plannedStartDate) }}
              </template>
            </el-table-column>
            <el-table-column prop="timeline.plannedEndDate" label="计划结束" width="120">
              <template #default="{ row }">
                {{ formatDate(row.timeline.plannedEndDate) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button-group>
                  <el-button size="small" @click="viewProject(row)">查看</el-button>
                  <el-button
                    size="small"
                    type="primary"
                    @click="editProject(row)"
                    v-if="canEditProject(row)"
                  >
                    编辑
                  </el-button>
                  <el-dropdown @command="handleAction($event, row)">
                    <el-button size="small">
                      更多<el-icon><ArrowDown /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="submit" v-if="row.status === 'draft'">
                          提交审批
                        </el-dropdown-item>
                        <el-dropdown-item command="start" v-if="row.status === 'approved'">
                          启动项目
                        </el-dropdown-item>
                        <el-dropdown-item command="progress" v-if="row.status === 'in_progress'">
                          更新进度
                        </el-dropdown-item>
                        <el-dropdown-item command="delete" v-if="row.status === 'draft'" divided>
                          删除项目
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 分页 -->
        <div class="pagination-section">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.limit"
            :page-sizes="[10, 20, 50, 100]"
            :small="false"
            :disabled="loading"
            :background="true"
            layout="total, sizes, prev, pager, next, jumper"
            :total="pagination.total"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>

    <!-- 创建项目对话框 -->
    <project-create-dialog v-model="showCreateDialog" @created="onProjectCreated" />

    <!-- 项目详情对话框 -->
    <project-detail-dialog v-model="showDetailDialog" :project="selectedProject" />

    <!-- 编辑项目对话框 -->
    <project-edit-dialog
      v-model="showEditDialog"
      :project="selectedProject"
      @updated="onProjectUpdated"
    />

    <!-- 进度更新对话框 -->
    <progress-update-dialog
      v-model="showProgressDialog"
      :project="selectedProject"
      @updated="onProgressUpdated"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search, ArrowDown } from '@element-plus/icons-vue';
import ProjectCard from './ProjectCard.vue';
import ProjectCreateDialog from './ProjectCreateDialog.vue';
import ProjectDetailDialog from './ProjectDetailDialog.vue';
import ProjectEditDialog from './ProjectEditDialog.vue';
import ProgressUpdateDialog from './ProgressUpdateDialog.vue';
import { projectApi } from '@/api/project';
import { useUserStore } from '@/store/user';

const userStore = useUserStore();

// 响应式数据
const loading = ref(false);
const projects = ref([]);
const viewMode = ref('card');
const showCreateDialog = ref(false);
const showDetailDialog = ref(false);
const showEditDialog = ref(false);
const showProgressDialog = ref(false);
const selectedProject = ref(null);

// 搜索筛选
const filters = reactive({
  keyword: '',
  projectType: '',
  status: '',
  priority: '',
  dateRange: [],
});

// 分页
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
});

// 权限计算
const canCreateProject = computed(() => {
  return userStore.hasPermission('project_management', 'create');
});

// 生命周期
onMounted(() => {
  loadProjects();
});

// 方法
const loadProjects = async () => {
  try {
    loading.value = true;
    const params = {
      villageId: userStore.currentVillage._id,
      page: pagination.page,
      limit: pagination.limit,
      ...buildSearchParams(),
    };

    const response = await projectApi.getProjectList(params);
    projects.value = response.data.projects;
    pagination.total = response.data.total;
  } catch (error) {
    ElMessage.error('加载项目列表失败：' + error.message);
  } finally {
    loading.value = false;
  }
};

const buildSearchParams = () => {
  const params = {};

  if (filters.keyword) params.keyword = filters.keyword;
  if (filters.projectType) params.projectType = filters.projectType;
  if (filters.status) params.status = filters.status;
  if (filters.priority) params.priority = filters.priority;

  if (filters.dateRange && filters.dateRange.length === 2) {
    params.startDate = filters.dateRange[0];
    params.endDate = filters.dateRange[1];
  }

  return params;
};

const searchProjects = () => {
  pagination.page = 1;
  loadProjects();
};

const resetFilters = () => {
  Object.keys(filters).forEach(key => {
    filters[key] = key === 'dateRange' ? [] : '';
  });
  pagination.page = 1;
  loadProjects();
};

// 项目操作
const viewProject = project => {
  selectedProject.value = project;
  showDetailDialog.value = true;
};

const editProject = project => {
  selectedProject.value = project;
  showEditDialog.value = true;
};

const deleteProject = async project => {
  try {
    await ElMessageBox.confirm(
      `确定要删除项目"${project.projectName}"吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    await projectApi.deleteProject(project._id);
    ElMessage.success('项目删除成功');
    loadProjects();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除项目失败：' + error.message);
    }
  }
};

const submitProject = async project => {
  try {
    await projectApi.submitProject(project._id);
    ElMessage.success('项目已提交审批');
    loadProjects();
  } catch (error) {
    ElMessage.error('提交项目失败：' + error.message);
  }
};

const startProject = async project => {
  try {
    await projectApi.startProject(project._id);
    ElMessage.success('项目已启动');
    loadProjects();
  } catch (error) {
    ElMessage.error('启动项目失败：' + error.message);
  }
};

const updateProgress = project => {
  selectedProject.value = project;
  showProgressDialog.value = true;
};

// 操作处理
const handleAction = (command, project) => {
  switch (command) {
    case 'submit':
      submitProject(project);
      break;
    case 'start':
      startProject(project);
      break;
    case 'progress':
      updateProgress(project);
      break;
    case 'delete':
      deleteProject(project);
      break;
  }
};

// 权限检查
const canEditProject = project => {
  return (
    ['draft', 'in_progress'].includes(project.status) &&
    userStore.hasPermission('project_management', 'update')
  );
};

// 分页处理
const handleSizeChange = size => {
  pagination.limit = size;
  pagination.page = 1;
  loadProjects();
};

const handleCurrentChange = page => {
  pagination.page = page;
  loadProjects();
};

// 事件处理
const onProjectCreated = () => {
  showCreateDialog.value = false;
  loadProjects();
};

const onProjectUpdated = () => {
  showEditDialog.value = false;
  loadProjects();
};

const onProgressUpdated = () => {
  showProgressDialog.value = false;
  loadProjects();
};

// 工具函数
const getProjectTypeName = type => {
  const typeMap = {
    infrastructure: '基础设施',
    public_service: '公共服务',
    environmental: '环境治理',
    agricultural: '农业发展',
    cultural: '文化建设',
    welfare: '民生福利',
    economic: '经济发展',
    digital: '数字化建设',
    emergency: '应急项目',
    maintenance: '维护改造',
    education: '教育培训',
    healthcare: '医疗卫生',
    tourism: '旅游发展',
    other: '其他',
  };
  return typeMap[type] || type;
};

const getProjectTypeColor = type => {
  const colorMap = {
    infrastructure: 'primary',
    public_service: 'success',
    environmental: 'warning',
    agricultural: 'info',
    cultural: '',
    welfare: 'success',
    economic: 'primary',
    digital: 'primary',
    emergency: 'danger',
    maintenance: 'warning',
    education: 'info',
    healthcare: 'success',
    tourism: '',
    other: 'info',
  };
  return colorMap[type] || '';
};

const getStatusName = status => {
  const statusMap = {
    draft: '草稿',
    submitted: '已提交',
    under_review: '审核中',
    approved: '已批准',
    rejected: '已拒绝',
    planning: '规划中',
    in_progress: '进行中',
    paused: '暂停',
    completed: '已完成',
    cancelled: '已取消',
    closed: '已关闭',
  };
  return statusMap[status] || status;
};

const getStatusColor = status => {
  const colorMap = {
    draft: 'info',
    submitted: 'primary',
    under_review: 'warning',
    approved: 'success',
    rejected: 'danger',
    planning: 'primary',
    in_progress: 'primary',
    paused: 'warning',
    completed: 'success',
    cancelled: 'info',
    closed: 'info',
  };
  return colorMap[status] || '';
};

const getPriorityName = priority => {
  const priorityMap = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急',
  };
  return priorityMap[priority] || priority;
};

const getPriorityColor = priority => {
  const colorMap = {
    low: 'info',
    medium: '',
    high: 'warning',
    urgent: 'danger',
  };
  return colorMap[priority] || '';
};

const getProgressColor = progress => {
  if (progress < 30) return '#f56c6c';
  if (progress < 70) return '#e6a23c';
  return '#67c23a';
};

const formatDate = date => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('zh-CN');
};
</script>

<style scoped>
.project-list {
  padding: 20px;
}

.search-filter-section {
  margin-bottom: 20px;
}

.search-card {
  border-radius: 8px;
}

.search-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-header h3 {
  margin: 0;
  color: #303133;
}

.search-filters {
  margin-top: 16px;
}

.search-actions {
  margin-top: 16px;
  text-align: right;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.list-info {
  color: #606266;
  font-size: 14px;
}

.card-view {
  margin-top: 20px;
}

.table-view {
  margin-top: 20px;
}

.progress-text {
  margin-left: 8px;
  font-size: 12px;
  color: #606266;
}

.pagination-section {
  margin-top: 20px;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .search-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .list-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .card-view .el-col {
    margin-bottom: 16px;
  }
}
</style>
