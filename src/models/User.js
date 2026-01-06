/**
 * 用户数据模型
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,  // 允许多个 null 值
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'village_admin', 'village_official', 'resident', 'purchaser'],
    default: 'resident'
  },
  profile: {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    phone: { type: String, trim: true },
    avatar: { type: String },
    address: { type: String, trim: true }
  },
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  lastLoginAt: { type: Date },
  loginCount: { type: Number, default: 0 },

  // 村委档案信息
  committeeProfile: {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommitteeMember'
    },
    isOnDuty: {
      type: Boolean,
      default: false
    },
    dutySchedule: [{
      date: Date,
      shift: String,
      location: String
    }],
    qrCode: String,  // 村委身份二维码
    committeeLevel: {
      type: String,
      enum: ['village', 'township', 'county'],
      default: 'village'
    }
  },

  // 语音设置
  voiceSettings: {
    enabled: {
      type: Boolean,
      default: true
    },
    dialect: {
      type: String,
      enum: [
        'mandarin',      // 普通话
        'cantonese',     // 粤语
        'hokkien',       // 闽南语
        'hakka',         // 客家话
        'shanghainese',  // 上海话
        'sichuanese',    // 四川话
        'hunanese',      // 湖南话
        'wenzhouese',    // 温州话
        'shaanxiese',    // 陕西话
        'northeastern',  // 东北话
        'tianjinese',    // 天津话
        'nanjinese',     // 南京话
        'wuhanese',      // 武汉话
        'changanese',    // 西安话
        'chongqingese',  // 重庆话
        'guangdongese',  // 广东话
        'fujianese',     // 福建话
        'jiangxinese',   // 江西话
        'henanese',      // 河南话
        'shanxiese',     // 山西话
        'guizhouese',    // 贵州话
        'yunnanese'      // 云南话
      ],
      default: 'mandarin'
    },
    autoPlay: {
      type: Boolean,
      default: false
    },
    voiceSpeed: {
      type: Number,
      min: 0.5,
      max: 2.0,
      default: 1.0
    },
    voicePitch: {
      type: Number,
      min: 0.5,
      max: 2.0,
      default: 1.0
    },
    preferredSpeaker: {
      type: String,
      default: 'female'
    },
    voiceCommandsEnabled: {
      type: Boolean,
      default: true
    }
  },

  // 人脸识别设置
  faceSettings: {
    enabled: {
      type: Boolean,
      default: false
    },
    faceData: String,  // 加密存储的人脸特征向量
    faceVerified: {
      type: Boolean,
      default: false
    },
    lastVerifiedAt: Date
  },

  // 安全设置
  securitySettings: {
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorSecret: String,
    loginNotifications: {
      type: Boolean,
      default: true
    },
    sensitiveOperationVerification: {
      type: String,
      enum: ['password', 'sms', 'face', 'otp'],
      default: 'password'
    }
  },

  // 通知偏好
  notificationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true },
    voice: { type: Boolean, default: true },
    categories: {
      announcements: { type: Boolean, default: true },
      financial: { type: Boolean, default: true },
      emergency: { type: Boolean, default: true },
      duties: { type: Boolean, default: true }
    }
  },

  // 离线功能
  offlineSettings: {
    enabled: {
      type: Boolean,
      default: true
    },
    lastSyncTime: Date,
    pendingSync: {
      type: Boolean,
      default: false
    }
  }

}, {
  timestamps: true
});

// 密码加密中间件
userSchema.pre('save', async function(next) {
  // 只有密码被修改时才加密
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // 生成盐值并加密密码
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 验证密码方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 获取用户公开信息（不包含敏感信息）
userSchema.methods.toPublicJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);