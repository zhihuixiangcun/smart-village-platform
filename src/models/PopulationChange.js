/**
 * PopulationChange.js - 人口变动记录模型
 *
 * 记录村民人口变动（新生、婚入、婚出、死亡、迁入、迁出）
 * 支持人口主任审核和自动更新家庭档案
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * 人口变动Schema
 */
const populationChangeSchema = new Schema({
  // 变动ID（唯一标识）
  changeId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },

  // 村庄ID
  villageId: {
    type: Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 家庭ID（关联家庭档案）
  householdId: {
    type: Schema.Types.ObjectId,
    ref: 'Household',
    required: true
  },

  // 变动类型
  changeType: {
    type: String,
    enum: ['birth', 'marriage_in', 'marriage_out', 'death', 'move_in', 'move_out'],
    required: true,
    index: true
  },

  // 变动类型名称（中文）
  changeTypeName: {
    type: String,
    required: true
  },

  // 人员信息（新生、婚入、迁入等）
  personInfo: {
    name: {
      type: String,
      required() {
        return ['birth', 'marriage_in', 'move_in'].includes(this.changeType);
      }
    },
    idCard: {
      type: String,
      required() {
        return ['birth', 'marriage_in', 'move_in'].includes(this.changeType);
      }
    },
    gender: {
      type: String,
      enum: ['male', 'female'],
      required() {
        return ['birth', 'marriage_in', 'move_in'].includes(this.changeType);
      }
    },
    birthDate: {
      type: Date,
      required() {
        return this.changeType === 'birth';
      }
    },
    relation: {
      type: String,
      required() {
        return ['birth', 'marriage_in', 'move_in'].includes(this.changeType);
      }
      // 与户主关系（如：儿子、女儿、妻子、儿媳等）
    },
    phone: String,
    address: String,
    education: String,
    occupation: String
  },

  // 关联人员（婚出、死亡、迁出等）
  relatedPerson: {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required() {
        return ['marriage_out', 'death', 'move_out'].includes(this.changeType);
      }
    },
    name: {
      type: String,
      required() {
        return ['marriage_out', 'death', 'move_out'].includes(this.changeType);
      }
    },
    idCard: {
      type: String,
      required() {
        return ['marriage_out', 'death', 'move_out'].includes(this.changeType);
      }
    },
    relation: String  // 与户主关系
  },

  // 变动日期
  changeDate: {
    type: Date,
    required: true,
    index: true
  },

  // 证明材料
  documents: [{
    type: {
      type: String,
      enum: ['birth_certificate', 'marriage_certificate', 'death_certificate',
        'id_card', 'household_register', 'move_permit', 'other'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    fileName: String,
    fileSize: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],

  // 审核状态
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },

  // 操作记录
  reportedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reporterName: {
    type: String,
    required: true
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewerName: {
    type: String,
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },

  // 审核意见
  reviewComment: {
    type: String,
    default: null
  },

  // 拒绝原因
  rejectionReason: {
    type: String,
    default: null
  },

  // 是否自动更新家庭档案
  autoUpdateHousehold: {
    type: Boolean,
    default: false
  },

  // 更新结果
  updateResult: {
    success: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      default: null
    },
    updatedAt: {
      type: Date,
      default: null
    }
  },

  // 备注
  notes: {
    type: String,
    default: null
  },

  // 元数据
  metadata: {
    ipAddress: String,
    userAgent: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'api', 'admin'],
      default: 'web'
    }
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==================== 索引 ====================

// 复合索引：村庄 + 状态 + 变动日期
populationChangeSchema.index({ villageId: 1, status: 1, changeDate: -1 });

// 复合索引：家庭 + 变动日期
populationChangeSchema.index({ householdId: 1, changeDate: -1 });

// 复合索引：变动类型 + 状态
populationChangeSchema.index({ changeType: 1, status: 1 });

// ==================== 虚拟字段 ====================

// 虚拟字段：是否可以撤销
populationChangeSchema.virtual('canRevoke').get(function() {
  return this.status === 'approved' && !this.autoUpdateHousehold;
});

// ==================== 实例方法 ====================

/**
 * 审核人口变动
 * @param {string} action - 操作（approve/reject）
 * @param {string} reviewerId - 审核人ID
 * @param {string} comment - 审核意见
 * @param {boolean} autoUpdate - 是否自动更新家庭档案
 * @returns {Promise<Document>}
 */
populationChangeSchema.methods.review = async function(action, reviewerId, comment = '', autoUpdate = false) {
  if (this.status !== 'pending') {
    throw new Error('该变动记录已审核');
  }

  this.reviewedBy = reviewerId;
  this.reviewerName = comment; // 临时存储，下面会更新
  this.reviewComment = comment;
  this.reviewedAt = new Date();

  if (action === 'approve') {
    this.status = 'approved';
    this.autoUpdateHousehold = autoUpdate;

    // 获取审核人姓名
    const User = mongoose.model('User');
    const reviewer = await User.findById(reviewerId);
    if (reviewer) {
      this.reviewerName = reviewer.name;
    }

    // 如果需要自动更新家庭档案
    if (autoUpdate) {
      await this.updateHousehold();
    }
  } else {
    this.status = 'rejected';
    this.rejectionReason = comment;
  }

  return this.save();
};

/**
 * 更新家庭档案
 * @returns {Promise<Document>}
 */
populationChangeSchema.methods.updateHousehold = async function() {
  try {
    const Household = mongoose.model('Household');
    const User = mongoose.model('User');
    const Resident = mongoose.model('Resident');

    const household = await Household.findById(this.householdId);
    if (!household) {
      throw new Error('家庭档案不存在');
    }

    switch (this.changeType) {
    case 'birth':
      // 新生儿：创建用户和村民记录
      const newUser = await User.create({
        name: this.personInfo.name,
        idCard: this.personInfo.idCard,
        gender: this.personInfo.gender,
        birthDate: this.personInfo.birthDate,
        villageId: this.villageId,
        householdId: this.householdId
      });

      await Resident.create({
        userId: newUser._id,
        householdId: this.householdId,
        relation: this.personInfo.relation,
        populationChange: true
      });

      household.memberCount += 1;
      break;

    case 'marriage_in':
      // 婚入：创建用户和村民记录
      // (类似birth的逻辑)
      household.memberCount += 1;
      break;

    case 'marriage_out':
      // 婚出：更新用户状态
      await User.findByIdAndUpdate(this.relatedPerson.userId, {
        marriageStatus: 'married_out',
        previousHouseholdId: this.householdId
      });
      household.memberCount -= 1;
      break;

    case 'death':
      // 死亡：标记用户为已故
      await User.findByIdAndUpdate(this.relatedPerson.userId, {
        isDeceased: true,
        deathDate: this.changeDate
      });
      household.memberCount -= 1;
      break;

    case 'move_in':
      // 迁入：创建用户和村民记录
      household.memberCount += 1;
      break;

    case 'move_out':
      // 迁出：更新用户状态
      await User.findByIdAndUpdate(this.relatedPerson.userId, {
        isMovedOut: true,
        moveOutDate: this.changeDate
      });
      household.memberCount -= 1;
      break;
    }

    await household.save();

    this.updateResult = {
      success: true,
      message: '家庭档案已自动更新',
      updatedAt: new Date()
    };
  } catch (error) {
    this.updateResult = {
      success: false,
      message: error.message,
      updatedAt: new Date()
    };
  }

  return this.save();
};

/**
 * 撤销变动（仅限未自动更新的已通过记录）
 * @param {string} userId - 操作人ID
 * @returns {Promise<Document>}
 */
populationChangeSchema.methods.revoke = async function(userId) {
  if (!this.canRevoke) {
    throw new Error('当前状态不允许撤销');
  }

  this.status = 'pending';
  this.reviewedBy = null;
  this.reviewerName = null;
  this.reviewedAt = null;
  this.reviewComment = null;

  return this.save();
};

// ==================== 静态方法 ====================

/**
 * 生成变动ID
 * @returns {string}
 */
populationChangeSchema.statics.generateChangeId = function() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PC${year}${month}${day}${random}`;
};

/**
 * 获取待审核的变动记录
 * @param {string} villageId - 村庄ID
 * @returns {Promise<Document[]>}
 */
populationChangeSchema.statics.getPendingChanges = function(villageId) {
  return this.find({
    villageId,
    status: 'pending'
  }).sort({ changeDate: -1 });
};

/**
 * 获取家庭的变动历史
 * @param {string} householdId - 家庭ID
 * @returns {Promise<Document[]>}
 */
populationChangeSchema.statics.getHouseholdHistory = function(householdId) {
  return this.find({
    householdId
  }).sort({ changeDate: -1 });
};

/**
 * 获取统计数据
 * @param {string} villageId - 村庄ID
 * @param {Date} startDate - 开始日期
 * @param {Date} endDate - 结束日期
 * @returns {Promise<Object>}
 */
populationChangeSchema.statics.getStatistics = async function(villageId, startDate, endDate) {
  const matchQuery = {
    villageId: mongoose.Types.ObjectId(villageId),
    status: 'approved'
  };

  if (startDate || endDate) {
    matchQuery.changeDate = {};
    if (startDate) matchQuery.changeDate.$gte = startDate;
    if (endDate) matchQuery.changeDate.$lte = endDate;
  }

  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$changeType',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    birth: 0,
    marriage_in: 0,
    marriage_out: 0,
    death: 0,
    move_in: 0,
    move_out: 0,
    total: 0
  };

  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  // 计算净增人口
  result.netIncrease = result.birth + result.marriage_in + result.move_in -
                       result.death - result.marriage_out - result.move_out;

  return result;
};

/**
 * 批量导入变动记录
 * @param {Array} changes - 变动记录数组
 * @param {string} userId - 导入人ID
 * @returns {Promise<Object>}
 */
populationChangeSchema.statics.batchImport = async function(changes, userId) {
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  for (const change of changes) {
    try {
      await this.create({
        ...change,
        reportedBy: userId,
        status: 'pending'
      });
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        data: change,
        error: error.message
      });
    }
  }

  return results;
};

// ==================== 中间件 ====================

// 保存前生成变动ID
populationChangeSchema.pre('save', function(next) {
  if (!this.changeId) {
    this.changeId = this.constructor.generateChangeId();
  }

  // 自动设置变动类型名称
  if (!this.changeTypeName) {
    const typeNames = {
      birth: '新生儿出生',
      marriage_in: '婚入',
      marriage_out: '婚出',
      death: '死亡',
      move_in: '迁入',
      move_out: '迁出'
    };
    this.changeTypeName = typeNames[this.changeType];
  }

  next();
});

module.exports = mongoose.model('PopulationChange', populationChangeSchema);
