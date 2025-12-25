/**
 * 村委操作审计日志模型
 * 记录所有敏感操作以备审计（保存10年）
 */

const mongoose = require('mongoose');

const committeeAuditLogSchema = new mongoose.Schema({
  // 操作者信息
  operatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  operatorName: {
    type: String,
    required: true
  },
  operatorRole: String,
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 操作信息
  action: {
    type: String,
    required: true,
    enum: [
      'create', 'update', 'delete', 'archive',
      'login', 'logout', 'export', 'import',
      'approve', 'reject', 'assign', 'revoke',
      'view_sensitive', 'download', 'share',
      'change_position', 'add_role', 'remove_role'
    ],
    index: true
  },
  resourceType: {
    type: String,
    required: true,
    enum: [
      'member', 'resident', 'finance', 'schedule',
      'announcement', 'document', 'permission', 'user'
    ],
    index: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  resourceName: String,

  // 操作详情
  details: {
    // 变更内容
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
      diff: [String]
    },
    // 查询条件
    query: mongoose.Schema.Types.Mixed,
    // 操作结果
    result: {
      type: String,
      enum: ['success', 'failure', 'partial']
    },
    errorMessage: String
  },

  // 请求上下文
  requestContext: {
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: String,
    referer: String,
    requestId: String,
    sessionId: String
  },

  // 设备信息
  deviceInfo: {
    fingerprint: String,
    type: String,      // mobile/desktop/tablet
    os: String,
    browser: String
  },

  // 地理位置
  location: {
    country: String,
    province: String,
    city: String,
    latitude: Number,
    longitude: Number
  },

  // 敏感操作验证
  sensitiveAction: {
    isSensitive: {
      type: Boolean,
      default: false,
      index: true
    },
    verificationMethod: {
      type: String,
      enum: ['password', 'sms', 'face', 'otp', 'none']
    },
    verifiedAt: Date,
    verificationId: String,
    approvalRequired: Boolean,
    approverId: mongoose.Schema.Types.ObjectId,
    approvedAt: Date
  },

  // 数据影响范围
  impact: {
    recordsAffected: Number,
    usersAffected: [mongoose.Schema.Types.ObjectId],
    villagesAffected: [mongoose.Schema.Types.ObjectId]
  },

  // 关联信息
  relatedLogs: [mongoose.Schema.Types.ObjectId],
  parentActionId: mongoose.Schema.Types.ObjectId,

  // 时间戳（TTL索引 - 10年自动删除）
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
    expires: 315360000  // 10年 = 10 * 365 * 24 * 60 * 60
  }

}, {
  timestamps: true,
  capped: { size: 10240000, max: 50000 }  // 10MB限制，最多5万条
});

// 复合索引
committeeAuditLogSchema.index({ operatorId: 1, timestamp: -1 });
committeeAuditLogSchema.index({ villageId: 1, timestamp: -1 });
committeeAuditLogSchema.index({ action: 1, resourceType: 1, timestamp: -1 });
committeeAuditLogSchema.index({ 'sensitiveAction.isSensitive': 1, timestamp: -1 });
committeeAuditLogSchema.index({ 'requestContext.ipAddress': 1, timestamp: -1 });

// 静态方法：记录操作日志
committeeAuditLogSchema.statics.logAction = async function(logData) {
  try {
    const log = await this.create({
      ...logData,
      timestamp: new Date()
    });

    // 如果是敏感操作，发送告警
    if (logData.sensitiveAction && logData.sensitiveAction.isSensitive) {
      await this.sendSensitiveActionAlert(log);
    }

    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // 审计日志记录失败不应影响业务流程
    return null;
  }
};

// 静态方法：查询用户操作历史
committeeAuditLogSchema.statics.getUserActions = function(userId, options = {}) {
  const {
    startDate,
    endDate,
    action,
    resourceType,
    limit = 50,
    skip = 0
  } = options;

  const query = { operatorId: userId };

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }

  if (action) query.action = action;
  if (resourceType) query.resourceType = resourceType;

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

// 静态方法：查询敏感操作日志
committeeAuditLogSchema.statics.getSensitiveActions = function(villageId, options = {}) {
  const {
    startDate,
    endDate,
    limit = 100
  } = options;

  const query = {
    villageId,
    'sensitiveAction.isSensitive': true
  };

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('operatorId', 'username email')
    .populate('approverId', 'username email')
    .lean();
};

// 静态方法：统计分析
committeeAuditLogSchema.statics.getActionStatistics = async function(villageId, startDate, endDate) {
  const stats = await this.aggregate([
    {
      $match: {
        villageId: mongoose.Types.ObjectId(villageId),
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: {
          action: '$action',
          resourceType: '$resourceType'
        },
        count: { $sum: 1 },
        operators: { $addToSet: '$operatorId' },
        uniqueOperators: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.action',
        resources: {
          $push: {
            type: '$_id.resourceType',
            count: '$count',
            uniqueOperators: '$uniqueOperators'
          }
        },
        totalOperations: { $sum: '$count' }
      }
    },
    {
      $sort: { totalOperations: -1 }
    }
  ]);

  return stats;
};

// 静态方法：检测异常行为
committeeAuditLogSchema.statics.detectAnomalies = async function(villageId, timeWindow = 60) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - timeWindow * 60 * 1000);

  // 检测高频操作
  const highFrequencyLogs = await this.aggregate([
    {
      $match: {
        villageId: mongoose.Types.ObjectId(villageId),
        timestamp: { $gte: windowStart }
      }
    },
    {
      $group: {
        _id: '$operatorId',
        actionCount: { $sum: 1 },
        actions: { $push: '$$ROOT' }
      }
    },
    {
      $match: { actionCount: { $gt: 50 } }  // 超过50次操作
    }
  ]);

  // 检测异常IP
  const unusualIPs = await this.aggregate([
    {
      $match: {
        villageId: mongoose.Types.ObjectId(villageId),
        timestamp: { $gte: windowStart }
      }
    },
    {
      $group: {
        _id: '$requestContext.ipAddress',
        operators: { $addToSet: '$operatorId' },
        actionCount: { $sum: 1 }
      }
    },
    {
      $match: { actionCount: { $gt: 100 } }  // 单IP超过100次操作
    }
  ]);

  // 检测敏感操作激增
  const sensitiveSurge = await this.aggregate([
    {
      $match: {
        villageId: mongoose.Types.ObjectId(villageId),
        'sensitiveAction.isSensitive': true,
        timestamp: { $gte: windowStart }
      }
    },
    {
      $group: {
        _id: '$operatorId',
        sensitiveCount: { $sum: 1 }
      }
    },
    {
      $match: { sensitiveCount: { $gt: 5 } }  // 超过5次敏感操作
    }
  ]);

  return {
    highFrequencyOperators: highFrequencyLogs,
    unusualIPs,
    sensitiveActionSurge: sensitiveSurge,
    timestamp: now
  };
};

// 实例方法：发送敏感操作告警
committeeAuditLogSchema.statics.sendSensitiveActionAlert = async function(log) {
  // 这里可以集成邮件、短信、WebSocket推送等告警方式
  // 示例：通过Socket.IO推送给管理员
  try {
    const io = require('../../integrator/realtimeIntegrator').getIO();
    if (io) {
      io.to(`village_${log.villageId}_admin`).emit('sensitive_action_alert', {
        action: log.action,
        resourceType: log.resourceType,
        operator: log.operatorName,
        timestamp: log.timestamp
      });
    }
  } catch (error) {
    console.error('Failed to send alert:', error);
  }
};

module.exports = mongoose.model('CommitteeAuditLog', committeeAuditLogSchema);
