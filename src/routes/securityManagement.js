/**
 * 安全管理路由
 */

const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityManagementController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// 中间件：验证管理员权限
const requireAdmin = requireRole(['admin', 'security_officer']);

// 安全仪表板
router.get('/dashboard', authenticateToken, requireAdmin, securityController.getSecurityDashboard);

// 等保合规管理
router.post('/compliance-assessment', authenticateToken, requireAdmin, securityController.complianceAssessment);
router.post('/generate-remediation-plan', authenticateToken, requireAdmin, securityController.generateRemediationPlan);
router.get('/continuous-compliance-monitoring', authenticateToken, requireAdmin, securityController.continuousComplianceMonitoring);

// 数据加密管理
router.post('/encrypt', authenticateToken, requireAdmin, securityController.encryptData);
router.post('/decrypt', authenticateToken, requireAdmin, securityController.decryptData);
router.post('/batch-encrypt', authenticateToken, requireAdmin, securityController.batchEncryptData);
router.post('/manage-key', authenticateToken, requireAdmin, securityController.manageKeys);
router.get('/encryption/stats', authenticateToken, requireAdmin, getEncryptionStats);
router.get('/encryption/performance', authenticateToken, requireAdmin, getEncryptionPerformance);
router.get('/encryption/keys', authenticateToken, requireAdmin, getEncryptionKeys);

// 防诈骗管理
router.post('/detect-fraud', authenticateToken, securityController.detectFraud);
router.post('/real-time-fraud-monitoring', authenticateToken, securityController.realTimeFraudMonitoring);
router.post('/report-fraud', authenticateToken, securityController.reportFraud);
router.get('/fraud-trend-analysis', authenticateToken, securityController.fraudTrendAnalysis);
router.get('/fraud-stats', authenticateToken, getFraudStats);
router.get('/fraud-reports', authenticateToken, getFraudReports);

// 隐私保护管理
router.post('/manage-privacy', authenticateToken, securityController.managePrivacy);
router.post('/privacy-impact-assessment', authenticateToken, requireAdmin, securityController.privacyImpactAssessment);
router.get('/audit-logs', authenticateToken, requireAdmin, securityController.getAuditLogs);
router.get('/privacy-stats', authenticateToken, requireAdmin, getPrivacyStats);
router.get('/consent-records', authenticateToken, requireAdmin, getConsentRecords);

// 安全报告生成
router.post('/generate-report', authenticateToken, requireAdmin, securityController.generateSecurityReport);

// 安全配置管理
router.get('/config', authenticateToken, requireAdmin, securityController.getSecurityConfig);
router.put('/config', authenticateToken, requireAdmin, securityController.updateSecurityConfig);

// 安全事件响应
router.post('/incident-response', authenticateToken, requireAdmin, securityController.securityIncidentResponse);

// 辅助函数获取统计数据
async function getEncryptionStats(req, res) {
  try {
    const encryptionService = require('../security/encryptionService');
    const stats = {
      keyCount: 4,
      encryptedFiles: 156,
      algorithms: 5,
      performance: 12.5
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取加密统计失败',
      error: error.message
    });
  }
}

async function getEncryptionPerformance(req, res) {
  try {
    const encryptionService = require('../security/encryptionService');
    const performanceData = await encryptionService.performanceTest();

    res.json({
      success: true,
      data: performanceData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取加密性能数据失败',
      error: error.message
    });
  }
}

async function getEncryptionKeys(req, res) {
  try {
    const encryptionService = require('../security/encryptionService');
    const keys = [
      {
        keyId: 'default_aes',
        algorithm: 'AES-256-GCM',
        keyLength: 256,
        createdAt: new Date('2024-01-15'),
        expiresAt: new Date('2025-01-15'),
        status: 'active'
      },
      {
        keyId: 'sm4_key_001',
        algorithm: 'SM4-GCM',
        keyLength: 128,
        createdAt: new Date('2024-02-20'),
        expiresAt: new Date('2025-02-20'),
        status: 'active'
      }
    ];

    res.json({
      success: true,
      data: keys
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取密钥列表失败',
      error: error.message
    });
  }
}

async function getFraudStats(req, res) {
  try {
    const antiFraudService = require('../security/antiFraudService');
    const trendAnalysis = await antiFraudService.analyzeFraudTrends('month');

    res.json({
      success: true,
      data: {
        statistics: trendAnalysis.statistics,
        trends: trendAnalysis.trends
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取防诈骗统计失败',
      error: error.message
    });
  }
}

async function getFraudReports(req, res) {
  try {
    // 模拟举报记录数据
    const reports = [
      {
        reportId: 'FR202401001',
        type: 'phone',
        contact: '138****1234',
        description: '冒充公检法人员要求转账',
        status: '处理中',
        createdAt: new Date('2024-01-15 14:30:00')
      },
      {
        reportId: 'FR202401002',
        type: 'sms',
        contact: '159****5678',
        description: '收到中奖短信，要求支付手续费',
        status: '已完成',
        createdAt: new Date('2024-01-14 09:15:00')
      }
    ];

    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取举报记录失败',
      error: error.message
    });
  }
}

async function getPrivacyStats(req, res) {
  try {
    const privacyProtectionService = require('../security/privacyProtectionService');
    const stats = {
      totalConsents: Object.keys(privacyProtectionService.userConsents).length,
      activeAudits: 23,
      anonymizedRecords: 1250,
      dataProcessings: 567
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取隐私统计失败',
      error: error.message
    });
  }
}

async function getConsentRecords(req, res) {
  try {
    const privacyProtectionService = require('../security/privacyProtectionService');
    // 模拟同意记录数据
    const records = [
      {
        consentId: 'consent_001',
        userId: 'user_001',
        consentType: 'dataCollection',
        scope: '个人基本信息收集',
        status: 'active',
        grantedAt: new Date('2024-01-01'),
        expiresAt: new Date('2025-01-01')
      },
      {
        consentId: 'consent_002',
        userId: 'user_002',
        consentType: 'dataProcessing',
        scope: '数据分析处理',
        status: 'revoked',
        grantedAt: new Date('2023-12-01'),
        expiresAt: new Date('2024-12-01')
      }
    ];

    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取同意记录失败',
      error: error.message
    });
  }
}

module.exports = router;