const dutyScheduleService = require('../services/dutyScheduleService');
const dutyRotationService = require('../services/dutyRotationService');
const { DutyStaff, DutySchedule } = require('../models/duty');
const { ApiResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 值班表控制器
 * 处理值班表相关的HTTP请求
 */
class DutyController {
  /**
   * 创建月度值班表
   */
  async createSchedule(req, res, next) {
    try {
      const {
        villageId,
        year,
        month,
        algorithm,
        shifts,
        parameters,
        specialDates
      } = req.body;

      const schedule = await dutyScheduleService.createMonthlySchedule({
        villageId,
        year,
        month,
        algorithm,
        shifts,
        parameters,
        specialDates,
        createdBy: req.user.id
      });

      return ApiResponse.success(res, {
        message: '值班表创建成功',
        data: schedule
      });

    } catch (error) {
      logger.error('创建值班表失败', error);
      next(error);
    }
  }

  /**
   * 发布值班表
   */
  async publishSchedule(req, res, next) {
    try {
      const { scheduleId } = req.params;

      const schedule = await dutyScheduleService.publishSchedule(
        scheduleId,
        req.user.id
      );

      return ApiResponse.success(res, {
        message: '值班表发布成功',
        data: schedule
      });

    } catch (error) {
      logger.error('发布值班表失败', error);
      next(error);
    }
  }

  /**
   * 获取月度值班表
   */
  async getMonthlySchedule(req, res, next) {
    try {
      const { villageId, year, month } = req.query;

      const schedule = await dutyScheduleService.getMonthlySchedule(
        villageId,
        parseInt(year),
        parseInt(month)
      );

      if (!schedule) {
        return ApiResponse.notFound(res, {
          message: '该月份暂无值班表'
        });
      }

      return ApiResponse.success(res, {
        message: '获取值班表成功',
        data: schedule
      });

    } catch (error) {
      logger.error('获取月度值班表失败', error);
      next(error);
    }
  }

  /**
   * 获取值班表列表
   */
  async getScheduleList(req, res, next) {
    try {
      const {
        villageId,
        year,
        status,
        page = 1,
        limit = 10
      } = req.query;

      const query = {
        villageId
      };

      if (year) query.year = parseInt(year);
      if (status) query.status = status;

      const schedules = await DutySchedule.find(query)
        .populate('createdBy', 'name')
        .sort({ year: -1, month: -1 })
        .limit(parseInt(limit) * 1)
        .skip((parseInt(page) - 1) * parseInt(limit));

      const total = await DutySchedule.countDocuments(query);

      return ApiResponse.success(res, {
        message: '获取值班表列表成功',
        data: {
          schedules,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      logger.error('获取值班表列表失败', error);
      next(error);
    }
  }

  /**
   * 获取值班表详情
   */
  async getScheduleDetail(req, res, next) {
    try {
      const { scheduleId } = req.params;

      const schedule = await DutySchedule.findById(scheduleId)
        .populate('schedules.shifts.staff.staffId')
        .populate('createdBy', 'name')
        .populate('optimizationHistory.changes.originalStaff')
        .populate('optimizationHistory.changes.newStaff');

      if (!schedule) {
        return ApiResponse.notFound(res, {
          message: '值班表不存在'
        });
      }

      return ApiResponse.success(res, {
        message: '获取值班表详情成功',
        data: schedule
      });

    } catch (error) {
      logger.error('获取值班表详情失败', error);
      next(error);
    }
  }

  /**
   * 申请调班
   */
  async applyShiftSwap(req, res, next) {
    try {
      const swapRecord = await dutyRotationService.applyShiftSwap({
        ...req.body,
        applicantId: req.user.id
      });

      return ApiResponse.success(res, {
        message: '调班申请提交成功',
        data: swapRecord
      });

    } catch (error) {
      logger.error('申请调班失败', error);
      next(error);
    }
  }

  /**
   * 处理紧急调班
   */
  async handleEmergencySwap(req, res, next) {
    try {
      const swapRecord = await dutyRotationService.handleEmergencySwap({
        ...req.body,
        requesterId: req.user.id
      });

      return ApiResponse.success(res, {
        message: '紧急调班处理成功',
        data: swapRecord
      });

    } catch (error) {
      logger.error('处理紧急调班失败', error);
      next(error);
    }
  }

  /**
   * 批准调班
   */
  async approveSwap(req, res, next) {
    try {
      const { swapId } = req.params;

      const swapRecord = await dutyRotationService.approveSwapSwap(
        swapId,
        req.user.id
      );

      return ApiResponse.success(res, {
        message: '调班批准成功',
        data: swapRecord
      });

    } catch (error) {
      logger.error('批准调班失败', error);
      next(error);
    }
  }

  /**
   * 拒绝调班
   */
  async rejectSwap(req, res, next) {
    try {
      const { swapId } = req.params;
      const { reason } = req.body;

      const swapRecord = await dutyRotationService.rejectSwapSwap(
        swapId,
        req.user.id,
        reason
      );

      return ApiResponse.success(res, {
        message: '调班拒绝成功',
        data: swapRecord
      });

    } catch (error) {
      logger.error('拒绝调班失败', error);
      next(error);
    }
  }

  /**
   * 获取待处理调班申请
   */
  async getPendingSwaps(req, res, next) {
    try {
      const {
        villageId,
        startDate,
        endDate,
        page = 1,
        limit = 10
      } = req.query;

      const filters = {};
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const swaps = await dutyRotationService.getPendingSwaps(
        villageId,
        filters
      );

      const paginatedSwaps = swaps.slice(
        (parseInt(page) - 1) * parseInt(limit),
        parseInt(page) * parseInt(limit)
      );

      return ApiResponse.success(res, {
        message: '获取待处理调班申请成功',
        data: {
          swaps: paginatedSwaps,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: swaps.length,
            pages: Math.ceil(swaps.length / parseInt(limit))
          }
        }
      });

    } catch (error) {
      logger.error('获取待处理调班申请失败', error);
      next(error);
    }
  }

  /**
   * 创建交接班记录
   */
  async createHandover(req, res, next) {
    try {
      const handover = await dutyRotationService.createHandover(req.body);

      return ApiResponse.success(res, {
        message: '交接班记录创建成功',
        data: handover
      });

    } catch (error) {
      logger.error('创建交接班记录失败', error);
      next(error);
    }
  }

  /**
   * 确认交接班
   */
  async confirmHandover(req, res, next) {
    try {
      const { handoverId } = req.params;

      const handover = await dutyRotationService.confirmHandover(
        handoverId,
        req.user.id
      );

      return ApiResponse.success(res, {
        message: '交接班确认成功',
        data: handover
      });

    } catch (error) {
      logger.error('确认交接班失败', error);
      next(error);
    }
  }

  /**
   * 获取交接班记录列表
   */
  async getHandoverList(req, res, next) {
    try {
      const {
        villageId,
        startDate,
        endDate,
        staffId,
        page = 1,
        limit = 10
      } = req.query;

      // 构建查询条件
      const query = {};
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }
      if (staffId) {
        query.$or = [
          { 'fromStaff.staffId': staffId },
          { 'toStaff.staffId': staffId }
        ];
      }

      // 通过值班表关联村庄
      const schedules = await DutySchedule.find({ villageId }).distinct('_id');
      query.scheduleId = { $in: schedules };

      const handovers = await DutyHandover.find(query)
        .populate('fromStaff.staffId', 'name')
        .populate('toStaff.staffId', 'name')
        .sort({ date: -1 })
        .limit(parseInt(limit) * 1)
        .skip((parseInt(page) - 1) * parseInt(limit));

      const total = await DutyHandover.countDocuments(query);

      return ApiResponse.success(res, {
        message: '获取交接班记录列表成功',
        data: {
          handovers,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      logger.error('获取交接班记录列表失败', error);
      next(error);
    }
  }

  /**
   * 获取人员值班历史
   */
  async getStaffHistory(req, res, next) {
    try {
      const { staffId } = req.params;
      const {
        startDate,
        endDate,
        limit = 50
      } = req.query;

      const history = await dutyRotationService.getStaffDutyHistory(
        staffId,
        {
          startDate,
          endDate,
          limit: parseInt(limit)
        }
      );

      return ApiResponse.success(res, {
        message: '获取人员值班历史成功',
        data: history
      });

    } catch (error) {
      logger.error('获取人员值班历史失败', error);
      next(error);
    }
  }

  /**
   * 生成值班统计报表
   */
  async generateReport(req, res, next) {
    try {
      const {
        villageId,
        startDate,
        endDate,
        staffId,
        reportType = 'summary'
      } = req.query;

      const report = await dutyScheduleService.generateDutyReport({
        villageId,
        startDate,
        endDate,
        staffId,
        reportType
      });

      return ApiResponse.success(res, {
        message: '生成值班报表成功',
        data: report
      });

    } catch (error) {
      logger.error('生成值班报表失败', error);
      next(error);
    }
  }

  /**
   * 获取排班建议
   */
  async getSuggestion(req, res, next) {
    try {
      const { villageId } = req.query;

      const suggestions = await dutyScheduleService.getScheduleSuggestion(
        villageId,
        req.query
      );

      return ApiResponse.success(res, {
        message: '获取排班建议成功',
        data: suggestions
      });

    } catch (error) {
      logger.error('获取排班建议失败', error);
      next(error);
    }
  }

  /**
   * 导出排班数据
   */
  async exportData(req, res, next) {
    try {
      const {
        villageId,
        startDate,
        endDate,
        format = 'excel',
        dataTypes = 'schedules'
      } = req.query;

      const filePath = await dutyRotationService.exportScheduleData({
        villageId,
        startDate,
        endDate,
        format,
        dataTypes: dataTypes.split(',')
      });

      // 设置响应头
      const fileName = `duty_schedule_${startDate}_${endDate}.${format}`;
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');

      // 发送文件
      res.download(filePath, fileName, (err) => {
        if (err) {
          logger.error('下载文件失败', err);
          if (!res.headersSent) {
            next(err);
          }
        }
      });

    } catch (error) {
      logger.error('导出排班数据失败', error);
      next(error);
    }
  }

  /**
   * 添加值班人员
   */
  async addStaff(req, res, next) {
    try {
      const staff = new DutyStaff({
        ...req.body,
        statistics: {
          thisMonthDutyCount: 0,
          totalDutyCount: 0
        }
      });

      await staff.save();

      return ApiResponse.success(res, {
        message: '添加值班人员成功',
        data: staff
      });

    } catch (error) {
      logger.error('添加值班人员失败', error);
      next(error);
    }
  }

  /**
   * 更新值班人员信息
   */
  async updateStaff(req, res, next) {
    try {
      const { staffId } = req.params;

      const staff = await DutyStaff.findByIdAndUpdate(
        staffId,
        { $set: req.body },
        { new: true, runValidators: true }
      );

      if (!staff) {
        return ApiResponse.notFound(res, {
          message: '值班人员不存在'
        });
      }

      return ApiResponse.success(res, {
        message: '更新值班人员信息成功',
        data: staff
      });

    } catch (error) {
      logger.error('更新值班人员信息失败', error);
      next(error);
    }
  }

  /**
   * 删除值班人员
   */
  async deleteStaff(req, res, next) {
    try {
      const { staffId } = req.params;

      const staff = await DutyStaff.findByIdAndDelete(staffId);

      if (!staff) {
        return ApiResponse.notFound(res, {
          message: '值班人员不存在'
        });
      }

      // TODO: 检查是否有未完成的值班安排
      // 如果有，标记为非活跃而不是删除

      return ApiResponse.success(res, {
        message: '删除值班人员成功'
      });

    } catch (error) {
      logger.error('删除值班人员失败', error);
      next(error);
    }
  }

  /**
   * 获取值班人员列表
   */
  async getStaffList(req, res, next) {
    try {
      const {
        villageId,
        isActive,
        department,
        page = 1,
        limit = 10
      } = req.query;

      const query = { villageId };
      if (isActive !== undefined) query.isActive = isActive === 'true';
      if (department) query.department = department;

      const staffs = await DutyStaff.find(query)
        .populate('userId', 'username email avatar')
        .sort({ priority: -1, createdAt: -1 })
        .limit(parseInt(limit) * 1)
        .skip((parseInt(page) - 1) * parseInt(limit));

      const total = await DutyStaff.countDocuments(query);

      return ApiResponse.success(res, {
        message: '获取值班人员列表成功',
        data: {
          staffs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      logger.error('获取值班人员列表失败', error);
      next(error);
    }
  }

  /**
   * 批量操作
   */
  async batchOperation(req, res, next) {
    try {
      const { operation, items } = req.body;
      const results = [];

      switch (operation) {
        case 'publish_schedules':
          for (const item of items) {
            try {
              const result = await dutyScheduleService.publishSchedule(
                item.id,
                req.user.id
              );
              results.push({ id: item.id, success: true, data: result });
            } catch (error) {
              results.push({
                id: item.id,
                success: false,
                error: error.message
              });
            }
          }
          break;

        case 'approve_swaps':
          for (const item of items) {
            try {
              const result = await dutyRotationService.approveSwapSwap(
                item.id,
                req.user.id
              );
              results.push({ id: item.id, success: true, data: result });
            } catch (error) {
              results.push({
                id: item.id,
                success: false,
                error: error.message
              });
            }
          }
          break;

        case 'archive_schedules':
          for (const item of items) {
            try {
              const schedule = await DutySchedule.findByIdAndUpdate(
                item.id,
                {
                  status: 'archived',
                  archivedAt: new Date()
                },
                { new: true }
              );
              results.push({ id: item.id, success: true, data: schedule });
            } catch (error) {
              results.push({
                id: item.id,
                success: false,
                error: error.message
              });
            }
          }
          break;

        default:
          throw new Error(`不支持的批量操作: ${operation}`);
      }

      return ApiResponse.success(res, {
        message: '批量操作完成',
        data: {
          operation,
          results,
          successCount: results.filter(r => r.success).length,
          failCount: results.filter(r => !r.success).length
        }
      });

    } catch (error) {
      logger.error('批量操作失败', error);
      next(error);
    }
  }

  /**
   * 获取值班日历视图
   */
  async getDutyCalendar(req, res, next) {
    try {
      const {
        villageId,
        year,
        month,
        staffId
      } = req.query;

      const schedule = await dutyScheduleService.getMonthlySchedule(
        villageId,
        parseInt(year),
        parseInt(month)
      );

      if (!schedule) {
        return ApiResponse.success(res, {
          message: '获取值班日历成功',
          data: []
        });
      }

      // 转换为日历格式
      const calendar = schedule.schedules.map(daySchedule => {
        const dayData = {
          date: daySchedule.date,
          shifts: {}
        };

        daySchedule.shifts.forEach(shift => {
          dayData.shifts[shift.shiftName] = shift.staff.map(staff => ({
            staffId: staff.staffId._id || staff.staffId,
            name: staff.name,
            status: staff.status
          }));
        });

        return dayData;
      });

      // 如果指定了人员，过滤相关记录
      if (staffId) {
        const filteredCalendar = calendar.map(day => {
          const filteredShifts = {};
          Object.keys(day.shifts).forEach(shiftName => {
            const filteredStaff = day.shifts[shiftName].filter(
              staff => staff.staffId.toString() === staffId
            );
            if (filteredStaff.length > 0) {
              filteredShifts[shiftName] = filteredStaff;
            }
          });

          return {
            date: day.date,
            shifts: filteredShifts
          };
        }).filter(day => Object.keys(day.shifts).length > 0);

        return ApiResponse.success(res, {
          message: '获取值班日历成功',
          data: filteredCalendar
        });
      }

      return ApiResponse.success(res, {
        message: '获取值班日历成功',
        data: calendar
      });

    } catch (error) {
      logger.error('获取值班日历失败', error);
      next(error);
    }
  }

  /**
   * 获取值班统计概览
   */
  async getDutyOverview(req, res, next) {
    try {
      const { villageId, year, month } = req.query;

      const schedule = await dutyScheduleService.getMonthlySchedule(
        villageId,
        parseInt(year),
        parseInt(month)
      );

      if (!schedule) {
        return ApiResponse.success(res, {
          message: '获取值班概览成功',
          data: {
            totalDays: 0,
            totalShifts: 0,
            totalAssignments: 0,
            coverageRate: 0,
            avgDutyPerStaff: 0
          }
        });
      }

      // 计算统计数据
      let totalAssignments = 0;
      let totalRequiredAssignments = 0;

      schedule.schedules.forEach(daySchedule => {
        daySchedule.shifts.forEach(shift => {
          const shiftConfig = schedule.shifts.find(s => s.name === shift.shiftName);
          totalAssignments += shift.staff.length;
          totalRequiredAssignments += shiftConfig?.requiredStaffCount || 1;
        });
      });

      const coverageRate = totalRequiredAssignments > 0
        ? (totalAssignments / totalRequiredAssignments * 100).toFixed(2)
        : 100;

      const staffList = await DutyStaff.find({
        villageId,
        isActive: true
      });

      const avgDutyPerStaff = staffList.length > 0
        ? (totalAssignments / staffList.length).toFixed(2)
        : 0;

      return ApiResponse.success(res, {
        message: '获取值班概览成功',
        data: {
          totalDays: schedule.schedules.length,
          totalShifts: schedule.schedules.reduce(
            (sum, day) => sum + day.shifts.length,
            0
          ),
          totalAssignments,
          totalRequiredAssignments,
          coverageRate: parseFloat(coverageRate),
          avgDutyPerStaff: parseFloat(avgDutyPerStaff),
          staffCount: staffList.length,
          algorithm: schedule.algorithm
        }
      });

    } catch (error) {
      logger.error('获取值班概览失败', error);
      next(error);
    }
  }
}

module.exports = new DutyController();