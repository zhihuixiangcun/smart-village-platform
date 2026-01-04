import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

/**
 * 应急呼叫API
 */
export const emergencyApi = {
  // 一键应急呼叫
  oneClickCall(data) {
    return api.post('/api/v1/emergency/call', data)
  },

  // 获取应急呼叫列表
  getEmergencyCalls(params) {
    return api.get('/api/v1/emergency/calls', { params })
  },

  // 获取应急呼叫详情
  getCallById(id) {
    return api.get(`/api/v1/emergency/calls/${id}`)
  },

  // 更新应急状态
  updateCallStatus(id, data) {
    return api.put(`/api/v1/emergency/calls/${id}/status`, data)
  },

  // 取消应急呼叫
  cancelCall(id, data) {
    return api.post(`/api/v1/emergency/calls/${id}/cancel`, data)
  },

  // 跟踪应急进度
  trackCall(id) {
    return api.get(`/api/v1/emergency/calls/${id}/track`)
  },

  // 获取应急统计数据
  getStatistics(params) {
    return api.get('/api/v1/emergency/statistics', { params })
  },

  // 上传应急媒体
  uploadMedia(formData) {
    return api.post('/api/v1/emergency/upload/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  // 获取应急类型列表
  getEmergencyTypes() {
    return api.get('/api/v1/emergency/types')
  }
}

export default emergencyApi
