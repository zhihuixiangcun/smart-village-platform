import { ref, computed, nextTick } from 'vue'

/**
 * 微交互动画组合函数
 */
export function useMicroAnimations() {
  // 动画状态管理
  const animationStates = ref(new Map())
  const globalAnimationEnabled = ref(true)

  // 动画配置
  const animationConfig = {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500
    },
    easing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    },
    delay: {
      none: 0,
      short: 50,
      medium: 100,
      long: 200
    }
  }

  // 预定义动画效果
  const animations = {
    // 按钮点击反馈
    buttonClick: {
      keyframes: [
        { transform: 'scale(1)', offset: 0 },
        { transform: 'scale(0.95)', offset: 0.5 },
        { transform: 'scale(1)', offset: 1 }
      ],
      options: {
        duration: animationConfig.duration.fast,
        easing: animationConfig.easing.easeOut
      }
    },

    // 按钮悬停效果
    buttonHover: {
      keyframes: [
        { transform: 'translateY(0px)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', offset: 0 },
        { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', offset: 1 }
      ],
      options: {
        duration: animationConfig.duration.normal,
        easing: animationConfig.easing.easeOut,
        fill: 'forwards'
      }
    },

    // 卡片悬停提升
    cardHover: {
      keyframes: [
        { transform: 'translateY(0px) scale(1)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', offset: 0 },
        { transform: 'translateY(-4px) scale(1.02)', boxShadow: '0 8px 25px rgba(0,0,0,0.15)', offset: 1 }
      ],
      options: {
        duration: animationConfig.duration.normal,
        easing: animationConfig.easing.smooth,
        fill: 'forwards'
      }
    },

    // 输入框聚焦
    inputFocus: {
      keyframes: [
        { borderColor: '#dcdfe6', boxShadow: 'none', offset: 0 },
        { borderColor: '#409eff', boxShadow: '0 0 0 2px rgba(64, 158, 255, 0.2)', offset: 1 }
      ],
      options: {
        duration: animationConfig.duration.normal,
        easing: animationConfig.easing.easeOut,
        fill: 'forwards'
      }
    },

    // 表格行高亮
    tableRowHighlight: {
      keyframes: [
        { backgroundColor: 'transparent', offset: 0 },
        { backgroundColor: '#f0f8ff', offset: 0.5 },
        { backgroundColor: 'transparent', offset: 1 }
      ],
      options: {
        duration: animationConfig.duration.slow,
        easing: animationConfig.easing.ease
      }
    },

    // 数字计数动画
    numberCount: {
      keyframes: [
        { transform: 'scale(1)', offset: 0 },
        { transform: 'scale(1.1)', offset: 0.5 },
        { transform: 'scale(1)', offset: 1 }
      ],
      options: {
        duration: animationConfig.duration.normal,
        easing: animationConfig.easing.bounce
      }
    },

    // 加载脉冲
    loadingPulse: {
      keyframes: [
        { opacity: 0.4, transform: 'scale(1)', offset: 0 },
        { opacity: 1, transform: 'scale(1.05)', offset: 0.5 },
        { opacity: 0.4, transform: 'scale(1)', offset: 1 }
      ],
      options: {
        duration: animationConfig.duration.slow * 2,
        easing: animationConfig.easing.easeInOut,
        iterations: Infinity
      }
    },

    // 通知弹出
    notificationSlideIn: {
      keyframes: [
        { transform: 'translateX(100%)', opacity: 0, offset: 0 },
        { transform: 'translateX(0)', opacity: 1, offset: 1 }
      ],
      options: {
        duration: animationConfig.duration.normal,
        easing: animationConfig.easing.smooth,
        fill: 'forwards'
      }
    },

    // 成功指示器
    successIndicator: {
      keyframes: [
        { transform: 'scale(0) rotate(0deg)', opacity: 0, offset: 0 },
        { transform: 'scale(1.2) rotate(360deg)', opacity: 1, offset: 0.7 },
        { transform: 'scale(1) rotate(360deg)', opacity: 1, offset: 1 }
      ],
      options: {
        duration: animationConfig.duration.slow,
        easing: animationConfig.easing.bounce,
        fill: 'forwards'
      }
    },

    // 错误震动
    errorShake: {
      keyframes: [
        { transform: 'translateX(0)', offset: 0 },
        { transform: 'translateX(-10px)', offset: 0.1 },
        { transform: 'translateX(10px)', offset: 0.2 },
        { transform: 'translateX(-10px)', offset: 0.3 },
        { transform: 'translateX(10px)', offset: 0.4 },
        { transform: 'translateX(-5px)', offset: 0.5 },
        { transform: 'translateX(5px)', offset: 0.6 },
        { transform: 'translateX(-5px)', offset: 0.7 },
        { transform: 'translateX(5px)', offset: 0.8 },
        { transform: 'translateX(0)', offset: 1 }
      ],
      options: {
        duration: animationConfig.duration.slow,
        easing: animationConfig.easing.ease
      }
    },

    // 淡入效果
    fadeIn: {
      keyframes: [
        { opacity: 0, transform: 'translateY(20px)', offset: 0 },
        { opacity: 1, transform: 'translateY(0)', offset: 1 }
      ],
      options: {
        duration: animationConfig.duration.normal,
        easing: animationConfig.easing.easeOut,
        fill: 'forwards'
      }
    },

    // 淡出效果
    fadeOut: {
      keyframes: [
        { opacity: 1, transform: 'translateY(0)', offset: 0 },
        { opacity: 0, transform: 'translateY(-20px)', offset: 1 }
      ],
      options: {
        duration: animationConfig.duration.normal,
        easing: animationConfig.easing.easeIn,
        fill: 'forwards'
      }
    },

    // 滑入左侧
    slideInLeft: {
      keyframes: [
        { transform: 'translateX(-100%)', opacity: 0, offset: 0 },
        { transform: 'translateX(0)', opacity: 1, offset: 1 }
      ],
      options: {
        duration: animationConfig.duration.normal,
        easing: animationConfig.easing.smooth,
        fill: 'forwards'
      }
    },

    // 滑入右侧
    slideInRight: {
      keyframes: [
        { transform: 'translateX(100%)', opacity: 0, offset: 0 },
        { transform: 'translateX(0)', opacity: 1, offset: 1 }
      ],
      options: {
        duration: animationConfig.duration.normal,
        easing: animationConfig.easing.smooth,
        fill: 'forwards'
      }
    },

    // 旋转加载
    rotateLoading: {
      keyframes: [
        { transform: 'rotate(0deg)', offset: 0 },
        { transform: 'rotate(360deg)', offset: 1 }
      ],
      options: {
        duration: animationConfig.duration.slow * 2,
        easing: animationConfig.easing.ease,
        iterations: Infinity
      }
    }
  }

  // 执行动画
  const animate = async (element, animationName, options = {}) => {
    if (!globalAnimationEnabled.value || !element) {
      return Promise.resolve()
    }

    const animation = animations[animationName]
    if (!animation) {
      console.warn(`Animation '${animationName}' not found`)
      return Promise.resolve()
    }

    // 合并配置
    const animationOptions = {
      ...animation.options,
      ...options
    }

    try {
      // 创建动画
      const webAnimation = element.animate(animation.keyframes, animationOptions)

      // 存储动画状态
      const animationId = generateAnimationId()
      animationStates.value.set(animationId, {
        element,
        animation: webAnimation,
        name: animationName,
        startTime: Date.now()
      })

      // 等待动画完成
      await webAnimation.finished

      // 清理动画状态
      animationStates.value.delete(animationId)

      return webAnimation
    } catch (error) {
      console.error('Animation failed:', error)
      return Promise.resolve()
    }
  }

  // 链式动画
  const animateSequence = async (element, animationSequence, options = {}) => {
    if (!globalAnimationEnabled.value || !element || !Array.isArray(animationSequence)) {
      return Promise.resolve()
    }

    const { delay = 0 } = options

    for (let i = 0; i < animationSequence.length; i++) {
      const { name, options: animOptions = {}, delay: stepDelay = 0 } = animationSequence[i]

      if (i > 0 || delay > 0) {
        await new Promise(resolve => setTimeout(resolve, stepDelay || delay))
      }

      await animate(element, name, animOptions)
    }
  }

  // 并行动画
  const animateParallel = async (animations) => {
    if (!globalAnimationEnabled.value || !Array.isArray(animations)) {
      return Promise.resolve()
    }

    const animationPromises = animations.map(({ element, name, options = {} }) => {
      return animate(element, name, options)
    })

    return Promise.all(animationPromises)
  }

  // 简化的动画方法
  const buttonClick = (element) => animate(element, 'buttonClick')
  const buttonHover = (element) => animate(element, 'buttonHover')
  const buttonUnhover = (element) => {
    if (element) {
      element.style.transform = ''
      element.style.boxShadow = ''
    }
  }

  const cardHover = (element) => animate(element, 'cardHover')
  const cardUnhover = (element) => {
    if (element) {
      element.style.transform = ''
      element.style.boxShadow = ''
    }
  }

  const inputFocus = (element) => animate(element, 'inputFocus')
  const inputBlur = (element) => {
    if (element) {
      element.style.borderColor = ''
      element.style.boxShadow = ''
    }
  }

  const highlightTableRow = (element) => animate(element, 'tableRowHighlight')
  const countNumber = (element) => animate(element, 'numberCount')
  const showSuccess = (element) => animate(element, 'successIndicator')
  const shakeError = (element) => animate(element, 'errorShake')
  const fadeIn = (element, options) => animate(element, 'fadeIn', options)
  const fadeOut = (element, options) => animate(element, 'fadeOut', options)
  const slideInLeft = (element, options) => animate(element, 'slideInLeft', options)
  const slideInRight = (element, options) => animate(element, 'slideInRight', options)

  // 停止所有动画
  const stopAllAnimations = () => {
    animationStates.value.forEach(({ animation }) => {
      try {
        animation.cancel()
      } catch (error) {
        console.warn('Failed to cancel animation:', error)
      }
    })
    animationStates.value.clear()
  }

  // 停止特定元素的动画
  const stopElementAnimations = (element) => {
    for (const [id, state] of animationStates.value.entries()) {
      if (state.element === element) {
        try {
          state.animation.cancel()
          animationStates.value.delete(id)
        } catch (error) {
          console.warn('Failed to cancel animation:', error)
        }
      }
    }
  }

  // 数字计数动画
  const animateNumber = (element, fromValue, toValue, duration = 1000) => {
    if (!globalAnimationEnabled.value || !element) {
      element.textContent = toValue.toString()
      return Promise.resolve()
    }

    return new Promise(resolve => {
      const startTime = Date.now()
      const difference = toValue - fromValue

      const updateNumber = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        // 使用缓动函数
        const easeOutQuart = 1 - Math.pow(1 - progress, 4)
        const currentValue = Math.round(fromValue + difference * easeOutQuart)

        element.textContent = currentValue.toLocaleString()

        if (progress < 1) {
          requestAnimationFrame(updateNumber)
        } else {
          resolve()
        }
      }

      requestAnimationFrame(updateNumber)
    })
  }

  // 进度条动画
  const animateProgress = (element, fromPercent, toPercent, duration = 800) => {
    if (!globalAnimationEnabled.value || !element) {
      element.style.width = `${toPercent}%`
      return Promise.resolve()
    }

    return animate(element, 'fadeIn', {
      duration,
      fill: 'forwards'
    }).then(() => {
      element.style.width = `${toPercent}%`
    })
  }

  // 工具函数
  const generateAnimationId = () => {
    return `animation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // 切换全局动画
  const toggleGlobalAnimation = (enabled) => {
    globalAnimationEnabled.value = enabled
    if (!enabled) {
      stopAllAnimations()
    }
  }

  // 计算属性
  const isAnimating = computed(() => animationStates.value.size > 0)
  const activeAnimationCount = computed(() => animationStates.value.size)

  return {
    // 状态
    globalAnimationEnabled,
    isAnimating,
    activeAnimationCount,
    animationConfig,

    // 核心方法
    animate,
    animateSequence,
    animateParallel,
    stopAllAnimations,
    stopElementAnimations,
    toggleGlobalAnimation,

    // 简化方法
    buttonClick,
    buttonHover,
    buttonUnhover,
    cardHover,
    cardUnhover,
    inputFocus,
    inputBlur,
    highlightTableRow,
    countNumber,
    showSuccess,
    shakeError,
    fadeIn,
    fadeOut,
    slideInLeft,
    slideInRight,

    // 特殊动画
    animateNumber,
    animateProgress,

    // 预定义动画
    animations
  }
}