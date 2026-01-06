/**
 * 拼车服务数据模型
 *
 * 支持车主发布拼车信息和乘客寻找拼车
 * 包含起点、终点、出发时间、座位数、价格等信息
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const carpoolingSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['driver', 'passenger'],
    required: true,
    index: true
  },
  origin: {
    address: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: true,
        index: '2dsphere'
      }
    },
    landmark: {
      type: String,
      trim: true
    }
  },
  destination: {
    address: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: true,
        index: '2dsphere'
      }
    },
    landmark: {
      type: String,
      trim: true
    }
  },
  departureTime: {
    type: Date,
    required: true,
    index: true
  },
  flexibleTime: {
    enabled: {
      type: Boolean,
      default: false
    },
    beforeMinutes: {
      type: Number,
      default: 0,
      min: 0
    },
    afterMinutes: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  seats: {
    type: Number,
    required: true,
    min: 1,
    max: 20
  },
  availableSeats: {
    type: Number,
    required: true,
    min: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  pricingType: {
    type: String,
    enum: ['fixed', 'negotiable', 'shared'],
    default: 'fixed'
  },
  vehicleInfo: {
    brand: {
      type: String,
      trim: true
    },
    model: {
      type: String,
      trim: true
    },
    color: {
      type: String,
      trim: true
    },
    plateNumber: {
      type: String,
      trim: true
    },
    year: Number
  },
  requirements: {
    type: String,
    trim: true,
    maxlength: 500
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  passengers: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    seats: {
      type: Number,
      required: true,
      default: 1
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    pickupLocation: {
      address: String,
      location: {
        type: {
          type: String,
          enum: ['Point']
        },
        coordinates: [Number]
      }
    }
  }],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: String,
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  route: {
    type: String,
    enum: ['highway', 'normal', 'scenic'],
    default: 'normal'
  },
  allowPets: {
    type: Boolean,
    default: false
  },
  allowSmoking: {
    type: Boolean,
    default: false
  },
  genderPreference: {
    type: String,
    enum: ['any', 'male_only', 'female_only'],
    default: 'any'
  },
  viewCount: {
    type: Number,
    default: 0
  },
  completedAt: Date,
  cancelledAt: Date,
  cancelReason: {
    type: String,
    trim: true
  },
  metadata: {
    source: String,
    userAgent: String,
    ipAddress: String
  }
}, {
  timestamps: true
});

// 索引优化
carpoolingSchema.index({ status: 1, departureTime: 1 });
carpoolingSchema.index({ userId: 1, status: 1 });
carpoolingSchema.index({ 'passengers.userId': 1 });
carpoolingSchema.index({ type: 1, status: 1, departureTime: 1 });

/**
 * 预保存中间件：验证可用座位数
 */
carpoolingSchema.pre('save', function(next) {
  if (this.availableSeats > this.seats) {
    next(new Error('可用座位数不能超过总座位数'));
  } else if (this.availableSeats < 0) {
    next(new Error('可用座位数不能为负数'));
  } else {
    next();
  }
});

/**
 * 添加乘客
 * @param {Object} passengerInfo - 乘客信息
 * @returns {Promise<Object>} 更新后的拼车记录
 */
carpoolingSchema.methods.addPassenger = async function(passengerInfo) {
  if (this.availableSeats < passengerInfo.seats) {
    throw new Error('可用座位数不足');
  }

  if (this.passengers.some(p => p.userId.toString() === passengerInfo.userId.toString())) {
    throw new Error('该乘客已存在');
  }

  this.passengers.push({
    ...passengerInfo,
    status: 'pending',
    joinedAt: new Date()
  });

  this.availableSeats -= passengerInfo.seats;

  return this.save();
};

/**
 * 移除乘客
 * @param {String} userId - 用户ID
 * @returns {Promise<Object>} 更新后的拼车记录
 */
carpoolingSchema.methods.removePassenger = async function(userId) {
  const passengerIndex = this.passengers.findIndex(
    p => p.userId.toString() === userId.toString()
  );

  if (passengerIndex === -1) {
    throw new Error('乘客不存在');
  }

  const passenger = this.passengers[passengerIndex];
  if (passenger.status === 'confirmed') {
    throw new Error('已确认的乘客无法移除');
  }

  this.availableSeats += passenger.seats;
  this.passengers.splice(passengerIndex, 1);

  return this.save();
};

/**
 * 确认乘客
 * @param {String} userId - 用户ID
 * @returns {Promise<Object>} 更新后的拼车记录
 */
carpoolingSchema.methods.confirmPassenger = async function(userId) {
  const passenger = this.passengers.find(
    p => p.userId.toString() === userId.toString()
  );

  if (!passenger) {
    throw new Error('乘客不存在');
  }

  if (passenger.status === 'confirmed') {
    throw new Error('乘客已确认');
  }

  passenger.status = 'confirmed';

  return this.save();
};

/**
 * 取消拼车
 * @param {String} reason - 取消原因
 * @returns {Promise<Object>} 更新后的拼车记录
 */
carpoolingSchema.methods.cancel = async function(reason) {
  if (this.status === 'completed') {
    throw new Error('已完成的拼车无法取消');
  }

  if (this.status === 'cancelled') {
    throw new Error('拼车已取消');
  }

  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelReason = reason;

  // 退回座位数
  const confirmedPassengers = this.passengers.filter(p => p.status === 'confirmed');
  confirmedPassengers.forEach(p => {
    this.availableSeats += p.seats;
  });

  return this.save();
};

/**
 * 完成拼车
 * @returns {Promise<Object>} 更新后的拼车记录
 */
carpoolingSchema.methods.complete = async function() {
  if (this.status !== 'active') {
    throw new Error('只有激活状态的拼车可以完成');
  }

  this.status = 'completed';
  this.completedAt = new Date();

  return this.save();
};

/**
 * 添加评价
 * @param {Object} review - 评价信息
 * @returns {Promise<Object>} 更新后的拼车记录
 */
carpoolingSchema.methods.addReview = async function(review) {
  const existingReview = this.reviews.find(
    r => r.userId.toString() === review.userId.toString()
  );

  if (existingReview) {
    throw new Error('您已经评价过此拼车');
  }

  this.reviews.push({
    ...review,
    createdAt: new Date()
  });

  // 更新平均评分
  const totalRating = this.reviews.reduce((sum, r) => sum + r.rating, 0);
  this.rating.average = totalRating / this.reviews.length;
  this.rating.count = this.reviews.length;

  return this.save();
};

/**
 * 静态方法：搜索附近的拼车信息
 * @param {Object} criteria - 搜索条件
 * @returns {Promise<Array>} 拼车信息列表
 */
carpoolingSchema.statics.searchNearby = function(criteria) {
  const {
    origin,
    destination,
    departureDate,
    type,
    minPrice,
    maxPrice,
    minSeats,
    gender,
    page = 1,
    limit = 20
  } = criteria;

  const query = {
    status: { $in: ['pending', 'active'] },
    availableSeats: { $gte: minSeats || 1 }
  };

  if (type) {
    query.type = type;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined) query.price.$gte = minPrice;
    if (maxPrice !== undefined) query.price.$lte = maxPrice;
  }

  if (gender) {
    if (gender === 'male') {
      query.genderPreference = { $in: ['any', 'male_only'] };
    } else if (gender === 'female') {
      query.genderPreference = { $in: ['any', 'female_only'] };
    }
  }

  // 日期筛选
  if (departureDate) {
    const startDate = new Date(departureDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(departureDate);
    endDate.setHours(23, 59, 59, 999);

    query.departureTime = {
      $gte: startDate,
      $lte: endDate
    };
  } else {
    query.departureTime = { $gte: new Date() };
  }

  // 地理位置筛选
  if (origin) {
    query['origin.location'] = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: origin
        },
        $maxDistance: 10000 // 10公里范围内
      }
    };
  }

  return this.find(query)
    .populate('userId', 'name avatar phone rating')
    .populate('passengers.userId', 'name avatar phone')
    .sort({ departureTime: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
};

/**
 * 静态方法：获取用户的拼车历史
 * @param {String} userId - 用户ID
 * @param {Object} options - 查询选项
 * @returns {Promise<Array>} 拼车历史列表
 */
carpoolingSchema.statics.getUserHistory = function(userId, options = {}) {
  const {
    status,
    type,
    page = 1,
    limit = 20
  } = options;

  const query = {
    $or: [
      { userId },
      { 'passengers.userId': userId }
    ]
  };

  if (status) {
    query.status = status;
  }

  if (type) {
    query.type = type;
  }

  return this.find(query)
    .populate('userId', 'name avatar phone rating')
    .populate('passengers.userId', 'name avatar phone')
    .sort({ departureTime: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
};

module.exports = mongoose.model('Carpooling', carpoolingSchema);
