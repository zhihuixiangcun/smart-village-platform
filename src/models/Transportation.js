/**
 * 交通服务数据模型
 *
 * 支持机场、火车站、汽车站等交通枢纽信息
 * 包含地理位置、班次时刻表、设施服务等信息
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const transportationSchema = new Schema({
  type: {
    type: String,
    enum: ['flight', 'train', 'bus'],
    required: true,
    index: true
  },
  stationName: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    trim: true,
    index: true
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
  address: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  schedules: [{
    id: {
      type: String,
      required: true
    },
    departureTime: {
      type: Date,
      required: true
    },
    arrivalTime: {
      type: Date,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    availableSeats: {
      type: Number,
      required: true,
      min: 0
    },
    origin: {
      type: String,
      required: true
    },
    destination: {
      type: String,
      required: true
    },
    vehicleNumber: String,
    status: {
      type: String,
      enum: ['on_time', 'delayed', 'cancelled'],
      default: 'on_time'
    }
  }],
  facilities: [{
    type: String,
    trim: true
  }],
  services: [{
    type: String,
    trim: true
  }],
  description: {
    type: String,
    trim: true
  },
  images: [{
    url: String,
    caption: String
  }],
  operatingHours: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
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
  tags: [{
    type: String,
    trim: true
  }],
  metadata: {
    source: String,
    lastSyncAt: Date,
    syncStatus: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'success'
    }
  }
}, {
  timestamps: true
});

// 索引优化
transportationSchema.index({ type: 1, isActive: 1 });
transportationSchema.index({ stationName: 'text', code: 'text', address: 'text' });

/**
 * 获取有效班次
 * @returns {Array} 有效班次列表
 */
transportationSchema.methods.getActiveSchedules = function() {
  return this.schedules.filter(schedule =>
    schedule.status !== 'cancelled' &&
    schedule.departureTime > new Date()
  );
};

/**
 * 根据目的地筛选班次
 * @param {String} destination - 目的地
 * @returns {Array} 筛选后的班次列表
 */
transportationSchema.methods.getSchedulesByDestination = function(destination) {
  return this.schedules.filter(schedule =>
    schedule.destination === destination &&
    schedule.status !== 'cancelled' &&
    schedule.departureTime > new Date()
  );
};

/**
 * 静态方法：查找附近的交通站点
 * @param {Array} coordinates - [longitude, latitude]
 * @param {Number} maxDistance - 最大距离（米）
 * @param {Object} filters - 筛选条件
 * @returns {Promise<Array>} 附近的交通站点列表
 */
transportationSchema.statics.findNearby = function(coordinates, maxDistance, filters = {}) {
  const query = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance
      }
    },
    isActive: true
  };

  if (filters.type) {
    query.type = filters.type;
  }

  return this.find(query)
    .sort({ 'rating.average': -1 })
    .limit(filters.limit || 20);
};

/**
 * 静态方法：搜索班次
 * @param {Object} criteria - 搜索条件
 * @returns {Promise<Array>} 班次列表
 */
transportationSchema.statics.searchSchedules = async function(criteria) {
  const {
    origin,
    destination,
    date,
    type,
    minPrice,
    maxPrice
  } = criteria;

  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  const matchConditions = {
    'schedules.status': { $ne: 'cancelled' },
    'schedules.departureTime': { $gte: startDate, $lte: endDate }
  };

  if (origin) {
    matchConditions['schedules.origin'] = origin;
  }

  if (destination) {
    matchConditions['schedules.destination'] = destination;
  }

  if (type) {
    matchConditions.type = type;
  }

  const priceFilter = {};
  if (minPrice !== undefined) {
    priceFilter.$gte = minPrice;
  }
  if (maxPrice !== undefined) {
    priceFilter.$lte = maxPrice;
  }

  if (Object.keys(priceFilter).length > 0) {
    matchConditions['schedules.price'] = priceFilter;
  }

  const stations = await this.find({
    isActive: true,
    ...(type && { type })
  });

  const results = [];
  stations.forEach(station => {
    const matchingSchedules = station.schedules.filter(schedule => {
      if (schedule.status === 'cancelled') return false;
      if (schedule.departureTime < startDate || schedule.departureTime > endDate) return false;
      if (origin && schedule.origin !== origin) return false;
      if (destination && schedule.destination !== destination) return false;
      if (minPrice !== undefined && schedule.price < minPrice) return false;
      if (maxPrice !== undefined && schedule.price > maxPrice) return false;
      return true;
    });

    if (matchingSchedules.length > 0) {
      results.push({
        station: {
          _id: station._id,
          type: station.type,
          stationName: station.stationName,
          code: station.code,
          location: station.location,
          address: station.address
        },
        schedules: matchingSchedules
      });
    }
  });

  return results;
};

module.exports = mongoose.model('Transportation', transportationSchema);
