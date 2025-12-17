<template>
  <div class="project-detail">
    <el-container>
      <!-- 页面头部 -->
      <el-header class="page-header">
        <div class="header-content">
          <div class="title-section">
            <el-breadcrumb separator="/">
              <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
              <el-breadcrumb-item :to="{ path: '/projects' }">项目管理</el-breadcrumb-item>
              <el-breadcrumb-item>项目详情</el-breadcrumb-item>
            </el-breadcrumb>
            <h1 class="page-title">
              <el-icon><OfficeBuilding /></el-icon>
              {{ project.name }}
            </h1>
            <div class="project-badges">
              <el-tag :type="getTypeTagType(project.type)" size="large">
                {{ getTypeLabel(project.type) }}
              </el-tag>
              <el-tag :type="getStatusTagType(project.status)" size="large">
                {{ getStatusLabel(project.status) }}
              </el-tag>
            </div>
          </div>
          <div class="action-section">
            <el-button @click="$router.go(-1)">
              <el-icon><ArrowLeft /></el-icon>
              返回
            </el-button>
            <el-button
              type="primary"
              @click="editProject"
              v-if="hasPermission('project:write')"
            >
              <el-icon><Edit /></el-icon>
              编辑项目
            </el-button>
          </div>
        </div>
      </el-header>

      <!-- 页面主体 -->
      <el-main class="page-main" v-loading="loading">
        <!-- 项目概览卡片 -->
        <el-card shadow="never" class="overview-card">
          <template #header>
            <div class="card-header">
              <span>项目概览</span>
              <el-tag :type="getProgressColor(project.progress)" size="large">
                进度: {{ project.progress }}%
              </el-tag>
            </div>
          </template>

          <el-row :gutter="24">
            <el-col :xs="24" :sm="12" :md="8">
              <div class="info-item">
                <div class="info-label">项目负责人</div>
                <div class="info-value">{{ project.manager }}</div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <div class="info-item">
                <div class="info-label">开始时间</div>
                <div class="info-value">{{ formatDate(project.startDate) }}</div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <div class="info-item">
                <div class="info-label">预计完成</div>
                <div class="info-value">{{ formatDate(project.expectedEndDate) }}</div>
              </div>
            </el-col>
          </el-row>

          <el-row :gutter="24" style="margin-top: 20px;">
            <el-col :xs="24" :sm="12" :md="8">
              <div class="info-item">
                <div class="info-label">项目预算</div>
                <div class="info-value">¥{{ project.budget?.toLocaleString() || '0' }}</div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <div class="info-item">
                <div class="info-label">已使用</div>
                <div class="info-value">¥{{ project.spent?.toLocaleString() || '0' }}</div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <div class="info-item">
                <div class="info-label">预算使用率</div>
                <div class="info-value">
                  {{ project.budget ? ((project.spent / project.budget) * 100).toFixed(1) : 0 }}%
                </div>
              </div>
            </el-col>
          </el-row>

          <!-- 进度条 -->
          <div class="progress-section">
            <div class="progress-label">项目进度</div>
            <el-progress
              :percentage="project.progress"
              :color="getProgressColor(project.progress)"
              :stroke-width="12"
              :format="(percentage) => `${percentage}%`"
            />
          </div>
        </el-card>

        <!-- 项目描述 -->
        <el-card shadow="never" class="description-card">
          <template #header>
            <span>项目描述</span>
          </template>
          <p class="project-description">{{ project.description || '暂无描述' }}</p>
        </el-card>

        <!-- 里程碑 -->
        <el-card shadow="never" class="milestone-card">
          <template #header>
            <span>项目里程碑</span>
            <el-button
              type="text"
              size="small"
              @click="addMilestone"
              v-if="hasPermission('project:write')"
            >
              <el-icon><Plus /></el-icon>
              添加里程碑
            </el-button>
          </template>

          <el-timeline>
            <el-timeline-item
              v-for="(milestone, index) in project.milestones"
              :key="index"
              :type="milestone.status === 'completed' ? 'success' : 'primary'"
              :timestamp="milestone.completedDate || milestone.expectedDate"
              placement="top"
            >
              <el-card shadow="hover">
                <div class="milestone-content">
                  <div class="milestone-title">{{ milestone.name }}</div>
                  <div class="milestone-description">{{ milestone.description }}</div>
                  <div class="milestone-status">
                    <el-tag
                      :type="milestone.status === 'completed' ? 'success' : 'warning'"
                      size="small"
                    >
                      {{ milestone.status === 'completed' ? '已完成' : '进行中' }}
                    </el-tag>
                  </div>
                </div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </el-card>

        <!-- 项目团队 -->
        <el-card shadow="never" class="team-card">
          <template #header>
            <span>项目团队</span>
            <el-button
              type="text"
              size="small"
              @click="addTeamMember"
              v-if="hasPermission('project:write')"
            >
              <el-icon><UserFilled /></el-icon>
              添加成员
            </el-button>
          </template>

          <el-row :gutter="16">
            <el-col
              :xs="24"
              :sm="12"
              :md="8"
              :lg="6"
              v-for="member in project.team"
              :key="member.id"
            >
              <div class="team-member">
                <el-avatar :size="50" :src="member.avatar">
                  {{ member.name?.charAt(0) }}
                </el-avatar>
                <div class="member-info">
                  <div class="member-name">{{ member.name }}</div>
                  <div class="member-role">{{ member.role }}</div>
                </div>
              </div>
            </el-col>
          </el-row>
        </el-card>

        <!-- 项目文件 -->
        <el-card shadow="never" class="documents-card">
          <template #header>
            <span>项目文件</span>
            <el-button
              type="text"
              size="small"
              @click="uploadDocument"
              v-if="hasPermission('project:write')"
            >
              <el-icon><Upload /></el-icon>
              上传文件
            </el-button>
          </template>

          <el-table :data="project.documents" style="width: 100%">
            <el-table-column prop="name" label="文件名" min-width="200">
              <template #default="{ row }">
                <el-link type="primary" @click="downloadDocument(row)">
                  {{ row.name }}
                </el-link>
              </template>
            </el-table-column>
            <el-table-column prop="size" label="大小" width="120">
              <template #default="{ row }">
                {{ formatFileSize(row.size) }}
              </template>
            </el-table-column>
            <el-table-column prop="uploadDate" label="上传时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.uploadDate) }}
              </template>
            </el-table-column>
            <el-table-column prop="uploader" label="上传者" width="120" />
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button type="text" size="small" @click="downloadDocument(row)">
                  下载
                </el-button>
                <el-button
                  type="text"
                  size="small"
                  @click="deleteDocument(row)"
                  v-if="hasPermission('project:delete')"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  OfficeBuilding,
  ArrowLeft,
  Edit,
  Plus,
  UserFilled,
  Upload
} from '@element-plus/icons-vue'

// 响应式数据
const route = useRoute()
const router = useRouter()
const loading = ref(false)
const project = ref({
  id: null,
  name: '',
  type: '',
  status: '',
  description: '',
  progress: 0,
  startDate: '',
  expectedEndDate: '',
  actualEndDate: '',
  budget: 0,
  spent: 0,
  manager: '',
  milestones: [],
  team: [],
  documents: []
})

// 模拟项目数据
const mockProjectData = {
  1: {
    id: 1,
    name: '智慧农业大棚建设',
    type: 'infrastructure',
    description: '建设现代化智能农业大棚，提升农业生产效率。项目采用最新的物联网技术，实现温湿度自动控制、水肥一体化管理、病虫害智能监测等功能。',
    status: 'in_progress',
    progress: 65,
    startDate: '2024-10-01',
    expectedEndDate: '2025-03-31',
    actualEndDate: null,
    budget: 300000,
    spent: 195000,
    manager: '张工程师',
    milestones: [
      {
        name: '设计规划',
        description: '完成项目规划和设计方案',
        expectedDate: '2024-10-15',
        completedDate: '2024-10-14',
        status: 'completed'
      },
      {
        name: '场地准备',
        description: '完成场地清理和平整工作',
        expectedDate: '2024-11-20',
        completedDate: '2024-11-18',
        status: 'completed'
      },
      {
        name: '主体建设',
        description: '大棚主体结构建设',
        expectedDate: '2025-01-15',
        completedDate: null,
        status: 'in_progress'
      },
      {
        name: '设备安装',
        description: '智能设备安装和调试',
        expectedDate: '2025-02-28',
        completedDate: null,
        status: 'pending'
      }
    ],
    team: [
      {
        id: 1,
        name: '张工程师',
        role: '项目经理',
        avatar: ''
      },
      {
        id: 2,
        name: '李技术员',
        role: '技术负责人',
        avatar: ''
      },
      {
        id: 3,
        name: '王施工员',
        role: '施工负责人',
        avatar: ''
      }
    ],
    documents: [
      {
        id: 1,
        name: '项目立项申请书.pdf',
        size: 2048576,
        uploadDate: '2024-09-20',
        uploader: '张工程师'
      },
      {
        id: 2,
        name: '项目设计方案.docx',
        size: 1024000,
        uploadDate: '2024-10-08',
        uploader: '李技术员'
      },
      {
        id: 3,
        name: '施工图纸.dwg',
        size: 5120000,
        uploadDate: '2024-11-01',
        uploader: '王施工员'
      }
    ]
  },
  2: {
    id: 2,
    name: '村民技能培训计划',
    type: 'education',
    description: '组织村民参加电商、农业技术等技能培训，提升村民就业创业能力，增加农民收入。',
    status: 'planning',
    progress: 15,
    startDate: '2025-01-01',
    expectedEndDate: '2025-06-30',
    actualEndDate: null,
    budget: 50000,
    spent: 7500,
    manager: '李老师',
    milestones: [
      {
        name: '培训需求调研',
        description: '调研村民培训需求和意愿',
        expectedDate: '2025-01-15',
        completedDate: '2025-01-14',
        status: 'completed'
      },
      {
        name: '培训方案制定',
        description: '制定详细培训计划和课程安排',
        expectedDate: '2025-02-01',
        completedDate: null,
        status: 'in_progress'
      },
      {
        name: '培训实施',
        description: '开展各类技能培训',
        expectedDate: '2025-05-31',
        completedDate: null,
        status: 'pending'
      }
    ],
    team: [
      {
        id: 4,
        name: '李老师',
        role: '项目负责人',
        avatar: ''
      },
      {
        id: 5,
        name: '王培训师',
        role: '培训师',
        avatar: ''
      }
    ],
    documents: [
      {
        id: 4,
        name: '培训需求调研报告.xlsx',
        size: 512000,
        uploadDate: '2025-01-16',
        uploader: '李老师'
      }
    ]
  }
}

// 生命周期
onMounted(() => {
  loadProject()
})

// 方法
const loadProject = async () => {
  loading.value = true
  try {
    const projectId = route.params.id
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))

    const projectData = mockProjectData[projectId]
    if (projectData) {
      project.value = projectData
    } else {
      ElMessage.error('项目不存在')
      router.push('/projects')
    }
  } catch (error) {
    ElMessage.error('加载项目详情失败')
    console.error('Load project error:', error)
  } finally {
    loading.value = false
  }
}

const editProject = () => {
  router.push(`/projects/${project.value.id}/edit`)
}

const addMilestone = () => {
  ElMessage.info('添加里程碑功能开发中')
}

const addTeamMember = () => {
  ElMessage.info('添加团队成员功能开发中')
}

const uploadDocument = () => {
  ElMessage.info('上传文件功能开发中')
}

const downloadDocument = (document) => {
  ElMessage.info(`下载文件: ${document.name}`)
}

const deleteDocument = async (document) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除文件"${document.name}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    ElMessage.success('文件删除成功')
    // 这里应该调用删除API
  } catch (error) {
    // 用户取消删除
  }
}

// 辅助方法
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getTypeTagType = (type) => {
  const typeMap = {
    infrastructure: 'primary',
    education: 'success',
    welfare: 'warning'
  }
  return typeMap[type] || 'info'
}

const getTypeLabel = (type) => {
  const typeMap = {
    infrastructure: '基础设施',
    education: '教育培训',
    welfare: '福利保障'
  }
  return typeMap[type] || type
}

const getStatusTagType = (status) => {
  const statusMap = {
    planning: 'info',
    in_progress: 'warning',
    completed: 'success',
    suspended: 'danger'
  }
  return statusMap[status] || 'info'
}

const getStatusLabel = (status) => {
  const statusMap = {
    planning: '规划中',
    in_progress: '进行中',
    completed: '已完成',
    suspended: '暂停'
  }
  return statusMap[status] || status
}

const getProgressColor = (progress) => {
  if (progress < 30) return '#f56c6c'
  if (progress < 70) return '#e6a23c'
  return '#67c23a'
}

// 权限检查
const hasPermission = (permission) => {
  // 模拟权限检查
  return true
}
</script>

<style lang="scss" scoped>
.project-detail {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.page-header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0;
  height: auto;
  min-height: 80px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.title-section {
  flex: 1;
  min-width: 300px;
}

.page-title {
  display: flex;
  align-items: center;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 8px 0;

  .el-icon {
    margin-right: 8px;
    color: #409eff;
  }
}

.project-badges {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.action-section {
  display: flex;
  gap: 12px;
}

.page-main {
  padding: 24px;
}

.overview-card,
.description-card,
.milestone-card,
.team-card,
.documents-card {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}

.info-item {
  margin-bottom: 16px;
}

.info-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.info-value {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.progress-section {
  margin-top: 24px;
}

.progress-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.project-description {
  line-height: 1.6;
  color: #606266;
  margin: 0;
}

.milestone-content {
  .milestone-title {
    font-size: 16px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 8px;
  }

  .milestone-description {
    font-size: 14px;
    color: #606266;
    margin-bottom: 12px;
  }

  .milestone-status {
    text-align: right;
  }
}

.team-member {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 16px;
}

.member-info {
  margin-left: 12px;
}

.member-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.member-role {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: stretch;
    padding: 16px;
  }

  .action-section {
    justify-content: center;
  }

  .team-member {
    margin-bottom: 12px;
  }
}
</style>