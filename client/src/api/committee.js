/**
 * 村委管理相关API
 */
import request from '@/utils/request'

// 获取村委会成员列表
export const getCommitteeList = (params) => {
  return request.get('/committee', params)
}

// 获取村委会成员详情
export const getCommitteeDetail = (id) => {
  return request.get(`/committee/${id}`)
}

// 添加村委会成员
export const createCommittee = (data) => {
  return request.post('/committee', data)
}

// 更新村委会成员信息
export const updateCommittee = (id, data) => {
  return request.put(`/committee/${id}`, data)
}

// 删除村委会成员
export const deleteCommittee = (id) => {
  return request.delete(`/committee/${id}`)
}

// 获取村委会职位列表
export const getCommitteePositions = () => {
  return request.get('/committee/positions')
}

// 获取村委会权限配置
export const getCommitteePermissions = () => {
  return request.get('/committee/permissions')
}

// 更新村委会权限配置
export const updateCommitteePermissions = (data) => {
  return request.put('/committee/permissions', data)
}

// 村委会成员任职审批
export const approveCommittee = (id, data) => {
  return request.post(`/committee/${id}/approve`, data)
}

// 村委会成员离职
export const resignCommittee = (id, data) => {
  return request.post(`/committee/${id}/resign`, data)
}

// 获取村委会值班安排
export const getDutySchedule = (params) => {
  return request.get('/committee/duty-schedule', params)
}

// 更新值班安排
export const updateDutySchedule = (data) => {
  return request.put('/committee/duty-schedule', data)
}

// 获取当前值班人员
export const getCurrentDuty = () => {
  return request.get('/committee/current-duty')
}

// 村委会成员工作统计
export const getCommitteeWorkStats = (params) => {
  return request.get('/committee/work-stats', params)
}

export const committeeAPI = {
  getCommitteeList,
  getCommitteeDetail,
  createCommittee,
  updateCommittee,
  deleteCommittee,
  getCommitteePositions,
  getCommitteePermissions,
  updateCommitteePermissions,
  approveCommittee,
  resignCommittee,
  getDutySchedule,
  updateDutySchedule,
  getCurrentDuty,
  getCommitteeWorkStats
}