# 智慧乡村语音交互系统

## 📋 项目概述

智慧乡村语音交互系统是一个专为农村地区设计的智能语音助手，支持22种中文方言识别，提供语音识别、语音合成、命令处理等功能，帮助村民便捷地使用各种村务服务。

## 🌟 核心功能

### 🎤 语音识别
- **多方言支持**: 支持22种中文方言（普通话、粤语、四川话、东北话等）
- **智能识别**: 基于百度语音API和AI模型的混合识别方案
- **降噪处理**: 自动降噪和音频预处理，提高识别准确率
- **实时转换**: 实时语音转文字，支持长语音分段处理

### 🔊 语音合成
- **自然语音**: 高质量TTS语音合成，支持多种音色
- **情感表达**: 支持不同情感和语调的语音合成
- **方言合成**: 针对不同方言的语音合成优化
- **流式输出**: 支持流式语音输出，减少等待时间

### 🤖 智能对话
- **自然语言理解**: 理解村民常用语言和表达习惯
- **意图识别**: 智能识别用户意图和需求
- **上下文记忆**: 支持多轮对话和上下文理解
- **个性化响应**: 根据用户偏好提供个性化服务

### ⚡ 语音命令
- **唤醒词检测**: 支持"小智"、"村小助手"等唤醒词
- **命令解析**: 智能解析语音命令并执行相应操作
- **快捷操作**: 一键查询、办理、导航等常用功能
- **错误容错**: 智能纠错和模糊匹配

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    前端应用 (Vue.js)                        │
│  - 语音交互界面  - 方言选择  - 可视化反馈  - 对话历史      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Node.js 后端服务 (端口:3001)                │
│  - API路由管理  - 用户认证  - 业务逻辑  - 数据缓存        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Python AI处理服务 (端口:5001)                   │
│  - 语音识别    - 语音合成    - 方言检测    - 命令处理      │
│  - 音频预处理  - 特征提取    - 机器学习    - 缓存管理      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    数据存储层                                │
│  - MongoDB (业务数据)    - Redis (缓存)    - 文件存储      │
└─────────────────────────────────────────────────────────────┘
```

## 🌐 支持的方言

| 方言 | 代码 | 使用地区 | 方言 | 代码 | 使用地区 |
|------|------|----------|------|------|----------|
| 普通话 | zh | 全国 | 东北话 | zh-northeast | 东北三省 |
| 粤语 | yue | 广东、广西、港澳 | 四川话 | zh-sichuan | 四川、重庆 |
| 闽南语 | nan | 福建、台湾、潮汕 | 重庆话 | zh-chongqing | 重庆 |
| 客家话 | hak | 广东、江西、福建 | 陕西话 | zh-shaanxi | 陕西 |
| 吴语 | wuu | 江苏、浙江、上海 | 山东话 | zh-shandong | 山东 |
| 湘语 | hsn | 湖南 | 河南话 | zh-henan | 河南 |
| 赣语 | gan | 江西 | 湖北话 | zh-hubei | 湖北 |
| 江浙话 | zh-jiangzhe | 江苏、浙江 | 安徽话 | zh-anhui | 安徽 |
| 河北话 | zh-hebei | 河北 | 山西话 | zh-shanxi | 山西 |
| 内蒙古话 | zh-neimeng | 内蒙古 | 甘肃话 | zh-gansu | 甘肃 |
| 宁夏话 | zh-ningxia | 宁夏 | 新疆话 | zh-xinjiang | 新疆 |
| 西藏话 | zh-xizang | 西藏 | 青海话 | zh-qinghai | 青海 |

## 🚀 快速开始

### 环境要求

- Node.js >= 20.17.0
- Python >= 3.8
- MongoDB >= 4.4
- Redis >= 6.0 (可选)

### 安装部署

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd smart-village-platform
   ```

2. **一键启动**
   ```bash
   chmod +x start-voice-services.sh
   ./start-voice-services.sh
   ```

3. **访问应用**
   - 前端应用: http://localhost:3000
   - 语音助手: http://localhost:3000/voice-assistant
   - API文档: http://localhost:3001/api/v1/docs

### 配置说明

1. **复制环境配置**
   ```bash
   cp .env.voice.example .env
   ```

2. **配置百度语音API**
   ```bash
   # 编辑 .env 文件
   BAIDU_APP_ID=your_baidu_app_id
   BAIDU_API_KEY=your_baidu_api_key
   BAIDU_SECRET_KEY=your_baidu_secret_key
   ```

3. **自定义配置**
   ```bash
   # 唤醒词配置
   WAKE_WORDS=小智,村小助手,智慧乡村

   # 默认方言
   DEFAULT_DIALECT=zh

   # 音频参数
   AUDIO_SAMPLE_RATE=16000
   AUDIO_MAX_DURATION=60
   ```

## 📖 使用指南

### 基本操作

1. **语音唤醒**
   - 说出唤醒词："小智"、"村小助手"或"智慧乡村"
   - 系统会响应并进入待命状态

2. **语音命令**
   - **查询类**: "查询村民信息"、"看看最新公告"
   - **办理类**: "办理医保"、"申请补贴"
   - **导航类**: "打开服务大厅"、"进入个人中心"
   - **帮助类**: "帮助"、"怎么用"
   - **紧急类**: "紧急求助"、"需要帮助"

3. **方言切换**
   - 在设置中选择熟悉的方言
   - 系统会自动识别并适配

### 高级功能

1. **离线使用**
   - 支持离线语音识别
   - 数据联网后自动同步

2. **个性化设置**
   - 选择喜欢的音色
   - 调整语速和语调
   - 设置唤醒词

3. **多轮对话**
   - 支持上下文记忆
   - 连续对话交互
   - 智能纠错

## 🔧 API接口

### 语音识别
```http
POST /api/v1/voice/recognize
Content-Type: multipart/form-data

# 请求参数
audio: 音频文件
language: zh-CN
dialect: auto
sampleRate: 16000
```

### 语音合成
```http
POST /api/v1/voice/synthesize
Content-Type: application/json

{
  "text": "要合成的文本",
  "voice": "female",
  "language": "zh-CN",
  "speed": 1.0,
  "pitch": 1.0
}
```

### 方言检测
```http
POST /api/v1/voice/detect-dialect
Content-Type: multipart/form-data

audio: 音频文件
```

### 语音命令处理
```http
POST /api/v1/voice/command
Content-Type: application/json

{
  "text": "用户输入的语音文本"
}
```

## 📁 项目结构

```
smart-village-platform/
├── src/                          # Node.js后端源码
│   ├── routes/voice/             # 语音相关路由
│   ├── services/voice/           # 语音服务
│   └── middleware/voice/         # 语音中间件
├── client/                       # Vue.js前端源码
│   ├── src/components/voice/     # 语音组件
│   ├── src/composables/          # 组合式API
│   └── src/views/               # 页面组件
├── python-voice-service/         # Python AI处理服务
│   ├── src/                      # 服务源码
│   ├── services/                 # 核心服务模块
│   ├── utils/                    # 工具模块
│   └── config/                   # 配置模块
├── logs/                         # 日志文件
├── uploads/                      # 上传文件
└── docs/                         # 文档
```

## 🧪 测试

### 单元测试
```bash
# 后端测试
npm test

# 前端测试
cd client && npm run test

# Python服务测试
cd python-voice-service && python -m pytest
```

### 集成测试
```bash
# 语音识别测试
curl -X POST http://localhost:3001/api/v1/voice/recognize \
  -F "audio=@test.wav" \
  -F "dialect=zh"

# 语音合成测试
curl -X POST http://localhost:3001/api/v1/voice/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text":"测试语音合成","voice":"female"}'
```

### 性能测试
```bash
# 并发测试
ab -n 100 -c 10 http://localhost:3001/api/v1/voice/recognize

# 内存监控
python -m memory_profiler python-voice-service/src/app.py
```

## 📊 性能优化

### 音频处理优化
- **音频压缩**: 使用WebM格式减少传输大小
- **分段处理**: 长音频自动分段处理
- **缓存机制**: 识别结果缓存，提高响应速度
- **并发控制**: 限制并发请求数，避免资源耗尽

### 系统优化
- **连接池**: 数据库连接池管理
- **负载均衡**: Nginx负载均衡分发
- **CDN加速**: 静态资源CDN分发
- **索引优化**: 数据库查询优化

## 🔒 安全特性

### 数据安全
- **传输加密**: HTTPS/TLS加密传输
- **数据脱敏**: 敏感信息自动脱敏
- **访问控制**: 基于角色的权限管理
- **审计日志**: 操作日志完整记录

### API安全
- **身份认证**: JWT令牌认证
- **速率限制**: API调用频率限制
- **参数验证**: 严格的参数验证
- **错误处理**: 安全的错误信息返回

## 🐛 故障排除

### 常见问题

1. **麦克风权限问题**
   ```bash
   # 检查浏览器权限设置
   # 确保使用HTTPS协议
   # 检查麦克风硬件连接
   ```

2. **语音识别失败**
   ```bash
   # 检查百度API配置
   # 验证网络连接
   # 查看Python服务日志
   ```

3. **服务启动失败**
   ```bash
   # 检查端口占用
   netstat -tlnp | grep :3001

   # 查看详细错误
   journalctl -u smart-village-backend -f
   ```

### 调试模式
```bash
# 启用调试日志
export DEBUG=true
export LOG_LEVEL=debug

# 重启服务
./start-voice-services.sh --dev
```

## 📈 监控指标

### 系统监控
- **响应时间**: API接口响应时间
- **吞吐量**: 每秒处理请求数
- **错误率**: 请求失败率
- **资源使用**: CPU、内存、磁盘使用率

### 业务监控
- **语音识别准确率**: 语音识别成功率
- **用户活跃度**: 日活跃用户数
- **功能使用统计**: 各功能模块使用次数
- **满意度评分**: 用户满意度反馈

## 🤝 贡献指南

### 开发流程
1. Fork项目
2. 创建功能分支
3. 提交代码
4. 创建Pull Request

### 代码规范
- 前端使用ESLint + Prettier
- 后端使用Standard.js
- Python使用Black + Flake8
- 提交信息遵循Conventional Commits

### 测试要求
- 单元测试覆盖率 > 80%
- 集成测试通过
- 性能测试达标

## 📄 许可证

本项目采用 [MIT License](LICENSE) 许可证。

## 📞 联系我们

- **项目维护者**: [维护者姓名]
- **邮箱**: [联系邮箱]
- **问题反馈**: [GitHub Issues]
- **技术交流**: [技术交流群]

## 🙏 致谢

感谢以下开源项目和服务提供商：
- [百度AI开放平台](https://ai.baidu.com/) - 语音识别和合成API
- [Element Plus](https://element-plus.org/) - Vue.js UI组件库
- [librosa](https://librosa.org/) - Python音频处理库
- [Flask](https://flask.palletsprojects.com/) - Python Web框架

---

**🎤 让语音技术更好地服务乡村生活！**