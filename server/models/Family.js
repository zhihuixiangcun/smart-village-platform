/**
 * Family Model
 * 家庭档案数据模型
 *
 * 功能说明：
 * 1. 家庭基本信息管理
 * 2. 二维码生成和管理（一户一码）
 * 3. 家庭成员关联
 * 4. 住房和土地信息
 * 5. 家庭类型自动识别和标签管理
 * 6. 统计分析数据
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const crypto = require('crypto');
const QRCode = require('qrcode');

// 家庭类型枚举
const FAMILY_TYPES = {
  GENERAL: '一般家庭', // 普通家庭
  LOW_INCOME: '低保户', // 享受低保的家庭
  DISABILITY: '残疾人家庭', // 有成员残疾的家庭
  ELDERLY_ONLY: '独居老人家庭', // 只有老人居住的家庭
  SINGLE_CHILD: '独生子女家庭', // 独生子女家庭
  EMPTY_NEST: '空巢家庭', // 子女不在身边的老人家庭
  DIFFICULT: '困难家庭', // 经济困难家庭
  KEY_HELP_OBJECT: '重点帮扶对象', // 需要重点帮扶的家庭
  MODEL_FAMILY: '模范家庭', // 文明家庭、模范家庭
  ENTREPRENEURIAL: '创业家庭', // 有创业项目的家庭
  MIGRANT_WORKER: '外出务工家庭' // 主要劳动力外出打工的家庭
};

// 住房类型枚举
const HOUSING_TYPES = {
  SELF_BUILT: '自建房',
  APARTMENT: '公寓',
  COURTYARD: '四合院',
  BRICK_WOOD: '砖木结构',
  CONCRETE: '混凝土结构',
  OTHER: '其他'
};

// 二维码状态枚举
const QR_CODE_STATUS = {
  ACTIVE: '有效',
  EXPIRED: '已过期',
  REVOKED: '已撤销',
  PENDING: '待激活'
};

const FamilySchema = new Schema({
  // 所属村庄
  villageId: {
    type: Schema.Types.ObjectId,
    ref: 'Village',
    required: [true, '村庄ID不能为空'],
    index: true
  },

  // 房屋编号（村内的唯一编号）
  houseNumber: {
    type: String,
    required: [true, '房屋编号不能为空'],
    trim: true,
    unique: true, // 全局唯一
    index: true
  },

  // 户主信息
  headOfHousehold: {
    name: {
      type: String,
      required: [true, '户主姓名不能为空'],
      trim: true
    },
    idCard: {
      type: String,
      required: [true, '户主身份证号不能为空'],
      trim: true,
      set: function(value) {
        // 加密存储
        if (value && !value.startsWith('encrypted:')) {
          return this.encryptIdCard(value);
        }
        return value;
      }
    },
    phone: {
      type: String,
      required: [true, '户主联系电话不能为空'],
      trim: true,
      match: [/^1[3-9]\d{9}$/, '请输入有效的手机号码']
    },
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'FamilyMember'
    }
  },

  // 家庭地址
  address: {
    province: { type: String, default: '浙江省' },
    city: { type: String, default: '杭州市' },
    district: { type: String, default: '' },
    town: { type: String, default: '' },
    village: { type: String, default: '' },
    street: { type: String, default: '' },
    // 详细地址（门牌号等）
    detail: {
      type: String,
      required: [true, '详细地址不能为空'],
      trim: true
    }
  },

  // 完整地址虚拟字段，由getters组合

  // 家庭成员数量
  memberCount: {
    type: Number,
    default: 1,
    min: [1, '家庭成员数量至少为1']
  },

  // 在村成员数量
  memberCountInVillage: {
    type: Number,
    default: 1
  },

  // 家庭类型（可以多选）
  familyTypes: [{
    type: String,
    enum: Object.values(FAMILY_TYPES)
  }],

  // 住房信息
  housing: {
    // 住房类型
    type: {
      type: String,
      enum: Object.values(HOUSING_TYPES),
      default: 'SELF_BUILT'
    },
    // 建筑面积（平方米）
    area: {
      type: Number,
      default: 0,
      min: [0, '建筑面积不能为负数']
    },
    // 使用面积（平方米）
    usableArea: {
      type: Number,
      default: 0,
      min: [0, '使用面积不能为负数']
    },
    // 建造年代
    buildYear: {
      type: Number,
      min: [1900, '建造年代不能早于1900年'],
      max: [new Date().getFullYear() + 1, '建造年代不能超过明年']
    },
    // 房屋结构
    structure: {
      type: String,
      trim: true
    },
    // 楼层数
    floors: {
      type: Number,
      default: 1,
      min: [1, '楼层不能少于1层']
    },
    // 是否有危房标识
    isDangerous: {
      type: Boolean,
      default: false
    },
    // 危房等级（1-4级，4级最严重）
    dangerLevel: {
      type: Number,
      min: 1,
      max: 4,
      default: null
    },
    // 房屋照片URL数组
    photos: [{
      url: String,
      description: String,
      uploadDate: {
        type: Date,
        default: Date.now
      }
    }]
  },

  // 土地信息
  land: {
    // 耕地面积（亩）
    cultivatedArea: {
      type: Number,
      default: 0,
      min: [0, '耕地面积不能为负数']
    },
    // 林地面积（亩）
    forestArea: {
      type: Number,
      default: 0,
      min: [0, '林地面积不能为负数']
    },
    // 宅基地面积（平方米）
    homesteadArea: {
      type: Number,
      default: 0,
      min: [0, '宅基地面积不能为负数']
    },
    // 其他用地面积（亩）
    otherArea: {
      type: Number,
      default: 0,
      min: [0, '其他用地面积不能为负数']
    },
    // 土地承包合同编号
    contractNumber: {
      type: String,
      trim: true
    },
    // 土地确权证号
    landCertificate: {
      type: String,
      trim: true
    }
  },

  // 经济状况
  economicStatus: {
    // 年收入（万元）
    annualIncome: {
      type: Number,
      default: 0,
      min: [0, '年收入不能为负数']
    },
    // 主要收入来源
    incomeSource: {
      type: String,
      trim: true,
      enum: ['务农', '务工', '经商', '养殖', '种植', '其他', '']
    },
    // 是否享受低保
    hasLowIncomeSupport: {
      type: Boolean,
      default: false
    },
    // 低保证号
    lowIncomeCertificate: {
      type: String,
      trim: true
    },
    // 是否有债务
    hasDebt: {
      type: Boolean,
      default: false
    },
    // 债务金额（万元）
    debtAmount: {
      type: Number,
      default: 0,
      min: [0, '债务金额不能为负数']
    }
  },

  // 一户一码信息
  qrCode: {
    // 唯一编码（UUID）
    code: {
      type: String,
      unique: true,
      index: true
    },
    // 二维码图片URL
    imageUrl: {
      type: String,
      default: ''
    },
    // 生成时间
    generatedAt: {
      type: Date,
      default: Date.now
    },
    // 有效期（null表示永久有效）
    expiresAt: {
      type: Date,
      default: null
    },
    // 状态
    status: {
      type: String,
      enum: Object.values(QR_CODE_STATUS),
      default: 'ACTIVE'
    },
    // 打印次数
    printCount: {
      type: Number,
      default: 0
    },
    // 最后打印时间
    lastPrintedAt: {
      type: Date,
      default: null
    }
  },

  // 家庭标签（自定义标签）
  tags: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    color: {
      type: String,
      default: '#409EFF' // 默认蓝色
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 特殊标记（自动生成）
  specialFlags: {
    // 是否需要定期走访
    needsRegularVisit: {
      type: Boolean,
      default: false
    },
    // 走访频率（天）
    visitFrequency: {
      type: Number,
      default: null
    },
    // 是否需要优先帮扶
    priorityHelp: {
      type: Boolean,
      default: false
    },
    // 帮扶优先级（1-10，10最高）
    helpPriority: {
      type: Number,
      min: 1,
      max: 10,
      default: 1
    },
    // 风险等级（低、中、高）
    riskLevel: {
      type: String,
      enum: ['低', '中', '高'],
      default: '低'
    }
  },

  // 联系方式（备用）
  emergencyContact: {
    name: {
      type: String,
      trim: true
    },
    relationship: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true,
      match: [/^1[3-9]\d{9}$/, '请输入有效的手机号码']
    }
  },

  // 备注
  remarks: {
    type: String,
    trim: true,
    maxlength: [1000, '备注长度不能超过1000个字符']
  },

  // 附件文档（身份证、户口本等）
  documents: [{
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['身份证', '户口本', '低保证', '残疾证', '土地证', '其他'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],

  // 操作日志
  operationLogs: [{
    operator: {
      type: String,
      required: true
    },
    operatorId: {
      type: Schema.Types.ObjectId,
      required: true
    },
    operation: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: Schema.Types.Mixed
  }],

  // 最后更新时间
  lastUpdatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  // 最后更新时间
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  },

  // 软删除标记
  isDeleted: {
    type: Boolean,
    default: false
  },

  // 删除时间
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
FamilySchema.index({ villageId: 1, houseNumber: 1, isDeleted: 1 }, { unique: true });
FamilySchema.index({ villageId: 1, familyTypes: 1 });
FamilySchema.index({ villageId: 1, 'qrCode.code': 1 });
FamilySchema.index({ 'headOfHousehold.idCard': 1, isDeleted: 1 });
FamilySchema.index({ 'headOfHousehold.phone': 1, isDeleted: 1 });
FamilySchema.index({ tags: 1 });
FamilySchema.index({ 'specialFlags.needsRegularVisit': 1 });
FamilySchema.index({ createdAt: -1 });

// 虚拟属性：完整地址
FamilySchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  let full = '';
  if (addr.province) full += addr.province;
  if (addr.city) full += addr.city;
  if (addr.district) full += addr.district;
  if (addr.town) full += addr.town;
  if (addr.village) full += addr.village;
  if (addr.street) full += addr.street;
  if (addr.detail) full += addr.detail;
  return full;
});

// 虚拟属性：户主身份证号脱敏显示
FamilySchema.virtual('headOfHousehold.idCardMasked').get(function() {
  const encrypted = this.headOfHousehold.idCard;
  if (!encrypted || !encrypted.startsWith('encrypted:')) {
    return encrypted;
  }

  try {
    const decrypted = this.decryptIdCard(encrypted);
    if (decrypted.length === 18) {
      return decrypted.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
    } else if (decrypted.length === 15) {
      return decrypted.replace(/(\d{6})\d{6}(\d{3})/, '$1******$2');
    }
    return decrypted;
  } catch (error) {
    return '****';
  }
});

// 虚拟属性：户主手机号脱敏显示
FamilySchema.virtual('headOfHousehold.phoneMasked').get(function() {
  if (!this.headOfHousehold.phone) return '';
  return this.headOfHousehold.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
});

// 虚拟属性：二维码是否有效
FamilySchema.virtual('qrCode.isValid').get(function() {
  if (this.qrCode.status !== 'ACTIVE') return false;
  if (!this.qrCode.expiresAt) return true; // 永久有效
  return new Date() < this.qrCode.expiresAt;
});

// 实例方法：加密身份证号
FamilySchema.methods.encryptIdCard = function(idCard) {
  try {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ID_CARD_ENCRYPTION_KEY || 'default-key-32-characters-long!!', 'utf8').slice(0, 32);
    const iv = Buffer.from(process.env.ID_CARD_ENCRYPTION_IV || '1234567890123456', 'utf8').slice(0, 16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(idCard, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return 'encrypted:' + encrypted;
  } catch (error) {
    console.error('身份证加密失败:', error);
    return idCard;
  }
};

// 实例方法：解密身份证号
FamilySchema.methods.decryptIdCard = function(encryptedIdCard) {
  if (!encryptedIdCard) return '';

  try {
    if (!encryptedIdCard.startsWith('encrypted:')) {
      return encryptedIdCard;
    }

    const encrypted = encryptedIdCard.replace('encrypted:', '');
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ID_CARD_ENCRYPTION_KEY || 'default-key-32-characters-long!!', 'utf8').slice(0, 32);
    const iv = Buffer.from(process.env.ID_CARD_ENCRYPTION_IV || '1234567890123456', 'utf8').slice(0, 16);

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('身份证解密失败:', error);
    return '';
  }
};

// 实例方法：生成唯一二维码
FamilySchema.methods.generateQRCode = function(expiresInDays = null) {
  const code = crypto.randomUUID();
  const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null;

  this.qrCode = {
    code,
    imageUrl: '',
    generatedAt: new Date(),
    expiresAt,
    status: 'ACTIVE',
    printCount: 0,
    lastPrintedAt: null
  };

  return this.save().then(family => {
    // 生成二维码图片
    const qrData = JSON.stringify({
      type: 'family',
      code: family.qrCode.code,
      houseNumber: family.houseNumber,
      villageId: family.villageId
    });

    return QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    }).then(imageUrl => {
      family.qrCode.imageUrl = imageUrl;
      return family.save();
    });
  });
};

// 实例方法：撤销二维码
FamilySchema.methods.revokeQRCode = function() {
  this.qrCode.status = 'REVOKED';
  return this.save();
};

// 实例方法：记录打印
FamilySchema.methods.recordPrint = function() {
  this.qrCode.printCount += 1;
  this.qrCode.lastPrintedAt = new Date();
  return this.save();
};

// 实例方法：添加操作日志
FamilySchema.methods.addLog = function(operator, operatorId, operation, details = {}) {
  this.operationLogs.push({
    operator,
    operatorId,
    operation,
    timestamp: new Date(),
    details
  });
  this.lastUpdatedAt = new Date();
  return this.save();
};

// 实例方法：添加家庭类型
FamilySchema.methods.addFamilyType = function(type) {
  if (!this.familyTypes.includes(type)) {
    this.familyTypes.push(type);
    return this.save();
  }
  return Promise.resolve(this);
};

// 实例方法：移除家庭类型
FamilySchema.methods.removeFamilyType = function(type) {
  this.familyTypes = this.familyTypes.filter(t => t !== type);
  return this.save();
};

// 实例方法：添加标签
FamilySchema.methods.addTag = function(tagName, color, createdBy) {
  const existingTag = this.tags.find(t => t.name === tagName);
  if (!existingTag) {
    this.tags.push({
      name: tagName,
      color,
      createdBy
    });
    return this.save();
  }
  return Promise.resolve(this);
};

// 实例方法：移除标签
FamilySchema.methods.removeTag = function(tagName) {
  this.tags = this.tags.filter(t => t.name !== tagName);
  return this.save();
};

// 实例方法：更新成员数量
FamilySchema.methods.updateMemberCount = function() {
  const FamilyMember = mongoose.model('FamilyMember');
  return FamilyMember.countDocuments({ familyId: this._id, isDeleted: false })
    .then(count => {
      this.memberCount = count;
      return FamilyMember.countDocuments({
        familyId: this._id,
        isInVillage: true,
        isDeleted: false
      });
    })
    .then(countInVillage => {
      this.memberCountInVillage = countInVillage;
      return this.save();
    });
};

// 实例方法：自动计算家庭类型
FamilySchema.methods.calculateFamilyTypes = function() {
  const FamilyMember = mongoose.model('FamilyMember');
  return FamilyMember.find({ familyId: this._id, isDeleted: false })
    .then(members => {
      const types = [];

      // 检查是否有低保
      if (this.economicStatus.hasLowIncomeSupport) {
        types.push('低保户');
      }

      // 检查是否有残疾人
      const hasDisabledMember = members.some(m =>
        m.specialTags.includes('残疾人')
      );
      if (hasDisabledMember) {
        types.push('残疾人家庭');
      }

      // 检查是否为独居老人家庭
      const elderlyMembers = members.filter(m => m.age >= 60);
      if (elderlyMembers.length === members.length && members.length <= 2 && members.length > 0) {
        if (this.memberCountInVillage === members.length) {
          types.push('独居老人家庭');
        }
        types.push('空巢家庭');
      }

      // 检查是否为独生子女家庭
      const childrenCount = members.filter(m => m.age < 18).length;
      if (childrenCount === 1) {
        types.push('独生子女家庭');
      }

      // 更新家庭类型
      this.familyTypes = types;
      return this.save();
    });
};

// 实例方法：计算帮扶优先级
FamilySchema.methods.calculateHelpPriority = function() {
  let priority = 1;

  // 低保户优先级高
  if (this.economicStatus.hasLowIncomeSupport) {
    priority += 3;
  }

  // 残疾人家庭优先级高
  if (this.familyTypes.includes('残疾人家庭')) {
    priority += 2;
  }

  // 独居老人家庭优先级高
  if (this.familyTypes.includes('独居老人家庭')) {
    priority += 2;
  }

  // 危房家庭优先级高
  if (this.housing.isDangerous && this.housing.dangerLevel >= 3) {
    priority += 2;
  }

  // 慢性病或重大疾病成员
  const FamilyMember = mongoose.model('FamilyMember');
  return FamilyMember.find({ familyId: this._id, isDeleted: false })
    .then(members => {
      const hasSeriousIllness = members.some(m =>
        m.specialTags.includes('慢性病患者') ||
        m.specialTags.includes('重大疾病患者')
      );
      if (hasSeriousIllness) {
        priority += 1;
      }

      this.specialFlags.helpPriority = Math.min(priority, 10);
      this.specialFlags.priorityHelp = this.specialFlags.helpPriority >= 5;

      // 设置风险等级
      if (this.specialFlags.helpPriority >= 7) {
        this.specialFlags.riskLevel = '高';
        this.specialFlags.needsRegularVisit = true;
        this.specialFlags.visitFrequency = 7; // 每周走访
      } else if (this.specialFlags.helpPriority >= 5) {
        this.specialFlags.riskLevel = '中';
        this.specialFlags.needsRegularVisit = true;
        this.specialFlags.visitFrequency = 30; // 每月走访
      } else {
        this.specialFlags.riskLevel = '低';
      }

      return this.save();
    });
};

// 静态方法：根据二维码查找家庭
FamilySchema.statics.findByQRCode = function(code) {
  return this.findOne({
    'qrCode.code': code,
    'qrCode.status': 'ACTIVE',
    isDeleted: false
  }).populate('villageId', 'name district town');
};

// 静态方法：获取村庄所有家庭
FamilySchema.statics.findByVillageId = function(villageId, options = {}) {
  const query = { villageId, isDeleted: false };

  if (options.familyType) {
    query.familyTypes = options.familyType;
  }

  if (options.needsVisit) {
    query['specialFlags.needsRegularVisit'] = true;
  }

  return this.find(query)
    .populate('villageId', 'name district town')
    .sort({ houseNumber: 1 });
};

// 静态方法：统计家庭数据
FamilySchema.statics.getStatistics = function(villageId) {
  const pipeline = [
    { $match: { villageId: mongoose.Types.ObjectId(villageId), isDeleted: false } },
    {
      $group: {
        _id: null,
        totalFamilies: { $sum: 1 },
        totalMembers: { $sum: '$memberCount' },
        lowIncomeFamilies: {
          $sum: {
            $cond: ['$economicStatus.hasLowIncomeSupport', 1, 0]
          }
        },
        elderlyFamilies: {
          $sum: {
            $cond: [{ $in: ['独居老人家庭', '$familyTypes'] }, 1, 0]
          }
        },
        disabilityFamilies: {
          $sum: {
            $cond: [{ $in: ['残疾人家庭', '$familyTypes'] }, 1, 0]
          }
        },
        needsVisitFamilies: {
          $sum: {
            $cond: ['$specialFlags.needsRegularVisit', 1, 0]
          }
        },
        totalHousingArea: { $sum: '$housing.area' },
        totalLandArea: { $sum: '$land.cultivatedArea' }
      }
    }
  ];

  return this.aggregate(pipeline).then(result => {
    return result[0] || {
      totalFamilies: 0,
      totalMembers: 0,
      lowIncomeFamilies: 0,
      elderlyFamilies: 0,
      disabilityFamilies: 0,
      needsVisitFamilies: 0,
      totalHousingArea: 0,
      totalLandArea: 0
    };
  });
};

// 前置保存钩子：生成二维码
FamilySchema.pre('save', function(next) {
  if (this.isNew && !this.qrCode.code) {
    // 新建家庭时自动生成二维码
    this.qrCode.code = crypto.randomUUID();
    this.qrCode.generatedAt = new Date();
    this.qrCode.status = 'ACTIVE';
  }
  next();
});

// 导出枚举常量
FamilySchema.statics.FAMILY_TYPES = FAMILY_TYPES;
FamilySchema.statics.HOUSING_TYPES = HOUSING_TYPES;
FamilySchema.statics.QR_CODE_STATUS = QR_CODE_STATUS;

const Family = mongoose.model('Family', FamilySchema);

module.exports = Family;
