import request from '@/utils/request';

export default {
  getServiceTypes() {
    return request.get('/api/v1/utility/types');
  },

  createService(data) {
    return request.post('/api/v1/utility/services', data);
  },

  getServices(params) {
    return request.get('/api/v1/utility/services', { params });
  },

  getUserServices(params) {
    return request.get('/api/v1/utility/services/my', { params });
  },

  getServiceById(id) {
    return request.get(`/api/v1/utility/services/${id}`);
  },

  updateService(id, data) {
    return request.put(`/api/v1/utility/services/${id}`, data);
  },

  deleteService(id) {
    return request.delete(`/api/v1/utility/services/${id}`);
  },

  addLike(id) {
    return request.post(`/api/v1/utility/services/${id}/like`);
  },

  removeLike(id) {
    return request.delete(`/api/v1/utility/services/${id}/like`);
  },

  addComment(id, data) {
    return request.post(`/api/v1/utility/services/${id}/comment`, data);
  },

  contactService(id) {
    return request.post(`/api/v1/utility/services/${id}/contact`);
  },

  getServiceStatistics() {
    return request.get('/api/v1/utility/services/statistics');
  },
};
