/**
 * 应急响应服务
 * 提供一键呼叫、定位救援、应急资源调度等功能
 */

const {
  EmergencyEvent,
  EmergencyResource,
  EmergencyContact,
  EmergencyTypes,
  EmergencyLevels,
  ResponseStatus,
  ResourceTypes
} = require('../models/EmergencyResponse');
const User = require('../models/User');
const NotificationService = require('./notificationService');
const LocationService = require('./locationService');
const logger = require('../config/logger');

class EmergencyResponseService {
  constructor() {
    this.notificationService = new NotificationService();
    this.locationService = new LocationService();

    // 应急响应配置
    this.responseConfig = {
      // 响应时间阈值（分钟）
      responseTimeThresholds: {
        [EmergencyLevels.LEVEL_1]: 5,   // 特别重大：5分钟
        [EmergencyLevels.LEVEL_2]: 10,  // 重大：10分钟
        [EmergencyLevels.LEVEL_3]: 15,  // 较大：15分钟
        [EmergencyLevels.LEVEL_4]: 30   // 一般：30分钟
      },

      // 搜索半径（公里）
      searchRadius: {
        personnel: 10,
        vehicle: 20,
        equipment: 50,
        facility: 100
      }
    };
  }

  /**
   * 一键呼叫应急响应
   * @param {Object} emergencyData - 应急数据
   * @param {Object} locationData - 位置数据
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 响应结果
   */
  async oneClickEmergencyCall(emergencyData, locationData, options = {}) {
    try {
      logger.info(`收到一键紧急呼叫: ${emergencyData.type}`);

      // 1. 验证报警人信息
      const reporter = await this.validateReporter(emergencyData.reporter);

      // 2. 获取精确位置信息
      const preciseLocation = await this.getEmergencyLocation(locationData);

      // 3. 评估应急级别
      const emergencyLevel = this.assessEmergencyLevel(emergencyData);

      // 4. 创建应急事件
      const emergencyEvent = new EmergencyEvent({
        title: this.generateEmergencyTitle(emergencyData),
        description: emergencyData.description,
        type: emergencyData.type,
        level: emergencyLevel,
        villageId: emergencyData.villageId,
        reporter: {
          ...reporter,
          phone: emergencyData.reporter.phone
        },
        victim: emergencyData.victim,
        location: preciseLocation,
        time: {
          reported: new Date(),
          occurred: emergencyData.occurredAt || new Date()
        },
        status: ResponseStatus.PENDING,
        priority: this.calculatePriority(emergencyData, emergencyLevel),
        assessment: {
          initialSeverity: this.assessInitialSeverity(emergencyData),
          riskLevel: this.assessRiskLevel(emergencyData)
        },
        media: emergencyData.media || []
      });

      // 5. 立即保存事件
      await emergencyEvent.save();

      // 6. 启动应急响应流程
      const responseResult = await this.initiateEmergencyResponse(emergencyEvent);

      // 7. 实时跟踪事件状态
      await this.startRealTimeTracking(emergencyEvent._id);

      // 8. 发送紧急通知
      await this.sendEmergencyNotifications(emergencyEvent, responseResult);

      // 9. 记录操作日志
      this.logEmergencyAction('one_click_call', emergencyEvent._id, reporter.userId, {
        type: emergencyData.type,
        level: emergencyLevel,
        location: preciseLocation
      });

      logger.info(`一键呼叫响应启动: ${emergencyEvent._id}`);

      return {
        success: true,
        eventId: emergencyEvent._id,
        eventNumber: `EM${Date.now()}`, // 生成事件编号
        level: emergencyLevel,
        responseTeam: responseResult.dispatchedTeams,
        estimatedArrival: responseResult.estimatedArrival,
        emergencyInstructions: this.getEmergencyInstructions(emergencyData.type),
        safetyGuidelines: this.getSafetyGuidelines(emergencyData.type)
      };

    } catch (error) {
      logger.error('一键应急呼叫失败:', error);
      throw error;
    }
  }

  /**
   * 定位救援 - 基于位置搜索最近的救援资源
   * @param {Object} locationData - 位置数据
   * @param {string} emergencyType - 应急类型
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 定位结果
   */
  async locateEmergencyResources(locationData, emergencyType, options = {}) {
    try {
      logger.info(`定位应急资源: ${emergencyType}`);

      // 1. 解析位置信息
      const location = await this.parseLocationData(locationData);

      // 2. 根据应急类型确定所需资源
      const requiredResources = this.getRequiredResources(emergencyType);

      // 3. 搜索最近的资源
      const resources = await this.searchNearbyResources(location, requiredResources, options);

      // 4. 搜索可用人员
      const personnel = await this.searchAvailablePersonnel(location, emergencyType);

      // 5. 搜索应急联系人和机构
      const contacts = await this.searchEmergencyContacts(location, emergencyType);

      // 6. 计算最优调度方案
      const dispatchPlan = await this.calculateOptimalDispatch(location, resources, personnel);

      // 7. 生成救援路线
      const rescueRoutes = await this.generateRescueRoutes(location, dispatchPlan);

      return {
        success: true,
        location: location,
        availableResources: resources,
        availablePersonnel: personnel,
        emergencyContacts: contacts,
        dispatchPlan: dispatchPlan,
        rescueRoutes: rescueRoutes,
        estimatedResponseTime: this.calculateEstimatedResponseTime(dispatchPlan)
      };

    } catch (error) {
      logger.error('定位应急资源失败:', error);
      throw error;
    }
  }

  /**
   * 更新应急事件状态
   * @param {string} eventId - 事件ID
   * @param {string} newStatus - 新状态
   * @param {Object} updateData - 更新数据
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 更新结果
   */
  async updateEmergencyStatus(eventId, newStatus, updateData = {}, options = {}) {
    try {
      logger.info(`更新应急事件状态: ${eventId} -> ${newStatus}`);

      // 1. 查找应急事件
      const event = await EmergencyEvent.findById(eventId);
      if (!event) {
        throw new Error('应急事件不存在');
      }

      const oldStatus = event.status;

      // 2. 验证状态转换
      if (!this.isValidStatusTransition(oldStatus, newStatus)) {
        throw new Error(`无效的状态转换: ${oldStatus} -> ${newStatus}`);
      }

      // 3. 更新状态
      event.status = newStatus;

      // 4. 根据状态更新其他字段
      const now = new Date();

      switch (newStatus) {
        case ResponseStatus.DISPATCHED:
          event.time.firstResponse = now;
          break;
        case ResponseStatus.RESOLVED:
          event.time.resolved = now;
          event.resolution = {
            ...event.resolution,
            ...updateData.resolution,
            summary: updateData.summary || '应急事件已解决'
          };
          break;
      }

      // 5. 添加工作流步骤
      const workflowStep = {
        step: event.workflow.length + 1,
        action: this.getStatusActionName(newStatus),
        description: updateData.description || `状态更新为 ${newStatus}`,
        operator: updateData.operator || event.reporter,
        timestamp: now,
        status: 'completed',
        notes: updateData.notes
      };

      event.workflow.push(workflowStep);

      // 6. 更新统计信息
      if (oldStatus !== ResponseStatus.PENDING && newStatus === ResponseStatus.RESOLVED) {
        event.statistics.resolutionTime = event.resolutionTime;
      }

      // 7. 保存事件
      await event.save();

      // 8. 发送状态更新通知
      await this.sendStatusUpdateNotification(event, oldStatus, newStatus);

      // 9. 记录操作日志
      this.logEmergencyAction('update_status', eventId, updateData.operator?.userId, {
        oldStatus,
        newStatus,
        description: updateData.description
      });

      logger.info(`应急事件状态更新成功: ${eventId}`);

      return {
        success: true,
        event: event,
        oldStatus: oldStatus,
        newStatus: newStatus,
        message: '状态更新成功'
      };

    } catch (error) {
      logger.error('更新应急事件状态失败:', error);
      throw error;
    }
  }

  /**
   * 添加应急事件更新
   * @param {string} eventId - 事件ID
   * @param {Object} updateData - 更新数据
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 更新结果
   */
  async addEmergencyUpdate(eventId, updateData, options = {}) {
    try {
      logger.info(`添加应急事件更新: ${eventId}`);

      // 1. 查找事件
      const event = await EmergencyEvent.findById(eventId);
      if (!event) {
        throw new Error('应急事件不存在');
      }

      // 2. 创建更新记录
      const update = {
        step: event.workflow.length + 1,
        action: updateData.action || 'update',
        description: updateData.description,
        operator: updateData.operator || event.reporter,
        timestamp: new Date(),
        status: updateData.status || 'in_progress',
        notes: updateData.notes,
        attachments: updateData.attachments || []
      };

      // 3. 计算处理时长
      if (event.workflow.length > 0) {
        const lastUpdate = event.workflow[event.workflow.length - 1];
        update.duration = Math.floor((update.timestamp - lastUpdate.timestamp) / (1000 * 60));
      }

      // 4. 添加更新到事件
      event.workflow.push(update);

      // 5. 更新进度
      if (updateData.progress !== undefined) {
        event.progress = Math.min(100, Math.max(0, updateData.progress));
      }

      // 6. 添加媒体文件
      if (updateData.media && updateData.media.length > 0) {
        event.media.push(...updateData.media);
      }

      // 7. 保存事件
      await event.save();

      // 8. 发送更新通知
      await this.sendUpdateNotification(event, update);

      // 9. 记录操作日志
      this.logEmergencyAction('add_update', eventId, updateData.operator?.userId, {
        action: update.action,
        description: update.description
      });

      logger.info(`应急事件更新添加成功: ${eventId}`);

      return {
        success: true,
        update: event.workflow[event.workflow.length - 1],
        event: event,
        message: '更新添加成功'
      };

    } catch (error) {
      logger.error('添加应急事件更新失败:', error);
      throw error;
    }
  }

  /**
   * 获取实时应急事件
   * @param {Object} filters - 过滤条件
   * @param {Object} pagination - 分页参数
   * @returns {Promise<Object>} 事件列表
   */
  async getActiveEmergencies(filters = {}, pagination = {}) {
    try {
      const query = {
        status: { $in: [ResponseStatus.PENDING, ResponseStatus.IN_PROGRESS, ResponseStatus.DISPATCHED] },
        ...filters
      };

      const page = pagination.page || 1;
      const limit = pagination.limit || 20;
      const skip = (page - 1) * limit;

      const events = await EmergencyEvent.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reporter.userId', 'userName phone')
        .populate('responders.teamMembers.userId', 'userName phone')
        .lean();

      const total = await EmergencyEvent.countDocuments(query);

      // 添加实时状态信息
      for (const event of events) {
        event.responseTime = event.responseTime;
        event.resolutionTime = event.resolutionTime;
        event.overdue = this.isEmergencyOverdue(event);
        event.activeResponders = event.responders.filter(r =>
          ['dispatched', 'en_route', 'arrived', 'active'].includes(r.status)
        ).length;
      }

      return {
        success: true,
        events: events,
        pagination: {
          page: page,
          limit: limit,
          total: total,
          totalPages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('获取活跃应急事件失败:', error);
      throw error;
    }
  }

  /**
   * 获取应急统计信息
   * @param {string} villageId - 村庄ID
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Object>} 统计信息
   */
  async getEmergencyStatistics(villageId, filters = {}) {
    try {
      const matchConditions = {
        villageId: villageId,
        ...filters
      };

      // 按类型统计
      const typeStats = await EmergencyEvent.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            avgResponseTime: { $avg: '$statistics.responseTime' },
            avgResolutionTime: { $avg: '$statistics.resolutionTime' }
          }
        }
      ]);

      // 按级别统计
      const levelStats = await EmergencyEvent.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: '$level',
            count: { $sum: 1 },
            totalCost: { $sum: '$statistics.totalCost' },
            avgResolutionTime: { $avg: '$statistics.resolutionTime' }
          }
        }
      ]);

      // 按月份统计
      const monthlyStats = await EmergencyEvent.aggregate([
        { $match: { ...matchConditions, createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { $month: '$createdAt' },
            count: { $sum: 1 },
            avgResponseTime: { $avg: '$statistics.responseTime' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // 资源统计
      const resourceStats = await EmergencyResource.aggregate([
        { $match: { villageId: villageId } },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$availability.totalQuantity' },
            available: { $sum: '$availability.availableQuantity' },
            inUse: { $sum: { $cond: [{ $eq: ['$status', 'in_use'] }, '$availability.totalQuantity', 0] } }
          }
        }
      ]);

      // 响应时间统计
      const responseTimeStats = await EmergencyEvent.aggregate([
        { $match: { ...matchConditions, 'statistics.responseTime': { $exists: true } } },
        {
          $group: {
            _id: null,
            avgResponseTime: { $avg: '$statistics.responseTime' },
            minResponseTime: { $min: '$statistics.responseTime' },
            maxResponseTime: { $max: '$statistics.responseTime' },
            withinThreshold: {
              $sum: {
                $cond: [
                  {
                    $lte: [
                      '$statistics.responseTime',
                      15 // 15分钟阈值
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      const statistics = {
        totalEvents: typeStats.reduce((sum, stat) => sum + stat.count, 0),
        activeEvents: await EmergencyEvent.countDocuments({
          ...matchConditions,
          status: { $in: [ResponseStatus.PENDING, ResponseStatus.IN_PROGRESS] }
        }),
        typeBreakdown: typeStats,
        levelBreakdown: levelStats,
        monthlyTrend: monthlyStats,
        resourceStatus: resourceStats,
        responsePerformance: responseTimeStats[0] || {
          avgResponseTime: 0,
          withinThreshold: 0,
          successRate: 0
        }
      };

      return {
        success: true,
        statistics: statistics,
        generatedAt: new Date()
      };

    } catch (error) {
      logger.error('获取应急统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 启动应急响应流程
   * @param {Object} event - 应急事件
   * @returns {Promise<Object>} 响应结果
   */
  async initiateEmergencyResponse(event) {
    try {
      // 1. 根据事件类型和级别确定响应方案
      const responsePlan = this.determineResponsePlan(event.type, event.level);

      // 2. 搜索和调度应急资源
      const dispatchedTeams = await this.dispatchEmergencyTeams(event, responsePlan);

      // 3. 分配应急资源
      const allocatedResources = await this.allocateEmergencyResources(event, responsePlan);

      // 4. 通知相关人员
      await this.notifyEmergencyResponders(event, dispatchedTeams);

      // 5. 更新事件状态为已调度
      event.status = ResponseStatus.DISPATCHED;
      event.responders = dispatchedTeams;
      event.resources = allocatedResources;
      event.time.firstResponse = new Date();

      await event.save();

      return {
        dispatchedTeams: dispatchedTeams,
        allocatedResources: allocatedResources,
        estimatedArrival: this.calculateEstimatedArrival(dispatchedTeams),
        responsePlan: responsePlan
      };

    } catch (error) {
      logger.error('启动应急响应流程失败:', error);
      throw error;
    }
  }

  /**
   * 调度应急队伍
   * @param {Object} event - 应急事件
   * @param {Object} responsePlan - 响应方案
   * @returns {Promise<Array>} 调度的队伍
   */
  async dispatchEmergencyTeams(event, responsePlan) {
    const dispatchedTeams = [];

    for (const teamRequirement of responsePlan.requiredTeams) {
      // 搜索符合条件的队伍
      const availableTeams = await this.searchAvailableTeams(
        event.location,
        teamRequirement.type,
        teamRequirement.size
      );

      if (availableTeams.length === 0) {
        logger.warn(`未找到可用的${teamRequirement.type}队伍`);
        continue;
      }

      // 选择最优队伍
      const selectedTeam = this.selectOptimalTeam(availableTeams, event.location);

      // 创建调度记录
      const dispatchedTeam = {
        teamId: selectedTeam._id,
        teamName: selectedTeam.name,
        teamType: teamRequirement.type,
        members: selectedTeam.members.map(member => ({
          userId: member.userId,
          name: member.name,
          role: member.role,
          contact: member.contact,
          skills: member.skills
        })),
        dispatchedAt: new Date(),
        status: 'dispatched',
        equipment: teamRequirement.equipment || [],
        notes: `响应${event.type}事件`
      };

      dispatchedTeams.push(dispatchedTeam);

      // 更新队伍状态
      await this.updateTeamStatus(selectedTeam._id, 'dispatched');
    }

    return dispatchedTeams;
  }

  /**
   * 验证报警人信息
   * @param {Object} reporterData - 报警人数据
   * @returns {Promise<Object>} 验证后的信息
   */
  async validateReporter(reporterData) {
    if (reporterData.userId) {
      const user = await User.findById(reporterData.userId);
      if (!user) {
        throw new Error('报警人用户不存在');
      }
      return {
        userId: user._id,
        name: user.profile.displayName || user.profile.lastName + user.profile.firstName,
        phone: reporterData.phone || user.phone
      };
    }

    return {
      userId: null,
      name: reporterData.name,
      phone: reporterData.phone
    };
  }

  /**
   * 获取精确位置信息
   * @param {Object} locationData - 位置数据
   * @returns {Promise<Object>} 精确位置
   */
  async getEmergencyLocation(locationData) {
    let location = locationData;

    // 如果只有坐标，通过逆地理编码获取地址
    if (locationData.coordinates && !locationData.address) {
      const address = await this.locationService.reverseGeocode(
        locationData.coordinates.latitude,
        locationData.coordinates.longitude
      );
      location.address = address;
    }

    // 如果只有地址，通过地理编码获取坐标
    if (locationData.address && !locationData.coordinates) {
      const coordinates = await this.locationService.geocode(locationData.address);
      location.coordinates = coordinates;
    }

    return location;
  }

  /**
   * 评估应急级别
   * @param {Object} emergencyData - 应急数据
   * @returns {string} 应急级别
   */
  assessEmergencyLevel(emergencyData) {
    // 基于事件类型的默认级别
    const defaultLevels = {
      [EmergencyTypes.MEDICAL]: EmergencyLevels.LEVEL_2,
      [EmergencyTypes.FIRE]: EmergencyLevels.LEVEL_1,
      [EmergencyTypes.FLOOD]: EmergencyLevels.LEVEL_1,
      [EmergencyTypes.EARTHQUAKE]: EmergencyLevels.LEVEL_1,
      [EmergencyTypes.ACCIDENT]: EmergencyLevels.LEVEL_3,
      [EmergencyTypes.MISSING_PERSON]: EmergencyLevels.LEVEL_3,
      [EmergencyTypes.PUBLIC_SECURITY]: EmergencyLevels.LEVEL_2
    };

    let level = defaultLevels[emergencyData.type] || EmergencyLevels.LEVEL_4;

    // 根据具体情况调整级别
    if (emergencyData.casualties && emergencyData.casualties > 0) {
      if (emergencyData.casualties >= 10) {
        level = EmergencyLevels.LEVEL_1;
      } else if (emergencyData.casualties >= 3) {
        level = EmergencyLevels.LEVEL_2;
      }
    }

    if (emergencyData.urgency === 'high') {
      level = EmergencyLevels.LEVEL_1;
    }

    return level;
  }

  /**
   * 生成应急事件标题
   * @param {Object} emergencyData - 应急数据
   * @returns {string} 标题
   */
  generateEmergencyTitle(emergencyData) {
    const typeNames = {
      [EmergencyTypes.MEDICAL]: '医疗急救',
      [EmergencyTypes.FIRE]: '火灾',
      [EmergencyTypes.FLOOD]: '洪水',
      [EmergencyTypes.EARTHQUAKE]: '地震',
      [EmergencyTypes.ACCIDENT]: '事故',
      [EmergencyTypes.MISSING_PERSON]: '人员失踪',
      [EmergencyTypes.PUBLIC_SECURITY]: '公共安全',
      [EmergencyTypes.NATURAL_DISASTER]: '自然灾害'
    };

    const typeName = typeNames[emergencyData.type] || '其他应急';
    const location = emergencyData.location?.address?.detailed || '未知位置';

    return `${typeName} - ${location}`;
  }

  /**
   * 计算优先级
   * @param {Object} emergencyData - 应急数据
   * @param {string} level - 级别
   * @returns {number} 优先级
   */
  calculatePriority(emergencyData, level) {
    const levelScores = {
      [EmergencyLevels.LEVEL_1]: 10,
      [EmergencyLevels.LEVEL_2]: 8,
      [EmergencyLevels.LEVEL_3]: 6,
      [EmergencyLevels.LEVEL_4]: 4
    };

    let priority = levelScores[level] || 4;

    // 根据具体情况调整优先级
    if (emergencyData.urgency === 'high') {
      priority = 10;
    }

    if (emergencyData.vulnerableInvolved) {
      priority += 1;
    }

    return Math.min(10, priority);
  }

  /**
   * 获取应急指导
   * @param {string} emergencyType - 应急类型
   * @returns {Object} 指导信息
   */
  getEmergencyInstructions(emergencyType) {
    const instructions = {
      [EmergencyTypes.MEDICAL]: {
        immediate: '保持冷静，检查伤者呼吸和心跳',
        steps: [
          '拨打120急救电话',
          '保持伤者体温',
          '不要移动伤者（除非有危险）',
          '清理呼吸道',
          '进行必要的急救措施'
        ],
        warnings: ['不要随意移动伤者', '不要给昏迷者喂食']
      },
      [EmergencyTypes.FIRE]: {
        immediate: '立即离开危险区域',
        steps: [
          '拨打119火警电话',
          '用湿毛巾捂住口鼻',
          '低姿势匍匐前进',
          '不要使用电梯',
          '到安全地点集合'
        ],
        warnings: ['不要重返火场', '不要贪恋财物']
      },
      [EmergencyTypes.ACCIDENT]: {
        immediate: '确保现场安全',
        steps: [
          '拨打相应救援电话',
          '设置警示标志',
          '救助受伤人员',
          '保护现场',
          '联系家属'
        ],
        warnings: ['不要随意移动伤者', '注意交通安全']
      }
    };

    return instructions[emergencyType] || {
      immediate: '保持冷静，立即求助',
      steps: ['拨打紧急电话', '确保人员安全', '等待专业救援'],
      warnings: ['不要自行处理危险情况']
    };
  }

  /**
   * 获取安全指导
   * @param {string} emergencyType - 应急类型
   * @returns {Array} 安全指导
   */
  getSafetyGuidelines(emergencyType) {
    const guidelines = {
      [EmergencyTypes.MEDICAL]: [
        '保持伤者温暖',
        '观察生命体征',
        '记录伤情变化',
        '准备好医疗信息'
      ],
      [EmergencyTypes.FIRE]: [
        '关闭电源气源',
        '用湿毛巾捂口鼻',
        '低姿前进',
        '不要乘坐电梯'
      ],
      [EmergencyTypes.ACCIDENT]: [
        '设置警示标志',
        '保护现场',
        '救助伤者',
        '联系救援'
      ]
    };

    return guidelines[emergencyType] || [
      '保持冷静',
      '确保人身安全',
      '及时求助',
      '听从专业指导'
    ];
  }

  /**
   * 发送紧急通知
   * @param {Object} event - 应急事件
   * @param {Object} responseResult - 响应结果
   */
  async sendEmergencyNotifications(event, responseResult) {
    try {
      // 1. 通知应急响应队伍
      for (const team of responseResult.dispatchedTeams) {
        await this.notificationService.sendNotification({
          title: '紧急事件响应',
          content: `${event.title} 需要您的团队立即响应`,
          type: 'emergency_dispatch',
          priority: 'high',
          recipients: team.members.map(m => m.userId),
          data: {
            eventId: event._id,
            eventTitle: event.title,
            location: event.location,
            urgency: event.level
          }
        });
      }

      // 2. 通知村庄管理员
      const villageAdmins = await User.find({
        'village.villageId': event.villageId,
        role: { $in: ['village_admin', 'department_head'] }
      });

      await this.notificationService.sendNotification({
        title: '紧急事件报告',
        content: `发生${this.getEmergencyTypeName(event.type)}事件，需要立即处理`,
        type: 'emergency_report',
        priority: 'high',
        recipients: villageAdmins.map(admin => admin._id),
        data: {
          eventId: event._id,
          eventType: event.type,
          level: event.level,
          location: event.location
        }
      });

    } catch (error) {
      logger.error('发送紧急通知失败:', error);
    }
  }

  /**
   * 获取应急类型名称
   * @param {string} type - 应急类型
   * @returns {string} 类型名称
   */
  getEmergencyTypeName(type) {
    const typeNames = {
      [EmergencyTypes.MEDICAL]: '医疗急救',
      [EmergencyTypes.FIRE]: '火灾',
      [EmergencyTypes.FLOOD]: '洪水',
      [EmergencyTypes.EARTHQUAKE]: '地震',
      [EmergencyTypes.ACCIDENT]: '事故',
      [EmergencyTypes.MISSING_PERSON]: '人员失踪',
      [EmergencyTypes.PUBLIC_SECURITY]: '公共安全',
      [EmergencyTypes.NATURAL_DISASTER]: '自然灾害'
    };

    return typeNames[type] || '其他';
  }

  /**
   * 记录应急操作日志
   * @param {string} action - 操作类型
   * @param {string} targetId - 目标ID
   * @param {string} userId - 用户ID
   * @param {Object} details - 详情
   */
  logEmergencyAction(action, targetId, userId, details) {
    const logEntry = {
      timestamp: new Date(),
      action: action,
      targetId: targetId,
      userId: userId,
      details: details,
      module: 'emergency_response'
    };

    logger.info('应急操作日志:', logEntry);
  }
}

module.exports = EmergencyResponseService;