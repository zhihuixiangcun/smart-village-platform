<template>
  <div class="face-registration-container" role="main" aria-label="人脸注册组件">
    <!-- 步骤指示器 -->
    <div class="step-indicator" aria-label="注册进度">
      <div
        v-for="(step, index) in steps"
        :key="index"
        class="step-item"
        :class="{
          'active': currentStep === index,
          'completed': index < currentStep
        }"
      >
        <div class="step-circle">
          <el-icon v-if="index < currentStep"><Check /></el-icon>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <div class="step-label">{{ step.label }}</div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="registration-content">
      <!-- 步骤1: 欢迎和说明 -->
      <transition name="fade" mode="out-in">
        <div v-if="currentStep === 0" key="welcome" class="step-content welcome-step">
          <div class="welcome-card">
            <div class="welcome-icon">
              <el-icon :size="80" color="#409eff"><UserFilled /></el-icon>
            </div>
            <h2>欢迎使用人脸注册</h2>
            <p class="welcome-desc">人脸识别为您提供更安全、更便捷的身份验证方式</p>

            <div class="features-list">
              <div class="feature-item">
                <el-icon :size="24" color="#67c23a"><CircleCheck /></el-icon>
                <span>快速登录，无需记忆密码</span>
              </div>
              <div class="feature-item">
                <el-icon :size="24" color="#67c23a"><CircleCheck /></el-icon>
                <span>生物识别，安全可靠</span>
              </div>
              <div class="feature-item">
                <el-icon :size="24" color="#67c23a"><CircleCheck /></el-icon>
                <span>隐私保护，数据加密存储</span>
              </div>
            </div>

            <div class="notice-box">
              <el-icon :size="20" color="#e6a23c"><Warning /></el-icon>
              <div class="notice-content">
                <p><strong>注意事项：</strong></p>
                <ul>
                  <li>请确保环境光线充足</li>
                  <li>摘除眼镜、帽子等遮挡物</li>
                  <li>保持面部正对摄像头</li>
                  <li>按照提示完成多角度采集</li>
                </ul>
              </div>
            </div>

            <el-button type="primary" size="large" @click="nextStep" class="action-btn">
              开始注册
              <el-icon class="ml-2"><Right /></el-icon>
            </el-button>
          </div>
        </div>

        <!-- 步骤2: 人脸采集引导 -->
        <div v-else-if="currentStep === 1" key="guide" class="step-content guide-step">
          <div class="guide-card">
            <h3>人脸采集引导</h3>
            <p>请按照以下提示完成人脸采集，确保最佳识别效果</p>

            <div class="guide-visual">
              <div class="face-silhouette">
                <div class="face-outline"></div>
                <div class="guide-areas">
                  <div class="guide-area eyes">
                    <el-icon><View /></el-icon>
                    <span>眼睛</span>
                  </div>
                  <div class="guide-area nose">
                    <el-icon><Operation /></el-icon>
                    <span>鼻子</span>
                  </div>
                  <div class="guide-area mouth">
                    <el-icon><ChatDotRound /></el-icon>
                    <span>嘴巴</span>
                  </div>
                </div>
              </div>

              <div class="guide-tips">
                <div class="tip-card" :class="{ active: guideStep === 0 }">
                  <div class="tip-icon">💡</div>
                  <div class="tip-content">
                    <h4>光线充足</h4>
                    <p>确保面部光线均匀，避免背光或强光直射</p>
                  </div>
                </div>
                <div class="tip-card" :class="{ active: guideStep === 1 }">
                  <div class="tip-icon">😐</div>
                  <div class="tip-content">
                    <h4>表情自然</h4>
                    <p>保持自然表情，嘴巴闭合，眼睛睁开</p>
                  </div>
                </div>
                <div class="tip-card" :class="{ active: guideStep === 2 }">
                  <div class="tip-icon">📐</div>
                  <div class="tip-content">
                    <h4>正视前方</h4>
                    <p>面部正对摄像头，保持水平姿态</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="guide-actions">
              <el-button @click="prevStep">
                <el-icon><ArrowLeft /></el-icon> 返回
              </el-button>
              <el-button type="primary" @click="startCapture">
                <el-icon><VideoCamera /></el-icon> 开始采集
              </el-button>
            </div>
          </div>
        </div>

        <!-- 步骤3: 多角度采集 -->
        <div v-else-if="currentStep === 2" key="capture" class="step-content capture-step">
          <div class="capture-container">
            <!-- 视频区域 -->
            <div class="video-wrapper">
              <div class="video-container">
                <video
                  ref="videoRef"
                  autoplay
                  playsinline
                  muted
                  class="video-feed"
                  :class="{ mirror: !settings.frontCamera }"
                ></video>

                <canvas ref="canvasRef" class="overlay-canvas"></canvas>

                <!-- 角度引导框 -->
                <div class="angle-guide" :class="currentAngleClass">
                  <div class="guide-frame">
                    <div class="corner top-left"></div>
                    <div class="corner top-right"></div>
                    <div class="corner bottom-left"></div>
                    <div class="corner bottom-right"></div>
                  </div>

                  <!-- 角度指示器 -->
                  <div class="angle-indicator">
                    <div class="angle-icon">
                      <component :is="getAngleIcon(currentAngle)" />
                    </div>
                    <div class="angle-text">{{ getAngleText(currentAngle) }}</div>
                  </div>

                  <!-- 扫描动画 -->
                  <div v-if="isCapturing" class="scan-animation">
                    <div class="scan-line"></div>
                  </div>
                </div>

                <!-- 质量指示器 -->
                <div class="quality-panel" v-if="cameraReady">
                  <div class="quality-item" :class="{ good: imageQuality.brightness >= 70 }">
                    <el-icon><Sunny /></el-icon>
                    <span>光照</span>
                    <span class="quality-value">{{ imageQuality.brightness }}%</span>
                  </div>
                  <div class="quality-item" :class="{ good: imageQuality.sharpness >= 70 }">
                    <el-icon><Crop /></el-icon>
                    <span>清晰度</span>
                    <span class="quality-value">{{ imageQuality.sharpness }}%</span>
                  </div>
                  <div class="quality-item" :class="{ good: imageQuality.angle >= 70 }">
                    <el-icon><Compass /></el-icon>
                    <span>角度</span>
                    <span class="quality-value">{{ imageQuality.angle }}%</span>
                  </div>
                </div>

                <!-- 摄像头占位符 -->
                <div v-if="!cameraReady" class="camera-placeholder">
                  <el-icon :size="64"><VideoCamera /></el-icon>
                  <p>正在启动摄像头...</p>
                </div>
              </div>

              <!-- 已采集图像预览 -->
              <div class="captured-images">
                <div
                  v-for="(img, index) in capturedImages"
                  :key="index"
                  class="captured-thumb"
                  :class="{ active: index === currentAngle }"
                >
                  <img :src="img.data" :alt="`角度 ${index + 1}`" />
                  <div class="thumb-badge">
                    <el-icon><Check /></el-icon>
                  </div>
                </div>
                <div
                  v-for="index in (captureAngles.length - capturedImages.length)"
                  :key="'pending-' + index"
                  class="captured-thumb pending"
                >
                  <el-icon><Plus /></el-icon>
                </div>
              </div>
            </div>

            <!-- 采集控制 -->
            <div class="capture-controls">
              <div class="capture-info">
                <h4>{{ getAngleTitle(currentAngle) }}</h4>
                <p>{{ getAngleInstruction(currentAngle) }}</p>
              </div>

              <div class="progress-bar">
                <el-progress
                  :percentage="captureProgress"
                  :stroke-width="10"
                  :show-text="true"
                >
                  <template #default="{ percentage }">
                    <span class="progress-text">{{ capturedImages.length }}/{{ captureAngles.length }} 完成</span>
                  </template>
                </el-progress>
              </div>

              <div class="control-buttons">
                <el-button v-if="!isCapturing" @click="prevStep" :disabled="isProcessing">
                  <el-icon><ArrowLeft /></el-icon> 返回
                </el-button>

                <el-button
                  v-if="!isCapturing"
                  type="primary"
                  size="large"
                  @click="captureCurrentAngle"
                  :disabled="!canCapture || isProcessing"
                >
                  <el-icon><Camera /></el-icon>
                  {{ isProcessing ? '处理中...' : '采集此角度' }}
                </el-button>

                <el-button
                  v-if="capturedImages.length === captureAngles.length"
                  type="success"
                  size="large"
                  @click="nextStep"
                >
                  <el-icon><Right /></el-icon>
                  下一步
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 步骤4: 注册确认 -->
        <div v-else-if="currentStep === 3" key="confirm" class="step-content confirm-step">
          <div class="confirm-card">
            <h3>确认注册信息</h3>
            <p>请确认您的人脸信息，提交后将无法修改</p>

            <div class="captured-preview">
              <div
                v-for="(img, index) in capturedImages"
                :key="index"
                class="preview-item"
              >
                <img :src="img.data" :alt="`角度 ${index + 1}`" />
                <div class="preview-label">{{ getAngleLabel(index) }}</div>
                <div class="preview-quality">
                  质量评分: <span :class="getQualityClass(img.quality)">
                    {{ img.quality }}%
                  </span>
                </div>
              </div>
            </div>

            <div class="quality-summary">
              <h4>质量评估</h4>
              <div class="summary-stats">
                <div class="stat-item">
                  <span class="stat-label">平均质量:</span>
                  <span class="stat-value" :class="getQualityClass(averageQuality)">
                    {{ averageQuality }}%
                  </span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">采集数量:</span>
                  <span class="stat-value">{{ capturedImages.length }}/{{ captureAngles.length }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">建议状态:</span>
                  <span class="stat-value" :class="{ good: averageQuality >= 70, bad: averageQuality < 70 }">
                    {{ averageQuality >= 70 ? '符合要求' : '建议重新采集' }}
                </span>
                </div>
              </div>
            </div>

            <div class="confirm-actions">
              <el-button @click="prevStep" :disabled="isSubmitting">
                <el-icon><ArrowLeft /></el-icon> 返回重新采集
              </el-button>
              <el-button
                type="primary"
                size="large"
                @click="submitRegistration"
                :loading="isSubmitting"
              >
                <el-icon><Check /></el-icon>
                {{ isSubmitting ? '提交中...' : '确认注册' }}
              </el-button>
            </div>

            <el-checkbox v-model="agreedToTerms" class="terms-checkbox">
              我已阅读并同意
              <el-link type="primary">《人脸数据采集协议》</el-link>
              和
              <el-link type="primary">《隐私政策》</el-link>
            </el-checkbox>
          </div>
        </div>

        <!-- 步骤5: 注册成功 -->
        <div v-else-if="currentStep === 4" key="success" class="step-content success-step">
          <div class="success-card">
            <div class="success-animation">
              <div class="success-circle">
                <el-icon :size="80" color="#67c23a"><CircleCheck /></el-icon>
              </div>
              <div class="success-particles">
                <div v-for="i in 8" :key="i" class="particle"></div>
              </div>
            </div>

            <h2>注册成功！</h2>
            <p>您的人脸信息已成功注册，现在可以使用人脸识别登录了</p>

            <div class="success-features">
              <div class="success-feature">
                <el-icon :size="32" color="#409eff"><VideoCamera /></el-icon>
                <div>
                  <h4>人脸登录</h4>
                  <p>刷脸快速登录</p>
                </div>
              </div>
              <div class="success-feature">
                <el-icon :size="32" color="#409eff"><Lock /></el-icon>
                <div>
                  <h4>安全验证</h4>
                  <p>生物识别保护</p>
                </div>
              </div>
              <div class="success-feature">
                <el-icon :size="32" color="#409eff"><Medal /></el-icon>
                <div>
                  <h4>便捷体验</h4>
                  <p>无需记忆密码</p>
                </div>
              </div>
            </div>

            <div class="success-actions">
              <el-button size="large" @click="goToLogin">
                <el-icon><Right /></el-icon>
                前往登录
              </el-button>
              <el-button size="large" @click="goToProfile">
                <el-icon><User /></el-icon>
                个人中心
              </el-button>
            </div>

            <div class="success-notice">
              <el-icon><InfoFilled /></el-icon>
              <span>您可以在个人中心随时管理或删除人脸数据</span>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- 错误提示 -->
    <el-dialog
      v-model="showErrorDialog"
      title="采集失败"
      width="400px"
      :close-on-click-modal="false"
    >
      <div class="error-content">
        <el-icon :size="48" color="#f56c6c"><CircleClose /></el-icon>
        <p>{{ errorMessage }}</p>
        <div class="error-suggestions">
          <p><strong>建议：</strong></p>
          <ul>
            <li v-for="(suggestion, index) in errorSuggestions" :key="index">
              {{ suggestion }}
            </li>
          </ul>
        </div>
      </div>
      <template #footer>
        <el-button @click="showErrorDialog = false">关闭</el-button>
        <el-button type="primary" @click="retryCapture">重试</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Check,
  Right,
  ArrowLeft,
  UserFilled,
  CircleCheck,
  Warning,
  VideoCamera,
  View,
  Operation,
  ChatDotRound,
  Sunny,
  Crop,
  Compass,
  Camera,
  Plus,
  Lock,
  Medal,
  User,
  InfoFilled,
  CircleClose
} from '@element-plus/icons-vue';
import { faceRegistrationAPI } from '@/api/faceRecognition';

const router = useRouter();

// Props
const props = defineProps({
  userId: {
    type: String,
    default: ''
  },
  villageId: {
    type: String,
    default: 'default'
  },
  autoStart: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['success', 'cancel', 'progress']);

// Refs
const videoRef = ref(null);
const canvasRef = ref(null);

// 步骤管理
const steps = [
  { label: '欢迎' },
  { label: '引导' },
  { label: '采集' },
  { label: '确认' },
  { label: '完成' }
];

const currentStep = ref(0);
const guideStep = ref(0);

// 采集配置
const captureAngles = ['front', 'left', 'right', 'up', 'down'];
const currentAngle = ref(0);
const capturedImages = ref([]);

// 相机状态
const cameraReady = ref(false);
const isCapturing = ref(false);
const isProcessing = ref(false);
const isSubmitting = ref(false);

let stream = null;
let captureTimer = null;
let qualityTimer = null;
let guideTimer = null;

// 设置
const settings = ref({
  frontCamera: true,
  captureDelay: 1000,
  qualityThreshold: 70
});

// 图像质量
const imageQuality = ref({
  brightness: 0,
  sharpness: 0,
  angle: 0
});

// 错误处理
const showErrorDialog = ref(false);
const errorMessage = ref('');
const errorSuggestions = ref([]);

// 用户协议
const agreedToTerms = ref(false);

// 计算属性
const captureProgress = computed(() => {
  return (capturedImages.value.length / captureAngles.length) * 100;
});

const averageQuality = computed(() => {
  if (capturedImages.value.length === 0) return 0;
  const sum = capturedImages.value.reduce((acc, img) => acc + img.quality, 0);
  return Math.round(sum / capturedImages.value.length);
});

const canCapture = computed(() => {
  return cameraReady.value &&
         imageQuality.value.brightness >= settings.value.qualityThreshold &&
         imageQuality.value.sharpness >= settings.value.qualityThreshold &&
         imageQuality.value.angle >= settings.value.qualityThreshold;
});

const currentAngleClass = computed(() => {
  return `angle-${captureAngles[currentAngle.value]}`;
});

// 生命周期
onMounted(() => {
  if (props.autoStart) {
    startCapture();
  }
});

onUnmounted(() => {
  cleanup();
});

// 监听引导步骤
watch(currentStep, (newStep) => {
  if (newStep === 1) {
    startGuideRotation();
  } else {
    stopGuideRotation();
  }

  if (newStep === 2) {
    initializeCamera();
  }

  emit('progress', newStep);
});

// 步骤控制
function nextStep() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++;
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--;
    if (currentStep.value === 1) {
      stopCamera();
    }
  }
}

// 引导轮播
function startGuideRotation() {
  guideStep.value = 0;
  guideTimer = setInterval(() => {
    guideStep.value = (guideStep.value + 1) % 3;
  }, 3000);
}

function stopGuideRotation() {
  if (guideTimer) {
    clearInterval(guideTimer);
    guideTimer = null;
  }
}

// 初始化摄像头
async function initializeCamera() {
  try {
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
      startQualityMonitoring();
    }
  } catch (error) {
    console.error('Camera initialization error:', error);
    showError('无法访问摄像头', [
      '请检查摄像头是否连接正常',
      '确保已授予摄像头访问权限',
      '尝试刷新页面重新开始'
    ]);
  }
}

// 停止摄像头
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  stopQualityMonitoring();
  cameraReady.value = false;
}

// 开始采集
function startCapture() {
  currentStep.value = 2;
  initializeCamera();
}

// 质量监测
function startQualityMonitoring() {
  qualityTimer = setInterval(() => {
    if (!cameraReady.value || !videoRef.value) return;

    // 模拟质量检测
    // TODO: 实现真实的图像质量分析算法
    imageQuality.value = {
      brightness: Math.floor(70 + Math.random() * 30),
      sharpness: Math.floor(70 + Math.random() * 30),
      angle: Math.floor(70 + Math.random() * 30)
    };
  }, 500);
}

function stopQualityMonitoring() {
  if (qualityTimer) {
    clearInterval(qualityTimer);
    qualityTimer = null;
  }
}

// 采集当前角度
async function captureCurrentAngle() {
  if (!canCapture.value) {
    ElMessage.warning('图像质量不符合要求，请调整后重试');
    return;
  }

  isCapturing.value = true;
  isProcessing.value = true;

  try {
    // 等待捕获延迟
    await new Promise(resolve => setTimeout(resolve, settings.value.captureDelay));

    // 捕获图像
    const canvas = canvasRef.value;
    const video = videoRef.value;

    if (canvas && video) {
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const imageData = canvas.toDataURL('image/jpeg', 0.95);

      // 计算综合质量分数
      const quality = Math.round(
        (imageQuality.value.brightness +
         imageQuality.value.sharpness +
         imageQuality.value.angle) / 3
      );

      // 保存图像
      capturedImages.value.push({
        angle: captureAngles[currentAngle.value],
        data: imageData,
        quality: quality,
        timestamp: new Date()
      });

      ElMessage.success(`${getAngleTitle(currentAngle.value)}采集成功`);

      // 移动到下一个角度
      if (currentAngle.value < captureAngles.length - 1) {
        currentAngle.value++;
      } else {
        isCapturing.value = false;
      }
    }
  } catch (error) {
    console.error('Capture error:', error);
    showError('图像采集失败', [
      '请确保摄像头正常工作',
      '尝试调整光线和角度',
      '检查浏览器是否支持摄像头API'
    ]);
  } finally {
    isProcessing.value = false;
  }
}

// 提交注册
async function submitRegistration() {
  if (!agreedToTerms.value) {
    ElMessage.warning('请先阅读并同意相关协议');
    return;
  }

  if (capturedImages.value.length === 0) {
    ElMessage.warning('请先完成人脸采集');
    return;
  }

  isSubmitting.value = true;

  try {
    // 准备注册数据
    const registrationData = {
      userId: props.userId,
      villageId: props.villageId,
      images: capturedImages.value.map(img => img.data),
      angles: capturedImages.value.map(img => img.angle),
      quality: averageQuality.value,
      metadata: {
        deviceInfo: navigator.userAgent,
        captureTime: new Date().toISOString(),
        imageCount: capturedImages.value.length
      }
    };

    // 调用注册API
    const result = await faceRegistrationAPI.registerFace(registrationData);

    if (result.success) {
      ElMessage.success('人脸注册成功！');
      nextStep();
      emit('success', result.data);
    } else {
      throw new Error(result.message || '注册失败');
    }
  } catch (error) {
    console.error('Registration error:', error);
    showError(error.message || '注册失败，请稍后重试', [
      '检查网络连接是否正常',
      '确保所有图像质量符合要求',
      '联系技术支持获取帮助'
    ]);
  } finally {
    isSubmitting.value = false;
  }
}

// 显示错误
function showError(message, suggestions = []) {
  errorMessage.value = message;
  errorSuggestions.value = suggestions;
  showErrorDialog.value = true;
}

// 重试采集
function retryCapture() {
  showErrorDialog.value = false;
  errorMessage.value = '';
  errorSuggestions.value = [];
}

// 导航
function goToLogin() {
  router.push('/auth/login');
}

function goToProfile() {
  router.push('/profile');
}

// 辅助函数
function getAngleIcon(angle) {
  const icons = {
    front: 'View',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    up: 'ArrowUp',
    down: 'ArrowDown'
  };
  return icons[angle] || 'View';
}

function getAngleText(angle) {
  const texts = {
    front: '正面',
    left: '左侧',
    right: '右侧',
    up: '仰头',
    down: '低头'
  };
  return texts[angle] || '';
}

function getAngleTitle(angle) {
  return `采集${getAngleText(captureAngles[currentAngle.value])}视角`;
}

function getAngleInstruction(angle) {
  const instructions = {
    0: '请正对摄像头，保持面部水平',
    1: '请向左转头约45度',
    2: '请向右转头约45度',
    3: '请稍微仰头',
    4: '请稍微低头'
  };
  return instructions[currentAngle.value] || '';
}

function getAngleLabel(index) {
  const labels = ['正面', '左侧', '右侧', '仰头', '低头'];
  return labels[index] || '';
}

function getQualityClass(quality) {
  if (quality >= 80) return 'excellent';
  if (quality >= 70) return 'good';
  if (quality >= 50) return 'fair';
  return 'poor';
}

// 清理资源
function cleanup() {
  stopGuideRotation();
  stopCamera();
  stopQualityMonitoring();
}
</script>

<style scoped>
/* 主容器 */
.face-registration-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

/* 步骤指示器 */
.step-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 48px;
  gap: 24px;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.step-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #6b7280;
  transition: all 0.3s ease;
}

.step-item.active .step-circle {
  background: #409eff;
  color: white;
  box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.2);
}

.step-item.completed .step-circle {
  background: #67c23a;
  color: white;
}

.step-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.step-item.active .step-label {
  color: #409eff;
}

/* 步骤内容 */
.step-content {
  min-height: 500px;
}

/* 欢迎步骤 */
.welcome-step {
  display: flex;
  justify-content: center;
  align-items: center;
}

.welcome-card {
  text-align: center;
  max-width: 600px;
}

.welcome-icon {
  margin-bottom: 24px;
}

.welcome-card h2 {
  font-size: 32px;
  margin: 0 0 16px;
  color: #1f2937;
}

.welcome-desc {
  font-size: 18px;
  color: #6b7280;
  margin-bottom: 32px;
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
  text-align: left;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
}

.notice-box {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #fef3c7;
  border-radius: 12px;
  margin-bottom: 32px;
  text-align: left;
}

.notice-content ul {
  margin: 8px 0 0;
  padding-left: 20px;
}

.notice-content li {
  margin: 4px 0;
}

.action-btn {
  width: 240px;
  height: 48px;
  font-size: 16px;
}

.ml-2 {
  margin-left: 8px;
}

/* 引导步骤 */
.guide-card {
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
}

.guide-card h3 {
  font-size: 28px;
  margin-bottom: 8px;
}

.guide-visual {
  display: flex;
  gap: 48px;
  margin: 48px 0;
  align-items: center;
}

.face-silhouette {
  position: relative;
  width: 200px;
  height: 200px;
}

.face-outline {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 4px dashed #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
}

.guide-areas {
  position: absolute;
  inset: 0;
}

.guide-area {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
  color: #6b7280;
}

.guide-area.eyes {
  top: 30%;
  left: 50%;
  transform: translateX(-50%);
}

.guide-area.nose {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.guide-area.mouth {
  bottom: 25%;
  left: 50%;
  transform: translateX(-50%);
}

.guide-tips {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tip-card {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: #f9fafb;
  border-radius: 12px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.tip-card.active {
  border-color: #409eff;
  background: #eff6ff;
}

.tip-icon {
  font-size: 32px;
}

.tip-content {
  text-align: left;
  flex: 1;
}

.tip-content h4 {
  margin: 0 0 4px;
  color: #1f2937;
}

.tip-content p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.guide-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

/* 采集步骤 */
.capture-container {
  max-width: 1000px;
  margin: 0 auto;
}

.video-wrapper {
  display: flex;
  gap: 24px;
}

.video-container {
  flex: 1;
  position: relative;
  aspect-ratio: 4/3;
  background: #1f2937;
  border-radius: 16px;
  overflow: hidden;
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
  pointer-events: none;
}

/* 角度引导框 */
.angle-guide {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.guide-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 240px;
  height: 320px;
}

.corner {
  position: absolute;
  width: 32px;
  height: 32px;
  border: 4px solid rgba(255, 255, 255, 0.8);
}

.corner.top-left {
  top: 0;
  left: 0;
  border-right: none;
  border-bottom: none;
  border-radius: 16px 0 0 0;
}

.corner.top-right {
  top: 0;
  right: 0;
  border-left: none;
  border-bottom: none;
  border-radius: 0 16px 0 0;
}

.corner.bottom-left {
  bottom: 0;
  left: 0;
  border-right: none;
  border-top: none;
  border-radius: 0 0 0 16px;
}

.corner.bottom-right {
  bottom: 0;
  right: 0;
  border-left: none;
  border-top: none;
  border-radius: 0 0 16px 0;
}

/* 角度指示器 */
.angle-indicator {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  color: white;
}

.angle-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.angle-text {
  font-size: 18px;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

/* 扫描动画 */
.scan-animation {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.scan-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, transparent, #67c23a, transparent);
  animation: scan 2s ease-in-out infinite;
}

@keyframes scan {
  0% { top: 0; }
  50% { top: calc(100% - 4px); }
  100% { top: 0; }
}

/* 质量面板 */
.quality-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quality-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  color: white;
  font-size: 12px;
}

.quality-item.good {
  background: rgba(103, 194, 58, 0.8);
}

.quality-value {
  margin-left: auto;
  font-weight: 600;
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
}

/* 已采集图像 */
.captured-images {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.captured-thumb {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #e5e7eb;
  position: relative;
}

.captured-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.captured-thumb.active {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.thumb-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  background: #67c23a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
}

.captured-thumb.pending {
  border: 2px dashed #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}

/* 采集控制 */
.capture-controls {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  background: #f9fafb;
  border-radius: 16px;
}

.capture-info h4 {
  font-size: 20px;
  margin: 0 0 8px;
  color: #1f2937;
}

.capture-info p {
  color: #6b7280;
  margin: 0;
}

.progress-bar {
  margin: 16px 0;
}

.progress-text {
  font-weight: 600;
}

.control-buttons {
  display: flex;
  gap: 12px;
  margin-top: auto;
}

/* 确认步骤 */
.confirm-card {
  max-width: 800px;
  margin: 0 auto;
}

.captured-preview {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin: 32px 0;
  flex-wrap: wrap;
}

.preview-item {
  text-align: center;
}

.preview-item img {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
}

.preview-label {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
}

.preview-quality {
  margin-top: 4px;
  font-size: 12px;
  color: #9ca3af;
}

.quality-summary {
  background: #f9fafb;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 24px;
}

.quality-summary h4 {
  margin: 0 0 16px;
}

.summary-stats {
  display: flex;
  justify-content: space-around;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.stat-value.good {
  color: #67c23a;
}

.stat-value.bad {
  color: #f56c6c;
}

.excellent {
  color: #67c23a;
}

.good {
  color: #409eff;
}

.fair {
  color: #e6a23c;
}

.poor {
  color: #f56c6c;
}

.confirm-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 24px;
}

.terms-checkbox {
  display: flex;
  justify-content: center;
}

/* 成功步骤 */
.success-step {
  display: flex;
  justify-content: center;
}

.success-card {
  text-align: center;
  max-width: 600px;
}

.success-animation {
  position: relative;
  width: 160px;
  height: 160px;
  margin: 0 auto 32px;
}

.success-circle {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #f0f9ff;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: scaleIn 0.5s ease-out;
}

@keyframes scaleIn {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.success-particles {
  position: absolute;
  inset: 0;
}

.particle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #67c23a;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  animation: particle 1s ease-out infinite;
}

.particle:nth-child(1) { animation-delay: 0s; }
.particle:nth-child(2) { animation-delay: 0.1s; }
.particle:nth-child(3) { animation-delay: 0.2s; }
.particle:nth-child(4) { animation-delay: 0.3s; }
.particle:nth-child(5) { animation-delay: 0.4s; }
.particle:nth-child(6) { animation-delay: 0.5s; }
.particle:nth-child(7) { animation-delay: 0.6s; }
.particle:nth-child(8) { animation-delay: 0.7s; }

@keyframes particle {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(3);
    opacity: 0;
  }
}

.success-card h2 {
  font-size: 32px;
  margin: 0 0 16px;
  color: #1f2937;
}

.success-features {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin: 32px 0;
}

.success-feature {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.success-feature h4 {
  margin: 0;
  font-size: 16px;
}

.success-feature p {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.success-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 24px;
}

.success-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #6b7280;
  font-size: 14px;
}

/* 错误对话框 */
.error-content {
  text-align: center;
}

.error-content p {
  margin: 16px 0;
  font-size: 16px;
}

.error-suggestions {
  text-align: left;
  background: #fef3c7;
  padding: 16px;
  border-radius: 8px;
  margin-top: 16px;
}

.error-suggestions ul {
  margin: 8px 0 0;
  padding-left: 20px;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式 */
@media (max-width: 1024px) {
  .video-wrapper {
    flex-direction: column;
  }

  .captured-images {
    flex-direction: row;
    justify-content: center;
  }

  .guide-visual {
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .step-indicator {
    gap: 8px;
  }

  .step-circle {
    width: 36px;
    height: 36px;
    font-size: 14px;
  }

  .step-label {
    font-size: 12px;
  }

  .control-buttons {
    flex-direction: column;
  }

  .control-buttons .el-button {
    width: 100%;
  }

  .confirm-actions,
  .success-actions {
    flex-direction: column;
  }

  .confirm-actions .el-button,
  .success-actions .el-button {
    width: 100%;
  }
}
</style>
