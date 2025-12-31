# 智慧乡村移动端

> 基于 Uni-app 开发的适老化乡村移动应用

## 项目概述

智慧乡村移动端是一款专为农村村民设计的综合性移动应用，提供村务治理、村民服务、生活服务、农技社区等核心功能。项目采用适老化设计，支持大字模式、语音交互、离线同步等功能。

### 核心特性

- **适老化设计**：三种字体模式（标准/大字/超大字），语音识别与播报
- **多端发布**：一套代码发布到微信小程序、APP、H5
- **离线优先**：支持离线操作，联网后自动同步
- **安全可靠**：JWT认证、数据加密、权限控制

## 技术栈

- **框架**：Uni-app 3.0+、Vue 3.3+
- **状态管理**：Pinia 2.1+
- **UI组件**：uView 2.0+、自定义组件库
- **构建工具**：Vite 3+
- **代码规范**：ESLint + Prettier

## 项目结构

```
client-mobile/
├── src/
│   ├── api/                 # API接口定义
│   │   └── index.js         # 统一API导出
│   ├── components/          # 组件
│   │   ├── common/          # 公共组件
│   │   │   └── TabBar.vue   # 底部导航
│   │   ├── elderly/         # 适老化组件
│   │   │   └── ElderlyButton.vue
│   │   ├── voice/           # 语音组件
│   │   │   └── VoiceInput.vue
│   │   ├── offline/         # 离线组件
│   │   ├── business/        # 业务组件
│   │   └── ...
│   ├── composables/         # 组合式API
│   ├── pages/               # 页面
│   │   ├── auth/            # 认证相关
│   │   │   └── login.vue
│   │   ├── village/         # 村务治理
│   │   │   ├── index.vue            # 首页
│   │   │   ├── announcement.vue     # 公告
│   │   │   ├── vote.vue             # 投票
│   │   │   └── finance.vue          # 财务
│   │   ├── services/        # 村民服务
│   │   │   ├── index.vue            # 首页
│   │   │   └── household-qr.vue     # 一户一码
│   │   ├── life/            # 生活服务
│   │   ├── agriculture/     # 农技社区
│   │   ├── profile/         # 个人中心
│   │   └── ...
│   ├── static/              # 静态资源
│   ├── store/               # 状态管理
│   │   ├── elderly.js       # 适老化设置
│   │   ├── network.js       # 网络状态与离线同步
│   │   └── user.js          # 用户认证
│   ├── styles/              # 样式文件
│   │   ├── index.scss       # 全局样式
│   │   └── variables.scss   # 样式变量
│   ├── utils/               # 工具函数
│   │   └── request.js       # HTTP请求封装
│   ├── App.vue              # 根组件
│   ├── main.js              # 入口文件
│   └── pages.json           # 页面配置
├── package.json             # 项目配置
├── manifest.json            # Uni-app配置
├── vite.config.js           # Vite配置
└── README.md                # 项目说明
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 微信小程序
npm run dev:mp-weixin

# H5
npm run dev:h5

# APP
npm run dev:app
```

### 生产构建

```bash
# 微信小程序
npm run build:mp-weixin

# H5
npm run build:h5

# APP
npm run build:app
```

## 核心功能

### 1. 村务治理

- 📢 **村务公告**：重要通知、政策公告
- 📅 **会议通知**：村民大会、议事会议
- 🗳️ **在线投票**：民主决策、意见征集
- 💰 **财务公示**：收支透明、阳光村务

### 2. 村民服务

- 🏠 **一户一码**：家庭信息数字化管理
- 📝 **在线办事**：证件办理、福利申请
- 🪪 **证件服务**：身份证、户口本等
- 💰 **福利申请**：低保、补贴、救助

### 3. 生活服务

- 🛒 **乡村电商**：农产品直销、农资集采
- 🚗 **邻里拼车**：资源共享、绿色出行
- 🤝 **邻里互助**：互帮互助、温暖乡村

### 4. 农技社区

- 📚 **知识库**：农业技术、种植经验
- 👨‍🌾 **专家问答**：在线咨询、技术指导
- 🐛 **病虫害识别**：AI识别、防治方案
- 👥 **农友圈**：经验分享、互动交流

## 适老化设计

### 三种字体模式

| 模式 | 基础字号 | 标题字号 | 适用场景 |
|------|---------|---------|----------|
| 标准版 | 16px | 20px | 普通用户 |
| 大字版 | 18px | 24px | 老年用户 |
| 超大字版 | 24px | 32px | 视力不佳用户 |

### 语音交互

- 🎤 **语音识别**：支持普通话和6种方言
- 🔊 **语音播报**：重要信息语音提示
- ⚙️ **语音设置**：可调节语速、音调

### 高对比度

- 黑白配色，对比度 > 7:1
- 符合 WCAG AAA 标准

## 离线功能

### 离线可用功能

- 查看已缓存的公告
- 填写表单（离线保存）
- 查看本地资料

### 自动同步

- 联网后自动同步离线数据
- 冲突自动解决
- 同步状态实时提示

## API 接口

### 基础地址

- 开发环境：`http://localhost:3001/api/v1`
- 生产环境：`https://api.smartvillage.com/api/v1`

### 认证方式

```
Authorization: Bearer <access_token>
```

### 主要接口

| 模块 | 接口 | 说明 |
|------|------|------|
| 认证 | POST /auth/login | 用户登录 |
| 公告 | GET /village/announcements | 获取公告列表 |
| 投票 | POST /village/votes/:id/vote | 提交投票 |
| 一户一码 | GET /services/household-qr | 获取二维码 |
| 同步 | POST /sync/upload | 上传离线数据 |

详细API文档请参考：[docs/mobile/openapi.yaml](../docs/mobile/openapi.yaml)

## 开发规范

### 命名规范

- 文件名：kebab-case（如 `user-profile.vue`）
- 组件名：PascalCase（如 `UserProfile`）
- 变量名：camelCase（如 `userName`）
- 常量名：UPPER_SNAKE_CASE（如 `API_BASE_URL`）

### 代码风格

- 使用 2 空格缩进
- 使用单引号
- 语句末尾添加分号
- 组件使用 Composition API

### Git 提交规范

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具变动
```

## 测试

```bash
# 运行测试
npm test

# 测试覆盖率
npm run test:coverage

# 监听模式
npm run test:watch
```

## 部署

### 微信小程序

1. 使用微信开发者工具打开 `dist/dev/mp-weixin`
2. 点击"上传"按钮
3. 填写版本号和备注
4. 提交审核

### H5

1. 构建生产版本
2. 将 `dist/build/h5` 部署到服务器
3. 配置 Nginx 反向代理

### APP

1. 使用 HBuilderX 打包
2. 生成 APK/IPA 文件
3. 提交到应用商店

## 相关文档

- [产品需求文档 (PRD)](../docs/mobile/PRD.md)
- [前端架构设计](../docs/mobile/FRONTEND_ARCHITECTURE.md)
- [UI/UX设计规范](../docs/mobile/UI_UX_DESIGN.md)
- [详细设计规范](../docs/mobile/DESIGN_SPEC.md)
- [API接口文档](../docs/mobile/openapi.yaml)

## 许可证

MIT License

## 联系方式

- 项目地址：https://github.com/smart-village/mobile
- 问题反馈：https://github.com/smart-village/mobile/issues

---

**智慧乡村，温暖同行** 🏡
