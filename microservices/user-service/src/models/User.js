/**
 * 用户模型
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  // 基本信息
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
    match: /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },

  // 个人信息
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: 50
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 50
    },
    phone: {
      type: String,
      trim: true,
      match: /^1[3-9]\d{9}$/
    },
    avatar: {
      type: String,
      default: null
    },
    idCard: {
      type: String,
      sparse: true,
      match: /^\d{17}[\dXx]$/
    }
  },

  // 系统信息
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },
  roles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    default: []
  }],
  permissions: [{
    resource: String,
    actions: [String]
  }],

  // 安全相关
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },

  // 双因子认证
  twoFactorAuth: {
    enabled: {
      type: Boolean,
      default: false
    },
    secret: {
      type: String,
      default: null
    },
    backupCodes: [{
      code: String,
      used: {
        type: Boolean,
        default: false
      },
      usedAt: {
        type: Date,
        default: null
      }
    }]
  },

  // 登录记录
  lastLoginAt: {
    type: Date,
    default: null
  },
  lastLoginIP: {
    type: String,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },

  // 会话管理
  sessions: [{
    token: String,
    deviceId: String,
    deviceName: String,
    ip: String,
    userAgent: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastActiveAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],

  // 审计字段
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.twoFactorAuth.secret;
      delete ret.sessions;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// 索引
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ villageId: 1 });
userSchema.index({ 'profile.phone': 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// 虚拟字段
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.virtual('fullName').get(function() {
  if (this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.username;
});

// 密码加密中间件
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 密码验证方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (this.isLocked) {
    throw new Error('账户已被锁定');
  }

  const isMatch = await bcrypt.compare(candidatePassword, this.password);

  if (!isMatch) {
    await this.incLoginAttempts();
    return false;
  }

  // 登录成功，重置登录尝试
  if (this.loginAttempts > 0) {
    await this.resetLoginAttempts();
  }

  return true;
};

// 登录尝试计数
userSchema.methods.incLoginAttempts = async function() {
  const maxAttempts = 5;
  const lockTime = 30 * 60 * 1000; // 30分钟

  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }

  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// 生成JWT Token
userSchema.methods.generateAuthToken = function(deviceInfo = {}) {
  const payload = {
    userId: this._id,
    username: this.username,
    email: this.email,
    villageId: this.villageId,
    roles: this.roles,
    permissions: this.permissions
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: 'smart-village-user-service',
    audience: this.villageId.toString()
  });

  // 记录会话
  this.sessions.push({
    token,
    deviceId: deviceInfo.deviceId || 'unknown',
    deviceName: deviceInfo.deviceName || 'Unknown Device',
    ip: deviceInfo.ip || 'unknown',
    userAgent: deviceInfo.userAgent || 'unknown'
  });

  return token;
};

// 验证JWT Token
userSchema.methods.validateToken = function(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId.toString() === this._id.toString();
  } catch (error) {
    return false;
  }
};

// 添加权限
userSchema.methods.addPermission = function(resource, actions) {
  const existingPermission = this.permissions.find(p => p.resource === resource);

  if (existingPermission) {
    // 合并权限
    const newActions = [...new Set([...existingPermission.actions, ...actions])];
    existingPermission.actions = newActions;
  } else {
    this.permissions.push({ resource, actions });
  }

  return this.save();
};

// 检查权限
userSchema.methods.hasPermission = function(resource, action) {
  return this.permissions.some(permission => {
    if (permission.resource === resource || permission.resource === '*') {
      return permission.actions.includes(action) ||
             permission.actions.includes('*') ||
             permission.actions.includes('all');
    }
    return false;
  });
};

// 添加角色
userSchema.methods.addRole = function(roleId) {
  if (!this.roles.includes(roleId)) {
    this.roles.push(roleId);
    return this.save();
  }
  return Promise.resolve(this);
};

// 移除角色
userSchema.methods.removeRole = function(roleId) {
  this.roles = this.roles.filter(role => role.toString() !== roleId.toString());
  return this.save();
};

// 登出
userSchema.methods.logout = function(token) {
  const session = this.sessions.find(s => s.token === token);
  if (session) {
    session.isActive = false;
  }
  return this.save();
};

// 登出所有设备
userSchema.methods.logoutAll = function() {
  this.sessions.forEach(session => {
    session.isActive = false;
  });
  return this.save();
};

// 清理过期会话
userSchema.methods.cleanExpiredSessions = function() {
  const expiredTime = 30 * 24 * 60 * 60 * 1000; // 30天
  const cutoffDate = new Date(Date.now() - expiredTime);

  this.sessions = this.sessions.filter(session =>
    session.isActive && session.createdAt > cutoffDate
  );

  return this.save();
};

// 静态方法：查找活跃用户
userSchema.statics.findActiveUsers = function(villageId) {
  const query = { isActive: true };
  if (villageId) {
    query.villageId = villageId;
  }
  return this.find(query).populate('roles');
};

// 静态方法：根据邮箱或用户名查找
userSchema.statics.findByEmailOrUsername = function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier }
    ],
    isActive: true
  }).populate('roles');
};

// 静态方法：统计数据
userSchema.statics.getUserStats = function(villageId) {
  const matchStage = villageId ? { villageId: new mongoose.Types.ObjectId(villageId) } : {};

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        emailVerifiedUsers: {
          $sum: { $cond: [{ $eq: ['$isEmailVerified', true] }, 1, 0] }
        },
        phoneVerifiedUsers: {
          $sum: { $cond: [{ $eq: ['$isPhoneVerified', true] }, 1, 0] }
        },
        twoFactorEnabledUsers: {
          $sum: { $cond: [{ $eq: ['$twoFactorAuth.enabled', true] }, 1, 0] }
        },
        recentlyActive: {
          $sum: {
            $cond: [
              { $gte: ['$lastLoginAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('User', userSchema);