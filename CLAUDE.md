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