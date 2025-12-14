/**
 * 政务系统集成路由
 */

const express = require('express');
const router = express.Router();
const governmentIntegrationController = require('../controllers/governmentIntegrationController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// 中间件：验证管理员或村干部权限
const requireVillageAdmin = requireRole(['admin', 'village_admin', 'government_liaison']);

// 获取平台连接状态
router.get('/connection-status', authenticateToken, requireVillageAdmin, governmentIntegrationController.getConnectionStatus);

// 数据同步相关
router.post('/sync/household', authenticateToken, requireVillageAdmin, governmentIntegrationController.syncHouseholdData);
router.post('/sync/social-security', authenticateToken, requireVillageAdmin, governmentIntegrationController.syncSocialSecurityData);
router.post('/sync/batch-all', authenticateToken, requireRole(['admin', 'village_admin']), governmentIntegrationController.batchSyncAllVillages);

// 自动同步控制
router.get('/sync/status', authenticateToken, requireVillageAdmin, governmentIntegrationController.getSyncStatus);
router.post('/sync/auto-start', authenticateToken, requireRole(['admin']), governmentIntegrationController.startAutoSync);
router.post('/sync/auto-stop', authenticateToken, requireRole(['admin']), governmentIntegrationController.stopAutoSync);

// 同步历史
router.get('/sync/history', authenticateToken, requireVillageAdmin, governmentIntegrationController.getSyncHistory);

// 统计报表上传
router.post('/report/upload', authenticateToken, requireVillageAdmin, governmentIntegrationController.uploadStatisticsReport);

// 便民服务相关
router.get('/services/types', authenticateToken, governmentIntegrationController.getAvailableServiceTypes);
router.get('/services/query', authenticateToken, governmentIntegrationController.queryGovernmentServices);
router.post('/services/apply', authenticateToken, governmentIntegrationController.applyForGovernmentService);
router.get('/services/my-applications', authenticateToken, governmentIntegrationController.getMyApplications);
router.delete('/services/:applicationId/cancel', authenticateToken, governmentIntegrationController.cancelApplication);

module.exports = router;