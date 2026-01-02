const mongoose = require('mongoose');

/**
 * EmergencyResource Schema - 应急资源数据模型
 *
 * 功能描述：
 * - 管理村庄应急资源（消防栓、水泵、避难所等）
 * - 跟踪资源状态和可用性
 * - 记录资源维护历史
 * - 关联责任人信息
 */
const emergencyResourceSchema = new mongoose.Schema({
  // 关联村庄
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 资源编号（唯一标识）
  resourceCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },

  // 资源名称
  name: {
    type: String,
    required: true,
    trim: true
  },

  // 资源类型
  resourceType: {
    type: String,
    required: true,
    enum: [
      'fire_hydrant',        // 消防栓
      'water_pump',          // 水泵
      'fire_extinguisher',   // 灭火器
      'shelter',             // 避难所
      'first_aid_kit',       // 急救箱
      'emergency_generator', // 应急发电机
      'emergency_light',     // 应急照明
      'rescue_boat',         // 救援船只
      'rescue_equipment',    // 救援设备
      'emergency_vehicle',   // 应急车辆
      'communication',       // 通信设备
      'emergency_supplies',  // 应急物资
      'medical_equipment',   // 医疗设备
      'sandbag',            // 沙袋
      'portable_pump',      // 便携式水泵
      'other'              // 其他
    ]
  },

  // 资源子类型
  subType: {
    type: String,
    trim: true
  },

  // 资源位置
  location: {
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

  // 地址信息
  address: {
    detail: {
      type: String,
      trim: true
    },
    building: String,  // 楼栋
    floor: String,     // 楼层
    room: String       // 房间
  },

  // 资源状态
  status: {
    type: String,
    enum: ['available', 'in_use', 'maintenance', 'unavailable', 'damaged'],
    default: 'available',
    index: true
  },

  // 资源属性
  specifications: {
    // 品牌/型号
    brand: String,
    model: String,
    // 容量/规格
    capacity: String,
    // 数量
    quantity: {
      type: Number,
      default: 1,
      min: 0
    },
    // 单位
    unit: String,
    // 购置日期
    purchaseDate: Date,
    // 保质期
    expiryDate: Date,
    // 供应商
    supplier: String,
    // 联系方式
    supplierContact: String
  },

  // 资源描述
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // 使用说明
  usageInstructions: {
    type: String,
    trim: true
  },

  // 安全注意事项
  safetyNotes: {
    type: String,
    trim: true
  },

  // 责任人信息
  responsiblePerson: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    // 备用联系人
    alternateContact: {
      name: String,
      phone: String
    }
  },

  // 维护信息
  maintenance: {
    // 最后检查日期
    lastCheckedAt: Date,
    // 下次检查日期
    nextCheckDate: Date,
    // 检查频率（天）
    checkFrequency: {
      type: Number,
      default: 30
    },
    // 维护历史
    history: [{
      checkDate: {
        type: Date,
        default: Date.now
      },
      checker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      checkerName: String,
      status: {
        type: String,
        enum: ['normal', 'needs_repair', 'replaced', 'damaged']
      },
      findings: String,
      actions: String,
      nextCheckDate: Date
    }]
  },

  // 使用记录
  usageHistory: [{
    usedAt: {
      type: Date,
      default: Date.now
    },
    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    usedByName: String,
    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyIncident'
    },
    incidentType: String,
    purpose: String,
    returnAt: Date,
    condition: {
      type: String,
      enum: ['normal', 'damaged', 'consumed']
    },
    remarks: String
  }],

  // 资源图片
  images: [{
    url: String,
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 二维码（用于扫码查看详情）
  qrCode: {
    type: String,
    trim: true
  },

  // RFID标签
  rfidTag: {
    type: String,
    trim: true
  },

  // 可用性标记
  availability: {
    // 是否24小时可用
    available24h: {
      type: Boolean,
      default: true
    },
    // 可用时间段
    availableHours: {
      start: String,  // HH:mm
      end: String     // HH:mm
    },
    // 特殊限制
    restrictions: [String]
  },

  // 关联的危险区域
  relatedDangerZones: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DangerZone'
  }],

  // 资源等级（优先级）
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

  // 额外数据
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

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
emergencyResourceSchema.index({ villageId: 1, resourceType: 1 });
emergencyResourceSchema.index({ resourceCode: 1 }, { unique: true });
emergencyResourceSchema.index({ location: '2dsphere' });
emergencyResourceSchema.index({ status: 1 });
emergencyResourceSchema.index({ 'maintenance.nextCheckDate': 1 });
emergencyResourceSchema.index({ 'responsiblePerson.userId': 1 });

// 虚拟字段：完整地址
emergencyResourceSchema.virtual('fullAddress').get(function() {
  const parts = [
    this.address.detail,
    this.address.building,
    this.address.floor,
    this.address.room
  ].filter(Boolean);
  return parts.join(' ');
});

// 虚拟字段：是否需要维护
emergencyResourceSchema.virtual('needsMaintenance').get(function() {
  if (!this.maintenance.nextCheckDate) return false;
  return new Date(this.maintenance.nextCheckDate) <= new Date();
});

// 虚拟字段：是否过期
emergencyResourceSchema.virtual('isExpired').get(function() {
  if (!this.specifications.expiryDate) return false;
  return new Date(this.specifications.expiryDate) < new Date();
});

/**
 * 静态方法：根据类型获取资源
 */
emergencyResourceSchema.statics.getByType = function(villageId, resourceType) {
  return this.find({
    villageId,
    resourceType,
    visible: true
  }).sort({ priority: -1, createdAt: -1 });
};

/**
 * 静态方法：获取可用资源
 */
emergencyResourceSchema.statics.getAvailableResources = function(villageId, resourceType) {
  const query = {
    villageId,
    status: 'available',
    visible: true
  };

  if (resourceType) {
    query.resourceType = resourceType;
  }

  return this.find(query).sort({ priority: -1 });
};

/**
 * 静态方法：搜索附近资源
 * @param {Number} longitude - 经度
 * @param {Number} latitude - 纬度
 * @param {Number} maxDistance - 最大距离（米）
 */
emergencyResourceSchema.statics.findNearbyResources = function(longitude, latitude, maxDistance = 500) {
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
    status: 'available',
    visible: true
  })
  .sort({ priority: -1 })
  .limit(20);
};

/**
 * 静态方法：获取需要维护的资源
 */
emergencyResourceSchema.statics.getResourcesNeedingMaintenance = function(villageId) {
  return this.find({
    villageId,
    'maintenance.nextCheckDate': { $lte: new Date() },
    status: { $ne: 'unavailable' }
  });
};

/**
 * 静态方法：获取即将过期的资源
 */
emergencyResourceSchema.statics.getExpiringResources = function(villageId, days = 30) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);

  return this.find({
    villageId,
    'specifications.expiryDate': { $lte: expiryDate, $gte: new Date() },
    status: { $ne: 'unavailable' }
  });
};

/**
 * 实例方法：更新状态
 */
emergencyResourceSchema.methods.updateStatus = function(status, userId, remarks) {
  this.status = status;
  this.updatedBy = userId;

  // 如果资源被使用，记录使用历史
  if (status === 'in_use') {
    this.usageHistory.push({
      usedBy: userId,
      usedAt: new Date(),
      condition: 'normal'
    });
  }

  if (remarks) {
    this.remarks = remarks;
  }

  return this.save();
};

/**
 * 实例方法：记录维护检查
 */
emergencyResourceSchema.methods.recordMaintenance = function(checkData) {
  const maintenanceRecord = {
    checkDate: new Date(),
    status: checkData.status || 'normal',
    findings: checkData.findings || '',
    actions: checkData.actions || ''
  };

  if (checkData.checker) {
    maintenanceRecord.checker = checkData.checker;
  }
  if (checkData.checkerName) {
    maintenanceRecord.checkerName = checkData.checkerName;
  }

  // 计算下次检查日期
  const nextCheck = new Date();
  nextCheck.setDate(nextCheck.getDate() + this.maintenance.checkFrequency);
  maintenanceRecord.nextCheckDate = nextCheck;

  this.maintenance.lastCheckedAt = new Date();
  this.maintenance.nextCheckDate = nextCheck;
  this.maintenance.history.push(maintenanceRecord);

  // 根据检查结果更新资源状态
  if (checkData.status === 'damaged') {
    this.status = 'unavailable';
  }

  return this.save();
};

/**
 * 实例方法：记录使用情况
 */
emergencyResourceSchema.methods.recordUsage = function(usageData) {
  const usageRecord = {
    usedBy: usageData.userId,
    usedAt: new Date(),
    purpose: usageData.purpose || '',
    condition: usageData.condition || 'normal'
  };

  if (usageData.userName) {
    usageRecord.usedByName = usageData.userName;
  }
  if (usageData.incidentId) {
    usageRecord.incident = usageData.incidentId;
  }
  if (usageData.incidentType) {
    usageRecord.incidentType = usageData.incidentType;
  }
  if (usageData.remarks) {
    usageRecord.remarks = usageData.remarks;
  }

  this.usageHistory.push(usageRecord);

  // 更新状态
  if (usageData.condition !== 'normal') {
    this.status = 'unavailable';
  } else {
    this.status = 'available';
  }

  return this.save();
};

/**
 * 实例方法：归还资源
 */
emergencyResourceSchema.methods.returnResource = function(returnData) {
  const lastUsage = this.usageHistory[this.usageHistory.length - 1];
  if (lastUsage && !lastUsage.returnAt) {
    lastUsage.returnAt = new Date();
    lastUsage.condition = returnData.condition || 'normal';

    if (returnData.remarks) {
      lastUsage.remarks = returnData.remarks;
    }

    // 如果归还时状态正常，设置为可用
    if (returnData.condition === 'normal') {
      this.status = 'available';
    } else {
      this.status = 'maintenance';
    }
  }

  return this.save();
};

/**
 * 实例方法：计算距离（米）
 */
emergencyResourceSchema.methods.distanceTo = function(longitude, latitude) {
  const R = 6371e3; // 地球半径（米）
  const lat1 = this.location.coordinates[1] * Math.PI / 180;
  const lat2 = latitude * Math.PI / 180;
  const deltaLat = (latitude - this.location.coordinates[1]) * Math.PI / 180;
  const deltaLon = (longitude - this.location.coordinates[0]) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * 静态方法：生成资源编号
 */
emergencyResourceSchema.statics.generateResourceCode = async function(villageId, resourceType) {
  const prefix = {
    fire_hydrant: 'FH',
    water_pump: 'WP',
    fire_extinguisher: 'FE',
    shelter: 'SH',
    first_aid_kit: 'FA',
    emergency_generator: 'EG',
    emergency_light: 'EL',
    rescue_boat: 'RB',
    rescue_equipment: 'RE',
    emergency_vehicle: 'EV',
    communication: 'CM',
    emergency_supplies: 'ES',
    medical_equipment: 'ME',
    sandbag: 'SB',
    portable_pump: 'PP'
  };

  const typePrefix = prefix[resourceType] || 'ER';

  // 查找同类型资源的最大编号
  const lastResource = await this.findOne({
    resourceCode: new RegExp(`^${typePrefix}`)
  }).sort({ resourceCode: -1 });

  let nextNumber = 1;
  if (lastResource) {
    const lastNumber = parseInt(lastResource.resourceCode.slice(-4));
    nextNumber = lastNumber + 1;
  }

  // 格式：类型前缀 + 村庄ID后4位 + 序号（4位）
  const villageSuffix = String(villageId).slice(-4).padStart(4, '0');
  const numberSuffix = String(nextNumber).padStart(4, '0');

  return `${typePrefix}${villageSuffix}${numberSuffix}`;
};

// 创建模型
const EmergencyResource = mongoose.model('EmergencyResource', emergencyResourceSchema);

module.exports = EmergencyResource;
