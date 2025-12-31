import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/api'

/**
 * 用户Store
 * 管理用户登录状态、用户信息、权限等
 */
export const useUserStore = defineStore('user', () => {
  // ===== 状态 =====

  // 用户信息
  const userInfo = ref(null)

  // 访问令牌
  const accessToken = ref('')

  // 刷新令牌
  const refreshToken = ref('')

  // 登录状态
  const isLoggedIn = computed(() => !!accessToken.value && !!userInfo.value)

  // 用户角色
  const userRole = computed(() => userInfo.value?.role || 'villager')

  // 是否为村干部
  const isOfficial = computed(() => {
    return ['admin', 'official', 'cadre'].includes(userRole.value)
  })

  // 村民ID
  const villagerId = computed(() => userInfo.value?.villagerId)

  // 所属村庄ID
  const villageId = computed(() => userInfo.value?.villageId)

  // 一户一码
  const householdQR = computed(() => userInfo.value?.householdQR)

  // ===== 方法 =====

  /**
   * 初始化 - 检查本地存储的登录状态
   */
  const checkAuth = async () => {
    try {
      const token = uni.getStorageSync('access_token')
      const refresh = uni.getStorageSync('refresh_token')
      const user = uni.getStorageSync('user_info')

      if (token && user) {
        accessToken.value = token
        refreshToken.value = refresh
        userInfo.value = user

        console.log('用户已登录:', user.name)

        // 验证token是否有效
        await validateToken()
      } else {
        console.log('未找到登录信息')
        logout()
      }
    } catch (error) {
      console.error('检查登录状态失败:', error)
      logout()
    }
  }

  /**
   * 验证Token有效性
   */
  const validateToken = async () => {
    try {
      // 调用API验证token
      const result = await api.auth.validateToken()

      if (result.success) {
        // Token有效，更新用户信息
        userInfo.value = result.data
        await saveUserInfo()
        return true
      } else {
        // Token无效，尝试刷新
        return await refreshAccessToken()
      }
    } catch (error) {
      console.error('Token验证失败:', error)
      return await refreshAccessToken()
    }
  }

  /**
   * 刷新访问令牌
   */
  const refreshAccessToken = async () => {
    if (!refreshToken.value) {
      logout()
      return false
    }

    try {
      const result = await api.auth.refreshToken(refreshToken.value)

      if (result.success) {
        accessToken.value = result.data.accessToken
        refreshToken.value = result.data.refreshToken

        // 保存到本地存储
        uni.setStorageSync('access_token', result.data.accessToken)
        uni.setStorageSync('refresh_token', result.data.refreshToken)

        console.log('Token刷新成功')
        return true
      } else {
        console.error('Token刷新失败')
        logout()
        return false
      }
    } catch (error) {
      console.error('Token刷新出错:', error)
      logout()
      return false
    }
  }

  /**
   * 用户登录
   */
  const login = async (credentials) => {
    try {
      // 显示加载提示
      uni.showLoading({
        title: '登录中...',
        mask: true
      })

      // 调用登录API
      const result = await api.auth.login(credentials)

      uni.hideLoading()

      if (result.success) {
        const { accessToken, refreshToken, user } = result.data

        // 保存到状态
        accessToken.value = accessToken
        refreshToken.value = refreshToken
        userInfo.value = user

        // 保存到本地存储
        await saveUserInfo()
        uni.setStorageSync('access_token', accessToken)
        uni.setStorageSync('refresh_token', refreshToken)

        console.log('登录成功:', user.name)

        // 提示用户
        uni.showToast({
          title: '登录成功',
          icon: 'success'
        })

        return { success: true }
      } else {
        uni.showToast({
          title: result.message || '登录失败',
          icon: 'none'
        })
        return { success: false, message: result.message }
      }
    } catch (error) {
      uni.hideLoading()
      console.error('登录失败:', error)
      uni.showToast({
        title: error.message || '登录失败，请重试',
        icon: 'none'
      })
      return { success: false, message: error.message }
    }
  }

  /**
   * 用户登出
   */
  const logout = async () => {
    try {
      // 调用登出API
      if (accessToken.value) {
        await api.auth.logout()
      }
    } catch (error) {
      console.error('登出API调用失败:', error)
    } finally {
      // 清除状态
      userInfo.value = null
      accessToken.value = ''
      refreshToken.value = ''

      // 清除本地存储
      uni.removeStorageSync('access_token')
      uni.removeStorageSync('refresh_token')
      uni.removeStorageSync('user_info')

      // 清除其他缓存
      clearAllUserData()

      console.log('用户已登出')

      // 跳转到登录页
      uni.reLaunch({
        url: '/pages/auth/login'
      })
    }
  }

  /**
   * 保存用户信息到本地存储
   */
  const saveUserInfo = () => {
    return new Promise((resolve) => {
      uni.setStorage({
        key: 'user_info',
        data: userInfo.value,
        success: () => {
          console.log('用户信息已保存')
          resolve()
        },
        fail: (error) => {
          console.error('用户信息保存失败:', error)
          resolve()
        }
      })
    })
  }

  /**
   * 清除所有用户数据
   */
  const clearAllUserData = () => {
    const keys = [
      'elderly_settings',
      'offline_queue',
      'cache_announcements',
      'cache_meetings',
      'cache_services',
      'user_preferences'
    ]

    keys.forEach(key => {
      uni.removeStorageSync(key)
    })
  }

  /**
   * 更新用户信息
   */
  const updateUserInfo = async (data) => {
    try {
      const result = await api.user.updateProfile(data)

      if (result.success) {
        userInfo.value = {
          ...userInfo.value,
          ...result.data
        }
        await saveUserInfo()

        uni.showToast({
          title: '更新成功',
          icon: 'success'
        })

        return { success: true }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      console.error('更新用户信息失败:', error)
      return { success: false, message: error.message }
    }
  }

  /**
   * 获取用户详细信息
   */
  const fetchUserDetail = async () => {
    if (!accessToken.value) {
      return null
    }

    try {
      const result = await api.user.getUserDetail()

      if (result.success) {
        userInfo.value = result.data
        await saveUserInfo()
        return result.data
      }

      return null
    } catch (error) {
      console.error('获取用户详情失败:', error)
      return null
    }
  }

  /**
   * 上传头像
   */
  const uploadAvatar = async (filePath) => {
    try {
      uni.showLoading({
        title: '上传中...'
      })

      const result = await api.user.uploadAvatar(filePath)

      uni.hideLoading()

      if (result.success) {
        userInfo.value.avatar = result.data.url
        await saveUserInfo()

        uni.showToast({
          title: '上传成功',
          icon: 'success'
        })

        return { success: true, url: result.data.url }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      uni.hideLoading()
      console.error('上传头像失败:', error)
      return { success: false, message: error.message }
    }
  }

  /**
   * 修改密码
   */
  const changePassword = async (oldPassword, newPassword) => {
    try {
      const result = await api.user.changePassword({
        oldPassword,
        newPassword
      })

      if (result.success) {
        uni.showToast({
          title: '密码修改成功，请重新登录',
          icon: 'success',
          duration: 2000
        })

        // 延迟后登出
        setTimeout(() => {
          logout()
        }, 2000)

        return { success: true }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      console.error('修改密码失败:', error)
      return { success: false, message: error.message }
    }
  }

  /**
   * 绑定手机号
   */
  const bindPhone = async (phone, code) => {
    try {
      const result = await api.user.bindPhone({
        phone,
        code
      })

      if (result.success) {
        userInfo.value.phone = phone
        await saveUserInfo()

        uni.showToast({
          title: '绑定成功',
          icon: 'success'
        })

        return { success: true }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      console.error('绑定手机失败:', error)
      return { success: false, message: error.message }
    }
  }

  /**
   * 实名认证
   */
  const realNameVerify = async (realName, idCard) => {
    try {
      const result = await api.user.realNameVerify({
        realName,
        idCard
      })

      if (result.success) {
        userInfo.value.realName = realName
        userInfo.value.idCard = idCard
        userInfo.value.verified = true
        await saveUserInfo()

        uni.showToast({
          title: '认证成功',
          icon: 'success'
        })

        return { success: true }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      console.error('实名认证失败:', error)
      return { success: false, message: error.message }
    }
  }

  /**
   * 获取用户积分
   */
  const getUserPoints = async () => {
    if (!accessToken.value) {
      return 0
    }

    try {
      const result = await api.user.getPoints()
      return result.success ? result.data.points : 0
    } catch (error) {
      console.error('获取积分失败:', error)
      return 0
    }
  }

  /**
   * 获取用户统计数据
   */
  const getUserStats = async () => {
    if (!accessToken.value) {
      return null
    }

    try {
      const result = await api.user.getStats()
      return result.success ? result.data : null
    } catch (error) {
      console.error('获取统计数据失败:', error)
      return null
    }
  }

  // 返回状态和方法
  return {
    // 状态
    userInfo,
    accessToken,
    refreshToken,
    isLoggedIn,
    userRole,
    isOfficial,
    villagerId,
    villageId,
    householdQR,

    // 认证相关
    checkAuth,
    validateToken,
    login,
    logout,
    refreshAccessToken,

    // 用户信息
    updateUserInfo,
    fetchUserDetail,
    uploadAvatar,
    changePassword,
    bindPhone,
    realNameVerify,

    // 用户数据
    getUserPoints,
    getUserStats
  }
})