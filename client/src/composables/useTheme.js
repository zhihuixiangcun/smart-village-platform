/**
 * 主题系统 - Theme System
 *
 * 支持多种主题模式：
 * - Light (浅色模式)
 * - Dark (深色模式)
 * - Auto (跟随系统)
 *
 * 使用方式：
 * import { useTheme } from '@/composables/useTheme';
 * const { theme, toggleTheme, setTheme } = useTheme();
 */

import { ref, watch, onMounted } from 'vue';

// ========== 主题类型 ==========
export const ThemeType = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
};

// ========== 主题配置 ==========
export const themes = {
  light: {
    name: '浅色模式',
    icon: 'Sunny',
    colors: {
      primary: '#667eea',
      secondary: '#764ba2',
      success: '#67c23a',
      warning: '#e6a23c',
      danger: '#f56c6c',
      info: '#909399',

      // 背景色
      bgPrimary: '#ffffff',
      bgSecondary: '#f5f7fa',
      bgTertiary: '#fafafa',
      bgOverlay: 'rgba(0, 0, 0, 0.5)',

      // 文字色
      textPrimary: '#303133',
      textSecondary: '#606266',
      textTertiary: '#909399',
      textDisabled: '#c0c4cc',

      // 边框色
      borderPrimary: '#dcdfe6',
      borderSecondary: '#e4e7ed',
      borderTertiary: '#ebeef5',

      // 阴影
      shadowLight: '0 2px 12px rgba(0, 0, 0, 0.08)',
      shadowMedium: '0 4px 16px rgba(0, 0, 0, 0.12)',
      shadowHeavy: '0 8px 24px rgba(0, 0, 0, 0.16)',
    },
  },

  dark: {
    name: '深色模式',
    icon: 'Moon',
    colors: {
      primary: '#667eea',
      secondary: '#764ba2',
      success: '#67c23a',
      warning: '#e6a23c',
      danger: '#f56c6c',
      info: '#909399',

      // 背景色
      bgPrimary: '#1a1a1a',
      bgSecondary: '#2c2c2c',
      bgTertiary: '#3a3a3a',
      bgOverlay: 'rgba(0, 0, 0, 0.7)',

      // 文字色
      textPrimary: '#e5e5e5',
      textSecondary: '#b8b8b8',
      textTertiary: '#8c8c8c',
      textDisabled: '#5c5c5c',

      // 边框色
      borderPrimary: '#3a3a3a',
      borderSecondary: '#4a4a4a',
      borderTertiary: '#5a5a5a',

      // 阴影
      shadowLight: '0 2px 12px rgba(0, 0, 0, 0.3)',
      shadowMedium: '0 4px 16px rgba(0, 0, 0, 0.4)',
      shadowHeavy: '0 8px 24px rgba(0, 0, 0, 0.5)',
    },
  },
};

// ========== 主题存储键 ==========
const THEME_STORAGE_KEY = 'smart-village-theme';

// ========== 主题 Composable ==========
export function useTheme() {
  // 当前主题
  const theme = ref(ThemeType.LIGHT);

  /**
   * 初始化主题
   */
  const initTheme = () => {
    // 从 localStorage 读取
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

    if (savedTheme && Object.values(ThemeType).includes(savedTheme)) {
      theme.value = savedTheme;
    } else {
      // 检测系统主题偏好
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme.value = prefersDark ? ThemeType.DARK : ThemeType.LIGHT;
    }

    // 应用主题
    applyTheme(theme.value);
  };

  /**
   * 应用主题
   */
  const applyTheme = (themeValue) => {
    const root = document.documentElement;

    if (themeValue === ThemeType.DARK) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }

    // 更新 Element Plus 主题变量
    updateElementPlusVariables(themeValue);
  };

  /**
   * 更新 Element Plus 主题变量
   */
  const updateElementPlusVariables = (themeValue) => {
    const colors = themes[themeValue]?.colors;
    if (!colors) return;

    const root = document.documentElement;

    // 设置 CSS 变量
    root.style.setProperty('--el-color-primary', colors.primary);
    root.style.setProperty('--el-color-success', colors.success);
    root.style.setProperty('--el-color-warning', colors.warning);
    root.style.setProperty('--el-color-danger', colors.danger);
    root.style.setProperty('--el-color-info', colors.info);

    // 背景色
    root.style.setProperty('--el-bg-color', colors.bgSecondary);
    root.style.setProperty('--el-bg-color-page', colors.bgPrimary);

    // 文字色
    root.style.setProperty('--el-text-color-primary', colors.textPrimary);
    root.style.setProperty('--el-text-color-regular', colors.textSecondary);

    // 边框色
    root.style.setProperty('--el-border-color', colors.borderPrimary);
    root.style.setProperty('--el-border-color-light', colors.borderSecondary);

    // 填充色（不同深浅）
    root.style.setProperty('--el-fill-color-light', colors.bgTertiary);
    root.style.setProperty('--el-fill-color-lighter', colors.bgSecondary);
    root.style.setProperty('--el-fill-color-extra-light', colors.bgPrimary);
  };

  /**
   * 切换主题
   */
  const toggleTheme = () => {
    const newTheme = theme.value === ThemeType.LIGHT ? ThemeType.DARK : ThemeType.LIGHT;
    setTheme(newTheme);
  };

  /**
   * 设置主题
   */
  const setTheme = (themeValue) => {
    theme.value = themeValue;
    localStorage.setItem(THEME_STORAGE_KEY, themeValue);
    applyTheme(themeValue);
  };

  /**
   * 获取当前主题配置
   */
  const getCurrentThemeConfig = () => {
    return themes[theme.value] || themes.light;
  };

  /**
   * 获取主题颜色
   */
  const getThemeColor = (colorName) => {
    const config = getCurrentThemeConfig();
    return config.colors[colorName];
  };

  // 监听主题变化
  watch(theme, (newTheme) => {
    applyTheme(newTheme);
  });

  return {
    theme,
    themes,
    toggleTheme,
    setTheme,
    getCurrentThemeConfig,
    getThemeColor,
    initTheme,
  };
}

// ========== 主题 CSS 变量生成 ==========
export function generateThemeCSS() {
  let css = ':root {\n';

  // 生成浅色主题变量
  Object.entries(themes.light.colors).forEach(([key, value]) => {
    css += `  --color-${key}: ${value};\n`;
  });

  css += '}\n\n';

  // 生成深色主题变量
  css += '[data-theme="dark"] {\n';
  Object.entries(themes.dark.colors).forEach(([key, value]) => {
    css += `  --color-${key}: ${value};\n`;
  });
  css += '}';

  return css;
}

// ========== 主题混合 ==========
export function useThemeWithAuto() {
  const { theme, toggleTheme, setTheme, initTheme, ...rest } = useTheme();

  // 监听系统主题变化
  const watchSystemTheme = () => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e) => {
      if (theme.value === ThemeType.AUTO) {
        const systemTheme = e.matches ? ThemeType.DARK : ThemeType.LIGHT;
        applyTheme(systemTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  };

  return {
    theme,
    toggleTheme,
    setTheme,
    initTheme,
    watchSystemTheme,
    ...rest,
  };
}

// ========== 导出 ==========
export default useTheme;

// ========== 自动初始化 ==========
export function setupTheme() {
  const { initTheme } = useTheme();
  onMounted(() => {
    initTheme();
  });
}
