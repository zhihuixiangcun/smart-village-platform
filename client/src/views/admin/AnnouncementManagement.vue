<template>
  <div class="announcement-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h2 class="page-title">村务公告管理</h2>
          <p class="page-subtitle">创建、编辑和管理村务公告内容</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="createAnnouncement" :icon="Plus" size="large">
            发布公告
          </el-button>
        </div>
      </div>
    </div>

    <!-- 筛选区域 -->
    <el-card class="filter-card" shadow="never">
      <div class="filter-row">
        <div class="filter-item">
          <span class="filter-label">分类</span>
          <el-select
            v-model="filters.category"
            placeholder="全部分类"
            clearable
            class="filter-select"
          >
            <el-option
              v-for="category in categories"
              :key="category.value"
              :label="category.label"
              :value="category.value"
            >
              <span class="category-option">
                <el-icon class="category-icon">
                  <component :is="category.icon" />
                </el-icon>
                <span>{{ category.label }}</span>
              </span>
            </el-option>
          </el-select>
        </div>

        <div class="filter-item">
          <span class="filter-label">状态</span>
          <el-select
            v-model="filters.status"
            placeholder="全部状态"
            clearable
            class="filter-select"
          >
            <el-option label="草稿" value="draft" />
            <el-option label="已发布" value="published" />
            <el-option label="已归档" value="archived" />
            <el-option label="已过期" value="expired" />
          </el-select>
        </div>

        <div class="filter-item">
          <span class="filter-label">优先级</span>
          <el-select
            v-model="filters.priority"
            placeholder="全部优先级"
            clearable
            class="filter-select"
          >
            <el-option label="紧急" value="emergency" />
            <el-option label="重要" value="urgent" />
            <el-option label="高" value="high" />
            <el-option label="普通" value="normal" />
            <el-option label="低" value="low" />
          </el-select>
        </div>

        <div class="filter-item">
          <span class="filter-label">发布时间</span>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            class="filter-date"
            @change="handleDateRangeChange"
          />
        </div>

        <div class="filter-actions">
          <el-button type="primary" @click="searchAnnouncements" :icon="Search">
            搜索
          </el-button>
          <el-button @click="resetFilters" :icon="Refresh"> 重置 </el-button>
        </div>
      </div>

      <!-- 搜索框 -->
      <div class="search-row">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索公告标题、内容..."
          :prefix-icon="Search"
          @keyup.enter="searchAnnouncements"
          clearable
          class="search-input"
        />
      </div>
    </el-card>

    <!-- 公告列表 -->
    <el-card class="list-card" shadow="never">
      <!-- 批量操作 -->
      <transition name="slide-fade">
        <div v-if="selectedIds.length > 0" class="batch-actions">
          <div class="batch-info">
            <el-icon class="batch-icon"><Selection /></el-icon>
            <span class="selected-count">已选择 {{ selectedIds.length }} 项</span>
          </div>
          <div class="batch-buttons">
            <el-button
              @click="batchDelete"
              type="danger"
              :icon="Delete"
              size="small"
            >
              批量删除
            </el-button>
            <el-button
              @click="batchArchive"
              :icon="FolderOpened"
              size="small"
            >
              批量归档
            </el-button>
          </div>
        </div>
      </transition>

      <!-- 数据表格 -->
      <el-table
        v-loading="loading"
        :data="announcements"
        @selection-change="handleSelectionChange"
        stripe
        row-key="id"
        class="data-table"
      >
        <el-table-column type="selection" width="56" fixed />

        <el-table-column label="标题" min-width="280">
          <template #default="{ row }">
            <div class="title-cell">
              <div class="title-content">
                <span
                  class="title-text"
                  :class="{ 'is-top': row.isTop }"
                  @click="viewAnnouncement(row)"
                >
                  <el-icon v-if="row.isTop" class="top-icon" size="16">
                    <Top />
                  </el-icon>
                  {{ row.title }}
                </span>
                <div class="title-meta">
                  <el-tag :type="getPriorityType(row.priority)" size="small">
                    {{ getPriorityLabel(row.priority) }}
                  </el-tag>
                  <el-tag :type="getCategoryType(row.category)" size="small">
                    {{ getCategoryLabel(row.category) }}
                  </el-tag>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="发布者" width="140">
          <template #default="{ row }">
            <div class="author-cell">
              <el-avatar :size="36" :src="row.author.avatar">
                {{ row.author.name?.charAt(0) }}
              </el-avatar>
              <div class="author-info">
                <div class="author-name">{{ row.author.name }}</div>
                <div class="author-role">{{ row.author.role }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="发布时间" width="160">
          <template #default="{ row }">
            <div class="time-cell">
              <div class="publish-time">{{ formatTime(row.publishTime) }}</div>
              <div class="time-ago">{{ getTimeAgo(row.publishTime) }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" class="status-tag">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="统计" width="160">
          <template #default="{ row }">
            <div class="stats-cell">
              <div class="stat-item">
                <el-icon size="14"><View /></el-icon>
                <span>{{ row.stats.views }}</span>
              </div>
              <div class="stat-item">
                <el-icon size="14"><ChatLineSquare /></el-icon>
                <span>{{ row.stats.comments }}</span>
              </div>
              <div class="stat-item">
                <el-icon size="14"><Star /></el-icon>
                <span>{{ row.stats.likes }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-tooltip content="查看详情" placement="top">
                <el-button
                  @click="viewAnnouncement(row)"
                  :icon="View"
                  size="small"
                  circle
                  class="action-btn"
                />
              </el-tooltip>

              <el-tooltip content="编辑" placement="top">
                <el-button
                  @click="editAnnouncement(row)"
                  :icon="Edit"
                  size="small"
                  type="primary"
                  circle
                  class="action-btn"
                />
              </el-tooltip>

              <el-tooltip :content="row.isTop ? '取消置顶' : '置顶'" placement="top">
                <el-button
                  @click="toggleTop(row)"
                  :icon="Top"
                  :type="row.isTop ? 'warning' : 'default'"
                  size="small"
                  circle
                  class="action-btn"
                />
              </el-tooltip>

              <el-dropdown @command="handleMoreAction" trigger="click">
                <el-button
                  :icon="MoreFilled"
                  size="small"
                  circle
                  class="action-btn"
                />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :command="`clone_${row.id}`">
                      <el-icon><CopyDocument /></el-icon>
                      <span>复制公告</span>
                    </el-dropdown-item>
                    <el-dropdown-item :command="`archive_${row.id}`">
                      <el-icon><FolderOpened /></el-icon>
                      <span>归档</span>
                    </el-dropdown-item>
                    <el-dropdown-item
                      :command="`delete_${row.id}`"
                      divided
                      class="dropdown-danger"
                    >
                      <el-icon><Delete /></el-icon>
                      <span>删除</span>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 公告创建/编辑弹窗 -->
    <announcement-form-dialog
      v-model="formDialogVisible"
      :announcement="currentAnnouncement"
      :mode="formMode"
      @saved="handleAnnouncementSaved"
    />

    <!-- 公告详情弹窗 -->
    <announcement-detail-dialog
      v-model="detailDialogVisible"
      :announcement="currentAnnouncement"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Plus,
  Search,
  Refresh,
  Delete,
  FolderOpened,
  Edit,
  View,
  Top,
  MoreFilled,
  CopyDocument,
  ChatLineSquare,
  Star,
  Selection,
  Document,
  Coin,
  Guide,
  WarnTriangleFilled,
  FirstAidKit,
  Trophy,
  Bell,
  Tools,
  Files,
} from '@element-plus/icons-vue';
import { useAnnouncementStore } from '@/stores/announcement';
import { formatTime, getTimeAgo } from '@/utils/time';
import AnnouncementFormDialog from './components/AnnouncementFormDialog.vue';
import AnnouncementDetailDialog from './components/AnnouncementDetailDialog.vue';

// 公告分类配置（使用 Element Plus 图标）
const categories = [
  { value: 'policy', label: '政策通知', icon: Document, color: '#409eff' },
  { value: 'finance', label: '财务公示', icon: Coin, color: '#67c23a' },
  { value: 'project', label: '项目进展', icon: Guide, color: '#e6a23c' },
  { value: 'safety', label: '安全提醒', icon: WarnTriangleFilled, color: '#f56c6c' },
  { value: 'welfare', label: '民生福利', icon: FirstAidKit, color: '#909399' },
  { value: 'activity', label: '文化活动', icon: Trophy, color: '#606266' },
  { value: 'emergency', label: '紧急通知', icon: Bell, color: '#f56c6c' },
  { value: 'meeting', label: '会议通知', icon: Files, color: '#409eff' },
  { value: 'service', label: '便民服务', icon: Tools, color: '#67c23a' },
  { value: 'other', label: '其他', icon: Files, color: '#c0c4cc' },
];

// Store
const announcementStore = useAnnouncementStore();

// 响应式数据
const loading = ref(false);
const announcements = ref([]);
const selectedIds = ref([]);

// 搜索筛选
const searchKeyword = ref('');
const dateRange = ref([]);
const filters = reactive({
  category: '',
  status: '',
  priority: '',
});

// 分页
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0,
});

// 弹窗控制
const formDialogVisible = ref(false);
const detailDialogVisible = ref(false);
const formMode = ref('create'); // create | edit
const currentAnnouncement = ref(null);

// 方法
const searchAnnouncements = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.size,
      search: searchKeyword.value,
      ...filters,
    };

    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }

    const result = await announcementStore.getAnnouncements(params);
    announcements.value = result.data.announcements;
    pagination.total = result.data.pagination.total;
  } catch (error) {
    ElMessage.error('获取公告列表失败');
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  searchKeyword.value = '';
  dateRange.value = [];
  Object.keys(filters).forEach(key => {
    filters[key] = '';
  });
  pagination.page = 1;
  searchAnnouncements();
};

const handleDateRangeChange = value => {
  dateRange.value = value;
};

const handleSelectionChange = selection => {
  selectedIds.value = selection.map(item => item.id);
};

const handleSizeChange = size => {
  pagination.size = size;
  pagination.page = 1;
  searchAnnouncements();
};

const handlePageChange = page => {
  pagination.page = page;
  searchAnnouncements();
};

// 公告操作
const createAnnouncement = () => {
  currentAnnouncement.value = null;
  formMode.value = 'create';
  formDialogVisible.value = true;
};

const editAnnouncement = announcement => {
  currentAnnouncement.value = announcement;
  formMode.value = 'edit';
  formDialogVisible.value = true;
};

const viewAnnouncement = announcement => {
  currentAnnouncement.value = announcement;
  detailDialogVisible.value = true;
};

const toggleTop = async announcement => {
  try {
    await announcementStore.toggleTop(announcement.id);
    announcement.isTop = !announcement.isTop;
    ElMessage.success(`公告${announcement.isTop ? '置顶' : '取消置顶'}成功`);
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

const batchDelete = async () => {
  const confirmed = await ElMessageBox.confirm(
    `确定要删除选中的 ${selectedIds.value.length} 条公告吗？`,
    '批量删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  );

  if (confirmed) {
    try {
      await announcementStore.batchDelete(selectedIds.value);
      ElMessage.success('批量删除成功');
      selectedIds.value = [];
      searchAnnouncements();
    } catch (error) {
      ElMessage.error('批量删除失败');
    }
  }
};

const batchArchive = async () => {
  try {
    await announcementStore.batchArchive(selectedIds.value);
    ElMessage.success('批量归档成功');
    selectedIds.value = [];
    searchAnnouncements();
  } catch (error) {
    ElMessage.error('批量归档失败');
  }
};

const handleMoreAction = async command => {
  const [action, id] = command.split('_');

  switch (action) {
    case 'clone':
      await cloneAnnouncement(id);
      break;
    case 'archive':
      await archiveAnnouncement(id);
      break;
    case 'delete':
      await deleteAnnouncement(id);
      break;
  }
};

const cloneAnnouncement = async id => {
  try {
    const announcement = announcements.value.find(a => a.id === id);
    currentAnnouncement.value = {
      ...announcement,
      title: `${announcement.title}（副本）`,
      status: 'draft',
    };
    formMode.value = 'create';
    formDialogVisible.value = true;
  } catch (error) {
    ElMessage.error('复制公告失败');
  }
};

const archiveAnnouncement = async id => {
  try {
    await announcementStore.archive(id);
    ElMessage.success('归档成功');
    searchAnnouncements();
  } catch (error) {
    ElMessage.error('归档失败');
  }
};

const deleteAnnouncement = async id => {
  const confirmed = await ElMessageBox.confirm('确定要删除这条公告吗？', '删除公告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  });

  if (confirmed) {
    try {
      await announcementStore.delete(id);
      ElMessage.success('删除成功');
      searchAnnouncements();
    } catch (error) {
      ElMessage.error('删除失败');
    }
  }
};

const handleAnnouncementSaved = () => {
  formDialogVisible.value = false;
  searchAnnouncements();
};

// 工具函数
const getPriorityType = priority => {
  const types = {
    emergency: 'danger',
    urgent: 'warning',
    high: 'warning',
    normal: 'info',
    low: 'info',
  };
  return types[priority] || 'info';
};

const getPriorityLabel = priority => {
  const labels = {
    emergency: '紧急',
    urgent: '重要',
    high: '高',
    normal: '普通',
    low: '低',
  };
  return labels[priority] || '普通';
};

const getCategoryType = category => {
  const categoryInfo = categories.find(c => c.value === category);
  return categoryInfo ? 'primary' : 'info';
};

const getCategoryLabel = category => {
  const categoryInfo = categories.find(c => c.value === category);
  return categoryInfo ? categoryInfo.label : '其他';
};

const getStatusType = status => {
  const types = {
    draft: 'info',
    published: 'success',
    archived: 'warning',
    expired: 'danger',
  };
  return types[status] || 'info';
};

const getStatusLabel = status => {
  const labels = {
    draft: '草稿',
    published: '已发布',
    archived: '已归档',
    expired: '已过期',
  };
  return labels[status] || '未知';
};

// 生命周期
onMounted(() => {
  searchAnnouncements();
});
</script>

<style lang="scss" scoped>
.announcement-management {
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
  min-height: calc(100vh - 40px);

  .page-header {
    margin-bottom: 24px;
    padding: 32px;
    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(17, 153, 142, 0.25);
    position: relative;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -20%;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
      border-radius: 50%;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .header-left {
      position: relative;
      z-index: 1;

      .page-title {
        margin: 0 0 8px 0;
        color: #ffffff;
        font-size: 28px;
        font-weight: 700;
        line-height: 1.3;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        letter-spacing: 0.5px;
      }

      .page-subtitle {
        margin: 0;
        color: rgba(255, 255, 255, 0.9);
        font-size: 15px;
        line-height: 1.5;
        font-weight: 400;
      }
    }

    .header-actions {
      flex-shrink: 0;
      position: relative;
      z-index: 1;

      :deep(.el-button) {
        border-radius: 8px;
        font-weight: 600;
        padding: 12px 24px;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }
      }
    }
  }

  .filter-card {
    margin-bottom: 24px;
    border-radius: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(0, 0, 0, 0.04);
    background: #ffffff;
    transition: box-shadow 0.3s ease;

    &:hover {
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
    }

    .filter-row {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 16px;

      .filter-item {
        display: flex;
        align-items: center;
        gap: 8px;

        .filter-label {
          font-weight: 600;
          color: var(--el-text-color-regular);
          font-size: 14px;
          white-space: nowrap;
        }

        .filter-select,
        .filter-date,
        .filter-input {
          :deep(.el-input__wrapper),
          :deep(.el-select__wrapper) {
            border-radius: 8px;
            transition: all 0.2s ease;

            &:hover {
              box-shadow: 0 0 0 1px #11998e inset;
            }
          }
        }

        .filter-select {
          width: 144px;
        }

        .filter-date {
          width: 280px;
        }
      }

      .filter-actions {
        margin-left: auto;
        display: flex;
        gap: 8px;

        :deep(.el-button) {
          border-radius: 8px;
          font-weight: 500;
          transition: all 0.3s ease;

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
        }
      }
    }

    .search-row {
      .search-input {
        max-width: 480px;

        :deep(.el-input__wrapper) {
          border-radius: 8px;
          transition: all 0.2s ease;

          &:hover {
            box-shadow: 0 0 0 1px #11998e inset;
          }
        }
      }
    }
  }

  .list-card {
    border-radius: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(0, 0, 0, 0.04);
    background: #ffffff;
    transition: box-shadow 0.3s ease;

    &:hover {
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
    }

    .batch-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px;
      margin-bottom: 16px;
      background: linear-gradient(135deg, rgba(17, 153, 142, 0.1) 0%, rgba(56, 239, 125, 0.1) 100%);
      border-radius: 12px;
      border-left: 4px solid #11998e;
      border: 1px solid rgba(17, 153, 142, 0.2);

      .batch-info {
        display: flex;
        align-items: center;
        gap: 8px;

        .batch-icon {
          color: #11998e;
          font-size: 20px;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }

        .selected-count {
          color: var(--el-text-color-primary);
          font-size: 15px;
          font-weight: 600;
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      }

      .batch-buttons {
        display: flex;
        gap: 8px;

        :deep(.el-button) {
          border-radius: 8px;
          font-weight: 500;
          transition: all 0.3s ease;

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(17, 153, 142, 0.3);
          }
        }
      }
    }

    :deep(.data-table) {
      border-radius: 12px;
      overflow: hidden;

      .el-table__inner-wrapper {
        border-radius: 12px;
      }

      .el-table__row {
        transition: all 0.3s ease;
        position: relative;

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 0;
          background: linear-gradient(180deg, #11998e 0%, #38ef7d 100%);
          transition: width 0.3s ease;
        }

        &:hover {
          background-color: rgba(17, 153, 142, 0.05);
          transform: scale(1.005);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);

          &::before {
            width: 3px;
          }
        }

        &:nth-child(odd) {
          background-color: rgba(248, 250, 252, 0.5);
        }
      }

      .el-table__header th {
        background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
        color: var(--el-text-color-primary);
        font-weight: 700;
        font-size: 14px;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        position: relative;

        &::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, #11998e 50%, transparent 100%);
        }
      }

      .el-table__cell {
        padding: 16px 12px;
      }
    }

    .title-cell {
      .title-content {
        .title-text {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          color: var(--el-text-color-primary);
          font-weight: 500;
          font-size: 14px;
          line-height: 1.5;
          transition: all 0.3s ease;
          word-break: break-all;
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;

          &:hover {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            transform: translateX(4px);
          }

          &.is-top {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 600;
          }

          .top-icon {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            flex-shrink: 0;
          }
        }

        .title-meta {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }
      }
    }

    .author-cell {
      display: flex;
      align-items: center;
      gap: 12px;

      :deep(.el-avatar) {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        border: 2px solid transparent;
        transition: all 0.3s ease;

        &:hover {
          border-color: #11998e;
          transform: scale(1.05);
        }
      }

      .author-info {
        .author-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--el-text-color-primary);
          line-height: 1.4;
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .author-role {
          font-size: 12px;
          color: var(--el-text-color-secondary);
          line-height: 1.4;
          margin-top: 2px;
          font-weight: 500;
        }
      }
    }

    .time-cell {
      .publish-time {
        font-size: 14px;
        color: var(--el-text-color-primary);
        font-weight: 500;
        line-height: 1.5;
      }

      .time-ago {
        font-size: 12px;
        color: var(--el-text-color-placeholder);
        margin-top: 4px;
        font-weight: 400;
      }
    }

    .stats-cell {
      display: flex;
      gap: 16px;

      .stat-item {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 13px;
        color: var(--el-text-color-secondary);
        transition: all 0.3s ease;
        cursor: pointer;

        &:hover {
          color: #11998e;
          transform: scale(1.1);
        }
      }
    }

    .action-buttons {
      display: flex;
      gap: 6px;

      .action-btn {
        transition: all 0.3s ease;

        &:hover {
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
      }
    }

    .status-tag {
      font-weight: 600;
      border-radius: 12px;
      padding: 4px 12px;
    }
  }

  .category-option {
    display: flex;
    align-items: center;
    gap: 8px;

    .category-icon {
      font-size: 16px;
    }
  }

  .pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-top: 24px;
    padding-top: 20px;
    border-top: 2px solid var(--el-border-color-lighter);

    :deep(.el-pagination) {
      .el-pager li {
        border-radius: 8px;
        transition: all 0.3s ease;

        &:hover {
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
          color: #ffffff;
        }

        &.is-active {
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(17, 153, 142, 0.3);
        }
      }

      .btn-prev,
      .btn-next {
        border-radius: 8px;
        transition: all 0.3s ease;

        &:hover {
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
          color: #ffffff;
        }
      }
    }
  }

  :deep(.dropdown-danger) {
    color: var(--el-color-danger);
  }
}

// 过渡动画
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

// 响应式设计
@media (max-width: 1200px) {
  .announcement-management {
    padding: 16px;

    .filter-card {
      .filter-row {
        .filter-item {
          .filter-select,
          .filter-date {
            width: 100%;
          }
        }

        .filter-actions {
          width: 100%;
          margin-left: 0;
          justify-content: flex-end;
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .announcement-management {
    padding: 12px;

    .page-header {
      .header-content {
        flex-direction: column;
        gap: 16px;

        .header-actions {
          width: 100%;

          .el-button {
            width: 100%;
          }
        }
      }
    }

    .filter-card {
      .filter-row {
        flex-direction: column;
        align-items: stretch;

        .filter-item {
          flex-direction: column;
          align-items: stretch;

          .filter-select,
          .filter-date {
            width: 100%;
          }
        }

        .filter-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
      }

      .search-row {
        .search-input {
          max-width: 100%;
        }
      }
    }

    .list-card {
      .batch-actions {
        flex-direction: column;
        gap: 12px;

        .batch-buttons {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
      }

      .pagination-wrapper {
        justify-content: center;
      }
    }
  }
}
</style>
