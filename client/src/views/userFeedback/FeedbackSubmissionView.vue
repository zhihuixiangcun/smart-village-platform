<!-- 用户反馈提交页面 -->
<template>
  <div class="feedback-submission">
    <el-card class="submission-card">
      <template #header>
        <div class="card-header">
          <h2>提交反馈</h2>
          <p>您的反馈对我们非常重要，帮助我们不断改进服务质量</p>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        :label-position="isMobile ? 'top' : 'right'"
      >
        <el-form-item label="反馈类型" prop="category">
          <el-select
            v-model="form.category"
            placeholder="请选择反馈类型"
            style="width: 100%"
            @change="handleCategoryChange"
          >
            <el-option
              v-for="category in categoryOptions"
              :key="category.value"
              :label="category.label"
              :value="category.value"
            >
              <div class="category-option">
                <el-icon class="category-icon">
                  <component :is="category.icon" />
                </el-icon>
                <div class="category-info">
                  <span class="category-label">{{ category.label }}</span>
                  <span class="category-desc">{{ category.description }}</span>
                </div>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="反馈标题" prop="title">
          <el-input
            v-model="form.title"
            placeholder="请简要描述您的反馈（10-100个字符）"
            maxlength="100"
            show-word-limit
            clearable
          />
        </el-form-item>

        <el-form-item label="详细描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="6"
            placeholder="请详细描述您遇到的问题或建议（20-2000个字符）"
            maxlength="2000"
            show-word-limit
          />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="严重程度">
              <el-select
                v-model="form.severity"
                placeholder="请选择严重程度"
                style="width: 100%"
              >
                <el-option
                  v-for="severity in severityOptions"
                  :key="severity.value"
                  :label="severity.label"
                  :value="severity.value"
                >
                  <el-tag :type="severity.tagType" size="small">
                    {{ severity.label }}
                  </el-tag>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12">
            <el-form-item label="优先级">
              <el-select
                v-model="form.priority"
                placeholder="请选择优先级"
                style="width: 100%"
              >
                <el-option
                  v-for="priority in priorityOptions"
                  :key="priority.value"
                  :label="priority.label"
                  :value="priority.value"
                >
                  <el-tag :type="priority.tagType" size="small">
                    {{ priority.label }}
                  </el-tag>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="相关页面">
          <el-input
            v-model="form.context?.page"
            placeholder="请输入相关页面路径（可选）"
          >
            <template #prepend>
              <el-icon><Location /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="操作步骤">
          <el-input
            v-model="form.context?.action"
            type="textarea"
            :rows="3"
            placeholder="请描述问题发生的操作步骤（可选）"
          />
        </el-form-item>

        <el-form-item label="标签">
          <el-select
            v-model="form.tags"
            multiple
            filterable
            allow-create
            placeholder="输入或选择标签，按回车添加"
            style="width: 100%"
          >
            <el-option
              v-for="tag in commonTags"
              :key="tag"
              :label="tag"
              :value="tag"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="附件上传">
          <el-upload
            ref="uploadRef"
            v-model:file-list="fileList"
            class="feedback-upload"
            drag
            multiple
            :limit="5"
            :on-exceed="handleExceed"
            :before-upload="beforeUpload"
            :on-remove="handleRemove"
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
        </el-form-item>

        <el-form-item>
          <div class="submission-actions">
            <el-checkbox v-model="form.agreed">
              我已阅读并同意
              <el-link type="primary" @click="showTerms = true">《反馈条款》</el-link>
            </el-checkbox>
          </div>
        </el-form-item>

        <el-form-item>
          <div class="form-actions">
            <el-button size="large" @click="resetForm">重置</el-button>
            <el-button
              type="primary"
              size="large"
              :loading="submitting"
              @click="submitFeedback"
            >
              提交反馈
            </el-button>
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 反馈条款对话框 -->
    <el-dialog
      v-model="showTerms"
      title="反馈条款"
      width="600px"
    >
      <div class="terms-content">
        <h4>1. 反馈内容规范</h4>
        <p>请您提交真实、客观的反馈内容，避免包含恶意攻击、诽谤、辱骂等不当言论。</p>

        <h4>2. 隐私保护</h4>
        <p>我们承诺对您的个人信息进行严格保密，仅用于处理反馈和改进服务。请避免在反馈中包含敏感个人信息。</p>

        <h4>3. 处理时效</h4>
        <p>我们将在收到反馈后尽快处理，一般问题将在3-5个工作日内回复您，复杂问题可能需要更长时间。</p>

        <h4>4. 知识产权</h4>
        <p>您提交的反馈内容，我们有权用于改进产品和服务。感谢您的支持与理解。</p>
      </div>

      <template #footer>
        <el-button type="primary" @click="showTerms = false">我已了解</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Location,
  UploadFilled,
  Warning,
  Tools,
  Star,
  Document,
  QuestionFilled
} from '@element-plus/icons-vue'
import { feedbackApi } from '@/api/feedbackApi'
import { useUserStore } from '@/stores/userStore'
import { useBreakpoints } from '@vueuse/core'

// Store
const userStore = useUserStore()

// 响应式数据
const breakpoints = useBreakpoints({
  mobile: 768
})
const isMobile = breakpoints.smaller('mobile')

const formRef = ref()
const uploadRef = ref()
const submitting = ref(false)
const showTerms = ref(false)
const fileList = ref([])

// 表单数据
const form = reactive({
  category: '',
  title: '',
  description: '',
  severity: 'medium',
  priority: 'medium',
  tags: [],
  context: {
    page: '',
    action: ''
  },
  agreed: false
})

// 选项数据
const categoryOptions = [
  {
    label: 'Bug报告',
    value: 'bug_report',
    description: '系统故障、功能异常等问题',
    icon: Warning
  },
  {
    label: '功能请求',
    value: 'feature_request',
    description: '希望新增的功能或改进',
    icon: Tools
  },
  {
    label: '改进建议',
    value: 'improvement',
    description: '对现有功能的优化建议',
    icon: Star
  },
  {
    label: '投诉',
    value: 'complaint',
    description: '服务或体验的不满',
    icon: Document
  },
  {
    label: '表扬',
    value: 'compliment',
    description: '对服务的肯定和赞扬',
    icon: Star
  },
  {
    label: '问题咨询',
    value: 'question',
    description: '使用中遇到的疑问',
    icon: QuestionFilled
  },
  {
    label: '使用困难',
    value: 'usage_difficulty',
    description: '操作不便或理解困难',
    icon: QuestionFilled
  }
]

const severityOptions = [
  { label: '低', value: 'low', tagType: 'info' },
  { label: '中', value: 'medium', tagType: 'primary' },
  { label: '高', value: 'high', tagType: 'warning' },
  { label: '紧急', value: 'critical', tagType: 'danger' }
]

const priorityOptions = [
  { label: '低', value: 'low', tagType: 'info' },
  { label: '中', value: 'medium', tagType: 'primary' },
  { label: '高', value: 'high', tagType: 'warning' },
  { label: '紧急', value: 'urgent', tagType: 'danger' }
]

const commonTags = [
  '界面问题',
  '功能问题',
  '性能问题',
  '兼容性',
  '易用性',
  '文档建议',
  '其他'
]

// 验证规则
const rules = computed(() => ({
  category: [
    { required: true, message: '请选择反馈类型', trigger: 'change' }
  ],
  title: [
    { required: true, message: '请输入反馈标题', trigger: 'blur' },
    { min: 10, max: 100, message: '标题长度应在10-100个字符', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入详细描述', trigger: 'blur' },
    { min: 20, max: 2000, message: '描述长度应在20-2000个字符', trigger: 'blur' }
  ]
}))

// 方法
const handleCategoryChange = (value) => {
  // 根据类别自动设置默认严重程度和优先级
  const categoryDefaults = {
    bug_report: { severity: 'high', priority: 'high' },
    feature_request: { severity: 'low', priority: 'medium' },
    improvement: { severity: 'medium', priority: 'medium' },
    complaint: { severity: 'high', priority: 'urgent' },
    compliment: { severity: 'low', priority: 'low' },
    question: { severity: 'medium', priority: 'medium' },
    usage_difficulty: { severity: 'medium', priority: 'high' }
  }

  if (categoryDefaults[value]) {
    form.severity = categoryDefaults[value].severity
    form.priority = categoryDefaults[value].priority
  }
}

const handleExceed = (files, fileList) => {
  ElMessage.warning(`最多只能上传5个文件，当前选择了 ${files.length} 个文件`)
}

const beforeUpload = (file) => {
  // 检查文件大小
  const isLt10M = file.size / 1024 / 1024 < 10
  if (!isLt10M) {
    ElMessage.error('上传文件大小不能超过10MB')
    return false
  }

  // 检查文件类型
  const allowedTypes = ['image/', 'video/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  const isValidType = allowedTypes.some(type => file.type.includes(type))
  if (!isValidType) {
    ElMessage.error('只支持上传图片、视频、PDF和Word文档')
    return false
  }

  return false // 阻止自动上传，改为手动上传
}

const handleRemove = (file, fileList) => {
  // 文件移除时的处理
}

const resetForm = () => {
  formRef.value?.resetFields()
  Object.assign(form, {
    category: '',
    title: '',
    description: '',
    severity: 'medium',
    priority: 'medium',
    tags: [],
    context: {
      page: '',
      action: ''
    },
    agreed: false
  })
  fileList.value = []
  uploadRef.value?.clearFiles()
}

const submitFeedback = async () => {
  try {
    // 验证表单
    await formRef.value.validate()

    // 检查是否同意条款
    if (!form.agreed) {
      ElMessage.warning('请先阅读并同意反馈条款')
      return
    }

    // 确认提交
    await ElMessageBox.confirm(
      '确定要提交反馈吗？提交后我们将尽快处理。',
      '确认提交',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    submitting.value = true

    // 准备提交数据
    const submitData = {
      ...form,
      context: {
        page: form.context.page || window.location.pathname,
        action: form.context.action
      }
    }

    // 提交反馈
    await feedbackApi.submitFeedback(submitData, fileList.value.map(file => file.raw))

    ElMessage.success('反馈提交成功！感谢您的宝贵意见。')

    // 跳转到反馈历史页面
    resetForm()

    // 可以根据需要跳转到反馈列表或历史页面
    // router.push('/feedback/history')

  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '提交失败，请重试')
      console.error('提交反馈失败:', error)
    }
  } finally {
    submitting.value = false
  }
}

// 生命周期
onMounted(() => {
  // 获取当前页面路径作为默认值
  form.context.page = window.location.pathname
})
</script>

<style lang="scss" scoped>
.feedback-submission {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;

  .submission-card {
    .card-header {
      text-align: center;
      margin-bottom: 30px;

      h2 {
        margin: 0 0 10px 0;
        color: #303133;
      }

      p {
        margin: 0;
        color: #909399;
        font-size: 14px;
      }
    }

    .category-option {
      display: flex;
      align-items: center;
      gap: 12px;

      .category-icon {
        font-size: 18px;
        color: #409eff;
      }

      .category-info {
        .category-label {
          display: block;
          font-weight: 500;
        }

        .category-desc {
          display: block;
          font-size: 12px;
          color: #909399;
          margin-top: 2px;
        }
      }
    }

    .feedback-upload {
      width: 100%;
    }

    .submission-actions {
      text-align: center;
    }

    .form-actions {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-top: 20px;
    }
  }
}

.terms-content {
  h4 {
    margin: 20px 0 10px 0;
    color: #303133;
  }

  p {
    margin: 0 0 15px 0;
    color: #606266;
    line-height: 1.6;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .feedback-submission {
    padding: 10px;

    .submission-card {
      .card-header {
        h2 {
          font-size: 20px;
        }
      }

      .form-actions {
        flex-direction: column;
        align-items: center;

        .el-button {
          width: 200px;
        }
      }
    }
  }
}
</style>