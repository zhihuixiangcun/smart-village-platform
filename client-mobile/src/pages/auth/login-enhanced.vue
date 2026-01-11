<template>
  <div class="login-page-enhanced" :class="{ 'elderly-mode-active': isElderlyMode, 'high-contrast': elderlyStore.highContrast }">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="bg-circle bg-circle-1"></div>
      <div class="bg-circle bg-circle-2"></div>
      <div class="bg-circle bg-circle-3"></div>
    </div>

    <!-- 主要内容 -->
    <div class="login-content-enhanced">
      <!-- Logo和标题 -->
      <div class="login-header-enhanced">
        <div class="logo-wrapper">
          <svg class="logo" viewBox="0 0 64 64" width="64" height="64">
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#52c41a"/>
                <stop offset="100%" style="stop-color:#389e0d"/>
              </linearGradient>
            </defs>
            <path d="M32 4L60 20V44L32 60L4 44V20L32 4Z" fill="url(#logoGrad)"/>
            <path d="M32 12L52 24V40L32 52L12 40V24L32 12Z" fill="rgba(255,255,255,0.2)"/>
            <circle cx="32" cy="32" r="8" fill="#fff"/>
          </svg>
        </div>
        <h1 class="title">智慧乡村</h1>
        <p class="subtitle">让乡村生活更美好</p>
      </div>

      <!-- 登录表单 -->
      <div class="login-form-enhanced">
        <!-- 角色选择 -->
        <div class="role-selector-enhanced">
          <div
            v-for="role in roles"
            :key="role.value"
            :class="['role-item-enhanced', { 'role-item--active': selectedRole === role.value }]"
            @click="selectRole(role.value)"
            @touchstart.passive="handleTouchStart"
            role="button"
            :aria-label="role.label"
            :aria-pressed="selectedRole === role.value"
            :tabindex="0"
            @keydown.enter="selectRole(role.value)"
            @keydown.space.prevent="selectRole(role.value)"
          >
            <svg class="role-icon" :width="24" :height="24" viewBox="0 0 24 24">
              <circle :cx="role.iconCx" :cy="role.iconCy" :r="role.iconR" :fill="role.color" fill-opacity="0.2"/>
              <text x="12" y="17" text-anchor="middle" font-size="16">{{ role.icon }}</text>
            </svg>
            <span class="role-name">{{ role.label }}</span>
          </div>
        </div>

        <!-- 手机号输入 -->
        <div class="form-item-enhanced">
          <label class="form-label-enhanced">手机号</label>
          <div class="input-wrapper-enhanced" :class="{ 'input-wrapper--error': phoneError }">
            <svg class="input-icon" viewBox="0 0 24 24" width="20" height="20">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/>
              <line x1="12" y1="18" x2="12.01" y2="18" stroke="currentColor" stroke-width="2"/>
            </svg>
            <input
              v-model="form.phone"
              type="tel"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="11"
              class="form-input-enhanced"
              :class="{ 'large-text': isElderlyMode }"
              placeholder="请输入手机号"
              aria-label="手机号"
              :aria-invalid="phoneError ? true : undefined"
              @input="onPhoneInput"
              @focus="onFocus"
              @blur="onBlur"
            />
            <Transition name="fade">
              <button
                v-if="form.phone.length > 0"
                type="button"
                class="clear-btn"
                @click="clearField('phone')"
                aria-label="清除输入"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </button>
            </Transition>
          </div>
          <Transition name="slide-down">
            <div v-if="phoneError" class="input-error-enhanced" role="alert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{{ phoneError }}</span>
            </div>
          </Transition>
        </div>

        <!-- 验证码输入 -->
        <div class="form-item-enhanced">
          <label class="form-label-enhanced">验证码</label>
          <div class="input-wrapper-enhanced code-wrapper-enhanced">
            <svg class="input-icon" viewBox="0 0 24 24" width="20" height="20">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
            <input
              v-model="form.code"
              type="tel"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="6"
              class="form-input-enhanced"
              :class="{ 'large-text': isElderlyMode }"
              placeholder="请输入验证码"
              aria-label="验证码"
              @focus="onFocus"
              @blur="onBlur"
            />
            <button
              class="code-btn-enhanced"
              :disabled="!canSendCode || counting"
              @click="sendCode"
              @touchstart.passive="handleTouchStart"
              aria-label="获取验证码"
            >
              <Transition name="fade" mode="out-in">
                <span v-if="!counting" :key="1">获取验证码</span>
                <span v-else :key="2">{{ countdown }}s</span>
              </Transition>
            </button>
          </div>
        </div>

        <!-- 登录按钮 -->
        <button
          class="login-btn-enhanced"
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
        <div class="quick-login-enhanced">
          <div class="divider-enhanced">
            <span class="divider-line"></span>
            <span class="divider-text">其他登录方式</span>
            <span class="divider-line"></span>
          </div>
          <div class="quick-methods-enhanced">
            <button
              class="method-btn-enhanced"
              @click="handleWechatLogin"
              @touchstart.passive="handleTouchStart"
              aria-label="微信登录"
            >
              <svg class="method-icon" viewBox="0 0 24 24" width="24" height="24">
                <path d="M7 16c-3.31 0-6-2.24-6-5s2.69-5 6-5 6 2.24 6 5-2.69 5-6 5zm10.5-6c.28 0 .55.03.81.08-.26-.05-.53-.08-.81-.08zm0 0c-.28 0-.55.03-.81.08.26-.05.53-.08.81-.08zm-1.3-1.08c-.22.08-.44.18-.65.3.21-.12.43-.22.65-.3zm1.3 5.08c-.28 0-.55-.03-.81-.08.26.05.53.08.81.08zm0 0c-.28 0-.55-.03-.81-.08.26.05.53.08.81.08zm-1.3-5.08c-.22.08-.44.18-.65.3.21-.12.43-.22.65-.3z" fill="#07c160"/>
              </svg>
              <span class="method-text">微信</span>
            </button>
            <button
              class="method-btn-enhanced"
              @click="handleFaceLogin"
              @touchstart.passive="handleTouchStart"
              aria-label="人脸识别登录"
            >
              <svg class="method-icon" viewBox="0 0 24 24" width="24" height="24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
                <circle cx="15" cy="10" r="1.5" fill="currentColor"/>
                <path d="M8 15c0 2 1.5 3 4 3s4-1 4-3" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
              <span class="method-text">人脸</span>
            </button>
            <button
              class="method-btn-enhanced"
              @click="handlePasswordLogin"
              @touchstart.passive="handleTouchStart"
              aria-label="密码登录"
            >
              <svg class="method-icon" viewBox="0 0 24 24" width="24" height="24">
                <rect x="5" y="10" width="14" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
                <path d="M12 10V7a3 3 0 0 0-6 0v3" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
              <span class="method-text">密码</span>
            </button>
          </div>
        </div>

        <!-- 注册链接 -->
        <div class="register-link-enhanced">
          <span class="link-text">还没有账号？</span>
          <button class="link-btn-enhanced" @click="goToRegister" @touchstart.passive="handleTouchStart">立即注册</button>
        </div>
      </div>

      <!-- 协议 -->
      <div class="agreement-enhanced">
        <label class="agreement-label-enhanced" @click="agreed = !agreed">
          <div class="custom-checkbox-enhanced" :class="{ 'custom-checkbox--checked': agreed }">
            <svg v-if="agreed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="14" height="14">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <span class="agreement-text-enhanced">
            我已阅读并同意
            <button class="agreement-link-enhanced" @click.stop="viewAgreement('user')">《用户协议》</button>
            和
            <button class="agreement-link-enhanced" @click.stop="viewAgreement('privacy')">《隐私政策》</button>
          </span>
        </label>
      </div>
    </div>

    <!-- 语音帮助按钮（适老化模式） -->
    <Transition name="fade">
      <button
        v-if="isElderlyMode"
        class="voice-help-btn"
        @click="toggleVoiceHelp"
        @touchstart.passive="handleTouchStart"
        aria-label="语音帮助"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </button>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { useElderlyStore } from '@/store/elderly'
import { useToast } from '@/utils/toast'

defineOptions({
  name: 'LoginPageEnhanced'
})

const router = useRouter()
const userStore = useUserStore()
const elderlyStore = useElderlyStore()
const toast = useToast()

const roles = [
  { value: 'villager', label: '村民', icon: '👨‍🌾', color: '#52c41a', iconCx: 12, iconCy: 12, iconR: 10 },
  { value: 'cadre', label: '村干部', icon: '👔', color: '#1890ff', iconCx: 12, iconCy: 12, iconR: 10 },
  { value: 'official', label: '乡镇干部', icon: '🏛️', color: '#722ed1', iconCx: 12, iconCy: 12, iconR: 10 },
  { value: 'purchaser', label: '采购商', icon: '🏪', color: '#eb2f96', iconCx: 12, iconCy: 12, iconR: 10 },
  { value: 'admin', label: '管理员', icon: '⚙️', color: '#fa8c16', iconCx: 12, iconCy: 12, iconR: 10 }
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

const canSendCode = computed(() => {
  return /^1[3-9]\d{9}$/.test(form.value.phone)
})

const canLogin = computed(() => {
  return form.value.phone.length === 11 &&
         form.value.code.length > 0 &&
         agreed.value &&
         !phoneError.value
})

onMounted(async () => {
  await elderlyStore.loadSettings()

  if (elderlyStore.voiceEnabled && elderlyStore.isElderlyMode) {
    setTimeout(() => {
      elderlyStore.speak('欢迎来到智慧乡村登录页面，请选择您的身份')
    }, 500)
  }

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
    elderlyStore.vibrate('medium')
  }
  if (elderlyStore.voiceEnabled) {
    const roleName = roles.find(r => r.value === role)?.label
    elderlyStore.speak(`已选择${roleName}身份`)
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
  toast.info('微信登录功能开发中')
}

const handleFaceLogin = () => {
  toast.info('人脸识别功能开发中')
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

const toggleVoiceHelp = () => {
  toast.info('请说出"我要登录"或"我是XX角色"')
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

const onFocus = () => {
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

const clearField = (field) => {
  form.value[field] = ''
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('light')
  }
}
</script>

<style scoped>
.login-page-enhanced {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 50%, #a5d6a7 100%);
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
  background: rgba(82, 196, 26, 0.08);
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

.login-content-enhanced {
  width: 100%;
  max-width: 400px;
  position: relative;
  z-index: 1;
}

.login-header-enhanced {
  text-align: center;
  margin-bottom: 40px;
}

.logo-wrapper {
  margin-bottom: 16px;
}

.logo {
  filter: drop-shadow(0 4px 12px rgba(82, 196, 26, 0.3));
}

.title {
  font-size: 32px;
  font-weight: 700;
  color: #1b5e20;
  margin-bottom: 8px;
  letter-spacing: 2px;
}

.subtitle {
  font-size: 14px;
  color: #2e7d32;
  font-weight: 500;
}

.login-form-enhanced {
  background: #fff;
  border-radius: 16px;
  padding: 32px 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.role-selector-enhanced {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: nowrap;
  overflow-x: auto;
}

.role-item-enhanced {
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
  white-space: nowrap;
}

.role-item-enhanced .role-name {
  font-size: 12px;
  color: #666;
  font-weight: 500;
  white-space: nowrap;
}

.role-item-enhanced:active {
  transform: scale(0.95);
}

.role-item--active {
  background: #e6f7ff;
  border-color: #1890ff;
}

.role-item-enhanced .role-icon {
  margin-bottom: 4px;
  color: #52c41a;
}

.role-item-enhanced .role-name {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.role-item--active .role-name {
  color: #1890ff;
  font-weight: 600;
}

.form-item-enhanced {
  margin-bottom: 20px;
}

.form-label-enhanced {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.input-wrapper-enhanced {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 0 12px;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  min-height: 52px;
}

.input-wrapper-enhanced:focus-within {
  border-color: #52c41a;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(82, 196, 26, 0.1);
}

.input-wrapper-enhanced.input-wrapper--error {
  border-color: #ff4d4f;
  background: #fff1f0;
}

.input-wrapper-enhanced.code-wrapper-enhanced {
  padding-right: 8px;
}

.input-wrapper-enhanced .input-icon {
  margin-right: 8px;
  opacity: 0.5;
  flex-shrink: 0;
}

.form-input-enhanced {
  flex: 1;
  border: none;
  background: transparent;
  padding: 16px 0;
  font-size: 16px;
  outline: none;
  color: #333;
}

.form-input-enhanced.large-text {
  font-size: 20px;
  padding: 20px 0;
}

.form-input-enhanced::placeholder {
  color: #999;
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: #999;
  transition: all 0.2s ease;
}

.clear-btn:active {
  transform: scale(0.95);
  background: rgba(0, 0, 0, 0.1);
}

.code-btn-enhanced {
  padding: 10px 16px;
  border: none;
  background: #52c41a;
  color: #fff;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  min-height: 36px;
  min-width: 44px;
}

.code-btn-enhanced:active:not(:disabled) {
  transform: scale(0.95);
  opacity: 0.9;
}

.code-btn-enhanced:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.login-btn-enhanced {
  width: 100%;
  height: 52px;
  border: none;
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
  color: #fff;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 24px;
  margin-bottom: 24px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-btn-enhanced:active:not(:disabled) {
  transform: scale(0.98);
  opacity: 0.95;
}

.login-btn-enhanced:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.login-btn-enhanced.button--loading {
  cursor: wait;
}

.login-btn-enhanced .btn-loader {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.login-btn-enhanced .spinner {
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

.login-btn-enhanced .btn-success {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.input-error-enhanced {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 13px;
  color: #ff4d4f;
}

.input-error-enhanced svg {
  flex-shrink: 0;
}

.quick-login-enhanced {
  margin-bottom: 24px;
}

.quick-login-enhanced .divider-enhanced {
  display: flex;
  align-items: center;
  margin: 24px 0;
}

.quick-login-enhanced .divider-line {
  flex: 1;
  height: 1px;
  background: #e8e8e8;
}

.quick-login-enhanced .divider-text {
  padding: 0 16px;
  font-size: 13px;
  color: #999;
  white-space: nowrap;
}

.quick-methods-enhanced {
  display: flex;
  justify-content: center;
  gap: 32px;
}

.method-btn-enhanced {
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

.method-btn-enhanced .method-icon {
  color: #666;
  transition: transform 0.2s ease;
}

.method-btn-enhanced .method-text {
  font-size: 13px;
  color: #666;
}

.method-btn-enhanced:active .method-icon {
  transform: scale(0.9);
  opacity: 0.7;
}

.register-link-enhanced {
  text-align: center;
  margin-top: 24px;
}

.register-link-enhanced .link-text {
  font-size: 14px;
  color: #666;
}

.register-link-enhanced .link-btn-enhanced {
  border: none;
  background: none;
  color: #52c41a;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
}

.register-link-enhanced .link-btn-enhanced:active {
  opacity: 0.7;
}

.agreement-enhanced {
  margin-top: 24px;
  padding: 0 8px;
}

.agreement-label-enhanced {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
}

.custom-checkbox-enhanced {
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
  background: #52c41a;
  border-color: #52c41a;
}

.agreement-text-enhanced {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  user-select: none;
}

.agreement-link-enhanced {
  border: none;
  background: none;
  color: #52c41a;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.agreement-link-enhanced:active {
  opacity: 0.7;
}

.voice-help-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 56px;
  height: 56px;
  border: none;
  background: #52c41a;
  color: #fff;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(82, 196, 26, 0.3);
  transition: all 0.3s ease;
  z-index: 100;
}

.voice-help-btn:active {
  transform: scale(0.95);
}

/* 适老化模式覆盖 */
.elderly-mode-active .title {
  font-size: 40px;
}

.elderly-mode-active .subtitle {
  font-size: 16px;
}

.elderly-mode-active .role-item-enhanced {
  padding: 16px 12px;
  min-height: 60px;
}

.elderly-mode-active .role-item-enhanced .role-icon {
  transform: scale(1.2);
}

.elderly-mode-active .role-item-enhanced .role-name {
  font-size: 16px;
}

.elderly-mode-active .form-label-enhanced {
  font-size: 18px;
}

.elderly-mode-active .form-input-enhanced {
  font-size: 18px;
  padding: 20px 0;
}

.elderly-mode-active .form-input-enhanced.large-text {
  font-size: 22px;
  padding: 24px 0;
}

.elderly-mode-active .login-btn-enhanced {
  height: 64px;
  font-size: 20px;
}

.elderly-mode-active .agreement-text-enhanced {
  font-size: 16px;
}

.elderly-mode-active .method-btn-enhanced .method-text {
  font-size: 16px;
}

/* 高对比度模式 */
.high-contrast .login-page-enhanced {
  background: #000;
}

.high-contrast .bg-circle {
  background: rgba(255, 255, 255, 0.05);
}

.high-contrast .title {
  color: #fff;
}

.high-contrast .subtitle {
  color: #ffff00;
}

.high-contrast .login-form-enhanced {
  background: #fff;
  border: 3px solid #000;
}

.high-contrast .input-wrapper-enhanced {
  background: #fff;
  border: 2px solid #000;
}

.high-contrast .input-wrapper-enhanced:focus-within {
  border-color: #000;
  background: #ffff00;
}

.high-contrast .input-wrapper-enhanced.input-wrapper--error {
  border-color: #ff0000;
  background: #ffcccc;
}

.high-contrast .form-input-enhanced {
  color: #000;
}

.high-contrast .role-item-enhanced {
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

.high-contrast .code-btn-enhanced,
.high-contrast .login-btn-enhanced {
  background: #000;
  color: #fff;
  border: 2px solid #000;
}

.high-contrast .agreement-link-enhanced {
  color: #000;
  text-decoration: underline;
  font-weight: bold;
}

.high-contrast .agreement-text-enhanced {
  color: #000;
}

.high-contrast .form-label-enhanced {
  color: #000;
}

/* 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-down-enter-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-down-enter-to {
  opacity: 1;
  transform: translateY(0);
}

/* 响应式调整 */
@media (max-width: 480px) {
  .login-content-enhanced {
    padding: 16px;
  }

  .login-form-enhanced {
    padding: 24px 20px;
  }

  .role-selector-enhanced {
    gap: 6px;
  }

  .role-item-enhanced {
    padding: 10px 6px;
  }

  .method-btn-enhanced {
    min-width: 50px;
    min-height: 50px;
  }

  .voice-help-btn {
    bottom: 16px;
    right: 16px;
    width: 48px;
    height: 48px;
  }
}

@media (max-width: 375px) {
  .login-form-enhanced {
    padding: 20px 16px;
  }

  .role-selector-enhanced {
    gap: 4px;
  }

  .role-item-enhanced {
    padding: 8px 4px;
  }

  .quick-methods-enhanced {
    gap: 24px;
  }

  .method-btn-enhanced {
    min-width: 44px;
    min-height: 44px;
  }
}

/* 无障碍访问 */
.role-item-enhanced:focus-visible,
.code-btn-enhanced:focus-visible,
.login-btn-enhanced:focus-visible,
.method-btn-enhanced:focus-visible,
.link-btn-enhanced:focus-visible,
.voice-help-btn:focus-visible {
  outline: 3px solid #52c41a;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
