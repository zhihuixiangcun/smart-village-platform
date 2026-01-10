/**
 * 安全管理API接口
 */

import request from '@/utils/request';

const BASE_URL = '/api/security';

// 防诈骗相关API

// 检查电话号码是否为诈骗号码
export const checkPhoneNumber = phoneNumber => {
  return request({
    url: `${BASE_URL}/fraud/check/${phoneNumber}`,
    method: 'get',
  });
};

// 举报诈骗号码
export const reportFraudNumber = data => {
  return request({
    url: `${BASE_URL}/fraud/report`,
    method: 'post',
    data,
  });
};

// 获取诈骗号码列表
export const getFraudNumbers = params => {
  return request({
    url: `${BASE_URL}/fraud/numbers`,
    method: 'get',
    params,
  });
};

// 获取诈骗统计数据
export const getFraudStats = params => {
  return request({
    url: `${BASE_URL}/fraud/stats`,
    method: 'get',
    params,
  });
};

// 验证诈骗号码
export const verifyFraudNumber = id => {
  return request({
    url: `${BASE_URL}/fraud/verify/${id}`,
    method: 'put',
  });
};

// 更新诈骗号码状态
export const updateFraudNumberStatus = (id, data) => {
  return request({
    url: `${BASE_URL}/fraud/status/${id}`,
    method: 'put',
    data,
  });
};

// 隐私保护相关API

// 获取隐私规则列表
export const getPrivacyRules = () => {
  return request({
    url: `${BASE_URL}/privacy/rules`,
    method: 'get',
  });
};

// 创建或更新隐私规则
export const upsertPrivacyRule = data => {
  return request({
    url: `${BASE_URL}/privacy/rules`,
    method: 'post',
    data,
  });
};

// 删除隐私规则
export const deletePrivacyRule = id => {
  return request({
    url: `${BASE_URL}/privacy/rules/${id}`,
    method: 'delete',
  });
};

// 请求查看完整敏感信息
export const requestViewFullInfo = data => {
  return request({
    url: `${BASE_URL}/privacy/request-view`,
    method: 'post',
    data,
  });
};

// 获取查看历史
export const getViewHistory = params => {
  return request({
    url: `${BASE_URL}/privacy/view-history`,
    method: 'get',
    params,
  });
};

// 数据加密相关API

// AES加密
export const aesEncrypt = plaintext => {
  return request({
    url: `${BASE_URL}/encryption/aes/encrypt`,
    method: 'post',
    data: { plaintext },
  });
};

// AES解密
export const aesDecrypt = encryptedData => {
  return request({
    url: `${BASE_URL}/encryption/aes/decrypt`,
    method: 'post',
    data: { encryptedData },
  });
};

// 计算哈希值
export const calculateHash = (data, algorithm) => {
  return request({
    url: `${BASE_URL}/encryption/hash`,
    method: 'post',
    data: { data, algorithm },
  });
};

// 密钥轮换
export const rotateKeys = () => {
  return request({
    url: `${BASE_URL}/encryption/rotate-keys`,
    method: 'post',
  });
};

// 获取加密统计信息
export const getEncryptionStats = () => {
  return request({
    url: `${BASE_URL}/encryption/stats`,
    method: 'get',
  });
};

// 区块链存证相关API

// 创建区块链存证
export const createBlockchainRecord = data => {
  return request({
    url: `${BASE_URL}/blockchain/records`,
    method: 'post',
    data,
  });
};

// 上链
export const uploadToChain = id => {
  return request({
    url: `${BASE_URL}/blockchain/upload/${id}`,
    method: 'post',
  });
};

// 验证存证
export const verifyBlockchainRecord = id => {
  return request({
    url: `${BASE_URL}/blockchain/verify/${id}`,
    method: 'get',
  });
};

// 生成存证证书
export const generateCertificate = id => {
  return request({
    url: `${BASE_URL}/blockchain/certificate/${id}`,
    method: 'post',
  });
};

// 查询区块链记录
export const queryBlockchainRecords = params => {
  return request({
    url: `${BASE_URL}/blockchain/records`,
    method: 'get',
    params,
  });
};

// 获取区块链统计
export const getBlockchainStats = params => {
  return request({
    url: `${BASE_URL}/blockchain/stats`,
    method: 'get',
    params,
  });
};

// 安全审计相关API

// 记录审计日志
export const logAudit = data => {
  return request({
    url: `${BASE_URL}/audit/log`,
    method: 'post',
    data,
  });
};

// 查询审计日志
export const queryAuditLogs = params => {
  return request({
    url: `${BASE_URL}/audit/logs`,
    method: 'get',
    params,
  });
};

// 获取安全审计报告
export const getSecurityReport = params => {
  return request({
    url: `${BASE_URL}/audit/report`,
    method: 'get',
    params,
  });
};

// 获取异常行为报告
export const getAnomalyReport = params => {
  return request({
    url: `${BASE_URL}/audit/anomaly-report`,
    method: 'get',
    params,
  });
};

// 获取访问热力图
export const getAccessHeatmap = params => {
  return request({
    url: `${BASE_URL}/audit/heatmap`,
    method: 'get',
    params,
  });
};

// 导出审计日志
export const exportAuditLogs = params => {
  return request({
    url: `${BASE_URL}/audit/export`,
    method: 'get',
    params,
    responseType: 'blob',
  });
};

// 检查合规性
export const checkCompliance = params => {
  return request({
    url: `${BASE_URL}/audit/compliance`,
    method: 'get',
    params,
  });
};

// 系统概览相关API

// 获取系统安全概览
export const getSecurityOverview = () => {
  return request({
    url: `${BASE_URL}/overview`,
    method: 'get',
  });
};

// 默认导出所有API
export default {
  // 防诈骗
  checkPhoneNumber,
  reportFraudNumber,
  getFraudNumbers,
  getFraudStats,
  verifyFraudNumber,
  updateFraudNumberStatus,

  // 隐私保护
  getPrivacyRules,
  upsertPrivacyRule,
  deletePrivacyRule,
  requestViewFullInfo,
  getViewHistory,

  // 数据加密
  aesEncrypt,
  aesDecrypt,
  calculateHash,
  rotateKeys,
  getEncryptionStats,

  // 区块链
  createBlockchainRecord,
  uploadToChain,
  verifyBlockchainRecord,
  generateCertificate,
  queryBlockchainRecords,
  getBlockchainStats,

  // 安全审计
  logAudit,
  queryAuditLogs,
  getSecurityReport,
  getAnomalyReport,
  getAccessHeatmap,
  exportAuditLogs,
  checkCompliance,

  // 系统概览
  getSecurityOverview,
};
