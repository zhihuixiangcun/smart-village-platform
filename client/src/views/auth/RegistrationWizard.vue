<template>
  <div class="registration-wizard">
    <div class="background-decoration">
      <div class="decoration-circle circle-1"></div>
      <div class="decoration-circle circle-2"></div>
    </div>

    <div class="wizard-container">
      <div class="wizard-header">
        <h2>采购商注册</h2>
        <div class="progress-bar">
          <div v-for="(step, index) in steps" :key="index" class="progress-step"
               :class="{ active: currentStep === index, completed: index < currentStep }">
            <div class="step-number">{{ index + 1 }}</div>
            <div class="step-label">{{ step.label }}</div>
          </div>
        </div>
      </div>

      <div class="wizard-content">
        <!-- 步骤1: 选择注册类型 -->
        <div v-if="currentStep === 0" class="wizard-step">
          <h3>选择注册类型</h3>
          <div class="type-selector">
            <div class="type-card" :class="{ active: formData.purchaserType === 'individual' }"
                 @click="selectPurchaserType('individual')">
              <el-icon :size="48"><User /></el-icon>
              <h4>个人采购商</h4>
              <p>适用于个人采购需求</p>
            </div>
            <div class="type-card" :class="{ active: formData.purchaserType === 'business' }"
                 @click="selectPurchaserType('business')">
              <el-icon :size="48"><OfficeBuilding /></el-icon>
              <h4>商家采购商</h4>
              <p>适用于企业采购需求</p>
            </div>
          </div>
        </div>

        <!-- 步骤2: 基本信息 -->
        <div v-if="currentStep === 1" class="wizard-step">
          <h3>基本信息</h3>
          <el-form ref="basicFormRef" :model="formData" :rules="basicRules" label-width="100px">
            <el-form-item label="姓名" prop="basicInfo.name">
              <el-input v-model="formData.basicInfo.name" placeholder="请输入真实姓名" />
            </el-form-item>
            <el-form-item label="手机号" prop="basicInfo.phone">
              <el-input v-model="formData.basicInfo.phone" placeholder="请输入手机号" maxlength="11" />
            </el-form-item>
            <el-form-item label="身份证号" prop="basicInfo.idCard">
              <el-input v-model="formData.basicInfo.idCard" placeholder="请输入18位身份证号" maxlength="18" />
            </el-form-item>
            <el-form-item v-if="formData.purchaserType === 'business'" label="企业名称" prop="businessInfo.companyName">
              <el-input v-model="formData.businessInfo.companyName" placeholder="请输入企业全称" />
            </el-form-item>
          </el-form>
        </div>

        <!-- 步骤3: 身份验证 -->
        <div v-if="currentStep === 2" class="wizard-step">
          <h3>身份验证</h3>
          <div class="upload-section">
            <div class="upload-item">
              <div class="upload-label">身份证正面</div>
              <el-upload class="id-card-uploader" :action="uploadUrl" :headers="uploadHeaders"
                         :on-success="(res) => handleUploadSuccess(res, 'idCardFront')"
                         :before-upload="beforeUpload" :show-file-list="false" accept="image/*">
                <img v-if="formData.files.idCardFront" :src="formData.files.idCardFront" class="id-card-image" />
                <div v-else class="upload-placeholder">
                  <el-icon :size="40"><Plus /></el-icon>
                  <div>点击上传</div>
                </div>
              </el-upload>
            </div>
            <div class="upload-item">
              <div class="upload-label">身份证反面</div>
              <el-upload class="id-card-uploader" :action="uploadUrl" :headers="uploadHeaders"
                         :on-success="(res) => handleUploadSuccess(res, 'idCardBack')"
                         :before-upload="beforeUpload" :show-file-list="false" accept="image/*">
                <img v-if="formData.files.idCardBack" :src="formData.files.idCardBack" class="id-card-image" />
                <div v-else class="upload-placeholder">
                  <el-icon :size="40"><Plus /></el-icon>
                  <div>点击上传</div>
                </div>
              </el-upload>
            </div>
          </div>
          <div v-if="formData.purchaserType === 'business'" class="upload-section mt-4">
            <div class="upload-item">
              <div class="upload-label">营业执照</div>
              <el-upload class="license-uploader" :action="uploadUrl" :headers="uploadHeaders"
                         :on-success="(res) => handleUploadSuccess(res, 'businessLicense')"
                         :before-upload="beforeUpload" :show-file-list="false" accept="image/*,.pdf">
                <img v-if="formData.files.businessLicense" :src="formData.files.businessLicense" class="license-image" />
                <div v-else class="upload-placeholder">
                  <el-icon :size="40"><Plus /></el-icon>
                  <div>点击上传</div>
                </div>
              </el-upload>
            </div>
          </div>
        </div>

        <!-- 步骤4: 采购信息 -->
        <div v-if="currentStep === 3" class="wizard-step">
          <h3>采购信息</h3>
          <el-form ref="purchaseFormRef" :model="formData" :rules="purchaseRules" label-width="100px">
            <el-form-item label="采购类目" prop="purchaseCategories">
              <el-checkbox-group v-model="formData.purchaseCategories">
                <el-checkbox label="谷物">谷物</el-checkbox>
                <el-checkbox label="蔬菜">蔬菜</el-checkbox>
                <el-checkbox label="水果">水果</el-checkbox>
                <el-checkbox label="畜禽">畜禽</el-checkbox>
                <el-checkbox label="水产">水产</el-checkbox>
                <el-checkbox label="其他">其他</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item label="所在位置" prop="location">
              <el-button @click="getLocation" :loading="locationLoading">
                <el-icon><Location /></el-icon>
                {{ locationLoading ? '定位中...' : '获取当前位置' }}
              </el-button>
              <span v-if="formData.location" class="location-text">
                已获取: {{ formData.location.address }}
              </span>
            </el-form-item>
          </el-form>
        </div>

        <!-- 步骤5: 完成注册 -->
        <div v-if="currentStep === 4" class="wizard-step">
          <div class="success-icon">
            <el-icon :size="80" color="#67C23A"><CircleCheck /></el-icon>
          </div>
          <h3>注册信息已提交</h3>
          <p>您的注册申请已提交，我们将尽快审核</p>
          <div class="result-info">
            <p><strong>申请编号:</strong> {{ applicationId }}</p>
            <p><strong>手机号:</strong> {{ formData.basicInfo.phone }}</p>
            <p><strong>审核状态:</strong> <el-tag type="warning">待审核</el-tag></p>
          </div>
        </div>
      </div>

      <div class="wizard-footer" v-if="currentStep < 4">
        <el-button v-if="currentStep > 0" @click="prevStep">上一步</el-button>
        <el-button v-if="currentStep < 3" type="primary" @click="nextStep" :disabled="!canProceed">
          下一步
        </el-button>
        <el-button v-if="currentStep === 3" type="primary" @click="submitRegistration" :loading="submitting">
          提交注册
        </el-button>
      </div>

      <div class="wizard-footer" v-if="currentStep === 4">
        <el-button @click="goToLogin">返回登录</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, OfficeBuilding, Plus, Location, CircleCheck } from '@element-plus/icons-vue'
import api from '@/api'

const router = useRouter()
const currentStep = ref(0)
const submitting = ref(false)
const locationLoading = ref(false)
const applicationId = ref('')

const steps = [
  { label: '选择类型' },
  { label: '基本信息' },
  { label: '身份验证' },
  { label: '采购信息' },
  { label: '完成' }
]

const formData = reactive({
  purchaserType: '',
  basicInfo: { name: '', phone: '', idCard: '' },
  businessInfo: { companyName: '', position: '' },
  individualInfo: { location: null },
  purchaseCategories: [],
  files: { idCardFront: '', idCardBack: '', businessLicense: '' },
  location: null
})

const basicFormRef = ref(null)
const purchaseFormRef = ref(null)

const uploadUrl = computed(() => {
  return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/v1/ocr/id-card`
})

const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
})

const basicRules = {
  'basicInfo.name': [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  'basicInfo.phone': [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  'basicInfo.idCard': [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /^\d{17}[\dXx]$/, message: '请输入正确的身份证号', trigger: 'blur' }
  ],
  'businessInfo.companyName': [{ required: true, message: '请输入企业名称', trigger: 'blur' }]
}

const purchaseRules = {
  purchaseCategories: [{ required: true, message: '请选择至少一个采购类目', trigger: 'change' }]
}

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 0: return !!formData.purchaserType
    case 1: return formData.basicInfo.name && formData.basicInfo.phone && formData.basicInfo.idCard
    case 2: return formData.files.idCardFront && formData.files.idCardBack
    case 3: return formData.purchaseCategories.length > 0
    default: return false
  }
})

const selectPurchaserType = (type) => { formData.purchaserType = type }
const prevStep = () => { if (currentStep.value > 0) currentStep.value-- }
const nextStep = () => { if (canProceed.value && currentStep.value < 4) currentStep.value++ }

const getLocation = () => {
  locationLoading.value = true
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        formData.individualInfo.location = { type: 'Point', coordinates: [position.coords.longitude, position.coords.latitude] }
        formData.location = { type: 'Point', coordinates: [position.coords.longitude, position.coords.latitude], address: '当前位置' }
        locationLoading.value = false
        ElMessage.success('位置获取成功')
      },
      () => {
        locationLoading.value = false
        ElMessage.warning('位置获取失败，使用默认位置')
        formData.individualInfo.location = { type: 'Point', coordinates: [120.155, 30.274] }
        formData.location = { type: 'Point', coordinates: [120.155, 30.274], address: '杭州市' }
      }
    )
  } else {
    locationLoading.value = false
    ElMessage.warning('浏览器不支持定位')
  }
}

const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/') || file.type === 'application/pdf'
  const isLt10M = file.size / 1024 / 1024 < 10
  if (!isImage) { ElMessage.error('只能上传图片或PDF文件!'); return false }
  if (!isLt10M) { ElMessage.error('文件大小不能超过10MB!'); return false }
  return true
}

const handleUploadSuccess = (response, field) => {
  if (response.success) {
    formData.files[field] = response.data.fileUrl
    ElMessage.success('上传成功')
  } else {
    ElMessage.error(response.message || '上传失败')
  }
}

const submitRegistration = async () => {
  submitting.value = true
  try {
    const submitData = {
      purchaserType: formData.purchaserType,
      basicInfo: { ...formData.basicInfo, idCardFront: formData.files.idCardFront, idCardBack: formData.files.idCardBack },
      purchaseCategories: formData.purchaseCategories,
      individualInfo: { location: formData.individualInfo.location },
      metadata: { userAgent: navigator.userAgent }
    }
    if (formData.purchaserType === 'business') {
      submitData.businessInfo = { ...formData.businessInfo, businessLicense: formData.files.businessLicense, location: formData.individualInfo.location }
    }
    const response = await api.post('/api/v1/purchaser/register', submitData)
    if (response.success) {
      applicationId.value = response.data.purchaserId
      if (response.data.token) localStorage.setItem('token', response.data.token)
      currentStep.value = 4
      ElMessage.success('注册申请提交成功')
    } else {
      ElMessage.error(response.message || '注册失败')
    }
  } catch (error) {
    ElMessage.error(error.message || '注册失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

const goToLogin = () => { router.push('/login') }
</script>

<style scoped>
.registration-wizard { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; position: relative; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.wizard-container { background: white; border-radius: 16px; width: 100%; max-width: 800px; padding: 40px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
.wizard-header { text-align: center; margin-bottom: 40px; }
.wizard-header h2 { font-size: 28px; color: #333; margin-bottom: 8px; }
.progress-bar { display: flex; justify-content: space-between; margin-top: 30px; }
.progress-step { display: flex; flex-direction: column; align-items: center; flex: 1; }
.step-number { width: 36px; height: 36px; border-radius: 50%; background: #e0e0e0; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #666; margin-bottom: 8px; }
.progress-step.active .step-number { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
.progress-step.completed .step-number { background: #67C23A; color: white; }
.step-label { font-size: 12px; color: #666; }
.wizard-step { min-height: 300px; }
.wizard-step h3 { font-size: 24px; color: #333; margin-bottom: 20px; text-align: center; }
.type-selector { display: flex; gap: 30px; justify-content: center; }
.type-card { flex: 1; max-width: 300px; border: 2px solid #e0e0e0; border-radius: 12px; padding: 30px; text-align: center; cursor: pointer; transition: all 0.3s; }
.type-card:hover { border-color: #667eea; transform: translateY(-5px); }
.type-card.active { border-color: #667eea; background: linear-gradient(135deg, rgba(102,126,234,0.05) 0%, rgba(118,75,162,0.05) 100%); }
.type-card h4 { font-size: 20px; color: #333; margin: 15px 0; }
.upload-section { display: flex; gap: 30px; justify-content: center; margin: 30px 0; }
.upload-item { text-align: center; }
.upload-label { margin-bottom: 10px; font-weight: 500; color: #333; }
.id-card-uploader :deep(.el-upload) { border: 2px dashed #d9d9d9; border-radius: 8px; cursor: pointer; overflow: hidden; }
.id-card-uploader :deep(.el-upload:hover) { border-color: #667eea; }
.id-card-image, .license-image { width: 300px; height: 200px; object-fit: cover; }
.upload-placeholder { width: 300px; height: 200px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #8c939d; }
.success-icon { text-align: center; margin: 40px 0; }
.result-info { background: #f5f7fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
.result-info p { margin: 10px 0; color: #333; }
.wizard-footer { display: flex; justify-content: center; gap: 20px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
.location-text { margin-left: 15px; color: #67C23A; }
.mt-4 { margin-top: 16px; }
</style>
