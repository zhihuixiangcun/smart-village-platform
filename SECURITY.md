# 智慧村庄综合服务平台 - 安全综合管理平台

## 🔐 项目概述

安全综合管理平台是智慧村庄综合服务平台的核心安全基础设施，提供等保合规、数据加密、防诈骗和隐私保护四大核心功能模块，确保平台数据和用户安全的全方位保护。

## 📋 目录

- [功能特性](#功能特性)
- [架构设计](#架构设计)
- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [API文档](#api文档)
- [前端集成](#前端集成)
- [部署指南](#部署指南)
- [测试说明](#测试说明)
- [安全最佳实践](#安全最佳实践)
- [故障排除](#故障排除)

## ✨ 功能特性

### 🔒 等保2.0合规 (MLPS 2.0 Compliance)
- ✅ 自动化合规评估
- ✅ 7大安全域全覆盖
- ✅ 持续合规监控
- ✅ 智能整改建议
- ✅ 合规报告生成

### 🔐 数据加密服务 (Encryption Service)
- ✅ 多算法支持 (AES, SM4, RSA, SM2)
- ✅ 国密标准支持
- ✅ 自动密钥轮换
- ✅ 批量数据加密
- ✅ 性能监控优化

### 🛡️ 防诈骗系统 (Anti-Fraud System)
- ✅ 多渠道检测 (电话/短信/网站)
- ✅ 实时威胁监控
- ✅ 智能风险评分
- ✅ 用户举报处理
- ✅ 趋势分析预警

### 👤 隐私保护机制 (Privacy Protection)
- ✅ 数据脱敏处理
- ✅ K-匿名算法
- ✅ 用户同意管理
- ✅ 隐私影响评估
- ✅ 审计日志追踪

## 🏗️ 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    前端展示层 (Frontend)                      │
├─────────────────────────────────────────────────────────────┤
│  安全仪表板  │  等保合规  │  数据加密  │  防诈骗  │  隐私保护  │
├─────────────────────────────────────────────────────────────┤
│                   控制器层 (Controllers)                     │
├─────────────────────────────────────────────────────────────┤
│           安全综合管理控制器 (SecurityManagement)            │
├─────────────────────────────────────────────────────────────┤
│                    服务层 (Services)                        │
├─────────────────────────────────────────────────────────────┤
│ MLPS合规 │ 数据加密 │ 防诈骗 │ 隐私保护 │ 审计日志 │ 报告生成 │
├─────────────────────────────────────────────────────────────┤
│                   数据访问层 (Data Access)                   │
├─────────────────────────────────────────────────────────────┤
│    MongoDB    │    Redis     │   文件存储   │   外部API    │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 快速开始

### 环境要求

- **Node.js**: >= 18.0.0
- **MongoDB**: >= 4.4
- **Redis**: >= 6.0 (可选，用于缓存)
- **操作系统**: Linux, macOS, Windows

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd smart-village-platform
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等信息
```

4. **初始化数据库**
```bash
npm run init-db
```

5. **部署安全模块**
```bash
node scripts/deploy-security.js
```

6. **启动服务**
```bash
npm run dev
```

7. **访问安全面板**
```
http://localhost:3001/security-dashboard
```

### Docker 部署

```bash
# 构建镜像
docker build -t smart-village/security .

# 运行容器
docker run -d \
  --name security-platform \
  -p 3001:3001 \
  -e MONGODB_URI=mongodb://localhost:27017/smart_village \
  -e NODE_ENV=production \
  smart-village/security
```

## ⚙️ 配置说明

### 环境变量配置

```bash
# 安全配置
SECURITY_KEY_ROTATION_INTERVAL=90    # 密钥轮换间隔(天)
MLPS_PROTECTION_LEVEL=L2             # 等保保护级别 (L1-L5)
FRAUD_DETECTION_THRESHOLD=60         # 诈骗检测阈值
PRIVACY_AUDIT_RETENTION=365          # 隐私审计保留时间(天)

# 加密配置
ENCRYPTION_ALGORITHM=AES-256-GCM     # 默认加密算法
ENCRYPTION_KEY_SIZE=256              # 对称密钥长度
ASYMMETRIC_ALGORITHM=RSA-2048        # 非对称加密算法

# 外部API配置 (可选)
BAIDU_AI_API_KEY=your_api_key       # 百度AI API密钥
BAIDU_AI_SECRET_KEY=your_secret_key # 百度AI密钥
TENCENT_SECRET_ID=your_secret_id    # 腾讯云密钥ID
TENCENT_SECRET_KEY=your_secret_key # 腾讯云密钥

# 告警配置
ALERT_EMAIL_SMTP_HOST=smtp.example.com
ALERT_EMAIL_USER=alerts@example.com
ALERT_EMAIL_PASS=your_email_password
ALERT_SMS_API_KEY=your_sms_api_key
ALERT_WEBHOOK_URL=https://hooks.slack.com/webhook
```

### 安全配置文件

`config/security.json` 包含详细的安全配置：

```json
{
  "security": {
    "encryption": {
      "defaultAlgorithm": "AES-256-GCM",
      "keyRotationInterval": 90,
      "encryptionAtRest": true,
      "encryptionInTransit": true
    },
    "compliance": {
      "protectionLevel": "L2",
      "monitoringInterval": 24,
      "auditRetention": 365
    },
    "fraudDetection": {
      "riskThresholds": {
        "low": 30,
        "medium": 60,
        "high": 80,
        "critical": 95
      }
    },
    "privacy": {
      "dataClassification": {
        "public": { "level": 1, "masking": false },
        "internal": { "level": 2, "masking": "light" },
        "confidential": { "level": 3, "masking": "standard" },
        "restricted": { "level": 4, "masking": "strict" }
      }
    }
  }
}
```

## 📚 API文档

### 认证说明

所有安全API都需要JWT认证和管理员权限：

```javascript
Authorization: Bearer <your-jwt-token>
```

### 核心接口

#### 安全仪表板
```http
GET /api/v1/security/dashboard
```

#### 等保合规管理
```http
POST /api/v1/security/compliance-assessment
POST /api/v1/security/generate-remediation-plan
GET /api/v1/security/continuous-compliance-monitoring
```

#### 数据加密服务
```http
POST /api/v1/security/encrypt
POST /api/v1/security/decrypt
POST /api/v1/security/batch-encrypt
POST /api/v1/security/manage-key
```

#### 防诈骗系统
```http
POST /api/v1/security/detect-fraud
POST /api/v1/security/report-fraud
GET /api/v1/security/fraud-trend-analysis
```

#### 隐私保护
```http
POST /api/v1/security/manage-privacy
POST /api/v1/security/privacy-impact-assessment
GET /api/v1/security/audit-logs
```

### API文档访问

启动服务后，可访问完整的API文档：
```
http://localhost:3001/api-docs
```

## 🎨 前端集成

### Vue.js 组件结构

```
client/src/views/security/
├── SecurityManagement.vue          # 主安全仪表板
└── components/
    ├── ComplianceModule.vue         # 等保合规模块
    ├── EncryptionModule.vue         # 数据加密模块
    ├── AntiFraudModule.vue          # 防诈骗模块
    └── PrivacyModule.vue            # 隐私保护模块
```

### 使用示例

```vue
<template>
  <div>
    <security-management />
  </div>
</template>

<script setup>
import SecurityManagement from '@/views/security/SecurityManagement.vue'
</script>
```

### 路由配置

```javascript
{
  path: '/security',
  component: () => import('@/views/security/SecurityManagement.vue'),
  meta: {
    requiresAuth: true,
    requiresRole: ['admin', 'security_officer']
  }
}
```

## 🚀 部署指南

### 生产环境部署

1. **使用部署脚本**
```bash
node scripts/deploy-security.js --prod
```

2. **手动部署**
```bash
# 构建前端
npm run build

# 启动生产服务
NODE_ENV=production npm start
```

3. **Nginx 配置**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/client/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Kubernetes 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: security-platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: security-platform
  template:
    metadata:
      labels:
        app: security-platform
    spec:
      containers:
      - name: security-platform
        image: smart-village/security:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: mongodb-uri
```

## 🧪 测试说明

### 运行测试

```bash
# 运行所有安全测试
npm test -- tests/security/

# 运行集成测试
npm run test:integration

# 运行覆盖率测试
npm run test:coverage
```

### 测试文件结构

```
tests/security/
├── securityIntegration.test.js    # 集成测试
├── encryption.test.js             # 加密服务测试
├── antiFraud.test.js              # 防诈骗测试
├── privacy.test.js                # 隐私保护测试
└── compliance.test.js             # 合规测试
```

### 测试覆盖率

目标测试覆盖率：90%+

```bash
npm run test:coverage
```

## 🛡️ 安全最佳实践

### 访问控制
- ✅ 实施最小权限原则
- ✅ 定期审核用户权限
- ✅ 使用强密码策略
- ✅ 启用多因素认证

### 数据保护
- ✅ 敏感数据加密存储
- ✅ 传输层加密 (TLS)
- ✅ 定期数据备份
- ✅ 安全密钥管理

### 监控审计
- ✅ 7x24小时安全监控
- ✅ 完整的操作审计日志
- ✅ 异常行为检测
- ✅ 安全事件响应

### 漏洞管理
- ✅ 定期安全扫描
- ✅ 及时应用安全补丁
- ✅ 漏洞评估测试
- ✅ 安全配置审查

## 🔧 故障排除

### 常见问题

#### 1. 服务启动失败
```bash
# 检查端口占用
netstat -tulpn | grep :3001

# 检查配置文件
node -c src/app.js
```

#### 2. 数据库连接失败
```bash
# 检查MongoDB状态
systemctl status mongod

# 测试连接
mongo mongodb://localhost:27017/smart_village
```

#### 3. 加密服务异常
```bash
# 检查OpenSSL
openssl version

# 重新生成密钥
node scripts/generate-keys.js
```

#### 4. 性能问题
```bash
# 监控资源使用
top
htop

# 检查日志
tail -f logs/security.log
```

### 日志分析

```bash
# 查看安全日志
tail -f logs/security.log

# 查看错误日志
tail -f logs/error.log

# 搜索特定事件
grep "FRAUD_DETECTED" logs/security.log
```

### 性能优化

```bash
# 启用Redis缓存
export REDIS_URL=redis://localhost:6379

# 优化数据库查询
npm run db:index

# 监控性能指标
npm run monitor:performance
```

## 📞 技术支持

### 联系方式

- **项目维护者**: security-team@smartvillage.com
- **技术文档**: https://docs.smartvillage.com/security
- **问题反馈**: https://github.com/smartvillage/security/issues

### 版本信息

- **当前版本**: v1.0.0
- **更新日期**: 2024-01-01
- **兼容性**: Node.js >= 18.0.0

## 📄 许可证

本项目采用 [MIT License](LICENSE) 许可证。

---

**⚠️ 安全提醒**

- 首次部署后请立即修改默认密码
- 定期更新依赖包和安全补丁
- 启用防火墙和入侵检测系统
- 建立完善的备份和恢复机制

**🔒 数据安全承诺**

我们承诺：
- 严格保护用户隐私数据
- 采用业界最高安全标准
- 定期进行安全审计
- 及时响应安全事件