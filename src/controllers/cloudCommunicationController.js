/**
 * 云通信控制器
 * 处理短信、语音、邮件、推送等通信请求
 */

const cloudCommunicationService = require('../services/cloudCommunicationService');

/**
 * 发送短信
 */
exports.sendSMS = async (req, res) => {
  try {
    const {
      provider = 'aliyun',
      recipients,
      template,
      content,
      options = {}
    } = req.body;

    if (!recipients) {
      return res.status(400).json({
        success: false,
        message: '接收者不能为空'
      });
    }

    if (!template && !content) {
      return res.status(400).json({
        success: false,
        message: '模板或内容不能为空'
      });
    }

    const messageConfig = {
      type: 'sms',
      provider,
      recipients,
      template,
      content,
      options
    };

    const result = await cloudCommunicationService.sendMessage(messageConfig);

    res.json({
      success: true,
      data: result,
      message: '短信发送成功'
    });

  } catch (error) {
    console.error('短信发送失败:', error);
    res.status(500).json({
      success: false,
      message: '短信发送失败',
      error: error.message
    });
  }
};

/**
 * 发送语音通知
 */
exports.sendVoice = async (req, res) => {
  try {
    const {
      provider = 'aliyun',
      recipients,
      template,
      content,
      options = {}
    } = req.body;

    if (!recipients) {
      return res.status(400).json({
        success: false,
        message: '接收者不能为空'
      });
    }

    if (!template && !content) {
      return res.status(400).json({
        success: false,
        message: '模板或内容不能为空'
      });
    }

    const messageConfig = {
      type: 'voice',
      provider,
      recipients,
      template,
      content,
      options
    };

    const result = await cloudCommunicationService.sendMessage(messageConfig);

    res.json({
      success: true,
      data: result,
      message: '语音通知发送成功'
    });

  } catch (error) {
    console.error('语音通知发送失败:', error);
    res.status(500).json({
      success: false,
      message: '语音通知发送失败',
      error: error.message
    });
  }
};

/**
 * 发送邮件
 */
exports.sendEmail = async (req, res) => {
  try {
    const {
      recipients,
      subject,
      content,
      type = 'html',
      attachments = []
    } = req.body;

    if (!recipients) {
      return res.status(400).json({
        success: false,
        message: '接收者不能为空'
      });
    }

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: '邮件主题不能为空'
      });
    }

    if (!content) {
      return res.status(400).json({
        success: false,
        message: '邮件内容不能为空'
      });
    }

    const messageConfig = {
      type: 'email',
      recipients,
      content: {
        subject,
        body: content,
        type,
        attachments
      }
    };

    const result = await cloudCommunicationService.sendMessage(messageConfig);

    res.json({
      success: true,
      data: result,
      message: '邮件发送成功'
    });

  } catch (error) {
    console.error('邮件发送失败:', error);
    res.status(500).json({
      success: false,
      message: '邮件发送失败',
      error: error.message
    });
  }
};

/**
 * 发送推送通知
 */
exports.sendPush = async (req, res) => {
  try {
    const {
      provider = 'jiguang',
      recipients,
      notification,
      options = {}
    } = req.body;

    if (!recipients) {
      return res.status(400).json({
        success: false,
        message: '接收者不能为空'
      });
    }

    if (!notification || !notification.alert) {
      return res.status(400).json({
        success: false,
        message: '推送内容不能为空'
      });
    }

    const messageConfig = {
      type: 'push',
      provider,
      recipients,
      content: notification,
      options
    };

    const result = await cloudCommunicationService.sendMessage(messageConfig);

    res.json({
      success: true,
      data: result,
      message: '推送通知发送成功'
    });

  } catch (error) {
    console.error('推送通知发送失败:', error);
    res.status(500).json({
      success: false,
      message: '推送通知发送失败',
      error: error.message
    });
  }
};

/**
 * 批量发送消息
 */
exports.sendBatchMessages = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        message: '消息列表不能为空且必须是数组'
      });
    }

    if (messages.length > 100) {
      return res.status(400).json({
        success: false,
        message: '批量发送最多支持100条消息'
      });
    }

    const results = await cloudCommunicationService.sendBatchMessages(messages);

    res.json({
      success: true,
      data: results,
      message: '批量消息发送完成'
    });

  } catch (error) {
    console.error('批量消息发送失败:', error);
    res.status(500).json({
      success: false,
      message: '批量消息发送失败',
      error: error.message
    });
  }
};

/**
 * 发送验证码
 */
exports.sendVerificationCode = async (req, res) => {
  try {
    const { phone, type = 'sms' } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: '手机号不能为空'
      });
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: '手机号格式不正确'
      });
    }

    const result = await cloudCommunicationService.sendVerificationCode(phone, type);

    // 返回时不包含验证码，只返回成功状态和过期时间
    const { success, expireTime } = result;

    res.json({
      success,
      data: { expireTime },
      message: '验证码发送成功'
    });

  } catch (error) {
    console.error('验证码发送失败:', error);
    res.status(500).json({
      success: false,
      message: '验证码发送失败',
      error: error.message
    });
  }
};

/**
 * 验证验证码
 */
exports.verifyCode = async (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: '手机号不能为空'
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        message: '验证码不能为空'
      });
    }

    const result = cloudCommunicationService.verifyCode(phone, code);

    res.json({
      success: result.success,
      message: result.message
    });

  } catch (error) {
    console.error('验证码验证失败:', error);
    res.status(500).json({
      success: false,
      message: '验证码验证失败',
      error: error.message
    });
  }
};

/**
 * 发送应急广播
 */
exports.sendEmergencyBroadcast = async (req, res) => {
  try {
    const { villageId, message, channels = ['sms', 'voice', 'push'] } = req.body;

    if (!villageId) {
      return res.status(400).json({
        success: false,
        message: '村庄ID不能为空'
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: '广播内容不能为空'
      });
    }

    // 验证权限（只有管理员可以发送应急广播）
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权限发送应急广播'
      });
    }

    const result = await cloudCommunicationService.sendEmergencyBroadcast(villageId, message, channels);

    res.json({
      success: true,
      data: result,
      message: '应急广播发送成功'
    });

  } catch (error) {
    console.error('应急广播发送失败:', error);
    res.status(500).json({
      success: false,
      message: '应急广播发送失败',
      error: error.message
    });
  }
};

/**
 * 发送村务通知
 */
exports.sendVillageNotification = async (req, res) => {
  try {
    const { villageId, title, content, type = 'announcement', channels = ['sms', 'push'] } = req.body;

    if (!villageId) {
      return res.status(400).json({
        success: false,
        message: '村庄ID不能为空'
      });
    }

    if (!title) {
      return res.status(400).json({
        success: false,
        message: '通知标题不能为空'
      });
    }

    if (!content) {
      return res.status(400).json({
        success: false,
        message: '通知内容不能为空'
      });
    }

    const Village = require('../models/Village');
    const Resident = require('../models/Resident');

    // 获取村庄信息
    const village = await Village.findById(villageId);
    if (!village) {
      return res.status(404).json({
        success: false,
        message: '村庄不存在'
      });
    }

    // 获取所有村民
    const residents = await Resident.find({
      villageId,
      status: 'active',
      phone: { $exists: true, $ne: '' }
    });

    const results = {};

    // 发送短信通知
    if (channels.includes('sms') && residents.length > 0) {
      const phoneNumbers = residents.map(r => r.phone).filter(Boolean);
      try {
        results.sms = await cloudCommunicationService.sendSMSMessage('aliyun', phoneNumbers, {
          code: 'SMS_VILLAGE_NOTIFICATION',
          params: { title, content, village: village.name }
        }, {});
      } catch (error) {
        results.sms = { error: error.message };
      }
    }

    // 发送推送通知
    if (channels.includes('push') && residents.length > 0) {
      const pushTokens = residents
        .filter(r => r.digital && r.digital.jpushId)
        .map(r => r.digital.jpushId);

      if (pushTokens.length > 0) {
        try {
          results.push = await cloudCommunicationService.sendPushByJiguang(pushTokens, {
            alert: `${village.name}村务通知: ${title}`,
            android: {
              title: title,
              alert: content,
              priority: 1
            },
            ios: {
              title: title,
              body: content,
              badge: 1,
              sound: 'default'
            }
          });
        } catch (error) {
          results.push = { error: error.message };
        }
      }
    }

    // 记录村务通知日志
    try {
      const VillageNotification = require('../models/VillageNotification');
      await new VillageNotification({
        villageId,
        title,
        content,
        type,
        channels,
        recipientCount: residents.length,
        results,
        sender: req.user.id,
        createdAt: new Date()
      }).save();
    } catch (logError) {
      console.error('村务通知日志记录失败:', logError);
    }

    res.json({
      success: true,
      data: {
        villageId: village.name,
        recipientCount: residents.length,
        results
      },
      message: '村务通知发送成功'
    });

  } catch (error) {
    console.error('村务通知发送失败:', error);
    res.status(500).json({
      success: false,
      message: '村务通知发送失败',
      error: error.message
    });
  }
};

/**
 * 发送生日祝福
 */
exports.sendBirthdayGreetings = async (req, res) => {
  try {
    const { auto = false } = req.query;

    const Resident = require('../models/Resident');

    // 获取今天生日的村民
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    const residents = await Resident.find({
      status: 'active',
      $expr: {
        $and: [
          { $eq: [{ $month: '$birthDate' }, todayMonth] },
          { $eq: [{ $dayOfMonth: '$birthDate' }, todayDay] }
        ]
      },
      phone: { $exists: true, $ne: '' }
    }).populate('villageId', 'name');

    const results = [];

    for (const resident of residents) {
      try {
        const message = `亲爱的${resident.name}，今天是您的生日，${resident.villageId.name}村委会祝您生日快乐，身体健康！`;

        const result = await cloudCommunicationService.sendSMSMessage('aliyun', resident.phone, {
          code: 'SMS_BIRTHDAY_GREETING',
          params: { name: resident.name, village: resident.villageId.name }
        }, {});

        results.push({
          residentId: resident._id,
          name: resident.name,
          phone: resident.phone,
          village: resident.villageId.name,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          residentId: resident._id,
          name: resident.name,
          phone: resident.phone,
          village: resident.villageId?.name || '未知',
          success: false,
          error: error.message
        });
      }
    }

    // 记录生日祝福日志
    if (auto) {
      try {
        const BirthdayGreeting = require('../models/BirthdayGreeting');
        await new BirthdayGreeting({
          date: today,
          totalResidents: residents.length,
          successCount: results.filter(r => r.success).length,
          results,
          isAuto: true
        }).save();
      } catch (logError) {
        console.error('生日祝福日志记录失败:', logError);
      }
    }

    res.json({
      success: true,
      data: {
        date: today,
        totalResidents: residents.length,
        successCount: results.filter(r => r.success).length,
        failedCount: results.filter(r => !r.success).length,
        results
      },
      message: '生日祝福发送完成'
    });

  } catch (error) {
    console.error('生日祝福发送失败:', error);
    res.status(500).json({
      success: false,
      message: '生日祝福发送失败',
      error: error.message
    });
  }
};

/**
 * 发送节日祝福
 */
exports.sendHolidayGreetings = async (req, res) => {
  try {
    const { holiday, message, template, recipients = 'all', sendTime } = req.body;

    if (!holiday) {
      return res.status(400).json({
        success: false,
        message: '节日名称不能为空'
      });
    }

    if (!message && !template) {
      return res.status(400).json({
        success: false,
        message: '消息内容或模板不能为空'
      });
    }

    const Resident = require('../models/Resident');
    const Village = require('../models/Village');

    let residents;

    if (recipients === 'all') {
      // 发送给所有村民
      residents = await Resident.find({
        status: 'active',
        phone: { $exists: true, $ne: '' }
      }).populate('villageId', 'name');
    } else if (Array.isArray(recipients)) {
      // 发送给指定村民
      residents = await Resident.find({
        _id: { $in: recipients },
        status: 'active',
        phone: { $exists: true, $ne: '' }
      }).populate('villageId', 'name');
    } else {
      // 发送给指定村庄的所有村民
      residents = await Resident.find({
        villageId: recipients,
        status: 'active',
        phone: { $exists: true, $ne: '' }
      }).populate('villageId', 'name');
    }

    if (residents.length === 0) {
      return res.status(404).json({
        success: false,
        message: '没有找到有效的接收者'
      });
    }

    const phoneNumbers = residents.map(r => r.phone).filter(Boolean);
    const results = {};

    try {
      // 发送短信祝福
      results.sms = await cloudCommunicationService.sendSMSMessage('aliyun', phoneNumbers, {
        code: template || 'SMS_HOLIDAY_GREETING',
        params: { holiday, message, village: '{{village}}' }
      }, {});
    } catch (error) {
      results.sms = { error: error.message };
    }

    // 记录节日祝福日志
    try {
      const HolidayGreeting = require('../models/HolidayGreeting');
      await new HolidayGreeting({
        holiday,
        message,
        template,
        recipients: recipients === 'all' ? 'all' : (Array.isArray(recipients) ? recipients : [recipients]),
        recipientCount: residents.length,
        sendTime: sendTime || new Date(),
        results,
        sender: req.user.id
      }).save();
    } catch (logError) {
      console.error('节日祝福日志记录失败:', logError);
    }

    res.json({
      success: true,
      data: {
        holiday,
        recipientCount: residents.length,
        results
      },
      message: '节日祝福发送完成'
    });

  } catch (error) {
    console.error('节日祝福发送失败:', error);
    res.status(500).json({
      success: false,
      message: '节日祝福发送失败',
      error: error.message
    });
  }
};

/**
 * 获取消息发送历史
 */
exports.getMessageHistory = async (req, res) => {
  try {
    const {
      type,
      provider,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    const MessageLog = require('../models/MessageLog');
    const query = {};

    if (type) query.type = type;
    if (provider) query.provider = provider;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const messages = await MessageLog.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('sender', 'name');

    const total = await MessageLog.countDocuments(query);

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      },
      message: '消息历史获取成功'
    });

  } catch (error) {
    console.error('获取消息历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取消息历史失败',
      error: error.message
    });
  }
};

/**
 * 获取通信服务状态
 */
exports.getServiceStatus = async (req, res) => {
  try {
    const status = cloudCommunicationService.getServiceStatus();

    // 获取今日统计数据
    const MessageLog = require('../models/MessageLog');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await MessageLog.aggregate([
      {
        $match: {
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: 1 },
          success: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        ...status,
        todayStats,
        todayDate: today.toISOString().split('T')[0]
      },
      message: '服务状态获取成功'
    });

  } catch (error) {
    console.error('获取服务状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取服务状态失败',
      error: error.message
    });
  }
};

/**
 * 清理缓存
 */
exports.clearCache = async (req, res) => {
  try {
    cloudCommunicationService.clearCache();

    res.json({
      success: true,
      message: '通信服务缓存清理成功'
    });

  } catch (error) {
    console.error('清理缓存失败:', error);
    res.status(500).json({
      success: false,
      message: '清理缓存失败',
      error: error.message
    });
  }
};