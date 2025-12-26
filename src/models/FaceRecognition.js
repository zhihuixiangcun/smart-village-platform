/**
 * 人脸识别系统数据库模型
 * 支持安全的人脸特征存储、亲属代理和审计日志
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// 人脸特征模板Schema
const faceFeatureSchema = new mongoose.Schema({
  // 用户关联
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true,
    index: true
  },

  // 村庄关联
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 人脸特征数据（加密存储）
  faceFeatures: {
    // 不可逆特征哈希（用于快速比对）
    featureHash: {
      type: String,
      required: true,
      index: true
    },

    // 可逆特征向量（AES-256加密）
    encryptedFeatures: {
      type: String,
      required: true
    },

    // 特征加密密钥ID
    keyId: {
      type: String,
      required: true
    },

    // 特征提取算法版本
    algorithmVersion: {
      type: String,
      required: true,
      default: 'v1.0'
    },

    // 特征质量评分
    qualityScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    }
  },

  // 注册元数据
  registration: {
    // 注册时间
    timestamp: {
      type: Date,
      default: Date.now,
      required: true
    },

    // 注册设备信息
    deviceInfo: {
      userAgent: String,
      ipAddress: String,
      deviceId: String,
      platform: String
    },

    // 注册时活体检测结果
    liveness检测结果: {
      isLive: {
        type: Boolean,
        required: true
      },
      confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 100
      },
      detectionMethods: [String], // 检测方法：'blink', 'mouth', 'head', 'infrared'
      qualityMetrics: {
        brightness: Number,
        contrast: Number,
        sharpness: Number,
        faceSize: Number
      }
    },

    // 操作员信息（如果是管理员注册）
    operatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // 使用状态
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'deleted'],
    default: 'active'
  },

  // 最后更新时间
  lastUpdated: {
    type: Date,
    default: Date.now
  },

  // 版本号（用于特征更新）
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  collection: 'facerecognition_features'
});

// 亲属代理关系Schema
const familyRelationSchema = new mongoose.Schema({
  // 主要用户（被代理者）
  principalUserId: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true,
    index: true
  },

  // 代理人（代理者）
  agentUserId: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true,
    index: true
  },

  // 关系类型
  relationType: {
    type: String,
    enum: [
      'spouse',      // 配偶
      'parent',      // 父母
      'child',       // 子女
      'sibling',     // 兄弟姐妹
      'grandparent', // 祖父母
      'grandchild',  // 孙子女
      'guardian',    // 监护人
      'other'        // 其他
    ],
    required: true
  },

  // 关系证明
  relationProof: {
    // 证明文件路径
    documents: [String],

    // 审核状态
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'requires_review'],
      default: 'pending'
    },

    // 审核人
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    // 审核时间
    verifiedAt: Date,

    // 审核备注
    verificationNote: String
  },

  // 代理权限
  permissions: {
    // 可以查询的信息类型
    queryPermissions: [{
      type: String,
      enum: [
        'basic_info',      // 基本信息
        'contact_info',    // 联系方式
        'health_info',     // 健康信息
        'financial_info',  // 财务信息
        'government_info', // 政务信息
        'family_info'      // 家庭信息
      ]
    }],

    // 可以执行的操作
    actionPermissions: [{
      type: String,
      enum: [
        'view_info',           // 查看信息
        'update_info',         // 更新信息
        'submit_application',  // 提交申请
        'approve_application', // 审批申请
        'view_documents',      // 查看文档
        'sign_documents'       // 签署文档
      ]
    }],

    // 权限限制
    restrictions: {
      // 时间限制
      timeRestrictions: {
        startDate: Date,
        endDate: Date,
        allowedHours: {
          start: String, // "08:00"
          end: String    // "18:00"
        },
        allowedDays: [Number] // [1,2,3,4,5] 周一到周五
      },

      // 操作频率限制
      operationLimits: {
        dailyLimit: Number,
        weeklyLimit: Number,
        monthlyLimit: Number
      },

      // 敏感操作需要额外验证
      sensitiveOperationsRequireMFA: {
        type: Boolean,
        default: true
      }
    }
  },

  // 代理状态
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'expired'],
    default: 'active'
  },

  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  },

  // 过期时间
  expiresAt: Date,

  // 创建者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'facerecognition_family_relations'
});

// 人脸识别操作审计日志Schema
const faceRecognitionAuditSchema = new mongoose.Schema({
  // 操作类型
  operationType: {
    type: String,
    enum: [
      'face_register',        // 人脸注册
      'face_verify',          // 人脸验证
      'face_identify',        // 人脸识别
      'face_update',          // 人脸更新
      'face_delete',          // 人脸删除
      'relation_create',      // 创建代理关系
      'relation_update',      // 更新代理关系
      'relation_delete',      // 删除代理关系
      'permission_grant',     // 授予权限
      'permission_revoke',    // 撤销权限
      'data_export',          // 数据导出
      'system_access'         // 系统访问
    ],
    required: true
  },

  // 操作用户
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true
  },

  // 目标用户（如果是代理操作）
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // 村庄ID
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },

  // 操作结果
  result: {
    type: String,
    enum: ['success', 'failure', 'partial'],
    required: true
  },

  // 操作详情
  details: {
    // 请求参数（脱敏）
    requestParams: {
      type: mongoose.Schema.Types.Mixed,
      select: false // 敏感信息，默认不返回
    },

    // 响应结果（脱敏）
    responseResult: {
      type: mongoose.Schema.Types.Mixed,
      select: false
    },

    // 错误信息
    errorMessage: String,

    // 错误代码
    errorCode: String,

    // 处理时间（毫秒）
    processingTime: Number,

    // 置信度分数（用于识别操作）
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100
    }
  },

  // 设备信息
  deviceInfo: {
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: String,
    deviceId: String,
    platform: String,
    browser: String,
    location: {
      country: String,
      province: String,
      city: String,
      coordinates: [Number] // [longitude, latitude]
    }
  },

  // 安全相关
  security: {
    // 是否为异常操作
    isAnomalous: {
      type: Boolean,
      default: false
    },

    // 异常类型
    anomalyTypes: [String],

    // 安全评分
    securityScore: {
      type: Number,
      min: 0,
      max: 100
    },

    // 风险等级
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },

    // 是否触发告警
    triggeredAlert: {
      type: Boolean,
      default: false
    }
  },

  // 操作时间
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },

  // 会话ID
  sessionId: String,

  // 请求ID
  requestId: {
    type: String,
    required: true,
    unique: true
  },

  // 关联的代理关系ID（如果是代理操作）
  relationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyRelation'
  }
}, {
  timestamps: true,
  collection: 'facerecognition_audit_logs'
});

// 人脸识别配置Schema
const faceRecognitionConfigSchema = new mongoose.Schema({
  // 村村配置
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    unique: true
  },

  // 识别阈值配置
  thresholds: {
    // 验证阈值（1:1比对）
    verificationThreshold: {
      type: Number,
      default: 0.8,
      min: 0,
      max: 1
    },

    // 识别阈值（1:N比对）
    identificationThreshold: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 1
    },

    // 活体检测阈值
    livenessThreshold: {
      type: Number,
      default: 0.85,
      min: 0,
      max: 1
    }
  },

  // 安全配置
  security: {
    // 最大重试次数
    maxRetryAttempts: {
      type: Number,
      default: 3
    },

    // 锁定时间（分钟）
    lockoutDuration: {
      type: Number,
      default: 30
    },

    // 会话超时时间（分钟）
    sessionTimeout: {
      type: Number,
      default: 15
    },

    // 是否启用多因子认证
    enableMFA: {
      type: Boolean,
      default: true
    },

    // 敏感操作需要多因子认证
    sensitiveOperationsRequireMFA: {
      type: Boolean,
      default: true
    }
  },

  // 活体检测配置
  livenessDetection: {
    // 启用的检测方法
    enabledMethods: [{
      type: String,
      enum: ['blink', 'mouth', 'head', 'infrared', 'thermal'],
      default: ['blink', 'mouth', 'head']
    }],

    // 动作序列配置
    actionSequence: {
      type: String,
      enum: ['random', 'fixed', 'adaptive'],
      default: 'random'
    },

    // 动作超时时间（秒）
    actionTimeout: {
      type: Number,
      default: 10
    }
  },

  // 数据保留策略
  dataRetention: {
    // 审计日志保留天数
    auditLogRetentionDays: {
      type: Number,
      default: 2555 // 7年
    },

    // 特征数据保留天数
    featureDataRetentionDays: {
      type: Number,
      default: 3650 // 10年
    },

    // 自动删除过期数据
    autoCleanupEnabled: {
      type: Boolean,
      default: true
    }
  },

  // 合规配置
  compliance: {
    // 是否启用数据最小化
    enableDataMinimization: {
      type: Boolean,
      default: true
    },

    // 是否需要用户明确同意
    requireExplicitConsent: {
      type: Boolean,
      default: true
    },

    // 同意书版本
    consentVersion: {
      type: String,
      default: '1.0'
    },

    // 是否启用匿名化
    enableAnonymization: {
      type: Boolean,
      default: false
    }
  },

  // 更新时间
  lastUpdated: {
    type: Date,
    default: Date.now
  },

  // 更新者
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'facerecognition_configs'
});

// 索引创建
faceFeatureSchema.index({ userId: 1, villageId: 1 });
faceFeatureSchema.index({ featureHash: 1 });
faceFeatureSchema.index({ status: 1 });
faceFeatureSchema.index({ 'registration.timestamp': -1 });

familyRelationSchema.index({ principalUserId: 1, agentUserId: 1 });
familyRelationSchema.index({ principalUserId: 1, status: 1 });
familyRelationSchema.index({ agentUserId: 1, status: 1 });
familyRelationSchema.index({ 'relationProof.verificationStatus': 1 });

faceRecognitionAuditSchema.index({ userId: 1, timestamp: -1 });
faceRecognitionAuditSchema.index({ villageId: 1, timestamp: -1 });
faceRecognitionAuditSchema.index({ operationType: 1, timestamp: -1 });
faceRecognitionAuditSchema.index({ 'security.isAnomalous': 1, timestamp: -1 });
faceRecognitionAuditSchema.index({ requestId: 1 }, { unique: true });

// 中间件
faceFeatureSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

faceRecognitionAuditSchema.pre('save', function(next) {
  if (!this.requestId) {
    this.requestId = crypto.randomUUID();
  }
  next();
});

// 静态方法
faceFeatureSchema.statics = {
  // 加密人脸特征
  async encryptFeatures(features, keyId) {
    const key = await crypto.promises.scryptSync(process.env.FACE_FEATURE_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', key);

    let encrypted = cipher.update(JSON.stringify(features), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encryptedFeatures: encrypted + ':' + authTag.toString('hex') + ':' + iv.toString('hex'),
      keyId: keyId || crypto.randomUUID()
    };
  },

  // 解密人脸特征
  async decryptFeatures(encryptedData, keyId) {
    const [encrypted, authTagHex, ivHex] = encryptedData.split(':');
    const key = await crypto.promises.scryptSync(process.env.FACE_FEATURE_KEY, 'salt', 32);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipher('aes-256-gcm', key);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  },

  // 生成特征哈希
  generateFeatureHash(features) {
    return crypto.createHash('sha256')
      .update(JSON.stringify(features))
      .digest('hex');
  }
};

// 实例方法
faceFeatureSchema.methods = {
  // 验证特征质量
  isFeatureValid() {
    return this.faceFeatures.qualityScore >= 70; // 最低质量要求
  },

  // 更新特征数据
  async updateFeatures(newFeatures, keyId) {
    const featureHash = this.constructor.generateFeatureHash(newFeatures);
    const { encryptedFeatures, keyId: newKeyId } = await this.constructor.encryptFeatures(newFeatures, keyId);

    this.faceFeatures.featureHash = featureHash;
    this.faceFeatures.encryptedFeatures = encryptedFeatures;
    this.faceFeatures.keyId = newKeyId;
    this.faceFeatures.qualityScore = this.calculateQualityScore(newFeatures);
    this.version += 1;
    this.lastUpdated = new Date();

    return this.save();
  },

  // 计算特征质量分数
  calculateQualityScore(features) {
    // 简化的质量评分算法，实际应用中需要更复杂的计算
    const featureLength = features.length;
    const variance = this.calculateVariance(features);

    let score = 0;

    // 特征长度评分（40%）
    score += Math.min(featureLength / 512, 1) * 40;

    // 特征方差评分（30%）
    score += Math.min(variance / 0.1, 1) * 30;

    // 基础评分（30%）
    score += 30;

    return Math.round(score);
  },

  // 计算特征方差
  calculateVariance(features) {
    const mean = features.reduce((a, b) => a + b, 0) / features.length;
    const variance = features.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / features.length;
    return variance;
  }
};

// 导出模型
const FaceFeature = mongoose.model('FaceFeature', faceFeatureSchema);
const FamilyRelation = mongoose.model('FamilyRelation', familyRelationSchema);
const FaceRecognitionAudit = mongoose.model('FaceRecognitionAudit', faceRecognitionAuditSchema);
const FaceRecognitionConfig = mongoose.model('FaceRecognitionConfig', faceRecognitionConfigSchema);

module.exports = {
  FaceFeature,
  FamilyRelation,
  FaceRecognitionAudit,
  FaceRecognitionConfig
};