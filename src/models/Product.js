/**
 * 电子商务产品模型
 */

const mongoose = require('mongoose');

// 商品状态
const ProductStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  OUT_OF_STOCK: 'out_of_stock',
  DELETED: 'deleted'
};

/**
 * 商品分类模型
 */
const ProductCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 50
  },
  code: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  description: String,
  icon: String,
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductCategory'
  },
  level: {
    type: Number,
    default: 1
  },
  sort: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true,
  collection: 'product_categories'
});

/**
 * 店铺模型
 */
const ShopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  logo: String,
  banner: String,

  // 店铺类型
  type: {
    type: String,
    enum: ['individual', 'cooperative', 'enterprise', 'government'],
    default: 'individual'
  },

  // 店主信息
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true,
    index: true
  },

  // 联系信息
  contact: {
    phone: String,
    email: String,
    address: String,
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number]
    }
  },

  // 营业信息
  businessLicense: String,
  businessScope: [String],
  operatingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },

  // 评价统计
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },

  // 状态
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'closed'],
    default: 'pending'
  },

  // 关联
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'shops'
});

/**
 * 商品主模型
 */
const ProductSchema = new mongoose.Schema({
  // 基础信息
  name: {
    type: String,
    required: true,
    maxlength: 200,
    index: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  shortDescription: {
    type: String,
    maxlength: 500
  },

  // 分类信息
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductCategory',
    required: true,
    index: true
  },
  tags: [String],

  // 店铺信息
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    index: true
  },

  // 价格信息
  price: {
    type: Number,
    required: true,
    min: 0
  },
  originalPrice: Number,
  costPrice: Number,
  currency: {
    type: String,
    default: 'CNY'
  },

  // 库存信息
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  minOrder: {
    type: Number,
    default: 1,
    min: 1
  },
  maxOrder: {
    type: Number,
    default: 999999,
    min: 1
  },
  unit: {
    type: String,
    required: true,
    maxlength: 20
  },

  // 规格参数
  specifications: {
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    brand: String,
    model: String,
    origin: String,
    productionDate: Date,
    expiryDate: Date,
    certification: [String],
    attributes: mongoose.Schema.Types.Mixed
  },

  // 商品图片
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: String,
    sort: {
      type: Number,
      default: 0
    },
    isMain: {
      type: Boolean,
      default: false
    }
  }],

  // 农产品特有字段
  isAgricultural: {
    type: Boolean,
    default: true
  },
  harvestTime: Date,
  season: String,
  plantingMethod: String,
  pesticideFree: {
    type: Boolean,
    default: false
  },
  organic: {
    type: Boolean,
    default: false
  },

  // 销售信息
  sales: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  favorites: {
    type: Number,
    default: 0
  },

  // 评价信息
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],

  // 配送信息
  delivery: {
    weight: Number,
    volume: Number,
    fragile: {
      type: Boolean,
      default: false
    },
    refrigerated: {
      type: Boolean,
      default: false
    },
    deliveryMethods: [{
      type: String,
      enum: ['pickup', 'delivery', 'express', 'freight']
    }],
    deliveryFee: {
      type: Number,
      default: 0
    },
    freeDeliveryThreshold: Number
  },

  // 状态
  status: {
    type: String,
    enum: Object.values(ProductStatus),
    default: 'active',
    index: true
  },
  featured: {
    type: Boolean,
    default: false
  },

  // 关联信息
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true,
    index: true
  },

  // SEO信息
  seo: {
    title: String,
    keywords: [String],
    description: String
  },

  // 创建和更新时间
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  publishedAt: Date
}, {
  timestamps: true,
  collection: 'products'
});

/**
 * 购物车模型
 */
const CartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    specifications: mongoose.Schema.Types.Mixed,
    price: Number,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  totals: {
    items: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false,
  collection: 'carts'
});

/**
 * 订单模型
 */
const OrderSchema = new mongoose.Schema({
  // 订单信息
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // 订单类型
  type: {
    type: String,
    enum: ['purchase', 'group_buy', 'preorder'],
    default: 'purchase'
  },

  // 用户信息
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true,
    index: true
  },

  // 商品列表
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    productName: String,
    productImage: String,
    unit: String,
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    total: {
      type: Number,
      required: true
    },
    specifications: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending'
    }
  }],

  // 金额信息
  subtotal: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  shippingFee: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },

  // 配送信息
  deliveryAddress: {
    recipient: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    postalCode: String,
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number]
    }
  },
  deliveryMethod: {
    type: String,
    enum: ['pickup', 'delivery', 'express'],
    default: 'delivery'
  },
  shippingInfo: {
    company: String,
    trackingNumber: String,
    shippedAt: Date,
    estimatedDelivery: Date,
    deliveredAt: Date
  },

  // 支付信息
  paymentMethod: String,
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'refunded', 'cancelled'],
    default: 'unpaid'
  },
  paymentId: String,
  paidAt: Date,

  // 订单状态
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  cancelReason: String,
  cancelledAt: Date,

  // 备注
  remark: String,

  // 评价状态
  reviewed: {
    type: Boolean,
    default: false
  },

  // 创建时间
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
  timestamps: true,
  collection: 'orders'
});

/**
 * 团购活动模型
 */
const GroupBuySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  productName: String,
  productImage: String,

  // 团购设置
  originalPrice: {
    type: Number,
    required: true
  },
  groupPrice: {
    type: Number,
    required: true
  },
  targetQuantity: {
    type: Number,
    required: true,
    min: 2
  },
  currentQuantity: {
    type: Number,
    default: 0
  },
  maxQuantity: Number,

  // 时间设置
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },

  // 活动描述
  description: String,
  rules: [String],

  // 参与者
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      // ref: 'User',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'cancelled'],
      default: 'pending'
    }
  }],

  // 状态
  status: {
    type: String,
    enum: ['draft', 'active', 'success', 'failed', 'cancelled'],
    default: 'draft'
  },
  successTime: Date,

  // 创建信息
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'group_buys'
});

/**
 * 评价模型
 */
const ReviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true,
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },

  // 评价内容
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  images: [{
    url: String,
    description: String
  }],

  // 评价维度
  dimensions: {
    quality: { type: Number, min: 1, max: 5 },
    service: { type: Number, min: 1, max: 5 },
    delivery: { type: Number, min: 1, max: 5 },
    value: { type: Number, min: 1, max: 5 }
  },

  // 状态
  status: {
    type: String,
    enum: ['draft', 'published', 'hidden'],
    default: 'published'
  },
  helpful: {
    type: Number,
    default: 0
  },

  // 商家回复
  sellerReply: {
    content: String,
    repliedAt: Date,
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'reviews'
});

// 索引定义
ProductCategorySchema.index({ code: 1 });
ProductCategorySchema.index({ parentId: 1, sort: 1 });

ShopSchema.index({ ownerId: 1 });
ShopSchema.index({ villageId: 1, status: 1 });

ProductSchema.index({ name: 'text', description: 'text' });
ProductSchema.index({ categoryId: 1 });
ProductSchema.index({ shopId: 1 });
ProductSchema.index({ villageId: 1, status: 1 });
ProductSchema.index({ sellerId: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ sales: -1 });
ProductSchema.index({ 'rating.average': -1 });

OrderSchema.index({ userId: 1 });
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ status: 1 });
// createdAt索引已由timestamps: true自动创建,无需手动指定

GroupBuySchema.index({ productId: 1 });
GroupBuySchema.index({ status: 1 });
GroupBuySchema.index({ endTime: 1 });

ReviewSchema.index({ userId: 1, productId: 1 });
ReviewSchema.index({ productId: 1, rating: -1 });
// createdAt索引已由timestamps: true自动创建,无需手动指定

// 静态方法 - 生成订单号
OrderSchema.statics.generateOrderNumber = async function() {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
                 (date.getMonth() + 1).toString().padStart(2, '0') +
                 date.getDate().toString().padStart(2, '0');

  const timeStr = Date.now().toString().slice(-6);
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `ORD${dateStr}${timeStr}${randomStr}`;
};

// 虚拟字段
ProductSchema.virtual('isInStock').get(function() {
  return this.stock > 0;
});

ProductSchema.virtual('discountPercentage').get(function() {
  if (this.originalPrice && this.originalPrice > this.price) {
    return ((this.originalPrice - this.price) / this.originalPrice * 100).toFixed(2);
  }
  return 0;
});

GroupBuySchema.virtual('progressPercentage').get(function() {
  if (this.targetQuantity > 0) {
    return (this.currentQuantity / this.targetQuantity * 100).toFixed(2);
  }
  return 0;
});

GroupBuySchema.virtual('discountAmount').get(function() {
  return this.originalPrice - this.groupPrice;
});

module.exports = {
  Product: mongoose.model('Product', ProductSchema),
  ProductCategory: mongoose.model('ProductCategory', ProductCategorySchema),
  Shop: mongoose.model('Shop', ShopSchema),
  Cart: mongoose.model('Cart', CartSchema),
  Order: mongoose.models.Order || mongoose.model('Order', OrderSchema),
  GroupBuy: mongoose.model('GroupBuy', GroupBuySchema),
  Review: mongoose.model('Review', ReviewSchema),
  ProductStatus
};