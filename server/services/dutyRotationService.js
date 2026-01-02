const { DutySchedule, DutyStaff, DutyChangeLog, DutyHandover } = require('../models/duty');
const { AuditLog } = require('../utils/auditLogger');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');

/**
 * 值班轮换服务
 * 处理值班人员轮换、调班、交接班等业务
 */
class DutyRotationService {
  /**
   * 申请调班
   * @param {Object} params - 调班参数
   * @param {String} params.scheduleId - 值班表ID
   * @param {Date} params.date - 值班日期
   * @param {String} params.shiftName - 班次名称
   * @param {String} params.originalStaffId - 原值班人员ID
   * @param {String} params.newStaffId - 新值班人员ID
   * @param {String} params.reason - 调班原因
   * @param {String} params.applicantId - 申请人ID
   * @param {Boolean} params.isTemporary - 是否临时调班
   * @param {Date} params.temporaryUntil - 临时调班结束日期
   * @returns {Promise<Object>} 调班记录
   */
  async applyShiftSwap(params) {
    try {
      logger.info('处理调班申请', params);

      // 验证值班表和日期
      const schedule = await DutySchedule.findById(params.scheduleId);
      if (!schedule) {
        throw new Error('值班表不存在');
      }

      const daySchedule = schedule.schedules.find(s =>
        new Date(s.date).toDateString() === new Date(params.date).toDateString()
      );

      if (!daySchedule) {
        throw new Error('指定日期没有排班');
      }

      const shift = daySchedule.shifts.find(s => s.shiftName === params.shiftName);
      if (!shift) {
        throw new Error('指定班次不存在');
      }

      // 验证原值班人员
      const originalStaff = shift.staff.find(s =>
        s.staffId.toString() === params.originalStaffId
      );
      if (!originalStaff) {
        throw new Error('原值班人员不在该班次中');
      }

      // 验证新值班人员
      const newStaff = await DutyStaff.findById(params.newStaffId);
      if (!newStaff) {
        throw new Error('新值班人员不存在');
      }

      // 检查新值班人员是否可用
      if (!this.isStaffAvailableForSwap(newStaff, params.date, params.shiftName)) {
        throw new Error('新值班人员在此时段不可用');
      }

      // 创建调班记录
      const changeLog = new DutyChangeLog({
        scheduleId: params.scheduleId,
        date: params.date,
        shiftName: params.shiftName,
        changeType: params.isTemporary ? 'temporary' : 'swap',
        originalStaff: [{
          staffId: params.originalStaffId,
          name: originalStaff.name
        }],
        newStaff: [{
          staffId: params.newStaffId,
          name: newStaff.name
        }],
        reason: params.reason,
        temporaryUntil: params.temporaryUntil,
        status: 'pending'
      });

      await changeLog.save();

      // 如果需要审批，发送审批通知
      if (this.requiresApproval(params)) {
        await this.sendApprovalNotification(changeLog);
      } else {
        // 自动批准
        await this.approveShiftSwap(changeLog._id, params.applicantId);
      }

      // 记录审计日志
      await AuditLog.log({
        userId: params.applicantId,
        action: 'APPLY_SHIFT_SWAP',
        resource: changeLog._id,
        details: {
          scheduleId: params.scheduleId,
          date: params.date,
          shift: params.shiftName,
          originalStaff: params.originalStaffId,
          newStaff: params.newStaffId,
          reason: params.reason
        }
      });

      logger.info('调班申请提交成功', { changeLogId: changeLog._id });
      return changeLog;

    } catch (error) {
      logger.error('调班申请失败', error);
      throw error;
    }
  }

  /**
   * 批准调班
   * @param {String} changeLogId - 调班记录ID
   * @param {String} approverId - 批准人ID
   */
  async approveShiftSwap(changeLogId, approverId) {
    try {
      const changeLog = await DutyChangeLog.findById(changeLogId);
      if (!changeLog) {
        throw new Error('调班记录不存在');
      }

      if (changeLog.status !== 'pending') {
        throw new Error('调班记录已处理');
      }

      // 获取值班表
      const schedule = await DutySchedule.findById(changeLog.scheduleId);
      const daySchedule = schedule.schedules.find(s =>
        new Date(s.date).toDateString() === new Date(changeLog.date).toDateString()
      );

      const shift = daySchedule.shifts.find(s => s.shiftName === changeLog.shiftName);

      // 执行调班
      const staffIndex = shift.staff.findIndex(s =>
        s.staffId.toString() === changeLog.originalStaff[0].staffId.toString()
      );

      if (staffIndex !== -1) {
        // 更新值班人员
        shift.staff[staffIndex] = {
          staffId: changeLog.newStaff[0].staffId,
          name: changeLog.newStaff[0].name,
          status: 'scheduled'
        };

        // 保存更新
        await schedule.save();

        // 更新调班记录
        changeLog.status = 'approved';
        changeLog.approvedBy = approverId;
        changeLog.approvedAt = new Date();
        await changeLog.save();

        // 发送通知
        await this.notifySwapApproved(changeLog);
      }

      // 记录审计日志
      await AuditLog.log({
        userId: approverId,
        action: 'APPROVE_SHIFT_SWAP',
        resource: changeLogId,
        details: {
          originalStaff: changeLog.originalStaff[0].staffId,
          newStaff: changeLog.newStaff[0].staffId,
          date: changeLog.date,
          shift: changeLog.shiftName
        }
      });

      logger.info('调班批准成功', { changeLogId });
      return changeLog;

    } catch (error) {
      logger.error('批准调班失败', error);
      throw error;
    }
  }

  /**
   * 拒绝调班
   * @param {String} changeLogId - 调班记录ID
   * @param {String} approverId - 批准人ID
   * @param {String} reason - 拒绝原因
   */
  async rejectShiftSwap(changeLogId, approverId, reason) {
    try {
      const changeLog = await DutyChangeLog.findById(changeLogId);
      if (!changeLog) {
        throw new Error('调班记录不存在');
      }

      if (changeLog.status !== 'pending') {
        throw new Error('调班记录已处理');
      }

      // 更新状态
      changeLog.status = 'rejected';
      changeLog.approvedBy = approverId;
      changeLog.approvedAt = new Date();
      changeLog.reason = reason;
      await changeLog.save();

      // 发送拒绝通知
      await this.notifySwapRejected(changeLog, reason);

      // 记录审计日志
      await AuditLog.log({
        userId: approverId,
        action: 'REJECT_SHIFT_SWAP',
        resource: changeLogId,
        details: {
          reason
        }
      });

      logger.info('调班拒绝成功', { changeLogId });
      return changeLog;

    } catch (error) {
      logger.error('拒绝调班失败', error);
      throw error;
    }
  }

  /**
   * 处理紧急调班
   * @param {Object} params - 紧急调班参数
   */
  async handleEmergencySwap(params) {
    try {
      logger.info('处理紧急调班', params);

      const { scheduleId, date, shiftName, reason, requesterId } = params;

      // 立即批准的紧急调班
      const changeLog = await this.applyShiftSwap({
        ...params,
        isTemporary: false,
        changeType: 'emergency'
      });

      // 自动批准
      await this.approveShiftSwap(changeLog._id, requesterId);

      // 发送紧急通知
      await this.sendEmergencyNotification(changeLog);

      logger.info('紧急调班处理成功', { changeLogId: changeLog._id });
      return changeLog;

    } catch (error) {
      logger.error('紧急调班处理失败', error);
      throw error;
    }
  }

  /**
   * 创建交接班记录
   * @param {Object} params - 交接班参数
   */
  async createHandover(params) {
    try {
      logger.info('创建交接班记录', params);

      const {
        scheduleId,
        date,
        shiftName,
        fromStaffId,
        toStaffId,
        handoverContent,
        photos
      } = params;

      // 验证值班表
      const schedule = await DutySchedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('值班表不存在');
      }

      // 创建交接班记录
      const handover = new DutyHandover({
        scheduleId,
        date: new Date(date),
        shiftName,
        fromStaff: {
          staffId: fromStaffId.staffId,
          name: fromStaffId.name
        },
        toStaff: {
          staffId: toStaffId.staffId,
          name: toStaffId.name
        },
        handoverContent,
        photos
      });

      await handover.save();

      // 发送交接班通知
      await this.sendHandoverNotification(handover);

      // 记录审计日志
      await AuditLog.log({
        userId: fromStaffId.staffId,
        action: 'CREATE_HANDOVER',
        resource: handover._id,
        details: {
          date,
          shift: shiftName,
          toStaff: toStaffId.staffId
        }
      });

      logger.info('交接班记录创建成功', { handoverId: handover._id });
      return handover;

    } catch (error) {
      logger.error('创建交接班记录失败', error);
      throw error;
    }
  }

  /**
   * 确认交接班
   * @param {String} handoverId - 交接班记录ID
   * @param {String} staffId - 确认人ID
   */
  async confirmHandover(handoverId, staffId) {
    try {
      const handover = await DutyHandover.findById(handoverId);
      if (!handover) {
        throw new Error('交接班记录不存在');
      }

      if (handover.toStaff.staffId.toString() !== staffId) {
        throw new Error('只有接班人员可以确认交接班');
      }

      if (handover.confirmed) {
        throw new Error('交接班已确认');
      }

      // 更新确认状态
      handover.confirmed = true;
      handover.confirmedAt = new Date();
      await handover.save();

      // 更新值班表状态
      const schedule = await DutySchedule.findById(handover.scheduleId);
      const daySchedule = schedule.schedules.find(s =>
        new Date(s.date).toDateString() === new Date(handover.date).toDateString()
      );

      const shift = daySchedule.shifts.find(s => s.shiftName === handover.shiftName);
      const staffAssignment = shift.staff.find(s =>
        s.staffId.toString() === staffId
      );

      if (staffAssignment) {
        staffAssignment.status = 'confirmed';
        staffAssignment.checkInTime = new Date();
        await schedule.save();
      }

      // 记录审计日志
      await AuditLog.log({
        userId: staffId,
        action: 'CONFIRM_HANDOVER',
        resource: handoverId,
        details: {
          date: handover.date,
          shift: handover.shiftName
        }
      });

      logger.info('交接班确认成功', { handoverId });
      return handover;

    } catch (error) {
      logger.error('确认交接班失败', error);
      throw error;
    }
  }

  /**
   * 获取待处理的调班申请
   * @param {String} villageId - 村庄ID
   * @param {Object} filters - 过滤条件
   */
  async getPendingSwaps(villageId, filters = {}) {
    try {
      const query = {
        status: 'pending',
        ...filters
      };

      // 通过值班表关联村庄
      const schedules = await DutySchedule.find({ villageId }).distinct('_id');
      query.scheduleId = { $in: schedules };

      const pendingSwaps = await DutyChangeLog
        .find(query)
        .populate('originalStaff.staffId')
        .populate('newStaff.staffId')
        .populate('approvedBy', 'name')
        .sort({ createdAt: -1 });

      return pendingSwaps;

    } catch (error) {
      logger.error('获取待处理调班申请失败', error);
      throw error;
    }
  }

  /**
   * 获取人员值班历史
   * @param {String} staffId - 人员ID
   * @param {Object} params - 查询参数
   */
  async getStaffDutyHistory(staffId, params = {}) {
    try {
      const { startDate, endDate, limit = 50 } = params;

      const schedules = await DutySchedule.find({
        'schedules.date': {
          $gte: new Date(startDate || new Date().setMonth(new Date().getMonth() - 3)),
          $lte: new Date(endDate || new Date())
        }
      });

      const history = [];

      schedules.forEach(schedule => {
        schedule.schedules.forEach(daySchedule => {
          daySchedule.shifts.forEach(shift => {
            const assignment = shift.staff.find(s =>
              s.staffId.toString() === staffId
            );

            if (assignment) {
              history.push({
                date: daySchedule.date,
                shiftName: shift.shiftName,
                status: assignment.status,
                checkInTime: assignment.checkInTime,
                checkOutTime: assignment.checkOutTime,
                notes: assignment.notes
              });
            }
          });
        });
      });

      // 按日期排序
      history.sort((a, b) => new Date(b.date) - new Date(a.date));

      // 获取调班记录
      const swapHistory = await DutyChangeLog.find({
        $or: [
          { 'originalStaff.staffId': staffId },
          { 'newStaff.staffId': staffId }
        ]
      }).sort({ createdAt: -1 });

      return {
        dutyHistory: history.slice(0, limit),
        swapHistory,
        statistics: await this.calculateStaffStatistics(staffId)
      };

    } catch (error) {
      logger.error('获取人员值班历史失败', error);
      throw error;
    }
  }

  /**
   * 计算人员统计信息
   */
  async calculateStaffStatistics(staffId) {
    try {
      const staff = await DutyStaff.findById(staffId);

      // 获取最近3个月的值班记录
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const schedules = await DutySchedule.find({
        'schedules.date': { $gte: threeMonthsAgo }
      });

      let totalDutyCount = 0;
      let completedDutyCount = 0;
      let absentCount = 0;
      const shiftDistribution = {};

      schedules.forEach(schedule => {
        schedule.schedules.forEach(daySchedule => {
          daySchedule.shifts.forEach(shift => {
            const assignment = shift.staff.find(s =>
              s.staffId.toString() === staffId
            );

            if (assignment) {
              totalDutyCount++;

              if (assignment.status === 'completed') {
                completedDutyCount++;
              } else if (assignment.status === 'absent') {
                absentCount++;
              }

              if (!shiftDistribution[shift.shiftName]) {
                shiftDistribution[shift.shiftName] = 0;
              }
              shiftDistribution[shift.shiftName]++;
            }
          });
        });
      });

      return {
        totalDutyCount,
        completedDutyCount,
        absentCount,
        attendanceRate: totalDutyCount > 0 ? completedDutyCount / totalDutyCount : 1,
        averagePerMonth: totalDutyCount / 3,
        shiftDistribution,
        maxDutyPerMonth: staff.maxDutyPerMonth,
        currentMonthCount: staff.statistics.thisMonthDutyCount
      };

    } catch (error) {
      logger.error('计算人员统计信息失败', error);
      throw error;
    }
  }

  /**
   * 检查人员是否可用于调班
   */
  isStaffAvailableForSwap(staff, date, shiftName) {
    // 检查不可用日期
    const unavailable = staff.preferences.customConstraints.some(
      c => new Date(c.date).toDateString() === new Date(date).toDateString() &&
           c.type === 'unavailable'
    );

    if (unavailable) return false;

    // 检查月度上限
    if (staff.statistics.thisMonthDutyCount >= staff.maxDutyPerMonth) {
      return false;
    }

    // 检查是否已有排班
    // TODO: 实现更复杂的冲突检查

    return true;
  }

  /**
   * 判断是否需要审批
   */
  requiresApproval(params) {
    // 临时调班需要审批
    if (params.isTemporary) {
      return true;
    }

    // 非工作时间调班需要审批
    const date = new Date(params.date);
    const hour = date.getHours();
    if (hour < 9 || hour > 17) {
      return true;
    }

    // 节假日调班需要审批
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return true;
    }

    return false;
  }

  /**
   * 发送审批通知
   */
  async sendApprovalNotification(changeLog) {
    try {
      const message = `新的调班申请待审批：${changeLog.date} ${changeLog.shiftName}班，${changeLog.originalStaff[0].name} -> ${changeLog.newStaff[0].name}`;

      await notificationService.sendToVillageAdmins({
        villageId: changeLog.villageId,
        title: '调班审批',
        message,
        type: 'duty_swap_approval',
        data: {
          changeLogId: changeLog._id
        }
      });

    } catch (error) {
      logger.error('发送审批通知失败', error);
    }
  }

  /**
   * 发送调班批准通知
   */
  async notifySwapApproved(changeLog) {
    try {
      const message = `您的调班申请已批准：${changeLog.date} ${changeLog.shiftName}班`;

      // 通知原值班人员
      await notificationService.sendToUser({
        userId: changeLog.originalStaff[0].staffId,
        title: '调班批准',
        message,
        type: 'duty_swap_approved'
      });

      // 通知新值班人员
      await notificationService.sendToUser({
        userId: changeLog.newStaff[0].staffId,
        title: '值班安排',
        message: `您被安排在${changeLog.date} ${changeLog.shiftName}班值班`,
        type: 'duty_assigned'
      });

    } catch (error) {
      logger.error('发送调班批准通知失败', error);
    }
  }

  /**
   * 发送调班拒绝通知
   */
  async notifySwapRejected(changeLog, reason) {
    try {
      const message = `您的调班申请被拒绝：${reason}`;

      await notificationService.sendToUser({
        userId: changeLog.originalStaff[0].staffId,
        title: '调班拒绝',
        message,
        type: 'duty_swap_rejected'
      });

    } catch (error) {
      logger.error('发送调班拒绝通知失败', error);
    }
  }

  /**
   * 发送紧急通知
   */
  async sendEmergencyNotification(changeLog) {
    try {
      const message = `紧急调班：${changeLog.date} ${changeLog.shiftName}班，${changeLog.newStaff[0].name}接替${changeLog.originalStaff[0].name}`;

      await notificationService.sendEmergency({
        title: '紧急调班通知',
        message,
        type: 'emergency_duty_swap',
        villageId: changeLog.villageId
      });

    } catch (error) {
      logger.error('发送紧急通知失败', error);
    }
  }

  /**
   * 发送交接班通知
   */
  async sendHandoverNotification(handover) {
    try {
      const message = `${handover.fromStaff.name}向您交接班：${handover.date} ${handover.shiftName}班`;

      await notificationService.sendToUser({
        userId: handover.toStaff.staffId,
        title: '交接班提醒',
        message,
        type: 'duty_handover',
        data: {
          handoverId: handover._id
        }
      });

    } catch (error) {
      logger.error('发送交接班通知失败', error);
    }
  }

  /**
   * 自动处理临时调班到期
   */
  async processExpiredTemporarySwaps() {
    try {
      logger.info('开始处理到期的临时调班');

      const expiredSwaps = await DutyChangeLog.find({
        changeType: 'temporary',
        status: 'approved',
        temporaryUntil: { $lte: new Date() }
      });

      for (const swap of expiredSwaps) {
        // 恢复原始排班
        const schedule = await DutySchedule.findById(swap.scheduleId);
        const daySchedule = schedule.schedules.find(s =>
          new Date(s.date).toDateString() === new Date(swap.date).toDateString()
        );

        const shift = daySchedule.shifts.find(s => s.shiftName === swap.shiftName);

        // 找到新值班人员并替换
        const staffIndex = shift.staff.findIndex(s =>
          s.staffId.toString() === swap.newStaff[0].staffId.toString()
        );

        if (staffIndex !== -1) {
          shift.staff[staffIndex] = {
            staffId: swap.originalStaff[0].staffId,
            name: swap.originalStaff[0].name,
            status: 'scheduled'
          };

          await schedule.save();
        }

        // 更新调班记录状态
        swap.status = 'completed';
        await swap.save();

        logger.info('临时调班已恢复', { swapId: swap._id });
      }

    } catch (error) {
      logger.error('处理到期临时调班失败', error);
    }
  }

  /**
   * 批量导出排班数据
   * @param {Object} params - 导出参数
   */
  async exportScheduleData(params) {
    try {
      const { villageId, startDate, endDate, format = 'excel' } = params;

      // 获取排班数据
      const schedules = await DutySchedule.find({
        villageId,
        'schedules.date': {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }).populate('schedules.shifts.staff.staffId');

      // 调班记录
      const changeLogs = await DutyChangeLog.find({
        scheduleId: { $in: schedules.map(s => s._id) }
      }).populate('originalStaff.staffId newStaff.staffId');

      // 交接班记录
      const handovers = await DutyHandover.find({
        scheduleId: { $in: schedules.map(s => s._id) }
      });

      // 导出数据
      const exportData = {
        schedules,
        changeLogs,
        handovers,
        exportTime: new Date(),
        villageId
      };

      // 根据格式生成文件
      let filePath;
      switch (format) {
        case 'excel':
          filePath = await this.exportToExcel(exportData);
          break;
        case 'csv':
          filePath = await this.exportToCSV(exportData);
          break;
        case 'pdf':
          filePath = await this.exportToPDF(exportData);
          break;
        default:
          throw new Error(`不支持的导出格式: ${format}`);
      }

      logger.info('排班数据导出成功', { format, filePath });
      return filePath;

    } catch (error) {
      logger.error('导出排班数据失败', error);
      throw error;
    }
  }

  /**
   * 导出为Excel格式
   */
  async exportToExcel(data) {
    // TODO: 实现Excel导出逻辑
    return '/path/to/exported/file.xlsx';
  }

  /**
   * 导出为CSV格式
   */
  async exportToCSV(data) {
    // TODO: 实现CSV导出逻辑
    return '/path/to/exported/file.csv';
  }

  /**
   * 导出为PDF格式
   */
  async exportToPDF(data) {
    // TODO: 实现PDF导出逻辑
    return '/path/to/exported/file.pdf';
  }
}

module.exports = new DutyRotationService();