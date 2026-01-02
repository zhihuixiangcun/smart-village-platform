import axios from 'axios'

// Vite 使用 import.meta.env 而不是 process.env
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

// 创建axios实例
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 添加认证令牌
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 处理通用错误
api.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    if (error.response?.status === 401) {
      // 登录过期，清除token并重定向到登录页
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error.response?.data || error)
  }
)

/**
 * 农业知识分享API
 */
export const agricultureApi = {
  // 获取帖子列表
  getPosts(params) {
    return api.get('/api/v1/agriculture/posts', { params })
  },

  // 获取帖子详情
  getPostById(id) {
    return api.get(`/api/v1/agriculture/posts/${id}`)
  },

  // 创建帖子
  createPost(data) {
    return api.post('/api/v1/agriculture/posts', data)
  },

  // 更新帖子
  updatePost(id, data) {
    return api.put(`/api/v1/agriculture/posts/${id}`, data)
  },

  // 删除帖子
  deletePost(id) {
    return api.delete(`/api/v1/agriculture/posts/${id}`)
  },

  // 发布帖子
  publishPost(id) {
    return api.put(`/api/v1/agriculture/posts/${id}/publish`)
  },

  // 点赞帖子
  likePost(id) {
    return api.post(`/api/v1/agriculture/posts/${id}/like`)
  },

  // 标记有用
  markUseful(id, data) {
    return api.post(`/api/v1/agriculture/posts/${id}/useful`, data)
  },

  // 获取热门帖子
  getPopularPosts(params) {
    return api.get('/api/v1/agriculture/popular', { params })
  },

  // 获取专家认证帖子
  getExpertVerifiedPosts(params) {
    return api.get('/api/v1/agriculture/expert-verified', { params })
  },

  // 搜索帖子
  searchPosts(params) {
    return api.get('/api/v1/agriculture/search', { params })
  },

  // 获取标签云
  getTagCloud(params) {
    return api.get('/api/v1/agriculture/tags', { params })
  },

  // 获取统计数据
  getStatistics(params) {
    return api.get('/api/v1/agriculture/statistics', { params })
  },

  // 专家认证
  verifyPost(id, data) {
    return api.post(`/api/v1/agriculture/posts/${id}/verify`, data)
  }
}

/**
 * 朋友圈API
 */
export const socialApi = {
  // 获取动态列表
  getPosts(params) {
    return api.get('/api/v1/social/posts', { params })
  },

  // 获取动态详情
  getPostById(id) {
    return api.get(`/api/v1/social/posts/${id}`)
  },

  // 创建动态
  createPost(data) {
    return api.post('/api/v1/social/posts', data)
  },

  // 更新动态
  updatePost(id, data) {
    return api.put(`/api/v1/social/posts/${id}`, data)
  },

  // 删除动态
  deletePost(id) {
    return api.delete(`/api/v1/social/posts/${id}`)
  },

  // 点赞动态
  likePost(id) {
    return api.post(`/api/v1/social/posts/${id}/like`)
  },

  // 取消点赞
  unlikePost(id) {
    return api.post(`/api/v1/social/posts/${id}/unlike`)
  },

  // 分享动态
  sharePost(id, data) {
    return api.post(`/api/v1/social/posts/${id}/share`, data)
  },

  // 获取评论列表
  getComments(id, params) {
    return api.get(`/api/v1/social/posts/${id}/comments`, { params })
  },

  // 添加评论
  addComment(id, data) {
    return api.post(`/api/v1/social/posts/${id}/comments`, data)
  },

  // 删除评论
  deleteComment(postId, commentId) {
    return api.delete(`/api/v1/social/posts/${postId}/comments/${commentId}`)
  },

  // 关注用户
  followUser(userId) {
    return api.post(`/api/v1/social/follow/${userId}`)
  },

  // 取消关注
  unfollowUser(userId) {
    return api.post(`/api/v1/social/unfollow/${userId}`)
  },

  // 获取关注列表
  getFollowing(userId, params) {
    return api.get(`/api/v1/social/following/${userId}`, { params })
  },

  // 获取粉丝列表
  getFollowers(userId, params) {
    return api.get(`/api/v1/social/followers/${userId}`, { params })
  },

  // 获取好友列表
  getFriends(userId, params) {
    return api.get(`/api/v1/social/friends/${userId}`, { params })
  },

  // 获取个性化推荐流
  getPersonalizedFeed(params) {
    return api.get('/api/v1/social/feed', { params })
  },

  // 获取热门话题
  getTrendingTopics(params) {
    return api.get('/api/v1/social/topics/trending', { params })
  },

  // 创建话题
  createTopic(data) {
    return api.post('/api/v1/social/topics', data)
  }
}

/**
 * 拼车服务API
 */
export const carpoolApi = {
  // 获取拼车行程列表
  getTrips(params) {
    return api.get('/api/v1/carpool/trips', { params })
  },

  // 获取行程详情
  getTripById(id) {
    return api.get(`/api/v1/carpool/trips/${id}`)
  },

  // 创建拼车行程
  createTrip(data) {
    return api.post('/api/v1/carpool/trips', data)
  },

  // 更新行程
  updateTrip(id, data) {
    return api.put(`/api/v1/carpool/trips/${id}`, data)
  },

  // 取消行程
  cancelTrip(id, data) {
    return api.post(`/api/v1/carpool/trips/${id}/cancel`, data)
  },

  // 加入拼车
  joinTrip(id, data) {
    return api.post(`/api/v1/carpool/trips/${id}/join`, data)
  },

  // 确认乘客
  confirmPassenger(tripId, passengerId) {
    return api.post(`/api/v1/carpool/trips/${tripId}/passengers/${passengerId}/confirm`)
  },

  // 取消乘客
  cancelPassenger(tripId, passengerId) {
    return api.delete(`/api/v1/carpool/trips/${tripId}/passengers/${passengerId}`)
  },

  // 开始行程
  startTrip(id) {
    return api.post(`/api/v1/carpool/trips/${id}/start`)
  },

  // 完成行程
  completeTrip(id, data) {
    return api.post(`/api/v1/carpool/trips/${id}/complete`, data)
  },

  // 查找附近拼车
  findNearby(params) {
    return api.get('/api/v1/carpool/nearby', { params })
  },

  // 智能匹配
  smartMatch(data) {
    return api.post('/api/v1/carpool/match', data)
  }
}

/**
 * 村委管理API
 */
export const committeeApi = {
  // 获取村委成员列表
  getMembers(params) {
    return api.get('/api/v1/committee/members', { params })
  },

  // 获取成员详情
  getMemberById(id, params) {
    return api.get(`/api/v1/committee/members/${id}`, { params })
  },

  // 创建成员
  createMember(data) {
    return api.post('/api/v1/committee/members', data)
  },

  // 更新成员
  updateMember(id, data) {
    return api.put(`/api/v1/committee/members/${id}`, data)
  },

  // 删除成员
  deleteMember(id) {
    return api.delete(`/api/v1/committee/members/${id}`)
  },

  // 变更职务
  changePosition(id, data) {
    return api.post(`/api/v1/committee/members/${id}/position/change`, data)
  },

  // 添加角色
  addRole(id, data) {
    return api.post(`/api/v1/committee/members/${id}/roles`, data)
  },

  // 移除角色
  removeRole(id, roleType, data) {
    return api.delete(`/api/v1/committee/members/${id}/roles/${roleType}`, { data })
  },

  // 获取统计
  getStatistics(params) {
    return api.get('/api/v1/committee/statistics', { params })
  },

  // 获取党员列表
  getPartyMembers(params) {
    return api.get('/api/v1/committee/party-members', { params })
  },

  // 按职务查询
  getByPosition(params) {
    return api.get('/api/v1/committee/positions', { params })
  },

  // 搜索成员
  searchMembers(params) {
    return api.get('/api/v1/committee/members/search', { params })
  },

  // 导出成员
  exportMembers(params) {
    return api.get('/api/v1/committee/members/export', {
      params,
      responseType: 'blob'
    })
  }
}

/**
 * Dashboard/工作台API
 */
export const dashboardApi = {
  // 获取统计数据
  getStatistics(params) {
    return api.get('/api/v1/dashboard/statistics', { params })
  },

  // 获取系统健康状态
  getHealthStatus() {
    return api.get('/health')
  },

  // 获取村民统计
  getResidentStats(params) {
    return api.get('/api/v1/residents/statistics', { params })
  },

  // 获取公告统计
  getAnnouncementStats(params) {
    return api.get('/api/v1/announcements/statistics', { params })
  },

  // 获取村务统计
  getGovernanceStats(params) {
    return api.get('/api/v1/governance/statistics', { params })
  },

  // 获取财务统计
  getFinanceStats(params) {
    return api.get('/api/v1/finance/statistics', { params })
  },

  // 获取应急事件统计
  getEmergencyStats(params) {
    return api.get('/api/v1/emergency/statistics', { params })
  },

  // 获取服务统计
  getServiceStats(params) {
    return api.get('/api/v1/services/statistics', { params })
  }
}

export default {
  agriculture: agricultureApi,
  social: socialApi,
  carpool: carpoolApi,
  committee: committeeApi,
  dashboard: dashboardApi
}
