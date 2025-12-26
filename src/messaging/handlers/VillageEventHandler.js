/**
 * 村庄事件处理器
 * 处理村庄相关的事件消息
 */

const Logger = require('../utils/logger');

class VillageEventHandler {
  constructor() {
    this.services = {
      userService: null,
      residentService: null,
      notificationService: null
    };
  }

  /**
   * 初始化服务依赖
   */
  initialize(services) {
    this.services = { ...this.services, ...services };
  }

  /**
   * 处理村庄事件
   */
  async handle(messageData) {
    const { content, headers } = messageData;
    const eventType = content.eventType;

    Logger.info('处理村庄事件', {
      eventType,
      messageId: messageData.properties.messageId,
      timestamp: content.timestamp
    });

    try {
      switch (eventType) {
        case 'resident.created':
          return await this.handleResidentCreated(content);
        case 'resident.updated':
          return await this.handleResidentUpdated(content);
        case 'family.created':
          return await this.handleFamilyCreated(content);
        case 'family.member.added':
          return await this.handleFamilyMemberAdded(content);
        case 'announcement.published':
          return await this.handleAnnouncementPublished(content);
        case 'meeting.created':
          return await this.handleMeetingCreated(content);
        case 'emergency.occurred':
          return await this.handleEmergencyOccurred(content);
        case 'village.statistics.updated':
          return await this.handleVillageStatisticsUpdated(content);
        default:
          Logger.warn('未知的村庄事件类型', { eventType });
          return { handled: false, reason: 'Unknown event type' };
      }
    } catch (error) {
      Logger.error(`处理村庄事件失败 (${eventType})`, {
        error: error.message,
        stack: error.stack,
        messageId: messageData.properties.messageId
      });
      throw error;
    }
  }

  /**
   * 处理村民创建事件
   */
  async handleResidentCreated(eventData) {
    const { data, villageId } = eventData;

    Logger.info('处理村民创建事件', {
      residentId: data.residentId,
      name: `${data.name.lastName}${data.name.firstName}`,
      villageId
    });

    // 更新村民统计
    await this.updateResidentStatistics(villageId, 'increment', 'total_residents');

    // 发送欢迎通知
    if (this.services.notificationService) {
      await this.services.notificationService.sendNotification({
        type: 'welcome',
        targetUsers: [data.userId],
        data: {
          message: `欢迎您，${data.name.lastName}${data.name.firstName}！您已成为本村正式村民。`,
          villageId
        }
      });
    }

    // 触发分析事件
    if (this.services.analyticsService) {
      await this.services.analyticsService.trackEvent({
        eventType: 'resident_registered',
        userId: data.userId,
        villageId,
        properties: {
          gender: data.personal.gender,
          age: this.calculateAge(data.personal.birthDate),
          registrationDate: new Date().toISOString()
        }
      });
    }

    return {
      handled: true,
      action: 'resident_created_processed',
      residentId: data.residentId
    };
  }

  /**
   * 处理村民更新事件
   */
  async handleResidentUpdated(eventData) {
    const { data, changes, villageId } = eventData;

    Logger.info('处理村民更新事件', {
      residentId: data.residentId,
      changes: Object.keys(changes),
      villageId
    });

    // 如果家庭信息变更，更新家庭统计
    if (changes.family) {
      await this.updateFamilyStatistics(villageId);
    }

    // 如果联系方式变更，记录审计日志
    if (changes.contact) {
      await this.services.auditService?.log({
        action: 'contact_info_updated',
        entity: 'resident',
        entityId: data.residentId,
        data: {
          changes: changes.contact,
          updatedBy: changes.updatedBy
        }
      });
    }

    return {
      handled: true,
      action: 'resident_updated_processed',
      residentId: data.residentId
    };
  }

  /**
   * 处理家庭创建事件
   */
  async handleFamilyCreated(eventData) {
    const { data, villageId } = eventData;

    Logger.info('处理家庭创建事件', {
      familyId: data.familyId,
      familyName: data.familyName,
      memberCount: data.members.length,
      villageId
    });

    // 更新家庭统计
    await this.updateFamilyStatistics(villageId, 'increment', 'total_families');

    // 更新村民统计
    await this.updateResidentStatistics(villageId, 'increment', 'total_family_members', data.members.length);

    // 如果是低保家庭，创建相应记录
    if (data.economics.povertyLevel !== '非贫困户') {
      await this.createPovertyRecord(data, villageId);
    }

    return {
      handled: true,
      action: 'family_created_processed',
      familyId: data.familyId
    };
  }

  /**
   * 处理家庭成员添加事件
   */
  async handleFamilyMemberAdded(eventData) {
    const { familyId, member, villageId } = eventData;

    Logger.info('处理家庭成员添加事件', {
      familyId,
      memberName: member.name,
      relationship: member.relationship,
      villageId
    });

    // 更新家庭成员统计
    await this.updateFamilyStatistics(villageId);

    // 如果是重要家庭成员变更，发送通知
    if (['户主', '配偶'].includes(member.relationship)) {
      await this.services.notificationService?.sendNotification({
        type: 'family_update',
        targetVillage: villageId,
        data: {
          message: `${member.name} 已加入家庭`,
          familyId
        }
      });
    }

    return {
      handled: true,
      action: 'family_member_added_processed',
      familyId,
      memberId: member.residentId
    };
  }

  /**
   * 处理公告发布事件
   */
  async handleAnnouncementPublished(eventData) {
    const { data, villageId } = eventData;

    Logger.info('处理公告发布事件', {
      announcementId: data.announcementId,
      title: data.title,
      priority: data.priority,
      villageId
    });

    // 统计公告数据
    await this.updateAnnouncementStatistics(villageId, 'increment', 'total_announcements');

    // 发送通知给目标用户
    if (data.targetUsers && data.targetUsers.length > 0) {
      await this.services.notificationService?.sendNotification({
        type: 'announcement',
        targetUsers: data.targetUsers,
        data: {
          title: data.title,
          content: data.content.substring(0, 100) + '...',
          priority: data.priority,
          announcementId: data.announcementId
        }
      });
    }

    // 记录审计日志
    await this.services.auditService?.log({
      action: 'announcement_published',
      entity: 'announcement',
      entityId: data.announcementId,
      data: {
        title: data.title,
        priority: data.priority,
        publishedBy: data.publishedBy
      }
    });

    return {
      handled: true,
      action: 'announcement_published_processed',
      announcementId: data.announcementId
    };
  }

  /**
   * 处理会议创建事件
   */
  async handleMeetingCreated(eventData) {
    const { data, villageId } = eventData;

    Logger.info('处理会议创建事件', {
      meetingId: data.meetingId,
      title: data.title,
      scheduledTime: data.scheduledTime,
      villageId
    });

    // 创建会议提醒任务
    if (this.services.taskService) {
      const reminderTime = new Date(data.scheduledTime);
      reminderTime.setHours(reminderTime.getHours() - 1); // 提前1小时提醒

      await this.services.taskService.createTask({
        type: 'meeting_reminder',
        scheduledTime: reminderTime.toISOString(),
        data: {
          meetingId: data.meetingId,
          title: data.title,
          attendees: data.attendees
        }
      });
    }

    // 发送会议通知
    if (data.attendees && data.attendees.length > 0) {
      await this.services.notificationService?.sendNotification({
        type: 'meeting_invitation',
        targetUsers: data.attendees,
        data: {
          title: data.title,
          time: data.scheduledTime,
          location: data.location,
          meetingId: data.meetingId
        }
      });
    }

    return {
      handled: true,
      action: 'meeting_created_processed',
      meetingId: data.meetingId
    };
  }

  /**
   * 处理紧急事件
   */
  async handleEmergencyOccurred(eventData) {
    const { data, villageId } = eventData;

    Logger.warn('处理紧急事件', {
      emergencyId: data.emergencyId,
      type: data.type,
      severity: data.severity,
      location: data.location,
      villageId
    });

    // 立即发送紧急通知
    await this.services.notificationService?.sendNotification({
      type: 'emergency',
      priority: 'urgent',
      targetVillage: villageId,
      data: {
        title: `紧急事件：${data.type}`,
        content: data.description,
        severity: data.severity,
        location: data.location,
        emergencyId: data.emergencyId
      }
    });

    // 创建紧急任务
    if (this.services.taskService) {
      await this.services.taskService.createTask({
        type: 'emergency_response',
        priority: 'urgent',
        data: {
          emergencyId: data.emergencyId,
          type: data.type,
          location: data.location,
          severity: data.severity
        }
      });
    }

    // 记录紧急事件日志
    await this.services.auditService?.log({
      action: 'emergency_reported',
      entity: 'emergency',
      entityId: data.emergencyId,
      data: {
        type: data.type,
        severity: data.severity,
        reportedBy: data.reportedBy,
        location: data.location
      }
    });

    // 触发应急响应流程
    await this.triggerEmergencyResponse(data, villageId);

    return {
      handled: true,
      action: 'emergency_processed',
      emergencyId: data.emergencyId
    };
  }

  /**
   * 处理村庄统计数据更新事件
   */
  async handleVillageStatisticsUpdated(eventData) {
    const { data, villageId } = eventData;

    Logger.info('处理村庄统计更新事件', {
      villageId,
      statisticsType: data.statisticsType,
      values: data.values
    });

    // 缓存统计数据
    await this.cacheVillageStatistics(villageId, data);

    // 如果是重要统计变更，发送通知
    if (['population', 'poverty_level', 'special_groups'].includes(data.statisticsType)) {
      await this.services.notificationService?.sendNotification({
        type: 'statistics_update',
        targetRoles: ['village_admin'],
        data: {
          message: `村庄${data.statisticsType}统计已更新`,
          statisticsType: data.statisticsType,
          values: data.values
        }
      });
    }

    return {
      handled: true,
      action: 'statistics_updated_processed',
      villageId,
      statisticsType: data.statisticsType
    };
  }

  /**
   * 更新村民统计
   */
  async updateResidentStatistics(villageId, operation, field, value = 1) {
    // 这里应该调用统计服务更新数据
    Logger.info('更新村民统计', {
      villageId,
      operation,
      field,
      value
    });
  }

  /**
   * 更新家庭统计
   */
  async updateFamilyStatistics(villageId) {
    // 重新计算家庭统计数据
    Logger.info('重新计算家庭统计', { villageId });
  }

  /**
   * 创建贫困记录
   */
  async createPovertyRecord(familyData, villageId) {
    Logger.info('创建贫困记录', {
      familyId: familyData.familyId,
      povertyLevel: familyData.economics.povertyLevel,
      villageId
    });
  }

  /**
   * 更新公告统计
   */
  async updateAnnouncementStatistics(villageId, operation, field) {
    Logger.info('更新公告统计', {
      villageId,
      operation,
      field
    });
  }

  /**
   * 触发应急响应
   */
  async triggerEmergencyResponse(emergencyData, villageId) {
    Logger.info('触发应急响应', {
      emergencyId: emergencyData.emergencyId,
      type: emergencyData.type,
      severity: emergencyData.severity
    });
  }

  /**
   * 缓存村庄统计
   */
  async cacheVillageStatistics(villageId, statisticsData) {
    // 将统计数据缓存到Redis
    Logger.info('缓存村庄统计', {
      villageId,
      statisticsType: statisticsData.statisticsType
    });
  }

  /**
   * 计算年龄
   */
  calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }
}

module.exports = VillageEventHandler;