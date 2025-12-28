/**
 * 村民变动控制器
 * 处理村民变动相关的HTTP请求
 */

const residentChangeService = require('../services/residentChangeService');
const { validationResult } = require('express-validator');
const exceljs = require('exceljs');

/**
 * 创建村民变动记录
 */
exports.createChange = async (req, res) => {
  try {
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '参数验证失败',
        errors: errors.array()
      });
    }

    const changeData = {
      ...req.body,
      creatorName: req.user?.name || '管理员'
    };

    const changeRecord = await residentChangeService.createChangeRecord(
      changeData,
      req.user?._id || req.body.createdBy
    );

    res.status(201).json({
      success: true,
      message: '变动记录创建成功',
      data: changeRecord
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 批量创建村民变动记录
 */
exports.batchCreateChanges = async (req, res) => {
  try {
    const { changes } = req.body;

    if (!Array.isArray(changes) || changes.length === 0) {
      return res.status(400).json({
        success: false,
        message: '批量数据格式错误'
      });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < changes.length; i++) {
      try {
        const changeData = {
          ...changes[i],
          creatorName: req.user?.name || '管理员'
        };

        const record = await residentChangeService.createChangeRecord(
          changeData,
          req.user?._id
        );
        results.push({ index: i, success: true, data: record });
      } catch (error) {
        errors.push({ index: i, error: error.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `批量创建完成，成功${results.length}条，失败${errors.length}条`,
      data: {
        success: results,
        failed: errors
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取村民变动历史
 */
exports.getResidentHistory = async (req, res) => {
  try {
    const { residentId } = req.params;
    const { limit, skip } = req.query;

    const history = await residentChangeService.getResidentHistory(residentId, {
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0
    });

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取变动记录详情
 */
exports.getChangeDetail = async (req, res) => {
  try {
    const { Change } = require('../models/ResidentChange');
    const { id } = req.params;

    const change = await Change.findById(id)
      .populate('residentId', 'name idCard phone gender age')
      .populate('familyId')
      .populate('approverId', 'name phone')
      .populate('createdBy', 'name phone')
      .populate('updatedBy', 'name phone')
      .populate('relatedResidents.residentId', 'name idCard phone');

    if (!change) {
      return res.status(404).json({
        success: false,
        message: '变动记录不存在'
      });
    }

    res.json({
      success: true,
      data: change
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取待审核变动列表
 */
exports.getPendingList = async (req, res) => {
  try {
    const { villageId } = req.params;
    const { changeType, limit, skip } = req.query;

    const pendingList = await residentChangeService.getPendingList(villageId, {
      changeType,
      limit: parseInt(limit) || 20,
      skip: parseInt(skip) || 0
    });

    res.json({
      success: true,
      data: pendingList
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 审批变动记录
 */
exports.approveChange = async (req, res) => {
  try {
    const { id } = req.params;
    const { remark } = req.body;

    const change = await residentChangeService.approveChange(
      id,
      req.user._id,
      req.user.name,
      remark
    );

    res.json({
      success: true,
      message: '审批通过',
      data: change
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 拒绝变动记录
 */
exports.rejectChange = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: '请填写拒绝原因'
      });
    }

    const change = await residentChangeService.rejectChange(
      id,
      req.user._id,
      req.user.name,
      reason
    );

    res.json({
      success: true,
      message: '已拒绝',
      data: change
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 取消变动记录
 */
exports.cancelChange = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const change = await residentChangeService.cancelChange(
      id,
      req.user._id,
      reason
    );

    res.json({
      success: true,
      message: '已取消',
      data: change
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取变动统计
 */
exports.getStatistics = async (req, res) => {
  try {
    const { villageId } = req.params;
    const { startDate, endDate } = req.query;

    const stats = await residentChangeService.getStatistics(
      villageId,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取变动趋势
 */
exports.getTrends = async (req, res) => {
  try {
    const { villageId } = req.params;
    const { months } = req.query;

    const trends = await residentChangeService.getTrends(
      villageId,
      parseInt(months) || 12
    );

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取人口流动分析
 */
exports.getPopulationFlow = async (req, res) => {
  try {
    const { villageId } = req.params;
    const { startDate, endDate } = req.query;

    const flowData = await residentChangeService.getPopulationFlowAnalysis(
      villageId,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: flowData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取劳动力分析
 */
exports.getLaborAnalysis = async (req, res) => {
  try {
    const { villageId } = req.params;
    const { startDate, endDate } = req.query;

    const laborData = await residentChangeService.getLaborAnalysis(
      villageId,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: laborData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 搜索变动记录
 */
exports.searchChanges = async (req, res) => {
  try {
    const { villageId } = req.params;
    const searchCriteria = {
      ...req.query,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };

    const result = await residentChangeService.searchChanges(villageId, searchCriteria);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 导出变动记录
 */
exports.exportChanges = async (req, res) => {
  try {
    const { villageId } = req.params;
    const filters = req.query;

    const exportData = await residentChangeService.exportChanges(villageId, filters);

    // 创建Excel工作簿
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('村民变动记录');

    // 设置列
    const columns = Object.keys(exportData[0] || {});
    worksheet.columns = columns.map(col => ({
      header: col,
      key: col,
      width: 20
    }));

    // 设置表头样式
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 添加数据
    exportData.forEach(row => {
      worksheet.addRow(row);
    });

    // 设置响应头
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=resident-changes-${Date.now()}.xlsx`
    );

    // 发送文件
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取变动类型配置
 */
exports.getChangeTypeConfig = (req, res) => {
  try {
    const config = residentChangeService.getChangeTypeConfig();

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 上传证明材料
 */
exports.uploadProofFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }

    const fileData = {
      fileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      fileType: req.file.mimetype.startsWith('image/') ? 'image' :
                 req.file.mimetype === 'application/pdf' ? 'pdf' : 'other',
      fileSize: req.file.size,
      uploadedBy: req.user._id
    };

    res.json({
      success: true,
      message: '文件上传成功',
      data: fileData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取村庄变动概览
 */
exports.getVillageOverview = async (req, res) => {
  try {
    const { villageId } = req.params;
    const { Change } = require('../models/ResidentChange');

    // 今日统计
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await Change.aggregate([
      {
        $match: {
          villageId: require('mongoose').Types.ObjectId(villageId),
          registerDate: { $gte: today }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // 本月统计
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const monthlyStats = await Change.aggregate([
      {
        $match: {
          villageId: require('mongoose').Types.ObjectId(villageId),
          registerDate: { $gte: thisMonth }
        }
      },
      {
        $group: {
          _id: '$changeType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // 待处理数量
    const pendingCount = await Change.countDocuments({
      villageId: require('mongoose').Types.ObjectId(villageId),
      status: 'pending'
    });

    // 近期趋势（最近7天）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentTrend = await Change.aggregate([
      {
        $match: {
          villageId: require('mongoose').Types.ObjectId(villageId),
          registerDate: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$registerDate' },
            month: { $month: '$registerDate' },
            day: { $dayOfMonth: '$registerDate' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        today: {
          total: todayStats.reduce((sum, s) => sum + s.count, 0),
          details: todayStats
        },
        monthly: {
          topChanges: monthlyStats
        },
        pending: pendingCount,
        recentTrend: recentTrend.map(t => ({
          date: `${t._id.year}-${String(t._id.month).padStart(2, '0')}-${String(t._id.day).padStart(2, '0')}`,
          count: t.count
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 获取预警信息
 */
exports.getAlerts = async (req, res) => {
  try {
    const { villageId } = req.params;
    const { Change } = require('../models/ResidentChange');

    const alerts = await Change.find({
      villageId: require('mongoose').Types.ObjectId(villageId),
      'alertFlags.requiresAttention': true
    })
      .sort({ registerDate: -1 })
      .limit(50)
      .populate('residentId', 'name idCard phone')
      .populate('createdBy', 'name');

    res.json({
      success: true,
      data: alerts.map(alert => ({
        id: alert._id,
        residentName: alert.residentId?.name,
        residentIdCard: alert.residentId?.idCard,
        changeType: alert.changeTypeName,
        changeDate: alert.changeDate,
        alertFlags: alert.alertFlags,
        creatorName: alert.createdBy?.name
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 处理批量审批
 */
exports.batchApprove = async (req, res) => {
  try {
    const { ids, remark } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要审批的记录'
      });
    }

    const results = [];
    const errors = [];

    for (const id of ids) {
      try {
        const change = await residentChangeService.approveChange(
          id,
          req.user._id,
          req.user.name,
          remark
        );
        results.push({ id, success: true });
      } catch (error) {
        errors.push({ id, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `批量审批完成，成功${results.length}条，失败${errors.length}条`,
      data: {
        success: results,
        failed: errors
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * 处理批量拒绝
 */
exports.batchReject = async (req, res) => {
  try {
    const { ids, reason } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要拒绝的记录'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: '请填写拒绝原因'
      });
    }

    const results = [];
    const errors = [];

    for (const id of ids) {
      try {
        const change = await residentChangeService.rejectChange(
          id,
          req.user._id,
          req.user.name,
          reason
        );
        results.push({ id, success: true });
      } catch (error) {
        errors.push({ id, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `批量拒绝完成，成功${results.length}条，失败${errors.length}条`,
      data: {
        success: results,
        failed: errors
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
