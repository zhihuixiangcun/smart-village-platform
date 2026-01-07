/**
 * 设备和状态相关的组合式函数
 */

import { ref, onMounted, onUnmounted } from 'vue';
import offlineService from '@/services/offlineService';

/**
 * 网络状态 Hook
 */
export function useOnline() {
  const isOnline = ref(navigator.onLine);

  const handleOnline = () => {
    isOnline.value = true;
    console.log('网络已连接');
  };

  const handleOffline = () => {
    isOnline.value = false;
    console.log('网络已断开');
  };

  onMounted(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  });

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  });

  return {
    isOnline
  };
}

/**
 * 离线队列 Hook
 */
export function useOfflineQueue() {
  const queueLength = ref(0);
  const syncing = ref(false);

  // 更新队列长度
  const updateQueueLength = async () => {
    const queue = await offlineService.getQueue();
    queueLength.value = queue.length;
  };

  // 同步队列
  const syncQueue = async () => {
    if (syncing.value) return;

    syncing.value = true;
    try {
      await offlineService.syncQueue();
      await updateQueueLength();
    } finally {
      syncing.value = false;
    }
  };

  // 添加到队列
  const addToQueue = async (endpoint, method, data, options) => {
    await offlineService.addToQueue(endpoint, method, data, options);
    await updateQueueLength();
  };

  onMounted(() => {
    updateQueueLength();

    // 监听网络状态变化
    window.addEventListener('online', syncQueue);
  });

  onUnmounted(() => {
    window.removeEventListener('online', syncQueue);
  });

  return {
    queueLength,
    syncing,
    syncQueue,
    addToQueue,
    updateQueueLength
  };
}

/**
 * 设备信息 Hook
 */
export function useDeviceInfo() {
  const deviceInfo = ref({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isIOS: false,
    isAndroid: false,
    screenWidth: 0,
    screenHeight: 0,
    pixelRatio: 1,
    touchSupported: false
  });

  const updateDeviceInfo = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const userAgent = navigator.userAgent.toLowerCase();

    deviceInfo.value = {
      isMobile: width <= 768,
      isTablet: width > 768 && width <= 1024,
      isDesktop: width > 1024,
      isIOS: /iphone|ipad|ipod/.test(userAgent),
      isAndroid: /android/.test(userAgent),
      screenWidth: width,
      screenHeight: height,
      pixelRatio: window.devicePixelRatio || 1,
      touchSupported: 'ontouchstart' in window
    };
  };

  onMounted(() => {
    updateDeviceInfo();
    window.addEventListener('resize', updateDeviceInfo);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', updateDeviceInfo);
  });

  return {
    deviceInfo
  };
}

/**
 * 大字模式 Hook
 */
export function useElderlyMode() {
  const isElderlyMode = ref(
    localStorage.getItem('elderly-mode') === 'true'
  );

  const toggleElderlyMode = () => {
    isElderlyMode.value = !isElderlyMode.value;
    localStorage.setItem('elderly-mode', isElderlyMode.value ? 'true' : 'false');

    // 切换 body 类
    if (isElderlyMode.value) {
      document.body.classList.add('elderly-mode');
    } else {
      document.body.classList.remove('elderly-mode');
    }
  };

  const setElderlyMode = (enabled) => {
    isElderlyMode.value = enabled;
    localStorage.setItem('elderly-mode', enabled ? 'true' : 'false');

    if (enabled) {
      document.body.classList.add('elderly-mode');
    } else {
      document.body.classList.remove('elderly-mode');
    }
  };

  onMounted(() => {
    // 初始化
    if (isElderlyMode.value) {
      document.body.classList.add('elderly-mode');
    }

    // 监听存储变化（跨标签页同步）
    window.addEventListener('storage', (e) => {
      if (e.key === 'elderly-mode') {
        isElderlyMode.value = e.newValue === 'true';
        if (isElderlyMode.value) {
          document.body.classList.add('elderly-mode');
        } else {
          document.body.classList.remove('elderly-mode');
        }
      }
    });
  });

  return {
    isElderlyMode,
    toggleElderlyMode,
    setElderlyMode
  };
}

/**
 * 语音识别 Hook
 */
export function useSpeechRecognition() {
  const isListening = ref(false);
  const transcript = ref('');
  const error = ref(null);

  let recognition = null;

  // 初始化识别实例
  const initRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      error.value = '您的浏览器不支持语音识别';
      return false;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();

    // 配置
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true;

    // 事件监听
    recognition.onresult = (event) => {
      const result = event.results[0][0];
      transcript.value = result.transcript;
    };

    recognition.onerror = (event) => {
      error.value = event.error;
      isListening.value = false;
    };

    recognition.onend = () => {
      isListening.value = false;
    };

    return true;
  };

  // 开始识别
  const start = () => {
    if (!recognition && !initRecognition()) {
      return;
    }

    try {
      recognition.start();
      isListening.value = true;
      transcript.value = '';
      error.value = null;
    } catch (err) {
      error.value = err.message;
    }
  };

  // 停止识别
  const stop = () => {
    if (recognition && isListening.value) {
      recognition.stop();
      isListening.value = false;
    }
  };

  // 重置
  const reset = () => {
    transcript.value = '';
    error.value = null;
  };

  return {
    isListening,
    transcript,
    error,
    start,
    stop,
    reset
  };
}

/**
 * 语音合成 Hook
 */
export function useSpeechSynthesis() {
  const speaking = ref(false);
  const error = ref(null);

  // 朗读文本
  const speak = async (text, options = {}) => {
    if (!('speechSynthesis' in window)) {
      error.value = '您的浏览器不支持语音合成';
      return;
    }

    try {
      speaking.value = true;
      error.value = null;

      // 取消当前朗读
      window.speechSynthesis.cancel();

      // 创建语音实例
      const utterance = new SpeechSynthesisUtterance(text);

      // 配置
      utterance.lang = options.lang || 'zh-CN';
      utterance.rate = options.rate || 0.8;  // 语速（默认较慢）
      utterance.pitch = options.pitch || 1;  // 音调
      utterance.volume = options.volume || 1;  // 音量

      // 事件监听
      utterance.onend = () => {
        speaking.value = false;
      };

      utterance.onerror = (event) => {
        error.value = event.error;
        speaking.value = false;
      };

      // 开始朗读
      window.speechSynthesis.speak(utterance);

    } catch (err) {
      error.value = err.message;
      speaking.value = false;
    }
  };

  // 停止朗读
  const stop = () => {
    window.speechSynthesis.cancel();
    speaking.value = false;
  };

  // 暂停朗读
  const pause = () => {
    if (speaking.value) {
      window.speechSynthesis.pause();
    }
  };

  // 恢复朗读
  const resume = () => {
    window.speechSynthesis.resume();
  };

  return {
    speaking,
    error,
    speak,
    stop,
    pause,
    resume
  };
}

/**
 * 触觉反馈 Hook
 */
export function useHapticFeedback() {
  const vibrate = (pattern = 'light') => {
    if (!('vibrate' in navigator)) {
      console.warn('设备不支持震动');
      return;
    }

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      double: [10, 50, 10],
      success: [10, 30, 10],
      error: [50, 50, 50],
      warning: [20, 20, 20]
    };

    try {
      navigator.vibrate(patterns[pattern] || patterns.light);
    } catch (err) {
      console.warn('触觉反馈失败:', err);
    }
  };

  return {
    vibrate
  };
}

/**
 * 地理位置 Hook
 */
export function useGeolocation() {
  const loading = ref(false);
  const position = ref(null);
  const error = ref(null);

  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        error.value = '您的浏览器不支持地理位置';
        reject(new Error('Geolocation not supported'));
        return;
      }

      loading.value = true;
      error.value = null;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          position.value = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          };
          loading.value = false;
          resolve(position.value);
        },
        (err) => {
          error.value = err.message;
          loading.value = false;
          reject(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  return {
    loading,
    position,
    error,
    getCurrentPosition
  };
}

/**
 * 摄像头 Hook
 */
export function useCamera() {
  const loading = ref(false);
  const error = ref(null);

  const takePhoto = async () => {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';

      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          resolve(file);
        } else {
          reject(new Error('No photo taken'));
        }
      };

      input.onerror = () => {
        error.value = '打开摄像头失败';
        reject(new Error('Camera access failed'));
      };

      input.click();
    });
  };

  return {
    loading,
    error,
    takePhoto
  };
}
