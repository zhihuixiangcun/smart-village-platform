import request from '@/utils/request';

export default {
  getRepairTypes() {
    return request.get('/api/v1/repair/types');
  },

  createOrder(data) {
    return request.post('/api/v1/repair/orders', data);
  },

  getOrders(params) {
    return request.get('/api/v1/repair/orders', { params });
  },

  getOrderById(id) {
    return request.get(`/api/v1/repair/orders/${id}`);
  },

  updateOrder(id, data) {
    return request.put(`/api/v1/repair/orders/${id}`, data);
  },

  updateOrderStatus(id, data) {
    return request.put(`/api/v1/repair/orders/${id}/status`, data);
  },

  quoteOrder(id, data) {
    return request.post(`/api/v1/repair/orders/${id}/quote`, data);
  },

  completeOrder(id, data) {
    return request.post(`/api/v1/repair/orders/${id}/complete`, data);
  },

  cancelOrder(id, data) {
    return request.post(`/api/v1/repair/orders/${id}/cancel`, data);
  },

  evaluateOrder(id, data) {
    return request.post(`/api/v1/repair/orders/${id}/evaluate`, data);
  },

  getOrderStatistics() {
    return request.get('/api/v1/repair/orders/statistics');
  },
};
