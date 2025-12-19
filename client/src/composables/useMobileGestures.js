import { ref, onMounted, onUnmounted } from 'vue'

export function useMobileGestures(options = {}) {
  const {
    swipeThreshold = 50,
    longPressDelay = 800,
    doubleTapDelay = 300,
    pinchZoomEnabled = false,
    rotationEnabled = false
  } = options

  // 触摸状态
  const touchState = ref({
    isTracking: false,
    startX: 0,
    startY: 0,
    startTime: 0,
    lastTapTime: 0,
    tapCount: 0,
    longPressTimer: null,
    swipeDirection: null,
    distance: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    scale: 1,
    rotation: 0,
    initialDistance: 0,
    initialAngle: 0
  })

  // 回调函数
  const callbacks = ref({
    onSwipe: null,
    onSwipeLeft: null,
    onSwipeRight: null,
    onSwipeUp: null,
    onSwipeDown: null,
    onTap: null,
    onDoubleTap: null,
    onLongPress: null,
    onPinch: null,
    onRotate: null,
    onTouchStart: null,
    onTouchMove: null,
    onTouchEnd: null
  })

  // 设置回调
  const setCallbacks = (newCallbacks) => {
    callbacks.value = { ...callbacks.value, ...newCallbacks }
  }

  // 计算两点距离
  const getDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  // 计算两点角度
  const getAngle = (touch1, touch2) => {
    const dx = touch2.clientX - touch1.clientX
    const dy = touch2.clientY - touch1.clientY
    return Math.atan2(dy, dx) * 180 / Math.PI
  }

  // 处理触摸开始
  const handleTouchStart = (e) => {
    const touch = e.touches[0]
    const now = Date.now()

    touchState.value = {
      ...touchState.value,
      isTracking: true,
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: now,
      lastTapTime: now,
      tapCount: e.touches.length,
      distance: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      swipeDirection: null,
      longPressTimer: null
    }

    // 多指触控
    if (e.touches.length === 2) {
      touchState.value.initialDistance = getDistance(e.touches[0], e.touches[1])
      if (rotationEnabled) {
        touchState.value.initialAngle = getAngle(e.touches[0], e.touches[1])
      }
    }

    // 长按定时器
    touchState.value.longPressTimer = setTimeout(() => {
      if (touchState.value.isTracking) {
        callbacks.value.onLongPress?.(e)
      }
    }, longPressDelay)

    // 触发回调
    callbacks.value.onTouchStart?.(e, touchState.value)
  }

  // 处理触摸移动
  const handleTouchMove = (e) => {
    if (!touchState.value.isTracking) return

    e.preventDefault()

    const touch = e.touches[0]
    const now = Date.now()
    const deltaTime = now - touchState.value.startTime

    // 计算距离和速度
    const deltaX = touch.clientX - touchState.value.startX
    const deltaY = touch.clientY - touchState.value.startY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    touchState.value.distance.x = deltaX
    touchState.value.distance.y = deltaY
    touchState.value.velocity.x = deltaX / deltaTime * 1000
    touchState.value.velocity.y = deltaY / deltaTime * 1000

    // 清除长按定时器
    if (touchState.value.longPressTimer) {
      clearTimeout(touchState.value.longPressTimer)
      touchState.value.longPressTimer = null
    }

    // 双指缩放
    if (pinchZoomEnabled && e.touches.length === 2) {
      const currentDistance = getDistance(e.touches[0], e.touches[1])
      const scale = currentDistance / touchState.value.initialDistance
      touchState.value.scale = Math.max(0.5, Math.min(3, scale))
      callbacks.value.onPinch?.(touchState.value.scale, e)
    }

    // 旋转手势
    if (rotationEnabled && e.touches.length === 2) {
      const currentAngle = getAngle(e.touches[0], e.touches[1])
      const rotation = currentAngle - touchState.value.initialAngle
      touchState.value.rotation = rotation
      callbacks.value.onRotate?.(rotation, e)
    }

    // 滑动方向
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      touchState.value.swipeDirection = deltaX > 0 ? 'right' : 'left'
    } else {
      touchState.value.swipeDirection = deltaY > 0 ? 'down' : 'up'
    }

    // 触发回调
    callbacks.value.onTouchMove?.(e, touchState.value)
  }

  // 处理触摸结束
  const handleTouchEnd = (e) => {
    if (!touchState.value.isTracking) return

    const now = Date.now()
    const deltaTime = now - touchState.value.startTime
    const { distance, velocity } = touchState.value

    // 清除长按定时器
    if (touchState.value.longPressTimer) {
      clearTimeout(touchState.value.longPressTimer)
      touchState.value.longPressTimer = null
    }

    // 判断手势类型
    const absDistanceX = Math.abs(distance.x)
    const absDistanceY = Math.abs(distance.y)

    // 滑动手势
    if (absDistanceX > swipeThreshold || absDistanceY > swipeThreshold) {
      const swipeData = {
        direction: touchState.value.swipeDirection,
        distance: { x: distance.x, y: distance.y },
        velocity: { x: velocity.x, y: velocity.y }
      }

      callbacks.value.onSwipe?.(swipeData, e)

      // 方向滑动
      switch (touchState.value.swipeDirection) {
        case 'left':
          callbacks.value.onSwipeLeft?.(swipeData, e)
          break
        case 'right':
          callbacks.value.onSwipeRight?.(swipeData, e)
          break
        case 'up':
          callbacks.value.onSwipeUp?.(swipeData, e)
          break
        case 'down':
          callbacks.value.onSwipeDown?.(swipeData, e)
          break
      }
    }
    // 点击手势
    else if (deltaTime < 200 && absDistanceX < 10 && absDistanceY < 10) {
      // 双击判断
      if (now - touchState.value.lastTapTime < doubleTapDelay) {
        callbacks.value.onDoubleTap?.(e)
      } else {
        callbacks.value.onTap?.(e)
      }
    }

    // 重置状态
    touchState.value.isTracking = false
    touchState.value.scale = 1
    touchState.value.rotation = 0

    // 触发回调
    callbacks.value.onTouchEnd?.(e, touchState.value)
  }

  // 绑定事件监听
  const bindGestures = (element) => {
    if (!element) return

    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: false })
    element.addEventListener('touchcancel', handleTouchEnd, { passive: false })
  }

  // 解绑事件监听
  const unbindGestures = (element) => {
    if (!element) return

    element.removeEventListener('touchstart', handleTouchStart)
    element.removeEventListener('touchmove', handleTouchMove)
    element.removeEventListener('touchend', handleTouchEnd)
    element.removeEventListener('touchcancel', handleTouchEnd)
  }

  // 清理
  const cleanup = () => {
    if (touchState.value.longPressTimer) {
      clearTimeout(touchState.value.longPressTimer)
      touchState.value.longPressTimer = null
    }
  }

  onUnmounted(() => {
    cleanup()
  })

  return {
    touchState,
    setCallbacks,
    bindGestures,
    unbindGestures,
    cleanup
  }
}

// 滑动删除指令
export const vSwipeDelete = {
  mounted(el, binding) {
    const { value } = binding
    const threshold = value?.threshold || 100
    const onConfirm = value?.onConfirm

    let startX = 0
    let currentX = 0
    let isSwiping = false

    const handleTouchStart = (e) => {
      startX = e.touches[0].clientX
      isSwiping = true
      el.style.transition = 'none'
    }

    const handleTouchMove = (e) => {
      if (!isSwiping) return

      currentX = e.touches[0].clientX
      const deltaX = currentX - startX

      // 限制左滑
      if (deltaX < 0) {
        el.style.transform = `translateX(${Math.max(deltaX, -threshold)}px)`
      }
    }

    const handleTouchEnd = () => {
      if (!isSwiping) return

      isSwiping = false
      el.style.transition = 'transform 0.3s ease'

      const deltaX = currentX - startX

      if (deltaX < -threshold / 2) {
        // 触发删除
        el.style.transform = `translateX(-${threshold}px)`

        // 创建删除按钮
        let deleteBtn = el.querySelector('.swipe-delete-btn')
        if (!deleteBtn) {
          deleteBtn = document.createElement('div')
          deleteBtn.className = 'swipe-delete-btn'
          deleteBtn.innerHTML = `
            <button style="background: #f56c6c; color: white; border: none; padding: 0 20px; height: 100%; cursor: pointer;">
              删除
            </button>
          `
          deleteBtn.style.position = 'absolute'
          deleteBtn.style.right = '0'
          deleteBtn.style.top = '0'
          deleteBtn.style.width = threshold + 'px'
          deleteBtn.style.height = '100%'
          deleteBtn.style.display = 'flex'
          deleteBtn.style.alignItems = 'center'
          deleteBtn.style.justifyContent = 'center'

          const wrapper = document.createElement('div')
          wrapper.style.position = 'relative'
          wrapper.style.overflow = 'hidden'
          el.parentNode.insertBefore(wrapper, el)
          wrapper.appendChild(el)
          wrapper.appendChild(deleteBtn)

          deleteBtn.querySelector('button').addEventListener('click', () => {
            onConfirm?.(el)
          })
        }
      } else {
        // 回弹
        el.style.transform = 'translateX(0)'
      }
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: true })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })
  }
}

// 拖拽排序指令
export const vDragSort = {
  mounted(el, binding) {
    const { value } = binding
    const onDragEnd = value?.onDragEnd
    const itemSelector = value?.itemSelector || '.drag-item'

    let draggedElement = null
    let draggedIndex = -1
    let placeholder = null

    const handleDragStart = (e) => {
      const item = e.target.closest(itemSelector)
      if (!item) return

      draggedElement = item
      draggedIndex = Array.from(item.parentNode.children).indexOf(item)

      // 创建占位符
      placeholder = document.createElement('div')
      placeholder.className = 'drag-placeholder'
      placeholder.style.height = item.offsetHeight + 'px'
      placeholder.style.background = '#f0f0f0'
      placeholder.style.border = '2px dashed #ccc'

      item.style.opacity = '0.5'
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/html', item.innerHTML)
    }

    const handleDragOver = (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'

      const afterElement = getDragAfterElement(e.currentTarget, e.clientY, itemSelector)
      if (afterElement == null) {
        e.currentTarget.appendChild(placeholder)
      } else {
        e.currentTarget.insertBefore(placeholder, afterElement)
      }
    }

    const handleDrop = (e) => {
      e.preventDefault()

      if (draggedElement) {
        const dropIndex = Array.from(placeholder.parentNode.children).indexOf(placeholder)

        // 移动元素
        placeholder.parentNode.insertBefore(draggedElement, placeholder)
        placeholder.parentNode.removeChild(placeholder)

        // 触发回调
        onDragEnd?.({
          fromIndex: draggedIndex,
          toIndex: dropIndex,
          element: draggedElement
        })

        // 重置状态
        draggedElement.style.opacity = ''
        draggedElement = null
        placeholder = null
      }
    }

    const handleDragEnd = () => {
      if (draggedElement) {
        draggedElement.style.opacity = ''
      }
      if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder)
      }
      draggedElement = null
      placeholder = null
    }

    const getDragAfterElement = (container, y, selector) => {
      const draggableElements = [...container.querySelectorAll(selector)]

      return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect()
        const offset = y - box.top - box.height / 2

        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child }
        } else {
          return closest
        }
      }, { offset: Number.NEGATIVE_INFINITY }).element
    }

    el.addEventListener('dragstart', handleDragStart)
    el.addEventListener('dragover', handleDragOver)
    el.addEventListener('drop', handleDrop)
    el.addEventListener('dragend', handleDragEnd)

    // 为可拖拽元素添加拖拽属性
    el.querySelectorAll(itemSelector).forEach(item => {
      item.draggable = true
    })
  }
}

// 惯性滚动
export function useInertiaScroll(element) {
  let isScrolling = false
  let startY = 0
  let scrollTop = 0
  let startTime = 0
  let animationId = null

  const handleTouchStart = (e) => {
    isScrolling = true
    startY = e.touches[0].clientY
    scrollTop = element.scrollTop
    startTime = Date.now()

    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
  }

  const handleTouchMove = (e) => {
    if (!isScrolling) return

    const y = e.touches[0].clientY
    const deltaY = startY - y
    element.scrollTop = scrollTop + deltaY
  }

  const handleTouchEnd = (e) => {
    if (!isScrolling) return

    isScrolling = false
    const endTime = Date.now()
    const endY = e.changedTouches[0].clientY

    // 计算速度
    const deltaTime = endTime - startTime
    const deltaY = startY - endY
    const velocity = deltaY / deltaTime * 1000

    // 惯性滚动
    if (Math.abs(velocity) > 100) {
      let currentVelocity = velocity
      const friction = 0.95

      const scroll = () => {
        currentVelocity *= friction

        if (Math.abs(currentVelocity) > 0.5) {
          element.scrollTop += currentVelocity / 60
          animationId = requestAnimationFrame(scroll)
        }
      }

      scroll()
    }
  }

  const bind = () => {
    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
  }

  const unbind = () => {
    element.removeEventListener('touchstart', handleTouchStart)
    element.removeEventListener('touchmove', handleTouchMove)
    element.removeEventListener('touchend', handleTouchEnd)

    if (animationId) {
      cancelAnimationFrame(animationId)
    }
  }

  return { bind, unbind }
}