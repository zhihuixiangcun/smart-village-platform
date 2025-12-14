<template>
  <div class="forgot-password-view">
    <el-card class="forgot-password-card">
      <template #header>
        <div class="card-header">
          <h2>找回密码</h2>
          <p>输入您的邮箱或手机号，我们将发送重置密码的链接</p>
        </div>
      </template>

      <el-steps :active="currentStep" finish-status="success" class="steps">
        <el-step title="验证身份" />
        <el-step title="重置密码" />
        <el-step title="完成" />
      </el-steps>

      <!-- 第一步：验证身份 -->
      <div v-if="currentStep === 0" class="step-content">
        <el-form
          ref="verifyFormRef"
          :model="verifyForm"
          :rules="verifyRules"
          label-width="100px"
        >
          <el-form-item label="验证方式">
            <el-radio-group v-model="verifyType">
              <el-radio label="email">邮箱</el-radio>
              <el-radio label="phone">手机号</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item
            v-if="verifyType === 'email'"
            label="邮箱地址"
            prop="email"
          >
            <el-input
              v-model="verifyForm.email"
              placeholder="请输入注册时的邮箱地址"
              :prefix-icon="Message"
            />
          </el-form-item>

          <el-form-item
            v-if="verifyType === 'phone'"
            label="手机号码"
            prop="phone"
          >
            <el-input
              v-model="verifyForm.phone"
              placeholder="请输入注册时的手机号码"
              :prefix-icon="Phone"
            />
          </el-form-item>

          <el-form-item label="验证码" prop="code">
            <el-input
              v-model="verifyForm.code"
              placeholder="请输入验证码"
              class="code-input"
            >
              <template #append>
                <el-button
                  :disabled="codeDisabled"
                  @click="sendCode"
                  type="primary"
                >
                  {{ codeText }}
                </el-button>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              :loading="loading"
              @click="handleVerify"
            >
              验证身份
            </el-button>
            <el-button @click="goBack">返回登录</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 第二步：重置密码 -->
      <div v-if="currentStep === 1" class="step-content">
        <el-form
          ref="resetFormRef"
          :model="resetForm"
          :rules="resetRules"
          label-width="100px"
        >
          <el-form-item label="新密码" prop="password">
            <el-input
              v-model="resetForm.password"
              type="password"
              placeholder="请输入新密码"
              :prefix-icon="Lock"
              show-password
            />
          </el-form-item>

          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input
              v-model="resetForm.confirmPassword"
              type="password"
              placeholder="请确认新密码"
              :prefix-icon="Lock"
              show-password
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              :loading="loading"
              @click="handleReset"
            >
              重置密码
            </el-button>
            <el-button @click="currentStep--">上一步</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 第三步：完成 -->
      <div v-if="currentStep === 2" class="step-content success-content">
        <el-result
          icon="success"
          title="密码重置成功"
          sub-title="您的密码已成功重置，请使用新密码登录"
        >
          <template #extra>
            <el-button type="primary" @click="goToLogin">立即登录</el-button>
          </template>
        </el-result>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Lock, Message, Phone } from '@element-plus/icons-vue'

const router = useRouter()
const verifyFormRef = ref(null)
const resetFormRef = ref(null)
const loading = ref(false)
const currentStep = ref(0)
const verifyType = ref('email')
const codeDisabled = ref(false)
const codeText = ref('发送验证码')
const countdown = ref(60)

const verifyForm = reactive({
  email: '',
  phone: '',
  code: ''
})

const resetForm = reactive({
  password: '',
  confirmPassword: ''
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== resetForm.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const verifyRules = reactive({
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: ['blur', 'change'] }
  ],
  phone: [
    { required: true, message: '请输入手机号码', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 6, message: '验证码长度为6位', trigger: 'blur' }
  ]
})

const resetRules = reactive({
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
})

const sendCode = () => {
  const target = verifyType.value === 'email' ? verifyForm.email : verifyForm.phone

  if (!target) {
    ElMessage.warning(`请先输入${verifyType.value === 'email' ? '邮箱地址' : '手机号码'}`)
    return
  }

  codeDisabled.value = true

  // 模拟发送验证码
  ElMessage.success('验证码已发送，请查收')

  const timer = setInterval(() => {
    countdown.value--
    codeText.value = `${countdown.value}s后重发`

    if (countdown.value <= 0) {
      clearInterval(timer)
      codeDisabled.value = false
      codeText.value = '发送验证码'
      countdown.value = 60
    }
  }, 1000)
}

const handleVerify = async () => {
  try {
    await verifyFormRef.value.validate()
    loading.value = true

    // 模拟验证身份
    setTimeout(() => {
      loading.value = false
      ElMessage.success('身份验证成功')
      currentStep.value = 1
    }, 1500)

  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

const handleReset = async () => {
  try {
    await resetFormRef.value.validate()
    loading.value = true

    // 模拟重置密码
    setTimeout(() => {
      loading.value = false
      currentStep.value = 2
    }, 1500)

  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

const goToLogin = () => {
  router.push('/login')
}

const goBack = () => {
  router.push('/login')
}
</script>

<style scoped>
.forgot-password-view {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.forgot-password-card {
  width: 100%;
  max-width: 600px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.card-header {
  text-align: center;
}

.card-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.card-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.steps {
  margin: 30px 0;
}

.step-content {
  padding: 20px 0;
  min-height: 200px;
}

.success-content {
  text-align: center;
}

.code-input {
  width: 100%;
}

.code-input :deep(.el-input-group__append) {
  padding: 0;
}

.code-input :deep(.el-input-group__append .el-button) {
  border-radius: 0;
  border-left: none;
}
</style>