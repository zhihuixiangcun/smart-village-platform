<template>
  <div class="marriage-registration" :class="{ 'large-text-mode': isLargeText }">
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
    title: '男方信息',
    description: '填写男方基本资料'
  },
  {
    title: '女方信息',
    description: '填写女方基本资料'
  },
  {
    title: '材料上传',
    description: '上传所需证件照片'
  },
  {
    title: '预约时间',
    description: '选择办理时间'
  },
  {
    title: '确认提交',
    description: '核对信息并提交'
  }
]

// 表单数据
const formData = reactive({
  // 男方信息
  manName: '',
  manIdCard: '',
  manPhone: '',
  manAddress: '',
  manMaritalStatus: 'single', // single, divorced, widowed
  manDivorceProof: '', // 离婚证明(如适用)

  // 女方信息
  womanName: '',
  womanIdCard: '',
  womanPhone: '',
  womanAddress: '',
  womanMaritalStatus: 'single',
  womanDivorceProof: '',

  // 共同信息
  registrationType: 'first', // first, remarriage
  relationship: '', // 双方关系
  hasChildren: false,

  // 预约信息
  appointmentDate: '',
  appointmentTime: '',
  registrationOffice: '', // 登记地点

  // 材料上传
  manIdCardPhotos: [],
  womanIdCardPhotos: [],
  householdPhotos: [],
  photos: [], // 证件照
  otherMaterials: [],

  // 备注
  remark: ''
})

// 组件
const BasicInfoStep = {
  template: `
    <div class="basic-info-step">
      <el-alert
        title="预约须知"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      >
        <template #default>
          <p>1. 双方需携带身份证、户口本原件</p>
          <p>2. 离婚再婚需提供离婚证或法院判决书</p>
          <p>3. 3张2寸双方近期半身免冠合影照片</p>
          <p>4. 预约成功后请按时到场,逾期需重新预约</p>
        </template>
      </el-alert>

      <el-tabs v-model="activeTab" type="border-card">
        <el-tab-pane label="男方信息" name="man">
          <el-form
            ref="manFormRef"
            :model="formData"
            :rules="manRules"
            label-width="120px"
            label-position="left"
          >
            <el-form-item label="姓名" prop="manName">
              <el-input
                v-model="formData.manName"
                placeholder="请输入男方姓名"
                :disabled="true"
              >
                <template #append>
                  <el-button icon="Microphone" @click="$emit('voice-input', 'manName')" />
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="身份证号" prop="manIdCard">
              <el-input
                v-model="formData.manIdCard"
                placeholder="请输入男方身份证号"
                :disabled="true"
              />
            </el-form-item>

            <el-form-item label="联系电话" prop="manPhone">
              <el-input
                v-model="formData.manPhone"
                placeholder="请输入男方联系电话"
                type="tel"
              >
                <template #prepend>
                  <el-icon><Phone /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="现住址" prop="manAddress">
              <el-input
                v-model="formData.manAddress"
                type="textarea"
                :rows="3"
                placeholder="请输入男方现住址"
              />
            </el-form-item>

            <el-form-item label="婚姻状况" prop="manMaritalStatus">
              <el-radio-group v-model="formData.manMaritalStatus">
                <el-radio label="single">未婚</el-radio>
                <el-radio label="divorced">离婚</el-radio>
                <el-radio label="widowed">丧偶</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item
              v-if="formData.manMaritalStatus === 'divorced'"
              label="离婚证明"
              prop="manDivorceProof"
            >
              <el-input
                v-model="formData.manDivorceProof"
                placeholder="请输入离婚证号或法院判决书编号"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="女方信息" name="woman">
          <el-form
            ref="womanFormRef"
            :model="formData"
            :rules="womanRules"
            label-width="120px"
            label-position="left"
          >
            <el-form-item label="姓名" prop="womanName">
              <el-input
                v-model="formData.womanName"
                placeholder="请输入女方姓名"
              >
                <template #append>
                  <el-button icon="Microphone" @click="$emit('voice-input', 'womanName')" />
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="身份证号" prop="womanIdCard">
              <el-input
                v-model="formData.womanIdCard"
                placeholder="请输入女方身份证号"
              />
            </el-form-item>

            <el-form-item label="联系电话" prop="womanPhone">
              <el-input
                v-model="formData.womanPhone"
                placeholder="请输入女方联系电话"
                type="tel"
              >
                <template #prepend>
                  <el-icon><Phone /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="现住址" prop="womanAddress">
              <el-input
                v-model="formData.womanAddress"
                type="textarea"
                :rows="3"
                placeholder="请输入女方现住址"
              />
            </el-form-item>

            <el-form-item label="婚姻状况" prop="womanMaritalStatus">
              <el-radio-group v-model="formData.womanMaritalStatus">
                <el-radio label="single">未婚</el-radio>
                <el-radio label="divorced">离婚</el-radio>
                <el-radio label="widowed">丧偶</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item
              v-if="formData.womanMaritalStatus === 'divorced'"
              label="离婚证明"
              prop="womanDivorceProof"
            >
              <el-input
                v-model="formData.womanDivorceProof"
                placeholder="请输入离婚证号或法院判决书编号"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <el-divider />

      <el-form
        ref="commonFormRef"
        :model="formData"
        :rules="commonRules"
        label-width="120px"
        label-position="left"
      >
        <el-form-item label="登记类型" prop="registrationType">
          <el-radio-group v-model="formData.registrationType">
            <el-radio label="first">初婚登记</el-radio>
            <el-radio label="remarriage">再婚登记</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="双方关系" prop="relationship">
          <el-select v-model="formData.relationship" placeholder="请选择双方关系" style="width: 100%">
            <el-option label="无血缘关系" value="none" />
            <el-option label="三代以内旁系血亲" value="collateral" />
            <el-option label="直系血亲" value="direct" />
          </el-select>
        </el-form-item>

        <el-form-item label="是否有子女" prop="hasChildren">
          <el-switch v-model="formData.hasChildren" />
        </el-form-item>
      </el-form>
    </div>
  `,
  props: ['formData'],
  emits: ['update', 'validate', 'voice-input'],
  setup(props, { emit }) {
    const { Phone } = useElementPlusIcons()
    const activeTab = ref('man')

    const manRules = {
      manName: [{ required: true, message: '请输入男方姓名', trigger: 'blur' }],
      manIdCard: [
        { required: true, message: '请输入男方身份证号', trigger: 'blur' },
        { pattern: /^(\d{15}$|^\d{18}$|^\d{17}(\d|X|x)$)/, message: '请输入正确的身份证号', trigger: 'blur' }
      ],
      manPhone: [
        { required: true, message: '请输入男方联系电话', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
      ],
      manAddress: [{ required: true, message: '请输入男方现住址', trigger: 'blur' }],
      manMaritalStatus: [{ required: true, message: '请选择婚姻状况', trigger: 'change' }]
    }

    const womanRules = {
      womanName: [{ required: true, message: '请输入女方姓名', trigger: 'blur' }],
      womanIdCard: [
        { required: true, message: '请输入女方身份证号', trigger: 'blur' },
        { pattern: /^(\d{15}$|^\d{18}$|^\d{17}(\d|X|x)$)/, message: '请输入正确的身份证号', trigger: 'blur' }
      ],
      womanPhone: [
        { required: true, message: '请输入女方联系电话', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
      ],
      womanAddress: [{ required: true, message: '请输入女方现住址', trigger: 'blur' }],
      womanMaritalStatus: [{ required: true, message: '请选择婚姻状况', trigger: 'change' }]
    }

    const commonRules = {
      registrationType: [{ required: true, message: '请选择登记类型', trigger: 'change' }],
      relationship: [{ required: true, message: '请选择双方关系', trigger: 'change' }]
    }

    // 加载当前用户信息
    const loadUserInfo = async () => {
      try {
        const response = await profileApi.getMyProfile()
        const profile = response.data

        if (profile) {
          // 默认将当前用户信息填入男方信息
          props.formData.manName = profile.personalInfo?.name || ''
          props.formData.manIdCard = profile.personalInfo?.idCard || ''
          props.formData.manPhone = profile.contact?.phone || ''
          props.formData.manAddress = profile.contact?.address || ''
        }
      } catch (error) {
        console.error('Load user info error:', error)
      }
    }

    onMounted(() => {
      loadUserInfo()
    })

    return { activeTab, manRules, womanRules, commonRules, Phone }
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
          <p>1. 请确保照片清晰,信息完整可见</p>
          <p>2. 支持JPG、PNG格式,单个文件不超过5MB</p>
          <p>3. 证件照需为2寸双方近期半身免冠合影</p>
        </template>
      </el-alert>

      <div class="upload-section">
        <div class="upload-item">
          <h4>男方身份证照片 <span class="required">*</span></h4>
          <p class="upload-tip">请上传身份证正反面照片</p>
          <ImageUploader
            v-model="formData.manIdCardPhotos"
            :required="true"
            :multiple="true"
            :max-count="2"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item">
          <h4>女方身份证照片 <span class="required">*</span></h4>
          <p class="upload-tip">请上传身份证正反面照片</p>
          <ImageUploader
            v-model="formData.womanIdCardPhotos"
            :required="true"
            :multiple="true"
            :max-count="2"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item">
          <h4>户口本照片 <span class="required">*</span></h4>
          <p class="upload-tip">请上传双方户口本首页和本人页</p>
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
          <h4>证件照 <span class="required">*</span></h4>
          <p class="upload-tip">请上传2寸双方近期半身免冠合影照片(3张)</p>
          <ImageUploader
            v-model="formData.photos"
            :required="true"
            :multiple="true"
            :max-count="3"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item">
          <h4>其他材料</h4>
          <p class="upload-tip">如有其他证明材料可上传(如离婚证明)</p>
          <ImageUploader
            v-model="formData.otherMaterials"
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

const AppointmentStep = {
  template: `
    <div class="appointment-step">
      <el-alert
        title="预约须知"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 24px"
      >
        <template #default>
          <p>1. 工作日: 周一至周五 9:00-12:00, 14:00-17:00</p>
          <p>2. 预约成功后请按时到场,逾期需重新预约</p>
          <p>3. 如需取消预约,请至少提前1天</p>
        </template>
      </el-alert>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="120px"
        label-position="left"
      >
        <el-form-item label="预约日期" prop="appointmentDate">
          <el-date-picker
            v-model="formData.appointmentDate"
            type="date"
            placeholder="选择预约日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :disabled-date="disabledDate"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="预约时间" prop="appointmentTime">
          <el-select v-model="formData.appointmentTime" placeholder="选择预约时间" style="width: 100%">
            <el-option label="上午 9:00-10:00" value="09:00-10:00" />
            <el-option label="上午 10:00-11:00" value="10:00-11:00" />
            <el-option label="上午 11:00-12:00" value="11:00-12:00" />
            <el-option label="下午 14:00-15:00" value="14:00-15:00" />
            <el-option label="下午 15:00-16:00" value="15:00-16:00" />
            <el-option label="下午 16:00-17:00" value="16:00-17:00" />
          </el-select>
        </el-form-item>

        <el-form-item label="登记地点" prop="registrationOffice">
          <el-select v-model="formData.registrationOffice" placeholder="选择登记地点" style="width: 100%">
            <el-option label="区民政局婚姻登记处" value="district" />
            <el-option label="市民政局婚姻登记处" value="city" />
          </el-select>
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="4"
            placeholder="如有特殊情况请说明"
          />
        </el-form-item>
      </el-form>
    </div>
  `,
  props: ['formData'],
  emits: ['update', 'validate'],
  setup(props, { emit }) {
    const rules = {
      appointmentDate: [{ required: true, message: '请选择预约日期', trigger: 'change' }],
      appointmentTime: [{ required: true, message: '请选择预约时间', trigger: 'change' }],
      registrationOffice: [{ required: true, message: '请选择登记地点', trigger: 'change' }]
    }

    const disabledDate = (time) => {
      // 禁用周末和过去的日期
      const day = time.getDay()
      const isWeekend = day === 0 || day === 6
      const isPast = time.getTime() < Date.now() - 8.64e7 // 减去一天,允许今天预约
      return isWeekend || isPast
    }

    return { rules, disabledDate }
  }
}

const ConfirmStep = {
  template: `
    <div class="confirm-step">
      <el-result
        icon="warning"
        title="请核对您的预约信息"
        sub-title="确认信息无误后点击提交按钮"
      />

      <el-descriptions
        :column="2"
        border
        style="margin: 24px 0"
      >
        <el-descriptions-item label="登记类型">
          {{ getRegistrationTypeLabel(formData.registrationType) }}
        </el-descriptions-item>
        <el-descriptions-item label="双方关系">
          {{ getRelationshipLabel(formData.relationship) }}
        </el-descriptions-item>

        <el-descriptions-item label="男方姓名">
          {{ formData.manName }}
        </el-descriptions-item>
        <el-descriptions-item label="女方姓名">
          {{ formData.womanName }}
        </el-descriptions-item>

        <el-descriptions-item label="男方身份证号">
          {{ maskIdCard(formData.manIdCard) }}
        </el-descriptions-item>
        <el-descriptions-item label="女方身份证号">
          {{ maskIdCard(formData.womanIdCard) }}
        </el-descriptions-item>

        <el-descriptions-item label="男方联系电话">
          {{ maskPhone(formData.manPhone) }}
        </el-descriptions-item>
        <el-descriptions-item label="女方联系电话">
          {{ maskPhone(formData.womanPhone) }}
        </el-descriptions-item>

        <el-descriptions-item label="预约日期" :span="2">
          {{ formData.appointmentDate }} {{ formData.appointmentTime }}
        </el-descriptions-item>

        <el-descriptions-item label="登记地点" :span="2">
          {{ getOfficeLabel(formData.registrationOffice) }}
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

    const getRegistrationTypeLabel = (type) => {
      const map = {
        first: '初婚登记',
        remarriage: '再婚登记'
      }
      return map[type] || type
    }

    const getRelationshipLabel = (relationship) => {
      const map = {
        none: '无血缘关系',
        collateral: '三代以内旁系血亲',
        direct: '直系血亲'
      }
      return map[relationship] || relationship
    }

    const getOfficeLabel = (office) => {
      const map = {
        district: '区民政局婚姻登记处',
        city: '市民政局婚姻登记处'
      }
      return map[office] || office
    }

    const maskIdCard = (idCard) => {
      if (!idCard) return ''
      return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')
    }

    const maskPhone = (phone) => {
      if (!phone) return ''
      return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    }

    const getUploadedFiles = () => {
      const files = []
      if (props.formData.manIdCardPhotos?.length) {
        files.push({ name: '男方身份证照片' })
      }
      if (props.formData.womanIdCardPhotos?.length) {
        files.push({ name: '女方身份证照片' })
      }
      if (props.formData.householdPhotos?.length) {
        files.push({ name: '户口本照片' })
      }
      if (props.formData.photos?.length) {
        files.push({ name: '证件照' })
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
      getRegistrationTypeLabel,
      getRelationshipLabel,
      getOfficeLabel,
      maskIdCard,
      maskPhone,
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
  if (field === 'manName') {
    const nameMatch = text.match(/(?:我叫|我是|姓名是)([\u4e00-\u9fa5]{2,4})/)
    if (nameMatch) {
      formData.manName = nameMatch[1]
      ElMessage.success(`已识别姓名: ${formData.manName}`)
    }
  } else if (field === 'womanName') {
    const nameMatch = text.match(/(?:她叫|女方叫|女方姓名是)([\u4e00-\u9fa5]{2,4})/)
    if (nameMatch) {
      formData.womanName = nameMatch[1]
      ElMessage.success(`已识别姓名: ${formData.womanName}`)
    }
  }
}

// 提交申请
const handleSubmit = async (data) => {
  try {
    // 加密敏感信息
    const encryptedData = {
      ...data,
      manIdCard: encryptionService.encrypt(data.manIdCard),
      womanIdCard: encryptionService.encrypt(data.womanIdCard),
      manPhone: encryptionService.encrypt(data.manPhone),
      womanPhone: encryptionService.encrypt(data.womanPhone)
    }

    await serviceApi.submitMarriageRegistration({
      ...encryptedData,
      serviceType: 'marriage',
      serviceName: '结婚登记预约'
    })

    // 记录操作日志
    await auditLogService.logApplicationSubmit('marriage', '结婚登记预约')

    ElMessage.success('预约成功,请按时到场办理')
    emit('submitted', data)
    emit('close')
  } catch (error) {
    ElMessage.error('提交失败: ' + error.message)
    throw error
  }
}
</script>

<style lang="scss" scoped>
.marriage-registration {
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

  .appointment-step {
    max-width: 600px;
  }

  .confirm-step {
    .uploaded-files {
      margin: 16px 0;
    }
  }
}

// 大字模式适配
.large-text-mode {
  .marriage-registration {
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
