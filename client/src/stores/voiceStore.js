import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useVoiceStore = defineStore('voice', () => {
  const isListening = ref(false);
  const currentDialect = ref('zh-CN');
  const isLargeFontMode = ref(false);

  const settings = ref({
    speechRate: 1.0,
    pitch: 1.0,
    volume: 0.8,
    autoPlay: true,
    offlineMode: false,
  });

  const setDialect = dialect => {
    currentDialect.value = dialect;
  };

  const updateSettings = newSettings => {
    settings.value = { ...settings.value, ...newSettings };
  };

  const toggleLargeFontMode = () => {
    isLargeFontMode.value = !isLargeFontMode.value;
  };

  return {
    isListening,
    currentDialect,
    isLargeFontMode,
    settings,
    setDialect,
    updateSettings,
    toggleLargeFontMode,
  };
});
