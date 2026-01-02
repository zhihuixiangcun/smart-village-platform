<template>
  <div class="document-wallet">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>我的证件包</h1>
      <p>管理您的各类证件信息，支持在线查看和分享</p>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon id-card">📇</div>
          <div class="stat-content">
            <div class="stat-label">身份证</div>
            <div class="stat-value">{{ stats.idCard || 0 }}</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon household">📋</div>
          <div class="stat-content">
            <div class="stat-label">户口本</div>
            <div class="stat-value">{{ stats.household || 0 }}</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon driving">🚗</div>
          <div class="stat-content">
            <div class="stat-label">驾驶证</div>
            <div class="stat-value">{{ stats.driving || 0 }}</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon other">📄</div>
          <div class="stat-content">
            <div class="stat-label">其他</div>
            <div class="stat-value">{{ stats.other || 0 }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button-group>
        <el-button type="primary" icon="Upload" @click="showUploadDialog">
          上传证件
        </el-button>
        <el-button icon="Refresh" @click="loadDocuments">
          刷新
        </el-button>
      </el-button-group>
      <el-input
        v-model="searchQuery"
        placeholder="搜索证件..."
        prefix-icon="Search"
        style="width: 250px; margin-left: auto;"
        clearable
      />
    </div>

    <!-- 分类标签 -->
    <el-tabs v-model="activeCategory" @tab-change="handleTabChange">
      <el-tab-pane label="全部" name="all">
        <el-badge :value="filteredList.length" class="tab-badge" />
      </el-tab-pane>
      <el-tab-pane label="身份证" name="id_card">
        <el-badge :value="getCountByType('id_card')" class="tab-badge" />
      </el-tab-pane>
      <el-tab-pane label="户口本" name="household">
        <el-badge :value="getCountByType('household')" class="tab-badge" />
      </el-tab-pane>
      <el-tab-pane label="驾驶证" name="driving">
        <el-badge :value="getCountByType('driving')" class="tab-badge" />
      </el-tab-pane>
      <el-tab-pane label="其他" name="other">
        <el-badge :value="getCountByType('other')" class="tab-badge" />
      </el-tab-pane>
    </el-tabs>

    <!-- 证件列表 -->
    <div class="document-list">
      <el-empty v-if="filteredList.length === 0" description="暂无证件信息" />

      <el-row v-else :gutter="16">
        <el-col
          v-for="doc in filteredList"
          :key="doc._id"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
        >
          <el-card class="document-card" :class="{ 'expiring': isExpiring(doc) }">
            <div class="card-header">
              <div class="doc-type">
                <el-icon class="type-icon">
                  <Document />
                </el-icon>
                {{ getDocTypeName(doc.type) }}
              </div>
              <el-dropdown @command="handleCardAction($event, doc)">
                <el-button link>
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="view">查看</el-dropdown-item>
                    <el-dropdown-item command="share">分享</el-dropdown-item>
                    <el-dropdown-item command="download">下载</el-dropdown-item>
                    <el-dropdown-item command="edit">编辑</el-dropdown-item>
                    <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>

            <div class="card-body" @click="viewDocument(doc)">
              <div class="doc-preview">
                <el-image
                  v-if="doc.previewUrl"
                  :src="doc.previewUrl"
                  fit="cover"
                  class="preview-image"
                >
                  <template #error>
                    <div class="image-slot">
                      <el-icon><PictureFilled /></el-icon>
                    </div>
                  </template>
                </el-image>
                <div v-else class="preview-placeholder">
                  <el-icon><Document /></el-icon>
                </div>
              </div>

              <div class="doc-info">
                <h3 class="doc-name">{{ doc.name }}</h3>
                <div class="doc-meta">
                  <span v-if="doc.idNumber" class="meta-item">
                    <el-icon><Postcard /></el-icon>
                    {{ formatIdNumber(doc.idNumber) }}
                  </span>
                  <span class="meta-item">
                    <el-icon><Calendar /></el-icon>
                    {{ formatDate(doc.expiryDate) }}
                  </span>
                </div>
                <div v-if="isExpiring(doc)" class="expiry-alert">
                  <el-icon class="alert-icon"><WarningFilled /></el-icon>
                  {{ getExpiryText(doc) }}
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 上传对话框 -->
    <el-dialog
      v-model="uploadDialogVisible"
      title="上传证件"
      width="500px"
      @close="resetUploadForm"
    >
      <el-form ref="uploadForm" :model="uploadForm" :rules="uploadRules" label-width="100px">
        <el-form-item label="证件类型" prop="type">
          <el-select v-model="uploadForm.type" placeholder="请选择证件类型">
            <el-option label="身份证" value="id_card" />
            <el-option label="户口本" value="household" />
            <el-option label="驾驶证" value="driving" />
            <el-option label="护照" value="passport" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>

        <el-form-item label="证件名称" prop="name">
          <el-input v-model="uploadForm.name" placeholder="请输入证件名称" />
        </el-form-item>

        <el-form-item label="证件号码" prop="idNumber">
          <el-input v-model="uploadForm.idNumber" placeholder="请输入证件号码" />
        </el-form-item>

        <el-form-item label="有效期至" prop="expiryDate">
          <el-date-picker
            v-model="uploadForm.expiryDate"
            type="date"
            placeholder="选择日期"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item label="证件文件" prop="file">
          <el-upload
            ref="upload"
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
            :on-exceed="handleExceed"
            accept="image/*,.pdf"
            drag
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">
              将文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持jpg/png图片或pdf文件，文件大小不超过10MB
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="uploading" @click="handleUpload">
          上传
        </el-button>
      </template>
    </el-dialog>

    <!-- 查看证件对话框 -->
    <el-dialog
      v-model="viewDialogVisible"
      :title="currentDocument?.name || '证件详情'"
      width="600px"
    >
      <div v-if="currentDocument" class="document-detail">
        <div class="detail-image">
          <el-image
            v-if="currentDocument.fileUrl"
            :src="currentDocument.fileUrl"
            fit="contain"
            style="max-height: 400px;"
          />
        </div>

        <el-descriptions :column="2" border class="detail-info">
          <el-descriptions-item label="证件类型">
            {{ getDocTypeName(currentDocument.type) }}
          </el-descriptions-item>
          <el-descriptions-item label="证件名称">
            {{ currentDocument.name }}
          </el-descriptions-item>
          <el-descriptions-item label="证件号码">
            {{ formatIdNumber(currentDocument.idNumber) }}
          </el-descriptions-item>
          <el-descriptions-item label="有效期至">
            {{ formatDate(currentDocument.expiryDate) }}
          </el-descriptions-item>
          <el-descriptions-item label="上传时间">
            {{ formatDateTime(currentDocument.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentDocument)">
              {{ getStatusText(currentDocument) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <template #footer>
        <el-button @click="viewDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="downloadDocument(currentDocument)">
          下载
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Document,
  PictureFilled,
  Calendar,
  Postcard,
  MoreFilled,
  UploadFilled,
  WarningFilled
} from '@element-plus/icons-vue'

// 响应式数据
const documents = ref([])
const searchQuery = ref('')
const activeCategory = ref('all')
const uploadDialogVisible = ref(false)
const viewDialogVisible = ref(false)
const currentDocument = ref(null)
const uploading = ref(false)

// 上传表单
const uploadForm = ref({
  type: '',
  name: '',
  idNumber: '',
  expiryDate: '',
  file: null
})

// 表单验证规则
const uploadRules = {
  type: [{ required: true, message: '请选择证件类型', trigger: 'change' }],
  name: [{ required: true, message: '请输入证件名称', trigger: 'blur' }],
  file: [{ required: true, message: '请上传证件文件', trigger: 'change' }]
}

// 统计数据
const stats = computed(() => {
  return {
    idCard: documents.value.filter(d => d.type === 'id_card').length,
    household: documents.value.filter(d => d.type === 'household').length,
    driving: documents.value.filter(d => d.type === 'driving').length,
    other: documents.value.filter(d => d.type === 'other').length
  }
})

// 过滤后的列表
const filteredList = computed(() => {
  let list = documents.value

  // 分类过滤
  if (activeCategory.value !== 'all') {
    list = list.filter(doc => doc.type === activeCategory.value)
  }

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    list = list.filter(doc =>
      doc.name.toLowerCase().includes(query) ||
      doc.idNumber?.toLowerCase().includes(query)
    )
  }

  return list
})

// 获取某类型的证件数量
const getCountByType = (type) => {
  return documents.value.filter(doc => doc.type === type).length
}

// 获取证件类型名称
const getDocTypeName = (type) => {
  const typeMap = {
    id_card: '身份证',
    household: '户口本',
    driving: '驾驶证',
    passport: '护照',
    other: '其他'
  }
  return typeMap[type] || '未知'
}

// 格式化证件号码（脱敏）
const formatIdNumber = (idNumber) => {
  if (!idNumber) return '-'
  if (idNumber.length > 8) {
    return idNumber.substring(0, 6) + '********' + idNumber.substring(idNumber.length - 4)
  }
  return idNumber
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

// 检查是否即将过期
const isExpiring = (doc) => {
  if (!doc.expiryDate) return false
  const expiryDate = new Date(doc.expiryDate)
  const now = new Date()
  const diffDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))
  return diffDays <= 30 && diffDays >= 0
}

// 获取过期提示文本
const getExpiryText = (doc) => {
  const expiryDate = new Date(doc.expiryDate)
  const now = new Date()
  const diffDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return '已过期'
  if (diffDays === 0) return '今日过期'
  if (diffDays <= 7) return `${diffDays}天后过期`
  return '即将过期'
}

// 获取状态
const getStatusType = (doc) => {
  if (!doc.expiryDate) return 'info'
  const expiryDate = new Date(doc.expiryDate)
  const now = new Date()
  const diffDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'danger'
  if (diffDays <= 30) return 'warning'
  return 'success'
}

const getStatusText = (doc) => {
  if (!doc.expiryDate) return '未设置有效期'
  const expiryDate = new Date(doc.expiryDate)
  const now = new Date()
  const diffDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return '已过期'
  if (diffDays <= 7) return '即将过期'
  if (diffDays <= 30) return '30天内过期'
  return '正常'
}

// 加载证件列表
const loadDocuments = async () => {
  try {
    // TODO: 调用API
    // const { data } = await documentApi.getMyDocuments()
    // documents.value = data

    // 模拟数据
    documents.value = []
  } catch (error) {
    ElMessage.error('加载证件列表失败')
    console.error(error)
  }
}

// 上传文件
const handleFileChange = (file) => {
  uploadForm.value.file = file.raw
}

// 文件超出限制
const handleExceed = () => {
  ElMessage.warning('只能上传一个文件')
}

// 上传证件
const handleUpload = async () => {
  try {
    const valid = await uploadForm.value.validate()
    if (!valid) return

    uploading.value = true

    const formData = new FormData()
    formData.append('type', uploadForm.value.type)
    formData.append('name', uploadForm.value.name)
    formData.append('idNumber', uploadForm.value.idNumber)
    formData.append('expiryDate', uploadForm.value.expiryDate)
    formData.append('file', uploadForm.value.file)

    // TODO: 调用API
    // await documentApi.uploadDocument(formData)

    ElMessage.success('上传成功')
    uploadDialogVisible.value = false
    loadDocuments()
  } catch (error) {
    ElMessage.error('上传失败')
    console.error(error)
  } finally {
    uploading.value = false
  }
}

// 重置上传表单
const resetUploadForm = () => {
  uploadForm.value = {
    type: '',
    name: '',
    idNumber: '',
    expiryDate: '',
    file: null
  }
}

// 查看证件
const viewDocument = (doc) => {
  currentDocument.value = doc
  viewDialogVisible.value = true
}

// 下载证件
const downloadDocument = (doc) => {
  ElMessage.info('下载功能开发中...')
}

// 卡片操作
const handleCardAction = (command, doc) => {
  switch (command) {
    case 'view':
      viewDocument(doc)
      break
    case 'share':
      ElMessage.info('分享功能开发中...')
      break
    case 'download':
      downloadDocument(doc)
      break
    case 'edit':
      ElMessage.info('编辑功能开发中...')
      break
    case 'delete':
      handleDelete(doc)
      break
  }
}

// 删除证件
const handleDelete = (doc) => {
  ElMessageBox.confirm(
    `确定要删除"${doc.name}"吗？删除后无法恢复。`,
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      // TODO: 调用API
      // await documentApi.deleteDocument(doc._id)

      ElMessage.success('删除成功')
      loadDocuments()
    } catch (error) {
      ElMessage.error('删除失败')
      console.error(error)
    }
  }).catch(() => {
    // 用户取消
  })
}

// 标签切换
const handleTabChange = () => {
  // 过滤逻辑已在computed中处理
}

// 显示上传对话框
const showUploadDialog = () => {
  uploadDialogVisible.value = true
}

// 页面加载时获取数据
onMounted(() => {
  loadDocuments()
})
</script>

<style scoped>
.document-wallet {
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  margin: 0 0 8px 0;
  color: #303133;
}

.page-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.stats-row {
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
}

.stat-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  font-size: 32px;
  margin-right: 16px;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.action-bar {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.tab-badge {
  display: inline-block;
}

.document-list {
  min-height: 300px;
}

.document-card {
  margin-bottom: 16px;
  transition: all 0.3s;
}

.document-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.document-card.expiring {
  border: 2px solid #E6A23C;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid #EBEEF5;
}

.doc-type {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.type-icon {
  margin-right: 6px;
  color: #409EFF;
}

.card-body {
  padding-top: 12px;
  cursor: pointer;
}

.doc-preview {
  margin-bottom: 12px;
  text-align: center;
}

.preview-image {
  width: 100%;
  height: 120px;
  border-radius: 4px;
}

.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: #F5F7FA;
  color: #909399;
  font-size: 30px;
}

.preview-placeholder {
  width: 100%;
  height: 120px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #F5F7FA;
  border-radius: 4px;
  color: #909399;
  font-size: 40px;
}

.doc-info {
  padding: 0 8px;
}

.doc-name {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin: 0 0 8px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #909399;
}

.meta-item {
  display: flex;
  align-items: center;
}

.meta-item .el-icon {
  margin-right: 4px;
}

.expiry-alert {
  display: flex;
  align-items: center;
  margin-top: 8px;
  padding: 4px 8px;
  background: #FEF0F0;
  border-radius: 4px;
  color: #E6A23C;
  font-size: 12px;
}

.alert-icon {
  margin-right: 4px;
}

.document-detail {
  text-align: center;
}

.detail-image {
  margin-bottom: 20px;
}

.detail-info {
  text-align: left;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .stats-row .el-col {
    margin-bottom: 12px;
  }

  .action-bar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .action-bar .el-input {
    width: 100% !important;
    margin-left: 0 !important;
  }
}
</style>
