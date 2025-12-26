/**
 * 智慧村庄平台 - API v1 路由管理器
 * 统一管理所有RESTful API接口，提供标准的REST API服务
 */

const express = require('express');
const logger = require('../utils/logger');
const router = express.Router();

// 导入安全中间件
const { securityMiddleware } = require('../security/securityMiddleware');

// 导入现有控制器
const {
  // 用户管理控制器
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  listUsers,
  getUserStats
} = require('../controllers/userController');

const {
  // 村务管理控制器
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  getVillageStats
} = require('../controllers/villageController');

const {
  // 财务管理控制器
  createTransaction,
  getTransactions,
  approveTransaction,
  getFinancialStats,
  uploadInvoice,
  recognizeInvoice
} = require('../controllers/financeController');

const {
  // 应急管理控制器
  createEmergencyReport,
  getEmergencyReports,
  updateEmergencyStatus,
  broadcastEmergencyAlert
} = require('../controllers/emergencyController');

const {
  // 数据分析控制器
  getVillageAnalytics,
  generateReport,
  exportData,
  getRealtimeMetrics
} = require('../controllers/dataAnalyticsController');

const {
  // 电子商务控制器
  createProduct,
  getProducts,
  createOrder,
  getOrders,
  processPayment
} = require('../controllers/ecommerceController');

const {
  // 支付控制器
  initiatePayment,
  confirmPayment,
  getPaymentHistory,
  refundPayment
} = require('../controllers/paymentController');

const {
  // 权限管理控制器
  assignRole,
  updatePermissions,
  getUserPermissions,
  checkAccess
} = require('../controllers/permissionController');

/**
 * API中间件配置
 */
router.use(express.json({ limit: '10mb' }));
router.use(express.urlencoded({ extended: true }));

// 全局安全中间件
router.use(securityMiddleware.comprehensive({
  requireAuth: true,
  rateLimitOptions: {
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 1000 // 最大请求数
  },
  auditOperations: {
    type: 'API_ACCESS',
    action: 'rest_api_call',
    resource: 'api_v1'
  }
}));

// CORS 头设置
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('API-Version', 'v1.0.0');
  res.header('Smart-Village-Platform', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// API版本信息
router.get('/', (req, res) => {
  res.json({
    name: 'Smart Village Platform API',
    version: 'v1.0.0',
    description: '智慧村庄平台 RESTful API 接口',
    timestamp: new Date().toISOString(),
    endpoints: {
      users: '/api/v1/users',
      village: '/api/v1/village',
      finance: '/api/v1/finance',
      emergency: '/api/v1/emergency',
      analytics: '/api/v1/analytics',
      ecommerce: '/api/v1/ecommerce',
      payments: '/api/v1/payments',
      permissions: '/api/v1/permissions',
      health: '/api/v1/health'
    },
    documentation: '/api/v1/docs'
  });
});

// 健康检查接口
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

/**
 * 用户管理 API (RESTful)
 * BASE: /api/v1/users
 */
const userRouter = express.Router();

// 应用用户相关的安全中间件
userRouter.use(securityMiddleware.dataAccessControl('personal'));

// GET /api/v1/users - 获取用户列表
userRouter.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, villageId } = req.query;
    const result = await listUsers({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      role,
      villageId
    });

    res.json({
      success: true,
      data: result,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'USER_LIST_ERROR'
    });
  }
});

// GET /api/v1/users/:id - 获取用户详情
userRouter.get('/:id', async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'USER_GET_ERROR'
    });
  }
});

// POST /api/v1/users - 创建用户
userRouter.post('/',
  securityMiddleware.sensitiveOperation('user_creation', false),
  async (req, res) => {
    try {
      const userData = req.body;
      const newUser = await createUser(userData);

      res.status(201).json({
        success: true,
        data: newUser,
        message: '用户创建成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'USER_CREATE_ERROR'
      });
    }
  }
);

// PUT /api/v1/users/:id - 更新用户信息
userRouter.put('/:id',
  securityMiddleware.sensitiveOperation('user_update', false),
  async (req, res) => {
    try {
      const userData = req.body;
      const updatedUser = await updateUser(req.params.id, userData);

      res.json({
        success: true,
        data: updatedUser,
        message: '用户信息更新成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'USER_UPDATE_ERROR'
      });
    }
  }
);

// DELETE /api/v1/users/:id - 删除用户
userRouter.delete('/:id',
  securityMiddleware.authorizeRole('village_admin', 'super_admin'),
  securityMiddleware.sensitiveOperation('user_deletion', true),
  async (req, res) => {
    try {
      await deleteUser(req.params.id);

      res.json({
        success: true,
        message: '用户删除成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'USER_DELETE_ERROR'
      });
    }
  }
);

// GET /api/v1/users/stats - 获取用户统计信息
userRouter.get('/stats', async (req, res) => {
  try {
    const stats = await getUserStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'USER_STATS_ERROR'
    });
  }
});

router.use('/users', userRouter);

/**
 * 村务管理 API (RESTful)
 * BASE: /api/v1/village
 */
const villageRouter = express.Router();

// GET /api/v1/village/announcements - 获取公告列表
villageRouter.get('/announcements', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, status } = req.query;
    const announcements = await getAnnouncements({
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      status
    });

    res.json({
      success: true,
      data: announcements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: announcements.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'ANNOUNCEMENTS_GET_ERROR'
    });
  }
});

// POST /api/v1/village/announcements - 创建公告
villageRouter.post('/announcements',
  securityMiddleware.authorize('write', 'announcements'),
  securityMiddleware.sensitiveOperation('announcement_creation', false),
  async (req, res) => {
    try {
      const announcementData = req.body;
      const newAnnouncement = await createAnnouncement(announcementData);

      res.status(201).json({
        success: true,
        data: newAnnouncement,
        message: '公告创建成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'ANNOUNCEMENT_CREATE_ERROR'
      });
    }
  }
);

// PUT /api/v1/village/announcements/:id - 更新公告
villageRouter.put('/announcements/:id',
  securityMiddleware.authorize('write', 'announcements'),
  securityMiddleware.sensitiveOperation('announcement_update', false),
  async (req, res) => {
    try {
      const announcementData = req.body;
      const updatedAnnouncement = await updateAnnouncement(req.params.id, announcementData);

      res.json({
        success: true,
        data: updatedAnnouncement,
        message: '公告更新成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'ANNOUNCEMENT_UPDATE_ERROR'
      });
    }
  }
);

// DELETE /api/v1/village/announcements/:id - 删除公告
villageRouter.delete('/announcements/:id',
  securityMiddleware.authorize('delete', 'announcements'),
  securityMiddleware.sensitiveOperation('announcement_deletion', false),
  async (req, res) => {
    try {
      await deleteAnnouncement(req.params.id);

      res.json({
        success: true,
        message: '公告删除成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'ANNOUNCEMENT_DELETE_ERROR'
      });
    }
  }
);

// GET /api/v1/village/stats - 获取村庄统计信息
villageRouter.get('/stats', async (req, res) => {
  try {
    const stats = await getVillageStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'VILLAGE_STATS_ERROR'
    });
  }
});

router.use('/village', villageRouter);

/**
 * 财务管理 API (RESTful)
 * BASE: /api/v1/finance
 */
const financeRouter = express.Router();

// 应用财务数据相关的安全中间件
financeRouter.use(securityMiddleware.dataAccessControl('financial', 'confidential'));

// GET /api/v1/finance/transactions - 获取交易记录
financeRouter.get('/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, startDate, endDate } = req.query;
    const transactions = await getTransactions({
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: transactions.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'TRANSACTIONS_GET_ERROR'
    });
  }
});

// POST /api/v1/finance/transactions - 创建交易记录
financeRouter.post('/transactions',
  securityMiddleware.authorize('write', 'financial'),
  securityMiddleware.sensitiveOperation('transaction_creation', false),
  async (req, res) => {
    try {
      const transactionData = req.body;
      const newTransaction = await createTransaction(transactionData);

      res.status(201).json({
        success: true,
        data: newTransaction,
        message: '交易记录创建成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'TRANSACTION_CREATE_ERROR'
      });
    }
  }
);

// PUT /api/v1/finance/transactions/:id/approve - 审批交易
financeRouter.put('/transactions/:id/approve',
  securityMiddleware.authorizeRole('village_admin', 'accountant'),
  securityMiddleware.sensitiveOperation('transaction_approval', false),
  async (req, res) => {
    try {
      const { approvalNotes } = req.body;
      const approvedTransaction = await approveTransaction(req.params.id, {
        approvedBy: req.user.id,
        approvalNotes,
        approvedAt: new Date()
      });

      res.json({
        success: true,
        data: approvedTransaction,
        message: '交易审批成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'TRANSACTION_APPROVAL_ERROR'
      });
    }
  }
);

// POST /api/v1/finance/invoices/recognize - 发票OCR识别
financeRouter.post('/invoices/recognize',
  securityMiddleware.authorize('write', 'financial'),
  async (req, res) => {
    try {
      const { imageData } = req.body;
      const recognizedData = await recognizeInvoice(imageData);

      res.json({
        success: true,
        data: recognizedData,
        message: '发票识别成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'INVOICE_RECOGNITION_ERROR'
      });
    }
  }
);

// GET /api/v1/finance/stats - 获取财务统计信息
financeRouter.get('/stats', async (req, res) => {
  try {
    const stats = await getFinancialStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'FINANCIAL_STATS_ERROR'
    });
  }
});

router.use('/finance', financeRouter);

/**
 * 应急管理 API (RESTful)
 * BASE: /api/v1/emergency
 */
const emergencyRouter = express.Router();

// GET /api/v1/emergency/reports - 获取应急报告
emergencyRouter.get('/reports', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const reports = await getEmergencyReports({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      type
    });

    res.json({
      success: true,
      data: reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: reports.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'EMERGENCY_REPORTS_GET_ERROR'
    });
  }
});

// POST /api/v1/emergency/reports - 创建应急报告
emergencyRouter.post('/reports',
  securityMiddleware.sensitiveOperation('emergency_report', false),
  async (req, res) => {
    try {
      const reportData = req.body;
      const newReport = await createEmergencyReport({
        ...reportData,
        reportedBy: req.user.id,
        reportedAt: new Date()
      });

      res.status(201).json({
        success: true,
        data: newReport,
        message: '应急报告创建成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'EMERGENCY_REPORT_CREATE_ERROR'
      });
    }
  }
);

// PUT /api/v1/emergency/reports/:id/status - 更新应急状态
emergencyRouter.put('/reports/:id/status',
  securityMiddleware.authorizeRole('village_admin', 'emergency_officer'),
  securityMiddleware.sensitiveOperation('emergency_status_update', false),
  async (req, res) => {
    try {
      const { status, notes } = req.body;
      const updatedReport = await updateEmergencyStatus(req.params.id, {
        status,
        notes,
        updatedBy: req.user.id,
        updatedAt: new Date()
      });

      res.json({
        success: true,
        data: updatedReport,
        message: '应急状态更新成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'EMERGENCY_STATUS_UPDATE_ERROR'
      });
    }
  }
);

// POST /api/v1/emergency/broadcast - 广播应急警报
emergencyRouter.post('/broadcast',
  securityMiddleware.authorizeRole('village_admin', 'emergency_officer'),
  securityMiddleware.sensitiveOperation('emergency_broadcast', true),
  async (req, res) => {
    try {
      const { message, severity, targetArea } = req.body;
      const broadcast = await broadcastEmergencyAlert({
        message,
        severity,
        targetArea,
        broadcastBy: req.user.id,
        broadcastAt: new Date()
      });

      res.json({
        success: true,
        data: broadcast,
        message: '应急警报广播成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'EMERGENCY_BROADCAST_ERROR'
      });
    }
  }
);

router.use('/emergency', emergencyRouter);

/**
 * 数据分析 API (RESTful)
 * BASE: /api/v1/analytics
 */
const analyticsRouter = express.Router();

// GET /api/v1/analytics/village - 获取村庄数据分析
analyticsRouter.get('/village', async (req, res) => {
  try {
    const { startDate, endDate, metrics } = req.query;
    const analytics = await getVillageAnalytics({
      startDate,
      endDate,
      metrics: metrics ? metrics.split(',') : null
    });

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'ANALYTICS_GET_ERROR'
    });
  }
});

// GET /api/v1/analytics/realtime - 获取实时指标
analyticsRouter.get('/realtime', async (req, res) => {
  try {
    const realtimeData = await getRealtimeMetrics();
    res.json({
      success: true,
      data: realtimeData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'REALTIME_METRICS_ERROR'
    });
  }
});

// POST /api/v1/analytics/reports - 生成分析报告
analyticsRouter.post('/reports',
  securityMiddleware.authorize('read', 'analytics'),
  securityMiddleware.sensitiveOperation('report_generation', false),
  async (req, res) => {
    try {
      const { reportType, filters, format = 'json' } = req.body;
      const report = await generateReport({
        type: reportType,
        filters,
        format,
        requestedBy: req.user.id
      });

      res.json({
        success: true,
        data: report,
        message: '分析报告生成成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'REPORT_GENERATION_ERROR'
      });
    }
  }
);

// GET /api/v1/analytics/export/:type - 导出数据
analyticsRouter.get('/export/:type',
  securityMiddleware.authorize('export', 'analytics'),
  async (req, res) => {
    try {
      const { type } = req.params;
      const { format = 'csv', filters } = req.query;

      const exportData = await exportData({
        type,
        format,
        filters: JSON.parse(filters || '{}'),
        requestedBy: req.user.id
      });

      // 设置下载头
      res.setHeader('Content-Disposition', `attachment; filename="${type}_export.${format}"`);
      res.setHeader('Content-Type', `application/${format === 'csv' ? 'csv' : 'json'}`);

      res.send(exportData);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'DATA_EXPORT_ERROR'
      });
    }
  }
);

router.use('/analytics', analyticsRouter);

/**
 * 电子商务 API (RESTful)
 * BASE: /api/v1/ecommerce
 */
const ecommerceRouter = express.Router();

// GET /api/v1/ecommerce/products - 获取产品列表
ecommerceRouter.get('/products', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search, sort } = req.query;
    const products = await getProducts({
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      search,
      sort
    });

    res.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: products.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'PRODUCTS_GET_ERROR'
    });
  }
});

// POST /api/v1/ecommerce/products - 创建产品
ecommerceRouter.post('/products',
  securityMiddleware.authorize('write', 'ecommerce'),
  securityMiddleware.sensitiveOperation('product_creation', false),
  async (req, res) => {
    try {
      const productData = req.body;
      const newProduct = await createProduct({
        ...productData,
        createdBy: req.user.id
      });

      res.status(201).json({
        success: true,
        data: newProduct,
        message: '产品创建成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'PRODUCT_CREATE_ERROR'
      });
    }
  }
);

// GET /api/v1/ecommerce/orders - 获取订单列表
ecommerceRouter.get('/orders', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, userId } = req.query;
    const orders = await getOrders({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      userId: userId || req.user.id
    });

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: orders.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'ORDERS_GET_ERROR'
    });
  }
});

// POST /api/v1/ecommerce/orders - 创建订单
ecommerceRouter.post('/orders',
  securityMiddleware.sensitiveOperation('order_creation', false),
  async (req, res) => {
    try {
      const orderData = req.body;
      const newOrder = await createOrder({
        ...orderData,
        userId: req.user.id
      });

      res.status(201).json({
        success: true,
        data: newOrder,
        message: '订单创建成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'ORDER_CREATE_ERROR'
      });
    }
  }
);

router.use('/ecommerce', ecommerceRouter);

/**
 * 支付管理 API (RESTful)
 * BASE: /api/v1/payments
 */
const paymentRouter = express.Router();

// 应用支付数据相关的安全中间件
paymentRouter.use(securityMiddleware.dataAccessControl('financial', 'confidential'));

// POST /api/v1/payments/initiate - 发起支付
paymentRouter.post('/initiate',
  securityMiddleware.sensitiveOperation('payment_initiation', false),
  async (req, res) => {
    try {
      const { orderId, amount, paymentMethod } = req.body;
      const payment = await initiatePayment({
        orderId,
        amount,
        paymentMethod,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: payment,
        message: '支付发起成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'PAYMENT_INITIATE_ERROR'
      });
    }
  }
);

// POST /api/v1/payments/confirm - 确认支付
paymentRouter.post('/confirm',
  securityMiddleware.sensitiveOperation('payment_confirmation', false),
  async (req, res) => {
    try {
      const { paymentId, transactionId } = req.body;
      const confirmedPayment = await confirmPayment({
        paymentId,
        transactionId,
        confirmedBy: req.user.id
      });

      res.json({
        success: true,
        data: confirmedPayment,
        message: '支付确认成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'PAYMENT_CONFIRM_ERROR'
      });
    }
  }
);

// GET /api/v1/payments/history - 获取支付历史
paymentRouter.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    const history = await getPaymentHistory({
      page: parseInt(page),
      limit: parseInt(limit),
      startDate,
      endDate,
      userId: req.user.id
    });

    res.json({
      success: true,
      data: history,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: history.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'PAYMENT_HISTORY_ERROR'
    });
  }
});

router.use('/payments', paymentRouter);

/**
 * 权限管理 API (RESTful)
 * BASE: /api/v1/permissions
 */
const permissionRouter = express.Router();

// GET /api/v1/permissions/user/:userId - 获取用户权限
permissionRouter.get('/user/:userId', async (req, res) => {
  try {
    const permissions = await getUserPermissions(req.params.userId);
    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'PERMISSIONS_GET_ERROR'
    });
  }
});

// POST /api/v1/permissions/assign - 分配角色
permissionRouter.post('/assign',
  securityMiddleware.authorizeRole('village_admin', 'super_admin'),
  securityMiddleware.sensitiveOperation('role_assignment', false),
  async (req, res) => {
    try {
      const { userId, role, permissions } = req.body;
      const assignedRole = await assignRole({
        userId,
        role,
        permissions,
        assignedBy: req.user.id
      });

      res.json({
        success: true,
        data: assignedRole,
        message: '角色分配成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'ROLE_ASSIGN_ERROR'
      });
    }
  }
);

// PUT /api/v1/permissions/update - 更新权限
permissionRouter.put('/update',
  securityMiddleware.authorizeRole('village_admin', 'super_admin'),
  securityMiddleware.sensitiveOperation('permission_update', false),
  async (req, res) => {
    try {
      const { userId, permissions } = req.body;
      const updatedPermissions = await updatePermissions({
        userId,
        permissions,
        updatedBy: req.user.id
      });

      res.json({
        success: true,
        data: updatedPermissions,
        message: '权限更新成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'PERMISSION_UPDATE_ERROR'
      });
    }
  }
);

// POST /api/v1/permissions/check - 检查权限
permissionRouter.post('/check', async (req, res) => {
  try {
    const { userId, resource, action } = req.body;
    const hasAccess = await checkAccess({
      userId,
      resource,
      action
    });

    res.json({
      success: true,
      data: { hasAccess }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'PERMISSION_CHECK_ERROR'
    });
  }
});

router.use('/permissions', permissionRouter);

/**
 * API错误处理中间件
 */
router.use((error, req, res, next) => {
  logger.error('API Error:', error);
  // 安全错误处理 - 避免泄露敏感信息
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(error.status || 500).json({
    success: false,
    error: isProduction ? '服务器内部错误' : error.message,
    code: error.code || 'INTERNAL_SERVER_ERROR',
    timestamp: new Date().toISOString(),
    requestId: req.id
  });
});

/**
 * 404 处理
 */
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API接口不存在',
    code: 'API_NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      '/api/v1/users',
      '/api/v1/village',
      '/api/v1/finance',
      '/api/v1/emergency',
      '/api/v1/analytics',
      '/api/v1/ecommerce',
      '/api/v1/payments',
      '/api/v1/permissions'
    ]
  });
});

module.exports = router;