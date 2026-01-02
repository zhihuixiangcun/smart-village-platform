<template>
  <div class="feedback-submission">
    <div class="feedback-header">
      <h2>用户反馈</h2>
      <p>我们重视您的每一条反馈，将不断改进产品体验</p>
    </div>

    <el-card class="feedback-form-card">
      <el-form
        ref="feedbackFormRef"
        :model="feedbackForm"
        :rules="feedbackRules"
        label-width="100px"
        label-position="top"
      >
        <!-- 反馈分类 -->
        <el-form-item label="反馈类型" prop="category" required>
          <el-select
            v-model="feedbackForm.category"
            placeholder="请选择反馈类型"
            style="width: 100%"
            @change="onCategoryChange"
          >
            <el-option
              v-for="option in categoryOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            >
              <span style="float: left">{{ option.label }}</span>
              <span style="float: right; color: #8492a6; font-size: 13px">
                {{ option.description }}
              </span>
            </el-option>
          </el-select>
        </el-form-item>

        <!-- 智能分类建议 -->
        <el-alert
          v-if="suggestedCategory.category"
          :title="`建议选择：${getCategoryLabel(suggestedCategory.category)}`"
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 20px"
        >
          <template #default>
            <div>置信度：{{ Math.round(suggestedCategory.confidence * 100) }}%</div>
            <el-button
              v-if="suggestedCategory.category !== feedbackForm.category"
              type="text"
              @click="applySuggestedCategory"
            >
              应用建议
            </el-button>
          </template>
        </el-alert>

        <!-- 反馈标题 -->
        <el-form-item label="标题" prop="title" required>
          <el-input
            v-model="feedbackForm.title"
            placeholder="请简要描述您的问题或建议"
            maxlength="100"
            show-word-limit
            @input="onTitleInput"
          />
        </el-form-item>

        <!-- 反馈描述 -->
        <el-form-item label="详细描述" prop="description" required>
          <el-input
            v-model="feedbackForm.description"
            type="textarea"
            :rows="6"
            placeholder="请详细描述您遇到的问题、使用场景或改进建议..."
            maxlength="2000"
            show-word-limit
            @input="onDescriptionInput"
          />
        </el-form-item>

        <!-- 严重程度 -->
        <el-form-item label="严重程度" prop="severity">
          <el-radio-group v-model="feedbackForm.severity">
            <el-radio label="low">低</el-radio>
            <el-radio label="medium">中</el-radio>
            <el-radio label="high">高</el-radio>
            <el-radio label="critical">紧急</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 附件上传 -->
        <el-form-item label="相关附件">
          <el-upload
            ref="uploadRef"
            class="feedback-upload"
            drag
            :auto-upload="false"
            :limit="5"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :before-upload="beforeUpload"
            accept="image/*,video/*,.pdf,.doc,.docx"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              将文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持图片、视频、PDF、Word文档，单个文件不超过10MB，最多5个文件
              </div>
            </template>
          </el-upload>

          <!-- 上传进度 -->
          <div v-if="uploadProgress > 0" class="upload-progress">
            <el-progress
              :percentage="uploadProgress"
              :status="uploadProgress === 100 ? 'success' : 'active'"
            />
          </div>
        </el-form-item>

        <!-- 标签 -->
        <el-form-item label="标签">
          <el-tag
            v-for="tag in feedbackForm.tags"
            :key="tag"
            closable
            @close="removeTag(tag)"
            style="margin-right: 8px; margin-bottom: 8px"
          >
            {{ tag }}
          </el-tag>
          <el-input
            v-if="inputVisible"
            ref="inputRef"
            v-model="inputValue"
            class="input-new-tag"
            size="small"
            @keyup.enter="handleInputConfirm"
            @blur="handleInputConfirm"
          />
          <el-button
            v-else
            class="button-new-tag"
            size="small"
            @click="showInput"
          >
            + 新标签
          </el-button>
        </el-form-item>

        <!-- 联系方式 -->
        <el-form-item label="联系方式（选填）">
          <el-input
            v-model="feedbackForm.contact"
            placeholder="手机号或邮箱，方便我们与您联系"
          />
        </el-form-item>

        <!-- 操作按钮 -->
        <el-form-item>
          <el-button
            type="primary"
            :loading="submitting"
            @click="submitFeedback"
          >
            提交反馈
          </el-button>
          <el-button @click="resetForm">重置</el-button>
          <el-button type="text" @click="saveDraft">保存草稿</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 历史反馈 -->
    <el-card v-if="feedbackHistory.length > 0" class="history-card">
      <template #header>
        <div class="card-header">
          <span>我的反馈历史</span>
          <el-button type="text" @click="viewAllHistory">查看全部</el-button>
        </div>
      </template>

      <el-timeline>
        <el-timeline-item
          v-for="item in feedbackHistory.slice(0, 3)"
          :key="item.feedbackId"
          :timestamp="formatDate(item.createdAt)"
          :type="getStatusType(item.status)"
        >
          <div class="history-item">
            <div class="history-title">{{ item.title }}</div>
            <div class="history-category">{{ getCategoryLabel(item.category) }}</div>
            <div class="history-status">
              <el-tag :type="getStatusTagType(item.status)" size="small">
                {{ getStatusText(item.status) }}
              </el-tag>
            </div>
            <el-button
              type="text"
              size="small"
              @click="viewFeedbackDetail(item.feedbackId)"
            >
              查看详情
            </el-button>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-card>

    <!-- 快速反馈 -->
    <div class="quick-feedback">
      <h3>快速反馈</h3>
      <div class="quick-buttons">
        <el-button
          v-for="quick in quickFeedbackOptions"
          :key="quick.type"
          :type="quick.type"
          :icon="quick.icon"
          @click="quickFeedback(quick)"
        >
          {{ quick.label }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import userFeedbackService from '@/services/userFeedbackService'
import { validateInput, sanitizeHtml, escapeHtml } from '@/utils/xssProtection'

const router = useRouter()

// 表单引用
const feedbackFormRef = ref(null)
const uploadRef = ref(null)
const inputRef = ref(null)

// 表单数据
const feedbackForm = reactive({
  category: '',
  title: '',
  description: '',
  severity: 'medium',
  tags: [],
  contact: '',
  attachments: []
})

// 表单验证规则
const feedbackRules = {
  category: [
    { required: true, message: '请选择反馈类型', trigger: 'change' }
  ],
  title: [
    { required: true, message: '请填写反馈标题', trigger: 'blur' },
    { min: 5, max: 100, message: '标题长度在 5 到 100 个字符', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请填写详细描述', trigger: 'blur' },
    { min: 10, max: 2000, message: '描述长度在 10 到 2000 个字符', trigger: 'blur' }
  ]
}

// 分类选项
const categoryOptions = [
  { value: 'bug_report', label: 'Bug报告', description: '系统异常、功能错误' },
  { value: 'feature_request', label: '功能需求', description: '新功能建议' },
  { value: 'improvement', label: '改进建议', description: '体验优化建议' },
  { value: 'complaint', label: '投诉', description: '服务或产品投诉' },
  { value: 'compliment', label: '表扬', description: '正面反馈和建议' },
  { value: 'question', label: '咨询', description: '使用问题咨询' },
  { value: 'usage_difficulty', label: '使用困难', description: '操作复杂或不清晰' }
]

// 状态变量
const submitting = ref(false)
const uploadProgress = ref(0)
const feedbackHistory = ref([])
const suggestedCategory = ref({ category: '', confidence: 0 })

// 标签输入
const inputVisible = ref(false)
const inputValue = ref('')

// 快速反馈选项
const quickFeedbackOptions = [
  { type: 'danger', label: '系统崩溃', icon: 'Warning', category: 'bug_report', severity: 'critical' },
  { type: 'warning', label: '功能异常', icon: 'CircleClose', category: 'bug_report', severity: 'high' },
  { type: 'info', label: '功能建议', icon: 'Plus', category: 'feature_request', severity: 'medium' },
  { type: 'success', label: '使用体验', icon: 'Star', category: 'improvement', severity: 'low' }
]

// 组件挂载时
onMounted(() => {
  loadFeedbackHistory()
  loadDraft()

  // 设置上传进度回调
  userFeedbackService.setProgressCallback((type, progress) => {
    if (type === 'submit') {
      uploadProgress.value = progress
    }
  })
})

// 分类改变
const onCategoryChange = () => {
  // 根据分类设置默认严重程度
  if (feedbackForm.category === 'bug_report') {
    feedbackForm.severity = 'high'
  } else if (feedbackForm.category === 'compliment') {
    feedbackForm.severity = 'low'
  }
}

// 标题输入
const onTitleInput = () => {
  updateSuggestedCategory()
}

// 描述输入
const onDescriptionInput = () => {
  updateSuggestedCategory()
}

// 更新智能分类建议
const updateSuggestedCategory = () => {
  if (feedbackForm.title || feedbackForm.description) {
    suggestedCategory.value = userFeedbackService.suggestCategory(
      feedbackForm.title,
      feedbackForm.description
    )
  }
}

// 应用建议分类
const applySuggestedCategory = () => {
  feedbackForm.category = suggestedCategory.value.category
  onCategoryChange()
}

// 文件改变
const handleFileChange = (file) => {
  if (file.raw) {
    feedbackForm.attachments.push({
      name: file.name,
      file: file.raw,
      size: file.size,
      type: file.raw.type
    })
  }
}

// 文件移除
const handleFileRemove = (file) => {
  const index = feedbackForm.attachments.findIndex(item => item.name === file.name)
  if (index > -1) {
    feedbackForm.attachments.splice(index, 1)
  }
}

// 上传前验证
const beforeUpload = (file) => {
  const isValidType = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/avi', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)
  const isValidSize = file.size / 1024 / 1024 < 10

  if (!isValidType) {
    ElMessage.error('不支持的文件类型')
    return false
  }
  if (!isValidSize) {
    ElMessage.error('文件大小不能超过 10MB')
    return false
  }

  return false // 阻止自动上传
}

// 标签相关方法
const showInput = () => {
  inputVisible.value = true
  nextTick(() => {
    inputRef.value.focus()
  })
}

const handleInputConfirm = () => {
  if (inputValue.value && !feedbackForm.tags.includes(inputValue.value)) {
    feedbackForm.tags.push(inputValue.value)
  }
  inputVisible.value = false
  inputValue.value = ''
}

const removeTag = (tag) => {
  const index = feedbackForm.tags.indexOf(tag)
  if (index > -1) {
    feedbackForm.tags.splice(index, 1)
  }
}

// 提交反馈
const submitFeedback = async () => {
  try {
    // 表单验证
    await feedbackFormRef.value.validate()

    submitting.value = true

    // XSS安全验证
    const titleValidation = validateInput(feedbackForm.title)
    if (!titleValidation.valid) {
      ElMessage.error('标题包含不安全内容，请修改后重试')
      return
    }

    const descriptionValidation = validateInput(feedbackForm.description)
    if (!descriptionValidation.valid) {
      ElMessage.error('描述包含不安全内容，请修改后重试')
      return
    }

    // 准备安全的数据
    const safeFeedbackData = {
      ...feedbackForm,
      title: escapeHtml(feedbackForm.title),
      description: sanitizeHtml(feedbackForm.description, {
        allowedTags: ['p', 'br', 'strong', 'em', 'u'],
        allowedAttributes: []
      })
    }

    // 提交反馈
    const result = await userFeedbackService.submitFeedback(
      safeFeedbackData,
      feedbackForm.attachments.map(item => item.file)
    )

    ElMessage.success('反馈提交成功！我们会尽快处理')

    // 清除草稿
    localStorage.removeItem('feedback_draft')

    // 重置表单
    resetForm()

    // 更新历史记录
    await loadFeedbackHistory()

    // 跳转到反馈详情
    router.push(`/feedback/detail/${result.data.feedbackId}`)

  } catch (error) {
    console.error('提交反馈失败:', error)
  } finally {
    submitting.value = false
    uploadProgress.value = 0
  }
}

// 重置表单
const resetForm = () => {
  feedbackFormRef.value.resetFields()
  feedbackForm.attachments = []
  feedbackForm.tags = []
  suggestedCategory.value = { category: '', confidence: 0 }
  uploadRef.value?.clearFiles()
}

// 保存草稿
const saveDraft = () => {
  const draft = {
    ...feedbackForm,
    savedAt: new Date().toISOString()
  }
  localStorage.setItem('feedback_draft', JSON.stringify(draft))
  ElMessage.success('草稿已保存')
}

// 加载草稿
const loadDraft = () => {
  const draft = localStorage.getItem('feedback_draft')
  if (draft) {
    try {
      const draftData = JSON.parse(draft)
      Object.assign(feedbackForm, draftData)

      ElMessageBox.confirm(
        '检测到未完成的反馈草稿，是否恢复？',
        '恢复草稿',
        {
          confirmButtonText: '恢复',
          cancelButtonText: '删除',
          type: 'info'
        }
      ).then(() => {
        ElMessage.success('草稿已恢复')
      }).catch(() => {
        localStorage.removeItem('feedback_draft')
        resetForm()
      })
    } catch (error) {
      console.error('加载草稿失败:', error)
    }
  }
}

// 加载反馈历史
const loadFeedbackHistory = async () => {
  try {
    const result = await userFeedbackService.getUserFeedbackHistory('', { limit: 5 })
    if (result.success) {
      feedbackHistory.value = result.data.feedbacks
    }
  } catch (error) {
    console.error('加载反馈历史失败:', error)
  }
}

// 查看全部历史
const viewAllHistory = () => {
  router.push('/feedback/history')
}

// 查看反馈详情
const viewFeedbackDetail = (feedbackId) => {
  router.push(`/feedback/detail/${feedbackId}`)
}

// 快速反馈
const quickFeedback = (quick) => {
  feedbackForm.category = quick.category
  feedbackForm.severity = quick.severity
  feedbackForm.title = quick.label

  // 根据类型预设描述
  const descriptions = {
    '系统崩溃': '我在使用系统时遇到了崩溃问题，请尽快修复。',
    '功能异常': '某个功能出现了异常，无法正常使用。',
    '功能建议': '我希望系统能够增加以下功能...',
    '使用体验': '关于系统使用体验，我有以下建议...'
  }

  feedbackForm.description = descriptions[quick.label] || ''
  onCategoryChange()
}

// 工具方法
const getCategoryLabel = (category) => {
  const option = categoryOptions.find(opt => opt.value === category)
  return option ? option.label : category
}

const getStatusType = (status) => {
  const statusTypes = {
    pending: '',
    in_review: 'primary',
    in_progress: 'warning',
    resolved: 'success',
    closed: 'info',
    rejected: 'danger'
  }
  return statusTypes[status] || ''
}

const getStatusTagType = (status) => {
  const statusTypes = {
    pending: 'info',
    in_review: 'primary',
    in_progress: 'warning',
    resolved: 'success',
    closed: 'info',
    rejected: 'danger'
  }
  return statusTypes[status] || 'info'
}

const getStatusText = (status) => {
  const statusTexts = {
    pending: '待处理',
    in_review: '审核中',
    in_progress: '处理中',
    resolved: '已解决',
    closed: '已关闭',
    rejected: '已拒绝'
  }
  return statusTexts[status] || status
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}
</script>

<style scoped>
.feedback-submission {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.feedback-header {
  text-align: center;
  margin-bottom: 30px;
}

.feedback-header h2 {
  color: #303133;
  margin-bottom: 10px;
}

.feedback-header p {
  color: #606266;
  font-size: 14px;
}

.feedback-form-card {
  margin-bottom: 30px;
}

.feedback-upload {
  width: 100%;
}

.upload-progress {
  margin-top: 10px;
}

.input-new-tag {
  width: 100px;
  margin-left: 10px;
  vertical-align: bottom;
}

.button-new-tag {
  margin-left: 10px;
  height: 32px;
  line-height: 30px;
  padding-top: 0;
  padding-bottom: 0;
}

.history-card {
  margin-bottom: 30px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-item {
  margin-bottom: 10px;
}

.history-title {
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.history-category {
  color: #909399;
  font-size: 12px;
  margin-bottom: 5px;
}

.history-status {
  margin-bottom: 8px;
}

.quick-feedback {
  background-color: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
}

.quick-feedback h3 {
  margin-bottom: 15px;
  color: #303133;
}

.quick-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .feedback-submission {
    padding: 10px;
  }

  .quick-buttons {
    flex-direction: column;
  }

  .quick-buttons .el-button {
    width: 100%;
  }
}
</style>