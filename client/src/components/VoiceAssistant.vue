<template>
  <div class="voice-assistant">
    <!-- 语音按钮 -->
    <div
      class="voice-button"
      :class="{
        listening: isListening,
        processing: isProcessing,
        'elderly-mode': isElderlyMode,
      }"
      @click="toggleVoice"
      :aria-label="buttonLabel"
    >
      <el-icon :size="elderlyMode ? 32 : 24">
        <Microphone v-if="!isListening && !isProcessing" />
        <Close v-else-if="isListening" />
        <Loading v-else />
      </el-icon>
    </div>

    <!-- 语音状态提示 -->
    <transition name="fade">
      <div v-if="showStatus" class="voice-status" :class="statusType">
        <div class="status-content">
          <el-icon v-if="statusIcon" :size="20">
            <component :is="statusIcon" />
          </el-icon>
          <span>{{ statusText }}</span>
        </div>

        <!-- 语音波形动画 -->
        <div v-if="isListening" class="wave-animation">
          <span
            v-for="i in 5"
            :key="i"
            class="wave-bar"
            :style="{ animationDelay: `${i * 0.1}s` }"
          ></span>
        </div>
      </div>
    </transition>

    <!-- 语音结果 -->
    <transition name="slide-up">
      <div v-if="transcript && showResult" class="voice-result">
        <div class="result-header">
          <el-icon><ChatDotRound /></el-icon>
          <span>您说：</span>
        </div>
        <div class="result-content">{{ transcript }}</div>
        <div class="result-actions">
          <el-button type="primary" size="small" @click="executeCommand"> 执行 </el-button>
          <el-button size="small" @click="clearTranscript"> 取消 </el-button>
        </div>
      </div>
    </transition>

    <!-- 帮助提示 -->
    <el-popover v-model:visible="showHelp" placement="top" :width="280" trigger="click">
      <template #reference>
        <div class="help-button" @click="showHelp = !showHelp">
          <el-icon><QuestionFilled /></el-icon>
        </div>
      </template>
      <div class="help-content">
        <h4>语音助手使用指南</h4>
        <p>支持以下语音命令：</p>
        <ul>
          <li>"打开首页" - 进入首页</li>
          <li>"我要办事" - 打开办事页面</li>
          <li>"查看公告" - 打开公告列表</li>
          <li>"我的家庭" - 查看家庭信息</li>
          <li>"帮助" - 显示帮助信息</li>
        </ul>
        <p class="help-tip">💡 点击麦克风图标开始语音输入</p>
      </div>
    </el-popover>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Microphone,
  Close,
  Loading,
  ChatDotRound,
  QuestionFilled,
  Check,
  CloseBold,
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useAccessibilityStore } from '@/stores/accessibility';

// 类型定义
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

const router = useRouter();
const accessibilityStore = useAccessibilityStore();

// 语音状态
const isListening = ref(false);
const isProcessing = ref(false);
const transcript = ref('');
const showResult = ref(false);
const showHelp = ref(false);
const recognition = ref<SpeechRecognition | null>(null);
const synthesis = ref<SpeechSynthesis | null>(null);
const isSupported = ref(true);

// 无障碍状态
const isElderlyMode = computed(() => accessibilityStore.largeTextMode);
const currentDialect = computed(() => accessibilityStore.dialect);

// 命令映射
const commandMap: Record<string, string> = {
  首页: '/',
  回家: '/',
  打开首页: '/',
  办事: '/services/apply',
  我要办事: '/services/apply',
  办理: '/services/apply',
  公告: '/announcements',
  看公告: '/announcements',
  公告列表: '/announcements',
  家庭: '/family',
  我的家庭: '/family',
  家庭信息: '/family',
  村务: '/village',
  村务管理: '/village',
  个人信息: '/profile',
  我的: '/profile',
  设置: '/settings',
  帮助: 'help',
  紧急: '/emergency',
  求助: '/emergency',
  退出: 'logout',
};

// 计算属性
const buttonLabel = computed(() => {
  if (isListening.value) return '点击停止语音输入';
  if (isProcessing.value) return '正在处理...';
  return '点击开始语音输入';
});

const showStatus = computed(() => {
  return isListening.value || isProcessing.value || (isElderlyMode.value && showHelp.value);
});

const statusType = computed(() => {
  if (isProcessing.value) return 'processing';
  if (isListening.value) return 'listening';
  return 'default';
});

const statusIcon = computed(() => {
  if (isProcessing.value) return Loading;
  if (isListening.value) return Microphone;
  return null;
});

const statusText = computed(() => {
  if (isProcessing.value) return '正在识别...';
  if (isListening.value) return '请说话...';
  return '';
});

// 初始化语音识别
onMounted(() => {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    isSupported.value = false;
    console.warn('浏览器不支持语音识别功能');
    return;
  }

  const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionClass) {
    isSupported.value = false;
    return;
  }

  try {
    recognition.value = new SpeechRecognitionClass() as SpeechRecognition;

    recognition.value.continuous = false;
    recognition.value.interimResults = true;
    recognition.value.lang = getLanguageCode(currentDialect.value);

    recognition.value.onstart = () => {
      isListening.value = true;
      showResult.value = false;
    };

    recognition.value.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      transcript.value = result[0].transcript;

      if (result.isFinal) {
        isProcessing.value = true;
        isListening.value = false;
        processTranscript(transcript.value);
      }
    };

    recognition.value.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      isListening.value = false;
      isProcessing.value = false;

      if (event.error === 'not-allowed') {
        ElMessage.error('请允许麦克风权限');
      } else if (event.error === 'no-speech') {
        ElMessage.warning('未检测到语音，请重试');
      } else {
        ElMessage.error('语音识别失败，请重试');
      }
    };

    recognition.value.onend = () => {
      if (!isProcessing.value) {
        isListening.value = false;
      }
    };
  } catch (error) {
    console.error('语音识别初始化失败:', error);
    isSupported.value = false;
  }

  // 初始化语音合成
  if ('speechSynthesis' in window) {
    synthesis.value = window.speechSynthesis;
  }
});

// 清理 - 防止内存泄漏
onUnmounted(() => {
  // 停止语音识别
  if (recognition.value) {
    try {
      recognition.value.abort();
    } catch (error) {
      console.warn('语音识别 abort 失败:', error);
    }
    recognition.value = null;
  }

  // 取消正在播放的语音
  if (synthesis.value) {
    synthesis.value.cancel();
    synthesis.value = null;
  }
});

// 获取语言代码
function getLanguageCode(dialect) {
  const codes = {
    'zh-CN': 'zh-CN', // 普通话
    'wuu-CN': 'zh-CN', // 吴语
    'yue-CN': 'zh-HK', // 粤语
    'hak-CN': 'zh-CN', // 客家话
    'nan-CN': 'zh-TW', // 闽南语
  };
  return codes[dialect] || 'zh-CN';
}

// 切换语音状态
function toggleVoice() {
  if (isProcessing.value) return;

  if (isListening.value) {
    stopListening();
  } else {
    startListening();
  }
}

// 开始监听
function startListening() {
  try {
    transcript.value = '';
    showResult.value = false;

    if (recognition.value) {
      recognition.value.lang = getLanguageCode(currentDialect.value);
      recognition.value.start();
    } else {
      ElMessage.error('您的浏览器不支持语音识别');
    }
  } catch (error) {
    console.error('Failed to start speech recognition:', error);
    ElMessage.error('启动语音识别失败');
  }
}

// 停止监听
function stopListening() {
  if (recognition.value) {
    recognition.value.stop();
  }
  isListening.value = false;
}

// 处理识别结果
function processTranscript(text) {
  const normalizedText = text.trim().toLowerCase();

  // 匹配命令
  for (const [command, route] of Object.entries(commandMap)) {
    if (normalizedText.includes(command.toLowerCase())) {
      if (route === 'help') {
        showHelp.value = true;
        speak('这是语音助手，帮助您通过语音操作平台');
      } else if (route === 'logout') {
        handleLogout();
      } else {
        navigateTo(route);
        speak(`正在打开${command}`);
      }
      isProcessing.value = false;
      return;
    }
  }

  // 未识别到命令
  isProcessing.value = false;
  showResult.value = true;
  speak('未识别到命令，请重试');
}

// 执行命令
function executeCommand() {
  if (transcript.value) {
    processTranscript(transcript.value);
    showResult.value = false;
  }
}

// 清空转录
function clearTranscript() {
  transcript.value = '';
  showResult.value = false;
}

// 导航
function navigateTo(routePath) {
  router.push(routePath);
}

// 语音播报
function speak(text) {
  if (synthesis.value && isElderlyMode.value) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.8;
    synthesis.value.speak(utterance);
  }
}

// 退出登录
function handleLogout() {
  router.push('/auth/logout');
}
</script>

<style scoped>
.voice-assistant {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.voice-button {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
}

.voice-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.voice-button.listening {
  background: linear-gradient(135deg, #f56c6c 0%, #e64545 100%);
  box-shadow: 0 4px 16px rgba(245, 108, 108, 0.4);
  animation: pulse 1.5s infinite;
}

.voice-button.processing {
  background: linear-gradient(135deg, #e6a23c 0%, #d4940a 100%);
}

.voice-button.elderly-mode {
  width: 72px;
  height: 72px;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.voice-status {
  background: white;
  border-radius: 24px;
  padding: 12px 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 8px;
}

.voice-status.listening {
  background: #fef0f0;
  color: #f56c6c;
}

.voice-status.processing {
  background: #fdf6ec;
  color: #e6a23c;
}

.status-content {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.wave-animation {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 20px;
}

.wave-bar {
  width: 3px;
  height: 100%;
  background: currentColor;
  border-radius: 2px;
  animation: wave 0.5s ease-in-out infinite;
}

@keyframes wave {
  0%,
  100% {
    height: 40%;
  }
  50% {
    height: 100%;
  }
}

.voice-result {
  position: absolute;
  bottom: 80px;
  right: 0;
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 280px;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #409eff;
  font-size: 14px;
  margin-bottom: 8px;
}

.result-content {
  font-size: 16px;
  color: #1f2937;
  margin-bottom: 12px;
  line-height: 1.5;
}

.result-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.help-button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  color: #909399;
  font-size: 14px;
}

.help-button:hover {
  color: #409eff;
}

.help-content {
  padding: 8px 0;
}

.help-content h4 {
  margin: 0 0 12px;
  font-size: 16px;
  color: #1f2937;
}

.help-content p {
  margin: 0 0 8px;
  font-size: 14px;
  color: #6b7280;
}

.help-content ul {
  margin: 0 0 12px;
  padding-left: 20px;
}

.help-content li {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 4px;
}

.help-tip {
  font-size: 12px;
  color: #909399;
  font-style: italic;
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

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* 响应式 */
@media (max-width: 480px) {
  .voice-assistant {
    bottom: 16px;
    right: 16px;
  }

  .voice-button {
    width: 48px;
    height: 48px;
  }

  .voice-result {
    width: 240px;
    bottom: 70px;
  }
}
</style>
