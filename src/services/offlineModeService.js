/**
 * 离线模式服务
 * 提供离线数据队列管理和同步功能
 */

const OfflineQueue = require('../models/OfflineQueue');
const OfflineSyncLog = require('../models/OfflineSyncLog');
const Logger = require('../utils/logger');

class OfflineModeService {
  constructor() {
    this.syncInProgress = new Map(); // userId -> syncSessionId
    this.syncCallbacks = new Map();  // sessionId -> callbacks
    this.config = {
      maxConcurrentSyncs: 10,
      syncBatchSize: 50,
      retryDelay: 5000,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      cleanupInterval: 24 * 60 * 60 * 1000, // 24小时
    };
  }

  /**
   * 添加操作到离线队列
   */
  async addToQueue(queueData) {
    try {
      const {
        userId,
        villageId,
        operationType,
        resourceType,
        method,
        endpoint,
        requestData = {},
        files = [],
        priority = 'normal',
        requiresConfirmation = false,
        clientMeta = {}
      } = queueData;

      // 创建队列项
      const queueItem = new OfflineQueue({
        userId,
        villageId,
        operationType,
        resourceType,
        method,
        endpoint,
        requestData,
        files,
        priority,
        requiresConfirmation,
        clientMeta: {
          ...clientMeta,
          createdAt: new Date()
        },
        validation: {
          isValid: true,
          validatedAt: new Date()
        }
      });

      // 设置紧急操作为高优先级
      if (operationType === 'emergency') {
        queueItem.priority = 'urgent';
      }

      await queueItem.save();

      Logger.info('离线队列项已创建', {
        queueItemId: queueItem._id,
        userId,
        operationType,
        resourceType
      });

      return queueItem;
    } catch (error) {
      Logger.error('添加到离线队列失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的待同步队列
   */
  async getUserQueue(userId, options = {}) {
    try {
      const {
        status = 'pending',
        limit = 50,
        includeFiles = false
      } = options;

      const query = { userId, status };

      if (includeFiles) {
        query.files = { $exists: true, $ne: [] };
      }

      const queueItems = await OfflineQueue.find(query)
        .sort({ priority: -1, createdAt: 1 })
        .limit(limit)
        .populate('villageId', 'name')
        .populate('dependsOn');

      // 获取统计信息
      const stats = await OfflineQueue.getQueueStats(userId);

      return {
        items: queueItems,
        stats: stats[0] || {
          pending: 0,
          processing: 0,
          synced: 0,
          failed: 0,
          total: 0,
          urgentCount: 0
        }
      };
    } catch (error) {
      Logger.error('获取用户离线队列失败:', error);
      throw error;
    }
  }

  /**
   * 获取队列统计信息
   */
  async getQueueStats(filters = {}) {
    try {
      const { userId, villageId } = filters;
      const stats = await OfflineQueue.getQueueStats(userId, villageId);
      return stats[0] || null;
    } catch (error) {
      Logger.error('获取队列统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取队列项详情
   */
  async getQueueItem(queueItemId, userId) {
    try {
      const query = { _id: queueItemId };
      if (userId) {
        query.userId = userId;
      }

      const item = await OfflineQueue.findOne(query)
        .populate('userId', 'username name phone')
        .populate('villageId', 'name')
        .populate('dependsOn');

      if (!item) {
        throw new Error('队列项不存在');
      }

      return item;
    } catch (error) {
      Logger.error('获取队列项详情失败:', error);
      throw error;
    }
  }

  /**
   * 取消队列项
   */
  async cancelQueueItem(queueItemId, userId) {
    try {
      const item = await OfflineQueue.findOne({
        _id: queueItemId,
        userId
      });

      if (!item) {
        throw new Error('队列项不存在或无权限');
      }

      if (item.status === 'synced') {
        throw new Error('已同步的项目不能取消');
      }

      await item.cancel();

      Logger.info('队列项已取消', {
        queueItemId,
        userId
      });

      return item;
    } catch (error) {
      Logger.error('取消队列项失败:', error);
      throw error;
    }
  }

  /**
   * 批量取消队列项
   */
  async cancelQueueItems(queueItemIds, userId) {
    try {
      const items = await OfflineQueue.updateMany(
        {
          _id: { $in: queueItemIds },
          userId,
          status: { $in: ['pending', 'failed'] }
        },
        {
          status: 'cancelled'
        }
      );

      Logger.info('批量取消队列项', {
        count: items.modifiedCount,
        userId
      });

      return { cancelledCount: items.modifiedCount };
    } catch (error) {
      Logger.error('批量取消队列项失败:', error);
      throw error;
    }
  }

  /**
   * 重试失败的队列项
   */
  async retryQueueItem(queueItemId, userId) {
    try {
      const item = await OfflineQueue.findOne({
        _id: queueItemId,
        userId
      });

      if (!item) {
        throw new Error('队列项不存在或无权限');
      }

      if (item.status !== 'failed') {
        throw new Error('只能重试失败的项目');
      }

      if (item.retryCount >= item.maxRetries) {
        throw new Error('已达到最大重试次数');
      }

      // 重置状态
      item.status = 'pending';
      item.error = undefined;
      await item.save();

      Logger.info('队列项已重置为待处理', {
        queueItemId,
        userId,
        retryCount: item.retryCount
      });

      return item;
    } catch (error) {
      Logger.error('重试队列项失败:', error);
      throw error;
    }
  }

  /**
   * 批量重试失败的队列项
   */
  async retryFailedItems(userId) {
    try {
      const items = await OfflineQueue.find({
        userId,
        status: 'failed',
        retryCount: { $lt: 5 } // 小于最大重试次数
      });

      const results = [];
      for (const item of items) {
        item.status = 'pending';
        item.error = undefined;
        await item.save();
        results.push(item._id);
      }

      Logger.info('批量重试失败项', {
        count: results.length,
        userId
      });

      return { retriedCount: results.length, items: results };
    } catch (error) {
      Logger.error('批量重试失败项出错:', error);
      throw error;
    }
  }

  /**
   * 开始同步会话
   */
  async startSyncSession(userId, syncOptions = {}) {
    try {
      // 检查是否有正在进行的同步
      if (this.syncInProgress.has(userId)) {
        const existingSessionId = this.syncInProgress.get(userId);
        throw new Error(`已有正在进行的同步会话: ${existingSessionId}`);
      }

      const {
        villageId,
        syncType = 'manual',
        triggerReason = 'user_request',
        networkInfo = {},
        clientInfo = {},
        syncScope = {}
      } = syncOptions;

      // 创建同步日志
      const sessionId = OfflineSyncLog.generateSessionId();
      const syncLog = new OfflineSyncLog({
        sessionId,
        userId,
        villageId,
        syncType,
        triggerReason,
        status: 'started',
        networkInfo,
        clientInfo,
        syncScope,
        timeStats: {
          startedAt: new Date()
        }
      });

      await syncLog.save();

      // 标记同步进行中
      this.syncInProgress.set(userId, sessionId);

      Logger.info('同步会话已启动', {
        sessionId,
        userId,
        syncType
      });

      return syncLog;
    } catch (error) {
      Logger.error('启动同步会话失败:', error);
      throw error;
    }
  }

  /**
   * 处理单个队列项同步
   */
  async processQueueItem(queueItem, syncLog, apiExecutor) {
    try {
      // 标记为处理中
      await queueItem.markAsProcessing();

      // 添加到同步日志
      await syncLog.addQueueItem({
        queueItemId: queueItem._id,
        status: 'pending',
        attemptNumber: queueItem.retryCount + 1,
        startTime: new Date()
      });

      // 执行API请求
      const result = await apiExecutor({
        method: queueItem.method,
        endpoint: queueItem.endpoint,
        data: queueItem.requestData,
        files: queueItem.files,
        headers: {
          'X-Offline-Queue-Id': queueItem._id.toString(),
          'X-Sync-Session-Id': syncLog.sessionId
        }
      });

      // 更新队列项为已同步
      await queueItem.markAsSynced({
        success: true,
        serverResponse: result.data,
        syncedResourceId: result.data?._id || result.data?.id,
        syncedAt: new Date()
      });

      // 更新同步日志
      const logItem = syncLog.queueItems.find(
        item => item.queueItemId.toString() === queueItem._id.toString()
      );
      if (logItem) {
        logItem.status = 'synced';
        logItem.endTime = new Date();
        logItem.duration = logItem.endTime - logItem.startTime;
        logItem.serverResponse = result.data;
      }

      // 更新统计
      syncLog.stats.successfulItems += 1;
      await syncLog.save();

      Logger.info('队列项同步成功', {
        queueItemId: queueItem._id,
        sessionId: syncLog.sessionId
      });

      return { success: true, queueItem, result };
    } catch (error) {
      // 标记为失败
      await queueItem.markAsFailed(error);

      // 更新同步日志
      const logItem = syncLog.queueItems.find(
        item => item.queueItemId.toString() === queueItem._id.toString()
      );
      if (logItem) {
        logItem.status = 'failed';
        logItem.endTime = new Date();
        logItem.duration = logItem.endTime - logItem.startTime;
        logItem.error = {
          code: error.code,
          message: error.message,
          retryable: queueItem.retryCount < queueItem.maxRetries
        };
      }

      // 更新统计
      syncLog.stats.failedItems += 1;
      await syncLog.save();

      Logger.error('队列项同步失败', {
        queueItemId: queueItem._id,
        sessionId: syncLog.sessionId,
        error: error.message
      });

      return { success: false, queueItem, error };
    }
  }

  /**
   * 执行同步
   */
  async executeSync(userId, apiExecutor, syncOptions = {}) {
    try {
      const {
        limit = 50,
        priority = null,
        resourceTypes = null,
        onProgress = null
      } = syncOptions;

      // 获取待同步项
      const query = { userId, status: 'pending' };
      if (priority) query.priority = priority;
      if (resourceTypes) query.resourceType = { $in: resourceTypes };

      const queueItems = await OfflineQueue.find(query)
        .sort({ priority: -1, createdAt: 1 })
        .limit(limit)
        .populate('dependsOn');

      if (queueItems.length === 0) {
        return {
          success: true,
          message: '没有待同步的数据',
          processed: 0
        };
      }

      // 创建同步会话
      const syncLog = await this.startSyncSession(userId, syncOptions);
      syncLog.stats.totalItems = queueItems.length;
      await syncLog.save();

      let processed = 0;
      let succeeded = 0;
      let failed = 0;

      // 处理每个队列项
      for (const queueItem of queueItems) {
        const result = await this.processQueueItem(queueItem, syncLog, apiExecutor);

        processed++;
        if (result.success) {
          succeeded++;
        } else {
          failed++;
        }

        // 更新进度
        syncLog.stats.processedRecords = processed;
        await syncLog.updateProgress(processed, queueItems.length);

        // 触发进度回调
        if (onProgress) {
          onProgress({
            processed,
            total: queueItems.length,
            succeeded,
            failed,
            percentage: Math.round((processed / queueItems.length) * 100)
          });
        }
      }

      // 完成同步
      const finalStatus = failed === 0 ? 'completed' :
        succeeded === 0 ? 'failed' : 'partial';

      syncLog.status = finalStatus;
      syncLog.timeStats.completedAt = new Date();
      syncLog.timeStats.duration = syncLog.timeStats.completedAt - syncLog.timeStats.startedAt;
      await syncLog.save();

      // 清除同步标记
      this.syncInProgress.delete(userId);

      Logger.info('同步会话完成', {
        sessionId: syncLog.sessionId,
        userId,
        total: queueItems.length,
        succeeded,
        failed,
        status: finalStatus
      });

      return {
        success: true,
        sessionId: syncLog.sessionId,
        processed,
        succeeded,
        failed,
        status: finalStatus,
        syncLog
      };
    } catch (error) {
      // 清除同步标记
      this.syncInProgress.delete(userId);
      Logger.error('执行同步失败:', error);
      throw error;
    }
  }

  /**
   * 获取同步历史
   */
  async getSyncHistory(userId, options = {}) {
    try {
      const { limit = 20, status = null } = options;

      const query = { userId };
      if (status) query.status = status;

      const history = await OfflineSyncLog.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('villageId', 'name');

      return history;
    } catch (error) {
      Logger.error('获取同步历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取同步会话详情
   */
  async getSyncSession(sessionId, userId) {
    try {
      const query = { sessionId };
      if (userId) {
        query.userId = userId;
      }

      const session = await OfflineSyncLog.findOne(query)
        .populate('userId', 'username name phone')
        .populate('villageId', 'name')
        .populate('queueItems.queueItemId');

      if (!session) {
        throw new Error('同步会话不存在');
      }

      return session;
    } catch (error) {
      Logger.error('获取同步会话失败:', error);
      throw error;
    }
  }

  /**
   * 获取同步统计
   */
  async getSyncStats(userId, days = 30) {
    try {
      const stats = await OfflineSyncLog.getSyncStatsByUser(userId, days);
      return stats[0] || null;
    } catch (error) {
      Logger.error('获取同步统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取失败的队列项
   */
  async getFailedQueueItems(userId, limit = 20) {
    try {
      const items = await OfflineQueue.find({
        userId,
        status: 'failed'
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('villageId', 'name');

      return items;
    } catch (error) {
      Logger.error('获取失败队列项失败:', error);
      throw error;
    }
  }

  /**
   * 清理已同步的旧记录
   */
  async cleanupSyncedItems(daysOld = 7) {
    try {
      const result = await OfflineQueue.cleanupOldSynced(daysOld);
      Logger.info('清理已同步记录', { deletedCount: result.deletedCount });
      return { deletedCount: result.deletedCount };
    } catch (error) {
      Logger.error('清理已同步记录失败:', error);
      throw error;
    }
  }

  /**
   * 清理旧的同步日志
   */
  async cleanupOldLogs(daysOld = 90) {
    try {
      const result = await OfflineSyncLog.cleanupOldLogs(daysOld);
      Logger.info('清理旧同步日志', { deletedCount: result.deletedCount });
      return { deletedCount: result.deletedCount };
    } catch (error) {
      Logger.error('清理旧同步日志失败:', error);
      throw error;
    }
  }

  /**
   * 获取离线模式配置
   */
  getConfig() {
    return {
      maxConcurrentSyncs: this.config.maxConcurrentSyncs,
      syncBatchSize: this.config.syncBatchSize,
      retryDelay: this.config.retryDelay,
      maxFileSize: this.config.maxFileSize,
      supportedOperations: [
        'create', 'update', 'delete',
        'upload', 'submit', 'approve',
        'comment', 'feedback', 'report',
        'emergency', 'announcement', 'payment'
      ],
      supportedResourceTypes: [
        'resident', 'family', 'document', 'announcement',
        'emergency', 'finance', 'reimbursement', 'subsidy',
        'village', 'event', 'post', 'comment', 'product',
        'payment', 'application', 'report'
      ]
    };
  }

  /**
   * 获取当前同步状态
   */
  getSyncStatus(userId) {
    return {
      isInProgress: this.syncInProgress.has(userId),
      sessionId: this.syncInProgress.get(userId) || null
    };
  }
}

module.exports = new OfflineModeService();
