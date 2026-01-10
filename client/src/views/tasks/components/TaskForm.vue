<template>
  <el-dialog
    v-model="visible"
    :title="task ? '编辑任务' : '新建任务'"
    width="700px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      @submit.prevent="handleSubmit"
    >
      <el-form-item label="任务标题" prop="title">
        <el-input
          v-model="formData.title"
          placeholder="请输入任务标题"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="任务描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="请输入任务描述"
          maxlength="2000"
          show-word-limit
        />
      </el-form-item>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="任务类别" prop="category">
            <el-select v-model="formData.category" placeholder="请选择类别" style="width: 100%">
              <el-option label="村务治理" value="governance" />
              <el-option label="应急事件" value="emergency" />
              <el-option label="财务管理" value="finance" />
              <el-option label="公共服务" value="service" />
              <el-option label="基础设施" value="infrastructure" />
              <el-option label="农业事务" value="agriculture" />
              <el-option label="其他" value="other" />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="优先级" prop="priority">
            <el-rate
              v-model="formData.priority"
              :texts="['很低', '低', '中', '高', '很高']"
              show-text
            />
          </el-form-item>
        </el-col>
      </el-row>

      <!-- 四象限选择 -->
      <el-form-item label="象限分类" prop="quadrant">
        <div class="quadrant-selector">
          <div
            v-for="q in quadrants"
            :key="q.value"
            class="quadrant-option"
            :class="{ 'is-active': formData.quadrant === q.value }"
            @click="formData.quadrant = q.value"
          >
            <div class="quadrant-icon" :style="{ background: q.color }">
              <component :is="q.icon" />
            </div>
            <div class="quadrant-info">
              <div class="quadrant-name">{{ q.label }}</div>
              <div class="quadrant-desc">{{ q.description }}</div>
            </div>
          </div>
        </div>
      </el-form-item>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="负责人" prop="assignee">
            <el-select
              v-model="formData.assignee"
              placeholder="请选择负责人"
              filterable
              style="width: 100%"
            >
              <el-option
                v-for="user in availableUsers"
                :key="user._id"
                :label="user.profile?.nickName || user.username"
                :value="user._id"
              />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="状态" prop="status">
            <el-select v-model="formData.status" placeholder="请选择状态" style="width: 100%">
              <el-option label="待处理" value="pending" />
              <el-option label="进行中" value="in-progress" />
              <el-option label="已完成" value="completed" />
              <el-option label="已取消" value="cancelled" />
              <el-option label="暂停" value="on-hold" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="开始日期" prop="startDate">
            <el-date-picker
              v-model="formData.startDate"
              type="date"
              placeholder="选择开始日期"
              style="width: 100%"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="截止日期" prop="dueDate">
            <el-date-picker
              v-model="formData.dueDate"
              type="date"
              placeholder="选择截止日期"
              style="width: 100%"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="预估工时" prop="estimatedHours">
            <el-input-number
              v-model="formData.estimatedHours"
              :min="0"
              :max="1000"
              :step="0.5"
              placeholder="预估工时"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="当前进度" prop="progress">
            <el-slider v-model="formData.progress" :step="5" show-input :max="100" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="完成标准" prop="completionCriteria">
        <el-input
          v-model="formData.completionCriteria"
          type="textarea"
          :rows="2"
          placeholder="描述任务完成的验收标准"
          maxlength="500"
        />
      </el-form-item>

      <el-form-item label="标签">
        <el-select
          v-model="formData.tags"
          multiple
          filterable
          allow-create
          placeholder="请输入标签"
          style="width: 100%"
        >
          <el-option v-for="tag in commonTags" :key="tag" :label="tag" :value="tag" />
        </el-select>
      </el-form-item>

      <el-divider content-position="left">子任务</el-divider>

      <el-form-item label="子任务">
        <div class="subtasks-list">
          <div v-for="(subtask, index) in formData.subtasks" :key="index" class="subtask-item">
            <el-input v-model="subtask.title" placeholder="子任务内容" style="flex: 1" />
            <el-date-picker
              v-model="subtask.dueDate"
              type="date"
              placeholder="截止日期"
              style="width: 150px; margin-left: 10px"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
            <el-button
              type="danger"
              :icon="Delete"
              circle
              size="small"
              @click="removeSubtask(index)"
              style="margin-left: 10px"
            />
          </div>
          <el-button type="primary" plain :icon="Plus" @click="addSubtask" style="width: 100%">
            添加子任务
          </el-button>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting">
        {{ task ? '保存' : '创建' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Delete,
  Plus,
  WarningFilled,
  TrendCharts,
  Odometer,
  DeleteFilled,
} from '@element-plus/icons-vue';
import { cadreTaskApi } from '@/api';
import { useUserStore } from '@/stores/user';

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

const emit = defineEmits(['update:modelValue', 'saved']);

const userStore = useUserStore();
const formRef = ref(null);
const submitting = ref(false);
const availableUsers = ref([]);

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
});

const quadrants = [
  {
    value: 'urgent-important',
    label: '重要且紧急',
    description: '立即处理',
    color: '#ff6b6b',
    icon: WarningFilled,
  },
  {
    value: 'important-not-urgent',
    label: '重要不紧急',
    description: '计划安排',
    color: '#ffd93d',
    icon: TrendCharts,
  },
  {
    value: 'urgent-not-important',
    label: '紧急不重要',
    description: '授权他人',
    color: '#a8e6cf',
    icon: Odometer,
  },
  {
    value: 'not-urgent-not-important',
    label: '不重要不紧急',
    description: '最后处理',
    color: '#b2bec3',
    icon: DeleteFilled,
  },
];

const commonTags = ['重要', '紧急', '会议', '调研', '财务', '项目', '日常'];

const formData = ref({
  title: '',
  description: '',
  category: 'governance',
  quadrant: 'important-not-urgent',
  priority: 3,
  status: 'pending',
  progress: 0,
  dueDate: null,
  startDate: null,
  estimatedHours: null,
  assignee: null,
  completionCriteria: '',
  tags: [],
  subtasks: [],
});

const formRules = {
  title: [{ required: true, message: '请输入任务标题', trigger: 'blur' }],
  category: [{ required: true, message: '请选择任务类别', trigger: 'change' }],
  quadrant: [{ required: true, message: '请选择象限', trigger: 'change' }],
  assignee: [{ required: true, message: '请选择负责人', trigger: 'change' }],
};

// 监听task变化，填充表单
watch(
  () => props.task,
  newTask => {
    if (newTask) {
      formData.value = {
        title: newTask.title || '',
        description: newTask.description || '',
        category: newTask.category || 'governance',
        quadrant: newTask.quadrant || 'important-not-urgent',
        priority: newTask.priority || 3,
        status: newTask.status || 'pending',
        progress: newTask.progress || 0,
        dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString().split('T')[0] : null,
        startDate: newTask.startDate
          ? new Date(newTask.startDate).toISOString().split('T')[0]
          : null,
        estimatedHours: newTask.estimatedHours || null,
        assignee: newTask.assignee?._id || newTask.assignee || null,
        completionCriteria: newTask.completionCriteria || '',
        tags: newTask.tags || [],
        subtasks: newTask.subtasks || [],
      };
    } else {
      resetForm();
    }
  },
  { immediate: true }
);

// 监听对话框打开
watch(visible, async isOpen => {
  if (isOpen) {
    await loadAvailableUsers();
  }
});

const loadAvailableUsers = async () => {
  // 这里应该调用API获取可分配的用户列表
  // 暂时使用模拟数据
  availableUsers.value = [
    { _id: '1', username: 'admin', profile: { nickName: '管理员' } },
    { _id: '2', username: 'cadre1', profile: { nickName: '村干部1' } },
    { _id: '3', username: 'cadre2', profile: { nickName: '村干部2' } },
  ];
};

const resetForm = () => {
  formData.value = {
    title: '',
    description: '',
    category: 'governance',
    quadrant: 'important-not-urgent',
    priority: 3,
    status: 'pending',
    progress: 0,
    dueDate: null,
    startDate: null,
    estimatedHours: null,
    assignee: null,
    completionCriteria: '',
    tags: [],
    subtasks: [],
  };
  formRef.value?.clearValidate();
};

const addSubtask = () => {
  formData.value.subtasks.push({
    title: '',
    completed: false,
    dueDate: null,
  });
};

const removeSubtask = index => {
  formData.value.subtasks.splice(index, 1);
};

const handleClose = () => {
  resetForm();
  visible.value = false;
};

const handleSubmit = async () => {
  try {
    await formRef.value.validate();

    submitting.value = true;

    const villageId = userStore.user?.villageId;
    if (!villageId) {
      ElMessage.warning('请先选择村庄');
      return;
    }

    const payload = {
      ...formData.value,
      villageId,
      createdBy: userStore.user?.id,
    };

    let response;
    if (props.task) {
      response = await cadreTaskApi.updateTask(props.task._id, payload);
    } else {
      response = await cadreTaskApi.createTask(payload);
    }

    if (response.data.success) {
      ElMessage.success(props.task ? '任务更新成功' : '任务创建成功');
      emit('saved');
    } else {
      ElMessage.error(response.data.message || '操作失败');
    }
  } catch (error) {
    console.error('Submit task error:', error);
    if (error !== false) {
      // 不是验证错误
      ElMessage.error('操作失败，请稍后重试');
    }
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.quadrant-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.quadrant-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.quadrant-option:hover {
  border-color: #409eff;
  background: #f5f7fa;
}

.quadrant-option.is-active {
  border-color: #409eff;
  background: #ecf5ff;
}

.quadrant-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
}

.quadrant-info {
  flex: 1;
}

.quadrant-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 2px;
}

.quadrant-desc {
  font-size: 12px;
  color: #909399;
}

.subtasks-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.subtask-item {
  display: flex;
  align-items: center;
}
</style>
