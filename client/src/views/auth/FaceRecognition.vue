<template>
  <div class="face-recognition-container">
    <div class="face-content">
      <div class="face-header">
        <el-icon :size="48" class="header-icon"><UserFilled /></el-icon>
        <h2>人脸识别登录</h2>
        <p>请将面部对准摄像头，进行身份验证</p>
      </div>

      <div class="video-container">
        <video ref="videoRef" autoplay playsinline class="video-preview"></video>
        <canvas ref="canvasRef" class="video-canvas"></canvas>
        <div class="face-frame" :class="{ detected: faceDetected }">
          <div class="corner top-left"></div>
          <div class="corner top-right"></div>
          <div class="corner bottom-left"></div>
          <div class="corner bottom-right"></div>
        </div>
        <div v-if="!cameraReady" class="camera-placeholder">
          <el-icon :size="64"><VideoCamera /></el-icon>
          <span>摄像头准备中...</span>
        </div>
      </div>

      <div class="status-message">
        <el-tag v-if="status === 'ready'" type="info" size="large">
          <el-icon><VideoCamera /></el-icon>
          请对准摄像头
        </el-tag>
        <el-tag v-else-if="status === 'detecting'" type="warning" size="large">
          <el-icon class="rotating"><Loading /></el-icon>
          检测中...
        </el-tag>
        <el-tag v-else-if="status === 'success'" type="success" size="large">
          <el-icon><CircleCheck /></el-icon>
          识别成功
        </el-tag>
        <el-tag v-else-if="status === 'error'" type="danger" size="large">
          <el-icon><CircleClose /></el-icon>
          {{ errorMessage }}
        </el-tag>
      </div>

      <div class="action-buttons">
        <el-button
          v-if="status !== 'processing'"
          type="primary"
          size="large"
          @click="startRecognition"
          :loading="status === 'initializing'"
        >
          <el-icon><VideoCamera /></el-icon>
          {{ cameraReady ? '开始识别' : '初始化摄像头' }}
        </el-button>

        <el-button v-if="status === 'success'" type="primary" size="large" @click="handleLogin">
          <el-icon><Right /></el-icon>
          立即登录
        </el-button>

        <el-button size="large" @click="handleBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
      </div>

      <div class="security-notice">
        <el-icon><Lock /></el-icon>
        <span>您的面部信息仅用于身份验证，不会被保存或分享</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  UserFilled,
  VideoCamera,
  Loading,
  CircleCheck,
  CircleClose,
  Right,
  ArrowLeft,
  Lock,
} from '@element-plus/icons-vue';

const router = useRouter();

const videoRef = ref(null);
const canvasRef = ref(null);
const cameraReady = ref(false);
const status = ref('ready');
const faceDetected = ref(false);
const errorMessage = ref('');

let stream = null;
let animationFrame = null;

onMounted(() => {
  initializeCamera();
});

onUnmounted(() => {
  stopCamera();
});

async function initializeCamera() {
  try {
    status.value = 'initializing';

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user',
      },
    });

    if (videoRef.value) {
      videoRef.value.srcObject = stream;
      cameraReady.value = true;
      status.value = 'ready';
    }
  } catch (error) {
    console.error('Camera access error:', error);
    errorMessage.value = '无法访问摄像头，请确保已授权摄像头权限';
    status.value = 'error';
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
}

async function startRecognition() {
  if (!cameraReady.value) {
    await initializeCamera();
    return;
  }

  status.value = 'detecting';
  faceDetected.value = false;

  // 模拟人脸检测过程
  await simulateDetection();
}

async function simulateDetection() {
  // 模拟检测动画
  for (let i = 0; i < 3; i++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    faceDetected.value = !faceDetected.value;
  }

  faceDetected.value = true;
  status.value = 'success';
}

async function handleLogin() {
  try {
    // 模拟登录过程
    await new Promise(resolve => setTimeout(resolve, 1000));
    router.push('/');
  } catch (error) {
    errorMessage.value = '登录失败，请重试';
    status.value = 'error';
  }
}

function handleBack() {
  router.back();
}
</script>

<style scoped>
.face-recognition-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
}

.face-content {
  max-width: 480px;
  width: 100%;
  text-align: center;
}

.face-header {
  margin-bottom: 32px;
}

.header-icon {
  color: #409eff;
  margin-bottom: 16px;
}

.face-header h2 {
  font-size: 24px;
  color: #1f2937;
  margin: 0 0 8px;
}

.face-header p {
  color: #6b7280;
  margin: 0;
}

.video-container {
  position: relative;
  width: 100%;
  max-width: 400px;
  margin: 0 auto 24px;
  aspect-ratio: 4/3;
  background: #1f2937;
  border-radius: 16px;
  overflow: hidden;
}

.video-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

.video-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.camera-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}

.camera-placeholder span {
  margin-top: 12px;
  font-size: 14px;
}

.face-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 250px;
  border: 3px dashed #6b7280;
  border-radius: 20px;
  transition: all 0.3s ease;
}

.face-frame.detected {
  border-color: #67c23a;
  border-style: solid;
  box-shadow: 0 0 20px rgba(103, 194, 58, 0.3);
}

.corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border-color: inherit;
  border-style: solid;
}

.corner.top-left {
  top: -1px;
  left: -1px;
  border-width: 3px 0 0 3px;
  border-radius: 16px 0 0 0;
}

.corner.top-right {
  top: -1px;
  right: -1px;
  border-width: 3px 3px 0 0;
  border-radius: 0 16px 0 0;
}

.corner.bottom-left {
  bottom: -1px;
  left: -1px;
  border-width: 0 0 3px 3px;
  border-radius: 0 0 0 16px;
}

.corner.bottom-right {
  bottom: -1px;
  right: -1px;
  border-width: 0 3px 3px 0;
  border-radius: 0 0 16px 0;
}

.status-message {
  margin-bottom: 24px;
  min-height: 40px;
}

.status-message .el-tag {
  padding: 12px 24px;
}

.status-message .el-icon {
  margin-right: 8px;
}

.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.action-buttons .el-button {
  min-width: 140px;
}

.action-buttons .el-button .el-icon {
  margin-right: 8px;
}

.security-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #9ca3af;
  font-size: 12px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.security-notice .el-icon {
  color: #67c23a;
}

@media (max-width: 480px) {
  .video-container {
    max-width: 100%;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons .el-button {
    width: 100%;
  }
}
</style>
