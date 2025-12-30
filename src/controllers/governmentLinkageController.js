/**
 * 上级联动枢纽控制器
 * P2功能模块 - 数据自动上报、跨域资源调度
 */

const GovernmentReport = require('../models/GovernmentReport');
const ResourceRequest = require('../models/ResourceRequest');
const PolicyDistribution = require('../models/PolicyDistribution');
const TaskAssignment = require('../models/TaskAssignment');
const CollaborationRequest = require('../models/CollaborationRequest');
const { emitToVillage } = require('../services/socketService');

/**
 * ========== 数据自动上报 ==========
 */

/**
 * AI自动生成报表
 */
exports.autoGenerateReport = async (req, res) => {
  try {
    const { reportType, year, month } = req.body;

    // 根据报表类型调用AI生成
    let reportData = {};

    switch (reportType) {
      case 'population':
        reportData = await generatePopulationReport(req.user.villageId, year, month);
        break;
      case 'finance':
        reportData = await generateFinanceReport(req.user.villageId, year, month);
        break;
      case 'infrastructure':
        reportData = await generateInfrastructureReport(req.user.villageId, year, month);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: '不支持的报表类型'
        });
    }

    const report = await GovernmentReport.create({
      villageId: req.user.villageId,
      reportType,
      year,
      month,
      data: reportData,
      status: 'pending_review',
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: report,
      message: '报表生成成功'
    });
  } catch (error) {
    console.error('生成报表失败:', error);
    res.status(500).json({
      success: false,
      message: '生成报表失败'
    });
  }
};

/**
 * 辅助函数：生成人口报表
 */
async function generatePopulationReport(villageId, year, month) {
  const Resident = require('../models/Resident');

  const total = await Resident.countDocuments({ villageId });
  const byGender = await Resident.aggregate([
    { $match: { villageId } },
    { $group: { _id: '$gender', count: { $sum: 1 } } }
  ]);
  const byAgeGroup = await Resident.aggregate([
    { $match: { villageId } },
    {
      $group: {
        _id: {
          $switch: {
            branches: [
              { case: { $lt: ['$age', 18] }, then: '0-17' },
              { case: { $lt: ['$age', 60] }, then: '18-59' },
              { case: { $gte: ['$age', 60] }, then: '60+' }
            ]
          }
        },
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    summary: { totalPopulation: total },
    byGender,
    byAgeGroup
  };
}

/**
 * 辅助函数：生成财务报表
 */
async function generateFinanceReport(villageId, year, month) {
  const Transaction = require('../models/Transaction');

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const transactions = await Transaction.find({
    villageId,
    date: { $gte: startDate, $lte: endDate }
  });

  const income = transactions.filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expense = transactions.filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    period: { startDate, endDate },
    totalIncome: income,
    totalExpense: expense,
    balance: income - expense
  };
}

/**
 * 辅助函数：生成基础设施报表
 */
async function generateInfrastructureReport(villageId, year, month) {
  const Project = require('../models/Project');

  const projects = await Project.find({
    villageId,
    startDate: { $gte: new Date(year, month - 1, 1) }
  });

  return {
    totalProjects: projects.length,
    byStatus: projects.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {})
  };
}

/**
 * 获取报表列表
 */
exports.getReports = async (req, res) => {
  try {
    const { reportType, year, status } = req.query;
    const filter = { villageId: req.user.villageId };

    if (reportType) filter.reportType = reportType;
    if (year) filter.year = parseInt(year);
    if (status) filter.status = status;

    const reports = await GovernmentReport.find(filter)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('获取报表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取报表失败'
    });
  }
};

/**
 * 获取报表详情
 */
exports.getReportDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await GovernmentReport.findById(id)
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name');

    if (!report || report.villageId.toString() !== req.user.villageId.toString()) {
      return res.status(404).json({
        success: false,
        message: '报表不存在'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('获取报表详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取报表详情失败'
    });
  }
};

/**
 * ========== 人口数据上报 ==========
 */

/**
 * 同步人口数据
 */
exports.syncPopulationData = async (req, res) => {
  try {
    const Resident = require('../models/Resident');

    const residents = await Resident.find({ villageId: req.user.villageId });

    // 模拟同步到政务云
    const syncRecord = await GovernmentReport.create({
      villageId: req.user.villageId,
      reportType: 'population_sync',
      data: {
        recordCount: residents.length,
        syncTimestamp: new Date(),
        status: 'synced'
      },
      status: 'submitted',
      createdBy: req.user._id
    });

    res.json({
      success: true,
      data: syncRecord,
      message: `成功同步 ${residents.length} 条人口数据`
    });
  } catch (error) {
    console.error('同步人口数据失败:', error);
    res.status(500).json({
      success: false,
      message: '同步人口数据失败'
    });
  }
};

/**
 * 获取人口统计
 */
exports.getPopulationStatistics = async (req, res) => {
  try {
    const Resident = require('../models/Resident');

    const stats = await Resident.aggregate([
      { $match: { villageId: req.user.villageId } },
      {
        $group: {
          _id: null,
          totalPopulation: { $sum: 1 },
          maleCount: {
            $sum: { $cond: [{ $eq: ['$gender', 'male'] }, 1, 0] }
          },
          femaleCount: {
            $sum: { $cond: [{ $eq: ['$gender', 'female'] }, 1, 0] }
          },
          seniorCount: {
            $sum: { $cond: [{ $gte: ['$age', 60] }, 1, 0] }
          },
          minorCount: {
            $sum: { $cond: [{ $lt: ['$age', 18] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0] || {}
    });
  } catch (error) {
    console.error('获取人口统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取人口统计失败'
    });
  }
};

/**
 * ========== 跨域资源调度申请 ==========
 */

/**
 * 申请资源
 */
exports.requestResource = async (req, res) => {
  try {
    const { resourceType, quantity, reason, urgency, neededBy } = req.body;

    const request = await ResourceRequest.create({
      villageId: req.user.villageId,
      resourceType,
      quantity,
      reason,
      urgency,
      neededBy: new Date(neededBy),
      status: 'pending',
      createdBy: req.user._id
    });

    // 通知上级政府
    emitToVillage(req.user.villageId, 'resource-requested', {
      requestId: request._id,
      resourceType,
      quantity,
      urgency
    });

    res.status(201).json({
      success: true,
      data: request,
      message: '资源申请已提交'
    });
  } catch (error) {
    console.error('申请资源失败:', error);
    res.status(500).json({
      success: false,
      message: '申请资源失败'
    });
  }
};

/**
 * 获取资源申请列表
 */
exports.getResources = async (req, res) => {
  try {
    const { status, resourceType } = req.query;
    const filter = { villageId: req.user.villageId };

    if (status) filter.status = status;
    if (resourceType) filter.resourceType = resourceType;

    const requests = await ResourceRequest.find(filter)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('获取资源申请失败:', error);
    res.status(500).json({
      success: false,
      message: '获取资源申请失败'
    });
  }
};

/**
 * 获取资源申请状态
 */
exports.getResourceStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await ResourceRequest.findById(id)
      .populate('createdBy', 'name')
      .populate('processedBy', 'name');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: '申请不存在'
      });
    }

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('获取资源状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取资源状态失败'
    });
  }
};

/**
 * ========== 政策接收与分发 ==========
 */

/**
 * 获取政策列表
 */
exports.getPolicies = async (req, res) => {
  try {
    const { category, status } = req.query;
    const filter = { villageId: req.user.villageId };

    if (category) filter.category = category;
    if (status) filter.status = status;

    const policies = await PolicyDistribution.find(filter)
      .sort({ receivedDate: -1 });

    res.json({
      success: true,
      data: policies
    });
  } catch (error) {
    console.error('获取政策失败:', error);
    res.status(500).json({
      success: false,
      message: '获取政策失败'
    });
  }
};

/**
 * 分发政策到村民
 */
exports.distributePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const { targetGroups, message } = req.body;

    const policy = await PolicyDistribution.findById(id);

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: '政策不存在'
      });
    }

    policy.status = 'distributed';
    policy.distributedBy = req.user._id;
    policy.distributedAt = new Date();
    policy.targetGroups = targetGroups;
    policy.distributionMessage = message;

    await policy.save();

    // 通知相关村民
    emitToVillage(req.user.villageId, 'policy-distributed', {
      policyId: policy._id,
      title: policy.title,
      targetGroups,
      message
    });

    res.json({
      success: true,
      data: policy,
      message: '政策已分发'
    });
  } catch (error) {
    console.error('分发政策失败:', error);
    res.status(500).json({
      success: false,
      message: '分发政策失败'
    });
  }
};

/**
 * ========== 任务承接与反馈 ==========
 */

/**
 * 获取任务列表
 */
exports.getTasks = async (req, res) => {
  try {
    const { status, priority } = req.query;
    const filter = { villageId: req.user.villageId };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const tasks = await TaskAssignment.find(filter)
      .populate('assignedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('获取任务失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务失败'
    });
  }
};

/**
 * 接受任务
 */
exports.acceptTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { estimatedCompletion } = req.body;

    const task = await TaskAssignment.findById(id);

    if (!task || task.villageId.toString() !== req.user.villageId.toString()) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    if (task.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '任务已被接受或已关闭'
      });
    }

    task.status = 'in_progress';
    task.acceptedBy = req.user._id;
    task.acceptedAt = new Date();
    task.estimatedCompletion = new Date(estimatedCompletion);

    await task.save();

    res.json({
      success: true,
      data: task,
      message: '任务已接受'
    });
  } catch (error) {
    console.error('接受任务失败:', error);
    res.status(500).json({
      success: false,
      message: '接受任务失败'
    });
  }
};

/**
 * 提交任务反馈
 */
exports.submitTaskFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, progress, issues, attachments } = req.body;

    const task = await TaskAssignment.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    task.status = status;
    task.progress = progress;
    task.feedback = {
      issues,
      attachments,
      submittedAt: new Date()
    };

    if (status === 'completed') {
      task.completedAt = new Date();
    }

    await task.save();

    // 通知上级政府
    emitToVillage(req.user.villageId, 'task-updated', {
      taskId: task._id,
      status,
      progress
    });

    res.json({
      success: true,
      data: task,
      message: '反馈已提交'
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
 * ========== 跨村协作 ==========
 */

/**
 * 获取协作请求
 */
exports.getCollaborationRequests = async (req, res) => {
  try {
    const { status, type } = req.query;
    const filter = {
      $or: [
        { fromVillageId: req.user.villageId },
        { toVillageId: req.user.villageId }
      ]
    };

    if (status) filter.status = status;
    if (type) filter.type = type;

    const requests = await CollaborationRequest.find(filter)
      .populate('fromVillageId', 'name')
      .populate('toVillageId', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('获取协作请求失败:', error);
    res.status(500).json({
      success: false,
      message: '获取协作请求失败'
    });
  }
};

/**
 * 创建协作请求
 */
exports.createCollaborationRequest = async (req, res) => {
  try {
    const { toVillageId, type, title, description, resources, urgency } = req.body;

    const request = await CollaborationRequest.create({
      fromVillageId: req.user.villageId,
      toVillageId,
      type,
      title,
      description,
      resources,
      urgency,
      status: 'pending',
      createdBy: req.user._id
    });

    // 通知目标村庄
    emitToVillage(toVillageId, 'collaboration-requested', {
      requestId: request._id,
      fromVillage: req.user.villageId,
      type,
      title,
      urgency
    });

    res.status(201).json({
      success: true,
      data: request,
      message: '协作请求已发送'
    });
  } catch (error) {
    console.error('创建协作请求失败:', error);
    res.status(500).json({
      success: false,
      message: '创建协作请求失败'
    });
  }
};

/**
 * 响应协作请求
 */
exports.respondToCollaboration = async (req, res) => {
  try {
    const { id } = req.params;
    const { response, message } = req.body;

    const request = await CollaborationRequest.findById(id);

    if (!request || request.toVillageId.toString() !== req.user.villageId.toString()) {
      return res.status(404).json({
        success: false,
        message: '协作请求不存在'
      });
    }

    request.status = response === 'accept' ? 'accepted' : 'declined';
    request.response = {
      message,
      respondedBy: req.user._id,
      respondedAt: new Date()
    };

    await request.save();

    // 通知发起村庄
    emitToVillage(request.fromVillageId, 'collaboration-responded', {
      requestId: request._id,
      response: request.status
    });

    res.json({
      success: true,
      data: request,
      message: response === 'accept' ? '已接受协作' : '已拒绝协作'
    });
  } catch (error) {
    console.error('响应协作请求失败:', error);
    res.status(500).json({
      success: false,
      message: '响应协作请求失败'
    });
  }
};

/**
 * ========== 应急资源调度 ==========
 */

/**
 * 调度应急资源
 */
exports.dispatchEmergencyResource = async (req, res) => {
  try {
    const { emergencyType, location, requiredResources, urgency } = req.body;

    // 创建应急资源调度记录
    const dispatch = await ResourceRequest.create({
      villageId: req.user.villageId,
      resourceType: 'emergency_dispatch',
      quantity: requiredResources.length,
      reason: `应急调度: ${emergencyType}`,
      urgency: urgency || 'high',
      status: 'dispatching',
      createdBy: req.user._id,
      metadata: {
        emergencyType,
        location,
        requiredResources
      }
    });

    // 通知相关村庄提供支援
    emitToVillage(req.user.villageId, 'emergency-dispatch', {
      dispatchId: dispatch._id,
      emergencyType,
      location,
      requiredResources
    });

    res.status(201).json({
      success: true,
      data: dispatch,
      message: '应急资源调度已启动'
    });
  } catch (error) {
    console.error('调度应急资源失败:', error);
    res.status(500).json({
      success: false,
      message: '调度应急资源失败'
    });
  }
};

/**
 * 获取应急资源
 */
exports.getEmergencyResources = async (req, res) => {
  try {
    const { type, status } = req.query;
    const filter = {
      resourceType: 'emergency_dispatch',
      villageId: req.user.villageId
    };

    if (type) filter['metadata.emergencyType'] = type;
    if (status) filter.status = status;

    const resources = await ResourceRequest.find(filter)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: resources
    });
  } catch (error) {
    console.error('获取应急资源失败:', error);
    res.status(500).json({
      success: false,
      message: '获取应急资源失败'
    });
  }
};
