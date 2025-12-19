/**
 * 智慧乡村平台 JavaScript SDK
 * 版本: 1.0.0
 * 描述: 提供智慧乡村平台API的JavaScript封装
 */

class SmartVillageSDK {
  constructor(config = {}) {
    this.baseURL = config.baseURL || 'https://api.smartvillage.com/api/v1';
    this.apiKey = config.apiKey || null;
    this.timeout = config.timeout || 30000;
    this.token = localStorage.getItem('sv_token') || null;
    this.villageId = config.villageId || null;

    // 请求拦截器
    this.requestInterceptors = [];
    this.responseInterceptors = [];
  }

  /**
   * 设置认证令牌
   * @param {string} token - JWT令牌
   */
  setToken(token) {
    this.token = token;
    localStorage.setItem('sv_token', token);
  }

  /**
   * 清除认证令牌
   */
  clearToken() {
    this.token = null;
    localStorage.removeItem('sv_token');
  }

  /**
   * 设置村庄ID
   * @param {string} villageId - 村庄ID
   */
  setVillageId(villageId) {
    this.villageId = villageId;
  }

  /**
   * 添加请求拦截器
   * @param {Function} interceptor - 拦截器函数
   */
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * 添加响应拦截器
   * @param {Function} interceptor - 拦截器函数
   */
  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * 基础请求方法
   * @param {string} method - HTTP方法
   * @param {string} endpoint - API端点
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise} 请求Promise
   */
  async request(method, endpoint, data = null, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    };

    // 添加认证头
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    if (this.villageId) {
      headers['X-Village-Id'] = this.villageId;
    }

    // 请求配置
    const config = {
      method,
      headers,
      ...options
    };

    if (data && method !== 'GET') {
      config.body = typeof data === 'string' ? data : JSON.stringify(data);
    }

    // 应用请求拦截器
    let requestConfig = config;
    for (const interceptor of this.requestInterceptors) {
      requestConfig = interceptor(requestConfig);
    }

    try {
      // 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      requestConfig.signal = controller.signal;

      const response = await fetch(url, requestConfig);
      clearTimeout(timeoutId);

      // 处理响应
      let responseData;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else if (contentType && contentType.includes('text/event-stream')) {
        return this.handleSSE(response);
      } else {
        responseData = await response.blob();
      }

      // 应用响应拦截器
      for (const interceptor of this.responseInterceptors) {
        responseData = interceptor(responseData);
      }

      if (!response.ok) {
        throw new APIError(responseData.error || response.statusText, response.status, responseData.code);
      }

      return responseData;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new APIError('请求超时', 408, 'TIMEOUT');
      }
      throw error;
    }
  }

  /**
   * 处理Server-Sent Events
   * @param {Response} response - 响应对象
   * @returns {EventSource} SSE事件源
   */
  handleSSE(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    const eventSource = {
      onmessage: null,
      onerror: null,
      close: () => reader.cancel()
    };

    async function readStream() {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data && data !== '[DONE]') {
                try {
                  const parsedData = JSON.parse(data);
                  if (eventSource.onmessage) {
                    eventSource.onmessage(parsedData);
                  }
                } catch (e) {
                  console.error('Failed to parse SSE data:', e);
                }
              }
            }
          }
        }
      } catch (error) {
        if (eventSource.onerror) {
          eventSource.onerror(error);
        }
      }
    }

    readStream();
    return eventSource;
  }

  /**
   * GET请求
   */
  async get(endpoint, params = {}, options = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request('GET', url, null, options);
  }

  /**
   * POST请求
   */
  async post(endpoint, data = {}, options = {}) {
    return this.request('POST', endpoint, data, options);
  }

  /**
   * PUT请求
   */
  async put(endpoint, data = {}, options = {}) {
    return this.request('PUT', endpoint, data, options);
  }

  /**
   * DELETE请求
   */
  async delete(endpoint, options = {}) {
    return this.request('DELETE', endpoint, null, options);
  }

  /**
   * PATCH请求
   */
  async patch(endpoint, data = {}, options = {}) {
    return this.request('PATCH', endpoint, data, options);
  }

  /**
   * 文件上传
   */
  async upload(endpoint, file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);

    // 添加额外字段
    if (options.fields) {
      Object.entries(options.fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    return this.request('POST', endpoint, formData, {
      headers: {
        // 不设置Content-Type，让浏览器自动设置multipart/form-data
      },
      ...options
    });
  }
}

/**
 * 认证相关API
 */
class AuthAPI {
  constructor(sdk) {
    this.sdk = sdk;
  }

  /**
   * 用户登录
   * @param {Object} credentials - 登录凭据
   * @returns {Promise} 登录结果
   */
  async login(credentials) {
    const response = await this.sdk.post('/auth/login', credentials);
    if (response.success && response.data.accessToken) {
      this.sdk.setToken(response.data.accessToken);
    }
    return response;
  }

  /**
   * 用户注册
   * @param {Object} userData - 用户数据
   * @returns {Promise} 注册结果
   */
  async register(userData) {
    const response = await this.sdk.post('/auth/register', userData);
    if (response.success && response.data.accessToken) {
      this.sdk.setToken(response.data.accessToken);
    }
    return response;
  }

  /**
   * 刷新令牌
   * @param {string} refreshToken - 刷新令牌
   * @returns {Promise} 刷新结果
   */
  async refreshToken(refreshToken) {
    const response = await this.sdk.post('/auth/refresh', { refreshToken });
    if (response.success && response.data.accessToken) {
      this.sdk.setToken(response.data.accessToken);
    }
    return response;
  }

  /**
   * 退出登录
   */
  logout() {
    this.sdk.clearToken();
    return Promise.resolve({ success: true, message: '已退出登录' });
  }
}

/**
 * 用户管理API
 */
class UserAPI {
  constructor(sdk) {
    this.sdk = sdk;
  }

  /**
   * 获取用户列表
   * @param {Object} params - 查询参数
   * @returns {Promise} 用户列表
   */
  async getUsers(params = {}) {
    return this.sdk.get('/users', params);
  }

  /**
   * 获取用户详情
   * @param {string} userId - 用户ID
   * @returns {Promise} 用户详情
   */
  async getUser(userId) {
    return this.sdk.get(`/users/${userId}`);
  }

  /**
   * 创建用户
   * @param {Object} userData - 用户数据
   * @returns {Promise} 创建结果
   */
  async createUser(userData) {
    return this.sdk.post('/users', userData);
  }

  /**
   * 更新用户信息
   * @param {string} userId - 用户ID
   * @param {Object} userData - 更新数据
   * @returns {Promise} 更新结果
   */
  async updateUser(userId, userData) {
    return this.sdk.put(`/users/${userId}`, userData);
  }

  /**
   * 删除用户
   * @param {string} userId - 用户ID
   * @returns {Promise} 删除结果
   */
  async deleteUser(userId) {
    return this.sdk.delete(`/users/${userId}`);
  }
}

/**
 * 语音交互API
 */
class VoiceAPI {
  constructor(sdk) {
    this.sdk = sdk;
  }

  /**
   * 语音转文字
   * @param {File} audioFile - 音频文件
   * @param {string} dialect - 方言类型
   * @returns {Promise} 识别结果
   */
  async speechToText(audioFile, dialect = 'mandarin') {
    return this.sdk.upload('/voice/speech-to-text', audioFile, {
      fields: { dialect }
    });
  }

  /**
   * 文字转语音
   * @param {string} text - 文字内容
   * @param {Object} options - 合成选项
   * @returns {Promise} 合成结果
   */
  async textToSpeech(text, options = {}) {
    return this.sdk.post('/voice/text-to-speech', {
      text,
      dialect: options.dialect || 'mandarin',
      voiceStyle: options.voiceStyle || 'female'
    });
  }

  /**
   * 方言自动识别
   * @param {File} audioFile - 音频文件
   * @returns {Promise} 识别结果
   */
  async detectDialect(audioFile) {
    return this.sdk.upload('/voice/dialect-detect', audioFile);
  }
}

/**
 * 人脸识别API
 */
class FaceAPI {
  constructor(sdk) {
    this.sdk = sdk;
  }

  /**
   * 人脸注册
   * @param {string} userId - 用户ID
   * @param {Array} faceImages - 人脸图片数据
   * @param {Object} liveData - 活体检测数据
   * @returns {Promise} 注册结果
   */
  async register(userId, faceImages, liveData) {
    return this.sdk.post('/face/register', {
      userId,
      faceImages,
      liveData
    });
  }

  /**
   * 人脸验证
   * @param {string} faceImage - 人脸图片数据
   * @param {string} userId - 用户ID
   * @param {Object} liveData - 活体检测数据
   * @returns {Promise} 验证结果
   */
  async verify(faceImage, userId, liveData) {
    return this.sdk.post('/face/verify', {
      faceImage,
      userId,
      liveData
    });
  }

  /**
   * 活体检测
   * @param {File} videoFile - 视频文件
   * @param {string} challenge - 挑战动作
   * @returns {Promise} 检测结果
   */
  async liveness(videoFile, challenge) {
    return this.sdk.upload('/face/liveness', videoFile, {
      fields: { challenge }
    });
  }

  /**
   * 人脸搜索
   * @param {string} faceImage - 人脸图片数据
   * @param {number} maxResults - 最大结果数
   * @returns {Promise} 搜索结果
   */
  async search(faceImage, maxResults = 10) {
    return this.sdk.post('/face/search', {
      faceImage,
      maxResults
    });
  }
}

/**
 * AI智能服务API
 */
class AIServiceAPI {
  constructor(sdk) {
    this.sdk = sdk;
  }

  /**
   * 发票OCR识别
   * @param {File} imageFile - 发票图片
   * @returns {Promise} 识别结果
   */
  async recognizeInvoice(imageFile) {
    return this.sdk.upload('/ai/ocr/invoice', imageFile);
  }

  /**
   * 智能填表
   * @param {Object} formData - 表单数据
   * @returns {Promise} 填表结果
   */
  async autoFillForm(formData) {
    return this.sdk.post('/ai/form/auto-fill', formData);
  }

  /**
   * 政策补贴计算
   * @param {Object} calculationData - 计算数据
   * @returns {Promise} 计算结果
   */
  async calculatePolicySubsidy(calculationData) {
    return this.sdk.post('/ai/policy-calculator', calculationData);
  }
}

/**
 * 村民管理API
 */
class ResidentAPI {
  constructor(sdk) {
    this.sdk = sdk;
  }

  /**
   * 获取村民列表
   * @param {Object} params - 查询参数
   * @returns {Promise} 村民列表
   */
  async getResidents(params = {}) {
    return this.sdk.get('/residents', params);
  }

  /**
   * 创建村民档案
   * @param {Object} residentData - 村民数据
   * @returns {Promise} 创建结果
   */
  async createResident(residentData) {
    return this.sdk.post('/residents', residentData);
  }

  /**
   * 获取村民二维码
   * @param {string} residentId - 村民ID
   * @returns {Promise} 二维码数据
   */
  async getQRCode(residentId) {
    return this.sdk.get(`/residents/${residentId}/qrcode`);
  }
}

/**
 * 村情地图API
 */
class VillageMapAPI {
  constructor(sdk) {
    this.sdk = sdk;
  }

  /**
   * 获取村情地图信息
   * @param {string} villageId - 村庄ID
   * @param {Array} layers - 地图图层
   * @returns {Promise} 地图信息
   */
  async getVillageMap(villageId, layers = []) {
    return this.sdk.get('/map/village-info', {
      villageId,
      layers: layers.join(',')
    });
  }

  /**
   * 获取村民位置
   * @param {string} villageId - 村庄ID
   * @param {boolean} emergency - 是否紧急情况
   * @returns {Promise} 位置信息
   */
  async getResidentLocations(villageId, emergency = false) {
    return this.sdk.get('/map/resident-location', {
      villageId,
      emergency
    });
  }

  /**
   * 应急路径规划
   * @param {Object} routeData - 路径规划数据
   * @returns {Promise} 路径规划结果
   */
  async planEmergencyRoute(routeData) {
    return this.sdk.post('/map/emergency-route', routeData);
  }

  /**
   * 获取救援设备位置
   * @param {string} equipmentType - 设备类型
   * @param {string} villageId - 村庄ID
   * @returns {Promise} 设备位置信息
   */
  async getRescueEquipment(equipmentType, villageId) {
    return this.sdk.get('/map/rescue-equipment', {
      equipmentType,
      villageId
    });
  }
}

/**
 * 智能值班表API
 */
class DutyScheduleAPI {
  constructor(sdk) {
    this.sdk = sdk;
  }

  /**
   * 获取值班表
   * @param {Object} params - 查询参数
   * @returns {Promise} 值班表数据
   */
  async getSchedule(params = {}) {
    return this.sdk.get('/duty/schedule', params);
  }

  /**
   * 生成值班表
   * @param {Object} scheduleData - 排班数据
   * @returns {Promise} 生成结果
   */
  async generateSchedule(scheduleData) {
    return this.sdk.post('/duty/schedule', scheduleData);
  }

  /**
   * 紧急呼叫值班人员
   * @param {Object} emergencyData - 紧急呼叫数据
   * @returns {Promise} 呼叫结果
   */
  async emergencyCall(emergencyData) {
    return this.sdk.post('/duty/emergency-call', emergencyData);
  }
}

/**
 * 应急管理API
 */
class EmergencyAPI {
  constructor(sdk) {
    this.sdk = sdk;
  }

  /**
   * 获取应急报告
   * @param {Object} params - 查询参数
   * @returns {Promise} 应急报告列表
   */
  async getReports(params = {}) {
    return this.sdk.get('/emergency/reports', params);
  }

  /**
   * 创建应急报告
   * @param {Object} reportData - 报告数据
   * @returns {Promise} 创建结果
   */
  async createReport(reportData) {
    return this.sdk.post('/emergency/reports', reportData);
  }

  /**
   * 广播应急警报
   * @param {Object} broadcastData - 广播数据
   * @returns {Promise} 广播结果
   */
  async broadcastAlert(broadcastData) {
    return this.sdk.post('/emergency/broadcast', broadcastData);
  }
}

/**
 * 实时监控API
 */
class MonitoringAPI {
  constructor(sdk) {
    this.sdk = sdk;
  }

  /**
   * 获取系统监控状态
   * @returns {Promise} 监控状态
   */
  async getStatus() {
    return this.sdk.get('/monitoring/status');
  }

  /**
   * 订阅实时数据
   * @param {Function} onMessage - 消息处理函数
   * @param {Function} onError - 错误处理函数
   * @returns {Promise} SSE事件源
   */
  async subscribeRealtime(onMessage, onError) {
    const response = await fetch(`${this.sdk.baseURL}/monitoring/realtime`, {
      headers: {
        'Authorization': `Bearer ${this.sdk.token}`,
        'Accept': 'text/event-stream'
      }
    });

    if (!response.ok) {
      throw new APIError('Failed to subscribe to realtime data', response.status);
    }

    return this.sdk.handleSSE(response);
  }
}

/**
 * 自定义错误类
 */
class APIError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
  }
}

/**
 * 创建SDK实例
 * @param {Object} config - 配置选项
 * @returns {Object} SDK实例
 */
function createSDK(config = {}) {
  const sdk = new SmartVillageSDK(config);

  // 添加默认响应拦截器：自动处理token过期
  sdk.addResponseInterceptor((response) => {
    if (response.code === 'TOKEN_EXPIRED') {
      sdk.clearToken();
      // 可以触发重新登录事件
      window.dispatchEvent(new CustomEvent('tokenExpired'));
    }
    return response;
  });

  // 返回API集合
  return {
    // 核心SDK
    sdk,

    // API模块
    auth: new AuthAPI(sdk),
    users: new UserAPI(sdk),
    voice: new VoiceAPI(sdk),
    face: new FaceAPI(sdk),
    ai: new AIServiceAPI(sdk),
    residents: new ResidentAPI(sdk),
    map: new VillageMapAPI(sdk),
    duty: new DutyScheduleAPI(sdk),
    emergency: new EmergencyAPI(sdk),
    monitoring: new MonitoringAPI(sdk),

    // 工具方法
    setToken: (token) => sdk.setToken(token),
    clearToken: () => sdk.clearToken(),
    setVillageId: (villageId) => sdk.setVillageId(villageId),
  };
}

// 导出SDK
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SmartVillageSDK, createSDK, APIError };
} else if (typeof window !== 'undefined') {
  window.SmartVillageSDK = { SmartVillageSDK, createSDK, APIError };
}