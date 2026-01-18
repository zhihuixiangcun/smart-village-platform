const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
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
    trim: true,
    index: true
  },

  villageId: {
    type: String,
    required: true,
    trim: true
  },

  avatar: {
    type: String,
    default: '👤'
  },

  role: {
    type: String,
    enum: ['villager', 'cadre', 'admin'],
    default: 'villager',
    index: true
  },

  // 认证信息
  password: {
    type: String,
    select: false
  },

  salt: {
    type: String,
    select: false
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  verifiedAt: {
    type: Date
  },

  // 账户信息
  balance: {
    type: Number,
    default: 0
  },

  coins: {
    type: Number,
    default: 0
  },

  // 支付密码
  paymentPassword: {
    type: String,
    select: false
  },

  paymentPasswordSalt: {
    type: String,
    select: false
  },

  // 状态信息
  status: {
    type: String,
    enum: ['active', 'inactive', 'banned'],
    default: 'active'
  },

  online: {
    type: Boolean,
    default: false
  },

  lastSeenAt: {
    type: Date
  },

  // 设备信息
  devices: [{
    type: {
      type: String,
      enum: ['mobile', 'desktop', 'tablet']
    },
    platform: String,
    token: String,
    lastUsed: Date
  }],

  // 社交信息
  friendIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  blockedUserIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // 卡券
  coupons: [{
    couponId: String,
    name: String,
    description: String,
    type: {
      type: String,
      enum: ['discount', 'shipping', 'product']
    },
    value: Number,
    status: {
      type: String,
      enum: ['available', 'used', 'expired']
    },
    expiryDate: Date,
    usedAt: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 设置
  settings: {
    largeTextMode: {
      type: Boolean,
      default: false
    },
    highContrast: {
      type: Boolean,
      default: false
    },
    notificationEnabled: {
      type: Boolean,
      default: true
    },
    soundEnabled: {
      type: Boolean,
      default: true
    },
    vibrationEnabled: {
      type: Boolean,
      default: true
    }
  },

  // 备注
  remark: {
    type: String,
    default: ''
  },

  // 标签
  tags: [{
    type: String
  }],

  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

// 索引
userSchema.index({ phone: 1 });
userSchema.index({ villageId: 1, role: 1 });
userSchema.index({ createdAt: -1 });

// 虚拟方法 - 设置密码
userSchema.methods.setPassword = async function(password) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  
  this.salt = salt;
  this.password = hashedPassword;
};

// 虚拟方法 - 验证密码
userSchema.methods.validatePassword = async function(password) {
  const hashedPassword = await bcrypt.hash(password, this.salt);
  return await bcrypt.compare(password, this.password);
};

// 虚拟方法 - 设置支付密码
userSchema.methods.setPaymentPassword = async function(password) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  
  this.paymentPasswordSalt = salt;
  this.paymentPassword = hashedPassword;
};

// 虚拟方法 - 验证支付密码
userSchema.methods.validatePaymentPassword = async function(password) {
  const hashedPassword = await bcrypt.hash(password, this.paymentPasswordSalt);
  return await bcrypt.compare(password, this.paymentPassword);
};

// 虚拟方法 - 生成token
userSchema.methods.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

// 虚拟方法 - 增加余额
userSchema.methods.addBalance = function(amount) {
  this.balance += amount;
  this.updatedAt = new Date();
  return this.balance;
};

// 虚拟方法 - 减少余额
userSchema.methods.deductBalance = function(amount) {
  if (this.balance < amount) {
    throw new Error('余额不足');
  }
  this.balance -= amount;
  this.updatedAt = new Date();
  return this.balance;
};

// 虚拟方法 - 增加金币
userSchema.methods.addCoins = function(amount) {
  this.coins += amount;
  this.updatedAt = new Date();
  return this.coins;
};

// 虚拟方法 - 减少金币
userSchema.methods.deductCoins = function(amount) {
  if (this.coins < amount) {
    throw new Error('金币不足');
  }
  this.coins -= amount;
  this.updatedAt = new Date();
  return this.coins;
};

module.exports = mongoose.model('User', userSchema);
