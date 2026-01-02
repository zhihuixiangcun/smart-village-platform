/**
 * 安全审计数据模型
 * 用于记录系统中所有安全相关的操作日志
 */

const mongoose = require('mongoose');

const securityAuditSchema = new mongoose.Schema({
  // 操作类型
  operationType: {
    type: String,
    required: true,
    enum: {
      values: [
        // 数据访问
        'view_sensitive_data',
        'export_sensitive_data',
        'query_sensitive_data',

        // 数据修改
        'create_data',
        'update_data',
        'delete_data',
        'bulk_delete',

        // 身份验证
        'login',
        'logout',
        'login_failed',
        'face_auth',

        // 权限管理
        'grant_permission',
        'revoke_permission',
        'role_change',

        // 系统操作
        'system_config_change',
        'security_rule_update',
        'encryption_key_change',

        // 安全事件
        'fraud_detected',
        'suspicious_activity',
        'data_breach_attempt',
        'unauthorized_access',

        // 加密操作
        'data_encrypted',
        'data_decrypted',
        'key_rotation',

        // 区块链操作
        'blockchain_record',
        'blockchain_verify',

        // 其他
        'other'
      ],
      message: '无效的操作类型'
    },
    index: true
  },

  // 操作类型名称（中文）
  operationName: {
    type: String,
    required: true
  },

  // 操作人
  operator: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    userName: String,
    userRole: String,
    userPhone: String
  },

  // 操作IP地址
  ipAddress: {
    type: String,
    required: true,
    index: true
  },

  // 操作设备信息
  deviceInfo: {
    userAgent: String,
    platform: String,
    browser: String,
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown']
    }
  },

  // 地理位置
  location: {
    country: String,
    province: String,
    city: String,
    coordinates: {
      type: [Number],
      index: '2dsphere'
    }
  },

  // 操作目标
  target: {
    targetType: {
      type: String,
      enum: ['user', 'resident', 'family', 'village', 'system', 'other']
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId
    },
    targetName: String
  },

  // 操作内容
  operationDetails: {
    // 请求的URL
    url: String,
    // HTTP方法
    method: String,
    // 请求参数
    params: mongoose.Schema.Types.Mixed,
    // 查询条件
    query: mongoose.Schema.Types.Mixed,
    // 修改的数据
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed
    }
  },

  // 敏感级别
  sensitivityLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low',
    index: true
  },

  // 敏感级别名称
  sensitivityName: {
    type: String
  },

  // 涉及的敏感字段
  sensitiveFields: [String],

  // 操作结果
  result: {
    type: String,
    enum: ['success', 'failed', 'partial'],
    default: 'success'
  },

  // 结果描述
  resultMessage: String,

  // 错误信息
  errorMessage: String,

  // 错误代码
  errorCode: String,

  // 是否为异常操作
  isAnomaly: {
    type: Boolean,
    default: false,
    index: true
  },

  // 异常分数（0-100）
  anomalyScore: {
    type: Number,
    min: 0,
    max: 100
  },

  // 异常原因
  anomalyReasons: [String],

  // 是否需要告警
  requireAlert: {
    type: Boolean,
    default: false,
    index: true
  },

  // 告警状态
  alertStatus: {
    type: String,
    enum: ['pending', 'sent', 'acknowledged', 'resolved'],
    default: 'pending'
  },

  // 关联的会话ID
  sessionId: String,

  // 关联的请求ID
  requestId: String,

  // 操作时长（毫秒）
  duration: Number,

  // 数据库查询次数
  queryCount: Number,

  // 影响的记录数
  affectedRecords: Number,

  // 附加信息
  metadata: mongoose.Schema.Types.Mixed,

  // 所属村委
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    index: true
  }
}, {
  timestamps: true,
  collection: 'security_audits'
});

// 索引优化
securityAuditSchema.index({ operator: 1, createdAt: -1 });
securityAuditSchema.index({ operationType: 1, createdAt: -1 });
securityAuditSchema.index({ ipAddress: 1, createdAt: -1 });
securityAuditSchema.index({ sensitivityLevel: 1, createdAt: -1 });
securityAuditSchema.index({ isAnomaly: -1, requireAlert: 1, createdAt: -1 });
securityAuditSchema.index({ createdAt: -1 }); // 用于时间序列查询
securityAuditSchema.index({ target: 1, createdAt: -1 });

// 虚拟字段：敏感级别数值
securityAuditSchema.virtual('sensitivityScore').get(function() {
  const scores = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
  };
  return scores[this.sensitivityLevel] || 0;
});

// 静态方法：记录审计日志
securityAuditSchema.statics.log = async function(auditData) {
  try {
    const audit = new this(auditData);
    await audit.save();

    // 如果需要告警，触发告警
    if (audit.requireAlert && audit.alertStatus === 'pending') {
      await this.triggerAlert(audit);
    }

    return audit;
  } catch (error) {
    console.error('Failed to create security audit:', error);
    // 审计日志记录失败不应影响主业务流程
    return null;
  }
};

// 静态方法：触发告警
securityAuditSchema.statics.triggerAlert = async function(audit) {
  // TODO: 实现告警逻辑
  // 1. 发送邮件通知
  // 2. 发送短信通知
  // 3. WebSocket推送
  // 4. 记录到告警系统

  audit.alertStatus = 'sent';
  await audit.save();
};

// 静态方法：检测异常行为
securityAuditSchema.statics.detectAnomaly = async function(operator, operationType) {
  // 检查最近1小时内该用户的操作频率
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentOperations = await this.countDocuments({
    'operator.userId': operator,
    operationType,
    createdAt: { $gte: oneHourAgo }
  });

  // 如果操作频率超过阈值，标记为异常
  const thresholds = {
    view_sensitive_data: 50,
    export_sensitive_data: 10,
    query_sensitive_data: 100
  };

  const threshold = thresholds[operationType] || 100;
  const isAnomaly = recentOperations > threshold;

  return {
    isAnomaly,
    count: recentOperations,
    threshold,
    anomalyScore: Math.min(100, Math.floor((recentOperations / threshold) * 100))
  };
};

// 静态方法：获取用户审计历史
securityAuditSchema.statics.getUserAuditHistory = function(userId, options = {}) {
  const {
    startDate,
    endDate,
    operationTypes,
    limit = 100,
    skip = 0
  } = options;

  const query = { 'operator.userId': userId };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  if (operationTypes && operationTypes.length > 0) {
    query.operationType = { $in: operationTypes };
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

// 静态方法：获取敏感操作统计
securityAuditSchema.statics.getSensitiveStats = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        sensitivityLevel: { $in: ['high', 'critical'] }
      }
    },
    {
      $group: {
        _id: {
          operationType: '$operationType',
          sensitivityLevel: '$sensitivityLevel'
        },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$operator.userId' }
      }
    },
    {
      $project: {
        operationType: '$_id.operationType',
        sensitivityLevel: '$_id.sensitivityLevel',
        count: 1,
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// 静态方法：获取异常行为报告
securityAuditSchema.statics.getAnomalyReport = async function(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        isAnomaly: true,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          operationType: '$operationType'
        },
        count: { $sum: 1 },
        avgScore: { $avg: '$anomalyScore' }
      }
    },
    {
      $sort: { '_id.date': -1 }
    }
  ]);
};

// 静态方法：获取访问热力图数据
securityAuditSchema.statics.getAccessHeatmap = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          hour: { $hour: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.date': 1, '_id.hour': 1 }
    }
  ]);
};

// 静态方法：获取用户活跃度
securityAuditSchema.statics.getUserActivity = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$operator.userId',
        userName: { $first: '$operator.userName' },
        userRole: { $first: '$operator.userRole' },
        operationCount: { $sum: 1 },
        lastActivity: { $max: '$createdAt' },
        sensitiveOperations: {
          $sum: {
            $cond: [
              { $in: ['$sensitivityLevel', ['high', 'critical']] },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $sort: { operationCount: -1 }
    },
    {
      $limit: 100
    }
  ]);
};

// 静态方法：检查是否满足合规要求
securityAuditSchema.statics.checkCompliance = async function(startDate, endDate) {
  // 检查审计日志完整性
  const totalLogs = await this.countDocuments({
    createdAt: { $gte: startDate, $lte: endDate }
  });

  // 检查是否有高敏感操作未记录
  const sensitiveWithoutAudit = await this.countDocuments({
    sensitivityLevel: 'critical',
    result: 'success',
    operationDetails: { $exists: false }
  });

  // 检查告警响应时间
  const alertResponseTime = await this.aggregate([
    {
      $match: {
        requireAlert: true,
        alertStatus: { $ne: 'pending' },
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        avgResponseTime: {
          $avg: {
            $subtract: ['$updatedAt', '$createdAt']
          }
        }
      }
    }
  ]);

  return {
    totalLogs,
    sensitiveWithoutAudit,
    avgAlertResponseTime: alertResponseTime[0]?.avgResponseTime || 0,
    isCompliant: sensitiveWithoutAudit === 0
  };
};

const SecurityAudit = mongoose.model('SecurityAudit', securityAuditSchema);

module.exports = SecurityAudit;
