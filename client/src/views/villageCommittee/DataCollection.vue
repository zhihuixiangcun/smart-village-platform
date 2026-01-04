<template>
  <div class="data-collection">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h2>
          <el-icon><FolderOpened /></el-icon>
          资料收集管理
        </h2>
        <p class="subtitle">收集和管理村民、农业生产、村务等各类资料</p>
      </div>
      <el-button type="primary" @click="showCreateDialog = true" size="large">
        <el-icon><Plus /></el-icon>
        新建收集任务
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-cards">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card total" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><Files /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalTasks }}</div>
              <div class="stat-label">收集任务</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card pending" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.pendingTasks }}</div>
              <div class="stat-label">进行中</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card completed" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.completedTasks }}</div>
              <div class="stat-label">已完成</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card files" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalFiles }}</div>
              <div class="stat-label">已收集文件</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选区域 -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filters" @submit.prevent="handleSearch">
        <el-form-item label="搜索">
          <el-input
            v-model="filters.search"
            placeholder="搜索任务名称或编号"
            clearable
            style="width: 240px"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="资料类型">
          <el-select v-model="filters.type" placeholder="选择类型" clearable style="width: 160px">
            <el-option label="村民信息" value="resident" />
            <el-option label="农业资料" value="agriculture" />
            <el-option label="财务票据" value="finance" />
            <el-option label="项目文档" value="project" />
            <el-option label="会议记录" value="meeting" />
            <el-option label="其他资料" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="选择状态" clearable style="width: 140px">
            <el-option label="进行中" value="pending" />
            <el-option label="已完成" value="completed" />
            <el-option label="已逾期" value="overdue" />
          </el-select>
        </el-form-item>
        <el-form-item label="截止时间">
          <el-date-picker
            v-model="filters.deadlineRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 280px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 收集任务列表 -->
    <el-card class="table-card" shadow="never">
      <el-table
        :data="taskList"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="taskCode" label="任务编号" width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tag type="info" size="small">{{ row.taskCode }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="任务标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="type" label="资料类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagColor(row.type)">
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="targetCount" label="目标数量" width="100" align="center">
          <template #default="{ row }">
            <span class="count-info">{{ row.collectedCount }} / {{ row.targetCount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="progress" label="进度" width="150" align="center">
          <template #default="{ row }">
            <el-progress
              :percentage="row.progress"
              :status="row.progress === 100 ? 'success' : undefined"
              :stroke-width="8"
            />
          </template>
        </el-table-column>
        <el-table-column prop="deadline" label="截止日期" width="120">
          <template #default="{ row }">
            <span :class="{ 'text-danger': isOverdue(row.deadline) && row.status !== 'completed' }">
              {{ formatDate(row.deadline) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="getPriorityTagType(row.priority)" size="small">
              {{ getPriorityLabel(row.priority) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                size="small"
                type="primary"
                link
                @click="handleView(row)"
              >
                <el-icon><View /></el-icon>
                查看
              </el-button>
              <el-button
                size="small"
                type="success"
                link
                @click="handleCollect(row)"
                :disabled="row.status === 'completed'"
              >
                <el-icon><Upload /></el-icon>
                收集
              </el-button>
              <el-button
                size="small"
                type="warning"
                link
                @click="handleEdit(row)"
                :disabled="row.status === 'completed'"
              >
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button
                size="small"
                type="danger"
                link
                @click="handleDelete(row)"
              >
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
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

    <!-- 批量操作栏 -->
    <div v-if="selectedTasks.length > 0" class="batch-actions">
      <el-card>
        <div class="batch-content">
          <div class="batch-info">
            已选择 <strong>{{ selectedTasks.length }}</strong> 个任务
          </div>
          <div class="batch-buttons">
            <el-button type="success" @click="handleBatchRemind">
              <el-icon><Bell /></el-icon>
              批量提醒
            </el-button>
            <el-button type="warning" @click="handleBatchExtend">
              <el-icon><Calendar /></el-icon>
              延长截止
            </el-button>
            <el-button type="danger" @click="handleBatchDelete">
              <el-icon><Delete /></el-icon>
              批量删除
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 创建/编辑任务对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingTask ? '编辑收集任务' : '创建收集任务'"
      width="700px"
      :before-close="handleCloseCreateDialog"
      destroy-on-close
    >
      <el-form
        ref="taskFormRef"
        :model="taskForm"
        :rules="taskFormRules"
        label-width="100px"
      >
        <el-form-item label="任务标题" prop="title">
          <el-input
            v-model="taskForm.title"
            placeholder="例如：2024年度村民健康档案收集"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="资料类型" prop="type">
          <el-select v-model="taskForm.type" placeholder="请选择资料类型" style="width: 100%">
            <el-option label="村民信息" value="resident">
              <div class="option-item">
                <el-icon><User /></el-icon>
                <span>村民信息</span>
              </div>
            </el-option>
            <el-option label="农业资料" value="agriculture">
              <div class="option-item">
                <el-icon><Grape /></el-icon>
                <span>农业资料</span>
              </div>
            </el-option>
            <el-option label="财务票据" value="finance">
              <div class="option-item">
                <el-icon><Money /></el-icon>
                <span>财务票据</span>
              </div>
            </el-option>
            <el-option label="项目文档" value="project">
              <div class="option-item">
                <el-icon><Folder /></el-icon>
                <span>项目文档</span>
              </div>
            </el-option>
            <el-option label="会议记录" value="meeting">
              <div class="option-item">
                <el-icon><Memo /></el-icon>
                <span>会议记录</span>
              </div>
            </el-option>
            <el-option label="其他资料" value="other">
              <div class="option-item">
                <el-icon><Document /></el-icon>
                <span>其他资料</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="任务描述" prop="description">
          <el-input
            v-model="taskForm.description"
            type="textarea"
            :rows="3"
            placeholder="请详细描述收集要求和内容..."
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="目标数量" prop="targetCount">
              <el-input-number
                v-model="taskForm.targetCount"
                :min="1"
                :max="1000"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="优先级" prop="priority">
              <el-select v-model="taskForm.priority" style="width: 100%">
                <el-option label="普通" value="normal" />
                <el-option label="重要" value="important" />
                <el-option label="紧急" value="urgent" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="截止日期" prop="deadline">
              <el-date-picker
                v-model="taskForm.deadline"
                type="datetime"
                placeholder="选择截止日期时间"
                style="width: 100%"
                :disabled-date="disabledDate"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="目标人群">
              <el-select v-model="taskForm.targetGroup" placeholder="选择目标人群" clearable style="width: 100%">
                <el-option label="全体村民" value="all" />
                <el-option label="党员" value="party_members" />
                <el-option label="低保户" value="low_income" />
                <el-option label="独居老人" value="elderly" />
                <el-option label="种养殖户" value="farmers" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="所需资料">
          <el-checkbox-group v-model="taskForm.requiredFiles">
            <el-checkbox label="身份证复印件" />
            <el-checkbox label="户口本复印件" />
            <el-checkbox label="相关证明材料" />
            <el-checkbox label="申请表格" />
            <el-checkbox label="照片" />
            <el-checkbox label="其他" />
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="通知方式">
          <el-checkbox-group v-model="taskForm.notificationMethods">
            <el-checkbox label="app">
              <el-icon><Cellphone /></el-icon>
              应用推送
            </el-checkbox>
            <el-checkbox label="sms">
              <el-icon><ChatLineRound /></el-icon>
              短信通知
            </el-checkbox>
            <el-checkbox label="phone">
              <el-icon><Phone /></el-icon>
              电话通知
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleCloseCreateDialog">取消</el-button>
          <el-button type="primary" @click="handleSubmitTask" :loading="submitting">
            {{ editingTask ? '更新' : '创建' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 任务详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="收集任务详情"
      width="900px"
      :before-close="handleCloseDetailDialog"
      destroy-on-close
    >
      <div v-if="currentTask" class="task-detail">
        <!-- 任务基本信息 -->
        <el-card shadow="never" class="detail-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">基本信息</span>
              <div class="card-actions">
                <el-tag :type="getStatusTagType(currentTask.status)" size="large">
                  {{ getStatusLabel(currentTask.status) }}
                </el-tag>
                <el-tag :type="getPriorityTagType(currentTask.priority)" size="large">
                  {{ getPriorityLabel(currentTask.priority) }}
                </el-tag>
              </div>
            </div>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="任务编号">
              <el-tag type="info">{{ currentTask.taskCode }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="资料类型">
              <el-tag :type="getTypeTagColor(currentTask.type)">
                {{ getTypeLabel(currentTask.type) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="任务标题" :span="2">
              {{ currentTask.title }}
            </el-descriptions-item>
            <el-descriptions-item label="任务描述" :span="2">
              {{ currentTask.description }}
            </el-descriptions-item>
            <el-descriptions-item label="目标数量">
              {{ currentTask.collectedCount }} / {{ currentTask.targetCount }}
            </el-descriptions-item>
            <el-descriptions-item label="完成进度">
              <el-progress
                :percentage="currentTask.progress"
                :status="currentTask.progress === 100 ? 'success' : undefined"
              />
            </el-descriptions-item>
            <el-descriptions-item label="截止日期">
              <span :class="{ 'text-danger': isOverdue(currentTask.deadline) && currentTask.status !== 'completed' }">
                {{ formatDateTime(currentTask.deadline) }}
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ formatDateTime(currentTask.createdAt) }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 已收集资料列表 -->
        <el-card shadow="never" class="detail-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">已收集资料 ({{ collectedFiles.length }})</span>
              <el-button type="primary" size="small" @click="handleCollect(currentTask)">
                <el-icon><Upload /></el-icon>
                添加资料
              </el-button>
            </div>
          </template>
          <el-table :data="collectedFiles" stripe border style="width: 100%">
            <el-table-column prop="residentName" label="提交人" width="120" />
            <el-table-column prop="fileName" label="文件名称" min-width="200" show-overflow-tooltip />
            <el-table-column prop="fileType" label="文件类型" width="100">
              <template #default="{ row }">
                <el-tag size="small">{{ row.fileType }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="fileSize" label="文件大小" width="100" />
            <el-table-column prop="submittedAt" label="提交时间" width="180">
              <template #default="{ row }">
                {{ formatDateTime(row.submittedAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button-group>
                  <el-button type="primary" size="small" link @click="handleDownloadFile(row)">
                    <el-icon><Download /></el-icon>
                    下载
                  </el-button>
                  <el-button type="danger" size="small" link @click="handleDeleteFile(row)">
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-button>
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </el-dialog>

    <!-- 收集资料对话框 -->
    <el-dialog
      v-model="showCollectDialog"
      title="收集资料"
      width="600px"
      :before-close="handleCloseCollectDialog"
      destroy-on-close
    >
      <el-form
        ref="collectFormRef"
        :model="collectForm"
        :rules="collectFormRules"
        label-width="100px"
      >
        <el-form-item label="选择村民" prop="residentId">
          <el-select
            v-model="collectForm.residentId"
            placeholder="选择或搜索村民"
            filterable
            remote
            :remote-method="searchResidents"
            :loading="searchingResidents"
            style="width: 100%"
          >
            <el-option
              v-for="resident in residentOptions"
              :key="resident.id"
              :label="resident.name"
              :value="resident.id"
            >
              <div class="resident-option">
                <span>{{ resident.name }}</span>
                <el-tag size="small" type="info">{{ resident.idCard }}</el-tag>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="上传文件" prop="files" required>
          <el-upload
            ref="uploadRef"
            :action="uploadAction"
            :headers="uploadHeaders"
            :on-success="handleUploadSuccess"
            :on-error="handleUploadError"
            :on-progress="handleUploadProgress"
            :before-upload="beforeUpload"
            :file-list="fileList"
            multiple
            drag
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">
              将文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持上传图片、PDF、Word、Excel等格式文件，单个文件不超过10MB
              </div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="备注说明">
          <el-input
            v-model="collectForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注说明（可选）"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleCloseCollectDialog">取消</el-button>
          <el-button type="primary" @click="handleSubmitCollect" :loading="submitting">
            提交
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  FolderOpened, Plus, Files, Clock, CircleCheck, Document,
  Search, Refresh, View, Upload, Edit, Delete, Bell, Calendar,
  User, Grape, Money, Folder, Memo, Cellphone, ChatLineRound,
  Phone, Download, UploadFilled
} from '@element-plus/icons-vue'
import { collectionApi } from '@/api/cadre'

// ==================== 响应式状态 ====================
const loading = ref(false)
const submitting = ref(false)
const searchingResidents = ref(false)

// 筛选条件
const filters = reactive({
  search: '',
  type: '',
  status: '',
  deadlineRange: null
})

// 分页信息
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 统计数据
const stats = reactive({
  totalTasks: 0,
  pendingTasks: 0,
  completedTasks: 0,
  totalFiles: 0
})

// 任务列表
const taskList = ref([])
const selectedTasks = ref([])

// 对话框状态
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const showCollectDialog = ref(false)
const editingTask = ref(null)
const currentTask = ref(null)

// 已收集文件列表
const collectedFiles = ref([])

// 村民选项
const residentOptions = ref([])
const fileList = ref([])
const uploadRef = ref(null)

// ==================== 表单数据 ====================
const taskForm = reactive({
  title: '',
  type: '',
  description: '',
  targetCount: 100,
  priority: 'normal',
  deadline: null,
  targetGroup: '',
  requiredFiles: [],
  notificationMethods: ['app']
})

const taskFormRules = {
  title: [
    { required: true, message: '请输入任务标题', trigger: 'blur' },
    { min: 5, max: 100, message: '标题长度在5到100个字符', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择资料类型', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请输入任务描述', trigger: 'blur' }
  ],
  targetCount: [
    { required: true, message: '请输入目标数量', trigger: 'blur' }
  ],
  deadline: [
    { required: true, message: '请选择截止日期', trigger: 'change' }
  ],
  priority: [
    { required: true, message: '请选择优先级', trigger: 'change' }
  ]
}

const collectForm = reactive({
  residentId: '',
  files: [],
  remark: ''
})

const collectFormRules = {
  residentId: [
    { required: true, message: '请选择村民', trigger: 'change' }
  ]
}

// 表单引用
const taskFormRef = ref(null)
const collectFormRef = ref(null)

// 上传配置
const uploadAction = computed(() => {
  return '/api/v1/cadre/collection/upload'
})

const uploadHeaders = computed(() => {
  return {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})

// ==================== 方法 ====================

/**
 * 加载收集任务列表
 */
const loadTaskList = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...filters
    }

    // 清理空值参数
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key]
      }
    })

    const response = await collectionApi.getCollectionTasks(params)

    if (response.success) {
      taskList.value = response.data.tasks || []
      pagination.total = response.pagination?.total || 0
    } else {
      ElMessage.error(response.message || '获取任务列表失败')
    }
  } catch (error) {
    console.error('加载任务列表失败:', error)
    // 使用模拟数据
    loadMockTasks()
  } finally {
    loading.value = false
  }
}

/**
 * 加载统计数据
 */
const loadStats = async () => {
  try {
    const response = await collectionApi.getCollectionStats()
    if (response.success) {
      Object.assign(stats, response.data)
    }
  } catch (error) {
    // 使用模拟数据
    stats.totalTasks = 15
    stats.pendingTasks = 8
    stats.completedTasks = 7
    stats.totalFiles = 234
  }
}

/**
 * 加载模拟数据
 */
const loadMockTasks = () => {
  taskList.value = [
    {
      _id: '1',
      taskCode: 'COL202401001',
      title: '2024年度村民健康档案收集',
      type: 'resident',
      description: '收集全村村民的健康档案信息，包括体检报告、疫苗接种记录等',
      targetCount: 1234,
      collectedCount: 856,
      progress: 69,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      priority: 'important',
      createdAt: new Date().toISOString()
    },
    {
      _id: '2',
      taskCode: 'COL202401002',
      title: '春季农业生产资料统计',
      type: 'agriculture',
      description: '统计全村春季农业生产所需的种子、化肥、农药等物资',
      targetCount: 486,
      collectedCount: 432,
      progress: 89,
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      priority: 'urgent',
      createdAt: new Date().toISOString()
    }
  ]
  pagination.total = taskList.value.length
}

/**
 * 搜索
 */
const handleSearch = () => {
  pagination.page = 1
  loadTaskList()
}

/**
 * 重置筛选
 */
const handleReset = () => {
  filters.search = ''
  filters.type = ''
  filters.status = ''
  filters.deadlineRange = null
  pagination.page = 1
  loadTaskList()
}

/**
 * 分页大小变化
 */
const handleSizeChange = (size) => {
  pagination.limit = size
  loadTaskList()
}

/**
 * 页码变化
 */
const handleCurrentChange = (page) => {
  pagination.page = page
  loadTaskList()
}

/**
 * 选择变化
 */
const handleSelectionChange = (selection) => {
  selectedTasks.value = selection
}

/**
 * 查看详情
 */
const handleView = async (row) => {
  currentTask.value = row
  showDetailDialog.value = true

  try {
    const response = await collectionApi.getCollectedFiles(row._id)
    if (response.success) {
      collectedFiles.value = response.data.files || []
    }
  } catch (error) {
    // 使用模拟数据
    collectedFiles.value = [
      {
        _id: '1',
        residentName: '张三',
        fileName: '身份证复印件.jpg',
        fileType: 'jpg',
        fileSize: '2.3 MB',
        submittedAt: new Date().toISOString()
      },
      {
        _id: '2',
        residentName: '李四',
        fileName: '体检报告.pdf',
        fileType: 'pdf',
        fileSize: '5.6 MB',
        submittedAt: new Date().toISOString()
      }
    ]
  }
}

/**
 * 收集资料
 */
const handleCollect = (row) => {
  currentTask.value = row
  showCollectDialog.value = true
  showDetailDialog.value = false
}

/**
 * 编辑任务
 */
const handleEdit = (row) => {
  editingTask.value = row
  Object.assign(taskForm, {
    title: row.title,
    type: row.type,
    description: row.description,
    targetCount: row.targetCount,
    priority: row.priority,
    deadline: new Date(row.deadline),
    targetGroup: row.targetGroup || '',
    requiredFiles: row.requiredFiles || [],
    notificationMethods: row.notificationMethods || ['app']
  })
  showCreateDialog.value = true
}

/**
 * 删除任务
 */
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除任务 "${row.title}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await collectionApi.deleteCollectionTask(row._id)
    if (response.success) {
      ElMessage.success('删除成功')
      loadTaskList()
      loadStats()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 提交任务
 */
const handleSubmitTask = async () => {
  if (!taskFormRef.value) return

  try {
    await taskFormRef.value.validate()

    submitting.value = true

    const data = { ...taskForm }
    if (data.deadline) {
      data.deadline = data.deadline.toISOString()
    }

    let response
    if (editingTask.value) {
      response = await collectionApi.updateCollectionTask(editingTask.value._id, data)
    } else {
      response = await collectionApi.createCollectionTask(data)
    }

    if (response.success) {
      ElMessage.success(editingTask.value ? '任务更新成功' : '任务创建成功')
      handleCloseCreateDialog()
      loadTaskList()
      loadStats()
    } else {
      ElMessage.error(response.message || '操作失败')
    }
  } catch (error) {
    if (error !== 'validation failed') {
      ElMessage.error('操作失败')
      console.error('提交任务失败:', error)
    }
  } finally {
    submitting.value = false
  }
}

/**
 * 关闭创建对话框
 */
const handleCloseCreateDialog = () => {
  showCreateDialog.value = false
  editingTask.value = null
  resetTaskForm()
}

/**
 * 重置任务表单
 */
const resetTaskForm = () => {
  Object.keys(taskForm).forEach(key => {
    if (key === 'targetCount') {
      taskForm[key] = 100
    } else if (key === 'priority') {
      taskForm[key] = 'normal'
    } else if (key === 'notificationMethods') {
      taskForm[key] = ['app']
    } else if (Array.isArray(taskForm[key])) {
      taskForm[key] = []
    } else {
      taskForm[key] = ''
    }
  })

  if (taskFormRef.value) {
    taskFormRef.value.resetFields()
  }
}

/**
 * 关闭详情对话框
 */
const handleCloseDetailDialog = () => {
  showDetailDialog.value = false
  currentTask.value = null
  collectedFiles.value = []
}

/**
 * 搜索村民
 */
const searchResidents = async (query) => {
  if (!query) {
    residentOptions.value = []
    return
  }

  searchingResidents.value = true
  try {
    const response = await collectionApi.searchResidents(query)
    if (response.success) {
      residentOptions.value = response.data.residents || []
    }
  } catch (error) {
    // 模拟数据
    residentOptions.value = [
      { id: '1', name: '张三', idCard: '330106199001011234' },
      { id: '2', name: '李四', idCard: '330106199002022345' },
      { id: '3', name: '王五', idCard: '330106199003033456' }
    ]
  } finally {
    searchingResidents.value = false
  }
}

/**
 * 上传前校验
 */
const beforeUpload = (file) => {
  const isValidType = ['image/jpeg', 'image/png', 'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ].includes(file.type)

  if (!isValidType) {
    ElMessage.error('只支持上传图片、PDF、Word、Excel格式的文件')
    return false
  }

  const isValidSize = file.size / 1024 / 1024 < 10
  if (!isValidSize) {
    ElMessage.error('文件大小不能超过10MB')
    return false
  }

  return true
}

/**
 * 上传成功
 */
const handleUploadSuccess = (response, file, fileList) => {
  if (response.success) {
    ElMessage.success('文件上传成功')
    collectForm.files.push(response.data.file)
  } else {
    ElMessage.error(response.message || '文件上传失败')
  }
}

/**
 * 上传失败
 */
const handleUploadError = (error) => {
  ElMessage.error('文件上传失败')
  console.error('上传错误:', error)
}

/**
 * 上传进度
 */
const handleUploadProgress = (event, file) => {
  console.log('上传进度:', event.percent)
}

/**
 * 提交收集
 */
const handleSubmitCollect = async () => {
  if (!collectFormRef.value) return

  try {
    await collectFormRef.value.validate()

    if (collectForm.files.length === 0) {
      ElMessage.warning('请至少上传一个文件')
      return
    }

    submitting.value = true

    const data = {
      taskId: currentTask.value._id,
      residentId: collectForm.residentId,
      files: collectForm.files,
      remark: collectForm.remark
    }

    const response = await collectionApi.submitCollectedFile(data)

    if (response.success) {
      ElMessage.success('资料收集成功')
      handleCloseCollectDialog()
      loadTaskList()
      loadStats()

      if (showDetailDialog.value) {
        handleView(currentTask.value)
      }
    } else {
      ElMessage.error(response.message || '提交失败')
    }
  } catch (error) {
    if (error !== 'validation failed') {
      ElMessage.error('提交失败')
      console.error('提交收集失败:', error)
    }
  } finally {
    submitting.value = false
  }
}

/**
 * 关闭收集对话框
 */
const handleCloseCollectDialog = () => {
  showCollectDialog.value = false
  collectForm.residentId = ''
  collectForm.files = []
  collectForm.remark = ''
  fileList.value = []

  if (collectFormRef.value) {
    collectFormRef.value.resetFields()
  }
}

/**
 * 下载文件
 */
const handleDownloadFile = (file) => {
  ElMessage.info('正在下载文件...')
  // 实现文件下载逻辑
}

/**
 * 删除文件
 */
const handleDeleteFile = async (file) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个文件吗？',
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await collectionApi.deleteCollectedFile(file._id)
    if (response.success) {
      ElMessage.success('删除成功')
      if (currentTask.value) {
        handleView(currentTask.value)
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 批量提醒
 */
const handleBatchRemind = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要提醒 ${selectedTasks.value.length} 个任务的提交人吗？`,
      '批量提醒',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    const ids = selectedTasks.value.map(t => t._id)
    const response = await collectionApi.batchRemind(ids)

    if (response.success) {
      ElMessage.success('提醒发送成功')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('提醒发送失败')
    }
  }
}

/**
 * 批量延长截止
 */
const handleBatchExtend = async () => {
  try {
    const { value } = await ElMessageBox.prompt(
      '请输入延长天数',
      '批量延长截止日期',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^\d+$/,
        inputErrorMessage: '请输入有效的天数'
      }
    )

    const ids = selectedTasks.value.map(t => t._id)
    const response = await collectionApi.batchExtendDeadline(ids, parseInt(value))

    if (response.success) {
      ElMessage.success('截止日期已延长')
      loadTaskList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

/**
 * 批量删除
 */
const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedTasks.value.length} 个任务吗？`,
      '批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const ids = selectedTasks.value.map(t => t._id)
    const response = await collectionApi.batchDeleteTasks(ids)

    if (response.success) {
      ElMessage.success('删除成功')
      loadTaskList()
      loadStats()
      selectedTasks.value = []
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 禁用过去的日期
 */
const disabledDate = (time) => {
  return time.getTime() < Date.now() - 24 * 60 * 60 * 1000
}

// ==================== 工具函数 ====================

/**
 * 格式化日期
 */
const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN')
}

/**
 * 格式化日期时间
 */
const formatDateTime = (dateTime) => {
  if (!dateTime) return ''
  return new Date(dateTime).toLocaleString('zh-CN')
}

/**
 * 判断是否逾期
 */
const isOverdue = (deadline) => {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

/**
 * 获取类型标签颜色
 */
const getTypeTagColor = (type) => {
  const colorMap = {
    resident: 'primary',
    agriculture: 'success',
    finance: 'warning',
    project: 'danger',
    meeting: 'info',
    other: ''
  }
  return colorMap[type] || ''
}

/**
 * 获取类型标签文本
 */
const getTypeLabel = (type) => {
  const labelMap = {
    resident: '村民信息',
    agriculture: '农业资料',
    finance: '财务票据',
    project: '项目文档',
    meeting: '会议记录',
    other: '其他资料'
  }
  return labelMap[type] || type
}

/**
 * 获取状态标签类型
 */
const getStatusTagType = (status) => {
  const typeMap = {
    pending: 'warning',
    completed: 'success',
    overdue: 'danger'
  }
  return typeMap[status] || 'info'
}

/**
 * 获取状态标签文本
 */
const getStatusLabel = (status) => {
  const labelMap = {
    pending: '进行中',
    completed: '已完成',
    overdue: '已逾期'
  }
  return labelMap[status] || status
}

/**
 * 获取优先级标签类型
 */
const getPriorityTagType = (priority) => {
  const typeMap = {
    normal: '',
    important: 'warning',
    urgent: 'danger'
  }
  return typeMap[priority] || ''
}

/**
 * 获取优先级标签文本
 */
const getPriorityLabel = (priority) => {
  const labelMap = {
    normal: '普通',
    important: '重要',
    urgent: '紧急'
  }
  return labelMap[priority] || priority
}

// ==================== 生命周期 ====================
onMounted(() => {
  loadTaskList()
  loadStats()
})
</script>

<style lang="scss" scoped>
.data-collection {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: 10px;
  }
}

// ==================== 页面头部 ====================
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;

  .header-content {
    h2 {
      margin: 0 0 8px 0;
      font-size: 24px;
      color: #303133;
      display: flex;
      align-items: center;
      gap: 12px;

      @media (max-width: 768px) {
        font-size: 20px;
      }
    }

    .subtitle {
      margin: 0;
      font-size: 14px;
      color: #909399;
    }
  }
}

// ==================== 统计卡片 ====================
.stats-cards {
  margin-bottom: 20px;

  .stat-card {
    height: 100px;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    :deep(.el-card__body) {
      padding: 20px;
      height: 100%;
    }

    .stat-content {
      display: flex;
      align-items: center;
      height: 100%;
      gap: 16px;

      .stat-icon {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;

        .stat-card.total & {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .stat-card.pending & {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
        }

        .stat-card.completed & {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          color: white;
        }

        .stat-card.files & {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          color: white;
        }
      }

      .stat-info {
        flex: 1;

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #303133;
          line-height: 1.2;

          @media (max-width: 768px) {
            font-size: 24px;
          }
        }

        .stat-label {
          font-size: 14px;
          color: #909399;
          margin-top: 4px;
        }
      }
    }
  }
}

// ==================== 筛选卡片 ====================
.filter-card {
  margin-bottom: 20px;
}

// ==================== 表格卡片 ====================
.table-card {
  :deep(.el-card__body) {
    padding: 0;
  }

  .count-info {
    font-weight: 600;
    color: #409eff;
  }

  .text-danger {
    color: #f56c6c;
    font-weight: 600;
  }

  .pagination-container {
    padding: 20px;
    display: flex;
    justify-content: flex-end;
  }
}

// ==================== 批量操作 ====================
.batch-actions {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: 90%;
  max-width: 800px;

  .batch-content {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 12px 20px;

    .batch-info {
      flex: 1;
      font-size: 14px;

      strong {
        color: #409eff;
        font-size: 18px;
        margin: 0 4px;
      }
    }

    .batch-buttons {
      display: flex;
      gap: 8px;
    }
  }
}

// ==================== 对话框样式 ====================
.dialog-footer {
  text-align: right;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.resident-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

// ==================== 任务详情 ====================
.task-detail {
  .detail-card {
    margin-bottom: 20px;

    &:last-child {
      margin-bottom: 0;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .card-title {
        font-size: 16px;
        font-weight: 600;
        color: #303133;
      }

      .card-actions {
        display: flex;
        gap: 8px;
      }
    }
  }
}

// ==================== 响应式优化 ====================
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;

    .el-button {
      width: 100%;
    }
  }

  .stats-cards {
    .el-col {
      margin-bottom: 10px;
    }
  }

  :deep(.el-form--inline .el-form-item) {
    display: block;
    margin-right: 0;
    margin-bottom: 12px;

    .el-form-item__content {
      width: 100% !important;
    }
  }

  .batch-actions {
    width: 95%;
    bottom: 10px;

    .batch-content {
      flex-direction: column;
      gap: 12px;

      .batch-buttons {
        width: 100%;
        flex-wrap: wrap;

        .el-button {
          flex: 1;
          min-width: 100px;
        }
      }
    }
  }
}

:deep(.el-table th) {
  background-color: #f5f7fa;
  color: #606266;
  font-weight: 600;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background-color: #fafafa;
}
</style>
