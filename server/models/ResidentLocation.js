const mongoose = require('mongoose');

/**
 * ResidentLocation Schema - 村民位置数据模型
 *
 * 功能描述：
 * - 存储村民实时位置信息
 * - 实现位置隐私保护（模糊化处理）
 * - 支持位置聚合（附近村民合并显示）
 * - 记录位置更新历史
 */
const residentLocationSchema = new mongoose.Schema({
  // 关联村民
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },

  // 关联村庄
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 实时位置（精确坐标，仅管理员可访问）
  exactLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [经度, 纬度]
      required: true
    }
  },

  // 公开位置（隐私保护后的坐标）
  // 添加随机偏移（±50米）
  publicLocation: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: {
      type: [Number] // [经度, 纬度]
    }
  },

  // 位置状态
  status: {
    type: String,
    enum: ['home', 'away', 'emergency', 'offline'],
    default: 'home'
  },

  // 位置来源
  locationSource: {
    type: String,
    enum: ['gps', 'wifi', 'cellular', 'bluetooth', 'manual'],
    default: 'gps'
  },

  // 定位精度（米）
  accuracy: {
    type: Number,
    default: 100,
    min: 0
  },

  // 位置聚合信息
  // 当附近有多个村民时，将它们聚合为一个集群
  cluster: {
    id: {
      type: String,
      index: true
    },
    count: {
      type: Number,
      default: 1
    },
    centerLocation: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: [Number]
    }
  },

  // 位置更新时间
  locationTimestamp: {
    type: Date,
    default: Date.now
  },

  // 位置过期时间（位置超过此时间将不显示）
  expiresAt: {
    type: Date,
    default: function() {
      // 默认24小时后过期
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  },

  // 隐私设置
  privacySettings: {
    // 是否在地图上显示位置
    showLocation: {
      type: Boolean,
      default: true
    },
    // 是否允许精确位置显示
    allowExactLocation: {
      type: Boolean,
      default: false
    },
    // 位置模糊化级别（米）
    privacyRadius: {
      type: Number,
      default: 50,
      min: 10,
      max: 500
    },
    // 是否允许位置聚合
    allowClustering: {
      type: Boolean,
      default: true
    }
  },

  // 设备信息
  deviceInfo: {
    type: String,
    trim: true
  },

  // 电池电量（用于判断是否需要帮助）
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100
  },

  // 是否在充电
  isCharging: {
    type: Boolean,
    default: false
  },

  // 备注
  remarks: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// 索引设置
residentLocationSchema.index({ userId: 1 });
residentLocationSchema.index({ villageId: 1 });
residentLocationSchema.index({ exactLocation: '2dsphere' });
residentLocationSchema.index({ publicLocation: '2dsphere' });
residentLocationSchema.index({ 'cluster.id': 1 });
residentLocationSchema.index({ status: 1 });
residentLocationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL索引，自动删除过期数据

// 前置保存钩子：生成隐私保护的位置
residentLocationSchema.pre('save', function(next) {
  if (this.isModified('exactLocation')) {
    this.generatePublicLocation();
    this.locationTimestamp = new Date();
  }
  next();
});

/**
 * 实例方法：生成隐私保护的公开位置
 * 添加随机偏移（±privacyRadius米）
 */
residentLocationSchema.methods.generatePublicLocation = function() {
  const exactCoords = this.exactLocation.coordinates;
  const privacyRadius = this.privacySettings.privacyRadius || 50;

  // 生成随机角度和距离
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * privacyRadius;

  // 计算偏移量（米转换为度）
  // 1度纬度约等于111.32km
  const latOffset = (distance * Math.sin(angle)) / 111320;
  const lonOffset = (distance * Math.cos(angle)) / (111320 * Math.cos(exactCoords[1] * Math.PI / 180));

  this.publicLocation = {
    type: 'Point',
    coordinates: [
      exactCoords[0] + lonOffset,
      exactCoords[1] + latOffset
    ]
  };
};

/**
 * 静态方法：更新村民位置
 * @param {String} userId - 用户ID
 * @param {Number} longitude - 经度
 * @param {Number} latitude - 纬度
 * @param {Object} options - 选项
 */
residentLocationSchema.statics.updateLocation = async function(userId, longitude, latitude, options = {}) {
  const location = await this.findOneAndUpdate(
    { userId },
    {
      exactLocation: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      status: options.status || 'home',
      locationSource: options.source || 'gps',
      accuracy: options.accuracy || 100,
      deviceInfo: options.deviceInfo,
      batteryLevel: options.batteryLevel,
      isCharging: options.isCharging || false,
      expiresAt: options.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000)
    },
    { upsert: true, new: true }
  );

  // 执行位置聚合
  if (location.privacySettings.allowClustering) {
    await this.clusterNearbyResidents(location);
  }

  return location;
};

/**
 * 静态方法：聚合附近村民
 * 将距离小于100米的村民聚合为一个集群
 */
residentLocationSchema.statics.clusterNearbyResidents = async function(residentLocation) {
  const CLUSTER_RADIUS = 100; // 聚合半径（米）
  const MIN_CLUSTER_SIZE = 3;  // 最小聚合数量

  // 查找附近村民
  const nearbyResidents = await this.find({
    userId: { $ne: residentLocation.userId },
    villageId: residentLocation.villageId,
    'privacySettings.showLocation': true,
    'privacySettings.allowClustering': true,
    status: { $ne: 'offline' },
    publicLocation: {
      $near: {
        $geometry: residentLocation.publicLocation,
        $maxDistance: CLUSTER_RADIUS
      }
    }
  }).limit(MIN_CLUSTER_SIZE - 1);

  // 如果附近村民数量达到最小聚合要求
  if (nearbyResidents.length >= MIN_CLUSTER_SIZE - 1) {
    // 生成集群ID
    const clusterId = `cluster_${residentLocation.villageId}_${Date.now()}`;

    // 计算集群中心点
    const allLocations = [residentLocation, ...nearbyResidents];
    const avgLon = allLocations.reduce((sum, loc) =>
      sum + loc.publicLocation.coordinates[0], 0) / allLocations.length;
    const avgLat = allLocations.reduce((sum, loc) =>
      sum + loc.publicLocation.coordinates[1], 0) / allLocations.length;

    // 更新所有村民的集群信息
    await this.updateMany(
      { _id: { $in: allLocations.map(loc => loc._id) } },
      {
        cluster: {
          id: clusterId,
          count: allLocations.length,
          centerLocation: {
            type: 'Point',
            coordinates: [avgLon, avgLat]
          }
        }
      }
    );
  } else {
    // 如果不满足聚合条件，清除集群信息
    await this.updateMany(
      { userId: { $in: [residentLocation.userId, ...nearbyResidents.map(r => r.userId)] } },
      { $unset: { cluster: 1 } }
    );
  }
};

/**
 * 静态方法：获取村庄内所有村民位置（公开位置）
 * @param {String} villageId - 村庄ID
 * @param {Object} user - 当前用户
 */
residentLocationSchema.statics.getPublicLocations = async function(villageId, user) {
  const query = {
    villageId,
    'privacySettings.showLocation': true,
    status: { $ne: 'offline' },
    expiresAt: { $gt: new Date() }
  };

  // 如果不是管理员，只返回公开位置
  if (!user || user.role !== 'admin') {
    query.publicLocation = { $exists: true };
  }

  const locations = await this.find(query)
    .populate('userId', 'name phone avatar')
    .lean();

  // 返回集群视图或个体视图
  const clustered = locations.filter(loc => loc.cluster && loc.cluster.id);
  const individuals = locations.filter(loc => !loc.cluster || !loc.cluster.id);

  // 去重集群
  const clusters = {};
  clustered.forEach(loc => {
    if (!clusters[loc.cluster.id]) {
      clusters[loc.cluster.id] = {
        type: 'cluster',
        clusterId: loc.cluster.id,
        count: loc.cluster.count,
        location: loc.cluster.centerLocation,
        residents: []
      };
    }
    clusters[loc.cluster.id].residents.push({
      userId: loc.userId._id,
      name: loc.userId.name,
      status: loc.status
    });
  });

  // 个体位置
  const individualLocations = individuals.map(loc => ({
    type: 'individual',
    userId: loc.userId._id,
    name: loc.userId.name,
    status: loc.status,
    location: user && user.role === 'admin' ? loc.exactLocation : loc.publicLocation
  }));

  return {
    clusters: Object.values(clusters),
    individuals: individualLocations
  };
};

/**
 * 静态方法：搜索附近村民（用于应急响应）
 * @param {Number} longitude - 经度
 * @param {Number} latitude - 纬度
 * @param {Number} radius - 搜索半径（米）
 */
residentLocationSchema.statics.findNearbyResidents = function(longitude, latitude, radius = 500) {
  return this.find({
    exactLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: radius
      }
    },
    'privacySettings.showLocation': true,
    status: { $ne: 'offline' },
    expiresAt: { $gt: new Date() }
  })
  .populate('userId', 'name phone avatar')
  .sort({ locationTimestamp: -1 });
};

/**
 * 实例方法：更新隐私设置
 */
residentLocationSchema.methods.updatePrivacySettings = function(settings) {
  Object.assign(this.privacySettings, settings);
  return this.save();
};

/**
 * 实例方法：设置离线状态
 */
residentLocationSchema.methods.setOffline = function() {
  this.status = 'offline';
  this.expiresAt = new Date();
  return this.save();
};

// 创建模型
const ResidentLocation = mongoose.model('ResidentLocation', residentLocationSchema);

module.exports = ResidentLocation;
