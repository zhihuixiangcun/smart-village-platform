<template>
  <div class="voice-assistant">
    <!-- 主界面 -->
    <div class="voice-interface" :class="{ 'is-recording': state.isRecording }">
      <!-- 波形可视化 -->
      <div class="voice-visualizer" v-if="config.enableVisualFeedback">
        <div class="audio-waves">
          <div
            v-for="i in 20"
            :key="i"
            class="wave-bar"
            :style="{ height: `${Math.random() * state.audioLevel * 100}%` }"
          ></div>
        </div>
      </div>

      <!-- 状态指示器 -->
      <div class="status-indicator">
        <div class="status-item">
          <el-icon class="status-icon" :class="getStatusIconClass()">
            <component :is="getStatusIcon()" />
          </el-icon>
          <span class="status-text">{{ getStatusText() }}</span>
        </div>
      </div>

      <!-- 对话历史 -->
      <div class="conversation-history" ref="conversationHistoryRef">
        <div
          v-for="(message, index) in state.conversationHistory"
          :key="index"
          class="conversation-item"
          :class="message.role"
        >
          <div class="message-avatar">
            <el-icon v-if="message.role === 'user'"><User /></el-icon>
            <el-icon v-else><Robot /></el-icon>
          </div>
          <div class="message-content">
            <div class="message-text">{{ message.content }}</div>
            <div class="message-time">{{ formatTime(message.timestamp) }}</div>
          </div>
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="control-buttons">
        <el-button
          type="primary"
          size="large"
          circle
          :disabled="!state.isSupported || state.isProcessing"
          :loading="state.isProcessing"
          @click="toggleRecording"
          class="record-button"
        >
          <el-icon v-if="!state.isRecording"><Microphone /></el-icon>
          <el-icon v-else><VideoPause /></el-icon>
        </el-button>

        <el-button
          type="info"
          size="large"
          circle
          :disabled="!state.isSupported"
          @click="toggleSettings"
          class="settings-button"
        >
          <el-icon><Setting /></el-icon>
        </el-button>

        <el-button type="warning" size="large" circle @click="clearHistory" class="clear-button">
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>

      <!-- 录音时间 -->
      <div class="recording-time" v-if="state.isRecording">
        {{ formatRecordingTime(state.recordingTime) }}
      </div>
    </div>

    <!-- 设置面板 -->
    <el-drawer v-model="showSettings" title="语音设置" direction="rtl" size="400px">
      <div class="settings-content">
        <el-form :model="settings" label-width="120px">
          <!-- 语言和方言设置 -->
          <el-form-item label="检测方言">
            <el-switch v-model="settings.autoDetectDialect" />
          </el-form-item>

          <el-form-item label="默认方言">
            <el-select v-model="settings.preferredDialect" placeholder="选择方言">
              <el-option
                v-for="dialect in dialects"
                :key="dialect.code"
                :label="dialect.name"
                :value="dialect.code"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="音色">
            <el-select v-model="settings.preferredVoice" placeholder="选择音色">
              <el-option label="女声" value="female" />
              <el-option label="男声" value="male" />
            </el-select>
          </el-form-item>

          <!-- 唤醒词设置 -->
          <el-form-item label="唤醒词检测">
            <el-switch v-model="settings.enableWakeWord" />
          </el-form-item>

          <el-form-item label="唤醒词">
            <el-input v-model="settings.wakeWordText" placeholder="输入唤醒词，用逗号分隔" />
          </el-form-item>

          <!-- 录音设置 -->
          <el-form-item label="最大录音时长">
            <el-slider
              v-model="settings.maxRecordingDuration"
              :min="10000"
              :max="120000"
              :step="5000"
              show-input
              :format-tooltip="formatDuration"
            />
          </el-form-item>

          <el-form-item label="静音超时">
            <el-slider
              v-model="settings.silenceTimeout"
              :min="1000"
              :max="10000"
              :step="500"
              show-input
              :format-tooltip="formatDuration"
            />
          </el-form-item>

          <!-- 视觉反馈 -->
          <el-form-item label="波形显示">
            <el-switch v-model="settings.enableVisualFeedback" />
          </el-form-item>

          <!-- 服务设置 -->
          <el-divider content-position="left">服务配置</el-divider>

          <el-form-item label="后端服务">
            <el-input v-model="settings.backendUrl" placeholder="后端服务地址" />
          </el-form-item>

          <el-form-item label="Python服务">
            <el-input v-model="settings.pythonServiceUrl" placeholder="Python服务地址" />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="checkServices">检查服务状态</el-button>
            <el-button @click="testVoice">测试语音功能</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-drawer>

    <!-- 语音测试对话框 -->
    <el-dialog v-model="showTestDialog" title="语音功能测试" width="500px">
      <div class="test-content">
        <el-form :model="testForm" label-width="100px">
          <el-form-item label="测试文本">
            <el-input
              v-model="testForm.testText"
              type="textarea"
              rows="3"
              placeholder="输入要测试的文本"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="testSpeechSynthesis">测试语音合成</el-button>
            <el-button @click="testSpeechRecognition">测试语音识别</el-button>
          </el-form-item>
        </el-form>

        <div v-if="testResult" class="test-result">
          <h4>测试结果：</h4>
          <pre>{{ testResult }}</pre>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, watch } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';
import { Microphone, VideoPause, Setting, Delete, User, Robot } from '@element-plus/icons-vue';
import { useVoiceInteraction } from '@/composables/useVoiceInteraction';

// Props
const props = defineProps({
  autoInit: {
    type: Boolean,
    default: true,
  },
  showHistory: {
    type: Boolean,
    default: true,
  },
  theme: {
    type: String,
    default: 'default',
  },
});

// 语音交互实例
const {
  state,
  config,
  initialize,
  startRecording,
  stopRecording,
  synthesizeSpeech,
  on,
  off,
  cleanup,
} = useVoiceInteraction({
  enableVisualFeedback: true,
  autoDetectDialect: true,
  enableWakeWord: true,
});

// 组件状态
const showSettings = ref(false);
const showTestDialog = ref(false);
const conversationHistoryRef = ref(null);
const dialects = ref([]);

// 设置表单
const settings = reactive({
  autoDetectDialect: config.autoDetectDialect,
  preferredDialect: config.preferredDialect,
  preferredVoice: config.preferredVoice,
  enableWakeWord: config.enableWakeWord,
  wakeWordText: config.wakeWords.join(', '),
  maxRecordingDuration: config.maxRecordingDuration,
  silenceTimeout: config.silenceTimeout,
  enableVisualFeedback: config.enableVisualFeedback,
  backendUrl: config.backendUrl,
  pythonServiceUrl: config.pythonServiceUrl,
});

// 测试表单
const testForm = reactive({
  testText: '这是一个语音功能测试，您能听到我的声音吗？',
});

const testResult = ref('');

// 生命周期
onMounted(async () => {
  if (props.autoInit) {
    await initVoiceService();
  }

  // 加载方言列表
  await loadDialects();

  // 监听语音事件
  setupEventListeners();
});

// 监听设置变化
watch(
  settings,
  newSettings => {
    // 更新配置
    Object.assign(config, {
      autoDetectDialect: newSettings.autoDetectDialect,
      preferredDialect: newSettings.preferredDialect,
      preferredVoice: newSettings.preferredVoice,
      enableWakeWord: newSettings.enableWakeWord,
      wakeWords: newSettings.wakeWordText
        .split(',')
        .map(w => w.trim())
        .filter(w => w),
      maxRecordingDuration: newSettings.maxRecordingDuration,
      silenceTimeout: newSettings.silenceTimeout,
      enableVisualFeedback: newSettings.enableVisualFeedback,
      backendUrl: newSettings.backendUrl,
      pythonServiceUrl: newSettings.pythonServiceUrl,
    });
  },
  { deep: true }
);

// 初始化语音服务
const initVoiceService = async () => {
  try {
    const success = await initialize();
    if (success) {
      ElNotification({
        title: '成功',
        message: '语音服务初始化成功',
        type: 'success',
      });
    } else {
      ElNotification({
        title: '警告',
        message: '语音服务初始化失败，部分功能可能不可用',
        type: 'warning',
      });
    }
  } catch (error) {
    console.error('语音服务初始化失败:', error);
    ElMessage.error('语音服务初始化失败: ' + error.message);
  }
};

// 加载方言列表
const loadDialects = async () => {
  try {
    const response = await fetch(`${config.backendUrl}/api/v1/voice/dialects`);
    if (response.ok) {
      const data = await response.json();
      dialects.value = data.data.dialects;
    }
  } catch (error) {
    console.error('加载方言列表失败:', error);
  }
};

// 设置事件监听器
const setupEventListeners = () => {
  // 录音开始
  on('recordingStarted', () => {
    ElMessage.info('开始录音...');
  });

  // 录音停止
  on('recordingStopped', () => {
    ElMessage.info('录音结束，正在处理...');
  });

  // 语音识别完成
  on('speechRecognized', result => {
    if (result.text) {
      ElNotification({
        title: '识别结果',
        message: result.text,
        type: 'info',
        duration: 3000,
      });
    }
  });

  // 语音播放开始
  on('speechStarted', () => {
    ElMessage.info('正在播放语音...');
  });

  // 语音播放结束
  on('speechEnded', () => {
    // 可以在这里添加播放结束后的处理
  });

  // 命令执行
  on('commandExecuted', command => {
    ElNotification({
      title: '命令执行',
      message: `执行命令: ${command.intent}`,
      type: 'success',
    });
  });

  // 对话更新
  on('conversationUpdate', () => {
    nextTick(() => {
      // 滚动到底部
      if (conversationHistoryRef.value) {
        conversationHistoryRef.value.scrollTop = conversationHistoryRef.value.scrollHeight;
      }
    });
  });
};

// 切换录音状态
const toggleRecording = () => {
  if (state.isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
};

// 切换设置面板
const toggleSettings = () => {
  showSettings.value = !showSettings.value;
};

// 清除历史记录
const clearHistory = () => {
  state.conversationHistory = [];
  ElMessage.success('对话历史已清除');
};

// 检查服务状态
const checkServices = async () => {
  try {
    const results = await Promise.allSettled([
      fetch(`${config.backendUrl}/health`),
      fetch(`${config.pythonServiceUrl}/health`),
    ]);

    const backendStatus = results[0].status === 'fulfilled' ? '正常' : '异常';
    const pythonStatus = results[1].status === 'fulfilled' ? '正常' : '异常';

    ElMessage.success(`服务状态 - 后端: ${backendStatus}, Python: ${pythonStatus}`);
  } catch (error) {
    ElMessage.error('服务检查失败: ' + error.message);
  }
};

// 测试语音功能
const testVoice = () => {
  showTestDialog.value = true;
  testResult.value = '';
};

// 测试语音合成
const testSpeechSynthesis = async () => {
  if (!testForm.testText) {
    ElMessage.warning('请输入测试文本');
    return;
  }

  try {
    testResult.value = '正在合成语音...';
    await synthesizeSpeech(testForm.testText);
    testResult.value = '语音合成测试成功';
  } catch (error) {
    testResult.value = `语音合成测试失败: ${error.message}`;
  }
};

// 测试语音识别
const testSpeechRecognition = async () => {
  try {
    testResult.value = '请开始说话...';
    await startRecording();
    // 这里会在录音结束后自动处理
  } catch (error) {
    testResult.value = `语音识别测试失败: ${error.message}`;
  }
};

// 获取状态图标
const getStatusIcon = () => {
  if (state.isRecording) return 'VideoPause';
  if (state.isProcessing) return 'Loading';
  if (state.isSpeaking) return 'Speaker';
  return 'Microphone';
};

// 获取状态图标样式
const getStatusIconClass = () => {
  return {
    recording: state.isRecording,
    processing: state.isProcessing,
    speaking: state.isSpeaking,
  };
};

// 获取状态文本
const getStatusText = () => {
  if (state.isRecording) return '录音中...';
  if (state.isProcessing) return '处理中...';
  if (state.isSpeaking) return '播放中...';
  if (!state.isSupported) return '不支持';
  if (!state.hasPermission) return '需要权限';
  return '就绪';
};

// 格式化时间
const formatTime = timestamp => {
  return new Date(timestamp).toLocaleTimeString();
};

// 格式化录音时间
const formatRecordingTime = milliseconds => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// 格式化时长
const formatDuration = value => {
  const seconds = value / 1000;
  return `${seconds}秒`;
};
</script>

<style scoped>
.voice-assistant {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  border-radius: 12px;
  overflow: hidden;
}

.voice-interface {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  position: relative;
}

.voice-interface.is-recording {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
  color: white;
}

/* 波形可视化 */
.voice-visualizer {
  width: 100%;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.audio-waves {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 60px;
}

.wave-bar {
  width: 4px;
  background: currentColor;
  border-radius: 2px;
  transition: height 0.1s ease;
  opacity: 0.8;
}

/* 状态指示器 */
.status-indicator {
  margin-bottom: 20px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.status-icon {
  font-size: 18px;
}

.status-icon.recording {
  color: #ff4757;
  animation: pulse 1s infinite;
}

.status-icon.processing {
  color: #ffa502;
}

.status-icon.speaking {
  color: #2ed573;
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

/* 对话历史 */
.conversation-history {
  flex: 1;
  width: 100%;
  overflow-y: auto;
  padding: 10px;
  background: white;
  border-radius: 8px;
  margin-bottom: 20px;
  max-height: 300px;
}

.conversation-item {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.conversation-item.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f1f2f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.conversation-item.user .message-avatar {
  background: #1890ff;
  color: white;
}

.conversation-item.assistant .message-avatar {
  background: #52c41a;
  color: white;
}

.message-content {
  max-width: 70%;
  padding: 8px 12px;
  border-radius: 12px;
  background: #f1f2f6;
}

.conversation-item.user .message-content {
  background: #1890ff;
  color: white;
}

.conversation-item.assistant .message-content {
  background: #52c41a;
  color: white;
}

.message-text {
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 4px;
}

.message-time {
  font-size: 12px;
  opacity: 0.7;
}

/* 控制按钮 */
.control-buttons {
  display: flex;
  gap: 16px;
  align-items: center;
}

.record-button {
  width: 64px !important;
  height: 64px !important;
  font-size: 24px !important;
  background: #1890ff !important;
  border-color: #1890ff !important;
}

.voice-interface.is-recording .record-button {
  background: #ff4757 !important;
  border-color: #ff4757 !important;
}

/* 录音时间 */
.recording-time {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

/* 设置面板 */
.settings-content {
  padding: 20px;
}

/* 测试对话框 */
.test-content {
  padding: 10px 0;
}

.test-result {
  margin-top: 20px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .voice-interface {
    padding: 12px;
  }

  .control-buttons {
    gap: 12px;
  }

  .record-button {
    width: 56px !important;
    height: 56px !important;
    font-size: 20px !important;
  }

  .conversation-history {
    max-height: 200px;
  }

  .message-content {
    max-width: 80%;
  }
}
</style>
