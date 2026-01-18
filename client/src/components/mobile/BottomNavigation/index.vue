<template>
  <!-- 移动端底部导航栏组件 - Bottom Navigation -->
  <nav class="bottom-navigation" :class="navigationClasses">
    <!-- 动态渲染导航项 -->
    <NavItem
      v-for="item in items"
      :key="item.id"
      :icon="item.icon"
      :label="item.label"
      :badge="item.badge"
      :badge-type="item.badgeType"
      :active="currentRoute === item.route"
      :is-elderly-mode="isElderlyMode"
      :is-landscape="isLandscape"
      @click="handleItemClick(item)"
    />
  </nav>
</template>

<script setup>
import { computed } from 'vue';
import NavItem from './NavItem.vue';

/**
 * 导航项接口定义
 * @typedef {Object} NavItemData
 * @property {string} id - 导航项唯一标识
 * @property {string} label - 导航项标签
 * @property {any} icon - 图标组件
 * @property {string} route - 路由路径
 * @property {number} [badge] - 徽章数量
 * @property {'danger'|'warning'|'success'|'info'} [badgeType] - 徽章类型
 */

/**
 * 组件 Props
 */
const props = defineProps({
  /** 导航项数组 */
  items: {
    type: Array,
    required: true,
    validator: (value) => {
      return Array.isArray(value) && value.every(item => item.id && item.label && item.icon && item.route);
    },
  },
  /** 当前激活的路由路径 */
  currentRoute: {
    type: String,
    default: '',
  },
  /** 是否为适老化模式 */
  isElderlyMode: {
    type: Boolean,
    default: false,
  },
  /** 是否为横屏模式 */
  isLandscape: {
    type: Boolean,
    default: false,
  },
});

/**
 * 组件 Emits
 */
const emit = defineEmits(['itemClick']);

/**
 * 计算导航栏容器的类名
 */
const navigationClasses = computed(() => ({
  'elderly-mode': props.isElderlyMode,
  'landscape-mode': props.isLandscape,
}));

/**
 * 处理导航项点击
 */
const handleItemClick = (item) => {
  emit('itemClick', item);
};
</script>

<style lang="scss" scoped>
/**
 * ==============================
 * 底部导航栏 - 主样式
 * Bottom Navigation - Main Styles
 * ==============================
 */

// CSS 变量定义 - 颜色
:root {
  --bn-bg-color: #ffffff;
  --bn-bg-color-dark: #1f2937;
  --bn-text-color: #9ca3af;
  --bn-text-color-dark: #9ca3af;
  --bn-active-color: #409eff;
  --bn-active-color-dark: #60a5fa;
  --bn-border-color: #e5e7eb;
  --bn-border-color-dark: #374151;
  --bn-shadow-color: rgba(0, 0, 0, 0.1);
  --bn-ripple-color: rgba(64, 158, 255, 0.2);
  --bn-indicator-color: #409eff;
  --bn-indicator-color-dark: #60a5fa;
}

// CSS 变量定义 - 尺寸
:root {
  --bn-height-normal: 60px;
  --bn-height-elderly: 70px;
  --bn-height-landscape: 50px;
  --bn-icon-size-normal: 24px;
  --bn-icon-size-elderly: 28px;
  --bn-icon-size-landscape: 20px;
  --bn-label-font-size-normal: 11px;
  --bn-label-font-size-elderly: 14px;
  --bn-label-font-size-landscape: 10px;
  --bn-safe-area-bottom: env(safe-area-inset-bottom);
  --bn-indicator-height: 3px;
  --bn-indicator-width: 20px;
}

// 深色模式变量
:global(.dark) {
  :root {
    --bn-bg-color: var(--bn-bg-color-dark);
    --bn-text-color: var(--bn-text-color-dark);
    --bn-active-color: var(--bn-active-color-dark);
    --bn-border-color: var(--bn-border-color-dark);
    --bn-indicator-color: var(--bn-indicator-color-dark);
  }
}

/**
 * 底部导航栏容器
 */
.bottom-navigation {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;

  // 基础布局
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0;

  // 背景和边框
  background: var(--bn-bg-color);
  border-top: 1px solid var(--bn-border-color);

  // 阴影效果
  box-shadow: 0 -2px 8px var(--bn-shadow-color);

  // 尺寸和间距
  height: var(--bn-height-normal);
  padding: 0 var(--bn-safe-area-bottom);

  // 过渡动画
  transition:
    height 0.3s ease,
    background 0.3s ease,
    border-color 0.3s ease,
    box-shadow 0.3s ease;

  // 触摸优化
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  // 安全区域适配
  padding-bottom: calc(var(--bn-safe-area-bottom) + 8px);

  // 硬件加速
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

/**
 * 适老化模式 - Elderly Mode
 */
.bottom-navigation.elderly-mode {
  height: var(--bn-height-elderly);
  padding-bottom: calc(var(--bn-safe-area-bottom) + 12px);
  box-shadow: 0 -3px 12px var(--bn-shadow-color);
}

/**
 * 横屏迷你模式 - Landscape Mode
 */
.bottom-navigation.landscape-mode {
  height: var(--bn-height-landscape);
  padding-bottom: calc(var(--bn-safe-area-bottom) + 4px);
  box-shadow: 0 -1px 6px var(--bn-shadow-color);
}

/**
 * 适老化 + 横屏组合模式
 */
.bottom-navigation.elderly-mode.landscape-mode {
  height: calc(var(--bn-height-landscape) + 6px);
  padding-bottom: calc(var(--bn-safe-area-bottom) + 8px);
}

/**
 * 深色模式 - Dark Mode
 */
:global(.dark) .bottom-navigation {
  background: var(--bn-bg-color-dark);
  border-top: 1px solid var(--bn-border-color-dark);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.3);
}

/**
 * 响应式适配 - 不同屏幕尺寸
 */

// 小屏幕 (< 360px)
@media screen and (max-width: 360px) {
  .bottom-navigation {
    height: 56px;

    &.elderly-mode {
      height: 64px;
    }

    &.landscape-mode {
      height: 46px;
    }
  }
}

// 中等屏幕 (360px - 414px)
@media screen and (min-width: 361px) and (max-width: 414px) {
  .bottom-navigation {
    // 保持默认尺寸
  }
}

// 大屏幕 (> 414px)
@media screen and (min-width: 415px) {
  .bottom-navigation {
    padding-left: max(env(safe-area-inset-left), 8px);
    padding-right: max(env(safe-area-inset-right), 8px);
  }
}

/**
 * 横竖屏适配
 */

// 竖屏模式 (默认)
@media screen and (orientation: portrait) {
  .bottom-navigation {
    // 竖屏默认样式
  }
}

// 横屏模式
@media screen and (orientation: landscape) and (max-height: 500px) {
  .bottom-navigation {
    height: var(--bn-height-landscape);
    padding-bottom: calc(var(--bn-safe-area-bottom) + 4px);

    &.elderly-mode {
      height: calc(var(--bn-height-landscape) + 6px);
    }
  }
}

/**
 * 可访问性增强
 */

// 减少动画偏好
@media (prefers-reduced-motion: reduce) {
  .bottom-navigation {
    transition: none;

    :deep(*) {
      transition: none;
      animation: none;
    }
  }
}

// 高对比度模式
@media (prefers-contrast: high) {
  .bottom-navigation {
    border-top: 2px solid #000000;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.2);
  }

  :global(.dark) .bottom-navigation {
    border-top: 2px solid #ffffff;
  }
}

/**
 * 打印样式
 */
@media print {
  .bottom-navigation {
    display: none !important;
  }
}

/**
 * 焦点管理 - 键盘导航
 */
.bottom-navigation :deep(.nav-item) {
  &:focus-visible {
    outline: 2px solid var(--bn-active-color);
    outline-offset: -2px;
  }
}
</style>
