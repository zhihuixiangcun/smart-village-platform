<template>
  <!-- 导航项组件 - Nav Item -->
  <div
    class="nav-item"
    :class="navItemClasses"
    role="button"
    :aria-label="label"
    :aria-current="active ? 'page' : false"
    tabindex="0"
    @click="handleClick"
    @keydown.enter="handleClick"
  >
    <!-- 徽章包裹层 -->
    <div class="nav-item-icon-wrapper">
      <!-- 图标 -->
      <el-icon :size="iconSize" class="nav-item-icon">
        <component :is="icon" />
      </el-icon>

      <!-- 徽章 -->
      <div v-if="badge && badge > 0" class="nav-item-badge" :class="badgeTypeClass">
        <span class="badge-number">{{ displayBadge }}</span>
      </div>
    </div>

    <!-- 标签 -->
    <span class="nav-item-label">{{ label }}</span>

    <!-- 激活指示器 -->
    <div class="nav-item-indicator"></div>

    <!-- 点击波纹效果层 -->
    <div class="nav-item-ripple" ref="rippleRef"></div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

/**
 * 组件 Props
 */
const props = defineProps({
  /** 图标组件 */
  icon: {
    type: Object,
    required: true,
  },
  /** 导航项标签 */
  label: {
    type: String,
    required: true,
  },
  /** 徽章数量 */
  badge: {
    type: Number,
    default: 0,
  },
  /** 徽章类型 */
  badgeType: {
    type: String,
    default: 'danger',
    validator: (value) => ['danger', 'warning', 'success', 'info'].includes(value),
  },
  /** 是否激活 */
  active: {
    type: Boolean,
    default: false,
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
const emit = defineEmits(['click']);

/**
 * 波纹元素引用
 */
const rippleRef = ref(null);

/**
 * 计算导航项的类名
 */
const navItemClasses = computed(() => ({
  active: props.active,
  'elderly-mode': props.isElderlyMode,
  'landscape-mode': props.isLandscape,
}));

/**
 * 计算徽章类型的类名
 */
const badgeTypeClass = computed(() => ({
  'badge-danger': props.badgeType === 'danger',
  'badge-warning': props.badgeType === 'warning',
  'badge-success': props.badgeType === 'success',
  'badge-info': props.badgeType === 'info',
}));

/**
 * 计算图标尺寸
 */
const iconSize = computed(() => {
  if (props.isLandscape) return 20;
  if (props.isElderlyMode) return 28;
  return 24;
});

/**
 * 显示徽章数量（最大显示99）
 */
const displayBadge = computed(() => {
  return props.badge && props.badge > 99 ? '99+' : props.badge;
});

/**
 * 处理点击事件
 */
const handleClick = () => {
  // 触发波纹动画
  createRipple();

  // 触发点击事件
  emit('click');

  // 触觉反馈（如果支持）
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
};

/**
 * 创建波纹效果
 */
const createRipple = () => {
  const ripple = rippleRef.value;
  if (!ripple) return;

  // 清除之前的波纹
  ripple.classList.remove('ripple-active');
  void ripple.offsetWidth; // 触发重绘

  // 添加波纹动画
  ripple.classList.add('ripple-active');
};
</script>

<style lang="scss" scoped>
/**
 * ==============================
 * 导航项 - Nav Item Styles
 * ==============================
 */

// CSS 变量定义 - 颜色
:root {
  --ni-bg-color: transparent;
  --ni-bg-color-active: rgba(64, 158, 255, 0.05);
  --ni-bg-color-dark-active: rgba(96, 165, 250, 0.1);
  --ni-text-color: #9ca3af;
  --ni-text-color-dark: #9ca3af;
  --ni-text-color-active: #409eff;
  --ni-text-color-active-dark: #60a5fa;
  --ni-icon-color: #9ca3af;
  --ni-icon-color-dark: #9ca3af;
  --ni-icon-color-active: #409eff;
  --ni-icon-color-active-dark: #60a5fa;
  --ni-badge-bg-danger: #f56c6c;
  --ni-badge-bg-warning: #e6a23c;
  --ni-badge-bg-success: #67c23a;
  --ni-badge-bg-info: #909399;
  --ni-badge-text-color: #ffffff;
  --ni-indicator-color: #409eff;
  --ni-indicator-color-dark: #60a5fa;
  --ni-ripple-color: rgba(64, 158, 255, 0.3);
}

// 深色模式变量
:global(.dark) {
  :root {
    --ni-bg-color-active: var(--ni-bg-color-dark-active);
    --ni-text-color-active: var(--ni-text-color-active-dark);
    --ni-icon-color-active: var(--ni-icon-color-active-dark);
    --ni-indicator-color: var(--ni-indicator-color-dark);
  }
}

/**
 * 导航项容器
 */
.nav-item {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
  gap: 4px;

  // 背景和颜色
  background: var(--ni-bg-color);
  color: var(--ni-text-color);

  // 交互效果
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  user-select: none;

  // 过渡动画
  transition:
    background 0.3s ease,
    color 0.3s ease,
    transform 0.2s ease;

  // 硬件加速
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;

  // 点击反馈
  &:active {
    transform: scale(0.95);
    background: var(--ni-bg-color-active);
  }

  // 悬停效果（仅桌面端）
  @media (hover: hover) {
    &:hover {
      background: rgba(64, 158, 255, 0.03);
    }
  }
}

/**
 * 激活状态
 */
.nav-item.active {
  color: var(--ni-text-color-active);

  // 激活状态的图标颜色
  .nav-item-icon {
    color: var(--ni-icon-color-active);
  }

  // 激活指示器动画
  .nav-item-indicator {
    width: var(--bn-indicator-width);
    opacity: 1;
  }
}

/**
 * 适老化模式
 */
.nav-item.elderly-mode {
  padding: 12px 0;
  gap: 6px;

  &:active {
    transform: scale(0.97);
  }
}

/**
 * 横屏迷你模式
 */
.nav-item.landscape-mode {
  padding: 6px 0;
  gap: 2px;
}

/**
 * 图标包裹层（用于定位徽章）
 */
.nav-item-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  // 图标尺寸动画
  .nav-item-icon {
    color: var(--ni-icon-color);
    transition:
      color 0.3s ease,
      transform 0.3s ease;

    // 激活时轻微放大
    .nav-item.active & {
      transform: scale(1.1);
    }

    // 适老化模式放大
    .nav-item.elderly-mode & {
      transform: scale(1.15);
    }

    // 横屏模式缩小
    .nav-item.landscape-mode & {
      transform: scale(0.9);
    }
  }
}

/**
 * 徽章样式
 */
.nav-item-badge {
  position: absolute;
  top: -4px;
  right: -6px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;

  // 居中显示
  display: flex;
  align-items: center;
  justify-content: center;

  // 外观
  background: var(--ni-badge-bg-danger);
  border: 2px solid var(--bn-bg-color);
  border-radius: 8px;

  // 字体
  color: var(--ni-badge-text-color);
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;

  // 阴影
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);

  // 动画
  animation: badge-pop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);

  // 适老化模式
  .nav-item.elderly-mode & {
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    font-size: 12px;
    border-radius: 10px;
  }

  // 横屏模式
  .nav-item.landscape-mode & {
    min-width: 14px;
    height: 14px;
    padding: 0 3px;
    font-size: 9px;
  }
}

/**
 * 徽章数字切换动画
 */
.badge-number {
  display: inline-block;
  transition:
    transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55),
    opacity 0.2s ease;
}

/**
 * 徽章类型颜色
 */
.nav-item-badge.badge-danger {
  background: var(--ni-badge-bg-danger);
}

.nav-item-badge.badge-warning {
  background: var(--ni-badge-bg-warning);
}

.nav-item-badge.badge-success {
  background: var(--ni-badge-bg-success);
}

.nav-item-badge.badge-info {
  background: var(--ni-badge-bg-info);
}

/**
 * 标签样式
 */
.nav-item-label {
  font-size: var(--bn-label-font-size-normal);
  font-weight: 500;
  line-height: 1.2;
  text-align: center;
  transition: font-size 0.3s ease;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

// 适老化模式
.nav-item.elderly-mode .nav-item-label {
  font-size: var(--bn-label-font-size-elderly);
  font-weight: 600;
}

// 横屏模式
.nav-item.landscape-mode .nav-item-label {
  font-size: var(--bn-label-font-size-landscape);
}

/**
 * 激活指示器
 */
.nav-item-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: var(--bn-indicator-height);
  background: var(--ni-indicator-color);
  border-radius: 3px 3px 0 0;
  opacity: 0;

  // 过渡动画
  transition:
    width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.3s ease,
    background 0.3s ease;

  // 激活状态
  .nav-item.active & {
    width: var(--bn-indicator-width);
    opacity: 1;
  }

  // 适老化模式指示器更明显
  .nav-item.elderly-mode.active & {
    height: 4px;
  }
}

/**
 * 点击波纹效果
 */
.nav-item-ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: var(--ni-ripple-color);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  opacity: 0;

  // 波纹扩散动画
  transition:
    width 0.4s ease-out,
    height 0.4s ease-out,
    opacity 0.4s ease-out;
}

/**
 * 波纹激活状态
 */
.nav-item-ripple.ripple-active {
  width: 80px;
  height: 80px;
  opacity: 0.6;
}

// 适老化模式波纹更大
.nav-item.elderly-mode .nav-item-ripple.ripple-active {
  width: 100px;
  height: 100px;
}

// 横屏模式波纹更小
.nav-item.landscape-mode .nav-item-ripple.ripple-active {
  width: 60px;
  height: 60px;
}

/**
 * 动画定义
 */

// 徽章弹出动画
@keyframes badge-pop {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

// 徽章数字切换动画
@keyframes badge-number-pop {
  0% {
    transform: translateY(10px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

/**
 * 深色模式
 */
:global(.dark) .nav-item {
  color: var(--ni-text-color-dark);

  &.active {
    color: var(--ni-text-color-active-dark);
  }

  &:active {
    background: var(--ni-bg-color-dark-active);
  }

  .nav-item-icon {
    color: var(--ni-icon-color-dark);
  }

  &.active .nav-item-icon {
    color: var(--ni-icon-color-active-dark);
  }

  .nav-item-badge {
    border-color: var(--bn-bg-color-dark);
  }
}

/**
 * 可访问性增强
 */

// 减少动画偏好
@media (prefers-reduced-motion: reduce) {
  .nav-item {
    transition: none;

    &:active {
      transform: none;
    }
  }

  .nav-item-icon {
    transition: none;
  }

  .nav-item-badge {
    animation: none;
  }

  .nav-item-indicator {
    transition: none;
  }

  .nav-item-ripple {
    display: none;
  }
}

// 高对比度模式
@media (prefers-contrast: high) {
  .nav-item {
    &.active {
      background: var(--ni-bg-color-active);
      font-weight: 700;
    }
  }

  .nav-item-badge {
    border: 2px solid #000000;
  }

  :global(.dark) .nav-item-badge {
    border: 2px solid #ffffff;
  }
}

/**
 * 焦点管理 - 键盘导航
 */
.nav-item:focus-visible {
  outline: 2px solid var(--ni-indicator-color);
  outline-offset: -2px;
  background: var(--ni-bg-color-active);
}

/**
 * 响应式适配
 */

// 超小屏幕
@media screen and (max-width: 360px) {
  .nav-item {
    padding: 6px 0;
  }

  .nav-item-label {
    font-size: 10px;
  }

  .nav-item-badge {
    min-width: 14px;
    height: 14px;
    font-size: 9px;
  }
}

// 小屏幕横屏
@media screen and (orientation: landscape) and (max-height: 420px) {
  .nav-item {
    padding: 4px 0;
    gap: 1px;
  }

  .nav-item-label {
    font-size: 9px;
  }

  .nav-item-indicator {
    height: 2px;
  }
}
</style>
