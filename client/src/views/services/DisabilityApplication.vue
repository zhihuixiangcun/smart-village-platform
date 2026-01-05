<template>
  <div class="disability-application" :class="{ 'large-text-mode': isLargeText }">
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
    title: '残疾信息',
    description: '填写残疾相关情况'
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
  guardianName: '', // 监护人姓名
  guardianPhone: '', // 监护人电话
  guardianRelation: '', // 监护人关系

  // 残疾信息
  disabilityCertificateNo: '', // 残疾证号
  disabilityLevel: '', // 残疾等级: 一级, 二级, 三级, 四级
  disabilityType: '', // 残疾类型
  disabilityDate: '', // 发证日期
  issuingAuthority: '', // 发证机关

  // 补贴类型
  subsidyTypes: [], // 补贴类型: 生活补贴, 护理补贴
  bankName: '', // 开户银行
  bankAccount: '', // 银行账号
  accountHolder: '', // 账户持有人

  // 材料上传
  idCardPhotos: [],
  disabilityCardPhotos: [],
  householdPhotos: [],
  bankCardPhotos: [],
  medicalRecords: [],
  otherMaterials: [],

  // 备注
  remark: ''
})

// 残疾等级选项
const disabilityLevels = ['一级', '二级', '三级', '四级']

// 残疾类型选项
const disabilityTypes = [
  '视力残疾',
  '听力残疾',
  '言语残疾',
  '肢体残疾',
  '智力残疾',
  '精神残疾',
  '多重残疾'
]

// 补贴类型选项
const subsidyTypeOptions = [
  { label: '困难残疾人生活补贴', value: 'living' },
  { label: '重度残疾人护理补贴', value: 'nursing' }
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
          <p>1. 申请人需持有有效《中华人民共和国残疾人证》</p>
          <p>2. 困难生活补贴需家庭人均收入低于当地标准</p>
          <p>3. 护理补贴需残疾等级被评定为一级、二级且需要长期照料</p>
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
          />
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

        <el-divider>监护人信息(如适用)</el-divider>

        <el-form-item label="监护人姓名">
          <el-input
            v-model="formData.guardianName"
            placeholder="请输入监护人姓名"
          />
        </el-form-item>

        <el-form-item label="监护人电话">
          <el-input
            v-model="formData.guardianPhone"
            placeholder="请输入监护人电话"
            type="tel"
          />
        </el-form-item>

        <el-form-item label="监护人关系">
          <el-select v-model="formData.guardianRelation" placeholder="选择关系" style="width: 100%">
            <el-option label="配偶" value="配偶" />
            <el-option label="父母" value="父母" />
            <el-option label="子女" value="子女" />
            <el-option label="其他亲属" value="其他亲属" />
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
      address: [{ required: true, message: '请输入现住址', trigger: 'blur' }]
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
        }
      } catch (error) {
        console.error('Load user info error:', error)
      }
    }

    onMounted(() => {
      loadUserInfo()
    })

    return { rules, Phone }
  }
}

const DisabilityInfoStep = {
  template: `
    <div class="disability-info-step">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="140px"
        label-position="left"
      >
        <h3 class="section-title">残疾人证信息</h3>

        <el-form-item label="残疾证号" prop="disabilityCertificateNo">
          <el-input
            v-model="formData.disabilityCertificateNo"
            placeholder="请输入残疾证号"
          />
        </el-form-item>

        <el-form-item label="残疾等级" prop="disabilityLevel">
          <el-select v-model="formData.disabilityLevel" placeholder="选择残疾等级" style="width: 100%">
            <el-option
              v-for="level in disabilityLevels"
              :key="level"
              :label="level"
              :value="level"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="残疾类型" prop="disabilityType">
          <el-select v-model="formData.disabilityType" placeholder="选择残疾类型" style="width: 100%">
            <el-option
              v-for="type in disabilityTypes"
              :key="type"
              :label="type"
              :value="type"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="发证日期" prop="disabilityDate">
          <el-date-picker
            v-model="formData.disabilityDate"
            type="date"
            placeholder="选择发证日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="发证机关" prop="issuingAuthority">
          <el-input
            v-model="formData.issuingAuthority"
            placeholder="请输入发证机关"
          />
        </el-form-item>

        <el-divider />

        <h3 class="section-title">补贴申请</h3>

        <el-form-item label="补贴类型" prop="subsidyTypes">
          <el-checkbox-group v-model="formData.subsidyTypes">
            <el-checkbox label="living">困难残疾人生活补贴</el-checkbox>
            <el-checkbox label="nursing">重度残疾人护理补贴</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-alert
          title="补贴说明"
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 20px"
        >
          <template #default>
            <p>困难生活补贴:补助残疾人因残疾产生的额外支出</p>
            <p>护理补贴:补助残疾人因残疾需长期照护产生的支出</p>
            <p>符合条件的可同时申请两项补贴</p>
          </template>
        </el-alert>
      </el-form>
    </div>
  `,
  props: ['formData'],
  emits: ['update', 'validate'],
  setup(props, { emit }) {
    const disabilityLevels = ['一级', '二级', '三级', '四级']
    const disabilityTypes = [
      '视力残疾',
      '听力残疾',
      '言语残疾',
      '肢体残疾',
      '智力残疾',
      '精神残疾',
      '多重残疾'
    ]

    const rules = {
      disabilityCertificateNo: [{ required: true, message: '请输入残疾证号', trigger: 'blur' }],
      disabilityLevel: [{ required: true, message: '请选择残疾等级', trigger: 'change' }],
      disabilityType: [{ required: true, message: '请选择残疾类型', trigger: 'change' }],
      disabilityDate: [{ required: true, message: '请选择发证日期', trigger: 'change' }],
      issuingAuthority: [{ required: true, message: '请输入发证机关', trigger: 'blur' }],
      subsidyTypes: [
        {
          type: 'array',
          required: true,
          message: '请至少选择一种补贴类型',
          trigger: 'change'
        }
      ]
    }

    return { disabilityLevels, disabilityTypes, rules }
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
          <p>3. 银行卡需为本人一类账户</p>
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
          <h4>残疾证照片 <span class="required">*</span></h4>
          <p class="upload-tip">请上传残疾证照片(含个人信息和评定页)</p>
          <ImageUploader
            v-model="formData.disabilityCardPhotos"
            :required="true"
            :multiple="true"
            :max-count="4"
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
          <h4>病历资料</h4>
          <p class="upload-tip">如有相关病历可上传</p>
          <ImageUploader
            v-model="formData.medicalRecords"
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
        <el-descriptions-item label="身份证号">
          {{ maskIdCard(formData.applicantIdCard) }}
        </el-descriptions-item>

        <el-descriptions-item label="联系电话">
          {{ maskPhone(formData.applicantPhone) }}
        </el-descriptions-item>
        <el-descriptions-item label="残疾证号">
          {{ formData.disabilityCertificateNo }}
        </el-descriptions-item>

        <el-descriptions-item label="残疾等级">
          {{ formData.disabilityLevel }}
        </el-descriptions-item>
        <el-descriptions-item label="残疾类型">
          {{ formData.disabilityType }}
        </el-descriptions-item>

        <el-descriptions-item label="发证日期">
          {{ formData.disabilityDate }}
        </el-descriptions-item>
        <el-descriptions-item label="发证机关">
          {{ formData.issuingAuthority }}
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

        <el-descriptions-item label="监护人姓名" v-if="formData.guardianName">
          {{ formData.guardianName }}
        </el-descriptions-item>
        <el-descriptions-item label="监护人关系" v-if="formData.guardianRelation">
          {{ formData.guardianRelation }}
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

    const getSubsidyTypeLabel = (type) => {
      const map = {
        living: '困难残疾人生活补贴',
        nursing: '重度残疾人护理补贴'
      }
      return map[type] || type
    }

    const getUploadedFiles = () => {
      const files = []
      if (props.formData.idCardPhotos?.length) {
        files.push({ name: '身份证照片' })
      }
      if (props.formData.disabilityCardPhotos?.length) {
        files.push({ name: '残疾证照片' })
      }
      if (props.formData.householdPhotos?.length) {
        files.push({ name: '户口本照片' })
      }
      if (props.formData.bankCardPhotos?.length) {
        files.push({ name: '银行卡照片' })
      }
      if (props.formData.medicalRecords?.length) {
        files.push({ name: '病历资料' })
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
      bankAccount: encryptionService.encrypt(data.bankAccount)
    }

    await serviceApi.submitDisabilityApplication({
      ...encryptedData,
      serviceType: 'disability',
      serviceName: '残疾补贴申请'
    })

    // 记录操作日志
    await auditLogService.logApplicationSubmit('disability', '残疾补贴申请')

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
.disability-application {
  .basic-info-step,
  .disability-info-step {
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
  .disability-application {
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
