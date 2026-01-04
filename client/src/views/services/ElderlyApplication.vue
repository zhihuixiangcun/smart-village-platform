<template>
  <div class="elderly-application" :class="{ 'large-text-mode': isLargeText }">
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
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import StepForm from '@/components/common/StepForm.vue'
import { useLargeText } from '@/composables/useLargeText'
import { profileApi } from '@/api/residentProfile'
import { serviceApi } from '@/api/service'
import { encryptionService } from '@/utils/encryption'
import { auditLogService } from '@/utils/security'

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
    description: '填写申请人基本资料'
  },
  {
    title: '补贴类型',
    description: '选择申请的补贴类型'
  },
  {
    title: '材料上传',
    description: '上传证明材料'
  },
  {
    title: '确认提交',
    description: '核对信息并提交'
  }
]

// 表单数据
const formData = reactive({
  // 基本信息
  applicantName: '',
  applicantIdCard: '',
  applicantPhone: '',
  address: '',
  birthDate: '',
  age: 0,
  householdType: '', // 户口性质

  // 补贴类型
  subsidyTypes: [], // 补贴类型:高龄津贴, 养老服务补贴
  livingCondition: '', // 生活状况: 独居, 与子女同住, 养老机构
  healthCondition: '', // 健康状况: 健康, 基本自理, 部分自理, 不能自理
  careLevel: '', // 照护等级: 重度, 中度, 轻度

  // 银行信息
  bankName: '',
  bankAccount: '',
  accountHolder: '',

  // 紧急联系人
  emergencyContact: '',
  emergencyPhone: '',
  emergencyRelation: '',

  // 材料上传
  idCardPhotos: [],
  householdPhotos: [],
  bankCardPhotos: [],
  elderlyCardPhotos: [],
  medicalReport: [],
  otherMaterials: [],

  // 备注
  remark: ''
})

// 补贴类型选项
const subsidyTypeOptions = [
  { label: '高龄津贴(80-89周岁)', value: 'age_80_89' },
  { label: '高龄津贴(90-99周岁)', value: 'age_90_99' },
  { label: '高龄津贴(100周岁以上)', value: 'age_100_plus' },
  { label: '养老服务补贴', value: 'service' }
]

// 组件
const BasicInfoStep = {
  template: `
    <div class="basic-info-step">
      <el-alert
        title="申请须知"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      >
        <template #default>
          <p>1. 高龄津贴:本村户籍80周岁及以上老年人</p>
          <p>2. 养老服务补贴:60周岁及以上失能、失智、重度残疾老年人</p>
          <p>3. 需提供真实有效的证明材料</p>
        </template>
      </el-alert>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="140px"
        label-position="left"
      >
        <el-form-item label="申请人姓名" prop="applicantName">
          <el-input
            v-model="formData.applicantName"
            placeholder="请输入申请人姓名"
            :disabled="true"
          >
            <template #append>
              <el-button icon="Microphone" @click="$emit('voice-input', 'applicantName')" />
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="身份证号" prop="applicantIdCard">
          <el-input
            v-model="formData.applicantIdCard"
            placeholder="请输入身份证号"
            :disabled="true"
            @input="calculateAge"
          />
        </el-form-item>

        <el-form-item label="出生日期" prop="birthDate">
          <el-date-picker
            v-model="formData.birthDate"
            type="date"
            placeholder="选择出生日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
            @change="calculateAgeFromBirth"
          />
        </el-form-item>

        <el-form-item label="年龄">
          <el-tag size="large" type="success">{{ formData.age }}周岁</el-tag>
        </el-form-item>

        <el-form-item label="联系电话" prop="applicantPhone">
          <el-input
            v-model="formData.applicantPhone"
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

        <el-form-item label="户口性质" prop="householdType">
          <el-radio-group v-model="formData.householdType">
            <el-radio label="农业">农业户口</el-radio>
            <el-radio label="非农业">非农业户口</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-divider>紧急联系人</el-divider>

        <el-form-item label="紧急联系人" prop="emergencyContact">
          <el-input
            v-model="formData.emergencyContact"
            placeholder="请输入紧急联系人姓名"
          />
        </el-form-item>

        <el-form-item label="紧急联系电话" prop="emergencyPhone">
          <el-input
            v-model="formData.emergencyPhone"
            placeholder="请输入紧急联系电话"
            type="tel"
          />
        </el-form-item>

        <el-form-item label="与申请人关系" prop="emergencyRelation">
          <el-select v-model="formData.emergencyRelation" placeholder="选择关系" style="width: 100%">
            <el-option label="配偶" value="配偶" />
            <el-option label="子女" value="子女" />
            <el-option label="父母" value="父母" />
            <el-option label="其他亲属" value="其他亲属" />
            <el-option label="朋友" value="朋友" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>
  `,
  props: ['formData'],
  emits: ['update', 'validate', 'voice-input'],
  setup(props, { emit }) {
    const { Phone } = useElementPlusIcons()

    const rules = {
      applicantName: [{ required: true, message: '请输入申请人姓名', trigger: 'blur' }],
      applicantIdCard: [
        { required: true, message: '请输入身份证号', trigger: 'blur' },
        { pattern: /^(\d{15}$|^\d{18}$|^\d{17}(\d|X|x)$)/, message: '请输入正确的身份证号', trigger: 'blur' }
      ],
      applicantPhone: [
        { required: true, message: '请输入联系电话', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
      ],
      address: [{ required: true, message: '请输入现住址', trigger: 'blur' }],
      householdType: [{ required: true, message: '请选择户口性质', trigger: 'change' }],
      emergencyContact: [{ required: true, message: '请输入紧急联系人', trigger: 'blur' }],
      emergencyPhone: [
        { required: true, message: '请输入紧急联系电话', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
      ]
    }

    // 从身份证号计算年龄
    const calculateAge = () => {
      const idCard = props.formData.applicantIdCard
      if (idCard && idCard.length >= 15) {
        let birthYear = idCard.length === 18 ? idCard.substring(6, 10) : '19' + idCard.substring(6, 8)
        let birthMonth = idCard.length === 18 ? idCard.substring(10, 12) : idCard.substring(8, 10)
        let birthDay = idCard.length === 18 ? idCard.substring(12, 14) : idCard.substring(10, 12)

        props.formData.birthDate = `${birthYear}-${birthMonth}-${birthDay}`
        calculateAgeFromBirth()
      }
    }

    // 从出生日期计算年龄
    const calculateAgeFromBirth = () => {
      if (props.formData.birthDate) {
        const birthDate = new Date(props.formData.birthDate)
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
        props.formData.age = age

        emit('update', { ...props.formData })
      }
    }

    // 加载用户信息
    const loadUserInfo = async () => {
      try {
        const response = await profileApi.getMyProfile()
        const profile = response.data

        if (profile) {
          props.formData.applicantName = profile.personalInfo?.name || ''
          props.formData.applicantIdCard = profile.personalInfo?.idCard || ''
          props.formData.applicantPhone = profile.contact?.phone || ''
          props.formData.address = profile.contact?.address || ''
          props.formData.birthDate = profile.personalInfo?.birthDate || ''
          calculateAgeFromBirth()
        }
      } catch (error) {
        console.error('Load user info error:', error)
      }
    }

    onMounted(() => {
      loadUserInfo()
    })

    return { rules, Phone, calculateAge, calculateAgeFromBirth }
  }
}

const SubsidyTypeStep = {
  template: `
    <div class="subsidy-type-step">
      <el-alert
        title="补贴类型说明"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      >
        <template #default>
          <p><strong>高龄津贴:</strong></p>
          <p>• 80-89周岁:每人每月50元</p>
          <p>• 90-99周岁:每人每月100元</p>
          <p>• 100周岁以上:每人每月300元</p>
          <p style="margin-top: 8px"><strong>养老服务补贴:</strong></p>
          <p>• 失能、失智、重度残疾人每月可申请养老服务补贴</p>
        </template>
      </el-alert>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="140px"
        label-position="left"
      >
        <el-form-item label="补贴类型" prop="subsidyTypes">
          <el-checkbox-group v-model="formData.subsidyTypes">
            <el-checkbox
              label="age_80_89"
              :disabled="formData.age < 80"
            >
              高龄津贴(80-89周岁)
            </el-checkbox>
            <el-checkbox
              label="age_90_99"
              :disabled="formData.age < 90"
            >
              高龄津贴(90-99周岁)
            </el-checkbox>
            <el-checkbox
              label="age_100_plus"
              :disabled="formData.age < 100"
            >
              高龄津贴(100周岁以上)
            </el-checkbox>
            <el-checkbox label="service">
              养老服务补贴
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-divider />

        <h3 class="section-title">生活状况</h3>

        <el-form-item label="居住情况" prop="livingCondition">
          <el-radio-group v-model="formData.livingCondition">
            <el-radio label="alone">独居</el-radio>
            <el-radio label="family">与子女同住</el-radio>
            <el-radio label="institution">养老机构</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="健康状况" prop="healthCondition">
          <el-radio-group v-model="formData.healthCondition">
            <el-radio label="healthy">健康</el-radio>
            <el-radio label="basic">基本自理</el-radio>
            <el-radio label="partial">部分自理</el-radio>
            <el-radio label="unable">不能自理</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="照护等级" prop="careLevel">
          <el-select
            v-model="formData.careLevel"
            placeholder="选择照护等级(如已评定)"
            style="width: 100%"
            clearable
          >
            <el-option label="重度照护" value="severe" />
            <el-option label="中度照护" value="moderate" />
            <el-option label="轻度照护" value="mild" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>
  `,
  props: ['formData'],
  emits: ['update', 'validate'],
  setup(props, { emit }) {
    const rules = {
      subsidyTypes: [
        {
          type: 'array',
          required: true,
          message: '请至少选择一种补贴类型',
          trigger: 'change'
        }
      ],
      livingCondition: [{ required: true, message: '请选择居住情况', trigger: 'change' }],
      healthCondition: [{ required: true, message: '请选择健康状况', trigger: 'change' }]
    }

    return { rules }
  }
}

const UploadStep = {
  template: `
    <div class="upload-step">
      <el-alert
        title="材料上传要求"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 24px"
      >
        <template #default>
          <p>1. 所有材料需真实有效,提供原件照片或扫描件</p>
          <p>2. 支持JPG、PNG格式,单个文件不超过5MB</p>
          <p>3. 100周岁以上老人需上传近期免冠照片</p>
        </template>
      </el-alert>

      <div class="upload-section">
        <div class="upload-item">
          <h4>身份证照片 <span class="required">*</span></h4>
          <p class="upload-tip">请上传身份证正反面照片</p>
          <ImageUploader
            v-model="formData.idCardPhotos"
            :required="true"
            :multiple="true"
            :max-count="2"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item">
          <h4>户口本照片 <span class="required">*</span></h4>
          <p class="upload-tip">请上传户口本首页和本人页</p>
          <ImageUploader
            v-model="formData.householdPhotos"
            :required="true"
            :multiple="true"
            :max-count="4"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item">
          <h4>老人证照片</h4>
          <p class="upload-tip">如有老人证请上传</p>
          <ImageUploader
            v-model="formData.elderlyCardPhotos"
            :multiple="true"
            :max-count="2"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item">
          <h4>银行卡照片 <span class="required">*</span></h4>
          <p class="upload-tip">请上传银行卡正面照片</p>
          <ImageUploader
            v-model="formData.bankCardPhotos"
            :required="true"
            :multiple="true"
            :max-count="2"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item">
          <h4>医疗证明</h4>
          <p class="upload-tip">申请养老服务补贴需上传失能/失智证明</p>
          <ImageUploader
            v-model="formData.medicalReport"
            :multiple="true"
            :max-count="10"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item">
          <h4>其他材料</h4>
          <p class="upload-tip">如有其他证明材料可上传</p>
          <ImageUploader
            v-model="formData.otherMaterials"
            :multiple="true"
            :max-count="10"
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
        <el-descriptions-item label="申请人姓名">
          {{ formData.applicantName }}
        </el-descriptions-item>
        <el-descriptions-item label="年龄">
          {{ formData.age }}周岁
        </el-descriptions-item>

        <el-descriptions-item label="身份证号">
          {{ maskIdCard(formData.applicantIdCard) }}
        </el-descriptions-item>
        <el-descriptions-item label="联系电话">
          {{ maskPhone(formData.applicantPhone) }}
        </el-descriptions-item>

        <el-descriptions-item label="户口性质">
          {{ formData.householdType === '农业' ? '农业户口' : '非农业户口' }}
        </el-descriptions-item>
        <el-descriptions-item label="居住情况">
          {{ getLivingConditionLabel(formData.livingCondition) }}
        </el-descriptions-item>

        <el-descriptions-item label="健康状况">
          {{ getHealthConditionLabel(formData.healthCondition) }}
        </el-descriptions-item>
        <el-descriptions-item label="照护等级" v-if="formData.careLevel">
          {{ getCareLevelLabel(formData.careLevel) }}
        </el-descriptions-item>

        <el-descriptions-item label="申请补贴类型" :span="2">
          <el-tag
            v-for="type in formData.subsidyTypes"
            :key="type"
            type="success"
            style="margin-right: 8px"
          >
            {{ getSubsidyTypeLabel(type) }}
          </el-tag>
        </el-descriptions-item>

        <el-descriptions-item label="开户银行">
          {{ formData.bankName }}
        </el-descriptions-item>
        <el-descriptions-item label="银行账号">
          {{ maskBankCard(formData.bankAccount) }}
        </el-descriptions-item>

        <el-descriptions-item label="紧急联系人">
          {{ formData.emergencyContact }}
        </el-descriptions-item>
        <el-descriptions-item label="紧急联系电话">
          {{ maskPhone(formData.emergencyPhone) }}
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

    const maskIdCard = (idCard) => {
      if (!idCard) return ''
      return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')
    }

    const maskPhone = (phone) => {
      if (!phone) return ''
      return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    }

    const maskBankCard = (card) => {
      if (!card) return ''
      return card.replace(/(\d{4})\d+(\d{4})/, '$1 **** **** $2')
    }

    const getLivingConditionLabel = (condition) => {
      const map = {
        alone: '独居',
        family: '与子女同住',
        institution: '养老机构'
      }
      return map[condition] || condition
    }

    const getHealthConditionLabel = (condition) => {
      const map = {
        healthy: '健康',
        basic: '基本自理',
        partial: '部分自理',
        unable: '不能自理'
      }
      return map[condition] || condition
    }

    const getCareLevelLabel = (level) => {
      const map = {
        severe: '重度照护',
        moderate: '中度照护',
        mild: '轻度照护'
      }
      return map[level] || level
    }

    const getSubsidyTypeLabel = (type) => {
      const map = {
        age_80_89: '高龄津贴(80-89周岁)',
        age_90_99: '高龄津贴(90-99周岁)',
        age_100_plus: '高龄津贴(100周岁以上)',
        service: '养老服务补贴'
      }
      return map[type] || type
    }

    const getUploadedFiles = () => {
      const files = []
      if (props.formData.idCardPhotos?.length) {
        files.push({ name: '身份证照片' })
      }
      if (props.formData.householdPhotos?.length) {
        files.push({ name: '户口本照片' })
      }
      if (props.formData.elderlyCardPhotos?.length) {
        files.push({ name: '老人证照片' })
      }
      if (props.formData.bankCardPhotos?.length) {
        files.push({ name: '银行卡照片' })
      }
      if (props.formData.medicalReport?.length) {
        files.push({ name: '医疗证明' })
      }
      if (props.formData.otherMaterials?.length) {
        files.push({ name: '其他材料' })
      }
      return files
    }

    const handleConfirmChange = (val) => {
      emit('validate', val)
    }

    return {
      confirmed,
      maskIdCard,
      maskPhone,
      maskBankCard,
      getLivingConditionLabel,
      getHealthConditionLabel,
      getCareLevelLabel,
      getSubsidyTypeLabel,
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
  if (field === 'applicantName') {
    const nameMatch = text.match(/(?:我叫|我是|姓名是)([\u4e00-\u9fa5]{2,4})/)
    if (nameMatch) {
      formData.applicantName = nameMatch[1]
      ElMessage.success(`已识别姓名: ${formData.applicantName}`)
    }
  }
}

// 提交申请
const handleSubmit = async (data) => {
  try {
    // 加密敏感信息
    const encryptedData = {
      ...data,
      applicantIdCard: encryptionService.encrypt(data.applicantIdCard),
      applicantPhone: encryptionService.encrypt(data.applicantPhone),
      emergencyPhone: encryptionService.encrypt(data.emergencyPhone),
      bankAccount: encryptionService.encrypt(data.bankAccount)
    }

    await serviceApi.submitElderlyApplication({
      ...encryptedData,
      serviceType: 'elderly',
      serviceName: '老年补贴申请'
    })

    // 记录操作日志
    await auditLogService.logApplicationSubmit('elderly', '老年补贴申请')

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
.elderly-application {
  .basic-info-step,
  .subsidy-type-step {
    :deep(.el-form-item__label) {
      font-weight: 500;
    }

    .section-title {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #303133;
      padding-bottom: 8px;
      border-bottom: 2px solid #409eff;
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
  .elderly-application {
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
