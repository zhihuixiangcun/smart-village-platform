/**
 * 增强权限服务
 * 提供前端权限管理、动态权限检查等功能
 */

import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/userStore'

class EnhancedPermissionService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
    this.cache = new Map()
    this.cacheTimeout = 5 * 60 * 1000 // 5分钟
  }

  /**
   * 增强用户认证
   * @param {Object} authData - 认证数据
   * @returns {Promise<Object>} 认证结果
   */
  async enhancedAuthenticate(authData) {
    try {
      const response = await axios.post(`${this.baseURL}/api/v1/enhanced-permissions/authenticate`, authData, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.data.success) {
        const { data } = response.data

        // 存储会话信息
        localStorage.setItem('sessionId', data.session.sessionId)
        localStorage.setItem('token', data.session.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('permissions', JSON.stringify(data.permissions))

        // 设置axios默认header
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.session.token}`
        axios.defaults.headers.common['X-Session-Id'] = data.session.sessionId

        // 更新用户状态
        const userStore = useUserStore()
        userStore.setUser(data.user)
        userStore.setPermissions(data.permissions)
        userStore.setToken(data.session.token)
        userStore.setSessionId(data.session.sessionId)
      }

      return response.data

    } catch (error) {
      this.handleError(error, '用户认证失败')
      throw error
    }
  }

  /**
   * 权限检查
   * @param {String} resource - 资源
   * @param {String} action - 操作
   * @param {Object} context - 上下文
   * @returns {Promise<Object>} 检查结果
   */
  async checkPermission(resource, action, context = {}) {
    try {
      const response = await axios.post(`${this.baseURL}/api/v1/enhanced-permissions/check`, {
        resource,
        action,
        context: {
          ...context,
          timestamp: new Date().toISOString()
        }
      })

      return response.data

    } catch (error) {
      this.handleError(error, '权限检查失败')
      return {
        success: false,
        allowed: false,
        reason: 'NETWORK_ERROR'
      }
    }
  }

  /**
   * 批量权限检查
   * @param {Array} permissions - 权限列表
   * @returns {Promise<Object>} 检查结果
   */
  async batchCheckPermissions(permissions) {
    try {
      const response = await axios.post(`${this.baseURL}/api/v1/enhanced-permissions/batch-check`, {
        permissions
      })

      return response.data

    } catch (error) {
      this.handleError(error, '批量权限检查失败')
      return {
        success: false,
        results: []
      }
    }
  }

  /**
   * 获取用户权限
   * @returns {Promise<Array>} 权限列表
   */
  async getUserPermissions() {
    try {
      // 检查缓存
      const cacheKey = 'user_permissions'
      const cached = this.cache.get(cacheKey)
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        return cached.permissions
      }

      const response = await axios.get(`${this.baseURL}/api/v1/enhanced-permissions/user/permissions`)

      if (response.data.success) {
        this.cache.set(cacheKey, {
          permissions: response.data.data.permissions,
          timestamp: Date.now()
        })
      }

      return response.data.data.permissions

    } catch (error) {
      this.handleError(error, '获取用户权限失败')
      return []
    }
  }

  /**
   * 创建权限策略
   * @param {Object} policyData - 策略数据
   * @returns {Promise<Object>} 创建结果
   */
  async createPermissionPolicy(policyData) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/v1/enhanced-permissions/policies`,
        policyData
      )

      return response.data

    } catch (error) {
      this.handleError(error, '创建权限策略失败')
      throw error
    }
  }

  /**
   * 获取权限策略列表
   * @returns {Promise<Array>} 策略列表
   */
  async getPermissionPolicies() {
    try {
      const response = await axios.get(`${this.baseURL}/api/v1/enhanced-permissions/policies`)
      return response.data.data

    } catch (error) {
      this.handleError(error, '获取权限策略失败')
      return []
    }
  }

  /**
   * 配置权限继承
   * @param {Object} config - 继承配置
   * @returns {Promise<Object>} 配置结果
   */
  async configurePermissionInheritance(config) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/v1/enhanced-permissions/inheritance/configure`,
        config
      )

      return response.data

    } catch (error) {
      this.handleError(error, '配置权限继承失败')
      throw error
    }
  }

  /**
   * 获取权限继承配置
   * @returns {Promise<Object>} 继承配置
   */
  async getPermissionInheritanceConfig() {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/v1/enhanced-permissions/inheritance/config`
      )

      return response.data.data

    } catch (error) {
      this.handleError(error, '获取权限继承配置失败')
      return {}
    }
  }

  /**
   * 管理会话
   * @param {String} sessionId - 会话ID
   * @param {Object} sessionData - 会话数据
   * @returns {Promise<Object>} 会话结果
   */
  async manageSession(sessionId, sessionData = {}) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/v1/enhanced-permissions/sessions/manage`,
        {
          sessionId,
          sessionData
        }
      )

      return response.data

    } catch (error) {
      this.handleError(error, '会话管理失败')
      throw error
    }
  }

  /**
   * 实时更新权限
   * @param {String} userId - 用户ID
   * @param {Array} permissions - 权限列表
   * @returns {Promise<Object>} 更新结果
   */
  async updatePermissionsRealtime(userId, permissions) {
    try {
      const response = await axios.put(
        `${this.baseURL}/api/v1/enhanced-permissions/users/${userId}/permissions`,
        {
          permissions
        }
      )

      // 清除本地缓存
      this.cache.clear()

      return response.data

    } catch (error) {
      this.handleError(error, '实时更新权限失败')
      throw error
    }
  }

  /**
   * 生成权限审计报告
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Object>} 审计报告
   */
  async generatePermissionAuditReport(filters = {}) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/v1/enhanced-permissions/audit/report`,
        { params: filters }
      )

      return response.data

    } catch (error) {
      this.handleError(error, '生成权限审计报告失败')
      throw error
    }
  }

  /**
   * 获取权限统计
   * @returns {Promise<Object>} 统计信息
   */
  async getPermissionStats() {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/v1/enhanced-permissions/stats`
      )

      return response.data.data

    } catch (error) {
      this.handleError(error, '获取权限统计失败')
      return {}
    }
  }

  /**
   * 清理权限缓存
   * @returns {Promise<Object>} 清理结果
   */
  async clearPermissionCache() {
    try {
      this.cache.clear()

      const response = await axios.delete(
        `${this.baseURL}/api/v1/enhanced-permissions/cache`
      )

      return response.data

    } catch (error) {
      this.handleError(error, '清理权限缓存失败')
      return { success: false }
    }
  }

  /**
   * 本地权限检查（缓存权限）
   * @param {String} resource - 资源
   * @param {String} action - 操作
   * @returns {Boolean} 是否有权限
   */
  hasPermission(resource, action) {
    try {
      const userStore = useUserStore()
      const permissions = userStore.permissions || []

      // 检查具体权限
      if (permissions.includes(`${resource}:${action}`)) {
        return true
      }

      // 检查通配符权限
      if (permissions.includes(`*:${action}`)) {
        return true
      }

      // 检查资源级权限
      return permissions.some(permission => {
        const [res, acts] = permission.split(':')
        return (res === resource || res === '*') &&
               acts.split(',').includes(action)
      })

    } catch (error) {
      console.error('本地权限检查失败:', error)
      return false
    }
  }

  /**
   * 检查角色权限
   * @param {String|Array} roles - 角色列表
   * @returns {Boolean} 是否有角色
   */
  hasRole(roles) {
    try {
      const userStore = useUserStore()
      const userRole = userStore.user?.role

      if (!userRole) {
        return false
      }

      const requiredRoles = Array.isArray(roles) ? roles : [roles]
      return requiredRoles.includes(userRole)

    } catch (error) {
      console.error('角色检查失败:', error)
      return false
    }
  }

  /**
   * 获取设备信息
   * @returns {Object} 设备信息
   */
  getDeviceInfo() {
    return {
      deviceId: localStorage.getItem('deviceId') || this.generateDeviceId(),
      deviceFingerprint: this.generateDeviceFingerprint(),
      userAgent: navigator.userAgent,
      platform: navigator.platform
    }
  }

  /**
   * 生成设备ID
   * @returns {String} 设备ID
   */
  generateDeviceId() {
    const deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem('deviceId', deviceId)
    return deviceId
  }

  /**
   * 生成设备指纹
   * @returns {String} 设备指纹
   */
  generateDeviceFingerprint() {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillText('Device fingerprint', 2, 2)

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|')

    return this.hashCode(fingerprint)
  }

  /**
   * 获取地理位置
   * @returns {Promise<Object>} 地理位置信息
   */
  async getLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          })
        },
        (error) => {
          console.warn('获取地理位置失败:', error)
          resolve(null)
        },
        {
          timeout: 5000,
          enableHighAccuracy: false
        }
      )
    })
  }

  /**
   * 处理错误
   * @param {Error} error - 错误对象
   * @param {String} defaultMessage - 默认错误消息
   */
  handleError(error, defaultMessage) {
    let message = defaultMessage

    if (error.response) {
      const { data, status } = error.response
      message = data?.message || defaultMessage

      // 处理特定错误码
      if (status === 401) {
        // 清除认证信息
        this.clearAuth()
        message = '登录已过期，请重新登录'
      } else if (status === 403) {
        message = '权限不足'
      }
    } else if (error.request) {
      message = '网络连接失败'
    }

    ElMessage.error(message)
  }

  /**
   * 清除认证信息
   */
  clearAuth() {
    localStorage.removeItem('sessionId')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('permissions')
    delete axios.defaults.headers.common['Authorization']
    delete axios.defaults.headers.common['X-Session-Id']

    const userStore = useUserStore()
    userStore.clearAuth()
  }

  /**
   * 字符串哈希
   * @param {String} str - 字符串
   * @returns {String} 哈希值
   */
  hashCode(str) {
    let hash = 0
    if (str.length === 0) return hash

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }

    return hash.toString()
  }

  /**
   * 设置请求拦截器
   */
  setupInterceptors() {
    // 请求拦截器
    axios.interceptors.request.use(
      (config) => {
        // 添加设备信息
        const deviceInfo = this.getDeviceInfo()
        config.headers['X-Device-Id'] = deviceInfo.deviceId
        config.headers['X-Device-Fingerprint'] = deviceInfo.deviceFingerprint

        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    axios.interceptors.response.use(
      (response) => {
        return response
      },
      (error) => {
        if (error.response?.status === 401) {
          this.clearAuth()
          // 跳转到登录页
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
        }
        return Promise.reject(error)
      }
    )
  }
}

export default new EnhancedPermissionService()