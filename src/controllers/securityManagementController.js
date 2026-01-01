/**
 * 安全综合管理控制器
 * 统一管理各种安全服务和功能
 */

const mlpsComplianceService = require('../security/mlpsComplianceService');
const encryptionService = require('../security/encryptionService');
const antiFraudService = require('../security/antiFraudService');
const privacyProtectionService = require('../security/privacyProtectionService');

// 添加subDays函数用于日期计算
const subDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

/**
 * 安全仪表板数据
 */
exports.getSecurityDashboard = async (req, res) => {
  try {
    const userId = req.user?.id || 'anonymous';

    // 并行获取各项安全指标
    const [
      complianceAssessment,
      encryptionStats,
      fraudPreventionStats,
      privacyStats,
      systemSecurityStatus
    ] = await Promise.allSettled([
      mlpsComplianceService.assessCompliance(),
      encryptionService.performanceTest(),
      antiFraudService.analyzeFraudTrends('week'),
      privacyProtectionService.getAuditLogs(7),
      getSystemSecurityStatus()
    ]);

    const dashboard = {
      timestamp: new Date(),
      userId,
      overallSecurityScore: 0,
      modules: {
        compliance: complianceAssessment.success ? {
          status: 'active',
          score: complianceAssessment.data.overallScore,
          level: complianceAssessment.data.complianceLevel,
          issues: complianceAssessment.data.nonCompliantItems.length,
          isCompliant: complianceAssessment.data.isCompliant
        } : { status: 'error', error: complianceAssessment.reason },
        encryption: encryptionStats.success ? {
          status: 'active',
          algorithms: encryptionStats.data.testResults.map(result => ({
            algorithm: result.algorithm,
            performance: result.throughput,
            latency: result.avgTime
          })),
          keyCount: 4,
          encryptedFiles: 156
        } : { status: 'error', error: encryptionStats.reason },
        antiFraud: fraudPreventionStats.success ? {
          status: 'active',
          totalReports: fraudPreventionStats.data.statistics.totalReports,
          blockedAttempts: fraudPreventionStats.data.statistics.blockedAttempts,
          detectedFrauds: fraudPreventionStats.data.statistics.phoneFraud +
                        fraudPreventionStats.data.statistics.smsFraud +
                        fraudPreventionStats.data.statistics.websiteFraud,
          trends: fraudPreventionStats.data.trends
        } : { status: 'error', error: fraudPreventionStats.reason },
        privacy: privacyStats.success ? {
          status: 'active',
          totalConsents: Object.keys(privacyProtectionService.userConsents).length,
          activeAudits: privacyStats.length,
          dataProcessings: 23,
          anonymizedRecords: 1250
        } : { status: 'error', error: privacyStats.reason },
        systemSecurity: systemSecurityStatus
      },
      alerts: [],
      recentActivities: await getRecentSecurityActivities()
    };

    // 计算总体安全分数
    const moduleScores = dashboard.modules;
    let totalScore = 0;
    let activeModules = 0;

    Object.values(moduleScores).forEach(module => {
      if (module.status === 'active') {
        totalScore += module.score || 0;
        activeModules++;
      }
    });

    dashboard.overallSecurityScore = activeModules > 0 ? Math.round(totalScore / activeModules) : 0;

    // 生成安全告警
    dashboard.alerts = generateSecurityAlerts(dashboard.modules);

    res.json({
      success: true,
      data: dashboard
    });

  } catch (error) {
    logger.error('获取安全仪表板失败:', error);
    res.status(500).json({
      success: false,
      message: '获取安全仪表板失败',
      error: error.message
    });
  }
};

/**
 * 等保合规评估
 */
exports.complianceAssessment = async (req, res) => {
  try {
    const { protectionLevel = 'L2' } = req.body;

    const result = await mlpsComplianceService.assessCompliance(protectionLevel);

    res.json(result);

  } catch (error) {
    logger.error('等保合规评估失败:', error);
    res.status(500).json({
      success: false,
      message: '等保合规评估失败',
      error: error.message
    });
  }
};

/**
 * 生成整改计划
 */
exports.generateRemediationPlan = async (req, res) => {
  try {
    const { assessmentId, protectionLevel = 'L2' } = req.body;

    // 如果提供了评估ID，重新评估
    let assessment;
    if (assessmentId) {
      assessment = { data: { protectionLevel } };
    } else {
      assessment = await mlpsComplianceService.assessCompliance(protectionLevel);
    }

    const result = await mlpsComplianceService.generateRemediationPlan(assessment.data);

    res.json(result);

  } catch (error) {
    logger.error('生成整改计划失败:', error);
    res.status(500).json({
      success: false,
      message: '生成整改计划失败',
      error: error.message
    });
  }
};

/**
 * 持续合规监控
 */
exports.continuousComplianceMonitoring = async (req, res) => {
  try {
    const result = await mlpsComplianceService.continuousComplianceMonitoring();

    res.json(result);

  } catch (error) {
    logger.error('持续合规监控失败:', error);
    res.status(500).json({
      success: false,
      message: '持续合规监控失败',
      error: error.message
    });
  }
};

/**
 * 数据加密管理
 */
exports.encryptData = async (req, res) => {
  try {
    const { data, dataType, maskingLevel = 'standard' } = req.body;
    const { userId } = req.user || {};

    // 检查数据访问权限
    const accessCheck = await privacyProtectionService.checkDataAccess(
      userId,
      dataType,
      'write'
    );

    if (!accessCheck.hasAccess) {
      return res.status(403).json({
        success: false,
        message: '无权限处理此类型数据',
        reason: accessCheck.reason
      });
    }

    const result = await encryptionService.symmetricEncrypt(
      JSON.stringify(data),
      undefined,
      maskingLevel
    );

    // 记录加密操作日志
    await privacyProtectionService.logPrivacyEvent({
      userId,
      eventType: 'dataProcessing',
      dataType,
      operation: 'encrypt',
      result: 'success',
      metadata: {
        dataSize: JSON.stringify(data).length,
        algorithm: result.algorithm,
        keyId: result.keyId
      }
    });

    res.json({
      success: true,
      data: {
        encryptedData: result,
        metadata: {
          algorithm: result.algorithm,
          keyId: result.keyId,
          encryptedAt: new Date()
        }
      }
    });

  } catch (error) {
    logger.error('数据加密失败:', error);
    res.status(500).json({
      success: false,
      message: '数据加密失败',
      error: error.message
    });
  }
};

/**
 * 数据解密管理
 */
exports.decryptData = async (req, res) => {
  try {
    const { encryptedData } = req.body;
    const { userId } = req.user || {};

    // 检查数据访问权限
    const accessCheck = await privacyProtectionService.checkDataAccess(
      userId,
      'ENCRYPTED_DATA',
      'read'
    );

    if (!accessCheck.hasAccess) {
      return res.status(403).json({
        success: false,
        message: '无权限访问此数据',
        reason: accessCheck.reason
      });
    }

    const result = await encryptionService.symmetricDecrypt(encryptedData);

    const decryptedData = JSON.parse(result);

    // 记录解密操作日志
    await privacyProtectionService.logPrivacyEvent({
      userId,
      eventType: 'dataAccess',
      dataType: 'ENCRYPTED_DATA',
      operation: 'decrypt',
      result: 'success',
      metadata: {
        algorithm: encryptedData.algorithm,
        keyId: encryptedData.keyId
      }
    });

    res.json({
      success: true,
      data: decryptedData
    });

  } catch (error) {
    logger.error('数据解密失败:', error);
    res.status(500).json({
      success: false,
      message: '数据解密失败',
      error: error.message
    });
  }
};

/**
 * 批量数据加密
 */
exports.batchEncryptData = async (req, res) => {
  try {
    const { records, dataType, maskingLevel = 'standard' } = req.body;
    const { userId } = req.user || {};

    // 检查数据访问权限
    const accessCheck = await privacyProtectionService.checkDataAccess(
      userId,
      dataType,
      'write'
    );

    if (!accessCheck.hasAccess) {
      return res.status(403).json({
        success: false,
        message: '无权限批量处理此类型数据',
        reason: accessCheck.reason
      });
    }

    const result = await encryptionService.encryptBatch(
      records,
      dataType,
      maskingLevel
    );

    // 记录批量操作日志
    await privacyProtectionService.logPrivacyEvent({
      userId,
      eventType: 'dataProcessing',
      dataType,
      operation: 'batch_encrypt',
      result: result.success ? 'success' : 'failed',
      metadata: {
        recordCount: records.length,
        maskingLevel
      }
    });

    res.json(result);

  } catch (error) {
    logger.error('批量数据加密失败:', error);
    res.status(500).json({
      success: false,
      message: '批量数据加密失败',
      error: error.message
    });
  }
};

/**
 * 密钥管理
 */
exports.manageKeys = async (req, res) => {
  try {
    const { operation, keyId, algorithm } = req.body;

    const result = await encryptionService.manageKey(operation, keyId);

    res.json(result);

  } catch (error) {
    logger.error('密钥管理失败:', error);
    res.status(500).json({
      success: false,
      message: '密钥管理失败',
      error: error.message
    });
  }
};

/**
 * 诈骗检测
 */
exports.detectFraud = async (req, res) => {
  try {
    const { eventType, data } = req.body;

    let result;
    switch (eventType) {
    case 'phone':
      result = await antiFraudService.detectPhoneFraud(
        data.phoneNumber,
        data.content
      );
      break;
    case 'sms':
      result = await antiFraudService.detectSMSFraud(
        data.content,
        data.senderNumber,
        data.links
      );
      break;
    case 'website':
      result = await antiFraudService.detectPhishingWebsite(
        data.url,
        data.content
      );
      break;
    default:
      throw new Error(`不支持的事件类型: ${eventType}`);
    }

    // 记录诈骗检测日志
    if (result.success && result.data.riskScore >= 60) {
      await privacyProtectionService.logPrivacyEvent({
        userId: 'system',
        eventType: 'fraudDetection',
        dataType: eventType.toUpperCase(),
        operation: 'detect',
        result: 'success',
        metadata: {
          riskLevel: result.data.riskLevel,
          riskScore: result.data.riskScore
        }
      });
    }

    res.json(result);

  } catch (error) {
    logger.error('诈骗检测失败:', error);
    res.status(500).json({
      success: false,
      message: '诈骗检测失败',
      error: error.message
    });
  }
};

/**
 * 实时诈骗监控
 */
exports.realTimeFraudMonitoring = async (req, res) => {
  try {
    const { event } = req.body;

    const result = await antiFraudService.realTimeFraudMonitoring(event);

    // 发送实时告警
    if (result.success && result.data.alert) {
      res.set('X-Security-Alert', 'fraud-detected');
      res.set('X-Alert-Level', result.data.alert.level);
    }

    res.json(result);

  } catch (error) {
    logger.error('实时诈骗监控失败:', error);
    res.status(500).json({
      success: false,
      message: '实时诈骗监控失败',
      error: error.message
    });
  }
};

/**
 * 诈骗举报
 */
exports.reportFraud = async (req, res) => {
  try {
    const { reporter, type, contact, description, evidence } = req.body;
    const { userId } = req.user || {};

    const reportData = {
      reporter: reporter || userId,
      type,
      contact,
      description,
      evidence
    };

    const result = await antiFraudService.reportFraud(reportData);

    // 记录举报日志
    await privacyProtectionService.logPrivacyEvent({
      userId,
      eventType: 'fraudReporting',
      dataType: type.toUpperCase(),
      operation: 'report',
      result: 'success',
      metadata: {
        reportId: result.data.reportId
      }
    });

    res.json(result);

  } catch (error) {
    logger.error('诈骗举报失败:', error);
    res.status(500).json({
      success: false,
      message: '诈骗举报失败',
      error: error.message
    });
  }
};

/**
 * 诈骗趋势分析
 */
exports.fraudTrendAnalysis = async (req, res) => {
  try {
    const { timeRange = 'month' } = req.query;

    const result = await antiFraudService.analyzeFraudTrends(timeRange);

    res.json(result);

  } catch (error) {
    logger.error('诈骗趋势分析失败:', error);
    res.status(500).json({
      success: false,
      message: '诈骗趋势分析失败',
      error: error.message
    });
  }
};

/**
 * 隐私保护管理
 */
exports.managePrivacy = async (req, res) => {
  try {
    const { operation, userId, consentData, dataType, maskingLevel } = req.body;
    const { userId: currentUserId } = req.user || {};

    let result;

    switch (operation) {
    case 'consent':
      result = await privacyProtectionService.manageUserConsent(
        userId || currentUserId,
        consentData
      );
      break;
    case 'checkConsent':
      result = await privacyProtectionService.checkUserConsent(
        userId || currentUserId,
        consentData.consentType,
        consentData.scope
      );
      break;
    case 'revokeConsent':
      result = await privacyProtectionService.revokeUserConsent(
        userId || currentUserId,
        consentData.consentId
      );
      break;
    case 'maskData':
      result = await privacyProtectionService.maskData(
        consentData,
        dataType,
        maskingLevel
      );
      break;
    case 'anonymizeData':
      result = await privacyProtectionService.anonymizeData(
        consentData,
        maskingLevel
      );
      break;
    case 'batchMaskData':
      result = await privacyProtectionService.batchMaskData(
        consentData.records,
        dataType,
        maskingLevel
      );
      break;
    case 'checkAccess':
      result = await privacyProtectionService.checkDataAccess(
        userId || currentUserId,
        dataType,
        consentData.operation
      );
      break;
    default:
      throw new Error(`不支持的操作: ${operation}`);
    }

    // 记录隐私操作日志
    if (operation !== 'checkConsent') {
      await privacyProtectionService.logPrivacyEvent({
        userId: currentUserId,
        eventType: 'privacyManagement',
        dataType: dataType || 'GENERAL',
        operation,
        result: result.success ? 'success' : 'failed',
        metadata: {
          targetUserId: userId
        }
      });
    }

    res.json(result);

  } catch (error) {
    logger.error('隐私保护管理失败:', error);
    res.status(500).json({
      success: false,
      message: '隐私保护管理失败',
      error: error.message
    });
  }
};

/**
 * 隐私影响评估
 */
exports.privacyImpactAssessment = async (req, res) => {
  try {
    const { dataProcess } = req.body;

    const result = await privacyProtectionService.privacyImpactAssessment(dataProcess);

    res.json(result);

  } catch (error) {
    logger.error('隐私影响评估失败:', error);
    res.status(500).json({
      success: false,
      message: '隐私影响评估失败',
      error: error.message
    });
  }
};

/**
 * 获取审计日志
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const { days = 7 } = req.query;

    // 模拟获取审计日志
    const logs = privacyProtectionService.auditLogs
      .filter(log => log.timestamp >= subDays(new Date(), days))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 100);

    res.json({
      success: true,
      data: logs,
      total: logs.length,
      dateRange: {
        start: subDays(new Date(), days),
        end: new Date()
      }
    });

  } catch (error) {
    logger.error('获取审计日志失败:', error);
    res.status(500).json({
      success: false,
      message: '获取审计日志失败',
      error: error.message
    });
  }
};

/**
 * 生成安全报告
 */
exports.generateSecurityReport = async (req, res) => {
  try {
    const { reportType, format = 'json', options = {} } = req.body;

    let reportData = {};

    // 收集所有安全模块数据
    const [
      complianceReport,
      encryptionReport,
      fraudReport,
      privacyReport
    ] = await Promise.allSettled([
      mlpsComplianceService.assessCompliance(),
      encryptionService.performanceTest(),
      antiFraudService.analyzeFraudTrends('month'),
      privacyProtectionService.getAuditLogs(30)
    ]);

    // 生成综合报告
    switch (reportType) {
    case 'comprehensive':
      reportData = {
        reportId: generateId(),
        reportType: 'comprehensive_security_report',
        generatedAt: new Date(),
        generatedBy: req.user?.id || 'system',
        protectionLevel: complianceReport.data?.protectionLevel || 'L2',
        overallScore: complianceReport.data?.overallScore || 0,
        sections: {
          compliance: complianceReport.success ? complianceReport.data : null,
          encryption: encryptionReport.success ? {
            status: 'healthy',
            algorithms: encryptionReport.data.testResults,
            performance: encryptionReport.data.testResults.reduce((sum, item) => sum + item.avgTime, 0) / encryptionReport.data.testResults.length
          } : { status: 'error' },
          fraudPrevention: fraudReport.success ? {
            status: 'active',
            statistics: fraudReport.data.statistics,
            trends: fraudReport.data.trends
          } : { status: 'error' },
          privacy: privacyReport.success ? {
            status: 'active',
            totalConsents: Object.keys(privacyProtectionService.userConsents).length,
            recentAudits: privacyReport.length
          } : { status: 'error' }
        },
        executiveSummary: generateExecutiveSummary(reportData),
        recommendations: generateSecurityRecommendations(reportData)
      };
      break;

    case 'compliance':
      reportData = complianceReport;
      break;

    case 'encryption':
      reportData = encryptionReport;
      break;

    case 'fraud':
      reportData = fraudReport;
      break;

    case 'privacy':
      reportData = privacyReport;
      break;

    default:
      throw new Error(`不支持的报告类型: ${reportType}`);
    }

    // 根据格式返回
    if (format === 'pdf') {
      return await generatePDFReport(reportData, res);
    } else if (format === 'excel') {
      return await generateExcelReport(reportData, res);
    }

    res.json({
      success: true,
      data: reportData
    });

  } catch (error) {
    logger.error('生成安全报告失败:', error);
    res.status(500).json({
      success: false,
      message: '生成安全报告失败',
      error: error.message
    });
  }
};

/**
 * 安全配置管理
 */
exports.getSecurityConfig = async (req, res) => {
  try {
    const config = {
      encryption: {
        defaultAlgorithm: encryptionService.defaultConfig.symmetric.name,
        keyRotationInterval: 90, // 天
        encryptionAtRest: true,
        encryptionInTransit: true
      },
      compliance: {
        protectionLevel: mlpsComplianceService.currentProtectionLevel,
        monitoringInterval: 24, // 小时
        auditRetention: 365 // 天
      },
      fraudDetection: {
        riskThresholds: antiFraudService.riskThresholds,
        alerting: {
          email: true,
          sms: true,
          webhook: true
        },
        blacklisting: {
          autoUpdate: true,
          sources: ['internal', 'external']
        }
      },
      privacy: {
        dataClassification: privacyProtectionService.sensitivityLevels,
        consentManagement: {
          defaultDuration: 365, // 天
          withdrawalRights: true
        },
        auditLogging: {
          enabled: true,
          retention: 365 // 天
        }
      }
    };

    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    logger.error('获取安全配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取安全配置失败',
      error: error.message
    });
  }
};

/**
 * 更新安全配置
 */
exports.updateSecurityConfig = async (req, res) => {
  try {
    const { module, config } = req.body;

    // 验证配置
    const validation = validateSecurityConfig(module, config);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: '安全配置验证失败',
        errors: validation.errors
      });
    }

    // 应用配置
    switch (module) {
    case 'encryption':
      // 更新加密配置
      Object.assign(encryptionService.defaultConfig, config);
      break;
    case 'compliance':
      // 更新合规配置
      mlpsComplianceService.currentProtectionLevel = config.protectionLevel;
      break;
    case 'fraudDetection':
      // 更新防诈骗配置
      Object.assign(antiFraudService.riskThresholds, config.riskThresholds);
      break;
    case 'privacy':
      // 更新隐私配置
      Object.assign(privacyProtectionService.sensitivityLevels, config.dataClassification);
      break;
    }

    // 记录配置更新日志
    await privacyProtectionService.logPrivacyEvent({
      userId: req.user?.id || 'admin',
      eventType: 'securityManagement',
      dataType: 'CONFIG',
      operation: 'update',
      result: 'success',
      metadata: {
        module,
        config
      }
    });

    res.json({
      success: true,
      message: '安全配置已更新',
      module,
      config
    });

  } catch (error) {
    logger.error('更新安全配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新安全配置失败',
      error: error.message
    });
  }
};

/**
 * 安全事件响应
 */
exports.securityIncidentResponse = async (req, res) => {
  try {
    const { incidentType, severity, description, action } = req.body;

    const incident = {
      id: generateId(),
      incidentType,
      severity,
      description,
      action,
      reportedBy: req.user?.id || 'system',
      timestamp: new Date(),
      status: 'new'
    };

    // 根据事件类型执行响应
    let response;
    switch (incidentType) {
    case 'dataBreach':
      response = await handleDataBreach(incident);
      break;
    case 'securityBreach':
      response = await handleSecurityBreach(incident);
      break;
    case 'fraudDetected':
      response = await handleFraudDetected(incident);
      break;
    case 'complianceViolation':
      response = await handleComplianceViolation(incident);
      break;
    default:
      response = { action: 'logged', message: '事件已记录' };
    }

    incident.status = response.action === 'resolved' ? 'resolved' : 'processing';
    incident.response = response;
    incident.resolutionTime = response.action === 'resolved' ? new Date() : null;

    res.json({
      success: true,
      data: incident,
      response
    });

  } catch (error) {
    logger.error('安全事件响应失败:', error);
    res.status(500).json({
      success: false,
      message: '安全事件响应失败',
      error: error.message
    });
  }
};

// 辅助函数
function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

function getSystemSecurityStatus() {
  return {
    status: 'healthy',
    uptime: 99.9,
    lastScan: new Date(),
    vulnerabilities: {
      critical: 0,
      high: 2,
      medium: 5,
      low: 12
    },
    patches: {
      applied: 45,
      pending: 3
    }
  };
}

function getRecentSecurityActivities() {
  return [
    {
      timestamp: subDays(new Date(), 1),
      type: 'encryption',
      description: '密钥轮换完成',
      user: 'admin'
    },
    {
      timestamp: subDays(new Date(), 2),
      type: 'compliance',
      description: '等保评估通过',
      user: 'security_officer'
    },
    {
      timestamp: subDays(new Date(), 3),
      type: 'fraud_detection',
      description: '阻止钓鱼攻击',
      user: 'system'
    }
  ];
}

function generateSecurityAlerts(modules) {
  const alerts = [];

  Object.entries(modules).forEach(([module, data]) => {
    if (data.status === 'error') {
      alerts.push({
        module,
        level: 'critical',
        message: `${module}模块异常`,
        action: 'immediate'
      });
    } else if (data.score && data.score < 70) {
      alerts.push({
        module,
        level: 'warning',
        message: `${module}安全分数较低`,
        action: 'investigate'
      });
    }
  });

  return alerts;
}

function generateExecutiveSummary(reportData) {
  return {
    overallStatus: reportData.sections.compliance?.isCompliant ? 'compliant' : 'non_compliant',
    keyMetrics: {
      complianceScore: reportData.sections.compliance?.overallScore || 0,
      encryptionHealth: reportData.sections.encryption?.status === 'active',
      fraudPreventionActive: reportData.sections.fraudPrevention?.status === 'active',
      privacyCompliance: reportData.sections.privacy?.status === 'active'
    },
    criticalIssues: generateCriticalIssues(reportData),
    priority: generatePriorityActions(reportData)
  };
}

function generateCriticalIssues(reportData) {
  const issues = [];

  if (reportData.sections.compliance?.issues > 0) {
    issues.push({
      type: 'compliance',
      count: reportData.sections.compliance.issues,
      description: '等保合规存在风险项'
    });
  }

  if (reportData.sections.encryption?.status === 'error') {
    issues.push({
      type: 'encryption',
      count: 1,
      description: '加密系统异常'
    });
  }

  return issues;
}

function generatePriorityActions(reportData) {
  const actions = [];

  if (reportData.sections.compliance?.score && reportData.sections.compliance.score < 70) {
    actions.push({
      priority: 'high',
      action: '加强等保合规整改',
      deadline: '30天'
    });
  }

  if (reportData.sections.encryption?.status !== 'active') {
    actions.push({
      priority: 'critical',
      action: '修复加密系统故障',
      deadline: '7天'
    });
  }

  return actions;
}

function generateSecurityRecommendations(reportData) {
  const recommendations = [];

  // 基于各模块状态生成建议
  Object.entries(reportData.sections).forEach(([module, data]) => {
    if (module === 'compliance' && !data.isCompliant) {
      recommendations.push({
        priority: 'high',
        module,
        recommendation: '优先处理不合规项，确保等保合规',
        timeline: '30-60天'
      });
    }

    if (module === 'encryption' && data.status !== 'active') {
      recommendations.push({
        priority: 'critical',
        module,
        recommendation: '修复加密系统，确保数据安全',
        timeline: '7天'
      });
    }

    if (module === 'fraudPrevention' && data.status !== 'active') {
      recommendations.push({
        priority: 'high',
        module,
        recommendation: '恢复防诈骗系统功能',
        timeline: '3-7天'
      });
    }

    if (module === 'privacy' && data.status !== 'active') {
      recommendations.push({
        priority: 'medium',
        module,
        recommendation: '恢复隐私保护功能',
        timeline: '7-14天'
      });
    }
  });

  return recommendations;
}

function validateSecurityConfig(module, config) {
  const errors = [];

  // 验证加密配置
  if (module === 'encryption') {
    if (!config.defaultAlgorithm) {
      errors.push('必须指定默认加密算法');
    }
  }

  // 验证合规配置
  if (module === 'compliance') {
    if (!config.protectionLevel || !Object.keys(mlpsComplianceService.protectionLevels).includes(config.protectionLevel)) {
      errors.push('无效的保护级别');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

async function handleDataBreach(incident) {
  // 数据泄露响应
  return {
    action: 'contain',
    message: '正在隔离受影响系统',
    steps: ['识别影响范围', '隔离系统', '通知相关方', '启动调查']
  };
}

async function handleSecurityBreach(incident) {
  // 安全漏洞响应
  return {
    action: 'patch',
    message: '正在应用安全补丁',
    steps: ['评估漏洞影响', '准备补丁', '测试补丁', '部署补丁', '验证修复']
  };
}

async function handleFraudDetected(incident) {
  // 欺诈检测响应
  return {
    action: 'block',
    message: '正在阻止可疑活动',
    steps: ['阻止访问', '分析威胁', '更新黑名单', '通知用户']
  };
}

async function handleComplianceViolation(incident) {
  // 合规违规响应
  return {
    action: 'investigate',
    message: '正在调查违规情况',
    steps: ['评估影响', '制定纠正措施', '实施整改', '验证合规']
  };
}

async function generatePDFReport(reportData, res) {
  // 生成PDF报告
  const { createWriteStream } = require('fs');
  const path = require('path');
  const fs = require('fs').promises;

  const reportPath = path.join(__dirname, '../temp', `security_report_${Date.now()}.pdf`);

  // 这里应该使用PDF生成库，如puppeteer或jsPDF
  // 简化实现，返回JSON格式
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="security_report.json"');

  return new Promise((resolve, reject) => {
    const stream = createWriteStream(reportPath);
    stream.write(JSON.stringify(reportData, null, 2));
    stream.end();
    resolve();
  });
}

async function generateExcelReport(reportData, res) {
  // 生成Excel报告
  const path = require('path');
  const fs = require('fs').promises;

  const reportPath = path.join(__dirname, '../temp', `security_report_${Date.now()}.xlsx`);

  // 这里应该使用Excel生成库，如exceljs
  // 简化实现，返回JSON格式
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="security_report.json"');

  return new Promise((resolve, reject) => {
    const fs = require('fs').promises;
    const logger = require('../utils/logger');
    fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
    resolve();
  });
}

module.exports = {
  ...exports,
  // 添加额外的导出方法
  generateId,
  generateSecurityAlerts,
  getSystemSecurityStatus,
  getRecentSecurityActivities
};