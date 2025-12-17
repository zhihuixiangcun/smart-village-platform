/**
 * 农产品供应模型
 */

const mongoose = require('mongoose');

const farmProductSupplySchema = new mongoose.Schema({
  // 基本信息
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },
  productName: {
    type: String,
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: ['vegetable', 'fruit', 'grain', 'livestock', 'poultry', 'aquatic', 'processed', 'specialty', 'other'],
    index: true
  },
  variety: String,
  description: {
    type: String,
    required: true
  },
  images: [{
    url: String,
    alt: String,
    isMain: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now }
  }],

  // 数量和单位
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    enum: ['kg', 'ton', 'piece', 'box', 'bag', 'bottle', 'liter', 'meter', 'acre'],
    default: 'kg'
  },
  minimumOrder: {
    type: Number,
    min: 0,
    default: 1
  },

  // 定价信息
  price: {
    minPrice: {
      type: Number,
      required: true,
      min: 0
    },
    maxPrice: {
      type: Number,
      required: true,
      min: 0
    },
    negotiable: {
      type: Boolean,
      default: false
    },
    currency: {
      type: String,
      default: 'CNY'
    },
    pricingType: {
      type: String,
      enum: ['fixed', 'range', 'negotiable'],
      default: 'fixed'
    }
  },

  // 品质信息
  quality: {
    grade: {
      type: String,
      enum: ['AAA', 'AA', 'A', 'B', 'C'],
      default: 'A'
    },
    certification: [{
      type: String,
      enum: ['organic', 'green', 'gap', 'haccp', 'iso', 'geographical', 'other']
    }],
    certificationDetails: [{
      type: String,
      number: String,
      issuedBy: String,
      validUntil: Date,
      document: String
    }],
    inspectionDate: Date,
    inspectionReport: String,
    testResults: {
      pesticide: { type: mongoose.Schema.Types.Mixed },
      heavyMetal: { type: mongoose.Schema.Types.Mixed },
      microorganisms: { type: mongoose.Schema.Types.Mixed },
      nutritional: { type: mongoose.Schema.Types.Mixed }
    }
  },

  // 收获信息
  harvest: {
    date: Date,
    season: {
      type: String,
      enum: ['spring', 'summer', 'autumn', 'winter', 'year_round']
    },
    method: {
      type: String,
      enum: ['manual', 'mechanical', 'semi_mechanical']
    },
    location: {
      field: String,
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: [Number]
      },
      area: Number,
      soil: String,
      water: String
    }
  },

  // 产品特性
  characteristics: {
    color: String,
    flavor: String,
    texture: String,
    size: String,
    weight: Number,
    moisture: Number,
    shelfLife: {
      type: Number,
      default: 7
    },
    storage: {
      temperature: String,
      humidity: String,
      environment: String
    }
  },

  // 供应时间
  availability: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: Date,
    continuous: {
      type: Boolean,
      default: false
    },
    seasonal: {
      type: Boolean,
      default: true
    },
    leadTime: {
      type: Number,
      default: 1
    }
  },

  // 配送信息
  shipping: {
    available: {
      type: Boolean,
      default: true
    },
    methods: [{
      type: String,
      enum: ['pickup', 'delivery', 'logistics', 'postal']
    }],
    radius: {
      type: Number,
      default: 50
    },
    cost: {
      pickup: { type: Number, default: 0 },
      delivery: { type: Number, default: 0 },
      logistics: { type: Number, default: 0 }
    },
    pickupLocation: {
      address: String,
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: [Number]
      },
      contact: String,
      operatingHours: String
    }
  },

  // 联系方式
  contact: {
    phone: {
      type: String,
      required: true
    },
    wechat: String,
    email: String,
    address: String
  },

  // 交易信息
  transactions: [{
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    quantity: Number,
    unitPrice: Number,
    totalPrice: Number,
    status: {
      type: String,
      enum: ['inquiry', 'negotiating', 'confirmed', 'paid', 'delivered', 'completed', 'cancelled'],
      default: 'inquiry'
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date,
    completedAt: Date,
    notes: String
  }],

  // 评价信息
  reviews: [{
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      quality: { type: Number, min: 1, max: 5 },
      service: { type: Number, min: 1, max: 5 },
      value: { type: Number, min: 1, max: 5 },
      overall: { type: Number, min: 1, max: 5 }
    },
    comment: String,
    images: [String],
    verified: {
      type: Boolean,
      default: false
    },
    createdAt: { type: Date, default: Date.now }
  }],

  // 统计信息
  stats: {
    totalViews: { type: Number, default: 0, min: 0 },
    totalInquiries: { type: Number, default: 0, min: 0 },
    totalTransactions: { type: Number, default: 0, min: 0 },
    totalQuantity: { type: Number, default: 0, min: 0 },
    totalRevenue: { type: Number, default: 0, min: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    repeatBuyers: { type: Number, default: 0, min: 0 }
  },

  // 状态
  status: {
    type: String,
    enum: ['available', 'sold_out', 'unavailable', 'expired'],
    default: 'available',
    index: true
  },

  // 推荐和标签
  recommendation: {
    isRecommended: { type: Boolean, default: false },
    reason: String,
    priority: { type: Number, default: 0 },
    validUntil: Date
  },
  tags: [String],
  keywords: [String],

  // 审核信息
  approval: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectedReason: String,
    comments: String
  },

  // SEO信息
  seo: {
    title: String,
    description: String,
    keywords: [String]
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
farmProductSupplySchema.index({ farmerId: 1, status: 1, createdAt: -1 });
farmProductSupplySchema.index({ villageId: 1, category: 1, status: 1 });
farmProductSupplySchema.index({ category: 1, quality: { grade: 1, status: 1, createdAt: -1 } });
farmProductSupplySchema.index({ productName: 'text', description: 'text', tags: 'text' });
farmProductSupplySchema.index({ 'price.minPrice': 1, 'price.maxPrice': 1 });
farmProductSupplySchema.index({ 'availability.startDate': 1, 'availability.endDate': 1 });
farmProductSupplySchema.index({ createdAt: -1 });

// 虚拟字段
farmProductSupplySchema.virtual('isAvailable').get(function() {
  const now = new Date();
  if (this.status !== 'available') return false;

  const startDate = new Date(this.availability.startDate);
  const endDate = this.availability.endDate ? new Date(this.availability.endDate) : null;

  if (now < startDate) return false;
  if (endDate && now > endDate) return false;

  return true;
});

farmProductSupplySchema.virtual('averagePrice').get(function() {
  return (this.price.minPrice + this.price.maxPrice) / 2;
});

farmProductSupply.virtual('hasCertifications').get(function() {
  return this.quality.certification && this.quality.certification.length > 0;
});

farmProductSchema.virtual('totalTransactions').get(function() {
  return this.transactions ? this.transactions.length : 0;
});

farmProductSchema.virtual('isInStock').get(function() {
  return this.quantity > 0 && this.isAvailable;
});

farmProductSupplySchema.virtual('rating').get(function() {
  if (this.reviews.length === 0) return 0;
  const totalRating = this.reviews.reduce((sum, review) => sum + review.rating.overall, 0);
  return totalRating / this.reviews.length;
});

// 实例方法
farmProductSupplySchema.methods.addTransaction = function(buyerId, quantity, unitPrice, notes) {
  const totalPrice = quantity * unitPrice;

  this.transactions.push({
    buyerId,
    quantity,
    unitPrice,
    totalPrice,
    status: 'inquiry',
    notes,
    createdAt: new Date()
  });

  this.stats.totalInquiries++;
  this.updatedAt = new Date();

  return this.save();
};

farmProductSupplySchema.methods.updateTransaction = function(transactionId, updates) {
  const transaction = this.transactions.id(transactionId);
  if (transaction) {
    Object.assign(transaction, updates);
    transaction.updatedAt = new Date();
  }

  this.updatedAt = new Date();
  return this.save();
};

farmProductSupplySchema.methods.addReview = function(buyerId, rating, comment, images) {
  this.reviews.push({
    buyerId,
    rating,
    comment,
    images,
    createdAt: new Date()
  });

  // 更新平均评分
  if (this.reviews.length > 0) {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating.overall, 0);
    this.stats.averageRating = totalRating / this.reviews.length;
  }

  this.updatedAt = new Date();
  return this.save();
};

farmProductSupplySchema.methods.updateStats = function() {
  const transactions = this.transactions || [];
  const completedTransactions = transactions.filter(t => t.status === 'completed');

  this.stats.totalTransactions = transactions.length;
  this.stats.totalQuantity = completedTransactions.reduce((sum, t) => sum + t.quantity, 0);
  this.stats.totalRevenue = completedTransactions.reduce((sum, t) => sum + t.totalPrice, 0);

  // 计算重复买家
  const buyerIds = [...new Set(transactions.map(t => t.buyerId.toString()))];
  this.stats.repeatBuyers = transactions.length - buyerIds.length;

  this.updatedAt = new Date();
  return this.save();
};

farmProductSupplySchema.methods.incrementViews = function() {
  this.stats.totalViews++;
  return this.save();
};

farmProductSupplySchema.methods.getFeaturedImage = function() {
  const mainImage = this.images.find(img => img.isMain);
  return mainImage || this.images[0] || null;
};

farmProductSupplySchema.methods.isInSeason = function() {
  if (!this.harvest.season || this.harvest.season === 'year_round') {
    return true;
  }

  const currentMonth = new Date().getMonth();
  const monthMap = {
    'spring': [2, 3, 4],
    'summer': [5, 6, 7, 8],
    'autumn': [9, 10, 11],
    'winter': [12, 1, 0]
  };

  return monthMap[this.harvest.season].includes(currentMonth);
};

// 静态方法
farmProductSupplySchema.statics.findByFarmer = function(farmerId, options = {}) {
  const {
    category,
    grade,
    available,
    status = 'available',
    page = 1,
    limit = 20
  } = options;

  const query = { farmerId, status };

  if (category) query.category = category;
  if (grade) query['quality.grade'] = grade;

  if (available !== undefined) {
    const now = new Date();
    if (available) {
      query['availability.startDate'] = { $lte: now };
      query.$or = [
        { 'availability.endDate': { $exists: false } },
        { 'availability.endDate': { $gte: now } }
      ];
    } else {
      query.$or = [
        { 'availability.startDate': { $gt: now } },
        { 'availability.endDate': { $lt: now } }
      ];
    }
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('farmerId', 'name phone')
    .populate('villageId', 'name');
};

farmProductSupplySchema.statics.findByVillage = function(villageId, options = {}) {
  const {
    category,
    grade,
    minPrice,
    maxPrice,
    available,
    status = 'available',
    page = 1,
    limit = 20
  } = options;

  const query = { villageId, status };

  if (category) query.category = category;
  if (grade) query['quality.grade'] = grade;

  if (minPrice || maxPrice) {
    query['price.minPrice'] = {};
    if (minPrice) query['price.minPrice'].$lte = minPrice;
    if (maxPrice) query['price.maxPrice'].$gte = maxPrice;
  }

  if (available !== undefined) {
    const now = new Date();
    if (available) {
      query['availability.startDate'] = { $lte: now };
      query.$or = [
        { 'availability.endDate': { $exists: false } },
        { 'availability.endDate': { $gte: now } }
      ];
    } else {
      query.$or = [
        { 'availability.startDate': { $gt: now } },
        { 'availability.endDate': { $lt: now } }
      ];
    }
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('farmerId', 'name phone')
    .populate('villageId', 'name');
};

farmProductSupplySchema.statics.findByCategory = function(category, options = {}) {
  const {
    grade,
    minPrice,
    maxPrice,
    available,
    page = 1,
    limit = 20
  } = options;

  const query = { category, status: 'available' };

  if (grade) query['quality.grade'] = grade;

  if (minPrice || maxPrice) {
    query['price.minPrice'] = {};
    if (minPrice) query['price.minPrice'].$lte = minPrice;
    if (maxPrice) query['price.maxPrice'].$gte = maxPrice;
  }

  if (available !== undefined) {
    const now = new Date();
    if (available) {
      query['availability.startDate'] = { $lte: now };
      query.$or = [
        { 'availability.endDate': { $exists: false } },
        { 'availability.endDate': { $gte: now } }
      ];
    } else {
      query.$or = [
        { 'availability.startDate': { $gt: now } },
        { 'availability.endDate': { $lt: now } }
      ];
    }
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('farmerId', 'name phone')
    .populate('villageId', 'name');
};

farmProductSupplySchema.statics.searchSupplies = function(keyword, options = {}) {
  const {
    category,
    grade,
    minPrice,
    maxPrice,
    location,
    sortBy = 'relevance',
    page = 1,
    limit = 20
  } = options;

  const query = {
    status: 'available',
    $text: { $search: keyword }
  };

  if (category) query.category = category;
  if (grade) query['quality.grade'] = grade;

  if (minPrice || maxPrice) {
    query['price.minPrice'] = {};
    if (minPrice) query['price.minPrice'].$lte = minPrice;
    if (maxPrice) query['price.maxPrice'].$gte = maxPrice;
  }

  let sort = {};
  switch (sortBy) {
  case 'relevance':
    sort = { score: { $meta: 'textScore' } };
    break;
  case 'price_asc':
    sort = { 'price.minPrice': 1 };
    break;
  case 'price_desc':
    sort = { 'price.minPrice': -1 };
    break;
  case 'rating':
    sort = { 'stats.averageRating': -1 };
    break;
  case 'views':
    sort = { 'stats.totalViews': -1 };
    break;
  default:
    sort = { createdAt: -1 };
  }

  return this.find(query, { score: { $meta: 'textScore' } })
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('farmerId', 'name phone')
    .populate('villageId', 'name');
};

farmProductSupplySchema.statics.findRecommended = function(limit = 10, villageId = null) {
  const query = {
    'recommendation.isRecommended': true,
    'recommendation.validUntil': { $gte: new Date() },
    status: 'available'
  };

  if (villageId) {
    query.villageId = villageId;
  }

  return this.find(query)
    .sort({ 'recommendation.priority': -1, 'stats.totalViews': -1 })
    .limit(limit)
    .populate('farmerId', 'name phone')
    .populate('villageId', 'name');
};

farmProductSupplySchema.statics.getTopRated = function(limit = 10, category = null) {
  const query = {
    status: 'available',
    'stats.averageRating': { $gte: 4 }
  };

  if (category) {
    query.category = category;
  }

  return this.find(query)
    .sort({ 'stats.averageRating': -1, 'reviews.length': -1 })
    .limit(limit)
    .populate('farmerId', 'name phone')
    .populate('villageId', 'name');
};

farmProductSupplySchema.statics.getStats = function(filters = {}) {
  const {
    farmerId,
    villageId,
    category,
    grade,
    startDate,
    endDate
  } = filters;

  const matchCondition = { status: 'available' };

  if (farmerId) matchCondition.farmerId = farmerId;
  if (villageId) matchCondition.villageId = villageId;
  if (category) matchCondition.category = category;
  if (grade) matchCondition['quality.grade'] = grade;

  if (startDate || endDate) {
    matchCondition.createdAt = {};
    if (startDate) matchCondition.createdAt.$gte = new Date(startDate);
    if (endDate) matchCondition.createdAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    {
      $match: matchCondition
    },
    {
      $group: {
        _id: {
          category: '$category',
          grade: '$quality.grade'
        },
        count: { $sum: 1 },
        averagePrice: {
          $avg: { $add: ['$price.minPrice', '$price.maxPrice'] }
        },
        totalQuantity: { $sum: '$quantity' },
        averageRating: { $avg: '$stats.averageRating' },
        totalViews: { $sum: '$stats.totalViews' },
        totalTransactions: { $sum: '$stats.totalTransactions' }
      }
    },
    {
      $group: {
        _id: '$_id.category',
        grades: {
          $push: {
            grade: '$_id.grade',
            count: '$count',
            averagePrice: '$averagePrice',
            totalQuantity: '$totalQuantity'
          }
        },
        totalCount: { $sum: '$count' },
        averagePrice: { $avg: '$averagePrice' },
        totalQuantity: { $sum: '$totalQuantity' },
        averageRating: { $avg: '$averageRating' },
        totalViews: { $sum: '$totalViews' },
        totalTransactions: { $sum: '$totalTransactions' }
      }
    },
    {
      $sort: { totalCount: -1 }
    }
  ]);
};

farmProductSupplySchema.statics.getSeasonalSupplies = function(season = null, page = 1, limit = 20) {
  const query = { status: 'available' };

  if (season) {
    query['harvest.season'] = season;
  } else {
    // 获取当前季节的产品
    const currentMonth = new Date().getMonth();
    const seasonMap = {
      0: 'winter', 1: 'winter',
      2: 'spring', 3: 'spring', 4: 'spring',
      5: 'summer', 6: 'summer', 7: 'summer', 8: 'summer',
      9: 'autumn', 10: 'autumn', 11: 'autumn',
      12: 'winter'
    };
    query['harvest.season'] = { $in: [seasonMap[currentMonth], 'year_round'] };
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('farmerId', 'name phone')
    .populate('villageId', 'name');
};

// 导出模型
module.exports = mongoose.model('FarmProductSupply', farmProductSupplySchema);