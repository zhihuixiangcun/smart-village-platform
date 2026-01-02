/**
 * 适老化模式组合函数 - useElderlyMode
 *
 * 功能：
 * - 字体大小管理
 * - 高对比度切换
 * - 读屏功能
 * - 简化模式
 */

import { ref, computed, watch, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

// 存储键
const STORAGE_KEYS = {
  ELDERLY_MODE: 'elderly_mode_enabled',
  FONT_SIZE: 'elderly_font_size',
  HIGH_CONTRAST: 'high_contrast_mode',
  SCREEN_READER: 'screen_reader_enabled',
  SIMPLIFIED_MODE: 'simplified_mode'
};

// 字体大小级别
export const FONT_SIZES = {
  standard: { name: '标准', value: 16, scale: 1 },
  large: { name: '大字', value: 20, scale: 1.25 },
  extraLarge: { name: '特大', value: 24, scale: 1.5 }
};

export function useElderlyMode() {
  // 状态
  const isElderlyMode = ref(false);
  const fontSize = ref('standard');
  const highContrast = ref(false);
  const screenReader = ref(false);
  const simplifiedMode = ref(false);

  /**
   * 初始化
   */
  onMounted(() => {
    // 从localStorage加载设置
    loadSettings();
    applySettings();
  });

  /**
   * 加载设置
   */
  const loadSettings = () => {
    try {
      const savedMode = localStorage.getItem(STORAGE_KEYS.ELDERLY_MODE);
      const savedFontSize = localStorage.getItem(STORAGE_KEYS.FONT_SIZE);
      const savedContrast = localStorage.getItem(STORAGE_KEYS.HIGH_CONTRAST);
      const savedReader = localStorage.getItem(STORAGE_KEYS.SCREEN_READER);
      const savedSimplified = localStorage.getItem(STORAGE_KEYS.SIMPLIFIED_MODE);

      if (savedMode !== null) isElderlyMode.value = savedMode === 'true';
      if (savedFontSize) fontSize.value = savedFontSize;
      if (savedContrast !== null) highContrast.value = savedContrast === 'true';
      if (savedReader !== null) screenReader.value = savedReader === 'true';
      if (savedSimplified !== null) simplifiedMode.value = savedSimplified === 'true';
    } catch (error) {
      console.error('加载适老化设置失败:', error);
    }
  };

  /**
   * 保存设置
   */
  const saveSettings = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.ELDERLY_MODE, isElderlyMode.value);
      localStorage.setItem(STORAGE_KEYS.FONT_SIZE, fontSize.value);
      localStorage.setItem(STORAGE_KEYS.HIGH_CONTRAST, highContrast.value);
      localStorage.setItem(STORAGE_KEYS.SCREEN_READER, screenReader.value);
      localStorage.setItem(STORAGE_KEYS.SIMPLIFIED_MODE, simplifiedMode.value);
    } catch (error) {
      console.error('保存适老化设置失败:', error);
    }
  };

  /**
   * 应用设置
   */
  const applySettings = () => {
    const root = document.documentElement;

    // 应用字体大小
    const fontSizeConfig = FONT_SIZES[fontSize.value];
    root.style.setProperty('--base-font-size', `${fontSizeConfig.value}px`);
    root.style.setProperty('--font-scale', fontSizeConfig.scale);

    // 应用高对比度
    if (highContrast.value) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // 应用读屏模式
    if (screenReader.value) {
      root.classList.add('screen-reader');
      root.setAttribute('aria-live', 'polite');
    } else {
      root.classList.remove('screen-reader');
      root.removeAttribute('aria-live');
    }

    // 应用简化模式
    if (simplifiedMode.value) {
      root.classList.add('simplified-mode');
    } else {
      root.classList.remove('simplified-mode');
    }

    // 应用适老化模式
    if (isElderlyMode.value) {
      root.classList.add('elderly-mode');
    } else {
      root.classList.remove('elderly-mode');
    }
  };

  /**
   * 切换适老化模式
   */
  const toggleElderlyMode = (enabled) => {
    isElderlyMode.value = enabled ?? !isElderlyMode.value;

    // 自动启用大字模式
    if (isElderlyMode.value && fontSize.value === 'standard') {
      fontSize.value = 'large';
    }

    saveSettings();
    applySettings();

    if (isElderlyMode.value) {
      ElMessage.success('已开启适老化模式');
    } else {
      ElMessage.info('已关闭适老化模式');
    }
  };

  /**
   * 设置字体大小
   */
  const setFontSize = (size) => {
    if (FONT_SIZES[size]) {
      fontSize.value = size;
      saveSettings();
      applySettings();

      if (isElderlyMode.value) {
        ElMessage.success(`已切换到${FONT_SIZES[size].name}模式`);
      }
    }
  };

  /**
   * 切换高对比度
   */
  const toggleHighContrast = () => {
    highContrast.value = !highContrast.value;
    saveSettings();
    applySettings();

    if (highContrast.value) {
      ElMessage.success('已开启高对比度模式');
    } else {
      ElMessage.info('已关闭高对比度模式');
    }
  };

  /**
   * 切换读屏功能
   */
  const toggleScreenReader = () => {
    screenReader.value = !screenReader.value;
    saveSettings();
    applySettings();

    if (screenReader.value) {
      ElMessage.success('已开启读屏功能');
      speakText('读屏功能已开启');
    } else {
      ElMessage.info('已关闭读屏功能');
    }
  };

  /**
   * 切换简化模式
   */
  const toggleSimplifiedMode = () => {
    simplifiedMode.value = !simplifiedMode.value;
    saveSettings();
    applySettings();

    if (simplifiedMode.value) {
      ElMessage.success('已开启简化模式');
    } else {
      ElMessage.info('已关闭简化模式');
    }
  };

  /**
   * 朗读文本
   */
  const speakText = (text) => {
    if (!screenReader.value || !text) return;

    // 停止之前的朗读
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9; // 稍慢的语速
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
  };

  /**
   * 停止朗读
   */
  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
  };

  /**
   * 重置所有设置
   */
  const resetSettings = () => {
    isElderlyMode.value = false;
    fontSize.value = 'standard';
    highContrast.value = false;
    screenReader.value = false;
    simplifiedMode.value = false;

    saveSettings();
    applySettings();

    ElMessage.info('已重置适老化设置');
  };

  /**
   * 获取当前字体大小配置
   */
  const currentFontSizeConfig = computed(() => {
    return FONT_SIZES[fontSize.value];
  });

  /**
   * 监听设置变化
   */
  watch([isElderlyMode, fontSize, highContrast, screenReader, simplifiedMode], () => {
    saveSettings();
    applySettings();
  });

  return {
    // 状态
    isElderlyMode,
    fontSize,
    highContrast,
    screenReader,
    simplifiedMode,
    currentFontSizeConfig,

    // 方法
    toggleElderlyMode,
    setFontSize,
    toggleHighContrast,
    toggleScreenReader,
    toggleSimplifiedMode,
    speakText,
    stopSpeaking,
    resetSettings,

    // 常量
    FONT_SIZES
  };
}
