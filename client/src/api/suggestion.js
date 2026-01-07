import api from './index';

export const suggestionApi = {
  submit(formData) {
    return api.post('/suggestions/submit', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  getList(params) {
    return api.get('/suggestions/list', { params });
  },

  getDetail(id) {
    return api.get(`/suggestions/${id}`);
  },

  updateStatus(id, data) {
    return api.put(`/suggestions/${id}/status`, data);
  },

  vote(id, data) {
    return api.post(`/suggestions/${id}/vote`, data);
  },

  assign(id, data) {
    return api.put(`/suggestions/${id}/assign`, data);
  },

  getStats(village) {
    return api.get(`/suggestions/stats/${village}`);
  },

  getCategories(village) {
    return api.get(`/suggestions/categories/${village}`);
  },

  createCategory(data) {
    return api.post('/suggestions/categories', data);
  },

  updateCategory(id, data) {
    return api.put(`/suggestions/categories/${id}`, data);
  },

  deleteCategory(id) {
    return api.delete(`/suggestions/categories/${id}`);
  }
};