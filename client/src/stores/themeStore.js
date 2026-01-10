import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useThemeStore = defineStore('theme', () => {
  const isDarkMode = ref(false);
  const isLargeFontMode = ref(false);
  const fontSize = ref(14);

  const theme = computed(() => (isDarkMode.value ? 'dark' : 'light'));

  const toggleDarkMode = () => {
    isDarkMode.value = !isDarkMode.value;
    document.documentElement.setAttribute('data-theme', theme.value);
    localStorage.setItem('theme', theme.value);
  };

  const toggleLargeFontMode = () => {
    isLargeFontMode.value = !isLargeFontMode.value;
    document.documentElement.style.fontSize = isLargeFontMode.value ? '18px' : '14px';
    localStorage.setItem('largeFontMode', isLargeFontMode.value);
  };

  const setFontSize = size => {
    fontSize.value = size;
    document.documentElement.style.fontSize = `${size}px`;
    localStorage.setItem('fontSize', size);
  };

  const initTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      isDarkMode.value = savedTheme === 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    const savedLargeFont = localStorage.getItem('largeFontMode');
    if (savedLargeFont === 'true') {
      isLargeFontMode.value = true;
      document.documentElement.style.fontSize = '18px';
    }
  };

  return {
    isDarkMode,
    isLargeFontMode,
    fontSize,
    theme,
    toggleDarkMode,
    toggleLargeFontMode,
    setFontSize,
    initTheme,
  };
});
