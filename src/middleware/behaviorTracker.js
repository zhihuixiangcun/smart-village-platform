/**
 * 行为追踪中间件
 * 自动记录用户在平台上的所有行为
 */

const BehaviorLog = require('../models/BehaviorLog');

class BehaviorTracker {
  constructor() {
    // 需要追踪的路由模式
    this.trackedPatterns = {
      // 村民相关
      'GET:/api/v1/residents': {
        action: 'profile_view',
        category: 'engagement',
        module: 'resident_management'
      },
      'POST:/api/v1/residents': {
        action: 'document_apply',
        category: 'activity',
        module: 'resident_management'
      },
      'PUT:/api/v1/residents': {
        action: 'profile_update',
        category: 'engagement',
        module: 'resident_management'
      },

      // 公告相关
      'GET:/api/v1/announcements': {
        action: 'announcement_read',
        category: 'engagement',
        module: 'announcements'
      },
      'POST:/api/v1/announcements': {
        action: 'announcement_create',
        category: 'participation',
        module: 'announcements'
      },
      'POST:/api/v1/announcements/:id/like': {
        action: 'like_action',
        category: 'interaction',
        module: 'announcements'
      },
      'POST:/api/v1/announcements/:id/comment': {
        action: 'comment_post',
        category: 'interaction',
        module: 'announcements'
      },

      // 财务相关
      'GET:/api/v1/finance': {
        action: 'financial_info_view',
        category: 'engagement',
        module: 'financial_management'
      },
      'POST:/api/v1/finance': {
        action: 'payment_process',
        category: 'transaction',
        module: 'financial_management'
      },

      // 投票相关
      'GET:/api/v1/votes': {
        action: 'vote_view',
        category: 'engagement',
        module: 'voting'
      },
      'POST:/api/v1/votes/:id/participate': {
        action: 'vote_participate',
        category: 'participation',
        module: 'voting'
      },

      // 帮助中心
      'GET:/api/v1/help': {
        action: 'help_center_view',
        category: 'engagement',
        module: 'help_center'
      },
      'POST:/api/v1/help/request': {
        action: 'help_request',
        category: 'interaction',
        module: 'help_center'
      },
      'POST:/api/v1/help/respond': {
        action: 'help_provide',
        category: 'interaction',
        module: 'help_center'
      },

      // 文档相关
      'GET:/api/v1/documents': {
        action: 'document_view',
        category: 'engagement',
        module: 'documents'
      },
      'POST:/api/v1/documents': {
        action: 'document_apply',
        category: 'activity',
        module: 'documents'
      },

      // 设置相关
      'PUT:/api/v1/users/profile': {
        action: 'settings_update',
        category: 'engagement',
        module: 'settings'
      }
    };

    // 不需要追踪的路由
    this.ignorePatterns = [
      'GET:/api/v1/health',
      'GET:/api/v1/monitoring',
      'POST:/api/v1/auth/login',
      'POST:/api/v1/auth/logout'
    ];
  }

  /**
   * 创建行为追踪中间件
   */
  middleware() {
    return async (req, res, next) => {
      const startTime = Date.now();

      // 记录原始的res.end方法
      const originalEnd = res.end;

      res.end = async function(chunk, encoding) {
        // 调用原始的end方法
        originalEnd.call(this, chunk, encoding);

        // 异步记录行为，不阻塞响应
        setImmediate(async () => {
          try {
            await this.trackBehavior(req, res, startTime);
          } catch (error) {
            console.error('行为追踪失败:', error);
          }
        });
      };

      next();
    };
  }

  /**
   * 追踪用户行为
   */
  async trackBehavior(req, res, startTime) {
    // 检查是否需要追踪
    if (!this.shouldTrack(req, res)) {
      return;
    }

    try {
      const behaviorConfig = this.getBehaviorConfig(req);
      if (!behaviorConfig) {
        return;
      }

      const duration = Date.now() - startTime;
      const residentId = this.getResidentId(req);

      if (!residentId) {
        return; // 没有用户ID时不记录
      }

      const behaviorData = {
        residentId,
        action: behaviorConfig.action,
        category: behaviorConfig.category,
        context: {
          page: req.originalUrl,
          module: behaviorConfig.module,
          operation: `${req.method  } ${  req.route?.path}` || req.path,
          result: this.determineResult(res.statusCode),
          duration
        },
        metadata: {
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          sessionId: this.getSessionId(req),
          referrer: req.get('Referrer'),
          device: this.parseDeviceInfo(req),
          relatedEntityId: this.getRelatedEntityId(req),
          relatedEntityType: this.getRelatedEntityType(req),
          tags: this.extractTags(req),
          priority: this.determinePriority(req)
        },
        timestamp: new Date()
      };

      // 异步保存行为日志
      BehaviorLog.logBehavior(behaviorData).catch(error => {
        console.error('保存行为日志失败:', error);
      });

    } catch (error) {
      console.error('行为追踪处理失败:', error);
    }
  }

  /**
   * 判断是否需要追踪
   */
  shouldTrack(req, res) {
    // 忽略静态资源请求
    if (req.path.startsWith('/static') || req.path.startsWith('/assets')) {
      return false;
    }

    // 忽略健康检查等内部API
    for (const pattern of this.ignorePatterns) {
      if (this.matchesPattern(req, pattern)) {
        return false;
      }
    }

    // 只追踪API请求
    if (!req.path.startsWith('/api/')) {
      return false;
    }

    // 忽略错误响应（大部分情况）
    if (res.statusCode >= 500) {
      return false;
    }

    return true;
  }

  /**
   * 获取行为配置
   */
  getBehaviorConfig(req) {
    const routeKey = `${req.method}:${req.route?.path || req.path.split('?')[0]}`;

    // 精确匹配
    if (this.trackedPatterns[routeKey]) {
      return this.trackedPatterns[routeKey];
    }

    // 模式匹配
    for (const [pattern, config] of Object.entries(this.trackedPatterns)) {
      if (this.matchesPattern(req, pattern)) {
        return config;
      }
    }

    // 默认行为配置
    return this.getDefaultBehaviorConfig(req);
  }

  /**
   * 匹配路由模式
   */
  matchesPattern(req, pattern) {
    const [method, path] = pattern.split(':');
    const routeMethod = req.method;
    const routePath = req.route?.path || req.path.split('?')[0];

    // 处理路径参数
    const patternRegex = path.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${patternRegex}$`);

    return method === routeMethod && regex.test(routePath);
  }

  /**
   * 获取默认行为配置
   */
  getDefaultBehaviorConfig(req) {
    // 根据路径推断模块和行为
    const path = req.path.toLowerCase();

    if (path.includes('/announcement') || path.includes('/notice')) {
      return {
        action: 'announcement_read',
        category: 'engagement',
        module: 'announcements'
      };
    }

    if (path.includes('/finance') || path.includes('/money') || path.includes('/payment')) {
      return {
        action: 'financial_info_view',
        category: 'engagement',
        module: 'financial_management'
      };
    }

    if (path.includes('/vote') || path.includes('/poll')) {
      return {
        action: 'vote_view',
        category: 'engagement',
        module: 'voting'
      };
    }

    if (path.includes('/help') || path.includes('/support')) {
      return {
        action: 'help_center_view',
        category: 'engagement',
        module: 'help_center'
      };
    }

    if (path.includes('/document') || path.includes('/file')) {
      return {
        action: 'document_view',
        category: 'engagement',
        module: 'documents'
      };
    }

    // 默认配置
    return {
      action: 'page_view',
      category: 'engagement',
      module: 'dashboard'
    };
  }

  /**
   * 获取村民ID
   */
  getResidentId(req) {
    // 从JWT token中获取
    if (req.user && req.user.residentId) {
      return req.user.residentId;
    }

    // 从会话中获取
    if (req.session && req.session.residentId) {
      return req.session.residentId;
    }

    // 从请求参数中获取（临时方案）
    if (req.body && req.body.residentId) {
      return req.body.residentId;
    }

    if (req.query && req.query.residentId) {
      return req.query.residentId;
    }

    return null;
  }

  /**
   * 确定操作结果
   */
  determineResult(statusCode) {
    if (statusCode >= 200 && statusCode < 300) {
      return 'success';
    } else if (statusCode >= 300 && statusCode < 400) {
      return 'partial';
    } else if (statusCode >= 400 && statusCode < 500) {
      return 'failure';
    } else {
      return 'failure';
    }
  }

  /**
   * 获取会话ID
   */
  getSessionId(req) {
    if (req.session && req.session.id) {
      return req.session.id;
    }

    if (req.cookies && req.cookies.sessionId) {
      return req.cookies.sessionId;
    }

    // 生成临时会话ID
    return `session_${  Math.random().toString(36).substring(7)}`;
  }

  /**
   * 解析设备信息
   */
  parseDeviceInfo(req) {
    const userAgent = req.get('User-Agent') || '';

    const device = {
      type: 'desktop',
      os: 'unknown',
      browser: 'unknown'
    };

    // 检测设备类型
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      device.type = /iPad/.test(userAgent) ? 'tablet' : 'mobile';
    }

    // 检测操作系统
    if (/Windows/.test(userAgent)) device.os = 'Windows';
    else if (/Mac/.test(userAgent)) device.os = 'macOS';
    else if (/Linux/.test(userAgent)) device.os = 'Linux';
    else if (/Android/.test(userAgent)) device.os = 'Android';
    else if (/iOS|iPhone|iPad/.test(userAgent)) device.os = 'iOS';

    // 检测浏览器
    if (/Chrome/.test(userAgent)) device.browser = 'Chrome';
    else if (/Firefox/.test(userAgent)) device.browser = 'Firefox';
    else if (/Safari/.test(userAgent)) device.browser = 'Safari';
    else if (/Edge/.test(userAgent)) device.browser = 'Edge';
    else if (/Opera/.test(userAgent)) device.browser = 'Opera';

    return device;
  }

  /**
   * 获取关联实体ID
   */
  getRelatedEntityId(req) {
    const params = req.params;

    // 常见的实体ID参数
    const entityParams = ['id', 'announcementId', 'documentId', 'voteId', 'helpId', 'financeId'];

    for (const param of entityParams) {
      if (params[param]) {
        return params[param];
      }
    }

    return null;
  }

  /**
   * 获取关联实体类型
   */
  getRelatedEntityType(req) {
    const path = req.path.toLowerCase();

    if (path.includes('/announcement')) return 'announcement';
    if (path.includes('/document')) return 'document';
    if (path.includes('/vote')) return 'vote';
    if (path.includes('/help')) return 'help_request';
    if (path.includes('/finance')) return 'financial_record';
    if (path.includes('/emergency')) return 'emergency_event';

    return null;
  }

  /**
   * 提取标签
   */
  extractTags(req) {
    const tags = [];
    const path = req.path.toLowerCase();

    // 根据路径添加标签
    if (path.includes('/admin')) tags.push('admin');
    if (path.includes('/mobile')) tags.push('mobile');
    if (path.includes('/api/v1')) tags.push('api');

    // 根据查询参数添加标签
    if (req.query) {
      if (req.query.category) tags.push(`category:${req.query.category}`);
      if (req.query.type) tags.push(`type:${req.query.type}`);
    }

    return tags;
  }

  /**
   * 确定优先级
   */
  determinePriority(req) {
    const path = req.path.toLowerCase();

    // 高优先级操作
    if (path.includes('/payment') || path.includes('/finance')) {
      return 'high';
    }

    // 中等优先级操作
    if (path.includes('/announcement') || path.includes('/vote')) {
      return 'normal';
    }

    // 默认低优先级
    return 'low';
  }

  /**
   * 手动记录特定行为
   */
  async logCustomBehavior(residentId, action, context = {}, metadata = {}) {
    try {
      const behaviorData = {
        residentId,
        action,
        category: context.category || 'engagement',
        context: {
          page: context.page || '/custom',
          module: context.module || 'custom',
          operation: context.operation || 'custom_action',
          result: context.result || 'success',
          duration: context.duration || 0
        },
        metadata: {
          ...metadata,
          custom: true
        },
        timestamp: new Date()
      };

      return await BehaviorLog.logBehavior(behaviorData);
    } catch (error) {
      console.error('记录自定义行为失败:', error);
      throw error;
    }
  }
}

module.exports = new BehaviorTracker();