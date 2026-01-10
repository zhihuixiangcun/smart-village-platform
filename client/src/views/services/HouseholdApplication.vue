<template>
  <div class="household-application" :class="{ 'large-text-mode': isLargeText }">
    <StepForm
      ref="stepFormRef"
      :steps="steps"
      :step-components="[BasicInfoStep, UploadStep, ConfirmStep]"
      :initial-data="formData"
      @update="handleUpdate"
      @submit="handleSubmit"
      @voice-input="handleVoiceInput"
    />
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import StepForm from '@/components/common/StepForm.vue';
import { useLargeText } from '@/composables/useLargeText';
import { profileApi } from '@/api/residentProfile';
import { serviceApi } from '@/api/service';

const props = defineProps({
  service: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['close', 'submitted']);

const { isLargeText } = useLargeText();

const steps = [
  {
    title: '基本信息',
    description: '填写户口本办理信息',
  },
  {
    title: '材料上传',
    description: '上传所需证件照片',
  },
  {
    title: '确认提交',
    description: '核对信息并提交',
  },
];

const formData = reactive({
  // 基本信息
  name: '',
  idCard: '',
  relationship: '', // 与户主关系
  householdType: '', // 户口类型(农业/非农业)
  reason: '', // 办理原因
  oldBookNo: '', // 旧户口本编号

  // 户主信息
  headName: '',
  headIdCard: '',
  address: '',
  phone: '',

  // 办理类型
  type: '', // 补发/换发/变更
  changeType: '', // 变更类型(如适用)

  // 材料上传
  photo: '',
  idCardPhoto: '',
  oldBookPhoto: '',
  otherPhotos: [],

  // 领取方式
  receiveMethod: 'mail',
  receiveAddress: '',
  remark: '',
});

// 步骤1: 基本信息
const BasicInfoStep = {
  template: `
    <div class="basic-info-step">
      <el-alert
        title="办理说明"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      >
        <template #default>
          <p>户口本办理需要5-10个工作日</p>
          <p>请确保户口本信息与身份证信息一致</p>
        </template>
      </el-alert>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="140px"
      >
        <el-form-item label="办理类型" prop="type">
          <el-radio-group v-model="formData.type">
            <el-radio label="reissue">补发</el-radio>
            <el-radio label="renew">换发</el-radio>
            <el-radio label="change">变更登记</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="办理原因" prop="reason">
          <el-input v-model="formData.reason" placeholder="请说明办理原因" />
        </el-form-item>

        <el-form-item label="户口类型" prop="householdType">
          <el-radio-group v-model="formData.householdType">
            <el-radio label="农业">农业户口</el-radio>
            <el-radio label="non-agriculture">非农业户口</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-divider content-position="left">户主信息</el-divider>

        <el-form-item label="户主姓名" prop="headName">
          <el-input v-model="formData.headName" placeholder="请输入户主姓名" />
        </el-form-item>

        <el-form-item label="户主身份证" prop="headIdCard">
          <el-input v-model="formData.headIdCard" placeholder="请输入户主身份证号" />
        </el-form-item>

        <el-form-item label="与户主关系" prop="relationship">
          <el-select v-model="formData.relationship" placeholder="请选择关系" style="width: 100%">
            <el-option label="本人" value="本人" />
            <el-option label="配偶" value="配偶" />
            <el-option label="子女" value="子女" />
            <el-option label="父母" value="父母" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>

        <el-form-item label="姓名" prop="name">
          <el-input v-model="formData.name" placeholder="请输入姓名" :disabled="true" />
        </el-form-item>

        <el-form-item label="身份证号" prop="idCard">
          <el-input v-model="formData.idCard" placeholder="请输入身份证号" :disabled="true" />
        </el-form-item>

        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="formData.phone" placeholder="请输入联系电话" type="tel" />
        </el-form-item>

        <el-form-item label="家庭住址" prop="address">
          <el-input v-model="formData.address" type="textarea" :rows="3" placeholder="请输入详细地址" />
        </el-form-item>

        <el-form-item label="旧户口本号" prop="oldBookNo">
          <el-input v-model="formData.oldBookNo" placeholder="请输入旧户口本编号(如有)" />
        </el-form-item>

        <el-form-item label="备注">
          <el-input v-model="formData.remark" type="textarea" :rows="3" placeholder="如有特殊情况请说明" />
        </el-form-item>
      </el-form>
    </div>
  `,
  props: ['formData'],
  emits: ['update', 'validate', 'voice-input'],
  setup(props, { emit }) {
    const rules = {
      type: [{ required: true, message: '请选择办理类型', trigger: 'change' }],
      reason: [{ required: true, message: '请输入办理原因', trigger: 'blur' }],
      householdType: [{ required: true, message: '请选择户口类型', trigger: 'change' }],
      headName: [{ required: true, message: '请输入户主姓名', trigger: 'blur' }],
      headIdCard: [
        { required: true, message: '请输入户主身份证号', trigger: 'blur' },
        {
          pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/,
          message: '请输入正确的身份证号',
          trigger: 'blur',
        },
      ],
      relationship: [{ required: true, message: '请选择与户主关系', trigger: 'change' }],
      name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
      idCard: [
        { required: true, message: '请输入身份证号', trigger: 'blur' },
        {
          pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/,
          message: '请输入正确的身份证号',
          trigger: 'blur',
        },
      ],
      phone: [
        { required: true, message: '请输入联系电话', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' },
      ],
      address: [{ required: true, message: '请输入家庭住址', trigger: 'blur' }],
    };

    const formRef = ref(null);

    const validateForm = () => {
      formRef.value?.validate(valid => {
        emit('validate', valid);
      });
    };

    return { formRef, rules, validateForm };
  },
};

// 步骤2和3与IdCardApplication类似,使用ImageUploader组件
const UploadStep = {
  template: `
    <div class="upload-step">
      <el-alert
        title="上传要求"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 24px"
      >
        <template #default>
          <p>1. 户口本首页、户主页、本人页</p>
          <p>2. 户主和申请人身份证正反面</p>
          <p>3. 照片清晰,信息可见</p>
        </template>
      </el-alert>

      <div class="upload-section">
        <div class="upload-item">
          <h4>户口本照片 <span class="required">*</span></h4>
          <ImageUploader
            v-model="formData.idCardPhoto"
            :required="true"
            :multiple="true"
            :max-count="3"
            @update="emit('update')"
            @validate="emit('validate')"
          />
        </div>

        <div class="upload-item">
          <h4>身份证照片 <span class="required">*</span></h4>
          <ImageUploader
            v-model="formData.otherPhotos"
            :required="true"
            :multiple="true"
            :max-count="4"
            @update="emit('update')"
            @validate="emit('validate')"
          />
        </div>

        <div class="upload-item">
          <h4>其他材料</h4>
          <ImageUploader
            v-model="formData.otherPhotos"
            :multiple="true"
            :max-count="5"
            @update="emit('update')"
            @validate="emit('validate')"
          />
        </div>
      </div>
    </div>
  `,
  props: ['formData'],
  emits: ['update', 'validate'],
};

const ConfirmStep = {
  template: `
    <div class="confirm-step">
      <el-result
        icon="warning"
        title="请核对户口本办理信息"
        sub-title="确认信息无误后点击提交"
      />

      <el-descriptions :column="2" border style="margin: 24px 0">
        <el-descriptions-item label="办理类型">
          {{ getTypeLabel(formData.type) }}
        </el-descriptions-item>
        <el-descriptions-item label="办理原因">
          {{ formData.reason }}
        </el-descriptions-item>
        <el-descriptions-item label="户口类型">
          {{ formData.householdType === 'agriculture' ? '农业户口' : '非农业户口' }}
        </el-descriptions-item>
        <el-descriptions-item label="与户主关系">
          {{ formData.relationship }}
        </el-descriptions-item>
        <el-descriptions-item label="户主姓名">
          {{ formData.headName }}
        </el-descriptions-item>
        <el-descriptions-item label="联系电话">
          {{ formData.phone }}
        </el-descriptions-item>
        <el-descriptions-item label="家庭住址" :span="2">
          {{ formData.address }}
        </el-descriptions-item>
      </el-descriptions>

      <el-checkbox v-model="confirmed" @change="emit('validate', confirmed)">
        我确认以上信息真实有效
      </el-checkbox>
    </div>
  `,
  props: ['formData'],
  emits: ['validate'],
  setup(props, { emit }) {
    const confirmed = ref(false);

    const getTypeLabel = type => {
      const map = {
        reissue: '补发',
        renew: '换发',
        change: '变更登记',
      };
      return map[type] || type;
    };

    return { confirmed, getTypeLabel };
  },
};

const handleUpdate = data => {
  Object.assign(formData, data);
};

const handleVoiceInput = (field, text) => {
  // 处理语音输入
};

const handleSubmit = async data => {
  try {
    await serviceApi.submitHouseholdApplication({
      ...data,
      serviceType: 'household',
      serviceName: '户口本办理',
    });

    ElMessage.success('申请已提交');
    emit('submitted', data);
    emit('close');
  } catch (error) {
    ElMessage.error('提交失败: ' + error.message);
    throw error;
  }
};
</script>

<style lang="scss" scoped>
.household-application {
  // 复用IdCardApplication的样式
}
</style>
