<template>
  <view class="voice-player" :class="{ 'voice-player--floating': floating }">
    <!-- 播放控制按钮 -->
    <view
      class="play-btn"
      :class="{ 'play-btn--playing': isPlaying }"
      @click="togglePlay"
      :aria-label="isPlaying ? '暂停播报' : '开始播报'"
    >
      <SvgIcon :name="isPlaying ? 'pause' : 'play-circle'" :size="floating ? 56 : 48" />
    </view>

    <!-- 播放进度 -->
    <view v-if="!floating" class="player-info">
      <view class="player-status">
        <SvgIcon :name="isPlaying ? 'notification' : 'info'" :size="32" />
        <text class="status-text">{{ statusText }}</text>
      </view>
      <view v-if="isPlaying || progress > 0" class="player-progress">
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: progress + '%' }" />
        </view>
        <text class="progress-text">{{ progressText }}</text>
      </view>
    </view>

    <!-- 语速控制 -->
    <view v-if="showSettings" class="player-settings">
      <view class="setting-item">
        <text class="setting-label">语速</text>
        <view class="speed-options">
          <view
            v-for="speed in speedOptions"
            :key="speed.value"
            :class="['speed-option', { 'speed-option--active': rate === speed.value }]"
            @click="setRate(speed.value)"
          >
            {{ speed.label }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
/**
 * 语音播报组件 (TTS)
 * 适老化功能 - 使用 Web Speech API
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import SvgIcon from '@/components/icons/SvgIcon.vue'

const props = defineProps({
  // 播报文本
  text: {
    type: String,
    default: ''
  },
  // 是否浮动显示
  floating: {
    type: Boolean,
    default: false
  },
  // 是否显示设置
  showSettings: {
    type: Boolean,
    default: false
  },
  // 自动播放
  autoPlay: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['play', 'pause', 'end', 'error'])

// 语音合成对象
let synthesis = null
let utterance = null

// 播放状态
const isPlaying = ref(false)
const isPaused = ref(false)
const progress = ref(0)

// 语速
const rate = ref(1)
const speedOptions = [
  { label: '慢', value: 0.75 },
  { label: '正常', value: 1 },
  { label: '快', value: 1.25 }
]

// 状态文本
const statusText = computed(() => {
  if (isPlaying.value) return '正在播报...'
  if (isPaused.value) return '已暂停'
  if (!props.text) return '暂无内容'
  return '点击播报'
})

// 进度文本
const progressText = computed(() => {
  if (!isPlaying.value && !isPaused.value) return ''
  return `${Math.floor(progress.value)}%`
})

// 初始化语音合成
const initSpeech = () => {
  if ('speechSynthesis' in window) {
    synthesis = window.speechSynthesis
  } else {
    console.warn('浏览器不支持语音合成')
    emit('error', '浏览器不支持语音播报功能')
  }
}

// 开始播放
const play = () => {
  if (!props.text || !synthesis) return

  // 停止当前播放
  stop()

  // 创建新的语音实例
  utterance = new SpeechSynthesisUtterance(props.text)

  // 设置语音参数
  utterance.rate = rate.value
  utterance.pitch = 1
  utterance.volume = 1
  utterance.lang = 'zh-CN'

  // 事件监听
  utterance.onstart = () => {
    isPlaying.value = true
    isPaused.value = false
    progress.value = 0
    emit('play')
  }

  utterance.onend = () => {
    isPlaying.value = false
    isPaused.value = false
    progress.value = 100
    emit('end')
  }

  utterance.onerror = (event) => {
    console.error('语音播报错误:', event.error)
    isPlaying.value = false
    isPaused.value = false
    emit('error', event.error)
  }

  // 开始播放
  synthesis.speak(utterance)

  // 模拟进度
  simulateProgress()
}

// 模拟进度（因为SpeechSynthesis没有真正的进度事件）
let progressInterval = null
const simulateProgress = () => {
  clearInterval(progressInterval)

  // 估算播报时间（约200字/分钟）
  const estimatedTime = Math.max(3000, props.text.length * 300 / rate.value)
  const updateInterval = 100
  const progressStep = 100 / (estimatedTime / updateInterval)

  progress.value = 0
  progressInterval = setInterval(() => {
    if (isPlaying.value && !isPaused.value) {
      progress.value = Math.min(100, progress.value + progressStep)
    }
  }, updateInterval)
}

// 暂停播放
const pause = () => {
  if (synthesis && isPlaying.value) {
    synthesis.pause()
    isPaused.value = true
    isPlaying.value = false
    emit('pause')
  }
}

// 恢复播放
const resume = () => {
  if (synthesis && isPaused.value) {
    synthesis.resume()
    isPlaying.value = true
    isPaused.value = false
    emit('play')
  }
}

// 停止播放
const stop = () => {
  if (synthesis) {
    synthesis.cancel()
  }
  clearInterval(progressInterval)
  isPlaying.value = false
  isPaused.value = false
  progress.value = 0
}

// 切换播放/暂停
const togglePlay = () => {
  if (!synthesis) {
    initSpeech()
  }

  if (isPlaying.value) {
    pause()
  } else if (isPaused.value) {
    resume()
  } else {
    play()
  }
}

// 设置语速
const setRate = (newRate) => {
  rate.value = newRate

  // 如果正在播放，重新开始
  if (isPlaying.value || isPaused.value) {
    stop()
    play()
  }
}

// 监听文本变化
watch(() => props.text, () => {
  stop()
  if (props.autoPlay && props.text) {
    setTimeout(() => play(), 500)
  }
})

// 监听自动播放
watch(() => props.autoPlay, (newVal) => {
  if (newVal && props.text && !isPlaying.value) {
    play()
  }
})

onMounted(() => {
  initSpeech()
})

onUnmounted(() => {
  stop()
})

// 暴露方法
defineExpose({
  play,
  pause,
  resume,
  stop,
  togglePlay,
  setRate
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.voice-player {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md;
  background-color: $bg-white;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-sm;

  &--floating {
    position: fixed;
    bottom: $spacing-xl;
    right: $spacing-xl;
    flex-direction: column;
    padding: $spacing-md;
    background-color: $primary-color;
    box-shadow: $shadow-lg;
    z-index: $z-index-fixed;
  }
}

.play-btn {
  width: $touch-target-comfort;
  height: $touch-target-comfort;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $primary-color;
  border-radius: 50%;
  color: $bg-white;
  transition: all $transition-fast;
  cursor: pointer;
  flex-shrink: 0;

  &:active {
    transform: scale(0.95);
  }

  &--playing {
    background-color: $danger-color;
    animation: pulse 2s ease-in-out infinite;
  }
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4);
  }
  50% {
    box-shadow: 0 0 0 16rpx rgba(220, 38, 38, 0);
  }
}

.player-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.player-status {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
}

.status-text {
  font-size: $font-size-base;
  color: $text-primary;
  font-weight: $font-weight-medium;
}

.player-progress {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.progress-bar {
  flex: 1;
  height: 8rpx;
  background-color: $bg-color-light;
  border-radius: 4rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: $primary-color;
  border-radius: 4rpx;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: $font-size-sm;
  color: $text-tertiary;
  min-width: 60rpx;
  text-align: right;
}

.player-settings {
  width: 100%;
  padding-top: $spacing-md;
  border-top: 1rpx solid $border-color;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.setting-label {
  font-size: $font-size-sm;
  color: $text-secondary;
}

.speed-options {
  display: flex;
  gap: $spacing-sm;
}

.speed-option {
  padding: $spacing-xs $spacing-md;
  background-color: $bg-color-light;
  border-radius: $border-radius-base;
  font-size: $font-size-base;
  color: $text-secondary;
  transition: all $transition-fast;
  cursor: pointer;

  &--active {
    background-color: $primary-color;
    color: $bg-white;
  }

  &:active {
    transform: scale(0.95);
  }
}

// 适老化模式
:global(.elderly-mode-large) {
  .play-btn {
    width: $touch-target-large;
    height: $touch-target-large;
  }
}

:global(.elderly-mode-xl) {
  .play-btn {
    width: 120rpx;
    height: 120rpx;
  }

  .status-text {
    font-size: $font-size-lg;
  }
}

// 减少动画
@media (prefers-reduced-motion: reduce) {
  @keyframes pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4);
    }
    50% {
      box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4);
    }
  }

  .play-btn,
  .speed-option {
    transition: none;
  }

  .progress-fill {
    transition: none;
  }
}
</style>
