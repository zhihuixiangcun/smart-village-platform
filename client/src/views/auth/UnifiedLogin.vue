<template>
  <div class="unified-login">
    <!-- 背景装饰 -->
    <div class="background-decoration">
      <div class="decoration-circle circle-1"></div>
      <div class="decoration-circle circle-2"></div>
      <div class="decoration-circle circle-3"></div>
    </div>

    <div class="login-container">
      <!-- 左侧：品牌信息 -->
      <div class="brand-section">
        <div class="brand-content">
          <div class="logo">
            <img src="@/assets/logo.png" alt="智慧乡村" v-if="hasLogo" />
            <el-icon :size="80" color="#ffffff" v-else><OfficeBuilding /></el-icon>
          </div>
          <h1 class="brand-title">智慧乡村综合服务平台</h1>
          <p class="brand-subtitle">Smart Village Comprehensive Service Platform</p>
          <div class="brand-features">
            <div class="feature-item">
              <el-icon><Check /></el-icon>
              <span>一站式便民服务</span>
            </div>
            <div class="feature-item">
              <el-icon><Check /></el-icon>
              <span>村务公开透明</span>
            </div>
            <div class="feature-item">
              <el-icon><Check /></el-icon>
              <span>智能生活助手</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：登录表单 -->
      <div class="login-section">
        <div class="login-content">
          <!-- 角色选择 -->
          <div class="role-selector">
            <div
              v-for="role in roles"
              :key="role.value"
              class="role-item"
              :class="{ active: selectedRole === role.value }"
              @click="selectRole(role.value)"
            >
              <el-icon :size="24">
                <component :is="role.icon" />
              </el-icon>
              <span>{{ role.label }}</span>
            </div>
          </div>

          <!-- 登录标题和注册入口 -->
          <div class="login-header">
            <h2>欢迎登录</h2>
            <p class="login-subtitle">请选择您的身份登录</p>
            <div class="register-link">
              <span>还没有账号？</span>
              <el-link type="primary" @click="goToRegister">立即注册</el-link>
            </div>
          </div>

          <!-- 登录方式选择 -->
          <div class="login-methods">
            <div class="method-tabs">
              <div
                v-for="method in loginMethods"
                :key="method.value"
                class="method-tab"
                :class="{ active: loginMethod === method.value }"
                @click="loginMethod = method.value"
              >
                <el-icon>
                  <component :is="method.icon" />
                </el-icon>
                <span>{{ method.label }}</span>
              </div>
            </div>

<!-- 密码登录 -->
            <el-form
              v-if="loginMethod === 'password' && selectedRole !== 'purchaser'"
              ref="loginFormRef"
              :model="loginForm"
              :rules="loginRules"
              class="login-form"
              @submit.prevent="handlePasswordLogin"
            >
              <el-form-item prop="username">
                <el-input
                  v-model="loginForm.username"
                  :placeholder="getUsernamePlaceholder()"
                  size="large"
                  clearable
                >
                  <template #prefix>
                    <el-icon><User /></el-icon>
                  </template>
                </el-input>
              </el-form-item>

              <el-form-item prop="password">
                <el-input
                  v-model="loginForm.password"
                  type="password"
                  placeholder="请输入密码"
                  size="large"
                  show-password
                  @keyup.enter="handlePasswordLogin"
                >
                  <template #prefix>
                    <el-icon><Lock /></el-icon>
                  </template>
                </el-input>
              </el-form-item>

              <el-form-item>
                <div class="form-footer">
                  <el-checkbox v-model="agreeTerms">我已阅读并同意</el-checkbox>
                  <el-link type="primary" @click="showTermsDialog">《用户协议》</el-link>
                  <span>和</span>
                  <el-link type="primary" @click="showPrivacyDialog">《隐私政策》</el-link>
                </div>
              </el-form-item>

              <el-form-item>
                <el-button
                  type="primary"
                  size="large"
                  :loading="loading"
                  @click="handlePasswordLogin"
                  class="login-button"
                >
                  登录
                </el-button>
              </el-form-item>
            </el-form>

            <!-- 快速测试登录 -->
            <div class="quick-test-login" v-if="selectedRole !== 'purchaser'">
              <el-divider>
                <el-icon><MagicStick /></el-icon>
                快速测试登录
              </el-divider>
              <div class="quick-test-buttons">
                <el-button
                  type="success"
                  size="default"
                  @click="quickTestLogin('admin')"
                  :disabled="selectedRole !== 'admin'"
                  :class="{ 'test-btn-active': selectedRole === 'admin' }"
                  class="test-button"
                >
                  <el-icon><User /></el-icon>
                  <span>管理员</span>
                  <small>testadmin</small>
                </el-button>
                <el-button
                  type="warning"
                  size="default"
                  @click="quickTestLogin('cadre')"
                  :disabled="selectedRole !== 'cadre'"
                  :class="{ 'test-btn-active': selectedRole === 'cadre' }"
                  class="test-button"
                >
                  <el-icon><ChatDotSquare /></el-icon>
                  <span>村委</span>
                  <small>testcadre</small>
                </el-button>
                <el-button
                  type="primary"
                  size="default"
                  @click="quickTestLogin('resident')"
                  :disabled="selectedRole !== 'resident'"
                  :class="{ 'test-btn-active': selectedRole === 'resident' }"
                  class="test-button"
                >
                  <el-icon><UserFilled /></el-icon>
                  <span>村民</span>
                  <small>testresident</small>
                </el-button>
              </div>
              <div class="test-accounts-info">
                <el-alert
                  type="info"
                  :closable="false"
                  show-icon
                >
                  <template #title>
                    <div class="test-info-content">
                      <p><strong>测试账户信息：</strong></p>
                      <ul>
                        <li>管理员: testadmin / Test123456! / 角色: admin</li>
                        <li>村委: testcadre / Cadre123456! / 角色: village_admin</li>
                        <li>村民: testresident / Resident123456! / 角色: resident</li>
                      </ul>
                    </div>
                  </template>
                </el-alert>
              </div>
            </div>

            <!-- 采购商专用登录表单 -->
            <el-form
              v-if="loginMethod === 'password' && selectedRole === 'purchaser'"
              ref="purchaserLoginFormRef"
              :model="purchaserLoginForm"
              :rules="purchaserLoginRules"
              class="login-form"
              @submit.prevent="handlePurchaserLogin"
            >
              <el-form-item prop="phone">
                <el-input
                  v-model="purchaserLoginForm.phone"
                  placeholder="请输入手机号"
                  size="large"
                  clearable
                >
                  <template #prefix>
                    <el-icon><Phone /></el-icon>
                  </template>
                </el-input>
              </el-form-item>

              <el-form-item prop="idCard">
                <el-input
                  v-model="purchaserLoginForm.idCard"
                  placeholder="请输入身份证号"
                  size="large"
                  maxlength="18"
                  clearable
                  @keyup.enter="handlePurchaserLogin"
                >
                  <template #prefix>
                    <el-icon><Postcard /></el-icon>
                  </template>
                </el-input>
              </el-form-item>

              <el-form-item>
                <el-button
                  type="primary"
                  size="large"
                  :loading="loading"
                  @click="handlePurchaserLogin"
                  class="login-button"
                >
                  登录
                </el-button>
              </el-form-item>

              <el-form-item>
                <el-link type="primary" @click="router.push('/auth/registration-wizard')">
                  还没有账号？去注册采购商
                </el-link>
              </el-form-item>
            </el-form>
<!-- 人脸识别登录 -->
            <div v-else-if="loginMethod === 'face'" class="face-login">
              <div class="face-scanner" :class="{ scanning: faceScanning }">
                <video
                  ref="videoRef"
                  class="camera-video"
                  autoplay
                  playsinline
                  muted
                ></video>
                <canvas ref="canvasRef" class="face-canvas" style="display: none;"></canvas>
                <div class="scan-overlay" v-if="faceScanning">
                  <div class="scan-line"></div>
                  <div class="scan-face-frame">
                    <div class="frame-corner top-left"></div>
                    <div class="frame-corner top-right"></div>
                    <div class="frame-corner bottom-left"></div>
                    <div class="frame-corner bottom-right"></div>
                  </div>
                </div>
                <div class="face-placeholder" v-if="!faceScanning">
                  <el-icon :size="80"><UserFilled /></el-icon>
                  <p>点击下方按钮开始人脸识别</p>
                </div>
              </div>
              <el-button
                type="primary"
                size="large"
                :loading="faceScanning"
                @click="startFaceRecognition"
                class="face-button"
              >
                <el-icon v-if="!faceScanning"><Camera /></el-icon>
                {{ faceScanning ? '识别中...' : '开始人脸识别' }}
              </el-button>
            </div>

            <!-- 微信登录 -->
            <div v-else-if="loginMethod === 'wechat'" class="wechat-login">
              <div class="wechat-qr-container">
                <div class="qr-code" v-if="wechatQrCode">
                  <img :src="wechatQrCode" alt="微信扫码登录" />
                  <div class="qr-overlay" v-if="wechatScanned">
                    <el-icon :size="60" color="#67C23A"><SuccessFilled /></el-icon>
                    <p>扫描成功</p>
                  </div>
                  <div class="qr-overlay" v-else-if="wechatExpired">
                    <p>二维码已过期</p>
                    <el-button type="primary" link @click="refreshWechatQr">刷新</el-button>
                  </div>
                </div>
                <div class="qr-loading" v-else>
                  <el-icon class="is-loading" :size="40"><Loading /></el-icon>
                  <p>正在生成二维码...</p>
                </div>
              </div>
              <div class="wechat-tips">
                <el-icon><InfoFilled /></el-icon>
                <span>请使用微信扫描二维码登录</span>
              </div>
            </div>

            <!-- 第三方登录 -->
            <div class="social-login" v-if="loginMethod === 'password'">
              <div class="divider">
                <span>其他登录方式</span>
              </div>
              <div class="social-buttons">
                <el-button
                  circle
                  size="large"
                  @click="loginMethod = 'wechat'"
                  title="微信登录"
                  class="social-button wechat"
                >
                  <el-icon :size="20"><ChatDotRound /></el-icon>
                </el-button>
                <el-button
                  circle
                  size="large"
                  @click="loginMethod = 'face'"
                  title="人脸登录"
                  class="social-button face"
                >
                  <el-icon :size="20"><UserFilled /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 忘记密码弹窗 -->
    <el-dialog
      v-model="showForgotDialog"
      title="忘记密码"
      width="400px"
    >
      <el-form :model="forgotForm" label-width="80px">
        <el-form-item label="手机号">
          <el-input v-model="forgotForm.phone" placeholder="请输入注册手机号" />
        </el-form-item>
        <el-form-item label="验证码">
          <el-input v-model="forgotForm.code">
            <template #append>
              <el-button
                type="primary"
                link
                :disabled="codeCountdown > 0 || codeSending"
                :loading="codeSending"
                @click="sendForgotCode"
              >
                {{ codeCountdown > 0 ? `${codeCountdown}秒后重试` : '获取验证码' }}
              </el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="forgotForm.newPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showForgotDialog = false">取消</el-button>
        <el-button type="primary" @click="handleResetPassword">确定</el-button>
      </template>
    </el-dialog>

    <!-- 用户协议弹窗 -->
    <el-dialog
      v-model="showTermsDialogFlag"
      title="用户协议"
      width="700px"
      :close-on-click-modal="false"
    >
      <div class="terms-content">
        <h3>智慧乡村综合服务平台用户协议</h3>
        <p><strong>欢迎使用智慧乡村综合服务平台！</strong></p>
        <p>为使用本平台服务，您应当阅读并遵守《用户协议》和《隐私政策》。请您务必审慎阅读、充分理解各条款内容，特别是免除或者限制责任的条款。</p>

        <h4>一、服务说明</h4>
        <p>1.1 本平台为智慧乡村综合服务平台，提供村民管理、村务治理、信息公示、生活服务等综合功能。</p>
        <p>1.2 您注册成功后，将成为本平台用户，可以使用本平台提供的各项服务。</p>

        <h4>二、用户注册与账号</h4>
        <p>2.1 您承诺以真实身份注册，并保证所提供的个人信息真实、准确、完整。</p>
        <p>2.2 您应对您的账号和密码的安全负全部责任，因您保管不善可能导致账号被盗用，责任由您自行承担。</p>

        <h4>三、用户行为规范</h4>
        <p>3.1 您在使用本平台服务过程中，必须遵守相关法律法规，不得利用本平台从事违法违规活动。</p>
        <p>3.2 禁止发布虚假信息、侮辱诽谤他人、侵犯他人隐私等行为。</p>

        <h4>四、隐私保护</h4>
        <p>4.1 我们重视您的隐私保护，关于您个人信息的收集、使用、存储等规定，请参阅《隐私政策》。</p>

        <h4>五、免责条款</h4>
        <p>5.1 本平台不保证服务一定能满足您的要求，也不保证服务不会中断。</p>
        <p>5.2 因不可抗力、网络故障、系统维护等原因导致服务中断，本平台不承担责任。</p>

        <h4>六、协议修改</h4>
        <p>6.1 我们有权根据需要修改本协议条款，修改后的协议一旦公布即代替原协议。</p>

        <h4>七、法律适用</h4>
        <p>7.1 本协议之订立、生效、解释、修订、终止、执行与争议解决均适用中华人民共和国法律。</p>
      </div>
      <template #footer>
        <el-button type="primary" @click="agreeTermsAndClose">我已阅读并同意</el-button>
      </template>
    </el-dialog>

    <!-- 隐私政策弹窗 -->
    <el-dialog
      v-model="showPrivacyDialogFlag"
      title="隐私政策"
      width="700px"
      :close-on-click-modal="false"
    >
      <div class="terms-content">
        <h3>智慧乡村综合服务平台隐私政策</h3>
        <p><strong>更新日期：2025年1月</strong></p>
        <p>我们非常重视用户的隐私保护。本隐私政策说明了我们如何收集、使用、存储和保护您的个人信息。</p>

        <h4>一、信息收集</h4>
        <p>1.1 我们收集您主动提供的信息，包括：注册信息（手机号、姓名、身份证号等）、个人资料等。</p>
        <p>1.2 我们收集自动生成的信息，包括：IP地址、设备信息、日志信息等。</p>

        <h4>二、信息使用</h4>
        <p>2.1 我们使用您的个人信息来：提供、维护和改进我们的服务。</p>
        <p>2.2 向您发送重要通知，如系统更新、政策变更等。</p>
        <p>2.3 经您同意的其他用途。</p>

        <h4>三、信息存储</h4>
        <p>3.1 我们在中华人民共和国境内收集和产生的个人信息，将存储在中华人民共和国境内。</p>
        <p>3.2 我们会采取合理的技术手段和管理措施保护您的个人信息安全。</p>

        <h4>四、信息共享</h4>
        <p>4.1 除以下情况外，未经您同意，我们不会与任何第三方共享您的个人信息：</p>
        <p>（1）获得您的明确同意；</p>
        <p>（2）根据法律法规或政府主管部门要求；</p>
        <p>（3）为维护我们的合法权益。</p>

        <h4>五、您的权利</h4>
        <p>5.1 您有权访问、更正、删除您的个人信息。</p>
        <p>5.2 您有权撤回之前给予我们的同意。</p>
        <p>5.3 您有权注销您的账号。</p>

        <h4>六、政策更新</h4>
        <p>6.1 我们可能适时修订本隐私政策的条款，该等修订构成本隐私政策的一部分。</p>

        <h4>七、联系我们</h4>
        <p>7.1 如您对本隐私政策有任何疑问，请通过以下方式联系我们：</p>
        <p>邮箱：support@smartvillage.com</p>
        <p>电话：400-XXX-XXXX</p>
      </div>
      <template #footer>
        <el-button type="primary" @click="agreePrivacyAndClose">我已阅读并同意</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  User, Lock, Phone, Key, Postcard, Camera, Check, InfoFilled,
  Loading, SuccessFilled, ChatDotRound, UserFilled, OfficeBuilding,
  Plus, ChatDotSquare, ShoppingCart, MagicStick
} from '@element-plus/icons-vue'
import { authApi } from '@/api'
import api from '@/api'
import { markRaw } from 'vue'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const userStore = useUserStore()

// 角色定义
const roles = ref([
  { label: '村民', value: 'resident', icon: markRaw(UserFilled) },
  { label: '村干部', value: 'cadre', icon: markRaw(ChatDotSquare) },
  { label: '乡镇官员', value: 'official', icon: markRaw(OfficeBuilding) },
  { label: '采购商', value: 'purchaser', icon: markRaw(ShoppingCart) },
  { label: '管理员', value: 'admin', icon: markRaw(User) }
])

const selectedRole = ref('resident')
const loginMethod = ref('password')
const loading = ref(false)
const rememberMe = ref(false)
const hasLogo = ref(false)
const showForgotDialog = ref(false)
const showTermsDialogFlag = ref(false)
const showPrivacyDialogFlag = ref(false)

// 登录方式
const loginMethods = ref([
  { label: '密码登录', value: 'password', icon: markRaw(Lock) },
  { label: '人脸识别', value: 'face', icon: markRaw(Camera) },
  { label: '微信登录', value: 'wechat', icon: markRaw(ChatDotRound) }
])

// 登录表单
const loginForm = reactive({
  username: '',
  password: ''
})

// 采购商登录表单
const purchaserLoginForm = reactive({
  phone: '',
  idCard: ''
})

const loginRules = {
  username: [
    { required: true, message: '请输入用户名/手机号', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ]
}

const purchaserLoginRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/, message: '请输入正确的身份证号', trigger: 'blur' }
  ]
}

const agreeTerms = ref(false)
const codeCountdown = ref(0)

// 忘记密码表单
const forgotForm = reactive({
  phone: '',
  code: '',
  newPassword: ''
})

// 忘记密码验证码相关
const codeSending = ref(false)
// codeCountdown 已在上面声明 (第492行)

// 发送忘记密码验证码
const sendForgotCode = async () => {
  if (!forgotForm.phone) {
    ElMessage.warning('请输入手机号')
    return
  }

  if (!/^1[3-9]\d{9}$/.test(forgotForm.phone)) {
    ElMessage.warning('请输入正确的手机号')
    return
  }

  codeSending.value = true
  try {
    const res = await authApi.sendVerifyCode({ phone: forgotForm.phone, type: 'reset' })
    if (res.success) {
      ElMessage.success('验证码已发送，请查收短信')
      codeCountdown.value = 60
      const timer = setInterval(() => {
        codeCountdown.value--
        if (codeCountdown.value <= 0) {
          clearInterval(timer)
        }
      }, 1000)
    } else {
      ElMessage.error(res.message || '发送失败')
    }
  } catch (error) {
    ElMessage.error(error.message || '发送失败，请稍后重试')
  } finally {
    codeSending.value = false
  }
}

// 人脸识别
const videoRef = ref(null)
const canvasRef = ref(null)
const faceScanning = ref(false)
let stream = null

// 微信登录
const wechatQrCode = ref('')
const wechatScanned = ref(false)
const wechatExpired = ref(false)
let wechatCheckTimer = null

// 选择角色
const selectRole = (role) => {
  selectedRole.value = role
}

// 获取用户名占位符
const getUsernamePlaceholder = () => {
  switch (selectedRole.value) {
    case 'resident': return '请输入手机号/身份证号'
    case 'cadre': return '请输入工号/手机号'
    case 'official': return '请输入账号/手机号'
    case 'admin': return '请输入管理员账号'
    default: return '请输入用户名/手机号'
  }
}

// 密码登录
const handlePasswordLogin = async () => {
  if (!agreeTerms.value) {
    ElMessage.warning('请先阅读并同意用户协议')
    return
  }

  loading.value = true
  try {
    // 调用真实的后端登录API
    const response = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: loginForm.username,
        password: loginForm.password,
        role: selectedRole.value
      })
    })

    const data = await response.json()

    if (!data.success) {
      ElMessage.error(data.message || '登录失败，请检查用户名、密码和角色')
      return
    }

    // 保存token和用户信息
    userStore.setToken(data.data.token)
    userStore.setUserInfo(data.data.user)
    userStore.setPermissions(data.data.user.permissions || ['*'])
    userStore.setRoles([data.data.user.role])

    ElMessage.success(`欢迎回来，${data.data.user.username || data.data.user.name}！`)

    // 检查是否有重定向地址
    const redirect = router.currentRoute.value.query.redirect || '/dashboard'

    // 等待状态更新完成
    await new Promise(resolve => setTimeout(resolve, 300))

    // 跳转
    await router.push(redirect)

  } catch (error) {
    console.error('登录失败:', error)
    ElMessage.error(error.message || '登录失败，请检查网络连接或联系管理员')
  } finally {
    loading.value = false
  }
}

// 采购商登录
const handlePurchaserLogin = async () => {
  loading.value = true
  try {
    const res = await api.post('/api/v1/purchaser/login', {
      phone: purchaserLoginForm.phone,
      idCard: purchaserLoginForm.idCard
    })

    if (res.success) {
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.purchaser))

      ElMessage.success('登录成功')
      router.push('/purchaser/dashboard')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || '登录失败')
  } finally {
    loading.value = false
  }
}

// 启动人脸识别
const startFaceRecognition = async () => {
  try {
    faceScanning.value = true

    // 请求摄像头权限
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 640, height: 480 }
    })

    if (videoRef.value) {
      videoRef.value.srcObject = stream
    }

    // 模拟人脸识别（实际需要调用后端API）
    setTimeout(async () => {
      // 捕获图像
      const canvas = canvasRef.value
      const video = videoRef.value
      if (canvas && video) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d').drawImage(video, 0, 0)

        // 调用后端人脸识别API
        const imageData = canvas.toDataURL('image/jpeg')
        try {
          const res = await authApi.faceLogin({
            image: imageData,
            role: selectedRole.value
          })

          if (res.success) {
            // 使用 userStore 正确存储用户数据
            userStore.setToken(res.data.token)
            userStore.setUserInfo(res.data.user)

            ElMessage.success('人脸识别成功')

            // 根据角色跳转到不同页面
            const redirectMap = {
              resident: '/village-affairs',
              cadre: '/dashboard',
              official: '/dashboard',
              purchaser: '/purchaser/dashboard',
              admin: '/dashboard'
            }
            const redirectPath = redirectMap[selectedRole.value] || '/dashboard'
            router.push(redirectPath)
          }
        } catch (error) {
          ElMessage.error('人脸识别失败，请重试')
        }
      }

      stopFaceRecognition()
    }, 3000)
  } catch (error) {
    ElMessage.error('无法访问摄像头，请检查权限设置')
    faceScanning.value = false
  }
}

// 停止人脸识别
const stopFaceRecognition = () => {
  faceScanning.value = false
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }
}

// 获取微信登录二维码
const getWechatQrCode = async () => {
  try {
    const res = await authApi.getWechatQrCode()
    if (res.success) {
      wechatQrCode.value = res.data.qrCode
      wechatExpired.value = false

      // 轮询检查扫码状态
      wechatCheckTimer = setInterval(checkWechatStatus, 2000)
    }
  } catch (error) {
    ElMessage.error('获取二维码失败')
  }
}

// 检查微信扫码状态
const checkWechatStatus = async () => {
  try {
    const res = await authApi.checkWechatStatus()
    if (res.success) {
      if (res.data.status === 'scanned') {
        wechatScanned.value = true
      } else if (res.data.status === 'confirmed') {
        // 登录成功
        clearInterval(wechatCheckTimer)
        // 使用 userStore 正确存储用户数据
        userStore.setToken(res.data.token)
        userStore.setUserInfo(res.data.user)
        ElMessage.success('微信登录成功')

        // 根据用户角色跳转到不同页面
        const userRole = res.data.user?.role || selectedRole.value
        const redirectMap = {
          resident: '/village-affairs',
          cadre: '/dashboard',
          official: '/dashboard',
          purchaser: '/purchaser/dashboard',
          admin: '/dashboard'
        }
        const redirectPath = redirectMap[userRole] || '/dashboard'
        router.push(redirectPath)
      } else if (res.data.status === 'expired') {
        wechatExpired.value = true
        clearInterval(wechatCheckTimer)
      }
    }
  } catch (error) {
    console.error('检查微信状态失败:', error)
  }
}

// 刷新微信二维码
const refreshWechatQr = () => {
  wechatQrCode.value = ''
  wechatScanned.value = false
  getWechatQrCode()
}

// 显示忘记密码
const showForgotPassword = () => {
  showForgotDialog.value = true
}

// 重置密码
const handleResetPassword = async () => {
  try {
    const res = await authApi.resetPassword(forgotForm)
    if (res.success) {
      ElMessage.success('密码重置成功，请使用新密码登录')
      showForgotDialog.value = false
    }
  } catch (error) {
    ElMessage.error(error.message || '重置失败')
  }
}

// 跳转到注册页面
const goToRegister = () => {
  router.push('/register')
}

// 获取角色标题
const getRoleTitle = () => {
  const titles = {
    resident: '村民',
    cadre: '村干部',
    official: '乡镇官员',
    admin: '管理员',
    purchaser: '采购商'
  }
  return titles[selectedRole.value] || '用户'
}

// 显示用户协议
const showTermsDialog = () => {
  showTermsDialogFlag.value = true
}

// 显示隐私政策
const showPrivacyDialog = () => {
  showPrivacyDialogFlag.value = true
}

// 同意用户协议并关闭
const agreeTermsAndClose = () => {
  agreeTerms.value = true
  showTermsDialogFlag.value = false
}

// 同意隐私政策并关闭
const agreePrivacyAndClose = () => {
  agreeTerms.value = true
  showPrivacyDialogFlag.value = false
}

// 快速测试登录
const quickTestLogin = (type) => {
  const testAccounts = {
    'admin': { username: 'testadmin', password: 'Test123456!', role: 'admin' },
    'cadre': { username: 'testcadre', password: 'Cadre123456!', role: 'village_admin' },
    'resident': { username: 'testresident', password: 'Resident123456!', role: 'resident' }
  }

  const account = testAccounts[type]
  if (account) {
    // 自动切换到对应角色
    if (selectedRole.value !== account.role) {
      selectedRole.value = account.role
    }

    // 自动填充用户名和密码
    loginForm.username = account.username
    loginForm.password = account.password

    // 自动同意协议
    agreeTerms.value = true

    // 自动登录
    setTimeout(() => {
      handlePasswordLogin()
    }, 300)
  } else {
    ElMessage.warning('该角色暂无测试账户')
  }
}

// 监听登录方式切换
watch(() => loginMethod.value, (newVal) => {
  if (newVal === 'face') {
    // 切换到人脸识别时，清理之前的资源
    stopFaceRecognition()
  } else if (newVal === 'wechat') {
    // 切换到微信登录时，获取二维码
    getWechatQrCode()
  } else {
    // 切换到密码登录时，清理人脸和微信相关资源
    stopFaceRecognition()
    if (wechatCheckTimer) {
      clearInterval(wechatCheckTimer)
    }
  }
})

onMounted(() => {
  // 检查是否有logo
  hasLogo.value = true

  // 移除了自动跳转逻辑 - 让路由守卫处理已登录用户的重定向
  // 这样可以确保根据用户角色跳转到正确的页面
})

onUnmounted(() => {
  stopFaceRecognition()
  if (wechatCheckTimer) {
    clearInterval(wechatCheckTimer)
  }
})
</script>

<style scoped lang="scss">
.unified-login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(-45deg, #667eea, #764ba2, #f093fb, #4facfe);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
    pointer-events: none;
  }

  .background-decoration {
    position: absolute;
    width: 100%;
    height: 100%;
    overflow: hidden;

    .decoration-circle {
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);

      &.circle-1 {
        width: 600px;
        height: 600px;
        top: -200px;
        right: -200px;
        animation: float 20s ease-in-out infinite;
      }

      &.circle-2 {
        width: 400px;
        height: 400px;
        bottom: -100px;
        left: -100px;
        animation: float 15s ease-in-out infinite reverse;
      }

      &.circle-3 {
        width: 200px;
        height: 200px;
        top: 50%;
        left: 10%;
        animation: float 12s ease-in-out infinite;
        animation-delay: -5s;
      }
    }
  }

  .login-container {
    display: flex;
    width: 1100px;
    max-width: 95%;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-radius: 32px;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.25),
                0 10px 30px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    z-index: 1;
    animation: slideUp 0.6s ease-out;
  }

  .brand-section {
    flex: 1;
    padding: 70px 50px;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%);
    backdrop-filter: blur(10px);
    color: white;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
      background-size: 30px 30px;
      animation: bgMove 60s linear infinite;
    }

    .logo {
      text-align: center;
      margin-bottom: 35px;
      position: relative;
      z-index: 1;

      img {
        width: 90px;
        height: 90px;
        filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.2));
        transition: transform 0.3s ease;

        &:hover {
          transform: scale(1.05) rotate(5deg);
        }
      }
    }

    .brand-title {
      font-size: 34px;
      font-weight: 800;
      text-align: center;
      margin-bottom: 12px;
      letter-spacing: 1px;
      text-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      position: relative;
      z-index: 1;
    }

    .brand-subtitle {
      font-size: 13px;
      text-align: center;
      opacity: 0.9;
      margin-bottom: 45px;
      letter-spacing: 2px;
      text-transform: uppercase;
      position: relative;
      z-index: 1;
    }

    .brand-features {
      position: relative;
      z-index: 1;

      .feature-item {
        display: flex;
        align-items: center;
        margin-bottom: 24px;
        font-size: 16px;
        font-weight: 500;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        backdrop-filter: blur(5px);
        transition: all 0.3s ease;
        cursor: default;

        &:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateX(8px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .el-icon {
          margin-right: 14px;
          color: #67C23A;
          font-size: 20px;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        }
      }
    }
  }

  .login-section {
    flex: 1.2;
    padding: 50px;
    background: white;

    .login-content {
      max-width: 420px;
      margin: 0 auto;
    }

    .login-header {
      text-align: center;
      margin-bottom: 30px;

      h2 {
        font-size: 26px;
        font-weight: 700;
        color: #303133;
        margin-bottom: 8px;
      }

      .login-subtitle {
        font-size: 14px;
        color: #909399;
        margin-bottom: 20px;
      }

      .register-link {
        font-size: 14px;
        color: #606266;

        span {
          margin-right: 6px;
        }

        :deep(.el-link) {
          font-weight: 600;
        }
      }
    }

    .role-selector {
      display: flex;
      justify-content: space-between;
      margin-bottom: 35px;
      gap: 12px;

      .role-item {
        flex: 1;
        text-align: center;
        padding: 16px 10px;
        border: 2px solid #E4E7ED;
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 500;
        color: #606266;
        position: relative;
        overflow: hidden;
        background: white;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #667eea, #764ba2);
          opacity: 0;
          transition: opacity 0.35s ease;
          z-index: 0;
        }

        .el-icon, span {
          position: relative;
          z-index: 1;
          transition: color 0.35s ease;
        }

        .el-icon {
          font-size: 26px;
          color: #909399;
          transition: all 0.35s ease;
        }

        &:hover {
          transform: translateY(-4px);
          border-color: #667eea;
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.2);

          .el-icon {
            color: #667eea;
            transform: scale(1.1);
          }
        }

        &.active {
          border-color: #667eea;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.35);

          &::before {
            opacity: 1;
          }

          .el-icon, span {
            color: white;
          }

          .el-icon {
            transform: scale(1.15);
          }
        }
      }
    }

    .auth-toggle {
      display: flex;
      justify-content: center;
      gap: 35px;
      margin-bottom: 35px;
      position: relative;

      &::before {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 200px;
        height: 3px;
        background: #E4E7ED;
        border-radius: 3px;
      }

      span {
        font-size: 18px;
        font-weight: 600;
        color: #909399;
        cursor: pointer;
        padding-bottom: 12px;
        border-bottom: 3px solid transparent;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        z-index: 1;

        &:hover {
          color: #667eea;
        }

        &.active {
          color: #667eea;
          border-bottom-color: #667eea;
        }
      }
    }

    .login-methods {
      .method-tabs {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin-bottom: 30px;

        .method-tab {
          padding: 10px 20px;
          border-radius: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #909399;
          transition: all 0.3s;

          &:hover {
            background: #F5F7FA;
          }

          &.active {
            background: #667eea;
            color: white;
          }
        }
      }

      .login-form {
        :deep(.el-form-item) {
          margin-bottom: 24px;
        }

        :deep(.el-input) {
          .el-input__wrapper {
            border-radius: 12px;
            padding: 8px 16px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

            &:hover {
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
            }

            &.is-focus {
              box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2),
                          0 0 0 3px rgba(102, 126, 234, 0.1);
              border-color: #667eea;
            }
          }

          .el-input__prefix {
            font-size: 18px;
            color: #909399;
            transition: color 0.3s ease;
          }

          &.is-focus .el-input__prefix {
            color: #667eea;
          }
        }

        .form-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          margin-bottom: 8px;
        }

        .login-button {
          width: 100%;
          height: 52px;
          font-size: 17px;
          font-weight: 600;
          border-radius: 14px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.35);
          position: relative;
          overflow: hidden;

          &::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            transition: left 0.6s ease;
          }

          &:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.45);

            &::before {
              left: 100%;
            }
          }

          &:active {
            transform: translateY(-1px);
          }

          &.is-loading {
            opacity: 0.8;
            pointer-events: none;
          }
        }
      }

      .face-login {
        .face-scanner {
          width: 100%;
          height: 320px;
          background: #F5F7FA;
          border-radius: 12px;
          margin-bottom: 20px;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;

          &.scanning {
            background: #000;
          }

          .camera-video {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .scan-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;

            .scan-line {
              position: absolute;
              width: 100%;
              height: 2px;
              background: linear-gradient(to right, transparent, #67C23A, transparent);
              animation: scan 2s infinite;
            }

            .scan-face-frame {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 200px;
              height: 200px;

              .frame-corner {
                position: absolute;
                width: 40px;
                height: 40px;
                border: 3px solid #67C23A;

                &.top-left {
                  top: 0;
                  left: 0;
                  border-right: none;
                  border-bottom: none;
                }

                &.top-right {
                  top: 0;
                  right: 0;
                  border-left: none;
                  border-bottom: none;
                }

                &.bottom-left {
                  bottom: 0;
                  left: 0;
                  border-right: none;
                  border-top: none;
                }

                &.bottom-right {
                  bottom: 0;
                  right: 0;
                  border-left: none;
                  border-top: none;
                }
              }
            }
          }

          .face-placeholder {
            text-align: center;
            color: #909399;

            p {
              margin-top: 16px;
              font-size: 14px;
            }
          }
        }

        .face-button {
          width: 100%;
          height: 48px;
          font-size: 16px;
        }
      }

      .wechat-login {
        .wechat-qr-container {
          width: 100%;
          display: flex;
          justify-content: center;
          margin-bottom: 20px;

          .qr-code {
            width: 200px;
            height: 200px;
            border: 1px solid #E4E7ED;
            padding: 10px;
            border-radius: 8px;
            position: relative;

            img {
              width: 100%;
              height: 100%;
            }

            .qr-overlay {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: rgba(255, 255, 255, 0.95);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              border-radius: 8px;

              p {
                margin-top: 10px;
                font-size: 14px;
                color: #606266;
              }
            }
          }

          .qr-loading {
            width: 200px;
            height: 200px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;

            p {
              margin-top: 16px;
              color: #909399;
              font-size: 14px;
            }
          }
        }

        .wechat-tips {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #909399;
          font-size: 14px;
        }
      }

      .social-login {
        margin-top: 30px;

        .divider {
          text-align: center;
          position: relative;
          margin-bottom: 20px;

          &:before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            width: 100%;
            height: 1px;
            background: #E4E7ED;
          }

          span {
            position: relative;
            background: white;
            padding: 0 15px;
            color: #909399;
            font-size: 14px;
          }
        }

        .social-buttons {
          display: flex;
          justify-content: center;
          gap: 20px;

          .social-button {
            &:hover {
              transform: translateY(-2px);
            }

            &.wechat:hover {
              background: #67C23A;
              color: white;
            }

            &.face:hover {
              background: #667eea;
              color: white;
            }
          }
        }
      }

      // 快速测试登录样式
      .quick-test-login {
        margin-top: 30px;
        padding: 20px;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
        border-radius: 16px;
        border: 2px dashed rgba(102, 126, 234, 0.2);

        :deep(.el-divider) {
          margin: 0 0 20px 0;
          font-size: 14px;
          font-weight: 600;
          color: #667eea;

          .el-divider__text {
            background: transparent;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0;
          }

          .el-icon {
            color: #667eea;
          }
        }

        .quick-test-buttons {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;

          .test-button {
            flex: 1;
            min-width: 120px;
            height: auto;
            padding: 14px 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            border-radius: 12px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;

            &::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), transparent);
              opacity: 0;
              transition: opacity 0.3s ease;
            }

            &:hover:not(:disabled) {
              transform: translateY(-3px);
              box-shadow: 0 8px 20px rgba(102, 126, 234, 0.25);

              &::before {
                opacity: 1;
              }
            }

            &:disabled {
              opacity: 0.4;
              cursor: not-allowed;
              filter: grayscale(0.5);
            }

            &.test-btn-active:not(:disabled) {
              transform: scale(1.05);
              box-shadow: 0 10px 30px rgba(102, 126, 234, 0.35);

              &::after {
                content: '';
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                border-radius: 14px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                z-index: -1;
                animation: borderGlow 2s ease infinite;
              }
            }

            .el-icon {
              font-size: 24px;
              margin-bottom: 4px;
            }

            span {
              font-size: 15px;
              font-weight: 600;
              line-height: 1.2;
            }

            small {
              font-size: 11px;
              opacity: 0.85;
              margin-top: 2px;
            }
          }
        }

        .test-accounts-info {
          :deep(.el-alert) {
            border-radius: 12px;
            border: 1px solid rgba(102, 126, 234, 0.2);
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(10px);

            .el-alert__content {
              .el-alert__title {
                color: #606266;
              }
            }
          }

          .test-info-content {
            font-size: 13px;
            line-height: 1.8;

            p {
              margin: 0 0 8px 0;
              color: #303133;
            }

            ul {
              margin: 0;
              padding-left: 20px;
              list-style: none;

              li {
                margin-bottom: 6px;
                color: #606266;
                position: relative;
                padding-left: 16px;

                &::before {
                  content: '▸';
                  position: absolute;
                  left: 0;
                  color: #667eea;
                  font-weight: bold;
                }

                &:last-child {
                  margin-bottom: 0;
                }
              }
            }
          }
        }
      }
    }

    .register-form {
      .upload-tip {
        font-size: 12px;
        color: #909399;
        margin-top: 4px;
      }
    }
  }
}

@keyframes scan {
  0%, 100% {
    top: 0;
  }
  50% {
    top: 100%;
  }
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) rotate(0deg);
  }
  25% {
    transform: translate(20px, -20px) rotate(5deg);
  }
  50% {
    transform: translate(-10px, 20px) rotate(-5deg);
  }
  75% {
    transform: translate(-20px, -10px) rotate(3deg);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes bgMove {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(30px, 30px);
  }
}

@keyframes borderGlow {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .unified-login {
    .login-container {
      flex-direction: column;

      .brand-section {
        padding: 40px 20px;

        .brand-title {
          font-size: 24px;
        }

        .brand-features {
          display: none;
        }
      }

      .login-section {
        padding: 20px;

        .role-selector {
          flex-wrap: wrap;
          gap: 10px;

          .role-item {
            min-width: calc(50% - 5px);
          }
        }
      }
    }
  }
}

// 用户协议和隐私政策内容样式
.terms-content {
  max-height: 60vh;
  overflow-y: auto;
  padding: 0 10px;

  h3 {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 16px;
    color: #303133;
  }

  h4 {
    font-size: 16px;
    font-weight: 600;
    margin-top: 20px;
    margin-bottom: 10px;
    color: #606266;
  }

  p {
    margin-bottom: 12px;
    line-height: 1.8;
    color: #606266;
    font-size: 14px;
    text-align: justify;
  }

  strong {
    color: #303133;
    font-weight: 600;
  }

  ul {
    margin-left: 20px;
    margin-bottom: 12px;

    li {
      margin-bottom: 8px;
      line-height: 1.6;
      color: #606266;
      font-size: 14px;
    }
  }
}

// 用户协议复选框区域样式
.form-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 13px;
  color: #909399;

  :deep(.el-checkbox__label) {
    font-size: 13px;
    color: #909399;
  }

  :deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
    color: #667eea;
  }

  :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
    background-color: #667eea;
    border-color: #667eea;
  }
}
</style>
