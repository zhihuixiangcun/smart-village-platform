const mongoose = require('mongoose');

const FamilyProxyAuditLogSchema = new mongoose.Schema({
  // 日志基础信息
  logId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    comment: '日志唯一标识符'
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyProxySession',
    required: true,
    index: true,
    comment: '关联的代理会话ID'
  },
  relationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyProxyRelation',
    required: true,
    index: true,
    comment: '关联的代理关系ID'
  },

  // 用户信息
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true,
    index: true,
    comment: '操作用户ID'
  },
  agentUserId: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true,
    index: true,
    comment: '代理人用户ID'
  },
  principalUserId: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true,
    index: true,
    comment: '被代理人用户ID'
  },

  // 操作信息
  action: {
    type: String,
    required: true,
    enum: [
      'RELATION_CREATED',
      'RELATION_VERIFIED',
      'RELATION_REJECTED',
      'RELATION_SUSPENDED',
      'SESSION_CREATED',
      'SESSION_TERMINATED',
      'SESSION_EXTENDED',
      'OPERATION_EXECUTED',
      'OPERATION_FAILED',
      'PERMISSION_DENIED',
      'SECURITY_BREACH',
      'RISK_DETECTED',
      'DATA_ACCESSED',
      'DATA_MODIFIED',
      'FINANCIAL_OPERATION',
      'PERSONAL_DATA_ACCESS',
      'SYSTEM_EVENT',
      'ADMIN_ACTION'
    ],
    index: true,
    comment: '操作类型'
  },

  // 操作详情
  operationDetails: {
    operationType: {
      type: String,
      enum: ['VIEW', 'EDIT', 'SUBMIT', 'APPROVE', 'FINANCIAL', 'PERSONAL', 'REPRESENTATIVE']
    },
    targetModule: String,
    targetEntity: String,
    targetId: mongoose.Schema.Types.ObjectId,
    operationData: mongoose.Schema.Types.Mixed,
    previousValues: mongoose.Schema.Types.Mixed,
    newValues: mongoose.Schema.Types.Mixed,
    fieldsChanged: [String]
  },

  // 结果信息
  result: {
    success: {
      type: Boolean,
      required: true,
      index: true,
      comment: '操作是否成功'
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'partial', 'pending', 'cancelled'],
      required: true
    },
    message: String,
    errorCode: String,
    errorMessage: String,
    executionTime: Number,
    affectedRecords: Number
  },

  // 风险评估
  riskAssessment: {
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
      index: true,
      default: 'low'
    },
    riskFactors: [{
      type: {
        type: String,
        enum: [
          'unusual_location',
          'unusual_time',
          'high_frequency',
          'large_amount',
          'sensitive_data',
          'failed_verification',
          'privilege_escalation',
          'suspicious_pattern',
          'unauthorized_access'
        ]
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      description: String,
      detectedAt: {
        type: Date,
        default: Date.now
      }
    }],
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    mitigationActions: [String]
  },

  // 数据访问详情
  dataAccess: {
    dataTypes: [{
      type: String,
      enum: ['personal', 'financial', 'health', 'contact', 'document', 'application', 'subsidy', 'government']
    }],
    accessLevel: {
      type: String,
      enum: ['basic', 'detailed', 'sensitive', 'restricted']
    },
    recordsAccessed: Number,
    fieldsAccessed: [String],
    searchCriteria: mongoose.Schema.Types.Mixed,
    downloadSize: Number,
    exported: Boolean
  },

  // 安全信息
  security: {
    ipAddress: {
      type: String,
      required: true,
      index: true,
      comment: 'IP地址'
    },
    userAgent: String,
    deviceInfo: {
      type: String,
      comment: '设备指纹'
    },
    location: {
      country: String,
      region: String,
      city: String,
      coordinates: [Number],
      isp: String,
      timezone: String
    },
    networkInfo: {
      connectionType: String,
      proxy: Boolean,
      vpn: Boolean,
      tor: Boolean
    },
    authentication: {
      method: {
        type: String,
        enum: ['password', 'face_recognition', 'two_factor', 'biometric', 'certificate']
      },
      verified: Boolean,
      verificationTime: Date,
      challenges: [String]
    }
  },

  // 时间信息
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
    comment: '操作时间'
  },
  duration: {
    type: Number,
    comment: '操作持续时间（毫秒）'
  },
  sessionAge: {
    type: Number,
    comment: '操作时的会话年龄（分钟）'
  },

  // 系统信息
  system: {
    service: String,
    version: String,
    environment: {
      type: String,
      enum: ['development', 'testing', 'staging', 'production']
    },
    nodeId: String,
    requestId: String,
    correlationId: String,
    traceId: String
  },

  // 上下文信息
  context: {
    source: {
      type: String,
      enum: ['web', 'mobile', 'api', 'admin', 'system', 'batch']
    },
    endpoint: String,
    httpMethod: String,
    httpStatus: Number,
    requestHeaders: mongoose.Schema.Types.Mixed,
    responseSize: Number,
    cacheHit: Boolean,
    databaseQueries: Number
  },

  // 合规和审计
  compliance: {
    dataRetentionDays: Number,
    gdprRelevant: {
      type: Boolean,
      default: false
    },
    consentObtained: Boolean,
    consentType: String,
    legalBasis: String,
    dataSubjectRights: [{
      type: String,
      enum: ['access', 'rectification', 'erasure', 'portability', 'objection', 'restriction']
    }],
    dataProcessingPurpose: String,
    dataCategories: [String],
    retentionPeriod: String
  },

  // 关联信息
  relatedLogs: [{
    logId: String,
    relation: {
      type: String,
      enum: ['parent', 'child', 'sibling', 'causes', 'caused_by', 'corrects', 'corrected_by']
    },
    description: String
  }],
  attachments: [{
    type: {
      type: String,
      enum: ['screenshot', 'document', 'image', 'video', 'log_file', 'evidence']
    },
    name: String,
    path: String,
    size: Number,
    mimeType: String,
    checksum: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 审查标记
  review: {
    requiresReview: {
      type: Boolean,
      default: false,
      index: true
    },
    reviewed: {
      type: Boolean,
      default: false
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    reviewComments: String,
    reviewDecision: {
      type: String,
      enum: ['approved', 'rejected', 'requires_investigation', 'escalated']
    },
    escalationLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    }
  },

  // 错误和异常
  error: {
    occurred: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      enum: ['system', 'network', 'database', 'authentication', 'authorization', 'validation', 'business_rule', 'external_service']
    },
    code: String,
    message: String,
    stack: String,
    details: mongoose.Schema.Types.Mixed,
    recoverable: Boolean,
    impact: {
      type: String,
      enum: ['none', 'low', 'medium', 'high', 'critical']
    }
  },

  // 性能指标
  performance: {
    cpuUsage: Number,
    memoryUsage: Number,
    networkLatency: Number,
    databaseResponseTime: Number,
    cacheHitRate: Number,
    concurrentUsers: Number,
    systemLoad: Number
  }
}, {
  timestamps: true,
  collection: 'family_proxy_audit_logs'
});

// 复合索引
FamilyProxyAuditLogSchema.index({ userId: 1, timestamp: -1 });
FamilyProxyAuditLogSchema.index({ action: 1, timestamp: -1 });
FamilyProxyAuditLogSchema.index({ 'riskAssessment.riskLevel': 1, timestamp: -1 });
FamilyProxyAuditLogSchema.index({ 'security.ipAddress': 1, timestamp: -1 });
FamilyProxyAuditLogSchema.index({ sessionId: 1, timestamp: -1 });

// 中间件：自动生成日志ID
FamilyProxyAuditLogSchema.pre('save', function(next) {
  if (!this.logId) {
    this.logId = `AUD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// 实例方法：添加风险因子
FamilyProxyAuditLogSchema.methods.addRiskFactor = function(type, severity, description) {
  const existingFactor = this.riskAssessment.riskFactors.find(f => f.type === type);

  if (existingFactor) {
    existingFactor.severity = severity;
    existingFactor.description = description;
    existingFactor.detectedAt = new Date();
  } else {
    this.riskAssessment.riskFactors.push({
      type,
      severity,
      description,
      detectedAt: new Date()
    });
  }

  // 更新风险等级
  this.updateRiskLevel();
  return this.save();
};

// 实例方法：更新风险等级
FamilyProxyAuditLogSchema.methods.updateRiskLevel = function() {
  const severities = this.riskAssessment.riskFactors.map(f => {
    switch (f.severity) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
    }
  });

  const maxSeverity = Math.max(...severities, 0);

  if (maxSeverity === 4) this.riskAssessment.riskLevel = 'critical';
  else if (maxSeverity === 3) this.riskAssessment.riskLevel = 'high';
  else if (maxSeverity === 2) this.riskAssessment.riskLevel = 'medium';
  else this.riskAssessment.riskLevel = 'low';

  // 计算风险分数
  this.riskAssessment.riskScore = Math.min(100, severities.reduce((sum, s) => sum + s * 15, 0));
};

// 实例方法：标记需要审查
FamilyProxyAuditLogSchema.methods.markForReview = function(reason, escalationLevel = 'medium') {
  this.review.requiresReview = true;
  this.review.escalationLevel = escalationLevel;

  // 添加审查原因到评论
  if (this.review.reviewComments) {
    this.review.reviewComments += `; ${reason}`;
  } else {
    this.review.reviewComments = reason;
  }

  return this.save();
};

// 静态方法：按时间范围查询日志
FamilyProxyAuditLogSchema.statics.findByDateRange = function(startDate, endDate, filters = {}) {
  const query = {
    timestamp: {
      $gte: startDate,
      $lte: endDate
    },
    ...filters
  };

  return this.find(query)
    .populate('userId agentUserId principalUserId', 'name email phone')
    .populate('sessionId relationId')
    .sort({ timestamp: -1 });
};

// 静态方法：获取高风险操作
FamilyProxyAuditLogSchema.statics.getHighRiskOperations = function(hours = 24) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  return this.find({
    'riskAssessment.riskLevel': { $in: ['high', 'critical'] },
    timestamp: { $gte: cutoff }
  })
    .populate('userId agentUserId principalUserId', 'name email phone')
    .sort({ 'riskAssessment.riskScore': -1, timestamp: -1 });
};

// 静态方法：获取用户活动模式
FamilyProxyAuditLogSchema.statics.getUserActivityPattern = function(userId, days = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return this.aggregate([
    {
      $match: {
        $or: [
          { userId },
          { agentUserId: userId },
          { principalUserId: userId }
        ],
        timestamp: { $gte: cutoff }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          hour: { $hour: '$timestamp' },
          action: '$action'
        },
        count: { $sum: 1 },
        successCount: {
          $sum: { $cond: ['$result.success', 1, 0] }
        },
        avgRiskScore: { $avg: '$riskAssessment.riskScore' }
      }
    },
    {
      $sort: { '_id.date': 1, '_id.hour': 1 }
    }
  ]);
};

// 静态方法：数据访问统计
FamilyProxyAuditLogSchema.statics.getDataAccessStats = function(days = 7) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: cutoff },
        'dataAccess.dataTypes': { $exists: true, $ne: [] }
      }
    },
    {
      $unwind: '$dataAccess.dataTypes'
    },
    {
      $group: {
        _id: '$dataAccess.dataTypes',
        accessCount: { $sum: 1 },
        totalRecords: { $sum: '$dataAccess.recordsAccessed' },
        uniqueUsers: { $addToSet: '$userId' },
        avgRiskScore: { $avg: '$riskAssessment.riskScore' }
      }
    },
    {
      $addFields: {
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    },
    {
      $project: {
        uniqueUsers: 0
      }
    },
    {
      $sort: { accessCount: -1 }
    }
  ]);
};

module.exports = mongoose.model('FamilyProxyAuditLog', FamilyProxyAuditLogSchema);