<!-- 内部备注对话框组件 -->
<template>
  <el-dialog
    v-model="visible"
    title="添加内部备注"
    width="500px"
    :before-close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
    >
      <el-form-item label="反馈ID">
        <el-input :value="feedback?.feedbackId" disabled />
      </el-form-item>

      <el-form-item label="反馈标题">
        <el-input :value="feedback?.title" disabled />
      </el-form-item>

      <el-form-item label="备注类型" prop="type">
        <el-select
          v-model="form.type"
          placeholder="选择备注类型"
          style="width: 100%"
        >
          <el-option
            v-for="type in noteTypes"
            :key="type.value"
            :label="type.label"
            :value="type.value"
          >
            <el-tag :type="type.tagType" size="small">
              {{ type.label }}
            </el-tag>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="备注内容" prop="content">
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="4"
          placeholder="请输入备注内容"
          maxlength="1000"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="相关链接">
        <el-input
          v-model="form.relatedLink"
          placeholder="输入相关链接（可选）"
        >
          <template #append>
            <el-button
              v-if="form.relatedLink"
              @click="openLink"
              icon="Link"
            >
              打开
            </el-button>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item label="提醒设置">
        <div class="reminder-settings">
          <el-switch
            v-model="form.setReminder"
            active-text="设置提醒"
            inactive-text="不提醒"
          />

          <div v-if="form.setReminder" class="reminder-time">
            <el-date-picker
              v-model="form.reminderTime"
              type="datetime"
              placeholder="选择提醒时间"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm:ss"
              :disabled-date="disabledDate"
            />
          </div>
        </div>
      </el-form-item>

      <el-form-item label="可见范围">
        <el-radio-group v-model="form.visibility">
          <el-radio label="private">仅自己可见</el-radio>
          <el-radio label="team">团队可见</el-radio>
          <el-radio label="admin">管理员可见</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button
        type="primary"
        :loading="submitting"
        @click="submitNote"
      >
        添加备注
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { feedbackApi } from '@/api/feedbackApi'
import { formatDate } from '@/utils/dateUtils'

// Props & Emits
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  feedback: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

// 响应式数据
const visible = ref(false)
const formRef = ref()
const submitting = ref(false)

// 表单数据
const form = reactive({
  type: '',
  content: '',
  relatedLink: '',
  setReminder: false,
  reminderTime: '',
  visibility: 'team'
})

// 备注类型选项
const noteTypes = [
  { label: '问题分析', value: 'analysis', tagType: 'primary' },
  { label: '处理进展', value: 'progress', tagType: 'success' },
  { label: '待办事项', value: 'todo', tagType: 'warning' },
  { label: '重要提醒', value: 'reminder', tagType: 'danger' },
  { label: '参考资料', value: 'reference', tagType: 'info' },
  { label: '其他', value: 'other', tagType: '' }
]

// 验证规则
const rules = computed(() => ({
  type: [
    { required: true, message: '请选择备注类型', trigger: 'change' }
  ],
  content: [
    { required: true, message: '请输入备注内容', trigger: 'blur' },
    { min: 5, message: '备注内容至少5个字符', trigger: 'blur' }
  ]
}))

// 方法
const handleClose = () => {
  emit('update:modelValue', false)
  resetForm()
}

const resetForm = () => {
  Object.assign(form, {
    type: '',
    content: '',
    relatedLink: '',
    setReminder: false,
    reminderTime: '',
    visibility: 'team'
  })
  formRef.value?.resetFields()
}

const disabledDate = (time) => {
  // 只能选择今天及之后的时间
  return time.getTime() < Date.now() - 8.64e7
}

const openLink = () => {
  if (form.relatedLink) {
    window.open(form.relatedLink, '_blank')
  }
}

const submitNote = async () => {
  try {
    await formRef.value.validate()

    submitting.value = true

    const data = {
      response: `[${getNoteTypeLabel(form.type)}] ${form.content}`,
      isInternal: true,
      noteType: form.type,
      relatedLink: form.relatedLink,
      visibility: form.visibility
    }

    // 如果设置了提醒，添加提醒信息
    if (form.setReminder && form.reminderTime) {
      data.reminder = {
        time: form.reminderTime,
        message: `提醒：${feedback?.title} - ${getNoteTypeLabel(form.type)}`
      }
    }

    await feedbackApi.processFeedback(props.feedback.feedbackId, data)

    ElMessage.success('内部备注添加成功')
    emit('success')
    handleClose()
  } catch (error) {
    ElMessage.error('添加备注失败')
    console.error('添加备注失败:', error)
  } finally {
    submitting.value = false
  }
}

// 辅助方法
const getNoteTypeLabel = (type) => {
  const option = noteTypes.find(opt => opt.value === type)
  return option ? option.label : type
}

// 监听器
watch(
  () => props.modelValue,
  (val) => {
    visible.value = val
  },
  { immediate: true }
)

watch(
  visible,
  (val) => {
    emit('update:modelValue', val)
    if (!val) {
      resetForm()
    }
  }
)
</script>

<style lang="scss" scoped>
.reminder-settings {
  .reminder-time {
    margin-top: 12px;
  }
}
</style>