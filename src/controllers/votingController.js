/**
 * 村务投票控制器
 * 处理投票相关的API请求
 */

const votingService = require('../services/votingService');
const logger = require('../config/logger');
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
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持 JPEG、JPG、PNG、PDF、DOC、DOCX 格式的文件'));
    }
  }
});

/**
 * 创建投票项目
 */
async function createVoting(req, res) {
  try {
    const {
      title,
      description,
      votingType,
      timeSettings,
      permissions,
      options,
      rules,
      attachments
    } = req.body;

    const creator = {
      userId: req.user._id,
      userName: req.user.profile.displayName,
      department: req.user.department,
      role: req.user.role
    };

    // 处理附件
    let processedAttachments = [];
    if (req.files && req.files.length > 0) {
      processedAttachments = req.files.map(file => ({
        fileName: file.originalname,
        originalName: file.originalname,
        fileUrl: `/uploads/voting/${file.originalname}`, // 这里应该上传到云存储
        fileSize: file.size,
        fileType: file.mimetype,
        uploadedBy: {
          userId: req.user._id,
          userName: req.user.profile.displayName
        }
      }));
    }

    const votingData = {
      title,
      description,
      votingType,
      timeSettings: typeof timeSettings === 'string' ? JSON.parse(timeSettings) : timeSettings,
      permissions: typeof permissions === 'string' ? JSON.parse(permissions) : permissions,
      options: typeof options === 'string' ? JSON.parse(options) : options,
      rules: typeof rules === 'string' ? JSON.parse(rules) : rules,
      attachments: attachments ? [...JSON.parse(attachments), ...processedAttachments] : processedAttachments
    };

    const result = await votingService.createVoting(votingData, creator);

    res.status(201).json(result);

  } catch (error) {
    logger.error('创建投票项目失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * 提交投票
 */
async function submitVote(req, res) {
  try {
    const { votingId } = req.params;
    const { votes } = req.body;

    const voter = {
      userId: req.user._id,
      userName: req.user.profile.displayName,
      realName: req.user.profile.realName,
      idCard: req.user.profile.idCard,
      phone: req.user.profile.phone,
      address: req.user.profile.address
    };

    const voteData = {
      votes,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      votingMethod: 'online',
      votingChannel: 'web'
    };

    const result = await votingService.submitVote(votingId, voteData, voter);

    res.json(result);

  } catch (error) {
    logger.error('提交投票失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * 获取投票列表
 */
async function getVotingList(req, res) {
  try {
    const {
      status,
      votingType,
      organizerId,
      startDate,
      endDate,
      keyword,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = -1
    } = req.query;

    const filters = {
      status,
      votingType,
      organizerId,
      startDate,
      endDate,
      keyword
    };

    const pagination = {
      page,
      limit,
      sortBy,
      sortOrder
    };

    const result = await votingService.getVotingList(filters, pagination);

    res.json(result);

  } catch (error) {
    logger.error('获取投票列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * 获取投票详情
 */
async function getVotingDetails(req, res) {
  try {
    const { votingId } = req.params;

    const user = {
      userId: req.user._id,
      role: req.user.role,
      profile: req.user.profile
    };

    const result = await votingService.getVotingDetails(votingId, user);

    res.json(result);

  } catch (error) {
    logger.error('获取投票详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * 获取投票结果
 */
async function getVotingResults(req, res) {
  try {
    const { votingId } = req.params;

    const result = await votingService.getVotingResults(votingId);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('获取投票结果失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * 结束投票
 */
async function endVoting(req, res) {
  try {
    const { votingId } = req.params;

    const operator = {
      userId: req.user._id,
      userName: req.user.profile.displayName,
      role: req.user.role
    };

    const result = await votingService.endVoting(votingId, operator);

    res.json(result);

  } catch (error) {
    logger.error('结束投票失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * 获取用户投票历史
 */
async function getUserVotingHistory(req, res) {
  try {
    const {
      status,
      votingType,
      page = 1,
      limit = 20
    } = req.query;

    const userId = req.user._id;

    // 获取用户参与的投票记录
    const VotingRecord = require('../models/Voting').VotingRecord;
    const VotingItem = require('../models/Voting').VotingItem;

    const query = {
      'voter.userId': userId,
      status: status || 'valid'
    };

    const skip = (page - 1) * limit;

    const records = await VotingRecord.find(query)
      .sort({ votedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('votingId', 'title description votingType status timeSettings')
      .lean();

    // 获取投票详情
    const votingIds = records.map(record => record.votingId._id);
    const votingDetails = await VotingItem.find({
      _id: { $in: votingIds },
      'approval.isApproved': true
    })
      .select('title description votingType status timeSettings organizer')
      .populate('organizer.userId', 'profile.displayName')
      .lean();

    const total = await VotingRecord.countDocuments(query);

    res.json({
      success: true,
      data: records.map(record => ({
        ...record,
        votingDetail: votingDetails.find(v => v._id.toString() === record.votingId._id.toString())
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('获取用户投票历史失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * 获取投票统计报告
 */
async function getVotingReport(req, res) {
  try {
    const {
      startDate,
      endDate,
      votingType,
      status
    } = req.query;

    const filters = {
      startDate,
      endDate,
      votingType,
      status
    };

    const result = await votingService.getVotingReport(filters);

    res.json(result);

  } catch (error) {
    logger.error('获取投票统计报告失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * 获取活跃投票列表
 */
async function getActiveVotings(req, res) {
  try {
    const { votingType, organizerId } = req.query;

    const filters = {
      votingType,
      organizerId
    };

    const {
      VotingItem,
      VotingTypes,
      VotingStatus
    } = require('../models/Voting');

    const query = {
      status: VotingStatus.ACTIVE,
      'timeSettings.startTime': { $lte: new Date() },
      'timeSettings.endTime': { $gte: new Date() },
      'approval.isApproved': true
    };

    if (filters.votingType) {
      query.votingType = filters.votingType;
    }

    if (filters.organizerId) {
      query['organizer.userId'] = filters.organizerId;
    }

    const votings = await VotingItem.find(query)
      .sort({ 'timeSettings.endTime': 1 })
      .populate('organizer.userId', 'profile.displayName')
      .lean();

    res.json({
      success: true,
      data: votings
    });

  } catch (error) {
    logger.error('获取活跃投票失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * 获取用户可参与投票
 */
async function getUserEligibleVotings(req, res) {
  try {
    const user = {
      userId: req.user._id,
      role: req.user.role,
      profile: req.user.profile
    };

    const {
      VotingItem,
      VotingTypes,
      VotingStatus
    } = require('../models/Voting');

    // 构建查询条件
    const query = {
      status: VotingStatus.ACTIVE,
      'timeSettings.startTime': { $lte: new Date() },
      'timeSettings.endTime': { $gte: new Date() },
      'approval.isApproved': true
    };

    // 根据用户角色过滤
    const userRole = user.role;
    query.$or = [
      { 'permissions.type': 'all_villagers' },
      { 'permissions.type': 'committee_members', 'permissions.type': userRole },
      { 'permissions.type': 'registered_voters' }
    ];

    const votings = await VotingItem.find(query)
      .sort({ 'timeSettings.endTime': 1 })
      .populate('organizer.userId', 'profile.displayName')
      .lean();

    // 检查每个投票用户是否已参与
    const VotingRecord = require('../models/Voting').VotingRecord;
    for (const voting of votings) {
      const hasVoted = await VotingRecord.findOne({
        votingId: voting._id,
        'voter.userId': user.userId,
        status: 'valid'
      });

      voting.hasVoted = !!hasVoted;
      voting.canVote = !hasVoted;
    }

    res.json({
      success: true,
      data: votings
    });

  } catch (error) {
    logger.error('获取用户可参与投票失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * 批量导出投票结果
 */
async function exportVotingResults(req, res) {
  try {
    const { votingId } = req.params;
    const { format = 'json' } = req.query;

    const result = await votingService.getVotingResults(votingId);

    if (format === 'csv') {
      // CSV格式导出
      const csvHeader = '选项,投票数,百分比\n';
      let csvContent = csvHeader;

      result.options.forEach(option => {
        csvContent += `${option.optionContent},${option.voteCount},${option.percentage}%\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="voting_results.csv"');
      res.send(csvContent);

    } else {
      // JSON格式返回
      res.json({
        success: true,
        data: result
      });
    }

  } catch (error) {
    logger.error('导出投票结果失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * 获取投票进度统计
 */
async function getVotingProgress(req, res) {
  try {
    const { votingId } = req.params;

    const VotingItem = require('../models/Voting').VotingItem;
    const voting = await VotingItem.findById(votingId);

    if (!voting) {
      return res.status(404).json({
        success: false,
        error: '投票项目不存在'
      });
    }

    // 计算实时进度
    const now = new Date();
    const startTime = new Date(voting.timeSettings.startTime);
    const endTime = new Date(voting.timeSettings.endTime);
    const totalDuration = endTime - startTime;
    const elapsed = Math.min(now - startTime, totalDuration);
    const progressPercentage = Math.round((elapsed / totalDuration) * 100);

    // 获取实时投票统计
    await voting.updateStatistics();

    res.json({
      success: true,
      data: {
        votingId: voting._id,
        title: voting.title,
        status: voting.status,
        progressPercentage,
        timeRemaining: Math.max(0, endTime - now),
        statistics: voting.statistics,
        optionStats: voting.optionStats
      }
    });

  } catch (error) {
    logger.error('获取投票进度失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  // 投票管理
  createVoting,
  submitVote,
  getVotingList,
  getVotingDetails,
  getVotingResults,
  endVoting,

  // 用户功能
  getUserVotingHistory,
  getUserEligibleVotings,

  // 统计报告
  getVotingReport,
  getActiveVotings,
  getVotingProgress,

  // 数据导出
  exportVotingResults,

  // 文件上传中间件
  upload
};