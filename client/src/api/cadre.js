/**
 * 村干部管理 API 接口
 * 提供村干部主页相关的所有API调用
 */
import request from '@/utils/request'

/**
 * 获取仪表盘所有数据
 * @param {Object} params 查询参数
 * @returns {Promise} 包含统计、值班、待办、通知等数据
 */
export function getDashboardData(params = {}) {
  return request.get('/api/v1/cadre/dashboard', params)
}

/**
 * 获取今日值班信息
 * @param {string} date 日期 (YYYY-MM-DD格式，可选，默认今天)
 * @returns {Promise} 值班人员列表
 */
export function getTodayDuty(date) {
  const params = date ? { date } : {}
  return request.get('/api/v1/cadre/duty/today', params)
}

/**
 * 更新待办事项状态
 * @param {string} id 待办事项ID
 * @param {Object} data 更新数据 { completed: boolean, status: string }
 * @returns {Promise} 更新后的待办事项
 */
export function updateTodoStatus(id, data) {
  return request.put(`/api/v1/cadre/todos/${id}/status`, data)
}

/**
 * 发送紧急通知
 * @param {Object} data 通知数据
 * @returns {Promise} 发送结果
 */
export function sendEmergencyNotice(data) {
  return request.post('/api/v1/cadre/emergency', data)
}

/**
 * 获取通知列表
 * @param {Object} params 查询参数 { page, limit, level, readStatus }
 * @returns {Promise} 通知列表
 */
export function getNotices(params = {}) {
  return request.get('/api/v1/cadre/notices', params)
}

/**
 * 获取通知详情
 * @param {string} id 通知ID
 * @returns {Promise} 通知详情
 */
export function getNoticeDetail(id) {
  return request.get(`/api/v1/cadre/notices/${id}`)
}

/**
 * 标记通知已读
 * @param {string} id 通知ID
 * @returns {Promise} 标记结果
 */
export function markNoticeRead(id) {
  return request.put(`/api/v1/cadre/notices/${id}/read`)
}

/**
 * 批量标记通知已读
 * @param {Array<string>} ids 通知ID数组
 * @returns {Promise} 标记结果
 */
export function batchMarkNoticesRead(ids) {
  return request.put('/api/v1/cadre/notices/batch-read', { ids })
}

/**
 * 获取村民动态
 * @param {Object} params 查询参数 { page, limit, timeRange }
 * @returns {Promise} 村民动态列表
 */
export function getActivities(params = {}) {
  return request.get('/api/v1/cadre/activities', params)
}

/**
 * 获取统计数据
 * @param {string} period 统计周期 (week/month/year)
 * @returns {Promise} 统计数据
 */
export function getStatistics(period) {
  return request.get('/api/v1/cadre/statistics', { period })
}

/**
 * 导出报表
 * @param {string} type 报表类型 (excel/pdf)
 * @param {Object} params 导出参数
 * @returns {Promise} 文件流
 */
export function exportReport(type, params = {}) {
  return request.get(`/api/v1/cadre/export/${type}`, params, {
    responseType: 'blob'
  })
}

/**
 * 获取待办事项列表
 * @param {Object} params 查询参数 { status, type, priority }
 * @returns {Promise} 待办事项列表
 */
export function getTodos(params = {}) {
  return request.get('/api/v1/cadre/todos', params)
}

/**
 * 创建待办事项
 * @param {Object} data 待办数据
 * @returns {Promise} 创建的待办事项
 */
export function createTodo(data) {
  return request.post('/api/v1/cadre/todos', data)
}

/**
 * 删除待办事项
 * @param {string} id 待办事项ID
 * @returns {Promise} 删除结果
 */
export function deleteTodo(id) {
  return request.delete(`/api/v1/cadre/todos/${id}`)
}

/**
 * 获取快捷操作配置
 * @returns {Promise} 快捷操作列表
 */
export function getQuickActions() {
  return request.get('/api/v1/cadre/quick-actions')
}

/**
 * 保存快捷操作配置
 * @param {Array<string>} actions 操作ID数组
 * @returns {Promise} 保存结果
 */
export function saveQuickActions(actions) {
  return request.put('/api/v1/cadre/quick-actions', { actions })
}

/**
 * 下载通知附件
 * @param {string} noticeId 通知ID
 * @param {string} fileId 文件ID
 * @returns {Promise} 文件流
 */
export function downloadNoticeAttachment(noticeId, fileId) {
  return request.get(`/api/v1/cadre/notices/${noticeId}/attachments/${fileId}`, {}, {
    responseType: 'blob'
  })
}

/**
 * 获取用户积分
 * @param {Object} params 查询参数 { period }
 * @returns {Promise} 积分数据
 */
export function getUserPoints(params = {}) {
  return request.get('/api/v1/cadre/points', params)
}

// 导出所有API作为对象
export const cadreApi = {
  getDashboardData,
  getTodayDuty,
  updateTodoStatus,
  sendEmergencyNotice,
  getNotices,
  getNoticeDetail,
  markNoticeRead,
  batchMarkNoticesRead,
  getActivities,
  getStatistics,
  exportReport,
  getTodos,
  createTodo,
  deleteTodo,
  getQuickActions,
  saveQuickActions,
  downloadNoticeAttachment,
  getUserPoints
}

export default cadreApi
