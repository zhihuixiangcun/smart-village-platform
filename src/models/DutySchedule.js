/**
 * 智能值班表数据模型
 * 用于管理村委值班排班和一键呼叫功能
 * 值班表主模型
 * 管理月度值班排班计划和日常值班记录
 */

const mongoose = require('mongoose');

const dutyScheduleSchema = new mongoose.Schema({
  // 基本信息
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },
  season: {
    type: String,
    enum: ['spring', 'summer', 'autumn', 'winter'],
    required: true
  },
  year: {
    type: Number,
    required: true
  },

  // 排班规则
  rules: {
    shiftsPerDay: {
      type: Number,
      default: 3,  // 早班、中班、晚班
      enum: [1, 2, 3, 4]
    },
    shiftTimes: [{
      name: {
        type: String,
        enum: ['morning', 'afternoon', 'night', 'custom']
      },
      startTime: String,  // HH:mm 格式
      endTime: String     // HH:mm 格式
    }],
    maxContinuousDays: {
      type: Number,
      default: 5
    },
    weekendRotation: {
      type: Boolean,
      default: true
    }
  },

  // 排班详情
  schedules: [{
    date: {
      type: Date,
      required: true
    },
    isWeekend: {
      type: Boolean,
      default: false
    },
    isHoliday: {
      type: Boolean,
      default: false
    },
    holidayName: String,

    shifts: [{
      name: {
        type: String,
        enum: ['morning', 'afternoon', 'night', 'custom']
      },
      personnel: [{
        memberId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'CommitteeMember',
          required: true
        },
        name: {
          type: String,
          required: true
        },
        phone: {
          type: String,
          required: true
        },
        position: String,
        isPrimary: {
          type: Boolean,
          default: false
        },
        checkInTime: Date,
        checkOutTime: Date,
        status: {
          type: String,
          enum: ['pending', 'checked_in', 'checked_out', 'absent'],
          default: 'pending'
        }
      }],
      duties: [{
        type: String,
        description: String,
        priority: {
          type: String,
          enum: ['high', 'medium', 'low'],
          default: 'medium'
        }
      }],
      notes: String,
      emergencyLevel: {
        type: String,
        enum: ['normal', 'enhanced', 'emergency'],
        default: 'normal'
      }
    }]
  }],

  // 呼叫记录
  callHistory: [{
    callId: {
      type: String,
      unique: true,
      sparse: true
    },
    date: Date,
    shift: String,

    caller: {
      userId: mongoose.Schema.Types.ObjectId,
      name: String,
      phone: String,
      villageId: mongoose.Schema.Types.ObjectId
    },

    personnel: [{
      memberId: mongoose.Schema.Types.ObjectId,
      name: String,
      phone: String,
      responseStatus: {
        type: String,
        enum: ['answered', 'missed', 'busy', 'rejected'],
        default: 'missed'
      },
      responseTime: Number,  // 响应时间（秒）
      callDuration: Number   // 通话时长（秒）
    }],

    reason: {
      type: String,
      required: true
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'emergency'],
      default: 'medium'
    },
    location: String,

    status: {
      type: String,
      enum: ['calling', 'resolved', 'escalated', 'closed'],
      default: 'calling'
    },

    resolution: {
      resolvedAt: Date,
      resolverId: mongoose.Schema.Types.ObjectId,
      resolution: String,
      followUpRequired: Boolean,
      followUpDate: Date
    },

    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  }],

  // 替班记录
  substitutions: [{
    originalDate: Date,
    originalShift: String,
    originalMemberId: mongoose.Schema.Types.ObjectId,
    substituteMemberId: mongoose.Schema.Types.ObjectId,
    reason: String,
    approvedBy: mongoose.Schema.Types.ObjectId,
    approvedAt: Date
  }],

  // 值班室配置
  dutyRoom: {
    location: String,
    facilities: [String],  // 电话、电脑、监控等
    emergencyEquipment: [{
      name: String,
      quantity: Number,
      lastChecked: Date
    }],
    contacts: [{
      role: String,
      name: String,
      phone: String
    }]
  },

  // 统计数据
  statistics: {
    totalCalls: { type: Number, default: 0 },
    answeredCalls: { type: Number, default: 0 },
    missedCalls: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },

  // 元数据
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    version: {
      type: Number,
      default: 1
    },
    published: {
      type: Boolean,
      default: false
    },
    publishedAt: Date
  }

// 值班记录子模式
const dutyRecordSchema = new mongoose.Schema({
  // 基本信息
  date: {
    type: Date,
    required: true
  },
  shiftId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DutyShift',
    required: true
  },
  personnelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DutyPersonnel',
    required: true
  },

  // 状态
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'ongoing', 'completed', 'absent', 'cancelled'],
    default: 'scheduled'
  },

  // 时间记录
  actualStartTime: Date,
  actualEndTime: Date,
  breakTime: {
    type: Number, // 分钟
    default: 0
  },

  // 工作内容
  tasks: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, '任务标题不能超过100个字符']
    },
    description: {
      type: String,
      maxlength: [500, '任务描述不能超过500个字符']
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    completedAt: Date
  }],

  // 异常记录
  incidents: [{
    type: {
      type: String,
      enum: ['emergency', 'equipment_failure', 'absence', 'other'],
      required: true
    },
    description: {
      type: String,
      required: true,
      maxlength: [1000, '异常描述不能超过1000个字符']
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true
    },
    reportedAt: {
      type: Date,
      default: Date.now
    },
    resolvedAt: Date,
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // 交接记录
  handover: {
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DutyPersonnel'
    },
    notes: {
      type: String,
      maxlength: [1000, '交接备注不能超过1000个字符']
    },
    handoverTime: Date,
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DutyPersonnel'
    },
    acknowledgedAt: Date
  },

  // 考勤记录
  attendance: {
    checkInTime: Date,
    checkOutTime: Date,
    checkInLocation: String,
    checkOutLocation: String,
    checkInPhoto: String,
    checkOutPhoto: String,
    lateMinutes: {
      type: Number,
      default: 0
    },
    earlyLeaveMinutes: {
      type: Number,
      default: 0
    },
    overtimeMinutes: {
      type: Number,
      default: 0
    }
  },

  // 评价和反馈
  evaluation: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: {
      type: String,
      maxlength: [500, '评价不能超过500个字符']
    },
    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    evaluatedAt: Date
  }
}, {
  timestamps: true
});

// 主值班表模式
const dutyScheduleSchema = new mongoose.Schema({
  // 基本信息标识
  scheduleId: {
    type: String,
    required: [true, '排班编号不能为空'],
    unique: true,
    trim: true,
    match: [/^[A-Z0-9-]+$/, '排班编号只能包含大写字母、数字和连字符']
  },

  // 时间范围
  year: {
    type: Number,
    required: [true, '年份不能为空'],
    min: [2020, '年份不能小于2020'],
    max: [2030, '年份不能大于2030']
  },
  month: {
    type: Number,
    required: [true, '月份不能为空'],
    min: [1, '月份必须在1-12之间'],
    max: [12, '月份必须在1-12之间']
  },

  // 所属村庄
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: [true, '必须指定所属村庄']
  },

  // 值班记录
  dutyRecords: [dutyRecordSchema],

  // 排班规则和配置
  schedulingRules: {
    // 自动排班算法配置
    algorithm: {
      type: String,
      enum: ['round_robin', 'balanced', 'priority_based', 'custom'],
      default: 'balanced'
    },
    // 公平性权重
    fairnessWeight: {
      type: Number,
      default: 0.5,
      min: [0, '公平性权重不能小于0'],
      max: [1, '公平性权重不能大于1']
    },
    // 连续工作限制
    maxConsecutiveDays: {
      type: Number,
      default: 5,
      min: [1, '连续工作天数不能少于1'],
      max: [15, '连续工作天数不能超过15']
    },
    // 最小间隔天数
    minRestDays: {
      type: Number,
      default: 1,
      min: [0, '最小间隔天数不能小于0'],
      max: [7, '最小间隔天数不能超过7']
    }
  },

  // 排班状态
  status: {
    type: String,
    enum: ['draft', 'published', 'active', 'completed', 'cancelled'],
    default: 'draft'
  },

  // 统计信息
  statistics: {
    // 总排班天数
    totalScheduledDays: {
      type: Number,
      default: 0
    },
    // 已完成天数
    completedDays: {
      type: Number,
      default: 0
    },
    // 缺勤天数
    absentDays: {
      type: Number,
      default: 0
    },
    // 替班次数
    substituteCount: {
      type: Number,
      default: 0
    },
    // 应急响应次数
    emergencyResponses: {
      type: Number,
      default: 0
    }
  },

  // 创建者和审核者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  publishedAt: Date,

  // 备勤人员配置
  backupPersonnel: [{
    personnelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DutyPersonnel',
      required: true
    },
    priority: {
      type: Number,
      default: 1,
      min: [1, '优先级不能小于1'],
      max: [10, '优先级不能大于10']
    },
    availableDates: [Date],
    unavailableDates: [Date]
  }],

  // 版本控制
  version: {
    type: Number,
    default: 1,
    min: [1, '版本号不能小于1']
  },
  parentSchedule: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DutySchedule'
  },

  // 备注
  remarks: {
    type: String,
    maxlength: [2000, '备注不能超过2000个字符']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
dutyScheduleSchema.index({ villageId: 1, year: 1, season: 1 }, { unique: true });
dutyScheduleSchema.index({ 'schedules.date': 1 });
dutyScheduleSchema.index({ 'callHistory.timestamp': -1 });
dutyScheduleSchema.index({ villageId: 1, 'metadata.published': 1 });

// 虚拟字段：日期范围
dutyScheduleSchema.virtual('dateRange').get(function() {
  if (this.schedules.length > 0) {
    const dates = this.schedules.map(s => s.date).sort((a, b) => a - b);
    return {
      start: dates[0],
      end: dates[dates.length - 1]
    };
  }
  return null;
});

// 实例方法：获取某一天的值班安排
dutyScheduleSchema.methods.getScheduleByDate = function(date) {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  return this.schedules.find(schedule => {
    const scheduleDate = new Date(schedule.date);
    scheduleDate.setHours(0, 0, 0, 0);
    return scheduleDate.getTime() === targetDate.getTime();
  });
};

// 实例方法：添加值班人员
dutyScheduleSchema.methods.addPersonnel = function(date, shiftName, memberData) {
  const schedule = this.getScheduleByDate(date);
  if (!schedule) {
    throw new Error('未找到该日期的值班安排');
  }

  const shift = schedule.shifts.find(s => s.name === shiftName);
  if (!shift) {
    throw new Error('未找到该班次');
  }

  shift.personnel.push({
    ...memberData,
    status: 'pending'
  });

  this.markModified('schedules');
  return this.save();
};

// 实例方法：记录呼叫
dutyScheduleSchema.methods.recordCall = function(callData) {
  this.callHistory.push({
    ...callData,
    timestamp: new Date()
  });

  // 更新统计
  this.statistics.totalCalls += 1;
  if (callData.personnel && callData.personnel.length > 0) {
    const answered = callData.personnel.filter(p =>
      p.responseStatus === 'answered'
    ).length;
    this.statistics.answeredCalls += answered;
  } else {
    this.statistics.missedCalls += 1;
  }

  this.statistics.lastUpdated = new Date();
  this.markModified('callHistory');
  this.markModified('statistics');

  return this.save();
};

// 实例方法：响应呼叫
dutyScheduleSchema.methods.respondToCall = function(callId, memberId, responseData) {
  const call = this.callHistory.find(c => c.callId === callId);
  if (!call) {
    throw new Error('未找到呼叫记录');
  }

  const person = call.personnel.find(p =>
    p.memberId.toString() === memberId.toString()
  );
  if (!person) {
    throw new Error('未找到该值班人员');
  }

  person.responseStatus = responseData.status || 'answered';
  person.responseTime = responseData.responseTime;
  person.callDuration = responseData.callDuration;

  // 更新呼叫状态
  const allAnswered = call.personnel.every(p =>
    p.responseStatus === 'answered' || p.responseStatus === 'busy' || p.responseStatus === 'rejected'
  );

  if (allAnswered) {
    call.status = 'resolved';
    call.resolution = {
      resolvedAt: new Date(),
      followUpRequired: false
    };
  }

  // 更新统计
  if (person.responseStatus === 'answered') {
    const totalResponseTime = this.statistics.avgResponseTime *
      (this.statistics.answeredCalls - 1) + person.responseTime;
    this.statistics.avgResponseTime =
      totalResponseTime / this.statistics.answeredCalls;
  }

  this.markModified('callHistory');
  return this.save();
};

// 实例方法：申请替班
dutyScheduleSchema.methods.requestSubstitution = function(substitutionData) {
  this.substitutions.push({
    ...substitutionData,
    approvedAt: new Date()
  });

  // 更新值班安排
  const schedule = this.getScheduleByDate(substitutionData.originalDate);
  if (schedule) {
    const shift = schedule.shifts.find(s => s.name === substitutionData.originalShift);
    if (shift) {
      const personIndex = shift.personnel.findIndex(
        p => p.memberId.toString() === substitutionData.originalMemberId.toString()
      );
      if (personIndex !== -1) {
        // 保留原记录，标记为替班
        shift.personnel[personIndex].substituted = true;
        shift.personnel[personIndex].substituteId = substitutionData.substituteMemberId;
      }
    }
  }

  this.markModified('substitutions');
  this.markModified('schedules');
  return this.save();
};

// 静态方法：获取当前值班人员
dutyScheduleSchema.statics.getCurrentDutyPersonnel = async function(villageId) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const schedule = await this.findOne({
    villageId,
    'metadata.published': true,
    'schedules.date': {
      $gte: today,
      $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
    }
  });

  if (!schedule) {
    return null;
  }

  const todaySchedule = schedule.schedules.find(s => {
    const scheduleDate = new Date(s.date);
    scheduleDate.setHours(0, 0, 0, 0);
    return scheduleDate.getTime() === today.getTime();
  });

  if (!todaySchedule) {
    return null;
  }

  // 根据当前时间判断班次
  const currentHour = now.getHours();
  let currentShift = null;

  if (currentHour >= 6 && currentHour < 12) {
    currentShift = todaySchedule.shifts.find(s => s.name === 'morning');
  } else if (currentHour >= 12 && currentHour < 18) {
    currentShift = todaySchedule.shifts.find(s => s.name === 'afternoon');
  } else {
    currentShift = todaySchedule.shifts.find(s => s.name === 'night');
  }

  return currentShift ? currentShift.personnel : null;
};

// 静态方法：获取月度值班日历
dutyScheduleSchema.statics.getMonthlyCalendar = async function(villageId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const schedules = await this.aggregate([
    {
      $match: {
        villageId: mongoose.Types.ObjectId(villageId),
        'metadata.published': true
      }
    },
    {
      $unwind: '$schedules'
    },
    {
      $match: {
        'schedules.date': {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $project: {
        date: '$schedules.date',
        shifts: '$schedules.shifts',
        isHoliday: '$schedules.isHoliday',
        holidayName: '$schedules.holidayName'
      }
    },
    {
      $sort: { date: 1 }
    }
  ]);

  return schedules;
};

// 静态方法：获取值班统计
dutyScheduleSchema.statics.getDutyStatistics = async function(villageId, startDate, endDate) {
  const stats = await this.aggregate([
    {
      $match: {
        villageId: mongoose.Types.ObjectId(villageId),
        'metadata.published': true
      }
    },
    {
      $unwind: '$callHistory'
    },
    {
      $match: {
        'callHistory.timestamp': {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$callHistory.timestamp' } },
          urgency: '$callHistory.urgency'
        },
        count: { $sum: 1 },
        avgResponseTime: { $avg: '$callHistory.personnel.responseTime' }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        urgencies: {
          $push: {
            urgency: '$_id.urgency',
            count: '$count',
            avgResponseTime: '$avgResponseTime'
          }
        },
        totalCalls: { $sum: '$count' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  return stats;
};

// 中间件：保存前更新版本
dutyScheduleSchema.pre('save', function(next) {
  if (this.isModified('schedules')) {
    this.metadata.version += 1;
  }
  next();
});

module.exports = mongoose.model('DutySchedule', dutyScheduleSchema);
// 复合索引
dutyScheduleSchema.index({ villageId: 1, year: 1, month: 1 }, { unique: true });
dutyScheduleSchema.index({ scheduleId: 1 }, { unique: true });
dutyScheduleSchema.index({ status: 1, year: 1, month: 1 });
dutyScheduleSchema.index({ createdBy: 1 });
dutyScheduleSchema.index({ 'dutyRecords.date': 1, 'dutyRecords.shiftId': 1 });

// 虚拟字段：月份名称
dutyScheduleSchema.virtual('monthName').get(function() {
  const months = ['一月', '二月', '三月', '四月', '五月', '六月',
                  '七月', '八月', '九月', '十月', '十一月', '十二月'];
  return months[this.month - 1];
});

// 虚拟字段：是否当前月份
dutyScheduleSchema.virtual('isCurrentMonth').get(function() {
  const now = new Date();
  return this.year === now.getFullYear() && this.month === now.getMonth() + 1;
});

// 虚拟字段：完成率
dutyScheduleSchema.virtual('completionRate').get(function() {
  if (this.statistics.totalScheduledDays === 0) return 0;
  return Math.round((this.statistics.completedDays / this.statistics.totalScheduledDays) * 100);
});

// 实例方法：添加值班记录
dutyScheduleSchema.methods.addDutyRecord = function(recordData) {
  // 检查是否已存在相同时间的记录
  const existingRecord = this.dutyRecords.find(r =>
    r.date.toDateString() === recordData.date.toDateString() &&
    r.shiftId.toString() === recordData.shiftId.toString()
  );

  if (existingRecord) {
    throw new Error('该时间段已存在值班记录');
  }

  this.dutyRecords.push(recordData);
  this.statistics.totalScheduledDays = this.dutyRecords.length;

  return this.save();
};

// 实例方法：更新值班记录状态
dutyScheduleSchema.methods.updateDutyRecordStatus = function(recordId, newStatus, additionalData = {}) {
  const record = this.dutyRecords.id(recordId);
  if (!record) {
    throw new Error('未找到指定的值班记录');
  }

  record.status = newStatus;

  // 根据状态更新相关信息
  switch (newStatus) {
    case 'ongoing':
      record.actualStartTime = new Date();
      break;
    case 'completed':
      record.actualEndTime = new Date();
      this.statistics.completedDays++;
      break;
    case 'absent':
      this.statistics.absentDays++;
      break;
  }

  // 合并额外数据
  Object.assign(record, additionalData);

  return this.save();
};

// 实例方法：获取指定日期的值班记录
dutyScheduleSchema.methods.getRecordsByDate = function(date) {
  const targetDate = new Date(date);
  return this.dutyRecords.filter(record =>
    record.date.toDateString() === targetDate.toDateString()
  );
};

// 实例方法：获取人员的月度值班安排
dutyScheduleSchema.methods.getPersonnelSchedule = function(personnelId) {
  return this.dutyRecords
    .filter(record => record.personnelId.toString() === personnelId.toString())
    .sort((a, b) => a.date - b.date);
};

// 实例方法：生成排班建议（自动排班算法）
dutyScheduleSchema.methods.generateScheduleSuggestions = async function(shifts, personnel) {
  const suggestions = [];
  const daysInMonth = new Date(this.year, this.month, 0).getDate();

  // 初始化人员负载均衡数据
  const personnelLoad = new Map();
  personnel.forEach(p => {
    personnelLoad.set(p._id.toString(), {
      count: 0,
      consecutiveDays: 0,
      lastDate: null
    });
  });

  // 为每一天生成排班建议
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(this.year, this.month - 1, day);

    for (const shift of shifts) {
      // 根据班次要求选择合适的人员
      const availablePersonnel = personnel.filter(p => {
        const load = personnelLoad.get(p._id.toString());

        // 检查人员是否可承担该班次
        const canHandle = p.canHandleShift(shift.shiftType, date);
        if (!canHandle.canHandle) return false;

        // 检查连续天数限制
        if (load.consecutiveDays >= this.schedulingRules.maxConsecutiveDays) {
          return false;
        }

        // 检查休息间隔
        if (load.lastDate) {
          const daysDiff = Math.floor((date - load.lastDate) / (1000 * 60 * 60 * 24));
          if (daysDiff < this.schedulingRules.minRestDays) {
            return false;
          }
        }

        return true;
      });

      // 根据算法选择人员
      let selectedPersonnel = [];
      if (this.schedulingRules.algorithm === 'round_robin') {
        // 轮询算法
        availablePersonnel.sort((a, b) => {
          const loadA = personnelLoad.get(a._id.toString());
          const loadB = personnelLoad.get(b._id.toString());
          return loadA.count - loadB.count;
        });
        selectedPersonnel = availablePersonnel.slice(0, shift.minPersonnel);
      } else if (this.schedulingRules.algorithm === 'balanced') {
        // 平衡算法：考虑负载和偏好
        availablePersonnel.sort((a, b) => {
          const loadA = personnelLoad.get(a._id.toString());
          const loadB = personnelLoad.get(b._id.toString());

          // 计算综合评分（负载+偏好）
          const scoreA = loadA.count * (1 - this.schedulingRules.fairnessWeight) +
                        (a.preferences.preferredShifts.includes(shift.shiftType) ? -1 : 1) *
                        this.schedulingRules.fairnessWeight;
          const scoreB = loadB.count * (1 - this.schedulingRules.fairnessWeight) +
                        (b.preferences.preferredShifts.includes(shift.shiftType) ? -1 : 1) *
                        this.schedulingRules.fairnessWeight;

          return scoreA - scoreB;
        });
        selectedPersonnel = availablePersonnel.slice(0, shift.minPersonnel);
      }

      // 生成建议记录
      selectedPersonnel.forEach(person => {
        suggestions.push({
          date,
          shiftId: shift._id,
          personnelId: person._id,
          status: 'scheduled',
          suggested: true,
          confidence: this.calculateSuggestionConfidence(person, shift, date)
        });

        // 更新人员负载
        const load = personnelLoad.get(person._id.toString());
        load.count++;
        load.lastDate = date;
        load.consecutiveDays++;
      });
    }
  }

  return suggestions;
};

// 实例方法：计算排班建议的置信度
dutyScheduleSchema.methods.calculateSuggestionConfidence = function(personnel, shift, date) {
  let confidence = 0.5; // 基础置信度

  // 偏好加分
  if (personnel.preferences.preferredShifts.includes(shift.shiftType)) {
    confidence += 0.2;
  }
  if (personnel.preferences.preferredDays.includes(date.getDay() || 7)) {
    confidence += 0.1;
  }

  // 能力匹配加分
  if (personnel.capabilities.availableShiftTypes.includes(shift.shiftType)) {
    confidence += 0.1;
  }

  // 历史表现加分（如果有数据）
  if (personnel.statistics.totalCount > 0) {
    const completionRate = personnel.statistics.totalHours / (personnel.statistics.totalCount * shift.duration / 60);
    confidence += Math.min(completionRate * 0.1, 0.1);
  }

  return Math.min(confidence, 1.0);
};

// 静态方法：获取当前活跃的值班表
dutyScheduleSchema.statics.findActiveSchedule = function(villageId) {
  const now = new Date();
  return this.findOne({
    villageId,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    status: { $in: ['published', 'active'] }
  }).populate('dutyRecords.shiftId')
    .populate('dutyRecords.personnelId');
};

// 静态方法：获取村庄的值班表历史
dutyScheduleSchema.statics.findHistoryByVillage = function(villageId, limit = 12) {
  return this.find({ villageId })
    .sort({ year: -1, month: -1 })
    .limit(limit);
};

// 保存前验证
dutyScheduleSchema.pre('save', function(next) {
  // 验证年月组合
  if (this.month < 1 || this.month > 12) {
    return next(new Error('月份必须在1-12之间'));
  }

  // 验证值班记录时间一致性
  for (const record of this.dutyRecords) {
    if (record.date.getMonth() !== this.month - 1 ||
        record.date.getFullYear() !== this.year) {
      return next(new Error('值班记录的日期必须在排班月份内'));
    }
  }

  next();
});

module.exports = mongoose.model('DutySchedule', dutyScheduleSchema);
