const express = require('express');
const logger = require('../utils/logger');
const router = express.Router();

const { securityMiddleware } = require('../security/securityMiddleware');

const {
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  getVillageStats
} = require('../controllers/villageController');

const {
  createTransaction,
  getTransactions,
  reviewTransaction,
  getFinancialStats,
  upload
} = require('../controllers/financeController');

const {
  createEmergencyReport,
  getEmergencyEvents,
  updateEmergencyStatus,
  getEmergencyStats
} = require('../controllers/emergencyController');

const {
  getDashboard,
  getPopulationAnalytics,
  getFinancialAnalytics,
  getGovernanceAnalytics,
  getEmergencyAnalytics,
  exportReport,
  getSystemMetrics,
  getReportTemplates
} = require('../controllers/dataAnalyticsController');

router.use(express.json({ limit: '10mb' }));
router.use(express.urlencoded({ extended: true }));

router.use(securityMiddleware.comprehensive({
  requireAuth: true,
  rateLimitOptions: {
    windowMs: 15 * 60 * 1000,
    max: 1000
  },
  auditOperations: {
    type: 'API_ACCESS',
    action: 'rest_api_call',
    resource: 'api_v1'
  }
}));

router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('API-Version', 'v1.0.1');
  res.header('Smart-Village-Platform', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

router.get('/', (req, res) => {
  res.json({
    name: 'Smart Village Platform API',
    version: 'v1.0.1',
    description: '智慧乡村平台 RESTful API 接口（优化版）',
    timestamp: new Date().toISOString(),
    endpoints: {
      village: '/api/v1/village',
      finance: '/api/v1/finance',
      emergency: '/api/v1/emergency',
      analytics: '/api/v1/analytics',
      health: '/api/v1/health'
    },
    documentation: '/api/v1/docs'
  });
});

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.1'
  });
});

const villageRouter = express.Router();

villageRouter.post('/announcements', createAnnouncement);
villageRouter.get('/announcements', getAnnouncements);
villageRouter.get('/announcements/:id', getAnnouncements);
villageRouter.put('/announcements/:id', updateAnnouncement);
villageRouter.delete('/announcements/:id', deleteAnnouncement);
villageRouter.get('/stats', getVillageStats);

router.use('/village', villageRouter);

const financeRouter = express.Router();

financeRouter.post('/transactions', createTransaction);
financeRouter.get('/transactions', getTransactions);
financeRouter.get('/transactions/:id', getTransactions);
financeRouter.put('/transactions/:id/review', reviewTransaction);
financeRouter.get('/stats', getFinancialStats);

router.use('/finance', financeRouter);

const emergencyRouter = express.Router();

emergencyRouter.post('/events', createEmergencyReport);
emergencyRouter.get('/events', getEmergencyEvents);
emergencyRouter.get('/events/:id', getEmergencyEvents);
emergencyRouter.put('/events/:id/status', updateEmergencyStatus);
emergencyRouter.get('/plans', getEmergencyEvents);
emergencyRouter.post('/plans', getEmergencyEvents);
emergencyRouter.get('/resources', getEmergencyEvents);
emergencyRouter.post('/resources', getEmergencyEvents);
emergencyRouter.get('/stats', getEmergencyStats);
emergencyRouter.get('/reports', getEmergencyEvents);

router.use('/emergency', emergencyRouter);

const analyticsRouter = express.Router();

analyticsRouter.get('/dashboard', getDashboard);
analyticsRouter.get('/population', getPopulationAnalytics);
analyticsRouter.get('/financial', getFinancialAnalytics);
analyticsRouter.get('/governance', getGovernanceAnalytics);
analyticsRouter.get('/emergency', getEmergencyAnalytics);
analyticsRouter.post('/export', exportReport);
analyticsRouter.get('/system-metrics', getSystemMetrics);
analyticsRouter.get('/templates', getReportTemplates);

router.use('/analytics', analyticsRouter);

router.use((req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error);
});

router.use((err, req, res, next) => {
  const status = err.status || 500;
  logger.error('API Error:', {
    status,
    message: err.message,
    path: req.path,
    method: req.method
  });

  res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error',
    code: err.status === 404 ? 'NOT_FOUND' : 'SERVER_ERROR',
    timestamp: new Date().toISOString(),
    path: req.path
  });
});

module.exports = router;
