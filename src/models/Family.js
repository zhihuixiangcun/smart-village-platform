/**
 * 家庭模型
 * 实现一户一码管理
 */

const mongoose = require('mongoose');
const EncryptionUtil = require('../utils/encryption');
const { generateFamilyCode } = require('../utils/codeGenerator');

const familySchema = new mongoose.Schema({
  // 家庭基本信息
  familyCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: generateFamilyCode
  },
  familyName: {
    type: String,
    required: true,
    trim: true
  },
  familyType: {
    type: String,
    enum: ['普通户', '低保户', '特困户', '独生户', '双女户', '其他'],
    default: '普通户'
  },

  // 住址信息
  address: {
    province: { type: String, required: true },
    city: { type: String, required: true },
    county: { type: String, required: true },
    town: { type: String, required: true },
    village: { type: String, required: true },
    group: { type: String }, // 村民组
    detail: { type: String } // 详细地址
  },

  // 联系方式
  contact: {
    primaryPhone: {
      type: String,
      required: true,
      encrypted: true
    },
    secondaryPhone: {
      type: String,
      encrypted: true
    },
    emergencyContact: {
      name: { type: String },
      phone: { type: String, encrypted: true },
      relationship: { type: String }
    }
  },

  // 家庭成员
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      // ref: 'User',
      required: true
    },
    name: { type: String, required: true },
    idCard: {
      type: String,
      required: true,
      encrypted: true
    },
    relationship: {
      type: String,
      enum: ['户主', '配偶', '子女', '父母', '祖父母', '兄弟姐妹', '其他'],
      required: true
    },
    isHead: { type: Boolean, default: false },
    phone: { type: String, encrypted: true },
    occupation: { type: String },
    education: {
      type: String,
      enum: ['文盲', '小学', '初中', '高中', '大专', '本科', '研究生']
    },
    healthStatus: {
      type: String,
      enum: ['健康', '慢性病', '残疾', '大病', '其他'],
      default: '健康'
    },
    insuranceType: [{
      type: String,
      enum: ['城镇职工医保', '城乡居民医保', '商业保险', '无']
    }],
    joinDate: { type: Date, default: Date.now }
  }],

  // 房屋信息
  housing: {
    type: {
      type: String,
      enum: ['自建房', '商品房', '公租房', '其他'],
      default: '自建房'
    },
    area: { type: Number }, // 建筑面积（平方米）
    rooms: { type: Number }, // 房间数
    hasToilet: { type: Boolean, default: true },
    hasKitchen: { type: Boolean, default: true },
    hasWater: { type: Boolean, default: true },
    hasElectricity: { type: Boolean, default: true },
    hasInternet: { type: Boolean, default: false },
    housingCondition: {
      type: String,
      enum: ['优', '良', '中', '差'],
      default: '良'
    }
  },

  // 经济状况
  economic: {
    annualIncome: { type: Number }, // 年收入（元）
    incomeSource: [{
      type: String,
      enum: ['务农', '务工', '经商', '养殖', '种植', '补贴', '其他']
    }],
    assets: {
      farmland: { type: Number }, // 耕地面积（亩）
      forestland: { type: Number }, // 林地面积（亩）
      housingArea: { type: Number }, // 宅基地面积（平方米）
      vehicles: { type: Number }, // 车辆数
      appliances: [{
        type: String,
        enum: ['电视', '冰箱', '洗衣机', '空调', '电脑', '热水器', '其他']
      }]
    },
    povertyStatus: {
      type: String,
      enum: ['非贫困户', '建档立卡户', '低保户', '特困供养户'],
      default: '非贫困户'
    }
  },

  // 特殊标记
  tags: [{
    type: String,
    enum: ['党员户', '军人家庭', '优抚对象', '残疾人家庭', '留守儿童', '空巢老人', '其他']
  }],

  // 代理关系（用于子女帮助父母操作）
  agents: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: { type: String },
    relationship: { type: String },
    permissions: [{
      type: String,
      enum: ['查看档案', '办理业务', '代签文件', '其他']
    }],
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true }
  }],

  // 状态信息
  status: {
    type: String,
    enum: ['正常', '迁出', '注销', '合并'],
    default: '正常'
  },

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

  // 版本号（用于乐观锁）
  __v: { type: Number, select: false }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
familySchema.index({ 'address.village': 1, 'familyCode': 1 });
familySchema.index({ 'familyType': 1 });
familySchema.index({ 'tags': 1 });
familySchema.index({ 'status': 1 });
familySchema.index({ 'members.idCard': 1 });
familySchema.index({ createdAt: -1 });

// 虚拟字段 - 家庭人数
familySchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// 虚拟字段 - 户主信息
familySchema.virtual('headOfFamily').get(function() {
  return this.members.find(member => member.isHead);
});

// 虚拟字段 - QR码URL
familySchema.virtual('qrCodeUrl').get(function() {
  return `${process.env.CLIENT_URL}/family/${this.familyCode}`;
});

// 中间件 - 保存前加密敏感数据
familySchema.pre('save', async function(next) {
  try {
    // 加密联系电话
    if (this.contact.primaryPhone) {
      this.contact.primaryPhone = EncryptionUtil.encrypt(this.contact.primaryPhone);
    }
    if (this.contact.secondaryPhone) {
      this.contact.secondaryPhone = EncryptionUtil.encrypt(this.contact.secondaryPhone);
    }
    if (this.contact.emergencyContact.phone) {
      this.contact.emergencyContact.phone = EncryptionUtil.encrypt(this.contact.emergencyContact.phone);
    }

    // 加密成员身份证和电话
    for (const member of this.members) {
      if (member.idCard) {
        member.idCard = EncryptionUtil.encrypt(member.idCard);
      }
      if (member.phone) {
        member.phone = EncryptionUtil.encrypt(member.phone);
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// 中间件 - 查询后解密数据
familySchema.post(['find', 'findOne'], async function(docs) {
  if (!docs) return;

  const decryptDoc = async (doc) => {
    if (!doc) return;

    // 解密联系电话
    if (doc.contact.primaryPhone) {
      doc.contact.primaryPhone = EncryptionUtil.decrypt(doc.contact.primaryPhone);
    }
    if (doc.contact.secondaryPhone) {
      doc.contact.secondaryPhone = EncryptionUtil.decrypt(doc.contact.secondaryPhone);
    }
    if (doc.contact.emergencyContact.phone) {
      doc.contact.emergencyContact.phone = EncryptionUtil.decrypt(doc.contact.emergencyContact.phone);
    }

    // 解密成员信息
    for (const member of doc.members) {
      if (member.idCard) {
        member.idCard = EncryptionUtil.decrypt(member.idCard);
      }
      if (member.phone) {
        member.phone = EncryptionUtil.decrypt(member.phone);
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

// 实例方法 - 添加家庭成员
familySchema.methods.addMember = function(memberData) {
  // 如果添加的是户主，先将其他成员的isHead设为false
  if (memberData.isHead) {
    this.members.forEach(member => member.isHead = false);
  }

  // 设置加入日期
  memberData.joinDate = new Date();

  // 添加成员
  this.members.push(memberData);

  return this.save();
};

// 实例方法 - 移除家庭成员
familySchema.methods.removeMember = function(memberId) {
  this.members = this.members.filter(member =>
    member._id.toString() !== memberId.toString()
  );
  return this.save();
};

// 实例方法 - 更新家庭成员信息
familySchema.methods.updateMember = function(memberId, updateData) {
  const memberIndex = this.members.findIndex(member =>
    member._id.toString() === memberId.toString()
  );

  if (memberIndex !== -1) {
    // 如果更新为户主，先将其他成员的isHead设为false
    if (updateData.isHead) {
      this.members.forEach(member => member.isHead = false);
    }

    Object.assign(this.members[memberIndex], updateData);
    return this.save();
  }

  throw new Error('成员不存在');
};

// 实例方法 - 添加代理关系
familySchema.methods.addAgent = function(agentData) {
  // 检查是否已存在代理关系
  const existingAgent = this.agents.find(agent =>
    agent.userId.toString() === agentData.userId.toString()
  );

  if (existingAgent) {
    // 更新现有代理关系
    Object.assign(existingAgent, agentData);
  } else {
    // 添加新代理关系
    this.agents.push({
      ...agentData,
      startDate: agentData.startDate || new Date(),
      isActive: true
    });
  }

  return this.save();
};

// 实例方法 - 检查代理权限
familySchema.methods.hasAgentPermission = function(userId, permission) {
  const agent = this.agents.find(agent =>
    agent.userId.toString() === userId.toString() &&
    agent.isActive &&
    (!agent.endDate || agent.endDate > new Date())
  );

  return agent && agent.permissions.includes(permission);
};

// 静态方法 - 根据家庭编码查找
familySchema.statics.findByFamilyCode = function(familyCode) {
  return this.findOne({ familyCode }).populate('members.userId', 'name phone avatar');
};

// 静态方法 - 根据身份证查找家庭
familySchema.statics.findByIdCard = function(idCard) {
  return this.findOne({ 'members.idCard': idCard }).populate('members.userId', 'name phone avatar');
};

// 静态方法 - 获取 village 的统计数据
familySchema.statics.getVillageStats = function(villageName) {
  return this.aggregate([
    { $match: { 'address.village': villageName, status: '正常' } },
    {
      $group: {
        _id: null,
        totalFamilies: { $sum: 1 },
        totalMembers: { $sum: { $size: '$members' } },
        familyTypes: {
          $push: '$familyType'
        },
        povertyCount: {
          $sum: {
            $cond: [
              { $ne: ['$economic.povertyStatus', '非贫困户'] },
              1,
              0
            ]
          }
        },
        specialTags: { $push: '$tags' }
      }
    },
    {
      $project: {
        _id: 0,
        totalFamilies: 1,
        totalMembers: 1,
        avgFamilySize: { $divide: ['$totalMembers', '$totalFamilies'] },
        familyTypeDistribution: {
          $reduce: {
            input: '$familyTypes',
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
        povertyCount: 1,
        specialTagDistribution: {
          $reduce: {
            input: '$specialTags',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $arrayToObject: [[
                    { k: { $arrayElemAt: ['$$this', 0] }, v: { $add: [{ $ifNull: [{ $indexOfArray: ['$$value', { $arrayElemAt: ['$$this', 0] }] }, -1] }, 1] } }
                  ]]
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
const Family = mongoose.model('Family', familySchema);

module.exports = Family;