/**
 * 村民管理API接口
 */
import { get, post, put, del, upload, download } from '@/utils/http'

/**
 * 获取村民列表
 * @param {Object} params 查询参数
 * @returns {Promise} API响应
 */
export function getResidentList(params = {}) {
  return get('/api/residents', params)
}

/**
 * 获取村民详情
 * @param {string|number} id 村民ID
 * @returns {Promise} API响应
 */
export function getResidentDetail(id) {
  return get(`/api/residents/${id}`)
}

/**
 * 创建村民信息
 * @param {Object} data 村民数据
 * @returns {Promise} API响应
 */
export function createResident(data) {
  return post('/api/residents', data)
}

/**
 * 更新村民信息
 * @param {string|number} id 村民ID
 * @param {Object} data 更新数据
 * @returns {Promise} API响应
 */
export function updateResident(id, data) {
  return put(`/api/residents/${id}`, data)
}

/**
 * 删除村民信息
 * @param {string|number} id 村民ID
 * @returns {Promise} API响应
 */
export function deleteResident(id) {
  return del(`/api/residents/${id}`)
}

/**
 * 批量删除村民
 * @param {Array} ids 村民ID数组
 * @returns {Promise} API响应
 */
export function batchDeleteResidents(ids) {
  return post('/api/residents/batch-delete', { ids })
}

/**
 * 获取村民统计数据
 * @returns {Promise} API响应
 */
export function getResidentStatistics() {
  return get('/api/residents/statistics')
}

/**
 * 导出村民数据
 * @param {Object} params 查询参数
 * @returns {Promise} API响应
 */
export function exportResidents(params = {}) {
  return download('/api/residents/export', '村民信息.xlsx', params)
}

/**
 * 导入村民数据
 * @param {FormData} formData 文件数据
 * @returns {Promise} API响应
 */
export function importResidents(formData) {
  return upload('/api/residents/import', formData)
}

/**
 * 获取家庭成员信息
 * @param {string|number} residentId 村民ID
 * @returns {Promise} API响应
 */
export function getFamilyMembers(residentId) {
  return get(`/api/residents/${residentId}/family`)
}

/**
 * 添加家庭成员
 * @param {string|number} residentId 村民ID
 * @param {Object} data 家庭成员数据
 * @returns {Promise} API响应
 */
export function addFamilyMember(residentId, data) {
  return post(`/api/residents/${residentId}/family`, data)
}

/**
 * 更新家庭成员
 * @param {string|number} residentId 村民ID
 * @param {string|number} memberId 成员ID
 * @param {Object} data 更新数据
 * @returns {Promise} API响应
 */
export function updateFamilyMember(residentId, memberId, data) {
  return put(`/api/residents/${residentId}/family/${memberId}`, data)
}

/**
 * 删除家庭成员
 * @param {string|number} residentId 村民ID
 * @param {string|number} memberId 成员ID
 * @returns {Promise} API响应
 */
export function deleteFamilyMember(residentId, memberId) {
  return del(`/api/residents/${residentId}/family/${memberId}`)
}

/**
 * 获取健康档案
 * @param {string|number} residentId 村民ID
 * @returns {Promise} API响应
 */
export function getHealthRecords(residentId) {
  return get(`/api/residents/${residentId}/health`)
}

/**
 * 添加健康记录
 * @param {string|number} residentId 村民ID
 * @param {Object} data 健康记录数据
 * @returns {Promise} API响应
 */
export function addHealthRecord(residentId, data) {
  return post(`/api/residents/${residentId}/health`, data)
}

/**
 * 获取村民变更记录
 * @param {string|number} residentId 村民ID
 * @returns {Promise} API响应
 */
export function getResidentHistory(residentId) {
  return get(`/api/residents/${residentId}/history`)
}

/**
 * 搜索村民
 * @param {string} keyword 搜索关键词
 * @param {Object} filters 过滤条件
 * @returns {Promise} API响应
 */
export function searchResidents(keyword, filters = {}) {
  return get('/api/residents/search', { keyword, ...filters })
}

/**
 * 检查身份证号是否重复
 * @param {string} idCard 身份证号
 * @param {string} excludeId 排除的ID（用于编辑时）
 * @returns {Promise} API响应
 */
export function checkIdCardExists(idCard, excludeId = null) {
  return get('/api/residents/check-idcard', { idCard, excludeId })
}

/**
 * 检查手机号是否重复
 * @param {string} phone 手机号
 * @param {string} excludeId 排除的ID（用于编辑时）
 * @returns {Promise} API响应
 */
export function checkPhoneExists(phone, excludeId = null) {
  return get('/api/residents/check-phone', { phone, excludeId })
}

// 导出所有API
export const residentApi = {
  getList: getResidentList,
  getDetail: getResidentDetail,
  create: createResident,
  update: updateResident,
  delete: deleteResident,
  batchDelete: batchDeleteResidents,
  getStatistics: getResidentStatistics,
  export: exportResidents,
  import: importResidents,
  getFamilyMembers,
  addFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  getHealthRecords,
  addHealthRecord,
  getHistory: getResidentHistory,
  search: searchResidents,
  checkIdCardExists,
  checkPhoneExists
}

export default residentApi