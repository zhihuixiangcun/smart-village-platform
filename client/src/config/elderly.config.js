/**
 * 适老化配置文件 - Elderly Mode Configuration
 *
 * 配置项：
 * - 字体大小级别
 * - 颜色配置
 * - 布局配置
 * - 交互配置
 */

export default {
  // 字体配置
  typography: {
    // 字体大小级别
    sizes: {
      standard: {
        name: '标准',
        base: 16,
        scale: 1,
        lineHeight: 1.5
      },
      large: {
        name: '大字',
        base: 20,
        scale: 1.25,
        lineHeight: 1.6
      },
      extraLarge: {
        name: '特大',
        base: 24,
        scale: 1.5,
        lineHeight: 1.7
      }
    },

    // 字体系列
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      serif: 'Georgia, "Times New Roman", Times, serif',
      mono: 'Monaco, "Courier New", monospace'
    },

    // 字重
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },

  // 颜色配置
  colors: {
    // 标准模式
    standard: {
      primary: '#409eff',
      success: '#67c23a',
      warning: '#e6a23c',
      danger: '#f56c6c',
      info: '#909399',

      text: {
        primary: '#303133',
        regular: '#606266',
        secondary: '#909399',
        placeholder: '#c0c4cc'
      },

      background: {
        base: '#f5f7fa',
        page: '#ffffff'
      },

      border: '#dcdfe6'
    },

    // 高对比度模式
    highContrast: {
      primary: '#000080',
      success: '#006400',
      warning: '#8B4500',
      danger: '#8B0000',
      info: '#000000',

      text: {
        primary: '#000000',
        regular: '#000000',
        secondary: '#333333',
        placeholder: '#666666'
      },

      background: {
        base: '#ffffff',
        page: '#ffffff'
      },

      border: '#000000'
    }
  },

  // 布局配置
  layout: {
    // 间距
    spacing: {
      xs: 8,
      sm: 12,
      md: 16,
      lg: 20,
      xl: 24,
      xxl: 32
    },

    // 触控区域最小尺寸
    touchTarget: {
      minSize: 44,
      recommended: 48
    },

    // 按钮尺寸
    button: {
      small: {
        height: 40,
        padding: '10px 20px',
        fontSize: 14
      },
      medium: {
        height: 48,
        padding: '12px 24px',
        fontSize: 16
      },
      large: {
        height: 56,
        padding: '16px 32px',
        fontSize: 18
      },
      xlarge: {
        height: 64,
        padding: '20px 40px',
        fontSize: 20
      }
    },

    // 输入框尺寸
    input: {
      small: {
        height: 40,
        fontSize: 14,
        padding: '0 12px'
      },
      medium: {
        height: 48,
        fontSize: 16,
        padding: '0 16px'
      },
      large: {
        height: 56,
        fontSize: 18,
        padding: '0 20px'
      },
      xlarge: {
        height: 64,
        fontSize: 20,
        padding: '0 24px'
      }
    }
  },

  // 动画配置
  animation: {
    // 是否启用动画
    enabled: true,

    // 动画时长
    duration: {
      fast: 200,
      normal: 300,
      slow: 500
    },

    // 是否启用过渡动画
    transitions: true,

    // 是否启用微动画
    microAnimations: true
  },

  // 交互配置
  interaction: {
    // 震动反馈
    vibrate: {
      enabled: true,
      duration: 50,
      patterns: {
        tap: [50],
        success: [100, 50, 100],
        error: [200, 100, 200],
        warning: [100]
      }
    },

    // 语音提示
    speech: {
      enabled: false,
      rate: 0.9,
      pitch: 1,
      volume: 1
    },

    // 读屏功能
    screenReader: {
      enabled: false,
      autoRead: false,
      readDelay: 500
    }
  },

  // 简化模式配置
  simplified: {
    // 隐藏非核心功能
    hideSecondary: true,

    // 简化导航
    simpleNav: true,

    // 大图标模式
    largeIcons: true,

    // 减少动画
    reduceMotion: false
  },

  // 无障碍配置
  accessibility: {
    // ARIA标签
    ariaLabels: true,

    // 焦点指示器
    focusIndicator: true,

    // 键盘导航
    keyboardNav: true,

    // 高对比度
    highContrast: false
  },

  // 存储配置
  storage: {
    key: 'elderly_mode_config',
    keys: {
      enabled: 'elderly_mode_enabled',
      fontSize: 'elderly_font_size',
      highContrast: 'high_contrast_mode',
      screenReader: 'screen_reader_enabled',
      simplifiedMode: 'simplified_mode'
    }
  },

  // 响应式断点
  breakpoints: {
    mobile: '768px',
    tablet: '1024px',
    desktop: '1280px'
  }
};

// 导出预设配置
export const presets = {
  // 适老化预设
  elderly: {
    fontSize: 'large',
    highContrast: false,
    screenReader: false,
    simplifiedMode: true,
    vibrate: true,
    speech: false
  },

  // 视障辅助预设
  visionImpaired: {
    fontSize: 'extraLarge',
    highContrast: true,
    screenReader: true,
    simplifiedMode: true,
    vibrate: true,
    speech: true
  },

  // 极简模式预设
  minimal: {
    fontSize: 'standard',
    highContrast: false,
    screenReader: false,
    simplifiedMode: true,
    vibrate: false,
    speech: false
  }
};
