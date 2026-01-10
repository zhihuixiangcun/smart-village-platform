import request from '@/utils/request';

export const villageApi = {
  getAffairs(params) {
    return request.get('/api/village/affairs', { params });
  },

  createAffairs(data) {
    return request.post('/api/village/affairs', data);
  },

  updateAffairs(id, data) {
    return request.put(`/api/village/affairs/${id}`, data);
  },

  deleteAffairs(id) {
    return request.delete(`/api/village/affairs/${id}`);
  },

  getAnnouncements(params) {
    return request.get('/api/village/announcements', { params });
  },

  createAnnouncement(data) {
    return request.post('/api/village/announcements', data);
  },

  getVillageInfo() {
    return request.get('/api/village/info');
  },

  updateVillageInfo(data) {
    return request.put('/api/village/info', data);
  },

  getStatistics() {
    return request.get('/api/village/statistics');
  },

  getResidents(params) {
    return request.get('/api/residents', { params });
  },

  getTasks(params) {
    return request.get('/api/village/tasks', { params });
  },

  getNotifications() {
    return request.get('/api/v1/notifications');
  },

  getDashboardStats() {
    return request.get('/api/village/dashboard/stats');
  },
};

export default villageApi;
