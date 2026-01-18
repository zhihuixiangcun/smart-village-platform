/**
 * 公告Store
 * 管理公告列表、详情、筛选、缓存等所有公告相关状态
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 使用公告Store
 * @returns {Object} Store状态和方法
 */
export const useAnnouncementStore = defineStore('announcement', () => {
  // ===== 状态管理 =====

  /** 公告列表 @type {import('vue').Ref<import('@/types').AnnouncementType[]>} */
  const announcements = ref([])

  /** 当前筛选条件 @type {import('vue').Ref<import('@/types').AnnouncementFilter>} */
  const currentFilter = ref({
    type: 'all',
    keyword: '',
    startDate: '',
    endDate: '',
    sortBy: 'date',
    sortOrder: 'desc'
  })

  /** 分页状态 @type {import('vue').Ref<import('@/types').AnnouncementPagination>} */
  const pagination = ref({
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: true
  })

  /** 加载状态 */
  const loading = ref(false)
  const refreshing = ref(false)
  const loadingMore = ref(false)

  /** 详情缓存 - 使用Map提高查找性能 @type {import('vue').Ref<Map<string, import('@/types').AnnouncementType>>} */
  const detailCache = ref(new Map())

  // ===== 计算属性 =====

  /**
   * 筛选后的公告列表
   * 根据当前筛选条件动态计算
   */
  const filteredAnnouncements = computed(() => {
    let result = announcements.value

    // 类型筛选
    if (currentFilter.value.type !== 'all') {
      result = result.filter(item => item.type === currentFilter.value.type)
    }

    // 搜索筛选 - 支持标题、摘要、内容
    if (currentFilter.value.keyword) {
      const keyword = currentFilter.value.keyword.toLowerCase()
      result = result.filter(item =>
        item.title.toLowerCase().includes(keyword) ||
        item.summary.toLowerCase().includes(keyword) ||
        (item.content && item.content.toLowerCase().includes(keyword))
      )
    }

    // 日期筛选
    if (currentFilter.value.startDate) {
      result = result.filter(item =>
        new Date(item.publishDate) >= new Date(currentFilter.value.startDate)
      )
    }

    if (currentFilter.value.endDate) {
      result = result.filter(item =>
        new Date(item.publishDate) <= new Date(currentFilter.value.endDate)
      )
    }

    // 排序
    result = [...result].sort((a, b) => {
      const field = currentFilter.value.sortBy
      const order = currentFilter.value.sortOrder === 'asc' ? 1 : -1

      if (field === 'date') {
        return order * (new Date(a.publishDate) - new Date(b.publishDate))
      }
      return order * (a[field] - b[field])
    })

    return result
  })

  /**
   * 未读数量
   * 用于显示未读徽章
   */
  const unreadCount = computed(() => {
    return announcements.value.filter(item => !item.read).length
  })

  /**
   * 分类统计
   * 用于显示各类型公告数量
   * @type {import('vue').ComputedRef<import('@/types').AnnouncementStats>}
   */
  const typeStats = computed(() => {
    const stats = {
      all: announcements.value.length,
      important: 0,
      notice: 0,
      meeting: 0,
      public: 0,
      unread: 0
    }

    announcements.value.forEach(item => {
      if (stats[item.type] !== undefined) {
        stats[item.type]++
      }
      if (!item.read) {
        stats.unread++
      }
    })

    return stats
  })

  // ===== API调用方法 =====

  /**
   * 获取公告列表
   * @param {Object} params - 查询参数
   * @param {boolean} refresh - 是否刷新（替换而非追加）
   * @returns {Promise<import('@/types').AnnouncementListResponse>} 响应数据
   */
  const fetchAnnouncements = async (params = {}, refresh = false) => {
    if (refresh) {
      refreshing.value = true
    } else {
      loading.value = true
    }

    try {
      // 动态导入API模块避免循环依赖
      const { village } = await import('@/api')

      const response = await village.announcement.getList({
        page: pagination.value.page,
        pageSize: pagination.value.pageSize,
        ...params
      })

      const data = response.data || response

      if (refresh) {
        announcements.value = data.list || []
      } else {
        announcements.value.push(...(data.list || []))
      }

      pagination.value.total = data.total || 0
      pagination.value.hasMore = announcements.value.length < (data.total || 0)

      return data
    } catch (error) {
      console.error('获取公告列表失败:', error)
      throw error
    } finally {
      loading.value = false
      refreshing.value = false
    }
  }

  /**
   * 加载更多公告
   * @returns {Promise<void>}
   */
  const loadMore = async () => {
    if (loadingMore.value || !pagination.value.hasMore) return

    loadingMore.value = true
    pagination.value.page++

    try {
      await fetchAnnouncements()
    } catch (error) {
      pagination.value.page-- // 恢复页码
      throw error
    } finally {
      loadingMore.value = false
    }
  }

  /**
   * 获取公告详情
   * @param {string} id - 公告ID
   * @param {boolean} useCache - 是否使用缓存
   * @returns {Promise<import('@/types').AnnouncementType>} 公告详情
   */
  const fetchAnnouncementDetail = async (id, useCache = true) => {
    // 检查缓存
    if (useCache && detailCache.value.has(id)) {
      return detailCache.value.get(id)
    }

    try {
      const { village } = await import('@/api')
      const response = await village.announcement.getDetail(id)
      const detail = response.data || response

      // 缓存详情
      detailCache.value.set(id, detail)

      // 更新列表中的对应项
      const index = announcements.value.findIndex(item => item.id === id)
      if (index > -1) {
        announcements.value[index] = { ...announcements.value[index], ...detail }
      }

      return detail
    } catch (error) {
      console.error('获取公告详情失败:', error)
      throw error
    }
  }

  /**
   * 标记为已读
   * @param {string} id - 公告ID
   * @returns {Promise<void>}
   */
  const markAsRead = async (id) => {
    try {
      const { village } = await import('@/api')
      await village.announcement.markAsRead(id)

      // 更新本地状态
      const announcement = announcements.value.find(item => item.id === id)
      if (announcement) {
        announcement.read = true
      }

      // 更新缓存
      if (detailCache.value.has(id)) {
        const detail = detailCache.value.get(id)
        detailCache.value.set(id, { ...detail, read: true })
      }
    } catch (error) {
      console.error('标记已读失败:', error)
      throw error
    }
  }

  /**
   * 切换点赞状态
   * @param {string} id - 公告ID
   * @returns {Promise<boolean>} 新的点赞状态
   */
  const toggleLike = async (id) => {
    const announcement = announcements.value.find(item => item.id === id)
    if (!announcement) return false

    const isLiked = !announcement.liked

    try {
      // 乐观更新
      announcement.liked = isLiked
      announcement.likeCount = (announcement.likeCount || 0) + (isLiked ? 1 : -1)

      // 调用API
      const { village } = await import('@/api')
      await village.announcement.toggleLike(id)

      return isLiked
    } catch (error) {
      // 回滚
      announcement.liked = !isLiked
      announcement.likeCount = (announcement.likeCount || 0) + (isLiked ? -1 : 1)
      throw error
    }
  }

  /**
   * 切换收藏状态
   * @param {string} id - 公告ID
   * @returns {Promise<boolean>} 新的收藏状态
   */
  const toggleCollect = async (id) => {
    const announcement = announcements.value.find(item => item.id === id)
    if (!announcement) return false

    const isCollected = !announcement.collected

    try {
      // 乐观更新
      announcement.collected = isCollected

      // 调用API
      const { village } = await import('@/api')
      await village.announcement.toggleCollect(id)

      return isCollected
    } catch (error) {
      // 回滚
      announcement.collected = !isCollected
      throw error
    }
  }

  /**
   * 更新筛选条件
   * @param {Partial<import('@/types').AnnouncementFilter>} filter - 筛选条件
   */
  const updateFilter = (filter) => {
    currentFilter.value = { ...currentFilter.value, ...filter }
  }

  /**
   * 重置筛选条件
   */
  const resetFilter = () => {
    currentFilter.value = {
      type: 'all',
      keyword: '',
      startDate: '',
      endDate: '',
      sortBy: 'date',
      sortOrder: 'desc'
    }
  }

  /**
   * 清除详情缓存
   * @param {string} [id] - 公告ID，不传则清除所有
   */
  const clearDetailCache = (id = null) => {
    if (id) {
      detailCache.value.delete(id)
    } else {
      detailCache.value.clear()
    }
  }

  /**
   * 重置Store
   */
  const reset = () => {
    announcements.value = []
    pagination.value = {
      page: 1,
      pageSize: 20,
      total: 0,
      hasMore: true
    }
    resetFilter()
    clearDetailCache()
  }

  return {
    // 状态
    announcements,
    currentFilter,
    pagination,
    loading,
    refreshing,
    loadingMore,

    // 计算属性
    filteredAnnouncements,
    unreadCount,
    typeStats,

    // 方法
    fetchAnnouncements,
    loadMore,
    fetchAnnouncementDetail,
    markAsRead,
    toggleLike,
    toggleCollect,
    updateFilter,
    resetFilter,
    clearDetailCache,
    reset
  }
})
