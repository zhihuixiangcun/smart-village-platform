/**
 * 防电信诈骗系统
 * 诈骗电话检测、短信拦截、智能预警
 */

const crypto = require('crypto');
const { format, subDays, addDays } = require('date-fns');

class AntiFraudService {
  constructor() {
    // 诈骗类型分类
    this.fraudTypes = {
      TELEPHONE: '电话诈骗',
      SMS: '短信诈骗',
      EMAIL: '邮件诈骗',
      WEBSITE: '网站诈骗',
      SOCIAL: '社交诈骗',
      INVESTMENT: '投资诈骗',
      LOTTERY: '中奖诈骗',
      IMPERSONATION: '身份冒充',
      ROMANCE: '情感诈骗',
      EMPLOYMENT: '求职诈骗'
    };

    // 诈骗特征库
    this.fraudPatterns = {
      // 电话诈骗特征
      phonePatterns: [
        {
          pattern: /\+?\d{1,4}[-.\s]?\(?[0-9]{1,4}\)?[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,9}/,
          description: '可疑电话号码格式',
          riskScore: 30
        },
        {
          keywords: ['中奖', '退款', '客服', '银行', '公安', '法院', '检察院', '税务局'],
          description: '诈骗常用关键词',
          riskScore: 50
        },
        {
          characteristics: [
            '冒充官方机构',
            '要求转账汇款',
            '威胁恐吓',
            '要求保密',
            '紧急处理'
          ],
          description: '典型诈骗话术特征',
          riskScore: 70
        }
      ],

      // 短信诈骗特征
      smsPatterns: [
        {
          pattern: /https?:\/\/[^\s]+/,
          description: '包含可疑链接',
          riskScore: 40
        },
        {
          keywords: ['中奖', '抽奖', '免费领取', '限时优惠', '恭喜', '点击领取'],
          description: '诱导性关键词',
          riskScore: 45
        },
        {
          characteristics: [
            '紧迫感',
            '紧迫性语言',
            '神秘链接',
            '要求回复'
          ],
          description: '短信诈骗特征',
          riskScore: 60
        }
      ],

      // 内容特征
      contentPatterns: [
        {
          urgency: ['立即', '马上', '紧急', '最后', '限时', '倒计时'],
          description: '紧迫性词汇',
          riskScore: 25
        },
        {
          authority: ['公安', '法院', '检察院', '银行', '运营商', '政府'],
          description: '冒充权威机构',
          riskScore: 60
        },
        {
          money: ['转账', '汇款', '手续费', '保证金', '解冻', '验证码'],
          description: '金钱相关词汇',
          riskScore: 55
        },
        {
          threat: ['冻结', '逮捕', '起诉', '刑事', '法律责任', '黑名单'],
          description: '威胁性词汇',
          riskScore: 75
        }
      ]
    };

    // 诈骗黑名单
    this.blacklist = new Map();
    this.initializeBlacklist();

    // 白名单
    this.whitelist = new Map();
    this.initializeWhitelist();

    // 诈骗举报数据库
    this.fraudReports = [];

    // 风险阈值
    this.riskThresholds = {
      LOW: 30,
      MEDIUM: 60,
      HIGH: 80,
      CRITICAL: 90
    };
  }

  /**
   * 初始化黑名单
   */
  async initializeBlacklist() {
    // 模拟黑名单数据
    const phoneBlacklist = [
      '4001234567',
      '01088888888',
      '02166666666',
      '+8613812345678',
      '02588886666'
    ];

    const urlBlacklist = [
      'http://fake-bank.com',
      'http://scam-site.org',
      'https://phishing.net',
      'http://fraud-info.cn'
    ];

    phoneBlacklist.forEach(phone => {
      this.blacklist.set(`phone:${phone}`, {
        type: 'phone',
        value: phone,
        addedAt: subDays(new Date(), Math.random() * 365),
        reason: '已知诈骗号码',
        reports: Math.floor(Math.random() * 100) + 10
      });
    });

    urlBlacklist.forEach(url => {
      this.blacklist.set(`url:${url}`, {
        type: 'url',
        value: url,
        addedAt: subDays(new Date(), Math.random() * 365),
        reason: '钓鱼网站',
        reports: Math.floor(Math.random() * 50) + 5
      });
    });

    console.log('诈骗黑名单初始化完成');
  }

  /**
   * 初始化白名单
   */
  async initializeWhitelist() {
    // 模拟白名单数据
    const phoneWhitelist = [
      '110', // 公安报警电话
      '10086', // 移动客服
      '10010', // 联通客服
      '10000', // 电信客服
      '12345',  // 政府服务热线
      '95533', // 工商银行
      '95588', // 农业银行
      '95599', // 中国银行
      '95511', // 建设银行
      '12306',  // 铁路客服
      '12315',  // 消费者投诉热线
      '12345',  // 政务服务热线
      '12369',  // 环保举报热线
      '12333'   // 人社服务热线
    ];

    const urlWhitelist = [
      'https://www.gov.cn',
      'https://www.12315.cn',
      'https://www.12306.cn',
      'https://www.icbc.com.cn',
      'https://www.abchina.com',
      'https://www.bankofchina.com',
      'https://www.ccb.com'
    ];

    phoneWhitelist.forEach(phone => {
      this.whitelist.set(`phone:${phone}`, {
        type: 'phone',
        value: phone,
        description: '官方电话',
        verified: true
      });
    });

    urlWhitelist.forEach(url => {
      this.whitelist.set(`url:${url}`, {
        type: 'url',
        value: url,
        description: '官方网站',
        verified: true
      });
    });

    console.log('可信白名单初始化完成');
  }

  /**
   * 检测电话诈骗
   */
  async detectPhoneFraud(phoneNumber, callContent = null) {
    try {
      const analysis = {
        phoneNumber: phoneNumber,
        timestamp: new Date(),
        riskScore: 0,
        riskLevel: 'LOW',
        reasons: [],
        recommendations: [],
        patterns: []
      };

      // 检查黑名单
      const blacklistMatch = this.blacklist.get(`phone:${phoneNumber}`);
      if (blacklistMatch) {
        analysis.riskScore += 100;
        analysis.riskLevel = 'CRITICAL';
        analysis.reasons.push('电话号码在诈骗黑名单中');
        analysis.recommendations.push('立即挂断电话，不要提供任何个人信息');
      }

      // 检查白名单
      const whitelistMatch = this.whitelist.get(`phone:${phoneNumber}`);
      if (whitelistMatch && !blacklistMatch) {
        analysis.riskScore = 0;
        analysis.riskLevel = 'LOW';
        analysis.reasons.push('电话号码在可信白名单中');
        return analysis;
      }

      // 号码格式分析
      const numberFormatAnalysis = this.analyzePhoneNumberFormat(phoneNumber);
      analysis.riskScore += numberFormatAnalysis.riskScore;
      analysis.reasons.push(...numberFormatAnalysis.reasons);

      // 内容分析（如果有通话内容）
      if (callContent) {
        const contentAnalysis = this.analyzeCallContent(callContent);
        analysis.riskScore += contentAnalysis.riskScore;
        analysis.reasons.push(...contentAnalysis.reasons);
        analysis.patterns.push(...contentAnalysis.patterns);
      }

      // 拨打频率分析
      const frequencyAnalysis = this.analyzeCallFrequency(phoneNumber);
      analysis.riskScore += frequencyAnalysis.riskScore;
      analysis.reasons.push(...frequencyAnalysis.reasons);

      // 地理位置分析
      const locationAnalysis = this.analyzePhoneLocation(phoneNumber);
      analysis.riskScore += locationAnalysis.riskScore;
      analysis.reasons.push(...locationAnalysis.reasons);

      // 确定风险等级
      analysis.riskLevel = this.determineRiskLevel(analysis.riskScore);

      // 生成建议
      analysis.recommendations = this.generateFraudRecommendations(analysis);

      return {
        success: true,
        data: analysis
      };
    } catch (error) {
      console.error('电话诈骗检测失败:', error);
      throw new Error(`电话诈骗检测失败: ${error.message}`);
    }
  }

  /**
   * 检测短信诈骗
   */
  async detectSMSFraud(smsContent, senderNumber = null, links = []) {
    try {
      const analysis = {
        smsContent: smsContent,
        senderNumber: senderNumber,
        links: links,
        timestamp: new Date(),
        riskScore: 0,
        riskLevel: 'LOW',
        reasons: [],
        recommendations: [],
        detectedPatterns: []
      };

      // 检查发送号码
      if (senderNumber) {
        const senderAnalysis = await this.detectPhoneFraud(senderNumber);
        if (senderAnalysis.data.riskScore > 50) {
          analysis.riskScore += senderAnalysis.data.riskScore * 0.5;
          analysis.reasons.push(`可疑发送号码: ${senderAnalysis.data.reasons.join(', ')}`);
        }
      }

      // 内容特征分析
      const contentAnalysis = this.analyzeSMSContent(smsContent);
      analysis.riskScore += contentAnalysis.riskScore;
      analysis.reasons.push(...contentAnalysis.reasons);
      analysis.detectedPatterns.push(...contentAnalysis.patterns);

      // 链接分析
      if (links.length > 0) {
        const linkAnalysis = this.analyzeLinks(links);
        analysis.riskScore += linkAnalysis.riskScore;
        analysis.reasons.push(...linkAnalysis.reasons);
      }

      // 紧迫性分析
      const urgencyAnalysis = this.analyzeUrgency(smsContent);
      analysis.riskScore += urgencyAnalysis.riskScore;

      // 诱导性分析
      const诱ignmentAnalysis = this.analyze诱ignment(smsContent);
      analysis.riskScore += 诱ignmentAnalysis.riskScore;

      // 确定风险等级
      analysis.riskLevel = this.determineRiskLevel(analysis.riskScore);

      // 生成建议
      analysis.recommendations = this.generateSMSRecommendations(analysis);

      return {
        success: true,
        data: analysis
      };
    } catch (error) {
      console.error('短信诈骗检测失败:', error);
      throw new Error(`短信诈骗检测失败: ${error.message}`);
    }
  }

  /**
   * 检测网站钓鱼
   */
  async detectPhishingWebsite(url, content = null) {
    try {
      const analysis = {
        url: url,
        content: content,
        timestamp: new Date(),
        riskScore: 0,
        riskLevel: 'LOW',
        reasons: [],
        recommendations: [],
        urlFeatures: {},
        contentFeatures: {}
      };

      // URL分析
      const urlAnalysis = this.analyzeURL(url);
      analysis.riskScore += urlAnalysis.riskScore;
      analysis.reasons.push(...urlAnalysis.reasons);
      analysis.urlFeatures = urlAnalysis.features;

      // 检查黑名单
      const blacklistMatch = this.blacklist.get(`url:${url}`);
      if (blacklistMatch) {
        analysis.riskScore += 100;
        analysis.riskLevel = 'CRITICAL';
        analysis.reasons.push('网站在钓鱼黑名单中');
        analysis.recommendations.push('立即关闭网站，不要提供任何信息');
      }

      // 检查白名单
      const whitelistMatch = this.whitelist.get(`url:${url}`);
      if (whitelistMatch && !blacklistMatch) {
        analysis.riskScore = 0;
        analysis.riskLevel = 'LOW';
        analysis.reasons.push('网站在可信白名单中');
        return analysis;
      }

      // 内容分析
      if (content) {
        const contentAnalysis = this.analyzeWebsiteContent(content);
        analysis.riskScore += contentAnalysis.riskScore;
        analysis.reasons.push(...contentAnalysis.reasons);
        analysis.contentFeatures = contentAnalysis.features;
      }

      // SSL证书分析
      const sslAnalysis = await this.analyzeSSLCertificate(url);
      analysis.riskScore += sslAnalysis.riskScore;
      analysis.reasons.push(...sslAnalysis.reasons);

      // 确定风险等级
      analysis.riskLevel = this.determineRiskLevel(analysis.riskScore);

      // 生成建议
      analysis.recommendations = this.generatePhishingRecommendations(analysis);

      return {
        success: true,
        data: analysis
      };
    } catch (error) {
      console.error('网站钓鱼检测失败:', error);
      throw new Error(`网站钓鱼检测失败: ${error.message}`);
    }
  }

  /**
   * 实时诈骗监控
   */
  async realTimeFraudMonitoring(event) {
    try {
      const monitoring = {
        eventId: this.generateId(),
        eventType: event.type, // phone, sms, email, website
        timestamp: new Date(),
        status: 'processing',
        alert: null,
        analysis: null
      };

      // 根据事件类型进行检测
      switch (event.type) {
        case 'phone':
          monitoring.analysis = await this.detectPhoneFraud(
            event.phoneNumber,
            event.content
          );
          break;
        case 'sms':
          monitoring.analysis = await this.detectSMSFraud(
            event.content,
            event.senderNumber,
            event.links
          );
          break;
        case 'website':
          monitoring.analysis = await this.detectPhishingWebsite(
            event.url,
            event.content
          );
          break;
        default:
          throw new Error(`不支持的事件类型: ${event.type}`);
      }

      // 生成告警
      if (monitoring.analysis.data.riskScore >= this.riskThresholds.HIGH) {
        monitoring.alert = {
          level: monitoring.analysis.data.riskLevel,
          message: this.generateAlertMessage(monitoring.analysis.data),
          actions: this.getRecommendedActions(monitoring.analysis.data),
          timestamp: new Date()
        };

        // 发送告警通知
        await this.sendFraudAlert(monitoring.alert);
      }

      monitoring.status = 'completed';

      return {
        success: true,
        data: monitoring
      };
    } catch (error) {
      console.error('实时诈骗监控失败:', error);
      throw new Error(`实时诈骗监控失败: ${error.message}`);
    }
  }

  /**
   * 诈骗举报处理
   */
  async reportFraud(reportData) {
    try {
      const report = {
        id: this.generateId(),
        reporter: reportData.reporter,
        type: reportData.type,
        contact: reportData.contact,
        description: reportData.description,
        evidence: reportData.evidence || [],
        timestamp: new Date(),
        status: 'pending',
        verified: false
      };

      this.fraudReports.push(report);

      // 处理举报数据
      await this.processFraudReport(report);

      return {
        success: true,
        data: {
          reportId: report.id,
          status: report.status,
          message: '举报已提交，我们将尽快处理'
        }
      };
    } catch (error) {
      console.error('诈骗举报处理失败:', error);
      throw new Error(`诈骗举报处理失败: ${error.message}`);
    }
  }

  /**
   * 诈骗趋势分析
   */
  async analyzeFraudTrends(timeRange = 'month') {
    try {
      const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
      const endDate = new Date();
      const startDate = subDays(endDate, days);

      // 模拟趋势数据
      const trends = {
        timeRange: timeRange,
        startDate: startDate,
        endDate: endDate,
        statistics: {
          totalReports: Math.floor(Math.random() * 100) + 50,
          phoneFraud: Math.floor(Math.random() * 60) + 20,
          smsFraud: Math.floor(Math.random() * 40) + 15,
          websiteFraud: Math.floor(Math.random() * 30) + 10,
          blockedAttempts: Math.floor(Math.random() * 200) + 100
        },
        trends: [],
        topFraudTypes: [],
        geographicDistribution: {},
        peakTimes: []
      };

      // 生成趋势数据
      for (let i = 0; i < days; i++) {
        const date = subDays(endDate, days - i - 1);
        trends.trends.push({
          date: format(date, 'yyyy-MM-dd'),
          phoneFraud: Math.floor(Math.random() * 20) + 5,
          smsFraud: Math.floor(Math.random() * 15) + 3,
          websiteFraud: Math.floor(Math.random() * 10) + 2,
          total: 0
        });
        trends.trends[trends.trends.length - 1].total =
          trends.trends[trends.trends.length - 1].phoneFraud +
          trends.trends[trends.trends.length - 1].smsFraud +
          trends.trends[trends.trends.length - 1].websiteFraud;
      }

      // 生成诈骗类型统计
      trends.topFraudTypes = [
        { type: '冒充客服', count: Math.floor(Math.random() * 50) + 20, percentage: 0 },
        { type: '中奖诈骗', count: Math.floor(Math.random() * 40) + 15, percentage: 0 },
        { type: '钓鱼网站', count: Math.floor(Math.random() * 30) + 10, percentage: 0 },
        { type: '投资理财', count: Math.floor(Math.random() * 25) + 8, percentage: 0 },
        { type: '情感诈骗', count: Math.floor(Math.random() * 20) + 5, percentage: 0 }
      ];

      // 计算百分比
      const total = trends.topFraudTypes.reduce((sum, item) => sum + item.count, 0);
      trends.topFraudTypes.forEach(item => {
        item.percentage = (item.count / total * 100).toFixed(1);
      });

      // 生成地理分布
      trends.geographicDistribution = {
        '华北': Math.floor(Math.random() * 30) + 10,
        '华东': Math.floor(Math.random() * 40) + 20,
        '华南': Math.floor(Math.random() * 35) + 15,
        '华中': Math.floor(Math.random() * 25) + 10,
        '西南': Math.floor(Math.random() * 20) + 8,
        '西北': Math.floor(Math.random() * 15) + 5,
        '东北': Math.floor(Math.random() * 10) + 3
      };

      // 生成高峰时间
      trends.peakTimes = [
        { hour: 9, fraudCount: Math.floor(Math.random() * 10) + 5 },
        { hour: 12, fraudCount: Math.floor(Math.random() * 8) + 3 },
        { hour: 15, fraudCount: Math.floor(Math.random() * 12) + 6 },
        { hour: 18, fraudCount: Math.floor(Math.random() * 15) + 8 },
        { hour: 21, fraudCount: Math.floor(Math.random() * 20) + 10 }
      ];

      return {
        success: true,
        data: trends
      };
    } catch (error) {
      console.error('诈骗趋势分析失败:', error);
      throw new Error(`诈骗趋势分析失败: ${error.message}`);
    }
  }

  /**
   * 辅助分析方法
   */
  analyzePhoneNumberFormat(phoneNumber) {
    const analysis = {
      riskScore: 0,
      reasons: []
    };

    // 检查是否为特殊号码段
    const specialPrefixes = ['400', '800', '170', '171', '165', '167'];
    const hasSpecialPrefix = specialPrefixes.some(prefix => phoneNumber.includes(prefix));

    if (hasSpecialPrefix) {
      analysis.riskScore += 20;
      analysis.reasons.push('使用特殊号码段（400/800等）');
    }

    // 检查号码长度异常
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length < 7 || cleanNumber.length > 11) {
      analysis.riskScore += 30;
      analysis.reasons.push('号码长度异常');
    }

    // 检查是否为座机号码
    if (cleanNumber.length === 7 || cleanNumber.length === 8) {
      analysis.riskScore += 15;
      analysis.reasons.push('可能是座机号码');
    }

    return analysis;
  }

  analyzeCallContent(content) {
    const analysis = {
      riskScore: 0,
      reasons: [],
      patterns: []
    };

    // 关键词检测
    this.fraudPatterns.phonePatterns.forEach(pattern => {
      if (pattern.keywords) {
        const foundKeywords = pattern.keywords.filter(keyword =>
          content.toLowerCase().includes(keyword.toLowerCase())
        );

        if (foundKeywords.length > 0) {
          analysis.riskScore += pattern.riskScore;
          analysis.reasons.push(`包含诈骗关键词: ${foundKeywords.join(', ')}`);
          analysis.patterns.push({
            type: 'keywords',
            pattern: pattern.description,
            matches: foundKeywords
          });
        }
      }
    });

    // 特征检测
    this.fraudPatterns.phonePatterns.forEach(pattern => {
      if (pattern.characteristics) {
        const foundCharacteristics = pattern.characteristics.filter(char =>
          content.includes(char)
        );

        if (foundCharacteristics.length > 0) {
          analysis.riskScore += pattern.riskScore;
          analysis.reasons.push(`包含诈骗话术特征: ${foundCharacteristics.join(', ')}`);
          analysis.patterns.push({
            type: 'characteristics',
            pattern: pattern.description,
            matches: foundCharacteristics
          });
        }
      }
    });

    return analysis;
  }

  analyzeCallFrequency(phoneNumber) {
    // 模拟频率分析
    const analysis = {
      riskScore: 0,
      reasons: []
    };

    // 在实际项目中，这里会查询数据库获取该号码的呼叫频率
    const callCount = Math.floor(Math.random() * 10);

    if (callCount > 5) {
      analysis.riskScore += 25;
      analysis.reasons.push(`近期呼叫频率异常: ${callCount}次`);
    }

    return analysis;
  }

  analyzePhoneLocation(phoneNumber) {
    const analysis = {
      riskScore: 0,
      reasons: []
    };

    // 检查号码归属地
    const mobilePrefixes = ['138', '139', '150', '151', '152', '157', '158', '159', '182', '183', '184', '187', '188', '198'];
    const cleanNumber = phoneNumber.replace(/\D/g, '').substring(0, 7);

    const isMobile = mobilePrefixes.some(prefix => cleanNumber.startsWith(prefix));

    if (!isMobile && cleanNumber.length >= 7 && cleanNumber.length <= 8) {
      analysis.riskScore += 10;
      analysis.reasons.push('可能是座机号码，需要核实身份');
    }

    return analysis;
  }

  analyzeSMSContent(content) {
    const analysis = {
      riskScore: 0,
      reasons: [],
      patterns: []
    };

    // 短信特有模式检测
    this.fraudPatterns.smsPatterns.forEach(pattern => {
      if (pattern.pattern) {
        if (pattern.pattern.test(content)) {
          analysis.riskScore += pattern.riskScore;
          analysis.reasons.push(pattern.description);
          analysis.patterns.push({
            type: 'pattern',
            pattern: pattern.description
          });
        }
      }
    });

    // 关键词检测
    this.fraudPatterns.smsPatterns.forEach(pattern => {
      if (pattern.keywords) {
        const foundKeywords = pattern.keywords.filter(keyword =>
          content.toLowerCase().includes(keyword.toLowerCase())
        );

        if (foundKeywords.length > 0) {
          analysis.riskScore += pattern.riskScore;
          analysis.reasons.push(`包含诱导性关键词: ${foundKeywords.join(', ')}`);
          analysis.patterns.push({
            type: 'keywords',
            pattern: pattern.description,
            matches: foundKeywords
          });
        }
      }
    });

    // 特征检测
    this.fraudPatterns.smsPatterns.forEach(pattern => {
      if (pattern.characteristics) {
        const foundCharacteristics = pattern.characteristics.filter(char =>
          content.includes(char)
        );

        if (foundCharacteristics.length > 0) {
          analysis.riskScore += pattern.riskScore;
          analysis.reasons.push(`包含短信诈骗特征: ${foundCharacteristics.join(', ')}`);
          analysis.patterns.push({
            type: 'characteristics',
            pattern: pattern.description,
            matches: foundCharacteristics
          });
        }
      }
    });

    return analysis;
  }

  analyzeLinks(links) {
    const analysis = {
      riskScore: 0,
      reasons: []
    };

    links.forEach(link => {
      // 检查链接安全性
      try {
        const url = new URL(link);

        // 检查协议
        if (url.protocol !== 'https:') {
          analysis.riskScore += 20;
          analysis.reasons.push('使用不安全的HTTP协议');
        }

        // 检查域名
        if (url.hostname.length < 3) {
          analysis.riskScore += 30;
          analysis.reasons.push('域名长度异常');
        }

        // 检查可疑域名
        const suspiciousDomains = ['bit.ly', 'tinyurl.com', 'short.link'];
        if (suspiciousDomains.some(domain => url.hostname.includes(domain))) {
          analysis.riskScore += 15;
          analysis.reasons.push('使用短链接服务');
        }

      } catch (error) {
        analysis.riskScore += 25;
        analysis.reasons.push('链接格式无效');
      }
    });

    return analysis;
  }

  analyzeUrgency(content) {
    const analysis = {
      riskScore: 0
    };

    this.fraudPatterns.contentPatterns.urgency.forEach(urgency => {
      const found = urgency.keywords.filter(keyword =>
        content.toLowerCase().includes(keyword.toLowerCase())
      ).length;

      analysis.riskScore += found * urgency.riskScore;
    });

    return analysis;
  }

  analyze诱ignment(content) {
    // 诱导性分析
    const诱ignmentWords = ['免费', '领取', '点击', '立即', '限时', '优惠', '特价'];
    const foundWords = 诱ignmentWords.filter(word =>
      content.toLowerCase().includes(word)
    );

    return {
      riskScore: foundWords.length * 15
    };
  }

  analyzeURL(url) {
    const analysis = {
      riskScore: 0,
      reasons: [],
      features: {}
    };

    try {
      const parsedUrl = new URL(url);

      // URL长度检查
      if (parsedUrl.href.length > 100) {
        analysis.riskScore += 15;
        analysis.reasons.push('URL长度异常');
      }

      // 域名相似度检查
      const trustedDomains = ['gov.cn', 'bank', 'alipay', 'weixin', 'qq'];
      const domainCheck = trustedDomains.some(trusted =>
        parsedUrl.hostname.includes(trusted)
      );

      if (!domainCheck) {
        // 检查是否为仿冒域名
        const suspiciousPatterns = [/[\d]/g, /-/g];
        const suspiciousCount = suspiciousPatterns.reduce((count, pattern) =>
          count + (parsedUrl.hostname.match(pattern) || []).length, 0
        );

        if (suspiciousCount > 2) {
          analysis.riskScore += 25;
          analysis.reasons.push('域名包含可疑字符');
        }
      }

      // 子域名检查
      if (parsedUrl.hostname.split('.').length > 4) {
        analysis.riskScore += 10;
        analysis.reasons.push('子域名层级过多');
      }

      // 特征记录
      analysis.features = {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        pathLength: parsedUrl.pathname.length,
        hasQuery: parsedUrl.search.length > 0,
        hasHash: parsedUrl.hash.length > 0
      };

    } catch (error) {
      analysis.riskScore += 50;
      analysis.reasons.push('URL格式无效');
    }

    return analysis;
  }

  analyzeWebsiteContent(content) {
    const analysis = {
      riskScore: 0,
      reasons: [],
      features: {}
    };

    // 内容长度检查
    if (content.length < 100) {
      analysis.riskScore += 20;
      analysis.reasons.push('网站内容过少');
    }

    // 检查关键词
    const phishingKeywords = ['中奖', '免费', '紧急', '立即', '限时', '验证码'];
    const foundKeywords = phishingKeywords.filter(keyword =>
      content.toLowerCase().includes(keyword.toLowerCase())
    );

    if (foundKeywords.length > 0) {
      analysis.riskScore += foundKeywords.length * 20;
      analysis.reasons.push(`包含钓鱼关键词: ${foundKeywords.join(', ')}`);
    }

    // 检查是否有输入表单
    const hasForm = /<form|<input|<button/i.test(content);
    if (hasForm) {
      analysis.riskScore += 25;
      analysis.reasons.push('网站包含输入表单');
    }

    analysis.features = {
      contentLength: content.length,
      hasForm: hasForm,
      keywordCount: foundKeywords.length
    };

    return analysis;
  }

  async analyzeSSLCertificate(url) {
    const analysis = {
      riskScore: 0,
      reasons: []
    };

    try {
      const parsedUrl = new URL(url);

      if (parsedUrl.protocol === 'https:') {
        // 在实际项目中，这里会检查SSL证书
        // 模拟SSL证书检查
        const certIssues = Math.random() > 0.7;

        if (certIssues) {
          analysis.riskScore += 30;
          analysis.reasons.push('SSL证书可能存在问题');
        }
      } else {
        analysis.riskScore += 50;
        analysis.reasons.push('网站未使用HTTPS加密');
      }
    } catch (error) {
      analysis.riskScore += 20;
      analysis.reasons.push('无法检查SSL证书');
    }

    return analysis;
  }

  determineRiskLevel(score) {
    if (score >= this.riskThresholds.CRITICAL) return 'CRITICAL';
    if (score >= this.riskThresholds.HIGH) return 'HIGH';
    if (score >= this.riskThresholds.MEDIUM) return 'MEDIUM';
    return 'LOW';
  }

  generateFraudRecommendations(analysis) {
    const recommendations = [];

    switch (analysis.riskLevel) {
      case 'CRITICAL':
        recommendations.push('立即挂断电话，不要提供任何信息');
        recommendations.push('拨打110报警');
        recommendations.push('向运营商举报诈骗号码');
        break;
      case 'HIGH':
        recommendations.push('保持警惕，不要轻易相信对方的话');
        recommendations.push('核实对方身份，主动联系官方机构');
        recommendations.push('不要透露个人信息和银行账户');
        break;
      case 'MEDIUM':
        recommendations.push('谨慎对待，多方核实信息真实性');
        recommendations.push('注意保护个人信息');
        break;
      case 'LOW':
        recommendations.push('保持基本防范意识');
        break;
    }

    return recommendations;
  }

  generateSMSRecommendations(analysis) {
    const recommendations = [];

    if (analysis.riskScore >= this.riskThresholds.HIGH) {
      recommendations.push('不要点击短信中的链接');
      recommendations.push('不要回复短信');
      recommendations.push('将短信标记为垃圾信息');
      recommendations.push('向运营商举报诈骗短信');
    } else if (analysis.riskScore >= this.riskThresholds.MEDIUM) {
      recommendations.push('谨慎对待短信内容');
      recommendations.push('核实信息来源');
    } else {
      recommendations.push('保持基本警惕');
    }

    return recommendations;
  }

  generatePhishingRecommendations(analysis) {
    const recommendations = [];

    if (analysis.riskScore >= this.riskThresholds.HIGH) {
      recommendations.push('立即关闭网站');
      recommendations.push('不要输入任何信息');
      recommendations.push('清除浏览器缓存和Cookie');
      recommendations.push('运行杀毒软件扫描');
      recommendations.push('向网络安全部门举报');
    } else if (analysis.riskScore >= this.riskThresholds.MEDIUM) {
      recommendations.push('谨慎浏览网站');
      recommendations.push('检查SSL证书');
      recommendations.push('核实网站真实性');
    }

    return recommendations;
  }

  generateAlertMessage(analysis) {
    const levelMap = {
      'LOW': '低风险',
      'MEDIUM': '中等风险',
      'HIGH': '高风险',
      'CRITICAL': '紧急风险'
    };

    const message = `检测到${levelMap[analysis.riskLevel]}：${analysis.reasons.join('，')}`;
    return message;
  }

  getRecommendedActions(analysis) {
    const actions = [];

    switch (analysis.riskLevel) {
      case 'CRITICAL':
        actions.push('block_number', 'notify_user', 'log_incident', 'notify_authorities');
        break;
      case 'HIGH':
        actions.push('warn_user', 'log_incident', 'monitor_activity');
        break;
      case 'MEDIUM':
        actions.push('monitor_activity', 'log_activity');
        break;
      case 'LOW':
        actions.push('log_activity');
        break;
    }

    return actions;
  }

  async sendFraudAlert(alert) {
    try {
      console.log('发送诈骗告警:', alert);
      // 在实际项目中，这里会：
      // 1. 发送邮件通知
      // 2. 发送短信通知
      // 3. 推送到监控中心
      // 4. 记录到数据库
      // 5. 触发自动响应机制

      return {
        success: true,
        messageId: this.generateId(),
        sentAt: new Date()
      };
    } catch (error) {
      console.error('发送诈骗告警失败:', error);
      throw new Error(`发送诈骗告警失败: ${error.message}`);
    }
  }

  async processFraudReport(report) {
    try {
      // 处理举报数据
      console.log('处理诈骗举报:', report);

      // 1. 验证举报信息
      const isValid = this.validateReport(report);

      // 2. 更新黑名单/白名单
      if (isValid) {
        await this.updateFraudBlacklist(report);
      }

      // 3. 生成举报统计
      const statistics = await this.generateReportStatistics(report);

      // 4. 更新举报状态
      report.status = isValid ? 'verified' : 'invalid';
      report.verified = isValid;
      report.processedAt = new Date();

      return statistics;
    } catch (error) {
      console.error('处理诈骗举报失败:', error);
      report.status = 'error';
      throw new Error(`处理诈骗举报失败: ${error.message}`);
    }
  }

  validateReport(report) {
    // 简化的验证逻辑
    return report.type && report.contact && report.description &&
           report.description.length > 10;
  }

  async updateFraudBlacklist(report) {
    // 根据举报信息更新黑名单
    console.log('更新诈骗黑名单');
  }

  async generateReportStatistics(report) {
    return {
      totalReports: this.fraudReports.length,
      reportsByType: this.groupReportsByType(),
      recentReports: this.getRecentReports(7)
    };
  }

  groupReportsByType() {
    const grouped = {};
    this.fraudReports.forEach(report => {
      if (!grouped[report.type]) {
        grouped[report.type] = 0;
      }
      grouped[report.type]++;
    });
    return grouped;
  }

  getRecentReports(days) {
    const cutoffDate = subDays(new Date(), days);
    return this.fraudReports.filter(report =>
      report.timestamp >= cutoffDate
    );
  }

  generateId() {
    return crypto.randomBytes(8).toString('hex');
  }
}

module.exports = new AntiFraudService();