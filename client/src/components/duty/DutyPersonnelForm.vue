<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="isEdit ? '编辑值班人员' : '添加值班人员'"
    width="800px"
    :close-on-click-modal="false"
    @closed="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      class="personnel-form"
    >
      <!-- 基本信息 -->
      <div class="form-section">
        <h3 class="section-title">基本信息</h3>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="formData.name" placeholder="请输入姓名" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="职务" prop="position">
              <el-input v-model="formData.position" placeholder="请输入职务" clearable />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="手机号码" prop="phone">
              <el-input v-model="formData.phone" placeholder="请输入手机号码" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="身份证号" prop="idCard">
              <el-input
                v-model="formData.idCard"
                placeholder="请输入身份证号"
                clearable
                show-password
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="性别" prop="gender">
              <el-radio-group v-model="formData.gender">
                <el-radio label="male">男</el-radio>
                <el-radio label="female">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-switch v-model="formData.isActive" active-text="在岗" inactive-text="离岗" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 工作能力配置 -->
      <div class="form-section">
        <h3 class="section-title">工作能力配置</h3>
        <el-form-item label="可值班的班次" prop="availableShifts">
          <el-checkbox-group v-model="formData.availableShifts">
            <el-checkbox label="morning">早班 (06:00-12:00)</el-checkbox>
            <el-checkbox label="afternoon">午班 (12:00-18:00)</el-checkbox>
            <el-checkbox label="evening">晚班 (18:00-24:00)</el-checkbox>
            <el-checkbox label="night">夜班 (00:00-06:00)</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="专业技能" prop="skills">
          <el-select
            v-model="formData.skills"
            multiple
            placeholder="请选择专业技能"
            style="width: 100%"
          >
            <el-option
              v-for="skill in skillOptions"
              :key="skill.value"
              :label="skill.label"
              :value="skill.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="工作区域" prop="workAreas">
          <el-select
            v-model="formData.workAreas"
            multiple
            placeholder="请选择工作区域"
            style="width: 100%"
          >
            <el-option
              v-for="area in areaOptions"
              :key="area.value"
              :label="area.label"
              :value="area.value"
            />
          </el-select>
        </el-form-item>
      </div>

      <!-- 排班偏好 -->
      <div class="form-section">
        <h3 class="section-title">排班偏好</h3>
        <el-form-item label="每月最多值班" prop="maxDutiesPerMonth">
          <el-input-number
            v-model="formData.maxDutiesPerMonth"
            :min="0"
            :max="31"
            :step="1"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="连续值班天数" prop="maxConsecutiveDays">
          <el-input-number
            v-model="formData.maxConsecutiveDays"
            :min="1"
            :max="7"
            :step="1"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="休息日偏好" prop="preferredRestDays">
          <el-checkbox-group v-model="formData.preferredRestDays">
            <el-checkbox label="0">周日</el-checkbox>
            <el-checkbox label="1">周一</el-checkbox>
            <el-checkbox label="2">周二</el-checkbox>
            <el-checkbox label="3">周三</el-checkbox>
            <el-checkbox label="4">周四</el-checkbox>
            <el-checkbox label="5">周五</el-checkbox>
            <el-checkbox label="6">周六</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="特殊要求" prop="specialRequirements">
          <el-input
            v-model="formData.specialRequirements"
            type="textarea"
            :rows="3"
            placeholder="请输入特殊要求或备注"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </div>

      <!-- 头像上传 -->
      <div class="form-section">
        <h3 class="section-title">头像照片</h3>
        <el-form-item label="头像">
          <el-upload
            class="avatar-uploader"
            :action="uploadUrl"
            :show-file-list="false"
            :on-success="handleAvatarSuccess"
            :before-upload="beforeAvatarUpload"
          >
            <img v-if="formData.avatar" :src="formData.avatar" class="avatar" />
            <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
          </el-upload>
          <div class="avatar-tip">支持 JPG、PNG 格式，文件大小不超过 2MB</div>
        </el-form-item>
      </div>

      <!-- 二维码展示 -->
      <div v-if="isEdit && qrCode" class="form-section">
        <h3 class="section-title">个人值班二维码</h3>
        <el-form-item label="二维码">
          <div class="qr-code-container">
            <img :src="qrCode" alt="个人值班二维码" class="qr-code" />
            <el-button type="primary" size="small" @click="downloadQRCode"> 下载二维码 </el-button>
            <el-button type="success" size="small" @click="generateQRCode"> 重新生成 </el-button>
          </div>
        </el-form-item>
      </div>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ isEdit ? '更新' : '添加' }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { useDutyStore } from '@/stores/dutyStore';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  personnel: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue', 'confirm']);

// Store
const dutyStore = useDutyStore();

// 响应式数据
const formRef = ref(null);
const submitting = ref(false);
const qrCode = ref(null);

// 表单数据
const formData = ref({
  name: '',
  position: '',
  phone: '',
  idCard: '',
  gender: 'male',
  isActive: true,
  avatar: '',
  availableShifts: ['morning', 'afternoon', 'evening'],
  skills: [],
  workAreas: [],
  maxDutiesPerMonth: 15,
  maxConsecutiveDays: 3,
  preferredRestDays: ['0', '6'],
  specialRequirements: '',
});

// 计算属性
const isEdit = computed(() => !!props.personnel);
const uploadUrl = computed(() => '/api/upload/avatar');

// 选项数据
const skillOptions = [
  { label: '应急处置', value: 'emergency' },
  { label: '医疗救护', value: 'medical' },
  { label: '消防安全', value: 'firefighting' },
  { label: '设备维护', value: 'maintenance' },
  { label: '通讯联络', value: 'communication' },
  { label: '交通疏导', value: 'traffic' },
  { label: '群众安抚', value: 'comfort' },
  { label: '信息记录', value: 'recording' },
];

const areaOptions = [
  { label: '村委会办公室', value: 'office' },
  { label: '村民服务中心', value: 'service_center' },
  { label: '文化活动广场', value: 'cultural_square' },
  { label: '村卫生室', value: 'clinic' },
  { label: '老年活动中心', value: 'senior_center' },
  { label: '村幼儿园', value: 'kindergarten' },
  { label: '村内主要道路', value: 'main_roads' },
  { label: '全村范围', value: 'entire_village' },
];

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 10, message: '姓名长度在 2 到 10 个字符', trigger: 'blur' },
  ],
  position: [{ required: true, message: '请输入职务', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号码', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' },
  ],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    {
      pattern:
        /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/,
      message: '请输入正确的身份证号',
      trigger: 'blur',
    },
  ],
  availableShifts: [{ required: true, message: '请至少选择一个可值班班次', trigger: 'change' }],
  maxDutiesPerMonth: [{ required: true, message: '请设置每月最多值班天数', trigger: 'blur' }],
  maxConsecutiveDays: [{ required: true, message: '请设置连续值班天数限制', trigger: 'blur' }],
};

// 方法
const initFormData = () => {
  if (props.personnel) {
    formData.value = { ...formData.value, ...props.personnel };
  } else {
    formData.value = {
      name: '',
      position: '',
      phone: '',
      idCard: '',
      gender: 'male',
      isActive: true,
      avatar: '',
      availableShifts: ['morning', 'afternoon', 'evening'],
      skills: [],
      workAreas: [],
      maxDutiesPerMonth: 15,
      maxConsecutiveDays: 3,
      preferredRestDays: ['0', '6'],
      specialRequirements: '',
    };
  }
};

const handleSubmit = async () => {
  try {
    await formRef.value.validate();
    submitting.value = true;

    emit('confirm', formData.value);
  } catch (error) {
    console.error('表单验证失败:', error);
  } finally {
    submitting.value = false;
  }
};

const handleClose = () => {
  emit('update:modelValue', false);
  formRef.value?.resetFields();
  qrCode.value = null;
};

const handleAvatarSuccess = response => {
  if (response.code === 200) {
    formData.value.avatar = response.data.url;
    ElMessage.success('头像上传成功');
  } else {
    ElMessage.error(response.message || '头像上传失败');
  }
};

const beforeAvatarUpload = file => {
  const isJPGorPNG = file.type === 'image/jpeg' || file.type === 'image/png';
  const isLt2M = file.size / 1024 / 1024 < 2;

  if (!isJPGorPNG) {
    ElMessage.error('头像只能是 JPG 或 PNG 格式!');
  }
  if (!isLt2M) {
    ElMessage.error('头像大小不能超过 2MB!');
  }

  return isJPGorPNG && isLt2M;
};

const generateQRCode = async () => {
  try {
    if (!props.personnel?.id) return;
    const qrCodeData = await dutyStore.generateQRCode(props.personnel.id);
    qrCode.value = qrCodeData;
  } catch (error) {
    console.error('生成二维码失败:', error);
  }
};

const downloadQRCode = () => {
  if (!qrCode.value) return;

  const link = document.createElement('a');
  link.href = qrCode.value;
  link.download = `值班二维码_${formData.value.name}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 监听对话框打开
watch(
  () => props.modelValue,
  newVal => {
    if (newVal) {
      initFormData();
      if (isEdit.value && props.personnel?.id) {
        generateQRCode();
      }
    }
  }
);
</script>

<style lang="scss" scoped>
.personnel-form {
  .form-section {
    margin-bottom: 24px;
    padding-bottom: 24px;
    border-bottom: 1px solid #ebeef5;

    &:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    .section-title {
      font-size: 16px;
      font-weight: 500;
      color: #303133;
      margin: 0 0 16px 0;
      padding-left: 10px;
      border-left: 4px solid #409eff;
    }
  }

  .avatar-uploader {
    :deep(.el-upload) {
      border: 1px dashed #d9d9d9;
      border-radius: 6px;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: all 0.3s;

      &:hover {
        border-color: #409eff;
      }
    }

    .avatar-uploader-icon {
      font-size: 28px;
      color: #8c939d;
      width: 100px;
      height: 100px;
      line-height: 100px;
      text-align: center;
    }

    .avatar {
      width: 100px;
      height: 100px;
      display: block;
      object-fit: cover;
    }
  }

  .avatar-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 8px;
  }

  .qr-code-container {
    display: flex;
    align-items: center;
    gap: 16px;

    .qr-code {
      width: 120px;
      height: 120px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

// 响应式设计
@media (max-width: 768px) {
  .personnel-form {
    .form-section {
      .el-row {
        .el-col {
          margin-bottom: 12px;
        }
      }
    }

    .qr-code-container {
      flex-direction: column;
      align-items: flex-start;
    }
  }
}
</style>
