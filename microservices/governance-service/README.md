# 村务服务 (Governance Service)

智慧乡村综合服务平台的村务治理微服务，负责公告管理、会议安排、任务调度等核心村务功能。

## 功能特性

### 📢 公告管理
- **多类型公告支持**：政策宣传、村务通知、会议通知、活动公告、紧急通知等
- **智能分类和优先级**：自动分类、优先级管理、有效期控制
- **多渠道推送**：站内通知、短信、邮件、语音播报
- **互动功能**：评论、点赞、阅读回执、统计分析
- **审核流程**：草稿、待审核、已发布、已撤回状态管理
- **多语言支持**：中文、方言、英文多语言版本

### 📅 会议管理
- **多种会议类型**：村委会议、党员会议、村民代表会议、村民大会、专题会议等
- **线上线下融合**：支持现场会议和线上会议（腾讯会议、钉钉等）
- **全流程管理**：会议创建、邀请、提醒、签到、记录、纪要
- **智能提醒**：自动提醒、缺席处理、会议状态跟踪
- **投票表决**：多种表决方式、结果统计、决策记录
- **会议纪要**：AI辅助记录、任务分配、决策追踪

### ✅ 任务调度
- **多元化任务**：安全生产检查、疫情防控、环境整治、民生服务等
- **网格化管理**：网格员任务分配、区域化管理、责任到人
- **全生命周期**：任务创建、分配、执行、监督、验收、评价
- **智能提醒**：截止时间提醒、超时告警、进度跟踪
- **协作支持**：多人协作、资源共享、任务流转
- **数据分析**：任务完成率、效率分析、绩效考核

## 技术架构

### 核心技术栈
- **运行时**: Node.js + Express.js
- **数据库**: MongoDB (独立实例)
- **消息队列**: RabbitMQ
- **服务发现**: Consul
- **实时通信**: Socket.IO
- **任务调度**: node-cron
- **认证授权**: JWT

### 架构特点
- **微服务设计**：独立的数据库、独立的部署、独立的扩展
- **事件驱动**：基于消息队列的异步事件处理
- **实时协作**：WebSocket支持实时通知和协作
- **高可用性**：健康检查、自动重连、故障转移
- **可观测性**：完整的日志、监控、链路追踪

## API接口

### 公告管理 API
```bash
# 创建公告
POST /api/announcements
Content-Type: application/json

# 发布公告
POST /api/announcements/:id/publish

# 获取公告列表
GET /api/announcements?page=1&limit=20&category=村务通知

# 获取公告详情
GET /api/announcements/:id

# 添加评论
POST /api/announcements/:id/comments

# 搜索公告
POST /api/announcements/search

# 撤回公告
POST /api/announcements/:id/retract
```

### 会议管理 API
```bash
# 创建会议
POST /api/meetings
Content-Type: application/json

# 更新会议
PUT /api/meetings/:id

# 取消会议
POST /api/meetings/:id/cancel

# 获取会议列表
GET /api/meetings?page=1&limit=20&status=待召开

# 会议签到
POST /api/meetings/:id/checkin

# 开始会议
POST /api/meetings/:id/start

# 结束会议
POST /api/meetings/:id/end

# 进行表决
POST /api/meetings/:id/vote
```

### 任务管理 API
```bash
# 创建任务
POST /api/tasks
Content-Type: application/json

# 分配任务
POST /api/tasks/:id/assign

# 开始任务
POST /api/tasks/:id/start

# 更新进度
POST /api/tasks/:id/progress

# 完成任务
POST /api/tasks/:id/complete

# 获取任务列表
GET /api/tasks?status=进行中&assigneeId=xxx

# 获取今日任务
GET /api/tasks/today/list

# 获取超时任务
GET /api/tasks/overdue/list
```

## 部署说明

### 环境要求
- Node.js >= 16.0.0
- MongoDB >= 4.4
- RabbitMQ >= 3.8
- Consul >= 1.9

### 快速启动
```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库和服务参数

# 3. 启动服务
npm run dev

# 4. 生产环境启动
npm start
```

### Docker部署
```bash
# 构建镜像
docker build -t governance-service .

# 运行容器
docker run -d \
  --name governance-service \
  -p 5002:5002 \
  -e NODE_ENV=production \
  -e MONGO_URI=mongodb://mongo:27017/governance_db \
  -e RABBITMQ_URL=amqp://rabbitmq:5672 \
  governance-service
```

### Kubernetes部署
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: governance-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: governance-service
  template:
    metadata:
      labels:
        app: governance-service
    spec:
      containers:
      - name: governance-service
        image: governance-service:latest
        ports:
        - containerPort: 5002
        env:
        - name: MONGO_URI
          value: "mongodb://mongo:27017/governance_db"
        - name: RABBITMQ_URL
          value: "amqp://rabbitmq:5672"
```

## 监控和运维

### 健康检查
```bash
# 服务健康状态
GET http://localhost:5002/health

# 返回示例
{
  "success": true,
  "service": "governance-service",
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "database": {
    "status": "connected",
    "host": "localhost",
    "port": 27017,
    "database": "governance_db"
  },
  "version": "1.0.0"
}
```

### 日志管理
- **应用日志**: `logs/combined.log`
- **错误日志**: `logs/error.log`
- **日志级别**: 通过 `LOG_LEVEL` 环境变量配置

### 性能监控
- **响应时间监控**: API响应时间统计
- **数据库性能**: 查询时间、连接池状态
- **消息队列**: 消息处理延迟、队列长度
- **系统资源**: CPU、内存、磁盘使用率

## 数据模型

### 公告模型 (Announcement)
```javascript
{
  title: String,           // 标题
  content: String,         // 内容
  category: String,        // 分类
  type: String,           // 类型
  targetAudience: String, // 目标受众
  priority: String,       // 优先级
  publisher: Object,      // 发布者
  publishDate: Date,      // 发布日期
  status: String,         // 状态
  attachments: Array,     // 附件
  comments: Array,        // 评论
  metrics: Object         // 统计数据
}
```

### 会议模型 (Meeting)
```javascript
{
  title: String,              // 会议标题
  type: String,              // 会议类型
  scheduledTime: Date,       // 计划时间
  location: Object,          // 会议地点
  organizer: Object,         // 组织者
  participants: Object,      // 参会人员
  agenda: Array,             // 议程
  status: String,            // 状态
  attendance: Array,         // 签到记录
  minutes: Object,           // 会议纪要
  voting: Array              // 表决记录
}
```

### 任务模型 (Task)
```javascript
{
  title: String,              // 任务标题
  type: String,              // 任务类型
  priority: String,          // 优先级
  creator: Object,           // 创建者
  assignees: Array,          // 执行人员
  scheduledTime: Date,       // 计划时间
  deadline: Date,            // 截止时间
  status: String,            // 状态
  progress: Number,          // 进度
  checkpoints: Array,        // 检查点
  logs: Array,               // 任务日志
  result: Object             // 执行结果
}
```

## 开发指南

### 项目结构
```
governance-service/
├── models/              # 数据模型
│   ├── Announcement.js
│   ├── Meeting.js
│   └── Task.js
├── services/            # 业务服务
│   ├── AnnouncementService.js
│   ├── MeetingService.js
│   └── TaskService.js
├── routes/              # 路由定义
│   ├── announcements.js
│   ├── meetings.js
│   └── tasks.js
├── middleware/          # 中间件
│   ├── auth.js
│   └── validate.js
├── config/              # 配置文件
│   └── database.js
├── utils/               # 工具函数
│   └── logger.js
├── app.js               # 主应用
├── package.json
└── README.md
```

### 开发规范
- **代码风格**: 使用 ESLint + Prettier
- **提交规范**: 遵循 Conventional Commits
- **测试要求**: 单元测试覆盖率 > 80%
- **文档要求**: API文档、代码注释完整

### 测试
```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- tests/services/AnnouncementService.test.js

# 测试覆盖率
npm run test:coverage

# 监听模式
npm run test:watch
```

## 版本信息
- **当前版本**: v1.0.0
- **更新日期**: 2025-01-01
- **维护团队**: Smart Village Development Team

## 许可证
MIT License - 详见 [LICENSE](LICENSE) 文件