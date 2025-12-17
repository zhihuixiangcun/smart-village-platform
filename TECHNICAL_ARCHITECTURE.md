# 第三阶段技术架构设计文档

## 🏗️ 系统架构概览

### 整体架构设计
```
┌─────────────────────────────────────────────────────────────┐
│                     智慧村庄综合服务平台                      │
├─────────────────────────────────────────────────────────────┤
│                        前端层 (Frontend)                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Vue.js 3.0    │  │   Element Plus  │  │  ECharts 5   │ │
│  │   Composition   │  │   UI Framework  │  │  Data Viz    │ │
│  │     API         │  │                 │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                       API网关层 (Gateway)                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Rate Limiting │  │  Authentication │  │   Logging    │ │
│  │                 │  │   & Authorization│  │  & Monitoring│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                       服务层 (Services)                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  Finance APIs   │  │  Project APIs   │  │  Common APIs │ │
│  │  - 日常开支      │  │  - 项目管理     │  │  - 用户管理   │ │
│  │  - 预算管理      │  │  - 工作流      │  │  - 权限控制   │ │
│  │  - 财务报表      │  │  - 风险评估     │  │  - 文件管理   │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                       数据层 (Data)                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │    MongoDB      │  │   Redis Cache   │  │  File Storage│ │
│  │   - 主数据库     │  │   - 会话缓存     │  │  - 文件存储   │ │
│  │   - 分片集群     │  │   - 查询缓存     │  │  - CDN加速    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                      外部集成 (External)                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   OCR Services  │  │   SMS Gateway   │  │  Email SMTP  │ │
│  │  - 百度OCR      │  │   - 短信通知     │  │  - 邮件通知   │ │
│  │  - 腾讯OCR      │  │                 │  │              │ │
│  │  - 阿里云OCR    │  │                 │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 前端架构设计

### Vue.js 3.0 应用架构
```javascript
// 项目结构
src/
├── components/           // 公共组件
│   ├── common/          // 通用组件
│   ├── finance/         // 财务组件 ✅
│   └── project/         // 项目组件 ✅
├── views/               // 页面视图
│   ├── finance/         // 财务管理页面
│   └── project/         // 项目管理页面
├── stores/              // Pinia状态管理
│   ├── user.js         // 用户状态
│   ├── finance.js      // 财务状态
│   └── project.js      // 项目状态
├── api/                 // API接口
│   ├── finance.js      // 财务API
│   ├── project.js      // 项目API
│   └── common.js       // 公共API
├── utils/               // 工具函数
├── composables/         // 组合式函数
└── router/              // 路由配置
```

### 状态管理架构 (Pinia)
```javascript
// stores/finance.js
import { defineStore } from 'pinia'

export const useFinanceStore = defineStore('finance', {
  state: () => ({
    expenses: [],           // 开支列表
    budgets: [],           // 预算列表
    reports: [],           // 报表数据
    statistics: {},        // 统计数据
    filters: {},           // 筛选条件
    pagination: {}         // 分页信息
  }),
  
  getters: {
    totalExpenses: (state) => state.expenses.length,
    currentMonthTotal: (state) => {
      // 计算当月总开支
    },
    budgetUtilization: (state) => {
      // 计算预算使用率
    }
  },
  
  actions: {
    async fetchExpenses(params) {
      // 获取开支列表
    },
    async createExpense(data) {
      // 创建开支记录
    },
    async updateExpense(id, data) {
      // 更新开支记录
    }
  }
})
```

### 组件设计模式
```vue
<!-- 组件通信模式 -->
<template>
  <!-- 父组件 -->
  <FinanceManagement>
    <!-- 子组件事件通信 -->
    <ExpenseList 
      :data="expenses"
      @edit="handleEdit"
      @delete="handleDelete"
      @refresh="fetchData"
    />
    
    <!-- 插槽内容分发 -->
    <template #actions>
      <el-button @click="showCreateDialog">新增开支</el-button>
    </template>
  </FinanceManagement>
</template>

<script setup>
// 组合式API最佳实践
import { ref, computed, onMounted } from 'vue'
import { useFinanceStore } from '@/stores/finance'

const financeStore = useFinanceStore()

// 响应式数据
const loading = ref(false)
const expenses = computed(() => financeStore.expenses)

// 生命周期
onMounted(() => {
  fetchData()
})

// 方法
const fetchData = async () => {
  loading.value = true
  await financeStore.fetchExpenses()
  loading.value = false
}
</script>
```

---

## 🔧 后端架构设计

### Node.js + Express 服务架构
```javascript
// 分层架构设计
src/
├── controllers/         // 控制器层
│   ├── financeController.js
│   └── projectController.js
├── services/            // 业务逻辑层 ✅
│   ├── villageDailyExpenseService.js ✅
│   ├── villageProjectService.js ✅
│   └── workflowService.js
├── models/              // 数据模型层 ✅
│   ├── VillageDailyExpense.js ✅
│   ├── VillageProject.js ✅
│   └── WorkflowDefinition.js
├── routes/              // 路由层 ✅
│   ├── villageDailyExpenses.js ✅
│   ├── villageProjects.js ✅
│   └── workflows.js
├── middleware/          // 中间件
│   ├── auth.js         // 认证中间件
│   ├── validation.js   // 数据验证
│   └── rateLimit.js    // 限流控制
├── utils/               // 工具函数
│   ├── ocr/            // OCR集成
│   ├── notification/   // 通知服务
│   └── report/         // 报表生成
└── config/              // 配置文件
    ├── database.js     // 数据库配置
    └── redis.js        // 缓存配置
```

### API设计规范
```javascript
// RESTful API设计标准
const apiRoutes = {
  // 财务管理API
  finance: {
    expenses: {
      'GET /api/v1/daily-expenses': '获取开支列表',
      'POST /api/v1/daily-expenses': '创建开支记录',
      'GET /api/v1/daily-expenses/:id': '获取开支详情',
      'PUT /api/v1/daily-expenses/:id': '更新开支记录',
      'DELETE /api/v1/daily-expenses/:id': '删除开支记录'
    },
    budgets: {
      'GET /api/v1/budgets': '获取预算列表',
      'POST /api/v1/budgets': '创建预算方案',
      'PUT /api/v1/budgets/:id/approve': '审批预算'
    },
    reports: {
      'GET /api/v1/reports/expenses': '开支报表',
      'GET /api/v1/reports/budget-analysis': '预算分析',
      'POST /api/v1/reports/export': '导出报表'
    }
  },
  
  // 项目管理API
  project: {
    projects: {
      'GET /api/v1/projects': '获取项目列表',
      'POST /api/v1/projects': '创建项目',
      'PUT /api/v1/projects/:id/status': '更新项目状态',
      'POST /api/v1/projects/:id/approve': '项目审批'
    },
    workflows: {
      'GET /api/v1/workflows': '获取工作流定义',
      'POST /api/v1/workflows/execute': '执行工作流',
      'GET /api/v1/workflows/:id/history': '工作流历史'
    }
  }
}
```

### 中间件设计
```javascript
// 认证中间件
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ message: '未授权访问' })
  }
}

// 权限验证中间件
const requirePermission = (module, action) => {
  return (req, res, next) => {
    if (!req.user.hasPermission(module, action)) {
      return res.status(403).json({ message: '权限不足' })
    }
    next()
  }
}

// 限流中间件
const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每IP限制100次请求
  message: '请求过于频繁，请稍后再试'
})
```

---

## 🗄️ 数据库设计

### MongoDB 数据模型设计
```javascript
// 村委日常开支模型 ✅
const VillageDailyExpenseSchema = {
  _id: ObjectId,
  expenseTitle: String,        // 开支标题
  amount: Number,              // 开支金额
  expenseCategory: String,     // 开支分类
  expenseDate: Date,           // 开支日期
  status: String,              // 状态
  handler: {                   // 经手人信息
    handlerId: ObjectId,
    handlerName: String,
    handlerPosition: String
  },
  approvalProcess: {           // 审批流程
    currentStage: String,
    approvalHistory: [{
      approver: ObjectId,
      action: String,
      comments: String,
      approvalDate: Date
    }]
  },
  budgetInfo: {                // 预算信息
    budgetId: ObjectId,
    budgetCategory: String,
    remainingBudget: Number
  },
  vouchers: {                  // 凭证信息
    voucherNumber: String,
    invoices: [Object],
    receipts: [Object]
  },
  // 其他字段...
}

// 村级项目模型 ✅
const VillageProjectSchema = {
  _id: ObjectId,
  projectName: String,         // 项目名称
  projectType: String,         // 项目类型
  description: String,         // 项目描述
  budget: {                    // 预算信息
    totalBudget: Number,
    usedBudget: Number,
    budgetBreakdown: [Object]
  },
  timeline: {                  // 时间线
    startDate: Date,
    endDate: Date,
    phases: [Object]
  },
  team: {                      // 项目团队
    projectManager: ObjectId,
    members: [Object]
  },
  status: String,              // 项目状态
  riskAssessment: {            // 风险评估
    riskLevel: String,
    riskFactors: [Object]
  }
}
```

### 索引优化策略
```javascript
// 性能优化索引
const indexStrategies = {
  VillageDailyExpense: [
    { villageId: 1, expenseDate: -1 },     // 村庄+日期复合索引
    { status: 1, 'approvalProcess.currentStage': 1 }, // 状态+审批阶段
    { expenseCategory: 1, amount: 1 },      // 分类+金额
    { 'handler.handlerId': 1 },            // 经手人索引
    { 'vouchers.voucherNumber': 1 }        // 凭证号唯一索引
  ],
  
  VillageProject: [
    { villageId: 1, status: 1 },          // 村庄+状态
    { projectType: 1, 'timeline.startDate': -1 }, // 类型+开始日期
    { 'team.projectManager': 1 },         // 项目经理
    { 'budget.totalBudget': 1 }           // 预算范围查询
  ]
}

// 数据分片策略
const shardingStrategy = {
  shardKey: { villageId: 1 },            // 按村庄分片
  chunks: {
    minSize: '64MB',                      // 最小块大小
    maxSize: '1GB'                        // 最大块大小
  }
}
```

---

## 🔄 工作流引擎设计

### 工作流定义模型
```javascript
// 工作流定义
const WorkflowDefinitionSchema = {
  _id: ObjectId,
  name: String,                 // 工作流名称
  version: String,              // 版本号
  category: String,             // 分类
  nodes: [{                     // 节点定义
    id: String,
    type: String,               // 节点类型: start/task/decision/end
    name: String,
    config: {
      assignee: String,         // 执行人
      conditions: Object,       // 执行条件
      timeout: Number          // 超时时间
    },
    position: { x: Number, y: Number }
  }],
  edges: [{                     // 连线定义
    id: String,
    source: String,
    target: String,
    condition: Object           // 流转条件
  }],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}

// 工作流实例
const WorkflowInstanceSchema = {
  _id: ObjectId,
  workflowId: ObjectId,        // 工作流定义ID
  businessKey: String,         // 业务主键
  businessType: String,        // 业务类型
  currentNode: String,         // 当前节点
  status: String,              // 实例状态
  variables: Object,           // 流程变量
  history: [{                  // 执行历史
    nodeId: String,
    executor: ObjectId,
    action: String,
    comments: String,
    executeTime: Date
  }],
  startTime: Date,
  endTime: Date
}
```

### 工作流执行引擎
```javascript
class WorkflowEngine {
  // 启动工作流
  async startWorkflow(definitionId, businessKey, variables) {
    const definition = await WorkflowDefinition.findById(definitionId)
    const startNode = definition.nodes.find(n => n.type === 'start')
    
    const instance = new WorkflowInstance({
      workflowId: definitionId,
      businessKey,
      businessType: variables.businessType,
      currentNode: startNode.id,
      status: 'running',
      variables,
      startTime: new Date()
    })
    
    await instance.save()
    await this.executeNode(instance, startNode)
    return instance
  }
  
  // 执行节点
  async executeNode(instance, node) {
    switch (node.type) {
      case 'task':
        await this.executeTaskNode(instance, node)
        break
      case 'decision':
        await this.executeDecisionNode(instance, node)
        break
      case 'end':
        await this.completeWorkflow(instance)
        break
    }
  }
  
  // 任务节点执行
  async executeTaskNode(instance, node) {
    // 分配任务给执行人
    await this.assignTask(instance, node)
    
    // 发送通知
    await notificationService.sendTaskNotification({
      assignee: node.config.assignee,
      taskName: node.name,
      businessKey: instance.businessKey
    })
  }
  
  // 决策节点执行
  async executeDecisionNode(instance, node) {
    const condition = node.config.conditions
    const result = await this.evaluateCondition(condition, instance.variables)
    
    // 根据条件结果选择下一个节点
    const nextNode = await this.getNextNode(node, result)
    await this.executeNode(instance, nextNode)
  }
}
```

---

## 🔒 安全架构设计

### 认证授权体系
```javascript
// JWT认证策略
const authStrategy = {
  accessToken: {
    secret: process.env.JWT_SECRET,
    expiresIn: '15m',           // 访问令牌15分钟
    algorithm: 'HS256'
  },
  refreshToken: {
    secret: process.env.REFRESH_SECRET,
    expiresIn: '7d',            // 刷新令牌7天
    storage: 'redis'            // 存储在Redis中
  }
}

// 权限模型
const permissionModel = {
  resources: [                  // 资源定义
    'daily_expense_management',
    'project_management', 
    'budget_management',
    'report_generation'
  ],
  actions: [                    // 操作定义
    'create', 'read', 'update', 'delete',
    'approve', 'reject', 'export'
  ],
  roles: {                      // 角色定义
    'village_director': [       // 村主任
      'daily_expense_management:*',
      'project_management:*',
      'budget_management:read,approve',
      'report_generation:*'
    ],
    'finance_manager': [        // 财务管理员
      'daily_expense_management:*',
      'budget_management:*',
      'report_generation:create,read'
    ],
    'project_manager': [        // 项目经理
      'project_management:*',
      'daily_expense_management:read'
    ]
  }
}
```

### 数据安全策略
```javascript
// 敏感数据加密
const encryptionStrategy = {
  // 对称加密 (AES-256)
  symmetricEncryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    fields: [                   // 需要加密的字段
      'bankAccount',
      'taxId', 
      'personalId'
    ]
  },
  
  // 哈希加密 (bcrypt)
  hashEncryption: {
    saltRounds: 12,
    fields: ['password']
  },
  
  // 数据脱敏
  dataMasking: {
    'phone': (value) => value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
    'idCard': (value) => value.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2'),
    'bankAccount': (value) => value.replace(/(\d{4})\d+(\d{4})/, '$1****$2')
  }
}

// 审计日志策略
const auditStrategy = {
  logLevel: {
    'CREATE': 'high',           // 创建操作
    'UPDATE': 'high',           // 更新操作
    'DELETE': 'critical',       // 删除操作
    'APPROVE': 'critical',      // 审批操作
    'EXPORT': 'medium'          // 导出操作
  },
  retention: {
    period: '7years',           // 保存7年
    compression: true,          // 启用压缩
    archive: 'cold_storage'     // 冷存储
  }
}
```

---

## 📊 性能优化策略

### 缓存架构设计
```javascript
// Redis缓存策略
const cacheStrategy = {
  // 查询缓存
  queryCache: {
    ttl: 300,                   // 5分钟过期
    patterns: [
      'expense:list:*',         // 开支列表缓存
      'project:list:*',         // 项目列表缓存
      'budget:summary:*'        // 预算汇总缓存
    ]
  },
  
  // 会话缓存
  sessionCache: {
    ttl: 1800,                  // 30分钟过期
    prefix: 'session:'
  },
  
  // 热点数据缓存
  hotDataCache: {
    ttl: 3600,                  // 1小时过期
    patterns: [
      'statistics:*',           // 统计数据
      'reports:*'              // 报表数据
    ]
  }
}

// 数据库查询优化
const queryOptimization = {
  // 分页查询优化
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
    skipOptimization: true      // 使用游标分页
  },
  
  // 聚合查询优化
  aggregation: {
    allowDiskUse: true,         // 允许使用磁盘
    maxTimeMS: 30000,           // 最大执行时间30秒
    indexHints: true            // 使用索引提示
  },
  
  // 连接池配置
  connectionPool: {
    minSize: 5,                 // 最小连接数
    maxSize: 50,                // 最大连接数
    maxIdleTimeMS: 30000,       // 最大空闲时间
    waitQueueTimeoutMS: 5000    // 等待超时时间
  }
}
```

### 前端性能优化
```javascript
// 代码分割策略
const codeSplitting = {
  // 路由级分割
  routeLevel: {
    finance: () => import('@/views/finance/FinanceManagement.vue'),
    project: () => import('@/views/project/ProjectManagement.vue')
  },
  
  // 组件级分割
  componentLevel: {
    charts: () => import('@/components/charts/ExpenseChart.vue'),
    reports: () => import('@/components/reports/ReportGenerator.vue')
  },
  
  // 第三方库分割
  vendorSplitting: {
    echarts: () => import('echarts'),
    xlsx: () => import('xlsx')
  }
}

// 资源优化策略
const resourceOptimization = {
  // 图片优化
  images: {
    formats: ['webp', 'jpg', 'png'],    // 支持格式
    compression: 0.8,                   // 压缩比
    lazyLoading: true,                  // 懒加载
    responsive: true                    // 响应式图片
  },
  
  // 静态资源CDN
  cdn: {
    domains: ['cdn1.example.com', 'cdn2.example.com'],
    fallback: '/static/',               // 降级地址
    cacheControl: 'max-age=31536000'    // 缓存一年
  }
}
```

---

## 🚀 部署架构设计

### Docker容器化部署
```dockerfile
# 前端Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```dockerfile
# 后端Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
USER node
CMD ["node", "src/app.js"]
```

### Docker Compose配置
```yaml
version: '3.8'
services:
  # 前端服务
  web:
    build: ./client
    ports:
      - "80:80"
    depends_on:
      - api
    environment:
      - API_URL=http://api:3000
  
  # 后端API服务
  api:
    build: ./
    ports:
      - "3000:3000"
    depends_on:
      - mongodb
      - redis
    environment:
      - NODE_ENV=production
      - MONGO_URI=mongodb://mongodb:27017/village_platform
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./uploads:/app/uploads
  
  # MongoDB数据库
  mongodb:
    image: mongo:5.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=village_platform
  
  # Redis缓存
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  mongodb_data:
  redis_data:
```

### 生产环境部署策略
```yaml
# Kubernetes部署配置
apiVersion: apps/v1
kind: Deployment
metadata:
  name: village-platform-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: village-platform-api
  template:
    metadata:
      labels:
        app: village-platform-api
    spec:
      containers:
      - name: api
        image: village-platform:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGO_URI
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: mongo-uri
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

---

## 📈 监控与运维

### 监控指标体系
```javascript
// 应用性能监控
const apmMetrics = {
  // 响应时间监控
  responseTime: {
    p50: '< 200ms',             // 50%请求响应时间
    p95: '< 500ms',             // 95%请求响应时间
    p99: '< 1000ms'             // 99%请求响应时间
  },
  
  // 错误率监控
  errorRate: {
    target: '< 1%',             // 目标错误率
    critical: '> 5%',           // 严重错误率
    alerts: ['email', 'sms']    // 告警方式
  },
  
  // 吞吐量监控
  throughput: {
    target: '1000 req/min',     // 目标吞吐量
    peak: '5000 req/min'        // 峰值吞吐量
  }
}

// 业务指标监控
const businessMetrics = {
  // 用户活跃度
  userActivity: {
    dailyActiveUsers: 'count',
    sessionDuration: 'avg',
    pageViews: 'count'
  },
  
  // 功能使用率
  featureUsage: {
    expenseCreation: 'count',
    projectApproval: 'count',
    reportGeneration: 'count'
  },
  
  // 系统稳定性
  systemStability: {
    uptime: '99.9%',
    availability: '99.5%',
    dataConsistency: '100%'
  }
}
```

### 日志管理策略
```javascript
// 日志配置
const loggingConfig = {
  // 日志级别
  levels: {
    error: 0,     // 错误日志
    warn: 1,      // 警告日志
    info: 2,      // 信息日志
    debug: 3      // 调试日志
  },
  
  // 日志格式
  format: {
    timestamp: 'ISO8601',
    level: 'string',
    message: 'string',
    meta: 'object',
    traceId: 'uuid'           // 链路追踪ID
  },
  
  // 日志输出
  transports: {
    console: {
      level: 'info',
      colorize: true
    },
    file: {
      level: 'error',
      filename: '/var/log/app/error.log',
      maxsize: '100MB',
      maxFiles: 10
    },
    elasticsearch: {
      level: 'info',
      index: 'village-platform-logs',
      type: 'log'
    }
  }
}
```

---

## 🔧 开发工具链

### 代码质量保证
```json
// ESLint配置
{
  "extends": [
    "@vue/standard",
    "@vue/typescript/recommended"
  ],
  "rules": {
    "max-len": ["error", { "code": 120 }],
    "complexity": ["error", 10],
    "max-depth": ["error", 4],
    "no-console": "warn",
    "no-debugger": "error"
  }
}

// Prettier配置
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 120
}
```

### 测试策略
```javascript
// Jest测试配置
module.exports = {
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    'src/**/*.{js,vue}',
    '!src/main.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
}

// E2E测试 (Cypress)
describe('财务管理流程', () => {
  it('应该能够创建开支记录', () => {
    cy.visit('/finance/expenses')
    cy.get('[data-cy=create-expense]').click()
    cy.get('[data-cy=expense-title]').type('办公用品采购')
    cy.get('[data-cy=expense-amount]').type('1000')
    cy.get('[data-cy=submit-btn]').click()
    cy.contains('创建成功')
  })
})
```

### CI/CD流水线
```yaml
# GitHub Actions工作流
name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run test:e2e
      
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: docker build -t village-platform .
      - run: docker push village-platform:${{ github.sha }}
      
  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - run: kubectl set image deployment/api api=village-platform:${{ github.sha }}
```

---

**📋 文档版本**: v2.0  
**📅 更新时间**: 2024年9月11日  
**👥 维护团队**: 智慧村庄平台开发组

*本架构设计文档将随着项目发展持续更新和完善*