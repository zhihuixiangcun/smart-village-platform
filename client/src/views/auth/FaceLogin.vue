<template>
  <div class="face-login-container" role="main" aria-label="人脸识别登录页面">
    <!-- 左侧品牌区域 -->
    <aside class="brand-section" aria-labelledby="brand-title">
      <div class="brand-content">
        <div class="brand-logo">
          <div class="logo-icon" aria-hidden="true">
            <el-icon :size="60"><Grid /></el-icon>
          </div>
          <h1 id="brand-title" class="brand-name">智慧乡村</h1>
          <p class="brand-tag">Smart Village Platform</p>
        </div>

        <div class="face-auth-info">
          <div class="info-card">
            <el-icon :size="32" class="info-icon"><UserFilled /></el-icon>
            <h3>人脸识别登录</h3>
            <p>刷脸快速登录，安全便捷</p>
          </div>
          <div class="info-card">
            <el-icon :size="32" class="info-icon"><Lock /></el-icon>
            <h3>生物识别技术</h3>
            <p>采用先进的AI算法保护您的账户</p>
          </div>
          <div class="info-card">
            <el-icon :size="32" class="info-icon"><Medal /></el-icon>
            <h3>隐私保护</h3>
            <p>您的面部信息仅用于身份验证</p>
          </div>
        </div>

        <div class="background-effects" aria-hidden="true">
          <div class="effect-circle effect-1"></div>
          <div class="effect-circle effect-2"></div>
        </div>
      </div>
    </aside>

    <!-- 右侧登录区域 -->
    <section class="login-section" aria-labelledby="face-login-heading">
      <div class="login-content">
        <!-- 头部 -->
        <header class="login-header">
          <h2 id="face-login-heading" class="login-title">人脸识别登录</h2>
          <p class="login-subtitle">请将面部对准摄像头进行身份验证</p>
        </header>

        <!-- 视频区域 -->
        <div class="video-wrapper">
          <div class="video-container">
            <!-- 视频流 -->
            <video
              ref="videoRef"
              autoplay
              playsinline
              muted
              class="video-feed"
              :class="{ 'mirror': !settings.frontCamera }"
            ></video>

            <!-- 绘制层 -->
            <canvas ref="canvasRef" class="overlay-canvas"></canvas>

            <!-- 人脸检测框 -->
            <div class="face-guide-frame" :class="frameClasses">
              <!-- 四角装饰 -->
              <div class="corner-frame top-left"></div>
              <div class="corner-frame top-right"></div>
              <div class="corner-frame bottom-left"></div>
              <div class="corner-frame bottom-right"></div>

              <!-- 扫描动画 -->
              <div v-if="isScanning" class="scan-line">
                <div class="scan-glow"></div>
              </div>
            </div>

            <!-- 摄像头未就绪提示 -->
            <div v-if="!cameraReady" class="camera-placeholder">
              <el-icon :size="64" class="placeholder-icon"><VideoCamera /></el-icon>
              <p class="placeholder-text">
                {{ status === 'initializing' ? '正在启动摄像头...' : '点击下方按钮启动摄像头' }}
              </p>
            </div>

            <!-- 检测到的人脸标记 -->
            <div
              v-for="(face, index) in detectedFaces"
              :key="index"
              class="face-marker"
              :style="getFaceMarkerStyle(face)"
            >
              <div class="face-box"></div>
              <div class="face-label">{{ face.confidence ? `${Math.round(face.confidence * 100)}%` : '' }}</div>
            </div>
          </div>
        </div>

        <!-- 状态显示 -->
        <div class="status-display">
          <transition name="fade" mode="out-in">
            <!-- 准备状态 -->
            <div v-if="status === 'ready'" key="ready" class="status-card ready">
              <el-icon :size="48" class="status-icon"><VideoCamera /></el-icon>
              <h3>准备就绪</h3>
              <p>请将面部对准摄像头</p>
            </div>

            <!-- 检测中状态 -->
            <div v-else-if="status === 'detecting'" key="detecting" class="status-card detecting">
              <el-icon :size="48" class="status-icon rotating"><Loading /></el-icon>
              <h3>正在检测</h3>
              <p>请保持面部在框内</p>
              <div class="detection-tips">
                <span class="tip-item" :class="{ active: detectionTip === 0 }">
                  <el-icon><Check /></el-icon> 保持光线充足
                </span>
                <span class="tip-item" :class="{ active: detectionTip === 1 }">
                  <el-icon><Check /></el-icon> 正面面对摄像头
                </span>
                <span class="tip-item" :class="{ active: detectionTip === 2 }">
                  <el-icon><Check /></el-icon> 摘除眼镜口罩
                </span>
              </div>
            </div>

            <!-- 识别成功状态 -->
            <div v-else-if="status === 'success'" key="success" class="status-card success">
              <el-icon :size="48" class="status-icon success-icon"><CircleCheck /></el-icon>
              <h3>识别成功</h3>
              <p>欢迎回来，{{ userInfo.name || '用户' }}！</p>
              <div class="user-info">
                <el-avatar :size="64" :src="userInfo.avatar">
                  <el-icon><UserFilled /></el-icon>
                </el-avatar>
                <div class="user-details">
                  <div class="user-name">{{ userInfo.name || '用户' }}</div>
                  <div class="user-role">{{ userInfo.role || '村民' }}</div>
                </div>
              </div>
            </div>

            <!-- 识别失败状态 -->
            <div v-else-if="status === 'failed'" key="failed" class="status-card failed">
              <el-icon :size="48" class="status-icon"><CircleClose /></el-icon>
              <h3>识别失败</h3>
              <p>{{ errorMessage || '无法识别您的面部，请重试或使用其他登录方式' }}</p>
              <div class="retry-options">
                <el-button type="primary" @click="retryRecognition">
                  <el-icon><Refresh /></el-icon> 重新识别
                </el-button>
              </div>
            </div>

            <!-- 错误状态 -->
            <div v-else-if="status === 'error'" key="error" class="status-card error">
              <el-icon :size="48" class="status-icon"><Warning /></el-icon>
              <h3>出错了</h3>
              <p>{{ errorMessage }}</p>
            </div>
          </transition>
        </div>

        <!-- 进度条 -->
        <div v-if="showProgress" class="progress-container">
          <el-progress
            :percentage="recognitionProgress"
            :status="progressStatus"
            :stroke-width="8"
            :show-text="true"
          >
            <template #default="{ percentage }">
              <span class="progress-text">{{ percentage }}% {{ progressText }}</span>
            </template>
          </el-progress>
        </div>

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <!-- 开始/停止识别按钮 -->
          <el-button
            v-if="!isRecognizing && status !== 'success'"
            type="primary"
            size="large"
            @click="toggleRecognition"
            :loading="status === 'initializing'"
            :disabled="!cameraReady && status !== 'initializing'"
            class="primary-btn"
          >
            <el-icon><VideoCamera /></el-icon>
            {{ cameraReady ? '开始识别' : '启动摄像头' }}
          </el-button>

          <!-- 登录按钮（识别成功后） -->
          <el-button
            v-if="status === 'success'"
            type="primary"
            size="large"
            @click="handleLogin"
            class="primary-btn"
          >
            <el-icon><Right /></el-icon>
            立即登录
          </el-button>

          <!-- 切换到密码登录 -->
          <el-button size="large" @click="switchToPasswordLogin" class="secondary-btn">
            <el-icon><Lock /></el-icon>
            密码登录
          </el-button>

          <!-- 返回按钮 -->
          <el-button size="large" @click="goBack" class="text-btn">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
        </div>

        <!-- 安全提示 -->
        <div class="security-notice">
          <el-icon><Lock /></el-icon>
          <div class="notice-content">
            <p>您的面部信息仅用于本次身份验证，不会被保存或分享。</p>
            <p>识别过程采用端到端加密保护。</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Grid,
  UserFilled,
  Lock,
  Medal,
  VideoCamera,
  Loading,
  CircleCheck,
  CircleClose,
  Warning,
  Right,
  ArrowLeft,
  Refresh,
  Check
} from '@element-plus/icons-vue';
import { faceIdentificationAPI } from '@/api/faceRecognition';
import { login } from '@/api/auth';

const router = useRouter();
const route = useRoute();

// Refs
const videoRef = ref(null);
const canvasRef = ref(null);

// 状态管理
const status = ref('ready'); // ready, initializing, detecting, success, failed, error
const cameraReady = ref(false);
const isRecognizing = ref(false);
const isScanning = ref(false);
const detectedFaces = ref([]);
const errorMessage = ref('');
const userInfo = ref({});
const recognitionProgress = ref(0);
const detectionTip = ref(0);

// 设置
const settings = ref({
  frontCamera: true,
  detectionTimeout: 10000,
  maxRetries: 3,
  requireLiveness: true
});

// 计算属性
const frameClasses = computed(() => ({
  'detected': detectedFaces.value.length > 0,
  'scanning': isScanning.value,
  'success': status.value === 'success',
  'error': status.value === 'failed' || status.value === 'error'
}));

const showProgress = computed(() =>
  status.value === 'detecting' || status.value === 'initializing'
);

const progressStatus = computed(() => {
  if (status.value === 'success') return 'success';
  if (status.value === 'failed' || status.value === 'error') return 'exception';
  return undefined;
});

const progressText = computed(() => {
  if (status.value === 'initializing') return '启动中';
  if (status.value === 'detecting') return '识别中';
  return '';
});

// 变量
let stream = null;
let detectionTimer = null;
let progressTimer = null;
let tipTimer = null;
let retryCount = 0;

/**
 * 组件挂载
 */
onMounted(async () => {
  // 检查浏览器支持
  if (!checkBrowserSupport()) {
    status.value = 'error';
    errorMessage.value = '您的浏览器不支持人脸识别功能，请使用最新版Chrome、Edge或Safari浏览器';
    return;
  }

  // 请求摄像头权限
  await requestCameraPermission();
});

/**
 * 组件卸载
 */
onUnmounted(() => {
  cleanup();
});

/**
 * 检查浏览器支持
 */
function checkBrowserSupport() {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    window.CanvasRenderingContext2D
  );
}

/**
 * 请求摄像头权限
 */
async function requestCameraPermission() {
  try {
    status.value = 'initializing';
    updateProgress(10, '正在请求摄像头权限...');

    // 尝试获取摄像头权限
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: settings.value.frontCamera ? 'user' : 'environment'
      },
      audio: false
    });

    if (videoRef.value) {
      videoRef.value.srcObject = stream;
      await videoRef.value.play();
      cameraReady.value = true;
      status.value = 'ready';
      updateProgress(100, '摄像头就绪');
      ElMessage.success('摄像头已启动');
    }
  } catch (error) {
    console.error('Camera permission error:', error);
    status.value = 'error';

    if (error.name === 'NotAllowedError') {
      errorMessage.value = '未授权摄像头访问权限，请在浏览器设置中允许摄像头权限后刷新页面';
      showPermissionGuide();
    } else if (error.name === 'NotFoundError') {
      errorMessage.value = '未检测到摄像头设备，请确保已连接摄像头';
    } else {
      errorMessage.value = `摄像头启动失败: ${error.message}`;
    }
  }
}

/**
 * 显示权限引导
 */
async function showPermissionGuide() {
  try {
    await ElMessageBox.confirm(
      '需要摄像头权限才能使用人脸识别登录。请点击下方按钮查看权限设置教程。',
      '需要摄像头权限',
      {
        confirmButtonText: '查看教程',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    // 可以打开权限设置教程页面
    window.open('https://support.google.com/chrome/answer/2693767', '_blank');
  } catch {
    // 用户取消
  }
}

/**
 * 切换识别状态
 */
async function toggleRecognition() {
  if (isRecognizing.value) {
    stopRecognition();
  } else {
    await startRecognition();
  }
}

/**
 * 开始识别
 */
async function startRecognition() {
  if (!cameraReady.value) {
    await requestCameraPermission();
    return;
  }

  isRecognizing.value = true;
  isScanning.value = true;
  status.value = 'detecting';
  retryCount = 0;

  updateProgress(0, '开始人脸检测...');
  startDetectionLoop();
  startProgressAnimation();
  startTipRotation();
}

/**
 * 停止识别
 */
function stopRecognition() {
  isRecognizing.value = false;
  isScanning.value = false;
  detectedFaces.value = [];
  stopDetectionLoop();
  stopProgressAnimation();
  stopTipRotation();
}

/**
 * 开始检测循环
 */
function startDetectionLoop() {
  const canvas = canvasRef.value;
  const video = videoRef.value;

  if (!canvas || !video) return;

  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  let lastDetectionTime = Date.now();

  detectionTimer = setInterval(async () => {
    if (!isRecognizing.value || status.value !== 'detecting') return;

    // 限制检测频率为每秒2次
    const now = Date.now();
    if (now - lastDetectionTime < 500) return;
    lastDetectionTime = now;

    try {
      // 捕获当前帧
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      // 调用人脸检测API
      const result = await faceIdentificationAPI.identify({
        image: imageData,
        villageId: route.query.villageId || 'default',
        maxResults: 1
      });

      if (result.success && result.data && result.data.length > 0) {
        // 检测到人脸
        const face = result.data[0];
        detectedFaces.value = [face];

        // 置信度足够高，识别成功
        if (face.confidence > 0.8) {
          handleRecognitionSuccess(face);
        } else {
          // 置信度不够，继续检测
          updateProgress(
            Math.min(90, recognitionProgress.value + 10),
            '请保持面部清晰'
          );
        }
      } else {
        detectedFaces.value = [];
      }
    } catch (error) {
      console.error('Face detection error:', error);
      // 继续检测，不中断流程
    }
  }, 500);

  // 设置超时
  setTimeout(() => {
    if (status.value === 'detecting') {
      handleRecognitionTimeout();
    }
  }, settings.value.detectionTimeout);
}

/**
 * 停止检测循环
 */
function stopDetectionLoop() {
  if (detectionTimer) {
    clearInterval(detectionTimer);
    detectionTimer = null;
  }
}

/**
 * 处理识别成功
 */
function handleRecognitionSuccess(face) {
  stopRecognition();

  status.value = 'success';
  updateProgress(100, '识别成功');
  isScanning.value = false;

  userInfo.value = {
    id: face.userId,
    name: face.name || '用户',
    role: face.role || '村民',
    avatar: face.avatar || ''
  };

  ElMessage.success('识别成功！');

  // 自动登录（可选）
  // setTimeout(() => handleLogin(), 1500);
}

/**
 * 处理识别超时
 */
function handleRecognitionTimeout() {
  retryCount++;

  if (retryCount < settings.value.maxRetries) {
    ElMessage.warning(`未检测到人脸，请调整姿势后重试 (${retryCount}/${settings.value.maxRetries})`);
    status.value = 'ready';
    isScanning.value = false;
    updateProgress(0, '');
    detectedFaces.value = [];
  } else {
    handleRecognitionFailed('识别超时，请尝试调整光线或使用密码登录');
  }
}

/**
 * 处理识别失败
 */
function handleRecognitionFailed(message) {
  stopRecognition();
  status.value = 'failed';
  errorMessage.value = message;
  updateProgress(0, '');
}

/**
 * 重新识别
 */
function retryRecognition() {
  status.value = 'ready';
  errorMessage.value = '';
  retryCount = 0;
}

/**
 * 更新进度
 */
function updateProgress(value, text) {
  recognitionProgress.value = value;
}

/**
 * 开始进度动画
 */
function startProgressAnimation() {
  let progress = 0;
  progressTimer = setInterval(() => {
    if (status.value !== 'detecting') {
      stopProgressAnimation();
      return;
    }
    progress += 2;
    if (progress > 90) progress = 90;
    updateProgress(progress, progressText.value);
  }, 200);
}

/**
 * 停止进度动画
 */
function stopProgressAnimation() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

/**
 * 开始提示轮播
 */
function startTipRotation() {
  tipTimer = setInterval(() => {
    detectionTip.value = (detectionTip.value + 1) % 3;
  }, 2000);
}

/**
 * 停止提示轮播
 */
function stopTipRotation() {
  if (tipTimer) {
    clearInterval(tipTimer);
    tipTimer = null;
  }
}

/**
 * 处理登录
 */
async function handleLogin() {
  try {
    ElMessage.info('正在登录...');

    // 调用登录API
    const result = await login({
      faceId: userInfo.value.id,
      loginType: 'face'
    });

    if (result.success) {
      ElMessage.success('登录成功！');
      // 保存token
      localStorage.setItem('token', result.token);
      localStorage.setItem('userInfo', JSON.stringify(result.user));

      // 跳转到首页或重定向页面
      const redirect = route.query.redirect || '/';
      router.push(redirect);
    } else {
      throw new Error(result.message || '登录失败');
    }
  } catch (error) {
    console.error('Login error:', error);
    ElMessage.error(error.message || '登录失败，请重试');
    status.value = 'failed';
    errorMessage.value = error.message;
  }
}

/**
 * 切换到密码登录
 */
function switchToPasswordLogin() {
  router.push({
    path: '/login',
    query: route.query
  });
}

/**
 * 返回上一页
 */
function goBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/login');
  }
}

/**
 * 获取人脸标记样式
 */
function getFaceMarkerStyle(face) {
  if (!face.boundingBox) return {};

  const video = videoRef.value;
  if (!video) return {};

  const scaleX = video.offsetWidth / video.videoWidth;
  const scaleY = video.offsetHeight / video.videoHeight;

  return {
    left: `${face.boundingBox.x * scaleX}px`,
    top: `${face.boundingBox.y * scaleY}px`,
    width: `${face.boundingBox.width * scaleX}px`,
    height: `${face.boundingBox.height * scaleY}px`
  };
}

/**
 * 清理资源
 */
function cleanup() {
  stopRecognition();
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
}
</script>

<style scoped>
/* 主容器 */
.face-login-container {
  display: flex;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 品牌区域 */
.brand-section {
  flex: 1;
  padding: 60px 40px;
  color: white;
  position: relative;
  overflow: hidden;
}

.brand-content {
  position: relative;
  z-index: 2;
}

.brand-logo {
  margin-bottom: 60px;
}

.logo-icon {
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 16px;
}

.brand-name {
  font-size: 36px;
  font-weight: 700;
  margin: 0 0 8px;
}

.brand-tag {
  font-size: 16px;
  opacity: 0.8;
  margin: 0;
}

.face-auth-info {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 24px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.info-icon {
  color: white;
  margin-bottom: 12px;
}

.info-card h3 {
  font-size: 18px;
  margin: 0 0 8px;
}

.info-card p {
  font-size: 14px;
  opacity: 0.8;
  margin: 0;
}

/* 背景效果 */
.background-effects {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.effect-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.effect-1 {
  width: 300px;
  height: 300px;
  top: -100px;
  right: -100px;
  animation: float 6s ease-in-out infinite;
}

.effect-2 {
  width: 200px;
  height: 200px;
  bottom: -50px;
  left: -50px;
  animation: float 8s ease-in-out infinite reverse;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

/* 登录区域 */
.login-section {
  flex: 1;
  max-width: 600px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.login-content {
  width: 100%;
  max-width: 480px;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px;
}

.login-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

/* 视频区域 */
.video-wrapper {
  margin-bottom: 24px;
}

.video-container {
  position: relative;
  width: 100%;
  aspect-ratio: 4/3;
  background: #1f2937;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.video-feed {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-feed.mirror {
  transform: scaleX(-1);
}

.overlay-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* 人脸引导框 */
.face-guide-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 240px;
  height: 320px;
  border: 2px dashed rgba(255, 255, 255, 0.5);
  border-radius: 24px;
  transition: all 0.3s ease;
}

.face-guide-frame.detected {
  border-color: #67c23a;
  border-style: solid;
  box-shadow: 0 0 30px rgba(103, 194, 58, 0.3);
}

.face-guide-frame.scanning {
  animation: pulse 2s ease-in-out infinite;
}

.face-guide-frame.success {
  border-color: #67c23a;
  box-shadow: 0 0 40px rgba(103, 194, 58, 0.5);
}

.face-guide-frame.error {
  border-color: #f56c6c;
  animation: shake 0.5s ease-in-out;
}

.corner-frame {
  position: absolute;
  width: 24px;
  height: 24px;
  border-color: inherit;
  border-style: solid;
}

.corner-frame.top-left {
  top: -2px;
  left: -2px;
  border-width: 4px 0 0 4px;
  border-radius: 20px 0 0 0;
}

.corner-frame.top-right {
  top: -2px;
  right: -2px;
  border-width: 4px 4px 0 0;
  border-radius: 0 20px 0 0;
}

.corner-frame.bottom-left {
  bottom: -2px;
  left: -2px;
  border-width: 0 0 4px 4px;
  border-radius: 0 0 0 20px;
}

.corner-frame.bottom-right {
  bottom: -2px;
  right: -2px;
  border-width: 0 4px 4px 0;
  border-radius: 0 0 20px 0;
}

/* 扫描线 */
.scan-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, transparent, #67c23a, transparent);
  animation: scan 2s ease-in-out infinite;
}

.scan-glow {
  position: absolute;
  inset: -8px;
  background: rgba(103, 194, 58, 0.3);
  filter: blur(8px);
}

@keyframes scan {
  0% { top: 0; }
  50% { top: calc(100% - 4px); }
  100% { top: 0; }
}

@keyframes pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.02); }
}

@keyframes shake {
  0%, 100% { transform: translate(-50%, -50%) translateX(0); }
  25% { transform: translate(-50%, -50%) translateX(-5px); }
  75% { transform: translate(-50%, -50%) translateX(5px); }
}

/* 摄像头占位符 */
.camera-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(31, 41, 55, 0.8);
}

.placeholder-icon {
  margin-bottom: 16px;
}

.placeholder-text {
  font-size: 14px;
  text-align: center;
  margin: 0;
}

/* 人脸标记 */
.face-marker {
  position: absolute;
  border: 2px solid #67c23a;
  border-radius: 8px;
  pointer-events: none;
  transition: all 0.2s ease;
}

.face-label {
  position: absolute;
  top: -24px;
  left: 0;
  background: #67c23a;
  color: white;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

/* 状态显示 */
.status-display {
  margin-bottom: 24px;
  min-height: 120px;
}

.status-card {
  text-align: center;
  padding: 24px;
  border-radius: 12px;
  background: #f5f7fa;
}

.status-card.ready {
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
}

.status-card.detecting {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.status-card.success {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
}

.status-card.failed {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
}

.status-card.error {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
}

.status-icon {
  margin-bottom: 12px;
  color: #409eff;
}

.status-card.success .status-icon {
  color: #67c23a;
}

.status-card.failed .status-icon,
.status-card.error .status-icon {
  color: #f56c6c;
}

.status-card h3 {
  font-size: 20px;
  margin: 0 0 8px;
  color: #1f2937;
}

.status-card p {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 16px;
}

.detection-tips {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.tip-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  color: #6b7280;
  opacity: 0.5;
  transition: all 0.3s ease;
}

.tip-item.active {
  opacity: 1;
  color: #f59e0b;
  font-weight: 500;
}

.user-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
}

.user-details {
  text-align: left;
}

.user-name {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.user-role {
  font-size: 14px;
  color: #6b7280;
}

.retry-options {
  margin-top: 16px;
}

/* 进度条 */
.progress-container {
  margin-bottom: 24px;
}

.progress-text {
  font-size: 14px;
  font-weight: 500;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.primary-btn {
  flex: 1;
  min-width: 160px;
  height: 48px;
  font-size: 16px;
}

.secondary-btn {
  flex: 1;
  min-width: 160px;
  height: 48px;
  font-size: 16px;
}

.text-btn {
  min-width: 120px;
  height: 48px;
}

/* 安全提示 */
.security-notice {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #f0fdf4;
  border-radius: 8px;
  border: 1px solid #bbf7d0;
}

.security-notice .el-icon {
  color: #22c55e;
  flex-shrink: 0;
}

.notice-content {
  flex: 1;
}

.notice-content p {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
  line-height: 1.6;
}

/* 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 响应式 */
@media (max-width: 968px) {
  .face-login-container {
    flex-direction: column;
  }

  .brand-section {
    padding: 40px 20px;
  }

  .login-section {
    max-width: 100%;
    padding: 24px;
  }

  .face-auth-info {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .info-card {
    flex: 1;
    min-width: 200px;
  }
}

@media (max-width: 640px) {
  .login-section {
    padding: 16px;
  }

  .login-content {
    max-width: 100%;
  }

  .action-buttons {
    flex-direction: column;
  }

  .primary-btn,
  .secondary-btn,
  .text-btn {
    width: 100%;
  }
}
</style>
