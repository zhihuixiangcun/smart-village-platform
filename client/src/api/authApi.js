/**
 * 认证相关API接口
 */
import { get, post, put, del } from '@/utils/http'

/**
 * 用户登录
 * @param {Object} data 登录数据
 * @returns {Promise} API响应
 */
export function login(data) {
  return post('/api/auth/login', data)
}

/**
 * 用户注册
 * @param {Object} data 注册数据
 * @returns {Promise} API响应
 */
export function register(data) {
  return post('/api/auth/register', data)
}

/**
 * 用户登出
 * @returns {Promise} API响应
 */
export function logout() {
  return post('/api/auth/logout')
}

/**
 * 刷新Token
 * @param {string} refreshToken 刷新令牌
 * @returns {Promise} API响应
 */
export function refreshToken(refreshToken) {
  return post('/api/auth/refresh', { refreshToken })
}

/**
 * 获取用户信息
 * @returns {Promise} API响应
 */
export function getUserInfo() {
  return get('/api/auth/user')
}

/**
 * 更新用户信息
 * @param {Object} data 用户数据
 * @returns {Promise} API响应
 */
export function updateUserInfo(data) {
  return put('/api/auth/user', data)
}

/**
 * 修改密码
 * @param {Object} data 密码数据
 * @returns {Promise} API响应
 */
export function changePassword(data) {
  return put('/api/auth/password', data)
}

/**
 * 忘记密码 - 发送验证码
 * @param {string} phone 手机号
 * @returns {Promise} API响应
 */
export function sendResetCode(phone) {
  return post('/api/auth/forgot-password/send-code', { phone })
}

/**
 * 忘记密码 - 验证验证码
 * @param {Object} data 验证数据
 * @returns {Promise} API响应
 */
export function verifyResetCode(data) {
  return post('/api/auth/forgot-password/verify', data)
}

/**
 * 忘记密码 - 重置密码
 * @param {Object} data 重置数据
 * @returns {Promise} API响应
 */
export function resetPassword(data) {
  return post('/api/auth/forgot-password/reset', data)
}

/**
 * 发送短信验证码
 * @param {string} phone 手机号
 * @param {string} type 验证码类型 (login|register|reset)
 * @returns {Promise} API响应
 */
export function sendSmsCode(phone, type = 'login') {
  return post('/api/auth/sms/send', { phone, type })
}

/**
 * 验证短信验证码
 * @param {string} phone 手机号
 * @param {string} code 验证码
 * @param {string} type 验证码类型
 * @returns {Promise} API响应
 */
export function verifySmsCode(phone, code, type = 'login') {
  return post('/api/auth/sms/verify', { phone, code, type })
}

/**
 * 手机号登录
 * @param {Object} data 登录数据
 * @returns {Promise} API响应
 */
export function phoneLogin(data) {
  return post('/api/auth/phone-login', data)
}

/**
 * 检查用户名是否存在
 * @param {string} username 用户名
 * @returns {Promise} API响应
 */
export function checkUsername(username) {
  return get('/api/auth/check-username', { username })
}

/**
 * 检查手机号是否存在
 * @param {string} phone 手机号
 * @returns {Promise} API响应
 */
export function checkPhone(phone) {
  return get('/api/auth/check-phone', { phone })
}

/**
 * 获取用户权限
 * @returns {Promise} API响应
 */
export function getUserPermissions() {
  return get('/api/auth/permissions')
}

/**
 * 获取用户角色
 * @returns {Promise} API响应
 */
export function getUserRoles() {
  return get('/api/auth/roles')
}

/**
 * 上传用户头像
 * @param {FormData} formData 头像文件
 * @returns {Promise} API响应
 */
export function uploadAvatar(formData) {
  return post('/api/auth/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 绑定手机号
 * @param {Object} data 绑定数据
 * @returns {Promise} API响应
 */
export function bindPhone(data) {
  return post('/api/auth/bind-phone', data)
}

/**
 * 解绑手机号
 * @param {Object} data 解绑数据
 * @returns {Promise} API响应
 */
export function unbindPhone(data) {
  return post('/api/auth/unbind-phone', data)
}

/**
 * 获取登录历史
 * @param {Object} params 查询参数
 * @returns {Promise} API响应
 */
export function getLoginHistory(params = {}) {
  return get('/api/auth/login-history', params)
}

/**
 * 清除登录历史
 * @returns {Promise} API响应
 */
export function clearLoginHistory() {
  return del('/api/auth/login-history')
}

/**
 * 获取在线用户列表
 * @returns {Promise} API响应
 */
export function getOnlineUsers() {
  return get('/api/auth/online-users')
}

/**
 * 强制下线用户
 * @param {string} userId 用户ID
 * @returns {Promise} API响应
 */
export function forceLogout(userId) {
  return post(`/api/auth/force-logout/${userId}`)
}

// 导出所有API
export const authApi = {
  login,
  register,
  logout,
  refreshToken,
  getUserInfo,
  updateUserInfo,
  changePassword,
  sendResetCode,
  verifyResetCode,
  resetPassword,
  sendSmsCode,
  verifySmsCode,
  phoneLogin,
  checkUsername,
  checkPhone,
  getUserPermissions,
  getUserRoles,
  uploadAvatar,
  bindPhone,
  unbindPhone,
  getLoginHistory,
  clearLoginHistory,
  getOnlineUsers,
  forceLogout
}

export default authApi