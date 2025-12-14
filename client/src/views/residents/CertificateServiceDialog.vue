<template>
  <el-dialog
    v-model="visible"
    title="在线办证服务"
    width="900px"
    :before-close="handleClose"
  >
    <div class="certificate-service">
      <!-- 服务导航 -->
      <div class="service-nav">
        <el-steps
          :active="currentStep"
          finish-status="success"
          align-center
        >
          <el-step title="选择证件类型" icon="Menu" />
          <el-step title="填写申请信息" icon="EditPen" />
          <el-step title="上传材料" icon="Upload" />
          <el-step title="确认提交" icon="Check" />
        </el-steps>
      </div>

      <!-- 步骤1: 证件类型选择 -->
      <div v-if="currentStep === 0" class="certificate-types">
        <h3>请选择需要办理的证件类型</h3>
        <el-row :gutter="20">
          <el-col :span="8" v-for="cert in certificateTypes" :key="cert.id">
            <div
              class="cert-type-card"
              :class="{ active: selectedType?.id === cert.id }"
              @click="selectCertificateType(cert)"
            >
              <div class="cert-icon">
                <el-icon size="40">
                  <component :is="cert.icon" />
                </el-icon>
              </div>
              <h4>{{ cert.name }}</h4>
              <p>{{ cert.description }}</p>
              <div class="cert-info">
                <el-tag size="small" type="info">{{ cert.processingDays }}个工作日</el-tag>
                <el-tag size="small" :type="cert.feeRequired ? 'warning' : 'success'">
                  {{ cert.feeRequired ? `费用: ¥${cert.fee}` : '免费' }}
                </el-tag>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 步骤2: 申请信息填写 -->
      <div v-if="currentStep === 1" class="application-form">
        <h3>填写申请信息</h3>
        <el-form
          ref="applicationFormRef"
          :model="applicationForm"
          :rules="applicationRules"
          label-width="120px"
        >
          <!-- 申请人基本信息 -->
          <el-card class="form-section" shadow="never">
            <template #header>
              <span>申请人基本信息</span>
            </template>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="申请人姓名" prop="applicantName">
                  <el-input
                    v-model="applicationForm.applicantName"
                    placeholder="请输入申请人姓名"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="身份证号" prop="applicantIdCard">
                  <el-input
                    v-model="applicationForm.applicantIdCard"
                    placeholder="请输入身份证号码"
                    maxlength="18"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="联系电话" prop="applicantPhone">
                  <el-input
                    v-model="applicationForm.applicantPhone"
                    placeholder="请输入联系电话"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="现住地址" prop="currentAddress">
                  <el-input
                    v-model="applicationForm.currentAddress"
                    placeholder="请输入现住地址"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </el-card>

          <!-- 证件特定信息 -->
          <el-card class="form-section" shadow="never" v-if="selectedType">
            <template #header>
              <span>{{ selectedType.name }}相关信息</span>
            </template>

            <!-- 户籍证明相关 -->
            <div v-if="selectedType.id === 'household_proof'">
              <el-form-item label="证明用途" prop="proofPurpose">
                <el-select v-model="applicationForm.proofPurpose" placeholder="请选择证明用途">
                  <el-option label="子女入学" value="school_enrollment" />
                  <el-option label="购房贷款" value="house_loan" />
                  <el-option label="工作调动" value="job_transfer" />
                  <el-option label="其他用途" value="other" />
                </el-select>
              </el-form-item>
              <el-form-item label="家庭成员" prop="familyMembers">
                <el-input
                  v-model="applicationForm.familyMembers"
                  type="textarea"
                  placeholder="请填写需要证明的家庭成员信息"
                  :rows="3"
                />
              </el-form-item>
            </div>

            <!-- 居住证明相关 -->
            <div v-if="selectedType.id === 'residence_proof'">
              <el-form-item label="居住起始日期" prop="residenceStartDate">
                <el-date-picker
                  v-model="applicationForm.residenceStartDate"
                  type="date"
                  placeholder="选择居住起始日期"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
              <el-form-item label="房屋性质" prop="houseType">
                <el-radio-group v-model="applicationForm.houseType">
                  <el-radio label="owned">自有住房</el-radio>
                  <el-radio label="rented">租赁住房</el-radio>
                  <el-radio label="family">亲属住房</el-radio>
                </el-radio-group>
              </el-form-item>
            </div>

            <!-- 收入证明相关 -->
            <div v-if="selectedType.id === 'income_proof'">
              <el-form-item label="年收入" prop="annualIncome">
                <el-input-number
                  v-model="applicationForm.annualIncome"
                  :min="0"
                  :precision="2"
                  placeholder="请输入年收入"
                  style="width: 100%"
                />
              </el-form-item>
              <el-form-item label="收入来源" prop="incomeSource">
                <el-checkbox-group v-model="applicationForm.incomeSource">
                  <el-checkbox label="farming">农业收入</el-checkbox>
                  <el-checkbox label="business">经营收入</el-checkbox>
                  <el-checkbox label="employment">工资收入</el-checkbox>
                  <el-checkbox label="other">其他收入</el-checkbox>
                </el-checkbox-group>
              </el-form-item>
            </div>
          </el-card>
        </el-form>
      </div>

      <!-- 步骤3: 上传材料 -->
      <div v-if="currentStep === 2" class="material-upload">
        <h3>上传申请材料</h3>
        <div class="upload-sections">
          <el-card class="upload-section" shadow="never">
            <template #header>
              <span>必需材料</span>
            </template>

            <div class="material-list">
              <div
                v-for="material in requiredMaterials"
                :key="material.id"
                class="material-item"
              >
                <div class="material-info">
                  <h5>{{ material.name }}</h5>
                  <p>{{ material.description }}</p>
                </div>
                <div class="material-upload">
                  <el-upload
                    :action="uploadAction"
                    :file-list="material.files || []"
                    :before-upload="(file) => beforeUpload(file, material.id)"
                    :on-success="(res, file) => handleUploadSuccess(res, file, material.id)"
                    :on-remove="(file) => handleFileRemove(file, material.id)"
                    accept="image/*,.pdf"
                    list-type="text"
                    :limit="material.maxFiles || 5"
                  >
                    <el-button size="small" type="primary" icon="Upload">
                      选择文件
                    </el-button>
                  </el-upload>
                </div>
              </div>
            </div>
          </el-card>

          <el-card class="upload-section" shadow="never" v-if="optionalMaterials.length">
            <template #header>
              <span>可选材料</span>
            </template>

            <div class="material-list">
              <div
                v-for="material in optionalMaterials"
                :key="material.id"
                class="material-item"
              >
                <div class="material-info">
                  <h5>{{ material.name }}</h5>
                  <p>{{ material.description }}</p>
                </div>
                <div class="material-upload">
                  <el-upload
                    :action="uploadAction"
                    :file-list="material.files || []"
                    :before-upload="(file) => beforeUpload(file, material.id)"
                    :on-success="(res, file) => handleUploadSuccess(res, file, material.id)"
                    :on-remove="(file) => handleFileRemove(file, material.id)"
                    accept="image/*,.pdf"
                    list-type="text"
                    :limit="material.maxFiles || 3"
                  >
                    <el-button size="small" type="success" icon="Upload">
                      选择文件
                    </el-button>
                  </el-upload>
                </div>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 拍照OCR识别 -->
        <el-card class="ocr-section" shadow="never">
          <template #header>
            <span>智能识别 (实验功能)</span>
          </template>
          <div class="ocr-features">
            <el-button type="info" icon="Camera" @click="startOCR">
              拍照识别证件信息
            </el-button>
            <el-button type="warning" icon="Picture" @click="uploadForOCR">
              上传图片识别
            </el-button>
            <p class="ocr-tip">支持身份证、户口本等证件的自动信息提取</p>
          </div>
        </el-card>
      </div>

      <!-- 步骤4: 确认提交 -->
      <div v-if="currentStep === 3" class="confirmation">
        <h3>确认申请信息</h3>
        <el-card shadow="never">
          <div class="confirmation-content">
            <!-- 证件类型 -->
            <div class="confirm-section">
              <h4>申请证件</h4>
              <p>{{ selectedType?.name }} ({{ selectedType?.processingDays }}个工作日)</p>
            </div>

            <!-- 申请人信息 -->
            <div class="confirm-section">
              <h4>申请人信息</h4>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="姓名">{{ applicationForm.applicantName }}</el-descriptions-item>
                <el-descriptions-item label="身份证号">{{ maskIdCard(applicationForm.applicantIdCard) }}</el-descriptions-item>
                <el-descriptions-item label="联系电话">{{ applicationForm.applicantPhone }}</el-descriptions-item>
                <el-descriptions-item label="现住地址">{{ applicationForm.currentAddress }}</el-descriptions-item>
              </el-descriptions>
            </div>

            <!-- 上传材料统计 -->
            <div class="confirm-section">
              <h4>申请材料</h4>
              <div class="material-summary">
                <el-tag type="success">
                  必需材料: {{ completedRequiredMaterials }}/{{ requiredMaterials.length }}
                </el-tag>
                <el-tag type="info">
                  可选材料: {{ completedOptionalMaterials }}/{{ optionalMaterials.length }}
                </el-tag>
              </div>
            </div>

            <!-- 申请声明 -->
            <div class="confirm-section">
              <h4>申请声明</h4>
              <el-alert
                title="请仔细阅读以下声明"
                type="info"
                :closable="false"
              >
                <p>1. 本人确认所填写的信息真实有效，如有虚假信息愿承担相应责任；</p>
                <p>2. 本人同意村委会对申请材料进行审核，并配合提供补充材料；</p>
                <p>3. 本人了解证件办理时间为{{ selectedType?.processingDays }}个工作日；</p>
                <p>4. 证件办理完成后将通过短信或电话方式通知本人领取。</p>
              </el-alert>
              <el-checkbox v-model="agreeDeclaration" style="margin-top: 15px;">
                本人已阅读并同意以上声明
              </el-checkbox>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 申请进度查看 -->
      <div v-if="showProgress" class="application-progress">
        <h3>申请进度</h3>
        <el-card shadow="never">
          <div class="progress-info">
            <div class="application-number">
              <span>申请编号: </span>
              <el-tag type="primary" size="large">{{ applicationNumber }}</el-tag>
            </div>

            <el-timeline>
              <el-timeline-item
                v-for="step in progressSteps"
                :key="step.id"
                :timestamp="step.timestamp"
                :type="step.type"
                :icon="step.icon"
              >
                {{ step.title }}
                <p v-if="step.description">{{ step.description }}</p>
              </el-timeline-item>
            </el-timeline>
          </div>
        </el-card>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button v-if="currentStep > 0 && !showProgress" @click="prevStep">
          上一步
        </el-button>
        <el-button
          v-if="currentStep < 3 && !showProgress"
          type="primary"
          @click="nextStep"
          :disabled="!canProceedToNext"
        >
          下一步
        </el-button>
        <el-button
          v-if="currentStep === 3 && !showProgress"
          type="success"
          @click="submitApplication"
          :disabled="!agreeDeclaration || submitting"
          :loading="submitting"
        >
          提交申请
        </el-button>
      </div>
    </template>

    <!-- OCR识别对话框 -->
    <el-dialog
      v-model="ocrDialogVisible"
      title="证件信息识别"
      width="500px"
    >
      <div class="ocr-dialog">
        <div class="upload-area">
          <el-upload
            drag
            action="/api/ocr/recognize"
            accept="image/*"
            :before-upload="beforeOCRUpload"
            :on-success="handleOCRSuccess"
            :on-error="handleOCRError"
            :show-file-list="false"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              将证件照片拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持jpg/png文件，且不超过5MB
              </div>
            </template>
          </el-upload>
        </div>

        <div v-if="ocrResult" class="ocr-result">
          <h4>识别结果</h4>
          <el-form :model="ocrResult" label-width="80px" size="small">
            <el-form-item label="姓名">
              <el-input v-model="ocrResult.name" />
            </el-form-item>
            <el-form-item label="身份证号">
              <el-input v-model="ocrResult.idCard" />
            </el-form-item>
            <el-form-item label="地址">
              <el-input v-model="ocrResult.address" type="textarea" :rows="2" />
            </el-form-item>
          </el-form>
          <div class="ocr-actions">
            <el-button type="primary" @click="applyOCRResult">
              应用识别结果
            </el-button>
            <el-button @click="clearOCRResult">
              重新识别
            </el-button>
          </div>
        </div>
      </div>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Document, CreditCard, House, Money, Menu, EditPen,
  Upload, Check, Camera, Picture, UploadFilled
} from '@element-plus/icons-vue'
import { certificateAPI } from '@/api/certificate'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  resident: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'success'])

// 响应式数据
const visible = ref(false)
const currentStep = ref(0)
const submitting = ref(false)
const showProgress = ref(false)
const agreeDeclaration = ref(false)
const applicationNumber = ref('')

// 证件类型
const certificateTypes = ref([
  {
    id: 'household_proof',
    name: '户籍证明',
    description: '证明户口登记信息',
    icon: 'House',
    processingDays: 3,
    feeRequired: false,
    fee: 0
  },
  {
    id: 'residence_proof',
    name: '居住证明',
    description: '证明居住地址和时长',
    icon: 'House',
    processingDays: 2,
    feeRequired: false,
    fee: 0
  },
  {
    id: 'income_proof',
    name: '收入证明',
    description: '证明家庭经济收入状况',
    icon: 'Money',
    processingDays: 5,
    feeRequired: false,
    fee: 0
  },
  {
    id: 'identity_proof',
    name: '身份证明',
    description: '证明个人身份信息',
    icon: 'CreditCard',
    processingDays: 1,
    feeRequired: false,
    fee: 0
  },
  {
    id: 'family_proof',
    name: '亲属关系证明',
    description: '证明家庭成员关系',
    icon: 'Document',
    processingDays: 3,
    feeRequired: false,
    fee: 0
  },
  {
    id: 'unmarried_proof',
    name: '未婚证明',
    description: '证明婚姻状况',
    icon: 'Document',
    processingDays: 2,
    feeRequired: true,
    fee: 10
  }
])

const selectedType = ref(null)

// 申请表单
const applicationFormRef = ref()
const applicationForm = reactive({
  applicantName: '',
  applicantIdCard: '',
  applicantPhone: '',
  currentAddress: '',
  // 户籍证明相关
  proofPurpose: '',
  familyMembers: '',
  // 居住证明相关
  residenceStartDate: '',
  houseType: '',
  // 收入证明相关
  annualIncome: 0,
  incomeSource: []
})

// 表单验证规则
const applicationRules = {
  applicantName: [
    { required: true, message: '请输入申请人姓名', trigger: 'blur' }
  ],
  applicantIdCard: [
    { required: true, message: '请输入身份证号码', trigger: 'blur' },
    { pattern: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/, message: '身份证号格式不正确', trigger: 'blur' }
  ],
  applicantPhone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  currentAddress: [
    { required: true, message: '请输入现住地址', trigger: 'blur' }
  ]
}

// 上传相关
const uploadAction = '/api/upload/certificate'
const requiredMaterials = ref([])
const optionalMaterials = ref([])

// OCR识别
const ocrDialogVisible = ref(false)
const ocrResult = ref(null)

// 申请进度
const progressSteps = ref([])

// 计算属性
const canProceedToNext = computed(() => {
  switch (currentStep.value) {
    case 0:
      return selectedType.value !== null
    case 1:
      return applicationFormRef.value?.validate ? true : false
    case 2:
      return completedRequiredMaterials.value === requiredMaterials.value.length
    default:
      return true
  }
})

const completedRequiredMaterials = computed(() => {
  return requiredMaterials.value.filter(material =>
    material.files && material.files.length > 0
  ).length
})

const completedOptionalMaterials = computed(() => {
  return optionalMaterials.value.filter(material =>
    material.files && material.files.length > 0
  ).length
})

// 监听器
watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.resident) {
    // 自动填充居民信息
    applicationForm.applicantName = props.resident.name
    applicationForm.applicantIdCard = props.resident.idCard
    applicationForm.applicantPhone = props.resident.phone
    applicationForm.currentAddress = props.resident.address
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

watch(selectedType, (newType) => {
  if (newType) {
    updateMaterialRequirements()
  }
})

// 方法
const selectCertificateType = (type) => {
  selectedType.value = type
}

const updateMaterialRequirements = () => {
  const type = selectedType.value
  if (!type) return

  // 根据证件类型设置材料要求
  const materialMap = {
    household_proof: {
      required: [
        { id: 'id_card', name: '申请人身份证', description: '申请人身份证正反面照片', files: [] },
        { id: 'household_book', name: '户口本', description: '户口本首页和本人页照片', files: [] }
      ],
      optional: [
        { id: 'authorization', name: '委托书', description: '如代办需提供委托书', files: [] }
      ]
    },
    residence_proof: {
      required: [
        { id: 'id_card', name: '申请人身份证', description: '申请人身份证正反面照片', files: [] },
        { id: 'residence_contract', name: '居住证明', description: '房屋租赁合同或房产证', files: [] }
      ],
      optional: [
        { id: 'utility_bills', name: '水电费单据', description: '近3个月水电费缴费单据', files: [] }
      ]
    },
    income_proof: {
      required: [
        { id: 'id_card', name: '申请人身份证', description: '申请人身份证正反面照片', files: [] },
        { id: 'bank_statements', name: '银行流水', description: '近6个月银行流水', files: [] }
      ],
      optional: [
        { id: 'work_certificate', name: '工作证明', description: '如有工作单位需提供', files: [] },
        { id: 'business_license', name: '营业执照', description: '如有经营活动需提供', files: [] }
      ]
    }
  }

  const materials = materialMap[type.id] || { required: [], optional: [] }
  requiredMaterials.value = materials.required
  optionalMaterials.value = materials.optional
}

const nextStep = async () => {
  if (currentStep.value === 1) {
    // 验证表单
    const valid = await applicationFormRef.value.validate()
    if (!valid) return
  }

  if (currentStep.value < 3) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const beforeUpload = (file, materialId) => {
  const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf'
  const isValidSize = file.size / 1024 / 1024 < 10

  if (!isValidType) {
    ElMessage.error('只支持图片和PDF文件!')
    return false
  }
  if (!isValidSize) {
    ElMessage.error('文件大小不能超过10MB!')
    return false
  }

  return true
}

const handleUploadSuccess = (response, file, materialId) => {
  if (response.success) {
    // 找到对应的材料并添加文件
    const allMaterials = [...requiredMaterials.value, ...optionalMaterials.value]
    const material = allMaterials.find(m => m.id === materialId)
    if (material) {
      if (!material.files) material.files = []
      material.files.push({
        name: file.name,
        url: response.data.url,
        uid: file.uid
      })
    }
    ElMessage.success('上传成功')
  } else {
    ElMessage.error(response.message || '上传失败')
  }
}

const handleFileRemove = (file, materialId) => {
  const allMaterials = [...requiredMaterials.value, ...optionalMaterials.value]
  const material = allMaterials.find(m => m.id === materialId)
  if (material && material.files) {
    const index = material.files.findIndex(f => f.uid === file.uid)
    if (index > -1) {
      material.files.splice(index, 1)
    }
  }
}

const startOCR = () => {
  ocrDialogVisible.value = true
}

const uploadForOCR = () => {
  ocrDialogVisible.value = true
}

const beforeOCRUpload = (file) => {
  const isValidType = file.type.startsWith('image/')
  const isValidSize = file.size / 1024 / 1024 < 5

  if (!isValidType) {
    ElMessage.error('只支持图片文件!')
    return false
  }
  if (!isValidSize) {
    ElMessage.error('图片大小不能超过5MB!')
    return false
  }

  return true
}

const handleOCRSuccess = async (response) => {
  if (response.success) {
    ocrResult.value = response.data
    ElMessage.success('识别成功')
  } else {
    ElMessage.error('识别失败: ' + (response.message || '未知错误'))
  }
}

const handleOCRError = (error) => {
  console.error('OCR识别错误:', error)
  ElMessage.error('识别失败，请重试')
}

const applyOCRResult = () => {
  if (ocrResult.value) {
    applicationForm.applicantName = ocrResult.value.name || applicationForm.applicantName
    applicationForm.applicantIdCard = ocrResult.value.idCard || applicationForm.applicantIdCard
    applicationForm.currentAddress = ocrResult.value.address || applicationForm.currentAddress

    ElMessage.success('已应用识别结果')
    ocrDialogVisible.value = false
  }
}

const clearOCRResult = () => {
  ocrResult.value = null
}

const submitApplication = async () => {
  if (!agreeDeclaration.value) {
    ElMessage.warning('请先同意申请声明')
    return
  }

  submitting.value = true

  try {
    // 构建提交数据
    const submitData = {
      certificateType: selectedType.value.id,
      applicantInfo: {
        name: applicationForm.applicantName,
        idCard: applicationForm.applicantIdCard,
        phone: applicationForm.applicantPhone,
        address: applicationForm.currentAddress
      },
      specificInfo: {},
      materials: []
    }

    // 添加证件特定信息
    if (selectedType.value.id === 'household_proof') {
      submitData.specificInfo = {
        proofPurpose: applicationForm.proofPurpose,
        familyMembers: applicationForm.familyMembers
      }
    } else if (selectedType.value.id === 'residence_proof') {
      submitData.specificInfo = {
        residenceStartDate: applicationForm.residenceStartDate,
        houseType: applicationForm.houseType
      }
    } else if (selectedType.value.id === 'income_proof') {
      submitData.specificInfo = {
        annualIncome: applicationForm.annualIncome,
        incomeSource: applicationForm.incomeSource
      }
    }

    // 添加上传的材料
    const allMaterials = [...requiredMaterials.value, ...optionalMaterials.value]
    allMaterials.forEach(material => {
      if (material.files && material.files.length > 0) {
        submitData.materials.push({
          materialType: material.id,
          files: material.files.map(file => ({
            name: file.name,
            url: file.url
          }))
        })
      }
    })

    // 调用API提交申请
    const response = await certificateAPI.submitApplication(submitData)

    if (response.success) {
      // 生成申请编号
      applicationNumber.value = response.data.applicationNumber

      // 设置进度步骤
      progressSteps.value = [
        {
          id: 1,
          title: '申请已提交',
          description: '您的申请已成功提交，等待初审',
          timestamp: new Date().toLocaleString(),
          type: 'primary',
          icon: 'Check'
        },
        {
          id: 2,
          title: '待审核',
          description: '村委会将在1个工作日内进行初审',
          timestamp: '',
          type: 'info',
          icon: 'Clock'
        }
      ]

      showProgress.value = true
      currentStep.value = 0

      ElMessage.success('申请提交成功！')
      emit('success', {
        type: selectedType.value,
        applicationNumber: applicationNumber.value,
        applicant: applicationForm
      })
    } else {
      ElMessage.error(response.message || '提交失败')
    }

  } catch (error) {
    console.error('提交申请失败:', error)
    ElMessage.error('提交失败，请重试')
  } finally {
    submitting.value = false
  }
}

const maskIdCard = (idCard) => {
  if (!idCard) return ''
  return idCard.replace(/^(.{6}).*(.{4})$/, '$1**********$2')
}

const handleClose = () => {
  if (currentStep.value > 0 || showProgress.value) {
    ElMessageBox.confirm('确定要关闭申请流程吗？未保存的信息将丢失。')
      .then(() => {
        resetForm()
        visible.value = false
      })
      .catch(() => {})
  } else {
    visible.value = false
  }
}

const resetForm = () => {
  currentStep.value = 0
  showProgress.value = false
  selectedType.value = null
  agreeDeclaration.value = false
  applicationNumber.value = ''

  // 重置表单
  Object.keys(applicationForm).forEach(key => {
    if (typeof applicationForm[key] === 'string') {
      applicationForm[key] = ''
    } else if (Array.isArray(applicationForm[key])) {
      applicationForm[key] = []
    } else {
      applicationForm[key] = 0
    }
  })

  // 清空上传文件
  requiredMaterials.value.forEach(material => {
    material.files = []
  })
  optionalMaterials.value.forEach(material => {
    material.files = []
  })

  // 清空OCR结果
  ocrResult.value = null
  progressSteps.value = []
}

// 生命周期
onMounted(() => {
  // 初始化
})
</script>

<style lang="scss" scoped>
.certificate-service {
  .service-nav {
    margin-bottom: 30px;
  }

  .certificate-types {
    text-align: center;

    h3 {
      margin-bottom: 30px;
      color: #333;
    }

    .cert-type-card {
      border: 2px solid #e4e7ed;
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.3s ease;
      height: 200px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      &:hover {
        border-color: #409eff;
        box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
      }

      &.active {
        border-color: #409eff;
        background: #f0f9ff;
        box-shadow: 0 4px 12px rgba(64, 158, 255, 0.25);
      }

      .cert-icon {
        color: #409eff;
        margin-bottom: 15px;
      }

      h4 {
        margin: 0 0 10px 0;
        color: #303133;
        font-size: 16px;
      }

      p {
        margin: 0 0 15px 0;
        color: #606266;
        font-size: 14px;
      }

      .cert-info {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: center;
      }
    }
  }

  .application-form {
    .form-section {
      margin-bottom: 20px;
    }
  }

  .material-upload {
    .upload-sections {
      margin-bottom: 20px;
    }

    .upload-section {
      margin-bottom: 20px;
    }

    .material-list {
      .material-item {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 15px 0;
        border-bottom: 1px solid #f0f2f5;

        &:last-child {
          border-bottom: none;
        }

        .material-info {
          flex: 1;
          margin-right: 20px;

          h5 {
            margin: 0 0 5px 0;
            color: #303133;
            font-size: 14px;
          }

          p {
            margin: 0;
            color: #909399;
            font-size: 12px;
          }
        }

        .material-upload {
          flex-shrink: 0;
        }
      }
    }

    .ocr-section {
      .ocr-features {
        text-align: center;

        .ocr-tip {
          margin-top: 10px;
          color: #909399;
          font-size: 12px;
        }
      }
    }
  }

  .confirmation {
    .confirm-section {
      margin-bottom: 25px;

      h4 {
        margin: 0 0 15px 0;
        color: #303133;
        font-size: 16px;
      }

      .material-summary {
        display: flex;
        gap: 12px;
      }
    }
  }

  .application-progress {
    text-align: center;

    .progress-info {
      .application-number {
        margin-bottom: 30px;
        font-size: 16px;

        span {
          color: #606266;
        }
      }
    }
  }
}

.ocr-dialog {
  .upload-area {
    margin-bottom: 20px;
  }

  .ocr-result {
    .ocr-actions {
      margin-top: 15px;
      text-align: center;
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
  .certificate-service {
    .certificate-types {
      .cert-type-card {
        height: auto;
        min-height: 150px;
      }
    }

    .material-upload {
      .material-item {
        flex-direction: column;
        gap: 15px;
        align-items: stretch;

        .material-info {
          margin-right: 0;
        }
      }
    }
  }
}
</style>