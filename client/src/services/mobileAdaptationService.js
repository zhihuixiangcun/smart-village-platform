/**
 * 移动端适配服务
 * 提供响应式布局、触摸交互、离线支持等功能
 */

import { ref, reactive, computed, watch } from 'vue';
// useStore not used in this file - removed invalid import

class MobileAdaptationService {
  constructor() {
    // 设备信息
    this.deviceInfo = reactive({
      isMobile: false,
      isTablet: false,
      isDesktop: false,
      isIOS: false,
      isAndroid: false,
      isSmallScreen: false,
      isMediumScreen: false,
      isLargeScreen: false,
      touchSupported: false,
      pixelRatio: 1,
      screenWidth: 0,
      screenHeight: 0,
      orientation: 'portrait',
    });

    // 触控状态
    this.touchState = reactive({
      isTouching: false,
      touchStartX: 0,
      touchStartY: 0,
      touchEndX: 0,
      touchEndY: 0,
      swipeDirection: null,
      longPressTimer: null,
      longPressActive: false,
    });

    // 响应式配置
    this.breakpoints = {
      mobile: 768,
      tablet: 1024,
      desktop: 1200,
      small: 480,
      medium: 768,
      large: 1200,
    };

    // 主题配置
    this.theme = reactive({
      fontSize: 'normal',
      spacing: 'normal',
      touchTargetSize: 'normal',
      animation: 'normal',
    });

    // 初始化
    this.init();

    // 创建全局样式
    this.createGlobalStyles();
  }

  /**
   * 初始化服务
   */
  init() {
    // 检测设备信息
    this.detectDevice();

    // 监听窗口变化
    window.addEventListener('resize', this.handleResize.bind(this));
    window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));

    // 监听触摸事件
    this.setupTouchEvents();

    // 监听网络状态
    this.setupNetworkEvents();

    // 设置CSS变量
    this.setCSSVariables();
  }

  /**
   * 检测设备信息
   */
  detectDevice() {
    const userAgent = navigator.userAgent.toLowerCase();
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 检测设备类型
    this.deviceInfo.isMobile = width <= this.breakpoints.mobile;
    this.deviceInfo.isTablet = width > this.breakpoints.mobile && width <= this.breakpoints.tablet;
    this.deviceInfo.isDesktop = width > this.breakpoints.tablet;

    // 检测屏幕尺寸
    this.deviceInfo.isSmallScreen = width <= this.breakpoints.small;
    this.deviceInfo.isMediumScreen =
      width > this.breakpoints.small && width <= this.breakpoints.medium;
    this.deviceInfo.isLargeScreen = width > this.breakpoints.medium;

    // 检测操作系统
    this.deviceInfo.isIOS = /iphone|ipad|ipod/.test(userAgent);
    this.deviceInfo.isAndroid = /android/.test(userAgent);

    // 检测触摸支持
    this.deviceInfo.touchSupported = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // 检测像素比
    this.deviceInfo.pixelRatio = window.devicePixelRatio || 1;

    // 检测屏幕尺寸
    this.deviceInfo.screenWidth = width;
    this.deviceInfo.screenHeight = height;

    // 检测屏幕方向
    this.deviceInfo.orientation = width > height ? 'landscape' : 'portrait';

    // 更新主题设置
    this.updateTheme();
  }

  /**
   * 更新主题设置
   */
  updateTheme() {
    if (this.deviceInfo.isMobile) {
      this.theme.fontSize = 'large';
      this.theme.spacing = 'compact';
      this.theme.touchTargetSize = 'large';
      this.theme.animation = 'reduced';
    } else if (this.deviceInfo.isTablet) {
      this.theme.fontSize = 'medium';
      this.theme.spacing = 'normal';
      this.theme.touchTargetSize = 'medium';
      this.theme.animation = 'normal';
    } else {
      this.theme.fontSize = 'normal';
      this.theme.spacing = 'normal';
      this.theme.touchTargetSize = 'normal';
      this.theme.animation = 'normal';
    }
  }

  /**
   * 设置CSS变量
   */
  setCSSVariables() {
    const root = document.documentElement;

    // 设置断点变量
    root.style.setProperty('--mobile-breakpoint', `${this.breakpoints.mobile}px`);
    root.style.setProperty('--tablet-breakpoint', `${this.breakpoints.tablet}px`);
    root.style.setProperty('--desktop-breakpoint', `${this.breakpoints.desktop}px`);

    // 设置设备类型变量
    root.style.setProperty('--is-mobile', this.deviceInfo.isMobile ? '1' : '0');
    root.style.setProperty('--is-tablet', this.deviceInfo.isTablet ? '1' : '0');
    root.style.setProperty('--is-desktop', this.deviceInfo.isDesktop ? '1' : '0');

    // 设置屏幕尺寸变量
    root.style.setProperty('--screen-width', `${this.deviceInfo.screenWidth}px`);
    root.style.setProperty('--screen-height', `${this.deviceInfo.screenHeight}px`);

    // 设置触摸相关变量
    root.style.setProperty('--touch-supported', this.deviceInfo.touchSupported ? '1' : '0');
    root.style.setProperty('--pixel-ratio', this.deviceInfo.pixelRatio);

    // 设置主题变量
    root.style.setProperty('--font-size-scale', this.getFontSizeScale());
    root.style.setProperty('--spacing-scale', this.getSpacingScale());
    root.style.setProperty('--touch-target-size', this.getTouchTargetSize());
    root.style.setProperty('--animation-duration', this.getAnimationDuration());
  }

  /**
   * 获取字体大小缩放
   */
  getFontSizeScale() {
    const scales = {
      small: '0.875',
      normal: '1',
      medium: '1.125',
      large: '1.25',
    };
    return scales[this.theme.fontSize] || scales.normal;
  }

  /**
   * 获取间距缩放
   */
  getSpacingScale() {
    const scales = {
      compact: '0.75',
      normal: '1',
      medium: '1.25',
    };
    return scales[this.theme.spacing] || scales.normal;
  }

  /**
   * 获取触摸目标大小
   */
  getTouchTargetSize() {
    const sizes = {
      normal: '44px',
      medium: '48px',
      large: '56px',
    };
    return sizes[this.theme.touchTargetSize] || sizes.normal;
  }

  /**
   * 获取动画持续时间
   */
  getAnimationDuration() {
    const durations = {
      reduced: '0.2s',
      normal: '0.3s',
    };
    return durations[this.theme.animation] || durations.normal;
  }

  /**
   * 处理窗口大小变化
   */
  handleResize() {
    this.detectDevice();
    this.setCSSVariables();
    this.emit('resize', this.deviceInfo);
  }

  /**
   * 处理屏幕方向变化
   */
  handleOrientationChange() {
    setTimeout(() => {
      this.detectDevice();
      this.setCSSVariables();
      this.emit('orientationchange', this.deviceInfo);
    }, 100);
  }

  /**
   * 设置触摸事件
   */
  setupTouchEvents() {
    if (!this.deviceInfo.touchSupported) return;

    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    document.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: true });
  }

  /**
   * 处理触摸开始
   */
  handleTouchStart(event) {
    const touch = event.touches[0];
    this.touchState.isTouching = true;
    this.touchState.touchStartX = touch.clientX;
    this.touchState.touchStartY = touch.clientY;
    this.touchState.longPressActive = false;

    // 设置长按定时器
    this.touchState.longPressTimer = setTimeout(() => {
      this.touchState.longPressActive = true;
      this.emit('longpress', {
        x: touch.clientX,
        y: touch.clientY,
        target: event.target,
      });
    }, 500);

    this.emit('touchstart', {
      x: touch.clientX,
      y: touch.clientY,
      target: event.target,
    });
  }

  /**
   * 处理触摸移动
   */
  handleTouchMove(event) {
    if (!this.touchState.isTouching) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - this.touchState.touchStartX;
    const deltaY = touch.clientY - this.touchState.touchStartY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // 如果移动距离超过阈值，取消长按
    if (distance > 10) {
      clearTimeout(this.touchState.longPressTimer);
      this.touchState.longPressActive = false;
    }

    this.emit('touchmove', {
      x: touch.clientX,
      y: touch.clientY,
      deltaX,
      deltaY,
      distance,
      target: event.target,
    });
  }

  /**
   * 处理触摸结束
   */
  handleTouchEnd(event) {
    if (!this.touchState.isTouching) return;

    const touch = event.changedTouches[0];
    this.touchState.touchEndX = touch.clientX;
    this.touchState.touchEndY = touch.clientY;

    // 计算滑动方向
    const deltaX = this.touchState.touchEndX - this.touchState.touchStartX;
    const deltaY = this.touchState.touchEndY - this.touchState.touchStartY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (absDeltaX > 50 || absDeltaY > 50) {
      if (absDeltaX > absDeltaY) {
        this.touchState.swipeDirection = deltaX > 0 ? 'right' : 'left';
      } else {
        this.touchState.swipeDirection = deltaY > 0 ? 'down' : 'up';
      }
    } else {
      this.touchState.swipeDirection = null;
    }

    // 清除长按定时器
    if (this.touchState.longPressTimer) {
      clearTimeout(this.touchState.longPressTimer);
    }

    this.touchState.isTouching = false;

    this.emit('touchend', {
      x: touch.clientX,
      y: touch.clientY,
      swipeDirection: this.touchState.swipeDirection,
      longPress: this.touchState.longPressActive,
      target: event.target,
    });

    // 重置状态
    this.touchState.swipeDirection = null;
    this.touchState.longPressActive = false;
  }

  /**
   * 处理触摸取消
   */
  handleTouchCancel(event) {
    this.touchState.isTouching = false;

    if (this.touchState.longPressTimer) {
      clearTimeout(this.touchState.longPressTimer);
    }

    this.emit('touchcancel', {
      target: event.target,
    });
  }

  /**
   * 设置网络事件
   */
  setupNetworkEvents() {
    window.addEventListener('online', () => {
      this.emit('online', true);
    });

    window.addEventListener('offline', () => {
      this.emit('offline', false);
    });

    window.addEventListener('connectionchange', () => {
      this.emit('connectionchange', navigator.connection);
    });
  }

  /**
   * 创建全局样式
   */
  createGlobalStyles() {
    const styleId = 'mobile-adaptation-styles';
    let styleElement = document.getElementById(styleId);

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    const css = `
      /* 移动端优化样式 */
      @media (max-width: 768px) {
        /* 增大触摸目标 */
        .clickable,
        button,
        a,
        input,
        select,
        textarea {
          min-height: var(--touch-target-size);
          min-width: var(--touch-target-size);
        }

        /* 增大间距 */
        .form-group,
        .button-group,
        .card {
          margin-bottom: calc(1.5 * var(--spacing-scale) * 1rem);
        }

        /* 字体优化 */
        body {
          font-size: calc(var(--font-size-scale) * 16px);
          line-height: 1.5;
        }

        h1 { font-size: calc(var(--font-size-scale) * 2.5rem); }
        h2 { font-size: calc(var(--font-size-scale) * 2rem); }
        h3 { font-size: calc(var(--font-size-scale) * 1.75rem); }
        h4 { font-size: calc(var(--font-size-scale) * 1.5rem); }
        h5 { font-size: calc(var(--font-size-scale) * 1.25rem); }
        h6 { font-size: calc(var(--font-size-scale) * 1.125rem); }

        /* 动画优化 */
        .transition-all {
          transition-duration: var(--animation-duration);
        }

        /* 布局优化 */
        .container {
          padding: 0 calc(var(--spacing-scale) * 1rem);
          max-width: 100%;
        }

        .row {
          margin-left: calc(-0.5 * var(--spacing-scale) * 1rem);
          margin-right: calc(-0.5 * var(--spacing-scale) * 1rem);
        }

        .col,
        [class*="col-"] {
          padding-left: calc(0.5 * var(--spacing-scale) * 1rem);
          padding-right: calc(0.5 * var(--spacing-scale) * 1rem);
        }
      }

      /* 触摸反馈样式 */
      .touch-feedback {
        transition: all 0.2s ease;
      }

      .touch-feedback:active {
        transform: scale(0.95);
        opacity: 0.8;
      }

      .feedback-light {
        background-color: rgba(59, 130, 246, 0.1);
      }

      .feedback-medium {
        background-color: rgba(59, 130, 246, 0.2);
      }

      .feedback-heavy {
        background-color: rgba(59, 130, 246, 0.3);
      }

      /* 滑动手势支持 */
      .swipeable {
        touch-action: pan-y;
      }

      .swipeable.swiping {
        transition: transform var(--animation-duration) ease;
      }

      /* 滚动条优化 */
      ::-webkit-scrollbar {
        width: 8px;
      }

      ::-webkit-scrollbar-track {
        background: #f1f1f1;
      }

      ::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
      }

      /* 输入框优化 */
      input,
      textarea,
      select {
        font-size: 16px; /* 防止iOS缩放 */
        -webkit-appearance: none;
        appearance: none;
      }

      /* 禁用缩放 */
      body {
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
        -moz-text-size-adjust: 100%;
        text-size-adjust: 100%;
      }

      /* 安全区域支持 */
      @supports (padding: max(0px)) {
        body {
          padding-left: env(safe-area-inset-left);
          padding-right: env(safe-area-inset-right);
        }
      }

      /* 横屏适配 */
      @media (orientation: landscape) and (max-height: 500px) {
        .mobile-header {
          min-height: auto;
          padding: 0.5rem 0;
        }

        .mobile-footer {
          padding: 0.5rem 0;
        }
      }

      /* 高DPI屏幕优化 */
      @media (-webkit-min-device-pixel-ratio: 2),
             (min-resolution: 192dpi) {
        .border-image {
          border-width: 0.5px;
        }
      }

      /* 减少动画 */
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `;

    styleElement.textContent = css;
  }

  /**
   * 触觉反馈
   */
  hapticFeedback(type = 'light') {
    if ('vibrate' in navigator && this.deviceInfo.touchSupported) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
        double: [10, 50, 10],
        success: [10, 30, 10],
        error: [50, 50, 50],
        warning: [20, 20, 20],
      };

      try {
        navigator.vibrate(patterns[type] || patterns.light);
      } catch (error) {
        console.warn('触觉反馈不可用:', error);
      }
    }
  }

  /**
   * 添加触觉反馈类
   */
  addHapticClass(element, type = 'light') {
    if (element) {
      element.classList.add('haptic-feedback', `feedback-${type}`);
      setTimeout(() => {
        element.classList.remove('haptic-feedback', `feedback-${type}`);
      }, 200);
    }
  }

  /**
   * 检测是否为移动设备
   */
  isMobileDevice() {
    return this.deviceInfo.isMobile || this.deviceInfo.isTablet;
  }

  /**
   * 获取当前设备信息
   */
  getDeviceInfo() {
    return { ...this.deviceInfo };
  }

  /**
   * 获取当前主题配置
   */
  getTheme() {
    return { ...this.theme };
  }

  /**
   * 更新主题配置
   */
  updateThemeConfig(newTheme) {
    Object.assign(this.theme, newTheme);
    this.setCSSVariables();
  }

  /**
   * 自适应布局
   */
  adaptiveLayout(layoutConfig = {}) {
    const {
      container = null,
      breakpoints = null,
      spacing = null,
      typography = null,
    } = layoutConfig;

    if (container) {
      this.applyContainerAdaptation(container);
    }

    if (breakpoints) {
      this.breakpoints = { ...this.breakpoints, ...breakpoints };
    }

    if (spacing) {
      this.theme.spacing = spacing;
    }

    if (typography) {
      this.theme.fontSize = typography;
    }

    this.setCSSVariables();
  }

  /**
   * 应用容器自适应
   */
  applyContainerAdaptation(container) {
    if (!container) return;

    const { breakpoints } = this;

    // 根据屏幕大小调整容器
    if (this.deviceInfo.screenWidth <= breakpoints.mobile) {
      container.classList.add('mobile-layout');
      container.classList.remove('tablet-layout', 'desktop-layout');
    } else if (this.deviceInfo.screenWidth <= breakpoints.tablet) {
      container.classList.add('tablet-layout');
      container.classList.remove('mobile-layout', 'desktop-layout');
    } else {
      container.classList.add('desktop-layout');
      container.classList.remove('mobile-layout', 'tablet-layout');
    }

    // 根据方向调整
    if (this.deviceInfo.orientation === 'landscape') {
      container.classList.add('landscape');
    } else {
      container.classList.remove('landscape');
    }
  }

  /**
   * 事件监听器
   */
  listeners = new Map();

  /**
   * 添加事件监听器
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * 移除事件监听器
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件处理错误 (${event}):`, error);
        }
      });
    }
  }
}

// 创建单例实例
const mobileAdaptationService = new MobileAdaptationService();

export default mobileAdaptationService;
export { MobileAdaptationService };
