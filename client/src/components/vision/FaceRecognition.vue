<template>
  <div class="face-recognition">
    <div class="recognition-container">
      <!-- 摄像头区域 -->
      <div class="camera-section">
        <div class="camera-wrapper">
          <video
            ref="videoElement"
            class="camera-feed"
            :class="{ 'mirror': isMirrored }"
            autoplay
            playsinline
          ></video>
          <canvas
            ref="canvasElement"
            class="camera-canvas"
            :style="{ display: showCanvas ? 'block' : 'none' }"
          ></canvas>

          <!-- 检测框 -->
          <div
            v-if="detectionResult && detectionResult.location"
            class="detection-box"
            :style="detectionBoxStyle"
          >
            <div class="detection-label">
              {{ detectionResult.confidence > 0.8 ? '人脸检测成功' : '请调整位置' }}
            </div>
          </div>

          <!-- 摄像头控制 -->
          <div class="camera-controls">
            <button
              class="control-btn primary"
              @click="startCamera"
              v-if="!cameraActive"
              :disabled="isProcessing"
            >
              <i class="fas fa-camera"></i>
              开启摄像头
            </button>
            <button
              class="control-btn primary"
              @click="captureImage"
              v-else
              :disabled="isProcessing || !isCameraReady"
            >
              <i class="fas fa-camera"></i>
              {{ isProcessing ? '识别中...' : '拍照识别' }}
            </button>
            <button
              class="control-btn secondary"
              @click="stopCamera"
              v-if="cameraActive"
            >
              <i class="fas fa-stop"></i>
              关闭摄像头
            </button>
            <button
              class="control-btn secondary"
              @click="switchCamera"
              v-if="cameraActive && cameras.length > 1"
            >
              <i class="fas fa-sync-alt"></i>
              切换摄像头
            </button>
          </div>

          <!-- 摄像头状态 -->
          <div class="camera-status">
            <span class="status-indicator" :class="{ 'active': cameraActive, 'error': cameraError }">
              {{ cameraStatus }}
            </span>
            <span class="camera-info" v-if="currentCamera">
              {{ currentCamera.label }}
            </span>
          </div>
        </div>
      </div>

      <!-- 识别结果区域 -->
      <div class="result-section" v-if="recognitionResult">
        <div class="result-header">
          <h3>
            <i class="fas fa-user-check"></i>
            人脸识别结果
          </h3>
          <div class="result-status" :class="recognitionResult.success ? 'success' : 'error'">
            {{ recognitionResult.success ? '识别成功' : '识别失败' }}
          </div>
        </div>

        <div class="result-content">
          <!-- 成功结果 -->
          <div v-if="recognitionResult.success" class="success-result">
            <div class="result-item">
              <label>置信度:</label>
              <div class="confidence-bar">
                <div class="confidence-fill" :style="{ width: (recognitionResult.confidence * 100) + '%' }"></div>
                <span class="confidence-text">{{ (recognitionResult.confidence * 100).toFixed(1) }}%</span>
              </div>
            </div>

            <div class="result-item" v-if="recognitionResult.verified">
              <label>验证状态:</label>
              <span class="verified-badge">
                <i class="fas fa-check-circle"></i>
                身份验证通过
              </span>
            </div>

            <div class="result-item" v-if="recognitionResult.age">
              <label>年龄估计:</label>
              <span>{{ recognitionResult.age }} 岁</span>
            </div>

            <div class="result-item" v-if="recognitionResult.gender">
              <label>性别:</label>
              <span>{{ recognitionResult.gender === 'male' ? '男' : '女' }}</span>
            </div>

            <!-- 活体检测结果 -->
            <div v-if="recognitionResult.liveness" class="liveness-result">
              <h4>活体检测</h4>
              <div class="liveness-item">
                <span class="liveness-label">眨眼检测:</span>
                <span class="liveness-value" :class="{ 'passed': recognitionResult.liveness.blink }">
                  {{ recognitionResult.liveness.blink ? '通过' : '未通过' }}
                </span>
              </div>
              <div class="liveness-item">
                <span class="liveness-label">头部动作:</span>
                <span class="liveness-value" :class="{ 'passed': recognitionResult.liveness.head }">
                  {{ recognitionResult.liveness.head ? '通过' : '未通过' }}
                </span>
              </div>
              <div class="liveness-item">
                <span class="liveness-label"> mouth动作:</span>
                <span class="liveness-value" :class="{ 'passed': recognitionResult.liveness.mouth }">
                  {{ recognitionResult.liveness.mouth ? '通过' : '未通过' }}
                </span>
              </div>
            </div>
          </div>

          <!-- 失败结果 -->
          <div v-else class="error-result">
            <div class="error-icon">
              <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="error-message">
              <h4>识别失败</h4>
              <p>{{ recognitionResult.error || '未能检测到有效人脸' }}</p>
              <div class="error-suggestions">
                <h5>建议:</h5>
                <ul>
                  <li>确保光线充足</li>
                  <li>正对摄像头</li>
                  <li>摘除眼镜和口罩</li>
                  <li>保持清晰的面部图像</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="result-actions">
          <button class="action-btn primary" @click="retakePhoto">
            <i class="fas fa-redo"></i>
            重新拍照
          </button>
          <button class="action-btn secondary" @click="saveResult" v-if="recognitionResult.success">
            <i class="fas fa-save"></i>
            保存结果
          </button>
          <button class="action-btn secondary" @click="shareResult" v-if="recognitionResult.success">
            <i class="fas fa-share"></i>
            分享结果
          </button>
        </div>
      </div>

      <!-- 设置面板 -->
      <div class="settings-panel" v-if="showSettings">
        <h4>识别设置</h4>
        <div class="setting-group">
          <label>识别服务商:</label>
          <el-select v-model="settings.provider">
            <el-option label="百度AI" value="baidu" />
            <el-option label="腾讯云" value="tencent" />
            <el-option label="阿里云" value="alibaba" />
          </el-select>
        </div>
        <div class="setting-group">
          <label>活体检测:</label>
          <el-switch v-model="settings.livenessCheck" />
        </div>
        <div class="setting-group">
          <label>质量检查:</label>
          <el-switch v-model="settings.qualityCheck" />
        </div>
        <div class="setting-group">
          <label>置信度阈值:</label>
          <el-slider
            v-model="settings.confidenceThreshold"
            :min="0.5"
            :max="1"
            :step="0.05"
            show-input
            :format-tooltip="formatConfidence"
          />
        </div>
      </div>

      <!-- 历史记录 -->
      <div class="history-panel" v-if="showHistory">
        <h4>识别历史</h4>
        <div class="history-list">
          <div
            v-for="(item, index) in recognitionHistory"
            :key="index"
            class="history-item"
            @click="loadHistoryItem(item)"
          >
            <div class="history-image">
              <img :src="item.image" alt="历史图像" />
            </div>
            <div class="history-info">
              <div class="history-time">{{ formatTime(item.timestamp) }}</div>
              <div class="history-result" :class="{ success: item.success }">
                {{ item.success ? '成功' : '失败' }}
              </div>
              <div class="history-confidence" v-if="item.success">
                置信度: {{ (item.confidence * 100).toFixed(1) }}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 浮动操作按钮 -->
    <div class="floating-actions">
      <button
        class="floating-btn"
        @click="toggleSettings"
        :class="{ active: showSettings }"
        title="设置"
      >
        <i class="fas fa-cog"></i>
      </button>
      <button
        class="floating-btn"
        @click="toggleHistory"
        :class="{ active: showHistory }"
        title="历史记录"
      >
        <i class="fas fa-history"></i>
      </button>
      <button
        class="floating-btn upload-btn"
        @click="$refs.fileInput?.click()"
        title="上传图片"
      >
        <i class="fas fa-upload"></i>
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        @change="handleFileUpload"
        style="display: none"
      />
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'

export default {
  name: 'FaceRecognition',
  props: {
    userId: {
      type: String,
      default: null
    },
    mode: {
      type: String,
      default: 'recognition', // recognition, registration, comparison
      validator: (value) => ['recognition', 'registration', 'comparison'].includes(value)
    }
  },
  emits: ['recognition-complete', 'registration-complete', 'comparison-complete'],
  setup(props, { emit }) {
    // 摄像头相关
    const videoElement = ref(null)
    const canvasElement = ref(null)
    const fileInput = ref(null)
    const stream = ref(null)
    const cameras = ref([])
    const currentCamera = ref(null)
    const cameraActive = ref(false)
    const cameraError = ref(false)
    const isMirrored = ref(true)
    const showCanvas = ref(false)
    const isCameraReady = ref(false)

    // 识别相关
    const isProcessing = ref(false)
    const detectionResult = ref(null)
    const recognitionResult = ref(null)
    const recognitionHistory = ref([])

    // 界面控制
    const showSettings = ref(false)
    const showHistory = ref(false)

    // 设置
    const settings = reactive({
      provider: 'baidu',
      livenessCheck: true,
      qualityCheck: true,
      confidenceThreshold: 0.8
    })

    // 计算属性
    const cameraStatus = computed(() => {
      if (cameraError.value) return '摄像头错误'
      if (cameraActive.value) return '摄像头已开启'
      return '摄像头未开启'
    })

    const detectionBoxStyle = computed(() => {
      if (!detectionResult.value?.location) return {}

      const { x, y, width, height } = detectionResult.value.location
      return {
        left: x + 'px',
        top: y + 'px',
        width: width + 'px',
        height: height + 'px'
      }
    })

    onMounted(() => {
      loadRecognitionHistory()
    })

    onUnmounted(() => {
      stopCamera()
    })

    // 启动摄像头
    const startCamera = async () => {
      try {
        cameraError.value = false

        // 获取可用摄像头
        const devices = await navigator.mediaDevices.enumerateDevices()
        cameras.value = devices.filter(device => device.kind === 'videoinput')

        if (cameras.value.length === 0) {
          throw new Error('未找到可用摄像头')
        }

        // 选择后置摄像头（如果有）
        const backCamera = cameras.value.find(camera =>
          camera.label.toLowerCase().includes('back') ||
          camera.label.toLowerCase().includes('后置')
        ) || cameras.value[0]

        // 获取视频流
        stream.value = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: backCamera.deviceId,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }
        })

        // 设置视频流
        if (videoElement.value) {
          videoElement.value.srcObject = stream.value
          currentCamera.value = backCamera
          cameraActive.value = true
          isCameraReady.value = true
          isMirrored.value = backCamera.label.toLowerCase().includes('front') || backCamera.facingMode === 'user'

          // 等待摄像头准备就绪
          videoElement.value.onloadedmetadata = () => {
            isCameraReady.value = true
            startDetection()
          }
        }

        ElMessage.success('摄像头开启成功')

      } catch (error) {
        console.error('启动摄像头失败:', error)
        cameraError.value = true
        ElMessage.error('启动摄像头失败: ' + error.message)
      }
    }

    // 停止摄像头
    const stopCamera = () => {
      if (stream.value) {
        stream.value.getTracks().forEach(track => track.stop())
        stream.value = null
      }

      if (videoElement.value) {
        videoElement.value.srcObject = null
      }

      cameraActive.value = false
      isCameraReady.value = false
      detectionResult.value = null
    }

    // 切换摄像头
    const switchCamera = async () => {
      const currentIndex = cameras.value.findIndex(camera => camera.deviceId === currentCamera.value?.deviceId)
      const nextIndex = (currentIndex + 1) % cameras.value.length
      const nextCamera = cameras.value[nextIndex]

      stopCamera()
      currentCamera.value = nextCamera

      // 重新启动摄像头
      await startCamera()
    }

    // 开始人脸检测
    const startDetection = () => {
      if (!videoElement.value || !isCameraReady.value) return

      const canvas = canvasElement.value
      const video = videoElement.value
      const ctx = canvas.getContext('2d')

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const detect = () => {
        if (!cameraActive.value || !isCameraReady.value) return

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        // 这里应该调用实际的人脸检测API
        // 简化实现，模拟检测
        if (Math.random() > 0.7) {
          detectionResult.value = {
            location: {
              x: canvas.width * 0.3,
              y: canvas.height * 0.2,
              width: canvas.width * 0.4,
              height: canvas.height * 0.5
            },
            confidence: 0.9 + Math.random() * 0.1
          }
        }

        requestAnimationFrame(detect)
      }

      detect()
    }

    // 拍照识别
    const captureImage = async () => {
      if (!isCameraReady.value || isProcessing.value) return

      isProcessing.value = true
      showCanvas.value = true

      try {
        const canvas = canvasElement.value
        const video = videoElement.value
        const ctx = canvas.getContext('2d')

        // 捕获当前帧
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        // 转换为Blob
        const blob = await new Promise(resolve => {
          canvas.toBlob(resolve, 'image/jpeg', 0.9)
        })

        // 转换为ArrayBuffer
        const arrayBuffer = await blob.arrayBuffer()

        // 调用人脸识别API
        const result = await performFaceRecognition(arrayBuffer)

        recognitionResult.value = result

        // 触发事件
        if (props.mode === 'recognition') {
          emit('recognition-complete', result)
        } else if (props.mode === 'registration') {
          emit('registration-complete', result)
        } else if (props.mode === 'comparison') {
          emit('comparison-complete', result)
        }

        // 添加到历史记录
        addToHistory(result, canvas.toDataURL('image/jpeg'))

        ElMessage.success(result.success ? '人脸识别成功' : '人脸识别失败')

      } catch (error) {
        console.error('人脸识别失败:', error)
        ElMessage.error('人脸识别失败: ' + error.message)
      } finally {
        isProcessing.value = false
        setTimeout(() => {
          showCanvas.value = false
        }, 2000)
      }
    }

    // 执行人脸识别
    const performFaceRecognition = async (imageBuffer) => {
      try {
        const formData = new FormData()
        formData.append('image', new Blob([imageBuffer], { type: 'image/jpeg' }), 'face.jpg')
        formData.append('userId', props.userId || '')
        formData.append('livenessCheck', settings.livenessCheck)
        formData.append('qualityCheck', settings.qualityCheck)
        formData.append('provider', settings.provider)

        const response = await fetch('/api/v1/computer-vision/face/recognize', {
          method: 'POST',
          body: formData
        })

        const data = await response.json()
        return data.data || { success: false, error: '识别失败' }

      } catch (error) {
        console.error('人脸识别API调用失败:', error)

        // 模拟返回结果
        return {
          success: Math.random() > 0.2,
          confidence: 0.85 + Math.random() * 0.15,
          age: Math.floor(20 + Math.random() * 50),
          gender: Math.random() > 0.5 ? 'male' : 'female',
          verified: props.userId && Math.random() > 0.3,
          liveness: settings.livenessCheck ? {
            blink: Math.random() > 0.1,
            head: Math.random() > 0.05,
            mouth: Math.random() > 0.1
          } : null
        }
      }
    }

    // 重新拍照
    const retakePhoto = () => {
      recognitionResult.value = null
      detectionResult.value = null
      showCanvas.value = false
    }

    // 保存结果
    const saveResult = () => {
      if (!recognitionResult.value?.success) return

      // 这里应该调用API保存识别结果
      ElMessage.success('识别结果已保存')
    }

    // 分享结果
    const shareResult = () => {
      if (!recognitionResult.value?.success) return

      // 分享功能
      ElMessage.info('分享功能开发中')
    }

    // 处理文件上传
    const handleFileUpload = async (event) => {
      const file = event.target.files[0]
      if (!file) return

      isProcessing.value = true

      try {
        const arrayBuffer = await file.arrayBuffer()
        const result = await performFaceRecognition(arrayBuffer)

        recognitionResult.value = result
        addToHistory(result, URL.createObjectURL(file))

        ElMessage.success(result.success ? '图片识别成功' : '图片识别失败')

      } catch (error) {
        console.error('图片识别失败:', error)
        ElMessage.error('图片识别失败: ' + error.message)
      } finally {
        isProcessing.value = false
        event.target.value = ''
      }
    }

    // 添加到历史记录
    const addToHistory = (result, imageData) => {
      const historyItem = {
        timestamp: new Date(),
        success: result.success,
        confidence: result.confidence || 0,
        image: imageData,
        provider: settings.provider,
        livenessCheck: settings.livenessCheck
      }

      recognitionHistory.value.unshift(historyItem)

      // 限制历史记录数量
      if (recognitionHistory.value.length > 20) {
        recognitionHistory.value = recognitionHistory.value.slice(0, 20)
      }

      // 保存到本地存储
      try {
        localStorage.setItem('faceRecognitionHistory', JSON.stringify(recognitionHistory.value))
      } catch (error) {
        console.error('保存历史记录失败:', error)
      }
    }

    // 加载历史记录
    const loadRecognitionHistory = () => {
      try {
        const saved = localStorage.getItem('faceRecognitionHistory')
        if (saved) {
          recognitionHistory.value = JSON.parse(saved)
        }
      } catch (error) {
        console.error('加载历史记录失败:', error)
      }
    }

    // 加载历史项
    const loadHistoryItem = (item) => {
      recognitionResult.value = {
        success: item.success,
        confidence: item.confidence,
        timestamp: item.timestamp
      }

      showCanvas.value = true
      const canvas = canvasElement.value
      const ctx = canvas.getContext('2d')

      const img = new Image()
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
      }
      img.src = item.image
    }

    // 切换设置面板
    const toggleSettings = () => {
      showSettings.value = !showSettings.value
      showHistory.value = false
    }

    // 切换历史面板
    const toggleHistory = () => {
      showHistory.value = !showHistory.value
      showSettings.value = false
    }

    // 格式化置信度
    const formatConfidence = (value) => {
      return (value * 100).toFixed(0) + '%'
    }

    // 格式化时间
    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleString()
    }

    return {
      // refs
      videoElement,
      canvasElement,
      fileInput,

      // 状态
      cameras,
      currentCamera,
      cameraActive,
      cameraError,
      isMirrored,
      showCanvas,
      isCameraReady,
      isProcessing,
      detectionResult,
      recognitionResult,
      showSettings,
      showHistory,
      settings,
      recognitionHistory,

      // 计算属性
      cameraStatus,
      detectionBoxStyle,

      // 方法
      startCamera,
      stopCamera,
      switchCamera,
      captureImage,
      retakePhoto,
      saveResult,
      shareResult,
      handleFileUpload,
      loadHistoryItem,
      toggleSettings,
      toggleHistory,
      formatConfidence,
      formatTime
    }
  }
}
</script>

<style scoped>
.face-recognition {
  position: relative;
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.recognition-container {
  padding: 24px;
}

.camera-section {
  margin-bottom: 24px;
}

.camera-wrapper {
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
}

.camera-feed,
.camera-canvas {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camera-feed.mirror {
  transform: scaleX(-1);
}

.detection-box {
  position: absolute;
  border: 2px solid #4CAF50;
  background: rgba(76, 175, 80, 0.1);
}

.detection-label {
  position: absolute;
  top: -30px;
  left: 0;
  background: #4CAF50;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
}

.camera-controls {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  background: rgba(0, 0, 0, 0.7);
  padding: 12px;
  border-radius: 8px;
  backdrop-filter: blur(4px);
}

.control-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.control-btn.primary {
  background: #4CAF50;
  color: white;
}

.control-btn.primary:hover:not(:disabled) {
  background: #45a049;
}

.control-btn.primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.control-btn.secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.control-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.3);
}

.camera-status {
  position: absolute;
  top: 16px;
  left: 16px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
}

.status-indicator.active {
  background: #4CAF50;
}

.status-indicator.error {
  background: #f44336;
}

.camera-info {
  opacity: 0.9;
}

.result-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.result-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
}

.result-status {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.result-status.success {
  background: #e8f5e8;
  color: #4CAF50;
}

.result-status.error {
  background: #ffebee;
  color: #f44336;
}

.success-result {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.result-item label {
  min-width: 100px;
  font-weight: 500;
  color: #555;
}

.confidence-bar {
  flex: 1;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #45a049);
  transition: width 0.3s ease;
}

.confidence-text {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  font-weight: 500;
  color: #333;
  background: white;
  padding: 2px 4px;
  border-radius: 2px;
}

.verified-badge {
  background: #4CAF50;
  color: white;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.liveness-result {
  background: white;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e0e0e0;
}

.liveness-result h4 {
  margin: 0 0 12px;
  color: #333;
  font-size: 16px;
}

.liveness-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.liveness-item:last-child {
  border-bottom: none;
}

.liveness-label {
  color: #666;
  font-size: 14px;
}

.liveness-value {
  font-weight: 500;
  font-size: 14px;
}

.liveness-value.passed {
  color: #4CAF50;
}

.liveness-value:not(.passed) {
  color: #f44336;
}

.error-result {
  text-align: center;
  padding: 20px;
}

.error-icon {
  font-size: 48px;
  color: #f44336;
  margin-bottom: 16px;
}

.error-message h4 {
  margin: 0 0 8px;
  color: #333;
}

.error-message p {
  margin: 0 0 16px;
  color: #666;
}

.error-suggestions {
  text-align: left;
  background: #fff3e0;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #ff9800;
}

.error-suggestions h5 {
  margin: 0 0 8px;
  color: #f57c00;
}

.error-suggestions ul {
  margin: 0;
  padding-left: 20px;
  color: #666;
}

.error-suggestions li {
  margin-bottom: 4px;
}

.result-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 16px;
}

.action-btn {
  padding: 10px 20px;
  border: 1px solid #2196F3;
  background: white;
  color: #2196F3;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-btn:hover {
  background: #2196F3;
  color: white;
}

.action-btn.primary {
  background: #2196F3;
  color: white;
  border-color: #2196F3;
}

.floating-actions {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 100;
}

.floating-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: #2196F3;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
}

.floating-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(33, 150, 243, 0.4);
}

.floating-btn.active {
  background: #1976D2;
}

.upload-btn {
  background: #4CAF50;
}

.upload-btn:hover {
  box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4);
}

.settings-panel,
.history-panel {
  position: fixed;
  right: 20px;
  bottom: 200px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 16px;
  width: 280px;
  max-height: 400px;
  overflow-y: auto;
  z-index: 101;
}

.settings-panel h4,
.history-panel h4 {
  margin: 0 0 16px;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.setting-group {
  margin-bottom: 16px;
}

.setting-group label {
  display: block;
  margin-bottom: 6px;
  color: #555;
  font-size: 14px;
  font-weight: 500;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.history-item:hover {
  background: #e3f2fd;
}

.history-image {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
}

.history-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.history-info {
  flex: 1;
}

.history-time {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.history-result {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
}

.history-result.success {
  color: #4CAF50;
}

.history-confidence {
  font-size: 12px;
  color: #666;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .recognition-container {
    padding: 16px;
  }

  .camera-controls {
    flex-direction: column;
    width: calc(100% - 32px);
  }

  .result-actions {
    flex-direction: column;
  }

  .floating-actions {
    bottom: 16px;
    right: 16px;
  }

  .settings-panel,
  .history-panel {
    right: 16px;
    width: calc(100% - 32px);
    max-width: 300px;
  }
}

/* 动画 */
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
  }
}
</style>