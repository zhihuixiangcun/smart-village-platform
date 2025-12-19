/**
 * 用户相关API
 */

import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

const userApi = {
  /**
   * 搜索用户
   * @param {Object} params 搜索参数
   */
  searchUsers: async (params = {}) => {
    const response = await axios.get(`${API_BASE_URL}/api/v1/users/search`, { params })
    return response.data
  },

  /**
   * 获取用户列表
   * @param {Object} params 查询参数
   */
  getUserList: async (params = {}) => {
    const response = await axios.get(`${API_BASE_URL}/api/v1/users`, { params })
    return response.data
  },

  /**
   * 获取用户详情
   * @param {string} userId 用户ID
   */
  getUserDetail: async (userId) => {
    const response = await axios.get(`${API_BASE_URL}/api/v1/users/${userId}`)
    return response.data
  },

  /**
   * 创建用户
   * @param {Object} userData 用户数据
   */
  createUser: async (userData) => {
    const response = await axios.post(`${API_BASE_URL}/api/v1/users`, userData)
    return response.data
  },

  /**
   * 更新用户信息
   * @param {string} userId 用户ID
   * @param {Object} userData 用户数据
   */
  updateUser: async (userId, userData) => {
    const response = await axios.put(`${API_BASE_URL}/api/v1/users/${userId}`, userData)
    return response.data
  },

  /**
   * 删除用户
   * @param {string} userId 用户ID
   */
  deleteUser: async (userId) => {
    const response = await axios.delete(`${API_BASE_URL}/api/v1/users/${userId}`)
    return response.data
  },

  /**
   * 重置用户密码
   * @param {string} userId 用户ID
   */
  resetPassword: async (userId) => {
    const response = await axios.post(`${API_BASE_URL}/api/v1/users/${userId}/reset-password`)
    return response.data
  },

  /**
   * 启用/禁用用户
   * @param {string} userId 用户ID
   * @param {boolean} enabled 是否启用
   */
  toggleUserStatus: async (userId, enabled) => {
    const response = await axios.put(`${API_BASE_URL}/api/v1/users/${userId}/status`, { enabled })
    return response.data
  }
}

export default userApi