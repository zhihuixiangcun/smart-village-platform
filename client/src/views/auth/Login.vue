<template>
  <div class="login-container">
    <!-- 动态背景 -->
    <div class="animated-bg">
      <div class="floating-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
        <div class="shape shape-4"></div>
        <div class="shape shape-5"></div>
      </div>
    </div>

    <!-- 顶部Logo -->
    <div class="logo-section">
      <div class="logo-wrapper">
        <img src="/village-icon.svg" alt="智慧乡村" class="logo" />
        <div class="logo-glow"></div>
      </div>
      <h1 class="app-title">智慧村务管理系统</h1>
      <p class="app-subtitle">数字化村务管理平台</p>
      <div class="version-tag">v2.0</div>
    </div>

    <!-- 登录表单 -->
    <van-cell-group inset class="login-form form-card">
      <div class="form-header">
        <span class="form-title">登录账号</span>
        <div class="form-indicator"></div>
      </div>

      <van-field
        v-model="loginForm.phone"
        label="手机号"
        placeholder="请输入11位手机号"
        :border="false"
        type="tel"
        maxlength="11"
        clearable
        :class="{ 'field-focused': phoneFocused }"
        @focus="phoneFocused = true"
        @blur="phoneFocused = false"
      >
        <template #left-icon>
          <van-icon name="phone-o" class="field-icon" />
        </template>
      </van-field>

      <van-field
        v-model="loginForm.password"
        label="密码"
        placeholder="请输入登录密码"
        :border="false"
        :type="showPassword ? 'text' : 'password'"
        clearable
        :class="{ 'field-focused': passwordFocused }"
        @focus="passwordFocused = true"
        @blur="passwordFocused = false"
      >
        <template #left-icon>
          <van-icon name="lock" class="field-icon" />
        </template>
        <template #button>
          <van-icon
            :name="showPassword ? 'eye-o' : 'closed-eye'"
            class="password-toggle"
            @click="togglePassword"
          />
        </template>
      </van-field>
    </van-cell-group>

    <!-- 快速选择村庄（首次登录时显示） -->
    <van-cell-group inset v-if="villages.length > 1" class="village-selector form-card">
      <van-field
        v-model="selectedVillageName"
        label="选择村庄"
        placeholder="请选择所属村庄"
        readonly
        is-link
        @click="showVillagePicker = true"
        :class="{ 'field-focused': villageFocused }"
        @focus="villageFocused = true"
        @blur="villageFocused = false"
      >
        <template #left-icon>
          <van-icon name="location-o" class="field-icon" />
        </template>
      </van-field>
    </van-cell-group>

    <!-- 记住登录和忘记密码 -->
    <div class="login-options">
      <van-checkbox v-model="rememberMe" icon-size="16px" checked-color="#1989fa">
        <span class="remember-text">记住登录</span>
      </van-checkbox>
      <span class="forgot-password" @click="showForgotPassword = true">
        忘记密码？
      </span>
    </div>

    <!-- 登录按钮 -->
    <div class="login-button-container">
      <van-button
        type="primary"
        size="large"
        :loading="loading"
        loading-text="登录中..."
        @click="handleLogin"
        class="login-button"
        :disabled="!canLogin"
      >
        <span v-if="!loading" class="button-text">
          <van-icon name="arrow" />
          立即登录
        </span>
      </van-button>

      <!-- 安全提示 -->
      <div class="security-tip">
        <van-icon name="shield-o" size="12" />
        <span>安全加密传输，保护您的隐私</span>
      </div>
    </div>

    <!-- 快速功能 -->
    <div class="quick-actions">
      <van-divider>
        <span class="divider-text">更多登录方式</span>
      </van-divider>
      <div class="action-buttons">
        <div class="action-item" @click="showRegister = true">
          <div class="action-icon">
            <van-icon name="add-o" />
          </div>
          <span class="action-text">用户注册</span>
        </div>
        <div class="action-item" @click="showFaceLogin = true">
          <div class="action-icon face-icon">
            <van-icon name="smile-o" />
          </div>
          <span class="action-text">人脸登录</span>
        </div>
        <div class="action-item" @click="showHelp = true">
          <div class="action-icon help-icon">
            <van-icon name="question-o" />
          </div>
          <span class="action-text">使用帮助</span>
        </div>
      </div>
    </div>

    <!-- 底部信息 -->
    <div class="footer-info">
      <div class="stats">
        <div class="stat-item">
          <span class="stat-number">1,234</span>
          <span class="stat-label">注册用户</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-number">56</span>
          <span class="stat-label">覆盖村庄</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-number">98%</span>
          <span class="stat-label">满意度</span>
        </div>
      </div>
      <p class="copyright">© 2024 智慧乡村平台 技术支持</p>
    </div>

    <!-- 村庄选择器 -->
    <van-popup v-model:show="showVillagePicker" position="bottom">
      <van-picker
        :columns="villageOptions"
        title="选择村庄"
        @confirm="onVillageConfirm"
        @cancel="showVillagePicker = false"
      />
    </van-popup>

    <!-- 忘记密码弹窗 -->
    <van-popup v-model:show="showForgotPassword" position="center" class="forgot-popup">
      <div class="forgot-form">
        <h3>重置密码</h3>
        <van-field
          v-model="resetForm.phone"
          label="手机号"
          placeholder="请输入注册手机号"
          type="tel"
          maxlength="11"
        />
        <van-field
          v-model="resetForm.verifyCode"
          label="验证码"
          placeholder="请输入验证码"
          type="number"
        >
          <template #button>
            <van-button
              size="small"
              type="primary"
              :disabled="codeCountdown > 0"
              @click="sendVerifyCode"
            >
              {{ codeCountdown > 0 ? `${codeCountdown}s` : '获取验证码' }}
            </van-button>
          </template>
        </van-field>
        <van-field
          v-model="resetForm.newPassword"
          label="新密码"
          placeholder="请输入新密码"
          type="password"
        />
        <div class="popup-buttons">
          <van-button @click="showForgotPassword = false">取消</van-button>
          <van-button type="primary" @click="handleResetPassword">确认重置</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 注册弹窗 -->
    <van-popup v-model:show="showRegister" position="center" class="register-popup">
      <div class="register-form">
        <h3>用户注册</h3>
        <van-field
          v-model="registerForm.name"
          label="姓名"
          placeholder="请输入真实姓名"
        />
        <van-field
          v-model="registerForm.phone"
          label="手机号"
          placeholder="请输入手机号"
          type="tel"
          maxlength="11"
        />
        <van-field
          v-model="registerForm.idCard"
          label="身份证号"
          placeholder="请输入身份证号"
          maxlength="18"
        />
        <van-field
          v-model="registerForm.password"
          label="密码"
          placeholder="请设置密码"
          type="password"
        />
        <div class="popup-buttons">
          <van-button @click="showRegister = false">取消</van-button>
          <van-button type="primary" @click="handleRegister">确认注册</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 人脸登录弹窗 -->
    <van-popup v-model:show="showFaceLogin" position="center" class="face-login-popup">
      <div class="face-login-form">
        <h3>人脸登录</h3>
        <div class="face-scanner">
          <video ref="faceVideo" class="face-video" autoplay></video>
          <canvas ref="faceCanvas" class="face-canvas"></canvas>
          <div class="scan-overlay">
            <van-loading v-if="faceScanning" color="#1989fa" />
            <p v-if="!faceScanning">请将面部对准摄像头</p>
          </div>
        </div>
        <div class="popup-buttons">
          <van-button @click="closeFaceLogin">取消</van-button>
          <van-button type="primary" @click="startFaceScan">开始扫描</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 使用帮助弹窗 -->
    <van-popup v-model:show="showHelp" position="center" class="help-popup">
      <div class="help-content">
        <h3>使用帮助</h3>
        <div class="help-item">
          <h4>默认密码</h4>
          <p>首次登录密码为手机号后6位数字</p>
        </div>
        <div class="help-item">
          <h4>快速登录</h4>
          <p>支持人脸识别快速登录，安全便捷</p>
        </div>
        <div class="help-item">
          <h4>功能介绍</h4>
          <p>系统提供资料收集、值班管理、数据统计等功能</p>
        </div>
        <div class="help-item">
          <h4>技术支持</h4>
          <p>如遇问题请联系村委管理员</p>
        </div>
        <div class="popup-buttons">
          <van-button type="primary" @click="showHelp = false">我知道了</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { useUserStore } from '@/stores/user'
import villageUserApi from '@/api/villageUser'

const router = useRouter()
const userStore = useUserStore()

// 如果用户已登录，重定向到首页
if (userStore.isLoggedIn) {
  router.replace('/village/management')
}

// 响应式数据
const loading = ref(false)
const showPassword = ref(false)
const rememberMe = ref(false)
const showVillagePicker = ref(false)
const showForgotPassword = ref(false)
const showRegister = ref(false)
const showFaceLogin = ref(false)
const showHelp = ref(false)

// 字段焦点状态
const phoneFocused = ref(false)
const passwordFocused = ref(false)
const villageFocused = ref(false)

// 村庄数据
const villages = ref([])
const selectedVillageName = ref('')
const villageOptions = ref([])

// 登录表单
const loginForm = reactive({
  phone: '',
  password: '',
  villageId: ''
})

// 计算属性
const canLogin = computed(() => {
  return loginForm.phone.length === 11 && loginForm.password.length > 0
})

// 忘记密码表单
const resetForm = reactive({
  phone: '',
  verifyCode: '',
  newPassword: ''
})

// 注册表单
const registerForm = reactive({
  name: '',
  phone: '',
  idCard: '',
  password: '',
  villageId: ''
})

// 人脸登录
const faceScanning = ref(false)
const faceVideo = ref(null)
const faceCanvas = ref(null)

// 验证码倒计时
const codeCountdown = ref(0)

// 方法
const loadVillages = async () => {
  try {
    // 这里应该调用获取村庄列表的API
    // 暂时使用模拟数据
    villages.value = [
      { id: '1', name: '幸福村', code: 'XFC' },
      { id: '2', name: '民主村', code: 'MZC' },
      { id: '3', name: '文明村', code: 'WMC' }
    ]
    villageOptions.value = villages.value.map(v => v.name)
  } catch (error) {
    console.error('获取村庄列表失败:', error)
  }
}

const onVillageConfirm = (option) => {
  selectedVillageName.value = option
  const village = villages.value.find(v => v.name === option)
  if (village) {
    loginForm.villageId = village.id
  }
  showVillagePicker.value = false
}

const togglePassword = () => {
  showPassword.value = !showPassword.value
}

const handleLogin = async () => {
  // 表单验证
  if (!loginForm.phone) {
    showToast('请输入手机号')
    return
  }
  if (loginForm.phone.length !== 11) {
    showToast('请输入正确的11位手机号')
    return
  }
  if (!loginForm.password) {
    showToast('请输入密码')
    return
  }

  loading.value = true
  try {
    const result = await userStore.login(loginForm)

    if (result.success) {
      showToast({
        type: 'success',
        message: '登录成功！',
        duration: 1500
      })

      // 记住登录状态
      if (rememberMe.value) {
        localStorage.setItem('remember_phone', loginForm.phone)
        localStorage.setItem('remember_me', 'true')
      } else {
        localStorage.removeItem('remember_phone')
        localStorage.removeItem('remember_me')
      }

      // 延迟跳转，让用户看到成功提示
      setTimeout(() => {
        router.replace('/village/management')
      }, 800)
    } else {
      showToast({
        type: 'fail',
        message: result.message || '登录失败，请检查账号密码',
        duration: 2000
      })
    }
  } catch (error) {
    console.error('登录失败:', error)
    showToast({
      type: 'fail',
      message: '网络异常，请稍后重试',
      duration: 2000
    })
  } finally {
    loading.value = false
  }
}

const sendVerifyCode = async () => {
  if (!resetForm.phone) {
    showToast('请输入手机号')
    return
  }

  try {
    // 这里调用发送验证码的API
    showToast('验证码已发送')

    // 开始倒计时
    codeCountdown.value = 60
    const timer = setInterval(() => {
      codeCountdown.value--
      if (codeCountdown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  } catch (error) {
    console.error('发送验证码失败:', error)
    showToast('发送失败，请重试')
  }
}

const handleResetPassword = async () => {
  // 验证表单
  if (!resetForm.phone || !resetForm.verifyCode || !resetForm.newPassword) {
    showToast('请填写完整信息')
    return
  }

  try {
    // 这里调用重置密码的API
    showToast('密码重置成功')
    showForgotPassword.value = false

    // 清空表单
    Object.keys(resetForm).forEach(key => {
      resetForm[key] = ''
    })
  } catch (error) {
    console.error('重置密码失败:', error)
    showToast('重置失败，请重试')
  }
}

const handleRegister = async () => {
  // 验证表单
  const requiredFields = ['name', 'phone', 'idCard', 'password', 'villageId']
  const missingFields = requiredFields.filter(field => !registerForm[field])

  if (missingFields.length > 0) {
    showToast('请填写完整信息')
    return
  }

  try {
    await villageUserApi.register(registerForm)
    showToast('注册成功，请使用手机号后6位登录')
    showRegister.value = false

    // 清空表单
    Object.keys(registerForm).forEach(key => {
      if (key !== 'villageId') registerForm[key] = ''
    })
  } catch (error) {
    console.error('注册失败:', error)
    showToast(error.response?.data?.message || '注册失败')
  }
}

const startFaceScan = async () => {
  try {
    faceScanning.value = true

    // 获取摄像头权限
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    if (faceVideo.value) {
      faceVideo.value.srcObject = stream
    }

    // 这里应该调用人脸识别API
    setTimeout(() => {
      faceScanning.value = false
      showToast('人脸识别登录成功')
      closeFaceLogin()
      router.replace('/village/management')
    }, 3000)
  } catch (error) {
    console.error('人脸识别失败:', error)
    faceScanning.value = false
    showToast('人脸识别失败，请重试')
  }
}

const closeFaceLogin = () => {
  showFaceLogin.value = false
  faceScanning.value = false

  // 关闭摄像头
  if (faceVideo.value && faceVideo.value.srcObject) {
    const stream = faceVideo.value.srcObject
    const tracks = stream.getTracks()
    tracks.forEach(track => track.stop())
  }
}

// 生命周期
onMounted(async () => {
  await loadVillages()

  // 恢复记住的登录信息
  const rememberedPhone = localStorage.getItem('remember_phone')
  const rememberMeFlag = localStorage.getItem('remember_me')

  if (rememberedPhone) {
    loginForm.phone = rememberedPhone
  }

  if (rememberMeFlag === 'true') {
    rememberMe.value = true
  }

  // 添加动画效果
  setTimeout(() => {
    document.querySelector('.logo-section')?.classList.add('animate-in')
  }, 100)

  setTimeout(() => {
    document.querySelector('.login-form')?.classList.add('animate-in')
  }, 300)

  setTimeout(() => {
    document.querySelector('.login-button-container')?.classList.add('animate-in')
  }, 500)
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 20px;
}

/* 动态背景 */
.animated-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  z-index: -2;
}

.floating-shapes {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.shape {
  position: absolute;
  border-radius: 50%;
  opacity: 0.1;
  animation: float 20s infinite ease-in-out;
}

.shape-1 {
  width: 80px;
  height: 80px;
  background: white;
  top: 20%;
  left: 10%;
  animation-delay: 0s;
}

.shape-2 {
  width: 60px;
  height: 60px;
  background: white;
  top: 60%;
  left: 80%;
  animation-delay: 2s;
}

.shape-3 {
  width: 100px;
  height: 100px;
  background: white;
  top: 80%;
  left: 20%;
  animation-delay: 4s;
}

.shape-4 {
  width: 40px;
  height: 40px;
  background: white;
  top: 30%;
  left: 70%;
  animation-delay: 6s;
}

.shape-5 {
  width: 70px;
  height: 70px;
  background: white;
  top: 50%;
  left: 50%;
  animation-delay: 8s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  25% {
    transform: translateY(-30px) rotate(90deg);
  }
  50% {
    transform: translateY(20px) rotate(180deg);
  }
  75% {
    transform: translateY(-20px) rotate(270deg);
  }
}

/* Logo部分 */
.logo-section {
  text-align: center;
  margin-bottom: 40px;
  opacity: 0;
  transform: translateY(-30px);
  transition: all 0.6s ease-out;
}

.logo-section.animate-in {
  opacity: 1;
  transform: translateY(0);
}

.logo-wrapper {
  position: relative;
  display: inline-block;
  margin-bottom: 20px;
}

.logo {
  width: 100px;
  height: 100px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 2;
  transition: transform 0.3s ease;
}

.logo:hover {
  transform: scale(1.05);
}

.logo-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 120px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.3), transparent);
  border-radius: 50%;
  z-index: 1;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.3;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 0.1;
  }
}

.app-title {
  color: white;
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  letter-spacing: 1px;
}

.app-subtitle {
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  margin: 0 0 12px 0;
  font-weight: 300;
}

.version-tag {
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  backdrop-filter: blur(10px);
}

/* 表单卡片 */
.form-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border-radius: 20px;
  overflow: hidden;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.6s ease-out;
}

.form-card.animate-in {
  opacity: 1;
  transform: translateY(0);
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 20px 0;
  margin-bottom: 10px;
}

.form-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.form-indicator {
  width: 40px;
  height: 4px;
  background: linear-gradient(90deg, #1989fa, #06c);
  border-radius: 2px;
}

/* 字段样式 */
.van-field {
  padding: 16px 20px;
  transition: all 0.3s ease;
}

.van-field.field-focused {
  background: rgba(25, 137, 250, 0.05);
}

.field-icon {
  color: #1989fa;
  font-size: 18px;
}

.password-toggle {
  color: #999;
  font-size: 18px;
  cursor: pointer;
  transition: color 0.3s ease;
}

.password-toggle:hover {
  color: #1989fa;
}

/* 选项区域 */
.login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  margin-bottom: 30px;
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.6s ease-out 0.7s forwards;
}

.remember-text {
  color: #666;
  font-size: 14px;
  margin-left: 4px;
}

.forgot-password {
  color: #1989fa;
  font-size: 14px;
  text-decoration: none;
  transition: color 0.3s ease;
}

.forgot-password:hover {
  color: #06c;
}

/* 登录按钮 */
.login-button-container {
  padding: 0 24px;
  margin-bottom: 40px;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.6s ease-out;
}

.login-button-container.animate-in {
  opacity: 1;
  transform: translateY(0);
}

.login-button {
  width: 100%;
  height: 56px;
  background: linear-gradient(135deg, #1989fa, #06c);
  border: none;
  border-radius: 16px;
  font-size: 18px;
  font-weight: 600;
  color: white;
  box-shadow: 0 10px 25px rgba(25, 137, 250, 0.3);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.login-button:before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.6s ease;
}

.login-button:hover:before {
  left: 100%;
}

.login-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 35px rgba(25, 137, 250, 0.4);
}

.login-button:active {
  transform: translateY(0);
}

.login-button:disabled {
  background: #e0e0e0;
  box-shadow: none;
  transform: none;
}

.button-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.security-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 16px;
  color: #999;
  font-size: 12px;
}

/* 快速功能 */
.quick-actions {
  text-align: center;
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.6s ease-out 0.9s forwards;
}

.divider-text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  padding: 0 16px;
}

.action-buttons {
  display: flex;
  justify-content: space-around;
  margin-top: 24px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.action-item:hover {
  transform: translateY(-5px);
}

.action-icon {
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.action-item:hover .action-icon {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.face-icon {
  background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
}

.help-icon {
  background: linear-gradient(135deg, #4ecdc4, #6ee7df);
}

.action-icon .van-icon {
  font-size: 24px;
  color: white;
}

.action-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 500;
}

/* 底部信息 */
.footer-info {
  margin-top: 40px;
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.6s ease-out 1.1s forwards;
}

.stats {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 16px 24px;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 20px;
}

.stat-number {
  font-size: 18px;
  font-weight: 700;
  color: white;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.stat-divider {
  width: 1px;
  height: 30px;
  background: rgba(255, 255, 255, 0.3);
  margin: 0 16px;
}

.copyright {
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  margin: 0;
}

/* 弹窗样式 */
.forgot-popup,
.register-popup,
.face-login-popup,
.help-popup {
  width: 90%;
  max-width: 400px;
  border-radius: 20px;
  overflow: hidden;
}

.forgot-form,
.register-form,
.help-content {
  padding: 32px 24px;
}

.face-login-form {
  padding: 32px 24px;
}

.forgot-form h3,
.register-form h3,
.face-login-form h3,
.help-content h3 {
  text-align: center;
  margin: 0 0 24px 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.popup-buttons {
  display: flex;
  gap: 12px;
  margin-top: 32px;
}

.popup-buttons .van-button {
  flex: 1;
  height: 48px;
  border-radius: 12px;
  font-weight: 500;
}

.face-scanner {
  position: relative;
  width: 240px;
  height: 240px;
  margin: 0 auto 24px;
  border-radius: 20px;
  overflow: hidden;
  background: #f5f5f5;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.face-video,
.face-canvas {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 20px;
}

.scan-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 20px;
  color: white;
  backdrop-filter: blur(5px);
}

.scan-overlay p {
  margin-top: 16px;
  font-size: 16px;
  font-weight: 500;
}

.help-item {
  margin-bottom: 20px;
  padding: 16px;
  background: rgba(25, 137, 250, 0.05);
  border-radius: 12px;
  border-left: 4px solid #1989fa;
}

.help-item h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #333;
  font-weight: 600;
}

.help-item p {
  margin: 0;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

/* 动画 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 375px) {
  .app-title {
    font-size: 24px;
  }

  .action-buttons {
    gap: 20px;
  }

  .stats {
    padding: 12px 16px;
  }

  .stat-item {
    padding: 0 12px;
  }
}
</style>