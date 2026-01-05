/**
 * 村干部管理 API 接口
 * 提供村干部主页相关的所有API调用
 */
import request from '@/utils/request';

/**
 * 获取仪表盘所有数据
 * @param {Object} params 查询参数
 * @returns {Promise} 包含统计、值班、待办、通知等数据
 */
export function getDashboardData(params = {}) {
  return request.get('/api/v1/cadre/dashboard', params);
}

/**
 * 获取今日值班信息
 * @param {string} date 日期 (YYYY-MM-DD格式，可选，默认今天)
 * @returns {Promise} 值班人员列表
 */
export function getTodayDuty(date) {
  const params = date ? { date } : {};
  return request.get('/api/v1/cadre/duty/today', params);
}

/**
 * 更新待办事项状态
 * @param {string} id 待办事项ID
 * @param {Object} data 更新数据 { completed: boolean, status: string }
 * @returns {Promise} 更新后的待办事项
 */
export function updateTodoStatus(id, data) {
  return request.put(`/api/v1/cadre/todos/${id}/status`, data);
}

/**
 * 发送紧急通知
 * @param {Object} data 通知数据
 * @returns {Promise} 发送结果
 */
export function sendEmergencyNotice(data) {
  return request.post('/api/v1/cadre/emergency', data);
}

/**
 * 获取通知列表
 * @param {Object} params 查询参数 { page, limit, level, readStatus }
 * @returns {Promise} 通知列表
 */
export function getNotices(params = {}) {
  return request.get('/api/v1/cadre/notices', params);
}

/**
 * 获取通知详情
 * @param {string} id 通知ID
 * @returns {Promise} 通知详情
 */
export function getNoticeDetail(id) {
  return request.get(`/api/v1/cadre/notices/${id}`);
}

/**
 * 标记通知已读
 * @param {string} id 通知ID
 * @returns {Promise} 标记结果
 */
export function markNoticeRead(id) {
  return request.put(`/api/v1/cadre/notices/${id}/read`);
}

/**
 * 批量标记通知已读
 * @param {Array<string>} ids 通知ID数组
 * @returns {Promise} 标记结果
 */
export function batchMarkNoticesRead(ids) {
  return request.put('/api/v1/cadre/notices/batch-read', { ids });
}

/**
 * 获取村民动态
 * @param {Object} params 查询参数 { page, limit, timeRange }
 * @returns {Promise} 村民动态列表
 */
export function getActivities(params = {}) {
  return request.get('/api/v1/cadre/activities', params);
}

/**
 * 获取统计数据
 * @param {string} period 统计周期 (week/month/year)
 * @returns {Promise} 统计数据
 */
export function getStatistics(period) {
  return request.get('/api/v1/cadre/statistics', { period });
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
  });
}

/**
 * 获取待办事项列表
 * @param {Object} params 查询参数 { status, type, priority }
 * @returns {Promise} 待办事项列表
 */
export function getTodos(params = {}) {
  return request.get('/api/v1/cadre/todos', params);
}

/**
 * 创建待办事项
 * @param {Object} data 待办数据
 * @returns {Promise} 创建的待办事项
 */
export function createTodo(data) {
  return request.post('/api/v1/cadre/todos', data);
}

/**
 * 删除待办事项
 * @param {string} id 待办事项ID
 * @returns {Promise} 删除结果
 */
export function deleteTodo(id) {
  return request.delete(`/api/v1/cadre/todos/${id}`);
}

/**
 * 获取快捷操作配置
 * @returns {Promise} 快捷操作列表
 */
export function getQuickActions() {
  return request.get('/api/v1/cadre/quick-actions');
}

/**
 * 保存快捷操作配置
 * @param {Array<string>} actions 操作ID数组
 * @returns {Promise} 保存结果
 */
export function saveQuickActions(actions) {
  return request.put('/api/v1/cadre/quick-actions', { actions });
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
  });
}

/**
 * 获取用户积分
 * @param {Object} params 查询参数 { period }
 * @returns {Promise} 积分数据
 */
export function getUserPoints(params = {}) {
  return request.get('/api/v1/cadre/points', params);
}

// ==================== 资料收集相关 API ====================

/**
 * 获取收集任务列表
 * @param {Object} params 查询参数
 * @returns {Promise} 任务列表
 */
export function getCollectionTasks(params = {}) {
  return request.get('/api/v1/cadre/collection/tasks', params);
}

/**
 * 获取收集任务统计
 * @returns {Promise} 统计数据
 */
export function getCollectionStats() {
  return request.get('/api/v1/cadre/collection/stats');
}

/**
 * 创建收集任务
 * @param {Object} data 任务数据
 * @returns {Promise} 创建的任务
 */
export function createCollectionTask(data) {
  return request.post('/api/v1/cadre/collection/tasks', data);
}

/**
 * 更新收集任务
 * @param {string} id 任务ID
 * @param {Object} data 更新数据
 * @returns {Promise} 更新后的任务
 */
export function updateCollectionTask(id, data) {
  return request.put(`/api/v1/cadre/collection/tasks/${id}`, data);
}

/**
 * 删除收集任务
 * @param {string} id 任务ID
 * @returns {Promise} 删除结果
 */
export function deleteCollectionTask(id) {
  return request.delete(`/api/v1/cadre/collection/tasks/${id}`);
}

/**
 * 获取已收集文件
 * @param {string} taskId 任务ID
 * @returns {Promise} 文件列表
 */
export function getCollectedFiles(taskId) {
  return request.get(`/api/v1/cadre/collection/tasks/${taskId}/files`);
}

/**
 * 提交收集文件
 * @param {Object} data 文件数据
 * @returns {Promise} 提交结果
 */
export function submitCollectedFile(data) {
  return request.post('/api/v1/cadre/collection/files', data);
}

/**
 * 删除收集文件
 * @param {string} fileId 文件ID
 * @returns {Promise} 删除结果
 */
export function deleteCollectedFile(fileId) {
  return request.delete(`/api/v1/cadre/collection/files/${fileId}`);
}

/**
 * 搜索村民
 * @param {string} query 搜索关键词
 * @returns {Promise} 村民列表
 */
export function searchResidents(query) {
  return request.get('/api/v1/cadre/collection/residents/search', { query });
}

/**
 * 批量提醒
 * @param {Array<string>} ids 任务ID数组
 * @returns {Promise} 提醒结果
 */
export function batchRemind(ids) {
  return request.post('/api/v1/cadre/collection/batch/remind', { ids });
}

/**
 * 批量延长截止日期
 * @param {Array<string>} ids 任务ID数组
 * @param {number} days 延长天数
 * @returns {Promise} 操作结果
 */
export function batchExtendDeadline(ids, days) {
  return request.post('/api/v1/cadre/collection/batch/extend', { ids, days });
}

// ==================== 资料上交相关 API ====================

/**
 * 获取上交任务列表
 * @param {Object} params 查询参数
 * @returns {Promise} 任务列表
 */
export function getSubmissionTasks(params = {}) {
  return request.get('/api/v1/cadre/submission/tasks', params);
}

/**
 * 获取上交任务统计
 * @returns {Promise} 统计数据
 */
export function getSubmissionStats() {
  return request.get('/api/v1/cadre/submission/stats');
}

/**
 * 创建上交任务
 * @param {Object} data 任务数据
 * @returns {Promise} 创建的任务
 */
export function createSubmissionTask(data) {
  return request.post('/api/v1/cadre/submission/tasks', data);
}

/**
 * 更新上交任务
 * @param {string} id 任务ID
 * @param {Object} data 更新数据
 * @returns {Promise} 更新后的任务
 */
export function updateSubmissionTask(id, data) {
  return request.put(`/api/v1/cadre/submission/tasks/${id}`, data);
}

/**
 * 删除上交任务
 * @param {string} id 任务ID
 * @returns {Promise} 删除结果
 */
export function deleteSubmissionTask(id) {
  return request.delete(`/api/v1/cadre/submission/tasks/${id}`);
}

/**
 * 提交任务
 * @param {string} id 任务ID
 * @returns {Promise} 提交结果
 */
export function submitTask(id) {
  return request.post(`/api/v1/cadre/submission/tasks/${id}/submit`);
}

/**
 * 获取已上传文件
 * @param {string} taskId 任务ID
 * @returns {Promise} 文件列表
 */
export function getUploadedFiles(taskId) {
  return request.get(`/api/v1/cadre/submission/tasks/${taskId}/files`);
}

/**
 * 删除上传文件
 * @param {string} fileId 文件ID
 * @returns {Promise} 删除结果
 */
export function deleteUploadedFile(fileId) {
  return request.delete(`/api/v1/cadre/submission/files/${fileId}`);
}

/**
 * 下载提交回执
 * @param {string} id 任务ID
 * @returns {Promise} 文件流
 */
export function downloadSubmissionProof(id) {
  return request.get(`/api/v1/cadre/submission/tasks/${id}/proof`, {}, {
    responseType: 'blob'
  });
}

/**
 * 批量提交
 * @param {Array<string>} ids 任务ID数组
 * @returns {Promise} 提交结果
 */
export function batchSubmit(ids) {
  return request.post('/api/v1/cadre/submission/batch/submit', { ids });
}

/**
 * 批量导出
 * @param {Array<string>} ids 任务ID数组
 * @returns {Promise} 导出结果
 */
export function batchExport(ids) {
  return request.post('/api/v1/cadre/submission/batch/export', { ids });
}

// ==================== 产品管理相关 API ====================

/**
 * 获取村干部产品列表
 * @param {Object} params 查询参数
 * @returns {Promise} 产品列表
 */
export function getCadreProducts(params = {}) {
  return request.get('/api/v1/cadre/products', params);
}

/**
 * 获取村干部产品统计
 * @returns {Promise} 统计数据
 */
export function getCadreProductStats() {
  return request.get('/api/v1/cadre/products/stats');
}

/**
 * 创建产品
 * @param {Object} data 产品数据
 * @returns {Promise} 创建的产品
 */
export function createProduct(data) {
  return request.post('/api/v1/cadre/products', data);
}

/**
 * 更新产品
 * @param {string} id 产品ID
 * @param {Object} data 更新数据
 * @returns {Promise} 更新后的产品
 */
export function updateProduct(id, data) {
  return request.put(`/api/v1/cadre/products/${id}`, data);
}

/**
 * 删除产品
 * @param {string} id 产品ID
 * @returns {Promise} 删除结果
 */
export function deleteProduct(id) {
  return request.delete(`/api/v1/cadre/products/${id}`);
}

/**
 * 切换产品状态
 * @param {string} id 产品ID
 * @param {string} status 新状态
 * @returns {Promise} 操作结果
 */
export function toggleProductStatus(id, status) {
  return request.put(`/api/v1/cadre/products/${id}/status`, { status });
}

/**
 * 批量上架产品
 * @param {Array<string>} ids 产品ID数组
 * @returns {Promise} 操作结果
 */
export function batchPublish(ids) {
  return request.post('/api/v1/cadre/products/batch/publish', { ids });
}

// ==================== 导出API对象 ====================

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
  getUserPoints,
  // 资料收集
  getCollectionTasks,
  getCollectionStats,
  createCollectionTask,
  updateCollectionTask,
  deleteCollectionTask,
  getCollectedFiles,
  submitCollectedFile,
  deleteCollectedFile,
  searchResidents,
  batchRemind,
  batchExtendDeadline,
  // 资料上交
  getSubmissionTasks,
  getSubmissionStats,
  createSubmissionTask,
  updateSubmissionTask,
  deleteSubmissionTask,
  submitTask,
  getUploadedFiles,
  deleteUploadedFile,
  downloadSubmissionProof,
  batchSubmit,
  batchExport,
  // 产品管理
  getCadreProducts,
  getCadreProductStats,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  batchPublish
};

export default cadreApi;
