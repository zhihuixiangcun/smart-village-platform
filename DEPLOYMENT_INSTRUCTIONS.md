# 🚀 智慧村庄平台 - Git仓库使用和部署指南

## 📋 目录
- [仓库概述](#仓库概述)
- [环境准备](#环境准备)
- [Git克隆和设置](#git克隆和设置)
- [本地开发](#本地开发)
- [生产部署](#生产部署)
- [版本管理](#版本管理)
- [协作规范](#协作规范)

## 📦 仓库概述

### 🏗️ 项目结构
```
smart-village-platform/
├── 📁 client/                 # Vue.js前端应用
│   ├── 📁 src/
│   │   ├── 📁 components/     # Vue组件
│   │   ├── 📁 views/          # 页面视图
│   │   ├── 📁 api/            # API接口
│   │   └── 📁 stores/         # 状态管理
│   ├── 📄 package.json
│   └── 📄 vite.config.js
├── 📁 src/                   # 后端服务源码
│   ├── 📁 controllers/        # 控制器
│   ├── 📁 models/            # 数据模型
│   ├── 📁 routes/            # 路由定义
│   ├── 📁 services/          # 业务服务
│   ├── 📁 middleware/        # 中间件
│   └── 📁 security/          # 安全模块
├── 📁 gateway/               # API网关
├── 📁 deployment/            # 部署配置
│   ├── 📁 docker/            # Docker配置
│   ├── 📁 k8s/              # Kubernetes配置
│   └── 📁 scripts/          # 部署脚本
├── 📁 monitoring/            # 监控配置
│   ├── 📁 dashboard/         # 监控仪表板
│   ├── 📁 grafana/           # Grafana配置
│   └── 📁 prometheus/        # Prometheus配置
├── 📁 tests/                 # 测试文件
├── 📁 docs/                  # 项目文档
└── 📄 package.json           # 项目配置
```

## 🛠️ 环境准备

### 系统要求
- **Node.js**: >= 20.17.0
- **npm**: >= 9.0.0
- **Docker**: >= 20.10.0
- **Docker Compose**: >= 2.0.0
- **MongoDB**: >= 6.0
- **Redis**: >= 7.0

### 开发工具
- **IDE**: VS Code / WebStorm
- **Git**: >= 2.30.0
- **浏览器**: Chrome 90+ / Firefox 88+

## 📥 Git克隆和设置

### 1. 克隆仓库
```bash
# 克隆主仓库
git clone https://github.com/zhihuixiangcun/smart-village-platform.git

# 进入项目目录
cd smart-village-platform

# 查看分支
git branch -a
```

### 2. 环境配置
```bash
# 复制环境配置文件
cp deployment/.env.production.example .env

# 编辑环境配置
vim .env
```

### 3. 安装依赖
```bash
# 安装根目录依赖
npm install

# 安装前端依赖
cd client && npm install && cd ..

# 安装后端依赖 (如果需要)
npm install
```

### 4. 初始化数据库
```bash
# 启动MongoDB和Redis
docker-compose -f deployment/docker/docker-compose.dev.yml up -d mongodb redis

# 初始化数据库
npm run init-db
```

## 💻 本地开发

### 启动开发服务
```bash
# 启动后端服务 (端口 3001)
npm run dev

# 启动前端服务 (端口 3000) - 新终端
npm run client

# 启动API网关 (端口 8080) - 新终端
cd gateway && node app.js
```

### 开发工具
```bash
# 代码格式化
npm run lint

# 运行测试
npm test

# 查看测试覆盖率
npm run test:coverage

# 启动监控服务
node src/services/production-monitoring.js
```

### 常用Git命令
```bash
# 查看状态
git status

# 添加文件
git add .

# 提交代码
git commit -m "feat: 添加新功能"

# 推送到远程
git push origin main

# 拉取更新
git pull origin main

# 创建功能分支
git checkout -b feature/新功能名称
```

## 🌐 生产部署

### Docker部署 (推荐)
```bash
# 使用生产配置
cp deployment/.env.production .env

# 启动所有服务
docker-compose -f deployment/docker/docker-compose.prod.yml up -d

# 查看服务状态
docker-compose -f deployment/docker/docker-compose.prod.yml ps

# 查看日志
docker-compose -f deployment/docker/docker-compose.prod.yml logs -f
```

### 自动化部署脚本
```bash
# 设置执行权限
chmod +x deployment/scripts/deploy-production.sh

# 执行部署
./deployment/scripts/deploy-production.sh production v1.0.0

# 带备份的部署
./deployment/scripts/deploy-production.sh production v1.0.0 -b

# 回滚到上一版本
./deployment/scripts/deploy-production.sh production --rollback
```

### 服务访问地址
- **主应用**: http://localhost:3000
- **API网关**: http://localhost:8080
- **监控仪表板**: http://localhost:3099/monitoring
- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090

## 🏷️ 版本管理

### 版本号规范
遵循语义化版本控制 (Semantic Versioning):
- **主版本号**: 不兼容的API修改
- **次版本号**: 向下兼容的功能性新增
- **修订号**: 向下兼容的问题修正

### 分支策略
- **main**: 主分支，生产环境代码
- **develop**: 开发分支，功能集成
- **feature/***: 功能分支
- **hotfix/***: 紧急修复分支
- **release/***: 发布分支

### 提交规范
```bash
# 格式: <type>(<scope>): <description>

# 类型说明
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建过程或辅助工具的变动

# 示例
feat(auth): 添加JWT认证功能
fix(database): 修复用户查询bug
docs(api): 更新API文档
```

## 👥 协作规范

### 开发流程
1. **创建功能分支**
   ```bash
   git checkout -b feature/村民管理模块
   ```

2. **开发和测试**
   ```bash
   # 开发功能
   # 运行测试
   npm test
   ```

3. **提交代码**
   ```bash
   git add .
   git commit -m "feat: 实现村民管理核心功能"
   git push origin feature/村民管理模块
   ```

4. **创建Pull Request**
   - 在GitHub上创建PR
   - 填写详细描述
   - 等待代码审查

5. **合并代码**
   - 审查通过后合并到main分支
   - 删除功能分支

### 代码审查
- ✅ 代码符合项目规范
- ✅ 功能测试通过
- ✅ 无安全漏洞
- ✅ 文档更新完整
- ✅ 性能影响评估

### 发布流程
1. **版本测试**
   ```bash
   # 运行完整测试套件
   npm run test:coverage

   # 执行端到端测试
   npm run test:e2e
   ```

2. **创建发布分支**
   ```bash
   git checkout -b release/v1.0.0
   ```

3. **版本标记**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

4. **生产部署**
   ```bash
   ./deployment/scripts/deploy-production.sh production v1.0.0
   ```

## 🔧 故障排除

### 常见问题

#### 1. 依赖安装失败
```bash
# 清除npm缓存
npm cache clean --force

# 删除node_modules重新安装
rm -rf node_modules package-lock.json
npm install
```

#### 2. 数据库连接失败
```bash
# 检查MongoDB服务
docker ps | grep mongodb

# 查看MongoDB日志
docker logs smart-village-mongodb
```

#### 3. 端口冲突
```bash
# 查看端口占用
netstat -tulpn | grep :3000

# 修改端口配置
vim .env
```

#### 4. 权限问题
```bash
# 修改文件权限
chmod +x deployment/scripts/*.sh

# Docker权限问题
sudo usermod -aG docker $USER
```

### 获取帮助
- 📖 [项目文档](docs/)
- 🐛 [问题反馈](https://github.com/zhihuixiangcun/smart-village-platform/issues)
- 💬 [讨论区](https://github.com/zhihuixiangcun/smart-village-platform/discussions)

## 📞 联系方式
- **项目维护**: admin@smartvillage.com
- **技术支持**: support@smartvillage.com
- **GitHub**: https://github.com/zhihuixiangcun/smart-village-platform

---

**🎯 让我们一起建设智慧乡村，共创美好未来！**