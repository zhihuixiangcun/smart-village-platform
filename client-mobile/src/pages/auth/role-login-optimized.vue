<template>
  <div class="role-login-container" :class="{ 'elderly-mode-active': isElderlyMode }">
    <SkipLink @skip="skipToContent" />

    <div class="role-login-bg" aria-hidden="true" :class="{ 'reduced-motion': reducedMotion }">
      <div class="role-login-sky"></div>
    </div>

    <main class="role-login-main" role="main" id="main-content">
      <div class="role-login-hero" :class="{ 'animate-in': showHero }">
        <div class="role-login-mascot">
          <div class="role-login-mascot-wrapper">
            <div class="role-login-mascot-glow"></div>
            <div class="role-login-mascot-svg">
              <svg viewBox="0 0 120 120">
                <defs>
                  <linearGradient id="mascotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#81C784"/>
                    <stop offset="100%" style="stop-color:#4CAF50"/>
                  </linearGradient>
                </defs>
                <circle cx="60" cy="60" r="55" fill="url(#mascotGrad)"/>
                <ellipse cx="45" cy="50" rx="8" ry="10" fill="#fff"/>
                <ellipse cx="75" cy="50" rx="8" ry="10" fill="#fff"/>
                <circle cx="47" cy="48" r="4" fill="#333"/>
                <circle cx="77" cy="48" r="4" fill="#333"/>
                <path d="M45 70 Q60 85 75 70" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
                <circle cx="35" cy="45" r="6" fill="rgba(255,255,255,0.3)"/>
                <circle cx="85" cy="45" r="6" fill="rgba(255,255,255,0.3)"/>
              </svg>
            </div>
          </div>
          <div class="role-login-speech">
            {{ greetingText }}
          </div>
        </div>

        <div class="role-login-brand">
          <div class="role-login-title">
            <div class="role-login-title-main">智慧乡村</div>
            <div class="role-login-title-sub">Smart Village Platform</div>
          </div>
          <div class="role-login-version">v2.0 Premium</div>
        </div>
      </div>

      <div class="role-login-content-wrapper" :class="{ 'has-form': showForm }">
        <Transition name="slide-up" mode="out-in">
          <div v-if="!showForm" key="role-selection" class="role-login-section" role="region" aria-label="选择登录身份">
            <div class="role-login-label">选择您的身份</div>

            <div class="role-login-grid">
              <div
                v-for="(role, index) in roles"
                :key="role.value"
                :class="['role-login-card', { 
                  'role-login-card--active': selectedRole === role.value,
                  'role-login-card--disabled': role.disabled 
                }]"
                :style="{ 
                  '--delay': `${index * 0.1}s`,
                  '--role-color': role.color 
                }"
                role="button"
                :aria-label="role.label"
                :aria-pressed="selectedRole === role.value"
                :tabindex="role.disabled ? -1 : 0"
                @click="selectRole(role)"
                @keydown.enter="selectRole(role)"
                @keydown.space.prevent="selectRole(role)"
              >
                <div class="role-login-card-inner">
                  <div class="role-login-card-icon-wrapper">
                    <div class="role-login-card-icon-bg"></div>
                    <span class="role-login-card-icon">{{ role.icon }}</span>
                  </div>
                  <span class="role-login-card-label">{{ role.label }}</span>
                  <div v-if="role.badge" class="role-login-card-badge">{{ role.badge }}</div>
                  <div v-if="!role.disabled" class="role-login-card-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <button
              class="role-login-continue-btn"
              @click="goToForm"
              :disabled="!selectedRole"
              @touchstart.passive="handleTouchStart"
            >
              <span class="btn-text">{{ selectedRole ? '继续' : '请先选择身份' }}</span>
              <svg v-if="selectedRole" class="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          <div v-else key="login-form" class="role-login-form-section">
            <div class="role-login-form-header">
              <button
                class="role-login-back-btn"
                @click="handleBack"
                @touchstart.passive="handleTouchStart"
                aria-label="返回身份选择"
              >
                <svg class="back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                <span class="back-text">返回</span>
              </button>
              <div class="role-login-role-badge">
                <span class="role-login-badge-icon">{{ currentRoleIcon }}</span>
                <span class="role-login-badge-text">{{ currentRoleLabel }}</span>
              </div>
            </div>

            <form @submit.prevent="handleLogin" class="role-login-form">
              <div class="role-login-field">
                <div class="role-login-floating-field" :class="{ 
                  'field--focused': focusedField === 'phone', 
                  'field--filled': form.phone.length > 0 
                }">
                  <div class="role-login-field-prefix">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                      <line x1="12" y1="18" x2="12.01" y2="18"/>
                    </svg>
                  </div>
                  <div class="role-login-field-content">
                    <input
                      ref="phoneInput"
                      v-model="form.phone"
                      type="tel"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      maxlength="11"
                      class="role-login-field-input"
                      :class="{ 'large-text': isElderlyMode }"
                      placeholder=" "
                      @focus="onFocus('phone')"
                      @blur="onBlur"
                      @input="onPhoneInput"
                      aria-label="手机号"
                      aria-describedby="phone-error"
                      :aria-invalid="phoneError ? true : undefined"
                    />
                    <label class="role-login-field-label">手机号</label>
                  </div>
                  <div class="role-login-field-suffix">
                    <Transition name="fade">
                      <button
                        v-if="form.phone.length > 0"
                        type="button"
                        class="role-login-clear-btn"
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
                </div>
                <div v-if="phoneError" class="role-login-field-error" id="phone-error" role="alert">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span>{{ phoneError }}</span>
                </div>
              </div>

              <div class="role-login-field">
                <div class="role-login-floating-field" :class="{ 
                  'field--focused': focusedField === 'code', 
                  'field--filled': form.code.length > 0 
                }">
                  <div class="role-login-field-prefix">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <div class="role-login-field-content">
                    <input
                      ref="codeInput"
                      v-model="form.code"
                      type="tel"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      maxlength="6"
                      class="role-login-field-input"
                      :class="{ 'large-text': isElderlyMode }"
                      placeholder=" "
                      @focus="onFocus('code')"
                      @blur="onBlur"
                      aria-label="验证码"
                    />
                    <label class="role-login-field-label">验证码</label>
                  </div>
                  <div class="role-login-field-suffix">
                    <button
                      v-if="form.phone.length === 11"
                      type="button"
                      class="role-login-code-trigger"
                      :class="{ 'code-trigger--sent': codeSent }"
                      :disabled="counting"
                      @click="sendCode"
                    >
                      <span v-if="!counting && !codeSent">获取验证码</span>
                      <span v-else-if="counting">{{ countdown }}s</span>
                      <span v-else>已发送</span>
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                class="role-login-submit-btn"
                :class="{ 'button--loading': isLoggingIn, 'button--success': loginSuccess }"
                :disabled="!canLogin || isLoggingIn"
                @touchstart.passive="handleTouchStart"
              >
                <div class="btn-bg"></div>
                <div v-if="isLoggingIn" class="btn-loader">
                  <div class="spinner"></div>
                  <span>登录中...</span>
                </div>
                <div v-else-if="loginSuccess">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span>登录成功</span>
                </div>
                <div v-else>
                  <span>立即登录</span>
                </div>
              </button>
            </form>

            <div class="role-login-agreement" @click="toggleAgreement">
              <div class="role-login-checkbox" :class="{ checked: agreed }">
                <svg v-if="agreed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <span class="role-login-agreement-text">
                我已阅读并同意
                <button type="button" class="role-login-link-btn" @click.stop="openUserAgreement">《用户协议》</button>
                和
                <button type="button" class="role-login-link-btn" @click.stop="openPrivacyPolicy">《隐私政策》</button>
              </span>
            </div>
          </div>
        </Transition>
      </div>
    </main>

    <div class="role-login-bottom-controls">
      <button
        class="role-login-elderly-toggle"
        @click="toggleElderlyMode"
        @touchstart.passive="handleTouchStart"
        :aria-pressed="isElderlyMode"
        aria-label="切换适老化模式"
      >
        <span class="toggle-icon">
          <svg v-if="isElderlyMode" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </span>
        <span class="toggle-text">{{ isElderlyMode ? '标准模式' : '适老化模式' }}</span>
      </button>

      <button class="role-login-voice-help-btn" @click="toggleVoiceHelp" @touchstart.passive="handleTouchStart" aria-label="语音帮助">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </button>
    </div>

    <Teleport to="body">
      <TransitionGroup name="toast" tag="div" class="role-login-toast-wrapper">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['role-login-toast', `role-login-toast--${toast.type}`]"
          role="alert"
          aria-live="polite"
        >
          <div class="role-login-toast-icon">
            <svg v-if="toast.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <svg v-else-if="toast.type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </div>
          <span class="role-login-toast-message">{{ toast.message }}</span>
          <button class="role-login-toast-close" @click="removeToast(toast.id)" aria-label="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { useElderlyStore } from '@/store/elderly'
import { useToast, state as toastState, remove as removeToast } from '@/utils/toast'
import '@/styles/role-login-mobile.css'

const SkipLink = defineAsyncComponent(() => import('./SkipLink.vue'))

defineOptions({
  name: 'RoleLogin'
})

const router = useRouter()
const userStore = useUserStore()
const elderlyStore = useElderlyStore()
const toast = useToast()

const toasts = computed(() => toastState.toasts)

const showHero = ref(false)
const showForm = ref(false)
const counting = ref(false)
const countdown = ref(60)
const codeSent = ref(false)
const agreed = ref(false)
const isLoggingIn = ref(false)
const loginSuccess = ref(false)
const focusedField = ref('')
const phoneError = ref('')
const reducedMotion = ref(false)

const phoneInput = ref(null)
const codeInput = ref(null)

const form = ref({
  phone: '',
  code: ''
})

const selectedRole = ref(null)

const roles = [
  { value: 'villager', label: '村民', icon: '👨‍🌾', color: '#52c41a', description: '普通村民入口' },
  { value: 'cadre', label: '村干部', icon: '👔', color: '#1890ff', description: '村委管理人员' },
  { value: 'official', label: '乡镇干部', icon: '🏛️', color: '#722ed1', disabled: false, description: '乡镇工作人员' },
  { value: 'purchaser', label: '采购商', icon: '🏪', color: '#eb2f96', description: '农产品采购商' },
  { value: 'admin', label: '管理员', icon: '⚙️', color: '#fa8c16', description: '系统管理员' }
]

const greetings = ['欢迎回来', '乡亲们好', '好久不见', '欢迎光临']
const greetingText = computed(() => greetings[Math.floor(Math.random() * greetings.length)])

const currentRole = computed(() => roles.find(r => r.value === selectedRole.value))
const currentRoleLabel = computed(() => currentRole.value?.label || '登录')
const currentRoleIcon = computed(() => currentRole.value?.icon || '')

const isElderlyMode = computed(() => elderlyStore.isElderlyMode)

const canLogin = computed(() => {
  return form.value.phone.length === 11 &&
         form.value.code.length > 0 &&
         agreed.value &&
         !phoneError.value
})

const handleTouchStart = (event) => {
  if (elderlyStore.supportsHaptic) {
    elderlyStore.vibrate('light')
  }
}

const selectRole = (role) => {
  if (role.disabled) {
    toast.info(`${role.label}功能即将开放，敬请期待！`)
    elderlyStore.vibrate('heavy')
    return
  }

  elderlyStore.vibrate('medium')
  selectedRole.value = role.value
}

const goToForm = () => {
  if (!selectedRole.value) {
    toast.info('请先选择您的身份')
    return
  }

  elderlyStore.vibrate('medium')

  nextTick(() => {
    showForm.value = true
    nextTick(() => {
      if (phoneInput.value) {
        phoneInput.value.focus()
      }
    })
  })
}

const handleBack = () => {
  elderlyStore.vibrate('light')
  showForm.value = false
  form.value.code = ''
}

const onFocus = (field) => {
  focusedField.value = field
  elderlyStore.vibrate('light')
}

const onBlur = () => {
  focusedField.value = ''
  if (form.value.phone.length > 0 && form.value.phone.length !== 11) {
    phoneError.value = '请输入正确的手机号'
  } else {
    phoneError.value = ''
  }
}

const onPhoneInput = () => {
  phoneError.value = ''
}

const clearField = (field) => {
  form.value[field] = ''
  if (field === 'phone' && phoneInput.value) {
    phoneInput.value.focus()
  }
}

const sendCode = () => {
  if (!form.value.phone || form.value.phone.length !== 11) {
    toast.info('请输入正确的手机号')
    return
  }

  elderlyStore.vibrate('medium')
  codeSent.value = true

  const mockCode = Math.floor(1000 + Math.random() * 9000).toString()
  form.value.code = mockCode

  toast.success(`验证码: ${mockCode}`)

  counting.value = true
  countdown.value = 60
  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
      counting.value = false
    }
  }, 1000)
}

const toggleAgreement = () => {
  agreed.value = !agreed.value
  elderlyStore.vibrate('light')
}

const openUserAgreement = () => {
  toast.info('用户协议页面开发中，请勾选协议继续登录')
}

const openPrivacyPolicy = () => {
  toast.info('隐私政策页面开发中，请勾选协议继续登录')
}

const toggleVoiceHelp = () => {
  toast.info('请说出"我要登录"或"我是XX角色"')
}

const toggleElderlyMode = () => {
  elderlyStore.toggleElderlyMode()
  toast.info(elderlyStore.isElderlyMode ? '适老化模式已开启' : '适老化模式已关闭')
}

const skipToContent = () => {
  const main = document.getElementById('main-content')
  if (main) {
    main.scrollIntoView({ behavior: 'smooth' })
  }
}

const handleLogin = async () => {
  if (!canLogin.value) {
    if (!agreed.value) {
      toast.info('请先阅读并同意用户协议和隐私政策')
    }
    elderlyStore.vibrate('heavy')
    return
  }

  elderlyStore.vibrate('medium')
  isLoggingIn.value = true

  const mockUser = {
    id: 'user_001',
    phone: form.value.phone,
    name: '张大山',
    avatar: '👨',
    villageName: '东村',
    role: selectedRole.value,
    roleName: currentRoleLabel.value
  }

  await userStore.login(mockUser)

  isLoggingIn.value = false
  loginSuccess.value = true

  elderlyStore.vibrate('success')

  toast.success(`欢迎回来，${mockUser.name}！`)

  setTimeout(() => {
    const roleHomeMap = {
      'villager': '/home/villager',
      'cadre': '/home/cadre',
      'official': '/home/official',
      'admin': '/home/admin',
      'purchaser': '/home/purchaser'
    }
    router.replace(roleHomeMap[selectedRole.value] || '/home/villager')
  }, 2000)
}

onMounted(() => {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  const handleMotionChange = (e) => {
    reducedMotion.value = e.matches
  }
  motionMediaQuery.addEventListener('change', handleMotionChange)

  setTimeout(() => {
    showHero.value = true
  }, 200)
})

onUnmounted(() => {
  const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionMediaQuery.removeEventListener('change', handleMotionChange)
})
</script>

<style scoped>
.role-login-grid {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
  overflow-x: auto;
}

.role-login-content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  min-height: min-content;
  margin-bottom: 20px;
}

.role-login-form {
  width: 100%;
}

.role-login-card {
  flex: 1;
  min-width: 70px;
  white-space: nowrap;
}

@media (max-width: 375px) {
  .role-login-grid {
    gap: 6px;
  }
}
</style>
