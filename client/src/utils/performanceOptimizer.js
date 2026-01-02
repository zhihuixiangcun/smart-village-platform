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
 * 性能优化工具
 * 提供组件性能监控、优化建议和自动化优化功能
 */

/**
 * 性能监控器类
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map()
    this.observers = []
    this.isMonitoring = false
  }

  /**
   * 开始监控性能
   */
  startMonitoring() {
    if (this.isMonitoring) return

    this.isMonitoring = true

    // 监控页面加载性能
    this.observePageLoad()

    // 监控资源加载
    this.observeResourceTiming()

    // 监控长任务
    this.observeLongTasks()

    // 监控内存使用
    this.observeMemoryUsage()
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    this.isMonitoring = false
    this.observers.forEach(observer => {
      observer.disconnect()
    })
    this.observers = []
  }

  /**
   * 观察页面加载性能
   */
  observePageLoad() {
    if (!window.performance) return

    // 使用 PerformanceObserver 监控导航时间
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          if (entry.entryType === 'navigation') {
            this.metrics.set('pageLoad', {
              domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
              loadComplete: entry.loadEventEnd - entry.loadEventStart,
              firstPaint: this.getFirstPaint(),
              firstContentfulPaint: this.getFirstContentfulPaint(),
              largestContentfulPaint: this.getLargestContentfulPaint()
            })
          }
        })
      })

      observer.observe({ entryTypes: ['navigation'] })
      this.observers.push(observer)
    }
  }

  /**
   * 观察资源加载时间
   */
  observeResourceTiming() {
    if (!window.performance) return

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const resourceMetrics = []

      entries.forEach(entry => {
        if (entry.entryType === 'resource') {
          resourceMetrics.push({
            name: entry.name,
            duration: entry.duration,
            size: entry.transferSize,
            type: this.getResourceType(entry.name)
          })
        }
      })

      this.metrics.set('resources', resourceMetrics)
    })

    observer.observe({ entryTypes: ['resource'] })
    this.observers.push(observer)
  }

  /**
   * 观察长任务
   */
  observeLongTasks() {
    if (!('PerformanceObserver' in window)) return

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const longTasks = []

        entries.forEach(entry => {
          if (entry.entryType === 'longtask') {
            longTasks.push({
              duration: entry.duration,
              startTime: entry.startTime
            })
          }
        })

        this.metrics.set('longTasks', longTasks)
      })

      observer.observe({ entryTypes: ['longtask'] })
      this.observers.push(observer)
    } catch (error) {
      console.warn('Long task observation not supported:', error)
    }
  }

  /**
   * 观察内存使用
   */
  observeMemoryUsage() {
    if (!window.performance || !window.performance.memory) return

    const measureMemory = () => {
      if (this.isMonitoring && window.performance.memory) {
        this.metrics.set('memory', {
          used: window.performance.memory.usedJSHeapSize,
          total: window.performance.memory.totalJSHeapSize,
          limit: window.performance.memory.jsHeapSizeLimit,
          usage: (window.performance.memory.usedJSHeapSize / window.performance.memory.jsHeapSizeLimit) * 100
        })
      }
    }

    // 每5秒测量一次内存使用
    const intervalId = setInterval(measureMemory, 5000)

    // 清理函数
    this.memoryCleanup = () => {
      clearInterval(intervalId)
    }
  }

  /**
   * 获取首次绘制时间
   */
  getFirstPaint() {
    const paintEntries = performance.getEntriesByType('paint')
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint')
    return firstPaint ? firstPaint.startTime : 0
  }

  /**
   * 获取首次内容绘制时间
   */
  getFirstContentfulPaint() {
    const paintEntries = performance.getEntriesByType('paint')
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')
    return fcp ? fcp.startTime : 0
  }

  /**
   * 获取最大内容绘制时间
   */
  getLargestContentfulPaint() {
    if (!('PerformanceObserver' in window)) return 0

    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        resolve(lastEntry ? lastEntry.startTime : 0)
      })

      observer.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.push(observer)

      // 10秒后超时
      setTimeout(() => {
        observer.disconnect()
        resolve(0)
      }, 10000)
    })
  }

  /**
   * 获取资源类型
   */
  getResourceType(url) {
    if (url.includes('.js')) return 'script'
    if (url.includes('.css')) return 'stylesheet'
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image'
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font'
    return 'other'
  }

  /**
   * 获取性能报告
   */
  getReport() {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: Object.fromEntries(this.metrics),
      recommendations: this.generateRecommendations()
    }

    return report
  }

  /**
   * 生成优化建议
   */
  generateRecommendations() {
    const recommendations = []

    // 检查页面加载时间
    const pageLoad = this.metrics.get('pageLoad')
    if (pageLoad) {
      if (pageLoad.domContentLoaded > 1000) {
        recommendations.push({
          type: 'performance',
          severity: 'high',
          title: 'DOM加载时间过长',
          description: 'DOM内容加载时间超过1秒，建议优化CSS和JavaScript加载',
          action: '考虑代码分割、延迟加载非关键资源'
        })
      }

      if (pageLoad.firstContentfulPaint > 2000) {
        recommendations.push({
          type: 'performance',
          severity: 'high',
          title: '首次内容绘制时间过长',
          description: 'FCP超过2秒，影响用户体验',
          action: '优化关键渲染路径，预加载重要资源'
        })
      }
    }

    // 检查资源加载
    const resources = this.metrics.get('resources')
    if (resources) {
      const slowResources = resources.filter(r => r.duration > 1000)
      if (slowResources.length > 0) {
        recommendations.push({
          type: 'resources',
          severity: 'medium',
          title: '发现加载缓慢的资源',
          description: `${slowResources.length}个资源加载时间超过1秒`,
          action: '压缩图片、使用CDN、启用缓存'
        })
      }

      const largeResources = resources.filter(r => r.size > 1024 * 1024) // 1MB
      if (largeResources.length > 0) {
        recommendations.push({
          type: 'resources',
          severity: 'medium',
          title: '发现大体积资源',
          description: `${largeResources.length}个资源超过1MB`,
          action: '压缩图片、优化代码、使用懒加载'
        })
      }
    }

    // 检查长任务
    const longTasks = this.metrics.get('longTasks')
    if (longTasks && longTasks.length > 0) {
      recommendations.push({
        type: 'tasks',
        severity: 'medium',
        title: '发现阻塞主线程的长任务',
        description: `${longTasks.length}个长任务可能影响页面响应性`,
        action: '使用Web Workers、拆分大任务、使用requestIdleCallback'
      })
    }

    // 检查内存使用
    const memory = this.metrics.get('memory')
    if (memory && memory.usage > 80) {
      recommendations.push({
        type: 'memory',
        severity: 'high',
        title: '内存使用率过高',
        description: `当前内存使用率${memory.usage.toFixed(1)}%`,
        action: '检查内存泄漏、优化数据结构、及时清理无用对象'
      })
    }

    return recommendations
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.stopMonitoring()
    if (this.memoryCleanup) {
      this.memoryCleanup()
      this.memoryCleanup = null
    }
    this.metrics.clear()
  }
}

/**
 * 组件性能优化工具
 */
export class ComponentOptimizer {
  constructor() {
    this.componentMetrics = new Map()
  }

  /**
   * 监控组件渲染性能
   */
  measureComponentRender(componentName, renderFunction) {
    const startTime = performance.now()

    const result = renderFunction()

    const endTime = performance.now()
    const duration = endTime - startTime

    if (!this.componentMetrics.has(componentName)) {
      this.componentMetrics.set(componentName, {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        maxTime: 0,
        minTime: Infinity
      })
    }

    const metrics = this.componentMetrics.get(componentName)
    metrics.count++
    metrics.totalTime += duration
    metrics.averageTime = metrics.totalTime / metrics.count
    metrics.maxTime = Math.max(metrics.maxTime, duration)
    metrics.minTime = Math.min(metrics.minTime, duration)

    // 记录慢渲染
    if (duration > 16) { // 超过一帧的时间
      console.warn(`组件 ${componentName} 渲染耗时 ${duration.toFixed(2)}ms`)
    }

    return result
  }

  /**
   * 获取组件性能报告
   */
  getComponentReport() {
    const report = {}

    for (const [component, metrics] of this.componentMetrics.entries()) {
      report[component] = {
        ...metrics,
        recommendation: this.getComponentRecommendation(component, metrics)
      }
    }

    return report
  }

  /**
   * 获取组件优化建议
   */
  getComponentRecommendation(componentName, metrics) {
    if (metrics.averageTime > 10) {
      return {
        type: 'performance',
        severity: 'high',
        message: `${componentName} 平均渲染时间过长`,
        suggestions: [
          '使用计算属性缓存复杂计算',
          '拆分为更小的子组件',
          '使用虚拟滚动处理长列表',
          '避免在模板中使用复杂表达式'
        ]
      }
    }

    if (metrics.maxTime > 50) {
      return {
        type: 'performance',
        severity: 'medium',
        message: `${componentName} 存在偶发性慢渲染`,
        suggestions: [
          '检查是否有条件渲染导致的性能问题',
          '考虑使用防抖或节流优化事件处理',
          '优化props传递，避免不必要的响应式更新'
        ]
      }
    }

    return null
  }

  /**
   * 重置统计数据
   */
  reset() {
    this.componentMetrics.clear()
  }
}

/**
 * 图片懒加载优化器
 */
export class ImageLazyLoader {
  constructor(options = {}) {
    this.options = {
      rootMargin: '50px',
      threshold: 0.1,
      loadingClass: 'lazy-loading',
      loadedClass: 'lazy-loaded',
      ...options
    }

    this.observer = null
    this.images = new Set()
  }

  /**
   * 初始化懒加载
   */
  init() {
    if (!('IntersectionObserver' in window)) {
      console.warn('IntersectionObserver not supported, falling back to lazy loading')
      this.fallbackInit()
      return
    }

    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        rootMargin: this.options.rootMargin,
        threshold: this.options.threshold
      }
    )

    this.observeImages()
  }

  /**
   * 观察图片元素
   */
  observeImages() {
    const images = document.querySelectorAll('img[data-src]')
    images.forEach(img => {
      this.images.add(img)
      this.observer.observe(img)
      img.classList.add(this.options.loadingClass)
    })
  }

  /**
   * 处理图片进入视口
   */
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target
        this.loadImage(img)
        this.observer.unobserve(img)
        this.images.delete(img)
      }
    })
  }

  /**
   * 加载图片
   */
  loadImage(img) {
    const src = img.dataset.src
    if (!src) return

    img.src = src

    img.onload = () => {
      img.classList.remove(this.options.loadingClass)
      img.classList.add(this.options.loadedClass)
      img.removeAttribute('data-src')
    }

    img.onerror = () => {
      img.classList.remove(this.options.loadingClass)
      img.classList.add('lazy-error')
      console.warn('Failed to load image:', src)
    }
  }

  /**
   * 回退方案（不支持IntersectionObserver时）
   */
  fallbackInit() {
    const images = document.querySelectorAll('img[data-src]')

    const lazyLoad = () => {
      images.forEach(img => {
        if (this.isElementInViewport(img)) {
          this.loadImage(img)
        }
      })
    }

    // 使用滚动事件和节流
    let ticking = false
    const scrollHandler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          lazyLoad()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', scrollHandler)
    window.addEventListener('resize', lazyLoad)
    window.addEventListener('orientationchange', lazyLoad)

    // 初始加载
    lazyLoad()
  }

  /**
   * 检查元素是否在视口中
   */
  isElementInViewport(el) {
    const rect = el.getBoundingClientRect()
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    )
  }

  /**
   * 销毁懒加载器
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect()
    }
    this.images.clear()
  }
}

/**
 * 防抖函数
 */
export function debounce(func, wait, immediate = false) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }
    const callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) func(...args)
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
 */
export function throttle(func, limit) {
  let inThrottle
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
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
 * 请求空闲时执行函数
 */
export function runWhenIdle(callback, timeout = 5000) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback, { timeout })
  } else {
    // 回退方案
    setTimeout(callback, 1)
  }
}

/**
 * 创建性能优化的异步组件
 */
export function createLazyComponent(importFunc, loadingComponent, errorComponent, delay = 200) {
  return () => ({
    component: importFunc(),
    loading: loadingComponent,
    error: errorComponent,
    delay,
    timeout: 10000 // 10秒超时
  })
}

/**
 * 监控Web Vitals
 */
export function observeWebVitals(callback) {
  if (!('PerformanceObserver' in window)) return

  // FCP
  const observerFCP = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint')
    if (fcpEntry) {
      callback({ name: 'FCP', value: fcpEntry.startTime, rating: getRating('FCP', fcpEntry.startTime) })
    }
  })

  observerFCP.observe({ entryTypes: ['paint'] })

  // LCP
  const observerLCP = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const lcpEntry = entries[entries.length - 1]
    if (lcpEntry) {
      callback({ name: 'LCP', value: lcpEntry.startTime, rating: getRating('LCP', lcpEntry.startTime) })
    }
  })

  observerLCP.observe({ entryTypes: ['largest-contentful-paint'] })

  // CLS
  let clsValue = 0
  const observerCLS = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) {
        clsValue += entry.value
      }
    }
    callback({ name: 'CLS', value: clsValue, rating: getRating('CLS', clsValue) })
  })

  observerCLS.observe({ entryTypes: ['layout-shift'] })

  // FID
  const observerFID = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    entries.forEach(entry => {
      if (entry.entryType === 'first-input') {
        callback({ name: 'FID', value: entry.processingStart - entry.startTime, rating: getRating('FID', entry.processingStart - entry.startTime) })
      }
    })
  })

  observerFID.observe({ entryTypes: ['first-input'] })
}

/**
 * 获取Web Vitals评级
 */
function getRating(name, value) {
  const thresholds = {
    FCP: [2000, 4000],
    LCP: [2500, 4000],
    CLS: [0.1, 0.25],
    FID: [100, 300]
  }

  const [good, needsImprovement] = thresholds[name] || [0, 0]

  if (value <= good) return 'good'
  if (value <= needsImprovement) return 'needs-improvement'
  return 'poor'
}

// 创建默认实例
export const performanceMonitor = new PerformanceMonitor()
export const componentOptimizer = new ComponentOptimizer()

// 导出工具函数
export default {
  PerformanceMonitor,
  ComponentOptimizer,
  ImageLazyLoader,
  debounce,
  throttle,
  runWhenIdle,
  createLazyComponent,
  observeWebVitals,
  performanceMonitor,
  componentOptimizer
}
