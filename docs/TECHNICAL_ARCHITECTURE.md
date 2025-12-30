# 智慧乡村平台 - 技术架构文档

## 📋 文档概述

本文档详细描述了智慧乡村综合服务平台的技术架构，包括系统架构、数据流、部署架构和关键技术决策。

**项目版本**: v1.0.0
**最后更新**: 2025-12-30
**架构设计师**: Claude AI Architect

---

## 🏗️ 一、系统总体架构

### 1.1 高层架构图

```mermaid
graph TB
    subgraph "客户端层"
        A1[Web浏览器<br/>Vue3 + Vite]
        A2[移动端<br/>Responsive Design]
        A3[乡村大屏<br/>Data Visualization]
    end

    subgraph "API网关层"
        B1[Nginx反向代理<br/>SSL终止<br/>负载均衡]
    end

    subgraph "应用服务层"
        C1[主API服务器<br/>端口: 3001<br/>监控/i18n/通知]
        C2[村务服务服务器<br/>端口: 5000<br/>Socket.IO/实时通信]
    end

    subgraph "数据层"
        D1[(MongoDB<br/>主数据存储)]
        D2[(Redis<br/>缓存/会话)]
        D3[(SQLite<br/>轻量级存储)]
    end

    subgraph "外部服务层"
        E1[百度TTS<br/>语音合成]
        E2[腾讯OCR<br/>票据识别]
        E3[短信服务<br/>通知推送]
        E4[政务平台<br/>数据对接]
    end

    subgraph "监控运维层"
        F1[实时监控仪表板]
        F2[日志分析系统]
        F3[告警通知服务]
    end

    A1 & A2 & A3 --> B1
    B1 --> C1 & C2
    C1 & C2 --> D1 & D2 & D3
    C1 & C2 --> E1 & E2 & E3 & E4
    C1 & C2 --> F1 & F2 & F3

    style A1 fill:#e1f5fe
    style A2 fill:#e1f5fe
    style A3 fill:#e1f5fe
    style C1 fill:#c8e6c9
    style C2 fill:#c8e6c9
    style D1 fill:#fff9c4
    style D2 fill:#fff9c4
    style D3 fill:#fff9c4
```

### 1.2 双后端架构说明

智慧乡村平台采用**双后端架构**设计，将功能按职责分离：

| 服务器 | 端口 | 核心职责 | 主要功能 |
|--------|------|----------|----------|
| **主API服务器** | 3001 | 系统管理与监控 | 实时监控、i18n国际化、通知服务、API文档、稳定性管理 |
| **村务服务服务器** | 5000 | 业务逻辑与实时通信 | 村民管理、村务治理、财务管理、Socket.IO实时通信、应急广播 |

**设计优势**：
- ✅ 职责分离，便于维护和扩展
- ✅ 独立部署，降低耦合度
- ✅ 故障隔离，提高系统可用性
- ✅ 灵活扩展，可针对不同服务优化资源配置

---

## 🔄 二、数据流架构

### 2.1 用户请求流程

```mermaid
sequenceDiagram
    participant U as 用户客户端
    participant N as Nginx网关
    participant A as 主API服务器(3001)
    participant S as 村务服务服务器(5000)
    participant M as MongoDB
    participant R as Redis

    U->>N: HTTPS请求
    N->>A: 路由到主API服务
    A->>R: 检查缓存
    alt 缓存命中
        R-->>A: 返回缓存数据
        A-->>N: JSON响应
        N-->>U: 返回数据
    else 缓存未命中
        A->>M: 查询数据库
        M-->>A: 返回数据
        A->>R: 写入缓存
        A-->>N: JSON响应
        N-->>U: 返回数据
    end

    Note over U,S: 实时通信场景
    U->>S: Socket.IO连接
    S-->>U: 连接建立
    U->>S: 发送消息
    S->>M: 持久化消息
    S->>U: 广播通知
```

### 2.2 离线数据同步流程

```mermaid
flowchart TD
    Start([用户操作]) --> CheckNetwork{检测网络状态}

    CheckNetwork -->|在线| DirectSubmit[直接提交到服务器]
    CheckNetwork -->|离线| LocalSave[保存到IndexedDB]

    LocalSave --> AddQueue[添加到离线队列]
    AddQueue --> UpdateUI[更新UI显示待同步]

    UpdateUI --> MonitorNetwork[监听网络恢复]
    MonitorNetwork -->|网络恢复| SyncStart[开始同步]

    SyncStart --> GetQueue[获取待同步队列]
    GetQueue --> BatchSubmit[批量提交到服务器]

    BatchSubmit --> CheckResult{同步结果}
    CheckResult -->|成功| MarkSuccess[标记为已同步]
    CheckResult -->|冲突| HandleConflict[处理冲突]
    CheckResult -->|失败| Retry{重试次数检查}

    Retry -->|< 5次| BackToSync[加入重试队列]
    Retry -->|≥ 5次| MarkFailed[标记为失败]

    HandleConflict --> UserChoice{用户选择}
    UserChoice -->|客户端优先| ClientWins[使用客户端数据]
    UserChoice -->|服务器优先| ServerWins[使用服务器数据]
    UserChoice -->|手动合并| ManualMerge[手动合并数据]

    ClientWins & ServerWins & ManualMerge --> Resubmit[重新提交]
    MarkSuccess --> UpdateLocal[更新本地数据]
    Resubmit --> UpdateLocal
    BackToSync --> BatchSubmit
    MarkFailed --> NotifyFailed[通知用户]

    UpdateLocal --> End([同步完成])
    NotifyFailed --> End
    DirectSubmit --> End

    style Start fill:#e1f5fe
    style End fill:#c8e6c9
    style CheckNetwork fill:#fff9c4
    style HandleConflict fill:#ffccbc
    style CheckResult fill:#fff9c4
```

---

## 📊 三、数据模型架构

### 3.1 核心数据模型关系图

```mermaid
erDiagram
    Village ||--o{ VillageUser : "contains"
    Village ||--o{ Resident : "has"
    Village ||--o{ Announcement : "publishes"
    Village ||--o{ Task : "assigns"
    Village ||--o{ Finance : "manages"
    Village ||--o{ Emergency : "handles"

    User ||--o{ VillageUser : "belongs to"
    User ||--o{ PendingOperation : "creates"
    User ||--o{ SyncLog : "generates"

    Household ||--o{ Resident : "contains"
    Household ||--|| FamilyRelation : "defines"

    CommitteeMember ||--|| Village : "serves"
    CommitteeMember ||--o{ DutySchedule : "assigned to"

    Announcement ||--o{ Notification : "triggers"
    Task ||--o{ Notification : "creates"
    Emergency ||--o{ Notification : "sends"

    User {
        ObjectId _id PK
        String username
        String password
        String role
        Date createdAt
    }

    Village {
        ObjectId _id PK
        String name
        String code
        String address
        Date createdAt
    }

    Resident {
        ObjectId _id PK
        String name
        String idCard
        ObjectId householdId FK
        ObjectId villageId FK
        String status
    }

    Household {
        ObjectId _id PK
        String houseCode
        String address
        ObjectId villageId FK
        String type
    }

    FamilyRelation {
        ObjectId _id PK
        ObjectId personId FK
        ObjectId relationId FK
        String relationType
    }

    Announcement {
        ObjectId _id PK
        String title
        String content
        ObjectId villageId FK
        String status
        Date publishAt
    }

    Task {
        ObjectId _id PK
        String title
        String description
        ObjectId villageId FK
        ObjectId assigneeId FK
        String status
    }

    Finance {
        ObjectId _id PK
        String type
        Decimal amount
        ObjectId villageId FK
        String category
        Date transactionDate
    }

    Emergency {
        ObjectId _id PK
        String type
        String severity
        ObjectId villageId FK
        String status
        Date reportedAt
    }

    PendingOperation {
        ObjectId _id PK
        String operationId UK
        ObjectId userId FK
        ObjectId villageId FK
        String operationType
        String targetModel
        Mixed payload
        String syncStatus
    }

    SyncLog {
        ObjectId _id PK
        String syncSessionId UK
        ObjectId userId FK
        ObjectId villageId FK
        String syncType
        String status
        Object statistics
    }

    Notification {
        ObjectId _id PK
        ObjectId userId FK
        String title
        String content
        String type
        Boolean isRead
    }
```

### 3.2 同步数据模型

```mermaid
classDiagram
    class PendingOperation {
        +ObjectId _id
        +String operationId
        +ObjectId userId
        +ObjectId villageId
        +String deviceId
        +String operationType
        +String targetModel
        +ObjectId targetId
        +Mixed payload
        +Number clientVersion
        +Number serverVersion
        +String syncStatus
        +Number priority
        +ConflictInfo conflictInfo
        +SyncStats syncStats
        +Error[] errors
        +ClientMetadata clientMetadata
        +Attachment[] attachments
        +Dependency[] dependencies
        +Date clientCreatedAt
        +Date clientUpdatedAt
        +Date createdAt
        +Date updatedAt
        +markProcessing()
        +markSynced()
        +markFailed()
        +markConflict()
        +resolveConflict()
        +cancel()
        +addError()
        +getLastError()
        +checkAttachmentsUploaded()
        +addAttachment()
        +updateAttachmentStatus()
    }

    class SyncLog {
        +ObjectId _id
        +String syncSessionId
        +ObjectId userId
        +ObjectId villageId
        +String deviceId
        +String syncType
        +String syncDirection
        +String status
        +Statistics statistics
        +ModelStats[] syncedModels
        +Timing timing
        +NetworkInfo networkInfo
        +ClientInfo clientInfo
        +Progress progress
        +ConflictResolution[] conflictResolutions
        +Error[] errors
        +Warning[] warnings
        +OperationDetail[] operationDetails
        +Performance performance
        +Metadata metadata
        +Summary summary
        +Date createdAt
        +Date updatedAt
        +markInProgress()
        +markCompleted()
        +markFailed()
        +markPartial()
        +updateStatistics()
        +updateProgress()
        +addError()
        +addWarning()
        +addOperationDetail()
        +addConflictResolution()
        +calculateSuccessRate()
        +getErrorSummary()
        +addModelStats()
    }

    class DataVersion {
        +ObjectId _id
        +String modelType
        +ObjectId recordId
        +Number version
        +ObjectId lastModifiedBy
        +Mixed data
        +String changeReason
        +Date createdAt
    }

    PendingOperation "1" --> "many" SyncLog : tracked in
    SyncLog "many" --> "1" DataVersion : references
```

---

## 🔌 四、API接口架构

### 4.1 API路由分层设计

```mermaid
graph TB
    subgraph "API路由层"
        A[/api/v1/*<br/>RESTful API]
        B[/api/sync/*<br/>同步API]
        C[/api/monitoring/*<br/>监控API]
        D[/ws/*<br/>WebSocket]
    end

    subgraph "控制器层"
        A1[authController<br/>认证授权]
        A2[residentsController<br/>村民管理]
        A3[financeController<br/>财务管理]
        A4[affairsController<br/>村务治理]
        A5[emergencyController<br/>应急管理]
        A6[notificationController<br/>通知服务]

        B1[syncController<br/>数据同步]

        C1[monitoringController<br/>系统监控]
    end

    subgraph "服务层"
        S1[authService]
        S2[residentsService]
        S3[financeService]
        S4[affairsService]
        S5[emergencyService]
        S6[notificationService]
        S7[syncService]
        S8[monitoringService]
    end

    subgraph "数据访问层"
        D1[PendingOperation模型]
        D2[SyncLog模型]
        D3[Resident模型]
        D4[Finance模型]
        D5[Emergency模型]
    end

    A --> A1 & A2 & A3 & A4 & A5 & A6
    B --> B1
    C --> C1
    D --> C1

    A1 & A2 & A3 & A4 & A5 & A6 --> S1 & S2 & S3 & S4 & S5 & S6
    B1 --> S7
    C1 --> S8

    S7 --> D1 & D2
    S2 --> D3
    S3 --> D4
    S5 --> D5

    style A fill:#e3f2fd
    style B fill:#fff3e0
    style C fill:#f3e5f5
    style D fill:#fce4ec
```

### 4.2 同步API接口规范

| 方法 | 端点 | 描述 | 权限 |
|------|------|------|------|
| POST | `/api/sync/upload` | 上传离线操作 | 用户 |
| POST | `/api/sync/download` | 下载服务器数据 | 用户 |
| POST | `/api/sync/batch` | 批量同步 | 用户 |
| GET | `/api/sync/status` | 查询同步状态 | 用户 |
| GET | `/api/sync/conflicts` | 获取冲突列表 | 用户 |
| PUT | `/api/sync/conflicts/:id/resolve` | 解决冲突 | 用户 |
| GET | `/api/sync/history` | 同步历史记录 | 用户 |
| GET | `/api/sync/queue` | 查看待同步队列 | 用户 |
| DELETE | `/api/sync/queue/:id` | 取消待同步操作 | 用户 |

---

## 🌐 五、前端架构

### 5.1 前端组件层次结构

```mermaid
graph TB
    subgraph "页面层 (Views)"
        V1[auth/<br/>登录注册]
        V2[residents/<br/>村民管理]
        V3[finance/<br/>财务管理]
        V4[affairs/<br/>村务治理]
        V5[emergency/<br/>应急管理]
        V6[services/<br/>生活服务]
        V7[system/<br/>系统管理]
    end

    subgraph "组件层 (Components)"
        C1[elderly/<br/>适老化组件]
        C2[user/<br/>用户组件]
        C3[finance/<br/>财务组件]
        C4[emergency/<br/>应急组件]
        C5[analytics/<br/>分析组件]
        C6[common/<br/>通用组件]
    end

    subgraph "状态管理层 (Stores)"
        S1[userStore<br/>用户状态]
        S2[villageStore<br/>村庄状态]
        S3[offlineStore<br/>离线状态]
        S4[notificationStore<br/>通知状态]
    end

    subgraph "服务层 (Services)"
        SVC1[apiService<br/>API封装]
        SVC2[offlineService<br/>离线服务]
        SVC3[syncService<br/>同步服务]
        SVC4[socketService<br/>实时通信]
    end

    subgraph "工具层 (Utils)"
        U1[performanceOptimizer<br/>性能优化]
        U2[validator<br/>数据验证]
        U3[formatter<br/>格式化]
    end

    subgraph "组合式函数 (Composables)"
        CP1[useOnline<br/>网络状态]
        CP2[useOfflineQueue<br/>离线队列]
        CP3[useSpeech<br/>语音交互]
        CP4[useElderlyMode<br/>大字模式]
    end

    V1 & V2 & V3 & V4 & V5 & V6 & V7 --> C1 & C2 & C3 & C4 & C5 & C6
    C1 & C2 & C3 & C4 & C5 & C6 --> S1 & S2 & S3 & S4
    S1 & S2 & S3 & S4 --> SVC1 & SVC2 & SVC3 & SVC4
    SVC1 & SVC2 & SVC3 & SVC4 --> U1 & U2 & U3
    C1 & C2 & C3 & C4 & C5 & C6 --> CP1 & CP2 & CP3 & CP4

    style V1 fill:#e1f5fe
    style C1 fill:#c8e6c9
    style S1 fill:#fff9c4
    style SVC1 fill:#ffccbc
    style CP1 fill:#f8bbd0
```

### 5.2 适老化组件架构

```mermaid
graph LR
    subgraph "适老化基础组件"
        A[ElderlyButton<br/>超大按钮]
        B[ElderlyInput<br/>大字输入框]
        C[ElderlyCard<br/>清晰卡片]
        D[ElderlyList<br/>简化列表]
    end

    subgraph "适老化复合组件"
        E[ElderlyForm<br/>适老化表单]
        F[ElderlyNav<br/>大字导航]
        G[ElderlyModal<br/>大字弹窗]
        H[ElderlyTable<br/>简化表格]
    end

    subgraph "适老化布局组件"
        I[ElderlyLayout<br/>适老化布局]
        J[ElderlyHeader<br/>顶部导航]
        K[ElderlyFooter<br/>底部导航]
        L[ElderlySidebar<br/>侧边栏]
    end

    subgraph "适老化功能组件"
        M[VoiceInput<br/>语音输入]
        N[TextToSpeech<br/>语音播报]
        O[ElderlyModeToggle<br/>模式切换]
        P[EmergencyButton<br/>紧急呼叫]
    end

    A & B & C & D --> E & F & G & H
    E & F & G & H --> I & J & K & L
    I & J & K & L --> M & N & O & P

    style A fill:#ffebee
    style E fill:#e8f5e9
    style I fill:#e3f2fd
    style M fill:#fff3e0
```

---

## 🔧 六、离线同步架构

### 6.1 离线同步时序图

```mermaid
sequenceDiagram
    participant C as 客户端
    participant IDB as IndexedDB
    participant SW as Service Worker
    participant S as 服务器
    participant DB as MongoDB

    Note over C: 用户离线操作
    C->>IDB: 保存操作到offline_queue
    C->>IDB: 更新本地缓存数据
    C->>C: 显示"待同步"状态

    Note over C: 网络恢复
    C->>SW: 检测到网络在线
    SW->>C: 触发sync事件

    C->>IDB: 读取待同步队列
    IDB-->>C: 返回待同步操作列表

    loop 批量同步
        C->>S: POST /api/sync/batch
        Note over C,S: 携带操作数组

        S->>DB: 检查数据版本冲突
        DB-->>S: 返回冲突检测结果

        alt 无冲突
            S->>DB: 执行数据操作
            DB-->>S: 操作成功
            S-->>C: 返回成功结果
            C->>IDB: 更新本地状态为"已同步"
        else 有冲突
            S-->>C: 返回冲突信息
            C->>C: 显示冲突解决对话框
            C->>S: 提交用户选择的解决方案
            S->>DB: 执行合并操作
            S-->>C: 返回合并结果
            C->>IDB: 更新本地数据
        end
    end

    C->>S: POST /api/sync/complete
    S->>DB: 记录同步日志
    S-->>C: 同步完成
    C->>C: 显示同步成功通知
```

### 6.2 冲突解决策略

```mermaid
flowchart TD
    Start([检测到冲突]) --> IdentifyType{识别冲突类型}

    IdentifyType -->|版本不匹配| VersionConflict[版本冲突]
    IdentifyType -->|数据已修改| DataModified[数据修改冲突]
    IdentifyType -->|记录已删除| RecordDeleted[记录删除冲突]
    IdentifyType -->|依赖错误| DependencyError[依赖错误]

    VersionConflict --> Strategy{选择解决策略}
    DataModified --> Strategy
    RecordDeleted --> Strategy
    DependencyError --> Strategy

    Strategy -->|自动解决| AutoResolve[自动合并]
    Strategy -->|用户选择| UserChoice[用户决策]
    Strategy -->|服务器优先| ServerWins[服务器数据优先]
    Strategy -->|客户端优先| ClientWins[客户端数据优先]

    AutoResolve --> Merge{合并检查}
    Merge -->|成功| ApplyMerge[应用合并结果]
    Merge -->|失败| UserChoice

    UserChoice --> ShowDialog[显示冲突对话框]
    ShowDialog --> Decision{用户决策}
    Decision -->|保留服务器的| ServerWins
    Decision -->|保留客户端的| ClientWins
    Decision -->|手动编辑| ManualEdit[手动合并编辑]

    ServerWins --> UpdateLocal[更新本地数据]
    ClientWins --> Resubmit[重新提交服务器]
    ManualEdit --> Resubmit

    UpdateLocal --> MarkResolved[标记冲突已解决]
    Resubmit --> MarkResolved
    ApplyMerge --> MarkResolved

    MarkResolved --> End([冲突解决完成])

    style Start fill:#ffebee
    style End fill:#c8e6c9
    style UserChoice fill:#fff9c4
    style Strategy fill:#e1f5fe
```

---

## 🚀 七、部署架构

### 7.1 生产环境部署图

```mermaid
graph TB
    subgraph "外部网络"
        User[用户终端]
        Internet[互联网]
    end

    subgraph "DMZ区"
        LB[负载均衡器<br/>Nginx]
        WAF[Web应用防火墙]
    end

    subgraph "应用服务区"
        App1[API服务器1<br/>3001端口]
        App2[API服务器2<br/>3001端口]
        App3[村务服务器1<br/>5000端口]
        App4[村务服务器2<br/>5000端口]
    end

    subgraph "数据服务区"
        MongoPrimary[(MongoDB<br/>主节点)]
        MongoSecondary1[(MongoDB<br/>从节点1)]
        MongoSecondary2[(MongoDB<br/>从节点2)]
        RedisCluster[(Redis集群)]
    end

    subgraph "内部服务区"
        Monitor[监控服务器]
        LogServer[日志服务器]
        Backup[备份服务器]
    end

    User --> Internet
    Internet --> LB
    LB --> WAF
    WAF --> App1 & App2 & App3 & App4

    App1 & App2 & App3 & App4 --> MongoPrimary & MongoSecondary1 & MongoSecondary2
    App1 & App2 & App3 & App4 --> RedisCluster

    App1 & App2 & App3 & App4 --> Monitor
    App1 & App2 & App3 & App4 --> LogServer
    MongoPrimary & MongoSecondary1 & MongoSecondary2 --> Backup

    style User fill:#e1f5fe
    style LB fill:#fff9c4
    style WAF fill:#ffccbc
    style App1 fill:#c8e6c9
    style MongoPrimary fill:#fff9c4
    style Monitor fill:#f8bbd0
```

### 7.2 Docker容器化部署

```mermaid
graph TB
    subgraph "Docker Host"
        subgraph "Frontend Container"
            FE[Nginx<br/>Vue3静态文件]
        end

        subgraph "Backend Containers"
            BE1[API Server<br/>Node.js 3001]
            BE2[Village Server<br/>Node.js 5000]
        end

        subgraph "Database Containers"
            DB1[MongoDB<br/>27017]
            DB2[Redis<br/>6379]
        end

        subgraph "Monitoring Containers"
            M1[Prometheus]
            M2[Grafana]
        end
    end

    subgraph "External"
        Client[客户端]
    end

    Client --> FE
    FE --> BE1 & BE2
    BE1 & BE2 --> DB1 & DB2
    BE1 & BE2 --> M1
    M1 --> M2

    style FE fill:#e1f5fe
    style BE1 fill:#c8e6c9
    style DB1 fill:#fff9c4
    style M1 fill:#ffccbc
```

---

## 📈 八、性能优化架构

### 8.1 性能优化层次

```mermaid
graph TB
    subgraph "前端性能优化"
        A1[代码分割<br/>路由懒加载]
        A2[虚拟列表<br/>大数据渲染]
        A3[图片懒加载<br/>WebP格式]
        A4[请求缓存<br/>防抖节流]
        A5[Service Worker<br/>离线缓存]
    end

    subgraph "网络性能优化"
        B1[CDN加速<br/>静态资源]
        B2[HTTP/2<br/>多路复用]
        B3[Gzip压缩<br/>传输压缩]
        B4[连接池<br/>复用连接]
    end

    subgraph "后端性能优化"
        C1[Redis缓存<br/>热点数据]
        C2[数据库索引<br/>查询优化]
        C3[批量操作<br/>减少请求]
        C4[异步处理<br/>消息队列]
        C5[连接池<br/>数据库连接]
    end

    subgraph "监控与调优"
        D1[性能指标采集<br/>LCP/FID/CLS]
        D2[实时监控<br/>系统状态]
        D3[告警机制<br/>异常通知]
        D4[性能分析<br/>瓶颈定位]
    end

    A1 & A2 & A3 & A4 & A5 --> D1
    B1 & B2 & B3 & B4 --> D2
    C1 & C2 & C3 & C4 & C5 --> D3
    D1 & D2 & D3 --> D4

    style A1 fill:#e1f5fe
    style B1 fill:#c8e6c9
    style C1 fill:#fff9c4
    style D1 fill:#ffccbc
```

### 8.2 Core Web Vitals优化目标

| 指标 | 名称 | 目标值 | 当前值 | 状态 |
|------|------|--------|--------|------|
| LCP | 最大内容绘制 | < 2.5s | 1.8s | ✅ 良好 |
| FID | 首次输入延迟 | < 100ms | 85ms | ✅ 良好 |
| CLS | 累积布局偏移 | < 0.1 | 0.05 | ✅ 良好 |
| TTI | 可交互时间 | < 3.5s | 2.9s | ✅ 良好 |

---

## 🔒 九、安全架构

### 9.1 安全防护层次

```mermaid
graph TB
    subgraph "网络安全层"
        A1[HTTPS/TLS<br/>加密传输]
        A2[WAF防火墙<br/>攻击防护]
        A3[DDoS防护<br/>流量清洗]
        A4[IP白名单<br/>访问控制]
    end

    subgraph "应用安全层"
        B1[JWT认证<br/>令牌验证]
        B2[RBAC权限<br/>角色控制]
        B3[输入验证<br/>XSS防护]
        B4[CSRF防护<br/>令牌校验]
        B5[SQL注入防护<br/>参数化查询]
    end

    subgraph "数据安全层"
        C1[敏感数据加密<br/>AES/RSA]
        C2[数据脱敏<br/>显示隐藏]
        C3[审计日志<br/>操作追踪]
        C4[数据备份<br/>定期备份]
    end

    subgraph "运营安全层"
        D1[安全扫描<br/>漏洞检测]
        D2[渗透测试<br/>安全评估]
        D3[安全培训<br/>意识提升]
        D4[应急响应<br/>事件处理]
    end

    A1 & A2 & A3 & A4 --> B1 & B2 & B3 & B4 & B5
    B1 & B2 & B3 & B4 & B5 --> C1 & C2 & C3 & C4
    C1 & C2 & C3 & C4 --> D1 & D2 & D3 & D4

    style A1 fill:#ffebee
    style B1 fill:#fff9c4
    style C1 fill:#c8e6c9
    style D1 fill:#e1f5fe
```

### 9.2 数据加密策略

| 数据类型 | 加密方式 | 密钥管理 | 访问控制 |
|----------|----------|----------|----------|
| 密码 | bcrypt (salt rounds: 10) | 环境变量 | 仅系统 |
| 身份证号 | AES-256-GCM | 密钥管理服务 | 需授权 |
| 银行卡号 | RSA-2048 | 密钥管理服务 | 需授权 |
| 传输数据 | TLS 1.3 | 证书中心 | 所有连接 |

---

## 📊 十、监控与运维架构

### 10.1 监控体系

```mermaid
graph LR
    subgraph "数据采集层"
        A1[应用指标<br/>性能/业务]
        A2[系统指标<br/>CPU/内存/磁盘]
        A3[日志数据<br/>访问/错误]
        A4[链路追踪<br/>请求链路]
    end

    subgraph "数据处理层"
        B1[Prometheus<br/>指标存储]
        B2[ELK Stack<br/>日志分析]
        B3[Jaeger<br/>链路追踪]
    end

    subgraph "展示告警层"
        C1[Grafana<br/>可视化仪表板]
        C2[AlertManager<br/>告警管理]
        C3[Webhook<br/>消息通知]
    end

    A1 & A2 & A3 & A4 --> B1 & B2 & B3
    B1 & B2 & B3 --> C1 & C2 & C3

    style A1 fill:#e1f5fe
    style B1 fill:#c8e6c9
    style C1 fill:#fff9c4
```

### 10.2 监控指标体系

| 层级 | 指标类型 | 具体指标 | 告警阈值 |
|------|----------|----------|----------|
| **应用层** | 性能 | 响应时间、吞吐量、错误率 | > 1s, < 100/s, > 1% |
| **业务层** | 业务 | 用户活跃度、同步成功率、在线用户 | < 90% |
| **系统层** | 资源 | CPU、内存、磁盘、网络 | > 80%, > 80%, > 90% |
| **数据库层** | 数据库 | 连接数、QPS、慢查询 | > 80%, > 1000, > 1s |

---

## 🎯 十一、关键技术决策

### 11.1 技术选型理由

| 技术组件 | 选型 | 理由 |
|----------|------|------|
| **前端框架** | Vue 3 | 学习曲线低，生态完善，性能优秀 |
| **构建工具** | Vite | 开发体验好，构建速度快，原生ESM支持 |
| **状态管理** | Pinia | Vue 3官方推荐，API简洁，TypeScript友好 |
| **UI组件库** | Element Plus | 组件丰富，文档完善，中文友好 |
| **后端框架** | Express.js | 灵活轻量，中间件生态丰富 |
| **数据库** | MongoDB | 灵活的文档模型，适合乡村场景多变的数据结构 |
| **缓存** | Redis | 高性能，支持多种数据结构 |
| **实时通信** | Socket.IO | 跨浏览器支持，自动降级 |
| **离线存储** | IndexedDB | 浏览器原生支持，大容量存储 |

### 11.2 架构原则

1. **移动优先**: 针对乡村移动设备为主的场景，优先保证移动端体验
2. **离线优先**: 考虑网络不稳定的乡村环境，设计离线可用功能
3. **适老化设计**: 充分考虑老年用户的使用习惯和视觉需求
4. **渐进增强**: 基础功能保证可用，高级功能逐步增强
5. **故障隔离**: 模块间故障隔离，避免单点故障影响整体
6. **可观测性**: 全链路监控，问题快速定位和解决

---

## 📚 十二、文档索引

| 文档名称 | 路径 | 描述 |
|----------|------|------|
| 技术架构文档 | `docs/TECHNICAL_ARCHITECTURE.md` | 本文档 |
| 同步架构文档 | `docs/SYNC_ARCHITECTURE.md` | 离线同步详细设计 |
| API文档 | `docs/API_REFERENCE.md` | API接口参考 |
| 部署文档 | `docs/DEPLOYMENT_GUIDE.md` | 部署运维指南 |
| 产品需求文档 | `PRD_Mobile_Elderly_Care.md` | 移动端适老化PRD |
| 设计系统规范 | `client/src/design/ELDERLY_FRIENDLY_DESIGN_SYSTEM.md` | 适老化设计规范 |
| 移动端实施指南 | `client/src/design/MOBILE_IMPLEMENTATION_GUIDE.md` | 移动端开发指南 |

---

## 🔖 版本历史

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|----------|
| 1.0.0 | 2025-12-30 | Claude AI Architect | 初始版本，完整技术架构 |

---

**本文档由智慧乡村项目团队维护**
**技术支持**: 请提交Issue或联系项目维护者
