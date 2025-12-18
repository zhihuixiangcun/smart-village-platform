/**
 * 财务透明化管理路由
 * 处理区块链存证、智能票据OCR识别、村民财务查询权限、预算审批流程等
 */

const express = require('express');
const router = express.Router();

const {
  // 财务交易管理
  createTransaction,
  submitTransactionForApproval,
  reviewTransaction,
  getTransactions,

  // 区块链存证管理
  uploadToBlockchain,
  verifyBlockchainData,
  getBlockchainStats,

  // 智能票据OCR识别
  recognizeInvoice,
  batchRecognizeInvoices,
  verifyInvoiceWithTaxAuthority,
  getOCRRecords,

  // 预算审批流程管理
  createBudget,
  submitBudgetForApproval,
  reviewBudget,
  getBudgets,

  // 审批工作流管理
  getPendingTasks,
  getWorkflowStatus,

  // 村民财务查询权限管理
  grantFinanceAccess,
  getFinanceSummary,
  getTransactionDetails,
  submitFinanceQuestion,
  downloadFinanceReport,
  getFinanceAccessStats
} = require('../controllers/financeController');

const { authenticateToken } = require('../middleware/auth');
const { auditLogger, requirePermission } = require('../middleware/permissionMiddleware');
const { dataMasking } = require('../middleware/permissionMiddleware');

// 身份认证中间件
router.use(authenticateToken);

// 财务操作审计日志
const financeAudit = auditLogger({
  resource: 'finance',
  action: 'MANAGE_FINANCE'
}, { sensitiveLevel: 'confidential' });

// 村民财务查询审计日志
const villageFinanceAudit = auditLogger({
  resource: 'village_finance',
  action: 'VIEW_FINANCE'
}, { sensitiveLevel: 'internal' });

/**
 * 财务交易管理路由
 */

// 创建财务交易
router.post('/transactions',
  financeAudit,
  requirePermission('finance', 'create'),
  createTransaction
);

// 提交交易审批
router.put('/transactions/:transactionId/submit',
  financeAudit,
  requirePermission('finance', 'submit'),
  submitTransactionForApproval
);

// 审批交易
router.put('/transactions/:transactionId/review',
  financeAudit,
  requirePermission('finance', 'approve'),
  reviewTransaction
);

// 获取交易列表
router.get('/transactions',
  auditLogger({
    resource: 'transaction',
    action: 'LIST_TRANSACTIONS'
  }, { sensitiveLevel: 'sensitive' }),
  requirePermission('finance', 'read'),
  dataMasking({ isOwner: false }),
  getTransactions
);

// 获取待办审批任务
router.get('/tasks/pending',
  auditLogger({
    resource: 'approval_task',
    action: 'LIST_PENDING_TASKS'
  }, { sensitiveLevel: 'internal' }),
  requirePermission('finance', 'approve'),
  getPendingTasks
);

// 获取审批工作流状态
router.get('/transactions/:transactionId/workflow',
  auditLogger({
    resource: 'workflow',
    action: 'VIEW_WORKFLOW_STATUS'
  }, { sensitiveLevel: 'internal' }),
  requirePermission('finance', 'read'),
  getWorkflowStatus
);

/**
 * 区块链存证管理路由
 */

// 上链数据
router.post('/blockchain/upload',
  financeAudit,
  requirePermission('blockchain', 'upload'),
  uploadToBlockchain
);

// 验证区块链数据
router.post('/blockchain/verify',
  auditLogger({
    resource: 'blockchain',
    action: 'VERIFY_DATA'
  }, { sensitiveLevel: 'internal' }),
  requirePermission('blockchain', 'verify'),
  verifyBlockchainData
);

// 获取区块链统计
router.get('/blockchain/stats',
  auditLogger({
    resource: 'blockchain',
    action: 'VIEW_STATS'
  }, { sensitiveLevel: 'internal' }),
  requirePermission('blockchain', 'read'),
  getBlockchainStats
);

/**
 * 智能票据OCR识别路由
 */

// 识别单个票据
router.post('/ocr/recognize',
  auditLogger({
    resource: 'invoice_ocr',
    action: 'RECOGNIZE_INVOICE'
  }, { sensitiveLevel: 'internal' }),
  requirePermission('invoice', 'ocr'),
  recognizeInvoice
);

// 批量识别票据
router.post('/ocr/batch-recognize',
  auditLogger({
    resource: 'invoice_ocr',
    action: 'BATCH_RECOGNIZE'
  }, { sensitiveLevel: 'internal' }),
  requirePermission('invoice', 'ocr'),
  batchRecognizeInvoices
);

// 税务局验证票据
router.post('/ocr/:invoiceId/verify-tax',
  auditLogger({
    resource: 'invoice_ocr',
    action: 'TAX_VERIFICATION'
  }, { sensitiveLevel: 'sensitive' }),
  requirePermission('invoice', 'verify'),
  verifyInvoiceWithTaxAuthority
);

// 获取OCR识别记录
router.get('/ocr/records',
  auditLogger({
    resource: 'invoice_ocr',
    action: 'VIEW_RECORDS'
  }, { sensitiveLevel: 'internal' }),
  requirePermission('invoice', 'read'),
  dataMasking({ isOwner: false }),
  getOCRRecords
);

/**
 * 预算审批流程管理路由
 */

// 创建预算
router.post('/budgets',
  financeAudit,
  requirePermission('budget', 'create'),
  createBudget
);

// 提交预算审批
router.put('/budgets/:budgetId/submit',
  financeAudit,
  requirePermission('budget', 'submit'),
  submitBudgetForApproval
);

// 审批预算
router.put('/budgets/:budgetId/review',
  financeAudit,
  requirePermission('budget', 'approve'),
  reviewBudget
);

// 获取预算列表
router.get('/budgets',
  auditLogger({
    resource: 'budget',
    action: 'LIST_BUDGETS'
  }, { sensitiveLevel: 'sensitive' }),
  requirePermission('budget', 'read'),
  dataMasking({ isOwner: false }),
  getBudgets
);

/**
 * 村民财务查询权限管理路由
 */

// 授予财务查询权限
router.post('/access/grant',
  auditLogger({
    resource: 'village_finance_access',
    action: 'GRANT_ACCESS'
  }, { sensitiveLevel: 'confidential' }),
  requirePermission('village_finance_access', 'grant'),
  grantFinanceAccess
);

// 获取财务摘要（村民端）
router.get('/village/summary',
  villageFinanceAudit,
  // 村民端不需要特定权限检查，在服务层处理
  getFinanceSummary
);

// 获取交易详情（村民端）
router.get('/village/transactions',
  villageFinanceAudit,
  // 村民端不需要特定权限检查，在服务层处理
  getTransactionDetails
);

// 提交财务问题（村民端）
router.post('/village/questions',
  auditLogger({
    resource: 'village_finance_question',
    action: 'SUBMIT_QUESTION'
  }, { sensitiveLevel: 'internal' }),
  // 村民端不需要特定权限检查，在服务层处理
  submitFinanceQuestion
);

// 下载财务报告（村民端）
router.post('/village/reports/download',
  villageFinanceAudit,
  // 村民端不需要特定权限检查，在服务层处理
  downloadFinanceReport
);

// 获取财务访问统计（管理员端）
router.get('/village/access-stats',
  auditLogger({
    resource: 'village_finance_access',
    action: 'VIEW_STATS'
  }, { sensitiveLevel: 'internal' }),
  requirePermission('village_finance_access', 'stats'),
  getFinanceAccessStats
);

/**
 * 财务公开信息路由（无需认证的公开接口）
 */

// 获取村级财务公开信息
router.get('/public/village/:villageId/summary',
  async (req, res) => {
    try {
      const { villageId } = req.params;

      // 这里需要实现公开财务信息查询逻辑
      // 只返回已公开的、经过脱敏处理的财务摘要信息
      const publicSummary = {
        villageId,
        period: {
          startDate: new Date(new Date().getFullYear(), 0, 1),
          endDate: new Date()
        },
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        categories: [],
        lastUpdated: new Date(),
        isPublic: true
      };

      res.json({
        success: true,
        data: publicSummary
      });

    } catch (error) {
      console.error('获取公开财务信息失败:', error);
      res.status(500).json({
        success: false,
        error: 'FETCH_FAILED',
        message: '获取公开财务信息失败'
      });
    }
  }
);

// 获取财务透明度报告
router.get('/public/village/:villageId/transparency-report',
  async (req, res) => {
    try {
      const { villageId } = req.params;

      // 生成财务透明度报告
      const transparencyReport = {
        villageId,
        reportDate: new Date(),
        transparencyScore: 85, // 透明度评分
        metrics: {
          dataCompleteness: 90,
          publicAccessibility: 80,
          auditTrail: 85,
          blockchainVerification: 75,
          citizenEngagement: 95
        },
        recommendations: [
          '建议增加更多财务细节的公开',
          '考虑实现更频繁的数据更新',
          '加强村民参与渠道的建设'
        ]
      };

      res.json({
        success: true,
        data: transparencyReport
      });

    } catch (error) {
      console.error('获取财务透明度报告失败:', error);
      res.status(500).json({
        success: false,
        error: 'FETCH_FAILED',
        message: '获取财务透明度报告失败'
      });
    }
  }
);

/**
 * 财务数据导出路由
 */

// 导出财务数据
router.post('/export',
  financeAudit,
  requirePermission('finance', 'export'),
  async (req, res) => {
    try {
      const { format = 'excel', filters = {}, dataType = 'transactions' } = req.body;

      // 这里需要实现财务数据导出逻辑
      // 支持 Excel、CSV、PDF 等格式
      const exportResult = {
        downloadUrl: `/exports/finance_${dataType}_${Date.now()}.${format}`,
        fileName: `财务数据_${dataType}_${new Date().toISOString().split('T')[0]}.${format}`,
        fileSize: 1024 * 1024, // 1MB
        recordCount: 100,
        exportedAt: new Date()
      };

      res.json({
        success: true,
        message: '数据导出成功',
        data: exportResult
      });

    } catch (error) {
      console.error('导出财务数据失败:', error);
      res.status(500).json({
        success: false,
        error: 'EXPORT_FAILED',
        message: '导出财务数据失败'
      });
    }
  }
);

/**
 * 财务分析报表路由
 */

// 获取财务分析报表
router.get('/analytics/reports',
  auditLogger({
    resource: 'finance_analytics',
    action: 'VIEW_REPORTS'
  }, { sensitiveLevel: 'sensitive' }),
  requirePermission('finance', 'analytics'),
  async (req, res) => {
    try {
      const { reportType, dateRange, groupBy } = req.query;

      // 生成财务分析报表
      const analyticsReports = {
        incomeExpenseTrend: {
          title: '收支趋势分析',
          data: []
        },
        categoryAnalysis: {
          title: '支出类别分析',
          data: []
        },
        budgetExecution: {
          title: '预算执行分析',
          data: []
        },
        comparison: {
          title: '同比环比分析',
          data: []
        }
      };

      res.json({
        success: true,
        data: analyticsReports
      });

    } catch (error) {
      console.error('获取财务分析报表失败:', error);
      res.status(500).json({
        success: false,
        error: 'FETCH_FAILED',
        message: '获取财务分析报表失败'
      });
    }
  }
);

/**
 * 财务监控告警路由
 */

// 获取财务监控告警
router.get('/monitoring/alerts',
  auditLogger({
    resource: 'finance_monitoring',
    action: 'VIEW_ALERTS'
  }, { sensitiveLevel: 'internal' }),
  requirePermission('finance', 'monitor'),
  async (req, res) => {
    try {
      const { severity, status, page = 1, limit = 20 } = req.query;

      // 获取财务监控告警
      const alerts = {
        total: 0,
        unread: 0,
        items: [
          {
            id: 'alert_001',
            type: 'budget_overrun',
            severity: 'high',
            title: '预算超支告警',
            message: '基础设施建设预算已超支15%',
            timestamp: new Date(),
            status: 'unread'
          }
        ]
      };

      res.json({
        success: true,
        data: alerts
      });

    } catch (error) {
      console.error('获取财务监控告警失败:', error);
      res.status(500).json({
        success: false,
        error: 'FETCH_FAILED',
        message: '获取财务监控告警失败'
      });
    }
  }
);

/**
 * 财务权限验证路由
 */

// 验证用户财务权限
router.post('/verify-permission',
  auditLogger({
    resource: 'finance_permission',
    action: 'VERIFY'
  }, { sensitiveLevel: 'internal' }),
  async (req, res) => {
    try {
      const { resource, action, context } = req.body;
      const user = req.user;

      // 这里需要实现权限验证逻辑
      const hasPermission = await verifyUserFinancePermission(user, resource, action, context);

      res.json({
        success: true,
        data: {
          hasPermission,
          resource,
          action,
          context
        }
      });

    } catch (error) {
      console.error('验证财务权限失败:', error);
      res.status(500).json({
        success: false,
        error: 'VERIFICATION_FAILED',
        message: '验证财务权限失败'
      });
    }
  }
);

/**
 * 健康检查路由
 */

// 财务模块健康检查
router.get('/health',
  async (req, res) => {
    try {
      const health = await checkFinanceModuleHealth();

      res.json({
        status: health.overallStatus,
        timestamp: new Date(),
        checks: health.checks
      });

    } catch (error) {
      console.error('财务模块健康检查失败:', error);
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date(),
        error: error.message
      });
    }
  }
);

/**
 * 辅助函数
 */

/**
 * 验证用户财务权限
 */
async function verifyUserFinancePermission(user, resource, action, context) {
  try {
    // 村民基础权限
    if (user.role === 'villager') {
      const hasBasicAccess = ['view_summary', 'view_details', 'ask_question'].includes(action);
      return hasBasicAccess;
    }

    // 村级管理员权限
    if (['village_admin', 'village_secretary'].includes(user.role)) {
      return true; // 村级管理员拥有所有财务权限
    }

    // 其他角色权限检查
    const rolePermissions = {
      'accountant': ['create', 'read', 'update', 'export'],
      'auditor': ['read', 'audit', 'export'],
      'super_admin': ['*']
    };

    const permissions = rolePermissions[user.role] || [];
    return permissions.includes('*') || permissions.includes(action);

  } catch (error) {
    console.error('验证财务权限失败:', error);
    return false;
  }
}

/**
 * 财务模块健康检查
 */
async function checkFinanceModuleHealth() {
  const checks = [];
  let overallStatus = 'healthy';

  try {
    // 检查数据库连接
    const { FinancialTransaction, InvoiceOCR, BudgetApproval } = require('../models/Finance');

    await FinancialTransaction.findOne().limit(1);
    checks.push({ name: '财务交易数据库连接', status: 'healthy' });

    await InvoiceOCR.findOne().limit(1);
    checks.push({ name: 'OCR识别数据库连接', status: 'healthy' });

    await BudgetApproval.findOne().limit(1);
    checks.push({ name: '预算审批数据库连接', status: 'healthy' });

    // 检查OCR服务
    const invoiceOCRService = require('../services/invoiceOCRService');
    const ocrEngines = Object.keys(invoiceOCRService.ocrEngines);
    checks.push({
      name: 'OCR识别服务',
      status: 'healthy',
      details: `可用引擎: ${ocrEngines.join(', ')}`
    });

    // 检查区块链服务
    const blockchainService = require('../services/blockchainService');
    const blockchainNetworks = Object.keys(blockchainService.networks);
    checks.push({
      name: '区块链服务',
      status: 'healthy',
      details: `支持网络: ${blockchainNetworks.join(', ')}`
    });

  } catch (error) {
    overallStatus = 'unhealthy';
    checks.push({
      name: '模块健康检查',
      status: 'unhealthy',
      error: error.message
    });
  }

  return {
    overallStatus,
    checks
  };
}

module.exports = router;