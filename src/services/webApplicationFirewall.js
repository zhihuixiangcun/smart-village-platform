/**
 * Web应用防火墙 (WAF)
 * 防护Web应用免受各种攻击
 */

const ip = require('ip');
const crypto = require('crypto');
const url = require('url');

class WebApplicationFirewall {
  constructor() {
    this.config = {
      // 基本配置
      enabled: true,
      mode: process.env.WAF_MODE || 'monitoring', // monitoring, blocking, learning

      // 请求限制
      requestLimits: {
        maxRequestSize: parseInt(process.env.WAF_MAX_REQUEST_SIZE) || 1024 * 1024 * 10, // 10MB
        maxHeaderSize: parseInt(process.env.WAF_MAX_HEADER_SIZE) || 8192,
        maxUrlLength: parseInt(process.env.WAF_MAX_URL_LENGTH) || 2048,
        maxParamCount: parseInt(process.env.WAF_MAX_PARAM_COUNT) || 100
      },

      // IP白名单和黑名单
      ipLists: {
        whitelist: process.env.WAF_IP_WHITELIST?.split(',') || [],
        blacklist: process.env.WAF_IP_BLACKLIST?.split(',') || []
      },

      // 地理位置限制
      geoBlocking: {
        enabled: process.env.WAF_GEO_BLOCKING === 'true',
        blockedCountries: process.env.WAF_BLOCKED_COUNTRIES?.split(',') || [],
        allowedCountries: process.env.WAF_ALLOWED_COUNTRIES?.split(',') || []
      },

      // 速率限制
      rateLimiting: {
        enabled: process.env.WAF_RATE_LIMITING !== 'false',
        windowMs: parseInt(process.env.WAF_RATE_WINDOW) || 15 * 60 * 1000, // 15分钟
        maxRequests: parseInt(process.env.WAF_MAX_REQUESTS) || 1000,
        blockDuration: parseInt(process.env.WAF_BLOCK_DURATION) || 60 * 60 * 1000 // 1小时
      },

      // 防护规则
      protections: {
        sqlInjection: true,
        xss: true,
        pathTraversal: true,
        commandInjection: true,
        fileInclusion: true,
        ldapInjection: true,
        xmlInjection: true,
        ssrf: true,
        csrf: true,
        headerInjection: true,
        protocolViolation: true,
        anomalyScoring: true
      },

      // 异常检测
      anomaly: {
        enabled: true,
        threshold: parseInt(process.env.WAF_ANOMALY_THRESHOLD) || 20,
        learningMode: process.env.WAF_LEARNING_MODE === 'true'
      },

      // 日志和监控
      logging: {
        enabled: true,
        level: process.env.WAF_LOG_LEVEL || 'info',
        includeRequestBody: process.env.WAF_LOG_REQUEST_BODY === 'true',
        storageDays: parseInt(process.env.WAF_LOG_RETENTION) || 30
      }
    };

    // 存储状态
    this.ipRequests = new Map(); // IP请求计数
    this.blockedIPs = new Map(); // 被阻止的IP
    this.anomalyScores = new Map(); // IP异常评分
    this.securityEvents = []; // 安全事件

    // 规则引擎
    this.ruleEngine = new RuleEngine(this.config.protections);

    // 统计信息
    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      blockedIPs: 0,
      rulesTriggered: {},
      attacksBlocked: {},
      lastUpdate: new Date()
    };

    this.initialize();
  }

  /**
   * 初始化WAF
   */
  initialize() {
    logger.debug('初始化Web应用防火墙...');
    // 加载IP黑名单
    this.loadIPBlacklist();

    // 设置定时清理
    setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // 每分钟清理一次

    logger.debug('WAF初始化完成');
  }

  /**
   * WAF中间件
   */
  middleware() {
    return (req, res, next) => {
      if (!this.config.enabled) {
        return next();
      }

      try {
        // 预处理请求
        const analysis = this.analyzeRequest(req);

        // 检查是否应该阻止请求
        const decision = this.makeDecision(analysis);

        // 记录统计
        this.updateStats(analysis, decision);

        // 根据决策处理请求
        if (decision.action === 'block') {
          this.blockRequest(req, res, decision);
        } else {
          // 添加安全头
          this.addSecurityHeaders(res);
          next();
        }

      } catch (error) {
        logger.error('WAF处理错误:', error);
        next(); // 出错时允许请求通过，避免影响业务
      }
    };
  }

  /**
   * 分析请求
   */
  analyzeRequest(req) {
    const analysis = {
      timestamp: new Date(),
      ip: this.getClientIP(req),
      method: req.method,
      url: req.url,
      headers: req.headers,
      userAgent: req.get('User-Agent'),
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length'),
      params: req.query,
      body: req.body,
      cookies: req.cookies,
      geolocation: null,
      riskScore: 0,
      violations: [],
      ruleMatches: []
    };

    // 基础检查
    this.performBasicChecks(analysis);

    // 地理位置检查
    if (this.config.geoBlocking.enabled) {
      analysis.geolocation = this.getGeoLocation(analysis.ip);
      this.checkGeoBlocking(analysis);
    }

    // 速率限制检查
    if (this.config.rateLimiting.enabled) {
      this.checkRateLimit(analysis);
    }

    // 规则检查
    this.ruleEngine.process(analysis);

    // 异常评分
    if (this.config.anomaly.enabled) {
      this.calculateAnomalyScore(analysis);
    }

    return analysis;
  }

  /**
   * 基础安全检查
   */
  performBasicChecks(analysis) {
    // 检查请求大小
    if (this.config.requestLimits.maxRequestSize && analysis.contentLength) {
      const size = parseInt(analysis.contentLength);
      if (size > this.config.requestLimits.maxRequestSize) {
        analysis.violations.push({
          type: 'request_size_exceeded',
          severity: 'medium',
          description: '请求体过大',
          value: size
        });
        analysis.riskScore += 5;
      }
    }

    // 检查URL长度
    if (analysis.url.length > this.config.requestLimits.maxUrlLength) {
      analysis.violations.push({
        type: 'url_too_long',
        severity: 'medium',
        description: 'URL过长',
        value: analysis.url.length
      });
      analysis.riskScore += 3;
    }

    // 检查参数数量
    const paramCount = Object.keys(analysis.params).length;
    if (paramCount > this.config.requestLimits.maxParamCount) {
      analysis.violations.push({
        type: 'too_many_parameters',
        severity: 'low',
        description: '参数数量过多',
        value: paramCount
      });
      analysis.riskScore += 2;
    }

    // 检查User-Agent
    if (!analysis.userAgent || analysis.userAgent.length < 10) {
      analysis.violations.push({
        type: 'invalid_user_agent',
        severity: 'low',
        description: '无效的User-Agent'
      });
      analysis.riskScore += 1;
    }
  }

  /**
   * 地理位置检查
   */
  checkGeoBlocking(analysis) {
    if (!analysis.geolocation) return;

    const country = analysis.geolocation.country;

    // 检查阻止的国家
    if (this.config.geoBlocking.blockedCountries.includes(country)) {
      analysis.violations.push({
        type: 'geo_blocked_country',
        severity: 'high',
        description: `来自被阻止的国家: ${country}`,
        value: country
      });
      analysis.riskScore += 15;
    }

    // 检查允许的国家（如果配置了）
    if (this.config.geoBlocking.allowedCountries.length > 0 &&
        !this.config.geoBlocking.allowedCountries.includes(country)) {
      analysis.violations.push({
        type: 'geo_unallowed_country',
        severity: 'medium',
        description: `来自未授权的国家: ${country}`,
        value: country
      });
      analysis.riskScore += 10;
    }
  }

  /**
   * 速率限制检查
   */
  checkRateLimit(analysis) {
    const clientIP = analysis.ip;
    const now = Date.now();

    if (!this.ipRequests.has(clientIP)) {
      this.ipRequests.set(clientIP, {
        count: 0,
        resetTime: now + this.config.rateLimiting.windowMs
      });
    }

    const ipData = this.ipRequests.get(clientIP);

    // 重置计数器
    if (now > ipData.resetTime) {
      ipData.count = 0;
      ipData.resetTime = now + this.config.rateLimiting.windowMs;
    }

    ipData.count++;

    // 检查是否超过限制
    if (ipData.count > this.config.rateLimiting.maxRequests) {
      analysis.violations.push({
        type: 'rate_limit_exceeded',
        severity: 'high',
        description: '请求频率超过限制',
        value: ipData.count
      });
      analysis.riskScore += 20;
    }

    // 超过限制2倍则临时阻止
    if (ipData.count > this.config.rateLimiting.maxRequests * 2) {
      this.blockIPTemporarily(clientIP, 'Rate limit exceeded');
      analysis.violations.push({
        type: 'temporary_block',
        severity: 'critical',
        description: '触发临时阻止',
        value: ipData.count
      });
      analysis.riskScore += 30;
    }
  }

  /**
   * 计算异常评分
   */
  calculateAnomalyScore(analysis) {
    const clientIP = analysis.ip;

    if (!this.anomalyScores.has(clientIP)) {
      this.anomalyScores.set(clientIP, {
        score: 0,
        history: [],
        lastUpdate: Date.now()
      });
    }

    const anomalyData = this.anomalyScores.get(clientIP);

    // 基于违规计算评分
    anomalyData.score += analysis.violations.reduce((sum, violation) => {
      const severityScore = {
        low: 1,
        medium: 3,
        high: 5,
        critical: 10
      };
      return sum + (severityScore[violation.severity] || 1);
    }, 0);

    // 添加到历史记录
    anomalyData.history.push({
      timestamp: Date.now(),
      score: analysis.riskScore,
      violations: analysis.violations.length
    });

    // 保持历史记录在合理范围内
    if (anomalyData.history.length > 100) {
      anomalyData.history = anomalyData.history.slice(-50);
    }

    // 更新分析中的风险评分
    analysis.riskScore += anomalyData.score;

    // 检查异常阈值
    if (anomalyData.score > this.config.anomaly.threshold) {
      analysis.violations.push({
        type: 'anomaly_score_high',
        severity: 'high',
        description: '异常评分过高',
        value: anomalyData.score
      });
      analysis.riskScore += 15;
    }

    anomalyData.lastUpdate = Date.now();
  }

  /**
   * 做出决策
   */
  makeDecision(analysis) {
    const decision = {
      action: 'allow', // allow, block, challenge
      reason: '',
      riskScore: analysis.riskScore,
      violations: analysis.violations,
      blockedBy: []
    };

    // 检查IP是否被阻止
    if (this.isIPBlocked(analysis.ip)) {
      decision.action = 'block';
      decision.reason = 'IP已被阻止';
      decision.blockedBy.push('ip_blacklist');
      return decision;
    }

    // 根据模式决定
    switch (this.config.mode) {
    case 'monitoring':
      // 监控模式：只记录，不阻止
      decision.action = 'allow';
      if (analysis.riskScore > 0) {
        decision.reason = '风险评分较高（监控模式）';
      }
      break;

    case 'blocking':
      // 阻止模式：根据风险评分决定
      if (analysis.riskScore >= 30) {
        decision.action = 'block';
        decision.reason = '风险评分过高';
        decision.blockedBy.push('risk_threshold');
      } else if (analysis.riskScore >= 20) {
        decision.action = 'challenge';
        decision.reason = '需要验证';
        decision.blockedBy.push('challenge_required');
      }
      break;

    case 'learning':
      // 学习模式：记录所有异常，但只阻止严重威胁
      if (analysis.riskScore >= 40) {
        decision.action = 'block';
        decision.reason = '严重威胁（学习模式）';
        decision.blockedBy.push('critical_threat');
      }
      break;
    }

    return decision;
  }

  /**
   * 阻止请求
   */
  blockRequest(req, res, decision) {
    this.stats.blockedRequests++;

    // 记录安全事件
    this.recordSecurityEvent(req, decision);

    // 更新规则统计
    decision.blockedBy.forEach(rule => {
      this.stats.rulesTriggered[rule] = (this.stats.rulesTriggered[rule] || 0) + 1;
    });

    // 发送阻止响应
    res.status(403).json({
      error: 'Request Blocked',
      message: 'Your request has been blocked by Web Application Firewall',
      requestId: req.id || this.generateRequestId(),
      code: 'WAF_BLOCKED'
    });
  }

  /**
   * 添加安全头
   */
  addSecurityHeaders(res) {
    // 防止MIME类型嗅探
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // XSS保护
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // 防止点击劫持
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // 强制HTTPS
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // 内容安全策略
    res.setHeader('Content-Security-Policy',
      'default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'');

    // 引用者策略
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // 权限策略
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // 自定义安全头
    res.setHeader('X-WAF-Protected', 'SmartVillage-WAF');
    res.setHeader('X-WAF-Version', '1.0.0');
  }

  /**
   * 记录安全事件
   */
  recordSecurityEvent(req, decision) {
    const event = {
      timestamp: new Date(),
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      decision: decision.action,
      reason: decision.reason,
      riskScore: decision.riskScore,
      violations: decision.violations,
      requestId: req.id || this.generateRequestId()
    };

    this.securityEvents.push(event);

    // 保持事件记录在合理范围内
    if (this.securityEvents.length > 10000) {
      this.securityEvents = this.securityEvents.slice(-5000);
    }

    // 记录到日志
    if (this.config.logging.enabled) {
      this.logSecurityEvent(event);
    }

    // 触发告警
    if (decision.action === 'block' && decision.riskScore > 25) {
      this.triggerAlert(event);
    }
  }

  /**
   * 日志记录
   */
  logSecurityEvent(event) {
    const logLevel = event.riskScore > 20 ? 'error' : 'warn';

    const logMessage = `WAF Event: ${event.ip} ${event.method} ${event.url} - ${event.reason} (Score: ${event.riskScore})`;

    console[logLevel](`[WAF] ${logMessage}`);
  }

  /**
   * 触发告警
   */
  triggerAlert(event) {
    // 这里应该集成告警系统
    logger.debug('[WAF ALERT] High severity event detected:', {
      ip: event.ip,
      url: event.url,
      score: event.riskScore,
      violations: event.violations.length
    });
  }

  /**
   * 更新统计
   */
  updateStats(analysis, decision) {
    this.stats.totalRequests++;

    if (decision.action === 'block') {
      this.stats.blockedRequests++;
    }

    // 更新攻击类型统计
    analysis.violations.forEach(violation => {
      this.stats.attacksBlocked[violation.type] =
        (this.stats.attacksBlocked[violation.type] || 0) + 1;
    });

    this.stats.lastUpdate = new Date();
  }

  /**
   * 获取客户端IP
   */
  getClientIP(req) {
    return req.ip ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           '127.0.0.1';
  }

  /**
   * 获取地理位置信息
   */
  getGeoLocation(ip) {
    // 简化实现，实际应该使用GeoIP数据库
    const geoip = require('geoip-lite');
const logger = require('../utils/logger');
    return geoip.lookup(ip) || { country: 'Unknown' };
  }

  /**
   * 检查IP是否被阻止
   */
  isIPBlocked(clientIP) {
    return this.blockedIPs.has(clientIP) ||
           this.config.ipLists.blacklist.includes(clientIP) ||
           this.isPrivateIP(clientIP);
  }

  /**
   * 检查是否为私有IP
   */
  isPrivateIP(ip) {
    return ip.isPrivate(ip);
  }

  /**
   * 临时阻止IP
   */
  blockIPTemporarily(clientIP, reason) {
    const blockDuration = this.config.rateLimiting.blockDuration;
    const unblockTime = Date.now() + blockDuration;

    this.blockedIPs.set(clientIP, {
      reason,
      blockedAt: Date.now(),
      unblockTime
    });

    this.stats.blockedIPs++;
  }

  /**
   * 永久阻止IP
   */
  blockIPPermanently(clientIP, reason) {
    this.blockedIPs.set(clientIP, {
      reason,
      blockedAt: Date.now(),
      permanent: true
    });

    this.stats.blockedIPs++;
  }

  /**
   * 解除IP阻止
   */
  unblockIP(clientIP) {
    if (this.blockedIPs.has(clientIP)) {
      this.blockedIPs.delete(clientIP);
      this.stats.blockedIPs = Math.max(0, this.stats.blockedIPs - 1);
    }
  }

  /**
   * 加载IP黑名单
   */
  loadIPBlacklist() {
    // 这里可以从文件或数据库加载黑名单
    logger.debug(`已加载 ${this.config.ipLists.blacklist.length} 个黑名单IP`);
  }

  /**
   * 清理过期数据
   */
  cleanup() {
    const now = Date.now();

    // 清理过期的IP阻止记录
    for (const [ip, data] of this.blockedIPs.entries()) {
      if (!data.permanent && data.unblockTime < now) {
        this.blockedIPs.delete(ip);
      }
    }

    // 清理过期的请求计数
    for (const [ip, data] of this.ipRequests.entries()) {
      if (data.resetTime < now) {
        this.ipRequests.delete(ip);
      }
    }

    // 清理过期的异常评分
    for (const [ip, data] of this.anomalyScores.entries()) {
      if (now - data.lastUpdate > 24 * 60 * 60 * 1000) { // 24小时
        this.anomalyScores.delete(ip);
      }
    }
  }

  /**
   * 生成请求ID
   */
  generateRequestId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * 获取WAF状态
   */
  getStatus() {
    return {
      enabled: this.config.enabled,
      mode: this.config.mode,
      stats: this.stats,
      blockedIPs: this.blockedIPs.size,
      recentEvents: this.securityEvents.slice(-10),
      lastUpdate: new Date()
    };
  }

  /**
   * 获取安全报告
   */
  getSecurityReport(timeRange = '24h') {
    const now = Date.now();
    const timeMs = this.parseTimeRange(timeRange);
    const cutoffTime = now - timeMs;

    const recentEvents = this.securityEvents.filter(event =>
      event.timestamp.getTime() > cutoffTime
    );

    return {
      timeRange,
      summary: {
        totalEvents: recentEvents.length,
        blockedRequests: recentEvents.filter(e => e.decision === 'block').length,
        uniqueIPs: new Set(recentEvents.map(e => e.ip)).size,
        averageRiskScore: recentEvents.reduce((sum, e) => sum + e.riskScore, 0) / recentEvents.length || 0
      },
      topAttacks: this.getTopAttacks(recentEvents),
      topBlockedIPs: this.getTopBlockedIPs(recentEvents),
      trends: this.analyzeTrends(recentEvents),
      recommendations: this.generateSecurityRecommendations(recentEvents)
    };
  }

  /**
   * 获取最常见攻击类型
   */
  getTopAttacks(events) {
    const attackCounts = {};

    events.forEach(event => {
      event.violations.forEach(violation => {
        attackCounts[violation.type] = (attackCounts[violation.type] || 0) + 1;
      });
    });

    return Object.entries(attackCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));
  }

  /**
   * 获取最常被阻止的IP
   */
  getTopBlockedIPs(events) {
    const ipCounts = {};

    events.filter(e => e.decision === 'block')
      .forEach(event => {
        ipCounts[event.ip] = (ipCounts[event.ip] || 0) + 1;
      });

    return Object.entries(ipCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));
  }

  /**
   * 分析趋势
   */
  analyzeTrends(events) {
    if (events.length < 10) {
      return { trend: 'insufficient_data' };
    }

    // 按小时分组
    const hourlyCounts = {};
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
    });

    const counts = Object.values(hourlyCounts);
    const average = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    const latest = counts[counts.length - 1];

    let trend = 'stable';
    if (latest > average * 1.3) {
      trend = 'increasing';
    } else if (latest < average * 0.7) {
      trend = 'decreasing';
    }

    return { trend, average, latest };
  }

  /**
   * 生成安全建议
   */
  generateSecurityRecommendations(events) {
    const recommendations = [];

    const blockedCount = events.filter(e => e.decision === 'block').length;
    const highRiskCount = events.filter(e => e.riskScore > 25).length;

    if (highRiskCount > 10) {
      recommendations.push({
        priority: 'high',
        title: '加强安全防护',
        description: '检测到大量高风险请求，建议增强WAF规则',
        actions: ['更新规则库', '增加敏感词汇', '调整阈值']
      });
    }

    if (blockedCount > events.length * 0.1) {
      recommendations.push({
        priority: 'medium',
        title: '优化防护策略',
        description: '阻止率较高，可能存在误报或攻击集中',
        actions: ['检查误报情况', '调整防护规则', '加强监控']
      });
    }

    return recommendations;
  }

  /**
   * 解析时间范围
   */
  parseTimeRange(range) {
    const unit = range.slice(-1);
    const value = parseInt(range.slice(0, -1));

    switch (unit) {
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'w': return value * 7 * 24 * 60 * 60 * 1000;
    case 'm': return value * 30 * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000; // 默认24小时
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
    logger.debug('WAF配置已更新');
  }
}

/**
 * 规则引擎
 */
class RuleEngine {
  constructor(protections) {
    this.protections = protections;
    this.rules = this.initializeRules();
  }

  /**
   * 初始化规则
   */
  initializeRules() {
    const rules = [];

    // SQL注入规则
    if (this.protections.sqlInjection) {
      rules.push(...this.getSQLInjectionRules());
    }

    // XSS规则
    if (this.protections.xss) {
      rules.push(...this.getXSSRules());
    }

    // 路径遍历规则
    if (this.protections.pathTraversal) {
      rules.push(...this.getPathTraversalRules());
    }

    // 命令注入规则
    if (this.protections.commandInjection) {
      rules.push(...this.getCommandInjectionRules());
    }

    // 文件包含规则
    if (this.protections.fileInclusion) {
      rules.push(...this.getFileInclusionRules());
    }

    return rules;
  }

  /**
   * SQL注入规则
   */
  getSQLInjectionRules() {
    return [
      {
        name: 'SQL Injection - Union',
        pattern: /union\s+select/i,
        target: ['query', 'body'],
        severity: 'high',
        description: '检测到SQL注入攻击'
      },
      {
        name: 'SQL Injection - Comment',
        pattern: /--|#|\/\*/i,
        target: ['query', 'body'],
        severity: 'medium',
        description: '检测到SQL注释注入'
      },
      {
        name: 'SQL Injection - Function',
        pattern: /\b(select|insert|update|delete|drop|alter|create|exec)\s/i,
        target: ['query', 'body'],
        severity: 'medium',
        description: '检测到SQL函数注入'
      }
    ];
  }

  /**
   * XSS规则
   */
  getXSSRules() {
    return [
      {
        name: 'XSS - Script Tag',
        pattern: /<script/i,
        target: ['query', 'body'],
        severity: 'high',
        description: '检测到XSS攻击 - script标签'
      },
      {
        name: 'XSS - JavaScript',
        pattern: /javascript:/i,
        target: ['query', 'body'],
        severity: 'high',
        description: '检测到XSS攻击 - JavaScript协议'
      },
      {
        name: 'XSS - OnEvent',
        pattern: /on\w+\s*=/i,
        target: ['query', 'body'],
        severity: 'medium',
        description: '检测到XSS攻击 - 事件处理器'
      }
    ];
  }

  /**
   * 路径遍历规则
   */
  getPathTraversalRules() {
    return [
      {
        name: 'Path Traversal - ../',
        pattern: /\.\.[\/\\]/,
        target: ['url', 'query'],
        severity: 'high',
        description: '检测到路径遍历攻击'
      },
      {
        name: 'Path Traversal - Absolute Path',
        pattern: /[a-zA-Z]:[\\\/]/,
        target: ['query', 'body'],
        severity: 'medium',
        description: '检测到绝对路径'
      }
    ];
  }

  /**
   * 命令注入规则
   */
  getCommandInjectionRules() {
    return [
      {
        name: 'Command Injection - Exec',
        pattern: /(exec|system|shell_exec|passthru)/i,
        target: ['query', 'body'],
        severity: 'critical',
        description: '检测到命令注入攻击'
      },
      {
        name: 'Command Injection - Pipe',
        pattern: /[|&;]/,
        target: ['query', 'body'],
        severity: 'high',
        description: '检测到命令注入 - 管道符'
      }
    ];
  }

  /**
   * 文件包含规则
   */
  getFileInclusionRules() {
    return [
      {
        name: 'File Inclusion - Include',
        pattern: /include\s*\(/i,
        target: ['query', 'body'],
        severity: 'medium',
        description: '检测到文件包含攻击'
      },
      {
        name: 'File Inclusion - Require',
        pattern: /require\s*\(/i,
        target: ['query', 'body'],
        severity: 'low',
        description: '检测到文件包含 - require'
      }
    ];
  }

  /**
   * 处理请求
   */
  process(analysis) {
    this.rules.forEach(rule => {
      this.checkRule(analysis, rule);
    });
  }

  /**
   * 检查规则
   */
  checkRule(analysis, rule) {
    const targets = Array.isArray(rule.target) ? rule.target : [rule.target];

    targets.forEach(target => {
      const content = this.getContent(analysis, target);
      if (content && rule.pattern.test(content)) {
        analysis.violations.push({
          type: rule.name,
          severity: rule.severity,
          description: rule.description,
          rule: rule.name,
          pattern: rule.pattern.source
        });
        analysis.ruleMatches.push(rule.name);
        analysis.riskScore += this.getSeverityScore(rule.severity);
      }
    });
  }

  /**
   * 获取内容
   */
  getContent(analysis, target) {
    switch (target) {
    case 'query':
      return new URLSearchParams(analysis.url).toString();
    case 'body':
      return analysis.body ? JSON.stringify(analysis.body) : '';
    case 'headers':
      return JSON.stringify(analysis.headers);
    case 'url':
      return analysis.url;
    case 'userAgent':
      return analysis.userAgent;
    default:
      return '';
    }
  }

  /**
   * 获取严重程度评分
   */
  getSeverityScore(severity) {
    const scores = {
      low: 1,
      medium: 3,
      high: 5,
      critical: 10
    };
    return scores[severity] || 1;
  }
}

// 创建全局实例
const webApplicationFirewall = new WebApplicationFirewall();

module.exports = webApplicationFirewall;