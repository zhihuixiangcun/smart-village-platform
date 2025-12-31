/**
 * 离线服务
 * 提供离线存储、数据同步、离线队列等功能
 */

import { ref, reactive } from 'vue'

// IndexedDB 数据库名称和版本
const DB_NAME = 'SmartVillageOfflineDB'
const DB_VERSION = 1

// 数据存储对象名称
const STORES = {
  QUEUE: 'offline_queue',           // 离线操作队列
  CACHE: 'offline_cache',           // 离线缓存数据
  SYNC: 'sync_log',                 // 同步日志
  ATTACHMENTS: 'attachments'        // 附件缓存
}

class OfflineService {
  constructor() {
    this.db = null
    this.isOnline = navigator.onLine
    this.syncInProgress = false
    this.queueLength = ref(0)

    // 监听在线/离线状态
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))

    // 初始化数据库
    this.initDB()
  }

  /**
   * 初始化 IndexedDB
   */
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('IndexedDB 打开失败:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('IndexedDB 初始化成功')
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        // 创建离线队列存储
        if (!db.objectStoreNames.contains(STORES.QUEUE)) {
          const queueStore = db.createObjectStore(STORES.QUEUE, {
            keyPath: 'id',
            autoIncrement: true
          })
          queueStore.createIndex('timestamp', 'timestamp', { unique: false })
          queueStore.createIndex('endpoint', 'endpoint', { unique: false })
          queueStore.createIndex('status', 'status', { unique: false })
        }

        // 创建离线缓存存储
        if (!db.objectStoreNames.contains(STORES.CACHE)) {
          const cacheStore = db.createObjectStore(STORES.CACHE, {
            keyPath: 'key'
          })
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false })
          cacheStore.createIndex('ttl', 'ttl', { unique: false })
        }

        // 创建同步日志存储
        if (!db.objectStoreNames.contains(STORES.SYNC)) {
          const syncStore = db.createObjectStore(STORES.SYNC, {
            keyPath: 'id',
            autoIncrement: true
          })
          syncStore.createIndex('timestamp', 'timestamp', { unique: false })
          syncStore.createIndex('status', 'status', { unique: false })
        }

        // 创建附件缓存存储
        if (!db.objectStoreNames.contains(STORES.ATTACHMENTS)) {
          const attachmentStore = db.createObjectStore(STORES.ATTACHMENTS, {
            keyPath: 'id'
          })
          attachmentStore.createIndex('type', 'type', { unique: false })
          attachmentStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        console.log('IndexedDB 对象存储创建完成')
      }
    })
  }

  /**
   * 添加到离线队列
   * @param {string} endpoint - API 端点
   * @param {string} method - HTTP 方法
   * @param {object} data - 请求数据
   * @param {object} options - 选项
   */
  async addToQueue(endpoint, method, data, options = {}) {
    if (!this.db) {
      await this.initDB()
    }

    const item = {
      endpoint,
      method,
      data,
      options,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.QUEUE], 'readwrite')
      const store = transaction.objectStore(STORES.QUEUE)
      const request = store.add(item)

      request.onsuccess = () => {
        this.queueLength.value++
        console.log('添加到离线队列:', item)
        resolve(request.result)
      }

      request.onerror = () => {
        console.error('添加到队列失败:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 获取离线队列
   */
  async getQueue() {
    if (!this.db) {
      await this.initDB()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.QUEUE], 'readonly')
      const store = transaction.objectStore(STORES.QUEUE)
      const index = store.index('status')
      const request = index.getAll('pending')

      request.onsuccess = () => {
        const items = request.result.sort((a, b) => a.timestamp - b.timestamp)
        resolve(items)
      }

      request.onerror = () => {
        console.error('获取队列失败:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 从队列中移除
   * @param {number} id - 队列项 ID
   */
  async removeFromQueue(id) {
    if (!this.db) {
      await this.initDB()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.QUEUE], 'readwrite')
      const store = transaction.objectStore(STORES.QUEUE)
      const request = store.delete(id)

      request.onsuccess = () => {
        this.queueLength.value--
        console.log('从队列移除:', id)
        resolve()
      }

      request.onerror = () => {
        console.error('从队列移除失败:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 缓存数据
   * @param {string} key - 缓存键
   * @param {any} data - 缓存数据
   * @param {number} ttl - 过期时间（毫秒）
   */
  async cacheData(key, data, ttl = 3600000) {
    if (!this.db) {
      await this.initDB()
    }

    const item = {
      key,
      data,
      timestamp: Date.now(),
      ttl: Date.now() + ttl
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.CACHE], 'readwrite')
      const store = transaction.objectStore(STORES.CACHE)
      const request = store.put(item)

      request.onsuccess = () => {
        console.log('缓存数据:', key)
        resolve()
      }

      request.onerror = () => {
        console.error('缓存失败:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 获取缓存数据
   * @param {string} key - 缓存键
   */
  async getCachedData(key) {
    if (!this.db) {
      await this.initDB()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.CACHE], 'readonly')
      const store = transaction.objectStore(STORES.CACHE)
      const request = store.get(key)

      request.onsuccess = () => {
        const item = request.result

        if (!item) {
          resolve(null)
          return
        }

        // 检查是否过期
        if (Date.now() > item.ttl) {
          this.removeCachedData(key)
          resolve(null)
          return
        }

        resolve(item.data)
      }

      request.onerror = () => {
        console.error('获取缓存失败:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 移除缓存数据
   * @param {string} key - 缓存键
   */
  async removeCachedData(key) {
    if (!this.db) {
      await this.initDB()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.CACHE], 'readwrite')
      const store = transaction.objectStore(STORES.CACHE)
      const request = store.delete(key)

      request.onsuccess = () => {
        console.log('移除缓存:', key)
        resolve()
      }

      request.onerror = () => {
        console.error('移除缓存失败:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 清理过期缓存
   */
  async cleanExpiredCache() {
    if (!this.db) {
      await this.initDB()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.CACHE], 'readwrite')
      const store = transaction.objectStore(STORES.CACHE)
      const index = store.index('ttl')
      const request = index.openCursor(IDBKeyRange.upperBound(Date.now()))

      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          console.log('清理过期缓存完成')
          resolve()
        }
      }

      request.onerror = () => {
        console.error('清理缓存失败:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 记录同步日志
   * @param {string} type - 同步类型
   * @param {string} status - 同步状态
   * @param {object} data - 同步数据
   */
  async addSyncLog(type, status, data) {
    if (!this.db) {
      await this.initDB()
    }

    const log = {
      type,
      status,
      data,
      timestamp: Date.now()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SYNC], 'readwrite')
      const store = transaction.objectStore(STORES.SYNC)
      const request = store.add(log)

      request.onsuccess = () => {
        console.log('添加同步日志:', log)
        resolve(request.result)
      }

      request.onerror = () => {
        console.error('添加日志失败:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 获取同步日志
   */
  async getSyncLogs(limit = 100) {
    if (!this.db) {
      await this.initDB()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SYNC], 'readonly')
      const store = transaction.objectStore(STORES.SYNC)
      const index = store.index('timestamp')
      const request = index.openCursor(null, 'prev')
      const logs = []

      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor && logs.length < limit) {
          logs.push(cursor.value)
          cursor.continue()
        } else {
          resolve(logs)
        }
      }

      request.onerror = () => {
        console.error('获取日志失败:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 处理上线事件
   */
  async handleOnline() {
    console.log('网络已连接')
    this.isOnline = true

    // 开始同步离线队列
    if (!this.syncInProgress) {
      this.syncQueue()
    }
  }

  /**
   * 处理离线事件
   */
  handleOffline() {
    console.log('网络已断开')
    this.isOnline = false
  }

  /**
   * 同步离线队列
   */
  async syncQueue() {
    if (this.syncInProgress || !this.isOnline) {
      return
    }

    this.syncInProgress = true

    try {
      const queue = await this.getQueue()

      if (queue.length === 0) {
        console.log('离线队列为空，无需同步')
        return
      }

      console.log(`开始同步离线队列，共 ${queue.length} 项`)

      for (const item of queue) {
        try {
          // 发送请求
          const response = await fetch(item.endpoint, {
            method: item.method,
            headers: {
              'Content-Type': 'application/json',
              ...item.options.headers
            },
            body: JSON.stringify(item.data)
          })

          if (response.ok) {
            // 同步成功，从队列移除
            await this.removeFromQueue(item.id)
            await this.addSyncLog('queue', 'success', {
              endpoint: item.endpoint,
              method: item.method
            })

            console.log('同步成功:', item.endpoint)
          } else {
            throw new Error(`请求失败: ${response.status}`)
          }
        } catch (error) {
          console.error('同步失败:', item.endpoint, error)

          // 更新重试次数
          item.retryCount++

          if (item.retryCount > 3) {
            // 超过最大重试次数，标记为失败
            await this.removeFromQueue(item.id)
            await this.addSyncLog('queue', 'failed', {
              endpoint: item.endpoint,
              error: error.message
            })
          } else {
            // 更新队列项
            const transaction = this.db.transaction([STORES.QUEUE], 'readwrite')
            const store = transaction.objectStore(STORES.QUEUE)
            store.put(item)
          }
        }
      }

      console.log('离线队列同步完成')
    } catch (error) {
      console.error('同步队列失败:', error)
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * 缓存附件
   * @param {string} id - 附件 ID
   * @param {string} type - 附件类型
   * @param {blob} data - 附件数据
   */
  async cacheAttachment(id, type, data) {
    if (!this.db) {
      await this.initDB()
    }

    const attachment = {
      id,
      type,
      data,
      timestamp: Date.now()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.ATTACHMENTS], 'readwrite')
      const store = transaction.objectStore(STORES.ATTACHMENTS)
      const request = store.put(attachment)

      request.onsuccess = () => {
        console.log('缓存附件:', id)
        resolve()
      }

      request.onerror = () => {
        console.error('缓存附件失败:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 获取缓存的附件
   * @param {string} id - 附件 ID
   */
  async getCachedAttachment(id) {
    if (!this.db) {
      await this.initDB()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.ATTACHMENTS], 'readonly')
      const store = transaction.objectStore(STORES.ATTACHMENTS)
      const request = store.get(id)

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        console.error('获取附件失败:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 清空所有数据
   */
  async clearAll() {
    if (!this.db) {
      await this.initDB()
    }

    const stores = [STORES.QUEUE, STORES.CACHE, STORES.SYNC, STORES.ATTACHMENTS]

    for (const storeName of stores) {
      await new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)
        const request = store.clear()

        request.onsuccess = () => {
          console.log(`清空存储: ${storeName}`)
          resolve()
        }

        request.onerror = () => {
          console.error(`清空失败: ${storeName}`, request.error)
          reject(request.error)
        }
      })
    }

    this.queueLength.value = 0
  }

  /**
   * 获取存储使用情况
   */
  async getStorageUsage() {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate()
      return {
        usage: estimate.usage,
        quota: estimate.quota,
        usagePercent: ((estimate.usage / estimate.quota) * 100).toFixed(2)
      }
    }
    return null
  }
}

// 创建单例实例
const offlineService = new OfflineService()

export default offlineService
export { STORES }
