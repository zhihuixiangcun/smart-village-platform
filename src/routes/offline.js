/**
 * 离线模式路由
 * 提供离线队列和同步API端点
 */

const express = require('express');
const router = express.Router();
const offlineController = require('../controllers/offlineController');
const { authenticate } = require('../middleware/auth');

// 中间件：验证请求头中的离线模式标识
const validateOfflineMode = (req, res, next) => {
  const isOfflineMode = req.headers['x-offline-mode'] === 'true';
  req.offlineMode = isOfflineMode;
  next();
};

// ============================================
// 离线队列管理
// ============================================

/**
 * @route   POST /api/offline/queue
 * @desc    添加操作到离线队列
 * @access  Private
 */
router.post('/queue', authenticate, validateOfflineMode, offlineController.addToQueue);

/**
 * @route   GET /api/offline/queue
 * @desc    获取用户的离线队列
 * @access  Private
 * @query   status - 队列状态过滤 (pending, processing, synced, failed)
 * @query   limit - 返回数量限制 (默认50)
 * @query   includeFiles - 是否包含文件项 (true/false)
 */
router.get('/queue', authenticate, offlineController.getUserQueue);

/**
 * @route   GET /api/offline/queue/stats
 * @desc    获取队列统计信息
 * @access  Private
 */
router.get('/queue/stats', authenticate, offlineController.getQueueStats);

/**
 * @route   GET /api/offline/queue/:id
 * @desc    获取队列项详情
 * @access  Private
 */
router.get('/queue/:id', authenticate, offlineController.getQueueItem);

/**
 * @route   PUT /api/offline/queue/:id/cancel
 * @desc    取消队列项
 * @access  Private
 */
router.put('/queue/:id/cancel', authenticate, offlineController.cancelQueueItem);

/**
 * @route   POST /api/offline/queue/cancel-batch
 * @desc    批量取消队列项
 * @access  Private
 * @body    { ids: string[] }
 */
router.post('/queue/cancel-batch', authenticate, offlineController.cancelQueueItems);

/**
 * @route   PUT /api/offline/queue/:id/retry
 * @desc    重试失败的队列项
 * @access  Private
 */
router.put('/queue/:id/retry', authenticate, offlineController.retryQueueItem);

/**
 * @route   POST /api/offline/queue/retry-failed
 * @desc    批量重试失败的队列项
 * @access  Private
 */
router.post('/queue/retry-failed', authenticate, offlineController.retryFailedItems);

/**
 * @route   GET /api/offline/queue/failed
 * @desc    获取失败的队列项
 * @access  Private
 * @query   limit - 返回数量限制 (默认20)
 */
router.get('/queue/failed', authenticate, offlineController.getFailedItems);

/**
 * @route   DELETE /api/offline/queue/batch
 * @desc    批量删除队列项 (只能删除已取消或已同步的项目)
 * @access  Private
 * @body    { ids: string[] }
 */
router.delete('/queue/batch', authenticate, offlineController.deleteQueueItems);

// ============================================
// 同步操作
// ============================================

/**
 * @route   POST /api/offline/sync
 * @desc    执行离线数据同步
 * @access  Private
 * @body    {
 *           limit?: number,
 *           priority?: string,
 *           resourceTypes?: string[],
 *           villageId?: string,
 *           syncType?: 'manual' | 'auto' | 'scheduled' | 'background',
 *           triggerReason?: string,
 *           networkInfo?: object,
 *           syncScope?: object
 *         }
 */
router.post('/sync', authenticate, offlineController.executeSync);

/**
 * @route   GET /api/offline/sync/status
 * @desc    获取当前同步状态
 * @access  Private
 */
router.get('/sync/status', authenticate, offlineController.getSyncStatus);

/**
 * @route   GET /api/offline/sync/history
 * @desc    获取同步历史
 * @access  Private
 * @query   limit - 返回数量限制 (默认20)
 * @query   status - 状态过滤
 */
router.get('/sync/history', authenticate, offlineController.getSyncHistory);

/**
 * @route   GET /api/offline/sync/:sessionId
 * @desc    获取同步会话详情
 * @access  Private
 */
router.get('/sync/:sessionId', authenticate, offlineController.getSyncSession);

/**
 * @route   GET /api/offline/sync/stats
 * @desc    获取同步统计信息
 * @access  Private
 * @query   days - 统计天数 (默认30天)
 */
router.get('/sync/stats', authenticate, offlineController.getSyncStats);

// ============================================
// 管理操作
// ============================================

/**
 * @route   POST /api/offline/cleanup
 * @desc    清理已同步的旧记录 (仅管理员)
 * @access  Private (Admin)
 * @body    { daysOld?: number }
 */
router.post('/cleanup', authenticate, offlineController.cleanupSynced);

// ============================================
// 配置和元数据
// ============================================

/**
 * @route   GET /api/offline/config
 * @desc    获取离线模式配置
 * @access  Private
 */
router.get('/config', authenticate, offlineController.getConfig);

/**
 * @route   GET /api/offline/health
 * @desc    健康检查端点
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'offline-mode',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// 批量操作
// ============================================

/**
 * @route   POST /api/offline/queue/batch
 * @desc    批量添加操作到离线队列
 * @access  Private
 * @body    { items: Array }
 */
router.post('/queue/batch', authenticate, async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要添加的队列项数组'
      });
    }

    if (items.length > 100) {
      return res.status(400).json({
        success: false,
        message: '单次批量添加最多100个项目'
      });
    }

    const results = [];
    const errors = [];

    for (const item of items) {
      try {
        const queueItem = await offlineController.addToQueue({
          ...req,
          body: item
        });
        results.push(queueItem.data?.queueItemId);
      } catch (error) {
        errors.push({
          item,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `成功添加 ${results.length} 个项目到队列`,
      data: {
        added: results,
        failed: errors,
        total: items.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '批量添加失败',
      error: error.message
    });
  }
});

// ============================================
// 依赖管理
// ============================================

/**
 * @route   PUT /api/offline/queue/:id/dependencies
 * @desc    设置队列项的依赖关系
 * @access  Private
 * @body    { dependsOn: string[] }
 */
router.put('/queue/:id/dependencies', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { dependsOn } = req.body;
    const userId = req.user._id;

    const OfflineQueue = require('../models/OfflineQueue');

    const item = await OfflineQueue.findOne({
      _id: id,
      userId
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: '队列项不存在'
      });
    }

    if (item.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '只能为待处理的项目设置依赖'
      });
    }

    // 验证依赖项存在且属于同一用户
    const dependencies = await OfflineQueue.find({
      _id: { $in: dependsOn },
      userId,
      status: { $in: ['pending', 'synced'] }
    });

    if (dependencies.length !== dependsOn.length) {
      return res.status(400).json({
        success: false,
        message: '部分依赖项不存在或状态无效'
      });
    }

    item.dependsOn = dependsOn;
    await item.save();

    res.json({
      success: true,
      message: '依赖关系已设置',
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '设置依赖失败',
      error: error.message
    });
  }
});

module.exports = router;
