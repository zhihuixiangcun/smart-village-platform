const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const logger = require('../utils/logger');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

const uploadDir = path.join(__dirname, '../uploads/finance');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user?._id?.toString() || 'anonymous';
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(8).toString('hex');
    cb(null, `${userId}_${timestamp}_${randomStr}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('只支持 JPEG、JPG、PNG 和 PDF 格式的文件'));
  }
});

const buildOperator = (req) => ({
  userId: req.user?.userId || req.headers['x-user-id'],
  username: req.user?.username || 'system',
  name: req.user?.name || '系统',
  role: req.user?.role || 'admin',
  villageId: req.user?.villageId,
  sessionId: req.headers['x-session-id'] || `session_${Date.now()}`
});

function moduleNotEnabledResponse(res, action = '此操作') {
  return res.status(503).json({
    success: false,
    error: 'SERVICE_NOT_AVAILABLE',
    message: `财务管理功能暂不可用，${action}无法执行`,
    details: '财务管理模块需要完整的服务配置，请联系管理员启用相关服务'
  });
}

let financeModuleEnabled = false;
let FinancialTransaction, BlockchainRecord, InvoiceOCR, BudgetApproval, VillageFinanceAccess;

try {
  const financeModels = require('../models/Finance');
  FinancialTransaction = financeModels.FinancialTransaction;
  BlockchainRecord = financeModels.BlockchainRecord;
  InvoiceOCR = financeModels.InvoiceOCR;
  BudgetApproval = financeModels.BudgetApproval;
  VillageFinanceAccess = financeModels.VillageFinanceAccess;
  financeModuleEnabled = true;
  logger.info('财务管理模块已启用');
} catch (error) {
  logger.warn('财务管理模块未完全启用，部分服务缺失:', error.message);
  financeModuleEnabled = false;
}

async function createTransaction(req, res) {
  const startTime = Date.now();
  
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

    if (!transactionType || !category || !amount) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数',
        message: '请提供交易类型、类别和金额'
      });
    }

    const operator = buildOperator(req);

    const transactionNumber = `TXN${Date.now()}${Math.floor(Math.random() * 10000)}`;

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
        userId: operator.userId,
        userName: operator.name,
        department: req.user?.department
      },
      relatedBudget: relatedBudget || {},
      relatedProject: relatedProject || {},
      status: 'draft'
    });

    await transaction.save();
    cache.del('transactions:list:*');
    cache.del('transactions:stats:*');

    logger.info(`财务交易创建成功: ${transaction.transactionInfo.transactionNumber}`, { 
      userId: operator.userId,
      amount,
      duration: Date.now() - startTime 
    });

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
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function getTransactions(req, res) {
  const startTime = Date.now();
  
  if (!financeModuleEnabled || !FinancialTransaction) {
    return moduleNotEnabledResponse(res, '获取交易列表');
  }

  try {
    const operator = buildOperator(req);
    const {
      page = 1,
      limit = 20,
      status,
      transactionType,
      category,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { villageId: operator.villageId };
    
    if (status) query.status = status;
    if (transactionType) query['transactionInfo.transactionType'] = transactionType;
    if (category) query['transactionInfo.category'] = category;
    
    if (startDate || endDate) {
      query['transactionInfo.transactionDate'] = {};
      if (startDate) query['transactionInfo.transactionDate'].$gte = new Date(startDate);
      if (endDate) query['transactionInfo.transactionDate'].$lte = new Date(endDate);
    }

    const cacheKey = `transactions:list:${operator.villageId}:${page}:${limit}:${status || 'all'}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    const [transactions, total] = await Promise.all([
      FinancialTransaction.find(query)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      FinancialTransaction.countDocuments(query)
    ]);

    const result = {
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };

    cache.set(cacheKey, result, 120);

    logger.info(`获取交易列表成功`, { 
      userId: operator.userId,
      count: transactions.length,
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('获取交易列表失败:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_FAILED',
      message: '获取交易列表失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function reviewTransaction(req, res) {
  const startTime = Date.now();
  
  if (!financeModuleEnabled || !FinancialTransaction) {
    return moduleNotEnabledResponse(res, '审批交易');
  }

  try {
    const { transactionId } = req.params;
    const { decision, comments } = req.body;

    const operator = buildOperator(req);

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

    if (!['approved', 'rejected', 'returned'].includes(decision)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_DECISION',
        message: '无效的审批决定'
      });
    }

    transaction.approval.reviewedBy.push({
      userId: operator.userId,
      userName: operator.name,
      role: operator.role,
      decision,
      comments,
      reviewDate: new Date()
    });

    if (decision === 'approved') {
      transaction.status = 'approved';
      transaction.approval.finalApprover = {
        userId: operator.userId,
        userName: operator.name,
        approvalDate: new Date()
      };
    } else if (decision === 'rejected') {
      transaction.status = 'rejected';
    } else if (decision === 'returned') {
      transaction.status = 'draft';
    }

    await transaction.save();
    cache.del('transactions:list:*');
    cache.del(`transaction:${transactionId}`);

    logger.info(`交易审批成功: ${transaction.transactionInfo.transactionNumber}`, { 
      userId: operator.userId,
      decision,
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      message: `交易${decision === 'approved' ? '已批准' : decision === 'rejected' ? '已拒绝' : '已退回'}`,
      data: {
        transactionId: transaction._id,
        transactionNumber: transaction.transactionInfo.transactionNumber,
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
      message: '审批交易失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function getFinancialStats(req, res) {
  const startTime = Date.now();
  
  if (!financeModuleEnabled || !FinancialTransaction) {
    return moduleNotEnabledResponse(res, '获取财务统计');
  }

  try {
    const operator = buildOperator(req);
    const queryVillageId = operator.villageId;

    const cacheKey = `finance:stats:${queryVillageId}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    const stats = await FinancialTransaction.aggregate([
      { $match: { villageId: queryVillageId } },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'approved'] },
                '$transactionInfo.amount',
                0
              ]
            }
          },
          incomeTotal: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $eq: ['$status', 'approved'] },
                    { $in: ['$transactionInfo.transactionType', ['income', 'grant', 'subsidy']] }
                  ]
                },
                '$transactionInfo.amount',
                0
              ]
            }
          },
          expenseTotal: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $eq: ['$status', 'approved'] },
                    { $in: ['$transactionInfo.transactionType', ['expense', 'purchase', 'payment']] }
                  ]
                },
                '$transactionInfo.amount',
                0
              ]
            }
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          approvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejectedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          }
        }
      }
    ]);

    const result = {
      overview: {
        totalTransactions: stats[0]?.totalTransactions || 0,
        totalAmount: stats[0]?.totalAmount || 0,
        incomeTotal: stats[0]?.incomeTotal || 0,
        expenseTotal: stats[0]?.expenseTotal || 0,
        netAmount: (stats[0]?.incomeTotal || 0) - (stats[0]?.expenseTotal || 0)
      },
      status: {
        pending: stats[0]?.pendingCount || 0,
        approved: stats[0]?.approvedCount || 0,
        rejected: stats[0]?.rejectedCount || 0
      },
      generatedAt: new Date()
    };

    cache.set(cacheKey, result, 300);

    logger.info(`获取财务统计成功`, { 
      userId: operator.userId,
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('获取财务统计失败:', error);
    res.status(500).json({
      success: false,
      error: 'STATS_FAILED',
      message: '获取财务统计失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

module.exports = {
  createTransaction,
  getTransactions,
  reviewTransaction,
  getFinancialStats,
  upload,
  financeModuleEnabled
};
