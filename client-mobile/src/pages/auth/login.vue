<template>
  <div class="login-page">
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

      <!-- 登录表单 -->
      <div class="login-form">
        <!-- 角色选择 -->
        <div class="role-selector">
          <div
            v-for="role in roles"
            :key="role.value"
            :class="['role-item', { 'role-item--active': selectedRole === role.value }]"
            @click="selectRole(role.value)"
          >
            <span class="role-icon">{{ role.icon }}</span>
            <span class="role-name">{{ role.label }}</span>
          </div>
        </div>

        <!-- 手机号输入 -->
        <div class="form-item">
          <div class="input-wrapper">
            <span class="input-icon">📱</span>
            <input
              v-model="form.phone"
              type="tel"
              class="form-input"
              :class="{ 'large-text': isElderlyMode }"
              placeholder="请输入手机号"
              maxlength="11"
            />
          </div>
        </div>

        <!-- 验证码输入 -->
        <div class="form-item">
          <div class="input-wrapper code-wrapper">
            <span class="input-icon">🔐</span>
            <input
              v-model="form.code"
              type="text"
              class="form-input"
              :class="{ 'large-text': isElderlyMode }"
              placeholder="请输入验证码"
              maxlength="6"
            />
            <button
              class="code-btn"
              :disabled="counting"
              @click="sendCode"
            >
              {{ counting ? `${countdown}s后重发` : '获取验证码' }}
            </button>
          </div>
        </div>

        <!-- 登录按钮 -->
        <button
          class="login-btn"
          :disabled="!canLogin"
          @click="handleLogin"
        >
          <span class="btn-text">登 录</span>
        </button>

        <!-- 快捷登录方式 -->
        <div class="quick-login">
          <div class="divider">
            <span class="divider-text">其他登录方式</span>
          </div>
          <div class="quick-methods">
            <button class="method-btn" @click="handleWechatLogin">
              <span class="method-icon">💬</span>
              <span class="method-text">微信</span>
            </button>
            <button class="method-btn" @click="handleFaceLogin">
              <span class="method-icon">👤</span>
              <span class="method-text">人脸</span>
            </button>
            <button class="method-btn" @click="handlePasswordLogin">
              <span class="method-icon">🔑</span>
              <span class="method-text">密码</span>
            </button>
          </div>
        </div>

        <!-- 注册链接 -->
        <div class="register-link">
          <span class="link-text">还没有账号？</span>
          <button class="link-btn" @click="goToRegister">立即注册</button>
        </div>
      </div>

      <!-- 协议 -->
      <div class="agreement">
        <label class="agreement-label" @click="agreed = !agreed">
          <div class="custom-checkbox" :class="{ 'custom-checkbox--checked': agreed }">
            <span v-if="agreed" class="checkbox-check">✓</span>
          </div>
          <span class="agreement-text">
            我已阅读并同意
            <button class="agreement-link" @click.stop="viewAgreement('user')">《用户协议》</button>
            和
            <button class="agreement-link" @click.stop="viewAgreement('privacy')">《隐私政策》</button>
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

const router = useRouter()
const userStore = useUserStore()
const elderlyStore = useElderlyStore()

// 角色选项
const roles = [
  { value: 'villager', label: '村民', icon: '👨‍🌾' },
  { value: 'cadre', label: '村干部', icon: '👔' },
  { value: 'official', label: '乡镇官员', icon: '🏛️' },
  { value: 'admin', label: '管理员', icon: '⚙️' }
]

// 选中的角色
const selectedRole = ref('villager')

// 表单数据
const form = ref({
  phone: '',
  code: ''
})

// 协议同意
const agreed = ref(false)

// 验证码倒计时
const counting = ref(false)
const countdown = ref(60)

// 是否适老化模式
const isElderlyMode = computed(() => elderlyStore.isElderlyMode)

// 是否可以登录（开发模式放宽验证）
const canLogin = computed(() => {
  return form.value.phone &&
         form.value.code &&
         agreed.value
  // 开发阶段放宽手机号格式验证
  // && /^1[3-9]\d{9}$/.test(form.value.phone)
})

// 页面加载调试
onMounted(() => {
  console.log('=== 登录页面加载 ===')
  console.log('手机号:', form.value.phone)
  console.log('验证码:', form.value.code)
  console.log('协议同意:', agreed.value)
  console.log('是否可登录:', canLogin.value)
})

// 监听表单变化
watch([form, agreed], () => {
  console.log('表单状态更新:', {
    phone: form.value.phone,
    code: form.value.code,
    agreed: agreed.value,
    canLogin: canLogin.value
  })
}, { deep: true })

// 选择角色
const selectRole = (role) => {
  selectedRole.value = role
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

// 发送验证码（开发模式）
const sendCode = async () => {
  // 开发阶段放宽手机号验证
  if (!form.value.phone) {
    alert('请输入手机号')
    return
  }

  // 开发阶段：生成4位数字验证码并自动填充
  const mockCode = Math.floor(1000 + Math.random() * 9000).toString()

  console.log('【开发模式】验证码:', mockCode)

  // 自动填充验证码到表单
  form.value.code = mockCode

  // 确认验证码已填充
  console.log('验证码已填充到表单:', form.value.code)

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

  // 延迟显示弹窗，确保验证码已填充
  setTimeout(() => {
    alert(`【开发模式】验证码: ${mockCode}\n已自动填充到验证码输入框\n当前登录状态: ${canLogin.value ? '可登录' : '不可登录'}\n${!agreed.value ? '请先勾选用户协议！' : ''}`)
  }, 100)

  // 生产环境应调用API发送验证码
  // try {
  //   await api.sendSmsCode({ phone: form.value.phone })
  //   counting.value = true
  //   // ... 倒计时逻辑
  // } catch (error) {
  //   alert('验证码发送失败，请重试')
  // }
}

// 处理登录
const handleLogin = async () => {
  if (!canLogin.value) {
    if (!agreed.value) {
      alert('请先阅读并同意用户协议和隐私政策')
    }
    return
  }

  try {
    // TODO: 调用API登录
    console.log('登录:', {
      phone: form.value.phone,
      code: form.value.code,
      role: selectedRole.value
    })

    // 模拟登录成功
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

    // 震动反馈
    if (elderlyStore.hapticFeedback) {
      elderlyStore.vibrate('short')
    }

    alert('登录成功')

    // 根据角色跳转到对应页面
    switch (selectedRole.value) {
      case 'admin':
      case 'official':
      case 'cadre':
        router.replace('/services')
        break
      default:
        router.replace('/village')
    }
  } catch (error) {
    console.error('登录失败:', error)
    alert('登录失败，请重试')
  }
}

// 微信登录
const handleWechatLogin = () => {
  console.log('微信登录')
  // TODO: 实现微信登录
}

// 人脸登录
const handleFaceLogin = () => {
  console.log('人脸登录')
  // TODO: 实现人脸识别登录
}

// 密码登录
const handlePasswordLogin = () => {
  router.push('/auth/password-login')
}

// 去注册
const goToRegister = () => {
  router.push('/auth/register')
}

// 查看协议
const viewAgreement = (type) => {
  console.log('查看协议:', type)
  // TODO: 跳转到协议页面
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
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

  .bg-circle {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);

    &-1 {
      width: 300px;
      height: 300px;
      top: -100px;
      right: -100px;
    }

    &-2 {
      width: 200px;
      height: 200px;
      bottom: -50px;
      left: -50px;
    }

    &-3 {
      width: 150px;
      height: 150px;
      top: 50%;
      left: -75px;
    }
  }
}

.login-content {
  width: 100%;
  max-width: 400px;
  position: relative;
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;

  .logo {
    font-size: 64px;
    margin-bottom: 16px;
  }

  .title {
    font-size: 32px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 8px;
  }

  .subtitle {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
  }
}

.login-form {
  background: #fff;
  border-radius: 16px;
  padding: 32px 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.role-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;

  .role-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 8px;
    background: #f5f5f5;
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;

    &--active {
      background: #e6f7ff;
      border-color: #1890ff;
    }

    .role-icon {
      font-size: 24px;
      margin-bottom: 4px;
    }

    .role-name {
      font-size: 12px;
      color: #666;
    }

    &--active .role-name {
      color: #1890ff;
      font-weight: 600;
    }
  }
}

.form-item {
  margin-bottom: 16px;

  .input-wrapper {
    display: flex;
    align-items: center;
    background: #f5f5f5;
    border-radius: 8px;
    padding: 0 12px;

    &.code-wrapper {
      padding-right: 8px;
    }

    .input-icon {
      font-size: 20px;
      margin-right: 8px;
      opacity: 0.5;
    }

    .form-input {
      flex: 1;
      border: none;
      background: transparent;
      padding: 14px 0;
      font-size: 14px;
      outline: none;

      &.large-text {
        font-size: 18px;
      }

      &::placeholder {
        color: #999;
      }
    }

    .code-btn {
      padding: 8px 16px;
      border: none;
      background: #1890ff;
      color: #fff;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      white-space: nowrap;

      &:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
    }
  }
}

.login-btn {
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

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:active:not(:disabled) {
    opacity: 0.9;
  }
}

.quick-login {
  .divider {
    display: flex;
    align-items: center;
    margin: 24px 0;

    &::before,
    &::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #e8e8e8;
    }

    .divider-text {
      padding: 0 16px;
      font-size: 12px;
      color: #999;
    }
  }

  .quick-methods {
    display: flex;
    justify-content: center;
    gap: 24px;

    .method-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      border: none;
      background: none;
      cursor: pointer;

      .method-icon {
        font-size: 32px;
      }

      .method-text {
        font-size: 12px;
        color: #666;
      }

      &:active .method-icon {
        opacity: 0.7;
      }
    }
  }
}

.register-link {
  text-align: center;
  margin-top: 24px;

  .link-text {
    font-size: 14px;
    color: #666;
  }

  .link-btn {
    border: none;
    background: none;
    color: #1890ff;
    font-size: 14px;
    cursor: pointer;
  }
}

.agreement {
  margin-top: 24px;
  padding: 0 8px;

  .agreement-label {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    cursor: pointer;

    .custom-checkbox {
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
      transition: all 0.3s;

      &--checked {
        background: #1890ff;
        border-color: #1890ff;
      }

      .checkbox-check {
        color: #fff;
        font-size: 14px;
        font-weight: bold;
        line-height: 1;
      }
    }

    .agreement-text {
      font-size: 12px;
      color: #666;
      line-height: 1.5;
      user-select: none;
    }

    .agreement-link {
      border: none;
      background: none;
      color: #1890ff;
      font-size: 12px;
      cursor: pointer;
      padding: 0;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}

// 适老化模式
:deep(.elderly-mode-large) {
  .login-header .title {
    font-size: 40px;
  }

  .role-selector .role-item {
    padding: 16px 12px;

    .role-icon {
      font-size: 32px;
    }

    .role-name {
      font-size: 16px;
    }
  }

  .login-btn {
    height: 56px;
    font-size: 20px;
  }
}

:deep(.elderly-mode-xl) {
  .login-header .title {
    font-size: 48px;
  }

  .role-selector .role-item {
    padding: 20px 16px;

    .role-icon {
      font-size: 40px;
    }

    .role-name {
      font-size: 18px;
    }
  }

  .login-btn {
    height: 64px;
    font-size: 24px;
  }
}
</style>
