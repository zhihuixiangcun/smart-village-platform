# 智慧乡村平台 - 快速启动指南

## ✅ 已完成

1. ✅ **代码已推送到GitHub** - 所有功能模块已上传
2. ✅ **环境变量已配置** - `.env` 文件已创建
3. ✅ **依赖已安装** - node_modules 已存在
4. ✅ **SSH密钥已配置** - 可以一键推送代码

---

## 🚀 快速启动（4步完成）

### 步骤1: 启动MongoDB

**Windows:**
```bash
# 方法1: 使用服务
net start MongoDB

# 方法2: 使用命令
mongod --dbpath "C:\data\db"
```

**Linux/Mac:**
```bash
# 使用系统服务
sudo systemctl start mongod
# 或
brew services start mongodb
```

**验证MongoDB:**
```bash
mongosh "mongodb://localhost:27017/test" --eval "db.adminCommand('ping')"
# 应该输出: { ok: 1 }
```

---

### 步骤2: 初始化数据库

```bash
npm run init-db
```

这将创建：
- 基础数据集合
- 示例用户数据
- 示例村委数据
- 示例村民数据

---

### 步骤3: 运行测试（可选）

**运行所有测试:**
```bash
npm test
```

**运行特定测试:**
```bash
# 智能值班表测试
npm test -- tests/duty

# 村情地图测试
npm test -- tests/map

# 使用批处理脚本（Windows）
run-tests.bat

# 使用交互式脚本
setup-and-test.bat
```

---

### 步骤4: 启动服务

**启动后端服务器:**
```bash
npm run dev
```

**启动前端客户端（新开一个终端）:**
```bash
npm run client
```

**访问应用:**
- 前端: http://localhost:3000
- 后端API: http://localhost:3001
- API文档: http://localhost:3001/api/docs
- 监控面板: http://localhost:3001/monitoring

---

## 📋 可用的npm脚本

| 命令 | 说明 |
|------|------|
| `npm start` | 启动生产服务器 |
| `npm run dev` | 启动开发服务器 |
| `npm run client` | 启动前端开发服务器 |
| `npm test` | 运行所有测试 |
| `npm run init-db` | 初始化数据库 |
| `npm run lint` | 代码检查 |
| `npm run build` | 构建前端 |

---

## 🔧 配置API密钥

### 1. 高德地图（必需）

1. 访问：https://console.amap.com/dev/key/app
2. 注册并创建应用
3. 获取API Key和安全密钥
4. 更新 `.env` 文件：
   ```env
   AMAP_API_KEY=your_amap_key
   AMAP_SECURITY_KEY=your_amap_security_key
   ```

### 2. 百度语音API（可选）

1. 访问：https://cloud.baidu.com/product/speech/asr
2. 开通语音识别和语音合成服务
3. 获取API Key和Secret Key
4. 更新 `.env` 文件：
   ```env
   BAIDU_SPEECH_API_KEY=your_key
   BAIDU_SPEECH_SECRET_KEY=your_secret
   ```

### 3. 腾讯云OCR（可选）

1. 访问：https://console.cloud.tencent.com/ocr
2. 开通OCR服务
3. 获取Secret ID和Secret Key
4. 更新 `.env` 文件：
   ```env
   TENCENT_SECRET_ID=your_secret_id
   TENCENT_SECRET_KEY=your_secret_key
   ```

---

## 🧪 测试功能

### 测试智能值班表系统

访问：http://localhost:3000/duty

功能：
- ✅ 查看值班日历
- ✅ 创建值班安排
- ✅ 一键呼叫值班人员
- ✅ 查看呼叫历史

### 测试村情地图

访问：http://localhost:3000/map

功能：
- ✅ 查看村域地图
- ✅ 查看村民位置
- ✅ 查看危险区域
- ✅ 查看应急资源

### 测试一户一码

访问：http://localhost:3000/family

功能：
- ✅ 查看家庭档案
- ✅ 生成二维码
- ✅ 远程认证

---

## 📚 项目结构

```
smart-village-platform/
├── client/                 # 前端Vue应用
│   ├── src/
│   │   ├── components/    # 组件
│   │   ├── views/         # 页面
│   │   ├── stores/        # 状态管理
│   │   └── api/           # API接口
│   └── package.json
├── server/                # 后端服务
│   ├── models/           # 数据模型
│   ├── services/         # 业务逻辑
│   ├── api/              # API路由
│   └── controllers/      # 控制器
├── src/                  # 主服务器
│   ├── app.js           # 主应用
│   ├── models/          # 数据模型
│   └── services/        # 服务层
├── tests/               # 测试文件
│   ├── unit/           # 单元测试
│   ├── integration/    # 集成测试
│   └── e2e/            # E2E测试
├── docs/               # 文档
├── .env                # 环境变量（已创建）
└── package.json
```

---

## 🔍 故障排查

### MongoDB连接失败

```bash
# 检查MongoDB是否运行
mongosh "mongodb://localhost:27017/test" --eval "db.adminCommand('ping')"

# 启动MongoDB
net start MongoDB
```

### 端口被占用

```bash
# 查找占用进程
netstat -ano | findstr :3001

# 杀死进程
taskkill /PID <进程ID> /F
```

### 依赖安装问题

```bash
# 清理并重新安装
rm -rf node_modules
npm install
```

### 测试失败

```bash
# 使用单个worker运行测试
npm test -- --maxWorkers=1

# 运行特定测试
npm test -- tests/unit/duty
```

---

## 🎯 下一步

1. **配置API密钥**
   - 高德地图
   - 百度语音
   - 腾讯OCR

2. **运行完整测试**
   ```bash
   npm test
   ```

3. **启动开发服务器**
   ```bash
   npm run dev    # 后端
   npm run client # 前端
   ```

4. **开始开发新功能**
   - 查看文档：docs/
   - 遵循代码规范
   - 编写测试用例

---

## 📞 获取帮助

- 查看文档：docs/
- 查看部署指南：docs/deployment-guide.md
- 查看SSH配置：docs/ssh-setup-quick-start.md

---

**祝您开发顺利！** 🚀

---

**最后更新**: 2025-01-03
**版本**: 1.0.0
