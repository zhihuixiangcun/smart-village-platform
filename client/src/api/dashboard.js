/**
 * 村委仪表板 API
 * 整合所有仪表板需要的接口
 * @module api/dashboard
 */
import request from '@/utils/request';

const dashboardApi = {
  /**
   * 获取仪表板数据概览
   * @param {Object} params - 查询参数
   * @param {string} params.villageId - 村庄ID
   * @returns {Promise} 仪表板数据
   */
  getOverview(params = {}) {
    return request.get('/api/v1/dashboard/overview', { params });
  },

  /**
   * 获取统计数据
   * @param {Object} params - 查询参数
   * @param {string} params.villageId - 村庄ID
   * @param {string} params.period - 统计周期 (week/month/year)
   * @returns {Promise} 统计数据
   */
  getStatistics(params = {}) {
    return request.get('/api/v1/dashboard/statistics', { params });
  },

  /**
   * 获取今日值班信息
   * @param {string} villageId - 村庄ID
   * @returns {Promise} 今日值班数据
   */
  getTodayDuty(villageId) {
    return request.get(`/api/v1/duty-schedule/public/today/${villageId}`);
  },

  /**
   * 获取待办事项列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.limit - 每页数量
   * @param {string} params.status - 状态筛选
   * @returns {Promise} 待办事项列表
   */
  getTodos(params = {}) {
    return request.get('/api/v1/cadre-tasks', { params });
  },

  /**
   * 更新待办事项状态
   * @param {string} taskId - 任务ID
   * @param {Object} data - 更新数据
   * @param {string} data.status - 状态
   * @param {number} data.progress - 进度
   * @returns {Promise} 更新结果
   */
  updateTodoStatus(taskId, data) {
    return request.put(`/api/v1/cadre-tasks/${taskId}/status`, data);
  },

  /**
   * 获取通知列表
   * @param {Object} params - 查询参数
   * @param {number} params.limit - 每页数量
   * @param {boolean} params.unreadOnly - 仅未读
   * @returns {Promise} 通知列表
   */
  getNotifications(params = {}) {
    return request.get('/api/notifications', { params });
  },

  /**
   * 标记通知为已读
   * @param {string} notificationId - 通知ID
   * @returns {Promise} 标记结果
   */
  markNotificationRead(notificationId) {
    return request.put(`/api/notifications/${notificationId}/read`);
  },

  /**
   * 批量标记通知为已读
   * @param {Array<string>} notificationIds - 通知ID数组
   * @returns {Promise} 标记结果
   */
  markMultipleNotificationsRead(notificationIds) {
    return request.put('/api/notifications/read-all', { notificationIds });
  },

  /**
   * 获取未读通知数量
   * @returns {Promise} 未读数量
   */
  getUnreadCount() {
    return request.get('/api/notifications/unread/count');
  },

  /**
   * 删除通知
   * @param {string} notificationId - 通知ID
   * @returns {Promise} 删除结果
   */
  deleteNotification(notificationId) {
    return request.delete(`/api/notifications/${notificationId}`);
  },

  /**
   * 发送紧急通知
   * @param {Object} data - 通知数据
   * @param {string} data.type - 通知类型
   * @param {string} data.title - 标题
   * @param {string} data.content - 内容
   * @param {Array<string>} data.targets - 目标群体
   * @param {Array<string>} data.channels - 发送渠道
   * @returns {Promise} 发送结果
   */
  sendEmergencyNotification(data) {
    return request.post('/api/village-committee/emergency-notification', data);
  },

  /**
   * 获取村民动态
   * @param {Object} params - 查询参数
   * @param {number} params.limit - 每页数量
   * @param {string} params.villageId - 村庄ID
   * @returns {Promise} 动态列表
   */
  getActivities(params = {}) {
    return request.get('/api/v1/activities', { params });
  },

  /**
   * 获取图表数据
   * @param {Object} params - 查询参数
   * @param {string} params.period - 时间周期 (week/month/year)
   * @param {string} params.villageId - 村庄ID
   * @returns {Promise} 图表数据
   */
  getChartData(params = {}) {
    return request.get('/api/v1/analytics/dashboard', { params });
  },

  /**
   * 导出报表
   * @param {Object} params - 导出参数
   * @param {string} params.type - 报表类型
   * @param {string} params.format - 导出格式 (excel/pdf/csv)
   * @param {Object} params.filters - 筛选条件
   * @returns {Promise} 导出文件
   */
  exportReport(params = {}) {
    return request.get('/api/v1/dashboard/export', {
      params,
      responseType: 'blob',
    });
  },

  /**
   * 拨打电话
   * @param {string} phone - 电话号码
   * @returns {Promise} 拨打结果
   */
  makeCall(phone) {
    return request.post('/api/v1/communications/call', { phone });
  },

  /**
   * 发送短信
   * @param {Object} data - 短信数据
   * @param {string} data.phone - 电话号码
   * @param {string} data.message - 短信内容
   * @returns {Promise} 发送结果
   */
  sendSMS(data) {
    return request.post('/api/v1/communications/sms', data);
  },

  // ==================== Dashboard 数据保存 ====================

  /**
   * 创建待办事项
   * @param {Object} data - 待办事项数据
   * @param {string} data.title - 标题
   * @param {string} data.description - 描述
   * @param {string} data.type - 类型 (人事/党务/行政/财务/应急)
   * @param {string} data.priority - 优先级 (low/medium/high/urgent)
   * @param {string} data.status - 状态 (pending/in_progress/completed)
   * @param {Date|string} data.dueDate - 截止日期
   * @returns {Promise} 创建的待办事项
   */
  createTodo(data) {
    return request.post('/api/village/dashboard/todos', data);
  },

  /**
   * 更新待办事项
   * @param {string} todoId - 待办事项ID
   * @param {Object} data - 更新数据
   * @returns {Promise} 更新后的待办事项
   */
  updateTodo(todoId, data) {
    return request.put(`/api/village/dashboard/todos/${todoId}`, data);
  },

  /**
   * 删除待办事项
   * @param {string} todoId - 待办事项ID
   * @returns {Promise} 删除结果
   */
  deleteTodo(todoId) {
    return request.delete(`/api/village/dashboard/todos/${todoId}`);
  },

  /**
   * 批量更新待办事项状态
   * @param {Array<string>} todoIds - 待办事项ID数组
   * @param {string} status - 新状态
   * @returns {Promise} 批量更新结果
   */
  batchUpdateTodoStatus(todoIds, status) {
    return request.put('/api/village/dashboard/todos/batch', { todoIds, status });
  },

  /**
   * 批量删除待办事项
   * @param {Array<string>} todoIds - 待办事项ID数组
   * @returns {Promise} 批量删除结果
   */
  batchDeleteTodos(todoIds) {
    return request.delete('/api/village/dashboard/todos/batch', { data: { todoIds } });
  },

  /**
   * 保存Dashboard配置
   * @param {Object} config - Dashboard配置
   * @param {Array} config.widgets - Widget布局配置
   * @param {Object} config.filters - 筛选器设置
   * @param {string} config.theme - 主题设置
   * @param {Object} config.layout - 布局配置
   * @returns {Promise} 保存结果
   */
  saveDashboardSettings(config) {
    return request.post('/api/village/dashboard/settings', config);
  },

  /**
   * 保存图表配置
   * @param {Object} config - 图表配置
   * @param {string} config.chartId - 图表ID
   * @param {string} config.period - 时间周期
   * @param {Object} config.options - 图表选项
   * @returns {Promise} 保存结果
   */
  saveChartConfig(config) {
    return request.post('/api/village/dashboard/chart-config', config);
  },

  // ==================== Dashboard 数据获取 ====================

  /**
   * 获取Dashboard概览数据
   * @param {Object} params - 查询参数
   * @param {string} params.villageId - 村庄ID
   * @param {string} params.period - 时间周期 (day/week/month)
   * @returns {Promise} Dashboard概览数据
   */
  getDashboardOverview(params = {}) {
    return request.get('/api/village/dashboard/overview', { params });
  },

  /**
   * 获取待办事项列表（增强版）
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.limit - 每页数量
   * @param {string} params.status - 状态筛选
   * @param {string} params.type - 类型筛选
   * @param {string} params.priority - 优先级筛选
   * @param {Date|string} params.startDate - 开始日期
   * @param {Date|string} params.endDate - 结束日期
   * @param {string} params.keyword - 关键词搜索
   * @returns {Promise} 待办事项列表（带分页）
   */
  getTodosEnhanced(params = {}) {
    return request.get('/api/village/dashboard/todos', { params });
  },

  /**
   * 获取统计数据
   * @param {Object} params - 查询参数
   * @param {string} params.villageId - 村庄ID
   * @param {string} params.period - 统计周期 (week/month/year)
   * @param {Array<string>} params.metrics - 统计指标数组
   * @returns {Promise} 统计数据
   */
  getDashboardStatistics(params = {}) {
    return request.get('/api/village/dashboard/statistics', { params });
  },

  /**
   * 获取用户Dashboard配置
   * @param {string} userId - 用户ID（可选，默认使用当前用户）
   * @returns {Promise} Dashboard配置
   */
  getDashboardSettings(userId) {
    const url = userId ? `/api/village/dashboard/settings?userId=${userId}` : '/api/village/dashboard/settings';
    return request.get(url);
  },

  /**
   * 获取图表配置
   * @param {string} chartId - 图表ID
   * @returns {Promise} 图表配置
   */
  getChartConfig(chartId) {
    return request.get(`/api/village/dashboard/chart-config/${chartId}`);
  },

  // ==================== 批量操作 ====================

  /**
   * 批量保存待办事项
   * @param {Array<Object>} todos - 待办事项数组
   * @returns {Promise} 批量保存结果
   */
  batchSaveTodos(todos) {
    return request.post('/api/village/dashboard/todos/batch', { todos });
  },

  /**
   * 批量保存配置
   * @param {Object} data - 批量数据
   * @param {Object} data.settings - Dashboard配置
   * @param {Object} data.chartConfigs - 图表配置
   * @param {Object} data.filterConfigs - 筛选器配置
   * @returns {Promise} 批量保存结果
   */
  batchSaveConfigs(data) {
    return request.post('/api/village/dashboard/batch-save', data);
  },
};

export default dashboardApi;
