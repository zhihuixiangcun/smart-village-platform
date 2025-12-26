/**
 * 一户一码API
 * @module api/householdQR
 */
import request from '@/utils/request'

const householdQRApi = {
  /**
   * 生成户码二维码
   * @param {string} householdId - 家庭ID
   * @param {Object} options - 选项
   * @returns {Promise} 二维码数据
   */
  generateQR(householdId, options = {}) {
    return request.post(`/api/v1/household-qr/generate/${householdId}`, null, {
      params: options
    })
  },

  /**
   * 扫码查看户信息（需登录）
   * @param {string} codeId - 户码
   * @returns {Promise} 户信息
   */
  scanQR(codeId) {
    return request.post('/api/v1/household-qr/scan', { codeId })
  },

  /**
   * 公开扫码查看户信息（无需登录）
   * @param {string} codeId - 户码
   * @returns {Promise} 户信息
   */
  publicScanQR(codeId) {
    return request.post('/api/v1/household-qr/public/scan', { codeId })
  },

  /**
   * 验证户码
   * @param {string} codeId - 户码
   * @returns {Promise} 验证结果
   */
  validateCode(codeId) {
    return request.post('/api/v1/household-qr/validate', { codeId })
  },

  /**
   * 通过二维码更新户信息
   * @param {string} codeId - 户码
   * @param {Object} updateData - 更新数据
   * @returns {Promise} 更新结果
   */
  updateByQR(codeId, updateData) {
    return request.put(`/api/v1/household-qr/update/${codeId}`, updateData)
  },

  /**
   * 获取成员详情
   * @param {string} codeId - 户码
   * @param {string} memberId - 成员ID
   * @returns {Promise} 成员详情
   */
  getMember(codeId, memberId) {
    return request.get(`/api/v1/household-qr/member/${codeId}/${memberId}`)
  },

  /**
   * 刷新二维码
   * @param {string} householdId - 家庭ID
   * @returns {Promise} 新的二维码数据
   */
  refreshQR(householdId) {
    return request.post(`/api/v1/household-qr/refresh/${householdId}`)
  },

  /**
   * 批量生成户码（管理员）
   * @param {string} villageId - 村庄ID
   * @returns {Promise} 批量生成结果
   */
  batchGenerate(villageId) {
    return request.post(`/api/v1/household-qr/batch/${villageId}`)
  },

  /**
   * 获取户码统计
   * @param {string} villageId - 村庄ID
   * @returns {Promise} 统计信息
   */
  getStats(villageId) {
    return request.get(`/api/v1/household-qr/stats/${villageId}`)
  },

  // ==================== 便捷方法 ====================

  /**
   * 添加家庭成员
   * @param {string} codeId - 户码
   * @param {Object} memberData - 成员数据
   * @returns {Promise} 更新结果
   */
  addMember(codeId, memberData) {
    return this.updateByQR(codeId, {
      memberData,
      updateType: 'add_member'
    })
  },

  /**
   * 移除家庭成员
   * @param {string} codeId - 户码
   * @param {string} memberId - 成员ID
   * @returns {Promise} 更新结果
   */
  removeMember(codeId, memberId) {
    return this.updateByQR(codeId, {
      removeMemberId: memberId
    })
  },

  /**
   * 更新家庭成员信息
   * @param {string} codeId - 户码
   * @param {string} memberId - 成员ID
   * @param {Object} memberData - 成员数据
   * @returns {Promise} 更新结果
   */
  updateMember(codeId, memberId, memberData) {
    return this.updateByQR(codeId, {
      memberId,
      memberData
    })
  },

  /**
   * 更新家庭地址
   * @param {string} codeId - 户码
   * @param {Object} address - 地址数据
   * @returns {Promise} 更新结果
   */
  updateAddress(codeId, address) {
    return this.updateByQR(codeId, { address })
  },

  /**
   * 更新家庭标签
   * @param {string} codeId - 户码
   * @param {Array} tags - 标签数组
   * @returns {Promise} 更新结果
   */
  updateTags(codeId, tags) {
    return this.updateByQR(codeId, { tags })
  },

  /**
   * 更新联系方式
   * @param {string} codeId - 户码
   * @param {string} phone - 新电话号码
   * @returns {Promise} 更新结果
   */
  updateContact(codeId, phone) {
    return this.updateByQR(codeId, {
      contact: { householderPhone: phone }
    })
  }
}

export default householdQRApi
