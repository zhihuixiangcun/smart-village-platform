<!-- 反馈详情抽屉组件 -->
<template>
  <el-drawer
    v-model="visible"
    title="反馈详情"
    direction="rtl"
    size="80%"
    :before-close="handleClose"
  >
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="5" animated />
    </div>

    <div v-else-if="feedback" class="feedback-detail">
      <!-- 基本信息 -->
      <el-card class="detail-card">
        <template #header>
          <div class="card-header">
            <h3>{{ feedback.title }}</h3>
            <div class="header-tags">
              <el-tag :type="getCategoryTagType(feedback.category)" size="small">
                {{ getCategoryLabel(feedback.category) }}
              </el-tag>
              <el-tag :type="getStatusTagType(feedback.status)" size="small">
                {{ getStatusLabel(feedback.status) }}
              </el-tag>
              <el-tag :type="getPriorityTagType(feedback.priority)" size="small">
                {{ getPriorityLabel(feedback.priority) }}
              </el-tag>
            </div>
          </div>
        </template>

        <el-descriptions :column="2" border>
          <el-descriptions-item label="反馈ID">
            {{ feedback.feedbackId }}
          </el-descriptions-item>
          <el-descriptions-item label="提交时间">
            {{ formatDateTime(feedback.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="提交用户">
            <div v-if="feedback.userId" class="user-info">
              <el-avatar :size="32" :src="feedback.userId.profile?.avatar" />
              <div class="user-details">
                <div class="user-name">{{ feedback.userId.profile?.displayName }}</div>
                <div class="user-type">{{ getUserTypeLabel(feedback.userId.profile?.userType) }}</div>
              </div>
            </div>
            <span v-else>匿名用户</span>
          </el-descriptions-item>
          <el-descriptions-item label="分配团队">
            {{ feedback.assignedTeam || '未分配' }}
          </el-descriptions-item>
          <el-descriptions-item label="处理人">
            <div v-if="feedback.assignedTo" class="user-info">
              <el-avatar :size="32" :src="feedback.assignedTo.profile?.avatar" />
              <span class="user-name">{{ feedback.assignedTo.profile?.displayName }}</span>
            </div>
            <span v-else class="text-muted">未分配</span>
          </el-descriptions-item>
          <el-descriptions-item label="最后更新">
            {{ formatDateTime(feedback.updatedAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 标签 -->
        <div v-if="feedback.tags && feedback.tags.length" class="tags-section">
          <div class="section-label">标签：</div>
          <el-tag
            v-for="tag in feedback.tags"
            :key="tag"
            class="tag-item"
            size="small"
          >
            {{ tag }}
          </el-tag>
        </div>
      </el-card>

      <!-- 反馈内容 -->
      <el-card class="detail-card">
        <template #header>
          <h3>反馈内容</h3>
        </template>
        <div class="feedback-content">
          <p>{{ feedback.description }}</p>
        </div>

        <!-- 附件 -->
        <div v-if="feedback.attachments && feedback.attachments.length" class="attachments-section">
          <div class="section-label">附件：</div>
          <div class="attachment-list">
            <div
              v-for="(attachment, index) in feedback.attachments"
              :key="index"
              class="attachment-item"
            >
              <el-icon class="attachment-icon">
                <component :is="getAttachmentIcon(attachment.type)" />
              </el-icon>
              <span class="attachment-name">{{ attachment.filename }}</span>
              <el-button
                type="primary"
                link
                size="small"
                @click="previewAttachment(attachment)"
              >
                预览
              </el-button>
              <el-button
                type="primary"
                link
                size="small"
                @click="downloadAttachment(attachment)"
              >
                下载
              </el-button>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 处理记录 -->
      <el-card class="detail-card">
        <template #header>
          <div class="card-header">
            <h3>处理记录</h3>
            <el-button
              type="primary"
              size="small"
              @click="showProcessForm = true"
            >
              添加处理记录
            </el-button>
          </div>
        </template>

        <el-timeline>
          <el-timeline-item
            v-for="(response, index) in feedback.responses"
            :key="index"
            :timestamp="formatDateTime(response.timestamp)"
            placement="top"
          >
            <div class="timeline-content">
              <div class="response-header">
                <div class="responder-info">
                  <el-avatar :size="32" :src="response.responderId?.profile?.avatar" />
                  <span class="responder-name">
                    {{ response.responderId?.profile?.displayName }}
                  </span>
                  <el-tag
                    v-if="response.isInternal"
                    type="warning"
                    size="small"
                  >
                    内部记录
                  </el-tag>
                </div>
              </div>
              <div class="response-content">
                {{ response.content }}
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>

        <div v-if="!feedback.responses || !feedback.responses.length" class="empty-state">
          暂无处理记录
        </div>
      </el-card>

      <!-- 满意度评价 -->
      <el-card v-if="feedback.satisfaction" class="detail-card">
        <template #header>
          <h3>满意度评价</h3>
        </template>
        <div class="satisfaction-section">
          <div class="rating-display">
            <el-rate
              v-model="feedback.satisfaction.rating"
              disabled
              show-score
              text-color="#ff9900"
              score-template="{value} 分"
            />
          </div>
          <div v-if="feedback.satisfaction.comment" class="satisfaction-comment">
            <div class="section-label">评价内容：</div>
            <p>{{ feedback.satisfaction.comment }}</p>
          </div>
        </div>
      </el-card>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button
          v-if="feedback.status !== 'resolved' && feedback.status !== 'closed'"
          type="primary"
          @click="showProcessForm = true"
        >
          添加处理记录
        </el-button>
        <el-button
          v-if="!feedback.satisfaction && feedback.status === 'resolved'"
          type="success"
          @click="showSatisfactionForm = true"
        >
          评价满意度
        </el-button>
        <el-button @click="handleClose">关闭</el-button>
      </div>
    </div>

    <!-- 处理记录表单对话框 -->
    <el-dialog
      v-model="showProcessForm"
      title="添加处理记录"
      width="600px"
    >
      <el-form
        ref="processFormRef"
        :model="processForm"
        :rules="processRules"
        label-width="100px"
      >
        <el-form-item label="处理状态" prop="status">
          <el-select v-model="processForm.status" placeholder="选择状态">
            <el-option
              v-for="option in statusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="处理内容" prop="response">
          <el-input
            v-model="processForm.response"
            type="textarea"
            :rows="4"
            placeholder="请输入处理内容或回复"
          />
        </el-form-item>

        <el-form-item label="内部记录">
          <el-switch
            v-model="processForm.isInternal"
            active-text="是"
            inactive-text="否"
          />
          <div class="form-help">内部记录不会对用户可见</div>
        </el-form-item>

        <el-form-item label="更新标签">
          <el-select
            v-model="processForm.tags"
            multiple
            filterable
            allow-create
            placeholder="输入或选择标签"
          >
            <el-option
              v-for="tag in commonTags"
              :key="tag"
              :label="tag"
              :value="tag"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showProcessForm = false">取消</el-button>
        <el-button type="primary" @click="submitProcess">提交</el-button>
      </template>
    </el-dialog>

    <!-- 满意度评价表单对话框 -->
    <el-dialog
      v-model="showSatisfactionForm"
      title="满意度评价"
      width="500px"
    >
      <el-form
        ref="satisfactionFormRef"
        :model="satisfactionForm"
        :rules="satisfactionRules"
        label-width="100px"
      >
        <el-form-item label="满意度评分" prop="rating">
          <el-rate
            v-model="satisfactionForm.rating"
            show-text
            :texts="['很不满意', '不满意', '一般', '满意', '很满意']"
          />
        </el-form-item>

        <el-form-item label="评价内容">
          <el-input
            v-model="satisfactionForm.comment"
            type="textarea"
            :rows="3"
            placeholder="请输入您的评价（可选）"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showSatisfactionForm = false">取消</el-button>
        <el-button type="primary" @click="submitSatisfaction">提交评价</el-button>
      </template>
    </el-dialog>
  </el-drawer>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Picture,
  VideoPlay,
  Document,
  Files
} from '@element-plus/icons-vue'
import { feedbackApi } from '@/api/feedbackApi'
import { formatDate } from '@/utils/dateUtils'

// Props & Emits
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  feedbackId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'refresh'])

// 响应式数据
const visible = ref(false)
const loading = ref(false)
const feedback = ref(null)

// 表单数据
const showProcessForm = ref(false)
const showSatisfactionForm = ref(false)
const processFormRef = ref()
const satisfactionFormRef = ref()

const processForm = reactive({
  status: '',
  response: '',
  isInternal: false,
  tags: []
})

const satisfactionForm = reactive({
  rating: 5,
  comment: ''
})

// 选项数据
const statusOptions = [
  { label: '待处理', value: 'pending' },
  { label: '审核中', value: 'in_review' },
  { label: '处理中', value: 'in_progress' },
  { label: '已解决', value: 'resolved' },
  { label: '已关闭', value: 'closed' },
  { label: '已拒绝', value: 'rejected' }
]

const commonTags = [
  '技术问题',
  '产品建议',
  'UI优化',
  '性能问题',
  '功能增强',
  '文档完善',
  '其他'
]

// 验证规则
const processRules = {
  status: [
    { required: true, message: '请选择处理状态', trigger: 'change' }
  ],
  response: [
    { required: true, message: '请输入处理内容', trigger: 'blur' }
  ]
}

const satisfactionRules = {
  rating: [
    { required: true, message: '请选择满意度评分', trigger: 'change' }
  ]
}

// 计算属性
const formatDateTime = computed(() => {
  return (dateStr) => {
    if (!dateStr) return '-'
    return formatDate(new Date(dateStr), 'YYYY-MM-DD HH:mm:ss')
  }
})

// 方法
const loadFeedbackDetail = async () => {
  if (!props.feedbackId) return

  try {
    loading.value = true
    const response = await feedbackApi.getFeedbackDetail(props.feedbackId)
    feedback.value = response.data
  } catch (error) {
    ElMessage.error('加载反馈详情失败')
    console.error('加载反馈详情失败:', error)
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  emit('update:modelValue', false)
  feedback.value = null
}

const submitProcess = async () => {
  try {
    await processFormRef.value.validate()

    await feedbackApi.processFeedback(props.feedbackId, processForm)

    ElMessage.success('处理记录添加成功')
    showProcessForm.value = false
    emit('refresh')
    loadFeedbackDetail()
  } catch (error) {
    if (error.message) {
      ElMessage.error(error.message)
    }
    console.error('添加处理记录失败:', error)
  }
}

const submitSatisfaction = async () => {
  try {
    await satisfactionFormRef.value.validate()

    await feedbackApi.addSatisfactionRating(props.feedbackId, satisfactionForm)

    ElMessage.success('满意度评价提交成功')
    showSatisfactionForm.value = false
    emit('refresh')
    loadFeedbackDetail()
  } catch (error) {
    if (error.message) {
      ElMessage.error(error.message)
    }
    console.error('提交满意度评价失败:', error)
  }
}

const previewAttachment = (attachment) => {
  // 实现附件预览逻辑
  window.open(attachment.url, '_blank')
}

const downloadAttachment = (attachment) => {
  // 实现附件下载逻辑
  const link = document.createElement('a')
  link.href = attachment.url
  link.download = attachment.filename
  link.click()
}

// 辅助方法
const getCategoryLabel = (category) => {
  const options = feedbackApi.getCategoryOptions()
  const option = options.find(opt => opt.value === category)
  return option ? option.label : category
}

const getCategoryTagType = (category) => {
  const typeMap = {
    bug_report: 'danger',
    feature_request: 'primary',
    improvement: 'success',
    complaint: 'warning',
    compliment: 'success',
    question: 'info',
    usage_difficulty: 'warning'
  }
  return typeMap[category] || 'info'
}

const getStatusLabel = (status) => {
  const option = statusOptions.find(opt => opt.value === status)
  return option ? option.label : status
}

const getStatusTagType = (status) => {
  const typeMap = {
    pending: 'warning',
    in_review: 'primary',
    in_progress: 'primary',
    resolved: 'success',
    closed: 'info',
    rejected: 'danger'
  }
  return typeMap[status] || 'info'
}

const getPriorityLabel = (priority) => {
  const options = feedbackApi.getPriorityOptions()
  const option = options.find(opt => opt.value === priority)
  return option ? option.label : priority
}

const getPriorityTagType = (priority) => {
  const typeMap = {
    low: 'info',
    medium: 'primary',
    high: 'warning',
    urgent: 'danger'
  }
  return typeMap[priority] || 'info'
}

const getUserTypeLabel = (userType) => {
  const typeMap = {
    admin: '管理员',
    committee: '村委',
    resident: '村民',
    guest: '访客'
  }
  return typeMap[userType] || userType
}

const getAttachmentIcon = (type) => {
  const iconMap = {
    image: Picture,
    video: VideoPlay,
    file: Document,
    screenshot: Picture
  }
  return iconMap[type] || Files
}

// 监听器
watch(
  () => props.modelValue,
  (val) => {
    visible.value = val
    if (val && props.feedbackId) {
      loadFeedbackDetail()
    }
  },
  { immediate: true }
)

watch(
  () => props.feedbackId,
  (val) => {
    if (val && visible.value) {
      loadFeedbackDetail()
    }
  }
)

watch(
  visible,
  (val) => {
    emit('update:modelValue', val)
  }
)
</script>

<style lang="scss" scoped>
.feedback-detail {
  padding: 20px;

  .detail-card {
    margin-bottom: 20px;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      h3 {
        margin: 0;
        font-size: 16px;
        color: #303133;
      }

      .header-tags {
        display: flex;
        gap: 8px;
      }
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;

      .user-details {
        .user-name {
          font-weight: 500;
          color: #303133;
        }

        .user-type {
          font-size: 12px;
          color: #909399;
        }
      }

      .user-name {
        color: #303133;
      }
    }

    .tags-section,
    .attachments-section {
      margin-top: 16px;

      .section-label {
        margin-bottom: 8px;
        font-weight: 500;
        color: #606266;
      }

      .tag-item {
        margin-right: 8px;
        margin-bottom: 8px;
      }
    }

    .attachment-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 12px;

      .attachment-item {
        display: flex;
        align-items: center;
        padding: 12px;
        border: 1px solid #e4e7ed;
        border-radius: 8px;
        background: #f9f9f9;

        .attachment-icon {
          margin-right: 8px;
          font-size: 20px;
          color: #909399;
        }

        .attachment-name {
          flex: 1;
          margin-right: 8px;
          font-size: 14px;
          color: #606266;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }

    .feedback-content {
      line-height: 1.6;
      color: #303133;
    }

    .timeline-content {
      .response-header {
        margin-bottom: 8px;

        .responder-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
      }

      .response-content {
        padding: 12px;
        background: #f5f7fa;
        border-radius: 8px;
        color: #606266;
        line-height: 1.6;
      }
    }

    .satisfaction-section {
      .rating-display {
        margin-bottom: 16px;
      }

      .satisfaction-comment {
        .section-label {
          margin-bottom: 8px;
          font-weight: 500;
          color: #606266;
        }

        p {
          line-height: 1.6;
          color: #303133;
        }
      }
    }

    .empty-state {
      padding: 40px 0;
      text-align: center;
      color: #909399;
    }
  }

  .action-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 20px;
    border-top: 1px solid #e4e7ed;
  }

  .text-muted {
    color: #909399;
  }

  .form-help {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }
}

.loading-container {
  padding: 20px;
}

// 响应式设计
@media (max-width: 768px) {
  .feedback-detail {
    padding: 10px;

    .detail-card {
      .card-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;

        .header-tags {
          flex-wrap: wrap;
        }
      }

      .attachment-list {
        grid-template-columns: 1fr;
      }

      .action-buttons {
        justify-content: center;
        flex-wrap: wrap;
      }
    }
  }
}
</style>