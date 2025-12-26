/**
 * DutyScheduleService - 智能值班表业务逻辑服务
 */

const DutySchedule = require('../models/DutySchedule');
const DutyCallLog = require('../models/DutyCallLog');
const QRCode = require('qrcode');
const mongoose = require('mongoose');

class DutyScheduleService {
  /**
   * 创建值班表
   */
  async createSchedule(villageId, scheduleData, createdBy) {
    const schedule = new DutySchedule({
      villageId,
      ...scheduleData,
      createdBy,
      isActive: true
    });
    
    await schedule.save();
    return schedule;
  }

  /**
   * 获取今日值班信息
   */
  async getTodayDuty(villageId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const schedules = await DutySchedule.find({
      villageId,
      isActive: true
    });

    const todayDuty = [];

    for (const schedule of schedules) {
      const todayAssignments = schedule.assignments.filter(a => {
        const assignmentDate = new Date(a.date);
        return assignmentDate >= today && assignmentDate < tomorrow;
      });

      if (todayAssignments.length > 0) {
        todayDuty.push({
          scheduleId: schedule._id,
          scheduleName: schedule.scheduleName,
          assignments: todayAssignments.map(a => {
            const shift = schedule.shifts.find(s => s._id.toString() === a.shiftId.toString());
            return {
              ...a.toObject(),
              shift: shift || null
            };
          })
        });
      }
    }

    return todayDuty;
  }

  /**
   * 处理村民扫码呼叫
   */
  async handleCallRequest(villageId, callData, callerInfo) {
    const urgency = callData.urgency || 'LOW';
    const content = callData.content;
    const attachments = callData.attachments || [];

    // 获取今日值班人员
    const todayDuty = await this.getTodayDuty(villageId);
    if (todayDuty.length === 0 || todayDuty[0].assignments.length === 0) {
      throw new Error('今日无值班人员');
    }

    // 获取主值班人员
    const primaryOfficer = todayDuty[0].assignments.find(a => a.isPrimary) || todayDuty[0].assignments[0];
    const scheduleId = todayDuty[0].scheduleId;

    // 检查呼叫频率限制
    if (callerInfo.userId) {
      const rateLimit = await DutyCallLog.checkRateLimit(callerInfo.userId, villageId);
      if (!rateLimit.allowed) {
        throw new Error('呼叫过于频繁，请10分钟后再试');
      }
    }

    // 创建呼叫记录
    const callLog = new DutyCallLog({
      villageId,
      scheduleId,
      dutyOfficer: {
        userId: primaryOfficer.userId,
        userName: primaryOfficer.userName,
        userPhone: primaryOfficer.userPhone,
        userRole: primaryOfficer.userRole
      },
      caller: {
        userId: callerInfo.userId,
        userName: callerInfo.userName,
        userPhone: callerInfo.userPhone,
        isAnonymous: !callerInfo.userId,
        userAddress: callerInfo.address
      },
      callType: callData.callType || 'QR_CODE',
      urgency,
      content,
      attachments
    });

    await callLog.save();
    return callLog;
  }

  /**
   * 响应呼叫
   */
  async respondCall(callId, responseData) {
    const callLog = await DutyCallLog.findById(callId);
    if (!callLog) {
      throw new Error('呼叫记录不存在');
    }

    await callLog.respond(responseData.note || '');
    return callLog;
  }

  /**
   * 解决呼叫
   */
  async resolveCall(callId, resolutionData) {
    const callLog = await DutyCallLog.findById(callId);
    if (!callLog) {
      throw new Error('呼叫记录不存在');
    }

    await callLog.resolve(resolutionData.resolution || '');
    return callLog;
  }

  /**
   * 评价呼叫服务
   */
  async rateCall(callId, rating, feedback) {
    const callLog = await DutyCallLog.findById(callId);
    if (!callLog) {
      throw new Error('呼叫记录不存在');
    }

    await callLog.rate(rating, feedback || '');
    return callLog;
  }

  /**
   * 获取值班统计
   */
  async getStatistics(villageId, startDate, endDate) {
    const callStats = await DutyCallLog.getStatistics(villageId, startDate, endDate);
    const dutyStats = await DutySchedule.generateStatisticsReport(villageId, startDate, endDate);

    return {
      calls: callStats,
      duty: dutyStats
    };
  }

  /**
   * 获取超时未响应的呼叫
   */
  async getTimeoutCalls(villageId) {
    return await DutyCallLog.getTimeoutCalls(villageId);
  }

  /**
   * 获取村民的呼叫记录
   */
  async getCallerLogs(callerId, options = {}) {
    const limit = options.limit || 20;
    const skip = options.skip || 0;
    const villageId = options.villageId;

    const query = { 'caller.userId': callerId };
    if (villageId) {
      query.villageId = villageId;
    }

    const logs = await DutyCallLog.find(query)
      .populate('dutyOfficer.userId', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await DutyCallLog.countDocuments(query);

    return { 
      logs, 
      total, 
      page: Math.floor(skip / limit) + 1, 
      pages: Math.ceil(total / limit) 
    };
  }

  /**
   * 获取值班人员的呼叫记录
   */
  async getOfficerCalls(officerId, options = {}) {
    const limit = options.limit || 20;
    const skip = options.skip || 0;
    const status = options.status;
    const startDate = options.startDate;
    const endDate = options.endDate;

    const query = { 'dutyOfficer.userId': officerId };
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await DutyCallLog.find(query)
      .populate('caller.userId', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await DutyCallLog.countDocuments(query);

    return { 
      logs, 
      total, 
      page: Math.floor(skip / limit) + 1, 
      pages: Math.ceil(total / limit) 
    };
  }

  /**
   * 发布值班表（生成二维码）
   */
  async publishSchedule(scheduleId) {
    const schedule = await DutySchedule.findById(scheduleId);
    if (!schedule) {
      throw new Error('值班表不存在');
    }

    const qrContent = 'smartvillage://duty/' + schedule.villageId + '/' + scheduleId;
    
    // 生成二维码（需要qrcode库）
    try {
      const qrCodeUrl = await QRCode.toDataURL(qrContent);
      schedule.qrCodeData = {
        content: qrContent,
        imageUrl: qrCodeUrl,
        generatedAt: new Date()
      };
    } catch (err) {
      // QRCode生成失败时只保存内容
      schedule.qrCodeData = {
        content: qrContent,
        generatedAt: new Date()
      };
    }

    await schedule.save();
    return schedule;
  }

  /**
   * 智能排班算法 - 自动分配值班人员
   * @param {String} scheduleId - 值班表ID
   * @param {Object} options - 排班选项
   * @returns {Object} 生成的排班结果
   */
  async generateSmartSchedule(scheduleId, options = {}) {
    const {
      startDate = new Date(),
      endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 默认30天
      balanceWorkload = true,
      considerPreferences = true,
      enforceRestTime = true
    } = options;

    const schedule = await DutySchedule.findById(scheduleId)
      .populate('assignments.userId');

    if (!schedule) {
      throw new Error('值班表不存在');
    }

    // 获取可用值班人员
    const User = require('../models/User');
    const villageUsers = await User.find({
      villageId: schedule.villageId,
      status: 'active',
      role: { $in: ['village_admin', 'user'] }
    }).select('_id name phone role');

    // 计算每个人员的工作量（最近30天）
    const workloadMap = await this.calculateWorkload(
      schedule.villageId,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date()
    );

    // 生成排班
    const newAssignments = [];
    const dates = this.getDateRange(startDate, endDate);

    for (const date of dates) {
      for (const shift of schedule.shifts) {
        // 为每个班次分配人员
        const assignedUsers = this.selectUsersForShift(
          villageUsers,
          shift,
          date,
          workloadMap,
          {
            balanceWorkload,
            enforceRestTime,
            existingAssignments: newAssignments
          }
        );

        for (let i = 0; i < Math.min(shift.requiredStaff, assignedUsers.length); i++) {
          const user = assignedUsers[i];
          newAssignments.push({
            userId: user._id,
            userName: user.name,
            userPhone: user.phone,
            userRole: user.role,
            shiftId: shift._id,
            date: date,
            isPrimary: i === 0, // 第一个是主值班
            status: 'scheduled'
          });

          // 更新工作量统计
          workloadMap.set(user._id.toString(), (workloadMap.get(user._id.toString()) || 0) + 1);
        }
      }
    }

    // 保存新生成的排班
    schedule.assignments = newAssignments;
    await schedule.save();

    return {
      scheduleId,
      period: { startDate, endDate },
      totalAssignments: newAssignments.length,
      assignmentsByShift: this.groupAssignmentsByShift(newAssignments, schedule.shifts),
      workloadStats: this.getWorkloadStats(workloadMap)
    };
  }

  /**
   * 计算人员工作量
   */
  async calculateWorkload(villageId, startDate, endDate) {
    const schedules = await DutySchedule.find({
      villageId,
      isActive: true
    });

    const workloadMap = new Map();

    for (const schedule of schedules) {
      for (const assignment of schedule.assignments) {
        const assignmentDate = new Date(assignment.date);
        if (assignmentDate >= startDate && assignmentDate <= endDate) {
          const userId = assignment.userId.toString();
          workloadMap.set(userId, (workloadMap.get(userId) || 0) + 1);
        }
      }
    }

    return workloadMap;
  }

  /**
   * 为班次选择合适的用户
   */
  selectUsersForShift(users, shift, date, workloadMap, options = {}) {
    const {
      balanceWorkload = true,
      enforceRestTime = true,
      existingAssignments = []
    } = options;

    // 过滤可用用户
    let availableUsers = users.filter(user => {
      // 检查是否已在该日期分配
      const alreadyAssigned = existingAssignments.some(
        a => a.userId.toString() === user._id.toString() &&
             new Date(a.date).toDateString() === new Date(date).toDateString()
      );
      if (alreadyAssigned) return false;

      return true;
    });

    // 按工作量排序（工作量少的优先）
    if (balanceWorkload) {
      availableUsers.sort((a, b) => {
        const workloadA = workloadMap.get(a._id.toString()) || 0;
        const workloadB = workloadMap.get(b._id.toString()) || 0;
        return workloadA - workloadB;
      });
    }

    return availableUsers;
  }

  /**
   * 获取日期范围
   */
  getDateRange(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  /**
   * 按班次分组统计
   */
  groupAssignmentsByShift(assignments, shifts) {
    const result = {};

    for (const shift of shifts) {
      const shiftId = shift._id.toString();
      const count = assignments.filter(a => a.shiftId.toString() === shiftId).length;
      result[shift.shiftName] = {
        total: count,
        shiftId: shiftId
      };
    }

    return result;
  }

  /**
   * 获取工作量统计
   */
  getWorkloadStats(workloadMap) {
    const stats = {
      total: 0,
      average: 0,
      min: Infinity,
      max: 0,
      byUser: []
    };

    for (const [userId, count] of workloadMap.entries()) {
      stats.total += count;
      stats.min = Math.min(stats.min, count);
      stats.max = Math.max(stats.max, count);
      stats.byUser.push({ userId, count });
    }

    stats.average = workloadMap.size > 0 ? stats.total / workloadMap.size : 0;
    stats.min = stats.min === Infinity ? 0 : stats.min;

    return stats;
  }

  /**
   * 获取日历视图数据
   */
  async getCalendarData(villageId, year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const schedules = await DutySchedule.find({
      villageId,
      isActive: true
    }).populate('assignments.userId');

    const calendarData = [];

    for (const schedule of schedules) {
      for (const assignment of schedule.assignments) {
        const assignmentDate = new Date(assignment.date);
        if (assignmentDate >= startDate && assignmentDate <= endDate) {
          const shift = schedule.shifts.find(s =>
            s._id.toString() === assignment.shiftId.toString()
          );

          calendarData.push({
            date: assignmentDate,
            title: `${assignment.userName} - ${shift?.shiftName || '值班'}`,
            userName: assignment.userName,
            userPhone: assignment.userPhone,
            shiftName: shift?.shiftName,
            startTime: shift?.startTime,
            endTime: shift?.endTime,
            status: assignment.status,
            isPrimary: assignment.isPrimary
          });
        }
      }
    }

    return {
      villageId,
      year,
      month,
      events: calendarData,
      summary: {
        totalDays: calendarData.length,
        byStatus: this.groupByStatus(calendarData),
        byShift: this.groupByShift(calendarData)
      }
    };
  }

  /**
   * 按状态分组
   */
  groupByStatus(events) {
    const result = {};
    for (const event of events) {
      result[event.status] = (result[event.status] || 0) + 1;
    }
    return result;
  }

  /**
   * 按班次分组
   */
  groupByShift(events) {
    const result = {};
    for (const event of events) {
      result[event.shiftName] = (result[event.shiftName] || 0) + 1;
    }
    return result;
  }

  /**
   * 扫码呼叫值班人员 - 村民使用
   */
  async scanAndCallDutyOfficer(qrCodeData, callerInfo, callData = {}) {
    // 解析二维码数据
    const [protocol, , villageId, scheduleId] = qrCodeData.split('/');

    if (protocol !== 'smartvillage:duty') {
      throw new Error('无效的二维码');
    }

    // 获取今日值班人员
    const todayDuty = await this.getTodayDuty(villageId);

    if (todayDuty.length === 0 || todayDuty[0].assignments.length === 0) {
      throw new Error('当前无值班人员');
    }

    const primaryOfficer = todayDuty[0].assignments.find(a => a.isPrimary) || todayDuty[0].assignments[0];

    // 创建呼叫记录
    const callLog = new DutyCallLog({
      villageId,
      scheduleId,
      dutyOfficer: {
        userId: primaryOfficer.userId,
        userName: primaryOfficer.userName,
        userPhone: primaryOfficer.userPhone,
        userRole: primaryOfficer.userRole
      },
      caller: {
        userId: callerInfo.userId || null,
        userName: callerInfo.name,
        userPhone: callerInfo.phone,
        isAnonymous: !callerInfo.userId,
        userAddress: callerInfo.address
      },
      callType: 'QR_CODE',
      urgency: callData.urgency || 'LOW',
      content: callData.content || '村民扫码呼叫',
      location: callData.location || {}
    });

    await callLog.save();

    return {
      callId: callLog._id,
      dutyOfficer: {
        name: primaryOfficer.userName,
        phone: this.maskPhoneNumber(primaryOfficer.userPhone),
        role: primaryOfficer.userRole
      },
      estimatedResponseTime: '5分钟内',
      callStatus: '已通知值班人员'
    };
  }

  /**
   * 手机号脱敏
   */
  maskPhoneNumber(phone) {
    if (!phone) return '';
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }
}

module.exports = DutyScheduleService;
