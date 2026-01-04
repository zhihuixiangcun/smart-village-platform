# 智慧乡村平台 - 服务器启动指南

## 🚀 快速启动

### 方式1: 同时启动两个服务器（推荐）

```bash
npm run start:servers
```

这会同时启动:
- **主API服务器** (端口3001): 核心API、监控、i18n、通知服务
- **Socket.IO服务器** (端口5000): 实时通信、村务服务、Socket.IO事件

### 方式2: 分别启动

**终端1 - 主服务器:**
```bash
npm start
# 或
npm run dev
```

**终端2 - Socket.IO服务器:**
```bash
node server/app.js
```

## 🔍 验证服务器状态

运行健康检查:
```bash
node scripts/test-servers.js
```

或手动检查:
```bash
# 主服务器
curl http://localhost:3001/health

# Socket.IO服务器
curl http://localhost:5000/health
```

## 📡 可用端点

### 主API服务器 (3001)

| 端点 | 说明 |
|------|------|
| `GET /health` | 健康检查 |
| `GET /monitoring` | 实时监控面板 |
| `GET /api/v1/notifications/*` | 通知服务 |
| `GET /api/v1/i18n/*` | 国际化服务 |
| `POST /api/v1/auth/login` | 用户登录 |

### Socket.IO服务器 (5000)

| 端点 | 说明 |
|------|------|
| `GET /health` | 健康检查 |
| `GET /api/info` | 服务信息 |
| `GET /api/announcements` | 获取公告 |
| `POST /api/announcements` | 发布公告 |
| `GET /api/suggestions` | 获取建议 |
| `POST /api/suggestions` | 提交建议 |

### Socket.IO事件

| 事件 | 说明 |
|------|------|
| `join-village` | 加入村庄房间 |
| `leave-village` | 离开村庄房间 |
| `send-announcement` | 发送公告 |
| `emergency-broadcast` | 应急广播 |
| `submit-suggestion` | 提交建议 |
| `village-message` | 村庄消息 |

## 🛠️ 故障排查

### 端口被占用

```bash
# 检查端口占用
netstat -ano | findstr ":3001"
netstat -ano | findstr ":5000"

# 终止占用端口的进程
taskkill /PID <进程ID> /F
```

### MongoDB连接失败

确保MongoDB正在运行:
```bash
# Windows
net start MongoDB

# 或使用Docker
docker-compose -f docker-compose.dev.yml up -d
```

### Socket.IO连接失败

1. 检查Socket.IO服务器是否运行: `curl http://localhost:5000/health`
2. 检查防火墙设置
3. 查看浏览器控制台的详细错误信息

## 📊 监控

访问监控面板查看实时状态:
```
http://localhost:3001/monitoring
```

监控指标包括:
- CPU和内存使用率
- API请求统计
- WebSocket连接状态
- 系统健康指标

## 🧪 测试用户

使用以下测试账户登录:
- **用户名**: testadmin
- **密码**: Test123456!
- **角色**: admin

或:
```bash
curl -X POST http://localhost:3001/api/v1/auth/login-test \
  -H "Content-Type: application/json" \
  -d '{"username":"testadmin","password":"Test123456!","role":"admin"}'
```

## 📝 日志

服务器日志输出到控制台，包含:
- 模型加载状态
- 数据库连接信息
- HTTP请求日志
- Socket.IO事件日志
- 错误和警告信息

## 🔐 安全提示

生产环境部署时:
1. 修改默认的JWT密钥
2. 配置HTTPS
3. 启用CORS白名单
4. 配置防火墙规则
5. 定期备份数据库
6. 监控系统日志

## 📞 技术支持

如遇问题，请查看:
- 项目文档: [CLAUDE.md](../CLAUDE.md)
- API文档: [API_REFERENCE.md](../docs/API_REFERENCE.md)
- 部署指南: [DEPLOYMENT.md](../docs/DEPLOYMENT.md)
