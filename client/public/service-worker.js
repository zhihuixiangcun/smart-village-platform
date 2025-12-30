/**
 * Service Worker
 * 提供离线缓存、后台同步、推送通知等功能
 */

const CACHE_NAME = 'smart-village-v1.0.0'
const RUNTIME_CACHE = 'smart-village-runtime-v1.0.0'

// 需要预缓存的静态资源
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/js/main.js',
  '/assets/css/main.css'
]

// 需要缓存的 API 路径
const CACHE_API_PATTERNS = [
  /\/api\/v1\/announcements/,
  /\/api\/v1\/notifications/,
  /\/api\/v1\/residents/,
  /\/api\/v1\/committees/
]

// 不需要缓存的 API 路径
const NO_CACHE_PATTERNS = [
  /\/api\/auth/,
  /\/api\/upload/,
  /\/socket\.io/
]

// 安装事件
self.addEventListener('install', (event) => {
  console.log('[SW] 安装中...')

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] 预缓存静态资源')
      return cache.addAll(PRECACHE_URLS)
    }).then(() => {
      // 立即激活
      return self.skipWaiting()
    })
  )
})

// 激活事件
self.addEventListener('activate', (event) => {
  console.log('[SW] 激活中...')

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 删除旧版本缓存
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] 删除旧缓存:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      // 立即控制所有页面
      return self.clients.claim()
    })
  )
})

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 跳过非 HTTP 请求
  if (!url.protocol.startsWith('http')) {
    return
  }

  // 跳过 WebSocket
  if (url.pathname.startsWith('/socket.io')) {
    return
  }

  // API 请求处理
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request))
    return
  }

  // 静态资源请求处理
  event.respondWith(handleStaticRequest(request))
})

/**
 * 处理 API 请求
 */
async function handleAPIRequest(request) {
  const url = new URL(request.url)

  // 检查是否需要缓存
  const shouldCache = CACHE_API_PATTERNS.some(pattern => pattern.test(url.pathname))
  const shouldNotCache = NO_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))

  // GET 请求：尝试缓存优先策略
  if (request.method === 'GET' && shouldCache && !shouldNotCache) {
    return cacheFirst(request)
  }

  // POST/PUT/DELETE 请求：网络优先，失败时返回缓存或离线响应
  if (request.method !== 'GET') {
    return networkFirst(request)
  }

  // 其他请求：直接网络请求
  return fetch(request)
}

/**
 * 处理静态资源请求
 */
async function handleStaticRequest(request) {
  // 缓存优先策略
  return cacheFirst(request)
}

/**
 * 缓存优先策略
 */
async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE)

  // 先查找缓存
  const cachedResponse = await cache.match(request)

  if (cachedResponse) {
    console.log('[SW] 缓存命中:', request.url)
    // 在后台更新缓存
    updateCache(request, cache)
    return cachedResponse
  }

  // 缓存未命中，请求网络
  try {
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      console.log('[SW] 网络请求成功，缓存:', request.url)
      // 克隆响应并缓存
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.error('[SW] 网络请求失败:', request.url, error)

    // 返回离线页面或错误响应
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: '网络连接失败，请检查网络设置'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

/**
 * 网络优先策略
 */
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE)

  try {
    // 先尝试网络请求
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      console.log('[SW] 网络请求成功:', request.url)
      // 缓存成功响应
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.error('[SW] 网络请求失败，尝试缓存:', request.url)

    // 网络失败，尝试缓存
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      console.log('[SW] 使用缓存:', request.url)
      return cachedResponse
    }

    // 缓存也未命中，返回离线响应
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: '当前离线，您的请求将在联网后自动同步'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

/**
 * 更新缓存（后台）
 */
function updateCache(request, cache) {
  fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone())
    }
  }).catch((error) => {
    console.warn('[SW] 后台更新失败:', request.url, error)
  })
}

/**
 * 消息处理
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data

  switch (type) {
    case 'SKIP_WAITING':
      // 跳过等待，立即激活
      self.skipWaiting()
      break

    case 'CLEAR_CACHE':
      // 清除所有缓存
      clearAllCaches()
      break

    case 'GET_CACHE_SIZE':
      // 获取缓存大小
      getCacheSize().then(size => {
        event.ports[0].postMessage({ type: 'CACHE_SIZE', payload: size })
      })
      break

    default:
      console.warn('[SW] 未知消息类型:', type)
  }
})

/**
 * 清除所有缓存
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys()

  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  )

  console.log('[SW] 所有缓存已清除')
}

/**
 * 获取缓存大小
 */
async function getCacheSize() {
  const cacheNames = await caches.keys()
  let totalSize = 0

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName)
    const keys = await cache.keys()

    for (const request of keys) {
      const response = await cache.match(request)
      if (response) {
        const blob = await response.blob()
        totalSize += blob.size
      }
    }
  }

  return {
    bytes: totalSize,
    formatted: formatBytes(totalSize)
  }
}

/**
 * 格式化字节大小
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * 后台同步
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] 后台同步:', event.tag)

  if (event.tag === 'sync-queue') {
    event.waitUntil(syncOfflineQueue())
  }
})

/**
 * 同步离线队列
 */
async function syncOfflineQueue() {
  try {
    // 通知所有客户端开始同步
    const clients = await self.clients.matchAll()

    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_START',
        payload: { timestamp: Date.now() }
      })
    })

    console.log('[SW] 同步完成')
  } catch (error) {
    console.error('[SW] 同步失败:', error)
  }
}

/**
 * 推送通知
 */
self.addEventListener('push', (event) => {
  console.log('[SW] 收到推送消息')

  let data = {
    title: '智慧乡村',
    body: '您有新消息',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png'
  }

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() }
    } catch (error) {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [200, 100, 200],
    tag: 'smart-village-notification',
    renotify: true,
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: '查看'
      },
      {
        action: 'close',
        title: '关闭'
      }
    ],
    data: {
      url: data.url || '/'
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

/**
 * 通知点击事件
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const action = event.action

  if (action === 'close') {
    return
  }

  // 打开应用
  event.waitUntil(
    self.clients.openWindow(event.notification.data.url || '/')
  )
})

// 定期清理过期缓存
setInterval(() => {
  cleanExpiredCache()
}, 3600000) // 每小时执行一次

/**
 * 清理过期缓存
 */
async function cleanExpiredCache() {
  try {
    const cache = await caches.open(RUNTIME_CACHE)
    const keys = await cache.keys()
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24小时

    for (const request of keys) {
      const response = await cache.match(request)
      if (response) {
        const dateHeader = response.headers.get('date')
        if (dateHeader) {
          const responseDate = new Date(dateHeader).getTime()
          if (now - responseDate > maxAge) {
            await cache.delete(request)
            console.log('[SW] 清理过期缓存:', request.url)
          }
        }
      }
    }
  } catch (error) {
    console.error('[SW] 清理缓存失败:', error)
  }
}

console.log('[SW] Service Worker 已加载')
