/**
 * 用户认证相关API
 */
import request from '@/utils/request';

// 用户登录
export const login = (data) => {
  return request.post('/auth/login', data);
};

// 用户注册
export const register = (data) => {
  return request.post('/auth/register', data);
};

// 用户登出
export const logout = () => {
  return request.post('/auth/logout');
};

// 刷新Token
export const refreshToken = (refreshToken) => {
  return request.post('/auth/refresh-token', { refreshToken });
};

// 获取用户信息
export const getUserProfile = () => {
  return request.get('/auth/profile');
};

// 更新用户信息
export const updateUserProfile = (data) => {
  return request.put('/auth/profile', data);
};

// 修改密码
export const changePassword = (data) => {
  return request.post('/auth/change-password', data);
};

// 忘记密码
export const forgotPassword = (data) => {
  return request.post('/auth/forgot-password', data);
};

// 重置密码
export const resetPassword = (data) => {
  return request.post('/auth/reset-password', data);
};

// 验证邮箱
export const verifyEmail = (token) => {
  return request.post('/auth/verify-email', { token });
};

// 发送验证码
export const sendVerificationCode = (data) => {
  return request.post('/auth/send-verification-code', data);
};

// 验证码验证
export const verifyCode = (data) => {
  return request.post('/auth/verify-code', data);
};

// 人脸识别登录
export const faceLogin = (data) => {
  return request.post('/auth/face-login', data);
};

// 亲属代理登录
export const proxyLogin = (data) => {
  return request.post('/auth/proxy-login', data);
};

// 人脸注册
export const registerFace = (data) => {
  return request.post('/auth/register-face', data);
};

export const userAPI = {
  login,
  register,
  logout,
  refreshToken,
  getUserProfile,
  updateUserProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  sendVerificationCode,
  verifyCode,
  faceLogin,
  proxyLogin,
  registerFace
};