/**
 * FamilyMember Model
 * 家庭成员数据模型
 *
 * 功能说明：
 * 1. 存储家庭成员的详细信息
 * 2. 支持与户主的关系管理
 * 3. 特殊标记（独居老人、残疾人等）
 * 4. 认证信息（用于人脸识别）
 * 5. 数据加密和脱敏处理
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const crypto = require('crypto');

// 家庭成员关系枚举
const RELATIONSHIP_TYPES = {
  SELF: '户主',
  SPOUSE: '配偶',
  FATHER: '父亲',
  MOTHER: '母亲',
  SON: '儿子',
  DAUGHTER: '女儿',
  GRANDFATHER: '祖父',
  GRANDMOTHER: '祖母',
  GRANDSON: '孙子',
  GRANDDAUGHTER: '孙女',
  BROTHER: '兄弟',
  SISTER: '姐妹',
  OTHER: '其他'
};

// 特殊标记枚举
const SPECIAL_TAGS = {
  NONE: '无',
  ELDERLY_LIVING_ALONE: '独居老人', // 60岁以上且独居
  DISABLED: '残疾人',
  CHRONIC_ILLNESS: '慢性病患者',
  SERIOUS_ILLNESS: '重大疾病患者',
  PREGNANT: '孕妇',
  INFANT: '婴幼儿', // 3岁以下
  STUDENT: '在校学生',
  VETERAN: '退役军人',
  PARTY_MEMBER: '共产党员',
  VOLUNTEER: '志愿者',
  EMPTY_NEST: '空巢老人' // 子女不在身边
};

// 认证状态枚举
const AUTH_STATUS = {
  NOT_REGISTERED: '未注册',
  PENDING: '待认证',
  VERIFIED: '已认证',
  FAILED: '认证失败'
};

const FamilyMemberSchema = new Schema({
  // 关联家庭ID
  familyId: {
    type: Schema.Types.ObjectId,
    ref: 'Family',
    required: [true, '家庭ID不能为空'],
    index: true
  },

  // 基本信息
  name: {
    type: String,
    required: [true, '姓名不能为空'],
    trim: true,
    maxlength: [50, '姓名长度不能超过50个字符']
  },

  // 身份证号（加密存储）
  idCard: {
    type: String,
    required: [true, '身份证号不能为空'],
    unique: true,
    trim: true,
    set: function(value) {
      // 加密存储身份证号
      if (value && !value.startsWith('encrypted:')) {
        return this.encryptIdCard(value);
      }
      return value;
    }
  },

  // 身份证号明文（用于查询，不在数据库中实际存储）
  // 通过虚拟属性获取解密后的值

  // 性别
  gender: {
    type: String,
    enum: ['男', '女'],
    required: [true, '性别不能为空']
  },

  // 出生日期
  birthDate: {
    type: Date,
    required: [true, '出生日期不能为空'],
    validate: {
      validator: function(value) {
        // 不能是未来日期
        return value <= new Date();
      },
      message: '出生日期不能是未来日期'
    }
  },

  // 民族
  ethnicity: {
    type: String,
    default: '汉族',
    trim: true
  },

  // 与户主关系
  relationship: {
    type: String,
    enum: Object.values(RELATIONSHIP_TYPES),
    required: [true, '与户主关系不能为空']
  },

  // 联系电话
  phone: {
    type: String,
    trim: true,
    match: [/^1[3-9]\d{9}$/, '请输入有效的手机号码']
  },

  // 教育程度
  education: {
    type: String,
    enum: ['未上学', '小学', '初中', '高中', '大专', '本科', '硕士', '博士'],
    default: '未上学'
  },

  // 职业信息
  occupation: {
    type: String,
    trim: true,
    maxlength: [100, '职业信息长度不能超过100个字符']
  },

  // 工作单位
  workplace: {
    type: String,
    trim: true,
    maxlength: [200, '工作单位长度不能超过200个字符']
  },

  // 婚姻状况
  maritalStatus: {
    type: String,
    enum: ['未婚', '已婚', '离婚', '丧偶'],
    default: '未婚'
  },

  // 政治面貌
  politicalStatus: {
    type: String,
    enum: ['群众', '党员', '团员', '民主党派'],
    default: '群众'
  },

  // 健康状况
  healthStatus: {
    type: String,
    enum: ['健康', '良好', '一般', '较差', '有疾病'],
    default: '健康'
  },

  // 特殊标记
  specialTags: [{
    type: String,
    enum: Object.values(SPECIAL_TAGS)
  }],

  // 是否为户主
  isHead: {
    type: Boolean,
    default: false
  },

  // 头像URL
  avatar: {
    type: String,
    default: ''
  },

  // 认证信息
  authentication: {
    // 认证状态
    status: {
      type: String,
      enum: Object.values(AUTH_STATUS),
      default: 'NOT_REGISTERED'
    },

    // 人脸特征向量（用于人脸识别）
    faceDescriptor: {
      type: [Number],
      default: null
    },

    // 人脸照片URL
    facePhoto: {
      type: String,
      default: ''
    },

    // 最后认证时间
    lastAuthTime: {
      type: Date,
      default: null
    },

    // 认证失败次数
    failedAttempts: {
      type: Number,
      default: 0
    },

    // 账户锁定时间
    lockedUntil: {
      type: Date,
      default: null
    }
  },

  // 亲属代理配置（允许哪些亲属远程代理）
  proxySettings: {
    enabled: {
      type: Boolean,
      default: false
    },
    // 允许代理的亲属ID列表
    allowedProxies: [{
      type: Schema.Types.ObjectId,
      ref: 'FamilyMember'
    }],
    // 代理授权截止日期
    expiryDate: {
      type: Date,
      default: null
    }
  },

  // 居住状态
  residenceStatus: {
    type: String,
    enum: ['在本村居住', '在外地居住', '在本地其他村居住', '境外居住'],
    default: '在本村居住'
  },

  // 现居住地址（如不在本村）
  currentAddress: {
    type: String,
    trim: true,
    maxlength: [200, '现居住地址长度不能超过200个字符']
  },

  // 备注
  remarks: {
    type: String,
    trim: true,
    maxlength: [500, '备注长度不能超过500个字符']
  },

  // 是否在村
  isInVillage: {
    type: Boolean,
    default: true
  },

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
FamilyMemberSchema.index({ familyId: 1, isDeleted: 1 });
FamilyMemberSchema.index({ idCard: 1, isDeleted: 1 });
FamilyMemberSchema.index({ name: 1, isDeleted: 1 });
FamilyMemberSchema.index({ phone: 1, isDeleted: 1 });
FamilyMemberSchema.index({ specialTags: 1 });
FamilyMemberSchema.index({ 'authentication.status': 1 });
FamilyMemberSchema.index({ isInVillage: 1, isDeleted: 1 });

// 虚拟属性：年龄
FamilyMemberSchema.virtual('age').get(function() {
  const today = new Date();
  const birthDate = new Date(this.birthDate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
});

// 虚拟属性：手机号脱敏显示
FamilyMemberSchema.virtual('phoneMasked').get(function() {
  if (!this.phone) return '';
  return this.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
});

// 虚拟属性：身份证号脱敏显示
FamilyMemberSchema.virtual('idCardMasked').get(function() {
  const decrypted = this.decryptIdCard(this.idCard);
  if (!decrypted) return '';
  if (decrypted.length === 18) {
    return decrypted.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
  } else if (decrypted.length === 15) {
    return decrypted.replace(/(\d{6})\d{6}(\d{3})/, '$1******$2');
  }
  return decrypted;
});

// 实例方法：加密身份证号
FamilyMemberSchema.methods.encryptIdCard = function(idCard) {
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
FamilyMemberSchema.methods.decryptIdCard = function(encryptedIdCard) {
  if (!encryptedIdCard) return '';

  try {
    if (!encryptedIdCard.startsWith('encrypted:')) {
      return encryptedIdCard; // 未加密的数据直接返回
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

// 实例方法：添加操作日志
FamilyMemberSchema.methods.addLog = function(operator, operatorId, operation, details = {}) {
  this.operationLogs.push({
    operator,
    operatorId,
    operation,
    timestamp: new Date(),
    details
  });
  return this.save();
};

// 实例方法：添加特殊标签
FamilyMemberSchema.methods.addSpecialTag = function(tag) {
  if (!this.specialTags.includes(tag)) {
    this.specialTags.push(tag);
    return this.save();
  }
  return Promise.resolve(this);
};

// 实例方法：移除特殊标签
FamilyMemberSchema.methods.removeSpecialTag = function(tag) {
  this.specialTags = this.specialTags.filter(t => t !== tag);
  return this.save();
};

// 实例方法：检查是否为独居老人
FamilyMemberSchema.methods.isElderlyLivingAlone = function() {
  const age = this.age;
  return age >= 60 && this.residenceStatus === '在本村居住' && this.specialTags.includes('独居老人');
};

// 实例方法：检查认证是否可用
FamilyMemberSchema.methods.isAuthAvailable = function() {
  // 如果账户被锁定，检查是否已过锁定时间
  if (this.authentication.lockedUntil) {
    if (new Date() < this.authentication.lockedUntil) {
      return false;
    } else {
      // 解锁账户
      this.authentication.lockedUntil = null;
      this.authentication.failedAttempts = 0;
    }
  }
  return true;
};

// 实例方法：记录认证失败
FamilyMemberSchema.methods.recordAuthFailure = function() {
  this.authentication.failedAttempts += 1;

  // 连续失败5次，锁定账户30分钟
  if (this.authentication.failedAttempts >= 5) {
    this.authentication.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
    this.authentication.status = 'FAILED';
  }

  return this.save();
};

// 实例方法：重置认证失败次数
FamilyMemberSchema.methods.resetAuthAttempts = function() {
  this.authentication.failedAttempts = 0;
  this.authentication.lockedUntil = null;
  return this.save();
};

// 静态方法：根据身份证号查找成员
FamilyMemberSchema.statics.findByIdCard = function(idCard) {
  const Model = this;
  return Model.findOne({ idCard: new RegExp(idCard, 'i'), isDeleted: false })
    .populate('familyId')
    .populate('proxySettings.allowedProxies', 'name relationship phone');
};

// 静态方法：获取家庭所有成员
FamilyMemberSchema.statics.findByFamilyId = function(familyId) {
  return this.find({ familyId, isDeleted: false })
    .sort({ isHead: -1, birthDate: -1 }); // 户主在前，然后按年龄降序
};

// 静态方法：获取有特殊标签的成员
FamilyMemberSchema.statics.findBySpecialTag = function(tag, villageId) {
  const Family = mongoose.model('Family');
  return Family.find({ villageId, isDeleted: false }).distinct('_id')
    .then(familyIds => {
      return this.find({
        familyId: { $in: familyIds },
        specialTags: tag,
        isDeleted: false
      }).populate('familyId');
    });
};

// 静态方法：统计家庭成员数量
FamilyMemberSchema.statics.countByFamilyId = function(familyId) {
  return this.countDocuments({ familyId, isDeleted: false });
};

// 前置保存钩子：确保户主唯一
FamilyMemberSchema.pre('save', async function(next) {
  if (this.isHead) {
    const FamilyMember = mongoose.model('FamilyMember');
    const existingHead = await FamilyMember.findOne({
      familyId: this.familyId,
      isHead: true,
      _id: { $ne: this._id },
      isDeleted: false
    });

    if (existingHead) {
      return next(new Error('一个家庭只能有一个户主'));
    }
  }
  next();
});

// 导出枚举常量
FamilyMemberSchema.statics.RELATIONSHIP_TYPES = RELATIONSHIP_TYPES;
FamilyMemberSchema.statics.SPECIAL_TAGS = SPECIAL_TAGS;
FamilyMemberSchema.statics.AUTH_STATUS = AUTH_STATUS;

const FamilyMember = mongoose.model('FamilyMember', FamilyMemberSchema);

module.exports = FamilyMember;
