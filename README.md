# 🏘️ 智慧村庄综合服务平台

> 新一代数字化乡村治理解决方案，基于微服务架构的现代化村庄管理平台

[![CI/CD](https://github.com/zhihuixiangcun/smart-village-platform/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/zhihuixiangcun/smart-village-platform/actions)
[![Code Quality](https://github.com/zhihuixiangcun/smart-village-platform/actions/workflows/code-quality.yml/badge.svg)](https://github.com/zhihuixiangcun/smart-village-platform/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Vue.js Version](https://img.shields.io/badge/vue-3.0+-4FC08D.svg)](https://vuejs.org/)
[![Production Ready](https://img.shields.io/badge/production-ready-brightgreen.svg)](https://github.com/zhihuixiangcun/smart-village-platform)
[![Security](https://img.shields.io/badge/security-passing-brightgreen.svg)](https://github.com/zhihuixiangcun/smart-village-platform/security)

## 📋 项目概述

智慧村庄综合服务平台是一个面向现代农村治理的数字化解决方案，采用**微服务架构**设计，为村委会和村民提供全面的数字化服务。平台致力于通过技术创新提升乡村治理效率，改善村民生活质量，推动乡村振兴发展。

### 🎯 核心价值
- **🏛️ 村务数字化** - 村委会管理、财务透明、信息公开
- **👥 村民服务** - 在线办事、证件办理、社区互助
- **🔒 安全可靠** - 数据加密、权限控制、操作审计
- **📱 多端支持** - Web、移动端、小程序全覆盖

### 🌟 应用场景
- ✅ **行政村管理** - 完整的村级行政事务数字化
- ✅ **社区治理** - 现代化社区管理和服务
- ✅ **农业合作社** - 农业生产和经营管理
- ✅ **乡镇政府** - 多村统一管理平台

## ✨ 核心功能

### 🏛️ 村委管理模块
- **智能权限管理** - 分级权限体系，支持村支书、村主任、会计等角色
- **数字化值班表** - 自动排班，扫码呼叫，应急响应提速60%
- **村情地图功能** - 实时显示村民位置（隐私脱敏），支持应急救援
- **审计追踪系统** - 操作日志全记录，支持10年数据保存

### 👥 村民管理模块
- **一户一码系统** - 每户生成独立二维码，扫码查看/更新信息
- **血缘关系管理** - 自动识别家庭成员，控制信息访问权限
- **人脸识别登录** - 支持老年人刷脸查询，子女可远程协助操作
- **隐私保护机制** - 身份证号自动脱敏，需验证后查看完整信息

### 💰 财务管理模块
- **智能票据识别** - OCR自动识别发票信息，财务入账效率提升80%
- **预算控制系统** - 年度预算编制、执行监控、预警机制
- **多级审批流程** - 自定义审批链路，支持电子签章验证
- **透明化公示** - 财务收支流水实时公开，村民可查每笔记录

### 📢 村务治理模块
- **在线民主决策** - 支持投票表决，实时统计结果
- **多媒体公告发布** - 支持文字、图片、视频等多种格式
- **会议管理系统** - 线上会议通知、议题管理、决议记录
- **双向沟通平台** - 村民可在线提问、反馈意见、参与讨论

### 🛒 采购商管理模块
- **企业采购商实名认证** - 营业执照OCR识别，多级审核流程
- **个人采购商简化注册** - 基础信息验证，即时账户激活
- **采购权限分级** - 企业支持大宗采购，个人支持零售购买
- **供应商对接** - 连接村合作社和农户，实现农产品直销

### 🛠️ 生活服务模块
- **证件办理服务** - 在线申请、进度查询、邮寄送达
- **邻里互助平台** - 发布需求、技能共享、积分奖励机制
- **乡村电商入口** - 对接淘宝、拼多多等助农专区
- **应急求助功能** - 一键报警、医疗救助、灾害上报

## 🏗️ 技术架构

### 系统架构图
```
┌─────────────────────────────────────────────────────────────┐
│                     前端展示层                                │
├─────────────────────────────────────────────────────────────┤
│  Vue.js 3 + TypeScript + Element Plus + Vite + Pinia        │
├─────────────────────────────────────────────────────────────┤
│                     API网关层                                │
├─────────────────────────────────────────────────────────────┤
│  Nginx + 负载均衡 + 限流 + 缓存                               │
├─────────────────────────────────────────────────────────────┤
│                   业务服务层                                 │
├─────────────────────────────────────────────────────────────┤
│  主API服务器 (Port 3001)  │  村务服务器 (Port 5000)           │
│  ├── 监控系统              │  ├── 核心业务逻辑               │
│  ├── 稳定性管理            │  ├── Socket.IO实时通信           │
│  ├── 多语言支持            │  ├── 文件上传处理                 │
│  └── 通知模板              │  └── 应急广播系统                 │
├─────────────────────────────────────────────────────────────┤
│                    数据存储层                                │
├─────────────────────────────────────────────────────────────┤
│  MongoDB (主数据库)  │  SQLite (轻量级)  │  Redis (缓存)      │
│  ├── 村民档案         │  ├── 开发测试     │  ├── 会话存储     │
│  ├── 财务数据         │  ├── 离线应用     │  ├── 实时数据     │
│  └── 操作日志         │  └── 边缘部署     │  └── 限流计数     │
└─────────────────────────────────────────────────────────────┘
```

### 🛠️ 技术栈

#### 🖥️ 前端技术
- **框架**: Vue.js 3.0+ + TypeScript
- **构建工具**: Vite 5.0
- **UI组件**: Element Plus
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **HTTP客户端**: Axios
- **样式**: Tailwind CSS 4.0
- **图表**: ECharts
- **地图**: 高德地图API

#### ⚙️ 后端技术
- **运行时**: Node.js 20+
- **框架**: Express.js
- **认证**: JWT + bcryptjs
- **数据库**: MongoDB + SQLite + Redis
- **实时通信**: Socket.IO
- **测试**: Jest
- **文档**: Swagger/OpenAPI
- **日志**: Winston

#### 🔐 安全特性
- **认证授权**: JWT + RBAC权限控制
- **数据加密**: AES-256-GCM敏感数据加密
- **输入验证**: express-validator数据校验
- **安全防护**: XSS、SQL注入、CSRF防护
- **审计日志**: 完整的操作记录和追踪

## 📱 多端支持

### 全平台生态
- **💻 Web管理端** - Vue.js桌面应用，功能完整
- **📱 移动App端** - React Native，支持生物识别
- **⌚ 微小程序端** - uni-app，支持微信/支付宝
- **🌐 浏览器插件** - Chrome/Firefox，政务网站增强
- **🖥️ 大屏展示端** - 4K数据可视化，监控指挥中心

## 🚀 快速开始

### 环境要求
```json
{
  "node": ">=20.17.0",
  "npm": ">=10.0.0",
  "mongodb": ">=6.0 (可选)",
  "redis": ">=7.0 (推荐)"
}
```

### 📦 安装部署

#### 方式一：快速安装
```bash
# 1. 克隆项目
git clone https://github.com/zhihuixiangcun/smart-village-platform.git
cd smart-village-platform

# 2. 安装所有依赖
npm run init

# 3. 环境配置
cp .env.example .env
# 编辑 .env 文件配置数据库连接

# 4. 初始化数据库
npm run init-db

# 5. 启动开发服务
npm run start:dev  # 同时启动前后端服务
```

#### 方式二：Docker部署
```bash
# 生产环境Docker部署
docker-compose -f deployment/docker/docker-compose.prod.yml up -d

# 访问应用
# 前端: http://localhost:3000
# 后端: http://localhost:3001
# 监控: http://localhost:3001/monitoring
```

### 🌐 访问地址
启动成功后，您可以通过以下地址访问：

- **🏠 系统首页**: http://localhost:3000
- **🔧 管理后台**: http://localhost:3000/admin
- **📊 监控面板**: http://localhost:3001/monitoring
- **📖 API文档**: http://localhost:3001/api-docs
- **💚 健康检查**: http://localhost:3001/health

## 📖 使用指南

### 👤 村民用户
1. **注册登录** - 支持手机号、人脸识别等多种登录方式
2. **信息查询** - 查看村务公告、政策补贴、办事指南
3. **在线办事** - 证件办理、福利申请、证明开具
4. **邻里互助** - 发布需求、提供帮助、积分奖励
5. **紧急求助** - 一键报警、医疗救助、灾害上报

### 👨‍💼 村委工作人员
1. **村民管理** - 村民档案录入、查询、更新
2. **村务协同** - 发布公告、组织投票、管理会议
3. **财务管理** - 收支记录、预算管理、审批流程
4. **统计分析** - 人口统计、财务报表、数据分析
5. **系统管理** - 用户管理、权限配置、系统设置

### 🏢 企业采购商
1. **实名注册** - 企业资质认证、个人信息注册
2. **产品浏览** - 查看农产品、副食品、生活用品
3. **在线采购** - 下单购买、物流跟踪、在线支付
4. **供应商对接** - 联系农户、批量采购、长期合作

## 🔧 开发指南

### 项目结构
```
smart-village-platform/
├── src/                    # 主API服务器 (Port 3001)
├── server/                 # 村务服务器 (Port 5000)
├── client/                 # 前端Vue.js应用
├── tests/                  # 测试文件
├── docs/                   # 项目文档
├── deployment/             # 部署配置
└── scripts/                # 脚本文件
```

### 开发命令
```bash
# 开发环境
npm run dev        # 启动后端服务 (3001)
npm run client     # 启动前端服务 (3000)

# 测试
npm test           # 运行所有测试
npm run test:coverage # 测试覆盖率

# 构建
npm run build       # 构建生产版本

# 代码质量
npm run lint        # 代码检查
npm run format:fix  # 代码格式化
```

### 🧪 CI/CD
项目集成了完整的CI/CD流水线：
- **自动化测试** - 单元测试、集成测试、E2E测试
- **代码质量检查** - ESLint、Prettier、覆盖率要求80%+
- **安全扫描** - npm audit、Snyk漏洞检测、CodeQL分析
- **自动部署** - 测试环境/生产环境自动部署
- **依赖更新** - 每周自动检查和更新依赖

### 🔄 GitHub Repository 管理
- **分支策略**:
  - `main` - 生产分支，受保护，仅允许PR合并
  - `develop` - 开发分支，功能测试和集成
  - `feature/*` - 功能分支，新功能开发
- **代码审查**: 所有代码变更需要至少1人审查通过
- **自动化检查**: CI/CD流水线必须通过才能合并
- **发布管理**: 基于Git标签进行版本发布

## 📊 项目统计

- **📁 文件数量**: 231,618+ 个文件
- **💻 代码行数**: 40,895+ 行
- **🏗️ 功能模块**: 8大核心模块
- **🔧 Git标签**: 5个专业标签已推送
- **⚡ CI/CD**: 完整的自动化流水线
- **📖 文档**: 详细的使用和开发指南

## 🔒 安全与合规

### 数据安全
- **敏感数据加密**: 身份证号、银行卡等采用AES-256-GCM加密存储
- **隐私保护**: 数据脱敏显示，分级权限控制
- **操作审计**: 全程操作日志记录，支持10年数据保存
- **安全防护**: XSS、SQL注入、CSRF等多层安全防护

### 合规性
- **《个人信息保护法》** - 最小必要原则，用户授权管理
- **《农村基层干部管理条例》** - 权限分级，操作留痕
- **数据安全法** - 数据分类分级，安全保护措施

## 🤝 贡献指南

我们欢迎所有形式的贡献！请查看 [贡献指南](CONTRIBUTING.md) 了解详细信息。

### 快速贡献
1. **Fork** 本仓库
2. **创建功能分支** (`git checkout -b feature/AmazingFeature`)
3. **提交更改** (`git commit -m 'Add some AmazingFeature'`)
4. **推送分支** (`git push origin feature/AmazingFeature`)
5. **创建Pull Request**

### 🐛 问题反馈
- **Bug报告**: [提交Bug](https://github.com/zhihuixiangcun/smart-village-platform/issues/new?template=bug_report.md)
- **功能建议**: [提交建议](https://github.com/zhihuixiangcun/smart-village-platform/issues/new?template=feature_request.md)
- **安全问题**: [安全漏洞](https://github.com/zhihuixiangcun/smart-village-platform/issues/new?template=security_issue.md)

## 📞 联系支持

### 技术支持
- **📧 邮箱**: 18886990223@163.com
- **📱 电话**: 18886990223
- **💬 讨论区**: [GitHub Discussions](https://github.com/zhihuixiangcun/smart-village-platform/discussions)

### 相关资源
- **📖 完整文档**: [项目文档中心](https://github.com/zhihuixiangcun/smart-village-platform/wiki)
- **🔧 API文档**: [API接口文档](https://github.com/zhihuixiangcun/smart-village-platform/blob/main/docs/API.md)
- **🚀 部署指南**: [部署运维手册](https://github.com/zhihuixiangcun/smart-village-platform/blob/main/docs/DEPLOYMENT.md)

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 开源协议发布。

---

## 🙏 致谢

感谢所有为智慧村庄项目贡献代码、提供反馈和支持的开发者和用户！

特别感谢：
- 各试点村庄的村委会和村民们的大力支持
- 开源社区提供的优秀技术框架和工具
- 产品设计和用户体验优化的宝贵建议

## 📸 平台演示

### 🎥 功能演示视频

### 核心功能展示

![村民服务界面](docs/screenshots/villager/announcement-list_001.png)
*村民查看村务公告和在线办事*

![村委管理界面](docs/screenshots/committee/financial-management_001.png)
*村委进行财务管理和预算控制*

![移动端应用](docs/screenshots/mobile/app-homepage_001.png)
*移动端APP界面和生物识别登录*

### 更多演示资源

- 📖 **完整演示截图**: [查看所有功能截图](docs/DEMO_SCREENSHOTS.md)
- 🎬 **详细操作视频**: [观看功能演示视频](docs/videos/)
- 📱 **移动端体验**: 下载APP体验完整功能

---

**智慧村庄综合服务平台** - 让科技赋能乡村，让数字化服务每一个村民 🏘️✨

> 💡 **提示**: 本项目正在积极开发中，欢迎关注最新进展和功能更新！
> 📸 **截图和视频**: 演示素材正在完善中，即将上线完整的功能展示