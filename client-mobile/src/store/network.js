import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 网络状态Store
 * 管理网络连接状态、离线数据同步等
 */
export const useNetworkStore = defineStore('network', () => {
  // ===== 状态 =====

  // 网络类型: 'wifi' | '4g' | '3g' | '2g' | 'unknown' | 'none'
  const networkType = ref('unknown')

  // 是否在线
  const isOnline = ref(true)

  // 上次在线时间
  const lastOnlineTime = ref(null)

  // 离线队列
  const offlineQueue = ref([])

  // 同步状态: 'idle' | 'syncing' | 'failed'
  const syncStatus = ref('idle')

  // 同步错误信息
  const syncError = ref(null)

  // 待同步数据数量
  const pendingCount = computed(() => offlineQueue.value.length)

  // ===== 监听网络状态 =====

  /**
   * 初始化网络监听
   */
  const initNetworkListener = () => {
    // 监听网络状态变化
    uni.onNetworkStatusChange((result) => {
      networkType.value = result.networkType
      isOnline.value = result.isConnected

      if (result.isConnected) {
        console.log('网络已连接:', result.networkType)
        lastOnlineTime.value = new Date().toISOString()
        // 网络恢复时自动同步
        autoSync()
      } else {
        console.log('网络已断开')
        // 网络断开时的处理
        onNetworkOffline()
      }
    })

    // 获取初始网络状态
    uni.getNetworkType({
      success: (res) => {
        networkType.value = res.networkType
        isOnline.value = res.networkType !== 'none'
        if (isOnline.value) {
          lastOnlineTime.value = new Date().toISOString()
        }
      }
    })
  }

  /**
   * 网络断开时的处理
   */
  const onNetworkOffline = () => {
    // 保存当前时间作为断开时间
    uni.setStorageSync('network_offline_time', new Date().toISOString())

    // 提示用户
    uni.showToast({
      title: '网络已断开，部分功能可能受限',
      icon: 'none',
      duration: 2000
    })
  }

  // ===== 离线数据管理 =====

  /**
   * 添加数据到离线队列
   */
  const addToOfflineQueue = (data) => {
    const queueItem = {
      id: generateQueueId(),
      timestamp: new Date().toISOString(),
      ...data
    }

    offlineQueue.value.push(queueItem)
    saveOfflineQueue()

    console.log('已添加到离线队列:', queueItem)

    // 如果当前在线，立即尝试同步
    if (isOnline.value) {
      autoSync()
    }

    return queueItem.id
  }

  /**
   * 从离线队列移除数据
   */
  const removeFromOfflineQueue = (id) => {
    const index = offlineQueue.value.findIndex(item => item.id === id)
    if (index > -1) {
      offlineQueue.value.splice(index, 1)
      saveOfflineQueue()
      console.log('已从离线队列移除:', id)
    }
  }

  /**
   * 保存离线队列到本地存储
   */
  const saveOfflineQueue = () => {
    uni.setStorageSync('offline_queue', offlineQueue.value)
  }

  /**
   * 从本地存储加载离线队列
   */
  const loadOfflineQueue = () => {
    try {
      const queue = uni.getStorageSync('offline_queue')
      if (queue && Array.isArray(queue)) {
        offlineQueue.value = queue
        console.log('离线队列加载成功，共', queue.length, '条')
      }
    } catch (error) {
      console.error('离线队列加载失败:', error)
    }
  }

  /**
   * 清空离线队列
   */
  const clearOfflineQueue = () => {
    offlineQueue.value = []
    saveOfflineQueue()
    console.log('离线队列已清空')
  }

  /**
   * 生成队列ID
   */
  const generateQueueId = () => {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // ===== 数据同步 =====

  /**
   * 自动同步
   */
  const autoSync = async () => {
    if (!isOnline.value) {
      console.log('网络未连接，跳过同步')
      return
    }

    if (offlineQueue.value.length === 0) {
      console.log('没有需要同步的数据')
      return
    }

    if (syncStatus.value === 'syncing') {
      console.log('正在同步中，跳过')
      return
    }

    await syncOfflineData()
  }

  /**
   * 同步离线数据
   */
  const syncOfflineData = async () => {
    if (offlineQueue.value.length === 0) {
      return { success: true, synced: 0, failed: 0 }
    }

    syncStatus.value = 'syncing'
    syncError.value = null

    let synced = 0
    let failed = 0

    console.log('开始同步离线数据，共', offlineQueue.value.length, '条')

    try {
      // 逐条同步队列数据
      for (let i = 0; i < offlineQueue.value.length; i++) {
        const item = offlineQueue.value[i]

        try {
          // 根据数据类型调用不同的同步接口
          await syncItem(item)

          // 同步成功，从队列移除
          removeFromOfflineQueue(item.id)
          synced++

          console.log('同步成功:', item.id, `(${i + 1}/${offlineQueue.value.length + synced})`)
        } catch (error) {
          failed++
          console.error('同步失败:', item.id, error)

          // 记录失败原因
          item.lastError = {
            message: error.message,
            timestamp: new Date().toISOString()
          }

          // 如果是网络错误，暂停同步
          if (error.message.includes('network') || error.message.includes('timeout')) {
            syncStatus.value = 'failed'
            syncError.value = error.message
            break
          }
        }
      }

      // 同步完成
      if (failed === 0) {
        syncStatus.value = 'idle'
        console.log('所有数据同步成功')
      } else {
        syncStatus.value = 'failed'
        syncError.value = `${failed}条数据同步失败`
      }

      // 提示用户
      if (synced > 0) {
        uni.showToast({
          title: `已同步${synced}条数据`,
          icon: 'success'
        })
      }

      return { success: failed === 0, synced, failed }

    } catch (error) {
      syncStatus.value = 'failed'
      syncError.value = error.message
      console.error('同步过程出错:', error)
      return { success: false, synced, failed, error }
    }
  }

  /**
   * 同步单个数据项
   */
  const syncItem = async (item) => {
    // 根据item.type调用不同的API
    const { type, data } = item

    // 这里需要导入实际的API函数
    // const api = await import('@/api/index.js')

    switch (type) {
      case 'announcement_read':
        // await api.markAnnouncementAsRead(data.id)
        break
      case 'vote_submit':
        // await api.submitVote(data)
        break
      case 'service_application':
        // await api.submitServiceApplication(data)
        break
      case 'feedback_submit':
        // await api.submitFeedback(data)
        break
      default:
        console.warn('未知的数据类型:', type)
    }

    // 模拟网络请求延迟
    await new Promise(resolve => setTimeout(resolve, 500))

    // 模拟成功
    return true
  }

  /**
   * 手动触发同步
   */
  const manualSync = async () => {
    if (!isOnline.value) {
      uni.showToast({
        title: '网络未连接',
        icon: 'none'
      })
      return
    }

    uni.showLoading({
      title: '正在同步...'
    })

    const result = await syncOfflineData()

    uni.hideLoading()

    if (result.success) {
      uni.showToast({
        title: `同步完成，成功${result.synced}条`,
        icon: 'success'
      })
    } else {
      uni.showToast({
        title: result.error || `同步完成，成功${result.synced}条，失败${result.failed}条`,
        icon: failed === 0 ? 'success' : 'none'
      })
    }
  }

  // ===== 离线数据缓存 =====

  /**
   * 缓存数据到本地
   */
  const cacheData = (key, data, expireSeconds = 3600) => {
    const cacheItem = {
      data,
      timestamp: Date.now(),
      expire: expireSeconds * 1000
    }

    uni.setStorageSync(`cache_${key}`, cacheItem)
    console.log('数据已缓存:', key)
  }

  /**
   * 从本地缓存获取数据
   */
  const getCachedData = (key) => {
    try {
      const cacheItem = uni.getStorageSync(`cache_${key}`)

      if (!cacheItem) {
        return null
      }

      // 检查是否过期
      const now = Date.now()
      if (now - cacheItem.timestamp > cacheItem.expire) {
        // 缓存已过期，删除
        uni.removeStorageSync(`cache_${key}`)
        console.log('缓存已过期:', key)
        return null
      }

      console.log('从缓存读取数据:', key)
      return cacheItem.data

    } catch (error) {
      console.error('读取缓存失败:', error)
      return null
    }
  }

  /**
   * 清除指定缓存
   */
  const clearCache = (key) => {
    uni.removeStorageSync(`cache_${key}`)
    console.log('缓存已清除:', key)
  }

  /**
   * 清除所有缓存
   */
  const clearAllCache = () => {
    const storage = uni.getStorageInfoSync()
    const keys = storage.keys || []

    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        uni.removeStorageSync(key)
      }
    })

    console.log('所有缓存已清除')
  }

  // ===== 工具方法 =====

  /**
   * 设置网络类型
   */
  const setNetworkType = (type) => {
    networkType.value = type
    isOnline.value = type !== 'none'
    if (isOnline.value) {
      lastOnlineTime.value = new Date().toISOString()
    }
  }

  /**
   * 获取网络状态描述
   */
  const getNetworkDescription = computed(() => {
    const descriptions = {
      wifi: 'WiFi',
      '4g': '4G网络',
      '3g': '3G网络',
      '2g': '2G网络',
      unknown: '未知网络',
      none: '未连接网络'
    }
    return descriptions[networkType.value] || '未知网络'
  })

  /**
   * 检查是否需要警告（长时间离线）
   */
  const checkOfflineWarning = () => {
    if (isOnline.value) return false

    const offlineTime = uni.getStorageSync('network_offline_time')
    if (!offlineTime) return false

    const offlineDuration = Date.now() - new Date(offlineTime).getTime()
    const offlineHours = offlineDuration / (1000 * 60 * 60)

    // 离线超过24小时警告
    return offlineHours > 24
  }

  // 返回状态和方法
  return {
    // 状态
    networkType,
    isOnline,
    lastOnlineTime,
    offlineQueue,
    syncStatus,
    syncError,
    pendingCount,
    getNetworkDescription,

    // 初始化
    initNetworkListener,
    loadOfflineQueue,

    // 网络状态
    setNetworkType,
    checkOfflineWarning,

    // 离线队列
    addToOfflineQueue,
    removeFromOfflineQueue,
    clearOfflineQueue,

    // 数据同步
    autoSync,
    manualSync,
    syncOfflineData,

    // 缓存管理
    cacheData,
    getCachedData,
    clearCache,
    clearAllCache
  }
})