/**
 * Services API
 * 在线办事 API 服务层
 *
 * 提供与服务申请相关的 API 调用
 */

import request from './index'

/**
 * 服务类型枚举
 */
export const ServiceTypes = {
  IDENTITY_CERTIFICATE: 'identity_certificate',
  RESIDENCE_CERTIFICATE: 'residence_certificate',
  INCOME_CERTIFICATE: 'income_certificate',
  MARRIAGE_CERTIFICATE: 'marriage_certificate',
  BIRTH_CERTIFICATE: 'birth_certificate',
  PROPERTY_CERTIFICATE: 'property_certificate',
  AGRICULTURE_SUBSIDY: 'agriculture_subsidy',
  POVERTY_AID: 'poverty_aid',
  HOUSING_APPLICATION: 'housing_application',
  LAND_USE: 'land_use',
  BUSINESS_LICENSE: 'business_license',
  OTHER: 'other'
}

/**
 * 申请状态枚举
 */
export const ApplicationStatus = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
}

/**
 * 服务类型标签映射
 */
export const ServiceTypeLabels = {
  [ServiceTypes.IDENTITY_CERTIFICATE]: '身份证明',
  [ServiceTypes.RESIDENCE_CERTIFICATE]: '居住证明',
  [ServiceTypes.INCOME_CERTIFICATE]: '收入证明',
  [ServiceTypes.MARRIAGE_CERTIFICATE]: '婚姻证明',
  [ServiceTypes.BIRTH_CERTIFICATE]: '出生证明',
  [ServiceTypes.PROPERTY_CERTIFICATE]: '财产证明',
  [ServiceTypes.AGRICULTURE_SUBSIDY]: '农业补贴',
  [ServiceTypes.POVERTY_AID]: '困难救助',
  [ServiceTypes.HOUSING_APPLICATION]: '住房申请',
  [ServiceTypes.LAND_USE]: '土地使用',
  [ServiceTypes.BUSINESS_LICENSE]: '营业执照',
  [ServiceTypes.OTHER]: '其他'
}

/**
 * 申请状态标签映射
 */
export const StatusLabels = {
  [ApplicationStatus.DRAFT]: '草稿',
  [ApplicationStatus.SUBMITTED]: '已提交',
  [ApplicationStatus.UNDER_REVIEW]: '审核中',
  [ApplicationStatus.APPROVED]: '已批准',
  [ApplicationStatus.REJECTED]: '已拒绝',
  [ApplicationStatus.PROCESSING]: '处理中',
  [ApplicationStatus.COMPLETED]: '已完成',
  [ApplicationStatus.CANCELLED]: '已取消'
}

/**
 * 获取所有服务类型
 * @returns {Promise<Array>}
 */
export function getServiceTypes() {
  return request({
    url: '/api/v1/services/types',
    method: 'get'
  })
}

/**
 * 获取服务申请列表
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>}
 */
export function getServiceApplications(params = {}) {
  return request({
    url: '/api/v1/services',
    method: 'get',
    params
  })
}

/**
 * 获取服务申请详情
 * @param {String} id - 申请ID
 * @returns {Promise<Object>}
 */
export function getServiceApplicationById(id) {
  return request({
    url: `/api/v1/services/${id}`,
    method: 'get'
  })
}

/**
 * 创建服务申请
 * @param {Object} data - 申请数据
 * @returns {Promise<Object>}
 */
export function createServiceApplication(data) {
  return request({
    url: '/api/v1/services',
    method: 'post',
    data
  })
}

/**
 * 更新服务申请
 * @param {String} id - 申请ID
 * @param {Object} data - 更新数据
 * @returns {Promise<Object>}
 */
export function updateServiceApplication(id, data) {
  return request({
    url: `/api/v1/services/${id}`,
    method: 'put',
    data
  })
}

/**
 * 提交服务申请
 * @param {String} id - 申请ID
 * @returns {Promise<Object>}
 */
export function submitServiceApplication(id) {
  return request({
    url: `/api/v1/services/${id}/submit`,
    method: 'post'
  })
}

/**
 * 审批服务申请
 * @param {String} id - 申请ID
 * @param {Object} data - 审批数据
 * @returns {Promise<Object>}
 */
export function approveServiceApplication(id, data) {
  return request({
    url: `/api/v1/services/${id}/approve`,
    method: 'post',
    data
  })
}

/**
 * 取消服务申请
 * @param {String} id - 申请ID
 * @param {String} reason - 取消原因
 * @returns {Promise<Object>}
 */
export function cancelServiceApplication(id, reason) {
  return request({
    url: `/api/v1/services/${id}/cancel`,
    method: 'post',
    data: { reason }
  })
}

/**
 * 删除服务申请
 * @param {String} id - 申请ID
 * @returns {Promise<Object>}
 */
export function deleteServiceApplication(id) {
  return request({
    url: `/api/v1/services/${id}`,
    method: 'delete'
  })
}

/**
 * 获取用户申请统计
 * @returns {Promise<Object>}
 */
export function getUserApplicationStats() {
  return request({
    url: '/api/v1/services/stats',
    method: 'get'
  })
}

/**
 * 获取村庄申请统计
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>}
 */
export function getVillageApplicationStats(params = {}) {
  return request({
    url: '/api/v1/services/stats',
    method: 'get',
    params
  })
}

/**
 * 获取待处理申请列表
 * @param {Number} limit - 限制数量
 * @returns {Promise<Array>}
 */
export function getPendingApplications(limit = 50) {
  return request({
    url: '/api/v1/services/pending',
    method: 'get',
    params: { limit }
  })
}

/**
 * 获取所有申请状态
 * @returns {Promise<Array>}
 */
export function getApplicationStatusList() {
  return request({
    url: '/api/v1/services/status/list',
    method: 'get'
  })
}

/**
 * 上传附件
 * @param {File} file - 文件对象
 * @returns {Promise<Object>}
 */
export function uploadAttachment(file) {
  const formData = new FormData()
  formData.append('file', file)

  return request({
    url: '/api/v1/upload',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export default {
  ServiceTypes,
  ApplicationStatus,
  ServiceTypeLabels,
  StatusLabels,
  getServiceTypes,
  getServiceApplications,
  getServiceApplicationById,
  createServiceApplication,
  updateServiceApplication,
  submitServiceApplication,
  approveServiceApplication,
  cancelServiceApplication,
  deleteServiceApplication,
  getUserApplicationStats,
  getVillageApplicationStats,
  getPendingApplications,
  getApplicationStatusList,
  uploadAttachment
}
