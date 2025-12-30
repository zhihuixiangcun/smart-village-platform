/**
 * 乡村生活服务圈 API
 */
import request from '@/utils/request'

export default {
  // ========== 邻里互助模块 ==========
  // 获取求助请求列表
  getHelpRequests(params) {
    return request({
      url: '/api/village-services/help-requests',
      method: 'get',
      params
    })
  },

  // 创建求助请求
  createHelpRequest(data) {
    return request({
      url: '/api/village-services/help-requests',
      method: 'post',
      data
    })
  },

  // 响应求助请求（抢单）
  respondToHelpRequest(id, data) {
    return request({
      url: `/api/village-services/help-requests/${id}/respond`,
      method: 'post',
      data
    })
  },

  // 更新求助状态
  updateHelpRequestStatus(id, data) {
    return request({
      url: `/api/village-services/help-requests/${id}/status`,
      method: 'put',
      data
    })
  },

  // 获取我的求助记录
  getMyHelpRequests() {
    return request({
      url: '/api/village-services/help-requests/my',
      method: 'get'
    })
  },

  // ========== 拼车服务模块 ==========
  // 获取拼车请求
  getCarpoolRequests(params) {
    return request({
      url: '/api/village-services/carpool',
      method: 'get',
      params
    })
  },

  // 创建拼车请求
  createCarpoolRequest(data) {
    return request({
      url: '/api/village-services/carpool',
      method: 'post',
      data
    })
  },

  // 加入拼车
  joinCarpool(id, data) {
    return request({
      url: `/api/village-services/carpool/${id}/join`,
      method: 'post',
      data
    })
  },

  // 取消拼车
  cancelCarpool(id) {
    return request({
      url: `/api/village-services/carpool/${id}/cancel`,
      method: 'post'
    })
  },

  // 退出拼车
  leaveCarpool(id) {
    return request({
      url: `/api/village-services/carpool/${id}/leave`,
      method: 'post'
    })
  },

  // 获取我的拼车记录
  getMyCarpools() {
    return request({
      url: '/api/village-services/carpool/my',
      method: 'get'
    })
  },

  // ========== 设备共享模块 ==========
  // 获取共享设备
  getSharedEquipment(params) {
    return request({
      url: '/api/village-services/shared-equipment',
      method: 'get',
      params
    })
  },

  // 添加共享设备
  addSharedEquipment(data) {
    return request({
      url: '/api/village-services/shared-equipment',
      method: 'post',
      data,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // 借用设备
  borrowEquipment(id, data) {
    return request({
      url: `/api/village-services/shared-equipment/${id}/borrow`,
      method: 'post',
      data
    })
  },

  // 归还设备
  returnEquipment(id, data) {
    return request({
      url: `/api/village-services/shared-equipment/${id}/return`,
      method: 'post',
      data
    })
  },

  // 更新设备信息
  updateEquipment(id, data) {
    return request({
      url: `/api/village-services/shared-equipment/${id}`,
      method: 'put',
      data
    })
  },

  // 删除设备
  deleteEquipment(id) {
    return request({
      url: `/api/village-services/shared-equipment/${id}`,
      method: 'delete'
    })
  },

  // 获取我的设备
  getMyEquipment() {
    return request({
      url: '/api/village-services/shared-equipment/my',
      method: 'get'
    })
  },

  // ========== 乡村活动圈 ==========
  // 获取活动列表
  getActivities(params) {
    return request({
      url: '/api/village-services/activities',
      method: 'get',
      params
    })
  },

  // 创建活动
  createActivity(data) {
    return request({
      url: '/api/village-services/activities',
      method: 'post',
      data,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // 参加活动
  joinActivity(id) {
    return request({
      url: `/api/village-services/activities/${id}/join`,
      method: 'post'
    })
  },

  // 取消参加活动
  leaveActivity(id) {
    return request({
      url: `/api/village-services/activities/${id}/leave`,
      method: 'post'
    })
  },

  // 点赞活动
  likeActivity(id) {
    return request({
      url: `/api/village-services/activities/${id}/like`,
      method: 'post'
    })
  },

  // 获取活动详情
  getActivityDetail(id) {
    return request({
      url: `/api/village-services/activities/${id}`,
      method: 'get'
    })
  },

  // ========== 便民服务点 ==========
  // 获取服务点
  getServicePoints(params) {
    return request({
      url: '/api/village-services/service-points',
      method: 'get',
      params
    })
  },

  // 添加服务点
  addServicePoint(data) {
    return request({
      url: '/api/village-services/service-points',
      method: 'post',
      data
    })
  },

  // ========== 电商对接（助农专区） ==========
  // 获取农产品列表
  getAgriculturalProducts(params) {
    return request({
      url: '/api/village-services/products',
      method: 'get',
      params
    })
  },

  // 添加农产品
  addProduct(data) {
    return request({
      url: '/api/village-services/products',
      method: 'post',
      data,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // 更新产品
  updateProduct(id, data) {
    return request({
      url: `/api/village-services/products/${id}`,
      method: 'put',
      data
    })
  },

  // 删除产品
  deleteProduct(id) {
    return request({
      url: `/api/village-services/products/${id}`,
      method: 'delete'
    })
  },

  // 获取我的产品
  getMyProducts() {
    return request({
      url: '/api/village-services/products/my',
      method: 'get'
    })
  }
}
