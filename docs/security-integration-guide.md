# 安全综合管理平台集成指南

## 概述

本文档描述了智慧村庄综合服务平台的安全综合管理平台，包含等保合规、数据加密、防诈骗和隐私保护四大核心模块。

## 架构设计

### 安全服务架构

```
智慧村庄平台
├── 安全管理层 (Security Management Layer)
│   ├── 等保合规服务 (MLPS Compliance Service)
│   ├── 数据加密服务 (Encryption Service)
│   ├── 防诈骗服务 (Anti-Fraud Service)
│   └── 隐私保护服务 (Privacy Protection Service)
├── 安全控制器层 (Security Controller Layer)
│   └── 安全综合管理控制器 (Security Management Controller)
├── 路由层 (Security Routes)
│   └── 安全管理路由 (Security Management Routes)
└── 前端展示层 (Frontend Dashboard)
    ├── 安全管理主界面
    ├── 等保合规模块
    ├── 数据加密模块
    ├── 防诈骗模块
    └── 隐私保护模块
```

## 核心功能模块

### 1. 等保2.0合规改造 (MLPS 2.0 Compliance)

#### 功能特性
- **自动化合规评估**: 支持7个安全控制域的自动评估
- **持续监控**: 24/7合规状态监控
- **整改建议**: 基于评估结果生成具体的整改计划
- **合规报告**: 支持多种格式的合规报告导出

#### 安全控制域
1. **物理安全** (Physical Security)
2. **网络安全** (Network Security)
3. **主机安全** (Host Security)
4. **应用安全** (Application Security)
5. **数据安全** (Data Security)
6. **安全管理** (Security Management)
7. **备份恢复** (Backup & Recovery)

#### API接口
```javascript
// 合规评估
POST /api/v1/security/compliance-assessment
{
  "protectionLevel": "L2"  // L1-L5
}

// 生成整改计划
POST /api/v1/security/generate-remediation-plan
{
  "assessmentId": "assessment_001",
  "protectionLevel": "L2"
}

// 持续监控
GET /api/v1/security/continuous-compliance-monitoring
```

### 2. 数据加密传输存储 (Data Encryption)

#### 功能特性
- **多算法支持**: AES-256-GCM, SM4-GCM, RSA, SM2等
- **密钥管理**: 自动密钥轮换、生命周期管理
- **批量处理**: 支持大批量数据加密/解密
- **性能监控**: 实时性能指标监控

#### 加密算法
```javascript
// 对称加密算法
- AES-256-GCM (国际标准)
- SM4-GCM (国密标准)
- ChaCha20-Poly1305

// 非对称加密算法
- RSA-2048/4096
- SM2 (国密标准)
```

#### API接口
```javascript
// 数据加密
POST /api/v1/security/encrypt
{
  "data": "sensitive data",
  "dataType": "personal_info",
  "maskingLevel": "standard"
}

// 批量加密
POST /api/v1/security/batch-encrypt
{
  "records": [...],
  "dataType": "personal_info",
  "maskingLevel": "standard"
}

// 密钥管理
POST /api/v1/security/manage-key
{
  "operation": "rotate",  // generate, rotate, revoke
  "keyId": "default_aes"
}
```

### 3. 防电信诈骗系统 (Anti-Fraud System)

#### 功能特性
- **多渠道检测**: 电话、短信、钓鱼网站检测
- **实时监控**: 7x24小时实时威胁监控
- **风险评分**: 基于机器学习的风险评估
- **举报处理**: 用户举报和处理流程

#### 检测能力
```javascript
// 电话诈骗检测
- 冒充公检法
- 虚假中奖
- 贷款诈骗
- 投资诈骗

// 短信诈骗检测
- 钓鱼链接
- 虚假中奖
- 冒充机构

// 钓鱼网站检测
- URL特征分析
- 页面内容分析
- 证书验证
```

#### API接口
```javascript
// 实时检测
POST /api/v1/security/detect-fraud
{
  "eventType": "phone",  // phone, sms, website
  "data": {
    "phoneNumber": "138****1234",
    "content": "诈骗内容"
  }
}

// 诈骗举报
POST /api/v1/security/report-fraud
{
  "reporter": "user_001",
  "type": "phone",
  "contact": "138****1234",
  "description": "举报描述",
  "evidence": [...]
}
```

### 4. 隐私保护机制 (Privacy Protection)

#### 功能特性
- **数据脱敏**: 多级别数据脱敏处理
- **数据匿名化**: K-匿名、L-多样性算法
- **同意管理**: 用户同意生命周期管理
- **隐私影响评估**: DPIA自动化评估

#### 脱敏策略
```javascript
// 脱敏级别
- 轻度脱敏 (Light): 保留部分信息
- 标准脱敏 (Standard): 常规脱敏处理
- 严格脱敏 (Strict): 最大程度保护

// 脱敏规则
- 身份证号: 110101********1234
- 手机号: 138****1234
- 邮箱: use***@example.com
- 地址: 北京市***
```

#### API接口
```javascript
// 数据脱敏
POST /api/v1/security/manage-privacy
{
  "operation": "maskData",
  "dataType": "idCard",
  "maskingLevel": "standard",
  "consentData": {"idCard": "110101199001011234"}
}

// 用户同意管理
POST /api/v1/security/manage-privacy
{
  "operation": "consent",
  "userId": "user_001",
  "consentData": {
    "consentType": "dataCollection",
    "scope": "个人信息收集",
    "expiresAt": "2025-01-01"
  }
}

// 隐私影响评估
POST /api/v1/security/privacy-impact-assessment
{
  "dataProcess": {
    "processingActivity": "数据分析",
    "dataTypes": ["personalIdentity", "contactInfo"],
    "purpose": "服务优化",
    "legalBasis": "consent"
  }
}
```

## 前端集成

### 1. 主安全仪表板 (`SecurityManagement.vue`)

#### 功能特性
- **总览展示**: 总体安全评分、模块状态
- **实时监控**: 安全趋势图表、威胁统计
- **快速操作**: 一键生成报告、配置管理
- **告警处理**: 安全告警展示和处理

#### 关键组件
```vue
<template>
  <!-- 安全评分展示 -->
  <div class="overall-score" :class="getScoreClass(overallScore)">
    <div class="score-circle">
      <span class="score-value">{{ overallScore }}</span>
    </div>
  </div>

  <!-- 安全模块状态卡片 -->
  <el-card class="module-card" v-for="module in securityModules">
    <!-- 模块内容 -->
  </el-card>
</template>
```

### 2. 等保合规模块 (`ComplianceModule.vue`)

#### 功能特性
- **合规评估**: 自动化等保评估
- **域管理**: 7大安全域管理
- **整改跟踪**: 整改任务跟踪和管理
- **报告生成**: 合规报告自动生成

### 3. 数据加密模块 (`EncryptionModule.vue`)

#### 功能特性
- **算法管理**: 加密算法启用/禁用
- **密钥管理**: 密钥生命周期管理
- **性能测试**: 加密算法性能测试
- **操作审计**: 加密操作审计日志

### 4. 防诈骗模块 (`AntiFraudModule.vue`)

#### 功能特性
- **实时检测**: 多渠道诈骗检测
- **趋势分析**: 诈骗趋势分析图表
- **举报管理**: 用户举报处理
- **黑名单管理**: 可疑号码/网站管理

### 5. 隐私保护模块 (`PrivacyModule.vue`)

#### 功能特性
- **同意管理**: 用户同意记录管理
- **数据脱敏**: 在线数据脱敏测试
- **匿名化处理**: 数据匿名化工具
- **隐私评估**: 隐私影响评估工具

## 后端集成

### 1. 安全控制器 (`securityManagementController.js`)

统一管理所有安全服务的控制器，提供:
- 安全仪表板数据聚合
- 各模块API接口统一管理
- 安全事件响应处理
- 综合安全报告生成

### 2. 安全路由 (`securityManagement.js`)

定义所有安全相关的API路由，包含:
- 权限验证中间件
- 参数验证
- 错误处理
- 日志记录

### 3. 中间件集成

```javascript
// 认证中间件
const authenticateToken = require('../middleware/auth');

// 权限验证
const requireAdmin = requireRole(['admin', 'security_officer']);

// 安全路由应用
router.get('/dashboard', authenticateToken, requireAdmin,
  securityController.getSecurityDashboard);
```

## 数据库集成

### 1. 安全相关表结构

```sql
-- 合规评估表
CREATE TABLE compliance_assessments (
  id VARCHAR(50) PRIMARY KEY,
  protection_level VARCHAR(10),
  overall_score INTEGER,
  is_compliant BOOLEAN,
  assessment_date DATETIME,
  domain_scores JSON,
  non_compliant_items JSON
);

-- 加密密钥表
CREATE TABLE encryption_keys (
  key_id VARCHAR(50) PRIMARY KEY,
  algorithm VARCHAR(50),
  key_length INTEGER,
  key_data BLOB,
  created_at DATETIME,
  expires_at DATETIME,
  status VARCHAR(20)
);

-- 诈骗举报表
CREATE TABLE fraud_reports (
  report_id VARCHAR(50) PRIMARY KEY,
  reporter VARCHAR(50),
  type VARCHAR(20),
  contact VARCHAR(100),
  description TEXT,
  evidence JSON,
  status VARCHAR(20),
  created_at DATETIME
);

-- 隐私同意表
CREATE TABLE privacy_consents (
  consent_id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50),
  consent_type VARCHAR(50),
  scope TEXT,
  status VARCHAR(20),
  granted_at DATETIME,
  expires_at DATETIME
);
```

### 2. 数据迁移脚本

```javascript
// scripts/migrate-security-tables.js
const db = require('../config/database');

async function migrateSecurityTables() {
  try {
    // 创建安全相关表
    await createComplianceTables();
    await createEncryptionTables();
    await createFraudTables();
    await createPrivacyTables();

    console.log('安全表迁移完成');
  } catch (error) {
    console.error('安全表迁移失败:', error);
  }
}
```

## 部署配置

### 1. 环境变量配置

```bash
# .env
# 安全配置
SECURITY_KEY_ROTATION_INTERVAL=90  # 密钥轮换间隔(天)
MLPS_PROTECTION_LEVEL=L2           # 等保保护级别
FRAUD_DETECTION_THRESHOLD=60       # 诈骗检测阈值
PRIVACY_AUDIT_RETENTION=365        # 隐私审计保留时间(天)

# 加密配置
ENCRYPTION_ALGORITHM=AES-256-GCM
ENCRYPTION_KEY_SIZE=256
ASYMMETRIC_ALGORITHM=RSA-2048

# 外部服务配置
BAIDU_AI_API_KEY=your_baidu_api_key
BAIDU_AI_SECRET_KEY=your_baidu_secret_key
TENCENT_SECRET_ID=your_tencent_secret_id
TENCENT_SECRET_KEY=your_tencent_secret_key
```

### 2. Docker配置

```dockerfile
# Dockerfile.security
FROM node:18-alpine

# 安装安全依赖
RUN apk add --no-cache \
    openssl \
    libcrypto1.1 \
    libssl1.1

# 复制安全模块
COPY src/security/ ./src/security/
COPY src/controllers/securityManagementController.js ./src/controllers/
COPY src/routes/securityManagement.js ./src/routes/

# 安全配置
ENV NODE_ENV=production
ENV SECURITY_ENABLED=true

EXPOSE 3001

CMD ["npm", "start"]
```

### 3. Kubernetes部署

```yaml
# security-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: security-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: security-service
  template:
    metadata:
      labels:
        app: security-service
    spec:
      containers:
      - name: security-service
        image: smart-village/security:latest
        ports:
        - containerPort: 3001
        env:
        - name: SECURITY_KEY_ROTATION_INTERVAL
          value: "90"
        - name: MLPS_PROTECTION_LEVEL
          value: "L2"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
```

## 监控和告警

### 1. 安全指标监控

```javascript
// 关键安全指标
const securityMetrics = {
  // 合规性指标
  complianceScore: 85,        // 合规分数
  nonCompliantItems: 3,       // 不合规项数量

  // 加密指标
  encryptionLatency: 15,      // 加密延迟(ms)
  keyRotationStatus: 'active', // 密钥轮换状态
  encryptedDataVolume: 1024,  // 加密数据量(MB)

  // 防诈骗指标
  fraudDetectionRate: 95,     // 诈骗检测率(%)
  falsePositiveRate: 2,       // 误报率(%)
  blockedAttempts: 156,       // 阻止尝试次数

  // 隐私保护指标
  consentManagementRate: 98,  // 同意管理率(%)
  dataAnonymizationRate: 85,  // 数据匿名化率(%)
  privacyViolationCount: 0    // 隐私违规次数
};
```

### 2. 告警规则

```yaml
# security-alerts.yml
groups:
- name: security.rules
  rules:
  - alert: ComplianceScoreLow
    expr: security_compliance_score < 70
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "合规分数过低"
      description: "合规分数低于70%，当前值: {{ $value }}"

  - alert: HighFraudActivity
    expr: rate(fraud_attempts_total[5m]) > 10
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "诈骗活动激增"
      description: "5分钟内诈骗尝试次数: {{ $value }}"

  - alert: EncryptionLatencyHigh
    expr: encryption_latency_ms > 100
    for: 3m
    labels:
      severity: warning
    annotations:
      summary: "加密延迟过高"
      description: "加密延迟: {{ $value }}ms"
```

## 安全最佳实践

### 1. 访问控制

- **最小权限原则**: 每个用户只授予必要的权限
- **角色分离**: 管理员、安全员、审计员角色分离
- **定期审核**: 定期审核用户权限和访问日志

### 2. 数据保护

- **加密传输**: 所有敏感数据传输必须加密
- **加密存储**: 敏感数据存储必须加密
- **访问审计**: 记录所有数据访问操作

### 3. 运维安全

- **密钥管理**: 定期轮换密钥，安全存储密钥
- **补丁管理**: 及时应用安全补丁
- **备份安全**: 加密备份，异地存储

### 4. 监控响应

- **实时监控**: 7x24小时安全状态监控
- **事件响应**: 建立安全事件响应流程
- **定期演练**: 定期进行安全应急演练

## 测试和验证

### 1. 单元测试

```javascript
// tests/security/encryption.test.js
describe('Encryption Service', () => {
  test('should encrypt data with AES-256-GCM', async () => {
    const data = 'test sensitive data';
    const result = await encryptionService.symmetricEncrypt(data);
    expect(result).toBeDefined();
    expect(result.encryptedData).toBeDefined();
  });

  test('should decrypt data correctly', async () => {
    const data = 'test sensitive data';
    const encrypted = await encryptionService.symmetricEncrypt(data);
    const decrypted = await encryptionService.symmetricDecrypt(encrypted);
    expect(decrypted).toBe(data);
  });
});
```

### 2. 集成测试

```javascript
// tests/integration/security.test.js
describe('Security Integration', () => {
  test('should protect sensitive data end-to-end', async () => {
    // 创建敏感数据
    const userData = { idCard: '110101199001011234' };

    // 加密存储
    const encrypted = await request(app)
      .post('/api/v1/security/encrypt')
      .send({ data: userData, dataType: 'idCard' })
      .expect(200);

    // 验证数据已加密
    expect(encrypted.body.data.encryptedData).toBeDefined();
  });
});
```

### 3. 渗透测试

定期进行安全渗透测试，包括：
- SQL注入测试
- XSS攻击测试
- CSRF攻击测试
- 权限绕过测试
- 敏感信息泄露测试

## 文档和培训

### 1. 技术文档

- API接口文档
- 架构设计文档
- 部署运维文档
- 故障排除指南

### 2. 用户手册

- 安全管理平台使用指南
- 合规评估操作手册
- 数据加密操作指南
- 隐私保护操作手册

### 3. 培训计划

- 开发人员安全培训
- 运维人员安全培训
- 管理员安全培训
- 用户安全意识培训

## 总结

安全综合管理平台为智慧村庄平台提供了全方位的安全保障，通过等保合规、数据加密、防诈骗和隐私保护四大模块，构建了完整的安全防护体系。平台采用现代化的安全架构和技术，确保系统安全、数据安全和用户隐私得到有效保护。

通过本文档的指导，可以顺利地将安全综合管理平台集成到智慧村庄平台中，提升整体安全防护能力。