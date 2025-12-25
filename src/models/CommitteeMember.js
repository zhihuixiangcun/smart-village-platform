/**
 * 村委成员数据模型
 * 用于管理村委人员信息、职务、党员信息及权限
 */

const mongoose = require('mongoose');
const { encryptData, decryptData } = require('../utils/encryption');

const committeeMemberSchema = new mongoose.Schema({
  // 基本信息
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  idCard: {
    type: String,
    required: true,
    unique: true,
    set: function(value) {
      // 存储时加密
      if (value && !value.startsWith('encrypted:')) {
        return `encrypted:${encryptData(value)}`;
      }
      return value;
    }
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^1[3-9]\d{9}$/.test(v);
      },
      message: '手机号格式不正确'
    }
  },
  photo: {
    type: String,
    default: null
  },

  // 职务信息
  position: {
    current: {
      type: String,
      enum: [
        'village_secretary',      // 村支书
        'village_head',           // 村主任
        'accountant',             // 会计
        'population_admin',       // 人口主任
        'party_secretary',        // 党支部书记
        'vice_secretary',         // 副书记
        'committee_member'        // 村委成员
      ],
      required: true
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    appointmentDoc: {
      type: String,  // 任命文件URL
      default: null
    },
    history: [{
      position: String,
      startDate: Date,
      endDate: Date,
      reason: String,
      proofDoc: String
    }]
  },

  // 党员信息
  partyMember: {
    isMember: {
      type: Boolean,
      default: false
    },
    joinDate: {
      type: Date,
      default: null
    },
    membershipNumber: {
      type: String,
      default: null
    }
  },

  // 权限角色
  roles: [{
    type: {
      type: String,
      enum: [
        'secretary',        // 村支书（全部权限）
        'accountant',       // 会计（财务权限）
        'population_admin', // 人口主任（人口数据权限）
        'member'           // 普通成员（基础权限）
      ],
      required: true
    },
    villageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Village',
      required: true
    },
    permissions: [{
      type: String
      // 权限列表: residents, finance, announcements, committee,
    }],
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    grantedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 用户关联
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // 状态
  status: {
    type: String,
    enum: ['active', 'inactive', 'transferred', 'resigned'],
    default: 'active',
    index: true
  },
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 教育背景
  education: {
    degree: String,
    major: String,
    school: String,
    graduationYear: Number
  },

  // 工作经历
  workExperience: [{
    organization: String,
    position: String,
    startDate: Date,
    endDate: Date,
    isCurrent: Boolean
  }],

  // 家庭成员（利益冲突申报）
  familyMembers: [{
    name: String,
    relationship: String,
    idCard: String,
    phone: String
  }],

  // 联系方式
  contact: {
    wechat: String,
    email: String,
    address: String,
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    }
  },

  // 绩效考核
  performance: {
    annualRating: [{
      year: Number,
      rating: String,  // excellent/good/qualified/unqualified
      assessor: String,
      comments: String
    }]
  },

  // 元数据
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastLoginAt: Date,
    loginCount: {
      type: Number,
      default: 0
    }
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
committeeMemberSchema.index({ villageId: 1, status: 1 });
committeeMemberSchema.index({ 'position.current': 1 });
committeeMemberSchema.index({ 'roles.type': 1 });
committeeMemberSchema.index({ createdAt: -1 });

// 虚拟字段：获取脱敏的身份证号
committeeMemberSchema.virtual('maskedIdCard').get(function() {
  if (this.idCard && this.idCard.startsWith('encrypted:')) {
    const decrypted = decryptData(this.idCard.replace('encrypted:', ''));
    return decrypted.replace(/^(.{6})(.*)(.{4})$/, '$1********$3');
  }
  return '**************';
});

// 虚拟字段：获取脱敏的手机号
committeeMemberSchema.virtual('maskedPhone').get(function() {
  if (this.phone) {
    return this.phone.replace(/^(.{3})(.*)(.{4})$/, '$1****$3');
  }
  return null;
});

// 实例方法：获取完整身份证号（需权限）
committeeMemberSchema.methods.getFullIdCard = function() {
  if (this.idCard && this.idCard.startsWith('encrypted:')) {
    return decryptData(this.idCard.replace('encrypted:', ''));
  }
  return this.idCard;
};

// 实例方法：检查权限
committeeMemberSchema.methods.hasPermission = function(permission) {
  return this.roles.some(role =>
    role.permissions.includes(permission) || role.permissions.includes('all')
  );
};

// 实例方法：变更职务
committeeMemberSchema.methods.changePosition = function(newPosition, reason, proofDoc) {
  // 保存历史
  this.position.history.push({
    position: this.position.current,
    startDate: this.position.startDate,
    endDate: new Date(),
    reason,
    proofDoc
  });

  // 更新当前职务
  this.position.current = newPosition;
  this.position.startDate = new Date();
  if (proofDoc) {
    this.position.appointmentDoc = proofDoc;
  }

  return this.save();
};

// 实例方法：添加角色权限
committeeMemberSchema.methods.addRole = function(roleData) {
  this.roles.push({
    ...roleData,
    grantedAt: new Date()
  });
  return this.save();
};

// 实例方法：移除角色权限
committeeMemberSchema.methods.removeRole = function(roleType, villageId) {
  this.roles = this.roles.filter(role =>
    !(role.type === roleType && role.villageId.toString() === villageId.toString())
  );
  return this.save();
};

// 静态方法：根据村庄查询在职成员
committeeMemberSchema.statics.findActiveMembers = function(villageId) {
  return this.find({
    villageId,
    status: 'active'
  }).populate('userId', 'username email');
};

// 静态方法：查询党员成员
committeeMemberSchema.statics.findPartyMembers = function(villageId) {
  return this.find({
    villageId,
    'partyMember.isMember': true,
    status: 'active'
  });
};

// 静态方法：根据职务查询
committeeMemberSchema.statics.findByPosition = function(villageId, position) {
  return this.find({
    villageId,
    'position.current': position,
    status: 'active'
  });
};

// 静态方法：村委统计
committeeMemberSchema.statics.getStatistics = function(villageId) {
  return this.aggregate([
    {
      $match: { villageId: mongoose.Types.ObjectId(villageId) }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// 静态方法：导出数据（需审计）
committeeMemberSchema.statics.exportData = async function(villageId, operatorId) {
  const AuditLog = mongoose.model('CommitteeAuditLog');

  const members = await this.find({ villageId })
    .select('-idCard') // 不导出完整身份证
    .lean();

  // 记录导出操作
  await AuditLog.create({
    operatorId,
    villageId,
    action: 'export',
    resourceType: 'committee_members',
    details: {
      count: members.length,
      exportType: 'full'
    },
    timestamp: new Date()
  });

  return members;
};

// 中间件：保存前记录操作日志
committeeMemberSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.metadata.updatedBy = this.metadata.updatedBy || this.metadata.createdBy;
  }
  next();
});

module.exports = mongoose.model('CommitteeMember', committeeMemberSchema);
