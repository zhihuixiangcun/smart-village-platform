<template>
  <view
    class="svg-icon"
    :class="iconClass"
    :style="iconStyle"
    aria-hidden="true"
  >
    <!-- 胶囊/关闭/返回 -->
    <svg v-if="name === 'arrow-left'" viewBox="0 0 24 24" fill="none">
      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor"/>
    </svg>

    <svg v-else-if="name === 'arrow-right'" viewBox="0 0 24 24" fill="none">
      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/>
    </svg>

    <svg v-else-if="name === 'close'" viewBox="0 0 24 24" fill="none">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
    </svg>

    <!-- 导航/搜索/筛选 -->
    <svg v-else-if="name === 'search'" viewBox="0 0 24 24" fill="none">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
    </svg>

    <svg v-else-if="name === 'filter'" viewBox="0 0 24 24" fill="none">
      <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" fill="currentColor"/>
    </svg>

    <svg v-else-if="name === 'menu'" viewBox="0 0 24 24" fill="none">
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor"/>
    </svg>

    <!-- 文件/附件 -->
    <svg v-else-if="name === 'attachment'" viewBox="0 0 24 24" fill="none">
      <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" fill="currentColor"/>
    </svg>

    <svg v-else-if="name === 'file'" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="currentColor"/>
    </svg>

    <svg v-else-if="name === 'download'" viewBox="0 0 24 24" fill="none">
      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/>
    </svg>

    <!-- 操作 -->
    <svg v-else-if="name === 'share'" viewBox="0 0 24 24" fill="none">
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" fill="currentColor"/>
    </svg>

    <svg v-else-if="name === 'chevron-down'" viewBox="0 0 24 24" fill="none">
      <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" fill="currentColor"/>
    </svg>

    <svg v-else-if="name === 'chevron-up'" viewBox="0 0 24 24" fill="none">
      <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z" fill="currentColor"/>
    </svg>

    <svg v-else-if="name === 'expand-more'" viewBox="0 0 24 24" fill="none">
      <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" fill="currentColor"/>
    </svg>

    <!-- 媒体控制 -->
    <svg v-else-if="name === 'play-circle'" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="currentColor"/>
    </svg>

    <svg v-else-if="name === 'pause'" viewBox="0 0 24 24" fill="none">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="currentColor"/>
    </svg>

    <svg v-else-if="name === 'stop'" viewBox="0 0 24 24" fill="none">
      <path d="M6 6h12v12H6z" fill="currentColor"/>
    </svg>

    <!-- 社交/反馈 -->
    <svg v-else-if="name === 'heart'" viewBox="0 0 24 24" fill="none">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>
    </svg>

    <svg v-else-if="name === 'heart-outline'" viewBox="0 0 24 24" fill="none">
      <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z" fill="currentColor"/>
    </svg>

    <svg v-else-if="name === 'star'" viewBox="0 0 24 24" fill="none">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="currentColor"/>
    </svg>

    <svg v-else-if="name === 'star-outline'" viewBox="0 0 24 24" fill="none">
      <path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.01 4.38.38-3.32 2.88 1 4.28L12 15.4z" fill="currentColor"/>
    </svg>

    <svg v-else-if="name === 'comment'" viewBox="0 0 24 24" fill="none">
      <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" fill="currentColor"/>
    </svg>

    <!-- 信息/状态 -->
    <svg v-else-if="name === 'calendar'" viewBox="0 0 24 24" fill="none">
      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" fill="currentColor"/>
    </svg>

    <svg v-else-if="name === 'eye'" viewBox="0 0 24 24" fill="none">
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
    </svg>

    <svg v-else-if="name === 'notification'" viewBox="0 0 24 24" fill="none">
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" fill="currentColor"/>
    </svg>

    <svg v-else-if="name === 'info'" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/>
    </svg>

    <svg v-else-if="name === 'warning'" viewBox="0 0 24 24" fill="none">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="currentColor"/>
    </svg>

    <svg v-else-if="name === 'error'" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" fill="currentColor"/>
    </svg>

    <svg v-else-if="name === 'success'" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
    </svg>

    <!-- 空状态 -->
    <svg v-else-if="name === 'empty'" viewBox="0 0 24 24" fill="none">
      <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" fill="currentColor"/>
      <path d="M14 17H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" fill="currentColor"/>
    </svg>

    <svg v-else-if="name === 'inbox'" viewBox="0 0 24 24" fill="none">
      <path d="M19 3H4.99c-1.11 0-1.98.89-1.98 2L3 19c0 1.1.88 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.11-.9-2-2-2zm0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19v10z" fill="currentColor"/>
    </svg>

    <!-- 默认 -->
    <svg v-else viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="currentColor"/>
    </svg>
  </view>
</template>

<script setup>
/**
 * SVG图标组件
 * 适老化设计 - 统一图标系统
 */
import { computed } from 'vue'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: [String, Number],
    default: 24
  },
  color: {
    type: String,
    default: 'currentColor'
  }
})

const iconClass = computed(() => {
  const classes = []
  if (props.size) {
    const size = typeof props.size === 'number' ? props.size : parseInt(props.size) || 24
    if (size >= 48) classes.push('icon-large')
    else if (size >= 40) classes.push('icon-medium')
  }
  return classes.join(' ')
})

const iconStyle = computed(() => {
  const size = typeof props.size === 'number' ? props.size : parseInt(props.size) || 24
  return {
    width: `${size}rpx`,
    height: `${size}rpx`,
    color: props.color
  }
})
</script>

<style lang="scss" scoped>
.svg-icon {
  display: inline-block;
  flex-shrink: 0;
  transition: transform 0.2s ease, color 0.2s ease;

  &.icon-large {
    transform: scale(1.2);
  }

  &.icon-medium {
    transform: scale(1.1);
  }

  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
}

// 适老化模式
:global(.elderly-mode-large) .svg-icon {
  transform: scale(1.15);
}

:global(.elderly-mode-xl) .svg-icon {
  transform: scale(1.3);
}

// 减少动画
@media (prefers-reduced-motion: reduce) {
  .svg-icon {
    transition: none;
  }
}
</style>
