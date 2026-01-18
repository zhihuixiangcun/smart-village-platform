/**
 * 财务透明化管理控制器
 * 处理区块链存证、智能票据OCR识别、村民财务查询权限、预算审批流程等
 *
 * 注意: 此模块依赖 Finance 模型和相关服务
 * 如需启用财务功能，请确保以下文件存在并正确配置:
 * - src/models/Finance.js (已存在)
 * - src/services/blockchainService.js (待实现)
 * - src/services/invoiceOCRService.js (待实现)
 * - src/services/villageFinanceService.js (待实现)
 */

const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const logger = require('../utils/logger');

// 尝试加载依赖模块
let FinancialTransaction, BlockchainRecord, InvoiceOCR, BudgetApproval, VillageFinanceAccess;
let blockchainService, invoiceOCRService, villageFinanceService;
let financeModuleEnabled = false;

try {
  const financeModels = require('../models/Finance');
  FinancialTransaction = financeModels.FinancialTransaction;
  BlockchainRecord = financeModels.BlockchainRecord;
  InvoiceOCR = financeModels.InvoiceOCR;
  BudgetApproval = financeModels.BudgetApproval;
  VillageFinanceAccess = financeModels.VillageFinanceAccess;

  // 尝试加载服务模块
  blockchainService = require('../services/blockchainService');
  invoiceOCRService = require('../services/invoiceOCRService');
  villageFinanceService = require('../services/villageFinanceService');

  financeModuleEnabled = true;
  logger.info('财务管理模块已启用');
} catch (error) {
  logger.warn('财务管理模块未完全启用，部分服务缺失:', error.message);
  financeModuleEnabled = false;
}

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads/finance');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (error) {
  logger.error('创建上传目录失败:', error);
}

// 安全的文件名生成函数
function generateSafeFileName(originalName, userId) {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(8).toString('hex');
  // 只保留文件扩展名中的安全字符
  const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, '');
  return `${userId}_${timestamp}_${randomStr}${safeExt}`;
}

// 验证文件路径安全性 - 防止路径遍历攻击
function isPathSafe(fileName) {
  const normalized = path.normalize(fileName);
  return !normalized.includes('..') &&
         !path.isAbsolute(normalized) &&
         !normalized.startsWith('/') &&
         !normalized.startsWith('\\') &&
         !normalized.includes(':\\') &&  // Windows 绝对路径
         !fileName.includes('\0');  // 空字节注入
}

// 文件上传配置 - 使用磁盘存储更安全
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user?._id?.toString() || 'anonymous';
    const safeFileName = generateSafeFileName(file.originalname, userId);
    cb(null, safeFileName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // 验证文件名安全性 - 防止路径遍历
    if (!isPathSafe(file.originalname)) {
      return cb(new Error('文件名包含非法字符'));
    }

    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持 JPEG、JPG、PNG 和 PDF 格式的文件'));
    }
  }
});

/**
 * 通用响应函数 - 模块未启用时返回
 */
function moduleNotEnabledResponse(res, action = '此操作') {
  return res.status(503).json({
    success: false,
    error: 'SERVICE_NOT_AVAILABLE',
    message: `财务管理功能暂不可用，${action}无法执行`,
    details: '财务管理模块需要完整的服务配置，请联系管理员启用相关服务',
    requiredServices: [
      'src/models/Finance.js',
      'src/services/blockchainService.js',
      'src/services/invoiceOCRService.js',
      'src/services/villageFinanceService.js'
    ]
  });
}

/**
 * 财务交易管理
 */

// 创建财务交易
async function createTransaction(req, res) {
  if (!financeModuleEnabled || !FinancialTransaction) {
    return moduleNotEnabledResponse(res, '创建财务交易');
  }

  try {
    const {
      transactionType,
      category,
      amount,
      description,
      parties,
      relatedBudget,
      relatedProject
    } = req.body;

    // 生成交易编号
    const transactionNumber = await FinancialTransaction.generateTransactionNumber(
      transactionType,
      req.user.village?.villageId
    );

    const transaction = new FinancialTransaction({
      transactionInfo: {
        transactionNumber,
        transactionType,
        category,
        amount: parseFloat(amount),
        transactionDate: new Date(req.body.transactionDate || Date.now()),
        description
      },
      parties: parties || {},
      createdBy: {
        userId: req.user._id,
        userName: req.user.profile?.displayName || req.user.username,
        department: req.user.department
      },
      relatedBudget: relatedBudget || {},
      relatedProject: relatedProject || {},
      status: 'draft'
    });

    await transaction.save();

    res.status(201).json({
      success: true,
      message: '财务交易创建成功',
      data: transaction
    });

  } catch (error) {
    logger.error('创建财务交易失败:', error);
    res.status(500).json({
      success: false,
      error: 'CREATION_FAILED',
      message: '创建财务交易失败',
      details: error.message
    });
  }
}

// 提交交易审批
async function submitTransactionForApproval(req, res) {
  if (!financeModuleEnabled || !FinancialTransaction) {
    return moduleNotEnabledResponse(res, '提交交易审批');
  }

  try {
    const { transactionId } = req.params;
    const { attachments } = req.body;

    const transaction = await FinancialTransaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'TRANSACTION_NOT_FOUND',
        message: '财务交易不存在'
      });
    }

    if (transaction.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_STATUS',
        message: '只能提交草稿状态的交易'
      });
    }

    // 更新状态为待审批
    transaction.status = 'pending';
    transaction.approval.submittedBy = {
      userId: req.user._id,
      userName: req.user.profile?.displayName || req.user.username,
      submitDate: new Date()
    };

    // 处理附件
    if (attachments && attachments.length > 0) {
      transaction.attachments = attachments.map(attachment => ({
        ...attachment,
        uploadedBy: {
          userId: req.user._id,
          userName: req.user.profile?.displayName || req.user.username
        }
      }));
    }

    await transaction.save();

    // 发送审批通知
    await sendApprovalNotification(transaction);

    res.json({
      success: true,
      message: '交易已提交审批',
      data: {
        transactionId: transaction._id,
        status: transaction.status,
        submittedAt: transaction.approval.submittedBy.submitDate
      }
    });

  } catch (error) {
    logger.error('提交交易审批失败:', error);
    res.status(500).json({
      success: false,
      error: 'SUBMISSION_FAILED',
      message: '提交审批失败'
    });
  }
}

// 审批交易
async function reviewTransaction(req, res) {
  if (!financeModuleEnabled || !FinancialTransaction) {
    return moduleNotEnabledResponse(res, '审批交易');
  }

  try {
    const { transactionId } = req.params;
    const { decision, comments } = req.body;

    const transaction = await FinancialTransaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'TRANSACTION_NOT_FOUND',
        message: '财务交易不存在'
      });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_STATUS',
        message: '只能审批待审批状态的交易'
      });
    }

    // 添加审批记录
    transaction.approval.reviewedBy.push({
      userId: req.user._id,
      userName: req.user.profile?.displayName || req.user.username,
      role: req.user.role,
      decision,
      comments,
      reviewDate: new Date()
    });

    // 更新状态
    if (decision === 'approved') {
      transaction.status = 'approved';
      transaction.approval.finalApprover = {
        userId: req.user._id,
        userName: req.user.profile?.displayName || req.user.username,
        approvalDate: new Date()
      };
    } else if (decision === 'rejected') {
      transaction.status = 'rejected';
    } else if (decision === 'returned') {
      transaction.status = 'draft';
    }

    await transaction.save();

    res.json({
      success: true,
      message: `交易${decision === 'approved' ? '已批准' : decision === 'rejected' ? '已拒绝' : '已退回'}`,
      data: {
        transactionId: transaction._id,
        status: transaction.status,
        decision,
        reviewedAt: new Date()
      }
    });

  } catch (error) {
    logger.error('审批交易失败:', error);
    res.status(500).json({
      success: false,
      error: 'REVIEW_FAILED',
      message: '审批交易失败'
    });
  }
}

// 获取交易列表
async function getTransactions(req, res) {
  if (!financeModuleEnabled || !FinancialTransaction) {
    return moduleNotEnabledResponse(res, '获取交易列表');
  }

  try {
    const {
      page = 1,
      limit = 20,
      status,
      transactionType,
      category,
      dateRange,
      searchKeyword
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (transactionType) query['transactionInfo.transactionType'] = transactionType;
    if (category) query['transactionInfo.category'] = category;

    if (dateRange) {
      const { start, end } = JSON.parse(dateRange);
      query['transactionInfo.transactionDate'] = {
        $gte: new Date(start),
        $lte: new Date(end)
      };
    }

    if (searchKeyword) {
      query.$or = [
        { 'transactionInfo.transactionNumber': { $regex: searchKeyword, $options: 'i' } },
        { 'transactionInfo.description': { $regex: searchKeyword, $options: 'i' } },
        { 'parties.payer.name': { $regex: searchKeyword, $options: 'i' } },
        { 'parties.payee.name': { $regex: searchKeyword, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const transactions = await FinancialTransaction.find(query)
      .sort({ 'transactionInfo.transactionDate': -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy.userId', 'profile.displayName')
      .populate('approval.finalApprover.userId', 'profile.displayName');

    const total = await FinancialTransaction.countDocuments(query);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('获取交易列表失败:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_FAILED',
      message: '获取交易列表失败'
    });
  }
}

/**
 * 区块链存证管理
 */

// 上链数据
async function uploadToBlockchain(req, res) {
  if (!financeModuleEnabled || !blockchainService) {
    return moduleNotEnabledResponse(res, '区块链上链');
  }

  try {
    const { transactionId, blockchainType = 'ethereum' } = req.body;

    const transaction = await FinancialTransaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'TRANSACTION_NOT_FOUND',
        message: '财务交易不存在'
      });
    }

    if (transaction.blockchainRecord.isOnChain) {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_ON_CHAIN',
        message: '该交易已经上链'
      });
    }

    // 准备上链数据
    const blockchainData = {
      transactionNumber: transaction.transactionInfo.transactionNumber,
      transactionType: transaction.transactionInfo.transactionType,
      amount: transaction.transactionInfo.amount,
      transactionDate: transaction.transactionInfo.transactionDate,
      parties: transaction.parties,
      creator: transaction.createdBy,
      createdAt: transaction.createdAt
    };

    // 上链配置
    const blockchainConfig = {
      blockchainType,
      networkId: process.env.BLOCKCHAIN_NETWORK_ID || 'testnet',
      gasLimit: req.body.gasLimit || 200000
    };

    // 执行上链
    const blockchainResult = await blockchainService.uploadToBlockchain(
      blockchainData,
      blockchainConfig
    );

    // 创建区块链记录
    const blockchainRecord = await BlockchainRecord.createBlockchainRecord(
      blockchainData,
      blockchainConfig
    );

    // 更新交易记录
    transaction.blockchainRecord = {
      recordId: blockchainRecord._id,
      isOnChain: true,
      transactionHash: blockchainResult.transactionHash,
      blockNumber: blockchainResult.blockNumber,
      uploadDate: new Date()
    };

    await transaction.save();

    res.json({
      success: true,
      message: '数据上链成功',
      data: {
        transactionHash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber,
        confirmations: blockchainResult.confirmations
      }
    });

  } catch (error) {
    logger.error('区块链上链失败:', error);
    res.status(500).json({
      success: false,
      error: 'BLOCKCHAIN_UPLOAD_FAILED',
      message: '区块链上链失败'
    });
  }
}

// 验证区块链数据
async function verifyBlockchainData(req, res) {
  if (!financeModuleEnabled || !blockchainService) {
    return moduleNotEnabledResponse(res, '验证区块链数据');
  }

  try {
    const { transactionHash, blockchainType } = req.body;

    const record = await BlockchainRecord.findOne({ transactionHash, blockchain: blockchainType });
    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'RECORD_NOT_FOUND',
        message: '未找到对应的区块链记录'
      });
    }

    // 执行验证
    const verification = await blockchainService.verifyBlockchainData(
      transactionHash,
      record.dataFingerprint,
      blockchainType
    );

    // 更新验证状态
    record.verification.isVerified = verification.isValid;
    record.verification.verifiedAt = verification.verificationTime;
    record.verification.verificationAttempts += 1;
    record.verification.lastVerificationAt = verification.verificationTime;
    await record.save();

    res.json({
      success: true,
      data: verification
    });

  } catch (error) {
    logger.error('验证区块链数据失败:', error);
    res.status(500).json({
      success: false,
      error: 'VERIFICATION_FAILED',
      message: '验证区块链数据失败'
    });
  }
}

// 获取区块链统计
async function getBlockchainStats(req, res) {
  if (!financeModuleEnabled || !blockchainService) {
    return moduleNotEnabledResponse(res, '获取区块链统计');
  }

  try {
    const { blockchainType, dateRange } = req.query;

    const filters = {};
    if (blockchainType) filters.blockchainType = blockchainType;
    if (dateRange) filters.dateRange = JSON.parse(dateRange);

    const stats = await blockchainService.getBlockchainStatistics(filters);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('获取区块链统计失败:', error);
    res.status(500).json({
      success: false,
      error: 'STATS_FETCH_FAILED',
      message: '获取区块链统计失败'
    });
  }
}

/**
 * 智能票据OCR识别
 */

// 识别票据
async function recognizeInvoice(req, res) {
  if (!financeModuleEnabled || !invoiceOCRService) {
    return moduleNotEnabledResponse(res, 'OCR票据识别');
  }

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'NO_FILE',
        message: '请上传票据图片'
      });
    }

    const { engine = 'baidu', uploadToCloud = true } = req.body;

    // OCR识别
    const result = await invoiceOCRService.recognizeInvoice(req.file.path, {
      engine,
      imageUrl: uploadToCloud ? req.file.location : null
    });

    res.json(result);

  } catch (error) {
    logger.error('票据识别失败:', error);
    res.status(500).json({
      success: false,
      error: 'OCR_FAILED',
      message: '票据识别失败'
    });
  }
}

// 批量识别票据
async function batchRecognizeInvoices(req, res) {
  if (!financeModuleEnabled || !invoiceOCRService) {
    return moduleNotEnabledResponse(res, '批量OCR识别');
  }

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'NO_FILES',
        message: '请上传票据图片文件'
      });
    }

    const { engine = 'baidu', batchSize = 5 } = req.body;

    const imagePaths = req.files.map(file => file.path);

    // 批量识别
    const result = await invoiceOCRService.batchRecognizeInvoices(imagePaths, {
      engine,
      batchSize
    });

    res.json(result);

  } catch (error) {
    logger.error('批量识别票据失败:', error);
    res.status(500).json({
      success: false,
      error: 'BATCH_OCR_FAILED',
      message: '批量识别票据失败'
    });
  }
}

// 税务局验证票据
async function verifyInvoiceWithTaxAuthority(req, res) {
  if (!financeModuleEnabled || !invoiceOCRService) {
    return moduleNotEnabledResponse(res, '税务局验证');
  }

  try {
    const { invoiceId } = req.params;

    const result = await invoiceOCRService.verifyWithTaxAuthority(invoiceId);

    res.json(result);

  } catch (error) {
    logger.error('税务局验证失败:', error);
    res.status(500).json({
      success: false,
      error: 'TAX_VERIFICATION_FAILED',
      message: '税务局验证失败'
    });
  }
}

// 获取OCR记录
async function getOCRRecords(req, res) {
  if (!financeModuleEnabled || !InvoiceOCR) {
    return moduleNotEnabledResponse(res, '获取OCR记录');
  }

  try {
    const {
      page = 1,
      limit = 20,
      authenticityScore,
      isDuplicate,
      taxAuthorityVerified
    } = req.query;

    const query = {};

    if (authenticityScore) {
      query['verification.authenticityScore'] = { $gte: parseFloat(authenticityScore) };
    }

    if (isDuplicate !== undefined) {
      query['verification.duplicateCheck.isDuplicate'] = isDuplicate === 'true';
    }

    if (taxAuthorityVerified !== undefined) {
      query['verification.taxAuthorityVerified'] = taxAuthorityVerified === 'true';
    }

    const skip = (page - 1) * limit;

    const records = await InvoiceOCR.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await InvoiceOCR.countDocuments(query);

    res.json({
      success: true,
      data: records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('获取OCR记录失败:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_FAILED',
      message: '获取OCR记录失败'
    });
  }
}

/**
 * 预算审批流程管理
 */

// 创建预算
async function createBudget(req, res) {
  if (!financeModuleEnabled || !BudgetApproval) {
    return moduleNotEnabledResponse(res, '创建预算');
  }

  try {
    const {
      budgetYear,
      budgetType,
      budgetName,
      description,
      totalAmount,
      budgetItems,
      approvalConfig
    } = req.body;

    const budget = new BudgetApproval({
      budgetInfo: {
        budgetYear: parseInt(budgetYear),
        budgetType,
        budgetName,
        description,
        totalAmount: parseFloat(totalAmount)
      },
      budgetItems: budgetItems || [],
      approvalWorkflow: {
        currentStage: 'draft',
        configuration: approvalConfig || {
          requiredApprovers: [
            {
              stage: 'village_committee',
              roles: ['village_admin', 'village_secretary'],
              minApprovers: 2
            }
          ]
        }
      },
      createdBy: {
        userId: req.user._id,
        userName: req.user.profile?.displayName || req.user.username,
        department: req.user.department
      }
    });

    await budget.save();

    res.status(201).json({
      success: true,
      message: '预算创建成功',
      data: budget
    });

  } catch (error) {
    logger.error('创建预算失败:', error);
    res.status(500).json({
      success: false,
      error: 'CREATION_FAILED',
      message: '创建预算失败'
    });
  }
}

// 提交预算审批
async function submitBudgetForApproval(req, res) {
  if (!financeModuleEnabled || !BudgetApproval) {
    return moduleNotEnabledResponse(res, '提交预算审批');
  }

  try {
    const { budgetId } = req.params;

    const budget = await BudgetApproval.findById(budgetId);
    if (!budget) {
      return res.status(404).json({
        success: false,
        error: 'BUDGET_NOT_FOUND',
        message: '预算不存在'
      });
    }

    if (budget.approvalWorkflow.currentStage !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_STATUS',
        message: '只能提交草稿状态的预算'
      });
    }

    // 更新审批阶段
    const nextStage = budget.approvalWorkflow.configuration.requiredApprovers[0].stage;
    budget.approvalWorkflow.currentStage = nextStage;

    await budget.save();

    // 发送审批通知
    await sendBudgetApprovalNotification(budget);

    res.json({
      success: true,
      message: '预算已提交审批',
      data: {
        budgetId: budget._id,
        currentStage: budget.approvalWorkflow.currentStage
      }
    });

  } catch (error) {
    logger.error('提交预算审批失败:', error);
    res.status(500).json({
      success: false,
      error: 'SUBMISSION_FAILED',
      message: '提交预算审批失败'
    });
  }
}

// 审批预算
async function reviewBudget(req, res) {
  if (!financeModuleEnabled || !BudgetApproval) {
    return moduleNotEnabledResponse(res, '审批预算');
  }

  try {
    const { budgetId } = req.params;
    const { decision, comments, attachments } = req.body;

    const budget = await BudgetApproval.findById(budgetId);
    if (!budget) {
      return res.status(404).json({
        success: false,
        error: 'BUDGET_NOT_FOUND',
        message: '预算不存在'
      });
    }

    const currentStage = budget.approvalWorkflow.currentStage;
    if (currentStage === 'draft' || currentStage === 'final_approval') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_STAGE',
        message: '当前阶段无法审批'
      });
    }

    // 添加审批记录
    budget.approvalWorkflow.approvalHistory.push({
      stage: currentStage,
      approver: {
        userId: req.user._id,
        userName: req.user.profile?.displayName || req.user.username,
        role: req.user.role,
        department: req.user.department
      },
      decision,
      comments,
      attachments: attachments || [],
      approvalDate: new Date()
    });

    // 更新审批阶段
    if (decision === 'approved') {
      // 检查是否还有下一个审批阶段
      const currentIndex = budget.approvalWorkflow.configuration.requiredApprovers
        .findIndex(item => item.stage === currentStage);
      const nextStageConfig = budget.approvalWorkflow.configuration.requiredApprovers[currentIndex + 1];

      if (nextStageConfig) {
        budget.approvalWorkflow.currentStage = nextStageConfig.stage;
        budget.approvalWorkflow.approvalHistory[budget.approvalWorkflow.approvalHistory.length - 1]
          .nextStage = nextStageConfig.stage;
      } else {
        budget.approvalWorkflow.currentStage = 'final_approval';
        budget.execution.status = 'not_started';
      }
    } else if (decision === 'rejected') {
      budget.approvalWorkflow.currentStage = 'draft';
    }

    await budget.save();

    res.json({
      success: true,
      message: `预算${decision === 'approved' ? '已通过' : decision === 'rejected' ? '已拒绝' : '已退回'}当前阶段`,
      data: {
        budgetId: budget._id,
        currentStage: budget.approvalWorkflow.currentStage,
        decision,
        reviewedAt: new Date()
      }
    });

  } catch (error) {
    logger.error('审批预算失败:', error);
    res.status(500).json({
      success: false,
      error: 'REVIEW_FAILED',
      message: '审批预算失败'
    });
  }
}

// 获取预算列表
async function getBudgets(req, res) {
  if (!financeModuleEnabled || !BudgetApproval) {
    return moduleNotEnabledResponse(res, '获取预算列表');
  }

  try {
    const {
      page = 1,
      limit = 20,
      budgetYear,
      budgetType,
      currentStage,
      executionStatus
    } = req.query;

    const query = {};

    if (budgetYear) query['budgetInfo.budgetYear'] = parseInt(budgetYear);
    if (budgetType) query['budgetInfo.budgetType'] = budgetType;
    if (currentStage) query['approvalWorkflow.currentStage'] = currentStage;
    if (executionStatus) query['execution.status'] = executionStatus;

    const skip = (page - 1) * limit;

    const budgets = await BudgetApproval.find(query)
      .sort({ 'budgetInfo.budgetYear': -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy.userId', 'profile.displayName');

    const total = await BudgetApproval.countDocuments(query);

    res.json({
      success: true,
      data: budgets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('获取预算列表失败:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_FAILED',
      message: '获取预算列表失败'
    });
  }
}

/**
 * 村民财务查询权限管理
 */

// 授予财务查询权限
async function grantFinanceAccess(req, res) {
  if (!financeModuleEnabled || !villageFinanceService) {
    return moduleNotEnabledResponse(res, '授予财务查询权限');
  }

  try {
    const { userId, villageId, customPermissions, grantInfo } = req.body;

    const result = await villageFinanceService.grantFinanceAccess(
      userId,
      villageId,
      customPermissions || {},
      {
        granterId: req.user._id,
        granterName: req.user.profile?.displayName || req.user.username,
        granterRole: req.user.role,
        ...grantInfo
      }
    );

    res.status(201).json(result);

  } catch (error) {
    logger.error('授予财务查询权限失败:', error);
    res.status(500).json({
      success: false,
      error: 'GRANT_FAILED',
      message: '授予财务查询权限失败'
    });
  }
}

// 获取财务摘要
async function getFinanceSummary(req, res) {
  if (!financeModuleEnabled || !villageFinanceService) {
    return moduleNotEnabledResponse(res, '获取财务摘要');
  }

  try {
    const { userId, villageId } = req.query;
    const filters = req.query.filters ? JSON.parse(req.query.filters) : {};

    const summary = await villageFinanceService.getFinanceSummary(
      userId || req.user._id,
      villageId || req.user.village?.villageId,
      filters
    );

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    logger.error('获取财务摘要失败:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_FAILED',
      message: '获取财务摘要失败'
    });
  }
}

// 获取交易详情
async function getTransactionDetails(req, res) {
  if (!financeModuleEnabled || !villageFinanceService) {
    return moduleNotEnabledResponse(res, '获取交易详情');
  }

  try {
    const { userId, villageId } = req.query;
    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };
    const filters = req.query.filters ? JSON.parse(req.query.filters) : {};

    const result = await villageFinanceService.getTransactionDetails(
      userId || req.user._id,
      villageId || req.user.village?.villageId,
      pagination,
      filters
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('获取交易详情失败:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_FAILED',
      message: '获取交易详情失败'
    });
  }
}

// 提交财务问题
async function submitFinanceQuestion(req, res) {
  if (!financeModuleEnabled || !villageFinanceService) {
    return moduleNotEnabledResponse(res, '提交财务问题');
  }

  try {
    const { userId, villageId, questionData } = req.body;

    const result = await villageFinanceService.submitFinanceQuestion(
      userId || req.user._id,
      villageId || req.user.village?.villageId,
      questionData
    );

    res.status(201).json(result);

  } catch (error) {
    logger.error('提交财务问题失败:', error);
    res.status(500).json({
      success: false,
      error: 'SUBMIT_FAILED',
      message: '提交财务问题失败'
    });
  }
}

// 下载财务报告
async function downloadFinanceReport(req, res) {
  if (!financeModuleEnabled || !villageFinanceService) {
    return moduleNotEnabledResponse(res, '下载财务报告');
  }

  try {
    const { userId, villageId, reportType } = req.query;
    const filters = req.query.filters ? JSON.parse(req.query.filters) : {};

    const result = await villageFinanceService.downloadFinanceReport(
      userId || req.user._id,
      villageId || req.user.village?.villageId,
      reportType,
      filters
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('下载财务报告失败:', error);
    res.status(500).json({
      success: false,
      error: 'DOWNLOAD_FAILED',
      message: '下载财务报告失败'
    });
  }
}

// 获取财务访问统计
async function getFinanceAccessStats(req, res) {
  if (!financeModuleEnabled || !villageFinanceService) {
    return moduleNotEnabledResponse(res, '获取财务访问统计');
  }

  try {
    const { villageId } = req.query;
    const filters = req.query.filters ? JSON.parse(req.query.filters) : {};

    const stats = await villageFinanceService.getFinanceAccessStats(
      villageId || req.user.village?.villageId,
      filters
    );

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('获取财务访问统计失败:', error);
    res.status(500).json({
      success: false,
      error: 'STATS_FETCH_FAILED',
      message: '获取财务访问统计失败'
    });
  }
}

/**
 * 辅助函数
 */

async function uploadImageToCloud(file) {
  // 这里需要实现云存储上传逻辑
  // 简化实现，返回模拟URL
  return `https://cloud-storage.example.com/invoices/${Date.now()}_${file.originalname}`;
}

async function sendApprovalNotification(transaction) {
  // 这里需要实现通知逻辑
  logger.info('发送审批通知:', transaction.transactionInfo.transactionNumber);
}

async function sendBudgetApprovalNotification(budget) {
  // 这里需要实现通知逻辑
  logger.info('发送预算审批通知:', budget.budgetInfo.budgetName);
}

/**
 * 获取待办审批任务
 */
async function getPendingTasks(req, res) {
  try {
    const { type = 'all', page = 1, limit = 20 } = req.query;
    const userId = req.user.userId;

    // 获取待办任务
    const tasks = await financeModule.getPendingTasks(userId, {
      type,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: tasks
    });

  } catch (error) {
    logger.error('获取待办任务失败:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_FAILED',
      message: '获取待办任务失败'
    });
  }
}

/**
 * 获取审批工作流状态
 */
async function getWorkflowStatus(req, res) {
  try {
    const { transactionId } = req.params;

    // 获取工作流状态
    const workflowStatus = await financeModule.getWorkflowStatus(transactionId);

    res.json({
      success: true,
      data: workflowStatus
    });

  } catch (error) {
    logger.error('获取工作流状态失败:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_FAILED',
      message: '获取工作流状态失败'
    });
  }
}

module.exports = {
  // 财务交易管理
  createTransaction,
  submitTransactionForApproval,
  reviewTransaction,
  getTransactions,

  // 区块链存证管理
  uploadToBlockchain,
  verifyBlockchainData,
  getBlockchainStats,

  // 智能票据OCR识别 - 导出处理器函数
  recognizeInvoice,
  batchRecognizeInvoices,
  verifyInvoiceWithTaxAuthority,
  getOCRRecords,

  // 预算审批流程管理
  createBudget,
  submitBudgetForApproval,
  reviewBudget,
  getBudgets,

  // 审批工作流管理
  getPendingTasks,
  getWorkflowStatus,

  // 村民财务查询权限管理
  grantFinanceAccess,
  getFinanceSummary,
  getTransactionDetails,
  submitFinanceQuestion,
  downloadFinanceReport,
  getFinanceAccessStats,

  // 导出upload中间件供路由使用
  upload
};
