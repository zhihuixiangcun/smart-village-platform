<template>
  <view class="login-page">
    <!-- 头部 -->
    <view class="login-header">
      <view class="logo">🏡</view>
      <view class="title">智慧乡村</view>
      <view class="subtitle">便捷服务 · 温暖乡村</view>
    </view>

    <!-- 登录表单 -->
    <view class="login-form">
      <!-- 手机号输入 -->
      <view class="form-item">
        <view class="form-item__label">📱 手机号</view>
        <voice-input
          v-model="formData.phone"
          type="number"
          placeholder="请输入手机号"
          :show-voice-button="true"
          input-class="login-input"
        />
      </view>

      <!-- 验证码输入 -->
      <view class="form-item">
        <view class="form-item__label">🔐 验证码</view>
        <view class="code-input-wrapper">
          <voice-input
            v-model="formData.code"
            type="number"
            placeholder="请输入验证码"
            :show-voice-button="true"
            input-class="login-input code-input"
          />
          <elderly-button
            type="primary"
            :disabled="!isPhoneValid || countdown > 0"
            :loading="sendingCode"
            @click="handleSendCode"
          >
            {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
          </elderly-button>
        </view>
      </view>

      <!-- 登录按钮 -->
      <view class="form-actions">
        <elderly-button
          type="primary"
          size="large"
          :block="true"
          :loading="logging"
          :disabled="!isFormValid"
          @click="handleLogin"
        >
          登录
        </elderly-button>
      </view>

      <!-- 其他登录方式 -->
      <view class="other-login">
        <view class="divider">
          <view class="divider-line" />
          <text class="divider-text">其他登录方式</text>
          <view class="divider-line" />
        </view>

        <view class="other-methods">
          <view class="method-item" @click="handleWechatLogin">
            <view class="method-icon">💬</view>
            <view class="method-text">微信登录</view>
          </view>
          <view class="method-item" @click="handleFaceLogin">
            <view class="method-icon">👤</view>
            <view class="method-text">人脸识别</view>
          </view>
        </view>
      </view>

      <!-- 协议 -->
      <view class="agreement">
        <view class="agreement-checkbox" @click="handleAgreeToggle">
          <text class="checkbox-icon">{{ agreed ? '☑️' : '☐' }}</text>
          <text class="agreement-text">
            我已阅读并同意
            <text class="link" @click.stop="handleViewAgreement('user')">《用户协议》</text>
            和
            <text class="link" @click.stop="handleViewAgreement('privacy')">《隐私政策》</text>
          </text>
        </view>
      </view>
    </view>

    <!-- 适老化切换 -->
    <view class="elderly-switch" @click="handleSwitchElderlyMode">
      <text class="switch-icon">Aa</text>
      <text class="switch-text">{{ elderlyStore.mode === 'standard' ? '大字版' : '标准版' }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '@/store/user'
import { useElderlyStore } from '@/store/elderly'
import VoiceInput from '@/components/voice/VoiceInput.vue'
import ElderlyButton from '@/components/elderly/ElderlyButton.vue'

/**
 * 登录页面
 * 支持验证码登录、微信登录、人脸识别
 */

const userStore = useUserStore()
const elderlyStore = useElderlyStore()

// 表单数据
const formData = ref({
  phone: '',
  code: ''
})

// 倒计时
const countdown = ref(0)

// 发送验证码中
const sendingCode = ref(false)

// 登录中
const logging = ref(false)

// 是否同意协议
const agreed = ref(false)

// 手机号是否有效
const isPhoneValid = computed(() => {
  const phoneReg = /^1[3-9]\d{9}$/
  return phoneReg.test(formData.value.phone)
})

// 表单是否有效
const isFormValid = computed(() => {
  return isPhoneValid.value && formData.value.code.length >= 4 && agreed.value
})

// 发送验证码
const handleSendCode = async () => {
  if (!isPhoneValid.value) {
    uni.showToast({
      title: '请输入正确的手机号',
      icon: 'none'
    })
    return
  }

  sendingCode.value = true

  try {
    // 调用API发送验证码
    // await api.auth.sendCode(formData.value.phone)

    // 模拟发送成功
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 开始倒计时
    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)

    uni.showToast({
      title: '验证码已发送',
      icon: 'success'
    })
  } catch (error) {
    console.error('发送验证码失败:', error)
    uni.showToast({
      title: error.message || '发送失败',
      icon: 'none'
    })
  } finally {
    sendingCode.value = false
  }
}

// 登录
const handleLogin = async () => {
  if (!isFormValid.value) {
    uni.showToast({
      title: '请完善登录信息',
      icon: 'none'
    })
    return
  }

  logging.value = true

  try {
    // 调用登录API
    const result = await userStore.login({
      phone: formData.value.phone,
      code: formData.value.code
    })

    if (result.success) {
      // 登录成功，跳转首页
      uni.switchTab({
        url: '/pages/village/index'
      })
    }
  } catch (error) {
    console.error('登录失败:', error)
  } finally {
    logging.value = false
  }
}

// 微信登录
const handleWechatLogin = () => {
  // #ifdef MP-WEIXIN
  uni.getUserProfile({
    desc: '用于登录',
    success: async (res) => {
      console.log('微信用户信息:', res)
      // 调用微信登录API
      // ...
    },
    fail: (error) => {
      console.error('获取用户信息失败:', error)
    }
  })
  // #endif

  // #ifndef MP-WEIXIN
  uni.showToast({
    title: '仅在小程序中支持',
    icon: 'none'
  })
  // #endif
}

// 人脸识别登录
const handleFaceLogin = () => {
  // #ifdef MP-WEIXIN
  // 调用人脸识别API
  uni.showModal({
    title: '人脸识别登录',
    content: '此功能需要摄像头权限',
    success: (res) => {
      if (res.confirm) {
        // 开始人脸识别
        // ...
      }
    }
  })
  // #endif

  // #ifndef MP-WEIXIN
  uni.showToast({
    title: '仅在小程序中支持',
    icon: 'none'
  })
  // #endif
}

// 同意协议切换
const handleAgreeToggle = () => {
  agreed.value = !agreed.value
  elderlyStore.vibrate('short')
}

// 查看协议
const handleViewAgreement = (type) => {
  uni.navigateTo({
    url: `/pages/common/agreement?type=${type}`
  })
}

// 切换适老化模式
const handleSwitchElderlyMode = () => {
  const newMode = elderlyStore.mode === 'standard' ? 'large' : 'standard'
  elderlyStore.setMode(newMode)

  uni.showToast({
    title: `已切换至${newMode === 'standard' ? '标准' : '大字'}版`,
    icon: 'none'
  })
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  padding: 80rpx 48rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 80rpx;
}

.logo {
  font-size: 120rpx;
}

.title {
  font-size: 56rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.subtitle {
  font-size: 32rpx;
  color: rgba(255, 255, 255, 0.8);
}

.login-form {
  background-color: #FFFFFF;
  border-radius: 32rpx;
  padding: 48rpx;
}

.form-item {
  margin-bottom: 40rpx;

  &__label {
    font-size: 32rpx;
    color: var(--color-text-primary, #1A202C);
    margin-bottom: 16rpx;
  }
}

.login-input {
  width: 100%;
}

.code-input-wrapper {
  display: flex;
  gap: 16rpx;

  .code-input {
    flex: 1;
  }
}

.form-actions {
  margin-top: 64rpx;
}

.other-login {
  margin-top: 64rpx;
}

.divider {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 40rpx;

  &-line {
    flex: 1;
    height: 1rpx;
    background-color: var(--color-border-primary, #E2E8F0);
  }

  &-text {
    font-size: 28rpx;
    color: var(--color-text-tertiary, #718096);
  }
}

.other-methods {
  display: flex;
  justify-content: center;
  gap: 80rpx;
}

.method-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  cursor: pointer;

  &-icon {
    font-size: 64rpx;
  }

  &-text {
    font-size: 28rpx;
    color: var(--color-text-secondary, #4A5568);
  }
}

.agreement {
  margin-top: 48rpx;
}

.agreement-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  font-size: 24rpx;
  color: var(--color-text-secondary, #4A5568);
  line-height: 1.6;
}

.checkbox-icon {
  font-size: 32rpx;
  flex-shrink: 0;
}

.link {
  color: var(--color-primary, #2F855A);
}

.elderly-switch {
  position: fixed;
  top: 40rpx;
  right: 40rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 48rpx;
  backdrop-filter: blur(10rpx);
}

.switch-icon {
  font-size: 36rpx;
  font-weight: 700;
}

.switch-text {
  font-size: 28rpx;
  color: #FFFFFF;
}
</style>