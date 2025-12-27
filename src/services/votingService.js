/**
 * 村务投票服务
 * 处理投票创建、管理、统计等功能
 */

const {
  VotingItem,
  VotingRecord,
  VotingTypes,
  VotingStatus,
  OptionTypes,
  VotingPermissions
} = require('../models/Voting');

const User = require('../models/User');
const notificationService = require('./approvalNotificationService');
const webSocketService = require('./webSocketService');
const logger = require('../config/logger');

class VotingService {
  constructor() {
    this.defaultConfig = {
      maxActiveVotings: 50,
      minVotingDuration: 1, // 最短投票时长（天）
      maxVotingDuration: 30, // 最长投票时长（天）
      reminderIntervals: [24, 72, 168], // 提醒间隔（小时）
      minParticipants: 10 // 最低参与人数
    };
  }

  /**
   * 创建投票项目
   * @param {Object} votingData - 投票数据
   * @param {Object} creator - 创建者信息
   * @returns {Promise<Object>} 创建结果
   */
  async createVoting(votingData, creator) {
    try {
      // 验证投票数据
      this.validateVotingData(votingData);

      // 检查权限
      await this.checkCreatePermission(creator, votingData);

      // 生成选项ID
      votingData.options = votingData.options.map((option, index) => ({
        ...option,
        id: `option_${Date.now()}_${index}`,
        sortOrder: index
      }));

      // 计算结束时间
      const startTime = new Date(votingData.timeSettings.startTime);
      const duration = votingData.timeSettings.duration || this.defaultConfig.maxVotingDuration;
      votingData.timeSettings.endTime = new Date(startTime.getTime() + duration * 24 * 60 * 60 * 1000);

      // 创建投票项目
      const voting = new VotingItem({
        ...votingData,
        organizer: {
          userId: creator.userId,
          userName: creator.userName,
          department: creator.department,
          role: creator.role
        },
        statistics: {
          totalVoters: await this.calculateEligibleVoters(votingData.permissions),
          votedCount: 0,
          validVotesCount: 0,
          invalidVotesCount: 0,
          abstainCount: 0,
          participationRate: 0
        }
      });

      // 初始化选项统计
      voting.optionStats = votingData.options.map(option => ({
        optionId: option.id,
        voteCount: 0,
        percentage: 0,
        voters: []
      }));

      await voting.save();

      // 设置提醒任务
      this.scheduleReminders(voting);

      logger.info(`投票项目创建成功: ${voting._id}, 标题: ${voting.title}`);

      return {
        success: true,
        votingId: voting._id,
        message: '投票项目创建成功'
      };

    } catch (error) {
      logger.error('创建投票项目失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 提交投票
   * @param {string} votingId - 投票ID
   * @param {Object} voteData - 投票数据
   * @param {Object} voter - 投票者信息
   * @returns {Promise<Object>} 投票结果
   */
  async submitVote(votingId, voteData, voter) {
    try {
      // 获取投票项目
      const voting = await VotingItem.findById(votingId);
      if (!voting) {
        throw new Error('投票项目不存在');
      }

      // 验证投票状态和权限
      this.validateVotingEligibility(voting, voter);

      // 检查是否已投票
      const hasVoted = await voting.hasUserVoted(voter.userId);
      if (hasVoted && !voting.rules.allowChangeVote) {
        throw new Error('您已经参与过此投票');
      }

      // 验证投票数据
      this.validateVoteData(voteData, voting);

      // 创建投票记录
      const votingRecord = new VotingRecord({
        votingId,
        voter: {
          userId: voter.userId,
          userName: voter.userName,
          realName: voter.realName,
          idCard: voter.idCard,
          phone: voter.phone,
          address: voter.address,
          isAnonymous: voting.rules.isAnonymous
        },
        votes: voteData.votes,
        metadata: {
          ipAddress: voteData.ipAddress,
          userAgent: voteData.userAgent,
          votingMethod: voteData.votingMethod || 'online',
          votingChannel: voteData.votingChannel || 'web'
        }
      });

      // 如果已投票，先取消原投票
      if (hasVoted) {
        await this.cancelPreviousVote(votingId, voter.userId);
      }

      // 保存投票记录
      await votingRecord.save();

      // 更新投票统计
      await this.updateVotingStatistics(voting, voteData.votes);

      // 发送投票成功通知
      await this.sendVoteNotification(voting, voter, votingRecord);

      logger.info(`投票提交成功: 投票ID=${votingId}, 用户=${voter.userId}`);

      return {
        success: true,
        recordId: votingRecord._id,
        message: '投票提交成功'
      };

    } catch (error) {
      logger.error('提交投票失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取投票项目列表
   * @param {Object} filters - 过滤条件
   * @param {Object} pagination - 分页参数
   * @returns {Promise<Object>} 投票列表
   */
  async getVotingList(filters = {}, pagination = {}) {
    try {
      const {
        status,
        votingType,
        organizerId,
        startDate,
        endDate,
        keyword
      } = filters;

      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = -1
      } = pagination;

      // 构建查询条件
      const query = {
        'approval.isApproved': true
      };

      if (status) {
        query.status = status;
      }

      if (votingType) {
        query.votingType = votingType;
      }

      if (organizerId) {
        query['organizer.userId'] = organizerId;
      }

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      if (keyword) {
        query.$or = [
          { title: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;
      const sort = {};
      sort[sortBy] = sortOrder;

      const votings = await VotingItem.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('organizer.userId', 'profile.displayName')
        .lean();

      const total = await VotingItem.countDocuments(query);

      return {
        success: true,
        data: votings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('获取投票列表失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取投票详情
   * @param {string} votingId - 投票ID
   * @param {Object} user - 用户信息
   * @returns {Promise<Object>} 投票详情
   */
  async getVotingDetails(votingId, user = null) {
    try {
      const voting = await VotingItem.findById(votingId)
        .populate('organizer.userId', 'profile.displayName')
        .lean();

      if (!voting) {
        throw new Error('投票项目不存在');
      }

      // 检查权限
      if (!this.canViewVoting(voting, user)) {
        throw new Error('无权限查看此投票');
      }

      // 获取用户投票记录
      let userVote = null;
      if (user) {
        userVote = await VotingRecord.findOne({
          votingId,
          'voter.userId': user.userId,
          status: 'valid'
        });
      }

      // 如果允许显示结果或已结束，返回统计信息
      let results = null;
      if (voting.rules.showResultsBeforeEnd || voting.status === VotingStatus.COMPLETED) {
        results = await this.getVotingResults(votingId);
      }

      // 返回脱敏后的投票者列表（如果不匿名）
      let voterList = [];
      if (!voting.rules.isAnonymous && voting.status === VotingStatus.COMPLETED) {
        voterList = await this.getVoterList(votingId);
      }

      return {
        success: true,
        data: {
          ...voting,
          userVote,
          results,
          voterList,
          canVote: await this.canUserVote(votingId, user),
          hasVoted: !!userVote
        }
      };

    } catch (error) {
      logger.error('获取投票详情失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取投票结果
   * @param {string} votingId - 投票ID
   * @returns {Promise<Object>} 投票结果
   */
  async getVotingResults(votingId) {
    try {
      const voting = await VotingItem.findById(votingId);
      if (!voting) {
        throw new Error('投票项目不存在');
      }

      // 等待统计更新完成
      await voting.updateStatistics();

      const votingRecords = await VotingRecord.find({
        votingId,
        status: 'valid'
      });

      // 计算详细结果
      const detailedResults = {
        totalVotes: votingRecords.length,
        validVotes: votingRecords.length,
        invalidVotes: 0,
        abstainVotes: 0,
        participationRate: voting.statistics.participationRate,
        options: voting.optionStats.map(stat => ({
          optionId: stat.optionId,
          optionContent: voting.options.find(opt => opt.id === stat.optionId)?.content,
          voteCount: stat.voteCount,
          percentage: stat.percentage
        })),
        winner: null,
        isTie: false,
        needsRunoff: false
      };

      // 确定获胜者
      if (detailedResults.options.length > 0) {
        const maxVotes = Math.max(...detailedResults.options.map(opt => opt.voteCount));
        const winners = detailedResults.options.filter(opt => opt.voteCount === maxVotes);

        detailedResults.winner = winners[0];
        detailedResults.isTie = winners.length > 1;
        detailedResults.needsRunoff = detailedResults.isTie && voting.votingType === VotingTypes.ELECTION;
      }

      return detailedResults;

    } catch (error) {
      logger.error('获取投票结果失败:', error);
      throw error;
    }
  }

  /**
   * 结束投票
   * @param {string} votingId - 投票ID
   * @param {Object} operator - 操作者信息
   * @returns {Promise<Object>} 操作结果
   */
  async endVoting(votingId, operator) {
    try {
      const voting = await VotingItem.findById(votingId);
      if (!voting) {
        throw new Error('投票项目不存在');
      }

      // 检查权限
      this.checkEndPermission(voting, operator);

      // 更新状态
      voting.status = VotingStatus.COMPLETED;
      await voting.save();

      // 更新最终统计
      await voting.updateStatistics();

      // 计算结果
      const results = await this.getVotingResults(votingId);

      // 保存结果
      voting.resultCalculation = {
        winnerOption: results.winner?.optionId,
        winningCondition: 'most_votes',
        marginOfVictory: this.calculateMarginOfVictory(results),
        isTie: results.isTie,
        needsRunoff: results.needsRunoff
      };
      await voting.save();

      // 发送结束通知
      await this.sendVotingEndNotification(voting, results);

      logger.info(`投票已结束: ${votingId}, 获胜选项: ${results.winner?.optionContent}`);

      return {
        success: true,
        message: '投票已成功结束',
        results
      };

    } catch (error) {
      logger.error('结束投票失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取投票统计报告
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Object>} 统计报告
   */
  async getVotingReport(filters = {}) {
    try {
      const {
        startDate,
        endDate,
        votingType,
        status
      } = filters;

      // 基础统计
      const basicStats = await VotingItem.getVotingStatistics(filters);

      // 详细统计
      const detailedStats = await this.generateDetailedStatistics(filters);

      return {
        success: true,
        period: {
          startDate,
          endDate
        },
        basicStatistics: basicStats,
        detailedStatistics: detailedStats
      };

    } catch (error) {
      logger.error('获取投票统计报告失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 验证投票数据
   * @param {Object} votingData - 投票数据
   */
  validateVotingData(votingData) {
    if (!votingData.title || votingData.title.trim().length === 0) {
      throw new Error('投票标题不能为空');
    }

    if (!votingData.description || votingData.description.trim().length === 0) {
      throw new Error('投票描述不能为空');
    }

    if (!votingData.options || votingData.options.length < 2) {
      throw new Error('投票选项至少需要2个');
    }

    if (!votingData.timeSettings.startTime) {
      throw new Error('必须设置开始时间');
    }

    const startTime = new Date(votingData.timeSettings.startTime);
    if (startTime <= new Date()) {
      throw new Error('开始时间必须是未来时间');
    }

    const duration = votingData.timeSettings.duration || 7;
    if (duration < this.defaultConfig.minVotingDuration || duration > this.defaultConfig.maxVotingDuration) {
      throw new Error(`投票时长必须在${this.defaultConfig.minVotingDuration}-${this.defaultConfig.maxVotingDuration}天之间`);
    }
  }

  /**
   * 检查创建权限
   * @param {Object} creator - 创建者信息
   * @param {Object} votingData - 投票数据
   */
  async checkCreatePermission(creator, votingData) {
    // 检查用户是否有创建投票的权限
    const allowedRoles = ['village_admin', 'department_head', 'village_party_secretary'];
    if (!allowedRoles.includes(creator.role)) {
      throw new Error('您没有创建投票的权限');
    }

    // 检查是否超过最大活跃投票数
    const activeCount = await VotingItem.countDocuments({
      status: VotingStatus.ACTIVE,
      'organizer.userId': creator.userId
    });

    if (activeCount >= this.defaultConfig.maxActiveVotings) {
      throw new Error('您发起的活跃投票数已达上限');
    }

    // 特殊类型投票的权限检查
    if (votingData.votingType === VotingTypes.ELECTION) {
      const adminRoles = ['village_party_secretary', 'village_admin'];
      if (!adminRoles.includes(creator.role)) {
        throw new Error('只有党支部书记或村长可以发起选举投票');
      }
    }

    if (votingData.votingType === VotingTypes.EMERGENCY) {
      const leadershipRoles = ['village_party_secretary', 'village_head'];
      if (!leadershipRoles.includes(creator.role)) {
        throw new Error('只有村主要领导可以发起紧急投票');
      }
    }
  }

  /**
   * 计算符合条件的投票者数量
   * @param {Object} permissions - 权限配置
   * @returns {Promise<number>} 投票者数量
   */
  async calculateEligibleVoters(permissions) {
    switch (permissions.type) {
    case VotingPermissions.ALL_VILLAGERS:
      return await User.countDocuments({
        role: 'villager',
        status: 'active'
      });

    case VotingPermissions.COMMITTEE_MEMBERS:
      return await User.countDocuments({
        role: { $in: ['village_admin', 'department_head', 'village_party_secretary'] },
        status: 'active'
      });

    case VotingPermissions.REGISTERED_VOTERS:
      return await User.countDocuments({
        role: 'villager',
        status: 'active',
        'profile.isRegisteredVoter': true
      });

    default:
      return this.defaultConfig.minParticipants;
    }
  }

  /**
   * 验证投票资格
   * @param {Object} voting - 投票项目
   * @param {Object} voter - 投票者信息
   */
  async validateVotingEligibility(voting, voter) {
    // 检查投票状态
    if (voting.status !== VotingStatus.ACTIVE) {
      throw new Error('投票未开始或已结束');
    }

    // 检查时间范围
    const now = new Date();
    if (now < voting.timeSettings.startTime) {
      throw new Error('投票尚未开始');
    }

    if (now > voting.timeSettings.endTime) {
      throw new Error('投票已结束');
    }

    // 检查投票权限
    const hasPermission = await this.checkVotingPermission(voting.permissions, voter);
    if (!hasPermission) {
      throw new Error('您没有参与此投票的权限');
    }

    // 检查实名制要求
    if (voting.rules.requireRealName && !voter.realName) {
      throw new Error('此投票需要实名认证');
    }
  }

  /**
   * 检查投票权限
   * @param {Object} permissions - 权限配置
   * @param {Object} voter - 投票者信息
   * @returns {Promise<boolean>} 是否有权限
   */
  async checkVotingPermission(permissions, voter) {
    switch (permissions.type) {
    case VotingPermissions.ALL_VILLAGERS:
      return voter.role === 'villager';

    case VotingPermissions.COMMITTEE_MEMBERS:
      return ['village_admin', 'department_head', 'village_party_secretary'].includes(voter.role);

    case VotingPermissions.REGISTERED_VOTERS:
      return voter.role === 'villager' && voter.profile?.isRegisteredVoter;

    default:
      return true;
    }
  }

  /**
   * 验证投票数据
   * @param {Object} voteData - 投票数据
   * @param {Object} voting - 投票项目
   */
  validateVoteData(voteData, voting) {
    if (!voteData.votes || voteData.votes.length === 0) {
      throw new Error('投票内容不能为空');
    }

    const selectedOptionIds = voteData.votes.map(vote => vote.optionId);
    const validOptionIds = voting.options.map(opt => opt.id);

    // 检查选项有效性
    for (const optionId of selectedOptionIds) {
      if (!validOptionIds.includes(optionId)) {
        throw new Error('包含无效的投票选项');
      }
    }

    // 检查多选限制
    if (voting.rules.maxVotesPerVoter && selectedOptionIds.length > voting.rules.maxVotesPerVoter) {
      throw new Error(`最多选择${voting.rules.maxVotesPerVoter}个选项`);
    }
  }

  /**
   * 取消之前的投票
   * @param {string} votingId - 投票ID
   * @param {string} userId - 用户ID
   */
  async cancelPreviousVote(votingId, userId) {
    await VotingRecord.updateMany(
      {
        votingId,
        'voter.userId': userId,
        status: 'valid'
      },
      {
        status: 'cancelled',
        notes: '用户修改投票'
      }
    );

    // 重新计算统计
    const voting = await VotingItem.findById(votingId);
    await voting.updateStatistics();
  }

  /**
   * 更新投票统计
   * @param {Object} voting - 投票项目
   * @param {Array} votes - 投票数据
   */
  async updateVotingStatistics(voting, votes) {
    for (const vote of votes) {
      const optionStat = voting.optionStats.find(stat => stat.optionId === vote.optionId);
      if (optionStat) {
        optionStat.voteCount += 1;
        optionStat.voters.push({
          userId: vote.voter?.userId,
          votedAt: new Date()
        });
      }
    }

    await voting.save();
  }

  /**
   * 发送投票通知
   * @param {Object} voting - 投票项目
   * @param {Object} voter - 投票者
   * @param {Object} record - 投票记录
   */
  async sendVoteNotification(voting, voter, record) {
    try {
      const notificationData = {
        type: 'vote_submitted',
        title: '投票提交成功',
        content: `您已成功参与投票：${voting.title}`,
        data: {
          votingId: voting._id,
          votingTitle: voting.title,
          voteTime: record.votedAt
        }
      };

      await notificationService.sendNotification(voter.userId, notificationData);

    } catch (error) {
      logger.error('发送投票通知失败:', error);
    }
  }

  /**
   * 发送投票结束通知
   * @param {Object} voting - 投票项目
   * @param {Object} results - 投票结果
   */
  async sendVotingEndNotification(voting, results) {
    try {
      // 获取所有参与者
      const participants = await VotingRecord.find({
        votingId: voting._id,
        status: 'valid'
      }).distinct('voter.userId');

      const notificationData = {
        type: 'voting_ended',
        title: '投票已结束',
        content: `投票《${voting.title}》已结束，获胜选项：${results.winner?.optionContent}`,
        data: {
          votingId: voting._id,
          votingTitle: voting.title,
          winner: results.winner?.optionContent,
          totalVotes: results.totalVotes
        }
      };

      await notificationService.sendNotification(participants, notificationData);

    } catch (error) {
      logger.error('发送投票结束通知失败:', error);
    }
  }

  /**
   * 检查是否可以查看投票
   * @param {Object} voting - 投票项目
   * @param {Object} user - 用户信息
   * @returns {boolean} 是否可以查看
   */
  canViewVoting(voting, user) {
    // 公开投票所有人都可以查看
    if (!voting.rules.isAnonymous) {
      return true;
    }

    // 匿名投票需要登录
    if (!user) {
      return false;
    }

    // 组织者和管理员可以查看
    if (voting.organizer.userId.toString() === user.userId ||
        ['village_admin', 'village_party_secretary'].includes(user.role)) {
      return true;
    }

    return true;
  }

  /**
   * 检查用户是否可以投票
   * @param {string} votingId - 投票ID
   * @param {Object} user - 用户信息
   * @returns {Promise<boolean>} 是否可以投票
   */
  async canUserVote(votingId, user) {
    if (!user) {
      return false;
    }

    const voting = await VotingItem.findById(votingId);
    if (!voting) {
      return false;
    }

    return await this.checkVotingPermission(voting.permissions, user);
  }

  /**
   * 获取投票者列表
   * @param {string} votingId - 投票ID
   * @returns {Promise<Array>} 投票者列表
   */
  async getVoterList(votingId) {
    const records = await VotingRecord.find({
      votingId,
      status: 'valid',
      'voter.isAnonymous': false
    })
      .select('voter.userName votedAt')
      .sort({ votedAt: 1 });

    return records.map(record => ({
      userName: record.voter.userName,
      votedAt: record.votedAt
    }));
  }

  /**
   * 计算获胜优势
   * @param {Object} results - 投票结果
   * @returns {number} 优势百分比
   */
  calculateMarginOfVictory(results) {
    if (!results.winner || results.totalVotes === 0) {
      return 0;
    }

    const runnerUpVotes = results.options
      .filter(opt => opt.optionId !== results.winner.optionId)
      .reduce((max, opt) => Math.max(max, opt.voteCount), 0);

    return ((results.winner.voteCount - runnerUpVotes) / results.totalVotes * 100).toFixed(2);
  }

  /**
   * 设置提醒任务
   * @param {Object} voting - 投票项目
   */
  scheduleReminders(voting) {
    const intervals = this.defaultConfig.reminderIntervals;
    const startTime = new Date(voting.timeSettings.startTime);

    intervals.forEach(hours => {
      const reminderTime = new Date(startTime.getTime() - hours * 60 * 60 * 1000);
      if (reminderTime > new Date()) {
        // 这里应该设置定时任务，简化实现
        setTimeout(() => {
          this.sendVotingReminder(voting);
        }, reminderTime - new Date());
      }
    });
  }

  /**
   * 发送投票提醒
   * @param {Object} voting - 投票项目
   */
  async sendVotingReminder(voting) {
    try {
      // 获取符合条件的用户
      const eligibleUsers = await this.getEligibleUsers(voting.permissions);

      const notificationData = {
        type: 'voting_reminder',
        title: '投票提醒',
        content: `投票《${voting.title}》即将开始，请及时参与`,
        data: {
          votingId: voting._id,
          votingTitle: voting.title,
          startTime: voting.timeSettings.startTime
        }
      };

      await notificationService.sendNotification(eligibleUsers, notificationData);

    } catch (error) {
      logger.error('发送投票提醒失败:', error);
    }
  }

  /**
   * 获取符合条件的用户
   * @param {Object} permissions - 权限配置
   * @returns {Promise<Array>} 用户ID列表
   */
  async getEligibleUsers(permissions) {
    const query = {
      status: 'active'
    };

    switch (permissions.type) {
    case VotingPermissions.ALL_VILLAGERS:
      query.role = 'villager';
      break;
    case VotingPermissions.COMMITTEE_MEMBERS:
      query.role = { $in: ['village_admin', 'department_head', 'village_party_secretary'] };
      break;
    case VotingPermissions.REGISTERED_VOTERS:
      query.role = 'villager';
      query['profile.isRegisteredVoter'] = true;
      break;
    default:
      query.role = 'villager';
    }

    const users = await User.find(query).select('_id');
    return users.map(user => user._id);
  }

  /**
   * 检查结束权限
   * @param {Object} voting - 投票项目
   * @param {Object} operator - 操作者信息
   */
  checkEndPermission(voting, operator) {
    // 组织者可以结束自己的投票
    if (voting.organizer.userId.toString() === operator.userId) {
      return;
    }

    // 村主要领导可以结束任何投票
    const leadershipRoles = ['village_party_secretary', 'village_admin'];
    if (leadershipRoles.includes(operator.role)) {
      return;
    }

    throw new Error('您没有结束此投票的权限');
  }

  /**
   * 生成详细统计
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Object>} 详细统计
   */
  async generateDetailedStatistics(filters = {}) {
    const matchStage = {};

    if (filters.startDate || filters.endDate) {
      matchStage.createdAt = {};
      if (filters.startDate) matchStage.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) matchStage.createdAt.$lte = new Date(filters.endDate);
    }

    const participationStats = await VotingItem.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          averageParticipation: { $avg: '$statistics.participationRate' },
          maxParticipation: { $max: '$statistics.participationRate' },
          minParticipation: { $min: '$statistics.participationRate' }
        }
      }
    ]);

    const votingTypeStats = await VotingItem.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$votingType',
          count: { $sum: 1 },
          averageVotes: { $avg: '$statistics.votedCount' }
        }
      }
    ]);

    return {
      participation: participationStats[0] || {
        averageParticipation: 0,
        maxParticipation: 0,
        minParticipation: 0
      },
      votingTypes: votingTypeStats,
      trend: await this.getVotingTrend(matchStage)
    };
  }

  /**
   * 获取投票趋势
   * @param {Object} matchStage - 匹配条件
   * @returns {Promise<Array>} 趋势数据
   */
  async getVotingTrend(matchStage) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyStats = await VotingItem.aggregate([
      {
        $match: {
          ...matchStage,
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return dailyStats;
  }
}

module.exports = new VotingService();