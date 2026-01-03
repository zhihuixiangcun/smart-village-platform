/**
 * Family API Client
 * 家庭管理API客户端
 */

import request from '@/utils/request'

/**
 * 家庭档案管理
 */
export const familyApi = {
  // 创建家庭档案
  createFamily(data) {
    return request({
      url: '/family',
      method: 'post',
      data
    })
  },

  // 更新家庭档案
  updateFamily(familyId, data) {
    return request({
      url: `/family/${familyId}`,
      method: 'put',
      data
    })
  },

  // 删除家庭档案
  deleteFamily(familyId) {
    return request({
      url: `/family/${familyId}`,
      method: 'delete'
    })
  },

  // 获取家庭详情
  getFamilyById(familyId) {
    return request({
      url: `/family/${familyId}`,
      method: 'get'
    })
  },

  // 根据二维码获取家庭信息
  getFamilyByQRCode(qrCode) {
    return request({
      url: `/family/qrcode/${qrCode}`,
      method: 'get'
    })
  },

  // 获取村庄家庭列表
  getFamilyList(villageId, params = {}) {
    return request({
      url: `/family/village/${villageId}`,
      method: 'get',
      params
    })
  },

  // 搜索家庭
  searchFamilies(villageId, keyword) {
    return request({
      url: `/family/village/${villageId}/search/${keyword}`,
      method: 'get'
    })
  },

  // 获取统计数据
  getStatistics(villageId) {
    return request({
      url: `/family/village/${villageId}/statistics`,
      method: 'get'
    })
  },

  // 导出家庭数据
  exportFamilyData(villageId, params = {}) {
    return request({
      url: `/family/village/${villageId}/export`,
      method: 'get',
      params,
      responseType: 'blob'
    })
  },

  // 批量导入
  batchImport(familyList) {
    return request({
      url: '/family/batch/import',
      method: 'post',
      data: { familyList }
    })
  }
}

/**
 * 家庭成员管理
 */
export const familyMemberApi = {
  // 添加家庭成员
  addMember(familyId, data) {
    return request({
      url: `/family/${familyId}/members`,
      method: 'post',
      data
    })
  },

  // 更新成员信息
  updateMember(memberId, data) {
    return request({
      url: `/family/members/${memberId}`,
      method: 'put',
      data
    })
  },

  // 删除成员
  deleteMember(memberId) {
    return request({
      url: `/family/members/${memberId}`,
      method: 'delete'
    })
  }
}

/**
 * 二维码管理
 */
export const qrCodeApi = {
  // 重新生成二维码
  regenerateQRCode(familyId, expiresInDays = null) {
    return request({
      url: `/family/${familyId}/qrcode/regenerate`,
      method: 'post',
      data: { expiresInDays }
    })
  },

  // 撤销二维码
  revokeQRCode(familyId) {
    return request({
      url: `/family/${familyId}/qrcode/revoke`,
      method: 'post'
    })
  },

  // 记录打印
  recordPrint(familyId) {
    return request({
      url: `/family/${familyId}/qrcode/print`,
      method: 'post'
    })
  }
}

/**
 * 标签管理
 */
export const tagApi = {
  // 添加家庭标签
  addFamilyTag(familyId, tagName, color) {
    return request({
      url: `/family/${familyId}/tags`,
      method: 'post',
      data: { tagName, color }
    })
  },

  // 移除家庭标签
  removeFamilyTag(familyId, tagName) {
    return request({
      url: `/family/${familyId}/tags/${tagName}`,
      method: 'delete'
    })
  },

  // 添加成员特殊标签
  addMemberTag(memberId, tag) {
    return request({
      url: `/family/members/${memberId}/tags`,
      method: 'post',
      data: { tag }
    })
  },

  // 移除成员特殊标签
  removeMemberTag(memberId, tag) {
    return request({
      url: `/family/members/${memberId}/tags/${tag}`,
      method: 'delete'
    })
  }
}

/**
 * 远程认证
 */
export const authApi = {
  // 初始化人脸认证
  initFaceAuth(memberId, faceImageBase64) {
    return request({
      url: `/family/members/${memberId}/face/authenticate`,
      method: 'post',
      data: { faceImageBase64 }
    })
  },

  // 执行人脸识别
  performFaceRecognition(sessionId, capturedImageBase64) {
    return request({
      url: `/family/auth/${sessionId}/recognize`,
      method: 'post',
      data: { capturedImageBase64 }
    })
  },

  // 注册人脸信息
  registerFace(memberId, faceImageBase64) {
    return request({
      url: `/family/members/${memberId}/face/register`,
      method: 'post',
      data: { faceImageBase64 }
    })
  },

  // 验证Token
  verifyToken(token) {
    return request({
      url: '/family/auth/verify-token',
      method: 'post',
      data: { token }
    })
  },

  // 活体检测
  performLivenessDetection(imageBase64) {
    return request({
      url: '/family/auth/liveness',
      method: 'post',
      data: { imageBase64 }
    })
  },

  // 获取认证历史
  getAuthHistory(memberId, limit = 10) {
    return request({
      url: `/family/members/${memberId}/auth/history`,
      method: 'get',
      params: { limit }
    })
  },

  // 重置认证状态
  resetAuthStatus(memberId) {
    return request({
      url: `/family/members/${memberId}/auth/reset`,
      method: 'post'
    })
  }
}

/**
 * 亲属代理
 */
export const proxyApi = {
  // 请求代理认证
  requestProxyAuth(memberId, proxyMemberId) {
    return request({
      url: `/family/members/${memberId}/proxy/request`,
      method: 'post',
      data: { proxyMemberId }
    })
  },

  // 设置代理配置
  setProxySettings(memberId, allowedProxyIds, expiryDays = null) {
    return request({
      url: `/family/members/${memberId}/proxy/settings`,
      method: 'post',
      data: { allowedProxyIds, expiryDays }
    })
  },

  // 获取可用代理列表
  getAvailableProxies(memberId) {
    return request({
      url: `/family/members/${memberId}/proxy/available`,
      method: 'get'
    })
  }
}
