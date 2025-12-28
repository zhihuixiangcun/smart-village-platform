<template>
  <el-dialog
    :model-value="visible"
    :title="document?.documentInfo?.title || '文档详情'"
    width="900px"
    :close-on-click-modal="false"
    @update:model-value="handleClose"
    destroy-on-close
  >
    <div v-loading="loading" class="document-detail">
      <el-tabs v-model="activeTab" type="border-card">
        <!-- 基本信息 -->
        <el-tab-pane label="基本信息" name="info">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="文档标题" :span="2">
              {{ document?.documentInfo?.title }}
            </el-descriptions-item>
            <el-descriptions-item label="文档分类">
              <el-tag :type="getCategoryTagType(document?.documentCategory)">
                {{ getCategoryLabel(document?.documentCategory) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="文档状态">
              <el-tag :type="getStatusTagType(document?.status)">
                {{ getStatusLabel(document?.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="优先级">
              <el-tag
                v-if="document?.documentInfo?.priority === 'urgent'"
                type="danger"
              >
                紧急
              </el-tag>
              <el-tag
                v-else-if="document?.documentInfo?.priority === 'important'"
                type="warning"
              >
                重要
              </el-tag>
              <el-tag v-else type="info">普通</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="文号">
              {{ document?.documentInfo?.documentNumber || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="签发日期">
              {{ document?.documentInfo?.issueDate ? formatDate(document.documentInfo.issueDate) : '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="创建人">
              {{ document?.committeeMemberId?.name || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="上传者">
              {{ document?.responsibility?.uploadedBy?.username || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="创建时间" :span="2">
              {{ formatDateTime(document?.createdAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="最后更新" :span="2">
              {{ formatDateTime(document?.updatedAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="文档描述" :span="2">
              {{ document?.documentInfo?.description || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="文件信息" :span="2">
              <div class="flex items-center gap-2">
                <el-icon :color="getFileIconColor(document?.fileInfo?.mimeType)">
                  <component :is="getFileIcon(document?.fileInfo?.mimeType)" />
                </el-icon>
                <span>{{ document?.fileInfo?.originalName }}</span>
                <el-tag size="small">{{ formatFileSize(document?.fileInfo?.fileSize) }}</el-tag>
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="标签" :span="2">
              <el-tag
                v-for="(tag, index) in document?.tags"
                :key="index"
                class="mr-1"
                size="small"
              >
                {{ tag }}
              </el-tag>
              <span v-if="!document?.tags?.length">-</span>
            </el-descriptions-item>
            <el-descriptions-item label="关键词" :span="2">
              <el-tag
                v-for="(keyword, index) in document?.keywords"
                :key="index"
                type="info"
                class="mr-1"
                size="small"
              >
                {{ keyword }}
              </el-tag>
              <span v-if="!document?.keywords?.length">-</span>
            </el-descriptions-item>
            <el-descriptions-item label="查看统计">
              <span>总查看: {{ document?.viewStatistics?.totalViews || 0 }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="最后查看">
              {{ document?.viewStatistics?.lastViewedAt ? formatDateTime(document.viewStatistics.lastViewedAt) : '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="版本" :span="2">
              当前版本: v{{ document?.currentVersion || 1 }}
            </el-descriptions-item>
          </el-descriptions>

          <div class="mt-4 flex gap-2">
            <el-button type="primary" @click="handleDownload">
              <el-icon><Download /></el-icon>
              下载文档
            </el-button>
            <el-button @click="handleEdit">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button @click="handleArchive" v-if="document?.status !== 'archived'">
              <el-icon><FolderAdd /></el-icon>
              归档
            </el-button>
          </div>
        </el-tab-pane>

        <!-- 操作历史 -->
        <el-tab-pane label="操作历史" name="history">
          <div class="operation-history">
            <el-timeline>
              <el-timeline-item
                v-for="log in operationLogs"
                :key="log._id"
                :timestamp="formatDateTime(log.timestamp)"
                placement="top"
                :type="getLogType(log.action)"
              >
                <el-card class="history-card">
                  <div class="flex justify-between items-start">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-2">
                        <el-tag :type="getActionTagType(log.action)" size="small">
                          {{ getActionLabel(log.action) }}
                        </el-tag>
                        <span class="font-semibold">{{ log.resourceName || '-' }}</span>
                      </div>
                      <div class="text-sm text-gray-600">
                        <p><strong>操作人:</strong> {{ log.operatorName }} ({{ log.operatorRole }})</p>
                        <p v-if="log.details?.changes?.before">
                          <strong>变更前:</strong> {{ formatChanges(log.details.changes.before) }}
                        </p>
                        <p v-if="log.details?.changes?.after">
                          <strong>变更后:</strong> {{ formatChanges(log.details.changes.after) }}
                        </p>
                        <p v-if="log.details?.reason">
                          <strong>原因:</strong> {{ log.details.reason }}
                        </p>
                        <p v-if="log.requestContext?.ipAddress">
                          <strong>IP地址:</strong> {{ log.requestContext.ipAddress }}
                        </p>
                      </div>
                    </div>
                  </div>
                </el-card>
              </el-timeline-item>
            </el-timeline>

            <el-empty
              v-if="!operationLogs?.length"
              description="暂无操作记录"
              :image-size="100"
            />
          </div>
        </el-tab-pane>

        <!-- 附件管理 -->
        <el-tab-pane label="附件" name="attachments">
          <div v-if="document?.attachments?.length" class="attachments-list">
            <el-card
              v-for="(attachment, index) in document.attachments"
              :key="index"
              class="mb-3"
            >
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <el-icon><DocumentCopy /></el-icon>
                  <span>{{ attachment.fileName }}</span>
                  <el-tag size="small">{{ formatFileSize(attachment.fileSize) }}</el-tag>
                </div>
                <div class="flex gap-2">
                  <el-button type="primary" size="small" link>下载</el-button>
                  <el-button type="danger" size="small" link>删除</el-button>
                </div>
              </div>
            </el-card>
          </div>
          <el-empty v-else description="暂无附件" :image-size="100" />
          <el-button class="mt-4" type="primary" plain>
            <el-icon><Plus /></el-icon>
            添加附件
          </el-button>
        </el-tab-pane>

        <!-- 版本历史 -->
        <el-tab-pane label="版本历史" name="versions">
          <el-timeline>
            <el-timeline-item
              v-for="(version, index) in document?.versionHistory"
              :key="index"
              :timestamp="formatDateTime(version.modifiedAt)"
              placement="top"
            >
              <el-card>
                <div class="flex items-center gap-2 mb-2">
                  <el-tag type="primary">v{{ version.version }}</el-tag>
                  <span class="font-semibold">版本 {{ version.version }}</span>
                </div>
                <p class="text-sm text-gray-600">
                  <strong>修改人:</strong> {{ version.modifiedBy?.username || '-' }}
                </p>
                <p class="text-sm text-gray-600">
                  <strong>变更说明:</strong> {{ version.changes || '-' }}
                </p>
              </el-card>
            </el-timeline-item>
          </el-timeline>
          <el-empty
            v-if="!document?.versionHistory?.length"
            description="暂无版本历史"
            :image-size="100"
          />
        </el-tab-pane>
      </el-tabs>
    </div>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Download,
  Edit,
  FolderAdd,
  DocumentCopy,
  Plus,
  Picture,
  Document,
  Success,
  Warning
} from '@element-plus/icons-vue'
import { committeeDocumentApi } from '@/api/committeeDocuments'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  documentId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'refresh', 'edit'])

const loading = ref(false)
const activeTab = ref('info')
const document = ref(null)
const operationLogs = ref([])

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
  const categoryMap = {
    work_report: '工作报告',
    meeting_minutes: '会议纪要',
    approval: '审批文件',
    task_list: '任务清单',
    policy: '政策文件',
    financial: '财务报表',
    project: '项目文档',
    notice: '通知公告',
    contract: '合同协议',
    other: '其他'
  }
  return categoryMap[category] || category
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

const getActionLabel = (action) => {
  const labelMap = {
    create: '创建',
    update: '更新',
    delete: '删除',
    view: '查看',
    download: '下载',
    upload: '上传',
    archive: '归档',
    unarchive: '取消归档',
    add_tags: '添加标签',
    remove_tags: '移除标签',
    add_attachment: '添加附件',
    remove_attachment: '移除附件',
    create_version: '创建版本'
  }
  return labelMap[action] || action
}

const getActionTagType = (action) => {
  const typeMap = {
    create: 'success',
    update: 'primary',
    delete: 'danger',
    view: 'info',
    download: 'info',
    upload: 'success',
    archive: 'warning',
    unarchive: 'info',
    add_tags: 'primary',
    remove_tags: 'warning',
    add_attachment: 'success',
    remove_attachment: 'danger',
    create_version: 'primary'
  }
  return typeMap[action] || ''
}

const getLogType = (action) => {
  const typeMap = {
    create: 'success',
    update: 'primary',
    delete: 'danger',
    archive: 'warning',
    unarchive: 'info'
  }
  return typeMap[action] || 'primary'
}

const formatChanges = (changes) => {
  if (typeof changes === 'string') return changes
  if (typeof changes === 'object') {
    return Object.entries(changes)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')
  }
  return JSON.stringify(changes)
}

// 数据加载
const loadDocument = async () => {
  if (!props.documentId) return

  try {
    loading.value = true
    document.value = await committeeDocumentApi.getDetail(props.documentId)
  } catch (error) {
    ElMessage.error('获取文档详情失败')
  } finally {
    loading.value = false
  }
}

const loadOperationHistory = async () => {
  if (!props.documentId) return

  try {
    operationLogs.value = await committeeDocumentApi.getHistory(props.documentId)
  } catch (error) {
    console.error('获取操作历史失败:', error)
  }
}

// 事件处理
const handleClose = () => {
  emit('update:visible', false)
}

const handleDownload = async () => {
  if (!document.value) return

  try {
    const filename = document.value.fileInfo?.originalName || 'document'
    await committeeDocumentApi.download(props.documentId, filename)
  } catch (error) {
    ElMessage.error('下载失败')
  }
}

const handleEdit = () => {
  emit('edit', document.value)
}

const handleArchive = () => {
  ElMessageBox.confirm(`确定要归档文档 "${document.value?.documentInfo?.title}" 吗？`, '归档确认', {
    type: 'warning'
  }).then(async () => {
    try {
      await committeeDocumentApi.archive(props.documentId, { reason: '手动归档' })
      ElMessage.success('归档成功')
      emit('refresh')
      loadDocument()
    } catch (error) {
      ElMessage.error('归档失败')
    }
  })
}

// 监听 visible 变化
watch(() => props.visible, (newVal) => {
  if (newVal && props.documentId) {
    activeTab.value = 'info'
    loadDocument()
    loadOperationHistory()
  }
})
</script>

<style scoped>
.document-detail {
  min-height: 400px;
}

.operation-history {
  max-height: 500px;
  overflow-y: auto;
}

.history-card {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.attachments-list :deep(.el-card__body) {
  padding: 12px 20px;
}
</style>
