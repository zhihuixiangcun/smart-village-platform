/**
 * 移动端性能优化工具
 * 提供代码分割、懒加载、虚拟列表、图片优化等性能优化功能
 */

import { ref, onUnmounted } from 'vue'

// ==================== 图片优化 ====================

/**
 * 图片懒加载指令
 * 使用 Intersection Observer API 实现
 */
export const lazyLoadDirective = {
  mounted(el, binding) {
    const imageUrl = binding.value

    // 创建占位符
    el.setAttribute('data-src', imageUrl)
    el.style.background = '#F5F7FA'

    // 创建 Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // 图片进入视口，开始加载
            loadImage(el, imageUrl)
            observer.unobserve(el)
          }
        })
      },
      {
        rootMargin: '50px', // 提前 50px 开始加载
        threshold: 0.01
      }
    )

    el._lazyLoadObserver = observer
    observer.observe(el)
  },

  unmounted(el) {
    if (el._lazyLoadObserver) {
      el._lazyLoadObserver.unobserve(el)
      delete el._lazyLoadObserver
    }
  }
}

/**
 * 加载图片
 */
function loadImage(el, imageUrl) {
  const img = new Image()

  img.onload = () => {
    el.src = imageUrl
    el.removeAttribute('data-src')
    el.style.background = 'transparent'
    el.classList.add('loaded')
  }

  img.onerror = () => {
    el.classList.add('error')
    el.src = '/placeholder-error.png'
  }

  // 添加渐入动画
  el.style.transition = 'opacity 0.3s ease'
  el.style.opacity = '0'

  img.src = imageUrl
}

/**
 * 响应式图片 URL 生成
 * 根据设备像素比返回合适的图片尺寸
 */
export function getResponsiveImageUrl(baseUrl, width, height) {
  const dpr = window.devicePixelRatio || 1
  const scaleFactor = Math.ceil(dpr)

  const scaledWidth = width * scaleFactor
  const scaledHeight = height * scaleFactor

  // 假设后端支持图片处理参数
  const url = new URL(baseUrl, window.location.origin)
  url.searchParams.set('w', scaledWidth)
  url.searchParams.set('h', scaledHeight)
  url.searchParams.set('fit', 'cover')

  return url.toString()
}

/**
 * WebP 格式检测
 */
export function supportsWebP() {
  return new Promise((resolve) => {
    const webP = new Image()
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2)
    }
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA'
  })
}

// ==================== 虚拟列表 ====================

/**
 * 虚拟滚动列表 Hook
 * 用于渲染大量数据时的性能优化
 */
export function useVirtualList(options) {
  const {
    items,           // 所有数据项
    itemHeight,      // 每项高度
    containerHeight, // 容器高度
    overscan = 3     // 预渲染项数
  } = options

  const scrollTop = ref(0)
  const containerRef = ref(null)

  // 计算可见项
  const visibleData = ref([])

  function updateVisibleData() {
    const startNode = Math.floor(scrollTop.value / itemHeight) - overscan
    const visibleCount = Math.ceil(containerHeight / itemHeight)

    const endNode = startNode + visibleCount + overscan * 2

    const offset = startNode * itemHeight

    visibleData.value = {
      data: items.slice(Math.max(0, startNode), Math.min(items.length, endNode)),
      offset: Math.max(0, offset)
    }
  }

  function handleScroll(e) {
    scrollTop.value = e.target.scrollTop
    updateVisibleData()
  }

  // 初始化
  updateVisibleData()

  return {
    containerRef,
    visibleData,
    handleScroll
  }
}

// ==================== 代码分割与懒加载 ====================

/**
 * 组件懒加载辅助函数
 * 自动处理加载状态和错误
 */
export function lazyComponent(importFunc, options = {}) {
  return defineAsyncComponent({
    loader: importFunc,
    loadingComponent: options.loadingComponent || LoadingComponent,
    errorComponent: options.errorComponent || ErrorComponent,
    delay: options.delay || 200,
    timeout: options.timeout || 10000
  })
}

/**
 * 路由懒加载
 */
export function lazyView(path) {
  return () => import(`@/views/${path}.vue`)
}

// ==================== 防抖与节流 ====================

/**
 * 防抖函数
 * 延迟执行，适用于输入框搜索等场景
 */
export function debounce(fn, delay = 300) {
  let timer = null

  return function (...args) {
    if (timer) clearTimeout(timer)

    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

/**
 * 节流函数
 * 固定时间间隔执行，适用于滚动、resize 等场景
 */
export function throttle(fn, interval = 300) {
  let lastTime = 0

  return function (...args) {
    const now = Date.now()

    if (now - lastTime >= interval) {
      lastTime = now
      fn.apply(this, args)
    }
  }
}

// ==================== 请求优化 ====================

/**
 * 请求缓存 Hook
 */
export function useRequestCache() {
  const cache = new Map()

  async function cachedFetch(key, fetcher, options = {}) {
    const { ttl = 60000 } = options // 默认缓存 1 分钟

    // 检查缓存
    if (cache.has(key)) {
      const { data, timestamp } = cache.get(key)

      if (Date.now() - timestamp < ttl) {
        console.log('使用缓存:', key)
        return data
      }
    }

    // 请求数据
    const data = await fetcher()

    // 存入缓存
    cache.set(key, {
      data,
      timestamp: Date.now()
    })

    return data
  }

  function clearCache(key) {
    if (key) {
      cache.delete(key)
    } else {
      cache.clear()
    }
  }

  return {
    cachedFetch,
    clearCache
  }
}

/**
 * 请求去重 Hook
 * 防止相同请求并发发送
 */
export function useRequestDeduplication() {
  const pendingRequests = new Map()

  async function deduplicatedFetch(key, fetcher) {
    // 检查是否有相同请求正在进行
    if (pendingRequests.has(key)) {
      console.log('请求去重:', key)
      return pendingRequests.get(key)
    }

    // 创建新请求
    const promise = fetcher().finally(() => {
      pendingRequests.delete(key)
    })

    pendingRequests.set(key, promise)

    return promise
  }

  return {
    deduplicatedFetch
  }
}

// ==================== 内存优化 ====================

/**
 * 事件监听器管理器
 * 自动清理事件监听器，防止内存泄漏
 */
export class EventManager {
  constructor() {
    this.listeners = []
  }

  add(element, event, handler, options) {
    element.addEventListener(event, handler, options)
    this.listeners.push({ element, event, handler, options })
  }

  removeAll() {
    this.listeners.forEach(({ element, event, handler, options }) => {
      element.removeEventListener(event, handler, options)
    })
    this.listeners = []
  }

  remove(element, event, handler) {
    const index = this.listeners.findIndex(
      (l) => l.element === element && l.event === event && l.handler === handler
    )

    if (index > -1) {
      const listener = this.listeners[index]
      listener.element.removeEventListener(listener.event, listener.handler, listener.options)
      this.listeners.splice(index, 1)
    }
  }
}

/**
 * 定时器管理器
 * 自动清理定时器
 */
export class TimerManager {
  constructor() {
    this.timers = []
  }

  setTimeout(fn, delay, ...args) {
    const timer = setTimeout(() => {
      fn(...args)
      this.remove(timer)
    }, delay)

    this.timers.push(timer)
    return timer
  }

  setInterval(fn, interval, ...args) {
    const timer = setInterval(() => {
      fn(...args)
    }, interval)

    this.timers.push(timer)
    return timer
  }

  remove(timer) {
    const index = this.timers.indexOf(timer)
    if (index > -1) {
      this.timers.splice(index, 1)
    }
    clearTimeout(timer)
    clearInterval(timer)
  }

  clearAll() {
    this.timers.forEach((timer) => {
      clearTimeout(timer)
      clearInterval(timer)
    })
    this.timers = []
  }
}

// ==================== 性能监控 ====================

/**
 * 性能指标收集
 */
export function collectPerformanceMetrics() {
  if (!window.performance || !window.performance.timing) {
    return null
  }

  const timing = window.performance.timing
  const navigation = timing.navigationStart

  const metrics = {
    // DNS 查询时间
    dns: timing.domainLookupEnd - timing.domainLookupStart,

    // TCP 连接时间
    tcp: timing.connectEnd - timing.connectStart,

    // 请求响应时间
    request: timing.responseEnd - timing.requestStart,

    // DOM 解析时间
    domParsing: timing.domComplete - timing.domInteractive,

    // 首次内容绘制
    firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime,

    // 首次有意义的绘制
    firstMeaningfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime,

    // DOM 就绪时间
    domReady: timing.domContentLoadedEventEnd - navigation,

    // 完全加载时间
    loadComplete: timing.loadEventEnd - navigation,

    // 总加载时间
    total: timing.loadEventEnd - navigation
  }

  return metrics
}

/**
 * Core Web Vitals 收集
 */
export function collectCoreWebVitals() {
  const vitals = {}

  // Largest Contentful Paint (LCP)
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        vitals.lcp = lastEntry.renderTime || lastEntry.loadTime
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
    } catch (e) {
      console.warn('LCP 观察失败:', e)
    }

    // First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          vitals.fid = entry.processingStart - entry.startTime
        })
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
    } catch (e) {
      console.warn('FID 观察失败:', e)
    }

    // Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        })
        vitals.cls = clsValue
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
    } catch (e) {
      console.warn('CLS 观察失败:', e)
    }
  }

  return vitals
}

// ==================== Vue 组合式函数 ====================

/**
 * 性能优化 Hook
 */
export function usePerformanceOptimization() {
  const eventManager = new EventManager()
  const timerManager = new TimerManager()

  onUnmounted(() => {
    eventManager.removeAll()
    timerManager.clearAll()
  })

  return {
    eventManager,
    timerManager,
    debounce,
    throttle,
    useRequestCache,
    useRequestDeduplication
  }
}

// ==================== 组件占位符 ====================

const LoadingComponent = {
  template: `
    <div class="loading-placeholder">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>
  `
}

const ErrorComponent = {
  template: `
    <div class="error-placeholder">
      <p>组件加载失败</p>
      <button @click="retry">重试</button>
    </div>
  `,
  emits: ['retry'],
  methods: {
    retry() {
      this.$emit('retry')
    }
  }
}
