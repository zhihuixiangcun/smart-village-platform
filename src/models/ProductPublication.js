/**
 * 产品发布模型
 * 用于乡村生活圈中的产品发布管理
 */

const mongoose = require('mongoose');

// 产品分类枚举
const ProductCategories = {
  // 农产品类
  VEGETABLES: 'vegetables',       // 蔬菜
  FRUITS: 'fruits',               // 水果
  GRAINS: 'grains',               // 粮食
  LIVESTOCK: 'livestock',         // 畜禽
  AQUATIC: 'aquatic',             // 水产
  SPECIALTY: 'specialty',         // 土特产

  // 生活用品
  DAILY_NECESSITIES: 'daily_necessities', // 日用品
  APPLIANCES: 'appliances',       // 家电
  FURNITURE: 'furniture',         // 家具
  BUILDING_MATERIALS: 'building_materials', // 建材

  // 服务类
  HOUSEKEEPING: 'housekeeping',   // 家政
  REPAIR: 'repair',               // 维修
  MOVING: 'moving',               // 搬运
  TECHNICAL: 'technical',         // 技术

  // 其他类
  SECONDHAND: 'secondhand',       // 闲置物品
  RENTAL: 'rental',               // 租赁
  WANTED: 'wanted'                // 求购
};

// 产品状态枚举
const ProductStatus = {
  PENDING: 'pending',             // 待审核
  REVIEWING: 'reviewing',         // 审核中
  PUBLISHED: 'published',         // 已发布
  REJECTED: 'rejected',           // 已拒绝
  EXPIRED: 'expired',             // 已失效
  OFFLINE: 'offline',             // 已下架
  SOLD_OUT: 'sold_out'            // 已售罄
};

// 价格类型枚举
const PriceType = {
  FIXED: 'fixed',                 // 固定价格
  NEGOTIABLE: 'negotiable',       // 面议
  RANGE: 'range'                  // 价格区间
};

// 验证方式枚举
const VerifyMethod = {
  ID_CARD: 'id_card',             // 身份证验证
  FACE_RECOGNITION: 'face_recognition' // 人脸识别
};

const productPublicationSchema = new mongoose.Schema({
  // 关联村庄
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 发布者信息
  publisherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: true,
    index: true
  },
  publisherName: {
    type: String,
    required: true
  },
  publisherPhone: {
    type: String,
    required: true
  },
  publisherVerified: {
    type: Boolean,
    required: true,
    default: false
  },
  verifyMethod: {
    type: String,
    enum: Object.values(VerifyMethod),
    required: true
  },
  verifyData: {
    type: mongoose.Schema.Types.Mixed,
    description: '验证数据（身份证信息/人脸识别结果）'
  },

  // 产品基本信息
  productName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  productCategory: {
    type: String,
    enum: Object.values(ProductCategories),
    required: true,
    index: true
  },
  categoryName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },

  // 价格信息
  price: {
    type: Number,
    min: 0,
    required: true
  },
  priceType: {
    type: String,
    enum: Object.values(PriceType),
    default: PriceType.FIXED
  },
  priceMin: {
    type: Number,
    min: 0,
    description: '价格区间最低价（当priceType为range时）'
  },
  priceMax: {
    type: Number,
    min: 0,
    description: '价格区间最高价（当priceType为range时）'
  },
  priceUnit: {
    type: String,
    default: '元',
    enum: ['元', '元/斤', '元/公斤', '元/个', '元/件', '元/天', '元/小时', '元/次']
  },

  // 产品图片
  images: [{
    url: {
      type: String,
      required: true
    },
    thumbnail: String,
    caption: String,
    isPrimary: {
      type: Boolean,
      default: false
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],

  // 联系方式
  contactPhone: {
    type: String,
    required: true
  },
  contactWechat: {
    type: String
  },
  contactAddress: {
    type: String,
    required: true,
    maxlength: 200
  },

  // 地理位置
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      index: '2dsphere'
    }
  },
  district: {
    type: String,
    description: '所在区域/组'
  },

  // 有效期管理
  validDays: {
    type: Number,
    required: true,
    min: 1,
    max: 365,
    default: 30,
    description: '有效天数'
  },
  publishedAt: {
    type: Date,
    default: Date.now
  },
  effectiveUntil: {
    type: Date,
    required: true
  },
  refreshedAt: {
    type: Date,
    description: '最后刷新时间'
  },

  // 产品状态
  status: {
    type: String,
    enum: Object.values(ProductStatus),
    default: ProductStatus.PENDING,
    index: true
  },

  // 审核信息
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewerName: {
    type: String
  },
  reviewedAt: {
    type: Date
  },
  reviewRemark: {
    type: String,
    maxlength: 500
  },

  // 统计数据
  viewCount: {
    type: Number,
    default: 0
  },
  favoriteCount: {
    type: Number,
    default: 0
  },
  contactCount: {
    type: Number,
    default: 0,
    description: '被联系次数'
  },
  shareCount: {
    type: Number,
    default: 0,
    description: '分享次数'
  },
  reportCount: {
    type: Number,
    default: 0,
    description: '举报次数'
  },

  // 标签
  tags: [{
    type: String,
    trim: true
  }],

  // 产品属性（扩展字段）
  attributes: {
    type: mongoose.Schema.Types.Mixed,
    description: '产品特定属性（如：品牌、规格、产地、生产日期等）'
  },

  // 举报记录
  reports: [{
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resident'
    },
    reporterName: String,
    reason: {
      type: String,
      enum: ['虚假信息', '价格不符', '图片不符', '联系方式无效', '欺诈', '违规内容', '其他']
    },
    description: String,
    reportDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'processed', 'dismissed'],
      default: 'pending'
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    processedDate: Date,
    processRemark: String
  }],

  // 收藏用户
  favoritedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident'
  }],

  // 信用评分
  creditScore: {
    type: Number,
    default: 100,
    min: 0,
    max: 100,
    description: '发布者信用分'
  },

  // 备注
  remark: {
    type: String,
    maxlength: 500
  },

  // 操作记录
  operationLogs: [{
    operatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    operatorName: String,
    operation: {
      type: String,
      enum: ['create', 'approve', 'reject', 'publish', 'offline', 'refresh', 'expire', 'delete']
    },
    description: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

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

  // 软删除
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'productPublications'
});

// 复合索引
productPublicationSchema.index({ villageId: 1, status: 1, publishedAt: -1 });
productPublicationSchema.index({ productCategory: 1, status: 1 });
productPublicationSchema.index({ publisherId: 1, status: 1 });
productPublicationSchema.index({ effectiveUntil: 1, status: 1 });
productPublicationSchema.index({ price: 1 });

// 地理位置索引
productPublicationSchema.index({ location: '2dsphere' });

// 全文搜索索引
productPublicationSchema.index({
  productName: 'text',
  description: 'text',
  tags: 'text'
});

// 虚拟字段 - 是否有效
productPublicationSchema.virtual('isValid').get(function() {
  return this.status === ProductStatus.PUBLISHED && new Date() < this.effectiveUntil;
});

// 虚拟字段 - 剩余有效天数
productPublicationSchema.virtual('remainingDays').get(function() {
  const now = new Date();
  if (now >= this.effectiveUntil) return 0;
  return Math.ceil((this.effectiveUntil - now) / (1000 * 60 * 60 * 24));
});

// 虚拟字段 - 是否即将到期（3天内）
productPublicationSchema.virtual('isExpiringSoon').get(function() {
  const remaining = this.remainingDays;
  return remaining > 0 && remaining <= 3;
});

// 虚拟字段 - 封面图片
productPublicationSchema.virtual('coverImage').get(function() {
  const primaryImage = this.images.find(img => img.isPrimary);
  return primaryImage ? primaryImage.url : (this.images[0]?.url || null);
});

// 实例方法 - 发布产品
productPublicationSchema.methods.publish = function() {
  this.status = ProductStatus.PUBLISHED;
  this.publishedAt = new Date();
  this.updatedAt = new Date();
  return this.save();
};

// 实例方法 - 审核通过
productPublicationSchema.methods.approve = function(reviewerId, reviewerName, remark = '') {
  this.status = ProductStatus.PUBLISHED;
  this.reviewerId = reviewerId;
  this.reviewerName = reviewerName;
  this.reviewedAt = new Date();
  this.reviewRemark = remark;
  this.publishedAt = new Date();

  this._addLog(reviewerId, reviewerName, 'approve', '审核通过');

  return this.save();
};

// 实例方法 - 审核拒绝
productPublicationSchema.methods.reject = function(reviewerId, reviewerName, reason) {
  this.status = ProductStatus.REJECTED;
  this.reviewerId = reviewerId;
  this.reviewerName = reviewerName;
  this.reviewedAt = new Date();
  this.reviewRemark = reason;

  this._addLog(reviewerId, reviewerName, 'reject', `审核拒绝: ${reason}`);

  return this.save();
};

// 实例方法 - 下架产品
productPublicationSchema.methods.offline = function(operatorId, operatorName, reason = '') {
  this.status = ProductStatus.OFFLINE;
  this._addLog(operatorId, operatorName, 'offline', reason || '手动下架');
  return this.save();
};

// 实例方法 - 刷新产品
productPublicationSchema.methods.refresh = function() {
  this.refreshedAt = new Date();
  this.publishedAt = new Date();

  // 重新计算有效期
  const newEffectiveUntil = new Date();
  newEffectiveUntil.setDate(newEffectiveUntil.getDate() + this.validDays);
  this.effectiveUntil = newEffectiveUntil;

  // 如果已失效，恢复为已发布状态
  if (this.status === ProductStatus.EXPIRED) {
    this.status = ProductStatus.PUBLISHED;
  }

  this._addLog(null, '系统', 'refresh', '产品刷新');

  return this.save();
};

// 实例方法 - 标记为已失效
productPublicationSchema.methods.expire = function() {
  this.status = ProductStatus.EXPIRED;
  this._addLog(null, '系统', 'expire', '产品自动失效');
  return this.save();
};

// 实例方法 - 增加浏览量
productPublicationSchema.methods.incrementView = function() {
  this.viewCount += 1;
  return this.save();
};

// 实例方法 - 收藏/取消收藏
productPublicationSchema.methods.toggleFavorite = function(userId, isFavorite) {
  if (isFavorite) {
    if (!this.favoritedBy.includes(userId)) {
      this.favoritedBy.push(userId);
      this.favoriteCount += 1;
    }
  } else {
    this.favoritedBy = this.favoritedBy.filter(id => id.toString() !== userId.toString());
    this.favoriteCount = Math.max(0, this.favoriteCount - 1);
  }
  return this.save();
};

// 实例方法 - 添加举报
productPublicationSchema.methods.addReport = function(reporterId, reporterName, reason, description) {
  this.reports.push({
    reporterId,
    reporterName,
    reason,
    description,
    reportDate: new Date()
  });
  this.reportCount += 1;

  // 如果举报次数过多，自动下架
  if (this.reportCount >= 5) {
    this.status = ProductStatus.OFFLINE;
    this._addLog(null, '系统', 'offline', `举报次数过多(${this.reportCount})，自动下架`);
  }

  return this.save();
};

// 实例方法 - 添加图片
productPublicationSchema.methods.addImages = function(imageUrls) {
  imageUrls.forEach((url, index) => {
    const isPrimary = this.images.length === 0 && index === 0;
    this.images.push({
      url,
      isPrimary,
      uploadDate: new Date()
    });
  });
  return this.save();
};

// 实例方法 - 设置封面图片
productPublicationSchema.methods.setCoverImage = function(imageUrl) {
  this.images.forEach(img => img.isPrimary = false);

  const targetImage = this.images.find(img => img.url === imageUrl);
  if (targetImage) {
    targetImage.isPrimary = true;
  } else {
    this.images.push({
      url: imageUrl,
      isPrimary: true,
      uploadDate: new Date()
    });
  }

  return this.save();
};

// 实例方法 - 删除图片
productPublicationSchema.methods.removeImage = function(imageUrl) {
  this.images = this.images.filter(img => img.url !== imageUrl);

  // 如果删除的是封面，设置第一张为封面
  if (this.images.length > 0 && !this.images.some(img => img.isPrimary)) {
    this.images[0].isPrimary = true;
  }

  return this.save();
};

// 私有方法 - 添加操作日志
productPublicationSchema.methods._addLog = function(operatorId, operatorName, operation, description) {
  this.operationLogs.push({
    operatorId,
    operatorName,
    operation,
    description,
    timestamp: new Date()
  });

  // 保留最近50条日志
  if (this.operationLogs.length > 50) {
    this.operationLogs = this.operationLogs.slice(-50);
  }
};

// 静态方法 - 获取有效产品列表
productPublicationSchema.statics.getValidProducts = function(villageId, options = {}) {
  const {
    category,
    priceMin,
    priceMax,
    keyword,
    limit = 20,
    skip = 0,
    sortBy = 'publishedAt',
    sortOrder = -1
  } = options;

  const query = {
    villageId,
    status: ProductStatus.PUBLISHED,
    effectiveUntil: { $gt: new Date() },
    isDeleted: false
  };

  if (category) query.productCategory = category;
  if (priceMin !== undefined || priceMax !== undefined) {
    query.price = {};
    if (priceMin !== undefined) query.price.$gte = priceMin;
    if (priceMax !== undefined) query.price.$lte = priceMax;
  }
  if (keyword) {
    query.$or = [
      { productName: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } },
      { tags: { $regex: keyword, $options: 'i' } }
    ];
  }

  return this.find(query)
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .populate('publisherId', 'name phone')
    .lean();
};

// 静态方法 - 获取待审核产品列表
productPublicationSchema.statics.getPendingProducts = function(villageId, options = {}) {
  const { limit = 20, skip = 0 } = options;

  return this.find({
    villageId,
    status: { $in: [ProductStatus.PENDING, ProductStatus.REVIEWING] },
    isDeleted: false
  })
    .sort({ publishedAt: 1 })
    .skip(skip)
    .limit(limit)
    .populate('publisherId', 'name phone')
    .lean();
};

// 静态方法 - 获取我发布的产品
productPublicationSchema.statics.getMyProducts = function(publisherId, options = {}) {
  const { status, limit = 20, skip = 0 } = options;

  const query = {
    publisherId,
    isDeleted: false
  };

  if (status) query.status = status;

  return this.find(query)
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// 静态方法 - 附近的产品（基于地理位置）
productPublicationSchema.statics.getNearbyProducts = function(longitude, latitude, maxDistance = 5000, options = {}) {
  const {
    villageId,
    category,
    limit = 20,
    skip = 0
  } = options;

  const query = {
    status: ProductStatus.PUBLISHED,
    effectiveUntil: { $gt: new Date() },
    isDeleted: false
  };

  if (villageId) query.villageId = villageId;
  if (category) query.productCategory = category;

  return this.find(query)
    .where('location').near({
      type: 'Point',
      coordinates: [longitude, latitude]
    }).maxDistance(maxDistance)
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('publisherId', 'name phone')
    .lean();
};

// 静态方法 - 获取产品统计
productPublicationSchema.statics.getProductStats = function(villageId) {
  return this.aggregate([
    {
      $match: {
        villageId: new mongoose.Types.ObjectId(villageId),
        isDeleted: false
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// 静态方法 - 获取热门分类
productPublicationSchema.statics.getPopularCategories = function(villageId, limit = 10) {
  return this.aggregate([
    {
      $match: {
        villageId: new mongoose.Types.ObjectId(villageId),
        status: ProductStatus.PUBLISHED,
        effectiveUntil: { $gt: new Date() },
        isDeleted: false
      }
    },
    {
      $group: {
        _id: '$productCategory',
        count: { $sum: 1 },
        totalViews: { $sum: '$viewCount' }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

// 静态方法 - 标记过期产品（定时任务调用）
productPublicationSchema.statics.markExpiredProducts = async function() {
  const now = new Date();

  const result = await this.updateMany(
    {
      status: ProductStatus.PUBLISHED,
      effectiveUntil: { $lt: now },
      isDeleted: false
    },
    {
      $set: {
        status: ProductStatus.EXPIRED,
        updatedAt: now
      }
    }
  );

  return result.modifiedCount;
};

// 中间件 - 保存前更新时间
productPublicationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 导出模型和枚举
const ProductPublication = mongoose.model('ProductPublication', productPublicationSchema);

module.exports = {
  ProductPublication,
  ProductCategories,
  ProductStatus,
  PriceType,
  VerifyMethod
};
