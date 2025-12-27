/**
 * 家庭模型
 */

const mongoose = require('mongoose');

const familySchema = new mongoose.Schema({
  // 基本信息
  familyName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  familyCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 50
  },
  familyType: {
    type: String,
    enum: ['核心家庭', '主干家庭', '联合家庭', '单亲家庭', '丁克家庭', '空巢家庭', '独居', '其他'],
    default: '核心家庭'
  },

  // 户主信息
  headOfHousehold: {
    residentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resident',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    idCard: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true,
      match: /^1[3-9]\d{9}$/
    }
  },

  // 家庭成员
  members: [{
    residentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resident',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    relationship: {
      type: String,
      required: true,
      enum: ['户主', '配偶', '子女', '父母', '祖父母', '孙子女', '兄弟姐妹', '儿媳', '女婿', '其他亲属', '非亲属']
    },
    idCard: {
      type: String,
      required: true
    },
    gender: {
      type: String,
      enum: ['男', '女'],
      required: true
    },
    birthDate: {
      type: Date,
      required: true
    },
    isRegistered: {
      type: Boolean,
      default: true
    },
    registeredDate: {
      type: Date,
      default: Date.now
    },
    moveOutDate: {
      type: Date,
      default: null
    },
    moveOutReason: {
      type: String,
      trim: true,
      maxlength: 200
    }
  }],

  // 户籍信息
  household: {
    type: {
      type: String,
      enum: ['农业户口', '非农业户口', '居民户口'],
      default: '居民户口'
    },
    registrationPlace: {
      province: String,
      city: String,
      county: String,
      street: String,
      community: String,
      detail: String
    },
    registrationDate: {
      type: Date,
      default: Date.now
    },
    householderRelationship: {
      type: String,
      enum: ['户主本人', '配偶', '子女', '父母', '其他'],
      default: '户主本人'
    }
  },

  // 住房信息
  housing: {
    address: {
      province: String,
      city: String,
      district: String,
      street: String,
      community: String,
      detail: String,
      postalCode: String
    },
    propertyType: {
      type: String,
      enum: ['商品房', '经济适用房', '廉租房', '公租房', '自建房', '祖传房', '租赁房', '其他'],
      default: '自建房'
    },
    ownership: {
      type: String,
      enum: ['自有', '租赁', '借住', '集体产权', '其他'],
      default: '自有'
    },
    area: {
      type: Number,
      min: 0
    },
    rooms: {
      type: Number,
      min: 0
    },
    buildingYear: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear()
    },
    hasBathroom: {
      type: Boolean,
      default: false
    },
    hasKitchen: {
      type: Boolean,
      default: false
    },
    hasRunningWater: {
      type: Boolean,
      default: true
    },
    hasElectricity: {
      type: Boolean,
      default: true
    },
    hasGas: {
      type: Boolean,
      default: false
    },
    hasInternet: {
      type: Boolean,
      default: false
    }
  },

  // 经济状况
  economics: {
    annualIncome: {
      type: Number,
      min: 0,
      default: 0
    },
    incomeSource: [{
      type: {
        type: String,
        enum: ['农业', '务工', '经商', '工资', '养老金', '补贴', '其他']
      },
      amount: Number,
      description: String
    }],
    mainExpenditure: [{
      type: {
        type: String,
        enum: ['生活开支', '教育', '医疗', '住房', '农业生产', '其他']
      },
      amount: Number,
      description: String
    }],
    assets: [{
      type: {
        type: String,
        enum: ['房屋', '土地', '车辆', '存款', '投资', '其他']
      },
      description: String,
      estimatedValue: Number
    }],
    povertyLevel: {
      type: String,
      enum: ['非贫困户', '低保户', '建档立卡户', '低收入户', '其他困难户'],
      default: '非贫困户'
    }
  },

  // 特殊情况
  specialConditions: [{
    type: {
      type: String,
      enum: ['低保家庭', '五保家庭', '残疾家庭', '军人家庭', '烈属家庭', '留守儿童家庭', '空巢老人家庭', '单亲家庭', '其他']
    },
    description: String,
    affectedMembers: [{
      residentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resident'
      },
      name: String,
      condition: String
    }]
  }],

  // 政府支持
  governmentSupport: [{
    type: {
      type: String,
      enum: ['低保', '养老保险', '医疗保险', '教育资助', '住房补贴', '就业培训', '扶贫项目', '其他']
    },
    amount: Number,
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['申请中', '审核中', '已批准', '已发放', '已终止'],
      default: '申请中'
    },
    issuingAgency: String
  }],

  // 家庭成员变动记录
  changes: [{
    type: {
      type: String,
      enum: ['新增成员', '成员迁出', '成员去世', '结婚', '离婚', '分户', '并户', '其他']
    },
    description: String,
    affectedMember: {
      name: String,
      idCard: String
    },
    changeDate: {
      type: Date,
      default: Date.now
    },
    reason: String,
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // 照片资料
  photos: [{
    type: {
      type: String,
      enum: ['全家福', '房屋照片', '户口本照片', '身份证照片', '其他']
    },
    url: String,
    description: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],

  // 联系信息
  contact: {
    primaryPhone: {
      type: String,
      trim: true,
      match: /^1[3-9]\d{9}$/
    },
    secondaryPhone: {
      type: String,
      trim: true,
      match: /^1[3-9]\d{9}$/
    },
    address: String,
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    }
  },

  // 备注信息
  notes: {
    type: String,
    maxlength: 1000
  },

  // 系统字段
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
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
  },
  lastVerifiedAt: {
    type: Date,
    default: null
  },
  verifiedBy: {
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
  },
  toObject: { virtuals: true }
});

// 索引
familySchema.index({ familyCode: 1 });
familySchema.index({ villageId: 1 });
familySchema.index({ 'headOfHousehold.residentId': 1 });
familySchema.index({ 'members.residentId': 1 });
familySchema.index({ isActive: 1 });
familySchema.index({ isVerified: 1 });
familySchema.index({ familyType: 1 });
familySchema.index({ 'specialConditions.type': 1 });
familySchema.index({ createdAt: -1 });

// 复合索引
familySchema.index({ villageId: 1, isActive: 1 });
familySchema.index({ villageId: 1, familyType: 1 });

// 虚拟字段
familySchema.virtual('memberCount').get(function() {
  return this.members.filter(member => member.isRegistered).length;
});

familySchema.virtual('currentMembers').get(function() {
  return this.members.filter(member =>
    member.isRegistered &&
    (member.moveOutDate === null || member.moveOutDate > new Date())
  );
});

familySchema.virtual('fullAddress').get(function() {
  const address = this.housing.address;
  if (!address) return null;

  let fullAddress = '';
  if (address.province) fullAddress += address.province;
  if (address.city) fullAddress += address.city;
  if (address.district) fullAddress += address.district;
  if (address.street) fullAddress += address.street;
  if (address.community) fullAddress += address.community;
  if (address.detail) fullAddress += address.detail;

  return fullAddress;
});

familySchema.virtual('totalAnnualIncome').get(function() {
  return this.economics.incomeSource.reduce((total, source) => {
    return total + (source.amount || 0);
  }, 0);
});

// 中间件：更新时间
familySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 中间件：验证家庭成员唯一性
familySchema.pre('save', async function(next) {
  if (this.isModified('members')) {
    const residentIds = this.members.map(member => member.residentId.toString());
    const uniqueIds = [...new Set(residentIds)];

    if (residentIds.length !== uniqueIds.length) {
      return next(new Error('家庭成员不能重复'));
    }
  }
  next();
});

// 实例方法：添加家庭成员
familySchema.methods.addMember = function(memberData) {
  const existingMember = this.members.find(
    member => member.residentId.toString() === memberData.residentId.toString()
  );

  if (existingMember) {
    if (!existingMember.isRegistered) {
      // 重新激活已迁出的成员
      existingMember.isRegistered = true;
      existingMember.registeredDate = new Date();
      existingMember.moveOutDate = null;
      existingMember.moveOutReason = null;
      return this.save();
    } else {
      throw new Error('该成员已在家庭中');
    }
  }

  this.members.push({
    ...memberData,
    isRegistered: true,
    registeredDate: new Date()
  });

  // 记录变动
  this.changes.push({
    type: '新增成员',
    description: `新增家庭成员：${memberData.name}`,
    affectedMember: {
      name: memberData.name,
      idCard: memberData.idCard
    }
  });

  return this.save();
};

// 实例方法：移除家庭成员
familySchema.methods.removeMember = function(residentId, reason) {
  const memberIndex = this.members.findIndex(
    member => member.residentId.toString() === residentId.toString()
  );

  if (memberIndex === -1) {
    throw new Error('家庭成员不存在');
  }

  const member = this.members[memberIndex];
  member.isRegistered = false;
  member.moveOutDate = new Date();
  member.moveOutReason = reason;

  // 记录变动
  this.changes.push({
    type: '成员迁出',
    description: `家庭成员迁出：${member.name}，原因：${reason}`,
    affectedMember: {
      name: member.name,
      idCard: member.idCard
    }
  });

  return this.save();
};

// 实例方法：更新成员信息
familySchema.methods.updateMember = function(residentId, updateData) {
  const member = this.members.find(
    member => member.residentId.toString() === residentId.toString()
  );

  if (!member) {
    throw new Error('家庭成员不存在');
  }

  Object.assign(member, updateData);

  this.changes.push({
    type: '其他',
    description: `更新成员信息：${member.name}`,
    affectedMember: {
      name: member.name,
      idCard: member.idCard
    }
  });

  return this.save();
};

// 实例方法：添加政府支持
familySchema.methods.addGovernmentSupport = function(supportData) {
  this.governmentSupport.push({
    ...supportData,
    startDate: supportData.startDate || new Date(),
    status: supportData.status || '申请中'
  });

  return this.save();
};

// 实例方法：更新政府支持状态
familySchema.methods.updateSupportStatus = function(supportId, status, updatedBy) {
  const support = this.governmentSupport.id(supportId);
  if (support) {
    support.status = status;
    if (updatedBy) {
      support.updatedBy = updatedBy;
    }
    return this.save();
  }
  throw new Error('政府支持记录不存在');
};

// 实例方法：获取特殊条件
familySchema.methods.getSpecialConditions = function() {
  return this.specialConditions.map(condition => ({
    type: condition.type,
    description: condition.description,
    affectedCount: condition.affectedMembers.length,
    affectedMembers: condition.affectedMembers
  }));
};

// 静态方法：根据家庭编码查找
familySchema.statics.findByFamilyCode = function(familyCode) {
  return this.findOne({ familyCode });
};

// 静态方法：根据户主查找
familySchema.statics.findByHeadOfHousehold = function(residentId) {
  return this.findOne({ 'headOfHousehold.residentId': residentId });
};

// 静态方法：根据成员查找
familySchema.statics.findByMember = function(residentId) {
  return this.findOne({
    'members.residentId': residentId,
    'members.isRegistered': true
  });
};

// 静态方法：获取家庭统计
familySchema.statics.getFamilyStats = function(villageId) {
  const matchStage = villageId ? { villageId: new mongoose.Types.ObjectId(villageId) } : {};

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalFamilies: { $sum: 1 },
        activeFamilies: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        verifiedFamilies: {
          $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] }
        },
        familyTypeStats: {
          $push: '$familyType'
        },
        averageMembers: { $avg: { $size: '$members' } },
        totalMembers: { $sum: { $size: '$members' } },
        averageIncome: { $avg: '$economics.annualIncome' },
        povertyFamilies: {
          $sum: { $cond: [{ $ne: ['$economics.povertyLevel', '非贫困户'] }, 1, 0] }
        },
        housingStats: {
          $push: '$housing.propertyType'
        }
      }
    }
  ]);
};

// 静态方法：家庭类型分布
familySchema.statics.getFamilyTypeDistribution = function(villageId) {
  const matchStage = villageId ? { villageId: new mongoose.Types.ObjectId(villageId) } : {};

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$familyType',
        count: { $sum: 1 },
        totalMembers: { $sum: { $size: '$members' } },
        averageIncome: { $avg: '$economics.annualIncome' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// 静态方法：收入分布统计
familySchema.statics.getIncomeDistribution = function(villageId) {
  const matchStage = villageId ? { villageId: new mongoose.Types.ObjectId(villageId) } : {};

  return this.aggregate([
    { $match: matchStage },
    {
      $bucket: {
        groupBy: '$economics.annualIncome',
        boundaries: [0, 10000, 30000, 50000, 100000, Number.MAX_SAFE_INTEGER],
        default: 'high',
        output: {
          count: { $sum: 1 },
          families: { $push: { familyName: '$familyName', income: '$economics.annualIncome' } }
        }
      }
    },
    {
      $project: {
        range: {
          $switch: {
            branches: [
              { case: { $eq: ['$_id', 0] }, then: '1万以下' },
              { case: { $eq: ['$_id', 10000] }, then: '1-3万' },
              { case: { $eq: ['$_id', 30000] }, then: '3-5万' },
              { case: { $eq: ['$_id', 50000] }, then: '5-10万' },
              { case: { $eq: ['$_id', 100000] }, then: '10万以上' }
            ],
            default: '其他'
          }
        },
        count: 1,
        families: 1
      }
    }
  ]);
};

module.exports = mongoose.model('Family', familySchema);