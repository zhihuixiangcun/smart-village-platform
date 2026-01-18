/**
 * 内容审核服务
 * 提供AI生成内容的审核、敏感词过滤、提示词注入防护
 */

const logger = require('../utils/logger');

class ContentModerationService {
  constructor() {
    // 敏感词列表（可根据需要扩展）
    this.sensitiveWords = [
      // 政治敏感词
      '反革命', '暴动', '颠覆', '分裂',
      
      // 暴力内容
      '杀', '炸弹', '爆炸', '袭击', '暴力',
      
      // 色情内容
      '裸体', '性交', '色情',
      
      // 诈骗相关
      '刷单', '洗钱', '诈骗',
      
      // 非法活动
      '毒品', '赌', '走私'
    ];

    // 提示词注入检测模式
    this.promptInjectionPatterns = [
      /ignore\s+previous\s+instructions/i,
      /system:\s*you\s+are/i,
      /forget\s+everything/i,
      /disregard\s+all\s+previous\s+instructions/i,
      /from\s+now\s+on\s*you\s+are/i,
      /act\s+as\s+if\s*you\s+are\s+/i,
      /override\s+your\s+programming/i
    ];

    // 恶意内容模式
    this.maliciousContentPatterns = [
      // 代码执行尝试
      /```[\s\S]*?eval[\s\S]*?```/,
      /```[\s\S]*?exec[\s\S]*?```/,
      /```[\s\S]*?system\s*\([\s\S]*?```/,
      
      // XSS尝试
      /<script[^>]*>.*?<\/script>/i,
      /javascript:/i,
      /onerror\s*=/i,
      /onload\s*=/i
    ];

    // 内容类型白名单
    this.allowedContentTypes = [
      'text/plain',
      'text/markdown',
      'application/json'
    ];
  }

  /**
   * 审核AI生成的内容
   * @param {String} content - 待审核内容
   * @param {Object} options - 审核选项
   * @returns {Object} 审核结果
   */
  moderateContent(content, options = {}) {
    try {
      const {
        checkSensitiveWords = true,
        checkPromptInjection = true,
        checkMaliciousContent = true,
        maxLength = 10000,
        strict = false
      } = options;

      const result = {
        approved: true,
        flagged: false,
        warnings: [],
        errors: [],
        riskLevel: 'low',
        sanitizedContent: content
      };

      // 1. 基础验证
      if (!content || typeof content !== 'string') {
        result.approved = false;
        result.errors.push('内容为空或格式错误');
        return result;
      }

      // 检查内容长度
      if (content.length > maxLength) {
        result.errors.push(`内容长度超过限制（最大${maxLength}字符）`);
        result.approved = false;
        return result;
      }

      // 2. 检测敏感词
      if (checkSensitiveWords) {
        const sensitiveResult = this.checkSensitiveWords(content);
        if (sensitiveResult.found) {
          result.flagged = true;
          result.warnings.push(...sensitiveResult.warnings);
          result.riskLevel = sensitiveResult.riskLevel;
          
          if (strict || sensitiveResult.riskLevel === 'high') {
            result.approved = false;
          }
        }
      }

      // 3. 检测提示词注入
      if (checkPromptInjection) {
        const injectionResult = this.checkPromptInjection(content);
        if (injectionResult.found) {
          result.flagged = true;
          result.errors.push('检测到提示词注入攻击');
          result.riskLevel = 'high';
          result.approved = false;
        }
      }

      // 4. 检测恶意内容
      if (checkMaliciousContent) {
        const maliciousResult = this.checkMaliciousContent(content);
        if (maliciousResult.found) {
          result.flagged = true;
          result.errors.push(...maliciousResult.errors);
          result.riskLevel = 'high';
          result.approved = false;
        }
      }

      // 5. 如果审核不通过，返回净化后的内容
      if (!result.approved || result.flagged) {
        result.sanitizedContent = this.sanitizeContent(content);
      }

      // 6. 记录审核日志
      this.logModerationResult(content, result);

      return result;

    } catch (error) {
      logger.error('内容审核失败:', error);
      return {
        approved: false,
        flagged: true,
        errors: ['审核过程出错'],
        riskLevel: 'high'
      };
    }
  }

  /**
   * 检查敏感词
   * @param {String} content - 待检查内容
   * @returns {Object} 检查结果
   */
  checkSensitiveWords(content) {
    const result = {
      found: false,
      warnings: [],
      matchedWords: [],
      riskLevel: 'low'
    };

    let matchCount = 0;

    for (const word of this.sensitiveWords) {
      const regex = new RegExp(word, 'gi');
      const matches = content.match(regex);
      
      if (matches && matches.length > 0) {
        result.found = true;
        result.matchedWords.push({ word, count: matches.length });
        matchCount += matches.length;
      }
    }

    if (result.found) {
      result.warnings.push(`发现${matchCount}处敏感词: ${result.matchedWords.map(w => w.word).join(', ')}`);
      
      // 根据敏感词数量确定风险等级
      if (matchCount >= 5) {
        result.riskLevel = 'high';
      } else if (matchCount >= 3) {
        result.riskLevel = 'medium';
      }
    }

    return result;
  }

  /**
   * 检查提示词注入
   * @param {String} content - 待检查内容
   * @returns {Object} 检查结果
   */
  checkPromptInjection(content) {
    const result = {
      found: false,
      patterns: [],
      riskLevel: 'high'
    };

    for (const pattern of this.promptInjectionPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        result.found = true;
        result.patterns.push({
          pattern: pattern.toString(),
          matches: matches
        });
      }
    }

    return result;
  }

  /**
   * 检查恶意内容
   * @param {String} content - 待检查内容
   * @returns {Object} 检查结果
   */
  checkMaliciousContent(content) {
    const result = {
      found: false,
      errors: [],
      riskLevel: 'high'
    };

    for (const pattern of this.maliciousContentPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        result.found = true;
        result.errors.push(`检测到潜在恶意内容: ${matches.join(', ')}`);
      }
    }

    return result;
  }

  /**
   * 净化内容
   * @param {String} content - 待净化内容
   * @returns {String} 净化后的内容
   */
  sanitizeContent(content) {
    let sanitized = content;

    // 移除HTML标签（防止XSS）
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // 移除JavaScript代码
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/onerror\s*=/gi, '');
    sanitized = sanitized.replace(/onload\s*=/gi, '');

    // 转义特殊字符
    sanitized = sanitized.replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    return sanitized;
  }

  /**
   * 审核AI请求的提示词
   * @param {String} prompt - 用户提示词
   * @returns {Object} 审核结果
   */
  moderatePrompt(prompt) {
    const result = this.moderateContent(prompt, {
      checkSensitiveWords: true,
      checkPromptInjection: true,
      checkMaliciousContent: true,
      maxLength: 5000,
      strict: true
    });

    // 提示词审核额外检查
    if (result.approved) {
      // 检查是否尝试越狱
      const jailbreakPatterns = [
        /jailbreak/i,
        /bypass\s+safety/i,
        /override\s+safety\s+protocols/i,
        /ignore\s+safety\s+guidelines/i
      ];

      for (const pattern of jailbreakPatterns) {
        if (pattern.test(prompt)) {
          result.approved = false;
          result.errors.push('检测到尝试绕过安全机制');
          result.riskLevel = 'high';
          break;
        }
      }
    }

    return result;
  }

  /**
   * 记录审核结果日志
   * @param {String} content - 原始内容
   * @param {Object} result - 审核结果
   */
  logModerationResult(content, result) {
    logger.info('内容审核完成', {
      approved: result.approved,
      flagged: result.flagged,
      riskLevel: result.riskLevel,
      contentLength: content.length,
      warningCount: result.warnings.length,
      errorCount: result.errors.length
    });

    if (!result.approved || result.flagged) {
      logger.warn('内容审核失败', {
        warnings: result.warnings,
        errors: result.errors,
        contentPreview: content.substring(0, 100)
      });
    }
  }

  /**
   * 添加自定义敏感词
   * @param {Array} words - 敏感词数组
   */
  addSensitiveWords(words) {
    if (Array.isArray(words)) {
      this.sensitiveWords.push(...words);
      logger.info(`添加${words.length}个敏感词`);
    }
  }

  /**
   * 移除敏感词
   * @param {Array} words - 要移除的敏感词数组
   */
  removeSensitiveWords(words) {
    if (Array.isArray(words)) {
      this.sensitiveWords = this.sensitiveWords.filter(word => !words.includes(word));
      logger.info(`移除${words.length}个敏感词`);
    }
  }

  /**
   * 获取审核统计
   * @returns {Object} 统计信息
   */
  getModerationStats() {
    return {
      sensitiveWordsCount: this.sensitiveWords.length,
      promptInjectionPatternsCount: this.promptInjectionPatterns.length,
      maliciousContentPatternsCount: this.maliciousContentPatterns.length,
      allowedContentTypes: this.allowedContentTypes
    };
  }
}

// 创建单例实例
const contentModerationService = new ContentModerationService();

module.exports = contentModerationService;
