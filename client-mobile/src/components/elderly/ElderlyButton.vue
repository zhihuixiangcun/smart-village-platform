<template>
  <view
    :class="[
      'elderly-button',
      `elderly-button--${mode}`,
      `elderly-button--${size}`,
      `elderly-button--${type}`,
      {
        'elderly-button--disabled': disabled || loading,
        'elderly-button--loading': loading,
        'elderly-button--block': block,
        'elderly-button--round': round,
        'elderly-button--plain': plain
      }
    ]"
    :style="customStyle"
    @click="handleClick"
  >
    <!-- 加载图标 -->
    <view v-if="loading" class="elderly-button__loading">
      <view class="elderly-button__spinner" />
    </view>

    <!-- 图标 -->
    <view v-if="icon && !loading" class="elderly-button__icon">
      <slot name="icon">
        <text class="icon">{{ icon }}</text>
      </slot>
    </view>

    <!-- 按钮文字 -->
    <view v-if="$slots.default" class="elderly-button__text">
      <slot />
    </view>

    <!-- 语音辅助（适老化模式下显示） -->
    <view v-if="showVoiceHelp && isElderlyMode" class="elderly-button__voice">
      <text class="voice-icon">🎤</text>
    </view>
  </view>
</template>

<script setup>
import { computed, inject } from 'vue'
import { useElderlyStore } from '@/store/elderly'

/**
 * 适老化按钮组件
 * 支持三种模式（标准/大字/超大字），带有触觉反馈和语音提示
 */

const props = defineProps({
  // 按钮类型
  type: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'success', 'warning', 'danger', 'info', 'default'].includes(value)
  },

  // 按钮尺寸
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large', 'xlarge'].includes(value)
  },

  // 按钮图标
  icon: {
    type: String,
    default: ''
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

  // 是否块级按钮
  block: {
    type: Boolean,
    default: false
  },

  // 是否圆形按钮
  round: {
    type: Boolean,
    default: false
  },

  // 是否镂空按钮
  plain: {
    type: Boolean,
    default: false
  },

  // 是否显示语音辅助
  showVoiceHelp: {
    type: Boolean,
    default: true
  },

  // 自定义样式
  customStyle: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['click'])

const elderlyStore = useElderlyStore()

// 当前适老化模式
const mode = computed(() => elderlyStore.mode)

// 是否为适老化模式
const isElderlyMode = computed(() => mode.value !== 'standard')

// 处理点击事件
const handleClick = (e) => {
  if (props.disabled || props.loading) {
    // 触觉反馈 - 禁用状态短震动
    elderlyStore.vibrate('short')
    return
  }

  // 触觉反馈 - 成功点击
  elderlyStore.vibrate('long')

  // 语音播报（适老化模式下）
  if (isElderlyMode.value && props.showVoiceHelp) {
    const text = e.target.textContent?.trim() || '按钮'
    elderlyStore.speak(`点击了${text}`)
  }

  emit('click', e)
}
</script>

<style lang="scss" scoped>
.elderly-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;

  // 标准模式尺寸
  &--small {
    min-height: 72rpx;
    padding: 0 24rpx;
    font-size: 28rpx;
    border-radius: 8rpx;
  }

  &--medium {
    min-height: 88rpx;
    padding: 0 32rpx;
    font-size: 32rpx;
    border-radius: 12rpx;
  }

  &--large {
    min-height: 112rpx;
    padding: 0 40rpx;
    font-size: 36rpx;
    border-radius: 16rpx;
  }

  &--xlarge {
    min-height: 128rpx;
    padding: 0 48rpx;
    font-size: 44rpx;
    border-radius: 20rpx;
  }

  // 适老化模式 - 大字版
  &.elderly-mode--large &--small {
    min-height: 88rpx;
    padding: 0 32rpx;
    font-size: 32rpx;
  }

  &.elderly-mode--large &--medium {
    min-height: 112rpx;
    padding: 0 40rpx;
    font-size: 36rpx;
  }

  &.elderly-mode--large &--large {
    min-height: 128rpx;
    padding: 0 48rpx;
    font-size: 40rpx;
  }

  &.elderly-mode--large &--xlarge {
    min-height: 144rpx;
    padding: 0 56rpx;
    font-size: 48rpx;
  }

  // 适老化模式 - 超大字版
  &.elderly-mode--xl &--small {
    min-height: 112rpx;
    padding: 0 40rpx;
    font-size: 40rpx;
  }

  &.elderly-mode--xl &--medium {
    min-height: 128rpx;
    padding: 0 48rpx;
    font-size: 44rpx;
  }

  &.elderly-mode--xl &--large {
    min-height: 144rpx;
    padding: 0 56rpx;
    font-size: 48rpx;
  }

  &.elderly-mode--xl &--xlarge {
    min-height: 160rpx;
    padding: 0 64rpx;
    font-size: 56rpx;
  }

  // 块级按钮
  &--block {
    width: 100%;
  }

  // 圆形按钮
  &--round {
    border-radius: 9999rpx;
  }

  // 按钮类型 - 实心
  &--primary {
    background-color: var(--color-primary, #2F855A);
    color: #FFFFFF;

    &:active:not(.elderly-button--disabled) {
      background-color: var(--color-primary-dark, #276749);
      transform: scale(0.98);
    }
  }

  &--success {
    background-color: var(--color-success, #48BB78);
    color: #FFFFFF;

    &:active:not(.elderly-button--disabled) {
      opacity: 0.8;
      transform: scale(0.98);
    }
  }

  &--warning {
    background-color: var(--color-warning, #ECC94B);
    color: #1A202C;

    &:active:not(.elderly-button--disabled) {
      opacity: 0.8;
      transform: scale(0.98);
    }
  }

  &--danger {
    background-color: var(--color-danger, #F56565);
    color: #FFFFFF;

    &:active:not(.elderly-button--disabled) {
      opacity: 0.8;
      transform: scale(0.98);
    }
  }

  &--info {
    background-color: var(--color-info, #4299E1);
    color: #FFFFFF;

    &:active:not(.elderly-button--disabled) {
      opacity: 0.8;
      transform: scale(0.98);
    }
  }

  &--default {
    background-color: var(--color-bg-disabled, #F1F5F9);
    color: var(--color-text-primary, #1A202C);

    &:active:not(.elderly-button--disabled) {
      background-color: var(--color-bg-active, #E2E8F0);
      transform: scale(0.98);
    }
  }

  // 镂空按钮
  &--plain.elderly-button--primary {
    background-color: transparent;
    border: 2rpx solid var(--color-primary, #2F855A);
    color: var(--color-primary, #2F855A);

    &:active:not(.elderly-button--disabled) {
      background-color: rgba(47, 133, 90, 0.1);
    }
  }

  &--plain.elderly-button--success {
    background-color: transparent;
    border: 2rpx solid var(--color-success, #48BB78);
    color: var(--color-success, #48BB78);

    &:active:not(.elderly-button--disabled) {
      background-color: rgba(72, 187, 120, 0.1);
    }
  }

  // 禁用状态
  &--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  // 内部元素
  &__loading {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__spinner {
    width: 32rpx;
    height: 32rpx;
    border: 4rpx solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2em;
  }

  &__text {
    flex: 1;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__voice {
    position: absolute;
    top: -8rpx;
    right: -8rpx;
    font-size: 24rpx;
    opacity: 0.6;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>