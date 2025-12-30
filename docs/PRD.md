# 智慧乡村综合服务平台 - 产品需求文档 (PRD)

## 文档信息

| 项目 | 信息 |
|------|------|
| 文档版本 | v1.0.0 |
| 创建日期 | 2025-12-30 |
| 产品名称 | 智慧乡村综合服务平台 |
| 文档状态 | 草案 |

---

## 目录

1. [项目概述](#项目概述)
2. [新增功能：村委财务报销管理](#新增功能村委财务报销管理)
3. [功能需求](#功能需求)
4. [技术实现方案](#技术实现方案)
5. [用户故事](#用户故事)
6. [非功能性需求](#非功能性需求)

---

## 项目概述

本产品是一个面向农村地区的**智慧乡村综合服务平台**，旨在通过数字化手段提升村级治理效率、改善村民服务质量、加强村务透明度。

### 核心功能模块

- 村民管理系统
- 村务协同治理
- 财务透明化管理
- 应急响应管理
- 智能值班表
- 乡村生活服务

---

## 新增功能：村委财务报销管理

### 1. 功能背景

#### 1.1 问题陈述

当前村委财务报销流程存在以下痛点：

| 角色 | 问题 | 影响 |
|------|------|------|
| **村干部** | 报账资料收集困难 | • 需要多次向村民/供应商索要资料<br>• 资料散落各处，整理耗时<br>• 容易遗漏关键凭证 |
| **会计员** | 报账后资料无法跟踪查询 | • 不知道报销进度如何<br>• 找不到历史报账记录<br>• 财务对账困难 |
| **村领导** | 缺乏财务透明度 | • 无法实时了解报销情况<br>• 财务监督困难 |

#### 1.2 业务场景

**场景 1：资料收集困难**
```
村干部张三负责购买村办公用品，需要报销：
1. 收集发票
2. 找供应商要收据
3. 找经办人签字
4. 找村主任审批
5. 准备佐证材料（照片、清单等）

问题：资料分散在不同地方，收集过程耗时耗力，容易遗漏。
```

**场景 2：报账后无法跟踪**
```
会计员李四收到张三的报销申请后：
1. 审核资料
2. 录入财务系统
3. 等待拨款

问题：张三不知道进度，李四找不到历史记录，对账困难。
```

### 2. 功能目标

#### 2.1 核心目标

1. **简化资料收集**：提供一站式资料上传和管理平台
2. **全程跟踪**：实时显示报销进度和状态
3. **历史可查**：完整记录所有报账历史和凭证
4. **移动友好**：支持手机拍照上传，方便村干部随时操作

#### 2.2 成功指标

| 指标 | 当前 | 目标 |
|------|------|------|
| 资料收集时间 | 3-5天 | <1天 |
| 报销进度查询 | 无法查询 | 实时查询 |
| 历史记录查找 | 困难 | 秒级检索 |
| 移动操作支持 | 不支持 | 100%支持 |

---

## 功能需求

### 1. 报销申请管理

#### 1.1 创建报销申请

**功能描述**：村干部可创建报销申请并上传相关资料

**字段设计**：

```javascript
{
  // 基本信息
  reimbursementId: String,        // 报销单号（自动生成）
  villageId: String,               // 村庄ID
  applicantId: String,             // 申请人ID（村干部）
  applicantName: String,           // 申请人姓名
  department: String,              // 部门（如：村委会、村党支部等）

  // 报销信息
  category: String,                // 报销类别
                                  // - office_supplies: 办公用品
                                  // - activity_expenses: 活动经费
                                  // - project_costs: 项目支出
                                  // - public_welfare: 公益支出
                                  // - other: 其他
  amount: Number,                  // 报销金额（元）
  description: String,             // 报销事由

  // 时间信息
  occurrenceDate: Date,            // 事务发生日期
  applicationDate: Date,           // 申请日期

  // 资料状态
  materialsStatus: {
    required: [String],            // 必需资料列表
    submitted: [String],           // 已提交资料
    missing: [String],             // 缺失资料
    completeness: Number           // 完整度百分比 0-100
  },

  // 审批流程
  approvalFlow: [{
    role: String,                  // 审批角色（会计/村主任/书记）
    approverId: String,            // 审批人ID
    approverName: String,          // 审批人姓名
    status: String,                // 状态：pending/approved/rejected
    comment: String,               // 审批意见
    timestamp: Date                // 审批时间
  }],

  // 当前状态
  status: String,                  // pending: 待审核
                                  // reviewing: 审核中
                                  // approved: 已通过
                                  // rejected: 已拒绝
                                  // paid: 已支付
                                  // archived: 已归档

  // 财务信息
  paymentInfo: {
    accountName: String,           // 收款账户名
    accountNumber: String,         // 收款账号
    bankName: String,              // 开户银行
    paymentDate: Date,             // 实际支付日期
    paymentVoucher: String         // 支付凭证号
  }
}
```

**UI 设计要点**：

- 支持手机拍照直接上传发票
- 自动识别发票信息（OCR）
- 资料完整性实时提示
- 保存草稿功能

#### 1.2 资料上传管理

**支持资料类型**：

| 资料类型 | 说明 | 必填 | 格式 |
|---------|------|------|------|
| 发票/收据 | 正式发票或收据照片 | 是 | JPG/PNG/PDF |
| 清单明细 | 物品清单或服务明细 | 按需 | Excel/PDF/图片 |
| 活动照片 | 现场活动照片 | 按需 | JPG/PNG |
| 审批文件 | 会议纪要、批文等 | 按需 | PDF/图片 |
| 其他凭证 | 其他支持性材料 | 否 | 任意 |

**资料上传功能**：

- 批量上传：一次上传多个文件
- 拍照上传：直接调用手机摄像头
- OCR识别：自动识别发票金额、日期等信息
- 压缩优化：自动压缩图片节省空间
- 版本管理：支持替换已上传文件

#### 1.3 资料完整性检查

**自动检查规则**：

```javascript
// 示例：办公用品报销必需资料
const categoryRequirements = {
  office_supplies: {
    required: ['发票/收据', '物品清单'],
    optional: ['活动照片', '审批文件'],
    minAmount: 100,  // 金额大于100元需要额外审批
    additionalApproval: ['村主任', '村书记']
  },
  activity_expenses: {
    required: ['发票/收据', '活动方案', '参与人员名单'],
    optional: ['活动照片', '会议纪要'],
    minAmount: 500,
    additionalApproval: ['村主任', '村书记']
  }
}
```

**实时提示**：

- 🟢 绿色：资料完整，可提交
- 🟡 黄色：资料不全，请补充
- 🔴 红色：缺少必需资料

### 2. 审批流程管理

#### 2.1 审批链配置

**默认审批链**：

```
村干部申请 → 会计初审 → 村主任审批 → 村书记审批 → 财务支付
```

**特殊情况**：

- 金额 < 500元：会计审批即可
- 金额 500-2000元：会计 + 村主任
- 金额 > 2000元：会计 + 村主任 + 村书记

#### 2.2 审批操作

**审批功能**：

- 通过：填写审批意见，进入下一环节
- 驳回：填写驳回原因，退回申请人修改
- 转办：转交给其他审批人
- 加签：邀请其他人参与审批

**通知机制**：

- 待办提醒：短信/APP推送
- 超时提醒：超过3天未处理自动提醒
- 结果通知：审批完成后通知申请人

### 3. 报销进度跟踪

#### 3.1 进度可视化

**时间线展示**：

```
┌─────────────────────────────────────────────────┐
│  报销进度：RE20251230001                       │
├─────────────────────────────────────────────────┤
│  📝 2025-12-30 张三提交申请                    │
│     ✅ 资料已上传：发票、清单                  │
│                                                 │
│  👁️ 2025-12-30 会计李四审核中                │
│     ⏳ 正在审核...                             │
│                                                 │
│  ⏳ 村主任审批                                 │
│     等待前置环节完成                          │
│                                                 │
│  ⏳ 财务支付                                   │
│     等待前置环节完成                          │
└─────────────────────────────────────────────────┘
```

#### 3.2 状态查询

**查询入口**：

1. 首页"我的报销"卡片
2. 报销列表页搜索
3. 扫码查询（报销单号二维码）

**查询条件**：

- 按日期范围
- 按状态筛选
- 按金额范围
- 按报销类别

### 4. 历史记录管理

#### 4.1 记录列表

**列表展示字段**：

- 报销单号
- 报销类别
- 金额
- 申请日期
- 当前状态
- 操作按钮

#### 4.2 记录详情

**详情页包含**：

1. **基本信息**：报销单号、申请人、部门等
2. **报销内容**：类别、金额、事由
3. **资料附件**：所有上传的文件
4. **审批记录**：完整审批链和时间线
5. **支付信息**：支付状态和凭证

#### 4.3 导出功能

**支持导出**：

- PDF：完整报销单（含附件）
- Excel：报销明细表格
- 图片：报销凭证图片

### 5. 统计分析

#### 5.1 个人统计

- 本月报销次数
- 本月报销总额
- 待处理报销数
- 平均审批时长

#### 5.2 村级统计

- 月度报销趋势图
- 各类别报销占比
- 各部门报销统计

#### 5.3 财务报表

- 月度报销汇总表
- 未支付报销清单
- 异常报销预警

---

## 技术实现方案

### 1. 数据库设计

#### 1.1 Reimbursement 报销单表

```javascript
const ReimbursementSchema = new Schema({
  reimbursementId: {
    type: String,
    unique: true,
    index: true
  },
  villageId: {
    type: Schema.Types.ObjectId,
    ref: 'Village',
    index: true
  },
  applicantId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  department: String,
  category: {
    type: String,
    enum: ['office_supplies', 'activity_expenses', 'project_costs', 'public_welfare', 'other']
  },
  amount: {
    type: Number,
    required: true,
    index: true
  },
  description: String,
  occurrenceDate: Date,
  applicationDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  materialsStatus: {
    required: [String],
    submitted: [String],
    missing: [String],
    completeness: { type: Number, default: 0 }
  },
  approvalFlow: [{
    role: String,
    approverId: { type: Schema.Types.ObjectId, ref: 'User' },
    approverName: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected']
    },
    comment: String,
    timestamp: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'approved', 'rejected', 'paid', 'archived'],
    default: 'pending',
    index: true
  },
  paymentInfo: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    paymentDate: Date,
    paymentVoucher: String
  },
  // 软删除
  deleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// 索引
ReimbursementSchema.index({ villageId: 1, applicationDate: -1 });
ReimbursementSchema.index({ applicantId: 1, status: 1 });
ReimbursementSchema.index({ status: 1, amount: 1 });
```

#### 1.2 ReimbursementAttachment 附件表

```javascript
const ReimbursementAttachmentSchema = new Schema({
  reimbursementId: {
    type: Schema.Types.ObjectId,
    ref: 'Reimbursement',
    index: true
  },
  fileType: {
    type: String,
    enum: ['invoice', 'receipt', 'list', 'photo', 'approval_doc', 'other']
  },
  fileName: String,
  originalName: String,
  filePath: String,
  fileSize: Number,
  mimeType: String,
  // OCR识别结果
  ocrData: {
    amount: Number,
    date: Date,
    merchant: String,
    confidence: Number
  },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  deleted: { type: Boolean, default: false }
}, {
  timestamps: true
});
```

#### 1.3 ReimbursementComment 审批评论表

```javascript
const ReimbursementCommentSchema = new Schema({
  reimbursementId: {
    type: Schema.Types.ObjectId,
    ref: 'Reimbursement',
    index: true
  },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  role: String,
  content: String,
  attachments: [String],
  deleted: { type: Boolean, default: false }
}, {
  timestamps: true
});
```

### 2. API 设计

#### 2.1 报销申请接口

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | /api/v1/reimbursement | 创建报销申请 | 村干部 |
| GET | /api/v1/reimbursement | 获取报销列表 | 登录用户 |
| GET | /api/v1/reimbursement/:id | 获取报销详情 | 登录用户 |
| PUT | /api/v1/reimbursement/:id | 更新报销申请 | 申请人 |
| DELETE | /api/v1/reimbursement/:id | 删除报销申请 | 申请人 |
| POST | /api/v1/reimbursement/:id/submit | 提交审批 | 申请人 |

#### 2.2 资料管理接口

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | /api/v1/reimbursement/:id/attachments | 上传附件 | 申请人/审批人 |
| GET | /api/v1/reimbursement/:id/attachments | 获取附件列表 | 登录用户 |
| DELETE | /api/v1/reimbursement/attachments/:fileId | 删除附件 | 上传者 |
| POST | /api/v1/reimbursement/attachments/:fileId/ocr | 识别发票 | 申请人 |

#### 2.3 审批流程接口

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | /api/v1/reimbursement/:id/approve | 审批通过 | 审批人 |
| POST | /api/v1/reimbursement/:id/reject | 审批驳回 | 审批人 |
| POST | /api/v1/reimbursement/:id/forward | 转办 | 审批人 |
| GET | /api/v1/reimbursement/:id/approvals | 获取审批记录 | 登录用户 |

#### 2.4 查询统计接口

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | /api/v1/reimbursement/stats/personal | 个人统计 | 登录用户 |
| GET | /api/v1/reimbursement/stats/village | 村级统计 | 村干部 |
| GET | /api/v1/reimbursement/export/:id | 导出报销单 | 相关人员 |
| GET | /api/v1/reimbursement/search | 搜索报销单 | 登录用户 |

### 3. 前端页面设计

#### 3.1 页面结构

```
财务报销管理
├── 报销申请
│   ├── 创建申请
│   ├── 我的草稿
│   └── 待我审批
├── 报销记录
│   ├── 全部记录
│   ├── 待审批
│   ├── 已通过
│   └── 已拒绝
└── 统计分析
    ├── 个人统计
    └── 村级统计
```

#### 3.2 核心组件

1. **ReimbursementForm** - 报销申请表单
2. **FileUpload** - 文件上传组件（支持拖拽、批量上传）
3. **ProgressTracker** - 进度追踪组件
4. **ApprovalChain** - 审批链组件
5. **ReimbursementCard** - 报销单卡片
6. **StatisticsChart** - 统计图表组件

---

## 用户故事

### 故事 1：资料收集简化

**作为** 村干部张三
**我想要** 能够一次性上传所有报销资料
**这样** 我就不需要来回跑多次收集资料

**验收标准**：
- [ ] 支持一次上传多个文件
- [ ] 支持手机拍照直接上传
- [ ] 自动识别发票信息
- [ ] 实时显示资料完整性

### 故事 2：进度跟踪

**作为** 村干部张三
**我想要** 能够随时查看报销审批进度
**这样** 我就知道什么时候能拿到钱

**验收标准**：
- [ ] 显示当前审批环节
- [ ] 显示审批人信息
- [ ] 显示预计完成时间
- [ ] 状态变化时推送通知

### 故事 3：历史查询

**作为** 会计员李四
**我想要** 能够快速查找历史报销记录
**这样** 我就能进行财务对账

**验收标准**：
- [ ] 支持多条件搜索
- [ ] 支持导出报销单
- [ ] 支持查看所有附件
- [ ] 支持查看完整审批链

### 故事 4：移动办公

**作为** 村干部张三
**我想要** 能够在手机上完成报销申请
**这样** 我就不需要回到办公室用电脑

**验收标准**：
- [ ] 移动端适配良好
- [ ] 支持拍照上传
- [ ] 操作简单直观
- [ ] 支持离线缓存

---

## 非功能性需求

### 1. 性能要求

- 页面加载时间 < 2秒
- 文件上传速度 > 1MB/s
- 查询响应时间 < 500ms
- 支持并发用户数 > 100

### 2. 安全要求

- 资料访问权限控制
- 敏感信息脱敏显示
- 操作日志全记录
- 数据传输加密（HTTPS）

### 3. 可用性要求

- 系统可用性 > 99.5%
- 数据备份频率：每日
- 容灾恢复时间 < 4小时

### 4. 兼容性要求

- 支持主流浏览器（Chrome、Firefox、Safari）
- 支持移动设备（iOS 12+、Android 8+）
- 支持微信小程序（可选）

---

## 附录

### A. 报销类别详细说明

| 类别代码 | 类别名称 | 说明 | 必需资料 |
|---------|---------|------|---------|
| office_supplies | 办公用品 | 笔、纸、打印机耗材等 | 发票、清单 |
| activity_expenses | 活动经费 | 村民大会、文体活动等 | 发票、活动方案、签到表 |
| project_costs | 项目支出 | 基建工程、设备采购等 | 发票、合同、验收单 |
| public_welfare | 公益支出 | 困难补助、慰问金等 | 发票/收据、发放名单 |
| other | 其他 | 未分类支出 | 发票、说明文件 |

### B. 审批角色权限

| 角色 | 权限范围 |
|------|---------|
| 会计 | 审核资料完整性、金额准确性 |
| 村主任 | 审核报销合理性、必要性 |
| 村书记 | 终审、大额审批 |
| 财务 | 支付、归档 |

### C. 状态机图

```
[pending(待审核)]
    ↓
[reviewing(审核中)] → [rejected(已拒绝)] → [pending]
    ↓
[approved(已通过)]
    ↓
[paid(已支付)]
    ↓
[archived(已归档)]
```

### D. 术语表

| 术语 | 解释 |
|------|------|
| 报销单号 | 系统自动生成的唯一标识，格式：RE + YYYYMMDD + 4位序号 |
| 资料完整性 | 已提交必需资料数 / 总必需资料数 × 100% |
| 审批链 | 该报销单需要经过的所有审批环节 |
| OCR | 光学字符识别，用于自动提取发票信息 |

---

## 变更记录

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|---------|
| v1.0.0 | 2025-12-30 | Claude | 初始版本，定义村委财务报销管理功能 |
