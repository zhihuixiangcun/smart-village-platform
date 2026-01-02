/**
 * 诈骗号码数据模型
 * 用于记录和追踪诈骗电话号码
 */

const mongoose = require('mongoose');

const fraudNumberSchema = new mongoose.Schema({
  // 电话号码
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
    validate: {
      validator: function(v) {
        // 验证手机号格式（支持中国手机号）
        return /^1[3-9]\d{9}$/.test(v);
      },
      message: '请输入有效的手机号码'
    }
  },

  // 诈骗类型
  fraudType: {
    type: String,
    required: true,
    enum: {
      values: [
        'impersonation',      // 冒充公检法
        'brush_order',        // 刷单返利
        'investment',         // 投资理财
        'loan',               // 贷款诈骗
        'customer_service',   // 冒充客服
        'refund',             // 退款诈骗
        'lottery',            // 中奖诈骗
        'relationship',       // 杀猪盘
        'ransomware',         // 勒索诈骗
        'other'               // 其他
      ],
      message: '无效的诈骗类型'
    }
  },

  // 诈骗类型名称（中文）
  fraudTypeName: {
    type: String,
    required: true
  },

  // 风险等级
  riskLevel: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },

  // 风险等级名称（中文）
  riskLevelName: {
    type: String,
    required: true
  },

  // 举报次数
  reportCount: {
    type: Number,
    default: 1,
    min: 1
  },

  // 举报人列表
  reporters: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    reportTime: {
      type: Date,
      default: Date.now
    },
    reportReason: String,
    // 损失金额（可选）
    lossAmount: {
      type: Number,
      default: 0
    }
  }],

  // 诈骗描述
  description: {
    type: String,
    maxlength: 1000
  },

  // 案例详情
  caseDetails: {
    // 诈骗手法
    method: String,
    // 话术特点
    script: String,
    // 目标人群
    targetGroup: [String],
    // 高发时段
    peakHours: [String],
    // 防范建议
    preventionTips: [String]
  },

  // 数据来源
  dataSource: {
    type: String,
    enum: ['user_report', 'police_api', 'third_party', 'manual_entry'],
    default: 'user_report'
  },

  // 来源标识
  sourceId: String,

  // 是否已验证
  verified: {
    type: Boolean,
    default: false,
    index: true
  },

  // 验证时间
  verifiedAt: Date,

  // 验证人
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // 状态
  status: {
    type: String,
    enum: ['active', 'blocked', 'expired', 'false_positive'],
    default: 'active',
    index: true
  },

  // 拦截次数
  blockCount: {
    type: Number,
    default: 0
  },

  // 最后拦截时间
  lastBlockedAt: Date,

  // 关联的诈骗案例
  relatedCases: [{
    caseId: String,
    caseDate: Date,
    victimCount: Number,
    totalLoss: Number
  }],

  // 标签
  tags: [String],

  // 备注
  notes: String,

  // 所属村委（可选，用于村级管理）
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village'
  },

  // 创建者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // 更新者
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'fraud_numbers'
});

// 索引优化
fraudNumberSchema.index({ phoneNumber: 1, status: 1 });
fraudNumberSchema.index({ riskLevel: 1, reportCount: -1 });
fraudNumberSchema.index({ fraudType: 1, status: 1 });
fraudNumberSchema.index({ createdAt: -1 });
fraudNumberSchema.index({ verified: 1, status: 1 });

// 虚拟字段：风险等级数值（用于排序）
fraudNumberSchema.virtual('riskScore').get(function() {
  const levelScores = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
  };
  return levelScores[this.riskLevel] || 0;
});

// 实例方法：增加举报
fraudNumberSchema.methods.addReport = function(reporter) {
  this.reportCount += 1;
  this.reporters.push({
    userId: reporter.userId,
    userName: reporter.userName,
    reportTime: new Date(),
    reportReason: reporter.reason,
    lossAmount: reporter.lossAmount || 0
  });

  // 根据举报次数自动调整风险等级
  if (this.reportCount >= 10) {
    this.riskLevel = 'critical';
    this.riskLevelName = '极高风险';
  } else if (this.reportCount >= 5) {
    this.riskLevel = 'high';
    this.riskLevelName = '高风险';
  } else if (this.reportCount >= 3) {
    this.riskLevel = 'medium';
    this.riskLevelName = '中风险';
  }

  return this.save();
};

// 实例方法：记录拦截
fraudNumberSchema.methods.recordBlock = function() {
  this.blockCount += 1;
  this.lastBlockedAt = new Date();
  return this.save();
};

// 实例方法：验证
fraudNumberSchema.methods.verify = function(verifiedBy) {
  this.verified = true;
  this.verifiedAt = new Date();
  this.verifiedBy = verifiedBy;
  return this.save();
};

// 静态方法：检查号码是否为诈骗号码
fraudNumberSchema.statics.isFraudNumber = async function(phoneNumber) {
  const fraud = await this.findOne({
    phoneNumber,
    status: 'active'
  });
  return fraud || null;
};

// 静态方法：获取高危号码列表
fraudNumberSchema.statics.getHighRiskNumbers = function() {
  return this.find({
    status: 'active',
    riskLevel: { $in: ['high', 'critical'] }
  }).sort({ reportCount: -1 });
};

// 静态方法：统计诈骗类型分布
fraudNumberSchema.statics.getFraudTypeStats = async function() {
  return this.aggregate([
    {
      $match: { status: 'active' }
    },
    {
      $group: {
        _id: '$fraudType',
        fraudTypeName: { $first: '$fraudTypeName' },
        count: { $sum: 1 },
        totalReports: { $sum: '$reportCount' },
        avgRiskLevel: { $avg: '$riskScore' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// 静态方法：获取趋势数据
fraudNumberSchema.statics.getTrendData = function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          fraudType: '$fraudType'
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.date': 1 }
    }
  ]);
};

const FraudNumber = mongoose.model('FraudNumber', fraudNumberSchema);

module.exports = FraudNumber;
