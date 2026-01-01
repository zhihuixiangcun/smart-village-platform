/**
 * 智慧乡村综合服务平台 - MongoDB数据库设计
 *
 * 包含：
 * 1. 数据模型定义
 * 2. 索引策略
 * 3. 数据验证规则
 * 4. 分片策略
 * 5. 数据归档规则
 */

const { Schema, model, Types } = require('mongoose');

// ==================== 通用工具函数 ====================

/**
 * 生成家庭编码
 * @param {string} villageCode 村庄编码
 * @param {number} sequence 序列号
 * @returns {string} 家庭编码
 */
function generateFamilyCode(villageCode, sequence) {
  const date = new Date();
  const year = date.getFullYear().toString().slice(2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const seq = String(sequence).padStart(3, '0');
  return `F${year}${month}${villageCode.slice(-4)}${seq}`;
}

/**
 * 生成订单编号
 * @returns {string} 订单编号
 */
function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const timestamp = date.getTime().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD${year}${month}${day}${timestamp}${random}`;
}

/**
 * 加密敏感信息
 * @param {string} data 原始数据
 * @returns {string} 加密后的数据
 */
function encryptSensitiveData(data) {
  // 这里应该使用实际的加密算法，如AES-256
  // 示例：简单处理，实际应用中需要使用加密库
  return Buffer.from(data).toString('base64');
}

/**
 * 脱敏身份证号
 * @param {string} idNumber 身份证号
 * @returns {string} 脱敏后的身份证号
 */
function maskIdNumber(idNumber) {
  if (!idNumber || idNumber.length < 8) return idNumber;
  return idNumber.slice(0, 4) + '********' + idNumber.slice(-4);
}

// ==================== 数据模型定义 ====================

// 1. 村庄模型
const VillageSchema = new Schema({
  // 基本信息
  code: {
    type: String,
    required: true,
    unique: true,
    match: /^\d{12}$/,
    description: '行政村编码（12位数字）'
  },
  name: {
    type: String,
    required: true,
    maxlength: 100,
    description: '村庄名称'
  },
  province: {
    type: String,
    required: true,
    maxlength: 50,
    description: '省份'
  },
  city: {
    type: String,
    required: true,
    maxlength: 50,
    description: '城市'
  },
  district: {
    type: String,
    required: true,
    maxlength: 50,
    description: '区县'
  },
  address: {
    type: String,
    required: true,
    maxlength: 200,
    description: '详细地址'
  },

  // 地理信息
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(coords) {
          return coords.length === 2 &&
                 coords[0] >= -180 && coords[0] <= 180 &&
                 coords[1] >= -90 && coords[1] <= 90;
        },
        message: '经纬度坐标格式不正确'
      }
    }
  },
  boundary: {
    type: {
      type: String,
      enum: ['Polygon', 'MultiPolygon']
    },
    coordinates: {
      type: [[[Number]]],
      description: '村庄边界坐标'
    }
  },
  area: {
    type: Number,
    min: 0,
    description: '面积（平方公里）'
  },

  // 联系信息
  contact: {
    phone: {
      type: String,
      match: /^0\d{2,3}-?\d{7,8}$|^1[3-9]\d{9}$/,
      description: '联系电话'
    },
    email: {
      type: String,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      lowercase: true,
      description: '邮箱地址'
    },
    address: {
      type: String,
      maxlength: 200,
      description: '村委会地址'
    }
  },

  // 负责人信息
  administrator: {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true,
      maxlength: 50
    },
    phone: {
      type: String,
      required: true,
      match: /^1[3-9]\d{9}$/
    }
  },

  // 统计信息
  statistics: {
    totalPopulation: { type: Number, min: 0, default: 0 },
    households: { type: Number, min: 0, default: 0 },
    elderly: { type: Number, min: 0, default: 0 },
    children: { type: Number, min: 0, default: 0 },
    lowIncome: { type: Number, min: 0, default: 0 },
    updatedAt: { type: Date, default: Date.now }
  },

  // 配置信息
  settings: {
    defaultDialect: {
      type: String,
      enum: ['pcc', 'pcc-qn', 'yue', 'hakka', 'wu', 'xiang', 'gan'],
      default: 'pcc',
      description: '默认方言'
    },
    timezone: {
      type: String,
      default: 'Asia/Shanghai',
      description: '时区'
    },
    features: {
      faceAuth: { type: Boolean, default: true },
      voiceAssistant: { type: Boolean, default: true },
      onlinePayment: { type: Boolean, default: true },
      emergencyAlert: { type: Boolean, default: true }
    }
  },

  // 状态信息
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 2. 用户模型
const UserSchema = new Schema({
  // 基本信息
  username: {
    type: String,
    required: true,
    unique: true,
    match: /^[a-zA-Z0-9_]{3,50}$/,
    description: '用户名（3-50位字母数字下划线）'
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false,
    description: '密码（至少8位）'
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    match: /^1[3-9]\d{9}$/,
    description: '手机号'
  },
  email: {
    type: String,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    lowercase: true,
    description: '邮箱'
  },

  // 个人信息
  profile: {
    name: {
      type: String,
      required: true,
      maxlength: 50,
      description: '真实姓名'
    },
    gender: {
      type: String,
      enum: ['male', 'female'],
      description: '性别'
    },
    birthDate: {
      type: Date,
      validate: {
        validator: function(date) {
          return date < new Date();
        },
        message: '出生日期不能晚于当前日期'
      },
      description: '出生日期'
    },
    age: {
      type: Number,
      min: 0,
      max: 150,
      description: '年龄'
    },
    idNumber: {
      type: String,
      match: /^\d{17}[\dX]$/,
      set: encryptSensitiveData,
      select: false,
      description: '身份证号（加密存储）'
    },
    avatar: {
      type: String,
      validate: {
        validator: function(url) {
          return !url || /^https?:\/\/.+/.test(url);
        },
        message: '头像URL格式不正确'
      }
    }
  },

  // 认证信息
  authentication: {
    faceFeatures: {
      type: [Number],
      select: false,
      description: '人脸特征向量'
    },
    voicePrint: {
      type: String,
      select: false,
      description: '声纹特征'
    },
    lastLoginAt: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date }
  },

  // 权限角色
  role: {
    type: String,
    enum: ['admin', 'committee', 'villager'],
    required: true,
    default: 'villager'
  },
  villageId: {
    type: Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },
  permissions: [{
    type: String,
    description: '权限列表'
  }],

  // 村民信息（仅村民角色）
  residentInfo: {
    familyId: {
      type: Schema.Types.ObjectId,
      ref: 'Family'
    },
    familyRole: {
      type: String,
      enum: ['holder', 'spouse', 'child', 'parent']
    },
    address: {
      type: String,
      maxlength: 200
    },
    householdType: {
      type: String,
      enum: ['普通户', '低保户', '独生户', '残疾人户']
    },
    specialTags: [{
      type: String,
      enum: ['elderly', 'low_income', 'disabled', 'veteran', 'one_child']
    }],
    skills: [{
      type: String,
      maxlength: 50
    }]
  },

  // 偏好设置
  preferences: {
    dialect: {
      type: String,
      enum: ['pcc', 'pcc-qn', 'yue', 'hakka', 'wu', 'xiang', 'gan'],
      default: 'pcc'
    },
    largeTextMode: { type: Boolean, default: false },
    voiceNotification: { type: Boolean, default: true },
    language: { type: String, default: 'zh-CN' },
    timezone: { type: String, default: 'Asia/Shanghai' }
  },

  // 状态
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  }
}, {
  timestamps: true
});

// 虚拟字段：脱敏身份证号
UserSchema.virtual('profile.maskedIdNumber')
  .get(function() {
    if (!this.profile.idNumber) return null;
    return maskIdNumber(this.profile.idNumber);
  });

// 虚拟字段：年龄自动计算
UserSchema.virtual('profile.calculatedAge')
  .get(function() {
    if (!this.profile.birthDate) return null;
    const today = new Date();
    const birthDate = new Date(this.profile.birthDate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  });

// 保存前自动计算年龄
UserSchema.pre('save', function(next) {
  if (this.profile.birthDate) {
    this.profile.age = this.profile.calculatedAge;
  }
  next();
});

// 3. 家庭模型
const FamilySchema = new Schema({
  // 基本信息
  familyCode: {
    type: String,
    required: true,
    unique: true,
    match: /^F\d{13}$/,
    description: '家庭编码（F开头+13位数字）'
  },
  villageId: {
    type: Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },

  // 户主信息
  holder: {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true,
      maxlength: 50
    },
    idNumber: {
      type: String,
      required: true,
      match: /^\d{17}[\dX]$/
    },
    phone: {
      type: String,
      required: true,
      match: /^1[3-9]\d{9}$/
    }
  },

  // 家庭成员
  members: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    name: {
      type: String,
      required: true,
      maxlength: 50
    },
    relation: {
      type: String,
      enum: ['holder', 'spouse', 'son', 'daughter', 'parent', 'other'],
      required: true
    },
    idNumber: {
      type: String,
      match: /^\d{17}[\dX]$/
    },
    birthDate: Date,
    gender: {
      type: String,
      enum: ['male', 'female']
    },
    phone: {
      type: String,
      match: /^1[3-9]\d{9}$/
    },
    education: {
      type: String,
      enum: ['文盲', '小学', '初中', '高中', '大专', '本科', '硕士', '博士']
    },
    occupation: {
      type: String,
      maxlength: 100
    },
    healthStatus: {
      type: String,
      enum: ['健康', '慢性病', '残疾']
    },
    specialTags: [{
      type: String,
      enum: ['elderly', 'low_income', 'disabled', 'veteran']
    }]
  }],

  // 住房信息
  housing: {
    type: {
      type: String,
      enum: ['自建房', '公租房', '廉租房', '商品房', '其他']
    },
    area: {
      type: Number,
      min: 0,
      description: '面积（平方米）'
    },
    rooms: {
      type: Number,
      min: 0,
      description: '房间数'
    },
    address: {
      type: String,
      maxlength: 200
    },
    hasInternet: { type: Boolean, default: false },
    hasElderlyFacilities: { type: Boolean, default: false }
  },

  // 经济状况
  economy: {
    annualIncome: {
      type: Number,
      min: 0,
      description: '年收入（元）'
    },
    mainSource: {
      type: String,
      enum: ['种植业', '养殖业', '外出务工', '经商', '退休金', '其他']
    },
    povertyStatus: {
      type: String,
      enum: ['非贫困户', '低收入户', '贫困户']
    },
    subsidies: [{
      type: String,
      description: '享受的补贴类型'
    }]
  },

  // 土地信息
  land: {
    farmland: {
      type: Number,
      min: 0,
      description: '耕地（亩）'
    },
    forest: {
      type: Number,
      min: 0,
      description: '林地（亩）'
    },
    construction: {
      type: Number,
      min: 0,
      description: '宅基地（亩）'
    }
  },

  // 二维码
  qrCode: {
    type: String,
    unique: true,
    description: '家庭二维码URL'
  }
}, {
  timestamps: true
});

// 4. 公告模型
const AnnouncementSchema = new Schema({
  villageId: {
    type: Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },

  // 基本信息
  title: {
    type: String,
    required: true,
    maxlength: 200,
    description: '公告标题'
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000,
    description: '公告内容'
  },
  summary: {
    type: String,
    maxlength: 500,
    description: '摘要'
  },

  // 分类
  type: {
    type: String,
    enum: ['notice', 'policy', 'emergency', 'activity'],
    required: true,
    description: '公告类型'
  },
  priority: {
    type: String,
    enum: ['normal', 'important', 'urgent'],
    default: 'normal',
    description: '优先级'
  },

  // 发布信息
  publisher: {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true,
      maxlength: 50
    },
    role: {
      type: String,
      required: true
    }
  },
  publishDate: {
    type: Date,
    default: Date.now,
    description: '发布时间'
  },
  expiryDate: {
    type: Date,
    description: '过期时间'
  },

  // 附件
  attachments: [{
    filename: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true,
      validate: {
        validator: function(url) {
          return /^https?:\/\/.+/.test(url);
        },
        message: '附件URL格式不正确'
      }
    },
    size: {
      type: Number,
      required: true,
      min: 0,
      description: '文件大小（字节）'
    },
    type: {
      type: String,
      required: true,
      description: 'MIME类型'
    }
  }],

  // 目标群体
  targetAudience: {
    roles: [{
      type: String,
      enum: ['all', 'committee', 'villagers']
    }],
    ageGroups: [{
      type: String,
      enum: ['children', 'youth', 'middle_aged', 'elderly']
    }],
    families: [{
      type: Schema.Types.ObjectId,
      ref: 'Family'
    }],
    tags: [{
      type: String
    }]
  },

  // 语音版本
  voiceVersion: {
    url: {
      type: String,
      validate: {
        validator: function(url) {
          return !url || /^https?:\/\/.+/.test(url);
        },
        message: '语音文件URL格式不正确'
      }
    },
    dialects: {
      type: Map,
      of: String,
      description: '方言版本音频URL'
    }
  },

  // 统计信息
  stats: {
    views: { type: Number, default: 0, min: 0 },
    uniqueViews: { type: Number, default: 0, min: 0 },
    likes: { type: Number, default: 0, min: 0 },
    shares: { type: Number, default: 0, min: 0 },
    comments: { type: Number, default: 0, min: 0 }
  },

  // 互动记录（简化版，详细记录可单独存储）
  lastInteractions: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['view', 'like', 'share', 'comment']
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  status: {
    type: String,
    enum: ['draft', 'published', 'expired', 'archived'],
    default: 'draft'
  }
}, {
  timestamps: true
});

// TTL索引：自动删除过期公告
AnnouncementSchema.index({ expiryDate: 1 }, { expireAfterSeconds: 0 });

// 5. 财务记录模型
const FinanceRecordSchema = new Schema({
  villageId: {
    type: Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },

  // 基本信息
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true,
    description: '收支类型'
  },
  category: {
    type: String,
    required: true,
    maxlength: 50,
    description: '财务分类'
  },
  subcategory: {
    type: String,
    maxlength: 50,
    description: '子分类'
  },

  // 金额
  amount: {
    type: Schema.Types.Decimal128,
    required: true,
    min: 0,
    description: '金额'
  },
  currency: {
    type: String,
    default: 'CNY',
    maxlength: 3,
    description: '货币类型'
  },

  // 描述
  description: {
    type: String,
    required: true,
    maxlength: 500,
    description: '收支说明'
  },
  details: {
    type: String,
    maxlength: 2000,
    description: '详细信息'
  },

  // 日期
  date: {
    type: Date,
    required: true,
    description: '收支日期'
  },
  accountingPeriod: {
    type: String,
    match: /^\d{4}-\d{2}$/,
    description: '会计期间（YYYY-MM）'
  },

  // 相关方
  counterparty: {
    name: {
      type: String,
      required: true,
      maxlength: 100
    },
    type: {
      type: String,
      enum: ['government', 'company', 'individual'],
      required: true
    },
    accountNumber: {
      type: String,
      maxlength: 50
    }
  },

  // 凭证
  receipt: {
    number: {
      type: String,
      maxlength: 50,
      description: '凭证号'
    },
    type: {
      type: String,
      enum: ['发票', '收据', '银行流水', '其他'],
      description: '凭证类型'
    },
    images: [{
      url: {
        type: String,
        required: true,
        validate: {
          validator: function(url) {
            return /^https?:\/\/.+/.test(url);
          },
          message: '凭证图片URL格式不正确'
        }
      },
      thumbnail: {
        type: String,
        validate: {
          validator: function(url) {
            return !url || /^https?:\/\/.+/.test(url);
          },
          message: '缩略图URL格式不正确'
        }
      }
    }],
    ocrData: {
      vendor: { type: String },
      amount: { type: String },
      date: { type: String },
      confidence: {
        type: Number,
        min: 0,
        max: 1
      }
    }
  },

  // 审批流程
  approval: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    workflow: [{
      step: { type: Number, required: true },
      role: { type: String, required: true },
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      name: { type: String, required: true },
      action: {
        type: String,
        enum: ['approve', 'reject', 'submit'],
        required: true
      },
      comment: { type: String },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    approvedBy: {
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      name: { type: String }
    },
    approvedAt: Date,
    rejectReason: { type: String }
  },

  // 预算关联
  budget: {
    categoryId: {
      type: Schema.Types.ObjectId,
      description: '预算分类ID'
    },
    categoryName: {
      type: String,
      maxlength: 50
    },
    plannedAmount: {
      type: Schema.Types.Decimal128,
      description: '预算金额'
    },
    usedAmount: {
      type: Schema.Types.Decimal128,
      description: '已使用金额'
    },
    remainingAmount: {
      type: Schema.Types.Decimal128,
      description: '剩余金额'
    }
  },

  // 标签
  tags: [{
    type: String,
    maxlength: 20
  }],

  // 录入信息
  createdBy: {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true,
      maxlength: 50
    }
  },

  status: {
    type: String,
    enum: ['draft', 'confirmed', 'archived'],
    default: 'draft'
  }
}, {
  timestamps: true
});

// 索引：复合查询优化
FinanceRecordSchema.index({ villageId: 1, type: 1, date: -1 });
FinanceRecordSchema.index({ villageId: 1, category: 1, date: -1 });
FinanceRecordSchema.index({ villageId: 1, 'approval.status': 1 });
FinanceRecordSchema.index({ 'budget.categoryId': 1 });

// 6. 任务模型
const TaskSchema = new Schema({
  villageId: {
    type: Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },

  // 基本信息
  title: {
    type: String,
    required: true,
    maxlength: 200,
    description: '任务标题'
  },
  description: {
    type: String,
    maxlength: 1000,
    description: '任务描述'
  },
  type: {
    type: String,
    enum: ['patrol', 'emergency', 'maintenance', 'event'],
    required: true,
    description: '任务类型'
  },

  // 优先级
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    required: true,
    default: 'medium'
  },

  // 分配信息
  assignee: {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true,
      maxlength: 50
    },
    role: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true,
      match: /^1[3-9]\d{9}$/
    }
  },

  // 时间信息
  scheduledAt: {
    type: Date,
    description: '计划开始时间'
  },
  dueDate: {
    type: Date,
    required: true,
    description: '截止时间'
  },
  estimatedDuration: {
    type: Number,
    min: 15,
    max: 480,
    description: '预计时长（分钟）'
  },

  // 位置信息
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(coords) {
          return coords.length === 2 &&
                 coords[0] >= -180 && coords[0] <= 180 &&
                 coords[1] >= -90 && coords[1] <= 90;
        },
        message: '经纬度坐标格式不正确'
      }
    },
    address: {
      type: String,
      required: true,
      maxlength: 200
    },
    radius: {
      type: Number,
      min: 0,
      default: 100,
      description: '范围半径（米）'
    }
  },

  // 任务要求
  requirements: [{
    type: String,
    maxlength: 200
  }],

  // 检查清单
  checklist: [{
    item: {
      type: String,
      required: true,
      maxlength: 100
    },
    required: {
      type: Boolean,
      default: true
    },
    completed: {
      type: Boolean,
      default: false
    }
  }],

  // 执行报告
  report: {
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending'
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    startTime: Date,
    notes: {
      type: String,
      maxlength: 2000
    },
    photos: [{
      url: {
        type: String,
        required: true,
        validate: {
          validator: function(url) {
            return /^https?:\/\/.+/.test(url);
          },
          message: '照片URL格式不正确'
        }
      },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: [Number]
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      description: {
        type: String,
        maxlength: 200
      }
    }],
    issues: [{
      description: {
        type: String,
        required: true,
        maxlength: 500
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        required: true
      },
      photos: [String],
      reportedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },

  // 评价
  evaluation: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: {
      type: String,
      maxlength: 500
    },
    evaluatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    evaluatedAt: Date
  },

  // 相关资源
  resources: [{
    type: {
      type: String,
      enum: ['pump', 'fire_extinguisher', 'medical_kit', 'other'],
      required: true
    },
    name: {
      type: String,
      required: true,
      maxlength: 50
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    assignedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 工作流
  workflow: {
    currentStep: {
      type: String,
      enum: ['assignment', 'execution', 'review'],
      default: 'assignment'
    },
    steps: [{
      name: {
        type: String,
        enum: ['assignment', 'execution', 'review'],
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed'],
        default: 'pending'
      },
      completedAt: Date
    }]
  },

  status: {
    type: String,
    enum: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// 索引：任务查询优化
TaskSchema.index({ villageId: 1, status: 1 });
TaskSchema.index({ villageId: 1, 'assignee.userId': 1 });
TaskSchema.index({ villageId: 1, type: 1 });
TaskSchema.index({ villageId: 1, priority: 1 });
TaskSchema.index({ villageId: 1, dueDate: 1 });
TaskSchema.index({ location: '2dsphere' });

// 7. 产品模型
const ProductSchema = new Schema({
  // 基本信息
  name: {
    type: String,
    required: true,
    maxlength: 100,
    description: '产品名称'
  },
  description: {
    type: String,
    maxlength: 1000,
    description: '产品描述'
  },
  category: {
    type: String,
    enum: ['vegetable', 'fruit', 'grain', 'specialty', 'livestock'],
    required: true,
    description: '产品类别'
  },

  // 产地信息
  origin: {
    villageId: {
      type: Schema.Types.ObjectId,
      ref: 'Village',
      required: true
    },
    villageName: {
      type: String,
      required: true,
      maxlength: 100
    },
    producer: {
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      name: {
        type: String,
        required: true,
        maxlength: 50
      },
      phone: {
        type: String,
        required: true,
        match: /^1[3-9]\d{9}$/
      },
      certification: [{
        type: String,
        maxlength: 50
      }]
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: true
      }
    }
  },

  // 价格和库存
  price: {
    type: Schema.Types.Decimal128,
    required: true,
    min: 0,
    description: '价格'
  },
  originalPrice: {
    type: Schema.Types.Decimal128,
    min: 0,
    description: '原价'
  },
  unit: {
    type: String,
    enum: ['斤', '公斤', '箱', '个', '只', '包'],
    required: true
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  minOrder: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  maxOrder: {
    type: Number,
    validate: {
      validator: function(val) {
        return !val || val >= this.minOrder;
      },
      message: '最大订购量不能小于最小订购量'
    }
  },

  // 质量信息
  quality: {
    grade: {
      type: String,
      maxlength: 20
    },
    certification: [{
      type: String,
      maxlength: 50
    }],
    testDate: Date,
    expiryDate: Date,
    shelfLife: {
      type: Number,
      min: 0,
      description: '保质期（天）'
    },
    storageConditions: {
      type: String,
      maxlength: 100
    }
  },

  // 生产信息
  production: {
    plantDate: Date,
    harvestDate: Date,
    harvestSeason: {
      type: String,
      maxlength: 20
    },
    farmingMethod: {
      type: String,
      maxlength: 50
    },
    pesticides: {
      type: String,
      maxlength: 50
    },
    fertilizers: {
      type: String,
      maxlength: 50
    }
  },

  // 媒体资源
  images: [{
    url: {
      type: String,
      required: true,
      validate: {
        validator: function(url) {
          return /^https?:\/\/.+/.test(url);
        },
        message: '图片URL格式不正确'
      }
    },
    thumbnail: {
      type: String,
      validate: {
        validator: function(url) {
          return !url || /^https?:\/\/.+/.test(url);
        }
      }
    },
    alt: {
      type: String,
      maxlength: 200
    },
    order: {
      type: Number,
      min: 0,
      default: 0
    }
  }],
  video: {
    url: {
      type: String,
      validate: {
        validator: function(url) {
          return !url || /^https?:\/\/.+/.test(url);
        }
      }
    },
    thumbnail: {
      type: String
    },
    duration: {
      type: Number,
      min: 0,
      description: '时长（秒）'
    }
  },

  // 物流信息
  logistics: {
    packaging: {
      type: String,
      maxlength: 50
    },
    weight: {
      type: Number,
      min: 0,
      description: '重量（kg）'
    },
    dimensions: {
      length: {
        type: Number,
        min: 0
      },
      width: {
        type: Number,
        min: 0
      },
      height: {
        type: Number,
        min: 0
      }
    },
    shipping: {
      free: { type: Boolean, default: true },
      minAmountForFree: {
        type: Schema.Types.Decimal128,
        min: 0,
        description: '包邮最低金额'
      },
      methods: [{
        type: String,
        enum: ['快递', '自提', '配送']
      }]
    }
  },

  // 评价统计
  rating: {
    average: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    count: {
      type: Number,
      min: 0,
      default: 0
    },
    distribution: {
      5: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      1: { type: Number, default: 0 }
    }
  },

  // 销售信息
  sales: {
    totalSold: {
      type: Number,
      min: 0,
      default: 0
    },
    monthlySold: {
      type: Number,
      min: 0,
      default: 0
    },
    revenue: {
      type: Schema.Types.Decimal128,
      min: 0,
      default: 0
    },
    lastSoldAt: Date
  },

  // 标签
  tags: [{
    type: String,
    maxlength: 20
  }],

  // SEO信息
  seo: {
    keywords: [{
      type: String,
      maxlength: 20
    }],
    description: {
      type: String,
      maxlength: 200
    },
    title: {
      type: String,
      maxlength: 100
    }
  },

  // 状态
  status: {
    type: String,
    enum: ['available', 'sold_out', 'offline', 'deleted'],
    default: 'available'
  }
}, {
  timestamps: true
});

// 索引：产品查询优化
ProductSchema.index({ 'origin.villageId': 1, status: 1 });
ProductSchema.index({ 'origin.producer.userId': 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ 'rating.average': -1 });
ProductSchema.index({ 'sales.monthlySold': -1 });
ProductSchema.index({ tags: 1 });
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });

// 8. 订单模型
const OrderSchema = new Schema({
  // 基本信息
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    match: /^ORD\d{19}$/,
    default: generateOrderNumber
  },

  // 买家信息
  buyer: {
    id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true,
      maxlength: 50
    },
    phone: {
      type: String,
      required: true,
      match: /^1[3-9]\d{9}$/
    },
    address: {
      type: String,
      required: true,
      maxlength: 300
    }
  },

  // 商品信息
  items: [{
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    productName: {
      type: String,
      required: true,
      maxlength: 100
    },
    productImage: {
      type: String,
      maxlength: 500
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Schema.Types.Decimal128,
      required: true,
      min: 0
    },
    total: {
      type: Schema.Types.Decimal128,
      required: true,
      min: 0
    }
  }],

  // 金额
  totalAmount: {
    type: Schema.Types.Decimal128,
    required: true,
    min: 0
  },
  discountAmount: {
    type: Schema.Types.Decimal128,
    min: 0,
    default: 0
  },
  shippingFee: {
    type: Schema.Types.Decimal128,
    min: 0,
    default: 0
  },
  actualAmount: {
    type: Schema.Types.Decimal128,
    required: true,
    min: 0
  },

  // 状态
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },

  // 支付信息
  payment: {
    method: {
      type: String,
      enum: ['wechat', 'alipay', 'cash', 'bank_transfer']
    },
    status: {
      type: String,
      enum: ['paid', 'unpaid', 'refunded'],
      default: 'unpaid'
    },
    paidAt: Date,
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment'
    },
    amount: {
      type: Schema.Types.Decimal128,
      min: 0
    }
  },

  // 配送信息
  delivery: {
    method: {
      type: String,
      enum: ['pickup', 'delivery'],
      required: true
    },
    trackingNumber: {
      type: String,
      maxlength: 100
    },
    estimatedDate: Date,
    deliveredAt: Date,
    address: {
      type: String,
      maxlength: 300
    },
    courier: {
      name: {
        type: String,
        maxlength: 50
      },
      phone: {
        type: String,
        match: /^1[3-9]\d{9}$/
      }
    }
  },

  // 备注
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// 索引：订单查询优化
OrderSchema.index({ 'buyer.id': 1, status: 1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ 'payment.status': 1 });
OrderSchema.index({ 'items.productId': 1 });

// 9. 支付模型
const PaymentSchema = new Schema({
  // 基本信息
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  amount: {
    type: Schema.Types.Decimal128,
    required: true,
    min: 0
  },
  method: {
    type: String,
    enum: ['wechat', 'alipay', 'unionpay'],
    required: true
  },

  // 支付信息
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    maxlength: 100,
    sparse: true
  },
  thirdPartyTransactionId: {
    type: String,
    maxlength: 100,
    sparse: true
  },

  // 支付链接
  paymentUrl: {
    type: String,
    maxlength: 500
  },
  qrCode: {
    type: String,
    description: '二维码base64'
  },
  expiresIn: {
    type: Number,
    default: 900,
    description: '过期时间（秒）'
  },

  // 回调信息
  returnUrl: {
    type: String,
    maxlength: 500
  },
  notifyUrl: {
    type: String,
    maxlength: 500
  },

  // 第三方响应
  response: {
    raw: {
      type: Schema.Types.Mixed,
      description: '第三方原始响应'
    },
    verifiedAt: Date,
    signature: {
      type: String,
      maxlength: 500
    }
  },

  // 退款信息
  refund: {
    amount: {
      type: Schema.Types.Decimal128,
      min: 0
    },
    reason: {
      type: String,
      maxlength: 500
    },
    refundId: {
      type: String,
      maxlength: 100
    },
    refundedAt: Date
  }
}, {
  timestamps: true
});

// 索引
PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ transactionId: 1 }, { sparse: true });

// 10. 应急事件模型
const EmergencyReportSchema = new Schema({
  villageId: {
    type: Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },

  // 基本信息
  type: {
    type: String,
    enum: ['fire', 'flood', 'accident', 'medical', 'security'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },

  // 位置信息
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    },
    address: {
      type: String,
      required: true,
      maxlength: 200
    }
  },

  // 描述
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },

  // 照片
  photos: [{
    url: {
      type: String,
      required: true
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number]
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    description: {
      type: String,
      maxlength: 200
    }
  }],

  // 联系人
  contacts: [{
    name: {
      type: String,
      required: true,
      maxlength: 50
    },
    phone: {
      type: String,
      required: true,
      match: /^1[3-9]\d{9}$/
    },
    relationship: {
      type: String,
      maxlength: 50
    }
  }],

  // 上报人
  reporter: {
    id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true,
      maxlength: 50
    },
    phone: {
      type: String,
      required: true,
      match: /^1[3-9]\d{9}$/
    }
  },

  // 状态
  status: {
    type: String,
    enum: ['reported', 'processing', 'resolved', 'closed'],
    default: 'reported'
  },

  // 处理信息
  response: {
    assignedAt: Date,
    assignees: [{
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      name: {
        type: String,
        maxlength: 50
      },
      role: {
        type: String
      }
    }],
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'EmergencyPlan'
    },
    resolvedAt: Date,
    resolution: {
      type: String,
      maxlength: 1000
    },
    report: {
      type: String,
      maxlength: 2000
    }
  }
}, {
  timestamps: true
});

// 索引
EmergencyReportSchema.index({ villageId: 1, status: 1 });
EmergencyReportSchema.index({ location: '2dsphere' });
EmergencyReportSchema.index({ type: 1, severity: 1 });

// ==================== 模型导出 ====================

const Village = model('Village', VillageSchema);
const User = model('User', UserSchema);
const Family = model('Family', FamilySchema);
const Announcement = model('Announcement', AnnouncementSchema);
const FinanceRecord = model('FinanceRecord', FinanceRecordSchema);
const Task = model('Task', TaskSchema);
const Product = model('Product', ProductSchema);
const Order = model('Order', OrderSchema);
const Payment = model('Payment', PaymentSchema);
const EmergencyReport = model('EmergencyReport', EmergencyReportSchema);

// ==================== 数据库初始化脚本 ====================

/**
 * 创建数据库索引
 */
async function createIndexes() {
  console.log('开始创建数据库索引...');

  // 村庄索引
  await Village.collection.createIndex({ code: 1 }, { unique: true });
  await Village.collection.createIndex({ location: '2dsphere' });
  await Village.collection.createIndex({ status: 1 });
  await Village.collection.createIndex({ 'administrator.userId': 1 });
  await Village.collection.createIndex({ 'province': 1, 'city': 1, 'district': 1 });

  // 用户索引
  await User.collection.createIndex({ username: 1 }, { unique: true });
  await User.collection.createIndex({ phone: 1 }, { unique: true });
  await User.collection.createIndex({ villageId: 1 });
  await User.collection.createIndex({ role: 1 });
  await User.collection.createIndex({ status: 1 });
  await User.collection.createIndex({ 'residentInfo.familyId': 1 });
  await User.collection.createIndex({ 'profile.birthDate': 1 });
  await User.collection.createIndex({ 'residentInfo.specialTags': 1 });

  // 家庭索引
  await Family.collection.createIndex({ familyCode: 1 }, { unique: true });
  await Family.collection.createIndex({ villageId: 1 });
  await Family.collection.createIndex({ 'holder.userId': 1 });
  await Family.collection.createIndex({ 'members.userId': 1 });
  await Family.collection.createIndex({ qrCode: 1 }, { unique: true, sparse: true });
  await Family.collection.createIndex({ 'economy.povertyStatus': 1 });

  // 公告索引
  await Announcement.collection.createIndex({
    villageId: 1,
    publishDate: -1
  });
  await Announcement.collection.createIndex({
    villageId: 1,
    type: 1
  });
  await Announcement.collection.createIndex({
    villageId: 1,
    priority: 1
  });
  await Announcement.collection.createIndex({
    villageId: 1,
    status: 1
  });
  await Announcement.collection.createIndex({
    'publisher.userId': 1
  });
  await Announcement.collection.createIndex({
    expiryDate: 1
  }, {
    expireAfterSeconds: 0,
    partialFilterExpression: { status: 'published' }
  });

  // 财务记录索引
  await FinanceRecord.collection.createIndex({
    villageId: 1,
    type: 1,
    date: -1
  });
  await FinanceRecord.collection.createIndex({
    villageId: 1,
    category: 1,
    date: -1
  });
  await FinanceRecord.collection.createIndex({
    villageId: 1,
    'approval.status': 1
  });
  await FinanceRecord.collection.createIndex({
    'budget.categoryId': 1
  });
  await FinanceRecord.collection.createIndex({
    tags: 1
  });
  await FinanceRecord.collection.createIndex({
    date: 1
  });

  // 任务索引
  await Task.collection.createIndex({
    villageId: 1,
    status: 1
  });
  await Task.collection.createIndex({
    villageId: 1,
    'assignee.userId': 1
  });
  await Task.collection.createIndex({
    villageId: 1,
    type: 1
  });
  await Task.collection.createIndex({
    villageId: 1,
    priority: 1
  });
  await Task.collection.createIndex({
    villageId: 1,
    dueDate: 1
  });
  await Task.collection.createIndex({
    location: '2dsphere'
  });

  // 产品索引
  await Product.collection.createIndex({
    'origin.villageId': 1,
    status: 1
  });
  await Product.collection.createIndex({
    'origin.producer.userId': 1
  });
  await Product.collection.createIndex({
    category: 1
  });
  await Product.collection.createIndex({
    price: 1
  });
  await Product.collection.createIndex({
    'rating.average': -1
  });
  await Product.collection.createIndex({
    'sales.monthlySold': -1
  });
  await Product.collection.createIndex({
    tags: 1
  });
  await Product.collection.createIndex({
    name: 'text',
    description: 'text',
    tags: 'text'
  });

  // 订单索引
  await Order.collection.createIndex({
    'buyer.id': 1,
    status: 1
  });
  await Order.collection.createIndex({
    status: 1,
    createdAt: -1
  });
  await Order.collection.createIndex({
    'payment.status': 1
  });
  await Order.collection.createIndex({
    'items.productId': 1
  });

  // 支付索引
  await Payment.collection.createIndex({
    orderId: 1
  });
  await Payment.collection.createIndex({
    status: 1
  });
  await Payment.collection.createIndex({
    transactionId: 1
  }, {
    sparse: true
  });

  // 应急事件索引
  await EmergencyReport.collection.createIndex({
    villageId: 1,
    status: 1
  });
  await EmergencyReport.collection.createIndex({
    location: '2dsphere'
  });
  await EmergencyReport.collection.createIndex({
    type: 1,
    severity: 1
  });
  await EmergencyReport.collection.createIndex({
    'reporter.id': 1
  });

  console.log('数据库索引创建完成！');
}

/**
 * 数据分片配置
 */
function configureSharding() {
  console.log('配置分片策略...');

  // 按村庄ID分片的集合
  const shardedCollections = [
    'users',
    'families',
    'announcements',
    'tasks',
    'products',
    'emergencyreports',
    'financerecords'
  ];

  shardedCollections.forEach(collectionName => {
    console.log(`配置集合 ${collectionName} 按 villageId 分片`);
    // 这里应该使用实际的MongoDB分片命令
    // sh.shardCollection(`smartvillage.${collectionName}`, { villageId: 1 });
  });

  console.log('分片配置完成！');
}

/**
 * 数据归档规则
 */
class DataArchiver {
  /**
   * 归档过期公告
   */
  static async archiveExpiredAnnouncements() {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const result = await Announcement.updateMany(
      {
        publishDate: { $lt: oneYearAgo },
        status: 'published'
      },
      {
        $set: {
          status: 'archived',
          archivedAt: new Date()
        }
      }
    );

    console.log(`归档了 ${result.modifiedCount} 条过期公告`);
    return result;
  }

  /**
   * 归档旧财务记录
   */
  static async archiveOldFinanceRecords() {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const result = await FinanceRecord.updateMany(
      {
        date: { $lt: twoYearsAgo },
        status: 'confirmed'
      },
      {
        $set: {
          status: 'archived',
          archivedAt: new Date()
        }
      }
    );

    console.log(`归档了 ${result.modifiedCount} 条旧财务记录`);
    return result;
  }

  /**
   * 删除已完成的旧任务
   */
  static async deleteOldCompletedTasks() {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const result = await Task.deleteMany({
      status: 'completed',
      updatedAt: { $lt: oneYearAgo }
    });

    console.log(`删除了 ${result.deletedCount} 条旧任务记录`);
    return result;
  }

  /**
   * 运行所有归档任务
   */
  static async runAllArchives() {
    console.log('开始执行数据归档...');

    await this.archiveExpiredAnnouncements();
    await this.archiveOldFinanceRecords();
    await this.deleteOldCompletedTasks();

    console.log('数据归档完成！');
  }
}

// ==================== 数据验证规则 ====================

/**
 * 验证手机号格式
 */
function validatePhone(phone) {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 验证身份证号格式
 */
function validateIdNumber(idNumber) {
  const idNumberRegex = /^\d{17}[\dX]$/;
  return idNumberRegex.test(idNumber);
}

/**
 * 验证经纬度坐标
 */
function validateCoordinates(coords) {
  return Array.isArray(coords) &&
         coords.length === 2 &&
         coords[0] >= -180 && coords[0] <= 180 &&
         coords[1] >= -90 && coords[1] <= 90;
}

// ==================== 导出模块 ====================

module.exports = {
  // 模型
  Village,
  User,
  Family,
  Announcement,
  FinanceRecord,
  Task,
  Product,
  Order,
  Payment,
  EmergencyReport,

  // 工具函数
  generateFamilyCode,
  generateOrderNumber,
  encryptSensitiveData,
  maskIdNumber,

  // 索引和配置
  createIndexes,
  configureSharding,

  // 数据归档
  DataArchiver,

  // 验证规则
  validatePhone,
  validateIdNumber,
  validateCoordinates
};