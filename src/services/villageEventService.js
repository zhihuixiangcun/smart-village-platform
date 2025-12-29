/**
 * 乡村活动管理服务
 * 处理活动组织、志愿者召集、活动签到等功能
 */

const { VillageEvent, EventType, EventStatus, RegistrationStatus, VolunteerRole } = require('../models/VillageEvent');
const { User } = require('../models/User');
const { Village } = require('../models/Village');
const webSocketService = require('./webSocketService');

// ==================== 活动组织 ====================

/**
 * 创建活动
 */
exports.createEvent = async (eventData, creatorId) => {
  const {
    villageId,
    title,
    description,
    eventType,
    scheduledStart,
    scheduledEnd,
    location,
    volunteerRecruitment,
    checkInConfig
  } = eventData;

  // 验证村庄
  const village = await Village.findById(villageId);
  if (!village) {
    throw new Error('村庄不存在');
  }

  // 获取创建者信息
  const creator = await User.findById(creatorId);
  if (!creator) {
    throw new Error('用户不存在');
  }

  const event = new VillageEvent({
    ...eventData,
    villageId,
    organizerId: creatorId,
    organizerName: creator.name,
    organizerPhone: creator.phone,
    organizerAvatar: creator.avatar,
    createdBy: creatorId,
    status: 'draft'
  });

  await event.save();

  return event.populate('organizerId');
};

/**
 * 发布活动
 */
exports.publishEvent = async (eventId) => {
  const event = await VillageEvent.findById(eventId);

  if (!event) {
    throw new Error('活动不存在');
  }

  await event.publish();

  // 发送通知
  await this._notifyEventPublished(event);

  return event.populate('organizerId');
};

/**
 * 开始招募
 */
exports.startRecruiting = async (eventId) => {
  const event = await VillageEvent.findById(eventId);

  if (!event) {
    throw new Error('活动不存在');
  }

  await event.startRecruiting();

  // 发送招募通知
  await this._notifyRecruitmentStarted(event);

  return event.populate('organizerId');
};

/**
 * 开始活动
 */
exports.startEvent = async (eventId) => {
  const event = await VillageEvent.findById(eventId);

  if (!event) {
    throw new Error('活动不存在');
  }

  await event.start();

  return event.populate('organizerId');
};

/**
 * 结束活动
 */
exports.completeEvent = async (eventId, summaryData) => {
  const event = await VillageEvent.findById(eventId);

  if (!event) {
    throw new Error('活动不存在');
  }

  await event.complete();

  // 添加总结
  if (summaryData) {
    await event.addSummary(summaryData);
  }

  return event.populate('organizerId');
};

/**
 * 更新活动
 */
exports.updateEvent = async (eventId, updates, userId) => {
  const event = await VillageEvent.findById(eventId);

  if (!event) {
    throw new Error('活动不存在');
  }

  // 只有组织者可以更新
  if (event.organizerId.toString() !== userId.toString()) {
    throw new Error('无权修改此活动');
  }

  // 进行中的活动不能修改关键信息
  if (event.status === 'ongoing') {
    const allowedFields = ['summary', 'images', 'videos', 'checkInStats'];
    const updateKeys = Object.keys(updates);
    const hasNotAllowed = updateKeys.some(key => !allowedFields.includes(key));
    if (hasNotAllowed) {
      throw new Error('进行中的活动只能修改部分信息');
    }
  }

  Object.keys(updates).forEach(key => {
    event[key] = updates[key];
  });

  event.updatedBy = userId;
  await event.save();

  return event.populate('organizerId');
};

/**
 * 取消活动
 */
exports.cancelEvent = async (eventId, reason, userId) => {
  const event = await VillageEvent.findById(eventId);

  if (!event) {
    throw new Error('活动不存在');
  }

  // 只有组织者可以取消
  if (event.organizerId.toString() !== userId.toString()) {
    throw new Error('无权取消此活动');
  }

  if (event.status === 'ongoing' || event.status === 'completed') {
    throw new Error('活动已进行或结束，无法取消');
  }

  event.status = 'cancelled';
  await event.save();

  // 通知所有参与者
  await this._notifyEventCancelled(event, reason);

  return event;
};

// ==================== 志愿者召集 ====================

/**
 * 志愿者报名
 */
exports.registerVolunteer = async (eventId, volunteerData) => {
  const event = await VillageEvent.findById(eventId);

  if (!event) {
    throw new Error('活动不存在');
  }

  if (!event.volunteerRecruitment || !event.volunteerRecruitment.enabled) {
    throw new Error('该活动不招募志愿者');
  }

  if (event.status !== 'recruiting' && event.status !== 'published') {
    throw new Error('活动不在招募状态');
  }

  // 检查报名截止时间
  if (event.volunteerRecruitment.deadline && new Date() > event.volunteerRecruitment.deadline) {
    throw new Error('志愿者报名已截止');
  }

  // 获取用户信息
  const user = await User.findById(volunteerData.userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  await event.registerVolunteer({
    ...volunteerData,
    userName: user.name,
    userPhone: user.phone,
    userAvatar: user.avatar
  });

  // 通知组织者
  await this._notifyVolunteerRegistered(event, user);

  return event;
};

/**
 * 审核志愿者
 */
exports.approveVolunteer = async (eventId, volunteerId, approved, approverId) => {
  const event = await VillageEvent.findById(eventId);

  if (!event) {
    throw new Error('活动不存在');
  }

  await event.approveVolunteer(volunteerId, approverId, approved);

  // 通知志愿者
  const volunteer = event.volunteers.id(volunteerId);
  if (volunteer && volunteer.userId) {
    await this._notifyVolunteerApproved(event, volunteer, approved);
  }

  return event;
};

/**
 * 获取志愿者列表
 */
exports.getVolunteers = async (eventId, options = {}) => {
  const { status, role } = options;

  const event = await VillageEvent.findById(eventId)
    .populate('volunteers.userId', 'name avatar phone')
    .lean();

  if (!event) {
    throw new Error('活动不存在');
  }

  let volunteers = event.volunteers;

  if (status) {
    volunteers = volunteers.filter(v => v.status === status);
  }

  if (role) {
    volunteers = volunteers.filter(v => v.role === role);
  }

  return volunteers;
};

/**
 * 获取用户的志愿活动
 */
exports.getUserVolunteerEvents = async (userId, options = {}) => {
  return await VillageEvent.getUserVolunteerEvents(userId, options);
};

// ==================== 活动报名 ====================

/**
 * 参与者报名
 */
exports.registerParticipant = async (eventId, participantData) => {
  const event = await VillageEvent.findById(eventId);

  if (!event) {
    throw new Error('活动不存在');
  }

  if (event.status !== 'recruiting' && event.status !== 'published') {
    throw new Error('活动不在报名状态');
  }

  // 获取用户信息
  const user = await User.findById(participantData.userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  await event.registerParticipant({
    ...participantData,
    userName: user.name,
    userPhone: user.phone,
    userAvatar: user.avatar
  });

  return event;
};

/**
 * 获取参与者列表
 */
exports.getParticipants = async (eventId, options = {}) => {
  const { status } = options;

  const event = await VillageEvent.findById(eventId)
    .populate('registrations.userId', 'name avatar phone')
    .lean();

  if (!event) {
    throw new Error('活动不存在');
  }

  let registrations = event.registrations;

  if (status) {
    registrations = registrations.filter(r => r.status === status);
  }

  return registrations;
};

// ==================== 活动签到 ====================

/**
 * 志愿者签到
 */
exports.checkInVolunteer = async (eventId, volunteerId, checkInData) => {
  const event = await VillageEvent.findById(eventId);

  if (!event) {
    throw new Error('活动不存在');
  }

  if (!event.checkInConfig || !event.checkInConfig.enabled) {
    throw new Error('该活动未开启签到功能');
  }

  await event.checkInVolunteer(volunteerId, checkInData);

  return event;
};

/**
 * 志愿者签退
 */
exports.checkOutVolunteer = async (eventId, volunteerId, checkOutData) => {
  const event = await VillageEvent.findById(eventId);

  if (!event) {
    throw new Error('活动不存在');
  }

  await event.checkOutVolunteer(volunteerId, checkOutData);

  return event;
};

/**
 * 参与者签到
 */
exports.checkInParticipant = async (eventId, userId, checkInData) => {
  const event = await VillageEvent.findById(eventId);

  if (!event) {
    throw new Error('活动不存在');
  }

  if (!event.checkInConfig || !event.checkInConfig.enabled) {
    throw new Error('该活动未开启签到功能');
  }

  await event.checkInParticipant(userId, checkInData);

  return event;
};

/**
 * 批量签到
 */
exports.batchCheckIn = async (eventId, checkInList, operatorId) => {
  const event = await VillageEvent.findById(eventId);

  if (!event) {
    throw new Error('活动不存在');
  }

  const results = await event.batchCheckIn(checkInList);

  return results;
};

/**
 * 获取签到统计
 */
exports.getCheckInStats = async (eventId) => {
  const event = await VillageEvent.findById(eventId).lean();

  if (!event) {
    throw new Error('活动不存在');
  }

  const volunteerStats = {
    total: event.volunteers.length,
    checkedIn: event.volunteers.filter(v => v.status === 'checked_in').length,
    pending: event.volunteers.filter(v => v.status === 'pending').length
  };

  const participantStats = {
    total: event.registrations.length,
    checkedIn: event.registrations.filter(r => r.checkInAt).length,
    pending: event.registrations.filter(r => !r.checkInAt).length
  };

  return {
    volunteers: volunteerStats,
    participants: participantStats,
    lastCheckInAt: event.checkInStats?.lastCheckInAt
  };
};

/**
 * 获取需要签到的活动
 */
exports.getCheckInRequiredEvents = async (options = {}) => {
  return await VillageEvent.getCheckInRequiredEvents(options);
};

// ==================== 活动查询 ====================

/**
 * 获取活动详情
 */
exports.getEventDetail = async (eventId, userId) => {
  const event = await VillageEvent.findById(eventId)
    .populate('organizerId', 'name avatar phone')
    .populate('volunteers.userId', 'name avatar')
    .populate('registrations.userId', 'name avatar')
    .populate('createdBy', 'name avatar')
    .lean();

  if (!event || event.deleted) {
    throw new Error('活动不存在');
  }

  // 添加用户互动状态
  if (userId) {
    const userIdStr = userId.toString();
    event.userInteractions = {
      isVolunteer: event.volunteers.some(v => v.userId?.toString() === userIdStr),
      isParticipant: event.registrations.some(r => r.userId?.toString() === userIdStr),
      liked: event.likes.some(l => l.userId?.toString() === userIdStr),
      bookmarked: event.bookmarks.some(b => b.userId?.toString() === userIdStr)
    };
  }

  return event;
};

/**
 * 获取村庄活动列表
 */
exports.getVillageEvents = async (villageId, options = {}) => {
  return await VillageEvent.getVillageEvents(villageId, options);
};

/**
 * 获取热门活动
 */
exports.getPopularEvents = async (villageId, limit = 10) => {
  return await VillageEvent.getPopularEvents(villageId, limit);
};

/**
 * 搜索活动
 */
exports.searchEvents = async (villageId, keyword, options = {}) => {
  const {
    limit = 20,
    skip = 0,
    eventType
  } = options;

  const query = {
    villageId,
    deleted: false,
    $text: { $search: keyword }
  };

  if (eventType) query.eventType = eventType;

  const events = await VillageEvent.find(query)
    .sort({ score: { $meta: 'textScore' }, scheduledStart: -1 })
    .skip(skip)
    .limit(limit)
    .populate('organizerId', 'name avatar')
    .lean();

  return events;
};

// ==================== 互动功能 ====================

/**
 * 点赞活动
 */
exports.toggleLike = async (eventId, userId) => {
  const event = await VillageEvent.findById(eventId);

  if (!event) {
    throw new Error('活动不存在');
  }

  await event.toggleLike(userId);

  const liked = event.likes.some(
    l => l.userId?.toString() === userId.toString()
  );

  return { liked, likeCount: event.likeCount };
};

/**
 * 收藏活动
 */
exports.toggleBookmark = async (eventId, userId) => {
  const event = await VillageEvent.findById(eventId);

  if (!event) {
    throw new Error('活动不存在');
  }

  await event.toggleBookmark(userId);

  const bookmarked = event.bookmarks.some(
    b => b.userId?.toString() === userId.toString()
  );

  return { bookmarked, bookmarkCount: event.bookmarkCount };
};

/**
 * 添加评论
 */
exports.addComment = async (eventId, commentData, userId) => {
  const event = await VillageEvent.findById(eventId);

  if (!event) {
    throw new Error('活动不存在');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  await event.addComment({
    ...commentData,
    userId,
    userName: user.name,
    userAvatar: user.avatar
  });

  return event.comments[event.comments.length - 1];
};

/**
 * 添加活动反馈
 */
exports.addFeedback = async (eventId, feedbackData, userId) => {
  const event = await VillageEvent.findById(eventId);

  if (!event) {
    throw new Error('活动不存在');
  }

  if (event.status !== 'completed') {
    throw new Error('只有已结束的活动才能添加反馈');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  await event.addFeedback({
    ...feedbackData,
    userId,
    userName: user.name
  });

  return event;
};

/**
 * 添加活动总结
 */
exports.addEventSummary = async (eventId, summaryData, userId) => {
  const event = await VillageEvent.findById(eventId);

  if (!event) {
    throw new Error('活动不存在');
  }

  if (event.status !== 'completed') {
    throw new Error('只有已结束的活动才能添加总结');
  }

  // 只有组织者可以添加总结
  if (event.organizerId.toString() !== userId.toString()) {
    throw new Error('只有组织者可以添加活动总结');
  }

  await event.addSummary({
    ...summaryData,
    submittedBy: userId
  });

  return event;
};

/**
 * 获取统计信息
 */
exports.getVillageStats = async (villageId) => {
  return await VillageEvent.getVillageStats(villageId);
};

// ==================== 通知功能 ====================

/**
 * 通知活动已发布
 */
exports._notifyEventPublished = async (event) => {
  if (!webSocketService) return;

  webSocketService.notifyVillage(event.villageId.toString(), {
    type: 'event_published',
    data: {
      eventId: event._id,
      title: event.title,
      eventType: event.eventType,
      scheduledStart: event.scheduledStart,
      location: event.location
    }
  });
};

/**
 * 通知招募开始
 */
exports._notifyRecruitmentStarted = async (event) => {
  if (!webSocketService) return;

  webSocketService.notifyVillage(event.villageId.toString(), {
    type: 'event_recruitment_started',
    data: {
      eventId: event._id,
      title: event.title,
      eventType: event.eventType,
      volunteerRecruitment: event.volunteerRecruitment,
      scheduledStart: event.scheduledStart
    }
  });
};

/**
 * 通知志愿者已报名
 */
exports._notifyVolunteerRegistered = async (event, user) => {
  if (!webSocketService) return;

  webSocketService.broadcastToUser(event.organizerId.toString(), {
    type: 'volunteer_registered',
    data: {
      eventId: event._id,
      title: event.title,
      volunteerName: user.name,
      volunteerPhone: user.phone
    }
  });
};

/**
 * 通知志愿者审核结果
 */
exports._notifyVolunteerApproved = async (event, volunteer, approved) => {
  if (!webSocketService || !volunteer.userId) return;

  webSocketService.broadcastToUser(volunteer.userId.toString(), {
    type: 'volunteer_application_' + (approved ? 'approved' : 'rejected'),
    data: {
      eventId: event._id,
      title: event.title,
      scheduledStart: event.scheduledStart
    }
  });
};

/**
 * 通知活动取消
 */
exports._notifyEventCancelled = async (event, reason) => {
  if (!webSocketService) return;

  // 通知志愿者
  for (const volunteer of event.volunteers) {
    if (volunteer.userId) {
      webSocketService.broadcastToUser(volunteer.userId.toString(), {
        type: 'event_cancelled',
        data: {
          eventId: event._id,
          title: event.title,
          reason
        }
      });
    }
  }

  // 通知参与者
  for (const registration of event.registrations) {
    if (registration.userId) {
      webSocketService.broadcastToUser(registration.userId.toString(), {
        type: 'event_cancelled',
        data: {
          eventId: event._id,
          title: event.title,
          reason
        }
      });
    }
  }
};

// ==================== 定时任务 ====================

/**
 * 检查并更新活动状态（定时任务）
 */
exports.checkEventStatus = async () => {
  const now = new Date();

  // 检查应该开始的活动
  const startingEvents = await VillageEvent.find({
    status: 'recruiting',
    scheduledStart: { $lte: now },
    deleted: false
  });

  const results = [];

  for (const event of startingEvents) {
    await event.start();
    results.push({
      eventId: event._id,
      title: event.title,
      action: 'started'
    });
  }

  // 检查应该结束的活动
  const endingEvents = await VillageEvent.find({
    status: 'ongoing',
    scheduledEnd: { $lte: now },
    deleted: false
  });

  for (const event of endingEvents) {
    await event.complete();
    results.push({
      eventId: event._id,
      title: event.title,
      action: 'completed'
    });
  }

  return {
    checked: startingEvents.length + endingEvents.length,
    updated: results.length,
    results
  };
};

/**
 * 发送活动提醒（定时任务）
 */
exports.sendEventReminders = async () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 查找24小时内开始的活动
  const upcomingEvents = await VillageEvent.find({
    status: { $in: ['recruiting', 'full'] },
    scheduledStart: { $gte: now, $lte: tomorrow },
    deleted: false
  })
    .populate('organizerId', 'name')
    .populate('volunteers.userId', 'name')
    .populate('registrations.userId', 'name');

  const results = [];

  for (const event of upcomingEvents) {
    // 发送提醒给志愿者
    for (const volunteer of event.volunteers) {
      if (volunteer.status === 'approved' && volunteer.userId) {
        if (webSocketService) {
          webSocketService.broadcastToUser(volunteer.userId.toString(), {
            type: 'event_reminder',
            data: {
              eventId: event._id,
              title: event.title,
              scheduledStart: event.scheduledStart,
              location: event.location,
              role: volunteer.role
            }
          });
        }
      }
    }

    // 发送提醒给参与者
    for (const registration of event.registrations) {
      if (registration.userId && webSocketService) {
        webSocketService.broadcastToUser(registration.userId.toString(), {
          type: 'event_reminder',
          data: {
            eventId: event._id,
            title: event.title,
            scheduledStart: event.scheduledStart,
            location: event.location
          }
        });
      }
    }

    results.push({
      eventId: event._id,
      title: event.title,
      volunteerCount: event.volunteers.length,
      participantCount: event.registrations.length
    });
  }

  return {
    checked: upcomingEvents.length,
    notified: results.length,
    results
  };
};
