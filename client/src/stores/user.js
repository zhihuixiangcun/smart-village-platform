import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { userAPI } from '@/api/auth';
import { ElMessage } from 'element-plus';

/**
 * 用户状态管理
 * 包含用户信息、权限管理、会话控制等功能
 */
export const useUserStore = defineStore('user', () => {
  // 状态定义
  const user = ref(null);
  const token = ref(localStorage.getItem('access_token') || '');
  const refreshToken = ref(localStorage.getItem('refresh_token') || '');
  const permissions = ref([]);
  const villages = ref([]);
  const currentVillage = ref(null);
  
  // 加载状态
  const loading = ref(false);
  const loginLoading = ref(false);
  
  // 页面访问历史
  const visitHistory = ref([]);
  
  // 用户偏好设置
  const preferences = ref({
    theme: 'light',
    language: 'zh-CN',
    pageSize: 20,
    sidebarCollapsed: false
  });

  // 计算属性
  const isLoggedIn = computed(() => !!token.value && !!user.value);
  
  const userInfo = computed(() => user.value || {});
  
  const userRole = computed(() => user.value?.role || '');
  
  const userPermissions = computed(() => permissions.value || []);
  
  const userVillages = computed(() => villages.value || []);
  
  const hasPermission = computed(() => {
    return (permission) => {
      if (!permissions.value || permissions.value.length === 0) {
        return false;
      }
      
      // 超级管理员权限
      if (permissions.value.includes('*:*')) {
        return true;
      }
      
      // 精确匹配
      if (permissions.value.includes(permission)) {
        return true;
      }
      
      // 通配符匹配
      const [resource, action] = permission.split(':');
      const wildcardPermission = `${resource}:*`;
      return permissions.value.includes(wildcardPermission);
    };
  });
  
  const canAccessVillage = computed(() => {
    return (villageId) => {
      return villages.value.some(village => village.id === villageId);
    };
  });

  // Actions
  
  /**
   * 用户登录
   */
  const login = async (credentials) => {
    try {
      loginLoading.value = true;
      
      const response = await userAPI.login(credentials);
      
      if (response.success) {
        const { user: userData, accessToken, refreshToken: newRefreshToken, permissions: userPermissions } = response.data;
        
        // 保存用户信息
        user.value = userData;
        token.value = accessToken;
        refreshToken.value = newRefreshToken;
        permissions.value = userPermissions || [];
        villages.value = userData.villages || [];
        
        // 设置默认当前村庄
        if (villages.value.length > 0) {
          currentVillage.value = villages.value[0];
        }
        
        // 保存到本地存储
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', newRefreshToken);
        localStorage.setItem('user_info', JSON.stringify(userData));
        localStorage.setItem('user_permissions', JSON.stringify(userPermissions));
        
        ElMessage.success('登录成功');
        
        return response;
      } else {
        ElMessage.error(response.message || '登录失败');
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('登录失败:', error);
      ElMessage.error('登录失败，请检查用户名和密码');
      throw error;
    } finally {
      loginLoading.value = false;
    }
  };
  
  /**
   * 用户登出
   */
  const logout = async () => {
    try {
      if (token.value) {
        await userAPI.logout();
      }
    } catch (error) {
      console.error('登出请求失败:', error);
    } finally {
      // 清除本地状态和存储
      clearUserData();
      ElMessage.success('已安全退出');
    }
  };
  
  /**
   * 清除用户数据
   */
  const clearUserData = () => {
    user.value = null;
    token.value = '';
    refreshToken.value = '';
    permissions.value = [];
    villages.value = [];
    currentVillage.value = null;
    visitHistory.value = [];
    
    // 清除本地存储
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('user_permissions');
  };
  
  /**
   * 刷新令牌
   */
  const refreshAccessToken = async () => {
    try {
      if (!refreshToken.value) {
        throw new Error('没有刷新令牌');
      }
      
      const response = await userAPI.refreshToken(refreshToken.value);
      
      if (response.success) {
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        
        token.value = accessToken;
        refreshToken.value = newRefreshToken;
        
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', newRefreshToken);
        
        return accessToken;
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('刷新令牌失败:', error);
      // 刷新失败，清除用户数据
      clearUserData();
      throw error;
    }
  };
  
  /**
   * 恢复用户会话
   */
  const restoreUserSession = async () => {
    try {
      const savedToken = localStorage.getItem('access_token');
      const savedUser = localStorage.getItem('user_info');
      const savedPermissions = localStorage.getItem('user_permissions');
      
      if (savedToken && savedUser) {
        token.value = savedToken;
        user.value = JSON.parse(savedUser);
        permissions.value = savedPermissions ? JSON.parse(savedPermissions) : [];
        villages.value = user.value.villages || [];
        
        if (villages.value.length > 0) {
          currentVillage.value = villages.value[0];
        }
        
        // 验证令牌是否有效
        await getUserProfile();
        
        return true;
      }
    } catch (error) {
      console.error('恢复会话失败:', error);
      clearUserData();
    }
    
    return false;
  };
  
  /**
   * 获取用户资料
   */
  const getUserProfile = async () => {
    try {
      loading.value = true;
      
      const response = await userAPI.getUserProfile();
      
      if (response.success) {
        user.value = response.data;
        villages.value = response.data.villages || [];
        
        // 更新本地存储
        localStorage.setItem('user_info', JSON.stringify(response.data));
      }
      
      return response;
    } catch (error) {
      console.error('获取用户资料失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * 更新用户资料
   */
  const updateUserProfile = async (profileData) => {
    try {
      loading.value = true;
      
      const response = await userAPI.updateUserProfile(profileData);
      
      if (response.success) {
        user.value = { ...user.value, ...response.data };
        
        // 更新本地存储
        localStorage.setItem('user_info', JSON.stringify(user.value));
        
        ElMessage.success('资料更新成功');
      }
      
      return response;
    } catch (error) {
      console.error('更新用户资料失败:', error);
      ElMessage.error('资料更新失败');
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * 修改密码
   */
  const changePassword = async (passwordData) => {
    try {
      loading.value = true;
      
      const response = await userAPI.changePassword(passwordData);
      
      if (response.success) {
        ElMessage.success('密码修改成功，请重新登录');
        // 修改密码后需要重新登录
        await logout();
      }
      
      return response;
    } catch (error) {
      console.error('修改密码失败:', error);
      ElMessage.error('密码修改失败');
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * 切换当前村庄
   */
  const switchVillage = async (villageId) => {
    try {
      const village = villages.value.find(v => v.id === villageId);
      if (village) {
        currentVillage.value = village;
        ElMessage.success(`已切换到 ${village.name}`);
        
        // 保存到本地存储
        localStorage.setItem('current_village', JSON.stringify(village));
        
        return village;
      } else {
        throw new Error('村庄不存在或无权限访问');
      }
    } catch (error) {
      console.error('切换村庄失败:', error);
      ElMessage.error('切换村庄失败');
      throw error;
    }
  };
  
  /**
   * 记录页面访问
   */
  const recordPageVisit = (pageInfo) => {
    const visit = {
      ...pageInfo,
      id: Date.now()
    };
    
    // 添加到访问历史
    visitHistory.value.unshift(visit);
    
    // 保持最近50条记录
    if (visitHistory.value.length > 50) {
      visitHistory.value = visitHistory.value.slice(0, 50);
    }
  };
  
  /**
   * 获取访问历史
   */
  const getVisitHistory = (limit = 10) => {
    return visitHistory.value.slice(0, limit);
  };
  
  /**
   * 更新用户偏好设置
   */
  const updatePreferences = (newPreferences) => {
    preferences.value = { ...preferences.value, ...newPreferences };
    
    // 保存到本地存储
    localStorage.setItem('user_preferences', JSON.stringify(preferences.value));
  };
  
  /**
   * 恢复用户偏好设置
   */
  const restorePreferences = () => {
    const savedPreferences = localStorage.getItem('user_preferences');
    if (savedPreferences) {
      preferences.value = { ...preferences.value, ...JSON.parse(savedPreferences) };
    }
  };
  
  /**
   * 检查是否有特定权限
   */
  const checkPermission = (permission) => {
    return hasPermission.value(permission);
  };
  
  /**
   * 检查是否有多个权限中的任意一个
   */
  const hasAnyPermission = (permissionList) => {
    return permissionList.some(permission => checkPermission(permission));
  };
  
  /**
   * 检查是否有所有权限
   */
  const hasAllPermissions = (permissionList) => {
    return permissionList.every(permission => checkPermission(permission));
  };
  
  /**
   * 获取用户可访问的菜单
   */
  const getAccessibleMenus = (menuList) => {
    return menuList.filter(menu => {
      if (!menu.permissions || menu.permissions.length === 0) {
        return true;
      }
      return hasAnyPermission(menu.permissions);
    });
  };
  
  /**
   * 重置状态
   */
  const resetState = () => {
    clearUserData();
    preferences.value = {
      theme: 'light',
      language: 'zh-CN',
      pageSize: 20,
      sidebarCollapsed: false
    };
  };

  // 初始化
  restorePreferences();

  return {
    // 状态
    user,
    token,
    refreshToken,
    permissions,
    villages,
    currentVillage,
    loading,
    loginLoading,
    visitHistory,
    preferences,
    
    // 计算属性
    isLoggedIn,
    userInfo,
    userRole,
    userPermissions,
    userVillages,
    hasPermission,
    canAccessVillage,
    
    // 方法
    login,
    logout,
    clearUserData,
    refreshAccessToken,
    restoreUserSession,
    getUserProfile,
    updateUserProfile,
    changePassword,
    switchVillage,
    recordPageVisit,
    getVisitHistory,
    updatePreferences,
    restorePreferences,
    checkPermission,
    hasAnyPermission,
    hasAllPermissions,
    getAccessibleMenus,
    resetState
  };
});