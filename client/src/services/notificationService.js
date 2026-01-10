import EventEmitter from 'events';
import { io } from 'socket.io-client';

/**
 * 多渠道推送通知服务
 */
class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.isConnected = false;
    this.channels = new Map();
    this.retryCount = 0;
    this.maxRetries = 3;

    this.initializeSocket();
    this.setupChannels();
  }

  /**
   * 初始化 Socket.IO 连接
   */
  initializeSocket() {
    try {
      this.socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000', {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('通知服务已连接');
        this.isConnected = true;
        this.retryCount = 0;
        this.emit('connected');
      });

      this.socket.on('disconnect', () => {
        console.log('通知服务已断开');
        this.isConnected = false;
        this.emit('disconnected');
      });

      this.socket.on('error', error => {
        console.error('通知服务连接错误:', error);
        this.emit('error', error);
      });

      // 监听公告通知
      this.socket.on('announcement-notification', data => {
        this.handleAnnouncementNotification(data);
      });

      // 监听推送状态更新
      this.socket.on('push-status-update', data => {
        this.emit('pushStatusUpdate', data);
      });
    } catch (error) {
      console.error('初始化Socket连接失败:', error);
    }
  }

  /**
   * 设置推送渠道
   */
  setupChannels() {
    // APP推送
    this.channels.set('app', {
      name: 'APP推送',
      enabled: true,
      handler: this.sendAppNotification.bind(this),
    });

    // 短信通知
    this.channels.set('sms', {
      name: '短信通知',
      enabled: false, // 需要配置短信服务
      handler: this.sendSMSNotification.bind(this),
    });

    // 微信通知
    this.channels.set('wechat', {
      name: '微信通知',
      enabled: false, // 需要配置微信服务
      handler: this.sendWeChatNotification.bind(this),
    });

    // 村内大屏
    this.channels.set('display', {
      name: '村内大屏',
      enabled: true,
      handler: this.sendDisplayNotification.bind(this),
    });

    // 语音播报
    this.channels.set('voice', {
      name: '语音播报',
      enabled: true,
      handler: this.sendVoiceNotification.bind(this),
    });

    // 邮件通知
    this.channels.set('email', {
      name: '邮件通知',
      enabled: false, // 需要配置邮件服务
      handler: this.sendEmailNotification.bind(this),
    });
  }

  /**
   * 发送公告通知到多个渠道
   */
  async sendAnnouncementNotification(announcement, channels = [], targetGroups = []) {
    if (!announcement) {
      throw new Error('公告信息不能为空');
    }

    console.log('发送公告通知:', {
      title: announcement.title,
      channels,
      targetGroups,
    });

    const results = [];

    // 遍历每个推送渠道
    for (const channelName of channels) {
      const channel = this.channels.get(channelName);

      if (!channel) {
        console.warn(`未知的推送渠道: ${channelName}`);
        continue;
      }

      if (!channel.enabled) {
        console.warn(`推送渠道未启用: ${channelName}`);
        continue;
      }

      try {
        const result = await channel.handler(announcement, targetGroups);
        results.push({
          channel: channelName,
          success: true,
          result,
        });
      } catch (error) {
        console.error(`${channelName} 推送失败:`, error);
        results.push({
          channel: channelName,
          success: false,
          error: error.message,
        });
      }
    }

    // 触发推送完成事件
    this.emit('pushCompleted', {
      announcement,
      channels,
      targetGroups,
      results,
    });

    return results;
  }

  /**
   * APP推送通知
   */
  async sendAppNotification(announcement, targetGroups) {
    const notification = {
      type: 'announcement',
      title: `村务公告：${announcement.title}`,
      body: announcement.summary || announcement.content.substring(0, 100),
      data: {
        announcementId: announcement.id,
        category: announcement.category,
        priority: announcement.priority,
      },
      targetGroups,
      timestamp: new Date().toISOString(),
    };

    // 通过Socket.IO发送到客户端
    if (this.isConnected) {
      this.socket.emit('send-app-notification', notification);
    }

    // 浏览器原生通知（如果用户授权）
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: notification.data,
      });
    }

    return { status: 'sent', timestamp: new Date() };
  }

  /**
   * 短信通知
   */
  async sendSMSNotification(announcement, targetGroups) {
    // 这里需要集成短信服务商API
    const smsContent = `【智慧村庄】${announcement.title}，详情请查看村务平台。`;

    // 模拟短信发送
    console.log('发送短信通知:', smsContent);

    // 实际实现需要调用短信服务API
    // const result = await smsService.send(phoneNumbers, smsContent)

    return {
      status: 'sent',
      content: smsContent,
      timestamp: new Date(),
    };
  }

  /**
   * 微信通知
   */
  async sendWeChatNotification(announcement, targetGroups) {
    // 这里需要集成微信公众号或企业微信API
    const wechatMessage = {
      title: announcement.title,
      description: announcement.summary,
      url: `${window.location.origin}/announcements/${announcement.id}`,
    };

    console.log('发送微信通知:', wechatMessage);

    // 实际实现需要调用微信API
    // const result = await wechatService.sendMessage(userIds, wechatMessage)

    return {
      status: 'sent',
      message: wechatMessage,
      timestamp: new Date(),
    };
  }

  /**
   * 村内大屏显示
   */
  async sendDisplayNotification(announcement, targetGroups) {
    const displayData = {
      type: 'announcement',
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      category: announcement.category,
      duration: this.getDisplayDuration(announcement.priority),
      style: this.getDisplayStyle(announcement.priority),
    };

    // 通过Socket.IO发送到大屏设备
    if (this.isConnected) {
      this.socket.emit('display-notification', displayData);
    }

    return {
      status: 'sent',
      displayData,
      timestamp: new Date(),
    };
  }

  /**
   * 语音播报
   */
  async sendVoiceNotification(announcement, targetGroups) {
    const voiceData = {
      text: this.prepareVoiceText(announcement),
      settings: announcement.pushSettings?.voiceSettings || {
        dialect: 'mandarin',
        speed: 1.0,
        volume: 70,
      },
      priority: announcement.priority,
    };

    // 通过Socket.IO发送到语音播报设备
    if (this.isConnected) {
      this.socket.emit('voice-notification', voiceData);
    }

    // 浏览器语音合成（作为备选）
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(voiceData.text);
      utterance.rate = voiceData.settings.speed;
      utterance.volume = voiceData.settings.volume / 100;
      speechSynthesis.speak(utterance);
    }

    return {
      status: 'sent',
      voiceData,
      timestamp: new Date(),
    };
  }

  /**
   * 邮件通知
   */
  async sendEmailNotification(announcement, targetGroups) {
    // 这里需要集成邮件服务
    const emailData = {
      subject: `村务公告：${announcement.title}`,
      html: this.generateEmailHTML(announcement),
      targetGroups,
    };

    console.log('发送邮件通知:', emailData);

    // 实际实现需要调用邮件服务API
    // const result = await emailService.send(emails, emailData)

    return {
      status: 'sent',
      emailData,
      timestamp: new Date(),
    };
  }

  /**
   * 处理接收到的公告通知
   */
  handleAnnouncementNotification(data) {
    console.log('收到公告通知:', data);

    // 触发通知事件
    this.emit('announcementNotification', data);

    // 显示浏览器通知
    this.showBrowserNotification(data);

    // 更新UI状态
    this.updateNotificationUI(data);
  }

  /**
   * 显示浏览器通知
   */
  showBrowserNotification(data) {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(data.title, {
          body: data.content,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(data.title, {
              body: data.content,
              icon: '/favicon.ico',
            });
          }
        });
      }
    }
  }

  /**
   * 更新通知UI
   */
  updateNotificationUI(data) {
    // 触发UI更新事件
    this.emit('uiUpdate', {
      type: 'notification',
      data,
    });
  }

  /**
   * 获取大屏显示时长
   */
  getDisplayDuration(priority) {
    const durations = {
      emergency: 30000, // 30秒
      urgent: 20000, // 20秒
      high: 15000, // 15秒
      normal: 10000, // 10秒
      low: 5000, // 5秒
    };
    return durations[priority] || 10000;
  }

  /**
   * 获取大屏显示样式
   */
  getDisplayStyle(priority) {
    const styles = {
      emergency: {
        backgroundColor: '#ff4757',
        color: '#ffffff',
        fontSize: '28px',
        animation: 'blink 1s infinite',
      },
      urgent: {
        backgroundColor: '#ffa502',
        color: '#ffffff',
        fontSize: '24px',
      },
      high: {
        backgroundColor: '#ff6b6b',
        color: '#ffffff',
        fontSize: '22px',
      },
      normal: {
        backgroundColor: '#3742fa',
        color: '#ffffff',
        fontSize: '20px',
      },
      low: {
        backgroundColor: '#a4b0be',
        color: '#ffffff',
        fontSize: '18px',
      },
    };
    return styles[priority] || styles.normal;
  }

  /**
   * 准备语音播报文本
   */
  prepareVoiceText(announcement) {
    let text = '';

    // 根据优先级添加前缀
    switch (announcement.priority) {
    case 'emergency':
      text += '紧急通知！';
      break;
    case 'urgent':
      text += '重要通知！';
      break;
    default:
      text += '村务公告：';
    }

    // 添加标题
    text += `${announcement.title}。`;

    // 添加摘要或部分内容
    const content =
      announcement.summary || announcement.content.replace(/<[^>]*>/g, '').substring(0, 200);
    text += content;

    // 添加结尾
    text += '详情请查看村务平台。';

    return text;
  }

  /**
   * 生成邮件HTML
   */
  generateEmailHTML(announcement) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${announcement.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #3742fa; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background: #f8f9fa; padding: 10px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${announcement.title}</h1>
        </div>
        <div class="content">
          ${announcement.content}
        </div>
        <div class="footer">
          <p>智慧村庄综合服务平台</p>
          <p>发布时间：${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 请求通知权限
   */
  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  /**
   * 获取渠道状态
   */
  getChannelStatus() {
    const status = {};
    this.channels.forEach((channel, name) => {
      status[name] = {
        name: channel.name,
        enabled: channel.enabled,
      };
    });
    return status;
  }

  /**
   * 启用/禁用渠道
   */
  setChannelEnabled(channelName, enabled) {
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.enabled = enabled;
      this.emit('channelStatusChanged', { channel: channelName, enabled });
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * 重新连接
   */
  reconnect() {
    if (this.socket && !this.isConnected) {
      this.socket.connect();
    } else {
      this.initializeSocket();
    }
  }
}

// 创建全局实例
const notificationService = new NotificationService();

export default notificationService;
