# 一户一码系统和家庭档案数字化功能

## 功能概述

本系统为智慧乡村平台实现了完整的"一户一码"系统和家庭档案数字化管理功能，支持：

### 核心功能

1. **一户一码系统**
   - 为每户村民家庭生成唯一二维码
   - 二维码包含：户主信息、家庭地址、成员数量等
   - 支持扫码查看/更新家庭信息
   - 二维码有效期管理（永久或临时）

2. **家庭档案管理**
   - 完整的家庭信息记录
     - 户主信息（姓名、身份证、电话）
     - 家庭成员（关系、出生日期、职业）
     - 住房信息（面积、房型、建造年代）
     - 土地信息（耕地面积、林地、宅基地）
     - 家庭类型（低保户、独生户、独居老人等）

3. **远程认证服务**
   - 人脸识别登录
   - 亲属代理功能（子女可远程帮助父母操作）
   - 活体检测防止照片攻击
   - 认证记录追溯

4. **智能标签系统**
   - 自动标记特殊家庭
     - 独居老人家庭
     - 低保户家庭
     - 残疾人家庭
     - 重大疾病患者家庭
   - 标签自动更新机制
   - 基于标签的定向关怀

## 项目结构

```
smart-village-platform/
├── server/                                    # 后端服务
│   ├── models/
│   │   ├── Family.js                         # 家庭档案数据模型
│   │   ├── FamilyMember.js                   # 家庭成员数据模型
│   │   ├── createFamilyIndexes.js           # 创建数据库索引
│   │   └── initFamilyData.js                # 初始化示例数据
│   ├── services/
│   │   ├── familyService.js                  # 家庭管理业务逻辑
│   │   └── remoteAuthService.js              # 远程认证服务
│   ├── controllers/
│   │   └── familyController.js               # 家庭管理控制器
│   └── api/
│       └── family.js                         # 家庭管理API路由
│
└── client/                                    # 前端应用
    └── src/
        ├── views/family/
        │   └── FamilyManagement.vue           # 家庭管理主页面
        │   └── FamilyForm.vue                 # 家庭信息表单
        └── components/family/
            ├── QRCodeDisplay.vue              # 二维码显示组件
            ├── RemoteAuthDialog.vue           # 远程认证对话框
            └── FamilyTags.vue                 # 家庭标签组件
        ├── stores/
        │   └── familyStore.js                 # 家庭状态管理
        └── api/
            └── family.js                      # 家庭API客户端
```

## 安装和配置

### 1. 安装依赖

**后端依赖：**
```bash
cd server
npm install mongoose qrcode jsonwebtoken crypto
```

**前端依赖：**
```bash
cd client
npm install
```

### 2. 环境变量配置

在 `server/.env` 中添加以下配置：

```env
# MongoDB连接
MONGO_URI=mongodb://localhost:27017/smart-village

# JWT密钥
JWT_SECRET=your-secret-key-here

# 身份证加密配置
ID_CARD_ENCRYPTION_KEY=your-32-character-encryption-key
ID_CARD_ENCRYPTION_IV=your-16-character-iv
```

### 3. 数据库初始化

```bash
# 创建索引
cd server
node models/createFamilyIndexes.js create

# 初始化示例数据（可选）
node models/initFamilyData.js init 示例村庄 10
```

### 4. 注册API路由

在 `server/app.js` 或主服务器文件中添加：

```javascript
const familyRoutes = require('./api/family');
app.use('/api/family', familyRoutes);
```

## API接口文档

### 家庭档案管理

#### 创建家庭档案
```
POST /api/family
Content-Type: application/json

{
  "villageId": "村庄ID",
  "houseNumber": "A栋101",
  "headOfHousehold": {
    "name": "张三",
    "idCard": "330110198001011234",
    "phone": "13800138000",
    "gender": "男",
    "birthDate": "1980-01-01"
  },
  "address": {
    "detail": "某某村A栋101室"
  },
  "housing": {
    "type": "自建房",
    "area": 120
  },
  "land": {
    "cultivatedArea": 5
  }
}
```

#### 获取家庭列表
```
GET /api/family/village/:villageId?familyType=低保户&page=1&pageSize=20
```

#### 获取家庭详情
```
GET /api/family/:familyId
```

#### 更新家庭档案
```
PUT /api/family/:familyId
```

#### 删除家庭档案
```
DELETE /api/family/:familyId
```

### 二维码管理

#### 重新生成二维码
```
POST /api/family/:familyId/qrcode/regenerate
Content-Type: application/json

{
  "expiresInDays": 30  // null表示永久有效
}
```

#### 撤销二维码
```
POST /api/family/:familyId/qrcode/revoke
```

#### 记录打印
```
POST /api/family/:familyId/qrcode/print
```

#### 根据二维码获取家庭信息
```
GET /api/family/qrcode/:qrCode
```

### 家庭成员管理

#### 添加家庭成员
```
POST /api/family/:familyId/members
Content-Type: application/json

{
  "name": "李四",
  "idCard": "330110198501011234",
  "relationship": "配偶",
  "phone": "13900139000"
}
```

#### 更新成员信息
```
PUT /api/family/members/:memberId
```

#### 删除成员
```
DELETE /api/family/members/:memberId
```

### 远程认证

#### 初始化人脸认证
```
POST /api/family/members/:memberId/face/authenticate
Content-Type: application/json

{
  "faceImageBase64": "data:image/jpeg;base64,..."
}
```

#### 执行人脸识别
```
POST /api/family/auth/:sessionId/recognize
Content-Type: application/json

{
  "capturedImageBase64": "data:image/jpeg;base64,..."
}
```

#### 亲属代理认证
```
POST /api/family/members/:memberId/proxy/request
Content-Type: application/json

{
  "proxyMemberId": "代理成员ID"
}
```

### 统计查询

#### 获取统计数据
```
GET /api/family/village/:villageId/statistics
```

#### 导出数据
```
GET /api/family/village/:villageId/export
```

## 数据模型

### Family（家庭）

```javascript
{
  villageId: ObjectId,           // 所属村庄
  houseNumber: String,           // 房屋编号（唯一）
  headOfHousehold: {
    name: String,
    idCard: String,              // 加密存储
    phone: String,
    memberId: ObjectId
  },
  address: {
    province: String,
    city: String,
    detail: String
  },
  memberCount: Number,           // 家庭成员总数
  memberCountInVillage: Number,  // 在村成员数
  familyTypes: [String],         // 家庭类型（可多选）
  housing: {
    type: String,
    area: Number,
    buildYear: Number,
    floors: Number,
    isDangerous: Boolean
  },
  land: {
    cultivatedArea: Number,      // 耕地面积（亩）
    forestArea: Number,          // 林地面积（亩）
    homesteadArea: Number        // 宅基地面积（平方米）
  },
  economicStatus: {
    annualIncome: Number,        // 年收入（万元）
    incomeSource: String,
    hasLowIncomeSupport: Boolean
  },
  qrCode: {
    code: String,                // 唯一编码
    imageUrl: String,
    generatedAt: Date,
    expiresAt: Date,             // null表示永久
    status: String,
    printCount: Number
  },
  tags: [{
    name: String,
    color: String
  }],
  specialFlags: {
    needsRegularVisit: Boolean,
    visitFrequency: Number,      // 走访频率（天）
    priorityHelp: Boolean,
    helpPriority: Number,        // 1-10
    riskLevel: String            // 低/中/高
  }
}
```

### FamilyMember（家庭成员）

```javascript
{
  familyId: ObjectId,
  name: String,
  idCard: String,                // 加密存储
  gender: String,
  birthDate: Date,
  relationship: String,          // 与户主关系
  phone: String,
  education: String,
  occupation: String,
  maritalStatus: String,
  specialTags: [String],         // 特殊标记
  isHead: Boolean,               // 是否为户主
  authentication: {
    status: String,
    faceDescriptor: [Number],    // 人脸特征向量
    facePhoto: String,
    lastAuthTime: Date
  },
  proxySettings: {
    enabled: Boolean,
    allowedProxies: [ObjectId],
    expiryDate: Date
  },
  residenceStatus: String,
  isInVillage: Boolean
}
```

## 使用示例

### 前端使用

```javascript
import { useFamilyStore } from '@/stores/familyStore'

const familyStore = useFamilyStore()

// 获取家庭列表
await familyStore.fetchFamilies(villageId, {
  familyType: '低保户',
  page: 1,
  pageSize: 20
})

// 创建家庭
await familyStore.createFamily({
  villageId: 'xxx',
  houseNumber: 'A栋101',
  headOfHousehold: { ... }
})

// 重新生成二维码
await familyStore.regenerateQRCode(familyId, 30) // 30天有效期
```

### 后端使用

```javascript
const familyService = require('./server/services/familyService')

// 创建家庭
const family = await familyService.createFamily(familyData, operator)

// 添加成员
const member = await familyService.addFamilyMember(familyId, memberData, operator)

// 获取统计
const stats = await familyService.getStatistics(villageId)
```

## 数据安全

### 加密机制

1. **身份证号加密**
   - 使用 AES-256-CBC 加密算法
   - 加密前缀：`encrypted:`
   - 脱敏显示：只显示前后4位

2. **手机号脱敏**
   - 显示格式：`138****1234`

3. **访问控制**
   - 村民只能查看本村数据
   - 户主可管理自己家庭信息
   - 管理员可查看所有信息

4. **操作日志**
   - 所有关键操作记录日志
   - 包含操作者、时间、详情
   - 支持审计追溯

## 智能标签系统

### 自动家庭类型识别

系统根据以下规则自动识别家庭类型：

- **低保户**：经济状况中有低保支持
- **残疾人家庭**：家庭成员有残疾人标记
- **独居老人家庭**：60岁以上老人独居
- **空巢家庭**：子女不在身边
- **独生子女家庭**：只有一个18岁以下子女

### 帮扶优先级计算

```javascript
基础优先级：1
+ 低保户：+3
+ 残疾人家庭：+2
+ 独居老人家庭：+2
+ 危房家庭（3级以上）：+2
+ 慢性病/重大疾病：+1

最高优先级：10
```

### 风险等级

- **高**：优先级 ≥ 7
- **中**：优先级 ≥ 5
- **低**：优先级 < 5

### 定期走访

- 高风险家庭：每7天走访一次
- 中风险家庭：每30天走访一次
- 低风险家庭：无需定期走访

## 维护命令

### 数据库索引

```bash
# 创建索引
cd server
node models/createFamilyIndexes.js create

# 删除索引
node models/createFamilyIndexes.js drop

# 查看索引
node models/createFamilyIndexes.js show
```

### 示例数据

```bash
# 初始化10户示例家庭
node models/initFamilyData.js init 示例村庄 10

# 清空示例数据
node models/initFamilyData.js clear 示例村庄
```

## 前端路由

家庭管理页面已集成到路由系统：

- `/services/household-codes` - 一户一码服务页面（村民视角）
- `/family/management` - 家庭档案管理（管理员视角）

## 注意事项

1. **人脸识别**：当前版本为模拟实现，生产环境需集成专业SDK（如face-api.js、Face++等）
2. **活体检测**：需配合第三方服务实现
3. **图片存储**：建议使用云存储（OSS、S3）而非本地存储
4. **性能优化**：大量数据时考虑分页和索引优化

## 后续扩展

1. **移动端扫码**：集成手机扫码功能
2. **电子签名**：支持电子签名确认
3. **数据可视化**：家庭数据图表展示
4. **智能推荐**：基于AI的帮扶建议
5. **多语言支持**：方言语音播报

## 技术支持

如有问题，请查看：
- 项目文档：`docs/`
- API文档：运行服务后访问 `/api-docs`
- 测试用例：`tests/`

## 版本历史

- v1.0.0 (2025-01-02)
  - 初始版本
  - 完成一户一码系统
  - 实现家庭档案管理
  - 集成远程认证功能
  - 智能标签系统
