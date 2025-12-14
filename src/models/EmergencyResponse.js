/**
 * 应急响应系统数据模型
 * 支持一键呼叫、定位救援、应急资源管理等功能
 */

const mongoose = require('mongoose');

// 应急类型
const EmergencyTypes = {
  MEDICAL: 'medical',           // 医疗急救
  FIRE: 'fire',                 // 火灾
  FLOOD: 'flood',               // 洪水
  EARTHQUAKE: 'earthquake',     // 地震
  ACCIDENT: 'accident',         // 事故
  MISSING_PERSON: 'missing_person', // 人员失踪
  INFRASTRUCTURE: 'infrastructure', // 基础设施故障
  PUBLIC_SECURITY: 'public_security', // 公共安全
  NATURAL_DISASTER: 'natural_disaster', // 自然灾害
  OTHER: 'other'                // 其他
};

// 应急级别
const EmergencyLevels = {
  LEVEL_1: 'level_1',   // 特别重大
  LEVEL_2: 'level_2',   // 重大
  LEVEL_3: 'level_3',   // 较大
  LEVEL_4: 'level_4'    // 一般
};

// 响应状态
const ResponseStatus = {
  PENDING: 'pending',           // 待处理
  DISPATCHED: 'dispatched',     // 已调度
  IN_PROGRESS: 'in_progress',   // 处理中
  RESOLVED: 'resolved',         // 已解决
  CANCELLED: 'cancelled'        // 已取消
};

// 资源类型
const ResourceTypes = {
  PERSONNEL: 'personnel',       // 人员
  VEHICLE: 'vehicle',           // 车辆
  EQUIPMENT: 'equipment',       // 设备
  MATERIAL: 'material',         // 物资
  FACILITY: 'facility',         // 场所
  MEDICAL: 'medical'            // 医疗
};

/**
 * 应急事件模型
 */
const EmergencyEventSchema = new mongoose.Schema({
  // 基本信息
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: Object.values(EmergencyTypes),
    required: true,
    index: true
  },
  level: {
    type: String,
    enum: Object.values(EmergencyLevels),
    required: true,
    default: EmergencyLevels.LEVEL_4
  },
  villageId: {
    type: String,
    required: true,
    ref: 'Village',
    index: true
  },

  // 报警人信息
  reporter: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: { type: String, required: true },
    phone: {
      type: String,
      required: true,
      match: /^1[3-9]\d{9}$/
    },
    idCard: String,
    relationship: String // 与当事人的关系
  },

  // 当事人信息（如果不同于报警人）
  victim: {
    name: String,
    age: Number,
    gender: { type: String, enum: ['男', '女', '其他'] },
    idCard: String,
    medicalCondition: String,
    specialNeeds: [String]
  },

  // 事发地点
  location: {
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    },
    address: {
      province: String,
      city: String,
      county: String,
      township: String,
      village: String,
      group: String,
      detailed: { type: String, required: true }
    },
    landmark: String, // 地标
    locationAccuracy: Number, // 定位精度（米）
    altitude: Number // 海拔高度
  },

  // 时间信息
  time: {
    reported: { type: Date, required: true, default: Date.now },
    occurred: Date, // 事发时间
    firstResponse: Date, // 首次响应时间
    resolved: Date, // 解决时间
    estimatedResolution: Date // 预计解决时间
  },

  // 事件图片和视频
  media: [{
    type: { type: String, enum: ['image', 'video', 'audio'] },
    url: { type: String, required: true },
    name: { type: String, required: true },
    size: Number,
    description: String,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    geotagged: Boolean // 是否包含地理位置信息
  }],

  // 应急响应状态
  status: {
    type: String,
    enum: Object.values(ResponseStatus),
    default: ResponseStatus.PENDING,
    index: true
  },
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5,
    index: true
  },

  // 调度的救援队伍
  responders: [{
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    teamName: { type: String, required: true },
    teamType: {
      type: String,
      enum: ['medical', 'fire', 'police', 'volunteer', 'professional'],
      required: true
    },
    members: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      name: { type: String, required: true },
      role: String,
      contact: String,
      skills: [String]
    }],
    dispatchedAt: { type: Date, default: Date.now },
    arrivedAt: Date,
    status: {
      type: String,
      enum: ['dispatched', 'en_route', 'arrived', 'active', 'completed'],
      default: 'dispatched'
    },
    equipment: [String],
    notes: String
  }],

  // 使用的应急资源
  resources: [{
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(ResourceTypes),
      required: true
    },
    quantity: { type: Number, required: true },
    unit: String,
    deployedAt: { type: Date, default: Date.now },
    returnedAt: Date,
    cost: Number,
    condition: String
  }],

  // 处理流程
  workflow: [{
    step: { type: Number, required: true },
    action: { type: String, required: true },
    description: String,
    operator: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      name: { type: String, required: true }
    },
    timestamp: { type: Date, default: Date.now },
    duration: Number, // 处理时长（分钟）
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed'],
      default: 'pending'
    },
    notes: String,
    attachments: [{
      name: String,
      url: String
    }]
  }],

  // 事件评估
  assessment: {
    initialSeverity: {
      type: Number,
      min: 1,
      max: 10,
      required: true
    },
    actualSeverity: {
      type: Number,
      min: 1,
      max: 10
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    affectedPeople: Number,
    estimatedDamage: Number,
    responsePlan: String
  },

  // 处理结果
  resolution: {
    outcome: {
      type: String,
      enum: ['success', 'partial', 'failed'],
      required: true
    },
    summary: { type: String, required: true, maxlength: 1000 },
    casualties: {
      deaths: { type: Number, default: 0 },
      injuries: { type: Number, default: 0 },
      missing: { type: Number, default: 0 },
      rescued: { type: Number, default: 0 }
    },
    damage: {
      property: Number,
      infrastructure: Number,
      environment: Number
    },
    lessons: String,
    recommendations: String,
    followUp: [{
      action: String,
      responsible: String,
      deadline: Date,
      status: { type: String, enum: ['pending', 'completed'], default: 'pending' }
    }]
  },

  // 影响范围
  impact: {
    area: Number, // 影响面积（平方米）
    radius: Number, // 影响半径（米）
    affectedHouseholds: Number,
    evacuatedPeople: Number,
    infrastructureDamage: [String],
    economicLoss: Number
  },

  // 通信记录
  communications: [{
    timestamp: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ['call', 'sms', 'radio', 'video', 'report'],
      required: true
    },
    from: String,
    to: String,
    content: String,
    duration: Number, // 通话时长（秒）
    recording: String, // 录音文件URL
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // 协调机构
  coordination: {
    involvedAgencies: [{
      agencyName: { type: String, required: true },
      contactPerson: String,
      contactPhone: String,
      role: String,
      arrivedAt: Date
    }],
    commandCenter: {
      established: Boolean,
      location: String,
      commander: String,
      staff: [String]
    }
  },

  // 统计信息
  statistics: {
    responseTime: Number, // 响应时间（分钟）
    resolutionTime: Number, // 解决时间（分钟）
    totalCost: Number,
    personnelInvolved: Number,
    resourcesUsed: Number
  },

  // 元数据
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    verified: { type: Boolean, default: false },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date,
    confidential: { type: Boolean, default: false },
    publicReport: Boolean // 是否允许公开报道
  }
}, {
  timestamps: true,
  collection: 'emergency_events'
});

/**
 * 应急资源模型
 */
const EmergencyResourceSchema = new mongoose.Schema({
  // 基本信息
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  type: {
    type: String,
    enum: Object.values(ResourceTypes),
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  villageId: {
    type: String,
    required: true,
    ref: 'Village',
    index: true
  },

  // 资源详情
  description: {
    type: String,
    maxlength: 500
  },
  specifications: mongoose.Schema.Types.Mixed, // 技术规格
  manufacturer: String,
  model: String,
  serialNumber: String,
  purchaseDate: Date,
  purchasePrice: Number,
  currentValue: Number,

  // 状态管理
  status: {
    type: String,
    enum: ['available', 'in_use', 'maintenance', 'retired', 'damaged'],
    default: 'available',
    index: true
  },
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    default: 'good'
  },
  lastInspection: Date,
  nextMaintenance: Date,

  // 位置信息
  location: {
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    address: String,
    building: String,
    room: String
  },

  // 管理信息
  manager: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    department: String
  },

  // 可用性
  availability: {
    totalQuantity: { type: Number, required: true, default: 1 },
    availableQuantity: { type: Number, required: true, default: 1 },
    unit: { type: String, required: true },
    minReserve: Number, // 最低储备量
    maxDeploy: Number // 最大部署量
  },

  // 使用记录
  usageHistory: [{
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyEvent'
    },
    quantity: { type: Number, required: true },
    deployedAt: { type: Date, required: true },
    returnedAt: Date,
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    conditionBefore: String,
    conditionAfter: String,
    cost: Number,
    notes: String
  }],

  // 维护记录
  maintenanceHistory: [{
    type: {
      type: String,
      enum: ['routine', 'repair', 'upgrade', 'calibration'],
      required: true
    },
    description: { type: String, required: true },
    cost: Number,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    performedAt: { type: Date, required: true },
    nextMaintenance: Date,
    notes: String
  }],

  // 供应商信息
  supplier: {
    name: String,
    contact: String,
    phone: String,
    email: String,
    website: String,
    warrantyPeriod: Number,
    supportPhone: String
  },

  // 操作要求
  operationRequirements: {
    certification: [String], // 所需认证
    training: String, // 培训要求
    experience: Number, // 所需经验（年）
    physicalRequirements: [String], // 身体要求
    teamSize: Number // 所需团队规模
  },

  // 安全信息
  safety: {
    hazards: [String], // 危险因素
    precautions: [String], // 预防措施
    emergencyProcedures: String, // 应急程序
    protectiveEquipment: [String], // 防护设备
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    }
  },

  // 标签和分类
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],

  // 统计信息
  statistics: {
    totalUsage: { type: Number, default: 0 },
    maintenanceCount: { type: Number, default: 0 },
    downtime: { type: Number, default: 0 }, // 停机时间（小时）
    uptime: { type: Number, default: 0 }, // 运行时间（小时）
    efficiency: { type: Number, default: 100 }, // 效率百分比
    utilizationRate: { type: Number, default: 0 } // 利用率百分比
  },

  // 元数据
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastUsed: Date,
    qrCode: String, // 资源二维码
    barcode: String, // 条形码
    rfid: String, // RFID标签
    notes: String
  }
}, {
  timestamps: true,
  collection: 'emergency_resources'
});

/**
 * 应急联系模型
 */
const EmergencyContactSchema = new mongoose.Schema({
  // 基本信息
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  organization: String,
  role: String,
  villageId: {
    type: String,
    required: true,
    ref: 'Village',
    index: true
  },

  // 联系方式
  contacts: [{
    type: {
      type: String,
      enum: ['phone', 'mobile', 'email', 'radio', 'wechat'],
      required: true
    },
    value: { type: String, required: true },
    priority: { type: Number, default: 1, min: 1, max: 3 },
    isPrimary: { type: Boolean, default: false },
    available24h: { type: Boolean, default: false }
  }],

  // 专业技能
  expertise: [{
    skill: String,
    level: {
      type: String,
      enum: ['basic', 'intermediate', 'advanced', 'expert']
    },
    certified: Boolean,
    experience: Number // 经验年数
  }],

  // 服务范围
  services: [{
    type: String,
    enum: ['medical', 'fire', 'police', 'rescue', 'technical', 'logistics', 'administrative'],
    priority: { type: Number, default: 5, min: 1, max: 10 }
  }],

  // 可用性
  availability: {
    workingHours: {
      monday: { start: String, end: String, available: Boolean },
      tuesday: { start: String, end: String, available: Boolean },
      wednesday: { start: String, end: String, available: Boolean },
      thursday: { start: String, end: String, available: Boolean },
      friday: { start: String, end: String, available: Boolean },
      saturday: { start: String, end: String, available: Boolean },
      sunday: { start: String, end: String, available: Boolean }
    },
    holidays: Boolean,
    emergencyOnly: { type: Boolean, default: false }
  },

  // 位置信息
  location: {
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    address: String,
    serviceRadius: Number // 服务半径（公里）
  },

  // 状态管理
  status: {
    type: String,
    enum: ['active', 'inactive', 'on_duty', 'off_duty', 'unavailable'],
    default: 'active',
    index: true
  },

  // 统计信息
  statistics: {
    totalResponses: { type: Number, default: 0 },
    averageResponseTime: Number, // 平均响应时间（分钟）
    successRate: Number, // 成功率
    lastResponse: Date
  },

  // 元数据
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    notes: String
  }
}, {
  timestamps: true,
  collection: 'emergency_contacts'
});

// 索引
EmergencyEventSchema.index({ villageId: 1, status: 1, createdAt: -1 });
EmergencyEventSchema.index({ 'location.coordinates': '2dsphere' });
EmergencyEventSchema.index({ type: 1, level: 1, status: 1 });
EmergencyEventSchema.index({ 'reporter.phone': 1 });

EmergencyResourceSchema.index({ villageId: 1, type: 1, status: 1 });
EmergencyResourceSchema.index({ 'location.coordinates': '2dsphere' });
EmergencyResourceSchema.index({ 'manager.userId': 1 });

EmergencyContactSchema.index({ villageId: 1, status: 1 });
EmergencyContactSchema.index({ services: 1 });

// 虚拟字段
EmergencyEventSchema.virtual('responseTime').get(function() {
  if (this.time.firstResponse && this.time.reported) {
    return Math.floor((this.time.firstResponse - this.time.reported) / (1000 * 60));
  }
  return null;
});

EmergencyEventSchema.virtual('resolutionTime').get(function() {
  if (this.time.resolved && this.time.reported) {
    return Math.floor((this.time.resolved - this.time.reported) / (1000 * 60));
  }
  return null;
});

// 静态方法 - 获取附近的应急事件
EmergencyEventSchema.statics.getNearbyEvents = function(longitude, latitude, radiusKm = 10, filters = {}) {
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: radiusKm * 1000
      }
    },
    ...filters
  }).sort({ createdAt: -1 });
};

// 静态方法 - 获取可用资源
EmergencyResourceSchema.statics.getAvailableResources = function(villageId, resourceType, location = null) {
  const query = {
    villageId,
    type: resourceType,
    status: 'available',
    'availability.availableQuantity': { $gt: 0 }
  };

  if (location) {
    query['location.coordinates'] = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude]
        },
        $maxDistance: 50000 // 50公里内
      }
    };
  }

  return this.find(query).sort({ 'availability.availableQuantity': -1 });
};

module.exports = {
  EmergencyEvent: mongoose.model('EmergencyEvent', EmergencyEventSchema),
  EmergencyResource: mongoose.model('EmergencyResource', EmergencyResourceSchema),
  EmergencyContact: mongoose.model('EmergencyContact', EmergencyContactSchema),
  EmergencyTypes,
  EmergencyLevels,
  ResponseStatus,
  ResourceTypes
};