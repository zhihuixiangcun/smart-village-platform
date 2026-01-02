/**
 * 区块链存证数据模型
 * 用于管理区块链上链记录和验证
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const blockchainRecordSchema = new mongoose.Schema({
  // 记录类型
  recordType: {
    type: String,
    required: true,
    enum: {
      values: [
        'financial',        // 财务流水
        'operation',        // 操作记录
        'contract',         // 合同文件
        'certificate',      // 证书文件
        'identity',         // 身份认证
        'audit_log',        // 审计日志
        'data_hash',        // 数据哈希
        'other'             // 其他
      ],
      message: '无效的记录类型'
    },
    index: true
  },

  // 记录类型名称（中文）
  recordTypeName: {
    type: String,
    required: true
  },

  // 业务数据
  businessData: {
    // 关联的业务类型
    businessType: String,
    // 关联的业务ID
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true
    },
    // 业务数据摘要
    businessSummary: String
  },

  // 原始数据
  rawData: {
    // 数据内容（加密存储）
    content: String,
    // 数据类型（json, text, file等）
    dataType: String,
    // 文件路径（如果是文件）
    filePath: String,
    // 文件大小（字节）
    fileSize: Number
  },

  // 数据哈希
  dataHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // 哈希算法
  hashAlgorithm: {
    type: String,
    default: 'sha256'
  },

  // 区块链信息
  blockchainInfo: {
    // 交易ID
    transactionHash: {
      type: String,
      index: true
    },
    // 区块号
    blockNumber: Number,
    // 区块哈希
    blockHash: String,
    // 交易索引
    transactionIndex: Number,
    // Gas使用量
    gasUsed: Number,
    // 交易费用
    transactionFee: String,
    // 链ID（区分不同的链）
    chainId: String,
    // 网络类型（mainnet, testnet, private）
    networkType: {
      type: String,
      enum: ['mainnet', 'testnet', 'private'],
      default: 'private'
    }
  },

  // 上链状态
  chainStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'failed', 'verifying'],
    default: 'pending',
    index: true
  },

  // 验证状态
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'failed', 'tampered'],
    default: 'pending',
    index: true
  },

  // 验证结果
  verificationResult: {
    // 是否验证通过
    isValid: Boolean,
    // 验证时间
    verifiedAt: Date,
    // 验证人
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    // 验证详情
    details: mongoose.Schema.Types.Mixed
  },

  // 数字签名
  signature: {
    // 签名值
    value: String,
    // 签名算法
    algorithm: {
      type: String,
      default: 'RSA'
    },
    // 签名人
    signer: String,
    // 签名时间
    signedAt: Date
  },

  // 存证证书
  certificate: {
    // 证书编号
    certificateNo: {
      type: String,
      unique: true,
      sparse: true
    },
    // 证书文件路径
    certificatePath: String,
    // 证书有效期
    validFrom: Date,
    validUntil: Date,
    // 证书状态
    status: {
      type: String,
      enum: ['active', 'revoked', 'expired'],
      default: 'active'
    }
  },

  // 元数据
  metadata: {
    // 创建人
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    // 创建人姓名
    creatorName: String,
    // 所属村委
    villageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Village'
    },
    // 标签
    tags: [String],
    // 备注
    notes: String
  },

  // 重试次数（用于上链失败重试）
  retryCount: {
    type: Number,
    default: 0
  },

  // 最大重试次数
  maxRetries: {
    type: Number,
    default: 3
  },

  // 错误信息
  errorMessage: String,

  // 最后重试时间
  lastRetryAt: Date
}, {
  timestamps: true,
  collection: 'blockchain_records'
});

// 索引优化
blockchainRecordSchema.index({ recordType: 1, chainStatus: 1 });
blockchainRecordSchema.index({ 'blockchainInfo.transactionHash': 1 });
blockchainRecordSchema.index({ verificationStatus: 1, createdAt: -1 });
blockchainRecordSchema.index({ 'businessData.businessId': 1 });
blockchainRecordSchema.index({ createdAt: -1 });

// 实例方法：计算数据哈希
blockchainRecordSchema.methods.calculateHash = function() {
  const dataString = JSON.stringify({
    recordType: this.recordType,
    businessData: this.businessData,
    rawData: this.rawData,
    createdAt: this.createdAt
  });

  return crypto
    .createHash(this.hashAlgorithm)
    .update(dataString)
    .digest('hex');
};

// 实例方法：更新区块链信息
blockchainRecordSchema.methods.updateBlockchainInfo = function(txInfo) {
  this.blockchainInfo = {
    ...this.blockchainInfo,
    ...txInfo
  };
  this.chainStatus = 'confirmed';
  this.verificationStatus = 'verified';
  this.verificationResult = {
    isValid: true,
    verifiedAt: new Date()
  };
  return this.save();
};

// 实例方法：验证数据完整性
blockchainRecordSchema.methods.verifyIntegrity = function() {
  const currentHash = this.calculateHash();
  const isValid = currentHash === this.dataHash;

  this.verificationStatus = isValid ? 'verified' : 'tampered';
  this.verificationResult = {
    isValid,
    verifiedAt: new Date(),
    details: {
      currentHash,
      storedHash: this.dataHash,
      match: isValid
    }
  };

  return this.save();
};

// 实例方法：生成存证证书
blockchainRecordSchema.methods.generateCertificate = function() {
  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setFullYear(validUntil.getFullYear() + 10); // 10年有效期

  const certificateNo = `BC${now.getFullYear()}${String(now.getMonth() + 1).padStart(4, '0')}${String(this._id).slice(-8).toUpperCase()}`;

  this.certificate = {
    certificateNo,
    validFrom: now,
    validUntil,
    status: 'active'
  };

  return this.save();
};

// 实例方法：上链重试
blockchainRecordSchema.methods.retryChain = function() {
  if (this.retryCount >= this.maxRetries) {
    this.chainStatus = 'failed';
    this.errorMessage = 'Maximum retry attempts exceeded';
    return this.save();
  }

  this.retryCount += 1;
  this.lastRetryAt = new Date();
  this.chainStatus = 'pending';
  return this.save();
};

// 静态方法：创建存证记录
blockchainRecordSchema.statics.createRecord = async function(recordData) {
  const record = new this(recordData);

  // 计算数据哈希
  if (!record.dataHash) {
    record.dataHash = record.calculateHash();
  }

  await record.save();

  // 异步上链（不阻塞主流程）
  process.nextTick(async () => {
    try {
      await this.uploadToChain(record._id);
    } catch (error) {
      console.error('Failed to upload to blockchain:', error);
    }
  });

  return record;
};

// 静态方法：上链（模拟实现）
blockchainRecordSchema.statics.uploadToChain = async function(recordId) {
  const record = await this.findById(recordId);

  if (!record || record.chainStatus === 'confirmed') {
    return record;
  }

  // TODO: 实际的区块链交互逻辑
  // 这里需要根据使用的区块链平台（以太坊、Fabric等）实现具体的上链逻辑
  // 示例伪代码：
  // const txHash = await web3.eth.sendTransaction({
  //   from: config.accountAddress,
  //   to: config.contractAddress,
  //   data: web3.eth.abi.encodeParameter('string', record.dataHash)
  // });

  // 模拟上链成功
  record.updateBlockchainInfo({
    transactionHash: `0x${crypto.randomBytes(32).toString('hex')}`,
    blockNumber: Math.floor(Math.random() * 10000000) + 10000000,
    blockHash: `0x${crypto.randomBytes(32).toString('hex')}`,
    transactionIndex: Math.floor(Math.random() * 10),
    gasUsed: Math.floor(Math.random() * 100000) + 21000,
    chainId: '1',
    networkType: 'private'
  });

  return record;
};

// 静态方法：批量验证记录
blockchainRecordSchema.statics.batchVerify = async function(recordIds) {
  const records = await this.find({ _id: { $in: recordIds } });
  const results = [];

  for (const record of records) {
    const result = await record.verifyIntegrity();
    results.push({
      recordId: record._id,
      isValid: result.verificationResult.isValid,
      dataHash: record.dataHash
    });
  }

  return results;
};

// 静态方法：获取上链统计
blockchainRecordSchema.statics.getChainStats = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          recordType: '$recordType',
          chainStatus: '$chainStatus'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.recordType',
        statuses: {
          $push: {
            status: '$_id.chainStatus',
            count: '$count'
          }
        },
        total: { $sum: '$count' }
      }
    }
  ]);
};

// 静态方法：获取待重试记录
blockchainRecordSchema.statics.getPendingRetries = function() {
  const retryDelay = 5 * 60 * 1000; // 5分钟
  const lastRetryBefore = new Date(Date.now() - retryDelay);

  return this.find({
    chainStatus: 'pending',
    retryCount: { $lt: this.maxRetries },
    $or: [
      { lastRetryAt: { $lt: lastRetryBefore } },
      { lastRetryAt: { $exists: false } }
    ]
  }).limit(100);
};

// 静态方法：获取业务数据的存证记录
blockchainRecordSchema.statics.getBusinessRecords = function(businessType, businessId) {
  return this.find({
    'businessData.businessType': businessType,
    'businessData.businessId': businessId
  }).sort({ createdAt: -1 });
};

// 静态方法：验证业务数据完整性
blockchainRecordSchema.statics.verifyBusinessData = async function(businessType, businessId) {
  const records = await this.getBusinessRecords(businessType, businessId);
  const results = [];

  for (const record of records) {
    await record.verifyIntegrity();
    results.push({
      recordId: record._id,
      createdAt: record.createdAt,
      isValid: record.verificationResult.isValid,
      verificationStatus: record.verificationStatus
    });
  }

  return {
    businessId,
    totalRecords: results.length,
    verifiedRecords: results.filter(r => r.isValid).length,
    details: results
  };
};

// 静态方法：生成存证报告
blockchainRecordSchema.statics.generateReport = async function(startDate, endDate) {
  const stats = await this.getChainStats(startDate, endDate);
  const totalRecords = await this.countDocuments({
    createdAt: { $gte: startDate, $lte: endDate }
  });
  const confirmedRecords = await this.countDocuments({
    createdAt: { $gte: startDate, $lte: endDate },
    chainStatus: 'confirmed'
  });

  return {
    period: { startDate, endDate },
    totalRecords,
    confirmedRecords,
    successRate: totalRecords > 0 ? (confirmedRecords / totalRecords * 100).toFixed(2) + '%' : '0%',
    statsByType: stats
  };
};

const BlockchainRecord = mongoose.model('BlockchainRecord', blockchainRecordSchema);

module.exports = BlockchainRecord;
