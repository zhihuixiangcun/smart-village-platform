/**
 * 用户反馈相关API
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const feedbackApi = {
  /**
   * 提交反馈
   * @param {Object} data 反馈数据
   * @param {FormData} attachments 附件（可选）
   */
  submitFeedback: async (data, attachments = null) => {
    const formData = new FormData();

    // 添加基本字段
    Object.keys(data).forEach(key => {
      if (key !== 'attachments') {
        formData.append(key, data[key]);
      }
    });

    // 添加附件
    if (attachments && attachments.length > 0) {
      attachments.forEach(file => {
        formData.append('attachments', file);
      });
    }

    const response = await axios.post(`${API_BASE_URL}/api/v1/feedback`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  /**
   * 获取反馈列表
   * @param {Object} params 查询参数
   */
  getFeedbackList: async (params = {}) => {
    const response = await axios.get(`${API_BASE_URL}/api/v1/feedback`, { params });
    return response.data;
  },

  /**
   * 获取反馈详情
   * @param {string} feedbackId 反馈ID
   */
  getFeedbackDetail: async (feedbackId) => {
    const response = await axios.get(`${API_BASE_URL}/api/v1/feedback/${feedbackId}`);
    return response.data;
  },

  /**
   * 处理反馈
   * @param {string} feedbackId 反馈ID
   * @param {Object} data 处理数据
   */
  processFeedback: async (feedbackId, data) => {
    const response = await axios.put(`${API_BASE_URL}/api/v1/feedback/${feedbackId}`, data);
    return response.data;
  },

  /**
   * 添加满意度评价
   * @param {string} feedbackId 反馈ID
   * @param {Object} ratingData 评价数据
   */
  addSatisfactionRating: async (feedbackId, ratingData) => {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/feedback/${feedbackId}/satisfaction`,
      ratingData
    );
    return response.data;
  },

  /**
   * 获取反馈统计
   * @param {Object} params 查询参数
   */
  getFeedbackStats: async (params = {}) => {
    const response = await axios.get(`${API_BASE_URL}/api/v1/feedback/stats`, { params });
    return response.data;
  },

  /**
   * 获取分类统计
   */
  getCategoryStats: async () => {
    const response = await axios.get(`${API_BASE_URL}/api/v1/feedback/categories/stats`);
    return response.data;
  },

  /**
   * AI分析反馈趋势
   */
  analyzeFeedbackTrends: async () => {
    const response = await axios.get(`${API_BASE_URL}/api/v1/feedback/analyze/trends`);
    return response.data;
  },

  /**
   * 推荐改进方案
   * @param {Object} data 问题领域
   */
  recommendImprovements: async (data) => {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/feedback/recommend/improvements`,
      data
    );
    return response.data;
  },

  /**
   * 导出反馈数据
   * @param {Object} params 导出参数
   */
  exportFeedbackData: async (params = {}) => {
    const response = await axios.get(`${API_BASE_URL}/api/v1/feedback/export`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * 获取用户反馈历史
   * @param {string} userId 用户ID
   * @param {Object} params 分页参数
   */
  getUserFeedbackHistory: async (userId, params = {}) => {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/feedback/user/${userId}`,
      { params }
    );
    return response.data;
  },

  /**
   * 批量处理反馈
   * @param {Object} data 批量处理数据
   */
  batchProcessFeedback: async (data) => {
    const response = await axios.post(`${API_BASE_URL}/api/v1/feedback/batch`, data);
    return response.data;
  },

  /**
   * 获取反馈分类选项
   */
  getCategoryOptions: () => [
    { label: 'Bug报告', value: 'bug_report' },
    { label: '功能请求', value: 'feature_request' },
    { label: '改进建议', value: 'improvement' },
    { label: '投诉', value: 'complaint' },
    { label: '表扬', value: 'compliment' },
    { label: '问题咨询', value: 'question' },
    { label: '使用困难', value: 'usage_difficulty' }
  ],

  /**
   * 获取状态选项
   */
  getStatusOptions: () => [
    { label: '待处理', value: 'pending' },
    { label: '审核中', value: 'in_review' },
    { label: '处理中', value: 'in_progress' },
    { label: '已解决', value: 'resolved' },
    { label: '已关闭', value: 'closed' },
    { label: '已拒绝', value: 'rejected' }
  ],

  /**
   * 获取优先级选项
   */
  getPriorityOptions: () => [
    { label: '低', value: 'low' },
    { label: '中', value: 'medium' },
    { label: '高', value: 'high' },
    { label: '紧急', value: 'urgent' }
  ]
};

export default feedbackApi;