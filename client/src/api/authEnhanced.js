/**
 * 认证API服务模块 - 增强版
 * Authentication API Service - Enhanced Version
 *
 * 提供完整的认证相关API调用，包括：
 * - 账号密码登录
 * - 手机验证码登录
 * - 用户注册
 * - 密码管理
 * - 人脸识别
 * - 双因素认证
 * - 第三方登录
 *
 * @module api/auth
 */
import request from '@/utils/request';
import { ElMessage } from 'element-plus';

// ========== API路径配置 ==========
const API_PATHS = {
  // 认证
  LOGIN: '/api/v1/auth/login',
  LOGIN_BY_CODE: '/api/v1/auth/login/code',
  LOGOUT: '/api/v1/auth/logout',
  REFRESH_TOKEN: '/api/v1/auth/refresh',

  // 注册
  REGISTER: '/api/v1/auth/register',
  VERIFY_REGISTER: '/api/v1/auth/register/verify',

  // 用户信息
  PROFILE: '/api/v1/auth/profile',
  UPDATE_PROFILE: '/api/v1/auth/profile',

  // 密码
  CHANGE_PASSWORD: '/api/v1/auth/change-password',
  FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
  RESET_PASSWORD: '/api/v1/auth/reset-password',

  // 验证码
  SEND_CODE: '/api/v1/sms/send',
  VERIFY_CODE: '/api/v1/sms/verify',

  // 人脸识别
  FACE_REGISTER: '/api/v1/face/register',
  FACE_VERIFY: '/api/v1/face/verify',
  FACE_DELETE: '/api/v1/face/delete',

  // 2FA
  TFA_SETUP: '/api/v1/auth/2fa/setup',
  TFA_VERIFY: '/api/v1/auth/2fa/verify',
  TFA_DISABLE: '/api/v1/auth/2fa/disable',

  // 第三方登录
  THIRD_PARTY_LOGIN: '/api/v1/auth/third-party',

  // 村庄
  VILLAGES: '/api/v1/villages',
};

// ========== 登录相关 ==========

/**
 * 账号密码登录
 * @param {Object} data - 登录数据
 * @param {string} data.username - 用户名
 * @param {string} data.password - 密码
 * @param {string} data.role - 角色
 * @param {boolean} data.rememberMe - 记住登录
 * @returns {Promise} 登录结果
 */
export const loginByPassword = (data) => {
  return request.post(API_PATHS.LOGIN, {
    username: data.username,
    password: data.password,
    role: data.role || 'admin',
    rememberMe: data.rememberMe || false,
  });
};

/**
 * 手机验证码登录
 * @param {Object} data - 登录数据
 * @param {string} data.phone - 手机号
 * @param {string} data.code - 验证码
 * @param {string} data.role - 角色
 * @returns {Promise} 登录结果
 */
export const loginByCode = (data) => {
  return request.post(API_PATHS.LOGIN_BY_CODE, {
    phone: data.phone,
    code: data.code,
    role: data.role || 'resident',
  });
};

/**
 * 第三方登录
 * @param {Object} data - 第三方登录数据
 * @param {string} data.type - 登录类型 (wechat, alipay, qq)
 * @param {string} data.code - 授权码
 * @param {string} data.state - 状态码
 * @returns {Promise} 登录结果
 */
export const loginByThirdParty = (data) => {
  return request.post(API_PATHS.THIRD_PARTY_LOGIN, {
    type: data.type,
    code: data.code,
    state: data.state,
  });
};

/**
 * 人脸识别登录
 * @param {Object} data - 人脸数据
 * @param {string} data.image - base64图像数据
 * @param {Array} data.feature - 人脸特征向量
 * @returns {Promise} 登录结果
 */
export const loginByFace = (data) => {
  return request.post(API_PATHS.FACE_VERIFY, {
    image: data.image,
    feature: data.feature,
  });
};

/**
 * 用户登出
 * @returns {Promise} 登出结果
 */
export const logout = () => {
  return request.post(API_PATHS.LOGOUT);
};

/**
 * 刷新Token
 * @param {string} refreshToken - 刷新令牌
 * @returns {Promise} 新Token
 */
export const refreshToken = (refreshToken) => {
  return request.post(API_PATHS.REFRESH_TOKEN, { refreshToken });
};

// ========== 注册相关 ==========

/**
 * 用户注册
 * @param {Object} data - 注册数据
 * @param {string} data.name - 姓名
 * @param {string} data.phone - 手机号
 * @param {string} data.idCard - 身份证号
 * @param {string} data.password - 密码
 * @param {string} data.villageId - 村庄ID
 * @param {string} data.role - 角色
 * @returns {Promise} 注册结果
 */
export const register = (data) => {
  return request.post(API_PATHS.REGISTER, {
    name: data.name,
    phone: data.phone,
    idCard: data.idCard,
    password: data.password,
    villageId: data.villageId,
    role: data.role || 'resident',
    idCardFront: data.idCardFront,
    idCardBack: data.idCardBack,
    avatar: data.avatar,
  });
};

/**
 * 验证注册信息
 * @param {Object} data - 验证数据
 * @param {string} data.phone - 手机号
 * @param {string} data.code - 验证码
 * @returns {Promise} 验证结果
 */
export const verifyRegister = (data) => {
  return request.post(API_PATHS.VERIFY_REGISTER, {
    phone: data.phone,
    code: data.code,
  });
};

// ========== 用户信息相关 ==========

/**
 * 获取用户信息
 * @returns {Promise} 用户信息
 */
export const getUserProfile = () => {
  return request.get(API_PATHS.PROFILE);
};

/**
 * 更新用户信息
 * @param {Object} data - 更新数据
 * @returns {Promise} 更新结果
 */
export const updateUserProfile = (data) => {
  return request.put(API_PATHS.UPDATE_PROFILE, {
    name: data.name,
    email: data.email,
    phone: data.phone,
    avatar: data.avatar,
    department: data.department,
    position: data.position,
  });
};

// ========== 密码相关 ==========

/**
 * 修改密码
 * @param {Object} data - 密码数据
 * @param {string} data.oldPassword - 旧密码
 * @param {string} data.newPassword - 新密码
 * @returns {Promise} 修改结果
 */
export const changePassword = (data) => {
  return request.post(API_PATHS.CHANGE_PASSWORD, {
    oldPassword: data.oldPassword,
    newPassword: data.newPassword,
  });
};

/**
 * 忘记密码 - 发送验证码
 * @param {Object} data - 账号数据
 * @param {string} data.account - 用户名或手机号
 * @returns {Promise} 发送结果
 */
export const forgotPassword = (data) => {
  return request.post(API_PATHS.FORGOT_PASSWORD, {
    account: data.account,
  });
};

/**
 * 重置密码
 * @param {Object} data - 重置数据
 * @param {string} data.account - 账号
 * @param {string} data.code - 验证码
 * @param {string} data.newPassword - 新密码
 * @param {string} data.confirmPassword - 确认密码
 * @returns {Promise} 重置结果
 */
export const resetPassword = (data) => {
  return request.post(API_PATHS.RESET_PASSWORD, {
    account: data.account,
    code: data.code,
    newPassword: data.newPassword,
    confirmPassword: data.confirmPassword,
  });
};

// ========== 验证码相关 ==========

/**
 * 发送验证码
 * @param {Object} data - 发送数据
 * @param {string} data.phone - 手机号
 * @param {string} data.type - 类型 (login, register, reset_password, verify)
 * @returns {Promise} 发送结果
 */
export const sendVerifyCode = (data) => {
  return request.post(API_PATHS.SEND_CODE, {
    phone: data.phone,
    type: data.type || 'login',
  });
};

/**
 * 验证验证码
 * @param {Object} data - 验证数据
 * @param {string} data.phone - 手机号
 * @param {string} data.code - 验证码
 * @param {string} data.type - 类型
 * @returns {Promise} 验证结果
 */
export const verifyCode = (data) => {
  return request.post(API_PATHS.VERIFY_CODE, {
    phone: data.phone,
    code: data.code,
    type: data.type || 'login',
  });
};

// ========== 人脸识别相关 ==========

/**
 * 注册人脸
 * @param {Object} data - 人脸数据
 * @param {string} data.userId - 用户ID
 * @param {string} data.image - base64图像
 * @param {Array} data.feature - 特征向量
 * @returns {Promise} 注册结果
 */
export const registerFace = (data) => {
  return request.post(API_PATHS.FACE_REGISTER, {
    userId: data.userId,
    image: data.image,
    feature: data.feature,
  });
};

/**
 * 验证人脸
 * @param {Object} data - 人脸数据
 * @param {string} data.image - base64图像
 * @param {Array} data.feature - 特征向量
 * @returns {Promise} 验证结果
 */
export const verifyFace = (data) => {
  return request.post(API_PATHS.FACE_VERIFY, {
    image: data.image,
    feature: data.feature,
  });
};

/**
 * 删除人脸
 * @returns {Promise} 删除结果
 */
export const deleteFace = () => {
  return request.delete(API_PATHS.FACE_DELETE);
};

// ========== 双因素认证相关 ==========

/**
 * 设置2FA
 * @param {Object} data - 设置数据
 * @param {string} data.method - 方法 (totp, sms, email)
 * @param {string} data.secret - 密钥
 * @returns {Promise} 设置结果
 */
export const setup2FA = (data) => {
  return request.post(API_PATHS.TFA_SETUP, {
    method: data.method || 'totp',
    secret: data.secret,
  });
};

/**
 * 验证2FA
 * @param {Object} data - 验证数据
 * @param {string} data.code - 验证码
 * @param {string} data.method - 方法
 * @returns {Promise} 验证结果
 */
export const verify2FA = (data) => {
  return request.post(API_PATHS.TFA_VERIFY, {
    code: data.code,
    method: data.method || 'totp',
  });
};

/**
 * 禁用2FA
 * @param {Object} data - 禁用数据
 * @param {string} data.code - 验证码
 * @param {string} data.method - 方法
 * @returns {Promise} 禁用结果
 */
export const disable2FA = (data) => {
  return request.post(API_PATHS.TFA_DISABLE, {
    code: data.code,
    method: data.method || 'totp',
  });
};

// ========== 村庄相关 ==========

/**
 * 获取村庄列表
 * @param {Object} params - 查询参数
 * @param {string} params.keyword - 关键词
 * @param {string} params.district - 区域
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页大小
 * @returns {Promise} 村庄列表
 */
export const getVillages = (params = {}) => {
  return request.get(API_PATHS.VILLAGES, {
    keyword: params.keyword,
    district: params.district,
    page: params.page || 1,
    pageSize: params.pageSize || 50,
  });
};

// ========== 辅助函数 ==========

/**
 * 验证手机号格式
 * @param {string} phone - 手机号
 * @returns {boolean} 是否有效
 */
export const validatePhone = (phone) => {
  return /^1[3-9]\d{9}$/.test(phone);
};

/**
 * 验证身份证号格式
 * @param {string} idCard - 身份证号
 * @returns {boolean} 是否有效
 */
export const validateIdCard = (idCard) => {
  return /^\d{17}[\dXx]$/.test(idCard);
};

/**
 * 验证密码强度
 * @param {string} password - 密码
 * @returns {Object} 强度信息
 */
export const validatePassword = (password) => {
  const result = {
    valid: true,
    strength: 'weak',
    message: '',
  };

  // 长度检查
  if (password.length < 6) {
    result.valid = false;
    result.message = '密码长度不能少于6位';
    return result;
  }

  // 强度计算
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  if (strength <= 2) {
    result.strength = 'weak';
    result.message = '密码强度：弱';
  } else if (strength <= 3) {
    result.strength = 'medium';
    result.message = '密码强度：中';
  } else {
    result.strength = 'strong';
    result.message = '密码强度：强';
  }

  return result;
};

/**
 * 格式化手机号（隐藏中间4位）
 * @param {string} phone - 手机号
 * @returns {string} 格式化后的手机号
 */
export const formatPhone = (phone) => {
  if (!phone) return '';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

/**
 * 格式化身份证号（隐藏中间部分）
 * @param {string} idCard - 身份证号
 * @returns {string} 格式化后的身份证号
 */
export const formatIdCard = (idCard) => {
  if (!idCard) return '';
  if (idCard.length === 18) {
    return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
  }
  return idCard;
};

// ========== 导出统一的API对象 ==========
export default {
  // 登录
  loginByPassword,
  loginByCode,
  loginByThirdParty,
  loginByFace,
  logout,
  refreshToken,

  // 注册
  register,
  verifyRegister,

  // 用户信息
  getUserProfile,
  updateUserProfile,

  // 密码
  changePassword,
  forgotPassword,
  resetPassword,

  // 验证码
  sendVerifyCode,
  verifyCode,

  // 人脸识别
  registerFace,
  verifyFace,
  deleteFace,

  // 2FA
  setup2FA,
  verify2FA,
  disable2FA,

  // 村庄
  getVillages,

  // 辅助函数
  validatePhone,
  validateIdCard,
  validatePassword,
  formatPhone,
  formatIdCard,
};

// ========== 便捷的登录服务类 ==========
export class AuthService {
  /**
   * 自动选择登录方式
   * @param {Object} credentials - 登录凭证
   * @returns {Promise} 登录结果
   */
  static async autoLogin(credentials) {
    // 如果是手机号格式，尝试验证码登录
    if (validatePhone(credentials.username)) {
      return loginByCode({
        phone: credentials.username,
        code: credentials.password,
        role: credentials.role,
      });
    }
    // 否则使用账号密码登录
    return loginByPassword(credentials);
  }

  /**
   * 完整的注册流程
   * @param {Object} data - 注册数据
   * @returns {Promise} 注册结果
   */
  static async fullRegister(data) {
    // 1. 发送验证码
    await sendVerifyCode({ phone: data.phone, type: 'register' });

    // 2. 提交注册信息
    const result = await register(data);

    return result;
  }

  /**
   * 完整的找回密码流程
   * @param {Object} data - 密码数据
   * @returns {Promise} 重置结果
   */
  static async fullResetPassword(data) {
    // 1. 发送验证码
    await forgotPassword({ account: data.account });

    // 2. 重置密码
    const result = await resetPassword({
      account: data.account,
      code: data.code,
      newPassword: data.newPassword,
      confirmPassword: data.confirmPassword,
    });

    return result;
  }

  /**
   * 检查登录状态
   * @returns {boolean} 是否已登录
   */
  static isLoggedIn() {
    const token = localStorage.getItem('token');
    return !!token;
  }

  /**
   * 获取当前用户信息
   * @returns {Object|null} 用户信息
   */
  static getCurrentUser() {
    const userStr = localStorage.getItem('userInfo');
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * 清除登录信息
   */
  static clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('permissions');
    localStorage.removeItem('roles');
  }
}
