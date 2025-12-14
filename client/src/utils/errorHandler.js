/**
 * 全局错误处理和日志系统
 */
import { ElMessage, ElNotification } from 'element-plus'

// 日志级别
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
}

// 当前日志级别（生产环境只记录WARN和ERROR）
const CURRENT_LOG_LEVEL = process.env.NODE_ENV === 'production' ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG

/**
 * 日志类
 */
class Logger {
  constructor() {
    this.logs = []
    this.maxLogs = 1000 // 最大日志条数
  }

  /**
   * 记录日志
   * @param {string} level 日志级别
   * @param {string} message 日志消息
   * @param {Object} extra 额外信息
   */
  log(level, message, extra = {}) {
    if (LOG_LEVELS[level] < CURRENT_LOG_LEVEL) {
      return
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      extra,
      url: window.location.href,
      userAgent: navigator.userAgent
    }

    // 添加到内存日志
    this.logs.unshift(logEntry)
    if (this.logs.length > this.maxLogs) {
      this.logs.pop()
    }

    // 控制台输出
    const consoleMethod = level.toLowerCase()
    if (console[consoleMethod]) {
      console[consoleMethod](`[${level}] ${message}`, extra)
    }

    // 发送到服务器（仅ERROR级别）
    if (level === 'ERROR') {
      this.sendToServer(logEntry)
    }
  }

  /**
   * 发送日志到服务器
   * @param {Object} logEntry 日志条目
   */
  async sendToServer(logEntry) {
    try {
      // 避免在错误处理中再次产生错误
      if (navigator.onLine) {
        await fetch('/api/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(logEntry)
        })
      }
    } catch (error) {
      console.error('发送日志到服务器失败:', error)
    }
  }

  /**
   * Debug日志
   */
  debug(message, extra) {
    this.log('DEBUG', message, extra)
  }

  /**
   * Info日志
   */
  info(message, extra) {
    this.log('INFO', message, extra)
  }

  /**
   * Warning日志
   */
  warn(message, extra) {
    this.log('WARN', message, extra)
  }

  /**
   * Error日志
   */
  error(message, extra) {
    this.log('ERROR', message, extra)
  }

  /**
   * 获取所有日志
   */
  getLogs() {
    return this.logs
  }

  /**
   * 清空日志
   */
  clearLogs() {
    this.logs = []
  }

  /**
   * 导出日志
   */
  exportLogs() {
    const blob = new Blob([JSON.stringify(this.logs, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

// 创建日志实例
const logger = new Logger()

/**
 * 错误处理类
 */
class ErrorHandler {
  constructor() {
    this.setupGlobalErrorHandlers()
  }

  /**
   * 设置全局错误处理
   */
  setupGlobalErrorHandlers() {
    // 全局JavaScript错误处理
    window.addEventListener('error', (event) => {
      this.handleJavaScriptError(event.error, event)
    })

    // 全局Promise拒绝处理
    window.addEventListener('unhandledrejection', (event) => {
      this.handlePromiseRejection(event.reason, event)
    })

    // Vue错误处理（需要在Vue应用中设置）
    this.setupVueErrorHandler()
  }

  /**
   * 设置Vue错误处理
   */
  setupVueErrorHandler() {
    // 这个方法需要在main.js中调用
    // app.config.errorHandler = (err, instance, info) => {
    //   this.handleVueError(err, instance, info)
    // }
  }

  /**
   * 处理JavaScript错误
   * @param {Error} error 错误对象
   * @param {Event} event 错误事件
   */
  handleJavaScriptError(error, event) {
    const errorInfo = {
      type: 'JavaScript Error',
      message: error?.message || '未知错误',
      stack: error?.stack,
      filename: event?.filename,
      lineno: event?.lineno,
      colno: event?.colno
    }

    logger.error('JavaScript错误', errorInfo)

    // 显示用户友好的错误信息
    if (process.env.NODE_ENV === 'development') {
      ElMessage.error(`JavaScript错误: ${errorInfo.message}`)
    } else {
      ElMessage.error('页面出现异常，请刷新重试')
    }
  }

  /**
   * 处理Promise拒绝
   * @param {any} reason 拒绝原因
   * @param {Event} event 事件对象
   */
  handlePromiseRejection(reason, event) {
    const errorInfo = {
      type: 'Promise Rejection',
      reason: reason?.message || reason,
      stack: reason?.stack
    }

    logger.error('Promise拒绝', errorInfo)

    // 阻止默认的控制台错误输出
    event.preventDefault()

    // 显示用户友好的错误信息
    if (process.env.NODE_ENV === 'development') {
      ElMessage.error(`Promise错误: ${errorInfo.reason}`)
    }
  }

  /**
   * 处理Vue错误
   * @param {Error} err 错误对象
   * @param {Object} instance Vue实例
   * @param {string} info 错误信息
   */
  handleVueError(err, instance, info) {
    const errorInfo = {
      type: 'Vue Error',
      message: err.message,
      stack: err.stack,
      componentName: instance?.$options.name || 'Unknown',
      info
    }

    logger.error('Vue错误', errorInfo)

    // 显示用户友好的错误信息
    ElMessage.error('组件渲染出错，请刷新重试')
  }

  /**
   * 处理API错误
   * @param {Error} error 错误对象
   * @param {Object} config 请求配置
   */
  handleApiError(error, config = {}) {
    const errorInfo = {
      type: 'API Error',
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: config.url,
      method: config.method,
      data: config.data
    }

    logger.error('API错误', errorInfo)

    // 根据错误状态码显示不同的错误信息
    this.showApiErrorMessage(error)
  }

  /**
   * 显示API错误信息
   * @param {Error} error 错误对象
   */
  showApiErrorMessage(error) {
    const status = error.response?.status

    switch (status) {
      case 400:
        ElMessage.error('请求参数错误')
        break
      case 401:
        ElMessage.error('登录已过期，请重新登录')
        break
      case 403:
        ElMessage.error('没有权限执行此操作')
        break
      case 404:
        ElMessage.error('请求的资源不存在')
        break
      case 408:
        ElMessage.error('请求超时，请重试')
        break
      case 429:
        ElMessage.error('请求过于频繁，请稍后重试')
        break
      case 500:
        ElMessage.error('服务器内部错误')
        break
      case 502:
        ElMessage.error('网关错误')
        break
      case 503:
        ElMessage.error('服务暂时不可用')
        break
      case 504:
        ElMessage.error('网关超时')
        break
      default:
        if (error.code === 'ECONNABORTED') {
          ElMessage.error('请求超时，请检查网络连接')
        } else if (error.code === 'ERR_NETWORK') {
          ElMessage.error('网络连接失败，请检查网络')
        } else {
          ElMessage.error(error.message || '请求失败，请重试')
        }
    }
  }

  /**
   * 处理资源加载错误
   * @param {string} url 资源URL
   * @param {string} type 资源类型
   */
  handleResourceError(url, type) {
    const errorInfo = {
      type: 'Resource Error',
      url,
      resourceType: type
    }

    logger.warn('资源加载失败', errorInfo)

    // 可以在这里实现资源重试逻辑
    this.retryResource(url, type)
  }

  /**
   * 重试加载资源
   * @param {string} url 资源URL
   * @param {string} type 资源类型
   */
  retryResource(url, type) {
    // 简单的重试逻辑
    setTimeout(() => {
      if (type === 'script') {
        const script = document.createElement('script')
        script.src = url
        document.head.appendChild(script)
      } else if (type === 'style') {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = url
        document.head.appendChild(link)
      }
    }, 1000)
  }
}

// 创建错误处理实例
const errorHandler = new ErrorHandler()

/**
 * 错误边界包装器（用于包装可能出错的代码）
 * @param {Function} fn 要执行的函数
 * @param {string} context 上下文信息
 * @returns {Function} 包装后的函数
 */
export function withErrorBoundary(fn, context = '') {
  return async function (...args) {
    try {
      return await fn.apply(this, args)
    } catch (error) {
      logger.error(`${context}执行出错`, {
        error: error.message,
        stack: error.stack,
        args
      })

      // 重新抛出错误，让调用方处理
      throw error
    }
  }
}

/**
 * 异步错误处理装饰器
 * @param {string} context 上下文信息
 */
export function asyncErrorHandler(context = '') {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args) {
      try {
        return await originalMethod.apply(this, args)
      } catch (error) {
        errorHandler.handleApiError(error, { context })
        throw error
      }
    }

    return descriptor
  }
}

/**
 * 网络状态监控
 */
class NetworkMonitor {
  constructor() {
    this.online = navigator.onLine
    this.setupEventListeners()
  }

  setupEventListeners() {
    window.addEventListener('online', () => {
      this.online = true
      logger.info('网络连接已恢复')
      ElMessage.success('网络连接已恢复')
    })

    window.addEventListener('offline', () => {
      this.online = false
      logger.warn('网络连接已断开')
      ElNotification.warning({
        title: '网络提醒',
        message: '网络连接已断开，请检查网络设置',
        duration: 0
      })
    })
  }

  isOnline() {
    return this.online
  }
}

// 创建网络监控实例
const networkMonitor = new NetworkMonitor()

/**
 * 性能监控
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {}
    this.setupPerformanceObserver()
  }

  setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      // 监控页面加载性能
      const perfObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric(entry.name, entry.duration)
        }
      })

      perfObserver.observe({ entryTypes: ['measure', 'navigation'] })
    }
  }

  recordMetric(name, value) {
    this.metrics[name] = value
    logger.debug('性能指标', { name, value })
  }

  getMetrics() {
    return this.metrics
  }

  measureFunction(name, fn) {
    return async function (...args) {
      const start = performance.now()
      try {
        const result = await fn.apply(this, args)
        const duration = performance.now() - start
        performanceMonitor.recordMetric(name, duration)
        return result
      } catch (error) {
        const duration = performance.now() - start
        performanceMonitor.recordMetric(`${name}_error`, duration)
        throw error
      }
    }
  }
}

// 创建性能监控实例
const performanceMonitor = new PerformanceMonitor()

// 导出所有功能
export {
  logger,
  errorHandler,
  networkMonitor,
  performanceMonitor,
  withErrorBoundary,
  asyncErrorHandler
}

export default {
  logger,
  errorHandler,
  networkMonitor,
  performanceMonitor,
  withErrorBoundary,
  asyncErrorHandler
}