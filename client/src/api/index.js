import axios from 'axios';

// Vite 使用 import.meta.env 而不是 process.env
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// 创建axios实例
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证令牌
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理通用错误
api.interceptors.response.use(
  response => {
    return response.data;
  },
  error => {
    if (error.response?.status === 401) {
      // 登录过期，清除token并重定向到登录页
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

/**
 * 农业知识分享API
 */
export const agricultureApi = {
  // 获取帖子列表
  getPosts(params) {
    return api.get('/api/v1/agriculture/posts', { params });
  },

  // 获取帖子详情
  getPostById(id) {
    return api.get(`/api/v1/agriculture/posts/${id}`);
  },

  // 创建帖子
  createPost(data) {
    return api.post('/api/v1/agriculture/posts', data);
  },

  // 更新帖子
  updatePost(id, data) {
    return api.put(`/api/v1/agriculture/posts/${id}`, data);
  },

  // 删除帖子
  deletePost(id) {
    return api.delete(`/api/v1/agriculture/posts/${id}`);
  },

  // 发布帖子
  publishPost(id) {
    return api.put(`/api/v1/agriculture/posts/${id}/publish`);
  },

  // 点赞帖子
  likePost(id) {
    return api.post(`/api/v1/agriculture/posts/${id}/like`);
  },

  // 标记有用
  markUseful(id, data) {
    return api.post(`/api/v1/agriculture/posts/${id}/useful`, data);
  },

  // 获取热门帖子
  getPopularPosts(params) {
    return api.get('/api/v1/agriculture/popular', { params });
  },

  // 获取专家认证帖子
  getExpertVerifiedPosts(params) {
    return api.get('/api/v1/agriculture/expert-verified', { params });
  },

  // 搜索帖子
  searchPosts(params) {
    return api.get('/api/v1/agriculture/search', { params });
  },

  // 获取标签云
  getTagCloud(params) {
    return api.get('/api/v1/agriculture/tags', { params });
  },

  // 获取统计数据
  getStatistics(params) {
    return api.get('/api/v1/agriculture/statistics', { params });
  },

  // 专家认证
  verifyPost(id, data) {
    return api.post(`/api/v1/agriculture/posts/${id}/verify`, data);
  },
};

/**
 * 朋友圈API
 */
export const socialApi = {
  // 获取动态列表
  getPosts(params) {
    return api.get('/api/v1/social/posts', { params });
  },

  // 获取动态详情
  getPostById(id) {
    return api.get(`/api/v1/social/posts/${id}`);
  },

  // 创建动态
  createPost(data) {
    return api.post('/api/v1/social/posts', data);
  },

  // 更新动态
  updatePost(id, data) {
    return api.put(`/api/v1/social/posts/${id}`, data);
  },

  // 删除动态
  deletePost(id) {
    return api.delete(`/api/v1/social/posts/${id}`);
  },

  // 点赞动态
  likePost(id) {
    return api.post(`/api/v1/social/posts/${id}/like`);
  },

  // 取消点赞
  unlikePost(id) {
    return api.post(`/api/v1/social/posts/${id}/unlike`);
  },

  // 分享动态
  sharePost(id, data) {
    return api.post(`/api/v1/social/posts/${id}/share`, data);
  },

  // 获取评论列表
  getComments(id, params) {
    return api.get(`/api/v1/social/posts/${id}/comments`, { params });
  },

  // 添加评论
  addComment(id, data) {
    return api.post(`/api/v1/social/posts/${id}/comments`, data);
  },

  // 删除评论
  deleteComment(postId, commentId) {
    return api.delete(`/api/v1/social/posts/${postId}/comments/${commentId}`);
  },

  // 关注用户
  followUser(userId) {
    return api.post(`/api/v1/social/follow/${userId}`);
  },

  // 取消关注
  unfollowUser(userId) {
    return api.post(`/api/v1/social/unfollow/${userId}`);
  },

  // 获取关注列表
  getFollowing(userId, params) {
    return api.get(`/api/v1/social/following/${userId}`, { params });
  },

  // 获取粉丝列表
  getFollowers(userId, params) {
    return api.get(`/api/v1/social/followers/${userId}`, { params });
  },

  // 获取好友列表
  getFriends(userId, params) {
    return api.get(`/api/v1/social/friends/${userId}`, { params });
  },

  // 获取个性化推荐流
  getPersonalizedFeed(params) {
    return api.get('/api/v1/social/feed', { params });
  },

  // 获取热门话题
  getTrendingTopics(params) {
    return api.get('/api/v1/social/topics/trending', { params });
  },

  // 创建话题
  createTopic(data) {
    return api.post('/api/v1/social/topics', data);
  },
};

/**
 * 拼车服务API
 */
export const carpoolApi = {
  // 获取拼车行程列表
  getTrips(params) {
    return api.get('/api/v1/carpool/trips', { params });
  },

  // 获取行程详情
  getTripById(id) {
    return api.get(`/api/v1/carpool/trips/${id}`);
  },

  // 创建拼车行程
  createTrip(data) {
    return api.post('/api/v1/carpool/trips', data);
  },

  // 更新行程
  updateTrip(id, data) {
    return api.put(`/api/v1/carpool/trips/${id}`, data);
  },

  // 取消行程
  cancelTrip(id, data) {
    return api.post(`/api/v1/carpool/trips/${id}/cancel`, data);
  },

  // 加入拼车
  joinTrip(id, data) {
    return api.post(`/api/v1/carpool/trips/${id}/join`, data);
  },

  // 确认乘客
  confirmPassenger(tripId, passengerId) {
    return api.post(`/api/v1/carpool/trips/${tripId}/passengers/${passengerId}/confirm`);
  },

  // 取消乘客
  cancelPassenger(tripId, passengerId) {
    return api.delete(`/api/v1/carpool/trips/${tripId}/passengers/${passengerId}`);
  },

  // 开始行程
  startTrip(id) {
    return api.post(`/api/v1/carpool/trips/${id}/start`);
  },

  // 完成行程
  completeTrip(id, data) {
    return api.post(`/api/v1/carpool/trips/${id}/complete`, data);
  },

  // 查找附近拼车
  findNearby(params) {
    return api.get('/api/v1/carpool/nearby', { params });
  },

  // 智能匹配
  smartMatch(data) {
    return api.post('/api/v1/carpool/match', data);
  },
};

/**
 * 村委管理API
 */
export const committeeApi = {
  // 获取村委成员列表
  getMembers(params) {
    return api.get('/api/v1/committee/members', { params });
  },

  // 获取成员详情
  getMemberById(id, params) {
    return api.get(`/api/v1/committee/members/${id}`, { params });
  },

  // 创建成员
  createMember(data) {
    return api.post('/api/v1/committee/members', data);
  },

  // 更新成员
  updateMember(id, data) {
    return api.put(`/api/v1/committee/members/${id}`, data);
  },

  // 删除成员
  deleteMember(id) {
    return api.delete(`/api/v1/committee/members/${id}`);
  },

  // 变更职务
  changePosition(id, data) {
    return api.post(`/api/v1/committee/members/${id}/position/change`, data);
  },

  // 添加角色
  addRole(id, data) {
    return api.post(`/api/v1/committee/members/${id}/roles`, data);
  },

  // 移除角色
  removeRole(id, roleType, data) {
    return api.delete(`/api/v1/committee/members/${id}/roles/${roleType}`, { data });
  },

  // 获取统计
  getStatistics(params) {
    return api.get('/api/v1/committee/statistics', { params });
  },

  // 获取党员列表
  getPartyMembers(params) {
    return api.get('/api/v1/committee/party-members', { params });
  },

  // 按职务查询
  getByPosition(params) {
    return api.get('/api/v1/committee/positions', { params });
  },

  // 搜索成员
  searchMembers(params) {
    return api.get('/api/v1/committee/members/search', { params });
  },

  // 导出成员
  exportMembers(params) {
    return api.get('/api/v1/committee/members/export', {
      params,
      responseType: 'blob',
    });
  },
};

/**
 * 批量导入API
 */
export const batchImportApi = {
  // 批量导入村民
  importResidents(file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    if (options.villageId) formData.append('villageId', options.villageId);
    if (options.skipDuplicates !== undefined)
      formData.append('skipDuplicates', options.skipDuplicates);
    if (options.updateExisting !== undefined)
      formData.append('updateExisting', options.updateExisting);

    return api.post('/api/v1/batch-import/residents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: options.onProgress,
    });
  },

  // 获取导入任务状态
  getImportStatus(taskId) {
    return api.get(`/api/v1/batch-import/status/${taskId}`);
  },

  // 获取导入历史
  getImportHistory(params) {
    return api.get('/api/v1/batch-import/history', { params });
  },

  // 获取导入模板
  getImportTemplate(type) {
    return api.get(`/api/v1/batch-import/template/${type}`, {
      responseType: 'blob',
    });
  },

  // 取消导入任务
  cancelImport(taskId) {
    return api.post(`/api/v1/batch-import/cancel/${taskId}`);
  },

  // 下载导入报告
  downloadReport(taskId) {
    return api.get(`/api/v1/batch-import/report/${taskId}`, {
      responseType: 'blob',
    });
  },

  // 验证数据
  validateData(file, type) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return api.post('/api/v1/batch-import/validate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

/**
 * 证件包API
 */
export const documentApi = {
  // 获取我的证件
  getMyDocuments() {
    return api.get('/api/v1/documents/my');
  },

  // 获取证件列表
  getDocuments(params) {
    return api.get('/api/v1/documents', { params });
  },

  // 上传证件
  uploadDocument(formData) {
    return api.post('/api/v1/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // 获取证件详情
  getDocumentById(id) {
    return api.get(`/api/v1/documents/${id}`);
  },

  // 更新证件
  updateDocument(id, data) {
    return api.put(`/api/v1/documents/${id}`, data);
  },

  // 删除证件
  deleteDocument(id) {
    return api.delete(`/api/v1/documents/${id}`);
  },

  // 分享证件
  shareDocument(id, data) {
    return api.post(`/api/v1/documents/${id}/share`, data);
  },

  // 下载证件
  downloadDocument(id) {
    return api.get(`/api/v1/documents/${id}/download`, {
      responseType: 'blob',
    });
  },

  // 验证证件
  verifyDocument(id, data) {
    return api.post(`/api/v1/documents/${id}/verify`, data);
  },

  // 获取证件统计
  getStatistics() {
    return api.get('/api/v1/documents/statistics');
  },
};

/**
 * Dashboard/工作台API
 */
export const dashboardApi = {
  // 获取综合统计数据
  getStatistics(params) {
    return api.get('/api/v1/dashboard/statistics', { params });
  },

  // 获取系统健康状态
  getHealthStatus() {
    return api.get('/health');
  },

  // 获取村民统计
  getResidentStats(params) {
    return api.get('/api/v1/dashboard/residents', { params });
  },

  // 获取用户统计
  getUserStats(params) {
    return api.get('/api/v1/dashboard/users', { params });
  },

  // 获取公告统计
  getAnnouncementStats(params) {
    return api.get('/api/v1/dashboard/announcements', { params });
  },

  // 获取村务统计
  getGovernanceStats(params) {
    return api.get('/api/v1/dashboard/governance', { params });
  },

  // 获取财务统计
  getFinanceStats(params) {
    return api.get('/api/v1/dashboard/finance', { params });
  },

  // 获取应急事件统计
  getEmergencyStats(params) {
    return api.get('/api/v1/dashboard/emergency', { params });
  },

  // 获取服务统计
  getServiceStats(params) {
    return api.get('/api/v1/dashboard/services', { params });
  },
};

/**
 * 聊天API
 */
export const chatApi = {
  // 获取会话列表
  getConversations(params) {
    return api.get('/api/v1/chat/conversations', { params });
  },

  // 获取会话详情
  getConversation(id) {
    return api.get(`/api/v1/chat/conversations/${id}`);
  },

  // 创建会话
  createConversation(data) {
    return api.post('/api/v1/chat/conversations', data);
  },

  // 获取消息列表
  getMessages(conversationId, params) {
    return api.get(`/api/v1/chat/conversations/${conversationId}/messages`, { params });
  },

  // 发送消息
  sendMessage(conversationId, data) {
    return api.post(`/api/v1/chat/conversations/${conversationId}/messages`, data);
  },

  // 撤回消息
  recallMessage(conversationId, messageId) {
    return api.post(`/api/v1/chat/conversations/${conversationId}/messages/${messageId}/recall`);
  },

  // 标记已读
  markAsRead(conversationId, data) {
    return api.post(`/api/v1/chat/conversations/${conversationId}/read`, data);
  },

  // 上传图片
  uploadImage(conversationId, formData) {
    return api.post(`/api/v1/chat/conversations/${conversationId}/upload-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // 上传语音
  uploadVoice(conversationId, formData) {
    return api.post(`/api/v1/chat/conversations/${conversationId}/upload-voice`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // 获取未读数
  getUnreadCount() {
    return api.get('/api/v1/chat/unread-count');
  },

  // 置顶/取消置顶
  togglePin(conversationId) {
    return api.post(`/api/v1/chat/conversations/${conversationId}/pin`);
  },

  // 静音/取消静音
  toggleMute(conversationId) {
    return api.post(`/api/v1/chat/conversations/${conversationId}/mute`);
  },
};

/**
 * 好友API
 */
export const friendApi = {
  // 通过手机号搜索用户
  searchByPhone(phone) {
    return api.get(`/api/v1/friends/search/phone/${phone}`);
  },

  // 通过乡村号搜索用户
  searchByQRCode(qrcode) {
    return api.get(`/api/v1/friends/search/qrcode/${qrcode}`);
  },

  // 发送好友请求
  sendFriendRequest(data) {
    return api.post('/api/v1/friends/requests', data);
  },

  // 获取待处理的好友请求
  getPendingRequests() {
    return api.get('/api/v1/friends/requests/pending');
  },

  // 获取已发送的好友请求
  getSentRequests() {
    return api.get('/api/v1/friends/requests/sent');
  },

  // 接受好友请求
  acceptFriendRequest(requestId, data) {
    return api.put(`/api/v1/friends/requests/${requestId}/accept`, data);
  },

  // 拒绝好友请求
  declineFriendRequest(requestId, data) {
    return api.put(`/api/v1/friends/requests/${requestId}/decline`, data);
  },

  // 获取好友列表
  getFriends(params) {
    return api.get('/api/v1/friends', { params });
  },

  // 更新好友备注
  updateFriendAlias(friendId, data) {
    return api.put(`/api/v1/friends/${friendId}/alias`, data);
  },

  // 删除好友
  deleteFriend(friendId) {
    return api.delete(`/api/v1/friends/${friendId}`);
  },

  // 获取好友统计
  getFriendStats() {
    return api.get('/api/v1/friends/stats');
  },

  // 上传用户头像
  uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/api/v1/friends/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

/**
 * 村干部任务管理API
 */
export const cadreTaskApi = {
  // 获取任务列表
  getTasks(params) {
    return api.get('/api/v1/cadre-tasks', { params });
  },

  // 获取单个任务详情
  getTaskById(id) {
    return api.get(`/api/v1/cadre-tasks/${id}`);
  },

  // 获取象限任务
  getQuadrantTasks(villageId, quadrant, params = {}) {
    return api.get(`/api/v1/cadre-tasks/quadrant/${quadrant}`, {
      params: { villageId, ...params },
    });
  },

  // 获取我的任务
  getMyTasks(villageId, params = {}) {
    return api.get('/api/v1/cadre-tasks/my-tasks', {
      params: { villageId, ...params },
    });
  },

  // 获取统计数据
  getStatistics(params) {
    return api.get('/api/v1/cadre-tasks/statistics', { params });
  },

  // 创建任务
  createTask(data) {
    return api.post('/api/v1/cadre-tasks', data);
  },

  // 更新任务
  updateTask(id, data) {
    return api.put(`/api/v1/cadre-tasks/${id}`, data);
  },

  // 更新任务状态
  updateTaskStatus(id, data) {
    return api.put(`/api/v1/cadre-tasks/${id}/status`, data);
  },

  // 添加子任务
  addSubtask(id, data) {
    return api.post(`/api/v1/cadre-tasks/${id}/subtasks`, data);
  },

  // 完成子任务
  completeSubtask(taskId, subtaskId, data) {
    return api.put(`/api/v1/cadre-tasks/${taskId}/subtasks/${subtaskId}/complete`, data);
  },

  // 添加评论
  addComment(id, data) {
    return api.post(`/api/v1/cadre-tasks/${id}/comments`, data);
  },

  // 删除任务
  deleteTask(id) {
    return api.delete(`/api/v1/cadre-tasks/${id}`);
  },
};

/**
 * 公告发布API
 */
export const announcementApi = {
  // 获取公告列表
  getAnnouncements(params) {
    return api.get('/api/v1/governance/announcements', { params });
  },

  // 获取公告详情
  getAnnouncementById(id) {
    return api.get(`/api/v1/governance/announcements/${id}`);
  },

  // 创建公告
  createAnnouncement(data) {
    return api.post('/api/v1/governance/announcements', data);
  },

  // 更新公告
  updateAnnouncement(id, data) {
    return api.put(`/api/v1/governance/announcements/${id}`, data);
  },

  // 删除公告
  deleteAnnouncement(id) {
    return api.delete(`/api/v1/governance/announcements/${id}`);
  },

  // 发布公告
  publishAnnouncement(id) {
    return api.put(`/api/v1/governance/announcements/${id}/publish`);
  },

  // 获取公告分类
  getCategories() {
    return api.get('/api/v1/governance/announcements/categories');
  },
};

/**
 * 村务公开API
 */
export const governanceApi = {
  // 获取村务列表
  getGovernanceItems(params) {
    return api.get('/api/v1/governance', { params });
  },

  // 获取村务详情
  getGovernanceById(id) {
    return api.get(`/api/v1/governance/${id}`);
  },

  // 创建村务
  createGovernance(data) {
    return api.post('/api/v1/governance', data);
  },

  // 更新村务
  updateGovernance(id, data) {
    return api.put(`/api/v1/governance/${id}`, data);
  },

  // 删除村务
  deleteGovernance(id) {
    return api.delete(`/api/v1/governance/${id}`);
  },

  // 发布村务
  publishGovernance(id) {
    return api.put(`/api/v1/governance/${id}/publish`);
  },

  // 获取统计数据
  getStats(params) {
    return api.get('/api/v1/governance/stats', { params });
  },
};

/**
 * 财务公开API
 */
export const financePublicApi = {
  // 获取财务公开列表
  getFinanceItems(params) {
    return api.get('/api/v1/finance/public', { params });
  },

  // 获取财务公开详情
  getFinanceById(id) {
    return api.get(`/api/v1/finance/public/${id}`);
  },

  // 创建财务公开
  createFinance(data) {
    return api.post('/api/v1/finance/public', data);
  },

  // 更新财务公开
  updateFinance(id, data) {
    return api.put(`/api/v1/finance/public/${id}`, data);
  },

  // 删除财务公开
  deleteFinance(id) {
    return api.delete(`/api/v1/finance/public/${id}`);
  },

  // 发布财务公开
  publishFinance(id) {
    return api.put(`/api/v1/finance/public/${id}/publish`);
  },

  // 获取财务摘要
  getFinanceSummary(params) {
    return api.get('/api/v1/finance/village/summary', { params });
  },
};

/**
 * 内容审核API
 */
export const contentReviewApi = {
  // 获取待审核列表
  getPendingItems(params) {
    return api.get('/api/v1/content-review/pending', { params });
  },

  // 审核通过
  approveContent(type, id, data) {
    return api.post(`/api/v1/content-review/${type}/${id}/approve`, data);
  },

  // 审核拒绝
  rejectContent(type, id, data) {
    return api.post(`/api/v1/content-review/${type}/${id}/reject`, data);
  },

  // 批量审核
  batchReview(data) {
    return api.post('/api/v1/content-review/batch', data);
  },

  // 获取审核统计
  getReviewStats(params) {
    return api.get('/api/v1/content-review/stats', { params });
  },

  // 获取审核历史
  getReviewHistory(params) {
    return api.get('/api/v1/content-review/history', { params });
  },
};

/**
 * 统一认证API - 支持多角色和多登录方式
 */
export const authApi = {
  // 密码登录
  passwordLogin(data) {
    return api.post('/api/v1/auth/login', data);
  },

  // 发送验证码
  sendVerifyCode(data) {
    return api.post('/api/v1/auth/send-code', data);
  },

  // 重置密码 - 发送验证码
  sendResetCode(data) {
    return api.post('/api/v1/auth/reset-password/send-code', data);
  },

  // 重置密码 - 确认
  resetPassword(data) {
    return api.post('/api/v1/auth/reset-password/confirm', data);
  },

  // 用户注册
  register(data) {
    return api.post('/api/v1/auth/register', data);
  },

  // 人脸识别登录
  faceLogin(data) {
    return api.post('/api/v1/auth/face-login', data);
  },

  // 获取微信登录二维码
  getWechatQrCode(params) {
    return api.get('/api/v1/auth/wechat/qrcode', { params });
  },

  // 检查微信扫码状态
  checkWechatStatus(params) {
    return api.get('/api/v1/auth/wechat/status', { params });
  },

  // 获取当前用户信息
  getCurrentUser() {
    return api.get('/api/v1/auth/me');
  },

  // 退出登录
  logout() {
    return api.post('/api/v1/auth/logout');
  },

  // 刷新Token
  refreshToken() {
    return api.post('/api/v1/auth/refresh');
  },
};

// Export the axios instance as a named export for direct access
export { api as axiosInstance };

export default {
  agriculture: agricultureApi,
  social: socialApi,
  carpool: carpoolApi,
  committee: committeeApi,
  dashboard: dashboardApi,
  batchImport: batchImportApi,
  document: documentApi,
  chat: chatApi,
  friend: friendApi,
  cadreTask: cadreTaskApi,
  announcement: announcementApi,
  governance: governanceApi,
  financePublic: financePublicApi,
  contentReview: contentReviewApi,
  auth: authApi,
};
