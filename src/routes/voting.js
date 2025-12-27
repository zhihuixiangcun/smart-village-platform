/**
 * 村务投票路由
 * 处理投票相关的API路由
 */

const express = require('express');
const router = express.Router();
const {
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

  // 文件上传
  upload
} = require('../controllers/votingController');

const { authenticateToken } = require('../middleware/auth');
const { auditLogger, requirePermission } = require('../middleware/permissionMiddleware');
const rateLimit = require('express-rate-limit');

// 身份认证中间件
router.use(authenticateToken);

// 投票操作审计日志
const votingAudit = auditLogger({
  resource: 'voting',
  action: 'MANAGE_VOTING'
}, { sensitiveLevel: 'confidential' });

// 投票参与审计日志
const votingParticipationAudit = auditLogger({
  resource: 'voting_participation',
  action: 'PARTICIPATE_VOTING'
}, { sensitiveLevel: 'private' });

/**
 * 投票管理路由
 */

// 创建投票项目
router.post('/create',
  votingAudit,
  requirePermission('voting', 'create'),
  upload.array('attachments', 5),
  createVoting
);

// 提交投票
router.post('/:votingId/vote',
  votingParticipationAudit,
  requirePermission('voting', 'participate'),
  submitVote
);

// 获取投票列表
router.get('/list',
  auditLogger({
    resource: 'voting',
    action: 'LIST_VOTINGS'
  }, { sensitiveLevel: 'internal' }),
  requirePermission('voting', 'read'),
  getVotingList
);

// 获取投票详情
router.get('/:votingId/details',
  votingParticipationAudit,
  requirePermission('voting', 'read'),
  getVotingDetails
);

// 获取投票结果
router.get('/:votingId/results',
  votingParticipationAudit,
  requirePermission('voting', 'read'),
  getVotingResults
);

// 结束投票
router.post('/:votingId/end',
  votingAudit,
  requirePermission('voting', 'manage'),
  endVoting
);

// 获取投票进度统计
router.get('/:votingId/progress',
  votingParticipationAudit,
  requirePermission('voting', 'read'),
  getVotingProgress
);

/**
 * 用户功能路由
 */

// 获取用户投票历史
router.get('/user/history',
  votingParticipationAudit,
  getUserVotingHistory
);

// 获取用户可参与投票
router.get('/user/eligible',
  votingParticipationAudit,
  getUserEligibleVotings
);

/**
 * 统计报告路由
 */

// 获取投票统计报告
router.get('/report',
  auditLogger({
    resource: 'voting',
    action: 'VOTING_REPORT'
  }, { sensitiveLevel: 'internal' }),
  requirePermission('voting', 'report'),
  getVotingReport
);

// 获取活跃投票列表
router.get('/active',
  votingParticipationAudit,
  requirePermission('voting', 'read'),
  getActiveVotings
);

/**
 * 数据导出路由
 */

// 导出投票结果
router.get('/:votingId/export',
  auditLogger({
    resource: 'voting',
    action: 'EXPORT_RESULTS'
  }, { sensitiveLevel: 'internal' }),
  requirePermission('voting', 'export'),
  exportVotingResults
);

/**
 * 高级功能路由
 */

// 批量投票统计（管理员专用）
router.get('/statistics/batch',
  auditLogger({
    resource: 'voting',
    action: 'BATCH_STATISTICS'
  }, { sensitiveLevel: 'confidential' }),
  requirePermission('voting', 'admin'),
  async (req, res) => {
    try {
      const { votingIds } = req.body;

      if (!votingIds || !Array.isArray(votingIds) || votingIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: '请提供投票ID列表'
        });
      }

      const { VotingItem } = require('../models/Voting');
      const votings = await VotingItem.find({
        _id: { $in: votingIds }
      }).select('title votingType statistics timeSettings');

      const batchResults = votings.map(voting => ({
        votingId: voting._id,
        title: voting.title,
        votingType: voting.votingType,
        totalVoters: voting.statistics.totalVoters,
        votedCount: voting.statistics.votedCount,
        participationRate: voting.statistics.participationRate,
        startTime: voting.timeSettings.startTime,
        endTime: voting.timeSettings.endTime
      }));

      res.json({
        success: true,
        data: batchResults
      });

    } catch (error) {
      logger.error('批量统计失败:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// 投票数据分析（管理员专用）
router.post('/analytics',
  auditLogger({
    resource: 'voting',
    action: 'VOTING_ANALYTICS'
  }, { sensitiveLevel: 'confidential' }),
  requirePermission('voting', 'admin'),
  rateLimit({
    windowMs: 5 * 60 * 1000, // 5分钟
    max: 10, // 最多10次请求
    message: {
      success: false,
      message: '投票分析请求过于频繁，请稍后再试'
    }
  }),
  async (req, res) => {
    try {
      const { analysisType, filters } = req.body;

      const { VotingItem, VotingRecord } = require('../models/Voting');

      let aggregationPipeline = [];

      switch (analysisType) {
      case 'participation_trend':
        aggregationPipeline = [
          {
            $match: filters || {}
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt'
                }
              },
              totalVotings: { $sum: 1 },
              totalVotes: { $sum: '$statistics.votedCount' }
            }
          },
          { $sort: { _id: 1 } }
        ];
        break;

      case 'voting_type_distribution':
        aggregationPipeline = [
          {
            $match: filters || {}
          },
          {
            $group: {
              _id: '$votingType',
              count: { $sum: 1 },
              averageParticipation: { $avg: '$statistics.participationRate' }
            }
          }
        ];
        break;

      case 'peak_voting_hours':
        aggregationPipeline = [
          {
            $match: filters || {}
          },
          {
            $lookup: {
              from: 'voting_records',
              localField: '_id',
              foreignField: 'votingId',
              as: 'records'
            }
          },
          {
            $unwind: '$records'
          },
          {
            $group: {
              _id: {
                $hour: {
                  $hour: '$records.votedAt'
                }
              },
              voteCount: { $sum: 1 }
            }
          },
          { $sort: { voteCount: -1 } }
        ];
        break;

      default:
        throw new Error('不支持的分析类型');
      }

      const results = await VotingItem.aggregate(aggregationPipeline);

      res.json({
        success: true,
        analysisType,
        data: results
      });

    } catch (error) {
      logger.error('投票分析失败:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// 投票通知推送（管理员专用）
router.post('/:votingId/notify',
  votingAudit,
  requirePermission('voting', 'manage'),
  async (req, res) => {
    try {
      const { votingId } = req.params;
      const { notificationType, message, targets } = req.body;

      const notificationService = require('../services/approvalNotificationService');
      const { VotingItem } = require('../models/Voting');

      const voting = await VotingItem.findById(votingId);
      if (!voting) {
        return res.status(404).json({
          success: false,
          error: '投票项目不存在'
        });
      }

      // 获取目标用户
      let recipientIds = [];
      if (targets === 'all_voters') {
        // 获取所有符合条件的投票者
        const VotingRecord = require('../models/Voting').VotingRecord;
        const voters = await VotingRecord.find({
          votingId,
          status: 'valid'
        }).distinct('voter.userId');
        recipientIds = voters;
      } else if (targets && Array.isArray(targets)) {
        recipientIds = targets;
      }

      // 发送通知
      const notificationData = {
        type: notificationType || 'voting_notification',
        title: `投票通知：${voting.title}`,
        content: message || `请参与投票《${voting.title}》`,
        data: {
          votingId: voting._id,
          votingTitle: voting.title,
          votingType: voting.votingType
        }
      };

      await notificationService.sendNotification(recipientIds, notificationData);

      res.json({
        success: true,
        message: '通知发送成功',
        recipientCount: recipientIds.length
      });

    } catch (error) {
      logger.error('发送投票通知失败:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// 投票权限验证
router.post('/:votingId/check-permission',
  votingParticipationAudit,
  async (req, res) => {
    try {
      const { votingId } = req.params;
      const user = {
        userId: req.user._id,
        role: req.user.role,
        profile: req.user.profile
      };

      const { VotingItem } = require('../models/Voting');
      const voting = await VotingItem.findById(votingId);

      if (!voting) {
        return res.status(404).json({
          success: false,
          error: '投票项目不存在'
        });
      }

      const votingService = require('../services/votingService');
      const logger = require('../utils/logger');
      const canVote = await votingService.canUserVote(votingId, user);
      const canView = votingService.canViewVoting(voting, user);

      res.json({
        success: true,
        canVote,
        canView,
        votingStatus: voting.status,
        votingType: voting.votingType,
        permissions: voting.permissions
      });

    } catch (error) {
      logger.error('检查投票权限失败:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;