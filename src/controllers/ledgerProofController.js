/**
 * 区块链存证控制器
 * 处理存证相关的API请求
 */

const ledgerProofService = require('../services/ledgerProofService');
const Logger = require('../utils/logger');

/**
 * 创建存证
 */
async function createProof(req, res) {
  try {
    const {
      villageId,
      proofType,
      relatedId,
      relatedModel,
      originalData,
      signature,
      publicKey,
      blockchainType
    } = req.body;

    // 验证必填字段
    if (!villageId || !proofType || !relatedId || !relatedModel || !originalData) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段',
        required: ['villageId', 'proofType', 'relatedId', 'relatedModel', 'originalData']
      });
    }

    const proof = await ledgerProofService.createProof({
      villageId,
      proofType,
      relatedId,
      relatedModel,
      originalData,
      createdBy: req.user._id,
      signature,
      publicKey,
      blockchainType: blockchainType || 'local',
      metadata: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceId: req.headers['x-device-id']
      }
    });

    res.status(201).json({
      success: true,
      message: '存证创建成功',
      data: {
        proofId: proof._id,
        proofType: proof.proofType,
        blockHeight: proof.blockHeight,
        dataHash: proof.dataHash,
        blockchainStatus: proof.blockchain.status,
        createdAt: proof.createdAt
      }
    });
  } catch (error) {
    Logger.error('创建存证失败:', error);
    res.status(500).json({
      success: false,
      message: '创建存证失败',
      error: error.message
    });
  }
}

/**
 * 批量创建存证
 */
async function createBatchProofs(req, res) {
  try {
    const { proofs } = req.body;

    if (!Array.isArray(proofs) || proofs.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供存证数据数组'
      });
    }

    if (proofs.length > 100) {
      return res.status(400).json({
        success: false,
        message: '单次批量创建最多100个存证'
      });
    }

    // 补充创建者信息
    const proofsWithCreator = proofs.map(p => ({
      ...p,
      createdBy: req.user._id,
      metadata: {
        ...p.metadata,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceId: req.headers['x-device-id']
      }
    }));

    const result = await ledgerProofService.createBatchProofs(proofsWithCreator);

    res.json({
      success: true,
      message: `批量创建完成，成功 ${result.proofs.length} 个`,
      data: {
        created: result.proofs.length,
        failed: result.errors.length,
        proofs: result.proofs.map(p => ({
          proofId: p._id,
          blockHeight: p.blockHeight,
          dataHash: p.dataHash
        })),
        errors: result.errors
      }
    });
  } catch (error) {
    Logger.error('批量创建存证失败:', error);
    res.status(500).json({
      success: false,
      message: '批量创建失败',
      error: error.message
    });
  }
}

/**
 * 获取存证详情
 */
async function getProof(req, res) {
  try {
    const { id } = req.params;

    const proof = await ledgerProofService.getProof(id);

    res.json({
      success: true,
      data: proof
    });
  } catch (error) {
    Logger.error('获取存证失败:', error);
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * 获取存证列表
 */
async function getProofs(req, res) {
  try {
    const {
      villageId,
      proofType,
      relatedId,
      onChainOnly,
      limit = 50,
      skip = 0
    } = req.query;

    // 检查权限
    if (villageId && !req.user.roles?.includes('admin')) {
      // 非管理员只能查询自己村庄的数据
      if (villageId !== req.user.villageId?.toString()) {
        return res.status(403).json({
          success: false,
          message: '无权访问其他村庄的数据'
        });
      }
    }

    const result = await ledgerProofService.getProofs({
      villageId: villageId || req.user.villageId,
      proofType,
      relatedId,
      onChainOnly: onChainOnly === 'true',
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    Logger.error('获取存证列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取列表失败',
      error: error.message
    });
  }
}

/**
 * 验证存证
 */
async function verifyProof(req, res) {
  try {
    const { id } = req.params;

    const verification = await ledgerProofService.verifyProof(id);

    res.json({
      success: true,
      message: '验证完成',
      data: verification
    });
  } catch (error) {
    Logger.error('验证存证失败:', error);
    res.status(500).json({
      success: false,
      message: '验证失败',
      error: error.message
    });
  }
}

/**
 * 验证存证链
 */
async function verifyChain(req, res) {
  try {
    const { villageId } = req.params;

    // 检查权限
    if (!req.user.roles?.includes('admin') &&
        villageId !== req.user.villageId?.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权验证其他村庄的存证链'
      });
    }

    const verification = await ledgerProofService.verifyChain(villageId);

    res.json({
      success: true,
      message: '存证链验证完成',
      data: verification
    });
  } catch (error) {
    Logger.error('验证存证链失败:', error);
    res.status(500).json({
      success: false,
      message: '验证失败',
      error: error.message
    });
  }
}

/**
 * 上传到区块链
 */
async function uploadToBlockchain(req, res) {
  try {
    const { id } = req.params;
    const { blockchainType = 'ethereum' } = req.body;

    // 检查权限
    if (!req.user.roles?.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: '只有管理员可以执行上链操作'
      });
    }

    const result = await ledgerProofService.uploadToBlockchain(id, blockchainType);

    res.json({
      success: true,
      message: '上链成功',
      data: result
    });
  } catch (error) {
    Logger.error('上链失败:', error);
    res.status(500).json({
      success: false,
      message: '上链失败',
      error: error.message
    });
  }
}

/**
 * 批量上链
 */
async function batchUploadToBlockchain(req, res) {
  try {
    const { villageId, blockchainType = 'ethereum' } = req.body;

    // 检查权限
    if (!req.user.roles?.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: '只有管理员可以执行上链操作'
      });
    }

    const result = await ledgerProofService.batchUploadToBlockchain(
      villageId || null,
      blockchainType
    );

    res.json({
      success: true,
      message: '批量上链完成',
      data: result
    });
  } catch (error) {
    Logger.error('批量上链失败:', error);
    res.status(500).json({
      success: false,
      message: '批量上链失败',
      error: error.message
    });
  }
}

/**
 * 获取统计数据
 */
async function getStats(req, res) {
  try {
    const { villageId, days = 30 } = req.query;

    // 检查权限
    const targetVillageId = villageId || req.user.villageId;
    if (!req.user.roles?.includes('admin') &&
        targetVillageId !== req.user.villageId?.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权查看其他村庄的统计'
      });
    }

    const stats = await ledgerProofService.getStatsByType(
      targetVillageId,
      parseInt(days)
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    Logger.error('获取统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计失败',
      error: error.message
    });
  }
}

/**
 * 获取配置
 */
async function getConfig(req, res) {
  try {
    const config = ledgerProofService.getConfig();

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    Logger.error('获取配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置失败',
      error: error.message
    });
  }
}

/**
 * 获取待上链的存证
 */
async function getPendingProofs(req, res) {
  try {
    const { villageId } = req.query;

    // 检查权限
    const targetVillageId = villageId || req.user.villageId;
    if (!req.user.roles?.includes('admin') &&
        targetVillageId !== req.user.villageId?.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权查看其他村庄的数据'
      });
    }

    const LedgerProof = require('../models/LedgerProof');
    const proofs = await LedgerProof.getPendingProofs(targetVillageId);

    res.json({
      success: true,
      data: proofs
    });
  } catch (error) {
    Logger.error('获取待上链存证失败:', error);
    res.status(500).json({
      success: false,
      message: '获取失败',
      error: error.message
    });
  }
}

/**
 * 获取最新存证
 */
async function getLatestProof(req, res) {
  try {
    const { villageId } = req.params;

    const LedgerProof = require('../models/LedgerProof');
    const proof = await LedgerProof.getLastProof(villageId);

    res.json({
      success: true,
      data: proof
    });
  } catch (error) {
    Logger.error('获取最新存证失败:', error);
    res.status(500).json({
      success: false,
      message: '获取失败',
      error: error.message
    });
  }
}

module.exports = {
  createProof,
  createBatchProofs,
  getProof,
  getProofs,
  verifyProof,
  verifyChain,
  uploadToBlockchain,
  batchUploadToBlockchain,
  getStats,
  getConfig,
  getPendingProofs,
  getLatestProof
};
