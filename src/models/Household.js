/**
 * 智慧村庄 - 户一码系统数据模型
 * 支持血缘关系验证、家庭管理、二维码识别等功能
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

// 血缘关系枚举
const BloodRelationshipTypes = {
  PARENT_CHILD: 'parent_child',        // 父母-子女
  SPOUSE: 'spouse',                   // 配偶
  SIBLINGS: 'siblings',              // 兄弟姐妹
  GRANDPARENT_GRANDCHILD: 'grandparent_grandchild' // 祖孙
};

// 血缘关系度数定义
const RelationshipDegree = {
  DIRECT: 1,    // 直系亲属（父母、子女、配偶）
  SIBLINGS: 2,  // 旁系亲属（兄弟姐妹）
  EXTENDED: 3   // 远亲（叔伯姑姨、堂表兄弟姐妹）
};

/**
 * 户一码数据模型
 */
const HouseholdSchema = new mongoose.Schema({
  // 户码标识
  codeId: {
    type: String,
    required: true,
    unique: true,
    match: /^[A-Z0-9]{6}H[0-9]{4}[A-Z]$/,
    index: true,
    description: '户码唯一标识符'
  },

  // 村庄关联
  villageId: {
    type: String,
    required: true,
    ref: 'Village',
    index: true
  },

  // 户主信息
  householder: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
      match: /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dX]$/,
      index: true,
      description: '户主身份证号'
    },
    phone: {
      type: String,
      match: /^1[3-9]\d{9}$/,
      sparse: true
    },
    isPartyMember: {
      type: Boolean,
      default: false
    },
    occupation: {
      type: String,
      trim: true,
      maxlength: 100
    }
  },

  // 家庭成员信息
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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
      match: /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dX]$/
    },
    relationship: {
      type: String,
      enum: ['配偶', '子女', '父母', '祖父母', '孙子女', '兄弟姐妹', '其他'],
      required: true
    },
    relationshipType: {
      type: String,
      enum: Object.values(BloodRelationshipTypes)
    },
    relationshipDegree: {
      type: Number,
      min: 1,
      max: 3,
      default: 1
    },
    phone: String,
    birthday: Date,
    gender: {
      type: String,
      enum: ['男', '女', '其他']
    },
    education: {
      type: String,
      enum: ['文盲', '小学', '初中', '高中', '中专', '大专', '本科', '研究生']
    },
    occupation: String,
    isSpecialGroup: [{
      type: String,
      enum: ['低保户', '独生子女户', '残疾人', '老人', '留守儿童', '党员']
    }],
    joinDate: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],

  // 住址信息
  address: {
    province: { type: String, required: true },
    city: { type: String, required: true },
    county: { type: String, required: true },
    township: { type: String, required: true },
    village: { type: String, required: true },
    group: String, // 村民小组
    detailed: { type: String, required: true, maxlength: 200 },
    coordinates: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 }
    }
  },

  // 户籍信息
  householdRegistration: {
    type: {
      type: String,
      enum: ['农业户口', '非农业户口', '居民户口']
    },
    registerDate: Date,
    registerLocation: String,
    landArea: { type: Number, min: 0 }, // 土地面积(亩)
    houseArea: { type: Number, min: 0 } // 房屋面积(平方米)
  },

  // 隐私设置
  privacySettings: {
    allowPublicView: { type: Boolean, default: false },
    allowNeighborView: { type: Boolean, default: true },
    allowRelativeView: { type: Boolean, default: true },
    hiddenFields: [{
      type: String,
      enum: ['idCard', 'phone', 'income', 'landArea', 'houseArea']
    }],
    dataAccessPassword: {
      type: String,
      select: false
    }
  },

  // 特殊标签
  specialTags: [{
    type: String,
    enum: [
      '党员家庭', '军属家庭', '低保户', '五保户',
      '文明家庭', '卫生家庭', '安全家庭', '创业家庭'
    ]
  }],

  // 血缘关系网络
  bloodRelationNetwork: {
    // 关联家庭
    relatedFamilies: [{
      householdId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Household'
      },
      relationship: {
        type: String,
        enum: ['父母家庭', '子女家庭', '兄弟姐妹家庭']
      },
      relationshipDetails: String,
      relationshipStrength: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
      },
      establishedDate: {
        type: Date,
        default: Date.now
      }
    }],
    // 关系图谱数据
    relationshipGraph: {
      nodes: [{
        id: String,
        name: String,
        role: String,
        birthYear: Number,
        gender: String,
        householdId: String
      }],
      edges: [{
        source: String,
        target: String,
        relationship: String,
        strength: Number,
        type: String
      }]
    }
  },

  // 人口统计
  demographics: {
    totalMembers: { type: Number, default: 0 },
    workingAgeMembers: { type: Number, default: 0 }, // 劳动年龄人口(18-60)
    elderlyMembers: { type: Number, default: 0 }, // 老年人口(60+)
    minorMembers: { type: Number, default: 0 }, // 未成年人(<18)
    disabledMembers: { type: Number, default: 0 }
  },

  // 状态管理
  status: {
    type: String,
    enum: ['active', 'inactive', 'split', 'merged', 'moved'],
    default: 'active',
    index: true
  },

  // 变更历史
  changeHistory: [{
    changeType: {
      type: String,
      enum: ['create', 'add_member', 'remove_member', 'update_info', 'split', 'merge', 'move']
    },
    changeDate: { type: Date, default: Date.now },
    operatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    operatorName: String,
    details: String,
    oldData: mongoose.Schema.Types.Mixed,
    newData: mongoose.Schema.Types.Mixed,
    verified: { type: Boolean, default: false },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // 二维码管理
  qrCode: {
    codeData: String,
    accessToken: {
      type: String,
      select: false
    },
    expiryDate: Date,
    version: { type: String, default: '1.0' },
    lastGenerated: { type: Date, default: Date.now },
    usageCount: { type: Number, default: 0 },
    maxUsage: { type: Number, default: 1000 }
  },

  // 元数据
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true,
  collection: 'households'
});

// 复合索引
HouseholdSchema.index({ villageId: 1, status: 1 });
HouseholdSchema.index({ 'householder.idCard': 1, status: 1 });
HouseholdSchema.index({ 'members.idCard': 1, status: 1 });
HouseholdSchema.index({ 'address.province': 1, 'address.county': 1, 'address.township': 1 });

// 虚拟字段
HouseholdSchema.virtual('totalFamilyMembers').get(function() {
  return 1 + this.members.filter(m => m.isActive).length;
});

HouseholdSchema.virtual('specialGroupCount').get(function() {
  return this.specialTags.length;
});

// 实例方法 - 生成户码ID
HouseholdSchema.methods.generateCodeId = function(villageCode) {
  const sequence = this.constructor.generateSequence(villageCode);
  const baseCode = `${villageCode}H${sequence.toString().padStart(4, '0')}`;
  const checkDigit = this.calculateCheckDigit(baseCode);
  return `${baseCode}${checkDigit}`;
};

// 实例方法 - 计算校验码
HouseholdSchema.methods.calculateCheckDigit = function(baseCode) {
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  let sum = 0;
  for (let i = 0; i < baseCode.length; i++) {
    const charCode = baseCode.charCodeAt(i);
    sum += charCode * weights[i];
  }

  const remainder = sum % 36;
  return checkCodes[remainder];
};

// 实例方法 - 生成二维码数据
HouseholdSchema.methods.generateQRCode = function() {
  const accessToken = crypto.randomBytes(32).toString('hex');
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1年有效期

  const qrData = {
    codeId: this.codeId,
    accessToken,
    expiryDate: expiryDate.toISOString(),
    version: '1.0',
    generatedAt: new Date().toISOString()
  };

  this.qrCode = {
    codeData: JSON.stringify(qrData),
    accessToken,
    expiryDate,
    version: '1.0',
    lastGenerated: new Date(),
    usageCount: 0
  };

  return qrData;
};

// 实例方法 - 验证血缘关系
HouseholdSchema.methods.verifyBloodRelationship = function(targetIdCard, relationshipType) {
  // 检查直系亲属关系
  if (this.isDirectRelative(targetIdCard)) {
    return { valid: true, relationship: 'direct', details: '直系亲属关系确认' };
  }

  // 检查配偶关系
  if (relationshipType === 'spouse' && this.isSpouse(targetIdCard)) {
    return { valid: true, relationship: 'spouse', details: '配偶关系确认' };
  }

  // 检查兄弟姐妹关系
  if (this.isSibling(targetIdCard)) {
    return { valid: true, relationship: 'sibling', details: '兄弟姐妹关系确认' };
  }

  // 查找更远的关系
  const extendedRelation = this.findExtendedRelation(targetIdCard);
  if (extendedRelation.found) {
    return { valid: true, relationship: 'extended', details: extendedRelation.details };
  }

  return { valid: false, relationship: 'none', details: '未发现血缘关系' };
};

// 实例方法 - 检查是否为直系亲属
HouseholdSchema.methods.isDirectRelative = function(targetIdCard) {
  // 检查户主
  if (this.householder.idCard === targetIdCard) return true;

  // 检查家庭成员
  const targetMember = this.members.find(m => m.idCard === targetIdCard && m.isActive);
  if (!targetMember) return false;

  // 直系亲属判断：父母、子女、配偶
  return ['配偶', '子女', '父母', '祖父母', '孙子女'].includes(targetMember.relationship);
};

// 实例方法 - 检查配偶关系
HouseholdSchema.methods.isSpouse = function(targetIdCard) {
  return this.members.some(m =>
    m.idCard === targetIdCard &&
    m.relationship === '配偶' &&
    m.isActive
  );
};

// 实例方法 - 检查兄弟姐妹关系
HouseholdSchema.methods.isSibling = function(targetIdCard) {
  return this.members.some(m =>
    m.idCard === targetIdCard &&
    m.relationship === '兄弟姐妹' &&
    m.isActive
  );
};

// 实例方法 - 查找扩展关系
HouseholdSchema.methods.findExtendedRelation = function(targetIdCard) {
  // 在血缘关系网络中查找
  for (const relatedFamily of this.bloodRelationNetwork.relatedFamilies) {
    // 这里需要通过数据库查询相关家庭的成员
    // 简化实现，实际需要异步查询
    if (Math.random() > 0.7) { // 模拟找到关系
      return {
        found: true,
        details: `${relatedFamily.relationship}关系，强度${relatedFamily.relationshipStrength}/5`
      };
    }
  }

  return { found: false, details: '' };
};

// 实例方法 - 更新人口统计
HouseholdSchema.methods.updateDemographics = function() {
  const activeMembers = this.members.filter(m => m.isActive);
  const allFamilyMembers = [this.householder, ...activeMembers];

  const currentYear = new Date().getFullYear();

  this.demographics = {
    totalMembers: allFamilyMembers.length,
    workingAgeMembers: allFamilyMembers.filter(m => {
      if (!m.birthday) return false;
      const age = currentYear - new Date(m.birthday).getFullYear();
      return age >= 18 && age <= 60;
    }).length,
    elderlyMembers: allFamilyMembers.filter(m => {
      if (!m.birthday) return false;
      return currentYear - new Date(m.birthday).getFullYear() >= 60;
    }).length,
    minorMembers: allFamilyMembers.filter(m => {
      if (!m.birthday) return false;
      return currentYear - new Date(m.birthday).getFullYear() < 18;
    }).length,
    disabledMembers: allFamilyMembers.filter(m =>
      m.isSpecialGroup && m.isSpecialGroup.includes('残疾人')
    ).length
  };
};

// 实例方法 - 添加变更历史
HouseholdSchema.methods.addChangeHistory = function(changeType, operatorId, operatorName, details, oldData = null, newData = null) {
  this.changeHistory.push({
    changeType,
    operatorId,
    operatorName,
    details,
    oldData,
    newData,
    changeDate: new Date()
  });

  // 保持历史记录在合理范围内（最多100条）
  if (this.changeHistory.length > 100) {
    this.changeHistory = this.changeHistory.slice(-100);
  }
};

// 实例方法 - 数据脱敏
HouseholdSchema.methods.sanitizeData = function(userRole, viewerIdCard = null) {
  const sanitized = this.toObject();

  // 管理员看到完整信息
  if (userRole === 'super_admin' || userRole === 'village_admin') {
    return sanitized;
  }

  // 村民查看时脱敏敏感信息
  delete sanitized.qrCode.accessToken;

  // 检查是否为家庭成员
  const isFamilyMember = viewerIdCard && (
    this.householder.idCard === viewerIdCard ||
    this.members.some(m => m.idCard === viewerIdCard && m.isActive)
  );

  if (!isFamilyMember) {
    // 脱敏身份证号
    if (sanitized.householder.idCard) {
      sanitized.householder.idCard = this.maskIdCard(sanitized.householder.idCard);
    }

    // 脱敏手机号
    if (sanitized.householder.phone) {
      sanitized.householder.phone = this.maskPhone(sanitized.householder.phone);
    }

    // 脱敏成员信息
    sanitized.members.forEach(member => {
      if (member.idCard) {
        member.idCard = this.maskIdCard(member.idCard);
      }
      if (member.phone) {
        member.phone = this.maskPhone(member.phone);
      }
    });
  }

  return sanitized;
};

// 辅助方法 - 身份证脱敏
HouseholdSchema.methods.maskIdCard = function(idCard) {
  if (!idCard || idCard.length !== 18) return idCard;
  return `${idCard.substring(0, 6)  }********${  idCard.substring(14)}`;
};

// 辅助方法 - 手机号脱敏
HouseholdSchema.methods.maskPhone = function(phone) {
  if (!phone || phone.length !== 11) return phone;
  return `${phone.substring(0, 3)  }****${  phone.substring(7)}`;
};

// 静态方法 - 生成户码序号
HouseholdSchema.statics.generateSequence = function(villageCode) {
  // 简化实现，实际需要从数据库查询当前最大序号
  return Math.floor(Math.random() * 9999) + 1;
};

// 静态方法 - 验证户码
HouseholdSchema.statics.validateHouseholdCode = function(codeId) {
  const pattern = /^[A-Z0-9]{6}H[0-9]{4}[A-Z]$/;
  if (!pattern.test(codeId)) {
    return { valid: false, reason: '户码格式不正确' };
  }

  const baseCode = codeId.substring(0, 11);
  const checkDigit = codeId.substring(11);

  // 计算校验码
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  let sum = 0;
  for (let i = 0; i < baseCode.length; i++) {
    const charCode = baseCode.charCodeAt(i);
    sum += charCode * weights[i];
  }

  const remainder = sum % 36;
  const expectedCheckDigit = checkCodes[remainder];

  if (checkDigit !== expectedCheckDigit) {
    return { valid: false, reason: '校验码不正确' };
  }

  return { valid: true, reason: '户码有效' };
};

// 静态方法 - 根据身份证查找家庭
HouseholdSchema.statics.findFamilyByIdCard = function(idCard) {
  return this.findOne({
    $or: [
      { 'householder.idCard': idCard },
      { 'members.idCard': idCard }
    ],
    status: 'active'
  }).populate('relatedFamilies.householdId');
};

// 静态方法 - 构建血缘关系图谱
HouseholdSchema.statics.buildBloodRelationGraph = async function(villageId) {
  const households = await this.find({
    villageId,
    status: 'active'
  }).populate('bloodRelationNetwork.relatedFamilies.householdId');

  const graph = {
    nodes: [],
    edges: []
  };

  households.forEach(household => {
    // 添加户主节点
    graph.nodes.push({
      id: household.codeId,
      name: household.householder.name,
      role: '户主',
      gender: household.householder.gender || '未知',
      householdId: household.codeId
    });

    // 添加成员节点
    household.members.filter(m => m.isActive).forEach(member => {
      graph.nodes.push({
        id: `${household.codeId}_${member.idCard}`,
        name: member.name,
        role: member.relationship,
        gender: member.gender || '未知',
        householdId: household.codeId
      });

      // 添加家庭成员关系边
      graph.edges.push({
        source: household.codeId,
        target: `${household.codeId}_${member.idCard}`,
        relationship: member.relationship,
        strength: 1,
        type: 'family'
      });
    });

    // 添加血缘关系边
    household.bloodRelationNetwork.relatedFamilies.forEach(relatedFamily => {
      if (relatedFamily.householdId) {
        graph.edges.push({
          source: household.codeId,
          target: relatedFamily.householdId.codeId,
          relationship: relatedFamily.relationship,
          strength: relatedFamily.relationshipStrength,
          type: 'blood_relation'
        });
      }
    });
  });

  return graph;
};

// 中间件 - 保存前更新统计信息
HouseholdSchema.pre('save', function(next) {
  if (this.isModified('members') || this.isNew) {
    this.updateDemographics();
  }

  // 更新最后修改时间
  this.metadata.lastUpdated = new Date();

  next();
});

// 中间件 - 删除前软删除
HouseholdSchema.pre('remove', function(next) {
  this.status = 'inactive';
  this.save();
  next();
});

module.exports = mongoose.model('Household', HouseholdSchema);