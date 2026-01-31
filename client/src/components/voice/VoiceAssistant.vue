<template>
  <div class="voice-assistant-container">
    <!-- 悬浮按钮 -->
    <transition name="float">
      <button
        v-show="!isExpanded"
        @click="toggleExpanded"
        class="float-button"
        :class="{ 'is-active': isListening || isSpeaking }"
        :disabled="!isSupported"
        :title="isListening ? '停止录音' : '开始语音助手'"
      >
        <div class="mic-icon">
          <svg
            v-if="!isListening && !isSpeaking"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 1a3 3 0 0 1 0 6 3 3 0 0 1 0 6" />
            <path d="M5.5 10.5a1 1 0 0 1 0 13 13 0 0 1 0 0-13a1 1 0 0 1 0-13 0" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="6" y="8" width="4" height="8" rx="1" />
            <rect x="14" y="8" width="4" height="8" rx="1" />
          </svg>
        </div>
        
        <!-- 波形动画指示器 -->
        <div v-if="isListening || isSpeaking" class="wave-indicator">
          <span
            v-for="i in 3"
            :key="i"
            class="wave-dot"
            :style="{ animationDelay: `${i * 0.2}s` }"
          ></span>
        </div>
      </button>
    </transition>

    <!-- 扩展面板 -->
    <transition name="panel">
      <div v-show="isExpanded" class="expanded-panel">
        <!-- 顶部栏 -->
        <div class="panel-header">
          <div class="header-left">
            <h3>语音助手</h3>
            <span v-if="detectedDialect" class="dialect-tag">{{ detectedDialect }}</span>
          </div>
          <button @click="toggleExpanded" class="close-btn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <!-- 语音波形可视化 -->
        <div class="visualizer-section">
          <canvas
            ref="waveCanvas"
            :class="{ 'is-active': isListening || isSpeaking }"
            class="waveform-canvas"
          ></canvas>
        </div>

        <!-- 识别结果展示区 -->
        <div class="recognition-section">
          <div class="result-header">
            <span class="result-label">识别结果</span>
            <el-tag v-if="recognitionResult.confidence" :type="getConfidenceType(recognitionResult.confidence)" size="small">
              置信度: {{ (recognitionResult.confidence * 100).toFixed(0) }}%
            </el-tag>
          </div>

          <!-- 实时识别结果 -->
          <div class="result-content">
            <div class="interim-result" v-if="interimText && isListening">
              <span class="result-text">{{ interimText }}</span>
              <el-icon class="typing-indicator"><Loading /></el-icon>
            </div>

            <!-- 最终识别结果 -->
            <div class="final-result" :class="{ 'has-result': finalText || recognitionResult.text }">
              <div class="result-text" v-if="recognitionResult.text">
                {{ recognitionResult.text }}
              </div>
              <div class="result-actions" v-if="recognitionResult.text">
                <el-button
                  type="primary"
                  size="small"
                  :icon="Promotion"
                  @click="copyText"
                >
                  复制
                </el-button>
                <el-button
                  type="success"
                  size="small"
                  :icon="ChatDotRound"
                  @click="handleTextCommand(recognitionResult.text)"
                >
                  执行
                </el-button>
              </div>
            </div>

            <!-- 占位提示 -->
            <div v-if="!interimText && !recognitionResult.text" && !isListening" class="placeholder">
              <el-icon class="placeholder-icon"><Mic /></el-icon>
              <p>点击按钮开始说话</p>
              <p class="hint-text">支持22种方言识别</p>
            </div>
          </div>
        </div>

        <!-- 命令执行反馈区 -->
        <div class="command-section" v-if="currentCommand">
          <div class="command-header">
            <el-icon class="command-icon"><Operation /></el-icon>
            <span class="command-label">命令执行</span>
            <el-tag
              :type="getCommandStatusType(currentCommand.status)"
              size="small"
            >
              {{ getCommandStatusText(currentCommand.status) }}
            </el-tag>
          </div>

          <div class="command-content">
            <div class="command-intent">
              <span class="intent-text">{{ currentCommand.intent }}</span>
              <span class="confidence-badge" v-if="currentCommand.confidence">
                {{ (currentCommand.confidence * 100).toFixed(0) }}%
              </span>
            </div>

            <div class="command-entities" v-if="currentCommand.entities && currentCommand.entities.length > 0">
              <el-tag
                v-for="(entity, index) in currentCommand.entities"
                :key="index"
                size="small"
                class="entity-tag"
              >
                {{ entity.type }}: {{ entity.value }}
              </el-tag>
            </div>

            <div class="command-response" v-if="currentCommand.response">
              <div class="response-content">
                <p>{{ currentCommand.response }}</p>
              </div>
            </div>

            <div class="command-actions" v-if="currentCommand.status === 'pending'">
              <el-button
                type="success"
                size="small"
                :loading="currentCommand.isExecuting"
                @click="confirmCommand"
              >
                确认执行
              </el-button>
              <el-button
                type="danger"
                size="small"
                @click="cancelCommand"
              >
                取消
              </el-button>
            </div>

            <div class="command-result" v-if="currentCommand.status === 'completed'">
              <el-result
                :icon="currentCommand.success ? 'success' : 'error'"
                :title="currentCommand.success ? '执行成功' : '执行失败'"
              >
                <template #title>
                  {{ currentCommand.success ? '✓' : '✗' }}
                </template>
                <template #sub-title>
                  {{ currentCommand.message }}
                </template>
              </el-result>
            </div>

            <div class="command-actions" v-if="currentCommand.status === 'failed'">
              <el-button
                type="warning"
                size="small"
                @click="retryCommand"
              >
                重试
              </el-button>
            </div>
          </div>
        </div>

        <!-- 操作按钮区 -->
        <div class="actions-section">
          <el-button
            v-if="isListening"
            type="danger"
            :icon="VideoPause"
            @click="stopListening"
            size="large"
            round
          >
            停止录音
          </el-button>

          <el-button
            v-else
            type="primary"
            :icon="isSpeaking ? 'VideoPause' : 'Microphone'"
            :disabled="isSpeaking || isProcessing"
            @click="toggleListening"
            size="large"
            round
          >
            {{ isSpeaking ? '停止播放' : '开始录音' }}
          </el-button>

          <el-button
            v-if="recognitionResult.text && !isListening"
            type="success"
            :icon="ChatDotRound"
            :disabled="isSpeaking || isProcessing"
            @click="speakText"
            size="large"
            round
          >
            播报
          </el-button>

          <el-button
            type="info"
            icon="Setting"
            @click="showSettings = true"
            size="large"
            round
          >
            设置
          </el-button>
        </div>

        <!-- 设置面板 -->
        <el-drawer
          v-model="showSettings"
          title="语音设置"
          direction="rtl"
          size="450px"
        >
          <el-form :model="settings" label-width="100px">
            <el-form-item label="方言选择">
              <el-select v-model="settings.dialect" placeholder="选择方言">
                <el-option
                  v-for="dialect in dialects"
                  :key="dialect.code"
                  :label="dialect.name"
                  :value="dialect.code"
                >
                  <span>{{ dialect.name }}</span>
                  <el-tag size="small">{{ dialect.code }}</el-tag>
                </el-option>
              </el-select>
            </el-form-item>

            <el-form-item label="音色选择">
              <el-select v-model="settings.voice" placeholder="选择音色">
                <el-option label="女声" value="female">女声</el-option>
                <el-option label="男声" value="male">男声</el-option>
                <el-option label="儿童声" value="child">儿童声</el-option>
                <el-option label="老年人声" value="elderly">老年人声</el-option>
              </el-select>
            </el-form-item>

            <el-form-item label="语速">
              <el-slider v-model="settings.speed" :min="0" :max="100" show-input />
            </el-form-item>

            <el-form-item label="音调">
              <el-slider v-model="settings.pitch" :min="0" :max="100" show-input />
            </el-form-item>

            <el-form-item label="音量">
              <el-slider v-model="settings.volume" :min="0" :max="100" show-input />
            </el-form-item>

            <el-divider content-position="left">高级选项</el-divider>

            <el-form-item label="自动播放">
              <el-switch v-model="settings.autoPlay" />
            </el-form-item>

            <el-form-item label="语音转文字">
              <el-switch v-model="settings.enableSTT" />
            </el-form-item>

            <el-form-item label="显示波形">
              <el-switch v-model="settings.showVisualizer" />
            </el-form-item>
          </el-form>
        </el-drawer>
      </div>
    </transition>

    <!-- Toast 通知 -->
    <transition-group name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast-notification"
        :class="toast.type"
      >
        <el-icon class="toast-icon">
          <Success v-if="toast.type === 'success'" />
          <Warning v-else-if="toast.type === 'warning'" />
          <Error v-else />
          <Info v-else />
        </el-icon>
        <span class="toast-message">{{ toast.message }}</span>
        <button @click="removeToast(toast.id)" class="toast-close">
          <el-icon><Close /></el-icon>
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';
import {
  Microphone,
  VideoPause,
  ChatDotRound,
  Setting,
  Loading,
  Close,
  Success,
  Warning,
  Error,
  Info,
  Operation,
  Promotion
} from '@element-plus/icons-vue';
import axios from 'axios';

// Props
const props = defineProps({
  apiEndpoint: {
    type: String,
    default: '/api/speech/recognize'
  },
  synthesisEndpoint: {
    type: String,
    default: '/api/tts/synthesize'
  },
  commandEndpoint: {
    type: String,
    default: '/api/voice/command'
  },
  autoInit: {
    type: Boolean,
    default: true
  }
});

// 事件
const emit = defineEmits([
  'recording-started',
  'recording-stopped',
  'recognition-result',
  'command-executed',
  'synthesis-started',
  'synthesis-completed'
]);

// 响应式状态
const isExpanded = ref(false);
const isSupported = ref(false);
const isListening = ref(false);
const isSpeaking = ref(false);
const isProcessing = ref(false);

// 识别相关
const interimText = ref('');
const recognitionResult = reactive({
  text: '',
  confidence: 0,
  dialect: '',
  processingTime: 0
});
const detectedDialect = ref('');

// 命令相关
const currentCommand = reactive({
  intent: '',
  entities: [],
  confidence: 0,
  status: '', // pending, executing, completed, failed
  response: '',
  message: '',
  success: false,
  isExecuting: false
});

// 音频相关
const mediaRecorder = ref(null);
const audioStream = ref(null);
const audioContext = ref(null);
const analyser = ref(null);
const audioChunks = ref([]);

// Canvas相关
const waveCanvas = ref(null);
const animationId = ref(null);
const audioDataArray = ref([]);

// 界面状态
const showSettings = ref(false);
const toasts = ref([]);
let toastId = 0;

// 设置
const settings = reactive({
  dialect: 'mandarin',
  voice: 'female',
  speed: 50,
  pitch: 50,
  volume: 50,
  emotion: 'neutral',
  format: 'mp3',
  autoPlay: true,
  enableSTT: true,
  showVisualizer: true
});

// 方言列表
const dialects = [
  { code: 'zh', name: '普通话', region: '全国' },
  { code: 'yue', name: '粤语', region: '广东、广西、香港、澳门' },
  { code: 'nan', name: '闽南语', region: '福建、台湾、潮汕' },
  { code: 'hak', name: '客家话', region: '广东、江西、福建' },
  { code: 'wuu', name: '吴语', region: '江苏、浙江、上海' },
  { code: 'hsn', name: '湘语', region: '湖南' },
  { code: 'gan', name: '赣语', region: '江西' },
  { code: 'zh-northeast', name: '东北话', region: '东北三省' },
  { code: 'zh-sichuan', name: '四川话', region: '四川、重庆' },
  { code: 'zh-shandong', name: '山东话', region: '山东' },
  { code: 'zh-henan', name: '河南话', region: '河南' },
  { code: 'zh-hubei', name: '湖北话', region: '湖北' },
  { code: 'zh-jiangzhe', name: '江浙话', region: '江苏、浙江' },
  { code: 'zh-anhui', name: '安徽话', region: '安徽' }
];

/**
 * 组件挂载时初始化
 */
onMounted(async () => {
  if (props.autoInit) {
    await initializeVoiceService();
  }
  setupWaveformAnimation();
  loadDialects();
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  cleanup();
  window.removeEventListener('keydown', handleKeydown);
});

/**
 * 监听键盘事件
 */
const handleKeydown = (event) => {
  // 空格键切换录音状态
  if (event.code === 'Space' && !isEditingContent()) {
    event.preventDefault();
    toggleListening();
  }
  // ESC键关闭面板
  if (event.code === 'Escape') {
    isExpanded.value = false;
  }
  // Ctrl+M 开始录音
  if (event.ctrlKey && event.key === 'm') {
    event.preventDefault();
    toggleListening();
  }
};

/**
 * 检查是否正在编辑内容
 */
const isEditingContent = () => {
  const activeElement = document.activeElement;
  return activeElement &&
    (activeElement.tagName === 'INPUT' ||
     activeElement.tagName === 'TEXTAREA' ||
     activeElement.isContentEditable);
};

/**
 * 初始化语音服务
 */
const initializeVoiceService = async () => {
  try {
    // 检查浏览器支持
    const supported = checkBrowserSupport();
    if (!supported) {
      showToast('error', '您的浏览器不支持语音功能');
      return;
    }

    // 请求麦克风权限
    const permissionGranted = await requestMicrophonePermission();
    if (!permissionGranted) {
      showToast('error', '请允许使用麦克风权限');
      return;
    }

    // 初始化音频上下文
    await initAudioContext();

    isSupported.value = true;
    console.log('✅ 语音助手初始化成功');

  } catch (error) {
    console.error('语音助手初始化失败:', error);
    showToast('error', '语音助手初始化失败');
  }
};

/**
 * 检查浏览器支持
 */
const checkBrowserSupport = () => {
  const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
  const hasAudioContext = !!(window.AudioContext || window.webkitAudioContext);

  return hasGetUserMedia && hasMediaRecorder && hasAudioContext;
};

/**
 * 请求麦克风权限
 */
const requestMicrophonePermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000
      }
    });

    // 停止所有轨道
    stream.getTracks().forEach(track => track.stop());

    return true;
  } catch (error) {
    console.error('麦克风权限请求失败:', error);
    return false;
  }
};

/**
 * 初始化音频上下文
 */
const initAudioContext = async () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext.value = new AudioContext();

    analyser.value = audioContext.value.createAnalyser();
    analyser.value.fftSize = 256;
    analyser.value.smoothingTimeConstant = 0.8;

    console.log('✅ 音频上下文初始化完成');
  } catch (error) {
    console.error('音频上下文初始化失败:', error);
    throw error;
  }
};

/**
 * 加载方言列表
 */
const loadDialects = async () => {
  try {
    const response = await axios.get('/api/speech/dialects');
    if (response.data && response.data.data) {
      // 可以从后端加载，但这里使用预定义列表
      console.log('方言列表:', dialects.length);
    }
  } catch (error) {
    console.warn('加载方言列表失败，使用默认列表');
  }
};

/**
 * 设置波形动画
 */
const setupWaveformAnimation = () => {
  nextTick(() => {
    if (waveCanvas.value) {
      const canvas = waveCanvas.value;
      const ctx = canvas.getContext('2d');
      
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      canvas.style.width = canvas.offsetWidth + 'px';
      canvas.style.height = canvas.offsetHeight + 'px';
      
      drawWaveform(ctx, canvas.width, canvas.height);
    }
  });
};

/**
 * 绘制波形
 */
const drawWaveform = (ctx, width, height) => {
  const centerY = height / 2;
  let x = 0;

  const animate = () => {
    if (settings.showVisualizer && (isListening.value || isSpeaking.value) && audioDataArray.value.length > 0)) {
      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      ctx.strokeStyle = '#409EFF';
      ctx.lineWidth = 2;

      for (let i = 0; i < audioDataArray.value.length; i++) {
        const amplitude = audioDataArray.value[i] * centerY;
        const y = centerY + amplitude;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += width / audioDataArray.value.length;
      }

      ctx.stroke();
    }

    animationId.value = requestAnimationFrame(animate);
  };

  animate();
};

/**
 * 开始录音
 */
const startListening = async () => {
  if (!isSupported.value || isListening.value || isSpeaking.value) {
    return;
  }

  try {
    showToast('info', '开始录音...');

    // 获取音频流
    audioStream.value = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000
      }
    });

    // 创建录音器
    const options = {
      mimeType: 'audio/webm',
    };
    mediaRecorder.value = new MediaRecorder(audioStream.value, options);

    audioChunks.value = [];

    mediaRecorder.value.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.value.push(event.data);
      }
    };

    mediaRecorder.value.onstop = async () => {
      const audioBlob = new Blob(audioChunks.value, { type: options.mimeType });
      await processAudioData(audioBlob);
    };

    // 连接分析器
    const source = audioContext.value.createMediaStreamSource(audioStream.value);
    source.connect(analyser.value);

    // 开始录音
    mediaRecorder.value.start(1000); // 每1秒收集一次数据
    isListening.value = true;

    // 启动波形可视化
    startWaveformVisualization();

    emit('recording-started');

  } catch (error) {
    console.error('开始录音失败:', error);
    showToast('error', `录音失败: ${error.message}`);
  }
};

/**
 * 停止录音
 */
const stopListening = () => {
  if (!isListening.value) {
    return;
  }

  try {
    showToast('info', '停止录音，处理中...');

    if (mediaRecorder.value) {
      mediaRecorder.value.stop();
    }

    isListening.value = false;

    // 停止波形可视化
    stopWaveformVisualization();

    emit('recording-stopped');

  } catch (error) {
    console.error('停止录音失败:', error);
  }
};

/**
 * 切换录音状态
 */
const toggleListening = () => {
  if (isListening.value) {
    stopListening();
  } else {
    startListening();
  }
};

/**
 * 处理音频数据
 */
const processAudioData = async (audioBlob) => {
  try {
    isProcessing.value = true;

    // 转换为ArrayBuffer
    const arrayBuffer = await audioBlob.arrayBuffer();

    // 发送到后端进行识别
    const formData = new FormData();
    formData.append('audio', audioBlob, audioBlob.name || 'audio.webm');
    formData.append('dialect', settings.dialect);

    const response = await axios.post(props.apiEndpoint, formData);

    if (response.data.success) {
      const result = response.data.data;
      
      recognitionResult.text = result.text;
      recognitionResult.confidence = result.confidence || 0.85;
      recognitionResult.dialect = result.dialect || 'mandarin';
      recognitionResult.processingTime = result.processingTime || 0;

      if (result.dialect && result.dialect !== 'mandarin') {
        const dialect = dialects.find(d => d.code === result.dialect);
        detectedDialect.value = dialect ? dialect.name : result.dialect;
      } else {
        detectedDialect.value = '';
      }

      showToast('success', '识别成功');
      emit('recognition-result', result);
    } else {
      showToast('warning', '识别未返回有效结果');
    }

    isProcessing.value = false;

  } catch (error) {
    console.error('语音识别失败:', error);
    showToast('error', `识别失败: ${error.message}`);
    isProcessing.value = false;
  }
};

/**
 * 开始波形可视化
 */
const startWaveformVisualization = () => {
  if (!analyser.value || !settings.showVisualizer) return;

  const dataArray = new Uint8Array(analyser.value.frequencyBinCount);
  const updateWaveform = () => {
    analyser.value.getByteFrequencyData(dataArray);

    audioDataArray.value = Array.from(dataArray);

    if (!isListening.value && !isSpeaking.value) {
      analyser.value.getByteTimeDomainData(dataArray);
      audioDataArray.value = Array.from(dataArray).slice(0, 50);
    }
  };

  updateWaveform();
  setInterval(updateWaveform, 100);
};

/**
 * 停止波形可视化
 */
const stopWaveformVisualization = () => {
  if (analyser.value) {
    analyser.value.disconnect();
  }
  audioDataArray.value = [];
};

/**
 * 文本转语音
 */
const speakText = async () => {
  if (isSpeaking.value || isProcessing.value || !recognitionResult.text) {
    return;
  }

  try {
    showToast('info', '正在生成语音...');
    isSpeaking.value = true;
    emit('synthesis-started', { text: recognitionResult.text });

    const response = await axios.post(props.synthesisEndpoint, {
      text: recognitionResult.text,
      voice: settings.voice,
      language: settings.dialect === 'mandarin' ? 'zh-CN' : 'zh-CN',
      speed: settings.speed / 50,
      pitch: settings.pitch / 50,
      volume: settings.volume / 50,
      emotion: settings.emotion,
      format: settings.format
    });

    if (response.data.success) {
      const audioData = response.data.data.audioData;
      await playAudio(audioData);

      showToast('success', '语音播报完成');
      emit('synthesis-completed', { text: recognitionResult.text });
    } else {
      showToast('warning', '语音生成失败');
      isSpeaking.value = false;
    }

  } catch (error) {
    console.error('语音合成失败:', error);
    showToast('error', `语音播报失败: ${error.message}`);
    isSpeaking.value = false;
  }
};

/**
 * 播放音频
 */
const playAudio = async (audioBase64) => {
  try {
    const audioData = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);

    const audio = new Audio(audioUrl);
    audio.onended = () => {
      isSpeaking.value = false;
      URL.revokeObjectURL(audioUrl);
    };
    audio.onerror = () => {
      isSpeaking.value = false;
      showToast('error', '音频播放失败');
    };

    await audio.play();

  } catch (error) {
    console.error('音频播放失败:', error);
    showToast('error', '音频播放失败');
    isSpeaking.value = false;
  }
};

/**
 * 处理语音命令
 */
const handleTextCommand = async (text) => {
  try {
    showToast('info', '正在解析命令...');

    const response = await axios.post(props.commandEndpoint, {
      text: text
    });

    if (response.data.success) {
      const command = response.data.data.command;

      currentCommand.intent = command.intent;
      currentCommand.entities = command.entities || [];
      currentCommand.confidence = command.confidence || 0;
      currentCommand.status = 'pending';
      currentCommand.response = command.response;
      currentCommand.message = `识别到命令: ${command.intent}`;

      emit('command-executed', command);

      if (settings.autoPlay && command.response) {
        await speakText();
      }
    } else {
      showToast('warning', '未识别到有效命令');
    }

  } catch (error) {
    console.error('命令解析失败:', error);
    showToast('error', '命令解析失败');
  }
};

/**
 * 确认执行命令
 */
const confirmCommand = async () => {
  currentCommand.status = 'executing';
  currentCommand.isExecuting = true;

  try {
    await speakText(currentCommand.response);

    currentCommand.status = 'completed';
    currentCommand.success = true;
    currentCommand.message = '命令执行成功';

    showToast('success', '命令执行完成');

  } catch (error) {
    console.error('命令执行失败:', error);
    currentCommand.status = 'failed';
    currentCommand.success = false;
    currentCommand.message = `命令执行失败: ${error.message}`;
    currentCommand.isExecuting = false;

    showToast('error', '命令执行失败');
  }
};

/**
 * 取消命令
 */
const cancelCommand = () => {
  currentCommand.status = 'cancelled';
  currentCommand.success = false;
  currentCommand.message = '已取消';

  showToast('info', '命令已取消');
};

/**
 * 重试命令
 */
const retryCommand = () => {
  if (currentCommand.text) {
    handleTextCommand(currentCommand.text);
  }
};

/**
 * 复制文本
 */
const copyText = () => {
  if (navigator.clipboard && recognitionResult.text) {
    navigator.clipboard.writeText(recognitionResult.text).then(() => {
      showToast('success', '已复制到剪贴板');
    }).catch(() => {
      showToast('error', '复制失败');
    });
  } else {
    showToast('warning', '浏览器不支持自动复制');
  }
};

/**
 * 切换扩展面板
 */
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};

/**
 * 显示Toast通知
 */
const showToast = (type, message) => {
  const id = ++toastId;
  toasts.value.push({
    id,
    type,
    message
  });

  if (type !== 'info') {
    setTimeout(() => removeToast(id), 3000);
  }
};

/**
 * 移除Toast
 */
const removeToast = (id) => {
  const index = toasts.value.findIndex(t => t.id === id);
  if (index > -1) {
    toasts.value.splice(index, 1);
  }
};

/**
 * 获取置信度类型
 */
const getConfidenceType = (confidence) => {
  if (confidence >= 0.9) return 'success';
  if (confidence >= 0.7) return 'warning';
  return 'info';
};

/**
 * 获取命令状态类型
 */
const getCommandStatusText = (status) => {
  const statusMap = {
    pending: '待确认',
    executing: '执行中',
    completed: '已完成',
    failed: '执行失败',
    cancelled: '已取消'
  };
  return statusMap[status] || status;
};

/**
 * 获取命令状态类型
 */
const getCommandStatusType = (status) => {
  const typeMap = {
    pending: 'warning',
    executing: 'primary',
    completed: 'success',
    failed: 'danger',
    cancelled: 'info'
  };
  return typeMap[status] || 'info';
};

/**
 * 清理资源
 */
const cleanup = () => {
  // 停止录音
  if (mediaRecorder.value) {
    try {
      mediaRecorder.value.stop();
    } catch (error) {
      console.warn('停止录音失败:', error);
    }
  }

  // 停止音频流
  if (audioStream.value) {
    audioStream.value.getTracks().forEach(track => track.stop());
  }

  // 停止动画
  if (animationId.value) {
    cancelAnimationFrame(animationId.value);
  }

  // 停止分析器
  if (analyser.value) {
    analyser.value.disconnect();
  }

  // 关闭音频上下文
  if (audioContext.value) {
    audioContext.value.close();
  }

  console.log('✅ 语音助手资源已清理');
};

// 监听设置变化
watch(settings, (newSettings) => {
  console.log('语音设置已更新:', newSettings);
}, { deep: true });

// 暴露给父组件的状态
defineExpose({
  isListening,
  isSpeaking,
  recognitionResult,
  currentCommand,
  toggleListening,
  startListening,
  stopListening,
  speakText,
  cleanup
});
</script>

<style scoped>
.voice-assistant-container {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 9999;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Oxygen', Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
}

/* 悬浮按钮 */
.float-button {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: visible;
}

.float-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 25px rgba(102, 126, 234, 0.6);
}

.float-button:active {
  transform: scale(0.95);
}

.float-button.is-active {
  background: linear-gradient(135deg, #f5576c 0%, #ef4444 100%);
  box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
}

.float-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mic-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mic-icon svg {
  width: 32px;
  height: 32px;
}

.wave-indicator {
  display: flex;
  gap: 4px;
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
}

.wave-dot {
  width: 4px;
  height: 4px;
  background: white;
  border-radius: 50%;
  animation: wave 1.4s ease-in-out infinite;
}

@keyframes wave {
  0%, 100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-8px);
  }
}

/* 扩展面板 */
.expanded-panel {
  position: absolute;
  bottom: 80px;
  right: 0;
  width: 400px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.dialect-tag {
  font-size: 12px;
  padding: 2px 8px;
  background: #ecf5ff;
  color: #409eff;
  border-radius: 4px;
  font-weight: 500;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #909399;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #333;
}

/* 波形可视化 */
.visualizer-section {
  padding: 16px;
  background: linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%);
  border-bottom: 1px solid #f0f0f0;
}

.waveform-canvas {
  width: 100%;
  height: 80px;
  display: block;
  background: transparent;
}

.waveform-canvas.is-active {
  opacity: 1;
}

.waveform-canvas:not(.is-active) {
  opacity: 0.5;
}

/* 识别结果区 */
.recognition-section {
  padding: 16px;
  min-height: 200px;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.result-label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.result-content {
  position: relative;
  min-height: 100px;
}

.interim-result {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: #ecfdf5;
  border-radius: 8px;
  margin-bottom: 12px;
}

.result-text {
  font-size: 16px;
  color: #666;
  flex: 1;
  line-height: 1.6;
}

.typing-indicator {
  color: #409eff;
  animation: typing 1s infinite;
}

@keyframes typing {
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
}

.final-result {
  transition: all 0.3s;
}

.final-result.has-result {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.result-text {
  font-size: 16px;
  color: #333;
  line-height: 1.6;
  margin-bottom: 12px;
  white-space: pre-wrap;
  word-break: break-word;
}

.result-actions {
  display: flex;
  gap: 8px;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #999;
  text-align: center;
}

.placeholder-icon {
  font-size: 48px;
  color: #ddd;
  margin-bottom: 12px;
}

.placeholder p {
  margin: 0;
  line-height: 1.6;
}

.hint-text {
  font-size: 12px;
  color: #ccc;
}

/* 命令执行区 */
.command-section {
  padding: 16px;
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
}

.command-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.command-icon {
  font-size: 20px;
  color: #409eff;
}

.command-label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.command-intent {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.intent-text {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.confidence-badge {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #ecfdf5;
  color: #409eff;
  font-weight: 500;
}

.command-entities {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.entity-tag {
  font-size: 12px;
}

.command-response {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.response-content {
  margin: 0;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.command-actions {
  display: flex;
  gap: 8px;
}

.command-result {
  margin-top: 12px;
}

/* 操作按钮区 */
.actions-section {
  padding: 16px;
  display: flex;
  gap: 12px;
  justify-content: center;
  border-top: 1px solid #f0f0f0;
}

.actions-section .el-button {
  flex: 1;
  max-width: 100px;
}

/* Toast 通知 */
.toast-notification {
  position: fixed;
  top: 20px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  animation: toastSlideIn 0.3s ease-out;
}

@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.toast-notification.success {
  background: linear-gradient(135deg, #52c41a6 0%, #67b6f4 100%);
}

.toast-notification.error {
  background: linear-gradient(135deg, #ef4444 0%, #d63031 100%);
}

.toast-notification.warning {
  background: linear-gradient(135deg, #f57c6f 0%, #e6a234 100%);
}

.toast-notification.info {
  background: linear-gradient(135deg, #409eff 0%, #53a8ff 100%);
}

.toast-icon {
  font-size: 20px;
}

.toast-message {
  font-size: 14px;
  line-height: 1.4;
  flex: 1;
}

.toast-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.toast-close:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

/* 过渡动画 */
.float-enter-active,
.float-leave-active {
  transition: all 0.3s;
}

.float-enter-from,
.float-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.panel-enter-active,
.panel-leave-active {
  transition: all 0.3s ease-in-out;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

/* 响应式设计 */
@media (max-width: 480px) {
  .voice-assistant-container {
    right: 16px;
    bottom: 16px;
  }

  .float-button {
    width: 56px;
    height: 56px;
  }

  .mic-icon,
  .mic-icon svg {
    width: 28px;
    height: 28px;
  }

  .expanded-panel {
    width: calc(100vw - 32px);
    right: 0;
    bottom: 76px;
    left: 16px;
  }

  .actions-section {
    flex-wrap: wrap;
  }

  .actions-section .el-button {
    flex: 1;
    min-width: 80px;
  }
}
</style>
