// 移动端性能优化工具

// 图片懒加载
export class LazyImageLoader {
  constructor(options = {}) {
    this.options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
      ...options
    }

    this.observer = null
    this.loadedImages = new WeakSet()
  }

  observe(img) {
    if (!this.observer) {
      this.observer = new IntersectionObserver(this.handleIntersection.bind(this), {
        root: this.options.root,
        rootMargin: this.options.rootMargin,
        threshold: this.options.threshold
      })
    }

    // 如果图片已经在视口中，立即加载
    if (this.isInViewport(img)) {
      this.loadImage(img)
    } else {
      this.observer.observe(img)
    }
  }

  unobserve(img) {
    if (this.observer) {
      this.observer.unobserve(img)
    }
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.loadImage(entry.target)
        this.observer.unobserve(entry.target)
      }
    })
  }

  isInViewport(img) {
    const rect = img.getBoundingClientRect()
    const windowHeight = window.innerHeight || document.documentElement.clientHeight
    const windowWidth = window.innerWidth || document.documentElement.clientWidth

    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= windowHeight &&
      rect.right <= windowWidth
    )
  }

  loadImage(img) {
    if (this.loadedImages.has(img)) return

    const src = img.dataset.src
    if (!src) return

    // 加载中显示占位图
    if (img.dataset.placeholder) {
      img.src = img.dataset.placeholder
    }

    // 创建新图片对象预加载
    const newImg = new Image()
    newImg.onload = () => {
      img.src = src
      img.classList.add('lazy-loaded')
      this.loadedImages.add(img)
    }
    newImg.onerror = () => {
      img.classList.add('lazy-error')
    }
    newImg.src = src
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
  }
}

// 虚拟列表
export class VirtualList {
  constructor(container, options = {}) {
    this.container = container
    this.options = {
      itemHeight: 50,
      bufferSize: 5,
      ...options
    }

    this.items = []
    this.visibleItems = []
    this.scrollTop = 0
    this.containerHeight = 0
    this.startIndex = 0
    this.endIndex = 0

    this.init()
  }

  init() {
    this.updateContainerHeight()
    this.bindEvents()
  }

  setItems(items) {
    this.items = items
    this.update()
  }

  updateContainerHeight() {
    this.containerHeight = this.container.clientHeight
  }

  update() {
    this.startIndex = Math.max(
      0,
      Math.floor(this.scrollTop / this.options.itemHeight) - this.options.bufferSize
    )
    this.endIndex = Math.min(
      this.items.length - 1,
      Math.ceil((this.scrollTop + this.containerHeight) / this.options.itemHeight) + this.options.bufferSize
    )

    this.visibleItems = this.items.slice(this.startIndex, this.endIndex + 1)
    this.render()
  }

  render() {
    // 设置容器高度
    this.container.style.height = `${this.items.length * this.options.itemHeight}px`
    this.container.style.position = 'relative'

    // 清除现有内容
    const existingItems = this.container.querySelectorAll('.virtual-item')
    existingItems.forEach(item => item.remove())

    // 渲染可见项
    this.visibleItems.forEach((item, index) => {
      const itemEl = document.createElement('div')
      itemEl.className = 'virtual-item'
      itemEl.style.position = 'absolute'
      itemEl.style.top = `${(this.startIndex + index) * this.options.itemHeight}px`
      itemEl.style.width = '100%'
      itemEl.style.height = `${this.options.itemHeight}px`

      if (typeof this.options.renderItem === 'function') {
        itemEl.innerHTML = this.options.renderItem(item, this.startIndex + index)
      } else {
        itemEl.textContent = item
      }

      this.container.appendChild(itemEl)
    })
  }

  bindEvents() {
    this.container.addEventListener('scroll', this.handleScroll.bind(this), { passive: true })
    window.addEventListener('resize', this.handleResize.bind(this))
  }

  handleScroll() {
    this.scrollTop = this.container.scrollTop
    requestAnimationFrame(() => this.update())
  }

  handleResize() {
    this.updateContainerHeight()
    this.update()
  }

  destroy() {
    this.container.removeEventListener('scroll', this.handleScroll)
    window.removeEventListener('resize', this.handleResize)
  }
}

// 防抖
export function debounce(func, wait = 300) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// 节流
export function throttle(func, limit = 300) {
  let inThrottle
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// 预加载资源
export class ResourcePreloader {
  constructor() {
    this.preloadedResources = new Set()
  }

  preloadImage(src) {
    if (this.preloadedResources.has(src)) return Promise.resolve()

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        this.preloadedResources.add(src)
        resolve()
      }
      img.onerror = reject
      img.src = src
    })
  }

  preloadScript(src) {
    if (this.preloadedResources.has(src)) return Promise.resolve()

    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.onload = () => {
        this.preloadedResources.add(src)
        resolve()
      }
      script.onerror = reject
      script.src = src
      document.head.appendChild(script)
    })
  }

  preloadStyle(href) {
    if (this.preloadedResources.has(href)) return Promise.resolve()

    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'style'
      link.onload = () => {
        this.preloadedResources.add(href)
        resolve()
      }
      link.onerror = reject
      link.href = href
      document.head.appendChild(link)
    })
  }

  preloadFont(src) {
    if (this.preloadedResources.has(src)) return Promise.resolve()

    return new Promise((resolve, reject) => {
      const font = new FontFace('PreloadedFont', `url(${src})`)
      font.load().then(() => {
        document.fonts.add(font)
        this.preloadedResources.add(src)
        resolve()
      }).catch(reject)
    })
  }
}

// 性能监控
export class PerformanceMonitor {
  constructor() {
    this.metrics = {}
    this.observers = []
  }

  // 监控页面加载性能
  measurePageLoad() {
    if (!window.performance || !window.performance.timing) return

    const timing = window.performance.timing
    const navigation = window.performance.navigation

    this.metrics = {
      // DNS查询时间
      dnsTime: timing.domainLookupEnd - timing.domainLookupStart,
      // TCP连接时间
      tcpTime: timing.connectEnd - timing.connectStart,
      // 请求响应时间
      requestTime: timing.responseEnd - timing.requestStart,
      // DOM解析时间
      domParseTime: timing.domComplete - timing.domLoading,
      // 白屏时间
      whiteScreenTime: timing.responseStart - timing.navigationStart,
      // 首屏时间
      firstScreenTime: timing.domContentLoadedEventEnd - timing.navigationStart,
      // 页面加载总时间
      loadTime: timing.loadEventEnd - timing.navigationStart,
      // 页面重定向时间
      redirectTime: timing.redirectEnd - timing.redirectStart,
      // 卸载时间
      unloadTime: timing.unloadEventEnd - timing.unloadEventStart
    }

    return this.metrics
  }

  // 监控长任务
  observeLongTasks() {
    if (!window.PerformanceObserver) return

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        if (entry.duration > 50) {
          console.warn('Long task detected:', {
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime
          })
        }
      })
    })

    try {
      observer.observe({ entryTypes: ['longtask'] })
      this.observers.push(observer)
    } catch (e) {
      console.warn('Long task observation not supported')
    }
  }

  // 监控资源加载
  observeResourceTiming() {
    if (!window.PerformanceObserver) return

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const resources = entries.map(entry => ({
        name: entry.name,
        type: this.getResourceType(entry.name),
        duration: entry.duration,
        size: entry.transferSize || 0
      }))

      // 找出加载时间最长的资源
      const slowResources = resources
        .filter(r => r.duration > 1000)
        .sort((a, b) => b.duration - a.duration)

      if (slowResources.length > 0) {
        console.warn('Slow resources:', slowResources)
      }
    })

    try {
      observer.observe({ entryTypes: ['resource'] })
      this.observers.push(observer)
    } catch (e) {
      console.warn('Resource timing observation not supported')
    }
  }

  getResourceType(url) {
    const extension = url.split('.').pop().toLowerCase()
    const typeMap = {
      'js': 'script',
      'css': 'stylesheet',
      'png': 'image',
      'jpg': 'image',
      'jpeg': 'image',
      'gif': 'image',
      'svg': 'image',
      'woff': 'font',
      'woff2': 'font',
      'ttf': 'font'
    }
    return typeMap[extension] || 'other'
  }

  // 监控内存使用
  observeMemory() {
    if (!window.performance || !window.performance.memory) return

    const memory = window.performance.memory
    this.metrics.memory = {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      usage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit * 100).toFixed(2) + '%'
    }

    return this.metrics.memory
  }

  // 监控FPS
  observeFPS(callback) {
    let lastTime = performance.now()
    let frames = 0

    const measureFPS = () => {
      frames++
      const currentTime = performance.now()

      if (currentTime >= lastTime + 1000) {
        const fps = Math.round(frames * 1000 / (currentTime - lastTime))
        callback(fps)

        frames = 0
        lastTime = currentTime
      }

      requestAnimationFrame(measureFPS)
    }

    requestAnimationFrame(measureFPS)
  }

  // 停止所有观察
  disconnect() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

// 网络状态监控
export class NetworkMonitor {
  constructor() {
    this.isOnline = navigator.onLine
    this.connectionType = this.getConnectionType()
    this.listeners = []
    this.bindEvents()
  }

  getConnectionType() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    return connection ? connection.effectiveType : 'unknown'
  }

  bindEvents() {
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (connection) {
      connection.addEventListener('change', this.handleConnectionChange.bind(this))
    }
  }

  handleOnline() {
    this.isOnline = true
    this.emit('online')
  }

  handleOffline() {
    this.isOnline = false
    this.emit('offline')
  }

  handleConnectionChange() {
    const newType = this.getConnectionType()
    if (newType !== this.connectionType) {
      this.connectionType = newType
      this.emit('connectionChange', newType)
    }
  }

  on(event, callback) {
    this.listeners.push({ event, callback })
  }

  off(event, callback) {
    this.listeners = this.listeners.filter(
      listener => !(listener.event === event && listener.callback === callback)
    )
  }

  emit(event, data) {
    this.listeners
      .filter(listener => listener.event === event)
      .forEach(listener => listener.callback(data))
  }

  destroy() {
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (connection) {
      connection.removeEventListener('change', this.handleConnectionChange)
    }

    this.listeners = []
  }
}

// 缓存管理
export class CacheManager {
  constructor(name = 'app-cache', version = 1) {
    this.name = name
    this.version = version
    this.storageKey = `${name}-v${version}`
  }

  set(key, value, ttl = null) {
    const item = {
      value,
      timestamp: Date.now(),
      ttl: ttl ? Date.now() + ttl : null
    }

    try {
      localStorage.setItem(`${this.storageKey}-${key}`, JSON.stringify(item))
    } catch (e) {
      // 清理过期缓存
      this.clearExpired()
      try {
        localStorage.setItem(`${this.storageKey}-${key}`, JSON.stringify(item))
      } catch (e) {
        console.warn('Cache storage is full')
      }
    }
  }

  get(key) {
    try {
      const item = localStorage.getItem(`${this.storageKey}-${key}`)
      if (!item) return null

      const data = JSON.parse(item)

      // 检查是否过期
      if (data.ttl && Date.now() > data.ttl) {
        this.delete(key)
        return null
      }

      return data.value
    } catch (e) {
      return null
    }
  }

  delete(key) {
    localStorage.removeItem(`${this.storageKey}-${key}`)
  }

  clear() {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(this.storageKey)) {
        localStorage.removeItem(key)
      }
    })
  }

  clearExpired() {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(this.storageKey)) {
        try {
          const item = JSON.parse(localStorage.getItem(key))
          if (item.ttl && Date.now() > item.ttl) {
            localStorage.removeItem(key)
          }
        } catch (e) {
          localStorage.removeItem(key)
        }
      }
    })
  }

  // 获取缓存大小
  size() {
    let size = 0
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(this.storageKey)) {
        size += localStorage.getItem(key).length
      }
    })
    return size
  }
}

// 图片压缩
export class ImageCompressor {
  static compress(file, options = {}) {
    const {
      quality = 0.8,
      maxWidth = 1920,
      maxHeight = 1920,
      outputType = 'file'
    } = options

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // 计算新尺寸
        let { width, height } = img
        const ratio = width / height

        if (width > maxWidth) {
          width = maxWidth
          height = width / ratio
        }

        if (height > maxHeight) {
          height = maxHeight
          width = height * ratio
        }

        // 设置画布尺寸
        canvas.width = width
        canvas.height = height

        // 绘制图片
        ctx.drawImage(img, 0, 0, width, height)

        // 转换为blob
        canvas.toBlob(
          (blob) => {
            if (outputType === 'blob') {
              resolve(blob)
            } else {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              })
              resolve(compressedFile)
            }
          },
          file.type,
          quality
        )
      }

      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }
}

// 导出所有工具
export default {
  LazyImageLoader,
  VirtualList,
  debounce,
  throttle,
  ResourcePreloader,
  PerformanceMonitor,
  NetworkMonitor,
  CacheManager,
  ImageCompressor
}