import request from '@/utils/request';

export default {
  getProviders(params) {
    return request.get('/api/v1/housekeeping/providers', { params });
  },

  getProviderById(id) {
    return request.get(`/api/v1/housekeeping/providers/${id}`);
  },

  createOrder(data) {
    return request.post('/api/v1/housekeeping/orders', data);
  },

  getOrders(params) {
    return request.get('/api/v1/housekeeping/orders', { params });
  },

  getOrderById(id) {
    return request.get(`/api/v1/housekeeping/orders/${id}`);
  },

  updateOrder(id, data) {
    return request.put(`/api/v1/housekeeping/orders/${id}`, data);
  },

  cancelOrder(id, data) {
    return request.post(`/api/v1/housekeeping/orders/${id}/cancel`, data);
  },

  evaluateOrder(id, data) {
    return request.post(`/api/v1/housekeeping/orders/${id}/evaluate`, data);
  },

  getServiceTypes() {
    return request.get('/api/v1/housekeeping/types');
  },
};
