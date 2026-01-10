/**
 * 数据冲突模型
 * 记录数据同步过程中的冲突及解决方案
 */

const mongoose = require('mongoose');

const dataConflictSchema = new mongoose.Schema({
  // 冲突唯一标识
  conflictId: {
    type: String,
    required: true,
    unique: true,
    default: () => `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },

  // 关联的同步操作
  syncOperationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SyncOperation',
    required: true
  },

  // 关联用户
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 关联村庄
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 冲突类型
  conflictType: {
    type: String,
    enum: [
      'version_mismatch',      // 版本不匹配
      'concurrent_update',     // 并发更新
      'delete_modify',        // 删除与修改冲突
      'duplicate_create',      // 重复创建
      'validation_error',      // 验证错误
      'dependency_error',      // 依赖错误
      'permission_error',      // 权限错误
      'unknown'
    ],
    required: true
  },

  // 冲突严重程度
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },

  // 目标数据模型
  targetModel: {
    type: String,
    required: true
  },

  // 目标记录ID
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  // 客户端数据 (离线修改的数据)
  clientData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  // 服务器数据 (当前服务器上的数据)
  serverData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  // 基础版本数据 (冲突发生前的版本)
  baseData: {
    type: mongoose.Schema.Types.Mixed
  },

  // 冲突详情
  conflictDetails: {
    clientVersion: Number,
    serverVersion: Number,
    baseVersion: Number,
    conflictedFields: [String],
    fieldDiffs: [{
      field: String,
      clientValue: mongoose.Schema.Types.Mixed,
      serverValue: mongoose.Schema.Types.Mixed,
      baseValue: mongoose.Schema.Types.Mixed
    }]
  },

  // 解决方案
  resolution: {
    type: String,
    enum: ['pending', 'client_wins', 'server_wins', 'merge', 'auto_resolved', 'escalated'],
    default: 'pending'
  },

  // 解决后的数据
  resolvedData: {
    type: mongoose.Schema.Types.Mixed
  },

  // 解决人
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // 解决时间
  resolvedAt: {
    type: Date
  },

  // 解决备注
  resolutionNote: {
    type: String
  },

  // 自动解决规则
  autoResolution: {
    applied: {
      type: Boolean,
      default: false
    },
    rule: String,
    confidence: Number // 0-1
  },

  // 状态
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'escalated', 'ignored'],
    default: 'open',
    index: true
  },

  // 通知信息
  notification: {
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date,
    channels: [{
      type: String,
      enum: ['email', 'sms', 'push', 'in_app']
    }]
  },

  // 元数据
  metadata: {
    deviceId: String,
    ipAddress: String,
    userAgent: String,
    offlineDuration: Number
  },

  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  // 更新时间
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'data_conflicts'
});

// 复合索引
dataConflictSchema.index({ userId: 1, status: 1, createdAt: -1 });
dataConflictSchema.index({ villageId: 1, status: 1, severity: -1 });
dataConflictSchema.index({ targetModel: 1, targetId: 1, status: 1 });
dataConflictSchema.index({ conflictType: 1, status: 1 });

// 虚拟字段
dataConflictSchema.virtual('isOpen').get(function() {
  return this.status === 'open';
});

dataConflictSchema.virtual('isResolved').get(function() {
  return this.status === 'resolved';
});

dataConflictSchema.virtual('canAutoResolve').get(function() {
  return this.severity !== 'critical' &&
         this.conflictType !== 'permission_error';
});

dataConflictSchema.virtual('age').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / 1000);
});

// 实例方法
/**
 * 标记为解决中
 */
dataConflictSchema.methods.markInProgress = function() {
  this.status = 'in_progress';
  return this.save();
};

/**
 * 解决冲突 - 客户端数据胜出
 */
dataConflictSchema.methods.resolveClientWins = function(userId, note) {
  this.resolution = 'client_wins';
  this.resolvedData = this.clientData;
  this.resolvedBy = userId;
  this.resolvedAt = new Date();
  this.resolutionNote = note;
  this.status = 'resolved';
  return this.save();
};

/**
 * 解决冲突 - 服务器数据胜出
 */
dataConflictSchema.methods.resolveServerWins = function(userId, note) {
  this.resolution = 'server_wins';
  this.resolvedData = this.serverData;
  this.resolvedBy = userId;
  this.resolvedAt = new Date();
  this.resolutionNote = note;
  this.status = 'resolved';
  return this.save();
};

/**
 * 解决冲突 - 合并数据
 */
dataConflictSchema.methods.resolveMerge = function(mergedData, userId, note) {
  this.resolution = 'merge';
  this.resolvedData = mergedData;
  this.resolvedBy = userId;
  this.resolvedAt = new Date();
  this.resolutionNote = note;
  this.status = 'resolved';
  return this.save();
};

/**
 * 自动解决
 */
dataConflictSchema.methods.autoResolve = function(rule, confidence = 0.8) {
  if (!this.canAutoResolve) {
    throw new Error('Conflict cannot be auto-resolved');
  }

  this.autoResolution = {
    applied: true,
    rule,
    confidence
  };

  // 根据规则自动选择解决方案
  switch(rule) {
  case 'server_wins':
    return this.resolveServerWins(null, 'Auto-resolved: server wins');
  case 'client_wins':
    return this.resolveClientWins(null, 'Auto-resolved: client wins');
  case 'latest_timestamp':
    const clientTime = new Date(this.clientData.updatedAt || 0);
    const serverTime = new Date(this.serverData.updatedAt || 0);
    if (clientTime > serverTime) {
      return this.resolveClientWins(null, 'Auto-resolved: client has latest data');
    } else {
      return this.resolveServerWins(null, 'Auto-resolved: server has latest data');
    }
  case 'merge_non_conflicting':
    // 合并非冲突字段
    const merged = { ...this.serverData };
    let hasMerge = false;
    Object.keys(this.clientData).forEach(key => {
      if (this.conflictDetails.conflictedFields.indexOf(key) === -1) {
        merged[key] = this.clientData[key];
        hasMerge = true;
      }
    });
    if (hasMerge) {
      return this.resolveMerge(merged, null, 'Auto-resolved: merged non-conflicting fields');
    } else {
      return this.resolveServerWins(null, 'Auto-resolved: all fields conflicted, server wins');
    }
  default:
    throw new Error(`Unknown auto-resolution rule: ${rule}`);
  }
};

/**
 * 升级处理
 */
dataConflictSchema.methods.escalate = function(reason) {
  this.status = 'escalated';
  this.resolutionNote = reason || 'Escalated for manual review';
  return this.save();
};

/**
 * 忽略冲突
 */
dataConflictSchema.methods.ignore = function(reason) {
  this.status = 'ignored';
  this.resolutionNote = reason || 'Conflict ignored';
  this.resolution = 'server_wins';
  return this.save();
};

/**
 * 计算冲突字段差异
 */
dataConflictSchema.methods.calculateFieldDiffs = function() {
  const diffs = [];
  const fields = new Set([
    ...Object.keys(this.clientData || {}),
    ...Object.keys(this.serverData || {})
  ]);

  fields.forEach(field => {
    const clientValue = this.clientData?.[field];
    const serverValue = this.serverData?.[field];
    const baseValue = this.baseData?.[field];

    if (JSON.stringify(clientValue) !== JSON.stringify(serverValue)) {
      diffs.push({
        field,
        clientValue,
        serverValue,
        baseValue
      });
    }
  });

  this.conflictDetails = this.conflictDetails || {};
  this.conflictDetails.fieldDiffs = diffs;
  this.conflictDetails.conflictedFields = diffs.map(d => d.field);

  return this.save();
};

// 静态方法
/**
 * 获取未解决的冲突
 */
dataConflictSchema.statics.getOpenConflicts = function(villageId) {
  return this.find({
    villageId,
    status: { $in: ['open', 'in_progress'] }
  })
    .sort({ severity: -1, createdAt: 1 })
    .populate('userId', 'username name')
    .populate('resolvedBy', 'username name');
};

/**
 * 获取用户的冲突
 */
dataConflictSchema.statics.getUserConflicts = function(userId, options = {}) {
  const {
    status,
    limit = 20,
    skip = 0
  } = options;

  const query = { userId };
  if (status) {
    query.status = status;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('resolvedBy', 'username name')
    .lean();
};

/**
 * 获取冲突统计
 */
dataConflictSchema.statics.getStats = function(villageId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        villageId: mongoose.Types.ObjectId(villageId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          type: '$conflictType',
          status: '$status'
        },
        count: { $sum: 1 },
        avgResolutionTime: {
          $avg: {
            $cond: [
              { $ne: ['$resolvedAt', null] },
              { $subtract: ['$resolvedAt', '$createdAt'] },
              null
            ]
          }
        }
      }
    },
    {
      $group: {
        _id: '$_id.type',
        statuses: {
          $push: {
            status: '$_id.status',
            count: '$count',
            avgResolutionTime: '$avgResolutionTime'
          }
        },
        totalCount: { $sum: '$count' }
      }
    }
  ]);
};

/**
 * 批量创建冲突记录
 */
dataConflictSchema.statics.createConflicts = function(conflicts) {
  return this.insertMany(conflicts, { ordered: false });
};

/**
 * 自动解决可自动解决的冲突
 */
dataConflictSchema.statics.autoResolveOpenConflicts = async function(villageId) {
  const conflicts = await this.find({
    villageId,
    status: 'open',
    severity: { $ne: 'critical' }
  });

  const results = {
    resolved: 0,
    failed: 0,
    errors: []
  };

  for (const conflict of conflicts) {
    try {
      // 尝试自动解决
      if (conflict.canAutoResolve) {
        await conflict.autoResolve('latest_timestamp');
        results.resolved++;
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        conflictId: conflict.conflictId,
        error: error.message
      });
    }
  }

  return results;
};

/**
 * 清理已解决的旧冲突
 */
dataConflictSchema.statics.cleanupResolved = function(daysOld = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    status: 'resolved',
    updatedAt: { $lt: cutoffDate }
  });
};

// 中间件
dataConflictSchema.pre('save', function(next) {
  // 如果是新建且没有计算字段差异，自动计算
  if (this.isNew && !this.conflictDetails?.fieldDiffs?.length) {
    this.calculateFieldDiffs();
  }

  // 根据冲突类型自动设置严重程度
  if (this.isNew && !this.severity || this.severity === 'medium') {
    switch(this.conflictType) {
    case 'permission_error':
      this.severity = 'high';
      break;
    case 'delete_modify':
      this.severity = 'high';
      break;
    case 'validation_error':
      this.severity = 'medium';
      break;
    case 'version_mismatch':
      this.severity = 'low';
      break;
    }
  }

  next();
});

module.exports = mongoose.model('DataConflict', dataConflictSchema);
