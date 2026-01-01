/**
 * API配置和基础设置
 * 统一管理API接口、请求拦截、错误处理等
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// API基础配置
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  async (config) => {
    // 添加认证token
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 添加设备信息
    config.headers['X-Device-ID'] = await AsyncStorage.getItem('deviceId') || 'unknown';
    config.headers['X-Platform'] = 'mobile';
    config.headers['X-App-Version'] = await AsyncStorage.getItem('appVersion') || '1.0.0';

    // 添加请求时间戳
    config.headers['X-Request-Time'] = Date.now();

    return config;
  },
  (error) => {
    console.error('请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 记录响应时间
    const requestTime = response.config.headers['X-Request-Time'];
    const responseTime = Date.now() - parseInt(requestTime);

    console.log(`API响应时间: ${response.config.method?.toUpperCase()} ${response.config.url} - ${responseTime}ms`);

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 处理401未授权错误
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // 尝试刷新token
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken
          });

          const { token } = response.data;
          await AsyncStorage.setItem('authToken', token);

          // 重新发送原请求
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // 刷新失败，清除认证信息
        await AsyncStorage.multiRemove(['authToken', 'refreshToken']);

        // 可以在这里触发全局登出事件
        console.log('Token刷新失败，需要重新登录');
      }
    }

    // 处理网络错误
    if (!error.response && error.code === 'NETWORK_ERROR') {
      Alert.alert(
        '网络错误',
        '无法连接到服务器，请检查网络连接',
        [{ text: '确定' }]
      );
    }

    // 处理服务器错误
    if (error.response?.status >= 500) {
      Alert.alert(
        '服务器错误',
        '服务器暂时无法响应，请稍后重试',
        [{ text: '确定' }]
      );
    }

    return Promise.reject(error);
  }
);

// 导出API实例和配置
export default api;

// 导出API基础URL
export { API_BASE_URL };

/**
 * 网络状态检查
 */
export const checkNetworkStatus = async () => {
  try {
    const response = await api.get('/health');
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

/**
 * 设置设备ID
 */
export const setupDeviceId = async () => {
  try {
    let deviceId = await AsyncStorage.getItem('deviceId');

    if (!deviceId) {
      // 生成新的设备ID
      deviceId = `mobile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem('deviceId', deviceId);
    }

    return deviceId;
  } catch (error) {
    console.error('设置设备ID失败:', error);
    return null;
  }
};

/**
 * 通用的API请求包装器
 */
export const apiRequest = async (method, url, data = null, options = {}) => {
  try {
    const config = {
      method,
      url,
      ...options
    };

    if (data) {
      config.data = data;
    }

    const response = await api(config);
    return response.data;
  } catch (error) {
    console.error('API请求失败:', error);
    throw error;
  }
};

/**
 * 上传文件
 */
export const uploadFile = async (file, uploadUrl = '/upload', onProgress = null) => {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.type,
      name: file.name || 'file',
    });

    const config = {
      method: 'POST',
      url: uploadUrl,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    };

    const response = await api(config);
    return response.data;
  } catch (error) {
    console.error('文件上传失败:', error);
    throw error;
  }
};

/**
 * 批量上传文件
 */
export const uploadMultipleFiles = async (files, uploadUrl = '/upload/batch', onProgress = null) => {
  try {
    const formData = new FormData();

    files.forEach((file, index) => {
      formData.append(`files[${index}]`, {
        uri: file.uri,
        type: file.type,
        name: file.name || `file_${index}`,
      });
    });

    const config = {
      method: 'POST',
      url: uploadUrl,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    };

    const response = await api(config);
    return response.data;
  } catch (error) {
    console.error('批量文件上传失败:', error);
    throw error;
  }
};

/**
 * 下载文件
 */
export const downloadFile = async (downloadUrl, fileName) => {
  try {
    const response = await api({
      method: 'GET',
      url: downloadUrl,
      responseType: 'blob'
    });

    // 在React Native中，这里需要使用文件系统API来保存文件
    // 实际实现需要根据具体需求调整
    console.log('文件下载完成:', fileName);

    return {
      success: true,
      data: response.data,
      fileName
    };
  } catch (error) {
    console.error('文件下载失败:', error);
    throw error;
  }
};

/**
 * API错误处理
 */
export const handleApiError = (error, defaultMessage = '操作失败') => {
  if (error.response) {
    const { status, data } = error.response;

    switch (status) {
      case 400:
        return data?.message || '请求参数错误';
      case 401:
        return '登录已过期，请重新登录';
      case 403:
        return '没有操作权限';
      case 404:
        return '请求的资源不存在';
      case 409:
        return data?.message || '数据冲突';
      case 422:
        return data?.message || '数据验证失败';
      case 429:
        return '请求过于频繁，请稍后重试';
      case 500:
        return '服务器内部错误';
      case 502:
        return '网关错误';
      case 503:
        return '服务暂时不可用';
      default:
        return data?.message || defaultMessage;
    }
  } else if (error.request) {
    return '网络请求失败，请检查网络连接';
  } else {
    return error.message || defaultMessage;
  }
};

/**
 * 重试机制
 */
export const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;

      if (i < maxRetries - 1) {
        console.log(`请求失败，${delay}ms后重试 (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // 指数退避
      }
    }
  }

  throw lastError;
};

/**
 * 请求缓存管理
 */
class RequestCache {
  constructor(ttl = 5 * 60 * 1000) { // 默认5分钟
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  clear() {
    this.cache.clear();
  }

  delete(key) {
    this.cache.delete(key);
  }
}

export const requestCache = new RequestCache();

/**
 * 带缓存的API请求
 */
export const cachedRequest = async (cacheKey, requestFn, ttl) => {
  // 检查缓存
  const cached = requestCache.get(cacheKey);
  if (cached) {
    console.log(`从缓存获取数据: ${cacheKey}`);
    return cached;
  }

  // 设置临时TTL
  if (ttl) {
    const originalTtl = requestCache.ttl;
    requestCache.ttl = ttl;
  }

  try {
    // 执行请求
    const result = await requestFn();

    // 存储到缓存
    requestCache.set(cacheKey, result);

    console.log(`缓存数据: ${cacheKey}`);
    return result;
  } finally {
    // 恢复原始TTL
    if (ttl) {
      requestCache.ttl = originalTtl;
    }
  }
};

/**
 * API请求统计
 */
class ApiStats {
  constructor() {
    this.stats = {
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalResponseTime: 0
    };
  }

  record(success, responseTime) {
    this.stats.totalRequests++;
    this.stats.totalResponseTime += responseTime;

    if (success) {
      this.stats.successRequests++;
    } else {
      this.stats.failedRequests++;
    }

    this.stats.averageResponseTime = Math.round(
      this.stats.totalResponseTime / this.stats.totalRequests
    );
  }

  getStats() {
    return { ...this.stats };
  }

  reset() {
    this.stats = {
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalResponseTime: 0
    };
  }
}

export const apiStats = new ApiStats();