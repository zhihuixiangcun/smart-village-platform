/**
 * 班次配置模型
 * 定义不同类型的班次及其配置信息
 */

const mongoose = require('mongoose');

const dutyShiftSchema = new mongoose.Schema({
  // 班次基本信息
  name: {
    type: String,
    required: [true, '班次名称不能为空'],
    trim: true,
    maxlength: [50, '班次名称不能超过50个字符']
  },
  code: {
    type: String,
    required: [true, '班次代码不能为空'],
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^[A-Z0-9_]+$/, '班次代码只能包含大写字母、数字和下划线']
  },

  // 班次类型
  shiftType: {
    type: String,
    required: [true, '班次类型不能为空'],
    enum: {
      values: ['morning', 'afternoon', 'night', 'emergency'],
      message: '班次类型必须是: morning(早班), afternoon(午班), night(晚班), emergency(应急班)'
    }
  },

  // 时间配置
  startTime: {
    type: String,
    required: [true, '开始时间不能为空'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, '时间格式必须为 HH:MM']
  },
  endTime: {
    type: String,
    required: [true, '结束时间不能为空'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, '时间格式必须为 HH:MM']
  },
  duration: {
    type: Number, // 分钟
    required: true,
    min: [30, '班次时长不能少于30分钟'],
    max: [720, '班次时长不能超过12小时']
  },

  // 跨天配置
  isOvernight: {
    type: Boolean,
    default: false
  },

  // 人员配置
  minPersonnel: {
    type: Number,
    required: [true, '最少人数不能为空'],
    min: [1, '最少人数不能少于1人'],
    max: [20, '最少人数不能超过20人']
  },
  maxPersonnel: {
    type: Number,
    required: [true, '最多人数不能为空'],
    min: [1, '最多人数不能少于1人'],
    max: [50, '最多人数不能超过50人']
  },

  // 优先级和权重（用于排班算法）
  priority: {
    type: Number,
    default: 1,
    min: [1, '优先级不能小于1'],
    max: [10, '优先级不能大于10']
  },
  weight: {
    type: Number,
    default: 1.0,
    min: [0.1, '权重不能小于0.1'],
    max: [5.0, '权重不能大于5.0']
  },

  // 班次描述和要求
  description: {
    type: String,
    maxlength: [500, '描述不能超过500个字符']
  },
  requirements: {
    // 技能要求
    skills: [{
      type: String,
      trim: true
    }],
    // 体质要求
    physicalRequirements: [{
      type: String,
      enum: ['normal', 'good_health', 'special_training'],
      message: '体质要求必须是预定义的选项'
    }],
    // 其他特殊要求
    specialRequirements: [{
      type: String,
      trim: true,
      maxlength: [100, '特殊要求不能超过100个字符']
    }]
  },

  // 有效期配置
  effectivePeriod: {
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      validate: {
        validator(v) {
          return !v || v > this.effectivePeriod.startDate;
        },
        message: '结束日期必须晚于开始日期'
      }
    }
  },

  // 适用范围（村庄）
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: [true, '必须指定所属村庄']
  },

  // 状态
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
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
dutyShiftSchema.index({ villageId: 1, shiftType: 1, status: 1 });
// code索引已在字段定义中指定unique: true,无需重复
dutyShiftSchema.index({ 'effectivePeriod.startDate': 1, 'effectivePeriod.endDate': 1 });

// 虚拟字段：时间范围描述
dutyShiftSchema.virtual('timeRange').get(function() {
  return `${this.startTime} - ${this.endTime}`;
});

// 虚拟字段：是否为当前有效
dutyShiftSchema.virtual('isCurrentlyEffective').get(function() {
  const now = new Date();
  return this.status === 'active' &&
         now >= this.effectivePeriod.startDate &&
         (!this.effectivePeriod.endDate || now <= this.effectivePeriod.endDate);
});

// 实例方法：检查时间是否重叠
dutyShiftSchema.methods.isTimeOverlapping = function(otherShift) {
  // 简单的时间段重叠检查（忽略跨天）
  const start1 = this.timeToMinutes(this.startTime);
  const end1 = this.timeToMinutes(this.endTime);
  const start2 = this.timeToMinutes(otherShift.startTime);
  const end2 = this.timeToMinutes(otherShift.endTime);

  return (start1 < end2) && (start2 < end1);
};

// 实例方法：将时间字符串转换为分钟数
dutyShiftSchema.methods.timeToMinutes = function(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// 静态方法：获取村庄的所有有效班次
dutyShiftSchema.statics.findActiveByVillage = function(villageId) {
  const now = new Date();
  return this.find({
    villageId,
    status: 'active',
    $or: [
      { 'effectivePeriod.endDate': { $exists: false } },
      { 'effectivePeriod.endDate': { $gte: now } }
    ]
  }).sort({ shiftType: 1, startTime: 1 });
};

// 静态方法：按类型获取班次
dutyShiftSchema.statics.findByType = function(villageId, shiftType) {
  return this.find({
    villageId,
    shiftType,
    status: 'active'
  }).sort({ startTime: 1 });
};

// 保存前验证时间逻辑
dutyShiftSchema.pre('save', function(next) {
  // 如果不是跨天班次，结束时间应该晚于开始时间
  if (!this.isOvernight) {
    const startMinutes = this.timeToMinutes(this.startTime);
    const endMinutes = this.timeToMinutes(this.endTime);

    if (endMinutes <= startMinutes) {
      return next(new Error('非跨天班次的结束时间必须晚于开始时间'));
    }
  }

  // 计算并验证时长
  const duration = this.calculateDuration();
  if (Math.abs(this.duration - duration) > 5) {
    this.duration = duration;
  }

  next();
});

// 实例方法：计算班次时长（分钟）
dutyShiftSchema.methods.calculateDuration = function() {
  const startMinutes = this.timeToMinutes(this.startTime);
  const endMinutes = this.timeToMinutes(this.endTime);

  if (this.isOvernight) {
    // 跨天：结束时间是第二天
    return (24 * 60 - startMinutes) + endMinutes;
  } else {
    return endMinutes - startMinutes;
  }
};

module.exports = mongoose.model('DutyShift', dutyShiftSchema);