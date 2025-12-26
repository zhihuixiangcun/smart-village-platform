const mongoose = require('mongoose');

const FamilyProxySessionSchema = new mongoose.Schema({
  // 会话基础信息
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    comment: '会话唯一标识符'
  },
  relationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyProxyRelation',
    required: true,
    index: true,
    comment: '关联的代理关系ID'
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

  // 会话目的和范围
  purpose: {
    type: String,
    required: true,
    maxlength: 200,
    comment: '代理目的说明'
  },
  scope: {
    operationTypes: [{
      type: String,
      enum: ['VIEW', 'EDIT', 'SUBMIT', 'APPROVE', 'FINANCIAL', 'PERSONAL', 'REPRESENTATIVE']
    }],
    dataTypes: [{
      type: String,
      enum: ['personal', 'financial', 'health', 'contact', 'document', 'application', 'subsidy']
    }],
    specificOperations: [String],
    restrictedOperations: [String]
  },

  // 时间配置
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  validFrom: {
    type: Date,
    default: Date.now,
    comment: '会话开始时间'
  },
  validUntil: {
    type: Date,
    required: true,
    index: true,
    comment: '会话过期时间'
  },
  lastActivity: {
    type: Date,
    default: Date.now,
    comment: '最后活动时间'
  },

  // 操作限制
  operationLimits: {
    maxOperations: {
      type: Number,
      required: true,
      default: 10,
      comment: '最大操作次数'
    },
    maxFinancialAmount: {
      type: Number,
      comment: '最大金融操作金额（分）'
    },
    maxDataAccess: {
      type: Number,
      comment: '最大数据访问条数'
    },
    operationFrequency: {
      maxPerHour: Number,
      maxPerDay: Number,
      coolingPeriodMinutes: Number
    }
  },

  // 安全验证
  verification: {
    faceVerificationRequired: {
      type: Boolean,
      default: true
    },
    faceVerified: {
      type: Boolean,
      default: false
    },
    faceVerifiedAt: Date,
    twoFactorRequired: {
      type: Boolean,
      default: false
    },
    twoFactorVerified: {
      type: Boolean,
      default: false
    },
    twoFactorVerifiedAt: Date,
    biometricRequired: {
      type: Boolean,
      default: false
    },
    biometricVerified: {
      type: Boolean,
      default: false
    },
    biometricVerifiedAt: Date
  },

  // 会话状态
  status: {
    type: String,
    required: true,
    enum: ['active', 'suspended', 'terminated', 'expired'],
    default: 'active',
    index: true,
    comment: '会话状态'
  },
  terminationReason: {
    type: String,
    enum: ['user_logout', 'timeout', 'operation_limit', 'security_risk', 'admin_action', 'other'],
    comment: '会话终止原因'
  },
  terminationNotes: String,

  // 会话统计
  stats: {
    operationsCount: {
      type: Number,
      default: 0,
      comment: '已执行操作次数'
    },
    successfulOperations: {
      type: Number,
      default: 0,
      comment: '成功操作次数'
    },
    failedOperations: {
      type: Number,
      default: 0,
      comment: '失败操作次数'
    },
    totalDataAccessed: {
      type: Number,
      default: 0,
      comment: '访问数据总量'
    },
    totalFinancialAmount: {
      type: Number,
      default: 0,
      comment: '涉及金融总金额（分）'
    },
    riskEventsCount: {
      type: Number,
      default: 0,
      comment: '风险事件次数'
    }
  },

  // 操作历史
  operationHistory: [{
    operationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    operationType: {
      type: String,
      required: true,
      enum: ['VIEW', 'EDIT', 'SUBMIT', 'APPROVE', 'FINANCIAL', 'PERSONAL', 'REPRESENTATIVE']
    },
    operationData: mongoose.Schema.Types.Mixed,
    result: {
      success: Boolean,
      message: String,
      data: mongoose.Schema.Types.Mixed
    },
    executedAt: {
      type: Date,
      default: Date.now
    },
    executionTime: Number,
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    ipAddress: String,
    userAgent: String,
    location: {
      country: String,
      region: String,
      city: String,
      coordinates: [Number]
    }
  }],

  // 风险监控
  riskMonitoring: {
    currentRiskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    riskFactors: [String],
    riskEvents: [{
      eventType: String,
      description: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      detectedAt: {
        type: Date,
        default: Date.now
      },
      resolved: {
        type: Boolean,
        default: false
      },
      resolvedAt: Date
    }],
    alerts: [{
      type: {
        type: String,
        enum: ['suspicious_activity', 'operation_limit', 'timeout_risk', 'security_breach']
      },
      message: String,
      severity: {
        type: String,
        enum: ['info', 'warning', 'error', 'critical']
      },
      triggeredAt: {
        type: Date,
        default: Date.now
      },
      acknowledged: {
        type: Boolean,
        default: false
      },
      acknowledgedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }]
  },

  // 会话上下文
  context: {
    ipAddress: {
      type: String,
      required: true,
      comment: '会话创建时IP地址'
    },
    userAgent: {
      type: String,
      required: true,
      comment: '用户代理字符串'
    },
    deviceInfo: {
      type: String,
      comment: '设备信息'
    },
    location: {
      country: String,
      region: String,
      city: String,
      coordinates: [Number]
    },
    networkInfo: {
      isp: String,
      connectionType: String,
      proxy: Boolean
    }
  },

  // 扩展配置
  configuration: {
    autoExtend: {
      enabled: {
        type: Boolean,
        default: false
      },
      extendMinutes: {
        type: Number,
        default: 30
      },
      maxExtensions: {
        type: Number,
        default: 2
      }
    },
    notifications: {
      enabled: {
        type: Boolean,
        default: true
      },
      notifyPrincipal: {
        type: Boolean,
        default: true
      },
      notifyAdmin: {
        type: Boolean,
        default: false
      },
      thresholds: {
        operationsCount: Number,
        timeRemaining: Number,
        riskLevel: String
      }
    }
  },

  // 会话扩展历史
  extensions: [{
    extendedAt: {
      type: Date,
      default: Date.now
    },
    extendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    extendMinutes: Number,
    reason: String,
    oldExpiry: Date,
    newExpiry: Date
  }]
}, {
  timestamps: true,
  collection: 'family_proxy_sessions'
});

// 复合索引
FamilyProxySessionSchema.index({ agentUserId: 1, principalUserId: 1, createdAt: -1 });
FamilyProxySessionSchema.index({ status: 1, validUntil: 1 });
FamilyProxySessionSchema.index({ 'riskMonitoring.currentRiskLevel': 1, createdAt: -1 });

// 中间件：会话过期检查
FamilyProxySessionSchema.pre('save', function(next) {
  if (this.validUntil && this.validUntil < new Date()) {
    this.status = 'expired';
    this.terminationReason = 'timeout';
  }
  next();
});

// 实例方法：检查会话是否有效
FamilyProxySessionSchema.methods.isValid = function() {
  const now = new Date();
  return this.status === 'active' &&
         this.validUntil > now &&
         this.stats.operationsCount < this.operationLimits.maxOperations;
};

// 实例方法：检查操作权限
FamilyProxySessionSchema.methods.canExecuteOperation = function(operationType, amount = 0) {
  // 检查操作类型权限
  if (!this.scope.operationTypes.includes(operationType)) {
    return { allowed: false, reason: 'Operation type not permitted' };
  }

  // 检查操作次数限制
  if (this.stats.operationsCount >= this.operationLimits.maxOperations) {
    return { allowed: false, reason: 'Operation limit exceeded' };
  }

  // 检查金融操作限制
  if (amount > 0 && this.operationLimits.maxFinancialAmount) {
    const newTotal = this.stats.totalFinancialAmount + amount;
    if (newTotal > this.operationLimits.maxFinancialAmount) {
      return { allowed: false, reason: 'Financial limit exceeded' };
    }
  }

  // 检查时间限制
  const now = new Date();
  if (now > this.validUntil) {
    return { allowed: false, reason: 'Session expired' };
  }

  return { allowed: true };
};

// 实例方法：记录操作
FamilyProxySessionSchema.methods.recordOperation = function(operationData) {
  this.operationHistory.push(operationData);
  this.stats.operationsCount += 1;
  this.lastActivity = new Date();

  if (operationData.result.success) {
    this.stats.successfulOperations += 1;
  } else {
    this.stats.failedOperations += 1;
  }

  if (operationData.financialAmount) {
    this.stats.totalFinancialAmount += operationData.financialAmount;
  }

  return this.save();
};

// 实例方法：更新风险评估
FamilyProxySessionSchema.methods.updateRiskAssessment = function(riskFactors, riskLevel) {
  this.riskMonitoring.riskFactors = riskFactors;
  this.riskMonitoring.currentRiskLevel = riskLevel;

  if (riskLevel === 'high' || riskLevel === 'critical') {
    this.riskMonitoring.riskEvents.push({
      eventType: 'risk_level_increased',
      description: `Risk level changed to ${riskLevel}`,
      severity: riskLevel
    });
    this.stats.riskEventsCount += 1;
  }

  return this.save();
};

// 静态方法：获取活跃会话
FamilyProxySessionSchema.statics.findActiveSessions = function(userId, role = 'both') {
  const query = {
    status: 'active',
    validUntil: { $gt: new Date() }
  };

  if (role === 'agent') {
    query.agentUserId = userId;
  } else if (role === 'principal') {
    query.principalUserId = userId;
  } else {
    query.$or = [
      { agentUserId: userId },
      { principalUserId: userId }
    ];
  }

  return this.find(query)
    .populate('agentUserId principalUserId', 'name email phone')
    .populate('relationId')
    .sort({ lastActivity: -1 });
};

// 静态方法：清理过期会话
FamilyProxySessionSchema.statics.cleanupExpiredSessions = function() {
  return this.updateMany(
    {
      status: 'active',
      validUntil: { $lt: new Date() }
    },
    {
      $set: {
        status: 'expired',
        terminationReason: 'timeout'
      }
    }
  );
};

module.exports = mongoose.model('FamilyProxySession', FamilyProxySessionSchema);