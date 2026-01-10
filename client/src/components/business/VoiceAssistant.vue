<!-- 智慧乡村平台语音助手组件 -->
<template>
  <div class="voice-assistant" :class="voiceAssistantClasses" :style="assistantStyle">
    <!-- 语音助手主界面 -->
    <div class="assistant-container">
      <!-- 语音波形显示 -->
      <div class="voice-visualizer" v-if="isListening">
        <div class="wave-bars">
          <div
            v-for="i in 12"
            :key="i"
            class="wave-bar"
            :style="{ animationDelay: `${i * 0.1}s` }"
          ></div>
        </div>
      </div>

      <!-- 语音按钮 -->
      <button
        class="voice-button"
        :class="{ 'is-listening': isListening, 'is-processing': isProcessing }"
        @click="toggleVoiceRecognition"
        :disabled="isProcessing"
        :aria-label="isListening ? '停止录音' : '开始语音识别'"
      >
        <el-icon v-if="!isListening && !isProcessing">
          <Microphone />
        </el-icon>
        <el-icon v-else-if="isProcessing">
          <Loading />
        </el-icon>
        <el-icon v-else>
          <MicrophoneSlash />
        </el-icon>
      </button>

      <!-- 状态指示器 -->
      <div class="status-indicator" v-if="currentStatus">
        <div class="status-text">{{ currentStatus.text }}</div>
        <div class="status-progress" v-if="currentStatus.progress">
          <el-progress :percentage="currentStatus.progress" :show-text="false" :stroke-width="3" />
        </div>
      </div>

      <!-- 识别结果 -->
      <div class="recognition-result" v-if="recognitionResult">
        <div class="result-text">{{ recognitionResult }}</div>
        <div class="result-actions">
          <el-button size="small" @click="confirmRecognition">确认</el-button>
          <el-button size="small" @click="retryRecognition">重试</el-button>
          <el-button size="small" @click="cancelRecognition">取消</el-button>
        </div>
      </div>

      <!-- 方言选择 -->
      <el-select
        v-model="selectedDialect"
        placeholder="选择方言"
        size="small"
        class="dialect-selector"
        @change="changeDialect"
      >
        <el-option
          v-for="dialect in dialects"
          :key="dialect.value"
          :label="dialect.label"
          :value="dialect.value"
        />
      </el-select>
    </div>

    <!-- 语音助手设置面板 -->
    <div class="assistant-settings" v-if="showSettings">
      <div class="settings-header">
        <h3>语音助手设置</h3>
        <el-button size="small" @click="showSettings = false">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>

      <div class="settings-content">
        <el-form :model="voiceSettings" label-width="100px" size="small">
          <el-form-item label="语音速度">
            <el-slider
              v-model="voiceSettings.speechRate"
              :min="0.5"
              :max="2"
              :step="0.1"
              show-input
            />
          </el-form-item>

          <el-form-item label="语音音调">
            <el-slider v-model="voiceSettings.pitch" :min="0.5" :max="2" :step="0.1" show-input />
          </el-form-item>

          <el-form-item label="语音音量">
            <el-slider v-model="voiceSettings.volume" :min="0" :max="1" :step="0.1" show-input />
          </el-form-item>

          <el-form-item label="自动播放">
            <el-switch v-model="voiceSettings.autoPlay" />
          </el-form-item>

          <el-form-item label="离线模式">
            <el-switch v-model="voiceSettings.offlineMode" />
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 快捷命令提示 -->
    <div class="quick-commands" v-if="showQuickCommands">
      <div class="commands-header">
        <h3>快捷命令</h3>
        <el-button size="small" @click="showQuickCommands = false">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>

      <div class="commands-list">
        <div
          v-for="command in quickCommands"
          :key="command.id"
          class="command-item"
          @click="executeQuickCommand(command)"
        >
          <div class="command-icon">
            <el-icon>
              <component :is="command.icon" />
            </el-icon>
          </div>
          <div class="command-info">
            <div class="command-name">{{ command.name }}</div>
            <div class="command-example">{{ command.example }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 设置和快捷命令按钮 -->
    <div class="assistant-actions">
      <el-tooltip content="设置" placement="left">
        <el-button size="small" circle @click="showSettings = !showSettings">
          <el-icon><Setting /></el-icon>
        </el-button>
      </el-tooltip>

      <el-tooltip content="快捷命令" placement="left">
        <el-button size="small" circle @click="showQuickCommands = !showQuickCommands">
          <el-icon><Grid /></el-icon>
        </el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useVoiceStore } from '@/stores/voiceStore';

// Props
const props = defineProps({
  position: {
    type: String,
    default: 'bottom-right',
    validator: value => ['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(value),
  },
});

// Store
const voiceStore = useVoiceStore();

// 响应式数据
const isListening = ref(false);
const isProcessing = ref(false);
const recognitionResult = ref('');
const currentStatus = ref(null);
const selectedDialect = ref('zh-CN');
const showSettings = ref(false);
const showQuickCommands = ref(false);

// 语音设置
const voiceSettings = ref({
  speechRate: 1.0,
  pitch: 1.0,
  volume: 0.8,
  autoPlay: true,
  offlineMode: false,
});

// 方言支持
const dialects = ref([
  { value: 'zh-CN', label: '普通话' },
  { value: 'pcc', label: '赣语' },
  { value: 'pcc-qn', label: '赣语南片' },
  { value: 'yue', label: '粤语' },
  { value: 'hakka', label: '客家话' },
  { value: 'min-nan', label: '闽南语' },
  { value: 'wu', label: '吴语' },
  { value: 'xiang', label: '湘语' },
]);

// 快捷命令
const quickCommands = ref([
  {
    id: 1,
    name: '查看公告',
    example: '查看最新公告',
    icon: 'Bell',
    action: () => navigateTo('/village-affairs'),
  },
  {
    id: 2,
    name: '办理业务',
    example: '我要办理证件',
    icon: 'Document',
    action: () => navigateTo('/services/hall'),
  },
  {
    id: 3,
    name: '财务查询',
    example: '查询村财务',
    icon: 'Money',
    action: () => navigateTo('/finance'),
  },
  {
    id: 4,
    name: '紧急求助',
    example: '紧急情况求助',
    icon: 'WarningFilled',
    action: () => navigateTo('/emergency/report'),
  },
]);

// 计算属性
const voiceAssistantClasses = computed(() => ({
  'is-listening': isListening.value,
  'is-processing': isProcessing.value,
  'large-font': voiceStore.isLargeFontMode,
}));

const assistantStyle = computed(() => {
  const positions = {
    'bottom-right': { bottom: '80px', right: '20px' },
    'bottom-left': { bottom: '80px', left: '20px' },
    'top-right': { top: '80px', right: '20px' },
    'top-left': { top: '80px', left: '20px' },
  };

  return positions[props.position] || positions['bottom-right'];
});

// 语音识别相关
let recognition = null;
let synthesis = null;

// 初始化语音识别
const initSpeechRecognition = () => {
  if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = selectedDialect.value;

    recognition.onstart = () => {
      isListening.value = true;
      currentStatus.value = { text: '正在听取您的指令...' };
      emit('status-change', { listening: true });
    };

    recognition.onresult = event => {
      const transcript = event.results[0][0].transcript;
      recognitionResult.value = transcript;
      currentStatus.value = { text: `识别结果：${transcript}` };

      // 自动处理常用命令
      processVoiceCommand(transcript);
    };

    recognition.onerror = event => {
      console.error('语音识别错误:', event.error);
      currentStatus.value = { text: `识别失败：${getErrorText(event.error)}` };
      isListening.value = false;
      emit('status-change', { listening: false });
    };

    recognition.onend = () => {
      isListening.value = false;
      emit('status-change', { listening: false });
    };
  } else {
    ElMessage.warning('您的浏览器不支持语音识别功能');
  }
};

// 初始化语音合成
const initSpeechSynthesis = () => {
  if ('speechSynthesis' in window) {
    synthesis = window.speechSynthesis;
  }
};

// 切换语音识别
const toggleVoiceRecognition = () => {
  if (isListening.value) {
    stopVoiceRecognition();
  } else {
    startVoiceRecognition();
  }
};

// 开始语音识别
const startVoiceRecognition = () => {
  if (!recognition) {
    initSpeechRecognition();
  }

  if (recognition) {
    recognition.lang = selectedDialect.value;
    recognition.start();
  }
};

// 停止语音识别
const stopVoiceRecognition = () => {
  if (recognition) {
    recognition.stop();
  }
};

// 处理语音命令
const processVoiceCommand = command => {
  const lowerCommand = command.toLowerCase();

  // 导航类命令
  if (lowerCommand.includes('公告') || lowerCommand.includes('通知')) {
    navigateTo('/village-affairs');
    speak('正在为您打开村务公告');
  } else if (lowerCommand.includes('业务') || lowerCommand.includes('办事')) {
    navigateTo('/services/hall');
    speak('正在为您打开办事大厅');
  } else if (lowerCommand.includes('财务') || lowerCommand.includes('账目')) {
    navigateTo('/finance');
    speak('正在为您打开财务管理');
  } else if (lowerCommand.includes('紧急') || lowerCommand.includes('求助')) {
    navigateTo('/emergency/report');
    speak('正在为您打开紧急求助');
  } else if (lowerCommand.includes('个人') || lowerCommand.includes('我的')) {
    navigateTo('/profile');
    speak('正在为您打开个人中心');
  } else {
    // 智能匹配
    const matchedCommand = quickCommands.value.find(
      cmd =>
        lowerCommand.includes(cmd.name.toLowerCase()) ||
        cmd.example.toLowerCase().includes(lowerCommand)
    );

    if (matchedCommand) {
      executeQuickCommand(matchedCommand);
    } else {
      speak('抱歉，我没有理解您的指令，请重试');
    }
  }
};

// 语音播报
const speak = text => {
  if (!synthesis || !voiceSettings.value.autoPlay) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = selectedDialect.value;
  utterance.rate = voiceSettings.value.speechRate;
  utterance.pitch = voiceSettings.value.pitch;
  utterance.volume = voiceSettings.value.volume;

  synthesis.speak(utterance);
};

// 导航
const navigateTo = path => {
  // 这里需要注入router或使用全局router
  window.location.hash = path;
};

// 执行快捷命令
const executeQuickCommand = command => {
  command.action();
  showQuickCommands.value = false;
  ElMessage.success(`执行命令：${command.name}`);
};

// 确认识别结果
const confirmRecognition = () => {
  if (recognitionResult.value) {
    processVoiceCommand(recognitionResult.value);
    recognitionResult.value = '';
    currentStatus.value = null;
  }
};

// 重试识别
const retryRecognition = () => {
  recognitionResult.value = '';
  currentStatus.value = null;
  startVoiceRecognition();
};

// 取消识别
const cancelRecognition = () => {
  recognitionResult.value = '';
  currentStatus.value = null;
  stopVoiceRecognition();
};

// 更改方言
const changeDialect = dialect => {
  voiceStore.setDialect(dialect);
  if (recognition) {
    recognition.lang = dialect;
  }
  ElMessage.success(`已切换到${dialects.value.find(d => d.value === dialect)?.label}`);
};

// 获取错误信息
const getErrorText = error => {
  const errorMap = {
    'no-speech': '没有检测到语音',
    'audio-capture': '无法访问麦克风',
    'not-allowed': '麦克风权限被拒绝',
    network: '网络错误',
    'service-not-allowed': '语音服务不可用',
  };
  return errorMap[error] || '未知错误';
};

// Emits
const emit = defineEmits(['status-change', 'command-executed']);

// 监听设置变化
watch(
  voiceSettings,
  newSettings => {
    voiceStore.updateSettings(newSettings);
  },
  { deep: true }
);

// 生命周期
onMounted(() => {
  initSpeechRecognition();
  initSpeechSynthesis();

  // 从store恢复设置
  const savedSettings = voiceStore.settings;
  if (savedSettings) {
    voiceSettings.value = { ...voiceSettings.value, ...savedSettings };
  }

  const savedDialect = voiceStore.currentDialect;
  if (savedDialect) {
    selectedDialect.value = savedDialect;
  }
});

onUnmounted(() => {
  if (recognition) {
    recognition.stop();
  }
  if (synthesis) {
    synthesis.cancel();
  }
});
</script>

<style lang="scss" scoped>
.voice-assistant {
  position: fixed;
  z-index: 1000;

  &.large-font {
    .voice-button {
      width: 80px;
      height: 80px;
    }

    .status-text {
      font-size: 18px;
    }

    .dialect-selector {
      :deep(.el-input__inner) {
        font-size: 16px;
        height: 40px;
      }
    }
  }
}

.assistant-container {
  position: relative;
  background: var(--el-bg-color);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  padding: 16px;
  min-width: 200px;
  border: 1px solid var(--el-border-color-light);
}

.voice-visualizer {
  margin-bottom: 12px;

  .wave-bars {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 4px;
    height: 40px;

    .wave-bar {
      width: 4px;
      height: 20px;
      background: var(--el-color-primary);
      border-radius: 2px;
      animation: wave 1.2s ease-in-out infinite;
    }
  }
}

.voice-button {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  background: var(--el-color-primary);
  color: white;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(64, 158, 255, 0.4);
  }

  &.is-listening {
    background: var(--el-color-danger);
    animation: pulse 1.5s infinite;
  }

  &.is-processing {
    background: var(--el-color-warning);
    cursor: not-allowed;
  }

  &:disabled {
    background: var(--el-color-info);
    cursor: not-allowed;
  }
}

.status-indicator {
  margin-top: 12px;
  text-align: center;

  .status-text {
    font-size: 14px;
    color: var(--el-text-color-regular);
    margin-bottom: 8px;
  }

  .status-progress {
    margin-top: 8px;
  }
}

.recognition-result {
  margin-top: 16px;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 8px;

  .result-text {
    font-size: 16px;
    color: var(--el-text-color-primary);
    margin-bottom: 12px;
    line-height: 1.5;
  }

  .result-actions {
    display: flex;
    gap: 8px;
    justify-content: center;
  }
}

.dialect-selector {
  margin-top: 12px;
  width: 100%;
}

.assistant-settings {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: var(--el-bg-color);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 16px;
  margin-bottom: 8px;

  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
  }
}

.quick-commands {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: var(--el-bg-color);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 16px;
  margin-bottom: 8px;
  max-height: 300px;
  overflow-y: auto;

  .commands-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
  }

  .commands-list {
    .command-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.2s;

      &:hover {
        background: var(--el-fill-color-light);
      }

      .command-icon {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        background: var(--el-color-primary-light-9);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--el-color-primary);
      }

      .command-info {
        flex: 1;

        .command-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--el-text-color-primary);
        }

        .command-example {
          font-size: 12px;
          color: var(--el-text-color-regular);
          margin-top: 2px;
        }
      }
    }
  }
}

.assistant-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 12px;
}

// 动画
@keyframes wave {
  0%,
  100% {
    height: 20px;
  }
  50% {
    height: 40px;
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 4px 16px rgba(245, 108, 108, 0.4);
  }
  50% {
    box-shadow: 0 4px 16px rgba(245, 108, 108, 0.8);
  }
  100% {
    box-shadow: 0 4px 16px rgba(245, 108, 108, 0.4);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .voice-assistant {
    .assistant-container {
      min-width: 160px;
      padding: 12px;
    }

    .voice-button {
      width: 50px;
      height: 50px;
      font-size: 20px;
    }

    &.large-font .voice-button {
      width: 60px;
      height: 60px;
    }
  }
}
</style>
