const PropertyIssue = require('../models/PropertyIssue');

const createIssue = async (req, res) => {
  try {
    const issueData = {
      ...req.body,
      userId: req.user.id,
      villageId: req.user.villageId,
    };
    const issue = new PropertyIssue(issueData);
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
    const { status, type, urgency, page = 1, limit = 20 } = req.query;
    const filters = { userId: req.user.id };
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (urgency) filters.urgency = urgency;
    
    const [issues, total] = await Promise.all([
      PropertyIssue.find(filters)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      PropertyIssue.countDocuments(filters),
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
    console.error('获取问题列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getPublicIssues = async (req, res) => {
  try {
    const { type, status, urgency, page = 1, limit = 20 } = req.query;
    const filters = {
      villageId: req.user.villageId,
      isPublic: true,
    };
    if (type) filters.type = type;
    if (status) filters.status = status;
    if (urgency) filters.urgency = urgency;
    
    const [issues, total] = await Promise.all([
      PropertyIssue.find(filters)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      PropertyIssue.countDocuments(filters),
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
    const issue = await PropertyIssue.findOne({
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
    const issue = await PropertyIssue.findOne({
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
    const issue = await PropertyIssue.findOne({
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
    issue.status = status;
    if (note) {
      issue.description += `\n\n[更新]: ${note}`;
    }
    await issue.save();
    
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
    const issue = await PropertyIssue.findOne({
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
    
    const { rating, comment } = req.body;
    issue.evaluation = {
      rating,
      comment,
      createdAt: new Date(),
    };
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
    const issue = await PropertyIssue.findById(req.params.id);
    
    if (!issue) {
      return res.status(404).json({
        success: false,
        error: '问题不存在',
      });
    }
    
    const existingLike = issue.likes.find(like => like.userId.toString() === req.user.id);
    if (existingLike) {
      res.json({
        success: true,
        message: '已点赞',
      });
    } else {
      await issue.addLike(req.user.id);
      res.json({
        success: true,
        data: issue,
        message: '点赞成功',
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
    const issue = await PropertyIssue.findById(req.params.id);
    
    if (!issue) {
      return res.status(404).json({
        success: false,
        error: '问题不存在',
      });
    }
    
    const existingLike = issue.likes.find(like => like.userId.toString() === req.user.id);
    if (!existingLike) {
      res.json({
        success: true,
        message: '未点赞',
      });
    } else {
      await issue.removeLike(req.user.id);
      res.json({
        success: true,
        data: issue,
        message: '取消点赞成功',
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
        value: 'environment',
        label: '环境卫生',
        icon: 'service-o',
        subTypes: ['垃圾清理', '卫生清洁', '绿化问题', '其他'],
      },
      {
        value: 'security',
        label: '安全管理',
        icon: 'lock',
        subTypes: ['门禁问题', '监控损坏', '安全漏洞', '其他'],
      },
      {
        value: 'noise',
        label: '噪音扰民',
        icon: 'chat-o',
        subTypes: ['装修噪音', '商业噪音', '生活噪音', '其他'],
      },
      {
        value: 'traffic',
        label: '交通问题',
        icon: 'logistics',
        subTypes: ['车辆乱停', '道路堵塞', '交通设施', '其他'],
      },
      {
        value: 'other',
        label: '其他问题',
        icon: 'warning-o',
        subTypes: ['建议', '投诉', '其他'],
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
    const statistics = await PropertyIssue.getServiceStatistics(villageId);
    
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
    const issue = await PropertyIssue.findOneAndDelete({
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
