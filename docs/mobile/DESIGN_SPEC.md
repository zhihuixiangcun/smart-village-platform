# 智慧乡村移动端（村民版）详细设计规范

| 文档版本 | V1.0 |
|----------|------|
| 创建日期 | 2025-12-30 |
| 产品名称 | 智慧乡村移动端-村民版 |
| 目标平台 | Uni-app（微信小程序 + APP + H5） |
| 文档状态 | 详细设计 |

---

## 目录

1. [系统架构详细设计](#一系统架构详细设计)
2. [前端详细设计](#二前端详细设计)
3. [后端接口设计](#三后端接口设计)
4. [适老化功能详细设计](#四适老化功能详细设计)
5. [安全与性能](#五安全与性能)
6. [部署方案](#六部署方案)

---

## 一、系统架构详细设计

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                         客户端层 (Client Layer)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ 微信小程序    │  │  APP (iOS)   │  │   H5 网页    │              │
│  │  (主要平台)   │  │  APP (Android)│  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│           │                 │                 │                     │
│           └─────────────────┼─────────────────┘                     │
│                             ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                 Uni-app 框架层                              │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │    │
│  │  │  Vue 3   │  │  Pinia   │  │ uView UI │  │ Vite 构建 │  │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │    │
│  │                                                              │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │              适老化/离线/语音系统                      │  │    │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │  │    │
│  │  │  │ 三种字体  │  │ 离线同步  │  │ 语音交互  │          │  │    │
│  │  │  │   模式    │  │   系统    │  │   系统    │          │  │    │
│  │  │  └──────────┘  └──────────┘  └──────────┘          │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────────┐
│                         网络层 (Network Layer)                        │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    HTTP/HTTPS 通信                           │    │
│  │            RESTful API + WebSocket (Socket.IO)              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────────┐
│                      服务端层 (Server Layer)                          │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                后端服务 (现有服务集成)                        │    │
│  │  ┌──────────────────┐    ┌──────────────────┐              │    │
│  │  │  主 API 服务      │    │  村务服务         │              │    │
│  │  │  (Port 3001)      │    │  (Port 5000)      │              │    │
│  │  │                   │    │                   │              │    │
│  │  │  - 监控系统        │    │  - 村务管理       │              │    │
│  │  │  - i18n           │    │  - Socket.IO      │              │    │
│  │  │  - 通知服务        │    │  - 文件上传       │              │    │
│  │  │  - 稳定性管理      │    │  - 应急广播       │              │    │
│  │  └──────────────────┘    └──────────────────┘              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────────┐
│                      数据层 (Data Layer)                               │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐     │
│  │    MongoDB       │  │   本地存储       │  │  第三方服务  │     │
│  │  (主数据库)       │  │  (离线缓存)       │  │              │     │
│  │                  │  │  - Uni.Storage   │  │  - 人脸识别  │     │
│  │  - 用户数据       │  │  - SQLite        │  │  - 语音识别  │     │
│  │  - 村务数据       │  │  - IndexedDB     │  │  - OCR识别   │     │
│  │  - 财务数据       │  │                  │  │  - 短信服务  │     │
│  └──────────────────┘  └──────────────────┘  └──────────────┘     │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### 1.2 技术栈详细说明

#### 前端技术栈

| 技术/框架 | 版本 | 用途 | 说明 |
|-----------|------|------|------|
| **Uni-app** | 3.0+ | 跨平台框架 | 一次开发，多端部署 |
| **Vue.js** | 3.3+ | 前端框架 | 使用 Composition API |
| **Pinia** | 2.1+ | 状态管理 | Vue 官方推荐状态管理库 |
| **uView UI** | 2.0+ | UI 组件库 | Uni-app 专用组件库 |
| **Vite** | 5.0+ | 构建工具 | 快速开发和热更新 |
| **TypeScript** | 5.0+ | 类型系统 | 可选，用于类型安全 |
| **Luch-Request** | 3.1+ | HTTP 请求 | 基于 Promise 的请求库 |

#### 第三方 SDK 集成

| 服务类型 | 提供商 | SDK | 用途 |
|----------|--------|-----|------|
| 人脸识别 | 腾讯云/阿里云 | 腾讯云人脸核身 SDK | 身份认证、活体检测 |
| 语音识别 | 科大讯飞/百度 | 讯飞语音 SDK | 方言识别、语音转文字 |
| 语音合成 | 科大讯飞 | 讯飞语音合成 | 文字转语音播报 |
| OCR 识别 | 腾讯云 | 腾讯云 OCR SDK | 发票、证件识别 |
| 地图服务 | 高德地图 | 高德地图 SDK | 位置服务、导航 |
| 支付服务 | 微信/支付宝 | 微信支付 SDK | 在线支付 |

### 1.3 数据流设计

```
┌─────────────────────────────────────────────────────────────────┐
│                        数据流向图                                │
└─────────────────────────────────────────────────────────────────┘

用户操作
    │
    ▼
┌─────────────────┐
│   Vue 组件层    │
│  (UI 组件)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Composable 层  │  ← useUser, useElderly, useOffline, useVoice
│  (组合式函数)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Pinia Store   │  ← user, village, offline, elderly, voice
│   (状态管理层)   │
└────────┬────────┘
         │
         ├──────────────┬──────────────┬──────────────┐
         ▼              ▼              ▼              ▼
    ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐
    │API请求 │    │本地存储 │    │语音服务│    │离线队列│
    └───┬────┘    └────────┘    └────────┘    └────────┘
        │
        ▼
    ┌────────┐
    │  网络  │
    └───┬────┘
        │
        ▼
┌─────────────────┐
│   后端 API      │
│  (3001/5000)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    MongoDB      │
│   (数据库)      │
└─────────────────┘
```

### 1.4 状态管理方案

#### Pinia Store 架构

```
stores/
├── index.js              # Store 入口，统一导出
├── user.js               # 用户状态 (登录、个人信息、权限)
├── village.js            # 村务状态 (公告、投票、会议、财务)
├── offline.js            # 离线状态 (网络状态、同步队列)
├── elderly.js            # 适老化配置 (字体模式、语音设置)
├── voice.js              # 语音状态 (识别历史、播报设置)
└── notification.js       # 通知状态 (消息列表、未读数)
```

#### 状态持久化策略

| Store | 持久化方式 | 存储位置 | 过期时间 |
|-------|-----------|----------|----------|
| user | 全量持久化 | Uni.Storage | 永久 |
| elderly | 配置持久化 | Uni.Storage | 永久 |
| offline | 队列持久化 | SQLite | 永久 |
| village | 部分缓存 | Uni.Storage | 1天 |
| voice | 历史持久化 | Uni.Storage | 7天 |

---

## 二、前端详细设计

### 2.1 页面路由设计

#### 完整路由表

```javascript
// pages.json 完整配置
{
  "pages": [
    // ========== 认证模块 ==========
    {
      "path": "pages/auth/splash",
      "style": {
        "navigationBarTitleText": "智慧乡村",
        "navigationStyle": "custom",
        "enablePullDownRefresh": false
      }
    },
    {
      "path": "pages/auth/login",
      "style": {
        "navigationBarTitleText": "登录",
        "navigationStyle": "custom"
      }
    },
    {
      "path": "pages/auth/register",
      "style": {
        "navigationBarTitleText": "注册"
      }
    },
    {
      "path": "pages/auth/face-login",
      "style": {
        "navigationBarTitleText": "人脸识别登录"
      }
    },

    // ========== 首页模块 ==========
    {
      "path": "pages/index/index",
      "style": {
        "navigationBarTitleText": "智慧乡村",
        "navigationStyle": "custom",
        "enablePullDownRefresh": true
      }
    },

    // ========== 村务治理模块 ==========
    {
      "path": "pages/village/announcements",
      "style": {
        "navigationBarTitleText": "村务公告",
        "enablePullDownRefresh": true
      }
    },
    {
      "path": "pages/village/announcement-detail",
      "style": {
        "navigationBarTitleText": "公告详情"
      }
    },
    {
      "path": "pages/village/meetings",
      "style": {
        "navigationBarTitleText": "会议通知",
        "enablePullDownRefresh": true
      }
    },
    {
      "path": "pages/village/meeting-detail",
      "style": {
        "navigationBarTitleText": "会议详情"
      }
    },
    {
      "path": "pages/village/voting",
      "style": {
        "navigationBarTitleText": "在线投票",
        "enablePullDownRefresh": true
      }
    },
    {
      "path": "pages/village/voting-detail",
      "style": {
        "navigationBarTitleText": "投票详情"
      }
    },
    {
      "path": "pages/village/finance",
      "style": {
        "navigationBarTitleText": "财务公开",
        "enablePullDownRefresh": true
      }
    },
    {
      "path": "pages/village/finance-detail",
      "style": {
        "navigationBarTitleText": "财务明细"
      }
    },
    {
      "path": "pages/village/discussion",
      "style": {
        "navigationBarTitleText": "村民议事",
        "enablePullDownRefresh": true
      }
    },
    {
      "path": "pages/village/discussion-detail",
      "style": {
        "navigationBarTitleText": "议事详情"
      }
    },

    // ========== 村民服务模块 ==========
    {
      "path": "pages/services/household-qrcode",
      "style": {
        "navigationBarTitleText": "一户一码"
      }
    },
    {
      "path": "pages/services/applications",
      "style": {
        "navigationBarTitleText": "在线办事",
        "enablePullDownRefresh": true
      }
    },
    {
      "path": "pages/services/application-form",
      "style": {
        "navigationBarTitleText": "办事申请"
      }
    },
    {
      "path": "pages/services/application-detail",
      "style": {
        "navigationBarTitleText": "申请详情"
      }
    },
    {
      "path": "pages/services/documents",
      "style": {
        "navigationBarTitleText": "证件管理",
        "enablePullDownRefresh": true
      }
    },
    {
      "path": "pages/services/benefits",
      "style": {
        "navigationBarTitleText": "福利申请",
        "enablePullDownRefresh": true
      }
    },
    {
      "path": "pages/services/benefit-calculator",
      "style": {
        "navigationBarTitleText": "政策计算器"
      }
    },
    {
      "path": "pages/services/proxy",
      "style": {
        "navigationBarTitleText": "亲属代理"
      }
    },
    {
      "path": "pages/services/voice-assistant",
      "style": {
        "navigationBarTitleText": "语音助手",
        "navigationStyle": "custom"
      }
    },

    // ========== 生活服务模块 ==========
    {
      "path": "pages/life/ecommerce",
      "style": {
        "navigationBarTitleText": "乡村电商",
        "enablePullDownRefresh": true
      }
    },
    {
      "path": "pages/life/product-detail",
      "style": {
        "navigationBarTitleText": "商品详情"
      }
    },
    {
      "path": "pages/life/cart",
      "style": {
        "navigationBarTitleText": "购物车"
      }
    },
    {
      "path": "pages/life/orders",
      "style": {
        "navigationBarTitleText": "我的订单",
        "enablePullDownRefresh": true
      }
    },
    {
      "path": "pages/life/carpool",
      "style": {
        "navigationBarTitleText": "乡村拼车",
        "enablePullDownRefresh": true
      }
    },
    {
      "path": "pages/life/carpool-detail",
      "style": {
        "navigationBarTitleText": "拼车详情"
      }
    },
    {
      "path": "pages/life/mutual-aid",
      "style": {
        "navigationBarTitleText": "邻里互助",
        "enablePullDownRefresh": true
      }
    },
    {
      "path": "pages/life/mutual-aid-detail",
      "style": {
        "navigationBarTitleText": "互助详情"
      }
    },
    {
      "path": "pages/life/group-buy",
      "style": {
        "navigationBarTitleText": "农资集采",
        "enablePullDownRefresh": true
      }
    },

    // ========== 农技社区模块 ==========
    {
      "path": "pages/agriculture/posts",
      "style": {
        "navigationBarTitleText": "农技社区",
        "enablePullDownRefresh": true
      }
    },
    {
      "path": "pages/agriculture/post-detail",
      "style": {
        "navigationBarTitleText": "帖子详情"
      }
    },
    {
      "path": "pages/agriculture/post-publish",
      "style": {
        "navigationBarTitleText": "发布动态"
      }
    },
    {
      "path": "pages/agriculture/knowledge",
      "style": {
        "navigationBarTitleText": "知识库",
        "enablePullDownRefresh": true
      }
    },
    {
      "path": "pages/agriculture/knowledge-detail",
      "style": {
        "navigationBarTitleText": "知识详情"
      }
    },
    {
      "path": "pages/agriculture/qa",
      "style": {
        "navigationBarTitleText": "专家问答",
        "enablePullDownRefresh": true
      }
    },
    {
      "path": "pages/agriculture/qa-detail",
      "style": {
        "navigationBarTitleText": "问题详情"
      }
    },
    {
      "path": "pages/agriculture/pest-identify",
      "style": {
        "navigationBarTitleText": "病虫害识别"
      }
    },

    // ========== 应急模块 ==========
    {
      "path": "pages/emergency/report",
      "style": {
        "navigationBarTitleText": "应急上报",
        "navigationStyle": "custom"
      }
    },
    {
      "path": "pages/emergency/contacts",
      "style": {
        "navigationBarTitleText": "紧急联系人"
      }
    },

    // ========== 个人中心模块 ==========
    {
      "path": "pages/user/profile",
      "style": {
        "navigationBarTitleText": "我的",
        "navigationStyle": "custom",
        "enablePullDownRefresh": true
      }
    },
    {
      "path": "pages/user/info",
      "style": {
        "navigationBarTitleText": "个人信息"
      }
    },
    {
      "path": "pages/user/household",
      "style": {
        "navigationBarTitleText": "家庭档案"
      }
    },
    {
      "path": "pages/user/settings",
      "style": {
        "navigationBarTitleText": "设置"
      }
    },
    {
      "path": "pages/user/display-settings",
      "style": {
        "navigationBarTitleText": "显示设置"
      }
    },
    {
      "path": "pages/user/notification-settings",
      "style": {
        "navigationBarTitleText": "通知设置"
      }
    },
    {
      "path": "pages/user/privacy-settings",
      "style": {
        "navigationBarTitleText": "隐私与安全"
      }
    },
    {
      "path": "pages/user/about",
      "style": {
        "navigationBarTitleText": "关于我们"
      }
    },
    {
      "path": "pages/user/feedback",
      "style": {
        "navigationBarTitleText": "意见反馈"
      }
    },

    // ========== 通用页面 ==========
    {
      "path": "pages/common/webview",
      "style": {
        "navigationBarTitleText": "网页浏览"
      }
    },
    {
      "path": "pages/common/search",
      "style": {
        "navigationBarTitleText": "搜索",
        "navigationStyle": "custom"
      }
    },
    {
      "path": "pages/common/preview-image",
      "style": {
        "navigationBarTitleText": "图片预览",
        "navigationStyle": "custom"
      }
    }
  ],

  // ========== 子包配置 ==========
  "subPackages": [
    {
      "root": "subPackages/village",
      "name": "village",
      "pages": [
        {
          "path": "pages/village/announcements",
          "style": { "navigationBarTitleText": "村务公告" }
        }
      ]
    },
    {
      "root": "subPackages/agriculture",
      "name": "agriculture",
      "pages": [
        {
          "path": "pages/agriculture/posts",
          "style": { "navigationBarTitleText": "农技社区" }
        }
      ]
    }
  ],

  // ========== TabBar 配置 ==========
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#2F855A",
    "backgroundColor": "#FFFFFF",
    "borderStyle": "white",
    "height": "56px",
    "list": [
      {
        "pagePath": "pages/index/index",
        "iconPath": "static/icons/tab-home.png",
        "selectedIconPath": "static/icons/tab-home-active.png",
        "text": "首页"
      },
      {
        "pagePath": "pages/village/announcements",
        "iconPath": "static/icons/tab-village.png",
        "selectedIconPath": "static/icons/tab-village-active.png",
        "text": "村务"
      },
      {
        "pagePath": "pages/services/applications",
        "iconPath": "static/icons/tab-service.png",
        "selectedIconPath": "static/icons/tab-service-active.png",
        "text": "服务"
      },
      {
        "pagePath": "pages/agriculture/posts",
        "iconPath": "static/icons/tab-agri.png",
        "selectedIconPath": "static/icons/tab-agri-active.png",
        "text": "农技"
      },
      {
        "pagePath": "pages/user/profile",
        "iconPath": "static/icons/tab-user.png",
        "selectedIconPath": "static/icons/tab-user-active.png",
        "text": "我的"
      }
    ]
  },

  // ========== 全局样式 ==========
  "globalStyle": {
    "navigationBarTextStyle": "black",
    "navigationBarTitleText": "智慧乡村",
    "navigationBarBackgroundColor": "#FFFFFF",
    "backgroundColor": "#F5F7FA"
  }
}
```

### 2.2 组件设计规范

#### 页面组件清单

| 页面路径 | 组件名称 | 主要职责 |
|---------|---------|---------|
| pages/auth/login | LoginPage | 用户登录、人脸识别入口 |
| pages/index/index | IndexPage | 首页聚合展示 |
| pages/village/announcements | AnnouncementList | 公告列表展示 |
| pages/village/announcement-detail | AnnouncementDetail | 公告详情、语音播报 |
| pages/village/voting | VotingList | 投票列表 |
| pages/village/voting-detail | VotingDetail | 投票详情、投票操作 |
| pages/village/finance | FinanceOverview | 财务概览 |
| pages/services/household-qrcode | HouseholdQRCode | 一户一码展示 |
| pages/services/applications | ApplicationList | 办事列表 |
| pages/services/voice-assistant | VoiceAssistantPage | 语音助手全屏界面 |
| pages/emergency/report | EmergencyReport | 应急上报 |
| pages/user/profile | ProfilePage | 个人中心 |

#### 业务组件清单

| 组件名称 | 文件路径 | 功能描述 |
|---------|---------|---------|
| **村务组件** | | |
| AnnouncementCard | components/business/AnnouncementCard.vue | 公告卡片 |
| VoteCard | components/business/VoteCard.vue | 投票卡片 |
| MeetingCard | components/business/MeetingCard.vue | 会议卡片 |
| FinanceCard | components/business/FinanceCard.vue | 财务卡片 |
| FinanceChart | components/business/FinanceChart.vue | 财务图表 |
| **服务组件** | | |
| ApplicationItem | components/business/ApplicationItem.vue | 办事事项条目 |
| BenefitCalculator | components/business/BenefitCalculator.vue | 政策计算器 |
| DocumentCard | components/business/DocumentCard.vue | 证件卡片 |
| ProxyRelation | components/business/ProxyRelation.vue | 代理关系卡片 |
| **生活组件** | | |
| ProductCard | components/business/ProductCard.vue | 商品卡片 |
| OrderItem | components/business/OrderItem.vue | 订单条目 |
| CarpoolCard | components/business/CarpoolCard.vue | 拼车卡片 |
| MutualAidCard | components/business/MutualAidCard.vue | 互助卡片 |
| **农技组件** | | |
| PostCard | components/business/PostCard.vue | 帖子卡片 |
| PostItem | components/business/PostItem.vue | 帖子条目 |
| KnowledgeCard | components/business/KnowledgeCard.vue | 知识卡片 |
| QAItem | components/business/QAItem.vue | 问答条目 |
| PestResult | components/business/PestResult.vue | 病虫害识别结果 |

#### 公共组件清单

| 组件名称 | 文件路径 | 功能描述 |
|---------|---------|---------|
| **导航组件** | | |
| NavBar | components/common/NavBar.vue | 顶部导航栏 |
| TabBar | components/common/TabBar.vue | 底部标签栏 |
| TabControl | components/common/TabControl.vue | 选项卡切换 |
| **列表组件** | | |
| RefreshList | components/common/RefreshList.vue | 下拉刷新列表 |
| LoadMore | components/common/LoadMore.vue | 上拉加载更多 |
| VirtualList | components/common/VirtualList.vue | 虚拟滚动列表 |
| **表单组件** | | |
| FormItem | components/common/FormItem.vue | 表单项 |
| Input | components/common/Input.vue | 输入框 |
| TextArea | components/common/TextArea.vue | 文本域 |
| Picker | components/common/Picker.vue | 选择器 |
| DatePicker | components/common/DatePicker.vue | 日期选择器 |
| Uploader | components/common/Uploader.vue | 文件上传 |
| **反馈组件** | | |
| Loading | components/common/Loading.vue | 加载中 |
| Empty | components/common/Empty.vue | 空状态 |
| Error | components/common/Error.vue | 错误状态 |
| Toast | components/common/Toast.vue | 轻提示 |
| Modal | components/common/Modal.vue | 模态框 |
| ActionSheet | components/common/ActionSheet.vue | 操作菜单 |
| **媒体组件** | | |
| Image | components/common/Image.vue | 图片（支持懒加载） |
| VideoPlayer | components/common/VideoPlayer.vue | 视频播放器 |
| ImageViewer | components/common/ImageViewer.vue | 图片预览器 |
| **其他组件** | | |
| SearchBar | components/common/SearchBar.vue | 搜索栏 |
| Badge | components/common/Badge.vue | 徽章 |
| Tag | components/common/Tag.vue | 标签 |
| Divider | components/common/Divider.vue | 分割线 |
| Skeleton | components/common/Skeleton.vue | 骨架屏 |
| Avatar | components/common/Avatar.vue | 头像 |

#### 适老化组件清单

| 组件名称 | 文件路径 | 功能描述 |
|---------|---------|---------|
| ElderlyButton | components/elderly/ElderlyButton.vue | 适老化按钮（大触控区） |
| ElderlyCard | components/elderly/ElderlyCard.vue | 适老化卡片（大字版） |
| ElderlyForm | components/elderly/ElderlyForm.vue | 适老化表单 |
| ElderlyLayout | components/elderly/ElderlyLayout.vue | 适老化布局 |
| ElderlySwitch | components/elderly/ElderlySwitch.vue | 适老化开关 |
| ElderlySlider | components/elderly/ElderlySlider.vue | 适老化滑块 |

#### 语音组件清单

| 组件名称 | 文件路径 | 功能描述 |
|---------|---------|---------|
| VoiceInput | components/voice/VoiceInput.vue | 语音输入组件 |
| VoiceOutput | components/voice/VoiceOutput.vue | 语音播报组件 |
| VoiceAssistant | components/voice/VoiceAssistant.vue | 语音助手全屏 |
| VoiceButton | components/voice/VoiceButton.vue | 语音按钮 |

#### 离线组件清单

| 组件名称 | 文件路径 | 功能描述 |
|---------|---------|---------|
| OfflineIndicator | components/offline/OfflineIndicator.vue | 离线状态指示器 |
| OfflineQueue | components/offline/OfflineQueue.vue | 离线队列展示 |
| SyncManager | components/offline/SyncManager.vue | 同步管理器 |
| OfflineBanner | components/offline/OfflineBanner.vue | 离线横幅提示 |

#### 二维码组件清单

| 组件名称 | 文件路径 | 功能描述 |
|---------|---------|---------|
| HouseholdQR | components/qr/HouseholdQR.vue | 一户一码二维码 |
| QRScanner | components/qr/QRScanner.vue | 扫码器 |
| QRCode | components/qr/QRCode.vue | 通用二维码生成 |

### 2.3 API 请求层设计

#### 请求封装架构

```javascript
// api/request.js
/**
 * 统一 HTTP 请求封装
 * 功能：
 * 1. 自动添加 Token
 * 2. 请求/响应拦截
 * 3. 错误统一处理
 * 4. 离线队列支持
 * 5. 请求取消
 * 6. 超时控制
 */

// 请求配置
const REQUEST_CONFIG = {
  timeout: 15000,
  baseURL: '',
  header: {
    'Content-Type': 'application/json'
  }
}

// 请求拦截器
const requestInterceptor = (config) => {
  // 添加 Token
  const token = useUserStore().token
  if (token) {
    config.header.Authorization = `Bearer ${token}`
  }

  // 添加时间戳（防缓存）
  if (config.method === 'GET') {
    config.data = {
      ...config.data,
      _t: Date.now()
    }
  }

  // 添加设备信息
  config.header['X-Device-Id'] = getDeviceId()
  config.header['X-Platform'] = getPlatform()

  return config
}

// 响应拦截器
const responseInterceptor = (response) => {
  const { statusCode, data } = response

  // HTTP 状态码处理
  if (statusCode === 200) {
    return data
  }

  // 业务状态码处理
  switch (data.code) {
    case 0:
      return data.data
    case 401:
      handleUnauthorized()
      break
    case 403:
      showToast('没有权限访问')
      break
    case 409:
      handleConflict(data)
      break
    default:
      showToast(data.message || '请求失败')
  }

  return Promise.reject(data)
}

// 导出 HTTP 实例
export const http = {
  get(url, data, config) { },
  post(url, data, config) { },
  put(url, data, config) { },
  delete(url, data, config) { },
  upload(url, filePath, formData) { }
}
```

#### API 模块划分

```
api/
├── request.js              # 请求封装
├── auth.js                 # 认证相关接口
├── user.js                 # 用户相关接口
├── village.js              # 村务相关接口
├── resident.js             # 村民相关接口
├── finance.js              # 财务相关接口
├── agriculture.js          # 农技相关接口
├── emergency.js            # 应急相关接口
├── voice.js                # 语音相关接口
├── offline.js              # 离线同步接口
├── upload.js               # 文件上传接口
└── payment.js              # 支付相关接口
```

### 2.4 状态管理设计 (Pinia Stores)

#### User Store (用户状态)

```javascript
// stores/user.js
export const useUserStore = defineStore('user', () => {
  // State
  const token = ref('')
  const userInfo = ref(null)
  const permissions = ref([])
  const roles = ref([])

  // Getters
  const isLoggedIn = computed(() => !!token.value)
  const userName = computed(() => userInfo.value?.name || '')
  const userAvatar = computed(() => userInfo.value?.avatar || '')
  const isVillageAdmin = computed(() => roles.value.includes('village_admin'))

  // Actions
  const setToken = (newToken) => { }
  const setUserInfo = (info) => { }
  const login = async (loginData) => { }
  const logout = () => { }
  const getUserInfo = async () => { }
  const updateUserInfo = async (data) => { }
  const refreshUserInfo = async () => { }

  return {
    token, userInfo, permissions, roles,
    isLoggedIn, userName, userAvatar, isVillageAdmin,
    setToken, setUserInfo, login, logout, getUserInfo, updateUserInfo, refreshUserInfo
  }
})
```

#### Village Store (村务状态)

```javascript
// stores/village.js
export const useVillageStore = defineStore('village', () => {
  // State
  const announcements = ref([])
  const votes = ref([])
  const meetings = ref([])
  const finances = ref([])
  const discussions = ref([])
  const loading = ref(false)

  // Getters
  const unreadAnnouncements = computed(() =>
    announcements.value.filter(a => !a.isRead)
  )
  const activeVotes = computed(() =>
    votes.value.filter(v => v.status === 'active')
  )

  // Actions
  const fetchAnnouncements = async () => { }
  const fetchVotes = async () => { }
  const fetchMeetings = async () => { }
  const fetchFinances = async () => { }
  const participateVote = async (voteId, optionId) => { }
  const markAnnouncementRead = async (id) => { }

  return {
    announcements, votes, meetings, finances, discussions, loading,
    unreadAnnouncements, activeVotes,
    fetchAnnouncements, fetchVotes, fetchMeetings, fetchFinances,
    participateVote, markAnnouncementRead
  }
})
```

#### Offline Store (离线状态)

```javascript
// stores/offline.js
export const useOfflineStore = defineStore('offline', () => {
  // State
  const isOnline = ref(true)
  const offlineQueue = ref([])
  const conflictQueue = ref([])
  const isSyncing = ref(false)
  const syncProgress = ref(0)
  const lastSyncTime = ref(null)

  // Getters
  const hasPendingOperations = computed(() =>
    offlineQueue.value.length > 0
  )
  const hasConflicts = computed(() =>
    conflictQueue.value.length > 0
  )

  // Actions
  const watchNetworkStatus = () => { }
  const addOfflineOperation = (operation) => { }
  const syncOfflineData = async () => { }
  const resolveConflict = (conflictId, resolution) => { }
  const clearQueue = () => { }

  return {
    isOnline, offlineQueue, conflictQueue, isSyncing, syncProgress, lastSyncTime,
    hasPendingOperations, hasConflicts,
    watchNetworkStatus, addOfflineOperation, syncOfflineData, resolveConflict, clearQueue
  }
})
```

#### Elderly Store (适老化配置)

```javascript
// stores/elderly.js
export const useElderlyStore = defineStore('elderly', () => {
  // State
  const mode = ref('standard')  // standard | large | extra-large
  const voiceEnabled = ref(true)
  const highContrast = ref(false)
  const hapticFeedback = ref(true)
  const autoSpeak = ref(false)

  // Getters
  const isElderlyMode = computed(() => mode.value !== 'standard')
  const currentTheme = computed(() => ELDERLY_THEME[mode.value])

  // Actions
  const setMode = (newMode) => { }
  const toggleVoice = () => { }
  const toggleHighContrast = () => { }
  const toggleHapticFeedback = () => { }

  return {
    mode, voiceEnabled, highContrast, hapticFeedback, autoSpeak,
    isElderlyMode, currentTheme,
    setMode, toggleVoice, toggleHighContrast, toggleHapticFeedback
  }
})
```

#### Voice Store (语音状态)

```javascript
// stores/voice.js
export const useVoiceStore = defineStore('voice', () => {
  // State
  const isEnabled = ref(true)
  const language = ref('zh-CN')
  const dialect = ref('mandarin')
  const rate = ref(1.0)
  const pitch = ref(1.0)
  const history = ref([])

  // Actions
  const addHistory = (text, type) => { }
  const clearHistory = () => { }
  const speak = (text) => { }
  const recognize = () => { }

  return {
    isEnabled, language, dialect, rate, pitch, history,
    addHistory, clearHistory, speak, recognize
  }
})
```

### 2.5 本地存储方案

#### 存储策略

| 数据类型 | 存储方式 | 容量限制 | 过期策略 |
|---------|---------|---------|---------|
| 用户 Token | Uni.Storage | 10MB | 永久 |
| 用户信息 | Uni.Storage | 10MB | 永久 |
| 适老化配置 | Uni.Storage | 10MB | 永久 |
| 公告缓存 | Uni.Storage | 10MB | 1天 |
| 离线队列 | SQLite | 无限制 | 永久 |
| 图片缓存 | Uni.Storage + 文件 | 200MB | LRU清理 |
| 语音历史 | Uni.Storage | 10MB | 7天 |

#### 存储键名规范

```javascript
// 统一前缀 sv_ (Smart Village)
const STORAGE_KEYS = {
  // 用户相关
  TOKEN: 'sv_token',
  USER_INFO: 'sv_user_info',
  USER_PERMISSIONS: 'sv_permissions',

  // 配置相关
  ELDERLY_MODE: 'sv_elderly_mode',
  VOICE_ENABLED: 'sv_voice_enabled',
  HIGH_CONTRAST: 'sv_high_contrast',

  // 缓存相关
  ANNOUNCEMENTS_CACHE: 'sv_announcements_cache',
  ANNOUNCEMENTS_CACHE_TIME: 'sv_announcements_cache_time',

  // 离线相关
  OFFLINE_QUEUE: 'sv_offline_queue',
  CONFLICT_QUEUE: 'sv_conflict_queue',
  LAST_SYNC_TIME: 'sv_last_sync_time',

  // 历史相关
  VOICE_HISTORY: 'sv_voice_history',
  SEARCH_HISTORY: 'sv_search_history'
}
```

---

## 三、后端接口设计

### 3.1 RESTful API 设计规范

#### URL 设计规范

```
BASE_URL: /api/v1

资源命名规范：
- 使用名词复数
- 使用小写字母
- 使用连字符分隔单词
- 层级不超过3层

示例：
GET    /api/v1/announcements          # 获取公告列表
GET    /api/v1/announcements/:id      # 获取公告详情
POST   /api/v1/announcements          # 创建公告
PUT    /api/v1/announcements/:id      # 更新公告
DELETE /api/v1/announcements/:id      # 删除公告

GET    /api/v1/votes/:id/options      # 获取投票选项
POST   /api/v1/votes/:id/vote         # 参与投票
```

#### 统一响应格式

```javascript
// 成功响应
{
  "code": 0,
  "message": "success",
  "data": { },
  "timestamp": 1703923200000
}

// 错误响应
{
  "code": 1001,
  "message": "参数错误",
  "errors": [ ],
  "timestamp": 1703923200000
}

// 分页响应
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [ ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  },
  "timestamp": 1703923200000
}
```

#### 错误码规范

| 错误码 | 说明 | HTTP状态码 |
|-------|------|-----------|
| 0 | 成功 | 200 |
| 1001 | 参数错误 | 400 |
| 1002 | 缺少必填参数 | 400 |
| 1003 | 参数格式错误 | 400 |
| 2001 | 未登录 | 401 |
| 2002 | Token过期 | 401 |
| 2003 | Token无效 | 401 |
| 3001 | 无权限 | 403 |
| 3002 | 资源不存在 | 404 |
| 4001 | 资源冲突 | 409 |
| 4002 | 数据冲突 | 409 |
| 5001 | 服务器错误 | 500 |
| 5002 | 服务不可用 | 503 |
| 6001 | 网络超时 | 408 |

### 3.2 与现有后端的集成方案

#### 接口映射关系

| 移动端需求 | 现有后端接口 | 集成方式 |
|-----------|-------------|---------|
| 用户认证 | POST /api/auth/login | 直接调用 |
| 获取公告 | GET /api/announcements | 直接调用 |
| 投票接口 | POST /api/voting/:id/vote | 直接调用 |
| 文件上传 | POST /api/upload | 直接调用 |
| 语音识别 | - | 新增接口 |
| 人脸识别 | - | 第三方SDK |

#### 新增接口需求

```javascript
// ========== 语音相关 ==========
POST   /api/voice/recognize         # 语音识别
POST   /api/voice/synthesis         # 语音合成

// ========== 人脸识别 ==========
POST   /api/face/detect             # 人脸检测
POST   /api/face/verify             # 人脸验证
POST   /api/face/compare            # 人脸比对

// ========== 离线同步 ==========
POST   /api/sync/push               # 推送离线数据
GET    /api/sync/pull               # 拉取服务器数据
POST   /api/sync/resolve            # 解决冲突

// ========== 病虫害识别 ==========
POST   /api/agriculture/pest-identify  # 病虫害识别

// ========== 政策计算器 ==========
POST   /api/benefits/calculate      # 计算补贴金额

// ========== 亲属代理 ==========
POST   /api/proxy/apply             # 申请代理
POST   /api/proxy/verify            # 验证代理关系
GET    /api/proxy/list              # 获取代理列表
```

### 3.3 数据模型设计

#### 移动端用户模型 (VillageUser)

```javascript
{
  _id: ObjectId,
  villageId: ObjectId,              // 所属村庄ID
  name: String,                     // 姓名
  phone: String,                    // 手机号（脱敏）
  idCard: String,                   // 身份证号（加密存储）
  avatar: String,                   // 头像URL
  address: {                        // 地址
    province: String,
    city: String,
    district: String,
    village: String,
    detail: String
  },
  householdId: ObjectId,            // 户ID
  familyRole: String,               // 家庭角色（户主/成员）
  tags: [String],                   // 标签（低保户/独居老人等）
  elderlySettings: {                // 适老化设置
    mode: String,                   // 模式
    voiceEnabled: Boolean,
    highContrast: Boolean
  },
  proxyRelations: [{                // 代理关系
    proxyUserId: ObjectId,          // 代理人ID
    proxyName: String,
    relation: String,               // 关系（子女/配偶）
    permissions: [String],          // 权限范围
    verified: Boolean,              // 是否验证
    verifiedAt: Date
  }],
  fcmTokens: [String],              // 推送Token
  lastLoginAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### 一户一码模型 (HouseholdQR)

```javascript
{
  _id: ObjectId,
  villageId: ObjectId,
  householdCode: String,            // 户编码（唯一）
  qrcodeData: String,               // 二维码数据
  qrcodeImage: String,              // 二维码图片URL
  headOfHousehold: {                // 户主信息
    userId: ObjectId,
    name: String,
    phone: String
  },
  members: [{                       // 成员列表
    userId: ObjectId,
    name: String,
    relation: String,
    idCard: String,
    phone: String
  }],
  address: String,
  tags: [String],                   // 家庭标签
  emergencyContact: {               // 紧急联系人
    name: String,
    phone: String,
    relation: String
  },
  scanHistory: [{                   // 扫码历史
    scannedBy: ObjectId,
    scannedByName: String,
    scannedAt: Date,
    purpose: String
  }],
  createdAt: Date,
  updatedAt: Date
}
```

#### 离线同步模型 (OfflineQueue)

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  villageId: ObjectId,
  operationType: String,            // create/update/delete
  resourceType: String,             // 资源类型
  resourceId: String,               // 资源ID
  payload: Object,                  // 操作数据
  status: String,                   // pending/synced/failed/conflict
  conflictData: Object,             // 冲突数据
  retryCount: Number,
  errorMessage: String,
  createdAt: Date,
  syncedAt: Date
}
```

### 3.4 认证授权方案

#### JWT Token 设计

```javascript
// Access Token (有效期 2小时)
{
  "sub": "user_id",
  "name": "user_name",
  "role": "villager",
  "villageId": "village_id",
  "permissions": ["read:announcements", "vote"],
  "iat": 1703923200,
  "exp": 1703930400
}

// Refresh Token (有效期 30天)
存储在本地，用于刷新 Access Token
```

#### 刷新 Token 流程

```
1. 客户端请求 API 时携带 Access Token
2. 服务端验证 Token
   - 有效 → 正常返回数据
   - 过期 → 返回 401 错误
3. 客户端收到 401
   - 使用 Refresh Token 调用刷新接口
   - 获取新的 Access Token
   - 重新发起原请求
4. Refresh Token 也过期
   - 跳转登录页面
```

#### 权限控制模型

```javascript
// 角色定义
const ROLES = {
  VILLAGER: 'villager',           // 普通村民
  VILLAGE_ADMIN: 'village_admin', // 村管理员
  VILLAGE_COMMITTEE: 'committee', // 村委会成员
  TOWNSHIP_ADMIN: 'township_admin' // 乡镇管理员
}

// 权限定义
const PERMISSIONS = {
  // 公告相关
  ANNOUNCEMENT_READ: 'read:announcements',
  ANNOUNCEMENT_WRITE: 'write:announcements',

  // 投票相关
  VOTE_READ: 'read:votes',
  VOTE_PARTICIPATE: 'participate:votes',
  VOTE_MANAGE: 'manage:votes',

  // 财务相关
  FINANCE_READ: 'read:finances',
  FINANCE_WRITE: 'write:finances',

  // 村民相关
  RESIDENT_READ: 'read:residents',
  RESIDENT_WRITE: 'write:residents',

  // 应急相关
  EMERGENCY_REPORT: 'report:emergency',
  EMERGENCY_MANAGE: 'manage:emergency'
}

// 角色权限映射
const ROLE_PERMISSIONS = {
  [ROLES.VILLAGER]: [
    PERMISSIONS.ANNOUNCEMENT_READ,
    PERMISSIONS.VOTE_READ,
    PERMISSIONS.VOTE_PARTICIPATE,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.EMERGENCY_REPORT
  ],
  [ROLES.VILLAGE_ADMIN]: [
    PERMISSIONS.ANNOUNCEMENT_READ,
    PERMISSIONS.ANNOUNCEMENT_WRITE,
    PERMISSIONS.VOTE_READ,
    PERMISSIONS.VOTE_MANAGE,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.RESIDENT_READ,
    PERMISSIONS.EMERGENCY_REPORT,
    PERMISSIONS.EMERGENCY_MANAGE
  ]
}
```

### 3.5 离线同步机制

#### 同步策略

```javascript
// 同步类型
const SYNC_TYPES = {
  // 全量同步
  FULL: 'full',        // 首次登录或长时间未同步

  // 增量同步
  INCREMENTAL: 'incremental', // 基于时间戳的增量同步

  // 双向同步
  BIDIRECTIONAL: 'bidirectional' // 客户端和服务端都有变更
}

// 同步优先级
const SYNC_PRIORITY = {
  HIGH: 'high',        // 应急上报、重要通知
  MEDIUM: 'medium',    // 投票、办事申请
  LOW: 'low'           // 浏览记录、统计数据
}

// 同步冲突解决策略
const CONFLICT_RESOLUTION = {
  SERVER_WINS: 'server_wins',       // 服务端优先
  CLIENT_WINS: 'client_wins',       // 客户端优先
  LAST_WRITE_WINS: 'last_write_wins', // 最后写入优先
  MANUAL: 'manual'                  // 手动解决
}
```

#### 同步流程

```
┌─────────────────────────────────────────────────────────────┐
│                      离线同步流程                             │
└─────────────────────────────────────────────────────────────┘

客户端离线操作
    │
    ▼
┌─────────────────┐
│ 1. 本地存储     │ → 存储到 SQLite/IndexedDB
│    操作到队列    │
└────────┬────────┘
         │
         ▼ 网络恢复
┌─────────────────┐
│ 2. 网络监听     │ → uni.onNetworkStatusChange
│    自动触发同步  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. 推送离线数据 │ → POST /api/sync/push
│    到服务器      │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│成功     │ │冲突     │
└───┬────┘ └───┬────┘
    │          │
    ▼          ▼
清空队列   显示冲突
           供用户选择
```

#### 数据版本控制

```javascript
// 版本号格式
{
  "resourceId": "xxx",
  "version": 3,              // 版本号（每次更新+1）
  "updatedAt": "2025-12-30T10:00:00Z",
  "updatedBy": "user_id"
}

// 冲突检测
if (clientVersion !== serverVersion) {
  // 发生冲突
  conflict = {
    clientData: {...},
    serverData: {...},
    clientVersion: 3,
    serverVersion: 4,
    conflictType: 'version_mismatch'
  }
}
```

---

## 四、适老化功能详细设计

### 4.1 三种字体模式实现方案

#### 模式配置

```javascript
// config/elderly.config.js
export const ELDERLY_MODES = {
  STANDARD: 'standard',      // 标准模式（默认）
  LARGE: 'large',            // 大字模式
  EXTRA_LARGE: 'extra_large' // 超大字模式
}

export const ELDERLY_THEME = {
  [ELDERLY_MODES.STANDARD]: {
    name: '标准模式',
    fontSize: {
      xs: '24rpx',   // 12px
      sm: '26rpx',   // 13px
      base: '28rpx', // 14px
      lg: '30rpx',   // 15px
      xl: '32rpx',   // 16px
      '2xl': '36rpx', // 18px
      '3xl': '40rpx', // 20px
      '4xl': '48rpx'  // 24px
    },
    spacing: {
      xs: '8rpx',
      sm: '16rpx',
      md: '24rpx',
      lg: '32rpx',
      xl: '40rpx',
      '2xl': '48rpx'
    },
    button: {
      height: {
        small: '72rpx',   // 36px
        medium: '80rpx',  // 40px
        large: '88rpx'    // 44px
      },
      fontSize: {
        small: '28rpx',
        medium: '30rpx',
        large: '32rpx'
      },
      borderRadius: '16rpx'
    },
    iconSize: {
      xs: '32rpx',
      sm: '36rpx',
      md: '40rpx',
      lg: '48rpx',
      xl: '56rpx'
    }
  },

  [ELDERLY_MODES.LARGE]: {
    name: '大字模式',
    fontSize: {
      xs: '28rpx',   // 14px
      sm: '32rpx',   // 16px
      base: '36rpx', // 18px
      lg: '40rpx',   // 20px
      xl: '44rpx',   // 22px
      '2xl': '48rpx', // 24px
      '3xl': '56rpx', // 28px
      '4xl': '64rpx'  // 32px
    },
    spacing: {
      xs: '12rpx',
      sm: '20rpx',
      md: '28rpx',
      lg: '36rpx',
      xl: '48rpx',
      '2xl': '56rpx'
    },
    button: {
      height: {
        small: '80rpx',   // 40px
        medium: '88rpx',  // 44px
        large: '100rpx'   // 50px
      },
      fontSize: {
        small: '32rpx',
        medium: '36rpx',
        large: '40rpx'
      },
      borderRadius: '20rpx'
    },
    iconSize: {
      xs: '36rpx',
      sm: '40rpx',
      md: '48rpx',
      lg: '56rpx',
      xl: '64rpx'
    }
  },

  [ELDERLY_MODES.EXTRA_LARGE]: {
    name: '超大字模式',
    fontSize: {
      xs: '32rpx',   // 16px
      sm: '36rpx',   // 18px
      base: '40rpx', // 20px
      lg: '48rpx',   // 24px
      xl: '56rpx',   // 28px
      '2xl': '64rpx', // 32px
      '3xl': '72rpx', // 36px
      '4xl': '80rpx'  // 40px
    },
    spacing: {
      xs: '16rpx',
      sm: '24rpx',
      md: '32rpx',
      lg: '48rpx',
      xl: '64rpx',
      '2xl': '72rpx'
    },
    button: {
      height: {
        small: '96rpx',   // 48px
        medium: '108rpx', // 54px
        large: '120rpx'   // 60px
      },
      fontSize: {
        small: '36rpx',
        medium: '40rpx',
        large: '48rpx'
      },
      borderRadius: '24rpx'
    },
    iconSize: {
      xs: '40rpx',
      sm: '48rpx',
      md: '56rpx',
      lg: '64rpx',
      xl: '72rpx'
    }
  }
}
```

#### 动态切换实现

```javascript
// composables/useElderly.js
export function useElderly() {
  const currentMode = ref(ELDERLY_MODES.STANDARD)

  // 切换模式
  const setElderlyMode = (mode) => {
    currentMode.value = mode

    // 持久化存储
    uni.setStorageSync('elderly-mode', mode)

    // 更新页面根类名
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    if (currentPage && currentPage.$page) {
      currentPage.$page.meta.elderlyMode = mode
    }

    // 触发全局事件
    uni.$emit('elderly-mode-changed', { mode })
  }

  // 获取当前主题
  const currentTheme = computed(() => {
    return ELDERLY_THEME[currentMode.value]
  })

  // 获取样式类
  const getElderlyClass = (baseClass) => {
    const mode = currentMode.value
    if (mode === ELDERLY_MODES.STANDARD) {
      return baseClass
    }
    return `${baseClass}--${mode.replace('_', '-')}`
  }

  return {
    currentMode,
    currentTheme,
    setElderlyMode,
    getElderlyClass
  }
}
```

#### 样式实现

```scss
// styles/elderly.scss
.elderly-mode-large,
.elderly-mode-extra-large {
  // 全局样式覆盖
  * {
    transition: all 0.3s ease !important;
  }
}

// 大字模式
.elderly-mode-large {
  // 字体大小
  --font-size-xs: 28rpx;
  --font-size-sm: 32rpx;
  --font-size-base: 36rpx;
  --font-size-lg: 40rpx;
  --font-size-xl: 44rpx;
  --font-size-2xl: 48rpx;
  --font-size-3xl: 56rpx;

  // 间距
  --spacing-xs: 12rpx;
  --spacing-sm: 20rpx;
  --spacing-md: 28rpx;
  --spacing-lg: 36rpx;
  --spacing-xl: 48rpx;

  // 按钮高度
  --button-height-small: 80rpx;
  --button-height-medium: 88rpx;
  --button-height-large: 100rpx;
}

// 超大字模式
.elderly-mode-extra-large {
  // 字体大小
  --font-size-xs: 32rpx;
  --font-size-sm: 36rpx;
  --font-size-base: 40rpx;
  --font-size-lg: 48rpx;
  --font-size-xl: 56rpx;
  --font-size-2xl: 64rpx;
  --font-size-3xl: 72rpx;

  // 间距
  --spacing-xs: 16rpx;
  --spacing-sm: 24rpx;
  --spacing-md: 32rpx;
  --spacing-lg: 48rpx;
  --spacing-xl: 64rpx;

  // 按钮高度
  --button-height-small: 96rpx;
  --button-height-medium: 108rpx;
  --button-height-large: 120rpx;
}

// 组件级样式
.elderly-button {
  height: var(--button-height-medium);
  font-size: var(--font-size-base);
  padding: 0 var(--spacing-lg);
  border-radius: 20rpx;

  &--large {
    height: var(--button-height-large);
    font-size: var(--font-size-lg);
  }

  .elderly-mode-large & {
    height: var(--button-height-medium);
    font-size: var(--font-size-base);
  }

  .elderly-mode-extra-large & {
    height: var(--button-height-large);
    font-size: var(--font-size-lg);
  }
}
```

### 4.2 语音交互详细设计

#### 语音识别流程

```
┌─────────────────────────────────────────────────────────────┐
│                    语音识别流程                              │
└─────────────────────────────────────────────────────────────┘

用户按下语音按钮
    │
    ▼
┌─────────────────┐
│ 1. 请求权限     │ → 检查麦克风权限
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. 开始录音     │ → 调用录音管理器
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. 实时反馈     │ → 显示波形动画
└────────┬────────┘
         │
         ▼ 用户松开
┌─────────────────┐
│ 4. 停止录音     │ → 结束录音
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. 上传音频     │ → 上传到服务器/本地识别
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6. 语音识别     │ → 调用识别API
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│成功     │ │失败     │
└───┬────┘ └───┬────┘
    │          │
    ▼          ▼
显示结果   提示重试
```

#### 方言识别配置

```javascript
// config/dialect.config.js
export const DIALECTS = {
  MANDARIN: {
    code: 'zh-CN',
    name: '普通话',
    provider: 'xunfei'
  },
  WU: {
    code: 'zh-WU',
    name: '吴语（上海话）',
    provider: 'xunfei',
    regions: ['上海', '苏州', '杭州']
  },
  CANTONESE: {
    code: 'zh-HK',
    name: '粤语',
    provider: 'xunfei',
    regions: ['广东', '广西', '香港']
  },
  MINNAN: {
    code: 'zh-MIN',
    name: '闽南语',
    provider: 'baidu',
    regions: ['福建', '台湾', '东南亚']
  },
  SICHUANESE: {
    code: 'zh-SC',
    name: '四川话',
    provider: 'xunfei',
    regions: ['四川', '重庆']
  },
  HENANESE: {
    code: 'zh-HA',
    name: '河南话',
    provider: 'baidu',
    regions: ['河南']
  }
}

export const DIALECT_PROVIDERS = {
  XUNFEI: {
    name: '科大讯飞',
    appId: '',
    apiKey: '',
    apiSecret: '',
    url: 'wss://iat.xfyun.cn/v2/iat'
  },
  BAIDU: {
    name: '百度',
    appId: '',
    apiKey: '',
    secretKey: '',
    url: 'https://vop.baidu.com/server_api'
  },
  TENCENT: {
    name: '腾讯',
    secretId: '',
    secretKey: '',
    url: 'https://asr.cloud.tencent.com/asr/v2/'
  }
}
```

#### 语音播报实现

```javascript
// composables/useVoice.js
export function useVoice() {
  const isPlaying = ref(false)
  const currentText = ref('')

  // 语音播报
  const speak = (text, options = {}) => {
    const {
      rate = 1.0,        // 语速
      pitch = 1.0,       // 音调
      volume = 1.0,      // 音量
      lang = 'zh-CN'     // 语言
    } = options

    currentText.value = text
    isPlaying.value = true

    // #ifdef MP-WEIXIN
    // 微信小程序：使用 TTS 接口
    const innerAudioContext = uni.createInnerAudioContext()
    innerAudioContext.src = `https://tts.baidu.com/text2audio?lan=zh&ie=UTF-8&spd=${rate * 5}&text=${encodeURIComponent(text)}`
    innerAudioContext.onEnded(() => {
      isPlaying.value = false
    })
    innerAudioContext.play()
    // #endif

    // #ifdef H5
    // H5：使用 Web Speech API
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      utterance.rate = rate
      utterance.pitch = pitch
      utterance.volume = volume
      utterance.onend = () => {
        isPlaying.value = false
      }
      window.speechSynthesis.speak(utterance)
    }
    // #endif

    // #ifdef APP-PLUS
    // APP：使用原生插件
    plus.speech.startSpeaking({
      content: text,
      volume: volume,
      pitch: pitch,
      speed: rate
    }, () => {
      isPlaying.value = false
    })
    // #endif
  }

  // 停止播报
  const stopSpeak = () => {
    isPlaying.value = false

    // #ifdef MP-WEIXIN
    innerAudioContext.stop()
    // #endif

    // #ifdef H5
    window.speechSynthesis.cancel()
    // #endif

    // #ifdef APP-PLUS
    plus.speech.stopSpeaking()
    // #endif
  }

  return {
    isPlaying,
    currentText,
    speak,
    stopSpeak
  }
}
```

### 4.3 离线功能详细设计

#### 离线可用功能矩阵

| 功能模块 | 在线模式 | 离线模式 | 说明 |
|---------|---------|---------|------|
| 公告查看 | 完整功能 | 查看缓存 | 自动缓存最近30条 |
| 公告搜索 | 实时搜索 | 缓存搜索 | 仅搜索已缓存内容 |
| 投票参与 | 可投票 | 加入队列 | 网络恢复后自动提交 |
| 财务查看 | 实时数据 | 缓存数据 | 显示上次同步数据 |
| 应急上报 | 立即上报 | 本地存储 | 高优先级联网即发 |
| 表单填写 | 实时验证 | 本地填写 | 自动保存草稿 |
| 图片上传 | 立即上传 | 加入队列 | WiFi时自动上传 |
| 语音识别 | 在线识别 | - | 离线不可用 |
| 人脸识别 | 在线识别 | - | 离线不可用 |

#### 离线数据缓存策略

```javascript
// utils/offline/cache-strategy.js
export const CACHE_STRATEGY = {
  // 永久缓存
  PERSISTENT: {
    ttl: Infinity,
    storage: 'sqlite',
    maxSize: '50MB'
  },

  // 长期缓存（7天）
  LONG_TERM: {
    ttl: 7 * 24 * 60 * 60 * 1000,
    storage: 'uni-storage',
    maxSize: '10MB'
  },

  // 短期缓存（1天）
  SHORT_TERM: {
    ttl: 24 * 60 * 60 * 1000,
    storage: 'uni-storage',
    maxSize: '5MB'
  },

  // 会话缓存
  SESSION: {
    ttl: 0, // 页面关闭即清除
    storage: 'memory',
    maxSize: '2MB'
  }
}

// 资源缓存配置
export const RESOURCE_CACHE_CONFIG = {
  announcements: {
    strategy: 'LONG_TERM',
    limit: 30, // 最多缓存30条
    fields: ['id', 'title', 'content', 'publishTime', 'images']
  },
  finances: {
    strategy: 'SHORT_TERM',
    limit: 50,
    fields: ['id', 'type', 'amount', 'date', 'description']
  },
  knowledge: {
    strategy: 'LONG_TERM',
    limit: 100,
    fields: ['id', 'title', 'content', 'category', 'images']
  },
  userAvatar: {
    strategy: 'PERSISTENT',
    limit: 1,
    fields: ['url', 'updatedAt']
  }
}
```

#### 离线队列管理

```javascript
// stores/offline.js
export const useOfflineStore = defineStore('offline', () => {
  const queue = ref([])

  // 添加离线操作
  const addOperation = (operation) => {
    const op = {
      id: generateId(),
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      priority: operation.priority || 'medium',
      ...operation
    }

    queue.value.push(op)

    // 按优先级排序
    queue.value.sort((a, b) => {
      const priorityMap = { high: 3, medium: 2, low: 1 }
      return priorityMap[b.priority] - priorityMap[a.priority]
    })

    // 持久化
    saveQueue()

    return op.id
  }

  // 同步队列
  const syncQueue = async () => {
    if (!isOnline.value || isSyncing.value) return

    isSyncing.value = true

    for (const op of queue.value) {
      try {
        await executeOperation(op)

        // 成功，从队列移除
        removeFromQueue(op.id)
      } catch (error) {
        // 失败，增加重试次数
        op.retryCount++

        // 超过最大重试次数
        if (op.retryCount >= 3) {
          op.status = 'failed'
        }
      }
    }

    isSyncing.value = false
  }

  return {
    queue,
    addOperation,
    syncQueue
  }
})
```

### 4.4 无障碍功能实现

#### 读屏支持

```vue
<!-- 无障碍标签示例 -->
<template>
  <view
    role="button"
    :aria-label="ariaLabel"
    :aria-describedby="describedBy"
    @tap="handleTap"
  >
    <slot></slot>
  </view>
</template>

<script setup>
const props = defineProps({
  ariaLabel: String,
  describedBy: String
})
</script>
```

#### 触觉反馈

```javascript
// utils/haptic.js
export const hapticFeedback = {
  // 轻触反馈
  light: () => {
    // #ifdef APP-PLUS
    plus.device.vibrate(10)
    // #endif

    // #ifdef MP-WEIXIN
    uni.vibrateShort({ type: 'light' })
    // #endif
  },

  // 中等反馈
  medium: () => {
    // #ifdef APP-PLUS
    plus.device.vibrate(20)
    // #endif

    // #ifdef MP-WEIXIN
    uni.vibrateShort({ type: 'medium' })
    // #endif
  },

  // 重反馈
  heavy: () => {
    // #ifdef APP-PLUS
    plus.device.vibrate(30)
    // #endif

    // #ifdef MP-WEIXIN
    uni.vibrateLong()
    // #endif
  },

  // 成功模式
  success: () => {
    // #ifdef APP-PLUS
    plus.device.vibrate([10, 50, 10])
    // #endif
  },

  // 错误模式
  error: () => {
    // #ifdef APP-PLUS
    plus.device.vibrate([20, 30, 20, 30, 40])
    // #endif
  }
}
```

---

## 五、安全与性能

### 5.1 数据加密方案

#### 传输加密

```javascript
// 所有 API 请求使用 HTTPS
const httpsConfig = {
  // 证书固定（防止中间人攻击）
  certificatePinning: true,
  allowedCertificates: [
    'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
  ],

  // TLS 配置
  tls: {
    minVersion: '1.2',
    maxVersion: '1.3',
    cipherSuites: [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256'
    ]
  }
}
```

#### 存储加密

```javascript
// utils/crypto.js
import CryptoJS from 'crypto-js'

const SECRET_KEY = 'your-secret-key-32-characters-long!!'

// AES 加密
export const encrypt = (data) => {
  const json = JSON.stringify(data)
  const encrypted = CryptoJS.AES.encrypt(json, SECRET_KEY).toString()
  return encrypted
}

// AES 解密
export const decrypt = (ciphertext) => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    return JSON.parse(decrypted)
  } catch (error) {
    console.error('Decryption failed:', error)
    return null
  }
}

// 敏感数据加密存储
export const secureStorage = {
  set(key, value) {
    const encrypted = encrypt(value)
    uni.setStorageSync(key, encrypted)
  },

  get(key) {
    const encrypted = uni.getStorageSync(key)
    if (!encrypted) return null
    return decrypt(encrypted)
  }
}

// 使用示例
secureStorage.set('idCard', '330106199001011234')
const idCard = secureStorage.get('idCard')
```

#### 数据脱敏

```javascript
// utils/masking.js

// 手机号脱敏
export const maskPhone = (phone) => {
  if (!phone || phone.length !== 11) return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

// 身份证脱敏
export const maskIdCard = (idCard) => {
  if (!idCard || idCard.length < 15) return idCard
  const length = idCard.length
  const visibleStart = 3
  const visibleEnd = 4
  const masked = idCard.substring(0, visibleStart) +
    '*'.repeat(length - visibleStart - visibleEnd) +
    idCard.substring(length - visibleEnd)
  return masked
}

// 姓名脱敏
export const maskName = (name) => {
  if (!name || name.length === 0) return name
  if (name.length === 1) return '*'
  if (name.length === 2) return name[0] + '*'
  return name[0] + '*' + name[name.length - 1]
}

// 地址脱敏
export const maskAddress = (address) => {
  if (!address || address.length < 10) return address
  return address.substring(0, 6) + '...' + address.substring(address.length - 6)
}
```

### 5.2 性能优化策略

#### 代码分包

```javascript
// pages.json
{
  "subPackages": [
    {
      "root": "subPackages/village",
      "name": "village",
      "pages": [
        { "path": "pages/announcements" },
        { "path": "pages/voting" },
        { "path": "pages/finance" }
      ]
    },
    {
      "root": "subPackages/agriculture",
      "name": "agriculture",
      "pages": [
        { "path": "pages/posts" },
        { "path": "pages/knowledge" }
      ]
    }
  ],

  // 预下载配置
  "preloadRule": {
    "pages/index/index": {
      "network": "all",
      "packages": ["village"]
    }
  }
}
```

#### 图片优化

```javascript
// utils/image.js

// 图片压缩
export const compressImage = (src, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    uni.compressImage({
      src,
      quality,
      success: (res) => resolve(res.tempFilePath),
      fail: reject
    })
  })
}

// 图片裁剪
export const cropImage = (src, width, height) => {
  return new Promise((resolve, reject) => {
    // 使用 canvas 裁剪
    const ctx = uni.createCanvasContext('cropCanvas')
    ctx.drawImage(src, 0, 0, width, height)
    ctx.draw(false, () => {
      uni.canvasToTempFilePath({
        canvasId: 'cropCanvas',
        success: (res) => resolve(res.tempFilePath),
        fail: reject
      })
    })
  })
}

// 图片懒加载组件
// components/common/LazyImage.vue
```

#### 列表优化

```javascript
// 虚拟滚动实现
export const useVirtualList = (items, itemHeight) => {
  const scrollTop = ref(0)
  const containerHeight = ref(0)

  // 计算可见范围
  const visibleRange = computed(() => {
    const start = Math.floor(scrollTop.value / itemHeight)
    const visibleCount = Math.ceil(containerHeight.value / itemHeight)
    const end = start + visibleCount + 1 // 缓冲1项

    return {
      start: Math.max(0, start - 5), // 顶部缓冲5项
      end: Math.min(items.value.length, end + 5) // 底部缓冲5项
    }
  })

  // 可见数据
  const visibleItems = computed(() => {
    const { start, end } = visibleRange.value
    return items.value.slice(start, end).map((item, index) => ({
      data: item,
      index: start + index
    }))
  })

  return {
    scrollTop,
    visibleItems,
    onScroll: (e) => {
      scrollTop.value = e.detail.scrollTop
    }
  }
}
```

#### 缓存策略

```javascript
// utils/cache.js

class CacheManager {
  constructor() {
    this.memoryCache = new Map()
    this.maxMemorySize = 100 // 最多缓存100个对象
  }

  // 获取缓存
  get(key, options = {}) {
    const {
      strategy = 'memory',
      defaultValue = null
    } = options

    if (strategy === 'memory') {
      return this.memoryCache.get(key) || defaultValue
    }

    if (strategy === 'storage') {
      return uni.getStorageSync(key) || defaultValue
    }
  }

  // 设置缓存
  set(key, value, options = {}) {
    const {
      strategy = 'memory',
      ttl = 0 // 0表示永不过期
    } = options

    if (strategy === 'memory') {
      // 清理旧缓存
      if (this.memoryCache.size >= this.maxMemorySize) {
        const firstKey = this.memoryCache.keys().next().value
        this.memoryCache.delete(firstKey)
      }

      this.memoryCache.set(key, {
        value,
        expiresAt: ttl ? Date.now() + ttl : 0
      })
    }

    if (strategy === 'storage') {
      const data = {
        value,
        expiresAt: ttl ? Date.now() + ttl : 0
      }
      uni.setStorageSync(key, JSON.stringify(data))
    }
  }

  // 删除缓存
  delete(key) {
    this.memoryCache.delete(key)
    uni.removeStorageSync(key)
  }

  // 清空所有缓存
  clear() {
    this.memoryCache.clear()
    uni.clearStorageSync()
  }
}

export const cache = new CacheManager()
```

### 5.3 缓存策略

#### 多级缓存架构

```
┌─────────────────────────────────────────────────────────────┐
│                    缓存层级结构                               │
└─────────────────────────────────────────────────────────────┘

Level 1: 内存缓存 (Memory Cache)
    ├── 容量: 5MB
    ├── 速度: 最快
    ├── 存储位置: RAM
    └── 过期策略: 页面关闭时清除

Level 2: 本地存储 (Uni.Storage)
    ├── 容量: 10MB
    ├── 速度: 快
    ├── 存储位置: 本地文件系统
    └── 过期策略: TTL 过期

Level 3: SQLite 数据库
    ├── 容量: 无限制
    ├── 速度: 中等
    ├── 存储位置: 本地数据库
    └── 过期策略: 永久存储

Level 4: 远程服务器 (Server)
    ├── 容量: 无限制
    ├── 速度: 慢（依赖网络）
    └── 存储位置: 云端
```

#### 缓存更新策略

```javascript
// 缓存更新模式
export const CACHE_UPDATE_MODES = {
  // 缓存优先
  CACHE_FIRST: 'cache_first',

  // 网络优先
  NETWORK_FIRST: 'network_first',

  // 仅网络
  NETWORK_ONLY: 'network_only',

  // 仅缓存
  CACHE_ONLY: 'cache_only',

  // 先缓存后网络（Stale-While-Revalidate）
  STALE_WHILE_REVALIDATE: 'stale_while_revalidate'
}

// 数据获取器
export const fetchData = async (key, fetcher, options = {}) => {
  const {
    mode = CACHE_UPDATE_MODES.NETWORK_FIRST,
    ttl = 5 * 60 * 1000 // 5分钟
  } = options

  switch (mode) {
    case CACHE_UPDATE_MODES.CACHE_FIRST:
      // 先读缓存，没有再请求网络
      let cached = cache.get(key)
      if (cached) {
        // 后台更新
        fetcher().then(data => cache.set(key, data, { ttl }))
        return cached
      }
      return fetcher().then(data => {
        cache.set(key, data, { ttl })
        return data
      })

    case CACHE_UPDATE_MODES.NETWORK_FIRST:
      // 先请求网络，失败再读缓存
      try {
        const data = await fetcher()
        cache.set(key, data, { ttl })
        return data
      } catch (error) {
        cached = cache.get(key)
        if (cached) return cached
        throw error
      }

    case CACHE_UPDATE_MODES.STALE_WHILE_REVALIDATE:
      // 立即返回缓存，后台更新
      cached = cache.get(key)
      fetcher().then(data => cache.set(key, data, { ttl }))
      return cached || fetcher().then(data => {
        cache.set(key, data, { ttl })
        return data
      })

    default:
      return fetcher()
  }
}
```

---

## 六、部署方案

### 6.1 多端打包配置

#### 微信小程序打包

```bash
# 开发环境
npm run dev:mp-weixin

# 生产环境
npm run build:mp-weixin

# 输出目录
dist/build/mp-weixin/
```

#### APP 打包

```bash
# iOS
npm run build:app-ios

# Android
npm run build:app-android

# 云打包（使用 HBuilderX）
# 1. 打开 HBuilderX
# 2. 发行 -> 原生App-云打包
# 3. 选择平台和配置
# 4. 等待打包完成
```

#### H5 打包

```bash
# 开发环境
npm run dev:h5

# 生产环境
npm run build:h5

# 输出目录
dist/build/h5/
```

### 6.2 环境配置

```javascript
// config/env.js
export const ENV = {
  development: 'development',
  production: 'production'
}

export const CONFIG = {
  [ENV.development]: {
    BASE_URL: 'http://localhost:5000/api',
    WS_URL: 'ws://localhost:5000',
    UPLOAD_URL: 'http://localhost:5000/upload',
    VOICE_API: 'http://localhost:8000',
    FACE_API: 'http://localhost:8001'
  },

  [ENV.production]: {
    BASE_URL: 'https://api.smartvillage.com/api',
    WS_URL: 'wss://api.smartvillage.com',
    UPLOAD_URL: 'https://api.smartvillage.com/upload',
    VOICE_API: 'https://voice.smartvillage.com',
    FACE_API: 'https://face.smartvillage.com'
  }
}

export const getConfig = () => {
  // 根据构建环境获取配置
  // #ifdef MP-WEIXIN
  return CONFIG[ENV.production] // 小程序使用生产配置
  // #endif

  // #ifdef H5
  return process.env.NODE_ENV === 'production'
    ? CONFIG[ENV.production]
    : CONFIG[ENV.development]
  // #endif

  // #ifdef APP-PLUS
  return CONFIG[ENV.production] // APP 使用生产配置
  // #endif

  return CONFIG[ENV.development]
}

export default getConfig()
```

### 6.3 CI/CD 流程

#### GitHub Actions 配置

```yaml
# .github/workflows/deploy.yml
name: Deploy Mobile App

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # 微信小程序
  deploy-weixin:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build Weixin Mini Program
        run: npm run build:mp-weixin

      - name: Upload to Weixin
        uses: ./.github/actions/upload-weixin
        with:
          project-path: dist/build/mp-weixin
          app-id: ${{ secrets.WEIXIN_APP_ID }}
          private-key: ${{ secrets.WEIXIN_PRIVATE_KEY }}

  # APP 构建
  build-app:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build iOS
        run: npm run build:app-ios

      - name: Build Android
        run: npm run build:app-android

      - name: Upload Artifacts
        uses: actions/upload-artifact@v3
        with:
          name: app-builds
          path: |
            dist/build/app-ios/
            dist/build/app-android/

  # H5 部署
  deploy-h5:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build H5
        run: npm run build:h5

      - name: Deploy to CDN
        uses: ./.github/actions/deploy-cdn
        with:
          source: dist/build/h5/
          destination: /smart-village/h5/
```

#### 版本发布流程

```
1. 开发完成
    ↓
2. 创建 Pull Request
    ↓
3. 代码审查
    ↓
4. 合并到 main 分支
    ↓
5. 自动触发 CI/CD
    ├── 运行测试
    ├── 构建多端版本
    └── 自动部署
    ↓
6. 手动发布
    ├── 微信小程序：提交审核
    ├── APP：上传到应用商店
    └── H5：CDN 自动更新
    ↓
7. 监控线上状态
```

### 6.4 版本管理

#### 版本号规范

```
格式: MAJOR.MINOR.PATCH

MAJOR: 主版本号（不兼容的 API 修改）
MINOR: 次版本号（向下兼容的功能性新增）
PATCH: 修订号（向下兼容的问题修正）

示例:
  1.0.0 - 初始版本
  1.1.0 - 新增语音识别功能
  1.1.1 - 修复语音识别bug
  2.0.0 - 重大架构升级
```

#### 灰度发布策略

```javascript
// 版本灰度配置
export const GRAY_CONFIG = {
  // 当前生产版本
  production: '1.0.0',

  // 灰度版本
  gray: {
    version: '1.1.0',
    percentage: 20, // 20%用户
    criteria: {
      // 灰度条件
      region: ['浙江', '江苏'], // 指定地区
      userType: ['villager'], // 指定用户类型
      registerAfter: '2025-01-01' // 注册时间
    }
  }
}

// 检查是否应该使用灰度版本
export const checkGrayVersion = (user) => {
  const { version, percentage, criteria } = GRAY_CONFIG.gray

  // 检查灰度条件
  if (criteria.region && !criteria.region.includes(user.region)) {
    return false
  }

  if (criteria.userType && !criteria.userType.includes(user.userType)) {
    return false
  }

  // 随机灰度
  const random = Math.random() * 100
  return random < percentage
}
```

---

## 附录

### A. 关键技术决策

| 决策点 | 选择方案 | 理由 |
|-------|---------|------|
| 跨平台框架 | Uni-app | 一次开发，多端部署，社区活跃 |
| 状态管理 | Pinia | Vue 3 官方推荐，轻量简洁 |
| UI 框架 | uView UI | Uni-app 专用，组件丰富 |
| 本地存储 | SQLite + Uni.Storage | 大数据量使用 SQLite，配置使用 Storage |
| 离线同步 | 队列 + 时间戳 | 简单可靠，冲突可追踪 |

### B. 性能指标

| 指标 | 目标值 | 测量方法 |
|-----|-------|---------|
| 首屏加载时间 | < 2s | Performance API |
| 页面切换时间 | < 300ms | 自埋点 |
| API 响应时间 | < 500ms | 服务器日志 |
| 图片加载时间 | < 1s | Resource Timing |
| 内存占用 | < 100MB | 性能面板 |
| 包体积（小程序） | < 2MB | 包分析 |
| 启动时间（APP） | < 1.5s | 启动时间测试 |

### C. 依赖清单

```json
{
  "dependencies": {
    "vue": "^3.3.4",
    "pinia": "^2.1.6",
    "crypto-js": "^4.2.0"
  },
  "devDependencies": {
    "@dcloudio/vite-plugin-uni": "^3.0.0",
    "vite": "^5.0.0",
    "sass": "^1.69.0"
  }
}
```

### D. 开发规范

- **命名规范**：
  - 文件名：PascalCase (`ElderlyButton.vue`)
  - 组件名：PascalCase (`<ElderlyButton />`)
  - 变量名：camelCase (`currentTheme`)
  - 常量名：UPPER_SNAKE_CASE (`ELDERLY_MODES`)
  - 文件夹名：kebab-case (`/pages/village/`)

- **代码风格**：
  - 使用 Composition API (`<script setup>`)
  - 优先使用 `const`，其次 `let`
  - 组件 props 必须定义类型和默认值
  - 使用 ESLint + Prettier 格式化

- **注释规范**：
  - 函数必须有 JSDoc 注释
  - 复杂逻辑需要行内注释
  - TODO/FIXME 标记需要描述

---

**文档版本**：v1.0
**最后更新**：2025-12-30
**维护者**：技术架构组
