import { useMobileGestures, useInertiaScroll } from '../composables/useMobileGestures'

// 触摸波纹效果
export const vRipple = {
  mounted(el, binding) {
    el.addEventListener('click', createRipple)

    function createRipple(e) {
      const button = e.currentTarget
      const rect = button.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const x = e.clientX - rect.left - size / 2
      const y = e.clientY - rect.top - size / 2

      const ripple = document.createElement('span')
      ripple.className = 'ripple'
      ripple.style.width = ripple.style.height = size + 'px'
      ripple.style.left = x + 'px'
      ripple.style.top = y + 'px'

      button.appendChild(ripple)

      setTimeout(() => {
        ripple.remove()
      }, 600)
    }
  },

  beforeUnmount(el) {
    el.removeEventListener('click', createRipple)
  }
}

// 长按指令
export const vLongPress = {
  mounted(el, binding) {
    if (typeof binding.value !== 'function') return

    let pressTimer = null

    const start = (e) => {
      if (e.type === 'click' && e.button !== 0) return

      if (pressTimer === null) {
        pressTimer = setTimeout(() => {
          binding.value(e)
        }, 500)
      }
    }

    const cancel = () => {
      if (pressTimer !== null) {
        clearTimeout(pressTimer)
        pressTimer = null
      }
    }

    el.addEventListener('mousedown', start)
    el.addEventListener('touchstart', start)
    el.addEventListener('click', cancel)
    el.addEventListener('mouseout', cancel)
    el.addEventListener('touchend', cancel)
    el.addEventListener('touchcancel', cancel)

    el._pressTimer = pressTimer
    el._start = start
    el._cancel = cancel
  },

  beforeUnmount(el) {
    el.removeEventListener('mousedown', el._start)
    el.removeEventListener('touchstart', el._start)
    el.removeEventListener('click', el._cancel)
    el.removeEventListener('mouseout', el._cancel)
    el.removeEventListener('touchend', el._cancel)
    el.removeEventListener('touchcancel', el._cancel)
  }
}

// 滑动手势指令
export const vSwipe = {
  mounted(el, binding) {
    const { value } = binding
    const {
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
      threshold = 50
    } = value || {}

    let touchStartX = 0
    let touchStartY = 0
    let touchEndX = 0
    let touchEndY = 0

    const handleTouchStart = (e) => {
      touchStartX = e.changedTouches[0].screenX
      touchStartY = e.changedTouches[0].screenY
    }

    const handleTouchEnd = (e) => {
      touchEndX = e.changedTouches[0].screenX
      touchEndY = e.changedTouches[0].screenY
      handleSwipe()
    }

    const handleSwipe = () => {
      const deltaX = touchEndX - touchStartX
      const deltaY = touchEndY - touchStartY
      const absDeltaX = Math.abs(deltaX)
      const absDeltaY = Math.abs(deltaY)

      if (Math.max(absDeltaX, absDeltaY) > threshold) {
        if (absDeltaX > absDeltaY) {
          // 水平滑动
          if (deltaX > 0) {
            onSwipeRight?.()
          } else {
            onSwipeLeft?.()
          }
        } else {
          // 垂直滑动
          if (deltaY > 0) {
            onSwipeDown?.()
          } else {
            onSwipeUp?.()
          }
        }
      }
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })

    el._handleTouchStart = handleTouchStart
    el._handleTouchEnd = handleTouchEnd
  },

  beforeUnmount(el) {
    el.removeEventListener('touchstart', el._handleTouchStart)
    el.removeEventListener('touchend', el._handleTouchEnd)
  }
}

// 拖拽指令
export const vDraggable = {
  mounted(el, binding) {
    const { value } = binding
    const {
      axis = 'both',
      boundary,
      onDragStart,
      onDrag,
      onDragEnd
    } = value || {}

    let isDragging = false
    let startX = 0
    let startY = 0
    let initialLeft = 0
    let initialTop = 0

    const handleStart = (e) => {
      isDragging = true
      el.style.transition = 'none'
      el.style.cursor = 'grabbing'
      el.style.zIndex = '9999'

      if (e.type === 'mousedown') {
        startX = e.clientX
        startY = e.clientY
      } else {
        startX = e.touches[0].clientX
        startY = e.touches[0].clientY
      }

      initialLeft = el.offsetLeft
      initialTop = el.offsetTop

      onDragStart?.(e)
    }

    const handleMove = (e) => {
      if (!isDragging) return

      e.preventDefault()

      let currentX, currentY
      if (e.type === 'mousemove') {
        currentX = e.clientX
        currentY = e.clientY
      } else {
        currentX = e.touches[0].clientX
        currentY = e.touches[0].clientY
      }

      const deltaX = currentX - startX
      const deltaY = currentY - startY

      let newLeft = initialLeft
      let newTop = initialTop

      if (axis === 'x' || axis === 'both') {
        newLeft = initialLeft + deltaX
      }
      if (axis === 'y' || axis === 'both') {
        newTop = initialTop + deltaY
      }

      // 边界限制
      if (boundary) {
        const parentRect = el.parentElement.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()

        if (axis === 'x' || axis === 'both') {
          newLeft = Math.max(0, Math.min(newLeft, parentRect.width - elRect.width))
        }
        if (axis === 'y' || axis === 'both') {
          newTop = Math.max(0, Math.min(newTop, parentRect.height - elRect.height))
        }
      }

      el.style.left = newLeft + 'px'
      el.style.top = newTop + 'px'

      onDrag?.(e, { left: newLeft, top: newTop })
    }

    const handleEnd = (e) => {
      if (!isDragging) return

      isDragging = false
      el.style.transition = ''
      el.style.cursor = ''
      el.style.zIndex = ''

      onDragEnd?.(e)
    }

    // 鼠标事件
    el.addEventListener('mousedown', handleStart)
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)

    // 触摸事件
    el.addEventListener('touchstart', handleStart, { passive: true })
    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', handleEnd, { passive: true })

    // 保存引用
    el._draggable = {
      handleStart,
      handleMove,
      handleEnd
    }
  },

  beforeUnmount(el) {
    const { handleStart, handleMove, handleEnd } = el._draggable || {}

    if (handleStart) {
      el.removeEventListener('mousedown', handleStart)
      el.removeEventListener('touchstart', handleStart)
    }
    if (handleMove) {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('touchmove', handleMove)
    }
    if (handleEnd) {
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchend', handleEnd)
    }
  }
}

// 虚拟滚动指令（用于长列表优化）
export const vVirtualScroll = {
  mounted(el, binding) {
    const { value } = binding
    const {
      items = [],
      itemHeight = 50,
      bufferSize = 5
    } = value || {}

    const state = {
      scrollTop: 0,
      containerHeight: el.clientHeight,
      startIndex: 0,
      endIndex: 0,
      visibleItems: []
    }

    const updateVisibleItems = () => {
      state.startIndex = Math.max(0, Math.floor(state.scrollTop / itemHeight) - bufferSize)
      state.endIndex = Math.min(
        items.length - 1,
        Math.ceil((state.scrollTop + state.containerHeight) / itemHeight) + bufferSize
      )

      state.visibleItems = items.slice(state.startIndex, state.endIndex + 1)

      // 更新DOM
      el.innerHTML = ''
      el.style.height = items.length * itemHeight + 'px'
      el.style.position = 'relative'

      state.visibleItems.forEach((item, index) => {
        const itemEl = document.createElement('div')
        itemEl.style.position = 'absolute'
        itemEl.style.top = (state.startIndex + index) * itemHeight + 'px'
        itemEl.style.width = '100%'
        itemEl.style.height = itemHeight + 'px'
        itemEl.innerHTML = binding.arg ? binding.arg(item) : item
        el.appendChild(itemEl)
      })
    }

    const handleScroll = () => {
      state.scrollTop = el.scrollTop
      requestAnimationFrame(updateVisibleItems)
    }

    el.addEventListener('scroll', handleScroll, { passive: true })

    // 初始渲染
    updateVisibleItems()

    // 保存引用
    el._virtualScroll = {
      handleScroll,
      update: updateVisibleItems,
      state
    }
  },

  updated(el, binding) {
    const items = binding.value?.items || []
    const { state, update } = el._virtualScroll || {}

    if (state && items.length !== state.visibleItems.length + state.startIndex) {
      update()
    }
  },

  beforeUnmount(el) {
    const { handleScroll } = el._virtualScroll || {}
    if (handleScroll) {
      el.removeEventListener('scroll', handleScroll)
    }
  }
}

// 防抖指令
export const vDebounce = {
  mounted(el, binding) {
    let timer = null
    const delay = Number(binding.arg) || 300

    el.addEventListener('click', () => {
      if (timer) {
        clearTimeout(timer)
      }

      timer = setTimeout(() => {
        binding.value()
      }, delay)
    })

    el._debounceTimer = timer
  },

  beforeUnmount(el) {
    if (el._debounceTimer) {
      clearTimeout(el._debounceTimer)
    }
  }
}

// 节流指令
export const vThrottle = {
  mounted(el, binding) {
    let timer = null
    const delay = Number(binding.arg) || 300

    el.addEventListener('click', () => {
      if (!timer) {
        timer = setTimeout(() => {
          binding.value()
          timer = null
        }, delay)
      }
    })

    el._throttleTimer = timer
  },

  beforeUnmount(el) {
    if (el._throttleTimer) {
      clearTimeout(el._throttleTimer)
    }
  }
}

// 复制到剪贴板指令
export const vCopy = {
  mounted(el, binding) {
    el.copyData = binding.value
    el.addEventListener('click', handleClick)
  },

  updated(el, binding) {
    el.copyData = binding.value
  },

  beforeUnmount(el) {
    el.removeEventListener('click', handleClick)
  }
}

function handleClick() {
  const input = document.createElement('input')
  input.value = this.copyData.toLocaleString()
  document.body.appendChild(input)
  input.select()
  document.execCommand('Copy')
  document.body.removeChild(input)
}