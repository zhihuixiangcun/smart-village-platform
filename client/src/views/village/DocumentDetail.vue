<template>
  <div class="document-detail">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      title="资料收集详情"
      left-arrow
      @click-left="$router.go(-1)"
      :right-text="canEdit ? '编辑' : ''"
      @click-right="handleEdit"
    />

    <!-- 基本信息 -->
    <van-cell-group inset>
      <van-cell>
        <template #title>
          <span class="detail-title">{{ document.title }}</span>
        </template>
      </van-cell>
      <van-cell title="类别" :value="getCategoryText(document.category)" />
      <van-cell title="收集人" :value="document.collector?.name" />
      <van-cell title="收集日期" :value="formatDate(document.collectionDate)" />
      <van-cell title="截止日期" :value="formatDate(document.deadline)" />
      <van-cell title="状态">
        <template #right-icon>
          <van-tag :type="getStatusType(document.status)">
            {{ getStatusText(document.status) }}
          </van-tag>
        </template>
      </van-cell>
      <van-cell title="优先级">
        <template #right-icon>
          <van-tag :type="getPriorityType(document.priority)">
            {{ getPriorityText(document.priority) }}
          </van-tag>
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 描述信息 -->
    <van-cell-group inset v-if="document.description">
      <van-cell title="描述" />
      <van-cell>
        <template #default>
          <div class="description-text">{{ document.description }}</div>
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 文件列表 -->
    <van-cell-group inset>
      <van-cell>
        <template #title>
          <span>📁 文件列表 ({{ document.files?.length || 0 }})</span>
        </template>
        <template #right-icon v-if="canEdit">
          <van-uploader
            :after-read="handleFileUpload"
            :before-read="beforeFileRead"
            multiple
            :preview-size="0"
            style="display: none;"
            ref="fileUploader"
          >
            <van-button size="mini" type="primary">上传文件</van-button>
          </van-uploader>
        </template>
      </van-cell>

      <van-cell
        v-for="file in document.files"
        :key="file._id"
        :title="file.originalName"
        :label="formatFileInfo(file)"
        is-link
        @click="handleFileClick(file)"
      >
        <template #right-icon>
          <div class="file-actions">
            <van-icon name="eye-o" @click.stop="previewFile(file)" />
            <van-icon name="download" @click.stop="downloadFile(file)" />
            <van-icon
              v-if="canEdit"
              name="delete-o"
              @click.stop="deleteFile(file)"
              color="#ee0a24"
            />
          </div>
        </template>
      </van-cell>

      <van-empty v-if="!document.files || document.files.length === 0" description="暂无文件" />
    </van-cell-group>

    <!-- 标签 -->
    <van-cell-group inset v-if="document.tags && document.tags.length > 0">
      <van-cell title="标签" />
      <van-cell>
        <template #default>
          <van-tag
            v-for="tag in document.tags"
            :key="tag"
            type="primary"
            size="medium"
            style="margin-right: 8px; margin-bottom: 8px;"
          >
            {{ tag }}
          </van-tag>
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 数据字段 -->
    <van-cell-group inset v-if="document.dataFields && document.dataFields.length > 0">
      <van-cell title="数据字段" />
      <van-cell
        v-for="field in document.dataFields"
        :key="field.fieldName"
        :title="field.fieldName"
        :value="formatFieldValue(field)"
        :label="field.description"
      />
    </van-cell-group>

    <!-- 备注 -->
    <van-cell-group inset v-if="document.notes">
      <van-cell title="备注" />
      <van-cell>
        <template #default>
          <div class="notes-text">{{ document.notes }}</div>
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 审核信息 -->
    <van-cell-group inset v-if="document.review">
      <van-cell title="审核信息" />
      <van-cell title="审核人" :value="document.review.reviewedBy?.name" />
      <van-cell title="审核时间" :value="formatDate(document.review.reviewedAt)" />
      <van-cell title="审核结果">
        <template #right-icon>
          <van-tag :type="document.review.approved ? 'success' : 'danger'">
            {{ document.review.approved ? '通过' : '拒绝' }}
          </van-tag>
        </template>
      </van-cell>
      <van-cell title="审核意见" v-if="document.review.reviewNotes" />
      <van-cell>
        <template #default>
          <div class="review-notes">{{ document.review.reviewNotes }}</div>
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 操作按钮 -->
    <div class="action-buttons" v-if="canEdit">
      <van-button
        v-if="document.status === 'collecting'"
        type="primary"
        block
        @click="submitForReview"
      >
        提交审核
      </van-button>
      <van-button
        type="default"
        block
        @click="showStatusActions = true"
      >
        更新状态
      </van-button>
    </div>

    <!-- 状态选择弹窗 -->
    <van-action-sheet
      v-model:show="showStatusActions"
      :actions="statusActions"
      @select="handleStatusChange"
      cancel-text="取消"
    />

    <!-- 图片预览 -->
    <van-image-preview
      v-model:show="showImagePreview"
      :images="previewImages"
      :start-position="previewIndex"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { useUserStore } from '@/stores/user'
import villageApi from '@/api/villageManagement'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// 响应式数据
const document = ref({})
const showStatusActions = ref(false)
const showImagePreview = ref(false)
const previewImages = ref([])
const previewIndex = ref(0)
const fileUploader = ref(null)

// 计算属性
const canEdit = computed(() => {
  return document.value.collector?.userId === userStore.userInfo?.id ||
         document.value.createdBy === userStore.userInfo?.id
})

const statusActions = computed(() => {
  const actions = [
    { name: '收集中', value: 'collecting' },
    { name: '审核中', value: 'reviewing' }
  ]

  if (document.value.status !== 'approved' && document.value.status !== 'archived') {
    actions.push({ name: '已归档', value: 'archived' })
  }

  return actions
})

// 方法
const loadDocumentDetail = async () => {
  try {
    const response = await villageApi.getDocumentDetail(route.params.id)
    document.value = response.data.data
  } catch (error) {
    console.error('获取文档详情失败:', error)
    showToast('获取详情失败')
  }
}

const handleEdit = () => {
  router.push(`/village/documents/${route.params.id}/edit`)
}

const beforeFileRead = (file) => {
  // 文件大小限制 10MB
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    showToast('文件大小不能超过10MB')
    return false
  }

  // 文件类型检查
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]

  if (!allowedTypes.includes(file.type)) {
    showToast('不支持的文件类型')
    return false
  }

  return true
}

const handleFileUpload = async (files) => {
  try {
    showToast('上传中...')

    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file.file)
    })

    await villageApi.uploadFiles(route.params.id, formData)

    showToast('上传成功')
    loadDocumentDetail() // 重新加载详情
  } catch (error) {
    console.error('文件上传失败:', error)
    showToast('上传失败')
  }
}

const handleFileClick = (file) => {
  if (isImageFile(file)) {
    previewImages.value = [file.path]
    previewIndex.value = 0
    showImagePreview.value = true
  } else {
    downloadFile(file)
  }
}

const previewFile = (file) => {
  if (isImageFile(file)) {
    previewImages.value = [file.path]
    previewIndex.value = 0
    showImagePreview.value = true
  } else {
    showToast('该文件类型不支持预览')
  }
}

const downloadFile = async (file) => {
  try {
    const response = await villageApi.downloadDocumentFile(route.params.id, file._id)

    // 创建下载链接
    const blob = new Blob([response.data])
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = file.originalName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    showToast('下载成功')
  } catch (error) {
    console.error('下载失败:', error)
    showToast('下载失败')
  }
}

const deleteFile = async (file) => {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: `确定要删除文件 "${file.originalName}" 吗？`,
    })

    await villageApi.deleteDocumentFile(route.params.id, file._id)
    showToast('删除成功')
    loadDocumentDetail()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      showToast('删除失败')
    }
  }
}

const submitForReview = async () => {
  try {
    await villageApi.updateDocumentStatus(route.params.id, {
      status: 'reviewing',
      notes: '提交审核'
    })

    showToast('已提交审核')
    loadDocumentDetail()
  } catch (error) {
    console.error('提交审核失败:', error)
    showToast('提交失败')
  }
}

const handleStatusChange = async (action) => {
  try {
    await villageApi.updateDocumentStatus(route.params.id, {
      status: action.value,
      notes: `状态更新为：${action.name}`
    })

    showToast('状态更新成功')
    loadDocumentDetail()
  } catch (error) {
    console.error('状态更新失败:', error)
    showToast('更新失败')
  }
}

// 辅助方法
const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString()
}

const isImageFile = (file) => {
  return file.mimeType.startsWith('image/')
}

const formatFileInfo = (file) => {
  const size = (file.size / 1024).toFixed(2)
  return `${size} KB - ${formatDate(file.uploadTime)}`
}

const formatFieldValue = (field) => {
  if (field.fieldType === 'date') {
    return formatDate(field.value)
  } else if (field.fieldType === 'boolean') {
    return field.value ? '是' : '否'
  } else if (Array.isArray(field.value)) {
    return field.value.join(', ')
  }
  return field.value
}

const getCategoryText = (category) => {
  const categoryMap = {
    'village_affairs': '村务',
    'resident_info': '村民信息',
    'financial': '财务',
    'project': '项目',
    'meeting': '会议',
    'policy': '政策',
    'emergency': '应急',
    'statistics': '统计',
    'construction': '建设',
    'environment': '环境',
    'social_welfare': '社会福利',
    'public_service': '公共服务',
    'other': '其他'
  }
  return categoryMap[category] || category
}

const getStatusType = (status) => {
  const statusMap = {
    'collecting': 'primary',
    'reviewing': 'warning',
    'approved': 'success',
    'rejected': 'danger',
    'archived': 'default'
  }
  return statusMap[status] || 'default'
}

const getStatusText = (status) => {
  const statusMap = {
    'collecting': '收集中',
    'reviewing': '审核中',
    'approved': '已完成',
    'rejected': '已拒绝',
    'archived': '已归档'
  }
  return statusMap[status] || status
}

const getPriorityType = (priority) => {
  const priorityMap = {
    'low': 'default',
    'medium': 'primary',
    'high': 'warning',
    'urgent': 'danger'
  }
  return priorityMap[priority] || 'default'
}

const getPriorityText = (priority) => {
  const priorityMap = {
    'low': '低',
    'medium': '中',
    'high': '高',
    'urgent': '紧急'
  }
  return priorityMap[priority] || priority
}

// 生命周期
onMounted(() => {
  loadDocumentDetail()
})
</script>

<style scoped>
.document-detail {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 80px;
}

.detail-title {
  font-size: 18px;
  font-weight: 600;
  color: #323233;
}

.description-text,
.notes-text,
.review-notes {
  color: #646566;
  line-height: 1.5;
  margin: 8px 0;
}

.file-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-actions .van-icon {
  font-size: 18px;
  color: #1989fa;
}

.action-buttons {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: white;
  box-shadow: 0 -2px 12px rgba(100, 101, 103, 0.12);
}

.action-buttons .van-button {
  margin-bottom: 8px;
}

.action-buttons .van-button:last-child {
  margin-bottom: 0;
}
</style>