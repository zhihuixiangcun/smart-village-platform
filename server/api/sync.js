/**
 * 同步API路由 - Sync API Routes
 *
 * 端点：
 * - POST /api/sync/push - 推送离线数据到服务器
 * - POST /api/sync/pull - 从服务器拉取最新数据
 * - GET /api/sync/status - 获取同步状态
 * - POST /api/sync/resolve-conflict - 解决同步冲突
 * - GET /api/sync/versions - 获取数据版本信息
 * - GET /api/sync/stats - 获取同步统计信息
 */

const express = require('express');
const router = express.Router();
const { offlineSyncService, SYNC_STATUS } = require('../services/offlineSyncService');
const { authenticate } = require('../middleware/auth');

/**
 * 中间件：认证token（所有同步API都需要认证）
 */
router.use(authenticate);

/**
 * POST /api/sync/push
 * 推送离线数据到服务器
 */
router.post('/push', async (req, res) => {
  try {
    const userId = req.user.id;
    const deviceId = req.headers['x-device-id'] || req.body.deviceId;
    const { records } = req.body;

    // 验证设备ID
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: '缺少设备ID'
      });
    }

    // 验证记录数组
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的同步记录'
      });
    }

    // 添加用户ID和设备ID到每条记录
    const syncRecords = records.map(record => ({
      ...record,
      userId,
      deviceId
    }));

    // 批量创建同步记录
    await offlineSyncService.addSyncRecords(syncRecords);

    // 执行批量同步
    const syncResult = await offlineSyncService.batchSync({ userId, deviceId });

    res.json({
      success: true,
      message: '数据推送成功',
      data: syncResult
    });
  } catch (error) {
    console.error('推送数据API错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/sync/pull
 * 从服务器拉取最新数据
 */
router.post('/pull', async (req, res) => {
  try {
    const userId = req.user.id;
    const { lastSyncTime, entityTypes } = req.body;

    // 解析上次同步时间
    const lastSync = lastSyncTime ? new Date(lastSyncTime) : new Date(0);

    // 根据实体类型获取对应的数据
    const data = {};

    // 示例：获取公告数据
    if (!entityTypes || entityTypes.includes('announcement')) {
      // 这里应该从数据库获取实际数据
      // 示例代码：
      // const Announcement = require('../models/Announcement');
      // data.announcements = await Announcement.find({
      //   updatedAt: { $gt: lastSync },
      //   villageId: req.user.villageId
      // });
      data.announcements = [];
    }

    // 示例：获取村民数据
    if (!entityTypes || entityTypes.includes('resident')) {
      // const Resident = require('../models/Resident');
      // data.residents = await Resident.find({
      //   updatedAt: { $gt: lastSync },
      //   villageId: req.user.villageId
      // });
      data.residents = [];
    }

    // 可以添加更多实体类型...

    // 获取当前数据版本
    const versions = await offlineSyncService.getBatchDataVersions(
      entityTypes || ['announcement', 'resident']
    );

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        versions,
        ...data
      }
    });
  } catch (error) {
    console.error('拉取数据API错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

/**
 * GET /api/sync/status
 * 获取同步状态
 */
router.get('/status', async (req, res) => {
  try {
    const userId = req.user.id;
    const deviceId = req.headers['x-device-id'];

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: '缺少设备ID'
      });
    }

    // 获取待同步记录
    const pendingSyncs = await offlineSyncService.getPendingSyncs({
      userId,
      deviceId,
      limit: 100
    });

    // 获取同步统计
    const stats = await offlineSyncService.getSyncStats({
      userId,
      deviceId
    });

    // 按状态分组统计
    const statusCount = {
      pending: pendingSyncs.length,
      syncing: stats.syncing || 0,
      success: stats.success || 0,
      failed: stats.failed || 0,
      conflict: stats.conflict || 0
    };

    res.json({
      success: true,
      data: {
        deviceId,
        statusCount,
        recentSyncs: pendingSyncs.slice(0, 10) // 最近10条待同步记录
      }
    });
  } catch (error) {
    console.error('获取同步状态API错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

/**
 * POST /api/sync/resolve-conflict
 * 解决同步冲突
 */
router.post('/resolve-conflict', async (req, res) => {
  try {
    const userId = req.user.id;
    const { syncLogId, resolution } = req.body;

    // 验证输入
    if (!syncLogId) {
      return res.status(400).json({
        success: false,
        message: '缺少同步日志ID'
      });
    }

    if (!resolution || !resolution.strategy) {
      return res.status(400).json({
        success: false,
        message: '缺少冲突解决策略'
      });
    }

    // 验证同步记录是否属于当前用户
    const SyncLog = require('../services/offlineSyncService').SyncLog;
    const syncLog = await SyncLog.findById(syncLogId);

    if (!syncLog) {
      return res.status(404).json({
        success: false,
        message: '同步记录不存在'
      });
    }

    if (syncLog.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权操作此同步记录'
      });
    }

    // 解决冲突
    const result = await offlineSyncService.resolveConflict(syncLogId, resolution);

    res.json({
      success: true,
      message: '冲突已解决',
      data: result
    });
  } catch (error) {
    console.error('解决冲突API错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/sync/versions
 * 获取数据版本信息
 */
router.get('/versions', async (req, res) => {
  try {
    const { types } = req.query;
    const entityTypes = types ? types.split(',') : ['announcement', 'resident', 'finance', 'project'];

    const versions = await offlineSyncService.getBatchDataVersions(entityTypes);

    res.json({
      success: true,
      data: {
        versions,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('获取数据版本API错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

/**
 * GET /api/sync/stats
 * 获取同步统计信息
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const deviceId = req.headers['x-device-id'];
    const { startDate, endDate } = req.query;

    const stats = await offlineSyncService.getSyncStats({
      userId,
      deviceId,
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取同步统计API错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

/**
 * POST /api/sync/manual
 * 手动触发同步
 */
router.post('/manual', async (req, res) => {
  try {
    const userId = req.user.id;
    const deviceId = req.headers['x-device-id'];

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: '缺少设备ID'
      });
    }

    // 执行批量同步
    const syncResult = await offlineSyncService.batchSync({ userId, deviceId });

    res.json({
      success: true,
      message: '同步已完成',
      data: syncResult
    });
  } catch (error) {
    console.error('手动同步API错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/sync/cleanup
 * 清理已完成的同步记录
 */
router.delete('/cleanup', async (req, res) => {
  try {
    const userId = req.user.id;
    const { daysToKeep = 30 } = req.query;

    // 清理旧记录（仅清理属于当前用户的）
    const SyncLog = require('../services/offlineSyncService').SyncLog;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysToKeep));

    const result = await SyncLog.deleteMany({
      userId,
      status: SYNC_STATUS.SUCCESS,
      completedAt: { $lt: cutoffDate }
    });

    res.json({
      success: true,
      message: `已清理 ${result.deletedCount} 条记录`,
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    console.error('清理同步记录API错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

module.exports = router;
