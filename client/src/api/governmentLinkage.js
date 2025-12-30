/**
 * 上级联动枢纽 API
 */
import request from '@/utils/request'

export default {
  // ========== 数据自动上报 ==========
  // AI自动生成报表
  autoGenerateReport(data) {
    return request({
      url: '/api/government/reports/generate',
      method: 'post',
      data
    })
  },

  // 获取报表列表
  getReports(params) {
    return request({
      url: '/api/government/reports',
      method: 'get',
      params
    })
  },

  // 获取报表详情
  getReportDetail(id) {
    return request({
      url: `/api/government/reports/${id}`,
      method: 'get'
    })
  },

  // 上报报表
  submitReport(id) {
    return request({
      url: `/api/government/reports/${id}/submit`,
      method: 'post'
    })
  },

  // 下载报表
  downloadReport(id) {
    return request({
      url: `/api/government/reports/${id}/download`,
      method: 'get',
      responseType: 'blob'
    })
  },

  // ========== 人口数据上报 ==========
  // 同步人口数据
  syncPopulationData() {
    return request({
      url: '/api/government/population/sync',
      method: 'post'
    })
  },

  // 获取人口统计
  getPopulationStatistics() {
    return request({
      url: '/api/government/population/statistics',
      method: 'get'
    })
  },

  // ========== 跨域资源调度 ==========
  // 申请资源
  requestResource(data) {
    return request({
      url: '/api/government/resources/request',
      method: 'post',
      data
    })
  },

  // 获取资源申请列表
  getResources(params) {
    return request({
      url: '/api/government/resources',
      method: 'get',
      params
    })
  },

  // 获取资源申请状态
  getResourceStatus(id) {
    return request({
      url: `/api/government/resources/${id}`,
      method: 'get'
    })
  },

  // 取消资源申请
  cancelResourceRequest(id) {
    return request({
      url: `/api/government/resources/${id}/cancel`,
      method: 'post'
    })
  },

  // ========== 政策接收与分发 ==========
  // 获取政策列表
  getPolicies(params) {
    return request({
      url: '/api/government/policies',
      method: 'get',
      params
    })
  },

  // 分发政策到村民
  distributePolicy(id, data) {
    return request({
      url: `/api/government/policies/${id}/distribute`,
      method: 'post',
      data
    })
  },

  // ========== 任务承接与反馈 ==========
  // 获取任务列表
  getTasks(params) {
    return request({
      url: '/api/government/tasks',
      method: 'get',
      params
    })
  },

  // 接受任务
  acceptTask(id, data) {
    return request({
      url: `/api/government/tasks/${id}/accept`,
      method: 'post',
      data
    })
  },

  // 提交任务反馈
  submitTaskFeedback(id, data) {
    return request({
      url: `/api/government/tasks/${id}/feedback`,
      method: 'post',
      data
    })
  },

  // ========== 跨村协作 ==========
  // 获取协作请求
  getCollaborationRequests(params) {
    return request({
      url: '/api/government/collaboration',
      method: 'get',
      params
    })
  },

  // 创建协作请求
  createCollaborationRequest(data) {
    return request({
      url: '/api/government/collaboration',
      method: 'post',
      data
    })
  },

  // 响应协作请求
  respondToCollaboration(id, data) {
    return request({
      url: `/api/government/collaboration/${id}/respond`,
      method: 'post',
      data
    })
  },

  // ========== 应急资源调度 ==========
  // 调度应急资源
  dispatchEmergencyResource(data) {
    return request({
      url: '/api/government/emergency/dispatch',
      method: 'post',
      data
    })
  },

  // 获取应急资源
  getEmergencyResources(params) {
    return request({
      url: '/api/government/emergency/resources',
      method: 'get',
      params
    })
  }
}
