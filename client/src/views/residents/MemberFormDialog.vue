<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="600px"
    :close-on-click-modal="false"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" class="member-form">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="姓名" prop="name">
            <el-input v-model="form.name" placeholder="请输入姓名" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="性别" prop="gender">
            <el-radio-group v-model="form.gender">
              <el-radio label="male">男</el-radio>
              <el-radio label="female">女</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="与户主关系" prop="relationship">
            <el-select v-model="form.relationship" placeholder="请选择关系" style="width: 100%">
              <el-option label="户主" value="head" />
              <el-option label="配偶" value="spouse" />
              <el-option label="子女" value="child" />
              <el-option label="父母" value="parent" />
              <el-option label="兄弟姐妹" value="sibling" />
              <el-option label="其他" value="other" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="年龄" prop="age">
            <el-input-number
              v-model="form.age"
              :min="0"
              :max="150"
              style="width: 100%"
              placeholder="请输入年龄"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="身份证号" prop="idCard">
            <el-input
              v-model="form.idCard"
              placeholder="请输入身份证号"
              maxlength="18"
              show-word-limit
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="联系电话" prop="phone">
            <el-input v-model="form.phone" placeholder="请输入联系电话" maxlength="11" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="职业" prop="occupation">
            <el-input v-model="form.occupation" placeholder="请输入职业" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="健康状态" prop="healthStatus">
            <el-select v-model="form.healthStatus" placeholder="请选择" style="width: 100%">
              <el-option label="健康" value="healthy" />
              <el-option label="慢性病" value="chronic" />
              <el-option label="残疾" value="disabled" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注信息" />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ mode === 'add' ? '添加' : '保存' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { residentAPI } from '@/api/resident';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  member: {
    type: Object,
    default: null,
  },
  resident: {
    type: Object,
    default: null,
  },
  mode: {
    type: String,
    default: 'add', // 'add' | 'edit'
  },
});

const emit = defineEmits(['update:modelValue', 'confirm']);

const formRef = ref();
const submitting = ref(false);

// 对话框显示状态
const dialogVisible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

// 对话框标题
const dialogTitle = computed(() => {
  return props.mode === 'add' ? '添加家庭成员' : '编辑家庭成员';
});

// 表单数据
const form = reactive({
  name: '',
  gender: 'male',
  relationship: '',
  age: null,
  idCard: '',
  phone: '',
  occupation: '',
  healthStatus: 'healthy',
  remark: '',
});

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 10, message: '姓名长度在 2 到 10 个字符', trigger: 'blur' },
  ],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  relationship: [{ required: true, message: '请选择与户主关系', trigger: 'change' }],
  age: [
    { required: true, message: '请输入年龄', trigger: 'blur' },
    { type: 'number', min: 0, max: 150, message: '年龄范围在 0 到 150 之间', trigger: 'blur' },
  ],
  idCard: [
    {
      pattern:
        /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/,
      message: '身份证号格式不正确',
      trigger: 'blur',
    },
  ],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
};

// 方法
const handleClose = () => {
  dialogVisible.value = false;
  resetForm();
};

const resetForm = () => {
  Object.assign(form, {
    name: '',
    gender: 'male',
    relationship: '',
    age: null,
    idCard: '',
    phone: '',
    occupation: '',
    healthStatus: 'healthy',
    remark: '',
  });

  if (formRef.value) {
    formRef.value.clearValidate();
  }
};

const fillForm = member => {
  if (member) {
    Object.assign(form, member);
  }
};

const handleSubmit = async () => {
  try {
    await formRef.value.validate();

    submitting.value = true;

    const submitData = {
      ...form,
      residentId: props.resident?.id,
    };

    let response;
    if (props.mode === 'add') {
      response = await residentAPI.addFamilyMember(props.resident.id, submitData);
    } else {
      response = await residentAPI.updateFamilyMember(
        props.resident.id,
        props.member.id,
        submitData
      );
    }

    if (response.success) {
      ElMessage.success(`${props.mode === 'add' ? '添加' : '保存'}成功`);
      emit('confirm');
      handleClose();
    }
  } catch (error) {
    if (error !== false) {
      ElMessage.error(`${props.mode === 'add' ? '添加' : '保存'}失败`);
    }
  } finally {
    submitting.value = false;
  }
};

// 监听对话框显示状态
watch(
  () => props.modelValue,
  newVal => {
    if (newVal) {
      nextTick(() => {
        if (props.mode === 'edit' && props.member) {
          fillForm(props.member);
        } else {
          resetForm();
        }
      });
    }
  }
);
</script>

<style lang="scss" scoped>
.member-form {
  .dialog-footer {
    text-align: right;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .member-form {
    :deep(.el-col) {
      width: 100%;
      margin-bottom: 20px;
    }
  }
}
</style>
