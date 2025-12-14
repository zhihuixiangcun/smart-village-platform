/**
 * 数据分析路由
 * 提供数据统计、分析和报表导出接口
 */

const express = require('express');
const router = express.Router();
const dataAnalyticsController = require('../controllers/dataAnalyticsController');
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

// 数据分析相关路由

// 仪表板数据
router.get('/dashboard',
  rateLimit.create({
    windowMs: 1 * 60 * 1000, // 1分钟
    max: 60, // 最多60次请求
    message: {
      success: false,
      message: '仪表板数据请求过于频繁，请稍后再试'
    }
  }),
  dataAnalyticsController.getDashboard
);

// 人口分析
router.get('/population',
  rateLimit.create({
    windowMs: 1 * 60 * 1000,
    max: 30,
    message: {
      success: false,
      message: '人口分析请求过于频繁，请稍后再试'
    }
  }),
  dataAnalyticsController.getPopulationAnalytics
);

// 财务分析
router.get('/financial',
  auth.required,
  rateLimit.create({
    windowMs: 1 * 60 * 1000,
    max: 30,
    message: {
      success: false,
      message: '财务分析请求过于频繁，请稍后再试'
    }
  }),
  dataAnalyticsController.getFinancialAnalytics
);

// 村务治理分析
router.get('/governance',
  rateLimit.create({
    windowMs: 1 * 60 * 1000,
    max: 30,
    message: {
      success: false,
      message: '村务治理分析请求过于频繁，请稍后再试'
    }
  }),
  dataAnalyticsController.getGovernanceAnalytics
);

// 应急管理分析
router.get('/emergency',
  auth.required,
  rateLimit.create({
    windowMs: 1 * 60 * 1000,
    max: 30,
    message: {
      success: false,
      message: '应急管理分析请求过于频繁，请稍后再试'
    }
  }),
  dataAnalyticsController.getEmergencyAnalytics
);

// 系统性能指标
router.get('/system/metrics',
  auth.required,
  rateLimit.create({
    windowMs: 1 * 60 * 1000,
    max: 60,
    message: {
      success: false,
      message: '系统指标请求过于频繁，请稍后再试'
    }
  }),
  dataAnalyticsController.getSystemMetrics
);

// 报表导出
router.post('/export',
  auth.required,
  rateLimit.create({
    windowMs: 2 * 60 * 1000, // 2分钟
    max: 10, // 最多10次导出请求
    message: {
      success: false,
      message: '报表导出请求过于频繁，请稍后再试'
    }
  }),
  dataAnalyticsController.exportReport
);

// 实时数据流 (SSE)
router.get('/realtime',
  rateLimit.create({
    windowMs: 1 * 60 * 1000,
    max: 10,
    message: {
      success: false,
      message: '实时数据流请求过于频繁，请稍后再试'
    }
  }),
  dataAnalyticsController.getRealTimeData
);

// 自定义报表查询
router.post('/custom-query',
  auth.required,
  rateLimit.create({
    windowMs: 1 * 60 * 1000,
    max: 20,
    message: {
      success: false,
      message: '自定义查询请求过于频繁，请稍后再试'
    }
  }),
  dataAnalyticsController.customReportQuery
);

// 清理缓存
router.post('/cache/clear',
  auth.required,
  rateLimit.create({
    windowMs: 5 * 60 * 1000, // 5分钟
    max: 5,
    message: {
      success: false,
      message: '缓存清理请求过于频繁，请稍后再试'
    }
  }),
  dataAnalyticsController.clearCache
);

// 获取报表模板
router.get('/templates',
  rateLimit.create({
    windowMs: 5 * 60 * 1000,
    max: 20,
    message: {
      success: false,
      message: '报表模板请求过于频繁，请稍后再试'
    }
  }),
  dataAnalyticsController.getReportTemplates
);

// 健康检查
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Data Analytics Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: {
      populationAnalytics: true,
      financialAnalytics: true,
      governanceAnalytics: true,
      emergencyAnalytics: true,
      realTimeData: true,
      customReports: true,
      dataExport: true,
      caching: true
    }
  });
});

// API使用统计
router.get('/stats', auth.required, async (req, res) => {
  try {
    // 这里应该从数据库获取实际统计数据
    const stats = {
      daily: {
        dashboardViews: 850,
        reportExports: 45,
        dataQueries: 320,
        realTimeConnections: 125
      },
      weekly: {
        dashboardViews: 5950,
        reportExports: 315,
        dataQueries: 2240,
        realTimeConnections: 875
      },
      monthly: {
        dashboardViews: 23800,
        reportExports: 1260,
        dataQueries: 8960,
        realTimeConnections: 3500
      },
      performance: {
        averageResponseTime: '1.8s',
        cacheHitRate: '85.2%',
        successRate: '99.4%',
        uptime: '99.9%'
      },
      popularReports: [
        { type: 'population', count: 1250 },
        { type: 'financial', count: 980 },
        { type: 'governance', count: 650 },
        { type: 'emergency', count: 420 }
      ]
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取统计信息失败',
      error: error.message
    });
  }
});

module.exports = router;