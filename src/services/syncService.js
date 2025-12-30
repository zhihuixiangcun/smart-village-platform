/**
 * 离线数据同步服务
 * 处理客户端离线操作的服务器端同步逻辑
 * 支持批量同步、冲突检测、版本控制、重试机制
 */

const PendingOperation = require('../models/PendingOperation');
const SyncLog = require('../models/SyncLog');
const DataVersion = require('../models/DataVersion');
const DataConflict = require('../models/DataConflict');
const logger = require('../utils/logger');
const crypto = require('crypto');

class SyncService {
  constructor() {
    // 同步配置
    this.config = {
      // 批量处理大小
      batchSize: 50,
      // 最大重试次数
      maxRetries: 5,
      // 冲突解决策略
      conflictResolution: 'latest_timestamp', // server_wins, client_wins, latest_timestamp, merge
      // 启用自动冲突解决
      autoResolveConflicts: true,
      // 超时时间(毫秒)
      timeout: 60000,
      // 是否启用版本控制
      enableVersionControl: true,
      // 是否启用数据校验
      enableDataValidation: true,
      // 保留版本数量
      keepVersions: 10
    };

    // 数据模型映射
    this.modelMap = {
      'Resident': 'Resident',
      'Household': 'Household',
      'Family': 'Family',
      'Announcement': 'Announcement',
      'Task': 'Task',
      'Finance': 'Finance',
      'Emergency': 'Emergency',
      'Document': 'Document',
      'Feedback': 'Feedback',
      'Voting': 'Voting',
      'CommitteeMember': 'CommitteeMember',
      'DutySchedule': 'DutySchedule'
    };
  }

  /**
   * 批量同步离线操作
   * @param {Array} operations - 待同步的操作列表
   * @param {Object} syncContext - 同步上下文信息
   * @returns {Promise<Object>} 同步结果
   */
  async batchSync(operations, syncContext) {
    const {
      userId,
      villageId,
      deviceId,
      syncType = 'manual',
      clientInfo = {}
    } = syncContext;

    // 创建同步日志
    const syncLog = await SyncLog.create({
      userId,
      villageId,
      deviceId,
      syncType,
      syncDirection: 'client_to_server',
      status: 'in_progress',
      statistics: {
        totalOperations: operations.length
      },
      timing: {
        startTime: new Date()
      },
      clientInfo,
      metadata: {
        initiatedBy: 'user',
        triggerReason: 'client_sync_request'
      }
    });

    logger.info(`开始批量同步: 会话${syncLog.syncSessionId}, 操作数${operations.length}`);

    const results = {
      successful: [],
      failed: [],
      conflicts: [],
      skipped: [],
      stats: {
        total: operations.length,
        successful: 0,
        failed: 0,
        conflicts: 0,
        skipped: 0
      }
    };

    try {
      // 按优先级排序操作
      const sortedOps = operations.sort((a, b) => (b.priority || 5) - (a.priority || 5));

      // 分批处理操作
      for (let i = 0; i < sortedOps.length; i += this.config.batchSize) {
        const batch = sortedOps.slice(i, i + this.config.batchSize);

        // 更新进度
        await syncLog.updateProgress(
          Math.round((i / sortedOps.length) * 100),
          `正在处理第 ${Math.floor(i / this.config.batchSize) + 1} 批操作...`
        );

        // 处理批次
        await this.processBatch(batch, syncLog, results);
      }

      // 更新同步日志状态
      if (results.stats.failed === 0 && results.stats.conflicts === 0) {
        await syncLog.markCompleted({
          message: '同步成功完成',
          recommendations: results.stats.conflicts > 0 ? ['需要手动解决冲突'] : []
        });
      } else if (results.stats.failed > 0) {
        await syncLog.markPartial({
          message: `部分同步完成: ${results.stats.successful}成功, ${results.stats.failed}失败, ${results.stats.conflicts}冲突`,
          recommendations: ['检查失败操作', '解决冲突后重新同步']
        });
      } else {
        await syncLog.markCompleted({
          message: '同步完成，存在冲突需解决',
          recommendations: ['手动解决数据冲突']
        });
      }

      // 更新统计信息
      await syncLog.updateStatistics({
        successfulOperations: results.stats.successful,
        failedOperations: results.stats.failed,
        conflictOperations: results.stats.conflicts,
        skippedOperations: results.stats.skipped
      });

      logger.info(`批量同步完成: ${JSON.stringify(results.stats)}`);

      return {
        success: true,
        syncSessionId: syncLog.syncSessionId,
        results,
        syncLog: await this.formatSyncLog(syncLog)
      };

    } catch (error) {
      logger.error('批量同步失败:', error);
      await syncLog.markFailed(error);

      throw error;
    }
  }

  /**
   * 处理一批操作
   */
  async processBatch(batch, syncLog, results) {
    for (const operation of batch) {
      try {
        // 幂等性检查
        const existingOp = await PendingOperation.operationExists(operation.operationId);
        if (existingOp && existingOp.syncStatus === 'synced') {
          results.skipped.push(operation);
          results.stats.skipped++;
          await syncLog.addOperationDetail({
            operationId: operation.operationId,
            status: 'skipped',
            message: '操作已同步'
          });
          continue;
        }

        // 处理单个操作
        const result = await this.processOperation(operation, syncLog);

        if (result.success) {
          results.successful.push(result);
          results.stats.successful++;
        } else if (result.conflict) {
          results.conflicts.push(result);
          results.stats.conflicts++;
        } else {
          results.failed.push(result);
          results.stats.failed++;
        }

        await syncLog.addOperationDetail({
          operationId: operation.operationId,
          operationType: operation.operationType,
          targetModel: operation.targetModel,
          status: result.success ? 'success' : result.conflict ? 'conflict' : 'failed',
          errorMessage: result.error
        });

      } catch (error) {
        logger.error(`处理操作失败 ${operation.operationId}:`, error);
        results.failed.push({
          operationId: operation.operationId,
          error: error.message
        });
        results.stats.failed++;
      }
    }
  }

  /**
   * 处理单个操作
   */
  async processOperation(operation, syncLog) {
    const Model = mongoose.model(this.modelMap[operation.targetModel]);
    if (!Model) {
      throw new Error(`未找到模型: ${operation.targetModel}`);
    }

    // 检查冲突
    const conflict = await this.detectConflict(operation);
    if (conflict && !this.config.autoResolveConflicts) {
      return {
        success: false,
        conflict: true,
        conflictId: conflict._id,
        operationId: operation.operationId,
        message: '检测到数据冲突'
      };
    }

    // 版本控制检查
    if (this.config.enableVersionControl && operation.clientVersion) {
      const latestVersion = await DataVersion.getLatestVersion(
        operation.targetModel,
        operation.targetId || operation.payload._id
      );

      if (latestVersion && latestVersion.version > operation.clientVersion) {
        // 版本不匹配，可能存在冲突
        if (this.config.autoResolveConflicts) {
          const resolved = await this.resolveVersionConflict(
            operation,
            latestVersion,
            syncLog
          );
          if (!resolved.resolved) {
            return {
              success: false,
              conflict: true,
              operationId: operation.operationId,
              message: '版本冲突，无法自动解决'
            };
          }
          // 使用解决后的数据
          operation.payload = resolved.data;
        } else {
          return {
            success: false,
            conflict: true,
            operationId: operation.operationId,
            serverVersion: latestVersion.version,
            message: '服务器数据已更新'
          };
        }
      }
    }

    // 执行操作
    let result;
    switch (operation.operationType) {
      case 'create':
        result = await this.handleCreate(Model, operation, syncLog);
        break;
      case 'update':
        result = await this.handleUpdate(Model, operation, syncLog);
        break;
      case 'delete':
        result = await this.handleDelete(Model, operation, syncLog);
        break;
      case 'batch_create':
        result = await this.handleBatchCreate(Model, operation, syncLog);
        break;
      case 'batch_update':
        result = await this.handleBatchUpdate(Model, operation, syncLog);
        break;
      default:
        throw new Error(`不支持的操作类型: ${operation.operationType}`);
    }

    // 更新PendingOperation状态
    if (result.success) {
      await PendingOperation.findOneAndUpdate(
        { operationId: operation.operationId },
        {
          $set: {
            syncStatus: 'synced',
            serverVersion: result.serverVersion,
            'syncStats.completedAt': new Date()
          }
        }
      );
    } else if (result.conflict) {
      await PendingOperation.findOneAndUpdate(
        { operationId: operation.operationId },
        { $set: { syncStatus: 'conflict' } }
      );
    }

    return result;
  }

  /**
   * 处理创建操作
   */
  async handleCreate(Model, operation, syncLog) {
    try {
      const data = {
        ...operation.payload,
        villageId: operation.villageId,
        createdBy: operation.userId
      };

      const doc = await Model.create(data);

      // 创建版本记录
      if (this.config.enableVersionControl) {
        await DataVersion.createInitialVersion(
          operation.targetModel,
          doc._id,
          operation.villageId,
          doc.toJSON(),
          {
            userId: operation.userId,
            username: operation.username,
            name: operation.name
          }
        );
      }

      return {
        success: true,
        operationId: operation.operationId,
        targetId: doc._id,
        serverVersion: 1,
        message: '创建成功'
      };
    } catch (error) {
      if (error.code === 11000) {
        // 重复键错误，可能是已同步的操作
        return {
          success: true,
          operationId: operation.operationId,
          skipped: true,
          message: '记录已存在'
        };
      }
      throw error;
    }
  }

  /**
   * 处理更新操作
   */
  async handleUpdate(Model, operation, syncLog) {
    const { targetId, payload } = operation;

    const doc = await Model.findOneAndUpdate(
      { _id: targetId, villageId: operation.villageId },
      {
        ...payload,
        updatedBy: operation.userId,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!doc) {
      return {
        success: false,
        operationId: operation.operationId,
        error: '记录不存在或已被删除'
      };
    }

    // 创建版本记录
    if (this.config.enableVersionControl) {
      const latestVersion = await DataVersion.getLatestVersion(
        operation.targetModel,
        targetId
      );

      const nextVersion = await DataVersion.create(
        {
          targetModel: operation.targetModel,
          targetId,
          villageId: operation.villageId,
          version: (latestVersion?.version || 0) + 1,
          parentVersionId: latestVersion?._id || null,
          changeType: 'update',
          operator: {
            userId: operation.userId,
            username: operation.username,
            name: operation.name
          },
          dataSnapshot: doc.toJSON(),
          previousData: latestVersion?.dataSnapshot,
          context: {
            source: 'offline_sync',
            deviceId: operation.deviceId,
            operationId: operation.operationId
          }
        }
      );

      return {
        success: true,
        operationId: operation.operationId,
        targetId,
        serverVersion: nextVersion.version,
        message: '更新成功'
      };
    }

    return {
      success: true,
      operationId: operation.operationId,
      targetId,
      serverVersion: operation.clientVersion + 1,
      message: '更新成功'
    };
  }

  /**
   * 处理删除操作
   */
  async handleDelete(Model, operation, syncLog) {
    const { targetId } = operation;

    const doc = await Model.findOneAndUpdate(
      { _id: targetId, villageId: operation.villageId },
      {
        isDeleted: true,
        deletedBy: operation.userId,
        deletedAt: new Date()
      }
    );

    if (!doc) {
      return {
        success: false,
        operationId: operation.operationId,
        error: '记录不存在'
      };
    }

    // 创建版本记录
    if (this.config.enableVersionControl) {
      const latestVersion = await DataVersion.getLatestVersion(
        operation.targetModel,
        targetId
      );

      await DataVersion.create({
        targetModel: operation.targetModel,
        targetId,
        villageId: operation.villageId,
        version: (latestVersion?.version || 0) + 1,
        parentVersionId: latestVersion?._id || null,
        changeType: 'delete',
        operator: {
          userId: operation.userId,
          username: operation.username,
          name: operation.name
        },
        dataSnapshot: doc.toJSON(),
        context: {
          source: 'offline_sync',
          deviceId: operation.deviceId,
          operationId: operation.operationId
        }
      });
    }

    return {
      success: true,
      operationId: operation.operationId,
      targetId,
      message: '删除成功'
    };
  }

  /**
   * 处理批量创建
   */
  async handleBatchCreate(Model, operation, syncLog) {
    const { payload } = operation;
    const documents = payload.map(data => ({
      ...data,
      villageId: operation.villageId,
      createdBy: operation.userId
    }));

    const results = await Model.insertMany(documents, { ordered: false });

    return {
      success: true,
      operationId: operation.operationId,
      created: results.length,
      message: `批量创建成功: ${results.length}条`
    };
  }

  /**
   * 处理批量更新
   */
  async handleBatchUpdate(Model, operation, syncLog) {
    const { payload } = operation;
    let updatedCount = 0;

    for (const item of payload) {
      const result = await Model.findOneAndUpdate(
        { _id: item._id, villageId: operation.villageId },
        {
          ...item.updates,
          updatedBy: operation.userId,
          updatedAt: new Date()
        }
      );
      if (result) updatedCount++;
    }

    return {
      success: true,
      operationId: operation.operationId,
      updated: updatedCount,
      message: `批量更新成功: ${updatedCount}条`
    };
  }

  /**
   * 检测冲突
   */
  async detectConflict(operation) {
    if (operation.operationType === 'create') {
      return null; // 创建操作通常不会冲突
    }

    const Model = mongoose.model(this.modelMap[operation.targetModel]);
    if (!Model) return null;

    const targetId = operation.targetId || operation.payload?._id;
    if (!targetId) return null;

    const existingDoc = await Model.findOne({ _id: targetId });
    if (!existingDoc) {
      // 记录已被删除
      return {
        type: 'record_deleted',
        message: '目标记录已被删除'
      };
    }

    // 检查版本
    if (operation.clientVersion && this.config.enableVersionControl) {
      const latestVersion = await DataVersion.getLatestVersion(
        operation.targetModel,
        targetId
      );

      if (latestVersion && latestVersion.version > operation.clientVersion) {
        return {
          type: 'version_mismatch',
          serverVersion: latestVersion.version,
          clientVersion: operation.clientVersion,
          serverData: latestVersion.dataSnapshot,
          message: '服务器数据已更新'
        };
      }
    }

    return null;
  }

  /**
   * 解决版本冲突
   */
  async resolveVersionConflict(operation, latestVersion, syncLog) {
    const { conflictResolution } = this.config;

    let resolvedData;
    let resolved = false;

    switch (conflictResolution) {
      case 'server_wins':
        resolvedData = latestVersion.dataSnapshot;
        resolved = true;
        break;

      case 'client_wins':
        resolvedData = operation.payload;
        resolved = true;
        break;

      case 'latest_timestamp':
        const clientTime = new Date(operation.payload.updatedAt || operation.clientUpdatedAt);
        const serverTime = new Date(latestVersion.dataSnapshot.updatedAt || latestVersion.createdAt);

        if (clientTime > serverTime) {
          resolvedData = operation.payload;
        } else {
          resolvedData = latestVersion.dataSnapshot;
        }
        resolved = true;
        break;

      case 'merge':
        // 尝试智能合并
        resolvedData = await this.smartMerge(
          operation.payload,
          latestVersion.dataSnapshot,
          latestVersion.previousData
        );
        resolved = resolvedData !== null;
        break;

      default:
        resolved = false;
    }

    if (resolved) {
      // 记录冲突解决
      await syncLog.addConflictResolution({
        operationId: operation.operationId,
        targetModel: operation.targetModel,
        targetId: operation.targetId,
        conflictType: 'version_mismatch',
        resolution: conflictResolution,
        resolvedBy: 'auto'
      });
    }

    return { resolved, data: resolvedData };
  }

  /**
   * 智能合并数据
   */
  async smartMerge(clientData, serverData, baseData) {
    const merged = { ...serverData };
    let hasChanges = false;

    // 如果没有基础数据，使用服务器数据
    if (!baseData) {
      return null; // 无法合并
    }

    // 遍历客户端数据
    for (const key of Object.keys(clientData)) {
      const clientValue = clientData[key];
      const serverValue = serverData[key];
      const baseValue = baseData[key];

      // 如果客户端修改了字段，且服务器没有修改
      if (JSON.stringify(clientValue) !== JSON.stringify(baseValue) &&
          JSON.stringify(serverValue) === JSON.stringify(baseValue)) {
        merged[key] = clientValue;
        hasChanges = true;
      }
      // 如果两边都修改了，保留服务器值（服务器优先）
    }

    return hasChanges ? merged : null;
  }

  /**
   * 获取同步状态
   */
  async getSyncStatus(userId, deviceId) {
    const pendingCount = await PendingOperation.countDocuments({
      userId,
      deviceId,
      syncStatus: 'pending'
    });

    const conflictCount = await PendingOperation.countDocuments({
      userId,
      deviceId,
      syncStatus: 'conflict'
    });

    const failedCount = await PendingOperation.countDocuments({
      userId,
      deviceId,
      syncStatus: 'failed'
    });

    const recentSyncs = await SyncLog.find({
      userId,
      deviceId
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

    return {
      pending: pendingCount,
      conflicts: conflictCount,
      failed: failedCount,
      recentSyncs: recentSyncs.map(log => this.formatSyncLog(log))
    };
  }

  /**
   * 获取冲突列表
   */
  async getConflicts(villageId, options = {}) {
    const {
      limit = 50,
      skip = 0,
      status = 'open'
    } = options;

    const conflicts = await DataConflict.find({
      villageId,
      status
    })
    .sort({ severity: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'username name')
    .populate('resolvedBy', 'username name')
    .lean();

    return conflicts;
  }

  /**
   * 解决冲突
   */
  async resolveConflict(conflictId, resolution, userId, note) {
    const conflict = await DataConflict.findById(conflictId);
    if (!conflict) {
      throw new Error('冲突记录不存在');
    }

    switch (resolution) {
      case 'client_wins':
        await conflict.resolveClientWins(userId, note);
        break;
      case 'server_wins':
        await conflict.resolveServerWins(userId, note);
        break;
      case 'merge':
        // 合并逻辑需要在前端提供合并后的数据
        await conflict.resolveMerge(resolution.mergedData, userId, note);
        break;
      default:
        throw new Error(`不支持的解决方案: ${resolution}`);
    }

    // 更新关联的PendingOperation
    if (conflict.syncOperationId) {
      await PendingOperation.findOneAndUpdate(
        { _id: conflict.syncOperationId },
        {
          $set: {
            syncStatus: 'pending',
            'conflictInfo.resolution': resolution
          }
        }
      );
    }

    return conflict;
  }

  /**
   * 获取数据版本
   */
  async getDataVersions(targetModel, targetId, options = {}) {
    const {
      limit = 50,
      skip = 0
    } = options;

    const versions = await DataVersion.getVersionHistory(
      targetModel,
      targetId,
      { limit, skip }
    );

    return versions;
  }

  /**
   * 回滚到指定版本
   */
  async rollbackToVersion(targetModel, targetId, version, userId) {
    const targetVersion = await DataVersion.getVersion(targetModel, targetId, version);
    if (!targetVersion) {
      throw new Error('指定版本不存在');
    }

    const Model = mongoose.model(this.modelMap[targetModel]);
    if (!Model) {
      throw new Error(`未找到模型: ${targetModel}`);
    }

    // 恢复数据
    const doc = await Model.findOneAndUpdate(
      { _id: targetId },
      {
        ...targetVersion.dataSnapshot,
        updatedBy: userId,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!doc) {
      throw new Error('目标记录不存在');
    }

    // 创建新版本记录
    await DataVersion.create({
      targetModel,
      targetId,
      villageId: targetVersion.villageId,
      version: targetVersion.version + 1,
      parentVersionId: targetVersion._id,
      changeType: 'update',
      operator: { userId },
      dataSnapshot: doc.toJSON(),
      previousData: targetVersion.dataSnapshot,
      summary: {
        message: `回滚到版本 ${version}`,
        tags: ['rollback']
      },
      context: {
        source: 'api'
      }
    });

    return {
      success: true,
      targetId,
      rolledBackTo: version,
      currentVersion: targetVersion.version + 1
    };
  }

  /**
   * 格式化同步日志
   */
  formatSyncLog(log) {
    return {
      syncSessionId: log.syncSessionId,
      syncType: log.syncType,
      status: log.status,
      statistics: log.statistics,
      timing: log.timing,
      progress: log.progress,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt
    };
  }

  /**
   * 清理旧数据
   */
  async cleanup(options = {}) {
    const {
      pendingDays = 30,
      syncedDays = 30,
      logDays = 90,
      keepVersions = 10
    } = options;

    const results = {
      pendingOperations: 0,
      syncedOperations: 0,
      syncLogs: 0,
      oldVersions: 0
    };

    try {
      // 清理过期的待同步操作
      const pendingResult = await PendingOperation.cleanupExpiredPending();
      results.pendingOperations = pendingResult.modifiedCount || 0;

      // 清理已同步的旧操作
      const syncedResult = await PendingOperation.cleanupOldSynced(syncedDays);
      results.syncedOperations = syncedResult.deletedCount || 0;

      // 清理旧的同步日志
      const logResult = await SyncLog.cleanupOldLogs(logDays);
      results.syncLogs = logResult.deletedCount || 0;

      logger.info(`数据清理完成: ${JSON.stringify(results)}`);
    } catch (error) {
      logger.error('数据清理失败:', error);
    }

    return results;
  }

  /**
   * 重试失败的操作
   */
  async retryFailedOperations(userId, deviceId) {
    const operations = await PendingOperation.getRetryableOperations();
    const userOperations = operations.filter(
      op => op.userId.toString() === userId && op.deviceId === deviceId
    );

    if (userOperations.length === 0) {
      return { retried: 0, message: '没有可重试的操作' };
    }

    // 重置为待同步状态
    await PendingOperation.resetFailedOperations(userId);

    return {
      retried: userOperations.length,
      message: `已重置 ${userOperations.length} 个失败操作为待同步状态`
    };
  }
}

// 创建单例实例
const syncService = new SyncService();

module.exports = syncService;
