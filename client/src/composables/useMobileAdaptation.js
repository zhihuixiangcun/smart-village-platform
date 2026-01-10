/**
 * 移动端适配组合式函数
 * 提供移动端适配功能的响应式接口
 */

import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import mobileAdaptationService from '@/services/mobileAdaptationService';

export function useMobileAdaptation() {
  // 设备信息响应式数据
  const deviceInfo = reactive(mobileAdaptationService.getDeviceInfo());

  // 响应式计算属性
  const isMobile = computed(() => deviceInfo.isMobile);
  const isTablet = computed(() => deviceInfo.isTablet);
  const isDesktop = computed(() => deviceInfo.isDesktop);
  const isPortrait = computed(() => deviceInfo.orientation === 'portrait');
  const isLandscape = computed(() => deviceInfo.orientation === 'landscape');
  const isSmallScreen = computed(() => deviceInfo.isSmallScreen);
  const isMediumScreen = computed(() => deviceInfo.isMediumScreen);
  const isLargeScreen = computed(() => deviceInfo.isLargeScreen);

  // 监听器列表
  const listeners = new Set();

  /**
   * 更新设备信息
   */
  const updateDeviceInfo = () => {
    const newInfo = mobileAdaptationService.getDeviceInfo();
    Object.assign(deviceInfo, newInfo);

    // 通知所有监听器
    listeners.forEach(listener => listener(newInfo));
  };

  /**
   * 添加设备信息变化监听器
   * @param {Function} listener - 监听器函数
   */
  const addDeviceListener = listener => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  /**
   * 移除设备信息变化监听器
   * @param {Function} listener - 监听器函数
   */
  const removeDeviceListener = listener => {
    listeners.delete(listener);
  };

  /**
   * 触觉反馈
   * @param {string} type - 反馈类型
   */
  const hapticFeedback = type => {
    mobileAdaptationService.hapticFeedback(type);
  };

  /**
   * 添加触觉反馈类
   * @param {Element} element - 目标元素
   * @param {string} type - 反馈类型
   */
  const addHapticClass = (element, type) => {
    mobileAdaptationService.addHapticClass(element, type);
  };

  /**
   * 移除触觉反馈类
   * @param {Element} element - 目标元素
   * @param {string} type - 反馈类型
   */
  const removeHapticClass = (element, type) => {
    mobileAdaptationService.removeHapticClass(element, type);
  };

  /**
   * 自适应布局
   * @param {Element} element - 目标元素
   * @param {Object} config - 配置对象
   */
  const adaptiveLayout = (element, config) => {
    mobileAdaptationService.adaptiveLayout(element, config);
  };

  /**
   * 获取响应式值
   * @param {Object} breakpoints - 断点配置
   * @returns {*} 匹配的值
   */
  const getResponsiveValue = breakpoints => {
    if (isSmallScreen.value && breakpoints.mobile) {
      return breakpoints.mobile;
    } else if (isMediumScreen.value && breakpoints.tablet) {
      return breakpoints.tablet;
    } else if (isLargeScreen.value && breakpoints.desktop) {
      return breakpoints.desktop;
    }
    return breakpoints.default || breakpoints.desktop;
  };

  /**
   * 获取主题配置
   * @returns {Object} 主题配置
   */
  const getTheme = () => {
    return mobileAdaptationService.getTheme();
  };

  /**
   * 更新主题配置
   * @param {Object} theme - 主题配置
   */
  const updateTheme = theme => {
    mobileAdaptationService.updateThemeConfig(theme);
  };

  /**
   * 检测是否支持触摸
   * @returns {boolean} 是否支持触摸
   */
  const isTouchSupported = () => {
    return mobileAdaptationService.isMobileDevice();
  };

  /**
   * 获取安全区域
   * @returns {Object} 安全区域信息
   */
  const getSafeArea = () => {
    const computedStyle = getComputedStyle(document.documentElement);
    return {
      top: computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0px',
      right: computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0px',
      bottom: computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0px',
      left: computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0px',
    };
  };

  /**
   * 媒体查询监听
   * @param {string} query - 媒体查询字符串
   * @param {Function} callback - 回调函数
   * @returns {Function} 清理函数
   */
  const useMediaQuery = (query, callback) => {
    const mediaQuery = window.matchMedia(query);

    const handler = e => callback(e.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
    }

    callback(mediaQuery.matches);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  };

  // 响应式断点监听
  const setupBreakpointListeners = () => {
    // 移动设备检测
    const cleanupMobile = useMediaQuery('(max-width: 767px)', matches => {
      deviceInfo.isMobile = matches;
      deviceInfo.deviceType = matches ? 'mobile' : 'tablet';
    });

    // 平板设备检测
    const cleanupTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)', matches => {
      deviceInfo.isTablet = matches;
      if (matches) {
        deviceInfo.deviceType = 'tablet';
      }
    });

    // 桌面设备检测
    const cleanupDesktop = useMediaQuery('(min-width: 1024px)', matches => {
      deviceInfo.isDesktop = matches;
      if (matches) {
        deviceInfo.deviceType = 'desktop';
      }
    });

    // 小屏幕检测
    const cleanupSmall = useMediaQuery('(max-width: 480px)', matches => {
      deviceInfo.isSmallScreen = matches;
      if (matches) {
        deviceInfo.screenSize = 'small';
      }
    });

    // 中等屏幕检测
    const cleanupMedium = useMediaQuery('(min-width: 481px) and (max-width: 1023px)', matches => {
      deviceInfo.isMediumScreen = matches;
      if (matches) {
        deviceInfo.screenSize = 'medium';
      }
    });

    // 大屏幕检测
    const cleanupLarge = useMediaQuery('(min-width: 1024px)', matches => {
      deviceInfo.isLargeScreen = matches;
      if (matches) {
        deviceInfo.screenSize = 'large';
      }
    });

    // 方向检测
    const cleanupOrientation = useMediaQuery('(orientation: portrait)', matches => {
      deviceInfo.orientation = matches ? 'portrait' : 'landscape';
    });

    // 触摸支持检测
    const cleanupTouch = useMediaQuery('(hover: none)', matches => {
      deviceInfo.touchSupported = matches;
    });

    // 返回清理函数
    return () => {
      cleanupMobile();
      cleanupTablet();
      cleanupDesktop();
      cleanupSmall();
      cleanupMedium();
      cleanupLarge();
      cleanupOrientation();
      cleanupTouch();
    };
  };

  // 窗口大小变化监听
  const handleResize = () => {
    deviceInfo.screenWidth = window.innerWidth;
    deviceInfo.screenHeight = window.innerHeight;
    deviceInfo.pixelRatio = window.devicePixelRatio || 1;
  };

  // 组件挂载时设置监听器
  let cleanupBreakpointListeners;
  onMounted(() => {
    handleResize();
    updateDeviceInfo();

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', updateDeviceInfo);

    cleanupBreakpointListeners = setupBreakpointListeners();
  });

  // 组件卸载时清理监听器
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', updateDeviceInfo);

    if (cleanupBreakpointListeners) {
      cleanupBreakpointListeners();
    }

    listeners.clear();
  });

  return {
    // 设备信息
    deviceInfo,

    // 计算属性
    isMobile,
    isTablet,
    isDesktop,
    isPortrait,
    isLandscape,
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,

    // 方法
    hapticFeedback,
    addHapticClass,
    removeHapticClass,
    adaptiveLayout,
    getResponsiveValue,
    getTheme,
    updateTheme,
    isTouchSupported,
    getSafeArea,
    addDeviceListener,
    removeDeviceListener,
    useMediaQuery,
  };
}

// 创建默认实例
export default useMobileAdaptation;
