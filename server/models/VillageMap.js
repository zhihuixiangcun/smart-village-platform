const mongoose = require('mongoose');

/**
 * VillageMap Schema - 村域地图数据模型
 *
 * 功能描述：
 * - 存储村界边界坐标
 * - 计算村域面积
 * - 配置地图中心点和缩放级别
 * - 管理地图图层配置
 */
const villageMapSchema = new mongoose.Schema({
  // 村庄基本信息
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    unique: true,
    index: true
  },
  villageName: {
    type: String,
    required: true,
    trim: true
  },

  // 村界边界坐标（多边形）
  // 使用GeoJSON格式存储地理空间数据
  boundary: {
    type: {
      type: String,
      enum: ['Polygon'],
      required: true
    },
    coordinates: {
      type: [[[Number]]], // 多维数组：[经度, 纬度]
      required: true
    }
  },

  // 村域面积（单位：平方米）
  area: {
    type: Number,
    default: 0
  },

  // 地图中心点
  center: {
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    }
  },

  // 地图缩放级别（3-18）
  zoomLevel: {
    type: Number,
    default: 14,
    min: 3,
    max: 18
  },

  // 地图图层配置
  layers: {
    // 默认显示的图层
    default: {
      type: String,
      enum: ['normal', 'satellite', 'hybrid'],
      default: 'normal'
    },
    // 可用图层列表
    available: [{
      name: String,
      type: {
        type: String,
        enum: ['normal', 'satellite', 'hybrid', 'terrain']
      },
      enabled: {
        type: Boolean,
        default: true
      }
    }]
  },

  // 地图样式配置
  style: {
    // 主题色
    primaryColor: {
      type: String,
      default: '#1890ff'
    },
    // 边界颜色
    boundaryColor: {
      type: String,
      default: '#1890ff'
    },
    // 填充颜色
    fillColor: {
      type: String,
      default: '#e6f7ff'
    },
    // 边界宽度
    boundaryWidth: {
      type: Number,
      default: 2
    }
  },

  // 地图控件配置
  controls: {
    // 是否显示缩放控件
    showZoom: {
      type: Boolean,
      default: true
    },
    // 是否显示工具栏
    showToolbar: {
      type: Boolean,
      default: true
    },
    // 是否显示比例尺
    showScale: {
      type: Boolean,
      default: true
    },
    // 是否显示指南针
    showCompass: {
      type: Boolean,
      default: true
    }
  },

  // 地图功能开关
  features: {
    // 是否启用测量工具
    enableMeasurement: {
      type: Boolean,
      default: true
    },
    // 是否启用绘图工具
    enableDrawing: {
      type: Boolean,
      default: false
    },
    // 是否启用3D视图
    enable3D: {
      type: Boolean,
      default: false
    },
    // 是否启用实时定位
    enableLocation: {
      type: Boolean,
      default: true
    }
  },

  // 地图数据统计
  statistics: {
    // 地点数量
    locationCount: {
      type: Number,
      default: 0
    },
    // 村民数量
    residentCount: {
      type: Number,
      default: 0
    },
    // 危险区域数量
    dangerZoneCount: {
      type: Number,
      default: 0
    },
    // 应急资源数量
    resourceCount: {
      type: Number,
      default: 0
    }
  },

  // 地图最后更新时间
  lastUpdated: {
    type: Date,
    default: Date.now
  },

  // 备注
  remarks: {
    type: String,
    trim: true
  }
}, {
  timestamps: true // 自动添加createdAt和updatedAt字段
});

// 索引设置
villageMapSchema.index({ villageId: 1 });
villageMapSchema.index({ boundary: '2dsphere' }); // 地理空间索引
villageMapSchema.index({ 'center.longitude': 1, 'center.latitude': 1 });

// 虚拟字段：获取村域面积的平方千米数
villageMapSchema.virtual('areaInSqKm').get(function() {
  return (this.area / 1000000).toFixed(2);
});

// 虚拟字段：获取村域面积的亩数（1平方米 = 0.0015亩）
villageMapSchema.virtual('areaInMu').get(function() {
  return (this.area * 0.0015).toFixed(2);
});

// 前置保存钩子：自动计算面积
villageMapSchema.pre('save', function(next) {
  if (this.isModified('boundary')) {
    this.area = this.calculateArea();
    this.lastUpdated = new Date();
  }
  next();
});

/**
 * 计算多边形面积（使用Shoelace公式）
 * @returns {Number} 面积（平方米）
 */
villageMapSchema.methods.calculateArea = function() {
  const coordinates = this.boundary.coordinates[0]; // 外环坐标
  let area = 0;
  const n = coordinates.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const x1 = coordinates[i][0];
    const y1 = coordinates[i][1];
    const x2 = coordinates[j][0];
    const y2 = coordinates[j][1];

    // Shoelace公式
    area += x1 * y2;
    area -= x2 * y1;
  }

  area = Math.abs(area) / 2;

  // 将度数转换为米（简化计算，实际应考虑地球曲率）
  // 1度约等于111km（纬度）和111km * cos(纬度)（经度）
  const avgLat = coordinates.reduce((sum, coord) => sum + coord[1], 0) / n;
  const latToMeter = 111320; // 1度纬度约111.32km
  const lonToMeter = 111320 * Math.cos(avgLat * Math.PI / 180);

  return area * latToMeter * lonToMeter;
};

/**
 * 静态方法：根据村庄ID获取地图数据
 */
villageMapSchema.statics.getByVillageId = function(villageId) {
  return this.findOne({ villageId }).populate('villageId', 'name code');
};

/**
 * 静态方法：检查坐标是否在村界内
 */
villageMapSchema.methods.isPointInBoundary = function(longitude, latitude) {
  const coordinates = this.boundary.coordinates[0];
  let inside = false;
  const n = coordinates.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = coordinates[i][0], yi = coordinates[i][1];
    const xj = coordinates[j][0], yj = coordinates[j][1];

    const intersect = ((yi > latitude) !== (yj > latitude)) &&
      (longitude < (xj - xi) * (latitude - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
};

/**
 * 实例方法：更新统计数据
 */
villageMapSchema.methods.updateStatistics = async function() {
  const MapLocation = mongoose.model('MapLocation');
  const ResidentLocation = mongoose.model('ResidentLocation');
  const DangerZone = mongoose.model('DangerZone');
  const EmergencyResource = mongoose.model('EmergencyResource');

  this.statistics.locationCount = await MapLocation.countDocuments({ villageId: this.villageId });
  this.statistics.residentCount = await ResidentLocation.countDocuments({ villageId: this.villageId });
  this.statistics.dangerZoneCount = await DangerZone.countDocuments({ villageId: this.villageId });
  this.statistics.resourceCount = await EmergencyResource.countDocuments({ villageId: this.villageId });

  return this.save();
};

// 创建模型
const VillageMap = mongoose.model('VillageMap', villageMapSchema);

module.exports = VillageMap;
