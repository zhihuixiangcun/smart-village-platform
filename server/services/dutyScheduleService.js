const { DutySchedule, DutyStaff, DutyChangeLog } = require('../models/duty');
const { AuditLog } = require('../utils/auditLogger');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

/**
 * 智能排班服务
 * 提供多种排班算法和优化方案
 */
class DutyScheduleService {
  /**
   * 创建月度值班表
   * @param {Object} params - 创建参数
   * @param {String} params.villageId - 村庄ID
   * @param {Number} params.year - 年份
   * @param {Number} params.month - 月份
   * @param {String} params.algorithm - 排班算法
   * @param {Array} params.shifts - 班次配置
   * @param {Object} params.parameters - 排班参数
   * @param {String} params.createdBy - 创建者ID
   * @returns {Promise<Object>} 创建的值班表
   */
  async createMonthlySchedule(params) {
    try {
      logger.info('开始创建月度值班表', params);

      // 检查是否已存在
      const existingSchedule = await DutySchedule.findOne({
        villageId: params.villageId,
        year: params.year,
        month: params.month,
        status: { $in: ['published', 'active'] }
      });

      if (existingSchedule) {
        throw new Error('该月份已存在已发布的值班表');
      }

      // 获取值班人员列表
      const staffList = await DutyStaff.find({
        villageId: params.villageId,
        isActive: true
      }).sort({ priority: -1 });

      if (staffList.length === 0) {
        throw new Error('没有可用的值班人员');
      }

      // 创建值班表
      const schedule = new DutySchedule({
        villageId: params.villageId,
        year: params.year,
        month: params.month,
        algorithm: params.algorithm || 'balanced',
        shifts: params.shifts,
        parameters: params.parameters,
        createdBy: params.createdBy
      });

      // 生成排班
      await this.generateSchedule(schedule, staffList);

      // 保存值班表
      await schedule.save();

      // 记录审计日志
      await AuditLog.log({
        userId: params.createdBy,
        action: 'CREATE_DUTY_SCHEDULE',
        resource: schedule._id,
        details: {
          villageId: params.villageId,
          year: params.year,
          month: params.month,
          algorithm: params.algorithm,
          staffCount: staffList.length
        }
      });

      logger.info('月度值班表创建成功', { scheduleId: schedule._id });
      return schedule;

    } catch (error) {
      logger.error('创建月度值班表失败', error);
      throw error;
    }
  }

  /**
   * 生成排班
   * @param {Object} schedule - 值班表对象
   * @param {Array} staffList - 值班人员列表
   */
  async generateSchedule(schedule, staffList) {
    const { year, month, algorithm, shifts } = schedule;
    const daysInMonth = new Date(year, month, 0).getDate();

    // 初始化每日排班
    schedule.schedules = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();

      schedule.schedules.push({
        date,
        shifts: shifts.map(shift => ({
          shiftName: shift.name,
          staff: []
        }))
      });
    }

    // 根据算法选择排班方式
    switch (algorithm) {
      case 'rotation':
        await this.generateRotationSchedule(schedule, staffList);
        break;
      case 'balanced':
        await this.generateBalancedSchedule(schedule, staffList);
        break;
      case 'priority':
        await this.generatePrioritySchedule(schedule, staffList);
        break;
      case 'custom':
        await this.generateCustomSchedule(schedule, staffList);
        break;
      default:
        throw new Error(`不支持的排班算法: ${algorithm}`);
    }

    // 后处理：检查冲突、优化排班
    await this.postProcessSchedule(schedule, staffList);
  }

  /**
   * 轮询制排班
   * 按固定顺序循环排班
   */
  async generateRotationSchedule(schedule, staffList) {
    const { shifts, schedules } = schedule;
    let staffIndex = 0;

    for (const daySchedule of schedules) {
      for (const shift of daySchedule.shifts) {
        const shiftConfig = shifts.find(s => s.name === shift.shiftName);
        const requiredCount = shiftConfig?.requiredStaffCount || 1;

        for (let i = 0; i < requiredCount; i++) {
          const staff = staffList[staffIndex % staffList.length];
          if (this.isStaffAvailable(staff, daySchedule.date, shift.shiftName)) {
            shift.staff.push({
              staffId: staff._id,
              name: staff.name,
              status: 'scheduled'
            });
          }
          staffIndex++;
        }
      }
    }
  }

  /**
   * 均衡制排班
   * 力求平均分配值班任务
   */
  async generateBalancedSchedule(schedule, staffList) {
    const { shifts, schedules, parameters } = schedule;

    // 初始化值班统计
    const dutyStats = new Map();
    staffList.forEach(staff => {
      dutyStats.set(staff._id.toString(), {
        count: 0,
        lastDutyDate: null,
        consecutiveDays: 0
      });
    });

    // 按日期排序排班
    for (const daySchedule of schedules) {
      for (const shift of daySchedule.shifts) {
        const shiftConfig = shifts.find(s => s.name === shift.shiftName);
        const requiredCount = shiftConfig?.requiredStaffCount || 1;

        // 获取可用人员，按值班次数排序
        const availableStaff = staffList
          .filter(staff => this.isStaffAvailable(staff, daySchedule.date, shift.shiftName))
          .sort((a, b) => {
            const statsA = dutyStats.get(a._id.toString());
            const statsB = dutyStats.get(b._id.toString());

            // 优先考虑值班次数少的
            if (statsA.count !== statsB.count) {
              return statsA.count - statsB.count;
            }

            // 考虑连续值班天数
            if (statsA.consecutiveDays !== statsB.consecutiveDays) {
              return statsA.consecutiveDays - statsB.consecutiveDays;
            }

            // 考虑距离上次值班时间
            if (statsA.lastDutyDate && statsB.lastDutyDate) {
              return statsB.lastDutyDate - statsA.lastDutyDate;
            }

            return 0;
          });

        // 选择值班人员
        for (let i = 0; i < Math.min(requiredCount, availableStaff.length); i++) {
          const staff = availableStaff[i];
          const staffId = staff._id.toString();
          const stats = dutyStats.get(staffId);

          shift.staff.push({
            staffId: staff._id,
            name: staff.name,
            status: 'scheduled'
          });

          // 更新统计
          stats.count++;
          stats.lastDutyDate = daySchedule.date;
          stats.consecutiveDays++;
        }
      }
    }
  }

  /**
   * 优先级制排班
   * 根据人员优先级排班
   */
  async generatePrioritySchedule(schedule, staffList) {
    const { shifts, schedules } = schedule;

    // 按优先级排序
    const sortedStaff = [...staffList].sort((a, b) => b.priority - a.priority);

    for (const daySchedule of schedules) {
      for (const shift of daySchedule.shifts) {
        const shiftConfig = shifts.find(s => s.name === shift.shiftName);
        const requiredCount = shiftConfig?.requiredStaffCount || 1;

        let assignedCount = 0;
        // 按优先级选择值班人员
        for (const staff of sortedStaff) {
          if (assignedCount >= requiredCount) break;

          if (this.isStaffAvailable(staff, daySchedule.date, shift.shiftName)) {
            shift.staff.push({
              staffId: staff._id,
              name: staff.name,
              status: 'scheduled'
            });
            assignedCount++;
          }
        }
      }
    }
  }

  /**
   * 自定义排班
   * 根据偏好设置排班
   */
  async generateCustomSchedule(schedule, staffList) {
    const { shifts, schedules } = schedule;

    for (const daySchedule of schedules) {
      const dayOfWeek = daySchedule.date.getDay();

      for (const shift of daySchedule.shifts) {
        const shiftConfig = shifts.find(s => s.name === shift.shiftName);
        const requiredCount = shiftConfig?.requiredStaffCount || 1;

        // 根据偏好评分排序
        const scoredStaff = staffList
          .filter(staff => this.isStaffAvailable(staff, daySchedule.date, shift.shiftName))
          .map(staff => ({
            staff,
            score: this.calculatePreferenceScore(staff, dayOfWeek, shift.shiftName, daySchedule.date)
          }))
          .sort((a, b) => b.score - a.score);

        // 选择最高分的人员
        for (let i = 0; i < Math.min(requiredCount, scoredStaff.length); i++) {
          shift.staff.push({
            staffId: scoredStaff[i].staff._id,
            name: scoredStaff[i].staff.name,
            status: 'scheduled'
          });
        }
      }
    }
  }

  /**
   * 计算偏好评分
   */
  calculatePreferenceScore(staff, dayOfWeek, shiftName, date) {
    let score = 100; // 基础分

    const { preferences } = staff;

    // 偏好日期加分
    if (preferences.preferredDays.includes(dayOfWeek)) {
      score += 50;
    }
    // 避免日期减分
    if (preferences.avoidedDays.includes(dayOfWeek)) {
      score -= 50;
    }

    // 偏好班次加分
    if (preferences.preferredShifts.includes(shiftName)) {
      score += 30;
    }
    // 避免班次减分
    if (preferences.avoidedShifts.includes(shiftName)) {
      score -= 30;
    }

    // 检查自定义约束
    const customConstraint = preferences.customConstraints.find(
      c => new Date(c.date).toDateString() === date.toDateString()
    );

    if (customConstraint) {
      switch (customConstraint.type) {
        case 'preferred':
          score += 80;
          break;
        case 'avoid':
          score -= 80;
          break;
        case 'unavailable':
          score = -1000; // 不可用
          break;
      }
    }

    // 优先级加分
    score += staff.priority * 10;

    return score;
  }

  /**
   * 检查人员是否可用
   */
  isStaffAvailable(staff, date, shiftName) {
    // 检查是否在不可用日期
    const unavailable = staff.preferences.customConstraints.some(
      c => new Date(c.date).toDateString() === date.toDateString() &&
           c.type === 'unavailable'
    );

    if (unavailable) return false;

    // 检查是否已达到月度上限
    if (staff.statistics.thisMonthDutyCount >= staff.maxDutyPerMonth) {
      return false;
    }

    return true;
  }

  /**
   * 排班后处理
   */
  async postProcessSchedule(schedule, staffList) {
    // 更新人员统计
    await this.updateStaffStatistics(schedule, staffList);

    // 检测并解决冲突
    await this.detectAndResolveConflicts(schedule);

    // 优化排班
    await this.optimizeSchedule(schedule);
  }

  /**
   * 更新人员统计
   */
  async updateStaffStatistics(schedule, staffList) {
    const staffMap = new Map();
    staffList.forEach(staff => {
      staffMap.set(staff._id.toString(), {
        thisMonthCount: 0,
        lastDutyDate: staff.statistics.lastDutyDate
      });
    });

    // 统计值班次数
    for (const daySchedule of schedule.schedules) {
      for (const shift of daySchedule.shifts) {
        for (const assignment of shift.staff) {
          const staffId = assignment.staffId.toString();
          const stats = staffMap.get(staffId);
          if (stats) {
            stats.thisMonthCount++;
            if (!stats.lastDutyDate || daySchedule.date > stats.lastDutyDate) {
              stats.lastDutyDate = daySchedule.date;
            }
          }
        }
      }
    }

    // 更新数据库
    for (const [staffId, stats] of staffMap) {
      await DutyStaff.findByIdAndUpdate(staffId, {
        'statistics.thisMonthDutyCount': stats.thisMonthCount,
        'statistics.lastDutyDate': stats.lastDutyDate
      });
    }
  }

  /**
   * 检测并解决冲突
   */
  async detectAndResolveConflicts(schedule) {
    const conflicts = [];
    const { parameters } = schedule;

    // 检测连续值班冲突
    let consecutiveDays = {};
    schedule.schedules.forEach(daySchedule => {
      daySchedule.shifts.forEach(shift => {
        shift.staff.forEach(assignment => {
          const staffId = assignment.staffId.toString();
          if (!consecutiveDays[staffId]) {
            consecutiveDays[staffId] = 0;
          }
          consecutiveDays[staffId]++;

          if (consecutiveDays[staffId] > parameters.consecutiveDaysLimit) {
            conflicts.push({
              type: 'consecutive_days',
              date: daySchedule.date,
              staffId: assignment.staffId,
              days: consecutiveDays[staffId]
            });
          }
        });
      });
    });

    // 解决冲突
    if (conflicts.length > 0) {
      await this.resolveConflicts(schedule, conflicts);
    }
  }

  /**
   * 解决排班冲突
   */
  async resolveConflicts(schedule, conflicts) {
    // 这里可以实现冲突解决算法
    // 例如：替换值班人员、调整排班顺序等
    logger.info('检测到排班冲突', { conflictCount: conflicts.length });

    // 简单实现：标记冲突并记录
    schedule.optimizationHistory.push({
      timestamp: new Date(),
      algorithm: 'conflict_resolution',
      metrics: {
        fairnessScore: 0.8,
        satisfactionScore: 0.7,
        coverageScore: 0.9
      },
      changes: conflicts.map(conflict => ({
        date: conflict.date,
        shift: 'conflict',
        reason: conflict.type,
        originalStaff: [conflict.staffId]
      }))
    });
  }

  /**
   * 优化排班
   */
  async optimizeSchedule(schedule) {
    const metrics = this.calculateScheduleMetrics(schedule);

    // 如果公平性得分过低，进行优化
    if (metrics.fairnessScore < 0.8) {
      await this.improveFairness(schedule);
    }

    // 如果满意度得分过低，进行优化
    if (metrics.satisfactionScore < 0.7) {
      await this.improveSatisfaction(schedule);
    }

    logger.info('排班优化完成', metrics);
  }

  /**
   * 计算排班指标
   */
  calculateScheduleMetrics(schedule) {
    const staffDutyCount = new Map();

    // 统计每人值班次数
    schedule.schedules.forEach(daySchedule => {
      daySchedule.shifts.forEach(shift => {
        shift.staff.forEach(assignment => {
          const staffId = assignment.staffId.toString();
          staffDutyCount.set(staffId, (staffDutyCount.get(staffId) || 0) + 1);
        });
      });
    });

    const counts = Array.from(staffDutyCount.values());
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;

    // 公平性得分（1 - 变异系数）
    const variance = counts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / counts.length;
    const cv = Math.sqrt(variance) / avg;
    const fairnessScore = Math.max(0, 1 - cv);

    return {
      fairnessScore,
      satisfactionScore: 0.8, // 需要根据实际偏好计算
      coverageScore: 1, // 假设完全覆盖
      totalAssignments: counts.reduce((a, b) => a + b, 0),
      maxAssignments: max,
      minAssignments: min,
      avgAssignments: avg
    };
  }

  /**
   * 改善公平性
   */
  async improveFairness(schedule) {
    // 实现公平性改善算法
    // 例如：重新分配值班任务，使分配更均衡
    logger.info('执行公平性优化');
  }

  /**
   * 改善满意度
   */
  async improveSatisfaction(schedule) {
    // 实现满意度改善算法
    // 例如：根据人员偏好调整排班
    logger.info('执行满意度优化');
  }

  /**
   * 发布值班表
   * @param {String} scheduleId - 值班表ID
   * @param {String} userId - 操作用户ID
   */
  async publishSchedule(scheduleId, userId) {
    try {
      const schedule = await DutySchedule.findById(scheduleId);

      if (!schedule) {
        throw new Error('值班表不存在');
      }

      if (schedule.status !== 'draft') {
        throw new Error('只能发布草稿状态的值班表');
      }

      // 更新状态
      schedule.status = 'published';
      schedule.publishedAt = new Date();
      await schedule.save();

      // 清除相关缓存
      cache.del(`schedule:${schedule.villageId}:${schedule.year}:${schedule.month}`);

      // 记录审计日志
      await AuditLog.log({
        userId,
        action: 'PUBLISH_DUTY_SCHEDULE',
        resource: scheduleId,
        details: {
          villageId: schedule.villageId,
          year: schedule.year,
          month: schedule.month
        }
      });

      logger.info('值班表发布成功', { scheduleId });
      return schedule;

    } catch (error) {
      logger.error('发布值班表失败', error);
      throw error;
    }
  }

  /**
   * 获取月度值班表
   * @param {String} villageId - 村庄ID
   * @param {Number} year - 年份
   * @param {Number} month - 月份
   */
  async getMonthlySchedule(villageId, year, month) {
    try {
      // 尝试从缓存获取
      const cacheKey = `schedule:${villageId}:${year}:${month}`;
      let schedule = cache.get(cacheKey);

      if (!schedule) {
        schedule = await DutySchedule.findOne({
          villageId,
          year,
          month,
          status: { $in: ['published', 'active'] }
        }).populate('schedules.shifts.staff.staffId');

        // 缓存结果
        if (schedule) {
          cache.set(cacheKey, schedule, 3600); // 缓存1小时
        }
      }

      return schedule;

    } catch (error) {
      logger.error('获取月度值班表失败', error);
      throw error;
    }
  }

  /**
   * 生成值班统计报表
   * @param {Object} params - 查询参数
   */
  async generateDutyReport(params) {
    try {
      const { villageId, startDate, endDate, staffId } = params;

      const schedule = await DutySchedule.find({
        villageId,
        'schedules.date': {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      });

      const report = {
        summary: {
          totalDays: 0,
          totalShifts: 0,
          totalAssignments: 0
        },
        staffStatistics: [],
        shiftDistribution: {},
        dateStatistics: []
      };

      // 统计分析
      schedule.forEach(s => {
        s.schedules.forEach(daySchedule => {
          if (daySchedule.date >= new Date(startDate) &&
              daySchedule.date <= new Date(endDate)) {
            report.summary.totalDays++;

            daySchedule.shifts.forEach(shift => {
              report.summary.totalShifts++;
              report.summary.totalAssignments += shift.staff.length;

              // 班次分布统计
              if (!report.shiftDistribution[shift.shiftName]) {
                report.shiftDistribution[shift.shiftName] = 0;
              }
              report.shiftDistribution[shift.shiftName] += shift.staff.length;
            });
          }
        });
      });

      // TODO: 添加更详细的统计分析

      return report;

    } catch (error) {
      logger.error('生成值班报表失败', error);
      throw error;
    }
  }

  /**
   * 获取排班建议
   * @param {String} villageId - 村庄ID
   * @param {Object} requirements - 排班需求
   */
  async getScheduleSuggestion(villageId, requirements) {
    try {
      const staffList = await DutyStaff.find({
        villageId,
        isActive: true
      });

      const suggestions = [];

      // 分析当前排班问题
      const issues = await this.analyzeScheduleIssues(villageId);

      // 生成优化建议
      if (issues.fairnessIssue) {
        suggestions.push({
          type: 'fairness',
          title: '排班不均衡',
          description: '部分人员值班次数过多，建议调整排班算法',
          solution: '使用均衡制排班算法，确保公平分配'
        });
      }

      if (issues.coverageIssue) {
        suggestions.push({
          type: 'coverage',
          title: '值班覆盖率不足',
          description: '某些班次人员配置不足',
          solution: '增加值班人员或调整班次设置'
        });
      }

      if (issues.preferenceIssue) {
        suggestions.push({
          type: 'preference',
          title: '人员偏好匹配度低',
          description: '排班未充分考虑人员偏好',
          solution: '使用自定义排班算法，提高满意度'
        });
      }

      return suggestions;

    } catch (error) {
      logger.error('获取排班建议失败', error);
      throw error;
    }
  }

  /**
   * 分析排班问题
   */
  async analyzeScheduleIssues(villageId) {
    // 分析当前排班存在的问题
    return {
      fairnessIssue: false,
      coverageIssue: false,
      preferenceIssue: false
    };
  }
}

module.exports = new DutyScheduleService();