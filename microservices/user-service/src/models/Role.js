/**
 * 角色模型
 */

const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  // 基本信息
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    match: /^[A-Z_]+$/
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200
  },

  // 权限配置
  permissions: [{
    resource: {
      type: String,
      required: true
    },
    actions: [{
      type: String,
      required: true
    }],
    conditions: [{
      field: String,
      operator: {
        type: String,
        enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'exists']
      },
      value: mongoose.Schema.Types.Mixed
    }]
  }],

  // 角色类型
  type: {
    type: String,
    enum: ['system', 'village', 'custom'],
    default: 'custom'
  },

  // 层级关系
  parentRole: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    default: null
  },
  childRoles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  }],
  level: {
    type: Number,
    default: 0
  },

  // 作用域
  scope: {
    type: String,
    enum: ['global', 'village', 'department'],
    default: 'village'
  },
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    default: null
  },

  // 状态管理
  isActive: {
    type: Boolean,
    default: true
  },
  isSystem: {
    type: Boolean,
    default: false
  },

  // 使用统计
  userCount: {
    type: Number,
    default: 0
  },
  lastUsedAt: {
    type: Date,
    default: null
  },

  // 审计字段
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// 索引
roleSchema.index({ code: 1 });
roleSchema.index({ name: 1 });
roleSchema.index({ villageId: 1 });
roleSchema.index({ type: 1 });
roleSchema.index({ scope: 1 });
roleSchema.index({ isActive: 1 });
roleSchema.index({ isSystem: 1 });

// 复合索引
roleSchema.index({ villageId: 1, code: 1 }, { unique: true, sparse: true });

// 虚拟字段
roleSchema.virtual('isGlobal').get(function() {
  return this.scope === 'global';
});

roleSchema.virtual('isVillageRole').get(function() {
  return this.scope === 'village';
});

// 中间件：更新时间
roleSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 中间件：计算层级
roleSchema.pre('save', async function(next) {
  if (this.parentRole) {
    const parent = await this.constructor.findById(this.parentRole);
    if (parent) {
      this.level = parent.level + 1;
    }
  } else {
    this.level = 0;
  }
  next();
});

// 实例方法：检查权限
roleSchema.methods.hasPermission = function(resource, action, context = {}) {
  return this.permissions.some(permission => {
    if (permission.resource !== resource && permission.resource !== '*') {
      return false;
    }

    if (!permission.actions.includes(action) &&
        !permission.actions.includes('*') &&
        !permission.actions.includes('all')) {
      return false;
    }

    // 检查条件
    if (permission.conditions && permission.conditions.length > 0) {
      return this.checkConditions(permission.conditions, context);
    }

    return true;
  });
};

// 检查权限条件
roleSchema.methods.checkConditions = function(conditions, context) {
  return conditions.every(condition => {
    const { field, operator, value } = condition;
    const contextValue = context[field];

    switch (operator) {
      case 'eq':
        return contextValue === value;
      case 'ne':
        return contextValue !== value;
      case 'gt':
        return contextValue > value;
      case 'gte':
        return contextValue >= value;
      case 'lt':
        return contextValue < value;
      case 'lte':
        return contextValue <= value;
      case 'in':
        return Array.isArray(value) && value.includes(contextValue);
      case 'nin':
        return Array.isArray(value) && !value.includes(contextValue);
      case 'exists':
        return value ? contextValue !== undefined : contextValue === undefined;
      default:
        return false;
    }
  });
};

// 实例方法：添加权限
roleSchema.methods.addPermission = function(resource, actions, conditions = []) {
  const existingPermission = this.permissions.find(p => p.resource === resource);

  if (existingPermission) {
    // 合并动作
    const newActions = [...new Set([...existingPermission.actions, ...actions])];
    existingPermission.actions = newActions;

    // 合并条件
    if (conditions.length > 0) {
      existingPermission.conditions = [
        ...existingPermission.conditions,
        ...conditions
      ];
    }
  } else {
    this.permissions.push({
      resource,
      actions,
      conditions
    });
  }

  return this.save();
};

// 实例方法：移除权限
roleSchema.methods.removePermission = function(resource, action) {
  this.permissions = this.permissions.filter(permission => {
    if (permission.resource === resource) {
      if (action) {
        permission.actions = permission.actions.filter(a => a !== action);
        return permission.actions.length > 0;
      }
      return false;
    }
    return true;
  });

  return this.save();
};

// 实例方法：获取所有权限（包括继承的）
roleSchema.methods.getAllPermissions = async function() {
  let allPermissions = [...this.permissions];

  if (this.parentRole) {
    const parentRole = await this.constructor.findById(this.parentRole);
    if (parentRole) {
      const parentPermissions = await parentRole.getAllPermissions();
      allPermissions = [...allPermissions, ...parentPermissions];
    }
  }

  return allPermissions;
};

// 实例方法：增加用户计数
roleSchema.methods.incrementUserCount = function() {
  this.userCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

// 实例方法：减少用户计数
roleSchema.methods.decrementUserCount = function() {
  if (this.userCount > 0) {
    this.userCount -= 1;
  }
  return this.save();
};

// 静态方法：创建系统角色
roleSchema.statics.createSystemRoles = async function() {
  const systemRoles = [
    {
      name: '超级管理员',
      code: 'SUPER_ADMIN',
      description: '系统超级管理员，拥有所有权限',
      type: 'system',
      scope: 'global',
      isSystem: true,
      permissions: [
        { resource: '*', actions: ['*'] }
      ]
    },
    {
      name: '村管理员',
      code: 'VILLAGE_ADMIN',
      description: '村庄管理员，管理村庄所有事务',
      type: 'system',
      scope: 'village',
      isSystem: true,
      permissions: [
        { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'residents', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'announcements', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'meetings', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'finance', actions: ['read', 'create', 'update'] },
        { resource: 'emergency', actions: ['*'] }
      ]
    },
    {
      name: '村委员',
      code: 'VILLAGE_COMMITTEE',
      description: '村委员会成员，管理特定领域事务',
      type: 'system',
      scope: 'village',
      isSystem: true,
      permissions: [
        { resource: 'announcements', actions: ['create', 'read', 'update'] },
        { resource: 'meetings', actions: ['create', 'read', 'update'] },
        { resource: 'residents', actions: ['read'] },
        { resource: 'finance', actions: ['read'] }
      ]
    },
    {
      name: '村民',
      code: 'VILLAGER',
      description: '普通村民，查看和参与村庄事务',
      type: 'system',
      scope: 'village',
      isSystem: true,
      permissions: [
        { resource: 'announcements', actions: ['read'] },
        { resource: 'meetings', actions: ['read'] },
        { resource: 'services', actions: ['read', 'create'] },
        { resource: 'profile', actions: ['read', 'update'] }
      ]
    }
  ];

  for (const roleData of systemRoles) {
    const existingRole = await this.findOne({ code: roleData.code });
    if (!existingRole) {
      await this.create(roleData);
    }
  }

  return this.find({ isSystem: true });
};

// 静态方法：获取角色层级
roleSchema.statics.getRoleHierarchy = function(villageId) {
  const matchStage = villageId ? { villageId: new mongoose.Types.ObjectId(villageId) } : {};

  return this.aggregate([
    { $match: matchStage },
    {
      $graphLookup: {
        from: 'roles',
        startWith: '$_id',
        connectFromField: '_id',
        connectToField: 'parentRole',
        as: 'descendants'
      }
    },
    {
      $graphlookup: {
        from: 'roles',
        startWith: '$parentRole',
        connectFromField: 'parentRole',
        connectToField: '_id',
        as: 'ancestors'
      }
    },
    {
      $addFields: {
        hierarchy: {
          level: '$level',
          ancestors: '$ancestors',
          descendants: '$descendants'
        }
      }
    },
    { $sort: { level: 1, name: 1 } }
  ]);
};

// 静态方法：获取角色统计
roleSchema.statics.getRoleStats = function(villageId) {
  const matchStage = villageId ? { villageId: new mongoose.Types.ObjectId(villageId) } : {};

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRoles: { $sum: 1 },
        activeRoles: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        systemRoles: {
          $sum: { $cond: [{ $eq: ['$isSystem', true] }, 1, 0] }
        },
        customRoles: {
          $sum: { $cond: [{ $eq: ['$isSystem', false] }, 1, 0] }
        },
        totalUsers: { $sum: '$userCount' },
        avgUsersPerRole: { $avg: '$userCount' },
        maxLevel: { $max: '$level' }
      }
    }
  ]);
};

module.exports = mongoose.model('Role', roleSchema);