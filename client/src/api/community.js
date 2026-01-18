import axios from 'axios';

const API_BASE = '/api/v1/community';

export const communityApi = {
  getPosts: params => axios.get(`${API_BASE}/posts`, { params }),

  getPostById: id => axios.get(`${API_BASE}/posts/${id}`),

  createPost: data => axios.post(`${API_BASE}/posts`, data),

  updatePost: (id, data) => axios.put(`${API_BASE}/posts/${id}`, data),

  deletePost: id => axios.delete(`${API_BASE}/posts/${id}`),

  likePost: id => axios.post(`${API_BASE}/posts/${id}/like`),

  unlikePost: id => axios.post(`${API_BASE}/posts/${id}/unlike`),

  favoritePost: id => axios.post(`${API_BASE}/posts/${id}/favorite`),

  unfavoritePost: id => axios.post(`${API_BASE}/posts/${id}/unfavorite`),

  getPostComments: (postId, params) => axios.get(`${API_BASE}/posts/${postId}/comments`, { params }),

  addPostComment: (postId, data) => axios.post(`${API_BASE}/posts/${postId}/comments`, data),

  deletePostComment: (postId, commentId) => axios.delete(`${API_BASE}/posts/${postId}/comments/${commentId}`),

  getAidRequests: params => axios.get(`${API_BASE}/aid-requests`, { params }),

  getAidRequestById: id => axios.get(`${API_BASE}/aid-requests/${id}`),

  createAidRequest: data => axios.post(`${API_BASE}/aid-requests`, data),

  updateAidRequest: (id, data) => axios.put(`${API_BASE}/aid-requests/${id}`, data),

  updateAidRequestStatus: (id, data) => axios.put(`${API_BASE}/aid-requests/${id}/status`, data),

  offerHelp: (id, data) => axios.post(`${API_BASE}/aid-requests/${id}/help`, data),

  acceptHelper: (id, helperId) => axios.post(`${API_BASE}/aid-requests/${id}/helpers/${helperId}/accept`),

  completeAidRequest: (id, data) => axios.post(`${API_BASE}/aid-requests/${id}/complete`, data),

  rateHelper: (id, data) => axios.post(`${API_BASE}/aid-requests/${id}/rate`, data),

  getActivities: params => axios.get(`${API_BASE}/activities`, { params }),

  getActivityById: id => axios.get(`${API_BASE}/activities/${id}`),

  createActivity: data => axios.post(`${API_BASE}/activities`, data),

  updateActivity: (id, data) => axios.put(`${API_BASE}/activities/${id}`, data),

  deleteActivity: id => axios.delete(`${API_BASE}/activities/${id}`),

  joinActivity: (id, data) => axios.post(`${API_BASE}/activities/${id}/join`, data),

  leaveActivity: id => axios.delete(`${API_BASE}/activities/${id}/join`),

  getActivityCalendar: params => axios.get(`${API_BASE}/activities/calendar`, { params }),

  getActivityParticipants: (id, params) => axios.get(`${API_BASE}/activities/${id}/participants`, { params }),

  getSuggestions: params => axios.get(`${API_BASE}/suggestions`, { params }),

  getSuggestionById: id => axios.get(`${API_BASE}/suggestions/${id}`),

  createSuggestion: data => axios.post(`${API_BASE}/suggestions`, data),

  updateSuggestion: (id, data) => axios.put(`${API_BASE}/suggestions/${id}`, data),

  deleteSuggestion: id => axios.delete(`${API_BASE}/suggestions/${id}`),

  voteSuggestion: (id, data) => axios.post(`${API_BASE}/suggestions/${id}/vote`, data),

  addSuggestionReply: (id, data) => axios.post(`${API_BASE}/suggestions/${id}/replies`, data),

  updateSuggestionStatus: (id, data) => axios.put(`${API_BASE}/suggestions/${id}/status`, data),

  getMarketplaceItems: params => axios.get(`${API_BASE}/marketplace/items`, { params }),

  getMarketplaceItemById: id => axios.get(`${API_BASE}/marketplace/items/${id}`),

  createMarketplaceItem: data => axios.post(`${API_BASE}/marketplace/items`, data),

  updateMarketplaceItem: (id, data) => axios.put(`${API_BASE}/marketplace/items/${id}`, data),

  deleteMarketplaceItem: id => axios.delete(`${API_BASE}/marketplace/items/${id}`),

  updateItemStatus: (id, data) => axios.put(`${API_BASE}/marketplace/items/${id}/status`, data),

  favoriteItem: id => axios.post(`${API_BASE}/marketplace/items/${id}/favorite`),

  unfavoriteItem: id => axios.post(`${API_BASE}/marketplace/items/${id}/unfavorite`),

  addItemComment: (id, data) => axios.post(`${API_BASE}/marketplace/items/${id}/comments`, data),

  deleteItemComment: (itemId, commentId) => axios.delete(`${API_BASE}/marketplace/items/${itemId}/comments/${commentId}`),

  getCategories: () => axios.get(`${API_BASE}/categories`),

  getStatistics: () => axios.get(`${API_BASE}/statistics`),

  search: (type, params) => axios.get(`${API_BASE}/search/${type}`, { params }),
};

export default communityApi;
