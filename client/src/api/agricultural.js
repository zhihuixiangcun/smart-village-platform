import axios from 'axios'

const BASE_URL = process.env.VUE_APP_API_BASE_URL || 'http://localhost:3001'

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
    return response
  },
  error => {
    if (error.response?.status === 401) {
      // 登录过期，清除token并重定向到登录页
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default {
  // 获取帖子列表
  getPosts(params = {}) {
    return api.get('/api/v1/agricultural/posts', { params })
  },

  // 搜索帖子
  searchPosts(params = {}) {
    return api.get('/api/v1/agricultural/posts/search', { params })
  },

  // 获取帖子详情
  getPostById(postId) {
    return api.get(`/api/v1/agricultural/posts/${postId}`)
  },

  // 创建帖子
  createPost(postData) {
    return api.post('/api/v1/agricultural/posts', postData)
  },

  // 点赞/取消点赞帖子
  toggleLike(postId) {
    return api.post(`/api/v1/agricultural/posts/${postId}/like`)
  },

  // 收藏/取消收藏帖子
  toggleBookmark(postId) {
    return api.post(`/api/v1/agricultural/posts/${postId}/bookmark`)
  },

  // 投票（有用/无用）
  vote(postId, voteType) {
    return api.post(`/api/v1/agricultural/posts/${postId}/vote`, { voteType })
  },

  // 专家认证帖子
  verifyPost(postId, verificationLevel = 'expert_verified') {
    return api.post(`/api/v1/agricultural/posts/${postId}/verify`, { verificationLevel })
  },

  // 获取帖子评论
  getComments(postId, sortBy = 'createdAt') {
    return api.get(`/api/v1/agricultural/posts/${postId}/comments`, {
      params: { sortBy }
    })
  },

  // 创建评论
  createComment(commentData) {
    return api.post('/api/v1/agricultural/comments', commentData)
  },

  // 设置最佳答案
  setBestAnswer(commentId, postId) {
    return api.post(`/api/v1/agricultural/comments/${commentId}/best-answer`, { postId })
  },

  // 点赞评论
  likeComment(commentId) {
    return api.post(`/api/v1/agricultural/comments/${commentId}/like`)
  },

  // 评论投票
  voteComment(commentId, voteType) {
    return api.post(`/api/v1/agricultural/comments/${commentId}/vote`, { voteType })
  },

  // 获取专家推荐
  getExpertRecommendations(params = {}) {
    return api.get('/api/v1/agricultural/experts/recommendations', { params })
  },

  // 获取专家列表
  getExperts(params = {}) {
    return api.get('/api/v1/agricultural/experts', { params })
  },

  // 申请成为专家
  applyExpert(applicationData) {
    return api.post('/api/v1/agricultural/experts/apply', applicationData)
  },

  // 获取用户收藏列表
  getUserBookmarks(params = {}) {
    return api.get('/api/v1/agricultural/user/bookmarks', { params })
  },

  // 获取用户发布的帖子
  getUserPosts(params = {}) {
    return api.get('/api/v1/agricultural/user/posts', { params })
  },

  // 获取统计数据
  getStatistics() {
    return api.get('/api/v1/agricultural/statistics')
  },

  // 获取知识库文章
  getKnowledgeBase(params = {}) {
    return api.get('/api/v1/agricultural/knowledge', { params })
  },

  // 搜索知识库
  searchKnowledge(query, filters = {}) {
    return api.get('/api/v1/agricultural/knowledge/search', {
      params: { q: query, ...filters }
    })
  },

  // 获取知识库文章详情
  getKnowledgeById(knowledgeId) {
    return api.get(`/api/v1/agricultural/knowledge/${knowledgeId}`)
  },

  // 对知识库文章评价
  rateKnowledge(knowledgeId, rating, review, practiceResult, practiceNotes) {
    return api.post(`/api/v1/agricultural/knowledge/${knowledgeId}/rate`, {
      rating,
      review,
      practiceResult,
      practiceNotes
    })
  },

  // 上传图片
  uploadImages(formData) {
    return api.post('/api/v1/agricultural/upload/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000 // 上传文件超时时间更长
    })
  },

  // 上传视频
  uploadVideos(formData) {
    return api.post('/api/v1/agricultural/upload/videos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 120000 // 视频上传超时时间更长
    })
  },

  // 获取热门标签
  getPopularTags() {
    return api.get('/api/v1/agricultural/tags/popular')
  },

  // 获取推荐帖子
  getRecommendedPosts(params = {}) {
    return api.get('/api/v1/agricultural/posts/recommended', { params })
  },

  // 举报内容
  reportContent(contentId, contentType, reason, description) {
    return api.post('/api/v1/agricultural/report', {
      contentId,
      contentType, // 'post' 或 'comment'
      reason,
      description
    })
  },

  // 关注专家
  followExpert(expertId) {
    return api.post(`/api/v1/agricultural/experts/${expertId}/follow`)
  },

  // 取消关注专家
  unfollowExpert(expertId) {
    return api.delete(`/api/v1/agricultural/experts/${expertId}/follow`)
  },

  // 获取关注的专家列表
  getFollowedExperts() {
    return api.get('/api/v1/agricultural/user/followed-experts')
  },

  // 获取消息通知
  getNotifications(params = {}) {
    return api.get('/api/v1/agricultural/notifications', { params })
  },

  // 标记通知为已读
  markNotificationRead(notificationId) {
    return api.put(`/api/v1/agricultural/notifications/${notificationId}/read`)
  },

  // 获取用户活动历史
  getUserActivity(params = {}) {
    return api.get('/api/v1/agricultural/user/activity', { params })
  },

  // 获取农业日历/时令提醒
  getAgriculturalCalendar(params = {}) {
    return api.get('/api/v1/agricultural/calendar', { params })
  },

  // 订阅时令提醒
  subscribeReminders(reminderTypes) {
    return api.post('/api/v1/agricultural/reminders/subscribe', { reminderTypes })
  },

  // 取消订阅时令提醒
  unsubscribeReminders(reminderTypes) {
    return api.post('/api/v1/agricultural/reminders/unsubscribe', { reminderTypes })
  }
}