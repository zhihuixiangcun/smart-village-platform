<template>
  <div class="announcement-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h2>村务公告管理</h2>
        <div class="header-actions">
          <el-button
            type="primary"
            @click="createAnnouncement"
            :icon="Plus"
            size="large"
          >
            发布公告
          </el-button>
        </div>
      </div>
    </div>

    <!-- 筛选区域 -->
    <el-card class="filter-card" shadow="never">
      <div class="filter-row">
        <div class="filter-item">
          <label>分类：</label>
          <el-select v-model="filters.category" placeholder="全部分类" clearable>
            <el-option
              v-for="category in categories"
              :key="category.value"
              :label="category.label"
              :value="category.value"
            >
              <span class="category-option">
                <span class="category-icon">{{ category.icon }}</span>
                <span>{{ category.label }}</span>
              </span>
            </el-option>
          </el-select>
        </div>

        <div class="filter-item">
          <label>状态：</label>
          <el-select v-model="filters.status" placeholder="全部状态" clearable>
            <el-option label="草稿" value="draft" />
            <el-option label="已发布" value="published" />
            <el-option label="已归档" value="archived" />
            <el-option label="已过期" value="expired" />
          </el-select>
        </div>

        <div class="filter-item">
          <label>优先级：</label>
          <el-select v-model="filters.priority" placeholder="全部优先级" clearable>
            <el-option label="紧急" value="emergency" />
            <el-option label="重要" value="urgent" />
            <el-option label="高" value="high" />
            <el-option label="普通" value="normal" />
            <el-option label="低" value="low" />
          </el-select>
        </div>

        <div class="filter-item">
          <label>发布时间：</label>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            @change="handleDateRangeChange"
          />
        </div>

        <div class="filter-actions">
          <el-button @click="searchAnnouncements" type="primary" :icon="Search">
            搜索
          </el-button>
          <el-button @click="resetFilters" :icon="Refresh">
            重置
          </el-button>
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
        />
      </div>
    </el-card>

    <!-- 公告列表 -->
    <el-card class="list-card" shadow="never">
      <!-- 批量操作 -->
      <div class="batch-actions" v-if="selectedIds.length > 0">
        <span class="selected-count">已选择 {{ selectedIds.length }} 项</span>
        <el-button @click="batchDelete" type="danger" :icon="Delete">
          批量删除
        </el-button>
        <el-button @click="batchArchive" :icon="Box">
          批量归档
        </el-button>
      </div>

      <!-- 数据表格 -->
      <el-table
        v-loading="loading"
        :data="announcements"
        @selection-change="handleSelectionChange"
        stripe
        row-key="id"
      >
        <el-table-column type="selection" width="55" />

        <el-table-column label="标题" min-width="250">
          <template #default="{ row }">
            <div class="title-cell">
              <div class="title-content">
                <span
                  class="title-text"
                  :class="{ 'is-top': row.isTop }"
                  @click="viewAnnouncement(row)"
                >
                  <el-icon v-if="row.isTop" class="top-icon"><Top /></el-icon>
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

        <el-table-column label="发布者" width="120">
          <template #default="{ row }">
            <div class="author-cell">
              <el-avatar :size="32" :src="row.author.avatar">
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
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="统计" width="150">
          <template #default="{ row }">
            <div class="stats-cell">
              <div class="stat-item">
                <el-icon><View /></el-icon>
                <span>{{ row.stats.views }}</span>
              </div>
              <div class="stat-item">
                <el-icon><ChatLineSquare /></el-icon>
                <span>{{ row.stats.comments }}</span>
              </div>
              <div class="stat-item">
                <el-icon><Star /></el-icon>
                <span>{{ row.stats.likes }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-tooltip content="查看详情">
                <el-button
                  @click="viewAnnouncement(row)"
                  :icon="View"
                  size="small"
                  circle
                />
              </el-tooltip>

              <el-tooltip content="编辑">
                <el-button
                  @click="editAnnouncement(row)"
                  :icon="Edit"
                  size="small"
                  type="primary"
                  circle
                />
              </el-tooltip>

              <el-tooltip :content="row.isTop ? '取消置顶' : '置顶'">
                <el-button
                  @click="toggleTop(row)"
                  :icon="Top"
                  :type="row.isTop ? 'warning' : 'default'"
                  size="small"
                  circle
                />
              </el-tooltip>

              <el-dropdown @command="handleMoreAction" trigger="click">
                <el-button :icon="MoreFilled" size="small" circle />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :command="`clone_${row.id}`">
                      <el-icon><CopyDocument /></el-icon>
                      复制公告
                    </el-dropdown-item>
                    <el-dropdown-item :command="`archive_${row.id}`">
                      <el-icon><Box /></el-icon>
                      归档
                    </el-dropdown-item>
                    <el-dropdown-item :command="`delete_${row.id}`" divided>
                      <el-icon><Delete /></el-icon>
                      删除
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
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Search, Refresh, Delete, Box, Edit, View, Top,
  MoreFilled, CopyDocument, ChatLineSquare, Star
} from '@element-plus/icons-vue'
import { useAnnouncementStore } from '@/stores/announcement'
import { formatTime, getTimeAgo } from '@/utils/time'
import AnnouncementFormDialog from './components/AnnouncementFormDialog.vue'
import AnnouncementDetailDialog from './components/AnnouncementDetailDialog.vue'

// 公告分类配置
const categories = [
  { value: 'policy', label: '政策通知', icon: '📋', color: '#409eff' },
  { value: 'finance', label: '财务公示', icon: '💰', color: '#67c23a' },
  { value: 'project', label: '项目进展', icon: '🏗️', color: '#e6a23c' },
  { value: 'safety', label: '安全提醒', icon: '⚠️', color: '#f56c6c' },
  { value: 'welfare', label: '民生福利', icon: '🏥', color: '#909399' },
  { value: 'activity', label: '文化活动', icon: '🎉', color: '#606266' },
  { value: 'emergency', label: '紧急通知', icon: '🚨', color: '#f56c6c' },
  { value: 'meeting', label: '会议通知', icon: '👥', color: '#409eff' },
  { value: 'service', label: '便民服务', icon: '🔧', color: '#67c23a' },
  { value: 'other', label: '其他', icon: '📄', color: '#c0c4cc' }
]

// Store
const announcementStore = useAnnouncementStore()

// 响应式数据
const loading = ref(false)
const announcements = ref([])
const selectedIds = ref([])

// 搜索筛选
const searchKeyword = ref('')
const dateRange = ref([])
const filters = reactive({
  category: '',
  status: '',
  priority: ''
})

// 分页
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 弹窗控制
const formDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const formMode = ref('create') // create | edit
const currentAnnouncement = ref(null)

// 方法
const searchAnnouncements = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.size,
      search: searchKeyword.value,
      ...filters
    }

    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }

    const result = await announcementStore.getAnnouncements(params)
    announcements.value = result.data.announcements
    pagination.total = result.data.pagination.total
  } catch (error) {
    ElMessage.error('获取公告列表失败')
  } finally {
    loading.value = false
  }
}

const resetFilters = () => {
  searchKeyword.value = ''
  dateRange.value = []
  Object.keys(filters).forEach(key => {
    filters[key] = ''
  })
  pagination.page = 1
  searchAnnouncements()
}

const handleDateRangeChange = (value) => {
  dateRange.value = value
}

const handleSelectionChange = (selection) => {
  selectedIds.value = selection.map(item => item.id)
}

const handleSizeChange = (size) => {
  pagination.size = size
  pagination.page = 1
  searchAnnouncements()
}

const handlePageChange = (page) => {
  pagination.page = page
  searchAnnouncements()
}

// 公告操作
const createAnnouncement = () => {
  currentAnnouncement.value = null
  formMode.value = 'create'
  formDialogVisible.value = true
}

const editAnnouncement = (announcement) => {
  currentAnnouncement.value = announcement
  formMode.value = 'edit'
  formDialogVisible.value = true
}

const viewAnnouncement = (announcement) => {
  currentAnnouncement.value = announcement
  detailDialogVisible.value = true
}

const toggleTop = async (announcement) => {
  try {
    await announcementStore.toggleTop(announcement.id)
    announcement.isTop = !announcement.isTop
    ElMessage.success(`公告${announcement.isTop ? '置顶' : '取消置顶'}成功`)
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const batchDelete = async () => {
  const confirmed = await ElMessageBox.confirm(
    `确定要删除选中的 ${selectedIds.value.length} 条公告吗？`,
    '批量删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )

  if (confirmed) {
    try {
      await announcementStore.batchDelete(selectedIds.value)
      ElMessage.success('批量删除成功')
      selectedIds.value = []
      searchAnnouncements()
    } catch (error) {
      ElMessage.error('批量删除失败')
    }
  }
}

const batchArchive = async () => {
  try {
    await announcementStore.batchArchive(selectedIds.value)
    ElMessage.success('批量归档成功')
    selectedIds.value = []
    searchAnnouncements()
  } catch (error) {
    ElMessage.error('批量归档失败')
  }
}

const handleMoreAction = async (command) => {
  const [action, id] = command.split('_')

  switch (action) {
    case 'clone':
      await cloneAnnouncement(id)
      break
    case 'archive':
      await archiveAnnouncement(id)
      break
    case 'delete':
      await deleteAnnouncement(id)
      break
  }
}

const cloneAnnouncement = async (id) => {
  try {
    const announcement = announcements.value.find(a => a.id === id)
    currentAnnouncement.value = {
      ...announcement,
      title: `${announcement.title}（副本）`,
      status: 'draft'
    }
    formMode.value = 'create'
    formDialogVisible.value = true
  } catch (error) {
    ElMessage.error('复制公告失败')
  }
}

const archiveAnnouncement = async (id) => {
  try {
    await announcementStore.archive(id)
    ElMessage.success('归档成功')
    searchAnnouncements()
  } catch (error) {
    ElMessage.error('归档失败')
  }
}

const deleteAnnouncement = async (id) => {
  const confirmed = await ElMessageBox.confirm(
    '确定要删除这条公告吗？',
    '删除公告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )

  if (confirmed) {
    try {
      await announcementStore.delete(id)
      ElMessage.success('删除成功')
      searchAnnouncements()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }
}

const handleAnnouncementSaved = () => {
  formDialogVisible.value = false
  searchAnnouncements()
}

// 工具函数
const getPriorityType = (priority) => {
  const types = {
    emergency: 'danger',
    urgent: 'warning',
    high: 'warning',
    normal: 'info',
    low: 'info'
  }
  return types[priority] || 'info'
}

const getPriorityLabel = (priority) => {
  const labels = {
    emergency: '紧急',
    urgent: '重要',
    high: '高',
    normal: '普通',
    low: '低'
  }
  return labels[priority] || '普通'
}

const getCategoryType = (category) => {
  const categoryInfo = categories.find(c => c.value === category)
  return categoryInfo ? 'primary' : 'info'
}

const getCategoryLabel = (category) => {
  const categoryInfo = categories.find(c => c.value === category)
  return categoryInfo ? categoryInfo.label : '其他'
}

const getStatusType = (status) => {
  const types = {
    draft: 'info',
    published: 'success',
    archived: 'warning',
    expired: 'danger'
  }
  return types[status] || 'info'
}

const getStatusLabel = (status) => {
  const labels = {
    draft: '草稿',
    published: '已发布',
    archived: '已归档',
    expired: '已过期'
  }
  return labels[status] || '未知'
}

// 生命周期
onMounted(() => {
  searchAnnouncements()
})
</script>

<style lang="scss" scoped>
.announcement-management {
  padding: 20px;
  background: var(--bg-color-light);
  min-height: 100vh;

  .page-header {
    margin-bottom: 20px;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      h2 {
        margin: 0;
        color: var(--text-color-primary);
        font-size: 24px;
        font-weight: 600;
      }
    }
  }

  .filter-card {
    margin-bottom: 20px;

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

        label {
          font-weight: 500;
          color: var(--text-color-regular);
          white-space: nowrap;
        }

        .el-select {
          width: 140px;
        }

        .el-date-picker {
          width: 240px;
        }
      }

      .filter-actions {
        margin-left: auto;

        .el-button {
          margin-left: 8px;
        }
      }
    }

    .search-row {
      .el-input {
        max-width: 400px;
      }
    }
  }

  .list-card {
    .batch-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 0;
      border-bottom: 1px solid var(--border-color-light);
      margin-bottom: 16px;

      .selected-count {
        color: var(--text-color-regular);
        font-size: 14px;
      }
    }

    .title-cell {
      .title-content {
        .title-text {
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          color: var(--text-color-primary);
          font-weight: 500;
          transition: color 0.2s ease;

          &:hover {
            color: var(--primary-color);
          }

          &.is-top {
            color: var(--warning-color);
            font-weight: 600;
          }

          .top-icon {
            color: var(--warning-color);
          }
        }

        .title-meta {
          display: flex;
          gap: 8px;
          margin-top: 8px;

          .el-tag {
            height: 20px;
            line-height: 18px;
            font-size: 12px;
          }
        }
      }
    }

    .author-cell {
      display: flex;
      align-items: center;
      gap: 8px;

      .author-info {
        .author-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-color-primary);
        }

        .author-role {
          font-size: 12px;
          color: var(--text-color-secondary);
        }
      }
    }

    .time-cell {
      .publish-time {
        font-size: 14px;
        color: var(--text-color-primary);
      }

      .time-ago {
        font-size: 12px;
        color: var(--text-color-secondary);
        margin-top: 2px;
      }
    }

    .stats-cell {
      display: flex;
      gap: 12px;

      .stat-item {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: var(--text-color-secondary);

        .el-icon {
          font-size: 14px;
        }
      }
    }

    .action-buttons {
      display: flex;
      gap: 4px;
    }

    .pagination-wrapper {
      display: flex;
      justify-content: center;
      margin-top: 20px;
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
}

// 响应式设计
@media (max-width: 768px) {
  .announcement-management {
    padding: 12px;

    .filter-card {
      .filter-row {
        flex-direction: column;
        align-items: stretch;

        .filter-item {
          flex-direction: column;
          align-items: stretch;

          .el-select,
          .el-date-picker {
            width: 100%;
          }
        }

        .filter-actions {
          margin-left: 0;
          display: flex;
          gap: 8px;

          .el-button {
            flex: 1;
            margin-left: 0;
          }
        }
      }
    }

    .action-buttons {
      flex-wrap: wrap;
    }
  }
}
</style>