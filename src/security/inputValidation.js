const crypto = require('crypto');

/**
 * 输入验证和安全过滤中间件
 * 提供XSS防护、SQL注入防护、输入清理等功能
 */
class InputValidation {
  constructor() {
    this.config = {
      // XSS防护配置
      xss: {
        enabled: true,
        stripComments: true,
        stripEmptyTags: true,
        allowedTags: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'span', 'div'],
        allowedAttributes: {
          '*': ['class', 'id'],
          'a': ['href', 'title'],
          'img': ['src', 'alt', 'width', 'height']
        },
        urlSchemes: ['http', 'https', 'mailto', 'tel']
      },

      // SQL注入防护配置
      sql: {
        enabled: true,
        detectUnionSelect: true,
        detectComments: true,
        detectConditional: true,
        maxQueryLength: 10000,
        suspiciousPatterns: [
          /union\s+select/i,
          /drop\s+table/i,
          /delete\s+from/i,
          /insert\s+into/i,
          /update\s+.+\s+set/i,
          /exec\s*\(/i,
          /script\s*>/i,
          /--/,
          /\/\*/,
          /\*\//
        ]
      },

      // 输入限制配置
      input: {
        maxStringLength: 10000,
        maxArrayLength: 1000,
        maxObjectDepth: 10,
        allowedDataTypes: ['string', 'number', 'boolean', 'object', 'array'],
        blockSuspiciousContent: true
      },

      // 编码配置
      encoding: {
        html: true,
        url: true,
        js: true,
        css: true
      }
    };

    // 威胁模式检测
    this.threatPatterns = {
      xss: [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe[^>]*>/gi,
        /<object[^>]*>/gi,
        /<embed[^>]*>/gi,
        /<link[^>]*>/gi,
        /<meta[^>]*>/gi,
        /eval\s*\(/gi,
        /expression\s*\(/gi,
        /vbscript:/gi,
        /data:text\/html/gi
      ],
      sql: [
        /('|(\\')|(;)|(\-\-)|(\s+(or|and)\s+.+(=|like))/gi,
        /union\s+select/gi,
        /select\s+.+\s+from/gi,
        /insert\s+into/gi,
        /update\s+.+\s+set/gi,
        /delete\s+from/gi,
        /drop\s+(table|database)/gi,
        /create\s+(table|database)/gi,
        /alter\s+table/gi,
        /exec\s*\(/gi,
        /xp_cmdshell/gi,
        /sp_executesql/gi
      ],
      pathTraversal: [
        /\.\.\//g,
        /\.\.\\/g,
        /%2e%2e\//gi,
        /%2e%2e\\/gi,
        /\/etc\/passwd/gi,
        /\/windows\/system32/gi
      ],
      commandInjection: [
        /[;&|`$(){}[\]]/g,
        /rm\s+-rf/gi,
        /del\s+\/[sS]/gi,
        /cat\s+/gi,
        /type\s+/gi,
        /dir\s+/gi,
        /net\s+user/gi,
        /wget\s+/gi,
        /curl\s+/gi,
        /nc\s+/gi
      ]
    };

    // 统计信息
    this.stats = {
      totalValidations: 0,
      blockedRequests: 0,
      xssAttempts: 0,
      sqlInjectionAttempts: 0,
      pathTraversalAttempts: 0,
      commandInjectionAttempts: 0,
      cleanedInputs: 0
    };
  }

  /**
   * XSS防护中间件
   */
  xssProtection() {
    return (req, res, next) => {
      try {
        this.stats.totalValidations++;

        // 清理请求数据
        this.cleanRequestData(req);

        // 检测XSS攻击
        const xssResult = this.detectXSS(req);
        if (xssResult.detected) {
          this.stats.blockedRequests++;
          this.stats.xssAttempts++;

          return this.sendSecurityResponse(res, 'XSS_DETECTED', {
            message: '检测到XSS攻击',
            details: xssResult.details
          });
        }

        next();

      } catch (error) {
        console.error('XSS防护错误:', error);
        // 错误时允许请求通过，但记录日志
        next();
      }
    };
  }

  /**
   * SQL注入防护中间件
   */
  sqlInjectionProtection() {
    return (req, res, next) => {
      try {
        this.stats.totalValidations++;

        // 检测SQL注入攻击
        const sqlResult = this.detectSQLInjection(req);
        if (sqlResult.detected) {
          this.stats.blockedRequests++;
          this.stats.sqlInjectionAttempts++;

          return this.sendSecurityResponse(res, 'SQL_INJECTION_DETECTED', {
            message: '检测到SQL注入攻击',
            details: sqlResult.details
          });
        }

        next();

      } catch (error) {
        console.error('SQL注入防护错误:', error);
        next();
      }
    };
  }

  /**
   * 综合输入验证中间件
   */
  inputValidation() {
    return (req, res, next) => {
      try {
        this.stats.totalValidations++;

        // 清理请求数据
        this.cleanRequestData(req);

        // 执行各种安全检测
        const threats = [
          this.detectXSS(req),
          this.detectSQLInjection(req),
          this.detectPathTraversal(req),
          this.detectCommandInjection(req)
        ];

        // 检查是否发现威胁
        const detectedThreats = threats.filter(result => result.detected);

        if (detectedThreats.length > 0) {
          this.stats.blockedRequests++;

          const threatTypes = detectedThreats.map(threat => threat.type);
          return this.sendSecurityResponse(res, 'SECURITY_THREAT_DETECTED', {
            message: '检测到安全威胁',
            threats: threatTypes,
            details: detectedThreats.map(threat => threat.details)
          });
        }

        // 验证输入格式和大小
        const validationResult = this.validateInputFormat(req);
        if (!validationResult.valid) {
          return this.sendSecurityResponse(res, 'INVALID_INPUT', {
            message: '输入格式无效',
            details: validationResult.errors
          });
        }

        next();

      } catch (error) {
        console.error('输入验证错误:', error);
        next();
      }
    };
  }

  /**
   * 清理请求数据
   */
  cleanRequestData(req) {
    try {
      // 清理查询参数
      req.query = this.cleanObject(req.query);

      // 清理请求体
      if (req.body) {
        req.body = this.cleanObject(req.body);
      }

      // 清理路径参数
      if (req.params) {
        req.params = this.cleanObject(req.params);
      }

      this.stats.cleanedInputs++;

    } catch (error) {
      console.error('清理请求数据时出错:', error);
    }
  }

  /**
   * 清理对象中的所有字符串值
   */
  cleanObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const cleaned = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        cleaned[key] = this.cleanString(value);
      } else if (Array.isArray(value)) {
        cleaned[key] = this.cleanArray(value);
      } else if (typeof value === 'object' && value !== null) {
        cleaned[key] = this.cleanObject(value);
      } else {
        cleaned[key] = value;
      }
    }

    return cleaned;
  }

  /**
   * 清理数组
   */
  cleanArray(arr) {
    return arr.map(item => {
      if (typeof item === 'string') {
        return this.cleanString(item);
      } else if (Array.isArray(item)) {
        return this.cleanArray(item);
      } else if (typeof item === 'object' && item !== null) {
        return this.cleanObject(item);
      }
      return item;
    });
  }

  /**
   * 清理字符串
   */
  cleanString(str) {
    if (typeof str !== 'string') {
      return str;
    }

    let cleaned = str;

    // HTML编码
    if (this.config.encoding.html) {
      cleaned = this.htmlEncode(cleaned);
    }

    // 移除危险脚本和标签
    if (this.config.xss.enabled) {
      cleaned = this.removeXSS(cleaned);
    }

    // 移除SQL注入模式
    if (this.config.sql.enabled) {
      cleaned = this.removeSQLInjection(cleaned);
    }

    // 限制字符串长度
    if (cleaned.length > this.config.input.maxStringLength) {
      cleaned = cleaned.substring(0, this.config.input.maxStringLength);
    }

    return cleaned.trim();
  }

  /**
   * HTML编码
   */
  htmlEncode(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * 移除XSS攻击代码
   */
  removeXSS(str) {
    let cleaned = str;

    // 移除脚本标签
    this.threatPatterns.xss.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });

    // 移除事件处理器
    cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

    // 移除javascript:协议
    cleaned = cleaned.replace(/javascript:/gi, '');

    return cleaned;
  }

  /**
   * 移除SQL注入模式
   */
  removeSQLInjection(str) {
    let cleaned = str;

    this.threatPatterns.sql.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });

    return cleaned;
  }

  /**
   * 检测XSS攻击
   */
  detectXSS(req) {
    const suspiciousStrings = this.extractStrings(req);

    for (const str of suspiciousStrings) {
      for (const pattern of this.threatPatterns.xss) {
        if (pattern.test(str)) {
          return {
            detected: true,
            type: 'XSS',
            details: {
              pattern: pattern.toString(),
              matchedText: str.substring(0, 100),
              location: this.findStringLocation(req, str)
            }
          };
        }
      }
    }

    return { detected: false };
  }

  /**
   * 检测SQL注入攻击
   */
  detectSQLInjection(req) {
    const suspiciousStrings = this.extractStrings(req);

    for (const str of suspiciousStrings) {
      for (const pattern of this.threatPatterns.sql) {
        if (pattern.test(str)) {
          return {
            detected: true,
            type: 'SQL_INJECTION',
            details: {
              pattern: pattern.toString(),
              matchedText: str.substring(0, 100),
              location: this.findStringLocation(req, str)
            }
          };
        }
      }
    }

    return { detected: false };
  }

  /**
   * 检测路径遍历攻击
   */
  detectPathTraversal(req) {
    const suspiciousStrings = this.extractStrings(req);

    for (const str of suspiciousStrings) {
      for (const pattern of this.threatPatterns.pathTraversal) {
        if (pattern.test(str)) {
          return {
            detected: true,
            type: 'PATH_TRAVERSAL',
            details: {
              pattern: pattern.toString(),
              matchedText: str.substring(0, 100),
              location: this.findStringLocation(req, str)
            }
          };
        }
      }
    }

    return { detected: false };
  }

  /**
   * 检测命令注入攻击
   */
  detectCommandInjection(req) {
    const suspiciousStrings = this.extractStrings(req);

    for (const str of suspiciousStrings) {
      for (const pattern of this.threatPatterns.commandInjection) {
        if (pattern.test(str)) {
          return {
            detected: true,
            type: 'COMMAND_INJECTION',
            details: {
              pattern: pattern.toString(),
              matchedText: str.substring(0, 100),
              location: this.findStringLocation(req, str)
            }
          };
        }
      }
    }

    return { detected: false };
  }

  /**
   * 从请求中提取所有字符串值
   */
  extractStrings(req) {
    const strings = [];

    const extractFromObject = (obj, path = '') => {
      if (typeof obj === 'string') {
        strings.push({ value: obj, path });
      } else if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          extractFromObject(item, `${path}[${index}]`);
        });
      } else if (typeof obj === 'object' && obj !== null) {
        Object.entries(obj).forEach(([key, value]) => {
          extractFromObject(value, path ? `${path}.${key}` : key);
        });
      }
    };

    extractFromObject(req.query, 'query');
    extractFromObject(req.body, 'body');
    extractFromObject(req.params, 'params');

    return strings.map(item => item.value);
  }

  /**
   * 查找字符串在请求中的位置
   */
  findStringLocation(req, str) {
    // 简化实现，返回字符串的前50个字符用于定位
    return {
      preview: str.substring(0, 50),
      length: str.length
    };
  }

  /**
   * 验证输入格式
   */
  validateInputFormat(req) {
    const errors = [];

    // 检查查询参数
    const queryResult = this.validateObjectFormat(req.query, 'query');
    errors.push(...queryResult.errors);

    // 检查请求体
    if (req.body) {
      const bodyResult = this.validateObjectFormat(req.body, 'body');
      errors.push(...bodyResult.errors);
    }

    // 检查路径参数
    if (req.params) {
      const paramResult = this.validateObjectFormat(req.params, 'params');
      errors.push(...paramResult.errors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证对象格式
   */
  validateObjectFormat(obj, location) {
    const errors = [];
    const { maxStringLength, maxArrayLength, maxObjectDepth } = this.config.input;

    const validateValue = (value, path, depth = 0) => {
      if (depth > maxObjectDepth) {
        errors.push(`${location}.${path}: 对象嵌套层级过深`);
        return;
      }

      if (typeof value === 'string') {
        if (value.length > maxStringLength) {
          errors.push(`${location}.${path}: 字符串长度超过限制 (${value.length} > ${maxStringLength})`);
        }
      } else if (Array.isArray(value)) {
        if (value.length > maxArrayLength) {
          errors.push(`${location}.${path}: 数组长度超过限制 (${value.length} > ${maxArrayLength})`);
        }
        value.forEach((item, index) => {
          validateValue(item, `${path}[${index}]`, depth + 1);
        });
      } else if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([key, val]) => {
          validateValue(val, path ? `${path}.${key}` : key, depth + 1);
        });
      }
    };

    validateValue(obj, '', 0);

    return { errors };
  }

  /**
   * URL编码
   */
  urlEncode(str) {
    return encodeURIComponent(str);
  }

  /**
   * URL解码
   */
  urlDecode(str) {
    return decodeURIComponent(str);
  }

  /**
   * JavaScript编码
   */
  jsEncode(str) {
    return str.replace(/["'\\\n\r\u2028\u2029]/g, (char) => {
      return '\\u' + ('0000' + char.charCodeAt(0).toString(16)).slice(-4);
    });
  }

  /**
   * CSS编码
   */
  cssEncode(str) {
    return str.replace(/["'\\]/g, '\\$&');
  }

  /**
   * 生成安全的随机字符串
   */
  generateSecureRandom(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 生成安全的Token
   */
  generateSecureToken(payload = {}, expiresIn = '1h') {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
      ...payload,
      iat: now,
      exp: now + this.parseExpiration(expiresIn),
      jti: this.generateSecureRandom(16)
    };

    // 这里应该使用实际的JWT库，这里是简化实现
    const token = Buffer.from(JSON.stringify(header) + '.' + JSON.stringify(tokenPayload)).toString('base64');
    const signature = crypto.createHmac('sha256', 'secret-key').update(token).digest('hex');

    return token + '.' + signature;
  }

  /**
   * 解析过期时间
   */
  parseExpiration(expiresIn) {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // 默认1小时

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 3600;
    }
  }

  /**
   * 发送安全响应
   */
  sendSecurityResponse(res, errorCode, details = {}) {
    const response = {
      success: false,
      error: errorCode,
      message: this.getSecurityMessage(errorCode),
      timestamp: new Date().toISOString(),
      details
    };

    res.status(400).json(response);
  }

  /**
   * 获取安全消息
   */
  getSecurityMessage(errorCode) {
    const messages = {
      'XSS_DETECTED': '检测到跨站脚本攻击(XSS)',
      'SQL_INJECTION_DETECTED': '检测到SQL注入攻击',
      'PATH_TRAVERSAL': '检测到路径遍历攻击',
      'COMMAND_INJECTION': '检测到命令注入攻击',
      'SECURITY_THREAT_DETECTED': '检测到安全威胁',
      'INVALID_INPUT': '输入格式无效'
    };

    return messages[errorCode] || '安全验证失败';
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      blockRate: this.stats.totalValidations > 0 ?
        (this.stats.blockedRequests / this.stats.totalValidations * 100).toFixed(2) + '%' : '0%',
      threatBreakdown: {
        xss: this.stats.xssAttempts,
        sql: this.stats.sqlInjectionAttempts,
        pathTraversal: this.stats.pathTraversalAttempts,
        commandInjection: this.stats.commandInjectionAttempts
      }
    };
  }

  /**
   * 添加自定义威胁模式
   */
  addThreatPattern(category, pattern) {
    if (this.threatPatterns[category]) {
      this.threatPatterns[category].push(new RegExp(pattern, 'gi'));
      console.log(`添加了新的${category}威胁模式`);
    }
  }

  /**
   * 更新配置
   */
  updateConfig(category, updates) {
    if (this.config[category]) {
      this.config[category] = { ...this.config[category], ...updates };
      console.log(`更新了${category}配置`);
    }
  }
}

module.exports = new InputValidation();