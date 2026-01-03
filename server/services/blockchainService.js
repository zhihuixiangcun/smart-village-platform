/**
 * 区块链存证服务
 * 提供数据上链、存证验证、哈希计算等功能
 */

const BlockchainRecord = require('../models/BlockchainRecord');
const SecurityAudit = require('../models/SecurityAudit');
const dataEncryptionService = require('./dataEncryptionService');

class BlockchainService {
  constructor() {
    // 区块链网络配置（示例使用私有链）
    this.config = {
      networkType: 'private', // mainnet, testnet, private
      chainId: '1',
      nodeUrl: process.env.BLOCKCHAIN_NODE_URL || 'http://localhost:8545',
      contractAddress: process.env.BLOCKCHAIN_CONTRACT_ADDRESS || '',
      gasPrice: process.env.GAS_PRICE || '20000000000', // 20 Gwei
      gasLimit: process.env.GAS_LIMIT || '200000',
      accountAddress: process.env.BLOCKCHAIN_ACCOUNT_ADDRESS || '',
      accountPrivateKey: process.env.BLOCKCHAIN_ACCOUNT_PRIVATE_KEY || ''
    };

    // Web3实例（可选，如果安装了web3.js）
    this.web3 = null;
    this.initWeb3();
  }

  /**
   * 初始化Web3
   */
  initWeb3() {
    try {
      // 动态导入web3（如果项目已安装）
      const Web3 = require('web3');
      if (Web3) {
        this.web3 = new Web3(this.config.nodeUrl);
        console.log('Web3 initialized successfully');
      }
    } catch (error) {
      console.log('Web3 not available, using mock blockchain operations');
    }
  }

  /**
   * 创建存证记录
   * @param {Object} data - 存证数据
   * @returns {Object} 存证记录
   */
  async createRecord(data) {
    try {
      const {
        recordType,
        recordTypeName,
        businessData,
        rawData,
        metadata
      } = data;

      // 计算数据哈希
      const dataHash = dataEncryptionService.calculateHash({
        recordType,
        businessData,
        rawData,
        timestamp: new Date().toISOString()
      });

      // 创建存证记录
      const record = await BlockchainRecord.createRecord({
        recordType,
        recordTypeName,
        businessData,
        rawData,
        dataHash,
        hashAlgorithm: 'sha256',
        blockchainInfo: {
          chainId: this.config.chainId,
          networkType: this.config.networkType
        },
        metadata: {
          ...metadata,
          createdBy: metadata?.createdBy,
          creatorName: metadata?.creatorName,
          villageId: metadata?.villageId
        }
      });

      // 记录审计日志
      if (metadata?.createdBy) {
        await SecurityAudit.log({
          operationType: 'blockchain_record',
          operationName: '创建区块链存证',
          operator: {
            userId: metadata.createdBy,
            userName: metadata.creatorName || 'System'
          },
          ipAddress: metadata.ip || 'unknown',
          operationDetails: {
            recordType,
            recordId: record._id,
            businessId: businessData?.businessId
          },
          sensitivityLevel: 'medium',
          result: 'success'
        });
      }

      return {
        success: true,
        message: '存证记录创建成功',
        record
      };
    } catch (error) {
      console.error('Error creating blockchain record:', error);
      return {
        success: false,
        message: '创建存证记录失败',
        error: error.message
      };
    }
  }

  /**
   * 上链存证
   * @param {String} recordId - 记录ID
   * @returns {Object} 上链结果
   */
  async uploadToChain(recordId) {
    try {
      const record = await BlockchainRecord.findById(recordId);

      if (!record) {
        return {
          success: false,
          message: '记录不存在'
        };
      }

      if (record.chainStatus === 'confirmed') {
        return {
          success: true,
          message: '记录已上链',
          record
        };
      }

      // 如果配置了Web3，尝试真实上链
      if (this.web3) {
        return await this.realUploadToChain(record);
      } else {
        // 使用模拟上链
        return await this.mockUploadToChain(record);
      }
    } catch (error) {
      console.error('Error uploading to chain:', error);

      // 记录失败
      await BlockchainRecord.findByIdAndUpdate(recordId, {
        chainStatus: 'failed',
        errorMessage: error.message
      });

      return {
        success: false,
        message: '上链失败',
        error: error.message
      };
    }
  }

  /**
   * 真实上链（使用Web3）
   * @param {Object} record - 存证记录
   * @returns {Object} 上链结果
   */
  async realUploadToChain(record) {
    try {
      // 构建交易数据
      const txData = this.web3.eth.abi.encodeParameter('string', record.dataHash);

      // 发送交易
      const txHash = await this.web3.eth.sendTransaction({
        from: this.config.accountAddress,
        to: this.config.contractAddress,
        data: txData,
        gas: this.config.gasLimit,
        gasPrice: this.config.gasPrice
      });

      // 获取交易收据
      const receipt = await this.web3.eth.getTransactionReceipt(txHash.transactionHash);

      // 更新记录
      await record.updateBlockchainInfo({
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        transactionIndex: receipt.transactionIndex,
        gasUsed: receipt.gasUsed,
        chainId: this.config.chainId,
        networkType: this.config.networkType
      });

      return {
        success: true,
        message: '上链成功',
        record,
        txHash: receipt.transactionHash
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 模拟上链
   * @param {Object} record - 存证记录
   * @returns {Object} 上链结果
   */
  async mockUploadToChain(record) {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 生成模拟的交易信息
    const txHash = `0x${this.generateRandomHex(64)}`;
    const blockHash = `0x${this.generateRandomHex(64)}`;
    const blockNumber = Math.floor(Date.now() / 1000);

    await record.updateBlockchainInfo({
      transactionHash: txHash,
      blockNumber,
      blockHash,
      transactionIndex: Math.floor(Math.random() * 10),
      gasUsed: Math.floor(Math.random() * 100000) + 21000,
      chainId: this.config.chainId,
      networkType: this.config.networkType
    });

    return {
      success: true,
      message: '上链成功（模拟）',
      record,
      txHash
    };
  }

  /**
   * 验证存证
   * @param {String} recordId - 记录ID
   * @returns {Object} 验证结果
   */
  async verifyRecord(recordId) {
    try {
      const record = await BlockchainRecord.findById(recordId);

      if (!record) {
        return {
          success: false,
          message: '记录不存在'
        };
      }

      // 验证数据完整性
      await record.verifyIntegrity();

      const isValid = record.verificationResult.isValid;

      return {
        success: true,
        isValid,
        message: isValid ? '验证通过，数据未被篡改' : '验证失败，数据可能已被篡改',
        verificationResult: record.verificationResult,
        record
      };
    } catch (error) {
      console.error('Error verifying record:', error);
      return {
        success: false,
        message: '验证失败',
        error: error.message
      };
    }
  }

  /**
   * 批量验证存证
   * @param {Array} recordIds - 记录ID列表
   * @returns {Object} 验证结果
   */
  async batchVerify(recordIds) {
    try {
      const results = await BlockchainRecord.batchVerify(recordIds);

      return {
        success: true,
        totalRecords: results.length,
        verifiedRecords: results.filter(r => r.isValid).length,
        tamperedRecords: results.filter(r => !r.isValid).length,
        details: results
      };
    } catch (error) {
      return {
        success: false,
        message: '批量验证失败',
        error: error.message
      };
    }
  }

  /**
   * 生成存证证书
   * @param {String} recordId - 记录ID
   * @returns {Object} 证书信息
   */
  async generateCertificate(recordId) {
    try {
      const record = await BlockchainRecord.findById(recordId);

      if (!record) {
        return {
          success: false,
          message: '记录不存在'
        };
      }

      // 生成证书
      await record.generateCertificate();

      // 记录审计日志
      await SecurityAudit.log({
        operationType: 'blockchain_verify',
        operationName: '生成存证证书',
        operator: {
          userId: record.metadata?.createdBy,
          userName: record.metadata?.creatorName
        },
        ipAddress: 'system',
        operationDetails: {
          recordId,
          certificateNo: record.certificate.certificateNo
        },
        sensitivityLevel: 'low',
        result: 'success'
      });

      return {
        success: true,
        message: '证书生成成功',
        certificate: record.certificate,
        record
      };
    } catch (error) {
      console.error('Error generating certificate:', error);
      return {
        success: false,
        message: '证书生成失败',
        error: error.message
      };
    }
  }

  /**
   * 获取业务数据的存证记录
   * @param {String} businessType - 业务类型
   * @param {String} businessId - 业务ID
   * @returns {Array} 存证记录列表
   */
  async getBusinessRecords(businessType, businessId) {
    try {
      const records = await BlockchainRecord.getBusinessRecords(businessType, businessId);

      return {
        success: true,
        totalRecords: records.length,
        records
      };
    } catch (error) {
      return {
        success: false,
        message: '查询失败',
        error: error.message
      };
    }
  }

  /**
   * 验证业务数据完整性
   * @param {String} businessType - 业务类型
   * @param {String} businessId - 业务ID
   * @returns {Object} 验证结果
   */
  async verifyBusinessData(businessType, businessId) {
    try {
      const verification = await BlockchainRecord.verifyBusinessData(businessType, businessId);

      return {
        success: true,
        ...verification
      };
    } catch (error) {
      return {
        success: false,
        message: '验证失败',
        error: error.message
      };
    }
  }

  /**
   * 获取上链统计
   * @param {Date} startDate - 开始日期
   * @param {Date} endDate - 结束日期
   * @returns {Object} 统计数据
   */
  async getStats(startDate, endDate) {
    try {
      const stats = await BlockchainRecord.getChainStats(startDate, endDate);

      const totalRecords = await BlockchainRecord.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const confirmedRecords = await BlockchainRecord.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
        chainStatus: 'confirmed'
      });

      const pendingRecords = await BlockchainRecord.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
        chainStatus: 'pending'
      });

      const failedRecords = await BlockchainRecord.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
        chainStatus: 'failed'
      });

      return {
        success: true,
        summary: {
          totalRecords,
          confirmedRecords,
          pendingRecords,
          failedRecords,
          successRate: totalRecords > 0 ? ((confirmedRecords / totalRecords) * 100).toFixed(2) + '%' : '0%'
        },
        byType: stats
      };
    } catch (error) {
      return {
        success: false,
        message: '获取统计失败',
        error: error.message
      };
    }
  }

  /**
   * 生成存证报告
   * @param {Date} startDate - 开始日期
   * @param {Date} endDate - 结束日期
   * @returns {Object} 存证报告
   */
  async generateReport(startDate, endDate) {
    try {
      const report = await BlockchainRecord.generateReport(startDate, endDate);

      return {
        success: true,
        report
      };
    } catch (error) {
      return {
        success: false,
        message: '生成报告失败',
        error: error.message
      };
    }
  }

  /**
   * 处理待重试的上链记录
   * @returns {Object} 处理结果
   */
  async processPendingRetries() {
    try {
      const pendingRecords = await BlockchainRecord.getPendingRetries();

      const results = {
        success: 0,
        failed: 0,
        total: pendingRecords.length
      };

      for (const record of pendingRecords) {
        try {
          await this.uploadToChain(record._id);
          results.success++;
        } catch (error) {
          await record.retryChain();
          results.failed++;
        }
      }

      return {
        success: true,
        ...results
      };
    } catch (error) {
      return {
        success: false,
        message: '处理重试失败',
        error: error.message
      };
    }
  }

  /**
   * 查询存证记录
   * @param {Object} filters - 过滤条件
   * @returns {Object} 查询结果
   */
  async queryRecords(filters = {}) {
    try {
      const {
        recordType,
        chainStatus,
        verificationStatus,
        businessType,
        businessId,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      const query = {};

      if (recordType) query.recordType = recordType;
      if (chainStatus) query.chainStatus = chainStatus;
      if (verificationStatus) query.verificationStatus = verificationStatus;
      if (businessType) query['businessData.businessType'] = businessType;
      if (businessId) query['businessData.businessId'] = businessId;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [records, total] = await Promise.all([
        BlockchainRecord.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        BlockchainRecord.countDocuments(query)
      ]);

      return {
        success: true,
        data: records,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      return {
        success: false,
        message: '查询失败',
        error: error.message
      };
    }
  }

  /**
   * 生成随机十六进制字符串
   * @param {Number} length - 长度
   * @returns {String} 十六进制字符串
   */
  generateRandomHex(length) {
    let result = '';
    const characters = '0123456789abcdef';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  /**
   * 获取区块链网络信息
   * @returns {Object} 网络信息
   */
  async getNetworkInfo() {
    try {
      const info = {
        networkType: this.config.networkType,
        chainId: this.config.chainId,
        nodeUrl: this.config.nodeUrl,
        contractAddress: this.config.contractAddress,
        web3Enabled: !!this.web3
      };

      // 如果启用了Web3，获取网络信息
      if (this.web3) {
        try {
          const networkId = await this.web3.eth.net.getId();
          const blockNumber = await this.web3.eth.getBlockNumber();
          info.networkId = networkId;
          info.latestBlock = blockNumber;
        } catch (error) {
          console.error('Error getting network info:', error);
        }
      }

      return {
        success: true,
        info
      };
    } catch (error) {
      return {
        success: false,
        message: '获取网络信息失败',
        error: error.message
      };
    }
  }
}

// 导出单例
module.exports = new BlockchainService();
