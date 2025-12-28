<template>
  <div class="document-management">
    <!-- 页面标题 -->
    <div class="page-header mb-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">村委工作文档管理</h1>
          <p class="text-gray-600 mt-2">管理工作报告、会议纪要、审批文件等工作文档</p>
        </div>
        <div class="flex gap-3">
          <el-button type="primary" @click="showUploadDialog">
            <el-icon><Upload /></el-icon>
            上传文档
          </el-button>
          <el-button @click="showStatistics">
            <el-icon><DataAnalysis /></el-icon>
            统计概览
          </el-button>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="mb-6">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number text-blue-600">{{ statistics.totalDocuments || 0 }}</div>
            <div class="stat-label">总文档数</div>
          </div>
          <el-icon class="stat-icon text-blue-400"><Document /></el-icon>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number text-green-600">{{ statistics.todayUploads || 0 }}</div>
            <div class="stat-label">今日上传</div>
          </div>
          <el-icon class="stat-icon text-green-400"><UploadFilled /></el-icon>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number text-orange-600">{{ statistics.totalViews || 0 }}</div>
            <div class="stat-label">总查看量</div>
          </div>
          <el-icon class="stat-icon text-orange-400"><View /></el-icon>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number text-purple-600">{{ formatFileSize(statistics.totalSize || 0) }}</div>
            <div class="stat-label">总文件大小</div>
          </div>
          <el-icon class="stat-icon text-purple-400"><FolderOpened /></el-icon>
        </el-card>
      </el-col>
    </el-row>

    <!-- 搜索和筛选区域 -->
    <el-card class="mb-6">
      <!-- 简单搜索 -->
      <div class="search-bar mb-4">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索文档标题、描述、关键词..."
          clearable
          @clear="handleSearch"
          @keyup.enter="handleSimpleSearch"
        >
          <template #append>
            <el-button @click="handleSimpleSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
          </template>
        </el-input>
        <el-button type="primary" text @click="showAdvancedSearch = !showAdvancedSearch" class="ml-2">
          {{ showAdvancedSearch ? '收起高级筛选' : '展开高级筛选' }}
          <el-icon class="ml-1">
            <ArrowUp v-if="showAdvancedSearch" />
            <ArrowDown v-else />
          </el-icon>
        </el-button>
      </div>

      <!-- 高级筛选面板 -->
      <el-collapse-transition>
        <div v-show="showAdvancedSearch" class="advanced-filters p-4 bg-gray-50 rounded">
          <el-form :model="advancedFilters" label-width="100px">
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="文档分类">
                  <el-select v-model="advancedFilters.documentCategory" placeholder="选择分类" clearable>
                    <el-option
                      v-for="cat in categoryOptions"
                      :key="cat.value"
                      :label="cat.label"
                      :value="cat.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="文档状态">
                  <el-select v-model="advancedFilters.status" placeholder="选择状态" clearable>
                    <el-option label="草稿" value="draft" />
                    <el-option label="已发布" value="published" />
                    <el-option label="已归档" value="archived" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="优先级">
                  <el-select v-model="advancedFilters.priority" placeholder="选择优先级" clearable>
                    <el-option label="紧急" value="urgent" />
                    <el-option label="重要" value="important" />
                    <el-option label="普通" value="normal" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="签发日期">
                  <el-date-picker
                    v-model="advancedFilters.dateRange"
                    type="daterange"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    value-format="YYYY-MM-DD"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="标签">
                  <el-select
                    v-model="advancedFilters.tags"
                    multiple
                    filterable
                    allow-create
                    placeholder="选择或输入标签"
                  >
                    <el-option
                      v-for="tag in popularTags"
                      :key="tag.tag"
                      :label="`${tag.tag} (${tag.count})`"
                      :value="tag.tag"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row class="mt-2">
              <el-col :span="24" class="text-right">
                <el-button @click="resetAdvancedFilters">重置</el-button>
                <el-button type="primary" @click="handleAdvancedSearch">搜索</el-button>
              </el-col>
            </el-row>
          </el-form>
        </div>
      </el-collapse-transition>
    </el-card>

    <!-- 文档列表 -->
    <el-card>
      <el-table
        v-loading="loading"
        :data="documentList"
        stripe
        @row-click="handleRowClick"
        style="cursor: pointer"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="documentInfo.title" label="文档标题" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <el-icon :color="getFileIconColor(row.fileInfo.mimeType)">
                <component :is="getFileIcon(row.fileInfo.mimeType)" />
              </el-icon>
              <span>{{ row.documentInfo.title }}</span>
              <el-tag v-if="row.documentInfo.priority === 'urgent'" type="danger" size="small">紧急</el-tag>
              <el-tag v-else-if="row.documentInfo.priority === 'important'" type="warning" size="small">重要</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="documentCategory" label="分类" width="120">
          <template #default="{ row }">
            <el-tag :type="getCategoryTagType(row.documentCategory)" size="small">
              {{ getCategoryLabel(row.documentCategory) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="committeeMemberId.name" label="创建人" width="100" />
        <el-table-column prop="documentInfo.issueDate" label="签发日期" width="120">
          <template #default="{ row }">
            {{ row.documentInfo.issueDate ? formatDate(row.documentInfo.issueDate) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="tags" label="标签" width="180">
          <template #default="{ row }">
            <el-tag
              v-for="(tag, index) in row.tags?.slice(0, 2)"
              :key="index"
              size="small"
              class="mr-1"
            >
              {{ tag }}
            </el-tag>
            <el-tag v-if="row.tags?.length > 2" size="small" type="info">
              +{{ row.tags.length - 2 }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="viewStatistics.totalViews" label="查看次数" width="100" align="center">
          <template #default="{ row }">
            <span class="text-gray-600">{{ row.viewStatistics?.totalViews || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="上传时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click.stop="handleView(row)">
              查看
            </el-button>
            <el-button type="success" size="small" link @click.stop="handleDownload(row)">
              下载
            </el-button>
            <el-dropdown @command="(cmd) => handleMenuCommand(cmd, row)" @click.stop>
              <el-button type="info" size="small" link>
                更多<el-icon class="ml-1"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit">编辑</el-dropdown-item>
                  <el-dropdown-item command="archive">归档</el-dropdown-item>
                  <el-dropdown-item command="history" divided>操作历史</el-dropdown-item>
                  <el-dropdown-item command="delete" class="text-red-500">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="mt-4 flex justify-between items-center">
        <span class="text-gray-500">
          共 {{ pagination.total }} 条记录
        </span>
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 上传对话框 -->
    <el-dialog
      v-model="uploadDialogVisible"
      title="上传文档"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="uploadForm" :rules="uploadRules" ref="uploadFormRef" label-width="100px">
        <el-form-item label="文档文件" prop="files" required>
          <el-upload
            ref="uploadRef"
            v-model:file-list="uploadFileList"
            :auto-upload="false"
            :limit="10"
            :on-exceed="handleExceed"
            :before-upload="beforeUpload"
            drag
            multiple
            class="w-full"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">
              将文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持上传 PDF、Word、Excel、图片等格式，单个文件不超过 50MB
              </div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="文档分类" prop="documentCategory" required>
          <el-select v-model="uploadForm.documentCategory" placeholder="选择分类">
            <el-option
              v-for="cat in categoryOptions"
              :key="cat.value"
              :label="cat.label"
              :value="cat.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="文档标题" prop="title" required>
          <el-input v-model="uploadForm.title" placeholder="输入文档标题" />
        </el-form-item>
        <el-form-item label="文号" prop="documentNumber">
          <el-input v-model="uploadForm.documentNumber" placeholder="例如：村发〔2025〕1号" />
        </el-form-item>
        <el-form-item label="签发日期" prop="issueDate">
          <el-date-picker
            v-model="uploadForm.issueDate"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-radio-group v-model="uploadForm.priority">
            <el-radio label="urgent">紧急</el-radio>
            <el-radio label="important">重要</el-radio>
            <el-radio label="normal">普通</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="uploadForm.description"
            type="textarea"
            :rows="3"
            placeholder="输入文档描述"
          />
        </el-form-item>
        <el-form-item label="标签" prop="tags">
          <el-select
            v-model="uploadForm.tags"
            multiple
            filterable
            allow-create
            placeholder="选择或输入标签"
          >
            <el-option
              v-for="tag in popularTags"
              :key="tag.tag"
              :label="`${tag.tag} (${tag.count})`"
              :value="tag.tag"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词" prop="keywords">
          <el-input v-model="uploadForm.keywords" placeholder="多个关键词用逗号分隔" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="uploading" @click="handleUpload">
          {{ uploadFileList.length > 1 ? '批量上传' : '上传' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 文档详情对话框 -->
    <DocumentDetail
      v-model:visible="detailDialogVisible"
      :document-id="currentDocumentId"
      @refresh="loadDocumentList"
      @edit="handleEdit"
    />

    <!-- 统计概览对话框 -->
    <el-dialog v-model="statisticsDialogVisible" title="文档统计概览" width="800px">
      <el-row :gutter="16" v-if="statisticsData">
        <el-col :span="12">
          <el-card class="mb-4">
            <template #header>
              <span>分类统计</span>
            </template>
            <div v-for="item in statisticsData.byCategory" :key="item._id" class="flex justify-between py-2">
              <span>{{ getCategoryLabel(item._id) }}</span>
              <el-tag>{{ item.count }}</el-tag>
            </div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card class="mb-4">
            <template #header>
              <span>状态统计</span>
            </template>
            <div v-for="item in statisticsData.byStatus" :key="item._id" class="flex justify-between py-2">
              <span>{{ getStatusLabel(item._id) }}</span>
              <el-tag>{{ item.count }}</el-tag>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Upload,
  DataAnalysis,
  Document,
  UploadFilled,
  View,
  FolderOpened,
  Search,
  ArrowDown,
  ArrowUp,
  Picture,
  DocumentCopy,
  Delete
} from '@element-plus/icons-vue'
import { committeeDocumentApi } from '@/api/committeeDocuments'
import { useUserStore } from '@/stores/user'
import DocumentDetail from './DocumentDetail.vue'

// 用户信息
const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const uploading = ref(false)
const showAdvancedSearch = ref(false)
const uploadDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const statisticsDialogVisible = ref(false)
const currentDocumentId = ref(null)

// 文档列表
const documentList = ref([])
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 统计数据
const statistics = reactive({
  totalDocuments: 0,
  todayUploads: 0,
  totalViews: 0,
  totalSize: 0
})

const statisticsData = ref(null)

// 搜索关键词
const searchKeyword = ref('')

// 高级筛选条件
const advancedFilters = reactive({
  documentCategory: '',
  status: '',
  priority: '',
  dateRange: null,
  tags: []
})

// 上传表单
const uploadFormRef = ref()
const uploadRef = ref()
const uploadFileList = ref([])
const uploadForm = reactive({
  documentCategory: '',
  title: '',
  documentNumber: '',
  issueDate: '',
  priority: 'normal',
  description: '',
  tags: [],
  keywords: ''
})

// 热门标签
const popularTags = ref([])

// 文档分类选项
const categoryOptions = [
  { label: '工作报告', value: 'work_report' },
  { label: '会议纪要', value: 'meeting_minutes' },
  { label: '审批文件', value: 'approval' },
  { label: '任务清单', value: 'task_list' },
  { label: '政策文件', value: 'policy' },
  { label: '财务报表', value: 'financial' },
  { label: '项目文档', value: 'project' },
  { label: '通知公告', value: 'notice' },
  { label: '合同协议', value: 'contract' },
  { label: '其他', value: 'other' }
]

// 上传表单验证规则
const uploadRules = {
  files: [{ required: true, message: '请选择文件', trigger: 'change' }],
  documentCategory: [{ required: true, message: '请选择文档分类', trigger: 'change' }],
  title: [{ required: true, message: '请输入文档标题', trigger: 'blur' }]
}

// 工具方法
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

const formatDateTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const getFileIcon = (mimeType) => {
  if (mimeType?.includes('image')) return Picture
  if (mimeType?.includes('pdf')) return Document
  return DocumentCopy
}

const getFileIconColor = (mimeType) => {
  if (mimeType?.includes('image')) return '#67c23a'
  if (mimeType?.includes('pdf')) return '#f56c6c'
  return '#409eff'
}

const getCategoryLabel = (category) => {
  return categoryOptions.find(c => c.value === category)?.label || category
}

const getCategoryTagType = (category) => {
  const typeMap = {
    work_report: 'primary',
    meeting_minutes: 'success',
    approval: 'warning',
    policy: 'danger',
    financial: 'info'
  }
  return typeMap[category] || ''
}

const getStatusLabel = (status) => {
  const labelMap = {
    draft: '草稿',
    published: '已发布',
    archived: '已归档'
  }
  return labelMap[status] || status
}

const getStatusTagType = (status) => {
  const typeMap = {
    draft: 'info',
    published: 'success',
    archived: 'warning'
  }
  return typeMap[status] || ''
}

// 数据加载方法
const loadDocumentList = async () => {
  try {
    loading.value = true

    const params = {
      page: pagination.page,
      limit: pagination.pageSize,
      villageId: userStore.villageId
    }

    // 应用筛选条件
    if (advancedFilters.documentCategory) {
      params.documentCategory = advancedFilters.documentCategory
    }
    if (advancedFilters.status) {
      params.status = advancedFilters.status
    }
    if (advancedFilters.priority) {
      params.priority = advancedFilters.priority
    }
    if (advancedFilters.dateRange?.length === 2) {
      params.startDate = advancedFilters.dateRange[0]
      params.endDate = advancedFilters.dateRange[1]
    }
    if (advancedFilters.tags?.length > 0) {
      params.tags = advancedFilters.tags
    }

    const response = await committeeDocumentApi.getList(params)

    documentList.value = response.documents || response.data || []
    pagination.total = response.total || 0

    // 更新统计
    updateStatistics()
  } catch (error) {
    ElMessage.error('获取文档列表失败')
  } finally {
    loading.value = false
  }
}

const loadStatistics = async () => {
  try {
    const params = { villageId: userStore.villageId }
    const response = await committeeDocumentApi.getStatistics(params)

    if (response.totals) {
      statistics.totalDocuments = response.totals.totalDocuments || 0
      statistics.totalViews = response.totals.totalViews || 0
      statistics.totalSize = response.totals.totalSize || 0
    }

    statisticsData.value = response
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

const loadPopularTags = async () => {
  try {
    const params = { villageId: userStore.villageId, limit: 20 }
    const response = await committeeDocumentApi.getPopularTags(params)
    popularTags.value = response || []
  } catch (error) {
    console.error('获取热门标签失败:', error)
  }
}

const updateStatistics = () => {
  statistics.totalDocuments = pagination.total
  // 今日上传需要从后端获取
}

// 事件处理方法
const handleSimpleSearch = () => {
  if (searchKeyword.value.trim()) {
    committeeDocumentApi.fullTextSearch({
      villageId: userStore.villageId,
      q: searchKeyword.value.trim(),
      page: pagination.page,
      limit: pagination.pageSize
    }).then(response => {
      documentList.value = response.documents || []
      pagination.total = response.total || 0
    }).catch(() => {
      ElMessage.error('搜索失败')
    })
  } else {
    loadDocumentList()
  }
}

const handleAdvancedSearch = () => {
  pagination.page = 1
  loadDocumentList()
}

const resetAdvancedFilters = () => {
  advancedFilters.documentCategory = ''
  advancedFilters.status = ''
  advancedFilters.priority = ''
  advancedFilters.dateRange = null
  advancedFilters.tags = []
  pagination.page = 1
  loadDocumentList()
}

const handleSearch = () => {
  loadDocumentList()
}

const handleRowClick = (row) => {
  handleView(row)
}

const handleView = (row) => {
  currentDocumentId.value = row._id || row.id
  detailDialogVisible.value = true
}

const handleDownload = async (row) => {
  try {
    const filename = row.fileInfo?.originalName || 'document'
    await committeeDocumentApi.download(row._id || row.id, filename)
  } catch (error) {
    ElMessage.error('下载失败')
  }
}

const handleEdit = (row) => {
  ElMessage.info('编辑功能开发中...')
}

const handleMenuCommand = (command, row) => {
  switch (command) {
    case 'edit':
      handleEdit(row)
      break
    case 'archive':
      handleArchive(row)
      break
    case 'history':
      currentDocumentId.value = row._id || row.id
      detailDialogVisible.value = true
      break
    case 'delete':
      handleDelete(row)
      break
  }
}

const handleArchive = (row) => {
  ElMessageBox.confirm(`确定要归档文档 "${row.documentInfo.title}" 吗？`, '归档确认', {
    type: 'warning'
  }).then(async () => {
    try {
      await committeeDocumentApi.archive(row._id || row.id, { reason: '手动归档' })
      ElMessage.success('归档成功')
      loadDocumentList()
    } catch (error) {
      ElMessage.error('归档失败')
    }
  })
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除文档 "${row.documentInfo.title}" 吗？此操作不可恢复！`, '删除确认', {
    type: 'warning'
  }).then(async () => {
    try {
      await committeeDocumentApi.delete(row._id || row.id)
      ElMessage.success('删除成功')
      loadDocumentList()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  })
}

const handlePageChange = (page) => {
  pagination.page = page
  loadDocumentList()
}

const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.page = 1
  loadDocumentList()
}

const showUploadDialog = () => {
  uploadDialogVisible.value = true
}

const showStatistics = () => {
  statisticsDialogVisible.value = true
}

const beforeUpload = (file) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ]

  const isAllowedType = allowedTypes.includes(file.type)
  const isLt50M = file.size / 1024 / 1024 < 50

  if (!isAllowedType) {
    ElMessage.error('不支持的文件类型！')
    return false
  }
  if (!isLt50M) {
    ElMessage.error('文件大小不能超过 50MB！')
    return false
  }

  return true
}

const handleExceed = () => {
  ElMessage.warning('最多只能上传 10 个文件')
}

const handleUpload = async () => {
  if (uploadFileList.value.length === 0) {
    ElMessage.warning('请选择要上传的文件')
    return
  }

  if (!uploadForm.documentCategory) {
    ElMessage.warning('请选择文档分类')
    return
  }

  if (!uploadForm.title && uploadFileList.value.length === 1) {
    ElMessage.warning('请输入文档标题')
    return
  }

  try {
    uploading.value = true

    const formData = new FormData()

    // 添加文件
    for (const file of uploadFileList.value) {
      formData.append('files', file.raw)
    }

    // 添加表单数据
    formData.append('villageId', userStore.villageId)
    formData.append('committeeMemberId', userStore.committeeMemberId || userStore.id)
    formData.append('documentCategory', uploadForm.documentCategory)

    if (uploadForm.title) {
      formData.append('title', uploadForm.title)
    }
    if (uploadForm.documentNumber) {
      formData.append('documentNumber', uploadForm.documentNumber)
    }
    if (uploadForm.issueDate) {
      formData.append('issueDate', uploadForm.issueDate)
    }
    if (uploadForm.priority) {
      formData.append('priority', uploadForm.priority)
    }
    if (uploadForm.description) {
      formData.append('description', uploadForm.description)
    }
    if (uploadForm.tags?.length > 0) {
      formData.append('tags', uploadForm.tags.join(','))
    }
    if (uploadForm.keywords) {
      formData.append('keywords', uploadForm.keywords)
    }

    // 根据文件数量选择上传方式
    const uploadFunc = uploadFileList.value.length > 1
      ? committeeDocumentApi.batchUpload
      : committeeDocumentApi.upload

    await uploadFunc(formData)

    ElMessage.success(uploadFileList.value.length > 1 ? '批量上传成功' : '上传成功')
    uploadDialogVisible.value = false
    resetUploadForm()
    loadDocumentList()
    loadStatistics()
  } catch (error) {
    ElMessage.error('上传失败')
  } finally {
    uploading.value = false
  }
}

const resetUploadForm = () => {
  uploadFileList.value = []
  uploadForm.documentCategory = ''
  uploadForm.title = ''
  uploadForm.documentNumber = ''
  uploadForm.issueDate = ''
  uploadForm.priority = 'normal'
  uploadForm.description = ''
  uploadForm.tags = []
  uploadForm.keywords = ''
}

// 生命周期
onMounted(() => {
  loadDocumentList()
  loadStatistics()
  loadPopularTags()
})
</script>

<style scoped>
.document-management {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
}

.page-header {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-card {
  position: relative;
  overflow: hidden;
}

.stat-content {
  position: relative;
  z-index: 2;
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  line-height: 1;
}

.stat-label {
  margin-top: 8px;
  color: #666;
  font-size: 14px;
}

.stat-icon {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 2.5rem;
  opacity: 0.3;
  z-index: 1;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.advanced-filters {
  margin-top: 16px;
}

:deep(.el-upload-dragger) {
  width: 100%;
}
</style>
