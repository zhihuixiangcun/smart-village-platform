const socketService = require('./socketService');
const notificationService = require('./notificationService');
const User = require('../models/User');
const EmergencyCall = require('../models/EmergencyCall');
const redis = require('redis');
const logger = require('../utils/logger');

class EmergencyCallService {
  constructor() {
    this.redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.redisClient.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });

    this.redisClient.connect();
  }

  /**
   * 处理紧急呼叫请求
   * @param {Object} callData - 呼叫数据
   * @param {string} callData.villageId - 村庄ID
   * @param {string} callData.callerId - 呼叫者ID
   * @param {Object} callData.location - 位置信息
   * @param {string} callData.emergencyType - 紧急类型
   * @param {string} callData.description - 描述
   * @param {Array} callData.attachments - 附件（图片、语音）
   */
  async handleEmergencyCall(callData) {
    try {
      // 1. 创建呼叫记录
      const emergencyCall = new EmergencyCall({
        villageId: callData.villageId,
        callerId: callData.callerId,
        location: callData.location,
        emergencyType: callData.emergencyType,
        description: callData.description,
        attachments: callData.attachments || [],
        status: 'active',
        priority: this.calculatePriority(callData.emergencyType),
        createdAt: new Date()
      });

      await emergencyCall.save();

      // 2. 缓存呼叫状态到Redis
      await this.cacheCallStatus(emergencyCall._id, {
        status: 'active',
        callerId: callData.callerId,
        location: callData.location,
        startTime: Date.now()
      });

      // 3. 获取当前值班人员
      const onDutyPersonnel = await this.getOnDutyPersonnel(callData.villageId);

      if (!onDutyPersonnel || onDutyPersonnel.length === 0) {
        // 如果没有值班人员，升级通知
        await this.escalateNotification(emergencyCall);
        throw new Error('当前无值班人员，已升级通知上级');
      }

      // 4. 发送实时通知给值班人员
      const notificationPromises = onDutyPersonnel.map(personnel => {
        return this.notifyOnDutyPersonnel(personnel, emergencyCall);
      });

      await Promise.allSettled(notificationPromises);

      // 5. 广播紧急呼叫到村庄频道
      socketService.broadcastToVillage(callData.villageId, {
        type: 'emergency_call',
        data: {
          callId: emergencyCall._id,
          location: callData.location,
          emergencyType: callData.emergencyType,
          description: callData.description,
          priority: emergencyCall.priority,
          onDutyCount: onDutyPersonnel.length
        }
      });

      // 6. 记录呼叫日志
      logger.info('Emergency call initiated', {
        callId: emergencyCall._id,
        villageId: callData.villageId,
        callerId: callData.callerId,
        emergencyType: callData.emergencyType
      });

      return {
        success: true,
        callId: emergencyCall._id,
        notifiedPersonnel: onDutyPersonnel.length,
        estimatedResponseTime: '3秒内'
      };

    } catch (error) {
      logger.error('Error handling emergency call:', error);
      throw error;
    }
  }

  /**
   * 获取当前值班人员
   * @param {string} villageId - 村庄ID
   */
  async getOnDutyPersonnel(villageId) {
    try {
      // 从Redis获取当前值班表
      const dutySchedule = await this.redisClient.get(`duty_schedule:${villageId}`);

      if (!dutySchedule) {
        // 如果Redis中没有，从数据库获取
        const onDutyPersonnel = await User.find({
          villageId,
          role: { $in: ['committee', 'admin'] },
          isOnDuty: true,
          isActive: true
        }).select('name phone email position');

        // 缓存值班表，有效期1小时
        await this.redisClient.setEx(
          `duty_schedule:${villageId}`,
          3600,
          JSON.stringify(onDutyPersonnel)
        );

        return onDutyPersonnel;
      }

      return JSON.parse(dutySchedule);
    } catch (error) {
      logger.error('Error getting on-duty personnel:', error);
      return [];
    }
  }

  /**
   * 通知值班人员
   * @param {Object} personnel - 值班人员信息
   * @param {Object} emergencyCall - 紧急呼叫数据
   */
  async notifyOnDutyPersonnel(personnel, emergencyCall) {
    try {
      // 1. 实时推送通知
      socketService.sendToUser(personnel._id, {
        type: 'emergency_notification',
        data: {
          callId: emergencyCall._id,
          location: emergencyCall.location,
          emergencyType: emergencyCall.emergencyType,
          description: emergencyCall.description,
          priority: emergencyCall.priority,
          timestamp: new Date().toISOString()
        }
      });

      // 2. 发送短信通知
      if (personnel.phone) {
        await notificationService.sendSMS(personnel.phone, {
          template: 'emergency_call',
          data: {
            emergencyType: this.getEmergencyTypeText(emergencyCall.emergencyType),
            location: emergencyCall.location.address || '未知位置',
            callId: emergencyCall._id
          }
        });
      }

      // 3. 发送应用内推送
      await notificationService.sendPushNotification(personnel._id, {
        title: '🚨 紧急呼叫',
        body: `${this.getEmergencyTypeText(emergencyCall.emergencyType)} - ${emergencyCall.location.address || '未知位置'}`,
        data: {
          type: 'emergency_call',
          callId: emergencyCall._id
        },
        priority: 'high'
      });

      // 4. 记录通知发送
      await this.recordNotification(personnel._id, emergencyCall._id, 'sent');

    } catch (error) {
      logger.error(`Error notifying personnel ${personnel._id}:`, error);
      await this.recordNotification(personnel._id, emergencyCall._id, 'failed');
    }
  }

  /**
   * 更新呼叫状态
   * @param {string} callId - 呼叫ID
   * @param {string} status - 新状态
   * @param {string} responderId - 响应者ID
   */
  async updateCallStatus(callId, status, responderId = null) {
    try {
      const updateData = {
        status,
        updatedAt: new Date()
      };

      if (status === 'responded' && responderId) {
        updateData.responderId = responderId;
        updateData.responseTime = new Date();
      }

      if (status === 'resolved') {
        updateData.resolvedAt = new Date();
      }

      // 更新数据库
      await EmergencyCall.findByIdAndUpdate(callId, updateData);

      // 更新Redis缓存
      const cachedStatus = await this.getCachedCallStatus(callId);
      if (cachedStatus) {
        await this.cacheCallStatus(callId, {
          ...cachedStatus,
          ...updateData
        });
      }

      // 广播状态更新
      const call = await EmergencyCall.findById(callId);
      socketService.broadcastToVillage(call.villageId, {
        type: 'call_status_update',
        data: {
          callId,
          status,
          responderId,
          timestamp: new Date().toISOString()
        }
      });

      logger.info('Call status updated', { callId, status, responderId });

      return true;
    } catch (error) {
      logger.error('Error updating call status:', error);
      return false;
    }
  }

  /**
   * 升级通知（当无值班人员时）
   * @param {Object} emergencyCall - 紧急呼叫数据
   */
  async escalateNotification(emergencyCall) {
    try {
      // 获取村庄管理员
      const admins = await User.find({
        villageId: emergencyCall.villageId,
        role: 'admin',
        isActive: true
      });

      // 发送升级通知
      for (const admin of admins) {
        await notificationService.sendSMS(admin.phone, {
          template: 'emergency_escalation',
          data: {
            emergencyType: this.getEmergencyTypeText(emergencyCall.emergencyType),
            location: emergencyCall.location.address,
            callId: emergencyCall._id
          }
        });

        // 发送电话通知（如果配置了电话服务）
        if (process.env.PHONE_CALL_ENABLED === 'true') {
          await this.makePhoneCall(admin.phone, {
            message: `紧急呼叫：${this.getEmergencyTypeText(emergencyCall.emergencyType)}，位置：${emergencyCall.location.address}`
          });
        }
      }

      // 通知上级管理部门
      await this.notifyHigherLevel(emergencyCall);

    } catch (error) {
      logger.error('Error in escalation notification:', error);
    }
  }

  /**
   * 获取呼叫记录
   * @param {Object} filters - 过滤条件
   */
  async getCallHistory(filters = {}) {
    try {
      const query = {};

      if (filters.villageId) {
        query.villageId = filters.villageId;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.emergencyType) {
        query.emergencyType = filters.emergencyType;
      }

      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
        if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
      }

      const calls = await EmergencyCall.find(query)
        .populate('callerId', 'name phone')
        .populate('responderId', 'name position')
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50);

      return calls;
    } catch (error) {
      logger.error('Error getting call history:', error);
      return [];
    }
  }

  /**
   * 计算紧急程度优先级
   * @param {string} emergencyType - 紧急类型
   */
  calculatePriority(emergencyType) {
    const priorityMap = {
      'fire': 1,        // 火灾
      'medical': 2,     // 医疗急救
      'accident': 3,    // 事故
      'security': 4,    // 安全事件
      'disaster': 1,    // 自然灾害
      'other': 5        // 其他
    };

    return priorityMap[emergencyType] || 5;
  }

  /**
   * 获取紧急类型文本
   * @param {string} emergencyType - 紧急类型
   */
  getEmergencyTypeText(emergencyType) {
    const typeMap = {
      'fire': '火灾',
      'medical': '医疗急救',
      'accident': '事故',
      'security': '安全事件',
      'disaster': '自然灾害',
      'other': '其他紧急情况'
    };

    return typeMap[emergencyType] || '紧急情况';
  }

  /**
   * 缓存呼叫状态
   * @param {string} callId - 呼叫ID
   * @param {Object} status - 状态数据
   */
  async cacheCallStatus(callId, status) {
    try {
      await this.redisClient.setEx(
        `emergency_call:${callId}`,
        86400, // 缓存24小时
        JSON.stringify(status)
      );
    } catch (error) {
      logger.error('Error caching call status:', error);
    }
  }

  /**
   * 获取缓存的呼叫状态
   * @param {string} callId - 呼叫ID
   */
  async getCachedCallStatus(callId) {
    try {
      const cached = await this.redisClient.get(`emergency_call:${callId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Error getting cached call status:', error);
      return null;
    }
  }

  /**
   * 记录通知发送状态
   * @param {string} personnelId - 人员ID
   * @param {string} callId - 呼叫ID
   * @param {string} status - 发送状态
   */
  async recordNotification(personnelId, callId, status) {
    try {
      await this.redisClient.lPush(
        `notification_log:${callId}`,
        JSON.stringify({
          personnelId,
          status,
          timestamp: new Date().toISOString()
        })
      );

      // 设置过期时间
      await this.redisClient.expire(`notification_log:${callId}`, 86400);
    } catch (error) {
      logger.error('Error recording notification:', error);
    }
  }

  /**
   * 发起电话通知
   * @param {string} phoneNumber - 电话号码
   * @param {Object} callData - 呼叫数据
   */
  async makePhoneCall(phoneNumber, callData) {
    // TODO: 集成电话通知服务（如阿里云语音、腾讯云等）
    logger.info('Phone call notification', { phoneNumber, message: callData.message });
  }

  /**
   * 通知上级管理部门
   * @param {Object} emergencyCall - 紧急呼叫数据
   */
  async notifyHigherLevel(emergencyCall) {
    // TODO: 实现上级通知逻辑
    logger.info('Notifying higher level authorities', { callId: emergencyCall._id });
  }

  /**
   * 生成QR码数据
   * @param {string} villageId - 村庄ID
   * @param {string} locationId - 位置ID
   */
  generateQRCodeData(villageId, locationId) {
    return {
      type: 'emergency_call',
      villageId,
      locationId,
      timestamp: Date.now(),
      signature: this.generateSignature(villageId, locationId)
    };
  }

  /**
   * 验证QR码
   * @param {Object} qrData - QR码数据
   */
  async verifyQRCode(qrData) {
    try {
      // 验证签名
      const expectedSignature = this.generateSignature(qrData.villageId, qrData.locationId);
      if (qrData.signature !== expectedSignature) {
        return { valid: false, reason: 'Invalid signature' };
      }

      // 检查时间戳（5分钟内有效）
      const timeDiff = Date.now() - qrData.timestamp;
      if (timeDiff > 5 * 60 * 1000) {
        return { valid: false, reason: 'QR code expired' };
      }

      return { valid: true };
    } catch (error) {
      logger.error('Error verifying QR code:', error);
      return { valid: false, reason: 'Verification error' };
    }
  }

  /**
   * 生成签名
   * @param {string} villageId - 村庄ID
   * @param {string} locationId - 位置ID
   */
  generateSignature(villageId, locationId) {
    const crypto = require('crypto');
    const data = `${villageId}:${locationId}`;
    return crypto.createHmac('sha256', process.env.QR_SECRET || 'default-secret')
      .update(data)
      .digest('hex');
  }
}

module.exports = new EmergencyCallService();