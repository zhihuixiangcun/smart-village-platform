<!-- 分配处理人对话框组件 -->
<template>
  <el-dialog v-model="visible" title="分配处理人" width="500px" :before-close="handleClose">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="反馈ID">
        <el-input :value="feedback?.feedbackId" disabled />
      </el-form-item>

      <el-form-item label="反馈标题">
        <el-input :value="feedback?.title" disabled />
      </el-form-item>

      <el-form-item label="分配给" prop="assignedTo">
        <el-select
          v-model="form.assignedTo"
          placeholder="选择处理人"
          filterable
          remote
          :remote-method="searchUsers"
          :loading="searchingUsers"
          style="width: 100%"
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

      <el-form-item label="分配团队">
        <el-select v-model="form.assignedTeam" placeholder="选择团队（可选）" style="width: 100%">
          <el-option
            v-for="team in teamOptions"
            :key="team.value"
            :label="team.label"
            :value="team.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="优先级">
        <el-select v-model="form.priority" placeholder="选择优先级" style="width: 100%">
          <el-option
            v-for="priority in priorityOptions"
            :key="priority.value"
            :label="priority.label"
            :value="priority.value"
          >
            <el-tag :type="getPriorityTagType(priority.value)" size="small">
              {{ priority.label }}
            </el-tag>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="分配说明">
        <el-input
          v-model="form.response"
          type="textarea"
          :rows="3"
          placeholder="请输入分配说明（可选）"
        />
      </el-form-item>

      <el-form-item label="内部记录">
        <el-switch v-model="form.isInternal" active-text="是" inactive-text="否" />
        <div class="form-help">内部记录不会对用户可见</div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submitAssign"> 确认分配 </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { feedbackApi } from '@/api/feedbackApi';
import { userApi } from '@/api/userApi';

// Props & Emits
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  feedback: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue', 'success']);

// 响应式数据
const visible = ref(false);
const formRef = ref();
const submitting = ref(false);
const searchingUsers = ref(false);
const userOptions = ref([]);

// 表单数据
const form = reactive({
  assignedTo: '',
  assignedTeam: '',
  priority: '',
  response: '',
  isInternal: false,
});

// 选项数据
const priorityOptions = [
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' },
  { label: '紧急', value: 'urgent' },
];

const teamOptions = [
  { label: '技术团队', value: 'tech' },
  { label: '产品团队', value: 'product' },
  { label: '运营团队', value: 'operation' },
  { label: '客服团队', value: 'support' },
];

// 验证规则
const rules = computed(() => ({
  assignedTo: [{ required: true, message: '请选择处理人', trigger: 'change' }],
}));

// 方法
const handleClose = () => {
  emit('update:modelValue', false);
  resetForm();
};

const resetForm = () => {
  Object.assign(form, {
    assignedTo: '',
    assignedTeam: '',
    priority: '',
    response: '',
    isInternal: false,
  });
  formRef.value?.resetFields();
  userOptions.value = [];
};

const searchUsers = async query => {
  if (!query) {
    userOptions.value = [];
    return;
  }

  try {
    searchingUsers.value = true;
    const response = await userApi.searchUsers({ keyword: query, limit: 20 });
    userOptions.value = response.data.users;
  } catch (error) {
    console.error('搜索用户失败:', error);
  } finally {
    searchingUsers.value = false;
  }
};

const submitAssign = async () => {
  try {
    await formRef.value.validate();

    submitting.value = true;

    const data = {
      ...form,
      status: 'in_review', // 分配后自动变为审核中状态
      assignedTo: form.assignedTo,
      assignedTeam: form.assignedTeam,
    };

    await feedbackApi.processFeedback(props.feedback.feedbackId, data);

    ElMessage.success('分配成功');
    emit('success');
    handleClose();
  } catch (error) {
    ElMessage.error('分配失败');
    console.error('分配失败:', error);
  } finally {
    submitting.value = false;
  }
};

// 辅助方法
const getUserTypeLabel = userType => {
  const typeMap = {
    admin: '管理员',
    committee: '村委',
    resident: '村民',
    guest: '访客',
  };
  return typeMap[userType] || userType;
};

const getPriorityTagType = priority => {
  const typeMap = {
    low: 'info',
    medium: 'primary',
    high: 'warning',
    urgent: 'danger',
  };
  return typeMap[priority] || 'info';
};

// 监听器
watch(
  () => props.modelValue,
  val => {
    visible.value = val;
    if (val && props.feedback) {
      // 预填充数据
      form.assignedTo = props.feedback.assignedTo?._id || '';
      form.assignedTeam = props.feedback.assignedTeam || '';
      form.priority = props.feedback.priority || '';
    }
  },
  { immediate: true }
);

watch(visible, val => {
  emit('update:modelValue', val);
  if (!val) {
    resetForm();
  }
});
</script>

<style lang="scss" scoped>
.user-option {
  display: flex;
  align-items: center;
  gap: 8px;

  .user-type {
    color: #909399;
    font-size: 12px;
  }
}

.form-help {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
