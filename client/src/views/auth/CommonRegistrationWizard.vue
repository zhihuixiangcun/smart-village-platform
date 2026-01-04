<template>
  <div class="common-registration-wizard">
    <div class="background-decoration">
      <div class="decoration-circle circle-1"></div>
      <div class="decoration-circle circle-2"></div>
    </div>

    <div class="wizard-container">
      <div class="wizard-header">
        <h2>{{ roleTitle }}注册</h2>
        <div class="progress-bar">
          <div v-for="(step, index) in steps" :key="index" class="progress-step"
               :class="{ active: currentStep === index, completed: index < currentStep }">
            <div class="step-number">{{ index + 1 }}</div>
            <div class="step-label">{{ step.label }}</div>
          </div>
        </div>
      </div>

      <div class="wizard-content">
        <!-- 步骤1: 账号安全 -->
        <div v-if="currentStep === 0" class="wizard-step">
          <h3>账号安全</h3>
          <el-form ref="accountFormRef" :model="formData" :rules="accountRules" label-width="100px">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="formData.phone" placeholder="请输入手机号" maxlength="11" />
            </el-form-item>
            <el-form-item label="验证码" prop="verifyCode">
              <div class="verify-code-wrapper">
                <el-input v-model="formData.verifyCode" placeholder="请输入验证码" maxlength="6" />
                <el-button @click="sendVerifyCode" :disabled="codeCountdown > 0" :loading="codeSending">
                  {{ codeCountdown > 0 ? `${codeCountdown}秒后重试` : '获取验证码' }}
                </el-button>
              </div>
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input v-model="formData.password" type="password" placeholder="请输入密码6-20位" show-password />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input v-model="formData.confirmPassword" type="password" placeholder="请再次输入密码" show-password />
            </el-form-item>
          </el-form>
        </div>

        <!-- 步骤2: 基本信息 -->
        <div v-if="currentStep === 1" class="wizard-step">
          <h3>基本信息</h3>
          <el-form ref="basicFormRef" :model="formData" :rules="basicRules" label-width="100px">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="formData.name" placeholder="请输入真实姓名" />
            </el-form-item>
            <el-form-item label="身份证号" prop="idCard">
              <el-input v-model="formData.idCard" placeholder="请输入18位身份证号" maxlength="18" />
            </el-form-item>
            <el-form-item label="性别" prop="gender">
              <el-radio-group v-model="formData.gender">
                <el-radio label="男">男</el-radio>
                <el-radio label="女">女</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="出生日期" prop="birthDate">
              <el-date-picker v-model="formData.birthDate" type="date" placeholder="选择日期" />
            </el-form-item>
            <el-form-item v-if="role === 'cadre'" label="政治面貌" prop="politicalStatus">
              <el-select v-model="formData.politicalStatus" placeholder="请选择政治面貌">
                <el-option label="中共党员" value="中共党员" />
                <el-option label="中共预备党员" value="中共预备党员" />
                <el-option label="群众" value="群众" />
              </el-select>
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
                  <div>点击上传正面</div>
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
                  <div>点击上传反面</div>
                </div>
              </el-upload>
            </div>
          </div>
          <div class="face-verification">
            <h4>人脸活体认证</h4>
            <el-button @click="startFaceVerification" :loading="faceVerifying" type="primary">
              <el-icon><User /></el-icon>
              {{ faceVerifying ? '认证中...' : '开始人脸认证' }}
            </el-button>
            <p v-if="formData.faceVerified" class="success-text">人脸认证已通过</p>
          </div>
        </div>

        <!-- 步骤4: 角色信息 -->
        <div v-if="currentStep === 3" class="wizard-step">
          <h3>角色信息</h3>

          <!-- 村民信息 -->
          <div v-if="role === 'resident'">
            <el-form ref="residentFormRef" :model="formData.residentInfo" :rules="residentRules" label-width="120px">
              <el-form-item label="所属村庄" prop="village">
                <el-select v-model="formData.residentInfo.village" placeholder="请选择村庄">
                  <el-option label="示范村1" value="village1" />
                  <el-option label="示范村2" value="village2" />
                </el-select>
              </el-form-item>
              <el-form-item label="户主姓名" prop="householderName">
                <el-input v-model="formData.residentInfo.householderName" placeholder="请输入户主姓名" />
              </el-form-item>
              <el-form-item label="家庭类型" prop="familyType">
                <el-checkbox-group v-model="formData.residentInfo.familyType">
                  <el-checkbox label="低保户">低保户</el-checkbox>
                  <el-checkbox label="独生户">独生户</el-checkbox>
                  <el-checkbox label="党员户">党员户</el-checkbox>
                </el-checkbox-group>
              </el-form-item>
            </el-form>
          </div>

          <!-- 村干部信息 -->
          <div v-if="role === 'cadre'">
            <el-form ref="cadreFormRef" :model="formData.cadreInfo" :rules="cadreRules" label-width="120px">
              <el-form-item label="职务" prop="position">
                <el-select v-model="formData.cadreInfo.position" placeholder="请选择职务">
                  <el-option label="村支书" value="secretary" />
                  <el-option label="村主任" value="director" />
                  <el-option label="村会计" value="accountant" />
                  <el-option label="妇女主任" value="womenDirector" />
                </el-select>
              </el-form-item>
              <el-form-item label="任命证明" prop="appointmentProof">
                <el-upload class="proof-uploader" :action="uploadUrl" :headers="uploadHeaders"
                           :on-success="(res) => handleUploadSuccess(res, 'appointmentProof')"
                           :before-upload="beforeUpload" :show-file-list="false" accept="image/*,.pdf">
                  <div v-if="formData.files.appointmentProof" class="file-uploaded">
                    <el-icon><Document /></el-icon>
                    <span>任命证明已上传</span>
                  </div>
                  <div v-else class="upload-placeholder">
                    <el-icon :size="40"><Plus /></el-icon>
                    <div>点击上传任命证明文件</div>
                  </div>
                </el-upload>
              </el-form-item>
              <el-form-item label="管辖范围" prop="jurisdiction">
                <el-input v-model="formData.cadreInfo.jurisdiction" placeholder="请输入管辖范围" />
              </el-form-item>
            </el-form>
          </div>

          <!-- 乡镇官员信息 -->
          <div v-if="role === 'official'">
            <el-form ref="officialFormRef" :model="formData.officialInfo" :rules="officialRules" label-width="120px">
              <el-form-item label="所属乡镇" prop="township">
                <el-input v-model="formData.officialInfo.township" placeholder="请输入所属乡镇" />
              </el-form-item>
              <el-form-item label="部门" prop="department">
                <el-select v-model="formData.officialInfo.department" placeholder="请选择部门">
                  <el-option label="党政办" value="office" />
                  <el-option label="民政办" value="civil" />
                  <el-option label="农办" value="agriculture" />
                  <el-option label="综治办" value="security" />
                </el-select>
              </el-form-item>
              <el-form-item label="职务" prop="position">
                <el-input v-model="formData.officialInfo.position" placeholder="请输入职务" />
              </el-form-item>
              <el-form-item label="工作证" prop="workCard">
                <el-upload class="proof-uploader" :action="uploadUrl" :headers="uploadHeaders"
                           :on-success="(res) => handleUploadSuccess(res, 'workCard')"
                           :before-upload="beforeUpload" :show-file-list="false" accept="image/*,.pdf">
                  <div v-if="formData.files.workCard" class="file-uploaded">
                    <el-icon><Document /></el-icon>
                    <span>工作证已上传</span>
                  </div>
                  <div v-else class="upload-placeholder">
                    <el-icon :size="40"><Plus /></el-icon>
                    <div>点击上传工作证</div>
                  </div>
                </el-upload>
              </el-form-item>
            </el-form>
          </div>

          <!-- 管理员信息 -->
          <div v-if="role === 'admin'">
            <el-form ref="adminFormRef" :model="formData.adminInfo" :rules="adminRules" label-width="120px">
              <el-form-item label="管理员码" prop="adminCode">
                <el-input v-model="formData.adminInfo.adminCode" placeholder="请输入管理员授权码" />
                <div class="form-tip">请联系上级获取管理员授权码</div>
              </el-form-item>
              <el-form-item label="权限范围" prop="permissions">
                <el-checkbox-group v-model="formData.adminInfo.permissions">
                  <el-checkbox label="user:manage">用户管理</el-checkbox>
                  <el-checkbox label="village:manage">村庄管理</el-checkbox>
                  <el-checkbox label="finance:manage">财务管理</el-checkbox>
                  <el-checkbox label="system:manage">系统管理</el-checkbox>
                </el-checkbox-group>
              </el-form-item>
              <el-form-item label="授权文件" prop="authorizationFile">
                <el-upload class="proof-uploader" :action="uploadUrl" :headers="uploadHeaders"
                           :on-success="(res) => handleUploadSuccess(res, 'authorizationFile')"
                           :before-upload="beforeUpload" :show-file-list="false" accept="image/*,.pdf">
                  <div v-if="formData.files.authorizationFile" class="file-uploaded">
                    <el-icon><Document /></el-icon>
                    <span>授权文件已上传</span>
                  </div>
                  <div v-else class="upload-placeholder">
                    <el-icon :size="40"><Plus /></el-icon>
                    <div>点击上传授权文件</div>
                  </div>
                </el-upload>
              </el-form-item>
            </el-form>
          </div>
        </div>

        <!-- 步骤5: 完成 -->
        <div v-if="currentStep === 4" class="wizard-step">
          <div class="success-icon">
            <el-icon :size="80" color="#67C23A"><CircleCheck /></el-icon>
          </div>
          <h3>注册信息已提交</h3>
          <p>您的{{ roleTitle }}注册申请已提交，我们将尽快审核</p>
          <div class="result-info">
            <p><strong>申请编号:</strong> {{ applicationId }}</p>
            <p><strong>手机号:</strong> {{ formData.phone }}</p>
            <p><strong>姓名:</strong> {{ formData.name }}</p>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, User, Document, CircleCheck } from '@element-plus/icons-vue'
import { axiosInstance as api } from '@/api'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const props = defineProps({
  role: {
    type: String,
    default: 'resident',
    validator: (value) => ['resident', 'cadre', 'official', 'admin'].includes(value)
  }
})

const role = computed(() => route.query.role || props.role)
const currentStep = ref(0)
const submitting = ref(false)
const codeSending = ref(false)
const codeCountdown = ref(0)
const faceVerifying = ref(false)
const applicationId = ref('')

const steps = [
  { label: '账号安全' },
  { label: '基本信息' },
  { label: '身份验证' },
  { label: '角色信息' },
  { label: '完成' }
]

const roleTitle = computed(() => {
  const titles = {
    resident: '村民',
    cadre: '村干部',
    official: '乡镇官员',
    admin: '管理员'
  }
  return titles[role.value] || '用户'
})

const formData = reactive({
  phone: '',
  verifyCode: '',
  password: '',
  confirmPassword: '',
  name: '',
  idCard: '',
  gender: '',
  birthDate: '',
  politicalStatus: '',
  faceVerified: false,
  files: {
    idCardFront: '',
    idCardBack: '',
    appointmentProof: '',
    workCard: '',
    authorizationFile: ''
  },
  residentInfo: {
    village: '',
    householderName: '',
    familyType: []
  },
  cadreInfo: {
    position: '',
    appointmentProof: '',
    jurisdiction: ''
  },
  officialInfo: {
    township: '',
    department: '',
    position: '',
    workCard: ''
  },
  adminInfo: {
    adminCode: '',
    permissions: [],
    authorizationFile: ''
  }
})

const accountFormRef = ref(null)
const basicFormRef = ref(null)
const residentFormRef = ref(null)
const cadreFormRef = ref(null)
const officialFormRef = ref(null)
const adminFormRef = ref(null)

const accountRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  verifyCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { pattern: /^\d{6}$/, message: '请输入6位验证码', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在6-20个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== formData.password) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const basicRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /^\d{17}[\dXx]$/, message: '请输入正确的身份证号', trigger: 'blur' }
  ],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  birthDate: [{ required: true, message: '请选择出生日期', trigger: 'change' }],
  politicalStatus: [{ required: true, message: '请选择政治面貌', trigger: 'change' }]
}

const residentRules = {
  village: [{ required: true, message: '请选择村庄', trigger: 'change' }],
  householderName: [{ required: true, message: '请输入户主姓名', trigger: 'blur' }]
}

const cadreRules = {
  position: [{ required: true, message: '请选择职务', trigger: 'change' }],
  jurisdiction: [{ required: true, message: '请输入管辖范围', trigger: 'blur' }]
}

const officialRules = {
  township: [{ required: true, message: '请输入所属乡镇', trigger: 'blur' }],
  department: [{ required: true, message: '请选择部门', trigger: 'change' }],
  position: [{ required: true, message: '请输入职务', trigger: 'blur' }]
}

const adminRules = {
  adminCode: [{ required: true, message: '请输入授权码', trigger: 'blur' }],
  permissions: [{ required: true, message: '请选择权限', trigger: 'change' }]
}

const uploadUrl = computed(() => {
  return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/v1/upload`
})

const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
})

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 0:
      return formData.phone && formData.verifyCode && formData.password && formData.confirmPassword
    case 1:
      return formData.name && formData.idCard && formData.gender && formData.birthDate
    case 2:
      return formData.files.idCardFront && formData.files.idCardBack && formData.faceVerified
    case 3:
      if (role.value === 'resident') {
        return formData.residentInfo.village && formData.residentInfo.householderName
      } else if (role.value === 'cadre') {
        return formData.cadreInfo.position && formData.files.appointmentProof
      } else if (role.value === 'official') {
        return formData.officialInfo.township && formData.officialInfo.department && formData.files.workCard
      } else if (role.value === 'admin') {
        return formData.adminInfo.adminCode && formData.adminInfo.permissions.length > 0
      }
      return false
    default:
      return false
  }
})

const sendVerifyCode = async () => {
  if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
    ElMessage.warning('请输入正确的手机号')
    return
  }

  codeSending.value = true
  try {
    const response = await api.post('/api/v1/auth/send-code', { phone: formData.phone })
    if (response.success) {
      ElMessage.success('验证码已发送，请查收短信')
      codeCountdown.value = 60
      const timer = setInterval(() => {
        codeCountdown.value--
        if (codeCountdown.value <= 0) {
          clearInterval(timer)
        }
      }, 1000)
    } else {
      ElMessage.error(response.message || '发送失败')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.error || error.message || '发送失败')
  } finally {
    codeSending.value = false
  }
}

const startFaceVerification = async () => {
  faceVerifying.value = true
  try {
    // 模拟人脸认证
    await new Promise(resolve => setTimeout(resolve, 2000))
    formData.faceVerified = true
    ElMessage.success('人脸认证通过')
  } catch (error) {
    ElMessage.error('人脸认证失败')
  } finally {
    faceVerifying.value = false
  }
}

const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/') || file.type === 'application/pdf'
  const isLt10M = file.size / 1024 / 1024 < 10
  if (!isImage) {
    ElMessage.error('只能上传图片或PDF文件!')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('文件大小不能超过10MB!')
    return false
  }
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

const prevStep = () => {
  if (currentStep.value > 0) currentStep.value--
}

const nextStep = async () => {
  if (canProceed.value && currentStep.value < 4) {
    currentStep.value++
  }
}

const submitRegistration = async () => {
  submitting.value = true
  try {
    const submitData = {
      role: role.value,
      phone: formData.phone,
      verifyCode: formData.verifyCode,
      password: formData.password,
      name: formData.name,
      username: formData.name, // 后端需要 username 字段
      idCard: formData.idCard,
      gender: formData.gender,
      birthDate: formData.birthDate,
      idCardFront: formData.files.idCardFront,
      idCardBack: formData.files.idCardBack,
      faceVerified: formData.faceVerified
    }

    if (role.value === 'resident') {
      submitData.residentInfo = formData.residentInfo
    } else if (role.value === 'cadre') {
      submitData.cadreInfo = { ...formData.cadreInfo, appointmentProof: formData.files.appointmentProof }
    } else if (role.value === 'official') {
      submitData.officialInfo = { ...formData.officialInfo, workCard: formData.files.workCard }
    } else if (role.value === 'admin') {
      submitData.adminInfo = { ...formData.adminInfo, authorizationFile: formData.files.authorizationFile }
    }

    const response = await api.post('/api/v1/auth/register', submitData)
    if (response.success) {
      // 注册成功，保存 token 和用户信息
      if (response.data.token) {
        userStore.setToken(response.data.token)
        userStore.setUserInfo(response.data.user)
      }
      applicationId.value = response.data.applicationId
      currentStep.value = 4
      ElMessage.success('注册成功！')
    } else {
      ElMessage.error(response.message || '注册失败')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.error || error.message || '注册失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

const goToLogin = () => {
  router.push('/unified-login')
}

onMounted(() => {
  if (role.value === 'cadre') {
    formData.politicalStatus = '中共党员'
  }
})
</script>

<style scoped>
.common-registration-wizard {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.wizard-container {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 800px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.wizard-header {
  text-align: center;
  margin-bottom: 40px;
}

.wizard-header h2 {
  font-size: 28px;
  color: #333;
  margin-bottom: 8px;
}

.progress-bar {
  display: flex;
  justify-content: space-between;
  margin-top: 30px;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.step-number {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #666;
  margin-bottom: 8px;
}

.progress-step.active .step-number {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.progress-step.completed .step-number {
  background: #67C23A;
  color: white;
}

.step-label {
  font-size: 12px;
  color: #666;
}

.wizard-step {
  min-height: 300px;
}

.wizard-step h3 {
  font-size: 24px;
  color: #333;
  margin-bottom: 20px;
  text-align: center;
}

.verify-code-wrapper {
  display: flex;
  gap: 10px;
}

.verify-code-wrapper .el-input {
  flex: 1;
}

.upload-section {
  display: flex;
  gap: 30px;
  justify-content: center;
  margin: 30px 0;
}

.upload-item {
  text-align: center;
}

.upload-label {
  margin-bottom: 10px;
  font-weight: 500;
  color: #333;
}

.id-card-uploader :deep(.el-upload),
.proof-uploader :deep(.el-upload) {
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.3s;
}

.id-card-uploader :deep(.el-upload:hover),
.proof-uploader :deep(.el-upload:hover) {
  border-color: #667eea;
}

.id-card-image {
  width: 300px;
  height: 200px;
  object-fit: cover;
}

.upload-placeholder {
  width: 300px;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8c939d;
}

.file-uploaded {
  width: 300px;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #67C23A;
}

.face-verification {
  text-align: center;
  margin-top: 40px;
  padding: 30px;
  background: #f5f7fa;
  border-radius: 8px;
}

.face-verification h4 {
  margin-bottom: 20px;
  color: #333;
}

.success-text {
  margin-top: 15px;
  color: #67C23A;
  font-weight: 500;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.success-icon {
  text-align: center;
  margin: 40px 0;
}

.result-info {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
}

.result-info p {
  margin: 10px 0;
  color: #333;
}

.wizard-footer {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}
</style>
