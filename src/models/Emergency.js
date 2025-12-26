/**
 * 应急响应管理模型
 */

const mongoose = require('mongoose');

// 应急事件类型
const EmergencyTypes = {
  NATURAL_DISASTER: 'natural_disaster',   // 自然灾害
  ACCIDENT: 'accident',                   // 事故灾难
  PUBLIC_HEALTH: 'public_health',       // 公共卫生
  SECURITY: 'security',                 // 社会安全
  FIRE: 'fire',                          // 火灾
  FLOOD: 'flood',                        // 洪涝
  EARTHQUAKE: 'earthquake',              // 地震
  EPIDEMIC: 'epidemic',                  // 疫情
  OTHER: 'other'                         // 其他
};

// 严重程度
const SeverityLevels = {
  LOW: 'low',        // 一般
  MEDIUM: 'medium',  // 较重
  HIGH: 'high',      // 严重
  CRITICAL: 'critical' // 特别严重
};

// 事件状态
const EmergencyStatus = {
  PENDING: 'pending',           // 待处理
  INVESTIGATING: 'investigating', // 调查中
  RESPONDING: 'responding',     // 响应中
  MONITORING: 'monitoring',     // 监控中
  RESOLVED: 'resolved',         // 已解决
  CLOSED: 'closed'              // 已关闭
};

/**
 * 应急事件主模型
 */
const EmergencySchema = new mongoose.Schema({
  // 事件标识
  incidentNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // 事件基本信息
  type: {
    type: String,
    enum: Object.values(EmergencyTypes),
    required: true,
    index: true
  },
  severity: {
    type: String,
    enum: Object.values(SeverityLevels),
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },

  // 位置信息
  location: {
    type: String,
    required: true,
    maxlength: 200
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: [Number] // [longitude, latitude]
  },
  address: {
    province: String,
    city: String,
    district: String,
    street: String,
    detail: String
  },

  // 影响范围
  affectedArea: {
    radius: Number, // 影响半径（米）
    area: Number,    // 影响面积（平方米）
    population: Number // 影响人口
  },
  affectedPeople: {
    type: Number,
    default: 0
  },
  injuries: {
    type: Number,
    default: 0
  },
  deaths: {
    type: Number,
    default: 0
  },
  missing: {
    type: Number,
    default: 0
  },

  // 损失评估
  estimatedLoss: {
    total: Number,
    property: Number,
    economic: Number,
    currency: {
      type: String,
      default: 'CNY'
    }
  },
  actualLoss: {
    total: Number,
    property: Number,
    economic: Number
  },

  // 紧急需求
  immediateNeeds: [{
    type: {
      type: String,
      enum: ['rescue', 'medical', 'food', 'water', 'shelter', 'clothing', 'communication', 'transport', 'other']
    },
    quantity: Number,
    description: String,
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    }
  }],

  // 事件状态
  status: {
    type: String,
    enum: Object.values(EmergencyStatus),
    default: 'pending',
    index: true
  },

  // 时间信息
  occurredAt: {
    type: Date,
    required: true,
    index: true
  },
  reportedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  resolvedAt: Date,

  // 报告人信息
  reporterInfo: {
    name: String,
    phone: String,
    email: String,
    isAnonymous: {
      type: Boolean,
      default: false
    },
    isOnScene: {
      type: Boolean,
      default: false
    }
  },

  // 处理团队
  assignedTeam: {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyTeam'
    },
    teamName: String,
    teamLeader: {
      userId: { type: mongoose.Schema.Types.ObjectId },
      name: String,
      phone: String
    },
    teamMembers: [{
      userId: { type: mongoose.Schema.Types.ObjectId },
      name: String,
      role: String,
      contact: String
    }]
  },

  // 响应行动
  responseActions: [{
    action: String,
    description: String,
    executedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId },
      name: String
    },
    executedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending'
    },
    resources: [{
      type: String,
      quantity: Number,
      description: String
    }],
    attachments: [{
      filename: String,
      path: String,
      type: String,
      size: Number
    }]
  }],

  // 附件
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    type: String,
    size: Number,
    description: String,
    uploadedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId },
      name: String
    },
    uploadedAt: { type: Date, default: Date.now }
  }],

  // 关联信息
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },
  relatedEvents: [{
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Emergency' },
    relationType: {
      type: String,
      enum: ['cause', 'effect', 'related', 'duplicate']
    }
  }],
  parentEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Emergency'
  },
  childEvents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Emergency'
  }],

  // 评估和总结
  evaluation: {
    responseTime: Number, // 响应时间（分钟）
    resolutionTime: Number, // 解决时间（分钟）
    effectiveness: {
      type: Number,
      min: 1,
      max: 5
    },
    lessons: [String],
    recommendations: [String]
  },
  resolutionDescription: String,

  // 审计信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'emergencies'
});

/**
 * 应急预案模型
 */
const EmergencyPlanSchema = new mongoose.Schema({
  // 预案基本信息
  name: {
    type: String,
    required: true,
    maxlength: 200
  },
  type: {
    type: String,
    enum: Object.values(EmergencyTypes),
    required: true,
    index: true
  },
  severity: {
    type: String,
    enum: Object.values(SeverityLevels),
    required: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },

  // 触发条件
  triggerConditions: [{
    condition: String,
    threshold: mongoose.Schema.Types.Mixed,
    operator: {
      type: String,
      enum: ['gt', 'lt', 'eq', 'gte', 'lte', 'contains']
    },
    description: String
  }],

  // 响应流程
  responseProcedures: [{
    step: Number,
    action: String,
    description: String,
    responsible: {
      role: String,
      department: String
    },
    timeline: String,
    resources: [{
      type: String,
      quantity: Number,
      description: String
    }],
    checklist: [String]
  }],

  // 资源需求
  resourceRequirements: [{
    type: {
      type: String,
      enum: ['personnel', 'equipment', 'material', 'facility', 'vehicle']
    },
    name: String,
    specification: String,
    quantity: Number,
    unit: String,
    location: String,
    contact: {
      name: String,
      phone: String,
      email: String
    }
  }],

  // 联系人列表
  contactList: [{
    role: String,
    name: String,
    phone: String,
    email: String,
    department: String,
    priority: {
      type: String,
      enum: ['primary', 'secondary', 'backup'],
      default: 'secondary'
    },
    availableHours: String
  }],

  // 预案状态
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'archived'],
    default: 'active'
  },
  version: {
    type: String,
    default: '1.0'
  },

  // 审批信息
  approvedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId },
    name: String,
    position: String
  },
  approvedAt: Date,

  // 关联信息
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 创建和更新信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'emergency_plans'
});

/**
 * 应急资源模型
 */
const EmergencyResourceSchema = new mongoose.Schema({
  // 资源基本信息
  name: {
    type: String,
    required: true,
    maxlength: 200
  },
  type: {
    type: String,
    enum: ['equipment', 'personnel', 'facility', 'material', 'vehicle', 'communication', 'other'],
    required: true,
    index: true
  },
  category: String, // 具体分类，如：消防设备、医疗用品等
  description: {
    type: String,
    maxlength: 500
  },

  // 数量信息
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: String, // 单位
  availableQuantity: {
    type: Number,
    default: 0
  },
  reservedQuantity: {
    type: Number,
    default: 0
  },

  // 规格参数
  specifications: {
    brand: String,
    model: String,
    serialNumber: String,
    manufactureDate: Date,
    expiryDate: Date,
    technicalParams: mongoose.Schema.Types.Mixed
  },

  // 位置信息
  location: {
    address: String,
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number]
    },
    building: String,
    floor: String,
    room: String,
    description: String
  },

  // 状态
  status: {
    type: String,
    enum: ['available', 'in_use', 'maintenance', 'unavailable', 'retired'],
    default: 'available',
    index: true
  },
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    default: 'good'
  },

  // 管理信息
  contactPerson: {
    name: String,
    phone: String,
    email: String,
    department: String
  },
  custodian: {
    userId: { type: mongoose.Schema.Types.ObjectId },
    name: String
  },

  // 使用记录
  usageHistory: [{
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Emergency' },
    usedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId },
      name: String
    },
    usedAt: { type: Date, default: Date.now },
    returnedAt: Date,
    quantity: Number,
    purpose: String,
    condition: String,
    notes: String
  }],

  // 维护记录
  maintenanceHistory: [{
    date: Date,
    type: {
      type: String,
      enum: ['routine', 'repair', 'inspection', 'calibration']
    },
    description: String,
    performedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId },
      name: String
    },
    cost: Number,
    nextMaintenanceDate: Date
  }],

  // 关联信息
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 审计信息
  managedBy: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'emergency_resources'
});

// 索引定义
EmergencySchema.index({ incidentNumber: 1 });
EmergencySchema.index({ villageId: 1, status: 1 });
EmergencySchema.index({ villageId: 1, type: 1 });
EmergencySchema.index({ villageId: 1, severity: 1 });
EmergencySchema.index({ occurredAt: -1 });
EmergencySchema.index({ reportedAt: -1 });
EmergencySchema.index({ 'coordinates': '2dsphere' });

EmergencyPlanSchema.index({ villageId: 1, type: 1 });
EmergencyPlanSchema.index({ villageId: 1, status: 1 });
EmergencyPlanSchema.index({ type: 1, severity: 1 });

EmergencyResourceSchema.index({ villageId: 1, type: 1 });
EmergencyResourceSchema.index({ villageId: 1, status: 1 });
EmergencyResourceSchema.index({ 'location.coordinates': '2dsphere' });

// 静态方法 - 生成事件编号
EmergencySchema.statics.generateIncidentNumber = async function(villageId, type) {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
                 (date.getMonth() + 1).toString().padStart(2, '0') +
                 date.getDate().toString().padStart(2, '0');

  const typeCode = type.substring(0, 2).toUpperCase();
  const villageCode = villageId ? villageId.toString().slice(-4) : '0000';
  const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  return `EMG${dateStr}-${villageCode}-${typeCode}-${randomCode}`;
};

// 虚拟字段
EmergencySchema.virtual('responseTime').get(function() {
  if (this.occurredAt && this.resolvedAt) {
    return Math.floor((this.resolvedAt - this.occurredAt) / 60000); // 分钟
  }
  return null;
});

EmergencyResourceSchema.virtual('availabilityRate').get(function() {
  if (this.quantity > 0) {
    return ((this.availableQuantity / this.quantity) * 100).toFixed(2);
  }
  return 0;
});

module.exports = {
  Emergency: mongoose.model('Emergency', EmergencySchema),
  // EmergencyPlan: mongoose.model('EmergencyPlan', EmergencyPlanSchema), // 临时禁用 - 使用独立的 EmergencyPlan.js 模型
  // EmergencyResource: mongoose.model('EmergencyResource', EmergencyResourceSchema), // 临时禁用 - 使用独立的 EmergencyResource.js 模型
  EmergencyTypes,
  SeverityLevels,
  EmergencyStatus
};