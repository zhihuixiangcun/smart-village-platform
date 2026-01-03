/**
 * 农资产品模型
 */

const mongoose = require('mongoose');

const agriculturalProductSchema = new mongoose.Schema({
  // 基本信息
  name: {
    type: String,
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: ['seed', 'fertilizer', 'pesticide', 'machinery', 'tool', 'feed', 'other'],
    index: true
  },
  subCategory: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    required: true,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  images: [{
    url: String,
    alt: String,
    isMain: { type: Boolean, default: false },
    order: { type: Number, default: 0 }
  }],
  specifications: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // 定价信息
  pricing: {
    retailPrice: {
      type: Number,
      required: true,
      min: 0
    },
    wholesalePrice: {
      type: Number,
      min: 0
    },
    costPrice: {
      type: Number,
      min: 0
    },
    unit: {
      type: String,
      enum: ['piece', 'kg', 'ton', 'bag', 'bottle', 'box', 'meter', 'liter'],
      default: 'piece'
    },
    currency: {
      type: String,
      default: 'CNY'
    },
    taxRate: {
      type: Number,
      default: 0
    },
    discount: {
      percentage: { type: Number, min: 0, max: 100 },
      amount: { type: Number, min: 0 },
      validUntil: Date,
      reason: String
    }
  },

  // 库存管理
  inventory: {
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    minQuantity: {
      type: Number,
      min: 0,
      default: 1
    },
    maxQuantity: {
      type: Number,
      min: 0,
      default: 999999
    },
    lowStockThreshold: {
      type: Number,
      min: 0,
      default: 10
    },
    reorderPoint: {
      type: Number,
      min: 0
    },
    reorderQuantity: {
      type: Number,
      min: 0
    },
    reserved: {
      type: Number,
      default: 0,
      min: 0
    },
    available: {
      type: Number,
      min: 0
    }
  },

  // 供应商信息
  supplier: {
    name: {
      type: String,
      required: true
    },
    contactPerson: String,
    contactPhone: String,
    contactEmail: String,
    address: String,
    businessLicense: String,
    certifications: [String],
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    notes: String
  },

  // 产品属性
  attributes: {
    origin: String,
    brand: String,
    model: String,
    color: String,
    size: String,
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    warranty: {
      period: Number,
      unit: { type: String, enum: ['days', 'months', 'years'], default: 'months' },
      terms: String
    },
    shelfLife: {
      period: Number,
      unit: { type: String, enum: ['days', 'months', 'years'], default: 'months' }
    }
  },

  // 销售统计
  sales: {
    totalSold: {
      type: Number,
      default: 0,
      min: 0
    },
    totalRevenue: {
      type: Number,
      default: 0,
      min: 0
    },
    averageRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0
    },
    monthlySales: [{
      month: String,
      quantity: Number,
      revenue: Number
    }],
    topBuyers: [{
      buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      quantity: Number,
      amount: Number,
      lastPurchase: Date
    }]
  },

  // 使用说明
  usage: {
    instructions: String,
    dosage: String,
    application: String,
    safety: String,
    storage: String,
    compatibility: [String],
    restrictions: [String]
  },

  // 标签和分类
  tags: [String],
  keywords: [String],
  searchTerms: [String],

  // 状态
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued', 'out_of_stock'],
    default: 'active',
    index: true
  },

  // 推荐信息
  recommendation: {
    isRecommended: { type: Boolean, default: false },
    reason: String,
    priority: { type: Number, default: 0 },
    validUntil: Date
  },

  // SEO信息
  seo: {
    title: String,
    description: String,
    keywords: [String],
    url: String
  },

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
  }
}, {
  timestamps: true
});

// 索引
agriculturalProductSchema.index({ category: 1, subCategory: 1, status: 1 });
agriculturalProductSchema.index({ brand: 1, status: 1 });
agriculturalProductSchema.index({ 'pricing.retailPrice': 1 });
agriculturalProductSchema.index({ 'sales.totalSold': -1 });
agriculturalProductSchema.index({ tags: 1 });
agriculturalProductSchema.index({ 'approval.status': 1 });
// createdAt索引已由timestamps: true自动创建,无需手动指定

// 文本搜索索引
agriculturalProductSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text',
  keywords: 'text',
  'supplier.name': 'text'
});

// 虚拟字段
agriculturalProductSchema.virtual('isInStock').get(function() {
  return this.inventory.quantity > this.inventory.reserved;
});

agriculturalProductSchema.virtual('isLowStock').get(function() {
  return this.inventory.quantity <= this.inventory.lowStockThreshold;
});

agriculturalProductSchema.virtual('averagePrice').get(function() {
  return this.pricing.wholesalePrice || this.pricing.retailPrice;
});

agriculturalProductSchema.virtual('discountedPrice').get(function() {
  if (!this.pricing.discount) return this.pricing.retailPrice;

  if (this.pricing.discount.percentage) {
    return this.pricing.retailPrice * (1 - this.pricing.discount.percentage / 100);
  }

  if (this.pricing.discount.amount) {
    return Math.max(0, this.pricing.retailPrice - this.pricing.discount.amount);
  }

  return this.pricing.retailPrice;
});

// 实例方法
agriculturalProductSchema.methods.updateInventory = function(quantity, operation = 'set') {
  switch (operation) {
  case 'add':
    this.inventory.quantity += quantity;
    break;
  case 'subtract':
    this.inventory.quantity = Math.max(0, this.inventory.quantity - quantity);
    break;
  case 'set':
  default:
    this.inventory.quantity = Math.max(0, quantity);
    break;
  }

  // 更新可用库存
  this.inventory.available = Math.max(0, this.inventory.quantity - this.inventory.reserved);
  this.updatedAt = new Date();

  return this.save();
};

agriculturalProductSchema.methods.reserveInventory = function(quantity) {
  if (this.inventory.available < quantity) {
    throw new Error('库存不足');
  }

  this.inventory.reserved += quantity;
  this.inventory.available = this.inventory.quantity - this.inventory.reserved;
  this.updatedAt = new Date();

  return this.save();
};

agriculturalProductSchema.methods.releaseReservedInventory = function(quantity) {
  this.inventory.reserved = Math.max(0, this.inventory.reserved - quantity);
  this.inventory.available = this.inventory.quantity - this.inventory.reserved;
  this.updatedAt = new Date();

  return this.save();
};

agriculturalProductSchema.methods.addSales = function(quantity, revenue) {
  this.sales.totalSold += quantity;
  this.sales.totalRevenue += revenue;
  this.updatedAt = new Date();

  return this.save();
};

agriculturalProductSchema.methods.updateRating = function(rating) {
  const totalReviews = this.sales.reviewCount + 1;
  this.sales.averageRating = ((this.sales.averageRating * this.sales.reviewCount) + rating) / totalReviews;
  this.sales.reviewCount = totalReviews;
  this.updatedAt = new Date();

  return this.save();
};

agriculturalProductSchema.methods.getFeaturedImage = function() {
  const mainImage = this.images.find(img => img.isMain);
  return mainImage || this.images[0] || null;
};

agriculturalProductSchema.methods.applyDiscount = function(percentage, amount, validUntil, reason) {
  this.pricing.discount = {
    percentage: percentage || undefined,
    amount: amount || undefined,
    validUntil,
    reason
  };
  this.updatedAt = new Date();

  return this.save();
};

agriculturalProductSchema.methods.removeDiscount = function() {
  this.pricing.discount = undefined;
  this.updatedAt = new Date();

  return this.save();
};

// 静态方法
agriculturalProductSchema.statics.findByCategory = function(category, options = {}) {
  const {
    subCategory,
    brand,
    minPrice,
    maxPrice,
    inStock,
    status = 'active',
    page = 1,
    limit = 20
  } = options;

  const query = { status };

  query.category = category;
  if (subCategory) query.subCategory = subCategory;
  if (brand) query.brand = brand;

  if (minPrice || maxPrice) {
    query['pricing.retailPrice'] = {};
    if (minPrice) query['pricing.retailPrice'].$gte = minPrice;
    if (maxPrice) query['pricing.retailPrice'].$lte = maxPrice;
  }

  if (inStock) {
    query['inventory.quantity'] = { $gt: 0 };
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('createdBy', 'name');
};

agriculturalProductSchema.statics.findLowStock = function(threshold = null) {
  const query = {
    'inventory.quantity': { $lte: threshold || this.schema.paths.inventory.lowStockThreshold.default },
    status: 'active'
  };

  return this.find(query)
    .sort({ 'inventory.quantity': 1 })
    .populate('createdBy', 'name');
};

agriculturalProductSchema.statics.findRecommended = function(limit = 10) {
  return this.find({
    'recommendation.isRecommended': true,
    'recommendation.validUntil': { $gte: new Date() },
    status: 'active'
  })
    .sort({ 'recommendation.priority': -1, 'sales.totalSold': -1 })
    .limit(limit)
    .populate('createdBy', 'name');
};

agriculturalProductSchema.statics.searchProducts = function(keyword, options = {}) {
  const {
    category,
    minPrice,
    maxPrice,
    sortBy = 'relevance',
    page = 1,
    limit = 20
  } = options;

  const query = {
    status: 'active',
    $text: { $search: keyword }
  };

  if (category) query.category = category;

  if (minPrice || maxPrice) {
    query['pricing.retailPrice'] = {};
    if (minPrice) query['pricing.retailPrice'].$gte = minPrice;
    if (maxPrice) query['pricing.retailPrice'].$lte = maxPrice;
  }

  let sort = {};
  switch (sortBy) {
  case 'relevance':
    sort = { score: { $meta: 'textScore' } };
    break;
  case 'price_asc':
    sort = { 'pricing.retailPrice': 1 };
    break;
  case 'price_desc':
    sort = { 'pricing.retailPrice': -1 };
    break;
  case 'sales':
    sort = { 'sales.totalSold': -1 };
    break;
  case 'rating':
    sort = { 'sales.averageRating': -1 };
    break;
  default:
    sort = { createdAt: -1 };
  }

  return this.find(query, { score: { $meta: 'textScore' } })
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('createdBy', 'name');
};

agriculturalProductSchema.statics.getTopSelling = function(limit = 10, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.find({
    status: 'active',
    'sales.totalSold': { $gt: 0 }
  })
    .sort({ 'sales.totalSold': -1, 'sales.totalRevenue': -1 })
    .limit(limit)
    .populate('createdBy', 'name');
};

agriculturalProductSchema.statics.getStats = function(filters = {}) {
  const {
    category,
    supplier,
    startDate,
    endDate
  } = filters;

  const matchCondition = { status: 'active' };

  if (category) matchCondition.category = category;
  if (supplier) matchCondition['supplier.name'] = supplier;

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
          brand: '$brand'
        },
        count: { $sum: 1 },
        totalValue: { $sum: '$pricing.retailPrice' },
        averagePrice: { $avg: '$pricing.retailPrice' },
        totalSold: { $sum: '$sales.totalSold' },
        totalRevenue: { $sum: '$sales.totalRevenue' },
        averageRating: { $avg: '$sales.averageRating' }
      }
    },
    {
      $group: {
        _id: '$_id.category',
        brands: {
          $push: {
            brand: '$_id.brand',
            count: '$count',
            totalValue: '$totalValue',
            averagePrice: '$averagePrice'
          }
        },
        totalCount: { $sum: '$count' },
        totalValue: { $sum: '$totalValue' },
        averagePrice: { $avg: '$averagePrice' },
        totalSold: { $sum: '$totalSold' },
        totalRevenue: { $sum: '$totalRevenue' },
        averageRating: { $avg: '$averageRating' }
      }
    },
    {
      $sort: { totalRevenue: -1 }
    }
  ]);
};

agriculturalProductSchema.statics.updateMonthlySales = function() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

  return this.aggregate([
    {
      $match: {
        status: 'active',
        'sales.totalSold': { $gt: 0 }
      }
    },
    {
      $project: {
        _id: 1,
        'sales.totalSold': 1,
        'sales.totalRevenue': 1
      }
    },
    {
      $group: {
        _id: null,
        products: {
          $push: {
            productId: '$_id',
            totalSold: '$sales.totalSold',
            totalRevenue: '$sales.totalRevenue'
          }
        }
      }
    }
  ]).then(result => {
    if (result.length > 0) {
      const products = result[0].products;

      products.forEach(async (productData) => {
        await this.findByIdAndUpdate(productData.productId, {
          $push: {
            'sales.monthlySales': {
              month: currentMonth,
              quantity: productData.totalSold,
              revenue: productData.totalRevenue
            }
          }
        });
      });
    }
  });
};

// 中间件：保存前更新可用库存
agriculturalProductSchema.pre('save', function(next) {
  this.inventory.available = Math.max(0, this.inventory.quantity - this.inventory.reserved);
  next();
});

// 导出模型
module.exports = mongoose.model('AgriculturalProduct', agriculturalProductSchema);