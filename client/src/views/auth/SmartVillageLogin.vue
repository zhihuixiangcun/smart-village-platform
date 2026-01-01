<template>
  <div class="smart-village-login min-h-screen gradient-bg flex items-center justify-center p-4">
    <!-- 主登录容器 -->
    <div class="w-full max-w-md mx-auto">

      <!-- Logo 和标题区域 -->
      <div class="text-center mb-8 animate-fade-in">
        <div class="inline-block relative">
          <div class="w-24 h-24 mx-auto mb-6 bg-white rounded-3xl shadow-2xl flex items-center justify-center relative overflow-hidden group hover-scale">
            <div class="absolute inset-0 bg-gradient-to-br from-village-primary to-village-purple opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <i class="fas fa-home text-4xl text-village-primary relative z-10"></i>
            <div class="absolute -top-2 -right-2 w-6 h-6 bg-village-accent rounded-full animate-pulse-glow"></div>
          </div>
        </div>

        <h1 class="text-3xl md:text-4xl font-bold text-white mb-2 text-shadow">智慧乡村综合服务平台</h1>
        <p class="text-lg text-white/80 mb-4">数字化村务管理 · 便民服务 · 村务公开</p>
        <div class="flex justify-center gap-2 flex-wrap">
          <span class="px-3 py-1 bg-white/20 rounded-full text-xs text-white glass-morphism">
            <i class="fas fa-users mr-1"></i> 1,234+ 用户
          </span>
          <span class="px-3 py-1 bg-white/20 rounded-full text-xs text-white glass-morphism">
            <i class="fas fa-map-marker-alt mr-1"></i> 56+ 村庄
          </span>
          <span class="px-3 py-1 bg-white/20 rounded-full text-xs text-white glass-morphism">
            <i class="fas fa-star mr-1"></i> 98% 满意度
          </span>
        </div>
      </div>

      <!-- 登录方式选择 -->
      <div class="glass-morphism rounded-3xl p-8 shadow-2xl animate-slide-up">

        <!-- 登录方式切换标签 -->
        <div class="flex mb-6 bg-white/10 rounded-2xl p-1">
          <button
            @click="switchLoginMode('password')"
            :class="[
              'flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300',
              currentLoginMode === 'password'
                ? 'bg-white/20 text-white'
                : 'text-white/70 hover:text-white'
            ]"
          >
            <i class="fas fa-key mr-2"></i>密码登录
          </button>
          <button
            @click="switchLoginMode('face')"
            :class="[
              'flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300',
              currentLoginMode === 'face'
                ? 'bg-white/20 text-white'
                : 'text-white/70 hover:text-white'
            ]"
          >
            <i class="fas fa-smile mr-2"></i>人脸登录
          </button>
          <button
            @click="switchLoginMode('voice')"
            :class="[
              'flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300',
              currentLoginMode === 'voice'
                ? 'bg-white/20 text-white'
                : 'text-white/70 hover:text-white'
            ]"
          >
            <i class="fas fa-microphone mr-2"></i>语音登录
          </button>
        </div>

        <!-- 密码登录表单 -->
        <div v-show="currentLoginMode === 'password'" class="space-y-5">
          <!-- 用户类型选择 -->
          <div class="mb-6">
            <label class="block text-white/80 text-sm font-medium mb-3">登录身份</label>
            <div class="grid grid-cols-3 gap-3">
              <label v-for="type in userTypes" :key="type.value" class="cursor-pointer">
                <input
                  type="radio"
                  name="userType"
                  :value="type.value"
                  v-model="loginForm.userType"
                  class="sr-only peer"
                >
                <div
                  :class="[
                    'p-3 rounded-xl text-center transition-all',
                    loginForm.userType === type.value
                      ? 'bg-white/20 bg-village-primary/30 ring-2 ring-white/50'
                      : 'bg-white/10 text-white hover:bg-white/15'
                  ]"
                >
                  <i :class="type.icon + ' text-lg mb-1'"></i>
                  <div class="text-xs">{{ type.label }}</div>
                </div>
              </label>
            </div>
          </div>

          <!-- 村庄选择 -->
          <div class="mb-5">
            <label class="block text-white/80 text-sm font-medium mb-2">所属村庄</label>
            <select
              v-model="loginForm.villageId"
              class="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
            >
              <option value="" class="bg-gray-800">请选择村庄</option>
              <option
                v-for="village in villages"
                :key="village.id"
                :value="village.id"
                class="bg-gray-800"
              >
                {{ village.name }}
              </option>
            </select>
          </div>

          <!-- 手机号输入 -->
          <div>
            <label class="block text-white/80 text-sm font-medium mb-2">手机号码</label>
            <div class="relative">
              <input
                v-model="loginForm.phone"
                type="tel"
                maxlength="11"
                placeholder="请输入11位手机号"
                @input="validatePhone"
                class="w-full px-4 py-3 pl-12 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
              >
              <i class="fas fa-phone absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60"></i>
            </div>
            <p v-if="errors.phone" class="text-red-300 text-xs mt-1">{{ errors.phone }}</p>
          </div>

          <!-- 密码输入 -->
          <div>
            <label class="block text-white/80 text-sm font-medium mb-2">登录密码</label>
            <div class="relative">
              <input
                v-model="loginForm.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入密码"
                class="w-full px-4 py-3 pl-12 pr-12 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
              >
              <i class="fas fa-lock absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60"></i>
              <button
                type="button"
                @click="togglePassword"
                class="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
              >
                <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
              </button>
            </div>
            <p v-if="errors.password" class="text-red-300 text-xs mt-1">{{ errors.password }}</p>
          </div>

          <!-- 记住登录和忘记密码 -->
          <div class="flex items-center justify-between">
            <label class="flex items-center text-white/80">
              <input
                type="checkbox"
                v-model="loginForm.remember"
                class="mr-2 rounded border-white/30 bg-white/10 focus:ring-2 focus:ring-white/50"
              >
              <span class="text-sm">记住登录</span>
            </label>
            <button
              @click="showForgotPassword = true"
              class="text-sm text-white/80 hover:text-white transition-colors"
            >
              忘记密码？
            </button>
          </div>

          <!-- 登录按钮 -->
          <button
            @click="handlePasswordLogin"
            :disabled="!canLogin || loading"
            class="w-full py-4 bg-gradient-to-r from-village-primary to-village-purple text-white rounded-xl font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-white/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <span v-if="loading">
              <i class="fas fa-spinner fa-spin mr-2"></i>
              登录中<span class="loading-dots"></span>
            </span>
            <span v-else>
              <i class="fas fa-sign-in-alt mr-2"></i>立即登录
            </span>
          </button>

          <!-- 安全提示 -->
          <div class="flex items-center justify-center text-white/60 text-xs">
            <i class="fas fa-shield-alt mr-2"></i>
            <span>安全加密传输，保护您的隐私</span>
          </div>
        </div>

        <!-- 人脸登录区域 -->
        <div v-show="currentLoginMode === 'face'" class="space-y-5">
          <div class="text-center py-8">
            <div class="w-64 h-64 mx-auto mb-6 relative">
              <video
                ref="faceVideo"
                class="w-full h-full rounded-2xl bg-gray-900 object-cover"
                autoplay
              ></video>
              <canvas ref="faceCanvas" class="hidden"></canvas>
              <div v-show="!faceScanning" class="absolute inset-0 flex items-center justify-center">
                <div class="text-center text-white">
                  <div class="w-32 h-32 mx-auto mb-4 border-4 border-dashed border-white/50 rounded-full flex items-center justify-center">
                    <i class="fas fa-user text-4xl text-white/50"></i>
                  </div>
                  <p class="text-lg font-medium">请将面部对准摄像头</p>
                  <p class="text-sm text-white/60 mt-2">保持光线充足，面部清晰可见</p>
                </div>
              </div>
              <div v-show="faceScanning" class="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
                <div class="text-center text-white">
                  <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                  <p class="text-lg">正在识别中<span class="loading-dots"></span></p>
                </div>
              </div>
            </div>

            <div class="flex gap-4 justify-center">
              <button
                @click="startFaceScan"
                :disabled="faceScanning"
                class="px-6 py-3 bg-gradient-to-r from-village-primary to-village-purple text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50"
              >
                <i class="fas fa-camera mr-2"></i>开始扫描
              </button>
              <button
                @click="switchLoginMode('password')"
                class="px-6 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-all duration-300"
              >
                <i class="fas fa-arrow-left mr-2"></i>返回
              </button>
            </div>
          </div>
        </div>

        <!-- 语音登录区域 -->
        <div v-show="currentLoginMode === 'voice'" class="space-y-5">
          <div class="text-center py-8">
            <div class="w-32 h-32 mx-auto mb-6 relative">
              <button
                @click="toggleVoiceRecording"
                :class="[
                  'w-full h-full rounded-full flex items-center justify-center transition-all duration-300',
                  isRecording
                    ? 'bg-gradient-to-r from-village-pink to-village-purple animate-pulse-glow'
                    : 'bg-gradient-to-r from-village-pink to-village-purple hover:shadow-lg transform hover:scale-105'
                ]"
              >
                <i :class="[
                  'text-4xl text-white',
                  isRecording ? 'fas fa-stop' : 'fas fa-microphone'
                ]"></i>
              </button>
              <div v-show="isRecording" class="absolute inset-0 rounded-full border-4 border-village-pink animate-pulse"></div>
            </div>

            <div class="mb-6">
              <h3 class="text-white text-lg font-medium mb-2">语音登录</h3>
              <p class="text-white/60 text-sm">请说出您的手机号和姓名</p>
              <p class="text-white/60 text-xs mt-1">
                支持方言识别：
                <span class="text-village-accent">{{ currentLanguage.name }}</span>
              </p>
            </div>

            <div v-if="voiceResult.text" class="mb-6 p-4 bg-white/10 rounded-xl">
              <p class="text-white text-sm">识别结果：<span class="font-medium">{{ voiceResult.text }}</span></p>
            </div>

            <div class="flex gap-4 justify-center">
              <button
                @click="processVoiceLogin"
                :disabled="!voiceResult.text || voiceProcessing"
                class="px-6 py-3 bg-gradient-to-r from-village-pink to-village-purple text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50"
              >
                <i v-if="voiceProcessing" class="fas fa-spinner fa-spin mr-2"></i>
                <i v-else class="fas fa-check mr-2"></i>
                {{ voiceProcessing ? '处理中...' : '确认登录' }}
              </button>
              <button
                @click="switchLoginMode('password')"
                class="px-6 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-all duration-300"
              >
                <i class="fas fa-arrow-left mr-2"></i>返回
              </button>
            </div>
          </div>
        </div>

        <!-- 快速功能 -->
        <div class="mt-8 pt-6 border-t border-white/20">
          <div class="flex justify-around">
            <button
              @click="handleRegister"
              class="flex flex-col items-center text-white/60 hover:text-white transition-colors"
            >
              <div class="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-2 hover:bg-white/20 transition-colors">
                <i class="fas fa-user-plus text-lg"></i>
              </div>
              <span class="text-xs">注册账号</span>
            </button>
            <button
              @click="showHelpModal = true"
              class="flex flex-col items-center text-white/60 hover:text-white transition-colors"
            >
              <div class="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-2 hover:bg-white/20 transition-colors">
                <i class="fas fa-question-circle text-lg"></i>
              </div>
              <span class="text-xs">使用帮助</span>
            </button>
            <button
              @click="switchLanguage"
              class="flex flex-col items-center text-white/60 hover:text-white transition-colors"
            >
              <div class="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-2 hover:bg-white/20 transition-colors">
                <i class="fas fa-language text-lg"></i>
              </div>
              <span class="text-xs">{{ currentLanguage.name }}</span>
            </button>
            <button
              @click="toggleAccessibility"
              class="flex flex-col items-center text-white/60 hover:text-white transition-colors"
            >
              <div class="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-2 hover:bg-white/20 transition-colors">
                <i class="fas fa-universal-access text-lg"></i>
              </div>
              <span class="text-xs">无障碍</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 底部信息 -->
      <div class="text-center mt-8 text-white/60 text-sm">
        <p>© 2024 智慧乡村综合服务平台 v2.0</p>
        <div class="mt-2 flex justify-center gap-4">
          <a href="#" class="hover:text-white transition-colors">隐私政策</a>
          <a href="#" class="hover:text-white transition-colors">服务条款</a>
          <a href="#" class="hover:text-white transition-colors">技术支持</a>
        </div>
      </div>
    </div>

    <!-- 忘记密码弹窗 -->
    <div v-if="showForgotPassword" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div class="glass-morphism rounded-2xl p-6 w-full max-w-md">
        <h3 class="text-xl font-bold text-white mb-4">找回密码</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-white/80 text-sm font-medium mb-2">手机号码</label>
            <input
              v-model="resetForm.phone"
              type="tel"
              placeholder="请输入注册手机号"
              class="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
          </div>
          <div>
            <label class="block text-white/80 text-sm font-medium mb-2">验证码</label>
            <div class="flex gap-2">
              <input
                v-model="resetForm.verifyCode"
                type="text"
                placeholder="请输入验证码"
                class="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
              >
              <button
                @click="sendVerifyCode"
                :disabled="codeCountdown > 0"
                class="px-4 py-3 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 transition-colors disabled:opacity-50"
              >
                {{ codeCountdown > 0 ? `${codeCountdown}s` : '获取验证码' }}
              </button>
            </div>
          </div>
          <div>
            <label class="block text-white/80 text-sm font-medium mb-2">新密码</label>
            <input
              v-model="resetForm.newPassword"
              type="password"
              placeholder="请输入新密码"
              class="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button
            @click="showForgotPassword = false"
            class="flex-1 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors"
          >
            取消
          </button>
          <button
            @click="handleResetPassword"
            class="flex-1 py-3 bg-gradient-to-r from-village-primary to-village-purple text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            确认重置
          </button>
        </div>
      </div>
    </div>

    <!-- 帮助弹窗 -->
    <div v-if="showHelpModal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div class="glass-morphism rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
        <h3 class="text-xl font-bold text-white mb-4">使用帮助</h3>
        <div class="space-y-4 text-white/80">
          <div class="bg-white/10 rounded-xl p-4">
            <h4 class="font-medium text-white mb-2">
              <i class="fas fa-key mr-2 text-village-primary"></i>默认密码
            </h4>
            <p class="text-sm">首次登录密码为手机号后6位数字</p>
          </div>
          <div class="bg-white/10 rounded-xl p-4">
            <h4 class="font-medium text-white mb-2">
              <i class="fas fa-smile mr-2 text-village-pink"></i>人脸登录
            </h4>
            <p class="text-sm">请先注册人脸信息，确保光线充足，面部清晰可见</p>
          </div>
          <div class="bg-white/10 rounded-xl p-4">
            <h4 class="font-medium text-white mb-2">
              <i class="fas fa-microphone mr-2 text-village-purple"></i>语音登录
            </h4>
            <p class="text-sm">支持多种方言识别，请清晰说出手机号和姓名</p>
          </div>
          <div class="bg-white/10 rounded-xl p-4">
            <h4 class="font-medium text-white mb-2">
              <i class="fas fa-users mr-2 text-village-secondary"></i>功能介绍
            </h4>
            <p class="text-sm">提供村务管理、便民服务、资料收集、数据统计等功能</p>
          </div>
          <div class="bg-white/10 rounded-xl p-4">
            <h4 class="font-medium text-white mb-2">
              <i class="fas fa-headset mr-2 text-village-accent"></i>技术支持
            </h4>
            <p class="text-sm">如遇问题请联系村委管理员或拨打客服热线：400-888-8888</p>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button
            @click="showHelpModal = false"
            class="flex-1 py-3 bg-gradient-to-r from-village-primary to-village-purple text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

// 如果用户已登录，重定向到首页
if (userStore.isLoggedIn) {
  router.replace('/village/management')
}

// 响应式数据
const currentLoginMode = ref('password')
const loading = ref(false)
const showPassword = ref(false)
const showForgotPassword = ref(false)
const showHelpModal = ref(false)

// 人脸识别
const faceScanning = ref(false)
const mediaStream = ref(null)
const faceVideo = ref(null)
const faceCanvas = ref(null)

// 语音识别
const isRecording = ref(false)
const voiceProcessing = ref(false)
const voiceResult = reactive({ text: '' })
const voiceRecognition = ref(null)
const currentLanguageIndex = ref(0)

// 验证码倒计时
const codeCountdown = ref(0)

// 用户类型
const userTypes = [
  { value: 'villager', label: '村民', icon: 'fas fa-user' },
  { value: 'committee', label: '村委', icon: 'fas fa-user-tie' },
  { value: 'admin', label: '管理员', icon: 'fas fa-user-shield' }
]

// 语言配置
const languages = ref([
  { code: 'zh-CN', name: '普通话' },
  { code: 'yue', name: '粤语' },
  { code: 'nan', name: '闽南语' },
  { code: 'hakka', name: '客家话' },
  { code: 'sichuan', name: '四川话' }
])

const currentLanguage = computed(() => languages.value[currentLanguageIndex.value])

// 村庄数据
const villages = ref([
  { id: 'xf001', name: '幸福村' },
  { id: 'mz002', name: '民主村' },
  { id: 'wm003', name: '文明村' },
  { id: 'fh004', name: '繁荣村' },
  { id: 'xy005', name: '希望村' }
])

// 登录表单
const loginForm = reactive({
  phone: '',
  password: '',
  userType: 'villager',
  villageId: '',
  remember: false
})

// 重置密码表单
const resetForm = reactive({
  phone: '',
  verifyCode: '',
  newPassword: ''
})

// 错误信息
const errors = reactive({
  phone: '',
  password: ''
})

// 计算属性
const canLogin = computed(() => {
  return loginForm.phone.length === 11 &&
         loginForm.password.length > 0 &&
         loginForm.userType &&
         loginForm.villageId &&
         !Object.values(errors).some(error => error !== '')
})

// 初始化
onMounted(async () => {
  await initializeApp()
})

onUnmounted(() => {
  // 清理资源
  stopCamera()
  stopVoiceRecording()
})

async function initializeApp() {
  // 初始化语音识别
  initializeVoiceRecognition()

  // 加载保存的凭据
  loadRememberedCredentials()

  // 检查浏览器兼容性
  checkBrowserCompatibility()
}

function initializeVoiceRecognition() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    voiceRecognition.value = new SpeechRecognition()

    voiceRecognition.value.continuous = false
    voiceRecognition.value.interimResults = true
    voiceRecognition.value.maxAlternatives = 1

    voiceRecognition.value.onresult = handleVoiceResult
    voiceRecognition.value.onerror = handleVoiceError
    voiceRecognition.value.onend = handleVoiceEnd

    console.log('语音识别初始化成功')
  } else {
    console.warn('浏览器不支持语音识别功能')
  }
}

function switchLoginMode(mode) {
  currentLoginMode.value = mode

  // 特殊处理
  if (mode === 'face') {
    nextTick(() => {
      initializeFaceRecognition()
    })
  } else {
    stopCamera()
    stopVoiceRecording()
  }
}

function validatePhone() {
  const phone = loginForm.phone.trim()
  if (!phone) {
    errors.phone = '请输入手机号'
  } else if (!/^1[3-9]\d{9}$/.test(phone)) {
    errors.phone = '请输入正确的11位手机号'
  } else {
    errors.phone = ''
  }
}

async function handlePasswordLogin() {
  // 表单验证
  validatePhone()
  if (loginForm.password.length < 6) {
    errors.password = '密码长度不能少于6位'
    return
  } else {
    errors.password = ''
  }

  if (!canLogin.value) {
    return
  }

  loading.value = true

  try {
    // 调用登录API
    const result = await userStore.login({
      phone: loginForm.phone,
      password: loginForm.password,
      userType: loginForm.userType,
      villageId: loginForm.villageId,
      remember: loginForm.remember
    })

    if (result.success) {
      // 记住登录信息
      if (loginForm.remember) {
        saveCredentials()
      } else {
        clearSavedCredentials()
      }

      // 显示成功消息
      showToast('登录成功！正在跳转...', 'success')

      // 延迟跳转
      setTimeout(() => {
        redirectToDashboard(result.user)
      }, 1500)

    } else {
      showToast(result.message || '登录失败，请检查账号密码', 'error')
    }

  } catch (error) {
    console.error('登录错误:', error)
    showToast('网络异常，请稍后重试', 'error')
  } finally {
    loading.value = false
  }
}

async function initializeFaceRecognition() {
  try {
    const video = faceVideo.value
    if (!video) return

    mediaStream.value = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    })

    video.srcObject = mediaStream.value

    console.log('摄像头初始化成功')
  } catch (error) {
    console.error('摄像头初始化失败:', error)
    showToast('无法访问摄像头，请检查权限设置', 'error')
  }
}

async function startFaceScan() {
  const overlay = faceVideo.value
  const scanning = faceScanning.value
  const canvas = faceCanvas.value

  if (!overlay || !canvas) return

  try {
    faceScanning.value = true

    // 获取当前帧
    const ctx = canvas.getContext('2d')
    canvas.width = overlay.videoWidth
    canvas.height = overlay.videoHeight
    ctx.drawImage(overlay, 0, 0)

    // 转换为Base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8)

    // 调用人脸识别API
    const result = await callFaceRecognitionAPI({ image: imageData })

    if (result.success) {
      showToast('人脸识别成功！', 'success')

      // 保存登录信息
      localStorage.setItem('userToken', result.token)
      localStorage.setItem('userInfo', JSON.stringify(result.user))

      setTimeout(() => {
        redirectToDashboard(result.user)
      }, 1500)
    } else {
      showToast(result.message || '人脸识别失败，请重试', 'error')
    }

  } catch (error) {
    console.error('人脸扫描错误:', error)
    showToast('人脸扫描失败，请重试', 'error')
  } finally {
    faceScanning.value = false
  }
}

function toggleVoiceRecording() {
  if (isRecording.value) {
    stopVoiceRecording()
  } else {
    startVoiceRecording()
  }
}

function startVoiceRecording() {
  if (!voiceRecognition.value) {
    showToast('浏览器不支持语音识别功能', 'error')
    return
  }

  isRecording.value = true

  try {
    voiceRecognition.value.lang = currentLanguage.value.code === 'zh-CN' ? 'zh-CN' : 'zh'
    voiceRecognition.value.start()
    console.log('语音识别已启动')
  } catch (error) {
    console.error('语音识别启动失败:', error)
    stopVoiceRecording()
  }
}

function stopVoiceRecording() {
  if (voiceRecognition.value && isRecording.value) {
    voiceRecognition.value.stop()
  }
  isRecording.value = false
}

function handleVoiceResult(event) {
  const results = event.results
  let transcript = ''

  for (let i = event.resultIndex; i < results.length; i++) {
    transcript += results[i][0].transcript
  }

  if (results[0].isFinal) {
    voiceResult.text = transcript
  }
}

function handleVoiceError(event) {
  console.error('语音识别错误:', event.error)
  let errorMessage = '语音识别失败'

  switch (event.error) {
    case 'no-speech':
      errorMessage = '未检测到语音，请重试'
      break
    case 'audio-capture':
      errorMessage = '无法访问麦克风'
      break
    case 'not-allowed':
      errorMessage = '麦克风权限被拒绝'
      break
    case 'network':
      errorMessage = '网络错误，请检查连接'
      break
  }

  showToast(errorMessage, 'error')
  stopVoiceRecording()
}

function handleVoiceEnd() {
  if (isRecording.value) {
    stopVoiceRecording()
  }
}

async function processVoiceLogin() {
  if (!voiceResult.text) {
    showToast('未识别到有效语音，请重试', 'error')
    return
  }

  voiceProcessing.value = true

  try {
    const result = await callVoiceLoginAPI({
      voiceText: voiceResult.text,
      language: currentLanguage.value.code
    })

    if (result.success) {
      showToast('语音登录成功！', 'success')

      localStorage.setItem('userToken', result.token)
      localStorage.setItem('userInfo', JSON.stringify(result.user))

      setTimeout(() => {
        redirectToDashboard(result.user)
      }, 1500)
    } else {
      showToast(result.message || '语音登录失败，请重试', 'error')
    }

  } catch (error) {
    console.error('语音登录错误:', error)
    showToast('语音登录处理失败，请重试', 'error')
  } finally {
    voiceProcessing.value = false
  }
}

function togglePassword() {
  showPassword.value = !showPassword.value
}

function switchLanguage() {
  currentLanguageIndex.value = (currentLanguageIndex.value + 1) % languages.value.length
  showToast(`已切换到${currentLanguage.value.name}模式`, 'success')
}

function toggleAccessibility() {
  document.body.classList.toggle('text-2xl')
  document.body.classList.toggle('contrast-more')

  showToast('无障碍模式已' + (document.body.classList.contains('text-2xl') ? '开启' : '关闭'), 'success')
}

async function sendVerifyCode() {
  const phone = resetForm.phone.trim()

  if (!phone || phone.length !== 11) {
    showToast('请输入正确的手机号', 'error')
    return
  }

  try {
    const result = await callSendCodeAPI({ phone })

    if (result.success) {
      showToast('验证码已发送', 'success')
      startCodeCountdown()
    } else {
      showToast(result.message || '发送失败，请重试', 'error')
    }

  } catch (error) {
    console.error('发送验证码错误:', error)
    showToast('发送失败，请重试', 'error')
  }
}

function startCodeCountdown() {
  codeCountdown.value = 60
  const timer = setInterval(() => {
    codeCountdown.value--
    if (codeCountdown.value <= 0) {
      clearInterval(timer)
    }
  }, 1000)
}

async function handleResetPassword() {
  const { phone, verifyCode, newPassword } = resetForm

  if (!phone || !verifyCode || !newPassword) {
    showToast('请填写完整信息', 'error')
    return
  }

  try {
    const result = await callResetPasswordAPI({
      phone,
      code: verifyCode,
      password: newPassword
    })

    if (result.success) {
      showToast('密码重置成功', 'success')
      showForgotPassword.value = false

      // 清空表单
      Object.assign(resetForm, {
        phone: '',
        verifyCode: '',
        newPassword: ''
      })
    } else {
      showToast(result.message || '重置失败，请重试', 'error')
    }

  } catch (error) {
    console.error('重置密码错误:', error)
    showToast('重置失败，请重试', 'error')
  }
}

function handleRegister() {
  showToast('请联系村委管理员进行账号注册', 'info')
}

function showToast(message, type = 'info') {
  // 使用Element Plus的Message组件或其他toast库
  console.log(`[${type.toUpperCase()}] ${message}`)

  // 简单的toast实现
  const toast = document.createElement('div')
  toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 max-w-sm`

  switch (type) {
    case 'success':
      toast.classList.add('bg-green-500')
      toast.innerHTML = `<i class="fas fa-check-circle mr-2"></i>${message}`
      break
    case 'error':
      toast.classList.add('bg-red-500')
      toast.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i>${message}`
      break
    default:
      toast.classList.add('bg-blue-500')
      toast.innerHTML = `<i class="fas fa-info-circle mr-2"></i>${message}`
  }

  document.body.appendChild(toast)

  setTimeout(() => {
    toast.style.opacity = '0'
    setTimeout(() => {
      document.body.removeChild(toast)
    }, 300)
  }, 3000)
}

function stopCamera() {
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach(track => track.stop())
    mediaStream.value = null
  }
}

function saveCredentials() {
  const credentials = {
    phone: loginForm.phone,
    userType: loginForm.userType,
    villageId: loginForm.villageId,
    timestamp: Date.now()
  }
  localStorage.setItem('rememberedCredentials', JSON.stringify(credentials))
}

function loadRememberedCredentials() {
  try {
    const saved = localStorage.getItem('rememberedCredentials')
    if (saved) {
      const credentials = JSON.parse(saved)
      Object.assign(loginForm, {
        phone: credentials.phone || '',
        userType: credentials.userType || 'villager',
        villageId: credentials.villageId || '',
        remember: true
      })
    }
  } catch (error) {
    console.error('加载凭据失败:', error)
  }
}

function clearSavedCredentials() {
  localStorage.removeItem('rememberedCredentials')
}

function redirectToDashboard(user) {
  const redirectMap = {
    villager: '/village/management',
    committee: '/village/committee',
    admin: '/dashboard'
  }

  const redirectUrl = redirectMap[user.userType] || '/dashboard'
  router.push(redirectUrl)
}

function checkBrowserCompatibility() {
  const requiredFeatures = [
    'localStorage',
    'fetch',
    'Promise',
    'URLSearchParams'
  ]

  const missingFeatures = requiredFeatures.filter(feature => !(feature in window))

  if (missingFeatures.length > 0) {
    showToast('您的浏览器版本过低，请升级到最新版本', 'error')
    return false
  }

  return true
}

// API调用函数（示例实现）
async function callFaceRecognitionAPI(data) {
  // 模拟API调用
  await new Promise(resolve => setTimeout(resolve, 2000))

  return {
    success: true,
    token: 'face_token_' + Date.now(),
    user: {
      id: 'face_user',
      phone: '13800138000',
      userType: 'villager',
      villageId: 'xf001',
      name: '人脸识别用户'
    }
  }
}

async function callVoiceLoginAPI(data) {
  await new Promise(resolve => setTimeout(resolve, 1500))

  return {
    success: true,
    token: 'voice_token_' + Date.now(),
    user: {
      id: 'voice_user',
      phone: '13900139000',
      userType: 'committee',
      villageId: 'xf001',
      name: '语音登录用户'
    }
  }
}

async function callSendCodeAPI(data) {
  await new Promise(resolve => setTimeout(resolve, 500))
  return { success: true }
}

async function callResetPasswordAPI(data) {
  await new Promise(resolve => setTimeout(resolve, 800))
  return { success: true }
}
</script>

<style scoped>
/* 自定义样式 */
.gradient-bg {
  background: linear-gradient(-45deg, #667eea, #764ba2, #f093fb, #f5576c, #4facfe);
  background-size: 400% 400%;
  animation: gradientXY 15s ease infinite;
}

.glass-morphism {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.text-shadow {
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.hover-scale {
  transition: transform 0.3s ease;
}

.hover-scale:hover {
  transform: scale(1.05);
}

.loading-dots::after {
  content: '';
  animation: dots 1.5s steps(5, end) infinite;
}

@keyframes gradientXY {
  0%, 100% { background-position: 0% 0%; }
  25% { background-position: 100% 0%; }
  50% { background-position: 100% 100%; }
  75% { background-position: 0% 100%; }
}

@keyframes dots {
  0%, 20% { content: ''; }
  40% { content: '.'; }
  60% { content: '..'; }
  80%, 100% { content: '...'; }
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
  50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.8); }
}

@keyframes slideUp {
  0% { transform: translateY(30px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

.animate-fade-in {
  animation: fadeIn 1s ease-out;
}

.animate-slide-up {
  animation: slideUp 0.5s ease-out;
}

.animate-pulse-glow {
  animation: pulseGlow 3s ease-in-out infinite;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .max-w-md {
    max-width: 100%;
  }
}

/* 无障碍支持 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* 自定义颜色变量 */
:root {
  --village-primary: #2563eb;
  --village-secondary: #10b981;
  --village-accent: #f59e0b;
  --village-danger: #ef4444;
  --village-purple: #8b5cf6;
  --village-pink: #ec4899;
}
</style>