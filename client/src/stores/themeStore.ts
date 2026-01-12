import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

interface ThemeColors {
  background: string;
  surface: string;
  surfaceVariant: string;
  primary: string;
  secondary: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  border: string;
  divider: string;
  inputBackground: string;
  inputBorder: string;
}

interface ThemeSizes {
  xs: string;
  sm: string;
  base: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
}

export interface ThemeConfig {
  isDark: boolean;
  fontSize: 'normal' | 'large';
  sidebarCollapsed: boolean;
}

export const useThemeStore = defineStore('theme', () => {
  // 主题状态
  isDark: ref(false),
  primaryColor: ref('#2196F3'),
  secondaryColor: ref('#4CAF50'),
  fontSize: ref<'normal' | 'large'>('normal'),
  sidebarCollapsed: ref(false),
  
  // 主题颜色配置
  colors: {
    light: {
      background: '#FFFFFF',
      surface: '#F8FAFC',
      surfaceVariant: '#F1F5F9',
      primary: '#2196F3',
      secondary: '#4CAF50',
      textPrimary: '#0F172A',
      textSecondary: '#475569',
      textDisabled: '#94A3B8',
      border: '#E2E8F0',
      divider: '#E2E8F0',
      inputBackground: '#FFFFFF',
      inputBorder: '#CBD5E1',
    },
    dark: {
      background: '#0F172A',
      surface: '#1E293B',
      surfaceVariant: '#334155',
      primary: '#3B82F6',
      secondary: '#10B981',
      textPrimary: '#F8FAFC',
      textSecondary: '#CBD5E1',
      textDisabled: '#64748B',
      border: '#334155',
      divider: '#1E293B',
      inputBackground: '#1E293B',
      inputBorder: '#334155',
    },
  },
  
  // 字体大小配置
  fontSizes: {
    normal: {
      xs: '12px',
      sm: '13px',
      base: '14px',
      lg: '15px',
      xl: '16px',
      '2xl': '18px',
      '3xl': '20px',
    },
    large: {
      xs: '14px',
      sm: '16px',
      base: '18px',
      lg: '20px',
      xl: '22px',
      '2xl': '24px',
      '3xl': '28px',
    },
  },
  
  // 获取当前主题颜色
  get color(): ThemeColors {
    return this.isDark ? this.colors.dark : this.colors.light;
  },
  
  // 获取当前字体大小
  get fontSize(): string {
    return this.fontSizes[this.fontSize].base;
  },
  
  // 切换深色模式
  toggleDark(): void {
    this.isDark = !this.isDark;
    this.saveTheme();
    this.applyTheme();
  },
  
  // 切换字体大小
  toggleFontSize(): void {
    const sizes = ['normal', 'large'];
    const currentIndex = sizes.indexOf(this.fontSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    this.fontSize = sizes[nextIndex];
    this.saveTheme();
    this.applyTheme();
  },
  
  // 切换侧边栏
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.saveTheme();
  },
  
  // 更改主色调
  setPrimaryColor(color: string): void {
    this.primaryColor = color;
    this.saveTheme();
    this.applyTheme();
  },
  
  // 更改辅助色
  setSecondaryColor(color: string): void {
    this.secondaryColor = color;
    this.saveTheme();
    this.applyTheme();
  },
  
  // 应用主题到DOM
  applyTheme(): void {
    const root = document.documentElement;
    const color = this.color;
    const fontSize = this.fontSize;
    
    // 设置深色模式class
    if (this.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // 设置CSS变量
    root.style.setProperty('--el-bg-color', color.background);
    root.style.setProperty('--el-bg-color-overlay', color.surface);
    root.style.setProperty('--el-text-color-primary', color.textPrimary);
    root.style.setProperty('--el-text-color-regular', color.textSecondary);
    root.style.setProperty('--el-text-color-secondary', color.textDisabled);
    root.style.setProperty('--el-border-color', color.border);
    root.style.setProperty('--el-divider-color', color.divider);
    root.style.setProperty('--el-fill-color', color.surface);
    root.style.setProperty('--el-box-shadow', '0 1px 2px rgba(0, 0, 0, 0.05)');
    
    // 设置字体大小CSS变量
    const fontSizes = this.fontSizes[this.fontSize];
    root.style.setProperty('--el-font-size-base', fontSizes.base);
    root.style.setProperty('--el-font-size-small', fontSizes.sm);
    root.style.setProperty('--el-font-size-extra-large', fontSizes['3xl']);
    
    // 设置主色CSS变量
    root.style.setProperty('--el-color-primary', this.primaryColor);
    root.style.setProperty('--el-color-primary-light-3', this.adjustColor(this.primaryColor, 0.4));
    root.style.setProperty('--el-color-primary-light-5', this.adjustColor(this.primaryColor, 0.6));
    root.style.setProperty('--el-color-primary-light-7', this.adjustColor(this(this.primaryColor, 0.8));
    root.style.setProperty('--el-color-primary-light-9', this.adjustColor(this.primaryColor, 0.95));
    root.style.setProperty('--el-color-dark-2', this.adjustColor(this.primaryColor, -0.18));
    
    // 设置辅助色CSS变量
    root.style.setProperty('--el-color-success', this.secondaryColor);
    root.style.setProperty('--el-color-success-light-3', this.adjustColor(this.secondaryColor, 0.4));
    root.style.setProperty('--el-color-success-light-5', this.adjustColor(this.secondaryColor, 0.6));
    root.style.setProperty('--el-color-warning', '#FF9800');
    root.style.setProperty('--el-color-danger', '#F44336');
    root.style.setProperty('--el-color-info', '#2196F3');
  },
  
  // 调整颜色亮度
  adjustColor(hex: string, amount: number): string {
    const color = hex.replace('#', '');
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    return '#' + [
      this.adjustChannel(r, amount),
      this.adjustChannel(g, amount),
      this.adjustChannel(b, amount),
    ].join('');
  },
  
  // 调整颜色通道
  adjustChannel(color: number, amount: number): number {
    return Math.min(255, Math.max(0, Math.round(color + amount * 255)));
  },
  
  // 从本地存储加载主题
  loadTheme(): void {
    try {
      const savedTheme = localStorage.getItem('smart-village-theme');
      if (savedTheme) {
        const theme = JSON.parse(savedTheme);
        this.isDark = theme.isDark ?? false;
        this.fontSize = theme.fontSize ?? 'normal';
        this.sidebarCollapsed = theme.sidebarCollapsed ?? false;
        if (theme.primaryColor) this.primaryColor = theme.primaryColor;
        if (theme.secondaryColor) this.secondaryColor = theme.secondaryColor;
      }
    } catch (error) {
      console.error('加载主题失败:', error);
    }
  },
  
  // 保存主题到本地存储
  saveTheme(): void {
    const theme = {
      isDark: this.isDark,
      fontSize: this.fontSize,
      sidebarCollapsed: this.sidebarCollapsed,
      primaryColor: this.primaryColor,
      secondaryColor: this.secondaryColor,
    };
    localStorage.setItem('smart-village-theme', JSON.stringify(theme));
  },
  
  // 监听主题变化
  watch(isDark, () => {
    this.applyTheme();
    this.saveTheme();
  }),
  
  watch(fontSize, () => {
    this.applyTheme();
    this.saveTheme();
  }),
  
  watch(sidebarCollapsed, () => {
    this.saveTheme();
  }),
  
  watch(primaryColor, () => {
    this.applyTheme();
    this.saveTheme();
  }),
  
  watch(secondaryColor, () => {
    this.applyTheme();
    this.saveTheme();
  }),
});

export default useThemeStore;
