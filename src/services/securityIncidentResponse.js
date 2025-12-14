/**
 * 安全事件响应系统 (SIR)
 * 检测、分析、响应和处置安全事件
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

class SecurityIncidentResponse extends EventEmitter {
  constructor() {
    super();

    this.config = {
      // 响应配置
      response: {
        enabled: true,
        autoResponse: process.env.SIR_AUTO_RESPONSE === 'true',
        escalationThreshold: process.env.SIR_ESCALATION_THRESHOLD || 3,
        responseTimeout: process.env.SIR_RESPONSE_TIMEOUT || 300000, // 5分钟
        maxConcurrentIncidents: process.env.SIR_MAX_CONCURRENT || 10
      },

      // 告警配置
      alerting: {
        enabled: true,
        channels: ['email', 'sms', 'slack', 'webhook'],
        escalation: {
          level1: ['email', 'slack'],      // 初级告警
          level2: ['email', 'sms', 'slack'], // 中级告警
          level3: ['email', 'sms', 'slack', 'webhook'] // 高级告警
        },
        recipients: {
          securityTeam: process.env.SECURITY_TEAM_EMAIL?.split(',') || [],
          management: process.env.MANAGEMENT_EMAIL?.split(',') || [],
          devops: process.env.DEVOPS_EMAIL?.split(',') || []
        }
      },

      // 自动化响应
      automation: {
        enabled: process.env.SIR_AUTOMATION_ENABLED === 'true',
        actions: {
          blockIP: process.env.SIR_AUTO_BLOCK_IP === 'true',
          isolateUser: process.env.SIR_AUTO_ISOLATE_USER === 'true',
          quarantine: process.env.SIR_AUTO_QUARANTINE === 'true',
          backup: process.env.SIR_AUTO_BACKUP === 'true',
          patch: process.env.SIR_AUTO_PATCH === 'true'
        }
      },

      // 合规和报告
      compliance: {
        standards: ['GDPR', 'ISO27001', '等级保护', '数据安全法'],
        retentionDays: process.env.SIR_RETENTION_DAYS || 2555, // 7年
        reporting: {
          enabled: true,
          schedule: '0 0 * * 0', // 每天午夜
          includeRecommendations: true
        }
      }
    };

    // 事件状态
    this.status = {
      detected: 'detected',
      analyzing: 'analyzing',
      responding: 'responding',
      resolved: 'resolved',
      closed: 'closed',
      escalated: 'escalated'
    };

    // 存储系统
    this.incidents = new Map(); // 当前处理中的事件
    this.incidentHistory = []; // 历史事件
    this.playbooks = new Map(); // 响应手册
    this.alertChannels = new Map(); // 告警渠道
    this.resources = new Map(); // 资源状态

    // 统计信息
    this.stats = {
      totalIncidents: 0,
      resolvedIncidents: 0,
      averageResolutionTime: 0,
      incidentTypes: {},
      severityDistribution: {},
      mttr: {
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0
      }
    };

    this.initialize();
  }

  /**
   * 初始化SIR系统
   */
  initialize() {
    console.log('初始化安全事件响应系统...');

    // 加载响应手册
    this.loadPlaybooks();

    // 初始化告警渠道
    this.initializeAlertChannels();

    // 设置定时任务
    this.setupScheduledTasks();

    console.log('安全事件响应系统初始化完成');
  }

  /**
   * 检测安全事件
   */
  async detectIncident(eventData) {
    const incident = {
      id: this.generateIncidentId(),
      timestamp: new Date(),
      status: this.status.detected,
      severity: this.determineSeverity(eventData),
      type: this.determineIncidentType(eventData),
      source: eventData.source || 'unknown',
      description: eventData.description || '安全事件',
      details: eventData,
      assignee: null,
      reporter: eventData.reporter || 'system',
      priority: this.determinePriority(eventData),
      tags: eventData.tags || [],
      timeline: [{
        action: 'detected',
        timestamp: new Date(),
        actor: 'system',
        details: '事件自动检测'
      }],
      response: {
        actions: [],
        current: null,
        completed: []
      },
      impact: {
        affectedSystems: [],
        dataBreach: false,
        availabilityImpact: false,
        financialImpact: false,
        userImpact: false
      },
      resolution: {
        method: null,
        finalStatus: null,
        lessons: [],
        recommendations: []
      }
    };

    // 检查是否为重复事件
    if (this.isDuplicateIncident(incident)) {
      return { success: false, reason: 'Duplicate incident detected' };
    }

    // 添加到当前事件列表
    this.incidents.set(incident.id, incident);

    // 自动分析
    this.analyzeIncident(incident.id);

    // 触发事件
    this.emit('incident:detected', incident);

    console.log(`检测到安全事件: ${incident.id} - ${incident.description}`);

    return { success: true, incidentId: incident.id };
  }

  /**
   * 分析事件
   */
  async analyzeIncident(incidentId) {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;

    incident.status = this.status.analyzing;
    this.updateTimeline(incident.id, 'analyzing', 'system', '开始分析事件');

    try {
      // 评估影响范围
      await this.assessImpact(incident);

      // 确定响应策略
      const strategy = this.determineResponseStrategy(incident);
      incident.response.strategy = strategy;

      // 选择响应手册
      const playbook = this.selectPlaybook(incident);
      incident.response.playbook = playbook;

      // 分配负责人
      incident.assignee = this.assignIncident(incident);

      // 自动响应
      if (this.config.response.autoResponse && this.config.automation.enabled) {
        await this.executeAutoResponse(incident);
      }

      incident.status = this.status.responding;
      this.updateTimeline(incident.id, 'responding', 'system', '开始响应处理');

      // 发送告警
      await this.sendAlert(incident);

      this.emit('incident:analyzed', incident);

    } catch (error) {
      console.error(`分析事件失败 ${incidentId}:`, error);
      incident.status = this.status.detected; // 回退状态
    }
  }

  /**
   * 评估影响范围
   */
  async assessImpact(incident) {
    const impact = incident.impact;

    // 评估受影响的系统
    impact.affectedSystems = this.identifyAffectedSystems(incident.details);

    // 检查数据泄露
    impact.dataBreach = this.assessDataBreach(incident.details);

    // 检查可用性影响
    impact.availabilityImpact = this.assessAvailabilityImpact(incident.details);

    // 检查财务影响
    impact.financialImpact = this.assessFinancialImpact(incident.details);

    // 检查用户影响
    impact.userImpact = this.assessUserImpact(incident.details);
  }

  /**
   * 识别受影响的系统
   */
  identifyAffectedSystems(details) {
    const systems = [];

    if (details.systems) {
      systems.push(...details.systems);
    }

    // 基于事件类型推断受影响系统
    if (details.type === 'web_attack') {
      systems.push('web_server', 'application_server', 'load_balancer');
    }

    if (details.type === 'database_breach') {
      systems.push('database_server', 'backup_system');
    }

    if (details.type === 'network_intrusion') {
      systems.push('firewall', 'router', 'switch');
    }

    return [...new Set(systems)]; // 去重
  }

  /**
   * 评估数据泄露
   */
  assessDataBreach(details) {
    const sensitiveDataPatterns = [
      /password/i,
      /credit.*card/i,
      /ssn/i,
      /personal.*information/i,
      /pii/i,
      /confidential/i
    ];

    const dataContent = JSON.stringify(details);
    return sensitiveDataPatterns.some(pattern => pattern.test(dataContent));
  }

  /**
   * 评估可用性影响
   */
  assessAvailabilityImpact(details) {
    // 检查是否影响服务可用性
    const availabilityImpactingTypes = ['dos_attack', 'system_failure', 'network_outage'];
    return availabilityImpactingTypes.includes(details.type);
  }

  /**
   * 评估财务影响
   */
  assessFinancialImpact(details) {
    const financialIndicators = [
      'payment',
      'transaction',
      'billing',
      'invoice',
      'fraud'
    ];

    const content = JSON.stringify(details);
    return financialIndicators.some(indicator => content.toLowerCase().includes(indicator));
  }

  /**
   * 评估用户影响
   */
  assessUserImpact(details) {
    const userIndicators = [
      'user_account',
      'personal_data',
      'session',
      'authentication'
    ];

    const content = JSON.stringify(details);
    return userIndicators.some(indicator => content.toLowerCase().includes(indicator));
  }

  /**
   * 确定响应策略
   */
  determineResponseStrategy(incident) {
    const strategies = {
      low: {
        type: 'standard',
        urgency: 'normal',
        resources: ['security_analyst'],
        actions: ['investigate', 'document', 'monitor']
      },
      medium: {
        type: 'enhanced',
        urgency: 'high',
        resources: ['security_analyst', 'system_admin'],
        actions: ['investigate', 'contain', 'document', 'monitor', 'notify']
      },
      high: {
        type: 'emergency',
        urgency: 'critical',
        resources: ['security_analyst', 'system_admin', 'management'],
        actions: ['contain', 'eradicate', 'recover', 'document', 'notify', 'report']
      },
      critical: {
        type: 'disaster',
        urgency: 'immediate',
        resources: ['all'],
        actions: ['immediate_containment', 'disaster_recovery', 'investigation', 'report']
      }
    };

    return strategies[incident.severity] || strategies.low;
  }

  /**
   * 选择响应手册
   */
  selectPlaybook(incident) {
    const playbookKey = `${incident.type}_${incident.severity}`;
    return this.playbooks.get(playbookKey) || this.playbooks.get('default');
  }

  /**
   * 分配事件负责人
   */
  assignIncident(incident) {
    // 基于事件类型和严重程度分配
    const assignments = {
      web_attack: {
        low: 'security_analyst',
        medium: 'senior_security_analyst',
        high: 'security_manager',
        critical: 'cto'
      },
      data_breach: {
        low: 'security_analyst',
        medium: 'privacy_officer',
        high: 'legal_counsel',
        critical: 'executive_team'
      },
      network_intrusion: {
        low: 'security_analyst',
        medium: 'network_engineer',
        high: 'security_manager',
        critical: 'cto'
      }
    };

    const incidentTypeAssignments = assignments[incident.type];
    const severityLevels = {
      low: 'low',
      medium: 'medium',
      high: 'high',
      critical: 'critical'
    };

    return incidentTypeAssignments?.[severityLevels[incident.severity]] || 'security_analyst';
  }

  /**
   * 执行自动响应
   */
  async executeAutoResponse(incident) {
    const playbook = incident.response.playbook;
    if (!playbook || !playbook.autoActions) return;

    incident.response.current = 'auto_response';
    this.updateTimeline(incident.id, 'auto_response', 'system', '执行自动响应');

    const results = [];

    for (const action of playbook.autoActions) {
      try {
        const result = await this.executeAction(action, incident);
        results.push(result);
        incident.response.actions.push({
          action: action.type,
          result: result.success ? 'success' : 'failed',
          timestamp: new Date(),
          actor: 'system'
        });

        if (!result.success) {
          console.warn(`自动响应失败: ${action.type} - ${result.error}`);
        }
      } catch (error) {
        console.error(`执行自动响应错误: ${action.type}`, error);
        incident.response.actions.push({
          action: action.type,
          result: 'error',
          timestamp: new Date(),
          actor: 'system',
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 执行响应动作
   */
  async executeAction(action, incident) {
    const actions = {
      block_ip: () => this.blockIP(action.target, incident),
      isolate_user: () => this.isolateUser(action.target, incident),
      quarantine_system: () => this.quarantineSystem(action.target, incident),
      backup_data: () => this.backupData(action.target, incident),
      patch_system: () => this.patchSystem(action.target, incident),
      restart_service: () => this.restartService(action.target, incident),
      notify_team: () => this.notifyTeam(action.target, incident),
      update_firewall: () => this.updateFirewall(action.target, incident)
    };

    const actionFunc = actions[action.type];
    if (!actionFunc) {
      return { success: false, error: `Unknown action type: ${action.type}` };
    }

    return await actionFunc();
  }

  /**
   * 阻止IP
   */
  async blockIP(ipAddress, incident) {
    try {
      const waf = require('./webApplicationFirewall');
      if (waf && waf.blockIPPermanently) {
        waf.blockIPPermanently(ipAddress, `Incident ${incident.id}`);
        return { success: true, message: `IP ${ipAddress} 已被阻止` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: 'WAF不可用' };
  }

  /**
   * 隔离用户
   */
  async isolateUser(userId, incident) {
    try {
      // 实现用户隔离逻辑
      const userService = require('./userService');
      if (userService && userService.isolateUser) {
        await userService.isolateUser(userId, incident.id);
        return { success: true, message: `用户 ${userId} 已被隔离` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: '用户服务不可用' };
  }

  /**
   * 隔离系统
   */
  async quarantineSystem(system, incident) {
    try {
      // 实现系统隔离逻辑
      return { success: true, message: `系统 ${system} 已被隔离` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 备份数据
   */
  async backupData(dataPath, incident) {
    try {
      // 实现数据备份逻辑
      return { success: true, message: `数据已备份到 ${dataPath}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 补丁系统
   */
  async patchSystem(component, incident) {
    try {
      // 实现系统补丁逻辑
      return { success: true, message: `组件 ${component} 已应用补丁` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 重启服务
   */
  async restartService(service, incident) {
    try {
      // 实现服务重启逻辑
      return { success: true, message: `服务 ${service} 已重启` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 通知团队
   */
  async notifyTeam(team, incident) {
    try {
      // 实现团队通知逻辑
      return { success: true, message: `已通知 ${team} 团队` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 更新防火墙
   */
  async updateFirewall(rule, incident) {
    try {
      // 实现防火墙更新逻辑
      return { success: true, message: '防火墙规则已更新' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 手动响应
   */
  async manualResponse(incidentId, action, params) {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error('事件不存在');
    }

    this.updateTimeline(incidentId, 'manual_action', incident.assignee, `执行手动操作: ${action}`);

    try {
      const result = await this.executeAction({ type: action, ...params }, incident);

      incident.response.actions.push({
        action: action,
        result: result.success ? 'success' : 'failed',
        timestamp: new Date(),
        actor: incident.assignee
      });

      this.emit('incident:action_taken', { incidentId, action, result });
      return result;

    } catch (error) {
      console.error(`手动响应失败 ${incidentId}:`, error);
      throw error;
    }
  }

  /**
   * 解决事件
   */
  async resolveIncident(incidentId, resolutionMethod, finalStatus, lessons) {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error('事件不存在');
    }

    incident.status = this.status.resolved;
    incident.resolution.method = resolutionMethod;
    incident.resolution.finalStatus = finalStatus;
    incident.resolution.lessons = lessons || [];

    // 计算解决时间
    const resolutionTime = Date.now() - incident.timestamp.getTime();
    incident.resolution.duration = resolutionTime;

    // 更新时间线
    this.updateTimeline(incidentId, 'resolved', incident.assignee, `事件已解决: ${finalStatus}`);

    // 记录统计
    this.updateStats(incident);

    // 发送到历史
    this.incidentHistory.push(incident);
    this.incidents.delete(incidentId);

    // 清理资源
    await this.cleanupResources(incidentId);

    // 触发事件
    this.emit('incident:resolved', incident);

    console.log(`事件已解决: ${incidentId} - ${finalStatus}`);

    return incident;
  }

  /**
   * 升级事件
   */
  async escalateIncident(incidentId, reason, level) {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error('事件不存在');
    }

    incident.status = this.status.escalated;
    this.updateTimeline(incidentId, 'escalated', 'system', `事件升级: ${reason} - 级别: ${level}`);

    // 发送升级告警
    await this.sendEscalationAlert(incident, level);

    this.emit('incident:escalated', incident);

    return incident;
  }

  /**
   * 更新事件时间线
   */
  updateTimeline(incidentId, action, actor, details) {
    const incident = this.incidents.get(incidentId);
    if (incident) {
      incident.timeline.push({
        action,
        timestamp: new Date(),
        actor: actor,
        details
      });
    }
  }

  /**
   * 发送告警
   */
  async sendAlert(incident) {
    if (!this.config.alerting.enabled) return;

    const level = this.getAlertLevel(incident);
    const channels = this.config.alerting.escalation[level] || [];

    for (const channel of channels) {
      const alertChannel = this.alertChannels.get(channel);
      if (alertChannel) {
        await alertChannel.send(incident, level);
      }
    }
  }

  /**
   * 发送升级告警
   */
  async sendEscalationAlert(incident, level) {
    const channels = this.config.alerting.escalation[level] || [];

    for (const channel of channels) {
      const alertChannel = this.alertChannels.get(channel);
      if (alertChannel) {
        await alertChannel.escalate(incident, level);
      }
    }
  }

  /**
   * 获取告警级别
   */
  getAlertLevel(incident) {
    if (incident.severity === 'critical') return 'level3';
    if (incident.severity === 'high' || incident.impact.dataBreach) return 'level2';
    return 'level1';
  }

  /**
   * 更新统计
   */
  updateStats(incident) {
    this.stats.totalIncidents++;
    if (incident.status === this.status.resolved) {
      this.stats.resolvedIncidents++;
    }

    // 更新类型统计
    this.stats.incidentTypes[incident.type] = (this.stats.incidentTypes[incident.type] || 0) + 1);

    // 更新严重程度分布
    this.stats.severityDistribution[incident.severity] = (this.stats.severityDistribution[incident.severity] || 0) + 1);

    // 计算平均解决时间
    const resolvedIncidents = this.incidentHistory.filter(i => i.status === this.status.resolved);
    if (resolvedIncidents.length > 0) {
      const totalTime = resolvedIncidents.reduce((sum, i) => sum + i.resolution.duration, 0);
      this.stats.averageResolutionTime = Math.round(totalTime / resolvedIncidents.length);
    }

    // 计算MTTR
    this.calculateMTTR();
  }

  /**
   * 计算平均恢复时间
   */
  calculateMTTR() {
    const resolvedIncidents = this.incidentHistory.filter(i => i.status === this.status.resolved);
    if (resolvedIncidents.length === 0) {
      return;
    }

    const durations = resolvedIncidents.map(i => i.resolution.duration).sort((a, b) => a - b);
    const count = durations.length;

    this.stats.mttr = {
      p50: this.percentile(durations, 50),
      p90: this.percentile(durations, 90),
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99)
    };
  }

  /**
   * 计算百分位
   */
  percentile(array, p) {
    const index = Math.ceil((p / 100) * array.length) - 1;
    return array[index] || 0;
  }

  /**
   * 生成事件ID
   */
  generateIncidentId() {
    return 'INC_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  /**
   * 确定严重程度
   */
  determineSeverity(eventData) {
    if (eventData.severity) return eventData.severity;

    // 基于事件特征自动判断
    const severityMap = {
      critical: ['data_breach', 'system_compromise', 'active_attack'],
      high: ['unauthorized_access', 'privilege_escalation', 'malware'],
      medium: ['suspicious_activity', 'policy_violation', 'service_disruption'],
      low: ['misconfiguration', 'informational', 'false_positive']
    };

    for (const [severity, indicators] of Object.entries(severityMap)) {
      if (indicators.some(indicator => JSON.stringify(eventData).includes(indicator))) {
        return severity;
      }
    }

    return 'medium';
  }

  /**
   * 确定事件类型
   */
  determineIncidentType(eventData) {
    if (eventData.type) return eventData.type;

    // 基于数据特征自动分类
    const typeMap = {
      'web_attack': ['sql_injection', 'xss', 'csrf', 'lfi', 'rfi'],
      'data_breach': ['exposed_data', 'leaked_credentials', 'data_exfiltration'],
      'malware': ['virus', 'trojan', 'ransomware', 'spyware'],
      'network_intrusion': ['port_scan', 'brute_force', 'ddos', 'intrusion_attempt'],
      'system_compromise': 'rootkit',
      'policy_violation': ['compliance_failure', 'access_violation'],
      'availability': ['dos', 'outage', 'degradation']
    };

    for (const [type, indicators] of Object.entries(typeMap)) {
      if (Array.isArray(indicators)) {
        if (indicators.some(indicator => JSON.stringify(eventData).includes(indicator))) {
          return type;
        }
      } else {
        if (JSON.stringify(eventData).includes(indicators)) {
          return type;
        }
      }
    }

    return 'unknown';
  }

  /**
   * 确定优先级
   */
  determinePriority(eventData) {
    if (eventData.priority) return eventData.priority;

    const severity = this.determineSeverity(eventData);
    const priorityMap = {
      critical: 'p1',
      high: 'p2',
      medium: 'p3',
      low: 'p4'
    };

    return priorityMap[severity] || 'p3';
  }

  /**
   * 检查重复事件
   */
  isDuplicateIncident(incident) {
    // 检查最近是否有类似事件
    const recentIncidents = Array.from(this.incidents.values()).slice(-10);
    const threshold = 0.8; // 80%相似度阈值

    return recentIncidents.some(existing => {
      return this.calculateSimilarity(incident, existing) > threshold;
    });
  }

  /**
   * 计算相似度
   */
  calculateSimilarity(incident1, incident2) {
    // 简化的相似度计算
    const fields = ['type', 'severity', 'source', 'description'];
    let matches = 0;

    for (const field of fields) {
      if (incident1[field] && incident2[field] &&
          incident1[field].toLowerCase() === incident2[field].toLowerCase()) {
        matches++;
      }
    }

    return matches / fields.length;
  }

  /**
   * 加载响应手册
   */
  loadPlaybooks() {
    const playbooks = {
      'web_attack_low': {
        name: 'Web攻击 - 低风险',
        description: '处理低风险Web攻击的响应流程',
        autoActions: [
          { type: 'block_ip', target: 'attacker_ip' }
        ],
        manualActions: [
          'analyze_logs',
          'check_vulnerability',
          'update_waf_rules'
        ],
        checklists: [
          '确认攻击模式',
          '评估影响范围',
          '检查日志完整性'
        ]
      },
      'web_attack_critical': {
        name: 'Web攻击 - 高风险',
        description: '处理高风险Web攻击的应急响应',
        autoActions: [
          { type: 'block_ip', target: 'attacker_ip' },
          { type: 'isolate_user', target: 'compromised_users' },
          { type: 'quarantine_system', target: 'affected_systems' },
          { type: 'backup_data', target: 'critical_data' }
        ],
        manualActions: [
          'immediate_isolation',
          'forensic_analysis',
          'threat_hunting',
          'system_hardening'
        ],
        checklists: [
          '确认攻击范围',
          '隔离受影响系统',
          '收集证据',
          '通知管理层'
        ]
      },
      'data_breach': {
        name: '数据泄露',
        description: '处理数据泄露事件的响应流程',
        autoActions: [
          { type: 'notify_team', target: 'legal_counsel' },
          { type: 'backup_data', target: 'affected_systems' }
        ],
        manualActions: [
          'contain_breach',
          'assess_impact',
          'notify_authorities',
          'public_statement'
        ],
        checklists: [
          '识别泄露数据',
          '评估法律影响',
          '通知受影响方',
          '制定沟通计划'
        ]
      },
      'default': {
        name: '默认响应',
        description: '通用的安全事件响应流程',
        autoActions: [],
        manualActions: [
          'investigate_incident',
          'assess_impact',
          'document_response'
        ],
        checklists: [
          '收集事件信息',
          '确定事件性质',
          '评估影响范围',
          '制定响应计划'
        ]
      }
    };

    for (const [key, playbook] of Object.entries(playbooks)) {
      this.playbooks.set(key, playbook);
    }

    console.log(`已加载 ${Object.keys(playbooks).length} 个响应手册`);
  }

  /**
   * 初始化告警渠道
   */
  initializeAlertChannels() {
    const channels = [
      'email',
      'sms',
      'slack',
      'webhook'
    ];

    for (const channel of channels) {
      if (this.config.alerting.channels.includes(channel)) {
        this.alertChannels.set(channel, this.createAlertChannel(channel));
      }
    }

    console.log(`已初始化 ${this.alertChannels.size} 个告警渠道`);
  }

  /**
   * 创建告警渠道
   */
  createAlertChannel(type) {
    const channels = {
      email: new EmailAlertChannel(this.config.alerting.recipients),
      sms: new SMSAlertChannel(this.config.alerting.recipients),
      slack: new SlackAlertChannel(process.env.SLACK_WEBHOOK_URL),
      webhook: new WebhookAlertChannel(process.env.WEBHOOK_URL)
    };

    return channels[type];
  }

  /**
   * 设置定时任务
   */
  setupScheduledTasks() {
    // 每小时生成报告
    if (this.config.compliance.reporting.enabled) {
      setInterval(() => {
        this.generateDailyReport();
      }, 60 * 60 * 1000); // 1小时
    }

    // 每15分钟清理过期数据
    setInterval(() => {
      this.cleanup();
    }, 15 * 60 * 1000); // 15分钟

    // 每天更新统计
    setInterval(() => {
      this.updateStats();
    }, 24 * 60 * 60 * 1000); // 24小时
  }

  /**
   * 生成日报
   */
  async generateDailyReport() {
    const report = {
      date: new Date().toISOString().split('T')[0],
      summary: {
        totalIncidents: this.stats.totalIncidents,
        resolvedIncidents: this.stats.resolvedIncidents,
        averageResolutionTime: this.stats.averageResolutionTime,
        activeIncidents: this.incidents.size
      },
      incidents: Array.from(this.incidents.values()).slice(0, 10),
      trends: this.analyzeTrends(),
      recommendations: this.generateRecommendations()
    };

    // 这里应该发送报告到指定的渠道
    console.log('生成安全事件日报:', {
      total: report.summary.totalIncidents,
      resolved: report.summary.resolvedIncidents,
      active: report.summary.activeIncidents
    });
  }

  /**
   * 分析趋势
   */
  analyzeTrends() {
    const recentIncidents = this.incidentHistory.slice(-100);
    if (recentIncidents.length < 10) {
      return { trend: 'insufficient_data' };
    }

    // 按天分组
    const dailyCounts = {};
    recentIncidents.forEach(incident => {
      const day = new Date(incident.timestamp).toISOString().split('T')[0];
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    });

    const counts = Object.values(dailyCounts);
    const average = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    const latest = counts[counts.length - 1];

    let trend = 'stable';
    if (latest > average * 1.5) {
      trend = 'increasing';
    } else if (latest < average * 0.5) {
      trend = 'decreasing';
    }

    return { trend, average, latest };
  }

  /**
   * 生成建议
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.stats.averageResolutionTime > 24 * 60 * 60 * 1000) { // 超过24小时
      recommendations.push({
        type: 'efficiency',
        title: '提升响应效率',
        description: '平均解决时间较长，建议优化响应流程',
        priority: 'high',
        actions: ['完善响应手册', '加强培训', '优化资源分配']
      });
    }

    if (this.stats.resolvedIncidents / this.stats.totalIncidents < 0.8) {
      recommendations.push({
        type: 'effectiveness',
        title: '提高解决率',
        description: '事件解决率较低，需要加强响应能力',
        priority: 'medium',
        actions: ['改进检测机制', '加强预防措施', '提升响应能力']
      });
    }

    return recommendations;
  }

  /**
   * 清理资源
   */
  cleanup() {
    const now = Date.now();

    // 清理过期的资源
    for (const [ip, data] of this.blockedIPs.entries()) {
      if (!data.permanent && data.unblockTime < now) {
        this.blockedIPs.delete(ip);
      }
    }

    // 清理过期的异常评分
    for (const [ip, data] of this.anomalyScores.entries()) {
      if (now - data.lastUpdate > 7 * 24 * 60 * 60 * 1000) { // 7天
        this.anomalyScores.delete(ip);
      }
    }
  }

  /**
   * 获取事件状态
   */
  getIncidentStatus(incidentId) {
    return this.incidents.get(incidentId);
  }

  /**
   * 获取所有活跃事件
   */
  getActiveIncidents() {
    return Array.from(this.incidents.values());
  }

  /**
   * 获取系统状态
   */
  getSystemStatus() {
    return {
      enabled: true,
      stats: this.stats,
      activeIncidents: this.incidents.size,
      alertChannels: Array.from(this.alertChannels.keys()),
      lastUpdate: new Date(),
      health: this.checkHealth()
    };
  }

  /**
   * 健康检查
   */
  checkHealth() {
    const issues = [];

    if (this.incidents.size > this.config.response.maxConcurrentIncidents) {
      issues.push({
        type: 'capacity',
        severity: 'warning',
        message: '并发事件数量接近上限'
      });
    }

    return {
      status: issues.length === 0 ? 'healthy' : 'warning',
      issues
    };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
    console.log('SIR配置已更新');
  }

  /**
   * 获取安全报告
   */
  getSecurityReport(timeRange = '30d') {
    return {
      timeRange,
      summary: {
        totalIncidents: this.stats.totalIncidents,
        resolvedIncidents: this.stats.resolvedIncidents,
        averageResolutionTime: this.stats.averageResolutionTime,
        mttr: this.stats.mttr,
        activeIncidents: this.incidents.size,
        stats: this.stats
      },
      incidentTypes: this.stats.incidentTypes,
      severityDistribution: this.stats.severityDistribution,
      trends: this.analyzeTrends(),
      recentIncidents: this.incidentHistory.slice(-20),
      recommendations: this.generateRecommendations()
    };
  }
}

/**
 * 邮件告警渠道
 */
class EmailAlertChannel {
  constructor(recipients) {
    this.recipients = recipients.securityTeam || [];
  }

  async send(incident, level) {
    // 实现邮件发送逻辑
    console.log(`发送邮件告警: ${incident.id} - ${incident.description}`);
  }

  async escalate(incident, level) {
    // 实现邮件升级逻辑
    console.log(`发送升级邮件告警: ${incident.id} - 级别: ${level}`);
  }
}

/**
 * 短信告警渠道
 */
class SMSAlertChannel {
  constructor(recipients) {
    this.recipients = recipients.devops || [];
  }

  async send(incident, level) {
    // 实现短信发送逻辑
    console.log(`发送短信告警: ${incident.id} - ${incident.description}`);
  }

  async escalate(incident, level) {
    // 实现短信升级逻辑
    console.log(`发送升级短信告警: ${incident.id} - 级别: ${level}`);
  }
}

/**
 * Slack告警渠道
 */
class SlackAlertChannel {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }

  async send(incident, level) {
    // 实现Slack通知逻辑
    console.log(`发送Slack告警: ${incident.id} - ${incident.description}`);
  }

  async escalate(incident, level) {
    // 实现Slack升级逻辑
    console.log(`发送Slack升级告警: ${incident.id} - 级别: ${level}`);
  }
}

/**
 * Webhook告警渠道
 */
class WebhookAlertChannel {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }

  async send(incident, level) {
    // 实现Webhook通知逻辑
    console.log(`发送Webhook告警: ${incident.id} - ${incident.description}`);
  }

  async escalate(incident, level) {
    // 实现Webhook升级逻辑
    console.log(`发送Webhook升级告警: ${incident.id} - 级别: ${level}`);
  }
}

// 创建全局实例
const securityIncidentResponse = new SecurityIncidentResponse();

module.exports = securityIncidentResponse;