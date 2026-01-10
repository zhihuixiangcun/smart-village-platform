<template>
  <div class="elderly-mode-wrapper" :class="{ 'elderly-active': isElderlyMode }">
    <!-- 切换开关 -->
    <div class="mode-toggle" v-if="showToggle">
      <el-switch
        v-model="isElderlyMode"
        size="large"
        :active-text="activeText"
        :inactive-text="inactiveText"
        @change="handleModeChange"
        inline-prompt
      />
    </div>

    <!-- 适老化内容插槽 -->
    <slot :isElderlyMode="isElderlyMode" />
  </div>
</template>

<script setup>
/**
 * 适老化模式组件 - Elderly Mode Component
 *
 * 功能：
 * - 大字模式切换
 * - 高对比度模式
 * - 简化界面
 * - 读屏功能支持
 */

import { ref, computed, watch, onMounted } from 'vue';
import { useElderlyMode } from '@/composables/useElderlyMode';

// Props
const props = defineProps({
  // 是否显示切换开关
  showToggle: {
    type: Boolean,
    default: true,
  },
  // 默认模式
  defaultMode: {
    type: Boolean,
    default: false,
  },
});

// Emits
const emit = defineEmits(['modeChange']);

// 使用适老化组合函数
const { isElderlyMode, fontSize, highContrast, screenReader, toggleElderlyMode } = useElderlyMode();

// 设置初始模式
onMounted(() => {
  if (props.defaultMode) {
    isElderlyMode.value = true;
  }
});

// 开关文本
const activeText = computed(() => {
  return fontSize.value === 'large' ? '大字' : fontSize.value === 'extraLarge' ? '特大' : '适老';
});

const inactiveText = computed(() => '标准');

/**
 * 处理模式切换
 */
const handleModeChange = value => {
  toggleElderlyMode(value);
  emit('modeChange', value);

  // 震动反馈
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
};

// 暴露方法
defineExpose({
  toggle: toggleElderlyMode,
  isElderlyMode,
});
</script>

<style scoped lang="scss">
.elderly-mode-wrapper {
  transition: all 0.3s ease;

  &.elderly-active {
    :deep(.el-button) {
      min-height: 44px;
      min-width: 44px;
      font-size: 18px;
      padding: 12px 24px;
    }

    :deep(.el-input__inner) {
      font-size: 18px;
      min-height: 44px;
      padding: 0 16px;
    }

    :deep(.el-textarea__inner) {
      font-size: 18px;
      line-height: 1.8;
      padding: 12px;
    }

    :deep(.text-base) {
      font-size: 18px;
    }

    :deep(.text-sm) {
      font-size: 16px;
    }

    :deep(.text-xs) {
      font-size: 14px;
    }
  }
}

.mode-toggle {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1000;
  padding: 12px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

  :deep(.el-switch__label) {
    font-size: 16px;
    font-weight: 500;
  }
}

// 高对比度模式
.high-contrast {
  --el-color-primary: #000080;
  --el-color-success: #006400;
  --el-color-warning: #8b4500;
  --el-color-danger: #8b0000;
  --el-color-info: #000000;

  .elderly-active :deep(*) {
    color: #000000 !important;
    border-color: #000000 !important;
  }
}

// 读屏模式
.screen-reader {
  :deep(.sr-only) {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
}
</style>
