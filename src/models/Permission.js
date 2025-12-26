/**
 * 权限管理核心数据模型
 * 支持村级管理员唯一认证、分级权限模板、操作审计日志等功能
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const logger = require('../utils/logger');

// 权限级别定义
const PermissionLevels = {
  SUPER_ADMIN: 'super_admin',    // 超级管理员
  VILLAGE_ADMIN: 'village_admin',  // 村级管理员
  DEPARTMENT_HEAD: 'department_head', // 部门负责人
  STAFF: 'staff',                 // 工作人员
  VILLAGER: 'villager',             // 村民
  GUEST: 'guest'                   // 访客
};

// 权限操作类型
const PermissionActions = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  REJECT: 'reject',
  EXPORT: 'export',
  MANAGE: 'manage',
  AUDIT: 'audit'
};

// 数据敏感度
const DataSensitivity = {
  PUBLIC: 'public',         // 公开数据
  INTERNAL: 'internal',     // 内部数据
  SENSITIVE: 'sensitive',   // 敏感数据
  CONFIDENTIAL: 'confidential' // 机密数据
};

/**
 * 村级管理员认证记录模型
 */
const VillageAdminAuthSchema = new mongoose.Schema({
  // 基本信息
  villageId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    description: '村庄唯一标识'
  },

  // 当前管理员信息
  currentAdmin: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: {
      type: String,
      required: true,
      trim: true
    },
    userPhone: {
      type: String,
      required: true,
      trim: true
    },
    idCard: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      enum: ['村支书', '村委会主任', '村委委员'],
      required: true
    },
    appointmentDocument: {
      fileName: String,
      fileUrl: String,
      uploadDate: Date,
      fileHash: String,
      ocrVerified: {
        type: Boolean,
        default: false
      },
      ocrResult: mongoose.Schema.Types.Mixed
    }
  },

  // 认证状态
  status: {
    type: String,
    enum: ['pending', 'active', 'inactive', 'transferring', 'suspended'],
    default: 'pending',
    index: true
  },

  // 认证时间线
  authTimeline: [{
    action: {
      type: String,
      enum: ['created', 'submitted', 'verified', 'approved', 'rejected', 'activated', 'deactivated', 'transferred', 'suspended', 'reactivated'],
      required: true
    },
    timestamp: { type: Date, default: Date.now },
    operator: {
      userId: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    operatorName: String,
    description: String,
    evidence: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],

  // 权限变更记录
  permissionChanges: [{
    changeType: {
      type: String,
      enum: ['permission_grant', 'permission_revoke', 'role_change', 'scope_change'],
      required: true
    },
    timestamp: { type: Date, default: Date.now },
    operator: {
      userId: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    operatorName: String,
    targetUser: {
      userId: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    targetUserName: String,
    oldPermissions: [String],
    newPermissions: [String],
    reason: String,
    approvedBy: {
      userId: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date
  }],

  // 安全设置
  securitySettings: {
    twoFactorEnabled: { type: Boolean, default: false },
    ipWhitelist: [String],
    deviceWhitelist: [{
      deviceId: String,
      deviceName: String,
      platform: String,
      lastUsed: { type: Date, default: Date.now },
      fingerprint: String
    }],
    sessionTimeout: { type: Number, default: 24 * 60 * 60 * 1000 }, // 24小时
    maxSessions: { type: Number, default: 3 },
    passwordPolicy: {
      minLength: { type: Number, default: 8 },
      requireUppercase: { type: Boolean, default: true },
      requireNumbers: { type: Boolean, default: true },
      requireSymbols: { type: Boolean, default: true },
      requireChangeDays: { type: Number, default: 90 }
    }
  },

  // 应急联系人
  emergencyContacts: [{
    name: { type: String, required: true },
    relationship: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    priority: {
      type: String,
      enum: ['primary', 'secondary', 'tertiary'],
      default: 'primary'
    }
  }],

  // 备份管理员（紧急情况）
  backupAdmins: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    phone: String,
    email: String,
    role: String,
    permissions: [String],
    activatedAt: Date,
    expiresAt: Date
  }],

  // 统计信息
  statistics: {
    totalLogins: { type: Number, default: 0 },
    lastLoginAt: Date,
    successfulLogins: { type: Number, default: 0 },
    failedLogins: { type: Number, default: 0 },
    lastFailedLoginAt: Date,
    totalOperations: { type: Number, default: 0 },
    dataExports: { type: Number, default: 0 },
    permissionChanges: { type: Number, default: 0 }
  },

  // 元数据
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: { type: Date, default: Date.now },
    lastModified: { type: Date, default: Date.now },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String,
    tags: [String]
  }
}, {
  timestamps: true,
  collection: 'village_admin_auth'
});

/**
 * 权限模板模型
 */
const PermissionTemplateSchema = new mongoose.Schema({
  // 基本信息
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },

  // 模板类型
  templateType: {
    type: String,
    enum: ['system', 'custom'],
    default: 'system'
  },

  // 适用角色
  applicableRoles: [{
    type: String,
    enum: Object.values(PermissionLevels),
    required: true
  }],

  // 权限配置
  permissions: [{
    resource: {
      type: String,
      required: true,
      description: '资源标识'
    },
    actions: [{
      type: String,
      enum: Object.values(PermissionActions),
      required: true
    }],
    scope: {
      type: String,
      enum: ['own', 'village', 'all'],
      default: 'village'
    },
    conditions: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    dataSensitivity: {
      type: String,
      enum: Object.values(DataSensitivity),
      default: 'internal'
    },
    timeRestrictions: {
      businessHoursOnly: { type: Boolean, default: false },
      allowedDays: [{
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      }],
      allowedHours: {
        start: String,
        end: String
      }
    }
  }],

  // 权限继承
  inheritsFrom: [{
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PermissionTemplate'
    },
    templateName: String,
    conditions: mongoose.Schema.Types.Mixed
  }],

  // 使用统计
  usage: {
    appliedTo: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      userName: String,
      appliedAt: { type: Date, default: Date.now },
      expiresAt: Date
    }],
    totalApplications: { type: Number, default: 0 }
  },

  // 状态
  status: {
    type: String,
    enum: ['active', 'inactive', 'deprecated'],
    default: 'active',
    index: true
  },

  // 元数据
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: { type: Date, default: Date.now },
    lastModified: { type: Date, default: Date.now },
    version: { type: String, default: '1.0.0' },
    tags: [String]
  }
}, {
  timestamps: true,
  collection: 'permission_templates'
});

/**
 * 操作审计日志模型 - 10年留存
 */
const AuditLogSchema = new mongoose.Schema({
  // 基本信息
  logId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => crypto.randomUUID()
  },

  // 操作信息
  operation: {
    type: {
      type: String,
      required: true,
      enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'EXPORT', 'LOGIN', 'LOGOUT', 'ASSIGN', 'TRANSFER', 'AUDIT'],
      required: true
    },
    resource: {
      type: String,
      required: true
    },
    resourceId: mongoose.Schema.Types.ObjectId,
    action: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000
    }
  },

  // 操作者信息
  actor: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: {
      type: String,
      required: true,
      trim: true
    },
    userRole: {
      type: String,
      required: true
    },
    userPhone: String,
    userEmail: String,
    userVillageId: String
  },

  // 目标信息
  target: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    targetResource: String,
    targetResourceId: mongoose.Schema.Types.ObjectId
  },

  // 操作结果
  result: {
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'PARTIAL', 'PENDING'],
      required: true
    },
    errorMessage: String,
    errorCode: String,
    affectedRecords: { type: Number, default: 0 }
  },

  // 数据变更信息
  dataChange: {
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    sensitiveFields: [String],
    maskedFields: [String],
    changeType: {
      type: String,
      enum: ['create', 'update', 'delete', 'approve', 'export', 'login', 'logout'],
      default: 'update'
    }
  },

  // 敏感数据保护
  privacy: {
    sensitiveLevel: {
      type: String,
      enum: Object.values(DataSensitivity),
      required: true
    },
    accessReason: {
      type: String,
      required: true
    },
    legalBasis: {
      type: String,
      enum: ['consent', 'contract', 'legal_obligation', 'legitimate_interest', 'vital_interests'],
      required: true
    },
    dataMinimized: {
      type: Boolean,
      default: false
    }
  },

  // 系统信息
  system: {
    platform: {
      type: String,
      enum: ['web', 'mobile', 'api', 'system'],
      required: true
    },
    userAgent: String,
    ipAddress: {
      type: String,
      required: true
    },
    location: {
      country: String,
      city: String,
      coordinates: [Number]
    },
    deviceId: String,
    sessionId: String
  },

  // 时间信息
  timestamp: {
    type: Date,
    required: true,
    index: true,
    default: Date.now
  },
  duration: {
    type: Number, // 执行时长（毫秒）
    default: 0
  },

  // 关联信息
  relatedLogs: [{
    logId: String,
    relationship: {
      type: String,
      enum: ['parent', 'child', 'related', 'predecessor', 'successor']
    },
    description: String
  }],

  // 风险评估
  risk: {
    level: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    indicators: [String],
    mitigation: String
  },

  // 合规信息
  compliance: {
    regulations: [String], // 相关法规
    retentionPeriod: { type: Number, default: 10 * 365 * 24 * 60 * 60 * 1000 }, // 10年（毫秒）
    requiresArchival: { type: Boolean, default: false },
    encrypted: { type: Boolean, default: true },
    signed: { type: Boolean, default: false }
  },

  // 元数据
  metadata: {
    correlationId: String,
    requestId: String,
    tags: [String],
    notes: String,
    attachments: [{
      type: String,
      name: String,
      url: String,
      size: Number
    }]
  }
}, {
  timestamps: true,
  collection: 'audit_logs'
});

// 索引
VillageAdminAuthSchema.index({ villageId: 1, status: 1 });
VillageAdminAuthSchema.index({ 'currentAdmin.userId': 1 });
VillageAdminAuthSchema.index({ 'currentAdmin.idCard': 1 });

PermissionTemplateSchema.index({ templateType: 1, status: 1 });
PermissionTemplateSchema.index({ applicableRoles: 1 });

AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ 'actor.userId': 1, timestamp: -1 });
AuditLogSchema.index({ operation: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, timestamp: -1 });
AuditLogSchema.index({ 'system.ipAddress': 1, timestamp: -1 });
AuditLogSchema.index({ 'privacy.sensitiveLevel': 1, timestamp: -1 });
AuditLogSchema.index({ logId: 1 }, { unique: true });

// 虚拟字段
VillageAdminAuthSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

VillageAdminAuthSchema.virtual('daysInRole').get(function() {
  const startDate = this.authTimeline.find(t => t.action === 'activated');
  if (!startDate) return 0;
  return Math.floor((Date.now() - startDate.timestamp) / (1000 * 60 * 60 * 24));
});

PermissionTemplateSchema.virtual('totalPermissions').get(function() {
  return this.permissions.length;
});

AuditLogSchema.virtual('dataChangeSummary').get(function() {
  if (!this.dataChange || !this.dataChange.sensitiveFields || this.dataChange.sensitiveFields.length === 0) {
    return null;
  }
  return `修改了${this.dataChange.sensitiveFields.join(', ')}等字段`;
});

// 实例方法 - 权限检查
VillageAdminAuthSchema.methods.hasPermission = function(userId, resource, action) {
  // 当前管理员可以直接操作
  if (this.currentAdmin.userId.toString() === userId.toString()) {
    return true;
  }

  // 检查备份管理员权限
  const backupAdmin = this.backupAdmins.find(ba =>
    ba.userId.toString() === userId.toString() &&
    new Date(ba.expiresAt) > new Date() &&
    ba.permissions.includes(`${resource}:${action}`)
  );

  return !!backupAdmin;
};

// 实例方法 - 验证IP白名单
VillageAdminAuthSchema.methods.isIPAllowed = function(ip) {
  if (!this.securitySettings.ipWhitelist || this.securitySettings.ipWhitelist.length === 0) {
    return true;
  }
  return this.securitySettings.ipWhitelist.includes(ip) ||
         this.securitySettings.ipWhitelist.includes('0.0.0.0/0'); // 允许本地
};

// 实例方法 - 验证设备
VillageAdminAuthSchema.methods.isDeviceAllowed = function(deviceId, fingerprint) {
  if (!this.securitySettings.deviceWhitelist || this.securitySettings.deviceWhitelist.length === 0) {
    return true;
  }

  const device = this.securitySettings.deviceWhitelist.find(d =>
    (d.deviceId === deviceId || d.fingerprint === fingerprint)
  );

  if (!device) return false;

  // 更新设备使用时间
  device.lastUsed = new Date();

  return true;
};

// 静态方法 - 创建村庄管理员认证
VillageAdminAuthSchema.statics.createVillageAdminAuth = async function(villageData, adminData, creatorId) {
  try {
    // 检查村庄是否已有管理员
    const existing = await this.findOne({ villageId: villageData.villageId });
    if (existing && existing.status === 'active') {
      throw new Error('该村庄已有激活的管理员');
    }

    // 创建或更新认证记录
    const authRecord = existing || new this({
      villageId: villageData.villageId
    });

    authRecord.currentAdmin = {
      userId: adminData.userId,
      userName: adminData.userName,
      userPhone: adminData.userPhone,
      idCard: adminData.idCard,
      role: adminData.role,
      appointmentDocument: adminData.appointmentDocument
    };

    authRecord.status = 'pending';

    // 添加认证时间线记录
    authRecord.authTimeline.push({
      action: 'submitted',
      operator: creatorId,
      operatorName: adminData.userName,
      description: '提交村级管理员认证申请'
    });

    await authRecord.save();

    return authRecord;

  } catch (error) {
    logger.error('创建村庄管理员认证失败:', error);
    throw error;
  }
};

// 静态方法 - 验证村级管理员唯一性
VillageAdminAuthSchema.statics.validateVillageAdminUniqueness = async function(villageId, userId) {
  // 检查该村庄是否已有激活的管理员
  const existing = await this.findOne({
    villageId,
    status: 'active',
    'currentAdmin.userId': { $ne: userId }
  });

  if (existing) {
    return {
      valid: false,
      existingAdmin: existing.currentAdmin,
      reason: '该村庄已有激活的管理员，无法重复注册'
    };
  }

  return { valid: true };
};

// 静态方法 - 获取权限模板
PermissionTemplateSchema.statics.getTemplateByRole = async function(role) {
  return this.findOne({
    applicableRoles: role,
    status: 'active'
  }).populate('inheritsFrom');
};

// 静态方法 - 应用权限模板
PermissionTemplateSchema.statics.applyTemplate = async function(templateId, userId, expiresAt) {
  const template = await this.findById(templateId).populate('inheritsFrom');
  if (!template || template.status !== 'active') {
    throw new Error('权限模板不存在或已停用');
  }

  // 收集所有权限（包括继承的）
  const allPermissions = [...template.permissions];

  // 添加继承的权限
  for (const inherited of template.inheritsFrom) {
    allPermissions.push(...inherited.permissions);
  }

  // 更新模板使用统计
  template.usage.appliedTo.push({
    userId,
    userName: '', // 需要从用户表获取
    appliedAt: new Date(),
    expiresAt
  });
  template.usage.totalApplications += 1;

  await template.save();

  return {
    template,
    permissions: allPermissions
  };
};

// 静态方法 - 记录审计日志
AuditLogSchema.statics.logOperation = async function(logData) {
  try {
    // 生成日志ID（如果未提供）
    if (!logData.logId) {
      logData.logId = crypto.randomUUID();
    }

    // 确保时间戳存在
    if (!logData.timestamp) {
      logData.timestamp = new Date();
    }

    // 添加时间戳索引
    logData.createdAt = new Date();
    logData.updatedAt = new Date();

    const log = new this(logData);
    await log.save();

    return log;
  } catch (error) {
    logger.error('记录审计日志失败:', error);
    // 不抛出错误，避免影响主业务流程
    return null;
  }
};

// 静态方法 - 清理过期日志（10年后自动删除）
AuditLogSchema.statics.cleanupExpiredLogs = async function() {
  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

  const result = await this.deleteMany({
    timestamp: { $lt: tenYearsAgo }
  });

  logger.debug(`清理过期审计日志: ${result.deletedCount} 条`);
  return result.deletedCount;
};

// 静态方法 - 查询审计日志
AuditLogSchema.statics.queryLogs = async function(filters = {}, pagination = {}) {
  const {
    userId,
    operation,
    resource,
    status,
    sensitiveLevel,
    dateRange,
    keyword,
    page = 1,
    limit = 20
  } = filters;

  const query = {};

  // 构建查询条件
  if (userId) query['actor.userId'] = userId;
  if (operation) query.operation = operation;
  if (resource) query.resource = resource;
  if (status) query.result = status;
  if (sensitiveLevel) query['privacy.sensitiveLevel'] = sensitiveLevel;

  // 日期范围查询
  if (dateRange && dateRange.start && dateRange.end) {
    query.timestamp = {
      $gte: new Date(dateRange.start),
      $lte: new Date(dateRange.end)
    };
  }

  // 关键词搜索
  if (keyword) {
    query.$or = [
      { description: { $regex: keyword, $options: 'i' } },
      { 'actor.userName': { $regex: keyword, $options: 'i' } },
      { 'target.userName': { $regex: keyword, $options: 'i' } },
      { resource: { $regex: keyword, $options: 'i' } }
    ];
  }

  // 分页
  const skip = (page - 1) * limit;

  const logs = await this.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .populate('actor.userId', 'userName phone email')
    .populate('target.userId', 'userName');

  const total = await this.countDocuments(query);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

module.exports = {
  VillageAdminAuth: mongoose.model('VillageAdminAuth', VillageAdminSchema),
  PermissionTemplate: mongoose.model('PermissionTemplate', PermissionTemplateSchema),
  AuditLog: mongoose.model('AuditLog', AuditLogSchema),
  PermissionLevels,
  PermissionActions,
  DataSensitivity
};