# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"This is a **Smart Village Comprehensive Service Platform** (�ǻ�����ۺϷ���ƽ̨) - a full-stack application covering village resident management, governance, information publishing, and living services. The project uses a microservices-like architecture with separate backend servers, frontend client, and comprehensive monitoring systems."

### Architecture

- **Dual Backend Architecture**: Two separate Express.js servers
"  - `src/app.js` - Main API server with monitoring, i18n, and stability management (port 3001)"
  - `server/app.js` - Core village services with Socket.IO real-time features (port 5000)
- **Vue.js Frontend**: Located in `client/` directory with Vite build system
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.IO for live notifications and emergency broadcasts
- **Monitoring**: Custom real-time system monitoring with WebSocket dashboard
"- **I18n**: Multi-language support including Chinese dialects (pcc, pcc-qn)"

## Essential Commands

### Development Workflow
```bash
# Install dependencies for all parts
npm run init

"# Start main API server (monitoring, i18n, notifications)"
npm run dev  # or npm start

# Start client development server
npm run client

# Start both servers in development
npm run dev && npm run client

# Build production client
npm run build
```

### Testing
```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testNamePattern="notifications"
npm test -- tests/services/
npm test -- tests/integration/

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# Run edge case tests (Windows batch files available)
run-edge-tests.bat
run-complete-edge.bat
run-template-tests.bat
```

### Code Quality
```bash
# Lint server code
npm run lint

# Client-side linting (from client directory)
cd client && npm run lint

# Format client code
cd client && npm run format
```

### Database & Setup
```bash
# Initialize database
npm run init-db

# Setup project (runs after npm install)
npm run setup

# Health check
npm run health-check
```

## Key Architecture Components

### Main API Server (`src/app.js`)
- **Primary Port**: 3001
- **Features**: 
  - Real-time monitoring system with WebSocket dashboard
"  - System stability management (rate limiting, circuit breakers)"
  - Multi-language i18n support 
  - Notification templates and targeted messaging
  - API monitoring and health checks
- **Key Endpoints**:
  - `/monitoring` - Real-time dashboard
  - `/api/monitoring/*` - System metrics
  - `/api/stability/*` - Stability management
  - `/api/v1/notifications/*` - Notification services
  - `/api/v1/i18n/*` - Internationalization

### Village Services Server (`server/app.js`) 
- **Primary Port**: 5000
- **Features**:
"  - Core village management (residents, announcements, services)"
  - Socket.IO real-time communication
  - Emergency broadcast system
  - File upload handling
- **Socket.IO Events**:
  - `join-village` - Join village-specific rooms
  - `emergency-broadcast` - Village-wide emergency alerts

### Frontend Client (`client/`)
- **Framework**: Vue 3 + Vite
- **UI Library**: Element Plus
- **State Management**: Pinia
- **Routing**: Vue Router
- **Development Port**: 3000 (via Vite dev server)

### Testing Architecture
- **Framework**: Jest with multiple configurations
"- **Types**: Unit, Integration, Performance, E2E, Edge cases"
- **Special Configs**: 
  - `jest.config.js` - Main configuration
  - `jest.config.minimal.js` - Lightweight testing
  - `jest.config.notifications.js` - Notification-specific tests
  - `jest.config.standalone.js` - Isolated testing
- **Test Structure**:
  - `tests/unit/` - Unit tests
  - `tests/integration/` - Integration tests  
  - `tests/services/` - Service layer tests
  - `tests/edge-cases/` - Edge case scenarios
  - `tests/e2e/` - End-to-end tests

### Monitoring & Stability Systems
"- **Real-time Monitoring**: Custom WebSocket-based system collecting CPU, memory, API metrics"
- **Rate Limiting**: Multi-layer protection with adaptive thresholds
- **Circuit Breakers**: Automatic failure protection for external services
- **Health Checks**: Comprehensive system status reporting

### Internationalization (i18n)
"- **Supported Languages**: Chinese (zh-CN), Regional dialects (pcc, pcc-qn)"
- **Structure**: `src/i18n/locales/[language]/[domain].json`
"- **Domains**: common, village, services, notifications, cultural"
"- **Features**: Cultural adaptation, language detection, translator utilities"

## Development Guidelines

### Running Tests
- Use `maxWorkers: 1` in Jest to avoid database conflicts
- Tests run sequentially for stability
- Multiple test runners available via batch files for Windows development
- Test timeout set to 15 seconds for integration tests

### Environment Configuration
- Copy `.env.example` to `.env` for local development
- Key variables:
  - `NODE_ENV` - Environment mode
  - `MONGO_URI` - MongoDB connection
  - `JWT_SECRET` - Authentication secret
  - `CLIENT_URL` - CORS configuration
"  - External service APIs (Baidu TTS, Tencent OCR, SMS)"

### Database Models
- Located in both `src/models/` and `server/models/`
"- Key models: User, Village, Announcement"
- TypeScript definitions available (`server/models/User.ts`)

### API Validation
#NAME?
- Custom middleware in `src/middleware/apiValidation.js`
- Rate limiting and security headers via Helmet

### File Structure Patterns
- Services in `src/services/` and `server/services/`
- Routes follow RESTful conventions
- Middleware organized by functionality
- Utils and helpers separated by domain

## Monitoring Dashboard

Access the real-time monitoring dashboard at `http://localhost:3001/monitoring` when the main server is running. The dashboard shows:
"- System performance metrics (CPU, memory)"
- API request statistics
#NAME?
- WebSocket connection status

## Production Considerations

- Both servers need to run in production
- Configure reverse proxy to handle dual-port setup
- Set appropriate environment variables for external services
- Enable production logging and monitoring
- Configure MongoDB connection pooling
- Set up proper CORS origins for production domains


### CSS���
ʹ��tailwind4
- 项目增加如下模块功能：一、核心功能模块
村委管理
村委信息：在职人员信息、添加、修改、删除、调任、调任，党员信息
村务协同：支持公告发布、会议通知、政策宣传，村民可在线提问、反馈意见及参与讨论，形成双向沟通平台。
任务调度：整合网格员、志愿者等力量，实现安全生产、疫情防控等任务的“一网统管、一键呼叫、一屏调度”。
村民管理
信息数字化：建立村民档案库，涵盖户籍、住房、健康状态、家庭类型（如低保户、独生户）等数据。
在线办事：提供证件办理、福利申请等一站式服务，减少线下跑动。
村务治理
财务管理：记录收支流水，生成财务报表，支持预算编制与资金审批流程，确保透明化监管。
项目管理：全周期管理村内项目（申报→审批→实施→验收），实时跟踪进度并预警风险。
信息公示
政策与公告：集中发布本地政策法规、村务通知，支持关键词（信息查询、表单填写）支持无网络环境使用，数据联网后自动同步。
易操作性
语音交互：支持方言识别（如粤语、闽南语），村民可通过语音输入查询或提交需求。
大字模式：字体与触控区域放大，适配老年用户；读屏功能辅助视障群体操作。
高安全性
数据加密：敏感信息（如身份证、银行卡）采用AES/RSA加密传输与存储。
权限管控：分级权限管理（如村干部仅可访问本村数据），操作日志全留存可追溯。
全闭环设计
流程闭环：关键操作（如投诉、资金审批）需状态反馈与结果确认，确保问题100%跟进。
容错机制：表单输入实时校验，错误操作提供撤销路径（如删除确认弹窗）。
三、农村场景适配案例
方言语音输入：识别22种方言，解决老年用户打字困难。
应急离线功能：山区信号弱时仍可提交灾害上报、医疗求助等信息。
企业协同：如瓶窑镇“凤小智”平模块    升级功能           村民价值（痛点解决）
村委管理：新增「智能值班表」    扫码一键呼叫值班人员，应急事件响应提速60%
                嵌入「村情地图」功能    实时显示村民位置（隐私脱敏），暴雨/火情时快速救援
村民管理：扩展「家庭档案」为「一户一码」    每户生成独立二维码，扫码即可查看/更新信息（如疫苗接种状态）
村务治理：增加「智能票据OCR识别」    拍照自动识别发票信息，财务入账效率提升80%
信息公示：上线「政策计算器」    输入家庭人数、土地面积自动测算补贴金额（例：耕地保护补贴）
村民查询：支持「人脸识别登录+亲属代理」    老人刷脸即可查补贴，子女可远程协助操作
上级任务对接：新增「AI填表助手」    语音输入自动生成报表（如人口普查表），填报时间减少70%
生活服务：整合「乡村级
安全防护强化
风险场景    防御方案
电信诈骗    对陌生号码来电弹窗警示，并联动公安反诈平台实时拦截
隐私泄露    敏感信息（身份证号）展示时自动打码，需人脸识别才能查看完整信息
数据篡改    采用区块链存证技术，村级财务流水上链不可篡改
外部生态连接
政务系统打通：对接省政务平台，实现户籍、社保数据自动同步，减少村民重复填报。
企业资源接入：
农资公司：化肥/种子价格实时比价，支持村级集采优惠
银行服务：嵌入农商行小额贷款入口，信用良好的村民可秒批贷款
四、闭环运营与激励体系
村民参与度提升设计
「积分制」治理
参与村务（如投票、环境整治）可获积分，1积分=1元，可在村超市兑换商品。
积分排行每月公示，前十名获“荣誉村民”称号（享受体检优先等福利）。
政企联动服务落地
五、数据赋能乡村治理（管检任务）
村级应急响应
一键启动防汛/火灾预案，定位村内救援设备（水泵、灭火器）
二、村民档案动态管理
一户一码
每户生成专属二维码，扫码可更新信息（如新生儿登记）
家庭状态标签
自动标记特殊家庭（独居老人、低保户），触发定向关怀
三、阳光村务系统
功能    创新点
财务透明化    扫描发票自动录入支出，村民可查每笔流水
工程进度监督    村民拍照上传村路修建质量，自动转督办工单
四、精准信息推送
政策计算器：输入耕地面积自动算补贴
方言播报：重要政策AI转为方言语音推送给老人
五、村民自助服务台
远程认证：子女在外地帮父母刷脸办医保
邻里互助：发布需求（如收稻缺人手），村民抢单赚积分
六、乡村生活服务圈
图片
代码

七、上级联动枢纽
数据自动上报：人口报表AI生成，直传县政务云
跨域资源调度：干旱时自动申请制
村级管理员账户
专属身份标识：每个行政村仅允许存在1个管理员账号

任职流程：
A[新任村委申请] --> B(上传身份证正反面+乡镇任命红头文件)
B --> C[系统OCR核验证件真伪]
C --> D{现任管理员审核}
D --通过--> E[原账号移交：保留历史操作日志]
D --驳回--> F[短信告知驳回原因]
权限范围：可管理全村数据，但禁止查看村民敏感信息字段（如身份证号完整展示需脱敏）

2. 村委人员信息披露规则
普通村民端展示：姓名+职务+联系电话（脱敏为138****1234）

村民查看方式：需通过人脸活体认证后解锁本村村委名单
村民信息查询模块
1. 个人数据保护闭环
血缘关系自动绑定
系统根据户籍档案生成家族树：
查询结果强制脱敏规则

  字段                       本人可见                     家人可见                他人可见
身份证号                  完整显示                      后四位                    见)
该方案满足《个人信息保护法》第22条最小必要原则，村委后台操作日志保存时间延长至10年以备审计，预计需增加开发周期15天。
以下是针对村委人员信息管理和村民信息查询功能的补充设计方案，在原有框架基础上强化权限控制和数据安全：
一、村委人员信息管理模块（新增）
分级权限体系
管理员（1人/村）
• 任职要求：需上传身份证正反面+加盖公章的村委会任命书至平台人工审核
• 特权：可分配/回收其他村委账号权限（如会计/人口主任等角色权限模板）
• 变更流程：原管理员发起离职申请→村支书人脸识别确认→新管理员重新认证
职务权限模板

| 角色          | 可操作功能                  | 数据访问范围          |
|---------------|---------------------------|---------------------|
| 村支书        | 所有功能+审计日志查看       | 全村数据            |
| 会计          | 财务公开主申报

处置权限：

• 管理员可执行「标记为非在村」操作（保留基础档案但隐藏联系方式）
• 需填写处置原因（如：长期失联/城镇定居）并上传证明材料
三、安全增强措施
操作溯源看板

村民端：在「个人中心」显示最近3次信息被查询记录（例："9.3 10:15 村会计王XX查看您的医保参保状态"）

管理端：敏感操作强制水印（包含操作者ID+时间戳）

数据边界保护

本村数据隔离：采用「村编码+户编号」双层加密存储，跨村查询需乡镇级授权

导出限制：任何批量导出操作需触发短信验证码+村级平台备案

权限变更审计日志示例

[2025-09-05 14:30] 
操作类型：管理员变更 
执行人：张XX（原管理员370****1215） 
新管理员：李XX（370****0912） 
验证文件：/upload/20250905/授权书_盖章.jpg 
审核状态：已通过（村支书王XX人脸验证）

该方案通过「动态权限继承+血缘智能绑定+多层审计审计日志查看       | 全村数据            |
| 会计          | 财务公开+资产登记           | 经济类数据          |
| 人口主任      | 生育登记+互助圈管理         | 人口类数据          |
历史追溯机制

所有村委账号实行「人岗分离」设计，人员离职时：

→ 账号自动转为「历史职务」状态（保留操作记录但禁止新操作）
→ 新任人员继承原角色权限需重新人脸验证
二、村民信息查询安全机制（强化）
血缘关系验证系统

自动关联范围：配偶/父母/子女/同户籍兄弟姐妹

特殊情形处理：

• 收养关系：需上传民政部门证明由管理员人工绑定
• 分户情况：原家庭关系保留「历史关联」标签
三重查询校验
    A[村民发起查询] --> B{身份认证}
    B -->|人脸识别| C[调取本人信息]
    B -->|输入家人身份证号| D{系统校验}
    D -->|血缘库匹配成功| E[显示关联家人信息]
    D -->|匹配失败| F[向管理人脸验证）
该方案通过「动态权限继承+血缘智能绑定+多层审计追踪」，在保障村民隐私的前提下实现必要的信息透明，符合《个人信息保护法》和《农村基层干部管理条例》双重规范要求。建议在二期开发时优先实施，与原有村民档案模块做深度集成。

实现乡村拼车
发图文、视频等朋友圈功邻村共享水泵
八、理者视角）
镇级驾驶舱大电商」入口    直接对接淘宝/拼多多助农专区，村民特产一键
- 核心定位：连接城乡的农业知识共享与乡村生活展示平台

一、核心功能模块
动态发布系统

农业图文帖：支持上传高清图片+文字描述（含作物生长记录、病虫害防治、农业技术教程）
乡村短视频：1-3分钟竖屏视频（农产品采摘实况、农机操作教学、农家生活展示）
智能标签推荐：AI自动识别内容（如“水稻种植”“有机施肥”），匹配相关农技知识库
知识图谱引擎

按作物类型（粮油/果蔬/畜牧）、季节、地域智能归类内容
农科院专家认证专栏（每周农业气象预警+种植建议）
病虫害图鉴功能：拍照识别作物异常状态，推送防治方案
社交互动矩阵

三层传播机制：
基础互动：点赞/收藏/评论（突出实用价值标签如“已验证有效”）
达人体系：认证农技员/种植能手专属标识
裂变激励：分享农业技术至微信/抖音可兑换农资优惠券
二、特色运营设计
田间直播间：对，预计可使农业技术传播效率提升300%。需要试点地区合作社入驻支撑内容真实性验证。

---

## 🤖 智能体技能系统 (AI Agent Skills System)

本项目集成了 **65个专业智能体**，可通过用户指令自动调用以完成特定任务。智能体技能文件存储在 `.claude/skills/` 目录。

### 快速调用指南

#### 按任务类型选择智能体

```
前端组件开发     → frontend-developer
后端API设计      → backend-architect
数据库优化       → database-optimizer
安全审计         → security-auditor
代码审查         → code-reviewer
性能优化         → performance-engineer
UI设计           → ui-ux-designer
API文档          → api-documenter
测试自动化       → test-automator
云部署           → deployment-engineer
AI功能开发       → ai-engineer
数据分析         → data-scientist
调试问题         → debugger / error-detective
产品规划         → product-manager-expert
```

#### 智能体分类索引

**🎨 前端与设计 (3个)**
- `frontend-developer` - React组件与响应式布局
- `ui-ux-designer` - UI/UX设计与原型
- `mermaid-expert` - Mermaid图表专家

**⚙️ 后端开发 (12个)**
- `backend-architect` - RESTful API与微服务架构
- `graphql-architect` - GraphQL schema设计
- `python-pro` / `javascript-pro` / `typescript-pro` - 语言专家
- `java-pro` / `golang-pro` / `csharp-pro` - 企业级语言
- `c-pro` / `cpp-pro` / `rust-pro` - 系统级语言
- `php-pro` / `ruby-pro` / `elixir-pro` / `scala-pro` - 其他语言

**🗄️ 数据与AI (9个)**
- `data-engineer` - ETL管道与数据仓库
- `data-scientist` - 数据分析与SQL
- `ai-engineer` - LLM应用与RAG系统
- `ml-engineer` - ML管道与模型部署
- `mlops-engineer` - ML实验跟踪
- `prompt-engineer` - 提示词优化
- `database-admin` - 数据库运维
- `database-optimizer` - SQL优化
- `sql-pro` - 复杂查询专家

**☁️ 运维与部署 (5个)**
- `cloud-architect` - AWS/Azure/GCP架构
- `deployment-engineer` - CI/CD与Kubernetes
- `devops-troubleshooter` - 生产问题调试
- `terraform-specialist` - Terraform IaC
- `incident-responder` - 应急响应

**🔒 安全与测试 (7个)**
- `security-auditor` - 代码安全审计
- `code-reviewer` - 代码质量审查
- `test-automator` - 测试自动化
- `debugger` - 错误调试
- `error-detective` - 错误模式分析
- `performance-engineer` - 性能优化
- `architect-reviewer` - 架构审查

**📱 移动端开发 (4个)**
- `mobile-developer` - React Native/Flutter
- `flutter-expert` - Flutter专家
- `ios-developer` - iOS原生开发
- `unity-developer` - Unity游戏开发

**🌐 网络与基础设施 (2个)**
- `network-engineer` - 网络连接与DNS/SSL
- `payment-integration` - 支付集成

**📚 文档与教育 (4个)**
- `docs-architect` - 技术文档创建
- `api-documenter` - OpenAPI/Swagger规范
- `tutorial-engineer` - 教程编写
- `reference-builder` - 技术参考文档

**💼 商业与管理 (8个)**
- `product-manager-expert` - 产品规划与PRD
- `business-analyst` - 指标分析与KPI
- `content-marketer` - 内容营销
- `customer-support` - 客户支持
- `legal-advisor` - 法律文档
- `sales-automator` - 销售自动化
- `quant-analyst` - 金融模型
- `risk-manager` - 风险管理

**🔧 工具与技能系统 (3个)**
- `dx-optimizer` - 开发者体验优化
- `legacy-modernizer` - 遗留系统现代化
- `skill-creator` / `skill-share` - 技能创建与分享

**🎮 专项领域 (2个)**
- `minecraft-bukkit-pro` - Minecraft插件开发
- `search-specialist` - 网络搜索与研究

### 智能体调用方式

#### 方式1: 直接描述需求
```
"请调用 frontend-developer 智能体来创建Vue组件"
"使用 backend-architect 设计用户认证API"
```

#### 方式2: 组合调用多个智能体
```
全栈开发:
  frontend-developer + backend-architect + database-optimizer

微服务架构:
  backend-architect + cloud-architect + devops-troubleshooter

AI应用:
  ai-engineer + prompt-engineer + data-engineer

移动应用:
  mobile-developer + ui-ux-designer + backend-architect

测试完整流程:
  test-automator + security-auditor + performance-engineer
```

#### 方式3: 产品开发全流程
使用 `product-manager-expert` 启动完整的产品开发流程:

1. **需求分析阶段**: `product-manager-expert` + `business-analyst`
2. **架构设计阶段**: `backend-architect` + `cloud-architect` + `database-optimizer`
3. **UI/UX设计阶段**: `ui-ux-designer` + `frontend-developer`
4. **开发实现阶段**: 各编程语言专家 + `code-reviewer`
5. **测试部署阶段**: `test-automator` + `security-auditor` + `deployment-engineer`

### 智能体核心能力详解

#### 产品经理专家 (product-manager-expert)
- **核心能力**: 需求分析、PRD文档生成、市场调研、功能规划、竞品分析
- **执行流程**:
  1. 需求信息调研 - 梳理核心功能与目标用户
  2. 市场调研 - 分析市场规模与竞争态势
  3. 需求优先级分析 - 评估价值与确定MVP范围
  4. 生成PRD文档 - 标准化产品需求文档
- **输出**: PRD文档、产品概述、功能清单、流程图、原型设计

#### 后端架构师 (backend-architect)
- **核心能力**: RESTful API设计、微服务边界、数据库schema、缓存策略
- **输出**: API端点定义、服务架构图、数据库schema、技术选型建议
- **适用场景**: 创建新后端服务、API设计、系统架构规划

#### 前端开发专家 (frontend-developer)
- **核心能力**: React/Vue组件架构、响应式设计、状态管理、性能优化
- **输出**: 完整前端组件、样式方案、状态管理实现、单元测试结构
- **适用场景**: 创建UI组件、修复前端问题、性能优化

#### AI工程师 (ai-engineer)
- **核心能力**: LLM集成、RAG系统、提示词工程、智能体编排
- **输出**: LLM集成代码、RAG管道、提示词模板、向量数据库设置
- **适用场景**: 开发AI功能、聊天机器人、AI驱动的应用

#### 代码审查专家 (code-reviewer)
- **核心能力**: 代码质量审查、配置安全审计、性能分析
- **特别关注**: 配置文件变更、连接池设置、超时配置、安全漏洞
- **输出**: 分级审查报告(CRITICAL/HIGH/SUGGESTIONS)、安全风险识别
- **适用场景**: 代码合并前审查、安全审计、性能问题诊断

### 使用示例

#### 示例1: 开发新功能
```
"我需要为智慧乡村平台添加'邻里互助'功能，请调用相关智能体完成以下任务:
1. product-manager-expert: 编写PRD文档
2. backend-architect: 设计API接口
3. database-optimizer: 设计数据库schema
4. frontend-developer: 开发前端组件
5. code-reviewer: 审查代码质量
6. test-automator: 编写测试用例"
```

#### 示例2: 性能优化
```
"系统响应速度慢，请调用以下智能体诊断和优化:
1. performance-engineer: 分析性能瓶颈
2. database-optimizer: 优化数据库查询
3. code-reviewer: 审查代码性能问题
4. architect-reviewer: 审查架构设计"
```

#### 示例3: 安全审计
```
"请调用 security-auditor 智能体对以下代码进行安全审计:
- 认证授权逻辑
- 敏感数据处理
- API接口安全"
```

#### 示例4: AI功能开发
```
"请调用 ai-engineer 智能体为智慧乡村平台开发以下AI功能:
1. 智能客服助手 - 回答村民常见问题
2. 政策匹配助手 - 根据用户情况推荐适合的政策补贴
3. 农业知识问答 - 解答农业生产技术问题"
```

### 智能体协作原则

1. **明确任务目标**: 清晰描述需要完成的任务
2. **选择合适智能体**: 根据任务类型选择最匹配的智能体
3. **组合使用**: 复杂任务可组合多个智能体协同工作
4. **迭代优化**: 智能体输出可反复优化直到满意
5. **代码审查**: 代码编写后自动触发 code-reviewer 审查

### 智能体文件存储位置

所有智能体技能文件位于: `.claude/skills/[智能体名称]/SKILL.md`

示例:
- `.claude/skills/backend-architect/SKILL.md`
- `.claude/skills/frontend-developer/SKILL.md`
- `.claude/skills/ai-engineer/SKILL.md`
- `.claude/skills/product manager expert/SKILL.md`

### 技能管理

#### 查看所有可用智能体
```bash
# 查看 SKILLS_INDEX.md 获取完整列表
cat .claude/SKILLS_INDEX.md
```

#### 创建新技能
```bash
# 使用 skill-creator 智能体创建新技能
"请使用 skill-creator 智能体创建一个新的 [技能名称]"
```

#### 分享技能
```bash
# 使用 skill-share 智能体分享技能
"请使用 skill-share 智能体将 [技能名称] 分享到社区"
```

---

**最后更新**: 2026-01-08
**智能体总数**: 65个
**维护位置**: `.claude/skills/`
**详细索引**: `.claude/SKILLS_INDEX.md`