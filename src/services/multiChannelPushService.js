/**
 * 多端推送服务
 * 支持 WebSocket、移动推送、短信、邮件等多种推送渠道
 */

const webSocketService = require('./webSocketService');
const RealtimeNotification = require('../models/RealtimeNotification');
const Logger = require('../utils/logger');
const axios = require('axios');

class MultiChannelPushService {
  constructor() {
    this.config = {
      // WebSocket配置
      websocket: {
        enabled: true
      },
      // 移动推送配置
      push: {
        enabled: process.env.PUSH_NOTIFICATION_ENABLED !== 'false',
        firebase: {
          enabled: process.env.FIREBASE_ENABLED === 'true',
          serverKey: process.env.FIREBASE_SERVER_KEY,
          projectId: process.env.FIREBASE_PROJECT_ID
        },
        apns: {
          enabled: process.env.APNS_ENABLED === 'true',
          keyId: process.env.APNS_KEY_ID,
          teamId: process.env.APNS_TEAM_ID,
          bundleId: process.env.APNS_BUNDLE_ID
        },
        umeng: {
          enabled: process.env.UMENG_ENABLED === 'true',
          appKey: process.env.UMENG_APP_KEY,
          appMasterSecret: process.env.UMENG_APP_MASTER_SECRET
        }
      },
      // 短信配置
      sms: {
        enabled: process.env.SMS_ENABLED === 'true',
        provider: process.env.SMS_PROVIDER || 'aliyun', // aliyun, tencent, twilio
        accessKey: process.env.SMS_ACCESS_KEY,
        secretKey: process.env.SMS_SECRET_KEY,
        signName: process.env.SMS_SIGN_NAME || '智慧乡村'
      },
      // 邮件配置
      email: {
        enabled: process.env.EMAIL_ENABLED === 'true',
        host: process.env.EMAIL_HOST || 'smtp.qq.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      },
      // 微信配置
      wechat: {
        enabled: process.env.WECHAT_ENABLED === 'true',
        appId: process.env.WECHAT_APP_ID,
        appSecret: process.env.WECHAT_APP_SECRET
      }
    };

    // 推送队列
    this.pushQueue = [];
    this.isProcessing = false;
  }

  /**
   * 创建并发送通知
   */
  async createAndSend(notificationData) {
    try {
      const {
        recipient,
        type,
        title,
        content,
        richContent,
        priority = 'normal',
        data,
        related,
        sender,
        channels = { websocket: true, push: true },
        scheduledAt,
        tags = []
      } = notificationData;

      // 创建通知记录
      const notification = new RealtimeNotification({
        recipient: {
          userId: recipient.userId,
          villageId: recipient.villageId,
          roles: recipient.roles
        },
        type,
        title,
        content,
        richContent,
        priority,
        data,
        related,
        sender,
        channels,
        scheduledAt,
        tags
      });

      await notification.save();

      // 如果是延迟发送，直接返回
      if (scheduledAt && scheduledAt > new Date()) {
        Logger.info('通知已安排延迟发送', {
          notificationId: notification._id,
          scheduledAt
        });
        return notification;
      }

      // 立即发送
      await this.sendNotification(notification);

      return notification;
    } catch (error) {
      Logger.error('创建并发送通知失败:', error);
      throw error;
    }
  }

  /**
   * 发送通知到所有配置的渠道
   */
  async sendNotification(notification) {
    const results = {
      notificationId: notification._id,
      channels: {},
      overallStatus: 'sent'
    };

    try {
      // WebSocket推送
      if (notification.channels.websocket) {
        results.channels.websocket = await this.sendViaWebSocket(notification);
      }

      // 移动推送
      if (notification.channels.push) {
        results.channels.push = await this.sendViaPush(notification);
      }

      // 短信推送
      if (notification.channels.sms) {
        results.channels.sms = await this.sendViaSMS(notification);
      }

      // 邮件推送
      if (notification.channels.email) {
        results.channels.email = await this.sendViaEmail(notification);
      }

      // 微信推送
      if (notification.channels.wechat) {
        results.channels.wechat = await this.sendViaWechat(notification);
      }

      // 更新通知状态
      await this.updateNotificationStatus(notification, results);

      Logger.info('通知发送完成', {
        notificationId: notification._id,
        type: notification.type,
        channels: Object.keys(results.channels)
      });

      return results;
    } catch (error) {
      Logger.error('发送通知失败:', error);
      results.overallStatus = 'failed';
      return results;
    }
  }

  /**
   * WebSocket推送
   */
  async sendViaWebSocket(notification) {
    try {
      const recipientId = notification.recipient.userId;

      // 检查用户是否在线
      const isOnline = webSocketService.connectedUsers.has(recipientId);

      if (!isOnline) {
        return {
          sent: false,
          delivered: false,
          reason: 'user_offline'
        };
      }

      // 准备推送消息
      const message = {
        type: 'realtime_notification',
        notificationId: notification._id.toString(),
        notificationType: notification.type,
        title: notification.title,
        content: notification.content,
        richContent: notification.richContent,
        priority: notification.priority,
        data: notification.data,
        related: notification.related,
        sender: notification.sender,
        timestamp: notification.createdAt
      };

      // 发送WebSocket消息
      webSocketService.broadcastToUser(recipientId, message, notification.priority);

      // 更新状态
      await notification.update({
        'deliveryStatus.websocket.sent': true,
        'deliveryStatus.websocket.delivered': true,
        'deliveryStatus.websocket.deliveredAt': new Date()
      });

      return {
        sent: true,
        delivered: true
      };
    } catch (error) {
      Logger.error('WebSocket推送失败:', error);
      await notification.update({
        'deliveryStatus.websocket.sent': false,
        'deliveryStatus.websocket.failed': true,
        'deliveryStatus.websocket.error': error.message
      });
      return {
        sent: false,
        delivered: false,
        error: error.message
      };
    }
  }

  /**
   * 移动推送（Firebase/Umeng）
   */
  async sendViaPush(notification) {
    try {
      if (!this.config.push.enabled) {
        return { sent: false, skipped: true, reason: 'push_disabled' };
      }

      const User = require('../models/User');
      const user = await User.findById(notification.recipient.userId);

      if (!user || !user.pushTokens || user.pushTokens.length === 0) {
        return { sent: false, skipped: true, reason: 'no_push_token' };
      }

      const results = [];

      // 遍历用户的所有推送token
      for (const pushToken of user.pushTokens) {
        let result;

        if (pushToken.platform === 'android') {
          result = await this.sendFirebaseNotification(notification, pushToken.token);
        } else if (pushToken.platform === 'ios') {
          result = await this.sendAPNSNotification(notification, pushToken.token);
        } else {
          result = await this.sendUmengNotification(notification, pushToken);
        }

        results.push(result);

        // 如果token失效，移除它
        if (result && result.invalidToken) {
          await User.updateOne(
            { _id: user._id },
            { $pull: { pushTokens: { token: pushToken.token } } }
          );
        }
      }

      const successCount = results.filter(r => r && r.sent).length;

      await notification.update({
        'deliveryStatus.push.sent': successCount > 0,
        'deliveryStatus.push.delivered': successCount > 0,
        'deliveryStatus.push.deliveredAt': successCount > 0 ? new Date() : null
      });

      return {
        sent: successCount > 0,
        delivered: successCount > 0,
        results
      };
    } catch (error) {
      Logger.error('移动推送失败:', error);
      await notification.update({
        'deliveryStatus.push.sent': false,
        'deliveryStatus.push.failed': true,
        'deliveryStatus.push.error': error.message
      });
      return {
        sent: false,
        delivered: false,
        error: error.message
      };
    }
  }

  /**
   * Firebase推送
   */
  async sendFirebaseNotification(notification, pushToken) {
    try {
      if (!this.config.push.firebase.enabled) {
        return { sent: false, skipped: true, reason: 'firebase_disabled' };
      }

      const message = {
        notification: {
          title: notification.title,
          body: notification.content,
          sound: 'default'
        },
        data: {
          notificationId: notification._id.toString(),
          type: notification.type,
          data: JSON.stringify(notification.data || {}),
          related: JSON.stringify(notification.related || {})
        },
        token: pushToken,
        priority: notification.priority === 'urgent' ? 'high' : 'normal',
        android: {
          priority: notification.priority === 'urgent' ? 'high' : 'normal',
          notification: {
            sound: notification.priority === 'urgent' ? 'emergency.wav' : 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: notification.priority === 'urgent' ? 'emergency.wav' : 'default',
              badge: 1
            }
          }
        }
      };

      const response = await axios.post(
        `https://fcm.googleapis.com/v1/projects/${this.config.push.firebase.projectId}/messages:send`,
        message,
        {
          headers: {
            'Authorization': `Bearer ${await this.getFirebaseAccessToken()}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        return { sent: true, delivered: true };
      }

      return { sent: false, error: 'FCM response error' };
    } catch (error) {
      Logger.error('Firebase推送失败:', error);
      return { sent: false, error: error.message };
    }
  }

  /**
   * 获取Firebase访问令牌
   */
  async getFirebaseAccessToken() {
    // TODO: 实现OAuth2认证获取Firebase访问令牌
    return process.env.FIREBASE_SERVER_KEY;
  }

  /**
   * APNs推送（iOS）
   */
  async sendAPNSNotification(notification, pushToken) {
    try {
      if (!this.config.push.apns.enabled) {
        return { sent: false, skipped: true, reason: 'apns_disabled' };
      }

      const apns = require('apn');
      const provider = new apns.Provider({
        cert: process.env.APNS_CERT_PATH,
        key: process.env.APNS_KEY_PATH,
        production: process.env.NODE_ENV === 'production'
      });

      const note = new apns.Notification();

      note.expiry = Math.floor(Date.now() / 1000) + 3600; // 1小时后过期
      note.badge = 1;
      note.sound = notification.priority === 'urgent' ? 'emergency.wav' : 'default';
      note.alert = {
        title: notification.title,
        body: notification.content
      };
      note.payload = {
        notificationId: notification._id.toString(),
        type: notification.type,
        data: notification.data || {}
      };
      note.topic = this.config.push.apns.bundleId;
      note.device = pushToken;

      const response = await provider.send(note, pushToken);

      if (response.sent) {
        return { sent: true, delivered: response.success };
      }

      return { sent: false, invalidToken: response.reason === 'BadDeviceToken' };
    } catch (error) {
      Logger.error('APNs推送失败:', error);
      return { sent: false, error: error.message };
    }
  }

  /**
   * Umeng推送
   */
  async sendUmengNotification(notification, pushToken) {
    try {
      if (!this.config.push.umeng.enabled) {
        return { sent: false, skipped: true, reason: 'umeng_disabled' };
      }

      const payload = {
        appkey: this.config.push.umeng.appKey,
        timestamp: Date.now(),
        type: 'unicast',
        device_tokens: [pushToken],
        payload: {
          body: {
            title: notification.title,
            text: notification.content,
            after_open: 'go_custom',
            custom: {
              notificationId: notification._id.toString(),
              type: notification.type,
              data: notification.data || {}
            }
          }
        },
        policy: {
          expire_time: notification.expiresAt
        }
      };

      const response = await axios.post(
        'https://msg.umeng.com/api/send',
        JSON.stringify(payload),
        {
          headers: {
            'Content-Type': 'application/json'
          },
          params: {
            sign: this.generateUmengSign(payload)
          }
        }
      );

      if (response.data.ret === 'SUCCESS') {
        return { sent: true, delivered: true };
      }

      return { sent: false, error: response.data };
    } catch (error) {
      Logger.error('Umeng推送失败:', error);
      return { sent: false, error: error.message };
    }
  }

  /**
   * 短信推送
   */
  async sendViaSMS(notification) {
    try {
      if (!this.config.sms.enabled) {
        return { sent: false, skipped: true, reason: 'sms_disabled' };
      }

      const User = require('../models/User');
      const user = await User.findById(notification.recipient.userId);

      if (!user || !user.phone) {
        return { sent: false, skipped: true, reason: 'no_phone' };
      }

      let result;

      switch (this.config.sms.provider) {
      case 'aliyun':
        result = await this.sendAliyunSMS(user.phone, notification);
        break;
      case 'tencent':
        result = await this.sendTencentSMS(user.phone, notification);
        break;
      case 'twilio':
        result = await this.sendTwilioSMS(user.phone, notification);
        break;
      default:
        result = { sent: false, skipped: true, reason: 'unknown_provider' };
      }

      if (result.sent) {
        await notification.update({
          'deliveryStatus.sms.sent': true,
          'deliveryStatus.sms.delivered': true,
          'deliveryStatus.sms.deliveredAt': new Date()
        });
      } else {
        await notification.update({
          'deliveryStatus.sms.sent': false,
          'deliveryStatus.sms.failed': true,
          'deliveryStatus.sms.error': result.error
        });
      }

      return result;
    } catch (error) {
      Logger.error('短信推送失败:', error);
      return { sent: false, error: error.message };
    }
  }

  /**
   * 阿里云短信
   */
  async sendAliyunSMS(phone, notification) {
    // TODO: 实现阿里云短信发送
    return { sent: false, skipped: true, reason: 'not_implemented' };
  }

  /**
   * 腾讯云短信
   */
  async sendTencentSMS(phone, notification) {
    // TODO: 实现腾讯云短信发送
    return { sent: false, skipped: true, reason: 'not_implemented' };
  }

  /**
   * Twilio短信
   */
  async sendTwilioSMS(phone, notification) {
    // TODO: 实现Twilio短信发送
    return { sent: false, skipped: true, reason: 'not_implemented' };
  }

  /**
   * 邮件推送
   */
  async sendViaEmail(notification) {
    try {
      if (!this.config.email.enabled) {
        return { sent: false, skipped: true, reason: 'email_disabled' };
      }

      const User = require('../models/User');
      const user = await User.findById(notification.recipient.userId);

      if (!user || !user.email) {
        return { sent: false, skipped: true, reason: 'no_email' };
      }

      // TODO: 实现邮件发送
      return { sent: false, skipped: true, reason: 'not_implemented' };
    } catch (error) {
      Logger.error('邮件推送失败:', error);
      await notification.update({
        'deliveryStatus.email.sent': false,
        'deliveryStatus.email.failed': true,
        'deliveryStatus.email.error': error.message
      });
      return { sent: false, error: error.message };
    }
  }

  /**
   * 微信推送
   */
  async sendViaWechat(notification) {
    try {
      if (!this.config.wechat.enabled) {
        return { sent: false, skipped: true, reason: 'wechat_disabled' };
      }

      // TODO: 实现微信模板消息推送
      return { sent: false, skipped: true, reason: 'not_implemented' };
    } catch (error) {
      Logger.error('微信推送失败:', error);
      return { sent: false, error: error.message };
    }
  }

  /**
   * 批量发送通知
   */
  async batchSend(notificationsData) {
    const results = [];
    for (const data of notificationsData) {
      try {
        const notification = await this.createAndSend(data);
        results.push({ success: true, notification });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
    return results;
  }

  /**
   * 处理待发送的通知
   */
  async processPendingNotifications() {
    try {
      const pendingNotifications = await RealtimeNotification.getPendingNotifications(100);

      for (const notification of pendingNotifications) {
        await this.sendNotification(notification);
      }

      Logger.info(`处理待发送通知完成: ${pendingNotifications.length} 条`);
      return pendingNotifications.length;
    } catch (error) {
      Logger.error('处理待发送通知失败:', error);
      return 0;
    }
  }

  /**
   * 重试失败的通知
   */
  async retryFailedNotifications() {
    try {
      const failedNotifications = await RealtimeNotification.getFailedNotifications(50);

      let retriedCount = 0;
      const now = new Date();

      for (const notification of failedNotifications) {
        // 检查是否到达重试时间
        if (notification.retry.nextRetryAt && notification.retry.nextRetryAt > now) {
          continue;
        }

        await notification.incrementRetry();
        await this.sendNotification(notification);
        retriedCount++;
      }

      Logger.info(`重试失败通知完成: ${retriedCount} 条`);
      return retriedCount;
    } catch (error) {
      Logger.error('重试失败通知出错:', error);
      return 0;
    }
  }

  /**
   * 更新通知状态
   */
  async updateNotificationStatus(notification, results) {
    const allDelivered = Object.values(results.channels).every(
      channel => channel && channel.delivered
    );
    const anyDelivered = Object.values(results.channels).some(
      channel => channel && channel.delivered
    );
    const allFailed = Object.values(results.channels).every(
      channel => channel && !channel.sent && !channel.skipped
    );

    let status = notification.status;

    if (allDelivered) {
      status = 'delivered';
    } else if (anyDelivered) {
      status = 'sent';
    } else if (allFailed) {
      status = 'failed';
    }

    notification.status = status;
    await notification.save();
  }

  /**
   * 生成Umeng签名
   */
  generateUmengSign(payload) {
    // TODO: 实现Umeng签名生成
    return '';
  }

  /**
   * 启动定时任务
   */
  startScheduledTasks() {
    // 每分钟处理待发送通知
    setInterval(() => {
      this.processPendingNotifications();
    }, 60000);

    // 每5分钟重试失败通知
    setInterval(() => {
      this.retryFailedNotifications();
    }, 300000);

    // 每小时清理过期通知
    setInterval(() => {
      RealtimeNotification.cleanupExpired();
    }, 3600000);
  }

  /**
   * 获取配置
   */
  getConfig() {
    return {
      websocket: { enabled: this.config.websocket.enabled },
      push: {
        enabled: this.config.push.enabled,
        firebase: { enabled: this.config.push.firebase.enabled },
        apns: { enabled: this.config.push.apns.enabled },
        umeng: { enabled: this.config.push.umeng.enabled }
      },
      sms: {
        enabled: this.config.sms.enabled,
        provider: this.config.sms.provider
      },
      email: {
        enabled: this.config.email.enabled
      },
      wechat: {
        enabled: this.config.wechat.enabled
      }
    };
  }
}

module.exports = new MultiChannelPushService();
