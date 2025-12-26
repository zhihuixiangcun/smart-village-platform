/**
 * 区块链存证服务
 * 提供财务数据上链、验证、查询等功能
 */

const { BlockchainRecord } = require('../models/Finance');
const crypto = require('crypto');
const axios = require('axios');
const logger = require('../utils/logger');

class BlockchainService {
  constructor() {
    this.networks = {
      ethereum: {
        name: 'Ethereum Mainnet',
        rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
        chainId: 1,
        contractAddress: process.env.FINANCE_CONTRACT_ADDRESS
      },
      hyperledger: {
        name: 'Hyperledger Fabric',
        apiUrl: process.env.HYPERLEDGER_API_URL || 'http://localhost:7050',
        channelName: 'finance-channel',
        chaincodeName: 'finance-contract'
      },
      custom: {
        name: 'Custom Blockchain',
        apiUrl: process.env.CUSTOM_BLOCKCHAIN_API_URL || 'http://localhost:8080',
        apiKey: process.env.CUSTOM_BLOCKCHAIN_API_KEY
      }
    };
  }

  /**
   * 上传数据到区块链
   * @param {Object} data - 要上链的数据
   * @param {Object} config - 区块链配置
   * @returns {Promise<Object>} 上链结果
   */
  async uploadToBlockchain(data, config = {}) {
    try {
      const network = this.networks[config.blockchainType] || this.networks.ethereum;
      const dataHash = this.generateDataHash(data);

      let result;
      switch (config.blockchainType) {
      case 'ethereum':
        result = await this.uploadToEthereum(data, config);
        break;
      case 'hyperledger':
        result = await this.uploadToHyperledger(data, config);
        break;
      case 'custom':
        result = await this.uploadToCustomBlockchain(data, config);
        break;
      default:
        throw new Error(`不支持的区块链类型: ${config.blockchainType}`);
      }

      return {
        ...result,
        dataHash,
        blockchainType: config.blockchainType,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('区块链上链失败:', error);
      throw error;
    }
  }

  /**
   * 以太坊区块链上链
   * @param {Object} data - 数据
   * @param {Object} config - 配置
   * @returns {Promise<Object>} 上链结果
   */
  async uploadToEthereum(data, config) {
    try {
      const network = this.networks.ethereum;
      const dataHash = this.generateDataHash(data);

      // 构建交易数据
      const txData = {
        to: network.contractAddress,
        data: this.encodeTransactionData(dataHash, data),
        gas: config.gasLimit || 200000,
        gasPrice: config.gasPrice || await this.getGasPrice()
      };

      // 发送交易（这里需要集成web3.js或ethers.js）
      const txResult = await this.sendEthereumTransaction(txData, config);

      return {
        transactionHash: txResult.hash,
        blockNumber: txResult.blockNumber,
        contractAddress: network.contractAddress,
        gasUsed: txResult.gasUsed,
        gasPrice: txData.gasPrice,
        confirmations: await this.getTransactionConfirmations(txResult.hash)
      };

    } catch (error) {
      logger.error('以太坊上链失败:', error);
      throw error;
    }
  }

  /**
   * Hyperledger Fabric上链
   * @param {Object} data - 数据
   * @param {Object} config - 配置
   * @returns {Promise<Object>} 上链结果
   */
  async uploadToHyperledger(data, config) {
    try {
      const network = this.networks.hyperledger;
      const dataHash = this.generateDataHash(data);

      // 构建链码调用参数
      const invokeRequest = {
        chaincodeName: network.chaincodeName,
        channelName: network.channelName,
        fcn: 'storeFinancialData',
        args: [dataHash, JSON.stringify(data)],
        peers: config.peers || ['peer0.org1.example.com']
      };

      // 调用链码
      const response = await this.invokeHyperledgerChaincode(invokeRequest);

      return {
        transactionHash: response.txId,
        blockNumber: response.blockNumber,
        contractAddress: network.chaincodeName,
        confirmations: 1 // Hyperledger Fabric默认确认
      };

    } catch (error) {
      logger.error('Hyperledger上链失败:', error);
      throw error;
    }
  }

  /**
   * 自定义区块链上链
   * @param {Object} data - 数据
   * @param {Object} config - 配置
   * @returns {Promise<Object>} 上链结果
   */
  async uploadToCustomBlockchain(data, config) {
    try {
      const network = this.networks.custom;
      const dataHash = this.generateDataHash(data);

      const requestData = {
        data,
        hash: dataHash,
        metadata: config.metadata || {},
        timestamp: new Date().toISOString()
      };

      const response = await axios.post(`${network.apiUrl}/api/v1/transactions`, requestData, {
        headers: {
          'Authorization': `Bearer ${network.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        transactionHash: response.data.transactionHash,
        blockNumber: response.data.blockNumber,
        contractAddress: response.data.contractAddress || 'custom-contract',
        confirmations: response.data.confirmations || 1
      };

    } catch (error) {
      logger.error('自定义区块链上链失败:', error);
      throw error;
    }
  }

  /**
   * 验证区块链数据
   * @param {String} transactionHash - 交易哈希
   * @param {Object} originalData - 原始数据
   * @param {String} blockchainType - 区块链类型
   * @returns {Promise<Object>} 验证结果
   */
  async verifyBlockchainData(transactionHash, originalData, blockchainType) {
    try {
      const originalHash = this.generateDataHash(originalData);
      let blockchainData;

      switch (blockchainType) {
      case 'ethereum':
        blockchainData = await this.verifyEthereumTransaction(transactionHash);
        break;
      case 'hyperledger':
        blockchainData = await this.verifyHyperledgerTransaction(transactionHash);
        break;
      case 'custom':
        blockchainData = await this.verifyCustomTransaction(transactionHash);
        break;
      default:
        throw new Error(`不支持的区块链类型: ${blockchainType}`);
      }

      const isValid = blockchainData.storedHash === originalHash;
      const confirmations = blockchainData.confirmations || 0;

      return {
        isValid,
        originalHash,
        blockchainHash: blockchainData.storedHash,
        confirmations,
        blockNumber: blockchainData.blockNumber,
        timestamp: blockchainData.timestamp,
        verificationTime: new Date()
      };

    } catch (error) {
      logger.error('区块链数据验证失败:', error);
      return {
        isValid: false,
        error: error.message,
        verificationTime: new Date()
      };
    }
  }

  /**
   * 查询区块链记录
   * @param {String} transactionHash - 交易哈希
   * @param {String} blockchainType - 区块链类型
   * @returns {Promise<Object>} 查询结果
   */
  async queryBlockchainRecord(transactionHash, blockchainType) {
    try {
      const record = await BlockchainRecord.findOne({
        transactionHash,
        blockchain: blockchainType
      });

      if (!record) {
        throw new Error('未找到对应的区块链记录');
      }

      // 更新验证状态
      await this.updateVerificationStatus(record);

      return record;

    } catch (error) {
      logger.error('查询区块链记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取区块链统计信息
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Object>} 统计信息
   */
  async getBlockchainStatistics(filters = {}) {
    try {
      const matchStage = {};

      if (filters.blockchainType) {
        matchStage.blockchain = filters.blockchainType;
      }

      if (filters.dateRange) {
        matchStage.blockTimestamp = {
          $gte: new Date(filters.dateRange.start),
          $lte: new Date(filters.dateRange.end)
        };
      }

      const statistics = await BlockchainRecord.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              blockchain: '$blockchain',
              year: { $year: '$blockTimestamp' },
              month: { $month: '$blockTimestamp' }
            },
            totalRecords: { $sum: 1 },
            verifiedRecords: {
              $sum: { $cond: ['$verification.isVerified', 1, 0] }
            },
            totalGasUsed: { $sum: '$metadata.gasUsed' },
            avgConfirmations: { $avg: '$metadata.confirmations' }
          }
        },
        {
          $group: {
            _id: '$_id.blockchain',
            monthlyStats: {
              $push: {
                year: '$_id.year',
                month: '$_id.month',
                totalRecords: '$totalRecords',
                verifiedRecords: '$verifiedRecords'
              }
            },
            totalRecords: { $sum: '$totalRecords' },
            totalVerified: { $sum: '$verifiedRecords' },
            totalGasUsed: { $sum: '$totalGasUsed' },
            avgConfirmations: { $avg: '$avgConfirmations' }
          }
        }
      ]);

      return {
        blockchainStats: statistics,
        summary: {
          totalBlockchains: statistics.length,
          totalRecords: statistics.reduce((sum, stat) => sum + stat.totalRecords, 0),
          totalVerified: statistics.reduce((sum, stat) => sum + stat.totalVerified, 0),
          verificationRate: this.calculateVerificationRate(statistics)
        }
      };

    } catch (error) {
      logger.error('获取区块链统计失败:', error);
      throw error;
    }
  }

  /**
   * 批量验证区块链记录
   * @param {Array} recordIds - 记录ID数组
   * @returns {Promise<Object>} 批量验证结果
   */
  async batchVerifyRecords(recordIds) {
    try {
      const results = [];
      const records = await BlockchainRecord.find({ _id: { $in: recordIds } });

      for (const record of records) {
        try {
          const verification = await this.verifyBlockchainData(
            record.transactionHash,
            record.dataFingerprint,
            record.blockchain
          );

          results.push({
            recordId: record._id,
            transactionHash: record.transactionHash,
            isValid: verification.isValid,
            confirmations: verification.confirmations,
            error: verification.error
          });

          // 更新记录的验证状态
          record.verification.isVerified = verification.isValid;
          record.verification.verifiedAt = verification.verificationTime;
          record.verification.verificationAttempts += 1;
          record.verification.lastVerificationAt = verification.verificationTime;
          await record.save();

        } catch (error) {
          results.push({
            recordId: record._id,
            transactionHash: record.transactionHash,
            isValid: false,
            error: error.message
          });
        }
      }

      return {
        totalRecords: recordIds.length,
        verificationResults: results,
        successCount: results.filter(r => r.isValid).length,
        failureCount: results.filter(r => !r.isValid).length
      };

    } catch (error) {
      logger.error('批量验证失败:', error);
      throw error;
    }
  }

  /**
   * 生成数据指纹
   * @param {Object} data - 数据
   * @returns {String} SHA256哈希
   */
  generateDataHash(data) {
    const normalizedData = this.normalizeData(data);
    return crypto.createHash('sha256')
      .update(JSON.stringify(normalizedData))
      .digest('hex');
  }

  /**
   * 标准化数据格式
   * @param {Object} data - 原始数据
   * @returns {Object} 标准化后的数据
   */
  normalizeData(data) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    // 深度拷贝并排序键
    const normalized = {};
    const sortedKeys = Object.keys(data).sort();

    for (const key of sortedKeys) {
      if (data[key] !== null && typeof data[key] === 'object') {
        if (Array.isArray(data[key])) {
          normalized[key] = data[key].map(item => this.normalizeData(item));
        } else {
          normalized[key] = this.normalizeData(data[key]);
        }
      } else {
        normalized[key] = data[key];
      }
    }

    return normalized;
  }

  /**
   * 编码交易数据
   * @param {String} dataHash - 数据哈希
   * @param {Object} data - 原始数据
   * @returns {String} 编码后的数据
   */
  encodeTransactionData(dataHash, data) {
    // 这里需要根据智能合约的ABI来编码数据
    // 简化实现，实际项目中需要使用web3.eth.abi.encodeFunctionCall
    return `0x${dataHash}${Buffer.from(JSON.stringify(data)).toString('hex')}`;
  }

  /**
   * 发送以太坊交易
   * @param {Object} txData - 交易数据
   * @param {Object} config - 配置
   * @returns {Promise<Object>} 交易结果
   */
  async sendEthereumTransaction(txData, config) {
    // 这里需要集成web3.js或ethers.js
    // 简化实现，返回模拟结果
    return {
      hash: `0x${crypto.randomBytes(32).toString('hex')}`,
      blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
      gasUsed: txData.gas - Math.floor(Math.random() * 10000),
      cumulativeGasUsed: txData.gas,
      status: 1
    };
  }

  /**
   * 获取以太坊Gas价格
   * @returns {Promise<String>} Gas价格
   */
  async getGasPrice() {
    try {
      const response = await axios.get('https://ethgasstation.info/api/ethgasAPI.json');
      return response.data.average.toString();
    } catch (error) {
      // 默认Gas价格
      return '20000000000'; // 20 Gwei
    }
  }

  /**
   * 获取交易确认数
   * @param {String} transactionHash - 交易哈希
   * @returns {Promise<Number>} 确认数
   */
  async getTransactionConfirmations(transactionHash) {
    try {
      // 这里需要查询最新的区块号
      const latestBlockNumber = 18000000; // 模拟数据
      const txBlockNumber = 17999990; // 模拟数据
      return Math.max(0, latestBlockNumber - txBlockNumber);
    } catch (error) {
      return 0;
    }
  }

  /**
   * 调用Hyperledger链码
   * @param {Object} invokeRequest - 调用请求
   * @returns {Promise<Object>} 调用结果
   */
  async invokeHyperledgerChaincode(invokeRequest) {
    try {
      const response = await axios.post(
        `${this.networks.hyperledger.apiUrl}/api/v1/invoke`,
        invokeRequest
      );

      return {
        txId: response.data.transactionId,
        blockNumber: response.data.blockNumber,
        status: response.data.status
      };

    } catch (error) {
      throw new Error(`Hyperledger链码调用失败: ${error.message}`);
    }
  }

  /**
   * 验证以太坊交易
   * @param {String} transactionHash - 交易哈希
   * @returns {Promise<Object>} 验证结果
   */
  async verifyEthereumTransaction(transactionHash) {
    try {
      // 这里需要调用以太坊节点的eth_getTransactionReceipt
      // 简化实现，返回模拟数据
      return {
        storedHash: `0x${crypto.randomBytes(32).toString('hex')}`,
        blockNumber: 17999990,
        timestamp: new Date(),
        confirmations: 10
      };

    } catch (error) {
      throw new Error(`以太坊交易验证失败: ${error.message}`);
    }
  }

  /**
   * 验证Hyperledger交易
   * @param {String} transactionHash - 交易哈希
   * @returns {Promise<Object>} 验证结果
   */
  async verifyHyperledgerTransaction(transactionHash) {
    try {
      const response = await axios.get(
        `${this.networks.hyperledger.apiUrl}/api/v1/transaction/${transactionHash}`
      );

      return {
        storedHash: response.data.hash,
        blockNumber: response.data.blockNumber,
        timestamp: new Date(response.data.timestamp),
        confirmations: 1
      };

    } catch (error) {
      throw new Error(`Hyperledger交易验证失败: ${error.message}`);
    }
  }

  /**
   * 验证自定义区块链交易
   * @param {String} transactionHash - 交易哈希
   * @returns {Promise<Object>} 验证结果
   */
  async verifyCustomTransaction(transactionHash) {
    try {
      const response = await axios.get(
        `${this.networks.custom.apiUrl}/api/v1/transactions/${transactionHash}`,
        {
          headers: {
            'Authorization': `Bearer ${this.networks.custom.apiKey}`
          }
        }
      );

      return {
        storedHash: response.data.hash,
        blockNumber: response.data.blockNumber,
        timestamp: new Date(response.data.timestamp),
        confirmations: response.data.confirmations || 1
      };

    } catch (error) {
      throw new Error(`自定义区块链交易验证失败: ${error.message}`);
    }
  }

  /**
   * 更新验证状态
   * @param {Object} record - 区块链记录
   */
  async updateVerificationStatus(record) {
    try {
      const verification = await this.verifyBlockchainData(
        record.transactionHash,
        record.dataFingerprint,
        record.blockchain
      );

      record.verification.isVerified = verification.isValid;
      record.verification.verifiedAt = verification.verificationTime;
      record.verification.verificationAttempts += 1;
      record.verification.lastVerificationAt = verification.verificationTime;
      record.metadata.confirmations = verification.confirmations;

      await record.save();

    } catch (error) {
      logger.error('更新验证状态失败:', error);
    }
  }

  /**
   * 计算验证率
   * @param {Array} statistics - 统计数据
   * @returns {Number} 验证率百分比
   */
  calculateVerificationRate(statistics) {
    const totalRecords = statistics.reduce((sum, stat) => sum + stat.totalRecords, 0);
    const totalVerified = statistics.reduce((sum, stat) => sum + stat.totalVerified, 0);

    return totalRecords > 0 ? Math.round((totalVerified / totalRecords) * 100) : 0;
  }
}

module.exports = new BlockchainService();