const mongoose = require('mongoose');

const locationTrackingSchema = new mongoose.Schema({
  // 基础信息
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true,
    index: true
  },
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },

  // 位置信息
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
    },
    accuracy: {
      type: Number,
      default: 0 // 米
    },
    altitude: Number,
    altitudeAccuracy: Number,
    heading: Number, // 方向角度
    speed: Number // 速度 m/s
  },

  // 设备信息
  deviceInfo: {
    userAgent: String,
    platform: String,
    deviceId: String,
    appVersion: String,
    osVersion: String
  },

  // 追踪设置
  trackingSettings: {
    trackingMode: {
      type: String,
      enum: ['manual', 'auto', 'emergency'],
      default: 'manual'
    },
    updateInterval: {
      type: Number,
      default: 30000, // 30秒
      min: 5000,
      max: 300000
    },
    accuracyThreshold: {
      type: Number,
      default: 50, // 米
      min: 5,
      max: 1000
    },
    batteryOptimization: {
      type: Boolean,
      default: true
    },
    wifiOnly: {
      type: Boolean,
      default: false
    }
  },

  // 隐私设置
  privacySettings: {
    isVisibleToPublic: {
      type: Boolean,
      default: false
    },
    isVisibleToVillage: {
      type: Boolean,
      default: true
    },
    isVisibleToStaff: {
      type: Boolean,
      default: true
    },
    anonymizePublic: {
      type: Boolean,
      default: true
    },
    blurRadius: {
      type: Number,
      default: 50, // 米
      min: 10,
      max: 500
    },
    shareLocationWith: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      permission: {
        type: String,
        enum: ['view', 'track', 'emergency'],
        default: 'view'
      },
      expiresAt: Date
    }]
  },

  // 活动状态
  activityStatus: {
    isMoving: {
      type: Boolean,
      default: false
    },
    activityType: {
      type: String,
      enum: ['still', 'walking', 'running', 'cycling', 'driving', 'unknown'],
      default: 'unknown'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    }
  },

  // 电池状态
  batteryStatus: {
    level: {
      type: Number,
      min: 0,
      max: 1
    },
    isCharging: {
      type: Boolean,
      default: false
    },
    isPowerSaveMode: {
      type: Boolean,
      default: false
    }
  },

  // 网络状态
  networkStatus: {
    type: {
      type: String,
      enum: ['none', 'ethernet', 'wifi', 'cellular', 'unknown'],
      default: 'unknown'
    },
    effectiveType: {
      type: String,
      enum: ['slow-2g', '2g', '3g', '4g']
    },
    downlink: Number, // Mbps
    rtt: Number, // 往返时间 ms
    wifiSSID: String
  },

  // 时间戳
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  serverTimestamp: {
    type: Date,
    default: Date.now
  },

  // 地理围栏
  geofenceEvents: [{
    fenceId: String,
    fenceName: String,
    action: {
      type: String,
      enum: ['enter', 'exit', 'dwell'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number]
    }
  }],

  // 异常事件
  anomalies: [{
    type: {
      type: String,
      enum: [
        'speed_exceeded',      // 超速
        'location_jump',      // 位置跳跃
        'battery_critical',    // 电池危急
        'signal_lost',         // 信号丢失
        'geofence_violation',  // 地理围栏违规
        'activity_anomaly',   // 活动异常
        'device_offline'       // 设备离线
      ]
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    description: String,
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    resolved: {
      type: Boolean,
      default: false
    },
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // 应急状态
  emergencyStatus: {
    isInEmergency: {
      type: Boolean,
      default: false
    },
    emergencyType: {
      type: String,
      enum: ['medical', 'accident', 'lost', 'danger', 'other']
    },
    emergencyContacts: [{
      name: String,
      phone: String,
      relation: String
    }],
    lastEmergencyAlert: Date,
    emergencyNotes: String
  },

  // 元数据
  metadata: {
    source: {
      type: String,
      enum: ['gps', 'network', 'passive', 'manual', 'beacon'],
      default: 'gps'
    },
    fixType: {
      type: String,
      enum: ['none', '2d', '3d'],
      default: '3d'
    },
    satellitesUsed: Number,
    hdop: Number, // 水平精度因子
    vdop: Number, // 垂直精度因子
    pdop: Number  // 位置精度因子
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 复合索引
locationTrackingSchema.index({ userId: 1, timestamp: -1 });
locationTrackingSchema.index({ villageId: 1, timestamp: -1 });
locationTrackingSchema.index({ sessionId: 1, timestamp: -1 });
locationTrackingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // 30天过期

// 虚拟字段：隐私保护的位置
locationTrackingSchema.virtual('privacyProtectedLocation').get(function() {
  const isPublicView = true; // 应该从请求上下文获取

  if (isPublicView && this.privacySettings.anonymizePublic) {
    return this.constructor.anonymizeLocation(
      {
        latitude: this.location.coordinates[1],
        longitude: this.location.coordinates[0]
      },
      this.privacySettings.blurRadius
    );
  }

  return {
    latitude: this.location.coordinates[1],
    longitude: this.location.coordinates[0],
    isAnonymized: false
  };
});

// 虚拟字段：位置年龄（秒）
locationTrackingSchema.virtual('locationAge').get(function() {
  return Math.floor((Date.now() - this.timestamp.getTime()) / 1000);
});

// 虚拟字段：是否在线
locationTrackingSchema.virtual('isOnline').get(function() {
  const lastUpdateThreshold = 5 * 60 * 1000; // 5分钟
  return (Date.now() - this.timestamp.getTime()) < lastUpdateThreshold;
});

// 实例方法：更新位置
locationTrackingSchema.methods.updateLocation = function(newLocationData) {
  // 检查位置跳跃
  const lastLocation = this.location;
  if (lastLocation && lastLocation.coordinates) {
    const distance = this.calculateDistance(
      lastLocation.coordinates,
      newLocationData.coordinates
    );
    const timeDiff = (new Date() - this.timestamp) / 1000 / 3600; // 小时
    const speed = distance / 1000 / timeDiff; // km/h

    if (speed > 200) { // 超过200km/h认为异常
      this.anomalies.push({
        type: 'location_jump',
        severity: 'high',
        description: `检测到异常位置移动，速度: ${speed.toFixed(2)}km/h`,
        data: {
          distance,
          timeDiff,
          speed
        }
      });
    }
  }

  // 更新位置信息
  this.location = {
    ...this.location,
    ...newLocationData
  };
  this.timestamp = new Date();
  this.serverTimestamp = new Date();

  return this.save();
};

// 实例方法：添加地理围栏事件
locationTrackingSchema.methods.addGeofenceEvent = function(fenceId, fenceName, action) {
  this.geofenceEvents.push({
    fenceId,
    fenceName,
    action,
    location: {
      type: 'Point',
      coordinates: this.location.coordinates
    }
  });

  return this.save();
};

// 实例方法：设置紧急状态
locationTrackingSchema.methods.setEmergencyStatus = function(emergencyData) {
  this.emergencyStatus = {
    ...this.emergencyStatus,
    ...emergencyData,
    isInEmergency: true,
    lastEmergencyAlert: new Date()
  };

  return this.save();
};

// 实例方法：检查地理围栏违规
locationTrackingSchema.methods.checkGeofenceViolations = async function(geofences) {
  const violations = [];

  geofences.forEach(fence => {
    const isInside = this.isPointInPolygon(
      this.location.coordinates,
      fence.coordinates
    );

    const wasInside = this.geofenceEvents.some(
      event => event.fenceId === fence.fenceId &&
                event.action === 'enter'
    );

    if (fence.type === 'restricted' && isInside) {
      violations.push({
        fenceId: fence.fenceId,
        fenceName: fence.name,
        type: 'geofence_violation',
        severity: fence.severity || 'medium'
      });
    }
  });

  return violations;
};

// 实例方法：计算两点间距离（米）
locationTrackingSchema.methods.calculateDistance = function(coord1, coord2) {
  const R = 6371000; // 地球半径（米）
  const lat1 = coord1[1] * Math.PI / 180;
  const lat2 = coord2[1] * Math.PI / 180;
  const deltaLat = (coord2[1] - coord1[1]) * Math.PI / 180;
  const deltaLng = (coord2[0] - coord1[0]) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// 实例方法：判断点是否在多边形内
locationTrackingSchema.methods.isPointInPolygon = function(point, polygon) {
  // 使用射线法判断点是否在多边形内
  // 简化实现
  return true;
};

// 静态方法：获取用户最新位置
locationTrackingSchema.statics.getLatestLocation = async function(userId) {
  return this.findOne({ userId })
    .sort({ timestamp: -1 })
    .limit(1);
};

// 静态方法：获取村庄内所有用户位置
locationTrackingSchema.statics.getVillageLocations = async function(villageId, options = {}) {
  const {
    includeOffline = false,
    onlyEmergency = false,
    publicView = true,
    bounds = null
  } = options;

  const query = { villageId };

  if (!includeOffline) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    query.timestamp = { $gte: fiveMinutesAgo };
  }

  if (onlyEmergency) {
    query['emergencyStatus.isInEmergency'] = true;
  }

  let locations = await this.find(query)
    .populate('userId', 'name phone avatar')
    .sort({ timestamp: -1 });

  // 应用隐私保护
  if (publicView) {
    locations = locations.map(loc => {
      const locObj = loc.toObject();
      if (loc.privacySettings.anonymizePublic) {
        locObj.privacyProtectedLocation = this.anonymizeLocation(
          {
            latitude: loc.location.coordinates[1],
            longitude: loc.location.coordinates[0]
          },
          loc.privacySettings.blurRadius
        );
      }
      return locObj;
    });
  }

  return locations;
};

// 静态方法：获取用户轨迹
locationTrackingSchema.statics.getUserTrajectory = async function(userId, startDate, endDate) {
  return this.find({
    userId,
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ timestamp: 1 });
};

// 静态方法：分析活动模式
locationTrackingSchema.statics.analyzeActivityPattern = async function(userId, days = 7) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const endDate = new Date();

  const locations = await this.find({
    userId,
    timestamp: { $gte: startDate, $lte: endDate }
  }).sort({ timestamp: 1 });

  const pattern = {
    totalDistance: 0,
    averageSpeed: 0,
    maxSpeed: 0,
    activityTypes: {},
    hourlyActivity: new Array(24).fill(0),
    dailyActivity: new Map()
  };

  let totalSpeed = 0;
  let count = 0;

  for (let i = 1; i < locations.length; i++) {
    const prev = locations[i - 1];
    const curr = locations[i];

    // 计算距离和速度
    const distance = prev.calculateDistance(prev.location.coordinates, curr.location.coordinates);
    const timeDiff = (curr.timestamp - prev.timestamp) / 1000; // 秒
    const speed = timeDiff > 0 ? distance / timeDiff : 0; // m/s

    pattern.totalDistance += distance;
    totalSpeed += speed;
    count++;

    if (speed > pattern.maxSpeed) {
      pattern.maxSpeed = speed;
    }

    // 统计活动类型
    if (curr.activityStatus.activityType !== 'unknown') {
      const type = curr.activityStatus.activityType;
      pattern.activityTypes[type] = (pattern.activityTypes[type] || 0) + 1;
    }

    // 统计每小时活动
    const hour = curr.timestamp.getHours();
    pattern.hourlyActivity[hour]++;

    // 统计每日活动
    const dateKey = curr.timestamp.toISOString().split('T')[0];
    pattern.dailyActivity.set(dateKey, (pattern.dailyActivity.get(dateKey) || 0) + 1);
  }

  pattern.averageSpeed = count > 0 ? totalSpeed / count : 0;

  return pattern;
};

// 静态方法：检测异常行为
locationTrackingSchema.statics.detectAnomalies = async function(userId, hours = 24) {
  const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
  const locations = await this.find({
    userId,
    timestamp: { $gte: startDate }
  }).sort({ timestamp: 1 });

  const anomalies = [];

  // 检测长时间不动
  if (locations.length > 0) {
    let stillDuration = 0;
    let lastMovingTime = locations[0].timestamp;

    for (const location of locations) {
      if (location.activityStatus.isMoving) {
        stillDuration = 0;
        lastMovingTime = location.timestamp;
      } else {
        stillDuration += (location.timestamp - lastMovingTime);
      }

      if (stillDuration > 12 * 60 * 60 * 1000) { // 12小时
        anomalies.push({
          type: 'activity_anomaly',
          severity: 'medium',
          description: '检测到长时间无活动',
          data: { stillDuration }
        });
      }
    }
  }

  // 检测电池异常
  const latestLocation = locations[locations.length - 1];
  if (latestLocation && latestLocation.batteryStatus.level < 0.1) {
    anomalies.push({
      type: 'battery_critical',
      severity: 'high',
      description: '电池电量危急',
      data: { batteryLevel: latestLocation.batteryStatus.level }
    });
  }

  return anomalies;
};

// 静态方法：位置脱敏
locationTrackingSchema.statics.anonymizeLocation = function(location, blurRadius = 50) {
  const angle = Math.random() * 2 * Math.PI;
  const offset = Math.random() * blurRadius;

  const deltaLat = offset * Math.cos(angle) / 111320;
  const deltaLng = offset * Math.sin(angle) / (111320 * Math.cos(location.latitude * Math.PI / 180));

  return {
    latitude: location.latitude + deltaLat,
    longitude: location.longitude + deltaLng,
    isAnonymized: true,
    blurRadius
  };
};

module.exports = mongoose.model('LocationTracking', locationTrackingSchema);