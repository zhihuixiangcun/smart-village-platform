<template>
  <el-card class="project-card" :class="getCardClass()">
    <template #header>
      <div class="card-header">
        <div class="project-title">
          <h4>{{ project.projectName }}</h4>
          <span class="project-code">{{ project.projectCode }}</span>
        </div>
        <div class="project-status">
          <el-tag :type="getStatusColor(project.status)" size="small">
            {{ getStatusName(project.status) }}
          </el-tag>
        </div>
      </div>
    </template>

    <div class="card-content">
      <!-- 项目基本信息 -->
      <div class="project-info">
        <div class="info-row">
          <el-icon><FolderOpened /></el-icon>
          <span class="label">类型：</span>
          <el-tag :type="getProjectTypeColor(project.projectType)" size="small">
            {{ getProjectTypeName(project.projectType) }}
          </el-tag>
        </div>
        
        <div class="info-row">
          <el-icon><Flag /></el-icon>
          <span class="label">优先级：</span>
          <el-tag :type="getPriorityColor(project.priority)" size="small">
            {{ getPriorityName(project.priority) }}
          </el-tag>
        </div>
        
        <div class="info-row">
          <el-icon><Money /></el-icon>
          <span class="label">预算：</span>
          <span class="budget-amount">¥{{ formatBudget(project.budgetInfo.totalBudget) }}万</span>
        </div>

        <div class="info-row">
          <el-icon><Calendar /></el-icon>
          <span class="label">周期：</span>
          <span class="timeline">
            {{ formatDate(project.timeline.plannedStartDate) }} 
            至 
            {{ formatDate(project.timeline.plannedEndDate) }}
          </span>
        </div>
      </div>

      <!-- 项目描述 -->
      <div class="project-description">
        <p>{{ truncateDescription(project.projectDescription) }}</p>
      </div>

      <!-- 进度条 -->
      <div class="progress-section">
        <div class="progress-header">
          <span class="progress-label">项目进度</span>
          <span class="progress-value">{{ project.progress.overallProgress }}%</span>
        </div>
        <el-progress 
          :percentage="project.progress.overallProgress" 
          :color="getProgressColor(project.progress.overallProgress)"
          :show-text="false"
        />
      </div>

      <!-- 延期警告 -->
      <div v-if="isDelayed" class="delay-warning">
        <el-alert
          title="项目延期"
          type="warning"
          :description="`已延期 ${getDelayDays()} 天`"
          :closable="false"
          show-icon
        />
      </div>

      <!-- 风险提示 -->
      <div v-if="hasHighRisk" class="risk-warning">
        <el-alert
          title="高风险项目"
          type="error"
          :description="`风险等级：${getRiskLevelName(project.riskManagement.riskLevel)}`"
          :closable="false"
          show-icon
        />
      </div>

      <!-- 项目团队 -->
      <div class="team-info">
        <div class="team-member" v-if="project.projectTeam.projectManager.name">
          <el-icon><User /></el-icon>
          <span class="member-label">项目经理：</span>
          <span class="member-name">{{ project.projectTeam.projectManager.name }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="card-actions">
        <el-button size="small" @click="$emit('view', project)">
          <el-icon><View /></el-icon>
          查看详情
        </el-button>
        
        <!-- 根据项目状态显示不同操作 -->
        <template v-if="project.status === 'draft'">
          <el-button 
            size="small" 
            type="primary" 
            @click="$emit('edit', project)"
            v-if="canEdit"
          >
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
          <el-button 
            size="small" 
            type="success" 
            @click="$emit('submit', project)"
            v-if="canSubmit"
          >
            <el-icon><Upload /></el-icon>
            提交审批
          </el-button>
          <el-button 
            size="small" 
            type="danger" 
            @click="$emit('delete', project)"
            v-if="canDelete"
          >
            <el-icon><Delete /></el-icon>
            删除
          </el-button>
        </template>

        <template v-else-if="project.status === 'approved'">
          <el-button 
            size="small" 
            type="success" 
            @click="$emit('start', project)"
            v-if="canStart"
          >
            <el-icon><VideoPlay /></el-icon>
            启动项目
          </el-button>
        </template>

        <template v-else-if="project.status === 'in_progress'">
          <el-button 
            size="small" 
            type="primary" 
            @click="$emit('updateProgress', project)"
            v-if="canUpdateProgress"
          >
            <el-icon><TrendCharts /></el-icon>
            更新进度
          </el-button>
        </template>

        <!-- 更多操作下拉菜单 -->
        <el-dropdown @command="handleCommand">
          <el-button size="small">
            更多<el-icon><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="addRisk" v-if="project.status === 'in_progress'">
                添加风险
              </el-dropdown-item>
              <el-dropdown-item command="changeRequest" v-if="project.status === 'in_progress'">
                变更申请
              </el-dropdown-item>
              <el-dropdown-item command="viewProgress" v-if="project.status === 'in_progress'">
                查看进度报告
              </el-dropdown-item>
              <el-dropdown-item command="acceptance" v-if="project.status === 'completed'">
                项目验收
              </el-dropdown-item>
              <el-dropdown-item command="archive" divided>
                归档项目
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </template>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'
import { 
  FolderOpened, Flag, Money, Calendar, User, View, Edit, Upload, Delete, 
  VideoPlay, TrendCharts, ArrowDown 
} from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'

const props = defineProps({
  project: {
    type: Object,
    required: true
  }
})

const emit = defineEmits([
  'view', 'edit', 'delete', 'submit', 'start', 'updateProgress'
])

const userStore = useUserStore()

// 计算属性
const canEdit = computed(() => {
  return ['draft', 'in_progress'].includes(props.project.status) &&
         userStore.hasPermission('project_management', 'update')
})

const canSubmit = computed(() => {
  return props.project.status === 'draft' &&
         userStore.hasPermission('project_management', 'submit')
})

const canDelete = computed(() => {
  return props.project.status === 'draft' &&
         userStore.hasPermission('project_management', 'delete')
})

const canStart = computed(() => {
  return props.project.status === 'approved' &&
         userStore.hasPermission('project_management', 'execute')
})

const canUpdateProgress = computed(() => {
  return props.project.status === 'in_progress' &&
         userStore.hasPermission('project_management', 'update')
})

const isDelayed = computed(() => {
  if (props.project.status === 'completed') return false
  const now = new Date()
  const plannedEnd = new Date(props.project.timeline.plannedEndDate)
  return plannedEnd < now
})

const hasHighRisk = computed(() => {
  return ['high', 'critical'].includes(props.project.riskManagement?.riskLevel)
})

// 方法
const getCardClass = () => {
  const classes = []
  
  if (isDelayed.value) classes.push('delayed')
  if (hasHighRisk.value) classes.push('high-risk')
  if (props.project.status === 'completed') classes.push('completed')
  
  return classes.join(' ')
}

const getStatusName = (status) => {
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
    closed: '已关闭'
  }
  return statusMap[status] || status
}

const getStatusColor = (status) => {
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
    closed: 'info'
  }
  return colorMap[status] || ''
}

const getProjectTypeName = (type) => {
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
    other: '其他'
  }
  return typeMap[type] || type
}

const getProjectTypeColor = (type) => {
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
    other: 'info'
  }
  return colorMap[type] || ''
}

const getPriorityName = (priority) => {
  const priorityMap = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急'
  }
  return priorityMap[priority] || priority
}

const getPriorityColor = (priority) => {
  const colorMap = {
    low: 'info',
    medium: '',
    high: 'warning',
    urgent: 'danger'
  }
  return colorMap[priority] || ''
}

const getRiskLevelName = (level) => {
  const levelMap = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
    critical: '严重风险'
  }
  return levelMap[level] || level
}

const getProgressColor = (progress) => {
  if (progress < 30) return '#f56c6c'
  if (progress < 70) return '#e6a23c'
  return '#67c23a'
}

const formatBudget = (budget) => {
  return (budget / 10000).toFixed(1)
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  })
}

const truncateDescription = (description) => {
  if (!description) return ''
  return description.length > 100 ? description.substring(0, 100) + '...' : description
}

const getDelayDays = () => {
  if (!isDelayed.value) return 0
  const now = new Date()
  const plannedEnd = new Date(props.project.timeline.plannedEndDate)
  const diffTime = Math.abs(now - plannedEnd)
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

const handleCommand = (command) => {
  // 处理下拉菜单命令
  console.log('Command:', command, 'Project:', props.project)
  // 这里可以添加更多的命令处理逻辑
}
</script>

<style scoped>
.project-card {
  margin-bottom: 16px;
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.project-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.project-card.delayed {
  border-left: 4px solid #f56c6c;
}

.project-card.high-risk {
  border-left: 4px solid #f56c6c;
  background-color: #fef5f5;
}

.project-card.completed {
  border-left: 4px solid #67c23a;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.project-title h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
}

.project-code {
  font-size: 12px;
  color: #909399;
  font-family: monospace;
}

.card-content {
  padding: 0;
}

.project-info {
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

.info-row .el-icon {
  margin-right: 8px;
  color: #909399;
  font-size: 16px;
}

.label {
  margin-right: 8px;
  color: #606266;
  min-width: 60px;
}

.budget-amount {
  font-weight: 600;
  color: #409eff;
}

.timeline {
  color: #606266;
  font-size: 13px;
}

.project-description {
  margin-bottom: 16px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.project-description p {
  margin: 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}

.progress-section {
  margin-bottom: 16px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-label {
  font-size: 14px;
  color: #606266;
}

.progress-value {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.delay-warning, .risk-warning {
  margin-bottom: 16px;
}

.team-info {
  margin-bottom: 16px;
}

.team-member {
  display: flex;
  align-items: center;
  font-size: 13px;
}

.team-member .el-icon {
  margin-right: 6px;
  color: #909399;
}

.member-label {
  margin-right: 6px;
  color: #606266;
}

.member-name {
  color: #303133;
  font-weight: 500;
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
}

.card-actions .el-button {
  flex: 0 0 auto;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .project-status {
    margin-top: 8px;
  }
  
  .info-row {
    flex-wrap: wrap;
  }
  
  .card-actions {
    justify-content: center;
  }
  
  .card-actions .el-button {
    flex: 1 1 auto;
    min-width: 80px;
  }
}

/* 动画效果 */
.el-progress {
  transition: all 0.3s ease;
}

.el-tag {
  transition: all 0.2s ease;
}

.card-actions .el-button {
  transition: all 0.2s ease;
}

.card-actions .el-button:hover {
  transform: translateY(-1px);
}
</style>