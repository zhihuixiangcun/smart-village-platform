<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? '编辑任务' : '创建任务'"
    width="700px"
    :close-on-click-modal="false"
    @open="handleOpen"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      :size="largeTextMode ? 'large' : 'default'"
    >
      <el-form-item label="任务标题" prop="title">
        <el-input
          v-model="formData.title"
          placeholder="请输入任务标题"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="任务分类" prop="category">
        <el-select v-model="formData.category" placeholder="选择任务分类" style="width: 100%">
          <el-option label="安全生产" value="安全生产" />
          <el-option label="疫情防控" value="疫情防控" />
          <el-option label="环境整治" value="环境整治" />
          <el-option label="村务服务" value="村务服务" />
          <el-option label="应急响应" value="应急响应" />
          <el-option label="其他" value="其他" />
        </el-select>
      </el-form-item>

      <el-form-item label="优先级" prop="priority">
        <el-radio-group v-model="formData.priority">
          <el-radio label="high">高 - 紧急重要</el-radio>
          <el-radio label="medium">中 - 常规任务</el-radio>
          <el-radio label="low">低 - 一般事务</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="分配给" prop="assigneeId">
        <el-select
          v-model="formData.assigneeId"
          placeholder="选择执行人"
          style="width: 100%"
          clearable
        >
          <el-option
            v-for="personnel in personnelList"
            :key="personnel.id"
            :label="personnel.name"
            :value="personnel.id"
          >
            <div class="personnel-option">
              <el-avatar :size="24">{{ personnel.name.charAt(0) }}</el-avatar>
              <span>{{ personnel.name }}</span>
              <el-tag size="small">{{ personnel.role }}</el-tag>
            </div>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="截止时间" prop="deadline">
        <el-date-picker
          v-model="formData.deadline"
          type="datetime"
          placeholder="选择截止时间"
          style="width: 100%"
          :disabled-date="disabledDate"
        />
      </el-form-item>

      <el-form-item label="任务描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="4"
          placeholder="请详细描述任务内容、要求和目标..."
          maxlength="1000"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="具体要求" prop="requirements">
        <el-input
          v-model="formData.requirements"
          type="textarea"
          :rows="3"
          placeholder="列出具体的工作要求和标准..."
          maxlength="500"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="所需资源" prop="resources">
        <el-select
          v-model="formData.resources"
          multiple
          placeholder="选择所需资源"
          style="width: 100%"
        >
          <el-option label="人力支持" value="人力" />
          <el-option label="物资支持" value="物资" />
          <el-option label="资金支持" value="资金" />
          <el-option label="技术支持" value="技术" />
          <el-option label="车辆支持" value="车辆" />
          <el-option label="设备支持" value="设备" />
        </el-select>
      </el-form-item>

      <el-form-item label="备注信息">
        <el-input
          v-model="formData.note"
          type="textarea"
          :rows="2"
          placeholder="其他需要说明的信息..."
          maxlength="200"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting">
        {{ isEdit ? '更新任务' : '创建任务' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  task: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue', 'submit']);

const largeTextMode = ref(false);
const formRef = ref(null);
const submitting = ref(false);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
});

const isEdit = computed(() => !!props.task);

const personnelList = ref([
  { id: 'wangwu', name: '王五', role: '网格员', phone: '138****1234' },
  { id: 'zhaoliu', name: '赵六', role: '志愿者', phone: '139****5678' },
  { id: 'sunqi', name: '孙七', role: '村干部', phone: '137****9012' },
  { id: 'zhouba', name: '周八', role: '党员', phone: '136****3456' },
  { id: 'wujiu', name: '吴九', role: '村医', phone: '135****7890' },
]);

const formData = ref({
  title: '',
  category: '',
  priority: 'medium',
  assigneeId: '',
  deadline: '',
  description: '',
  requirements: '',
  resources: [],
  note: '',
});

const formRules = {
  title: [
    { required: true, message: '请输入任务标题', trigger: 'blur' },
    { min: 5, max: 100, message: '标题长度在5到100个字符之间', trigger: 'blur' },
  ],
  category: [{ required: true, message: '请选择任务分类', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
  deadline: [{ required: true, message: '请选择截止时间', trigger: 'change' }],
  description: [
    { required: true, message: '请输入任务描述', trigger: 'blur' },
    { min: 10, max: 1000, message: '描述长度在10到1000个字符之间', trigger: 'blur' },
  ],
  requirements: [{ max: 500, message: '要求长度不能超过500个字符', trigger: 'blur' }],
};

// 监听传入的任务数据
watch(
  () => props.task,
  newVal => {
    if (newVal) {
      formData.value = {
        ...newVal,
        resources: newVal.resources || [],
      };
    } else {
      resetForm();
    }
  },
  { immediate: true }
);

const resetForm = () => {
  formData.value = {
    title: '',
    category: '',
    priority: 'medium',
    assigneeId: '',
    deadline: '',
    description: '',
    requirements: '',
    resources: [],
    note: '',
  };
};

const handleOpen = () => {
  nextTick(() => {
    if (formRef.value) {
      formRef.value.clearValidate();
    }
  });
};

const disabledDate = time => {
  return time.getTime() < Date.now() - 24 * 60 * 60 * 1000;
};

const handleCancel = () => {
  dialogVisible.value = false;
};

const handleSubmit = async () => {
  try {
    submitting.value = true;
    await formRef.value.validate();

    const submitData = {
      ...formData.value,
      status: isEdit.value ? formData.value.status : 'pending',
      createTime: isEdit.value ? formData.value.createTime : new Date().toISOString(),
    };

    emit('submit', submitData);
    ElMessage.success(isEdit.value ? '任务更新成功' : '任务创建成功');
    dialogVisible.value = false;
  } catch (error) {
    ElMessage.error('请检查表单填写');
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.personnel-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  :deep(.el-dialog) {
    width: 90% !important;
    margin: 5vh auto;
  }
}
</style>
