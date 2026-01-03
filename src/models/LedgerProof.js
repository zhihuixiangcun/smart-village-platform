/**
 * 区块链存证模型
 * 用于财务流水、村务决策等数据的防篡改存证
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const ledgerProofSchema = new mongoose.Schema({
  // 关联村庄
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 存证类型
  proofType: {
    type: String,
    enum: [
      'financial',           // 财务流水
      'transaction',         // 交易记录
      'contract',            // 合同文件
      'decision',            // 村务决策
      'announcement',        // 公告公示
      'procurement',         // 采购记录
      'subsidy',            // 补贴发放
      'reimbursement',      // 报销记录
      'budget',             // 预算审批
      'project_progress',   // 项目进度
      'election',           // 选举记录
      'voting'             // 投票记录
    ],
    required: true,
    index: true
  },

  // 关联的原始数据ID
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },

  // 关联的数据模型名称
  relatedModel: {
    type: String,
    required: true
  },

  // 原始数据（加密存储敏感信息）
  originalData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  // 数据摘要（SHA-256）
  dataHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // 前一个存证的哈希（形成链式结构）
  previousHash: {
    type: String,
    default: '0'.repeat(64), // 创世块
    index: true
  },

  // 当前区块的高度
  blockHeight: {
    type: Number,
    required: true,
    index: true
  },

  // Merkle树根哈希（用于批量验证）
  merkleRoot: {
    type: String,
    default: null
  },

  // 区块链信息
  blockchain: {
    // 区块链类型
    type: {
      type: String,
      enum: ['ethereum', 'hyperledger', 'bitcoin', 'fabric', 'custom', 'local'],
      default: 'local'
    },
    // 网络ID
    networkId: {
      type: String,
      default: 'village-ledger-main'
    },
    // 交易哈希（如果上链）
    transactionHash: {
      type: String,
      sparse: true // 允许多个值为空
    },
    // 区块号（如果上链）
    blockNumber: {
      type: Number,
      sparse: true
    },
    // 区块哈希（如果上链）
    blockHash: {
      type: String,
      sparse: true
    },
    // 确认数
    confirmations: {
      type: Number,
      default: 0
    },
    // Gas费用（以太坊）
    gasUsed: {
      type: Number,
      default: 0
    },
    // 上链状态
    status: {
      type: String,
      enum: ['pending', 'submitted', 'confirmed', 'failed'],
      default: 'pending'
    },
    // 上链时间
    confirmedAt: {
      type: Date,
      default: null
    }
  },

  // 数字签名
  signature: {
    // 签名算法
    algorithm: {
      type: String,
      enum: ['RSA', 'ECDSA', 'Ed25519', 'SM2'], // SM2是中国国密算法
      default: 'ECDSA'
    },
    // 签名值
    value: {
      type: String,
      required: true
    },
    // 签名者公钥
    publicKey: {
      type: String,
      required: true
    },
    // 签名者（用户）
    signer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // 签名时间戳
    timestamp: {
      type: Date,
      default: Date.now,
      required: true
    }
  },

  // 验证状态
  verification: {
    // 是否已验证
    isVerified: {
      type: Boolean,
      default: true // 本地创建时默认为真
    },
    // 验证次数
    verificationCount: {
      type: Number,
      default: 0
    },
    // 最后验证时间
    lastVerifiedAt: {
      type: Date,
      default: Date.now
    },
    // 验证结果
    result: {
      type: String,
      enum: ['valid', 'invalid', 'tampered', 'pending'],
      default: 'valid'
    }
  },

  // 元数据
  metadata: {
    // 数据版本
    version: {
      type: Number,
      default: 1
    },
    // 创建者
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // 创建时间
    createdAt: {
      type: Date,
      default: Date.now
    },
    // IP地址
    ipAddress: String,
    // 用户代理
    userAgent: String,
    // 设备ID
    deviceId: String
  },

  // 审计日志
  auditLog: [{
    action: {
      type: String,
      enum: ['created', 'verified', 'synced', 'failed', 'updated']
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    performedAt: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed
  }]

}, {
  timestamps: true,
  // 添加虚拟属性和实例方法
  toObject: {
    virtuals: true
  },
  toJSON: {
    virtuals: true
  }
});

// 索引
ledgerProofSchema.index({ villageId: 1, proofType: 1, createdAt: -1 });
ledgerProofSchema.index({ blockHeight: 1 }, { unique: true });
ledgerProofSchema.index({ relatedId: 1, relatedModel: 1 }, { unique: true });
ledgerProofSchema.index({ 'blockchain.status': 1 });
// createdAt索引已由timestamps: true自动创建,无需手动指定

// 虚拟字段
ledgerProofSchema.virtual('isOnChain').get(function() {
  return this.blockchain.status === 'confirmed' &&
         this.blockchain.transactionHash &&
         this.blockchain.confirmations > 0;
});

ledgerProofSchema.virtual('chainInfo').get(function() {
  return {
    type: this.blockchain.type,
    txHash: this.blockchain.transactionHash,
    blockNumber: this.blockchain.blockNumber,
    confirmations: this.blockchain.confirmations
  };
});

// 实例方法 - 生成数据哈希
ledgerProofSchema.methods.generateDataHash = function() {
  // 排序字段以确保哈希一致性
  const dataToHash = {
    villageId: this.villageId.toString(),
    proofType: this.proofType,
    relatedId: this.relatedId.toString(),
    relatedModel: this.relatedModel,
    originalData: this.originalData,
    previousHash: this.previousHash,
    blockHeight: this.blockHeight,
    timestamp: this.metadata.createdAt.getTime()
  };

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(dataToHash))
    .digest('hex');
};

// 实例方法 - 验证数据完整性
ledgerProofSchema.methods.verifyIntegrity = function() {
  // 重新计算哈希
  const calculatedHash = this.generateDataHash();
  const isValid = calculatedHash === this.dataHash;

  // 更新验证状态
  this.verification.isVerified = isValid;
  this.verification.result = isValid ? 'valid' : 'tampered';
  this.verification.verificationCount += 1;
  this.verification.lastVerifiedAt = new Date();

  // 添加审计日志
  this.auditLog.push({
    action: 'verified',
    performedBy: this.metadata.createdBy,
    performedAt: new Date(),
    details: {
      isValid,
      calculatedHash,
      storedHash: this.dataHash
    }
  });

  return {
    isValid,
    calculatedHash,
    storedHash: this.dataHash,
    verificationCount: this.verification.verificationCount
  };
};

// 实例方法 - 添加审计记录
ledgerProofSchema.methods.addAuditLog = function(action, performedBy, details = {}) {
  this.auditLog.push({
    action,
    performedBy,
    performedAt: new Date(),
    details
  });
  return this.save();
};

// 静态方法 - 获取最后一个存证（用于链接）
ledgerProofSchema.statics.getLastProof = async function(villageId) {
  return this.findOne({ villageId })
    .sort({ blockHeight: -1 })
    .select('dataHash previousHash blockHeight');
};

// 静态方法 - 验证存证链完整性
ledgerProofSchema.statics.verifyChain = async function(villageId) {
  const proofs = await this.find({ villageId })
    .sort({ blockHeight: 1 })
    .select('dataHash previousHash blockHeight relatedId relatedModel');

  if (proofs.length === 0) {
    return { valid: true, message: '空链' };
  }

  let isValid = true;
  const errors = [];

  // 验证创世块
  if (proofs[0].previousHash !== '0'.repeat(64)) {
    isValid = false;
    errors.push({
      blockHeight: proofs[0].blockHeight,
      error: '创世块previousHash应为全0'
    });
  }

  // 验证链式结构
  for (let i = 1; i < proofs.length; i++) {
    const current = proofs[i];
    const previous = proofs[i - 1];

    if (current.previousHash !== previous.dataHash) {
      isValid = false;
      errors.push({
        blockHeight: current.blockHeight,
        error: '链断裂',
        expectedPrevious: previous.dataHash,
        actualPrevious: current.previousHash
      });
    }
  }

  return {
    valid: isValid,
    totalBlocks: proofs.length,
    errors,
    lastBlockHeight: proofs[proofs.length - 1].blockHeight
  };
};

// 静态方法 - 按类型获取统计
ledgerProofSchema.statics.getStatsByType = async function(villageId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        villageId: mongoose.Types.ObjectId(villageId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$proofType',
        count: { $sum: 1 },
        onChainCount: {
          $sum: {
            $cond: [
              { $eq: ['$blockchain.status', 'confirmed'] },
              1,
              0
            ]
          }
        },
        lastProof: { $max: '$createdAt' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// 静态方法 - 获取待上链的存证
ledgerProofSchema.statics.getPendingProofs = async function(villageId = null) {
  const query = {
    'blockchain.status': { $in: ['pending', 'failed'] }
  };

  if (villageId) {
    query.villageId = villageId;
  }

  return this.find(query)
    .sort({ createdAt: 1 })
    .limit(100)
    .populate('metadata.createdBy', 'username name')
    .populate('relatedId');
};

// 生成区块高度
ledgerProofSchema.statics.getNextBlockHeight = async function(villageId) {
  const lastProof = await this.getLastProof(villageId);
  return lastProof ? lastProof.blockHeight + 1 : 1;
};

// 生成签名
ledgerProofSchema.methods.generateSignature = function(privateKey) {
  const sign = crypto.createSign('SHA256');
  sign.update(this.dataHash);
  sign.end();

  this.signature.value = sign.sign(privateKey, 'hex');
  this.signature.timestamp = new Date();

  return this.signature.value;
};

// 验证签名
ledgerProofSchema.methods.verifySignature = function() {
  const verify = crypto.createVerify('SHA256');
  verify.update(this.dataHash);
  verify.end();

  return verify.verify(
    this.signature.publicKey,
    this.signature.value,
    'hex'
  );
};

// 中间件 - 保存前自动生成哈希
ledgerProofSchema.pre('save', function(next) {
  if (this.isNew) {
    // 生成数据哈希
    this.dataHash = this.generateDataHash();

    // 确保签名存在
    if (!this.signature.value) {
      // 生成临时签名（实际应用中应由客户端提供）
      this.signature.value = crypto
        .createHash('sha256')
        .update(this.dataHash + Date.now())
        .digest('hex');
    }
  }
  next();
});

module.exports = mongoose.model('LedgerProof', ledgerProofSchema);
