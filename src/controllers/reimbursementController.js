/**
 * 村委财务报销控制器
 * 支持报销申请管理、审批流程、附件上传和统计分析
 *
 * 权限说明:
 * - 会计员 (accountant): 可修改所有报销资料
 * - 村支书 (party_secretary): 可查看所有报销资料
 * - 村主任 (village_head): 可审批报销
 * - 村干部 (village_cadre): 只能查看和操作自己的报销申请
 * - 其他人: 无权限访问
 */

const Reimbursement = require('../models/Reimbursement');
const { emitToVillage } = require('../services/socketService');

/**
 * ========== 权限检查辅助函数 ==========
 */

/**
 * 检查用户是否有访问报销资料的权限
 * @param {Object} user - 当前用户
 * @param {Object} reimbursement - 报销记录
 * @param {string} action - 操作类型: 'view', 'modify', 'delete'
 * @returns {Object} { hasPermission: boolean, message: string }
 */
function checkReimbursementPermission(user, reimbursement, action = 'view') {
  const userRole = user.role;

  // 会计员 - 完全权限
  if (userRole === 'accountant') {
    return { hasPermission: true };
  }

  // 村支书 - 只读权限
  if (userRole === 'party_secretary') {
    if (action === 'view') {
      return { hasPermission: true };
    }
    return {
      hasPermission: false,
      message: '村支书只能查看报销资料，不能进行此操作'
    };
  }

  // 村主任 - 审批权限（可以查看和审批）
  if (userRole === 'village_head') {
    if (action === 'view' || action === 'approve') {
      return { hasPermission: true };
    }
    return {
      hasPermission: false,
      message: '村主任无权进行此操作'
    };
  }

  // 村干部 - 只能操作自己的报销
  if (userRole === 'village_cadre') {
    if (reimbursement.applicantId.toString() === user._id.toString()) {
      // 申请人可以查看、修改草稿、删除草稿/被拒绝的申请、提交审批
      if (action === 'view') {
        return { hasPermission: true };
      }
      if (action === 'modify') {
        if (reimbursement.status === 'draft' || reimbursement.status === 'pending') {
          return { hasPermission: true };
        }
        return {
          hasPermission: false,
          message: '只能修改草稿或待审核状态的报销申请'
        };
      }
      if (action === 'delete') {
        if (reimbursement.status === 'draft' || reimbursement.status === 'rejected') {
          return { hasPermission: true };
        }
        return {
          hasPermission: false,
          message: '只能删除草稿或被拒绝的报销申请'
        };
      }
      if (action === 'submit') {
        return { hasPermission: true };
      }
    }
    return {
      hasPermission: false,
      message: '无权访问此报销申请'
    };
  }

  // 其他角色 - 无权限
  return {
    hasPermission: false,
    message: '您没有权限访问报销管理功能'
  };
}

/**
 * ========== 报销申请管理 ==========
 */

/**
 * 创建报销申请
 */
exports.createReimbursement = async (req, res) => {
  try {
    const { category, amount, description, occurrenceDate, department } = req.body;

    // 检查是否已有待处理的申请
    const existingPending = await Reimbursement.findOne({
      applicantId: req.user._id,
      status: { $in: ['draft', 'pending', 'reviewing'] }
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: '您已有待处理的报销申请，请先完成或取消后再申请新的报销'
      });
    }

    const reimbursement = await Reimbursement.create({
      reimbursementId: await Reimbursement.generateReimbursementId(),
      villageId: req.user.villageId,
      applicantId: req.user._id,
      applicantName: req.user.name,
      department: department || req.user.department,
      category,
      amount: parseFloat(amount),
      description,
      occurrenceDate: new Date(occurrenceDate),
      materialsStatus: {
        submitted: [],
        missing: [],
        completeness: 0
      },
      approvalFlow: [],
      status: 'draft'
    });

    // 计算材料完整性
    reimbursement.checkCompleteness();
    await reimbursement.save();

    res.status(201).json({
      success: true,
      data: reimbursement,
      message: '报销申请创建成功'
    });
  } catch (error) {
    console.error('创建报销失败:', error);
    res.status(500).json({
      success: false,
      message: '创建报销失败'
    });
  }
};

/**
 * 获取报销列表（分页、筛选）
 * 权限: 会计员看全部，村支书看全部，村主任看全部，村干部只看自己的
 */
exports.getReimbursements = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      startDate,
      endDate,
      applicantId,
      department,
      amountMin,
      amountMax
    } = req.query;

    // 先检查用户是否有基本访问权限
    const { hasPermission, message } = checkReimbursementPermission(req.user, null, 'view');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message
      });
    }

    const filter = {
      villageId: req.user.villageId,
      isDeleted: false
    };

    // 根据角色设置可见范围
    // 会计员、村支书、村主任可以查看所有报销
    // 村干部只能查看自己的报销
    if (req.user.role === 'village_cadre') {
      filter.applicantId = req.user._id;
    }

    // 申请人筛选（仅会计员可指定查看他人申请）
    if (applicantId && req.user.role === 'accountant') {
      filter.applicantId = applicantId;
    }

    // 状态筛选
    if (status) filter.status = status;

    // 类别筛选
    if (category) filter.category = category;

    // 部门筛选
    if (department) filter.department = department;

    // 日期范围筛选
    if (startDate || endDate) {
      filter.occurrenceDate = {};
      if (startDate) filter.occurrenceDate.$gte = new Date(startDate);
      if (endDate) filter.occurrenceDate.$lte = new Date(endDate);
    }

    // 金额范围筛选
    if (amountMin || amountMax) {
      filter.amount = {};
      if (amountMin) filter.amount.$gte = parseFloat(amountMin);
      if (amountMax) filter.amount.$lte = parseFloat(amountMax);
    }

    const skip = (page - 1) * limit;
    const total = await Reimbursement.countDocuments(filter);

    const reimbursements = await Reimbursement.find(filter)
      .populate('applicantId', 'name department phone')
      .sort({ applicationDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        reimbursements,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: reimbursements.length
        }
      }
    });
  } catch (error) {
    console.error('获取报销列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取报销列表失败'
    });
  }
};

/**
 * 获取报销详情
 * 权限: 会计员、村支书、村主任可查看全部，村干部只能查看自己的
 */
exports.getReimbursementById = async (req, res) => {
  try {
    const { id } = req.params;

    const reimbursement = await Reimbursement.findById(id)
      .populate('applicantId', 'name department phone')
      .populate('approvalFlow.approverId', 'name');

    if (!reimbursement) {
      return res.status(404).json({
        success: false,
        message: '报销申请不存在'
      });
    }

    // 检查权限
    const { hasPermission, message } = checkReimbursementPermission(req.user, reimbursement, 'view');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message
      });
    }

    res.json({
      success: true,
      data: reimbursement
    });
  } catch (error) {
    console.error('获取报销详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取报销详情失败'
    });
  }
};

/**
 * 更新报销申请
 * 权限: 只有会计员可以修改所有报销，村干部只能修改自己的草稿/待审核申请
 */
exports.updateReimbursement = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, amount, description, occurrenceDate, department } = req.body;

    const reimbursement = await Reimbursement.findById(id);

    if (!reimbursement) {
      return res.status(404).json({
        success: false,
        message: '报销申请不存在'
      });
    }

    // 会计员可以修改任何报销
    if (req.user.role === 'accountant') {
      reimbursement.category = category || reimbursement.category;
      reimbursement.amount = amount ? parseFloat(amount) : reimbursement.amount;
      reimbursement.description = description || reimbursement.description;
      reimbursement.occurrenceDate = occurrenceDate ? new Date(occurrenceDate) : reimbursement.occurrenceDate;
      reimbursement.department = department || reimbursement.department;

      // 重新计算材料完整性
      reimbursement.checkCompleteness();

      await reimbursement.save();

      res.json({
        success: true,
        data: reimbursement,
        message: '报销申请更新成功'
      });
      return;
    }

    // 村干部只能修改自己的草稿或待审核申请
    const { hasPermission, message } = checkReimbursementPermission(req.user, reimbursement, 'modify');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message
      });
    }

    // 更新基本信息
    reimbursement.category = category || reimbursement.category;
    reimbursement.amount = amount ? parseFloat(amount) : reimbursement.amount;
    reimbursement.description = description || reimbursement.description;
    reimbursement.occurrenceDate = occurrenceDate ? new Date(occurrenceDate) : reimbursement.occurrenceDate;
    reimbursement.department = department || reimbursement.department;

    // 重新计算材料完整性
    reimbursement.checkCompleteness();

    await reimbursement.save();

    res.json({
      success: true,
      data: reimbursement,
      message: '报销申请更新成功'
    });
  } catch (error) {
    console.error('更新报销失败:', error);
    res.status(500).json({
      success: false,
      message: '更新报销失败'
    });
  }
};

/**
 * 提交审批
 */
exports.submitReimbursement = async (req, res) => {
  try {
    const { id } = req.params;

    const reimbursement = await Reimbursement.findById(id);

    if (!reimbursement) {
      return res.status(404).json({
        success: false,
        message: '报销申请不存在'
      });
    }

    // 仅申请人可提交
    if (reimbursement.applicantId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权提交此报销申请'
      });
    }

    // 检查材料完整性
    reimbursement.checkCompleteness();
    if (reimbursement.materialsStatus.completeness < 100) {
      return res.status(400).json({
        success: false,
        message: '材料不完整，请上传所有必要附件后再提交',
        missing: reimbursement.materialsStatus.missing
      });
    }

    // 更新状态和审批流程
    reimbursement.status = 'pending';
    reimbursement.approvalFlow.push({
      role: 'admin',
      status: 'pending',
      timestamp: new Date()
    });

    await reimbursement.save();

    // 通知财务人员
    emitToVillage(reimbursement.villageId, 'reimbursement-submitted', {
      reimbursementId: reimbursement._id,
      applicantName: reimbursement.applicantName,
      amount: reimbursement.amount,
      category: reimbursement.category
    });

    res.json({
      success: true,
      data: reimbursement,
      message: '报销申请提交成功，等待审批'
    });
  } catch (error) {
    console.error('提交报销失败:', error);
    res.status(500).json({
      success: false,
      message: '提交报销失败'
    });
  }
};

/**
 * 审批报销
 * 权限: 村主任和会计员可以审批
 */
exports.approveReimbursement = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;

    const reimbursement = await Reimbursement.findById(id);

    if (!reimbursement) {
      return res.status(404).json({
        success: false,
        message: '报销申请不存在'
      });
    }

    // 检查审批权限 - 会计员或村主任可以审批
    const { hasPermission, message } = checkReimbursementPermission(req.user, reimbursement, 'approve');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message
      });
    }

    // 更新状态
    reimbursement.status = status;

    // 更新审批流程
    const lastApproval = reimbursement.approvalFlow[reimbursement.approvalFlow.length - 1];
    if (lastApproval) {
      lastApproval.status = status;
      lastApproval.comment = comment;
      lastApproval.approverId = req.user._id;
      lastApproval.approverName = req.user.name;
    } else {
      // 如果没有审批流程，创建一个
      reimbursement.approvalFlow.push({
        role: req.user.role,
        status: status,
        comment: comment,
        approverId: req.user._id,
        approverName: req.user.name,
        timestamp: new Date()
      });
    }

    await reimbursement.save();

    // 通知申请人
    emitToVillage(reimbursement.villageId, 'reimbursement-approved', {
      reimbursementId: reimbursement._id,
      applicantId: reimbursement.applicantId,
      status,
      amount: reimbursement.amount,
      comment
    });

    res.json({
      success: true,
      data: reimbursement,
      message: `报销申请已${status === 'approved' ? '通过' : '拒绝'}`
    });
  } catch (error) {
    console.error('审批报销失败:', error);
    res.status(500).json({
      success: false,
      message: '审批报销失败'
    });
  }
};

/**
 * 上传附件
 * 权限: 只有会计员可以上传附件到任何报销，村干部只能上传到自己的申请
 */
exports.uploadAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileType } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传文件'
      });
    }

    const reimbursement = await Reimbursement.findById(id);

    if (!reimbursement) {
      return res.status(404).json({
        success: false,
        message: '报销申请不存在'
      });
    }

    // 会计员可以上传到任何报销
    if (req.user.role !== 'accountant') {
      // 村干部只能上传到自己的申请
      if (reimbursement.applicantId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: '无权上传附件到此报销申请'
        });
      }
    }

    // 创建附件记录
    const ReimbursementAttachment = require('../models/Reimbursement').ReimbursementAttachment;
    const attachment = await ReimbursementAttachment.create({
      reimbursementId: reimbursement._id,
      fileType,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.user._id
    });

    // 更新报销申请的 materialsStatus
    if (!reimbursement.materialsStatus.submitted.includes(fileType)) {
      reimbursement.materialsStatus.submitted.push(fileType);
      reimbursement.checkCompleteness();
      await reimbursement.save();
    }

    res.json({
      success: true,
      data: attachment,
      message: '附件上传成功'
    });
  } catch (error) {
    console.error('上传附件失败:', error);
    res.status(500).json({
      success: false,
      message: '上传附件失败'
    });
  }
};

/**
 * 获取个人报销统计
 */
exports.getPersonalStatistics = async (req, res) => {
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

    const reimbursements = await Reimbursement.find({
      applicantId: req.user._id,
      applicationDate: { $gte: startDate, $lte: endDate }
    });

    // 按状态统计
    const byStatus = {};
    reimbursements.forEach(r => {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    });

    // 按类别统计
    const byCategory = {};
    reimbursements.forEach(r => {
      if (!byCategory[r.category]) {
        byCategory[r.category] = { count: 0, amount: 0 };
      }
      byCategory[r.category].count += 1;
      byCategory[r.category].amount += r.amount;
    });

    // 计算审批效率
    const processedCount = reimbursements.filter(r =>
      ['approved', 'rejected', 'paid'].includes(r.status)
    ).length;
    const approvalEfficiency = reimbursements.length > 0
      ? Math.round((processedCount / reimbursements.length) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        summary: {
          totalApplied: reimbursements.length,
          totalAmount: reimbursements.reduce((sum, r) => sum + r.amount, 0),
          approvedCount: byStatus.approved || 0,
          rejectedCount: byStatus.rejected || 0,
          paidAmount: reimbursements
            .filter(r => r.status === 'paid')
            .reduce((sum, r) => sum + r.amount, 0),
          approvalEfficiency
        },
        byStatus,
        byCategory
      }
    });
  } catch (error) {
    console.error('获取个人统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取个人统计失败'
    });
  }
};

/**
 * 获取村级报销统计
 */
exports.getVillageStatistics = async (req, res) => {
  try {
    const { year, month, department } = req.query;
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

    const filter = {
      villageId: req.user.villageId,
      applicationDate: { $gte: startDate, $lte: endDate },
      isDeleted: false
    };

    if (department) filter.department = department;

    const reimbursements = await Reimbursement.find(filter)
      .populate('applicantId', 'name department');

    // 按部门统计
    const byDepartment = {};
    reimbursements.forEach(r => {
      const dept = r.department || '未分类';
      if (!byDepartment[dept]) {
        byDepartment[dept] = { count: 0, amount: 0 };
      }
      byDepartment[dept].count += 1;
      byDepartment[dept].amount += r.amount;
    });

    // 按申请人统计
    const byApplicant = {};
    reimbursements.forEach(r => {
      const applicant = r.applicantId.name;
      if (!byApplicant[applicant]) {
        byApplicant[applicant] = { count: 0, amount: 0 };
      }
      byApplicant[applicant].count += 1;
      byApplicant[applicant].amount += r.amount;
    });

    // 按状态统计
    const byStatus = {};
    reimbursements.forEach(r => {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    });

    // 金额分布
    const amountRanges = {
      '0-500': { count: 0, amount: 0 },
      '500-1000': { count: 0, amount: 0 },
      '1000-5000': { count: 0, amount: 0 },
      '5000+': { count: 0, amount: 0 }
    };

    reimbursements.forEach(r => {
      if (r.amount <= 500) {
        amountRanges['0-500'].count++;
        amountRanges['0-500'].amount += r.amount;
      } else if (r.amount <= 1000) {
        amountRanges['500-1000'].count++;
        amountRanges['500-1000'].amount += r.amount;
      } else if (r.amount <= 5000) {
        amountRanges['1000-5000'].count++;
        amountRanges['1000-5000'].amount += r.amount;
      } else {
        amountRanges['5000+'].count++;
        amountRanges['5000+'].amount += r.amount;
      }
    });

    // 审批效率
    const processedCount = reimbursements.filter(r =>
      ['approved', 'rejected', 'paid'].includes(r.status)
    ).length;
    const approvalEfficiency = reimbursements.length > 0
      ? Math.round((processedCount / reimbursements.length) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        summary: {
          totalApplications: reimbursements.length,
          totalAmount: reimbursements.reduce((sum, r) => sum + r.amount, 0),
          approvedAmount: reimbursements
            .filter(r => r.status === 'approved')
            .reduce((sum, r) => sum + r.amount, 0),
          pendingCount: byStatus.pending || 0,
          approvalEfficiency
        },
        byDepartment,
        byStatus,
        byApplicant,
        amountRanges
      }
    });
  } catch (error) {
    console.error('获取村级统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取村级统计失败'
    });
  }
};

/**
 * 删除报销申请
 * 权限: 会计员可以删除任何报销，村干部只能删除自己的草稿/被拒绝申请
 */
exports.deleteReimbursement = async (req, res) => {
  try {
    const { id } = req.params;

    const reimbursement = await Reimbursement.findById(id);

    if (!reimbursement) {
      return res.status(404).json({
        success: false,
        message: '报销申请不存在'
      });
    }

    // 会计员可以删除任何报销
    if (req.user.role === 'accountant') {
      // 软删除
      reimbursement.isDeleted = true;
      reimbursement.deletedAt = new Date();
      reimbursement.deletedBy = req.user._id;

      await reimbursement.save();

      res.json({
        success: true,
        message: '报销申请已删除'
      });
      return;
    }

    // 村干部检查权限
    const { hasPermission, message } = checkReimbursementPermission(req.user, reimbursement, 'delete');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message
      });
    }

    // 软删除
    reimbursement.isDeleted = true;
    reimbursement.deletedAt = new Date();
    reimbursement.deletedBy = req.user._id;

    await reimbursement.save();

    res.json({
      success: true,
      message: '报销申请已删除'
    });
  } catch (error) {
    console.error('删除报销失败:', error);
    res.status(500).json({
      success: false,
      message: '删除报销失败'
    });
  }
};