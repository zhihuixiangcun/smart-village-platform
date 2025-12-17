# 智慧村庄平台 - 完整安全系统集成指南

## 系统概述

本文档描述了智慧村庄平台完整的安全系统集成方案，包括权限控制、数据加密、审计日志和传输安全等核心组件。

## 安全架构总览

### 1. 核心安全组件

```
src/security/
├── accessControl.js      # 访问控制和权限管理
├── auditLogger.js        # 审计日志系统
├── encryption.js         # 数据加密服务
├── securityMiddleware.js  # 综合安全中间件
├── dataSanitization.js   # 数据清洗和注入防护
└── transportSecurity.js  # 传输安全
```

### 2. 安全特性矩阵

| 安全组件 | 功能特性 | 保护级别 | 应用场景 |
|---------|---------|---------|---------|
| 访问控制 | 10级角色 hierarchy、动态权限、数据脱敏 | 高 | 所有API接口 |
| 数据加密 | AES-256-GCM、RSA-2048、自动密钥轮转 | 极高 | 敏感数据存储 |
| 审计日志 | 全量操作记录、安全事件检测、合规报告 | 高 | 所有用户操作 |
| 传输安全 | HTTPS强制、API鉴权、注入防护 | 高 | 网络传输层 |
| 中间件 | 综合防护、速率限制、敏感操作验证 | 高 | 请求处理链 |

## 详细集成指南

### 1. 主应用集成 (src/app.js)

```javascript
const { securityMiddleware } = require('./security/securityMiddleware');

// 应用安全中间件
app.use(securityMiddleware.comprehensive({
  requireAuth: true,
  permissions: [
    { permission: 'read', resourceType: 'system' }
  ],
  rateLimitOptions: {
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 1000
  },
  auditOperations: {
    type: 'SYSTEM_ACCESS',
    action: 'api_request',
    resource: 'main_application'
  }
}));
```

### 2. API路由保护

```javascript
// 管理员路由
router.use('/admin',
  securityMiddleware.authenticate(),
  securityMiddleware.authorizeRole('super_admin', 'village_admin'),
  securityMiddleware.audit({
    type: OPERATION_TYPES.SYSTEM_CONFIG,
    action: 'admin_access',
    resource: 'admin_panel'
  })
);

// 敏感数据路由
router.use('/data/financial',
  securityMiddleware.authenticate(),
  securityMiddleware.dataAccessControl('financial', 'confidential'),
  securityMiddleware.encryptResponse('financial'),
  auditLogger.log.bind(auditLogger)
);

// 村务管理路由
router.use('/village/:villageId',
  securityMiddleware.authenticate(),
  securityMiddleware.authorize('manage', 'village'),
  securityMiddleware.sensitiveOperation('village_management', false)
);
```

### 3. 数据库安全集成

```javascript
const { dataSanitizer } = require('./security/dataSanitization');

// API请求参数清洗
app.use('/api/v1/*', (req, res, next) => {
  if (req.body) {
    req.body = dataSanitizer.sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = dataSanitizer.sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = dataSanitizer.sanitizeObject(req.params);
  }
  next();
});

// Mongoose Schema加密
const { encryptionService } = require('./security/encryption');
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  idCard: {
    type: String,
    required: true,
    set: function(val) {
      return encryptionService.encryptField(val, 'personal');
    },
    get: function(val) {
      return encryptionService.decryptField(val, 'personal');
    }
  }
});
```

### 4. 实时安全监控

```javascript
const { realtimeIntegrator } = require('./integrator/realtimeIntegrator');

// 安全指标监控
realtimeIntegrator.on('alert', (alert) => {
  if (alert.category === 'security') {
    // 记录安全事件
    auditLogger.log({
      type: OPERATION_TYPES.SECURITY_BREACH,
      action: 'security_alert',
      resource: 'system'
    }, {
      status: OPERATION_STATUS.WARNING,
      alert,
      riskLevel: 'high'
    });

    // 自动防护响应
    if (alert.severity === 'critical') {
      // 自动阻止可疑IP
      securityMiddleware.blockIP(alert.sourceIP, 60 * 60 * 1000);
    }
  }
});
```

### 5. WebSocket安全

```javascript
io.use((socket, next) => {
  // WebSocket连接安全验证
  const token = socket.handshake.auth.token;
  const user = jwt.verify(token, process.env.JWT_SECRET);

  if (!user) {
    return next(new Error('Authentication failed'));
  }

  socket.user = user;
  socket.join(`village_${user.villageId}`);
  next();
});

// 敏感操作审计
io.on('connection', (socket) => {
  socket.on('sensitive_operation', async (data) => {
    await auditLogger.log({
      type: OPERATION_TYPES.DATA_UPDATE,
      action: 'websocket_operation',
      resource: data.resourceType
    }, {
      user: socket.user,
      ip: socket.handshake.address,
      data,
      status: OPERATION_STATUS.SUCCESS
    });
  });
});
```

## 部署配置

### 1. 环境变量

```bash
# 加密配置
ENCRYPTION_MASTER_KEY=your_256_bit_hex_key_here
JWT_SECRET=your_jwt_secret_key_here
SESSION_SECRET=your_session_secret_key_here

# 安全配置
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# HTTPS配置
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
SSL_CA_PATH=/path/to/ca.pem
```

### 2. Nginx配置

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL配置
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # 代理到Node.js应用
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 安全最佳实践

### 1. 权限最小化原则

```javascript
// 为每个API端点配置最小必要权限
const minimalPermissions = {
  'GET /api/v1/users/profile': ['read:own_profile'],
  'POST /api/v1/announcements': ['create:village_announcements'],
  'DELETE /api/v1/users/:id': ['delete:users', 'admin_only']
};
```

### 2. 数据分类保护

```javascript
const dataClassification = {
  public: ['name', 'avatar', 'announcements'],
  internal: ['phone', 'email', 'address'],
  sensitive: ['idCard', 'bankAccount', 'health'],
  confidential: ['password', 'secretKeys', 'adminNotes']
};
```

### 3. 定期安全审计

```javascript
// 定期安全检查任务
const securityAudit = setInterval(async () => {
  // 检查异常登录模式
  await auditLogger.generateReport(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
    new Date(),
    'security'
  );

  // 密钥轮转检查
  const encryptionStatus = encryptionService.getEncryptionStatus();
  if (Date.now() - new Date(encryptionStatus.lastKeyRotation) > 30 * 24 * 60 * 60 * 1000) {
    encryptionService.rotateKeys();
  }
}, 24 * 60 * 60 * 1000); // 每日执行
```

## 监控和告警

### 1. 安全指标监控

- 登录失败率 > 5% 触发告警
- API错误率 > 2% 触发告警
- 敏感操作频率异常检测
- 数据访问模式分析

### 2. 实时威胁检测

```javascript
// 异常行为检测
const detectAnomalousActivity = (user, activity) => {
  const riskFactors = [];

  // 检查访问频率
  if (activity.requestCount > getUserAverageRequests(user) * 3) {
    riskFactors.push('HIGH_FREQUENCY_ACCESS');
  }

  // 检查地理位置
  if (isSuspiciousLocation(user.lastLoginIP, activity.currentIP)) {
    riskFactors.push('SUSPICIOUS_LOCATION');
  }

  // 检查访问模式
  if (hasUnusualAccessPattern(user, activity)) {
    riskFactors.push('UNUSUAL_PATTERN');
  }

  return riskFactors.length > 0 ? { risk: 'high', factors: riskFactors } : { risk: 'low' };
};
```

## 合规性要求

### 1. 数据保护法规遵循

- GDPR合规性检查
- 《个人信息保护法》要求
- 数据最小化原则
- 用户同意管理

### 2. 审计日志保留

```javascript
// 审计日志保留策略
const auditRetention = {
  userActivity: 365 * 2, // 2年
  securityEvents: 365 * 7, // 7年
  systemLogs: 365 * 1, // 1年
  financialData: 365 * 10 // 10年
};
```

## 故障恢复

### 1. 备份策略

- 数据库每日自动备份
- 密钥管理定期备份
- 审计日志异地存储
- 系统配置版本控制

### 2. 应急响应流程

```javascript
// 安全事件应急响应
const securityIncidentResponse = async (incident) => {
  // 1. 立即响应
  await blockAttacker(incident.sourceIP);
  await notifyAdmins(incident);

  // 2. 事件分析
  const analysis = await analyzeIncident(incident);

  // 3. 恢复措施
  if (analysis.requiresDataRestore) {
    await restoreFromBackup(analysis.backupPoint);
  }

  // 4. 事后总结
  await generateIncidentReport(incident, analysis);
};
```

## 性能优化

### 1. 安全性能平衡

- 缓存权限检查结果
- 异步审计日志写入
- 批量加密操作
- 智能数据脱敏

### 2. 资源使用监控

```javascript
// 安全组件资源使用
const securityMetrics = {
  encryptionLatency: '< 5ms',
  auditLogThroughput: '> 10000/sec',
  permissionCheckTime: '< 1ms',
  memoryFootprint: '< 100MB'
};
```

## 总结

本安全系统提供了企业级的多层防护，确保智慧村庄平台的数据安全和合规性。通过合理配置和使用，可以有效防范各种安全威胁，保护用户隐私和数据完整性。

关键优势：
- ✅ 多层安全防护
- ✅ 实时威胁检测
- ✅ 合规性保障
- ✅ 高性能实现
- ✅ 易于集成维护