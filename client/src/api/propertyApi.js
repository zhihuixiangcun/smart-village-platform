import request from '@/utils/request';

export default {
  getIssueTypes() {
    return request.get('/api/v1/property/types');
  },

  createIssue(data) {
    return request.post('/api/v1/property/issues', data);
  },

  getIssues(params) {
    return request.get('/api/v1/property/issues', { params });
  },

  getPublicIssues(params) {
    return request.get('/api/v1/property/issues/public', { params });
  },

  getIssueById(id) {
    return request.get(`/api/v1/property/issues/${id}`);
  },

  updateIssue(id, data) {
    return request.put(`/api/v1/property/issues/${id}`, data);
  },

  updateStatus(id, data) {
    return request.put(`/api/v1/property/issues/${id}/status`, data);
  },

  evaluateIssue(id, data) {
    return request.post(`/api/v1/property/issues/${id}/evaluate`, data);
  },

  addLike(id) {
    return request.post(`/api/v1/property/issues/${id}/like`);
  },

  removeLike(id) {
    return request.delete(`/api/v1/property/issues/${id}/like`);
  },

  getIssueStatistics() {
    return request.get('/api/v1/property/issues/statistics');
  },

  deleteIssue(id) {
    return request.delete(`/api/v1/property/issues/${id}`);
  },
};
