/**
 * 村民管理相关API
 */
import request from '@/utils/request';

// 获取村民列表
export const getResidentList = params => {
  return request.get('/residents', params);
};

// 获取村民详情
export const getResidentDetail = id => {
  return request.get(`/residents/${id}`);
};

// 创建村民
export const createResident = data => {
  return request.post('/residents', data);
};

// 更新村民信息
export const updateResident = (id, data) => {
  return request.put(`/residents/${id}`, data);
};

// 删除村民
export const deleteResident = id => {
  return request.delete(`/residents/${id}`);
};

// 批量删除村民
export const batchDeleteResidents = ids => {
  return request.delete('/residents/batch', { data: { ids } });
};

// 获取村民统计信息
export const getResidentStats = params => {
  return request.get('/residents/stats', params);
};

// 导出村民数据
export const exportResidents = params => {
  return request.download('/residents/export', params, '村民信息.xlsx');
};

// 导入村民数据
export const importResidents = file => {
  const formData = new FormData();
  formData.append('file', file);
  return request.upload('/residents/import', formData);
};

// 获取村民家庭关系
export const getResidentFamily = id => {
  return request.get(`/residents/${id}/family`);
};

// 更新村民家庭关系
export const updateResidentFamily = (id, data) => {
  return request.put(`/residents/${id}/family`, data);
};

// 获取村民档案历史
export const getResidentHistory = (id, params) => {
  return request.get(`/residents/${id}/history`, params);
};

// 村民信息审核
export const auditResident = (id, data) => {
  return request.post(`/residents/${id}/audit`, data);
};

// 生成村民二维码
export const generateResidentQRCode = id => {
  return request.post(`/residents/${id}/qrcode`);
};

// 根据二维码获取村民信息
export const getResidentByQRCode = qrcode => {
  return request.get('/residents/qrcode', { qrcode });
};

// 村民搜索
export const searchResidents = params => {
  return request.get('/residents/search', params);
};

// 获取村民权限
export const getResidentPermissions = id => {
  return request.get(`/residents/${id}/permissions`);
};

// 更新村民权限
export const updateResidentPermissions = (id, data) => {
  return request.put(`/residents/${id}/permissions`, data);
};

export const residentAPI = {
  getResidentList,
  getResidentDetail,
  createResident,
  updateResident,
  deleteResident,
  batchDeleteResidents,
  getResidentStats,
  exportResidents,
  importResidents,
  getResidentFamily,
  updateResidentFamily,
  getResidentHistory,
  auditResident,
  generateResidentQRCode,
  getResidentByQRCode,
  searchResidents,
  getResidentPermissions,
  updateResidentPermissions,
  getResidents: getResidentList,
};

export default residentAPI;
