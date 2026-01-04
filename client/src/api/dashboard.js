/**
 * 村委仪表板 API
 * 整合所有仪表板需要的接口
 * @module api/dashboard
 */
import request from '@/utils/request'

const dashboardApi = {
  /**
   * 获取仪表板数据概览
   * @param {Object} params - 查询参数
   * @param {string} params.villageId - 村庄ID
   * @returns {Promise} 仪表板数据
   */
  getOverview(params = {}) {
    return request.get('/api/v1/dashboard/overview', { params })
  },

  /**
   * 获取统计数据
   * @param {Object} params - 查询参数
   * @param {string} params.villageId - 村庄ID
   * @param {string} params.period - 统计周期 (week/month/year)
   * @returns {Promise} 统计数据
   */
  getStatistics(params = {}) {
    return request.get('/api/v1/dashboard/statistics', { params })
  },

  /**
   * 获取今日值班信息
   * @param {string} villageId - 村庄ID
   * @returns {Promise} 今日值班数据
   */
  getTodayDuty(villageId) {
    return request.get(`/api/v1/duty-schedule/public/today/${villageId}`)
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
    return request.get('/api/v1/cadre-tasks', { params })
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
    return request.put(`/api/v1/cadre-tasks/${taskId}/status`, data)
  },

  /**
   * 获取通知列表
   * @param {Object} params - 查询参数
   * @param {number} params.limit - 每页数量
   * @param {boolean} params.unreadOnly - 仅未读
   * @returns {Promise} 通知列表
   */
  getNotifications(params = {}) {
    return request.get('/api/notifications', { params })
  },

  /**
   * 标记通知为已读
   * @param {string} notificationId - 通知ID
   * @returns {Promise} 标记结果
   */
  markNotificationRead(notificationId) {
    return request.put(`/api/notifications/${notificationId}/read`)
  },

  /**
   * 批量标记通知为已读
   * @param {Array<string>} notificationIds - 通知ID数组
   * @returns {Promise} 标记结果
   */
  markMultipleNotificationsRead(notificationIds) {
    return request.put('/api/notifications/read-all', { notificationIds })
  },

  /**
   * 获取未读通知数量
   * @returns {Promise} 未读数量
   */
  getUnreadCount() {
    return request.get('/api/notifications/unread/count')
  },

  /**
   * 删除通知
   * @param {string} notificationId - 通知ID
   * @returns {Promise} 删除结果
   */
  deleteNotification(notificationId) {
    return request.delete(`/api/notifications/${notificationId}`)
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
    return request.post('/api/village-committee/emergency-notification', data)
  },

  /**
   * 获取村民动态
   * @param {Object} params - 查询参数
   * @param {number} params.limit - 每页数量
   * @param {string} params.villageId - 村庄ID
   * @returns {Promise} 动态列表
   */
  getActivities(params = {}) {
    return request.get('/api/v1/activities', { params })
  },

  /**
   * 获取图表数据
   * @param {Object} params - 查询参数
   * @param {string} params.period - 时间周期 (week/month/year)
   * @param {string} params.villageId - 村庄ID
   * @returns {Promise} 图表数据
   */
  getChartData(params = {}) {
    return request.get('/api/v1/analytics/dashboard', { params })
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
      responseType: 'blob'
    })
  },

  /**
   * 拨打电话
   * @param {string} phone - 电话号码
   * @returns {Promise} 拨打结果
   */
  makeCall(phone) {
    return request.post('/api/v1/communications/call', { phone })
  },

  /**
   * 发送短信
   * @param {Object} data - 短信数据
   * @param {string} data.phone - 电话号码
   * @param {string} data.message - 短信内容
   * @returns {Promise} 发送结果
   */
  sendSMS(data) {
    return request.post('/api/v1/communications/sms', data)
  }
}

export default dashboardApi
