/**
 * 同步控制器
 * 处理离线数据同步的HTTP请求
 */

const syncService = require('../services/syncService');
const PendingOperation = require('../models/PendingOperation');
const SyncLog = require('../models/SyncLog');
const DataVersion = require('../models/DataVersion');
const DataConflict = require('../models/DataConflict');
const logger = require('../utils/logger');
const { body, validationResult, param } = require('express-validator');

/**
 * 批量同步离线操作
 */
async function batchSync(req, res) {
  try {
    const { error } = validationResult(req);
    if (error) {
      return res.status(400).json({
        success: false,
        error: '参数验证失败',
        details: error.array()
      });
    }

    const { operations } = req.body;

    if (!Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的操作数组'
      });
    }

    // 构建同步上下文
    const syncContext = {
      userId: req.user?.userId || req.headers['x-user-id'],
      villageId: req.body.villageId || req.user?.villageId,
      deviceId: req.body.deviceId || req.headers['x-device-id'],
      syncType: req.body.syncType || 'manual',
      clientInfo: {
        platform: req.headers['x-client-platform'],
        appVersion: req.headers['x-app-version'],
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    };

    // 执行批量同步
    const result = await syncService.batchSync(operations, syncContext);

    res.json({
      success: true,
      data: result,
      message: '同步请求已处理'
    });

  } catch (error) {
    logger.error('批量同步失败:', error);

    res.status(500).json({
      success: false,
      error: '批量同步失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * 获取同步状态
 */
async function getSyncStatus(req, res) {
  try {
    const userId = req.user?.userId || req.params.userId;
    const deviceId = req.params.deviceId || req.headers['x-device-id'];

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '缺少用户ID'
      });
    }

    const status = await syncService.getSyncStatus(userId, deviceId);

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('获取同步状态失败:', error);

    res.status(500).json({
      success: false,
      error: '获取同步状态失败',
      message: error.message
    });
  }
}

/**
 * 获取冲突列表
 */
async function getConflicts(req, res) {
  try {
    const villageId = req.params.villageId || req.user?.villageId;
    const {
      limit = 50,
      skip = 0,
      status = 'open'
    } = req.query;

    if (!villageId) {
      return res.status(400).json({
        success: false,
        error: '缺少村庄ID'
      });
    }

    const conflicts = await syncService.getConflicts(villageId, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      status
    });

    res.json({
      success: true,
      data: conflicts,
      count: conflicts.length
    });

  } catch (error) {
    logger.error('获取冲突列表失败:', error);

    res.status(500).json({
      success: false,
      error: '获取冲突列表失败',
      message: error.message
    });
  }
}

/**
 * 解决冲突
 */
async function resolveConflict(req, res) {
  try {
    const { error } = validationResult(req);
    if (error) {
      return res.status(400).json({
        success: false,
        error: '参数验证失败',
        details: error.array()
      });
    }

    const { conflictId } = req.params;
    const { resolution, note } = req.body;
    const userId = req.user?.userId;

    if (!['client_wins', 'server_wins', 'merge'].includes(resolution)) {
      return res.status(400).json({
        success: false,
        error: '无效的解决方案'
      });
    }

    const conflict = await syncService.resolveConflict(
      conflictId,
      resolution,
      userId,
      note
    );

    res.json({
      success: true,
      data: conflict,
      message: '冲突已解决'
    });

  } catch (error) {
    logger.error('解决冲突失败:', error);

    res.status(500).json({
      success: false,
      error: '解决冲突失败',
      message: error.message
    });
  }
}

/**
 * 获取数据版本历史
 */
async function getDataVersions(req, res) {
  try {
    const { targetModel, targetId } = req.params;
    const {
      limit = 50,
      skip = 0
    } = req.query;

    if (!targetModel || !targetId) {
      return res.status(400).json({
        success: false,
        error: '缺少目标模型或记录ID'
      });
    }

    const versions = await syncService.getDataVersions(
      targetModel,
      targetId,
      {
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    );

    res.json({
      success: true,
      data: versions,
      count: versions.length
    });

  } catch (error) {
    logger.error('获取数据版本失败:', error);

    res.status(500).json({
      success: false,
      error: '获取数据版本失败',
      message: error.message
    });
  }
}

/**
 * 回滚到指定版本
 */
async function rollbackToVersion(req, res) {
  try {
    const { error } = validationResult(req);
    if (error) {
      return res.status(400).json({
        success: false,
        error: '参数验证失败',
        details: error.array()
      });
    }

    const { targetModel, targetId, version } = req.params;
    const userId = req.user?.userId;

    const result = await syncService.rollbackToVersion(
      targetModel,
      targetId,
      parseInt(version),
      userId
    );

    res.json({
      success: true,
      data: result,
      message: `已回滚到版本 ${version}`
    });

  } catch (error) {
    logger.error('回滚版本失败:', error);

    res.status(500).json({
      success: false,
      error: '回滚版本失败',
      message: error.message
    });
  }
}

/**
 * 获取待同步操作列表
 */
async function getPendingOperations(req, res) {
  try {
    const userId = req.user?.userId || req.params.userId;
    const deviceId = req.params.deviceId || req.headers['x-device-id'];
    const { limit = 100 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '缺少用户ID'
      });
    }

    const operations = await PendingOperation.getPendingOperations(userId, deviceId);

    res.json({
      success: true,
      data: operations,
      count: operations.length
    });

  } catch (error) {
    logger.error('获取待同步操作失败:', error);

    res.status(500).json({
      success: false,
      error: '获取待同步操作失败',
      message: error.message
    });
  }
}

/**
 * 重试失败操作
 */
async function retryFailedOperations(req, res) {
  try {
    const userId = req.user?.userId;
    const deviceId = req.params.deviceId || req.headers['x-device-id'];

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '缺少用户ID'
      });
    }

    const result = await syncService.retryFailedOperations(userId, deviceId);

    res.json({
      success: true,
      data: result,
      message: result.message
    });

  } catch (error) {
    logger.error('重试失败操作失败:', error);

    res.status(500).json({
      success: false,
      error: '重试失败操作失败',
      message: error.message
    });
  }
}

/**
 * 获取同步历史
 */
async function getSyncHistory(req, res) {
  try {
    const userId = req.user?.userId || req.params.userId;
    const {
      limit = 20,
      skip = 0,
      status
    } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '缺少用户ID'
      });
    }

    const history = await SyncLog.getUserSyncHistory(userId, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      status
    });

    res.json({
      success: true,
      data: history,
      count: history.length
    });

  } catch (error) {
    logger.error('获取同步历史失败:', error);

    res.status(500).json({
      success: false,
      error: '获取同步历史失败',
      message: error.message
    });
  }
}

/**
 * 获取同步统计
 */
async function getSyncStats(req, res) {
  try {
    const villageId = req.params.villageId || req.user?.villageId;
    const { days = 30 } = req.query;

    if (!villageId) {
      return res.status(400).json({
        success: false,
        error: '缺少村庄ID'
      });
    }

    const [
      villageStats,
      villageSyncStats
    ] = await Promise.all([
      PendingOperation.getStats(villageId),
      SyncLog.getVillageSyncStats(villageId, parseInt(days))
    ]);

    res.json({
      success: true,
      data: {
        operations: villageStats,
        syncs: villageSyncStats
      }
    });

  } catch (error) {
    logger.error('获取同步统计失败:', error);

    res.status(500).json({
      success: false,
      error: '获取同步统计失败',
      message: error.message
    });
  }
}

/**
 * 取消同步
 */
async function cancelSync(req, res) {
  try {
    const { syncSessionId } = req.params;

    const syncLog = await SyncLog.findOne({ syncSessionId });
    if (!syncLog) {
      return res.status(404).json({
        success: false,
        error: '同步会话不存在'
      });
    }

    if (!['started', 'in_progress'].includes(syncLog.status)) {
      return res.status(400).json({
        success: false,
        error: '同步会话已完成或已取消'
      });
    }

    syncLog.status = 'cancelled';
    syncLog.timing.endTime = new Date();
    syncLog.timing.duration = syncLog.timing.endTime.getTime() - syncLog.timing.startTime.getTime();
    await syncLog.save();

    res.json({
      success: true,
      data: { syncSessionId },
      message: '同步已取消'
    });

  } catch (error) {
    logger.error('取消同步失败:', error);

    res.status(500).json({
      success: false,
      error: '取消同步失败',
      message: error.message
    });
  }
}

/**
 * 清理旧数据
 */
async function cleanupOldData(req, res) {
  try {
    const { days } = req.query;
    const options = days ? { pendingDays: parseInt(days) } : {};

    const results = await syncService.cleanup(options);

    res.json({
      success: true,
      data: results,
      message: '数据清理完成'
    });

  } catch (error) {
    logger.error('清理旧数据失败:', error);

    res.status(500).json({
      success: false,
      error: '清理旧数据失败',
      message: error.message
    });
  }
}

/**
 * 获取同步会话详情
 */
async function getSyncSession(req, res) {
  try {
    const { syncSessionId } = req.params;

    const syncLog = await SyncLog.findOne({ syncSessionId })
      .populate('userId', 'username name')
      .populate('villageId', 'name')
      .lean();

    if (!syncLog) {
      return res.status(404).json({
        success: false,
        error: '同步会话不存在'
      });
    }

    res.json({
      success: true,
      data: syncLog
    });

  } catch (error) {
    logger.error('获取同步会话失败:', error);

    res.status(500).json({
      success: false,
      error: '获取同步会话失败',
      message: error.message
    });
  }
}

module.exports = {
  batchSync: [
    body('operations').isArray().withMessage('operations必须是数组'),
    body('operations.*.operationId').notEmpty().withMessage('缺少operationId'),
    body('operations.*.operationType').isIn(['create', 'update', 'delete', 'batch_create', 'batch_update']).withMessage('无效的operationType'),
    body('operations.*.targetModel').isIn(['Resident', 'Household', 'Family', 'Announcement', 'Task', 'Finance', 'Emergency', 'Document', 'Feedback', 'Voting', 'CommitteeMember', 'DutySchedule']).withMessage('无效的targetModel'),
    body('operations.*.payload').notEmpty().withMessage('缺少payload'),
    batchSync
  ],

  getSyncStatus: [
    param('userId').optional().isMongoId().withMessage('无效的用户ID'),
    getSyncStatus
  ],

  getConflicts: [
    param('villageId').optional().isMongoId().withMessage('无效的村庄ID'),
    getConflicts
  ],

  resolveConflict: [
    param('conflictId').isMongoId().withMessage('无效的冲突ID'),
    body('resolution').isIn(['client_wins', 'server_wins', 'merge']).withMessage('无效的解决方案'),
    body('note').optional().isString().withMessage('备注必须是字符串'),
    resolveConflict
  ],

  getDataVersions: [
    param('targetModel').notEmpty().withMessage('缺少targetModel'),
    param('targetId').isMongoId().withMessage('无效的targetId'),
    getDataVersions
  ],

  rollbackToVersion: [
    param('targetModel').notEmpty().withMessage('缺少targetModel'),
    param('targetId').isMongoId().withMessage('无效的targetId'),
    param('version').isInt({ min: 1 }).withMessage('无效的版本号'),
    rollbackToVersion
  ],

  getPendingOperations,
  retryFailedOperations,
  getSyncHistory,
  getSyncStats,
  cancelSync,
  cleanupOldData,
  getSyncSession
};
