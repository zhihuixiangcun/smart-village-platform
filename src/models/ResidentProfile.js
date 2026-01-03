/**
 * 村民档案模型
 * 村民个人信息详细档案
 */

const mongoose = require('mongoose');
const EncryptionUtil = require('../utils/encryption');

const residentProfileSchema = new mongoose.Schema({
  // 关联用户
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true,
    unique: true
  },

  // 关联家庭
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    required: true
  },

  // 基本信息
  personalInfo: {
    name: {
      type: String,
      required: true,
      trim: true
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
    age: {
      type: Number,
      min: 0,
      max: 150
    },
    idCard: {
      type: String,
      required: true,
      encrypted: true,
      unique: true
    },
    ethnicity: {
      type: String,
      enum: ['汉族', '壮族', '满族', '回族', '苗族', '维吾尔族', '土家族', '彝族', '蒙古族', '藏族', '布依族', '侗族', '瑶族', '朝鲜族', '白族', '哈尼族', '哈萨克族', '黎族', '傣族', '畲族', '傈僳族', '仡佬族', '东乡族', '高山族', '拉祜族', '水族', '佤族', '纳西族', '羌族', '土族', '锡伯族', '柯尔克孜族', '达斡尔族', '景颇族', '毛南族', '撒拉族', '布朗族', '塔吉克族', '阿昌族', '普米族', '鄂温克族', '怒族', '京族', '基诺族', '德昂族', '保安族', '俄罗斯族', '裕固族', '乌孜别克族', '门巴族', '鄂伦春族', '独龙族', '塔塔尔族', '赫哲族', '珞巴族'],
      default: '汉族'
    },
    politicalStatus: {
      type: String,
      enum: ['中共党员', '中共预备党员', '共青团员', '民革党员', '民盟盟员', '民建会员', '民进会员', '农工党党员', '致公党党员', '九三学社社员', '台盟盟员', '无党派人士', '群众'],
      default: '群众'
    },
    maritalStatus: {
      type: String,
      enum: ['未婚', '已婚', '离婚', '丧偶'],
      default: '未婚'
    },
    healthStatus: {
      type: String,
      enum: ['健康', '良好', '一般', '较差', '慢性病', '残疾', '重大疾病'],
      default: '健康'
    },
    bloodType: {
      type: String,
      enum: ['A', 'B', 'AB', 'O', '未知'],
      default: '未知'
    },
    height: { type: Number }, // 身高(cm)
    weight: { type: Number }, // 体重(kg)
    photo: { type: String }, // 照片URL
    signature: { type: String } // 亲笔签名图片URL
  },

  // 联系方式
  contact: {
    phone: {
      type: String,
      required: true,
      encrypted: true
    },
    email: { type: String },
    wechat: { type: String },
    qq: { type: String },
    address: {
      type: String,
      required: true
    },
    postalCode: { type: String }
  },

  // 教育背景
  education: {
    degree: {
      type: String,
      enum: ['文盲', '小学', '初中', '高中', '中专', '大专', '本科', '硕士', '博士'],
      default: '初中'
    },
    school: { type: String },
    major: { type: String },
    graduationYear: { type: Number },
    certificates: [{
      name: { type: String },
      issuer: { type: String },
      issueDate: { type: Date },
      expiryDate: { type: Date },
      certificateNumber: { type: String },
      fileUrl: { type: String }
    }]
  },

  // 就业信息
  employment: {
    status: {
      type: String,
      enum: ['在业', '失业', '务农', '个体经营', '退休', '学生', '其他'],
      default: '务农'
    },
    employer: { type: String },
    position: { type: String },
    industry: { type: String },
    workLocation: {
      province: { type: String },
      city: { type: String },
      address: { type: String }
    },
    workPhone: { type: String, encrypted: true },
    startDate: { type: Date },
    income: {
      monthly: { type: Number },
      annual: { type: Number }
    },
    skills: [{
      type: String
    }]
  },

  // 社会保障
  socialSecurity: {
    hasMedicalInsurance: {
      type: Boolean,
      default: true
    },
    medicalInsuranceType: {
      type: String,
      enum: ['城镇职工医保', '城乡居民医保', '新农合', '商业保险', '无']
    },
    medicalInsuranceNumber: { type: String, encrypted: true },
    hasPensionInsurance: { type: Boolean },
    pensionInsuranceNumber: { type: String, encrypted: true },
    hasUnemploymentInsurance: { type: Boolean },
    hasWorkInjuryInsurance: { type: Boolean },
    hasMaternityInsurance: { type: Boolean },
    公积金Account: { type: String, encrypted: true }
  },

  // 健康档案
  healthRecord: {
    allergies: [{
      allergen: { type: String },
      reaction: { type: String },
      severity: {
        type: String,
        enum: ['轻度', '中度', '重度']
      }
    }],
    medications: [{
      name: { type: String },
      dosage: { type: String },
      frequency: { type: String },
      startDate: { type: Date },
      endDate: { type: Date }
    }],
    diseases: [{
      name: { type: String },
      diagnosisDate: { type: Date },
      status: {
        type: String,
        enum: ['治疗中', '已康复', '慢性', '终身']
      },
      hospital: { type: String }
    }],
    surgeries: [{
      name: { type: String },
      date: { type: Date },
      hospital: { type: String },
      doctor: { type: String }
    }],
    vaccinations: [{
      vaccine: { type: String },
      date: { type: Date },
      batchNumber: { type: String },
      nextDueDate: { type: Date }
    }],
    physicalExaminations: [{
      date: { type: Date },
      hospital: { type: String },
      results: { type: String },
      reportUrl: { type: String }
    }],
    disability: {
      hasDisability: { type: Boolean, default: false },
      type: { type: String },
      level: { type: String },
      certificateNumber: { type: String },
      issuedDate: { type: Date }
    }
  },

  // 家庭关系
  familyRelations: [{
    relationType: {
      type: String,
      enum: ['配偶', '父亲', '母亲', '儿子', '女儿', '兄弟', '姐妹', '祖父', '祖母', '其他']
    },
    name: { type: String },
    idCard: { type: String, encrypted: true },
    age: { type: Number },
    phone: { type: String, encrypted: true },
    occupation: { type: String },
    isCohabit: { type: Boolean }, // 是否同住
    guardianFor: [{ type: String }] // 监护对象
  }],

  // 财产信息
  assets: {
    realEstate: [{
      type: {
        type: String,
        enum: ['住宅', '商铺', '厂房', '土地', '其他']
      },
      location: { type: String },
      area: { type: Number }, // 面积(平方米)
      ownership: {
        type: String,
        enum: ['个人', '共同', '家庭']
      },
      value: { type: Number }, // 估值(万元)
      certificateNumber: { type: String }
    }],
    vehicles: [{
      type: {
        type: String,
        enum: ['轿车', 'SUV', '货车', '摩托车', '电动车', '农用机械', '其他']
      },
      brand: { type: String },
      model: { type: String },
      licensePlate: { type: String },
      purchaseDate: { type: Date },
      value: { type: Number }
    }],
    bankAccounts: [{
      bankName: { type: String },
      accountNumber: { type: String, encrypted: true },
      accountType: {
        type: String,
        enum: ['储蓄卡', '信用卡', '对公账户']
      }
    }]
  },

  // 特殊标记
  tags: [{
    type: String,
    enum: [
      '党员', '村干部', '退役军人', '残疾人', '低保户', '五保户', '留守儿童', '空巢老人',
      '独居老人', '大病家庭', '单亲家庭', '失独家庭', '烈属', '优抚对象', '困难党员',
      '返乡创业', '农民工', '大学生', '专业技术人才', '其他'
    ]
  }],

  // 数字化服务权限
  digitalServices: {
    canOnlineApply: { type: Boolean, default: true },
    canProxyApply: { type: Boolean, default: false },
    needAssistance: { type: Boolean, default: false },
    assistanceNotes: { type: String }
  },

  // 附件管理
  attachments: [{
    type: {
      type: String,
      enum: ['身份证', '户口本', '结婚证', '毕业证', '职业资格证', '残疾证', '低保证', '医疗证', '其他'],
      required: true
    },
    name: { type: String, required: true },
    fileUrl: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now },
    expiryDate: { type: Date },
    status: {
      type: String,
      enum: ['有效', '过期', '待更新'],
      default: '有效'
    }
  }],

  // 状态信息
  status: {
    type: String,
    enum: ['正常', '迁出', '死亡', '注销'],
    default: '正常'
  },

  // 隐私设置
  privacy: {
    showPersonalInfo: { type: Boolean, default: true },
    showContactInfo: { type: Boolean, default: false },
    showFamilyInfo: { type: Boolean, default: true },
    showHealthInfo: { type: Boolean, default: false },
    allowProxy: { type: Boolean, default: true }
  },

  // 操作记录
  operationLogs: [{
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      // ref: 'User',
      required: true
    },
    operation: {
      type: String,
      enum: ['创建', '查看', '修改', '删除', '导出', '打印'],
      required: true
    },
    details: { type: String },
    timestamp: { type: Date, default: Date.now },
    ipAddress: { type: String }
  }],

  // 记录信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // 时间戳
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  // 最后登录信息
  lastLogin: {
    date: { type: Date },
    ipAddress: { type: String },
    device: { type: String },
    location: { type: String }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
residentProfileSchema.index({ userId: 1 });
residentProfileSchema.index({ familyId: 1 });
residentProfileSchema.index({ 'personalInfo.idCard': 1 });
residentProfileSchema.index({ status: 1 });
residentProfileSchema.index({ 'tags': 1 });
residentProfileSchema.index({ 'personalInfo.name': 1, 'personalInfo.gender': 1 });
// createdAt索引已由timestamps: true自动创建,无需手动指定

// 虚拟字段 - 年龄自动计算
residentProfileSchema.virtual('calculatedAge').get(function() {
  if (this.personalInfo.birthDate) {
    const today = new Date();
    const birthDate = new Date(this.personalInfo.birthDate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }
  return null;
});

// 虚拟字段 - 是否成年
residentProfileSchema.virtual('isAdult').get(function() {
  return (this.calculatedAge || 0) >= 18;
});

// 虚拟字段 - 是否老人
residentProfileSchema.virtual('isElderly').get(function() {
  return (this.calculatedAge || 0) >= 65;
});

// 虚拟字段 - 是否儿童
residentProfileSchema.virtual('isChild').get(function() {
  return (this.calculatedAge || 0) < 14;
});

// 中间件 - 保存前加密敏感数据
residentProfileSchema.pre('save', async function(next) {
  try {
    // 加密身份证
    if (this.personalInfo.idCard) {
      this.personalInfo.idCard = await EncryptionUtil.encrypt(this.personalInfo.idCard);
    }

    // 加密联系方式
    if (this.contact.phone) {
      this.contact.phone = await EncryptionUtil.encrypt(this.contact.phone);
    }

    // 加密工作电话
    if (this.employment.workPhone) {
      this.employment.workPhone = await EncryptionUtil.encrypt(this.employment.workPhone);
    }

    // 加密社保号码
    if (this.socialSecurity.medicalInsuranceNumber) {
      this.socialSecurity.medicalInsuranceNumber = await EncryptionUtil.encrypt(this.socialSecurity.medicalInsuranceNumber);
    }
    if (this.socialSecurity.pensionInsuranceNumber) {
      this.socialSecurity.pensionInsuranceNumber = await EncryptionUtil.encrypt(this.socialSecurity.pensionInsuranceNumber);
    }
    if (this.socialSecurity.公积金Account) {
      this.socialSecurity.公积金Account = await EncryptionUtil.encrypt(this.socialSecurity.公积金Account);
    }

    // 加密家庭成员信息
    for (const relation of this.familyRelations) {
      if (relation.idCard) {
        relation.idCard = await EncryptionUtil.encrypt(relation.idCard);
      }
      if (relation.phone) {
        relation.phone = await EncryptionUtil.encrypt(relation.phone);
      }
    }

    // 加密银行账号
    for (const account of this.assets.bankAccounts) {
      if (account.accountNumber) {
        account.accountNumber = await EncryptionUtil.encrypt(account.accountNumber);
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// 中间件 - 查询后解密数据
residentProfileSchema.post(['find', 'findOne'], async function(docs) {
  if (!docs) return;

  const decryptDoc = async (doc) => {
    if (!doc) return;

    // 解密身份证
    if (doc.personalInfo.idCard) {
      doc.personalInfo.idCard = await EncryptionUtil.decrypt(doc.personalInfo.idCard);
    }

    // 解密联系方式
    if (doc.contact.phone) {
      doc.contact.phone = await EncryptionUtil.decrypt(doc.contact.phone);
    }

    // 解密工作电话
    if (doc.employment.workPhone) {
      doc.employment.workPhone = await EncryptionUtil.decrypt(doc.employment.workPhone);
    }

    // 解密社保号码
    if (doc.socialSecurity.medicalInsuranceNumber) {
      doc.socialSecurity.medicalInsuranceNumber = await EncryptionUtil.decrypt(doc.socialSecurity.medicalInsuranceNumber);
    }
    if (doc.socialSecurity.pensionInsuranceNumber) {
      doc.socialSecurity.pensionInsuranceNumber = await EncryptionUtil.decrypt(doc.socialSecurity.pensionInsuranceNumber);
    }
    if (doc.socialSecurity.公积金Account) {
      doc.socialSecurity.公积金Account = await EncryptionUtil.decrypt(doc.socialSecurity.公积金Account);
    }

    // 解密家庭成员信息
    for (const relation of doc.familyRelations) {
      if (relation.idCard) {
        relation.idCard = await EncryptionUtil.decrypt(relation.idCard);
      }
      if (relation.phone) {
        relation.phone = await EncryptionUtil.decrypt(relation.phone);
      }
    }

    // 解密银行账号
    for (const account of doc.assets.bankAccounts) {
      if (account.accountNumber) {
        account.accountNumber = await EncryptionUtil.decrypt(account.accountNumber);
      }
    }
  };

  if (Array.isArray(docs)) {
    for (const doc of docs) {
      await decryptDoc(doc);
    }
  } else {
    await decryptDoc(docs);
  }
});

// 实例方法 - 添加操作日志
residentProfileSchema.methods.addOperationLog = function(operator, operation, details = '', ipAddress = '') {
  this.operationLogs.push({
    operator,
    operation,
    details,
    ipAddress,
    timestamp: new Date()
  });

  // 保留最近100条日志
  if (this.operationLogs.length > 100) {
    this.operationLogs = this.operationLogs.slice(-100);
  }

  return this.save();
};

// 实例方法 - 添加标签
residentProfileSchema.methods.addTag = function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
    return this.save();
  }
  return Promise.resolve(this);
};

// 实例方法 - 移除标签
residentProfileSchema.methods.removeTag = function(tag) {
  const index = this.tags.indexOf(tag);
  if (index > -1) {
    this.tags.splice(index, 1);
    return this.save();
  }
  return Promise.resolve(this);
};

// 实例方法 - 更新最后登录信息
residentProfileSchema.methods.updateLastLogin = function(ipAddress, device, location) {
  this.lastLogin = {
    date: new Date(),
    ipAddress,
    device,
    location
  };
  return this.save();
};

// 静态方法 - 根据身份证查找
residentProfileSchema.statics.findByIdCard = function(idCard) {
  return this.findOne({ 'personalInfo.idCard': idCard }).populate('userId', 'name phone avatar');
};

// 静态方法 - 获取统计数据
residentProfileSchema.statics.getStats = function(filters = {}) {
  const matchStage = { status: '正常', ...filters };

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1 },
        genderDistribution: {
          $push: '$personalInfo.gender'
        },
        ageGroups: {
          $push: {
            $cond: {
              if: { $lt: [{ $subtract: [new Date(), '$personalInfo.birthDate'] }, 18 * 365 * 24 * 60 * 60 * 1000] },
              then: '未成年人',
              else: {
                $cond: {
                  if: { $lt: [{ $subtract: [new Date(), '$personalInfo.birthDate'] }, 65 * 365 * 24 * 60 * 60 * 1000] },
                  then: '成年人',
                  else: '老年人'
                }
              }
            }
          }
        },
        educationDistribution: {
          $push: '$education.degree'
        },
        employmentStatuses: {
          $push: '$employment.status'
        },
        hasInsuranceCount: {
          $sum: { $cond: ['$socialSecurity.hasMedicalInsurance', 1, 0] }
        },
        tags: { $push: '$tags' }
      }
    },
    {
      $project: {
        _id: 0,
        totalCount: 1,
        genderStats: {
          $reduce: {
            input: '$genderDistribution',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $arrayToObject: [[
                    { k: '$$this', v: { $add: [{ $ifNull: [{ $indexOfArray: ['$$value', '$$this'] }, -1] }, 1] } }
                  ]]
                }
              ]
            }
          }
        },
        ageGroupStats: {
          $reduce: {
            input: '$ageGroups',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $arrayToObject: [[
                    { k: '$$this', v: { $add: [{ $ifNull: [{ $indexOfArray: ['$$value', '$$this'] }, -1] }, 1] } }
                  ]]
                }
              ]
            }
          }
        },
        educationStats: {
          $reduce: {
            input: '$educationDistribution',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $arrayToObject: [[
                    { k: '$$this', v: { $add: [{ $ifNull: [{ $indexOfArray: ['$$value', '$$this'] }, -1] }, 1] } }
                  ]]
                }
              ]
            }
          }
        },
        employmentStats: {
          $reduce: {
            input: '$employmentStatuses',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $arrayToObject: [[
                    { k: '$$this', v: { $add: [{ $ifNull: [{ $indexOfArray: ['$$value', '$$this'] }, -1] }, 1] } }
                  ]]
                }
              ]
            }
          }
        },
        insuranceRate: { $divide: ['$hasInsuranceCount', '$totalCount'] },
        tagStats: {
          $reduce: {
            input: '$tags',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $reduce: {
                    input: '$$this',
                    initialValue: {},
                    in: {
                      $mergeObjects: [
                        '$$value',
                        {
                          $arrayToObject: [[
                            { k: '$$this', v: { $add: [{ $ifNull: [{ $indexOfArray: ['$$value', '$$this'] }, -1] }, 1] } }
                          ]]
                        }
                      ]
                    }
                  }
                }
              ]
            }
          }
        }
      }
    }
  ]);
};

// 导出模型
const ResidentProfile = mongoose.model('ResidentProfile', residentProfileSchema);

module.exports = ResidentProfile;