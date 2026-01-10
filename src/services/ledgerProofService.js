/**
 * 区块链存证服务
 * 提供数据上链存证、验证、查询等功能
 */

const LedgerProof = require('../models/LedgerProof');
const crypto = require('crypto');
const Logger = require('../utils/logger');
const axios = require('axios');

class LedgerProofService {
  constructor() {
    this.config = {
      // 本地链配置
      localChain: {
        enabled: true,
        difficulty: 2, // 前导零数量
        maxRetries: 3
      },
      // 以太坊配置
      ethereum: {
        enabled: process.env.ETHEREUM_ENABLED === 'true',
        rpcUrl: process.env.ETHEREUM_RPC_URL,
        contractAddress: process.env.FINANCE_CONTRACT_ADDRESS,
        chainId: process.env.ETHEREUM_CHAIN_ID || 1
      },
      // Hyperledger Fabric配置
      hyperledger: {
        enabled: process.env.HYPERLEDGER_ENABLED === 'true',
        apiUrl: process.env.HYPERLEDGER_API_URL,
        channelName: process.env.HYPERLEDGER_CHANNEL || 'finance-channel',
        chaincodeName: process.env.HYPERLEDGER_CHAINCODE || 'ledger-proof'
      },
      // 批量上链配置
      batch: {
        enabled: true,
        maxSize: 100, // 最大批量大小
        interval: 60000 // 60秒批量间隔
      }
    };

    // 批量上链队列
    this.batchQueue = [];
    this.batchTimer = null;
  }

  /**
   * 创建存证
   */
  async createProof(proofData) {
    try {
      const {
        villageId,
        proofType,
        relatedId,
        relatedModel,
        originalData,
        createdBy,
        signature = null,
        publicKey = null,
        blockchainType = 'local',
        metadata = {}
      } = proofData;

      // 获取最后一个存证（用于链接）
      const lastProof = await LedgerProof.getLastProof(villageId);
      const nextBlockHeight = await LedgerProof.getNextBlockHeight(villageId);

      // 生成签名（如果未提供）
      const signatureValue = signature;
      let publicKeyValue = publicKey;

      if (!signatureValue) {
        // 生成密钥对
        const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
          modulusLength: 2048,
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
          }
        });

        publicKeyValue = publicKey;
      }

      // 创建存证记录
      const proof = new LedgerProof({
        villageId,
        proofType,
        relatedId,
        relatedModel,
        originalData,
        previousHash: lastProof ? lastProof.dataHash : '0'.repeat(64),
        blockHeight: nextBlockHeight,
        signature: {
          algorithm: 'ECDSA',
          value: signatureValue || this.generateTempSignature(nextBlockHeight),
          publicKey: publicKeyValue || this.generateTempPublicKey(),
          signer: createdBy,
          timestamp: new Date()
        },
        blockchain: {
          type: blockchainType,
          networkId: 'village-ledger-main',
          status: blockchainType === 'local' ? 'confirmed' : 'pending'
        },
        metadata: {
          createdBy,
          ...metadata
        }
      });

      await proof.save();

      // 添加审计日志
      await proof.addAuditLog('created', createdBy, {
        blockHeight: nextBlockHeight,
        proofType,
        blockchainType
      });

      Logger.info('存证创建成功', {
        proofId: proof._id,
        proofType,
        blockHeight: nextBlockHeight,
        dataHash: proof.dataHash
      });

      return proof;
    } catch (error) {
      Logger.error('创建存证失败:', error);
      throw error;
    }
  }

  /**
   * 批量创建存证
   */
  async createBatchProofs(proofsData) {
    try {
      const results = [];
      const errors = [];

      for (const proofData of proofsData) {
        try {
          const proof = await this.createProof(proofData);
          results.push(proof);
        } catch (error) {
          errors.push({
            data: proofData,
            error: error.message
          });
        }
      }

      Logger.info('批量创建存证完成', {
        total: proofsData.length,
        success: results.length,
        failed: errors.length
      });

      return { proofs: results, errors };
    } catch (error) {
      Logger.error('批量创建存证失败:', error);
      throw error;
    }
  }

  /**
   * 验证单个存证
   */
  async verifyProof(proofId) {
    try {
      const proof = await LedgerProof.findById(proofId);
      if (!proof) {
        throw new Error('存证不存在');
      }

      const verification = proof.verifyIntegrity();
      const signatureValid = proof.verifySignature();

      return {
        proofId: proof._id,
        proofType: proof.proofType,
        blockHeight: proof.blockHeight,
        dataIntegrity: verification,
        signatureValid,
        isOnChain: proof.isOnChain,
        blockchainInfo: proof.chainInfo,
        verifiedAt: new Date()
      };
    } catch (error) {
      Logger.error('验证存证失败:', error);
      throw error;
    }
  }

  /**
   * 验证存证链完整性
   */
  async verifyChain(villageId) {
    try {
      const verification = await LedgerProof.verifyChain(villageId);

      Logger.info('存证链验证完成', {
        villageId,
        valid: verification.valid,
        totalBlocks: verification.totalBlocks
      });

      return verification;
    } catch (error) {
      Logger.error('验证存证链失败:', error);
      throw error;
    }
  }

  /**
   * 上传到区块链
   */
  async uploadToBlockchain(proofId, blockchainType = 'ethereum') {
    try {
      const proof = await LedgerProof.findById(proofId);
      if (!proof) {
        throw new Error('存证不存在');
      }

      if (proof.blockchain.status === 'confirmed') {
        throw new Error('存证已上链');
      }

      let result;

      switch (blockchainType) {
      case 'ethereum':
        result = await this.uploadToEthereum(proof);
        break;
      case 'hyperledger':
        result = await this.uploadToHyperledger(proof);
        break;
      case 'local':
      default:
        result = await this.uploadToLocal(proof);
        break;
      }

      // 更新存证状态
      proof.blockchain = {
        ...proof.blockchain,
        ...result.blockchainInfo,
        status: 'confirmed'
      };

      await proof.save();

      // 添加审计日志
      await proof.addAuditLog('synced', proof.metadata.createdBy, {
        blockchainType,
        transactionHash: result.blockchainInfo.transactionHash
      });

      Logger.info('存证上链成功', {
        proofId,
        blockchainType,
        transactionHash: result.blockchainInfo.transactionHash
      });

      return { proof, result };
    } catch (error) {
      Logger.error('上链失败:', error);

      // 更新失败状态
      if (proof) {
        proof.blockchain.status = 'failed';
        await proof.save();
        await proof.addAuditLog('failed', proof.metadata.createdBy, {
          error: error.message
        });
      }

      throw error;
    }
  }

  /**
   * 批量上链
   */
  async batchUploadToBlockchain(villageId = null, blockchainType = 'ethereum') {
    try {
      const pendingProofs = await LedgerProof.getPendingProofs(villageId);

      if (pendingProofs.length === 0) {
        return { message: '没有待上链的存证', uploaded: 0 };
      }

      const results = [];
      let successCount = 0;
      let failedCount = 0;

      for (const proof of pendingProofs) {
        try {
          const result = await this.uploadToBlockchain(proof._id, blockchainType);
          results.push({ proof, result });
          successCount++;
        } catch (error) {
          failedCount++;
          results.push({
            proof,
            error: error.message
          });
        }
      }

      Logger.info('批量上链完成', {
        total: pendingProofs.length,
        success: successCount,
        failed: failedCount
      });

      return {
        total: pendingProofs.length,
        success: successCount,
        failed: failedCount,
        results
      };
    } catch (error) {
      Logger.error('批量上链失败:', error);
      throw error;
    }
  }

  /**
   * 获取存证详情
   */
  async getProof(proofId) {
    try {
      const proof = await LedgerProof.findById(proofId)
        .populate('villageId', 'name')
        .populate('metadata.createdBy', 'username name')
        .populate('relatedId');

      if (!proof) {
        throw new Error('存证不存在');
      }

      return proof;
    } catch (error) {
      Logger.error('获取存证失败:', error);
      throw error;
    }
  }

  /**
   * 获取存证列表
   */
  async getProofs(filters = {}) {
    try {
      const {
        villageId,
        proofType,
        relatedId,
        onChainOnly = false,
        limit = 50,
        skip = 0
      } = filters;

      const query = {};

      if (villageId) query.villageId = villageId;
      if (proofType) query.proofType = proofType;
      if (relatedId) query.relatedId = relatedId;
      if (onChainOnly) query['blockchain.status'] = 'confirmed';

      const proofs = await LedgerProof.find(query)
        .sort({ blockHeight: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('villageId', 'name')
        .populate('metadata.createdBy', 'username name');

      const total = await LedgerProof.countDocuments(query);

      return {
        proofs,
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      };
    } catch (error) {
      Logger.error('获取存证列表失败:', error);
      throw error;
    }
  }

  /**
   * 按类型获取统计
   */
  async getStatsByType(villageId, days = 30) {
    try {
      const stats = await LedgerProof.getStatsByType(villageId, days);
      return stats;
    } catch (error) {
      Logger.error('获取统计失败:', error);
      throw error;
    }
  }

  /**
   * 生成Merkle树根哈希
   */
  generateMerkleRoot(hashes) {
    if (hashes.length === 0) return '';
    if (hashes.length === 1) return hashes[0];

    const newLevel = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = i + 1 < hashes.length ? hashes[i + 1] : left;

      const combined = left + right;
      const hash = crypto
        .createHash('sha256')
        .update(combined)
        .digest('hex');

      newLevel.push(hash);
    }

    return this.generateMerkleRoot(newLevel);
  }

  /**
   * 生成临时签名
   */
  generateTempSignature(blockHeight) {
    return crypto
      .createHash('sha256')
      .update(`block-${blockHeight}-${Date.now()}`)
      .digest('hex');
  }

  /**
   * 生成临时公钥
   */
  generateTempPublicKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 上传到本地链（开发/测试用）
   */
  async uploadToLocal(proof) {
    // 本地链实际上是立即确认的，在创建时已处理
    return {
      blockchainInfo: {
        type: 'local',
        networkId: 'village-ledger-main',
        transactionHash: proof.dataHash.substring(0, 64),
        blockNumber: proof.blockHeight,
        blockHash: proof.dataHash,
        confirmations: 1,
        gasUsed: 0,
        status: 'confirmed',
        confirmedAt: new Date()
      }
    };
  }

  /**
   * 上传到以太坊
   */
  async uploadToEthereum(proof) {
    if (!this.config.ethereum.enabled) {
      throw new Error('以太坊集成未启用');
    }

    // TODO: 实现实际的以太坊智能合约交互
    // 这里使用模拟实现
    const mockTxHash = `0x${  crypto.randomBytes(32).toString('hex')}`;
    const mockBlockNumber = Math.floor(Math.random() * 10000000) + 15000000;

    Logger.info('模拟以太坊上链', {
      proofId: proof._id,
      txHash: mockTxHash,
      blockNumber: mockBlockNumber
    });

    return {
      blockchainInfo: {
        type: 'ethereum',
        networkId: this.config.ethereum.chainId.toString(),
        transactionHash: mockTxHash,
        blockNumber: mockBlockNumber,
        blockHash: `0x${  crypto.randomBytes(32).toString('hex')}`,
        confirmations: 1,
        gasUsed: 50000,
        status: 'confirmed',
        confirmedAt: new Date()
      }
    };
  }

  /**
   * 上传到Hyperledger Fabric
   */
  async uploadToHyperledger(proof) {
    if (!this.config.hyperledger.enabled) {
      throw new Error('Hyperledger集成未启用');
    }

    // TODO: 实现实际的Hyperledger Fabric交互
    const mockTxHash = crypto.randomBytes(32).toString('hex');

    Logger.info('模拟Hyperledger上链', {
      proofId: proof._id,
      txHash: mockTxHash
    });

    return {
      blockchainInfo: {
        type: 'hyperledger',
        networkId: this.config.hyperledger.channelName,
        transactionHash: mockTxHash,
        blockNumber: proof.blockHeight,
        confirmations: 1,
        status: 'confirmed',
        confirmedAt: new Date()
      }
    };
  }

  /**
   * 获取区块链配置
   */
  getConfig() {
    return {
      localChain: this.config.localChain,
      ethereum: {
        enabled: this.config.ethereum.enabled,
        chainId: this.config.ethereum.chainId,
        contractAddress: this.config.ethereum.contractAddress
      },
      hyperledger: {
        enabled: this.config.hyperledger.enabled,
        channelName: this.config.hyperledger.channelName,
        chaincodeName: this.config.hyperledger.chaincodeName
      },
      batch: this.config.batch,
      supportedProofTypes: [
        'financial',
        'transaction',
        'contract',
        'decision',
        'announcement',
        'procurement',
        'subsidy',
        'reimbursement',
        'budget',
        'project_progress',
        'election',
        'voting'
      ],
      supportedBlockchainTypes: ['local', 'ethereum', 'hyperledger', 'fabric']
    };
  }

  /**
   * 添加到批量上链队列
   */
  addToBatchQueue(proofId) {
    this.batchQueue.push(proofId);

    if (this.batchQueue.length >= this.config.batch.maxSize) {
      this.processBatchQueue();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatchQueue();
      }, this.config.batch.interval);
    }
  }

  /**
   * 处理批量队列
   */
  async processBatchQueue() {
    if (this.batchQueue.length === 0) {
      return;
    }

    const proofsToProcess = [...this.batchQueue];
    this.batchQueue = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      await this.batchUploadToBlockchain(null, 'ethereum');
    } catch (error) {
      Logger.error('批量处理失败:', error);
      // 重新加入队列
      this.batchQueue.push(...proofsToProcess);
    }
  }
}

module.exports = new LedgerProofService();
