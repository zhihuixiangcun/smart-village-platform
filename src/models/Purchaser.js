/**
 * 采购商数据模型
 *
 * 支持两种采购商类型：
 * - 个人采购商: 个人身份，购买农产品
 * - 商家采购商: 企业/商家身份，批量采购
 */

const mongoose = require('mongoose');
const { encrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

const purchaserSchema = new mongoose.Schema({
  // 采购商类型
  purchaserType: {
    type: String,
    enum: ['individual', 'business'],
    required: true
  },

  // 基本信息
  basicInfo: {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    idCard: {
      type: String,
      required: true,
      set: function(v) { return encrypt(v); },
      select: false  // 默认不返回身份证号
    },
    idCardFront: {
      fileName: String,
      fileUrl: String,
      uploadDate: { type: Date, default: Date.now }
    },
    idCardBack: {
      fileName: String,
      fileUrl: String,
      uploadDate: { type: Date, default: Date.now }
    }
  },

  // 个人采购商专属信息
  individualInfo: {
    // 个人所在位置（用于智能推荐）
    location: {
      province: String,
      city: String,
      district: String,
      address: String,
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere'
      }
    },
    // 主要采购类目
    purchaseCategories: [{
      type: String,
      trim: true
    }],
    // 采购预算范围
    budgetRange: {
      min: Number,
      max: Number
    },
    // 个人简介
    bio: String
  },

  // 商家采购商专属信息
  businessInfo: {
    // 企业名称
    companyName: { type: String, required: function() { return this.purchaserType === 'business'; } },
    // 统一社会信用代码
    creditCode: String,
    // 营业执照
    businessLicense: {
      fileName: String,
      fileUrl: String,
      uploadDate: { type: Date, default: Date.now }
    },
    // 企业所在位置
    location: {
      province: String,
      city: String,
      district: String,
      address: String,
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere'
      }
    },
    // 主要采购类目
    purchaseCategories: [{
      type: String,
      trim: true
    }],
    // 企业规模
    scale: {
      type: String,
      enum: ['micro', 'small', 'medium', 'large']
    },
    // 年采购量（吨）
    annualPurchaseVolume: Number,
    // 联系人信息
    contactPerson: {
      name: String,
      phone: String,
      email: String,
      position: String
    }
  },

  // 账户状态
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'deleted'],
    default: 'pending'
  },

  // 认证状态
  verification: {
    isVerified: { type: Boolean, default: false },
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ocrVerified: { type: Boolean, default: false },  // OCR验证
    confidenceScore: Number
  },

  // 偏好设置
  preferences: {
    // 推送通知开关
    pushNotifications: { type: Boolean, default: true },
    // 邮件通知开关
    emailNotifications: { type: Boolean, default: true },
    // 短信通知开关
    smsNotifications: { type: Boolean, default: false },
    // 推荐距离范围（公里）
    recommendationRadius: { type: Number, default: 50 },
    // 语言偏好
    language: { type: String, default: 'zh-CN' }
  },

  // 统计信息
  statistics: {
    totalOrders: { type: Number, default: 0 },
    totalPurchaseAmount: { type: Number, default: 0 },
    totalTransactions: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 }
  },

  // 最后登录信息
  lastLogin: {
    ip: String,
    date: Date,
    location: {
      type: { type: String },
      coordinates: [Number]
    }
  },

  // 元数据
  metadata: {
    registrationSource: { type: String, default: 'web' }, // web, mobile, app
    ipAddress: String,
    userAgent: String,
    referrer: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
purchaserSchema.index({ 'basicInfo.phone': 1 });
purchaserSchema.index({ status: 1 });
purchaserSchema.index({ purchaserType: 1 });
purchaserSchema.index({ 'individualInfo.location.coordinates': '2dsphere' });
purchaserSchema.index({ 'businessInfo.location.coordinates': '2dsphere' });
purchaserSchema.index({ createdAt: -1 });

// 虚拟字段：获取采购类目
purchaserSchema.virtual('purchaseCategories').get(function() {
  if (this.purchaserType === 'individual') {
    return this.individualInfo?.purchaseCategories || [];
  } else {
    return this.businessInfo?.purchaseCategories || [];
  }
});

// 虚拟字段：获取位置信息
purchaserSchema.virtual('location').get(function() {
  if (this.purchaserType === 'individual') {
    return this.individualInfo?.location;
  } else {
    return this.businessInfo?.location;
  }
});

// 保存前验证
purchaserSchema.pre('save', function(next) {
  // 个人采购商必须填写individualInfo
  if (this.purchaserType === 'individual' && !this.individualInfo) {
    return next(new Error('个人采购商必须填写个人信息'));
  }

  // 商家采购商必须填写businessInfo
  if (this.purchaserType === 'business' && !this.businessInfo) {
    return next(new Error('商家采购商必须填写企业信息'));
  }

  // 验证坐标格式
  const location = this.purchaserType === 'individual'
    ? this.individualInfo?.location
    : this.businessInfo?.location;

  if (location?.coordinates) {
    const [lng, lat] = location.coordinates;
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return next(new Error('坐标格式不正确'));
    }
  }

  next();
});

// 保存后日志
purchaserSchema.post('save', function(doc) {
  logger.info('采购商保存', {
    id: doc._id,
    type: doc.purchaserType,
    status: doc.status,
    phone: doc.basicInfo.phone
  });
});

// 静态方法：检查手机号是否已存在
purchaserSchema.statics.checkPhoneExists = async function(phone) {
  const purchaser = await this.findOne({ 'basicInfo.phone': phone });
  return !!purchaser;
};

// 静态方法：根据位置查找附近的采购商
purchaserSchema.statics.findNearby = function(coordinates, maxDistance = 50000, purchaserType = null) {
  const query = {
    status: 'active',
    'verification.isVerified': true
  };

  if (purchaserType) {
    query.purchaserType = purchaserType;
  }

  return this.find(query).where({
    $or: [
      { 'individualInfo.location.coordinates': { $near: coordinates, $maxDistance: maxDistance } },
      { 'businessInfo.location.coordinates': { $near: coordinates, $maxDistance: maxDistance } }
    ]
  });
};

// 实例方法：获取推荐信息
purchaserSchema.methods.getRecommendationQuery = function() {
  const categories = this.purchaseCategories;
  const location = this.location;
  const radius = this.preferences.recommendationRadius * 1000; // 转换为米

  return {
    categories,
    location: location?.coordinates,
    radius,
    purchaserType: this.purchaserType
  };
};

// 实例方法：更新统计信息
purchaserSchema.methods.updateStatistics = async function(orderData) {
  this.statistics.totalOrders += 1;
  this.statistics.totalPurchaseAmount += orderData.amount || 0;
  this.statistics.totalTransactions += orderData.transactions || 1;
  await this.save();
};

// 实例方法：更新评分
purchaserSchema.methods.updateRating = async function(newRating) {
  const totalRating = this.statistics.averageRating * this.statistics.reviewCount;
  this.statistics.reviewCount += 1;
  this.statistics.averageRating = (totalRating + newRating) / this.statistics.reviewCount;
  await this.save();
};

const Purchaser = mongoose.model('Purchaser', purchaserSchema);

module.exports = Purchaser;
