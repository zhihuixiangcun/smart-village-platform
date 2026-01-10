/**
 * 数据版本模型
 * 用于追踪数据变更历史，支持离线同步冲突检测和解决
 * 实现类似Git的版本控制机制
 */

const mongoose = require('mongoose');

const dataVersionSchema = new mongoose.Schema({
  // 目标数据模型
  targetModel: {
    type: String,
    required: true,
    enum: [
      'Resident',
      'Household',
      'Family',
      'Announcement',
      'Task',
      'Finance',
      'Emergency',
      'Document',
      'Feedback',
      'Voting',
      'CommitteeMember',
      'DutySchedule',
      'Village'
    ],
    index: true
  },

  // 目标记录ID
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
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

  // 版本号 (递增)
  version: {
    type: Number,
    required: true,
    index: true
  },

  // 父版本ID (用于版本链)
  parentVersionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DataVersion',
    default: null
  },

  // 变更类型
  changeType: {
    type: String,
    enum: ['create', 'update', 'delete', 'restore'],
    required: true
  },

  // 操作者信息
  operator: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: String,
    name: String,
    role: String
  },

  // 变更的完整数据快照
  dataSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  // 变更的字段 (仅update类型)
  changedFields: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],

  // 变更前的数据 (用于回滚)
  previousData: {
    type: mongoose.Schema.Types.Mixed
  },

  // 变更摘要
  summary: {
    message: String,
    tags: [String],
    category: String
  },

  // 变更上下文
  context: {
    source: {
      type: String,
      enum: ['online', 'offline_sync', 'api', 'system', 'migration'],
      default: 'api'
    },
    deviceId: String,
    sessionId: String,
    operationId: String,
    ipAddress: String,
    userAgent: String,
    location: {
      type: { type: String },
      coordinates: [Number]
    }
  },

  // 是否被软删除
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },

  // 删除信息
  deletionInfo: {
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String
  },

  // 冲突解决记录 (如果此版本是解决冲突的结果)
  conflictResolution: {
    wasConflict: {
      type: Boolean,
      default: false
    },
    conflictVersionId: mongoose.Schema.Types.ObjectId,
    resolutionType: {
      type: String,
      enum: ['client_wins', 'server_wins', 'merge', 'manual']
    },
    mergedFrom: [{
      versionId: mongoose.Schema.Types.ObjectId,
      contribution: String
    }]
  },

  // 数据校验和 (用于快速比对)
  checksum: {
    type: String,
    index: true
  },

  // 数据大小 (字节)
  dataSize: {
    type: Number
  },

  // 元数据
  metadata: {
    // 关联的其他记录
    references: [mongoose.Schema.Types.ObjectId],
    // 附件列表
    attachments: [{
      fileId: String,
      fileName: String,
      fileType: String
    }],
    // 自定义属性
    custom: mongoose.Schema.Types.Mixed
  },

  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  // 有效期 (用于TTL)
  expiresAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: true,
  collection: 'data_versions'
});

// 复合索引
dataVersionSchema.index({ targetModel: 1, targetId: 1, version: -1 });
dataVersionSchema.index({ villageId: 1, targetModel: 1, createdAt: -1 });
dataVersionSchema.index({ targetModel: 1, targetId: 1, isDeleted: 1 });
dataVersionSchema.index({ operator: 1, createdAt: -1 });
dataVersionSchema.index({ version: 1, targetModel: 1 });
// checksum索引已在字段定义中指定index: true,无需重复
dataVersionSchema.index({ 'context.operationId': 1 });

// 地理位置索引
dataVersionSchema.index({ 'context.location': '2dsphere' });

// 虚拟字段
dataVersionSchema.virtual('isLatest').get(function() {
  // 需要通过查询确定，这里只是标记
  return false;
});

dataVersionSchema.virtual('age').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / 1000);
});

dataVersionSchema.virtual('isCreate').get(function() {
  return this.changeType === 'create';
});

dataVersionSchema.virtual('isUpdate').get(function() {
  return this.changeType === 'update';
});

dataVersionSchema.virtual('isDelete').get(function() {
  return this.changeType === 'delete';
});

// 实例方法
/**
 * 计算数据校验和
 */
dataVersionSchema.methods.calculateChecksum = function() {
  const crypto = require('crypto');
  const dataStr = JSON.stringify(this.dataSnapshot);
  this.checksum = crypto.createHash('md5').update(dataStr).digest('hex');
  this.dataSize = Buffer.byteLength(dataStr, 'utf8');
  return this.save();
};

/**
 * 获取版本差异
 */
dataVersionSchema.methods.getDiff = function(otherVersion) {
  const diffs = [];
  const currentData = this.dataSnapshot || {};
  const otherData = otherVersion?.dataSnapshot || {};

  const allKeys = new Set([...Object.keys(currentData), ...Object.keys(otherData)]);

  allKeys.forEach(key => {
    const currentValue = currentData[key];
    const otherValue = otherData[key];

    if (JSON.stringify(currentValue) !== JSON.stringify(otherValue)) {
      diffs.push({
        field: key,
        oldValue: otherValue,
        newValue: currentValue
      });
    }
  });

  return diffs;
};

/**
 * 软删除
 */
dataVersionSchema.methods.softDelete = function(userId, reason) {
  this.isDeleted = true;
  this.deletionInfo = {
    deletedAt: new Date(),
    deletedBy: userId,
    reason
  };
  return this.save();
};

/**
 * 恢复删除
 */
dataVersionSchema.methods.restore = function(userId) {
  this.isDeleted = false;
  this.deletionInfo = undefined;
  return this.createNextVersion('restore', this.dataSnapshot, userId);
};

/**
 * 创建下一版本
 */
dataVersionSchema.methods.createNextVersion = function(changeType, newData, operator, options = {}) {
  const DataVersion = mongoose.model('DataVersion');

  // 获取当前记录的最新版本号
  return DataVersion.findOne({
    targetModel: this.targetModel,
    targetId: this.targetId,
    isDeleted: false
  })
    .sort({ version: -1 })
    .then(latestVersion => {
      const nextVersion = new DataVersion({
        targetModel: this.targetModel,
        targetId: this.targetId,
        villageId: this.villageId,
        version: (latestVersion?.version || 0) + 1,
        parentVersionId: this._id,
        changeType,
        operator: typeof operator === 'object' ? operator : { userId: operator },
        dataSnapshot: newData,
        previousData: this.dataSnapshot,
        summary: options.summary,
        context: options.context || this.context,
        metadata: options.metadata || this.metadata
      });

      // 如果是更新，计算变更字段
      if (changeType === 'update') {
        nextVersion.changedFields = this.getDiff({ dataSnapshot: newData });
      }

      return nextVersion.calculateChecksum();
    });
};

/**
 * 添加标签
 */
dataVersionSchema.methods.addTag = function(tag) {
  this.summary = this.summary || {};
  this.summary.tags = this.summary.tags || [];
  if (!this.summary.tags.includes(tag)) {
    this.summary.tags.push(tag);
  }
  return this.save();
};

/**
 * 检查数据是否被修改
 */
dataVersionSchema.methods.isDataModified = function(otherData) {
  const currentChecksum = this.checksum;
  const crypto = require('crypto');
  const otherChecksum = crypto.createHash('md5')
    .update(JSON.stringify(otherData))
    .digest('hex');
  return currentChecksum !== otherChecksum;
};

// 静态方法
/**
 * 获取记录的最新版本
 */
dataVersionSchema.statics.getLatestVersion = function(targetModel, targetId) {
  return this.findOne({
    targetModel,
    targetId,
    isDeleted: false
  })
    .sort({ version: -1 })
    .lean();
};

/**
 * 获取记录的版本历史
 */
dataVersionSchema.statics.getVersionHistory = function(targetModel, targetId, options = {}) {
  const {
    limit = 50,
    skip = 0,
    includeDeleted = false,
    startDate,
    endDate
  } = options;

  const query = { targetModel, targetId };
  if (!includeDeleted) {
    query.isDeleted = false;
  }
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  return this.find(query)
    .sort({ version: -1 })
    .skip(skip)
    .limit(limit)
    .populate('operator.userId', 'username name')
    .lean();
};

/**
 * 获取指定版本
 */
dataVersionSchema.statics.getVersion = function(targetModel, targetId, version) {
  return this.findOne({
    targetModel,
    targetId,
    version,
    isDeleted: false
  })
    .lean();
};

/**
 * 创建初始版本
 */
dataVersionSchema.statics.createInitialVersion = function(targetModel, targetId, villageId, data, operator) {
  return this.create({
    targetModel,
    targetId,
    villageId,
    version: 1,
    parentVersionId: null,
    changeType: 'create',
    operator: typeof operator === 'object' ? operator : { userId: operator },
    dataSnapshot: data,
    summary: {
      message: 'Initial version',
      tags: ['initial']
    },
    context: {
      source: 'api'
    }
  })
    .then(version => version.calculateChecksum());
};

/**
 * 批量创建版本
 */
dataVersionSchema.statics.createVersionsBatch = function(versions) {
  return this.insertMany(versions, { ordered: false });
};

/**
 * 获取村庄的版本统计
 */
dataVersionSchema.statics.getVillageVersionStats = function(villageId, days = 30) {
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
          model: '$targetModel',
          changeType: '$changeType'
        },
        count: { $sum: 1 },
        totalDataSize: { $sum: '$dataSize' },
        avgDataSize: { $avg: '$dataSize' },
        latestVersion: { $max: '$version' }
      }
    },
    {
      $group: {
        _id: '$_id.model',
        changes: {
          $push: {
            type: '$_id.changeType',
            count: '$count',
            totalDataSize: '$totalDataSize'
          }
        },
        totalCount: { $sum: '$count' },
        totalDataSize: { $sum: '$totalDataSize' },
        latestVersion: { $max: '$latestVersion' }
      }
    }
  ]);
};

/**
 * 检测版本冲突
 */
dataVersionSchema.statics.detectConflict = function(targetModel, targetId, clientVersion) {
  return this.findOne({
    targetModel,
    targetId,
    version: { $gt: clientVersion },
    isDeleted: false
  })
    .sort({ version: -1 })
    .lean();
};

/**
 * 获取用户变更统计
 */
dataVersionSchema.statics.getUserChangeStats = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        'operator.userId': mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          model: '$targetModel',
          changeType: '$changeType'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.model',
        changes: {
          $push: {
            type: '$_id.changeType',
            count: '$count'
          }
        },
        totalCount: { $sum: '$count' }
      }
    }
  ]);
};

/**
 * 清理旧版本 (保留最近的N个版本)
 */
dataVersionSchema.statics.cleanupOldVersions = function(targetModel, targetId, keepVersions = 10) {
  return this.find({
    targetModel,
    targetId,
    isDeleted: false
  })
    .sort({ version: -1 })
    .skip(keepVersions)
    .then(oldVersions => {
      if (oldVersions.length > 0) {
        const versionIds = oldVersions.map(v => v._id);
        return this.deleteMany({ _id: { $in: versionIds } });
      }
      return Promise.resolve({ deletedCount: 0 });
    });
};

/**
 * 批量清理过期的已删除版本
 */
dataVersionSchema.statics.cleanupDeletedVersions = function(daysOld = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    isDeleted: true,
    'deletionInfo.deletedAt': { $lt: cutoffDate }
  });
};

/**
 * 搜索版本
 */
dataVersionSchema.statics.searchVersions = function(villageId, searchOptions = {}) {
  const {
    targetModel,
    operatorId,
    tags,
    changeType,
    startDate,
    endDate,
    limit = 50,
    skip = 0
  } = searchOptions;

  const query = { villageId };
  if (targetModel) query.targetModel = targetModel;
  if (operatorId) query['operator.userId'] = mongoose.Types.ObjectId(operatorId);
  if (changeType) query.changeType = changeType;
  if (tags && tags.length > 0) query['summary.tags'] = { $in: tags };
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('operator.userId', 'username name')
    .lean();
};

/**
 * 导出版本历史
 */
dataVersionSchema.statics.exportHistory = function(targetModel, targetId) {
  return this.find({
    targetModel,
    targetId
  })
    .sort({ version: 1 })
    .populate('operator.userId', 'username name')
    .lean()
    .then(versions => {
      return versions.map(v => ({
        version: v.version,
        changeType: v.changeType,
        operator: v.operator,
        createdAt: v.createdAt,
        summary: v.summary,
        changedFields: v.changedFields
      }));
    });
};

// 中间件
dataVersionSchema.pre('save', function(next) {
  // 自动计算校验和
  if (!this.checksum && this.dataSnapshot) {
    const crypto = require('crypto');
    const dataStr = JSON.stringify(this.dataSnapshot);
    this.checksum = crypto.createHash('md5').update(dataStr).digest('hex');
    this.dataSize = Buffer.byteLength(dataStr, 'utf8');
  }

  // 设置删除时间
  if (this.isDeleted && !this.deletionInfo?.deletedAt) {
    this.deletionInfo = this.deletionInfo || {};
    this.deletionInfo.deletedAt = new Date();
  }

  next();
});

// TTL索引：已删除的版本90天后自动删除
dataVersionSchema.index(
  { 'deletionInfo.deletedAt': 1 },
  {
    expireAfterSeconds: 7776000,
    partialFilterExpression: { isDeleted: true }
  }
);

// 普通版本的TTL(可选,默认不删除)
// expiresAt索引已在字段定义中指定index: true,无需重复
// 如需TTL索引,可以取消注释下面这行:
// dataVersionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $exists: true } } });

module.exports = mongoose.model('DataVersion', dataVersionSchema);
