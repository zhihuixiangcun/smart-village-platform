const TOKEN_KEY = 'village_token'
const USER_KEY = 'village_user'

// 设置令牌
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

// 获取令牌
export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

// 移除令牌
export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// 设置用户信息
export function setUser(userInfo) {
  localStorage.setItem(USER_KEY, JSON.stringify(userInfo))
}

// 获取用户信息
export function getUser() {
  const userStr = localStorage.getItem(USER_KEY)
  try {
    return userStr ? JSON.parse(userStr) : null
  } catch {
    return null
  }
}

// 移除用户信息
export function removeUser() {
  localStorage.removeItem(USER_KEY)
}

// 清除所有认证信息
export function clearAuth() {
  removeToken()
  removeUser()
}

// 检查是否已登录
export function isLoggedIn() {
  return !!getToken() && !!getUser()
}

// 检查用户权限
export function hasPermission(module, action) {
  const user = getUser()
  if (!user) return false

  // 管理员拥有所有权限
  if (user.level === 'admin') return true

  const userPermissions = user.permissions || []
  return userPermissions.some(perm =>
    perm.module === module && perm.actions.includes(action)
  )
}

// 检查用户角色
export function hasRole(role) {
  const user = getUser()
  if (!user) return false

  return user.role === role || user.level === 'admin'
}

// 检查是否为村庄领导
export function isVillageLeader() {
  const user = getUser()
  if (!user) return false

  return ['village_head', 'village_director'].includes(user.role)
}

// 获取设备ID
export function getDeviceId() {
  let deviceId = localStorage.getItem('device_id')
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
    localStorage.setItem('device_id', deviceId)
  }
  return deviceId
}