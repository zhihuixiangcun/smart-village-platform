import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAccessibilityStore = defineStore('accessibility', () => {
  // 响应式状态
  const largeTextMode = ref(false);
  const highContrastMode = ref(false);
  const voiceEnabled = ref(false);
  const autoRead = ref(false);
  const reducedMotion = ref(false);
  const screenReaderMode = ref(false);

  // 字体大小设置
  const fontSize = ref('medium'); // small, medium, large, xlarge

  // 语音设置
  const voiceSettings = ref({
    dialect: 'mandarin', // mandarin, cantonese, hokkien, hakka
    speed: 1.0,
    volume: 1.0,
    enabled: false,
  });

  // 颜色主题
  const colorTheme = ref('default'); // default, highContrast, dark, light

  // 计算属性
  const fontSizeMultiplier = computed(() => {
    const multipliers = {
      small: 0.875,
      medium: 1.0,
      large: 1.25,
      xlarge: 1.5,
    };
    return multipliers[fontSize.value] || 1.0;
  });

  const accessibilityClass = computed(() => {
    const classes = [];

    if (largeTextMode.value) classes.push('large-text-mode');
    if (highContrastMode.value) classes.push('high-contrast-mode');
    if (reducedMotion.value) classes.push('reduced-motion');
    if (screenReaderMode.value) classes.push('screen-reader-mode');

    classes.push(`font-size-${fontSize.value}`);
    classes.push(`theme-${colorTheme.value}`);

    return classes.join(' ');
  });

  // 方法定义

  /**
   * 切换大字模式
   */
  const toggleLargeTextMode = () => {
    largeTextMode.value = !largeTextMode.value;
    saveToLocalStorage();
  };

  /**
   * 切换高对比度模式
   */
  const toggleHighContrastMode = () => {
    highContrastMode.value = !highContrastMode.value;
    saveToLocalStorage();
  };

  /**
   * 切换语音功能
   */
  const toggleVoiceEnabled = () => {
    voiceEnabled.value = !voiceEnabled.value;
    voiceSettings.value.enabled = voiceEnabled.value;
    saveToLocalStorage();
  };

  /**
   * 切换自动朗读
   */
  const toggleAutoRead = () => {
    autoRead.value = !autoRead.value;
    saveToLocalStorage();
  };

  /**
   * 切换减少动画
   */
  const toggleReducedMotion = () => {
    reducedMotion.value = !reducedMotion.value;
    saveToLocalStorage();
  };

  /**
   * 设置字体大小
   */
  const setFontSize = size => {
    if (['small', 'medium', 'large', 'xlarge'].includes(size)) {
      fontSize.value = size;
      // 大字模式下自动调整字体
      if (size === 'large' || size === 'xlarge') {
        largeTextMode.value = true;
      }
      saveToLocalStorage();
    }
  };

  /**
   * 设置语音方言
   */
  const setVoiceDialect = dialect => {
    if (['mandarin', 'cantonese', 'hokkien', 'hakka', 'guizhou'].includes(dialect)) {
      voiceSettings.value.dialect = dialect;
      saveToLocalStorage();
    }
  };

  /**
   * 设置语音速度
   */
  const setVoiceSpeed = speed => {
    if (speed >= 0.5 && speed <= 2.0) {
      voiceSettings.value.speed = speed;
      saveToLocalStorage();
    }
  };

  /**
   * 设置语音音量
   */
  const setVoiceVolume = volume => {
    if (volume >= 0 && volume <= 1.0) {
      voiceSettings.value.volume = volume;
      saveToLocalStorage();
    }
  };

  /**
   * 设置颜色主题
   */
  const setColorTheme = theme => {
    if (['default', 'highContrast', 'dark', 'light'].includes(theme)) {
      colorTheme.value = theme;
      saveToLocalStorage();
    }
  };

  /**
   * 重置所有设置
   */
  const resetSettings = () => {
    largeTextMode.value = false;
    highContrastMode.value = false;
    voiceEnabled.value = false;
    autoRead.value = false;
    reducedMotion.value.value = false;
    screenReaderMode.value = false;
    fontSize.value = 'medium';
    colorTheme.value = 'default';

    voiceSettings.value = {
      dialect: 'mandarin',
      speed: 1.0,
      volume: 1.0,
      enabled: false,
    };

    saveToLocalStorage();
  };

  /**
   * 从本地存储加载设置
   */
  const loadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem('village-accessibility-settings');
      if (saved) {
        const settings = JSON.parse(saved);

        largeTextMode.value = settings.largeTextMode || false;
        highContrastMode.value = settings.highContrastMode || false;
        voiceEnabled.value = settings.voiceEnabled || false;
        autoRead.value = settings.autoRead || false;
        reducedMotion.value = settings.reducedMotion || false;
        screenReaderMode.value = settings.screenReaderMode || false;
        fontSize.value = settings.fontSize || 'medium';
        colorTheme.value = settings.colorTheme || 'default';

        if (settings.voiceSettings) {
          voiceSettings.value = { ...voiceSettings.value, ...settings.voiceSettings };
        }
      }
    } catch (error) {
      console.warn('Failed to load accessibility settings:', error);
    }
  };

  /**
   * 保存设置到本地存储
   */
  const saveToLocalStorage = () => {
    try {
      const settings = {
        largeTextMode: largeTextMode.value,
        highContrastMode: highContrastMode.value,
        voiceEnabled: voiceEnabled.value,
        autoRead: autoRead.value,
        reducedMotion: reducedMotion.value,
        screenReaderMode: screenReaderMode.value,
        fontSize: fontSize.value,
        colorTheme: colorTheme.value,
        voiceSettings: voiceSettings.value,
      };

      localStorage.setItem('village-accessibility-settings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save accessibility settings:', error);
    }
  };

  /**
   * 应用无障碍样式到document
   */
  const applyAccessibilityStyles = () => {
    const root = document.documentElement;

    // 设置字体大小
    root.style.setProperty('--font-size-multiplier', fontSizeMultiplier.value);

    // 设置减少动画
    if (reducedMotion.value) {
      root.style.setProperty('--animation-duration', '0.01ms');
      root.classList.add('reduce-motion');
    } else {
      root.style.removeProperty('--animation-duration');
      root.classList.remove('reduce-motion');
    }

    // 应用主题类
    document.body.className = accessibilityClass.value;
  };

  /**
   * 语音朗读文本
   */
  const speakText = (text, options = {}) => {
    if (!voiceEnabled.value || !('speechSynthesis' in window)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      // 取消之前的语音
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // 设置语音参数
      utterance.lang = getVoiceLanguage(voiceSettings.value.dialect);
      utterance.rate = voiceSettings.value.speed * (options.speed || 1.0);
      utterance.volume = voiceSettings.value.volume * (options.volume || 1.0);
      utterance.pitch = options.pitch || 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = event => reject(event.error);

      // 选择合适的语音
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice =>
        voice.lang.includes(getVoiceLanguageCode(voiceSettings.value.dialect))
      );

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      window.speechSynthesis.speak(utterance);
    });
  };

  /**
   * 停止语音朗读
   */
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  /**
   * 获取语音语言代码
   */
  const getVoiceLanguageCode = dialect => {
    const codes = {
      mandarin: 'zh',
      cantonese: 'zh-HK',
      hokkien: 'zh-MO',
      hakka: 'zh-CN',
      guizhou: 'zh-CN',
    };
    return codes[dialect] || 'zh';
  };

  /**
   * 获取语音语言
   */
  const getVoiceLanguage = dialect => {
    const languages = {
      mandarin: 'zh-CN',
      cantonese: 'zh-HK',
      hokkien: 'zh-MO',
      hakka: 'zh-CN',
      guizhou: 'zh-CN',
    };
    return languages[dialect] || 'zh-CN';
  };

  // 初始化
  const init = () => {
    loadFromLocalStorage();
    applyAccessibilityStyles();

    // 监听系统字体大小变化
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleReducedMotionChange = e => {
      if (e.matches) {
        reducedMotion.value = true;
      }
    };

    mediaQuery.addEventListener('change', handleReducedMotionChange);
    handleReducedMotionChange(mediaQuery);

    // 监听语音API就绪
    if ('speechSynthesis' in window) {
      const initVoices = () => {
        window.speechSynthesis.getVoices();
      };

      initVoices();
      window.speechSynthesis.onvoiceschanged = initVoices;
    }
  };

  return {
    // 状态
    largeTextMode,
    highContrastMode,
    voiceEnabled,
    autoRead,
    reducedMotion,
    screenReaderMode,
    fontSize,
    voiceSettings,
    colorTheme,

    // 计算属性
    fontSizeMultiplier,
    accessibilityClass,

    // 方法
    toggleLargeTextMode,
    toggleHighContrastMode,
    toggleVoiceEnabled,
    toggleAutoRead,
    toggleReducedMotion,
    setFontSize,
    setVoiceDialect,
    setVoiceSpeed,
    setVoiceVolume,
    setColorTheme,
    resetSettings,
    loadFromLocalStorage,
    saveToLocalStorage,
    applyAccessibilityStyles,
    speakText,
    stopSpeaking,
    getVoiceLanguage,
    getVoiceLanguageCode,

    // 初始化
    init,
  };
});
