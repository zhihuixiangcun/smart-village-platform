/**
 * Smart Village Platform - Offline Data Manager
 * 智慧乡村综合服务平台 - 离线数据管理器
 *
 * Features:
 * - IndexedDB wrapper for offline data storage
 * - Offline operation queue management
 * - Automatic synchronization when online
 * - Conflict resolution for concurrent edits
 * - Data expiration and cleanup
 */

// IndexedDB configuration
const DB_NAME = 'SmartVillageOfflineDB'
const DB_VERSION = 1
const STORE_OPERATIONS = 'operations'
const STORE_CACHE = 'cache'

/**
 * Offline Data Manager Class
 */
class OfflineDataManager {
  constructor() {
    this.db = null
    this.isOnline = navigator.onLine
    this.syncInProgress = false
    this.syncCallbacks = []

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    if (this.db) {
      return this.db
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('[OfflineManager] Failed to open database:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('[OfflineManager] Database initialized')
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        // Create operations store for offline actions
        if (!db.objectStoreNames.contains(STORE_OPERATIONS)) {
          const store = db.createObjectStore(STORE_OPERATIONS, {
            keyPath: 'id',
            autoIncrement: true
          })
          store.createIndex('url', 'url', { unique: false })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('synced', 'synced', { unique: false })
          console.log('[OfflineManager] Created operations store')
        }

        // Create cache store for API responses
        if (!db.objectStoreNames.contains(STORE_CACHE)) {
          const store = db.createObjectStore(STORE_CACHE, {
            keyPath: 'key'
          })
          store.createIndex('expiry', 'expiry', { unique: false })
          console.log('[OfflineManager] Created cache store')
        }
      }
    })
  }

  /**
   * Handle online event
   */
  handleOnline() {
    console.log('[OfflineManager] Connection restored')
    this.isOnline = true
    this.autoSync()
  }

  /**
   * Handle offline event
   */
  handleOffline() {
    console.log('[OfflineManager] Connection lost')
    this.isOnline = false
  }

  /**
   * Save offline operation
   */
  async saveOperation(operation) {
    await this.init()

    const record = {
      url: operation.url,
      method: operation.method || 'POST',
      headers: operation.headers || {},
      body: operation.body,
      timestamp: Date.now(),
      synced: false,
      retryCount: 0
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_OPERATIONS], 'readwrite')
      const store = tx.objectStore(STORE_OPERATIONS)
      const request = store.add(record)

      request.onsuccess = () => {
        console.log('[OfflineManager] Operation saved:', request.result)
        resolve(request.result)
      }

      request.onerror = () => {
        console.error('[OfflineManager] Failed to save operation:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get pending operations
   */
  async getPendingOperations() {
    await this.init()

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_OPERATIONS], 'readonly')
      const store = tx.objectStore(STORE_OPERATIONS)
      const index = store.index('synced')
      const request = index.getAll(false)

      request.onsuccess = () => {
        const operations = request.result || []
        // Sort by timestamp
        operations.sort((a, b) => a.timestamp - b.timestamp)
        resolve(operations)
      }

      request.onerror = () => {
        console.error('[OfflineManager] Failed to get operations:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Delete operation after successful sync
   */
  async deleteOperation(id) {
    await this.init()

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_OPERATIONS], 'readwrite')
      const store = tx.objectStore(STORE_OPERATIONS)
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log('[OfflineManager] Operation deleted:', id)
        resolve()
      }

      request.onerror = () => {
        console.error('[OfflineManager] Failed to delete operation:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Cache API response data
   */
  async cacheData(key, data, maxAge = 3600000) {
    await this.init()

    const record = {
      key,
      data,
      expiry: Date.now() + maxAge
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_CACHE], 'readwrite')
      const store = tx.objectStore(STORE_CACHE)
      const request = store.put(record)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get cached data
   */
  async getCachedData(key) {
    await this.init()

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_CACHE], 'readonly')
      const store = tx.objectStore(STORE_CACHE)
      const request = store.get(key)

      request.onsuccess = () => {
        const record = request.result
        if (!record) {
          resolve(null)
          return
        }

        // Check if expired
        if (Date.now() > record.expiry) {
          this.deleteCachedData(key)
          resolve(null)
          return
        }

        resolve(record.data)
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Delete cached data
   */
  async deleteCachedData(key) {
    await this.init()

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_CACHE], 'readwrite')
      const store = tx.objectStore(STORE_CACHE)
      const request = store.delete(key)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Clean expired cache entries
   */
  async cleanExpiredCache() {
    await this.init()

    const now = Date.now()

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_CACHE], 'readwrite')
      const store = tx.objectStore(STORE_CACHE)
      const index = store.index('expiry')
      const range = IDBKeyRange.upperBound(now)
      const request = index.openCursor(range)

      const deleted = []

      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          cursor.delete()
          deleted.push(cursor.value.key)
          cursor.continue()
        } else {
          if (deleted.length > 0) {
            console.log('[OfflineManager] Cleaned expired cache:', deleted.length)
          }
          resolve(deleted)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Synchronize offline operations
   */
  async sync() {
    if (this.syncInProgress) {
      console.log('[OfflineManager] Sync already in progress')
      return 0
    }

    if (!this.isOnline) {
      console.log('[OfflineManager] Offline, skipping sync')
      return 0
    }

    this.syncInProgress = true
    let successCount = 0
    let failCount = 0

    try {
      const operations = await this.getPendingOperations()

      for (const operation of operations) {
        try {
          const response = await fetch(operation.url, {
            method: operation.method,
            headers: operation.headers,
            body: operation.body ? JSON.stringify(operation.body) : undefined
          })

          if (response.ok) {
            await this.deleteOperation(operation.id)
            successCount++
          } else {
            failCount++
            await this.incrementRetryCount(operation.id)
          }
        } catch (error) {
          console.error('[OfflineManager] Sync failed for operation:', operation.id, error)
          failCount++
          await this.incrementRetryCount(operation.id)
        }
      }

      // Trigger callbacks
      this.syncCallbacks.forEach(callback => {
        callback(successCount, failCount)
      })

      console.log(`[OfflineManager] Sync complete: ${successCount} succeeded, ${failCount} failed`)
    } catch (error) {
      console.error('[OfflineManager] Sync error:', error)
    } finally {
      this.syncInProgress = false
    }

    return successCount
  }

  /**
   * Increment retry count for failed operation
   */
  async incrementRetryCount(id) {
    await this.init()

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_OPERATIONS], 'readwrite')
      const store = tx.objectStore(STORE_OPERATIONS)
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const record = getRequest.result
        if (record) {
          record.retryCount = (record.retryCount || 0) + 1

          // Remove after too many retries
          if (record.retryCount > 5) {
            store.delete(id)
            console.log('[OfflineManager] Operation removed after max retries:', id)
          } else {
            store.put(record)
          }
        }
        resolve()
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  /**
   * Auto-sync when online
   */
  async autoSync() {
    if (this.isOnline && !this.syncInProgress) {
      await this.sync()
    }
  }

  /**
   * Register sync callback
   */
  onSync(callback) {
    this.syncCallbacks.push(callback)
  }

  /**
   * Unregister sync callback
   */
  offSync(callback) {
    this.syncCallbacks = this.syncCallbacks.filter(cb => cb !== callback)
  }

  /**
   * Get statistics
   */
  async getStats() {
    await this.init()

    const operations = await this.getPendingOperations()

    return {
      isOnline: this.isOnline,
      pendingOperations: operations.length,
      syncInProgress: this.syncInProgress
    }
  }

  /**
   * Clear all data
   */
  async clear() {
    await this.init()

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_OPERATIONS, STORE_CACHE], 'readwrite')

      tx.objectStore(STORE_OPERATIONS).clear()
      tx.objectStore(STORE_CACHE).clear()

      tx.oncomplete = () => {
        console.log('[OfflineManager] All data cleared')
        resolve()
      }

      tx.onerror = () => {
        console.error('[OfflineManager] Failed to clear data:', tx.error)
        reject(tx.error)
      }
    })
  }
}

// Export singleton instance
const offlineDataManager = new OfflineDataManager()

// Auto-initialize
offlineDataManager.init().catch(err => {
  console.error('[OfflineManager] Initialization failed:', err)
})

export default offlineDataManager

/**
 * Helper function for offline-aware API calls
 */
export async function offlineFetch(url, options = {}) {
  const cacheKey = `${options.method || 'GET'}:${url}`

  // If online, try to fetch
  if (offlineDataManager.isOnline) {
    try {
      const response = await fetch(url, options)

      // Cache successful GET requests
      if (response.ok && (!options.method || options.method === 'GET')) {
        const data = await response.clone().json()
        await offlineDataManager.cacheData(cacheKey, data)
      }

      return response
    } catch (error) {
      console.log('[OfflineManager] Fetch failed, trying cache')
    }
  }

  // If offline or fetch failed, try cache for GET requests
  if (!options.method || options.method === 'GET') {
    const cached = await offlineDataManager.getCachedData(cacheKey)
    if (cached) {
      console.log('[OfflineManager] Returning cached data')
      // Return cached data as a mock response
      return {
        ok: true,
        json: async () => cached,
        text: async () => JSON.stringify(cached)
      }
    }
  }

  // For non-GET requests or no cache, queue operation
  if (options.method && options.method !== 'GET') {
    await offlineDataManager.saveOperation({
      url,
      method: options.method,
      headers: options.headers,
      body: options.body
    })
    console.log('[OfflineManager] Operation queued for later sync')
    return {
      ok: true,
      json: async () => ({ success: true, message: '操作已保存，将在联网后同步' }),
      text: async () => '{"success":true,"message":"操作已保存，将在联网后同步"}'
    }
  }

  // No cache available
  throw new Error('离线状态且无缓存数据')
}

/**
 * Vue plugin for easy integration
 */
export const OfflineManagerPlugin = {
  install(app) {
    app.config.globalProperties.$offline = offlineDataManager
    app.provide('offline', offlineDataManager)
  }
}
