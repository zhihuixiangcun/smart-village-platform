/**
 * 应急响应模块 API
 */
import request from '@/utils/request'

export default {
  // ========== 应急预案管理 ==========
  // 获取应急预案列表
  getPlans(params) {
    return request({
      url: '/api/emergency/plans',
      method: 'get',
      params
    })
  },

  // 创建应急预案
  createPlan(data) {
    return request({
      url: '/api/emergency/plans',
      method: 'post',
      data
    })
  },

  // 更新应急预案
  updatePlan(id, data) {
    return request({
      url: `/api/emergency/plans/${id}`,
      method: 'put',
      data
    })
  },

  // 删除应急预案
  deletePlan(id) {
    return request({
      url: `/api/emergency/plans/${id}`,
      method: 'delete'
    })
  },

  // 启动应急预案
  activatePlan(planId, data) {
    return request({
      url: `/api/emergency/plans/${planId}/activate`,
      method: 'post',
      data
    })
  },

  // ========== 救援设备管理 ==========
  // 获取救援设备列表
  getEquipment(params) {
    return request({
      url: '/api/emergency/equipment',
      method: 'get',
      params
    })
  },

  // 添加救援设备
  addEquipment(data) {
    return request({
      url: '/api/emergency/equipment',
      method: 'post',
      data
    })
  },

  // 更新救援设备
  updateEquipment(id, data) {
    return request({
      url: `/api/emergency/equipment/${id}`,
      method: 'put',
      data
    })
  },

  // 删除救援设备
  deleteEquipment(id) {
    return request({
      url: `/api/emergency/equipment/${id}`,
      method: 'delete'
    })
  },

  // 按位置查询设备
  getEquipmentByLocation(params) {
    return request({
      url: '/api/emergency/equipment/location',
      method: 'get',
      params
    })
  },

  // ========== 应急演练管理 ==========
  // 获取应急演练记录
  getDrills(params) {
    return request({
      url: '/api/emergency/drills',
      method: 'get',
      params
    })
  },

  // 创建应急演练记录
  createDrill(data) {
    return request({
      url: '/api/emergency/drills',
      method: 'post',
      data
    })
  },

  // ========== 应急队伍管理 ==========
  // 获取应急队伍
  getTeams(params) {
    return request({
      url: '/api/emergency/teams',
      method: 'get',
      params
    })
  },

  // 创建应急队伍
  createTeam(data) {
    return request({
      url: '/api/emergency/teams',
      method: 'post',
      data
    })
  },

  // ========== 紧急广播 ==========
  // 发送紧急广播
  sendEmergencyBroadcast(data) {
    return request({
      url: '/api/emergency/broadcast',
      method: 'post',
      data
    })
  }
}
