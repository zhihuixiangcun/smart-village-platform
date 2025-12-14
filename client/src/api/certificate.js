import request from '@/utils/request'

const API_BASE = '/api/v1/certificates'

export const certificateAPI = {
  /**
   * 获取证件类型列表
   */
  getCertificateTypes() {
    return request({
      url: `${API_BASE}/types`,
      method: 'get'
    })
  },

  /**
   * 提交证件申请
   * @param {Object} data 申请数据
   */
  submitApplication(data) {
    return request({
      url: `${API_BASE}/applications`,
      method: 'post',
      data
    })
  },

  /**
   * 获取申请列表
   * @param {Object} params 查询参数
   */
  getApplications(params) {
    return request({
      url: `${API_BASE}/applications`,
      method: 'get',
      params
    })
  },

  /**
   * 获取申请详情
   * @param {string} applicationId 申请ID
   */
  getApplicationDetail(applicationId) {
    return request({
      url: `${API_BASE}/applications/${applicationId}`,
      method: 'get'
    })
  },

  /**
   * 更新申请状态
   * @param {string} applicationId 申请ID
   * @param {Object} data 状态数据
   */
  updateApplicationStatus(applicationId, data) {
    return request({
      url: `${API_BASE}/applications/${applicationId}/status`,
      method: 'put',
      data
    })
  },

  /**
   * 获取申请进度
   * @param {string} applicationId 申请ID
   */
  getApplicationProgress(applicationId) {
    return request({
      url: `${API_BASE}/applications/${applicationId}/progress`,
      method: 'get'
    })
  },

  /**
   * 上传证件材料
   * @param {FormData} formData 文件数据
   */
  uploadMaterial(formData) {
    return request({
      url: `${API_BASE}/upload`,
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  /**
   * OCR识别证件信息
   * @param {FormData} formData 图片文件
   */
  recognizeCertificate(formData) {
    return request({
      url: `${API_BASE}/ocr/recognize`,
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  /**
   * 下载证件
   * @param {string} certificateId 证件ID
   */
  downloadCertificate(certificateId) {
    return request({
      url: `${API_BASE}/certificates/${certificateId}/download`,
      method: 'get',
      responseType: 'blob'
    })
  },

  /**
   * 获取证件申请统计
   */
  getApplicationStats() {
    return request({
      url: `${API_BASE}/stats`,
      method: 'get'
    })
  },

  /**
   * 批量审批申请
   * @param {Array} applicationIds 申请ID列表
   * @param {Object} data 审批数据
   */
  batchApproveApplications(applicationIds, data) {
    return request({
      url: `${API_BASE}/applications/batch-approve`,
      method: 'post',
      data: {
        applicationIds,
        ...data
      }
    })
  },

  /**
   * 获取证件模板
   * @param {string} typeId 证件类型ID
   */
  getCertificateTemplate(typeId) {
    return request({
      url: `${API_BASE}/templates/${typeId}`,
      method: 'get'
    })
  }
}

export default certificateAPI