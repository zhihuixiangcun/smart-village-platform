/**
 * 应急资源模型
 * 管理应急物资和设备资源
 */

const mongoose = require('mongoose');

const EmergencyResourceSchema = new mongoose.Schema({
  // 基本信息
  name: { type: String, required: true, index: true },
  code: { type: String, required: true, unique: true },
  description: { type: String },

  // 资源类型
  type: {
    type: String,
    required: true,
    enum: [
      'personnel',        // 人员
      'vehicle',          // 车辆
      'equipment',        // 设备
      'material',         // 物资
      'facility',         // 场地
      'medical',          // 医疗
      'communication',    // 通信
      'protective',       // 防护
      'rescue'           // 救援
    ],
    index: true
  },

  // 子类型
  subType: {
    type: String,
    required: true,
    enum: [
      // 人员
      'rescue_team', 'medical_team', 'expert', 'volunteer',
      // 车辆
      'ambulance', 'fire_truck', 'rescue_vehicle', 'transport_vehicle',
      // 设备
      'pump', 'generator', 'lighting', 'communication_device',
      // 物资
      'food', 'water', 'medicine', 'clothing', 'tent',
      // 场地
      'shelter', 'command_center', 'medical_station',
      // 医疗
      'first_aid_kit', 'medical_equipment', 'medicine',
      // 通信
      'radio', 'satellite_phone', 'drone',
      // 防护
      'mask', 'gloves', 'protective_clothing',
      // 救援
      'rope', 'ladder', 'life_jacket'
    ]
  },

  // 状态
  status: {
    type: String,
    required: true,
    enum: ['available', 'allocated', 'in_use', 'maintenance', 'retired'],
    default: 'available',
    index: true
  },

  // 位置信息
  location: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      index: '2dsphere'
    },
    villageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Village', required: true, index: true },
    building: { type: String },
    floor: { type: String },
    room: { type: String }
  },

  // 责任人信息
  responsiblePerson: {
    userId: { type: mongoose.Schema.Types.ObjectId },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    department: { type: String }
  },

  // 联系人信息（备用）
  contactPerson: {
    name: { type: String },
    phone: { type: String },
    email: { type: String }
  },

  // 数量信息
  quantity: {
    total: { type: Number, required: true, default: 1 },
    available: { type: Number, required: true, default: 1 },
    unit: { type: String, required: true }, // 个、台、套、辆等
    minimumReserve: { type: Number, default: 0 } // 最低储备量
  },

  // 技术规格
  specifications: {
    brand: { type: String },
    model: { type: String },
    serialNumber: { type: String },
    manufacturer: { type: String },
    productionDate: { type: Date },
    purchaseDate: { type: Date },
    warrantyExpiry: { type: Date },
    technicalParams: { type: mongoose.Schema.Types.Mixed }
  },

  // 能力信息
  capabilities: [{
    name: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    unit: { type: String },
    description: { type: String }
  }],

  // 使用限制
  limitations: [{
    type: { type: String, enum: ['weather', 'time', 'terrain', 'skill', 'other'] },
    description: { type: String },
    condition: { type: String }
  }],

  // 维护信息
  maintenance: {
    lastMaintenanceDate: { type: Date },
    nextMaintenanceDate: { type: Date },
    maintenanceInterval: { type: Number }, // 天数
    maintenanceRecord: [{
      date: { type: Date, required: true },
      type: { type: String, enum: ['routine', 'repair', 'inspection'], required: true },
      description: { type: String },
      cost: { type: Number },
      performedBy: { type: String },
      nextMaintenanceDate: { type: Date }
    }]
  },

  // 分配记录
  allocationHistory: [{
    emergencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Emergency' },
    allocatedAt: { type: Date, required: true },
    allocatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // required: true
    quantity: { type: Number, required: true },
    purpose: { type: String },
    returnedAt: { type: Date },
    returnCondition: { type: String, enum: ['good', 'damaged', 'lost', 'consumed'] },
    notes: { type: String }
  }],

  // 照片和文档
  photos: [{
    url: { type: String, required: true },
    description: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
  documents: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, enum: ['manual', 'certificate', 'specification', 'other'] },
    uploadedAt: { type: Date, default: Date.now }
  }],

  // 使用说明
  instructions: {
    description: { type: String },
    manualUrl: { type: String },
    videoUrl: { type: String },
    safetyNotes: { type: String }
  },

  // 成本信息
  cost: {
    purchasePrice: { type: Number },
    currentValue: { type: Number },
    dailyCost: { type: Number }, // 每日使用成本
    currency: { type: String, default: 'CNY' }
  },

  // 可用性
  availability: {
    availableDays: [{ type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] }],
    availableHours: {
      start: { type: String }, // "08:00"
      end: { type: String }   // "18:00"
    },
    advanceNoticeHours: { type: Number, default: 0 }, // 提前通知小时数
    maxConsecutiveUseHours: { type: Number } // 最大连续使用小时数
  },

  // 应急类型适用性
  applicableEmergencyTypes: [{
    type: {
      type: String,
      enum: ['fire', 'flood', 'earthquake', 'accident', 'medical', 'weather', 'security', 'other'],
      required: true
    },
    priority: { type: Number, default: 1 }, // 优先级 1-5
    suitability: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' }
  }],

  // 标签和分类
  tags: [{ type: String, index: true }],
  category: { type: String, index: true },

  // 元数据
  metadata: { type: mongoose.Schema.Types.Mixed },

  // 时间戳 (timestamps: true会自动创建索引,不需要手动指定index: true)
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  // 软删除
  isDeleted: { type: Boolean, default: false, index: true }
}, {
  timestamps: true,
  collection: 'emergency_resources'
});

// 复合索引
EmergencyResourceSchema.index({ villageId: 1, type: 1, status: 1 });
EmergencyResourceSchema.index({ status: 1, type: 1, location: '2dsphere' });
EmergencyResourceSchema.index({ 'responsiblePerson.userId': 1 });
EmergencyResourceSchema.index({ tags: 1 });
EmergencyResourceSchema.index({ 'applicableEmergencyTypes.type': 1, 'applicableEmergencyTypes.priority': -1 });

// 地理空间索引
EmergencyResourceSchema.index({ 'location.coordinates': '2dsphere' });

// 静态方法：根据位置查找可用资源
EmergencyResourceSchema.statics.findAvailableByLocation = function(longitude, latitude, maxDistance = 5000, filters = {}) {
  const query = {
    status: 'available',
    isDeleted: false,
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    }
  };

  if (filters.type) query.type = filters.type;
  if (filters.villageId) query.villageId = filters.villageId;
  if (filters.subType) query.subType = filters.subType;
  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }

  return this.find(query)
    .populate('responsiblePerson.userId', 'username phone')
    .populate('villageId', 'name code')
    .sort({ 'location.coordinates': 1 });
};

// 静态方法：根据应急类型查找资源
EmergencyResourceSchema.statics.findByEmergencyType = function(emergencyType, villageId = null) {
  const query = {
    status: 'available',
    isDeleted: false,
    'applicableEmergencyTypes.type': emergencyType
  };

  if (villageId) {
    query.villageId = villageId;
  }

  return this.find(query)
    .sort({ 'applicableEmergencyTypes.priority': -1, name: 1 })
    .populate('responsiblePerson.userId', 'username phone email')
    .populate('villageId', 'name code');
};

// 静态方法：获取低库存资源
EmergencyResourceSchema.statics.getLowStockResources = function(villageId = null) {
  const query = {
    $expr: { $lte: ['$quantity.available', '$quantity.minimumReserve'] },
    isDeleted: false
  };

  if (villageId) {
    query.villageId = villageId;
  }

  return this.find(query)
    .populate('villageId', 'name code')
    .sort({ 'quantity.available': 1 });
};

// 静态方法：获取需要维护的资源
EmergencyResourceSchema.statics.getResourcesNeedingMaintenance = function(villageId = null, daysAhead = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const query = {
    $or: [
      { 'maintenance.nextMaintenanceDate': { $lte: futureDate } },
      { 'maintenance.nextMaintenanceDate': { $exists: false } }
    ],
    status: { $ne: 'retired' },
    isDeleted: false
  };

  if (villageId) {
    query.villageId = villageId;
  }

  return this.find(query)
    .populate('responsiblePerson.userId', 'username phone email')
    .populate('villageId', 'name code')
    .sort({ 'maintenance.nextMaintenanceDate': 1 });
};

// 实例方法：分配资源
EmergencyResourceSchema.methods.allocate = function(emergencyId, allocatedBy, quantity = null, purpose = '') {
  if (this.status !== 'available') {
    throw new Error('资源当前不可用');
  }

  const allocateQuantity = quantity || this.quantity.available;
  if (allocateQuantity > this.quantity.available) {
    throw new Error('分配数量超过可用数量');
  }

  // 更新可用数量
  this.quantity.available -= allocateQuantity;

  // 如果全部分配，更新状态
  if (this.quantity.available === 0) {
    this.status = 'allocated';
  }

  // 添加分配记录
  this.allocationHistory.push({
    emergencyId,
    allocatedAt: new Date(),
    allocatedBy,
    quantity: allocateQuantity,
    purpose
  });

  return this.save();
};

// 实例方法：释放资源
EmergencyResourceSchema.methods.release = function(emergencyId, returnedBy, condition = 'good', notes = '') {
  const allocationIndex = this.allocationHistory.findIndex(
    record => record.emergencyId.toString() === emergencyId.toString() && !record.returnedAt
  );

  if (allocationIndex === -1) {
    throw new Error('未找到对应的分配记录');
  }

  const allocation = this.allocationHistory[allocationIndex];

  // 更新分配记录
  allocation.returnedAt = new Date();
  allocation.returnCondition = condition;
  allocation.notes = notes;

  // 如果资源未消耗或丢失，恢复可用数量
  if (condition !== 'consumed' && condition !== 'lost') {
    this.quantity.available += allocation.quantity;
  }

  // 更新状态
  if (this.status === 'allocated' && this.quantity.available > 0) {
    this.status = 'available';
  }

  return this.save();
};

// 实例方法：更新数量
EmergencyResourceSchema.methods.updateQuantity = function(total, operator) {
  const oldAvailable = this.quantity.available;
  this.quantity.total = total;
  this.quantity.available = Math.min(total, this.quantity.available);

  // 记录数量变更
  this.metadata = this.metadata || {};
  this.metadata.quantityHistory = this.metadata.quantityHistory || [];
  this.metadata.quantityHistory.push({
    date: new Date(),
    operator,
    oldTotal: this.quantity.total,
    newTotal: total,
    oldAvailable,
    newAvailable: this.quantity.available
  });

  return this.save();
};

// 实例方法：添加维护记录
EmergencyResourceSchema.methods.addMaintenanceRecord = function(maintenanceData) {
  this.maintenance.maintenanceRecord.push({
    ...maintenanceData,
    date: new Date()
  });

  // 更新下次维护日期
  if (maintenanceData.nextMaintenanceDate) {
    this.maintenance.nextMaintenanceDate = maintenanceData.nextMaintenanceDate;
  }

  return this.save();
};

// 虚拟字段：使用率
EmergencyResourceSchema.virtual('utilizationRate').get(function() {
  if (this.quantity.total === 0) return 0;
  return ((this.quantity.total - this.quantity.available) / this.quantity.total * 100).toFixed(2);
});

// 虚拟字段：是否需要维护
EmergencyResourceSchema.virtual('needsMaintenance').get(function() {
  if (!this.maintenance.nextMaintenanceDate) return true;
  return this.maintenance.nextMaintenanceDate <= new Date();
});

// 虚拟字段：距离下次维护天数
EmergencyResourceSchema.virtual('daysToNextMaintenance').get(function() {
  if (!this.maintenance.nextMaintenanceDate) return 0;
  const diffTime = this.maintenance.nextMaintenanceDate - new Date();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// 确保虚拟字段在JSON中包含
EmergencyResourceSchema.set('toJSON', { virtuals: true });
EmergencyResourceSchema.set('toObject', { virtuals: true });

// 中间件：保存前更新时间
EmergencyResourceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 避免重复编译模型
module.exports = mongoose.models.EmergencyResource || mongoose.model('EmergencyResource', EmergencyResourceSchema);