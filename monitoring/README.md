# 智慧乡村监控告警系统

## 概述

智慧乡村平台监控告警系统提供全方位的监控、告警和可观测性解决方案，确保平台的高可用性、性能优化和快速故障定位。

## 核心功能

### 🔍 **业务指标收集 (BusinessMetricsCollector)**

#### 用户相关指标
- **实时活跃用户数**: 当前在线用户统计
- **新增用户数**: 用户增长趋势监控
- **用户留存率**: 用户活跃度和粘性分析

#### 交易相关指标
- **交易处理速率**: TPS (每秒交易数) 监控
- **交易总量**: 累计交易统计
- **交易金额**: 财务指标实时追踪

#### 系统性能指标
- **响应时间**: API和页面加载性能
- **错误率**: 业务错误统计分析
- **系统吞吐量**: RPS (每秒请求数) 监控

#### 村务特定指标
- **公告浏览量**: 内容传播效果
- **会议出席率**: 参与度统计
- **任务完成率**: 执行效率分析
- **应急事件响应数**: 安全监控

### 🚨 **智能告警管理 (AlertManager)**

#### 多级告警体系
- **Critical (严重)**: 系统故障、安全事件
- **Warning (警告)**: 性能下降、资源紧张
- **Info (信息)**: 状态变更、通知提醒

#### 多渠道通知
- **邮件通知**: 详细的告警报告
- **短信通知**: 紧急告警即时推送
- **微信通知**: 企业微信集成
- **钉钉通知**: 团队协作平台集成
- **Webhook**: 自定义通知集成

#### 智能告警规则
- **阈值告警**: 指标超过设定阈值
- **趋势告警**: 指标变化趋势异常
- **复合告警**: 多个条件组合判断
- **告警抑制**: 避免告警风暴

### 📊 **分布式链路追踪 (DistributedTracing)**

#### 全链路监控
- **请求追踪**: 端到端请求路径
- **服务调用**: 微服务间调用关系
- **性能分析**: 瓶颈识别和优化
- **错误定位**: 快速问题诊断

#### 追踪能力
- **HTTP请求追踪**: API调用链路
- **数据库查询追踪**: SQL性能分析
- **消息队列追踪**: 异步处理监控
- **缓存操作追踪**: 缓存命中率分析

### 📈 **实时监控仪表板 (MetricsDashboard)**

#### 可视化大屏
- **系统概览**: 整体健康状态
- **用户活跃度**: 实时用户行为分析
- **系统性能**: 关键性能指标展示
- **业务指标**: 村务运营数据可视化

#### 实时数据流
- **WebSocket连接**: 实时数据推送
- **多图表类型**: 折线图、柱状图、饼图、热力图
- **自定义视图**: 个性化监控面板
- **历史数据对比**: 趋势分析

## 技术架构

### 核心技术栈
- **运行时**: Node.js + Express.js
- **数据存储**: Redis (实时数据) + MongoDB (历史数据)
- **消息队列**: RabbitMQ (事件通信)
- **实时通信**: WebSocket
- **链路追踪**: Jaeger
- **监控可视化**: 自研仪表板

### 部署架构
```
┌─────────────────────────────────────────────────────────────┐
│                    监控告警系统架构                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   前端仪表板   │────│ WebSocket   │────│  实时推送    │     │
│  │   (Dashboard)│    │   Server    │    │  Service    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  告警管理器   │────│ 指标收集器   │────│ 链路追踪器   │     │
│  │AlertManager │    │MetricsColl. │    │   Tracing   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  邮件通知     │    │  短信通知     │    │ 微信通知     │     │
│  │    SMTP     │    │   SMS API   │    │  WorkChat   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                      数据层                                │ │
│  │  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐ │ │
│  │  │  Redis   │   │ MongoDB │   │ Jaeger  │   │ RabbitMQ│ │ │
│  │  └─────────┘   └─────────┘   └─────────┘   └─────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 快速开始

### 环境要求
- Node.js >= 16.0.0
- MongoDB >= 4.4
- Redis >= 6.0
- RabbitMQ >= 3.8
- Jaeger (可选)

### 安装和启动
```bash
# 1. 进入监控服务目录
cd monitoring

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件配置相关参数

# 4. 启动监控服务
npm start

# 开发模式启动
npm run dev
```

### 访问地址
- **监控仪表板**: http://localhost:3002
- **WebSocket服务**: ws://localhost:3003
- **API接口**: http://localhost:3002/api

## 配置说明

### 环境变量配置
```bash
# 服务配置
NODE_ENV=development
MONITORING_VERSION=1.0.0
DASHBOARD_PORT=3002

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# MongoDB配置
MONGO_URI=mongodb://localhost:27017/monitoring_db

# 告警通知配置
EMAIL_NOTIFICATIONS=true
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password

# 短信通知配置
SMS_NOTIFICATIONS=true
SMS_API_KEY=your_sms_api_key
SMS_API_SECRET=your_sms_api_secret
SMS_API_ENDPOINT=https://sms.example.com/api

# 微信通知配置
WECHAT_NOTIFICATIONS=true
WECHAT_CORP_ID=your_corp_id
WECHAT_CORP_SECRET=your_corp_secret
WECHAT_AGENT_ID=1000001

# 钉钉通知配置
DINGTALK_NOTIFICATIONS=true
DINGTALK_ACCESS_TOKEN=your_access_token
DINGTALK_SECRET=your_secret

# 链路追踪配置
JAEGER_ENDPOINT=http://localhost:14268/api/traces
JAEGER_AGENT_HOST=localhost
JAEGER_AGENT_PORT=6831
```

## 集成指南

### 在微服务中集成监控

#### 1. 引入监控中间件
```javascript
const { monitoringService } = require('./monitoring/app');

// 使用综合中间件（包含追踪、指标记录等）
app.use(monitoringService.createMiddleware().all);

// 或者单独使用
app.use(monitoringService.createMiddleware().tracing);
app.use(monitoringService.createMiddleware().metrics);
```

#### 2. 记录业务事件
```javascript
// 记录用户登录事件
monitoringService.recordBusinessEvent('user_login', {
  userId: user.id,
  loginMethod: 'password'
}, user.id);

// 记录业务操作
monitoringService.recordBusinessEvent('announcement_published', {
  announcementId: announcement._id,
  category: announcement.category
});
```

#### 3. 性能监控
```javascript
// 包装函数以进行性能监控
const wrappedFunction = monitoringService.wrapFunction(myFunction, {
  operation: 'database_query',
  tags: { collection: 'users' }
});

// 手动记录性能指标
monitoringService.recordPerformanceMetrics('user_registration', 1500, {
  success: true,
  userId: user.id
});
```

#### 4. 自定义告警规则
```javascript
// 添加自定义告警规则
monitoringService.addCustomAlertRule('high_memory_usage', {
  name: '内存使用率过高',
  metric: 'memoryUsage',
  operator: '>',
  threshold: 90,
  duration: 300000,
  severity: 'warning',
  description: '服务内存使用率超过90%',
  tags: ['performance', 'memory']
});
```

### 数据库查询监控
```javascript
// 使用链路追踪监控数据库操作
const tracing = require('./monitoring/services/DistributedTracing');

// 创建数据库查询Span
const dbSpan = tracing.createDbSpan('find', 'users', { status: 'active' });

// 执行查询
const users = await User.find({ status: 'active' });

// 完成Span
dbSpan.finish({
  tags: {
    'db.result_count': users.length,
    'db.query_time': Date.now() - dbSpan.startTime
  }
});
```

## API接口

### 健康检查
```bash
GET /health
```

### 获取所有指标
```bash
GET /api/metrics
```

### 获取监控概览
```bash
GET /api/overview
```

### WebSocket连接
```javascript
const ws = new WebSocket('ws://localhost:3003');

// 订阅图表数据
ws.send(JSON.stringify({
  type: 'subscribe',
  charts: ['overview', 'performance', 'userActivity']
}));

// 请求特定图表数据
ws.send(JSON.stringify({
  type: 'request_data',
  chart: 'performance',
  timeRange: '1h'
}));
```

## 监控指标

### 系统性能指标
| 指标名称 | 说明 | 单位 | 更新频率 |
|---------|------|------|----------|
| responseTime | 平均响应时间 | ms | 30秒 |
| errorRate | 业务错误率 | % | 1分钟 |
| throughput | 系统吞吐量 | rps | 30秒 |
| cpuUsage | CPU使用率 | % | 1分钟 |
| memoryUsage | 内存使用率 | % | 1分钟 |

### 业务指标
| 指标名称 | 说明 | 单位 | 更新频率 |
|---------|------|------|----------|
| activeUsers | 实时活跃用户数 | count | 1分钟 |
| newUsers | 新增用户数 | count | 5分钟 |
| transactionRate | 交易处理速率 | tps | 30秒 |
| announcementViews | 公告浏览量 | count | 30秒 |
| taskCompletion | 任务完成率 | % | 30分钟 |

## 告警规则

### 默认告警规则
1. **高响应时间**: 响应时间 > 1000ms (5分钟)
2. **高错误率**: 错误率 > 5% (3分钟)
3. **低活跃用户**: 活跃用户数 < 10 (10分钟)
4. **服务不可用**: 服务可用性 < 99% (1分钟)
5. **数据库连接**: 连接数 > 80% (3分钟)

### 告警严重级别
- **Critical**: 立即需要处理，影响核心功能
- **Warning**: 需要关注，可能影响用户体验
- **Info**: 信息通知，不需要立即处理

## 故障排查

### 常见问题

#### 1. 指标收集失败
```bash
# 检查Redis连接
redis-cli -h localhost -p 6379 ping

# 检查监控服务状态
curl http://localhost:3002/health
```

#### 2. 告警通知失败
```bash
# 检查邮件配置
telnet smtp.example.com 587

# 检查短信API配置
curl -X POST https://sms.example.com/api/test
```

#### 3. 仪表板无法访问
```bash
# 检查端口占用
netstat -tlnp | grep 3002

# 检查服务日志
tail -f logs/monitoring.log
```

### 日志文件
- **应用日志**: `logs/monitoring.log`
- **错误日志**: `logs/error.log`
- **告警日志**: `logs/alerts.log`

## 性能优化

### 数据存储优化
- 使用Redis集群提高读写性能
- MongoDB分片存储历史数据
- 定期清理过期数据

### 传输优化
- WebSocket连接池管理
- 数据压缩传输
- 增量数据更新

### 告警优化
- 告警聚合和去重
- 智能告警抑制
- 异步通知处理

## 扩展开发

### 添加新的指标收集器
```javascript
class CustomMetricsCollector extends BusinessMetricsCollector {
  async collectCustomMetric() {
    // 实现自定义指标收集逻辑
    return value;
  }
}
```

### 自定义通知渠道
```javascript
// 在AlertManager中添加新的通知渠道
async sendSlackNotification(alert) {
  // 实现Slack通知逻辑
}
```

### 自定义仪表板组件
```javascript
// 在MetricsDashboard中添加新的图表类型
async getCustomChartData(timeRange) {
  // 实现自定义图表数据逻辑
  return chartData;
}
```

## 版本信息
- **当前版本**: v1.0.0
- **更新日期**: 2025-01-01
- **维护团队**: Smart Village Development Team

## 许可证
MIT License - 详见 [LICENSE](LICENSE) 文件