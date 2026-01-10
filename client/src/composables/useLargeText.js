/**
 * 大字模式 Composable
 * 支持老年用户的大字体显示功能
 */
import { ref, onMounted, onUnmounted } from 'vue';

export function useLargeText() {
  const isLargeText = ref(false);

  // 从本地存储加载设置
  const loadSetting = () => {
    const saved = localStorage.getItem('largeTextMode');
    if (saved === 'true') {
      isLargeText.value = true;
      document.body.classList.add('large-text-mode');
    }
  };

  // 切换大字模式
  const toggleLargeText = () => {
    isLargeText.value = !isLargeText.value;

    if (isLargeText.value) {
      document.body.classList.add('large-text-mode');
      localStorage.setItem('largeTextMode', 'true');
    } else {
      document.body.classList.remove('large-text-mode');
      localStorage.setItem('largeTextMode', 'false');
    }
  };

  // 设置大字模式
  const setLargeText = enabled => {
    isLargeText.value = enabled;
    if (enabled) {
      document.body.classList.add('large-text-mode');
      localStorage.setItem('largeTextMode', 'true');
    } else {
      document.body.classList.remove('large-text-mode');
      localStorage.setItem('largeTextMode', 'false');
    }
  };

  // 生命周期
  onMounted(() => {
    loadSetting();
  });

  return {
    isLargeText,
    toggleLargeText,
    setLargeText,
  };
}

export default useLargeText;
