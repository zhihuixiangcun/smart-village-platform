<template>
  <div class="face-login">
    <!-- 顶部导航 -->
    <van-nav-bar
      title="人脸识别登录"
      left-arrow
      @click-left="$router.go(-1)"
    />

    <!-- 主内容区域 -->
    <div class="login-container">
      <!-- 摄像头预览区域 -->
      <div class="camera-container">
        <video
          ref="videoElement"
          class="video-preview"
          :class="{ 'mirrored': mirrorVideo }"
          autoplay
          playsinline
          muted
        ></video>

        <!-- 人脸框架 -->
        <div class="face-frame" :class="{ 'scanning': isScanning }">
          <div class="frame-corner top-left"></div>
          <div class="frame-corner top-right"></div>
          <div class="frame-corner bottom-left"></div>
          <div class="frame-corner bottom-right"></div>

          <!-- 扫描动画 -->
          <div v-if="isScanning" class="scan-line"></div>

          <!-- 提示文字 -->
          <div class="frame-hint">
            {{ scanHint }}
          </div>
        </div>

        <!-- 摄像头未启动状态 -->
        <div v-if="!cameraActive" class="camera-overlay">
          <van-icon name="photograph" size="64" color="#999" />
          <p>点击下方按钮启动摄像头</p>
        </div>
      </div>

      <!-- 操作按钮组 -->
      <div class="action-buttons">
        <!-- 启动/停止摄像头 -->
        <van-button
          v-if="!cameraActive"
          round
          type="primary"
          icon="photograph"
          size="large"
          @click="startCamera"
          :loading="initializing"
        >
          启动摄像头
        </van-button>

        <!-- 捕捉并识别 -->
        <van-button
          v-if="cameraActive && !isScanning"
          round
          type="success"
          icon="aim"
          size="large"
          @click="captureAndIdentify"
        >
          开始识别
        </van-button>

        <!-- 重新识别 -->
        <van-button
          v-if="cameraActive && !isScanning && lastCapture"
          round
          type="warning"
          icon="replay"
          size="small"
          @click="resetCapture"
        >
          重新识别
        </van-button>

        <!-- 停止摄像头 -->
        <van-button
          v-if="cameraActive && !isScanning"
          round
          type="danger"
          icon="close"
          size="small"
          @click="stopCamera"
        >
          关闭
        </van-button>
      </div>

      <!-- 识别结果展示 -->
      <div v-if="identifyResult" class="result-section">
        <!-- 成功 -->
        <div v-if="identifyResult.success" class="result-success">
          <van-icon name="checked" size="48" color="#07c160" />
          <h3>识别成功</h3>
          <p class="user-name">{{ identifyResult.data?.user?.name || '用户' }}</p>
          <p class="match-score">相似度: {{ identifyResult.data?.similarity?.toFixed(2) || '0.00' }}</p>

          <!-- 自动登录倒计时 -->
          <div v-if="loginCountdown > 0" class="countdown">
            <van-count-down
              :time="loginCountdown * 1000"
              format="ss"
              @finish="autoLogin"
            >
              <template #default="{ time }">
                <span>{{ time }} 秒后自动登录</span>
              </template>
            </van-count-down>
          </div>

          <van-button
            type="primary"
            block
            @click="loginNow"
            :loading="loggingIn"
          >
            立即登录
          </van-button>
        </div>

        <!-- 失败/未匹配 -->
        <div v-else class="result-failed">
          <van-icon name="close" size="48" color="#ee0a24" />
          <h3>{{ identifyResult.message || '识别失败' }}</h3>

          <!-- 未找到匹配时显示亲属代理选项 -->
          <van-cell-group inset title="其他登录方式">
            <van-cell
              title="亲属代理登录"
              is-link
              @click="showProxyDialog = true"
            >
              <template #icon>
                <van-icon name="friends-o" class="cell-icon" />
              </template>
            </van-cell>
            <van-cell
              title="账号密码登录"
              is-link
              @click="$router.push('/login')"
            >
              <template #icon>
                <van-icon name="user-circle-o" class="cell-icon" />
              </template>
            </van-cell>
          </van-cell-group>
        </div>
      </div>

      <!-- 活体检测提示 -->
      <div v-if="requireLiveness && livenessStep > 0" class="liveness-guide">
        <van-notice-bar
          left-icon="info-o"
          :text="livenessInstructions[livenessStep - 1] || '请配合完成活体检测'"
        />
      </div>

      <!-- 亲属代理登录弹窗 -->
      <van-dialog
        v-model:show="showProxyDialog"
        title="亲属代理登录"
        show-cancel-button
        :before-close="handleProxyLogin"
      >
        <div class="proxy-dialog">
          <van-form ref="proxyFormRef" @submit="handleProxyLogin">
            <van-cell-group inset>
              <van-field
                v-model="proxyForm.principalName"
                name="principalName"
                label="被代理人姓名"
                placeholder="请输入被代理人姓名"
                :rules="[{ required: true, message: '请输入被代理人姓名' }]"
              />
              <van-field
                v-model="proxyForm.principalIdNumber"
                name="principalIdNumber"
                label="身份证号"
                placeholder="请输入身份证号"
                :rules="[
                  { required: true, message: '请输入身份证号' },
                  { pattern: /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/, message: '身份证号格式不正确' }
                ]"
              />
              <van-field
                v-model="proxyForm.relationType"
                name="relationType"
                label="与您的关系"
                is-link
                readonly
                placeholder="请选择关系"
                @click="showRelationPicker = true"
                :rules="[{ required: true, message: '请选择关系' }]"
              />
              <van-field
                v-model="proxyForm.villageId"
                name="villageId"
                label="村庄ID"
                placeholder="请输入村庄ID"
                :rules="[{ required: true, message: '请输入村庄ID' }]"
              />
            </van-cell-group>

            <div class="dialog-actions">
              <van-button round block type="primary" native-type="submit">
                验证身份并登录
              </van-button>
            </div>
          </van-form>
        </div>
      </van-dialog>

      <!-- 关系选择器 -->
      <van-popup v-model:show="showRelationPicker" position="bottom" round>
        <van-picker
          :columns="relationTypes"
          @confirm="onRelationConfirm"
          @cancel="showRelationPicker = false"
        />
      </van-popup>

      <!-- 捕捉的图像预览 (隐藏) -->
      <canvas ref="canvasElement" style="display: none;"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast, showLoadingToast, closeToast, showConfirmDialog, showSuccessToast } from 'vant'
import { useUserStore } from '@/stores/userStore'
import faceRecognitionApi from '@/api/faceRecognition'
import { faceLogin, proxyLogin } from '@/api/auth'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// ============ 响应式数据 ============
const videoElement = ref(null)
const canvasElement = ref(null)
const proxyFormRef = ref(null)

const cameraActive = ref(false)
const initializing = ref(false)
const isScanning = ref(false)
const mirrorVideo = ref(true)
const requireLiveness = ref(false)
const loggingIn = ref(false)

const identifyResult = ref(null)
const lastCapture = ref(null)
const loginCountdown = ref(3)
const streamRef = ref(null)

// 活体检测
const livenessStep = ref(0)
const livenessFrames = ref([])
const livenessInstructions = [
  '请眨眼',
  '请张嘴',
  '请缓慢转头',
  '请完成指定动作'
]

// 亲属代理
const showProxyDialog = ref(false)
const showRelationPicker = ref(false)
const proxyForm = reactive({
  principalName: '',
  principalIdNumber: '',
  relationType: '',
  villageId: ''
})

const relationTypes = [
  { text: '配偶', value: 'spouse' },
  { text: '父母', value: 'parent' },
  { text: '子女', value: 'child' },
  { text: '兄弟姐妹', value: 'sibling' },
  { text: '祖父母/外祖父母', value: 'grandparent' },
  { text: '孙子女/外孙子女', value: 'grandchild' },
  { text: '监护人', value: 'guardian' },
  { text: '其他', value: 'other' }
]

// ============ 计算属性 ============
const scanHint = computed(() => {
  if (!cameraActive.value) return '请先启动摄像头'
  if (isScanning.value) return '正在识别...'
  if (identifyResult.value?.success) return '识别成功'
  return '请将脸部对准框内'
})

// ============ 方法 ============

/**
 * 启动摄像头
 */
const startCamera = async () => {
  try {
    initializing.value = true

    // 请求摄像头权限
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user', // 前置摄像头
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 }
      },
      audio: false
    })

    streamRef.value = stream

    // 将流设置到video元素
    await nextTick()
    if (videoElement.value) {
      videoElement.value.srcObject = stream
      videoElement.value.onloadedmetadata = () => {
        videoElement.value.play()
        cameraActive.value = true
        initializing.value = false
        showToast('摄像头已启动')
      }
    }
  } catch (error) {
    console.error('摄像头启动失败:', error)
    initializing.value = false
    showToast(error.name === 'NotAllowedError' ? '请允许摄像头权限' : '摄像头启动失败')
  }
}

/**
 * 停止摄像头
 */
const stopCamera = () => {
  if (streamRef.value) {
    streamRef.value.getTracks().forEach(track => track.stop())
    streamRef.value = null
  }

  if (videoElement.value) {
    videoElement.value.srcObject = null
  }

  cameraActive.value = false
  isScanning.value = false
}

/**
 * 捕捉当前帧
 */
const captureFrame = () => {
  return new Promise((resolve, reject) => {
    try {
      const video = videoElement.value
      const canvas = canvasElement.value

      if (!video || !canvas) {
        reject(new Error('摄像头或Canvas未就绪'))
        return
      }

      // 设置canvas尺寸与视频一致
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // 绘制当前帧
      const ctx = canvas.getContext('2d')

      // 如果需要镜像，翻转canvas
      if (mirrorVideo.value) {
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // 转换为Base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8)

      // 移除data:image/jpeg;base64,前缀
      const base64Data = imageData.split(',')[1]

      resolve(base64Data)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * 捕捉并识别人脸
 */
const captureAndIdentify = async () => {
  try {
    isScanning.value = true
    identifyResult.value = null

    // 捕捉图像
    const imageData = await captureFrame()
    lastCapture.value = imageData

    // 获取villageId (从路由参数或用户信息)
    const villageId = route.query.villageId || userStore.userInfo?.villageId

    if (!villageId) {
      showToast('缺少村庄ID')
      isScanning.value = false
      return
    }

    showLoadingToast({
      message: '正在识别...',
      forbidClick: true,
      duration: 0
    })

    // 调用人脸识别API
    const result = await faceRecognitionApi.faceIdentification.identify({
      image: imageData,
      villageId: villageId,
      maxResults: 1
    })

    closeToast()

    if (result.success && result.data?.matches?.length > 0) {
      const match = result.data.matches[0]

      // 检查相似度是否足够高
      if (match.similarity >= 0.8) {
        identifyResult.value = {
          success: true,
          data: {
            user: match.user,
            similarity: match.similarity,
            confidence: match.confidence
          }
        }

        // 开始自动登录倒计时
        loginCountdown.value = 3
      } else {
        identifyResult.value = {
          success: false,
          message: '相似度不足，请重试'
        }
      }
    } else {
      identifyResult.value = {
        success: false,
        message: '未识别到匹配用户'
      }
    }
  } catch (error) {
    console.error('人脸识别失败:', error)
    closeToast()
    identifyResult.value = {
      success: false,
      message: error.message || '识别失败，请重试'
    }
  } finally {
    isScanning.value = false
  }
}

/**
 * 自动登录
 */
const autoLogin = async () => {
  if (identifyResult.value?.success) {
    await loginNow()
  }
}

/**
 * 立即登录
 */
const loginNow = async () => {
  try {
    loggingIn.value = true

    const userId = identifyResult.value.data.user._id || identifyResult.value.data.user.id

    // 调用后端登录接口获取token
    const loginResult = await faceLogin({
      userId: userId,
      villageId: route.query.villageId || userStore.userInfo?.villageId
    })

    if (loginResult.success) {
      // 保存token
      userStore.setToken(loginResult.data.token)
      userStore.setUserInfo(loginResult.data.user)

      showSuccessToast('登录成功')

      // 跳转到主页或返回页
      const redirect = route.query.redirect || '/dashboard'
      router.push(redirect)
    }
  } catch (error) {
    console.error('登录失败:', error)
    showToast(error.message || '登录失败')
  } finally {
    loggingIn.value = false
  }
}

/**
 * 重置捕捉
 */
const resetCapture = () => {
  identifyResult.value = null
  lastCapture.value = null
  loginCountdown.value = 3
}

/**
 * 关系选择确认
 */
const onRelationConfirm = ({ selectedOptions }) => {
  proxyForm.relationType = selectedOptions[0].text
  showRelationPicker.value = false
}

/**
 * 处理亲属代理登录
 */
const handleProxyLogin = async (action, done) => {
  if (action === 'cancel') {
    showProxyDialog.value = false
    return true
  }

  try {
    // 表单验证
    await proxyFormRef.value.validate()

    showLoadingToast({
      message: '验证代理关系...',
      forbidClick: true
    })

    // 调用代理登录API
    const result = await proxyLogin({
      principalName: proxyForm.principalName,
      principalIdNumber: proxyForm.principalIdNumber,
      relationType: proxyForm.relationType,
      villageId: proxyForm.villageId
    })

    closeToast()

    if (result.success) {
      showProxyDialog.value = false
      showSuccessToast('代理登录成功')

      // 保存token和用户信息
      userStore.setToken(result.data.token)
      userStore.setUserInfo(result.data.user)

      // 跳转
      const redirect = route.query.redirect || '/dashboard'
      router.push(redirect)
    }
  } catch (error) {
    closeToast()
    showToast(error.message || '代理登录失败')
  }

  return false
}

/**
 * 带活体检测的识别
 */
const startLivenessDetection = async () => {
  try {
    requireLiveness.value = true
    livenessStep.value = 1
    livenessFrames.value = []

    showToast('请配合完成活体检测')

    // 收集活体检测帧
    for (let step = 1; step <= 3; step++) {
      livenessStep.value = step
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 捕捉当前动作的帧
      const frame = await captureFrame()
      livenessFrames.value.push({
        action: ['blink', 'mouth', 'head'][step - 1],
        frame: frame
      })
    }

    // 发送活体检测请求
    showLoadingToast({
      message: '活体检测中...',
      forbidClick: true
    })

    const livenessResult = await faceRecognitionApi.livenessDetection.detect({
      frames: livenessFrames.value,
      actions: ['blink', 'mouth', 'head']
    })

    closeToast()

    if (livenessResult.success && livenessResult.data.isLive) {
      // 活体检测通过，继续人脸识别
      await captureAndIdentify()
    } else {
      showToast('活体检测未通过，请重试')
    }
  } catch (error) {
    console.error('活体检测失败:', error)
    closeToast()
    showToast(error.message || '活体检测失败')
  } finally {
    requireLiveness.value = false
    livenessStep.value = 0
  }
}

// ============ 生命周期 ============
onMounted(() => {
  // 检查是否启用活体检测
  requireLiveness.value = route.query.liveness === 'true'
})

onUnmounted(() => {
  stopCamera()
})
</script>

<style scoped>
.face-login {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding-bottom: 20px;
}

.login-container {
  padding: 16px;
}

/* 摄像头容器 */
.camera-container {
  position: relative;
  width: 100%;
  height: 400px;
  background: #000;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.video-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-preview.mirrored {
  transform: scaleX(-1);
}

/* 人脸框架 */
.face-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 260px;
  height: 320px;
  border: 2px solid rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  transition: all 0.3s;
}

.face-frame.scanning {
  border-color: #07c160;
  box-shadow: 0 0 20px rgba(7, 193, 96, 0.5);
}

/* 框架角落 */
.frame-corner {
  position: absolute;
  width: 30px;
  height: 30px;
  border-color: #fff;
  border-style: solid;
}

.frame-corner.top-left {
  top: -2px;
  left: -2px;
  border-width: 4px 0 0 4px;
  border-radius: 12px 0 0 0;
}

.frame-corner.top-right {
  top: -2px;
  right: -2px;
  border-width: 4px 4px 0 0;
  border-radius: 0 12px 0 0;
}

.frame-corner.bottom-left {
  bottom: -2px;
  left: -2px;
  border-width: 0 0 4px 4px;
  border-radius: 0 0 0 12px;
}

.frame-corner.bottom-right {
  bottom: -2px;
  right: -2px;
  border-width: 0 4px 4px 0;
  border-radius: 0 0 12px 0;
}

/* 扫描动画 */
.scan-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #07c160, transparent);
  animation: scan 2s linear infinite;
}

@keyframes scan {
  0% { top: 0; }
  50% { top: calc(100% - 2px); }
  100% { top: 0; }
}

/* 框架提示 */
.frame-hint {
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  color: #fff;
  font-size: 14px;
  white-space: nowrap;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

/* 摄像头遮罩 */
.camera-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  text-align: center;
}

.camera-overlay p {
  margin-top: 12px;
  font-size: 14px;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-bottom: 20px;
}

/* 识别结果 */
.result-section {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.result-success,
.result-failed {
  text-align: center;
}

.result-success h3 {
  margin: 12px 0 8px;
  color: #07c160;
}

.result-failed h3 {
  margin: 12px 0 8px;
  color: #ee0a24;
}

.user-name {
  font-size: 20px;
  font-weight: 600;
  margin: 8px 0;
}

.match-score {
  color: #999;
  font-size: 14px;
  margin-bottom: 16px;
}

.countdown {
  margin: 16px 0;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  color: #fff;
}

.cell-icon {
  margin-right: 8px;
  color: #1989fa;
}

/* 亲属代理弹窗 */
.proxy-dialog {
  padding: 16px;
}

.dialog-actions {
  padding: 16px;
}

/* 活体检测提示 */
.liveness-guide {
  margin-top: 16px;
}

/* 老年人友好模式 */
.face-login.elderly-mode .frame-hint {
  font-size: 18px;
}

.face-login.elderly-mode .action-buttons .van-button {
  min-height: 50px;
  font-size: 18px;
}
</style>
