<template>
  <div class="multi-login-page" :class="{ 'elderly-mode-active': isElderlyMode }">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="bg-circle bg-circle-1"></div>
      <div class="bg-circle bg-circle-2"></div>
      <div class="bg-circle bg-circle-3"></div>
    </div>

    <!-- 主要内容 -->
    <div class="login-content">
      <!-- Logo和标题 -->
      <div class="login-header">
        <div class="logo">🏘️</div>
        <h1 class="title">智慧乡村</h1>
        <p class="subtitle">Smart Village Platform</p>
      </div>

      <!-- 账号密码登录 -->
      <div
        v-if="currentMethod === 'password'"
        id="tab-password"
        class="login-form password-form"
        role="tabpanel"
        aria-labelledby="tab-password"
      >
        <!-- 角色选择 -->
        <div class="role-selector">
          <div
            v-for="role in roles"
            :key="role.value"
            :class="['role-item', { 'role-item--active': selectedRole === role.value }]"
            @click="selectRole(role.value)"
            @touchstart.passive="handleTouchStart"
            role="button"
            :aria-pressed="selectedRole === role.value"
            :tabindex="0"
            @keydown.enter="selectRole(role.value)"
            @keydown.space.prevent="selectRole(role.value)"
          >
            <span class="role-icon">{{ role.icon }}</span>
            <span class="role-name" :class="{ 'large-text': isElderlyMode }">{{ role.label }}</span>
          </div>
        </div>

        <!-- 登录方式切换 -->
        <div class="login-method-tabs">
          <button
            v-for="method in loginMethods"
            :key="method.value"
            :class="['method-tab', { 'method-tab--active': currentMethod === method.value }]"
            @click="switchMethod(method.value)"
            @touchstart.passive="handleTouchStart"
            role="tab"
            :aria-selected="currentMethod === method.value"
            :aria-controls="`tab-${method.value}`"
            :tabindex="currentMethod === method.value ? 0 : -1"
          >
            <span class="method-tab-icon">{{ method.icon }}</span>
            <span class="method-tab-label" :class="{ 'large-text': isElderlyMode }">{{ method.label }}</span>
          </button>
        </div>

        <!-- 账号输入 -->
        <div class="form-item">
          <div class="input-wrapper" :class="{ 'input-wrapper--error': accountError }">
            <span class="input-icon">👤</span>
            <input
              v-model="passwordForm.account"
              type="text"
              class="form-input"
              :class="{ 'large-text': isElderlyMode }"
              placeholder="请输入账号"
              aria-label="账号"
              aria-invalid="accountError ? true : undefined"
              @input="onAccountInput"
              @focus="onFocus"
              @blur="onBlur"
            />
          </div>
          <div v-if="accountError" class="input-error" role="alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{{ accountError }}</span>
          </div>
        </div>

        <!-- 密码输入 -->
        <div class="form-item">
          <div class="input-wrapper" :class="{ 'input-wrapper--error': passwordError }">
            <span class="input-icon">🔑</span>
            <input
              v-model="passwordForm.password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input password-input"
              :class="{ 'large-text': isElderlyMode }"
              placeholder="请输入密码"
              aria-label="密码"
              aria-invalid="passwordError ? true : undefined"
              @input="onPasswordInput"
              @focus="onFocus"
              @blur="onBlur"
            />
            <button
              class="toggle-password-btn"
              type="button"
              :aria-label="showPassword ? '隐藏密码' : '显示密码'"
              @click="togglePassword"
              @touchstart.passive="handleTouchStart"
            >
              {{ showPassword ? '🙈' : '👁️' }}
            </button>
          </div>
          <div v-if="passwordError" class="input-error" role="alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{{ passwordError }}</span>
          </div>
        </div>

        <!-- 记住密码 & 忘记密码 -->
        <div class="form-actions">
          <label class="remember-me">
            <input v-model="passwordForm.rememberMe" type="checkbox" />
            <span class="remember-text" :class="{ 'large-text': isElderlyMode }">记住登录</span>
          </label>
          <button
            class="forgot-password-btn"
            @click="showForgotPassword"
            @touchstart.passive="handleTouchStart"
          >
            忘记密码？
          </button>
        </div>

        <!-- 登录按钮 -->
        <button
          class="login-btn"
          :class="{ 'button--loading': isLoggingIn, 'button--success': loginSuccess }"
          :disabled="!canPasswordLogin || isLoggingIn"
          @click="handlePasswordLogin"
          @touchstart.passive="handleTouchStart"
          aria-live="polite"
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
          <span v-else class="btn-text" :class="{ 'large-text': isElderlyMode }">登 录</span>
        </button>
      </div>

      <!-- 验证码登录 -->
      <div
        v-if="currentMethod === 'code'"
        id="tab-code"
        class="login-form code-form"
        role="tabpanel"
        aria-labelledby="tab-code"
      >
        <!-- 角色选择 -->
        <div class="role-selector">
          <div
            v-for="role in roles"
            :key="role.value"
            :class="['role-item', { 'role-item--active': selectedRole === role.value }]"
            @click="selectRole(role.value)"
            @touchstart.passive="handleTouchStart"
            role="button"
            :aria-pressed="selectedRole === role.value"
            :tabindex="0"
            @keydown.enter="selectRole(role.value)"
            @keydown.space.prevent="selectRole(role.value)"
          >
            <span class="role-icon">{{ role.icon }}</span>
            <span class="role-name" :class="{ 'large-text': isElderlyMode }">{{ role.label }}</span>
          </div>
        </div>

        <!-- 登录方式切换 -->
        <div class="login-method-tabs">
          <button
            v-for="method in loginMethods"
            :key="method.value"
            :class="['method-tab', { 'method-tab--active': currentMethod === method.value }]"
            @click="switchMethod(method.value)"
            @touchstart.passive="handleTouchStart"
            role="tab"
            :aria-selected="currentMethod === method.value"
            :aria-controls="`tab-${method.value}`"
            :tabindex="currentMethod === method.value ? 0 : -1"
          >
            <span class="method-tab-icon">{{ method.icon }}</span>
            <span class="method-tab-label" :class="{ 'large-text': isElderlyMode }">{{ method.label }}</span>
          </button>
        </div>

        <!-- 手机号输入 -->
        <div class="form-item">
          <div class="input-wrapper" :class="{ 'input-wrapper--error': phoneError }">
            <span class="input-icon">📱</span>
            <input
              v-model="codeForm.phone"
              type="tel"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="11"
              class="form-input"
              :class="{ 'large-text': isElderlyMode }"
              placeholder="请输入手机号"
              aria-label="手机号"
              aria-invalid="phoneError ? true : undefined"
              @input="onPhoneInput"
              @focus="onFocus"
              @blur="onBlur"
            />
          </div>
          <div v-if="phoneError" class="input-error" role="alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{{ phoneError }}</span>
          </div>
        </div>

        <!-- 验证码输入 -->
        <div class="form-item">
          <div class="input-wrapper code-wrapper">
            <span class="input-icon">🔐</span>
            <input
              v-model="codeForm.code"
              type="tel"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="6"
              class="form-input"
              :class="{ 'large-text': isElderlyMode }"
              placeholder="请输入验证码"
              aria-label="验证码"
            />
            <button
              class="code-btn"
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
          class="login-btn"
          :class="{ 'button--loading': isLoggingIn, 'button--success': loginSuccess }"
          :disabled="!canCodeLogin || isLoggingIn"
          @click="handleCodeLogin"
          @touchstart.passive="handleTouchStart"
          aria-live="polite"
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
          <span v-else class="btn-text" :class="{ 'large-text': isElderlyMode }">登 录</span>
        </button>
      </div>

      <!-- 人脸识别登录 -->
      <div
        v-if="currentMethod === 'face'"
        id="tab-face"
        class="login-form face-form"
        role="tabpanel"
        aria-labelledby="tab-face"
      >
        <!-- 角色选择 -->
        <div class="role-selector">
          <div
            v-for="role in roles"
            :key="role.value"
            :class="['role-item', { 'role-item--active': selectedRole === role.value }]"
            @click="selectRole(role.value)"
            @touchstart.passive="handleTouchStart"
            role="button"
            :aria-pressed="selectedRole === role.value"
            :tabindex="0"
            @keydown.enter="selectRole(role.value)"
            @keydown.space.prevent="selectRole(role.value)"
          >
            <span class="role-icon">{{ role.icon }}</span>
            <span class="role-name" :class="{ 'large-text': isElderlyMode }">{{ role.label }}</span>
          </div>
        </div>

        <!-- 登录方式切换 -->
        <div class="login-method-tabs">
          <button
            v-for="method in loginMethods"
            :key="method.value"
            :class="['method-tab', { 'method-tab--active': currentMethod === method.value }]"
            @click="switchMethod(method.value)"
            @touchstart.passive="handleTouchStart"
            role="tab"
            :aria-selected="currentMethod === method.value"
            :aria-controls="`tab-${method.value}`"
            :tabindex="currentMethod === method.value ? 0 : -1"
          >
            <span class="method-tab-icon">{{ method.icon }}</span>
            <span class="method-tab-label" :class="{ 'large-text': isElderlyMode }">{{ method.label }}</span>
          </button>
        </div>

        <div class="face-login-container">
          <div class="face-camera">
            <div class="camera-placeholder">
              <span class="camera-icon">📷</span>
              <p class="camera-text">请正对摄像头</p>
              <p class="camera-subtext">保持光线充足</p>
            </div>
            <div class="face-guide">
              <div class="guide-circle"></div>
              <div class="guide-line guide-line-1"></div>
              <div class="guide-line guide-line-2"></div>
              <div class="guide-line guide-line-3"></div>
              <div class="guide-line guide-line-4"></div>
            </div>
          </div>
          <button
            class="login-btn face-login-btn"
            :class="{ 'button--loading': isLoggingIn, 'button--success': loginSuccess }"
            :disabled="isLoggingIn"
            @click="handleFaceLogin"
            @touchstart.passive="handleTouchStart"
            aria-live="polite"
          >
            <div v-if="isLoggingIn" class="btn-loader">
              <div class="spinner"></div>
              <span class="btn-text">识别中...</span>
            </div>
            <div v-else-if="loginSuccess" class="btn-success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="20" height="20">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span class="btn-text">识别成功</span>
            </div>
            <span v-else class="btn-text" :class="{ 'large-text': isElderlyMode }">开始识别</span>
          </button>
        </div>
      </div>

      <!-- 微信登录 -->
      <div
        v-if="currentMethod === 'wechat'"
        id="tab-wechat"
        class="login-form wechat-form"
        role="tabpanel"
        aria-labelledby="tab-wechat"
      >
        <!-- 角色选择 -->
        <div class="role-selector">
          <div
            v-for="role in roles"
            :key="role.value"
            :class="['role-item', { 'role-item--active': selectedRole === role.value }]"
            @click="selectRole(role.value)"
            @touchstart.passive="handleTouchStart"
            role="button"
            :aria-pressed="selectedRole === role.value"
            :tabindex="0"
            @keydown.enter="selectRole(role.value)"
            @keydown.space.prevent="selectRole(role.value)"
          >
            <span class="role-icon">{{ role.icon }}</span>
            <span class="role-name" :class="{ 'large-text': isElderlyMode }">{{ role.label }}</span>
          </div>
        </div>

        <!-- 登录方式切换 -->
        <div class="login-method-tabs">
          <button
            v-for="method in loginMethods"
            :key="method.value"
            :class="['method-tab', { 'method-tab--active': currentMethod === method.value }]"
            @click="switchMethod(method.value)"
            @touchstart.passive="handleTouchStart"
            role="tab"
            :aria-selected="currentMethod === method.value"
            :aria-controls="`tab-${method.value}`"
            :tabindex="currentMethod === method.value ? 0 : -1"
          >
            <span class="method-tab-icon">{{ method.icon }}</span>
            <span class="method-tab-label" :class="{ 'large-text': isElderlyMode }">{{ method.label }}</span>
          </button>
        </div>

        <div class="wechat-login-container">
          <div class="wechat-qr">
            <div class="qr-placeholder">
              <span class="qr-icon">📱</span>
              <p class="qr-text">请使用微信扫描二维码</p>
              <p class="qr-subtext">或点击下方按钮授权登录</p>
            </div>
          </div>
          <button
            class="login-btn wechat-login-btn"
            :class="{ 'button--loading': isLoggingIn, 'button--success': loginSuccess }"
            :disabled="isLoggingIn"
            @click="handleWechatLogin"
            @touchstart.passive="handleTouchStart"
            aria-live="polite"
          >
            <div v-if="isLoggingIn" class="btn-loader">
              <div class="spinner"></div>
              <span class="btn-text">授权中...</span>
            </div>
            <div v-else-if="loginSuccess" class="btn-success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="20" height="20">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span class="btn-text">授权成功</span>
            </div>
            <span v-else class="btn-text" :class="{ 'large-text': isElderlyMode }">微信授权登录</span>
          </button>
        </div>
      </div>

      <!-- 注册链接 -->
      <div class="register-link">
        <span class="link-text" :class="{ 'large-text': isElderlyMode }">还没有账号？</span>
        <button class="link-btn" @click="goToRegister" @touchstart.passive="handleTouchStart">立即注册</button>
      </div>

      <!-- 协议 -->
      <div class="agreement">
        <label class="agreement-label" @click.stop="agreed = !agreed">
          <div class="custom-checkbox" :class="{ 'custom-checkbox--checked': agreed }">
            <span v-if="agreed" class="checkbox-check">✓</span>
          </div>
          <span class="agreement-text" :class="{ 'large-text': isElderlyMode }">
            我已阅读并同意
            <span class="agreement-link-static">《用户协议》</span>
            和
            <span class="agreement-link-static">《隐私政策》</span>
          </span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
import { useElderlyStore } from '@/store/elderly'
import { useToast } from '@/utils/toast'
import CryptoJS from 'crypto-js'

defineOptions({
  name: 'MultiLoginPage'
})

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const elderlyStore = useElderlyStore()
const toast = useToast()

// 登录方式
const loginMethods = [
  { value: 'password', label: '账号密码', icon: '🔑' },
  { value: 'code', label: '验证码', icon: '📱' },
  { value: 'face', label: '人脸识别', icon: '👤' },
  { value: 'wechat', label: '微信', icon: '💬' }
]

const currentMethod = ref('password')

// 角色列表
const roles = [
  { value: 'villager', label: '村民', icon: '👨‍🌾' },
  { value: 'cadre', label: '村干部', icon: '👔' },
  { value: 'official', label: '乡镇干部', icon: '🏛️' },
  { value: 'purchaser', label: '采购商', icon: '🏪' },
  { value: 'admin', label: '管理员', icon: '⚙️' }
]

const selectedRole = ref('villager')

// 账号密码表单
const passwordForm = ref({
  account: '',
  password: '',
  rememberMe: false
})

const accountError = ref('')
const passwordError = ref('')
const showPassword = ref(false)

// 验证码表单
const codeForm = ref({
  phone: '',
  code: ''
})

const phoneError = ref('')

// 通用状态
const agreed = ref(false)
const counting = ref(false)
const countdown = ref(60)
const isLoggingIn = ref(false)
const loginSuccess = ref(false)

const isElderlyMode = computed(() => elderlyStore.isElderlyMode)

// 计算属性
const canPasswordLogin = computed(() => {
  return passwordForm.value.account &&
         passwordForm.value.password &&
         agreed.value
})

const canCodeLogin = computed(() => {
  return codeForm.value.phone &&
         codeForm.value.code &&
         agreed.value
})

onMounted(() => {
  console.log('=== 多方式登录页面加载 ===')
  console.log('当前登录方式:', currentMethod.value)  
  // 检查是否记住登录
  const savedAccount = localStorage.getItem('rememberedAccount')
  if (savedAccount) {
    passwordForm.value.account = savedAccount
    passwordForm.value.rememberMe = true
  }
  
  // 从 sessionStorage 恢复勾选状态（查看协议后返回）
  const agreedStatus = sessionStorage.getItem('agreed_status')
  if (agreedStatus === 'true') {
    console.log('恢复勾选状态')
    agreed.value = true
    // 清除临时状态
    sessionStorage.removeItem('agreed_status')
  }
  
  // 清理旧的 query 参数
  if (route.query.agreed) {
    router.replace({ path: route.path })
  }
})

watch([passwordForm, codeForm, agreed], () => {
  console.log('表单状态更新:', {
    passwordForm: passwordForm.value,
    codeForm: codeForm.value,
    agreed: agreed.value
  })
}, { deep: true })

// 登录方式切换
const switchMethod = (method) => {
  currentMethod.value = method
  console.log('切换登录方式:', method)
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

// 角色选择
const selectRole = (role) => {
  selectedRole.value = role
  console.log('选择角色:', role)
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

// 账号输入验证
const onAccountInput = () => {
  if (passwordForm.value.account) {
    accountError.value = ''
  }
}

// 密码输入验证
const onPasswordInput = () => {
  if (passwordForm.value.password) {
    passwordError.value = ''
  }
}

// 手机号输入验证
const onPhoneInput = () => {
  const phone = codeForm.value.phone
  if (phone.length === 11 && /^1[3-9]\d{9}$/.test(phone)) {
    phoneError.value = ''
  } else if (phone.length > 0) {
    phoneError.value = '请输入正确的手机号'
  }
}

// 切换密码显示
const togglePassword = () => {
  showPassword.value = !showPassword.value
}

// 触摸反馈
const handleTouchStart = (event) => {
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

const onFocus = () => {
  console.log('输入框获得焦点')
}

const onBlur = () => {
  console.log('输入框失去焦点')
}

// 发送验证码
const sendCode = async () => {
  const phone = codeForm.value.phone
  
  if (!phone) {
    phoneError.value = '请输入手机号'
    toast.error('请输入手机号')
    if (elderlyStore.voiceEnabled) {
      elderlyStore.speak('请输入手机号')
    }
    return
  }
  
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    phoneError.value = '请输入正确的手机号'
    toast.error('请输入正确的手机号')
    if (elderlyStore.voiceEnabled) {
      elderlyStore.speak('请输入正确的手机号')
    }
    return
  }
  
  try {
    // 调用发送验证码API
    console.log('发送验证码:', phone)
    toast.success('验证码已发送')
    
    // 开始倒计时
    counting.value = true
    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
        counting.value = false
      }
    }, 1000)
  } catch (error) {
    console.error('发送验证码失败:', error)
    toast.error('发送验证码失败，请重试')
  }
}

// 账号密码登录
const handlePasswordLogin = async () => {
  // 验证
  if (!passwordForm.value.account) {
    accountError.value = '请输入账号'
    toast.error('请输入账号')
    if (elderlyStore.voiceEnabled) {
      elderlyStore.speak('请输入账号')
    }
    return
  }
  
  if (!passwordForm.value.password) {
    passwordError.value = '请输入密码'
    toast.error('请输入密码')
    if (elderlyStore.voiceEnabled) {
      elderlyStore.speak('请输入密码')
    }
    return
  }
  
  if (!agreed.value) {
    toast.error('请先阅读并同意用户协议和隐私政策')
    return
  }
  
  isLoggingIn.value = true
  
  try {
    // SHA-256加密密码
    const encryptedPassword = CryptoJS.SHA256(passwordForm.value.password).toString()
    
    console.log('账号密码登录:', {
      account: passwordForm.value.account,
      role: selectedRole.value
    })
    
    // 调用登录API
    const result = await userStore.passwordLogin({
      account: passwordForm.value.account,
      password: encryptedPassword,
      role: selectedRole.value
    })
    
    if (result.success) {
       loginSuccess.value = true
       
       // 记住登录
       if (passwordForm.value.rememberMe) {
         localStorage.setItem('rememberedAccount', passwordForm.value.account)
       } else {
         localStorage.removeItem('rememberedAccount')
       }
       
       toast.success('登录成功')
       
       if (elderlyStore.voiceEnabled) {
         elderlyStore.speak('登录成功')
       }
       
       const roleHomeMap = {
         'villager': '/home/villager',
         'cadre': '/home/cadre',
         'official': '/home/official',
         'purchaser': '/purchaser',
         'admin': '/home/admin'
       }
       const targetPath = roleHomeMap[selectedRole.value] || '/home/villager'
       
       console.log('账号密码登录跳转到:', targetPath)
       setTimeout(() => {
         router.push(targetPath)
       }, 1500)
    }
  } catch (error) {
    console.error('登录失败:', error)
    toast.error(error.message || '登录失败，请重试')
    
    if (elderlyStore.voiceEnabled) {
      elderlyStore.speak('登录失败')
    }
  } finally {
    isLoggingIn.value = false
  }
}

// 验证码登录
const handleCodeLogin = async () => {
  if (!codeForm.value.phone) {
    phoneError.value = '请输入手机号'
    toast.error('请输入手机号')
    return
  }
  
  if (!codeForm.value.code) {
    toast.error('请输入验证码')
    return
  }
  
  if (!agreed.value) {
    toast.error('请先阅读并同意用户协议和隐私政策')
    return
  }
  
  isLoggingIn.value = true
  
  try {
    console.log('验证码登录:', codeForm.value)
    
    // 调用登录API
    const result = await userStore.codeLogin({
      phone: codeForm.value.phone,
      code: codeForm.value.code,
      role: selectedRole.value
    })
    
      if (result.success) {
        loginSuccess.value = true
        const roleHomeMap = {
          'villager': '/home/villager',
          'cadre': '/home/cadre',
          'official': '/home/official',
          'purchaser': '/purchaser',
          'admin': '/home/admin'
        }
        const targetPath = roleHomeMap[selectedRole.value] || '/home/villager'
        console.log('人脸识别登录跳转到:', targetPath)
        toast.success('识别成功')
        
        if (elderlyStore.voiceEnabled) {
          elderlyStore.speak('识别成功')
        }
        
        setTimeout(() => {
          router.push(targetPath)
        }, 1500)
    }
  } catch (error) {
    console.error('登录失败:', error)
    toast.error(error.message || '登录失败，请重试')
  } finally {
    isLoggingIn.value = false
  }
}

// 人脸识别登录
const handleFaceLogin = async () => {
  if (!agreed.value) {
    toast.error('请先阅读并同意用户协议和隐私政策')
    return
  }
  
  isLoggingIn.value = true
  
  try {
    console.log('人脸识别登录')
    
    // 调用人脸识别登录API
    const result = await userStore.faceLogin({
      role: selectedRole.value
    })
    
      if (result.success) {
        loginSuccess.value = true
        toast.success('识别成功')
        
        if (elderlyStore.voiceEnabled) {
          elderlyStore.speak('识别成功')
        }
        
        const roleHomeMap = {
          'villager': '/home/villager',
          'cadre': '/home/cadre',
          'official': '/home/official',
          'purchaser': '/purchaser',
          'admin': '/home/admin'
        }
        const targetPath = roleHomeMap[selectedRole.value] || '/home/villager'
        
        console.log('人脸识别登录跳转到:', targetPath)
        setTimeout(() => {
          router.push(targetPath)
        }, 1500)
      }
    } catch (error) {
      console.error('人脸识别失败:', error)
      toast.error(error.message || '人脸识别失败，请重试')
    } finally {
      isLoggingIn.value = false
    }
  }
const handleWechatLogin = async () => {
  if (!agreed.value) {
    toast.error('请先阅读并同意用户协议和隐私政策')
    return
  }
  
  isLoggingIn.value = true
  
  try {
    console.log('微信登录')
    
    // 调用微信登录API
    const result = await userStore.wechatLogin({
      role: selectedRole.value
    })
    
    if (result.success) {
      loginSuccess.value = true
      const roleHomeMap = {
        'villager': '/home/villager',
        'cadre': '/home/cadre',
        'official': '/home/official',
        'purchaser': '/purchaser',
        'admin': '/home/admin'
      }
      const targetPath = roleHomeMap[selectedRole.value] || '/home/villager'
      console.log('微信登录跳转到:', targetPath)
      toast.success('登录成功')
      
      if (elderlyStore.voiceEnabled) {
        elderlyStore.speak('登录成功')
      }
      
      setTimeout(() => {
        router.push(targetPath)
      }, 1500)
    }
  } catch (error) {
    console.error('微信登录失败:', error)
    toast.error(error.message || '微信登录失败，请重试')
  } finally {
    isLoggingIn.value = false
  }
}

// 忘记密码
const showForgotPassword = () => {
  router.push('/forgot-password')
}

// 注册
const goToRegister = () => {
  router.push('/register')
}

// 查看协议
const viewAgreement = (type) => {
  console.log('查看协议:', type)
  // 保存当前勾选状态到 sessionStorage
  sessionStorage.setItem('agreed_status', agreed.value ? 'true' : 'false')
  router.push(`/auth/agreement/${type}`)
}
</script>

<style scoped>
.multi-login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  position: relative;
  overflow-x: hidden;
}

.bg-decoration {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.bg-circle-1 {
  width: 300px;
  height: 300px;
  top: -150px;
  right: -150px;
}

.bg-circle-2 {
  width: 200px;
  height: 200px;
  bottom: -100px;
  left: -100px;
}

.bg-circle-3 {
  width: 150px;
  height: 150px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.login-content {
  position: relative;
  z-index: 1;
  max-width: 500px;
  margin: 0 auto;
  padding: 40px 20px;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.logo {
  font-size: 60px;
  margin-bottom: 10px;
}

.title {
  font-size: 32px;
  font-weight: bold;
  color: #fff;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

.login-method-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 30px;
  backdrop-filter: blur(10px);
}

.method-tab {
  flex: 1;
  padding: 12px 8px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: all 0.3s ease;
  font-size: 14px;
}

.method-tab--active {
  background: #fff;
  color: #667eea;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.method-tab-icon {
  font-size: 24px;
}

.method-tab-label {
  font-size: 12px;
  font-weight: 500;
}

.method-tab-label.large-text {
  font-size: 16px;
}

.login-form {
  background: #fff;
  border-radius: 16px;
  padding: 30px 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.role-name {
  font-size: 12px;
  color: #333;
  transition: font-size 0.3s ease;
}

.role-selector {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.login-method-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 30px;
  backdrop-filter: blur(10px);
}

.role-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: transparent;
}

.role-item--active {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.role-icon {
  font-size: 24px;
}

.role-name {
  font-size: 12px;
  color: #333;
}

.large-text {
  font-size: 16px;
}

.form-item {
  margin-bottom: 20px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 0 16px;
  transition: all 0.3s ease;
}

.input-wrapper:focus-within {
  border-color: #667eea;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.input-wrapper--error {
  border-color: #ff4d4f;
}

.input-icon {
  font-size: 20px;
  margin-right: 12px;
}

.form-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 14px 0;
  font-size: 16px;
  outline: none;
  width: 100%;
}

.form-input::placeholder {
  color: #999;
}

.password-input {
  padding-right: 44px;
}

.toggle-password-btn {
  position: absolute;
  right: 16px;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.code-wrapper {
  position: relative;
}

.code-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  padding: 8px 16px;
  background: #667eea;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.code-btn:hover:not(:disabled) {
  background: #5568d3;
}

.code-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.input-error {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #ff4d4f;
  font-size: 14px;
  margin-top: 8px;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.remember-text {
  font-size: 14px;
  color: #666;
}

.forgot-password-btn {
  background: none;
  border: none;
  color: #667eea;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
}

.login-btn {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-btn--loading {
  opacity: 0.8;
}

.login-btn--success {
  background: #52c41a;
}

.btn-loader {
  display: flex;
  align-items: center;
  gap: 8px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.register-link {
  text-align: center;
  margin: 24px 0;
}

.link-text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.link-btn {
  background: none;
  border: none;
  color: #fff;
  font-weight: bold;
  cursor: pointer;
  padding: 0 4px;
  text-decoration: underline;
}

.agreement {
  text-align: center;
}

.agreement-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.custom-checkbox {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: transparent;
}

.custom-checkbox--checked {
  background: #fff;
  border-color: #fff;
}

.checkbox-check {
  color: #667eea;
  font-size: 14px;
  font-weight: bold;
}

.agreement-text {
  color: rgba(255, 255, 255, 0.8);
}

.agreement-link-static {
  color: #667eea;
  font-weight: 500;
  text-decoration: none;
  cursor: default;
}

.agreement-link-static:hover {
  text-decoration: underline;
}

.face-login-container,
.wechat-login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
}

.face-camera,
.wechat-qr {
  width: 200px;
  height: 200px;
  border-radius: 12px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.camera-placeholder,
.qr-placeholder {
  text-align: center;
}

.camera-icon,
.qr-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.camera-text,
.qr-text {
  font-size: 16px;
  color: #333;
  margin: 8px 0;
}

.camera-subtext,
.qr-subtext {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.face-guide {
  position: absolute;
  width: 180px;
  height: 180px;
  border: 2px dashed #667eea;
  border-radius: 50%;
}

.guide-line {
  position: absolute;
  width: 2px;
  height: 20px;
  background: #667eea;
}

.guide-line-1 {
  top: 0;
  left: 50%;
  transform: translateX(-50%);
}

.guide-line-2 {
  top: 50%;
  right: 0;
  transform: translateY(-50%);
}

.guide-line-3 {
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
}

.guide-line-4 {
  top: 50%;
  left: 0;
  transform: translateY(-50%);
}

/* 适老化模式 */
.elderly-mode-active .multi-login-page {
  padding: 30px 20px;
}

.elderly-mode-active .login-content {
  padding: 50px 30px;
}

.elderly-mode-active .title {
  font-size: 40px;
}

.elderly-mode-active .subtitle {
  font-size: 20px;
}

.elderly-mode-active .role-selector {
  gap: 12px;
  margin-bottom: 20px;
}

.elderly-mode-active .role-icon {
  font-size: 32px;
}

.elderly-mode-active .role-name {
  font-size: 16px;
}

.elderly-mode-active .method-tab {
  padding: 16px 12px;
}

.elderly-mode-active .method-tab-icon {
  font-size: 32px;
}

.elderly-mode-active .method-tab-label {
  font-size: 16px;
}

.elderly-mode-active .login-form {
  padding: 40px 30px;
}

.elderly-mode-active .form-input {
  padding: 18px 0;
  font-size: 18px;
}

.elderly-mode-active .login-btn {
  padding: 20px;
  font-size: 22px;
}

.elderly-mode-active .agreement-label {
  font-size: 14px;
}

.elderly-mode-active .custom-checkbox {
  width: 24px;
  height: 24px;
}

@media (max-width: 480px) {
  .role-selector {
    grid-template-columns: repeat(3, 1fr);
  }

  .method-tab {
    padding: 10px 6px;
  }

  .method-tab-label {
    font-size: 11px;
  }
}
</style>
