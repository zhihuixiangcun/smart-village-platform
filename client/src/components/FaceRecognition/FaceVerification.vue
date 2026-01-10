<template>
  <div class="face-verification-container">
    <!-- 步骤指示器 -->
    <div class="steps-indicator">
      <div
        v-for="(step, index) in steps"
        :key="index"
        class="step"
        :class="{
          active: currentStep === index,
          completed: index < currentStep,
        }"
      >
        <div class="step-number">{{ index + 1 }}</div>
        <div class="step-title">{{ step.title }}</div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="verification-content">
      <!-- 步骤1: 身份信息确认 -->
      <div v-if="currentStep === 0" class="step-content">
        <div class="identity-confirmation">
          <h3>确认身份信息</h3>
          <div class="user-info-card">
            <div class="user-avatar">
              <img v-if="userInfo.avatar" :src="userInfo.avatar" alt="用户头像" />
              <i v-else class="fas fa-user"></i>
            </div>
            <div class="user-details">
              <h4>{{ userInfo.name || '用户' + userInfo.id?.slice(-6) }}</h4>
              <p>{{ userInfo.idCard ? maskIDCard(userInfo.idCard) : '身份证号：***' }}</p>
              <p>{{ userInfo.phone ? maskPhone(userInfo.phone) : '手机号：***' }}</p>
              <p class="village-info">{{ userInfo.villageName || '村庄信息' }}</p>
            </div>
          </div>

          <div class="verification-note">
            <i class="fas fa-info-circle"></i>
            <span>请确认以上信息是否正确，然后进行人脸验证</span>
          </div>

          <div class="step-actions">
            <button @click="goBack" class="btn-secondary">返回</button>
            <button @click="nextStep" class="btn-primary">信息正确，开始验证</button>
          </div>
        </div>
      </div>

      <!-- 步骤2: 人脸采集 -->
      <div v-if="currentStep === 1" class="step-content">
        <FaceCapture
          ref="faceCapture"
          :title="'请将面部对准摄像头'"
          :instruction="'请保持正脸面对摄像头，确保光线充足'"
          :enable-liveness="enableLiveness"
          :enable-face-detection="true"
          @photo-captured="onPhotoCaptured"
          @confirm="onFaceConfirmed"
          @cancel="onVerificationCancelled"
          @liveness-completed="onLivenessCompleted"
        />
      </div>

      <!-- 步骤3: 验证结果 -->
      <div v-if="currentStep === 2" class="step-content">
        <div class="verification-result">
          <div class="result-icon" :class="verificationResult.success ? 'success' : 'failed'">
            <i
              :class="verificationResult.success ? 'fas fa-check-circle' : 'fas fa-times-circle'"
            ></i>
          </div>

          <h3>{{ verificationResult.success ? '验证成功' : '验证失败' }}</h3>

          <div class="result-details">
            <div class="detail-item">
              <span class="label">相似度：</span>
              <span class="value">{{ (verificationResult.similarity * 100).toFixed(1) }}%</span>
            </div>
            <div class="detail-item">
              <span class="label">置信度：</span>
              <span class="value">{{ (verificationResult.confidence * 100).toFixed(1) }}%</span>
            </div>
            <div v-if="enableLiveness" class="detail-item">
              <span class="label">活体检测：</span>
              <span
                class="value"
                :class="verificationResult.livenessVerified ? 'verified' : 'failed'"
              >
                {{ verificationResult.livenessVerified ? '通过' : '未通过' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">验证时间：</span>
              <span class="value">{{ formatTime(verificationResult.timestamp) }}</span>
            </div>
          </div>

          <div v-if="!verificationResult.success" class="failure-reason">
            <p><strong>失败原因：</strong>{{ verificationResult.message || '人脸匹配失败' }}</p>
          </div>

          <div class="result-actions">
            <button
              @click="retryVerification"
              class="btn-secondary"
              v-if="!verificationResult.success"
            >
              <i class="fas fa-redo"></i> 重新验证
            </button>
            <button
              @click="completeVerification"
              class="btn-primary"
              :class="verificationResult.success ? 'btn-success' : ''"
            >
              {{ verificationResult.success ? '完成' : '返回' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="isProcessing" class="loading-overlay">
      <div class="loading-content">
        <div class="spinner"></div>
        <p>{{ processingText }}</p>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMessage" class="error-toast">
      <i class="fas fa-exclamation-triangle"></i>
      <span>{{ errorMessage }}</span>
      <button @click="errorMessage = ''" class="close-btn">
        <i class="fas fa-times"></i>
      </button>
    </div>
  </div>
</template>

<script>
import FaceCapture from './FaceCapture.vue';
import { faceVerificationAPI } from '@/api/faceRecognition';

export default {
  name: 'FaceVerification',
  components: {
    FaceCapture,
  },
  props: {
    // 用户信息
    userId: {
      type: String,
      required: true,
    },
    userInfo: {
      type: Object,
      default: () => ({}),
    },
    // 验证配置
    villageId: {
      type: String,
      required: true,
    },
    enableLiveness: {
      type: Boolean,
      default: true,
    },
    // 是否为代理操作
    isProxyOperation: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      currentStep: 0,
      steps: [{ title: '身份确认' }, { title: '人脸验证' }, { title: '验证结果' }],

      isProcessing: false,
      processingText: '',
      errorMessage: '',

      // 验证相关数据
      capturedImageData: null,
      livenessResults: null,
      verificationResult: {
        success: false,
        similarity: 0,
        confidence: 0,
        livenessVerified: false,
        timestamp: null,
        message: '',
      },
    };
  },
  methods: {
    // 下一步
    nextStep() {
      if (this.currentStep < this.steps.length - 1) {
        this.currentStep++;
      }
    },

    // 上一步
    previousStep() {
      if (this.currentStep > 0) {
        this.currentStep--;
      }
    },

    // 返回
    goBack() {
      this.$emit('cancel');
    },

    // 照片捕获完成
    onPhotoCaptured(data) {
      this.capturedImageData = data.imageData;
    },

    // 活体检测完成
    onLivenessCompleted(results) {
      this.livenessResults = results;
    },

    // 人脸确认
    async onFaceConfirmed(data) {
      try {
        this.isProcessing = true;
        this.processingText = '正在进行人脸验证...';

        // 准备验证数据
        const verificationData = {
          image: data.imageData,
          userId: this.userId,
          villageId: this.villageId,
          requireLiveness: this.enableLiveness,
          livenessResults: this.livenessResults,
        };

        // 调用验证API
        const response = await faceVerificationAPI.verify(verificationData);

        if (response.success) {
          this.verificationResult = {
            success: response.data.isMatch,
            similarity: response.data.similarity,
            confidence: response.data.confidence,
            livenessVerified: response.data.livenessResult?.isLive || false,
            timestamp: response.data.verifiedAt || new Date().toISOString(),
            message: response.data.isMatch ? '验证成功' : '人脸不匹配',
          };

          // 记录验证日志
          this.logVerification('success', response.data);
        } else {
          throw new Error(response.error || '验证失败');
        }

        this.nextStep();
        this.$emit('verificationCompleted', this.verificationResult);
      } catch (error) {
        console.error('人脸验证失败:', error);

        this.verificationResult = {
          success: false,
          similarity: 0,
          confidence: 0,
          livenessVerified: false,
          timestamp: new Date().toISOString(),
          message: error.message || '验证服务异常',
        };

        this.nextStep();
        this.logVerification('failed', { error: error.message });
      } finally {
        this.isProcessing = false;
      }
    },

    // 验证取消
    onVerificationCancelled() {
      this.previousStep();
    },

    // 重新验证
    retryVerification() {
      this.currentStep = 1;
      this.capturedImageData = null;
      this.livenessResults = null;
      this.verificationResult = {
        success: false,
        similarity: 0,
        confidence: 0,
        livenessVerified: false,
        timestamp: null,
        message: '',
      };
    },

    // 完成验证
    completeVerification() {
      if (this.verificationResult.success) {
        this.$emit('success', this.verificationResult);
      } else {
        this.$emit('failed', this.verificationResult);
      }
    },

    // 记录验证日志
    logVerification(status, data) {
      const logData = {
        userId: this.userId,
        villageId: this.villageId,
        isProxyOperation: this.isProxyOperation,
        status,
        timestamp: new Date().toISOString(),
        data,
      };

      // 发送到后端记录日志
      this.$store.dispatch('logs/addVerificationLog', logData);
    },

    // 格式化时间
    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleString('zh-CN');
    },

    // 脱敏身份证号
    maskIDCard(idCard) {
      if (!idCard || idCard.length < 8) return idCard;
      return idCard.substring(0, 4) + '****' + idCard.substring(idCard.length - 4);
    },

    // 脱敏手机号
    maskPhone(phone) {
      if (!phone || phone.length < 7) return phone;
      return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
    },
  },

  // 生命周期钩子
  mounted() {
    // 如果是代理操作，记录代理开始
    if (this.isProxyOperation) {
      this.$store.dispatch('proxy/startProxySession', {
        principalUserId: this.userId,
        operation: 'face_verification',
      });
    }
  },

  beforeUnmount() {
    // 清理代理会话
    if (this.isProxyOperation) {
      this.$store.dispatch('proxy/endProxySession');
    }
  },
};
</script>

<style scoped>
.face-verification-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background: #f8f9fa;
  min-height: 600px;
}

.steps-indicator {
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
  position: relative;
}

.steps-indicator::before {
  content: '';
  position: absolute;
  top: 20px;
  left: 25%;
  right: 25%;
  height: 2px;
  background: #e0e0e0;
  z-index: 1;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 2;
  margin: 0 30px;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e0e0e0;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-bottom: 8px;
  transition: all 0.3s ease;
}

.step.active .step-number {
  background: #2196f3;
  color: white;
  transform: scale(1.1);
}

.step.completed .step-number {
  background: #4caf50;
  color: white;
}

.step-title {
  font-size: 14px;
  color: #666;
  text-align: center;
}

.step.active .step-title {
  color: #2196f3;
  font-weight: 500;
}

.step.completed .step-title {
  color: #4caf50;
}

.verification-content {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  min-height: 400px;
}

.step-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 身份确认步骤 */
.identity-confirmation {
  width: 100%;
  max-width: 500px;
}

.identity-confirmation h3 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

.user-info-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 2px solid #e9ecef;
}

.user-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #dee2e6;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
  overflow: hidden;
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar i {
  font-size: 32px;
  color: #6c757d;
}

.user-details {
  flex: 1;
}

.user-details h4 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 18px;
}

.user-details p {
  margin: 4px 0;
  color: #666;
  font-size: 14px;
}

.village-info {
  color: #2196f3 !important;
  font-weight: 500;
}

.verification-note {
  display: flex;
  align-items: center;
  padding: 15px;
  background: #e3f2fd;
  border-radius: 8px;
  margin-bottom: 30px;
  color: #1976d2;
  font-size: 14px;
}

.verification-note i {
  margin-right: 10px;
  font-size: 16px;
}

.step-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
}

/* 验证结果步骤 */
.verification-result {
  text-align: center;
  width: 100%;
  max-width: 400px;
}

.result-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  font-size: 40px;
}

.result-icon.success {
  background: #e8f5e8;
  color: #4caf50;
}

.result-icon.failed {
  background: #ffebee;
  color: #f44336;
}

.verification-result h3 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 24px;
}

.result-details {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  text-align: left;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-item .label {
  color: #666;
  font-size: 14px;
}

.detail-item .value {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.detail-item .value.verified {
  color: #4caf50;
}

.detail-item .value.failed {
  color: #f44336;
}

.failure-reason {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 20px;
  text-align: left;
}

.failure-reason p {
  margin: 0;
  color: #856404;
  font-size: 14px;
}

.result-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
}

/* 按钮样式 */
.btn-primary,
.btn-secondary,
.btn-success {
  padding: 12px 30px;
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

.btn-primary {
  background: #2196f3;
  color: white;
}

.btn-primary:hover {
  background: #1976d2;
}

.btn-success {
  background: #4caf50;
  color: white;
}

.btn-success:hover {
  background: #388e3c;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

/* 加载和错误状态 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  text-align: center;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2196f3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #f44336;
  color: white;
  padding: 15px 20px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 9999;
  max-width: 400px;
}

.error-toast i {
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
  margin-left: auto;
}

.close-btn:hover {
  opacity: 0.8;
}
</style>
