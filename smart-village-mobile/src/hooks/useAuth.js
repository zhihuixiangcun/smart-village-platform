/**
 * 认证状态管理Hook
 * 处理用户登录、角色验证、权限管理等
 */

import { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/auth';

// 认证状态reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };

    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };

    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false
      };

    case 'UPDATE_USER':
      return {
        ...state,
        user: {
          ...state.user,
          ...action.payload
        }
      };

    case 'SET_TOKEN':
      return {
        ...state,
        token: action.payload
      };

    default:
      return state;
  }
};

// 初始状态
const initialState = {
  isLoading: true,
  isAuthenticated: false,
  user: null,
  token: null,
  error: null
};

// 创建认证上下文
const AuthContext = createContext();

// 认证Provider组件
const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 初始化时检查本地存储的认证信息
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('authUser');

      if (storedToken && storedUser) {
        const user = JSON.parse(storedUser);

        // 验证token是否有效
        try {
          const response = await authApi.validateToken(storedToken);
          if (response.success) {
            dispatch({ type: 'SET_USER', payload: user });
            dispatch({ type: 'SET_TOKEN', payload: storedToken });
          } else {
            // Token无效，清除本地存储
            await AsyncStorage.multiRemove(['authToken', 'authUser']);
            dispatch({ type: 'LOGOUT' });
          }
        } catch (error) {
          console.error('Token验证失败:', error);
          await AsyncStorage.multiRemove(['authToken', 'authUser']);
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch (error) {
      console.error('初始化认证失败:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_ERROR', payload: '初始化认证失败' });
    }
  };

  // 登录
  const login = async (credentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const response = await authApi.login(credentials);

      if (response.success) {
        const { user, token, permissions } = response.data;

        // 保存到本地存储
        await AsyncStorage.multiSet([
          ['authToken', token],
          ['authUser', JSON.stringify(user)],
          ['authPermissions', JSON.stringify(permissions)]
        ]);

        // 设置axios默认token
        setAuthToken(token);

        dispatch({ type: 'SET_USER', payload: user });
        dispatch({ type: 'SET_TOKEN', payload: token });

        return { success: true, user, token };
      } else {
        throw new Error(response.message || '登录失败');
      }
    } catch (error) {
      console.error('登录失败:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      return { success: false, error: error.message };
    }
  };

  // 注册
  const register = async (userData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const response = await authApi.register(userData);

      if (response.success) {
        return { success: true, message: response.message };
      } else {
        throw new Error(response.message || '注册失败');
      }
    } catch (error) {
      console.error('注册失败:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      return { success: false, error: error.message };
    }
  };

  // 登出
  const logout = async () => {
    try {
      // 调用API登出
      if (state.token) {
        try {
          await authApi.logout(state.token);
        } catch (error) {
          console.error('API登出失败:', error);
        }
      }

      // 清除本地存储
      await AsyncStorage.multiRemove([
        'authToken',
        'authUser',
        'authPermissions',
        'biometricEnabled'
      ]);

      // 清除axios默认token
      setAuthToken(null);

      dispatch({ type: 'LOGOUT' });

      return { success: true };
    } catch (error) {
      console.error('登出失败:', error);
      // 即使API登出失败，也要清除本地状态
      await AsyncStorage.multiRemove(['authToken', 'authUser']);
      setAuthToken(null);
      dispatch({ type: 'LOGOUT' });
      return { success: false, error: error.message };
    }
  };

  // 更新用户信息
  const updateUser = async (userData) => {
    try {
      const response = await authApi.updateProfile(state.token, userData);

      if (response.success) {
        const updatedUser = { ...state.user, ...response.data.user };

        // 更新本地存储
        await AsyncStorage.setItem('authUser', JSON.stringify(updatedUser));

        dispatch({ type: 'UPDATE_USER', payload: response.data.user });

        return { success: true, user: updatedUser };
      } else {
        throw new Error(response.message || '更新用户信息失败');
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
      return { success: false, error: error.message };
    }
  };

  // 修改密码
  const changePassword = async (passwordData) => {
    try {
      const response = await authApi.changePassword(state.token, passwordData);

      if (response.success) {
        return { success: true, message: '密码修改成功' };
      } else {
        throw new Error(response.message || '密码修改失败');
      }
    } catch (error) {
      console.error('修改密码失败:', error);
      return { success: false, error: error.message };
    }
  };

  // 生物识别认证
  const enableBiometric = async () => {
    try {
      await AsyncStorage.setItem('biometricEnabled', 'true');
      return { success: true };
    } catch (error) {
      console.error('启用生物识别失败:', error);
      return { success: false, error: error.message };
    }
  };

  // 禁用生物识别认证
  const disableBiometric = async () => {
    try {
      await AsyncStorage.removeItem('biometricEnabled');
      return { success: true };
    } catch (error) {
      console.error('禁用生物识别失败:', error);
      return { success: false, error: error.message };
    }
  };

  // 忘记登录
  const enableRememberMe = async () => {
    try {
      if (state.token && state.user) {
        await AsyncStorage.setItem('rememberMe', 'true');
        await AsyncStorage.setItem('rememberedUser', JSON.stringify({
          phone: state.user.phone,
          password: '', // 实际应用中应该加密存储
          timestamp: Date.now()
        }));
      }
      return { success: true };
    } catch (error) {
      console.error('启用记住登录失败:', error);
      return { success: false, error: error.message };
    }
  };

  // 忘记登录检测
  const checkRememberedUser = async () => {
    try {
      const rememberedUser = await AsyncStorage.getItem('rememberedUser');
      const rememberMe = await AsyncStorage.getItem('rememberMe');

      if (rememberMe === 'true' && rememberedUser) {
        const userData = JSON.parse(rememberedUser);
        const isExpired = Date.now() - userData.timestamp > 7 * 24 * 60 * 60 * 1000; // 7天

        if (!isExpired) {
          return userData;
        } else {
          await AsyncStorage.multiRemove(['rememberMe', 'rememberedUser']);
          return null;
        }
      }
      return null;
    } catch (error) {
      console.error('检查记住登录失败:', error);
      return null;
    }
  };

  // 权限检查
  const hasPermission = (permission) => {
    if (!state.user) return false;

    // 村民基础权限
    if (state.user.role === 'villager') {
      const villagerPermissions = [
        'view_announcements',
        'view_services',
        'submit_requests',
        'view_profile',
        'edit_profile'
      ];
      return villagerPermissions.includes(permission);
    }

    // 村委权限
    if (['village_admin', 'village_secretary', 'accountant', 'population_director'].includes(state.user.role)) {
      const committeePermissions = [
        'manage_announcements',
        'approve_requests',
        'manage_residents',
        'view_finances',
        'manage_tasks',
        'handle_emergencies'
      ];
      return committeePermissions.includes(permission);
    }

    // 管理员权限
    if (['super_admin', 'department_head', 'auditor'].includes(state.user.role)) {
      return true; // 管理员拥有所有权限
    }

    return false;
  };

  // 角色检查
  const hasRole = (role) => {
    return state.user?.role === role;
  };

  // 角色组检查
  const hasAnyRole = (roles) => {
    return roles.includes(state.user?.role);
  };

  // 检查是否为特定村民
  const isSpecificVillager = (villageId) => {
    return state.user?.role === 'villager' && state.user?.villageId === villageId;
  };

  // 获取村庄信息
  const getVillageInfo = () => {
    return {
      id: state.user?.villageId,
      name: state.user?.villageName,
      code: state.user?.villageCode
    };
  };

  // 设置认证token
  const setAuthToken = (token) => {
    // 这里需要设置axios的默认Authorization头
    if (token) {
      // axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      // delete axios.defaults.headers.common['Authorization'];
    }
  };

  const value = {
    ...state,
    // 方法
    login,
    register,
    logout,
    updateUser,
    changePassword,
    enableBiometric,
    disableBiometric,
    enableRememberMe,
    checkRememberedUser,
    // 检查方法
    hasPermission,
    hasRole,
    hasAnyRole,
    isSpecificVillager,
    getVillageInfo
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// 使用认证Hook的Hook
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 角色权限Hook
const usePermission = (permission) => {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
};

// 角色检查Hook
const useRole = (role) => {
  const { hasRole } = useAuth();
  return hasRole(role);
};

// 权限高阶组件
const withPermission = (permission) => (WrappedComponent) => {
  return (props) => {
    const { hasPermission, user } = useAuth();

    if (!user || !hasPermission(permission)) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Icon name="block" size={48} color={colors.error} />
          <Text style={{ marginTop: 16, color: colors.text }}>
            您没有访问此页面的权限
          </Text>
        </View>
      );
    }

    return <WrappedComponent {...props} />;
  };
};

// 角色高阶组件
const withRole = (allowedRoles) => (WrappedComponent) => {
  return (props) => {
    const { user, hasAnyRole } = useAuth();

    if (!user || !hasAnyRole(allowedRoles)) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Icon name="block" size={48} color={colors.error} />
          <Text style={{ marginTop: 16, color: colors.text }}>
            您没有访问此页面的角色权限
          </Text>
        </View>
      );
    }

    return <WrappedComponent {...props} />;
  };
};

export {
  AuthProvider,
  AuthContext,
  useAuth,
  usePermission,
  useRole,
  withPermission,
  withRole
};

export default useAuth;