/**
 * 性能优化工具
 * 包括图片压缩、虚拟滚动、懒加载等
 */
import { ElMessage } from 'element-plus'

/**
 * 图片压缩工具
 */
export const imageCompression = {
  /**
   * 压缩图片
   * @param {File} file 原始图片文件
   * @param {Object} options 压缩选项
   * @returns {Promise<Blob>} 压缩后的图片Blob
   */
  async compress(file, options = {}) {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      outputType = 'image/jpeg'
    } = options

    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        const img = new Image()

        img.onload = () => {
          // 创建canvas进行压缩
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')

          // 计算压缩后的尺寸
          let { width, height } = this.calculateSize(
            img.width,
            img.height,
            maxWidth,
            maxHeight
          )

          canvas.width = width
          canvas.height = height

          // 绘制图片
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, width, height)
          ctx.drawImage(img, 0, 0, width, height)

          // 转换为Blob
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name, {
                type: outputType,
                lastModified: Date.now()
              }))
            } else {
              reject(new Error('压缩失败'))
            }
          }, outputType, quality)
        }

        img.onerror = () => {
          reject(new Error('图片加载失败'))
        }

        img.src = e.target.result
      }

      reader.onerror = () => {
        reject(new Error('文件读取失败'))
      }

      reader.readAsDataURL(file)
    })
  },

  /**
   * 计算压缩后的尺寸
   */
  calculateSize(width, height, maxWidth, maxHeight) {
    let newWidth = width
    let newHeight = height

    // 按比例缩放
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height)
      newWidth = width * ratio
      newHeight = height * ratio
    }

    return { width: newWidth, height: newHeight }
  },

  /**
   * 批量压缩图片
   * @param {File[]} files 文件数组
   * @param {Object} options 压缩选项
   * @returns {Promise<File[]>} 压缩后的文件数组
   */
  async compressBatch(files, options = {}) {
    const compressed = []

    for (const file of files) {
      try {
        const compressedFile = await this.compress(file, options)
        compressed.push(compressedFile)

        // 显示压缩比
        const saved = ((file.size - compressedFile.size) / file.size * 100).toFixed(1)
        console.log(\`\${file.name}: \${file.size}B → \${compressedFile.size}B (节省\${saved}%)\`)
      } catch (error) {
        console.error(\`压缩\${file.name}失败:\`, error)
        // 压缩失败则使用原文件
        compressed.push(file)
      }
    }

    return compressed
  },

  /**
   * 压缩图片为Base64
   * @param {string} base64 Base64字符串
   * @param {Object} options 压缩选项
   * @returns {Promise<string>} 压缩后的Base64字符串
   */
  async compressBase64(base64, options = {}) {
    return new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        const { width, height } = this.calculateSize(
          img.width,
          img.height,
          options.maxWidth || 1920,
          options.maxHeight || 1080
        )

        canvas.width = width
        canvas.height = height

        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        resolve(canvas.toDataURL(options.outputType || 'image/jpeg', options.quality || 0.8))
      }

      img.onerror = () => {
        reject(new Error('图片加载失败'))
      }

      img.src = base64
    })
  }
}

/**
 * 虚拟滚动工具
 */
export const virtualScroll = {
  /**
   * 创建虚拟滚动列表
   * @param {Object} options 配置选项
   */
  createVirtualList(options = {}) {
    const {
      itemHeight = 50,      // 每项高度
      containerHeight = 600, // 容器高度
      bufferSize = 10,       // 缓冲区大小
      data = []              // 数据列表
    } = options

    const state = {
      scrollTop: 0,
      startIndex: 0,
      endIndex: Math.ceil(containerHeight / itemHeight) + bufferSize,
      visibleData: []
    }

    // 计算可见范围
    const calculateRange = () => {
      state.startIndex = Math.max(0, Math.floor(state.scrollTop / itemHeight) - bufferSize / 2)
      state.endIndex = Math.min(
        data.length,
        state.startIndex + Math.ceil(containerHeight / itemHeight) + bufferSize
      )
    }

    // 获取可见数据
    const getVisibleData = () => {
      calculateRange()
      return data.slice(state.startIndex, state.endIndex)
    }

    // 滚动处理
    const handleScroll = (scrollTop) => {
      state.scrollTop = scrollTop
      state.visibleData = getVisibleData()
    }

    return {
      state,
      handleScroll,
      getVisibleData
    }
  }
}

/**
 * 懒加载工具
 */
export const lazyLoad = {
  /**
   * 图片懒加载指令
   */
  imageObserver: null,

  initImageLazyLoad() {
    if ('IntersectionObserver' in window) {
      this.imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target
            const src = img.dataset.src

            if (src) {
              img.src = src
              img.classList.add('loaded')
              this.imageObserver.unobserve(img)
            }
          }
        })
      }, {
        rootMargin: '50px'
      })

      // 观察所有懒加载图片
      document.querySelectorAll('img[data-src]').forEach(img => {
        this.imageObserver.observe(img)
      })
    } else {
      // 不支持IntersectionObserver时直接加载
      document.querySelectorAll('img[data-src]').forEach(img => {
        img.src = img.dataset.src
      })
    }
  },

  /**
   * 组件懒加载
   */
  loadComponent(componentPath) {
    return () => import(/* webpackChunkName: "[request]" */ \`@/views/\${componentPath}.vue\`)
  },

  /**
   * 路由懒加载
   */
  loadRoute(routePath) {
    return () => import(/* webpackChunkName: "[request]" */ \`@/views/\${routePath}.vue\`)
  }
}

/**
 * 缓存管理工具
 */
export const cacheManager = {
  /**
   * 设置缓存
   * @param {string} key 缓存键
   * @param {any} value 缓存值
   * @param {number} ttl 过期时间(秒)
   */
  set(key, value, ttl = 3600) {
    try {
      const item = {
        value,
        expiry: Date.now() + ttl * 1000
      }

      if (ttl === 0) {
        // 永不过期
        localStorage.setItem(key, JSON.stringify({ value, expiry: null }))
      } else {
        localStorage.setItem(key, JSON.stringify(item))
      }
    } catch (error) {
      console.error('Set cache error:', error)
    }
  },

  /**
   * 获取缓存
   * @param {string} key 缓存键
   * @returns {any} 缓存值
   */
  get(key) {
    try {
      const itemStr = localStorage.getItem(key)
      if (!itemStr) return null

      const item = JSON.parse(itemStr)

      // 检查是否过期
      if (item.expiry && Date.now() > item.expiry) {
        localStorage.removeItem(key)
        return null
      }

      return item.value
    } catch (error) {
      console.error('Get cache error:', error)
      return null
    }
  },

  /**
   * 删除缓存
   * @param {string} key 缓存键
   */
  remove(key) {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Remove cache error:', error)
    }
  },

  /**
   * 清空所有缓存
   */
  clear() {
    try {
      localStorage.clear()
    } catch (error) {
      console.error('Clear cache error:', error)
    }
  },

  /**
   * 获取缓存大小
   */
  getCacheSize() {
    try {
      let total = 0
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length + key.length
        }
      }
      return total
    } catch (error) {
      return 0
    }
  },

  /**
   * 清理过期缓存
   */
  clearExpired() {
    try {
      const now = Date.now()
      let cleared = 0

      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          try {
            const item = JSON.parse(localStorage[key])
            if (item.expiry && now > item.expiry) {
              localStorage.removeItem(key)
              cleared++
            }
          } catch (e) {
            // 无法解析的项目,可能是旧格式,保留
          }
        }
      }

      console.log(\`清理了\${cleared}个过期缓存项\`)
      return cleared
    } catch (error) {
      console.error('Clear expired cache error:', error)
      return 0
    }
  }
}

/**
 * 性能监控工具
 */
export const performanceMonitor = {
  /**
   * 记录性能指标
   */
  mark(metricName) {
    if (performance && performance.mark) {
      performance.mark(metricName)
    }
  },

  /**
   * 测量性能
   */
  measure(startMark, endMark, metricName) {
    if (performance && performance.measure) {
      try {
        performance.measure(metricName, startMark, endMark)
        const measure = performance.getEntriesByName(metricName)[0]

        console.log(\`[性能] \${metricName}: \${measure.duration.toFixed(2)}ms\`)

        return measure.duration
      } catch (error) {
        console.error('Measure performance error:', error)
      }
    }
  },

  /**
   * 获取性能统计
   */
  getStats() {
    if (!performance || !performance.memory) {
      return null
    }

    return {
      memory: {
        used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
        total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
        limit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
      },
      timing: performance.timing ? {
        domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        load: performance.timing.loadEventEnd - performance.timing.navigationStart
      } : null
    }
  },

  /**
   * 监控长任务
   */
  observeLongTasks(threshold = 50) {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > threshold) {
            console.warn(\`[长任务] \${entry.name}: \${entry.duration}ms\`)
          }
        }
      })

      observer.observe({ entryTypes: ['measure'] })

      return observer
    }
  }
}

/**
 * 请求去重工具
 */
export const requestDeduplication = {
  pendingRequests: new Map(),

  /**
   * 发送去重请求
   * @param {string} key 请求唯一标识
   * @param {Function} requestFn 请求函数
   */
  async send(key, requestFn) {
    // 检查是否有相同的请求正在进行
    if (this.pendingRequests.has(key)) {
      console.log(\`[去重] 使用缓存的请求: \${key}\`)
      return this.pendingRequests.get(key)
    }

    // 创建新请求
    const promise = requestFn().finally(() => {
      // 请求完成后删除
      this.pendingRequests.delete(key)
    })

    // 存储请求
    this.pendingRequests.set(key, promise)

    return promise
  },

  /**
   * 清空所有待处理请求
   */
  clear() {
    this.pendingRequests.clear()
  }
}

export default {
  imageCompression,
  virtualScroll,
  lazyLoad,
  cacheManager,
  performanceMonitor,
  requestDeduplication
}
