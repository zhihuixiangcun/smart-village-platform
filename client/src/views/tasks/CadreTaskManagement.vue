<template>
  <div class="cadre-task-management">
    <!-- 顶部操作栏 -->
    <div class="header-bar">
      <div class="left-section">
        <h2>村干部任务管理</h2>
        <div class="view-toggle">
          <el-radio-group v-model="viewMode" size="default">
            <el-radio-button value="quadrant">四象限视图</el-radio-button>
            <el-radio-button value="list">列表视图</el-radio-button>
            <el-radio-button value="statistics">统计报表</el-radio-button>
          </el-radio-group>
        </div>
      </div>
      <div class="right-section">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索任务..."
          :prefix-icon="Search"
          clearable
          style="width: 200px; margin-right: 12px"
        />
        <el-select v-model="filterStatus" placeholder="状态筛选" clearable style="width: 120px; margin-right: 12px">
          <el-option label="待处理" value="pending" />
          <el-option label="进行中" value="in-progress" />
          <el-option label="已完成" value="completed" />
          <el-option label="已取消" value="cancelled" />
          <el-option label="暂停" value="on-hold" />
        </el-select>
        <el-button type="primary" :icon="Plus" @click="showCreateDialog = true">
          新建任务
        </el-button>
        <el-button :icon="Refresh" @click="loadTasks">刷新</el-button>
      </div>
    </div>

    <!-- 四象限视图 -->
    <div v-if="viewMode === 'quadrant'" class="quadrant-view">
      <div class="quadrant-container">
        <!-- 第一象限：重要且紧急 -->
        <div class="quadrant urgent-important">
          <div class="quadrant-header">
            <div class="quadrant-title">
              <el-icon class="icon"><WarningFilled /></el-icon>
              <span>重要且紧急</span>
            </div>
            <div class="quadrant-count">{{ quadrantTasks['urgent-important']?.length || 0 }}</div>
          </div>
          <div class="quadrant-body">
            <TaskCard
              v-for="task in quadrantTasks['urgent-important']"
              :key="task._id"
              :task="task"
              @click="viewTaskDetail(task)"
              @status-change="handleStatusChange"
            />
            <el-empty v-if="!quadrantTasks['urgent-important']?.length" description="暂无任务" :image-size="60" />
          </div>
        </div>

        <!-- 第二象限：重要不紧急 -->
        <div class="quadrant important-not-urgent">
          <div class="quadrant-header">
            <div class="quadrant-title">
              <el-icon class="icon"><TrendCharts /></el-icon>
              <span>重要不紧急</span>
            </div>
            <div class="quadrant-count">{{ quadrantTasks['important-not-urgent']?.length || 0 }}</div>
          </div>
          <div class="quadrant-body">
            <TaskCard
              v-for="task in quadrantTasks['important-not-urgent']"
              :key="task._id"
              :task="task"
              @click="viewTaskDetail(task)"
              @status-change="handleStatusChange"
            />
            <el-empty v-if="!quadrantTasks['important-not-urgent']?.length" description="暂无任务" :image-size="60" />
          </div>
        </div>

        <!-- 第三象限：紧急不重要 -->
        <div class="quadrant urgent-not-important">
          <div class="quadrant-header">
            <div class="quadrant-title">
              <el-icon class="icon"><Odometer /></el-icon>
              <span>紧急不重要</span>
            </div>
            <div class="quadrant-count">{{ quadrantTasks['urgent-not-important']?.length || 0 }}</div>
          </div>
          <div class="quadrant-body">
            <TaskCard
              v-for="task in quadrantTasks['urgent-not-important']"
              :key="task._id"
              :task="task"
              @click="viewTaskDetail(task)"
              @status-change="handleStatusChange"
            />
            <el-empty v-if="!quadrantTasks['urgent-not-important']?.length" description="暂无任务" :image-size="60" />
          </div>
        </div>

        <!-- 第四象限：不重要不紧急 -->
        <div class="quadrant not-urgent-not-important">
          <div class="quadrant-header">
            <div class="quadrant-title">
              <el-icon class="icon"><DeleteFilled /></el-icon>
              <span>不重要不紧急</span>
            </div>
            <div class="quadrant-count">{{ quadrantTasks['not-urgent-not-important']?.length || 0 }}</div>
          </div>
          <div class="quadrant-body">
            <TaskCard
              v-for="task in quadrantTasks['not-urgent-not-important']"
              :key="task._id"
              :task="task"
              @click="viewTaskDetail(task)"
              @status-change="handleStatusChange"
            />
            <el-empty v-if="!quadrantTasks['not-urgent-not-important']?.length" description="暂无任务" :image-size="60" />
          </div>
        </div>
      </div>
    </div>

    <!-- 列表视图 -->
    <div v-else-if="viewMode === 'list'" class="list-view">
      <el-table :data="filteredTasks" style="width: 100%" v-loading="loading">
        <el-table-column prop="title" label="任务标题" min-width="200" />
        <el-table-column prop="category" label="类别" width="120">
          <template #default="{ row }">
            <el-tag :type="getCategoryType(row.category)">{{ getCategoryLabel(row.category) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="quadrant" label="象限" width="140">
          <template #default="{ row }">
            <el-tag :type="getQuadrantType(row.quadrant)">{{ getQuadrantLabel(row.quadrant) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="100">
          <template #default="{ row }">
            <el-rate v-model="row.priority" disabled />
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="progress" label="进度" width="120">
          <template #default="{ row }">
            <el-progress :percentage="row.progress" :stroke-width="6" />
          </template>
        </el-table-column>
        <el-table-column prop="assigneeName" label="负责人" width="120" />
        <el-table-column prop="dueDate" label="截止日期" width="120">
          <template #default="{ row }">
            {{ row.dueDate ? formatDate(row.dueDate) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewTaskDetail(row)">查看</el-button>
            <el-button link type="primary" @click="editTask(row)">编辑</el-button>
            <el-popconfirm title="确定删除此任务吗？" @confirm="deleteTask(row._id)">
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 统计报表 -->
    <div v-else-if="viewMode === 'statistics'" class="statistics-view">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: #67c23a">
                <el-icon><SuccessFilled /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statistics.totalCompleted || 0 }}</div>
                <div class="stat-label">已完成任务</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: #409eff">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statistics.totalInProgress || 0 }}</div>
                <div class="stat-label">进行中任务</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: #e6a23c">
                <el-icon><WarningFilled /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statistics.totalOverdue || 0 }}</div>
                <div class="stat-label">逾期任务</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: #909399">
                <el-icon><DataLine /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statistics.totalTasks || 0 }}</div>
                <div class="stat-label">总任务数</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 按类别统计 -->
      <el-card class="chart-card" style="margin-top: 20px">
        <template #header>
          <span>任务分类统计</span>
        </template>
        <div class="category-stats">
          <div v-for="(count, category) in statistics.byCategory" :key="category" class="category-stat-item">
            <span class="category-label">{{ getCategoryLabel(category) }}</span>
            <el-progress :percentage="calculatePercentage(count, statistics.totalTasks)" :color="getCategoryColor(category)" />
          </div>
        </div>
      </el-card>

      <!-- 按状态统计 -->
      <el-card class="chart-card" style="margin-top: 20px">
        <template #header>
          <span>任务状态分布</span>
        </template>
        <div class="status-stats">
          <div v-for="(count, status) in statistics.byStatus" :key="status" class="status-stat-item">
            <el-tag :type="getStatusType(status)" style="width: 100px">{{ getStatusLabel(status) }}</el-tag>
            <span class="status-count">{{ count }}</span>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 创建/编辑任务对话框 -->
    <TaskForm
      v-model="showCreateDialog"
      :task="editingTask"
      @saved="handleTaskSaved"
    />

    <!-- 任务详情对话框 -->
    <TaskDetail
      v-model="showDetailDialog"
      :task="selectedTask"
      @updated="loadTasks"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Search, Plus, Refresh, WarningFilled, TrendCharts, Odometer, DeleteFilled, SuccessFilled, Clock, DataLine } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { cadreTaskApi } from '@/api'
import TaskCard from './components/TaskCard.vue'
import TaskForm from './components/TaskForm.vue'
import TaskDetail from './components/TaskDetail.vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// 视图模式
const viewMode = ref('quadrant')

// 搜索和筛选
const searchKeyword = ref('')
const filterStatus = ref('')

// 任务数据
const tasks = ref([])
const loading = ref(false)

// 对话框状态
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const editingTask = ref(null)
const selectedTask = ref(null)

// 统计数据
const statistics = ref({})

// 四象限任务
const quadrantTasks = computed(() => {
  const result = {
    'urgent-important': [],
    'important-not-urgent': [],
    'urgent-not-important': [],
    'not-urgent-not-important': []
  }

  tasks.value.forEach(task => {
    if (result[task.quadrant]) {
      result[task.quadrant].push(task)
    }
  })

  return result
})

// 过滤后的任务（列表视图）
const filteredTasks = computed(() => {
  let result = tasks.value

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(task =>
      task.title?.toLowerCase().includes(keyword) ||
      task.description?.toLowerCase().includes(keyword)
    )
  }

  if (filterStatus.value) {
    result = result.filter(task => task.status === filterStatus.value)
  }

  return result
})

// 加载任务列表
const loadTasks = async () => {
  loading.value = true
  try {
    const villageId = userStore.user?.villageId
    if (!villageId) {
      ElMessage.warning('请先选择村庄')
      return
    }

    const { data } = await cadreTaskApi.getTasks({ villageId })
    if (data.success) {
      tasks.value = data.data
    }
  } catch (error) {
    console.error('Load tasks error:', error)
    ElMessage.error('加载任务失败')
  } finally {
    loading.value = false
  }
}

// 加载统计数据
const loadStatistics = async () => {
  try {
    const villageId = userStore.user?.villageId
    if (!villageId) return

    const { data } = await cadreTaskApi.getStatistics({ villageId })
    if (data.success) {
      statistics.value = data.data
    }
  } catch (error) {
    console.error('Load statistics error:', error)
  }
}

// 查看任务详情
const viewTaskDetail = (task) => {
  selectedTask.value = task
  showDetailDialog.value = true
}

// 编辑任务
const editTask = (task) => {
  editingTask.value = task
  showCreateDialog.value = true
}

// 删除任务
const deleteTask = async (taskId) => {
  try {
    const { data } = await cadreTaskApi.deleteTask(taskId)
    if (data.success) {
      ElMessage.success('删除成功')
      loadTasks()
    }
  } catch (error) {
    console.error('Delete task error:', error)
    ElMessage.error('删除失败')
  }
}

// 处理状态变更
const handleStatusChange = async (taskId, newStatus) => {
  try {
    const { data } = await cadreTaskApi.updateTaskStatus(taskId, { status: newStatus })
    if (data.success) {
      ElMessage.success('状态更新成功')
      loadTasks()
    }
  } catch (error) {
    console.error('Update status error:', error)
    ElMessage.error('状态更新失败')
  }
}

// 任务保存回调
const handleTaskSaved = () => {
  showCreateDialog.value = false
  editingTask.value = null
  loadTasks()
  loadStatistics()
}

// 工具函数
const getCategoryType = (category) => {
  const types = {
    governance: 'primary',
    emergency: 'danger',
    finance: 'success',
    service: 'info',
    infrastructure: 'warning',
    agriculture: 'success',
    other: 'info'
  }
  return types[category] || 'info'
}

const getCategoryLabel = (category) => {
  const labels = {
    governance: '村务',
    emergency: '应急',
    finance: '财务',
    service: '服务',
    infrastructure: '基建',
    agriculture: '农业',
    other: '其他'
  }
  return labels[category] || category
}

const getCategoryColor = (category) => {
  const colors = {
    governance: '#409eff',
    emergency: '#f56c6c',
    finance: '#67c23a',
    service: '#909399',
    infrastructure: '#e6a23c',
    agriculture: '#67c23a',
    other: '#909399'
  }
  return colors[category] || '#909399'
}

const getQuadrantType = (quadrant) => {
  const types = {
    'urgent-important': 'danger',
    'important-not-urgent': 'warning',
    'urgent-not-important': 'info',
    'not-urgent-not-important': 'info'
  }
  return types[quadrant] || 'info'
}

const getQuadrantLabel = (quadrant) => {
  const labels = {
    'urgent-important': '重要且紧急',
    'important-not-urgent': '重要不紧急',
    'urgent-not-important': '紧急不重要',
    'not-urgent-not-important': '不重要不紧急'
  }
  return labels[quadrant] || quadrant
}

const getStatusType = (status) => {
  const types = {
    pending: 'info',
    'in-progress': 'primary',
    completed: 'success',
    cancelled: 'danger',
    'on-hold': 'warning'
  }
  return types[status] || 'info'
}

const getStatusLabel = (status) => {
  const labels = {
    pending: '待处理',
    'in-progress': '进行中',
    completed: '已完成',
    cancelled: '已取消',
    'on-hold': '暂停'
  }
  return labels[status] || status
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

const calculatePercentage = (count, total) => {
  return total > 0 ? Math.round((count / total) * 100) : 0
}

onMounted(() => {
  loadTasks()
  loadStatistics()
})
</script>

<style scoped>
.cadre-task-management {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
}

.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
}

.header-bar .left-section {
  display: flex;
  align-items: center;
  gap: 24px;
}

.header-bar h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.header-bar .right-section {
  display: flex;
  align-items: center;
}

/* 四象限视图 */
.quadrant-view {
  height: calc(100vh - 180px);
}

.quadrant-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 16px;
  height: 100%;
}

.quadrant {
  background: #fff;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.quadrant-header {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e4e7ed;
}

.quadrant-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 15px;
}

.quadrant-count {
  background: #f0f2f5;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
}

.quadrant.urgent-important .quadrant-header {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%);
  color: #fff;
}

.quadrant.urgent-important .quadrant-count {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.quadrant.important-not-urgent .quadrant-header {
  background: linear-gradient(135deg, #ffd93d 0%, #f9c802 100%);
  color: #fff;
}

.quadrant.important-not-urgent .quadrant-count {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.quadrant.urgent-not-important .quadrant-header {
  background: linear-gradient(135deg, #a8e6cf 0%, #56ab91 100%);
  color: #fff;
}

.quadrant.urgent-not-important .quadrant-count {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.quadrant.not-urgent-not-important .quadrant-header {
  background: linear-gradient(135deg, #b2bec3 0%, #636e72 100%);
  color: #fff;
}

.quadrant.not-urgent-not-important .quadrant-count {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.quadrant-body {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 列表视图 */
.list-view {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* 统计视图 */
.statistics-view {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

.stat-card {
  margin-bottom: 20px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 28px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.chart-card {
  margin-bottom: 20px;
}

.category-stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.category-stat-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.category-label {
  width: 100px;
  font-size: 14px;
  color: #606266;
}

.status-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 6px;
}

.status-count {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}
</style>
