/**
 * Dashboard 数据管理 Composable
 * 处理Dashboard的数据获取、保存、缓存和错误处理
 */

import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import dashboardApi from '@/api/dashboard';
import offlineStorage from '@/utils/offlineStorage';

// 缓存配置
const CACHE_CONFIG = {
  overview: { key: 'dashboard:overview', ttl: 5 * 60 * 1000 },
  todos: { key: 'dashboard:todos', ttl: 3 * 60 * 1000 },
  statistics: { key: 'dashboard:statistics', ttl: 10 * 60 * 1000 },
  settings: { key: 'dashboard:settings', ttl: 30 * 60 * 1000 },
};

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
};

/**
 * Dashboard 数据管理 Hook
 */
export function useDashboardData() {
  const loading = ref(false);
  const saving = ref(false);
  const error = ref(null);
  const lastFetchTime = ref({});
  const cacheEnabled = ref(true);

  /**
   * 延迟函数（用于重试）
   * @param {number} ms - 延迟毫秒数
   */
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  /**
   * 带重试的请求
   * @param {Function} requestFn - 请求函数
   * @param {number} maxRetries - 最大重试次数
   * @returns {Promise} 请求结果
   */
  async function fetchWithRetry(requestFn, maxRetries = RETRY_CONFIG.maxRetries) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (err) {
        lastError = err;

        if (attempt < maxRetries) {
          const delayTime = RETRY_CONFIG.retryDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
          await delay(delayTime);
        }
      }
    }

    throw lastError;
  }

  /**
   * 从缓存获取数据
   * @param {string} cacheKey - 缓存键
   * @returns {Promise<*>} 缓存数据或null
   */
  async function getFromCache(cacheKey) {
    if (!cacheEnabled.value) return null;

    try {
      const cached = await offlineStorage.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (err) {
      // 缓存读取失败，继续从服务器获取
    }

    return null;
  }

  /**
   * 保存到缓存
   * @param {string} cacheKey - 缓存键
   * @param {*} data - 数据
   * @param {number} ttl - 过期时间（毫秒）
   */
  async function setCache(cacheKey, data, ttl) {
    if (!cacheEnabled.value) return;

    try {
      const expiresAt = new Date(Date.now() + ttl).toISOString();
      await offlineStorage.cacheData(cacheKey, data, { expiresAt });
    } catch (err) {
      // 缓存写入失败，继续执行
    }
  }

  /**
   * 清除缓存
   * @param {string} cacheKey - 缓存键（可选，不传则清除所有Dashboard缓存）
   */
  async function clearCache(cacheKey) {
    try {
      if (cacheKey) {
        await offlineStorage.deleteCachedData(cacheKey);
      } else {
        const keys = Object.values(CACHE_CONFIG).map(c => c.key);
        await Promise.all(keys.map(key => offlineStorage.deleteCachedData(key)));
      }
    } catch (err) {
      // 缓存清除失败，继续执行
    }
  }

  /**
   * 获取Dashboard概览数据
   * @param {Object} params - 查询参数
   * @param {boolean} forceRefresh - 强制刷新，不使用缓存
   * @returns {Promise<Object>} Dashboard概览数据
   */
  async function fetchOverview(params = {}, forceRefresh = false) {
    const cacheKey = CACHE_CONFIG.overview.key;

    if (!forceRefresh) {
      const cached = await getFromCache(cacheKey);
      if (cached) return cached;
    }

    loading.value = true;
    error.value = null;

    try {
      const data = await fetchWithRetry(() => dashboardApi.getDashboardOverview(params));

      lastFetchTime.value.overview = Date.now();
      await setCache(cacheKey, data, CACHE_CONFIG.overview.ttl);

      return data;
    } catch (err) {
      error.value = err;
      ElMessage.error(`加载Dashboard概览失败: ${  err.message || '网络错误'}`);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 获取待办事项列表
   * @param {Object} params - 查询参数
   * @param {boolean} forceRefresh - 强制刷新
   * @returns {Promise<Object>} 待办事项列表
   */
  async function fetchTodos(params = {}, forceRefresh = false) {
    const cacheKey = `${CACHE_CONFIG.todos.key}:${JSON.stringify(params)}`;

    if (!forceRefresh) {
      const cached = await getFromCache(cacheKey);
      if (cached) return cached;
    }

    loading.value = true;
    error.value = null;

    try {
      const data = await fetchWithRetry(() => dashboardApi.getTodosEnhanced(params));

      lastFetchTime.value.todos = Date.now();
      await setCache(cacheKey, data, CACHE_CONFIG.todos.ttl);

      return data;
    } catch (err) {
      error.value = err;
      ElMessage.error(`加载待办事项失败: ${  err.message || '网络错误'}`);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 获取统计数据
   * @param {Object} params - 查询参数
   * @param {boolean} forceRefresh - 强制刷新
   * @returns {Promise<Object>} 统计数据
   */
  async function fetchStatistics(params = {}, forceRefresh = false) {
    const cacheKey = `${CACHE_CONFIG.statistics.key}:${JSON.stringify(params)}`;

    if (!forceRefresh) {
      const cached = await getFromCache(cacheKey);
      if (cached) return cached;
    }

    loading.value = true;
    error.value = null;

    try {
      const data = await fetchWithRetry(() => dashboardApi.getDashboardStatistics(params));

      lastFetchTime.value.statistics = Date.now();
      await setCache(cacheKey, data, CACHE_CONFIG.statistics.ttl);

      return data;
    } catch (err) {
      error.value = err;
      ElMessage.error(`加载统计数据失败: ${  err.message || '网络错误'}`);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 获取Dashboard配置
   * @param {string} userId - 用户ID
   * @param {boolean} forceRefresh - 强制刷新
   * @returns {Promise<Object>} Dashboard配置
   */
  async function fetchSettings(userId, forceRefresh = false) {
    const cacheKey = CACHE_CONFIG.settings.key;

    if (!forceRefresh) {
      const cached = await getFromCache(cacheKey);
      if (cached) return cached;
    }

    loading.value = true;
    error.value = null;

    try {
      const data = await fetchWithRetry(() => dashboardApi.getDashboardSettings(userId));

      lastFetchTime.value.settings = Date.now();
      await setCache(cacheKey, data, CACHE_CONFIG.settings.ttl);

      return data;
    } catch (err) {
      error.value = err;
      ElMessage.error(`加载配置失败: ${  err.message || '网络错误'}`);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // ==================== 数据保存功能 ====================

  /**
   * 保存待办事项
   * @param {Object} todo - 待办事项数据
   * @returns {Promise<Object>} 保存后的待办事项
   */
  async function saveTodo(todo) {
    saving.value = true;
    error.value = null;

    try {
      const data = todo.id ? await dashboardApi.updateTodo(todo.id, todo) : await dashboardApi.createTodo(todo);

      await clearCache(CACHE_CONFIG.todos.key);
      ElMessage.success(todo.id ? '待办事项更新成功' : '待办事项创建成功');

      return data;
    } catch (err) {
      error.value = err;
      ElMessage.error(`保存待办事项失败: ${  err.message || '网络错误'}`);
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * 批量保存待办事项
   * @param {Array<Object>} todos - 待办事项数组
   * @returns {Promise<Object>} 批量保存结果
   */
  async function batchSaveTodos(todos) {
    saving.value = true;
    error.value = null;

    try {
      const data = await fetchWithRetry(() => dashboardApi.batchSaveTodos(todos));

      await clearCache(CACHE_CONFIG.todos.key);
      ElMessage.success(`成功保存 ${todos.length} 条待办事项`);

      return data;
    } catch (err) {
      error.value = err;
      ElMessage.error(`批量保存失败: ${  err.message || '网络错误'}`);
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * 保存Dashboard配置
   * @param {Object} config - Dashboard配置
   * @returns {Promise<Object>} 保存结果
   */
  async function saveSettings(config) {
    saving.value = true;
    error.value = null;

    try {
      const data = await fetchWithRetry(() => dashboardApi.saveDashboardSettings(config));

      await clearCache(CACHE_CONFIG.settings.key);
      ElMessage.success('配置保存成功');

      return data;
    } catch (err) {
      error.value = err;
      ElMessage.error(`保存配置失败: ${  err.message || '网络错误'}`);
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * 保存图表配置
   * @param {Object} config - 图表配置
   * @returns {Promise<Object>} 保存结果
   */
  async function saveChartConfig(config) {
    saving.value = true;
    error.value = null;

    try {
      const data = await dashboardApi.saveChartConfig(config);

      ElMessage.success('图表配置保存成功');

      return data;
    } catch (err) {
      error.value = err;
      ElMessage.error(`保存图表配置失败: ${  err.message || '网络错误'}`);
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * 批量保存配置
   * @param {Object} data - 批量数据
   * @returns {Promise<Object>} 保存结果
   */
  async function batchSaveConfigs(data) {
    saving.value = true;
    error.value = null;

    try {
      const result = await fetchWithRetry(() => dashboardApi.batchSaveConfigs(data));

      await clearCache();
      ElMessage.success('批量配置保存成功');

      return result;
    } catch (err) {
      error.value = err;
      ElMessage.error(`批量保存失败: ${  err.message || '网络错误'}`);
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * 删除待办事项
   * @param {string} todoId - 待办事项ID
   * @returns {Promise<Object>} 删除结果
   */
  async function deleteTodo(todoId) {
    saving.value = true;
    error.value = null;

    try {
      const data = await dashboardApi.deleteTodo(todoId);

      await clearCache(CACHE_CONFIG.todos.key);
      ElMessage.success('待办事项删除成功');

      return data;
    } catch (err) {
      error.value = err;
      ElMessage.error(`删除待办事项失败: ${  err.message || '网络错误'}`);
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * 批量删除待办事项
   * @param {Array<string>} todoIds - 待办事项ID数组
   * @returns {Promise<Object>} 删除结果
   */
  async function batchDeleteTodos(todoIds) {
    saving.value = true;
    error.value = null;

    try {
      const data = await dashboardApi.batchDeleteTodos(todoIds);

      await clearCache(CACHE_CONFIG.todos.key);
      ElMessage.success(`成功删除 ${todoIds.length} 条待办事项`);

      return data;
    } catch (err) {
      error.value = err;
      ElMessage.error(`批量删除失败: ${  err.message || '网络错误'}`);
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * 切换待办事项状态
   * @param {string} todoId - 待办事项ID
   * @param {string} status - 新状态
   * @returns {Promise<Object>} 更新结果
   */
  async function toggleTodoStatus(todoId, status) {
    saving.value = true;
    error.value = null;

    try {
      const data = await dashboardApi.updateTodo(todoId, { status });

      await clearCache(CACHE_CONFIG.todos.key);
      ElMessage.success('状态更新成功');

      return data;
    } catch (err) {
      error.value = err;
      ElMessage.error(`状态更新失败: ${  err.message || '网络错误'}`);
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * 加载所有Dashboard数据（并行）
   * @param {Object} params - 查询参数
   * @returns {Promise<Object>} 所有Dashboard数据
   */
  async function loadAllDashboardData(params = {}) {
    loading.value = true;
    error.value = null;

    try {
      const [overview, todos, statistics, settings] = await Promise.all([
        fetchOverview(params.overview || {}),
        fetchTodos(params.todos || {}),
        fetchStatistics(params.statistics || {}),
        fetchSettings(params.userId),
      ]);

      return {
        overview,
        todos,
        statistics,
        settings,
      };
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 刷新Dashboard数据
   * @param {string} type - 数据类型 (overview/todos/statistics/settings/all)
   * @param {Object} params - 查询参数
   * @returns {Promise<Object>} 刷新后的数据
   */
  async function refreshData(type = 'all', params = {}) {
    try {
      switch (type) {
      case 'overview':
        return await fetchOverview(params, true);
      case 'todos':
        return await fetchTodos(params, true);
      case 'statistics':
        return await fetchStatistics(params, true);
      case 'settings':
        return await fetchSettings(params.userId, true);
      case 'all':
        return await loadAllDashboardData(params);
      default:
        throw new Error(`未知的数据类型: ${type}`);
      }
    } catch (err) {
      ElMessage.error(`刷新${type}数据失败: ${err.message}`);
      throw err;
    }
  }

  // 计算属性
  const isLoading = computed(() => loading.value);
  const isSaving = computed(() => saving.value);
  const hasError = computed(() => error.value !== null);

  return {
    loading: isLoading,
    saving: isSaving,
    error,
    hasError,
    cacheEnabled,
    lastFetchTime,

    fetchOverview,
    fetchTodos,
    fetchStatistics,
    fetchSettings,
    loadAllDashboardData,
    refreshData,

    saveTodo,
    batchSaveTodos,
    saveSettings,
    saveChartConfig,
    batchSaveConfigs,
    deleteTodo,
    batchDeleteTodos,
    toggleTodoStatus,

    clearCache,
    setCache,
    getFromCache,
  };
}

export default useDashboardData;
