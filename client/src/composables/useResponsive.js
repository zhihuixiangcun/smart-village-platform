import { ref, onMounted, onUnmounted } from 'vue';

export function useResponsive() {
  const isMobile = ref(false);
  const isTablet = ref(false);
  const isDesktop = ref(false);
  const screenWidth = ref(0);
  const screenHeight = ref(0);

  const breakpoints = {
    mobile: 768,
    tablet: 1024,
    desktop: 1440
  };

  const updateScreenSize = () => {
    screenWidth.value = window.innerWidth;
    screenHeight.value = window.innerHeight;

    isMobile.value = screenWidth.value < breakpoints.mobile;
    isTablet.value = screenWidth.value >= breakpoints.mobile && screenWidth.value < breakpoints.tablet;
    isDesktop.value = screenWidth.value >= breakpoints.tablet;
  };

  const getDeviceType = () => {
    if (isMobile.value) return 'mobile';
    if (isTablet.value) return 'tablet';
    return 'desktop';
  };

  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  };

  const isAndroid = () => {
    return /Android/.test(navigator.userAgent);
  };

  const isTouchDevice = () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  };

  const getViewportHeight = () => {
    // 考虑移动端浏览器地址栏的影响
    if (isMobile.value) {
      return window.visualViewport ? window.visualViewport.height : window.innerHeight;
    }
    return window.innerHeight;
  };

  const getSafeAreaInsets = () => {
    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue('env(safe-area-inset-top)')) || 0,
      right: parseInt(style.getPropertyValue('env(safe-area-inset-right)')) || 0,
      bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)')) || 0,
      left: parseInt(style.getPropertyValue('env(safe-area-inset-left)')) || 0
    };
  };

  onMounted(() => {
    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    window.addEventListener('orientationchange', updateScreenSize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', updateScreenSize);
    window.removeEventListener('orientationchange', updateScreenSize);
  });

  return {
    isMobile,
    isTablet,
    isDesktop,
    screenWidth,
    screenHeight,
    getDeviceType,
    isIOS,
    isAndroid,
    isTouchDevice,
    getViewportHeight,
    getSafeAreaInsets,
    breakpoints
  };
}