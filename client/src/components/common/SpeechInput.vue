<template>
  <div class="speech-input-component">
    <!-- 语音输入按钮 -->
    <el-button
      v-if="!isActive"
      :type="isListening ? 'danger' : 'primary'"
      :icon="isListening ? 'VideoCamera' : 'Microphone'"
      :disabled="!isSupported || disabled"
      @click="handleToggleListening"
      :class="{
        'speech-btn': true,
        listening: isListening,
        processing: isProcessing,
      }"
      :size="size"
    >
      <template v-if="!isListening && !isProcessing">
        {{ buttonText || '语音输入' }}
      </template>
      <template v-else-if="isListening"> 正在听取... </template>
      <template v-else> 处理中... </template>
    </el-button>

    <!-- 活动状态指示器 -->
    <div v-if="isActive" class="speech-indicator">
      <div class="indicator-content">
        <!-- 语音波形动画 -->
        <div class="voice-wave">
          <div
            v-for="i in 5"
            :key="i"
            class="wave-bar"
            :style="{ animationDelay: `${i * 0.1}s` }"
          />
        </div>

        <!-- 状态文本 -->
        <div class="status-text">
          <span v-if="isListening">🎤 正在听取您的语音...</span>
          <span v-else-if="isProcessing">🔄 正在处理...</span>
        </div>

        <!-- 实时转录文本 -->
        <div v-if="interimTranscript || transcript" class="transcript-preview">
          <div v-if="interimTranscript" class="interim-text">
            {{ interimTranscript }}
            <span class="cursor-blink">|</span>
          </div>
          <div v-if="transcript" class="final-text">
            {{ transcript }}
          </div>
        </div>

        <!-- 置信度指示器 -->
        <div v-if="confidence > 0" class="confidence-indicator">
          <span class="confidence-label">识别置信度:</span>
          <el-progress
            :percentage="confidence"
            :color="getConfidenceColor(confidence)"
            :show-text="false"
            :stroke-width="4"
          />
          <span class="confidence-value">{{ Math.round(confidence) }}%</span>
        </div>

        <!-- 控制按钮 -->
        <div class="control-buttons">
          <el-button
            type="success"
            size="small"
            @click="confirmInput"
            :disabled="!transcript.trim()"
            icon="Check"
          >
            确认
          </el-button>
          <el-button type="warning" size="small" @click="retryListening" icon="RefreshRight">
            重新识别
          </el-button>
          <el-button type="info" size="small" @click="cancelInput" icon="Close"> 取消 </el-button>
        </div>
      </div>
    </div>

    <!-- 语言选择器 -->
    <div v-if="showLanguageSelector" class="language-selector">
      <el-select
        v-model="currentLanguage"
        @change="handleLanguageChange"
        size="small"
        style="width: 120px"
      >
        <el-option
          v-for="[code, name] in supportedLanguages"
          :key="code"
          :label="name"
          :value="code"
        />
      </el-select>
    </div>

    <!-- 错误提示 -->
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="true"
      @close="clearError"
      class="error-alert"
    />

    <!-- 使用提示 -->
    <div v-if="showTips && !isSupported" class="tips-section">
      <el-alert
        title="语音输入不可用"
        description="您的浏览器不支持语音识别功能，请使用Chrome、Edge或Safari浏览器"
        type="warning"
        :closable="false"
      />
    </div>

    <div v-else-if="showTips && isSupported" class="tips-section">
      <el-alert title="语音输入提示" type="info" :closable="true">
        <template #default>
          <ul class="tips-list">
            <li>🎤 点击按钮开始语音输入</li>
            <li>🗣️ 清晰地说出您要输入的内容</li>
            <li>⏸️ 说完后稍等片刻，系统会自动停止</li>
            <li>✅ 确认无误后点击"确认"按钮</li>
            <li>🌏 支持普通话和粤语识别</li>
          </ul>
        </template>
      </el-alert>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Microphone, VideoCamera, Check, RefreshRight, Close } from '@element-plus/icons-vue';
import { useSpeechInput } from '@/composables/useSpeechRecognition';

// Props
const props = defineProps({
  // 目标输入元素的ref
  targetRef: {
    type: Object,
    default: null,
  },
  // 按钮文本
  buttonText: {
    type: String,
    default: '语音输入',
  },
  // 按钮大小
  size: {
    type: String,
    default: 'default',
    validator: value => ['large', 'default', 'small'].includes(value),
  },
  // 是否禁用
  disabled: {
    type: Boolean,
    default: false,
  },
  // 是否显示语言选择器
  showLanguageSelector: {
    type: Boolean,
    default: false,
  },
  // 是否显示使用提示
  showTips: {
    type: Boolean,
    default: false,
  },
  // 自动停止延迟
  autoStopDelay: {
    type: Number,
    default: 3000,
  },
});

// Emits
const emit = defineEmits(['input', 'confirmed', 'cancelled', 'error']);

// 使用语音输入组合函数
const {
  isSupported,
  isListening,
  isProcessing,
  transcript,
  interimTranscript,
  confidence,
  currentLanguage,
  supportedLanguages,
  startSpeechInput,
  stopListening,
  confirmInput: originalConfirmInput,
  cancelInput: originalCancelInput,
  setLanguage,
} = useSpeechInput(props.targetRef);

// 组件状态
const error = ref('');

// 计算属性
const isActive = computed(() => isListening.value || isProcessing.value);

// 方法
const handleToggleListening = () => {
  if (isListening.value) {
    stopListening();
  } else {
    const success = startSpeechInput({
      autoStopDelay: props.autoStopDelay,
    });
    if (!success) {
      error.value = '无法启动语音识别，请检查麦克风权限';
      emit('error', error.value);
    }
  }
};

const confirmInput = () => {
  originalConfirmInput();
  emit('confirmed', transcript.value);
  emit('input', transcript.value);
};

const cancelInput = () => {
  originalCancelInput();
  emit('cancelled');
};

const retryListening = () => {
  stopListening();
  setTimeout(() => {
    handleToggleListening();
  }, 300);
};

const handleLanguageChange = lang => {
  setLanguage(lang);
  ElMessage.success(`已切换到${supportedLanguages.value.find(([code]) => code === lang)?.[1]}`);
};

const clearError = () => {
  error.value = '';
};

const getConfidenceColor = confidence => {
  if (confidence >= 80) return '#67c23a';
  if (confidence >= 60) return '#e6a23c';
  return '#f56c6c';
};

// 监听转录结果变化
watch(transcript, newTranscript => {
  if (newTranscript) {
    emit('input', newTranscript);
  }
});
</script>

<style lang="scss" scoped>
.speech-input-component {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 12px;

  .speech-btn {
    position: relative;
    transition: all 0.3s ease;

    &.listening {
      animation: pulse 1.5s infinite;
      background: linear-gradient(45deg, #f56c6c, #e6a23c);
    }

    &.processing {
      background: linear-gradient(45deg, #409eff, #67c23a);
    }
  }

  .speech-indicator {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 1000;
    margin-top: 8px;
    padding: 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    border: 1px solid #ebeef5;
    min-width: 300px;

    .indicator-content {
      text-align: center;

      .voice-wave {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 3px;
        margin-bottom: 16px;
        height: 40px;

        .wave-bar {
          width: 4px;
          height: 20px;
          background: linear-gradient(to top, #409eff, #67c23a);
          border-radius: 2px;
          animation: wave 1.5s infinite ease-in-out;
        }
      }

      .status-text {
        font-size: 14px;
        color: #606266;
        margin-bottom: 12px;
      }

      .transcript-preview {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 16px;
        text-align: left;

        .interim-text {
          color: #909399;
          font-style: italic;
          margin-bottom: 4px;

          .cursor-blink {
            animation: blink 1s infinite;
          }
        }

        .final-text {
          color: #303133;
          font-weight: 500;
        }
      }

      .confidence-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
        font-size: 12px;

        .confidence-label {
          color: #606266;
        }

        .el-progress {
          flex: 1;
        }

        .confidence-value {
          font-weight: 600;
          color: #303133;
        }
      }

      .control-buttons {
        display: flex;
        justify-content: center;
        gap: 8px;
      }
    }
  }

  .language-selector {
    .el-select {
      min-width: 100px;
    }
  }

  .error-alert {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 8px;
    z-index: 999;
  }

  .tips-section {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 8px;
    z-index: 998;

    .tips-list {
      margin: 0;
      padding-left: 16px;

      li {
        margin-bottom: 4px;
        font-size: 12px;
        color: #606266;
      }
    }
  }
}

// 动画效果
@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(245, 108, 108, 0.7);
  }
  70% {
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(245, 108, 108, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(245, 108, 108, 0);
  }
}

@keyframes wave {
  0%,
  40%,
  100% {
    transform: scaleY(0.4);
  }
  20% {
    transform: scaleY(1);
  }
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .speech-input-component {
    .speech-indicator {
      min-width: 280px;
      padding: 16px;

      .control-buttons {
        flex-direction: column;

        .el-button {
          width: 100%;
        }
      }
    }
  }
}
</style>
