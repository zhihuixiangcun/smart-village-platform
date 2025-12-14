/**
 * 隐私保护机制服务
 * 数据脱敏、匿名化、访问控制、用户授权
 */

const crypto = require('crypto');
const { format, subDays, addDays } = require('date-fns');

class PrivacyProtectionService {
  constructor() {
    // 数据敏感度分级
    this.sensitivityLevels = {
      PUBLIC: { level: 1, description: '公开数据', protection: 'none' },
      LOW: { level: 2, description: '低敏感度', protection: 'basic' },
      MEDIUM: { level: 3, description: '中敏感度', protection: 'standard' },
      HIGH: { level: 4, description: '高敏感度', protection: 'enhanced' },
      RESTRICTED: { level: 5, description: '限制访问', protection: 'maximum' }
    };

    // 数据类型定义
    this.dataTypes = {
      PERSONAL_INFO: {
        category: '个人信息',
        sensitivity: 'MEDIUM',
        fields: ['name', 'gender', 'birthDate', 'address', 'email']
      },
      IDENTITY_INFO: {
        category: '身份数据',
        sensitivity: 'HIGH',
        fields: ['idCard', 'passport', 'drivingLicense', 'socialSecurity']
      },
      FINANCIAL_INFO: {
        category: '金融数据',
        sensitivity: 'HIGH',
        fields: ['bankAccount', 'creditCard', 'financialRecords', 'taxInfo']
      },
      HEALTH_INFO: {
        category: '健康数据',
        sensitivity: 'RESTRICTED',
        fields: ['medicalHistory', 'diagnosis', 'prescription', 'healthRecords']
      },
      CONTACT_INFO: {
        category: '联系方式',
        sensitivity: 'MEDIUM',
        fields: ['phone', 'email', 'address', 'emergencyContact']
      },
      BIOMETRIC_INFO: {
        category: '生物特征',
        sensitivity: 'RESTRICTED',
        fields: ['fingerprint', 'faceData', 'voiceData', 'irisData']
      },
      BEHAVIORAL_INFO: {
        category: '行为数据',
        sensitivity: 'LOW',
        fields: ['loginHistory', 'operationLogs', 'preferences', 'usagePattern']
      }
    };

    // 脱敏规则
    this.maskingRules = {
      PHONE: {
        pattern: /(\d{3})\d{4}(\d{4})/,
        replacement: '$1****$2',
        description: '手机号码中间4位脱敏'
      },
      ID_CARD: {
        pattern: /(\d{6})\d{8}(\d{4})/,
        replacement: '$1********$2',
        description: '身份证号中间8位脱敏'
      },
      BANK_CARD: {
        pattern: /(\d{4})\d{8,12}(\d{4})/,
        replacement: '$1****$2',
        description: '银行卡号中间位脱敏'
      },
      EMAIL: {
        pattern: /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
        replacement: (match, p1, p2) => {
          const username = p1.substring(0, 2) + '***';
          return username + '@' + p2;
        },
        description: '邮箱用户名部分脱敏'
      },
      NAME: {
        pattern: /(.{1})(.*)(.{1})/,
        replacement: (match, first, middle, last) => {
          const maskedMiddle = '*'.repeat(middle.length);
          return first + maskedMiddle + last;
        },
        description: '姓名中间部分脱敏'
      },
      ADDRESS: {
        pattern: /(.{2,3})(.*)(.{2,3})/,
        replacement: (match, first, middle, last) => {
          const maskedMiddle = '*'.repeat(middle.length);
          return first + maskedMiddle + last;
        },
        description: '地址中间部分脱敏'
      }
    };

    // 数据处理权限
    this.processingPermissions = {
      READ: 'read',
      WRITE: 'write',
      DELETE: 'delete',
      EXPORT: 'export',
      MASK: 'mask',
      ANONYMIZE: 'anonymize'
    };

    // 用户授权管理
    this.userConsents = new Map();
    this.dataProcessors = new Map();
    this.auditLogs = [];
  }

  /**
   * 数据脱敏处理
   */
  async maskData(data, dataType = null, maskingLevel = 'standard') {
    try {
      const maskedData = { ...data };
      const appliedRules = [];

      // 根据数据类型自动选择脱敏规则
      if (dataType) {
        const typeInfo = this.dataTypes[dataType];
        if (typeInfo && typeInfo.fields) {
          for (const field of typeInfo.fields) {
            if (maskedData[field]) {
              const maskedValue = await this.applyMaskingRule(
                field,
                maskedData[field],
                maskingLevel
              );

              if (maskedValue !== maskedData[field]) {
                maskedData[field] = maskedValue;
                appliedRules.push({
                  field,
                  originalValue: data[field],
                  maskedValue,
                  rule: this.getMaskingRule(field),
                  timestamp: new Date()
                });
              }
            }
          }
        }
      }

      // 自动检测敏感字段并脱敏
      if (!dataType) {
        const autoMasked = await this.autoDetectAndMask(maskedData, maskingLevel);
        Object.assign(maskedData, autoMasked.data);
        appliedRules.push(...autoMasked.rules);
      }

      return {
        success: true,
        data: maskedData,
        metadata: {
          originalDataType: dataType,
          maskingLevel: maskingLevel,
          appliedRules: appliedRules,
          maskedAt: new Date()
        }
      };
    } catch (error) {
      console.error('数据脱敏失败:', error);
      throw new Error(`数据脱敏失败: ${error.message}`);
    }
  }

  /**
   * 数据匿名化处理
   */
  async anonymizeData(data, anonymizationLevel = 'standard') {
    try {
      const anonymizedData = {};
      const anonymizationMap = {};
      const appliedRules = [];

      // 为每条记录生成唯一ID
      const recordId = this.generateAnonymousId();
      anonymizedData.anonymousId = recordId;
      anonymizationMap.anonymousId = recordId;

      // 处理每个字段
      for (const [key, value] of Object.entries(data)) {
        if (this.isSensitiveField(key)) {
          // 生成匿名值
          const anonymousValue = await this.generateAnonymousValue(key, value, anonymizationLevel);
          anonymizedData[key] = anonymousValue.value;
          anonymizationMap[key] = anonymousValue.mapping;

          appliedRules.push({
            field: key,
            originalValue: value,
            anonymousValue: anonymousValue.value,
            anonymizationType: anonymousValue.type,
            timestamp: new Date()
          });
        } else {
          // 非敏感字段保留原始值
          anonymizedData[key] = value;
        }
      }

      return {
        success: true,
        data: anonymizedData,
        metadata: {
          anonymizationLevel,
          anonymizationMap,
          appliedRules,
          anonymizedAt: new Date()
        }
      };
    } catch (error) {
      console.error('数据匿名化失败:', error);
      throw new Error(`数据匿名化失败: ${error.message}`);
    }
  }

  /**
   * 批量数据脱敏
   */
  async batchMaskData(records, dataType = null, maskingLevel = 'standard') {
    try {
      const maskedRecords = [];
      const batchStats = {
        total: records.length,
        processed: 0,
        failed: 0,
        errors: []
      };

      for (const record of records) {
        try {
          const masked = await this.maskData(record, dataType, maskingLevel);
          maskedRecords.push(masked.data);
          batchStats.processed++;
        } catch (error) {
          batchStats.failed++;
          batchStats.errors.push({
            record,
            error: error.message
          });
          console.error('批量脱敏处理失败:', error);
        }
      }

      return {
        success: true,
        data: maskedRecords,
        metadata: {
          batchStats,
          maskingLevel,
          processedAt: new Date()
        }
      };
    } catch (error) {
      console.error('批量数据脱敏失败:', error);
      throw new Error(`批量数据脱敏失败: ${error.message}`);
    }
  }

  /**
   * 用户授权管理
   */
  async manageUserConsent(userId, consentData) {
    try {
      const consent = {
        userId,
        consentId: this.generateId(),
        timestamp: new Date(),
        consentType: consentData.consentType, // 'dataProcessing', 'marketing', 'thirdParty'
        scope: consentData.scope, // 权限范围
        purpose: consentData.purpose, // 使用目的
        duration: consentData.duration, // 授权期限
        status: consentData.status, // 'granted', 'denied', 'revoked'
        grantedAt: consentData.status === 'granted' ? new Date() : null,
        expiresAt: consentData.duration ?
          addDays(new Date(), consentData.duration) : null,
        ipAddress: consentData.ipAddress,
        userAgent: consentData.userAgent,
        legalBasis: consentData.legalBasis, // 合法依据
        privacyPolicy: consentData.privacyPolicy, // 隐私政策版本
        withdrawalRights: consentData.withdrawalRights || true
      };

      // 保存用户授权
      this.userConsents.set(`${userId}_${consent.consentId}`, consent);

      return {
        success: true,
        data: {
          consentId: consent.consentId,
          status: consent.status,
          grantedAt: consent.grantedAt,
          expiresAt: consent.expiresAt,
          message: '用户授权已记录'
        }
      };
    } catch (error) {
      console.error('用户授权管理失败:', error);
      throw new Error(`用户授权管理失败: ${error.message}`);
    }
  }

  /**
   * 检查用户授权
   */
  async checkUserConsent(userId, consentType, scope = null) {
    try {
      const userConsents = Array.from(this.userConsents.values())
        .filter(consent =>
          consent.userId === userId &&
          consent.consentType === consentType &&
          consent.status === 'granted'
        );

      if (userConsents.length === 0) {
        return {
          hasConsent: false,
          reason: '用户未授权',
          message: '用户未授予相关权限'
        };
      }

      // 检查授权是否过期
      const now = new Date();
      const validConsents = userConsents.filter(consent => {
        if (!consent.expiresAt) return true; // 永久授权
        return consent.expiresAt > now;
      });

      if (validConsents.length === 0) {
        return {
          hasConsent: false,
          reason: '授权已过期',
          message: '用户授权已过期'
        };
      }

      // 检查授权范围
      if (scope) {
        const hasScope = validConsents.some(consent => {
          return consent.scope && consent.scope.includes(scope);
        });

        if (!hasScope) {
          return {
            hasConsent: false,
            reason: '授权范围不足',
            message: '用户授权不包含所需权限范围'
          };
        }
      }

      return {
        hasConsent: true,
        consents: validConsents,
        message: '用户授权有效'
      };
    } catch (error) {
      console.error('检查用户授权失败:', error);
      throw new Error(`检查用户授权失败: ${error.message}`);
    }
  }

  /**
   * 撤销用户授权
   */
  async revokeUserConsent(userId, consentId) {
    try {
      const consentKey = `${userId}_${consentId}`;
      const consent = this.userConsents.get(consentKey);

      if (!consent) {
        throw new Error('授权记录不存在');
      }

      // 更新授权状态
      consent.status = 'revoked';
      consent.revokedAt = new Date();
      consent.revocationReason = '用户主动撤销';

      this.userConsents.set(consentKey, consent);

      return {
        success: true,
        data: {
          consentId,
          status: consent.status,
          revokedAt: consent.revokedAt,
          message: '用户授权已撤销'
        }
      };
    } catch (error) {
      console.error('撤销用户授权失败:', error);
      throw new Error(`撤销用户授权失败: ${error.message}`);
    }
  }

  /**
   * 数据访问控制
   */
  async checkDataAccess(userId, dataType, operation, targetUserId = null) {
    try {
      // 1. 检查基本访问权限
      const hasBasicPermission = await this.checkBasicPermission(userId, operation);
      if (!hasBasicPermission) {
        return {
          hasAccess: false,
          reason: 'basic_permission_denied',
          message: '用户缺少基本访问权限'
        };
      }

      // 2. 检查数据类型权限
      const hasDataPermission = await this.checkDataPermission(userId, dataType, operation);
      if (!hasDataPermission) {
        return {
          hasAccess: false,
          reason: 'data_permission_denied',
          message: '用户缺少数据类型访问权限'
        };
      }

      // 3. 检查用户授权（如需）
      if (operation !== 'read' && dataType !== 'BEHAVIORAL_INFO') {
        const hasConsent = await this.checkUserConsent(userId, 'dataProcessing', dataType);
        if (!hasConsent.hasConsent) {
          return {
            hasAccess: false,
            reason: 'consent_denied',
            message: hasConsent.message
          };
        }
      }

      // 4. 检查目标用户数据访问权限（如适用）
      if (targetUserId && targetUserId !== userId) {
        const hasTargetAccess = await this.checkTargetUserAccess(userId, targetUserId, operation);
        if (!hasTargetAccess) {
          return {
            hasAccess: false,
            reason: 'target_access_denied',
            message: '无权限访问其他用户数据'
          };
        }
      }

      return {
        hasAccess: true,
        message: '数据访问权限验证通过'
      };
    } catch (error) {
      console.error('数据访问控制检查失败:', error);
      throw new Error(`数据访问控制检查失败: ${error.message}`);
    }
  }

  /**
   * 隐私影响评估
   */
  async privacyImpactAssessment(dataProcess) {
    try {
      const assessment = {
        assessmentId: this.generateId(),
        timestamp: new Date(),
        dataProcess: dataProcess,
        impactLevel: 'LOW',
        risks: [],
        recommendations: [],
        compliance: {
          gdpr: false,
          mlps: false,
          ccpa: false,
          pipl: false
        }
      };

      // 评估数据类型
      const dataTypes = this.analyzeDataTypes(dataProcess.dataTypes);
      assessment.risks.push(...dataTypes.risks);
      assessment.impactLevel = Math.max(assessment.impactLevel, dataTypes.maxSensitivity);

      // 评估处理方式
      const processingRisks = this.analyzeProcessingRisks(dataProcess.processing);
      assessment.risks.push(...processingRisks);

      // 评估存储和传输
      const storageRisks = this.analyzeStorageRisks(dataProcess.storage, dataProcess.transmission);
      assessment.risks.push(...storageRisks);

      // 评估合规性
      const compliance = this.checkCompliance(dataProcess);
      assessment.compliance = compliance;
      if (compliance.gdpr || compliance.mlps || compliance.ccpa || compliance.pipl) {
        assessment.impactLevel = Math.max(assessment.impactLevel, 3);
      }

      // 生成建议
      assessment.recommendations = this.generatePrivacyRecommendations(assessment);

      return {
        success: true,
        data: assessment
      };
    } catch (error) {
      console.error('隐私影响评估失败:', error);
      throw new Error(`隐私影响评估失败: ${error.message}`);
    }
  }

  /**
   * 隐私审计日志
   */
  async logPrivacyEvent(event) {
    try {
      const logEntry = {
        eventId: this.generateId(),
        timestamp: new Date(),
        userId: event.userId,
        eventType: event.eventType, // 'dataAccess', 'dataProcessing', 'dataExport', 'consentChange'
        dataType: event.dataType,
        operation: event.operation,
        dataSubjectId: event.dataSubjectId,
        processorId: event.processorId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        result: event.result, // 'success', 'failure', 'partial'
        reason: event.reason,
        metadata: event.metadata || {}
      };

      this.auditLogs.push(logEntry);

      // 在实际项目中，这里还会：
      // 1. 写入数据库
      // 2. 发送到SIEM系统
      // 3. 触发告警机制

      return {
        success: true,
        eventId: logEntry.eventId,
        timestamp: logEntry.timestamp
      };
    } catch (error) {
      console.error('隐私审计日志记录失败:', error);
      throw new Error(`隐私审计日志记录失败: ${error.message}`);
    }
  }

  /**
   * 辅助方法
   */
  async applyMaskingRule(field, value, maskingLevel) {
    const rule = this.getMaskingRule(field);
    if (!rule) return value;

    let maskedValue = value.toString();

    switch (maskingLevel) {
      case 'none':
        return maskedValue;
      case 'light':
        // 轻度脱敏，保留更多信息
        if (rule.pattern && typeof rule.replacement === 'function') {
          maskedValue = rule.replacement.exec(maskedValue) || maskedValue;
        } else if (rule.replacement) {
          maskedValue = maskedValue.replace(rule.pattern, rule.replacement);
        }
        break;
      case 'standard':
        // 标准脱敏
        if (rule.pattern && typeof rule.replacement === 'function') {
          maskedValue = rule.replacement.exec(maskedValue) || maskedValue;
        } else if (rule.replacement) {
          maskedValue = maskedValue.replace(rule.pattern, rule.replacement);
        }
        break;
      case 'strict':
        // 严格脱敏，大部分内容替换为*
        maskedValue = maskedValue.substring(0, 1) + '*'.repeat(maskedValue.length - 2) +
                       maskedValue.substring(maskedValue.length - 1);
        break;
      case 'complete':
        // 完全脱敏，所有内容替换为*
        maskedValue = '*'.repeat(maskedValue.length);
        break;
    }

    return maskedValue;
  }

  getMaskingRule(field) {
    const rules = {
      phone: this.maskingRules.PHONE,
      idCard: this.maskingRules.ID_CARD,
      idcard: this.maskingRules.ID_CARD,
      身份证: this.maskingRules.ID_CARD,
      bankCard: this.maskingRules.BANK_CARD,
      银行卡: this.maskingRules.BANK_CARD,
      email: this.maskingRules.EMAIL,
      邮箱: this.maskingRules.EMAIL,
      name: this.maskingRules.NAME,
      姓名: this.maskingRules.NAME,
      address: this.maskingRules.ADDRESS,
      地址: this.maskingRules.ADDRESS
    };

    return rules[field] || null;
  }

  async autoDetectAndMask(data, maskingLevel) {
    const maskedData = { ...data };
    const appliedRules = [];

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // 检测各种敏感信息
        let isSensitive = false;
        let maskedValue = value;

        // 手机号码检测
        if (/1[3-9]\d{9}/.test(value)) {
          isSensitive = true;
          maskedValue = await this.applyMaskingRule('phone', value, maskingLevel);
        }
        // 身份证号检测
        else if (/\d{17}|\d{15}/.test(value)) {
          isSensitive = true;
          maskedValue = await this.applyMaskingRule('idCard', value, maskingLevel);
        }
        // 邮箱检测
        else if (/@/.test(value)) {
          isSensitive = true;
          maskedValue = await this.applyMaskingRule('email', value, maskingLevel);
        }
        // 银行卡检测
        else if (/\d{16,19}/.test(value)) {
          isSensitive = true;
          maskedValue = await this.applyMaskingRule('bankCard', value, maskingLevel);
        }

        if (isSensitive && maskedValue !== value) {
          maskedData[key] = maskedValue;
          appliedRules.push({
            field: key,
            originalValue: value,
            maskedValue,
            rule: 'auto-detected',
            timestamp: new Date()
          });
        }
      }
    }

    return {
      data: maskedData,
      rules: appliedRules
    };
  }

  isSensitiveField(fieldName) {
    const sensitivePatterns = [
      /id|card|identity|身份|证件/i,
      /bank|account|card|银行|账户|银行卡/i,
      /phone|mobile|电话/i,
      /email|邮箱/i,
      /address|地址/i,
      /password|密码/i,
      /token|令牌/i
    ];

    return sensitivePatterns.some(pattern => pattern.test(fieldName));
  }

  generateAnonymousId() {
    return crypto.randomBytes(16).toString('hex');
  }

  async generateAnonymousValue(field, value, level) {
    const mappingKey = this.generateId();

    switch (field) {
      case 'name':
      case '姓名':
        return {
          value: '用户' + mappingKey.substring(0, 8),
          mapping: { original: value, type: 'hash' },
          type: 'pseudonym'
        };
      case 'phone':
      case '电话':
        return {
          value: '138****' + mappingKey.substring(0, 4),
          mapping: { original: value, type: 'masked' },
          type: 'masked'
        };
      case 'email':
      case '邮箱':
        const [username, domain] = value.split('@');
        return {
          value: 'user' + mappingKey.substring(0, 8) + '@' + domain,
          mapping: { original: value, type: 'pseudonym' },
          type: 'pseudonym'
        };
      case 'address':
      case '地址':
        return {
          value: '地址' + mappingKey.substring(0, 8),
          mapping: { original: value, type: 'token' },
          type: 'token'
        };
      default:
        return {
          value: crypto.createHash('sha256')
            .update(value.toString() + mappingKey)
            .digest('hex')
            .substring(0, 16),
          mapping: { original: value, type: 'hash' },
          type: 'hash'
        };
    }
  }

  generateId() {
    return crypto.randomBytes(8).toString('hex');
  }

  async checkBasicPermission(userId, operation) {
    // 模拟基本权限检查
    const userPermissions = {
      'user1': ['read', 'write', 'delete'],
      'user2': ['read'],
      'admin': ['read', 'write', 'delete', 'export']
    };

    const permissions = userPermissions[userId] || [];
    return permissions.includes(operation);
  }

  async checkDataPermission(userId, dataType, operation) {
    // 模拟数据类型权限检查
    const dataTypePermissions = {
      'USER': {
        read: ['user1', 'user2', 'admin'],
        write: ['admin'],
        delete: ['admin']
      },
      'PERSONAL_INFO': {
        read: ['user1', 'admin'],
        write: ['admin'],
        delete: ['admin']
      },
      'FINANCIAL_INFO': {
        read: ['admin'],
        write: ['admin'],
        delete: ['admin']
      }
    };

    const permissions = dataTypePermissions[dataType] || {};
    const userPermissions = permissions[operation] || [];

    return userPermissions.includes(userId);
  }

  async checkTargetUserAccess(userId, targetUserId, operation) {
    // 模拟目标用户数据访问权限
    if (userId === targetUserId) {
      return true; // 用户可以访问自己的数据
    }

    // 检查是否有管理员权限或特殊授权
    return this.checkBasicPermission(userId, 'admin') ||
           this.checkBasicPermission(userId, `${operation}_target_user`);
  }

  analyzeDataTypes(dataTypes) {
    const analysis = {
      risks: [],
      maxSensitivity: 1
    };

    (dataTypes || []).forEach(dataType => {
      const typeInfo = this.dataTypes[dataType];
      if (typeInfo) {
        analysis.maxSensitivity = Math.max(analysis.maxSensitivity, typeInfo.sensitivity.level);
        analysis.risks.push({
          type: dataType,
          sensitivity: typeInfo.sensitivity.level,
          description: `处理${typeInfo.category}数据，敏感度等级${typeInfo.sensitivity.level}`
        });
      }
    });

    return analysis;
  }

  analyzeProcessingRisks(processing) {
    const risks = [];

    if (processing.includes('export')) {
      risks.push({
        type: 'data_export',
        description: '数据导出存在泄露风险',
        severity: 'high'
      });
    }

    if (processing.includes('third_party')) {
      risks.push({
        type: 'third_party_processing',
        description: '第三方处理存在风险',
        severity: 'medium'
      });
    }

    return risks;
  }

  analyzeStorageRisks(storage, transmission) {
    const risks = [];

    if (storage === 'unencrypted') {
      risks.push({
        type: 'unencrypted_storage',
        description: '未加密存储存在风险',
        severity: 'high'
      });
    }

    if (transmission === 'unencrypted') {
      risks.push({
        type: 'unencrypted_transmission',
        description: '未加密传输存在风险',
        severity: 'high'
      });
    }

    return risks;
  }

  checkCompliance(dataProcess) {
    // 模拟合规性检查
    return {
      gdpr: dataProcess.region === 'EU' || dataProcess.gdpr === true,
      mlps: dataProcess.mlps === true,
      ccpa: dataProcess.region === 'US' || dataProcess.ccpa === true,
      pipl: dataProcess.region === 'CN' || dataProcess.pipl === true
    };
  }

  generatePrivacyRecommendations(assessment) {
    const recommendations = [];

    // 基于风险等级生成建议
    if (assessment.impactLevel >= 4) {
      recommendations.push({
        priority: 'high',
        category: 'encryption',
        recommendation: '实施端到端加密保护敏感数据',
        reason: '数据敏感度等级较高'
      });
    }

    // 基于风险类型生成建议
    assessment.risks.forEach(risk => {
      if (risk.type === 'data_export') {
        recommendations.push({
          priority: 'medium',
          category: 'access_control',
          recommendation: '实施数据导出审批和审计机制',
          reason: '存在数据导出风险'
        });
      }

      if (risk.type === 'unencrypted_storage') {
        recommendations.push({
          priority: 'high',
          category: 'encryption',
          recommendation: '实施数据库和文件加密存储',
          reason: '存储数据未加密'
        });
      }
    });

    // 基于合规要求生成建议
    if (assessment.compliance.gdpr) {
      recommendations.push({
        priority: 'medium',
        category: 'compliance',
        recommendation: '确保GDPR合规性要求',
        reason: '需要满足GDPR法规'
      });
    }

    return recommendations;
  }
}

module.exports = new PrivacyProtectionService();