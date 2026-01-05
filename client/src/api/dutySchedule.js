/**
 * 智能值班表API
 * @module api/dutySchedule
 */
import request from '@/utils/request';

const dutyScheduleApi = {
  /**
   * 获取今日值班信息
   * @param {string} villageId - 村庄ID
   * @returns {Promise} 今日值班数据
   */
  getTodayDuty(villageId) {
    return request.get(`/api/v1/duty-schedule/public/today/${villageId}`);
  },

  /**
   * 获取日历视图数据
   * @param {Object} params - 查询参数
   * @param {number} params.year - 年份
   * @param {number} params.month - 月份 (1-12)
   * @returns {Promise} 日历事件数据
   */
  getCalendarData(params) {
    return request.get('/api/v1/duty-schedule/calendar', { params });
  },

  /**
   * 扫码呼叫值班人员（村民端）
   * @param {Object} data - 呼叫数据
   * @param {string} data.qrCodeData - 二维码数据
   * @param {string} data.urgency - 紧急程度 (LOW/MEDIUM/HIGH/URGENT)
   * @param {string} data.content - 呼叫内容
   * @param {Object} data.location - 位置信息
   * @returns {Promise} 呼叫结果
   */
  scanAndCall(data) {
    return request.post('/api/v1/duty-schedule/scan-call', data);
  },

  /**
   * 智能排班 - 自动生成值班表
   * @param {string} scheduleId - 值班表ID
   * @param {Object} options - 排班选项
   * @param {string} options.startDate - 开始日期
   * @param {string} options.endDate - 结束日期
   * @param {boolean} options.balanceWorkload - 是否平衡工作量
   * @param {boolean} options.considerPreferences - 是否考虑偏好
   * @param {boolean} options.enforceRestTime - 是否强制休息时间
   * @returns {Promise} 排班结果
   */
  generateSmartSchedule(scheduleId, options = {}) {
    return request.post(`/api/v1/duty-schedule/${scheduleId}/smart-schedule`, options);
  },

  /**
   * 获取值班表列表
   * @param {Object} params - 查询参数
   * @returns {Promise} 值班表列表
   */
  getSchedules(params = {}) {
    return request.get('/api/v1/duty-schedule', { params });
  },

  /**
   * 创建值班表
   * @param {Object} data - 值班表数据
   * @returns {Promise} 创建的值班表
   */
  createSchedule(data) {
    return request.post('/api/v1/duty-schedule', data);
  },

  /**
   * 更新值班表
   * @param {string} scheduleId - 值班表ID
   * @param {Object} data - 更新数据
   * @returns {Promise} 更新后的值班表
   */
  updateSchedule(scheduleId, data) {
    return request.put(`/api/v1/duty-schedule/${scheduleId}`, data);
  },

  /**
   * 删除值班表
   * @param {string} scheduleId - 值班表ID
   * @returns {Promise} 删除结果
   */
  deleteSchedule(scheduleId) {
    return request.delete(`/api/v1/duty-schedule/${scheduleId}`);
  },

  /**
   * 发布值班表（生成二维码）
   * @param {string} scheduleId - 值班表ID
   * @returns {Promise} 包含二维码的值班表
   */
  publishSchedule(scheduleId) {
    return request.post(`/api/v1/duty-schedule/${scheduleId}/publish`);
  },

  /**
   * 获取值班统计
   * @param {string} villageId - 村庄ID
   * @param {Object} params - 查询参数
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @returns {Promise} 统计数据
   */
  getStatistics(villageId, params = {}) {
    return request.get(`/api/v1/duty-schedule/statistics/${villageId}`, { params });
  },

  /**
   * 获取呼叫记录（村民端）
   * @param {Object} params - 查询参数
   * @param {number} params.limit - 每页数量
   * @param {number} params.skip - 跳过数量
   * @returns {Promise} 呼叫记录列表
   */
  getCallerLogs(params = {}) {
    return request.get('/api/v1/duty-schedule/caller-logs', { params });
  },

  /**
   * 获取值班人员呼叫记录
   * @param {string} officerId - 值班人员ID
   * @param {Object} params - 查询参数
   * @returns {Promise} 呼叫记录列表
   */
  getOfficerCalls(officerId, params = {}) {
    return request.get(`/api/v1/duty-schedule/officer-calls/${officerId}`, { params });
  },

  /**
   * 响应呼叫
   * @param {string} callId - 呼叫ID
   * @param {Object} data - 响应数据
   * @param {string} data.note - 响应备注
   * @returns {Promise} 响应结果
   */
  respondCall(callId, data) {
    return request.post(`/api/v1/duty-schedule/calls/${callId}/respond`, data);
  },

  /**
   * 解决呼叫
   * @param {string} callId - 呼叫ID
   * @param {Object} data - 解决数据
   * @param {string} data.resolution - 解决方案
   * @returns {Promise} 解决结果
   */
  resolveCall(callId, data) {
    return request.post(`/api/v1/duty-schedule/calls/${callId}/resolve`, data);
  },

  /**
   * 评价呼叫服务
   * @param {string} callId - 呼叫ID
   * @param {Object} data - 评价数据
   * @param {number} data.rating - 评分 (1-5)
   * @param {string} data.feedback - 反馈意见
   * @returns {Promise} 评价结果
   */
  rateCall(callId, data) {
    return request.post(`/api/v1/duty-schedule/calls/${callId}/rate`, data);
  },

  /**
   * 获取超时未响应的呼叫
   * @param {string} villageId - 村庄ID
   * @returns {Promise} 超时呼叫列表
   */
  getTimeoutCalls(villageId) {
    return request.get(`/api/v1/duty-schedule/timeout-calls/${villageId}`);
  }
};

export default dutyScheduleApi;
