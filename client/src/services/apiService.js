/**
 * 智慧村庄平台 - API服务类
 * 统一管理所有RESTful API调用
 */

import axios from 'axios';
import { ElMessage, ElLoading } from 'element-plus';

// API基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 添加认证token
    const token = localStorage.getItem('jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 添加用户信息
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      config.headers['X-User-Id'] = JSON.parse(userInfo).id;
      config.headers['X-Village-Id'] = JSON.parse(userInfo).villageId;
    }

    // 添加请求ID
    config.headers['X-Request-ID'] = generateRequestId();

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 统一错误处理
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // 未授权，清除token并跳转登录
          localStorage.removeItem('jwt_token');
          localStorage.removeItem('user_info');
          ElMessage.error('登录已过期，请重新登录');
          window.location.href = '/login';
          break;
        case 403:
          ElMessage.error(data.error || '权限不足');
          break;
        case 404:
          ElMessage.error(data.error || '请求的资源不存在');
          break;
        case 429:
          ElMessage.error('请求过于频繁，请稍后再试');
          break;
        case 500:
          ElMessage.error(data.error || '服务器内部错误');
          break;
        default:
          ElMessage.error(data.error || '网络请求失败');
      }
    } else if (error.request) {
      ElMessage.error('网络连接失败，请检查网络设置');
    } else {
      ElMessage.error('请求配置错误');
    }

    return Promise.reject(error);
  }
);

// 生成请求ID
function generateRequestId() {
  return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Loading管理
let loadingInstance = null;

function showLoading(text = '加载中...') {
  loadingInstance = ElLoading.service({
    lock: true,
    text,
    background: 'rgba(0, 0, 0, 0.7)'
  });
}

function hideLoading() {
  if (loadingInstance) {
    loadingInstance.close();
    loadingInstance = null;
  }
}

/**
 * API服务类
 */
class ApiService {
  constructor() {
    this.client = apiClient;
  }

  /**
   * 通用请求方法
   */
  async request(config, showLoading = true) {
    if (showLoading) {
      showLoading();
    }

    try {
      const response = await this.client(config);
      return response.data;
    } finally {
      if (showLoading) {
        hideLoading();
      }
    }
  }

  /**
   * GET请求
   */
  async get(url, params = {}, showLoading = false) {
    return this.request({
      method: 'GET',
      url,
      params
    }, showLoading);
  }

  /**
   * POST请求
   */
  async post(url, data = {}, showLoading = true) {
    return this.request({
      method: 'POST',
      url,
      data
    }, showLoading);
  }

  /**
   * PUT请求
   */
  async put(url, data = {}, showLoading = true) {
    return this.request({
      method: 'PUT',
      url,
      data
    }, showLoading);
  }

  /**
   * DELETE请求
   */
  async delete(url, showLoading = true) {
    return this.request({
      method: 'DELETE',
      url
    }, showLoading);
  }

  // ========================================
  // 用户管理 API
  // ========================================

  /**
   * 获取用户列表
   */
  async getUserList(params = {}) {
    return this.get('/users', {
      page: params.page || 1,
      limit: params.limit || 20,
      search: params.search,
      role: params.role,
      villageId: params.villageId
    });
  }

  /**
   * 获取用户详情
   */
  async getUserDetail(userId) {
    return this.get(`/users/${userId}`);
  }

  /**
   * 创建用户
   */
  async createUser(userData) {
    return this.post('/users', userData);
  }

  /**
   * 更新用户信息
   */
  async updateUser(userId, userData) {
    return this.put(`/users/${userId}`, userData);
  }

  /**
   * 删除用户
   */
  async deleteUser(userId) {
    return this.delete(`/users/${userId}`);
  }

  /**
   * 获取用户统计
   */
  async getUserStats() {
    return this.get('/users/stats');
  }

  // ========================================
  // 村务管理 API
  // ========================================

  /**
   * 获取公告列表
   */
  async getAnnouncementList(params = {}) {
    return this.get('/village/announcements', {
      page: params.page || 1,
      limit: params.limit || 20,
      category: params.category,
      status: params.status
    });
  }

  /**
   * 创建公告
   */
  async createAnnouncement(announcementData) {
    return this.post('/village/announcements', announcementData);
  }

  /**
   * 更新公告
   */
  async updateAnnouncement(announcementId, announcementData) {
    return this.put(`/village/announcements/${announcementId}`, announcementData);
  }

  /**
   * 删除公告
   */
  async deleteAnnouncement(announcementId) {
    return this.delete(`/village/announcements/${announcementId}`);
  }

  /**
   * 获取村庄统计
   */
  async getVillageStats() {
    return this.get('/village/stats');
  }

  // ========================================
  // 财务管理 API
  // ========================================

  /**
   * 获取交易记录
   */
  async getTransactionList(params = {}) {
    return this.get('/finance/transactions', {
      page: params.page || 1,
      limit: params.limit || 20,
      type: params.type,
      startDate: params.startDate,
      endDate: params.endDate
    }, false);
  }

  /**
   * 创建交易记录
   */
  async createTransaction(transactionData) {
    return this.post('/finance/transactions', transactionData);
  }

  /**
   * 审批交易
   */
  async approveTransaction(transactionId, approvalData) {
    return this.put(`/finance/transactions/${transactionId}/approve`, approvalData);
  }

  /**
   * 财务统计
   */
  async getFinancialStats() {
    return this.get('/finance/stats');
  }

  /**
   * 发票OCR识别
   */
  async recognizeInvoice(imageData) {
    return this.post('/finance/invoices/recognize', { imageData });
  }

  // ========================================
  // 应急管理 API
  // ========================================

  /**
   * 获取应急报告列表
   */
  async getEmergencyReportList(params = {}) {
    return this.get('/emergency/reports', {
      page: params.page || 1,
      limit: params.limit || 20,
      status: params.status,
      type: params.type
    });
  }

  /**
   * 创建应急报告
   */
  async createEmergencyReport(reportData) {
    return this.post('/emergency/reports', reportData);
  }

  /**
   * 更新应急状态
   */
  async updateEmergencyStatus(reportId, statusData) {
    return this.put(`/emergency/reports/${reportId}/status`, statusData);
  }

  /**
   * 广播应急警报
   */
  async broadcastEmergencyAlert(broadcastData) {
    return this.post('/emergency/broadcast', broadcastData);
  }

  // ========================================
  // 数据分析 API
  // ========================================

  /**
   * 获取村庄数据分析
   */
  async getVillageAnalytics(params = {}) {
    return this.get('/analytics/village', {
      startDate: params.startDate,
      endDate: params.endDate,
      metrics: params.metrics
    });
  }

  /**
   * 获取实时指标
   */
  async getRealtimeMetrics() {
    return this.get('/analytics/realtime');
  }

  /**
   * 生成分析报告
   */
  async generateReport(reportData) {
    return this.post('/analytics/reports', reportData);
  }

  /**
   * 导出数据
   */
  async exportData(type, params = {}) {
    return this.get(`/analytics/export/${type}`, {
      format: params.format || 'csv',
      filters: JSON.stringify(params.filters || {})
    });
  }

  // ========================================
  // 电子商务 API
  // ========================================

  /**
   * 获取产品列表
   */
  async getProductList(params = {}) {
    return this.get('/ecommerce/products', {
      page: params.page || 1,
      limit: params.limit || 20,
      category: params.category,
      search: params.search,
      sort: params.sort
    });
  }

  /**
   * 创建产品
   */
  async createProduct(productData) {
    return this.post('/ecommerce/products', productData);
  }

  /**
   * 获取订单列表
   */
  async getOrderList(params = {}) {
    return this.get('/ecommerce/orders', {
      page: params.page || 1,
      limit: params.limit || 20,
      status: params.status,
      userId: params.userId
    });
  }

  /**
   * 创建订单
   */
  async createOrder(orderData) {
    return this.post('/ecommerce/orders', orderData);
  }

  // ========================================
  // 支付管理 API
  // ========================================

  /**
   * 发起支付
   */
  async initiatePayment(paymentData) {
    return this.post('/payments/initiate', paymentData);
  }

  /**
   * 确认支付
   */
  async confirmPayment(paymentData) {
    return this.post('/payments/confirm', paymentData);
  }

  /**
   * 获取支付历史
   */
  async getPaymentHistory(params = {}) {
    return this.get('/payments/history', {
      page: params.page || 1,
      limit: params.limit || 20,
      startDate: params.startDate,
      endDate: params.endDate
    });
  }

  /**
   * 退款
   */
  async refundPayment(paymentData) {
    return this.post('/payments/refund', paymentData);
  }

  // ========================================
  // 权限管理 API
  // ========================================

  /**
   * 获取用户权限
   */
  async getUserPermissions(userId) {
    return this.get(`/permissions/user/${userId}`);
  }

  /**
   * 分配角色
   */
  async assignRole(roleData) {
    return this.post('/permissions/assign', roleData);
  }

  /**
   * 更新权限
   */
  async updatePermissions(permissionData) {
    return this.put('/permissions/update', permissionData);
  }

  /**
   * 检查权限
   */
  async checkPermission(permissionData) {
    return this.post('/permissions/check', permissionData);
  }

  // ========================================
  // 系统信息 API
  // ========================================

  /**
   * 获取API信息
   */
  async getAPIInfo() {
    return this.get('/');
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    return this.get('/health');
  }

  /**
   * 获取API文档
   */
  async getAPIDocumentation() {
    return this.get('/docs');
  }

  /**
   * 获取Postman集合
   */
  async getPostmanCollection() {
    return this.get('/postman');
  }
}

// 创建全局API服务实例
const apiService = new ApiService();

// 文件上传辅助方法
apiService.uploadFile = async (url, file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  return this.client.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    }
  });
};

// 批量操作辅助方法
apiService.batchRequest = async (requests) => {
  try {
    const responses = await Promise.allSettled(
      requests.map(request =>
        this.request(request.config, false)
      )
    );

    return {
      successful: responses.filter(r => r.status === 'fulfilled'),
      failed: responses.filter(r => r.status === 'rejected')
    };
  } catch (error) {
    console.error('批量请求失败:', error);
    throw error;
  }
};

export default apiService;
export { API_BASE_URL };