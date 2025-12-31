/**
 * 村民证件包模型
 * 用于安全存储和管理村民的各种证件信息
 * 支持加密存储、权限控制和操作审计
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

// 证件类型枚举
const DOCUMENT_TYPES = {
  ID_CARD: 'id_card',              // 身份证
  HOUSEHOLD_REGISTER: 'household_register', // 户口本
  BANK_CARD: 'bank_card',          // 银行卡
  GRADUATION_CERT: 'graduation_cert',     // 毕业证
  PERSONAL_PHOTO: 'personal_photo',       // 个人相片
  OTHER: 'other'                 // 其他证件
};

// 证件状态枚举
const DOCUMENT_STATUS = {
  ACTIVE: 'active',       // 有效
  EXPIRED: 'expired',     // 已过期
  LOST: 'lost',          // 已挂失
  REVOKED: 'revoked'      // 已吊销
};

const documentPackageSchema = new mongoose.Schema({
  // 关联村民
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 证件列表
  documents: [{
    // 基本信息
    type: {
      type: String,
      enum: Object.values(DOCUMENT_TYPES),
      required: true
    },
    typeLabel: {
      type: String,
      required: true
    },

    // 加密数据
    data: {
      encrypted: {
        type: Boolean,
        default: true
      },
      // 加密后的内容（AES-256-GCM）
      content: {
        type: mongoose.Schema.Types.Mixed,
        select: false  // 默认不查询加密数据
      },
      iv: String,           // 初始化向量
      authTag: String,       // 认证标签
      algorithm: {
        type: String,
        default: 'aes-256-gcm'
      }
    },

    // 证件文件
    files: [{
      fileType: String,     // 文件类型（front/back/avatar等）
      fileKey: String,       // 存储key
      fileName: String,      // 原始文件名
      mimeType: String,      // MIME类型
      size: Number,          // 文件大小（字节）
      checksum: String,      // 文件校验和
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],

    // 元数据
    status: {
      type: String,
      enum: Object.values(DOCUMENT_STATUS),
      default: DOCUMENT_STATUS.ACTIVE
    },
    expiryDate: Date,
    issueDate: Date,
    issuingAuthority: String, // 发证机关
    documentNumber: String,   // 证件号码（加密存储）

    // 提醒设置
    reminderSent: {
      type: Boolean,
      default: false
    },
    reminderDays: {
      type: Number,
      default: 30  // 过期前30天提醒
    },

    // 备注
    notes: String,

    // 时间戳
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 访问设置
  accessSettings: {
    // 是否允许村干部查看
    allowCommitteeView: {
      type: Boolean,
      default: false
    },
    // 村干部访问日志
    committeeAccessLog: [{
      committeeMemberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      committeeMemberName: String,
      accessedAt: Date,
      purpose: String,        // 访问目的
      ipAddress: String,
      userAgent: String
    }]
  },

  // 安全设置
  security: {
    // 加密级别
    encryptLevel: {
      idCard: {
        type: String,
        enum: ['standard', 'high', 'critical'],
        default: 'high'
      },
      bankCard: {
        type: String,
        enum: ['standard', 'high', 'critical'],
        default: 'high'
      },
      household: {
        type: String,
        enum: ['standard', 'high', 'critical'],
        default: 'high'
      },
      other: {
        type: String,
        enum: ['standard', 'high'],
        default: 'standard'
      }
    },
    lastEncryptedAt: Date,
    keyRotationRequired: {
      type: Boolean,
      default: false
    }
  },

  // 统计信息
  stats: {
    totalDocuments: {
      type: Number,
      default: 0
    },
    expiredDocuments: {
      type: Number,
      default: 0
    },
    expiringDocuments: {
      type: Number,
      default: 0
    },
    lastAccessAt: Date,
    accessCount: {
      type: Number,
      default: 0
    }
  },

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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
documentPackageSchema.index({ residentId: 1, villageId: 1 });
documentPackageSchema.index({ villageId: 1, 'documents.status': 1 });
documentPackageSchema.index({ 'documents.expiryDate': 1 });

// 虚拟字段：证件包完整度
documentPackageSchema.virtual('completeness').get(function() {
  const totalTypes = Object.keys(DOCUMENT_TYPES).length;
  const uploadedTypes = new Set(this.documents.map(d => d.type));
  return {
    uploaded: uploadedTypes.size,
    total: totalTypes,
    percentage: Math.round((uploadedTypes.size / totalTypes) * 100)
  };
});

// 实例方法：加密证件数据
documentPackageSchema.methods.encryptDocumentData = function(data, documentType) {
  const algorithm = 'aes-256-gcm';
  const key = process.env.DOCUMENT_ENCRYPTION_KEY || crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    content: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    algorithm
  };
};

// 实例方法：解密证件数据
documentPackageSchema.methods.decryptDocumentData = function(encryptedData, iv, authTag) {
  const algorithm = 'aes-256-gcm';
  const key = process.env.DOCUMENT_ENCRYPTION_KEY || Buffer.alloc(32, 'default-key-32-chars!');

  const decipher = crypto.createDecipheriv(
    algorithm,
    key,
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted);
};

// 实例方法：添加证件
documentPackageSchema.methods.addDocument = async function(documentData) {
  const { type, data, files } = documentData;

  // 根据证件类型确定加密级别
  const encryptLevel = this.security.encryptLevel[type] || 'standard';

  // 加密证件数据
  const encrypted = this.encryptDocumentData(data, type);

  const newDocument = {
    type,
    typeLabel: getDocumentTypeLabel(type),
    data: {
      encrypted: true,
      ...encrypted
    },
    files: files || [],
    status: DOCUMENT_STATUS.ACTIVE
  };

  // 处理有效期
  if (data.expiryDate) {
    newDocument.expiryDate = new Date(data.expiryDate);
    newDocument.issueDate = data.issueDate ? new Date(data.issueDate) : null;
  }

  // 处理发证机关和证件号码（也需要加密）
  if (data.issuingAuthority) {
    newDocument.issuingAuthority = data.issuingAuthority;
  }

  if (data.documentNumber) {
    // 证件号码单独加密
    const numberEncrypted = this.encryptDocumentData(
      { number: data.documentNumber },
      type
    );
    newDocument.documentNumber = numberEncrypted.content;
  }

  this.documents.push(newDocument);
  this.stats.totalDocuments = this.documents.length;

  return this.save();
};

// 实例方法：更新证件
documentPackageSchema.methods.updateDocument = async function(documentId, updates) {
  const document = this.documents.id(documentId);

  if (!document) {
    throw new Error('证件不存在');
  }

  // 更新允许的字段
  const allowedUpdates = ['expiryDate', 'issueDate', 'issuingAuthority', 'notes', 'status', 'files'];
  allowedUpdates.forEach(field => {
    if (updates[field] !== undefined) {
      document[field] = updates[field];
    }
  });

  // 如果更新证件号码或敏感数据，需要重新加密
  if (updates.documentNumber || updates.data) {
    const encrypted = this.encryptDocumentData(
      updates.data || { documentNumber: updates.documentNumber },
      document.type
    );
    document.data = {
      encrypted: true,
      ...encrypted
    };
  }

  document.updatedAt = new Date();
  this.updatedAt = new Date();

  return this.save();
};

// 实例方法：删除证件
documentPackageSchema.methods.removeDocument = async function(documentId) {
  const document = this.documents.id(documentId);

  if (!document) {
    throw new Error('证件不存在');
  }

  document.status = DOCUMENT_STATUS.REVOKED;
  document.updatedAt = new Date();
  this.updatedAt = new Date();

  return this.save();
};

// 实例方法：记录访问
documentPackageSchema.methods.logAccess = async function(operatorId, operatorName, operatorRole, purpose, ipAddress, userAgent) {
  this.stats.lastAccessAt = new Date();
  this.stats.accessCount = (this.stats.accessCount || 0) + 1;

  this.accessSettings.committeeAccessLog.push({
    committeeMemberId: operatorId,
    committeeMemberName: operatorName,
    accessedAt: new Date(),
    purpose,
    ipAddress,
    userAgent
  });

  // 同时记录到独立的审计日志
  await DocumentAccessLog.create({
    residentId: this.residentId,
    operatorId,
    operatorName,
    operatorRole,
    action: 'view',
    ipAddress,
    userAgent,
    purpose
  });

  return this.save();
};

// 实例方法：获取脱敏数据
documentPackageSchema.methods.getMaskedData = function() {
  const masked = this.toObject();

  // 脱敏处理证件数据
  masked.documents = masked.documents.map(doc => {
    const maskedDoc = { ...doc };

    // 删除加密的原始数据
    delete maskedDoc.data;

    // 如果有证件号码，显示脱敏版本
    if (doc.documentNumber) {
      // 这里简化处理，实际应该解密后脱敏
      maskedDoc.maskedDocumentNumber = '****';
    }

    return maskedDoc;
  });

  return masked;
};

// 静态方法：获取村民证件包
documentPackageSchema.statics.findByResident = function(residentId) {
  return this.findOne({ residentId });
};

// 静态方法：检查访问权限
documentPackageSchema.statics.checkAccess = async function(residentId, userId, userRole, userVillageId) {
  // 1. 本人可以访问
  if (userId.toString() === residentId.toString()) {
    return { allowed: true, reason: 'self', requireMask: false };
  }

  // 2. 系统管理员可以访问
  if (userRole === 'admin') {
    return { allowed: true, reason: 'admin', requireMask: false };
  }

  // 3. 村干部需要检查同村且村民允许查看
  if (['committee_member', 'village_admin', 'village_secretary'].includes(userRole)) {
    const pkg = await this.findOne({ residentId });

    if (!pkg) {
      return { allowed: false, reason: 'not_found' };
    }

    // 检查是否同村
    if (pkg.villageId.toString() !== userVillageId.toString()) {
      return { allowed: false, reason: 'different_village' };
    }

    // 检查村民是否允许村干部查看
    if (!pkg.accessSettings.allowCommitteeView) {
      return { allowed: false, reason: 'access_denied' };
    }

    return { allowed: true, reason: 'committee', requireMask: true };
  }

  return { allowed: false, reason: 'no_permission' };
};

// 静态方法：获取即将过期的证件
documentPackageSchema.statics.findExpiringDocuments = function(days = 30) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);

  return this.aggregate([
    {
      $match: {
        'documents.status': DOCUMENT_STATUS.ACTIVE,
        'documents.expiryDate': { $lte: expiryDate }
      }
    },
    {
      $unwind: '$documents'
    },
    {
      $match: {
        'documents.status': DOCUMENT_STATUS.ACTIVE,
        'documents.expiryDate': { $lte: expiryDate }
      }
    },
    {
      $group: {
        _id: '$residentId',
        villageId: { $first: '$villageId' },
        expiringDocuments: {
          $push: {
            type: '$documents.type',
            typeLabel: '$documents.typeLabel',
            expiryDate: '$documents.expiryDate',
            documentId: '$_id'
          }
        },
        count: { $sum: 1 }
      }
    }
  ]);
};

// 静态方法：获取统计
documentPackageSchema.statics.getStatistics = function(villageId) {
  return this.aggregate([
    {
      $match: villageId ? { villageId } : {}
    },
    {
      $group: {
        _id: null,
        totalPackages: { $sum: 1 },
        totalDocuments: { $sum: '$documents.length' },
        activeDocuments: {
          $sum: {
            $size: {
              $filter: {
                input: '$documents',
                as: 'doc',
                cond: { $eq: ['$$doc.status', DOCUMENT_STATUS.ACTIVE] }
              }
            }
          }
        },
        expiredDocuments: {
          $sum: {
            $size: {
              $filter: {
                input: '$documents',
                as: 'doc',
                cond: { $eq: ['$$doc.status', DOCUMENT_STATUS.EXPIRED] }
              }
            }
          }
        }
      }
    }
  ]);
};

// 辅助函数：获取证件类型标签
function getDocumentTypeLabel(type) {
  const labels = {
    id_card: '身份证',
    household_register: '户口本',
    bank_card: '银行卡',
    graduation_cert: '毕业证',
    personal_photo: '个人相片',
    other: '其他证件'
  };
  return labels[type] || '未知证件';
}

// 访问日志模型
const documentAccessLogSchema = new mongoose.Schema({
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  operatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  operatorName: String,
  operatorRole: String,
  action: {
    type: String,
    enum: ['view', 'create', 'update', 'delete'],
    required: true
  },
  documentTypes: [String],
  ipAddress: String,
  userAgent: String,
  purpose: String,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

documentAccessLogSchema.index({ residentId: 1, createdAt: -1 });
documentAccessLogSchema.index({ operatorId: 1, createdAt: -1 });

const DocumentPackage = mongoose.model('DocumentPackage', documentPackageSchema);
const DocumentAccessLog = mongoose.model('DocumentAccessLog', documentAccessLogSchema);

module.exports = { DocumentPackage, DocumentAccessLog, DOCUMENT_TYPES, DOCUMENT_STATUS };
