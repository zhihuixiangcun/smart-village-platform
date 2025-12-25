/**
 * 智能值班表控制器
 *
 * 功能：
 * - 值班表创建与管理
 * - 一键呼叫值班人员
 * - 值班排班与替班
 * - 呼叫记录与统计
 *
 * @author Smart Village Platform
 * @version 1.0.0
 */

const { DutySchedule, CommitteeMember, CommitteeAuditLog } = require('../models');
const { sendNotification } = require('../services/notificationService');
const socketService = require('../services/socketService');

/**
 * @class DutyScheduleController
 */
class DutyScheduleController {
  /**
   * 创建值班表
   * @route POST /api/v1/duty-schedule
   */
  static async createSchedule(req, res) {
    try {
      const {
        villageId,
        season,
        year,
        rules,
        schedules = []
      } = req.body;

      // 权限验证
      if (!req.user.permissions?.includes('duty:create')) {
        return res.status(403).json({
          success: false,
          message: '无权限创建值班表'
        });
      }

      // 检查是否已存在
      const existing = await DutySchedule.findOne({ villageId, season, year });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: '该季度值班表已存在'
        });
      }

      const schedule = await DutySchedule.create({
        villageId,
        season,
        year,
        rules,
        schedules,
        metadata: {
          createdBy: req.user.id,
          published: false
        }
      });

      // 记录审计日志
      await CommitteeAuditLog.logAction({
        operatorId: req.user.id,
        operatorName: req.user.username,
        villageId,
        action: 'create',
        resourceType: 'schedule',
        resourceId: schedule._id,
        details: {
          changes: { after: { season, year, scheduleCount: schedules.length } },
          result: 'success'
        },
        requestContext: {
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      res.status(201).json({
        success: true,
        data: schedule,
        message: '值班表创建成功'
      });

    } catch (error) {
      console.error('Create duty schedule error:', error);
      res.status(500).json({
        success: false,
        message: '创建值班表失败'
      });
    }
  }

  /**
   * 获取值班表列表
   * @route GET /api/v1/duty-schedule
   */
  static async getSchedules(req, res) {
    try {
      const { villageId, year, season, published } = req.query;

      const query = {};
      if (villageId) query.villageId = villageId;
      if (year) query.year = parseInt(year);
      if (season) query.season = season;
      if (published !== undefined) query['metadata.published'] = published === 'true';

      const schedules = await DutySchedule.find(query)
        .sort({ year: -1, season: -1 })
        .populate('villageId', 'name code')
        .lean();

      res.json({
        success: true,
        data: schedules
      });

    } catch (error) {
      console.error('Get duty schedules error:', error);
      res.status(500).json({
        success: false,
        message: '获取值班表失败'
      });
    }
  }

  /**
   * 获取当前值班人员
   * @route GET /api/v1/duty-schedule/current-duty
   */
  static async getCurrentDuty(req, res) {
    try {
      const { villageId } = req.query;

      if (!villageId) {
        return res.status(400).json({
          success: false,
          message: '缺少村庄ID'
        });
      }

      const personnel = await DutySchedule.getCurrentDutyPersonnel(villageId);

      if (!personnel || personnel.length === 0) {
        return res.json({
          success: true,
          data: [],
          message: '当前无值班人员'
        });
      }

      res.json({
        success: true,
        data: personnel,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Get current duty error:', error);
      res.status(500).json({
        success: false,
        message: '获取当前值班人员失败'
      });
    }
  }

  /**
   * 一键呼叫值班人员
   * @route POST /api/v1/duty-schedule/call
   */
  static async callDutyPersonnel(req, res) {
    try {
      const {
        villageId,
        date,
        reason,
        urgency = 'medium',
        location
      } = req.body;

      // 权限验证
      if (!req.user.permissions?.includes('duty:call')) {
        return res.status(403).json({
          success: false,
          message: '无权限呼叫值班人员'
        });
      }

      // 获取值班表
      const schedule = await DutySchedule.findOne({
        villageId,
        'metadata.published': true,
        'schedules.date': {
          $gte: new Date(date).setHours(0, 0, 0, 0),
          $lt: new Date(date).setHours(23, 59, 59, 999)
        }
      });

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: '未找到当日值班安排'
        });
      }

      // 获取当日班次
      const todaySchedule = schedule.schedules.find(s => {
        const scheduleDate = new Date(s.date);
        const targetDate = new Date(date);
        return scheduleDate.toDateString() === targetDate.toDateString();
      });

      if (!todaySchedule || todaySchedule.shifts.length === 0) {
        return res.status(404).json({
          success: false,
          message: '当日无值班安排'
        });
      }

      // 根据当前时间确定班次
      const now = new Date();
      const currentHour = now.getHours();
      let currentShift = null;

      if (currentHour >= 6 && currentHour < 12) {
        currentShift = todaySchedule.shifts.find(s => s.name === 'morning');
      } else if (currentHour >= 12 && currentHour < 18) {
        currentShift = todaySchedule.shifts.find(s => s.name === 'afternoon');
      } else {
        currentShift = todaySchedule.shifts.find(s => s.name === 'night');
      }

      if (!currentShift || currentShift.personnel.length === 0) {
        return res.status(404).json({
          success: false,
          message: '当前时段无值班人员'
        });
      }

      // 生成呼叫ID
      const callId = `CALL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 记录呼叫
      const callData = {
        callId,
        date: new Date(date),
        shift: currentShift.name,
        caller: {
          userId: req.user.id,
          name: req.user.username,
          phone: req.user.profile?.phone,
          villageId
        },
        personnel: currentShift.personnel.map(p => ({
          memberId: p.memberId,
          name: p.name,
          phone: p.phone,
          responseStatus: 'calling'
        })),
        reason,
        urgency,
        location,
        status: 'calling'
      };

      await schedule.recordCall(callData);

      // 实时通知值班人员（WebSocket）
      const io = socketService.getIO();
      if (io) {
        currentShift.personnel.forEach(person => {
          // 向该值班人员的WebSocket房间发送通知
          io.to(`user_${person.memberId}`).emit('duty_call', {
            callId,
            reason,
            urgency,
            location,
            caller: req.user.username
          });
        });

        // 向村庄管理员房间推送呼叫信息
        io.to(`village_${villageId}_admin`).emit('duty_call_initiated', {
          callId,
          personnel: currentShift.personnel.map(p => p.name),
          urgency
        });
      }

      // 记录审计日志
      await CommitteeAuditLog.logAction({
        operatorId: req.user.id,
        operatorName: req.user.username,
        villageId,
        action: 'duty_call',
        resourceType: 'schedule',
        resourceId: schedule._id,
        details: {
          changes: {
            after: { callId, reason, urgency, personnelCount: currentShift.personnel.length }
          },
          result: 'success'
        },
        requestContext: {
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        },
        sensitiveAction: {
          isSensitive: urgency === 'emergency' || urgency === 'high'
        }
      });

      res.json({
        success: true,
        data: {
          callId,
          personnel: currentShift.personnel,
          shift: currentShift.name,
          status: 'calling'
        },
        message: '正在呼叫值班人员...'
      });

    } catch (error) {
      console.error('Call duty personnel error:', error);
      res.status(500).json({
        success: false,
        message: '呼叫值班人员失败'
      });
    }
  }

  /**
   * 响应呼叫
   * @route POST /api/v1/duty-schedule/calls/:callId/respond
   */
  static async respondToCall(req, res) {
    try {
      const { callId } = req.params;
      const { memberId, status, responseTime, callDuration } = req.body;

      // 查找包含该呼叫的值班表
      const schedule = await DutySchedule.findOne({
        'callHistory.callId': callId
      });

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: '呼叫记录不存在'
        });
      }

      await schedule.respondToCall(callId, memberId, {
        status,
        responseTime,
        callDuration
      });

      // 通知呼叫者
      const io = socketService.getIO();
      if (io) {
        const call = schedule.callHistory.find(c => c.callId === callId);
        if (call) {
          io.to(`user_${call.caller.userId}`).emit('duty_call_responded', {
            callId,
            memberId,
            status,
            responseTime
          });
        }
      }

      res.json({
        success: true,
        message: '响应成功'
      });

    } catch (error) {
      console.error('Respond to call error:', error);
      res.status(500).json({
        success: false,
        message: '响应失败'
      });
    }
  }

  /**
   * 获取月度值班日历
   * @route GET /api/v1/duty-schedule/calendar/:year/:month
   */
  static async getMonthlyCalendar(req, res) {
    try {
      const { villageId } = req.query;
      const { year, month } = req.params;

      const calendar = await DutySchedule.getMonthlyCalendar(
        villageId,
        parseInt(year),
        parseInt(month)
      );

      res.json({
        success: true,
        data: {
          year,
          month,
          calendar
        }
      });

    } catch (error) {
      console.error('Get monthly calendar error:', error);
      res.status(500).json({
        success: false,
        message: '获取月度日历失败'
      });
    }
  }

  /**
   * 获取值班统计
   * @route GET /api/v1/duty-schedule/statistics
   */
  static async getStatistics(req, res) {
    try {
      const { villageId, startDate, endDate } = req.query;

      if (!villageId || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数'
        });
      }

      const stats = await DutySchedule.getDutyStatistics(
        villageId,
        new Date(startDate),
        new Date(endDate)
      );

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get statistics error:', error);
      res.status(500).json({
        success: false,
        message: '获取统计数据失败'
      });
    }
  }

  /**
   * 更新值班表
   * @route PUT /api/v1/duty-schedule/:id
   */
  static async updateSchedule(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const schedule = await DutySchedule.findById(id);
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: '值班表不存在'
        });
      }

      // 权限验证
      if (!req.user.permissions?.includes('duty:update')) {
        return res.status(403).json({
          success: false,
          message: '无权限更新值班表'
        });
      }

      Object.assign(schedule, updateData);
      schedule.metadata.updatedBy = req.user.id;
      await schedule.save();

      res.json({
        success: true,
        data: schedule,
        message: '值班表更新成功'
      });

    } catch (error) {
      console.error('Update schedule error:', error);
      res.status(500).json({
        success: false,
        message: '更新值班表失败'
      });
    }
  }

  /**
   * 发布值班表
   * @route POST /api/v1/duty-schedule/:id/publish
   */
  static async publishSchedule(req, res) {
    try {
      const { id } = req.params;

      const schedule = await DutySchedule.findById(id);
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: '值班表不存在'
        });
      }

      schedule.metadata.published = true;
      schedule.metadata.publishedAt = new Date();
      await schedule.save();

      // 通知相关村委成员
      await sendNotification({
        type: 'duty_schedule_published',
        villageId: schedule.villageId,
        data: {
          season: schedule.season,
          year: schedule.year
        }
      });

      res.json({
        success: true,
        message: '值班表已发布'
      });

    } catch (error) {
      console.error('Publish schedule error:', error);
      res.status(500).json({
        success: false,
        message: '发布值班表失败'
      });
    }
  }

  /**
   * 申请替班
   * @route POST /api/v1/duty-schedule/substitution
   */
  static async requestSubstitution(req, res) {
    try {
      const {
        villageId,
        scheduleId,
        originalDate,
        originalShift,
        originalMemberId,
        substituteMemberId,
        reason
      } = req.body;

      const schedule = await DutySchedule.findById(scheduleId);
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: '值班表不存在'
        });
      }

      await schedule.requestSubstitution({
        originalDate: new Date(originalDate),
        originalShift,
        originalMemberId,
        substituteMemberId,
        reason,
        approvedBy: req.user.id
      });

      // 通知替班人员
      const substitute = await CommitteeMember.findById(substituteMemberId);
      if (substitute) {
        await sendNotification({
          type: 'duty_substitution_request',
          villageId,
          recipients: [substituteMemberId],
          data: {
            date: originalDate,
            shift: originalShift,
            reason
          }
        });
      }

      res.json({
        success: true,
        message: '替班申请已提交'
      });

    } catch (error) {
      console.error('Request substitution error:', error);
      res.status(500).json({
        success: false,
        message: '申请替班失败'
      });
    }
  }
}

module.exports = DutyScheduleController;
