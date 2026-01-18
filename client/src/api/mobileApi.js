/**
 * 移动端API服务
 * 为5个角色（村民、村干部、采购商、乡镇干部、管理员）提供统一的后端接口
 */

import { axiosInstance } from './index';

/**
 * ============================================
 * 1. 村民角色 API (Resident)
 * ============================================
 */

/**
 * 村民个人中心API
 */
export const residentProfileApi = {
  // 获取个人信息
  getProfile() {
    return axiosInstance.get('/api/v1/mobile/resident/profile');
  },

  // 更新个人信息
  updateProfile(data) {
    return axiosInstance.put('/api/v1/mobile/resident/profile', data);
  },

  // 上传头像
  uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    return axiosInstance.post('/api/v1/mobile/resident/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // 获取家庭成员列表
  getFamilyMembers() {
    return axiosInstance.get('/api/v1/mobile/resident/family');
  },

  // 添加家庭成员
  addFamilyMember(data) {
    return axiosInstance.post('/api/v1/mobile/resident/family', data);
  },

  // 更新家庭成员信息
  updateFamilyMember(memberId, data) {
    return axiosInstance.put(`/api/v1/mobile/resident/family/${memberId}`, data);
  },

  // 删除家庭成员
  deleteFamilyMember(memberId) {
    return axiosInstance.delete(`/api/v1/mobile/resident/family/${memberId}`);
  },

  // 获取我的服务列表
  getMyServices(params) {
    return axiosInstance.get('/api/v1/mobile/resident/services', { params });
  },

  // 更新账号安全设置
  updateSecuritySettings(data) {
    return axiosInstance.put('/api/v1/mobile/resident/security', data);
  },

  // 更新隐私设置
  updatePrivacySettings(data) {
    return axiosInstance.put('/api/v1/mobile/resident/privacy', data);
  },

  // 退出登录
  logout() {
    return axiosInstance.post('/api/v1/mobile/resident/logout');
  },
};

/**
 * 村民意见反馈API
 */
export const residentFeedbackApi = {
  // 获取反馈类型
  getFeedbackTypes() {
    return axiosInstance.get('/api/v1/mobile/resident/feedback/types');
  },

  // 提交反馈
  submitFeedback(data, attachments = null) {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      formData.append(key, data[key]);
    });

    if (attachments && attachments.length > 0) {
      attachments.forEach(file => {
        formData.append('attachments', file);
      });
    }

    return axiosInstance.post('/api/v1/mobile/resident/feedback', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // 获取我的反馈历史
  getMyFeedbackHistory(params) {
    return axiosInstance.get('/api/v1/mobile/resident/feedback/history', { params });
  },

  // 获取反馈详情
  getFeedbackDetail(feedbackId) {
    return axiosInstance.get(`/api/v1/mobile/resident/feedback/${feedbackId}`);
  },

  // 上传反馈图片
  uploadFeedbackImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    return axiosInstance.post('/api/v1/mobile/resident/feedback/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // 获取反馈状态选项
  getStatusOptions() {
    return Promise.resolve([
      { label: '待处理', value: 'pending', type: 'warning' },
      { label: '处理中', value: 'in_progress', type: 'primary' },
      { label: '已完成', value: 'completed', type: 'success' },
      { label: '已关闭', value: 'closed', type: 'info' },
    ]);
  },
};

/**
 * ============================================
 * 2. 村干部角色 API (Village Cadre)
 * ============================================
 */

/**
 * 村民管理API（村干部端）
 */
export const villageCadreResidentsApi = {
  // 获取村民列表
  getResidentsList(params) {
    return axiosInstance.get('/api/v1/mobile/village-cadre/residents', { params });
  },

  // 搜索村民
  searchResidents(keyword, params = {}) {
    return axiosInstance.get('/api/v1/mobile/village-cadre/residents/search', {
      params: { keyword, ...params },
    });
  },

  // 按标签筛选村民
  filterByTag(tag, params = {}) {
    return axiosInstance.get('/api/v1/mobile/village-cadre/residents/filter', {
      params: { tag, ...params },
    });
  },

  // 获取村民详情
  getResidentDetail(residentId) {
    return axiosInstance.get(`/api/v1/mobile/village-cadre/residents/${residentId}`);
  },

  // 创建村民
  createResident(data) {
    return axiosInstance.post('/api/v1/mobile/village-cadre/residents', data);
  },

  // 更新村民信息
  updateResident(residentId, data) {
    return axiosInstance.put(`/api/v1/mobile/village-cadre/residents/${residentId}`, data);
  },

  // 删除村民
  deleteResident(residentId) {
    return axiosInstance.delete(`/api/v1/mobile/village-cadre/residents/${residentId}`);
  },

  // 批量导入村民
  importResidents(file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(options).forEach(key => {
      formData.append(key, options[key]);
    });
    return axiosInstance.post('/api/v1/mobile/village-cadre/residents/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // 导出村民数据
  exportResidents(params = {}) {
    return axiosInstance.get('/api/v1/mobile/village-cadre/residents/export', {
      params,
      responseType: 'blob',
    });
  },

  // 添加特殊标签
  addSpecialTag(residentId, data) {
    return axiosInstance.post(
      `/api/v1/mobile/village-cadre/residents/${residentId}/tags`,
      data
    );
  },

  // 移除特殊标签
  removeSpecialTag(residentId, tagType) {
    return axiosInstance.delete(
      `/api/v1/mobile/village-cadre/residents/${residentId}/tags/${tagType}`
    );
  },

  // 获取村民统计
  getResidentsStatistics(params) {
    return axiosInstance.get('/api/v1/mobile/village-cadre/residents/statistics', { params });
  },

  // 获取标签选项
  getTagOptions() {
    return Promise.resolve([
      { label: '全部', value: 'all', color: '#909399' },
      { label: '低保户', value: 'low_income', color: '#F56C6C' },
      { label: '独居老人', value: 'elderly_living_alone', color: '#E6A23C' },
      { label: '残疾人', value: 'disabled', color: '#409EFF' },
      { label: '党员', value: 'party_member', color: '#F56C6C' },
      { label: '退役军人', value: 'veteran', color: '#67C23A' },
    ]);
  },

  // 联系村民（发送短信/通知）
  contactResident(residentId, data) {
    return axiosInstance.post(
      `/api/v1/mobile/village-cadre/residents/${residentId}/contact`,
      data
    );
  },
};

/**
 * ============================================
 * 3. 采购商角色 API (Purchaser)
 * ============================================
 */

/**
 * 供应商管理API
 */
export const purchaserSuppliersApi = {
  // 获取供应商列表
  getSuppliersList(params) {
    return axiosInstance.get('/api/v1/mobile/purchaser/suppliers', { params });
  },

  // 搜索供应商
  searchSuppliers(keyword, params = {}) {
    return axiosInstance.get('/api/v1/mobile/purchaser/suppliers/search', {
      params: { keyword, ...params },
    });
  },

  // 按分类筛选
  filterByCategory(category, params = {}) {
    return axiosInstance.get('/api/v1/mobile/purchaser/suppliers/filter', {
      params: { category, ...params },
    });
  },

  // 获取供应商详情
  getSupplierDetail(supplierId) {
    return axiosInstance.get(`/api/v1/mobile/purchaser/suppliers/${supplierId}`);
  },

  // 创建供应商
  createSupplier(data) {
    return axiosInstance.post('/api/v1/mobile/purchaser/suppliers', data);
  },

  // 更新供应商信息
  updateSupplier(supplierId, data) {
    return axiosInstance.put(`/api/v1/mobile/purchaser/suppliers/${supplierId}`, data);
  },

  // 删除供应商
  deleteSupplier(supplierId) {
    return axiosInstance.delete(`/api/v1/mobile/purchaser/suppliers/${supplierId}`);
  },

  // 获取供应商产品列表
  getSupplierProducts(supplierId, params = {}) {
    return axiosInstance.get(
      `/api/v1/mobile/purchaser/suppliers/${supplierId}/products`,
      { params }
    );
  },

  // 获取供应商评价
  getSupplierReviews(supplierId, params = {}) {
    return axiosInstance.get(
      `/api/v1/mobile/purchaser/suppliers/${supplierId}/reviews`,
      { params }
    );
  },

  // 添加供应商评价
  addSupplierReview(supplierId, data) {
    return axiosInstance.post(
      `/api/v1/mobile/purchaser/suppliers/${supplierId}/reviews`,
      data
    );
  },

  // 更新合作状态
  updateCooperationStatus(supplierId, data) {
    return axiosInstance.put(
      `/api/v1/mobile/purchaser/suppliers/${supplierId}/cooperation`,
      data
    );
  },

  // 获取供应商统计
  getSuppliersStatistics(params) {
    return axiosInstance.get('/api/v1/mobile/purchaser/suppliers/statistics', { params });
  },

  // 获取分类选项
  getCategoryOptions() {
    return Promise.resolve([
      { label: '全部', value: 'all' },
      { label: '农产品', value: 'agriculture' },
      { label: '手工艺品', value: 'handicraft' },
      { label: '食品加工', value: 'food_processing' },
      { label: '其他', value: 'other' },
    ]);
  },

  // 获取合作状态选项
  getCooperationOptions() {
    return Promise.resolve([
      { label: '全部', value: 'all', type: '' },
      { label: '合作中', value: 'cooperating', type: 'success' },
      { label: '待审核', value: 'pending', type: 'warning' },
      { label: '已暂停', value: 'suspended', type: 'danger' },
      { label: '已结束', value: 'ended', type: 'info' },
    ]);
  },

  // 联系供应商
  contactSupplier(supplierId, data) {
    return axiosInstance.post(
      `/api/v1/mobile/purchaser/suppliers/${supplierId}/contact`,
      data
    );
  },
};

/**
 * ============================================
 * 4. 乡镇干部角色 API (Township Official)
 * ============================================
 */

/**
 * 审核管理API
 */
export const townshipAuditApi = {
  // 获取待审核列表
  getPendingAudits(params) {
    return axiosInstance.get('/api/v1/mobile/township/audit/pending', { params });
  },

  // 获取所有审核列表
  getAllAudits(params) {
    return axiosInstance.get('/api/v1/mobile/township/audit', { params });
  },

  // 按类型筛选
  filterByType(type, params = {}) {
    return axiosInstance.get('/api/v1/mobile/township/audit/filter', {
      params: { type, ...params },
    });
  },

  // 获取审核详情
  getAuditDetail(auditId) {
    return axiosInstance.get(`/api/v1/mobile/township/audit/${auditId}`);
  },

  // 通过审核
  approveAudit(auditId, data) {
    return axiosInstance.post(`/api/v1/mobile/township/audit/${auditId}/approve`, data);
  },

  // 驳回审核
  rejectAudit(auditId, data) {
    return axiosInstance.post(`/api/v1/mobile/township/audit/${auditId}/reject`, data);
  },

  // 批量审核
  batchAudit(data) {
    return axiosInstance.post('/api/v1/mobile/township/audit/batch', data);
  },

  // 获取审核统计
  getAuditStatistics(params) {
    return axiosInstance.get('/api/v1/mobile/township/audit/statistics', { params });
  },

  // 获取审核历史
  getAuditHistory(params) {
    return axiosInstance.get('/api/v1/mobile/township/audit/history', { params });
  },

  // 获取审核类型选项
  getAuditTypeOptions() {
    return Promise.resolve([
      { label: '全部', value: 'all', icon: 'Document' },
      { label: '用户注册', value: 'user_registration', icon: 'User' },
      { label: '项目申报', value: 'project_application', icon: 'FolderOpened' },
      { label: '资金申请', value: 'fund_application', icon: 'Money' },
      { label: '村务公开', value: 'village_affair', icon: 'OfficeBuilding' },
      { label: '财务报告', value: 'financial_report', icon: 'DataAnalysis' },
    ]);
  },

  // 获取优先级选项
  getPriorityOptions() {
    return Promise.resolve([
      { label: '全部', value: 'all', level: 0 },
      { label: '低', value: 'low', level: 1 },
      { label: '中', value: 'medium', level: 2 },
      { label: '高', value: 'high', level: 3 },
      { label: '紧急', value: 'urgent', level: 4 },
    ]);
  },

  // 获取状态选项
  getStatusOptions() {
    return Promise.resolve([
      { label: '待审核', value: 'pending', type: 'warning' },
      { label: '已通过', value: 'approved', type: 'success' },
      { label: '已驳回', value: 'rejected', type: 'danger' },
      { label: '处理中', value: 'in_progress', type: 'primary' },
    ]);
  },

  // 转交审核
  transferAudit(auditId, data) {
    return axiosInstance.post(`/api/v1/mobile/township/audit/${auditId}/transfer`, data);
  },

  // 添加审核备注
  addAuditNote(auditId, data) {
    return axiosInstance.post(`/api/v1/mobile/township/audit/${auditId}/notes`, data);
  },
};

/**
 * ============================================
 * 5. 管理员角色 API (Admin)
 * ============================================
 */

/**
 * 用户管理API
 */
export const adminUsersApi = {
  // 获取用户列表
  getUsersList(params) {
    return axiosInstance.get('/api/v1/mobile/admin/users', { params });
  },

  // 搜索用户
  searchUsers(keyword, params = {}) {
    return axiosInstance.get('/api/v1/mobile/admin/users/search', {
      params: { keyword, ...params },
    });
  },

  // 按角色筛选
  filterByRole(role, params = {}) {
    return axiosInstance.get('/api/v1/mobile/admin/users/filter', {
      params: { role, ...params },
    });
  },

  // 获取用户详情
  getUserDetail(userId) {
    return axiosInstance.get(`/api/v1/mobile/admin/users/${userId}`);
  },

  // 创建用户
  createUser(data) {
    return axiosInstance.post('/api/v1/mobile/admin/users', data);
  },

  // 更新用户信息
  updateUser(userId, data) {
    return axiosInstance.put(`/api/v1/mobile/admin/users/${userId}`, data);
  },

  // 删除用户
  deleteUser(userId) {
    return axiosInstance.delete(`/api/v1/mobile/admin/users/${userId}`);
  },

  // 启用/禁用用户
  toggleUserStatus(userId, data) {
    return axiosInstance.put(`/api/v1/mobile/admin/users/${userId}/status`, data);
  },

  // 重置用户密码
  resetUserPassword(userId, data) {
    return axiosInstance.post(`/api/v1/mobile/admin/users/${userId}/reset-password`, data);
  },

  // 获取用户角色
  getUserRoles(userId) {
    return axiosInstance.get(`/api/v1/mobile/admin/users/${userId}/roles`);
  },

  // 更新用户角色
  updateUserRoles(userId, data) {
    return axiosInstance.put(`/api/v1/mobile/admin/users/${userId}/roles`, data);
  },

  // 获取用户权限
  getUserPermissions(userId) {
    return axiosInstance.get(`/api/v1/mobile/admin/users/${userId}/permissions`);
  },

  // 更新用户权限
  updateUserPermissions(userId, data) {
    return axiosInstance.put(`/api/v1/mobile/admin/users/${userId}/permissions`, data);
  },

  // 获取用户统计
  getUsersStatistics(params) {
    return axiosInstance.get('/api/v1/mobile/admin/users/statistics', { params });
  },

  // 批量导入用户
  importUsers(file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(options).forEach(key => {
      formData.append(key, options[key]);
    });
    return axiosInstance.post('/api/v1/mobile/admin/users/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // 导出用户数据
  exportUsers(params = {}) {
    return axiosInstance.get('/api/v1/mobile/admin/users/export', {
      params,
      responseType: 'blob',
    });
  },

  // 获取角色选项
  getRoleOptions() {
    return Promise.resolve([
      { label: '全部', value: 'all', type: '' },
      { label: '村民', value: 'resident', type: 'primary' },
      { label: '村干部', value: 'village_cadre', type: 'success' },
      { label: '采购商', value: 'purchaser', type: 'warning' },
      { label: '乡镇干部', value: 'township_official', type: 'danger' },
      { label: '管理员', value: 'admin', type: 'info' },
    ]);
  },

  // 获取状态选项
  getStatusOptions() {
    return Promise.resolve([
      { label: '全部', value: 'all', type: '' },
      { label: '正常', value: 'active', type: 'success' },
      { label: '禁用', value: 'disabled', type: 'danger' },
      { label: '待审核', value: 'pending', type: 'warning' },
    ]);
  },

  // 发送通知给用户
  sendNotification(userId, data) {
    return axiosInstance.post(`/api/v1/mobile/admin/users/${userId}/notify`, data);
  },
};

/**
 * ============================================
 * 通用API - 所有角色共享
 * ============================================
 */

/**
 * 文件上传API
 */
export const uploadApi = {
  // 上传图片
  uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    return axiosInstance.post('/api/v1/mobile/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // 上传文件
  uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    return axiosInstance.post('/api/v1/mobile/upload/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // 批量上传
  uploadMultipleFiles(files) {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    return axiosInstance.post('/api/v1/mobile/upload/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // 删除文件
  deleteFile(fileId) {
    return axiosInstance.delete(`/api/v1/mobile/upload/file/${fileId}`);
  },
};

/**
 * 通知API
 */
export const notificationApi = {
  // 获取未读通知数量
  getUnreadCount() {
    return axiosInstance.get('/api/v1/mobile/notifications/unread-count');
  },

  // 获取通知列表
  getNotifications(params) {
    return axiosInstance.get('/api/v1/mobile/notifications', { params });
  },

  // 标记为已读
  markAsRead(notificationId) {
    return axiosInstance.put(`/api/v1/mobile/notifications/${notificationId}/read`);
  },

  // 标记全部已读
  markAllAsRead() {
    return axiosInstance.put('/api/v1/mobile/notifications/read-all');
  },

  // 删除通知
  deleteNotification(notificationId) {
    return axiosInstance.delete(`/api/v1/mobile/notifications/${notificationId}`);
  },
};

/**
 * 统计数据API
 */
export const statisticsApi = {
  // 获取首页统计数据
  getDashboardStats(params) {
    return axiosInstance.get('/api/v1/mobile/statistics/dashboard', { params });
  },

  // 获取趋势数据
  getTrendData(type, params = {}) {
    return axiosInstance.get(`/api/v1/mobile/statistics/trend/${type}`, { params });
  },
};

// ============================================
// 统一导出
// ============================================

export default {
  // 村民
  residentProfile: residentProfileApi,
  residentFeedback: residentFeedbackApi,

  // 村干部
  villageCadreResidents: villageCadreResidentsApi,

  // 采购商
  purchaserSuppliers: purchaserSuppliersApi,

  // 乡镇干部
  townshipAudit: townshipAuditApi,

  // 管理员
  adminUsers: adminUsersApi,

  // 通用
  upload: uploadApi,
  notification: notificationApi,
  statistics: statisticsApi,
};
