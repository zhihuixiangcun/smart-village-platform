/**
 * 自定义字体大小 Composable
 * 支持多级字体大小调节，适应不同人群需求
 */
import { ref, computed, watch } from 'vue'
import type { FontSizeConfig } from '@/types/resident'

export type FontSizeLevel = 'small' | 'normal' | 'large' | 'extra-large' | 'huge'

const FONT_SIZE_SCALE: Record<FontSizeLevel, number> = {
  'small': 0.85,      // 小字模式 - 适合视力好的年轻用户
  'normal': 1.0,      // 正常模式 - 默认
  'large': 1.25,      // 大字模式 - 适合一般老年人
  'extra-large': 1.5,  // 超大模式 - 适合视力较差的老年人
  'huge': 1.75        // 巨大模式 - 适合视力严重受损者
}

/**
 * 从 localStorage 安全读取配置
 */
const loadSavedConfig = (): FontSizeConfig => {
  try {
    const saved = localStorage.getItem('fontSizeConfig')
    if (saved) {
      const parsed = JSON.parse(saved)
      // 验证数据结构
      if (
        parsed &&
        typeof parsed.level === 'string' &&
        typeof parsed.customScale === 'number' &&
        ['small', 'normal', 'large', 'extra-large', 'huge'].includes(parsed.level)
      ) {
        return parsed
      }
    }
  } catch (error) {
    console.warn('Failed to load font size config from localStorage:', error)
    // 清除损坏的数据
    try {
      localStorage.removeItem('fontSizeConfig')
    } catch (e) {
      console.warn('Failed to remove invalid config:', e)
    }
  }
  return { level: 'normal', customScale: 1.0 }
}

export function useFontSize() {
  // 从 localStorage 安全读取设置
  const config = ref<FontSizeConfig>(loadSavedConfig())
  const isCustomMode = ref(false)

  /**
   * 当前字体缩放比例
   */
  const currentScale = computed(() => {
    if (isCustomMode.value) {
      return config.value.customScale
    }
    return FONT_SIZE_SCALE[config.value.level]
  })

  /**
   * 设置字体大小级别
   */
  const setFontSizeLevel = (level: FontSizeLevel) => {
    config.value.level = level
    isCustomMode.value = false
    saveConfig()
    applyFontSize()
  }

  /**
   * 设置自定义缩放比例
   */
  const setCustomScale = (scale: number) => {
    const clampedScale = Math.min(Math.max(scale, 0.8), 2.0)
    config.value.customScale = clampedScale
    isCustomMode.value = true
    saveConfig()
    applyFontSize()
  }

  /**
   * 增大字体
   */
  const increaseFontSize = () => {
    if (isCustomMode.value) {
      setCustomScale(config.value.customScale + 0.1)
    } else {
      const levels: FontSizeLevel[] = ['small', 'normal', 'large', 'extra-large', 'huge']
      const currentIndex = levels.indexOf(config.value.level)
      if (currentIndex < levels.length - 1) {
        setFontSizeLevel(levels[currentIndex + 1])
      }
    }
  }

  /**
   * 减小字体
   */
  const decreaseFontSize = () => {
    if (isCustomMode.value) {
      setCustomScale(config.value.customScale - 0.1)
    } else {
      const levels: FontSizeLevel[] = ['small', 'normal', 'large', 'extra-large', 'huge']
      const currentIndex = levels.indexOf(config.value.level)
      if (currentIndex > 0) {
        setFontSizeLevel(levels[currentIndex - 1])
      }
    }
  }

  /**
   * 重置为默认
   */
  const resetFontSize = () => {
    config.value = { level: 'normal', customScale: 1.0 }
    isCustomMode.value = false
    saveConfig()
    applyFontSize()
  }

  /**
   * 保存配置到 localStorage（带错误处理）
   */
  const saveConfig = () => {
    try {
      localStorage.setItem('fontSizeConfig', JSON.stringify(config.value))
    } catch (error) {
      console.error('Failed to save font size config to localStorage:', error)
      // 在无痕模式或存储已满时，降级到 sessionStorage
      try {
        sessionStorage.setItem('fontSizeConfig', JSON.stringify(config.value))
      } catch (sessionError) {
        console.error('Failed to save config to sessionStorage:', sessionError)
      }
    }
  }

  /**
   * 应用字体大小到 document
   */
  const applyFontSize = () => {
    const root = document.documentElement
    const scale = currentScale.value

    // 设置 CSS 变量
    root.style.setProperty('--font-scale', scale.toString())

    // 添加或移除大字模式 class
    if (scale > 1.0) {
      root.classList.add('large-text-mode')
      root.classList.remove('small-text-mode')
    } else if (scale < 1.0) {
      root.classList.add('small-text-mode')
      root.classList.remove('large-text-mode')
    } else {
      root.classList.remove('large-text-mode', 'small-text-mode')
    }

    // 设置详细的字体大小变量
    root.style.setProperty('--font-size-base', `${16 * scale}px`)
    root.style.setProperty('--font-size-h1', `${24 * scale}px`)
    root.style.setProperty('--font-size-h2', `${20 * scale}px`)
    root.style.setProperty('--font-size-h3', `${18 * scale}px`)
    root.style.setProperty('--font-size-small', `${14 * scale}px`)
    root.style.setProperty('--font-size-mini', `${12 * scale}px`)
  }

  /**
   * 获取字体大小级别的显示名称
   */
  const getLevelLabel = (level: FontSizeLevel): string => {
    const labels: Record<FontSizeLevel, string> = {
      'small': '小字',
      'normal': '正常',
      'large': '大字',
      'extra-large': '超大',
      'huge': '巨大'
    }
    return labels[level]
  }

  /**
   * 获取当前级别标签
   */
  const currentLevelLabel = computed(() => {
    if (isCustomMode.value) {
      return `自定义 ${Math.round(config.value.customScale * 100)}%`
    }
    return getLevelLabel(config.value.level)
  })

  // 监听配置变化
  watch(config, () => {
    applyFontSize()
  }, { deep: true })

  return {
    config,
    isCustomMode,
    currentScale,
    currentLevelLabel,
    setFontSizeLevel,
    setCustomScale,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize
  }
}
