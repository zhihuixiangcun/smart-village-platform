/**
 * 智慧乡村综合服务平台 - 微信小程序
 * 跨端兼容的移动端应用
 */

App({
  globalData: {
    userInfo: null,
    villageInfo: null,
    systemInfo: null,
    apiBaseUrl: 'https://api.smartvillage.com',
    isOnline: true,
    pendingRequests: [],
    version: '1.0.0',
    networkStatus: 'online',
    dialectConfig: {
      enabled: true,
      type: 'mandarin', // mandarin, cantonese, hokkien, etc.
      recognitionEngine: 'baidu',
      synthesisEngine: 'tencent'
    },
    offlineCache: {
      enabled: true,
      maxSize: 50 * 1024 * 1024, // 50MB
      expireTime: 7 * 24 * 60 * 60 * 1000 // 7天
    }
  },

  onLaunch: function (options) {
    console.log('智慧乡村小程序启动', options);

    // 获取系统信息
    this.getSystemInfo();

    // 检查网络状态
    this.checkNetworkStatus();

    // 初始化用户信息
    this.initUserInfo();

    // 检查更新
    this.checkForUpdates();

    // 初始化离线存储
    this.initOfflineStorage();

    // 初始化语音配置
    this.initVoiceConfig();

    // 获取场景信息
    this.handleScene(options.scene);
  },

  onShow: function (options) {
    console.log('小程序显示', options);

    // 应用显示时检查网络状态
    this.checkNetworkStatus();

    // 同步离线数据
    if (this.globalData.isOnline) {
      this.syncOfflineData();
    }

    // 检查登录状态
    this.checkLoginStatus();
  },

  onHide: function () {
    console.log('小程序隐藏');

    // 应用隐藏时保存数据
    this.saveCurrentState();
  },

  onError: function (msg) {
    console.error('小程序错误:', msg);

    // 错误上报
    this.reportError(msg);
  },

  onPageNotFound: function (res) {
    console.error('页面不存在:', res);

    // 重定向到首页
    wx.redirectTo({
      url: '/pages/index/index'
    });
  },

  /**
   * 获取系统信息
   */
  getSystemInfo: function () {
    try {
      const systemInfo = wx.getSystemInfoSync();
      this.globalData.systemInfo = systemInfo;

      // 设置状态栏高度
      this.globalData.statusBarHeight = systemInfo.statusBarHeight;

      // 设置自定义导航栏高度（仅在小程序中使用）
      if (systemInfo.platform === 'devtools') {
        this.globalData.navBarHeight = 44;
      } else {
        // 根据不同系统设置导航栏高度
        this.globalData.navBarHeight = systemInfo.system.includes('iOS') ? 44 : 48;
      }

      // 设置语音配置
      if (systemInfo.platform === 'ios') {
        this.globalData.dialectConfig.synthesisEngine = 'tencent';
      } else {
        this.globalData.dialectConfig.synthesisEngine = 'baidu';
      }

      console.log('系统信息:', systemInfo);
    } catch (error) {
      console.error('获取系统信息失败:', error);
    }
  },

  /**
   * 检查网络状态
   */
  checkNetworkStatus: function () {
    wx.getNetworkType({
      success: (res) => {
        const isConnected = res.networkType !== 'none';
        const wasOnline = this.globalData.isOnline;
        this.globalData.isOnline = isConnected;
        this.globalData.networkStatus = isConnected ? 'online' : 'offline';

        if (!wasOnline && isConnected) {
          // 从离线切换到在线
          this.onNetworkConnected();
        } else if (wasOnline && !isConnected) {
          // 从在线切换到离线
          this.onNetworkDisconnected();
        }

        console.log('网络状态:', isConnected ? '在线' : '离线');
      },
      fail: (error) => {
        console.error('获取网络状态失败:', error);
        this.globalData.isOnline = false;
        this.globalData.networkStatus = 'offline';
      }
    });

    // 监听网络状态变化
    wx.onNetworkStatusChange((res) => {
      const isConnected = res.isConnected;
      const wasOnline = this.globalData.isOnline;
      this.globalData.isOnline = isConnected;
      this.globalData.networkStatus = isConnected ? 'online' : 'offline';

      if (!wasOnline && isConnected) {
        this.onNetworkConnected();
      } else if (wasOnline && !isConnected) {
        this.onNetworkDisconnected();
      }

      console.log('网络状态变化:', isConnected ? '在线' : '离线');
    });
  },

  /**
   * 网络连接时的处理
   */
  onNetworkConnected: function () {
    // 显示连接成功提示
    wx.showToast({
      title: '网络已连接',
      icon: 'success',
      duration: 1500
    });

    // 同步离线数据
    this.syncOfflineData();

    // 重新发送失败的请求
    this.retryPendingRequests();
  },

  /**
   * 网络断开时的处理
   */
  onNetworkDisconnected: function () {
    // 显示断网提示
    wx.showToast({
      title: '网络连接已断开',
      icon: 'none',
      duration: 2000
    });
  },

  /**
   * 初始化用户信息
   */
  initUserInfo: function () {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = JSON.parse(userInfo);
    }

    // 检查登录状态
    this.checkLoginStatus();
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus: function () {
    try {
      const token = wx.getStorageSync('auth_token');
      const userInfo = wx.getStorageSync('user_info');

      if (token && userInfo) {
        this.globalData.userInfo = JSON.parse(userInfo);

        // 验证token有效性
        this.validateToken(token);
      } else {
        // 未登录，跳转到登录页
        this.redirectToLogin();
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      this.redirectToLogin();
    }
  },

  /**
   * 验证token
   */
  validateToken: function (token) {
    wx.request({
      url: `${this.globalData.apiBaseUrl}/api/auth/validate`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        if (res.data.success) {
          // token有效，更新用户信息
          this.globalData.userInfo = res.data.data;
          wx.setStorageSync('user_info', JSON.stringify(res.data.data));
        } else {
          // token无效，重新登录
          this.redirectToLogin();
        }
      },
      fail: (error) => {
        console.error('验证token失败:', error);
        if (!this.globalData.isOnline) {
          // 离线状态下使用本地数据
          console.log('离线状态，使用本地用户信息');
        } else {
          this.redirectToLogin();
        }
      }
    });
  },

  /**
   * 跳转到登录页
   */
  redirectToLogin: function () {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];

    if (currentPage && currentPage.route !== 'pages/login/login') {
      wx.redirectTo({
        url: '/pages/login/login'
      });
    }
  },

  /**
   * 登出
   */
  logout: function () {
    wx.removeStorageSync('auth_token');
    wx.removeStorageSync('user_info');
    wx.removeStorageSync('village_info');
    this.globalData.userInfo = null;
    this.globalData.villageInfo = null;
  },

  /**
   * 检查应用更新
   */
  checkForUpdates: function () {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();

      updateManager.onCheckForUpdate((res) => {
        console.log('检查更新结果:', res.hasUpdate);
      });

      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate();
            }
          }
        });
      });

      updateManager.onUpdateFailed(() => {
        wx.showModal({
          title: '更新失败',
          content: '新版本下载失败，请检查网络后重试',
          showCancel: false
        });
      });
    }
  },

  /**
   * 初始化离线存储
   */
  initOfflineStorage: function () {
    try {
      // 检查存储空间
      wx.getStorageInfo({
        success: (res) => {
          console.log('存储信息:', res);

          // 清理过期数据
          this.cleanExpiredData();
        },
        fail: (error) => {
          console.error('获取存储信息失败:', error);
        }
      });
    } catch (error) {
      console.error('初始化离线存储失败:', error);
    }
  },

  /**
   * 清理过期数据
   */
  cleanExpiredData: function () {
    try {
      const now = Date.now();
      const keys = wx.getStorageInfoSync().keys;

      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          try {
            const data = wx.getStorageSync(key);
            if (data && data.expireTime && now > data.expireTime) {
              wx.removeStorageSync(key);
              console.log('清理过期缓存:', key);
            }
          } catch (error) {
            // 清理损坏的缓存
            wx.removeStorageSync(key);
          }
        }
      });
    } catch (error) {
      console.error('清理缓存失败:', error);
    }
  },

  /**
   * 处理场景信息
   */
  handleScene: function (scene) {
    console.log('场景值:', scene);

    // 场景值处理
    switch (scene) {
      case 1047: // 扫描小程序码
        console.log('通过扫码进入');
        break;
      case 1001: // 发现栏小程序主入口
        console.log('通过发现栏进入');
        break;
      case 1007: // 单聊会话中的小程序消息卡片
        console.log('通过会话消息进入');
        break;
      case 1036: // App分享消息卡片
        console.log('通过App分享进入');
        break;
      default:
        console.log('其他场景进入');
    }
  },

  /**
   * 初始化语音配置
   */
  initVoiceConfig: function () {
    try {
      // 获取用户方言偏好
      const dialectType = wx.getStorageSync('user_dialect_type');
      if (dialectType) {
        this.globalData.dialectConfig.type = dialectType;
      }

      // 检查语音权限
      wx.getSetting({
        success: (res) => {
          if (!res.authSetting['scope.record']) {
            console.log('未获取录音权限');
          }
        }
      });
    } catch (error) {
      console.error('初始化语音配置失败:', error);
    }
  },

  /**
   * 保存当前状态
   */
  saveCurrentState: function () {
    try {
      wx.setStorageSync('appState', {
        lastActiveTime: Date.now(),
        currentPage: getCurrentPages()[getCurrentPages().length - 1]?.route,
        version: this.globalData.version
      });
    } catch (error) {
      console.error('保存应用状态失败:', error);
    }
  },

  /**
   * 同步离线数据
   */
  syncOfflineData: function () {
    try {
      const offlineData = wx.getStorageSync('offline_data') || [];

      if (offlineData.length > 0) {
        console.log('开始同步离线数据:', offlineData.length);

        offlineData.forEach((data, index) => {
          this.syncSingleData(data, index);
        });
      }
    } catch (error) {
      console.error('同步离线数据失败:', error);
    }
  },

  /**
   * 同步单条数据
   */
  syncSingleData: function (data, index) {
    wx.request({
      url: `${this.globalData.apiBaseUrl}${data.url}`,
      method: data.method,
      data: data.data,
      header: data.header,
      success: (res) => {
        if (res.data.success) {
          // 同步成功，从离线数据中移除
          const offlineData = wx.getStorageSync('offline_data') || [];
          offlineData.splice(index, 1);
          wx.setStorageSync('offline_data', offlineData);
          console.log('数据同步成功:', data.url);
        }
      },
      fail: (error) => {
        console.error('数据同步失败:', data.url, error);
      }
    });
  },

  /**
   * 重试待处理的请求
   */
  retryPendingRequests: function () {
    const pendingRequests = this.globalData.pendingRequests;

    if (pendingRequests.length === 0) {
      return;
    }

    console.log(`重试 ${pendingRequests.length} 个待处理请求`);

    pendingRequests.forEach((request, index) => {
      wx.request({
        ...request,
        success: (res) => {
          console.log(`请求重试成功: ${request.url}`);
        },
        fail: (error) => {
          console.error(`请求重试失败: ${request.url}`, error);
        },
        complete: () => {
          // 从待处理列表中移除
          pendingRequests.splice(index, 1);
        }
      });
    });
  },

  /**
   * 统一的网络请求方法
   */
  request: function (options) {
    return new Promise((resolve, reject) => {
      const defaultOptions = {
        header: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      };

      // 添加认证头
      const token = wx.getStorageSync('auth_token');
      if (token) {
        defaultOptions.header['Authorization'] = `Bearer ${token}`;
      }

      const requestOptions = Object.assign({}, defaultOptions, options);

      if (this.globalData.isOnline) {
        // 在线状态，直接发送请求
        wx.request({
          ...requestOptions,
          success: (res) => {
            resolve(res);
          },
          fail: (error) => {
            // 请求失败，添加到待处理列表
            this.globalData.pendingRequests.push(requestOptions);
            reject(error);
          }
        });
      } else {
        // 离线状态，保存到离线数据
        if (options.method !== 'GET') {
          // 只有非GET请求才需要离线保存
          const offlineData = wx.getStorageSync('offline_data') || [];
          offlineData.push({
            url: options.url,
            method: options.method,
            data: options.data,
            header: requestOptions.header,
            timestamp: Date.now()
          });
          wx.setStorageSync('offline_data', offlineData);
        }

        // 返回离线响应
        resolve({
          data: {
            success: false,
            message: '网络连接已断开，数据已保存到本地'
          }
        });
      }
    });
  },

  /**
   * 错误上报
   */
  reportError: function (msg) {
    // 收集错误信息
    const errorInfo = {
      message: msg,
      timestamp: Date.now(),
      systemInfo: this.globalData.systemInfo,
      userInfo: this.globalData.userInfo,
      page: getCurrentPages().pop()?.route || 'unknown'
    };

    // 网络可用时上报
    if (this.globalData.isOnline) {
      wx.request({
        url: `${this.globalData.apiBaseUrl}/log/error`,
        method: 'POST',
        data: errorInfo,
        fail: () => {
          // 上报失败，保存到本地
          const errorLogs = wx.getStorageSync('error_logs') || [];
          errorLogs.push(errorInfo);
          wx.setStorageSync('error_logs', errorLogs);
        }
      });
    } else {
      // 离线时保存到本地
      const errorLogs = wx.getStorageSync('error_logs') || [];
      errorLogs.push(errorInfo);
      wx.setStorageSync('error_logs', errorLogs);
    }
  },

  /**
   * 显示错误提示
   */
  showError: function (message, duration = 2000) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: duration
    });
  },

  /**
   * 显示成功提示
   */
  showSuccess: function (message, duration = 1500) {
    wx.showToast({
      title: message,
      icon: 'success',
      duration: duration
    });
  },

  /**
   * 显示加载提示
   */
  showLoading: function (title = '加载中...') {
    wx.showLoading({
      title: title,
      mask: true
    });
  },

  /**
   * 隐藏加载提示
   */
  hideLoading: function () {
    wx.hideLoading();
  },

  /**
   * 格式化日期
   */
  formatDate: function (date, format = 'YYYY-MM-DD') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    const second = String(d.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hour)
      .replace('mm', minute)
      .replace('ss', second);
  },

  /**
   * 格式化文件大小
   */
  formatFileSize: function (bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * 设置方言类型
   */
  setDialectType: function (type) {
    this.globalData.dialectConfig.type = type;
    wx.setStorageSync('user_dialect_type', type);
  },

  /**
   * 获取方言类型
   */
  getDialectType: function () {
    return this.globalData.dialectConfig.type;
  }
});