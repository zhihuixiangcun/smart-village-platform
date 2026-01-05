<template>
  <div class="id-card-application" :class="{ 'large-text-mode': isLargeText }">
    <StepForm
      ref="stepFormRef"
      :steps="steps"
      :step-components="[BasicInfoStep, UploadStep, ConfirmStep]"
      :initial-data="formData"
      :show-progress="true"
      :enable-voice="true"
      @update="handleUpdate"
      @submit="handleSubmit"
      @voice-input="handleVoiceInput"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import StepForm from '@/components/common/StepForm.vue'
import { useLargeText } from '@/composables/useLargeText'
import { profileApi } from '@/api/residentProfile'
import { serviceApi } from '@/api/service'

const props = defineProps({
  service: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'submitted'])

const { isLargeText } = useLargeText()

const stepFormRef = ref(null)

// 步骤配置
const steps = [
  {
    title: '基本信息',
    description: '填写个人基本资料'
  },
  {
    title: '材料上传',
    description: '上传所需证件照片'
  },
  {
    title: '确认提交',
    description: '核对信息并提交'
  }
]

// 表单数据
const formData = reactive({
  // 基本信息
  name: '',
  idCard: '',
  gender: '',
  birthDate: '',
  address: '',
  phone: '',
  reason: '', // 补办原因
  oldIdCard: '', // 旧身份证号

  // 材料上传
  photo: '', // 证件照片
  idCardPhoto: '', // 身份证照片
  householdPhoto: '', // 户口本照片
  otherPhotos: [], // 其他材料

  // 领取方式
  receiveMethod: 'mail', // 邮寄/自取
  receiveAddress: '', // 邮寄地址
  receiveTime: '', // 自取时间

  // 备注
  remark: ''
})

// 组件
const BasicInfoStep = {
  template: `
    <div class="basic-info-step">
      <el-alert
        title="温馨提示"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      >
        <template #default>
          <p>身份证补办需要7-15个工作日,请确保信息填写准确</p>
          <p>如需加急办理,请到派出所现场办理</p>
        </template>
      </el-alert>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="120px"
        label-position="left"
      >
        <el-form-item label="补办原因" prop="reason">
          <el-radio-group v-model="formData.reason">
            <el-radio label="lost">丢失补办</el-radio>
            <el-radio label="damaged">损坏换领</el-radio>
            <el-radio label="expired">到期换领</el-radio>
            <el-radio label="change">信息变更</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="姓名" prop="name">
          <el-input
            v-model="formData.name"
            placeholder="请输入姓名"
            :disabled="true"
          >
            <template #append>
              <el-button icon="Microphone" @click="$emit('voice-input', 'name')" />
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="身份证号" prop="idCard">
          <el-input
            v-model="formData.idCard"
            placeholder="请输入身份证号"
            :disabled="true"
          />
        </el-form-item>

        <el-form-item label="旧身份证号" prop="oldIdCard">
          <el-input
            v-model="formData.oldIdCard"
            placeholder="请输入旧身份证号(如有)"
          />
        </el-form-item>

        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="formData.gender">
            <el-radio label="男">男</el-radio>
            <el-radio label="女">女</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="出生日期" prop="birthDate">
          <el-date-picker
            v-model="formData.birthDate"
            type="date"
            placeholder="选择出生日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="联系电话" prop="phone">
          <el-input
            v-model="formData.phone"
            placeholder="请输入联系电话"
            type="tel"
          >
            <template #prepend>
              <el-icon><Phone /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="现住址" prop="address">
          <el-input
            v-model="formData.address"
            type="textarea"
            :rows="3"
            placeholder="请输入详细地址"
          />
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="3"
            placeholder="如有特殊情况请说明"
          />
        </el-form-item>
      </el-form>
    </div>
  `,
  props: ['formData'],
  emits: ['update', 'validate', 'voice-input'],
  setup(props, { emit }) {
    const { ref: formRef } = useForm()
    const { Phone } = useElementPlusIcons()

    const rules = {
      reason: [{ required: true, message: '请选择补办原因', trigger: 'change' }],
      name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
      idCard: [
        { required: true, message: '请输入身份证号', trigger: 'blur' },
        { pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/, message: '请输入正确的身份证号', trigger: 'blur' }
      ],
      gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
      birthDate: [{ required: true, message: '请选择出生日期', trigger: 'change' }],
      phone: [
        { required: true, message: '请输入联系电话', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
      ],
      address: [{ required: true, message: '请输入现住址', trigger: 'blur' }]
    }

    // 加载用户信息
    const loadUserInfo = async () => {
      try {
        const response = await profileApi.getMyProfile()
        const profile = response.data

        if (profile) {
          props.formData.name = profile.personalInfo?.name || ''
          props.formData.idCard = profile.personalInfo?.idCard || ''
          props.formData.gender = profile.personalInfo?.gender || ''
          props.formData.phone = profile.contact?.phone || ''
          props.formData.address = profile.contact?.address || ''
        }
      } catch (error) {
        console.error('Load user info error:', error)
      }
    }

    // 监听表单验证
    const handleValidate = () => {
      formRef.value?.validate((valid) => {
        emit('validate', valid)
      })
    }

    onMounted(() => {
      loadUserInfo()
    })

    return { formRef, rules, Phone, handleValidate }
  }
}

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
          <p>1. 请确保照片清晰,边角完整,信息可见</p>
          <p>2. 支持JPG、PNG格式,单个文件不超过5MB</p>
          <p>3. 证件照片应为近期免冠照片</p>
        </template>
      </el-alert>

      <div class="upload-section">
        <div class="upload-item">
          <h4>证件照片 <span class="required">*</span></h4>
          <p class="upload-tip">请上传近期免冠彩色照片</p>
          <ImageUploader
            v-model="formData.photo"
            :required="true"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item">
          <h4>身份证照片 <span class="required">*</span></h4>
          <p class="upload-tip">请上传身份证正反面照片</p>
          <ImageUploader
            v-model="formData.idCardPhoto"
            :required="true"
            :multiple="true"
            :max-count="2"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item">
          <h4>户口本照片</h4>
          <p class="upload-tip">请上传户口本首页和本人页</p>
          <ImageUploader
            v-model="formData.householdPhoto"
            :multiple="true"
            :max-count="2"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item">
          <h4>其他材料</h4>
          <p class="upload-tip">如有其他证明材料可上传</p>
          <ImageUploader
            v-model="formData.otherPhotos"
            :multiple="true"
            :max-count="5"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>
      </div>
    </div>
  `,
  props: ['formData'],
  emits: ['update', 'validate'],
  setup(props, { emit }) {
    const handleUpdate = () => {
      emit('update', { ...props.formData })
    }

    const handleValidate = (isValid) => {
      emit('validate', isValid)
    }

    return { handleUpdate, handleValidate }
  }
}

const ConfirmStep = {
  template: `
    <div class="confirm-step">
      <el-result
        icon="warning"
        title="请核对您的申请信息"
        sub-title="确认信息无误后点击提交按钮"
      />

      <el-descriptions
        :column="2"
        border
        style="margin: 24px 0"
      >
        <el-descriptions-item label="补办原因">
          {{ getReasonLabel(formData.reason) }}
        </el-descriptions-item>
        <el-descriptions-item label="姓名">
          {{ formData.name }}
        </el-descriptions-item>
        <el-descriptions-item label="身份证号">
          {{ maskIdCard(formData.idCard) }}
        </el-descriptions-item>
        <el-descriptions-item label="性别">
          {{ formData.gender }}
        </el-descriptions-item>
        <el-descriptions-item label="出生日期">
          {{ formData.birthDate }}
        </el-descriptions-item>
        <el-descriptions-item label="联系电话">
          {{ formData.phone }}
        </el-descriptions-item>
        <el-descriptions-item label="现住址" :span="2">
          {{ formData.address }}
        </el-descriptions-item>
        <el-descriptions-item label="领取方式" :span="2">
          {{ formData.receiveMethod === 'mail' ? '邮寄' : '自取' }}
        </el-descriptions-item>
      </el-descriptions>

      <el-divider>已上传材料</el-divider>

      <div class="uploaded-files">
        <el-tag
          v-for="(file, index) in getUploadedFiles()"
          :key="index"
          type="success"
          size="large"
          style="margin: 0 8px 8px 0"
        >
          {{ file.name }}
        </el-tag>
      </div>

      <el-checkbox
        v-model="confirmed"
        style="margin-top: 24px"
        @change="handleConfirmChange"
      >
        我确认以上信息真实有效,如有虚假愿意承担法律责任
      </el-checkbox>
    </div>
  `,
  props: ['formData'],
  emits: ['validate'],
  setup(props, { emit }) {
    const confirmed = ref(false)

    const getReasonLabel = (reason) => {
      const map = {
        lost: '丢失补办',
        damaged: '损坏换领',
        expired: '到期换领',
        change: '信息变更'
      }
      return map[reason] || reason
    }

    const maskIdCard = (idCard) => {
      if (!idCard) return ''
      return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')
    }

    const getUploadedFiles = () => {
      const files = []
      if (props.formData.photo) files.push({ name: '证件照片' })
      if (props.formData.idCardPhoto) files.push({ name: '身份证照片' })
      if (props.formData.householdPhoto) files.push({ name: '户口本照片' })
      if (props.formData.otherPhotos?.length) {
        props.formData.otherPhotos.forEach((photo, index) => {
          files.push({ name: \`其他材料\${index + 1}\` })
        })
      }
      return files
    }

    const handleConfirmChange = (val) => {
      emit('validate', val)
    }

    return {
      confirmed,
      getReasonLabel,
      maskIdCard,
      getUploadedFiles,
      handleConfirmChange
    }
  }
}

// 处理数据更新
const handleUpdate = (data) => {
  Object.assign(formData, data)
}

// 处理语音输入
const handleVoiceInput = (field, text) => {
  // 根据field将text值设置到formData
  if (field === 'name') {
    // 提取名字(假设语音输入包含"我叫xxx"或"我是xxx")
    const nameMatch = text.match(/(?:我叫|我是|姓名是)([\\u4e00-\\u9fa5]{2,4})/)
    if (nameMatch) {
      formData.name = nameMatch[1]
      ElMessage.success(\`已识别姓名: \${formData.name}\`)
    }
  }
}

// 提交申请
const handleSubmit = async (data) => {
  try {
    await serviceApi.submitIdCardApplication({
      ...data,
      serviceType: 'id-card',
      serviceName: '身份证补办/换领'
    })

    ElMessage.success('申请已提交,请耐心等待审核')
    emit('submitted', data)
    emit('close')
  } catch (error) {
    ElMessage.error('提交失败: ' + error.message)
    throw error
  }
}
</script>

<style lang="scss" scoped>
.id-card-application {
  .basic-info-step {
    :deep(.el-form-item__label) {
      font-weight: 500;
    }
  }

  .upload-step {
    .upload-section {
      display: flex;
      flex-direction: column;
      gap: 32px;

      .upload-item {
        h4 {
          margin: 0 0 8px 0;
          font-size: 16px;
          color: #303133;

          .required {
            color: #f56c6c;
            margin-left: 4px;
          }
        }

        .upload-tip {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #909399;
        }
      }
    }
  }

  .confirm-step {
    .uploaded-files {
      margin: 16px 0;
    }
  }
}

// 大字模式适配
.large-text-mode {
  .id-card-application {
    .upload-step {
      .upload-section {
        gap: 40px;

        .upload-item {
          h4 {
            font-size: 19px;
          }

          .upload-tip {
            font-size: 16px;
          }
        }
      }
    }
  }
}
</style>
