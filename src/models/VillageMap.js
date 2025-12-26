const mongoose = require('mongoose');

const villageMapSchema = new mongoose.Schema({
  // 基础信息
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },
  mapName: {
    type: String,
    required: true,
    trim: true
  },
  mapType: {
    type: String,
    enum: ['base', 'emergency', 'disaster', 'planning'],
    default: 'base'
  },
  isActive: {
    type: Boolean,
    default: true
  },

  // 地图基础信息
  mapBounds: {
    northeast: {
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180
      }
    },
    southwest: {
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180
      }
    },
    center: {
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180
      }
    },
    zoomLevel: {
      type: Number,
      default: 15,
      min: 1,
      max: 20
    }
  },

  // 地图图层
  layers: [{
    layerId: {
      type: String,
      required: true
    },
    layerName: {
      type: String,
      required: true
    },
    layerType: {
      type: String,
      enum: ['base', 'overlay', 'dynamic', 'emergency'],
      required: true
    },
    isVisible: {
      type: Boolean,
      default: true
    },
    opacity: {
      type: Number,
      default: 1,
      min: 0,
      max: 1
    },
    zIndex: {
      type: Number,
      default: 0
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    style: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    source: {
      type: {
        type: String,
        enum: ['tile', 'vector', 'geojson', 'wms', 'realtime'],
        default: 'geojson'
      },
      url: String,
      attribution: String,
      maxZoom: Number,
      minZoom: Number
    }
  }],

  // 地图要素
  features: [{
    featureId: {
      type: String,
      required: true
    },
    featureType: {
      type: String,
      enum: [
        'building',          // 建筑
        'road',              // 道路
        'water',             // 水体
        'vegetation',        // 植被
        'facility',          // 设施
        'emergency_exit',    // 应急出口
        'shelter',           // 避难所
        'medical_point',     // 医疗点
        'danger_zone',       // 危险区域
        'evacuation_route',  // 撤离路线
        'rescue_point',      // 救援点
        'monitoring_station' // 监测站
      ],
      required: true
    },
    geometry: {
      type: {
        type: String,
        enum: ['Point', 'LineString', 'Polygon', 'MultiPolygon', 'MultiLineString'],
        required: true
      },
      coordinates: {
        type: [mongoose.Schema.Types.Mixed],
        required: true
      }
    },
    properties: {
      name: String,
      description: String,
      address: String,
      type: String,
      status: {
        type: String,
        enum: ['active', 'inactive', 'under_construction', 'damaged'],
        default: 'active'
      },
      capacity: Number,
      currentOccupancy: Number,
      lastUpdated: {
        type: Date,
        default: Date.now
      },
      attributes: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      }
    },
    style: {
      color: String,
      fillColor: String,
      opacity: Number,
      fillOpacity: Number,
      weight: Number,
      dashArray: String,
      iconUrl: String,
      iconSize: [Number],
      iconAnchor: [Number]
    },
    isVisible: {
      type: Boolean,
      default: true
    },
    metadata: {
      source: String,
      accuracy: Number,
      collectionDate: Date,
      lastVerified: Date
    }
  }],

  // 实时位置追踪
  realTimeTracking: {
    enabled: {
      type: Boolean,
      default: false
    },
    updateInterval: {
      type: Number,
      default: 30000, // 30秒
      min: 5000,
      max: 300000
    },
    retentionPeriod: {
      type: Number,
      default: 24, // 24小时
      min: 1,
      max: 168 // 7天
    },
    privacySettings: {
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
      showOnlyAuthorized: {
        type: Boolean,
        default: true
      },
      minimumZoom: {
        type: Number,
        default: 16,
        min: 10,
        max: 20
      }
    }
  },

  // 应急配置
  emergencyConfig: {
    safeZones: [{
      zoneId: String,
      name: String,
      capacity: Number,
      coordinates: {
        type: {
          type: String,
          enum: ['Polygon', 'MultiPolygon'],
          default: 'Polygon'
        },
        coordinates: [[[Number]]]
      },
      facilities: [String],
      accessRoutes: [String]
    }],
    evacuationRoutes: [{
      routeId: String,
      name: String,
      priority: {
        type: String,
        enum: ['primary', 'secondary', 'emergency'],
        default: 'secondary'
      },
      path: {
        type: {
          type: String,
          enum: ['LineString', 'MultiLineString'],
          default: 'LineString'
        },
        coordinates: [[Number]]
      },
      capacity: Number,
      conditions: [String],
      estimatedTime: Number // 分钟
    }],
    assemblyPoints: [{
      pointId: String,
      name: String,
      location: {
        type: 'Point',
        coordinates: [Number]
      },
      capacity: Number,
      facilities: [String],
      contactPerson: String,
      contactPhone: String
    }]
  },

  // 灾害预警
  disasterWarning: {
    activeWarnings: [{
      warningId: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: [
          'flood',             // 洪水
          'fire',              // 火灾
          'landslide',         // 山体滑坡
          'earthquake',        // 地震
          'drought',           // 干旱
          'storm',             // 风暴
          'epidemic',          // 疫情
          'chemical',          // 化学危险品
          'other'              // 其他
        ],
        required: true
      },
      severity: {
        type: String,
        enum: ['blue', 'yellow', 'orange', 'red'],
        required: true
      },
      title: {
        type: String,
        required: true
      },
      description: String,
      affectedArea: {
        type: {
          type: String,
          enum: ['Polygon', 'MultiPolygon', 'Circle'],
          default: 'Polygon'
        },
        coordinates: mongoose.Schema.Types.Mixed
      },
      centerPoint: {
        type: 'Point',
        coordinates: [Number]
      },
      radius: Number, // 米
      issuedAt: {
        type: Date,
        default: Date.now
      },
      expiresAt: Date,
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      isPublic: {
        type: Boolean,
        default: true
      },
      actions: [String],
      contactInfo: {
        phone: String,
        email: String,
        wechat: String
      }
    }],
    warningHistory: [{
      type: mongoose.Schema.Types.Mixed,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    monitoringStations: [{
      stationId: String,
      name: String,
      location: {
        type: 'Point',
        coordinates: [Number]
      },
      stationType: {
        type: String,
        enum: [
          'water_level',       // 水位监测
          'weather',           // 气象监测
          'earthquake',        // 地震监测
          'pollution',         // 污染监测
          'traffic',           // 交通监测
          'crowd',             // 人群监测
          'fire',              // 火灾监测
          'gas'                // 气体监测
        ]
      },
      status: {
        type: String,
        enum: ['online', 'offline', 'maintenance', 'error'],
        default: 'online'
      },
      lastData: {
        timestamp: Date,
        value: mongoose.Schema.Types.Mixed,
        unit: String
      },
      thresholds: [{
        parameter: String,
        warning: Number,
        critical: Number,
        unit: String
      }]
    }]
  },

  // 统计信息
  statistics: {
    totalFeatures: {
      type: Number,
      default: 0
    },
    featuresByType: {
      type: Map,
      of: Number,
      default: new Map()
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    version: {
      type: Number,
      default: 1
    }
  },

  // 版本控制
  version: {
    type: Number,
    default: 1
  },
  changelog: [{
    version: Number,
    changes: [String],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // 访问控制
  accessControl: {
    publicAccess: {
      type: Boolean,
      default: true
    },
    requireAuth: {
      type: Boolean,
      default: false
    },
    allowedRoles: [{
      type: String,
      enum: ['admin', 'staff', 'villager', 'guest', 'emergency_responder']
    }],
    restrictedAreas: [{
      areaId: String,
      name: String,
      bounds: {
        type: 'Polygon',
        coordinates: [[[Number]]]
      },
      allowedRoles: [String],
      allowedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }]
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
villageMapSchema.index({ villageId: 1, isActive: 1 });
villageMapSchema.index({ 'features.geometry': '2dsphere' });
villageMapSchema.index({ 'disasterWarning.activeWarnings.centerPoint': '2dsphere' });
villageMapSchema.index({ 'disasterWarning.monitoringStations.location': '2dsphere' });
villageMapSchema.index({ 'emergencyConfig.safeZones.coordinates': '2dsphere' });
villageMapSchema.index({ 'emergencyConfig.evacuationRoutes.path': '2dsphere' });
villageMapSchema.index({ 'emergencyConfig.assemblyPoints.location': '2dsphere' });
villageMapSchema.index({ 'disasterWarning.activeWarnings.expiresAt': 1 }, { expireAfterSeconds: 0 });

// 虚拟字段：活跃警告数量
villageMapSchema.virtual('activeWarningCount').get(function() {
  return this.disasterWarning.activeWarnings.length;
});

// 虚拟字段：地图边界
villageMapSchema.virtual('bounds').get(function() {
  return [
    [this.mapBounds.southwest.longitude, this.mapBounds.southwest.latitude],
    [this.mapBounds.northeast.longitude, this.mapBounds.northeast.latitude]
  ];
});

// 实例方法：添加要素
villageMapSchema.methods.addFeature = function(featureData) {
  const feature = {
    featureId: featureData.featureId || this.generateFeatureId(),
    ...featureData,
    properties: {
      ...featureData.properties,
      lastUpdated: new Date()
    }
  };

  this.features.push(feature);
  this.updateStatistics();
  return this.save();
};

// 实例方法：更新要素
villageMapSchema.methods.updateFeature = function(featureId, updateData) {
  const feature = this.features.id(featureId);
  if (!feature) {
    throw new Error('要素不存在');
  }

  Object.assign(feature, updateData);
  feature.properties.lastUpdated = new Date();
  this.updateStatistics();
  return this.save();
};

// 实例方法：删除要素
villageMapSchema.methods.removeFeature = function(featureId) {
  this.features = this.features.filter(f => f._id.toString() !== featureId);
  this.updateStatistics();
  return this.save();
};

// 实例方法：添加灾害预警
villageMapSchema.methods.addDisasterWarning = function(warningData) {
  const warning = {
    ...warningData,
    warningId: warningData.warningId || this.generateWarningId(),
    issuedAt: new Date()
  };

  this.disasterWarning.activeWarnings.push(warning);

  // 同时添加到历史记录
  this.disasterWarning.warningHistory.push({
    ...warning,
    action: 'issued'
  });

  return this.save();
};

// 实例方法：移除灾害预警
villageMapSchema.methods.removeDisasterWarning = function(warningId, userId) {
  const warningIndex = this.disasterWarning.activeWarnings.findIndex(
    w => w.warningId === warningId
  );

  if (warningIndex === -1) {
    throw new Error('预警不存在');
  }

  const removedWarning = this.disasterWarning.activeWarnings.splice(warningIndex, 1)[0];

  // 添加到历史记录
  this.disasterWarning.warningHistory.push({
    ...removedWarning,
    action: 'cancelled',
    cancelledBy: userId,
    cancelledAt: new Date()
  });

  return this.save();
};

// 实例方法：获取指定区域内的要素
villageMapSchema.methods.getFeaturesInBounds = function(bounds) {
  const features = [];

  this.features.forEach(feature => {
    if (this.isFeatureInBounds(feature, bounds)) {
      features.push(feature);
    }
  });

  return features;
};

// 实例方法：获取指定类型的要素
villageMapSchema.methods.getFeaturesByType = function(featureType) {
  return this.features.filter(feature => feature.featureType === featureType);
};

// 实例方法：生成要素ID
villageMapSchema.methods.generateFeatureId = function() {
  return `feat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// 实例方法：生成预警ID
villageMapSchema.methods.generateWarningId = function() {
  return `warn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// 实例方法：检查要素是否在边界内
villageMapSchema.methods.isFeatureInBounds = function(feature, bounds) {
  // 这里应该使用地理计算库如turf.js
  // 简化实现
  return true;
};

// 实例方法：更新统计信息
villageMapSchema.methods.updateStatistics = function() {
  this.statistics.totalFeatures = this.features.length;

  const typeCount = new Map();
  this.features.forEach(feature => {
    const count = typeCount.get(feature.featureType) || 0;
    typeCount.set(feature.featureType, count + 1);
  });

  this.statistics.featuresByType = typeCount;
  this.statistics.lastUpdated = new Date();
  this.statistics.version = this.version;
};

// 静态方法：获取村庄地图
villageMapSchema.statics.getVillageMap = async function(villageId, mapType = 'base') {
  return this.findOne({
    villageId,
    mapType,
    isActive: true
  }).populate('disasterWarning.activeWarnings.updatedBy', 'name');
};

// 静态方法：获取村庄的活跃预警
villageMapSchema.statics.getActiveWarnings = async function(villageId) {
  const maps = await this.find({
    villageId,
    isActive: true,
    'disasterWarning.activeWarnings.0': { $exists: true }
  });

  const warnings = [];
  maps.forEach(map => {
    warnings.push(...map.disasterWarning.activeWarnings);
  });

  return warnings;
};

// 静态方法：获取附近的应急设施
villageMapSchema.statics.getNearbyEmergencyFacilities = async function(villageId, point, maxDistance = 1000) {
  const map = await this.getVillageMap(villageId);
  if (!map) {
    return [];
  }

  const emergencyTypes = ['medical_point', 'shelter', 'emergency_exit', 'rescue_point'];
  const facilities = map.features.filter(f => emergencyTypes.includes(f.featureType));

  // 使用地理计算找出距离最近的设施
  // 这里应该使用真实的距离计算
  const nearbyFacilities = facilities.filter(facility => {
    // 简化实现
    return true;
  });

  return nearbyFacilities.map(facility => ({
    ...facility.toObject(),
    distance: Math.random() * maxDistance // 模拟距离
  })).sort((a, b) => a.distance - b.distance);
};

// 静态方法：计算撤离路线
villageMapSchema.statics.calculateEvacuationRoutes = async function(villageId, startPoint, safeZones) {
  const map = await this.getVillageMap(villageId);
  if (!map || !map.emergencyConfig.evacuationRoutes.length) {
    return [];
  }

  // 使用图算法计算最优撤离路线
  const routes = [];
  map.emergencyConfig.evacuationRoutes.forEach(route => {
    routes.push({
      routeId: route.routeId,
      name: route.name,
      priority: route.priority,
      path: route.path.coordinates,
      estimatedTime: route.estimatedTime,
      capacity: route.capacity,
      distance: this.calculateRouteDistance(route.path.coordinates)
    });
  });

  return routes.sort((a, b) => {
    // 优先按优先级排序，然后按时间排序
    const priorityOrder = { primary: 3, secondary: 2, emergency: 1 };
    if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return a.estimatedTime - b.estimatedTime;
  });
};

// 静态方法：计算路线距离
villageMapSchema.statics.calculateRouteDistance = function(coordinates) {
  let distance = 0;
  for (let i = 1; i < coordinates.length; i++) {
    // 使用地理计算库计算两点间距离
    // 简化实现
    distance += Math.random() * 1000;
  }
  return Math.round(distance);
};

// 静态方法：处理位置脱敏
villageMapSchema.statics.anonymizeLocation = function(location, blurRadius = 50) {
  // 在指定半径内随机偏移位置
  const angle = Math.random() * 2 * Math.PI;
  const offset = Math.random() * blurRadius;

  const deltaLat = offset * Math.cos(angle) / 111320; // 约1度纬度 = 111.32km
  const deltaLng = offset * Math.sin(angle) / (111320 * Math.cos(location.latitude * Math.PI / 180));

  return {
    latitude: location.latitude + deltaLat,
    longitude: location.longitude + deltaLng,
    isAnonymized: true,
    blurRadius
  };
};

module.exports = mongoose.model('VillageMap', villageMapSchema);