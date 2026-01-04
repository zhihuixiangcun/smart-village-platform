import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

// 创建axios实例
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
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

// 响应拦截器
api.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error.response?.data || error)
  }
)

/**
 * 在线办事服务API
 */
export const serviceApi = {
  /**
   * 提交身份证补办/换领申请
   */
  submitIdCardApplication(data) {
    return api.post('/api/v1/services/id-card', data)
  },

  /**
   * 提交户口本办理申请
   */
  submitHouseholdApplication(data) {
    return api.post('/api/v1/services/household', data)
  },

  /**
   * 提交结婚登记预约
   */
  submitMarriageRegistration(data) {
    return api.post('/api/v1/services/marriage', data)
  },

  /**
   * 提交低保申请
   */
  submitSubsistenceApplication(data) {
    return api.post('/api/v1/services/subsistence', data)
  },

  /**
   * 提交残疾补贴申请
   */
  submitDisabilityApplication(data) {
    return api.post('/api/v1/services/disability', data)
  },

  /**
   * 提交老年补贴申请
   */
  submitElderlyApplication(data) {
    return api.post('/api/v1/services/elderly', data)
  },

  /**
   * 提交建房申请
   */
  submitHouseBuildingApplication(data) {
    return api.post('/api/v1/services/house-building', data)
  },

  /**
   * 提交红白喜事申请
   */
  submitEventApplication(data) {
    return api.post('/api/v1/services/event', data)
  },

  /**
   * 提交交通补贴申请
   */
  submitTransportApplication(data) {
    return api.post('/api/v1/services/transport', data)
  },

  /**
   * 提交生育补贴申请
   */
  submitBirthApplication(data) {
    return api.post('/api/v1/services/birth', data)
  },

  /**
   * 获取我的申请列表
   */
  getMyApplications(params) {
    return api.get('/api/v1/services/my-applications', { params })
  },

  /**
   * 获取申请详情
   */
  getApplicationById(id) {
    return api.get(`/api/v1/services/applications/${id}`)
  },

  /**
   * 取消申请
   */
  cancelApplication(id, data) {
    return api.post(`/api/v1/services/applications/${id}/cancel`, data)
  },

  /**
   * 上传文件
   */
  uploadFile(file, type = 'image') {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    return api.post('/api/v1/upload/file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        console.log(`Upload progress: ${percentCompleted}%`)
      }
    })
  },

  /**
   * 批量上传文件
   */
  uploadFiles(files, type = 'image') {
    const formData = new FormData()
    files.forEach((file, index) => {
      formData.append(`files`, file)
    })
    formData.append('type', type)

    return api.post('/api/v1/upload/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  /**
   * OCR识别证件
   */
  recognizeDocument(file, documentType) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('documentType', documentType)

    return api.post('/api/v1/ocr/recognize', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  /**
   * 获取申请状态统计
   */
  getApplicationStats() {
    return api.get('/api/v1/services/stats')
  },

  /**
   * 获取服务列表
   */
  getServices(params) {
    return api.get('/api/v1/services', { params })
  },

  /**
   * 获取服务详情
   */
  getServiceById(id) {
    return api.get(`/api/v1/services/${id}`)
  },

  /**
   * 搜索服务
   */
  searchServices(keyword) {
    return api.get('/api/v1/services/search', {
      params: { keyword }
    })
  }
}

export default serviceApi
