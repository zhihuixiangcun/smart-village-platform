# MongoDB 安装指南

## Windows 10/11 安装 MongoDB Community Server

### 1. 下载 MongoDB Community Server
访问 MongoDB 官网下载页面：
https://www.mongodb.com/try/download/community

选择：
- Version: 6.0 或更高版本
- Platform: Windows
- Package: msi

### 2. 安装步骤
1. 运行下载的 `.msi` 安装文件
2. 选择 "Complete" 完整安装
3. 勾选 "Install MongoDB as a Windows Service"
4. 勾选 "Install MongoDB Compass" (图形化管理工具)
5. 完成安装

### 3. 添加到系统PATH
1. 按 Win + R，输入 "sysdm.cpl" 并回车
2. 转到 "Advanced" 选项卡
3. 点击 "Environment Variables"
4. 在 "System Variables" 中找到并选择 "Path"，然后点击 "Edit"
5. 点击 "New" 并添加 MongoDB bin 目录（通常是 "C:\Program Files\MongoDB\Server\6.0\bin"）
6. 点击 "OK" 保存更改

### 4. 启动MongoDB服务
1. 按 Win + R，输入 "services.msc" 并回车
2. 找到 "MongoDB Server" 服务
3. 右键点击并选择 "Start"（如果尚未运行）

### 5. 验证安装
```cmd
# 检查MongoDB版本
mongod --version

# 连接到MongoDB
mongo

# 或者使用新版本的命令
mongosh
```

### 6. 配置数据库（推荐）
```javascript
// 连接到MongoDB
mongosh

// 切换到admin数据库
use admin

// 创建管理员用户
db.createUser({
  user: "admin",
  pwd: "password123",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})

// 创建应用用户
use smart_village
db.createUser({
  user: "village_app",
  pwd: "app_password_2024",
  roles: [ { role: "readWrite", db: "smart_village" } ]
})
```

### 7. 更新环境配置
在项目根目录的 `.env` 文件中配置：
```env
# 数据库配置
MONGO_URI=mongodb://village_app:app_password_2024@localhost:27017/smart_village
MONGO_TEST_URI=mongodb://village_app:app_password_2024@localhost:27017/smart_village_test
```

## Redis 安装指南

### Windows 下安装Redis的几种方式

#### 方式一：WSL + Redis (推荐)
1. 安装WSL (Windows Subsystem for Linux)
   ```cmd
   wsl --install
   ```
2. 在WSL中安装Redis：
   ```bash
   sudo apt update
   sudo apt install redis-server
   sudo systemctl start redis
   sudo systemctl enable redis
   ```

#### 方式二：Docker 方式
```cmd
# 启动Redis容器
docker run -d --name redis -p 6379:6379 redis:7.0-alpine redis-server --requirepass redis123
```

#### 方式三：使用Memurai (Windows原生Redis)
下载地址：https://www.memurai.com/

## 初始化数据库

安装完成后，运行以下命令初始化数据库：
```cmd
npm run init-db
```

这将：
1. 创建必要的数据库集合
2. 插入初始管理员数据
3. 创建示例村庄和公告数据
4. 设置数据库索引

## 快速验证

### MongoDB 验证
```cmd
# 检查服务状态
sc query MongoDB

# 连接数据库
mongosh smart_village -u village_app -p app_password_2024

# 查看集合
show collections
```

### Redis 验证
```cmd
# 如果使用WSL
wsl redis-cli ping

# 如果使用Docker
docker exec -it redis redis-cli ping
```

## 故障排除

### MongoDB 常见问题
1. **服务启动失败**
   - 检查端口27017是否被占用：`netstat -ano | findstr :27017`
   - 检查日志文件：`C:\Program Files\MongoDB\Server\6.0\log\mongod.log`

2. **连接被拒绝**
   - 确保MongoDB服务正在运行
   - 检查防火墙设置

3. **认证失败**
   - 确保用户创建在正确的数据库中
   - 检查用户名和密码

### Redis 常见问题
1. **连接被拒绝**
   - 确保Redis服务正在运行
   - 检查端口6379是否被占用

2. **WSL连接问题**
   - 确保WSL服务正在运行
   - 检查网络配置

## 下一步

数据库安装完成后，您可以：
1. 运行 `npm run dev` 启动开发服务器
2. 访问 http://localhost:3001 查看API文档
3. 运行 `npm run test` 执行测试

## 管理工具推荐

### MongoDB 管理工具
- **MongoDB Compass** (安装时包含)
- **Studio 3T** (免费版)
- **DataGrip** (JetBrains)

### Redis 管理工具
- **RedisInsight** (官方免费工具)
- **Another Redis Desktop Manager**