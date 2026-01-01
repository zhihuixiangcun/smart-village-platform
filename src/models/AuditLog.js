/**
 * 审计日志模型
 * 记录所有系统操作的审计信息
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const AuditLogSchema = new mongoose.Schema({
  // 操作基本信息
  action: {
    type: String,
    required: true,
    enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'VIEW', 'ACTIVATE', 'ASSIGN'],
    index: true
  },
  module: {
    type: String,
    required: true,
    enum: ['resident', 'governance', 'finance', 'emergency', 'ecommerce', 'user', 'system'],
    index: true
  },

  // 操作者信息
  operator: {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    username: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    sessionId: { type: String, required: true }
  },

  // 操作目标
  target: {
    id: { type: mongoose.Schema.Types.ObjectId },
    type: { type: String },
    name: { type: String }
  },

  // 操作结果
  result: {
    type: String,
    required: true,
    enum: ['SUCCESS', 'FAILED', 'PARTIAL']
  },

  // 详细信息
  details: {
    description: { type: String },
    reason: { type: String },
    changes: {
      before: { type: mongoose.Schema.Types.Mixed },
      after: { type: mongoose.Schema.Types.Mixed }
    },
    metadata: { type: mongoose.Schema.Types.Mixed }
  },

  // 风险等级
  riskLevel: {
    type: String,
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW',
    index: true
  },

  // IP地址和设备信息
  ipAddress: { type: String },
  userAgent: { type: String },
  deviceInfo: { type: String },

  // 地理位置信息
  location: {
    country: { type: String },
    province: { type: String },
    city: { type: String },
    coordinates: [Number] // [longitude, latitude]
  },

  // 关联信息
  villageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Village', index: true },

  // 时间戳
  timestamp: { type: Date, default: Date.now, index: true },

  // 数据保留策略
  retentionPeriod: {
    type: Number,
    default: 3650 // 10年（天）
  },

  // 是否已归档
  isArchived: { type: Boolean, default: false, index: true },

  // 关联的审计日志（批量操作）
  parentAuditLog: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditLog' },

  // 子审计日志（批量操作）
  childAuditLogs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AuditLog' }]
}, {
  timestamps: true,
  collection: 'audit_logs'
});

// 复合索引
AuditLogSchema.index({ module: 1, action: 1, timestamp: -1 });
AuditLogSchema.index({ 'operator.userId': 1, timestamp: -1 });
AuditLogSchema.index({ villageId: 1, timestamp: -1 });
AuditLogSchema.index({ riskLevel: 1, timestamp: -1 });
AuditLogSchema.index({ 'target.id': 1, 'target.type': 1 });

// TTL索引（数据保留）
AuditLogSchema.index({ timestamp: 1 }, {
  expireAfterSeconds: 3650 * 24 * 60 * 60 // 10年后自动删除
});

// 静态方法：创建审计日志
AuditLogSchema.statics.createLog = async function(logData) {
  try {
    const auditLog = new this({
      ...logData,
      timestamp: new Date()
    });
    return await auditLog.save();
  } catch (error) {
    logger.error('创建审计日志失败:', error);
    // 审计日志创建失败不应影响主业务流程
    return null;
  }
};

// 静态方法：批量创建审计日志
AuditLogSchema.statics.createBulkLogs = async function(logsData, parentLogId = null) {
  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    // 创建父审计日志
    const parentLog = await this.createLog({
      ...logsData[0],
      action: `BULK_${  logsData[0].action}`,
      details: {
        description: `批量操作: ${logsData.length}条记录`,
        metadata: { totalCount: logsData.length }
      }
    });

    // 创建子审计日志
    const childLogs = [];
    for (const logData of logsData) {
      const childLog = new this({
        ...logData,
        parentAuditLog: parentLog._id
      });
      childLogs.push(childLog);
    }

    await this.insertMany(childLogs, { session });

    // 更新父日志的子日志引用
    parentLog.childAuditLogs = childLogs.map(log => log._id);
    await parentLog.save({ session });

    await session.commitTransaction();
    session.endSession();

    return { parentLog, childLogs };
  } catch (error) {
    logger.error('批量创建审计日志失败:', error);
    return null;
  }
};

// 静态方法：生成审计报告
AuditLogSchema.statics.generateReport = async function(filters = {}) {
  const {
    startDate,
    endDate,
    module,
    action,
    operatorId,
    villageId,
    riskLevel,
    groupBy = 'day'
  } = filters;

  // 构建匹配条件
  const matchConditions = {
    timestamp: {
      $gte: new Date(startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      $lte: new Date(endDate || new Date())
    }
  };

  if (module) matchConditions.module = module;
  if (action) matchConditions.action = action;
  if (operatorId) matchConditions['operator.userId'] = mongoose.Types.ObjectId(operatorId);
  if (villageId) matchConditions.villageId = mongoose.Types.ObjectId(villageId);
  if (riskLevel) matchConditions.riskLevel = riskLevel;

  // 构建分组格式
  let groupFormat;
  switch (groupBy) {
  case 'hour':
    groupFormat = { $dateToString: { format: '%Y-%m-%d %H:00:00', date: '$timestamp' } };
    break;
  case 'day':
    groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } };
    break;
  case 'week':
    groupFormat = { $dateToString: { format: '%Y-W%U', date: '$timestamp' } };
    break;
  case 'month':
    groupFormat = { $dateToString: { format: '%Y-%m', date: '$timestamp' } };
    break;
  default:
    groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } };
  }

  // 执行聚合查询
  const report = await this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: {
          date: groupFormat,
          module: '$module',
          action: '$action',
          riskLevel: '$riskLevel',
          result: '$result'
        },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$operator.userId' },
        uniqueTargets: { $addToSet: { id: '$target.id', type: '$target.type' } }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        operations: {
          $push: {
            module: '$_id.module',
            action: '$_id.action',
            riskLevel: '$_id.riskLevel',
            result: '$_id.result',
            count: '$count'
          }
        },
        totalCount: { $sum: '$count' },
        uniqueUserCount: { $sum: { $size: '$uniqueUsers' } },
        uniqueTargetCount: { $sum: { $size: '$uniqueTargets' } }
      }
    },
    { $sort: { '_id': 1 } }
  ]);

  // 生成汇总统计
  const summary = await this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: null,
        totalOperations: { $sum: 1 },
        successCount: {
          $sum: { $cond: [{ $eq: ['$result', 'SUCCESS'] }, 1, 0] }
        },
        failureCount: {
          $sum: { $cond: [{ $eq: ['$result', 'FAILED'] }, 1, 0] }
        },
        criticalCount: {
          $sum: { $cond: [{ $eq: ['$riskLevel', 'CRITICAL'] }, 1, 0] }
        },
        highCount: {
          $sum: { $cond: [{ $eq: ['$riskLevel', 'HIGH'] }, 1, 0] }
        },
        mediumCount: {
          $sum: { $cond: [{ $eq: ['$riskLevel', 'MEDIUM'] }, 1, 0] }
        },
        lowCount: {
          $sum: { $cond: [{ $eq: ['$riskLevel', 'LOW'] }, 1, 0] }
        },
        uniqueUserCount: { $addToSet: '$operator.userId' }
      }
    }
  ]);

  return {
    period: { startDate, endDate },
    report,
    summary: summary[0] ? {
      ...summary[0],
      uniqueUserCount: summary[0].uniqueUserCount.length,
      successRate: ((summary[0].successCount / summary[0].totalOperations) * 100).toFixed(2)
    } : {}
  };
};

// 实例方法：标记为高风险操作
AuditLogSchema.methods.markAsHighRisk = function(reason) {
  this.riskLevel = 'HIGH';
  this.details.reason = reason;
  return this.save();
};

// 实例方法：添加附件信息
AuditLogSchema.methods.addAttachment = function(attachmentData) {
  if (!this.details.attachments) {
    this.details.attachments = [];
  }
  this.details.attachments.push(attachmentData);
  return this.save();
};

// 虚拟字段：操作年龄
AuditLogSchema.virtual('operationAge').get(function() {
  return Date.now() - this.timestamp.getTime();
});

// 确保虚拟字段在JSON中包含
AuditLogSchema.set('toJSON', { virtuals: true });
AuditLogSchema.set('toObject', { virtuals: true });

// 防止重复注册模型
module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);