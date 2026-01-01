/**
 * 村民模型
 */

const mongoose = require('mongoose');

const residentSchema = new mongoose.Schema({
  // 基本身份信息
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    fullName: {
      type: String,
      trim: true,
      maxlength: 100
    }
  },

  // 身份证件信息
  idCard: {
    number: {
      type: String,
      required: true,
      unique: true,
      match: /^\d{17}[\dXx]$/
    },
    type: {
      type: String,
      enum: ['身份证', '户口本', '护照', '军官证', '其他'],
      default: '身份证'
    },
    issueDate: {
      type: Date,
      default: null
    },
    expiryDate: {
      type: Date,
      default: null
    },
    issuingAuthority: {
      type: String,
      trim: true,
      maxlength: 100
    }
  },

  // 个人基本信息
  personal: {
    gender: {
      type: String,
      enum: ['男', '女', '其他'],
      required: true
    },
    birthDate: {
      type: Date,
      required: true
    },
    age: {
      type: Number,
      min: 0,
      max: 150
    },
    ethnicity: {
      type: String,
      trim: true,
      maxlength: 20,
      default: '汉族'
    },
    nationality: {
      type: String,
      trim: true,
      maxlength: 50,
      default: '中国'
    },
    birthPlace: {
      province: String,
      city: String,
      county: String,
      detail: String
    },
    nativePlace: {
      province: String,
      city: String,
      county: String
    }
  },

  // 联系信息
  contact: {
    phone: {
      type: String,
      trim: true,
      match: /^1[3-9]\d{9}$/
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    address: {
      province: String,
      city: String,
      district: String,
      street: String,
      community: String,
      detail: String,
      postalCode: String
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: {
        type: String,
        match: /^1[3-9]\d{9}$/
      }
    }
  },

  // 家庭信息
  family: {
    familyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Family'
    },
    relationship: {
      type: String,
      enum: ['户主', '配偶', '子女', '父母', '祖父母', '孙子女', '兄弟姐妹', '其他', '独居']
    },
    maritalStatus: {
      type: String,
      enum: ['未婚', '已婚', '离异', '丧偶'],
      default: '未婚'
    },
    spouseName: String,
    spouseIdCard: String,
    childrenCount: {
      type: Number,
      min: 0,
      default: 0
    }
  },

  // 教育背景
  education: {
    level: {
      type: String,
      enum: ['文盲', '小学', '初中', '高中', '中专', '大专', '本科', '硕士', '博士'],
      default: '小学'
    },
    school: String,
    major: String,
    graduationDate: Date,
    degree: String
  },

  // 职业信息
  occupation: {
    type: {
      type: String,
      enum: ['务农', '务工', '个体经营', '企业职工', '公务员', '事业单位', '自由职业', '学生', '退休', '无业', '其他']
    },
    employer: String,
    position: String,
    workPlace: String,
    income: {
      type: Number,
      min: 0
    },
    socialSecurity: {
      hasPension: {
        type: Boolean,
        default: false
      },
      hasMedical: {
        type: Boolean,
        default: false
      },
      hasUnemployment: {
        type: Boolean,
        default: false
      }
    }
  },

  // 健康状况
  health: {
    status: {
      type: String,
      enum: ['健康', '亚健康', '慢性病', '残疾', '重病'],
      default: '健康'
    },
    disabilities: [{
      type: {
        type: String,
        enum: ['视力', '听力', '言语', '肢体', '智力', '精神', '多重']
      },
      level: {
        type: String,
        enum: ['一级', '二级', '三级', '四级']
      },
      certificateNo: String
    }],
    chronicDiseases: [String],
    allergies: [String],
    bloodType: {
      type: String,
      enum: ['A', 'B', 'AB', 'O', '未知'],
      default: '未知'
    },
    medicalInsurance: {
      type: String,
      enum: ['城镇职工医保', '城乡居民医保', '新农合', '商业保险', '无', '其他'],
      default: '城乡居民医保'
    }
  },

  // 住房信息
  housing: {
    type: {
      type: String,
      enum: ['自有住房', '租赁住房', '廉租房', '公租房', '其他', '无固定住所'],
      default: '自有住房'
    },
    area: {
      type: Number,
      min: 0
    },
    rooms: {
      type: Number,
      min: 0
    },
    hasBathroom: {
      type: Boolean,
      default: false
    },
    hasKitchen: {
      type: Boolean,
      default: false
    },
    propertyType: {
      type: String,
      enum: ['商品房', '经济适用房', '自建房', '祖传房', '其他'],
      default: '自建房'
    }
  },

  // 特殊标签
  tags: [{
    type: String,
    enum: [
      '低保户',
      '五保户',
      '残疾人',
      '独居老人',
      '留守儿童',
      '退役军人',
      '党员',
      '村干部',
      '重点人群',
      '困难群众',
      '空巢老人',
      '孤寡老人'
    ]
  }],

  // 政府补贴与福利
  benefits: [{
    type: {
      type: String,
      enum: ['低保', '养老金', '残疾人补贴', '医疗救助', '教育补贴', '住房补贴', '其他']
    },
    amount: Number,
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['申请中', '审核中', '已批准', '已发放', '已终止'],
      default: '申请中'
    }
  }],

  // 技能与特长
  skills: [String],
  hobbies: [String],

  // 照片信息
  photos: [{
    type: {
      type: String,
      enum: ['证件照', '生活照', '全家福', '房屋照片', '其他']
    },
    url: String,
    description: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],

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
residentSchema.index({ userId: 1 });
residentSchema.index({ 'idCard.number': 1 });
residentSchema.index({ villageId: 1 });
residentSchema.index({ 'family.familyId': 1 });
residentSchema.index({ 'contact.phone': 1 });
residentSchema.index({ isActive: 1 });
residentSchema.index({ isVerified: 1 });
residentSchema.index({ tags: 1 });
residentSchema.index({ createdAt: -1 });

// 复合索引
residentSchema.index({ villageId: 1, isActive: 1 });
residentSchema.index({ villageId: 1, 'personal.gender': 1 });
residentSchema.index({ villageId: 1, tags: 1 });

// 虚拟字段
residentSchema.virtual('fullName').get(function() {
  return `${this.name.lastName}${this.name.firstName}`;
});

residentSchema.virtual('age').get(function() {
  if (!this.personal.birthDate) return null;
  const today = new Date();
  const birthDate = new Date(this.personal.birthDate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

residentSchema.virtual('address').get(function() {
  const address = this.contact.address;
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

// 中间件：更新时间
residentSchema.pre('save', function(next) {
  this.updatedAt = new Date();

  // 自动计算年龄
  if (this.personal.birthDate) {
    this.personal.age = this.age;
  }

  next();
});

// 中间件：验证身份证号
residentSchema.pre('save', async function(next) {
  if (this.isModified('idCard.number') && this.idCard.number) {
    // 验证身份证号格式
    if (!validateIdCard(this.idCard.number)) {
      return next(new Error('身份证号格式不正确'));
    }

    // 检查身份证号唯一性
    const existing = await this.constructor.findOne({
      'idCard.number': this.idCard.number,
      _id: { $ne: this._id }
    });

    if (existing) {
      return next(new Error('身份证号已存在'));
    }
  }
  next();
});

// 实例方法：验证身份证号
residentSchema.methods.verifyIdCard = function() {
  return validateIdCard(this.idCard.number);
};

// 实例方法：获取完整地址
residentSchema.methods.getFullAddress = function() {
  return this.address;
};

// 实例方法：添加标签
residentSchema.methods.addTag = function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
    return this.save();
  }
  return Promise.resolve(this);
};

// 实例方法：移除标签
residentSchema.methods.removeTag = function(tag) {
  const index = this.tags.indexOf(tag);
  if (index > -1) {
    this.tags.splice(index, 1);
    return this.save();
  }
  return Promise.resolve(this);
};

// 实例方法：添加福利
residentSchema.methods.addBenefit = function(benefit) {
  this.benefits.push({
    ...benefit,
    startDate: benefit.startDate || new Date(),
    status: benefit.status || '申请中'
  });
  return this.save();
};

// 实例方法：更新福利状态
residentSchema.methods.updateBenefitStatus = function(benefitId, status, updatedBy) {
  const benefit = this.benefits.id(benefitId);
  if (benefit) {
    benefit.status = status;
    if (updatedBy) {
      benefit.updatedBy = updatedBy;
    }
    return this.save();
  }
  return Promise.reject(new Error('福利记录不存在'));
};

// 静态方法：根据身份证号查找
residentSchema.statics.findByIdCard = function(idCardNumber) {
  return this.findOne({ 'idCard.number': idCardNumber });
};

// 静态方法：根据手机号查找
residentSchema.statics.findByPhone = function(phone) {
  return this.findOne({ 'contact.phone': phone });
};

// 静态方法：根据标签查找
residentSchema.statics.findByTag = function(tag, villageId) {
  const query = { tags: tag };
  if (villageId) {
    query.villageId = villageId;
  }
  return this.find(query);
};

// 静态方法：搜索村民
residentSchema.statics.searchResidents = function(villageId, keyword, filters = {}) {
  const query = {
    villageId: new mongoose.Types.ObjectId(villageId),
    isActive: true
  };

  if (keyword) {
    query.$or = [
      { 'name.firstName': { $regex: keyword, $options: 'i' } },
      { 'name.lastName': { $regex: keyword, $options: 'i' } },
      { 'name.fullName': { $regex: keyword, $options: 'i' } },
      { 'idCard.number': { $regex: keyword, $options: 'i' } },
      { 'contact.phone': { $regex: keyword, $options: 'i' } },
      { 'contact.address.detail': { $regex: keyword, $options: 'i' } }
    ];
  }

  // 应用过滤条件
  if (filters.gender) {
    query['personal.gender'] = filters.gender;
  }
  if (filters.minAge) {
    query['personal.age'] = { $gte: filters.minAge };
  }
  if (filters.maxAge) {
    query['personal.age'] = query['personal.age'] || {};
    query['personal.age'].$lte = filters.maxAge;
  }
  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }
  if (filters.educationLevel) {
    query['education.level'] = filters.educationLevel;
  }
  if (filters.occupationType) {
    query['occupation.type'] = filters.occupationType;
  }

  return this.find(query).populate('userId', 'username email').populate('family.familyId');
};

// 静态方法：获取统计数据
residentSchema.statics.getResidentStats = function(villageId) {
  const matchStage = villageId ? { villageId: new mongoose.Types.ObjectId(villageId) } : {};

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalResidents: { $sum: 1 },
        activeResidents: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        verifiedResidents: {
          $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] }
        },
        maleCount: {
          $sum: { $cond: [{ $eq: ['$personal.gender', '男'] }, 1, 0] }
        },
        femaleCount: {
          $sum: { $cond: [{ $eq: ['$personal.gender', '女'] }, 1, 0] }
        },
        averageAge: { $avg: '$personal.age' },
        educationStats: {
          $push: '$education.level'
        },
        occupationStats: {
          $push: '$occupation.type'
        },
        tagStats: {
          $push: '$tags'
        }
      }
    },
    {
      $addFields: {
        genderRatio: {
          $multiply: [
            { $divide: ['$maleCount', { $add: ['$maleCount', '$femaleCount'] }] },
            100
          ]
        }
      }
    }
  ]);
};

// 静态方法：年龄分布统计
residentSchema.statics.getAgeDistribution = function(villageId) {
  const matchStage = villageId ? { villageId: new mongoose.Types.ObjectId(villageId) } : {};

  return this.aggregate([
    { $match: matchStage },
    {
      $bucket: {
        groupBy: '$personal.age',
        boundaries: [0, 18, 30, 45, 60, 120],
        default: 'other',
        output: {
          count: { $sum: 1 },
          residents: { $push: { name: '$name', age: '$personal.age' } }
        }
      }
    },
    {
      $project: {
        range: {
          $switch: {
            branches: [
              { case: { $eq: ['$_id', 0] }, then: '0-18岁' },
              { case: { $eq: ['$_id', 18] }, then: '18-30岁' },
              { case: { $eq: ['$_id', 30] }, then: '30-45岁' },
              { case: { $eq: ['$_id', 45] }, then: '45-60岁' },
              { case: { $eq: ['$_id', 60] }, then: '60岁以上' }
            ],
            default: '其他'
          }
        },
        count: 1,
        residents: 1
      }
    }
  ]);
};

// 验证身份证号的工具函数
function validateIdCard(idCard) {
  if (!idCard || idCard.length !== 18) {
    return false;
  }

  // 简单验证前17位是否为数字
  if (!/^\d{17}[\dXx]$/.test(idCard)) {
    return false;
  }

  // 这里可以添加更复杂的身份证验证逻辑
  return true;
}

module.exports = mongoose.model('Resident', residentSchema);