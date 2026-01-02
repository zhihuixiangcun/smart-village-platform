/**
 * 拼车行程模型（增强版）
 * 功能：路线管理、车辆信息、费用分摊、安全验证、保险
 */

const mongoose = require('mongoose');

const carpoolTripSchema = new mongoose.Schema({
  // 基础信息
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 路线信息
  route: {
    origin: {
      address: { type: String, required: true },
      coordinates: {
        type: [Number],
        index: '2dsphere'
      },
      landmark: String,
      time: { type: Date, required: true }
    },
    destination: {
      address: { type: String, required: true },
      coordinates: {
        type: [Number],
        index: '2dsphere'
      },
      landmark: String,
      estimatedArrival: Date
    },
    waypoints: [{
      address: String,
      coordinates: [Number],
      order: Number,
      pickupAllowed: Boolean
    }],
    distance: Number,        // 总距离(公里)
    estimatedDuration: Number // 预计时长(分钟)
  },

  // 座位与费用
  seats: {
    total: {
      type: Number,
      required: true,
      min: 1,
      max: 7
    },
    available: {
      type: Number,
      required: true
    },
    pricePerSeat: {
      type: Number,
      required: true,
      min: 0
    }
  },

  // 费用分摊
  costSplit: {
    method: {
      type: String,
      enum: ['equal', 'distance_based', 'custom', 'negotiable'],
      default: 'equal'
    },
    totalCost: Number,
    breakdown: {
      fuel: Number,
      toll: Number,
      parking: Number,
      other: Number
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'wechat', 'alipay', 'platform'],
      default: 'cash'
    }
  },

  // 车辆信息
  vehicle: {
    brand: String,
    model: String,
    color: String,
    plateNumber: {
      type: String,
      required: true
    },
    capacity: {
      type: Number,
      default: 5
    },
    images: [String],
    isVerified: Boolean
  },

  // 安全验证
  verification: {
    driverVerified: { type: Boolean, default: false },
    vehicleVerified: { type: Boolean, default: false },
    realNameVerified: Boolean,
    faceVerified: Boolean
  },

  // 保险信息
  insurance: {
    hasInsurance: Boolean,
    provider: String,
    policyNumber: String,
    coverage: Number,
    expiresAt: Date
  },

  // 状态管理
  status: {
    type: String,
    enum: ['draft', 'open', 'filling', 'full', 'confirmed', 'in_progress', 'completed', 'cancelled', 'expired'],
    default: 'open'
  },

  // 乘客列表
  passengers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    pickupLocation: {
      address: String,
      coordinates: [Number],
      time: Date,
      landmark: String
    },
    dropoffLocation: {
      address: String,
      coordinates: [Number],
      landmark: String
    },
    seats: {
      type: Number,
      default: 1
    },
    status: {
      type: String,
      enum: ['requested', 'confirmed', 'picked_up', 'dropped_off', 'cancelled', 'no_show']
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'disputed'],
      default: 'pending'
    },
    amountPaid: Number,
    rating: {
      givenByDriver: { type: Number, min: 1, max: 5 },
      givenByPassenger: { type: Number, min: 1, max: 5 }
    },
    notes: String,
    joinedAt: { type: Date, default: Date.now }
  }],

  // 规则与要求
  rules: {
    allowSmoking: Boolean,
    allowPets: Boolean,
    allowFood: Boolean,
    luggageLimit: String,
    childFriendly: Boolean,
    genderPreference: {
      type: String,
      enum: ['any', 'male_only', 'female_only']
    },
    notes: String
  },

  // 行程记录
  tripRecord: {
    actualStartTime: Date,
    actualEndTime: Date,
    actualRoute: [{
      timestamp: Date,
      coordinates: [Number],
      speed: Number,
      status: String
    }],
    totalDistance: Number,
    totalDuration: Number
  },

  // 取消与退款
  cancellation: {
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelledAt: Date,
    reason: String,
    refundPolicy: {
      type: String,
      enum: ['full_refund', 'partial_refund', 'no_refund']
    },
    refundAmount: Number,
    refundProcessed: Boolean
  },

  // 备注
  notes: String

}, {
  timestamps: true
});

// ============== 索引 ==============
carpoolTripSchema.index({ villageId: 1, status: 1, 'route.origin.time': 1 });
carpoolTripSchema.index({ driver: 1, createdAt: -1 });
carpoolTripSchema.index({ status: 1, 'route.origin.coordinates': '2dsphere' });
carpoolTripSchema.index({ status: 1, 'route.destination.coordinates': '2dsphere' });

// ============== 虚拟字段 ==============
carpoolTripSchema.virtual('seatsOccupied').get(function() {
  return this.seats.total - this.seats.available;
});

carpoolTripSchema.virtual('isFull').get(function() {
  return this.seats.available === 0;
});

// ============== 方法 ==============

// 添加乘客
carpoolTripSchema.methods.addPassenger = function(passengerData) {
  if (this.seats.available < passengerData.seats) {
    throw new Error('座位不足');
  }

  this.passengers.push({
    ...passengerData,
    status: 'requested'
  });
  this.seats.available -= passengerData.seats;

  if (this.seats.available === 0) {
    this.status = 'full';
  }

  return this.save();
};

// 确认乘客
carpoolTripSchema.methods.confirmPassenger = function(passengerUserId) {
  const passenger = this.passengers.find(p => p.user.equals(passengerUserId));
  if (passenger) {
    passenger.status = 'confirmed';
    return this.save();
  }
  throw new Error('乘客不存在');
};

// 取消乘客
carpoolTripSchema.methods.cancelPassenger = function(passengerUserId) {
  const passenger = this.passengers.find(p => p.user.equals(passengerUserId));
  if (passenger) {
    passenger.status = 'cancelled';
    this.seats.available += passenger.seats;
    if (this.status === 'full') {
      this.status = 'open';
    }
    return this.save();
  }
  throw new Error('乘客不存在');
};

// 获取活跃乘客
carpoolTripSchema.methods.getActivePassengers = function() {
  return this.passengers.filter(p =>
    ['confirmed', 'picked_up'].includes(p.status)
  );
};

// 计算预计费用
carpoolTripSchema.methods.calculateCost = function(distance, pricePerSeat) {
  const baseCost = distance * 0.5; // 基础费用：0.5元/公里
  const fuelCost = baseCost * 0.7;
  const tollCost = baseCost * 0.2;
  const parkingCost = baseCost * 0.1;

  return {
    method: this.costSplit.method,
    totalCost: Math.round(baseCost * 100) / 100,
    breakdown: {
      fuel: Math.round(fuelCost * 100) / 100,
      toll: Math.round(tollCost * 100) / 100,
      parking: Math.round(parkingCost * 100) / 100,
      other: 0
    },
    pricePerSeat: Math.round((baseCost / this.seats.total) * 100) / 100
  };
};

// 更新行程状态
carpoolTripSchema.methods.updateStatus = function(newStatus) {
  const validTransitions = {
    'draft': ['open', 'cancelled'],
    'open': ['filling', 'full', 'cancelled', 'expired'],
    'filling': ['full', 'confirmed', 'cancelled'],
    'full': ['confirmed', 'cancelled'],
    'confirmed': ['in_progress', 'cancelled'],
    'in_progress': ['completed'],
    'completed': [],
    'cancelled': [],
    'expired': []
  };

  if (!validTransitions[this.status].includes(newStatus)) {
    throw new Error(`无法从 ${this.status} 转换到 ${newStatus}`);
  }

  this.status = newStatus;
  return this.save();
};

// 开始行程
carpoolTripSchema.methods.startTrip = function() {
  this.tripRecord.actualStartTime = new Date();
  this.status = 'in_progress';
  return this.save();
};

// 完成行程
carpoolTripSchema.methods.completeTrip = function(actualDistance, actualDuration) {
  this.tripRecord.actualEndTime = new Date();
  this.tripRecord.totalDistance = actualDistance;
  this.tripRecord.totalDuration = actualDuration;
  this.status = 'completed';

  // 更新所有已上车乘客的状态
  this.passengers.forEach(p => {
    if (p.status === 'picked_up') {
      p.status = 'dropped_off';
    }
  });

  return this.save();
};

// 取消行程
carpoolTripSchema.methods.cancelTrip = function(cancelledBy, reason) {
  this.cancellation.cancelledBy = cancelledBy;
  this.cancellation.cancelledAt = new Date();
  this.cancellation.reason = reason;

  // 计算退款政策
  const hoursUntilTrip = (this.route.origin.time - new Date()) / (1000 * 60 * 60);
  if (hoursUntilTrip > 24) {
    this.cancellation.refundPolicy = 'full_refund';
  } else if (hoursUntilTrip > 2) {
    this.cancellation.refundPolicy = 'partial_refund';
  } else {
    this.cancellation.refundPolicy = 'no_refund';
  }

  this.status = 'cancelled';
  return this.save();
};

// ============== 静态方法 ==============

// 查找附近拼车
carpoolTripSchema.statics.findNearby = function(longitude, latitude, maxDistance = 10, options = {}) {
  const query = {
    status: { $in: ['open', 'filling'] },
    'route.origin.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance * 1000 // 转换为米
      }
    }
  };

  if (options.seats) {
    query['seats.available'] = { $gte: options.seats };
  }

  if (options.departureAfter) {
    query['route.origin.time'] = { $gte: options.departureAfter };
  }

  if (options.departureBefore) {
    query['route.origin.time'] = query['route.origin.time'] || {};
    query['route.origin.time'].$lte = options.departureBefore;
  }

  return this.find(query)
    .populate('driver', 'username profile.firstName profile.lastName profile.phone')
    .sort({ 'route.origin.time': 1 });
};

// 智能匹配
carpoolTripSchema.statics.smartMatch = function(searchCriteria) {
  const {
    origin,
    destination,
    departureTime,
    seats = 1,
    maxDetour = 5 // 最大绕行距离(公里)
  } = searchCriteria;

  // 查找起终点附近的拼车
  const originNearby = this.find({
    status: { $in: ['open', 'filling'] },
    'route.origin.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: origin
        },
        $maxDistance: maxDetour * 1000
      }
    },
    'seats.available': { $gte: seats }
  });

  const destinationNearby = this.find({
    status: { $in: ['open', 'filling'] },
    'route.destination.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: destination
        },
        $maxDistance: maxDetour * 1000
      }
    },
    'seats.available': { $gte: seats }
  });

  // 合并并去重结果
  return Promise.all([originNearby, destinationNearby])
    .then(([originResults, destResults]) => {
      const matchedTrips = new Map();

      originResults.forEach(trip => {
        matchedTrips.set(trip._id.toString(), {
          trip,
          matchScore: this.calculateMatchScore(trip, searchCriteria)
        });
      });

      destResults.forEach(trip => {
        const existing = matchedTrips.get(trip._id.toString());
        if (existing) {
          existing.matchScore += 0.5; // 双向匹配加分
        } else {
          matchedTrips.set(trip._id.toString(), {
            trip,
            matchScore: this.calculateMatchScore(trip, searchCriteria)
          });
        }
      });

      // 按匹配分数排序
      return Array.from(matchedTrips.values())
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 10)
        .map(item => item.trip);
    });
};

// 计算匹配分数
carpoolTripSchema.statics.calculateMatchScore = function(trip, criteria) {
  let score = 0;

  // 时间匹配 (30分)
  const timeDiff = Math.abs(new Date(trip.route.origin.time) - new Date(criteria.departureTime));
  if (timeDiff < 15 * 60 * 1000) score += 30;
  else if (timeDiff < 30 * 60 * 1000) score += 20;
  else if (timeDiff < 60 * 60 * 1000) score += 10;

  // 座位匹配 (20分)
  if (trip.seats.available >= criteria.seats) score += 20;

  // 价格合理 (15分)
  if (trip.seats.pricePerSeat < 50) score += 15;
  else if (trip.seats.pricePerSeat < 100) score += 10;

  // 验证状态 (20分)
  if (trip.verification.driverVerified) score += 10;
  if (trip.verification.vehicleVerified) score += 10;

  // 好评率 (15分)
  // TODO: 基于历史评价计算

  return score;
};

module.exports = mongoose.model('CarpoolTrip', carpoolTripSchema);
