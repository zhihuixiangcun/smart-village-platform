/**
 * CommitteeRoleAssignment.js - 村干部角色分配模型
 *
 * 管理用户实际拥有的村干部角色和权限
 * 支持权限扩展、限制条件和有效期管理
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * 角色分配Schema
 */
const committeeRoleAssignmentSchema = new Schema({
  // 用户ID
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },

  // 村庄ID
  villageId: {
    type: Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 角色代码
  roleCode: {
    type: String,
    enum: ['secretary', 'village_head', 'accountant',
      'population_admin', 'security_director'],
    required: true,
    index: true
  },

  // 自定义权限扩展（在角色权限基础上额外授予的权限）
  customPermissions: [{
    type: String,
    trim: true
  }],

  // 授权信息
  grantedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  grantedAt: {
    type: Date,
    default: Date.now
  },
  applicationId: {
    type: Schema.Types.ObjectId,
    ref: 'CommitteeApplication'
  },

  // 状态
  status: {
    type: String,
    enum: ['active', 'suspended', 'revoked'],
    default: 'active',
    index: true
  },

  // 有效期
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    default: null
  },

  // 限制条件
  restrictions: {
    // 数据范围：all(全部数据) department(部门数据) self(仅本人数据)
    dataScope: {
      type: String,
      enum: ['all', 'department', 'self'],
      default: 'department'
    },
    // 需要审批的操作列表
    approvalRequired: [{
      type: String
    }],
    // 每日操作限制
    dailyLimit: {
      operation: String,    // 操作类型
      amount: Number,       // 限额
      currentAmount: {      // 当日已使用
        type: Number,
        default: 0
      },
      lastReset: {          // 上次重置时间
        type: Date,
        default: Date.now
      }
    }
  },

  // 备注
  notes: {
    type: String,
    default: null
  },

  // 元数据
  metadata: {
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    suspendedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    suspendedAt: Date,
    suspendedReason: String,
    revokedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    revokedAt: Date,
    revokedReason: String
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==================== 索引 ====================

// 复合索引：村庄 + 角色 + 状态
committeeRoleAssignmentSchema.index({ villageId: 1, roleCode: 1, status: 1 });

// 复合索引：用户 + 状态
committeeRoleAssignmentSchema.index({ userId: 1, status: 1 });

// 复合索引：有效期
committeeRoleAssignmentSchema.index({ validFrom: 1, validUntil: 1 });

// ==================== 虚拟字段 ====================

// 虚拟字段：是否在有效期内
committeeRoleAssignmentSchema.virtual('isValid').get(function() {
  if (this.status !== 'active') {
    return false;
  }
  const now = new Date();
  if (this.validUntil && now > this.validUntil) {
    return false;
  }
  return true;
});

// ==================== 实例方法 ====================

/**
 * 获取所有权限（角色权限 + 自定义权限）
 * @returns {Promise<string[]>}
 */
committeeRoleAssignmentSchema.methods.getAllPermissions = async function() {
  const Role = mongoose.model('Role');
  const role = await Role.findOne({ code: this.roleCode, status: 'active' });

  const permissions = role ? [...role.permissions] : [];
  return [...new Set([...permissions, ...this.customPermissions])];
};

/**
 * 检查是否有指定权限
 * @param {string} permission - 权限代码
 * @returns {Promise<boolean>}
 */
committeeRoleAssignmentSchema.methods.hasPermission = async function(permission) {
  const allPermissions = await this.getAllPermissions();
  return allPermissions.includes(permission) || allPermissions.includes('*');
};

/**
 * 检查操作是否需要审批
 * @param {string} operation - 操作类型
 * @returns {boolean}
 */
committeeRoleAssignmentSchema.methods.requiresApproval = function(operation) {
  if (!this.restrictions.approvalRequired || this.restrictions.approvalRequired.length === 0) {
    return false;
  }
  return this.restrictions.approvalRequired.includes(operation);
};

/**
 * 检查每日限额
 * @param {string} operation - 操作类型
 * @param {number} amount - 金额
 * @returns {Object} { allowed: boolean, remaining: number }
 */
committeeRoleAssignmentSchema.methods.checkDailyLimit = function(operation, amount = 0) {
  if (!this.restrictions.dailyLimit || this.restrictions.dailyLimit.operation !== operation) {
    return { allowed: true, remaining: null };
  }

  // 重置每日计数（如果需要）
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastReset = new Date(this.restrictions.dailyLimit.lastReset);
  lastReset.setHours(0, 0, 0, 0);

  if (lastReset < today) {
    this.restrictions.dailyLimit.currentAmount = 0;
    this.restrictions.dailyLimit.lastReset = new Date();
  }

  const limit = this.restrictions.dailyLimit.amount;
  const current = this.restrictions.dailyLimit.currentAmount;
  const remaining = limit - current;
  const allowed = (current + amount) <= limit;

  return { allowed, remaining, limit, current };
};

/**
 * 更新每日使用量
 * @param {string} operation - 操作类型
 * @param {number} amount - 金额
 * @returns {Promise<Document>}
 */
committeeRoleAssignmentSchema.methods.updateDailyUsage = async function(operation, amount = 1) {
  if (this.restrictions.dailyLimit && this.restrictions.dailyLimit.operation === operation) {
    this.restrictions.dailyLimit.currentAmount += amount;
    return this.save();
  }
  return this;
};

/**
 * 添加自定义权限
 * @param {string|string[]} permissions - 权限代码或数组
 * @returns {Promise<Document>}
 */
committeeRoleAssignmentSchema.methods.addCustomPermissions = function(permissions) {
  const permArray = Array.isArray(permissions) ? permissions : [permissions];
  this.customPermissions = [...new Set([...this.customPermissions, ...permArray])];
  return this.save();
};

/**
 * 移除自定义权限
 * @param {string|string[]} permissions - 权限代码或数组
 * @returns {Promise<Document>}
 */
committeeRoleAssignmentSchema.methods.removeCustomPermissions = function(permissions) {
  const permArray = Array.isArray(permissions) ? permissions : [permissions];
  this.customPermissions = this.customPermissions.filter(p => !permArray.includes(p));
  return this.save();
};

/**
 * 暂停角色
 * @param {string} suspendedBy - 暂停人ID
 * @param {string} reason - 暂停原因
 * @returns {Promise<Document>}
 */
committeeRoleAssignmentSchema.methods.suspend = function(suspendedBy, reason = '') {
  this.status = 'suspended';
  this.metadata.suspendedBy = suspendedBy;
  this.metadata.suspendedAt = new Date();
  this.metadata.suspendedReason = reason;
  return this.save();
};

/**
 * 恢复角色
 * @returns {Promise<Document>}
 */
committeeRoleAssignmentSchema.methods.reactivate = function() {
  this.status = 'active';
  this.metadata.suspendedBy = null;
  this.metadata.suspendedAt = null;
  this.metadata.suspendedReason = null;
  return this.save();
};

/**
 * 撤销角色
 * @param {string} revokedBy - 撤销人ID
 * @param {string} reason - 撤销原因
 * @returns {Promise<Document>}
 */
committeeRoleAssignmentSchema.methods.revoke = function(revokedBy, reason = '') {
  this.status = 'revoked';
  this.metadata.revokedBy = revokedBy;
  this.metadata.revokedAt = new Date();
  this.metadata.revokedReason = reason;
  return this.save();
};

/**
 * 检查数据访问权限
 * @param {string} targetUserId - 目标用户ID
 * @returns {boolean}
 */
committeeRoleAssignmentSchema.methods.canAccessData = function(targetUserId) {
  if (this.restrictions.dataScope === 'all') {
    return true;
  }
  if (this.restrictions.dataScope === 'self') {
    return this.userId.toString() === targetUserId.toString();
  }
  // department 范围需要根据具体业务逻辑判断
  return true;
};

// ==================== 静态方法 ====================

/**
 * 获取用户在指定村庄的角色
 * @param {string} userId - 用户ID
 * @param {string} villageId - 村庄ID
 * @returns {Promise<Document|null>}
 */
committeeRoleAssignmentSchema.statics.getUserRole = function(userId, villageId) {
  return this.findOne({
    userId,
    villageId,
    status: 'active'
  }).populate('userId', 'name phone email');
};

/**
 * 获取村庄的所有村干部
 * @param {string} villageId - 村庄ID
 * @param {string} roleCode - 角色代码（可选）
 * @returns {Promise<Document[]>}
 */
committeeRoleAssignmentSchema.statics.getVillageCommittee = function(villageId, roleCode = null) {
  const query = {
    villageId,
    status: 'active'
  };

  if (roleCode) {
    query.roleCode = roleCode;
  }

  return this.find(query)
    .populate('userId', 'name phone photo')
    .populate('grantedBy', 'name')
    .sort({ roleCode: 1, grantedAt: 1 });
};

/**
 * 获取村庄的指定角色成员
 * @param {string} villageId - 村庄ID
 * @param {string} roleCode - 角色代码
 * @returns {Promise<Document[]>}
 */
committeeRoleAssignmentSchema.statics.getByRole = function(villageId, roleCode) {
  return this.find({
    villageId,
    roleCode,
    status: 'active'
  }).populate('userId', 'name phone photo');
};

/**
 * 获取村支书
 * @param {string} villageId - 村庄ID
 * @returns {Promise<Document|null>}
 */
committeeRoleAssignmentSchema.statics.getSecretary = function(villageId) {
  return this.findOne({
    villageId,
    roleCode: 'secretary',
    status: 'active'
  }).populate('userId');
};

/**
 * 检查用户是否是村干部
 * @param {string} userId - 用户ID
 * @param {string} villageId - 村庄ID
 * @returns {Promise<boolean>}
 */
committeeRoleAssignmentSchema.statics.isCommitteeMember = async function(userId, villageId) {
  const count = await this.countDocuments({
    userId,
    villageId,
    status: 'active'
  });
  return count > 0;
};

/**
 * 获取过期角色列表
 * @returns {Promise<Document[]>}
 */
committeeRoleAssignmentSchema.statics.getExpiredRoles = function() {
  const now = new Date();
  return this.find({
    status: 'active',
    validUntil: { $lt: now }
  });
};

/**
 * 自动暂停过期角色
 * @returns {Promise<number>}
 */
committeeRoleAssignmentSchema.statics.autoSuspendExpired = async function() {
  const now = new Date();
  const result = await this.updateMany(
    {
      status: 'active',
      validUntil: { $lt: now }
    },
    {
      $set: {
        status: 'suspended',
        'metadata.suspendedReason': '有效期已过',
        'metadata.suspendedAt': now
      }
    }
  );
  return result.modifiedCount;
};

// ==================== 中间件 ====================

// 保存前验证
committeeRoleAssignmentSchema.pre('save', function(next) {
  // 验证有效期
  if (this.validUntil && this.validFrom > this.validUntil) {
    return next(new Error('有效期开始时间不能晚于结束时间'));
  }

  // 验证自定义权限格式
  if (this.customPermissions && this.customPermissions.length > 0) {
    const invalidPerms = this.customPermissions.filter(p => {
      return typeof p !== 'string' || !p.match(/^[a-z_]+:(read|create|update|delete|approve|manage|export|\*)$/);
    });

    if (invalidPerms.length > 0) {
      return next(new Error(`无效的权限格式: ${invalidPerms.join(', ')}`));
    }
  }

  next();
});

module.exports = mongoose.model('CommitteeRoleAssignment', committeeRoleAssignmentSchema);
