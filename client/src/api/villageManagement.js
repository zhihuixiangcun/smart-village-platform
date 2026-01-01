import request from '@/utils/request'

const villageApi = {
  // 值班管理
  getTodayDuty(villageId) {
    return request.get(`/api/village-management/duty/today/${villageId}`)
  },

  getDutyStatistics(villageId, params) {
    return request.get(`/api/village-management/duty/statistics/${villageId}`, { params })
  },

  callDutyOfficer(villageId, data) {
    return request.post(`/api/village-management/duty/call/${villageId}`, data)
  },

  // 文档收集
  createDocumentCollection(data) {
    return request.post('/api/village-management/documents', data)
  },

  uploadFiles(collectionId, formData) {
    return request.post(`/api/village-management/documents/${collectionId}/files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  getMyDocuments(params) {
    return request.get('/api/village-management/documents/my', { params })
  },

  getDocumentDetail(collectionId) {
    return request.get(`/api/village-management/documents/${collectionId}`)
  },

  updateDocumentStatus(collectionId, data) {
    return request.put(`/api/village-management/documents/${collectionId}/status`, data)
  },

  deleteDocumentFile(collectionId, fileId) {
    return request.delete(`/api/village-management/documents/${collectionId}/files/${fileId}`)
  },

  downloadDocumentFile(collectionId, fileId) {
    return request.get(`/api/village-management/documents/${collectionId}/files/${fileId}`, {
      responseType: 'blob'
    })
  },

  // 搜索功能
  searchDocuments(params) {
    return request.get('/api/village-management/documents/search', { params })
  },

  // 统计分析
  getPersonalStatistics(startDate, endDate) {
    return request.get('/api/village-management/statistics/personal', {
      params: { startDate, endDate }
    })
  },

  generateAnalyticsReport(data) {
    return request.post('/api/village-management/analytics/reports', data)
  },

  getAnalyticsReports(params) {
    return request.get('/api/village-management/analytics/reports', { params })
  },

  getReportDetail(reportId) {
    return request.get(`/api/village-management/analytics/reports/${reportId}`)
  },

  // 村庄总览（需要管理员权限）
  getVillageOverview(villageId, params) {
    return request.get(`/api/village-management/overview/${villageId}`, { params })
  }
}

export default villageApi