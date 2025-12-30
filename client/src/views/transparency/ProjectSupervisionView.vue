<template>
  <div class="project-supervision-view">
    <div class="page-header">
      <h2>
        <el-icon><Checked /></el-icon>
        工程项目监督
      </h2>
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon>
          创建项目
        </el-button>
        <el-button @click="showMyReportsDialog = true">
          <el-icon><CameraFilled /></el-icon>
          我的监督记录
        </el-button>
      </div>
    </div>

    <!-- 筛选条件 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="项目状态">
          <el-select v-model="filters.status" placeholder="全部状态" clearable @change="fetchProjects">
            <el-option label="规划中" value="planning" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="已完成" value="completed" />
            <el-option label="已停工" value="suspended" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目类型">
          <el-select v-model="filters.type" placeholder="全部类型" clearable @change="fetchProjects">
            <el-option label="基础设施" value="infrastructure" />
            <el-option label="水利工程" value="water_conservancy" />
            <el-option label="道路建设" value="road" />
            <el-option label="公共设施" value="public_facility" />
            <el-option label="环境整治" value="environmental" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-form>

    <!-- 项目列表 -->
    <el-row :gutter="20" class="projects-list">
      <el-col :span="8" v-for="project in projects" :key="project._id">
        <el-card class="project-card" @click="viewProject(project)">
          <div class="project-status" :class="project.status">
            {{ getStatusLabel(project.status) }}
          </div>
          <div class="project-image" v-if="project.beforePhoto">
            <img :src="project.beforePhoto" alt="项目图片" />
          </div>
          <div class="project-image placeholder" v-else>
            <el-icon><Picture /></el-icon>
          </div>
          <div class="project-info">
            <h3>{{ project.name }}</h3>
            <el-tag size="small" type="info">{{ getTypeLabel(project.type) }}</el-tag>
          </div>
          <div class="project-meta">
            <div class="meta-item">
              <el-icon><Wallet /></el-icon>
              <span>预算：{{ formatMoney(project.budget) }}</span>
            </div>
            <div class="meta-item">
              <el-icon><Calendar /></el-icon>
              <span>{{ formatDate(project.startDate) }} - {{ formatDate(project.endDate) }}</span>
            </div>
            <div class="meta-item">
              <el-icon><User /></el-icon>
              <span>负责人：{{ project.manager?.name || '-' }}</span>
            </div>
          </div>
          <div class="project-progress">
            <div class="progress-label">
              <span>进度</span>
              <span>{{ project.progress || 0 }}%</span>
            </div>
            <el-progress :percentage="project.progress || 0" :stroke-width="8" />
          </div>
          <div class="project-actions">
            <el-button type="primary" size="small" @click.stop="reportProgress(project)">
              <el-icon><CameraFilled /></el-icon>
              上报进度
            </el-button>
            <el-button type="danger" size="small" @click.stop="reportIssue(project)">
              <el-icon><WarningFilled /></el-icon>
              问题反馈
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 创建项目对话框 -->
    <el-dialog v-model="showCreateDialog" title="创建工程项目" width="700px" @close="resetCreateForm">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="100px">
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="createForm.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目类型" prop="type">
          <el-select v-model="createForm.type" placeholder="请选择项目类型">
            <el-option label="基础设施" value="infrastructure" />
            <el-option label="水利工程" value="water_conservancy" />
            <el-option label="道路建设" value="road" />
            <el-option label="公共设施" value="public_facility" />
            <el-option label="环境整治" value="environmental" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目描述" prop="description">
          <el-input v-model="createForm.description" type="textarea" :rows="3" placeholder="请输入项目描述" />
        </el-form-item>
        <el-form-item label="预算" prop="budget">
          <el-input-number v-model="createForm.budget" :min="0" :precision="2" />
          <span class="unit-label">元</span>
        </el-form-item>
        <el-form-item label="工期" prop="dates">
          <el-date-picker
            v-model="createForm.dates"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="施工方" prop="contractorName">
          <el-input v-model="createForm.contractorName" placeholder="请输入施工单位名称" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="createForm.contractorPhone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="施工前照片">
          <el-upload
            :show-file-list="true"
            :auto-upload="false"
            :on-change="handleBeforePhotoChange"
            accept="image/*"
            drag
          >
            <el-icon class="upload-icon"><Plus /></el-icon>
            <div class="upload-text">
              拖拽或点击上传施工前照片
            </div>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createProject" :loading="creating">创建</el-button>
      </template>
    </el-dialog>

    <!-- 上报进度对话框 -->
    <el-dialog v-model="showReportDialog" title="上报项目进度" width="600px" @close="resetReportForm">
      <el-form ref="reportFormRef" :model="reportForm" :rules="reportRules" label-width="100px">
        <el-form-item label="当前项目">
          <el-input v-model="currentProject?.name" disabled />
        </el-form-item>
        <el-form-item label="进度描述" prop="description">
          <el-input v-model="reportForm.description" type="textarea" :rows="3" placeholder="请描述当前工程进度" />
        </el-form-item>
        <el-form-item label="现场照片" prop="photo">
          <el-upload
            :show-file-list="true"
            :auto-upload="false"
            :on-change="handleProgressPhotoChange"
            accept="image/*"
            drag
          >
            <el-icon class="upload-icon"><CameraFilled /></el-icon>
            <div class="upload-text">
              拖拽或点击上传现场照片
            </div>
          </el-upload>
        </el-form-item>
        <el-form-item label="发现问题">
          <el-checkbox-group v-model="reportForm.issues">
            <el-checkbox label="delay">进度滞后</el-checkbox>
            <el-checkbox label="quality">质量问题</el-checkbox>
            <el-checkbox label="safety">安全隐患</el-checkbox>
            <el-checkbox label="budget">预算超支</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="问题说明" v-if="reportForm.issues.length > 0">
          <el-input v-model="reportForm.issueDescription" type="textarea" :rows="3" placeholder="请详细描述发现的问题" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showReportDialog = false">取消</el-button>
        <el-button type="primary" @click="submitProgress" :loading="submitting">提交</el-button>
      </template>
    </el-dialog>

    <!-- 问题反馈对话框 -->
    <el-dialog v-model="showFeedbackDialog" title="质量问题反馈" width="600px" @close="resetFeedbackForm">
      <el-form ref="feedbackFormRef" :model="feedbackForm" :rules="feedbackRules" label-width="100px">
        <el-form-item label="当前项目">
          <el-input v-model="currentProject?.name" disabled />
        </el-form-item>
        <el-form-item label="问题描述" prop="description">
          <el-input v-model="feedbackForm.description" type="textarea" :rows="4" placeholder="请详细描述质量问题" />
        </el-form-item>
        <el-form-item label="严重程度" prop="severity">
          <el-radio-group v-model="feedbackForm.severity">
            <el-radio label="low">轻微</el-radio>
            <el-radio label="medium">一般</el-radio>
            <el-radio label="high">严重</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="改进建议">
          <el-input v-model="feedbackForm.suggestions" type="textarea" :rows="3" placeholder="请提出改进建议" />
        </el-form-item>
        <el-form-item label="现场照片">
          <el-upload
            :show-file-list="true"
            :auto-upload="false"
            :on-change="handleFeedbackPhotoChange"
            accept="image/*"
            drag
          >
            <el-icon class="upload-icon"><CameraFilled /></el-icon>
            <div class="upload-text">
              拖拽或点击上传问题照片
            </div>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showFeedbackDialog = false">取消</el-button>
        <el-button type="primary" @click="submitFeedback" :loading="submitting">提交</el-button>
      </template>
    </el-dialog>

    <!-- 项目详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="项目详情" width="800px">
      <div v-if="currentProject" class="project-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="项目名称" :span="2">{{ currentProject.name }}</el-descriptions-item>
          <el-descriptions-item label="项目类型">
            {{ getTypeLabel(currentProject.type) }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentProject.status)">
              {{ getStatusLabel(currentProject.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="预算">
            {{ formatMoney(currentProject.budget) }}
          </el-descriptions-item>
          <el-descriptions-item label="进度">
            {{ currentProject.progress || 0 }}%
          </el-descriptions-item>
          <el-descriptions-item label="工期" :span="2">
            {{ formatDate(currentProject.startDate) }} - {{ formatDate(currentProject.endDate) }}
          </el-descriptions-item>
          <el-descriptions-item label="施工方" :span="2">
            {{ currentProject.contractor?.name || '-' }}
            ({{ currentProject.contractor?.phone || '-' }})
          </el-descriptions-item>
          <el-descriptions-item label="项目描述" :span="2">
            {{ currentProject.description }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 进度记录 -->
        <div class="progress-records" v-if="currentProject.progressRecords?.length">
          <h4>进度记录</h4>
          <el-timeline>
            <el-timeline-item
              v-for="record in currentProject.progressRecords"
              :key="record._id"
              :timestamp="formatDate(record.reportDate)"
            >
              <div class="record-content">
                <p>{{ record.description }}</p>
                <el-tag v-if="record.issues?.length" type="danger" size="small">
                  发现问题: {{ record.issues.length }}项
                </el-tag>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Checked, Plus, CameraFilled, WarningFilled, Picture, Wallet, Calendar, User } from '@element-plus/icons-vue'
import transparencyApi from '@/api/transparency'

const loading = ref(false)
const creating = ref(false)
const submitting = ref(false)
const projects = ref([])
const currentProject = ref(null)
const showCreateDialog = ref(false)
const showReportDialog = ref(false)
const showFeedbackDialog = ref(false)
const showDetailDialog = ref(false)
const showMyReportsDialog = ref(false)
const createFormRef = ref(null)
const reportFormRef = ref(null)
const feedbackFormRef = ref(null)

const filters = reactive({
  status: '',
  type: ''
})

const createForm = reactive({
  name: '',
  type: '',
  description: '',
  budget: 0,
  dates: [],
  contractorName: '',
  contractorPhone: '',
  beforePhoto: null
})

const reportForm = reactive({
  description: '',
  photo: null,
  issues: [],
  issueDescription: ''
})

const feedbackForm = reactive({
  description: '',
  severity: 'medium',
  suggestions: '',
  photo: null
})

const createRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择项目类型', trigger: 'change' }],
  description: [{ required: true, message: '请输入项目描述', trigger: 'blur' }],
  budget: [{ required: true, message: '请输入预算', trigger: 'blur' }],
  dates: [{ required: true, message: '请选择工期', trigger: 'change' }],
  contractorName: [{ required: true, message: '请输入施工方名称', trigger: 'blur' }]
}

const reportRules = {
  description: [{ required: true, message: '请描述当前工程进度', trigger: 'blur' }],
  photo: [{ required: true, message: '请上传现场照片', trigger: 'change' }]
}

const feedbackRules = {
  description: [{ required: true, message: '请描述质量问题', trigger: 'blur' }],
  severity: [{ required: true, message: '请选择严重程度', trigger: 'change' }]
}

const getStatusLabel = (status) => {
  const labels = {
    planning: '规划中',
    in_progress: '进行中',
    completed: '已完成',
    suspended: '已停工'
  }
  return labels[status] || status
}

const getStatusType = (status) => {
  const types = {
    planning: 'info',
    in_progress: 'primary',
    completed: 'success',
    suspended: 'danger'
  }
  return types[status] || 'info'
}

const getTypeLabel = (type) => {
  const types = {
    infrastructure: '基础设施',
    water_conservancy: '水利工程',
    road: '道路建设',
    public_facility: '公共设施',
    environmental: '环境整治',
    other: '其他'
  }
  return types[type] || type
}

const formatMoney = (amount) => {
  return `¥${amount.toFixed(2)}`
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

const fetchProjects = async () => {
  loading.value = true
  try {
    const { data } = await transparencyApi.getProjects(filters)
    if (data.success) {
      projects.value = data.data
    }
  } catch (error) {
    ElMessage.error('获取项目列表失败')
  } finally {
    loading.value = false
  }
}

const viewProject = async (project) => {
  currentProject.value = project
  // 获取项目详情包括进度记录
  showDetailDialog.value = true
}

const reportProgress = (project) => {
  currentProject.value = project
  showReportDialog.value = true
}

const reportIssue = (project) => {
  currentProject.value = project
  showFeedbackDialog.value = true
}

const createProject = async () => {
  await createFormRef.value.validate(async (valid) => {
    if (valid) {
      creating.value = true
      try {
        const formData = {
          ...createForm,
          startDate: createForm.dates[0],
          endDate: createForm.dates[1]
        }
        const { data } = await transparencyApi.createProject(formData)
        if (data.success) {
          ElMessage.success('项目创建成功')
          showCreateDialog.value = false
          resetCreateForm()
          fetchProjects()
        }
      } catch (error) {
        ElMessage.error('创建项目失败')
      } finally {
        creating.value = false
      }
    }
  })
}

const submitProgress = async () => {
  await reportFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        const issues = reportForm.issues.map(issue => ({
          type: issue,
          description: reportForm.issueDescription
        }))
        const { data } = await transparencyApi.reportProjectProgress(currentProject.value._id, {
          description: reportForm.description,
          issues
        })
        if (data.success) {
          ElMessage.success('进度上报成功')
          showReportDialog.value = false
          resetReportForm()
          fetchProjects()
        }
      } catch (error) {
        ElMessage.error('上报进度失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

const submitFeedback = async () => {
  await feedbackFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        const { data } = await transparencyApi.submitQualityFeedback(currentProject.value._id, feedbackForm)
        if (data.success) {
          ElMessage.success('反馈提交成功')
          showFeedbackDialog.value = false
          resetFeedbackForm()
        }
      } catch (error) {
        ElMessage.error('提交反馈失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

const handleBeforePhotoChange = (file) => {
  createForm.beforePhoto = file.raw
}

const handleProgressPhotoChange = (file) => {
  reportForm.photo = file.raw
}

const handleFeedbackPhotoChange = (file) => {
  feedbackForm.photo = file.raw
}

const resetCreateForm = () => {
  Object.assign(createForm, {
    name: '',
    type: '',
    description: '',
    budget: 0,
    dates: [],
    contractorName: '',
    contractorPhone: '',
    beforePhoto: null
  })
  createFormRef.value?.resetFields()
}

const resetReportForm = () => {
  Object.assign(reportForm, {
    description: '',
    photo: null,
    issues: [],
    issueDescription: ''
  })
  reportFormRef.value?.resetFields()
}

const resetFeedbackForm = () => {
  Object.assign(feedbackForm, {
    description: '',
    severity: 'medium',
    suggestions: '',
    photo: null
  })
  feedbackFormRef.value?.resetFields()
}

onMounted(() => {
  fetchProjects()
})
</script>

<style scoped>
.project-supervision-view {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-form {
  margin: 0;
}

.projects-list {
  min-height: 400px;
}

.project-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.project-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.project-status {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  color: white;
  z-index: 1;
}

.project-status.planning {
  background: #909399;
}

.project-status.in_progress {
  background: #409eff;
}

.project-status.completed {
  background: #67c23a;
}

.project-status.suspended {
  background: #f56c6c;
}

.project-image {
  width: 100%;
  height: 160px;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 15px;
}

.project-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.project-image.placeholder {
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  color: #c0c4cc;
}

.project-info h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-meta {
  margin: 15px 0;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
  margin-bottom: 6px;
}

.project-progress {
  margin: 15px 0;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}

.project-actions {
  display: flex;
  gap: 10px;
}

.unit-label {
  margin-left: 8px;
  color: #909399;
}

.upload-icon {
  font-size: 48px;
  color: #409eff;
}

.upload-text {
  margin-top: 10px;
  color: #606266;
}

.project-detail {
  padding: 10px 0;
}

.progress-records {
  margin-top: 30px;
}

.progress-records h4 {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: #303133;
}

.record-content p {
  margin: 0 0 8px 0;
}
</style>
