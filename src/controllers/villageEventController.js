/**
 * 乡村活动管理控制器
 * 处理活动组织、志愿者召集、活动签到等功能的HTTP请求
 */

const villageEventService = require('../services/villageEventService');
const { successResponse, errorResponse } = require('../utils/response');

// ==================== 活动组织 ====================

/**
 * 创建活动
 */
exports.createEvent = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const event = await villageEventService.createEvent(req.body, creatorId);

    return successResponse(res, event, '活动创建成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 发布活动
 */
exports.publishEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await villageEventService.publishEvent(eventId);

    return successResponse(res, event, '活动发布成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 开始招募
 */
exports.startRecruiting = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await villageEventService.startRecruiting(eventId);

    return successResponse(res, event, '开始招募志愿者');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 开始活动
 */
exports.startEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await villageEventService.startEvent(eventId);

    return successResponse(res, event, '活动已开始');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 结束活动
 */
exports.completeEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { summary } = req.body;
    const event = await villageEventService.completeEvent(eventId, summary);

    return successResponse(res, event, '活动已结束');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 更新活动
 */
exports.updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const event = await villageEventService.updateEvent(eventId, updates, userId);

    return successResponse(res, event, '活动更新成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 取消活动
 */
exports.cancelEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const event = await villageEventService.cancelEvent(eventId, reason, userId);

    return successResponse(res, event, '活动已取消');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取活动详情
 */
exports.getEventDetail = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;

    const event = await villageEventService.getEventDetail(eventId, userId);

    return successResponse(res, event);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取村庄活动列表
 */
exports.getVillageEvents = async (req, res) => {
  try {
    const { villageId } = req.params;
    const options = {
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0,
      status: req.query.status,
      eventType: req.query.eventType,
      upcoming: req.query.upcoming === 'true',
      past: req.query.past === 'true'
    };

    const events = await villageEventService.getVillageEvents(villageId, options);

    return successResponse(res, events);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取热门活动
 */
exports.getPopularEvents = async (req, res) => {
  try {
    const { villageId } = req.params;
    const { limit = 10 } = req.query;

    const events = await villageEventService.getPopularEvents(villageId, parseInt(limit));

    return successResponse(res, events);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 搜索活动
 */
exports.searchEvents = async (req, res) => {
  try {
    const { villageId } = req.params;
    const { keyword } = req.query;
    const options = {
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0,
      eventType: req.query.eventType
    };

    const events = await villageEventService.searchEvents(villageId, keyword, options);

    return successResponse(res, events);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 志愿者召集 ====================

/**
 * 志愿者报名
 */
exports.registerVolunteer = async (req, res) => {
  try {
    const { eventId } = req.params;
    const volunteerData = {
      ...req.body,
      userId: req.user.id
    };

    const event = await villageEventService.registerVolunteer(eventId, volunteerData);

    return successResponse(res, event, '志愿者报名成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 审核志愿者
 */
exports.approveVolunteer = async (req, res) => {
  try {
    const { eventId, volunteerId } = req.params;
    const { approved } = req.body;
    const approverId = req.user.id;

    const event = await villageEventService.approveVolunteer(eventId, volunteerId, approved, approverId);

    return successResponse(res, event, approved ? '志愿者已通过' : '志愿者已拒绝');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取志愿者列表
 */
exports.getVolunteers = async (req, res) => {
  try {
    const { eventId } = req.params;
    const options = {
      status: req.query.status,
      role: req.query.role
    };

    const volunteers = await villageEventService.getVolunteers(eventId, options);

    return successResponse(res, volunteers);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取我的志愿活动
 */
exports.getMyVolunteerEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    const options = {
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0,
      status: req.query.status
    };

    const events = await villageEventService.getUserVolunteerEvents(userId, options);

    return successResponse(res, events);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 活动报名 ====================

/**
 * 参与者报名
 */
exports.registerParticipant = async (req, res) => {
  try {
    const { eventId } = req.params;
    const participantData = {
      ...req.body,
      userId: req.user.id
    };

    const event = await villageEventService.registerParticipant(eventId, participantData);

    return successResponse(res, event, '报名成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取参与者列表
 */
exports.getParticipants = async (req, res) => {
  try {
    const { eventId } = req.params;
    const options = {
      status: req.query.status
    };

    const participants = await villageEventService.getParticipants(eventId, options);

    return successResponse(res, participants);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 活动签到 ====================

/**
 * 志愿者签到
 */
exports.checkInVolunteer = async (req, res) => {
  try {
    const { eventId, volunteerId } = req.params;
    const checkInData = {
      ...req.body,
      checkedBy: req.user.id
    };

    const event = await villageEventService.checkInVolunteer(eventId, volunteerId, checkInData);

    return successResponse(res, event, '签到成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 志愿者签退
 */
exports.checkOutVolunteer = async (req, res) => {
  try {
    const { eventId, volunteerId } = req.params;
    const checkOutData = {
      ...req.body,
      checkedBy: req.user.id
    };

    const event = await villageEventService.checkOutVolunteer(eventId, volunteerId, checkOutData);

    return successResponse(res, event, '签退成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 参与者签到
 */
exports.checkInParticipant = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const checkInData = {
      method: req.body.method || 'manual',
      location: req.body.location
    };

    const event = await villageEventService.checkInParticipant(eventId, userId, checkInData);

    return successResponse(res, event, '签到成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 批量签到
 */
exports.batchCheckIn = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { checkInList } = req.body;
    const operatorId = req.user.id;

    // 添加操作者ID
    const processedList = checkInList.map(item => ({
      ...item,
      data: {
        ...item.data,
        checkedBy: operatorId
      }
    }));

    const results = await villageEventService.batchCheckIn(eventId, processedList, operatorId);

    return successResponse(res, results, '批量签到完成');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取签到统计
 */
exports.getCheckInStats = async (req, res) => {
  try {
    const { eventId } = req.params;

    const stats = await villageEventService.getCheckInStats(eventId);

    return successResponse(res, stats);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取需要签到的活动
 */
exports.getCheckInRequiredEvents = async (req, res) => {
  try {
    const { date } = req.query;
    const options = { date };

    const events = await villageEventService.getCheckInRequiredEvents(options);

    return successResponse(res, events);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 互动功能 ====================

/**
 * 点赞活动
 */
exports.toggleLike = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const result = await villageEventService.toggleLike(eventId, userId);

    return successResponse(res, result, '操作成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 收藏活动
 */
exports.toggleBookmark = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const result = await villageEventService.toggleBookmark(eventId, userId);

    return successResponse(res, result, '操作成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 添加评论
 */
exports.addComment = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const { content } = req.body;

    const comment = await villageEventService.addComment(eventId, { content }, userId);

    return successResponse(res, comment, '评论添加成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 添加活动反馈
 */
exports.addFeedback = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const feedbackData = req.body;

    const event = await villageEventService.addFeedback(eventId, feedbackData, userId);

    return successResponse(res, event, '反馈已提交');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 添加活动总结
 */
exports.addEventSummary = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const summaryData = req.body;

    const event = await villageEventService.addEventSummary(eventId, summaryData, userId);

    return successResponse(res, event, '活动总结已添加');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 统计信息 ====================

/**
 * 获取村庄活动统计
 */
exports.getVillageStats = async (req, res) => {
  try {
    const { villageId } = req.params;

    const stats = await villageEventService.getVillageStats(villageId);

    return successResponse(res, stats);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 定时任务（仅管理员） ====================

/**
 * 检查并更新活动状态
 */
exports.checkEventStatus = async (req, res) => {
  try {
    // 验证管理员权限
    if (req.user?.role !== 'admin') {
      return errorResponse(res, '需要管理员权限', 403);
    }

    const result = await villageEventService.checkEventStatus();

    return successResponse(res, result, '活动状态检查完成');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 发送活动提醒
 */
exports.sendEventReminders = async (req, res) => {
  try {
    // 验证管理员权限
    if (req.user?.role !== 'admin') {
      return errorResponse(res, '需要管理员权限', 403);
    }

    const result = await villageEventService.sendEventReminders();

    return successResponse(res, result, '活动提醒发送完成');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};
