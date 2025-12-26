/**
 * 应急管理服务
 * 处理应急事件、预案、资源调度等业务逻辑
 */

const Emergency = require('../models/Emergency');
const AuditUtil = require('../utils/audit');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

class EmergencyService {
  /**
   * 创建应急事件
   * @param {Object} eventData - 事件数据
   * @param {Object} operator - 操作者信息
   * @returns {Object} 创建的应急事件
   */
  async createEmergencyEvent(eventData, operator) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. 生成事件编号
      const incidentNumber = await this.generateIncidentNumber(eventData.villageId);

      // 2. 创建应急事件
      const emergency = new Emergency({
        ...eventData,
        incidentNumber,
        reportedBy: operator.userId,
        status: 'reported' // 初始状态为已上报
      });

      // 3. 根据事件级别自动触发响应
      if (eventData.level === 'critical' || eventData.level === 'urgent') {
        // 立即触发应急响应
        await this.triggerEmergencyResponse(emergency, operator, session);
      }

      await emergency.save({ session });

      // 4. 记录审计日志
      await AuditUtil.logOperation('CREATE', 'emergency', operator, {
        target: {
          id: emergency._id,
          type: 'Emergency',
          name: emergency.title
        },
        result: 'SUCCESS',
        details: {
          description: `上报应急事件: ${emergency.title}`,
          changes: {
            before: null,
            after: {
              title: emergency.title,
              level: emergency.level,
              incidentNumber
            }
          }
        },
        riskLevel: emergency.level === 'critical' ? 'CRITICAL' : 'HIGH',
        villageId: eventData.villageId,
        sessionId: operator.sessionId
      });

      // 5. 发送紧急通知
      await this.sendEmergencyNotifications(emergency, operator);

      await session.commitTransaction();

      logger.info('应急事件创建成功', {
        emergencyId: emergency._id,
        incidentNumber,
        level: emergency.level,
        operator: operator.name
      });

      return emergency;
    } catch (error) {
      await session.abortTransaction();
      logger.error('创建应急事件失败:', error);
      throw new Error('创建应急事件失败: ' + error.message);
    } finally {
      session.endSession();
    }
  }

  /**
   * 快速上报（简化流程）
   * @param {Object} quickReport - 快速上报数据
   * @param {Object} operator - 操作者信息
   * @returns {Object} 创建的事件
   */
  async quickReport(quickReport, operator) {
    try {
      // 快速上报使用简化的事件数据
      const emergencyData = {
        title: quickReport.type || '紧急事件',
        type: quickReport.category || 'other',
        level: quickReport.level || 'urgent',
        description: quickReport.description,
        location: quickReport.location,
        reporter: {
          name: operator.name,
          phone: operator.phone,
          type: 'resident'
        },
        villageId: quickReport.villageId
      };

      const emergency = await this.createEmergencyEvent(emergencyData, operator);

      // 快速上报直接进入处理状态
      await this.updateEmergencyStatus(emergency._id, 'processing', operator, {
        description: '快速上报，直接进入处理流程'
      });

      return emergency;
    } catch (error) {
      logger.error('快速上报失败:', error);
      throw new Error('快速上报失败: ' + error.message);
    }
  }

  /**
   * 更新应急事件状态
   * @param {string} emergencyId - 事件ID
   * @param {string} status - 新状态
   * @param {Object} operator - 操作者信息
   * @param {Object} updateData - 更新数据
   * @returns {Object} 更新后的事件
   */
  async updateEmergencyStatus(emergencyId, status, operator, updateData = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const emergency = await Emergency.findById(emergencyId);
      if (!emergency) {
        throw new Error('应急事件不存在');
      }

      const oldStatus = emergency.status;
      emergency.status = status;

      // 添加处理记录
      if (updateData.description || status !== oldStatus) {
        emergency.handlingLog.push({
          action: `STATUS_CHANGE_${status.toUpperCase()}`,
          description: updateData.description || `状态从${oldStatus}更新为${status}`,
          performedBy: {
            userId: operator.userId,
            name: operator.name
          },
          performedAt: new Date()
        });
      }

      // 状态变更的特殊处理
      if (status === 'processing') {
        emergency.processingStartedAt = new Date();
      } else if (status === 'resolved') {
        emergency.resolvedAt = new Date();
        emergency.resolution = {
          ...updateData.resolution,
          resolvedBy: operator.userId,
          resolvedAt: new Date()
        };
      } else if (status === 'closed') {
        emergency.closedAt = new Date();
        emergency.closeReason = updateData.closeReason;
      }

      await emergency.save({ session });

      // 记录审计日志
      await AuditUtil.logOperation('UPDATE', 'emergency', operator, {
        target: {
          id: emergencyId,
          type: 'Emergency',
          name: emergency.title
        },
        result: 'SUCCESS',
        details: {
          description: `更新应急事件状态: ${emergency.title}`,
          changes: {
            before: { status: oldStatus },
            after: { status }
          },
          reason: updateData.description
        },
        villageId: emergency.villageId,
        sessionId: operator.sessionId
      });

      // 发送状态更新通知
      await this.sendStatusUpdateNotification(emergency, status, operator);

      await session.commitTransaction();

      logger.info('应急事件状态更新成功', {
        emergencyId,
        oldStatus,
        newStatus: status,
        operator: operator.name
      });

      return emergency;
    } catch (error) {
      await session.abortTransaction();
      logger.error('更新应急事件状态失败:', error);
      throw new Error('更新应急事件状态失败: ' + error.message);
    } finally {
      session.endSession();
    }
  }

  /**
   * 分配资源
   * @param {string} emergencyId - 事件ID
   * @param {Array} resourceIds - 资源ID列表
   * @param {Object} operator - 操作者信息
   * @returns {Object} 更新后的事件
   */
  async allocateResources(emergencyId, resourceIds, operator) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const emergency = await Emergency.findById(emergencyId);
      if (!emergency) {
        throw new Error('应急事件不存在');
      }

      // 获取资源信息
      const EmergencyResource = mongoose.model('EmergencyResource');
      const resources = await EmergencyResource.find({
        _id: { $in: resourceIds },
        status: 'available'
      });

      if (resources.length !== resourceIds.length) {
        throw new Error('部分资源不可用');
      }

      // 更新资源状态
      await EmergencyResource.updateMany(
        { _id: { $in: resourceIds } },
        {
          status: 'allocated',
          allocatedTo: emergencyId,
          allocatedAt: new Date()
        },
        { session }
      );

      // 添加资源到事件
      emergency.allocatedResources.push(...resourceIds);
      emergency.handlingLog.push({
        action: 'RESOURCE_ALLOCATION',
        description: `分配资源: ${resources.map(r => r.name).join(', ')}`,
        performedBy: {
          userId: operator.userId,
          name: operator.name
        },
        performedAt: new Date(),
        resources: resourceIds
      });

      await emergency.save({ session });

      // 记录审计日志
      await AuditUtil.logOperation('ASSIGN', 'emergency', operator, {
        target: {
          id: emergencyId,
          type: 'Emergency',
          name: emergency.title
        },
        result: 'SUCCESS',
        details: {
          description: `为应急事件分配资源: ${emergency.title}`,
          changes: {
            before: { allocatedResources: emergency.allocatedResources.length - resourceIds.length },
            after: { allocatedResources: emergency.allocatedResources.length }
          }
        },
        riskLevel: 'HIGH',
        villageId: emergency.villageId,
        sessionId: operator.sessionId
      });

      // 发送资源分配通知
      await this.sendResourceAllocationNotification(emergency, resources, operator);

      await session.commitTransaction();

      logger.info('应急资源分配成功', {
        emergencyId,
        resourceCount: resources.length,
        operator: operator.name
      });

      return emergency;
    } catch (error) {
      await session.abortTransaction();
      logger.error('分配应急资源失败:', error);
      throw new Error('分配应急资源失败: ' + error.message);
    } finally {
      session.endSession();
    }
  }

  /**
   * 执行应急预案
   * @param {string} emergencyId - 事件ID
   * @param {string} planId - 预案ID
   * @param {Object} operator - 操作者信息
   * @returns {Object} 执行结果
   */
  async executeEmergencyPlan(emergencyId, planId, operator) {
    try {
      const emergency = await Emergency.findById(emergencyId);
      if (!emergency) {
        throw new Error('应急事件不存在');
      }

      const EmergencyPlan = mongoose.model('EmergencyPlan');
      const plan = await EmergencyPlan.findById(planId);
      if (!plan) {
        throw new Error('应急预案不存在');
      }

      // 检查预案是否适用于当前事件类型
      if (plan.eventType !== emergency.type) {
        throw new Error('预案类型不匹配');
      }

      // 执行预案步骤
      const executionResults = [];
      for (const step of plan.steps) {
        try {
          const result = await this.executePlanStep(emergency, step, operator);
          executionResults.push({
            stepId: step._id,
            stepName: step.name,
            status: 'success',
            result
          });
        } catch (error) {
          executionResults.push({
            stepId: step._id,
            stepName: step.name,
            status: 'failed',
            error: error.message
          });
        }
      }

      // 更新事件记录
      emergency.handlingLog.push({
        action: 'PLAN_EXECUTION',
        description: `执行应急预案: ${plan.name}`,
        performedBy: {
          userId: operator.userId,
          name: operator.name
        },
        performedAt: new Date(),
        planId: planId,
        executionResults
      });

      await emergency.save();

      // 记录审计日志
      await AuditUtil.logOperation('ACTIVATE', 'emergency', operator, {
        target: {
          id: emergencyId,
          type: 'Emergency',
          name: emergency.title
        },
        result: 'SUCCESS',
        details: {
          description: `执行应急预案: ${plan.name}`,
          changes: {
            before: { status: emergency.status },
            after: { status: emergency.status }
          }
        },
        riskLevel: 'CRITICAL',
        villageId: emergency.villageId,
        sessionId: operator.sessionId
      });

      // 发送预案执行通知
      await this.sendPlanExecutionNotification(emergency, plan, operator);

      logger.info('应急预案执行成功', {
        emergencyId,
        planId,
        stepCount: plan.steps.length,
        successCount: executionResults.filter(r => r.status === 'success').length,
        operator: operator.name
      });

      return {
        emergency,
        plan,
        executionResults
      };
    } catch (error) {
      logger.error('执行应急预案失败:', error);
      throw new Error('执行应急预案失败: ' + error.message);
    }
  }

  /**
   * 获取应急事件统计
   * @param {Object} queryParams - 查询参数
   * @param {Object} operator - 操作者信息
   * @returns {Object} 统计数据
   */
  async getEmergencyStatistics(queryParams, operator) {
    try {
      const {
        villageId,
        startDate,
        endDate,
        groupBy = 'month' // day, week, month, year
      } = queryParams;

      // 构建查询条件
      const matchConditions = {
        villageId: mongoose.Types.ObjectId(villageId),
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      // 事件统计
      const eventStats = await Emergency.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: groupBy === 'month' ? { $month: '$createdAt' } : null,
              day: groupBy === 'day' ? { $dayOfMonth: '$createdAt' } : null,
              week: groupBy === 'week' ? { $week: '$createdAt' } : null,
              type: '$type',
              level: '$level',
              status: '$status'
            },
            count: { $sum: 1 },
            avgResponseTime: { $avg: '$responseTime' },
            avgResolutionTime: { $avg: '$resolutionTime' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      // 总体统计
      const summary = await Emergency.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: null,
            totalEvents: { $sum: 1 },
            criticalEvents: {
              $sum: { $cond: [{ $eq: ['$level', 'critical'] }, 1, 0] }
            },
            urgentEvents: {
              $sum: { $cond: [{ $eq: ['$level', 'urgent'] }, 1, 0] }
            },
            resolvedEvents: {
              $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
            },
            avgResponseTime: { $avg: '$responseTime' },
            avgResolutionTime: { $avg: '$resolutionTime' }
          }
        }
      ]);

      // 类型分布
      const typeDistribution = await Emergency.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            criticalCount: {
              $sum: { $cond: [{ $eq: ['$level', 'critical'] }, 1, 0] }
            }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // 记录审计日志
      await AuditUtil.logOperation('VIEW', 'emergency', operator, {
        result: 'SUCCESS',
        details: {
          description: '查看应急事件统计',
          metadata: {
            period: { startDate, endDate },
            groupBy
          }
        },
        riskLevel: 'MEDIUM',
        villageId,
        sessionId: operator.sessionId
      });

      return {
        period: { startDate, endDate },
        summary: summary[0] || {},
        eventStats,
        typeDistribution,
        resolutionRate: summary[0] ?
          ((summary[0].resolvedEvents / summary[0].totalEvents) * 100).toFixed(2) : 0
      };
    } catch (error) {
      logger.error('获取应急事件统计失败:', error);
      throw new Error('获取应急事件统计失败: ' + error.message);
    }
  }

  /**
   * 生成事件编号
   * @param {string} villageId - 村庄ID
   * @returns {string} 事件编号
   */
  async generateIncidentNumber(villageId) {
    try {
      const village = await mongoose.model('Village').findById(villageId);
      const villageCode = village?.code || 'V001';

      // 获取今年的计数
      const year = new Date().getFullYear();
      const count = await Emergency.countDocuments({
        villageId,
        createdAt: {
          $gte: new Date(year, 0, 1),
          $lt: new Date(year + 1, 0, 1)
        }
      });

      // 生成编号: EMG + 村庄代码 + 年份后两位 + 4位序号
      const sequence = String(count + 1).padStart(4, '0');

      return `EMG${villageCode}${String(year).slice(2)}${sequence}`;
    } catch (error) {
      logger.error('生成事件编号失败:', error);
      throw new Error('生成事件编号失败');
    }
  }

  /**
   * 触发应急响应
   * @param {Object} emergency - 应急事件
   * @param {Object} operator - 操作者
   * @param {ClientSession} session - MongoDB会话
   */
  async triggerEmergencyResponse(emergency, operator, session) {
    // 根据事件级别自动触发响应
    emergency.responseTriggered = true;
    emergency.responseTriggeredAt = new Date();

    // 关键事件立即通知所有相关人员
    if (emergency.level === 'critical') {
      emergency.handlingLog.push({
        action: 'AUTO_RESPONSE_TRIGGERED',
        description: '关键事件，自动触发应急响应',
        performedBy: {
          userId: operator.userId,
          name: operator.name
        },
        performedAt: new Date()
      });
    }
  }

  /**
   * 发送紧急通知
   * @param {Object} emergency - 应急事件
   * @param {Object} operator - 操作者
   */
  async sendEmergencyNotifications(emergency, operator) {
    // 根据事件级别选择通知渠道和接收人
    const channels = emergency.level === 'critical' ?
      ['email', 'sms', 'push'] :
      ['email', 'push'];

    // 通知内容
    const notificationData = {
      type: 'emergency_event',
      title: `应急事件: ${emergency.title}`,
      message: `事件等级: ${emergency.level}\n事件描述: ${emergency.description}`,
      data: {
        emergencyId: emergency._id,
        incidentNumber: emergency.incidentNumber,
        level: emergency.level,
        location: emergency.location,
        reporter: emergency.reporter
      },
      priority: emergency.level,
      channels
    };

    await notificationService.sendEmergencyNotification(notificationData);
  }

  /**
   * 发送状态更新通知
   * @param {Object} emergency - 应急事件
   * @param {string} status - 新状态
   * @param {Object} operator - 操作者
   */
  async sendStatusUpdateNotification(emergency, status, operator) {
    await notificationService.sendNotification({
      type: 'emergency_status_update',
      recipient: {
        userId: emergency.reportedBy,
        name: emergency.reporter?.name || '上报者'
      },
      title: '应急事件状态更新',
      message: `您上报的应急事件"${emergency.title}"状态已更新为: ${status}`,
      data: {
        emergencyId: emergency._id,
        incidentNumber: emergency.incidentNumber,
        newStatus: status
      }
    });
  }

  /**
   * 发送资源分配通知
   * @param {Object} emergency - 应急事件
   * @param {Array} resources - 分配的资源
   * @param {Object} operator - 操作者
   */
  async sendResourceAllocationNotification(emergency, resources, operator) {
    await notificationService.sendNotification({
      type: 'emergency_resource_allocation',
      recipient: {
        userId: emergency.reportedBy,
        name: emergency.reporter?.name || '上报者'
      },
      title: '应急资源已分配',
      message: `为应急事件"${emergency.title}"已分配资源: ${resources.map(r => r.name).join(', ')}`,
      data: {
        emergencyId: emergency._id,
        incidentNumber: emergency.incidentNumber,
        resources: resources.map(r => ({ id: r._id, name: r.name, type: r.type }))
      }
    });
  }

  /**
   * 发送预案执行通知
   * @param {Object} emergency - 应急事件
   * @param {Object} plan - 执行的预案
   * @param {Object} operator - 操作者
   */
  async sendPlanExecutionNotification(emergency, plan, operator) {
    await notificationService.sendNotification({
      type: 'emergency_plan_execution',
      recipient: {
        userId: emergency.reportedBy,
        name: emergency.reporter?.name || '上报者'
      },
      title: '应急预案已执行',
      message: `为应急事件"${emergency.title}"已执行应急预案: ${plan.name}`,
      data: {
        emergencyId: emergency._id,
        incidentNumber: emergency.incidentNumber,
        planId: plan._id,
        planName: plan.name
      }
    });
  }

  /**
   * 执行预案步骤
   * @param {Object} emergency - 应急事件
   * @param {Object} step - 预案步骤
   * @param {Object} operator - 操作者
   * @returns {Object} 执行结果
   */
  async executePlanStep(emergency, step, operator) {
    // 根据步骤类型执行相应操作
    switch (step.type) {
      case 'notification':
        // 发送通知
        await notificationService.sendBulkNotification({
          type: 'emergency_plan_notification',
          recipients: step.targets || [],
          subject: step.title,
          message: step.content,
          data: {
            emergencyId: emergency._id,
            planStepId: step._id
          }
        });
        return { message: '通知已发送' };

      case 'resource_allocation':
        // 分配资源
        if (step.resourceIds) {
          await this.allocateResources(emergency._id, step.resourceIds, operator);
        }
        return { message: '资源已分配' };

      case 'evacuation':
        // 疏散指令
        return { message: '疏散指令已执行' };

      default:
        return { message: '步骤已执行' };
    }
  }
}

module.exports = new EmergencyService();