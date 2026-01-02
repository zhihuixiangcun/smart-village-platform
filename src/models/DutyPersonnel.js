/**
 * 值班人员模型
 * 管理参与值班的人员信息和能力配置
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const dutyPersonnelSchema = new mongoose.Schema({
  // 基本人员信息
  personnelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '必须关联系统用户']
  },
  name: {
    type: String,
    required: [true, '姓名不能为空'],
    trim: true,
    maxlength: [50, '姓名不能超过50个字符']
  },
  phone: {
    type: String,
    required: [true, '联系电话不能为空'],
    trim: true,
    match: [/^1[3-9]\d{9}$/, '请输入有效的手机号码']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '请输入有效的邮箱地址']
  },

  // 工作信息
  position: {
    type: String,
    required: [true, '职务不能为空'],
    trim: true,
    maxlength: [50, '职务不能超过50个字符']
  },
  department: {
    type: String,
    trim: true,
    maxlength: [100, '部门不能超过100个字符']
  },
  employeeId: {
    type: String,
    trim: true,
    unique: true,
    sparse: true // 允许多个null值
  },

  // 所属村庄
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: [true, '必须指定所属村庄']
  },

  // 值班能力配置
  capabilities: {
    // 可承担的班次类型
    availableShiftTypes: [{
      type: String,
      enum: ['morning', 'afternoon', 'night', 'emergency'],
      message: '班次类型必须是预定义的选项'
    }],
    // 技能标签
    skills: [{
      type: String,
      trim: true,
      maxlength: [30, '技能名称不能超过30个字符']
    }],
    // 资质证书
    certifications: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      certificateNumber: String,
      issuedBy: String,
      issueDate: Date,
      expiryDate: Date,
      attachmentUrl: String
    }],
    // 语言能力
    languages: [{
      type: String,
      enum: ['zh-CN', 'zh-TW', 'en', 'pcc', 'pcc-qn', 'other'],
      message: '语言必须是预定义的选项'
    }],
    // 特殊能力
    specialAbilities: [{
      type: String,
      trim: true,
      maxlength: [100, '特殊能力描述不能超过100个字符']
    }]
  },

  // 值班偏好设置
  preferences: {
    // 偏好的班次
    preferredShifts: [{
      type: String,
      enum: ['morning', 'afternoon', 'night', 'emergency']
    }],
    // 不希望的班次
    unwantedShifts: [{
      type: String,
      enum: ['morning', 'afternoon', 'night', 'emergency']
    }],
    // 偏好的工作日
    preferredDays: [{
      type: Number,
      min: 1,
      max: 7 // 1-7 对应周一到周日
    }],
    // 不希望的工作日
    unwantedDays: [{
      type: Number,
      min: 1,
      max: 7
    }],
    // 每月最大值班天数
    maxDutyDaysPerMonth: {
      type: Number,
      default: 22,
      min: [1, '每月最大值班天数不能少于1天'],
      max: [31, '每月最大值班天数不能超过31天']
    },
    // 连续值班天数限制
    maxConsecutiveDays: {
      type: Number,
      default: 5,
      min: [1, '连续值班天数不能少于1天'],
      max: [15, '连续值班天数不能超过15天']
    }
  },

  // 值班统计
  statistics: {
    // 当前月值班次数
    currentMonthCount: {
      type: Number,
      default: 0
    },
    // 总值班次数
    totalCount: {
      type: Number,
      default: 0
    },
    // 累计值班时长（小时）
    totalHours: {
      type: Number,
      default: 0
    },
    // 上次值班时间
    lastDutyDate: Date,
    // 连续值班天数
    consecutiveDays: {
      type: Number,
      default: 0
    }
  },

  // 二维码信息
  qrCode: {
    // 二维码内容（加密后的信息）
    content: {
      type: String,
      unique: true,
      sparse: true
    },
    // 二维码图片URL
    imageUrl: String,
    // 生成时间
    generatedAt: Date,
    // 过期时间
    expiresAt: {
      type: Date,
      default: function() {
        // 默认1年后过期
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1);
        return date;
      }
    }
  },

  // 紧急联系人
  emergencyContact: {
    name: {
      type: String,
      required: [true, '紧急联系人姓名不能为空'],
      trim: true
    },
    relationship: {
      type: String,
      required: [true, '与紧急联系人关系不能为空'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, '紧急联系人电话不能为空'],
      match: [/^1[3-9]\d{9}$/, '请输入有效的手机号码']
    }
  },

  // 健康状况
  healthStatus: {
    // 健康状态
    status: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'good'
    },
    // 健康备注
    notes: String,
    // 最后体检日期
    lastCheckupDate: Date,
    // 健康限制
    restrictions: [{
      type: String,
      trim: true
    }]
  },

  // 状态
  status: {
    type: String,
    enum: ['active', 'inactive', 'on_leave', 'suspended'],
    default: 'active'
  },

  // 备注
  remarks: {
    type: String,
    maxlength: [1000, '备注不能超过1000个字符']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 复合索引
dutyPersonnelSchema.index({ villageId: 1, status: 1 });
dutyPersonnelSchema.index({ personnelId: 1 }, { unique: true });
dutyPersonnelSchema.index({ phone: 1 }, { unique: true, sparse: true });
dutyPersonnelSchema.index({ employeeId: 1 }, { unique: true, sparse: true });
dutyPersonnelSchema.index({ 'qrCode.content': 1 }, { unique: true, sparse: true });

// 虚拟字段：是否可以排班
dutyPersonnelSchema.virtual('isAvailableForScheduling').get(function() {
  return this.status === 'active' && this.statistics.consecutiveDays < this.preferences.maxConsecutiveDays;
});

// 虚拟字段：二维码是否有效
dutyPersonnelSchema.virtual('isQRCodeValid').get(function() {
  if (!this.qrCode.content || !this.qrCode.expiresAt) {
    return false;
  }
  return new Date() <= this.qrCode.expiresAt;
});

// 实例方法：检查是否可以承担指定班次
dutyPersonnelSchema.methods.canHandleShift = function(shiftType, date) {
  // 检查状态
  if (this.status !== 'active') {
    return { canHandle: false, reason: '人员状态不可用' };
  }

  // 检查班次类型
  if (!this.capabilities.availableShiftTypes.includes(shiftType)) {
    return { canHandle: false, reason: '不具备该班次类型的能力' };
  }

  // 检查不希望的班次
  if (this.preferences.unwantedShifts && this.preferences.unwantedShifts.includes(shiftType)) {
    return { canHandle: false, reason: '该班次类型在偏好排除列表中' };
  }

  // 检查工作日偏好
  const dayOfWeek = date.getDay(); // 0是周日，1是周一
  const dayIndex = dayOfWeek === 0 ? 7 : dayOfWeek; // 转换为1-7

  if (this.preferences.unwantedDays && this.preferences.unwantedDays.includes(dayIndex)) {
    return { canHandle: false, reason: '该日期在偏好排除列表中' };
  }

  // 检查连续值班天数
  if (this.statistics.consecutiveDays >= this.preferences.maxConsecutiveDays) {
    return { canHandle: false, reason: '已达到连续值班天数上限' };
  }

  // 检查月度值班天数
  const currentMonth = new Date().getMonth();
  const lastDutyMonth = this.statistics.lastDutyDate ? this.statistics.lastDutyDate.getMonth() : -1;

  if (currentMonth === lastDutyMonth &&
      this.statistics.currentMonthCount >= this.preferences.maxDutyDaysPerMonth) {
    return { canHandle: false, reason: '已达到月度值班天数上限' };
  }

  return { canHandle: true };
};

// 实例方法：生成二维码
dutyPersonnelSchema.methods.generateQRCode = function() {
  const qrData = {
    id: this._id,
    personnelId: this.personnelId,
    name: this.name,
    position: this.position,
    villageId: this.villageId,
    phone: this.phone,
    generatedAt: new Date().toISOString(),
    expiresAt: this.qrCode.expiresAt
  };

  // 加密数据
  const encrypted = crypto.createHash('sha256')
    .update(JSON.stringify(qrData) + process.env.JWT_SECRET || 'default-secret')
    .digest('hex');

  this.qrCode = {
    content: encrypted,
    generatedAt: new Date(),
    expiresAt: this.qrCode.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1年后
  };

  return this.qrCode;
};

// 实例方法：验证二维码
dutyPersonnelSchema.methods.verifyQRCode = function(encryptedContent) {
  if (!this.qrCode.content || !this.isQRCodeValid) {
    return false;
  }
  return this.qrCode.content === encryptedContent;
};

// 静态方法：通过二维码查找人员
dutyPersonnelSchema.statics.findByQRCode = function(encryptedContent) {
  return this.findOne({
    'qrCode.content': encryptedContent,
    'qrCode.expiresAt': { $gte: new Date() },
    status: 'active'
  }).populate('personnelId');
};

// 静态方法：获取村庄的所有可用人员
dutyPersonnelSchema.statics.findAvailableByVillage = function(villageId, shiftType = null) {
  const query = {
    villageId,
    status: 'active'
  };

  if (shiftType) {
    query['capabilities.availableShiftTypes'] = shiftType;
  }

  return this.find(query)
    .populate('personnelId', 'username email avatar')
    .sort({ name: 1 });
};

// 保存前自动生成二维码
dutyPersonnelSchema.pre('save', function(next) {
  if (this.isNew && !this.qrCode.content) {
    this.generateQRCode();
  }
  next();
});

// 更新统计信息的中间件
dutyPersonnelSchema.methods.updateStatistics = function(incrementHours = 0) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const lastDutyMonth = this.statistics.lastDutyDate ? this.statistics.lastDutyDate.getMonth() : -1;

  // 如果是新月份，重置月度计数
  if (currentMonth !== lastDutyMonth) {
    this.statistics.currentMonthCount = 1;
    this.statistics.consecutiveDays = 1;
  } else {
    this.statistics.currentMonthCount += 1;
    this.statistics.consecutiveDays += 1;
  }

  // 更新总统计
  this.statistics.totalCount += 1;
  this.statistics.totalHours += incrementHours;
  this.statistics.lastDutyDate = now;
};

module.exports = mongoose.model('DutyPersonnel', dutyPersonnelSchema);