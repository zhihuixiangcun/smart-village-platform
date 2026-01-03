/**
 * 文档模型
 * 村民证件和办事文档管理
 */

const mongoose = require('mongoose');
const EncryptionUtil = require('../utils/encryption');

const documentSchema = new mongoose.Schema({
  // 关联用户
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true
  },

  // 关联家庭（可选）
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family'
  },

  // 文档基本信息
  documentInfo: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: [
        '身份证', '户口本', '结婚证', '离婚证', '出生证明', '死亡证明',
        '房产证', '土地证', '承包合同', '营业执照', '卫生许可证',
        '毕业证', '学位证', '职业资格证', '技能等级证', '培训证书',
        '残疾证', '低保证', '五保证', '优待证', '退役军人证',
        '医疗证', '社保卡', '医保卡', '公积金卡',
        '驾驶证', '行驶证', '车辆登记证',
        '申请表', '审批表', '证明材料', '合同协议',
        '其他'
      ],
      required: true
    },
    number: {
      type: String,
      encrypted: true
    },
    issuingAuthority: { type: String },
    issueDate: { type: Date },
    expiryDate: { type: Date },
    status: {
      type: String,
      enum: ['有效', '过期', '挂失', '补办中', '已注销'],
      default: '有效'
    }
  },

  // 文档文件信息
  fileInfo: {
    originalName: { type: String, required: true },
    fileName: { type: String, required: true }, // 存储文件名
    filePath: { type: String, required: true }, // 文件路径
    fileSize: { type: Number, required: true }, // 文件大小（字节）
    mimeType: { type: String, required: true }, // 文件类型
    checksum: { type: String }, // 文件校验和
    thumbnailPath: { type: String }, // 缩略图路径
    pageCount: { type: Number }, // 页数（PDF）
    dimensions: {
      width: { type: Number }, // 宽度
      height: { type: Number } // 高度
    }
  },

  // OCR识别结果
  ocrResult: {
    text: { type: String }, // 识别的文本
    confidence: { type: Number }, // 置信度
    extractedFields: {
      // 根据文档类型提取的结构化字段
      name: { type: String },
      idCard: { type: String, encrypted: true },
      birthDate: { type: Date },
      address: { type: String },
      issueDate: { type: Date },
      expiryDate: { type: Date },
      issuingAuthority: { type: String }
    },
    processTime: { type: Number }, // 处理时间（毫秒）
    engineVersion: { type: String } // OCR引擎版本
  },

  // 文档分类和标签
  category: {
    type: String,
    enum: ['身份证明', '户籍证明', '婚姻证明', '学历证明', '职业资格', '财产证明', '许可证明', '社会保障', '其他'],
    required: true
  },
  tags: [{
    type: String,
    enum: ['重要', '常用', '备份', '原件', '复印件', '扫描件', '照片', '电子版']
  }],
  keywords: [{ type: String }], // 搜索关键词

  // 使用场景
  usage: {
    isRequiredForOnlineService: { type: Boolean, default: false },
    canBeUsedAsProxy: { type: Boolean, default: false },
    relatedServices: [{
      serviceName: { type: String },
      serviceId: { type: mongoose.Schema.Types.ObjectId },
      usageCount: { type: Number, default: 0 }
    }]
  },

  // 隐私和安全
  privacy: {
    isPublic: { type: Boolean, default: false },
    isEncrypted: { type: Boolean, default: true },
    accessLevel: {
      type: String,
      enum: ['公开', '保密', '机密', '绝密'],
      default: '保密'
    },
    allowedViewers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },

  // 验证状态
  verification: {
    isVerified: { type: Boolean, default: false },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: { type: Date },
    verificationMethod: {
      type: String,
      enum: ['人工审核', '自动验证', '第三方验证']
    },
    verificationNotes: { type: String }
  },

  // 版本控制
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    version: { type: Number },
    filePath: { type: String },
    archivedAt: { type: Date },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // 共享设置
  sharing: {
    isShared: { type: Boolean, default: false },
    shareType: {
      type: String,
      enum: ['公开链接', '密码访问', '授权用户'],
      default: '授权用户'
    },
    shareCode: { type: String }, // 分享码
    shareExpiry: { type: Date }, // 分享过期时间
    shareCount: { type: Number, default: 0 }, // 分享次数
    sharedWith: [{
      user: { type: mongoose.Schema.Types.ObjectId },
      permission: {
        type: String,
        enum: ['查看', '下载', '打印', '编辑']
      },
      sharedAt: { type: Date, default: Date.now },
      expiresAt: { type: Date }
    }]
  },

  // 备份信息
  backup: {
    isBackedUp: { type: Boolean, default: false },
    backupLocation: { type: String },
    backupDate: { type: Date },
    backupSize: { type: Number }
  },

  // 操作日志
  operationLogs: [{
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      // ref: 'User',
      required: true
    },
    operation: {
      type: String,
      enum: ['上传', '查看', '下载', '编辑', '删除', '分享', '验证', '打印'],
      required: true
    },
    details: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],

  // 状态信息
  status: {
    type: String,
    enum: ['正常', '审核中', '已过期', '已删除'],
    default: '正常'
  },

  // 记录信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // 时间戳
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
documentSchema.index({ userId: 1, 'documentInfo.type': 1 });
documentSchema.index({ familyId: 1 });
documentSchema.index({ 'documentInfo.type': 1 });
documentSchema.index({ 'documentInfo.status': 1 });
documentSchema.index({ 'category': 1 });
documentSchema.index({ 'tags': 1 });
// createdAt索引已由timestamps: true自动创建,无需手动指定
documentSchema.index({ 'documentInfo.expiryDate': 1 });

// 虚拟字段 - 是否即将过期（30天内）
documentSchema.virtual('isExpiringSoon').get(function() {
  if (!this.documentInfo.expiryDate) return false;
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return this.documentInfo.expiryDate <= thirtyDaysFromNow;
});

// 虚拟字段 - 文件大小（可读格式）
documentSchema.virtual('readableFileSize').get(function() {
  const size = this.fileInfo.fileSize;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
});

// 虚拟字段 - 文件URL
documentSchema.virtual('fileUrl').get(function() {
  return `${process.env.API_URL}/api/v1/documents/download/${this._id}`;
});

// 中间件 - 保存前加密敏感数据
documentSchema.pre('save', async function(next) {
  try {
    // 加密证件号码
    if (this.documentInfo.number) {
      this.documentInfo.number = await EncryptionUtil.encrypt(this.documentInfo.number);
    }

    // 加密OCR提取的身份证号
    if (this.ocrResult.extractedFields.idCard) {
      this.ocrResult.extractedFields.idCard = await EncryptionUtil.encrypt(this.ocrResult.extractedFields.idCard);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// 中间件 - 查询后解密数据
documentSchema.post(['find', 'findOne'], async function(docs) {
  if (!docs) return;

  const decryptDoc = async (doc) => {
    if (!doc) return;

    // 解密证件号码
    if (doc.documentInfo.number) {
      doc.documentInfo.number = await EncryptionUtil.decrypt(doc.documentInfo.number);
    }

    // 解密OCR提取的身份证号
    if (doc.ocrResult.extractedFields.idCard) {
      doc.ocrResult.extractedFields.idCard = await EncryptionUtil.decrypt(doc.ocrResult.extractedFields.idCard);
    }
  };

  if (Array.isArray(docs)) {
    for (const doc of docs) {
      await decryptDoc(doc);
    }
  } else {
    await decryptDoc(docs);
  }
});

// 实例方法 - 添加操作日志
documentSchema.methods.addOperationLog = function(operator, operation, details = '', ipAddress = '', userAgent = '') {
  this.operationLogs.push({
    operator,
    operation,
    details,
    ipAddress,
    userAgent,
    timestamp: new Date()
  });

  // 保留最近100条日志
  if (this.operationLogs.length > 100) {
    this.operationLogs = this.operationLogs.slice(-100);
  }

  return this.save();
};

// 实例方法 - 增加使用次数
documentSchema.methods.incrementUsage = function(serviceId, serviceName) {
  const serviceIndex = this.usage.relatedServices.findIndex(
    s => s.serviceId && s.serviceId.toString() === serviceId.toString()
  );

  if (serviceIndex > -1) {
    this.usage.relatedServices[serviceIndex].usageCount++;
  } else {
    this.usage.relatedServices.push({
      serviceName,
      serviceId,
      usageCount: 1
    });
  }

  return this.save();
};

// 实例方法 - 创建新版本
documentSchema.methods.createNewVersion = function(newFilePath, userId) {
  // 保存当前版本
  this.previousVersions.push({
    version: this.version,
    filePath: this.fileInfo.filePath,
    archivedAt: new Date(),
    archivedBy: userId
  });

  // 更新文件信息
  this.fileInfo.filePath = newFilePath;
  this.version++;
  this.updatedBy = userId;

  return this.save();
};

// 实例方法 - 验证文档
documentSchema.methods.verify = function(verifiedBy, method = '人工审核', notes = '') {
  this.verification = {
    isVerified: true,
    verifiedBy,
    verifiedAt: new Date(),
    verificationMethod: method,
    verificationNotes: notes
  };

  return this.save();
};

// 实例方法 - 分享文档
documentSchema.methods.share = function(sharedWith, permission = '查看', expiresIn = null) {
  this.sharing.isShared = true;
  this.sharing.sharedWith.push({
    user: sharedWith,
    permission,
    expiresAt: expiresIn
  });

  return this.save();
};

// 实例方法 - 检查访问权限
documentSchema.methods.hasAccess = function(userId, permission = '查看') {
  // 创建者有所有权限
  if (this.createdBy.toString() === userId.toString()) {
    return true;
  }

  // 检查共享权限
  const sharedPermission = this.sharing.sharedWith.find(share =>
    share.user.toString() === userId.toString() &&
    (!share.expiresAt || share.expiresAt > new Date())
  );

  if (sharedPermission) {
    const permissionLevels = ['查看', '下载', '打印', '编辑'];
    const userLevel = permissionLevels.indexOf(sharedPermission.permission);
    const requiredLevel = permissionLevels.indexOf(permission);
    return userLevel >= requiredLevel;
  }

  // 检查允许查看者
  if (this.privacy.allowedViewers.includes(userId)) {
    return permission === '查看';
  }

  return false;
};

// 静态方法 - 获取用户的文档统计
documentSchema.statics.getUserStats = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalDocuments: { $sum: 1 },
        typeDistribution: {
          $push: '$documentInfo.type'
        },
        categoryDistribution: {
          $push: '$category'
        },
        statusDistribution: {
          $push: '$documentInfo.status'
        },
        verifiedCount: {
          $sum: { $cond: ['$verification.isVerified', 1, 0] }
        },
        expiringSoonCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$documentInfo.expiryDate', null] },
                  { $lte: ['$documentInfo.expiryDate', { $add: [new Date(), 30 * 24 * 60 * 60 * 1000] }] }
                ]
              },
              1,
              0
            ]
          }
        },
        totalFileSize: { $sum: '$fileInfo.fileSize' }
      }
    },
    {
      $project: {
        _id: 0,
        totalDocuments: 1,
        typeStats: {
          $reduce: {
            input: '$typeDistribution',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $arrayToObject: [[
                    { k: '$$this', v: { $add: [{ $ifNull: [{ $indexOfArray: ['$$value', '$$this'] }, -1] }, 1] } }
                  ]]
                }
              ]
            }
          }
        },
        categoryStats: {
          $reduce: {
            input: '$categoryDistribution',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $arrayToObject: [[
                    { k: '$$this', v: { $add: [{ $ifNull: [{ $indexOfArray: ['$$value', '$$this'] }, -1] }, 1] } }
                  ]]
                }
              ]
            }
          }
        },
        statusStats: {
          $reduce: {
            input: '$statusDistribution',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $arrayToObject: [[
                    { k: '$$this', v: { $add: [{ $ifNull: [{ $indexOfArray: ['$$value', '$$this'] }, -1] }, 1] } }
                  ]]
                }
              ]
            }
          }
        },
        verifiedCount: 1,
        expiringSoonCount: 1,
        verificationRate: { $divide: ['$verifiedCount', '$totalDocuments'] },
        totalFileSize: 1
      }
    }
  ]);
};

// 静态方法 - 搜索文档
documentSchema.statics.searchDocuments = function(userId, query, filters = {}) {
  const searchQuery = {
    userId: mongoose.Types.ObjectId(userId),
    status: '正常',
    ...filters,
    $or: [
      { 'documentInfo.name': { $regex: query, $options: 'i' } },
      { keywords: { $in: [new RegExp(query, 'i')] } },
      { 'documentInfo.type': { $regex: query, $options: 'i' } },
      { 'ocrResult.text': { $regex: query, $options: 'i' } }
    ]
  };

  return this.find(searchQuery)
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .limit(50);
};

// 导出模型
const Document = mongoose.model('Document', documentSchema);

module.exports = Document;