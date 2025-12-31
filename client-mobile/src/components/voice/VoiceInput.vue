<template>
  <view class="voice-input">
    <!-- 输入框 -->
    <view
      :class="['voice-input__wrapper', { 'voice-input__wrapper--focus': focused }]"
      @click="handleFocus"
    >
      <!-- 图标 -->
      <view class="voice-input__icon">
        <text class="icon">{{ icon }}</text>
      </view>

      <!-- 输入区域 -->
      <view class="voice-input__content">
        <textarea
          v-if="type === 'textarea'"
          ref="inputRef"
          v-model="inputValue"
          :class="['voice-input__textarea', textareaClass]"
          :placeholder="placeholder"
          :disabled="disabled || recording"
          :maxlength="maxLength"
          :auto-height="autoHeight"
          @focus="handleFocus"
          @blur="handleBlur"
          @input="handleInput"
          @confirm="handleConfirm"
        />
        <input
          v-else
          ref="inputRef"
          v-model="inputValue"
          :class="['voice-input__input', inputClass]"
          :type="inputType"
          :placeholder="placeholder"
          :disabled="disabled || recording"
          :maxlength="maxLength"
          @focus="handleFocus"
          @blur="handleBlur"
          @input="handleInput"
          @confirm="handleConfirm"
        />

        <!-- 清空按钮 -->
        <view
          v-if="showClear && inputValue && !disabled"
          class="voice-input__clear"
          @click.stop="handleClear"
        >
          <text class="icon">✕</text>
        </view>
      </view>

      <!-- 语音按钮 -->
      <view
        v-if="showVoiceButton && !disabled"
        :class="[
          'voice-input__button',
          { 'voice-input__button--recording': recording }
        ]"
        @touchstart="handleVoiceStart"
        @touchend="handleVoiceEnd"
        @touchcancel="handleVoiceCancel"
      >
        <text class="voice-icon">🎤</text>
      </view>
    </view>

    <!-- 录音状态指示器 -->
    <view v-if="recording" class="voice-input__recording">
      <view class="recording-wave">
        <view class="wave-bar" />
        <view class="wave-bar" />
        <view class="wave-bar" />
        <view class="wave-bar" />
        <view class="wave-bar" />
      </view>
      <text class="recording-text">正在录音...</text>
      <text class="recording-hint">松开结束</text>
    </view>

    <!-- 语音识别结果弹窗 -->
    <uni-popup ref="resultPopup" type="dialog">
      <uni-popup-dialog
        :title="voiceResultTitle"
        :content="voiceResult"
        :before-close="true"
        @confirm="handleVoiceConfirm"
        @close="handleVoiceCancel"
      />
    </uni-popup>
  </view>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useElderlyStore } from '@/store/elderly'

/**
 * 语音输入组件
 * 支持语音识别、文字输入、适老化设计
 */

const props = defineProps({
  // 输入框类型
  type: {
    type: String,
    default: 'text',
    validator: (value) => ['text', 'textarea', 'number', 'idcard', 'password'].includes(value)
  },

  // 占位符
  placeholder: {
    type: String,
    default: '请输入或按住说话'
  },

  // 绑定值
  modelValue: {
    type: String,
    default: ''
  },

  // 是否禁用
  disabled: {
    type: Boolean,
    default: false
  },

  // 最大长度
  maxLength: {
    type: Number,
    default: 500
  },

  // 是否自动高度
  autoHeight: {
    type: Boolean,
    default: false
  },

  // 是否显示清空按钮
  showClear: {
    type: Boolean,
    default: true
  },

  // 是否显示语音按钮
  showVoiceButton: {
    type: Boolean,
    default: true
  },

  // 图标
  icon: {
    type: String,
    default: '📝'
  },

  // 自定义class
  inputClass: {
    type: String,
    default: ''
  },

  // 自定义class（textarea）
  textareaClass: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'input', 'focus', 'blur', 'confirm', 'clear', 'voice-input'])

const elderlyStore = useElderlyStore()

// 输入框引用
const inputRef = ref(null)

// 输入值
const inputValue = ref(props.modelValue)

// 是否聚焦
const focused = ref(false)

// 是否正在录音
const recording = ref(false)

// 语音识别结果
const voiceResult = ref('')

// 监听modelValue变化
watch(() => props.modelValue, (newVal) => {
  inputValue.value = newVal
})

// 监听输入值变化
watch(inputValue, (newVal) => {
  emit('update:modelValue', newVal)
  emit('input', newVal)
})

// 实际input type
const inputType = computed(() => {
  const typeMap = {
    text: 'text',
    number: 'number',
    idcard: 'idcard',
    password: 'password',
    textarea: 'text'
  }
  return typeMap[props.type] || 'text'
})

// 语音结果弹窗标题
const voiceResultTitle = computed(() => {
  return recording.value ? '语音识别中...' : '语音识别结果'
})

// 聚焦
const handleFocus = (e) => {
  focused.value = true
  emit('focus', e)
}

// 失焦
const handleBlur = (e) => {
  focused.value = false
  emit('blur', e)
}

// 输入
const handleInput = (e) => {
  inputValue.value = e.detail.value
}

// 确认
const handleConfirm = (e) => {
  emit('confirm', inputValue.value)
}

// 清空
const handleClear = () => {
  inputValue.value = ''
  emit('clear')
  elderlyStore.vibrate('short')
}

// 开始录音
const handleVoiceStart = async () => {
  if (!elderlyStore.voiceEnabled) {
    uni.showToast({
      title: '语音功能未启用',
      icon: 'none'
    })
    return
  }

  // 震动反馈
  elderlyStore.vibrate('long')

  try {
    recording.value = true
    voiceResult.value = ''

    // 开始语音识别
    await elderlyStore.startRecording()

    uni.showToast({
      title: '录音中，请说话...',
      icon: 'none',
      duration: 1000
    })

  } catch (error) {
    recording.value = false
    console.error('语音识别启动失败:', error)

    uni.showToast({
      title: error.message || '语音识别失败',
      icon: 'none'
    })
  }
}

// 结束录音
const handleVoiceEnd = async () => {
  if (!recording.value) return

  try {
    // 停止录音
    const result = await elderlyStore.stopRecording()
    recording.value = false

    // 获取识别结果
    const text = result?.transcript || elderlyStore.recordingResult || ''

    if (text) {
      voiceResult.value = text

      // 自动填入
      if (text.length > 0) {
        inputValue.value += text
        emit('voice-input', text)

        uni.showToast({
          title: '识别成功',
          icon: 'success',
          duration: 1000
        })

        // 语音播报确认
        elderlyStore.speak('识别成功')
      }
    } else {
      uni.showToast({
        title: '未识别到语音',
        icon: 'none'
      })
    }

  } catch (error) {
    recording.value = false
    console.error('语音识别失败:', error)

    uni.showToast({
      title: '识别失败，请重试',
      icon: 'none'
    })
  }
}

// 取消录音
const handleVoiceCancel = () => {
  if (recording.value) {
    elderlyStore.stopRecording()
    recording.value = false

    uni.showToast({
      title: '已取消录音',
      icon: 'none'
    })
  }
}

// 确认语音结果
const handleVoiceConfirm = () => {
  if (voiceResult.value) {
    inputValue.value = voiceResult.value
  }
  voiceResult.value = ''
}

// 暴露方法
defineExpose({
  focus: () => {
    nextTick(() => {
      inputRef.value?.focus()
    })
  },
  blur: () => {
    inputRef.value?.blur()
  },
  clear: handleClear
})
</script>

<style lang="scss" scoped>
.voice-input {
  position: relative;

  &__wrapper {
    display: flex;
    align-items: center;
    gap: 16rpx;
    padding: 24rpx 32rpx;
    background-color: var(--color-bg-card, #F7FAFC);
    border: 2rpx solid var(--color-border-primary, #E2E8F0);
    border-radius: 16rpx;
    transition: all 0.3s ease;

    &--focus {
      border-color: var(--color-primary, #2F855A);
      box-shadow: 0 0 0 4rpx rgba(47, 133, 90, 0.1);
    }

    // 适老化模式 - 大字版
    :global(.elderly-mode-large) & {
      padding: 32rpx 40rpx;
      border-radius: 20rpx;
      gap: 24rpx;
    }

    // 适老化模式 - 超大字版
    :global(.elderly-mode-xl) & {
      padding: 40rpx 48rpx;
      border-radius: 24rpx;
      gap: 32rpx;
    }
  }

  &__icon {
    font-size: 40rpx;
    flex-shrink: 0;

    :global(.elderly-mode-large) & {
      font-size: 48rpx;
    }

    :global(.elderly-mode-xl) & {
      font-size: 56rpx;
    }
  }

  &__content {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
  }

  &__input,
  &__textarea {
    flex: 1;
    font-size: 32rpx;
    line-height: 1.6;
    color: var(--color-text-primary, #1A202C);

    &::placeholder {
      color: var(--color-text-tertiary, #718096);
    }

    // 适老化模式
    :global(.elderly-mode-large) & {
      font-size: 36rpx;
    }

    :global(.elderly-mode-xl) & {
      font-size: 44rpx;
    }
  }

  &__textarea {
    min-height: 200rpx;
    max-height: 400rpx;
  }

  &__clear {
    position: absolute;
    right: 8rpx;
    top: 50%;
    transform: translateY(-50%);
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-text-tertiary, #718096);
    border-radius: 50%;
    color: #FFFFFF;
    font-size: 24rpx;

    :global(.elderly-mode-large) & {
      width: 56rpx;
      height: 56rpx;
    }

    :global(.elderly-mode-xl) & {
      width: 64rpx;
      height: 64rpx;
    }
  }

  &__button {
    width: 96rpx;
    height: 96rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    flex-shrink: 0;
    transition: all 0.3s ease;

    :global(.elderly-mode-large) & {
      width: 112rpx;
      height: 112rpx;
    }

    :global(.elderly-mode-xl) & {
      width: 128rpx;
      height: 128rpx;
    }

    &--recording {
      animation: pulse 1.5s ease-in-out infinite;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    .voice-icon {
      font-size: 48rpx;

      :global(.elderly-mode-large) & {
        font-size: 56rpx;
      }

      :global(.elderly-mode-xl) & {
        font-size: 64rpx;
      }
    }
  }

  &__recording {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 48rpx 64rpx;
    background: rgba(0, 0, 0, 0.9);
    border-radius: 24rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24rpx;
    z-index: 9999;
  }
}

.recording-wave {
  display: flex;
  align-items: center;
  gap: 8rpx;
  height: 80rpx;

  .wave-bar {
    width: 8rpx;
    height: 40rpx;
    background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
    border-radius: 4rpx;
    animation: wave 1s ease-in-out infinite;

    &:nth-child(1) { animation-delay: 0s; }
    &:nth-child(2) { animation-delay: 0.1s; }
    &:nth-child(3) { animation-delay: 0.2s; }
    &:nth-child(4) { animation-delay: 0.3s; }
    &:nth-child(5) { animation-delay: 0.4s; }
  }
}

.recording-text {
  font-size: 36rpx;
  color: #FFFFFF;
}

.recording-hint {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.6);
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(245, 87, 108, 0.7);
  }
  50% {
    transform: scale(1.1);
    box-shadow: 0 0 0 20rpx rgba(245, 87, 108, 0);
  }
}

@keyframes wave {
  0%, 100% {
    height: 40rpx;
  }
  50% {
    height: 80rpx;
  }
}
</style>