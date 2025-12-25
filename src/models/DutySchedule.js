/**
 * 智能值班表数据模型
 * 用于管理村委值班排班和一键呼叫功能
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
