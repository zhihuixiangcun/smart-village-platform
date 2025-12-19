const CACHE_NAME = 'smart-village-v1'
const STATIC_CACHE = 'static-v1'
const DYNAMIC_CACHE = 'dynamic-v1'
const API_CACHE = 'api-v1'

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/src/main.js',
  '/src/App.vue'
]

// API端点缓存配置
const API_CACHE_CONFIG = {
  // 缓存这些API响应
  cache: [
    '/api/v1/villages',
    '/api/v1/announcements',
    '/api/v1/services',
    '/api/v1/notifications'
  ],
  // 不缓存这些API
  bypass: [
    '/api/auth/login',
    '/api/auth/logout',
    '/api/upload',
    '/api/feedback/submit'
  ]
}

// 安装事件
self.addEventListener('install', (event) => {
  console.log('SW: Installing...')

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('SW: Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('SW: Static assets cached')
        return self.skipWaiting()
      })
      .catch(error => {
        console.error('SW: Failed to cache static assets', error)
      })
  )
})

// 激活事件
self.addEventListener('activate', (event) => {
  console.log('SW: Activating...')

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // 删除旧版本缓存
            if (cacheName !== STATIC_CACHE &&
                cacheName !== DYNAMIC_CACHE &&
                cacheName !== API_CACHE) {
              console.log('SW: Deleting old cache', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('SW: Old caches deleted')
        return self.clients.claim()
      })
  )
})

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 只处理HTTP/HTTPS请求
  if (!request.url.startsWith('http')) {
    return
  }

  // 处理API请求
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
    return
  }

  // 处理静态资源请求
  if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset.split('/').pop()))) {
    event.respondWith(handleStaticRequest(request))
    return
  }

  // 处理页面请求
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request))
    return
  }

  // 其他请求使用网络优先策略
  event.respondWith(
    fetch(request)
      .catch(() => {
        // 网络失败时尝试从缓存获取
        return caches.match(request)
      })
  )
})

// 处理API请求
async function handleApiRequest(request) {
  const url = new URL(request.url)
  const pathname = url.pathname

  // 检查是否应该绕过缓存
  if (API_CACHE_CONFIG.bypass.some(path => pathname.includes(path))) {
    return fetch(request)
  }

  // 检查是否应该缓存
  const shouldCache = API_CACHE_CONFIG.cache.some(path => pathname.includes(path))

  if (shouldCache) {
    // 使用缓存优先策略
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      // 在后台更新缓存
      updateApiCache(request)
      return cachedResponse
    }

    try {
      const networkResponse = await fetch(request)
      if (networkResponse.ok) {
        const responseClone = networkResponse.clone()
        caches.open(API_CACHE).then(cache => {
          cache.put(request, responseClone)
        })
      }
      return networkResponse
    } catch (error) {
      // 网络失败，返回缓存的响应或离线页面
      const cachedResponse = await caches.match(request)
      if (cachedResponse) {
        return cachedResponse
      }
      return new Response(JSON.stringify({
        error: '离线状态，请检查网络连接'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  // 不缓存的API直接请求网络
  return fetch(request)
}

// 处理静态资源请求
async function handleStaticRequest(request) {
  // 缓存优先策略
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone()
      caches.open(STATIC_CACHE).then(cache => {
        cache.put(request, responseClone)
      })
    }
    return networkResponse
  } catch (error) {
    console.error('Static asset fetch failed:', error)
    return new Response('资源加载失败', { status: 500 })
  }
}

// 处理页面导航请求
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone()
      caches.open(DYNAMIC_CACHE).then(cache => {
        cache.put(request, responseClone)
      })
      return networkResponse
    }
  } catch (error) {
    console.log('Network failed, trying cache...')
  }

  // 从缓存获取
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  // 返回离线页面
  return caches.match('/offline.html') || new Response('离线', { status: 503 })
}

// 更新API缓存
async function updateApiCache(request) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone()
      caches.open(API_CACHE).then(cache => {
        cache.put(request, responseClone)
      })
    }
  } catch (error) {
    console.log('Background update failed:', error)
  }
}

// 后台同步
self.addEventListener('sync', (event) => {
  console.log('SW: Background sync', event.tag)

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  // 获取离线时存储的操作
  const pendingActions = await getPendingActions()

  for (const action of pendingActions) {
    try {
      await fetch(action.url, action.options)
      // 成功后删除待处理操作
      await removePendingAction(action.id)
    } catch (error) {
      console.error('Background sync failed for action:', action, error)
    }
  }
}

// 推送通知
self.addEventListener('push', (event) => {
  console.log('SW: Push received')

  const options = {
    body: event.data ? event.data.text() : '您有新消息',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '查看详情',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: '关闭',
        icon: '/icons/xmark.png'
      }
    ]
  }

  if (event.data) {
    const data = event.data.json()
    options.title = data.title || '智慧乡村通知'
    options.body = data.body || options.body
    options.data = { ...options.data, ...data }
  }

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  )
})

// 通知点击事件
self.addEventListener('notificationclick', (event) => {
  console.log('SW: Notification click received')

  event.notification.close()

  if (event.action === 'explore') {
    // 打开应用到相关页面
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    )
  } else if (event.action === 'close') {
    // 关闭通知
    event.notification.close()
  } else {
    // 默认行为：打开应用
    event.waitUntil(
      clients.matchAll().then(clientList => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus()
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/')
        }
      })
    )
  }
})

// 通知关闭事件
self.addEventListener('notificationclose', (event) => {
  console.log('SW: Notification closed')
})

// 消息处理
self.addEventListener('message', (event) => {
  console.log('SW: Message received', event.data)

  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break

    case 'UPDATE_CACHE':
      updateCache(event.data.urls)
      break

    case 'CLEAR_CACHE':
      clearCache()
      break

    default:
      console.log('Unknown message type:', event.data.type)
  }
})

// 更新缓存
async function updateCache(urls) {
  const cache = await caches.open(DYNAMIC_CACHE)
  await cache.addAll(urls)
}

// 清除缓存
async function clearCache() {
  const cacheNames = await caches.keys()
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  )
}

// 存储待处理操作
async function storePendingAction(action) {
  const actions = await getPendingActions()
  actions.push(action)
  localStorage.setItem('pendingActions', JSON.stringify(actions))
}

// 获取待处理操作
async function getPendingActions() {
  const stored = localStorage.getItem('pendingActions')
  return stored ? JSON.parse(stored) : []
}

// 删除待处理操作
async function removePendingAction(id) {
  const actions = await getPendingActions()
  const filtered = actions.filter(action => action.id !== id)
  localStorage.setItem('pendingActions', JSON.stringify(filtered))
}