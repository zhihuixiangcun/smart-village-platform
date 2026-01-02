# 智慧乡村平台 - 安全防护强化功能

## 概述

本安全防护系统为智慧乡村平台提供全面的安全保护，包括电信诈骗防护、隐私保护、数据加密和安全审计等功能。

## 功能模块

### 1. 电信诈骗防护系统

#### 功能特性
- **来电号码检测**：实时检测来电是否为诈骗号码
- **诈骗号码库**：维护本地诈骗号码数据库
- **反诈平台联动**：与公安反诈中心API对接（需配置）
- **举报功能**：用户可举报可疑号码
- **统计分析**：诈骗类型分布、趋势分析等

#### 数据模型
- `FraudNumber`：诈骗号码数据模型
  - 号码信息、诈骗类型、风险等级
  - 举报次数、验证状态
  - 诈骗案例分析

#### API接口
```
GET    /api/security/fraud/check/:phoneNumber    - 检测号码
POST   /api/security/fraud/report               - 举报号码
GET    /api/security/fraud/numbers              - 获取号码列表
GET    /api/security/fraud/stats                - 获取统计数据
PUT    /api/security/fraud/verify/:id           - 验证号码
PUT    /api/security/fraud/status/:id           - 更新状态
```

#### 前端组件
- `FraudProtection.vue`：防诈骗管理页面
- `FraudAlert.vue`：诈骗警示弹窗组件

#### 使用示例
```javascript
import { securityApi } from '@/api/security'

// 检测号码
const result = await securityApi.checkPhoneNumber('13800138000')

// 举报号码
await securityApi.reportFraudNumber({
  phoneNumber: '13800138000',
  fraudType: 'impersonation',
  fraudTypeName: '冒充公检法',
  reason: '自称公安要求转账'
})
```

### 2. 隐私保护系统

#### 功能特性
- **自动脱敏**：根据规则自动脱敏敏感数据
- **权限控制**：基于角色的查看权限管理
- **人脸识别验证**：查看完整信息需人脸验证
- **查看记录**：完整的查看审计日志
- **规则配置**：灵活的脱敏规则管理

#### 数据模型
- `PrivacyRule`：隐私规则数据模型
  - 规则类型、脱敏模式
  - 权限配置、时间限制
  - 查看次数限制

#### 脱敏规则
| 字段类型 | 脱敏规则 | 示例 |
|---------|---------|------|
| 身份证号 | 前6后4 | 110101********1234 |
| 手机号 | 前3后4 | 138****1234 |
| 银行卡号 | 前4后4 | 1234********5678 |
| 邮箱 | 首字符 | u***@example.com |
| 姓名 | 首字 | 张* |
| 地址 | 隐藏详细 | 浙江省**市**区**路 |

#### API接口
```
GET    /api/security/privacy/rules               - 获取规则
POST   /api/security/privacy/rules               - 创建/更新规则
DELETE /api/security/privacy/rules/:id           - 删除规则
POST   /api/security/privacy/request-view        - 请求查看完整信息
GET    /api/security/privacy/view-history        - 获取查看历史
```

#### 前端组件
- `PrivacySettings.vue`：隐私设置页面
- `SensitiveDataDisplay.vue`：敏感数据显示组件

#### 中间件使用
```javascript
// 在Express路由中使用
const { privacyMask } = require('../middleware/privacyProtection')

router.get('/api/residents', privacyMask, async (req, res) => {
  const data = await getResidents()
  // 响应会自动脱敏
  res.json({ success: true, data })
})
```

### 3. 数据加密系统

#### 功能特性
- **AES-256-GCM加密**：军用级对称加密
- **RSA非对称加密**：用于密钥交换和签名
- **密钥管理**：安全的密钥存储和轮换
- **哈希计算**：支持多种哈希算法
- **混合加密**：结合AES和RSA的优点

#### 加密算法
- AES-256-GCM：对称加密
- RSA-OAEP-2048：非对称加密
- SHA-256：哈希算法
- HMAC-SHA256：消息认证

#### API接口
```
POST   /api/security/encryption/aes/encrypt      - AES加密
POST   /api/security/encryption/aes/decrypt      - AES解密
POST   /api/security/encryption/hash             - 计算哈希
POST   /api/security/encryption/rotate-keys      - 密钥轮换
GET    /api/security/encryption/stats            - 获取加密统计
```

#### 前端组件
- `EncryptionStatus.vue`：加密状态显示组件

#### 使用示例
```javascript
import { dataEncryptionService } from '@/services/dataEncryptionService'

// AES加密
const encrypted = dataEncryptionService.aesEncrypt('敏感数据', keyHex)
console.log(encrypted) // { iv, tag, ciphertext }

// AES解密
const decrypted = dataEncryptionService.aesDecrypt(encrypted, keyHex)

// 计算哈希
const hash = dataEncryptionService.calculateHash('数据')
```

### 4. 区块链存证系统

#### 功能特性
- **数据上链**：将重要数据哈希上链存证
- **防篡改验证**：验证数据完整性
- **存证证书**：生成区块链存证证书
- **批量验证**：批量验证多条记录
- **统计分析**：上链成功率、类型分布等

#### 数据模型
- `BlockchainRecord`：区块链存证数据模型
  - 记录类型、业务数据
  - 数据哈希、区块链信息
  - 验证状态、证书信息

#### 上链流程
1. 计算数据哈希（SHA-256）
2. 构建交易数据
3. 提交到区块链节点
4. 获取交易确认
5. 更新存证记录

#### API接口
```
POST   /api/security/blockchain/records          - 创建存证
POST   /api/security/blockchain/upload/:id       - 上链
GET    /api/security/blockchain/verify/:id       - 验证存证
POST   /api/security/blockchain/certificate/:id  - 生成证书
GET    /api/security/blockchain/records          - 查询记录
GET    /api/security/blockchain/stats            - 获取统计
```

#### 使用示例
```javascript
import { blockchainService } from '@/services/blockchainService'

// 创建存证
const record = await blockchainService.createRecord({
  recordType: 'financial',
  recordTypeName: '财务流水',
  businessData: {
    businessType: 'expense',
    businessId: expenseId
  },
  rawData: {
    amount: 1000,
    description: '办公用品采购'
  }
})

// 验证存证
const verification = await blockchainService.verifyRecord(record._id)
```

### 5. 安全审计系统

#### 功能特性
- **操作日志**：记录所有敏感操作
- **异常检测**：自动检测异常行为
- **告警推送**：异常行为实时告警
- **统计分析**：操作趋势、访问热力图
- **合规检查**：自动检查合规性
- **日志导出**：支持导出审计日志

#### 数据模型
- `SecurityAudit`：安全审计数据模型
  - 操作类型、操作人
  - IP地址、设备信息
  - 敏感级别、异常标记

#### 异常检测规则
- **频率异常**：短时间内大量操作
- **时间异常**：非正常时间操作
- **位置异常**：异常地理位置
- **行为异常**：连续失败等

#### API接口
```
POST   /api/security/audit/log                   - 记录日志
GET    /api/security/audit/logs                  - 查询日志
GET    /api/security/audit/report                - 获取审计报告
GET    /api/security/audit/anomaly-report        - 获取异常报告
GET    /api/security/audit/heatmap               - 获取访问热力图
GET    /api/security/audit/export                - 导出日志
GET    /api/security/audit/compliance            - 检查合规性
```

#### 使用示例
```javascript
import { securityAuditService } from '@/services/securityAuditService'

// 记录审计日志
await securityAuditService.log({
  operationType: 'view_sensitive_data',
  operationName: '查看敏感信息',
  operator: {
    userId: user._id,
    userName: user.name,
    userRole: user.role
  },
  ipAddress: req.ip,
  sensitivityLevel: 'high',
  result: 'success'
})

// 查询异常报告
const report = await securityAuditService.getAnomalyReport(7)
```

## 安装和配置

### 1. 安装依赖

```bash
# 后端依赖
npm install crypto web3

# 前端依赖
npm install crypto-js
```

### 2. 环境变量配置

在 `.env` 文件中添加：

```bash
# 反诈平台API（可选）
ANTI_FRAUD_API_URL=https://api.antifraud.example.com
ANTI_FRAUD_API_KEY=your_api_key_here

# 区块链配置（可选）
BLOCKCHAIN_NODE_URL=http://localhost:8545
BLOCKCHAIN_CONTRACT_ADDRESS=0x...
BLOCKCHAIN_ACCOUNT_ADDRESS=0x...
BLOCKCHAIN_ACCOUNT_PRIVATE_KEY=...

# JWT密钥
JWT_SECRET=your_jwt_secret_here
```

### 3. 初始化数据库

```bash
# 初始化默认隐私规则
npm run init-privacy-rules
```

### 4. 注册路由

在 `server/app.js` 中添加：

```javascript
const securityRoutes = require('./api/security')
app.use('/api/security', securityRoutes)
```

## 使用指南

### 防诈骗功能使用

1. **检测号码**：在来电时调用检测API
2. **警示弹窗**：如果检测到风险，显示警示
3. **用户举报**：用户可举报可疑号码
4. **数据分析**：查看诈骗趋势统计

### 隐私保护使用

1. **配置规则**：在隐私设置页面配置脱敏规则
2. **自动脱敏**：API响应自动应用脱敏
3. **权限验证**：查看完整信息需验证
4. **审计记录**：所有查看行为被记录

### 数据加密使用

1. **敏感数据加密**：存储前加密敏感信息
2. **传输加密**：使用HTTPS + 加密Payload
3. **密钥轮换**：定期轮换加密密钥
4. **状态监控**：查看加密系统状态

### 区块链存证使用

1. **创建存证**：重要操作自动上链
2. **验证完整性**：验证数据未被篡改
3. **生成证书**：为存证生成证书
4. **统计分析**：查看上链统计

### 安全审计使用

1. **自动记录**：所有敏感操作自动记录
2. **异常监控**：实时监控异常行为
3. **定期报告**：生成定期审计报告
4. **合规检查**：确保符合法规要求

## 安全最佳实践

### 1. 数据保护
- 敏感数据必须加密存储
- 传输使用HTTPS
- 定期备份数据
- 实施访问控制

### 2. 密钥管理
- 密钥定期轮换（建议90天）
- 密钥加密存储
- 密钥访问记录
- 备份旧密钥

### 3. 访问控制
- 最小权限原则
- 多因素认证
- 会话超时
- IP白名单

### 4. 审计日志
- 记录所有敏感操作
- 日志防篡改
- 定期审查日志
- 长期保存日志

### 5. 异常监控
- 实时监控异常行为
- 及时响应安全事件
- 定期安全评估
- 持续改进

## 故障排查

### 常见问题

1. **加密失败**
   - 检查密钥是否正确
   - 确认加密算法支持
   - 查看错误日志

2. **人脸识别失败**
   - 检查摄像头权限
   - 确认光线充足
   - 重试识别

3. **区块链上链失败**
   - 检查网络连接
   - 确认节点可用
   - 查看交易状态

4. **性能问题**
   - 优化数据库索引
   - 启用缓存
   - 异步处理

## 技术支持

如有问题，请联系技术支持团队或查阅相关文档。

## 更新日志

### v1.0.0 (2025-01-02)
- 初始版本发布
- 实现防诈骗、隐私保护、数据加密、区块链存证、安全审计功能
