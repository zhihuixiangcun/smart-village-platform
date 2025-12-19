import request from '@/utils/request'

// 村委管理API接口
export const committeeApi = {
  // 村委人员管理
  getMembers: (params) => {
    return request.get('/api/village-committee/members', { params })
  },

  createMember: (data) => {
    return request.post('/api/village-committee/members', data)
  },

  updateMember: (id, data) => {
    return request.put(`/api/village-committee/members/${id}`, data)
  },

  deleteMember: (id) => {
    return request.delete(`/api/village-committee/members/${id}`)
  },

  getMemberDetail: (id) => {
    return request.get(`/api/village-committee/members/${id}`)
  },

  transferMember: (id, data) => {
    return request.post(`/api/village-committee/members/${id}/transfer`, data)
  },

  // 党员信息管理
  getPartyMembers: (params) => {
    return request.get('/api/village-committee/party-members', { params })
  },

  createPartyMember: (data) => {
    return request.post('/api/village-committee/party-members', data)
  },

  updatePartyMember: (id, data) => {
    return request.put(`/api/village-committee/party-members/${id}`, data)
  },

  deletePartyMember: (id) => {
    return request.delete(`/api/village-committee/party-members/${id}`)
  },

  getPartyMemberDetail: (id) => {
    return request.get(`/api/village-committee/party-members/${id}`)
  },

  // 值班表管理
  getDutySchedule: (params) => {
    return request.get('/api/village-committee/duty-schedule', { params })
  },

  createDutySchedule: (data) => {
    return request.post('/api/village-committee/duty-schedule', data)
  },

  updateDutySchedule: (id, data) => {
    return request.put(`/api/village-committee/duty-schedule/${id}`, data)
  },

  deleteDutySchedule: (id) => {
    return request.delete(`/api/village-committee/duty-schedule/${id}`)
  },

  getDutyScheduleByDate: (date) => {
    return request.get(`/api/village-committee/duty-schedule/date/${date}`)
  },

  generateDutySchedule: (params) => {
    return request.post('/api/village-committee/duty-schedule/generate', params)
  },

  // 村情地图
  getMapData: (params) => {
    return request.get('/api/village-committee/map/data', { params })
  },

  updateMapMarker: (id, data) => {
    return request.put(`/api/village-committee/map/markers/${id}`, data)
  },

  getEmergencyLocations: () => {
    return request.get('/api/village-committee/map/emergency')
  },

  // 一户一码管理
  getHouseholdCodes: (params) => {
    return request.get('/api/village-committee/household-codes', { params })
  },

  generateHouseholdCode: (data) => {
    return request.post('/api/village-committee/household-codes', data)
  },

  updateHouseholdCode: (id, data) => {
    return request.put(`/api/village-committee/household-codes/${id}`, data)
  },

  getHouseholdByCode: (code) => {
    return request.get(`/api/village-committee/household-codes/code/${code}`)
  },

  batchGenerateCodes: (data) => {
    return request.post('/api/village-committee/household-codes/batch', data)
  },

  // 导入导出
  exportMembers: (format) => {
    return request.get(`/api/village-committee/members/export?format=${format}`, {
      responseType: 'blob'
    })
  },

  importMembers: (formData) => {
    return request.post('/api/village-committee/members/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // 统计数据
  getStatistics: () => {
    return request.get('/api/village-committee/statistics')
  },

  getWorkLogs: (params) => {
    return request.get('/api/village-committee/work-logs', { params })
  },

  createWorkLog: (data) => {
    return request.post('/api/village-committee/work-logs', data)
  },

  // 紧急通知
  sendEmergencyNotification: (data) => {
    return request.post('/api/village-committee/emergency-notification', data)
  },

  getOnDutyContacts: () => {
    return request.get('/api/village-committee/on-duty-contacts')
  },

  // 权限管理
  updateMemberPermission: (id, permissions) => {
    return request.put(`/api/village-committee/members/${id}/permissions`, permissions)
  },

  getMemberPermissions: (id) => {
    return request.get(`/api/village-committee/members/${id}/permissions`)
  }
}