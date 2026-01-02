<template>
  <el-dialog
    :model-value="modelValue"
    title="远程身份认证"
    width="600px"
    @close="handleClose"
  >
    <div class="auth-container">
      <!-- 认证方式选择 -->
      <div v-if="!authMethod" class="method-selection">
        <h3>请选择认证方式</h3>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-card
              shadow="hover"
              class="method-card"
              @click="selectMethod('face')"
            >
              <div class="method-content">
                <el-icon size="48" color="#409EFF"><User /></el-icon>
                <h4>人脸识别</h4>
                <p>使用人脸识别进行身份验证</p>
              </div>
            </el-card>
          </el-col>

          <el-col :span="12">
            <el-card
              shadow="hover"
              class="method-card"
              @click="selectMethod('proxy')"
            >
              <div class="method-content">
                <el-icon size="48" color="#67C23A"><UserFilled /></el-icon>
                <h4>亲属代理</hh4>
                <p>通过家庭成员代为操作</p>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 人脸识别认证 -->
      <div v-else-if="authMethod === 'face'" class="face-auth">
        <el-steps :active="faceAuthStep" finish-status="success" align-center>
          <el-step title="活体检测" />
          <el-step title="人脸识别" />
          <el-step title="认证完成" />
        </el-steps>

        <div class="auth-content">
          <!-- 活体检测 -->
          <div v-if="faceAuthStep === 0" class="liveness-check">
            <div class="camera-wrapper">
              <video
                ref="videoRef"
                autoplay
                playsinline
                @loadedmetadata="onVideoReady"
              ></video>
              <canvas ref="canvasRef" style="display:none"></canvas>
            </div>

            <el-alert
              title="请将脸部对准摄像头"
              type="info"
              :closable="false"
              show-icon
            >
              <template #default>
                <p>1. 保持光线充足</p>
                <p>2. 正面面对摄像头</p>
                <p>3. 缓慢眨眼、张嘴或转头</p>
              </template>
            </el-alert>

            <div class="action-buttons">
              <el-button type="primary" @click="captureAndDetect">
                开始检测
              </el-button>
            </div>
          </div>

          <!-- 人脸识别 -->
          <div v-else-if="faceAuthStep === 1" class="face-recognition">
            <div class="camera-wrapper">
              <video
                ref="videoRef"
                autoplay
                playsinline
              ></video>
            </div>

            <el-alert
              title="请保持正脸对准摄像头"
              type="success"
              :closable="false"
              show-icon
            />

            <div class="action-buttons">
              <el-button @click="faceAuthStep = 0">上一步</el-button>
              <el-button type="primary" @click="performFaceRecognition">
                开始识别
              </el-button>
            </div>
          </div>

          <!-- 认证完成 -->
          <div v-else-if="faceAuthStep === 2" class="auth-complete">
            <el-result
              icon="success"
              title="认证成功"
              sub-title="您已通过身份验证"
            >
              <template #extra>
                <el-button type="primary" @click="handleAuthSuccess">
                  确认
                </el-button>
              </template>
            </el-result>
          </div>

          <!-- 认证失败 -->
          <div v-if="authFailed" class="auth-failed">
            <el-result
              icon="error"
              title="认证失败"
              :sub-title="authFailedMessage"
            >
              <template #extra>
                <el-button @click="retryAuth">重试</el-button>
                <el-button type="primary" @click="selectMethod('proxy')">
                  使用亲属代理
                </el-button>
              </template>
            </el-result>
          </div>
        </div>
      </div>

      <!-- 亲属代理认证 -->
      <div v-else-if="authMethod === 'proxy'" class="proxy-auth">
        <h3>选择代理成员</h3>

        <el-radio-group v-model="selectedProxyId" class="proxy-list">
          <el-radio
            v-for="proxy in availableProxies"
            :key="proxy.id"
            :label="proxy.id"
            border
            class="proxy-item"
          >
            <div class="proxy-info">
              <span class="proxy-name">{{ proxy.name }}</span>
              <span class="proxy-relation">{{ proxy.relationship }}</span>
              <el-tag v-if="proxy.isAuthorized" type="success" size="small">
                已授权
              </el-tag>
            </div>
          </el-radio>
        </el-radio-group>

        <div class="action-buttons">
          <el-button @click="authMethod = null">返回</el-button>
          <el-button
            type="primary"
            @click="requestProxyAuth"
            :disabled="!selectedProxyId"
          >
            确认
          </el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { User, UserFilled } from '@element-plus/icons-vue'
import { authApi, proxyApi } from '@/api/family'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  memberId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'success', 'error'])

// 认证方式
const authMethod = ref('')

// 人脸识别
const faceAuthStep = ref(0)
const authFailed = ref(false)
const authFailedMessage = ref('')
const videoRef = ref(null)
const canvasRef = ref(null)
let stream = null

// 亲属代理
const availableProxies = ref([])
const selectedProxyId = ref(null)

// 选择认证方式
function selectMethod(method) {
  authMethod.value = method
  authFailed.value = false

  if (method === 'face') {
    startCamera()
  } else if (method === 'proxy') {
    loadAvailableProxies()
  }
}

// 启动摄像头
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 640, height: 480 }
    })

    if (videoRef.value) {
      videoRef.value.srcObject = stream
    }
  } catch (error) {
    ElMessage.error('无法访问摄像头，请检查权限设置')
    console.error('Camera error:', error)
  }
}

// 停止摄像头
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }
}

// 视频就绪
function onVideoReady() {
  console.log('Video ready')
}

// 捕获并检测活体
async function captureAndDetect() {
  if (!videoRef.value || !canvasRef.value) return

  const video = videoRef.value
  const canvas = canvasRef.value
  const context = canvas.getContext('2d')

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  context.drawImage(video, 0, 0)

  const imageData = canvas.toDataURL('image/jpeg')

  try {
    // 调用活体检测API
    const result = await authApi.performLivenessDetection(imageData)

    if (result.data.isLive) {
      faceAuthStep.value = 1
    } else {
      authFailed.value = true
      authFailedMessage.value = '活体检测未通过，请确保是真人操作'
    }
  } catch (error) {
    ElMessage.error('活体检测失败')
    console.error('Liveness detection error:', error)
  }
}

// 执行人脸识别
async function performFaceRecognition() {
  if (!videoRef.value || !canvasRef.value) return

  const video = videoRef.value
  const canvas = canvasRef.value
  const context = canvas.getContext('2d')

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  context.drawImage(video, 0, 0)

  const imageData = canvas.toDataURL('image/jpeg')

  try {
    // 初始化人脸认证
    const initResult = await authApi.initFaceAuth(props.memberId, imageData)

    if (initResult.data.sessionId) {
      // 执行人脸识别
      const result = await authApi.performFaceRecognition(
        initResult.data.sessionId,
        imageData
      )

      if (result.success) {
        faceAuthStep.value = 2
      } else {
        authFailed.value = true
        authFailedMessage.value = result.message || '人脸识别失败'
      }
    }
  } catch (error) {
    ElMessage.error('人脸识别失败')
    console.error('Face recognition error:', error)
    authFailed.value = true
    authFailedMessage.value = error.message
  }
}

// 重试认证
function retryAuth() {
  authFailed.value = false
  faceAuthStep.value = 0
}

// 认证成功
function handleAuthSuccess() {
  emit('success')
  handleClose()
}

// 加载可用代理列表
async function loadAvailableProxies() {
  try {
    const result = await proxyApi.getAvailableProxies(props.memberId)
    availableProxies.value = result.data || []
  } catch (error) {
    ElMessage.error('加载代理列表失败')
    console.error('Load proxies error:', error)
  }
}

// 请求代理认证
async function requestProxyAuth() {
  if (!selectedProxyId.value) {
    ElMessage.warning('请选择代理成员')
    return
  }

  try {
    const result = await proxyApi.requestProxyAuth(
      props.memberId,
      selectedProxyId.value
    )

    if (result.success) {
      emit('success')
      handleClose()
      ElMessage.success('代理认证成功')
    }
  } catch (error) {
    ElMessage.error('代理认证失败')
    console.error('Proxy auth error:', error)
  }
}

function handleClose() {
  stopCamera()
  authMethod.value = ''
  faceAuthStep.value = 0
  authFailed.value = false
  selectedProxyId.value = null
  emit('update:modelValue', false)
}

onUnmounted(() => {
  stopCamera()
})
</script>

<style scoped lang="scss">
.auth-container {
  min-height: 400px;

  .method-selection {
    h3 {
      text-align: center;
      margin-bottom: 30px;
    }

    .method-card {
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        transform: translateY(-5px);
      }

      .method-content {
        text-align: center;
        padding: 20px;

        h4 {
          margin: 15px 0 10px;
        }

        p {
          margin: 0;
          color: #909399;
          font-size: 14px;
        }
      }
    }
  }

  .face-auth {
    .el-steps {
      margin-bottom: 30px;
    }

    .auth-content {
      .camera-wrapper {
        width: 100%;
        max-width: 480px;
        margin: 0 auto 20px;
        border-radius: 8px;
        overflow: hidden;
        background-color: #000;

        video {
          width: 100%;
          height: auto;
          display: block;
        }
      }

      .action-buttons {
        margin-top: 20px;
        text-align: center;
        display: flex;
        justify-content: center;
        gap: 10px;
      }
    }
  }

  .proxy-auth {
    h3 {
      text-align: center;
      margin-bottom: 30px;
    }

    .proxy-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin-bottom: 30px;

      .proxy-item {
        width: 100%;

        :deep(.el-radio__label) {
          width: 100%;
        }

        .proxy-info {
          display: flex;
          align-items: center;
          gap: 15px;

          .proxy-name {
            font-size: 16px;
            font-weight: bold;
          }

          .proxy-relation {
            color: #909399;
          }
        }
      }
    }

    .action-buttons {
      text-align: center;
      display: flex;
      justify-content: center;
      gap: 10px;
    }
  }
}
</style>
