import request from '@/utils/request';
import { setToken, removeToken } from '@/utils/auth';

const villageUserApi = {
  // 用户注册
  register(data) {
    return request.post('/api/village-users/register', data);
  },

  // 用户登录
  login(data) {
    return request.post('/api/village-users/login', data);
  },

  // 获取用户信息
  getUserProfile() {
    return request.get('/api/village-users/profile');
  },

  // 更新用户信息
  updateProfile(data) {
    return request.put('/api/village-users/profile', data);
  },

  // 修改密码
  changePassword(data) {
    return request.put('/api/village-users/password', data);
  },

  // 用户登出
  logout() {
    return request.post('/api/village-users/logout');
  },

  // 获取村庄用户列表
  getVillageUsers(villageId, params) {
    return request.get(`/api/village-users/village/${villageId}/users`, { params });
  },

  // 获取在线用户
  getOnlineUsers(villageId) {
    return request.get(`/api/village-users/village/${villageId}/users/online`);
  },

  // 获取用户工作统计
  getUserWorkStats(villageId, params) {
    return request.get(`/api/village-users/village/${villageId}/users/stats`, { params });
  },

  // 更新用户状态（管理员）
  updateUserStatus(userId, data) {
    return request.put(`/api/village-users/users/${userId}/status`, data);
  },

  // 分配权限（管理员）
  assignPermissions(userId, permissions) {
    return request.put(`/api/village-users/users/${userId}/permissions`, { permissions });
  },
};

export default villageUserApi;
