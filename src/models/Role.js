/**
 * Role.js - 角色定义模型
 *
 * 定义村干部角色体系，包含五级角色：
 * - secretary: 村支书（最高权限，负责审核审批）
 * - village_head: 村主任（村务管理、财务管理权限）
 * - accountant: 会计（财务数据管理权限）
 * - population_admin: 人口主任（村民信息、人口管理权限）
 * - security_director: 治保主任（安全管理、应急响应权限）
 * - resident: 普通村民
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * 角色Schema
 */
const roleSchema = new Schema({
  // 角色代码（唯一标识）
  code: {
    type: String,
    enum: ['secretary', 'village_head', 'accountant',
           'population_admin', 'security_director', 'resident'],
    unique: true,
    required: true,
    lowercase: true,
    trim: true
  },

  // 角色名称
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },

  // 权限等级（1-5，数字越大权限越高）
  level: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
    default: 1
  },

  // 角色描述
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // 权限代码列表
  permissions: [{
    type: String,
    trim: true
    // 示例: 'resident:read', 'finance:approve', 'security:manage'
  }],

  // 是否为系统预定义角色
  isSystemRole: {
    type: Boolean,
    default: true
  },

  // 角色状态
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true
  },

  // 元数据
  metadata: {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==================== 索引 ====================

// 复合索引：状态 + 等级
roleSchema.index({ status: 1, level: -1 });

// 文本搜索索引
roleSchema.index({ name: 'text', description: 'text' });

// ==================== 虚拟字段 ====================

// 虚拟字段：权限数量
roleSchema.virtual('permissionCount').get(function() {
  return this.permissions ? this.permissions.length : 0;
});

// ==================== 实例方法 ====================

/**
 * 检查角色是否有指定权限
 * @param {string} permission - 权限代码
 * @returns {boolean}
 */
roleSchema.methods.hasPermission = function(permission) {
  if (!this.permissions || !Array.isArray(this.permissions)) {
    return false;
  }
  return this.permissions.includes(permission) ||
         this.permissions.includes('*'); // * 表示所有权限
};

/**
 * 添加权限
 * @param {string|string[]} permissions - 权限代码或权限数组
 * @returns {Promise<Document>}
 */
roleSchema.methods.addPermissions = function(permissions) {
  const permArray = Array.isArray(permissions) ? permissions : [permissions];
  this.permissions = [...new Set([...this.permissions, ...permArray])];
  return this.save();
};

/**
 * 移除权限
 * @param {string|string[]} permissions - 权限代码或权限数组
 * @returns {Promise<Document>}
 */
roleSchema.methods.removePermissions = function(permissions) {
  const permArray = Array.isArray(permissions) ? permissions : [permissions];
  this.permissions = this.permissions.filter(p => !permArray.includes(p));
  return this.save();
};

/**
 * 激活角色
 * @returns {Promise<Document>}
 */
roleSchema.methods.activate = function() {
  this.status = 'active';
  return this.save();
};

/**
 * 停用角色
 * @returns {Promise<Document>}
 */
roleSchema.methods.deactivate = function() {
  if (this.isSystemRole) {
    throw new Error('系统预定义角色不能停用');
  }
  this.status = 'inactive';
  return this.save();
};

// ==================== 静态方法 ====================

/**
 * 获取所有激活的角色
 * @returns {Promise<Document[]>}
 */
roleSchema.statics.getActiveRoles = function() {
  return this.find({ status: 'active' }).sort({ level: -1 });
};

/**
 * 根据角色代码获取角色
 * @param {string} code - 角色代码
 * @returns {Promise<Document|null>}
 */
roleSchema.statics.getByCode = function(code) {
  return this.findOne({ code: code.toLowerCase() });
};

/**
 * 根据权限等级获取角色
 * @param {number} minLevel - 最低权限等级
 * @param {number} maxLevel - 最高权限等级
 * @returns {Promise<Document[]>}
 */
roleSchema.statics.getByLevel = function(minLevel, maxLevel = 5) {
  return this.find({
    level: { $gte: minLevel, $lte: maxLevel },
    status: 'active'
  }).sort({ level: -1 });
};

/**
 * 获取系统预定义角色
 * @returns {Promise<Document[]>}
 */
roleSchema.statics.getSystemRoles = function() {
  return this.find({ isSystemRole: true, status: 'active' });
};

/**
 * 初始化默认角色数据
 * @returns {Promise<Document[]>}
 */
roleSchema.statics.initDefaultRoles = async function() {
  const defaultRoles = [
    {
      code: 'secretary',
      name: '村支书',
      level: 5,
      description: '村党支部书记，拥有最高权限，负责审核审批工作',
      permissions: [
        '*'
      ],
      isSystemRole: true
    },
    {
      code: 'village_head',
      name: '村主任',
      level: 4,
      description: '村委会主任，负责村务管理和财务审批',
      permissions: [
        'resident:read', 'resident:create', 'resident:update',
        'finance:read', 'finance:create', 'finance:update', 'finance:approve',
        'announcement:read', 'announcement:create', 'announcement:update', 'announcement:delete',
        'task:read', 'task:create', 'task:update', 'task:assign',
        'security:read',
        'audit:read'
      ],
      isSystemRole: true
    },
    {
      code: 'accountant',
      name: '会计',
      level: 3,
      description: '村会计，负责财务数据管理',
      permissions: [
        'finance:read', 'finance:create', 'finance:update',
        'finance:report', 'finance:export',
        'audit:read'
      ],
      isSystemRole: true
    },
    {
      code: 'population_admin',
      name: '人口主任',
      level: 3,
      description: '人口主任，负责村民信息和人口管理',
      permissions: [
        'resident:read', 'resident:create', 'resident:update', 'resident:delete',
        'population:read', 'population:create', 'population:update', 'population:delete',
        'group:read', 'group:create', 'group:update', 'group:delete',
        'population:export'
      ],
      isSystemRole: true
    },
    {
      code: 'security_director',
      name: '治保主任',
      level: 3,
      description: '治保主任，负责安全管理和应急响应',
      permissions: [
        'security:read', 'security:create', 'security:update', 'security:delete',
        'emergency:read', 'emergency:create', 'emergency:update', 'emergency:activate',
        'incident:read', 'incident:create', 'incident:update', 'incident:resolve',
        'resource:read', 'resource:update'
      ],
      isSystemRole: true
    },
    {
      code: 'resident',
      name: '普通村民',
      level: 1,
      description: '普通村民，基础权限',
      permissions: [
        'announcement:read',
        'service:read',
        'profile:update'  // 只能修改自己的资料
      ],
      isSystemRole: true
    }
  ];

  const operations = defaultRoles.map(role => {
    return this.findOneAndUpdate(
      { code: role.code },
      role,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  });

  return Promise.all(operations);
};

// ==================== 中间件 ====================

// 保存前验证
roleSchema.pre('save', function(next) {
  // 系统角色不能修改权限等级
  if (this.isModified('level') && this.isSystemRole) {
    return next(new Error('系统预定义角色不能修改权限等级'));
  }

  // 验证权限格式
  if (this.permissions && this.permissions.length > 0) {
    const invalidPerms = this.permissions.filter(p => {
      return typeof p !== 'string' || !p.match(/^[a-z_]+:(read|create|update|delete|approve|manage|export|\*)$/);
    });

    if (invalidPerms.length > 0) {
      return next(new Error(`无效的权限格式: ${invalidPerms.join(', ')}`));
    }
  }

  next();
});

// 更新时记录操作人
roleSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.metadata || update.$set) {
    const metadata = update.metadata || update.$set?.metadata;
    if (metadata && !metadata.updatedBy) {
      // 这里应该从上下文获取当前用户ID
      // metadata.updatedBy = getCurrentUserId();
    }
  }
  next();
});

module.exports = mongoose.model('Role', roleSchema);
