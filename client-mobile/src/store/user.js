import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * 用户Store
 * 管理用户登录状态、用户信息、权限等
 */
export const useUserStore = defineStore('user', () => {
  // ===== 状态 =====

  // 用户信息
  const userInfo = ref(null);

  // 用户信息别名（便于访问）
  const user = computed(() => userInfo.value);

  // 访问令牌
  const accessToken = ref('');

  // 刷新令牌
  const refreshToken = ref('');

  // 登录状态
  const isLoggedIn = computed(() => !!accessToken.value && !!userInfo.value);

  // 用户角色
  const userRole = computed(() => userInfo.value?.role || 'villager');

  // 是否为村干部
  const isOfficial = computed(() => {
    return ['admin', 'official', 'cadre'].includes(userRole.value);
  });

  // 村民ID
  const villagerId = computed(() => userInfo.value?.villagerId);

  // 所属村庄ID
  const villageId = computed(() => userInfo.value?.villageId);

  // 一户一码
  const householdQR = computed(() => userInfo.value?.householdQR);

  // ===== 方法 =====

  /**
   * 初始化 - 检查本地存储的登录状态
   */
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const refresh = localStorage.getItem('refresh_token');
      const userStr = localStorage.getItem('user_info');

      if (token && userStr) {
        accessToken.value = token;
        refreshToken.value = refresh;
        userInfo.value = JSON.parse(userStr);

        console.log('用户已登录:', userInfo.value.name);

        // TODO: 验证token是否有效
        // await validateToken()
      } else {
        console.log('未找到登录信息');
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
    }
  };

  /**
   * 用户登录（简化版，仅做本地模拟）
   */
  const login = async (credentials) => {
    try {
      // 模拟登录成功
      const mockUser = {
        id: '1',
        name: '张大山',
        phone: credentials.phone,
        villageName: '东村',
        villageId: 'village_001',
        villagerId: 'villager_001',
        role: credentials.role || 'villager',
        verified: true,
        avatar: '',
        points: 126
      };

      const mockAccessToken = `mock_access_token_${  Date.now()}`;
      const mockRefreshToken = `mock_refresh_token_${  Date.now()}`;

      // 保存到状态
      accessToken.value = mockAccessToken;
      refreshToken.value = mockRefreshToken;
      userInfo.value = mockUser;

      // 保存到本地存储
      localStorage.setItem('access_token', mockAccessToken);
      localStorage.setItem('refresh_token', mockRefreshToken);
      localStorage.setItem('user_info', JSON.stringify(mockUser));

      console.log('登录成功:', mockUser.name);

      return { success: true };
    } catch (error) {
      console.error('登录失败:', error);
      return { success: false, message: error.message };
    }
  };

  /**
   * 用户登出
   */
  const logout = async () => {
    // 清除状态
    userInfo.value = null;
    accessToken.value = '';
    refreshToken.value = '';

    // 清除本地存储
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');

    // 清除其他缓存
    clearAllUserData();

    console.log('用户已登出');

    // 使用window.location跳转到登录页
    window.location.href = '/auth/login';
  };

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
    ];

    keys.forEach(key => {
      localStorage.removeItem(key);
    });
  };

  /**
   * 更新用户信息
   */
  const updateUserInfo = async (data) => {
    try {
      userInfo.value = {
        ...userInfo.value,
        ...data
      };

      // 保存到本地存储
      localStorage.setItem('user_info', JSON.stringify(userInfo.value));

      return { success: true };
    } catch (error) {
      console.error('更新用户信息失败:', error);
      return { success: false, message: error.message };
    }
  };

  /**
   * 更新个人资料
   */
  const updateProfile = async (profileData) => {
    try {
      // 更新用户信息
      userInfo.value = {
        ...userInfo.value,
        ...profileData
      };

      // 保存到本地存储
      localStorage.setItem('user_info', JSON.stringify(userInfo.value));

      return { success: true };
    } catch (error) {
      console.error('更新个人资料失败:', error);
      return { success: false, message: error.message };
    }
  };

  /**
   * 上传头像
   */
  const uploadAvatar = async (filePath) => {
    try {
      // 模拟上传成功
      userInfo.value.avatar = filePath;
      localStorage.setItem('user_info', JSON.stringify(userInfo.value));

      return { success: true, url: filePath };
    } catch (error) {
      console.error('上传头像失败:', error);
      return { success: false, message: error.message };
    }
  };

  /**
   * 修改密码
   */
  const changePassword = async (oldPassword, newPassword) => {
    try {
      // 模拟修改成功
      console.log('密码修改成功');
 
      // 延迟后登出
      setTimeout(() => {
        logout();
      },2000);
 
      return { success: true };
    } catch (error) {
      console.error('修改密码失败:', error);
      return { success: false, message: error.message };
    }
  };

  /**
   * 账号密码登录
   */
  const passwordLogin = async ({ account, password, role }) => {
    try {
      // 模拟API调用
      console.log('账号密码登录:', { account, role });
      
      // 模拟验证
      if (!account || !password) {
        throw new Error('账号或密码不能为空');
      }
      
      // 模拟登录成功
      const mockUser = {
        id: '1',
        name: '张大山',
        account,
        phone: '13800138000',
        villageName: '东村',
        villageId: 'village_001',
        villagerId: 'villager_001',
        role: role || 'villager',
        verified: true,
        avatar: '',
        points: 126
      };
      
      const mockAccessToken = `mock_access_token_${Date.now()}`;
      const mockRefreshToken = `mock_refresh_token_${Date.now()}`;
      
      // 保存到状态
      accessToken.value = mockAccessToken;
      refreshToken.value = mockRefreshToken;
      userInfo.value = mockUser;
      
      // 保存到本地存储
      localStorage.setItem('access_token', mockAccessToken);
      localStorage.setItem('refresh_token', mockRefreshToken);
      localStorage.setItem('user_info', JSON.stringify(mockUser));
      
      console.log('账号密码登录成功:', mockUser.name);
      
      return { success: true, user: mockUser };
    } catch (error) {
      console.error('账号密码登录失败:', error);
      return { success: false, message: error.message || '登录失败，请重试' };
    }
  };

  /**
   * 验证码登录
   */
  const codeLogin = async ({ phone, code, role }) => {
    try {
      // 模拟API调用
      console.log('验证码登录:', { phone, role });
      
      // 模拟验证
      if (!phone || !code) {
        throw new Error('手机号或验证码不能为空');
      }
      
      // 模拟登录成功
      const mockUser = {
        id: '1',
        name: '张大山',
        phone,
        villageName: '东村',
        villageId: 'village_001',
        villagerId: 'villager_001',
        role: role || 'villager',
        verified: true,
        avatar: '',
        points: 126
      };
      
      const mockAccessToken = `mock_access_token_${Date.now()}`;
      const mockRefreshToken = `mock_refresh_token_${Date.now()}`;
      
      // 保存到状态
      accessToken.value = mockAccessToken;
      refreshToken.value = mockRefreshToken;
      userInfo.value = mockUser;
      
      // 保存到本地存储
      localStorage.setItem('access_token', mockAccessToken);
      localStorage.setItem('refresh_token', mockRefreshToken);
      localStorage.setItem('user_info', JSON.stringify(mockUser));
      
      console.log('验证码登录成功:', mockUser.name);
      
      return { success: true, user: mockUser };
    } catch (error) {
      console.error('验证码登录失败:', error);
      return { success: false, message: error.message || '登录失败，请重试' };
    }
  };

  /**
   * 人脸识别登录
   */
  const faceLogin = async ({ role }) => {
    try {
      // 模拟API调用
      console.log('人脸识别登录:', { role });
      
      // 模拟识别成功
      const mockUser = {
        id: '1',
        name: '张大山',
        phone: '13800138000',
        villageName: '东村',
        villageId: 'village_001',
        villagerId: 'villager_001',
        role: role || 'villager',
        verified: true,
        avatar: '',
        points: 126
      };
      
      const mockAccessToken = `mock_access_token_${Date.now()}`;
      const mockRefreshToken = `mock_refresh_token_${Date.now()}`;
      
      // 保存到状态
      accessToken.value = mockAccessToken;
      refreshToken.value = mockRefreshToken;
      userInfo.value = mockUser;
      
      // 保存到本地存储
      localStorage.setItem('access_token', mockAccessToken);
      localStorage.setItem('refresh_token', mockRefreshToken);
      localStorage.setItem('user_info', JSON.stringify(mockUser));
      
      console.log('人脸识别登录成功:', mockUser.name);
      
      return { success: true, user: mockUser };
    } catch (error) {
      console.error('人脸识别登录失败:', error);
      return { success: false, message: error.message || '人脸识别失败，请重试' };
    }
  };

  /**
   * 微信登录
   */
  const wechatLogin = async ({ role }) => {
    try {
      // 模拟API调用
      console.log('微信登录:', { role });
      
      // 模拟授权成功
      const mockUser = {
        id: '1',
        name: '张大山',
        phone: '13800138000',
        wechatOpenId: `mock_openid_${  Date.now()}`,
        villageName: '东村',
        villageId: 'village_001',
        villagerId: 'villager_001',
        role: role || 'villager',
        verified: true,
        avatar: '',
        points: 126
      };
      
      const mockAccessToken = `mock_access_token_${Date.now()}`;
      const mockRefreshToken = `mock_refresh_token_${Date.now()}`;
      
      // 保存到状态
      accessToken.value = mockAccessToken;
      refreshToken.value = mockRefreshToken;
      userInfo.value = mockUser;
      
      // 保存到本地存储
      localStorage.setItem('access_token', mockAccessToken);
      localStorage.setItem('refresh_token', mockRefreshToken);
      localStorage.setItem('user_info', JSON.stringify(mockUser));
      
      console.log('微信登录成功:', mockUser.name);
      
      return { success: true, user: mockUser };
    } catch (error) {
      console.error('微信登录失败:', error);
      return { success: false, message: error.message || '微信登录失败，请重试' };
    }
  };

  /**
   * 绑定手机号
   */
  const bindPhone = async (phone, code) => {
    try {
      userInfo.value.phone = phone;
      localStorage.setItem('user_info', JSON.stringify(userInfo.value));

      return { success: true };
    } catch (error) {
      console.error('绑定手机失败:', error);
      return { success: false, message: error.message };
    }
  };

  /**
   * 实名认证
   */
  const realNameVerify = async (realName, idCard) => {
    try {
      userInfo.value.realName = realName;
      userInfo.value.idCard = idCard;
      userInfo.value.verified = true;
      localStorage.setItem('user_info', JSON.stringify(userInfo.value));

      return { success: true };
    } catch (error) {
      console.error('实名认证失败:', error);
      return { success: false, message: error.message };
    }
  };

  /**
   * 获取用户积分
   */
  const getUserPoints = async () => {
    if (!accessToken.value) {
      return 0;
    }

    try {
      // 模拟返回积分
      return userInfo.value?.points || 126;
    } catch (error) {
      console.error('获取积分失败:', error);
      return 0;
    }
  };

  /**
   * 获取用户统计数据
   */
  const getUserStats = async () => {
    if (!accessToken.value) {
      return null;
    }

    try {
      // 模拟返回统计数据
      return {
        announcements: 12,
        services: 8,
        points: 126,
        rank: 15
      };
    } catch (error) {
      console.error('获取统计数据失败:', error);
      return null;
    }
  };

  // 返回状态和方法
  return {
    // 状态
    userInfo,
    user,  // 用户信息别名
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
    login,
    logout,
     
    // 多种登录方式
    passwordLogin,
    codeLogin,
    faceLogin,
    wechatLogin,
     
    // 用户信息
    updateUserInfo,
    updateProfile,
    fetchUserDetail: updateUserInfo,
    uploadAvatar,
    changePassword,
    bindPhone,
    realNameVerify,
     
    // 用户数据
    getUserPoints,
    getUserStats
  };
});

