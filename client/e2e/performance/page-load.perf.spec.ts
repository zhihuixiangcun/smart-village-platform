import { test, expect } from '@playwright/test'

// 性能指标阈值配置
const PERFORMANCE_THRESHOLDS = {
  FCP: 2000, // First Contentful Paint (ms)
  LCP: 2500, // Largest Contentful Paint (ms)
  FID: 100, // First Input Delay (ms)
  CLS: 0.1, // Cumulative Layout Shift
  TTI: 3500, // Time to Interactive (ms)
  TBT: 300, // Total Blocking Time (ms)
  resourceLoadTime: 5000, // 资源加载时间 (ms)
  memoryUsage: 50 * 1024 * 1024 // 内存使用 (50MB)
}

test.describe('页面加载性能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 启用性能监控
    await page.addInitScript(() => {
      // 监听 Performance Observer
      if ('PerformanceObserver' in window) {
        // 监控导航时间
        const navigationObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry) => {
            if (entry.entryType === 'navigation') {
              window.performanceData = {
                navigation: entry
              }
            }
          })
        })
        navigationObserver.observe({ entryTypes: ['navigation'] })

        // 监控Paint时间
        const paintObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          window.performanceData = window.performanceData || {}
          window.performanceData.paints = entries
        })
        paintObserver.observe({ entryTypes: ['paint'] })

        // 监控LCP
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          window.performanceData = window.performanceData || {}
          window.performanceData.lcp = entries[entries.length - 1]
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

        // 监控CLS
        let clsValue = 0
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
            }
          })
          window.performanceData = window.performanceData || {}
          window.performanceData.cls = clsValue
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })

        // 监控FID
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          window.performanceData = window.performanceData || {}
          window.performanceData.fid = entries[0]
        })
        fidObserver.observe({ entryTypes: ['first-input'] })
      }
    })
  })

  test('首页加载性能', async ({ page }) => {
    // 开始性能追踪
    await page.goto('/')

    // 等待页面完全加载
    await page.waitForLoadState('networkidle')

    // 等待LCP
    await page.waitForTimeout(3000)

    // 获取性能指标
    const performanceData = await page.evaluate(() => window.performanceData || {})

    // 验证FCP (First Contentful Paint)
    const fcp = performanceData.paints?.find(p => p.name === 'first-contentful-paint')?.startTime || 0
    expect(fcp).toBeLessThan(PERFORMANCE_THRESHOLDS.FCP)
    console.log(`FCP: ${fcp.toFixed(2)}ms`)

    // 验证LCP (Largest Contentful Paint)
    const lcp = performanceData.lcp?.startTime || 0
    expect(lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.LCP)
    console.log(`LCP: ${lcp.toFixed(2)}ms`)

    // 验证导航时间
    const navigation = performanceData.navigation
    if (navigation) {
      const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
      const loadComplete = navigation.loadEventEnd - navigation.loadEventStart

      expect(domContentLoaded).toBeLessThan(1000)
      expect(loadComplete).toBeLessThan(2000)

      console.log(`DOM Content Loaded: ${domContentLoaded.toFixed(2)}ms`)
      console.log(`Load Complete: ${loadComplete.toFixed(2)}ms`)
    }

    // 验证资源加载
    const resources = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource')
      return entries.map(entry => ({
        name: entry.name,
        duration: entry.duration,
        size: entry.transferSize || 0
      }))
    })

    const slowResources = resources.filter(r => r.duration > PERFORMANCE_THRESHOLDS.resourceLoadTime)
    expect(slowResources.length).toBe(0)
    if (slowResources.length > 0) {
      console.warn('Slow resources found:', slowResources)
    }

    // 验证内存使用
    const memoryUsage = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        }
      }
      return null
    })

    if (memoryUsage) {
      expect(memoryUsage.usedJSHeapSize).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage)
      console.log(`Memory Usage: ${(memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`)
    }
  })

  test('村民管理页面性能', async ({ page }) => {
    // 开始性能追踪
    const startTime = Date.now()

    await page.goto('/residents')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('[data-testid="resident-table"]', { state: 'visible' })

    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(3000)
    console.log(`Page load time: ${loadTime}ms`)

    // 测试大数据列表渲染性能
    const renderStart = Date.now()
    await page.waitForSelector('[data-testid="resident-row"]', { state: 'visible' })
    const renderTime = Date.now() - renderStart
    expect(renderTime).toBeLessThan(1000)
    console.log(`List render time: ${renderTime}ms`)

    // 测试滚动性能
    const scrollStart = Date.now()
    await page.evaluate(() => {
      const tableBody = document.querySelector('[data-testid="resident-table-body"]')
      if (tableBody) {
        tableBody.scrollTop = tableBody.scrollHeight
      }
    })
    await page.waitForTimeout(500)
    const scrollTime = Date.now() - scrollStart
    expect(scrollTime).toBeLessThan(500)
    console.log(`Scroll time: ${scrollTime}ms`)

    // 测试搜索响应性能
    const searchStart = Date.now()
    await page.fill('[data-testid="search-input"]', '测试')
    await page.waitForTimeout(300) // 防抖时间
    const searchTime = Date.now() - searchStart
    expect(searchTime).toBeLessThan(1000)
    console.log(`Search response time: ${searchTime}ms`)
  })

  test('移动端页面性能', async ({ page, context }) => {
    // 模拟移动端网络条件
    await context.route('**/*', route => {
      // 模拟3G网络
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: route.request().url(),
        headers: {
          'Content-Length': '1024'
        }
      })
    })

    // 使用CPU节流
    await context.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100)) // 模拟100ms延迟
      await route.continue()
    })

    const startTime = Date.now()

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const mobileLoadTime = Date.now() - startTime
    expect(mobileLoadTime).toBeLessThan(5000) // 移动端允许更长的加载时间
    console.log(`Mobile load time: ${mobileLoadTime}ms`)

    // 验证首屏可见性
    const firstPaint = await page.evaluate(() => {
      const paints = performance.getEntriesByType('paint')
      const fcp = paints.find(p => p.name === 'first-contentful-paint')
      return fcp ? fcp.startTime : 0
    })

    expect(firstPaint).toBeLessThan(3000) // 移动端首屏时间要求
    console.log(`Mobile FCP: ${firstPaint.toFixed(2)}ms`)

    // 验证触摸响应性能
    const touchStart = Date.now()
    await page.tap('[data-testid="mobile-menu-btn"]')
    const touchResponseTime = Date.now() - touchStart
    expect(touchResponseTime).toBeLessThan(100)
    console.log(`Touch response time: ${touchResponseTime}ms`)
  })

  test('图片加载性能', async ({ page }) => {
    await page.goto('/residents/detail/resident-001')
    await page.waitForLoadState('networkidle')

    // 监控图片加载
    const imageMetrics = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'))
      return images.map(img => ({
        src: img.src,
        loaded: img.complete && img.naturalHeight !== 0,
        size: img.naturalWidth * img.naturalHeight,
        loadTime: img.dataset.loadTime || null
      }))
    })

    // 验证所有图片都已加载
    const unloadedImages = imageMetrics.filter(img => !img.loaded)
    expect(unloadedImages.length).toBe(0)

    // 验证图片大小合理
    const largeImages = imageMetrics.filter(img => img.size > 1024 * 1024) // 1MB
    expect(largeImages.length).toBe(0)

    // 测试懒加载
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(1000)

    const lazyLoadedImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img[data-src]'))
      return images.map(img => ({
        src: img.getAttribute('data-src'),
        loaded: img.src !== img.getAttribute('data-src')
      }))
    })

    console.log(`Total images: ${imageMetrics.length}`)
    console.log(`Lazy loaded images: ${lazyLoadedImages.filter(img => img.loaded).length}`)
  })

  test('API请求性能', async ({ page }) => {
    // 监控所有API请求
    const apiRequests = []

    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          startTime: Date.now()
        })
      }
    })

    page.on('response', response => {
      if (response.url().includes('/api/')) {
        const request = apiRequests.find(req => req.url === response.url())
        if (request) {
          request.endTime = Date.now()
          request.duration = request.endTime - request.startTime
          request.status = response.status()
        }
      }
    })

    await page.goto('/residents')
    await page.waitForLoadState('networkidle')

    // 验证API响应时间
    const slowApis = apiRequests.filter(req => req.duration > 2000)
    expect(slowApis.length).toBe(0)

    // 打印API性能报告
    console.log('API Performance Report:')
    apiRequests.forEach(req => {
      console.log(`  ${req.method} ${req.url.split('/').pop()} - ${req.duration}ms`)
    })

    // 验证并发请求
    const maxConcurrent = Math.max(...apiRequests.map(req =>
      apiRequests.filter(r =>
        r.startTime <= req.startTime &&
        (!r.endTime || r.endTime >= req.startTime)
      ).length
    ))
    expect(maxConcurrent).toBeLessThan(10) // 限制并发请求数
    console.log(`Max concurrent requests: ${maxConcurrent}`)
  })

  test('内存泄漏检测', async ({ page }) => {
    // 多次操作以检测内存泄漏
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize
      }
      return 0
    })

    // 执行多次页面操作
    for (let i = 0; i < 10; i++) {
      await page.goto('/residents')
      await page.waitForLoadState('networkidle')

      // 执行一些操作
      await page.click('[data-testid="search-input"]')
      await page.fill('[data-testid="search-input"]', `test${i}`)
      await page.waitForTimeout(300)

      // 导航到其他页面
      await page.goto('/feedback')
      await page.waitForLoadState('networkidle')

      // 返回列表页
      await page.goBack()
      await page.waitForLoadState('networkidle')
    }

    // 强制垃圾回收
    await page.evaluate(() => {
      if (window.gc) {
        window.gc()
      }
    })

    // 检查最终内存使用
    const finalMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize
      }
      return 0
    })

    const memoryIncrease = finalMemory - initialMemory
    const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100

    // 内存增长不应超过20%
    expect(memoryIncreasePercent).toBeLessThan(20)

    console.log(`Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`)
    console.log(`Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`)
    console.log(`Memory increase: ${(memoryIncreasePercent).toFixed(2)}%`)
  })

  test('Web Vitals综合评分', async ({ page }) => {
    await page.goto('/')

    // 获取所有性能指标
    const metrics = await page.evaluate(() => {
      const data = window.performanceData || {}

      return {
        fcp: data.paints?.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        lcp: data.lcp?.startTime || 0,
        cls: data.cls || 0,
        fid: data.fid?.processingStart - data.fib?.startTime || 0
      }
    })

    // 计算综合评分
    let score = 100

    // FCP评分 (0-2000: 100分, 2000-4000: 50-100分, >4000: 0分)
    if (metrics.fcp > 4000) score -= 25
    else if (metrics.fcp > 2000) score -= (metrics.fcp - 2000) / 80

    // LCP评分 (0-2500: 100分, 2500-4000: 50-100分, >4000: 0分)
    if (metrics.lcp > 4000) score -= 25
    else if (metrics.lcp > 2500) score -= (metrics.lcp - 2500) / 60

    // CLS评分 (0-0.1: 100分, 0.1-0.25: 50-100分, >0.25: 0分)
    if (metrics.cls > 0.25) score -= 25
    else if (metrics.cls > 0.1) score -= (metrics.cls - 0.1) * 167

    // FID评分 (0-100: 100分, 100-300: 50-100分, >300: 0分)
    if (metrics.fid > 300) score -= 25
    else if (metrics.fid > 100) score -= (metrics.fid - 100) / 8

    expect(score).toBeGreaterThan(75) // 期望得分超过75分

    console.log(`Performance Metrics:`)
    console.log(`  FCP: ${metrics.fcp.toFixed(2)}ms`)
    console.log(`  LCP: ${metrics.lcp.toFixed(2)}ms`)
    console.log(`  CLS: ${metrics.cls.toFixed(4)}`)
    console.log(`  FID: ${metrics.fid.toFixed(2)}ms`)
    console.log(`Overall Score: ${score.toFixed(1)}/100`)
  })
})