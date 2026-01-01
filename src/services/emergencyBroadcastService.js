/**
 * 应急广播服务
 * 支持多种广播方式：短信、电话、微信、村广播系统、户外喇叭等
 */

const logger = require('./logger');

class EmergencyBroadcastService {
  constructor() {
    this.config = {
      // 短信广播配置
      sms: {
        enabled: process.env.EMERGENCY_SMS_ENABLED === 'true',
        provider: process.env.EMERGENCY_SMS_PROVIDER || 'aliyun',
        batchSize: 100,
        rateLimit: 10 // 每秒最多10条
      },

      // 电话广播配置
      phone: {
        enabled: process.env.EMERGENCY_PHONE_ENABLED === 'true',
        provider: process.env.EMERGENCY_PHONE_PROVIDER || 'tencent',
        maxConcurrent: 5,
        retryCount: 3
      },

      // 微信广播配置
      wechat: {
        enabled: process.env.EMERGENCY_WECHAT_ENABLED === 'true',
        templateId: process.env.EMERGENCY_WECHAT_TEMPLATE
      },

      // 村广播系统配置
      villageBroadcast: {
        enabled: process.env.VILLAGE_BROADCAST_ENABLED === 'true',
        apiUrl: process.env.VILLAGE_BROADCAST_API_URL,
        apiKey: process.env.VILLAGE_BROADCAST_API_KEY
      },

      // 户外喇叭配置
      outdoorSpeakers: {
        enabled: process.env.OUTDOOR_SPEAKERS_ENABLED === 'true',
        controlUrl: process.env.OUTDOOR_SPEAKERS_URL,
        coverage: ['center', 'north', 'south', 'east', 'west']
      },

      // 移动广播车配置
      mobileBroadcast: {
        enabled: process.env.MOBILE_BROADCAST_ENABLED === 'true',
        vehicles: [
          {
            id: 'BC001',
            name: '广播车1号',
            driver: '张师傅',
            phone: '13800138001',
            location: null,
            status: 'standby'
          }
        ]
      }
    };

    this.broadcastQueue = [];
    this.isProcessing = false;
  }

  /**
   * 发送应急广播
   */
  async sendEmergencyBroadcast(emergency, options = {}) {
    try {
      const {
        channels = ['sms', 'phone', 'village_broadcast'],
        targetAreas = ['all'],
        content,
        voiceUrl,
        repeatCount = 3,
        intervalMinutes = 10
      } = options;

      const broadcastId = this.generateBroadcastId();
      const broadcastData = {
        id: broadcastId,
        emergencyId: emergency._id,
        emergencyTitle: emergency.title,
        emergencyType: emergency.type,
        severity: emergency.severity,
        location: emergency.location,
        content: content || this.generateBroadcastContent(emergency),
        voiceUrl,
        channels,
        targetAreas,
        repeatCount,
        intervalMinutes,
        status: 'pending',
        createdAt: new Date(),
        results: {}
      };

      // 获取目标受众
      const targetAudience = await this.getTargetAudience(emergency, targetAreas);

      if (targetAudience.length === 0) {
        logger.warn(`广播 ${broadcastId}: 没有找到目标受众`);
        return { success: false, message: '没有找到目标受众' };
      }

      broadcastData.targetCount = targetAudience.length;

      // 立即发送第一轮广播
      await this.executeBroadcast(broadcastData, targetAudience);

      // 如果需要重复广播
      if (repeatCount > 1) {
        this.scheduleRepeatedBroadcasts(broadcastData, targetAudience, repeatCount - 1, intervalMinutes);
      }

      logger.info(`应急广播发送成功: ${broadcastId}`, {
        channels,
        targetCount: targetAudience.length,
        repeatCount
      });

      return {
        success: true,
        broadcastId,
        targetCount: targetAudience.length,
        message: '应急广播发送成功'
      };

    } catch (error) {
      logger.error('发送应急广播失败:', error);
      throw error;
    }
  }

  /**
   * 执行广播
   */
  async executeBroadcast(broadcastData, targetAudience) {
    try {
      broadcastData.status = 'broadcasting';
      broadcastData.startTime = new Date();

      const channelPromises = broadcastData.channels.map(channel =>
        this.broadcastToChannel(channel, broadcastData, targetAudience)
      );

      const results = await Promise.allSettled(channelPromises);

      broadcastData.results = results.map((result, index) => ({
        channel: broadcastData.channels[index],
        success: result.status === 'fulfilled',
        sentCount: result.status === 'fulfilled' ? result.value.sentCount : 0,
        error: result.status === 'rejected' ? result.reason.message : null
      }));

      broadcastData.status = 'completed';
      broadcastData.endTime = new Date();

      // 保存广播记录
      await this.saveBroadcastRecord(broadcastData);

      return broadcastData.results;

    } catch (error) {
      logger.error(`执行广播失败: ${broadcastData.id}`, error);
      broadcastData.status = 'failed';
      broadcastData.error = error.message;
      throw error;
    }
  }

  /**
   * 向指定渠道广播
   */
  async broadcastToChannel(channel, broadcastData, targetAudience) {
    try {
      switch (channel) {
      case 'sms':
        return await this.broadcastSMS(broadcastData, targetAudience);
      case 'phone':
        return await this.broadcastPhone(broadcastData, targetAudience);
      case 'wechat':
        return await this.broadcastWechat(broadcastData, targetAudience);
      case 'village_broadcast':
        return await this.broadcastVillageSystem(broadcastData);
      case 'outdoor_speakers':
        return await this.broadcastOutdoorSpeakers(broadcastData);
      case 'mobile_broadcast':
        return await this.broadcastMobileVehicles(broadcastData);
      default:
        throw new Error(`不支持的广播渠道: ${channel}`);
      }
    } catch (error) {
      logger.error(`${channel}广播失败:`, error);
      throw error;
    }
  }

  /**
   * 短信广播
   */
  async broadcastSMS(broadcastData, targetAudience) {
    try {
      if (!this.config.sms.enabled) {
        return { sentCount: 0, channel: 'sms', message: '短信广播未启用' };
      }

      let sentCount = 0;
      const batchSize = this.config.sms.batchSize;

      for (let i = 0; i < targetAudience.length; i += batchSize) {
        const batch = targetAudience.slice(i, i + batchSize);

        for (const recipient of batch) {
          if (recipient.phone) {
            await this.sendSMSMessage(recipient.phone, broadcastData.content);
            sentCount++;

            // 限流控制
            await this.delay(1000 / this.config.sms.rateLimit);
          }
        }
      }

      logger.info(`短信广播完成: ${broadcastData.id}`, { sentCount });
      return { sentCount, channel: 'sms' };

    } catch (error) {
      logger.error('短信广播失败:', error);
      throw error;
    }
  }

  /**
   * 电话广播
   */
  async broadcastPhone(broadcastData, targetAudience) {
    try {
      if (!this.config.phone.enabled) {
        return { sentCount: 0, channel: 'phone', message: '电话广播未启用' };
      }

      let sentCount = 0;
      const maxConcurrent = this.config.phone.maxConcurrent;
      const batches = this.chunkArray(targetAudience.filter(r => r.phone), maxConcurrent);

      for (const batch of batches) {
        const promises = batch.map(recipient =>
          this.makePhoneCall(recipient.phone, broadcastData.content, broadcastData.voiceUrl)
            .then(() => sentCount++)
            .catch(error => logger.warn(`电话呼叫失败: ${recipient.phone}`, error))
        );

        await Promise.all(promises);
      }

      logger.info(`电话广播完成: ${broadcastData.id}`, { sentCount });
      return { sentCount, channel: 'phone' };

    } catch (error) {
      logger.error('电话广播失败:', error);
      throw error;
    }
  }

  /**
   * 村广播系统广播
   */
  async broadcastVillageSystem(broadcastData) {
    try {
      if (!this.config.villageBroadcast.enabled) {
        return { sentCount: 0, channel: 'village_broadcast', message: '村广播系统未启用' };
      }

      const response = await this.callVillageBroadcastAPI({
        action: 'broadcast',
        content: broadcastData.content,
        priority: this.getBroadcastPriority(broadcastData.severity),
        repeat: true,
        duration: 60 // 广播时长（秒）
      });

      logger.info(`村广播系统广播完成: ${broadcastData.id}`, response);
      return { sentCount: 1, channel: 'village_broadcast', response };

    } catch (error) {
      logger.error('村广播系统广播失败:', error);
      throw error;
    }
  }

  /**
   * 户外喇叭广播
   */
  async broadcastOutdoorSpeakers(broadcastData) {
    try {
      if (!this.config.outdoorSpeakers.enabled) {
        return { sentCount: 0, channel: 'outdoor_speakers', message: '户外喇叭未启用' };
      }

      const activatedSpeakers = [];
      const coverage = this.config.outdoorSpeakers.coverage;

      for (const area of coverage) {
        try {
          await this.activateSpeaker(area, broadcastData.content);
          activatedSpeakers.push(area);
        } catch (error) {
          logger.warn(`激活${area}区域喇叭失败:`, error);
        }
      }

      logger.info(`户外喇叭广播完成: ${broadcastData.id}`, {
        activatedSpeakers,
        count: activatedSpeakers.length
      });

      return {
        sentCount: activatedSpeakers.length,
        channel: 'outdoor_speakers',
        activatedSpeakers
      };

    } catch (error) {
      logger.error('户外喇叭广播失败:', error);
      throw error;
    }
  }

  /**
   * 移动广播车广播
   */
  async broadcastMobileVehicles(broadcastData) {
    try {
      if (!this.config.mobileBroadcast.enabled) {
        return { sentCount: 0, channel: 'mobile_broadcast', message: '移动广播车未启用' };
      }

      const dispatchedVehicles = [];

      for (const vehicle of this.config.mobileBroadcast.vehicles) {
        if (vehicle.status === 'standby') {
          await this.dispatchVehicle(vehicle, broadcastData);
          vehicle.status = 'dispatched';
          dispatchedVehicles.push(vehicle.id);
        }
      }

      logger.info(`移动广播车调度完成: ${broadcastData.id}`, {
        dispatchedVehicles,
        count: dispatchedVehicles.length
      });

      return {
        sentCount: dispatchedVehicles.length,
        channel: 'mobile_broadcast',
        dispatchedVehicles
      };

    } catch (error) {
      logger.error('移动广播车调度失败:', error);
      throw error;
    }
  }

  /**
   * 获取目标受众
   */
  async getTargetAudience(emergency, targetAreas) {
    try {
      const Resident = require('../models/Resident');
      const Village = require('../models/Village');

      const query = {
        villageId: emergency.villageId,
        status: 'active'
      };

      // 根据影响区域筛选
      if (targetAreas.includes('affected_area') && emergency.affectedArea?.radius) {
        query.location = {
          $near: {
            $geometry: emergency.coordinates,
            $maxDistance: emergency.affectedArea.radius
          }
        };
      }

      const residents = await Resident.find(query)
        .select('name phone address villageId')
        .lean();

      return residents;

    } catch (error) {
      logger.error('获取目标受众失败:', error);
      return [];
    }
  }

  /**
   * 生成广播内容
   */
  generateBroadcastContent(emergency) {
    const severityTexts = {
      low: '一般',
      medium: '较重',
      high: '严重',
      critical: '特别严重'
    };

    const typeTexts = {
      natural_disaster: '自然灾害',
      accident: '事故灾难',
      public_health: '公共卫生',
      security: '社会安全',
      fire: '火灾',
      flood: '洪涝',
      earthquake: '地震',
      epidemic: '疫情'
    };

    return `【${severityTexts[emergency.severity]}应急通知】

${typeTexts[emergency.type]}：${emergency.title}

事发地点：${emergency.location}
简要情况：${emergency.description}

请村民朋友们注意安全，听从村干部指挥。如有需要，请联系应急热线：110、119、120。

${new Date().toLocaleString()}`;
  }

  /**
   * 调度重复广播
   */
  scheduleRepeatedBroadcasts(broadcastData, targetAudience, remainingCount, intervalMinutes) {
    if (remainingCount <= 0) return;

    const delay = intervalMinutes * 60 * 1000; // 转换为毫秒

    setTimeout(async () => {
      try {
        await this.executeBroadcast(broadcastData, targetAudience);
        logger.info(`重复广播完成: ${broadcastData.id}`, {
          remainingCount: remainingCount - 1
        });

        // 继续下一次重复广播
        this.scheduleRepeatedBroadcasts(
          broadcastData,
          targetAudience,
          remainingCount - 1,
          intervalMinutes
        );
      } catch (error) {
        logger.error(`重复广播失败: ${broadcastData.id}`, error);
      }
    }, delay);
  }

  /**
   * 保存广播记录
   */
  async saveBroadcastRecord(broadcastData) {
    try {
      // 这里可以将广播记录保存到数据库
      logger.debug('保存广播记录:', broadcastData.id);
    } catch (error) {
      logger.error('保存广播记录失败:', error);
    }
  }

  /**
   * 生成广播ID
   */
  generateBroadcastId() {
    return `BC${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  /**
   * 获取广播优先级
   */
  getBroadcastPriority(severity) {
    const priorityMap = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4
    };
    return priorityMap[severity] || 2;
  }

  /**
   * 数组分块
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 具体实现方法（占位符）

  async sendSMSMessage(phone, content) {
    logger.info(`发送短信: ${phone}, 内容: ${content.substring(0, 50)}...`);
    return true;
  }

  async makePhoneCall(phone, content, voiceUrl) {
    logger.info(`拨打电话: ${phone}`);
    return true;
  }

  async callVillageBroadcastAPI(data) {
    logger.info('调用村广播系统API:', data);
    return { success: true };
  }

  async activateSpeaker(area, content) {
    logger.info(`激活${area}区域喇叭: ${content.substring(0, 30)}...`);
    return true;
  }

  async dispatchVehicle(vehicle, broadcastData) {
    logger.info(`调度广播车: ${vehicle.id} 到 ${broadcastData.location}`);
    return true;
  }
}

module.exports = new EmergencyBroadcastService();