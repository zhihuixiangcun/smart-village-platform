# 开发环境搭建指南

## 环境要求

### 系统要求
- **操作系统**: Windows 10/11, macOS 10.15+, Ubuntu 18.04+
- **Node.js**: 20.17.0+ (当前: 24.11.1 ✅)
- **npm**: 7.0+ (当前: 11.6.2 ✅)
- **Git**: 2.30+

### 数据库要求
- **MongoDB**: 6.0+
- **Redis**: 7.0+

### 开发工具
- **IDE**: VS Code (推荐)
- **浏览器**: Chrome 90+
- **API测试**: Postman 或 Insomnia

## 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd smart-village-platform
```

### 2. 安装依赖
```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd client
npm install
cd ..
```

### 3. 环境配置
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

### 4. 启动服务
```bash
# 启动MongoDB (本地)
mongod

# 启动Redis (本地)
redis-server

# 启动后端服务
npm run dev

# 启动前端服务 (新终端)
npm run client
```

## 环境变量配置

### .env 文件示例
```env
# 应用配置
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:3000

# 数据库配置
MONGO_URI=mongodb://localhost:27017/smart_village
REDIS_URL=redis://localhost:6379

# JWT配置
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# 第三方服务
# 百度语音识别
BAIDU_API_KEY=your-baidu-api-key
BAIDU_SECRET_KEY=your-baidu-secret-key

# 腾讯OCR
TENCENT_SECRET_ID=your-tencent-secret-id
TENCENT_SECRET_KEY=your-tencent-secret-key

# 阿里云短信
ALIYUN_ACCESS_KEY_ID=your-aliyun-access-key
ALIYUN_ACCESS_KEY_SECRET=your-aliyun-secret

# 人脸识别服务
FACE_RECOGNITION_PROVIDER=tencentyun
```

## 开发工具配置

### VS Code 推荐插件
```json
{
  "recommendations": [
    "ms-vscode.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "mongodb.mongodb-vscode",
    "humao.rest-client"
  ]
}
```

### VS Code 工作区配置 (.vscode/settings.json)
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "vue": "html"
  },
  "files.associations": {
    "*.js": "javascript"
  }
}
```

### Git 配置 (.gitignore)
```gitignore
# 依赖
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# 环境变量
.env
.env.local
.env.*.local

# 临时文件
.tmp/
.temp/

# 日志
logs/
*.log

# 覆盖率
coverage/

# IDE
.vscode/settings.json
.idea/

# 操作系统
.DS_Store
Thumbs.db

# 构建产物
dist/
build/

# 上传文件
uploads/
public/uploads/
```

## 数据库初始化

### MongoDB 设置
```bash
# 连接MongoDB
mongo

# 创建数据库
use smart_village

# 创建管理员用户
db.createUser({
  user: "admin",
  pwd: "password123",
  roles: [
    { role: "readWrite", db: "smart_village" },
    { role: "dbAdmin", db: "smart_village" }
  ]
})

# 创建基础集合
db.createCollection("users")
db.createCollection("committees")
db.createCollection("residents")
db.createCollection("announcements")
```

### Redis 设置
```bash
# 启动Redis
redis-server

# 测试连接
redis-cli ping
# 应该返回: PONG
```

## 开发脚本

### package.json 脚本说明
```json
{
  "scripts": {
    "start": "node src/app.js",           // 生产环境启动
    "dev": "nodemon src/app.js",         // 开发环境启动
    "client": "cd client && npm run dev", // 启动前端
    "test": "jest",                      // 运行测试
    "test:watch": "jest --watch",        // 监听模式测试
    "test:coverage": "jest --coverage",  // 测试覆盖率
    "lint": "eslint src/ --fix",         // 代码检查
    "build": "cd client && npm run build"// 构建前端
  }
}
```

## 调试配置

### VS Code 调试配置 (.vscode/launch.json)
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/app.js",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "restart": true,
      "runtimeExecutable": "nodemon"
    }
  ]
}
```

## 常见问题

### 1. MongoDB连接失败
```bash
# 检查MongoDB是否运行
netstat -ano | findstr :27017

# Windows启动MongoDB服务
net start MongoDB

# macOS使用Homebrew
brew services start mongodb-community
```

### 2. 端口占用
```bash
# 查找端口占用
netstat -ano | findstr :3001

# 结束进程
taskkill /PID <PID> /F
```

### 3. 依赖安装失败
```bash
# 清除npm缓存
npm cache clean --force

# 删除node_modules重新安装
rm -rf node_modules package-lock.json
npm install
```

## 开发规范

### 代码提交规范
```bash
# 提交格式
git commit -m "<type>(<scope>): <subject>"

# 示例
git commit -m "feat(committee): add committee member management"
git commit -m "fix(auth): resolve JWT token validation issue"
git commit -m "docs(readme): update installation guide"
```

### 分支管理
```bash
# 主分支
main      # 生产环境
develop   # 开发环境

# 功能分支
feature/committee-management
feature/resident-profile
feature/finance-system

# 修复分支
hotfix/security-vulnerability
hotfix/critical-bug
```

## 性能优化

### 开发环境优化
- 使用`nodemon`自动重启
- 配置`webpack`热更新
- 启用`Redis`缓存

### 代码优化
- 使用ESLint检查代码质量
- Prettier自动格式化
- Jest单元测试覆盖

---

**创建日期**: 2025-12-15
**维护者**: 开发团队
**版本**: v1.0
