<template>
  <button
    :class="buttonClass"
    :disabled="disabled || loading"
    :type="nativeType"
    v-bind="$attrs"
    @click="handleClick"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <!-- 加载图标 -->
    <span v-if="loading" class="elderly-button__loading">
      <i class="el-icon-loading"></i>
    </span>

    <!-- 图标 -->
    <span v-if="icon && !loading" class="elderly-button__icon">
      <i :class="icon"></i>
    </span>

    <!-- 按钮内容 -->
    <span v-if="$slots.default" class="elderly-button__content">
      <slot></slot>
    </span>

    <!-- 触觉反馈效果 -->
    <span class="elderly-button__ripple" ref="ripple"></span>
  </button>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  // 按钮类型
  type: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'success', 'warning', 'danger', 'text'].includes(value)
  },
  // 尺寸
  size: {
    type: String,
    default: 'large',
    validator: (value) => ['small', 'medium', 'large', 'extra-large'].includes(value)
  },
  // 图标类名
  icon: {
    type: String,
    default: ''
  },
  // 原生类型
  nativeType: {
    type: String,
    default: 'button',
    validator: (value) => ['button', 'submit', 'reset'].includes(value)
  },
  // 是否禁用
  disabled: {
    type: Boolean,
    default: false
  },
  // 是否加载中
  loading: {
    type: Boolean,
    default: false
  },
  // 是否显示轮廓
  plain: {
    type: Boolean,
    default: false
  },
  // 是否圆角
  round: {
    type: Boolean,
    default: false
  },
  // 是否需要长按确认
  longPressConfirm: {
    type: Boolean,
    default: false
  },
  // 长按确认时长
  longPressDuration: {
    type: Number,
    default: 800
  }
})

const emit = defineEmits(['click', 'long-press'])

const ripple = ref(null)
let longPressTimer = null
let isLongPressing = false

// 计算按钮样式类
const buttonClass = computed(() => {
  return [
    'elderly-button',
    `elderly-button--${props.type}`,
    `elderly-button--${props.size}`,
    {
      'is-disabled': props.disabled || props.loading,
      'is-loading': props.loading,
      'is-plain': props.plain,
      'is-round': props.round,
      'is-long-pressing': isLongPressing
    }
  ]
})

// 处理点击
const handleClick = (e) => {
  if (props.disabled || props.loading) return
  if (props.longPressConfirm) return // 长按确认模式下，普通点击不触发

  triggerHaptic('light')
  createRipple(e)
  emit('click', e)
}

// 处理触摸开始
const handleTouchStart = (e) => {
  if (!props.longPressConfirm) return

  longPressTimer = setTimeout(() => {
    isLongPressing = true
    triggerHaptic('heavy')

    // 震动提示
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50])
    }

    emit('long-press', e)
  }, props.longPressDuration)
}

// 处理触摸结束
const handleTouchEnd = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }

  if (isLongPressing) {
    isLongPressing = false
  }
}

// 触觉反馈
const triggerHaptic = (type) => {
  if (!('vibrate' in navigator)) return

  const patterns = {
    light: [10],
    medium: [20],
    heavy: [30],
    success: [10, 30, 10],
    error: [50, 50, 50]
  }

  try {
    navigator.vibrate(patterns[type] || patterns.light)
  } catch (err) {
    console.warn('触觉反馈不可用:', err)
  }
}

// 创建波纹效果
const createRipple = (event) => {
  if (!ripple.value) return

  const button = event.currentTarget
  const rect = button.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const x = event.clientX - rect.left - size / 2
  const y = event.clientY - rect.top - size / 2

  const rippleEl = document.createElement('span')
  rippleEl.style.width = rippleEl.style.height = `${size}px`
  rippleEl.style.left = `${x}px`
  rippleEl.style.top = `${y}px`
  rippleEl.classList.add('elderly-button__ripple-element')

  ripple.value.appendChild(rippleEl)

  setTimeout(() => {
    rippleEl.remove()
  }, 600)
}
</script>

<style lang="scss" scoped>
.elderly-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  font-weight: 600;
  text-align: center;
  cursor: pointer;
  border: none;
  outline: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  overflow: hidden;

  // 触觉反馈样式
  &:active:not(.is-disabled) {
    transform: scale(0.98);
  }

  // 禁用状态
  &.is-disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  // 加载状态
  &.is-loading {
    pointer-events: none;
  }

  // 长按确认状态
  &.is-long-pressing {
    animation: longPressPulse 0.5s ease-in-out infinite;
  }

  // 尺寸规范
  &--extra-large {
    height: 64px;
    padding: 20px 40px;
    font-size: 24px;
    border-radius: 12px;
    min-width: 200px;
  }

  &--large {
    height: 56px;
    padding: 16px 32px;
    font-size: 20px;
    border-radius: 8px;
    min-width: 160px;
  }

  &--medium {
    height: 48px;
    padding: 14px 28px;
    font-size: 18px;
    border-radius: 8px;
    min-width: 120px;
  }

  &--small {
    height: 40px;
    padding: 10px 20px;
    font-size: 16px;
    border-radius: 6px;
    min-width: 100px;
  }

  // 类型样式
  &--primary {
    background: linear-gradient(135deg, #E85D4C 0%, #FF6B6B 100%);
    color: #FFFFFF;
    box-shadow: 0 4px 12px rgba(232, 93, 76, 0.3);

    &:hover:not(.is-disabled) {
      background: linear-gradient(135deg, #FF8A7A 0%, #FF8585 100%);
      box-shadow: 0 6px 16px rgba(232, 93, 76, 0.4);
    }

    &:active:not(.is-disabled) {
      background: linear-gradient(135deg, #C73E2F 0%, #E85D4C 100%);
    }

    &.is-plain {
      background: transparent;
      border: 3px solid #E85D4C;
      color: #E85D4C;

      &:hover:not(.is-disabled) {
        background: rgba(232, 93, 76, 0.1);
      }
    }
  }

  &--secondary {
    background: linear-gradient(135deg, #52A885 0%, #5FB894 100%);
    color: #FFFFFF;
    box-shadow: 0 4px 12px rgba(82, 168, 133, 0.3);

    &:hover:not(.is-disabled) {
      background: linear-gradient(135deg, #7BC4A3 0%, #8FD4B5 100%);
    }

    &.is-plain {
      background: transparent;
      border: 3px solid #52A885;
      color: #52A885;

      &:hover:not(.is-disabled) {
        background: rgba(82, 168, 133, 0.1);
      }
    }
  }

  &--success {
    background: linear-gradient(135deg, #67C23A 0%, #7DD44C 100%);
    color: #FFFFFF;
    box-shadow: 0 4px 12px rgba(103, 194, 58, 0.3);

    &.is-plain {
      background: transparent;
      border: 3px solid #67C23A;
      color: #67C23A;
    }
  }

  &--warning {
    background: linear-gradient(135deg, #E6A23C 0%, #F0B94D 100%);
    color: #FFFFFF;
    box-shadow: 0 4px 12px rgba(230, 162, 60, 0.3);

    &.is-plain {
      background: transparent;
      border: 3px solid #E6A23C;
      color: #E6A23C;
    }
  }

  &--danger {
    background: linear-gradient(135deg, #F56C6C 0%, #FF8080 100%);
    color: #FFFFFF;
    box-shadow: 0 4px 12px rgba(245, 108, 108, 0.3);

    &.is-plain {
      background: transparent;
      border: 3px solid #F56C6C;
      color: #F56C6C;
    }
  }

  &--text {
    background: transparent;
    color: #E85D4C;
    box-shadow: none;

    &:hover:not(.is-disabled) {
      background: rgba(232, 93, 76, 0.1);
    }
  }

  // 圆角
  &.is-round {
    border-radius: 9999px;
  }

  // 图标
  &__icon {
    margin-right: 8px;
    font-size: 1.2em;
  }

  // 加载
  &__loading {
    margin-right: 8px;
    animation: rotating 2s linear infinite;
  }

  // 内容
  &__content {
    flex: 1;
  }

  // 波纹效果
  &__ripple {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    pointer-events: none;
  }

  &__ripple-element {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    transform: scale(0);
    animation: ripple 0.6s ease-out;
  }
}

// 长按确认动画
@keyframes longPressPulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(232, 93, 76, 0.7);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 20px rgba(232, 93, 76, 0);
  }
}

// 波纹动画
@keyframes ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

// 旋转动画
@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// 大字模式适配
.elderly-mode {
  .elderly-button {
    // 进一步增大尺寸
    &--extra-large {
      height: 72px;
      padding: 24px 48px;
      font-size: 28px;
    }

    &--large {
      height: 64px;
      padding: 20px 40px;
      font-size: 24px;
    }

    // 增加边框宽度
    &.is-plain {
      border-width: 4px;
    }
  }
}
</style>
