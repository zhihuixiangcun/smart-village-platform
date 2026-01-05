<template>
  <div class="event-application" :class="{ 'large-text-mode': isLargeText }">
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
    description: '填写活动基本资料'
  },
  {
    title: '活动详情',
    description: '填写活动详细信息'
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
  applicantPhone: '',
  eventType: '', // 活动类型: 婚礼, 丧礼, 生日宴, 满月酒, 其他
  eventName: '', // 活动名称

  // 活动时间
  eventDate: '',
  eventTime: '',
  endDate: '',
  estimatedDays: 1, // 预计天数

  // 活动地点
  eventLocation: '', // 举办地点: 家中, 宴会厅, 其他
  eventAddress: '', // 详细地址

  // 参与人员
  estimatedGuests: 0, // 预计人数
  guestDescription: '', // 参与人员说明

  // 服务需求
  needsVenue: false, // 是否需要场地
  needsCatering: false, // 是否需要餐饮
  needsEquipment: false, // 是否需要设备
  needsStaff: false, // 是否需要服务人员
  needsDecoration: false, // 是否需要布置

  // 具体需求
  specificRequirements: '',

  // 费用预算
  budget: 0,

  // 安全承诺
  safetyCommitment: false, // 安全承诺

  // 备注
  remark: ''
})

// 活动类型选项
const eventTypes = [
  { label: '婚礼', value: 'wedding' },
  { label: '丧礼', value: 'funeral' },
  { label: '生日宴', value: 'birthday' },
  { label: '满月酒', value: 'fullmoon' },
  { label: '升学宴', value: 'graduation' },
  { label: '乔迁宴', value: 'housewarming' },
  { label: '其他', value: 'other' }
]

// 举办地点选项
const eventLocations = ['家中', '村委会宴会厅', '农家乐', '酒店', '其他']

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
          <p>1. 活动举办需遵守村规民约和相关法规</p>
          <p>2. 大型活动需提前申请,做好安全防范</p>
          <p>3. 提倡节俭办事,反对铺张浪费</p>
          <p>4. 红白喜事需遵守疫情防控要求</p>
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

        <el-form-item label="活动类型" prop="eventType">
          <el-select v-model="formData.eventType" placeholder="选择活动类型" style="width: 100%">
            <el-option
              v-for="type in eventTypes"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="活动名称" prop="eventName">
          <el-input
            v-model="formData.eventName"
            placeholder="请输入活动名称(如:张三李四婚礼)"
          />
        </el-form-item>

        <el-form-item label="举办日期" prop="eventDate">
          <el-date-picker
            v-model="formData.eventDate"
            type="date"
            placeholder="选择举办日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
            :disabled-date="disabledDate"
          />
        </el-form-item>

        <el-form-item label="举办时间" prop="eventTime">
          <el-time-picker
            v-model="formData.eventTime"
            placeholder="选择开始时间"
            format="HH:mm"
            value-format="HH:mm"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="结束日期">
          <el-date-picker
            v-model="formData.endDate"
            type="date"
            placeholder="选择结束日期(如适用)"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="预计天数" prop="estimatedDays">
          <el-input-number
            v-model="formData.estimatedDays"
            :min="1"
            :max="7"
            :step="1"
            style="width: 200px"
          />
        </el-form-item>

        <el-form-item label="举办地点" prop="eventLocation">
          <el-select v-model="formData.eventLocation" placeholder="选择举办地点" style="width: 100%">
            <el-option
              v-for="location in eventLocations"
              :key="location"
              :label="location"
              :value="location"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="详细地址" prop="eventAddress">
          <el-input
            v-model="formData.eventAddress"
            type="textarea"
            :rows="3"
            placeholder="请输入详细地址"
          />
        </el-form-item>
      </el-form>
    </div>
  `,
  props: ['formData'],
  emits: ['update', 'validate', 'voice-input'],
  setup(props, { emit }) {
    const { Phone } = useElementPlusIcons()

    const eventTypes = [
      { label: '婚礼', value: 'wedding' },
      { label: '丧礼', value: 'funeral' },
      { label: '生日宴', value: 'birthday' },
      { label: '满月酒', value: 'fullmoon' },
      { label: '升学宴', value: 'graduation' },
      { label: '乔迁宴', value: 'housewarming' },
      { label: '其他', value: 'other' }
    ]

    const eventLocations = ['家中', '村委会宴会厅', '农家乐', '酒店', '其他']

    const rules = {
      applicantName: [{ required: true, message: '请输入申请人姓名', trigger: 'blur' }],
      applicantPhone: [
        { required: true, message: '请输入联系电话', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
      ],
      eventType: [{ required: true, message: '请选择活动类型', trigger: 'change' }],
      eventName: [{ required: true, message: '请输入活动名称', trigger: 'blur' }],
      eventDate: [{ required: true, message: '请选择举办日期', trigger: 'change' }],
      eventTime: [{ required: true, message: '请选择举办时间', trigger: 'change' }],
      estimatedDays: [{ required: true, message: '请输入预计天数', trigger: 'blur' }],
      eventLocation: [{ required: true, message: '请选择举办地点', trigger: 'change' }],
      eventAddress: [{ required: true, message: '请输入详细地址', trigger: 'blur' }]
    }

    const disabledDate = (time) => {
      // 禁用过去的日期
      return time.getTime() < Date.now() - 8.64e7
    }

    // 加载用户信息
    const loadUserInfo = async () => {
      try {
        const response = await profileApi.getMyProfile()
        const profile = response.data

        if (profile) {
          props.formData.applicantName = profile.personalInfo?.name || ''
          props.formData.applicantPhone = profile.contact?.phone || ''
        }
      } catch (error) {
        console.error('Load user info error:', error)
      }
    }

    onMounted(() => {
      loadUserInfo()
    })

    return { Phone, eventTypes, eventLocations, rules, disabledDate }
  }
}

const EventDetailStep = {
  template: `
    <div class="event-detail-step">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="140px"
        label-position="left"
      >
        <h3 class="section-title">参与人员</h3>

        <el-form-item label="预计人数" prop="estimatedGuests">
          <el-input-number
            v-model="formData.estimatedGuests"
            :min="1"
            :max="1000"
            :step="10"
            style="width: 200px; margin-right: 12px"
          />
          <span>人</span>
        </el-form-item>

        <el-form-item label="参与人员说明">
          <el-input
            v-model="formData.guestDescription"
            type="textarea"
            :rows="3"
            placeholder="请简要说明参与人员范围(如亲友、邻居、同事等)"
          />
        </el-form-item>

        <el-divider />

        <h3 class="section-title">服务需求</h3>

        <el-form-item label="服务项目">
          <el-checkbox-group v-model="serviceItems">
            <el-checkbox label="needsVenue">需要场地</el-checkbox>
            <el-checkbox label="needsCatering">需要餐饮</el-checkbox>
            <el-checkbox label="needsEquipment">需要设备</el-checkbox>
            <el-checkbox label="needsStaff">需要服务人员</el-checkbox>
            <el-checkbox label="needsDecoration">需要场地布置</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="具体需求">
          <el-input
            v-model="formData.specificRequirements"
            type="textarea"
            :rows="5"
            placeholder="请详细说明您的具体需求,如场地大小、餐饮标准、设备清单等"
          />
        </el-form-item>

        <el-form-item label="费用预算(元)">
          <el-input-number
            v-model="formData.budget"
            :min="0"
            :step="1000"
            :precision="0"
            style="width: 200px"
          />
        </el-form-item>

        <el-divider />

        <h3 class="section-title">安全承诺</h3>

        <el-form-item label="安全承诺" prop="safetyCommitment">
          <el-checkbox v-model="formData.safetyCommitment">
            我承诺活动期间遵守安全管理规定,做好安全防范措施,确保活动安全有序进行
          </el-checkbox>
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
    const serviceItems = ref([])

    const rules = {
      estimatedGuests: [{ required: true, message: '请输入预计人数', trigger: 'blur' }],
      safetyCommitment: [
        {
          type: 'enum',
          enum: [true],
          required: true,
          message: '请阅读并同意安全承诺',
          trigger: 'change'
        }
      ]
    }

    // 监听服务项目变化
    watch(serviceItems, (newVal) => {
      props.formData.needsVenue = newVal.includes('needsVenue')
      props.formData.needsCatering = newVal.includes('needsCatering')
      props.formData.needsEquipment = newVal.includes('needsEquipment')
      props.formData.needsStaff = newVal.includes('needsStaff')
      props.formData.needsDecoration = newVal.includes('needsDecoration')
      emit('update', { ...props.formData })
    })

    return { serviceItems, rules }
  }
}

const ConfirmStep = {
  template: `
    <div class="confirm-step">
      <el-result
        icon="warning"
        title="请核对您的活动信息"
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
        <el-descriptions-item label="联系电话">
          {{ maskPhone(formData.applicantPhone) }}
        </el-descriptions-item>

        <el-descriptions-item label="活动类型">
          {{ getEventTypeLabel(formData.eventType) }}
        </el-descriptions-item>
        <el-descriptions-item label="活动名称">
          {{ formData.eventName }}
        </el-descriptions-item>

        <el-descriptions-item label="举办时间" :span="2">
          {{ formData.eventDate }} {{ formData.eventTime }}
          <span v-if="formData.estimatedDays > 1">(预计{{ formData.estimatedDays }}天)</span>
        </el-descriptions-item>

        <el-descriptions-item label="举办地点">
          {{ formData.eventLocation }}
        </el-descriptions-item>
        <el-descriptions-item label="详细地址">
          {{ formData.eventAddress }}
        </el-descriptions-item>

        <el-descriptions-item label="预计人数">
          {{ formData.estimatedGuests }}人
        </el-descriptions-item>
        <el-descriptions-item label="费用预算">
          {{ formData.budget ? formData.budget + '元' : '未填写' }}
        </el-descriptions-item>

        <el-descriptions-item label="服务项目" :span="2">
          <el-tag
            v-for="item in selectedServices"
            :key="item.key"
            type="success"
            style="margin-right: 8px"
          >
            {{ item.label }}
          </el-tag>
          <span v-if="selectedServices.length === 0">无</span>
        </el-descriptions-item>

        <el-descriptions-item label="具体需求" :span="2" v-if="formData.specificRequirements">
          {{ formData.specificRequirements }}
        </el-descriptions-item>
      </el-descriptions>

      <el-alert
        title="温馨提示"
        type="warning"
        :closable="false"
        show-icon
        style="margin-top: 24px"
      >
        <template #default>
          <p>1. 活动前请确认场地、设备等安排</p>
          <p>2. 注意防火、用电安全,避免噪音扰民</p>
          <p>3. 提倡文明节俭,反对铺张浪费</p>
        </template>
      </el-alert>

      <el-checkbox
        v-model="confirmed"
        style="margin-top: 24px"
        @change="handleConfirmChange"
      >
        我确认以上信息真实有效
      </el-checkbox>
    </div>
  `,
  props: ['formData'],
  emits: ['validate'],
  setup(props, { emit }) {
    const confirmed = ref(false)

    const maskPhone = (phone) => {
      if (!phone) return ''
      return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    }

    const getEventTypeLabel = (type) => {
      const map = {
        wedding: '婚礼',
        funeral: '丧礼',
        birthday: '生日宴',
        fullmoon: '满月酒',
        graduation: '升学宴',
        housewarming: '乔迁宴',
        other: '其他'
      }
      return map[type] || type
    }

    const selectedServices = computed(() => {
      const services = [
        { key: 'needsVenue', label: '场地' },
        { key: 'needsCatering', label: '餐饮' },
        { key: 'needsEquipment', label: '设备' },
        { key: 'needsStaff', label: '服务人员' },
        { key: 'needsDecoration', label: '场地布置' }
      ]
      return services.filter(s => props.formData[s.key])
    })

    const handleConfirmChange = (val) => {
      emit('validate', val)
    }

    return {
      confirmed,
      maskPhone,
      getEventTypeLabel,
      selectedServices,
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
      applicantPhone: encryptionService.encrypt(data.applicantPhone)
    }

    await serviceApi.submitEventApplication({
      ...encryptedData,
      serviceType: 'event',
      serviceName: '红白喜事申请'
    })

    // 记录操作日志
    await auditLogService.logApplicationSubmit('event', '红白喜事申请')

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
.event-application {
  .basic-info-step,
  .event-detail-step {
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

  .confirm-step {
    .uploaded-files {
      margin: 16px 0;
    }
  }
}

// 大字模式适配
.large-text-mode {
  .event-application {
    .basic-info-step,
    .event-detail-step {
      .section-title {
        font-size: 19px;
      }
    }
  }
}
</style>
