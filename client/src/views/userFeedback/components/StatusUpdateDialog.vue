<!-- 状态更新对话框组件 -->
<template>
  <el-dialog v-model="visible" title="更新反馈状态" width="500px" :before-close="handleClose">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="反馈ID">
        <el-input :value="feedback?.feedbackId" disabled />
      </el-form-item>

      <el-form-item label="反馈标题">
        <el-input :value="feedback?.title" disabled />
      </el-form-item>

      <el-form-item label="当前状态">
        <el-tag :type="getStatusTagType(feedback?.status)" size="small">
          {{ getStatusLabel(feedback?.status) }}
        </el-tag>
      </el-form-item>

      <el-form-item label="新状态" prop="status">
        <el-select v-model="form.status" placeholder="选择新状态" style="width: 100%">
          <el-option
            v-for="status in statusOptions"
            :key="status.value"
            :label="status.label"
            :value="status.value"
          >
            <el-tag :type="getStatusTagType(status.value)" size="small">
              {{ status.label }}
            </el-tag>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="处理回复" prop="response">
        <el-input
          v-model="form.response"
          type="textarea"
          :rows="4"
          placeholder="请输入处理回复内容"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="内部记录">
        <el-switch v-model="form.isInternal" active-text="是" inactive-text="否" />
        <div class="form-help">内部记录不会对用户可见</div>
      </el-form-item>

      <!-- 已解决状态时显示满意度评价选项 -->
      <el-form-item v-if="form.status === 'resolved'" label="请求评价">
        <el-switch v-model="form.requestSatisfaction" active-text="是" inactive-text="否" />
        <div class="form-help">解决后系统将自动发送满意度评价请求</div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submitStatus"> 确认更新 </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { feedbackApi } from '@/api/feedbackApi';

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

// 表单数据
const form = reactive({
  status: '',
  response: '',
  isInternal: false,
  requestSatisfaction: true,
});

// 状态选项
const statusOptions = [
  { label: '待处理', value: 'pending' },
  { label: '审核中', value: 'in_review' },
  { label: '处理中', value: 'in_progress' },
  { label: '已解决', value: 'resolved' },
  { label: '已关闭', value: 'closed' },
  { label: '已拒绝', value: 'rejected' },
];

// 验证规则
const rules = computed(() => ({
  status: [{ required: true, message: '请选择新状态', trigger: 'change' }],
  response: [
    { required: true, message: '请输入处理回复', trigger: 'blur' },
    { min: 10, message: '处理回复至少10个字符', trigger: 'blur' },
  ],
}));

// 方法
const handleClose = () => {
  emit('update:modelValue', false);
  resetForm();
};

const resetForm = () => {
  Object.assign(form, {
    status: '',
    response: '',
    isInternal: false,
    requestSatisfaction: true,
  });
  formRef.value?.resetFields();
};

const submitStatus = async () => {
  try {
    await formRef.value.validate();

    submitting.value = true;

    const data = {
      status: form.status,
      response: form.response,
      isInternal: form.isInternal,
    };

    // 如果是解决状态，添加解决标记
    if (form.status === 'resolved') {
      data.resolvedAt = new Date();
      if (form.requestSatisfaction) {
        data.requestSatisfaction = true;
      }
    }

    await feedbackApi.processFeedback(props.feedback.feedbackId, data);

    ElMessage.success('状态更新成功');
    emit('success');
    handleClose();
  } catch (error) {
    ElMessage.error('状态更新失败');
    console.error('状态更新失败:', error);
  } finally {
    submitting.value = false;
  }
};

// 辅助方法
const getStatusLabel = status => {
  const option = statusOptions.find(opt => opt.value === status);
  return option ? option.label : status;
};

const getStatusTagType = status => {
  const typeMap = {
    pending: 'warning',
    in_review: 'primary',
    in_progress: 'primary',
    resolved: 'success',
    closed: 'info',
    rejected: 'danger',
  };
  return typeMap[status] || 'info';
};

// 监听器
watch(
  () => props.modelValue,
  val => {
    visible.value = val;
    if (val && props.feedback) {
      // 预填充数据
      form.status = props.feedback.status || '';
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
.form-help {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
