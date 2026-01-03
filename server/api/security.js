/**
 * 安全管理API路由
 */

const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

/**
 * 防诈骗相关路由
 */

// 检查电话号码是否为诈骗号码
router.get('/fraud/check/:phoneNumber', authenticate, securityController.checkPhoneNumber);

// 举报诈骗号码
router.post('/fraud/report', authenticate, securityController.reportFraudNumber);

// 获取诈骗号码列表
router.get('/fraud/numbers', authenticate, authorize(['admin', 'village_admin']), securityController.getFraudNumbers);

// 获取诈骗统计数据
router.get('/fraud/stats', authenticate, authorize(['admin', 'village_admin']), securityController.getFraudStats);

// 验证诈骗号码
router.put('/fraud/verify/:id', authenticate, authorize(['admin']), securityController.verifyFraudNumber);

// 更新诈骗号码状态
router.put('/fraud/status/:id', authenticate, authorize(['admin']), securityController.updateFraudNumberStatus);

/**
 * 隐私保护相关路由
 */

// 获取隐私规则列表
router.get('/privacy/rules', authenticate, securityController.getPrivacyRules);

// 创建或更新隐私规则
router.post('/privacy/rules', authenticate, authorize(['admin']), securityController.upsertPrivacyRule);

// 删除隐私规则
router.delete('/privacy/rules/:id', authenticate, authorize(['admin']), securityController.deletePrivacyRule);

// 请求查看完整敏感信息
router.post('/privacy/request-view', authenticate, securityController.requestViewFullInfo);

// 获取查看历史
router.get('/privacy/view-history', authenticate, securityController.getViewHistory);

/**
 * 数据加密相关路由
 */

// AES加密
router.post('/encryption/aes/encrypt', authenticate, authorize(['admin']), securityController.aesEncrypt);

// AES解密
router.post('/encryption/aes/decrypt', authenticate, authorize(['admin']), securityController.aesDecrypt);

// 计算哈希值
router.post('/encryption/hash', authenticate, securityController.calculateHash);

// 密钥轮换
router.post('/encryption/rotate-keys', authenticate, authorize(['admin']), securityController.rotateKeys);

// 获取加密统计信息
router.get('/encryption/stats', authenticate, authorize(['admin']), securityController.getEncryptionStats);

/**
 * 区块链存证相关路由
 */

// 创建区块链存证
router.post('/blockchain/records', authenticate, securityController.createBlockchainRecord);

// 上链
router.post('/blockchain/upload/:id', authenticate, authorize(['admin']), securityController.uploadToChain);

// 验证存证
router.get('/blockchain/verify/:id', authenticate, securityController.verifyBlockchainRecord);

// 生成存证证书
router.post('/blockchain/certificate/:id', authenticate, securityController.generateCertificate);

// 查询区块链记录
router.get('/blockchain/records', authenticate, securityController.queryBlockchainRecords);

// 获取区块链统计
router.get('/blockchain/stats', authenticate, authorize(['admin']), securityController.getBlockchainStats);

/**
 * 安全审计相关路由
 */

// 记录审计日志（内部调用）
router.post('/audit/log', authenticate, securityController.logAudit);

// 查询审计日志
router.get('/audit/logs', authenticate, authorize(['admin', 'village_admin']), securityController.queryAuditLogs);

// 获取安全审计报告
router.get('/audit/report', authenticate, authorize(['admin']), securityController.getSecurityReport);

// 获取异常行为报告
router.get('/audit/anomaly-report', authenticate, authorize(['admin']), securityController.getAnomalyReport);

// 获取访问热力图
router.get('/audit/heatmap', authenticate, authorize(['admin']), securityController.getAccessHeatmap);

// 导出审计日志
router.get('/audit/export', authenticate, authorize(['admin']), securityController.exportAuditLogs);

// 检查合规性
router.get('/audit/compliance', authenticate, authorize(['admin']), securityController.checkCompliance);

/**
 * 系统概览相关路由
 */

// 获取系统安全概览
router.get('/overview', authenticate, authorize(['admin']), securityController.getSecurityOverview);

module.exports = router;
