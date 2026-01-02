/**
 * 内容审核服务
 * 支持敏感词过滤、AI内容审核
 */

class ModerationService {
  constructor() {
    // 敏感词库（实际项目中应该从数据库或配置文件加载）
    this.sensitiveWords = new Set([
      // 政治敏感词
      // 暴力/色情词汇
      // 诈骗相关
      // 其他不当内容
    ]);

    // 正则表达式模式
    this.patterns = {
      phone: /1[3-9]\d{9}/g,
      idCard: /\d{17}[\dXx]/g,
      url: /https?:\/\/[^\s]+/g,
      email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    };

    this.aiEnabled = process.env.AI_MODERATION_ENABLED === 'true';
  }

  /**
   * 审核内容
   */
  async moderateContent(content) {
    const result = {
      status: 'approved',
      riskLevel: 'low',
      sensitiveWords: [],
      detectedIssues: [],
      aiScore: 100
    };

    // 1. 文本内容审核
    if (content.text) {
      const textResult = this.moderateText(content.text);
      result.sensitiveWords.push(...textResult.sensitiveWords);
      result.detectedIssues.push(...textResult.issues);
    }

    // 2. 检测个人信息泄露
    const privacyResult = this.detectPrivacyLeak(content);
    result.detectedIssues.push(...privacyResult);

    // 3. AI审核（如果启用）
    if (this.aiEnabled) {
      const aiResult = await this.aiModerate(content);
      result.aiScore = aiResult.score;
      result.riskLevel = aiResult.riskLevel;

      if (aiResult.shouldReject) {
        result.status = 'rejected';
        result.detectedIssues.push({
          type: 'ai_rejection',
          message: aiResult.reason
        });
      }
    }

    // 4. 确定最终状态
    if (result.sensitiveWords.length > 0 || result.detectedIssues.length > 0) {
      result.status = result.detectedIssues.some(i => i.severity === 'high')
        ? 'rejected'
        : 'flagged';
      result.riskLevel = result.detectedIssues.some(i => i.severity === 'high')
        ? 'high'
        : 'medium';
    }

    return result;
  }

  /**
   * 文本审核
   */
  moderateText(text) {
    const result = {
      sensitiveWords: [],
      issues: []
    };

    // 1. 敏感词检测
    const words = text.split(/[\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-./:;<=>?@[\]^_`{|}~，。！？；：""''【】（）]/);
    words.forEach(word => {
      if (this.sensitiveWords.has(word)) {
        result.sensitiveWords.push(word);
      }
    });

    // 2. 正则模式检测
    for (const [patternName, pattern] of Object.entries(this.patterns)) {
      const matches = text.match(pattern);
      if (matches) {
        result.issues.push({
          type: patternName,
          severity: patternName === 'phone' || patternName === 'idCard' ? 'high' : 'medium',
          matches: matches,
          message: `检测到${this.getPatternName(patternName)}信息`
        });
      }
    }

    return result;
  }

  /**
   * 检测隐私泄露
   */
  detectPrivacyLeak(content) {
    const issues = [];

    // 检测身份证号
    if (content.text && this.patterns.idCard.test(content.text)) {
      issues.push({
        type: 'id_card_leak',
        severity: 'high',
        message: '请不要在公开内容中泄露身份证号'
      });
    }

    // 检测手机号
    if (content.text && this.patterns.phone.test(content.text)) {
      issues.push({
        type: 'phone_leak',
        severity: 'medium',
        message: '请注意保护个人隐私'
      });
    }

    return issues;
  }

  /**
   * AI内容审核（调用外部AI服务）
   */
  async aiModerate(content) {
    // 这里可以接入阿里云内容安全、腾讯云天御等服务
    // 简化实现
    return {
      score: 95,
      riskLevel: 'low',
      shouldReject: false,
      reason: null
    };
  }

  /**
   * 获取模式名称
   */
  getPatternName(pattern) {
    const names = {
      phone: '电话号码',
      idCard: '身份证号',
      url: '网址链接',
      email: '邮箱地址'
    };
    return names[pattern] || pattern;
  }

  /**
   * 脱敏处理
   */
  maskSensitiveInfo(text) {
    let masked = text;

    // 脱敏手机号
    masked = masked.replace(this.patterns.phone, (match) => {
      return match.substring(0, 3) + '****' + match.substring(7);
    });

    // 脱敏身份证号
    masked = masked.replace(this.patterns.idCard, (match) => {
      return match.substring(0, 6) + '********' + match.substring(14);
    });

    return masked;
  }

  /**
   * 添加敏感词
   */
  addSensitiveWord(word) {
    this.sensitiveWords.add(word);
  }

  /**
   * 批量添加敏感词
   */
  addSensitiveWords(words) {
    words.forEach(word => this.sensitiveWords.add(word));
  }

  /**
   * 移除敏感词
   */
  removeSensitiveWord(word) {
    this.sensitiveWords.delete(word);
  }

  /**
   * 从文件加载敏感词库
   */
  async loadSensitiveWordsFromFile(filePath) {
    try {
      const fs = require('fs').promises;
      const content = await fs.readFile(filePath, 'utf-8');
      const words = content.split('\n').map(w => w.trim()).filter(w => w);
      this.addSensitiveWords(words);
      return { success: true, count: words.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// 创建单例
const moderationService = new ModerationService();

module.exports = moderationService;
