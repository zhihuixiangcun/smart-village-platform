const mongoose = require('mongoose');

/**
 * MapLocation Schema - 地点位置数据模型
 *
 * 功能描述：
 * - 存储村庄内各类地点信息
 * - 管理地点GPS坐标
 * - 分类管理不同类型地点
 * - 关联村民和服务信息
 */
const mapLocationSchema = new mongoose.Schema({
  // 关联村庄
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 地点名称
  name: {
    type: String,
    required: true,
    trim: true
  },

  // 地点类型
  type: {
    type: String,
    required: true,
    enum: [
      'government',      // 村委会、政府机构
      'education',       // 学校、培训机构
      'medical',         // 医院、诊所
      'emergency',       // 应急设施（消防、派出所）
      'commercial',      // 商店、市场
      'agricultural',    // 农业设施
      'recreational',    // 娱乐设施
      'residential',     // 住宅区
      'infrastructure',  // 基础设施（水电通信）
      'religious',       // 宗教场所
      'cultural',        // 文化场所
      'other'           // 其他
    ]
  },

  // 地点子类型（更详细的分类）
  subType: {
    type: String,
    trim: true
    // 例如：村委会、小学、卫生室、消防栓、超市等
  },

  // GPS坐标
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [经度, 纬度]
      required: true,
      validate: {
        validator: function(v) {
          return v.length === 2 &&
                 v[0] >= -180 && v[0] <= 180 &&
                 v[1] >= -90 && v[1] <= 90;
        },
        message: '坐标格式无效，必须为[经度, 纬度]'
      }
    }
  },

  // 地址信息
  address: {
    province: String,    // 省
    city: String,        // 市
    district: String,    // 区/县
    town: String,        // 乡镇
    village: String,     // 村
    detail: String       // 详细地址
  },

  // 地点属性
  attributes: {
    // 人口相关
    population: {
      type: Number,
      default: 0,
      min: 0
    },
    populationType: {
      type: String,
      enum: ['resident', 'floating', 'mixed'],
      default: 'resident'
    },

    // 设施规模
    area: {
      type: Number,      // 面积（平方米）
      default: 0
    },
    capacity: {
      type: Number,      // 容量（人数）
      default: 0
    },

    // 建筑信息
    buildingCount: {
      type: Number,
      default: 1
    },
    floorCount: {
      type: Number,
      default: 1
    },

    // 设施状态
    status: {
      type: String,
      enum: ['normal', 'under_construction', 'maintenance', 'closed'],
      default: 'normal'
    }
  },

  // 联系信息
  contact: {
    phone: String,
    email: String,
    personInCharge: String,    // 负责人
    emergencyContact: String   // 应急联系人
  },

  // 服务时间
  serviceHours: {
    isOpen: {
      type: Boolean,
      default: true
    },
    weekdays: {
      type: [String],  // ['monday', 'tuesday', ...]
      default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    },
    openTime: String,   // HH:mm格式
    closeTime: String   // HH:mm格式
  },

  // 关联村民（用于住宅、学校等）
  associatedResidents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // 关联服务
  services: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],

  // 图片信息
  images: [{
    url: String,
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 地点描述
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // 标签（用于分类和搜索）
  tags: [{
    type: String,
    trim: true
  }],

  // 优先级（用于地图标记大小和排序）
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },

  // 是否在地图上显示
  visible: {
    type: Boolean,
    default: true
  },

  // 自定义图标
  customIcon: {
    type: String,
    trim: true
  },

  // 额外数据（灵活存储）
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // 创建者和最后更新者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // 审核状态
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
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
mapLocationSchema.index({ villageId: 1, type: 1 });
mapLocationSchema.index({ location: '2dsphere' }); // 地理空间索引
mapLocationSchema.index({ name: 'text', description: 'text', tags: 'text' }); // 全文搜索索引
mapLocationSchema.index({ 'address.province': 1, 'address.city': 1, 'address.district': 1 });

// 虚拟字段：完整地址
mapLocationSchema.virtual('fullAddress').get(function() {
  const parts = [
    this.address.province,
    this.address.city,
    this.address.district,
    this.address.town,
    this.address.village,
    this.address.detail
  ].filter(Boolean);
  return parts.join('');
});

/**
 * 静态方法：获取指定类型的地点
 */
mapLocationSchema.statics.getByType = function(villageId, type) {
  return this.find({
    villageId,
    type,
    visible: true,
    approvalStatus: 'approved'
  }).sort({ priority: -1, createdAt: -1 });
};

/**
 * 静态方法：搜索附近地点
 * @param {Number} longitude - 经度
 * @param {Number} latitude - 纬度
 * @param {Number} maxDistance - 最大距离（米）
 * @param {Number} limit - 返回数量限制
 */
mapLocationSchema.statics.findNearby = function(longitude, latitude, maxDistance = 1000, limit = 10) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    },
    visible: true,
    approvalStatus: 'approved'
  })
  .limit(limit)
  .sort({ priority: -1 });
};

/**
 * 静态方法：搜索地点
 */
mapLocationSchema.statics.searchLocations = function(villageId, keyword, options = {}) {
  const query = {
    villageId,
    visible: true,
    approvalStatus: 'approved',
    $or: [
      { name: new RegExp(keyword, 'i') },
      { description: new RegExp(keyword, 'i') },
      { tags: new RegExp(keyword, 'i') },
      { 'address.detail': new RegExp(keyword, 'i') }
    ]
  };

  if (options.type) {
    query.type = options.type;
  }

  return this.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .limit(options.limit || 20);
};

/**
 * 实例方法：计算与另一个地点的距离（米）
 */
mapLocationSchema.methods.distanceTo = function(otherLocation) {
  const R = 6371e3; // 地球半径（米）
  const lat1 = this.location.coordinates[1] * Math.PI / 180;
  const lat2 = otherLocation.location.coordinates[1] * Math.PI / 180;
  const deltaLat = (otherLocation.location.coordinates[1] - this.location.coordinates[1]) * Math.PI / 180;
  const deltaLon = (otherLocation.location.coordinates[0] - this.location.coordinates[0]) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * 实例方法：添加关联村民
 */
mapLocationSchema.methods.addResident = function(userId) {
  if (!this.associatedResidents.includes(userId)) {
    this.associatedResidents.push(userId);
  }
  return this.save();
};

/**
 * 实例方法：移除关联村民
 */
mapLocationSchema.methods.removeResident = function(userId) {
  this.associatedResidents = this.associatedResidents.filter(id => !id.equals(userId));
  return this.save();
};

// 创建模型
const MapLocation = mongoose.model('MapLocation', mapLocationSchema);

module.exports = MapLocation;
