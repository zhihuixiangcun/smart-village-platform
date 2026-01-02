const mongoose = require('mongoose');

/**
 * 值班人员模型
 */
const staffSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  position: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  contact: {
    phone: String,
    email: String
  },
  // 值班相关属性
  priority: {
    type: Number,
    default: 1, // 优先级，数字越大优先级越高
    min: 1,
    max: 10
  },
  maxDutyPerMonth: {
    type: Number,
    default: 8 // 每月最大值班次数
  },
  preferences: {
    // 值班偏好设置
    preferredDays: [Number], // 偏好的星期几 (0-6)
    avoidedDays: [Number], // 避免的星期几
    preferredShifts: [String], // 偏好的班次
    avoidedShifts: [String], // 避免的班次
    customConstraints: [{
      date: Date,
      reason: String,
      type: {
        type: String,
        enum: ['unavailable', 'preferred', 'avoid'],
        default: 'unavailable'
      }
    }]
  },
  // 工作负荷统计
  statistics: {
    thisMonthDutyCount: { type: Number, default: 0 },
    totalDutyCount: { type: Number, default: 0 },
    lastDutyDate: Date,
    averageRestDays: { type: Number, default: 2 }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  }
}, {
  timestamps: true
});

/**
 * 值班表模型
 */
const dutyScheduleSchema = new mongoose.Schema({
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  // 排班算法类型
  algorithm: {
    type: String,
    enum: ['rotation', 'balanced', 'priority', 'custom'],
    default: 'balanced'
  },
  // 班次定义
  shifts: [{
    name: {
      type: String,
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    requiredStaffCount: {
      type: Number,
      default: 1
    }
  }],
  // 每日排班详情
  schedules: [{
    date: Date,
    shifts: [{
      shiftName: String,
      staff: [{
        staffId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'DutyStaff'
        },
        name: String,
        status: {
          type: String,
          enum: ['scheduled', 'confirmed', 'completed', 'absent'],
          default: 'scheduled'
        },
        checkInTime: Date,
        checkOutTime: Date,
        notes: String
      }]
    }]
  }],
  // 特殊日期处理
  specialDates: [{
    date: Date,
    type: {
      type: String,
      enum: ['holiday', 'weekend', 'special_event'],
      required: true
    },
    description: String,
    // 特殊日期的值班安排要求
    staffingRequirements: [{
      shiftName: String,
      requiredCount: Number,
      minSeniority: Number
    }]
  }],
  // 排班参数
  parameters: {
    fairnessThreshold: {
      type: Number,
      default: 0.1 // 公平性阈值，最大最小值班次数差的比例
    },
    consecutiveDaysLimit: {
      type: Number,
      default: 3 // 连续值班天数限制
    },
    restDaysBetweenDuty: {
      type: Number,
      default: 1 // 两次值班之间的最少休息天数
    },
    weekendPreference: {
      type: String,
      enum: ['balanced', 'rotate', 'prefer_experienced'],
      default: 'balanced'
    }
  },
  // 优化历史
  optimizationHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    algorithm: String,
    metrics: {
      fairnessScore: Number,
      satisfactionScore: Number,
      coverageScore: Number
    },
    changes: [{
      date: Date,
      shift: String,
      originalStaff: [mongoose.Schema.Types.ObjectId],
      newStaff: [mongoose.Schema.Types.ObjectId],
      reason: String
    }]
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'active', 'archived'],
    default: 'draft'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  publishedAt: Date,
  archivedAt: Date
}, {
  timestamps: true,
  // 复合索引优化查询
  indexes: [
    { villageId: 1, year: 1, month: 1 },
    { villageId: 1, status: 1 },
    { date: 1 }
  ]
});

/**
 * 值班变更记录模型
 */
const dutyChangeLogSchema = new mongoose.Schema({
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DutySchedule',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  shiftName: {
    type: String,
    required: true
  },
  changeType: {
    type: String,
    enum: ['swap', 'temporary', 'absence', 'addition'],
    required: true
  },
  // 原值班人员
  originalStaff: [{
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DutyStaff'
    },
    name: String
  }],
  // 新值班人员
  newStaff: [{
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DutyStaff'
    },
    name: String
  }],
  reason: {
    type: String,
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  // 临时变更的结束日期
  temporaryUntil: Date,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

/**
 * 值班交接记录模型
 */
const dutyHandoverSchema = new mongoose.Schema({
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DutySchedule',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  shiftName: {
    type: String,
    required: true
  },
  // 交班人员
  fromStaff: {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DutyStaff',
      required: true
    },
    name: {
      type: String,
      required: true
    }
  },
  // 接班人员
  toStaff: {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DutyStaff',
      required: true
    },
    name: {
      type: String,
      required: true
    }
  },
  // 交接内容
  handoverContent: {
    ongoingTasks: [String], // 进行中的任务
    completedTasks: [String], // 已完成的任务
    pendingIssues: [String], // 待处理的问题
    importantNotes: String, // 重要备注
    equipmentStatus: [{
      equipment: String,
      status: {
        type: String,
        enum: ['normal', 'fault', 'maintenance']
      },
      notes: String
    }]
  },
  // 交接时间
  handoverTime: {
    type: Date,
    default: Date.now
  },
  // 确认状态
  confirmed: {
    type: Boolean,
    default: false
  },
  confirmedAt: Date,
  // 照片证据（可选）
  photos: [String] // 照片URL
}, {
  timestamps: true
});

// 创建模型
const DutyStaff = mongoose.model('DutyStaff', staffSchema);
const DutySchedule = mongoose.model('DutySchedule', dutyScheduleSchema);
const DutyChangeLog = mongoose.model('DutyChangeLog', dutyChangeLogSchema);
const DutyHandover = mongoose.model('DutyHandover', dutyHandoverSchema);

module.exports = {
  DutyStaff,
  DutySchedule,
  DutyChangeLog,
  DutyHandover
};