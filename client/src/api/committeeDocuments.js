/**
 * 村委工作文档管理API接口
 */
import { get, post, put, del, upload, download } from '@/utils/http'

/**
 * 获取文档列表
 * @param {Object} params 查询参数
 * @returns {Promise} API响应
 */
export function getDocumentList(params = {}) {
  return get('/api/v1/committee-documents', params)
}

/**
 * 获取文档详情
 * @param {string} id 文档ID
 * @returns {Promise} API响应
 */
export function getDocumentDetail(id) {
  return get(`/api/v1/committee-documents/${id}`)
}

/**
 * 获取文档操作历史
 * @param {string} id 文档ID
 * @returns {Promise} API响应
 */
export function getDocumentHistory(id) {
  return get(`/api/v1/committee-documents/${id}/history`)
}

/**
 * 上传单个文档
 * @param {FormData} formData 表单数据
 * @returns {Promise} API响应
 */
export function uploadDocument(formData) {
  return upload('/api/v1/committee-documents/upload', formData)
}

/**
 * 批量上传文档
 * @param {FormData} formData 表单数据
 * @returns {Promise} API响应
 */
export function batchUploadDocuments(formData) {
  return upload('/api/v1/committee-documents/upload/batch', formData)
}

/**
 * 更新文档
 * @param {string} id 文档ID
 * @param {Object} data 更新数据
 * @returns {Promise} API响应
 */
export function updateDocument(id, data) {
  return put(`/api/v1/committee-documents/${id}`, data)
}

/**
 * 删除文档
 * @param {string} id 文档ID
 * @returns {Promise} API响应
 */
export function deleteDocument(id) {
  return del(`/api/v1/committee-documents/${id}`)
}

/**
 * 下载文档
 * @param {string} id 文档ID
 * @param {string} filename 文件名
 * @returns {Promise} API响应
 */
export function downloadDocument(id, filename) {
  return download(`/api/v1/committee-documents/${id}/download`, filename)
}

/**
 * 归档文档
 * @param {string} id 文档ID
 * @param {Object} data 归档数据
 * @returns {Promise} API响应
 */
export function archiveDocument(id, data = {}) {
  return post(`/api/v1/committee-documents/${id}/archive`, data)
}

/**
 * 全文搜索文档
 * @param {Object} params 搜索参数
 * @returns {Promise} API响应
 */
export function fullTextSearch(params = {}) {
  return get('/api/v1/committee-documents/search/fulltext', params)
}

/**
 * 高级搜索文档
 * @param {Object} filters 过滤条件
 * @returns {Promise} API响应
 */
export function advancedSearch(filters = {}) {
  return post('/api/v1/committee-documents/search/advanced', filters)
}

/**
 * 获取文档统计概览
 * @param {Object} params 查询参数
 * @returns {Promise} API响应
 */
export function getDocumentStatistics(params = {}) {
  return get('/api/v1/committee-documents/stats/summary', params)
}

/**
 * 获取热门标签
 * @param {Object} params 查询参数
 * @returns {Promise} API响应
 */
export function getPopularTags(params = {}) {
  return get('/api/v1/committee-documents/tags/popular', params)
}

/**
 * 获取文档分类枚举
 * @returns {Promise} API响应
 */
export function getDocumentCategories() {
  return get('/api/v1/committee-documents/meta/categories')
}

/**
 * 获取文档状态枚举
 * @returns {Promise} API响应
 */
export function getDocumentStatus() {
  return get('/api/v1/committee-documents/meta/status')
}

// 导出所有API
export const committeeDocumentApi = {
  getList: getDocumentList,
  getDetail: getDocumentDetail,
  getHistory: getDocumentHistory,
  upload: uploadDocument,
  batchUpload: batchUploadDocuments,
  update: updateDocument,
  delete: deleteDocument,
  download: downloadDocument,
  archive: archiveDocument,
  fullTextSearch,
  advancedSearch,
  getStatistics: getDocumentStatistics,
  getPopularTags,
  getCategories: getDocumentCategories,
  getStatus: getDocumentStatus
}

export default committeeDocumentApi
