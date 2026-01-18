<template>
  <transition name="fade">
    <view v-if="visible" class="image-preview" @click="handleClose">
      <!-- 遮罩层 -->
      <view class="preview-mask" />

      <!-- 工具栏 -->
      <view class="preview-toolbar" @click.stop>
        <view class="toolbar-info">
          <text class="info-text">{{ currentIndex + 1 }} / {{ images.length }}</text>
        </view>
        <view class="toolbar-actions">
          <view class="action-btn" @click="handleSave" aria-label="保存图片">
            <SvgIcon name="download" :size="44" />
          </view>
          <view class="action-btn" @click="handleClose" aria-label="关闭预览">
            <SvgIcon name="close" :size="44" />
          </view>
        </view>
      </view>

      <!-- 图片容器 -->
      <view class="preview-container" @click.stop>
        <!-- 上一张 -->
        <view
          v-if="images.length > 1"
          class="nav-btn nav-prev"
          @click="handlePrev"
          :class="{ 'nav-disabled': currentIndex === 0 }"
          aria-label="上一张"
        >
          <SvgIcon name="arrow-left" :size="48" />
        </view>

        <!-- 当前图片 -->
        <view class="image-wrapper">
          <image
            :src="currentImage"
            class="preview-image"
            :class="{ 'image-loading': loading }"
            @load="handleLoad"
            @error="handleError"
            mode="aspectFit"
            :aria-label="`图片 ${currentIndex + 1} / ${images.length}`"
          />
          <!-- 加载状态 -->
          <view v-if="loading" class="image-loading-spinner">
            <view class="spinner" />
          </view>
          <!-- 错误状态 -->
          <view v-if="error" class="image-error">
            <SvgIcon name="error" :size="80" />
            <text class="error-text">加载失败</text>
          </view>
        </view>

        <!-- 下一张 -->
        <view
          v-if="images.length > 1"
          class="nav-btn nav-next"
          @click="handleNext"
          :class="{ 'nav-disabled': currentIndex === images.length - 1 }"
          aria-label="下一张"
        >
          <SvgIcon name="arrow-right" :size="48" />
        </view>
      </view>

      <!-- 指示点 -->
      <view v-if="images.length > 1" class="preview-dots" @click.stop>
        <view
          v-for="(img, index) in images"
          :key="index"
          :class="['dot', { 'dot-active': index === currentIndex }]"
          @click="handleDotClick(index)"
        />
      </view>
    </view>
  </transition>
</template>

<script setup>
/**
 * 图片预览组件
 * 适老化设计 - 支持缩放、滑动、保存
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import SvgIcon from '@/components/icons/SvgIcon.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  images: {
    type: Array,
    default: () => []
  },
  initialIndex: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:visible', 'change', 'save'])

const currentIndex = ref(props.initialIndex)
const loading = ref(true)
const error = ref(false)

// 当前图片
const currentImage = computed(() => {
  return props.images[currentIndex.value] || ''
})

// 监听显示状态
watch(() => props.visible, (newVal) => {
  if (newVal) {
    currentIndex.value = props.initialIndex
    loading.value = true
    error.value = false
    // 禁止背景滚动
    document.body.style.overflow = 'hidden'
  } else {
    // 恢复背景滚动
    document.body.style.overflow = ''
  }
})

// 监听索引变化
watch(currentIndex, (newVal) => {
  loading.value = true
  error.value = false
  emit('change', newVal)
})

// 图片加载完成
const handleLoad = () => {
  loading.value = false
  error.value = false
}

// 图片加载失败
const handleError = () => {
  loading.value = false
  error.value = true
}

// 上一张
const handlePrev = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
  }
}

// 下一张
const handleNext = () => {
  if (currentIndex.value < props.images.length - 1) {
    currentIndex.value++
  }
}

// 点击指示点
const handleDotClick = (index) => {
  currentIndex.value = index
}

// 关闭预览
const handleClose = () => {
  emit('update:visible', false)
}

// 保存图片
const handleSave = () => {
  emit('save', {
    index: currentIndex.value,
    url: currentImage.value
  })
}

// 键盘事件
const handleKeydown = (e) => {
  if (!props.visible) return

  switch (e.key) {
    case 'ArrowLeft':
      handlePrev()
      break
    case 'ArrowRight':
      handleNext()
      break
    case 'Escape':
      handleClose()
      break
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  // 确保恢复滚动
  document.body.style.overflow = ''
})

// 暴露方法
defineExpose({
  prev: handlePrev,
  next: handleNext,
  close: handleClose
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.image-preview {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
}

.preview-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.9);
  z-index: 1;
}

.preview-toolbar {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-md $spacing-lg;
  padding-top: calc(env(safe-area-inset-top, 0) + $spacing-md);
}

.toolbar-info {
  padding: $spacing-xs $spacing-md;
  background-color: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: $border-radius-full;
}

.info-text {
  font-size: $font-size-base;
  color: $bg-white;
  font-weight: $font-weight-medium;
}

.toolbar-actions {
  display: flex;
  gap: $spacing-sm;
}

.action-btn {
  width: $touch-target-comfort;
  height: $touch-target-comfort;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: $border-radius-full;
  transition: background-color $transition-fast;
  cursor: pointer;

  &:active {
    background-color: rgba(255, 255, 255, 0.25);
  }
}

.preview-container {
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-xl;
}

.image-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: opacity $transition-base;

  &.image-loading {
    opacity: 0;
  }
}

.image-loading-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.2);
  border-top-color: $bg-white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.image-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-xl;
  background-color: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: $border-radius-lg;
}

.error-text {
  font-size: $font-size-lg;
  color: $bg-white;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: $touch-target-large;
  height: $touch-target-large;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 50%;
  transition: all $transition-fast;
  cursor: pointer;
  z-index: 20;

  &:active {
    transform: translateY(-50%) scale(0.95);
  }

  &.nav-disabled {
    opacity: 0.3;
    pointer-events: none;
  }
}

.nav-prev {
  left: $spacing-lg;
}

.nav-next {
  right: $spacing-lg;
}

.preview-dots {
  position: relative;
  z-index: 10;
  display: flex;
  justify-content: center;
  gap: $spacing-sm;
  padding: $spacing-md;
  padding-bottom: calc(env(safe-area-inset-bottom, 0) + $spacing-md);
}

.dot {
  width: 16rpx;
  height: 16rpx;
  background-color: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  transition: all $transition-fast;
  cursor: pointer;

  &.dot-active {
    width: 32rpx;
    background-color: $bg-white;
  }
}

// 过渡动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// 减少动画
@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active {
    transition: none;
  }

  @keyframes spin {
    to { transform: rotate(0deg); }
  }
}
</style>
