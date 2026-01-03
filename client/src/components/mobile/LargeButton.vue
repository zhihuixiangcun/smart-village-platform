<template>
  <button
    :class="['large-button', buttonClass, { 'elderly-mode': elderlyMode }]"
    :disabled="disabled || loading"
    @click="handleClick"
    :aria-label="ariaLabel || label"
    role="button"
  >
    <!-- 图标 -->
    <div v-if="icon" class="button-icon">
      <el-icon :size="iconSize">
        <component :is="icon" v-if="typeof icon === 'string'" />
        <component v-else :is="icon" />
      </el-icon>
    </div>

    <!-- 文字 -->
    <span v-if="label" class="button-label">{{ label }}</span>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-spinner">
      <el-icon class="is-loading" :size="20">
        <Loading />
      </el-icon>
    </div>

    <!-- 角标 -->
    <div v-if="badge" class="button-badge">{{ badge }}</div>
  </button>
</template>

<script setup>
/**
 * 大按钮组件 - Large Button Component
 *
 * 适老化设计：
 * - 最小触控区域 44x44px
 * - 清晰图标和文字
 * - 震动反馈
 * - 语音提示
 */

import { computed } from 'vue';
import { Loading } from '@element-plus/icons-vue';

// Props
const props = defineProps({
  // 按钮文字
  label: {
    type: String,
    default: ''
  },
  // 图标（组件或名称）
  icon: {
    type: [String, Object],
    default: null
  },
  // 图标大小
  iconSize: {
    type: [String, Number],
    default: 24
  },
  // 按钮类型
  type: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'primary', 'success', 'warning', 'danger', 'emergency'].includes(value)
  },
  // 按钮大小
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
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
  // 是否适老化模式
  elderlyMode: {
    type: Boolean,
    default: false
  },
  // 角标
  badge: {
    type: [String, Number],
    default: null
  },
  // 阅读标签
  ariaLabel: {
    type: String,
    default: ''
  },
  // 是否震动反馈
  vibrate: {
    type: Boolean,
    default: true
  },
  // 是否语音提示
  speak: {
    type: Boolean,
    default: false
  },
  // 自定义类名
  customClass: {
    type: String,
    default: ''
  }
});

// Emits
const emit = defineEmits(['click']);

/**
 * 按钮样式类
 */
const buttonClass = computed(() => {
  const classes = [`button-type-${props.type}`, `button-size-${props.size}`];

  if (props.customClass) {
    classes.push(props.customClass);
  }

  return classes.join(' ');
});

/**
 * 处理点击事件
 */
const handleClick = (event) => {
  if (props.disabled || props.loading) {
    return;
  }

  // 震动反馈
  if (props.vibrate && navigator.vibrate) {
    navigator.vibrate(50);
  }

  // 语音提示
  if (props.speak && props.label) {
    const utterance = new SpeechSynthesisUtterance(props.label);
    utterance.lang = 'zh-CN';
    window.speechSynthesis.speak(utterance);
  }

  emit('click', event);
};
</script>

<style scoped lang="scss">
.large-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 44px;
  min-height: 44px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  outline: none;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:not(:disabled):active {
    transform: scale(0.96);
  }

  // 适老化模式
  &.elderly-mode {
    min-width: 56px;
    min-height: 56px;
    padding: 16px 32px;
    font-size: 20px;
    font-weight: 600;
    border-radius: 12px;
    gap: 12px;

    .button-icon {
      :deep(.el-icon) {
        font-size: 28px;
      }
    }
  }

  // 按钮类型
  &.button-type-default {
    background: #f5f7fa;
    color: #606266;

    &:hover:not(:disabled) {
      background: #e6e8eb;
    }
  }

  &.button-type-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;

    &:hover:not(:disabled) {
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
  }

  &.button-type-success {
    background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
    color: white;

    &:hover:not(:disabled) {
      box-shadow: 0 4px 12px rgba(103, 194, 58, 0.4);
    }
  }

  &.button-type-warning {
    background: linear-gradient(135deg, #e6a23c 0%, #f0c78a 100%);
    color: white;

    &:hover:not(:disabled) {
      box-shadow: 0 4px 12px rgba(230, 162, 60, 0.4);
    }
  }

  &.button-type-danger {
    background: linear-gradient(135deg, #f56c6c 0%, #f89898 100%);
    color: white;

    &:hover:not(:disabled) {
      box-shadow: 0 4px 12px rgba(245, 108, 108, 0.4);
    }
  }

  &.button-type-emergency {
    background: linear-gradient(135deg, #f56c6c 0%, #ff0000 100%);
    color: white;
    animation: emergency-pulse 2s infinite;

    &:hover:not(:disabled) {
      box-shadow: 0 6px 20px rgba(245, 108, 108, 0.6);
    }
  }

  // 按钮大小
  &.button-size-small {
    padding: 10px 20px;
    font-size: 14px;
    min-width: 40px;
    min-height: 40px;
  }

  &.button-size-large {
    padding: 16px 32px;
    font-size: 18px;
    min-width: 56px;
    min-height: 56px;
  }

  .button-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .button-label {
    line-height: 1.4;
  }

  .loading-spinner {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .button-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background: #f56c6c;
    color: white;
    font-size: 12px;
    font-weight: 600;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
}

@keyframes emergency-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(245, 108, 108, 0.7);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(245, 108, 108, 0);
  }
}

// 无障碍支持
.large-button:focus-visible {
  outline: 2px solid #409eff;
  outline-offset: 2px;
}
</style>
