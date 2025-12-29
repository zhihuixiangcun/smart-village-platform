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
 * 团购活动模型（增强版）
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
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 团购设置（阶梯定价）
  originalPrice: {
    type: Number,
    required: true
  },
  tiers: [{
    minQuantity: {
      type: Number,
      required: true
    },
    maxQuantity: Number,
    price: {
      type: Number,
      required: true
    },
    discount: {
      type: Number,
      default: 0
    }
  }],
  currentPrice: {
    type: Number,
    required: true
  },

  // 数量设置
  targetQuantity: {
    type: Number,
    required: true,
    min: 2
  },
  currentQuantity: {
    type: Number,
    default: 0
  },
  maxQuantity: {
    type: Number,
    default: 999999
  },
  minOrderPerUser: {
    type: Number,
    default: 1
  },
  maxOrderPerUser: {
    type: Number,
    default: 10
  },

  // 时间设置
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  autoActivateTime: Date,  // 自动激活时间
  earlyEndTime: Date,       // 提前结束时间（达到目标时）

  // 自动设置
  autoActivate: {
    type: Boolean,
    default: false
  },
  autoSuccess: {
    type: Boolean,
    default: true
  },  // 达到目标自动成功
  autoFail: {
    type: Boolean,
    default: true
  },    // 超时自动失败

  // 活动描述
  title: {
    type: String,
    maxlength: 200
  },
  description: String,
  rules: [String],
  terms: String,
  images: [String],

  // 团长信息
  leaderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  leaderName: String,
  leaderPhone: String,
  leaderCommission: {
    type: Number,
    default: 0
  },  // 团长佣金比例

  // 配送设置
  deliveryMethod: {
    type: String,
    enum: ['pickup', 'delivery', 'group_pickup'],
    default: 'group_pickup'
  },
  pickupLocation: {
    address: String,
    contact: String,
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number]
    }
  },
  deliveryFee: {
    type: Number,
    default: 0
  },

  // 参与者
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    userName: String,
    userPhone: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: Number,      // 下单时的价格
    savedAmount: Number,  // 节省金额
    joinedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'confirmed', 'cancelled', 'refunded'],
      default: 'pending'
    },
    paymentId: String,
    paidAt: Date
  }],

  // 分享统计
  shareCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },

  // 状态
  status: {
    type: String,
    enum: ['draft', 'upcoming', 'active', 'success', 'failed', 'cancelled', 'refunding'],
    default: 'draft',
    index: true
  },
  successTime: Date,
  failedReason: String,

  // 退款信息
  refundConfig: {
    enabled: {
      type: Boolean,
      default: true
    },
    autoRefund: {
      type: Boolean,
      default: true
    },
    refundDeadline: Number  // 退款截止时间（小时）
  },

  // 创建信息
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
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
 * 农资采购模型
 */
const AgriculturalSupplySchema = new mongoose.Schema({
  // 基础信息
  name: {
    type: String,
    required: true,
    maxlength: 200
  },
  code: {
    type: String,
    unique: true,
    index: true
  },
  description: {
    type: String,
    maxlength: 2000
  },

  // 分类
  category: {
    type: String,
    enum: ['seed', 'fertilizer', 'pesticide', 'feed', 'equipment', 'other'],
    required: true,
    index: true
  },
  subCategory: String,

  // 供应商信息
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  supplierName: String,
  supplierLicense: String,
  supplierContact: {
    name: String,
    phone: String,
    address: String
  },

  // 规格参数
  specifications: {
    brand: String,
    model: String,
    weight: Number,
    weightUnit: {
      type: String,
      enum: ['g', 'kg', 'ml', 'l', 'piece', 'bag', 'box'],
      default: 'kg'
    },
    package: String,
    shelfLife: Number,  // 保质期（月）
    storageCondition: String
  },

  // 价格信息
  price: {
    type: Number,
    required: true,
    min: 0
  },
  wholesalePrice: Number,  // 批发价
  wholesaleMinQty: {
    type: Number,
    default: 10
  },
  unit: {
    type: String,
    required: true
  },

  // 库存信息
  stock: {
    type: Number,
    required: true,
    default: 0
  },
  minStock: {
    type: Number,
    default: 10
  },  // 最低库存预警
  warehouseLocation: String,

  // 质量认证
  certifications: [{
    type: {
      type: String,
      enum: ['organic', 'green', 'iso', 'gap', 'other']
    },
    number: String,
    expiryDate: Date,
    image: String
  }],

  // 使用说明
  usageInstructions: {
    target: String,      // 适用作物
    dosage: String,      // 用量
    method: String,      // 使用方法
    precautions: [String]  // 注意事项
  },

  // 安全信息
  safetyInfo: {
    toxicity: {
      type: String,
      enum: ['low', 'moderate', 'high']
    },
    hazardClass: String,
    firstAid: String,
    emergencyContact: String
  },

  // 限制购买
  purchaseRestriction: {
    requiresLicense: {
      type: Boolean,
      default: false
    },  // 是否需要许可证
    licenseTypes: [String],
    maxQuantityPerUser: Number
  },

  // 季节性
  seasonality: {
    peakSeasons: [String],  // 旺季月份
    offSeasons: [String]   // 淡季月份
  },

  // 图片
  images: [{
    url: String,
    type: {
      type: String,
      enum: ['product', 'package', 'label', 'certification']
    }
  }],

  // 状态
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'out_of_stock', 'discontinued'],
    default: 'active',
    index: true
  },

  // 村庄关联
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 统计
  sales: {
    type: Number,
    default: 0
  },
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
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
  collection: 'agricultural_supplies'
});

/**
 * 集体采购模型
 */
const BulkPurchaseSchema = new mongoose.Schema({
  // 采购信息
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  type: {
    type: String,
    enum: ['seed', 'fertilizer', 'pesticide', 'equipment', 'mixed'],
    required: true
  },

  // 采购目标
  targetQuantity: {
    type: Number,
    required: true
  },
  currentQuantity: {
    type: Number,
    default: 0
  },
  unit: String,

  // 采购项目
  items: [{
    supplyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgriculturalSupply'
    },
    name: String,
    quantity: Number,
    unit: String,
    estimatedPrice: Number
  }],

  // 预算信息
  estimatedBudget: {
    type: Number,
    required: true
  },
  currentCollected: {
    type: Number,
    default: 0
  },

  // 组织者
  organizerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  organizerName: String,
  organizerRole: {
    type: String,
    enum: ['committee', 'cooperative', 'group_leader']
  },

  // 供应商
  suppliers: [{
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop'
    },
    supplierName: String,
    quotedPrice: Number,
    deliveryTime: Number,
    paymentTerms: String,
    status: {
      type: String,
      enum: ['pending', 'selected', 'rejected'],
      default: 'pending'
    }
  }],
  selectedSupplierId: {
    type: mongoose.Schema.Types.ObjectId
  },

  // 时间安排
  registrationStart: {
    type: Date,
    required: true
  },
  registrationEnd: {
    type: Date,
    required: true
  },
  expectedDeliveryDate: Date,

  // 参与农户
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId
    },
    userName: String,
    farmArea: Number,  // 种植面积
    requiredQuantity: Number,
    contributedAmount: Number,
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'refunded'],
      default: 'pending'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 配送计划
  deliveryPlan: {
    method: {
      type: String,
      enum: ['central pickup', 'farm delivery']
    },
    location: String,
    distributionDate: Date,
    coordinator: String
  },

  // 审批流程
  approval: {
    required: {
      type: Boolean,
      default: true
    },
    approvers: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId
      },
      userName: String,
      role: String,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      comment: String,
    decidedAt: Date
    }],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  },

  // 状态
  status: {
    type: String,
    enum: ['draft', 'registering', 'approved', 'purchasing', 'distributing', 'completed', 'cancelled'],
    default: 'draft',
    index: true
  },

  // 公示信息
  announcement: {
    publishDate: Date,
    content: String,
    attachments: [String]
  },

  // 备注
  notes: String,

  // 村庄关联
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
  collection: 'bulk_purchases'
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
OrderSchema.index({ createdAt: -1 });

GroupBuySchema.index({ productId: 1 });
GroupBuySchema.index({ status: 1 });
GroupBuySchema.index({ endTime: 1 });
GroupBuySchema.index({ villageId: 1, status: 1 });
GroupBuySchema.index({ leaderId: 1 });

AgriculturalSupplySchema.index({ code: 1 });
AgriculturalSupplySchema.index({ category: 1 });
AgriculturalSupplySchema.index({ supplierId: 1 });
AgriculturalSupplySchema.index({ villageId: 1, status: 1 });

BulkPurchaseSchema.index({ villageId: 1, status: 1 });
BulkPurchaseSchema.index({ organizerId: 1 });
BulkPurchaseSchema.index({ registrationEnd: 1 });

ReviewSchema.index({ userId: 1, productId: 1 });
ReviewSchema.index({ productId: 1, rating: -1 });
ReviewSchema.index({ createdAt: -1 });

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
  return this.originalPrice - this.currentPrice;
});

GroupBuySchema.virtual('currentTier').get(function() {
  if (this.tiers && this.tiers.length > 0) {
    const currentTier = this.tiers.slice().reverse().find(tier =>
      this.currentQuantity >= tier.minQuantity
    );
    return currentTier || this.tiers[0];
  }
  return null;
});

GroupBuySchema.virtual('nextTier').get(function() {
  if (this.tiers && this.tiers.length > 0) {
    return this.tiers.find(tier => this.currentQuantity < tier.minQuantity);
  }
  return null;
});

BulkPurchaseSchema.virtual('progressPercentage').get(function() {
  if (this.targetQuantity > 0) {
    return (this.currentQuantity / this.targetQuantity * 100).toFixed(2);
  }
  return 0;
});

BulkPurchaseSchema.virtual('budgetProgressPercentage').get(function() {
  if (this.estimatedBudget > 0) {
    return (this.currentCollected / this.estimatedBudget * 100).toFixed(2);
  }
  return 0;
});

module.exports = {
  Product: mongoose.model('Product', ProductSchema),
  ProductCategory: mongoose.model('ProductCategory', ProductCategorySchema),
  Shop: mongoose.model('Shop', ShopSchema),
  Cart: mongoose.model('Cart', CartSchema),
  Order: mongoose.model('Order', OrderSchema),
  GroupBuy: mongoose.model('GroupBuy', GroupBuySchema),
  AgriculturalSupply: mongoose.model('AgriculturalSupply', AgriculturalSupplySchema),
  BulkPurchase: mongoose.model('BulkPurchase', BulkPurchaseSchema),
  Review: mongoose.model('Review', ReviewSchema),
  ProductStatus
};