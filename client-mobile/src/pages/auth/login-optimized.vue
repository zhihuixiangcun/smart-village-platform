<template>
  <div class="login-page-optimized" :class="{ 'elderly-mode-active': isElderlyMode }">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="bg-circle bg-circle-1"></div>
      <div class="bg-circle bg-circle-2"></div>
      <div class="bg-circle bg-circle-3"></div>
    </div>

    <!-- 主要内容 -->
    <div class="login-content-optimized">
      <!-- Logo和标题 -->
      <div class="login-header-optimized">
        <div class="logo">🏘️</div>
        <h1 class="title">智慧乡村</h1>
        <p class="subtitle">Smart Village Platform</p>
      </div>

      <!-- 登录表单 -->
      <div class="login-form-optimized">
        <!-- 角色选择 -->
        <div class="role-selector-optimized">
          <div
            v-for="role in roles"
            :key="role.value"
            :class="['role-item-optimized', { 'role-item--active': selectedRole === role.value }]"
            @click="selectRole(role.value)"
            @touchstart.passive="handleTouchStart"
            role="button"
            :aria-pressed="selectedRole === role.value"
            :tabindex="0"
            @keydown.enter="selectRole(role.value)"
            @keydown.space.prevent="selectRole(role.value)"
          >
            <span class="role-icon">{{ role.icon }}</span>
            <span class="role-name">{{ role.label }}</span>
          </div>
        </div>

        <!-- 手机号输入 -->
        <div class="form-item-optimized">
          <div class="input-wrapper-optimized" :class="{ 'input-wrapper--error': phoneError }">
            <span class="input-icon">📱</span>
            <input
              v-model="form.phone"
              type="tel"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="11"
              class="form-input-optimized"
              :class="{ 'large-text': isElderlyMode }"
              placeholder="请输入手机号"
              aria-label="手机号"
              aria-invalid="phoneError ? true : undefined"
              @input="onPhoneInput"
              @focus="onFocus"
              @blur="onBlur"
            />
          </div>
          <div v-if="phoneError" class="input-error-optimized" role="alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{{ phoneError }}</span>
          </div>
        </div>

        <!-- 验证码输入 -->
        <div class="form-item-optimized">
          <div class="input-wrapper-optimized code-wrapper-optimized">
            <span class="input-icon">🔐</span>
            <input
              v-model="form.code"
              type="tel"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="6"
              class="form-input-optimized"
              :class="{ 'large-text': isElderlyMode }"
              placeholder="请输入验证码"
              aria-label="验证码"
            />
            <button
              class="code-btn-optimized"
              :disabled="counting"
              @click="sendCode"
              @touchstart.passive="handleTouchStart"
              aria-label="获取验证码"
            >
              {{ counting ? `${countdown}s后重发` : '获取验证码' }}
            </button>
          </div>
        </div>

        <!-- 登录按钮 -->
        <button
          class="login-btn-optimized"
          :class="{ 'button--loading': isLoggingIn, 'button--success': loginSuccess }"
          :disabled="!canLogin || isLoggingIn"
          @click="handleLogin"
          @touchstart.passive="handleTouchStart"
        >
          <div v-if="isLoggingIn" class="btn-loader">
            <div class="spinner"></div>
            <span class="btn-text">登录中...</span>
          </div>
          <div v-else-if="loginSuccess" class="btn-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="20" height="20">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span class="btn-text">登录成功</span>
          </div>
          <span v-else class="btn-text">登 录</span>
        </button>

        <!-- 快捷登录方式 -->
        <div class="quick-login-optimized">
          <div class="divider-optimized">
            <span class="divider-text">其他登录方式</span>
          </div>
          <div class="quick-methods-optimized">
            <button 
              class="method-btn-optimized" 
              @click="handleWechatLogin"
              @touchstart.passive="handleTouchStart"
              aria-label="微信登录"
            >
              <span class="method-icon">💬</span>
              <span class="method-text">微信</span>
            </button>
            <button 
              class="method-btn-optimized" 
              @click="handleFaceLogin"
              @touchstart.passive="handleTouchStart"
              aria-label="人脸识别登录"
            >
              <span class="method-icon">👤</span>
              <span class="method-text">人脸</span>
            </button>
            <button 
              class="method-btn-optimized" 
              @click="handlePasswordLogin"
              @touchstart.passive="handleTouchStart"
              aria-label="密码登录"
            >
              <span class="method-icon">🔑</span>
              <span class="method-text">密码</span>
            </button>
          </div>
        </div>

        <!-- 注册链接 -->
        <div class="register-link-optimized">
          <span class="link-text">还没有账号？</span>
          <button class="link-btn-optimized" @click="goToRegister" @touchstart.passive="handleTouchStart">立即注册</button>
        </div>
      </div>

      <!-- 协议 -->
      <div class="agreement-optimized">
        <label class="agreement-label-optimized" @click="agreed = !agreed">
          <div class="custom-checkbox-optimized" :class="{ 'custom-checkbox--checked': agreed }">
            <span v-if="agreed" class="checkbox-check">✓</span>
          </div>
          <span class="agreement-text-optimized">
            我已阅读并同意
            <button class="agreement-link-optimized" @click.stop="viewAgreement('user')">《用户协议》</button>
            和
            <button class="agreement-link-optimized" @click.stop="viewAgreement('privacy')">《隐私政策》</button>
          </span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { useElderlyStore } from '@/store/elderly'
import { useToast } from '@/utils/toast'
import '@/styles/role-login-mobile.css'

defineOptions({
  name: 'LoginPageOptimized'
})

const router = useRouter()
const userStore = useUserStore()
const elderlyStore = useElderlyStore()
const toast = useToast()

const roles = [
  { value: 'villager', label: '村民', icon: '👨‍🌾' },
  { value: 'cadre', label: '村干部', icon: '👔' },
  { value: 'official', label: '乡镇干部', icon: '🏛️' },
  { value: 'purchaser', label: '采购商', icon: '🏪' },
  { value: 'admin', label: '管理员', icon: '⚙️' }
]

const selectedRole = ref('villager')
const form = ref({
  phone: '',
  code: ''
})
const agreed = ref(false)
const counting = ref(false)
const countdown = ref(60)
const isLoggingIn = ref(false)
const loginSuccess = ref(false)
const phoneError = ref('')

const isElderlyMode = computed(() => elderlyStore.isElderlyMode)

const canLogin = computed(() => {
  return form.value.phone &&
         form.value.code &&
         agreed.value
})

onMounted(() => {
  console.log('=== 登录页面加载 ===')
  console.log('是否可登录:', canLogin.value)
})

watch([form, agreed], () => {
  console.log('表单状态更新:', {
    phone: form.value.phone,
    code: form.value.code,
    agreed: agreed.value,
    canLogin: canLogin.value
  })
}, { deep: true })

const selectRole = (role) => {
  selectedRole.value = role
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

const sendCode = async () => {
  if (!form.value.phone) {
    phoneError.value = '请输入手机号'
    if (elderlyStore.voiceEnabled) {
      elderlyStore.speak('请输入手机号')
    }
    if (elderlyStore.hapticFeedback) {
      elderlyStore.vibrate('error')
    }
    return
  }

  if (form.value.phone.length !== 11) {
    phoneError.value = '请输入正确的手机号'
    if (elderlyStore.voiceEnabled) {
      elderlyStore.speak('请输入正确的手机号')
    }
    if (elderlyStore.hapticFeedback) {
      elderlyStore.vibrate('error')
    }
    return
  }

  phoneError.value = ''

  const mockCode = Math.floor(1000 + Math.random() * 9000).toString()

  console.log('【开发模式】验证码:', mockCode)

  form.value.code = mockCode

  counting.value = true
  countdown.value = 60
  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
      counting.value = false
    }
  }, 1000)

  // 使用 Toast 替代 alert
  toast.success(`验证码: ${mockCode}（已自动填充）`)

  if (elderlyStore.voiceEnabled) {
    elderlyStore.speak(`验证码是${mockCode.split('').join('，')}，已自动填充`)
  }

  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('success')
  }
}

const handleLogin = async () => {
  if (!canLogin.value) {
    if (!agreed.value) {
      toast.error('请先阅读并同意用户协议和隐私政策')
      if (elderlyStore.voiceEnabled) {
        elderlyStore.speak('请先阅读并同意用户协议和隐私政策')
      }
    }
    if (elderlyStore.hapticFeedback) {
      elderlyStore.vibrate('error')
    }
    return
  }

  if (form.value.phone.length !== 11) {
    phoneError.value = '请输入正确的手机号'
    toast.error('请输入正确的手机号')
    if (elderlyStore.voiceEnabled) {
      elderlyStore.speak('请输入正确的手机号')
    }
    if (elderlyStore.hapticFeedback) {
      elderlyStore.vibrate('error')
    }
    return
  }

  isLoggingIn.value = true

  try {
    console.log('登录:', {
      phone: form.value.phone,
      code: form.value.code,
      role: selectedRole.value
    })

    const mockUser = {
      id: 'user_001',
      phone: form.value.phone,
      name: '张大山',
      avatar: '👨',
      villageName: '东村',
      villageId: 'DZ2024001',
      role: selectedRole.value,
      roleName: roles.find(r => r.value === selectedRole.value)?.label
    }

    await userStore.login(mockUser)

    loginSuccess.value = true

    if (elderlyStore.hapticFeedback) {
      elderlyStore.vibrate('success')
    }

    if (elderlyStore.voiceEnabled) {
      elderlyStore.speak('登录成功，欢迎回来')
    }

    toast.success('登录成功，欢迎回来！')

    setTimeout(() => {
      switch (selectedRole.value) {
        case 'admin':
        case 'official':
        case 'cadre':
          router.replace('/services')
          break
        case 'purchaser':
          router.replace('/home/purchaser')
          break
        default:
          router.replace('/village')
      }
    }, 1500)
  } catch (error) {
    console.error('登录失败:', error)
    toast.error('登录失败，请重试')
    if (elderlyStore.voiceEnabled) {
      elderlyStore.speak('登录失败，请重试')
    }
    if (elderlyStore.hapticFeedback) {
      elderlyStore.vibrate('error')
    }
  } finally {
    isLoggingIn.value = false
  }
}

const handleWechatLogin = () => {
  console.log('微信登录')
}

const handleFaceLogin = () => {
  console.log('人脸登录')
}

const handlePasswordLogin = () => {
  router.push('/auth/password-login')
}

const goToRegister = () => {
  router.push('/auth/register')
}

const viewAgreement = (type) => {
  const agreementNames = {
    user: '用户协议',
    privacy: '隐私政策'
  }
  toast.info(`${agreementNames[type]}页面开发中，请勾选协议继续登录`)
}

const handleTouchStart = () => {
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('light')
  }
}

const onPhoneInput = () => {
  form.value.phone = form.value.phone.replace(/\D/g, '')
  if (form.value.phone && form.value.phone.length !== 11) {
    phoneError.value = ''
  }
}

const onFocus = (field) => {
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('light')
  }
}

const onBlur = () => {
  if (form.value.phone.length > 0 && form.value.phone.length !== 11) {
    phoneError.value = '请输入正确的手机号'
  } else {
    phoneError.value = ''
  }
}
</script>

<style scoped>
/* 导入通用样式 */
@import '@/styles/role-login-mobile.css';

.login-page-optimized {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  pointer-events: none;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.bg-circle-1 {
  width: 300px;
  height: 300px;
  top: -100px;
  right: -100px;
  animation: float 20s ease-in-out infinite;
}

.bg-circle-2 {
  width: 200px;
  height: 200px;
  bottom: -50px;
  left: -50px;
  animation: float 15s ease-in-out infinite reverse;
}

.bg-circle-3 {
  width: 150px;
  height: 150px;
  top: 50%;
  left: -75px;
  animation: float 18s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

.login-content-optimized {
  width: 100%;
  max-width: 400px;
  position: relative;
  z-index: 1;
}

.login-header-optimized {
  text-align: center;
  margin-bottom: 40px;
}

.login-header-optimized .logo {
  font-size: 64px;
  margin-bottom: 16px;
}

.login-header-optimized .title {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}

.login-header-optimized .subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.login-form-optimized {
  background: #fff;
  border-radius: 16px;
  padding: 32px 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.role-selector-optimized {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: nowrap;
  overflow-x: auto;
}

.role-item-optimized {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  background: #f5f5f5;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 80px;
  min-width: 60px;
  flex: 1;
  white-space: nowrap;
}

.role-item-optimized {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: #f5f5f5;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 80px;
  min-width: 44px;
}

.role-item-optimized:active {
  transform: scale(0.95);
}

.role-item--active {
  background: #e6f7ff;
  border-color: #1890ff;
}

.role-item-optimized .role-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.role-item-optimized .role-name {
  font-size: 12px;
  color: #666;
}

.role-item--active .role-name {
  color: #1890ff;
  font-weight: 600;
}

.form-item-optimized {
  margin-bottom: 16px;
}

.input-wrapper-optimized.input-wrapper--error {
  border-color: #ff4d4f;
  background: #fff1f0;
}

.input-error-optimized {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 13px;
  color: #ff4d4f;
  animation: slideIn 0.3s ease;
}

.input-error-optimized svg {
  flex-shrink: 0;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.input-wrapper-optimized {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 0 12px;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.input-wrapper-optimized:focus-within {
  border-color: #1890ff;
  background: #fff;
}

.input-wrapper-optimized.code-wrapper-optimized {
  padding-right: 8px;
}

.input-wrapper-optimized .input-icon {
  font-size: 20px;
  margin-right: 8px;
  opacity: 0.5;
}

.form-input-optimized {
  flex: 1;
  border: none;
  background: transparent;
  padding: 14px 0;
  font-size: 14px;
  outline: none;
  color: #333;
}

.form-input-optimized.large-text {
  font-size: 18px;
}

.form-input-optimized::placeholder {
  color: #999;
}

.code-btn-optimized {
  padding: 8px 16px;
  border: none;
  background: #1890ff;
  color: #fff;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  min-height: 36px;
  min-width: 44px;
}

.code-btn-optimized:active {
  transform: scale(0.95);
}

.code-btn-optimized:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.login-btn-optimized {
  width: 100%;
  height: 48px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 24px;
  margin-bottom: 24px;
  transition: all 0.2s ease;
}

.login-btn-optimized:active:not(:disabled) {
  transform: scale(0.98);
}

.login-btn-optimized:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.login-btn-optimized.button--loading {
  cursor: wait;
}

.login-btn-optimized .btn-loader {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.login-btn-optimized .spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.login-btn-optimized .btn-success {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.quick-login-optimized {
  margin-bottom: 24px;
}

.quick-login-optimized .divider-optimized {
  display: flex;
  align-items: center;
  margin: 24px 0;
}

.quick-login-optimized .divider-optimized::before,
.quick-login-optimized .divider-optimized::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e8e8e8;
}

.quick-login-optimized .divider-text {
  padding: 0 16px;
  font-size: 12px;
  color: #999;
}

.quick-methods-optimized {
  display: flex;
  justify-content: center;
  gap: 24px;
}

.method-btn-optimized {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  border: none;
  background: none;
  cursor: pointer;
  min-width: 60px;
  min-height: 60px;
}

.method-btn-optimized .method-icon {
  font-size: 32px;
  transition: transform 0.2s ease;
}

.method-btn-optimized .method-text {
  font-size: 12px;
  color: #666;
}

.method-btn-optimized:active .method-icon {
  transform: scale(0.9);
  opacity: 0.7;
}

.register-link-optimized {
  text-align: center;
  margin-top: 24px;
}

.register-link-optimized .link-text {
  font-size: 14px;
  color: #666;
}

.register-link-optimized .link-btn-optimized {
  border: none;
  background: none;
  color: #1890ff;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
}

.register-link-optimized .link-btn-optimized:active {
  opacity: 0.7;
}

.agreement-optimized {
  margin-top: 24px;
  padding: 0 8px;
}

.agreement-label-optimized {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
}

.custom-checkbox-optimized {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  min-width: 20px;
  border: 2px solid #d9d9d9;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  transition: all 0.3s ease;
}

.custom-checkbox--checked {
  background: #1890ff;
  border-color: #1890ff;
}

.custom-checkbox-optimized .checkbox-check {
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  line-height: 1;
}

.agreement-text-optimized {
  font-size: 12px;
  color: #666;
  line-height: 1.5;
  user-select: none;
}

.agreement-link-optimized {
  border: none;
  background: none;
  color: #1890ff;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  text-decoration: none;
}

.agreement-link-optimized:active {
  opacity: 0.7;
}

/* 适老化模式覆盖 */
.elderly-mode-active .login-header-optimized .title {
  font-size: 40px;
}

.elderly-mode-active .login-btn-optimized {
  height: 56px;
  font-size: 20px;
}

.elderly-mode-active .agreement-text-optimized {
  font-size: 14px;
}

/* 高对比度模式 */
.high-contrast .login-page-optimized {
  background: #000;
}

.high-contrast .bg-circle {
  background: rgba(255, 255, 255, 0.05);
}

.high-contrast .login-header-optimized .title {
  color: #fff;
}

.high-contrast .login-header-optimized .subtitle {
  color: #ffff00;
}

.high-contrast .login-form-optimized {
  background: #fff;
  border: 3px solid #000;
}

.high-contrast .input-wrapper-optimized {
  background: #fff;
  border: 2px solid #000;
}

.high-contrast .input-wrapper-optimized:focus-within {
  border-color: #000;
  background: #ffff00;
}

.high-contrast .form-input-optimized {
  color: #000;
}

.high-contrast .role-item-optimized {
  background: #fff;
  border: 2px solid #000;
}

.high-contrast .role-item--active {
  background: #000;
  border-color: #000;
}

.high-contrast .role-item--active .role-name {
  color: #fff;
}

.high-contrast .code-btn-optimized,
.high-contrast .login-btn-optimized {
  background: #000;
  color: #fff;
  border: 2px solid #000;
}

.high-contrast .agreement-link-optimized {
  color: #000;
  text-decoration: underline;
}

.elderly-mode-active .role-item-optimized {
  padding: 16px 12px;
}

.elderly-mode-active .role-item-optimized .role-icon {
  font-size: 32px;
}

.elderly-mode-active .role-item-optimized .role-name {
  font-size: 16px;
}

.elderly-mode-active .form-input-optimized {
  font-size: 16px;
}

.elderly-mode-active .form-input-optimized.large-text {
  font-size: 18px;
}

.elderly-mode-active .login-btn-optimized {
  height: 56px;
  font-size: 20px;
}

.elderly-mode-active .agreement-text-optimized {
  font-size: 14px;
}

/* 响应式调整 */
@media (max-width: 375px) {
  .login-header-optimized .logo {
    font-size: 48px;
  }

  .login-header-optimized .title {
    font-size: 28px;
  }

  .login-form-optimized {
    padding: 24px 16px;
  }

  .role-selector-optimized {
    gap: 6px;
  }

  .role-item-optimized {
    padding: 10px 6px;
  }

  .role-item-optimized .role-icon {
    font-size: 20px;
  }

  .method-btn-optimized {
    min-width: 50px;
    min-height: 50px;
  }

  .method-btn-optimized .method-icon {
    font-size: 28px;
  }
}

@media (max-width: 320px) {
  .login-form-optimized {
    padding: 20px 12px;
  }

  .role-selector-optimized {
    gap: 4px;
  }

  .role-item-optimized {
    padding: 8px 4px;
  }

  .quick-methods-optimized {
    gap: 16px;
  }

  .method-btn-optimized {
    min-width: 44px;
  min-height: 44px;
  }

  .method-btn-optimized .method-icon {
    font-size: 24px;
  }
}

/* 无障碍访问 */
.role-item-optimized:focus-visible,
.code-btn-optimized:focus-visible,
.login-btn-optimized:focus-visible,
.method-btn-optimized:focus-visible,
.link-btn-optimized:focus-visible {
  outline: 3px solid #1890ff;
  outline-offset: 2px;
}
</style>
