/**
 * 网络请求封装
 * 支持离线缓存、重试机制、错误处理
 */

const app = getApp();

class Request {
  constructor() {
    this.baseURL = app.globalData.apiConfig.baseURL;
    this.timeout = app.globalData.apiConfig.timeout;
    this.interceptors = {
      request: [],
      response: []
    };
  }

  /**
   * 发起请求
   */
  request(options = {}) {
    return new Promise((resolve, reject) => {
      // 合并默认配置
      const config = {
        url: '',
        method: 'GET',
        data: {},
        header: {},
        timeout: this.timeout,
        enableCache: false,
        cacheTime: 5 * 60 * 1000, // 5分钟
        retry: 3,
        retryDelay: 1000,
        ...options
      };

      // 检查离线缓存
      if (config.enableCache && app.globalData.networkStatus === 'offline') {
        const cachedData = this.getCache(config);
        if (cachedData) {
          resolve(cachedData);
          return;
        }
      }

      // 添加认证头
      if (!config.header['Authorization']) {
        const token = wx.getStorageSync('auth_token');
        if (token) {
          config.header['Authorization'] = `Bearer ${token}`;
        }
      }

      // 添加设备信息
      config.header['X-Platform'] = 'miniprogram';
      config.header['X-Device-ID'] = this.getDeviceId();
      config.header['X-App-Version'] = this.getAppVersion();

      // 执行请求拦截器
      this.executeRequestInterceptors(config);

      // 发起请求
      this.doRequest(config, 0)
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * 执行实际请求
   */
  doRequest(config, retryCount) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.baseURL}${config.url}`,
        method: config.method,
        data: config.data,
        header: config.header,
        timeout: config.timeout,
        success: (res) => {
          // 执行响应拦截器
          const processedResponse = this.executeResponseInterceptors(res);

          if (processedResponse.statusCode >= 200 && processedResponse.statusCode < 300) {
            // 请求成功
            if (config.enableCache) {
              this.setCache(config, processedResponse.data);
            }
            resolve(processedResponse.data);
          } else {
            // 请求失败
            this.handleRequestError(config, processedResponse, retryCount, resolve, reject);
          }
        },
        fail: (error) => {
          // 网络错误
          this.handleNetworkError(config, error, retryCount, resolve, reject);
        }
      });
    });
  }

  /**
   * 处理请求错误
   */
  handleRequestError(config, response, retryCount, resolve, reject) {
    if (response.statusCode === 401) {
      // Token过期
      this.refreshToken()
        .then(() => {
          // 重新发送请求
          this.doRequest(config, 0).then(resolve).catch(reject);
        })
        .catch(() => {
          // Token刷新失败，清除登录状态
          app.logout();
          reject({ message: '登录已过期，请重新登录', code: 401 });
        });
    } else if (response.statusCode === 429) {
      // 请求频率限制
      wx.showToast({
        title: '请求过于频繁，请稍后重试',
        icon: 'none'
      });
      reject({ message: '请求过于频繁', code: 429 });
    } else if (response.statusCode >= 500) {
      // 服务器错误
      this.handleServerError(config, response, retryCount, resolve, reject);
    } else {
      // 其他错误
      const message = response.data?.message || '请求失败';
      reject({ message, code: response.statusCode, data: response.data });
    }
  }

  /**
   * 处理网络错误
   */
  handleNetworkError(config, error, retryCount, resolve, reject) {
    if (app.globalData.networkStatus === 'offline') {
      // 离线状态，保存请求到离线队列
      this.saveOfflineRequest(config);
      reject({ message: '网络连接已断开，请求已保存', code: 'NETWORK_OFFLINE' });
    } else if (retryCount < config.retry) {
      // 重试
      setTimeout(() => {
        this.doRequest(config, retryCount + 1).then(resolve).catch(reject);
      }, config.retryDelay * Math.pow(2, retryCount));
    } else {
      // 重试失败
      reject({ message: '网络请求失败，请检查网络连接', code: 'NETWORK_ERROR' });
    }
  }

  /**
   * 处理服务器错误
   */
  handleServerError(config, response, retryCount, resolve, reject) {
    if (retryCount < config.retry) {
      // 服务器错误时重试
      setTimeout(() => {
        this.doRequest(config, retryCount + 1).then(resolve).catch(reject);
      }, config.retryDelay * Math.pow(2, retryCount));
    } else {
      // 重试失败，显示错误信息
      wx.showToast({
        title: '服务器暂时无法响应，请稍后重试',
        icon: 'none'
      });
      reject({ message: '服务器错误', code: response.statusCode });
    }
  }

  /**
   * 刷新Token
   */
  refreshToken() {
    return new Promise((resolve, reject) => {
      const refreshToken = wx.getStorageSync('refresh_token');
      if (!refreshToken) {
        reject(new Error('无刷新Token'));
        return;
      }

      wx.request({
        url: `${this.baseURL}/auth/refresh`,
        method: 'POST',
        data: { refreshToken },
        success: (res) => {
          if (res.data.success) {
            const { token } = res.data.data;
            wx.setStorageSync('auth_token', token);
            resolve(token);
          } else {
            reject(new Error('Token刷新失败'));
          }
        },
        fail: reject
      });
    });
  }

  /**
   * 获取缓存
   */
  getCache(config) {
    try {
      const cacheKey = this.getCacheKey(config);
      const cached = wx.getStorageSync(cacheKey);

      if (cached && cached.expireTime > Date.now()) {
        return cached.data;
      } else if (cached) {
        // 缓存过期，删除
        wx.removeStorageSync(cacheKey);
      }
    } catch (error) {
      console.error('获取缓存失败:', error);
    }

    return null;
  }

  /**
   * 设置缓存
   */
  setCache(config, data) {
    try {
      const cacheKey = this.getCacheKey(config);
      const cacheData = {
        data: data,
        expireTime: Date.now() + config.cacheTime,
        timestamp: Date.now()
      };

      wx.setStorageSync(cacheKey, cacheData);
    } catch (error) {
      console.error('设置缓存失败:', error);
    }
  }

  /**
   * 获取缓存键
   */
  getCacheKey(config) {
    const params = JSON.stringify(config.data || {});
    return `cache_${config.method}_${config.url}_${this.hashString(params)}`;
  }

  /**
   * 字符串哈希
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 保存离线请求
   */
  saveOfflineRequest(config) {
    try {
      const offlineRequests = wx.getStorageSync('offline_requests') || [];
      const request = {
        url: config.url,
        method: config.method,
        data: config.data,
        header: config.header,
        timestamp: Date.now(),
        id: this.generateRequestId()
      };

      offlineRequests.push(request);

      // 限制离线请求数量
      if (offlineRequests.length > 100) {
        offlineRequests.shift();
      }

      wx.setStorageSync('offline_requests', offlineRequests);
    } catch (error) {
      console.error('保存离线请求失败:', error);
    }
  }

  /**
   * 生成请求ID
   */
  generateRequestId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 获取设备ID
   */
  getDeviceId() {
    let deviceId = wx.getStorageSync('device_id');
    if (!deviceId) {
      deviceId = `mp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      wx.setStorageSync('device_id', deviceId);
    }
    return deviceId;
  }

  /**
   * 获取应用版本
   */
  getAppVersion() {
    try {
      const accountInfo = wx.getAccountInfoSync();
      return accountInfo.miniProgram.version || '1.0.0';
    } catch (error) {
      return '1.0.0';
    }
  }

  /**
   * 执行请求拦截器
   */
  executeRequestInterceptors(config) {
    this.interceptors.request.forEach(interceptor => {
      try {
        if (typeof interceptor === 'function') {
          interceptor(config);
        }
      } catch (error) {
        console.error('请求拦截器执行失败:', error);
      }
    });
  }

  /**
   * 执行响应拦截器
   */
  executeResponseInterceptors(response) {
    this.interceptors.response.forEach(interceptor => {
      try {
        if (typeof interceptor === 'function') {
          response = interceptor(response) || response;
        }
      } catch (error) {
        console.error('响应拦截器执行失败:', error);
      }
    });
    return response;
  }

  /**
   * 添加请求拦截器
   */
  addRequestInterceptor(interceptor) {
    this.interceptors.request.push(interceptor);
  }

  /**
   * 添加响应拦截器
   */
  addResponseInterceptor(interceptor) {
    this.interceptors.response.push(interceptor);
  }

  /**
   * GET请求
   */
  get(url, params = {}, options = {}) {
    return this.request({
      url,
      method: 'GET',
      data: params,
      ...options
    });
  }

  /**
   * POST请求
   */
  post(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'POST',
      data,
      ...options
    });
  }

  /**
   * PUT请求
   */
  put(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'PUT',
      data,
      ...options
    });
  }

  /**
   * DELETE请求
   */
  delete(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'DELETE',
      data,
      ...options
    });
  }

  /**
   * 文件上传
   */
  upload(url, filePath, formData = {}, options = {}) {
    return new Promise((resolve, reject) => {
      const token = wx.getStorageSync('auth_token');

      wx.uploadFile({
        url: `${this.baseURL}${url}`,
        filePath: filePath,
        name: 'file',
        formData: formData,
        header: {
          'Authorization': token ? `Bearer ${token}` : '',
          'X-Platform': 'miniprogram',
          'X-Device-ID': this.getDeviceId()
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(data);
            } else {
              reject({ message: data.message || '上传失败', code: res.statusCode });
            }
          } catch (error) {
            reject({ message: '响应解析失败', code: 'PARSE_ERROR' });
          }
        },
        fail: reject
      });
    });
  }

  /**
   * 文件下载
   */
  download(url, options = {}) {
    return new Promise((resolve, reject) => {
      const token = wx.getStorageSync('auth_token');

      wx.downloadFile({
        url: `${this.baseURL}${url}`,
        header: {
          'Authorization': token ? `Bearer ${token}` : '',
          'X-Platform': 'miniprogram'
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.tempFilePath);
          } else {
            reject({ message: '下载失败', code: res.statusCode });
          }
        },
        fail: reject
      });
    });
  }
}

// 创建实例
const request = new Request();

// 添加默认拦截器
request.addRequestInterceptor((config) => {
  // 添加请求时间戳
  config.header['X-Request-Time'] = Date.now();
  console.log(`发起请求: ${config.method} ${config.url}`);
});

request.addResponseInterceptor((response) => {
  const requestTime = response.header['X-Request-Time'] || Date.now();
  const responseTime = Date.now() - parseInt(requestTime);
  console.log(`请求完成: ${response.statusCode} - ${responseTime}ms`);
  return response;
});

module.exports = request;