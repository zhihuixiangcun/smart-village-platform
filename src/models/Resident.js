/**
 * 村民模型
 */

const mongoose = require('mongoose');

const residentSchema = new mongoose.Schema({
  // 基本信息
  name: {
    type: String,
    required: true,
    index: true
  },
  idCard: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  phone: {
    type: String,
    required: true,
    index: true
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
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

  // 户籍信息
  household: {
    householdNumber: {
      type: String,
      required: true,
      index: true
    },
    householderName: String,
    householderId: String,
    relationship: {
      type: String,
      enum: ['householder', 'spouse', 'child', 'parent', 'grandchild', 'grandparent', 'other'],
      default: 'other'
    },
    householdType: {
      type: String,
      enum: ['ordinary', 'low_income', 'minimum_living', 'five_guarantees', 'subsistence', 'disabled'],
      default: 'ordinary'
    },
    householdMembers: [{
      name: String,
      idCard: String,
      relationship: String,
      phone: String
    }]
  },

  // 居住地址
  address: {
    province: String,
    city: String,
    district: String,
    town: String,
    village: String,
    detailAddress: String,
    postalCode: String
  },

  // 村庄关联
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 地理位置
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  locationUpdatedAt: Date,

  // 教育信息
  education: {
    degree: {
      type: String,
      enum: ['illiterate', 'primary', 'junior_high', 'senior_high', 'college', 'bachelor', 'master', 'phd'],
      default: 'primary'
    },
    school: String,
    major: String,
    graduationYear: Number
  },

  // 职业信息
  occupation: {
    type: String,
    enum: ['farmer', 'worker', 'teacher', 'doctor', 'business', 'government', 'student', 'unemployed', 'retired', 'other'],
    default: 'farmer'
  },
  workplace: {
    name: String,
    address: String,
    phone: String,
    industry: String
  },
  annualIncome: {
    type: Number,
    min: 0
  },

  // 健康信息
  health: {
    bloodType: {
      type: String,
      enum: ['A', 'B', 'AB', 'O', 'unknown']
    },
    height: Number, // cm
    weight: Number, // kg
    allergies: [String],
    chronicDiseases: [String],
    disabilities: [{
      type: String,
      level: String,
      certificateNumber: String
    }],
    healthInsurance: {
      hasInsurance: {
        type: Boolean,
        default: false
      },
      insuranceType: String,
      insuranceNumber: String
    },
    lastPhysicalExam: Date,
    healthStatus: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'good'
    }
  },

  // 家庭信息
  family: {
    maritalStatus: {
      type: String,
      enum: ['single', 'married', 'divorced', 'widowed'],
      default: 'single'
    },
    spouse: {
      name: String,
      idCard: String,
      phone: String
    },
    children: [{
      name: String,
      idCard: String,
      birthDate: Date,
      education: String,
      occupation: String
    }],
    parents: [{
      name: String,
      idCard: String,
      phone: String,
      livingTogether: Boolean
    }]
  },

  // 财产信息
  assets: {
    house: {
      hasHouse: {
        type: Boolean,
        default: false
      },
      area: Number, // 平方米
      bedrooms: Number,
      livingRooms: Number,
      buildYear: Number,
      houseType: String
    },
    land: {
      farmlandArea: Number, // 亩
      forestLandArea: Number,
      homesteadArea: Number
    },
    vehicles: [{
      type: String, // car, motorcycle, tractor, etc.
      brand: String,
      model: String,
      plateNumber: String,
      purchaseYear: Number
    }],
    appliances: [String]
  },

  // 社保信息
  socialSecurity: {
    hasPension: {
      type: Boolean,
      default: false
    },
    pensionNumber: String,
    pensionAmount: Number,
    hasMedicalInsurance: {
      type: Boolean,
      default: false
    },
    medicalInsuranceNumber: String,
    hasUnemploymentInsurance: {
      type: Boolean,
      default: false
    },
    hasEmploymentInjuryInsurance: {
      type: Boolean,
      default: false
    },
    hasMaternityInsurance: {
      type: Boolean,
      default: false
    }
  },

  // 特殊身份
  specialIdentities: [{
    type: {
      type: String,
      enum: ['party_member', 'veteran', 'martyr_family', 'disabled', 'poverty', 'elderly', 'left_behind_children', 'empty_nester', 'entrepreneur']
    },
    certificateNumber: String,
    issuedDate: Date,
    benefits: [String]
  }],

  // 数字化信息
  digital: {
    hasSmartphone: {
      type: Boolean,
      default: false
    },
    hasInternet: {
      type: Boolean,
      default: false
    },
    wechatOpenId: String,
    alipayUserId: String,
    digitalSkills: {
      canUseSmartphone: {
        type: Boolean,
        default: false
      },
      canUseWechat: {
        type: Boolean,
        default: false
      },
      canOnlinePayment: {
        type: Boolean,
        default: false
      },
      canOnlineShopping: {
        type: Boolean,
        default: false
      }
    }
  },

  // 联系方式
  contacts: [{
    name: String,
    relationship: String,
    phone: String,
    address: String,
    isEmergency: {
      type: Boolean,
      default: false
    }
  }],

  // 参与村务情况
  villageParticipation: {
    isCommitteeMember: {
      type: Boolean,
      default: false
    },
    position: String,
    partyMember: {
      type: Boolean,
      default: false
    },
    partyJoinDate: Date,
    volunteerActivities: [{
      activity: String,
      date: Date,
      hours: Number
    }],
    suggestions: [{
      content: String,
      date: Date,
      status: {
        type: String,
        enum: ['pending', 'reviewed', 'implemented', 'rejected'],
        default: 'pending'
      }
    }]
  },

  // 务工信息（针对外出务工人员）
  migrantWork: {
    isMigrantWorker: {
      type: Boolean,
      default: false
    },
    workCity: String,
    workProvince: String,
    workCompany: String,
    monthlyIncome: Number,
    workStartDate: Date,
    homeVisitFrequency: String, // 每年回家次数
    remittanceAmount: Number // 年汇款金额
  },

  // 扶贫信息
  poverty: {
    isPovertyHousehold: {
      type: Boolean,
      default: false
    },
    povertyLevel: String,
    povertyReason: [String],
    alleviationMeasures: [String],
    alleviationDate: Date,
    annualSubsidy: Number
  },

  // 状态信息
  status: {
    type: String,
    enum: ['active', 'inactive', 'deceased', 'moved_out'],
    default: 'active',
    index: true
  },

  // 扩展数据
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },

  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 索引
residentSchema.index({ villageId: 1, status: 1, createdAt: -1 });
residentSchema.index({ 'household.householdNumber': 1, status: 1 });
residentSchema.index({ age: 1, gender: 1 });
residentSchema.index({ 'specialIdentities.type': 1 });
residentSchema.index({ phone: 1 });

// 虚拟字段
residentSchema.virtual('currentAge').get(function() {
  if (this.birthDate) {
    const today = new Date();
    const birthDate = new Date(this.birthDate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
  return this.age || 0;
});

residentSchema.virtual('isElderly').get(function() {
  return this.currentAge >= 60;
});

residentSchema.virtual('isMinor').get(function() {
  return this.currentAge < 18;
});

residentSchema.virtual('isWorkingAge').get(function() {
  return this.currentAge >= 18 && this.currentAge < 60;
});

residentSchema.virtual('isLeftBehindChild').get(function() {
  return this.isMinor && this.migrantWork && this.migrantWork.isMigrantWorker;
});

residentSchema.virtual('isEmptyNester').get(function() {
  return this.isElderly && this.family.children.length === 0 && this.migrantWork && !this.migrantWork.isMigrantWorker;
});

// 实例方法
residentSchema.methods.updateLocation = function(longitude, latitude) {
  this.location = {
    type: 'Point',
    coordinates: [longitude, latitude]
  };
  this.locationUpdatedAt = new Date();
  this.updatedAt = new Date();
  return this.save();
};

residentSchema.methods.addSpecialIdentity = function(identityType, certificateNumber) {
  this.specialIdentities.push({
    type: identityType,
    certificateNumber,
    issuedDate: new Date()
  });
  this.updatedAt = new Date();
  return this.save();
};

residentSchema.methods.updateHealthInfo = function(healthData) {
  this.health = { ...this.health, ...healthData };
  this.health.lastPhysicalExam = new Date();
  this.updatedAt = new Date();
  return this.save();
};

residentSchema.methods.addFamilyMember = function(member) {
  if (!this.household.householdMembers) {
    this.household.householdMembers = [];
  }
  this.household.householdMembers.push(member);
  this.updatedAt = new Date();
  return this.save();
};

// 静态方法
residentSchema.statics.findByVillage = function(villageId, options = {}) {
  const {
    status = 'active',
    ageRange,
    gender,
    occupation,
    page = 1,
    limit = 20
  } = options;

  const query = { villageId, status };

  if (ageRange) {
    const [minAge, maxAge] = ageRange;
    const currentYear = new Date().getFullYear();
    const minBirthYear = currentYear - maxAge;
    const maxBirthYear = currentYear - minAge;

    query.birthDate = {
      $gte: new Date(`${minBirthYear}-01-01`),
      $lte: new Date(`${maxBirthYear}-12-31`)
    };
  }

  if (gender) query.gender = gender;
  if (occupation) query.occupation = occupation;

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

residentSchema.statics.findByHousehold = function(householdNumber) {
  return this.find({ 'household.householdNumber': householdNumber, status: 'active' })
    .sort({ 'household.relationship': 1 }); // 户主排在前面
};

residentSchema.statics.findSpecialGroups = function(villageId, groupType) {
  const query = { villageId, status: 'active' };

  switch (groupType) {
    case 'elderly':
      query.birthDate = { $lte: new Date(`${new Date().getFullYear() - 60}-01-01`) };
      break;
    case 'disabled':
      query['health.disabilities.0'] = { $exists: true };
      break;
    case 'poverty':
      query['poverty.isPovertyHousehold'] = true;
      break;
    case 'party_member':
      query['villageParticipation.partyMember'] = true;
      break;
    case 'migrant_worker':
      query['migrantWork.isMigrantWorker'] = true;
      break;
    case 'left_behind_children':
      query.birthDate = { $gte: new Date(`${new Date().getFullYear() - 18}-01-01`) };
      query['migrantWork.isMigrantWorker'] = true;
      break;
    default:
      query['specialIdentities.type'] = groupType;
  }

  return this.find(query).sort({ name: 1 });
};

residentSchema.statics.getResidentStats = function(villageId) {
  return this.aggregate([
    {
      $match: { villageId: new mongoose.Types.ObjectId(villageId), status: 'active' }
    },
    {
      $group: {
        _id: null,
        totalResidents: { $sum: 1 },
        males: {
          $sum: { $cond: [{ $eq: ['$gender', 'male'] }, 1, 0] }
        },
        females: {
          $sum: { $cond: [{ $eq: ['$gender', 'female'] }, 1, 0] }
        },
        elderly: {
          $sum: {
            $cond: [
              { $lte: [{ $subtract: [new Date(), '$birthDate'] }, 365.25 * 60 * 24 * 60 * 60 * 1000] },
              1,
              0
            ]
          }
        },
        minors: {
          $sum: {
            $cond: [
              { $lte: [{ $subtract: [new Date(), '$birthDate'] }, 365.25 * 18 * 24 * 60 * 60 * 1000] },
              1,
              0
            ]
          }
        },
        avgAge: { $avg: '$age' },
        totalIncome: { $sum: '$annualIncome' },
        povertyHouseholds: {
          $sum: { $cond: ['$poverty.isPovertyHousehold', 1, 0] }
        },
        partyMembers: {
          $sum: { $cond: ['$villageParticipation.partyMember', 1, 0] }
        },
        migrantWorkers: {
          $sum: { $cond: ['$migrantWork.isMigrantWorker', 1, 0] }
        }
      }
    }
  ]);
};

residentSchema.statics.searchResidents = function(villageId, keyword, options = {}) {
  const {
    gender,
    ageRange,
    occupation,
    education,
    hasSmartphone,
    limit = 20,
    page = 1
  } = options;

  const query = {
    villageId,
    status: 'active',
    $or: [
      { name: { $regex: keyword, $options: 'i' } },
      { idCard: { $regex: keyword, $options: 'i' } },
      { phone: { $regex: keyword, $options: 'i' } },
      { address.detailAddress: { $regex: keyword, $options: 'i' } }
    ]
  };

  if (gender) query.gender = gender;
  if (occupation) query.occupation = occupation;
  if (education) query['education.degree'] = education;
  if (hasSmartphone !== undefined) query['digital.hasSmartphone'] = hasSmartphone;

  if (ageRange) {
    const [minAge, maxAge] = ageRange;
    const currentYear = new Date().getFullYear();
    const minBirthYear = currentYear - maxAge;
    const maxBirthYear = currentYear - minAge;

    query.birthDate = {
      $gte: new Date(`${minBirthYear}-01-01`),
      $lte: new Date(`${maxBirthYear}-12-31`)
    };
  }

  return this.find(query)
    .sort({ name: 1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

// 导出模型
module.exports = mongoose.model('Resident', residentSchema);