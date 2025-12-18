/**
 * 财务透明化管理控制器
 * 处理区块链存证、智能票据OCR识别、村民财务查询权限、预算审批流程等
 */

const {
  FinancialTransaction,
  BlockchainRecord,
  InvoiceOCR,
  BudgetApproval,
  VillageFinanceAccess
} = require('../models/Finance');

const blockchainService = require('../services/blockchainService');
const invoiceOCRService = require('../services/invoiceOCRService');
const villageFinanceService = require('../services/villageFinanceService');
const ApprovalWorkflowService = require('../services/approvalWorkflowService');
const multer = require('multer');
const path = require('path');

// 文件上传配置
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
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
 * 财务交易管理
 */

// 创建财务交易
async function createTransaction(req, res) {
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
        userName: req.user.profile.displayName,
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
    console.error('创建财务交易失败:', error);
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
  try {
    const { transactionId } = req.params;
    const { attachments, workflowType } = req.body;

    const approvalWorkflowService = new ApprovalWorkflowService();

    // 处理附件
    if (attachments && attachments.length > 0) {
      await FinancialTransaction.findByIdAndUpdate(transactionId, {
        attachments: attachments.map(attachment => ({
          ...attachment,
          uploadedBy: {
            userId: req.user._id,
            userName: req.user.profile.displayName
          }
        }))
      });
    }

    // 启动审批工作流
    const workflowResult = await approvalWorkflowService.startWorkflow(
      transactionId,
      workflowType || 'expense',
      {
        userId: req.user._id,
        userName: req.user.profile.displayName,
        role: req.user.role
      }
    );

    res.json({
      success: true,
      message: '交易已提交审批',
      data: workflowResult
    });

  } catch (error) {
    console.error('提交交易审批失败:', error);
    res.status(500).json({
      success: false,
      error: 'SUBMISSION_FAILED',
      message: '提交审批失败',
      details: error.message
    });
  }
}

// 审批交易
async function reviewTransaction(req, res) {
  try {
    const { transactionId } = req.params;
    const { decision, comments } = req.body;

    const approvalWorkflowService = new ApprovalWorkflowService();

    // 处理审批决策
    const result = await approvalWorkflowService.processApprovalDecision(
      transactionId,
      req.user._id,
      decision,
      comments
    );

    res.json({
      success: true,
      message: result.message,
      data: result
    });

  } catch (error) {
    console.error('审批交易失败:', error);
    res.status(500).json({
      success: false,
      error: 'REVIEW_FAILED',
      message: '审批交易失败',
      details: error.message
    });
  }
}

// 获取交易列表
async function getTransactions(req, res) {
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
    console.error('获取交易列表失败:', error);
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
    console.error('区块链上链失败:', error);
    res.status(500).json({
      success: false,
      error: 'BLOCKCHAIN_UPLOAD_FAILED',
      message: '区块链上链失败'
    });
  }
}

// 验证区块链数据
async function verifyBlockchainData(req, res) {
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
    console.error('验证区块链数据失败:', error);
    res.status(500).json({
      success: false,
      error: 'VERIFICATION_FAILED',
      message: '验证区块链数据失败'
    });
  }
}

// 获取区块链统计
async function getBlockchainStats(req, res) {
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
    console.error('获取区块链统计失败:', error);
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
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'NO_FILE',
        message: '请上传票据图片'
      });
    }

    const { engine = 'baidu', uploadToCloud = true } = req.body;

    // 保存临时文件
    const tempPath = path.join(__dirname, '../temp', `invoice_${Date.now()}_${req.file.originalname}`);
    require('fs').writeFileSync(tempPath, req.file.buffer);

    // OCR识别
    const result = await invoiceOCRService.recognizeInvoice(tempPath, {
      engine,
      imageUrl: uploadToCloud ? await uploadImageToCloud(req.file) : null
    });

    // 清理临时文件
    require('fs').unlinkSync(tempPath);

    res.json(result);

  } catch (error) {
    console.error('票据识别失败:', error);
    res.status(500).json({
      success: false,
      error: 'OCR_FAILED',
      message: '票据识别失败'
    });
  }
}

// 批量识别票据
async function batchRecognizeInvoices(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'NO_FILES',
        message: '请上传票据图片文件'
      });
    }

    const { engine = 'baidu', batchSize = 5 } = req.body;

    const imagePaths = [];
    for (const file of req.files) {
      const tempPath = path.join(__dirname, '../temp', `invoice_${Date.now()}_${file.originalname}`);
      require('fs').writeFileSync(tempPath, file.buffer);
      imagePaths.push(tempPath);
    }

    // 批量识别
    const result = await invoiceOCRService.batchRecognizeInvoices(imagePaths, {
      engine,
      batchSize
    });

    // 清理临时文件
    imagePaths.forEach(filePath => {
      try {
        require('fs').unlinkSync(filePath);
      } catch (error) {
        console.error('清理临时文件失败:', error);
      }
    });

    res.json(result);

  } catch (error) {
    console.error('批量识别票据失败:', error);
    res.status(500).json({
      success: false,
      error: 'BATCH_OCR_FAILED',
      message: '批量识别票据失败'
    });
  }
}

// 税务局验证票据
async function verifyInvoiceWithTaxAuthority(req, res) {
  try {
    const { invoiceId } = req.params;

    const result = await invoiceOCRService.verifyWithTaxAuthority(invoiceId);

    res.json(result);

  } catch (error) {
    console.error('税务局验证失败:', error);
    res.status(500).json({
      success: false,
      error: 'TAX_VERIFICATION_FAILED',
      message: '税务局验证失败'
    });
  }
}

// 获取OCR记录
async function getOCRRecords(req, res) {
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
    console.error('获取OCR记录失败:', error);
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
        userName: req.user.profile.displayName,
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
    console.error('创建预算失败:', error);
    res.status(500).json({
      success: false,
      error: 'CREATION_FAILED',
      message: '创建预算失败'
    });
  }
}

// 提交预算审批
async function submitBudgetForApproval(req, res) {
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
    console.error('提交预算审批失败:', error);
    res.status(500).json({
      success: false,
      error: 'SUBMISSION_FAILED',
      message: '提交预算审批失败'
    });
  }
}

// 审批预算
async function reviewBudget(req, res) {
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
        userName: req.user.profile.displayName,
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
    console.error('审批预算失败:', error);
    res.status(500).json({
      success: false,
      error: 'REVIEW_FAILED',
      message: '审批预算失败'
    });
  }
}

// 获取预算列表
async function getBudgets(req, res) {
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
    console.error('获取预算列表失败:', error);
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
  try {
    const { userId, villageId, customPermissions, grantInfo } = req.body;

    const result = await villageFinanceService.grantFinanceAccess(
      userId,
      villageId,
      customPermissions || {},
      {
        granterId: req.user._id,
        granterName: req.user.profile.displayName,
        granterRole: req.user.role,
        ...grantInfo
      }
    );

    res.status(201).json(result);

  } catch (error) {
    console.error('授予财务查询权限失败:', error);
    res.status(500).json({
      success: false,
      error: 'GRANT_FAILED',
      message: '授予财务查询权限失败'
    });
  }
}

// 获取财务摘要
async function getFinanceSummary(req, res) {
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
    console.error('获取财务摘要失败:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_FAILED',
      message: '获取财务摘要失败'
    });
  }
}

// 获取交易详情
async function getTransactionDetails(req, res) {
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
    console.error('获取交易详情失败:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_FAILED',
      message: '获取交易详情失败'
    });
  }
}

// 提交财务问题
async function submitFinanceQuestion(req, res) {
  try {
    const { userId, villageId, questionData } = req.body;

    const result = await villageFinanceService.submitFinanceQuestion(
      userId || req.user._id,
      villageId || req.user.village?.villageId,
      questionData
    );

    res.status(201).json(result);

  } catch (error) {
    console.error('提交财务问题失败:', error);
    res.status(500).json({
      success: false,
      error: 'SUBMIT_FAILED',
      message: '提交财务问题失败'
    });
  }
}

// 下载财务报告
async function downloadFinanceReport(req, res) {
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
    console.error('下载财务报告失败:', error);
    res.status(500).json({
      success: false,
      error: 'DOWNLOAD_FAILED',
      message: '下载财务报告失败'
    });
  }
}

// 获取财务访问统计
async function getFinanceAccessStats(req, res) {
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
    console.error('获取财务访问统计失败:', error);
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

// 获取待办审批任务
async function getPendingTasks(req, res) {
  try {
    const {
      transactionType,
      status = 'pending',
      priority,
      dateRange,
      page = 1,
      limit = 20
    } = req.query;

    const approvalWorkflowService = new ApprovalWorkflowService();

    const filters = {};
    if (transactionType) filters.transactionType = transactionType;
    if (dateRange) filters.dateRange = JSON.parse(dateRange);
    if (priority) filters.priority = priority;

    const tasks = await approvalWorkflowService.getPendingTasks(req.user._id, filters);

    // 分页处理
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedTasks = tasks.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedTasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: tasks.length,
        totalPages: Math.ceil(tasks.length / limit)
      }
    });

  } catch (error) {
    console.error('获取待办任务失败:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_FAILED',
      message: '获取待办任务失败',
      details: error.message
    });
  }
}

// 获取审批工作流状态
async function getWorkflowStatus(req, res) {
  try {
    const { transactionId } = req.params;

    const transaction = await FinancialTransaction.findById(transactionId)
      .populate('createdBy.userId', 'profile.displayName')
      .populate('approval.reviewedBy.approver.userId', 'profile.displayName');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'TRANSACTION_NOT_FOUND',
        message: '财务交易不存在'
      });
    }

    // 检查访问权限
    if (transaction.createdBy.userId._id.toString() !== req.user._id &&
        !['village_admin', 'finance_officer', 'department_head'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: '无权查看该交易的审批状态'
      });
    }

    // 获取工作流信息
    const workflowConfig = transaction.approval.workflowConfig || {};
    const currentStageId = transaction.approval.currentStage;
    const currentStage = workflowConfig.stages?.find(s => s.id === currentStageId);

    // 计算审批进度
    let totalStages = workflowConfig.stages?.length || 0;
    let completedStages = 0;

    if (workflowConfig.stages) {
      workflowConfig.stages.forEach((stage, index) => {
        const stageReviews = transaction.approval.reviewedBy.filter(r => r.stage === stage.id);
        const approvalThreshold = { meetsRequirement: false };

        if (stageReviews.length > 0) {
          // 这里可以复用审批工作流服务的逻辑
          const approvedReviews = stageReviews.filter(r => r.decision === 'approved');
          if (approvedReviews.length >= stage.minApprovers) {
            completedStages = index + 1;
          }
        }
      });
    }

    res.json({
      success: true,
      data: {
        transactionId: transaction._id,
        transactionNumber: transaction.transactionInfo.transactionNumber,
        status: transaction.status,
        currentStage: currentStageId,
        currentStageName: currentStage?.name,
        progress: {
          completedStages,
          totalStages,
          percentage: totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0
        },
        workflowStages: workflowConfig.stages || [],
        approvalHistory: transaction.approval.reviewedBy,
        submitDate: transaction.approval.submittedBy?.submitDate,
        lastUpdated: transaction.updatedAt
      }
    });

  } catch (error) {
    console.error('获取工作流状态失败:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_FAILED',
      message: '获取工作流状态失败',
      details: error.message
    });
  }
}

async function sendApprovalNotification(transaction) {
  // 这里需要实现通知逻辑
  console.log('发送审批通知:', transaction.transactionInfo.transactionNumber);
}

async function sendBudgetApprovalNotification(budget) {
  // 这里需要实现通知逻辑
  console.log('发送预算审批通知:', budget.budgetInfo.budgetName);
}

module.exports = {
  // 财务交易管理
  createTransaction,
  submitTransactionForApproval,
  reviewTransaction,
  getTransactions,
  getPendingTasks,
  getWorkflowStatus,

  // 区块链存证管理
  uploadToBlockchain: [upload.single('file'), uploadToBlockchain],
  verifyBlockchainData,
  getBlockchainStats,

  // 智能票据OCR识别
  recognizeInvoice: [upload.single('invoice'), recognizeInvoice],
  batchRecognizeInvoices: [upload.array('invoices', 10), batchRecognizeInvoices],
  verifyInvoiceWithTaxAuthority,
  getOCRRecords,

  // 预算审批流程管理
  createBudget,
  submitBudgetForApproval,
  reviewBudget,
  getBudgets,

  // 村民财务查询权限管理
  grantFinanceAccess,
  getFinanceSummary,
  getTransactionDetails,
  submitFinanceQuestion,
  downloadFinanceReport,
  getFinanceAccessStats
};