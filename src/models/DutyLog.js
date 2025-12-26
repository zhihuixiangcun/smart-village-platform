const mongoose = require('mongoose');

const dutyLogSchema = new mongoose.Schema({
  // 基础信息
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DutySchedule',
    required: true
  },
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  // 值班人员信息
  dutyOfficer: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      // ref: 'User',
      required: true
    },
    userName: {
      type: String,
      required: true
    },
    userPhone: {
      type: String,
      required: true
    },
    userRole: {
      type: String,
      required: true
    },
    department: String
  },

  // 班次信息
  shift: {
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    shiftName: {
      type: String,
      required: true
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    duties: [{
      type: String,
      enum: [
        'general',           // 一般值班
        'emergency',         // 应急响应
        'security',          // 安全巡查
        'visitor',           // 来访接待
        'maintenance',       // 设施维护
        'weather_watch',     // 天气观察
        'fire_watch',        // 消防值班
        'flood_watch',       // 防汛值班
        'epidemic_control',  // 疫情防控
        'event_support'      // 活动保障
      ]
    }]
  },

  // 考勤记录
  attendance: {
    scheduledStart: {
      type: Date,
      required: true
    },
    actualStart: Date,
    scheduledEnd: {
      type: Date,
      required: true
    },
    actualEnd: Date,
    status: {
      type: String,
      enum: ['present', 'late', 'early_leave', 'absent', 'emergency_leave'],
      default: 'present'
    },
    lateMinutes: {
      type: Number,
      default: 0
    },
    earlyLeaveMinutes: {
      type: Number,
      default: 0
    },
    totalDutyMinutes: {
      type: Number,
      default: 0
    },
    locationCheck: {
      checkInLocation: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: {
          type: [Number],
          default: [0, 0]
        }
      },
      checkOutLocation: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: {
          type: [Number],
          default: [0, 0]
        }
      },
      isWithinRange: {
        type: Boolean,
        default: true
      }
    }
  },

  // 工作记录
  workRecords: [{
    recordTime: {
      type: Date,
      default: Date.now
    },
    recordType: {
      type: String,
      enum: [
        'patrol',            // 巡查记录
        'visitor',           // 来访记录
        'incident',          // 事件记录
        'maintenance',       // 维护记录
        'emergency',         // 应急处理
        'report',            // 汇报记录
        'handover',          // 交接记录
        'weather',           // 天气记录
        'other'              // 其他记录
      ],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    },
    attachments: [{
      type: {
        type: String,
        enum: ['image', 'video', 'audio', 'document'],
        required: true
      },
      url: String,
      fileName: String,
      fileSize: Number,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'escalated'],
      default: 'pending'
    },
    handledBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      userName: String
    },
    resolution: String,
    completedAt: Date
  }],

  // 来访记录
  visitorRecords: [{
    visitTime: {
      type: Date,
      required: true
    },
    visitorName: {
      type: String,
      required: true
    },
    visitorPhone: String,
    visitorId: String,
    visitPurpose: {
      type: String,
      required: true
    },
    visitDepartment: String,
    contactPerson: String,
    entryTime: Date,
    exitTime: Date,
    vehicleInfo: {
      plateNumber: String,
      vehicleType: String,
      parkingLocation: String
    },
    escortRequired: {
      type: Boolean,
      default: false
    },
    escortPerson: String,
    notes: String,
    status: {
      type: String,
      enum: ['scheduled', 'arrived', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled'
    }
  }],

  // 交接记录
  handover: {
    toOfficer: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      userName: String,
      userPhone: String
    },
    handoverTime: Date,
    handoverContent: {
      pendingTasks: [String],
      emergencyContacts: [{
        name: String,
        phone: String,
        purpose: String
      }],
      equipmentStatus: [{
        equipmentName: String,
        status: {
          type: String,
          enum: ['normal', 'damaged', 'missing', 'maintenance'],
          default: 'normal'
        },
        notes: String
      }],
      specialNotes: String,
      weatherCondition: String,
      securityStatus: String
    },
    acknowledgedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      userName: String,
      acknowledgedAt: Date
    }
  },

  // 应急事件记录
  emergencyEvents: [{
    eventTime: {
      type: Date,
      required: true
    },
    eventType: {
      type: String,
      enum: [
        'fire',              // 火灾
        'flood',             // 洪水
        'medical',           // 医疗急救
        'security',          // 安全事件
        'accident',          // 事故
        'weather',           // 恶劣天气
        'power_outage',      // 停电
        'water_outage',      // 停水
        'gas_leak',          // 燃气泄漏
        'structural',        // 建筑安全隐患
        'epidemic',          // 疫情
        'other'              // 其他
      ],
      required: true
    },
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'major', 'critical'],
      required: true
    },
    location: {
      description: String,
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: {
          type: [Number],
          default: [0, 0]
        }
      }
    },
    description: {
      type: String,
      required: true
    },
    peopleInvolved: [{
      name: String,
      phone: String,
      injury: {
        type: String,
        enum: ['none', 'minor', 'moderate', 'severe', 'critical'],
        default: 'none'
      },
      medicalAttention: Boolean
    }],
    actionsTaken: [String],
    resourcesUsed: [{
      resourceName: String,
      quantity: Number,
      unit: String
    }],
    externalAssistance: [{
      organization: String,
      contactPerson: String,
      phone: String,
      arrivalTime: Date,
      assistanceProvided: String
    }],
    responseTime: Number, // 响应时间（分钟）
    resolutionTime: Number, // 解决时间（分钟）
    outcome: {
      type: String,
      enum: ['resolved', 'contained', 'escalated', 'ongoing'],
      default: 'ongoing'
    },
    followUpRequired: {
      type: Boolean,
      default: false
    },
    followUpActions: [String],
    reportedTo: [{
      name: String,
      position: String,
      reportedAt: Date
    }],
    attachments: [{
      type: String,
      url: String,
      description: String
    }]
  }],

  // 值班总结
  summary: {
    overallStatus: {
      type: String,
      enum: ['normal', 'minor_issues', 'significant_incidents', 'emergency'],
      default: 'normal'
    },
    keyActivities: [String],
    issuesIdentified: [{
      issue: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
      },
      actionTaken: String,
      followUpNeeded: Boolean
    }],
    recommendations: [String],
    lessonsLearned: [String],
    equipmentUsed: [{
      equipmentName: String,
      usageCount: Number,
      status: String
    }],
    weatherConditions: String,
    specialNotes: String
  },

  // 绩效评估
  performance: {
    initiativeScore: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    thoroughnessScore: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    communicationScore: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    problemSolvingScore: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    overallScore: {
      type: Number,
      min: 1,
      max: 5
    },
    evaluator: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      userName: String,
      evaluatedAt: Date
    },
    evaluatorComments: String
  },

  // 审计信息
  audit: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      // ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastModifiedAt: Date,
    version: {
      type: Number,
      default: 1
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引优化
dutyLogSchema.index({ villageId: 1, 'attendance.actualStart': -1 });
dutyLogSchema.index({ 'dutyOfficer.userId': 1, 'attendance.actualStart': -1 });
dutyLogSchema.index({ scheduleId: 1, 'attendance.actualStart': -1 });
dutyLogSchema.index({ 'workRecords.recordType': 1, 'workRecords.recordTime': -1 });
dutyLogSchema.index({ 'emergencyEvents.severity': 1, 'emergencyEvents.eventTime': -1 });
dutyLogSchema.index({ 'visitorRecords.visitTime': -1 });

// 地理位置索引
dutyLogSchema.index({ 'attendance.locationCheck.checkInLocation': '2dsphere' });
dutyLogSchema.index({ 'workRecords.location': '2dsphere' });
dutyLogSchema.index({ 'emergencyEvents.location.coordinates': '2dsphere' });

// 虚拟字段：值班时长
dutyLogSchema.virtual('dutyDuration').get(function() {
  if (this.attendance.actualStart && this.attendance.actualEnd) {
    return Math.round((this.attendance.actualEnd - this.attendance.actualStart) / (1000 * 60)); // 分钟
  }
  return 0;
});

// 虚拟字段：是否有未处理的事件
dutyLogSchema.virtual('hasPendingIssues').get(function() {
  return this.workRecords.some(record => record.status === 'pending' || record.status === 'in_progress') ||
         this.emergencyEvents.some(event => event.outcome === 'ongoing');
});

// 实例方法：添加工作记录
dutyLogSchema.methods.addWorkRecord = function(recordData) {
  this.workRecords.push({
    ...recordData,
    recordTime: new Date()
  });
  return this.save();
};

// 实例方法：添加来访记录
dutyLogSchema.methods.addVisitorRecord = function(visitorData) {
  this.visitorRecords.push({
    ...visitorData,
    visitTime: new Date()
  });
  return this.save();
};

// 实例方法：添加应急事件
dutyLogSchema.methods.addEmergencyEvent = function(eventData) {
  this.emergencyEvents.push({
    ...eventData,
    eventTime: new Date()
  });
  return this.save();
};

// 实例方法：完成交接
dutyLogSchema.methods.completeHandover = function(handoverData) {
  this.handover = {
    ...handoverData,
    handoverTime: new Date()
  };
  return this.save();
};

// 实例方法：计算绩效分数
dutyLogSchema.methods.calculatePerformanceScore = function() {
  const weights = {
    initiative: 0.25,
    thoroughness: 0.3,
    communication: 0.2,
    problemSolving: 0.25
  };

  this.performance.overallScore = Math.round(
    (this.performance.initiativeScore * weights.initiative +
     this.performance.thoroughnessScore * weights.thoroughness +
     this.performance.communicationScore * weights.communication +
     this.performance.problemSolvingScore * weights.problemSolving) * 100
  ) / 100;

  return this.performance.overallScore;
};

// 静态方法：获取用户的值班历史
dutyLogSchema.statics.getUserDutyHistory = async function(userId, options = {}) {
  const {
    page = 1,
    limit = 10,
    startDate,
    endDate,
    villageId
  } = options;

  const query = { 'dutyOfficer.userId': userId };

  if (villageId) {
    query.villageId = villageId;
  }

  if (startDate || endDate) {
    query['attendance.actualStart'] = {};
    if (startDate) {
      query['attendance.actualStart'].$gte = new Date(startDate);
    }
    if (endDate) {
      query['attendance.actualStart'].$lte = new Date(endDate);
    }
  }

  const logs = await this.find(query)
    .populate('villageId', 'name')
    .populate('scheduleId', 'scheduleName')
    .sort({ 'attendance.actualStart': -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await this.countDocuments(query);

  return {
    logs,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
};

// 静态方法：生成值班统计报告
dutyLogSchema.statics.generateDutyStatistics = async function(villageId, startDate, endDate) {
  const logs = await this.find({
    villageId,
    'attendance.actualStart': {
      $gte: startDate,
      $lte: endDate
    }
  }).populate('dutyOfficer.userId', 'name');

  const statistics = {
    totalDutyDays: logs.length,
    totalDutyHours: 0,
    staffPerformance: {},
    incidentTypes: {},
    visitorStats: {
      totalVisitors: 0,
      averageVisitDuration: 0
    },
    emergencyStats: {
      totalEmergencies: 0,
      byType: {},
      bySeverity: {},
      averageResponseTime: 0
    },
    workRecordStats: {
      totalRecords: 0,
      byType: {},
      completionRate: 0
    }
  };

  let totalResponseTime = 0;
  let responseTimeCount = 0;
  let totalWorkRecords = 0;
  let completedWorkRecords = 0;

  logs.forEach(log => {
    // 计算总值班时长
    statistics.totalDutyHours += log.dutyDuration / 60;

    // 统计个人表现
    const userId = log.dutyOfficer.userId._id.toString();
    const userName = log.dutyOfficer.userId.name;

    if (!statistics.staffPerformance[userId]) {
      statistics.staffPerformance[userId] = {
        userName,
        totalDutyDays: 0,
        totalDutyHours: 0,
        averagePerformanceScore: 0,
        totalScore: 0,
        scoreCount: 0
      };
    }

    statistics.staffPerformance[userId].totalDutyDays++;
    statistics.staffPerformance[userId].totalDutyHours += log.dutyDuration / 60;

    if (log.performance.overallScore) {
      statistics.staffPerformance[userId].totalScore += log.performance.overallScore;
      statistics.staffPerformance[userId].scoreCount++;
      statistics.staffPerformance[userId].averagePerformanceScore =
        statistics.staffPerformance[userId].totalScore / statistics.staffPerformance[userId].scoreCount;
    }

    // 统计工作记录
    log.workRecords.forEach(record => {
      totalWorkRecords++;
      if (record.status === 'completed') {
        completedWorkRecords++;
      }

      if (!statistics.workRecordStats.byType[record.recordType]) {
        statistics.workRecordStats.byType[record.recordType] = 0;
      }
      statistics.workRecordStats.byType[record.recordType]++;
    });

    // 统计来访
    statistics.visitorStats.totalVisitors += log.visitorRecords.length;

    // 统计应急事件
    log.emergencyEvents.forEach(event => {
      statistics.emergencyStats.totalEmergencies++;

      if (!statistics.emergencyStats.byType[event.eventType]) {
        statistics.emergencyStats.byType[event.eventType] = 0;
      }
      statistics.emergencyStats.byType[event.eventType]++;

      if (!statistics.emergencyStats.bySeverity[event.severity]) {
        statistics.emergencyStats.bySeverity[event.severity] = 0;
      }
      statistics.emergencyStats.bySeverity[event.severity]++;

      if (event.responseTime) {
        totalResponseTime += event.responseTime;
        responseTimeCount++;
      }
    });
  });

  // 计算完成率
  statistics.workRecordStats.completionRate = totalWorkRecords > 0 ?
    (completedWorkRecords / totalWorkRecords * 100).toFixed(2) : 0;

  // 计算平均响应时间
  statistics.emergencyStats.averageResponseTime = responseTimeCount > 0 ?
    (totalResponseTime / responseTimeCount).toFixed(2) : 0;

  return statistics;
};

module.exports = mongoose.model('DutyLog', dutyLogSchema);