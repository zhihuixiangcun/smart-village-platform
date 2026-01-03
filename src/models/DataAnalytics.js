const mongoose = require('mongoose');

const dataAnalyticsSchema = new mongoose.Schema({
  // 分析报告基本信息
  reportTitle: {
    type: String,
    required: true,
    trim: true
  },
  reportType: {
    type: String,
    enum: [
      'daily_summary',       // 日报
      'weekly_summary',      // 周报
      'monthly_summary',     // 月报
      'quarterly_report',    // 季报
      'annual_report',       // 年报
      'task_analysis',       // 任务分析
      'document_analysis',   // 文档分析
      'performance_report',  // 绩效报告
      'village_statistics',  // 村庄统计
      'custom'               // 自定义
    ],
    required: true
  },

  // 时间范围
  period: {
    startDate: {
      type: Date,
      required: true,
      index: true
    },
    endDate: {
      type: Date,
      required: true,
      index: true
    }
  },

  // 创建者信息
  createdBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      // ref: 'User',
      required: true
    },
    name: String,
    position: String
  },

  // 数据来源
  dataSources: [{
    type: {
      type: String,
      enum: ['document_collection', 'duty_schedule', 'task', 'resident', 'financial', 'meeting'],
      required: true
    },
    model: String,
    queryConditions: mongoose.Schema.Types.Mixed,
    lastUpdated: Date
  }],

  // 统计数据
  statistics: {
    // 文档统计
    documents: {
      totalCollected: { type: Number, default: 0 },
      totalApproved: { type: Number, default: 0 },
      totalRejected: { type: Number, default: 0 },
      pendingReview: { type: Number, default: 0 },
      categories: [{
        name: String,
        count: Number,
        percentage: Number
      }],
      collectors: [{
        userId: mongoose.Schema.Types.ObjectId,
        userName: String,
        count: Number,
        completionRate: Number
      }]
    },

    // 任务统计
    tasks: {
      totalAssigned: { type: Number, default: 0 },
      totalCompleted: { type: Number, default: 0 },
      totalOverdue: { type: Number, default: 0 },
      inProgress: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
      averageCompletionTime: { type: Number, default: 0 }, // 小时
      assignees: [{
        userId: mongoose.Schema.Types.ObjectId,
        userName: String,
        tasksCompleted: Number,
        tasksOverdue: Number,
        performance: Number
      }]
    },

    // 值班统计
    dutySchedule: {
      totalShifts: { type: Number, default: 0 },
      completedShifts: { type: Number, default: 0 },
      missedShifts: { type: Number, default: 0 },
      lateShifts: { type: Number, default: 0 },
      attendanceRate: { type: Number, default: 0 },
      staffPerformance: [{
        userId: mongoose.Schema.Types.ObjectId,
        userName: String,
        shiftsWorked: Number,
        shiftsMissed: Number,
        reliability: Number
      }]
    },

    // 工作量统计
    workload: {
      dailyBreakdown: [{
        date: Date,
        documentsCollected: Number,
        tasksCompleted: Number,
        hoursWorked: Number,
        totalActivities: Number
      }],
      peakDays: [Date],
      lowActivityDays: [Date],
      averageDailyLoad: Number
    }
  },

  // 图表数据
  charts: [{
    chartType: {
      type: String,
      enum: ['line', 'bar', 'pie', 'area', 'scatter', 'radar'],
      required: true
    },
    title: String,
    description: String,
    data: mongoose.Schema.Types.Mixed,
    options: mongoose.Schema.Types.Mixed,
    category: {
      type: String,
      enum: ['document_trend', 'task_progress', 'performance', 'comparison', 'distribution']
    }
  }],

  // 趋势分析
  trends: [{
    metric: String,
    direction: {
      type: String,
      enum: ['increasing', 'decreasing', 'stable', 'volatile']
    },
    changePercentage: Number,
    description: String,
    significance: {
      type: String,
      enum: ['high', 'medium', 'low']
    }
  }],

  // 建议和洞察
  insights: [{
    type: {
      type: String,
      enum: ['recommendation', 'observation', 'warning', 'achievement']
    },
    title: String,
    description: String,
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    },
    actionable: {
      type: Boolean,
      default: true
    },
    relatedData: mongoose.Schema.Types.Mixed
  }],

  // 报告状态
  status: {
    type: String,
    enum: ['generating', 'ready', 'reviewing', 'approved', 'archived'],
    default: 'generating'
  },

  // 审核信息
  review: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    feedback: String,
    approved: Boolean
  },

  // 分享设置
  sharing: {
    isPublic: {
      type: Boolean,
      default: false
    },
    sharedWith: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      permission: {
        type: String,
        enum: ['view', 'comment', 'edit'],
        default: 'view'
      }
    }],
    shareToken: String,
    shareExpiry: Date
  },

  // 自动化设置
  automation: {
    isRecurring: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly']
    },
    nextRunDate: Date,
    recipients: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      email: String,
      role: String
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
dataAnalyticsSchema.index({ 'createdBy.userId': 1, 'period.startDate': -1 });
dataAnalyticsSchema.index({ reportType: 1, status: 1 });
dataAnalyticsSchema.index({ 'period.startDate': 1, 'period.endDate': 1 });
// createdAt索引已由timestamps: true自动创建,无需手动指定

// 虚拟字段
dataAnalyticsSchema.virtual('periodDuration').get(function() {
  const diffTime = Math.abs(this.period.endDate - this.period.startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

dataAnalyticsSchema.virtual('isReady').get(function() {
  return this.status === 'ready' || this.status === 'approved';
});

// 实例方法
dataAnalyticsSchema.methods.updateStatistics = function(newStats) {
  Object.assign(this.statistics, newStats);
  return this.save();
};

dataAnalyticsSchema.methods.addChart = function(chartData) {
  this.charts.push(chartData);
  return this.save();
};

dataAnalyticsSchema.methods.addInsight = function(insightData) {
  this.insights.push({
    ...insightData,
    timestamp: new Date()
  });
  return this.save();
};

dataAnalyticsSchema.methods.generateShareToken = function(expiryDays = 7) {
  const token = require('crypto').randomBytes(32).toString('hex');
  this.sharing.shareToken = token;
  this.sharing.shareExpiry = new Date(Date.now() + (expiryDays * 24 * 60 * 60 * 1000));
  return this.save();
};

// 静态方法
dataAnalyticsSchema.statics.generateDailyReport = async function(date, villageId) {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  // 获取文档统计数据
  const DocumentCollection = mongoose.model('DocumentCollection');
  const docStats = await DocumentCollection.aggregate([
    {
      $match: {
        collectionDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalCollected: { $sum: 1 },
        totalApproved: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        totalRejected: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        },
        pendingReview: {
          $sum: { $cond: [{ $in: ['$status', ['collecting', 'reviewing']] }, 1, 0] }
        }
      }
    }
  ]);

  // 获取任务统计数据
  const Task = mongoose.model('Task');
  const taskStats = await Task.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalAssigned: { $sum: 1 },
        totalCompleted: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        totalOverdue: {
          $sum: { $cond: [{ $lt: ['$deadline', new Date()] }, 1, 0] }
        }
      }
    }
  ]);

  return {
    date,
    documents: docStats[0] || { totalCollected: 0, totalApproved: 0, totalRejected: 0, pendingReview: 0 },
    tasks: taskStats[0] || { totalAssigned: 0, totalCompleted: 0, totalOverdue: 0 }
  };
};

dataAnalyticsSchema.statics.getWorkloadAnalysis = async function(userId, startDate, endDate) {
  const DocumentCollection = mongoose.model('DocumentCollection');
  const Task = mongoose.model('Task');

  const docWorkload = await DocumentCollection.aggregate([
    {
      $match: {
        'collector.userId': mongoose.Types.ObjectId(userId),
        collectionDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$collectionDate' } },
          category: '$category'
        },
        count: { $sum: 1 },
        totalFiles: { $sum: '$statistics.totalFiles' },
        totalSize: { $sum: '$statistics.totalSize' }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        activities: {
          $push: {
            category: '$_id.category',
            count: '$count',
            files: '$totalFiles'
          }
        },
        totalDocuments: { $sum: '$count' },
        totalFiles: { $sum: '$totalFiles' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const taskWorkload = await Task.aggregate([
    {
      $match: {
        assigneeId: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          status: '$status'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        tasks: {
          $push: {
            status: '$_id.status',
            count: '$count'
          }
        },
        totalTasks: { $sum: '$count' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return {
    documents: docWorkload,
    tasks: taskWorkload
  };
};

dataAnalyticsSchema.statics.getPerformanceMetrics = async function(userId, startDate, endDate) {
  const DocumentCollection = mongoose.model('DocumentCollection');
  const DutySchedule = mongoose.model('DutySchedule');

  const docMetrics = await DocumentCollection.aggregate([
    {
      $match: {
        'collector.userId': mongoose.Types.ObjectId(userId),
        collectionDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgFilesPerDoc: { $avg: '$statistics.totalFiles' },
        avgSizePerDoc: { $avg: '$statistics.totalSize' }
      }
    }
  ]);

  const dutyMetrics = await DutySchedule.aggregate([
    {
      $match: {
        'assignments.userId': mongoose.Types.ObjectId(userId),
        'assignments.date': { $gte: startDate, $lte: endDate }
      }
    },
    {
      $unwind: '$assignments'
    },
    {
      $group: {
        _id: '$assignments.status',
        count: { $sum: 1 }
      }
    }
  ]);

  const totalDocs = docMetrics.reduce((sum, metric) => sum + metric.count, 0);
  const approvedDocs = docMetrics.find(m => m._id === 'approved')?.count || 0;
  const approvalRate = totalDocs > 0 ? (approvedDocs / totalDocs) * 100 : 0;

  return {
    documentMetrics: {
      totalDocuments: totalDocs,
      approvalRate: Math.round(approvalRate * 100) / 100,
      metricsByStatus: docMetrics
    },
    dutyMetrics: {
      metricsByStatus: dutyMetrics
    }
  };
};

module.exports = mongoose.model('DataAnalytics', dataAnalyticsSchema);