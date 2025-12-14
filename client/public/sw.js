const CACHE_NAME = 'village-app-v1.0.0'
const STATIC_CACHE = 'village-static-v1.0.0'
const DYNAMIC_CACHE = 'village-dynamic-v1.0.0'

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/css/app.css',
  '/assets/js/app.js',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  '/offline.html'
]

// 需要缓存的API端点
const API_ENDPOINTS = [
  '/api/residents',
  '/api/announcements',
  '/api/services'
]

// 网络优先策略的资源
const NETWORK_FIRST = [
  '/api/auth',
  '/api/sync',
  '/api/notifications'
]

// 缓存优先策略的资源
const CACHE_FIRST = [
  '/assets/',
  '/icons/',
  '/images/'
]

// 安装事件
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        return self.skipWaiting()
      })
  )
})

// 激活事件
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE &&
                cacheName !== DYNAMIC_CACHE &&
                cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        return self.clients.claim()
      })
  )
})

// 网络请求拦截
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 跳过非HTTP请求
  if (!request.url.startsWith('http')) {
    return
  }

  // 跳过Chrome扩展请求
  if (url.protocol === 'chrome-extension:') {
    return
  }

  // API请求处理
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
    return
  }

  // 静态资源处理
  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticAsset(request))
    return
  }

  // 页面请求处理
  if (request.mode === 'navigate') {
    event.respondWith(handlePageRequest(request))
    return
  }

  // 其他请求使用默认策略
  event.respondWith(handleOtherRequest(request))
})

// 处理API请求
async function handleApiRequest(request) {
  const url = new URL(request.url)
  const pathname = url.pathname

  try {
    // 网络优先策略
    if (isNetworkFirst(pathname)) {
      return await networkFirst(request, DYNAMIC_CACHE)
    }

    // 对于POST、PUT、DELETE请求，处理离线队列
    if (request.method !== 'GET') {
      return await handleOfflineOperation(request)
    }

    // GET请求使用缓存优先策略
    return await cacheFirst(request, DYNAMIC_CACHE)
  } catch (error) {
    console.error('API request failed:', error)

    // 返回离线响应
    return await getOfflineResponse(request)
  }
}

// 处理静态资源
async function handleStaticAsset(request) {
  try {
    return await cacheFirst(request, STATIC_CACHE)
  } catch (error) {
    console.error('Static asset request failed:', error)
    return new Response('Resource not available offline', { status: 503 })
  }
}

// 处理页面请求
async function handlePageRequest(request) {
  try {
    // 网络优先，失败时返回缓存的页面或离线页面
    const networkResponse = await fetch(request)

    // 缓存成功的页面响应
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.log('Network failed, trying cache...')

    // 尝试从缓存获取
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // 返回离线页面
    return await caches.match('/offline.html') ||
           new Response('离线模式', { status: 503 })
  }
}

// 处理其他请求
async function handleOtherRequest(request) {
  try {
    return await fetch(request)
  } catch (error) {
    const cachedResponse = await caches.match(request)
    return cachedResponse || new Response('Not available offline', { status: 503 })
  }
}

// 处理离线操作
async function handleOfflineOperation(request) {
  try {
    // 尝试网络请求
    const response = await fetch(request)

    if (response.ok) {
      return response
    } else {
      throw new Error(`Network request failed with status ${response.status}`)
    }
  } catch (error) {
    console.log('Network failed, queuing offline operation...')

    // 将操作添加到离线队列
    await queueOfflineOperation(request)

    // 返回成功响应（模拟）
    return new Response(
      JSON.stringify({
        success: true,
        message: '操作已保存，将在网络恢复时同步',
        offline: true
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// 网络优先策略
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.log('Network failed, trying cache...')
    const cachedResponse = await caches.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    throw error
  }
}

// 缓存优先策略
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request)

  if (cachedResponse) {
    // 后台更新缓存
    updateCacheInBackground(request, cacheName)
    return cachedResponse
  }

  // 缓存未命中，从网络获取
  const networkResponse = await fetch(request)

  if (networkResponse.ok) {
    const cache = await caches.open(cacheName)
    cache.put(request, networkResponse.clone())
  }

  return networkResponse
}

// 后台更新缓存
async function updateCacheInBackground(request, cacheName) {
  try {
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      await cache.put(request, networkResponse)
    }
  } catch (error) {
    console.log('Background cache update failed:', error)
  }
}

// 队列离线操作
async function queueOfflineOperation(request) {
  try {
    const operation = {
      id: generateId(),
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.method !== 'GET' ? await request.text() : null,
      timestamp: Date.now()
    }

    // 存储到IndexedDB
    await storeOfflineOperation(operation)

    // 通知主线程
    await notifyClients('offline-operation-queued', operation)
  } catch (error) {
    console.error('Failed to queue offline operation:', error)
  }
}

// 获取离线响应
async function getOfflineResponse(request) {
  const url = new URL(request.url)

  // 尝试从缓存获取
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  // 返回默认离线响应
  return new Response(
    JSON.stringify({
      error: '网络不可用',
      message: '请检查网络连接或稍后重试',
      offline: true
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

// 存储离线操作到IndexedDB
async function storeOfflineOperation(operation) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VillageAppOffline', 1)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['operations'], 'readwrite')
      const store = transaction.objectStore('operations')

      const addRequest = store.add(operation)
      addRequest.onsuccess = () => resolve()
      addRequest.onerror = () => reject(addRequest.error)
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      if (!db.objectStoreNames.contains('operations')) {
        const store = db.createObjectStore('operations', { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}

// 通知客户端
async function notifyClients(type, data) {
  const clients = await self.clients.matchAll()

  clients.forEach(client => {
    client.postMessage({
      type,
      data
    })
  })
}

// 工具函数
function isNetworkFirst(pathname) {
  return NETWORK_FIRST.some(pattern => pathname.startsWith(pattern))
}

function isCacheFirst(pathname) {
  return CACHE_FIRST.some(pattern => pathname.startsWith(pattern))
}

function isStaticAsset(pathname) {
  return pathname.startsWith('/assets/') ||
         pathname.startsWith('/icons/') ||
         pathname.startsWith('/images/') ||
         pathname.endsWith('.css') ||
         pathname.endsWith('.js') ||
         pathname.endsWith('.png') ||
         pathname.endsWith('.jpg') ||
         pathname.endsWith('.svg')
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// 消息处理
self.addEventListener('message', (event) => {
  const { type, data } = event.data

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break

    case 'CACHE_URLS':
      cacheUrls(data.urls)
      break

    case 'CLEAR_CACHE':
      clearCache(data.cacheName)
      break

    case 'SYNC_OFFLINE_OPERATIONS':
      syncOfflineOperations()
      break

    default:
      console.log('Unknown message type:', type)
  }
})

// 缓存指定URL
async function cacheUrls(urls) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE)
    await cache.addAll(urls)
    await notifyClients('urls-cached', { urls })
  } catch (error) {
    console.error('Failed to cache URLs:', error)
    await notifyClients('cache-error', { error: error.message })
  }
}

// 清除缓存
async function clearCache(cacheName) {
  try {
    if (cacheName) {
      await caches.delete(cacheName)
    } else {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
    }
    await notifyClients('cache-cleared', { cacheName })
  } catch (error) {
    console.error('Failed to clear cache:', error)
  }
}

// 同步离线操作
async function syncOfflineOperations() {
  try {
    const operations = await getOfflineOperations()

    for (const operation of operations) {
      try {
        await replayOperation(operation)
        await removeOfflineOperation(operation.id)
      } catch (error) {
        console.error('Failed to sync operation:', operation, error)
      }
    }

    await notifyClients('offline-sync-completed', { count: operations.length })
  } catch (error) {
    console.error('Failed to sync offline operations:', error)
  }
}

// 获取离线操作
async function getOfflineOperations() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VillageAppOffline', 1)

    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['operations'], 'readonly')
      const store = transaction.objectStore('operations')

      const getAllRequest = store.getAll()
      getAllRequest.onsuccess = () => resolve(getAllRequest.result)
      getAllRequest.onerror = () => reject(getAllRequest.error)
    }

    request.onerror = () => reject(request.error)
  })
}

// 重放操作
async function replayOperation(operation) {
  const { url, method, headers, body } = operation

  const requestInit = {
    method,
    headers,
    body: body || undefined
  }

  const response = await fetch(url, requestInit)

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response
}

// 移除离线操作
async function removeOfflineOperation(operationId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VillageAppOffline', 1)

    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['operations'], 'readwrite')
      const store = transaction.objectStore('operations')

      const deleteRequest = store.delete(operationId)
      deleteRequest.onsuccess = () => resolve()
      deleteRequest.onerror = () => reject(deleteRequest.error)
    }

    request.onerror = () => reject(request.error)
  })
}

// 后台同步
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineOperations())
  }
})

// 推送通知
self.addEventListener('push', (event) => {
  if (!event.data) {
    return
  }

  const data = event.data.json()
  const options = {
    body: data.body,
    icon: data.icon || '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png',
    data: data.data,
    actions: data.actions || []
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// 通知点击
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action) {
    // 处理操作按钮点击
    handleNotificationAction(event.action, event.notification.data)
  } else {
    // 处理通知本体点击
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    )
  }
})

// 处理通知操作
async function handleNotificationAction(action, data) {
  switch (action) {
    case 'view':
      await clients.openWindow(data?.url || '/')
      break
    case 'dismiss':
      // 仅关闭通知，无需其他操作
      break
    default:
      console.log('Unknown notification action:', action)
  }
}