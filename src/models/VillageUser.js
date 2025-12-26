const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const villageUserSchema = new mongoose.Schema({
  // 基本信息
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    match: /^1[3-9]\d{9}$/
  },
  email: {
    type: String,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  avatar: String,
  idCard: {
    type: String,
    required: true,
    match: /^\d{17}[\dXx]$/
  },

  // 村务相关
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },
  villageName: String,
  address: String,

  // 职务和权限
  role: {
    type: String,
    enum: [
      'village_head',      // 村书记
      'village_director',  // 村主任
      'deputy_director',   // 副主任
      'accountant',        // 会计
      'committee_member',  // 村委成员
      'staff',             // 村工作人员
      'volunteer',         // 志愿者
      'resident'           // 普通村民
    ],
    required: true
  },
  position: String,
  department: String,
  level: {
    type: String,
    enum: ['admin', 'manager', 'operator', 'user'],
    default: 'user'
  },

  // 工作信息
  employeeId: {
    type: String,
    unique: true,
    sparse: true
  },
  hireDate: Date,
  workStatus: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },

  // 权限设置
  permissions: [{
    module: {
      type: String,
      enum: [
        'document_management',
        'duty_management',
        'user_management',
        'village_overview',
        'statistics_analysis',
        'system_settings'
      ]
    },
    actions: [{
      type: String,
      enum: ['create', 'read', 'update', 'delete', 'approve', 'export']
    }]
  }],

  // 安全信息
  password: {
    type: String,
    minlength: 6
  },
  faceFeatures: {
    featureVector: [Number],
    imagePath: String,
    isActive: {
      type: Boolean,
      default: false
    },
    lastUsed: Date
  },

  // 登录信息
  loginHistory: [{
    loginTime: Date,
    logoutTime: Date,
    ip: String,
    userAgent: String,
    location: String
  }],
  lastLogin: Date,
  lastLoginIP: String,

  // 工作统计
  workStats: {
    documentsCollected: { type: Number, default: 0 },
    documentsApproved: { type: Number, default: 0 },
    dutyShiftsCompleted: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 }, // 响应时间（分钟）
    workDays: { type: Number, default: 0 }
  },

  // 通知设置
  notificationSettings: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true },
    dutyReminder: { type: Boolean, default: true },
    taskReminder: { type: Boolean, default: true },
    systemAlerts: { type: Boolean, default: true }
  },

  // 设备信息
  devices: [{
    deviceId: String,
    deviceType: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop']
    },
    platform: String,
    lastActive: Date,
    isTrusted: { type: Boolean, default: false }
  }],

  // 状态
  isActive: {
    type: Boolean,
    default: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },

  // 系统字段
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VillageUser'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
villageUserSchema.index({ phone: 1 });
villageUserSchema.index({ villageId: 1, role: 1 });
villageUserSchema.index({ villageId: 1, workStatus: 1 });
villageUserSchema.index({ role: 1, workStatus: 1 });
villageUserSchema.index({ 'devices.deviceId': 1 });

// 虚拟字段
villageUserSchema.virtual('isVillageLeader').get(function() {
  return ['village_head', 'village_director'].includes(this.role);
});

villageUserSchema.virtual('hasAdminPrivileges').get(function() {
  return ['admin', 'manager'].includes(this.level);
});

villageUserSchema.virtual('workingDays').get(function() {
  if (!this.hireDate) return 0;
  const today = new Date();
  const hireDate = new Date(this.hireDate);
  return Math.floor((today - hireDate) / (1000 * 60 * 60 * 24));
});

// 实例方法
villageUserSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

villageUserSchema.methods.generateToken = function() {
  return jwt.sign(
    {
      userId: this._id,
      phone: this.phone,
      role: this.role,
      villageId: this.villageId
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

villageUserSchema.methods.hasPermission = function(module, action) {
  if (this.level === 'admin') return true;

  const modulePermission = this.permissions.find(p => p.module === module);
  return modulePermission && modulePermission.actions.includes(action);
};

villageUserSchema.methods.addLoginRecord = function(ip, userAgent, location) {
  this.loginHistory.push({
    loginTime: new Date(),
    ip,
    userAgent,
    location
  });
  this.lastLogin = new Date();
  this.lastLoginIP = ip;
  this.isOnline = true;
  return this.save();
};

villageUserSchema.methods.addLogoutRecord = function() {
  const lastLogin = this.loginHistory[this.loginHistory.length - 1];
  if (lastLogin && !lastLogin.logoutTime) {
    lastLogin.logoutTime = new Date();
  }
  this.isOnline = false;
  return this.save();
};

villageUserSchema.methods.updateWorkStats = function(stats) {
  Object.keys(stats).forEach(key => {
    if (this.workStats.hasOwnProperty(key)) {
      this.workStats[key] += stats[key];
    }
  });
  return this.save();
};

villageUserSchema.methods.addDevice = function(deviceInfo) {
  const existingDevice = this.devices.find(d => d.deviceId === deviceInfo.deviceId);
  if (existingDevice) {
    existingDevice.lastActive = new Date();
    existingDevice.isTrusted = true;
  } else {
    this.devices.push({
      ...deviceInfo,
      lastActive: new Date(),
      isTrusted: false
    });
  }
  return this.save();
};

// 静态方法
villageUserSchema.statics.findByPhone = function(phone) {
  return this.findOne({ phone, isActive: true }).populate('villageId', 'name code');
};

villageUserSchema.statics.findByVillageAndRole = function(villageId, role) {
  return this.find({ villageId, role, workStatus: 'active', isActive: true })
    .sort({ createdAt: -1 });
};

villageUserSchema.statics.getOnlineUsers = function(villageId) {
  return this.find({ villageId, isOnline: true, isActive: true })
    .select('name role avatar lastLogin lastLoginIP')
    .sort({ lastLogin: -1 });
};

villageUserSchema.statics.getWorkStatistics = function(villageId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        villageId: mongoose.Types.ObjectId(villageId),
        workStatus: 'active'
      }
    },
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        totalDocuments: { $sum: '$workStats.documentsCollected' },
        totalDuties: { $sum: '$workStats.dutyShiftsCompleted' },
        totalTasks: { $sum: '$workStats.tasksCompleted' },
        avgResponseTime: { $avg: '$workStats.averageResponseTime' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

villageUserSchema.statics.searchUsers = function(villageId, searchTerm, filters = {}) {
  const query = {
    villageId: mongoose.Types.ObjectId(villageId),
    isActive: true,
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { phone: { $regex: searchTerm, $options: 'i' } },
      { position: { $regex: searchTerm, $options: 'i' } }
    ]
  };

  if (filters.role) query.role = filters.role;
  if (filters.workStatus) query.workStatus = filters.workStatus;

  return this.find(query)
    .select('name phone role position avatar workStats lastLogin')
    .sort({ lastLogin: -1 });
};

// 中间件
villageUserSchema.pre('save', async function(next) {
  // 生成工号
  if (!this.employeeId && this.role !== 'resident') {
    const villageCode = this.villageName ? this.villageName.slice(0, 3).toUpperCase() : 'VIL';
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.employeeId = `${villageCode}${randomNum}`;
  }

  // 密码加密
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  next();
});

villageUserSchema.pre('remove', async function(next) {
  // 删除相关的文档收集记录
  const DocumentCollection = mongoose.model('DocumentCollection');
  await DocumentCollection.updateMany(
    { 'collector.userId': this._id },
    { $set: { 'collector.userId': null } }
  );

  // 删除值班安排
  const DutySchedule = mongoose.model('DutySchedule');
  await DutySchedule.updateMany(
    { 'assignments.userId': this._id },
    { $pull: { assignments: { userId: this._id } } }
  );

  next();
});

module.exports = mongoose.model('VillageUser', villageUserSchema);