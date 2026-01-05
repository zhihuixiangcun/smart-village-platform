<template>
  <div class="house-building-application" :class="{ 'large-text-mode': isLargeText }">
    <StepForm
      ref="stepFormRef"
      :steps="steps"
      :step-components="[BasicInfoStep, HouseInfoStep, UploadStep, ConfirmStep]"
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
    title: '申请人信息',
    description: '填写申请人基本资料'
  },
  {
    title: '建房信息',
    description: '填写建房相关情况'
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
  // 申请人信息
  applicantName: '',
  applicantIdCard: '',
  applicantPhone: '',
  address: '',
  householdCount: 0, // 家庭人口数

  // 建房类型
  buildType: '', // 建房类型: 新建, 改建, 扩建
  buildReason: '', // 建房原因
  oldHouseArea: 0, // 原房屋面积(平方米)
  oldHouseCondition: '', // 原房屋状况: 完好, 损坏, 危房

  // 新建房屋信息
  newHouseArea: 0, // 新建房屋面积(平方米)
  houseFloors: 0, // 楼层数
  houseStructure: '', // 房屋结构: 砖混, 框架, 其他
  buildAddress: '', // 建房地址

  // 土地信息
  landArea: 0, // 土地面积(平方米)
  landNature: '', // 土地性质: 宅基地, 承包地, 其他
  landCertificateNo: '', // 土地证号

  // 施工信息
  constructionUnit: '', // 施工单位
  constructionPerson: '', // 施工负责人
  constructionPhone: '', // 施工电话
  startDate: '', // 开工日期
  endDate: '', // 预计竣工日期

  // 材料上传
  idCardPhotos: [],
  householdPhotos: [],
  landCertificatePhotos: [],
  buildPlan: [],
  otherMaterials: [],

  // 备注
  remark: ''
})

// 建房类型选项
const buildTypes = ['新建', '改建', '扩建']

// 建房原因选项
const buildReasons = [
  '原房屋损坏',
  '分户建房',
  '人口增加需扩建',
  '新农村建设统一规划',
  '灾害损毁重建',
  '其他'
]

// 房屋结构选项
const houseStructures = ['砖混', '框架', '砖木', '土木', '其他']

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
          <p>1. 申请建房需符合村庄规划要求</p>
          <p>2. 一户一宅政策,不得超标准占地</p>
          <p>3. 需提供真实有效的证明材料</p>
          <p>4. 审批通过后方可开工建设</p>
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

        <el-form-item label="家庭人口数" prop="householdCount">
          <el-input-number
            v-model="formData.householdCount"
            :min="1"
            :max="20"
            :step="1"
            style="width: 100%"
          />
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
      householdCount: [{ required: true, message: '请输入家庭人口数', trigger: 'blur' }]
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

const HouseInfoStep = {
  template: `
    <div class="house-info-step">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="140px"
        label-position="left"
      >
        <h3 class="section-title">建房类型</h3>

        <el-form-item label="建房类型" prop="buildType">
          <el-radio-group v-model="formData.buildType">
            <el-radio
              v-for="type in buildTypes"
              :key="type"
              :label="type"
            >
              {{ type }}
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="建房原因" prop="buildReason">
          <el-select v-model="formData.buildReason" placeholder="选择建房原因" style="width: 100%">
            <el-option
              v-for="reason in buildReasons"
              :key="reason"
              :label="reason"
              :value="reason"
            />
          </el-select>
        </el-form-item>

        <el-divider />

        <h3 class="section-title">原房屋情况</h3>

        <el-form-item label="原房屋面积" prop="oldHouseArea">
          <el-input-number
            v-model="formData.oldHouseArea"
            :min="0"
            :precision="2"
            style="width: 200px; margin-right: 12px"
          />
          <span>平方米</span>
        </el-form-item>

        <el-form-item label="原房屋状况" prop="oldHouseCondition">
          <el-radio-group v-model="formData.oldHouseCondition">
            <el-radio label="完好">完好</el-radio>
            <el-radio label="损坏">损坏</el-radio>
            <el-radio label="危房">危房</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-divider />

        <h3 class="section-title">新建房屋信息</h3>

        <el-form-item label="新建房屋面积" prop="newHouseArea">
          <el-input-number
            v-model="formData.newHouseArea"
            :min="0"
            :precision="2"
            style="width: 200px; margin-right: 12px"
          />
          <span>平方米</span>
        </el-form-item>

        <el-form-item label="楼层数" prop="houseFloors">
          <el-input-number
            v-model="formData.houseFloors"
            :min="1"
            :max="6"
            :step="1"
            style="width: 200px; margin-right: 12px"
          />
          <span>层</span>
        </el-form-item>

        <el-form-item label="房屋结构" prop="houseStructure">
          <el-select v-model="formData.houseStructure" placeholder="选择房屋结构" style="width: 100%">
            <el-option
              v-for="structure in houseStructures"
              :key="structure"
              :label="structure"
              :value="structure"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="建房地址" prop="buildAddress">
          <el-input
            v-model="formData.buildAddress"
            type="textarea"
            :rows="3"
            placeholder="请输入详细建房地址"
          />
        </el-form-item>

        <el-divider />

        <h3 class="section-title">土地信息</h3>

        <el-form-item label="土地面积" prop="landArea">
          <el-input-number
            v-model="formData.landArea"
            :min="0"
            :precision="2"
            style="width: 200px; margin-right: 12px"
          />
          <span>平方米</span>
        </el-form-item>

        <el-form-item label="土地性质" prop="landNature">
          <el-radio-group v-model="formData.landNature">
            <el-radio label="宅基地">宅基地</el-radio>
            <el-radio label="承包地">承包地</el-radio>
            <el-radio label="其他">其他</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="土地证号" prop="landCertificateNo">
          <el-input
            v-model="formData.landCertificateNo"
            placeholder="请输入土地证号"
          />
        </el-form-item>

        <el-divider />

        <h3 class="section-title">施工信息</h3>

        <el-form-item label="施工单位">
          <el-input
            v-model="formData.constructionUnit"
            placeholder="请输入施工单位名称"
          />
        </el-form-item>

        <el-form-item label="施工负责人">
          <el-input
            v-model="formData.constructionPerson"
            placeholder="请输入施工负责人姓名"
          />
        </el-form-item>

        <el-form-item label="施工联系电话">
          <el-input
            v-model="formData.constructionPhone"
            placeholder="请输入施工联系电话"
            type="tel"
          />
        </el-form-item>

        <el-form-item label="预计开工日期" prop="startDate">
          <el-date-picker
            v-model="formData.startDate"
            type="date"
            placeholder="选择开工日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="预计竣工日期" prop="endDate">
          <el-date-picker
            v-model="formData.endDate"
            type="date"
            placeholder="选择竣工日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
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
    const buildTypes = ['新建', '改建', '扩建']
    const buildReasons = [
      '原房屋损坏',
      '分户建房',
      '人口增加需扩建',
      '新农村建设统一规划',
      '灾害损毁重建',
      '其他'
    ]
    const houseStructures = ['砖混', '框架', '砖木', '土木', '其他']

    const rules = {
      buildType: [{ required: true, message: '请选择建房类型', trigger: 'change' }],
      buildReason: [{ required: true, message: '请选择建房原因', trigger: 'change' }],
      oldHouseCondition: [{ required: true, message: '请选择原房屋状况', trigger: 'change' }],
      newHouseArea: [{ required: true, message: '请输入新建房屋面积', trigger: 'blur' }],
      houseFloors: [{ required: true, message: '请输入楼层数', trigger: 'blur' }],
      houseStructure: [{ required: true, message: '请选择房屋结构', trigger: 'change' }],
      buildAddress: [{ required: true, message: '请输入建房地址', trigger: 'blur' }],
      landArea: [{ required: true, message: '请输入土地面积', trigger: 'blur' }],
      landNature: [{ required: true, message: '请选择土地性质', trigger: 'change' }],
      startDate: [{ required: true, message: '请选择开工日期', trigger: 'change' }],
      endDate: [{ required: true, message: '请选择竣工日期', trigger: 'change' }]
    }

    return { buildTypes, buildReasons, houseStructures, rules }
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
          <p>3. 建房图纸需包含平面图、立面图、剖面图</p>
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
          <h4>土地证照片 <span class="required">*</span></h4>
          <p class="upload-tip">请上传土地使用证照片</p>
          <ImageUploader
            v-model="formData.landCertificatePhotos"
            :required="true"
            :multiple="true"
            :max-count="4"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item">
          <h4>建房图纸 <span class="required">*</span></h4>
          <p class="upload-tip">请上传房屋设计图纸</p>
          <ImageUploader
            v-model="formData.buildPlan"
            :required="true"
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
        <el-descriptions-item label="家庭人口数">
          {{ formData.householdCount }}人
        </el-descriptions-item>

        <el-descriptions-item label="建房类型">
          {{ formData.buildType }}
        </el-descriptions-item>
        <el-descriptions-item label="建房原因">
          {{ formData.buildReason }}
        </el-descriptions-item>

        <el-descriptions-item label="原房屋面积">
          {{ formData.oldHouseArea }}平方米
        </el-descriptions-item>
        <el-descriptions-item label="原房屋状况">
          {{ formData.oldHouseCondition }}
        </el-descriptions-item>

        <el-descriptions-item label="新建房屋面积">
          {{ formData.newHouseArea }}平方米
        </el-descriptions-item>
        <el-descriptions-item label="楼层数">
          {{ formData.houseFloors }}层
        </el-descriptions-item>

        <el-descriptions-item label="房屋结构">
          {{ formData.houseStructure }}
        </el-descriptions-item>
        <el-descriptions-item label="土地面积">
          {{ formData.landArea }}平方米
        </el-descriptions-item>

        <el-descriptions-item label="建房地址" :span="2">
          {{ formData.buildAddress }}
        </el-descriptions-item>

        <el-descriptions-item label="预计工期" :span="2">
          {{ formData.startDate }} 至 {{ formData.endDate }}
        </el-descriptions-item>

        <el-descriptions-item label="施工单位" v-if="formData.constructionUnit" :span="2">
          {{ formData.constructionUnit }}
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

      <el-alert
        title="重要提示"
        type="warning"
        :closable="false"
        show-icon
        style="margin-top: 24px"
      >
        <template #default>
          <p>1. 建房申请审批通过后方可开工建设</p>
          <p>2. 施工过程中需遵守安全生产规定</p>
          <p>3. 竣工后需申请验收</p>
        </template>
      </el-alert>

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

    const getUploadedFiles = () => {
      const files = []
      if (props.formData.idCardPhotos?.length) {
        files.push({ name: '身份证照片' })
      }
      if (props.formData.householdPhotos?.length) {
        files.push({ name: '户口本照片' })
      }
      if (props.formData.landCertificatePhotos?.length) {
        files.push({ name: '土地证照片' })
      }
      if (props.formData.buildPlan?.length) {
        files.push({ name: '建房图纸' })
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
      constructionPhone: encryptionService.encrypt(data.constructionPhone)
    }

    await serviceApi.submitHouseBuildingApplication({
      ...encryptedData,
      serviceType: 'houseBuilding',
      serviceName: '建房申请'
    })

    // 记录操作日志
    await auditLogService.logApplicationSubmit('houseBuilding', '建房申请')

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
.house-building-application {
  .basic-info-step,
  .house-info-step {
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
  .house-building-application {
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
