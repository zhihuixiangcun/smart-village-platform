/**
 * 会议服务
 * 提供会议管理、安排、签到、记录等功能
 */

const Meeting = require('../models/Meeting');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const MessageQueueManager = require('../../../src/messaging/MessageQueueManager');
const cron = require('node-cron');

class MeetingService {
  constructor() {
    this.messageQueue = null;
    this.initMessageQueue();
    this.initReminderScheduler();
  }

  async initMessageQueue() {
    try {
      this.messageQueue = new MessageQueueManager();
      await this.messageQueue.initialize();
    } catch (error) {
      logger.error('初始化消息队列失败:', error);
    }
  }

  /**
   * 初始化提醒调度器
   */
  initReminderScheduler() {
    // 每分钟检查一次会议提醒
    cron.schedule('* * * * *', async () => {
      await this.checkMeetingReminders();
    });
  }

  /**
   * 创建会议
   */
  async createMeeting(meetingData, organizerId) {
    try {
      // 验证输入数据
      const errors = validationResult(meetingData);
      if (!errors.isEmpty()) {
        throw new Error('数据验证失败: ' + errors.array().map(err => err.msg).join(', '));
      }

      // 设置组织者信息
      meetingData.organizer = {
        userId: organizerId,
        ...meetingData.organizer
      };

      const meeting = new Meeting(meetingData);
      await meeting.save();

      // 发送创建事件
      await this.sendEvent('meeting.created', {
        meetingId: meeting._id,
        title: meeting.title,
        type: meeting.type,
        scheduledTime: meeting.scheduledTime,
        organizer: organizerId
      });

      // 发送邀请通知
      await this.sendMeetingInvitations(meeting);

      logger.info('会议创建成功:', meeting._id);
      return meeting;
    } catch (error) {
      logger.error('创建会议失败:', error);
      throw error;
    }
  }

  /**
   * 更新会议信息
   */
  async updateMeeting(meetingId, updateData, operatorId) {
    try {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        throw new Error('会议不存在');
      }

      // 检查权限
      if (meeting.organizer.userId.toString() !== operatorId.toString()) {
        throw new Error('无权限修改此会议');
      }

      // 检查会议状态
      if (['进行中', '已结束'].includes(meeting.status)) {
        throw new Error('会议状态不允许修改');
      }

      Object.assign(meeting, updateData);
      await meeting.save();

      // 发送更新通知
      if (updateData.scheduledTime || updateData.location) {
        await this.sendMeetingUpdateNotification(meeting);
      }

      logger.info('会议更新成功:', meetingId);
      return meeting;
    } catch (error) {
      logger.error('更新会议失败:', error);
      throw error;
    }
  }

  /**
   * 取消会议
   */
  async cancelMeeting(meetingId, operatorId, reason = '') {
    try {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        throw new Error('会议不存在');
      }

      // 检查权限
      if (meeting.organizer.userId.toString() !== operatorId.toString()) {
        throw new Error('无权限取消此会议');
      }

      meeting.status = '已取消';

      // 发送取消通知
      await this.sendMeetingCancellationNotification(meeting, reason);

      await meeting.save();

      logger.info('会议取消成功:', meetingId);
      return meeting;
    } catch (error) {
      logger.error('取消会议失败:', error);
      throw error;
    }
  }

  /**
   * 获取会议列表
   */
  async getMeetings(queryOptions = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        status,
        startDate,
        endDate,
        organizerId,
        userId
      } = queryOptions;

      const filter = {};

      if (type) filter.type = type;
      if (status) filter.status = status;
      if (organizerId) filter['organizer.userId'] = organizerId;

      // 日期范围过滤
      if (startDate || endDate) {
        filter.scheduledTime = {};
        if (startDate) filter.scheduledTime.$gte = new Date(startDate);
        if (endDate) filter.scheduledTime.$lte = new Date(endDate);
      }

      // 如果指定用户，只查找用户参与的会议
      if (userId) {
        filter.$or = [
          { 'organizer.userId': userId },
          { 'participants.required.userId': userId },
          { 'participants.optional.userId': userId }
        ];
      }

      const meetings = await Meeting.find(filter)
        .sort({ scheduledTime: 1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('organizer.userId', 'name avatar')
        .populate('participants.required.userId', 'name avatar')
        .lean();

      const total = await Meeting.countDocuments(filter);

      return {
        meetings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('获取会议列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取会议详情
   */
  async getMeetingById(meetingId) {
    try {
      const meeting = await Meeting.findById(meetingId)
        .populate('organizer.userId', 'name avatar position contact')
        .populate('participants.required.userId', 'name avatar position contact')
        .populate('participants.optional.userId', 'name avatar position')
        .populate('agenda.presenter.userId', 'name avatar')
        .populate('attendance.userId', 'name avatar')
        .populate('minutes.recorder.userId', 'name avatar')
        .populate('voting.voters.userId', 'name avatar');

      if (!meeting) {
        throw new Error('会议不存在');
      }

      return meeting;
    } catch (error) {
      logger.error('获取会议详情失败:', error);
      throw error;
    }
  }

  /**
   * 会议签到
   */
  async checkIn(meetingId, userId, userName, method = '手动签到') {
    try {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        throw new Error('会议不存在');
      }

      // 检查会议状态
      if (meeting.status !== '进行中') {
        throw new Error('会议未开始，无法签到');
      }

      // 检查用户是否在参会人员列表中
      const isParticipant = meeting.participants.required.some(p =>
        p.userId.toString() === userId.toString()
      ) || meeting.participants.optional.some(p =>
        p.userId.toString() === userId.toString()
      );

      if (!isParticipant && !meeting.participants.public) {
        throw new Error('您不在参会人员列表中');
      }

      await meeting.checkIn(userId, userName, method);

      // 发送签到通知给组织者
      await this.sendCheckInNotification(meeting, userId, userName);

      logger.info('会议签到成功:', meetingId, userId);
      return meeting;
    } catch (error) {
      logger.error('会议签到失败:', error);
      throw error;
    }
  }

  /**
   * 开始会议
   */
  async startMeeting(meetingId, operatorId) {
    try {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        throw new Error('会议不存在');
      }

      // 检查权限
      if (meeting.organizer.userId.toString() !== operatorId.toString()) {
        throw new Error('只有组织者可以开始会议');
      }

      meeting.status = '进行中';
      meeting.actualStartTime = new Date();

      await meeting.save();

      // 发送会议开始通知
      await this.sendMeetingStartNotification(meeting);

      logger.info('会议开始成功:', meetingId);
      return meeting;
    } catch (error) {
      logger.error('开始会议失败:', error);
      throw error;
    }
  }

  /**
   * 结束会议
   */
  async endMeeting(meetingId, operatorId, minutesData = {}) {
    try {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        throw new Error('会议不存在');
      }

      // 检查权限
      if (meeting.organizer.userId.toString() !== operatorId.toString()) {
        throw new Error('只有组织者可以结束会议');
      }

      meeting.status = '已结束';
      meeting.actualEndTime = new Date();

      // 保存会议纪要
      if (minutesData.content) {
        meeting.minutes = {
          ...minutesData,
          recorder: {
            userId: operatorId,
            ...minutesData.recorder
          },
          completedAt: new Date()
        };
      }

      await meeting.save();

      // 发送会议结束通知
      await this.sendMeetingEndNotification(meeting);

      // 创建会议纪要任务
      if (!meeting.minutes || !meeting.minutes.content) {
        await this.createMinutesTask(meeting);
      }

      logger.info('会议结束成功:', meetingId);
      return meeting;
    } catch (error) {
      logger.error('结束会议失败:', error);
      throw error;
    }
  }

  /**
   * 进行表决
   */
  async vote(meetingId, userId, agendaItem, voteOption) {
    try {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        throw new Error('会议不存在');
      }

      // 检查会议状态
      if (meeting.status !== '进行中') {
        throw new Error('会议未在进行中，无法表决');
      }

      // 检查用户权限
      const hasVotingRights = meeting.participants.required.some(p =>
        p.userId.toString() === userId.toString()
      );

      if (!hasVotingRights) {
        throw new Error('您没有表决权');
      }

      await meeting.vote(userId, agendaItem, voteOption);

      logger.info('表决成功:', meetingId, userId, agendaItem, voteOption);
      return meeting;
    } catch (error) {
      logger.error('表决失败:', error);
      throw error;
    }
  }

  /**
   * 获取今日会议
   */
  async getTodayMeetings(userId) {
    try {
      return await Meeting.findTodayMeetings(userId);
    } catch (error) {
      logger.error('获取今日会议失败:', error);
      throw error;
    }
  }

  /**
   * 获取即将到来的会议
   */
  async getUpcomingMeetings(userId, days = 7) {
    try {
      return await Meeting.findUpcomingMeetings(userId, { limit: 50 });
    } catch (error) {
      logger.error('获取即将到来的会议失败:', error);
      throw error;
    }
  }

  /**
   * 发送会议邀请
   */
  async sendMeetingInvitations(meeting) {
    try {
      const participants = [
        ...meeting.participants.required,
        ...meeting.participants.optional
      ];

      for (const participant of participants) {
        await this.sendNotification('meeting_invitation', {
          meetingId: meeting._id,
          title: meeting.title,
          type: meeting.type,
          scheduledTime: meeting.scheduledTime,
          location: meeting.location,
          recipient: participant.userId,
          organizer: meeting.organizer
        });
      }
    } catch (error) {
      logger.error('发送会议邀请失败:', error);
    }
  }

  /**
   * 发送会议更新通知
   */
  async sendMeetingUpdateNotification(meeting) {
    try {
      const participants = [
        ...meeting.participants.required,
        ...meeting.participants.optional
      ];

      for (const participant of participants) {
        await this.sendNotification('meeting_updated', {
          meetingId: meeting._id,
          title: meeting.title,
          updates: ['时间或地点已变更'],
          recipient: participant.userId
        });
      }
    } catch (error) {
      logger.error('发送会议更新通知失败:', error);
    }
  }

  /**
   * 发送会议取消通知
   */
  async sendMeetingCancellationNotification(meeting, reason) {
    try {
      const participants = [
        ...meeting.participants.required,
        ...meeting.participants.optional
      ];

      for (const participant of participants) {
        await this.sendNotification('meeting_cancelled', {
          meetingId: meeting._id,
          title: meeting.title,
          reason: reason,
          recipient: participant.userId
        });
      }
    } catch (error) {
      logger.error('发送会议取消通知失败:', error);
    }
  }

  /**
   * 检查会议提醒
   */
  async checkMeetingReminders() {
    try {
      const now = new Date();
      const upcomingTime = new Date(now.getTime() + 30 * 60 * 1000); // 30分钟后

      const meetings = await Meeting.find({
        scheduledTime: { $lte: upcomingTime, $gt: now },
        status: '待召开',
        'notifications.firstReminder.enabled': true,
        'notifications.firstReminder.sent': false
      }).populate('participants.required.userId');

      for (const meeting of meetings) {
        await this.sendMeetingReminders(meeting);
      }
    } catch (error) {
      logger.error('检查会议提醒失败:', error);
    }
  }

  /**
   * 发送会议提醒
   */
  async sendMeetingReminders(meeting) {
    try {
      const participants = meeting.participants.required;

      for (const participant of participants) {
        await this.sendNotification('meeting_reminder', {
          meetingId: meeting._id,
          title: meeting.title,
          scheduledTime: meeting.scheduledTime,
          location: meeting.location,
          recipient: participant.userId,
          type: 'first_reminder'
        });
      }

      // 更新提醒状态
      meeting.notifications.firstReminder.sent = true;
      await meeting.save();
    } catch (error) {
      logger.error('发送会议提醒失败:', error);
    }
  }

  /**
   * 发送签到通知
   */
  async sendCheckInNotification(meeting, userId, userName) {
    try {
      await this.sendNotification('meeting_checkin', {
        meetingId: meeting._id,
        title: meeting.title,
        attendeeName: userName,
        checkInTime: new Date(),
        recipient: meeting.organizer.userId
      });
    } catch (error) {
      logger.error('发送签到通知失败:', error);
    }
  }

  /**
   * 发送会议开始通知
   */
  async sendMeetingStartNotification(meeting) {
    try {
      const participants = meeting.participants.required;

      for (const participant of participants) {
        await this.sendNotification('meeting_started', {
          meetingId: meeting._id,
          title: meeting.title,
          recipient: participant.userId
        });
      }
    } catch (error) {
      logger.error('发送会议开始通知失败:', error);
    }
  }

  /**
   * 发送会议结束通知
   */
  async sendMeetingEndNotification(meeting) {
    try {
      const participants = [
        ...meeting.participants.required,
        ...meeting.participants.optional
      ];

      for (const participant of participants) {
        await this.sendNotification('meeting_ended', {
          meetingId: meeting._id,
          title: meeting.title,
          hasMinutes: !!meeting.minutes,
          recipient: participant.userId
        });
      }
    } catch (error) {
      logger.error('发送会议结束通知失败:', error);
    }
  }

  /**
   * 创建会议纪要任务
   */
  async createMinutesTask(meeting) {
    try {
      await this.sendTask('create_meeting_minutes', {
        meetingId: meeting._id,
        title: meeting.title,
        scheduledTime: meeting.scheduledTime,
        organizer: meeting.organizer,
        deadline: new Date(meeting.actualEndTime.getTime() + 24 * 60 * 60 * 1000) // 24小时后
      });
    } catch (error) {
      logger.error('创建会议纪要任务失败:', error);
    }
  }

  /**
   * 发送事件消息
   */
  async sendEvent(eventType, eventData) {
    try {
      if (this.messageQueue) {
        await this.messageQueue.sendMessage('village_events', {
          event_type: eventType,
          data: eventData,
          timestamp: new Date(),
          source: 'governance-service'
        });
      }
    } catch (error) {
      logger.error('发送事件消息失败:', error);
    }
  }

  /**
   * 发送通知
   */
  async sendNotification(type, data) {
    try {
      if (this.messageQueue) {
        await this.messageQueue.sendMessage('notifications', {
          type,
          data,
          timestamp: new Date(),
          source: 'governance-service'
        });
      }
    } catch (error) {
      logger.error('发送通知失败:', error);
    }
  }

  /**
   * 发送任务
   */
  async sendTask(taskType, data) {
    try {
      if (this.messageQueue) {
        await this.messageQueue.sendMessage('tasks', {
          taskType,
          data,
          timestamp: new Date(),
          source: 'governance-service'
        });
      }
    } catch (error) {
      logger.error('发送任务失败:', error);
    }
  }
}

module.exports = MeetingService;