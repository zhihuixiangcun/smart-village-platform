/**
 * 区块链存证路由
 * 提供存证创建、验证、上链等API端点
 */

const express = require('express');
const router = express.Router();
const ledgerProofController = require('../controllers/ledgerProofController');
const { authenticate } = require('../middleware/auth');

// ============================================
// 存证创建
// ============================================

/**
 * @route   POST /api/ledger-proof
 * @desc    创建存证
 * @access  Private
 * @body    {
 *           villageId: string,
 *           proofType: string,
 *           relatedId: string,
 *           relatedModel: string,
 *           originalData: object,
 *           signature?: string,
 *           publicKey?: string,
 *           blockchainType?: string
 *         }
 */
router.post('/', authenticate, ledgerProofController.createProof);

/**
 * @route   POST /api/ledger-proof/batch
 * @desc    批量创建存证
 * @access  Private
 * @body    { proofs: Array }
 */
router.post('/batch', authenticate, ledgerProofController.createBatchProofs);

// ============================================
// 存证查询
// ============================================

/**
 * @route   GET /api/ledger-proof
 * @desc    获取存证列表
 * @access  Private
 * @query   villageId - 村庄ID
 * @query   proofType - 存证类型过滤
 * @query   relatedId - 关联数据ID
 * @query   onChainOnly - 仅显示已上链
 * @query   limit - 返回数量限制
 * @query   skip - 跳过数量
 */
router.get('/', authenticate, ledgerProofController.getProofs);

/**
 * @route   GET /api/ledger-proof/:id
 * @desc    获取存证详情
 * @access  Private
 */
router.get('/:id', authenticate, ledgerProofController.getProof);

/**
 * @route   GET /api/ledger-proof/village/:villageId/latest
 * @desc    获取村庄最新存证
 * @access  Private
 */
router.get('/village/:villageId/latest', authenticate, ledgerProofController.getLatestProof);

/**
 * @route   GET /api/ledger-proof/pending
 * @desc    获取待上链的存证
 * @access  Private (Admin)
 * @query   villageId - 村庄ID
 */
router.get('/pending/list', authenticate, ledgerProofController.getPendingProofs);

// ============================================
// 存证验证
// ============================================

/**
 * @route   POST /api/ledger-proof/:id/verify
 * @desc    验证单个存证
 * @access  Private
 */
router.post('/:id/verify', authenticate, ledgerProofController.verifyProof);

/**
 * @route   POST /api/ledger-proof/chain/:villageId/verify
 * @desc    验证存证链完整性
 * @access  Private
 */
router.post('/chain/:villageId/verify', authenticate, ledgerProofController.verifyChain);

// ============================================
// 区块链操作
// ============================================

/**
 * @route   POST /api/ledger-proof/:id/upload
 * @desc    上传存证到区块链
 * @access  Private (Admin)
 * @body    { blockchainType?: string }
 */
router.post('/:id/upload', authenticate, ledgerProofController.uploadToBlockchain);

/**
 * @route   POST /api/ledger-proof/batch/upload
 * @desc    批量上传到区块链
 * @access  Private (Admin)
 * @body    {
 *           villageId?: string,
 *           blockchainType?: string
 *         }
 */
router.post('/batch/upload', authenticate, ledgerProofController.batchUploadToBlockchain);

// ============================================
// 统计和配置
// ============================================

/**
 * @route   GET /api/ledger-proof/stats
 * @desc    获取存证统计
 * @access  Private
 * @query   villageId - 村庄ID
 * @query   days - 统计天数
 */
router.get('/stats/summary', authenticate, ledgerProofController.getStats);

/**
 * @route   GET /api/ledger-proof/config
 * @desc    获取区块链配置
 * @access  Private
 */
router.get('/config/info', authenticate, ledgerProofController.getConfig);

// ============================================
// 健康检查
// ============================================

/**
 * @route   GET /api/ledger-proof/health
 * @desc    健康检查
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'ledger-proof',
    status: 'operational',
    timestamp: new Date().toISOString(),
    features: {
      localChain: true,
      ethereum: process.env.ETHEREUM_ENABLED === 'true',
      hyperledger: process.env.HYPERLEDGER_ENABLED === 'true',
      batchUpload: true
    }
  });
});

// ============================================
// 特殊功能：财务流水存证
// ============================================

/**
 * @route   POST /api/ledger-proof/financial/create
 * @desc    创建财务流水存证（快捷方式）
 * @access  Private
 * @body    {
 *           villageId: string,
 *           financialRecordId: string,
 *           transactionData: object,
 *           blockchainType?: string
 *         }
 */
router.post('/financial/create', authenticate, async (req, res) => {
  try {
    const {
      villageId,
      financialRecordId,
      transactionData,
      blockchainType = 'local'
    } = req.body;

    if (!villageId || !financialRecordId || !transactionData) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段',
        required: ['villageId', 'financialRecordId', 'transactionData']
      });
    }

    const proof = await ledgerProofController.createProof({
      ...req,
      body: {
        villageId,
        proofType: 'financial',
        relatedId: financialRecordId,
        relatedModel: 'Finance',
        originalData: transactionData,
        blockchainType
      }
    });

    res.json(proof);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '创建财务存证失败',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/ledger-proof/reimbursement/create
 * @desc    创建报销记录存证（快捷方式）
 * @access  Private
 */
router.post('/reimbursement/create', authenticate, async (req, res) => {
  try {
    const {
      villageId,
      reimbursementId,
      reimbursementData,
      blockchainType = 'local'
    } = req.body;

    if (!villageId || !reimbursementId || !reimbursementData) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段',
        required: ['villageId', 'reimbursementId', 'reimbursementData']
      });
    }

    const proof = await ledgerProofController.createProof({
      ...req,
      body: {
        villageId,
        proofType: 'reimbursement',
        relatedId: reimbursementId,
        relatedModel: 'Reimbursement',
        originalData: reimbursementData,
        blockchainType
      }
    });

    res.json(proof);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '创建报销存证失败',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/ledger-proof/announcement/create
 * @desc    创建公告存证（快捷方式）
 * @access  Private
 */
router.post('/announcement/create', authenticate, async (req, res) => {
  try {
    const {
      villageId,
      announcementId,
      announcementData,
      blockchainType = 'local'
    } = req.body;

    if (!villageId || !announcementId || !announcementData) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段',
        required: ['villageId', 'announcementId', 'announcementData']
      });
    }

    const proof = await ledgerProofController.createProof({
      ...req,
      body: {
        villageId,
        proofType: 'announcement',
        relatedId: announcementId,
        relatedModel: 'Announcement',
        originalData: announcementData,
        blockchainType
      }
    });

    res.json(proof);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '创建公告存证失败',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/ledger-proof/budget/create
 * @desc    创建预算审批存证（快捷方式）
 * @access  Private
 */
router.post('/budget/create', authenticate, async (req, res) => {
  try {
    const {
      villageId,
      budgetId,
      budgetData,
      blockchainType = 'local'
    } = req.body;

    if (!villageId || !budgetId || !budgetData) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段',
        required: ['villageId', 'budgetId', 'budgetData']
      });
    }

    const proof = await ledgerProofController.createProof({
      ...req,
      body: {
        villageId,
        proofType: 'budget',
        relatedId: budgetId,
        relatedModel: 'Budget',
        originalData: budgetData,
        blockchainType
      }
    });

    res.json(proof);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '创建预算存证失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/ledger-proof/financial/:recordId
 * @desc    获取财务记录的存证
 * @access  Private
 */
router.get('/financial/:recordId', authenticate, async (req, res) => {
  try {
    const { recordId } = req.params;
    const LedgerProof = require('../models/LedgerProof');

    const proof = await LedgerProof.findOne({
      relatedId: recordId,
      relatedModel: 'Finance'
    })
      .populate('villageId', 'name')
      .populate('metadata.createdBy', 'username name');

    if (!proof) {
      return res.status(404).json({
        success: false,
        message: '未找到存证记录'
      });
    }

    res.json({
      success: true,
      data: proof
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取存证失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/ledger-proof/reimbursement/:reimbursementId
 * @desc    获取报销记录的存证
 * @access  Private
 */
router.get('/reimbursement/:reimbursementId', authenticate, async (req, res) => {
  try {
    const { reimbursementId } = req.params;
    const LedgerProof = require('../models/LedgerProof');

    const proof = await LedgerProof.findOne({
      relatedId: reimbursementId,
      relatedModel: 'Reimbursement'
    })
      .populate('villageId', 'name')
      .populate('metadata.createdBy', 'username name');

    if (!proof) {
      return res.status(404).json({
        success: false,
        message: '未找到存证记录'
      });
    }

    res.json({
      success: true,
      data: proof
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取存证失败',
      error: error.message
    });
  }
});

module.exports = router;
