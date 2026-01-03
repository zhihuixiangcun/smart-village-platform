const mongoose = require('mongoose');

/**
 * DangerZone Schema - 危险区域数据模型
 *
 * 功能描述：
 * - 标记和管理村庄内的危险区域
 * - 支持不同危险等级和类型
 * - 提供预警提示信息
 * - 记录危险区域状态变化
 */
const dangerZoneSchema = new mongoose.Schema({
  // 关联村庄
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 危险区域名称
  name: {
    type: String,
    required: true,
    trim: true
  },

  // 危险类型
  dangerType: {
    type: String,
    required: true,
    enum: [
      'flood',           // 易涝区域
      'fire',            // 火灾高风险区
      'landslide',       // 滑坡风险区
      'collapse',        // 塌方风险区
      'pollution',       // 污染区域
      'epidemic',        // 疫情区域
      'construction',    // 施工区域
      'traffic',         // 交通安全隐患
      'electrical',      // 电力隐患
      'chemical',        // 化学品危险
      'explosive',       // 爆炸物危险
      'radiation',       // 辐射危险
      'other'           // 其他危险
    ]
  },

  // 危险等级
  dangerLevel: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },

  // 危险区域边界（支持点、线、面）
  area: {
    type: {
      type: String,
      enum: ['Point', 'LineString', 'Polygon', 'Circle'],
      required: true
    },
    coordinates: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    // 如果是圆形，存储半径（米）
    radius: {
      type: Number,
      min: 0
    }
  },

  // 区域中心点（用于地图标注）
  centerPoint: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: [Number] // [经度, 纬度]
  },

  // 影响范围（米）
  affectedRadius: {
    type: Number,
    default: 100,
    min: 0
  },

  // 危险描述
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },

  // 预警信息
  alert: {
    // 预警标题
    title: {
      type: String,
      required: true,
      trim: true
    },
    // 预警内容
    message: {
      type: String,
      required: true,
      trim: true
    },
    // 预警级别
    level: {
      type: String,
      enum: ['info', 'warning', 'danger', 'critical'],
      default: 'warning'
    },
    // 建议措施
    recommendations: [String]
  },

  // 区域状态
  status: {
    type: String,
    enum: ['active', 'monitoring', 'resolved', 'inactive'],
    default: 'active'
  },

  // 时间信息
  timeInfo: {
    // 发现时间
    discoveredAt: {
      type: Date,
      default: Date.now
    },
    // 预计开始时间
    expectedStart: Date,
    // 预计结束时间
    expectedEnd: Date,
    // 实际解决时间
    resolvedAt: Date
  },

  // 影响评估
  impact: {
    // 可能受影响的村民数量
    affectedResidents: {
      type: Number,
      default: 0
    },
    // 可能受影响的建筑物数量
    affectedBuildings: {
      type: Number,
      default: 0
    },
    // 评估报告
    report: {
      type: String,
      trim: true
    }
  },

  // 处理措施
  measures: [{
    description: String,
    implementedAt: Date,
    implementedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed'],
      default: 'planned'
    }
  }],

  // 责任人信息
  responsiblePerson: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    phone: String
  },

  // 监测数据
  monitoring: {
    // 是否需要持续监测
    enabled: {
      type: Boolean,
      default: false
    },
    // 监测频率（分钟）
    frequency: {
      type: Number,
      default: 60
    },
    // 最近监测数据
    latestData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // 最近监测时间
    lastCheckedAt: Date
  },

  // 地图显示配置
  displayConfig: {
    // 填充颜色（根据危险等级自动设置）
    fillColor: {
      type: String,
      default: function() {
        const colors = {
          low: '#52c41a',      // 绿色
          medium: '#faad14',   // 橙色
          high: '#ff4d4f',     // 红色
          critical: '#722ed1'  // 紫色
        };
        return colors[this.dangerLevel] || '#faad14';
      }
    },
    // 边框颜色
    strokeColor: {
      type: String,
      default: '#ff4d4f'
    },
    // 边框宽度
    strokeWidth: {
      type: Number,
      default: 2
    },
    // 填充透明度（0-1）
    fillOpacity: {
      type: Number,
      default: 0.3,
      min: 0,
      max: 1
    },
    // 是否显示标签
    showLabel: {
      type: Boolean,
      default: true
    }
  },

  // 关联的应急资源
  relatedResources: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmergencyResource'
  }],

  // 图片和视频
  media: [{
    type: {
      type: String,
      enum: ['image', 'video']
    },
    url: String,
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 创建者和更新者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
dangerZoneSchema.index({ villageId: 1, status: 1 });
dangerZoneSchema.index({ area: '2dsphere' });
dangerZoneSchema.index({ centerPoint: '2dsphere' });
dangerZoneSchema.index({ dangerType: 1, dangerLevel: 1 });
dangerZoneSchema.index({ status: 1, 'timeInfo.expectedStart': 1 });

// 前置保存钩子：自动设置中心点和颜色
dangerZoneSchema.pre('save', function(next) {
  if (this.isModified('area')) {
    this.calculateCenterPoint();
  }
  if (this.isModified('dangerLevel')) {
    this.updateDisplayColor();
  }
  next();
});

/**
 * 实例方法：计算区域中心点
 */
dangerZoneSchema.methods.calculateCenterPoint = function() {
  const areaType = this.area.type;
  const coords = this.area.coordinates;

  switch (areaType) {
    case 'Point':
      this.centerPoint = {
        type: 'Point',
        coordinates: coords
      };
      break;

    case 'Circle':
      this.centerPoint = {
        type: 'Point',
        coordinates: coords
      };
      break;

    case 'LineString':
      // 计算线段中点
      const midIndex = Math.floor(coords.length / 2);
      this.centerPoint = {
        type: 'Point',
        coordinates: coords[midIndex]
      };
      break;

    case 'Polygon':
      // 计算多边形质心
      const polygonCoords = coords[0]; // 外环
      let centerX = 0, centerY = 0;
      const n = polygonCoords.length;

      for (let i = 0; i < n; i++) {
        centerX += polygonCoords[i][0];
        centerY += polygonCoords[i][1];
      }

      this.centerPoint = {
        type: 'Point',
        coordinates: [centerX / n, centerY / n]
      };
      break;
  }
};

/**
 * 实例方法：更新显示颜色
 */
dangerZoneSchema.methods.updateDisplayColor = function() {
  const colors = {
    low: '#52c41a',      // 绿色
    medium: '#faad14',   // 橙色
    high: '#ff4d4f',     // 红色
    critical: '#722ed1'  // 紫色
  };
  this.displayConfig.fillColor = colors[this.dangerLevel] || '#faad14';
};

/**
 * 静态方法：获取活跃的危险区域
 */
dangerZoneSchema.statics.getActiveZones = function(villageId) {
  return this.find({
    villageId,
    status: { $in: ['active', 'monitoring'] }
  }).sort({ dangerLevel: -1, createdAt: -1 });
};

/**
 * 静态方法：查询指定位置是否在危险区域
 * @param {Number} longitude - 经度
 * @param {Number} latitude - 纬度
 */
dangerZoneSchema.statics.checkPointInDangerZone = async function(villageId, longitude, latitude) {
  const zones = await this.find({
    villageId,
    status: { $in: ['active', 'monitoring'] }
  });

  const dangerZones = [];

  for (const zone of zones) {
    const isInZone = await this.checkIfPointInZone(longitude, latitude, zone);
    if (isInZone) {
      dangerZones.push(zone);
    }
  }

  return dangerZones;
};

/**
 * 静态方法：检查点是否在指定危险区域内
 */
dangerZoneSchema.statics.checkIfPointInZone = function(longitude, latitude, zone) {
  const areaType = zone.area.type;
  const coords = zone.area.coordinates;

  switch (areaType) {
    case 'Point':
      // 点危险区域：检查距离
      const distance = this.calculateDistance(
        longitude, latitude,
        coords[0], coords[1]
      );
      return distance <= zone.affectedRadius;

    case 'Circle':
      // 圆形区域
      const circleDistance = this.calculateDistance(
        longitude, latitude,
        coords[0], coords[1]
      );
      return circleDistance <= zone.area.radius;

    case 'Polygon':
      // 多边形区域：使用射线法
      return this.isPointInPolygon([longitude, latitude], coords);

    default:
      return false;
  }
};

/**
 * 静态方法：计算两点间距离（米）
 */
dangerZoneSchema.statics.calculateDistance = function(lon1, lat1, lon2, lat2) {
  const R = 6371e3; // 地球半径（米）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * 静态方法：判断点是否在多边形内（射线法）
 */
dangerZoneSchema.statics.isPointInPolygon = function(point, polygon) {
  let inside = false;
  const x = point[0], y = point[1];
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
};

/**
 * 静态方法：搜索附近的危险区域
 */
dangerZoneSchema.statics.findNearbyDangerZones = function(longitude, latitude, radius = 500) {
  return this.find({
    centerPoint: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: radius
      }
    },
    status: { $in: ['active', 'monitoring'] }
  }).sort({ dangerLevel: -1 });
};

/**
 * 实例方法：更新状态
 */
dangerZoneSchema.methods.updateStatus = function(status, resolverId) {
  this.status = status;
  this.updatedBy = resolverId;

  if (status === 'resolved') {
    this.timeInfo.resolvedAt = new Date();
  }

  return this.save();
};

/**
 * 实例方法：添加处理措施
 */
dangerZoneSchema.methods.addMeasure = function(description, userId) {
  this.measures.push({
    description,
    implementedBy: userId,
    implementedAt: new Date(),
    status: 'planned'
  });
  return this.save();
};

/**
 * 实例方法：更新监测数据
 */
dangerZoneSchema.methods.updateMonitoringData = function(data) {
  this.monitoring.latestData = data;
  this.monitoring.lastCheckedAt = new Date();
  return this.save();
};

// 创建模型
const DangerZone = mongoose.model('DangerZone', dangerZoneSchema);

module.exports = DangerZone;
