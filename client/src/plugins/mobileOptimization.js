import { LazyImageLoader, PerformanceMonitor, NetworkMonitor, CacheManager } from '../utils/mobilePerformance'

// 移动端优化插件
export default {
  install(app, options = {}) {
    const {
      enableLazyImage = true,
      enablePerformanceMonitor = false,
      enableNetworkMonitor = true,
      enableCache = true,
      cacheOptions = {}
    } = options

    // 全局混入
    app.mixin({
      created() {
        // 组件创建时的优化
        if (process.client) {
          this.$optimizeComponent()
        }
      },

      methods: {
        // 组件优化
        $optimizeComponent() {
          // 检查是否在移动端
          const isMobile = this.$isMobile()

          if (isMobile) {
            // 移动端特定优化
            this.$enableTouchOptimizations()
            this.$optimizeImages()
            this.$optimizeAnimations()
          }
        },

        // 检测移动端
        $isMobile() {
          return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          ) || window.innerWidth <= 768
        },

        // 触摸优化
        $enableTouchOptimizations() {
          // 增加触摸目标大小
          this.$nextTick(() => {
            const touchTargets = this.$el?.querySelectorAll('button, a, input, .clickable')
            touchTargets?.forEach(target => {
              target.style.minHeight = '44px'
              target.style.minWidth = '44px'
              target.style.touchAction = 'manipulation'
            })
          })
        },

        // 图片优化
        $optimizeImages() {
          if (!enableLazyImage) return

          this.$nextTick(() => {
            const lazyLoader = new LazyImageLoader()
            const images = this.$el?.querySelectorAll('img[data-src]')
            images?.forEach(img => lazyLoader.observe(img))
          })
        },

        // 动画优化
        $optimizeAnimations() {
          // 使用 will-change 提示浏览器
          const animatedElements = this.$el?.querySelectorAll('[data-animate]')
          animatedElements?.forEach(el => {
            el.style.willChange = 'transform, opacity'
          })
        },

        // 防抖
        $debounce(func, wait = 300) {
          let timeout
          return (...args) => {
            clearTimeout(timeout)
            timeout = setTimeout(() => func.apply(this, args), wait)
          }
        },

        // 节流
        $throttle(func, limit = 300) {
          let inThrottle
          return (...args) => {
            if (!inThrottle) {
              func.apply(this, args)
              inThrottle = true
              setTimeout(() => inThrottle = false, limit)
            }
          }
        }
      }
    })

    // 全局属性
    app.config.globalProperties.$isMobile = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth <= 768
    }

    // 提供注入
    app.provide('mobileOptimization', {
      isMobile: app.config.globalProperties.$isMobile,
      performanceMonitor: enablePerformanceMonitor ? new PerformanceMonitor() : null,
      networkMonitor: enableNetworkMonitor ? new NetworkMonitor() : null,
      cacheManager: enableCache ? new CacheManager(cacheOptions.name, cacheOptions.version) : null
    })

    // 初始化
    if (process.client) {
      // 性能监控
      if (enablePerformanceMonitor) {
        const monitor = new PerformanceMonitor()
        monitor.measurePageLoad()
        monitor.observeLongTasks()
        monitor.observeResourceTiming()
      }

      // 网络监控
      if (enableNetworkMonitor) {
        const networkMonitor = new NetworkMonitor()

        // 网络状态变化提示
        networkMonitor.on('offline', () => {
          console.warn('网络连接已断开')
          // 可以在这里显示离线提示
        })

        networkMonitor.on('online', () => {
          console.info('网络连接已恢复')
          // 可以在这里隐藏离线提示
        })

        app.provide('networkMonitor', networkMonitor)
      }

      // 视口优化
      optimizeViewport()

      // 触摸优化
      optimizeTouch()

      // 滚动优化
      optimizeScroll()

      // 输入优化
      optimizeInput()
    }
  }
}

// 视口优化
function optimizeViewport() {
  // 设置视口高度变量
  const setVH = () => {
    const vh = window.innerHeight * 0.01
    document.documentElement.style.setProperty('--vh', `${vh}px`)
  }

  setVH()
  window.addEventListener('resize', setVH)
  window.addEventListener('orientationchange', () => {
    setTimeout(setVH, 100)
  })

  // 检测安全区域
  const hasSafeArea = CSS.supports('padding', 'max(0px)')
  if (hasSafeArea) {
    document.documentElement.style.setProperty('--safe-area-top', 'env(safe-area-inset-top)')
    document.documentElement.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom)')
    document.documentElement.style.setProperty('--safe-area-left', 'env(safe-area-inset-left)')
    document.documentElement.style.setProperty('--safe-area-right', 'env(safe-area-inset-right)')
  }
}

// 触摸优化
function optimizeTouch() {
  // 禁用双击缩放
  let lastTouchEnd = 0
  document.addEventListener('touchend', (e) => {
    const now = Date.now()
    if (now - lastTouchEnd <= 300) {
      e.preventDefault()
    }
    lastTouchEnd = now
  }, false)

  // 优化点击延迟
  document.addEventListener('touchstart', () => {
    FastClick && FastClick.attach(document.body)
  })
}

// 滚动优化
function optimizeScroll() {
  // 平滑滚动
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault()
      const target = document.querySelector(anchor.getAttribute('href'))
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      }
    })
  })

  // 滚动性能优化
  let ticking = false
  const updateScrollPosition = () => {
    document.body.style.setProperty('--scroll-y', `${window.scrollY}px`)
    ticking = false
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateScrollPosition)
      ticking = true
    }
  })
}

// 输入优化
function optimizeInput() {
  // 防止iOS缩放
  const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea')
  inputs.forEach(input => {
    input.style.fontSize = '16px'
  })

  // 优化输入体验
  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      // 延迟滚动到视图
      setTimeout(() => {
        input.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }, 300)
    })
  })
}

// 全局样式
export const mobileStyles = `
  /* 移动端基础样式 */
  html {
    -webkit-text-size-adjust: 100%;
    -ms-text-size-adjust: 100%;
    touch-action: manipulation;
  }

  body {
    overscroll-behavior-y: contain;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* 触摸目标优化 */
  button, a, input, select, textarea {
    min-height: 44px;
    min-width: 44px;
    touch-action: manipulation;
  }

  /* 图片优化 */
  img {
    max-width: 100%;
    height: auto;
  }

  img[data-src] {
    background: #f0f0f0;
  }

  /* 滚动优化 */
  .scroll-container {
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
  }

  /* 动画优化 */
  .animate {
    will-change: transform, opacity;
  }

  /* 响应式字体 */
  @media (max-width: 768px) {
    html {
      font-size: 14px;
    }
  }

  @media (max-width: 480px) {
    html {
      font-size: 12px;
    }
  }

  /* 横屏适配 */
  @media (orientation: landscape) and (max-height: 500px) {
    .landscape-hide {
      display: none !important;
    }
  }

  /* 安全区域 */
  .safe-area-top {
    padding-top: env(safe-area-inset-top);
  }

  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }

  .safe-area-left {
    padding-left: env(safe-area-inset-left);
  }

  .safe-area-right {
    padding-right: env(safe-area-inset-right);
  }
`