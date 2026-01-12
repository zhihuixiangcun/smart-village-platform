const PropertyMaintenance = require('../models/PropertyMaintenance');

const createIssue = async (req, res) => {
  try {
    const issueData = {
      ...req.body,
      userId: req.user.id,
      villageId: req.user.villageId,
    };
    const issue = await PropertyMaintenance.create(issueData);
    issue.addTimeline('pending', '问题已提交', req.user.name);
    await issue.save();
    
    res.status(201).json({
      success: true,
      data: issue,
      message: '问题提交成功',
    });
  } catch (error) {
    console.error('提交物业问题失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getIssues = async (req, res) => {
  try {
    const { status, issueType, priority, page = 1, limit = 20 } = req.query;
    const filters = { userId: req.user.id };
    if (status) filters.status = status;
    if (issueType) filters.issueType = issueType;
    if (priority) filters.priority = priority;
    
    const [issues, total] = await Promise.all([
      PropertyMaintenance.getUserIssues(req.user.id, {
        ...filters,
        skip: (page - 1) * limit,
        limit: parseInt(limit),
      }),
      PropertyMaintenance.countDocuments({ userId: req.user.id, ...filters }),
    ]);
    
    res.json({
      success: true,
      data: issues,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取物业问题列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getPublicIssues = async (req, res) => {
  try {
    const { issueType, status, priority, page = 1, limit = 20 } = req.query;
    const filters = {
      villageId: req.user.villageId,
      isPublic: true,
    };
    if (issueType) filters.issueType = issueType;
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    
    const [issues, total] = await Promise.all([
      PropertyMaintenance.getPublicIssues(req.user.villageId, {
        ...filters,
        skip: (page - 1) * limit,
        limit: parseInt(limit),
      }),
      PropertyMaintenance.countDocuments({ villageId: req.user.villageId, isPublic: true, ...filters }),
    ]);
    
    res.json({
      success: true,
      data: issues,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取公共问题列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getIssueById = async (req, res) => {
  try {
    const issue = await PropertyMaintenance.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!issue) {
      return res.status(404).json({
        success: false,
        error: '问题不存在',
      });
    }
    
    res.json({
      success: true,
      data: issue,
    });
  } catch (error) {
    console.error('获取问题详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const updateIssue = async (req, res) => {
  try {
    const issue = await PropertyMaintenance.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!issue) {
      return res.status(404).json({
        success: false,
        error: '问题不存在',
      });
    }
    
    Object.assign(issue, req.body);
    await issue.save();
    
    res.json({
      success: true,
      data: issue,
      message: '问题更新成功',
    });
  } catch (error) {
    console.error('更新物业问题失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const updateStatus = async (req, res) => {
  try {
    const issue = await PropertyMaintenance.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!issue) {
      return res.status(404).json({
        success: false,
        error: '问题不存在',
      });
    }
    
    const { status, note } = req.body;
    await issue.updateStatus(status, note, req.user.name);
    
    res.json({
      success: true,
      data: issue,
      message: '状态更新成功',
    });
  } catch (error) {
    console.error('更新状态失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const evaluateIssue = async (req, res) => {
  try {
    const issue = await PropertyMaintenance.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!issue) {
      return res.status(404).json({
        success: false,
        error: '问题不存在',
      });
    }
    
    if (issue.status !== 'resolved') {
      return res.status(400).json({
        success: false,
        error: '只能评价已解决的问题',
      });
    }
    
    const { rating, feedback } = req.body;
    issue.rating = rating;
    issue.feedback = feedback;
    await issue.save();
    
    res.json({
      success: true,
      data: issue,
      message: '评价成功',
    });
  } catch (error) {
    console.error('评价问题失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const addLike = async (req, res) => {
  try {
    const issue = await PropertyMaintenance.findById(req.params.id);
    
    if (!issue) {
      return res.status(404).json({
        success: false,
        error: '问题不存在',
      });
    }
    
    const added = issue.addLike(req.user.id, req.user.name);
    if (added) {
      await issue.save();
      res.json({
        success: true,
        data: issue,
        message: '点赞成功',
      });
    } else {
      res.json({
        success: true,
        message: '已点赞',
      });
    }
  } catch (error) {
    console.error('点赞失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const removeLike = async (req, res) => {
  try {
    const issue = await PropertyMaintenance.findById(req.params.id);
    
    if (!issue) {
      return res.status(404).json({
        success: false,
        error: '问题不存在',
      });
    }
    
    const removed = issue.removeLike(req.user.id);
    if (removed) {
      await issue.save();
      res.json({
        success: true,
        data: issue,
        message: '取消点赞成功',
      });
    } else {
      res.json({
        success: true,
        message: '未点赞',
      });
    }
  } catch (error) {
    console.error('取消点赞失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getIssueTypes = async (req, res) => {
  try {
    const types = [
      {
        value: 'facility',
        label: '公共设施',
        icon: 'shop-o',
        subTypes: ['电梯故障', '路灯损坏', '道路破损', '健身设施', '其他'],
      },
      {
        value: 'repair',
        label: '物业维修',
        icon: 'service-o',
        subTypes: ['水管漏水', '电路故障', '门窗损坏', '墙体开裂', '其他'],
      },
      {
        value: 'suggestion',
        label: '建议意见',
        icon: 'chat-o',
        subTypes: ['管理建议', '服务改进', '环境优化', '其他'],
      },
      {
        value: 'complaint',
        label: '投诉建议',
        icon: 'warning-o',
        subTypes: ['服务态度', '收费问题', '卫生问题', '噪音问题', '其他'],
      },
    ];
    
    res.json({
      success: true,
      data: types,
    });
  } catch (error) {
    console.error('获取问题类型失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getIssueStatistics = async (req, res) => {
  try {
    const villageId = req.user.villageId;
    const statistics = await PropertyMaintenance.getIssueStatistics(villageId);
    
    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error('获取问题统计失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const deleteIssue = async (req, res) => {
  try {
    const issue = await PropertyMaintenance.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!issue) {
      return res.status(404).json({
        success: false,
        error: '问题不存在',
      });
    }
    
    res.json({
      success: true,
      message: '问题删除成功',
    });
  } catch (error) {
    console.error('删除问题失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  createIssue,
  getIssues,
  getPublicIssues,
  getIssueById,
  updateIssue,
  updateStatus,
  evaluateIssue,
  addLike,
  removeLike,
  getIssueTypes,
  getIssueStatistics,
  deleteIssue,
};
