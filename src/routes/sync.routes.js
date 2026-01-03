/**
 * 离线数据同步路由
 * 处理客户端离线操作的同步请求
 */

const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
const auth = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissionMiddleware');
const rateLimit = require('express-rate-limit');

/**
 * 同步接口限流配置
 * 针对乡村弱网环境，使用较宽松的限制
 */
const syncRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 200, // 每个IP最多200个请求
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: '同步请求过于频繁，请稍后再试'
  },
  // 针对弱网环境的配置
  skipFailedRequests: true,
  skipSuccessfulRequests: false
});

/**
 * 批量同步限流 - 单个端点单独限制
 */
const batchSyncRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5分钟
  max: 10, // 5分钟内最多10次批量同步
  message: {
    success: false,
    error: '批量同步请求过于频繁，请稍后再试'
  }
});

// 应用限流和认证中间件
router.use(syncRateLimit);
router.use(auth.authenticate);

/**
 * @route   POST /api/sync/batch
 * @desc    批量同步离线操作
 * @access  Private
 * @body    {
 *           "operations": [
 *             {
 *               "operationId": "uuid",
 *               "operationType": "create|update|delete|batch_create|batch_update",
 *               "targetModel": "Resident|Household|...",
 *               "targetId": "objectId", // update/delete时必需
 *               "payload": { ... },
 *               "clientVersion": 1,
 *               "priority": 5,
 *               "deviceId": "device-identifier"
 *             }
 *           ],
 *           "villageId": "objectId",
 *           "deviceId": "device-identifier",
 *           "syncType": "manual|auto|conflict_resolution"
 *         }
 * @return  {
 *           "success": true,
 *           "data": {
 *             "syncSessionId": "sync_xxx",
 *             "results": { ... },
 *             "syncLog": { ... }
 *           }
 *         }
 */
router.post('/batch',
  batchSyncRateLimit,
  checkPermission('sync:upload'),
  syncController.batchSync
);

/**
 * @route   GET /api/sync/status/:userId/:deviceId?
 * @desc    获取同步状态
 * @access  Private
 * @query   limit=100
 * @return  {
 *           "success": true,
 *           "data": {
 *             "pending": 10,
 *             "conflicts": 2,
 *             "failed": 1,
 *             "recentSyncs": [...]
 *           }
 *         }
 */
router.get('/status/:userId/:deviceId?',
  checkPermission('sync:view'),
  syncController.getSyncStatus
);

/**
 * @route   GET /api/sync/operations/pending/:userId/:deviceId?
 * @desc    获取待同步操作列表
 * @access  Private
 * @query   limit=100
 * @return  {
 *           "success": true,
 *           "data": [...],
 *           "count": 10
 *         }
 */
router.get('/operations/pending/:userId/:deviceId?',
  checkPermission('sync:view'),
  syncController.getPendingOperations
);

/**
 * @route   POST /api/sync/operations/retry/:deviceId?
 * @desc    重试失败的操作
 * @access  Private
 * @return  {
 *           "success": true,
 *           "data": { "retried": 5, "message": "..." }
 *         }
 */
router.post('/operations/retry/:deviceId?',
  checkPermission('sync:retry'),
  syncController.retryFailedOperations
);

/**
 * @route   GET /api/sync/conflicts/:villageId
 * @desc    获取冲突列表
 * @access  Private
 * @query   limit=50, skip=0, status=open
 * @return  {
 *           "success": true,
 *           "data": [...],
 *           "count": 5
 *         }
 */
router.get('/conflicts/:villageId',
  checkPermission('sync:view'),
  syncController.getConflicts
);

/**
 * @route   POST /api/sync/conflicts/:conflictId/resolve
 * @desc    解决冲突
 * @access  Private
 * @body    {
 *           "resolution": "client_wins|server_wins|merge",
 *           "note": "解决说明"
 *         }
 * @return  {
 *           "success": true,
 *           "data": {...},
 *           "message": "冲突已解决"
 *         }
 */
router.post('/conflicts/:conflictId/resolve',
  checkPermission('sync:resolve'),
  syncController.resolveConflict
);

/**
 * @route   GET /api/sync/versions/:targetModel/:targetId
 * @desc    获取数据版本历史
 * @access  Private
 * @query   limit=50, skip=0
 * @return  {
 *           "success": true,
 *           "data": [...],
 *           "count": 10
 *         }
 */
router.get('/versions/:targetModel/:targetId',
  checkPermission('sync:view'),
  syncController.getDataVersions
);

/**
 * @route   POST /api/sync/versions/:targetModel/:targetId/rollback/:version
 * @desc    回滚到指定版本
 * @access  Private
 * @return  {
 *           "success": true,
 *           "data": {...},
 *           "message": "已回滚到版本 X"
 *         }
 */
router.post('/versions/:targetModel/:targetId/rollback/:version',
  checkPermission('sync:rollback'),
  syncController.rollbackToVersion
);

/**
 * @route   GET /api/sync/history/:userId?
 * @desc    获取同步历史
 * @access  Private
 * @query   limit=20, skip=0, status
 * @return  {
 *           "success": true,
 *           "data": [...],
 *           "count": 20
 *         }
 */
router.get('/history/:userId?',
  checkPermission('sync:view'),
  syncController.getSyncHistory
);

/**
 * @route   GET /api/sync/stats/:villageId
 * @desc    获取同步统计
 * @access  Private
 * @query   days=30
 * @return  {
 *           "success": true,
 *           "data": {
 *             "operations": [...],
 *             "syncs": [...]
 *           }
 *         }
 */
router.get('/stats/:villageId',
  checkPermission('sync:view'),
  syncController.getSyncStats
);

/**
 * @route   GET /api/sync/session/:syncSessionId
 * @desc    获取同步会话详情
 * @access  Private
 * @return  {
 *           "success": true,
 *           "data": {...}
 *         }
 */
router.get('/session/:syncSessionId',
  checkPermission('sync:view'),
  syncController.getSyncSession
);

/**
 * @route   POST /api/sync/cancel/:syncSessionId
 * @desc    取消正在进行的同步
 * @access  Private
 * @return  {
 *           "success": true,
 *           "data": { "syncSessionId": "..." },
 *           "message": "同步已取消"
 *         }
 */
router.post('/cancel/:syncSessionId',
  checkPermission('sync:cancel'),
  syncController.cancelSync
);

/**
 * @route   POST /api/sync/cleanup
 * @desc    清理旧数据
 * @access  Private (Admin only)
 * @query   days=30
 * @return  {
 *           "success": true,
 *           "data": {...},
 *           "message": "数据清理完成"
 *         }
 */
router.post('/cleanup',
  checkPermission('sync:cleanup'),
  syncController.cleanupOldData
);

module.exports = router;
