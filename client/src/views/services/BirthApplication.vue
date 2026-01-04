<template>
  <div class="birth-application" :class="{ 'large-text-mode': isLargeText }">
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
    title: '生育信息',
    description: '填写生育相关情况'
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
  // 产妇信息
  motherName: '',
  motherIdCard: '',
  motherPhone: '',
  motherAddress: '',
  motherEmployer: '', // 工作单位

  // 配偶信息
  fatherName: '',
  fatherIdCard: '',
  fatherPhone: '',
  fatherEmployer: '',

  // 新生儿信息
  babyName: '',
  babyGender: '', // 性别: 男, 女
  babyBirthDate: '', // 出生日期
  birthCertificateNo: '', // 出生医学证明编号
  hospitalName: '', // 出生医院

  // 生育情况
  birthType: '', // 生育类型: 一胎, 二胎, 三胎及以上
  deliveryMode: '', // 分娩方式: 顺产, 剖宫产
  isMultiple: false, // 是否多胞胎
  babyCount: 1, // 新生儿数量

  // 补贴信息
  subsidyType: 'maternity', // 补贴类型: 生育津贴, 陪产假, 育儿假

  // 银行信息
  bankName: '',
  bankAccount: '',
  accountHolder: '',

  // 材料上传
  motherIdCardPhotos: [],
  fatherIdCardPhotos: [],
  marriageCertificate: [], // 结婚证
  householdPhotos: [], // 户口本
  birthCertificate: [], // 出生医学证明
  hospitalProof: [], // 医院证明
  otherMaterials: [],

  // 备注
  remark: ''
})

// 生育类型选项
const birthTypes = ['一胎', '二胎', '三胎及以上']

// 分娩方式选项
const deliveryModes = ['顺产', '剖宫产']

// 补贴类型选项
const subsidyTypes = [
  { label: '生育津贴', value: 'maternity' },
  { label: '陪产假津贴', value: 'paternity' },
  { label: '育儿假津贴', value: 'parental' }
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
          <p>1. 生育补贴需提供真实有效的出生医学证明</p>
          <p>2. 符合国家生育政策,已办理生育登记</p>
          <p>3. 参加生育保险且在待遇期内</p>
          <p>4. 提供虚假材料将承担法律责任</p>
        </template>
      </el-alert>

      <el-tabs v-model="activeTab" type="border-card">
        <el-tab-pane label="产妇信息" name="mother">
          <el-form
            ref="motherFormRef"
            :model="formData"
            :rules="motherRules"
            label-width="140px"
            label-position="left"
          >
            <el-form-item label="产妇姓名" prop="motherName">
              <el-input
                v-model="formData.motherName"
                placeholder="请输入产妇姓名"
                :disabled="true"
              >
                <template #append>
                  <el-button icon="Microphone" @click="$emit('voice-input', 'motherName')" />
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="身份证号" prop="motherIdCard">
              <el-input
                v-model="formData.motherIdCard"
                placeholder="请输入身份证号"
                :disabled="true"
              />
            </el-form-item>

            <el-form-item label="联系电话" prop="motherPhone">
              <el-input
                v-model="formData.motherPhone"
                placeholder="请输入联系电话"
                type="tel"
              >
                <template #prepend>
                  <el-icon><Phone /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="现住址" prop="motherAddress">
              <el-input
                v-model="formData.motherAddress"
                type="textarea"
                :rows="3"
                placeholder="请输入详细地址"
              />
            </el-form-item>

            <el-form-item label="工作单位">
              <el-input
                v-model="formData.motherEmployer"
                placeholder="请输入工作单位"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="配偶信息" name="father">
          <el-form
            ref="fatherFormRef"
            :model="formData"
            :rules="fatherRules"
            label-width="140px"
            label-position="left"
          >
            <el-form-item label="配偶姓名" prop="fatherName">
              <el-input
                v-model="formData.fatherName"
                placeholder="请输入配偶姓名"
              />
            </el-form-item>

            <el-form-item label="身份证号" prop="fatherIdCard">
              <el-input
                v-model="formData.fatherIdCard"
                placeholder="请输入身份证号"
              />
            </el-form-item>

            <el-form-item label="联系电话" prop="fatherPhone">
              <el-input
                v-model="formData.fatherPhone"
                placeholder="请输入联系电话"
                type="tel"
              >
                <template #prepend>
                  <el-icon><Phone /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="工作单位">
              <el-input
                v-model="formData.fatherEmployer"
                placeholder="请输入工作单位"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>
  `,
  props: ['formData'],
  emits: ['update', 'validate', 'voice-input'],
  setup(props, { emit }) {
    const { Phone } = useElementPlusIcons()
    const activeTab = ref('mother')

    const motherRules = {
      motherName: [{ required: true, message: '请输入产妇姓名', trigger: 'blur' }],
      motherIdCard: [
        { required: true, message: '请输入身份证号', trigger: 'blur' },
        { pattern: /^(\d{15}$|^\d{18}$|^\d{17}(\d|X|x)$)/, message: '请输入正确的身份证号', trigger: 'blur' }
      ],
      motherPhone: [
        { required: true, message: '请输入联系电话', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
      ],
      motherAddress: [{ required: true, message: '请输入现住址', trigger: 'blur' }]
    }

    const fatherRules = {
      fatherName: [{ required: true, message: '请输入配偶姓名', trigger: 'blur' }],
      fatherIdCard: [
        { required: true, message: '请输入身份证号', trigger: 'blur' },
        { pattern: /^(\d{15}$|^\d{18}$|^\d{17}(\d|X|x)$)/, message: '请输入正确的身份证号', trigger: 'blur' }
      ],
      fatherPhone: [
        { required: true, message: '请输入联系电话', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
      ]
    }

    // 加载用户信息
    const loadUserInfo = async () => {
      try {
        const response = await profileApi.getMyProfile()
        const profile = response.data

        if (profile) {
          props.formData.motherName = profile.personalInfo?.name || ''
          props.formData.motherIdCard = profile.personalInfo?.idCard || ''
          props.formData.motherPhone = profile.contact?.phone || ''
          props.formData.motherAddress = profile.contact?.address || ''
        }
      } catch (error) {
        console.error('Load user info error:', error)
      }
    }

    onMounted(() => {
      loadUserInfo()
    })

    return { activeTab, Phone, motherRules, fatherRules }
  }
}

const BirthInfoStep = {
  template: `
    <div class="birth-info-step">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="140px"
        label-position="left"
      >
        <h3 class="section-title">新生儿信息</h3>

        <el-form-item label="婴儿姓名" prop="babyName">
          <el-input
            v-model="formData.babyName"
            placeholder="请输入婴儿姓名"
          />
        </el-form-item>

        <el-form-item label="性别" prop="babyGender">
          <el-radio-group v-model="formData.babyGender">
            <el-radio label="男">男</el-radio>
            <el-radio label="女">女</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="出生日期" prop="babyBirthDate">
          <el-date-picker
            v-model="formData.babyBirthDate"
            type="date"
            placeholder="选择出生日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="出生医学证明编号" prop="birthCertificateNo">
          <el-input
            v-model="formData.birthCertificateNo"
            placeholder="请输入出生医学证明编号"
          />
        </el-form-item>

        <el-form-item label="出生医院" prop="hospitalName">
          <el-input
            v-model="formData.hospitalName"
            placeholder="请输入出生医院全称"
          />
        </el-form-item>

        <el-divider />

        <h3 class="section-title">生育情况</h3>

        <el-form-item label="生育类型" prop="birthType">
          <el-radio-group v-model="formData.birthType">
            <el-radio
              v-for="type in birthTypes"
              :key="type"
              :label="type"
            >
              {{ type }}
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="分娩方式" prop="deliveryMode">
          <el-radio-group v-model="formData.deliveryMode">
            <el-radio
              v-for="mode in deliveryModes"
              :key="mode"
              :label="mode"
            >
              {{ mode }}
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="是否多胞胎">
          <el-switch
            v-model="formData.isMultiple"
            @change="handleMultipleChange"
          />
        </el-form-item>

        <el-form-item label="新生儿数量" prop="babyCount">
          <el-input-number
            v-model="formData.babyCount"
            :min="1"
            :max="5"
            :step="1"
            style="width: 200px"
          />
        </el-form-item>

        <el-divider />

        <h3 class="section-title">补贴信息</h3>

        <el-form-item label="补贴类型" prop="subsidyType">
          <el-checkbox-group v-model="selectedSubsidies">
            <el-checkbox label="maternity">生育津贴</el-checkbox>
            <el-checkbox label="paternity">陪产假津贴</el-checkbox>
            <el-checkbox label="parental">育儿假津贴</el-checkbox>
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
            <p>生育津贴:按国家规定标准发放</p>
            <p>陪产假津贴:男方享受陪产假期间的津贴</p>
            <p>育儿假津贴:符合育儿假政策的津贴</p>
          </template>
        </el-alert>

        <el-divider />

        <h3 class="section-title">银行信息</h3>

        <el-form-item label="开户银行">
          <el-input
            v-model="formData.bankName"
            placeholder="请输入开户银行"
          />
        </el-form-item>

        <el-form-item label="银行账号">
          <el-input
            v-model="formData.bankAccount"
            placeholder="请输入银行账号"
          />
        </el-form-item>

        <el-form-item label="账户持有人">
          <el-input
            v-model="formData.accountHolder"
            placeholder="请输入账户持有人姓名"
          />
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="3"
            placeholder="其他需要说明的情况"
          />
        </el-form-item>
      </el-form>
    </div>
  `,
  props: ['formData'],
  emits: ['update', 'validate'],
  setup(props, { emit }) {
    const birthTypes = ['一胎', '二胎', '三胎及以上']
    const deliveryModes = ['顺产', '剖宫产']
    const selectedSubsidies = ref(['maternity'])

    const rules = {
      babyName: [{ required: true, message: '请输入婴儿姓名', trigger: 'blur' }],
      babyGender: [{ required: true, message: '请选择性别', trigger: 'change' }],
      babyBirthDate: [{ required: true, message: '请选择出生日期', trigger: 'change' }],
      birthCertificateNo: [{ required: true, message: '请输入出生医学证明编号', trigger: 'blur' }],
      hospitalName: [{ required: true, message: '请输入出生医院', trigger: 'blur' }],
      birthType: [{ required: true, message: '请选择生育类型', trigger: 'change' }],
      deliveryMode: [{ required: true, message: '请选择分娩方式', trigger: 'change' }],
      babyCount: [{ required: true, message, message: '请输入新生儿数量', trigger: 'blur' }]
    }

    const handleMultipleChange = (val) => {
      if (val && props.formData.babyCount < 2) {
        props.formData.babyCount = 2
      }
    }

    // 监听补贴选择
    watch(selectedSubsidies, (newVal) => {
      if (newVal.length === 0) {
        // 至少选择一项
        selectedSubsidies.value = ['maternity']
      }
    })

    return { birthTypes, deliveryModes, selectedSubsidies, rules, handleMultipleChange }
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
          <p>3. 出生医学证明需包含完整的编号和盖章</p>
        </template>
      </el-alert>

      <div class="upload-section">
        <div class="upload-item">
          <h4>产妇身份证 <span class="required">*</span></h4>
          <p class="upload-tip">请上传身份证正反面照片</p>
          <ImageUploader
            v-model="formData.motherIdCardPhotos"
            :required="true"
            :multiple="true"
            :max-count="2"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item">
          <h4>配偶身份证 <span class="required">*</span></h4>
          <p class="upload-tip">请上传身份证正反面照片</p>
          <ImageUploader
            v-model="formData.fatherIdCardPhotos"
            :required="true"
            :multiple="true"
            :max-count="2"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item">
          <h4>结婚证 <span class="required">*</span></h4>
          <p class="upload-tip">请上传结婚证照片</p>
          <ImageUploader
            v-model="formData.marriageCertificate"
            :required="true"
            :multiple="true"
            :max-count="4"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item">
          <h4>户口本 <span class="required">*</span></h4>
          <p class="upload-tip">请上传户口本首页和本人页</p>
          <ImageUploader
            v-model="formData.householdPhotos"
            :required="true"
            :multiple="true"
            :max-count="6"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item">
          <h4>出生医学证明 <span class="required">*</span></h4>
          <p class="upload-tip">请上传出生医学证明照片</p>
          <ImageUploader
            v-model="formData.birthCertificate"
            :required="true"
            :multiple="true"
            :max-count="4"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item">
          <h4>医院证明</h4>
          <p class="upload-tip">请上传出院小结等医院证明</p>
          <ImageUploader
            v-model="formData.hospitalProof"
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
        <el-descriptions-item label="产妇姓名">
          {{ formData.motherName }}
        </el-descriptions-item>
        <el-descriptions-item label="产妇身份证号">
          {{ maskIdCard(formData.motherIdCard) }}
        </el-descriptions-item>

        <el-descriptions-item label="配偶姓名">
          {{ formData.fatherName }}
        </el-descriptions-item>
        <el-descriptions-item label="配偶身份证号">
          {{ maskIdCard(formData.fatherIdCard) }}
        </el-descriptions-item>

        <el-descriptions-item label="婴儿姓名">
          {{ formData.babyName }}
        </el-descriptions-item>
        <el-descriptions-item label="性别">
          {{ formData.babyGender }}
        </el-descriptions-item>

        <el-descriptions-item label="出生日期">
          {{ formData.babyBirthDate }}
        </el-descriptions-item>
        <el-descriptions-item label="出生医院">
          {{ formData.hospitalName }}
        </el-descriptions-item>

        <el-descriptions-item label="生育类型">
          {{ formData.birthType }}
        </el-descriptions-item>
        <el-descriptions-item label="分娩方式">
          {{ formData.deliveryMode }}
        </el-descriptions-item>

        <el-descriptions-item label="新生儿数量">
          {{ formData.babyCount }}个
        </el-descriptions-item>
        <el-descriptions-item label="是否多胞胎">
          {{ formData.isMultiple ? '是' : '否' }}
        </el-descriptions-item>

        <el-descriptions-item label="申请补贴" :span="2">
          <el-tag
            v-for="subsidy in subsidies"
            :key="subsidy"
            type="success"
            style="margin-right: 8px"
          >
            {{ getSubsidyLabel(subsidy) }}
          </el-tag>
        </el-descriptions-item>

        <el-descriptions-item label="开户银行">
          {{ formData.bankName }}
        </el-descriptions-item>
        <el-descriptions-item label="银行账号">
          {{ maskBankCard(formData.bankAccount) }}
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
    const subsidies = ref(['maternity'])

    const maskIdCard = (idCard) => {
      if (!idCard) return ''
      return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')
    }

    const maskBankCard = (card) => {
      if (!card) return ''
      return card.replace(/(\d{4})\d+(\d{4})/, '$1 **** **** $2')
    }

    const getSubsidyLabel = (subsidy) => {
      const map = {
        maternity: '生育津贴',
        paternity: '陪产假津贴',
        parental: '育儿假津贴'
      }
      return map[subsidy] || subsidy
    }

    const getUploadedFiles = () => {
      const files = []
      if (props.formData.motherIdCardPhotos?.length) {
        files.push({ name: '产妇身份证' })
      }
      if (props.formData.fatherIdCardPhotos?.length) {
        files.push({ name: '配偶身份证' })
      }
      if (props.formData.marriageCertificate?.length) {
        files.push({ name: '结婚证' })
      }
      if (props.formData.householdPhotos?.length) {
        files.push({ name: '户口本' })
      }
      if (props.formData.birthCertificate?.length) {
        files.push({ name: '出生医学证明' })
      }
      if (props.formData.hospitalProof?.length) {
        files.push({ name: '医院证明' })
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
      subsidies,
      maskIdCard,
      maskBankCard,
      getSubsidyLabel,
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
  if (field === 'motherName') {
    const nameMatch = text.match(/(?:我叫|我是|姓名是)([\u4e00-\u9fa5]{2,4})/)
    if (nameMatch) {
      formData.motherName = nameMatch[1]
      ElMessage.success(`已识别姓名: ${formData.motherName}`)
    }
  }
}

// 提交申请
const handleSubmit = async (data) => {
  try {
    // 加密敏感信息
    const encryptedData = {
      ...data,
      motherIdCard: encryptionService.encrypt(data.motherIdCard),
      motherPhone: encryptionService.encrypt(data.motherPhone),
      fatherIdCard: encryptionService.encrypt(data.fatherIdCard),
      fatherPhone: encryptionService.encrypt(data.fatherPhone),
      bankAccount: encryptionService.encrypt(data.bankAccount)
    }

    await serviceApi.submitBirthApplication({
      ...encryptedData,
      serviceType: 'birth',
      serviceName: '生育补贴申请'
    })

    // 记录操作日志
    await auditLogService.logApplicationSubmit('birth', '生育补贴申请')

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
.birth-application {
  .basic-info-step,
  .birth-info-step {
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
  .birth-application {
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
