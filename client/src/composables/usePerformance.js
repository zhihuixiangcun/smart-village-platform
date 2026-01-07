import { ref, watch } from 'vue';

/**
 * 防抖搜索Hook
 * @param {Function} searchFn - 搜索函数
 * @param {number} delay - 防抖延迟时间(ms)
 * @param {Object} options - 配置选项
 */
export function useDebounceSearch(searchFn, delay = 300, options = {}) {
  const {
    immediate = false,
    maxWait = 1000,
    leading = false,
    trailing = true
  } = options;

  const searchQuery = ref('');
  const loading = ref(false);
  const results = ref([]);
  const error = ref(null);

  let timeoutId = null;
  let maxTimeoutId = null;
  let lastCallTime = 0;

  const search = async (query) => {
    if (!query && !options.allowEmpty) {
      results.value = [];
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const result = await searchFn(query);
      results.value = result;
    } catch (err) {
      error.value = err;
      results.value = [];
    } finally {
      loading.value = false;
    }
  };

  const debouncedSearch = (query) => {
    const now = Date.now();

    // 清除之前的定时器
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // 首次调用或超过最大等待时间时立即执行
    if (!lastCallTime || (now - lastCallTime >= maxWait)) {
      if (leading) {
        search(query);
        lastCallTime = now;
        return;
      }
    }

    // 设置防抖定时器
    timeoutId = setTimeout(() => {
      if (trailing) {
        search(query);
      }
      lastCallTime = now;
    }, delay);

    // 设置最大等待定时器
    if (!maxTimeoutId && maxWait) {
      maxTimeoutId = setTimeout(() => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          search(query);
          lastCallTime = now;
        }
        maxTimeoutId = null;
      }, maxWait);
    }
  };

  // 监听搜索关键词变化
  watch(
    searchQuery,
    (newQuery) => {
      debouncedSearch(newQuery);
    },
    { immediate }
  );

  // 手动触发搜索
  const triggerSearch = (query = searchQuery.value) => {
    search(query);
  };

  // 重置搜索
  const resetSearch = () => {
    searchQuery.value = '';
    results.value = [];
    error.value = null;
    loading.value = false;

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (maxTimeoutId) {
      clearTimeout(maxTimeoutId);
      maxTimeoutId = null;
    }
  };

  return {
    searchQuery,
    loading,
    results,
    error,
    triggerSearch,
    resetSearch
  };
}

/**
 * 分页数据管理Hook
 */
export function usePagination(options = {}) {
  const {
    defaultPageSize = 20,
    defaultPage = 1,
    pageSizes = [10, 20, 50, 100]
  } = options;

  const currentPage = ref(defaultPage);
  const pageSize = ref(defaultPageSize);
  const total = ref(0);
  const data = ref([]);
  const loading = ref(false);

  const totalPages = computed(() => {
    return Math.ceil(total.value / pageSize.value);
  });

  const hasNextPage = computed(() => {
    return currentPage.value < totalPages.value;
  });

  const hasPrevPage = computed(() => {
    return currentPage.value > 1;
  });

  const setPage = (page) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page;
    }
  };

  const setPageSize = (size) => {
    pageSize.value = size;
    // 重新计算当前页
    const newTotalPages = Math.ceil(total.value / size);
    if (currentPage.value > newTotalPages) {
      currentPage.value = newTotalPages || 1;
    }
  };

  const nextPage = () => {
    if (hasNextPage.value) {
      currentPage.value++;
    }
  };

  const prevPage = () => {
    if (hasPrevPage.value) {
      currentPage.value--;
    }
  };

  const reset = () => {
    currentPage.value = defaultPage;
    pageSize.value = defaultPageSize;
    total.value = 0;
    data.value = [];
  };

  return {
    currentPage,
    pageSize,
    total,
    data,
    loading,
    totalPages,
    hasNextPage,
    hasPrevPage,
    pageSizes,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    reset
  };
}

/**
 * 无限滚动Hook
 */
export function useInfiniteScroll(loadMore, options = {}) {
  const {
    distance = 100,
    disabled = false,
    delay = 200
  } = options;

  const loading = ref(false);
  const finished = ref(false);
  const error = ref(null);

  let timeoutId = null;

  const load = async () => {
    if (loading.value || finished.value || disabled) {
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const result = await loadMore();

      if (result === false || (Array.isArray(result) && result.length === 0)) {
        finished.value = true;
      }
    } catch (err) {
      error.value = err;
    } finally {
      loading.value = false;
    }
  };

  const checkScroll = (element) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      const { scrollTop, clientHeight, scrollHeight } = element;

      if (scrollTop + clientHeight >= scrollHeight - distance) {
        load();
      }
    }, delay);
  };

  const reset = () => {
    finished.value = false;
    error.value = null;
    loading.value = false;
  };

  return {
    loading,
    finished,
    error,
    load,
    checkScroll,
    reset
  };
}

/**
 * 数据缓存Hook
 */
export function useDataCache(key, options = {}) {
  const {
    expireTime = 5 * 60 * 1000, // 5分钟
    storage = localStorage,
    serialize = JSON.stringify,
    deserialize = JSON.parse
  } = options;

  const getCacheKey = (suffix = '') => {
    return suffix ? `${key}_${suffix}` : key;
  };

  const setCache = (data, suffix = '') => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        expireTime
      };
      storage.setItem(getCacheKey(suffix), serialize(cacheData));
    } catch (error) {
      console.warn('Cache set failed:', error);
    }
  };

  const getCache = (suffix = '') => {
    try {
      const cached = storage.getItem(getCacheKey(suffix));
      if (!cached) return null;

      const cacheData = deserialize(cached);
      const now = Date.now();

      // 检查是否过期
      if (cacheData.timestamp + cacheData.expireTime < now) {
        removeCache(suffix);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.warn('Cache get failed:', error);
      return null;
    }
  };

  const removeCache = (suffix = '') => {
    try {
      storage.removeItem(getCacheKey(suffix));
    } catch (error) {
      console.warn('Cache remove failed:', error);
    }
  };

  const clearAllCache = () => {
    try {
      const keys = Object.keys(storage);
      keys.forEach(k => {
        if (k.startsWith(key)) {
          storage.removeItem(k);
        }
      });
    } catch (error) {
      console.warn('Cache clear failed:', error);
    }
  };

  const isExpired = (suffix = '') => {
    try {
      const cached = storage.getItem(getCacheKey(suffix));
      if (!cached) return true;

      const cacheData = deserialize(cached);
      const now = Date.now();

      return cacheData.timestamp + cacheData.expireTime < now;
    } catch (error) {
      return true;
    }
  };

  return {
    setCache,
    getCache,
    removeCache,
    clearAllCache,
    isExpired
  };
}