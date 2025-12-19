<!-- 批量处理对话框组件 -->
<template>
  <el-dialog
    v-model="visible"
    title="批量处理反馈"
    width="600px"
    :before-close="handleClose"
  >
    <div class="batch-process">
      <!-- 已选择的反馈 -->
      <div class="selected-feedbacks">
        <h4>已选择 {{ feedbackIds.length }} 条反馈</h4>
        <el-scrollbar height="120px">
          <div class="feedback-list">
            <el-tag
              v-for="id in feedbackIds"
              :key="id"
              closable
              @close="removeFeedback(id)"
            >
              {{ id }}
            </el-tag>
          </div>
        </el-scrollbar>
      </div>

      <!-- 处理动作选择 -->
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
      >
        <el-form-item label="处理动作" prop="processAction">
          <el-select
            v-model="form.processAction"
            placeholder="选择处理动作"
            @change="handleActionChange"
          >
            <el-option
              label="分配处理人"
              value="assign"
            />
            <el-option
              label="更新状态"
              value="update_status"
            />
            <el-option
              label="添加标签"
              value="add_tags"
            />
            <el-option
              label="移除标签"
              value="remove_tags"
            />
          </el-select>
        </el-form-item>

        <!-- 分配处理人 -->
        <el-form-item
          v-if="form.processAction === 'assign'"
          label="分配给"
          prop="assignedTo"
        >
          <el-select
            v-model="form.processData.assignedTo"
            placeholder="选择处理人"
            filterable
            remote
            :remote-method="searchUsers"
            :loading="searchingUsers"
          >
            <el-option
              v-for="user in userOptions"
              :key="user._id"
              :label="user.profile?.displayName || user.username"
              :value="user._id"
            >
              <div class="user-option">
                <el-avatar :size="24" :src="user.profile?.avatar" />
                <span>{{ user.profile?.displayName || user.username }}</span>
                <span class="user-type">({{ getUserTypeLabel(user.profile?.userType) }})</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item
          v-if="form.processAction === 'assign'"
          label="分配团队"
        >
          <el-select
            v-model="form.processData.assignedTeam"
            placeholder="选择团队（可选）"
          >
            <el-option
              v-for="team in teamOptions"
              :key="team.value"
              :label="team.label"
              :value="team.value"
            />
          </el-select>
        </el-form-item>

        <!-- 更新状态 -->
        <el-form-item
          v-if="form.processAction === 'update_status'"
          label="新状态"
          prop="status"
        >
          <el-select v-model="form.processData.status" placeholder="选择状态">
            <el-option
              v-for="status in statusOptions"
              :key="status.value"
              :label="status.label"
              :value="status.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item
          v-if="form.processAction === 'update_status'"
          label="处理说明"
        >
          <el-input
            v-model="form.processData.response"
            type="textarea"
            :rows="3"
            placeholder="请输入处理说明（可选）"
          />
        </el-form-item>

        <!-- 添加/移除标签 -->
        <el-form-item
          v-if="form.processAction === 'add_tags' || form.processAction === 'remove_tags'"
          label="标签"
          prop="tags"
        >
          <el-select
            v-model="form.processData.tags"
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

        <!-- 批量操作备注 -->
        <el-form-item label="操作备注">
          <el-input
            v-model="form.processData.note"
            type="textarea"
            :rows="3"
            placeholder="记录批量操作的原因和说明（可选）"
          />
        </el-form-item>
      </el-form>

      <!-- 预览操作结果 -->
      <div v-if="form.processAction" class="preview-section">
        <h4>操作预览</h4>
        <el-alert
          :title="getPreviewText()"
          type="info"
          show-icon
          :closable="false"
        />
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button
        type="primary"
        :loading="submitting"
        @click="submitBatchProcess"
      >
        确认处理
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { feedbackApi } from '@/api/feedbackApi'
import { userApi } from '@/api/userApi'

// Props & Emits
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  feedbackIds: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

// 响应式数据
const visible = ref(false)
const formRef = ref()
const submitting = ref(false)
const searchingUsers = ref(false)
const userOptions = ref([])

// 表单数据
const form = reactive({
  processAction: '',
  processData: {
    assignedTo: '',
    assignedTeam: '',
    status: '',
    response: '',
    tags: [],
    note: ''
  }
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

const teamOptions = [
  { label: '技术团队', value: 'tech' },
  { label: '产品团队', value: 'product' },
  { label: '运营团队', value: 'operation' },
  { label: '客服团队', value: 'support' }
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
const rules = computed(() => {
  const baseRules = {
    processAction: [
      { required: true, message: '请选择处理动作', trigger: 'change' }
    ]
  }

  if (form.processAction === 'assign') {
    baseRules.assignedTo = [
      { required: true, message: '请选择处理人', trigger: 'change' }
    ]
  }

  if (form.processAction === 'update_status') {
    baseRules.status = [
      { required: true, message: '请选择新状态', trigger: 'change' }
    ]
  }

  if (form.processAction === 'add_tags' || form.processAction === 'remove_tags') {
    baseRules.tags = [
      { required: true, message: '请选择标签', trigger: 'change' }
    ]
  }

  return baseRules
})

// 方法
const handleClose = () => {
  emit('update:modelValue', false)
  resetForm()
}

const resetForm = () => {
  form.processAction = ''
  Object.assign(form.processData, {
    assignedTo: '',
    assignedTeam: '',
    status: '',
    response: '',
    tags: [],
    note: ''
  })
  formRef.value?.resetFields()
}

const handleActionChange = () => {
  // 清空相关数据
  form.processData.assignedTo = ''
  form.processData.assignedTeam = ''
  form.processData.status = ''
  form.processData.response = ''
  form.processData.tags = []
}

const removeFeedback = (id) => {
  const index = props.feedbackIds.indexOf(id)
  if (index > -1) {
    props.feedbackIds.splice(index, 1)
  }
}

const searchUsers = async (query) => {
  if (!query) {
    userOptions.value = []
    return
  }

  try {
    searchingUsers.value = true
    const response = await userApi.searchUsers({ keyword: query, limit: 20 })
    userOptions.value = response.data.users
  } catch (error) {
    console.error('搜索用户失败:', error)
  } finally {
    searchingUsers.value = false
  }
}

const submitBatchProcess = async () => {
  try {
    await formRef.value.validate()

    // 确认操作
    await ElMessageBox.confirm(
      `确定要对 ${props.feedbackIds.length} 条反馈执行批量操作吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    submitting.value = true

    const data = {
      feedbackIds: props.feedbackIds,
      processAction: form.processAction,
      processData: { ...form.processData }
    }

    await feedbackApi.batchProcessFeedback(data)

    ElMessage.success('批量处理成功')
    emit('success')
    handleClose()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量处理失败')
      console.error('批量处理失败:', error)
    }
  } finally {
    submitting.value = false
  }
}

const getPreviewText = () => {
  const actionTextMap = {
    assign: `将 ${props.feedbackIds.length} 条反馈分配给 ${getUserName(form.processData.assignedTo)}`,
    update_status: `将 ${props.feedbackIds.length} 条反馈状态更新为 ${getStatusLabel(form.processData.status)}`,
    add_tags: `为 ${props.feedbackIds.length} 条反馈添加标签：${form.processData.tags.join(', ')}`,
    remove_tags: `从 ${props.feedbackIds.length} 条反馈中移除标签：${form.processData.tags.join(', ')}`
  }

  return actionTextMap[form.processAction] || ''
}

// 辅助方法
const getUserName = (userId) => {
  const user = userOptions.value.find(u => u._id === userId)
  return user ? (user.profile?.displayName || user.username) : '未指定'
}

const getStatusLabel = (status) => {
  const option = statusOptions.find(opt => opt.value === status)
  return option ? option.label : status
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
.batch-process {
  .selected-feedbacks {
    margin-bottom: 24px;
    padding: 16px;
    background: #f9f9f9;
    border-radius: 8px;

    h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #606266;
    }

    .feedback-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .el-tag {
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }

  .user-option {
    display: flex;
    align-items: center;
    gap: 8px;

    .user-type {
      color: #909399;
      font-size: 12px;
    }
  }

  .preview-section {
    margin-top: 24px;
    padding: 16px;
    background: #f5f7fa;
    border-radius: 8px;

    h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #606266;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .batch-process {
    .selected-feedbacks {
      .feedback-list {
        .el-tag {
          max-width: 150px;
        }
      }
    }
  }
}
</style>