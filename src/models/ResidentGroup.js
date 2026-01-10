/**
 * ResidentGroup.js - 村民分组模型
 *
 * 管理村民分组（如独居老人、低保户、党员等）
 * 支持人口主任进行分组管理和定向关怀
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * 村民分组Schema
 */
const residentGroupSchema = new Schema({
  // 分组名称
  groupName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },

  // 村庄ID
  villageId: {
    type: Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 分组类型
  groupType: {
    type: String,
    enum: ['special_care', 'dynamic_monitoring', 'party_member',
      'volunteer', 'grid_responsibility', 'custom'],
    required: true,
    index: true
  },

  // 分组类型名称
  groupTypeName: {
    type: String,
    required: true
  },

  // 分组成员（用户ID列表）
  members: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }],

  // 分组负责人
  managerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  managerName: {
    type: String,
    default: null
  },

  // 标签（用于分类和搜索）
  tags: [{
    type: String,
    trim: true
  }],

  // 统计信息
  statistics: {
    totalMembers: {
      type: Number,
      default: 0
    },
    activeMembers: {
      type: Number,
      default: 0
    }
  },

  // 分组规则（用于自动分组）
  rules: {
    autoAssign: {
      type: Boolean,
      default: false
    },
    conditions: [{
      field: String,      // 字段名（如 age, isPartyMember）
      operator: String,   // 操作符（如 gt, eq, in）
      value: Schema.Types.Mixed  // 值
    }]
  },

  // 关怀计划（用于特殊关怀组）
  carePlan: {
    enabled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly'],
      default: 'monthly'
    },
    tasks: [{
      taskName: String,
      description: String,
      assignedTo: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      dueDate: Date,
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed'],
        default: 'pending'
      }
    }]
  },

  // 备注
  description: {
    type: String,
    default: null
  },

  // 颜色标识（用于前端显示）
  color: {
    type: String,
    default: '#409EFF'
  },

  // 图标
  icon: {
    type: String,
    default: null
  },

  // 排序序号
  sortOrder: {
    type: Number,
    default: 0
  },

  // 状态
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

// 复合索引：村庄 + 状态 + 类型
residentGroupSchema.index({ villageId: 1, status: 1, groupType: 1 });

// 复合索引：村庄 + 排序
residentGroupSchema.index({ villageId: 1, sortOrder: 1 });

// ==================== 虚拟字段 ====================

// 虚拟字段：成员完整信息
residentGroupSchema.virtual('memberDetails').get(function() {
  return this.populate('members');
});

// ==================== 实例方法 ====================

/**
 * 添加成员
 * @param {string|string[]} userIds - 用户ID或用户ID数组
 * @returns {Promise<Document>}
 */
residentGroupSchema.methods.addMembers = async function(userIds) {
  const idArray = Array.isArray(userIds) ? userIds : [userIds];

  // 去重
  const newMembers = idArray.filter(id => !this.members.includes(id));
  this.members.push(...newMembers);

  // 更新统计
  this.statistics.totalMembers = this.members.length;
  this.statistics.activeMembers = this.members.length;

  return this.save();
};

/**
 * 移除成员
 * @param {string|string[]} userIds - 用户ID或用户ID数组
 * @returns {Promise<Document>}
 */
residentGroupSchema.methods.removeMembers = async function(userIds) {
  const idArray = Array.isArray(userIds) ? userIds : [userIds];

  this.members = this.members.filter(id => !idArray.includes(id));

  // 更新统计
  this.statistics.totalMembers = this.members.length;
  this.statistics.activeMembers = this.members.length;

  return this.save();
};

/**
 * 检查用户是否在分组中
 * @param {string} userId - 用户ID
 * @returns {boolean}
 */
residentGroupSchema.methods.hasMember = function(userId) {
  return this.members.some(id => id.toString() === userId.toString());
};

/**
 * 设置负责人
 * @param {string} managerId - 负责人ID
 * @returns {Promise<Document>}
 */
residentGroupSchema.methods.setManager = async function(managerId) {
  this.managerId = managerId;

  // 获取负责人姓名
  const User = mongoose.model('User');
  const manager = await User.findById(managerId);
  if (manager) {
    this.managerName = manager.name;
  }

  return this.save();
};

/**
 * 添加标签
 * @param {string|string[]} tags - 标签或标签数组
 * @returns {Promise<Document>}
 */
residentGroupSchema.methods.addTags = function(tags) {
  const tagArray = Array.isArray(tags) ? tags : [tags];
  this.tags = [...new Set([...this.tags, ...tagArray])];
  return this.save();
};

/**
 * 移除标签
 * @param {string|string[]} tags - 标签或标签数组
 * @returns {Promise<Document>}
 */
residentGroupSchema.methods.removeTags = function(tags) {
  const tagArray = Array.isArray(tags) ? tags : [tags];
  this.tags = this.tags.filter(tag => !tagArray.includes(tag));
  return this.save();
};

/**
 * 创建关怀任务
 * @param {Object} taskData - 任务数据
 * @returns {Promise<Document>}
 */
residentGroupSchema.methods.createCareTask = function(taskData) {
  if (!this.carePlan.enabled) {
    this.carePlan.enabled = true;
  }

  this.carePlan.tasks.push({
    ...taskData,
    status: 'pending'
  });

  return this.save();
};

/**
 * 激活分组
 * @returns {Promise<Document>}
 */
residentGroupSchema.methods.activate = function() {
  this.status = 'active';
  return this.save();
};

/**
 * 停用分组
 * @returns {Promise<Document>}
 */
residentGroupSchema.methods.deactivate = function() {
  this.status = 'inactive';
  return this.save();
};

/**
 * 应用分组规则（自动分配成员）
 * @returns {Promise<Object>}
 */
residentGroupSchema.methods.applyRules = async function() {
  if (!this.rules.autoAssign || !this.rules.conditions || this.rules.conditions.length === 0) {
    return { added: 0, removed: 0 };
  }

  const User = mongoose.model('User');
  const Resident = mongoose.model('Resident');

  // 构建查询条件
  const query = { villageId: this.villageId };
  this.rules.conditions.forEach(cond => {
    if (!query.$and) query.$and = [];

    const condQuery = {};
    switch (cond.operator) {
    case 'gt':
      condQuery[cond.field] = { $gt: cond.value };
      break;
    case 'gte':
      condQuery[cond.field] = { $gte: cond.value };
      break;
    case 'lt':
      condQuery[cond.field] = { $lt: cond.value };
      break;
    case 'lte':
      condQuery[cond.field] = { $lte: cond.value };
      break;
    case 'eq':
      condQuery[cond.field] = cond.value;
      break;
    case 'ne':
      condQuery[cond.field] = { $ne: cond.value };
      break;
    case 'in':
      condQuery[cond.field] = { $in: cond.value };
      break;
    case 'nin':
      condQuery[cond.field] = { $nin: cond.value };
      break;
    }
    query.$and.push(condQuery);
  });

  // 查找符合条件的用户
  const eligibleUsers = await Resident.find(query).distinct('userId');
  const eligibleUserIds = eligibleUsers.map(id => id.toString());

  // 计算需要添加和移除的成员
  const currentMemberIds = this.members.map(id => id.toString());
  const toAdd = eligibleUserIds.filter(id => !currentMemberIds.includes(id));
  const toRemove = currentMemberIds.filter(id => !eligibleUserIds.includes(id));

  // 执行添加和移除
  if (toAdd.length > 0) {
    await this.addMembers(toAdd);
  }
  if (toRemove.length > 0) {
    await this.removeMembers(toRemove);
  }

  return { added: toAdd.length, removed: toRemove.length };
};

// ==================== 静态方法 ====================

/**
 * 获取村庄的所有分组
 * @param {string} villageId - 村庄ID
 * @param {Object} options - 查询选项
 * @returns {Promise<Document[]>}
 */
residentGroupSchema.statics.getVillageGroups = function(villageId, options = {}) {
  const {
    groupType,
    status = 'active',
    includeMembers = false
  } = options;

  const query = { villageId, status };
  if (groupType) {
    query.groupType = groupType;
  }

  let queryBuilder = this.find(query).sort({ sortOrder: 1, createdAt: -1 });

  if (includeMembers) {
    queryBuilder = queryBuilder.populate('members', 'name phone idCard');
  }

  return queryBuilder.populate('managerId', 'name phone');
};

/**
 * 根据类型获取分组
 * @param {string} villageId - 村庄ID
 * @param {string} groupType - 分组类型
 * @returns {Promise<Document[]>}
 */
residentGroupSchema.statics.getByType = function(villageId, groupType) {
  return this.find({
    villageId,
    groupType,
    status: 'active'
  }).sort({ sortOrder: 1 });
};

/**
 * 获取用户所在的所有分组
 * @param {string} userId - 用户ID
 * @param {string} villageId - 村庄ID
 * @returns {Promise<Document[]>}
 */
residentGroupSchema.statics.getUserGroups = function(userId, villageId) {
  return this.find({
    villageId,
    members: userId,
    status: 'active'
  }).populate('managerId', 'name phone');
};

/**
 * 获取默认分组模板
 * @returns {Array}
 */
residentGroupSchema.statics.getDefaultGroupTemplates = function() {
  return [
    {
      groupName: '独居老人关爱组',
      groupType: 'special_care',
      groupTypeName: '特殊关怀',
      tags: ['老人', '独居', '定期走访'],
      color: '#F56C6C',
      icon: 'elderly',
      carePlan: {
        enabled: true,
        frequency: 'weekly',
        tasks: [
          { taskName: '健康检查', description: '每周测量血压血糖' },
          { taskName: '生活慰问', description: '询问生活需求' }
        ]
      },
      sortOrder: 1
    },
    {
      groupName: '低保户',
      groupType: 'special_care',
      groupTypeName: '特殊关怀',
      tags: ['低保', '困难补助'],
      color: '#E6A23C',
      icon: 'welfare',
      carePlan: {
        enabled: true,
        frequency: 'monthly',
        tasks: [
          { taskName: '政策宣传', description: '告知最新帮扶政策' }
        ]
      },
      sortOrder: 2
    },
    {
      groupName: '党员',
      groupType: 'party_member',
      groupTypeName: '党员',
      tags: ['党员', '党支部'],
      color: '#F56C6C',
      icon: 'star',
      sortOrder: 3
    },
    {
      groupName: '动态监测户',
      groupType: 'dynamic_monitoring',
      groupTypeName: '动态监测',
      tags: ['监测', '防返贫'],
      color: '#909399',
      icon: 'monitor',
      carePlan: {
        enabled: true,
        frequency: 'monthly',
        tasks: [
          { taskName: '收入监测', description: '记录家庭收入变化' }
        ]
      },
      sortOrder: 4
    },
    {
      groupName: '志愿者服务队',
      groupType: 'volunteer',
      groupTypeName: '志愿者',
      tags: ['志愿者', '公益'],
      color: '#67C23A',
      icon: 'volunteer',
      sortOrder: 5
    },
    {
      groupName: '网格员',
      groupType: 'grid_responsibility',
      groupTypeName: '网格责任',
      tags: ['网格', '责任区'],
      color: '#409EFF',
      icon: 'grid',
      sortOrder: 6
    }
  ];
};

/**
 * 初始化村庄默认分组
 * @param {string} villageId - 村庄ID
 * @param {string} creatorId - 创建人ID
 * @returns {Promise<Document[]>}
 */
residentGroupSchema.statics.initDefaultGroups = async function(villageId, creatorId) {
  const templates = this.getDefaultGroupTemplates();

  const groups = templates.map(template => ({
    ...template,
    villageId,
    metadata: {
      createdBy: creatorId,
      updatedBy: creatorId
    }
  }));

  return this.insertMany(groups);
};

/**
 * 批量创建分组
 * @param {Array} groups - 分组数据数组
 * @returns {Promise<Object>}
 */
residentGroupSchema.statics.batchCreate = async function(groups) {
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  for (const group of groups) {
    try {
      await this.create(group);
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        data: group,
        error: error.message
      });
    }
  }

  return results;
};

// ==================== 中间件 ====================

// 保存前验证
residentGroupSchema.pre('save', function(next) {
  // 自动设置分组类型名称
  if (!this.groupTypeName) {
    const typeNames = {
      special_care: '特殊关怀',
      dynamic_monitoring: '动态监测',
      party_member: '党员',
      volunteer: '志愿者',
      grid_responsibility: '网格责任',
      custom: '自定义'
    };
    this.groupTypeName = typeNames[this.groupType] || '自定义';
  }

  // 更新统计信息
  if (this.isModified('members')) {
    this.statistics.totalMembers = this.members.length;
    this.statistics.activeMembers = this.members.length;
  }

  next();
});

module.exports = mongoose.model('ResidentGroup', residentGroupSchema);
