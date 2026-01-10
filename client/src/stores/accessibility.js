import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';

export const useAccessibilityStore = defineStore('accessibility', () => {
  // 无障碍状态
  const largeTextMode = ref(false);
  const highContrastMode = ref(false);
  const reduceMotion = ref(false);
  const screenReaderAnnouncements = ref(true);

  // 语音设置
  const voiceEnabled = ref(true);
  const autoReadNotifications = ref(true);
  const dialect = ref('zh-CN');
  const speechRate = ref(1);
  const speechPitch = ref(1);

  // 支持的方言列表
  const supportedDialects = [
    { code: 'zh-CN', name: '普通话', example: '你好，欢迎使用智慧乡村' },
    { code: 'wuu-CN', name: '吴语（上海话）', example: '欢迎使用智慧乡村' },
    { code: 'yue-CN', name: '粤语', example: '歡迎使用智慧鄉村' },
    { code: 'hak-CN', name: '客家话', example: '歡迎使用智慧鄉村' },
    { code: 'nan-CN', name: '闽南语', example: '歡迎使用智慧鄉村' },
  ];

  // 计算属性
  const isElderlyMode = computed(() => {
    return largeTextMode.value || highContrastMode.value;
  });

  const accessibilityClass = computed(() => {
    const classes = [];
    if (largeTextMode.value) classes.push('large-text-mode');
    if (highContrastMode.value) classes.push('high-contrast-mode');
    if (reduceMotion.value) classes.push('reduce-motion');
    return classes.join(' ');
  });

  // 初始化：从本地存储加载设置
  function initFromStorage() {
    try {
      const stored = localStorage.getItem('accessibility-settings');
      if (stored) {
        const settings = JSON.parse(stored);
        largeTextMode.value = settings.largeTextMode ?? false;
        highContrastMode.value = settings.highContrastMode ?? false;
        reduceMotion.value = settings.reduceMotion ?? false;
        screenReaderAnnouncements.value = settings.screenReaderAnnouncements ?? true;
        voiceEnabled.value = settings.voiceEnabled ?? true;
        autoReadNotifications.value = settings.autoReadNotifications ?? true;
        dialect.value = settings.dialect ?? 'zh-CN';
        speechRate.value = settings.speechRate ?? 1;
        speechPitch.value = settings.speechPitch ?? 1;
      }
    } catch (error) {
      console.error('Failed to load accessibility settings:', error);
    }
  }

  // 保存设置到本地存储
  function saveToStorage() {
    try {
      const settings = {
        largeTextMode: largeTextMode.value,
        highContrastMode: highContrastMode.value,
        reduceMotion: reduceMotion.value,
        screenReaderAnnouncements: screenReaderAnnouncements.value,
        voiceEnabled: voiceEnabled.value,
        autoReadNotifications: autoReadNotifications.value,
        dialect: dialect.value,
        speechRate: speechRate.value,
        speechPitch: speechPitch.value,
      };
      localStorage.setItem('accessibility-settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save accessibility settings:', error);
    }
  }

  // 切换大字模式
  function toggleLargeTextMode() {
    largeTextMode.value = !largeTextMode.value;
    applyAccessibilitySettings();
    saveToStorage();
  }

  // 切换高对比度模式
  function toggleHighContrastMode() {
    highContrastMode.value = !highContrastMode.value;
    applyAccessibilitySettings();
    saveToStorage();
  }

  // 切换减少动画
  function toggleReduceMotion() {
    reduceMotion.value = !reduceMotion.value;
    applyAccessibilitySettings();
    saveToStorage();
  }

  // 应用无障碍设置到DOM
  function applyAccessibilitySettings() {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('large-text-mode', 'high-contrast-mode', 'reduce-motion');

      if (largeTextMode.value) {
        document.body.classList.add('large-text-mode');
      }
      if (highContrastMode.value) {
        document.body.classList.add('high-contrast-mode');
      }
      if (reduceMotion.value) {
        document.body.classList.add('reduce-motion');
      }
    }
  }

  // 设置方言
  function setDialect(dialectCode) {
    if (supportedDialects.find(d => d.code === dialectCode)) {
      dialect.value = dialectCode;
      saveToStorage();
    }
  }

  // 语音播报
  function speak(text) {
    if (!voiceEnabled.value || typeof window === 'undefined') return;

    try {
      const synthesis = window.speechSynthesis;
      if (synthesis) {
        // 取消之前的播报
        synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = dialect.value;
        utterance.rate = speechRate.value;
        utterance.pitch = speechPitch.value;

        synthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Speech synthesis error:', error);
    }
  }

  // 屏幕阅读器公告
  function announce(text) {
    if (!screenReaderAnnouncements.value || typeof document === 'undefined') return;

    try {
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = text;

      document.body.appendChild(announcement);

      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    } catch (error) {
      console.error('Announcement error:', error);
    }
  }

  // 重置所有设置
  function resetSettings() {
    largeTextMode.value = false;
    highContrastMode.value = false;
    reduceMotion.value = false;
    screenReaderAnnouncements.value = true;
    voiceEnabled.value = true;
    autoReadNotifications.value = true;
    dialect.value = 'zh-CN';
    speechRate.value = 1;
    speechPitch.value = 1;

    applyAccessibilitySettings();
    saveToStorage();
  }

  // 初始化
  initFromStorage();
  applyAccessibilitySettings();

  return {
    // 状态
    largeTextMode,
    highContrastMode,
    reduceMotion,
    screenReaderAnnouncements,
    voiceEnabled,
    autoReadNotifications,
    dialect,
    speechRate,
    speechPitch,
    supportedDialects,

    // 计算属性
    isElderlyMode,
    accessibilityClass,

    // 方法
    toggleLargeTextMode,
    toggleHighContrastMode,
    toggleReduceMotion,
    setDialect,
    speak,
    announce,
    resetSettings,
    initFromStorage,
    saveToStorage,
    applyAccessibilitySettings,
  };
});
