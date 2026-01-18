import request from '@/utils/request';

export default {
  getBills(params) {
    return request.get('/api/v1/payment', { params });
  },

  getBillById(id) {
    return request.get(`/api/v1/payment/${id}`);
  },

  updateBill(id, data) {
    return request.put(`/api/v1/payment/${id}`, data);
  },

  payBill(id, data) {
    return request.post(`/api/v1/payment/${id}/pay`, data);
  },

  getPaymentHistory(params) {
    return request.get('/api/v1/payment/history', { params });
  },

  getBillStatistics() {
    return request.get('/api/v1/payment/statistics');
  },

  getBillTypes() {
    return request.get('/api/v1/payment/types');
  },

  deleteBill(id) {
    return request.delete(`/api/v1/payment/${id}`);
  },
};
