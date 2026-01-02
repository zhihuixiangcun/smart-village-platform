# 智慧乡村平台 - Docker 部署指南（技术小白版）

## 📋 前置准备

### 1. 检查你的系统
- Windows 10 专业版/企业版/教育版（版本 1903 或更高）
- 至少 4GB 内存
- 至少 10GB 可用磁盘空间

### 2. 安装 Docker Desktop

**第一步：下载 Docker Desktop**
1. 打开浏览器，访问：https://www.docker.com/products/docker-desktop/
2. 点击 "Download for Windows"
3. 下载 `Docker Desktop Installer.exe`

**第二步：安装 Docker Desktop**
1. 双击运行下载的安装程序
2. 勾选 "Use WSL 2 instead of Hyper-V"（推荐）
3. 点击 "Ok" 开始安装
4. 安装完成后点击 "Close and restart" 重启电脑

**第三步：启动 Docker Desktop**
1. 重启后，从开始菜单找到 "Docker Desktop" 并启动
2. 等待 Docker 启动完成（看到 Docker 图标不再转动）
3. 打开命令行（PowerShell 或 CMD），输入：
   ```bash
   docker --version
   ```
   如果显示版本号（如 `Docker version 24.0.0`），说明安装成功！

---

## 🚀 开始部署

### 第一步：打开命令行

1. 按 `Win + R` 键
2. 输入 `cmd` 或 `powershell`
3. 按回车键

### 第二步：进入项目目录

```bash
cd "G:\claude code"
```

### 第三步：启动服务

**选择部署方式：**

#### 方式 A：简化版部署（推荐新手）
```bash
docker-compose -f docker-compose-simple.yml up -d
```
这个命令只启动核心服务（MongoDB + API），适合快速测试。

#### 方式 B：完整版部署
```bash
docker-compose up -d
```
这个命令启动所有服务（包括监控、前端等），需要更多资源。

---

## ⏳ 等待启动

启动过程大约需要 3-5 分钟，你会看到类似输出：

```
Creating network "smart-village-dev"...
Creating smart-village-mongodb...
Creating smart-village-api...
```

### 查看启动状态

```bash
docker-compose ps
```

正常情况下，你应该看到所有服务的状态都是 `Up`：

| 服务名称 | 状态 | 端口 |
|---------|------|------|
| smart-village-mongodb | Up | 27017 |
| smart-village-api | Up | 3001 |

---

## ✅ 验证部署

### 1. 检查服务是否运行

```bash
docker-compose logs api-server
```

如果看到类似以下输出，说明启动成功：
```
✅ 智慧村庄平台主服务启动成功
🌐 服务地址: http://localhost:3001
```

### 2. 访问服务

打开浏览器，访问：http://localhost:3001/health

如果看到：
```json
{"status":"ok","message":"Service is healthy"}
```

说明部署成功！🎉

---

## 🛠️ 常用命令

### 查看运行状态
```bash
docker-compose ps
```

### 查看日志
```bash
# 查看所有日志
docker-compose logs

# 查看 API 服务日志
docker-compose logs api-server

# 实时查看日志
docker-compose logs -f api-server
```

### 停止服务
```bash
docker-compose stop
```

### 启动服务
```bash
docker-compose start
```

### 重启服务
```bash
docker-compose restart
```

### 完全删除服务（包括数据）
```bash
docker-compose down -v
```

---

## 📊 服务端口说明

| 服务 | 端口 | 访问地址 | 说明 |
|------|------|----------|------|
| API 服务 | 3001 | http://localhost:3001 | 主 API 服务 |
| MongoDB | 27017 | localhost:27017 | 数据库 |
| 监控面板 | 3003 | http://localhost:3003 | Grafana（完整版） |

---

## ⚠️ 常见问题

### 问题 1：端口被占用
**错误信息：** `Bind for 0.0.0.0:3001 failed: port is already allocated`

**解决方法：**
1. 查找占用端口的程序：
   ```bash
   netstat -ano | findstr :3001
   ```
2. 结束该进程或修改 docker-compose.yml 中的端口映射

### 问题 2：Docker 未启动
**错误信息：** `Cannot connect to the Docker daemon`

**解决方法：**
1. 检查 Docker Desktop 是否正在运行
2. 右键点击任务栏的 Docker 图标，选择 "Restart"

### 问题 3：内存不足
**错误信息：** `no space left on device`

**解决方法：**
1. 清理未使用的 Docker 资源：
   ```bash
   docker system prune -a
   ```

### 问题 4：服务启动失败
**解决方法：**
1. 查看详细日志：
   ```bash
   docker-compose logs api-server
   ```
2. 检查配置文件是否正确

---

## 🔧 开发模式

如果需要开发调试，可以使用以下命令：

```bash
# 构建并启动（不使用缓存）
docker-compose up -d --build

# 进入容器内部
docker exec -it smart-village-api sh

# 查看实时日志
docker-compose logs -f
```

---

## 📞 获取帮助

如果遇到问题：
1. 查看日志文件：`logs/` 目录
2. 检查 Docker 状态：`docker-compose ps`
3. 查看本文档的"常见问题"部分

---

## 🎉 下一步

部署成功后，你可以：
1. 查看 API 文档：http://localhost:3001/api/v1/info
2. 访问监控面板（完整版）：http://localhost:3003
3. 开始集成前端应用
