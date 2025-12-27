/**
 * 人脸识别API服务
 * 提供与人脸识别相关的所有API调用
 */

import axios from 'axios';
import { getToken } from '@/utils/auth';

// 创建axios实例
const apiClient = axios.create({
  baseURL: process.env.VUE_APP_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器 - 添加认证token
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 添加设备信息
    config.headers['X-Device-ID'] = localStorage.getItem('deviceId') || 'web-device';
    config.headers['X-Platform'] = 'web';
    config.headers['X-Browser'] = navigator.userAgent;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 统一错误处理
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API请求错误:', error);

    // 处理token过期
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return Promise.reject(new Error('登录已过期，请重新登录'));
    }

    // 处理权限不足
    if (error.response?.status === 403) {
      return Promise.reject(new Error('权限不足，无法执行此操作'));
    }

    // 处理频率限制
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const message = retryAfter
        ? `请求过于频繁，请在${retryAfter}秒后重试`
        : '请求过于频繁，请稍后再试';
      return Promise.reject(new Error(message));
    }

    // 处理其他错误
    const errorMessage = error.response?.data?.error || error.message || '请求失败';
    return Promise.reject(new Error(errorMessage));
  }
);

/**
 * 人脸检测
 */
export const faceDetectionAPI = {
  /**
   * 检测图像中的人脸
   * @param {string} image - Base64编码的图像数据
   * @param {string} villageId - 村庄ID
   * @returns {Promise} 检测结果
   */
  async detectFaces(image, villageId) {
    try {
      const response = await apiClient.post('/face/detect', {
        image,
        villageId
      });
      return response;
    } catch (error) {
      console.error('人脸检测失败:', error);
      throw error;
    }
  },

  /**
   * 批量检测人脸
   * @param {Array} images - 图像数组
   * @param {string} villageId - 村庄ID
   * @returns {Promise} 批量检测结果
   */
  async detectFacesBatch(images, villageId) {
    try {
      const response = await apiClient.post('/face/detect_batch', {
        images,
        villageId
      });
      return response;
    } catch (error) {
      console.error('批量人脸检测失败:', error);
      throw error;
    }
  }
};

/**
 * 人脸注册
 */
export const faceRegistrationAPI = {
  /**
   * 注册用户人脸
   * @param {Object} data - 注册数据
   * @param {string} data.image - Base64编码的图像数据
   * @param {string} data.userId - 用户ID
   * @param {string} data.villageId - 村庄ID
   * @param {boolean} data.requireLiveness - 是否需要活体检测
   * @returns {Promise} 注册结果
   */
  async registerFace(data) {
    try {
      const response = await apiClient.post('/face/register', data);
      return response;
    } catch (error) {
      console.error('人脸注册失败:', error);
      throw error;
    }
  },

  /**
   * 带活体检测的人脸注册
   * @param {Object} data - 注册数据
   * @param {Array} data.frames - 活体检测帧序列
   * @param {string} data.userId - 用户ID
   * @param {string} data.villageId - 村庄ID
   * @param {Array} data.actions - 活体检测动作
   * @returns {Promise} 注册结果
   */
  async registerFaceWithLiveness(data) {
    try {
      const response = await apiClient.post('/face/register_with_liveness', data);
      return response;
    } catch (error) {
      console.error('带活体检测的人脸注册失败:', error);
      throw error;
    }
  },

  /**
   * 获取用户人脸注册状态
   * @param {string} userId - 用户ID
   * @param {string} villageId - 村庄ID
   * @returns {Promise} 注册状态
   */
  async getFaceStatus(userId, villageId) {
    try {
      const response = await apiClient.get(`/face/user/${userId}/status`, {
        params: { villageId }
      });
      return response;
    } catch (error) {
      console.error('获取人脸状态失败:', error);
      throw error;
    }
  },

  /**
   * 删除用户人脸数据
   * @param {string} userId - 用户ID
   * @param {string} villageId - 村庄ID
   * @returns {Promise} 删除结果
   */
  async deleteFace(userId, villageId) {
    try {
      const response = await apiClient.delete(`/face/user/${userId}`, {
        params: { villageId }
      });
      return response;
    } catch (error) {
      console.error('删除人脸数据失败:', error);
      throw error;
    }
  }
};

/**
 * 人脸验证
 */
export const faceVerificationAPI = {
  /**
   * 1:1人脸验证
   * @param {Object} data - 验证数据
   * @param {string} data.image - Base64编码的图像数据
   * @param {string} data.userId - 用户ID
   * @param {string} data.villageId - 村庄ID
   * @param {boolean} data.requireLiveness - 是否需要活体检测
   * @returns {Promise} 验证结果
   */
  async verify(data) {
    try {
      const response = await apiClient.post('/face/verify', data);
      return response;
    } catch (error) {
      console.error('人脸验证失败:', error);
      throw error;
    }
  },

  /**
   * 带活体检测的人脸验证
   * @param {Object} data - 验证数据
   * @param {string} data.image - Base64编码的图像数据
   * @param {string} data.userId - 用户ID
   * @param {string} data.villageId - 村庄ID
   * @param {Array} data.frames - 活体检测帧序列
   * @param {Array} data.actions - 活体检测动作
   * @returns {Promise} 验证结果
   */
  async verifyWithLiveness(data) {
    try {
      const response = await apiClient.post('/face/verify_with_liveness', data);
      return response;
    } catch (error) {
      console.error('带活体检测的人脸验证失败:', error);
      throw error;
    }
  },

  /**
   * 批量人脸验证
   * @param {Object} data - 批量验证数据
   * @param {Array} data.requests - 验证请求列表
   * @param {string} data.villageId - 村庄ID
   * @returns {Promise} 批量验证结果
   */
  async batchVerify(data) {
    try {
      const response = await apiClient.post('/face/batch/verify', data);
      return response;
    } catch (error) {
      console.error('批量人脸验证失败:', error);
      throw error;
    }
  }
};

/**
 * 人脸识别
 */
export const faceIdentificationAPI = {
  /**
   * 1:N人脸识别
   * @param {Object} data - 识别数据
   * @param {string} data.image - Base64编码的图像数据
   * @param {string} data.villageId - 村庄ID
   * @param {number} data.maxResults - 最大返回结果数
   * @returns {Promise} 识别结果
   */
  async identify(data) {
    try {
      const response = await apiClient.post('/face/identify', data);
      return response;
    } catch (error) {
      console.error('人脸识别失败:', error);
      throw error;
    }
  },

  /**
   * 带活体检测的人脸识别
   * @param {Object} data - 识别数据
   * @param {string} data.image - Base64编码的图像数据
   * @param {string} data.villageId - 村庄ID
   * @param {number} data.maxResults - 最大返回结果数
   * @param {Array} data.frames - 活体检测帧序列
   * @param {Array} data.actions - 活体检测动作
   * @returns {Promise} 识别结果
   */
  async identifyWithLiveness(data) {
    try {
      const response = await apiClient.post('/face/identify_with_liveness', data);
      return response;
    } catch (error) {
      console.error('带活体检测的人脸识别失败:', error);
      throw error;
    }
  },

  /**
   * 批量人脸识别
   * @param {Object} data - 批量识别数据
   * @param {Array} data.requests - 识别请求列表
   * @param {string} data.villageId - 村庄ID
   * @returns {Promise} 批量识别结果
   */
  async batchIdentify(data) {
    try {
      const response = await apiClient.post('/face/batch/identify', data);
      return response;
    } catch (error) {
      console.error('批量人脸识别失败:', error);
      throw error;
    }
  }
};

/**
 * 活体检测
 */
export const livenessDetectionAPI = {
  /**
   * 活体检测
   * @param {Object} data - 活体检测数据
   * @param {Array} data.frames - 活体检测帧序列
   * @param {Array} data.actions - 检测动作列表
   * @returns {Promise} 活体检测结果
   */
  async detect(data) {
    try {
      const response = await apiClient.post('/liveness/detect', data);
      return response;
    } catch (error) {
      console.error('活体检测失败:', error);
      throw error;
    }
  }
};

/**
 * 人脸比较
 */
export const faceComparisonAPI = {
  /**
   * 比较两张人脸图像
   * @param {Object} data - 比较数据
   * @param {string} data.image1 - 第一张图像的Base64数据
   * @param {string} data.image2 - 第二张图像的Base64数据
   * @returns {Promise} 比较结果
   */
  async compare(data) {
    try {
      const response = await apiClient.post('/face/compare', data);
      return response;
    } catch (error) {
      console.error('人脸比较失败:', error);
      throw error;
    }
  }
};

/**
 * 亲属代理
 */
export const familyRelationAPI = {
  /**
   * 创建亲属代理关系
   * @param {Object} data - 代理关系数据
   * @param {string} data.principalUserId - 被代理者用户ID
   * @param {string} data.agentUserId - 代理者用户ID
   * @param {string} data.relationType - 关系类型
   * @param {Object} data.relationProof - 关系证明
   * @param {Object} data.permissions - 权限配置
   * @param {string} data.expiresAt - 过期时间
   * @param {string} data.villageId - 村庄ID
   * @returns {Promise} 创建结果
   */
  async createRelation(data) {
    try {
      const response = await apiClient.post('/family-relation/create', data);
      return response;
    } catch (error) {
      console.error('创建代理关系失败:', error);
      throw error;
    }
  },

  /**
   * 获取代理关系列表
   * @param {Object} params - 查询参数
   * @param {string} params.userId - 用户ID
   * @param {string} params.villageId - 村庄ID
   * @param {string} params.type - 关系类型 (principal/agent)
   * @returns {Promise} 代理关系列表
   */
  async getRelations(params) {
    try {
      const response = await apiClient.get('/family-relation/list', { params });
      return response;
    } catch (error) {
      console.error('获取代理关系失败:', error);
      throw error;
    }
  },

  /**
   * 更新代理关系
   * @param {string} relationId - 关系ID
   * @param {Object} data - 更新数据
   * @returns {Promise} 更新结果
   */
  async updateRelation(relationId, data) {
    try {
      const response = await apiClient.put(`/family-relation/${relationId}`, data);
      return response;
    } catch (error) {
      console.error('更新代理关系失败:', error);
      throw error;
    }
  },

  /**
   * 删除代理关系
   * @param {string} relationId - 关系ID
   * @returns {Promise} 删除结果
   */
  async deleteRelation(relationId) {
    try {
      const response = await apiClient.delete(`/family-relation/${relationId}`);
      return response;
    } catch (error) {
      console.error('删除代理关系失败:', error);
      throw error;
    }
  }
};

/**
 * 系统配置
 */
export const systemConfigAPI = {
  /**
   * 获取人脸识别配置
   * @param {string} villageId - 村庄ID
   * @returns {Promise} 配置信息
   */
  async getConfig(villageId) {
    try {
      const response = await apiClient.get('/face/config', {
        params: { villageId }
      });
      return response;
    } catch (error) {
      console.error('获取配置失败:', error);
      throw error;
    }
  },

  /**
   * 更新人脸识别配置
   * @param {Object} data - 配置数据
   * @param {string} data.villageId - 村庄ID
   * @param {Object} data.thresholds - 阈值配置
   * @param {Object} data.security - 安全配置
   * @returns {Promise} 更新结果
   */
  async updateConfig(data) {
    try {
      const response = await apiClient.put('/face/config', data);
      return response;
    } catch (error) {
      console.error('更新配置失败:', error);
      throw error;
    }
  }
};

/**
 * 审计日志
 */
export const auditLogAPI = {
  /**
   * 获取审计日志
   * @param {Object} params - 查询参数
   * @param {string} params.villageId - 村庄ID
   * @param {number} params.page - 页码
   * @param {number} params.limit - 每页数量
   * @param {string} params.operationType - 操作类型
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @returns {Promise} 审计日志
   */
  async getLogs(params) {
    try {
      const response = await apiClient.get('/audit/logs', { params });
      return response;
    } catch (error) {
      console.error('获取审计日志失败:', error);
      throw error;
    }
  }
};

// 导出所有API
export default {
  faceDetection: faceDetectionAPI,
  faceRegistration: faceRegistrationAPI,
  faceVerification: faceVerificationAPI,
  faceIdentification: faceIdentificationAPI,
  livenessDetection: livenessDetectionAPI,
  faceComparison: faceComparisonAPI,
  familyRelation: familyRelationAPI,
  systemConfig: systemConfigAPI,
  auditLog: auditLogAPI
};