<template>
  <div class="voice-input-container">
    <!-- 麦克风按钮 -->
    <button
      :class="['voice-button', { active: isListening, processing: isProcessing }]"
      :disabled="isProcessing"
      @click="toggleListening"
      :aria-label="isListening ? '停止录音' : '开始录音'"
    >
      <el-icon :size="iconSize">
        <Microphone v-if="!isListening" />
        <Loading v-else />
      </el-icon>
    </button>

    <!-- 状态提示 -->
    <div v-if="showStatus" class="status-indicator">
      <transition name="fade">
        <div v-if="isListening" class="listening-tip">
          <div class="wave-animation">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span class="tip-text">{{ listeningText }}</span>
        </div>

        <div v-else-if="isProcessing" class="processing-tip">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>正在识别...</span>
        </div>

        <div v-else-if="interimText" class="interim-tip">
          <span>"{{ interimText }}"</span>
        </div>
      </transition>
    </div>

    <!-- 识别结果 -->
    <div v-if="showResult && recognizedText" class="result-display">
      <div class="result-text">{{ recognizedText }}</div>
      <div class="result-actions">
        <el-button
          type="text"
          size="small"
          @click="handleCopy"
          icon="CopyDocument"
        >
          复制
        </el-button>
        <el-button
          type="text"
          size="small"
          @click="handleClear"
          icon="Delete"
        >
          清除
        </el-button>
      </div>
    </div>

    <!-- 错误提示 -->
    <el-alert
      v-if="errorMessage"
      type="error"
      :title="errorMessage"
      :closable="true"
      @close="errorMessage = ''"
      show-icon
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Microphone, Loading, CopyDocument } from '@element-plus/icons-vue';
import SpeechRecognizer from '@/utils/speechRecognizer';

/**
 * 语音输入组件 - Voice Input Component
 *
 * 功能：
 * - 点击麦克风按钮开始/停止语音识别
 * - 实时显示识别状态
 * - 支持语音命令解析
 * - 显示识别结果
 */

// Props
const props = defineProps({
  // 是否显示状态提示
  showStatus: {
    type: Boolean,
    default: true
  },
  // 是否显示识别结果
  showResult: {
    type: Boolean,
    default: true
  },
  // 方言
  dialect: {
    type: String,
    default: 'mandarin'
  },
  // 是否自动解析命令
  parseCommand: {
    type: Boolean,
    default: false
  },
  // 图标大小
  iconSize: {
    type: [String, Number],
    default: 24
  },
  // 最大录音时长（秒）
  maxDuration: {
    type: Number,
    default: 30
  }
});

// Emits
const emit = defineEmits([
  'result', // 识别结果事件
  'interim', // 临时结果事件
  'command', // 命令解析事件
  'error', // 错误事件
  'statusChange' // 状态改变事件
]);

// 响应式数据
const isListening = ref(false);
const isProcessing = ref(false);
const interimText = ref('');
const recognizedText = ref('');
const errorMessage = ref('');
const listeningText = ref('正在聆听...');
const recognizer = ref(null);

// 语音识别时长
let recordingTimer = null;
let recordingSeconds = 0;

/**
 * 初始化语音识别
 */
onMounted(() => {
  recognizer.value = new SpeechRecognizer({
    dialect: props.dialect
  });

  // 监听事件
  recognizer.value.on('statusChange', handleStatusChange);
  recognizer.value.on('result', handleResult);
  recognizer.value.on('interim', handleInterim);
  recognizer.value.on('error', handleError);

  // 检查浏览器支持
  if (!SpeechRecognizer.isSupported()) {
    errorMessage.value = '您的浏览器不支持语音识别功能';
    ElMessage.warning(errorMessage.value);
  }
});

/**
 * 清理资源
 */
onUnmounted(() => {
  if (recognizer.value) {
    recognizer.value.destroy();
  }
  if (recordingTimer) {
    clearInterval(recordingTimer);
  }
});

/**
 * 监听方言变化
 */
watch(() => props.dialect, (newDialect) => {
  if (recognizer.value) {
    recognizer.value.setDialect(newDialect);
  }
});

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
 * 开始录音
 */
const startListening = () => {
  if (!recognizer.value) {
    ElMessage.error('语音识别未初始化');
    return;
  }

  isListening.value = true;
  interimText.value = '';
  errorMessage.value = '';
  recordingSeconds = 0;

  // 开始计时
  recordingTimer = setInterval(() => {
    recordingSeconds++;
    const remaining = props.maxDuration - recordingSeconds;
    if (remaining <= 0) {
      stopListening();
      ElMessage.warning('已达到最大录音时长');
    } else if (remaining <= 5) {
      listeningText.value = `还剩${remaining}秒...`;
    } else {
      listeningText.value = '正在聆听...';
    }
  }, 1000);

  recognizer.value.start();
};

/**
 * 停止录音
 */
const stopListening = () => {
  if (recognizer.value) {
    recognizer.value.stop();
  }

  isListening.value = false;
  listeningText.value = '正在聆听...';

  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
};

/**
 * 处理状态变化
 */
const handleStatusChange = (status) => {
  isProcessing.value = status === 'processing';
  emit('statusChange', status);
};

/**
 * 处理识别结果
 */
const handleResult = (data) => {
  const { text, isFinal, confidence } = data;

  if (isFinal) {
    recognizedText.value = text;
    interimText.value = '';
    emit('result', { text, confidence });

    // 解析命令
    if (props.parseCommand && recognizer.value) {
      const command = recognizer.value.parseCommand(text);
      if (command) {
        emit('command', command);
      }
    }
  }

  stopListening();
};

/**
 * 处理临时结果
 */
const handleInterim = (text) => {
  interimText.value = text;
  emit('interim', text);
};

/**
 * 处理错误
 */
const handleError = (error) => {
  errorMessage.value = error.message;
  emit('error', error);

  ElMessage.error(error.message);
  stopListening();
};

/**
 * 复制结果
 */
const handleCopy = () => {
  if (recognizedText.value) {
    navigator.clipboard.writeText(recognizedText.value).then(() => {
      ElMessage.success('已复制到剪贴板');
    });
  }
};

/**
 * 清除结果
 */
const handleClear = () => {
  recognizedText.value = '';
  interimText.value = '';
  errorMessage.value = '';
};

// 暴露方法给父组件
defineExpose({
  startListening,
  stopListening,
  toggleListening,
  clear: handleClear
});
</script>

<style scoped lang="scss">
.voice-input-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.voice-button {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover:not(:disabled) {
    transform: scale(1.1);
    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &.active {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    animation: pulse 1.5s infinite;
  }

  &.processing {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(240, 147, 251, 0.4);
  }
  50% {
    box-shadow: 0 0 0 20px rgba(240, 147, 251, 0);
  }
}

.status-indicator {
  min-height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.listening-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  .wave-animation {
    display: flex;
    gap: 4px;
    align-items: center;

    span {
      width: 4px;
      height: 20px;
      background: #667eea;
      border-radius: 2px;
      animation: wave 1s ease-in-out infinite;

      &:nth-child(2) {
        animation-delay: 0.2s;
      }

      &:nth-child(3) {
        animation-delay: 0.4s;
      }
    }
  }

  .tip-text {
    font-size: 14px;
    color: #667eea;
    font-weight: 500;
  }
}

@keyframes wave {
  0%, 100% {
    height: 10px;
  }
  50% {
    height: 30px;
  }
}

.processing-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #909399;
  font-size: 14px;
}

.interim-tip {
  color: #909399;
  font-size: 14px;
  font-style: italic;
  max-width: 300px;
  text-align: center;
}

.result-display {
  width: 100%;
  max-width: 400px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;

  .result-text {
    font-size: 16px;
    color: #303133;
    margin-bottom: 8px;
    line-height: 1.6;
  }

  .result-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
