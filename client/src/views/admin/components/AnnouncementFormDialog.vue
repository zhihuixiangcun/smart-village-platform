<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="90%"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    class="announcement-form-dialog"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
      class="announcement-form"
    >
      <!-- 基础信息 -->
      <div class="form-section">
        <h3 class="section-title">基础信息</h3>

        <el-row :gutter="20">
          <el-col :span="16">
            <el-form-item label="公告标题" prop="title">
              <el-input
                v-model="form.title"
                placeholder="请输入公告标题（1-200字符）"
                maxlength="200"
                show-word-limit
                size="large"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="发布状态" prop="status">
              <el-select v-model="form.status" placeholder="选择状态" style="width: 100%">
                <el-option label="草稿" value="draft" />
                <el-option label="立即发布" value="published" />
                <el-option label="定时发布" value="scheduled" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="公告分类" prop="category">
              <el-select v-model="form.category" placeholder="选择分类" style="width: 100%">
                <el-option
                  v-for="category in categories"
                  :key="category.value"
                  :label="category.label"
                  :value="category.value"
                >
                  <span class="category-option">
                    <span class="category-icon">{{ category.icon }}</span>
                    <span>{{ category.label }}</span>
                  </span>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="优先级" prop="priority">
              <el-select v-model="form.priority" placeholder="选择优先级" style="width: 100%">
                <el-option label="紧急" value="emergency">
                  <span class="priority-option emergency">🚨 紧急</span>
                </el-option>
                <el-option label="重要" value="urgent">
                  <span class="priority-option urgent">⚡ 重要</span>
                </el-option>
                <el-option label="高" value="high">
                  <span class="priority-option high">🔴 高</span>
                </el-option>
                <el-option label="普通" value="normal">
                  <span class="priority-option normal">🔵 普通</span>
                </el-option>
                <el-option label="低" value="low">
                  <span class="priority-option low">⚫ 低</span>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="公告类型" prop="type">
              <el-select v-model="form.type" placeholder="选择类型" style="width: 100%">
                <el-option label="公告" value="announcement" />
                <el-option label="通知" value="notice" />
                <el-option label="紧急通知" value="emergency" />
                <el-option label="活动" value="activity" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20" v-if="form.status === 'scheduled'">
          <el-col :span="12">
            <el-form-item label="定时发布" prop="scheduledTime">
              <el-date-picker
                v-model="form.scheduledTime"
                type="datetime"
                placeholder="选择发布时间"
                style="width: 100%"
                :disabled-date="disabledDate"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="过期时间" prop="expiryTime">
              <el-date-picker
                v-model="form.expiryTime"
                type="datetime"
                placeholder="选择过期时间（可选）"
                style="width: 100%"
                :disabled-date="disabledDate"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="标签">
          <el-tag
            v-for="tag in form.tags"
            :key="tag"
            closable
            @close="removeTag(tag)"
            class="tag-item"
          >
            {{ tag }}
          </el-tag>
          <el-input
            v-if="tagInputVisible"
            ref="tagInputRef"
            v-model="tagInputValue"
            size="small"
            style="width: 120px"
            @keyup.enter="addTag"
            @blur="addTag"
          />
          <el-button v-else @click="showTagInput" size="small" type="primary" plain>
            + 添加标签
          </el-button>
        </el-form-item>

        <el-form-item label="摘要">
          <el-input
            v-model="form.summary"
            type="textarea"
            :rows="3"
            placeholder="请输入公告摘要（可选，不填写将自动生成）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </div>

      <!-- 内容编辑 -->
      <div class="form-section">
        <h3 class="section-title">公告内容</h3>

        <el-form-item prop="content">
          <rich-text-editor
            v-model="form.content"
            :height="400"
            placeholder="请输入公告内容..."
            :upload-url="uploadUrl"
            @image-upload="handleImageUpload"
          />
        </el-form-item>
      </div>

      <!-- 可见性设置 -->
      <div class="form-section">
        <h3 class="section-title">可见性设置</h3>

        <el-form-item label="可见范围" prop="visibility">
          <el-radio-group v-model="form.visibility">
            <el-radio label="public">公开（所有人可见）</el-radio>
            <el-radio label="residents">仅村民可见</el-radio>
            <el-radio label="committee">仅村委可见</el-radio>
            <el-radio label="custom">自定义</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="form.visibility === 'custom'" label="指定用户">
          <user-selector
            v-model="form.visibleTo"
            multiple
            placeholder="选择可见用户"
          />
        </el-form-item>
      </div>

      <!-- 推送设置 -->
      <div class="form-section">
        <h3 class="section-title">推送设置</h3>

        <el-form-item label="推送渠道">
          <el-checkbox-group v-model="form.pushSettings.channels">
            <el-checkbox label="app">APP推送</el-checkbox>
            <el-checkbox label="sms">短信通知</el-checkbox>
            <el-checkbox label="wechat">微信通知</el-checkbox>
            <el-checkbox label="display">村内大屏</el-checkbox>
            <el-checkbox label="voice">语音播报</el-checkbox>
            <el-checkbox label="email">邮件通知</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="推送对象">
          <el-checkbox-group v-model="form.pushSettings.targetGroups">
            <el-checkbox label="all">全体村民</el-checkbox>
            <el-checkbox label="residents">普通村民</el-checkbox>
            <el-checkbox label="committee">村委会</el-checkbox>
            <el-checkbox label="elderly">老年人</el-checkbox>
            <el-checkbox label="youth">青年人</el-checkbox>
            <el-checkbox label="businesses">商户</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-collapse v-if="form.pushSettings.channels.includes('voice')">
          <el-collapse-item title="语音播报设置" name="voice">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="方言类型">
                  <el-select v-model="form.pushSettings.voiceSettings.dialect" placeholder="选择方言">
                    <el-option label="普通话" value="mandarin" />
                    <el-option label="粤语" value="cantonese" />
                    <el-option label="闽南语" value="minnan" />
                    <el-option label="客家话" value="hakka" />
                    <el-option label="本地方言" value="local" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="语速">
                  <el-slider
                    v-model="form.pushSettings.voiceSettings.speed"
                    :min="0.5"
                    :max="2"
                    :step="0.1"
                    show-input
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="音量">
                  <el-slider
                    v-model="form.pushSettings.voiceSettings.volume"
                    :min="0"
                    :max="100"
                    show-input
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </el-collapse-item>
        </el-collapse>
      </div>

      <!-- 附件管理 -->
      <div class="form-section">
        <h3 class="section-title">附件管理</h3>

        <el-form-item label="文件附件">
          <div class="attachment-upload">
            <el-upload
              ref="uploadRef"
              :action="uploadUrl"
              :on-success="handleAttachmentSuccess"
              :on-error="handleAttachmentError"
              :before-upload="beforeAttachmentUpload"
              :file-list="attachmentList"
              multiple
              drag
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">
                将文件拖到此处，或<em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  支持图片、视频、音频、文档等格式，单个文件不超过50MB
                </div>
              </template>
            </el-upload>
          </div>
        </el-form-item>

        <!-- 附件列表 -->
        <div v-if="form.attachments.length > 0" class="attachment-list">
          <div
            v-for="(attachment, index) in form.attachments"
            :key="index"
            class="attachment-item"
          >
            <div class="attachment-info">
              <el-icon class="attachment-icon">
                <component :is="getAttachmentIcon(attachment.type)" />
              </el-icon>
              <div class="attachment-details">
                <div class="attachment-name">{{ attachment.name }}</div>
                <div class="attachment-meta">
                  {{ formatFileSize(attachment.size) }} |
                  {{ formatTime(attachment.uploadTime) }}
                </div>
              </div>
            </div>
            <el-button
              @click="removeAttachment(index)"
              type="danger"
              size="small"
              circle
              :icon="Delete"
            />
          </div>
        </div>
      </div>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button @click="saveDraft" :loading="saving">保存草稿</el-button>
        <el-button @click="preview" type="info">预览</el-button>
        <el-button @click="submit" type="primary" :loading="saving">
          {{ form.status === 'published' ? '立即发布' : '确定' }}
        </el-button>
      </div>
    </template>

    <!-- 预览弹窗 -->
    <announcement-preview-dialog
      v-model="previewVisible"
      :announcement="form"
    />
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete, UploadFilled, Document, Picture, VideoPlay, Headphones } from '@element-plus/icons-vue'
import RichTextEditor from '@/components/common/RichTextEditor.vue'
import UserSelector from '@/components/common/UserSelector.vue'
import AnnouncementPreviewDialog from './AnnouncementPreviewDialog.vue'
import { useAnnouncementStore } from '@/stores/announcement'
import { formatTime, formatFileSize } from '@/utils/format'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  announcement: {
    type: Object,
    default: null
  },
  mode: {
    type: String,
    default: 'create' // create | edit
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'saved'])

// 公告分类配置
const categories = [
  { value: 'policy', label: '政策通知', icon: '📋' },
  { value: 'finance', label: '财务公示', icon: '💰' },
  { value: 'project', label: '项目进展', icon: '🏗️' },
  { value: 'safety', label: '安全提醒', icon: '⚠️' },
  { value: 'welfare', label: '民生福利', icon: '🏥' },
  { value: 'activity', label: '文化活动', icon: '🎉' },
  { value: 'emergency', label: '紧急通知', icon: '🚨' },
  { value: 'meeting', label: '会议通知', icon: '👥' },
  { value: 'service', label: '便民服务', icon: '🔧' },
  { value: 'other', label: '其他', icon: '📄' }
]

// Store
const announcementStore = useAnnouncementStore()

// 响应式数据
const formRef = ref()
const uploadRef = ref()
const tagInputRef = ref()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const title = computed(() => {
  return props.mode === 'create' ? '发布公告' : '编辑公告'
})

const uploadUrl = '/api/announcements/upload'

const saving = ref(false)
const previewVisible = ref(false)
const tagInputVisible = ref(false)
const tagInputValue = ref('')
const attachmentList = ref([])

// 表单数据
const defaultForm = {
  title: '',
  content: '',
  summary: '',
  category: '',
  priority: 'normal',
  type: 'announcement',
  status: 'published',
  tags: [],
  scheduledTime: null,
  expiryTime: null,
  visibility: 'public',
  visibleTo: [],
  pushSettings: {
    channels: ['app'],
    targetGroups: ['all'],
    voiceSettings: {
      enabled: false,
      dialect: 'mandarin',
      speed: 1.0,
      volume: 70
    }
  },
  attachments: []
}

const form = reactive({ ...defaultForm })

// 表单验证规则
const rules = {
  title: [
    { required: true, message: '请输入公告标题', trigger: 'blur' },
    { min: 1, max: 200, message: '标题长度在1到200个字符', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入公告内容', trigger: 'blur' },
    { min: 1, max: 50000, message: '内容长度在1到50000个字符', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '请选择公告分类', trigger: 'change' }
  ],
  priority: [
    { required: true, message: '请选择优先级', trigger: 'change' }
  ],
  type: [
    { required: true, message: '请选择公告类型', trigger: 'change' }
  ],
  status: [
    { required: true, message: '请选择发布状态', trigger: 'change' }
  ],
  scheduledTime: [
    {
      validator: (rule, value, callback) => {
        if (form.status === 'scheduled' && !value) {
          callback(new Error('定时发布需要选择发布时间'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ],
  visibility: [
    { required: true, message: '请选择可见范围', trigger: 'change' }
  ]
}

// 方法
const initForm = () => {
  if (props.announcement && props.mode === 'edit') {
    Object.assign(form, {
      ...defaultForm,
      ...props.announcement,
      scheduledTime: props.announcement.scheduledTime ? new Date(props.announcement.scheduledTime) : null,
      expiryTime: props.announcement.expiryTime ? new Date(props.announcement.expiryTime) : null
    })
  } else if (props.announcement && props.mode === 'create') {
    // 复制模式
    Object.assign(form, {
      ...defaultForm,
      ...props.announcement,
      id: undefined,
      title: props.announcement.title,
      status: 'draft',
      scheduledTime: null,
      expiryTime: null
    })
  } else {
    Object.assign(form, defaultForm)
  }
}

const disabledDate = (time) => {
  return time.getTime() < Date.now() - 24 * 60 * 60 * 1000
}

// 标签管理
const addTag = () => {
  const tag = tagInputValue.value.trim()
  if (tag && !form.tags.includes(tag)) {
    form.tags.push(tag)
  }
  tagInputValue.value = ''
  tagInputVisible.value = false
}

const removeTag = (tag) => {
  const index = form.tags.indexOf(tag)
  if (index > -1) {
    form.tags.splice(index, 1)
  }
}

const showTagInput = () => {
  tagInputVisible.value = true
  nextTick(() => {
    tagInputRef.value?.focus()
  })
}

// 附件管理
const handleImageUpload = (imageData) => {
  form.attachments.push({
    type: 'image',
    name: imageData.name,
    url: imageData.url,
    size: imageData.size,
    mimeType: imageData.mimeType,
    uploadTime: new Date()
  })
}

const beforeAttachmentUpload = (file) => {
  const isValidSize = file.size / 1024 / 1024 < 50
  if (!isValidSize) {
    ElMessage.error('文件大小不能超过50MB')
    return false
  }
  return true
}

const handleAttachmentSuccess = (response, file) => {
  if (response.success) {
    form.attachments.push({
      type: getFileTypeFromMime(file.raw.type),
      name: file.name,
      url: response.data.url,
      size: file.size,
      mimeType: file.raw.type,
      uploadTime: new Date()
    })
    ElMessage.success('文件上传成功')
  } else {
    ElMessage.error('文件上传失败')
  }
}

const handleAttachmentError = () => {
  ElMessage.error('文件上传失败')
}

const removeAttachment = (index) => {
  form.attachments.splice(index, 1)
}

const getFileTypeFromMime = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  return 'document'
}

const getAttachmentIcon = (type) => {
  const icons = {
    image: Picture,
    video: VideoPlay,
    audio: Headphones,
    document: Document
  }
  return icons[type] || Document
}

// 表单提交
const validateForm = async () => {
  if (!formRef.value) return false

  try {
    await formRef.value.validate()
    return true
  } catch (error) {
    ElMessage.error('请检查表单输入')
    return false
  }
}

const saveDraft = async () => {
  const isValid = await validateForm()
  if (!isValid) return

  saving.value = true
  try {
    const formData = {
      ...form,
      status: 'draft'
    }

    if (props.mode === 'edit') {
      await announcementStore.update(form.id, formData)
      ElMessage.success('草稿保存成功')
    } else {
      await announcementStore.create(formData)
      ElMessage.success('草稿创建成功')
    }

    emit('saved')
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const submit = async () => {
  const isValid = await validateForm()
  if (!isValid) return

  saving.value = true
  try {
    const formData = { ...form }

    if (props.mode === 'edit') {
      await announcementStore.update(form.id, formData)
      ElMessage.success('公告更新成功')
    } else {
      await announcementStore.create(formData)
      ElMessage.success(form.status === 'published' ? '公告发布成功' : '公告创建成功')
    }

    emit('saved')
  } catch (error) {
    ElMessage.error('操作失败')
  } finally {
    saving.value = false
  }
}

const preview = () => {
  previewVisible.value = true
}

const handleClose = () => {
  emit('update:modelValue', false)
}

// 监听器
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    initForm()
  }
})

watch(() => form.pushSettings.channels, (channels) => {
  if (channels.includes('voice')) {
    form.pushSettings.voiceSettings.enabled = true
  } else {
    form.pushSettings.voiceSettings.enabled = false
  }
})
</script>

<style lang="scss" scoped>
.announcement-form-dialog {
  .announcement-form {
    .form-section {
      margin-bottom: 32px;

      .section-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--text-color-primary);
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 2px solid var(--border-color-light);
      }
    }

    .category-option {
      display: flex;
      align-items: center;
      gap: 8px;

      .category-icon {
        font-size: 16px;
      }
    }

    .priority-option {
      &.emergency { color: #f56c6c; }
      &.urgent { color: #e6a23c; }
      &.high { color: #f56c6c; }
      &.normal { color: #409eff; }
      &.low { color: #909399; }
    }

    .tag-item {
      margin-right: 8px;
      margin-bottom: 8px;
    }

    .attachment-upload {
      width: 100%;

      :deep(.el-upload-dragger) {
        width: 100%;
        height: 120px;
      }
    }

    .attachment-list {
      margin-top: 16px;

      .attachment-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px;
        border: 1px solid var(--border-color-light);
        border-radius: 8px;
        margin-bottom: 8px;

        .attachment-info {
          display: flex;
          align-items: center;
          gap: 12px;

          .attachment-icon {
            font-size: 24px;
            color: var(--primary-color);
          }

          .attachment-details {
            .attachment-name {
              font-weight: 500;
              color: var(--text-color-primary);
            }

            .attachment-meta {
              font-size: 12px;
              color: var(--text-color-secondary);
              margin-top: 4px;
            }
          }
        }
      }
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .announcement-form-dialog {
    .announcement-form {
      .el-row {
        .el-col {
          margin-bottom: 16px;
        }
      }
    }

    .dialog-footer {
      flex-wrap: wrap;

      .el-button {
        flex: 1;
        min-width: 80px;
      }
    }
  }
}
</style>