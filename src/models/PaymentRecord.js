/**
 * 支付记录模型
 */

const mongoose = require('mongoose');

const paymentRecordSchema = new mongoose.Schema({
  // 订单ID
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // 支付类型
  type: {
    type: String,
    enum: ['wechat', 'alipay', 'unionpay', 'balance'],
    required: true,
    index: true
  },

  // 支付金额（分）
  amount: {
    type: Number,
    required: true,
    min: 1
  },

  // 支付描述
  description: {
    type: String,
    required: true
  },

  // 支付状态
  status: {
    type: String,
    enum: ['pending', 'processing', 'success', 'failed', 'cancelled', 'refunded'],
    default: 'pending',
    index: true
  },

  // 用户ID
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 村庄ID
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 关联业务
  businessType: {
    type: String,
    enum: ['service_fee', 'product_purchase', 'donation', 'fine', 'other'],
    required: true
  },

  // 业务ID
  businessId: {
    type: String,
    required: true,
    index: true
  },

  // 平台订单ID
  platformOrderId: {
    type: String,
    required: true,
    index: true
  },

  // 支付信息
  paymentInfo: {
    paymentMethod: String,
    clientIp: String,
    deviceInfo: String,
    userAgent: String
  },

  // 支付时间
  payTime: {
    type: Date,
    index: true
  },

  // 过期时间
  expireTime: {
    type: Date,
    index: true
  },

  // 退款信息
  refundInfo: {
    refundId: String,
    platformRefundId: String,
    refundAmount: Number,
    refundReason: String,
    refundStatus: {
      type: String,
      enum: ['pending', 'processing', 'success', 'failed'],
      default: null
    },
    refundTime: Date
  },

  // 回调验证
  callbackVerified: {
    type: Boolean,
    default: false
  },

  // 重试次数
  retryCount: {
    type: Number,
    default: 0
  },

  // 原始数据
  rawData: {
    type: mongoose.Schema.Types.Mixed
  },

  // 扩展数据
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },

  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 索引
paymentRecordSchema.index({ userId: 1, status: 1, createdAt: -1 });
paymentRecordSchema.index({ villageId: 1, status: 1, createdAt: -1 });
paymentRecordSchema.index({ type: 1, status: 1, createdAt: -1 });
paymentRecordSchema.index({ businessType: 1, businessId: 1 });

// 虚拟字段
paymentRecordSchema.virtual('amountYuan').get(function() {
  return (this.amount / 100).toFixed(2);
});

paymentRecordSchema.virtual('isPaid').get(function() {
  return ['success', 'refunded'].includes(this.status);
});

paymentRecordSchema.virtual('isPending').get(function() {
  return ['pending', 'processing'].includes(this.status);
});

paymentRecordSchema.virtual('isFailed').get(function() {
  return ['failed', 'cancelled'].includes(this.status));
});

paymentRecordSchema.virtual('isRefunded').get(function() {
  return this.status === 'refunded' && this.refundInfo?.refundStatus === 'success';
});

// 实例方法
paymentRecordSchema.methods.updateStatus = function(status, additionalData = {}) {
  this.status = status;
  this.updatedAt = new Date();

  if (additionalData.payTime) {
    this.payTime = additionalData.payTime;
  }

  if (additionalData.platformOrderId) {
    this.platformOrderId = additionalData.platformOrderId;
  }

  if (additionalData.rawData) {
    this.rawData = { ...this.rawData, ...additionalData.rawData };
  }

  return this.save();
};

paymentRecordSchema.methods.markAsPaid = function(payTime, platformOrderId) {
  return this.updateStatus('success', {
    payTime,
    platformOrderId
  });
};

paymentRecordSchema.methods.markAsFailed = function(failureReason) {
  this.metadata = {
    ...this.metadata,
    failureReason,
    lastFailureTime: new Date()
  };
  return this.updateStatus('failed');
};

paymentRecordSchema.methods.initiateRefund = function(refundAmount, refundReason) {
  this.refundInfo = {
    refundAmount,
    refundReason,
    refundStatus: 'pending',
    refundTime: new Date()
  };
  this.status = 'refunded';
  return this.save();
};

paymentRecordSchema.methods.updateRefundStatus = function(refundStatus, platformRefundId) {
  if (this.refundInfo) {
    this.refundInfo.refundStatus = refundStatus;
    this.refundInfo.platformRefundId = platformRefundId;
    if (refundStatus === 'success') {
      this.refundInfo.refundTime = new Date();
    }
  }
  return this.save();
};

// 静态方法
paymentRecordSchema.statics.getPaymentByOrderId = function(orderId) {
  return this.findOne({ orderId }).populate('userId villageId');
};

paymentRecordSchema.statics.getPaymentsByUserId = function(userId, options = {}) {
  const {
    status,
    businessType,
    startDate,
    endDate,
    page = 1,
    limit = 20
  } = options;

  const query = { userId };

  if (status) query.status = status;
  if (businessType) query.businessType = businessType;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('userId', 'username')
    .populate('villageId', 'name');
};

paymentRecordSchema.statics.getPaymentsByVillage = function(villageId, options = {}) {
  const {
    status,
    businessType,
    startDate,
    endDate,
    page = 1,
    limit = 20
  } = options;

  const query = { villageId };

  if (status) query.status = status;
  if (businessType) query.businessType = businessType;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('userId', 'username name phone');
};

paymentRecordSchema.statics.getPaymentStats = function(villageId = null, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const matchCondition = {
    createdAt: { $gte: startDate }
  };

  if (villageId) {
    matchCondition.villageId = villageId;
  }

  return this.aggregate([
    {
      $match: matchCondition
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

paymentRecordSchema.statics.getDailyPaymentStats = function(villageId = null, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const matchCondition = {
    createdAt: { $gte: startDate }
  };

  if (villageId) {
    matchCondition.villageId = villageId;
  }

  return this.aggregate([
    {
      $match: matchCondition
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        successAmount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0]
          }
        }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);
};

paymentRecordSchema.statics.getBusinessTypeStats = function(villageId = null) {
  const matchCondition = {};
  if (villageId) {
    matchCondition.villageId = villageId;
  }

  return this.aggregate([
    {
      $match: matchCondition
    },
    {
      $group: {
        _id: '$businessType',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        successAmount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0]
          }
        }
      }
    },
    {
      $sort: { totalAmount: -1 }
    }
  ]);
};

paymentRecordSchema.statics.getPendingPayments = function() {
  const expireTime = new Date();
  expireTime.setMinutes(expireTime.getMinutes() - 30); // 30分钟前

  return this.find({
    status: { $in: ['pending', 'processing'] },
    expireTime: { $gte: expireTime }
  })
    .sort({ createdAt: 1 })
    .populate('userId villageId');
};

paymentRecordSchema.statics.getFailedPayments = function(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.find({
    status: { $in: ['failed', 'cancelled'] },
    createdAt: { $gte: startDate }
  })
    .sort({ createdAt: -1 })
    .populate('userId villageId')
    .limit(50);
};

paymentRecordSchema.statics.getRefundedPayments = function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.find({
    status: 'refunded',
    createdAt: { $gte: startDate }
  })
    .sort({ updatedAt: -1 })
    .populate('userId villageId')
    .limit(50);
};

// 导出模型
module.exports = mongoose.model('PaymentRecord', paymentRecordSchema);