const express = require('express');
const { body, query } = require('express-validator');
const realtimeComputationController = require('../controllers/realtimeComputationController');
const logger = require('../utils/logger');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/apiValidation');
const router = express.Router();

/**
 * @route   GET /api/v1/realtime-computation/status
 * @desc    获取实时计算引擎状态
 * @access  Private
 */
router.get('/status',
  authenticate,
  realtimeComputationController.getEngineStatus
);

/**
 * @route   GET /api/v1/realtime-computation/metrics
 * @desc    获取实时指标数据
 * @access  Private
 */
router.get('/metrics',
  authenticate,
  [
    query('metricNames')
      .optional()
      .isString()
      .withMessage('指标名称必须是字符串'),
    query('windows')
      .optional()
      .isString()
      .withMessage('时间窗口必须是字符串'),
    query('timeRange')
      .optional()
      .isISO8601()
      .withMessage('时间范围格式无效')
  ],
  validateRequest,
  realtimeComputationController.getRealtimeMetrics
);

/**
 * @route   POST /api/v1/realtime-computation/stream
 * @desc    添加实时数据流
 * @access  Private
 */
router.post('/stream',
  authenticate,
  [
    body('dataType')
      .notEmpty()
      .withMessage('数据类型不能为空')
      .isString()
      .withMessage('数据类型必须是字符串'),
    body('data')
      .notEmpty()
      .withMessage('数据不能为空')
      .isObject()
      .withMessage('数据必须是对象')
  ],
  validateRequest,
  realtimeComputationController.addStreamData
);

/**
 * @route   POST /api/v1/realtime-computation/stream/batch
 * @desc    批量添加数据流
 * @access  Private
 */
router.post('/stream/batch',
  authenticate,
  [
    body('dataStreams')
      .notEmpty()
      .withMessage('数据流数组不能为空')
      .isArray({ min: 1 })
      .withMessage('数据流必须是非空数组'),
    body('dataStreams.*.dataType')
      .notEmpty()
      .withMessage('每个数据流都必须有数据类型'),
    body('dataStreams.*.data')
      .notEmpty()
      .withMessage('每个数据流都必须有数据')
  ],
  validateRequest,
  realtimeComputationController.addBatchStreamData
);

/**
 * @route   POST /api/v1/realtime-computation/metrics/register
 * @desc    注册新的指标
 * @access  Private (Admin only)
 */
router.post('/metrics/register',
  authenticate,
  authorize(['admin', 'system_admin']),
  [
    body('name')
      .notEmpty()
      .withMessage('指标名称不能为空')
      .isString()
      .withMessage('指标名称必须是字符串')
      .matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
      .withMessage('指标名称格式无效'),
    body('config')
      .notEmpty()
      .withMessage('配置不能为空')
      .isObject()
      .withMessage('配置必须是对象'),
    body('config.type')
      .isIn(['counter', 'gauge', 'histogram', 'rate'])
      .withMessage('指标类型无效'),
    body('config.unit')
      .optional()
      .isString()
      .withMessage('单位必须是字符串'),
    body('config.description')
      .optional()
      .isString()
      .withMessage('描述必须是字符串')
  ],
  validateRequest,
  realtimeComputationController.registerMetric
);

/**
 * @route   PUT /api/v1/realtime-computation/thresholds/:metricName
 * @desc    设置阈值规则
 * @access  Private (Admin only)
 */
router.put('/thresholds/:metricName',
  authenticate,
  authorize(['admin', 'system_admin']),
  [
    body('thresholdConfig')
      .notEmpty()
      .withMessage('阈值配置不能为空')
      .isObject()
      .withMessage('阈值配置必须是对象'),
    body('thresholdConfig.type')
      .isIn(['static', 'dynamic', 'adaptive'])
      .withMessage('阈值类型无效'),
    body('thresholdConfig.operator')
      .isIn(['>', '<', '>=', '<=', '==', '!='])
      .withMessage('操作符无效'),
    body('thresholdConfig.value')
      .isNumeric()
      .withMessage('阈值必须是数字'),
    body('thresholdConfig.alertLevel')
      .isIn(['info', 'warning', 'error', 'critical'])
      .withMessage('告警级别无效')
  ],
  validateRequest,
  realtimeComputationController.setThreshold
);

/**
 * @route   GET /api/v1/realtime-computation/alerts
 * @desc    获取告警信息
 * @access  Private
 */
router.get('/alerts',
  authenticate,
  [
    query('level')
      .optional()
      .isIn(['info', 'warning', 'error', 'critical'])
      .withMessage('告警级别无效'),
    query('status')
      .optional()
      .isIn(['active', 'resolved', 'acknowledged'])
      .withMessage('告警状态无效'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('限制数量必须在1-1000之间')
  ],
  validateRequest,
  realtimeComputationController.getAlerts
);

/**
 * @route   POST /api/v1/realtime-computation/optimize
 * @desc    手动触发性能优化
 * @access  Private (Admin only)
 */
router.post('/optimize',
  authenticate,
  authorize(['admin', 'system_admin']),
  realtimeComputationController.triggerOptimization
);

/**
 * @route   PUT /api/v1/realtime-computation/config
 * @desc    更新引擎配置
 * @access  Private (Admin only)
 */
router.put('/config',
  authenticate,
  authorize(['admin', 'system_admin']),
  [
    body('config')
      .notEmpty()
      .withMessage('配置不能为空')
      .isObject()
      .withMessage('配置必须是对象'),
    body('config.batchSize')
      .optional()
      .isInt({ min: 50, max: 2000 })
      .withMessage('批处理大小必须在50-2000之间'),
    body('config.flushInterval')
      .optional()
      .isInt({ min: 100, max: 10000 })
      .withMessage('刷新间隔必须在100-10000ms之间'),
    body('config.maxHistoryPoints')
      .optional()
      .isInt({ min: 100, max: 10000 })
      .withMessage('最大历史点数必须在100-10000之间'),
    body('config.maxQueueSize')
      .optional()
      .isInt({ min: 1000, max: 50000 })
      .withMessage('最大队列大小必须在1000-50000之间'),
    body('config.adaptiveBatchSize')
      .optional()
      .isBoolean()
      .withMessage('自适应批处理必须是布尔值'),
    body('config.compressionEnabled')
      .optional()
      .isBoolean()
      .withMessage('压缩启用必须是布尔值'),
    body('config.parallelProcessing')
      .optional()
      .isInt({ min: 1, max: 8 })
      .withMessage('并行处理线程数必须在1-8之间')
  ],
  validateRequest,
  realtimeComputationController.updateEngineConfig
);

/**
 * @route   POST /api/v1/realtime-computation/restart
 * @desc    重启实时计算引擎
 * @access  Private (Admin only)
 */
router.post('/restart',
  authenticate,
  authorize(['admin', 'system_admin']),
  [
    body('graceful')
      .optional()
      .isBoolean()
      .withMessage('优雅重启标志必须是布尔值')
  ],
  validateRequest,
  realtimeComputationController.restartEngine
);

/**
 * @route   GET /api/v1/realtime-computation/health
 * @desc    健康检查端点
 * @access  Public
 */
router.get('/health',
  (req, res) => {
    try {
      const status = realtimeComputationController.getEngineStatus(req, res);

      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/v1/realtime-computation/performance
 * @desc    获取性能监控数据
 * @access  Private (Admin only)
 */
router.get('/performance',
  authenticate,
  authorize(['admin', 'system_admin']),
  realtimeComputationController.getEngineStatus
);

/**
 * @route   POST /api/v1/realtime-computation/metrics/:metricName/data
 * @desc    向特定指标添加数据
 * @access  Private
 */
router.post('/metrics/:metricName/data',
  authenticate,
  [
    body('value')
      .notEmpty()
      .withMessage('指标值不能为空')
      .isNumeric()
      .withMessage('指标值必须是数字'),
    body('tags')
      .optional()
      .isObject()
      .withMessage('标签必须是对象'),
    body('timestamp')
      .optional()
      .isISO8601()
      .withMessage('时间戳格式无效')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { metricName } = req.params;
      const { value, tags, timestamp } = req.body;

      // 添加数据到指定指标
      await realtimeEngine.addMetricData(metricName, {
        value: parseFloat(value),
        tags: tags || {},
        timestamp: timestamp ? new Date(timestamp).getTime() : Date.now()
      });

      res.json({
        success: true,
        message: '指标数据添加成功',
        data: {
          metricName,
          value,
          timestamp: timestamp || new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('添加指标数据失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '添加指标数据失败',
        error: error.message
      });
    }
  }
);

module.exports = router;