<template>
  <div class="face-capture-container">
    <!-- 顶部标题和说明 -->
    <div class="capture-header">
      <h3>{{ title }}</h3>
      <p class="instruction">{{ instruction }}</p>
    </div>

    <!-- 主内容区域 -->
    <div class="capture-content">
      <!-- 视频预览区域 -->
      <div class="video-container" v-if="!imageCaptured">
        <video
          ref="videoElement"
          :class="{ 'mirror': mirrorMode }"
          autoplay
          playsinline
          muted
        ></video>

        <!-- 人脸检测框 -->
        <canvas
          ref="overlayCanvas"
          class="overlay-canvas"
          :class="{ 'mirror': mirrorMode }"
        ></canvas>

        <!-- 活体检测提示 -->
        <div v-if="livenessActive && currentAction" class="liveness-prompt">
          <div class="action-icon">
            <i :class="getActionIcon(currentAction)"></i>
          </div>
          <div class="action-text">{{ getActionText(currentAction) }}</div>
          <div class="action-progress">
            <div class="progress-bar" :style="{ width: `${livenessProgress}%` }"></div>
          </div>
        </div>

        <!-- 质量指示器 -->
        <div class="quality-indicator" :class="getQualityClass(faceQuality)">
          <div class="quality-label">图像质量</div>
          <div class="quality-value">{{ faceQuality }}%</div>
        </div>
      </div>

      <!-- 图像预览区域 -->
      <div class="image-preview" v-else>
        <img :src="capturedImage" alt="Captured face" />
        <div class="preview-actions">
          <button @click="retakePhoto" class="btn-secondary">
            <i class="fas fa-redo"></i> 重新拍摄
          </button>
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="capture-controls">
        <button
          @click="startCapture"
          :disabled="isProcessing"
          class="btn-primary capture-btn"
          v-if="!imageCaptured && !isStreaming"
        >
          <i class="fas fa-camera"></i> 开始拍摄
        </button>

        <button
          @click="capturePhoto"
          :disabled="!canCapture || isProcessing"
          class="btn-primary capture-btn"
          v-if="isStreaming && !imageCaptured"
        >
          <i class="fas fa-camera"></i> 拍摄照片
        </button>

        <button
          @click="confirmCapture"
          :disabled="isProcessing"
          class="btn-success confirm-btn"
          v-if="imageCaptured"
        >
          <i class="fas fa-check"></i> 确认使用
        </button>

        <button
          @click="cancelCapture"
          :disabled="isProcessing"
          class="btn-danger cancel-btn"
          v-if="isStreaming || imageCaptured"
        >
          <i class="fas fa-times"></i> 取消
        </button>
      </div>

      <!-- 错误提示 -->
      <div v-if="errorMessage" class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        {{ errorMessage }}
      </div>

      <!-- 处理中状态 -->
      <div v-if="isProcessing" class="processing-overlay">
        <div class="processing-content">
          <div class="spinner"></div>
          <p>{{ processingText }}</p>
        </div>
      </div>
    </div>

    <!-- 设置面板 -->
    <div class="settings-panel" v-if="showSettings">
      <h4>拍摄设置</h4>
      <div class="setting-item">
        <label>镜像模式</label>
        <input type="checkbox" v-model="mirrorMode" />
      </div>
      <div class="setting-item">
        <label>活体检测</label>
        <input type="checkbox" v-model="enableLiveness" />
      </div>
      <div class="setting-item">
        <label>人脸检测</label>
        <input type="checkbox" v-model="enableFaceDetection" />
      </div>
      <button @click="showSettings = false" class="btn-secondary">关闭</button>
    </div>

    <!-- 设置按钮 -->
    <button @click="showSettings = !showSettings" class="settings-btn">
      <i class="fas fa-cog"></i>
    </button>
  </div>
</template>

<script>
import * as faceApi from 'face-api.js';

export default {
  name: 'FaceCapture',
  props: {
    title: {
      type: String,
      default: '人脸识别'
    },
    instruction: {
      type: String,
      default: '请将面部对准摄像头，保持光线充足'
    },
    enableLiveness: {
      type: Boolean,
      default: true
    },
    enableFaceDetection: {
      type: Boolean,
      default: true
    },
    mirrorMode: {
      type: Boolean,
      default: true
    },
    captureTimeout: {
      type: Number,
      default: 30000
    }
  },
  data() {
    return {
      isStreaming: false,
      imageCaptured: false,
      capturedImage: null,
      isProcessing: false,
      processingText: '',
      errorMessage: '',
      showSettings: false,

      // 人脸检测相关
      faceDetected: false,
      faceQuality: 0,
      faceBox: null,
      detectionInterval: null,

      // 活体检测相关
      livenessActive: false,
      currentAction: null,
      livenessProgress: 0,
      livenessActions: ['blink', 'mouth', 'head'],
      livenessResults: {},

      // 摄像头相关
      stream: null,
      videoConstraints: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      }
    };
  },
  computed: {
    canCapture() {
      if (!this.enableFaceDetection) return true;
      return this.faceDetected && this.faceQuality >= 70;
    }
  },
  async mounted() {
    await this.loadModels();
  },
  beforeUnmount() {
    this.stopCamera();
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
    }
  },
  methods: {
    // 加载人脸识别模型
    async loadModels() {
      try {
        this.processingText = '加载模型中...';
        this.isProcessing = true;

        const MODEL_URL = '/models';
        await Promise.all([
          faceApi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceApi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceApi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);

        this.isProcessing = false;
        this.$emit('modelsLoaded');
      } catch (error) {
        console.error('加载模型失败:', error);
        this.errorMessage = '模型加载失败，请刷新页面重试';
        this.isProcessing = false;
      }
    },

    // 开始摄像头
    async startCapture() {
      try {
        this.processingText = '启动摄像头...';
        this.isProcessing = true;

        const video = this.$refs.videoElement;
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: this.videoConstraints,
          audio: false
        });

        video.srcObject = this.stream;

        video.onloadedmetadata = () => {
          video.play();
          this.isStreaming = true;
          this.isProcessing = false;

          if (this.enableFaceDetection) {
            this.startFaceDetection();
          }

          if (this.enableLiveness) {
            this.startLivenessDetection();
          }
        };

      } catch (error) {
        console.error('启动摄像头失败:', error);
        this.errorMessage = this.getCameraErrorMessage(error);
        this.isProcessing = false;
      }
    },

    // 开始人脸检测
    startFaceDetection() {
      const video = this.$refs.videoElement;
      const canvas = this.$refs.overlayCanvas;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      this.detectionInterval = setInterval(async () => {
        if (!this.isStreaming || this.imageCaptured) return;

        try {
          const detections = await faceApi
            .detectAllFaces(video, new faceApi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptors();

          context.clearRect(0, 0, canvas.width, canvas.height);

          if (detections.length > 0) {
            const detection = detections[0];
            const box = detection.detection.box;

            // 绘制人脸框
            context.strokeStyle = '#00ff00';
            context.lineWidth = 2;
            context.strokeRect(box.x, box.y, box.width, box.height);

            // 计算人脸质量
            this.faceQuality = this.calculateFaceQuality(detection);
            this.faceBox = box;
            this.faceDetected = true;

            this.$emit('faceDetected', {
              box,
              quality: this.faceQuality,
              landmarks: detection.landmarks,
              descriptor: detection.descriptor
            });

          } else {
            this.faceDetected = false;
            this.faceQuality = 0;
            this.faceBox = null;
          }

        } catch (error) {
          console.error('人脸检测错误:', error);
        }
      }, 100);
    },

    // 开始活体检测
    async startLivenessDetection() {
      this.livenessActive = true;
      this.livenessResults = {};

      for (const action of this.livenessActions) {
        await this.performLivenessAction(action);
      }

      this.livenessActive = false;
      this.$emit('livenessCompleted', this.livenessResults);
    },

    // 执行活体检测动作
    async performLivenessAction(action) {
      return new Promise((resolve) => {
        this.currentAction = action;
        this.livenessProgress = 0;

        const duration = action === 'blink' ? 3000 : 5000;
        const startTime = Date.now();

        const checkAction = setInterval(() => {
          const elapsed = Date.now() - startTime;
          this.livenessProgress = Math.min((elapsed / duration) * 100, 100);

          // 这里应该调用后端API进行活体检测
          // 暂时使用模拟数据
          if (elapsed >= duration) {
            this.livenessResults[action] = {
              success: Math.random() > 0.1, // 90%成功率
              confidence: 0.8 + Math.random() * 0.2
            };

            clearInterval(checkAction);
            resolve();
          }
        }, 100);
      });
    },

    // 拍摄照片
    async capturePhoto() {
      try {
        this.processingText = '处理照片中...';
        this.isProcessing = true;

        const video = this.$refs.videoElement;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext('2d');

        // 如果是镜像模式，水平翻转图像
        if (this.mirrorMode) {
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }

        context.drawImage(video, 0, 0);

        // 转换为Base64
        this.capturedImage = canvas.toDataURL('image/jpeg', 0.9);
        this.imageCaptured = true;

        this.isProcessing = false;
        this.$emit('photoCaptured', {
          imageData: this.capturedImage,
          faceBox: this.faceBox,
          quality: this.faceQuality
        });

      } catch (error) {
        console.error('拍摄照片失败:', error);
        this.errorMessage = '拍摄失败，请重试';
        this.isProcessing = false;
      }
    },

    // 重新拍摄
    retakePhoto() {
      this.imageCaptured = false;
      this.capturedImage = null;
      this.faceDetected = false;
      this.faceQuality = 0;

      if (this.enableLiveness) {
        this.startLivenessDetection();
      }
    },

    // 确认拍摄
    confirmCapture() {
      this.$emit('confirm', {
        imageData: this.capturedImage,
        livenessResults: this.livenessResults
      });
    },

    // 取消拍摄
    cancelCapture() {
      this.stopCamera();
      this.reset();
      this.$emit('cancel');
    },

    // 停止摄像头
    stopCamera() {
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }

      if (this.detectionInterval) {
        clearInterval(this.detectionInterval);
        this.detectionInterval = null;
      }

      this.isStreaming = false;
    },

    // 重置状态
    reset() {
      this.imageCaptured = false;
      this.capturedImage = null;
      this.faceDetected = false;
      this.faceQuality = 0;
      this.faceBox = null;
      this.livenessActive = false;
      this.currentAction = null;
      this.livenessProgress = 0;
      this.livenessResults = {};
      this.errorMessage = '';
    },

    // 计算人脸质量
    calculateFaceQuality(detection) {
      const box = detection.detection.box;
      const landmarks = detection.landmarks;

      let quality = 0;

      // 基于人脸大小的评分 (0-30分)
      const faceSize = box.width * box.height;
      const minSize = 100 * 100;
      const maxSize = 300 * 300;
      if (faceSize >= minSize && faceSize <= maxSize) {
        quality += 30 * (faceSize - minSize) / (maxSize - minSize);
      }

      // 基于人脸位置的评分 (0-20分)
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      const video = this.$refs.videoElement;
      const idealX = video.videoWidth / 2;
      const idealY = video.videoHeight / 2;

      const distance = Math.sqrt(
        Math.pow(centerX - idealX, 2) + Math.pow(centerY - idealY, 2)
      );
      const maxDistance = Math.sqrt(
        Math.pow(idealX, 2) + Math.pow(idealY, 2)
      );

      quality += 20 * (1 - distance / maxDistance);

      // 基于关键点清晰度的评分 (0-30分)
      if (landmarks) {
        const keyPoints = landmarks.positions;
        const variance = this.calculateVariance(keyPoints);
        quality += 30 * Math.min(variance / 1000, 1);
      }

      // 基于检测置信度的评分 (0-20分)
      const score = detection.detection.score;
      quality += 20 * score;

      return Math.round(Math.min(quality, 100));
    },

    // 计算方差
    calculateVariance(points) {
      const meanX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
      const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

      const variance = points.reduce((sum, p) => {
        return sum + Math.pow(p.x - meanX, 2) + Math.pow(p.y - meanY, 2);
      }, 0) / points.length;

      return variance;
    },

    // 获取质量等级样式
    getQualityClass(quality) {
      if (quality >= 80) return 'quality-high';
      if (quality >= 60) return 'quality-medium';
      return 'quality-low';
    },

    // 获取动作图标
    getActionIcon(action) {
      const icons = {
        blink: 'fas fa-eye',
        mouth: 'fas fa-mouth',
        head: 'fas fa-arrows-alt',
        left: 'fas fa-arrow-left',
        right: 'fas fa-arrow-right'
      };
      return icons[action] || 'fas fa-question';
    },

    // 获取动作文本
    getActionText(action) {
      const texts = {
        blink: '请眨眼',
        mouth: '请张嘴',
        head: '请摇头',
        left: '请向左转头',
        right: '请向右转头'
      };
      return texts[action] || '请配合验证';
    },

    // 获取摄像头错误信息
    getCameraErrorMessage(error) {
      const errorMessages = {
        'NotAllowedError': '摄像头权限被拒绝，请在浏览器设置中允许摄像头访问',
        'NotFoundError': '未找到摄像头设备，请检查摄像头连接',
        'NotReadableError': '摄像头被其他应用占用，请关闭其他使用摄像头的应用',
        'OverconstrainedError': '摄像头不满足要求，请尝试其他摄像头',
        'SecurityError': '摄像头访问被安全策略阻止'
      };

      return errorMessages[error.name] || '摄像头启动失败，请检查设备连接和权限设置';
    }
  }
};
</script>

<style scoped>
.face-capture-container {
  position: relative;
  max-width: 640px;
  margin: 0 auto;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.capture-header {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #eee;
}

.capture-header h3 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 18px;
}

.instruction {
  margin: 0;
  color: #666;
  font-size: 14px;
  line-height: 1.4;
}

.capture-content {
  position: relative;
  padding: 20px;
}

.video-container {
  position: relative;
  width: 100%;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.video-container video {
  width: 100%;
  height: auto;
  display: block;
}

.video-container .mirror {
  transform: scaleX(-1);
}

.overlay-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.liveness-prompt {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 15px 20px;
  border-radius: 8px;
  text-align: center;
  min-width: 200px;
}

.action-icon {
  font-size: 24px;
  margin-bottom: 10px;
}

.action-text {
  font-size: 16px;
  margin-bottom: 10px;
}

.action-progress {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: #4caf50;
  border-radius: 2px;
  transition: width 0.1s ease;
}

.quality-indicator {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
}

.quality-indicator.quality-high {
  background: rgba(76, 175, 80, 0.8);
}

.quality-indicator.quality-medium {
  background: rgba(255, 193, 7, 0.8);
}

.quality-indicator.quality-low {
  background: rgba(244, 67, 54, 0.8);
}

.image-preview {
  text-align: center;
}

.image-preview img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  border: 2px solid #4caf50;
}

.preview-actions {
  margin-top: 15px;
}

.capture-controls {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
}

.capture-btn, .confirm-btn, .cancel-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.capture-btn {
  background: #2196f3;
  color: white;
}

.capture-btn:hover:not(:disabled) {
  background: #1976d2;
}

.confirm-btn {
  background: #4caf50;
  color: white;
}

.confirm-btn:hover:not(:disabled) {
  background: #388e3c;
}

.cancel-btn {
  background: #f44336;
  color: white;
}

.cancel-btn:hover:not(:disabled) {
  background: #d32f2f;
}

.capture-btn:disabled,
.confirm-btn:disabled,
.cancel-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  margin-top: 15px;
  padding: 12px;
  background: #ffebee;
  color: #c62828;
  border-radius: 6px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.processing-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.processing-content {
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2196f3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.settings-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.settings-panel h4 {
  margin: 0 0 15px 0;
  font-size: 14px;
  color: #333;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.setting-item label {
  font-size: 13px;
  color: #666;
}

.settings-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.settings-btn:hover {
  background: rgba(0, 0, 0, 0.7);
}

.btn-secondary {
  background: #666;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #555;
}
</style>