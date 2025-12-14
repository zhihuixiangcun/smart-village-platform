import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 移动端触控优化组合式函数
 */
export function useMobileTouch() {
  const isMobile = ref(false)
  const touchDevice = ref(false)

  // 检测设备类型
  const detectDevice = () => {
    const userAgent = navigator.userAgent.toLowerCase()
    const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'tablet']

    isMobile.value = mobileKeywords.some(keyword => userAgent.includes(keyword)) ||
                    window.innerWidth <= 768
    touchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }

  // 触觉反馈
  const hapticFeedback = (type = 'light') => {
    if ('vibrate' in navigator && touchDevice.value) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
        double: [10, 50, 10],
        success: [10, 30, 10],
        error: [50, 50, 50]
      }
      navigator.vibrate(patterns[type] || patterns.light)
    }
  }

  // 添加触觉反馈样式类
  const addHapticClass = (element, type = 'light') => {
    if (element) {
      element.classList.add('haptic-feedback', `feedback-${type}`)
      setTimeout(() => {
        element.classList.remove('haptic-feedback', `feedback-${type}`)
      }, 200)
    }
  }

  onMounted(() => {
    detectDevice()
    window.addEventListener('resize', detectDevice)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', detectDevice)
  })

  return {
    isMobile,
    touchDevice,
    hapticFeedback,
    addHapticClass
  }
}

/**
 * 左滑操作组合式函数
 */
export function useSwipeAction() {
  const swipeX = ref(0)
  const isSwipeActive = ref(false)
  const swipeThreshold = 80 // 滑动阈值

  let startX = 0
  let currentX = 0
  let isDragging = false

  const handleTouchStart = (event) => {
    startX = event.touches[0].clientX
    currentX = startX
    isDragging = true
    isSwipeActive.value = true
  }

  const handleTouchMove = (event) => {
    if (!isDragging) return

    currentX = event.touches[0].clientX
    const deltaX = currentX - startX

    // 只允许向左滑动
    if (deltaX < 0) {
      swipeX.value = Math.max(deltaX, -swipeThreshold)
    }
  }

  const handleTouchEnd = () => {
    isDragging = false
    isSwipeActive.value = false

    // 判断是否触发操作
    if (Math.abs(swipeX.value) > swipeThreshold / 2) {
      swipeX.value = -swipeThreshold // 完全展开操作区域
      return true // 返回true表示触发了滑动操作
    } else {
      swipeX.value = 0 // 回弹
      return false
    }
  }

  const resetSwipe = () => {
    swipeX.value = 0
    isSwipeActive.value = false
  }

  return {
    swipeX,
    isSwipeActive,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetSwipe
  }
}

/**
 * 长按操作组合式函数
 */
export function useLongPress(callback, delay = 500) {
  let timeout = null
  let isPressed = ref(false)

  const handleTouchStart = (event) => {
    isPressed.value = true
    timeout = setTimeout(() => {
      if (isPressed.value) {
        callback(event)
        // 触觉反馈
        if ('vibrate' in navigator) {
          navigator.vibrate([20])
        }
      }
    }, delay)
  }

  const handleTouchEnd = () => {
    isPressed.value = false
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  const handleTouchCancel = () => {
    isPressed.value = false
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  return {
    isPressed,
    handleTouchStart,
    handleTouchEnd,
    handleTouchCancel
  }
}

/**
 * 双击操作组合式函数
 */
export function useDoubleTap(callback, delay = 300) {
  let lastTap = 0
  let timeout = null

  const handleTap = (event) => {
    const currentTime = new Date().getTime()
    const tapLength = currentTime - lastTap

    if (tapLength < delay && tapLength > 0) {
      // 双击
      callback(event)
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
    } else {
      // 单击，等待可能的第二次点击
      timeout = setTimeout(() => {
        // 这里可以处理单击事件
        timeout = null
      }, delay)
    }

    lastTap = currentTime
  }

  return {
    handleTap
  }
}

/**
 * 触控操作增强组合式函数
 */
export function useTouchEnhancement() {
  const { isMobile, touchDevice, hapticFeedback, addHapticClass } = useMobileTouch()

  // 增强按钮点击反馈
  const enhanceButton = (buttonRef, options = {}) => {
    const {
      haptic = 'light',
      scaleEffect = true,
      rippleEffect = false
    } = options

    if (!buttonRef.value) return

    const button = buttonRef.value.$el || buttonRef.value

    // 添加触觉反馈
    const originalClick = button.onclick
    button.onclick = (event) => {
      if (touchDevice.value) {
        hapticFeedback(haptic)
        if (scaleEffect) {
          addHapticClass(button, haptic)
        }
      }

      if (rippleEffect) {
        createRippleEffect(button, event)
      }

      if (originalClick) {
        originalClick.call(button, event)
      }
    }
  }

  // 创建波纹效果
  const createRippleEffect = (element, event) => {
    const ripple = document.createElement('span')
    const rect = element.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2

    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: scale(0);
      left: ${x}px;
      top: ${y}px;
      pointer-events: none;
      animation: ripple 0.6s ease-out;
    `

    // 确保容器有相对定位
    if (getComputedStyle(element).position === 'static') {
      element.style.position = 'relative'
    }
    element.style.overflow = 'hidden'

    element.appendChild(ripple)

    // 添加动画样式
    if (!document.getElementById('ripple-animation')) {
      const style = document.createElement('style')
      style.id = 'ripple-animation'
      style.textContent = `
        @keyframes ripple {
          to {
            transform: scale(2);
            opacity: 0;
          }
        }
      `
      document.head.appendChild(style)
    }

    setTimeout(() => {
      ripple.remove()
    }, 600)
  }

  return {
    isMobile,
    touchDevice,
    hapticFeedback,
    addHapticClass,
    enhanceButton,
    createRippleEffect
  }
}