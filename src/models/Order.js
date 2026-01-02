/**
 * 订单模型
 */

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // 订单基本信息
  orderNo: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: ['agricultural_purchase', 'farm_product_sale', 'service', 'other'],
    required: true,
    index: true
  },

  // 订单参与方
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  // 订单商品
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgriculturalProduct',
      required: true
    },
    productName: {
      type: String,
      required: true
    },
    productImage: String,
    specifications: mongoose.Schema.Types.Mixed,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      min: 0,
      default: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'],
      default: 'pending'
    },
    shippedAt: Date,
    deliveredAt: Date,
    trackingNumber: String,
    logistics: {
      company: String,
      trackingUrl: String,
      estimatedDelivery: Date,
      notes: String
    }
  }],

  // 收货信息
  shipping: {
    recipient: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: String
    },
    address: {
      province: { type: String, required: true },
      city: { type: String, required: true },
      district: { type: String, required: true },
      detail: { type: String, required: true },
      postalCode: String,
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: [Number]
      }
    },
    method: {
      type: String,
      enum: ['express', 'pickup', 'delivery'],
      default: 'express'
    },
    fee: {
      type: Number,
      min: 0,
      default: 0
    },
    required: {
      type: Boolean,
      default: false
    }
  },

  // 支付信息
  payment: {
    method: {
      type: String,
      enum: ['wechat', 'alipay', 'cash', 'bank_transfer', 'credit_card'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'cancelled', 'failed'],
      required: true,
      default: 'pending'
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'CNY'
    },
    transactionId: String,
    paidAt: Date,
    refundedAt: Date,
    refundAmount: {
      type: Number,
      min: 0
    },
    refundReason: String
  },

  // 订单总额
  totals: {
    items: {
      type: Number,
      required: true,
      min: 0
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      min: 0,
      default: 0
    },
    shipping: {
      type: Number,
      min: 0,
      default: 0
    },
    tax: {
      type: Number,
      min: 0,
      default: 0
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0
    }
  },

  // 订单状态
  status: {
    type: String,
    enum: ['pending', 'paid', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'],
    required: true,
    default: 'pending',
    index: true
  },

  // 订单时间节点
  timeline: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true
    },
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String,
    attachments: [{
      type: String,
      url: String,
      name: String
    }]
  }],

  // 评价和反馈
  review: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    images: [String],
    serviceRating: {
      type: Number,
      min: 1,
      max: 5
    },
    deliveryRating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: Date
  },

  // 备注和说明
  notes: {
    buyer: String,
    seller: String,
    system: String
  },

  // 优先级和标签
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  tags: [String],

  // 优惠信息
  coupon: {
    code: String,
    type: String,
    amount: Number,
    percentage: Number,
    usedAt: Date
  },
  promotion: {
    id: String,
    name: String,
    discount: Number,
    appliedAt: Date
  },

  // 退款信息
  refund: {
    reason: String,
    type: {
      type: String,
      enum: ['full', 'partial', 'exchange']
    },
    amount: Number,
    status: {
      type: String,
      enum: ['requested', 'approved', 'rejected', 'processed'],
      default: 'requested'
    },
    requestedAt: Date,
    processedAt: Date,
    processor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  },

  // 退货信息
  return: {
    reason: String,
    items: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgriculturalProduct' },
      quantity: Number,
      condition: String,
      images: [String],
      refundAmount: Number
    }],
    status: {
      type: String,
      enum: ['requested', 'approved', 'rejected', 'received', 'processed'],
      default: 'requested'
    },
    requestedAt: Date,
    processedAt: Date,
    processor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // 扩展数据
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },

  // 创建者和更新者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
  },
  paidAt: Date,
  shippedAt: Date,
  deliveredAt: Date,
  completedAt: Date,
  cancelledAt: Date
}, {
  timestamps: true
});

// 索引
orderSchema.index({ buyerId: 1, status: 1, createdAt: -1 });
orderSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
orderSchema.index({ type: 1, status: 1, createdAt: -1 });
orderSchema.index({ 'payment.status': 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

// 虚拟字段
orderSchema.virtual('isPaid').get(function() {
  return ['paid', 'shipped', 'delivered', 'completed', 'refunded'].includes(this.status);
});

orderSchema.virtual('isDelivered').get(function() {
  return ['delivered', 'completed'].includes(this.status);
});

orderSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

orderSchema.virtual('isCancelled').get(function() {
  return this.status === 'cancelled';
});

orderSchema.virtual('canCancel').get(function() {
  return ['pending', 'paid'].includes(this.status);
});

orderSchema.virtual('canRefund').get(function() {
  return ['paid', 'confirmed', 'shipped', 'delivered'].includes(this.status);
});

orderSchema.virtual('canReview').get(function() {
  return this.status === 'completed' && !this.review.rating;
});

// 实例方法
orderSchema.methods.updateStatus = function(status, operator, notes = '', attachments = []) {
  this.status = status;
  this.updatedAt = new Date();

  // 添加时间线记录
  this.timeline.push({
    status,
    operator,
    notes,
    attachments,
    timestamp: new Date()
  });

  // 更新时间戳
  switch (status) {
  case 'paid':
    this.paidAt = new Date();
    break;
  case 'shipped':
    this.shippedAt = new Date();
    break;
  case 'delivered':
    this.deliveredAt = new Date();
    break;
  case 'completed':
    this.completedAt = new Date();
    break;
  case 'cancelled':
    this.cancelledAt = new Date();
    break;
  }

  return this.save();
};

orderSchema.methods.addReview = function(rating, comment, images, serviceRating, deliveryRating) {
  this.review = {
    rating,
    comment,
    images,
    serviceRating,
    deliveryRating,
    createdAt: new Date()
  };
  this.updatedAt = new Date();

  return this.save();
};

orderSchema.methods.initiateRefund = function(reason, amount, type = 'full') {
  this.refund = {
    reason,
    type,
    amount,
    status: 'requested',
    requestedAt: new Date()
  };
  this.updatedAt = new Date();

  return this.save();
};

orderSchema.methods.processRefund = function(status, processor, notes = '') {
  if (this.refund) {
    this.refund.status = status;
    this.refund.processedAt = new Date();
    this.refund.processor = processor;
    this.refund.notes = notes;

    if (status === 'approved') {
      this.payment.status = 'refunded';
      this.payment.refundedAt = new Date();
      this.payment.refundAmount = this.refund.amount;
    }
  }

  this.updatedAt = new Date();
  return this.save();
};

orderSchema.methods.initiateReturn = function(reason, items) {
  this.return = {
    reason,
    items,
    status: 'requested',
    requestedAt: new Date()
  };
  this.updatedAt = new Date();

  return this.save();
};

orderSchema.methods.processReturn = function(status, processor, notes = '') {
  if (this.return) {
    this.return.status = status;
    this.return.processedAt = new Date();
    this.return.processor = processor;
  }

  this.updatedAt = new Date();
  return this.save();
};

orderSchema.methods.calculateTotals = function() {
  let itemsCount = 0;
  let itemsAmount = 0;

  this.items.forEach(item => {
    itemsCount += item.quantity;
    itemsAmount += item.totalPrice;
  });

  this.totals.items = itemsCount;
  this.totals.amount = itemsAmount;
  this.totals.finalAmount = itemsAmount + this.totals.shipping + this.totals.tax - this.totals.discount;
  this.payment.amount = this.totals.finalAmount;

  return {
    itemsCount,
    itemsAmount,
    finalAmount: this.totals.finalAmount
  };
};

orderSchema.methods.getLatestStatus = function() {
  if (this.timeline.length > 0) {
    return this.timeline[this.timeline.length - 1];
  }
  return null;
};

// 静态方法
orderSchema.statics.findByBuyer = function(buyerId, options = {}) {
  const {
    status,
    type,
    startDate,
    endDate,
    page = 1,
    limit = 20
  } = options;

  const query = { buyerId };

  if (status) query.status = status;
  if (type) query.type = type;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('buyerId', 'name phone')
    .populate('sellerId', 'name phone')
    .populate('items.productId', 'name images');
};

orderSchema.statics.findBySeller = function(sellerId, options = {}) {
  const {
    status,
    type,
    startDate,
    endDate,
    page = 1,
    limit = 20
  } = options;

  const query = { sellerId };

  if (status) query.status = status;
  if (type) query.type = type;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('buyerId', 'name phone')
    .populate('sellerId', 'name phone')
    .populate('items.productId', 'name images');
};

orderSchema.statics.findByStatus = function(status, options = {}) {
  const {
    startDate,
    endDate,
    page = 1,
    limit = 20
  } = options;

  const query = { status };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('buyerId', 'name phone')
    .populate('sellerId', 'name phone');
};

orderSchema.statics.getOrdersByDateRange = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        totalOrders: { $sum: 1 },
        totalAmount: { $sum: '$totals.finalAmount' },
        statusBreakdown: {
          $push: '$status'
        },
        typeBreakdown: {
          $push: '$type'
        }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);
};

orderSchema.statics.getOrderStats = function(filters = {}) {
  const {
    startDate,
    endDate,
    buyerId,
    sellerId,
    status,
    type
  } = filters;

  const matchCondition = {};

  if (startDate || endDate) {
    matchCondition.createdAt = {};
    if (startDate) matchCondition.createdAt.$gte = new Date(startDate);
    if (endDate) matchCondition.createdAt.$lte = new Date(endDate);
  }

  if (buyerId) matchCondition.buyerId = buyerId;
  if (sellerId) matchCondition.sellerId = sellerId;
  if (status) matchCondition.status = status;
  if (type) matchCondition.type = type;

  return this.aggregate([
    {
      $match: matchCondition
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totals.finalAmount' },
        averageAmount: { $avg: '$totals.finalAmount' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

orderSchema.statics.getTopBuyers = function(days = 30, limit = 10) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        status: { $in: ['completed', 'delivered'] }
      }
    },
    {
      $group: {
        _id: '$buyerId',
        totalOrders: { $sum: 1 },
        totalAmount: { $sum: '$totals.finalAmount' },
        averageAmount: { $avg: '$totals.finalAmount' }
      }
    },
    {
      $sort: { totalAmount: -1 }
    },
    {
      $limit: limit
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'buyer'
      }
    },
    {
      $project: {
        buyerId: '$_id',
        totalOrders: 1,
        totalAmount: 1,
        averageAmount: 1,
        buyer: { $arrayElemAt: ['$buyer', 0] }
      }
    }
  ]);
};

orderSchema.statics.getRefundRequests = function(status = 'requested', page = 1, limit = 20) {
  const matchCondition = { 'refund.status': status };

  return this.find(matchCondition)
    .sort({ 'refund.requestedAt': -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('buyerId', 'name phone')
    .populate('sellerId', 'name phone');
};

orderSchema.statics.getReturnRequests = function(status = 'requested', page = 1, limit = 20) {
  const matchCondition = { 'return.status': status };

  return this.find(matchCondition)
    .sort({ 'return.requestedAt': -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('buyerId', 'name phone')
    .populate('sellerId', 'name phone')
    .populate('return.items.productId', 'name');
};

// 中间件：保存前计算总额
orderSchema.pre('save', function(next) {
  if (this.isModified('items')) {
    this.calculateTotals();
  }
  next();
});

// 导出模型
module.exports = mongoose.model('Order', orderSchema);