# MongoDB 安装和启动指南

## 问题诊断

错误 "发生系统错误 5。拒绝访问。" 表示：
- 需要管理员权限
- 或者MongoDB服务未安装

---

## ✅ 解决方案

### 方案1: 使用管理员权限（推荐）

1. **以管理员身份运行命令提示符**
   - 按 `Windows键 + X`
   - 选择 "终端(管理员)" 或 "命令提示符(管理员)"
   - 点击"是"确认UAC提示

2. **启动MongoDB服务**
   ```bash
   net start MongoDB
   ```

### 方案2: 如果MongoDB未安装

#### 安装MongoDB

1. **下载MongoDB**
   - 访问：https://www.mongodb.com/try/download/community
   - 选择Windows版本
   - 下载MSI安装程序

2. **运行安装程序**
   - 双击下载的MSI文件
   - 选择"Complete"完整安装
   - 勾选"Install MongoDB as a Service"
   - 勾选"Install MongoDB Compass"（可选）
   - 完成安装

3. **添加到PATH（安装时可能已自动添加）**
   - 默认路径：`C:\Program Files\MongoDB\Server\7.0\bin`

4. **启动MongoDB**
   ```bash
   # 以管理员身份运行
   net start MongoDB
   ```

### 方案3: 使用内存数据库（无需安装MongoDB）

如果暂时不想安装MongoDB，可以使用MongoDB Memory Server进行测试：

```bash
# 安装mongodb-memory-server（已包含在项目中）
npm install

# 运行测试时会自动使用内存数据库
npm test
```

### 方案4: 使用Docker运行MongoDB（推荐给开发者）

如果已安装Docker：

```bash
# 拉取MongoDB镜像
docker pull mongo:latest

# 运行MongoDB容器
docker run -d --name smart-village-mongo -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password mongo:latest

# 查看运行状态
docker ps

# 停止MongoDB
docker stop smart-village-mongo

# 启动已存在的容器
docker start smart-village-mongo
```

---

## 🔍 验证MongoDB运行

### 检查服务状态

```bash
# 查看MongoDB服务状态
sc query MongoDB

# 或
Get-Service MongoDB  # PowerShell
```

### 测试连接

```bash
# 使用mongosh测试连接
mongosh "mongodb://localhost:27017/test" --eval "db.adminCommand('ping')"

# 应该输出: { ok: 1 }
```

---

## 🚀 启动应用

### MongoDB启动后的完整步骤

1. **确认MongoDB运行**
   ```bash
   net start MongoDB  # 需要管理员权限
   ```

2. **初始化数据库**
   ```bash
   npm run init-db
   ```

3. **启动后端服务器**
   ```bash
   npm run dev
   ```

4. **启动前端客户端**（新开一个终端）
   ```bash
   npm run client
   ```

---

## 💡 快速启动脚本

我已为您创建了一个启动脚本，可以自动检测并启动MongoDB：

### Windows批处理脚本

```batch
@echo off
echo Starting Smart Village Platform...
echo.

REM 尝试启动MongoDB
echo [1/4] Starting MongoDB...
net start MongoDB >nul 2>&1
if %ERRORLEVEL% EQL 0 (
    echo [OK] MongoDB started
) else (
    echo [INFO] MongoDB may already be running or needs admin rights
)

REM 初始化数据库
echo [2/4] Initializing database...
npm run init-db

REM 启动后端
echo [3/4] Starting backend server...
start cmd /k "npm run dev"

REM 等待后端启动
timeout /t 5 /nobreak >nul

REM 启动前端
echo [4/4] Starting frontend client...
start cmd /k "npm run client"

echo.
echo All services started!
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
pause
```

---

## 📝 使用Docker Compose（最简单）

如果不想安装MongoDB，可以使用Docker Compose：

1. **创建 docker-compose.yml 文件**：
   ```yaml
   version: '3.8'

   services:
     mongodb:
       image: mongo:latest
       container_name: smart-village-mongo
       restart: always
       ports:
         - "27017:27017"
       environment:
         MONGO_INITDB_ROOT_USERNAME: admin
         MONGO_INITDB_ROOT_PASSWORD: password
       volumes:
         - mongo-data:/data/db

   volumes:
     mongo-data:
   ```

2. **启动服务**：
   ```bash
   docker-compose up -d
   ```

3. **停止服务**：
   ```bash
   docker-compose down
   ```

---

## ❓ 常见问题

### Q: "系统错误 5 - 拒绝访问"
**A:** 需要管理员权限。右键"命令提示符"选择"以管理员身份运行"

### Q: "服务名无效"
**A:** MongoDB未安装或服务名不同。检查：
```bash
sc query state= all | findstr -i mongo
```

### Q: MongoDB占用太多内存
**A:** 限制MongoDB内存使用：
```bash
mongod --dbpath "C:\data\db" --wiredTigerCacheSizeGB 1
```

---

## 🎯 推荐方案

**对于开发环境，推荐使用：**

1. **Docker方式**（最简单）
   - 无需安装
   - 一键启动
   - 易于管理

2. **MongoDB Memory Server**（用于测试）
   - 无需任何安装
   - 自动运行
   - 测试完成自动清理

**对于生产环境，推荐：**
- 完整安装MongoDB
- 配置为服务自动启动
- 定期备份数据

---

需要进一步帮助吗？请告诉我您遇到的具体问题！
