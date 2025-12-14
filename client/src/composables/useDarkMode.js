import { ref, computed, watch, nextTick } from 'vue'

/**
 * 深色模式组合函数
 */
export function useDarkMode() {
  // 当前主题状态
  const isDark = ref(false)
  const systemPrefersDark = ref(false)
  const followSystem = ref(true)

  // 主题配置
  const themeConfig = {
    // 主题标识
    themes: {
      light: 'light',
      dark: 'dark',
      auto: 'auto'
    },

    // CSS变量映射
    cssVariables: {
      light: {
        '--primary-color': '#409eff',
        '--primary-light': '#53a8ff',
        '--primary-dark': '#337ecc',

        '--success-color': '#67c23a',
        '--warning-color': '#e6a23c',
        '--danger-color': '#f56c6c',
        '--info-color': '#909399',

        '--text-color-primary': '#303133',
        '--text-color-regular': '#606266',
        '--text-color-secondary': '#909399',
        '--text-color-placeholder': '#c0c4cc',

        '--bg-color': '#ffffff',
        '--bg-color-page': '#f2f3f5',
        '--bg-color-overlay': '#ffffff',

        '--border-color': '#dcdfe6',
        '--border-color-light': '#e4e7ed',
        '--border-color-lighter': '#ebeef5',
        '--border-color-extra-light': '#f2f6fc',

        '--fill-color': '#f0f2f5',
        '--fill-color-light': '#f5f7fa',
        '--fill-color-lighter': '#fafafa',
        '--fill-color-extra-light': '#fafcff',

        '--box-shadow': '0 2px 4px rgba(0, 0, 0, 0.12), 0 0 6px rgba(0, 0, 0, 0.04)',
        '--box-shadow-light': '0 2px 12px 0 rgba(0, 0, 0, 0.1)',
        '--box-shadow-dark': '0 2px 4px rgba(0, 0, 0, 0.12), 0 0 6px rgba(0, 0, 0, 0.12)'
      },

      dark: {
        '--primary-color': '#409eff',
        '--primary-light': '#53a8ff',
        '--primary-dark': '#337ecc',

        '--success-color': '#67c23a',
        '--warning-color': '#e6a23c',
        '--danger-color': '#f56c6c',
        '--info-color': '#909399',

        '--text-color-primary': '#e5eaf3',
        '--text-color-regular': '#cfd3dc',
        '--text-color-secondary': '#a3a6ad',
        '--text-color-placeholder': '#8d9095',

        '--bg-color': '#141414',
        '--bg-color-page': '#0a0a0a',
        '--bg-color-overlay': '#1d1e1f',

        '--border-color': '#4c4d4f',
        '--border-color-light': '#414243',
        '--border-color-lighter': '#363637',
        '--border-color-extra-light': '#2b2b2c',

        '--fill-color': '#303030',
        '--fill-color-light': '#262727',
        '--fill-color-lighter': '#1d1d1d',
        '--fill-color-extra-light': '#191919',

        '--box-shadow': '0 2px 4px rgba(0, 0, 0, 0.48), 0 0 6px rgba(0, 0, 0, 0.16)',
        '--box-shadow-light': '0 2px 12px 0 rgba(0, 0, 0, 0.4)',
        '--box-shadow-dark': '0 2px 4px rgba(0, 0, 0, 0.48), 0 0 6px rgba(0, 0, 0, 0.48)'
      }
    },

    // 特殊元素选择器配置
    selectors: {
      html: 'html',
      body: 'body',
      elComponents: [
        '.el-button',
        '.el-card',
        '.el-table',
        '.el-form-item',
        '.el-input',
        '.el-select',
        '.el-dialog',
        '.el-message',
        '.el-notification'
      ]
    },

    // 存储键名
    storageKey: 'village-theme-preference',

    // 过渡动画配置
    transition: {
      duration: '0.3s',
      easing: 'ease-in-out'
    }
  }

  // 检测系统主题偏好
  const detectSystemTheme = () => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      systemPrefersDark.value = mediaQuery.matches

      // 监听系统主题变化
      mediaQuery.addEventListener('change', (e) => {
        systemPrefersDark.value = e.matches
        if (followSystem.value) {
          applyTheme(e.matches ? 'dark' : 'light')
        }
      })
    }
  }

  // 应用主题
  const applyTheme = (theme) => {
    if (typeof document === 'undefined') return

    const targetTheme = theme === 'auto'
      ? (systemPrefersDark.value ? 'dark' : 'light')
      : theme

    isDark.value = targetTheme === 'dark'

    // 应用CSS变量
    const variables = themeConfig.cssVariables[targetTheme]
    const root = document.documentElement

    // 添加过渡效果
    root.style.transition = `all ${themeConfig.transition.duration} ${themeConfig.transition.easing}`

    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })

    // 更新HTML类名
    document.documentElement.classList.remove('light-theme', 'dark-theme')
    document.documentElement.classList.add(`${targetTheme}-theme`)

    // 更新data-theme属性
    document.documentElement.setAttribute('data-theme', targetTheme)

    // 更新Element Plus的主题类
    updateElementPlusTheme(targetTheme)

    // 移除过渡效果
    setTimeout(() => {
      root.style.transition = ''
    }, parseFloat(themeConfig.transition.duration) * 1000)
  }

  // 更新Element Plus组件主题
  const updateElementPlusTheme = (theme) => {
    const body = document.body

    if (theme === 'dark') {
      body.classList.add('dark')
      body.setAttribute('data-theme', 'dark')
    } else {
      body.classList.remove('dark')
      body.setAttribute('data-theme', 'light')
    }

    // 处理已存在的Element Plus组件
    nextTick(() => {
      const components = document.querySelectorAll(themeConfig.selectors.elComponents.join(', '))
      components.forEach(component => {
        if (theme === 'dark') {
          component.classList.add('dark-theme')
        } else {
          component.classList.remove('dark-theme')
        }
      })
    })
  }

  // 切换主题
  const toggleTheme = () => {
    const newTheme = isDark.value ? 'light' : 'dark'
    setTheme(newTheme)
  }

  // 设置主题
  const setTheme = (theme) => {
    followSystem.value = theme === 'auto'
    applyTheme(theme)
    saveThemePreference(theme)
  }

  // 保存主题偏好
  const saveThemePreference = (theme) => {
    try {
      localStorage.setItem(themeConfig.storageKey, theme)
    } catch (error) {
      console.warn('Failed to save theme preference:', error)
    }
  }

  // 加载主题偏好
  const loadThemePreference = () => {
    try {
      const saved = localStorage.getItem(themeConfig.storageKey)
      return saved || 'auto'
    } catch (error) {
      console.warn('Failed to load theme preference:', error)
      return 'auto'
    }
  }

  // 获取当前主题状态
  const getCurrentTheme = () => {
    if (followSystem.value) {
      return 'auto'
    }
    return isDark.value ? 'dark' : 'light'
  }

  // 获取主题颜色
  const getThemeColors = (theme = getCurrentTheme()) => {
    const targetTheme = theme === 'auto'
      ? (systemPrefersDark.value ? 'dark' : 'light')
      : theme

    return themeConfig.cssVariables[targetTheme]
  }

  // 为特定元素应用主题
  const applyThemeToElement = (element, theme = getCurrentTheme()) => {
    if (!element) return

    const targetTheme = theme === 'auto'
      ? (systemPrefersDark.value ? 'dark' : 'light')
      : theme

    const variables = themeConfig.cssVariables[targetTheme]

    Object.entries(variables).forEach(([key, value]) => {
      element.style.setProperty(key, value)
    })

    element.classList.remove('light-theme', 'dark-theme')
    element.classList.add(`${targetTheme}-theme`)
  }

  // 监听主题变化
  const onThemeChange = (callback) => {
    return watch(isDark, callback, { immediate: true })
  }

  // 生成主题相关的CSS类
  const getThemeClass = (baseClass = '') => {
    const themeClass = isDark.value ? 'dark' : 'light'
    return baseClass ? `${baseClass} ${baseClass}--${themeClass}` : themeClass
  }

  // 获取主题相关的样式对象
  const getThemeStyle = (lightStyle = {}, darkStyle = {}) => {
    return isDark.value ? darkStyle : lightStyle
  }

  // 检查是否支持深色模式
  const isDarkModeSupported = () => {
    return typeof window !== 'undefined' &&
           window.matchMedia &&
           window.matchMedia('(prefers-color-scheme: dark)').media !== 'not all'
  }

  // 计算属性
  const themeIcon = computed(() => isDark.value ? '🌙' : '☀️')
  const themeText = computed(() => isDark.value ? '深色模式' : '浅色模式')
  const themeToggleText = computed(() => isDark.value ? '切换到浅色模式' : '切换到深色模式')

  // 初始化
  const initTheme = () => {
    detectSystemTheme()
    const savedTheme = loadThemePreference()
    setTheme(savedTheme)
  }

  // 添加主题相关的元标签
  const addThemeMetaTags = () => {
    if (typeof document === 'undefined') return

    // 主题颜色元标签
    let themeColorMeta = document.querySelector('meta[name="theme-color"]')
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta')
      themeColorMeta.setAttribute('name', 'theme-color')
      document.head.appendChild(themeColorMeta)
    }

    const themeColor = isDark.value ? '#141414' : '#ffffff'
    themeColorMeta.setAttribute('content', themeColor)

    // 状态栏样式（移动端）
    let statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    if (!statusBarMeta) {
      statusBarMeta = document.createElement('meta')
      statusBarMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style')
      document.head.appendChild(statusBarMeta)
    }

    const statusBarStyle = isDark.value ? 'black-translucent' : 'default'
    statusBarMeta.setAttribute('content', statusBarStyle)
  }

  // 监听主题变化，更新元标签
  watch(isDark, () => {
    addThemeMetaTags()
  })

  return {
    // 状态
    isDark,
    systemPrefersDark,
    followSystem,
    themeIcon,
    themeText,
    themeToggleText,

    // 方法
    toggleTheme,
    setTheme,
    getCurrentTheme,
    getThemeColors,
    applyThemeToElement,
    getThemeClass,
    getThemeStyle,
    onThemeChange,
    isDarkModeSupported,
    initTheme,

    // 配置
    themeConfig
  }
}