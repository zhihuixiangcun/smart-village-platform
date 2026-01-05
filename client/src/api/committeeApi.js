/**
 * 村委会管理API接口
 */
import { get, post, put, del, upload, download } from '@/utils/http';

/**
 * 获取村委会成员列表
 * @param {Object} params 查询参数
 * @returns {Promise} API响应
 */
export function getCommitteeMembers(params = {}) {
  return get('/api/committee/members', params);
}

/**
 * 获取村委会成员详情
 * @param {string|number} id 成员ID
 * @returns {Promise} API响应
 */
export function getCommitteeMemberDetail(id) {
  return get(`/api/committee/members/${id}`);
}

/**
 * 创建村委会成员
 * @param {Object} data 成员数据
 * @returns {Promise} API响应
 */
export function createCommitteeMember(data) {
  return post('/api/committee/members', data);
}

/**
 * 更新村委会成员信息
 * @param {string|number} id 成员ID
 * @param {Object} data 更新数据
 * @returns {Promise} API响应
 */
export function updateCommitteeMember(id, data) {
  return put(`/api/committee/members/${id}`, data);
}

/**
 * 删除村委会成员
 * @param {string|number} id 成员ID
 * @returns {Promise} API响应
 */
export function deleteCommitteeMember(id) {
  return del(`/api/committee/members/${id}`);
}

/**
 * 批量删除村委会成员
 * @param {Array} ids 成员ID数组
 * @returns {Promise} API响应
 */
export function batchDeleteCommitteeMembers(ids) {
  return post('/api/committee/members/batch-delete', { ids });
}

/**
 * 获取村委会统计数据
 * @returns {Promise} API响应
 */
export function getCommitteeStatistics() {
  return get('/api/committee/statistics');
}

/**
 * 获取组织架构
 * @returns {Promise} API响应
 */
export function getOrganizationStructure() {
  return get('/api/committee/organization');
}

/**
 * 更新组织架构
 * @param {Object} data 组织架构数据
 * @returns {Promise} API响应
 */
export function updateOrganizationStructure(data) {
  return put('/api/committee/organization', data);
}

/**
 * 获取工作职责
 * @param {string|number} memberId 成员ID
 * @returns {Promise} API响应
 */
export function getWorkDuties(memberId) {
  return get(`/api/committee/members/${memberId}/duties`);
}

/**
 * 更新工作职责
 * @param {string|number} memberId 成员ID
 * @param {Object} data 职责数据
 * @returns {Promise} API响应
 */
export function updateWorkDuties(memberId, data) {
  return put(`/api/committee/members/${memberId}/duties`, data);
}

/**
 * 获取工作表现记录
 * @param {string|number} memberId 成员ID
 * @returns {Promise} API响应
 */
export function getPerformanceRecords(memberId) {
  return get(`/api/committee/members/${memberId}/performance`);
}

/**
 * 添加工作表现记录
 * @param {string|number} memberId 成员ID
 * @param {Object} data 表现记录数据
 * @returns {Promise} API响应
 */
export function addPerformanceRecord(memberId, data) {
  return post(`/api/committee/members/${memberId}/performance`, data);
}

/**
 * 职务调动
 * @param {string|number} memberId 成员ID
 * @param {Object} data 调动数据
 * @returns {Promise} API响应
 */
export function transferPosition(memberId, data) {
  return post(`/api/committee/members/${memberId}/transfer`, data);
}

/**
 * 成员离职
 * @param {string|number} memberId 成员ID
 * @param {Object} data 离职数据
 * @returns {Promise} API响应
 */
export function retireCommitteeMember(memberId, data = {}) {
  return post(`/api/committee/members/${memberId}/retire`, data);
}

/**
 * 获取村委会会议记录
 * @param {Object} params 查询参数
 * @returns {Promise} API响应
 */
export function getMeetingRecords(params = {}) {
  return get('/api/committee/meetings', params);
}

/**
 * 创建会议记录
 * @param {Object} data 会议数据
 * @returns {Promise} API响应
 */
export function createMeetingRecord(data) {
  return post('/api/committee/meetings', data);
}

/**
 * 获取决议记录
 * @param {Object} params 查询参数
 * @returns {Promise} API响应
 */
export function getResolutions(params = {}) {
  return get('/api/committee/resolutions', params);
}

/**
 * 创建决议记录
 * @param {Object} data 决议数据
 * @returns {Promise} API响应
 */
export function createResolution(data) {
  return post('/api/committee/resolutions', data);
}

/**
 * 获取部门列表
 * @returns {Promise} API响应
 */
export function getDepartments() {
  return get('/api/committee/departments');
}

/**
 * 创建部门
 * @param {Object} data 部门数据
 * @returns {Promise} API响应
 */
export function createDepartment(data) {
  return post('/api/committee/departments', data);
}

/**
 * 更新部门
 * @param {string|number} id 部门ID
 * @param {Object} data 更新数据
 * @returns {Promise} API响应
 */
export function updateDepartment(id, data) {
  return put(`/api/committee/departments/${id}`, data);
}

/**
 * 删除部门
 * @param {string|number} id 部门ID
 * @returns {Promise} API响应
 */
export function deleteDepartment(id) {
  return del(`/api/committee/departments/${id}`);
}

/**
 * 导出村委会成员数据
 * @param {Object} params 查询参数
 * @returns {Promise} API响应
 */
export function exportCommitteeMembers(params = {}) {
  return download('/api/committee/members/export', '村委会成员.xlsx', params);
}

/**
 * 获取职务历史记录
 * @param {string|number} memberId 成员ID
 * @returns {Promise} API响应
 */
export function getPositionHistory(memberId) {
  return get(`/api/committee/members/${memberId}/position-history`);
}

/**
 * 搜索村委会成员
 * @param {string} keyword 搜索关键词
 * @param {Object} filters 过滤条件
 * @returns {Promise} API响应
 */
export function searchCommitteeMembers(keyword, filters = {}) {
  return get('/api/committee/members/search', { keyword, ...filters });
}

// 导出所有API
export const committeeApi = {
  getMembers: getCommitteeMembers,
  getMemberDetail: getCommitteeMemberDetail,
  createMember: createCommitteeMember,
  updateMember: updateCommitteeMember,
  deleteMember: deleteCommitteeMember,
  batchDeleteMembers: batchDeleteCommitteeMembers,
  getStatistics: getCommitteeStatistics,
  getOrganization: getOrganizationStructure,
  updateOrganization: updateOrganizationStructure,
  getWorkDuties,
  updateWorkDuties,
  getPerformanceRecords,
  addPerformanceRecord,
  transferPosition,
  retireMember: retireCommitteeMember,
  getMeetingRecords,
  createMeetingRecord,
  getResolutions,
  createResolution,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  export: exportCommitteeMembers,
  getPositionHistory,
  search: searchCommitteeMembers
};

export default committeeApi;