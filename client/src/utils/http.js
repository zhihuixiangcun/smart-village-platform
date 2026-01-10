/**
 * API 请求工具
 * 统一管理所有的API请求，处理错误和状态
 */

import axios from 'axios';
import { ElMessage, ElLoading } from 'element-plus';
import { useUserStore } from '@/stores/user';

// 创建axios实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求加载状态管理
let loadingInstance = null;
let loadingCount = 0;

/**
 * 显示加载状态
 */
function showLoading() {
  loadingCount++;
  if (loadingCount === 1) {
    loadingInstance = ElLoading.service({
      lock: true,
      text: '加载中...',
      background: 'rgba(0, 0, 0, 0.7)',
    });
  }
}

/**
 * 隐藏加载状态
 */
function hideLoading() {
  loadingCount--;
  if (loadingCount <= 0) {
    loadingCount = 0;
    if (loadingInstance) {
      loadingInstance.close();
      loadingInstance = null;
    }
  }
}

// 请求拦截器
request.interceptors.request.use(
  config => {
    // 添加认证token
    const userStore = useUserStore();
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`;
    }

    // 显示加载状态（除了特定接口）
    if (!config.hideLoading) {
      showLoading();
    }

    return config;
  },
  error => {
    hideLoading();
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  response => {
    hideLoading();

    const { data } = response;

    // 如果是文件下载，直接返回
    if (response.config.responseType === 'blob') {
      return response;
    }

    // 统一的响应处理
    if (data.status === 'success') {
      return data.data || data;
    } else {
      ElMessage.error(data.message || '请求失败');
      return Promise.reject(new Error(data.message || '请求失败'));
    }
  },
  error => {
    hideLoading();

    // 处理不同的错误状态
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
      case 401:
        ElMessage.error('登录已过期，请重新登录');
        const userStore = useUserStore();
        userStore.logout();
        // 跳转到登录页
        window.location.href = '/login';
        break;
      case 403:
        ElMessage.error('没有权限访问');
        break;
      case 404:
        ElMessage.error('请求的资源不存在');
        break;
      case 500:
        ElMessage.error('服务器内部错误');
        break;
      default:
        ElMessage.error(data?.message || `请求失败 (${status})`);
      }
    } else if (error.code === 'ECONNABORTED') {
      ElMessage.error('请求超时，请稍后重试');
    } else {
      ElMessage.error(error.message || '网络错误，请检查网络连接');
    }

    return Promise.reject(error);
  }
);

/**
 * 通用GET请求
 * @param {string} url 请求URL
 * @param {object} params 请求参数
 * @param {object} config 请求配置
 * @returns {Promise} 请求Promise
 */
export function get(url, params = {}, config = {}) {
  return request.get(url, {
    params,
    ...config,
  });
}

/**
 * 通用POST请求
 * @param {string} url 请求URL
 * @param {object} data 请求数据
 * @param {object} config 请求配置
 * @returns {Promise} 请求Promise
 */
export function post(url, data = {}, config = {}) {
  return request.post(url, data, config);
}

/**
 * 通用PUT请求
 * @param {string} url 请求URL
 * @param {object} data 请求数据
 * @param {object} config 请求配置
 * @returns {Promise} 请求Promise
 */
export function put(url, data = {}, config = {}) {
  return request.put(url, data, config);
}

/**
 * 通用DELETE请求
 * @param {string} url 请求URL
 * @param {object} config 请求配置
 * @returns {Promise} 请求Promise
 */
export function del(url, config = {}) {
  return request.delete(url, config);
}

/**
 * 文件上传
 * @param {string} url 上传URL
 * @param {FormData} formData 表单数据
 * @param {object} config 请求配置
 * @returns {Promise} 请求Promise
 */
export function upload(url, formData, config = {}) {
  return request.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    ...config,
  });
}

/**
 * 文件下载
 * @param {string} url 下载URL
 * @param {string} filename 文件名
 * @param {object} params 请求参数
 * @returns {Promise} 请求Promise
 */
export function download(url, filename, params = {}) {
  return request
    .get(url, {
      params,
      responseType: 'blob',
      hideLoading: false,
    })
    .then(response => {
      // 创建下载链接
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      ElMessage.success('文件下载成功');
      return response;
    });
}

// 导出默认实例
export default request;

// 导出请求方法
export { request, showLoading, hideLoading };
