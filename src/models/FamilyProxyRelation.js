const mongoose = require('mongoose');

const FamilyProxyRelationSchema = new mongoose.Schema({
  // 关系基础信息
  agentUserId: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true,
    index: true,
    comment: '代理人用户ID（操作者）'
  },
  principalUserId: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true,
    index: true,
    comment: '被代理人用户ID（被代表者）'
  },

  // 关系定义
  relationship: {
    type: String,
    required: true,
    enum: ['spouse', 'parent', 'child', 'sibling', 'grandparent', 'grandchild', 'guardian', 'other'],
    comment: '关系类型'
  },
  relationshipDescription: {
    type: String,
    maxlength: 100,
    comment: '关系描述（当关系类型为other时）'
  },

  // 验证信息
  verificationMethod: {
    type: String,
    required: true,
    enum: ['household_registration', 'village_committee', 'documents', 'witnesses', 'multi_method'],
    comment: '验证方法'
  },
  verificationStatus: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected', 'expired'],
    default: 'pending',
    index: true,
    comment: '验证状态'
  },

  // 验证证据
  evidence: {
    // 户口本验证
    householdRegistration: {
      registrationNumber: String,
      householdType: String,
      registrationAddress: String,
      relationshipProof: String,
      verified: Boolean,
      verifiedAt: Date,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },

    // 村委会证明
    villageCommittee: {
      certificateNumber: String,
      issuingVillage: String,
      issuingAuthority: String,
      issueDate: Date,
      validUntil: Date,
      witnessContact: String,
      verified: Boolean,
      verifiedAt: Date,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },

    // 文档证据
    documents: [{
      type: String,
      originalName: String,
      uploadPath: String,
      documentType: {
        type: String,
        enum: ['birth_certificate', 'marriage_certificate', 'household_book', 'id_card', 'other']
      },
      description: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      },
      verified: {
        type: Boolean,
        default: false
      },
      verificationNotes: String
    }],

    // 证人信息
    witnesses: [{
      name: String,
      contact: String,
      relationship: String,
      statement: String,
      verified: {
        type: Boolean,
        default: false
      },
      verificationDate: Date,
      verificationMethod: {
        type: String,
        enum: ['phone', 'in_person', 'video', 'document']
      }
    }]
  },

  // 人脸识别验证
  faceVerification: {
    requiredImages: {
      agent: [{
        type: String,
        comment: '代理人脸部照片路径'
      }],
      principal: [{
        type: String,
        comment: '被代理人脸部照片路径'
      }],
      together: [{
        type: String,
        comment: '合影照片路径'
      }]
    },
    verificationResults: {
      agentVerified: {
        type: Boolean,
        default: false
      },
      principalVerified: {
        type: Boolean,
        default: false
      },
      relationshipVerified: {
        type: Boolean,
        default: false
      },
      confidenceScore: Number,
      verifiedAt: Date
    }
  },

  // 审核信息
  reviewProcess: [{
    step: String,
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    decision: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'requires_more_info']
    },
    comments: String,
    reviewedAt: {
      type: Date,
      default: Date.now
    },
    evidence: [String]
  }],

  // 权限配置
  permissions: {
    allowedOperations: [{
      type: String,
      enum: ['VIEW', 'EDIT', 'SUBMIT', 'APPROVE', 'FINANCIAL', 'PERSONAL', 'REPRESENTATIVE']
    }],
    dataAccessLevels: [{
      type: String,
      enum: ['basic', 'detailed', 'sensitive', 'financial', 'medical']
    }],
    timeRestrictions: {
      allowedHours: {
        start: String,  // "08:00"
        end: String    // "22:00"
      },
      allowedDays: [Number], // [1,2,3,4,5] (周一到周五)
      maxDailyOperations: Number,
      maxWeeklyOperations: Number
    },
    specialRestrictions: [String]
  },

  // 状态和时间
  status: {
    type: String,
    required: true,
    enum: ['active', 'suspended', 'terminated', 'expired'],
    default: 'active',
    index: true
  },
  effectiveDate: {
    type: Date,
    default: Date.now,
    comment: '生效时间'
  },
  expiryDate: {
    type: Date,
    comment: '过期时间'
  },
  lastUsedAt: {
    type: Date,
    comment: '最后使用时间'
  },

  // 统计信息
  usageStats: {
    totalSessions: {
      type: Number,
      default: 0
    },
    totalOperations: {
      type: Number,
      default: 0
    },
    lastOperationType: String,
    lastOperationDate: Date
  },

  // 风险评估
  riskAssessment: {
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    riskFactors: [String],
    lastAssessment: {
      type: Date,
      default: Date.now
    },
    mitigationMeasures: [String]
  },

  // 备注和日志
  notes: String,
  creationNotes: String,
  modificationHistory: [{
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    modifiedAt: {
      type: Date,
      default: Date.now
    },
    changes: String,
    reason: String
  }]
}, {
  timestamps: true,
  collection: 'family_proxy_relations'
});

// 复合索引
FamilyProxyRelationSchema.index({ agentUserId: 1, principalUserId: 1 }, { unique: true });
FamilyProxyRelationSchema.index({ verificationStatus: 1, createdAt: -1 });
FamilyProxyRelationSchema.index({ status: 1, expiryDate: 1 });
FamilyProxyRelationSchema.index({ 'verificationMethod': 1, 'verificationStatus': 1 });

// 中间件：过期检查
FamilyProxyRelationSchema.pre('save', function(next) {
  if (this.expiryDate && this.expiryDate < new Date()) {
    this.status = 'expired';
    this.verificationStatus = 'expired';
  }
  next();
});

// 实例方法：检查关系是否有效
FamilyProxyRelationSchema.methods.isValid = function() {
  const now = new Date();
  return this.status === 'active' &&
         this.verificationStatus === 'approved' &&
         (!this.expiryDate || this.expiryDate > now);
};

// 实例方法：检查操作权限
FamilyProxyRelationSchema.methods.hasPermission = function(operationType) {
  return this.permissions.allowedOperations.includes(operationType);
};

// 实例方法：更新使用统计
FamilyProxyRelationSchema.methods.updateUsage = function(operationType) {
  this.usageStats.totalOperations += 1;
  this.usageStats.lastOperationType = operationType;
  this.usageStats.lastOperationDate = new Date();
  this.lastUsedAt = new Date();
  return this.save();
};

// 静态方法：查找有效关系
FamilyProxyRelationSchema.statics.findValidRelation = function(agentUserId, principalUserId) {
  return this.findOne({
    agentUserId,
    principalUserId,
    status: 'active',
    verificationStatus: 'approved',
    $or: [
      { expiryDate: { $exists: false } },
      { expiryDate: { $gt: new Date() } }
    ]
  }).populate('agentUserId principalUserId');
};

// 静态方法：获取用户的所有代理关系
FamilyProxyRelationSchema.statics.getUserRelations = function(userId, role = 'both') {
  const query = role === 'agent' ? { agentUserId: userId } :
    role === 'principal' ? { principalUserId: userId } :
      { $or: [{ agentUserId: userId }, { principalUserId: userId }] };

  return this.find(query)
    .populate('agentUserId principalUserId', 'name email phone')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('FamilyProxyRelation', FamilyProxyRelationSchema);