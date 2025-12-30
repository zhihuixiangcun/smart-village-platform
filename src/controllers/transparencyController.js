/**
 * 阳光村务系统控制器
 * P2功能模块 - 财务透明化、工程进度监督
 */

const Invoice = require('../models/Invoice');
const Transaction = require('../models/Transaction');
const Project = require('../models/Project');
const ProjectProgress = require('../models/ProjectProgress');
const VillageDecision = require('../models/VillageDecision');
const BlockchainRecord = require('../models/BlockchainRecord');
const { emitToVillage } = require('../services/socketService');

/**
 * ========== 财务透明化 - 发票管理 ==========
 */

/**
 * 获取发票列表
 */
exports.getInvoices = async (req, res) => {
  try {
    const { category, startDate, endDate, amountMin, amountMax } = req.query;
    const filter = { villageId: req.user.villageId };

    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    if (amountMin || amountMax) {
      filter.amount = {};
      if (amountMin) filter.amount.$gte = parseFloat(amountMin);
      if (amountMax) filter.amount.$lte = parseFloat(amountMax);
    }

    const invoices = await Invoice.find(filter)
      .populate('uploadedBy', 'name')
      .populate('verifiedBy', 'name')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: invoices
    });
  } catch (error) {
    console.error('获取发票失败:', error);
    res.status(500).json({
      success: false,
      message: '获取发票失败'
    });
  }
};

/**
 * 创建发票记录（拍照自动识别）
 */
exports.createInvoice = async (req, res) => {
  try {
    const { amount, category, description, vendor, invoiceNumber } = req.body;
    const imagePath = req.file ? req.file.path : null;

    const invoice = await Invoice.create({
      villageId: req.user.villageId,
      amount: parseFloat(amount),
      category,
      description,
      vendor,
      invoiceNumber,
      image: imagePath,
      uploadedBy: req.user._id,
      date: new Date(),
      status: 'pending'
    });

    // 通知财务人员审核
    emitToVillage(req.user.villageId, 'invoice-pending', {
      invoiceId: invoice._id,
      amount: invoice.amount,
      category: invoice.category
    });

    res.status(201).json({
      success: true,
      data: invoice,
      message: '发票上传成功，等待审核'
    });
  } catch (error) {
    console.error('创建发票失败:', error);
    res.status(500).json({
      success: false,
      message: '创建发票失败'
    });
  }
};

/**
 * ========== 财务透明化 - 收支流水 ==========
 */

/**
 * 获取收支流水
 */
exports.getTransactions = async (req, res) => {
  try {
    const { type, category, startDate, endDate } = req.query;
    const filter = { villageId: req.user.villageId };

    if (type) filter.type = type;
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(filter)
      .populate('relatedInvoice')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('获取收支流水失败:', error);
    res.status(500).json({
      success: false,
      message: '获取收支流水失败'
    });
  }
};

/**
 * 获取财务统计数据
 */
exports.getTransactionStatistics = async (req, res) => {
  try {
    const { year, month } = req.query;
    let startDate, endDate;

    if (year && month) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    } else if (year) {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
    } else {
      // 默认当年
      const currentYear = new Date().getFullYear();
      startDate = new Date(currentYear, 0, 1);
      endDate = new Date(currentYear, 11, 31, 23, 59, 59);
    }

    const transactions = await Transaction.find({
      villageId: req.user.villageId,
      date: { $gte: startDate, $lte: endDate }
    });

    // 计算统计数据
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const byCategory = {};
    transactions.forEach(t => {
      if (!byCategory[t.category]) {
        byCategory[t.category] = { income: 0, expense: 0 };
      }
      byCategory[t.category][t.type] += t.amount;
    });

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        summary: {
          totalIncome: income,
          totalExpense: expense,
          balance: income - expense
        },
        byCategory
      }
    });
  } catch (error) {
    console.error('获取财务统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取财务统计失败'
    });
  }
};

/**
 * ========== 工程项目监督 ==========
 */

/**
 * 获取工程项目列表
 */
exports.getProjects = async (req, res) => {
  try {
    const { status, type } = req.query;
    const filter = { villageId: req.user.villageId };

    if (status) filter.status = status;
    if (type) filter.type = type;

    const projects = await Project.find(filter)
      .populate('manager', 'name')
      .populate('contractor', 'name phone')
      .sort({ startDate: -1 });

    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    console.error('获取工程项目失败:', error);
    res.status(500).json({
      success: false,
      message: '获取工程项目失败'
    });
  }
};

/**
 * 创建工程项目
 */
exports.createProject = async (req, res) => {
  try {
    const {
      name, type, description, budget, startDate, endDate,
      contractor, contractorName, contractorPhone
    } = req.body;

    const beforePhoto = req.files?.['beforePhoto']?.[0]?.path || null;

    const project = await Project.create({
      villageId: req.user.villageId,
      name,
      type,
      description,
      budget: parseFloat(budget),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      contractor: {
        name: contractorName,
        phone: contractorPhone
      },
      beforePhoto,
      manager: req.user._id,
      status: 'planning'
    });

    // 通知村民
    emitToVillage(req.user.villageId, 'project-created', {
      projectId: project._id,
      name: project.name,
      type: project.type,
      budget: project.budget
    });

    res.status(201).json({
      success: true,
      data: project,
      message: '项目创建成功'
    });
  } catch (error) {
    console.error('创建项目失败:', error);
    res.status(500).json({
      success: false,
      message: '创建项目失败'
    });
  }
};

/**
 * 上报工程进度（村民拍照监督）
 */
exports.reportProjectProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, issues } = req.body;
    const progressPhoto = req.file ? req.file.path : null;

    const project = await Project.findById(id);

    if (!project || project.villageId.toString() !== req.user.villageId.toString()) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    const progress = await ProjectProgress.create({
      projectId: project._id,
      reporter: req.user._id,
      description,
      photo: progressPhoto,
      issues: issues || [],
      reportDate: new Date()
    });

    // 如果有问题，自动创建督办工单
    if (issues && issues.length > 0) {
      const WorkOrder = require('../models/WorkOrder');
      await WorkOrder.create({
        villageId: req.user.villageId,
        projectId: project._id,
        progressId: progress._id,
        type: 'quality_issue',
        priority: issues.some(i => i.severity === 'high') ? 'high' : 'medium',
        description: `项目质量问题: ${issues.map(i => i.description).join('; ')}`,
        status: 'pending',
        createdBy: req.user._id
      });

      // 通知相关人员
      emitToVillage(req.user.villageId, 'quality-issue-reported', {
        projectId: project._id,
        projectName: project.name,
        issues
      });
    }

    res.status(201).json({
      success: true,
      data: progress,
      message: '进度上报成功'
    });
  } catch (error) {
    console.error('上报进度失败:', error);
    res.status(500).json({
      success: false,
      message: '上报进度失败'
    });
  }
};

/**
 * 提交质量问题反馈
 */
exports.submitQualityFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, severity, suggestions } = req.body;
    const feedbackPhoto = req.file ? req.file.path : null;

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    const ProjectFeedback = require('../models/ProjectFeedback');
    const feedback = await ProjectFeedback.create({
      projectId: project._id,
      reporter: req.user._id,
      description,
      severity,
      suggestions,
      photo: feedbackPhoto,
      status: 'pending',
      createdAt: new Date()
    });

    // 通知项目负责人
    emitToVillage(req.user.villageId, 'quality-feedback', {
      projectId: project._id,
      projectName: project.name,
      severity,
      description
    });

    res.status(201).json({
      success: true,
      data: feedback,
      message: '反馈提交成功'
    });
  } catch (error) {
    console.error('提交反馈失败:', error);
    res.status(500).json({
      success: false,
      message: '提交反馈失败'
    });
  }
};

/**
 * ========== 村务决策公开 ==========
 */

/**
 * 获取决策列表
 */
exports.getDecisions = async (req, res) => {
  try {
    const { status, category } = req.query;
    const filter = { villageId: req.user.villageId };

    if (status) filter.status = status;
    if (category) filter.category = category;

    const decisions = await VillageDecision.find(filter)
      .populate('proposer', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: decisions
    });
  } catch (error) {
    console.error('获取决策失败:', error);
    res.status(500).json({
      success: false,
      message: '获取决策失败'
    });
  }
};

/**
 * 创建决策
 */
exports.createDecision = async (req, res) => {
  try {
    const { title, category, description, options, votingDeadline } = req.body;

    const decision = await VillageDecision.create({
      villageId: req.user.villageId,
      proposer: req.user._id,
      title,
      category,
      description,
      options,
      votingDeadline: new Date(votingDeadline),
      status: 'voting'
    });

    // 通知村民投票
    emitToVillage(req.user.villageId, 'decision-created', {
      decisionId: decision._id,
      title: decision.title,
      deadline: decision.votingDeadline
    });

    res.status(201).json({
      success: true,
      data: decision,
      message: '决策发布成功'
    });
  } catch (error) {
    console.error('创建决策失败:', error);
    res.status(500).json({
      success: false,
      message: '创建决策失败'
    });
  }
};

/**
 * 获取投票记录
 */
exports.getVoteRecords = async (req, res) => {
  try {
    const { id } = req.params;

    const decision = await VillageDecision.findById(id)
      .populate('votes.userId', 'name');

    if (!decision) {
      return res.status(404).json({
        success: false,
        message: '决策不存在'
      });
    }

    // 匿名化处理：只显示投票结果，不显示具体谁投了什么
    const voteSummary = decision.options.map(option => ({
      option: option.text,
      count: decision.votes.filter(v => v.selectedOption === option._id.toString()).length
    }));

    res.json({
      success: true,
      data: {
        decision: {
          title: decision.title,
          status: decision.status,
          totalVotes: decision.votes.length
        },
        voteSummary
      }
    });
  } catch (error) {
    console.error('获取投票记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取投票记录失败'
    });
  }
};

/**
 * ========== 区块链存证 ==========
 */

/**
 * 创建区块链存证
 */
exports.createBlockchainRecord = async (req, res) => {
  try {
    const { recordType, relatedId, data } = req.body;

    // 生成数字指纹
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(data) + Date.now())
      .digest('hex');

    const record = await BlockchainRecord.create({
      villageId: req.user.villageId,
      recordType,
      relatedId,
      data,
      hash,
      timestamp: new Date(),
      createdBy: req.user._id
    });

    // 模拟上链（实际应调用区块链服务）
    record.blockchainHash = hash;
    record.blockchainTimestamp = new Date();
    await record.save();

    res.status(201).json({
      success: true,
      data: record,
      message: '区块链存证成功'
    });
  } catch (error) {
    console.error('区块链存证失败:', error);
    res.status(500).json({
      success: false,
      message: '区块链存证失败'
    });
  }
};

/**
 * 验证区块链记录
 */
exports.verifyBlockchainRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await BlockchainRecord.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      });
    }

    // 验证数字指纹
    const crypto = require('crypto');
    const currentHash = crypto.createHash('sha256')
      .update(JSON.stringify(record.data) + record.timestamp.getTime())
      .digest('hex');

    const isValid = currentHash === record.hash;

    res.json({
      success: true,
      data: {
        record,
        isValid,
        message: isValid ? '记录未被篡改' : '记录已被篡改'
      }
    });
  } catch (error) {
    console.error('验证记录失败:', error);
    res.status(500).json({
      success: false,
      message: '验证记录失败'
    });
  }
};
