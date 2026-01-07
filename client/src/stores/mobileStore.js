/**
 * 移动端状态管理 - Mobile Store
 *
 * 使用Pinia管理移动端相关状态：
 * - 适老化设置
 * - 语音设置
 * - 离线状态
 * - 网络状态
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useMobileStore = defineStore('mobile', () => {
  // ==================== 适老化设置 ====================
  const elderlyMode = ref({
    enabled: false,
    fontSize: 'standard', // standard, large, extraLarge
    highContrast: false,
    screenReader: false,
    simplifiedMode: false
  });

  // ==================== 语音设置 ====================
  const speechSettings = ref({
    dialect: 'mandarin',
    speaker: 'female',
    speed: 5, // 0-15
    pitch: 5, // 0-15
    volume: 5, // 0-15
    autoRead: false,
    voiceCommand: true
  });

  // ==================== 离线状态 ====================
  const offlineStatus = ref({
    isOffline: !navigator.onLine,
    pendingSyncs: 0,
    lastSyncTime: null,
    isSyncing: false,
    syncProgress: 0
  });

  // ==================== 网络状态 ====================
  const networkStatus = ref({
    online: navigator.onLine,
    type: 'unknown', // wifi, cellular, unknown
    effectiveType: 'unknown' // 4g, 3g, 2g, slow-2g
  });

  // ==================== 设备信息 ====================
  const deviceInfo = ref({
    id: getDeviceId(),
    platform: getPlatform(),
    isMobile: isMobile(),
    screenWidth: window.screen.width,
    screenHeight: window.screen.height
  });

  // ==================== UI状态 ====================
  const uiState = ref({
    sidebarOpen: false,
    voiceAssistantOpen: false,
    settingsPanelOpen: false
  });

  // ==================== 计算属性 ====================

  // 是否适老化模式
  const isElderlyMode = computed(() => elderlyMode.value.enabled);

  // 当前字体大小
  const currentFontSize = computed(() => elderlyMode.value.fontSize);

  // 是否高对比度
  const isHighContrast = computed(() => elderlyMode.value.highContrast);

  // 是否读屏模式
  const isScreenReader = computed(() => elderlyMode.value.screenReader);

  // 是否简化模式
  const isSimplifiedMode = computed(() => elderlyMode.value.simplifiedMode);

  // 是否可以同步
  const canSync = computed(() => {
    return !offlineStatus.value.isOffline &&
           !offlineStatus.value.isSyncing &&
           offlineStatus.value.pendingSyncs > 0;
  });

  // 同步状态文本
  const syncStatusText = computed(() => {
    if (offlineStatus.value.isSyncing) return '正在同步...';
    if (offlineStatus.value.isOffline) return '离线模式';
    if (offlineStatus.value.pendingSyncs > 0) {
      return `待同步: ${offlineStatus.value.pendingSyncs} 条`;
    }
    return '已同步';
  });

  // ==================== 方法 ====================

  /**
   * 切换适老化模式
   */
  const toggleElderlyMode = (enabled) => {
    elderlyMode.value.enabled = enabled ?? !elderlyMode.value.enabled;
    saveToStorage();
  };

  /**
   * 设置字体大小
   */
  const setFontSize = (size) => {
    elderlyMode.value.fontSize = size;
    saveToStorage();
  };

  /**
   * 切换高对比度
   */
  const toggleHighContrast = () => {
    elderlyMode.value.highContrast = !elderlyMode.value.highContrast;
    saveToStorage();
  };

  /**
   * 切换读屏模式
   */
  const toggleScreenReader = () => {
    elderlyMode.value.screenReader = !elderlyMode.value.screenReader;
    saveToStorage();
  };

  /**
   * 切换简化模式
   */
  const toggleSimplifiedMode = () => {
    elderlyMode.value.simplifiedMode = !elderlyMode.value.simplifiedMode;
    saveToStorage();
  };

  /**
   * 设置方言
   */
  const setDialect = (dialect) => {
    speechSettings.value.dialect = dialect;
    saveToStorage();
  };

  /**
   * 设置发音人
   */
  const setSpeaker = (speaker) => {
    speechSettings.value.speaker = speaker;
    saveToStorage();
  };

  /**
   * 设置语音参数
   */
  const setSpeechParams = (params) => {
    Object.assign(speechSettings.value, params);
    saveToStorage();
  };

  /**
   * 更新离线状态
   */
  const updateOfflineStatus = (status) => {
    Object.assign(offlineStatus.value, status);
  };

  /**
   * 更新网络状态
   */
  const updateNetworkStatus = (status) => {
    Object.assign(networkStatus.value, status);
    offlineStatus.value.isOffline = !status.online;
  };

  /**
   * 切换侧边栏
   */
  const toggleSidebar = (open) => {
    uiState.value.sidebarOpen = open ?? !uiState.value.sidebarOpen;
  };

  /**
   * 切换语音助手
   */
  const toggleVoiceAssistant = (open) => {
    uiState.value.voiceAssistantOpen = open ?? !uiState.value.voiceAssistantOpen;
  };

  /**
   * 切换设置面板
   */
  const toggleSettingsPanel = (open) => {
    uiState.value.settingsPanelOpen = open ?? !uiState.value.settingsPanelOpen;
  };

  /**
   * 重置所有设置
   */
  const resetAll = () => {
    elderlyMode.value = {
      enabled: false,
      fontSize: 'standard',
      highContrast: false,
      screenReader: false,
      simplifiedMode: false
    };

    speechSettings.value = {
      dialect: 'mandarin',
      speaker: 'female',
      speed: 5,
      pitch: 5,
      volume: 5,
      autoRead: false,
      voiceCommand: true
    };

    saveToStorage();
  };

  /**
   * 从本地存储加载
   */
  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem('mobile_store_config');
      if (saved) {
        const config = JSON.parse(saved);

        if (config.elderlyMode) {
          Object.assign(elderlyMode.value, config.elderlyMode);
        }
        if (config.speechSettings) {
          Object.assign(speechSettings.value, config.speechSettings);
        }
      }
    } catch (error) {
      console.error('加载移动端配置失败:', error);
    }
  };

  /**
   * 保存到本地存储
   */
  const saveToStorage = () => {
    try {
      const config = {
        elderlyMode: elderlyMode.value,
        speechSettings: speechSettings.value
      };
      localStorage.setItem('mobile_store_config', JSON.stringify(config));
    } catch (error) {
      console.error('保存移动端配置失败:', error);
    }
  };

  /**
   * 初始化
   */
  const init = () => {
    loadFromStorage();

    // 监听网络状态变化
    window.addEventListener('online', () => {
      updateNetworkStatus({ online: true });
    });

    window.addEventListener('offline', () => {
      updateNetworkStatus({ online: false });
    });

    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      deviceInfo.value.screenWidth = window.screen.width;
      deviceInfo.value.screenHeight = window.screen.height;
    });
  };

  // ==================== 辅助函数 ====================

  function getDeviceId() {
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = `device_${  Date.now()  }_${  Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', id);
    }
    return id;
  }

  function getPlatform() {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'android';
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    if (/win/i.test(ua)) return 'windows';
    if (/mac/i.test(ua)) return 'macos';
    if (/linux/i.test(ua)) return 'linux';
    return 'unknown';
  }

  function isMobile() {
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent);
  }

  // 返回状态和方法
  return {
    // 状态
    elderlyMode,
    speechSettings,
    offlineStatus,
    networkStatus,
    deviceInfo,
    uiState,

    // 计算属性
    isElderlyMode,
    currentFontSize,
    isHighContrast,
    isScreenReader,
    isSimplifiedMode,
    canSync,
    syncStatusText,

    // 方法
    toggleElderlyMode,
    setFontSize,
    toggleHighContrast,
    toggleScreenReader,
    toggleSimplifiedMode,
    setDialect,
    setSpeaker,
    setSpeechParams,
    updateOfflineStatus,
    updateNetworkStatus,
    toggleSidebar,
    toggleVoiceAssistant,
    toggleSettingsPanel,
    resetAll,
    loadFromStorage,
    saveToStorage,
    init
  };
});
