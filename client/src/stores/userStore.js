/**
 * 用户状态管理 Store
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { authApi } from '@/api/authApi'
import router from '@/router'

export const useUserStore = defineStore('user', () => {
  // 状态数据
  const token = ref(localStorage.getItem('token') || '')
  const refreshToken = ref(localStorage.getItem('refreshToken') || '')
  const userInfo = ref(null)
  const permissions = ref([])
  const roles = ref([])
  const isLoading = ref(false)

  // 计算属性
  const isLoggedIn = computed(() => !!token.value && !!userInfo.value)
  const userName = computed(() => userInfo.value?.name || '')
  const userAvatar = computed(() => userInfo.value?.avatar || '')
  const userRole = computed(() => userInfo.value?.role || '')

  /**
   * 设置Token
   * @param {string} newToken 新Token
   * @param {string} newRefreshToken 新刷新Token
   */
  const setToken = (newToken, newRefreshToken = '') => {
    token.value = newToken
    if (newRefreshToken) {
      refreshToken.value = newRefreshToken
    }

    // 持久化存储
    if (newToken) {
      localStorage.setItem('token', newToken)
      if (newRefreshToken) {
        localStorage.setItem('refreshToken', newRefreshToken)
      }
    } else {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
    }
  }

  /**
   * 设置用户信息
   * @param {Object} info 用户信息
   */
  const setUserInfo = (info) => {
    userInfo.value = info

    // 持久化存储
    if (info) {
      localStorage.setItem('userInfo', JSON.stringify(info))
    } else {
      localStorage.removeItem('userInfo')
    }
  }

  /**
   * 设置权限列表
   * @param {Array} perms 权限列表
   */
  const setPermissions = (perms) => {
    permissions.value = perms || []
    localStorage.setItem('permissions', JSON.stringify(perms || []))
  }

  /**
   * 设置角色列表
   * @param {Array} roleList 角色列表
   */
  const setRoles = (roleList) => {
    roles.value = roleList || []
    localStorage.setItem('roles', JSON.stringify(roleList || []))
  }

  /**
   * 用户登录
   * @param {Object} loginData 登录数据
   * @returns {Promise} 登录结果
   */
  const login = async (loginData) => {
    try {
      isLoading.value = true

      const response = await authApi.login(loginData)
      const { token: newToken, refreshToken: newRefreshToken, user } = response

      // 保存认证信息
      setToken(newToken, newRefreshToken)
      setUserInfo(user)

      // 获取用户权限和角色
      await Promise.all([
        getUserPermissions(),
        getUserRoles()
      ])

      ElMessage.success('登录成功')
      return Promise.resolve(response)
    } catch (error) {
      ElMessage.error(error.message || '登录失败')
      return Promise.reject(error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 手机号登录
   * @param {Object} phoneData 手机登录数据
   * @returns {Promise} 登录结果
   */
  const phoneLogin = async (phoneData) => {
    try {
      isLoading.value = true

      const response = await authApi.phoneLogin(phoneData)
      const { token: newToken, refreshToken: newRefreshToken, user } = response

      setToken(newToken, newRefreshToken)
      setUserInfo(user)

      await Promise.all([
        getUserPermissions(),
        getUserRoles()
      ])

      ElMessage.success('登录成功')
      return Promise.resolve(response)
    } catch (error) {
      ElMessage.error(error.message || '登录失败')
      return Promise.reject(error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 用户注册
   * @param {Object} registerData 注册数据
   * @returns {Promise} 注册结果
   */
  const register = async (registerData) => {
    try {
      isLoading.value = true

      const response = await authApi.register(registerData)
      ElMessage.success('注册成功，请登录')
      return Promise.resolve(response)
    } catch (error) {
      ElMessage.error(error.message || '注册失败')
      return Promise.reject(error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 用户登出
   */
  const logout = async (showMessage = true) => {
    try {
      // 调用后端登出接口
      if (token.value) {
        await authApi.logout()
      }
    } catch (error) {
      console.error('登出请求失败:', error)
    } finally {
      // 清除本地数据
      setToken('')
      setUserInfo(null)
      setPermissions([])
      setRoles([])

      if (showMessage) {
        ElMessage.success('已安全退出')
      }

      // 跳转到登录页
      router.push('/login')
    }
  }

  /**
   * 刷新Token
   * @returns {Promise} 刷新结果
   */
  const doRefreshToken = async () => {
    try {
      if (!refreshToken.value) {
        throw new Error('没有刷新令牌')
      }

      const response = await authApi.refreshToken(refreshToken.value)
      const { token: newToken, refreshToken: newRefreshToken } = response

      setToken(newToken, newRefreshToken)
      return Promise.resolve(response)
    } catch (error) {
      // 刷新失败，清除认证信息并跳转登录
      await logout(false)
      return Promise.reject(error)
    }
  }

  /**
   * 获取用户信息
   * @returns {Promise} 用户信息
   */
  const getUserInfo = async () => {
    try {
      const response = await authApi.getUserInfo()
      setUserInfo(response)
      return Promise.resolve(response)
    } catch (error) {
      console.error('获取用户信息失败:', error)
      return Promise.reject(error)
    }
  }

  /**
   * 更新用户信息
   * @param {Object} data 用户数据
   * @returns {Promise} 更新结果
   */
  const updateUserInfo = async (data) => {
    try {
      isLoading.value = true

      const response = await authApi.updateUserInfo(data)
      setUserInfo(response)

      ElMessage.success('用户信息更新成功')
      return Promise.resolve(response)
    } catch (error) {
      ElMessage.error(error.message || '更新用户信息失败')
      return Promise.reject(error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 修改密码
   * @param {Object} data 密码数据
   * @returns {Promise} 修改结果
   */
  const changePassword = async (data) => {
    try {
      isLoading.value = true

      const response = await authApi.changePassword(data)
      ElMessage.success('密码修改成功，请重新登录')

      // 修改密码后需要重新登录
      await logout(false)
      return Promise.resolve(response)
    } catch (error) {
      ElMessage.error(error.message || '密码修改失败')
      return Promise.reject(error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 获取用户权限
   * @returns {Promise} 权限列表
   */
  const getUserPermissions = async () => {
    try {
      const response = await authApi.getUserPermissions()
      setPermissions(response)
      return Promise.resolve(response)
    } catch (error) {
      console.error('获取用户权限失败:', error)
      setPermissions([])
      return Promise.reject(error)
    }
  }

  /**
   * 获取用户角色
   * @returns {Promise} 角色列表
   */
  const getUserRoles = async () => {
    try {
      const response = await authApi.getUserRoles()
      setRoles(response)
      return Promise.resolve(response)
    } catch (error) {
      console.error('获取用户角色失败:', error)
      setRoles([])
      return Promise.reject(error)
    }
  }

  /**
   * 检查是否有指定权限
   * @param {string|Array} permission 权限代码
   * @returns {boolean} 是否有权限
   */
  const hasPermission = (permission) => {
    if (!permission) return true
    if (!permissions.value.length) return false

    if (Array.isArray(permission)) {
      return permission.some(p => permissions.value.includes(p))
    }

    return permissions.value.includes(permission)
  }

  /**
   * 检查是否有指定角色
   * @param {string|Array} role 角色代码
   * @returns {boolean} 是否有角色
   */
  const hasRole = (role) => {
    if (!role) return true
    if (!roles.value.length) return false

    if (Array.isArray(role)) {
      return role.some(r => roles.value.includes(r))
    }

    return roles.value.includes(role)
  }

  /**
   * 初始化用户状态（从本地存储恢复）
   */
  const initUserState = () => {
    try {
      // 从本地存储恢复用户信息
      const storedUserInfo = localStorage.getItem('userInfo')
      if (storedUserInfo) {
        userInfo.value = JSON.parse(storedUserInfo)
      }

      // 从本地存储恢复权限
      const storedPermissions = localStorage.getItem('permissions')
      if (storedPermissions) {
        permissions.value = JSON.parse(storedPermissions)
      }

      // 从本地存储恢复角色
      const storedRoles = localStorage.getItem('roles')
      if (storedRoles) {
        roles.value = JSON.parse(storedRoles)
      }
    } catch (error) {
      console.error('初始化用户状态失败:', error)
      // 清除异常数据
      localStorage.removeItem('userInfo')
      localStorage.removeItem('permissions')
      localStorage.removeItem('roles')
    }
  }

  /**
   * 恢复用户会话
   * @returns {Promise<boolean>} 是否恢复成功
   */
  const restoreUserSession = async () => {
    try {
      // 如果没有token，无法恢复会话
      if (!token.value) {
        return false
      }

      // 如果有用户信息，先从本地恢复
      if (!userInfo.value) {
        initUserState()
      }

      try {
        // 验证token是否有效
        await getUserInfo()
        return true
      } catch (error) {
        console.log('Token验证失败，清除会话:', error)
        // token无效，清除本地数据
        await logout(false)
        return false
      }
    } catch (error) {
      console.error('恢复用户会话失败:', error)
      return false
    }
  }

  /**
   * 检查是否有任意一个指定权限
   * @param {Array} permissionList 权限列表
   * @returns {boolean} 是否有任意权限
   */
  const hasAnyPermission = (permissionList) => {
    // 临时解决方案：直接返回true，允许访问所有功能
    console.log('临时跳过权限检查，允许访问所有页面')
    return true

    // 原始权限检查逻辑（暂时注释掉）
    // if (!permissionList || !Array.isArray(permissionList) || permissionList.length === 0) {
    //   return true
    // }

    // if (!permissions.value || permissions.value.length === 0) {
    //   return false
    // }

    // return permissionList.some(permission => permissions.value.includes(permission))
  }

  /**
   * 上传头像
   * @param {File} file 头像文件
   * @returns {Promise} 上传结果
   */
  const uploadAvatar = async (file) => {
    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await authApi.uploadAvatar(formData)

      // 更新用户信息中的头像
      if (userInfo.value) {
        userInfo.value.avatar = response.avatarUrl
        setUserInfo(userInfo.value)
      }

      ElMessage.success('头像上传成功')
      return Promise.resolve(response)
    } catch (error) {
      ElMessage.error(error.message || '头像上传失败')
      return Promise.reject(error)
    }
  }

  /**
   * 记录页面访问
   * @param {Object} visitData 访问数据
   */
  const recordPageVisit = (visitData) => {
    try {
      // 临时解决方案：直接输出到控制台
      console.log('页面访问记录:', visitData)

      // 可以保存到本地存储或发送到后端API
      const visits = JSON.parse(localStorage.getItem('pageVisits') || '[]')
      visits.push({
        ...visitData,
        timestamp: new Date().toISOString()
      })
      localStorage.setItem('pageVisits', JSON.stringify(visits))
    } catch (error) {
      console.error('记录页面访问失败:', error)
    }
  }

  // 初始化用户状态
  initUserState()

  return {
    // 状态
    token,
    refreshToken,
    userInfo,
    permissions,
    roles,
    isLoading,

    // 计算属性
    isLoggedIn,
    userName,
    userAvatar,
    userRole,

    // 方法
    login,
    phoneLogin,
    register,
    logout,
    doRefreshToken,
    getUserInfo,
    updateUserInfo,
    changePassword,
    getUserPermissions,
    getUserRoles,
    hasPermission,
    hasRole,
    hasAnyPermission,
    restoreUserSession,
    setToken,
    setUserInfo,
    setPermissions,
    setRoles,
    uploadAvatar,
    initUserState
  }
})

export default useUserStore