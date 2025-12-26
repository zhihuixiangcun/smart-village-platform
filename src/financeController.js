/**
 * 财务管理控制器
 * 处理村务财务、交易记录、预算管理等功能
 */

const Finance = require('../models/Finance');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const logger = require('../utils/logger');
const { createAuditLog } = require('../utils/audit');
const { encryptSensitiveData, decryptSensitiveData } = require('../utils/encryption');
const { verifyJWT } = require('../middleware/auth');

// 配置文件上传
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads/finance');
      try {
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
      } catch (error) {
        cb(error);
      }
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      cb(null, `${uniqueName}${path.extname(file.originalname)}`);
    }
  }),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  },
  fileFilter: (req, file, cb) => {
    // 允许图片和PDF文件
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片或PDF文件'), false);
    }
  }
});

/**
 * 创建财务记录
 */
async function createFinanceRecord(req, res) {
  try {
    const {
      type,
      category,
      subcategory,
      amount,
      description,
      date,
      account = 'general',
      paymentMethod,
      invoiceId,
      attachments = [],
      tags = [],
      villageId
    } = req.body;

    // 验证必填字段
    if (!type || !category || !amount || !date || !villageId) {
      return res.status(400).json({
        success: false,
        error: '类型、分类、金额、日期和村庄ID为必填项'
      });
    }

    // 验证金额
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: '金额必须大于0'
      });
    }

    // 验证日期
    const financeDate = new Date(date);
    if (isNaN(financeDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: '日期格式无效'
      });
    }

    // 生成唯一编号
    const recordNumber = generateRecordNumber(villageId, type, category);

    // 创建财务记录
    const finance = new Finance({
      recordNumber,
      type,
      category,
      subcategory,
      amount: parseFloat(amount),
      description,
      date: financeDate,
      account,
      paymentMethod,
      invoiceId,
      attachments,
      tags,
      villageId,
      createdBy: req.user.id,
      status: 'pending'
    });

    await finance.save();

    // 创建审计日志
    await createAuditLog({
      userId: req.user.id,
      action: 'CREATE_FINANCE_RECORD',
      resourceType: 'Finance',
      resourceId: finance._id,
      details: {
        recordNumber: finance.recordNumber,
        type: finance.type,
        amount: finance.amount,
        villageId: finance.villageId
      }
    });

    logger.info(`财务记录创建成功: ${finance.recordNumber}`);

    res.status(201).json({
      success: true,
      data: finance,
      message: '财务记录创建成功'
    });

  } catch (error) {
    logger.error('创建财务记录失败:', error);
    res.status(500).json({
      success: false,
      error: '创建财务记录失败'
    });
  }
}

/**
 * 上传发票
 */
async function uploadInvoice(req, res) {
  try {
    const { villageId, category, description } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请选择要上传的发票'
      });
    }

    if (!villageId || !category) {
      return res.status(400).json({
        success: false,
        error: '村庄ID和分类为必填项'
      });
    }

    // 创建发票记录
    const invoice = new Invoice({
      filename: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      type: req.file.mimetype,
      villageId,
      category,
      description,
      status: 'processing',
      uploadedBy: req.user.id,
      uploadedAt: new Date()
    });

    await invoice.save();

    logger.info(`发票上传成功: ${invoice._id}`);

    res.status(201).json({
      success: true,
      data: invoice,
      message: '发票上传成功'
    });

  } catch (error) {
    logger.error('上传发票失败:', error);
    // 清理上传的文件
    if (req.file) {
      await fs.unlink(req.file.path);
    }
    res.status(500).json({
      success: false,
      error: '上传发票失败'
    });
  }
}

/**
 * OCR识别发票
 */
async function recognizeInvoice(req, res) {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: '发票不存在'
      });
    }

    // 模拟OCR识别结果
    const ocrResult = {
      success: true,
      data: {
        invoiceNumber: `INV${Date.now()}`,
        vendor: '示例供应商',
        date: new Date(),
        items: [
          {
            description: '办公用品',
            quantity: 5,
            unitPrice: 50
          }
        ]
      }
    };

    // 更新发票状态
    invoice.ocrResult = ocrResult;
    invoice.status = 'recognized';
    invoice.processedAt = new Date();
    await invoice.save();

    logger.info(`发票OCR识别完成: ${id}`);

    res.json({
      success: true,
      data: {
        ocrResult,
        invoice
      },
      message: '发票识别成功'
    });

  } catch (error) {
    logger.error('OCR识别发票失败:', error);
    res.status(500).json({
      success: false,
      error: 'OCR识别失败'
    });
  }
}

/**
 * 获取财务记录列表
 */
async function getFinanceRecords(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      villageId,
      type,
      category,
      account,
      status,
      startDate,
      endDate,
      keyword,
      minAmount,
      maxAmount,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    // 构建查询条件
    const query = {};

    if (villageId) {
      query.villageId = villageId;
    }

    if (type) {
      query.type = type;
    }

    if (category) {
      query.category = category;
    }

    if (account) {
      query.account = account;
    }

    if (status) {
      query.status = status;
    }

    if (keyword) {
      query.$or = [
        { description: { $regex: keyword, $options: 'i' } },
        { recordNumber: { $regex: keyword, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = parseFloat(minAmount);
      if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
    }

    // 构建排序
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // 执行查询
    const [records, total] = await Promise.all([
      Finance.find(query)
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('villageId', 'name')
        .populate('createdBy', 'name')
        .lean(),
      Finance.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('获取财务记录列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取财务记录列表失败'
    });
  }
}

/**
 * 审批交易
 */
async function approveTransaction(req, res) {
  try {
    const { id } = req.params;
    const { status, comment, attachments = [] } = req.body;

    const finance = await Finance.findById(id);
    if (!finance) {
      return res.status(404).json({
        success: false,
        error: '财务记录不存在'
      });
    }

    if (finance.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: '该记录已处理'
      });
    }

    // 更新审批状态
    const updateData = {
      status,
      approvedAt: new Date(),
      approvedBy: req.user.id,
      approverComment: comment
    };

    if (attachments && attachments.length > 0) {
      updateData.approvalAttachments = attachments;
    }

    const updatedFinance = await Finance.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('approvedBy', 'name');

    // 创建审计日志
    await createAuditLog({
      userId: req.user.id,
      action: 'APPROVE_FINANCE',
      resourceType: 'Finance',
      resourceId: finance._id,
      details: {
        recordNumber: finance.recordNumber,
        amount: finance.amount,
        status: status,
        comment: comment
      }
    });

    logger.info(`财务记录审批完成: ${finance.recordNumber} -> ${status}`);

    res.json({
      success: true,
      data: updatedFinance,
      message: '审批完成'
    });

  } catch (error) {
    logger.error('审批交易失败:', error);
    res.status(500).json({
      success: false,
      error: '审批失败'
    });
  }
}

/**
 * 创建预算
 */
async function createBudget(req, res) {
  try {
    const {
      year,
      quarter,
      category,
      subcategory,
      plannedAmount,
      description,
      justifications = [],
      villageId
    } = req.body;

    // 预算验证
    if (!year || !category || !plannedAmount || !villageId) {
      return res.status(400).json({
        success: false,
        error: '年份、分类、预算金额和村庄ID为必填项'
      });
    }

    // 检查是否已存在相同预算
    const existingBudget = await Budget.findOne({
      year,
      quarter,
      category,
      subcategory,
      villageId
    });

    if (existingBudget) {
      return res.status(409).json({
        success: false,
        error: '该预算已存在'
      });
    }

    // 创建预算
    const budget = new Budget({
      year: parseInt(year),
      quarter: quarter ? parseInt(quarter) : null,
      category,
      subcategory,
      plannedAmount: parseFloat(plannedAmount),
      actualAmount: 0,
      remainingAmount: parseFloat(plannedAmount),
      description,
      justifications,
      villageId,
      createdBy: req.user.id,
      status: 'active'
    });

    await budget.save();

    logger.info(`预算创建成功: ${budget._id}`);

    res.status(201).json({
      success: true,
      data: budget,
      message: '预算创建成功'
    });

  } catch (error) {
    logger.error('创建预算失败:', error);
    res.status(500).json({
      success: false,
      error: '创建预算失败'
    });
  }
}

/**
 * 获取预算列表
 */
async function getBudgets(req, res) {
  try {
    const {
      year,
      quarter,
      villageId,
      category,
      status = 'active'
    } = req.query;

    const query = {};

    if (year) query.year = parseInt(year);
    if (quarter) query.quarter = parseInt(quarter);
    if (villageId) query.villageId = villageId;
    if (category) query.category = category;
    if (status) query.status = status;

    const budgets = await Budget.find(query)
      .sort({ year: -1, quarter: -1, category: 1 })
      .populate('villageId', 'name')
      .populate('createdBy', 'name')
      .lean();

    res.json({
      success: true,
      data: budgets
    });

  } catch (error) {
    logger.error('获取预算列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取预算列表失败'
    });
  }
}

/**
 * 生成财务报表
 */
async function generateFinancialReport(req, res) {
  try {
    const {
      villageId,
      type = 'monthly', // monthly, quarterly, yearly
      startDate,
      endDate,
      categories = []
    } = req.body;

    // 确定日期范围
    let dateRange = {};
    if (startDate && endDate) {
      dateRange = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      const now = new Date();
      switch (type) {
        case 'monthly':
          dateRange = {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
            $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
          };
          break;
        case 'quarterly':
          const quarter = Math.floor(now.getMonth() / 3);
          dateRange = {
            $gte: new Date(now.getFullYear(), quarter * 3, 1),
            $lt: new Date(now.getFullYear(), (quarter + 1) * 3, 1)
          };
          break;
        case 'yearly':
          dateRange = {
            $gte: new Date(now.getFullYear(), 0, 1),
            $lt: new Date(now.getFullYear() + 1, 0, 1)
          };
          break;
      }
    }

    // 构建查询条件
    const query = {
      villageId,
      date: dateRange,
      status: 'approved'
    };

    if (categories && categories.length > 0) {
      query.category = { $in: categories };
    }

    // 获取财务数据
    const [incomeRecords, expenseRecords] = await Promise.all([
      Finance.find({ ...query, type: 'income' }),
      Finance.find({ ...query, type: 'expense' })
    ]);

    // 计算统计数据
    const totalIncome = incomeRecords.reduce((sum, record) => sum + record.amount, 0);
    const totalExpense = expenseRecords.reduce((sum, record) => sum + record.amount, 0);
    const netAmount = totalIncome - totalExpense;

    // 按分类统计
    const categoryStats = await Finance.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            type: '$type',
            category: '$category'
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // 生成报表
    const report = {
      type,
      period: {
        startDate: dateRange.$gte,
        endDate: dateRange.$lte,
        generatedAt: new Date()
      },
      summary: {
        totalIncome,
        totalExpense,
        netAmount,
        transactionCount: incomeRecords.length + expenseRecords.length
      },
      categoryBreakdown: categoryStats,
      records: {
        income: incomeRecords,
        expense: expenseRecords
      }
    };

    res.json({
      success: true,
      data: report,
      message: '报表生成成功'
    });

  } catch (error) {
    logger.error('生成财务报表失败:', error);
    res.status(500).json({
      success: false,
      error: '生成财务报表失败'
    });
  }
}

/**
 * 获取财务统计
 */
async function getFinancialStats(req, res) {
  try {
    const { villageId, year } = req.query;

    // 构建查询条件
    const baseQuery = villageId ? { villageId } : {};
    let dateQuery = {};

    if (year) {
      const yearInt = parseInt(year);
      dateQuery = {
        $gte: new Date(yearInt, 0, 1),
        $lt: new Date(yearInt + 1, 0, 1)
      };
    } else {
      // 默认当年
      const now = new Date();
      dateQuery = {
        $gte: new Date(now.getFullYear(), 0, 1),
        $lt: new Date(now.getFullYear() + 1, 0, 1)
      };
    }

    // 获取统计数据
    const [
      monthlyTrend,
      categoryDistribution,
      accountDistribution,
      recentTransactions,
      budgetVariance
    ] = await Promise.all([
      // 月度趋势
      Finance.aggregate([
        { $match: { ...baseQuery, ...dateQuery } },
        {
          $group: {
            _id: { $month: '$date' },
            income: {
              $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] }
            },
            expense: {
              $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] }
            }
          }
        },
        {
          $project: {
            _id: 0,
            month: { $month: '$_id' },
            income: '$income',
            expense: '$expense',
            net: { $subtract: ['$income', '$expense'] }
          }
        },
        { $sort: { month: 1 } }
      ]),
      // 分类分布
      Finance.aggregate([
        { $match: { ...baseQuery, ...dateQuery, status: 'approved' } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            total: { $sum: '$amount' }
          }
        }
      ]),
      // 账户分布
      Finance.aggregate([
        { $match: { ...baseQuery, ...dateQuery, status: 'approved' } },
        {
          $group: {
            _id: '$account',
            count: { $sum: 1 },
            total: { $sum: '$amount' }
          }
        }
      ]),
      // 最近交易
      Finance.find({ ...baseQuery })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('recordNumber type category amount description createdAt'),
      // 预算执行情况
      Budget.find({ ...baseQuery, year: parseInt(year || new Date().getFullYear()) })
        .select('category plannedAmount actualAmount remainingAmount')
    ]);

    res.json({
      success: true,
      data: {
        monthlyTrend,
        categoryDistribution,
        accountDistribution,
        recentTransactions,
        budgetVariance,
        summary: {
          totalIncome: monthlyTrend.reduce((sum, item) => sum + item.income, 0),
          totalExpense: monthlyTrend.reduce((sum, item) => sum + item.expense, 0),
          netAmount: monthlyTrend.reduce((sum, item) => sum + item.net, 0)
        }
      }
    });

  } catch (error) {
    logger.error('获取财务统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取财务统计失败'
    });
  }
}

// 辅助函数

/**
 * 生成记录编号
 */
function generateRecordNumber(villageId, type, category) {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
                  (date.getMonth() + 1).toString().padStart(2, '0') +
                  date.getDate().toString().padStart(2, '0');

  const villageCode = villageId.toString().slice(-4); // 取后4位
  const typeCode = type === 'income' ? 'IN' : 'EX';
  const categoryCode = category.substring(0, 2).toUpperCase();
  const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  return `${dateStr}-${villageCode}-${typeCode}-${categoryCode}-${randomCode}`;
}

module.exports = {
  createFinanceRecord,
  uploadInvoice,
  recognizeInvoice,
  getFinanceRecords,
  approveTransaction,
  createBudget,
  getBudgets,
  updateBudgetExecution: generateFinancialReport, // 暂时使用现有的函数
  generateFinancialReport,
  getFinancialStats,
  upload: upload.single('invoice')
};