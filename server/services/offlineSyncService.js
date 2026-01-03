/**
 * 离线同步服务 - Offline Sync Service
 *
 * 功能：
 * 1. 数据版本管理
 * 2. 同步冲突处理
 * 3. 批量数据推送
 * 4. 同步状态追踪
 * 5. 离线数据队列管理
 */

const mongoose = require('mongoose');

/**
 * 同步状态枚举
 */
const SYNC_STATUS = {
  PENDING: 'pending', // 待同步
  SYNCING: 'syncing', // 同步中
  SUCCESS: 'success', // 同步成功
  FAILED: 'failed', // 同步失败
  CONFLICT: 'conflict' // 冲突待解决
};

/**
 * 数据操作类型
 */
const OPERATION_TYPES = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  BATCH_CREATE: 'batch_create',
  BATCH_UPDATE: 'batch_update'
};

/**
 * 同步优先级
 */
const SYNC_PRIORITY = {
  HIGH: 1, // 高优先级（如紧急求助）
  NORMAL: 2, // 普通优先级
  LOW: 3 // 低优先级（如统计数据）
};

/**
 * 同步日志Schema
 */
const SyncLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deviceId: { type: String, required: true },
  entityType: { type: String, required: true }, // 实体类型：resident, announcement等
  entityId: { type: mongoose.Schema.Types.ObjectId }, // 实体ID
  operation: { type: String, enum: Object.values(OPERATION_TYPES), required: true },
  data: { type: mongoose.Schema.Types.Mixed }, // 操作数据
  clientVersion: { type: Number }, // 客户端版本号
  serverVersion: { type: Number }, // 服务器版本号
  status: {
    type: String,
    enum: Object.values(SYNC_STATUS),
    default: SYNC_STATUS.PENDING
  },
  priority: { type: Number, default: SYNC_PRIORITY.NORMAL },
  errorMessage: { type: String },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  syncedAt: { type: Date },
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// 索引
SyncLogSchema.index({ userId: 1, status: 1, createdAt: 1 });
SyncLogSchema.index({ deviceId: 1, status: 1 });
SyncLogSchema.index({ entityType: 1, entityId: 1 });
SyncLogSchema.index({ priority: 1, createdAt: 1 });

const SyncLog = mongoose.model('SyncLog', SyncLogSchema);

/**
 * 数据版本Schema
 */
const DataVersionSchema = new mongoose.Schema({
  entityType: { type: String, required: true, unique: true },
  version: { type: Number, required: true, default: 1 },
  lastModified: { type: Date, default: Date.now },
  modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  checksum: { type: String } // 数据校验和
}, {
  timestamps: true
});

const DataVersion = mongoose.model('DataVersion', DataVersionSchema);

class OfflineSyncService {
  constructor() {
    // 批量同步配置
    this.batchSize = 100; // 每批处理数量
    this.maxConcurrentBatches = 3; // 最大并发批次数
  }

  /**
   * 添加待同步记录
   * @param {Object} params - 同步参数
   * @returns {Promise<SyncLog>}
   */
  async addSyncRecord(params) {
    const {
      userId,
      deviceId,
      entityType,
      entityId,
      operation,
      data,
      clientVersion,
      priority = SYNC_PRIORITY.NORMAL
    } = params;

    try {
      const syncLog = await SyncLog.create({
        userId,
        deviceId,
        entityType,
        entityId,
        operation,
        data,
        clientVersion,
        priority
      });

      return syncLog;
    } catch (error) {
      console.error('添加同步记录失败:', error);
      throw error;
    }
  }

  /**
   * 批量添加待同步记录
   * @param {Array} records - 同步记录数组
   * @returns {Promise<Array>}
   */
  async addSyncRecords(records) {
    try {
      const syncLogs = await SyncLog.insertMany(records);
      return syncLogs;
    } catch (error) {
      console.error('批量添加同步记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取待同步数据
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>}
   */
  async getPendingSyncs(options = {}) {
    const {
      userId,
      deviceId,
      entityType,
      limit = this.batchSize,
      priority
    } = options;

    const query = { status: SYNC_STATUS.PENDING };

    if (userId) query.userId = userId;
    if (deviceId) query.deviceId = deviceId;
    if (entityType) query.entityType = entityType;
    if (priority) query.priority = priority;

    try {
      const syncLogs = await SyncLog.find(query)
        .sort({ priority: 1, createdAt: 1 })
        .limit(limit)
        .lean();

      return syncLogs;
    } catch (error) {
      console.error('获取待同步数据失败:', error);
      throw error;
    }
  }

  /**
   * 执行同步
   * @param {string} syncLogId - 同步日志ID
   * @param {Function} syncHandler - 同步处理函数
   * @returns {Promise<Object>}
   */
  async performSync(syncLogId, syncHandler) {
    try {
      const syncLog = await SyncLog.findById(syncLogId);
      if (!syncLog) {
        throw new Error('同步记录不存在');
      }

      // 检查重试次数
      if (syncLog.retryCount >= syncLog.maxRetries) {
        await SyncLog.findByIdAndUpdate(syncLogId, {
          status: SYNC_STATUS.FAILED,
          errorMessage: '超过最大重试次数'
        });
        throw new Error('超过最大重试次数');
      }

      // 更新状态为同步中
      await SyncLog.findByIdAndUpdate(syncLogId, {
        status: SYNC_STATUS.SYNCING,
        syncedAt: new Date()
      });

      // 调用同步处理函数
      const result = await syncHandler(syncLog);

      // 检查是否有冲突
      if (result.conflict) {
        await SyncLog.findByIdAndUpdate(syncLogId, {
          status: SYNC_STATUS.CONFLICT,
          errorMessage: result.errorMessage || '数据冲突'
        });
        return {
          success: false,
          conflict: true,
          message: result.errorMessage
        };
      }

      // 同步成功
      await SyncLog.findByIdAndUpdate(syncLogId, {
        status: SYNC_STATUS.SUCCESS,
        completedAt: new Date()
      });

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('同步失败:', error);

      // 增加重试次数
      await SyncLog.findByIdAndUpdate(syncLogId, {
        status: SYNC_STATUS.FAILED,
        errorMessage: error.message,
        $inc: { retryCount: 1 }
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 批量同步
   * @param {Object} options - 同步选项
   * @returns {Promise<Object>}
   */
  async batchSync(options = {}) {
    const { userId, deviceId } = options;

    try {
      // 获取待同步记录
      const pendingSyncs = await this.getPendingSyncs({ userId, deviceId });

      if (pendingSyncs.length === 0) {
        return {
          success: true,
          synced: 0,
          failed: 0,
          message: '没有待同步数据'
        };
      }

      let synced = 0;
      let failed = 0;
      const results = [];

      // 分批处理
      for (const syncLog of pendingSyncs) {
        try {
          // 根据实体类型获取对应的同步处理器
          const syncHandler = this.getSyncHandler(syncLog.entityType, syncLog.operation);
          if (!syncHandler) {
            throw new Error(`未找到同步处理器: ${syncLog.entityType}.${syncLog.operation}`);
          }

          const result = await this.performSync(syncLog._id, syncHandler);
          results.push(result);

          if (result.success) {
            synced++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error('同步异常:', error);
          failed++;
        }
      }

      return {
        success: true,
        synced,
        failed,
        results
      };
    } catch (error) {
      console.error('批量同步失败:', error);
      throw error;
    }
  }

  /**
   * 获取数据版本
   * @param {string} entityType - 实体类型
   * @returns {Promise<Object>}
   */
  async getDataVersion(entityType) {
    try {
      let version = await DataVersion.findOne({ entityType });
      if (!version) {
        version = await DataVersion.create({ entityType, version: 1 });
      }
      return version;
    } catch (error) {
      console.error('获取数据版本失败:', error);
      throw error;
    }
  }

  /**
   * 更新数据版本
   * @param {string} entityType - 实体类型
   * @param {number} increment - 版本增量
   * @param {string} checksum - 数据校验和
   * @returns {Promise<Object>}
   */
  async updateDataVersion(entityType, increment = 1, checksum = null) {
    try {
      const version = await DataVersion.findOneAndUpdate(
        { entityType },
        {
          $inc: { version: increment },
          lastModified: new Date(),
          ...(checksum && { checksum })
        },
        { new: true, upsert: true }
      );
      return version;
    } catch (error) {
      console.error('更新数据版本失败:', error);
      throw error;
    }
  }

  /**
   * 批量获取数据版本
   * @param {Array<string>} entityTypes - 实体类型数组
   * @returns {Promise<Object>}
   */
  async getBatchDataVersions(entityTypes) {
    try {
      const versions = await DataVersion.find({ entityType: { $in: entityTypes } });
      const versionMap = {};
      versions.forEach(v => {
        versionMap[v.entityType] = v.version;
      });
      return versionMap;
    } catch (error) {
      console.error('批量获取数据版本失败:', error);
      throw error;
    }
  }

  /**
   * 解决同步冲突
   * @param {string} syncLogId - 同步日志ID
   * @param {Object} resolution - 冲突解决方案
   * @returns {Promise<Object>}
   */
  async resolveConflict(syncLogId, resolution) {
    const { strategy = 'server_wins', mergedData } = resolution;

    try {
      const syncLog = await SyncLog.findById(syncLogId);
      if (!syncLog) {
        throw new Error('同步记录不存在');
      }

      // 根据策略解决冲突
      let finalData;
      switch (strategy) {
        case 'server_wins':
          // 服务器优先：丢弃客户端数据
          await SyncLog.findByIdAndUpdate(syncLogId, {
            status: SYNC_STATUS.SUCCESS,
            completedAt: new Date()
          });
          return { success: true, message: '已丢弃客户端数据' };

        case 'client_wins':
          // 客户端优先：强制更新服务器数据
          finalData = syncLog.data;
          await SyncLog.findByIdAndUpdate(syncLogId, {
            status: SYNC_STATUS.SUCCESS,
            completedAt: new Date()
          });
          return { success: true, data: finalData };

        case 'merge':
          // 合并：使用合并后的数据
          if (!mergedData) {
            throw new Error('合并策略需要提供mergedData');
          }
          await SyncLog.findByIdAndUpdate(syncLogId, {
            status: SYNC_STATUS.SUCCESS,
            data: mergedData,
            completedAt: new Date()
          });
          return { success: true, data: mergedData };

        default:
          throw new Error('未知的冲突解决策略');
      }
    } catch (error) {
      console.error('解决冲突失败:', error);
      throw error;
    }
  }

  /**
   * 获取同步统计信息
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Object>}
   */
  async getSyncStats(filters = {}) {
    const { userId, deviceId, startDate, endDate } = filters;

    const matchQuery = {};
    if (userId) matchQuery.userId = userId;
    if (deviceId) matchQuery.deviceId = deviceId;
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    try {
      const stats = await SyncLog.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const result = {
        total: 0,
        pending: 0,
        syncing: 0,
        success: 0,
        failed: 0,
        conflict: 0
      };

      stats.forEach(stat => {
        result[stat._id] = stat.count;
        result.total += stat.count;
      });

      return result;
    } catch (error) {
      console.error('获取同步统计失败:', error);
      throw error;
    }
  }

  /**
   * 清理已完成的同步记录
   * @param {number} daysToKeep - 保留天数
   * @returns {Promise<number>}
   */
  async cleanupOldSyncLogs(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await SyncLog.deleteMany({
        status: SYNC_STATUS.SUCCESS,
        completedAt: { $lt: cutoffDate }
      });

      return result.deletedCount;
    } catch (error) {
      console.error('清理同步记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取同步处理器（根据实体类型和操作类型）
   * @param {string} entityType - 实体类型
   * @param {string} operation - 操作类型
   * @returns {Function|null}
   */
  getSyncHandler(entityType, operation) {
    // 这里应该根据实际的模型和业务逻辑返回对应的处理函数
    // 这是一个示例框架，实际实现需要根据项目具体情况

    const handlers = {
      resident: {
        create: async (syncLog) => {
          // 实际创建村民记录的逻辑
          return { success: true, data: syncLog.data };
        },
        update: async (syncLog) => {
          // 实际更新村民记录的逻辑
          return { success: true, data: syncLog.data };
        },
        delete: async (syncLog) => {
          // 实际删除村民记录的逻辑
          return { success: true };
        }
      },
      announcement: {
        create: async (syncLog) => {
          return { success: true, data: syncLog.data };
        },
        update: async (syncLog) => {
          return { success: true, data: syncLog.data };
        }
      }
      // 可以添加更多实体类型的处理器
    };

    return handlers[entityType]?.[operation] || null;
  }
}

// 导出单例实例
const offlineSyncService = new OfflineSyncService();

module.exports = {
  offlineSyncService,
  OfflineSyncService,
  SyncLog,
  DataVersion,
  SYNC_STATUS,
  OPERATION_TYPES,
  SYNC_PRIORITY
};
