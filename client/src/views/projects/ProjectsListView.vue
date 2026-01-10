<template>
  <div class="projects-list">
    <el-container>
      <!-- 页面头部 -->
      <el-header class="page-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">
              <el-icon><OfficeBuilding /></el-icon>
              项目管理
            </h1>
            <p class="page-description">管理和跟踪村庄建设项目进度</p>
          </div>
          <div class="action-section">
            <el-button
              type="primary"
              @click="$router.push('/projects/add')"
              v-if="hasPermission('project:write')"
            >
              <el-icon><Plus /></el-icon>
              新建项目
            </el-button>
          </div>
        </div>
      </el-header>

      <!-- 页面主体 -->
      <el-main class="page-main">
        <!-- 统计卡片 -->
        <div class="stats-cards">
          <el-row :gutter="24">
            <el-col :xs="24" :sm="12" :md="6">
              <div class="stat-card total">
                <div class="stat-icon">
                  <el-icon><FolderOpened /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ projectStats.total }}</div>
                  <div class="stat-label">总项目数</div>
                </div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <div class="stat-card progress">
                <div class="stat-icon">
                  <el-icon><Loading /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ projectStats.inProgress }}</div>
                  <div class="stat-label">进行中</div>
                </div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <div class="stat-card completed">
                <div class="stat-icon">
                  <el-icon><CircleCheckFilled /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ projectStats.completed }}</div>
                  <div class="stat-label">已完成</div>
                </div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <div class="stat-card budget">
                <div class="stat-icon">
                  <el-icon><Money /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">¥{{ totalBudget.toLocaleString() }}</div>
                  <div class="stat-label">总预算</div>
                </div>
              </div>
            </el-col>
          </el-row>
        </div>

        <!-- 筛选和搜索 -->
        <div class="filter-section">
          <el-card shadow="never">
            <el-row :gutter="16" class="filter-row">
              <el-col :xs="24" :sm="8" :md="6">
                <el-input
                  v-model="searchQuery"
                  placeholder="搜索项目名称"
                  clearable
                  @clear="handleSearch"
                  @keyup.enter="handleSearch"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
              </el-col>
              <el-col :xs="24" :sm="8" :md="6">
                <el-select
                  v-model="filterStatus"
                  placeholder="项目状态"
                  clearable
                  @change="handleFilter"
                >
                  <el-option label="全部状态" value="" />
                  <el-option label="规划中" value="planning" />
                  <el-option label="进行中" value="in_progress" />
                  <el-option label="已完成" value="completed" />
                  <el-option label="暂停" value="suspended" />
                </el-select>
              </el-col>
              <el-col :xs="24" :sm="8" :md="6">
                <el-select
                  v-model="filterType"
                  placeholder="项目类型"
                  clearable
                  @change="handleFilter"
                >
                  <el-option label="全部类型" value="" />
                  <el-option label="基础设施" value="infrastructure" />
                  <el-option label="教育培训" value="education" />
                  <el-option label="福利保障" value="welfare" />
                </el-select>
              </el-col>
            </el-row>
          </el-card>
        </div>

        <!-- 项目列表 -->
        <div class="projects-table">
          <el-card shadow="never">
            <el-table
              :data="filteredProjects"
              v-loading="loading"
              stripe
              style="width: 100%"
              @sort-change="handleSortChange"
            >
              <el-table-column prop="name" label="项目名称" min-width="200" sortable>
                <template #default="{ row }">
                  <div class="project-name">
                    <el-link type="primary" @click="viewProject(row.id)" :underline="false">
                      {{ row.name }}
                    </el-link>
                  </div>
                </template>
              </el-table-column>

              <el-table-column prop="type" label="类型" width="120" sortable>
                <template #default="{ row }">
                  <el-tag :type="getTypeTagType(row.type)">
                    {{ getTypeLabel(row.type) }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="status" label="状态" width="100" sortable>
                <template #default="{ row }">
                  <el-tag :type="getStatusTagType(row.status)">
                    {{ getStatusLabel(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="progress" label="进度" width="150" sortable>
                <template #default="{ row }">
                  <el-progress
                    :percentage="row.progress"
                    :color="getProgressColor(row.progress)"
                    :stroke-width="8"
                  />
                </template>
              </el-table-column>

              <el-table-column prop="manager" label="负责人" width="100" />

              <el-table-column prop="budget" label="预算" width="120" sortable>
                <template #default="{ row }">
                  <span class="budget-amount">¥{{ row.budget.toLocaleString() }}</span>
                </template>
              </el-table-column>

              <el-table-column prop="expectedEndDate" label="预计完成" width="120" sortable />

              <el-table-column label="操作" width="200" fixed="right">
                <template #default="{ row }">
                  <el-button type="text" size="small" @click="viewProject(row.id)">
                    <el-icon><View /></el-icon>
                    查看
                  </el-button>
                  <el-button
                    type="text"
                    size="small"
                    @click="editProject(row.id)"
                    v-if="hasPermission('project:write')"
                  >
                    <el-icon><Edit /></el-icon>
                    编辑
                  </el-button>
                  <el-dropdown @command="command => handleAction(command, row)">
                    <el-button type="text" size="small">
                      更多<el-icon><ArrowDown /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="milestone">里程碑</el-dropdown-item>
                        <el-dropdown-item command="report">项目报告</el-dropdown-item>
                        <el-dropdown-item command="documents">相关文档</el-dropdown-item>
                        <el-dropdown-item
                          command="delete"
                          divided
                          v-if="hasPermission('project:delete')"
                        >
                          删除项目
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
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :page-sizes="[10, 20, 50, 100]"
                :total="projectStats.total"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange"
              />
            </div>
          </el-card>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  OfficeBuilding,
  Plus,
  FolderOpened,
  Loading,
  CircleCheckFilled,
  Money,
  Search,
  View,
  Edit,
  ArrowDown,
} from '@element-plus/icons-vue';

// 响应式数据
const loading = ref(false);
const projects = ref([]);
const searchQuery = ref('');
const filterStatus = ref('');
const filterType = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const sortField = ref('');
const sortOrder = ref('');

// 模拟数据
const mockProjects = [
  {
    id: 1,
    name: '智慧农业大棚建设',
    type: 'infrastructure',
    description: '建设现代化智能农业大棚，提升农业生产效率',
    status: 'in_progress',
    progress: 65,
    startDate: '2024-10-01',
    expectedEndDate: '2025-03-31',
    budget: 300000,
    spent: 195000,
    manager: '张工程师',
    milestones: [
      { name: '设计规划', completed: true, date: '2024-10-15' },
      { name: '场地准备', completed: true, date: '2024-11-20' },
      { name: '主体建设', completed: false, expectedDate: '2025-01-15' },
      { name: '设备安装', completed: false, expectedDate: '2025-02-28' },
    ],
  },
  {
    id: 2,
    name: '村民技能培训计划',
    type: 'education',
    description: '组织村民参加电商、农业技术等技能培训',
    status: 'planning',
    progress: 15,
    startDate: '2025-01-01',
    expectedEndDate: '2025-06-30',
    budget: 50000,
    spent: 7500,
    manager: '李老师',
  },
  {
    id: 3,
    name: '村内道路硬化工程',
    type: 'infrastructure',
    description: '对村内主要道路进行硬化改造',
    status: 'completed',
    progress: 100,
    startDate: '2024-08-01',
    expectedEndDate: '2024-11-30',
    budget: 150000,
    spent: 148000,
    manager: '王工头',
  },
];

// 计算属性
const projectStats = computed(() => {
  const stats = {
    total: projects.value.length,
    planning: projects.value.filter(p => p.status === 'planning').length,
    inProgress: projects.value.filter(p => p.status === 'in_progress').length,
    completed: projects.value.filter(p => p.status === 'completed').length,
    suspended: projects.value.filter(p => p.status === 'suspended').length,
  };
  return stats;
});

const totalBudget = computed(() => {
  return projects.value.reduce((sum, project) => sum + project.budget, 0);
});

const filteredProjects = computed(() => {
  let filtered = [...projects.value];

  // 搜索过滤
  if (searchQuery.value) {
    filtered = filtered.filter(
      project =>
        project.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  }

  // 状态过滤
  if (filterStatus.value) {
    filtered = filtered.filter(project => project.status === filterStatus.value);
  }

  // 类型过滤
  if (filterType.value) {
    filtered = filtered.filter(project => project.type === filterType.value);
  }

  return filtered;
});

// 生命周期
onMounted(() => {
  loadProjects();
});

// 方法
const loadProjects = async () => {
  loading.value = true;
  try {
    // 这里调用API获取数据
    // const response = await api.getProjects()
    // projects.value = response.data.projects

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500));
    projects.value = mockProjects;
  } catch (error) {
    ElMessage.error('加载项目列表失败');
    console.error('Load projects error:', error);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  currentPage.value = 1;
};

const handleFilter = () => {
  currentPage.value = 1;
};

const handleSortChange = ({ prop, order }) => {
  sortField.value = prop;
  sortOrder.value = order;
};

const handleSizeChange = size => {
  pageSize.value = size;
  currentPage.value = 1;
};

const handleCurrentChange = page => {
  currentPage.value = page;
};

const viewProject = id => {
  $router.push(`/projects/${id}`);
};

const editProject = id => {
  $router.push(`/projects/${id}/edit`);
};

const handleAction = async (command, project) => {
  switch (command) {
    case 'milestone':
      ElMessage.info(`查看 ${project.name} 的里程碑`);
      break;
    case 'report':
      ElMessage.info(`查看 ${project.name} 的项目报告`);
      break;
    case 'documents':
      ElMessage.info(`查看 ${project.name} 的相关文档`);
      break;
    case 'delete':
      try {
        await ElMessageBox.confirm(
          `确定要删除项目"${project.name}"吗？此操作不可恢复。`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          }
        );

        // 这里调用删除API
        ElMessage.success('项目删除成功');
        await loadProjects();
      } catch (error) {
        // 用户取消删除
      }
      break;
  }
};

// 辅助方法
const getTypeTagType = type => {
  const typeMap = {
    infrastructure: 'primary',
    education: 'success',
    welfare: 'warning',
  };
  return typeMap[type] || 'info';
};

const getTypeLabel = type => {
  const typeMap = {
    infrastructure: '基础设施',
    education: '教育培训',
    welfare: '福利保障',
  };
  return typeMap[type] || type;
};

const getStatusTagType = status => {
  const statusMap = {
    planning: 'info',
    in_progress: 'warning',
    completed: 'success',
    suspended: 'danger',
  };
  return statusMap[status] || 'info';
};

const getStatusLabel = status => {
  const statusMap = {
    planning: '规划中',
    in_progress: '进行中',
    completed: '已完成',
    suspended: '暂停',
  };
  return statusMap[status] || status;
};

const getProgressColor = progress => {
  if (progress < 30) return '#f56c6c';
  if (progress < 70) return '#e6a23c';
  return '#67c23a';
};

// 权限检查（这里使用模拟方法，实际应该从store获取）
const hasPermission = permission => {
  // 模拟权限检查
  return true;
};
</script>

<style lang="scss" scoped>
.projects-list {
  height: 100vh;
  background-color: #f5f5f5;
}

.page-header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0;
  height: 80px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 24px;
}

.title-section {
  .page-title {
    display: flex;
    align-items: center;
    font-size: 24px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 8px 0;

    .el-icon {
      margin-right: 8px;
      color: #409eff;
    }
  }

  .page-description {
    font-size: 14px;
    color: #909399;
    margin: 0;
  }
}

.page-main {
  padding: 24px;
}

.stats-cards {
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-2px);
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16px;

    .el-icon {
      font-size: 24px;
      color: #fff;
    }
  }

  .stat-content {
    flex: 1;

    .stat-number {
      font-size: 24px;
      font-weight: 600;
      color: #303133;
      line-height: 1;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 14px;
      color: #909399;
    }
  }

  &.total .stat-icon {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  &.progress .stat-icon {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }

  &.completed .stat-icon {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  }

  &.budget .stat-icon {
    background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  }
}

.filter-section {
  margin-bottom: 24px;
}

.filter-row {
  .el-col {
    margin-bottom: 16px;
  }
}

.projects-table {
  .budget-amount {
    font-weight: 600;
    color: #67c23a;
  }

  .project-name {
    .el-link {
      font-weight: 500;
    }
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    padding: 16px;
    gap: 12px;
  }

  .title-section {
    .page-title {
      font-size: 20px;
    }
  }

  .action-section {
    width: 100%;

    .el-button {
      width: 100%;
    }
  }
}
</style>
