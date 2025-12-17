# Smart Village Platform - 仓库说明

## 项目简介
智慧村庄综合服务平台 (Smart Village Comprehensive Service Platform) - 新一代数字化乡村治理解决方案

## 技术栈
### 前端
- **Vue.js 3** - 渐进式JavaScript框架
- **Element Plus** - 企业级UI组件库
- **Tailwind CSS 4** - 实用优先的CSS框架
- **Vite** - 现代化前端构建工具
- **Pinia** - Vue状态管理库

### 后端
- **Node.js** - JavaScript运行时
- **Express.js** - Web应用框架
- **Socket.IO** - 实时双向通信
- **MongoDB** - NoSQL数据库
- **Redis** - 内存数据库
- **Mongoose** - MongoDB对象建模

### 部署与监控
- **Docker** - 容器化部署
- **Prometheus** - 监控指标收集
- **Grafana** - 数据可视化
- **Winston** - 日志管理
- **JWT** - 身份认证

## 核心功能
- ✅ 村民信息管理（档案库、数字化服务）
- ✅ 村务协同治理（公告、会议、政策宣传）
- ✅ 任务调度系统（一键呼叫、一屏调度）
- ✅ 财务透明化管理（收支记录、报表生成）
- ✅ 项目全周期管理（申报→审批→实施→验收）
- ✅ 信息发布平台（政策公告、关键词查询）
- ✅ 语音交互支持（方言识别、大字模式）
- ✅ 高级安全防护（数据加密、权限管控）
- ✅ 实时监控告警（系统性能、API监控）
- ✅ 生产环境部署（Docker化、自动化脚本）

## 项目特色
1. **微服务架构** - 模块化设计，易于扩展和维护
2. **实时通信** - 基于WebSocket的即时消息推送
3. **多端适配** - 响应式设计，支持移动端访问
4. **离线支持** - 关键功能支持无网络环境使用
5. **智能化** - 集成AI功能，提升用户体验
6. **安全性** - 多层安全防护，符合等保要求
7. **可扩展** - 支持水平扩展，满足大规模部署

## 部署说明
项目支持两种部署方式：

### 开发环境
```bash
# 安装依赖
npm run init

# 启动后端服务
npm run dev

# 启动前端服务
npm run client
```

### 生产环境
```bash
# 使用Docker部署
docker-compose -f deployment/docker/docker-compose.prod.yml up -d

# 或使用部署脚本
./deployment/scripts/deploy-production.sh
```

## 监控面板
- **系统监控**: http://localhost:3001/monitoring
- **Grafana仪表板**: http://localhost:3002/grafana
- **健康检查**: http://localhost:3001/health

## API文档
- **主API服务**: http://localhost:3001/api/v1
- **村庄服务**: http://localhost:5000/api
- **监控API**: http://localhost:3001/api/monitoring

## 项目结构
```
smart-village-platform/
├── client/                  # 前端Vue.js应用
├── src/                     # 主API服务和监控
├── server/                  # 村庄服务
├── deployment/              # 部署配置
│   ├── docker/             # Docker配置
│   ├── nginx/              # Nginx配置
│   └── scripts/            # 部署脚本
├── tests/                   # 测试文件
├── docs/                    # 项目文档
└── monitoring/              # 监控配置
```

## 开发团队
本项目由智慧乡村开发团队倾力打造，致力于推动乡村数字化转型。

## 开源协议
本项目采用 MIT 开源协议，欢迎社区贡献。

## 联系我们
- 邮箱: dev@smart-village.com
- 文档: https://docs.smart-village.com
- 问题反馈: https://github.com/zhihuixiangcun/smart-village-platform/issues

---

🚀 **智慧乡村，数字未来** - 让科技赋能美丽乡村建设！