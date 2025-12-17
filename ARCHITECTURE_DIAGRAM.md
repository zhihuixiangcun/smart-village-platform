# 智慧乡村系统架构图

## 系统整体架构

```mermaid
graph TB
    subgraph "用户层"
        A[Web前端<br/>Vue3+Vite<br/>端口:3000]
        B[微信小程序<br/>智慧乡村服务]
        C[移动APP<br/>React Native]
        D[管理后台<br/>Element Plus]
    end

    subgraph "API网关层"
        E[Nginx反向代理<br/>负载均衡]
        F[API网关<br/>路由/认证/限流]
    end

    subgraph "应用服务层"
        G[主服务器<br/>Express.js<br/>端口:3001<br/>监控/国际化/通知]
        H[村务服务器<br/>Express.js<br/>端口:5000<br/>核心业务/Socket.IO]
        I[文件服务器<br/>MinIO/AWS S3]
    end

    subgraph "数据层"
        J[(MongoDB<br/>主数据库)]
        K[(Redis<br/>缓存/会话)]
        L[Elasticsearch<br/>全文搜索]
    end

    subgraph "外部服务"
        M[短信服务<br/>阿里云SMS]
        N[语音服务<br/>百度TTS]
        O[OCR服务<br/>腾讯云OCR]
        P[支付服务<br/>微信支付]
        Q[政务平台<br/>省政务API]
    end

    A --> E
    B --> E
    C --> E
    D --> E

    E --> F
    F --> G
    F --> H
    F --> I

    G --> J
    G --> K
    G --> L
    H --> J
    H --> K
    H --> L

    G --> M
    G --> N
    H --> O
    H --> P
    H --> Q
```

## 核心模块架构

### 1. 村委管理模块

```mermaid
graph LR
    subgraph "村委管理"
        A[人员管理] --> D[(村委数据库)]
        B[值班调度] --> D
        C[党员管理] --> D
        E[权限控制] --> A
        E --> B
        E --> C
        F[审批流程] --> G[工作流引擎]
        G --> D
    end

    subgraph "数据模型"
        D --> H[CommitteeMember]
        D --> I[DutySchedule]
        D --> J[PartyMember]
        D --> K[ApprovalFlow]
    end
```

### 2. 村民管理模块

```mermaid
graph LR
    subgraph "村民管理"
        A[档案管理] --> F[(村民数据库)]
        B[一户一码] --> F
        C[人脸识别] --> F
        D[家庭关系] --> F
        E[在线办事] --> G[业务流程]
    end

    subgraph "安全措施"
        H[AES加密] --> F
        I[权限隔离] --> F
        J[审计日志] --> F
    end
```

### 3. 村务治理模块

```mermaid
graph TB
    subgraph "财务管理"
        A[收支记录] --> D[(财务数据库)]
        B[预算管理] --> D
        C[报表生成] --> D
        E[OCR识别] --> A
    end

    subgraph "项目管理"
        F[项目申报] --> G[(项目数据库)]
        H[进度跟踪] --> G
        I[风险管理] --> G
    end

    subgraph "积分系统"
        J[积分计算] --> K[(积分数据库)]
        L[积分兑换] --> K
        M[排行榜] --> K
    end
```

### 4. 信息公示模块

```mermaid
graph LR
    subgraph "信息发布"
        A[公告管理] --> E[(公告数据库)]
        B[政策管理] --> E
        C[紧急通知] --> E
    end

    subgraph "特色功能"
        F[离线缓存] --> G[PWA Service Worker]
        H[方言播报] --> I[TTS引擎]
        J[政策计算器] --> K[计算引擎]
    end
```

## 数据流架构

```mermaid
sequenceDiagram
    participant U as 用户
    participant W as Web前端
    participant G as API网关
    participant S as 应用服务
    participant D as 数据库
    participant C as 缓存
    participant T as 第三方服务

    U->>W: 发起请求
    W->>G: HTTP请求
    G->>S: 路由转发
    S->>C: 查询缓存

    alt 缓存命中
        C-->>S: 返回数据
    else 缓存未命中
        S->>D: 查询数据库
        D-->>S: 返回数据
        S->>C: 更新缓存
    end

    S->>T: 调用外部服务(如需要)
    T-->>S: 返回结果
    S-->>G: 处理结果
    G-->>W: HTTP响应
    W-->>U: 展示结果
```

## 安全架构

```mermaid
graph TB
    subgraph "安全防护体系"
        A[WAF防火墙] --> B[API网关]
        B --> C[认证服务]
        C --> D[授权服务]
        D --> E[业务服务]
    end

    subgraph "数据安全"
        F[传输加密<br/>TLS/SSL] --> G[存储加密<br/>AES-256]
        G --> H[敏感数据脱敏]
        H --> I[访问控制]
    end

    subgraph "审计监控"
        J[操作日志] --> K[安全审计]
        K --> L[异常检测]
        L --> M[告警系统]
    end
```

## 部署架构

```mermaid
graph TB
    subgraph "生产环境"
        subgraph "负载均衡层"
            LB[Nginx集群]
        end

        subgraph "应用层"
            APP1[应用服务器1]
            APP2[应用服务器2]
            APP3[应用服务器3]
        end

        subgraph "数据层"
            DB_MASTER[(MongoDB主库)]
            DB_SLAVE[(MongoDB从库)]
            REDIS_MASTER[(Redis主节点)]
            REDIS_SLAVE[(Redis从节点)]
        end
    end

    subgraph "监控体系"
        PROM[Prometheus]
        GRAF[Grafana]
        ALERT[AlertManager]
    end

    LB --> APP1
    LB --> APP2
    LB --> APP3

    APP1 --> DB_MASTER
    APP2 --> DB_MASTER
    APP3 --> DB_MASTER

    DB_MASTER --> DB_SLAVE

    APP1 --> REDIS_MASTER
    APP2 --> REDIS_MASTER
    APP3 --> REDIS_MASTER

    REDIS_MASTER --> REDIS_SLAVE

    PROM --> APP1
    PROM --> APP2
    PROM --> APP3
    PROM --> DB_MASTER
    PROM --> REDIS_MASTER

    GRAF --> PROM
    ALERT --> PROM
```

## 技术栈选择

### 前端技术栈
- **框架**: Vue 3 + Composition API
- **构建工具**: Vite
- **UI组件库**: Element Plus
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **HTTP客户端**: Axios
- **样式**: Tailwind CSS
- **移动端**: UniApp (微信小程序)

### 后端技术栈
- **运行时**: Node.js 18+
- **框架**: Express.js
- **数据库**: MongoDB 6.0+
- **缓存**: Redis 7.0+
- **搜索**: Elasticsearch 8.0+
- **认证**: JWT + Passport.js
- **实时通信**: Socket.IO
- **文件存储**: MinIO/AWS S3
- **任务队列**: Bull Queue

### 开发工具
- **语言**: JavaScript/TypeScript
- **包管理**: npm/yarn
- **代码规范**: ESLint + Prettier
- **测试框架**: Jest + Supertest
- **API文档**: Swagger/OpenAPI
- **版本控制**: Git
- **CI/CD**: GitHub Actions
- **容器化**: Docker + Docker Compose
- **监控**: Prometheus + Grafana

---

**创建日期**: 2025-12-15
**版本**: v1.0
**维护者**: 开发团队